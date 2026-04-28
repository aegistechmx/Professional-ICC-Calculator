const { calcularICC } = require('../core/calculo/icc');
const { calcularCable } = require('../core/nom/conductores');

function asArray(value, name) {
  if (!Array.isArray(value)) throw new Error(`Invalid ${name}: expected array`);
  return value;
}

function asObject(value, name) {
  if (!value || typeof value !== 'object') throw new Error(`Invalid ${name}: expected object`);
  return value;
}

function toFiniteNumber(value, name) {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new Error(`Invalid ${name}: must be a finite number`);
  }
  return n;
}

function getNodeVoltage(node, fallback = 480) {
  const params = node?.data?.parameters || {};
  // Panel nodes typically use `tension`, transformers use `secundario`.
  if (params.tension != null) return toFiniteNumber(params.tension, `${node.id}.data.parameters.tension`);
  if (params.secundario != null) return toFiniteNumber(params.secundario, `${node.id}.data.parameters.secundario`);
  if (node?.data?.V != null) return toFiniteNumber(node.data.V, `${node.id}.data.V`);
  return fallback;
}

function trafoZOhmsFromNode(node) {
  const params = node?.data?.parameters || {};
  const kva = toFiniteNumber(params.kVA ?? params.kva ?? params.kva, `${node.id}.data.parameters.kVA`);
  const vs = toFiniteNumber(params.secundario ?? params.vs, `${node.id}.data.parameters.secundario`);
  const zPct = toFiniteNumber(params.Z ?? params.z_percent ?? params.z_percent, `${node.id}.data.parameters.Z`);
  if (kva <= 0 || vs <= 0 || zPct <= 0) throw new Error(`Invalid transformer params on ${node.id}`);
  const Zbase = (vs * vs) / (kva * 1000);
  return Zbase * (zPct / 100);
}

function approximateRXFromMagnitude(Zmag, XR = 5) {
  // Zmag = sqrt(R^2 + X^2), with X/R = XR
  const R = Zmag / Math.sqrt(1 + XR * XR);
  const X = R * XR;
  return { R, X };
}

/**
 * Compute approximate ICC from a React Flow graph.
 *
 * Current implementation (foundation):
 * - Treat graph as directed (edge.source -> edge.target)
 * - Propagate Thevenin impedance forward from "roots" (nodes with indegree 0)
 * - For now, only transformers contribute impedance; other components are 0Ω
 * - If a node has multiple upstream paths, combine in parallel (best-effort)
 *
 * Returns per-node results so frontend can paint them back into node.data.
 */
