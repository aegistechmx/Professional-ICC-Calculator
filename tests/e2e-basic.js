// tests/e2e-basic.js
const { spawn } = require('child_process');
const http = require('http');

console.log('🧪 Iniciando pruebas End-to-End básicas...\n');

async function checkService(name, url, timeout = 10000) {
    return new Promise((resolve) => {
        const start = Date.now();
        const interval = setInterval(() => {
            http.get(url, (res) => {
                if (res.statusCode === 200 || res.statusCode === 304) {
                    clearInterval(interval);
                    console.log(`✅ ${name} → OK (${res.statusCode})`);
                    resolve(true);
                }
            }).on('error', () => {
                if (Date.now() - start > timeout) {
                    clearInterval(interval);
                    console.log(`❌ ${name} → No disponible`);
                    resolve(false);
                }
            });
        }, 1500);
    });
}

async function runE2E() {
    console.log('Verificando servicios...');

    const results = await Promise.all([
        checkService('Frontend', 'http://localhost:5173'),
        checkService('Backend', 'http://localhost:3001/health', 12000),
    ]);

    if (results.every(r => r)) {
        console.log('\n🎉 Pruebas End-to-End básicas PASADAS');
        console.log('Sistema listo para uso profesional.');
    } else {
        console.log('\n⚠️  Algunas pruebas fallaron. Revisa los logs.');
    }
}

runE2E();