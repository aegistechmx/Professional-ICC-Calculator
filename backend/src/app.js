const express = require('express');
const cors = require('cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
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
      loadflow: '/loadflow'
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

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
