/**
 * ICCModule - Componente para incrustar el módulo cortocircuito HTML existente
 * Usa iframe con comunicación postMessage bidireccional
 */

import { useEffect, useRef, useCallback } from 'react'
import { forwardRef, useImperativeHandle } from 'react'
import PropTypes from 'prop-types'
import { logDebug, logError, logWarn } from '../utils/logger.js'

const ICCModule = forwardRef(function ICCModuleInternal(
  { systemModel, onResults, onReady, onRefresh, onExport, className = '' },
  ref
) {
  const iframeRef = useRef(null)
  const isReadyRef = useRef(false)
  const pendingCommandsRef = useRef([])

  // Origen seguro para postMessage
  const moduleUrl =
    import.meta.env.VITE_ICC_STANDALONE_URL ||
    (import.meta.env.PROD ? '/cortocircuito/index.html' : 'http://localhost:3002')
  const targetOrigin = moduleUrl.startsWith('http')
    ? new URL(moduleUrl).origin
    : window.location.origin
  const postMessageOrigin = import.meta.env.PROD ? targetOrigin : '*'

  const flushPendingCommands = useCallback(() => {
    if (!iframeRef.current || !isReadyRef.current) return

    const queuedCommands = pendingCommandsRef.current.splice(0)
    queuedCommands.forEach(({ command, data }) => {
      iframeRef.current.contentWindow?.postMessage(
        { type: command, data },
        postMessageOrigin
      )
    })
  }, [postMessageOrigin])

  // Enviar datos al iframe cuando esté listo
  useEffect(() => {
    if (!iframeRef.current || !isReadyRef.current || !systemModel) return

    iframeRef.current.contentWindow?.postMessage(
      {
        type: 'LOAD_MODEL',
        data: systemModel,
      },
      postMessageOrigin
    )
  }, [systemModel, postMessageOrigin])

  // Escuchar mensajes del iframe
  useEffect(() => {
    const handleMessage = event => {
      // Validar origen
      if (event.origin !== window.location.origin && event.origin !== targetOrigin) {
        return
      }

      // Ignorar mensajes sin datos
      if (!event.data || typeof event.data !== 'object') return

      const { type, data } = event.data

      // Ignorar mensajes sin tipo o de extensiones del navegador
      if (!type || typeof type !== 'string') return
      if (type.startsWith('Pass') || type === 'webpackOk') return

      switch (type) {
        case 'ICC_READY':
          logDebug('ICC Module ready:', data)
          isReadyRef.current = true
          onReady?.(data)
          flushPendingCommands()
          break

        case 'RESULTS':
          logDebug('ICC Results received:', data)
          onResults?.(data)
          break

        case 'ICC_RESULTS':
          logDebug('ICC Results from HTML module:', data)
          onResults?.(data)
          break

        case 'MODEL_LOADED':
          logDebug('ICC Model loaded:', data)
          break

        case 'EXPORT_REQUEST':
          logDebug('Export request from ICC:', data)
          onExport?.(data)
          break

        case 'MODULE_REFRESHED':
          logDebug('ICC Module refreshed:', data)
          onRefresh?.(data)
          break

        case 'NAVIGATION_ATTEMPT':
          logDebug('Navigation attempt in ICC:', data)
          // Prevenir navegación fuera del iframe
          event.preventDefault()
          break

        case 'ERROR':
          logError('ICC Module error:', data)
          break

        default:
          // Solo loguear tipos que parecen relevantes (ignorar extensiones, etc.)
          if (!type.startsWith('webpack') && !type.startsWith('vite')) {
            logDebug('ICC Module: Unknown message type:', type)
          }
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [
    onReady,
    onResults,
    onRefresh,
    onExport,
    flushPendingCommands,
    targetOrigin,
  ])

  // Función para enviar comandos manualmente
  const sendCommand = useCallback(
    (command, data) => {
      if (!iframeRef.current) {
        logWarn('ICC Module iframe not mounted')
        return false
      }

      if (!isReadyRef.current) {
        pendingCommandsRef.current.push({ command, data })
        logWarn(`ICC Module not ready; queued command: ${command}`)
        return true
      }

      iframeRef.current.contentWindow?.postMessage(
        {
          type: command,
          data: data,
        },
        postMessageOrigin
      )
      return true
    },
    [postMessageOrigin]
  )

  // Exponer métodos al componente padre
  useImperativeHandle(
    ref,
    () => ({
      sendCommand,
      refresh: () => sendCommand('RESET'),
      calculate: data => sendCommand('CALCULATE', data),
      isReady: () => isReadyRef.current,
    }),
    [sendCommand]
  )

  return (
    <div className={`icc-module-container ${className}`}>
      <iframe
        ref={iframeRef}
        src={moduleUrl}
        title="ICC Calculation Module"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: 'transparent',
        }}
        onLoad={() => {
          logDebug('ICC Module iframe loaded')
          isReadyRef.current = true
          onReady?.({ source: 'iframe-onload', timestamp: new Date().toISOString() })
          flushPendingCommands()
        }}
      />
    </div>
  )
})

// Nombre para debugging
ICCModule.displayName = 'ICCModule'

ICCModule.propTypes = {
  systemModel: PropTypes.object,
  onResults: PropTypes.func,
  onReady: PropTypes.func,
  onRefresh: PropTypes.func,
  onExport: PropTypes.func,
  className: PropTypes.string,
}

export default ICCModule
