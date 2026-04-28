/**
 * Short Circuit Calculator Service
 * Extracted from cortocircuito/js/calculo/fault_analysis.js and impedancias.js
 * Based on IEEE Std 399 and IEC 60909
 */

// ==================== COMPLEX NUMBER UTILITIES ====================

function cAdd(a, b) {
    return {
        R: a.R + b.R,
        X: a.X + b.X
    };
}

function cMulScalar(a, k) {
    return {
        R: a.R * k,
        X: a.X * k
    };
}

function cMag(a) {
    return Math.sqrt(a.R * a.R + a.X * a.X);
}

function cParallel(Za, Zb) {
    const numR = Za.R * Zb.R - Za.X * Zb.X;
    const numX = Za.R * Zb.X + Za.X * Zb.R;
    const denR = Za.R + Zb.R;
    const denX = Za.X + Zb.X;
    const denMag = denR * denR + denX * denX;
    
    return {
        R: (numR * denR + numX * denX) / denMag,
        X: (numX * denR - numR * denX) / denMag
    };
}

// ==================== FAULT CALCULATIONS ====================

function fault3F(node) {
    const Z = cMag(node.Z1);
    const I = node.V_phase / Z;
    return I;
}

function faultLG(node) {
    const Z_total = cAdd(cAdd(node.Z1, node.Z2), node.Z0);
    const Z = cMag(Z_total);
    const I = (3 * node.V_phase) / Z;
    return I;
}

function faultLL(node) {
    const Z_total = cAdd(node.Z1, node.Z2);
    const Z = cMag(Z_total);
    const I = (Math.sqrt(3) * node.V_phase) / Z;
    return I;
}

function faultLLG(node) {
    const Zpar = cParallel(node.Z2, node.Z0);
    const Z_total = cAdd(node.Z1, Zpar);
    const Z = cMag(Z_total);
    const I = (Math.sqrt(3) * node.V_phase) / Z;
    return I;
}

// ==================== IMPEDANCE CALCULATIONS ====================

function calculateZ0(groundingType, Z1, R_tierra) {
    switch (groundingType) {
        case 'yg_solido':
            return { R: Z1.R, X: Z1.X };
        case 'yg_resistencia':
        case 'yg_reactancia':
            return {
                R: Z1.R + 3 * R_tierra,
                X: Z1.X
            };
        case 'no_aterrizado':
        case 'delta':
            return { R: 1000000, X: 1000000 };
        default:
            return { R: Z1.R, X: Z1.X };
    }
}

function calculateAsymmetricPeak(I_sc, XR) {
    if (XR === Infinity || XR < 0.1) {
        return Math.sqrt(2) * I_sc * 2.0;
    }
    const factor = 1 + Math.exp(-Math.PI / XR);
    return Math.sqrt(2) * I_sc * factor;
}

// ==================== MAIN CALCULATION FUNCTION ====================

