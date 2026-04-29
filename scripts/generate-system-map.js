/**
 * generate-system-map.js - Professional system map generator
 * 
 * Responsibility: Generate Graphviz visualization of electrical system, solver flow, and code structure
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKEND_SRC = path.join(ROOT, 'backend', 'src');
const OUTPUT_DOT = path.join(ROOT, 'system-map.dot');
const OUTPUT_PNG = path.join(ROOT, 'system-map.png');

// ===== SAMPLE ELECTRICAL SYSTEM =====
const system = {
  buses: [
    { id: 1, type: 'Slack', name: 'Substation A' },
    { id: 2, type: 'PV', name: 'Generator B' },
    { id: 3, type: 'PQ', name: 'Load C' },
    { id: 4, type: 'PQ', name: 'Load D' },
    { id: 5, type: 'PV', name: 'Generator E' }
  ],
  branches: [
    { from: 1, to: 2, type: 'Transmission' },
    { from: 2, to: 3, type: 'Distribution' },
    { from: 3, to: 4, type: 'Distribution' },
    { from: 1, to: 5, type: 'Transmission' },
    { from: 5, to: 4, type: 'Distribution' },
    { from: 1, to: 3, type: 'Transmission' }
  ]
};

// ===== SCAN CODE STRUCTURE =====
function scanCode(dir, result = []) {
  try {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const full = path.join(dir, item);

      if (full.includes('node_modules') || full.includes('.git')) return;

      if (fs.statSync(full).isDirectory()) {
        scanCode(full, result);
      } else if (item.endsWith('.js')) {
        result.push(full);
      }
    });
  } catch (err) {
    // Skip directories we can't access
  }

  return result;
}

// ===== GET DIRECTORY STRUCTURE =====
function getDirectoryStructure(dir, parent = '', result = {}) {
  try {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const full = path.join(dir, item);
      const relativePath = path.join(parent, item);

      if (full.includes('node_modules') || full.includes('.git')) return;

      if (fs.statSync(full).isDirectory()) {
        result[relativePath] = { type: 'dir', children: {} };
        getDirectoryStructure(full, relativePath, result[relativePath].children);
      } else if (item.endsWith('.js')) {
        result[relativePath] = { type: 'file' };
      }
    });
  } catch (err) {
    // Skip directories we can't access
  }

  return result;
}

// ===== BUILD GRAPHVIZ DOT =====
function generateDot() {
  let dot = `digraph G {
    rankdir=TB;
    splines=ortho;
    nodesep=0.5;
    ranksep=0.8;
    fontname="Arial";
    fontsize=10;

    // ===== ELECTRICAL SYSTEM CLUSTER =====
    subgraph cluster_electrical {
      label="⚡ ELECTRICAL SYSTEM";
      style=filled;
      color="#3b82f6";
      fillcolor="#1e3a5f";
      fontcolor="white";
      fontsize=14;

  `;

  // BUSES
  system.buses.forEach(bus => {
    const color = bus.type === 'Slack' ? '#ef4444' : bus.type === 'PV' ? '#22c55e' : '#f59e0b';
    dot += `  bus${bus.id} [label="Bus ${bus.id}\\n${bus.name}\\n(${bus.type})" shape=ellipse style=filled fillcolor="${color}" fontcolor="white"];\n`;
  });

  // BRANCHES
  system.branches.forEach((br, i) => {
    const color = br.type === 'Transmission' ? '#60a5fa' : '#34d399';
    dot += `  bus${br.from} -> bus${br.to} [label="${br.type}" color="${color}" penwidth=2];\n`;
  });

  dot += `  }\n`;

  // ===== SOLVER PIPELINE CLUSTER =====
  dot += `
  subgraph cluster_solver {
    label="🧠 SOLVER PIPELINE";
    style=filled;
    color="#22c55e";
    fillcolor="#1e3a2a";
    fontcolor="white";
    fontsize=14;

    NR [label="Newton-Raphson\\nPower Flow" shape=box style=filled fillcolor="#4ade80" fontcolor="black"];
    PV [label="PV Control\\nVoltage Regulation" shape=box style=filled fillcolor="#86efac" fontcolor="black"];
    LS [label="Line Search\\nConvergence" shape=box style=filled fillcolor="#bbf7d0" fontcolor="black"];
    TR [label="Trust Region\\nRobustness" shape=box style=filled fillcolor="#dcfce7" fontcolor="black"];
    FDLF [label="Fast Decoupled\\nIterative" shape=box style=filled fillcolor="#f0fdf4" fontcolor="black"];
    OPF [label="Optimal Power Flow\\nEconomic Dispatch" shape=box style=filled fillcolor="#fef08a" fontcolor="black"];
    SCOPF [label="Security-Constrained\\nN-1 Analysis" shape=box style=filled fillcolor="#fde047" fontcolor="black"];

    NR -> PV -> LS -> TR;
    NR -> FDLF;
    OPF -> SCOPF;
    NR -> OPF [style=dashed label="base"];
  }
  `;

  // ===== CODE STRUCTURE CLUSTER =====
  const structure = getDirectoryStructure(BACKEND_SRC);

  dot += `
  subgraph cluster_code {
    label="🧩 CODE STRUCTURE";
    style=filled;
    color="#a855f7";
    fillcolor="#2e1a4d";
    fontcolor="white";
    fontsize=14;

  `;

  // Main directories
  const mainDirs = ['core', 'application', 'infrastructure', 'interfaces', 'shared', 'plugins'];
  let dirIndex = 0;

  mainDirs.forEach(dir => {
    if (structure[dir]) {
      const color = dir === 'core' ? '#ef4444' : dir === 'application' ? '#22c55e' : dir === 'infrastructure' ? '#3b82f6' : dir === 'interfaces' ? '#f59e0b' : dir === 'shared' ? '#8b5cf6' : '#ec4899';
      dot += `  dir${dirIndex} [label="${dir.toUpperCase()}" shape=folder style=filled fillcolor="${color}" fontcolor="white"];\n`;
      dirIndex++;
    }
  });

  // Key files
  const keyFiles = [
    'core/index.js',
    'application/index.js',
    'server.js',
    'app.js'
  ];

  keyFiles.forEach((file, i) => {
    const relativePath = path.relative(BACKEND_SRC, path.join(BACKEND_SRC, file));
    if (fs.existsSync(path.join(BACKEND_SRC, file))) {
      dot += `  keyfile${i} [label="${file}" shape=note style=filled fillcolor="#fbbf24" fontcolor="black"];\n`;
    }
  });

  dot += `  }\n`;

  // ===== DISTRIBUTED SYSTEM CLUSTER =====
  dot += `
  subgraph cluster_distributed {
    label="🌐 DISTRIBUTED SYSTEM";
    style=filled;
    color="#ec4899";
    fillcolor="#4a1a3a";
    fontcolor="white";
    fontsize=14;

    Queue [label="Redis Queue\\nJob Management" shape=cylinder style=filled fillcolor="#f472b6" fontcolor="white"];
    Scheduler [label="Job Scheduler\\nOrchestration" shape=box style=filled fillcolor="#fb7185" fontcolor="white"];
    Workers [label="Worker Pool\\nParallel Processing" shape=box3d style=filled fillcolor="#fda4af" fontcolor="white"];
    Monitor [label="Monitoring\\nBull Board" shape=ellipse style=filled fillcolor="#fecdd3" fontcolor="black"];

    Queue -> Scheduler -> Workers;
    Scheduler -> Monitor [style=dashed];
  }
  `;

  // ===== INTER-CLUSTER CONNECTIONS =====
  dot += `
  // Electrical to Solver
  NR -> bus1 [style=dashed label="solve" color="#fbbf24"];
  PV -> bus2 [style=dashed color="#fbbf24"];
  FDLF -> bus3 [style=dashed color="#fbbf24"];

  // Solver to Code
  NR -> dir0 [style=dotted label="uses" color="#a855f7"];
  OPF -> dir0 [style=dotted color="#a855f7"];
  SCOPF -> dir0 [style=dotted color="#a855f7"];

  // Code to Distributed
  dir2 -> Queue [style=dotted label="creates" color="#ec4899"];
  Workers -> dir0 [style=dotted label="executes" color="#ec4899"];

  // Key files to directories
  keyfile0 -> dir0 [style=dashed color="#fbbf24"];
  keyfile1 -> dir1 [style=dashed color="#fbbf24"];
  keyfile2 -> dir2 [style=dashed color="#fbbf24"];
  keyfile3 -> dir2 [style=dashed color="#fbbf24"];
  `;

  dot += `}`;

  fs.writeFileSync(OUTPUT_DOT, dot);
  console.log('✅ DOT file generated:', OUTPUT_DOT);
  console.log('📊 To generate PNG, run:');
  console.log(`   dot -Tpng ${OUTPUT_DOT} -o ${OUTPUT_PNG}`);
  console.log(`   OR: dot -Tsvg ${OUTPUT_DOT} -o system-map.svg`);
}

// ===== MAIN =====
function main() {
  console.log('🗺️  Generating system map...\n');

  generateDot();

  console.log('\n📋 Map includes:');
  console.log('  ⚡ Electrical system topology (buses, branches)');
  console.log('  🧠 Solver pipeline (NR, PV, OPF, SCOPF)');
  console.log('  🧩 Code structure (core, application, infrastructure)');
  console.log('  🌐 Distributed system (queue, scheduler, workers)');
  console.log('\n🎨 To view the diagram:');
  console.log('  1. Install Graphviz: choco install graphviz');
  console.log('  2. Generate PNG: dot -Tpng system-map.dot -o system-map.png');
  console.log('  3. Open system-map.png');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateDot, scanCode, getDirectoryStructure };
