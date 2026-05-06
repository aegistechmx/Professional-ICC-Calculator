/**
 * Script de prueba para integración ICC Module
 * Verifica la comunicación entre React y el módulo HTML
 */

// Test data
const testSystem = {
  estado: {
    tension: 220,
    modo: 'conocido',
    tipoSistema: '3f',
    isc_conocido: 10,
    trafo_kva: 500,
    trafo_z: 5.75,
    trafo_vp: 13200,
    trafo_vs: 220
  },
  ui: {
    tension: 220,
    isc_conocido: 10,
    trafo_kva: 500
  }
};

// Función para probar la comunicación
export function testICCIntegration() {
  console.log('=== Test de Integración ICC Module ===');
  
  // Verificar que el componente ICCModule esté disponible
  if (typeof window.ICCModule === 'undefined') {
    console.error('ICCModule no encontrado');
    return false;
  }
  
  // Verificar que el logo esté disponible
  if (typeof window.IcoreLogo === 'undefined') {
    console.error('IcoreLogo no encontrado');
    return false;
  }
  
  // Simular carga del módulo
  console.log('1. Enviando modelo de prueba...');
  const iframe = document.querySelector('iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({
      type: 'LOAD_MODEL',
      data: testSystem
    }, '*');
  }
  
  // Simular cálculo
  setTimeout(() => {
    console.log('2. Enviando comando de cálculo...');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'CALCULATE'
      }, '*');
    }
  }, 1000);
  
  // Escuchar respuestas
  const messageHandler = (event) => {
    const { type, data } = event.data;
    
    switch (type) {
      case 'ICC_READY':
        console.log('3. Módulo ICC listo:', data);
        break;
        
      case 'MODEL_LOADED':
        console.log('4. Modelo cargado:', data);
        break;
        
      case 'RESULTS':
        console.log('5. Resultados recibidos:', data);
        // Verificar que el logo reaccione a los resultados
        if (data && data.length > 0) {
          console.log('6. Activando logo en modo falla...');
          // El logo debería reaccionar automáticamente
        }
        break;
        
      case 'ERROR':
        console.error('Error del módulo:', data);
        break;
    }
  };
  
  window.addEventListener('message', messageHandler);
  
  // Cleanup después de 10 segundos
  setTimeout(() => {
    window.removeEventListener('message', messageHandler);
    console.log('=== Test completado ===');
  }, 10000);
  
  return true;
}

// Función para probar el motor compartido
export function testSharedEngine() {
  console.log('=== Test Motor Compartido ===');
  
  // Importar funciones del motor compartido
  import('../shared/engine/index.js').then(engine => {
    console.log('1. Motor compartido cargado:', Object.keys(engine));
    
    // Probar cálculo básico
    const result = engine.calcICC({
      V: 220,
      Z: 0.05,
      factorC: 1.25
    });
    
    console.log('2. Cálculo ICC básico:', result);
    
    // Probar ampacidad
    const ampacity = engine.calcAmpacity({
      material: 'Cu',
      size: '4/0',
      ambientC: 30
    });
    
    console.log('3. Cálculo ampacidad:', ampacity);
    
    // Probar motor completo
    return import('../shared/engine/icc.js');
  }).then(iccEngine => {
    console.log('4. Motor ICC completo cargado:', Object.keys(iccEngine));
    
    // Probar cálculo completo
    const sistema = iccEngine.calcularSistemaCompleto({
      tension: 220,
      trafo_kva: 500,
      trafo_z: 5.75,
      nodos: [{
        id: 'P1',
        feeder: {
          material: 'cobre',
          calibre: '4/0',
          longitud: 30,
          cargaA: 200
        }
      }]
    });
    
    console.log('5. Cálculo sistema completo:', sistema);
    console.log('=== Test motor completado ===');
  }).catch(error => {
    console.error('Error en test motor:', error);
  });
}

// Función para probar el logo animado
export function testLogoAnimation() {
  console.log('=== Test Logo Animado ===');
  
  // Verificar que el logo esté en el DOM
  const logoContainer = document.querySelector('.logo-container');
  if (!logoContainer) {
    console.error('Logo container no encontrado');
    return false;
  }
  
  // Activar logo
  console.log('1. Activando logo...');
  logoContainer.classList.add('active');
  
  // Simular falla
  setTimeout(() => {
    console.log('2. Activando modo falla...');
    logoContainer.classList.add('fault');
    
    // Quitar modo falla después de 3 segundos
    setTimeout(() => {
      console.log('3. Quitando modo falla...');
      logoContainer.classList.remove('fault');
    }, 3000);
  }, 1000);
  
  console.log('=== Test logo completado ===');
  return true;
}

// Exportar todas las funciones de prueba
export const tests = {
  integration: testICCIntegration,
  engine: testSharedEngine,
  logo: testLogoAnimation
};

// Auto-ejecutar si estamos en modo desarrollo
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  console.log('Modo desarrollo detectado, ejecutando tests...');
  
  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        tests.integration();
        tests.engine();
        tests.logo();
      }, 2000);
    });
  } else {
    setTimeout(() => {
      tests.integration();
      tests.engine();
      tests.logo();
    }, 2000);
  }
}
