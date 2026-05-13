const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { validateElectricalParams } = require('./api/middlewares/validation.middleware');
const authController = require('./api/controllers/auth.controller');
const authenticateToken = require('./api/middlewares/auth.middleware');
const iccRoutes = require('./api/routes/icc.routes');
const reportRoutes = require('./api/routes/report.routes');

// Importar rutas (controladores)
// const iccRoutes = require('./api/routes/icc.routes'); // Asumiendo que existen
// const tccRoutes = require('./api/routes/tcc.routes'); // Asumiendo que existen
// const projectRoutes = require('./api/routes/project.routes'); // Asumiendo que existen

const app = express();

// Middlewares de seguridad
app.use(helmet()); // Protección contra vulnerabilidades web comunes
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // Configurar CORS según el entorno
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json()); // Para parsear JSON en el body de las peticiones

// Limitador de tasa para prevenir ataques de fuerza bruta/DoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 peticiones por IP en 15 minutos
  message: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo después de 15 minutos',
});
app.use('/api/', apiLimiter); // Aplicar a todas las rutas /api

// Rutas de autenticación
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Registra un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Datos de entrada inválidos o usuario ya existe
 */
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);

// Rutas de cálculo
app.use('/api/icc', iccRoutes);
app.use('/api/report', reportRoutes);

// Ejemplo de aplicación del middleware de validación a rutas de cálculo
app.post('/api/calculo/icc', authenticateToken, validateElectricalParams, (req, res) => {
  // Lógica de cálculo de ICC aquí
  res.json({ success: true, message: 'Cálculo ICC procesado', data: req.body });
});

module.exports = app;