const { PrismaClient } = require('@prisma/client')
const jwt = require('jsonwebtoken')
const Security = require('../../shared/utils/security')
const { getJwtSecret } = require('../../shared/utils/jwt')
const { defaultLogger } = require('../../debug/logger')

const prisma = new PrismaClient()
const logger = defaultLogger.child('AuthController')

exports.register = async (req, res) => {
  const { email, password, nombre } = req.body

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: 'Email y contraseña son requeridos.' })
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado.' })
    }

    const passwordHash = await Security.hashPassword(password)
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        nombre,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        plan: true,
        createdAt: true,
      },
    })

    res
      .status(201)
      .json({ message: 'Usuario registrado exitosamente', user: newUser })
  } catch (error) {
    logger.error('Error al registrar usuario', { error: error.message })
    res.status(500).json({
      error: 'Error interno del servidor al registrar usuario.',
    })
  }
}

exports.login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: 'Email y contraseña son requeridos.' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' })
    }

    const passwordValid = await Security.verifyPassword(
      password,
      user.passwordHash
    )

    if (!passwordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas.' })
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '8h' }
    )

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        plan: user.plan,
      },
    })
  } catch (error) {
    logger.error('Error al iniciar sesión', { error: error.message })
    res.status(500).json({
      error: 'Error interno del servidor al iniciar sesión.',
    })
  }
}
