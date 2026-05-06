/**
 * components/particles/ParticleRenderer.js
 * Sistema de renderizado de partículas en Canvas
 * Maneja la visualización con efectos profesionales
 */

export class ParticleRenderer {
  /**
   * @param {HTMLCanvasElement} canvas - Elemento canvas
   * @param {Object} options - Opciones de renderizado
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = {
      enableGlow: options.enableGlow !== false,
      enableTrails: options.enableTrails !== false,
      glowIntensity: options.glowIntensity || 10,
      trailOpacity: options.trailOpacity || 0.3,
      backgroundColor: options.backgroundColor || 'rgba(0, 0, 0, 0)',
      ...options
    };

    if (!this.ctx) return;

    this.resize();
    this.setupCanvas();
  }

  /**
   * Configurar canvas para alta calidad
   */
  setupCanvas() {
    if (!this.ctx) return;
    // Habilitar suavizado
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Configurar blending para efectos de glow
    this.ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Redimensionar canvas
   */
  resize() {
    if (!this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  /**
   * Limpiar canvas
   */
  clear() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Aplicar fondo si está configurado
    if (this.options.backgroundColor !== 'transparent') {
      this.ctx.fillStyle = this.options.backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Renderizar todas las partículas
   * @param {Array} particles - Array de partículas
   */
  render(particles) {
    if (!this.ctx) return;

    try {
      this.clear();

      if (particles.length === 0) return;

      // Renderizar trails primero (detrás de las partículas)
      if (this.options.enableTrails) {
        this.renderTrails(particles);
      }

      // Renderizar partículas principales
      this.renderParticles(particles);

      // Efectos adicionales
      if (this.options.enableGlow) {
        this.applyGlowEffect(particles);
      }
    } catch (e) {
      return;
    }
  }

  /**
   * Renderizar partículas individuales
   * @param {Array} particles - Array de partículas
   */
  renderParticles(particles) {
    if (!this.ctx) return;
    particles.forEach(particle => {
      try {
        const pos = particle.getPosition?.();
        const radius = particle.getRadius?.();

        if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;
        if (!Number.isFinite(radius) || radius <= 0) return;

        // Configurar estilo
        this.ctx.save();

        // Aplicar glow si está habilitado
        if (this.options.enableGlow) {
          this.ctx.shadowBlur = this.options.glowIntensity;
          this.ctx.shadowColor = particle.color;
        }

        // Dibujar partícula principal
        this.drawParticle(pos.x, pos.y, radius, particle.color, particle);

        this.ctx.restore();
      } catch (e) {
        try {
          this.ctx.restore();
        } catch (restoreError) {
          // ignore
        }
      }
    });
  }

  /**
   * Dibujar partícula individual
   * @param {number} x - Posición X
   * @param {number} y - Posición Y
   * @param {number} radius - Radio
   * @param {string} color - Color
   * @param {Object} particle - Objeto partícula para efectos adicionales
   */
  drawParticle(x, y, radius, color, particle) {
    if (!this.ctx) return;
    // Partícula base
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();

    // Efecto de brillo central para partículas de alta intensidad
    if (particle.intensity > 5000) {
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.ctx.beginPath();
      this.ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }

    // Efecto especial para partículas disparadas
    if (particle.tripped) {
      this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  /**
   * Renderizar trails de partículas
   * @param {Array} particles - Array de partículas
   */
  renderTrails(particles) {
    if (!this.ctx) return;
    particles.forEach(particle => {
      if (!particle?.trail || particle.trail.length < 2) return;

      this.ctx.save();
      this.ctx.globalAlpha = this.options.trailOpacity;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      // Dibujar trail
      this.ctx.beginPath();
      particle.trail.forEach((point, index) => {
        if (index === 0) {
          this.ctx.moveTo(point.x, point.y);
        } else {
          this.ctx.lineTo(point.x, point.y);
        }
      });

      // Gradiente para el trail
      const gradient = this.ctx.createLinearGradient(
        particle.trail[0].x, particle.trail[0].y,
        particle.trail[particle.trail.length - 1].x, particle.trail[particle.trail.length - 1].y
      );

      const baseColor = particle.color.replace(/[\d.]+\)$/, '0)');
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(1, particle.color);

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = particle.getRadius() * 0.5;
      this.ctx.stroke();

      this.ctx.restore();
    });
  }

  /**
   * Aplicar efecto de glow global
   * @param {Array} particles - Array de partículas
   */
  applyGlowEffect(particles) {
    if (!this.ctx) return;
    // Efecto de glow ambiental para partículas de alta intensidad
    const highIntensityParticles = particles.filter(p => p.intensity > 10000);

    if (highIntensityParticles.length > 0) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'screen';
      this.ctx.globalAlpha = 0.1;

      highIntensityParticles.forEach(particle => {
        const pos = particle.getPosition();
        const glowRadius = particle.getRadius() * 4;

        const gradient = this.ctx.createRadialGradient(
          pos.x, pos.y, 0,
          pos.x, pos.y, glowRadius
        );

        gradient.addColorStop(0, particle.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
          pos.x - glowRadius,
          pos.y - glowRadius,
          glowRadius * 2,
          glowRadius * 2
        );
      });

      this.ctx.restore();
    }
  }

  /**
   * Renderizar efectos de breaker disparado
   * @param {Array} breakerPositions - Posiciones de breakers disparados
   */
  renderBreakerEffects(breakerPositions) {
    breakerPositions.forEach(pos => {
      this.ctx.save();

      // Efecto de onda expansiva
      const time = Date.now() / 1000;
      const pulseRadius = 20 + Math.sin(time * 3) * 5;

      this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);

      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, pulseRadius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Centro brillante
      this.ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    });
  }

  /**
   * Renderizar información de depuración
   * @param {Object} stats - Estadísticas del sistema
   */
  renderDebugInfo(stats) {
    if (!this.options.debug) return;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`Partículas: ${stats.totalParticles}`, 10, 20);
    this.ctx.fillText(`Fallas activas: ${stats.activeFaults}`, 10, 35);
    this.ctx.fillText(`Breakers disparados: ${stats.trippedBreakers}`, 10, 50);
    this.ctx.restore();
  }

  /**
   * Crear snapshot del canvas actual
   * @returns {ImageBitmap} Snapshot del canvas
   */
  async createSnapshot() {
    return await createImageBitmap(this.canvas);
  }

  /**
   * Exportar canvas como imagen
   * @param {string} format - Formato de imagen ('png', 'jpeg')
   * @param {number} quality - Calidad (0-1)
   * @returns {string} Data URL de la imagen
   */
  exportImage(format = 'png', quality = 0.9) {
    return this.canvas.toDataURL(`image/${format}`, quality);
  }

  /**
   * Actualizar opciones de renderizado
   * @param {Object} newOptions - Nuevas opciones
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Destruir renderer
   */
  destroy() {
    // Limpiar canvas
    this.clear();

    // Remover event listeners si existen
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }
}
