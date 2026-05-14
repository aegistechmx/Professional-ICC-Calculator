const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')
const { defaultLogger } = require('../../debug/logger')

const logger = defaultLogger.child('ReportController')

exports.generateCalculationReport = async (req, res) => {
  const body = req.body || {}
  const { projectName, revision, systemData = {} } = body

  try {
    // --- 1. Cálculo de estadísticas de cumplimiento ---
    let passCount = 0
    let failCount = 0
    if (Array.isArray(systemData.nodos)) {
      systemData.nodos.forEach(n => {
        const status = (n.decision?.estadoGlobal || (n.ok ? 'PASS' : 'FAIL')).toUpperCase()
        if (status === 'PASS' || status === 'CUMPLE') passCount++
        else failCount++
      })
    }
    const totalNodos = passCount + failCount

    const doc = new PDFDocument({ margin: 50 })
    const userEmail = req.user?.email || 'usuario@local'

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Memoria_${projectName || 'ICC'}.pdf`
    )

    doc.pipe(res)

    // --- Logo de la Empresa ---
    const logoPath = path.join(__dirname, '..', '..', '..', 'assets', 'logo.png')
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, 40, { width: 60 })
      } catch (err) {
        logger.warn('No se pudo renderizar el logotipo para el reporte PDF.', { error: err.message })
      }
    } else {
      logger.debug('Logotipo no encontrado para el reporte PDF.', { logoPath })
    }

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
      .text(`Revisión: ${revision || '0'}`)
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

    // --- 2. Renderizado de Gráfico Circular ---
    if (totalNodos > 0) {
      const chartX = 420
      const chartY = doc.y - 25
      const radius = 35

      if (failCount === 0) {
        doc.fillColor('#22c55e').circle(chartX, chartY, radius).fill()
      } else if (passCount === 0) {
        doc.fillColor('#ef4444').circle(chartX, chartY, radius).fill()
      } else {
        const sliceAngle = (passCount / totalNodos) * 360
        // Slice Verde (CUMPLE)
        doc.fillColor('#22c55e')
          .moveTo(chartX, chartY)
          .arc(chartX, chartY, radius, -90, -90 + sliceAngle)
          .lineTo(chartX, chartY).fill()
        // Slice Rojo (REVISAR)
        doc.fillColor('#ef4444')
          .moveTo(chartX, chartY)
          .arc(chartX, chartY, radius, -90 + sliceAngle, 270)
          .lineTo(chartX, chartY).fill()
      }

      // Leyenda del gráfico
      doc.fontSize(8).fillColor('black')
      doc.rect(chartX + 45, chartY - 12, 8, 8).fill('#22c55e')
      doc.fillColor('black').text(`CUMPLE: ${passCount}`, chartX + 58, chartY - 11)
      doc.rect(chartX + 45, chartY + 3, 8, 8).fill('#ef4444')
      doc.fillColor('black').text(`REVISAR: ${failCount}`, chartX + 58, chartY + 4)
      
      if (doc.y < chartY + radius) doc.y = chartY + radius + 15
    }
    doc.moveDown()

    doc.fontSize(14).text('2. Resumen de Conductores', { underline: true })
    doc.moveDown(0.5)

    const colWidths = [120, 80, 80, 80, 100]
    const startX = 50
    const headersY = doc.y

    doc.fontSize(10).fillColor('#1e40af')
    const headers = ['Nodo', 'Calibre', 'Material', 'Paralelos', 'Amp. Final']
    headers.forEach((h, i) => {
      const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
      doc.text(h, x, headersY)
    })

    doc.moveDown(0.5)
    doc.strokeColor('#cccccc').lineWidth(0.5).moveTo(startX, doc.y).lineTo(550, doc.y).stroke()
    doc.moveDown(0.5)

    doc.fontSize(9).fillColor('black')
    if (Array.isArray(systemData.nodos)) {
      systemData.nodos.forEach(nodo => {
        if (doc.y > 700) doc.addPage()
        const rowY = doc.y
        let x = startX
        doc.text(nodo.nombre || nodo.id, x, rowY)
        doc.text(nodo.feeder?.calibre || 'N/A', x + colWidths[0], rowY)
        doc.text(nodo.feeder?.material || 'N/A', x + colWidths[0] + colWidths[1], rowY)
        doc.text(String(nodo.feeder?.paralelo || 1), x + colWidths[0] + colWidths[1] + colWidths[2], rowY)
        doc.text(`${(nodo.CDT?.I_final || 0).toFixed(1)} A`, x + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowY)
        doc.moveDown(0.8)
      })
    }
    doc.moveDown()

    doc.fontSize(14).text('3. Análisis por Nodo', { underline: true })
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
          .text(`- Caída de Tensión: ${(nodo.caidaTension || 0).toFixed(2)}% (${(nodo.caidaV || 0).toFixed(2)} V)`)
          .text(`- Factor de Temperatura: ${nodo.CDT?.F_temp || '1.00'}`)
          .text(`- Factor de Agrupamiento: ${nodo.CDT?.F_agrupamiento || '1.00'}`)
          .text(`- Verificación: ${nodo.decision?.estadoGlobal || (nodo.ok ? 'CUMPLE' : 'REVISAR')}`)
        doc.moveDown(0.5)
      })
    }

    doc.moveDown()
    doc.fontSize(14).text('4. Ajustes de Protección (LSIG)', { underline: true })
    doc.moveDown(0.5)

    const protColWidths = [100, 110, 110, 80, 110]
    const protStartX = 50
    const protHeadersY = doc.y

    doc.fontSize(10).fillColor('#1e40af')
    const protHeaders = ['Nodo', 'L (Ir/tr)', 'S (Isd/tsd)', 'I (Ii)', 'G (Ig/tg)']
    protHeaders.forEach((h, i) => {
      const x = protStartX + protColWidths.slice(0, i).reduce((a, b) => a + b, 0)
      doc.text(h, x, protHeadersY)
    })

    doc.moveDown(0.5)
    doc.strokeColor('#cccccc').lineWidth(0.5).moveTo(protStartX, doc.y).lineTo(550, doc.y).stroke()
    doc.moveDown(0.5)

    doc.fontSize(8).fillColor('black')
    if (Array.isArray(systemData.nodos)) {
      systemData.nodos.forEach(nodo => {
        if (doc.y > 700) doc.addPage()
        const rowY = doc.y
        const equip = nodo.equip || {}
        
        // Formateo de valores LSIG con fallbacks de seguridad
        const l = `${equip.long_pickup || '1.0'}x / ${equip.long_delay || '6'}s`
        const s = equip.short_pickup ? `${equip.short_pickup}x / ${equip.short_delay || '0.3'}s` : 'N/A'
        const inst = equip.iDisparo ? `${equip.iDisparo} A` : 'N/A'
        const g = equip.ground_pickup ? `${equip.ground_pickup}x / ${equip.ground_delay || '0.1'}s` : 'N/A'

        doc.text(nodo.nombre || nodo.id, protStartX, rowY)
        doc.text(l, protStartX + protColWidths[0], rowY)
        doc.text(s, protStartX + protColWidths[0] + protColWidths[1], rowY)
        doc.text(inst, protStartX + protColWidths[0] + protColWidths[1] + protColWidths[2], rowY)
        doc.text(g, protStartX + protColWidths[0] + protColWidths[1] + protColWidths[2] + protColWidths[3], rowY)
        doc.moveDown(0.8)
      })
    }

    doc.end()
  } catch (error) {
    logger.error('Error al generar PDF', { error: error.message })
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Error al generar el PDF',
        details: { message: error.message }
      })
    }
  }
}
