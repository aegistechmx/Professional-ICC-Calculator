import axios from 'axios'

// Simple logger for frontend
const isDev = import.meta.env.DEV
const logger = {
  info: (message, ...args) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(`[INFO] ${message}`, ...args)
    }
  },
  warn: (message, ...args) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}`, ...args)
    }
  },
  error: (message, ...args) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`, ...args)
    }
  },
}

/**
 * API Client Centralizado
 * Configuración única para todas las llamadas al backend
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// Crear instancia axios con configuración base
export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor de REQUEST (antes de enviar)
api.interceptors.request.use(
  config => {
    // Log útil para debugging
    logger.info(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  error => {
    logger.error('❌ API Request Error:', error.message)
    return Promise.reject(error)
  }
)

// Interceptor de RESPONSE (cuando llega respuesta)
api.interceptors.response.use(
  response => {
    // Validar que sea JSON
    const contentType = response.headers['content-type']
    if (!contentType || !contentType.includes('application/json')) {
      logger.warn('⚠️ Response no es JSON:', contentType)
    }
    logger.info(
      '✅ API Success:',
      response.config.method?.toUpperCase(),
      response.config.url
    )
    return response
  },
  error => {
    // Manejo elegante de errores
    if (error.response) {
      // El servidor respondió con error HTTP
      const { status, data } = error.response

      if (status === 404) {
        logger.error(`❌ Endpoint no encontrado: ${error.config?.url}`)
      } else if (status >= 500) {
        logger.error(
          `❌ Error del servidor (${status}):`,
          data?.error || data?.message || 'Error desconocido'
        )
      }

      // Extraer mensaje de error del backend si existe
      const errorMessage = data?.error || data?.message || `HTTP ${status}`
      return Promise.reject(new Error(errorMessage))
    } else if (error.request) {
      // No hubo respuesta (servidor caído, CORS, etc)
      logger.error(
        '❌ No se pudo conectar al servidor. ¿Está el backend corriendo en puerto 3001?'
      )
      return Promise.reject(
        new Error(
          'No se pudo conectar al servidor. Verifica que el backend esté corriendo.'
        )
      )
    } else {
      // Error de configuración
      logger.error('❌ Error de red o conexión:', error.message)
      return Promise.reject(error)
    }
  }
)

/**
 * Helper para hacer fetch con validación de content-type
 * Útil cuando necesitas usar fetch nativo en lugar de axios
 */
export async function safeFetch(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  // Validar content-type ANTES de hacer .json()
  const contentType = response.headers.get('content-type')

  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text()
    logger.error('❌ Expected JSON, got:', contentType)
    logger.info('🔍 API Response preview:', text.substring(0, 200))
    throw new Error(
      `Expected JSON from ${fullUrl}, got ${contentType || 'unknown'}. Is the backend running on port 3001?`
    )
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export default api
