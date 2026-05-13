#!/usr/bin/env node

/**
 * start-all.js — Script Unificado y Robusto
 * icore-icc - Professional ICC Calculator
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');

const colors = {
    reset: '\x1b[0m', bright: '\x1b[1m',
    red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
    blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSection(title) {
    log(`\n${'='.repeat(70)}`, 'cyan');
    log(`  ${title}`, 'bright');
    log(`${'='.repeat(70)}\n`, 'cyan');
}

// Rutas
const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');
const cortocircuitoDir = path.join(rootDir, 'icc-core', 'cortocircuito');
const staticServerScript = path.join(rootDir, 'scripts', 'static-server.js');
const NPM_CMD = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const NODE_CMD = process.execPath;

const processes = [];

// Verificar directorios
if (!fs.existsSync(frontendDir)) {
    log('❌ Directorio "frontend" no encontrado', 'red');
    process.exit(1);
}
if (!fs.existsSync(backendDir)) {
    log('❌ Directorio "backend" no encontrado', 'red');
    process.exit(1);
}

/**
 * Verifica si una URL responde con un estado exitoso (200-399)
 * Implementa un sistema de reintentos para dar tiempo a que los servidores se inicialicen completamente.
 */
async function checkUrl(url, retries = 15, interval = 1000) {
    for (let i = 0; i < retries; i++) {
        const online = await new Promise((resolve) => {
            const req = http.get(url, (res) => {
                resolve(res.statusCode >= 200 && res.statusCode < 400);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            req.setTimeout(1500);
        });
        if (online) return true;
        if (i < retries - 1) await new Promise(r => setTimeout(r, interval));
    }
    return false;
}

function isPortAvailable(port) {
    return new Promise(resolve => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port);
    });
}

async function startProcess(name, cwd, command, args, expectedPort) {
    log(`🚀 Iniciando ${name}...`, 'yellow');

    const proc = spawn(command, args, {
        cwd,
        stdio: 'pipe',
        shell: true
    });

    proc.stdout.on('data', data => {
        const text = data.toString().trim();
        if (text) log(`[${name}] ${text}`, 'blue');
    });

    proc.stderr.on('data', data => {
        const text = data.toString().trim();
        if (text) log(`[${name}] ${text}`, text.includes('error') ? 'red' : 'yellow');
    });

    proc.on('error', err => {
        log(`❌ Error al iniciar ${name}: ${err.message}`, 'red');
    });

    if (expectedPort) {
        setTimeout(async () => {
            const available = await isPortAvailable(expectedPort);
            if (!available) {
                log(`✅ ${name} parece estar corriendo en http://localhost:${expectedPort}`, 'green');
            }
        }, 4000);
    }

    processes.push({ name, process: proc });
    return proc;
}

async function main() {
    logSection('ICORE-ICC - INICIO COMPLETO DEL SISTEMA');

    // Verificar puertos
    const ports = { frontend: 5173, backend: 3001, standalone: 3002 };
    for (const [service, port] of Object.entries(ports)) {
        const available = await isPortAvailable(port);
        if (!available) {
            log(`⚠️  Puerto ${port} (${service}) ya está en uso`, 'yellow');
        }
    }

    try {
        // Backend primero
        await startProcess('BACKEND', backendDir, NPM_CMD, ['run', 'dev'], ports.backend);

        // Frontend
        await startProcess('FRONTEND', frontendDir, NPM_CMD, ['run', 'dev'], ports.frontend);

        // Iniciar el servidor estático para el módulo standalone
        await startProcess('STANDALONE', rootDir, NPM_CMD, ['run', 'standalone'], ports.standalone);

        log('\n🔍 Realizando Health Checks (con reintentos)...', 'yellow');
        const checks = [
            { name: 'Backend API', url: `http://localhost:${ports.backend}/api/health` },
            { name: 'Frontend App', url: `http://localhost:${ports.frontend}` },
            { name: 'Standalone Calc', url: `http://localhost:${ports.standalone}` },
            { name: 'Módulo Integrado', url: `http://localhost:${ports.frontend}/cortocircuito/index.html` }
        ];

        for (const check of checks) {
            const online = await checkUrl(check.url);
            if (online) {
                log(`   [OK] ${check.name} respondiendo correctamente`, 'green');
            } else {
                log(`   [FAIL] ${check.name} no responde en ${check.url}`, 'red');
            }
        }

        logSection('✅ SISTEMA INICIADO CORRECTAMENTE');

        log('🌐 **Accesos rápidos:**', 'green');
        log(`   Frontend (Editor)     → http://localhost:${ports.frontend}`, 'bright');
        log(`   Backend API           → http://localhost:${ports.backend}`, 'bright');
        if (fs.existsSync(cortocircuitoDir)) {
            log(`   Calculadora Standalone → http://localhost:${ports.standalone}`, 'bright');
        }

        log('\n📌 Presiona Ctrl+C para detener todos los servicios', 'yellow');

        // Manejo limpio de cierre
        process.on('SIGINT', () => {
            log('\n🛑 Deteniendo todos los servicios...', 'yellow');
            processes.forEach(({ name, process }) => {
                if (process && !process.killed) {
                    log(`   Deteniendo ${name}...`, 'cyan');
                    process.kill('SIGTERM');
                }
            });
            setTimeout(() => process.exit(0), 1500);
        });

    } catch (err) {
        log(`❌ Error crítico: ${err.message}`, 'red');
        process.exit(1);
    }
}

// Ejecutar
if (require.main === module) {
    main();
}

module.exports = { main };