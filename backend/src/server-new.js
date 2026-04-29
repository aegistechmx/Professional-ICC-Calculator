/**
 * Backend Server - Express API
 * Puerto: 3001
 * Incluye todas las rutas de la API
 */

const app = require('./app')

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log('✅ Backend API corriendo en http://localhost:' + PORT)
  // eslint-disable-next-line no-console
  console.log('📡 Rutas disponibles:')
  // eslint-disable-next-line no-console
  console.log('   POST /powerflow/run    - Análisis de flujo de potencia')
  // eslint-disable-next-line no-console
  console.log('   POST /simulacion/calcular - Cálculo de cortocircuito')
  // eslint-disable-next-line no-console
  console.log('   POST /proteccion/seleccionar - Selección de protecciones')
  // eslint-disable-next-line no-console
  console.log('   GET  /icc              - Test simple de ICC')
})
