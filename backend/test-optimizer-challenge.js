// Test del optimizador con caso desafiante (coordination challenge)
const { getBreaker } = require('./src/engine/breakerCatalog');
const { optimizeBreakers, costFunction, generateReport } = require('./src/engine/optimizer');

console.log('🧪 Test Optimizador - Caso Desafiante\n');

// Configuración inicial MAL coordinada (propósitamente)
const breakers = [
  {
    ...getBreaker('Schneider', 'MGA36500'),
    pickup: 750,   // 1.5x In (muy alto, poco sensible)
    tms: 0.8,      // muy lento
    inst: 5000     // 10x In
  },
  {
    ...getBreaker('Schneider', 'MGA32500'),
    pickup: 275,   // 1.1x In
    tms: 0.1,      // rápido
    inst: 2500     // 10x In
  }
];

console.log('📋 Configuración inicial (MAL coordinada):');
breakers.forEach(b => {
  console.log(`  ${b.model}:`);
  console.log(`    Pickup: ${b.pickup}A (${(b.pickup/b.In).toFixed(2)}x)`);
  console.log(`    TMS: ${b.tms}`);
  console.log(`    Inst: ${b.inst}A (${(b.inst/b.In).toFixed(1)}x)`);
});

// Escenarios de falla
const faults = [
  { I: 1000, I_min: 500 },
  { I: 2000, I_min: 500 },
  { I: 3000, I_min: 500 }
];

console.log('\n⚡ Escenarios de falla:');
faults.forEach(f => console.log(`  ${f.I}A`));

// Calcular costo inicial
const initialCost = costFunction(breakers, faults);
console.log(`\n💰 Costo inicial: ${initialCost.toFixed(0)} (alto = malo)`);

// Mostrar coordinación inicial
const { getTripTimeReal, checkCoordinationReal } = require('./src/engine/tccCoordination');
console.log('\n📊 Coordinación ANTES:');
faults.forEach(f => {
  const coord = checkCoordinationReal({
    upstream: breakers[0],
    downstream: breakers[1],
    I_fault: f.I
  });
  console.log(`  ${f.I}A: ${coord.coordinated ? '✅' : '❌'} ${coord.msg}`);
});

// Ejecutar optimización
console.log('\n🔧 Ejecutando optimización...\n');

try {
  const result = optimizeBreakers({
    breakers,
    faults,
    iterations: 200,
    temperature: 1.0
  });

  console.log(generateReport(result));
  
  console.log('\n📊 Coordinación DESPUÉS:');
  faults.forEach(f => {
    const coord = checkCoordinationReal({
      upstream: result.optimized[0],
      downstream: result.optimized[1],
      I_fault: f.I
    });
    console.log(`  ${f.I}A: ${coord.coordinated ? '✅' : '❌'} ${coord.msg}`);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
}

console.log('\n✅ Test completado');
