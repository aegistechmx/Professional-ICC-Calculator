/**
 * utils/alignmentTools.js - Herramientas de Alineación tipo AutoCAD
 * Alinear y distribuir nodos seleccionados
 */

/* eslint-disable no-console */
// ==================== ALINEACIÓN ====================

/**
 * Alinear nodos seleccionados a la izquierda
 */
export function alignLeft(nodes) {
  const selected = nodes.filter(n => n.selected);
  if (selected.length < 2) return nodes;

  const minX = Math.min(...selected.map(n => n.position.x));

  return nodes.map(n =>
    n.selected
      ? { ...n, position: { ...n.position, x: minX } }
      : n
  );
}

/**
 * Alinear nodos seleccionados a la derecha
 */
export function alignRight(nodes) {
  const selected = nodes.filter(n => n.selected);
  if (selected.length < 2) return nodes;

  // Calcular el borde derecho de cada nodo (asumiendo ancho de 150px)
  const nodeWidth = 150;
  const maxRight = Math.max(...selected.map(n => n.position.x + nodeWidth));

  return nodes.map(n =>
    n.selected
      ? { ...n, position: { ...n.position, x: maxRight - nodeWidth } }
      : n
  );
}

/**
 * Alinear nodos seleccionados al centro horizontal
 */
export function alignCenterH(nodes) {
  const selected = nodes.filter(n => n.selected);
  if (selected.length < 2) return nodes;

  const nodeWidth = 150;
  const minX = Math.min(...selected.map(n => n.position.x));
  const maxX = Math.max(...selected.map(n => n.position.x + nodeWidth));
  const centerX = (minX + maxX) / 2 - nodeWidth / 2;

  return nodes.map(n =>
    n.selected
      ? { ...n, position: { ...n.position, x: centerX } }
      : n
  );
}

/**
 * Alinear nodos seleccionados arriba
 */
export function alignTop(nodes) {
  const selected = nodes.filter(n => n.selected);
  if (selected.length < 2) return nodes;

  const minY = Math.min(...selected.map(n => n.position.y));

  return nodes.map(n =>
    n.selected
      ? { ...n, position: { ...n.position, y: minY } }
      : n
  );
}

/**
 * Alinear nodos seleccionados abajo
 */
export function alignBottom(nodes) {
  const selected = nodes.filter(n => n.selected);
  if (selected.length < 2) return nodes;

  // Asumiendo alto de 100px
  const nodeHeight = 100;
  const maxBottom = Math.max(...selected.map(n => n.position.y + nodeHeight));

  return nodes.map(n =>
    n.selected
      ? { ...n, position: { ...n.position, y: maxBottom - nodeHeight } }
      : n
  );
}

/**
 * Alinear nodos seleccionados al centro vertical
 */
export function alignCenterV(nodes) {
  const selected = nodes.filter(n => n.selected);
  if (selected.length < 2) return nodes;

  const nodeHeight = 100;
  const minY = Math.min(...selected.map(n => n.position.y));
  const maxY = Math.max(...selected.map(n => n.position.y + nodeHeight));
  const centerY = (minY + maxY) / 2 - nodeHeight / 2;

  return nodes.map(n =>
    n.selected
      ? { ...n, position: { ...n.position, y: centerY } }
      : n
  );
}

// ==================== DISTRIBUCIÓN ====================

/**
 * Distribuir nodos horizontalmente (igual espacio entre ellos)
 */
export function distributeHorizontal(nodes) {
  const selected = nodes.filter(n => n.selected);
  if (selected.length < 3) return nodes;

  const nodeWidth = 150;
  const sorted = [...selected].sort((a, b) => a.position.x - b.position.x);

  const min = sorted[0].position.x;
  const max = sorted[sorted.length - 1].position.x + nodeWidth;
  const totalWidth = max - min;
  const gap = totalWidth / (sorted.length - 1);

  return nodes.map(n => {
    const index = sorted.findIndex(s => s.id === n.id);
    if (index === -1) return n;

    return {
      ...n,
      position: {
        ...n.position,
        x: min + gap * index
      }
    };
  });
}

/**
 * Distribuir nodos verticalmente (igual espacio entre ellos)
 */
export function distributeVertical(nodes) {
  const selected = nodes.filter(n => n.selected);
  if (selected.length < 3) return nodes;

  const nodeHeight = 100;
  const sorted = [...selected].sort((a, b) => a.position.y - b.position.y);

  const min = sorted[0].position.y;
  const max = sorted[sorted.length - 1].position.y + nodeHeight;
  const totalHeight = max - min;
  const gap = totalHeight / (sorted.length - 1);

  return nodes.map(n => {
    const index = sorted.findIndex(s => s.id === n.id);
    if (index === -1) return n;

    return {
      ...n,
      position: {
        ...n.position,
        y: min + gap * index
      }
    };
  });
}

/**
 * Distribuir nodos en grid automático
 */
export function distributeGrid(nodes, columns = 3) {
  const selected = nodes.filter(n => n.selected);
  if (selected.length < 2) return nodes;

  const spacing = 200;
  const startX = Math.min(...selected.map(n => n.position.x));
  const startY = Math.min(...selected.map(n => n.position.y));

  return nodes.map(n => {
    const index = selected.findIndex(s => s.id === n.id);
    if (index === -1) return n;

    const col = index % columns;
    const row = Math.floor(index / columns);

    return {
      ...n,
      position: {
        x: startX + col * spacing,
        y: startY + row * spacing
      }
    };
  });
}

