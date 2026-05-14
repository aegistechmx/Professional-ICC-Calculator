#!/usr/bin/env node

/**
 * start-all.js — Script Unificado y Robusto
 * ICORE-ICC - Professional ICC Calculator
 *
 * Correcciones:
 * - No arranca backend/frontend si el puerto ya está ocupado y el servicio responde.
 * - Evita EADDRINUSE en 3001/5173.
 * - Health checks reales.
 * - Ctrl+C solo mata procesos iniciados por este script.
 * - Muestra comandos claros para limpiar puertos si hay servicios atorados.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(70)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(70)}\n`, 'cyan');
}

const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');
const cortocircuitoDir = path.join(rootDir, 'icc-core', 'cortocircuito');
const NPM_CMD = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const USE_SHELL = process.platform === 'win32';

const ports = {
  frontend: Number(process.env.FRONTEND_PORT || 5173),
  backend: Number(process.env.BACKEND_PORT || 3001)
};

const processes = [];

function assertDir(dir, label) {
  if (!fs.existsSync(dir)) {
    log(`❌ Directorio "${label}" no encontrado: ${dir}`, 'red');
    process.exit(1);
  }
}

/**
 * Verifica si una URL responde con un estado exitoso (200-399)
 * Implementa un sistema de reintentos para dar tiempo a que los servidores se inicialicen completamente.
 */
async function checkUrl(url, retries = 1, interval = 500) {
  try {
    for (let i = 0; i < retries; i++) {
      const online = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          res.resume();
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
        req.setTimeout(1500);
      });

      if (online) return true;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, interval));
    }

    return false;
  } catch (err) {
    log(`❌ Error en checkUrl(${url}): ${err.message}`, 'red');
    return false;
  }
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '0.0.0.0');
  });
}

async function classifyService(name, port, healthUrl) {
  try {
    const available = await isPortAvailable(port);

    if (available) {
      return {
        port,
        available: true,
        online: false,
        status: 'FREE'
      };
    }

    const online = await checkUrl(healthUrl, 2, 500);

    return {
      port,
      available: false,
      online,
      status: online ? 'RUNNING' : 'BUSY_UNKNOWN'
    };
  } catch (err) {
    log(`❌ Error al clasificar ${name} (puerto ${port}): ${err.message}`, 'red');
    return { port, available: false, online: false, status: 'BUSY_UNKNOWN' };
  }
}

async function startProcess(name, cwd, command, args, expectedPort) {
  try {
    log(`🚀 Iniciando ${name}...`, 'yellow');

    const spawnCommand = USE_SHELL ? [command, ...args].join(' ') : command;
    const spawnArgs = USE_SHELL ? [] : args;

    const proc = spawn(spawnCommand, spawnArgs, {
      cwd,
      stdio: 'pipe',
      shell: USE_SHELL,
      env: {
        ...process.env,
        PORT: expectedPort ? String(expectedPort) : process.env.PORT
      }
    });

    proc.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text) log(`[${name}] ${text}`, 'blue');
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (!text) return;

      const lower = text.toLowerCase();
      const color = lower.includes('error') || lower.includes('eaddrinuse') ? 'red' : 'yellow';
      log(`[${name}] ${text}`, color);
    });

    proc.on('error', (err) => {
      log(`❌ Error al iniciar ${name}: ${err.message}`, 'red');
    });

    proc.on('exit', (code, signal) => {
      if (code !== 0 && signal !== 'SIGTERM') {
        log(`⚠️ ${name} terminó con código ${code ?? 'N/A'} señal ${signal ?? 'N/A'}`, 'yellow');
      }
    });

    processes.push({ name, process: proc });
    return proc;
  } catch (err) {
    log(`❌ Error crítico al iniciar ${name}: ${err.message}`, 'red');
    throw err;
  }
}

