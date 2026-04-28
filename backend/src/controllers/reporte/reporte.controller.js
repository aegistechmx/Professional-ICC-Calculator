const reporteService = require('../../services/reporte/reporte.service');

exports.generarPDF = async (req, res) => {
  try {
    // Configurar cabeceras para descarga de PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte-cortocircuito.pdf');

    // Pasar el response como stream al generador
    await reporteService.generarReporteCompleto(req.body, res);

  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error interno al generar el reporte' });
    }
  }
};
