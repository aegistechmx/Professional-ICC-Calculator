function validateElectricalParams(req, res, next) {
  const { tension, kva, longitud, corriente, fp } = req.body
  const errors = []

  if (tension !== undefined && (tension < 110 || tension > 500000)) {
    errors.push('La tensión debe estar entre 110 V y 500 kV.')
  }

  if (kva !== undefined && (kva <= 0 || kva > 100000)) {
    errors.push('La potencia kVA debe ser positiva y menor a 100 MVA.')
  }

  if (longitud !== undefined && (longitud < 0 || longitud > 10000)) {
    errors.push('La longitud debe estar entre 0 y 10,000 metros.')
  }

  if (corriente !== undefined && corriente < 0) {
    errors.push('La corriente no puede ser negativa.')
  }

  if (fp !== undefined && (fp < 0.1 || fp > 1.0)) {
    errors.push('El factor de potencia debe estar entre 0.1 y 1.0.')
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Error de validación eléctrica',
      details: errors,
    })
  }

  next()
}

module.exports = {
  validateElectricalParams,
}
