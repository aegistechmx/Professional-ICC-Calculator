var CONSTANTES = require('./constantes');

var CONDUCTORES = {
    cobre: {
        acero: {
            '14':{R:8.28,X:.187},'12':{R:5.21,X:.176},'10':{R:3.28,X:.164},
            '8':{R:2.06,X:.154},'6':{R:1.30,X:.143},'4':{R:.815,X:.134},
            '2':{R:.513,X:.125},'1':{R:.407,X:.120},'1/0':{R:.323,X:.116},
            '2/0':{R:.256,X:.113},'3/0':{R:.203,X:.110},'4/0':{R:.161,X:.107},
            '250':{R:.138,X:.105},'300':{R:.115,X:.103},'350':{R:.099,X:.101},
            '400':{R:.087,X:.100},'500':{R:.069,X:.098},'600':{R:.058,X:.096},
            '750':{R:.046,X:.094},'1000':{R:.035,X:.092}
        },
        pvc: {
            '14':{R:8.28,X:.159},'12':{R:5.21,X:.148},'10':{R:3.28,X:.137},
            '8':{R:2.06,X:.127},'6':{R:1.30,X:.117},'4':{R:.815,X:.109},
            '2':{R:.513,X:.102},'1':{R:.407,X:.097},'1/0':{R:.323,X:.094},
            '2/0':{R:.256,X:.091},'3/0':{R:.203,X:.088},'4/0':{R:.161,X:.086},
            '250':{R:.138,X:.084},'300':{R:.115,X:.082},'350':{R:.099,X:.081},
            '400':{R:.087,X:.080},'500':{R:.069,X:.078},'600':{R:.058,X:.077},
            '750':{R:.046,X:.075},'1000':{R:.035,X:.073}
        }
    },
    aluminio: { acero: {}, pvc: {} }
};

(function() {
    var FA = CONSTANTES.FACTOR_AL_COBRE;
    ['acero','pvc'].forEach(function(t) {
        Object.keys(CONDUCTORES.cobre[t]).forEach(function(c) {
            var d = CONDUCTORES.cobre[t][c];
            CONDUCTORES.aluminio[t][c] = { R: +(d.R*FA).toFixed(4), X: d.X };
        });
    });
})();

/**
 * X0 (reactancia de secuencia cero) en Ohm/km a 60Hz.
 * Estructura: CONDUCTORES_X0[config][calibre] = X0
 *
 * Fuentes:
 * - Plano acero: conductores individuales en ducto magnetico separados.
 *   X0 ≈ mu0/(2pi) * ln(Deq/Ds) con Deq grande → valores altos (0.15-0.41 Ohm/km)
 * - Plano PVC: conductores en ducto no magnetico → X0 reducido (~50-65% del acero)
 * - Tripode acero: conductores juntos o cable tripolar en acero → X0 bajo
 * - Tripode PVC: conductores juntos o cable tripolar en PVC → X0 muy bajo
 *
 * Referencia: IEEE Std 525, tabla de impedancias de secuencia cero de cables.
 * Los valores son aproximados para cables con neutro incluido.
 */
var CONDUCTORES_X0 = {
    plano_acero: {
        '14':.410,'12':.387,'10':.364,'8':.337,'6':.310,
        '4':.289,'2':.268,'1':.258,'1/0':.248,'2/0':.239,
        '3/0':.231,'4/0':.223,'250':.216,'300':.208,'350':.201,
        '400':.195,'500':.184,'600':.176,'750':.165,'1000':.152
    },
    plano_pvc: {
        '14':.280,'12':.264,'10':.249,'8':.230,'6':.212,
        '4':.197,'2':.183,'1':.176,'1/0':.170,'2/0':.163,
        '3/0':.158,'4/0':.153,'250':.147,'300':.142,'350':.138,
        '400':.133,'500':.126,'600':.120,'750':.113,'1000':.104
    },
    tripode_acero: {
        '14':.185,'12':.174,'10':.163,'8':.151,'6':.139,
        '4':.130,'2':.121,'1':.116,'1/0':.112,'2/0':.108,
        '3/0':.104,'4/0':.100,'250':.097,'300':.093,'350':.090,
        '400':.088,'500':.083,'600':.079,'750':.074,'1000':.068
    },
    tripode_pvc: {
        '14':.090,'12':.085,'10':.080,'8':.074,'6':.068,
        '4':.063,'2':.059,'1':.057,'1/0':.055,'2/0':.053,
        '3/0':.051,'4/0':.049,'250':.048,'300':.046,'350':.044,
        '400':.043,'500':.041,'600':.039,'750':.036,'1000':.033
    }
};

module.exports = { CONDUCTORES, CONDUCTORES_X0 };
