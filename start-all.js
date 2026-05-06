#!/usr/bin/env node

/**
 * start-all.js — Script Unificado y Robusto
 * icore-icc - Professional ICC Calculator
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

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
        await startProcess('BACKEND', backendDir, 'npm', ['run', 'dev'], ports.backend);

        // Espera breve para que el backend inicie
        await new Promise(r => setTimeout(r, 3000));

        // Frontend
        await startProcess('FRONTEND', frontendDir, 'npm', ['run', 'dev'], ports.frontend);

        // Standalone Cortocircuito (opcional)
        if (fs.existsSync(cortocircuitoDir)) {
            await startProcess('STANDALONE', cortocircuitoDir, 'npm', ['run', 'dev'], ports.standalone);
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