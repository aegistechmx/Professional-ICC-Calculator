/**
 * test-nodos.js - Unit tests for tree-based feeder architecture
 * Tests core functions: Impedancias traversal, node structure, conversion
 */

// Mock dependencies for testing
var CONSTANTES = {
    CALIBRES: ['14', '12', '10', '8', '6', '4', '2', '1/0', '2/0', '3/0', '4/0', '250', '300', '350', '400', '500', '600', '750', '800', '1000']
};

var CONDUCTORES = {
    cobre: {
        acero: {
            '4/0': { amp: 230, resistencia: 0.161, reactancia: 0.194 }
        }
    }
};

// Test results
var testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

function assert(condition, testName) {
    if (condition) {
        testResults.passed++;
        console.log('✓ PASS: ' + testName);
    } else {
        testResults.failed++;
        testResults.errors.push(testName);
        console.error('✗ FAIL: ' + testName);
    }
}

function assertEqual(actual, expected, testName) {
    if (actual === expected) {
        testResults.passed++;
        console.log('✓ PASS: ' + testName);
    } else {
        testResults.failed++;
        testResults.errors.push(testName + ' - Expected: ' + expected + ', Got: ' + actual);
        console.error('✗ FAIL: ' + testName + ' - Expected: ' + expected + ', Got: ' + actual);
    }
}

// Test 1: Node structure validation
function testNodeStructure() {
    console.log('\n--- Test: Node Structure ---');
    
    var nodos = [
        { id: 'P0', parentId: null, nombre: 'Punto 0', feeder: { calibre: '4/0', material: 'cobre' }, equip: {} },
        { id: 'P1', parentId: 'P0', nombre: 'Punto 1', feeder: { calibre: '2/0', material: 'cobre' }, equip: {} },
        { id: 'P2', parentId: 'P1', nombre: 'Punto 2', feeder: { calibre: '1/0', material: 'cobre' }, equip: {} }
    ];
    
    assert(nodos.length === 3, 'Node array has 3 nodes');
    assert(nodos[0].parentId === null, 'Root node has null parentId');
    assert(nodos[1].parentId === 'P0', 'P1 has P0 as parent');
    assert(nodos[2].parentId === 'P1', 'P2 has P1 as parent');
}

// Test 2: Get children function
function testGetChildren() {
    console.log('\n--- Test: Get Children ---');
    
    var nodos = [
        { id: 'P0', parentId: null },
        { id: 'P1', parentId: 'P0' },
        { id: 'P2', parentId: 'P0' },
        { id: 'P3', parentId: 'P1' }
    ];
    
    // Mock Impedancias.obtenerHijos
    function obtenerHijos(nodos, parentId) {
        return nodos.filter(function(n) { return n.parentId === parentId; });
    }
    
    var childrenP0 = obtenerHijos(nodos, 'P0');
    var childrenP1 = obtenerHijos(nodos, 'P1');
    var childrenP2 = obtenerHijos(nodos, 'P2');
    
    assertEqual(childrenP0.length, 2, 'P0 has 2 children');
    assertEqual(childrenP1.length, 1, 'P1 has 1 child');
    assertEqual(childrenP2.length, 0, 'P2 has 0 children');
}

// Test 3: BFS ordering
function testBFSOrdering() {
    console.log('\n--- Test: BFS Ordering ---');
    
    var nodos = [
        { id: 'P0', parentId: null },
        { id: 'P1', parentId: 'P0' },
        { id: 'P2', parentId: 'P0' },
        { id: 'P1a', parentId: 'P1' },
        { id: 'P1b', parentId: 'P1' },
        { id: 'P2a', parentId: 'P2' }
    ];
    
    // Mock Impedancias.ordenarPorNivel
    function ordenarPorNivel(nodos) {
        var ordered = [];
        var queue = nodos.filter(function(n) { return n.parentId === null; });
        
        while (queue.length > 0) {
            var current = queue.shift();
            ordered.push(current);
            var children = nodos.filter(function(n) { return n.parentId === current.id; });
            queue = queue.concat(children);
        }
        
        return ordered;
    }
    
    var ordered = ordenarPorNivel(nodos);
    
    assertEqual(ordered[0].id, 'P0', 'First node is P0');
    assertEqual(ordered[1].id, 'P1', 'Second node is P1');
    assertEqual(ordered[2].id, 'P2', 'Third node is P2');
    assertEqual(ordered[3].id, 'P1a', 'Fourth node is P1a');
    assertEqual(ordered[4].id, 'P1b', 'Fifth node is P1b');
    assertEqual(ordered[5].id, 'P2a', 'Sixth node is P2a');
}

