const jwt = require('jsonwebtoken')

module.exports = function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación requerido.' })
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'development-secret'
    )
    req.user = {
      id: payload.sub,
      email: payload.email,
    }
    next()
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido o expirado.',
      details: { message: error.message },
    })
  }
}