// ==================== SNAP INTELIGENTE ====================

/**
 * Encontrar líneas de guía basadas en otros nodos
 */
export function getSnapGuides(nodes, draggedNode, threshold = 10) {
  const guides = {
    vertical: [],
    horizontal: []
  };

  const nodeWidth = 150;
  const nodeHeight = 100;

  const draggedCenterX = draggedNode.position.x + nodeWidth / 2;
  const draggedCenterY = draggedNode.position.y + nodeHeight / 2;
  const draggedRight = draggedNode.position.x + nodeWidth;
  const draggedBottom = draggedNode.position.y + nodeHeight;

  nodes.forEach(node => {
    if (node.id === draggedNode.id) return;

    const nodeCenterX = node.position.x + nodeWidth / 2;
    const nodeCenterY = node.position.y + nodeHeight / 2;
    const nodeRight = node.position.x + nodeWidth;
    const nodeBottom = node.position.y + nodeHeight;

    // Guías verticales
    if (Math.abs(draggedNode.position.x - node.position.x) < threshold) {
      guides.vertical.push({
        x: node.position.x,
        type: 'left',
        nodeId: node.id
      });
    }
    if (Math.abs(draggedCenterX - nodeCenterX) < threshold) {
      guides.vertical.push({
        x: nodeCenterX - nodeWidth / 2,
        type: 'center',
        nodeId: node.id
      });
    }
    if (Math.abs(draggedRight - nodeRight) < threshold) {
      guides.vertical.push({
        x: nodeRight - nodeWidth,
        type: 'right',
        nodeId: node.id
      });
    }

    // Guías horizontales
    if (Math.abs(draggedNode.position.y - node.position.y) < threshold) {
      guides.horizontal.push({
        y: node.position.y,
        type: 'top',
        nodeId: node.id
      });
    }
    if (Math.abs(draggedCenterY - nodeCenterY) < threshold) {
      guides.horizontal.push({
        y: nodeCenterY - nodeHeight / 2,
        type: 'center',
        nodeId: node.id
      });
    }
    if (Math.abs(draggedBottom - nodeBottom) < threshold) {
      guides.horizontal.push({
        y: nodeBottom - nodeHeight,
        type: 'bottom',
        nodeId: node.id
      });
    }
  });

  return guides;
}

/**
 * Aplicar snap a posición basado en guías
 */
export function applySnap(position, guides, _threshold = 10) {
  const nodeWidth = 150;
  const nodeHeight = 100;
  // const centerX = position.x + nodeWidth / 2; // Unused variable removed
  // const centerY = position.y + nodeHeight / 2; // Unused variable removed
  // const right = position.x + nodeWidth; // Unused variable removed
  // const bottom = position.y + nodeHeight; // Unused variable removed

  let newPosition = { ...position };
  let snapped = { x: false, y: false };

  // Aplicar snap vertical
  guides.vertical.forEach(guide => {
    switch (guide.type) {
      case 'left':
        if (!snapped.x) {
          newPosition.x = guide.x;
          snapped.x = true;
        }
        break;
      case 'center':
        if (!snapped.x) {
          newPosition.x = guide.x;
          snapped.x = true;
        }
        break;
      case 'right':
        if (!snapped.x) {
          newPosition.x = guide.x;
          snapped.x = true;
        }
        break;
    }
  });

  // Aplicar snap horizontal
  guides.horizontal.forEach(guide => {
    switch (guide.type) {
      case 'top':
        if (!snapped.y) {
          newPosition.y = guide.y;
          snapped.y = true;
        }
        break;
      case 'center':
        if (!snapped.y) {
          newPosition.y = guide.y;
          snapped.y = true;
        }
        break;
      case 'bottom':
        if (!snapped.y) {
          newPosition.y = guide.y;
          snapped.y = true;
        }
        break;
    }
  });

  return { position: newPosition, snapped };
}

// ==================== ESPACIADO ====================

/**
 * Hacer espacio entre nodos (push apart)
 */
export function makeSpace(nodes, direction = 'horizontal', amount = 50) {
  const selected = nodes.filter(n => n.selected);
  if (selected.length < 2) return nodes;

  const sorted = direction === 'horizontal'
    ? [...selected].sort((a, b) => a.position.x - b.position.x)
    : [...selected].sort((a, b) => a.position.y - b.position.y);

  return nodes.map(n => {
    const index = sorted.findIndex(s => s.id === n.id);
    if (index === -1) return n;

    return {
      ...n,
      position: {
        ...n.position,
        [direction === 'horizontal' ? 'x' : 'y']:
          n.position[direction === 'horizontal' ? 'x' : 'y'] + amount * index
      }
    };
  });
}

// ==================== BOUNDING BOX ====================

/**
 * Calcular bounding box de nodos seleccionados
 */
export function getBoundingBox(nodes) {
  const selected = nodes.filter(n => n.selected);
  if (selected.length === 0) return null;

  const nodeWidth = 150;
  const nodeHeight = 100;

  const minX = Math.min(...selected.map(n => n.position.x));
  const maxX = Math.max(...selected.map(n => n.position.x + nodeWidth));
  const minY = Math.min(...selected.map(n => n.position.y));
  const maxY = Math.max(...selected.map(n => n.position.y + nodeHeight));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}
