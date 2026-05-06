/**
 * ICCModule - Componente para incrustar el módulo cortocircuito HTML existente
 * Usa iframe con comunicación postMessage bidireccional
 */

import { useEffect, useRef, useCallback } from 'react';
import { forwardRef, useImperativeHandle } from 'react';

const ICCModule = forwardRef(function ICCModuleInternal({
  systemModel,
  onResults,
  onReady,
  onRefresh,
  onExport,
  className = ''
}, ref) {
  const iframeRef = useRef(null);
  const isReadyRef = useRef(false);

  // Origen seguro para postMessage
  const TARGET_ORIGIN = import.meta.env.PROD
    ? window.location.origin
    : '*'; // En desarrollo permitir todos los orígenes

  // Enviar datos al iframe cuando esté listo
  useEffect(() => {
    if (!iframeRef.current || !isReadyRef.current || !systemModel) return;

    iframeRef.current.contentWindow?.postMessage({
      type: 'LOAD_MODEL',
      data: systemModel
    }, TARGET_ORIGIN);
  }, [systemModel, TARGET_ORIGIN]);

  // Escuchar mensajes del iframe
  useEffect(() => {
    const handleMessage = (event) => {
      // Validar origen
      if (event.origin !== window.location.origin) return;

      // Ignorar mensajes sin datos
      if (!event.data || typeof event.data !== 'object') return;

      const { type, data } = event.data;

      // Ignorar mensajes sin tipo o de extensiones del navegador
      if (!type || typeof type !== 'string') return;
      if (type.startsWith('Pass') || type === 'webpackOk') return;

      switch (type) {
        case 'ICC_READY':
          console.log('ICC Module ready:', data);
          onReady?.(data);
          break;

        case 'RESULTS':
          console.log('ICC Results received:', data);
          onResults?.(data);
          break;

        case 'ICC_RESULTS':
          console.log('ICC Results from HTML module:', data);
          onResults?.(data);
          break;

        case 'MODEL_LOADED':
          console.log('ICC Model loaded:', data);
          break;

        case 'EXPORT_REQUEST':
          console.log('Export request from ICC:', data);
          onExport?.(data);
          break;

        case 'MODULE_REFRESHED':
          console.log('ICC Module refreshed:', data);
          onRefresh?.(data);
          break;

        case 'NAVIGATION_ATTEMPT':
          console.log('Navigation attempt in ICC:', data);
          // Prevenir navegación fuera del iframe
          event.preventDefault();
          break;

        case 'ERROR':
          console.error('ICC Module error:', data);
          break;

        default:
          // Solo loguear tipos que parecen relevantes (ignorar extensiones, etc.)
          if (!type.startsWith('webpack') && !type.startsWith('vite')) {
            console.log('ICC Module: Unknown message type:', type);
          }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onReady, onResults, onRefresh, onExport]);

  // Función para enviar comandos manualmente
  const sendCommand = useCallback((command, data) => {
    if (!iframeRef.current || !isReadyRef.current) {
      console.warn('ICC Module not ready');
      return;
    }

    iframeRef.current.contentWindow?.postMessage({
      type: command,
      data: data
    }, TARGET_ORIGIN);
  }, [TARGET_ORIGIN]);

  // Exponer métodos al componente padre
  useImperativeHandle(ref, () => ({
    sendCommand,
    refresh: () => sendCommand('RESET'),
    calculate: () => sendCommand('CALCULATE'),
    isReady: () => isReadyRef.current
  }), [sendCommand]);

  return (
    <div className={`icc-module-container ${className}`}>
      <iframe
        ref={iframeRef}
        src="/cortocircuito/index.html"
        title="ICC Calculation Module"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: 'transparent'
        }}
        onLoad={() => {
          console.log('ICC Module iframe loaded');
          isReadyRef.current = true;
        }}
      />
    </div>
  );
});

// Nombre para debugging
ICCModule.displayName = 'ICCModule';

export default ICCModule;
