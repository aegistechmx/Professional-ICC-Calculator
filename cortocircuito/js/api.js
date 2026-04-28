/**
 * api.js - Backend API Client
 * Cliente para comunicarse con el backend de ICC Calculator
 */

var API = (function() {
    var BASE_URL = window.API_BASE_URL || 'http://localhost:3002';
    
    /**
     * Realiza una petición HTTP al backend
     */
    async function request(endpoint, method, data) {
        var url = BASE_URL + endpoint;
        var options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        try {
            var response = await fetch(url, options);
            
            if (!response.ok) {
                var errorData = await response.json();
                throw new Error(errorData.error || 'Error en la petición');
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    /**
     * Cálculo simple de ICC
     */
    function iccSimple(data) {
        return request('/calculo/icc/simple', 'POST', data);
    }
    
    /**
     * Cálculo completo de ICC
     */
    function icc(data) {
        return request('/calculo/icc', 'POST', data);
    }
    
    /**
     * ICC con aporte de motores (modelo exponencial)
     */
    function iccConMotores(data) {
        return request('/calculo/icc-motores', 'POST', data);
    }
    
    /**
     * Cálculo de falla mínima
     */
    function fallaMinima(data) {
        return request('/calculo/falla-minima', 'POST', data);
    }
    
    /**
     * Cálculo de retorno de tierra
     */
    function retornoTierra(data) {
        return request('/calculo/retorno-tierra', 'POST', data);
    }
    
    /**
     * Generar curva TCC
     */
    function generarCurvaTCC(data) {
        return request('/proteccion/tcc/generar', 'POST', data);
    }
    
    /**
     * Evaluar disparo de protección
     */
    function evaluarDisparo(data) {
        return request('/proteccion/disparo/evaluar', 'POST', data);
    }
    
    /**
     * Analizar coordinación
     */
    function analizarCoordinacion(data) {
        return request('/proteccion/coordinacion/analizar', 'POST', data);
    }
    
    /**
     * Seleccionar breaker SQD
     */
    function seleccionarSQD(data) {
        return request('/proteccion/sqd/seleccionar', 'POST', data);
    }
    
    /**
     * Generar curva SQD
     */
    function generarCurvaSQD(data) {
        return request('/proteccion/sqd/curva', 'POST', data);
    }
    
    /**
     * Coordinación de tablero (multi-nivel)
     */
    function coordinacionTablero(data) {
        return request('/coord/coordinacion-tablero', 'POST', data);
    }
    
    /**
     * Evaluar coordinación sin ajuste
     */
    function evaluarCoordinacion(data) {
        return request('/coord/coordinacion-evaluar', 'POST', data);
    }
    
    /**
     * Generar reporte PDF
     */
    function generarPDF(data) {
        return request('/reporte/pdf', 'POST', data);
    }
    
    /**
     * SQD Real Curves - Listar curvas disponibles
     */
    function listarCurvasSQD() {
        return request('/sqd-real/curvas', 'GET');
    }
    
    /**
     * SQD Real Curves - Obtener curva específica
     */
    function obtenerCurvaSQD(nombre) {
        return request('/sqd-real/curva/' + nombre, 'GET');
    }
    
    /**
     * SQD Real Curves - Calcular tiempo de disparo
     */
    function tiempoDisparoSQD(data) {
        return request('/sqd-real/tiempo-disparo', 'POST', data);
    }
    
    /**
     * SQD Real Curves - Evaluar coordinación
     */
    function coordinacionSQD(data) {
        return request('/sqd-real/coordinacion', 'POST', data);
    }
    
    /**
     * Simulación ICC vs tiempo
     */
    function simularICC(data) {
        return request('/simulacion/icc-tiempo', 'POST', data);
    }
    
    /**
     * Simulación ICC vs tiempo con gráfica
     */
    function simularICCConGrafica(data) {
        return request('/simulacion/icc-tiempo/grafica', 'POST', data);
    }
    
    /**
     * Configurar URL base (para producción)
     */
    function setBaseUrl(url) {
        BASE_URL = url;
    }
    
    return {
        iccSimple: iccSimple,
        icc: icc,
        iccConMotores: iccConMotores,
        fallaMinima: fallaMinima,
        retornoTierra: retornoTierra,
        generarCurvaTCC: generarCurvaTCC,
        evaluarDisparo: evaluarDisparo,
        analizarCoordinacion: analizarCoordinacion,
        seleccionarSQD: seleccionarSQD,
        generarCurvaSQD: generarCurvaSQD,
        coordinacionTablero: coordinacionTablero,
        evaluarCoordinacion: evaluarCoordinacion,
        generarPDF: generarPDF,
        listarCurvasSQD: listarCurvasSQD,
        obtenerCurvaSQD: obtenerCurvaSQD,
        tiempoDisparoSQD: tiempoDisparoSQD,
        coordinacionSQD: coordinacionSQD,
        simularICC: simularICC,
        simularICCConGrafica: simularICCConGrafica,
        setBaseUrl: setBaseUrl
    };
})();

// Exponer al ámbito global
window.API = API;
