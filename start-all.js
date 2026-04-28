#!/usr/bin/env node

/**
 * start-all.js — Script para ejecutar frontend y backend simultáneamente
 * Professional ICC Calculator - Sistema completo
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`  ${title}`, 'bright');
    log(`${'='.repeat(60)}\n`, 'cyan');
}

// Verificar que existan los directorios
const frontendDir = path.join(__dirname, 'frontend');
const backendDir = path.join(__dirname, 'backend');
const cortocircuitoDir = path.join(__dirname, 'cortocircuito');

if (!fs.existsSync(frontendDir)) {
    log('❌ Directorio frontend no encontrado', 'red');
    process.exit(1);
}

if (!fs.existsSync(backendDir)) {
    log('❌ Directorio backend no encontrado', 'red');
    process.exit(1);
}

if (!fs.existsSync(cortocircuitoDir)) {
    log('❌ Directorio cortocircuito no encontrado', 'red');
    process.exit(1);
}

// Función para iniciar proceso
function startProcess(name, cwd, command, args = [], port = null) {
    return new Promise((resolve, reject) => {
        log(`🚀 Iniciando ${name}...`, 'yellow');
        
        const process = spawn(command, args, {
            cwd: cwd,
            stdio: 'pipe',
            shell: true
        });

        process.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                log(`[${name}] ${output}`, 'blue');
            }
        });

        process.stderr.on('data', (data) => {
            const output = data.toString().trim();
            if (output && !output.includes('WARN')) {
                log(`[${name}] ${output}`, 'red');
            } else if (output) {
                log(`[${name}] ${output}`, 'yellow');
            }
        });

        process.on('error', (error) => {
            log(`❌ Error iniciando ${name}: ${error.message}`, 'red');
            reject(error);
        });

        process.on('close', (code) => {
            if (code !== 0) {
                log(`❌ ${name} terminó con código ${code}`, 'red');
            } else {
                log(`✅ ${name} terminado correctamente`, 'green');
            }
        });

        // Esperar un momento y verificar si el puerto está disponible
        setTimeout(() => {
            if (port) {
                resolve({ process, port });
            } else {
                resolve({ process });
            }
        }, 3000);
    });
}

// Función para verificar si un puerto está en uso
function checkPort(port) {
    return new Promise((resolve) => {
        const net = require('net');
        const server = net.createServer();
        
        server.listen(port, () => {
            server.once('close', () => {
                resolve(true); // Puerto disponible
            });
            server.close();
        });
        
        server.on('error', () => {
            resolve(false); // Puerto en uso
        });
    });
}

// Función principal
async function main() {
    logSection('PROFESSIONAL ICC CALCULATOR - INICIO COMPLETO');
    log('🎯 Iniciando sistema completo:', 'bright');
    log('   • Frontend (React/Vite)', 'green');
    log('   • Backend (Node.js/Express)', 'green');
    log('   • Cortocircuito (HTML/JavaScript)', 'green');
    log('\n⏱️  Esperando a que los servicios inicien...\n');

    try {
        // Verificar puertos
        const frontendPort = 5173;
        const backendPort = 3001;
        const cortocircuitoPort = 3002;

        const frontendAvailable = await checkPort(frontendPort);
        const backendAvailable = await checkPort(backendPort);
        const cortocircuitoAvailable = await checkPort(cortocircuitoPort);

        if (!frontendAvailable) {
            log(`⚠️  Puerto ${frontendPort} ya está en uso (frontend)`, 'yellow');
        }
        if (!backendAvailable) {
            log(`⚠️  Puerto ${backendPort} ya está en uso (backend)`, 'yellow');
        }
        if (!cortocircuitoAvailable) {
            log(`⚠️  Puerto ${cortocircuitoPort} ya está en uso (cortocircuito)`, 'yellow');
        }

        // Iniciar procesos
        const processes = [];

        // 1. Backend
        try {
            const backend = await startProcess(
                'BACKEND',
                backendDir,
                'npm',
                ['run', 'dev'],
                backendPort
            );
            processes.push(backend);
        } catch (error) {
            log('❌ No se pudo iniciar el backend', 'red');
        }

        // 2. Frontend
        try {
            const frontend = await startProcess(
                'FRONTEND',
                frontendDir,
                'npm',
                ['run', 'dev'],
                frontendPort
            );
            processes.push(frontend);
        } catch (error) {
            log('❌ No se pudo iniciar el frontend', 'red');
        }

        // 3. Cortocircuito (servidor estático)
        try {
            const cortocircuito = await startProcess(
                'CORTOCIRCUITO',
                cortocircuitoDir,
                'npx',
                ['serve', '-l', '3000'],
                cortocircuitoPort
            );
            processes.push(cortocircuito);
        } catch (error) {
            log('❌ No se pudo iniciar el servidor de cortocircuito', 'red');
        }

        // Esperar un momento para que todo inicie
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Mostrar URLs de acceso
        logSection('SERVICIOS INICIADOS');
        
        if (frontendAvailable) {
            log('🌐 Frontend:', 'green');
            log(`   http://localhost:${frontendPort}`, 'bright');
        }
        
        if (backendAvailable) {
            log('⚙️  Backend API:', 'green');
            log(`   http://localhost:${backendPort}`, 'bright');
        }
        
        if (cortocircuitoAvailable) {
            log('⚡ Cortocircuito:', 'green');
            log(`   http://localhost:${cortocircuitoPort}`, 'bright');
        }

        log('\n📋 Instrucciones:', 'yellow');
        log('   • Presiona Ctrl+C para detener todos los servicios');
        log('   • Los logs se mostrarán en esta consola');
        log('   • Revisa las URLs arriba para acceder a cada interfaz\n');

        // Manejar cierre limpio
        process.on('SIGINT', () => {
            log('\n\n🛑 Deteniendo todos los servicios...', 'yellow');
            
            processes.forEach(({ process }, index) => {
                if (process && !process.killed) {
                    log(`   Deteniendo proceso ${index + 1}...`, 'cyan');
                    process.kill('SIGTERM');
                }
            });
            
            setTimeout(() => {
                log('✅ Todos los servicios detenidos', 'green');
                process.exit(0);
            }, 2000);
        });

        // Mantener el script corriendo
        log('🔄 Sistema en ejecución... (Ctrl+C para detener)\n', 'green');

    } catch (error) {
        log(`❌ Error general: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Ejecutar
if (require.main === module) {
    main();
}

module.exports = { main };
