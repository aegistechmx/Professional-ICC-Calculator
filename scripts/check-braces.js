const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'backend', 'src', 'engine', 'index.js');

/**
 * Script para detectar llaves desbalanceadas y errores de estructura.
 */
function checkBraces(file) {
    console.log(`🔍 Analizando estructura de: ${path.relative(process.cwd(), file)}...\n`);

    if (!fs.existsSync(file)) {
        console.error(`❌ Error: Archivo no encontrado en ${file}`);
        return;
    }

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const stack = [];
    const errors = [];

    lines.forEach((line, index) => {
        const lineNum = index + 1;
        // Eliminamos el contenido de los comentarios para no procesar llaves dentro de ellos
        const cleanLine = line.split('//')[0].replace(/\/\*.*?\*\//g, '');
        
        for (let i = 0; i < cleanLine.length; i++) {
            const char = cleanLine[i];
            if (char === '{') {
                stack.push({ line: lineNum, col: i + 1 });
            } else if (char === '}') {
                if (stack.length === 0) {
                    errors.push(`❌ Línea ${lineNum}: Llave de cierre '}' encontrada pero no hay ninguna apertura previa.`);
                } else {
                    stack.pop();
                }
            }
        }
    });

    // Al final, lo que quede en el stack son las llaves que nunca se cerraron
    while (stack.length > 0) {
        const open = stack.pop();
        errors.push(`❌ Línea ${open.line}: Esta llave '{' nunca se cerró.`);
    }

    if (errors.length === 0) {
        console.log("✅ Estructura de llaves balanceada correctamente.");
    } else {
        console.log(`⚠️ Se encontraron ${errors.length} problemas estructurales:`);
        errors.forEach(err => console.log(err));
        console.log("\n💡 Tip: Revisa si hay código pegado accidentalmente dentro de un 'module.exports = { ... }'.");
    }
}

checkBraces(filePath);