// Test de coordinación con breakers reales del catálogo
const { getBreaker, listBreakers } = require('./src/engine/breakerCatalog');
const { getTripTimeReal, checkCoordinationReal, generateCurve } = require('./src/engine/tccCoordination');

console.log('🧪 Test Coordinación con Breakers Reales\n');

// Listar breakers disponibles
console.log('📋 Breakers disponibles:');
const breakers = listBreakers();
breakers.forEach(b => {
  console.log(`  - ${b.brand} ${b.model} (In: ${b.In}A, Icu: ${b.Icu}kA)`);
});

console.log('\n---\n');

// Test 1: Tiempo de disparo con breaker real
console.log('⚡ Test 1: Tiempo de disparo Schneider MGA36500');
const breaker500 = getBreaker('Schneider', 'MGA36500');
console.log(`Breaker: ${breaker500.brand} ${breaker500.model}`);
console.log(`In: ${breaker500.In} A`);
console.log(`Icu: ${breaker500.Icu} kA`);

const testCurrents = [500, 1000, 2000, 3000, 5000];
console.log('\nCorriente vs Tiempo de disparo:');
testCurrents.forEach(I => {
  const t = getTripTimeReal(breaker500, I);
  console.log(`  ${I} A -> ${t.toFixed(3)} s`);
});

console.log('\n---\n');

// Test 2: Coordinación entre breakers reales
console.log('🔗 Test 2: Coordinación Schneider MGA36500 (upstream) vs MGA32500 (downstream)');
const breakerUp = getBreaker('Schneider', 'MGA36500'); // 500A
const breakerDown = getBreaker('Schneider', 'MGA32500'); // 250A

console.log(`Upstream: ${breakerUp.brand} ${breakerUp.model} (${breakerUp.In}A)`);
console.log(`Downstream: ${breakerDown.brand} ${breakerDown.model} (${breakerDown.In}A)`);

const faultCurrents = [1000, 2000, 3000, 5000];
console.log('\nCoordinación a diferentes corrientes de falla:');
faultCurrents.forEach(I_fault => {
  const result = checkCoordinationReal({
    upstream: breakerUp,
    downstream: breakerDown,
    I_fault
  });
  console.log(`  ${I_fault} A: ${result.coordinated ? '✅' : '❌'} ${result.msg}`);
});

console.log('\n---\n');

// Test 3: Generación de curva para graficación
console.log('📈 Test 3: Generación de curva para graficación');
const curve = generateCurve(breaker500, 50);
console.log(`Puntos generados: ${curve.length}`);
console.log('Primeros 5 puntos:');
curve.slice(0, 5).forEach((p, i) => {
  console.log(`  ${i + 1}. I=${p.x.toFixed(0)}A, t=${p.y.toFixed(3)}s`);
});
console.log('Últimos 5 puntos:');
curve.slice(-5).forEach((p, i) => {
  console.log(`  ${curve.length - 4 + i}. I=${p.x.toFixed(0)}A, t=${p.y.toFixed(3)}s`);
});

console.log('\n✅ Test completado');
