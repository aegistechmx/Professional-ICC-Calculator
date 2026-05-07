import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook para comunicación bidireccional con iframe
 * @param {string} iframeSrc - URL del iframe
 * @param {Object} options - Opciones de configuración
 * @returns {Object} { iframeRef, isReady, sendMessage, lastMessage, error }
 */
export function useIframeCommunication(iframeSrc, options = {}) {
  const {
    onMessage = null,
    onReady = null,
    onError = null,
    targetOrigin = '*'
  } = options;

  const iframeRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const pendingMessagesRef = useRef([]);

  // Enviar mensaje al iframe
  const sendMessage = useCallback((type, data) => {
    const message = { type, data, timestamp: Date.now() };

    if (!iframeRef.current?.contentWindow) {
      // Guardar para enviar cuando esté listo
      pendingMessagesRef.current.push(message);
      return false;
    }

    try {
      iframeRef.current.contentWindow.postMessage(message, targetOrigin);
      return true;
    } catch (err) {
      setError(err.message);
      onError?.(err);
      return false;
    }
  }, [targetOrigin, onError]);

  // Procesar mensajes pendientes cuando el iframe esté listo
  useEffect(() => {
    if (isReady && pendingMessagesRef.current.length > 0) {
      pendingMessagesRef.current.forEach(msg => {
        iframeRef.current?.contentWindow?.postMessage(msg, targetOrigin);
      });
      pendingMessagesRef.current = [];
    }
  }, [isReady, targetOrigin]);

  // Escuchar mensajes del iframe
  useEffect(() => {
    const handleMessage = (event) => {
      // Validación de origen (opcional)
      if (targetOrigin !== '*' && event.origin !== targetOrigin) {
        return;
      }

      const { type, data } = event.data;

      setLastMessage({ type, data, receivedAt: Date.now() });

      switch (type) {
        case 'ICC_READY':
        case 'READY':
          setIsReady(true);
          setError(null);
          onReady?.();
          break;

        case 'ERROR':
          setError(data?.message || 'Unknown error');
          onError?.(data);
          break;

        default:
          onMessage?.(event.data);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onMessage, onReady, onError, targetOrigin]);

  // Detectar cuando el iframe se carga
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      // El iframe cargó, pero necesitamos esperar el mensaje READY
    };

    const handleError = () => {
      setError('Failed to load ICC module');
      onError?.({ message: 'Failed to load ICC module' });
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, [onError]);

  return {
    iframeRef,
    isReady,
    sendMessage,
    lastMessage,
    error
  };
}
