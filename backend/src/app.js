const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false // Allow embedding
}));

// Restrict CORS to specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];

app.use(cors({
  origin: function (origin, callback) {
    // In production, require origin for security
    if (process.env.NODE_ENV === 'production' && !origin) {
      return callback(new Error('Origin required in production'));
    }
    // Allow requests with no origin in development (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ICC Calculator API',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      calculo: '/calculo',
      proyectos: '/proyectos',
      proteccion: '/proteccion',
      reporte: '/reporte',
      coord: '/coord',
      'sqd-real': '/sqd-real',
      simulacion: '/simulacion',
      templates: '/templates',
      loadflow: '/loadflow',
      powerflow: '/powerflow'
    }
  });
});

// API Routes
app.use('/auth', require('./routes/auth.routes'));
app.use('/calculo', require('./routes/calculo.routes'));
app.use('/proyectos', require('./routes/proyecto.routes'));
app.use('/proteccion', require('./routes/proteccion.routes'));
app.use('/reporte', require('./routes/reporte/reporte.routes'));
app.use('/coord', require('./routes/coordinacion.routes'));
app.use('/sqd-real', require('./routes/sqd_real.routes'));
app.use('/simulacion', require('./routes/simulacion.routes'));
app.use('/templates', require('./routes/template.routes'));
app.use('/loadflow', require('./routes/loadflow.routes'));
app.use('/powerflow', require('./routes/powerflow.routes'));

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