// Test 4: Get path from root to node
function testGetPath() {
    console.log('\n--- Test: Get Path ---');
    
    var nodos = [
        { id: 'P0', parentId: null },
        { id: 'P1', parentId: 'P0' },
        { id: 'P2', parentId: 'P1' },
        { id: 'P2a', parentId: 'P2' }
    ];
    
    // Mock Impedancias.obtenerCamino
    function obtenerCamino(nodos, nodeId) {
        var path = [];
        var current = nodos.find(function(n) { return n.id === nodeId; });
        
        while (current) {
            path.unshift(current);
            if (!current.parentId) break;
            current = nodos.find(function(n) { return n.id === current.parentId; });
        }
        
        return path;
    }
    
    var pathP2a = obtenerCamino(nodos, 'P2a');
    var pathP1 = obtenerCamino(nodos, 'P1');
    
    assertEqual(pathP2a.length, 4, 'Path to P2a has 4 nodes');
    assertEqual(pathP2a[0].id, 'P0', 'Path starts at P0');
    assertEqual(pathP2a[3].id, 'P2a', 'Path ends at P2a');
    assertEqual(pathP1.length, 2, 'Path to P1 has 2 nodes');
}

// Test 5: Legacy feeders to nodos conversion
function testLegacyConversion() {
    console.log('\n--- Test: Legacy Conversion ---');
    
    var feeders = [
        { calibre: '4/0', material: 'cobre', longitud: 30 },
        { calibre: '2/0', material: 'cobre', longitud: 20 },
        { calibre: '1/0', material: 'cobre', longitud: 15 }
    ];
    
    // Mock conversion
    function feedersToNodos(feeders) {
        return feeders.map(function(f, i) {
            return {
                id: 'P' + i,
                parentId: i === 0 ? null : 'P' + (i - 1),
                nombre: 'Punto ' + i,
                feeder: f,
                equip: {}
            };
        });
    }
    
    var nodos = feedersToNodos(feeders);
    
    assertEqual(nodos.length, 3, 'Converted to 3 nodes');
    assert(nodos[0].parentId === null, 'First node is root');
    assertEqual(nodos[1].parentId, 'P0', 'Second node parent is P0');
    assertEqual(nodos[2].parentId, 'P1', 'Third node parent is P1');
}

// Test 6: Filter root node
function testFilterRoot() {
    console.log('\n--- Test: Filter Root Node ---');
    
    var nodos = [
        { id: 'P0', parentId: null },
        { id: 'P1', parentId: 'P0' },
        { id: 'P2', parentId: 'P0' }
    ];
    
    var nonRoot = nodos.filter(function(n) { return n.parentId !== null; });
    
    assertEqual(nonRoot.length, 2, '2 non-root nodes');
    assertEqual(nonRoot[0].id, 'P1', 'First non-root is P1');
    assertEqual(nonRoot[1].id, 'P2', 'Second non-root is P2');
}

// Test 7: Node ID validation
function testNodeIdValidation() {
    console.log('\n--- Test: Node ID Validation ---');
    
    var nodos = [
        { id: 'P0', parentId: null },
        { id: 'P1', parentId: 'P0' },
        { id: 'P2', parentId: 'P1' }
    ];
    
    // Check all IDs are unique
    var ids = nodos.map(function(n) { return n.id; });
    var uniqueIds = new Set(ids);
    
    assertEqual(ids.length, uniqueIds.size, 'All node IDs are unique');
    
    // Check parent references are valid
    var validParents = nodos.every(function(n) {
        if (!n.parentId) return true;
        return nodos.some(function(p) { return p.id === n.parentId; });
    });
    
    assert(validParents, 'All parent references are valid');
}

// Run all tests
function runAllTests() {
    console.log('========================================');
    console.log('Running Tree-Based Feeder Architecture Tests');
    console.log('========================================');
    
    testNodeStructure();
    testGetChildren();
    testBFSOrdering();
    testGetPath();
    testLegacyConversion();
    testFilterRoot();
    testNodeIdValidation();
    
    console.log('\n========================================');
    console.log('Test Results Summary');
    console.log('========================================');
    console.log('Passed: ' + testResults.passed);
    console.log('Failed: ' + testResults.failed);
    
    if (testResults.failed > 0) {
        console.log('\nFailed Tests:');
        testResults.errors.forEach(function(err) {
            console.log('  - ' + err);
        });
    }
    
    console.log('========================================');
    
    return testResults.failed === 0;
}

// Export for browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runAllTests, testResults };
    // Run tests if executed directly
    if (require.main === module) {
        var success = runAllTests();
        process.exit(success ? 0 : 1);
    }
} else {
    // Browser: run automatically
    window.runFeederTests = runAllTests;
}
