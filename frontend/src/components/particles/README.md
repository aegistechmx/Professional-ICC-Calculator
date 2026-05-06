# Sistema de Partículas para Animación de Fallas

## Overview

Este sistema de partículas reemplaza el sistema tradicional de "stroke animated" para crear una visualización física y realista del flujo de corriente eléctrica durante fallas. Las partículas se mueven a lo largo de los cables con velocidad proporcional a la corriente (Icc) y cambian de color cuando los breakers disparan.

## Características Principales

### 1. Modelo de Partícula Físico
- **Movimiento basado en caminos**: Las partículas siguen las rutas eléctricas reales
- **Velocidad proporcional**: `speed = 0.5 + log10(Icc) * 0.2`
- **Intensidad visual**: Radio y color basados en la corriente
- **Interpolación suave**: Movimiento continuo entre puntos del camino

### 2. Efectos Visuales Profesionales
- **Trail system**: Estelas de partículas con degradado
- **Glow effects**: Resplandor proporcional a la intensidad
- **Turbulence**: Variación aleatoria para corriente alta
- **Color dinámico**: Rojo -> Naranja -> Amarillo -> Blanco brillante
- **Electric arcs**: Conexiones entre partículas de alta intensidad

### 3. Sistema de Disparo de Breakers
- **Detección aguas arriba**: Identifica partículas afectadas
- **Corte visual**: Partículas cambian a azul y pierden velocidad
- **Efectos de celebración**: Partículas radiales en disparo exitoso
- **Animación de onda**: Efecto expansivo en breaker

## Arquitectura del Sistema

### Core Classes

#### `Particle`
```javascript
class Particle {
  constructor(path, speed, intensity, options = {})
  update(dt)                    // Actualizar posición
  getPosition()                 // Obtener posición interpolada
  isAlive()                     // Verificar si está activa
  setTripped(tripped)          // Cambiar estado por disparo
}
```

#### `ParticleSystem`
```javascript
class ParticleSystem {
  spawn(path, Icc, options)     // Crear nueva partícula
  update(dt)                    // Actualizar todas las partículas
  handleBreakerTrip(breakerId, graph) // Manejar disparo
  emitFaultParticles(graph, nodeId, Icc) // Emitir partículas de falla
}
```

#### `ParticleRenderer`
```javascript
class ParticleRenderer {
  render(particles)             // Renderizar todas las partículas
  renderParticles(particles)    // Renderizar partículas individuales
  renderTrails(particles)       // Renderizar estelas
  applyGlowEffect(particles)    // Aplicar efectos de resplandor
}
```

#### `FaultParticleEngine`
```javascript
class FaultParticleEngine {
  emitFaultParticles(graph, nodeId, Icc) // Punto de entrada principal
  handleBreakerTrip(breakerId, graph)    // Manejar disparos
  start() / stop()              // Control de animación
}
```

### Efectos Avanzados

#### `ProEffects`
```javascript
class ProEffects {
  renderParticleWithEffects(particle, ctx, time) // Renderizado completo
  applyTrailEffect(particle, ctx)               // Efectos de estela
  applyGlowEffect(particle, ctx, time)          // Efectos de resplandor
  applyTurbulence(particle, time)               // Turbulencia
  renderElectricArcs(particles, ctx, time)      // Arcos eléctricos
}
```

#### `BreakerEffects`
```javascript
class BreakerEffects {
  handleBreakerTrip(breakerId, breakerData, graph) // Manejar disparo
  affectUpstreamParticles(breakerId, graph)      // Afectar partículas
  renderEffects(ctx, breakerNodes)                // Renderizar efectos
}
```

## Integración con React

### Hook Principal: `useFaultParticleAnimation`

```javascript
const {
  canvasRef,                    // Ref para el canvas
  particleEngine,               // Instancia del motor
  isAnimating,                  // Estado de animación
  activeFaults,                  // Fallas activas
  trippedBreakers,              // Breakers disparados
  startFaultParticleAnimation,  // Iniciar animación
  stopParticleAnimation,        // Detener animación
  handleBreakerTrip,            // Manejar disparo
  getParticleStats              // Obtener estadísticas
} = useFaultParticleAnimation(graph, onNodeUpdate, onEdgeUpdate);
```

### Componente: `ParticleCanvas`

