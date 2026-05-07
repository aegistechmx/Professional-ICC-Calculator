/**
 * utils/visualEffects.js - Efectos Visuales Profesionales para Simulación Eléctrica
 * Arcos eléctricos, ondas de choque, sonido y efectos brutales
 */

// === ARCO ELÉCTRICO DINÁMICO ===

export function drawArc(ctx, x1, y1, x2, y2, intensity = 1, time = 0) {
  ctx.save();

  // Color y glow base
  const baseColor = `rgba(0, 229, 255, ${0.8 + intensity * 0.2})`;
  const glowColor = `rgba(0, 229, 255, ${0.6 + intensity * 0.4})`;

  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 2 + intensity * 3;
  ctx.shadowBlur = 20 * intensity;
  ctx.shadowColor = glowColor;

  ctx.beginPath();
  ctx.moveTo(x1, y1);

  // Generar camino zig-zag con ruido
  const segments = 8 + Math.floor(intensity * 4);
  const noiseIntensity = 5 + intensity * 10;

  for (let i = 1; i < segments; i++) {
    const t = i / segments;

    // Posición base interpolada
    const baseX = x1 + (x2 - x1) * t;
    const baseY = y1 + (y2 - y1) * t;

    // Agregar ruido con variación temporal
    const noiseX = Math.sin(time * 0.01 + i) * noiseIntensity;
    const noiseY = Math.cos(time * 0.01 + i * 1.3) * noiseIntensity;

    ctx.lineTo(baseX + noiseX, baseY + noiseY);
  }

  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Efecto de núcleo brillante
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * intensity})`;
  ctx.lineWidth = 1;
  ctx.shadowBlur = 10 * intensity;
  ctx.shadowColor = '#ffffff';

  ctx.beginPath();
  ctx.moveTo(x1, y1);

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const baseX = x1 + (x2 - x1) * t;
    const baseY = y1 + (y2 - y1) * t;

    const noiseX = Math.sin(time * 0.02 + i * 0.5) * noiseIntensity * 0.3;
    const noiseY = Math.cos(time * 0.02 + i * 0.7) * noiseIntensity * 0.3;

    ctx.lineTo(baseX + noiseX, baseY + noiseY);
  }

  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.restore();
}

// === ONDA DE CHOQUE RADIAL (SHOCKWAVE) ===

export class Shockwave {
  constructor(x, y, maxRadius = 200, duration = 2000) {
    this.x = x;
    this.y = y;
    this.maxRadius = maxRadius;
    this.duration = duration;
    this.startTime = performance.now();
    this.active = true;
  }

  draw(ctx, currentTime = performance.now()) {
    if (!this.active) return;

    const elapsed = currentTime - this.startTime;
    const progress = elapsed / this.duration;

    if (progress >= 1) {
      this.active = false;
      return;
    }

    const radius = this.maxRadius * progress;
    const opacity = 1 - progress;

    ctx.save();

    // Onda principal
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 0, 0, ${opacity * 0.8})`;
    ctx.lineWidth = 3 * (1 - progress * 0.5);
    ctx.stroke();

    // Segunda onda (más débil)
    if (progress > 0.2) {
      const innerRadius = radius * 0.7;
      const innerOpacity = (1 - progress) * 0.4;

      ctx.beginPath();
      ctx.arc(this.x, this.y, innerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 100, 0, ${innerOpacity})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Efecto de glow
    ctx.shadowBlur = 20 * opacity;
    ctx.shadowColor = `rgba(255, 0, 0, ${opacity})`;

    ctx.restore();
  }

  isActive() {
    return this.active;
  }
}

// === SISTEMA DE SONIDO ===

export class SoundSystem {
  constructor() {
    this.audioCtx = null;
    this.initialized = false;
    this.sounds = new Map();
  }

