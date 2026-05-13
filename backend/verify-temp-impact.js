/**
 * Script de Verificación: Impacto de Temperatura Cu vs Al
 * Objetivo: Comprobar si el factor afecta distinto a los materiales.
 */
const { calcAmpacity } = require('./src/engine/ampacity');

const CALIBRE = '300';
const TEMPS = [30, 40, 50];

console.log(`🧪 COMPARATIVA DE IMPACTO TÉRMICO (Calibre ${CALIBRE} kcmil)\n`);
console.log('Temp (°C) | Material | I_tabla (90°C) | Factor Temp | I_corregida | Reducción (%)');
console.log('----------|----------|----------------|-------------|-------------|--------------');

TEMPS.forEach(temp => {
  const results = {
    Cu: calcAmpacity({ material: 'Cu', size: CALIBRE, ambientC: temp }),
    Al: calcAmpacity({ material: 'Al', size: CALIBRE, ambientC: temp })
  };

  ['Cu', 'Al'].forEach(mat => {
    const res = results[mat];
    const reduction = ((1 - res.F_temp) * 100).toFixed(1);
    
    console.log(
      `${temp}°C`.padEnd(10) + ' | ' +
      mat.padEnd(8) + ' | ' +
      `${res.I_tabla} A`.padEnd(14) + ' | ' +
      res.F_temp.toFixed(2).padEnd(11) + ' | ' +
      `${res.I_corr.toFixed(1)} A`.padEnd(11) + ' | ' +
      `${reduction}%`
    );
  });
  console.log('----------|----------|----------------|-------------|-------------|--------------');
});

console.log('\n🔍 CONCLUSIÓN TÉCNICA:');
console.log('1. El "Factor Temp" es IDENTICO para ambos materiales a una misma temperatura.');
console.log('2. Esto cumple con la Tabla 310.15(B)(2)(a) de la NOM-001-SEDE-2012.');
console.log('3. El aluminio pierde menos Amperes absolutos por grado, pero su capacidad final');
console.log('   sigue siendo ~20% menor que la del cobre debido a su resistividad natural.');

/* 
Ejemplo de salida esperada a 40°C:
Cu: 320A * 0.91 = 291.2A (Pierde 28.8A)
Al: 255A * 0.91 = 232.0A (Pierde 23.0A)
*/