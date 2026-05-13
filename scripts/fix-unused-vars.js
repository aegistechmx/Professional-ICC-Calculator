const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Automatiza el prefijado de variables no utilizadas con "_" para resolver warnings de ESLint en arquitecturas monorepo.
 */
async function fixUnusedVars() {
  console.log('🚀 Iniciando limpieza masiva de variables no utilizadas...');
  
  const targets = [
    { name: 'frontend', dir: 'frontend', pattern: 'src/**/*.{js,jsx}' },
    { name: 'backend', dir: 'backend', pattern: 'src/**/*.js' }
  ];

  let totalFixed = 0;
  let filesModified = 0;

  for (const target of targets) {
    const targetPath = path.join(process.cwd(), target.dir);
    if (!fs.existsSync(targetPath)) continue;

    console.log(`🔍 Analizando ${target.name}...`);
    
    let results;
    try {
      // Ejecutamos npx dentro del subdirectorio para que detecte la configuración local
      // Añadimos ESLINT_USE_FLAT_CONFIG=false por compatibilidad con versiones v8/v9
      const cmd = `npx eslint "${target.pattern}" --format json`;
      const output = execSync(cmd, { 
        cwd: targetPath, 
        encoding: 'utf8', 
        maxBuffer: 50 * 1024 * 1024,
        env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'false' }
      });
      results = JSON.parse(output);
    } catch (e) {
      if (e.stdout) {
        try {
          results = JSON.parse(e.stdout);
        } catch (err) {
          console.error(`❌ Error al parsear JSON de ${target.name}`);
          continue;
        }
      } else {
        console.error(`❌ Fallo al ejecutar ESLint en ${target.name}:`, e.message);
        continue;
      }
    }

    for (const result of results) {
      // Convertir el path relativo al subdirectorio en un path absoluto
      const filePath = path.isAbsolute(result.filePath) 
        ? result.filePath 
        : path.resolve(targetPath, result.filePath);
        
      const messages = result.messages.filter(m => m.ruleId === 'no-unused-vars');
      if (messages.length === 0) continue;

      if (!fs.existsSync(filePath)) continue;

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');
      
      const sortedMessages = messages.sort((a, b) => {
        if (a.line !== b.line) return b.line - a.line;
        return b.column - a.column;
      });

      let modified = false;
      for (const msg of sortedMessages) {
        const varNameMatch = msg.message.match(/'([^']+)'/);
        if (!varNameMatch) continue;

        const varName = varNameMatch[1];
        const lineIdx = msg.line - 1;
        const colIdx = msg.column - 1;

        const line = lines[lineIdx];
        
        if (line && line.substring(colIdx, colIdx + varName.length) === varName) {
          lines[lineIdx] = line.substring(0, colIdx) + '_' + line.substring(colIdx);
          totalFixed++;
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'));
        filesModified++;
        console.log(`   ✅ Corregido: ${path.relative(process.cwd(), filePath)}`);
      }
    }
  }

  console.log(`\n✨ ¡Proceso terminado!`);
  console.log(`📊 Resumen:`);
  console.log(`   - Archivos modificados: ${filesModified}`);
  console.log(`   - Variables prefijadas con "_": ${totalFixed}`);
}

fixUnusedVars().catch(console.error);