async function waitForService(name, url, retries = 25) {
  const ok = await checkUrl(url, retries, 800);
  if (ok) {
    log(`   [OK] ${name} respondiendo correctamente`, 'green');
  } else {
    log(`   [FAIL] ${name} no responde en ${url}`, 'red');
  }
  return ok;
}

function printPortHelp() {
  log('\n🧹 Si un puerto quedó atorado, puedes limpiar Node con:', 'yellow');
  log('   PowerShell: Stop-Process -Name node -Force', 'bright');
  log('\nO revisar quién usa el puerto:', 'yellow');
  log('   netstat -ano | findstr :3001', 'bright');
  log('   netstat -ano | findstr :5173', 'bright');
}

async function main() {
  try {
    logSection('ICORE-ICC - INICIO COMPLETO DEL SISTEMA');

    assertDir(frontendDir, 'frontend');
    assertDir(backendDir, 'backend');

    const backendHealth = `http://localhost:${ports.backend}/api/health`;
    const frontendHealth = `http://localhost:${ports.frontend}`;

    const backendState = await classifyService('BACKEND', ports.backend, backendHealth);
    const frontendState = await classifyService('FRONTEND', ports.frontend, frontendHealth);

    if (backendState.status === 'RUNNING') {
      log(`✅ BACKEND ya está corriendo en http://localhost:${ports.backend}`, 'green');
    } else if (backendState.status === 'BUSY_UNKNOWN') {
      log(`⚠️ Puerto ${ports.backend} ocupado, pero /api/health no responde. No iniciaré otro backend para evitar EADDRINUSE.`, 'yellow');
      printPortHelp();
    } else {
      await startProcess('BACKEND', backendDir, NPM_CMD, ['run', 'dev'], ports.backend);
    }

    if (frontendState.status === 'RUNNING') {
      log(`✅ FRONTEND ya está corriendo en http://localhost:${ports.frontend}`, 'green');
    } else if (frontendState.status === 'BUSY_UNKNOWN') {
      log(`⚠️ Puerto ${ports.frontend} ocupado, pero frontend no responde. No iniciaré otro Vite para evitar EADDRINUSE.`, 'yellow');
      printPortHelp();
    } else {
      await startProcess('FRONTEND', frontendDir, NPM_CMD, ['run', 'dev'], ports.frontend);
    }

    log('\n🔍 Realizando Health Checks finales...', 'yellow');

    await waitForService('Backend API', backendHealth);
    await waitForService('Frontend App', frontendHealth);

    const integratedUrl = `http://localhost:${ports.frontend}/cortocircuito/index.html`;
    if (fs.existsSync(cortocircuitoDir) || fs.existsSync(path.join(frontendDir, 'public', 'cortocircuito'))) {
      await waitForService('Módulo ICC integrado', integratedUrl, 5);
    }

    logSection('✅ SISTEMA LISTO');

    log('🌐 Accesos rápidos:', 'green');
    log(`   Frontend (Editor)     → http://localhost:${ports.frontend}`, 'bright');
    log(`   Backend API           → http://localhost:${ports.backend}`, 'bright');
    log(`   Health Check          → http://localhost:${ports.backend}/api/health`, 'bright');
    log(`   Módulo ICC integrado  → ${integratedUrl}`, 'bright');

    log('\n📌 Presiona Ctrl+C para detener SOLO los servicios iniciados por este script.', 'yellow');

    process.on('SIGINT', () => {
      log('\n🛑 Deteniendo servicios iniciados por este script...', 'yellow');

      for (const item of processes) {
        const proc = item.process;
        if (proc && !proc.killed) {
          log(`   Deteniendo ${item.name}...`, 'cyan');
          proc.kill('SIGTERM');
        }
      }

      setTimeout(() => process.exit(0), 1200);
    });
  } catch (err) {
    log(`❌ Error crítico: ${err.message}`, 'red');
    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  main().catch((err) => {
    log(`❌ Error crítico: ${err.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  main,
  checkUrl,
  isPortAvailable,
  classifyService
};