function calculateShortCircuit(params) {
    const {
        V_ll = 220,
        mode = 'conocido',
        isc_known_kA,
        isc_known,
        isc_source_kA,
        isc_source,
        xr_source = 15,
        trafo_kva = 500,
        trafo_z = 5.75,
        trafo_vp = 13200,
        trafo_vs = 480,
        grounding_type = 'yg_solido',
        r_tierra = 0,
        feeder = null
    } = params;

    function asFiniteNumber(value, name) {
        const n = typeof value === 'string' ? Number(value) : value;
        if (typeof n !== 'number' || !Number.isFinite(n)) {
            throw new Error(`Invalid ${name}: must be a finite number`);
        }
        return n;
    }

    function asPositiveNumber(value, name) {
        const n = asFiniteNumber(value, name);
        if (n <= 0) throw new Error(`Invalid ${name}: must be > 0`);
        return n;
    }

    const Vll = asPositiveNumber(V_ll, 'V_ll');
    const xr = asPositiveNumber(xr_source, 'xr_source');

    const kva = asPositiveNumber(trafo_kva, 'trafo_kva');
    const zPct = asPositiveNumber(trafo_z, 'trafo_z');
    const Vp = asPositiveNumber(trafo_vp, 'trafo_vp');
    const Vs = asPositiveNumber(trafo_vs, 'trafo_vs');

    const Rg = r_tierra == null ? 0 : asFiniteNumber(r_tierra, 'r_tierra');

    const V_phase = V_ll / Math.sqrt(3);
    
    // Calculate source impedance
    let Z_source;
    if (mode === 'conocido') {
        const iscKnownkA = isc_known_kA ?? isc_known;
        const IscA = asPositiveNumber(iscKnownkA, 'isc_known_kA') * 1000;
        const Z = Vll / (Math.sqrt(3) * IscA);
        const R = Z / Math.sqrt(1 + xr * xr);
        const X = R * xr;
        Z_source = { R, X };
    } else {
        // Complete mode: derive source impedance at primary, then reflect to secondary
        const iscSourcekA = isc_source_kA ?? isc_source;
        const IscPrimaryA = asPositiveNumber(iscSourcekA, 'isc_source_kA') * 1000;

        const Zp = Vp / (Math.sqrt(3) * IscPrimaryA); // Ohms at primary
        const Rp = Zp / Math.sqrt(1 + xr * xr);
        const Xp = Rp * xr;

        const a = Vs / Vp; // V_secondary / V_primary
        Z_source = { R: Rp * a * a, X: Xp * a * a }; // reflect impedance to secondary
    }

    // Calculate transformer impedance
    const Z_trafo_mag = (zPct / 100) * (Vs * Vs) / (kva * 1000);
    const xr_trafo = kva <= 500 ? 5 : kva <= 1500 ? 7 : 10;
    const R_trafo = Z_trafo_mag / Math.sqrt(1 + xr_trafo * xr_trafo);
    const X_trafo = R_trafo * xr_trafo;
    const Z_trafo = { R: R_trafo, X: X_trafo };

    // Calculate feeder impedance (if provided)
    let Z_feeder = { R: 0, X: 0 };
    if (feeder) {
        // Simplified feeder impedance calculation
        const R_per_km = feeder.material === 'cobre' ? 0.5 : 0.8;
        const X_per_km = 0.1;
        const L = (feeder.longitud || 0) / 1000;
        const n = Math.max(1, feeder.paralelo || 1);
        Z_feeder = {
            R: (R_per_km * L) / n,
            X: (X_per_km * L) / n
        };
    }

    // Total Z1
    const Z1 = cAdd(cAdd(Z_source, Z_trafo), Z_feeder);
    const Z2 = { R: Z1.R, X: Z1.X };
    const Z0 = calculateZ0(grounding_type, Z1, Rg);

    // Build fault node with proper validation
    const Z1_R = Z1.R || 0;
    const Z1_X = Z1.X || 0;
    
    // Prevent division by zero and handle edge cases
    let XR;
    if (Z1_R === 0 && Z1_X === 0) {
        XR = Infinity; // Perfect conductor
    } else if (Z1_R === 0) {
        XR = Infinity; // Pure inductive
    } else {
        XR = Math.abs(Z1_X / Z1_R);
    }
    
    const node = {
        V_ll: Vll,
        V_phase,
        Z1,
        Z2,
        Z0,
        XR
    };

    // Calculate all fault currents
    const I_3F = fault3F(node);
    const I_LG = faultLG(node);
    const I_LL = faultLL(node);
    const I_LLG = faultLLG(node);

    // Calculate asymmetric peaks
    const I_3F_peak = calculateAsymmetricPeak(I_3F, node.XR);
    const I_LG_peak = calculateAsymmetricPeak(I_LG, node.XR);
    const I_LL_peak = calculateAsymmetricPeak(I_LL, node.XR);
    const I_LLG_peak = calculateAsymmetricPeak(I_LLG, node.XR);

    // Warnings
    const warnings = [];
    if (I_LG < I_3F * 0.05) {
        warnings.push('Falla a tierra muy baja (posible HRG)');
    }
    if (I_LG > I_3F) {
        warnings.push('Físicamente imposible: I_LG > I_3F');
    }
    if (I_LL > I_3F * 1.1) {
        warnings.push('I_LL > 110% de I_3F (verificar datos)');
    }

    return {
        I_3F_A: I_3F,
        I_LG_A: I_LG,
        I_LL_A: I_LL,
        I_LLG_A: I_LLG,
        I_3F_peak_A: I_3F_peak,
        I_LG_peak_A: I_LG_peak,
        I_LL_peak_A: I_LL_peak,
        I_LLG_peak_A: I_LLG_peak,
        I_3F_kA: I_3F / 1000,
        I_LG_kA: I_LG / 1000,
        I_LL_kA: I_LL / 1000,
        I_LLG_kA: I_LLG / 1000,
        I_3F_peak_kA: I_3F_peak / 1000,
        I_LG_peak_kA: I_LG_peak / 1000,
        I_LL_peak_kA: I_LL_peak / 1000,
        I_LLG_peak_kA: I_LLG_peak / 1000,
        XR: node.XR,
        Z1,
        Z2,
        Z0,
        warnings,
        input_params: params
    };
}

module.exports = {
    calculateShortCircuit,
    cAdd,
    cMulScalar,
    cMag,
    cParallel,
    fault3F,
    faultLG,
    faultLL,
    faultLLG,
    calculateZ0,
    calculateAsymmetricPeak
};
