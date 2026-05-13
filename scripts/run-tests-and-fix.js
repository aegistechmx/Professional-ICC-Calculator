#!/usr/bin/env node
/**
 * Run Tests and Fix Script - PRO Edition
 * Executes tests safely without killing production services
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const NPM_CMD = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = process.argv.slice(2);

// Configuration
const CONFIG = {
  AUTO_FIX: args.includes('--auto-fix'),
  KILL_PORTS_AGGRESSIVE: false, // Don't kill backend ports
  TIMEOUT: 180000,              // 3 minutes for simulation projects
  API_CHECK_TIMEOUT: 5000       // 5 seconds for API health check
};
const KILL_PORTS_ONLY = args.includes('--kill-ports-only');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function runCommand(cmd, cwd, options = {}) {
  const defaultOptions = {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: true,
    timeout: CONFIG.TIMEOUT
  };

  try {
    const result = execSync(cmd, { ...defaultOptions, ...options });
    return { success: true, output: result, exitCode: 0 };
  } catch (error) {
    const stdout = error.stdout ? error.stdout.toString() : '';
    const stderr = error.stderr ? error.stderr.toString() : '';
    const combined = [stdout, stderr].filter(Boolean).join('\n').trim();

    return {
      success: false,
      output: combined || error.message,
      exitCode: error.status || 1
    };
  }
}

// Smart port cleanup - only frontend, never backend
function cleanupFrontendPorts() {
  if (CONFIG.KILL_PORTS_AGGRESSIVE) {
    log('⚠️  Aggressive port cleanup enabled (including 3001)', 'yellow');
  } else {
    log('🔍 Cleaning up frontend ports only (5173, 5174)...', 'cyan');
  }
  
  // Only frontend ports - NEVER backend (3001)
  const ports = CONFIG.KILL_PORTS_AGGRESSIVE 
    ? [3000, 3001, 3002, 5173, 5174]
    : [5173, 5174]; // Only frontend
  
  let killedCount = 0;
  
  ports.forEach(port => {
    try {
      const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = result.split('\n').filter(line => line.includes('LISTENING'));
      
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        
        if (pid && !isNaN(parseInt(pid))) {
          try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
            log(`   ✅ Killed process ${pid} on port ${port}`, 'gray');
            killedCount++;
          } catch (e) {
            // Process might have already exited
          }
        }
      });
    } catch (e) {
      // Port not in use, that's fine
    }
  });
  
  if (killedCount === 0) {
    log('   ℹ️  No conflicting frontend processes found', 'gray');
  }
  
  return killedCount;
}

// Check if backend API is running
function checkAPI() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3001/icc', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ running: true, data: json });
        } catch {
          resolve({ running: false, error: 'Invalid JSON response' });
        }
      });
    });
    
    req.on('error', () => {
      resolve({ running: false, error: 'Connection refused' });
    });
    
    req.setTimeout(CONFIG.API_CHECK_TIMEOUT, () => {
      req.destroy();
      resolve({ running: false, error: 'Timeout' });
    });
  });
}

// Start backend if not running
async function ensureBackendRunning() {
  const apiStatus = await checkAPI();
  
  if (apiStatus.running) {
    log('✅ Backend API already running on port 3001', 'green');
    return true;
  }
  
  log('⚠️  Backend not running. Attempting to start...', 'yellow');
  
  try {
    const backendPath = path.join(__dirname, '..', 'backend');
    const isWin = process.platform === 'win32';
    const spawnCommand = isWin ? 'cmd.exe' : NPM_CMD;
    const spawnArgs = isWin ? ['/c', 'npm.cmd', 'run', 'dev'] : ['run', 'dev'];

    const child = spawn(spawnCommand, spawnArgs, {
      cwd: backendPath,
      detached: true,
      stdio: 'ignore',
      shell: false
    });

    const startupError = await new Promise((resolve) => {
      child.on('error', (err) => resolve(err));
      child.on('spawn', () => resolve(null));
    });

    child.unref();

    if (startupError) {
      log(`❌ Error starting backend: ${startupError.message}`, 'red');
      return false;
    }

    log('⏳ Waiting for backend to start (5s)...', 'cyan');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const retry = await checkAPI();
    if (retry.running) {
      log('✅ Backend started successfully', 'green');
      return true;
    } else {
      log('❌ Backend failed to start', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error starting backend: ${error.message}`, 'red');
    return false;
  }
}

// Run frontend tests - use exit code (more reliable)
async function runFrontendTests() {
  log('\n🧪 Running Frontend Tests...', 'cyan');
  
  const frontendPath = path.join(__dirname, '..', 'frontend');
  const result = await runCommand(`${NPM_CMD} run test:run`, frontendPath);
  
  if (!result.success) {
    log('❌ Frontend tests failed', 'red');
    return { success: false, output: result.output };
  }

  const hasPassingTests = result.output.includes('passed') || 
                         result.output.includes('PASS') ||
                         result.output.includes('✓');
  
  if (hasPassingTests) {
    log('✅ Frontend tests passed', 'green');
    return { success: true, output: result.output };
  }

  log('ℹ️  No frontend tests found (add tests for better coverage)', 'gray');
  return { success: true, output: result.output };
}

// Run backend tests - use exit code (more reliable)
async function runBackendTests() {
  log('\n🧪 Running Backend Tests...', 'cyan');
  
  const backendPath = path.join(__dirname, '..', 'backend');
  const result = await runCommand(`${NPM_CMD} test`, backendPath);
  
  if (!result.success) {
    log('❌ Backend tests failed', 'red');
    return { success: false, output: result.output };
  }
  
  const hasPassingTests = result.output.includes('Test Suites:') && 
                         result.output.includes('passed');
  
  if (hasPassingTests) {
    log('✅ Backend tests passed', 'green');
    return { success: true, output: result.output };
  }

  log('ℹ️  No backend tests found (add tests for better coverage)', 'gray');
  return { success: true, output: result.output };
}

// Check and fix linting issues (auto-fix is optional)
async function runLinting() {
  log('\n🔍 Running Linting...', 'cyan');
  
  // Frontend linting
  const frontendResult = await runCommand(`${NPM_CMD} run lint`, path.join(__dirname, '..', 'frontend'));
  if (!frontendResult.success) {
    if (CONFIG.AUTO_FIX) {
      log('⚠️  Frontend lint errors found, attempting auto-fix...', 'yellow');
      await runCommand(`${NPM_CMD} run lint:fix`, path.join(__dirname, '..', 'frontend'));
      
      const recheck = await runCommand(`${NPM_CMD} run lint`, path.join(__dirname, '..', 'frontend'));
      if (!recheck.success) {
        log('   ❌ Some frontend lint errors require manual fixing', 'red');
      } else {
        log('   ✅ Frontend lint issues auto-fixed', 'green');
      }
    } else {
      log('   ⚠️  Frontend lint errors found (auto-fix disabled in CONFIG)', 'yellow');
      log('   💡 Run with AUTO_FIX=true or: npm run lint:fix', 'gray');
    }
  } else {
    log('   ✅ Frontend linting clean', 'green');
  }
  
  // Backend linting
  const backendResult = await runCommand(`${NPM_CMD} run lint`, path.join(__dirname, '..', 'backend'));
  if (!backendResult.success) {
    if (CONFIG.AUTO_FIX) {
      log('⚠️  Backend lint errors found, attempting auto-fix...', 'yellow');
      await runCommand(`${NPM_CMD} run lint:fix`, path.join(__dirname, '..', 'backend'));
      
      const recheck = await runCommand(`${NPM_CMD} run lint`, path.join(__dirname, '..', 'backend'));
      if (!recheck.success) {
        log('   ❌ Some backend lint errors require manual fixing', 'red');
      } else {
        log('   ✅ Backend lint issues auto-fixed', 'green');
      }
    } else {
      log('   ⚠️  Backend lint errors found (auto-fix disabled in CONFIG)', 'yellow');
      log('   💡 Run with AUTO_FIX=true or: cd backend && npm run lint:fix', 'gray');
    }
  } else {
    log('   ✅ Backend linting clean', 'green');
  }
}

// Main workflow - PRO Edition
async function main() {
  log('╔════════════════════════════════════════╗', 'cyan');
  log('║     RUN TESTS AND FIX WORKFLOW PRO     ║', 'cyan');
  log('╚════════════════════════════════════════╝', 'cyan');
  
  const startTime = Date.now();
  
  try {
    log('\n⚙️  CONFIGURATION:', 'gray');
    log(`   AUTO_FIX: ${CONFIG.AUTO_FIX}`, 'gray');
    log(`   KILL_PORTS_AGGRESSIVE: ${CONFIG.KILL_PORTS_AGGRESSIVE}`, 'gray');
    log(`   TIMEOUT: ${CONFIG.TIMEOUT}ms`, 'gray');
    
    // Step 1: Clean up ONLY frontend ports (never backend)
    log('\n🧹 Step 1: Cleaning environment...', 'cyan');
    const killed = cleanupFrontendPorts();
    if (killed > 0) {
      log(`   📝 Killed ${killed} frontend process(es)`, 'gray');
    }

    if (KILL_PORTS_ONLY) {
      log('\n✅ Port cleanup complete (kill-ports-only mode)', 'green');
      process.exit(0);
    }
    
    // Step 2: Ensure backend is running
    log('\n🔌 Step 2: Checking backend API...', 'cyan');
    const backendRunning = await ensureBackendRunning();
    if (!backendRunning) {
      log('   ⚠️  Warning: Backend may not be available for API tests', 'yellow');
    }
    
    // Step 3: Run linting (auto-fix is optional)
    log('\n🔍 Step 3: Running linting...', 'cyan');
    await runLinting();
    
    // Step 4: Run tests with proper exit code checking
    log('\n🧪 Step 4: Running tests...', 'cyan');
    const frontendResults = await runFrontendTests();
    const backendResults = await runBackendTests();
    
    // Step 5: Summary
    log('\n═══════════════════════════════════════════', 'cyan');
    log('📊 TEST SUMMARY', 'cyan');
    log('═══════════════════════════════════════════', 'cyan');
    
    if (frontendResults.success && backendResults.success) {
      log('✅ ALL TESTS PASSED', 'green');
    } else {
      log('❌ SOME TESTS FAILED', 'red');
      
      if (!frontendResults.success) {
        log('\n🔴 Frontend Issues:', 'red');
        log(frontendResults.output.slice(0, 500), 'gray');
      }
      
      if (!backendResults.success) {
        log('\n🔴 Backend Issues:', 'red');
        log(backendResults.output.slice(0, 500), 'gray');
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n⏱️  Duration: ${duration}s`, 'blue');
    
    // Exit with appropriate code
    process.exit(frontendResults.success && backendResults.success ? 0 : 1);
    
  } catch (error) {
    log(`\n💥 Workflow Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { 
  main, 
  runFrontendTests, 
  runBackendTests, 
  cleanupFrontendPorts,
  checkAPI,
  ensureBackendRunning 
};
