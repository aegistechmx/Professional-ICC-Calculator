/**
 * Orquestador Principal (un solo punto de verdad)
 * Valida alimentador según NOM-001-SEDE-2012
 * Pipeline completo: Ampacidad → Caída de Tensión → Coordinación TCC
 */

const { calcAmpacity } = require('./ampacity.js');
const { calcTerminalLimit } = require('./terminal.js');
const { calcDesignCurrent, finalAmpacity, checkAmpacity } = require('./design.js');
const { checkInterrupting } = require('./interrupting.js');
const { calcVoltageDrop, checkVoltageDrop } = require('./voltageDrop.js');
const { checkCoordination } = require('./tccCoordination.js');
const { assertPositive } = require('./guards.js');

/**
 * Valida alimentador completo
 * @param {Object} input - Parámetros de entrada
 * @param {string} input.material - 'Cu' | 'Al'
 * @param {string|number} input.size - Calibre (300, 350, '1/0', etc.)
 * @param {number} input.ambientC - Temperatura ambiente en °C (default 30)
 * @param {number} input.nConductors - Número de conductores en la misma canalización (default 3)
 * @param {number} input.parallels - Número de conductores en paralelo (default 1)
 * @param {number} input.terminalTempC - Temperatura de terminal en °C (default 75)
 * @param {number} input.I_base - Corriente base en amperes
 * @param {number} input.Fcc - Factor de capacidad de carga (default 1.25)
 * @param {number} input.Icu_kA - Capacidad interruptiva del breaker en kA
 * @param {number} input.Isc_kA - Corriente de cortocircuito en kA
 * @param {Object} input.voltageDrop - Parámetros de caída de tensión (opcional)
 * @param {number} input.voltageDrop.V - Voltaje en volts
 * @param {number} input.voltageDrop.L - Longitud en metros
 * @param {number} input.voltageDrop.R - Resistencia en ohm/km
 * @param {number} input.voltageDrop.X - Reactancia en ohm/km
 * @param {number} input.voltageDrop.fp - Factor de potencia
 * @param {Object} input.coordination - Parámetros de coordinación TCC (opcional)
 * @param {Object} input.coordination.upstream - Configuración upstream
 * @param {Object} input.coordination.downstream - Configuración downstream
 * @returns {Object} Resultados completos de validación
 * @throws {Error} Si los parámetros son inválidos
 */
function validateFeeder(input) {
  const {
    material = 'Cu',
    size,
    ambientC = 30,
    nConductors = 3,
    parallels = 1,
    terminalTempC = 75,
    I_base,
    Fcc = 1.25,
    Icu_kA,
    Isc_kA,
    voltageDrop: vdParams,
    coordination: coordParams
  } = input;

  // Guards clave
  assertPositive('I_base', I_base);
  assertPositive('Icu_kA', Icu_kA);
  assertPositive('Isc_kA', Isc_kA);

  // Validar unidades (asumimos kA por defecto, pero permitimos especificar A)
  const Isc_unit = input.Isc_unit || 'kA'; // 'kA' | 'A'
  if (Isc_unit !== 'kA' && Isc_unit !== 'A') {
    throw new Error(`Isc_unit debe ser 'kA' o 'A', recibido: ${Isc_unit}`);
  }

  // 1) Ampacidad
  const amp = calcAmpacity({ material, size, ambientC, nConductors, parallels });

  // 2) Terminal
  const term = calcTerminalLimit({ material, size, terminalTempC });

  // 3) Diseño
  const { I_design } = calcDesignCurrent({ I_base, Fcc });

  // 4) Final
  const { I_final } = finalAmpacity({
    I_corr: amp.I_corr,
    I_terminal: term.I_terminal
  });

  // 5) Checks ampacidad e interruptiva
  const ampCheck = checkAmpacity({ I_final, I_design });
  const intCheck = checkInterrupting({ Icu_kA, Isc_kA });

  // 6) Caída de tensión (si se proporcionan parámetros)
  let voltageDropResult = null; // voltage (V)
  if (vdParams) {
    const vdCalc = calcVoltageDrop({
      I: I_base,
      ...vdParams
    });
    const vdCheck = checkVoltageDrop(vdCalc.percent);
    voltageDropResult = { // voltage (V)
      ...vdCalc,
      check: vdCheck
    };
  }

  // 7) Coordinación TCC (si se proporcionan parámetros)
  let coordinationResult = null;
  if (coordParams) {
    const I_fault = Isc_unit === 'A' ? Isc_kA : Isc_kA * 1000; // Convertir a amperes
    const coordCheck = checkCoordination({
      ...coordParams,
      I_fault
    });
    coordinationResult = coordCheck;
  }

  // Invariantes útiles
  const invariants = {
    nonZeroTable: amp.I_tabla > 0,
    terminalDefined: term.I_terminal > 0,
    noNaN: [amp.I_corr, I_design, I_final].every(Number.isFinite)
  };

  // Estado global
  const checks = [ampCheck.ok, intCheck.ok];
  if (voltageDropResult) checks.push(voltageDropResult.check.ok);
  if (coordinationResult) checks.push(coordinationResult.coordinated);

  const okGlobal = checks.every(Boolean) && Object.values(invariants).every(Boolean);

  return {
    ok: okGlobal,
    ampacity: {
      ...amp,
      ...term,
      I_design,
      I_final,
      check: ampCheck
    },
    interrupting: intCheck,
    voltageDrop: voltageDropResult,
    coordination: coordinationResult,
    invariants,
    debug: {
      input
    }
  };
}

module.exports = {
  validateFeeder
};
