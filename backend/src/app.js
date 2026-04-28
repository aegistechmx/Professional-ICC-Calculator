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

// Restrict CORS to specific origins with production security
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : process.env.NODE_ENV === 'production' 
    ? [] // No default origins in production
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174']; // Development defaults

app.use(cors({
  origin: function (origin, callback) {
    // In production, require explicit origin configuration
    if (process.env.NODE_ENV === 'production') {
      if (!origin) {
        return callback(new Error('Origin required in production'));
      }
      if (allowedOrigins.length === 0) {
        return callback(new Error('ALLOWED_ORIGINS must be configured in production'));
      }
    }
    
    // Allow requests with no origin in development (like mobile apps or curl requests)
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Serve static files (including cortocircuito calculator)
app.use(express.static('public'));

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ICC Calculator API',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      calculo: '/calculo',
      cortocircuito: '/cortocircuito',
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
app.use('/cortocircuito', require('./routes/cortocircuito.routes'));
app.use('/proyectos', require('./routes/proyecto.routes'));
app.use('/projects', require('./routes/projects.routes')); // New full-featured projects API
app.use('/proteccion', require('./routes/proteccion.routes'));
app.use('/reporte', require('./routes/reporte/reporte.routes'));
app.use('/coord', require('./routes/coordinacion.routes'));
app.use('/sqd-real', require('./routes/sqd_real.routes'));
app.use('/simulacion', require('./routes/simulacion.routes'));
app.use('/templates', require('./routes/template.routes'));
app.use('/loadflow', require('./routes/loadflow.routes'));
app.use('/powerflow', require('./routes/powerflow.routes'));
app.use('/icc', require('./routes/icc.routes'));

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
