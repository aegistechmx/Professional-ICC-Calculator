// Datos de equipos eléctricos - Base de datos actualizada con especificaciones Square D
var EQUIPOS = {
    // Square D - Serie QO (Termomagnéticos - 10kA @ 480V)
    sqd_qo: {
        nombre: 'Square D - QO',
        marca: 'Square D',
        serie: 'QO',
        modelos: [
            { nombre: 'QO315', cap: 10, amp: 15, marco: 'QO', disparo: 'termomagnetico' },
            { nombre: 'QO320', cap: 10, amp: 20, marco: 'QO', disparo: 'termomagnetico' },
            { nombre: 'QO330', cap: 10, amp: 30, marco: 'QO', disparo: 'termomagnetico' },
            { nombre: 'QO340', cap: 10, amp: 40, marco: 'QO', disparo: 'termomagnetico' },
            { nombre: 'QO350', cap: 10, amp: 50, marco: 'QO', disparo: 'termomagnetico' },
            { nombre: 'QO360', cap: 10, amp: 60, marco: 'QO', disparo: 'termomagnetico' },
            { nombre: 'QO370', cap: 10, amp: 70, marco: 'QO', disparo: 'termomagnetico' },
            { nombre: 'QO380', cap: 10, amp: 80, marco: 'QO', disparo: 'termomagnetico' },
            { nombre: 'QO390', cap: 10, amp: 90, marco: 'QO', disparo: 'termomagnetico' },
            { nombre: 'QO3100', cap: 10, amp: 100, marco: 'QO', disparo: 'termomagnetico' }
        ],
        // Curvas de disparo estándar para interruptores termomagnéticos
        curvaDisparo: {
            tipo: 'termomagnetico',
            multiplicadorInstantaneo: 10,
            tolerancia: { min: 0.8, max: 1.2 },
            curvaTermica: {
                modelo: 'iec_inverse',
                puntos: [
                    { multiple: 1.05, tiempo: 10000 },
                    { multiple: 1.25, tiempo: 1200 },
                    { multiple: 1.5, tiempo: 300 },
                    { multiple: 2.0, tiempo: 60 },
                    { multiple: 3.0, tiempo: 20 },
                    { multiple: 5.0, tiempo: 5 }
                ]
            },
            curvaMagnetica: {
                modelo: 'inverse_fast',
                formula: 't = 0.02 * (k / (I / In))',
                puntos: [
                    { multiple: 8, tiempo: 0.030 },
                    { multiple: 10, tiempo: 0.020 },
                    { multiple: 15, tiempo: 0.012 },
                    { multiple: 20, tiempo: 0.008 }
                ],
                tiempoMin: 0.005,
                tiempoMax: 0.030
            }
        }
    },

    // Square D - Serie HDL (Para Int. Principal y Tab. NQ - 18kA @ 480V)
    sqd_hdl: {
        nombre: 'Square D - HDL',
        marca: 'Square D',
        serie: 'HDL',
        modelos: [
            { nombre: 'HDL36015', cap: 18, amp: 15, marco: 'HDL', disparo: 'termomagnetico' },
            { nombre: 'HDL36020', cap: 18, amp: 20, marco: 'HDL', disparo: 'termomagnetico' },
            { nombre: 'HDL36030', cap: 18, amp: 30, marco: 'HDL', disparo: 'termomagnetico' },
            { nombre: 'HDL36040', cap: 18, amp: 40, marco: 'HDL', disparo: 'termomagnetico' },
            { nombre: 'HDL36050', cap: 18, amp: 50, marco: 'HDL', disparo: 'termomagnetico' },
            { nombre: 'HDL36060', cap: 18, amp: 60, marco: 'HDL', disparo: 'termomagnetico' },
            { nombre: 'HDL36070', cap: 18, amp: 70, marco: 'HDL', disparo: 'termomagnetico' },
            { nombre: 'HDL36080', cap: 18, amp: 80, marco: 'HDL', disparo: 'termomagnetico' },
            { nombre: 'HDL36090', cap: 18, amp: 90, marco: 'HDL', disparo: 'termomagnetico' },
            { nombre: 'HDL36100', cap: 18, amp: 100, marco: 'HDL', disparo: 'termomagnetico' },
            { nombre: 'HDL36125', cap: 18, amp: 125, marco: 'HDL', disparo: 'termomagnetico' },
            { nombre: 'HDL36150', cap: 18, amp: 150, marco: 'HDL', disparo: 'termomagnetico' }
        ],
        curvaDisparo: {
            tipo: 'termomagnetico',
            multiplicadorInstantaneo: 10,
            tolerancia: { min: 0.8, max: 1.2 },
            curvaTermica: {
                modelo: 'iec_inverse',
                puntos: [
                    { multiple: 1.05, tiempo: 10000 },
                    { multiple: 1.25, tiempo: 1200 },
                    { multiple: 1.5, tiempo: 300 },
                    { multiple: 2.0, tiempo: 60 },
                    { multiple: 3.0, tiempo: 20 },
                    { multiple: 5.0, tiempo: 5 }
                ]
            },
            curvaMagnetica: {
                modelo: 'inverse_fast',
                formula: 't = 0.02 * (k / (I / In))',
                puntos: [
                    { multiple: 8, tiempo: 0.030 },
                    { multiple: 10, tiempo: 0.020 },
                    { multiple: 15, tiempo: 0.012 },
                    { multiple: 20, tiempo: 0.008 }
                ],
                tiempoMin: 0.005,
                tiempoMax: 0.030
            }
        }
    },

    // Square D - Serie HDA (Para I-Line - 18kA @ 480V)
    sqd_hda: {
        nombre: 'Square D - HDA',
        marca: 'Square D',
        serie: 'HDA',
        modelos: [
            { nombre: 'HDA36015', cap: 18, amp: 15, marco: 'HDA', disparo: 'termomagnetico' },
            { nombre: 'HDA36020', cap: 18, amp: 20, marco: 'HDA', disparo: 'termomagnetico' },
            { nombre: 'HDA36030', cap: 18, amp: 30, marco: 'HDA', disparo: 'termomagnetico' },
            { nombre: 'HDA36040', cap: 18, amp: 40, marco: 'HDA', disparo: 'termomagnetico' },
            { nombre: 'HDA36050', cap: 18, amp: 50, marco: 'HDA', disparo: 'termomagnetico' },
            { nombre: 'HDA36060', cap: 18, amp: 60, marco: 'HDA', disparo: 'termomagnetico' },
            { nombre: 'HDA36070', cap: 18, amp: 70, marco: 'HDA', disparo: 'termomagnetico' },
            { nombre: 'HDA36080', cap: 18, amp: 80, marco: 'HDA', disparo: 'termomagnetico' },
            { nombre: 'HDA36090', cap: 18, amp: 90, marco: 'HDA', disparo: 'termomagnetico' },
            { nombre: 'HDA36100', cap: 18, amp: 100, marco: 'HDA', disparo: 'termomagnetico' },
            { nombre: 'HDA36125', cap: 18, amp: 125, marco: 'HDA', disparo: 'termomagnetico' },
            { nombre: 'HDA36150', cap: 18, amp: 150, marco: 'HDA', disparo: 'termomagnetico' }
        ],
        curvaDisparo: {
            tipo: 'termomagnetico',
            multiplicadorInstantaneo: 10,
            tolerancia: { min: 0.8, max: 1.2 },
            curvaTermica: {
                modelo: 'iec_inverse',
                puntos: [
                    { multiple: 1.05, tiempo: 10000 },
                    { multiple: 1.25, tiempo: 1200 },
                    { multiple: 1.5, tiempo: 300 },
                    { multiple: 2.0, tiempo: 60 },
                    { multiple: 3.0, tiempo: 20 },
                    { multiple: 5.0, tiempo: 5 }
                ]
            },
            curvaMagnetica: {
                modelo: 'inverse_fast',
                formula: 't = 0.02 * (k / (I / In))',
                puntos: [
                    { multiple: 8, tiempo: 0.030 },
                    { multiple: 10, tiempo: 0.020 },
                    { multiple: 15, tiempo: 0.012 },
                    { multiple: 20, tiempo: 0.008 }
                ],
                tiempoMin: 0.005,
                tiempoMax: 0.030
            }
        }
    },

    // Square D - Serie JDL (Para Int. Principal - 18kA @ 480V)
    sqd_jdl: {
        nombre: 'Square D - JDL',
        marca: 'Square D',
        serie: 'JDL',
        modelos: [
            { nombre: 'JDL26150', cap: 18, amp: 150, marco: 'JDL', disparo: 'termomagnetico' },
            { nombre: 'JDL26175', cap: 18, amp: 175, marco: 'JDL', disparo: 'termomagnetico' },
            { nombre: 'JDL26200', cap: 18, amp: 200, marco: 'JDL', disparo: 'termomagnetico' },
            { nombre: 'JDL26225', cap: 18, amp: 225, marco: 'JDL', disparo: 'termomagnetico' },
            { nombre: 'JDL26250', cap: 18, amp: 250, marco: 'JDL', disparo: 'termomagnetico' }
        ],
        curvaDisparo: {
            tipo: 'termomagnetico',
            multiplicadorInstantaneo: 10,
            tolerancia: { min: 0.8, max: 1.2 },
            curvaTermica: {
                modelo: 'iec_inverse',
                puntos: [
                    { multiple: 1.05, tiempo: 10000 },
                    { multiple: 1.25, tiempo: 1200 },
                    { multiple: 1.5, tiempo: 300 },
                    { multiple: 2.0, tiempo: 60 },
                    { multiple: 3.0, tiempo: 20 },
                    { multiple: 5.0, tiempo: 5 }
                ]
            },
            curvaMagnetica: {
                modelo: 'inverse_fast',
                formula: 't = 0.02 * (k / (I / In))',
                puntos: [
                    { multiple: 8, tiempo: 0.030 },
                    { multiple: 10, tiempo: 0.020 },
                    { multiple: 15, tiempo: 0.012 },
                    { multiple: 20, tiempo: 0.008 }
                ],
                tiempoMin: 0.005,
                tiempoMax: 0.030
            }
        }
    },

    // Square D - Serie JDA (Para I-Line - 18kA @ 480V)
    sqd_jda: {
        nombre: 'Square D - JDA',
        marca: 'Square D',
        serie: 'JDA',
        modelos: [
            { nombre: 'JDA36150', cap: 18, amp: 150, marco: 'JDA', disparo: 'termomagnetico' },
            { nombre: 'JDA36175', cap: 18, amp: 175, marco: 'JDA', disparo: 'termomagnetico' },
            { nombre: 'JDA36200', cap: 18, amp: 200, marco: 'JDA', disparo: 'termomagnetico' },
            { nombre: 'JDA36225', cap: 18, amp: 225, marco: 'JDA', disparo: 'termomagnetico' },
            { nombre: 'JDA36250', cap: 18, amp: 250, marco: 'JDA', disparo: 'termomagnetico' }
        ],
        curvaDisparo: {
            tipo: 'termomagnetico',
            multiplicadorInstantaneo: 10,
            tolerancia: { min: 0.8, max: 1.2 },
            curvaTermica: {
                modelo: 'iec_inverse',
                puntos: [
                    { multiple: 1.05, tiempo: 10000 },
                    { multiple: 1.25, tiempo: 1200 },
                    { multiple: 1.5, tiempo: 300 },
                    { multiple: 2.0, tiempo: 60 },
                    { multiple: 3.0, tiempo: 20 },
                    { multiple: 5.0, tiempo: 5 }
                ]
            },
            curvaMagnetica: {
                modelo: 'inverse_fast',
                formula: 't = 0.02 * (k / (I / In))',
                puntos: [
                    { multiple: 8, tiempo: 0.030 },
                    { multiple: 10, tiempo: 0.020 },
                    { multiple: 15, tiempo: 0.012 },
                    { multiple: 20, tiempo: 0.008 }
                ],
                tiempoMin: 0.005,
                tiempoMax: 0.030
            }
        }
    },

    // Square D - Serie LAL (Para Int. Principal y Tab. NQ)
    sqd_lal: {
        nombre: 'Square D - LAL',
        marca: 'Square D',
        serie: 'LAL',
        modelos: [
            { nombre: 'LAL36300', cap: 35, amp: 300, marco: 'LAL', disparo: 'termomagnetico' },
            { nombre: 'LAL36350', cap: 35, amp: 350, marco: 'LAL', disparo: 'termomagnetico' },
            { nombre: 'LAL36400', cap: 35, amp: 400, marco: 'LAL', disparo: 'termomagnetico' }
        ],
        curvaDisparo: {
            tipo: 'termomagnetico',
            multiplicadorInstantaneo: 10,
            tolerancia: { min: 0.8, max: 1.2 },
            curvaTermica: {
                modelo: 'iec_inverse',
                puntos: [
                    { multiple: 1.05, tiempo: 10000 },
                    { multiple: 1.25, tiempo: 1200 },
                    { multiple: 1.5, tiempo: 300 },
                    { multiple: 2.0, tiempo: 60 },
                    { multiple: 3.0, tiempo: 20 },
                    { multiple: 5.0, tiempo: 5 }
                ]
            },
            curvaMagnetica: {
                modelo: 'inverse_fast',
                formula: 't = 0.02 * (k / (I / In))',
                puntos: [
                    { multiple: 8, tiempo: 0.030 },
                    { multiple: 10, tiempo: 0.020 },
                    { multiple: 15, tiempo: 0.012 },
                    { multiple: 20, tiempo: 0.008 }
                ],
                tiempoMin: 0.005,
                tiempoMax: 0.030
            }
        }
    },

    // Square D - Serie MG (35kA @ 480V)
    sqd_mg: {
        nombre: 'Square D - MG',
        marca: 'Square D',
        serie: 'MG',
        modelos: [
            { nombre: 'MGA36300', cap: 35, amp: 300, marco: 'MGA', disparo: 'termomagnetico' },
            { nombre: 'MGL36300', cap: 35, amp: 300, marco: 'MGL', disparo: 'termomagnetico' },
            { nombre: 'MGA36400', cap: 35, amp: 400, marco: 'MGA', disparo: 'termomagnetico' },
            { nombre: 'MGL36400', cap: 35, amp: 'Cualquiera', marco: 'MGL', disparo: 'termomagnetico' },
            { nombre: 'MGA36500', cap: 35, amp: 500, marco: 'MGA', disparo: 'termomagnetico' },
            { nombre: 'MGL36500', cap: 35, amp: 500, marco: 'MGL', disparo: 'termomagnetico' },
            { nombre: 'MGA36600', cap: 35, amp: 600, marco: 'MGA', disparo: 'termomagnetico' },
            { nombre: 'MGL36600', cap: 35, amp: 600, marco: 'MGL', disparo: 'termomagnetico' },
            { nombre: 'MGA36700', cap: 35, amp: 700, marco: 'MGA', disparo: 'termomagnetico' },
            { nombre: 'MGL36700', cap: 35, amp: 700, marco: 'MGL', disparo: 'termomagnetico' },
            { nombre: 'MGA36800', cap: 35, amp: 800, marco: 'MGA', disparo: 'termomagnetico' },
            { nombre: 'MGL36800', cap: 35, amp: 800, marco: 'MGL', disparo: 'termomagnetico' }
        ],
        curvaDisparo: {
            tipo: 'termomagnetico',
            multiplicadorInstantaneo: 10,
            tolerancia: { min: 0.8, max: 1.2 },
            curvaTermica: {
                modelo: 'iec_inverse',
                puntos: [
                    { multiple: 1.05, tiempo: 10000 },
                    { multiple: 1.25, tiempo: 1200 },
                    { multiple: 1.5, tiempo: 300 },
                    { multiple: 2.0, tiempo: 60 },
                    { multiple: 3.0, tiempo: 20 },
                    { multiple: 5.0, tiempo: 5 }
                ]
            },
            curvaMagnetica: {
                modelo: 'inverse_fast',
                formula: 't = 0.02 * (k / (I / In))',
                puntos: [
                    { multiple: 8, tiempo: 0.030 },
                    { multiple: 10, tiempo: 0.020 },
                    { multiple: 15, tiempo: 0.012 },
                    { multiple: 20, tiempo: 0.008 }
                ],
                tiempoMin: 0.005,
                tiempoMax: 0.030
            }
        }
    },

    // Fusibles para desconectadores
    fusible: {
        nombre: 'Fusibles',
        marca: 'Varios',
        serie: 'Clase',
        modelos: [
            { nombre: 'S/F (Sin Fusible)', cap: 0, amp: 0, marco: 'SF', disparo: 'ninguno' },
            { nombre: 'Fusible 30A', cap: 10, amp: 30, marco: 'Clase J', disparo: 'fusible' },
            { nombre: 'Fusible 60A', cap: 10, amp: 60, marco: 'Clase J', disparo: 'fusible' },
            { nombre: 'Fusible 100A', cap: 10, amp: 100, marco: 'Clase J', disparo: 'fusible' },
            { nombre: 'Fusible 200A', cap: 10, amp: 200, marco: 'Clase J', disparo: 'fusible' }
        ],
        curvaDisparo: {
            tipo: 'fusible',
            multiplicadorInstantaneo: 10,
            tolerancia: { min: 0.8, max: 1.2 },
            curvaTermica: {
                modelo: 'iec_inverse',
                puntos: [
                    { multiple: 1.05, tiempo: 10000 },
                    { multiple: 1.25, tiempo: 1200 },
                    { multiple: 1.5, tiempo: 300 },
                    { multiple: 2.0, tiempo: 60 },
                    { multiple: 3.0, tiempo: 20 },
                    { multiple: 5.0, tiempo: 5 }
                ]
            },
            curvaMagnetica: {
                modelo: 'inverse_fast',
                formula: 't = 0.02 * (k / (I / In))',
                puntos: [
                    { multiple: 8, tiempo: 0.030 },
                    { multiple: 10, tiempo: 0.020 },
                    { multiple: 15, tiempo: 0.012 },
                    { multiple: 20, tiempo: 0.008 }
                ],
                tiempoMin: 0.005,
                tiempoMax: 0.030
            }
        }
    }
};

if (typeof window !== 'undefined') {
    window.EQUIPOS = EQUIPOS;
}
