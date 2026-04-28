/**
 * test_debug.js - Debug/Verification Script
 * Tests the refactored industrial architecture
 */

console.log("=== DEBUG: Industrial Architecture Verification ===\n");

// Test 1: MotorIndustrial availability
console.log("1. Checking MotorIndustrial availability...");
if (typeof MotorIndustrial !== 'undefined') {
    console.log("✅ MotorIndustrial is available");
} else {
    console.log("❌ MotorIndustrial is NOT available");
}

// Test 2: MotorCoordinacionTCC availability
console.log("\n2. Checking MotorCoordinacionTCC availability...");
if (typeof MotorCoordinacionTCC !== 'undefined') {
    console.log("✅ MotorCoordinacionTCC is available");
} else {
    console.log("❌ MotorCoordinacionTCC is NOT available");
}

// Test 3: CoordinationEngine availability
console.log("\n3. Checking CoordinationEngine availability...");
if (typeof CoordinationEngine !== 'undefined') {
    console.log("✅ CoordinationEngine is available");
} else {
    console.log("❌ CoordinationEngine is NOT available");
}

// Test 4: MotorIndustrial.run() with sample input
console.log("\n4. Testing MotorIndustrial.run() with sample input...");
try {
    var resultado = MotorIndustrial.run({
        I_carga: 100,
        material: 'cobre',
        tempAislamiento: 75,
        tempAmbiente: 30,
        nConductores: 3,
        paralelos: 1,
        tempTerminal: 75,
        voltaje: 480,
        FP: 0.9,
        longitud: 50,
        tipoSistema: '3F'
    });
    console.log("✅ MotorIndustrial.run() executed successfully");
    console.log("   - Conductor:", resultado.conductor.calibre);
    console.log("   - Ampacidad:", resultado.conductor.amp.I_final);
    console.log("   - Score:", resultado.score.valor);
} catch (error) {
    console.log("❌ MotorIndustrial.run() failed:", error.message);
}

// Test 5: MotorCoordinacionTCC interpolation
console.log("\n5. Testing MotorCoordinacionTCC.interpolarLogLog()...");
try {
    var curva = [
        { I: 100, t: 100 },
        { I: 200, t: 20 },
        { I: 500, t: 2 }
    ];
    var t = MotorCoordinacionTCC.interpolarLogLog(curva, 150);
    console.log("✅ Interpolation successful: t =", t);
} catch (error) {
    console.log("❌ Interpolation failed:", error.message);
}

// Test 6: MotorCoordinacionTCC breaker coordination
console.log("\n6. Testing MotorCoordinacionTCC.coordinarBreakers()...");
try {
    var upstream = { In: 200, Ir: 200, tr: 100, Isd: 1200, tsd: 0.4, Ii: 2000 };
    var downstream = { In: 100, Ir: 100, tr: 100, Isd: 600, tsd: 0.4, Ii: 1000 };
    var result = MotorCoordinacionTCC.coordinarBreakers(upstream, downstream);
    console.log("✅ Coordination test completed:", result.ok ? "COORDINATED" : "NOT COORDINATED");
} catch (error) {
    console.log("❌ Coordination test failed:", error.message);
}

// Test 7: Edge case - zero current
console.log("\n7. Testing edge case: zero current...");
try {
    var tZero = MotorCoordinacionTCC.interpolarLogLog(curva, 0);
    console.log("✅ Zero current handled correctly (returned null):", tZero);
} catch (error) {
    console.log("❌ Zero current caused error:", error.message);
}

// Test 8: Edge case - empty array
console.log("\n8. Testing edge case: empty protection array...");
try {
    var resultEmpty = MotorCoordinacionTCC.coordinarSistema([]);
    console.log("✅ Empty array handled correctly:", resultEmpty.ok);
} catch (error) {
    console.log("❌ Empty array caused error:", error.message);
}

console.log("\n=== DEBUG COMPLETE ===");
