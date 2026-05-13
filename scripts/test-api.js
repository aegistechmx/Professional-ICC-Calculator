const http = require('http');

const testSystem = {
    nodes: [
        {
            id: 'source1',
            type: 'source',
            position: { x: 100, y: 100 },
            data: { label: 'Fuente Principal', voltage: 480, isc: 25000 },
        },
        {
            id: 'P0',
            type: 'panel',
            position: { x: 300, y: 100 },
            data: { label: 'Panel Principal', voltage: 480, I_carga: 100, protection: { tipo: 'breaker', In: 100, Icu: 10000 } },
        },
        {
            id: 'load1',
            type: 'load',
            position: { x: 500, y: 100 },
            data: { label: 'Carga 1', voltage: 480, I_carga: 50 },
        },
    ],
    edges: [
        { id: 'e-source1-P0', source: 'source1', target: 'P0', data: { length: 10, material: 'Cu', size: '4/0', impedance: 0.05 } },
        { id: 'e-P0-load1', source: 'P0', target: 'load1', data: { length: 5, material: 'Cu', size: '1/0', impedance: 0.02 } },
    ],
    estado: { tension: 220, modo: 'conocido', tipoSistema: '3f', isc_conocido: 10, trafo_kva: 500, trafo_z: 5.75, trafo_vp: 13200, trafo_vs: 220 },
    ui: { tension: 220, isc_conocido: 10, trafo_kva: 500 },
};

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bright: '\x1b[1m'
};

const API_URL = 'http://localhost:3001';

// Definición de casos de prueba con datos válidos para el motor
const testCases = [
    {
        name: 'Root Status Page',
        path: '/',
        method: 'GET',
        expectedStatus: 200,
        expectedType: 'text/html'
    },
    {
        name: 'Health Check',
        path: '/api/health',
        method: 'GET',
        expectedStatus: 200
    },
    {
        name: 'ICC Basic (Standard Params)',
        path: '/api/icc',
        method: 'POST',
        body: { V: 480, Z: 0.05 }, // Usando V y Z explícitamente
        expectedStatus: 200
    },
    {
        name: 'ICC Feeder Validation',
        path: '/api/icc',
        method: 'POST',
        body: { material: 'Cu', size: '4/0', I_base: 200 },
        expectedStatus: 200
    },
    {
        name: 'Cortocircuito Calculation',
        path: '/api/cortocircuito/calculate',
        method: 'POST',
        body: {
            nodes: [
                { id: 'T1', type: 'transformer', data: { label: 'Trafo', voltage: 480, kva: 500 } },
                { id: 'P1', type: 'panel', data: { label: 'Panel', voltage: 480, I_carga: 100 } }
            ],
            edges: [], // Añadido para satisfacer la desestructuración y validación
            systemMode: 'normal' 
        },
        expectedStatus: 200
    },
    {
        name: 'Full System Analysis',
        path: '/api/analyze',
        method: 'POST',
        body: testSystem, // Usando un modelo de sistema completo para una prueba más realista
        expectedStatus: 200
    },
    {
        name: '404 JSON Handler',
        path: '/api/not-an-endpoint',
        method: 'GET',
        expectedStatus: 404
    }
];

async function performRequest(test) {
    return new Promise((resolve) => {
        const url = new URL(test.path, API_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: test.method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const contentType = res.headers['content-type'] || '';
                const isJson = contentType.includes('application/json');
                const isHtml = contentType.includes('text/html');
                
                let parsed = null;
                let validJson = false;
                
                if (isJson) {
                    try {
                        parsed = JSON.parse(data);
                        validJson = true;
                    } catch (e) {}
                }

                let success = res.statusCode === test.expectedStatus;
                if (test.expectedType === 'text/html') {
                    success = success && isHtml && data.includes('ICORE-ICC API');
                } else {
                    success = success && isJson && validJson;
                }

                resolve({
                    name: test.name,
                    status: res.statusCode,
                    expectedStatus: test.expectedStatus,
                    success
                });
            });
        });

        req.on('error', (e) => resolve({ name: test.name, error: e.message, success: false }));
        if (test.body) req.write(JSON.stringify(test.body));
        req.end();
    });
}

async function runAllTests() {
    console.log(`${colors.bright}${colors.cyan}=== API ENDPOINT VALIDATOR ===${colors.reset}\n`);
    
    for (const test of testCases) {
        const result = await performRequest(test);
        const icon = result.success ? '✅' : '❌';
        const color = result.success ? colors.green : colors.red;
        
        console.log(`${icon} ${test.name.padEnd(30)} [${test.method}] ${test.path}`);
        if (!result.success) {
            console.log(`   └─ ${colors.yellow}Error:${colors.reset} Status ${result.status} (Exp: ${result.expectedStatus}), JSON: ${result.validJson ? 'Sí' : 'No'}`);
            if (result.error) console.log(`   └─ ${colors.red}Conn Error: ${result.error}${colors.reset}`);
        }
    }
    console.log(`\n${colors.cyan}==============================${colors.reset}`);
}

runAllTests().catch(console.error);