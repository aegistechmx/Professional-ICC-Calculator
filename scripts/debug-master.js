const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

async function checkUrl(url) {
    return new Promise((resolve) => {
        const req = http.get(url, (res) => {
            resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
        });
        req.on('error', () => resolve({ status: 'OFFLINE', ok: false }));
        req.setTimeout(1000, () => { req.destroy(); resolve({ status: 'TIMEOUT', ok: false }); });
    });
}

function getLintSummary(dir) {
    try {
        const output = execSync('npx eslint "src/**/*.{js,jsx}" --format json', { 
            cwd: path.join(process.cwd(), dir), 
            stdio: ['pipe', 'pipe', 'ignore'],
            env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'false' }
        });
        return JSON.parse(output.toString());
    } catch (e) {
        if (e.stdout) return JSON.parse(e.stdout.toString());
        return [];
    }
}

async function runFullDebug() {
    console.log(`${colors.cyan}======================================================`);
    console.log(`🚀 AUDITORÍA MAESTRA DE SISTEMA - ICORE ICC`);
    console.log(`======================================================${colors.reset}\n`);

    // 1. CHEQUEO DE CONECTIVIDAD (RUNTIME)
    console.log(`${colors.magenta}[1/3] Verificando salud de servicios en vivo...${colors.reset}`);
    const services = [
        { name: 'Backend API', port: 3001, url: 'http://localhost:3001/api/health' },
        { name: 'Frontend App', port: 5173, url: 'http://localhost:5173' },
        { name: 'Standalone Calc', port: 3002, url: 'http://localhost:3002' },
        { name: 'Módulo Integrado', port: 5173, url: 'http://localhost:5173/cortocircuito/index.html' }
    ];

    for (const s of services) {
        const res = await checkUrl(s.url);
        const statusColor = res.ok ? colors.green : colors.red;
        console.log(`   - ${s.name.padEnd(18)}: ${statusColor}${res.status}${colors.reset} (${s.url})`);
    }

    // 2. ANÁLISIS DE CÓDIGO (ESTÁTICO)
    console.log(`\n${colors.magenta}[2/3] Analizando calidad de código y variables...${colors.reset}`);
    const frontendIssues = getLintSummary('frontend');
    const backendIssues = getLintSummary('backend');

    const showDetails = (issues, name) => {
        issues.forEach(f => {
            f.messages.forEach(m => {
                if (m.severity === 2) {
                    console.log(`${colors.red}   [ERROR] ${name}: ${path.relative(process.cwd(), f.filePath)}:${m.line} - ${m.message}${colors.reset}`);
                }
            });
        });
    };

    showDetails(frontendIssues, 'FRONTEND');
    showDetails(backendIssues, 'BACKEND');

    const countIssues = (issues) => {
        let errors = 0, warnings = 0, unused = 0;
        issues.forEach(f => {
            f.messages.forEach(m => {
                if (m.severity === 2) errors++;
                else warnings++;
                if (m.ruleId === 'no-unused-vars') unused++;
            });
        });
        return { errors, warnings, unused };
    };

    const fResults = countIssues(frontendIssues);
    const bResults = countIssues(backendIssues);

    console.log(`   FRONTEND: ${colors.red}${fResults.errors} Errores${colors.reset}, ${colors.yellow}${fResults.warnings} Warnings${colors.reset} (Unused: ${fResults.unused})`);
    console.log(`   BACKEND : ${colors.red}${bResults.errors} Errores${colors.reset}, ${colors.yellow}${bResults.warnings} Warnings${colors.reset} (Unused: ${bResults.unused})`);

    // 3. VERIFICACIÓN DE DEPENDENCIAS CRÍTICAS
    console.log(`\n${colors.magenta}[3/3] Verificando archivos de motor críticos...${colors.reset}`);
    const criticalFiles = [
        'frontend/src/store/graphStore.js',
        'backend/src/server.js',
        'icc-core/cortocircuito/index.html',
        'scripts/static-server.js'
    ];

    criticalFiles.forEach(file => {
        const exists = fs.existsSync(path.join(process.cwd(), file));
        console.log(`   - ${file.padEnd(35)}: ${exists ? colors.green + 'OK' : colors.red + 'FALTANTE'}${colors.reset}`);
    });

    console.log(`\n${colors.cyan}======================================================`);
    console.log(`✨ DIAGNÓSTICO FINALIZADO`);
    
    if (fResults.errors > 0 || bResults.errors > 0) {
        console.log(`${colors.red}❌ SE DETECTARON ERRORES CRÍTICOS DE SINTAXIS.`);
        console.log(`   Ejecuta 'npm run lint:check' para ver detalles.`);
    } else if (fResults.unused > 0 || bResults.unused > 0) {
        console.log(`${colors.yellow}⚠️  HAY VARIABLES SIN USAR.`);
        console.log(`   Ejecuta 'node scripts/fix-unused-vars.js' para limpiar.`);
    } else {
        console.log(`${colors.green}✅ SISTEMA EN ESTADO ÓPTIMO.`);
    }
    console.log(`${colors.cyan}======================================================${colors.reset}`);
}

runFullDebug().catch(err => {
    console.error('Error fatal en el diagnóstico:', err);
    process.exit(1);
});