// Test del optimizador de breakers
const { getBreaker } = require('./src/engine/breakerCatalog');
const { optimizeBreakers, costFunction, generateReport } = require('./src/engine/optimizer');

console.log('🧪 Test Optimizador de Coordinación TCC\n');

// Configuración inicial (posiblemente no coordinada)
const breakers = [
  {
    ...getBreaker('Schneider', 'MGA36500'),
    pickup: 550,   // 1.1x In (muy alto, poco sensible)
    tms: 0.5,      // lento
    inst: 5000     // 10x In
  },
  {
    ...getBreaker('Schneider', 'MGA32500'),
    pickup: 300,   // 1.2x In
    tms: 0.3,      // lento
    inst: 2500     // 10x In
  }
];

console.log('📋 Configuración inicial:');
breakers.forEach(b => {
  console.log(`  ${b.model}:`);
  console.log(`    In: ${b.In}A`);
  console.log(`    Pickup: ${b.pickup}A (${(b.pickup/b.In).toFixed(2)}x)`);
  console.log(`    TMS: ${b.tms}`);
  console.log(`    Inst: ${b.inst}A (${(b.inst/b.In).toFixed(1)}x)`);
});

// Escenarios de falla
const faults = [
  { I: 1000, I_min: 500 },   // Falla leve
  { I: 2000, I_min: 500 },   // Falla media
  { I: 3000, I_min: 500 },   // Falla severa
  { I: 5000, I_min: 500 }    // Falla máxima
];

console.log('\n⚡ Escenarios de falla:');
faults.forEach(f => {
  console.log(`  ${f.I}A (mínimo detectable: ${f.I_min}A)`);
});

// Calcular costo inicial
const initialCost = costFunction(breakers, faults);
console.log(`\n💰 Costo inicial: ${initialCost.toFixed(0)}`);

// Ejecutar optimización
console.log('\n🔧 Ejecutando optimización (100 iteraciones)...\n');

try {
  const result = optimizeBreakers({
    breakers,
    faults,
    iterations: 100,
    temperature: 1.0
  });

  console.log('✅ Optimización completada\n');
  console.log(generateReport(result));
  
  console.log('\n📊 Comparación de coordinación:');
  console.log('\nANTES:');
  const { getTripTimeReal } = require('./src/engine/tccCoordination');
  faults.forEach(f => {
    const t_up = getTripTimeReal(result.original[0], f.I);
    const t_down = getTripTimeReal(result.original[1], f.I);
    const margin = t_up - t_down;
    console.log(`  ${f.I}A: Up=${t_up.toFixed(3)}s, Down=${t_down.toFixed(3)}s, Margen=${margin.toFixed(3)}s ${margin >= 0.2 ? '✅' : '❌'}`);
  });
  
  console.log('\nDESPUÉS:');
  faults.forEach(f => {
    const t_up = getTripTimeReal(result.optimized[0], f.I);
    const t_down = getTripTimeReal(result.optimized[1], f.I);
    const margin = t_up - t_down;
    console.log(`  ${f.I}A: Up=${t_up.toFixed(3)}s, Down=${t_down.toFixed(3)}s, Margen=${margin.toFixed(3)}s ${margin >= 0.2 ? '✅' : '❌'}`);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}

console.log('\n✅ Test completado');
