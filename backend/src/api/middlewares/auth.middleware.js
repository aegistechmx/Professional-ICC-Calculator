const jwt = require('jsonwebtoken')
const { getJwtSecret } = require('../../shared/utils/jwt')

module.exports = function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación requerido.' })
  }

  try {
    const payload = jwt.verify(token, getJwtSecret())
    req.user = {
      id: payload.sub,
      email: payload.email,
    }
    next()
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido o expirado.',
    })
  }
}
