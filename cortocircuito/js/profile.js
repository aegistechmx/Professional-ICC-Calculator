/**
 * profile.js — Perfil de usuario
 * Persistencia de configuración por defecto usando localStorage
 */

var Profile = (function() {
    var PROFILE_KEY = 'icc_calculator_profile';
    
    var defaultProfile = {
        modo: 'completo',
        tipoSistema: '3f',
        tension: 220,
        zonaElectrica: '',
        iscFuente: 25,
        xrFuente: 15,
        trafoKva: 500,
        trafoZ: 5.75,
        trafoVp: 13200,
        trafoVs: 480,
        x0Config: 'plano_acero',
        trafoAterr: 'yg_solido',
        retornoTierra: 0
    };
    
    // Validación centralizada de valores
    function getValue(val, fallback) {
        return (val !== undefined && val !== null && val !== '') ? val : fallback;
    }
    
    // Normalización de perfil
    function normalizeProfile(p) {
        return {
            modo: String(p.modo || defaultProfile.modo),
            tipoSistema: String(p.tipoSistema || defaultProfile.tipoSistema),
            tension: p.tension !== undefined && p.tension !== null && p.tension !== '' ? Number(p.tension) : defaultProfile.tension,
            zonaElectrica: String(p.zonaElectrica || ''),
            iscFuente: p.iscFuente !== undefined && p.iscFuente !== null && p.iscFuente !== '' ? Number(p.iscFuente) : defaultProfile.iscFuente,
            xrFuente: p.xrFuente !== undefined && p.xrFuente !== null && p.xrFuente !== '' ? Number(p.xrFuente) : defaultProfile.xrFuente,
            trafoKva: p.trafoKva !== undefined && p.trafoKva !== null && p.trafoKva !== '' ? Number(p.trafoKva) : defaultProfile.trafoKva,
            trafoZ: p.trafoZ !== undefined && p.trafoZ !== null && p.trafoZ !== '' ? Number(p.trafoZ) : defaultProfile.trafoZ,
            trafoVp: p.trafoVp !== undefined && p.trafoVp !== null && p.trafoVp !== '' ? Number(p.trafoVp) : defaultProfile.trafoVp,
            trafoVs: p.trafoVs !== undefined && p.trafoVs !== null && p.trafoVs !== '' ? Number(p.trafoVs) : defaultProfile.trafoVs,
            x0Config: String(p.x0Config || defaultProfile.x0Config),
            trafoAterr: String(p.trafoAterr || defaultProfile.trafoAterr),
            retornoTierra: p.retornoTierra !== undefined && p.retornoTierra !== null && p.retornoTierra !== '' ? Number(p.retornoTierra) : defaultProfile.retornoTierra
        };
    }
    
    // Validación de integridad del perfil
    function validateProfile(p) {
        if (!p) return false;
        
        // Validar valores numéricos positivos
        var numericValid = p.tension > 0 && 
                           p.trafoKva > 0 && 
                           p.trafoZ > 0 &&
                           p.trafoVp > 0 &&
                           p.trafoVs > 0 &&
                           p.iscFuente > 0 &&
                           p.xrFuente > 0;
        
        // Validar enums de strings
        var modoValid = ['conocido', 'completo'].includes(p.modo);
        var tipoSistemaValid = ['3f', '1f'].includes(p.tipoSistema);
        var x0ConfigValid = ['plano_acero', 'plano_al', 'triangular_acero', 'triangular_al'].includes(p.x0Config);
        var trafoAterrValid = ['yg_solido', 'yg_resistivo', 'delta'].includes(p.trafoAterr);
        
        return numericValid && modoValid && tipoSistemaValid && x0ConfigValid && trafoAterrValid;
    }
    
    function getProfile() {
        try {
            var saved = localStorage.getItem(PROFILE_KEY);
            if (saved) {
                var parsed = JSON.parse(saved);
                var normalized = normalizeProfile(parsed);
                return normalized;
            }
        } catch (e) {
            console.warn('Error al leer perfil:', e);
        }
        return Object.assign({}, defaultProfile);
    }
    
    function saveProfile(profile) {
        try {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
            return true;
        } catch (e) {
            console.warn('Error al guardar perfil:', e);
            return false;
        }
    }
    
    function updateProfileField(field, value) {
        var profile = getProfile();
        profile[field] = value;
        return saveProfile(profile);
    }
    
    function loadToUI() {
        var profile = getProfile();
        
        // Cargar valores a los inputs si existen
        var inputModoConocido = document.getElementById('btn-conocido');
        var inputModoCompleto = document.getElementById('btn-completo');
        if (inputModoConocido && inputModoCompleto) {
            if (profile.modo === 'conocido') {
                inputModoConocido.click();
            } else {
                inputModoCompleto.click();
            }
        }
        
        var inputTipo3f = document.getElementById('btn-3f');
        var inputTipo1f = document.getElementById('btn-1f');
        if (inputTipo3f && inputTipo1f) {
            if (profile.tipoSistema === '3f') {
                inputTipo3f.click();
            } else {
                inputTipo1f.click();
            }
        }
        
        var inputTension = document.getElementById('input-tension');
        if (inputTension) {
            inputTension.value = profile.tension;
            // Actualizar botones de voltaje
            var voltageBtns = document.querySelectorAll('.voltage-btn');
            voltageBtns.forEach(function(btn) {
                btn.classList.remove('active');
                if (btn.textContent === String(profile.tension)) {
                    btn.classList.add('active');
                }
            });
        }
        
        var inputZona = document.getElementById('input-zona-electrica');
        if (inputZona && profile.zonaElectrica) {
            inputZona.value = profile.zonaElectrica;
        }
        
        var inputIscFuente = document.getElementById('input-isc-fuente');
        if (inputIscFuente) {
            inputIscFuente.value = profile.iscFuente;
        }
        
        var inputXrFuente = document.getElementById('input-xr-fuente');
        if (inputXrFuente) {
            inputXrFuente.value = profile.xrFuente;
        }
        
        var inputTrafoKva = document.getElementById('input-trafo-kva');
        if (inputTrafoKva) {
            inputTrafoKva.value = profile.trafoKva;
        }
        
        var inputTrafoZ = document.getElementById('input-trafo-z');
        if (inputTrafoZ) {
            inputTrafoZ.value = profile.trafoZ;
        }
        
        var inputTrafoVp = document.getElementById('input-trafo-vp');
        if (inputTrafoVp) {
            inputTrafoVp.value = profile.trafoVp;
        }
        
        var inputTrafoVs = document.getElementById('input-trafo-vs');
        if (inputTrafoVs) {
            inputTrafoVs.value = profile.trafoVs;
        }
        
        var inputX0Config = document.getElementById('input-x0-config');
        if (inputX0Config) {
            inputX0Config.value = profile.x0Config;
        }
        
        var inputTrafoAterr = document.getElementById('input-trafo-aterr');
        if (inputTrafoAterr) {
            inputTrafoAterr.value = profile.trafoAterr;
        }
        
        var inputRetornoTierra = document.getElementById('input-retorno-tierra');
        if (inputRetornoTierra) {
            inputRetornoTierra.value = profile.retornoTierra;
        }
        }
    
    function saveFromUI() {
        var tensionInput = document.getElementById('input-tension');
        var zonaInput = document.getElementById('input-zona-electrica');
        var iscFuenteInput = document.getElementById('input-isc-fuente');
        var xrFuenteInput = document.getElementById('input-xr-fuente');
        var trafoKvaInput = document.getElementById('input-trafo-kva');
        var trafoZInput = document.getElementById('input-trafo-z');
        var trafoVpInput = document.getElementById('input-trafo-vp');
        var trafoVsInput = document.getElementById('input-trafo-vs');
        var x0ConfigInput = document.getElementById('input-x0-config');
        var trafoAterrInput = document.getElementById('input-trafo-aterr');
        var retornoTierraInput = document.getElementById('input-retorno-tierra');
        
        var profile = {
            modo: document.getElementById('btn-conocido')?.classList.contains('active') ? 'conocido' : 'completo',
            tipoSistema: document.getElementById('btn-3f')?.classList.contains('active') ? '3f' : '1f',
            tension: getValue(tensionInput?.value, 220),
            zonaElectrica: getValue(zonaInput?.value, ''),
            iscFuente: getValue(iscFuenteInput?.value, 25),
            xrFuente: getValue(xrFuenteInput?.value, 15),
            trafoKva: trafoKvaInput?.value !== undefined && trafoKvaInput?.value !== null && trafoKvaInput?.value !== '' ? Number(trafoKvaInput.value) : 500,
            trafoZ: getValue(trafoZInput?.value, 5.75),
            trafoVp: getValue(trafoVpInput?.value, 13200),
            trafoVs: getValue(trafoVsInput?.value, 480),
            x0Config: getValue(x0ConfigInput?.value, 'plano_acero'),
            trafoAterr: getValue(trafoAterrInput?.value, 'yg_solido'),
            retornoTierra: getValue(retornoTierraInput?.value, 0)
        };
        
        var normalized = normalizeProfile(profile);
        return saveProfile(normalized);
    }
    
    function resetProfile() {
        localStorage.removeItem(PROFILE_KEY);
        return defaultProfile;
    }
    
    return {
        getProfile: getProfile,
        saveProfile: saveProfile,
        updateProfileField: updateProfileField,
        loadToUI: loadToUI,
        saveFromUI: saveFromUI,
        resetProfile: resetProfile,
        validateProfile: validateProfile,
        normalizeProfile: normalizeProfile
    };
})();

if (typeof window !== 'undefined') {
    window.Profile = Profile;
}
