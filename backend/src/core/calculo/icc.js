/**
 * icc.js - Basic ICC calculation module
 * Calcula la corriente de cortocircuito (ICC)
 * Soporta:
 * - Monofásico
 * - Trifásico
 * - Impedancia compleja (R + X)
 */

function calcularICC({
  voltaje,
  resistencia = 0,
  reactancia = 0,
  tipo = 'trifasico' // 'monofasico' | 'trifasico'
}) {
  if (!voltaje) throw new Error('Voltaje requerido');

  const Z = calcularImpedancia(resistencia, reactancia);

  if (Z === 0) throw new Error('Impedancia no puede ser 0');

  let icc;

  if (tipo === 'monofasico') {
    icc = voltaje / Z;
  } else if (tipo === 'trifasico') {
    icc = voltaje / (Math.sqrt(3) * Z);
  } else {
    throw new Error('Tipo inválido');
  }

  return {
    icc,
    impedancia: Z,
    tipo
  };
}

/**
 * Calcula magnitud de impedancia
 */
function calcularImpedancia(R, X) {
  return Math.sqrt(R ** 2 + X ** 2);
}

/**
 * Calcula potencia de cortocircuito (MVA)
 */
function calcularPotenciaCorto({ voltaje, icc }) {
  if (!voltaje || !icc) throw new Error('Datos incompletos');

  const potencia = (Math.sqrt(3) * voltaje * icc) / 1_000_000;

  return {
    mva: potencia
  };
}

module.exports = {
  calcularICC,
  calcularImpedancia,
  calcularPotenciaCorto
};
