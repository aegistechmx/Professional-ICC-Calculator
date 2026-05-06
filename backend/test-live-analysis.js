// Test del sistema live de análisis ICC
const { runFullAnalysis } = require('./src/engine/fullAnalysis');
const { getCached, setCached, getCacheStats } = require('./src/cache');
const crypto = require('crypto');

console.log('🧪 Test Sistema Live ICC\n');

// Modelo de sistema de ejemplo
const systemModel = {
  buses: [
    { id: 'bus1', name: 'Alimentador Principal', voltage: 480, position: { x: 100, y: 100 } },
    { id: 'bus2', name: 'Tablero Distribución', voltage: 480, position: { x: 300, y: 100 } }
  ],
  branches: [
    {
      id: 'br1',
      from: 'bus1',
      to: 'bus2',
      material: 'Cu',
      size: 300,
      current: 300,
      nConductors: 3,
      length: 50
    }
  ],
  breakers: [
    {
      id: 'cb1',
      model: 'MGA36500',
      In: 500,
      pickup: 550,
      tms: 0.5,
      inst: 5000,
      thermal: {
        points: [
          { I: 1.05, t: 7200 },
          { I: 1.2, t: 1200 },
          { I: 1.5, t: 180 },
          { I: 2.0, t: 60 },
          { I: 4.0, t: 10 },
          { I: 6.0, t: 3 },
          { I: 8.0, t: 1.5 },
          { I: 10.0, t: 0.8 }
        ]
      },
      magnetic: { pickup: 10, clearingTime: 0.02 }
    },
    {
      id: 'cb2',
      model: 'MGA32500',
      In: 250,
      pickup: 275,
      tms: 0.1,
      inst: 2500,
      thermal: {
        points: [
          { I: 1.05, t: 7200 },
          { I: 1.2, t: 1200 },
          { I: 1.5, t: 180 },
          { I: 2.0, t: 60 },
          { I: 4.0, t: 10 },
          { I: 6.0, t: 3 },
          { I: 8.0, t: 1.5 },
          { I: 10.0, t: 0.8 }
        ]
      },
      magnetic: { pickup: 10, clearingTime: 0.02 }
    }
  ],
  loads: [
    { id: 'load1', busId: 'bus2', power: 100, pf: 0.85 }
  ],
  settings: {
    baseMVA: 10,
    ambientC: 30,
    faultBus: 'bus2' // Simular falla en bus2
  }
};

console.log('📋 Modelo del sistema:');
console.log(`  Buses: ${systemModel.buses.length}`);
console.log(`  Ramas: ${systemModel.branches.length}`);
console.log(`  Breakers: ${systemModel.breakers.length}`);
console.log(`  Falla en: ${systemModel.settings.faultBus}`);

// Test 1: Análisis completo
console.log('\n⚡ Test 1: Ejecutando análisis completo...');
const start1 = Date.now();
const result1 = runFullAnalysis(systemModel);
const time1 = Date.now() - start1;

console.log(`  Tiempo: ${time1}ms`);
console.log(`  Status: ${result1.status}`);
console.log(`  ICC en barra 1: ${result1.buses[0]?.Isc?.toFixed(2)} kA`);
console.log(`  ICC en barra 2: ${result1.buses[1]?.Isc?.toFixed(2)} kA`);

// Test 2: Cache
console.log('\n💾 Test 2: Verificando cache...');
const key = crypto.createHash('md5').update(JSON.stringify(systemModel)).digest('hex');
console.log(`  Cache key: ${key.substring(0, 16)}...`);

setCached(key, result1);
const cached = getCached(key);
console.log(`  Cache hit: ${cached ? '✅' : '❌'}`);
console.log(`  Stats: ${JSON.stringify(getCacheStats())}`);

// Test 3: Curvas TCC
console.log('\n📈 Test 3: Curvas TCC generadas:');
console.log(`  Total curvas: ${result1.tcc.length}`);
result1.tcc.forEach((curve, i) => {
  console.log(`  Curva ${i + 1}: ${curve.label}`);
  console.log(`    Puntos: ${curve.points.length}`);
  console.log(`    Primer punto: I=${curve.points[0]?.x.toFixed(0)}A, t=${curve.points[0]?.y.toFixed(3)}s`);
});

// Test 4: Coordinación
console.log('\n🔗 Test 4: Coordinación TCC:');
if (result1.coordination) {
  console.log(`  Coordinado: ${result1.coordination.coordinated ? '✅' : '❌'}`);
  console.log(`  T upstream: ${result1.coordination.t_up.toFixed(3)}s`);
  console.log(`  T downstream: ${result1.coordination.t_down.toFixed(3)}s`);
  console.log(`  Margen: ${result1.coordination.margin.toFixed(3)}s`);
} else {
  console.log('  No hay coordinación (se necesitan 2+ breakers y falla configurada)');
}

// Test 5: Ampacidad
console.log('\n🔌 Test 5: Ampacidad en ramas:');
result1.branches.forEach((br, i) => {
  if (br.ampacity) {
    console.log(`  Rama ${br.id}:`);
    console.log(`    I_tabla (90°C): ${br.ampacity.I_tabla || 'N/A'}A`);
    console.log(`    I_corr: ${br.ampacity.I_corr?.toFixed(1) || 'N/A'}A`);
    console.log(`    I_terminal (75°C): ${br.ampacity.I_terminal || 'N/A'}A`);
    console.log(`    I_final: ${br.ampacity.I_final?.toFixed(1) || 'N/A'}A`);
    console.log(`    Cumple: ${br.ampacity.check?.ok ? '✅' : '❌'}`);
  } else {
    console.log(`  Rama ${br.id}: Sin datos de ampacidad`);
  }
});

// Test 6: Segundo análisis (debería usar cache)
console.log('\n⚡ Test 6: Segundo análisis (cache)...');
const start2 = Date.now();
const cached2 = getCached(key);
const time2 = Date.now() - start2;

console.log(`  Cache retrieval: ${time2}ms (vs ${time1}ms calculado)`);
console.log(`  Speedup: ${(time1 / (time2 || 1)).toFixed(1)}x`);

console.log('\n✅ Test completado');
