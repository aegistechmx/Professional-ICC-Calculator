/**
 * test_coordinacion_real.js — Pruebas del Motor de Coordinación Real
 * Script de pruebas para validar el catálogo de equipos y coordinación
 */

var TestCoordinacionReal = (function() {
    /**
     * Prueba básica del catálogo de equipos
     */
    function probarCatalogo() {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🧪 PRUEBA: Catálogo de Equipos');
        console.log('═══════════════════════════════════════════════════════════');

        if (typeof CatalogoEquiposReal === 'undefined') {
            console.error('❌ CatalogoEquiposReal no está definido');
            return false;
        }

        console.log('✅ CatalogoEquiposReal cargado');

        // Verificar catálogo
        var catalogo = CatalogoEquiposReal.CATALOGO;
        console.log('Fabricantes:', Object.keys(catalogo).length);
        
        for (var marca in catalogo) {
            console.log('  -', marca + ':', Object.keys(catalogo[marca]).length, 'modelos');
        }

        // Verificar curvas
        var curvas = CatalogoEquiposReal.CURVAS_TCC;
        console.log('Curvas TCC:', Object.keys(curvas).length);

        // Probar interpolación
        var curva = CatalogoEquiposReal.obtenerCurva('schneider_powerpact_micrologic_2_0');
        var t = CatalogoEquiposReal.interpolarLogLog(curva, 2.0);
        console.log('Interpolación @ 2.0× In:', t.toFixed(2), 's');

        // Probar selección de breaker
        var opciones = CatalogoEquiposReal.seleccionarBreaker({ I_diseño: 250 }, {});
        console.log('Opciones para I_diseño=250A:', opciones.length);
        if (opciones.length > 0) {
            console.log('Mejor opción:', opciones[0].marcaNombre, opciones[0].modeloNombre, opciones[0].frame + 'A');
        }

        console.log('═══════════════════════════════════════════════════════════');
        return true;
    }

    /**
     * Prueba del motor de coordinación
     */
    function probarCoordinacion() {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🧪 PRUEBA: Motor de Coordinación Real');
        console.log('═══════════════════════════════════════════════════════════');

        if (typeof MotorCoordinacionReal === 'undefined') {
            console.error('❌ MotorCoordinacionReal no está definido');
            return false;
        }

        console.log('✅ MotorCoordinacionReal cargado');

        // Crear nodos de prueba
        var nodosPrueba = [
            { id: 'P0', I_diseño: 400 },
            { id: 'P1', I_diseño: 250 },
            { id: 'P2', I_diseño: 100 }
        ];

        console.log('Nodos de prueba:', nodosPrueba.length);
        nodosPrueba.forEach(function(n) {
            console.log('  -', n.id + ': I_diseño=' + n.I_diseño + 'A');
        });

        // Ejecutar coordinación
        var resultado = MotorCoordinacionReal.autocorregirSistema(nodosPrueba, {
            Isc: 20000,
            criterios: {}
        });

        console.log('Estado final:', resultado.estadoFinal);
        console.log('Pasos:', resultado.pasos.length);
        resultado.pasos.forEach(function(p) {
            console.log('  ' + p.paso + '. ' + p.accion + ':', p.estado, '-', p.mensaje);
        });

        if (resultado.coordinacion) {
            console.log('Cambios:', resultado.coordinacion.cambios.length);
            console.log('Iteraciones:', resultado.coordinacion.iteraciones);
        }

        if (resultado.validacionFinal) {
            console.log('Validación:', resultado.validacionFinal.estado);
            console.log('Cruces:', resultado.validacionFinal.cruces.length);
        }

        console.log('═══════════════════════════════════════════════════════════');
        return true;
    }

    /**
     * Ejecutar todas las pruebas
     */
    function ejecutarPruebas() {
        console.log('');
        console.log('🚀 INICIANDO PRUEBAS DEL SISTEMA DE COORDINACIÓN REAL');
        console.log('');

        var resultadoCatalogo = probarCatalogo();
        var resultadoCoordinacion = probarCoordinacion();

        console.log('');
        console.log('📊 RESUMEN DE PRUEBAS');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Catálogo:', resultadoCatalogo ? '✅ OK' : '❌ FAIL');
        console.log('Coordinación:', resultadoCoordinacion ? '✅ OK' : '❌ FAIL');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
    }

    return {
        probarCatalogo: probarCatalogo,
        probarCoordinacion: probarCoordinacion,
        ejecutarPruebas: ejecutarPruebas
    };
})();

if (typeof window !== 'undefined') {
    window.TestCoordinacionReal = TestCoordinacionReal;
    
    // Ejecutar pruebas automáticamente si se carga en navegador
    if (document.readyState === 'complete') {
        setTimeout(function() {
            TestCoordinacionReal.ejecutarPruebas();
        }, 1000);
    } else {
        window.addEventListener('load', function() {
            setTimeout(function() {
                TestCoordinacionReal.ejecutarPruebas();
            }, 1000);
        });
    }
}