function calculateIccFromGraph({ nodes, edges }) {
  const nodesArr = asArray(nodes, 'nodes');
  const edgesArr = asArray(edges, 'edges');

  const nodeMap = new Map();
  for (const n of nodesArr) nodeMap.set(n.id, n);

  const getParams = (n) => n?.data?.parameters || {};

  const indeg = new Map();
  const outgoing = new Map(); // id -> [{ toId, edge }]
  for (const n of nodesArr) {
    indeg.set(n.id, 0);
    outgoing.set(n.id, []);
  }

  const edgeResults = {};
  for (const e of edgesArr) {
    const edge = asObject(e, 'edge');
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue;
    indeg.set(edge.target, (indeg.get(edge.target) || 0) + 1);
    outgoing.get(edge.source).push({ toId: edge.target, edge });

    // If edge is a cable (or has cable-like data), compute NOM/impedance in backend.
    try {
      const isCable = edge.type === 'cable' || edge.data?.material || edge.data?.calibre;
      if (isCable) {
        edgeResults[edge.id] = calcularCable(edge.data || {});
      }
    } catch (err) {
      edgeResults[edge.id] = { error: err.message };
    }
  }

  const roots = nodesArr.filter(n => (indeg.get(n.id) || 0) === 0).map(n => n.id);

  // Zth candidate list per node (from each upstream path)
  const Zcands = new Map(); // id -> [{R,X}]
  const pushCand = (id, Z) => {
    if (!Zcands.has(id)) Zcands.set(id, []);
    Zcands.get(id).push(Z);
  };

  // Initialize roots with 0 impedance
  for (const rid of roots) pushCand(rid, { R: 0, X: 0 });

  // Kahn-style traversal over reachable subgraph
  const q = [...roots];
  const seen = new Set(q);

  while (q.length) {
    const fromId = q.shift();
    const fromNode = nodeMap.get(fromId);
    const fromZs = Zcands.get(fromId) || [{ R: 0, X: 0 }];

    for (const item of outgoing.get(fromId) || []) {
      const toId = item.toId;
      const edge = item.edge;
      const toNode = nodeMap.get(toId);

      // Component impedance: treat the *target* node's equipment as being "entered".
      let Zcomp = { R: 0, X: 0 };
      if (toNode?.type === 'transformer') {
        const Zmag = trafoZOhmsFromNode(toNode);
        Zcomp = approximateRXFromMagnitude(Zmag, 5);
      }

      // Edge impedance (cable) in series between nodes
      let Zedge = { R: 0, X: 0 };
      const er = edgeResults[edge?.id];
      if (er && !er.error && er.resultados?.Z_ohm) {
        Zedge = er.resultados.Z_ohm;
      }

      for (const z of fromZs) {
        pushCand(toId, { R: z.R + Zedge.R + Zcomp.R, X: z.X + Zedge.X + Zcomp.X });
      }

      if (!seen.has(toId)) {
        seen.add(toId);
        q.push(toId);
      }
    }
  }

  // --- Design current (I_diseño) estimation from downstream loads/motors ---
  // Self current per node (trifásico): I = P / (sqrt3 * V * fp * eff)
  const Iself = {};
  for (const n of nodesArr) {
    const p = getParams(n);
    const V = getNodeVoltage(n, 480);
    let I = 0;

    if (n.type === 'load') {
      const kW = Number(p.potencia_kW ?? 0);
      const fp = Number(p.fp ?? 0.9);
      if (Number.isFinite(kW) && kW > 0 && Number.isFinite(V) && V > 0 && Number.isFinite(fp) && fp > 0) {
        I = (kW * 1000) / (Math.sqrt(3) * V * fp);
      }
    } else if (n.type === 'motor') {
      const hp = Number(p.hp ?? 0);
      const fp = Number(p.fp ?? 0.85);
      const eff = Number(p.eficiencia ?? 0.92);
      if (Number.isFinite(hp) && hp > 0 && Number.isFinite(V) && V > 0 && Number.isFinite(fp) && fp > 0 && Number.isFinite(eff) && eff > 0) {
        const Pout_W = hp * 746;
        const Pin_W = Pout_W / eff;
        I = Pin_W / (Math.sqrt(3) * V * fp);
      }
    }

    Iself[n.id] = Number.isFinite(I) ? I : 0;
  }

  // Downstream sum current for each node (best-effort DAG; cycles will degrade gracefully)
  const Idown = {};
  const visiting = new Set();
  const visited = new Set();
  const dfs = (id) => {
    if (visited.has(id)) return Idown[id] || 0;
    if (visiting.has(id)) return 0; // cycle protection
    visiting.add(id);
    let sum = Iself[id] || 0;
    for (const item of outgoing.get(id) || []) {
      sum += dfs(item.toId);
    }
    visiting.delete(id);
    visited.add(id);
    Idown[id] = sum;
    return sum;
  };
  for (const n of nodesArr) dfs(n.id);

  // Enrich edgeResults with design current, ampacity validation, voltage drop
  for (const e of edgesArr) {
    if (!e || !e.id) continue;
    const src = nodeMap.get(e.source);
    const Vsrc = src ? getNodeVoltage(src, 480) : 480;
    const I_design_A = Idown[e.target] || 0;
    const fp = Number(e.data?.fp ?? 0.9);
    const cos = Number.isFinite(fp) ? Math.max(0, Math.min(1, fp)) : 0.9;
    const sin = Math.sqrt(Math.max(0, 1 - cos * cos));

    const cable = edgeResults[e.id] && !edgeResults[e.id].error ? edgeResults[e.id] : null;
    const Z = cable?.resultados?.Z_ohm;
    const Vdrop_V = Z ? (Math.sqrt(3) * I_design_A * (Z.R * cos + Z.X * sin)) : null;
    const Vdrop_pct = Vdrop_V != null && Vsrc > 0 ? (Vdrop_V / Vsrc) * 100 : null;

    const I_corr_A = cable?.resultados?.I_corr_A ?? null;
    const ampacityStatus =
      I_corr_A == null ? null : (I_corr_A >= I_design_A ? 'OK' : 'FAIL');

    edgeResults[e.id] = {
      ...(edgeResults[e.id] || {}),
      design: { I_design_A },
      voltageDrop: {
        Vdrop_V,
        Vdrop_pct,
        fp_used: cos
      },
      validations: {
        ampacity: ampacityStatus
      }
    };
  }

  const combineParallel = (list) => {
    // Combine impedances in parallel: 1/Zeq = sum(1/Zi)
    // Using complex math: Zeq = 1 / sum(1/Zi)
    // Zi = R + jX ; 1/Z = (R - jX)/(R^2+X^2)
    if (!list || list.length === 0) return { R: 0, X: 0 };
    if (list.length === 1) return list[0];

    let sumG = 0; // real part of admittance
    let sumB = 0; // imag part of admittance (negative for inductive)
    for (const Z of list) {
      const den = Z.R * Z.R + Z.X * Z.X;
      if (den === 0) return { R: 0, X: 0 };
      sumG += Z.R / den;
      sumB += -Z.X / den;
    }
    const denY = sumG * sumG + sumB * sumB;
    if (denY === 0) return { R: 0, X: 0 };
    // 1/(G+jB) = (G-jB)/(G^2+B^2)
    return { R: sumG / denY, X: -sumB / denY };
  };

  const perNode = {};
  for (const n of nodesArr) {
    const cands = Zcands.get(n.id);
    const Zth = combineParallel(cands);
    const V = getNodeVoltage(n, 480);

    const Zmag = Math.sqrt(Zth.R * Zth.R + Zth.X * Zth.X);
    if (Zmag === 0) {
      perNode[n.id] = {
        V_ll: V,
        Zth_ohm: { R: Zth.R, X: Zth.X, mag: Zmag },
        I_3F_A: null,
        I_3F_kA: null,
        warning: 'Zth=0 (no upstream impedance). Mark a source or add upstream elements.'
      };
      continue;
    }

    // Use existing ICC core for magnitude and trifásico formula
    const { icc, impedancia } = calcularICC({
      voltaje: V,
      resistencia: Zth.R,
      reactancia: Zth.X,
      tipo: 'trifasico'
    });

    perNode[n.id] = {
      V_ll: V,
      Zth_ohm: { R: Zth.R, X: Zth.X, mag: impedancia },
      I_3F_A: icc,
      I_3F_kA: icc / 1000,
      design: {
        I_self_A: Iself[n.id] || 0,
        I_downstream_A: Idown[n.id] || 0
      }
    };

    // Breaker compliance: Isc must be <= Icu
    if (n.type === 'breaker') {
      const p = getParams(n);
      const Icu = Number(p.Icu ?? 0);
      if (Number.isFinite(Icu) && Icu > 0) {
        perNode[n.id].validations = {
          breaker: icc > Icu ? 'FAIL' : 'OK'
        };
      }
    }
  }

  return {
    success: true,
    roots,
    resultsByNodeId: perNode,
    resultsByEdgeId: edgeResults
  };
}

module.exports = { calculateIccFromGraph };

