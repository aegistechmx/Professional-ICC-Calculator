const BASE_URL = 'http://localhost:3000';

// Prueba 1: Health check
async function testHealth() {
    const response = await fetch(`${BASE_URL}/cortocircuito/health`);
    const data = await response.json();
    console.log('Health check:', data);
}

// Prueba 2: Cálculo de cortocircuito básico
async function testShortCircuit() {
    const testSystem = {
        nodes: [
            { id: 'trafo1', type: 'transformer', params: { kVA: 1000, Vprimario: 13800, Vsecundario: 480, Z: 5.5 } },
            { id: 'breaker1', type: 'breaker', params: { In: 1200, Icu: 25000 } },
            { id: 'panel1', type: 'panel', params: { nombre: 'Principal' } }
        ],
        connections: [
            { from: 'trafo1', to: 'breaker1' },
            { from: 'breaker1', to: 'panel1' }
        ]
    };

    const response = await fetch(`${BASE_URL}/cortocircuito/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testSystem)
    });
    const result = await response.json();
    console.log('Cálculo ICC:', result);
}

// Prueba 3: Validación de topología
async function testValidation() {
    const invalidSystem = {
        nodes: [
            { id: 'load1', type: 'load', params: { kW: 100 } },  // Error: carga sin fuente
            { id: 'gen1', type: 'generator', params: { kVA: 500 } }
        ],
        connections: [{ from: 'load1', to: 'gen1' }]  // Error: nadie alimenta generador
    };

    const response = await fetch(`${BASE_URL}/powerflow/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidSystem)
    });
    const result = await response.json();
    console.log('Validación (debe tener errores):', result);
}

// Ejecutar pruebas
testHealth();
setTimeout(() => testShortCircuit(), 1000);
setTimeout(() => testValidation(), 2000);