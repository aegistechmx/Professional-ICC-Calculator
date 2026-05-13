/**
 * Escenario de Simulación: Caída de Tensión Crítica en Aluminio
 * Objetivo: Verificar la detección de violación NOM (>5%) con cables de Al.
 */
const { validateFeeder } = require('./src/engine/validator');

console.log('🧪 SIMULACIÓN: Caída de Tensión Crítica (>5%) - Conductores de Aluminio\n');

const scenario = {
  material: 'Aluminio (Al)', // Test de normalización
  size: '300 kcmil',        // Calibre grande
  ambientC: '35°C',          // Temperatura elevada
  nConductors: 3,
  parallels: 2,
  terminalTempC: '75°C',
  I_base: '200 A',           // Corriente de carga
  Fcc: 1.25,
  Icu_kA: 35,
  Isc_kA: 12.5,
  // Parámetros de caída de tensión configurados para inducir fallo
  voltageDrop: {
    V: '480V',
    L: '500m',               // Distancia larga (0.5 km)
    R: 0.35,                 // Resistencia típica Al 300kcmil (ohm/km)
    X: 0.12,                 // Reactancia típica (ohm/km)
    fp: 0.85                 // Factor de potencia industrial
  }
};

try {
  const result = validateFeeder(scenario);

  console.log('📊 REPORTE DE RESULTADOS:');
  console.log('------------------------------------------------------------');
  console.log(`Estado Global: ${result.ok ? '✅ CUMPLE' : '❌ VIOLACIÓN DETECTADA'}`);
  
  if (result.voltageDrop) {
    const vd = result.voltageDrop;
    console.log(`\n⚡ ANÁLISIS DE TENSIÓN:`);
    console.log(`   Voltaje Nominal: 480 V`);
    console.log(`   Pérdida de Voltaje (ΔV): ${vd.deltaV.toFixed(2)} V`);
    console.log(`   Porcentaje de Caída: ${vd.percent.toFixed(2)}%`);
    console.log(`   Estatus NOM: ${vd.check.level}`);
    console.log(`   Mensaje: ${vd.check.msg}`);
  }

  console.log(`\n🔌 ANÁLISIS DE CONDUCTOR (AL):`);
  console.log(`   I_diseño (con factor 1.25): ${result.ampacity.I_design} A`);
  console.log(`   I_final (capacidad real Al): ${result.ampacity.I_final.toFixed(1)} A`);
  console.log(`   Resultado Ampacidad: ${result.ampacity.check.ok ? 'OK' : 'FAIL'}`);
  
  console.log('\n🔍 DEBUG - Invariantes del Motor:');
  console.log(JSON.stringify(result.invariants, null, 2));
  console.log('------------------------------------------------------------');

} catch (error) {
  console.error('❌ Error en la simulación:', error.message);
  console.error(error.stack);
}