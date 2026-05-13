const PDFDocument = require('pdfkit')
const { defaultLogger } = require('../../debug/logger')

const logger = defaultLogger.child('ReportController')

exports.generateCalculationReport = async (req, res) => {
  const { projectName, systemData = {} } = req.body

  try {
    const doc = new PDFDocument({ margin: 50 })
    const userEmail = req.user?.email || 'usuario@local'

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Memoria_${projectName || 'ICC'}.pdf`
    )

    doc.pipe(res)
    doc.fontSize(20).text('MEMORIA DE CÁLCULO ELÉCTRICO', { align: 'center' })
    doc
      .fontSize(10)
      .text('Professional ICC Calculator - NOM-001-SEDE Compliance', {
        align: 'center',
      })
    doc.moveDown()
    doc.rect(50, doc.y, 500, 2).fill('#3b82f6')
    doc.moveDown()

    doc
      .fontSize(12)
      .fillColor('black')
      .text(`Proyecto: ${projectName || 'Sin nombre'}`)
      .text(`Usuario: ${userEmail}`)
      .text(`Fecha: ${new Date().toLocaleDateString()}`)
      .moveDown()

    doc.fontSize(14).text('1. Resumen del Sistema', { underline: true })
    doc
      .fontSize(11)
      .text(`Tensión de Operación: ${systemData.tension || 'N/A'} V`)
      .text(
        `Corriente de Cortocircuito Máxima: ${systemData.isc_max || 'N/A'} kA`
      )
      .moveDown()

    doc.fontSize(14).text('2. Análisis por Nodo', { underline: true })
    doc.moveDown()

    if (Array.isArray(systemData.nodos) && systemData.nodos.length > 0) {
      systemData.nodos.forEach(nodo => {
        doc
          .fontSize(11)
          .fillColor('#1e40af')
          .text(`Nodo: ${nodo.nombre || 'ID ' + nodo.id}`)
        doc
          .fillColor('black')
          .fontSize(10)
          .text(`- Corriente Falla (I3F): ${nodo.I3F || 'N/A'} A`)
          .text(`- Caída de Tensión: ${nodo.caidaTension || 0}%`)
          .text(`- Verificación: ${nodo.ok ? 'CUMPLE' : 'REVISAR'}`)
        doc.moveDown(0.5)
      })
    }

    doc.end()
  } catch (error) {
    logger.error('Error al generar PDF', { error: error.message })
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Error al generar el PDF',
        details: { message: error.message },
      })
    }
  }
}
