/**
 * components/particles/ProEffects.js
 * Efectos profesionales avanzados para partículas
 * Trail system, glow effects, turbulence y más
 */

export class ProEffects {
  /**
   * @param {Object} options - Opciones de configuración
   */
  constructor(options = {}) {
    this.options = {
      trailLength: options.trailLength || 8,
      glowIntensity: options.glowIntensity || 15,
      turbulenceAmount: options.turbulenceAmount || 1.5,
      enableGlow: options.enableGlow !== false,
      enableTrails: options.enableTrails !== false,
      enableTurbulence: options.enableTurbulence !== false,
      enablePulse: options.enablePulse !== false,
      enableColorShift: options.enableColorShift !== false,
      ...options
    };
    
    this.time = 0;
    this.colorPalette = this.generateColorPalette();
  }

  /**
   * Generar paleta de colores energéticos
   * @returns {Array} Paleta de colores
   */
  generateColorPalette() {
    return [
      { intensity: 0, color: 'rgba(255, 50, 50, 0.7)' },    // Rojo bajo
      { intensity: 2000, color: 'rgba(255, 80, 0, 0.8)' },  // Naranja-rojo
      { intensity: 5000, color: 'rgba(255, 150, 0, 0.8)' }, // Naranja
      { intensity: 10000, color: 'rgba(255, 200, 0, 0.9)' }, // Amarillo
      { intensity: 15000, color: 'rgba(255, 255, 100, 0.9)' }, // Amarillo brillante
      { intensity: 20000, color: 'rgba(255, 255, 255, 1.0)' } // Blanco brillante
    ];
  }

  /**
   * Obtener color basado en intensidad con interpolación
   * @param {number} intensity - Intensidad de corriente
   * @param {number} time - Tiempo para animación
   * @returns {string} Color interpolado
   */
  getColor(intensity, time = 0) {
    if (this.options.enableColorShift) {
      // Añadir variación de color basada en tiempo
      intensity += Math.sin(time * 2) * 500;
    }

    for (let i = 0; i < this.colorPalette.length - 1; i++) {
      const current = this.colorPalette[i];
      const next = this.colorPalette[i + 1];

      if (intensity >= current.intensity && intensity <= next.intensity) {
        return this.interpolateColor(current.color, next.color, 
          (intensity - current.intensity) / (next.intensity - current.intensity));
      }
    }

    return this.colorPalette[this.colorPalette.length - 1].color;
  }

