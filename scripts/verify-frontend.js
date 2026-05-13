const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * verify-frontend.js
 * Verifica que el frontend compile correctamente tras las reparaciones automáticas.
 */
function verifyFrontend() {
  const rootDir = process.cwd();
  const frontendDir = path.join(rootDir, 'frontend');

  console.log('\n🛡️  Iniciando verificación de integridad del Frontend...');
  console.log('=======================================================');

  if (!fs.existsSync(frontendDir)) {
    console.error('❌ Error: No se encontró la carpeta "frontend".');
    process.exit(1);
  }

  try {
    console.log('🏗️  Ejecutando build de producción con Vite...');
    console.log('   (Esto validará la sintaxis de todos los archivos .js y .jsx)\n');

    // Ejecutamos el comando de build definido en el package.json del frontend
    execSync('npm run build', { 
      cwd: frontendDir, 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    console.log('\n✨ ¡Éxito! El frontend compiló sin errores.');
    console.log('Los cambios de "fix-unused-vars.js" son seguros.');

  } catch (error) {
    console.error('\n💥 Error de compilación detectado.');
    console.error('Revisa los mensajes de error arriba para identificar el archivo afectado.');
    process.exit(1);
  }
}

verifyFrontend();