  // Inicializar contexto de audio
  init() {
    if (this.initialized) return;

    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('Audio not supported:', error);
      }
    }
  }

  // Sonido de falla (ruido blanco brutal)
  playFaultSound(intensity = 1) {
    if (!this.initialized) return;

    const bufferSize = 2 * this.audioCtx.sampleRate;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generar ruido blanco con filtrado
    for (let i = 0; i < bufferSize; i++) {
      let sample = Math.random() * 2 - 1;

      // Filtrar paso bajo para hacerlo más "grave"
      const filter = 0.98;
      sample = sample * (1 - filter) + (data[i - 1] || 0) * filter;

      // Aplicar envelope
      const envelope = Math.exp(-i / (bufferSize * 0.3));
      data[i] = sample * envelope * intensity * 0.3;
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;

    const gain = this.audioCtx.createGain();
    gain.gain.value = 0.2 * intensity;

    source.connect(gain);
    gain.connect(this.audioCtx.destination);
    source.start();
  }

  // Sonido de disparo de breaker (click metálico)
  playTripSound(pitch = 1) {
    if (!this.initialized) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    // Configurar oscilador
    osc.type = 'square';
    osc.frequency.setValueAtTime(200 * pitch, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100 * pitch, this.audioCtx.currentTime + 0.1);

    // Configurar filtro para sonido metálico
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, this.audioCtx.currentTime);
    filter.Q.setValueAtTime(10, this.audioCtx.currentTime);

    // Configurar envelope
    gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);

    // Conectar todo
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.3);
  }

  // Sonido de arco eléctrico (zapping)
  playArcSound(intensity = 1) {
    if (!this.initialized) return;

    const bufferSize = 0.5 * this.audioCtx.sampleRate;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generar ruido de alta frecuencia
    for (let i = 0; i < bufferSize; i++) {
      const sample = Math.random() * 2 - 1;
      const envelope = Math.exp(-i / (bufferSize * 0.1));
      data[i] = sample * envelope * intensity * 0.1;
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;

    const gain = this.audioCtx.createGain();
    gain.gain.value = 0.1 * intensity;

    source.connect(gain);
    gain.connect(this.audioCtx.destination);
    source.start();
  }

  // Sonido de explosión (bump grave)
  playExplosionSound(intensity = 1) {
    if (!this.initialized) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    // Frecuencia baja para "boom"
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.audioCtx.currentTime + 0.2);

    // Envelope de explosión
    gain.gain.setValueAtTime(0.5 * intensity, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.5);
  }
}

// === EFECTOS DE PARTÍCULAS MEJORADAS ===

export function createArcParticles(x1, y1, x2, y2, intensity = 1) {
  const particles = [];
  const count = Math.floor(5 + intensity * 10);

  for (let i = 0; i < count; i++) {
    const t = Math.random(); // Posición aleatoria en la línea
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;

    // Velocidad radial desde la línea
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.02 + Math.random() * 0.03;

    particles.push({
      id: `arc-${Date.now()}-${i}`,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20 + Math.random() * 20,
      maxLife: 40,
      color: `hsl(${180 + Math.random() * 20}, 100%, 70%)`, // Cyan a azul
      size: 1 + Math.random() * 2,
      type: 'arc',
      glow: true,
      intensity
    });
  }

  return particles;
}

export function createExplosionParticles(x, y, intensity = 1) {
  const particles = [];
  const count = Math.floor(15 + intensity * 20);
  const colors = ['#ff3b30', '#ff9500', '#ffcc00', '#ffffff'];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const speed = 0.03 + Math.random() * 0.07;
    const color = colors[Math.floor(Math.random() * colors.length)];

    particles.push({
      id: `explosion-${Date.now()}-${i}`,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + Math.random() * 30,
      maxLife: 60,
      color,
      size: 2 + Math.random() * 4,
      type: 'explosion',
      gravity: 0.001,
      fade: true,
      intensity
    });
  }

  return particles;
}

// === ACTUALIZACIÓN DE PARTÍCULAS ===

export const updateParticles = (particles) => {
  return particles.filter(particle => {
    particle.life--;

    if (particle.life <= 0) return false;

    // Movimiento
    particle.x += particle.vx;
    particle.y += particle.vy;

    // Gravedad para explosiones
    if (particle.gravity) {
      particle.vy += particle.gravity;
    }

    // Desvanecimiento
    if (particle.fade) {
      particle.opacity = particle.life / particle.maxLife;
    }

    // Fricción
    particle.vx *= 0.98;
    particle.vy *= 0.98;

    return true;
  });
}

// === RENDER DE PARTÍCULAS ===

export function drawParticles(ctx, particles) {
  particles.forEach(particle => {
    ctx.save();

    const opacity = particle.opacity || (particle.life / particle.maxLife);

    ctx.globalAlpha = opacity;
    ctx.fillStyle = particle.color;

    // Glow para partículas especiales
    if (particle.glow) {
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 10 * (particle.intensity || 1);
    }

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

// === EFECTO DE FLICKER (PARA FALLAS INTERMITENTES) ===

export function drawFlickerEffect(ctx, x, y, time, intensity = 1) {
  const flicker = Math.sin(time * 0.05) * 0.5 + 0.5;
  const visible = Math.random() < (0.7 + flicker * 0.3);

  if (!visible) return;

  ctx.save();

  ctx.globalAlpha = flicker * intensity;
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 20 * intensity;
  ctx.shadowColor = '#00e5ff';

  ctx.beginPath();
  ctx.arc(x, y, 5 + flicker * 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// === INICIALIZACIÓN GLOBAL ===

export const soundSystem = new SoundSystem();

// Auto-inicializar al primer uso
export function initAudioSystem() {
  soundSystem.init();
}

export default {
  drawArc,
  Shockwave,
  SoundSystem,
  soundSystem,
  createArcParticles,
  createExplosionParticles,
  updateParticles,
  drawParticles,
  drawFlickerEffect,
  initAudioSystem
};