```jsx
<ParticleCanvas
  graph={{ nodes, edges }}
  onNodeUpdate={handleNodeUpdate}
  onEdgeUpdate={handleEdgeUpdate}
  enabled={true}
  options={{
    particleSystem: {
      maxParticles: 500,
      trailLength: 8,
      turbulence: 1.0
    },
    renderer: {
      enableGlow: true,
      enableTrails: true,
      glowIntensity: 15
    }
  }}
/>
```

## API de Uso

### Iniciar Animación de Falla

```javascript
// Desde React component
const faultId = startFaultParticleAnimation(nodeId, Icc);

// Desde API global (disponible en desarrollo)
window.emitFaultParticles(nodeId, Icc);
```

### Manejar Disparo de Breaker

```javascript
handleBreakerTrip(breakerId, breakerData, graph);
```

### Configurar Opciones

```javascript
updateParticleOptions({
  particleSystem: {
    maxParticles: 800,
    trailLength: 10,
    turbulence: 2.0
  },
  renderer: {
    enableGlow: true,
    glowIntensity: 20,
    enableTrails: true
  }
});
```

## Fórmulas y Cálculos

### Velocidad de Partícula
```javascript
speed = 0.5 + Math.log10(Icc) * 0.2
```

### Radio de Partícula
```javascript
radius = 2 + Math.log10(intensity) * 0.5
```

### Cantidad de Partículas
```javascript
count = Math.min(30, Math.max(3, 5 + Math.log10(Icc) * 2))
```

### Color por Intensidad
```javascript
if (Icc > 15000) return 'rgba(255, 255, 100, 0.9)'; // Amarillo brillante
if (Icc > 10000) return 'rgba(255, 200, 0, 0.8)';   // Amarillo
if (Icc > 5000) return 'rgba(255, 150, 0, 0.8)';    // Naranja
if (Icc > 2000) return 'rgba(255, 80, 0, 0.8)';     // Naranja-rojo
return 'rgba(255, 50, 50, 0.7)';                     // Rojo
```

## Rendimiento y Optimización

### Límites y Configuración
- **Máximo de partículas**: 500 (configurable)
- **Target FPS**: 60 (configurable)
- **Trail length**: 8 puntos (configurable)
- **Lifespan**: 3000-5000ms (configurable)

### Optimizaciones Implementadas
- **Delta time limiting**: Prevenir saltos grandes
- **Particle cleanup**: Eliminación automática de partículas muertas
- **Canvas optimization**: High DPI support y smoothing
- **Memory management**: Límites de partículas y cleanup periódico

## Ejemplo Completo

Ver `FaultAnimationExample.jsx` para una implementación completa que incluye:
- Integración con React Flow
- Panel de control
- Estadísticas en tiempo real
- Modo comparación (partículas vs tradicional)

## Debugging y Desarrollo

### API Global (Development)
```javascript
window.particleEngine        // Acceso al motor
window.emitFaultParticles(nodeId, Icc)  // Probar falla
window.stopParticles()       // Detener todo
window.getParticleStats()    // Estadísticas
```

### Debug Panel
- Estadísticas de partículas en tiempo real
- Controles de prueba
- Visualización de estado

## Comparación con Sistema Anterior

| Característica | Sistema Anterior | Sistema de Partículas |
|----------------|------------------|----------------------|
| Visualización | Stroke animado | Partículas físicas |
| Realismo | Bajo | Alto |
| Intensidad | Ancho de línea | Radio, color, velocidad |
| Disparo | Color estático | Efecto dinámico de corte |
| Performance | Bajo | Optimizado con límites |
| Interactividad | Limitada | API completa |

## Futuras Mejoras

1. **Curvas Bezier**: Caminos curvos para cables
2. **3D effects**: Profundidad y sombras
3. **Sound effects**: Sonido proporcional a intensidad
4. **Multi-layer**: Capas para diferentes tipos de corriente
5. **Physics simulation**: Comportamiento más realista

## Troubleshooting

### Problemas Comunes
- **Partículas no aparecen**: Verificar que el canvas esté posicionado correctamente
- **Bajo rendimiento**: Reducir maxParticles o trailLength
- **Colores incorrectos**: Verificar valores de Icc

### Debug Tips
- Usar `showDebug: true` en opciones del renderer
- Monitorear `getParticleStats()` periódicamente
- Verificar que los nodos tengan posiciones válidas

## Licencia y Créditos

Sistema desarrollado para Professional ICC Calculator basado en estándares IEEE/IEC para visualización de sistemas eléctricos.