  /**
   * Interpolar entre dos colores
   * @param {string} color1 - Color inicial
   * @param {string} color2 - Color final
   * @param {number} factor - Factor de interpolación (0-1)
   * @returns {string} Color interpolado
   */
  interpolateColor(color1, color2, factor) {
    const parseColor = (color) => {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      return match ? {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: parseFloat(match[4])
      } : null;
    };

    const c1 = parseColor(color1);
    const c2 = parseColor(color2);

    if (!c1 || !c2) return color1;

    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
    const a = c1.a + (c2.a - c1.a) * factor;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  /**
   * Aplicar efecto de trail a partícula
   * @param {Object} particle - Partícula
   * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
   */
  applyTrailEffect(particle, ctx) {
    if (!this.options.enableTrails || particle.trail.length < 2) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Dibujar trail con degradado
    for (let i = 1; i < particle.trail.length; i++) {
      const point = particle.trail[i];
      const prevPoint = particle.trail[i - 1];
      
      const progress = i / particle.trail.length;
      const opacity = progress * 0.3;
      const width = particle.getRadius() * progress * 0.8;

      ctx.strokeStyle = particle.color.replace(/[\d.]+\)$/, `${opacity})`);
      ctx.lineWidth = width;
      
      ctx.beginPath();
      ctx.moveTo(prevPoint.x, prevPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Aplicar efecto de glow
   * @param {Object} particle - Partícula
   * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
   * @param {number} time - Tiempo actual
   */
  applyGlowEffect(particle, ctx, time) {
    if (!this.options.enableGlow) return;

    const pos = particle.getPosition();
    const radius = particle.getRadius();
    const glowRadius = radius * (2 + Math.sin(time * 3) * 0.3);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Glow exterior
    const gradient = ctx.createRadialGradient(
      pos.x, pos.y, radius,
      pos.x, pos.y, glowRadius
    );

    const baseColor = particle.color.replace(/[\d.]+\)$/, '');
    gradient.addColorStop(0, `${baseColor} 0.8)`);
    gradient.addColorStop(0.5, `${baseColor} 0.3)`);
    gradient.addColorStop(1, `${baseColor} 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(pos.x - glowRadius, pos.y - glowRadius, glowRadius * 2, glowRadius * 2);

    // Glow central para alta intensidad
    if (particle.intensity > 10000) {
      const coreGradient = ctx.createRadialGradient(
        pos.x, pos.y, 0,
        pos.x, pos.y, radius * 0.5
      );
      
      coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      coreGradient.addColorStop(0.5, particle.color);
      coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Aplicar efecto de turbulencia
   * @param {Object} particle - Partícula
   * @param {number} time - Tiempo actual
   */
  applyTurbulence(particle, time) {
    if (!this.options.enableTurbulence) return;

    const turbulenceX = Math.sin(time * 5 + particle.intensity * 0.001) * this.options.turbulenceAmount;
    const turbulenceY = Math.cos(time * 7 + particle.intensity * 0.001) * this.options.turbulenceAmount;

    particle.turbulenceX = turbulenceX;
    particle.turbulenceY = turbulenceY;
  }

  /**
   * Aplicar efecto de pulso
   * @param {Object} particle - Partícula
   * @param {number} time - Tiempo actual
   * @returns {number} Factor de escala
   */
  applyPulseEffect(particle, time) {
    if (!this.options.enablePulse) return 1;

    const pulseFrequency = 2 + particle.intensity * 0.0001; // Frecuencia basada en intensidad
    const pulseIntensity = 0.2 + particle.intensity * 0.00001; // Intensidad basada en corriente
    
    return 1 + Math.sin(time * pulseFrequency) * pulseIntensity;
  }

  /**
   * Renderizar partícula con todos los efectos profesionales
   * @param {Object} particle - Partícula
   * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
   * @param {number} time - Tiempo actual
   */
  renderParticleWithEffects(particle, ctx, time) {
    // Actualizar efectos basados en tiempo
    this.applyTurbulence(particle, time);
    const pulseScale = this.applyPulseEffect(particle, time);

    // Aplicar trail (detrás de la partícula)
    this.applyTrailEffect(particle, ctx);

    // Aplicar glow (detrás de la partícula)
    this.applyGlowEffect(particle, ctx, time);

    // Renderizar partícula principal con efectos
    const pos = particle.getPosition();
    const radius = particle.getRadius() * pulseScale;

    ctx.save();

    // Aplicar turbulencia a la posición
    const finalX = pos.x + (particle.turbulenceX || 0);
    const finalY = pos.y + (particle.turbulenceY || 0);

    // Sombra para efecto de profundidad
    if (particle.intensity > 5000) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = particle.color;
    }

    // Partícula principal con gradiente
    const gradient = ctx.createRadialGradient(
      finalX - radius * 0.3, finalY - radius * 0.3, 0,
      finalX, finalY, radius
    );

    const color = this.getColor(particle.intensity, time);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(1, this.interpolateColor(color, 'rgba(0, 0, 0, 0.3)', 0.5));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(finalX, finalY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Efecto de borde para partículas disparadas
    if (particle.tripped) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(finalX, finalY, radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  /**
   * Crear efecto de arco eléctrico entre partículas cercanas
   * @param {Array} particles - Array de partículas
   * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
   * @param {number} time - Tiempo actual
   */
  renderElectricArcs(particles, ctx, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = 'rgba(200, 200, 255, 0.3)';
    ctx.lineWidth = 1;

    // Conectar partículas cercanas de alta intensidad
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];

        if (p1.intensity < 10000 || p2.intensity < 10000) continue;

        const pos1 = p1.getPosition();
        const pos2 = p2.getPosition();
        const distance = Math.sqrt(
          Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2)
        );

        if (distance < 50) {
          const opacity = (1 - distance / 50) * 0.3;
          ctx.strokeStyle = `rgba(200, 200, 255, ${opacity})`;
          
          ctx.beginPath();
          ctx.moveTo(pos1.x, pos1.y);
          
          // Línea con ligera curva para efecto de arco
          const midX = (pos1.x + pos2.x) / 2 + Math.sin(time * 10) * 5;
          const midY = (pos1.y + pos2.y) / 2 + Math.cos(time * 10) * 5;
          ctx.quadraticCurveTo(midX, midY, pos2.x, pos2.y);
          
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  /**
   * Actualizar tiempo para animaciones
   * @param {number} dt - Delta time
   */
  updateTime(dt) {
    this.time += dt;
  }

  /**
   * Actualizar opciones
   * @param {Object} newOptions - Nuevas opciones
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }
}
