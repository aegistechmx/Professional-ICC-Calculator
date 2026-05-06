/**
 * hooks/useParticleEngine.js - Motor de Partículas de Alta Performance
 * Hook optimizado con canvas + requestAnimationFrame para flujo de corriente
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';

export function useParticleEngine({ graph, results, getEdgePath, options = {} }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  // === CONFIGURACIÓN GLOBAL ===
  const CONFIG = {
    maxParticlesPerEdge: options.maxParticlesPerEdge || 20,
    speedFactor: options.speedFactor || 0.002,
    baseSize: options.baseSize || 2,
    minCurrentForParticles: options.minCurrentForParticles || 10,
    particleSpacing: options.particleSpacing || 0.05, // Espaciado entre partículas
    enableGlow: options.enableGlow !== false, // Efecto de brillo
    enableDirection: options.enableDirection !== false, // Dirección de flujo
    zoomScale: options.zoomScale || 1,
    panOffset: options.panOffset || { x: 0, y: 0 }
  };

  // === OBTENER CORRIENTE DEL EDGE ===
  const getEdgeCurrent = useCallback((edge) => {
    if (!results) return 0;

    // Buscar en diferentes estructuras de resultados
    const edgeResult = results?.data?.graphAnalysis?.edges?.find(
      e =>
        (e.source === edge.source && e.target === edge.target) ||
        (e.from === edge.from && e.to === edge.to) ||
        (e.id === edge.id)
    ) || results?.flujos?.find(
      e =>
        (e.from === edge.source && e.to === edge.target) ||
        (e.source === edge.source && e.target === edge.target)
    );

    return edgeResult?.I || edgeResult?.current || 50; // fallback visual
  }, [results]);

  // === INTENSIDAD DE GLOW BASADA EN ICC ===
  const getGlowIntensity = useCallback((edge, results) => {
    const edgeData = results?.data?.graphAnalysis?.edges?.find(
      e =>
        (e.source === edge.source && e.target === edge.target) ||
        (e.from === edge.from && e.to === edge.to)
    ) || results?.flujos?.find(
      e => (e.from === edge.source && e.to === edge.target)
    );

    const I = edgeData?.I || edgeData?.current || 0;
    const Icc = edgeData?.Icc || 0;

    // Peso mayor al ICC (70%) y a corriente normal (30%)
    const intensity = (I * 0.3 + Icc * 0.7);

    // Normalizar a 0-1
    return Math.min(intensity / 1000, 1);
  }, []);

  // === ESTILO DE GLOW DINÁMICO (NIVEL ETAP) ===
  const getGlowStyle = useCallback((edge, results, time = 0) => {
    const intensity = getGlowIntensity(edge, results);

    // Detectar modo falla
    const edgeData = results?.data?.graphAnalysis?.edges?.find(
      e =>
        (e.source === edge.source && e.target === edge.target) ||
        (e.from === edge.from && e.to === edge.to)
    ) || results?.flujos?.find(
      e => (e.from === edge.source && e.to === edge.target)
    );

    if (edgeData?.fault) {
      // Modo falla brutal
      return {
        color: '#ff0000',
        blur: 40 + Math.random() * 10, // Efecto chispa
        alpha: 1,
        pulse: 1.5 // Pulso rápido
      };
    }

    // Color basado en intensidad
    let color = '#00e5ff'; // Normal (cyan eléctrico)
    if (intensity > 0.7) color = '#ff3b30'; // Rojo - alto ICC
    else if (intensity > 0.4) color = '#ffcc00'; // Amarillo - ICC medio
    else if (intensity > 0.2) color = '#00ff88'; // Verde - ICC bajo

    // Pulsación eléctrica (efecto vivo tipo SCADA)
    const pulse = Math.sin(time * 0.005) * 0.5 + 0.5;

    return {
      color,
      blur: 5 + intensity * 25, // Glow dinámico 5-30px
      alpha: 0.4 + intensity * 0.6, // Transparencia variable
      pulse: 0.7 + pulse * 0.6 // Pulsación variable
    };
  }, [getGlowIntensity]);

  // === COLOR INTELIGENTE DE PARTÍCULA ===
  const getParticleColor = useCallback((edge, current) => {
    // Basado en corriente con colores eléctricos profesionales
    if (current > 1000) return '#dc2626'; // Rojo intenso - sobrecarga crítica
    if (current > 500) return '#ef4444';  // Rojo - alta carga
    if (current > 200) return '#f97316';  // Naranja - carga elevada
    if (current > 100) return '#eab308';  // Amarillo - carga media
    if (current > 50) return '#22c55e';   // Verde - carga normal
    if (current > 10) return '#06b6d4';   // Cyan - baja carga
    return '#64748b';                     // Gris - mínima carga
  }, []);

  // === INICIALIZAR PARTÍCULAS ===
  const initParticles = useCallback(() => {
    const particles = [];

    graph.edges.forEach(edge => {
      const current = getEdgeCurrent(edge);

      // Solo crear partículas para corrientes significativas
      if (current < CONFIG.minCurrentForParticles) return;

      // Calcular densidad basada en corriente
      const count = Math.min(
        CONFIG.maxParticlesPerEdge,
        Math.max(1, Math.floor(current / 20)) // 1 partícula cada 20A
      );

      // Distribuir partículas uniformemente en el path
      for (let i = 0; i < count; i++) {
        particles.push({
          edgeId: edge.id || `${edge.source}-${edge.target}`,
          t: (i / count) + Math.random() * 0.1, // Distribución uniforme con variación
          speed: Math.abs(current) * CONFIG.speedFactor,
          direction: current >= 0 ? 1 : -1, // Dirección basada en signo de corriente
          baseSpeed: Math.abs(current) * CONFIG.speedFactor,
          color: getParticleColor(edge, current),
          size: CONFIG.baseSize + Math.min(2, current / 200), // Tamaño basado en corriente
          opacity: Math.min(1, 0.3 + current / 500), // Opacidad basada en corriente
          current: current
        });
      }
    });

    particlesRef.current = particles;
  }, [graph.edges, getEdgeCurrent, getParticleColor, CONFIG]);

  // === OBTENER PUNTO EN PATH ===
  const getPointOnPath = useCallback((path, t) => {
    if (!path || path.length < 2) return { x: 0, y: 0 };

    const total = path.length - 1;
    const index = Math.floor(t * total);
    const nextIndex = Math.min(index + 1, total);

    const p1 = path[index];
    const p2 = path[nextIndex];

    const localT = (t * total) - index;

    return {
      x: p1.x + (p2.x - p1.x) * localT,
      y: p1.y + (p2.y - p1.y) * localT
    };
  }, []);

  // === DIBUJAR GLOW EN LÍNEAS (BONUS VISUAL) ===
  const drawEdgeGlow = useCallback((ctx, edge, path, glow) => {
    if (!path || path.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);

    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }

    ctx.strokeStyle = glow.color;
    ctx.lineWidth = 2 + glow.blur * 0.1;
    ctx.shadowBlur = glow.blur * glow.pulse;
    ctx.shadowColor = glow.color;
    ctx.globalAlpha = 0.3;

    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }, []);

  // === DIBUJAR PARTÍCULAS CON GLOW DINÁMICO ===
  const draw = useCallback((ctx) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const time = performance.now(); // Para pulsos eléctricos

    // Aplicar transformación para zoom/pan
    ctx.save();
    ctx.setTransform(
      CONFIG.zoomScale, 0,
      0, CONFIG.zoomScale,
      CONFIG.panOffset.x,
      CONFIG.panOffset.y
    );

    // Agrupar partículas por edge para optimizar
    const particlesByEdge = {};
    particlesRef.current.forEach(particle => {
      if (!particlesByEdge[particle.edgeId]) {
        particlesByEdge[particle.edgeId] = [];
      }
      particlesByEdge[particle.edgeId].push(particle);
    });

    // Dibujar glow de líneas primero (background)
    Object.keys(particlesByEdge).forEach(edgeId => {
      const edge = graph.edges.find(
        e => (e.id || `${e.source}-${e.target}`) === edgeId
      );
      if (!edge) return;

      const path = getEdgePath(edge);
      const glow = getGlowStyle(edge, results, time);

      drawEdgeGlow(ctx, edge, path, glow);
    });

    // Dibujar partículas
    particlesRef.current.forEach(particle => {
      const edge = graph.edges.find(
        e => (e.id || `${e.source}-${e.target}`) === particle.edgeId
      );

      if (!edge) return;

      const path = getEdgePath(edge);
      if (!path || path.length < 2) return;

      const point = getPointOnPath(path, particle.t);
      const glow = getGlowStyle(edge, results, time);

      // === GLOW PRINCIPAL (NIVEL ETAP) ===
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = glow.color;
      ctx.globalAlpha = glow.alpha;
      ctx.shadowBlur = glow.blur * glow.pulse; // Pulsación eléctrica
      ctx.shadowColor = glow.color;
      ctx.fill();

      // === NÚCLEO BRILLANTE ===
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.fill();

      // === EFECTO EXTRA: HALO INTERNO ===
      if (glow.intensity > 0.5) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = glow.color;
        ctx.globalAlpha = glow.alpha * 0.3;
        ctx.fill();
      }
    });

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }, [graph.edges, getEdgePath, getPointOnPath, getGlowStyle, drawEdgeGlow, CONFIG, results]);

  // === ACTUALIZAR POSICIONES ===
  const update = useCallback(() => {
    const now = Date.now();
    const deltaTime = now - lastUpdateRef.current;
    lastUpdateRef.current = now;

    particlesRef.current.forEach(particle => {
      // Movimiento basado en dirección y velocidad
      if (CONFIG.enableDirection) {
        particle.t += particle.speed * particle.direction * (deltaTime / 16); // Normalizado a 60fps
      } else {
        particle.t += particle.speed * (deltaTime / 16);
      }

      // Loop infinito
      if (particle.t > 1) {
        particle.t -= 1;
      } else if (particle.t < 0) {
        particle.t += 1;
      }

      // Actualizar propiedades basadas en corriente actual
      const current = getEdgeCurrent(graph.edges.find(
        e => (e.id || `${e.source}-${e.target}`) === particle.edgeId
      ));

      if (current !== particle.current) {
        particle.current = current;
        particle.speed = Math.abs(current) * CONFIG.speedFactor;
        particle.direction = current >= 0 ? 1 : -1;
        particle.color = getParticleColor(
          graph.edges.find(e => (e.id || `${e.source}-${e.target}`) === particle.edgeId),
          current
        );
        particle.size = CONFIG.baseSize + Math.min(2, current / 200);
        particle.opacity = Math.min(1, 0.3 + current / 500);
      }
    });
  }, [graph.edges, getEdgeCurrent, getParticleColor, CONFIG]);

  // === BUCLE DE ANIMACIÓN ===
  const loop = useCallback((ctx) => {
    update();
    draw(ctx);
    animationRef.current = requestAnimationFrame(() => loop(ctx));
  }, [update, draw]);

  // === ACTUALIZACIÓN DINÁMICA ===
  const updateConfig = useCallback((newConfig) => {
    Object.assign(CONFIG, newConfig);
  }, [CONFIG]);

  // === ESTADÍSTICAS ===
  const getStats = useCallback(() => {
    return {
      totalParticles: particlesRef.current.length,
      activeEdges: new Set(particlesRef.current.map(p => p.edgeId)).size,
      averageSpeed: particlesRef.current.reduce((sum, p) => sum + p.speed, 0) / particlesRef.current.length || 0,
      fps: animationRef.current ? 60 : 0
    };
  }, []);

  // === INICIALIZACIÓN ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graph?.edges?.length) return;

    const ctx = canvas.getContext('2d');

    // Inicializar partículas
    initParticles();

    // Iniciar animación
    loop(ctx);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [graph, results, initParticles, loop]);

  // === ACTUALIZAR PARTÍCULAS CUANDO CAMBIAN RESULTADOS ===
  useEffect(() => {
    if (results) {
      initParticles();
    }
  }, [results, initParticles]);

  return {
    canvasRef,
    updateConfig,
    getStats,
    particles: particlesRef.current
  };
}

// === FUNCIÓN AUXILIAR PARA INTERPOLAR EN LÍNEA ===
export function getPointOnPath(path, t) {
  if (!path || path.length < 2) return { x: 0, y: 0 };

  const total = path.length - 1;
  const index = Math.floor(t * total);
  const nextIndex = Math.min(index + 1, total);

  const p1 = path[index];
  const p2 = path[nextIndex];

  const localT = (t * total) - index;

  return {
    x: p1.x + (p2.x - p1.x) * localT,
    y: p1.y + (p2.y - p1.y) * localT
  };
}

// === FUNCIÓN PARA OBTENER PATH DE EDGE (React Flow) ===
export function getEdgePathForReactFlow(edge) {
  // React Flow edge points
  if (edge.points && edge.points.length > 0) {
    return edge.points.map(point => ({
      x: point.x,
      y: point.y
    }));
  }

  // Fallback a línea recta
  const sourceNode = edge.sourceNode || { position: { x: 0, y: 0 } };
  const targetNode = edge.targetNode || { position: { x: 100, y: 100 } };

  return [
    { x: sourceNode.position.x, y: sourceNode.position.y },
    { x: targetNode.position.x, y: targetNode.position.y }
  ];
}

// === FUNCIÓN PARA OBTENER PATH DE EDGE (Graph Simple) ===
export function getEdgePathForGraph(edge, nodes) {
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);

  if (!sourceNode?.position || !targetNode?.position) {
    return [{ x: 0, y: 0 }, { x: 100, y: 100 }];
  }

  // Si hay puntos de control (routing), usarlos
  if (edge.points && edge.points.length > 0) {
    return [
      sourceNode.position,
      ...edge.points,
      targetNode.position
    ];
  }

  // Línea recta por defecto
  return [
    sourceNode.position,
    targetNode.position
  ];
}

// === COLOR INTELIGENTE (PRO) ===
export function getParticleColorPro(edge, current) {
  // Paleta de colores eléctricos profesionales
  const colors = {
    critical: { current: 1000, color: '#dc2626', glow: '#ef4444' },  // Rojo crítico
    high: { current: 500, color: '#ef4444', glow: '#f87171' },     // Rojo alto
    elevated: { current: 200, color: '#f97316', glow: '#fb923c' },   // Naranja
    medium: { current: 100, color: '#eab308', glow: '#facc15' },     // Amarillo
    normal: { current: 50, color: '#22c55e', glow: '#4ade80' },      // Verde
    low: { current: 10, color: '#06b6d4', glow: '#22d3ee' },        // Cyan
    minimal: { current: 0, color: '#64748b', glow: '#94a3b8' }        // Gris
  };

  const absCurrent = Math.abs(current);

  for (const [key, config] of Object.entries(colors)) {
    if (absCurrent >= config.current) {
      return config.color;
    }
  }

  return colors.minimal.color;
}

export default useParticleEngine;
