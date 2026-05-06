/**
 * components/particles/Particle.js
 * Partícula individual para animación de corriente eléctrica
 * Representa el flujo de corriente a lo largo de un camino
 */

export class Particle {
  /**
   * @param {Array} path - Array de puntos [{x, y}] del camino
   * @param {number} speed - Velocidad de movimiento (0-1)
   * @param {number} intensity - Intensidad de corriente (Icc)
   * @param {Object} options - Opciones adicionales
   */
  constructor(path, speed, intensity, options = {}) {
    this.path = path;
    this.t = 0; // Progreso 0 -> 1
    this.speed = speed;
    this.intensity = intensity;
    this.color = options.color || this.getDefaultColor(intensity);
    this.tripped = options.tripped || false;
    this.trail = [];
    this.maxTrailLength = options.trailLength || 5;
    this.turbulence = options.turbulence || 0;
    this.alive = true;
    this.createdAt = Date.now();
    this.lifespan = options.lifespan || 5000; // ms
  }

  /**
   * Obtener color por defecto basado en intensidad
   * @param {number} intensity - Intensidad de corriente
   * @returns {string} Color en formato RGBA
   */
  getDefaultColor(intensity) {
    // Colores energéticos basados en intensidad
    if (intensity > 10000) return 'rgba(255, 255, 0, 0.9)'; // Amarillo brillante
    if (intensity > 5000) return 'rgba(255, 150, 0, 0.8)'; // Naranja
    if (intensity > 2000) return 'rgba(255, 80, 0, 0.8)'; // Naranja-rojo
    return 'rgba(255, 50, 50, 0.7)'; // Rojo
  }

  /**
   * Actualizar posición de la partícula
   * @param {number} dt - Delta time en segundos
   */
  update(dt) {
    if (!this.alive) return;

    // Aplicar límite de velocidad máxima
    const maxSpeed = 1.5;
    const actualSpeed = Math.min(this.speed, maxSpeed);

    this.t += actualSpeed * dt;

    // Verificar si completó el camino
    if (this.t >= 1) {
      this.alive = false;
      return;
    }

    // Actualizar trail
    const currentPos = this.getPosition();
    this.trail.push({ ...currentPos, time: Date.now(), velocity: actualSpeed });

    // Limitar longitud del trail
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    // Verificar lifespan
    if (Date.now() - this.createdAt > this.lifespan) {
      this.alive = false;
    }
  }

  /**
   * Verificar si la partícula está activa
   * @returns {boolean} True si está viva
   */
  isAlive() {
    return this.alive && this.t < 1;
  }

  /**
   * Obtener posición actual interpolada
   * @returns {Object} Posición {x, y}
   */
  getPosition() {
    if (this.path.length < 2) {
      return this.path[0] || { x: 0, y: 0 };
    }

    const total = this.path.length - 1;
    const idx = Math.floor(this.t * total);
    const next = Math.min(idx + 1, total);

    const p1 = this.path[idx];
    const p2 = this.path[next];

    const localT = (this.t * total) - idx;

    // Interpolación lineal
    const x = p1.x + (p2.x - p1.x) * localT;
    const y = p1.y + (p2.y - p1.y) * localT;

    // Añadir turbulencia si está configurada
    if (this.turbulence > 0) {
      const turbulenceX = (Math.random() - 0.5) * this.turbulence;
      const turbulenceY = (Math.random() - 0.5) * this.turbulence;
      return { x: x + turbulenceX, y: y + turbulenceY };
    }

    return { x, y };
  }

  /**
   * Obtener radio basado en intensidad
   * @returns {number} Radio de la partícula
   */
  getRadius() {
    // Radio proporcional al logaritmo de la intensidad
    const baseRadius = 2;
    const intensityFactor = Math.log10(Math.max(1, this.intensity)) * 0.5;
    return Math.min(8, baseRadius + intensityFactor);
  }

  /**
   * Actualizar color cuando un breaker dispara
   * @param {boolean} tripped - Si el breaker ha disparado
   */
  setTripped(tripped) {
    this.tripped = tripped;
    if (tripped) {
      this.color = 'rgba(59, 130, 246, 0.8)'; // Azul para disparado
      this.speed *= 0.3; // Reducir velocidad drásticamente
    }
  }

  /**
   * Limpiar trail antiguo
   */
  cleanupTrail() {
    const now = Date.now();
    const maxAge = 200; // ms
    this.trail = this.trail.filter(point => now - point.time < maxAge);
  }
}
