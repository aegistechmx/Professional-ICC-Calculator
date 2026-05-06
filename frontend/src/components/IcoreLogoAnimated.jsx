/**
 * IcoreLogoAnimated - Logo animado para ICC
 * Anillo girando + rayo pulsante + modo falla
 */

import { useEffect, useCallback } from 'react';
import './IcoreLogoAnimated.css';

export default function IcoreLogoAnimated({ 
  active = true, 
  faultDetected = false,
  size = 200,
  playSound = false 
}) {
  // Sonido de zap opcional
  const playZap = useCallback(() => {
    if (!playSound) return;
    try {
      const audio = new Audio('/zap.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignorar errores de autoplay
    } catch (e) {
      // Audio no soportado
    }
  }, [playSound]);

  // Reproducir sonido cuando se detecta falla
  useEffect(() => {
    if (faultDetected && playSound) {
      playZap();
    }
  }, [faultDetected, playSound, playZap]);

  const scale = size / 200;

  return (
    <div 
      className={`logo-container ${active ? 'active' : ''} ${faultDetected ? 'fault' : ''}`}
      style={{ width: size, height: size }}
    >
      <svg 
        viewBox="0 0 200 200" 
        className="logo-svg"
        style={{ transform: `scale(${scale})` }}
      >
        <defs>
          {/* Gradiente para el anillo */}
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e90ff" />
            <stop offset="50%" stopColor="#00bfff" />
            <stop offset="100%" stopColor="#1e90ff" />
          </linearGradient>
          
          {/* Gradiente para el rayo */}
          <linearGradient id="boltGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffcc00" />
            <stop offset="50%" stopColor="#ff6600" />
            <stop offset="100%" stopColor="#ffcc00" />
          </linearGradient>
          
          {/* Filtro de glow */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Filtro de glow intenso para falla */}
          <filter id="glowIntense" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Anillo exterior girando */}
        <circle
          cx="100"
          cy="100"
          r="85"
          className="ring-outer"
          stroke="url(#ringGradient)"
          strokeWidth="3"
          fill="none"
        />
        
        {/* Anillo interior girando (sentido contrario) */}
        <circle
          cx="100"
          cy="100"
          r="75"
          className="ring-inner"
          stroke="#00bfff"
          strokeWidth="2"
          fill="none"
          opacity="0.6"
        />

        {/* Arcos de conexión (estilo eléctrico) */}
        <path
          d="M 100 15 A 85 85 0 0 1 185 100"
          className="arc-top"
          stroke="#1e90ff"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        />
        <path
          d="M 100 185 A 85 85 0 0 1 15 100"
          className="arc-bottom"
          stroke="#1e90ff"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        />

        {/* Circuito vertical */}
        <line 
          x1="100" 
          y1="40" 
          x2="100" 
          y2="160" 
          className="circuit-vertical"
          stroke="#00bfff"
          strokeWidth="3"
        />
        
        {/* Circuito horizontal */}
        <line 
          x1="60" 
          y1="100" 
          x2="140" 
          y2="100" 
          className="circuit-horizontal"
          stroke="#00bfff"
          strokeWidth="3"
        />

        {/* Nodos de conexión */}
        <circle cx="100" cy="100" r="8" className="node-center" fill="#00bfff" />
        <circle cx="100" cy="40" r="5" className="node-top" fill="#1e90ff" />
        <circle cx="100" cy="160" r="5" className="node-bottom" fill="#1e90ff" />
        <circle cx="60" cy="100" r="5" className="node-left" fill="#1e90ff" />
        <circle cx="140" cy="100" r="5" className="node-right" fill="#1e90ff" />

        {/* Rayo central */}
        <polygon
          points="105,45 95,95 115,95 85,155"
          className="bolt"
          fill="url(#boltGradient)"
          filter={faultDetected ? "url(#glowIntense)" : "url(#glow)"}
        />
        
        {/* Chispas alrededor del rayo (solo en modo falla) */}
        {faultDetected && (
          <g className="sparks">
            <circle cx="70" cy="70" r="2" fill="#ffcc00" className="spark-1" />
            <circle cx="130" cy="70" r="2" fill="#ffcc00" className="spark-2" />
            <circle cx="70" cy="130" r="2" fill="#ffcc00" className="spark-3" />
            <circle cx="130" cy="130" r="2" fill="#ffcc00" className="spark-4" />
            <circle cx="50" cy="100" r="1.5" fill="#ff6600" className="spark-5" />
            <circle cx="150" cy="100" r="1.5" fill="#ff6600" className="spark-6" />
          </g>
        )}

        {/* Texto ICORE */}
        <text 
          x="100" 
          y="175" 
          textAnchor="middle" 
          className="text-icore"
          fill="#00bfff"
          fontSize="16"
          fontWeight="bold"
          fontFamily="Segoe UI, Roboto, sans-serif"
        >
          ICORE
        </text>
        
        {/* Texto ICC */}
        <text 
          x="100" 
          y="192" 
          textAnchor="middle" 
          className="text-icc"
          fill="#ffcc00"
          fontSize="12"
          fontFamily="Segoe UI, Roboto, sans-serif"
          opacity="0.9"
        >
          ICC CALCULATOR
        </text>
      </svg>
    </div>
  );
}
