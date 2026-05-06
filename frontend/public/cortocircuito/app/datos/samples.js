/**
 * Sample data and test cases for cortocircuito calculations
 */

const SampleData = {
    // Standard test systems
    systems: {
        residential: {
            name: "Sistema Residencial",
            params: {
                tension: 240,
                corriente: 20,
                fp: 0.95,
                longitud: 5,
                calibre: "12",
                temperatura: 25
            }
        },

        commercial: {
            name: "Sistema Comercial",
            params: {
                tension: 480,
                corriente: 100,
                fp: 0.9,
                longitud: 15,
                calibre: "350",
                temperatura: 30
            }
        },

        industrial: {
            name: "Sistema Industrial",
            params: {
                tension: 4160,
                corriente: 500,
                fp: 0.85,
                longitud: 50,
                calibre: "4/0",
                temperatura: 40
            }
        },

        utility: {
            name: "Sistema de Media Tensión",
            params: {
                tension: 13800,
                corriente: 1000,
                fp: 0.9,
                longitud: 100,
                calibre: "350",
                temperatura: 35
            }
        }
    },

    // Conductor database (simplified)
    conductors: {
        "Cu": {
            "350": { area: 177.3, resistance: 0.052, reactance: 0.082 },
            "4/0": { area: 107.2, resistance: 0.082, reactance: 0.091 },
            "3/0": { area: 85.0, resistance: 0.103, reactance: 0.095 },
            "2/0": { area: 67.4, resistance: 0.129, reactance: 0.099 },
            "1/0": { area: 53.5, resistance: 0.163, reactance: 0.103 },
            "12": { area: 3.31, resistance: 5.21, reactance: 0.122 }
        },
        "Al": {
            "350": { area: 177.3, resistance: 0.089, reactance: 0.082 },
            "4/0": { area: 107.2, resistance: 0.140, reactance: 0.091 }
        }
    },

    // Standard voltage levels
    voltages: [
        { name: "120/240V Residencial", value: 240 },
        { name: "480V Industrial", value: 480 },
        { name: "2.4kV Industrial", value: 2400 },
        { name: "4.16kV Industrial", value: 4160 },
        { name: "13.8kV Subtransmisión", value: 13800 },
        { name: "69kV Transmisión", value: 69000 },
        { name: "138kV Transmisión", value: 138000 },
        { name: "500kV Transmisión", value: 500000 }
    ],

    // Temperature correction factors
    temperatureFactors: {
        copper: {
            20: 1.0,
            25: 1.039,
            30: 1.079,
            40: 1.160,
            50: 1.242,
            60: 1.325,
            70: 1.409,
            80: 1.494,
            90: 1.580,
            100: 1.667
        },
        aluminum: {
            20: 1.0,
            25: 1.032,
            30: 1.065,
            40: 1.131,
            50: 1.198,
            60: 1.266,
            70: 1.335,
            80: 1.405,
            90: 1.476,
            100: 1.548
        }
    },

    // Test scenarios for validation
    testScenarios: [
        {
            name: "Escenario Básico",
            description: "Sistema trifásico estándar",
            params: {
                tension: 480,
                corriente: 100,
                fp: 0.9,
                longitud: 10,
                calibre: "350",
                temperatura: 30
            },
            expected: {
                I_3F_range: [10, 50], // kA
                V_drop_max: 5 // %
            }
        },
        {
            name: "Larga Distancia",
            description: "Sistema con cable largo",
            params: {
                tension: 480,
                corriente: 50,
                fp: 0.95,
                longitud: 500,
                calibre: "4/0",
                temperatura: 40
            },
            expected: {
                I_3F_range: [1, 10],
                V_drop_max: 15
            }
        },
        {
            name: "Alta Temperatura",
            description: "Sistema con alta temperatura ambiente",
            params: {
                tension: 480,
                corriente: 200,
                fp: 0.8,
                longitud: 20,
                calibre: "350",
                temperatura: 80
            },
            expected: {
                I_3F_range: [20, 100],
                V_drop_max: 8
            }
        }
    ]
};

// Export for use in other modules
window.SampleData = SampleData;