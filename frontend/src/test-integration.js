/* eslint-disable no-console */
/**
 * Script de prueba para integración ICC Module
 * Verifica la comunicación entre React y el módulo HTML
 */

// Test data
const testSystem = {
  nodes: [
    {
      id: 'source1',
      type: 'source',
      position: { x: 100, y: 100 },
      data: { label: 'Fuente Principal', voltage: 480, isc: 25000 },
    },
    {
      id: 'P0',
      type: 'panel',
      position: { x: 300, y: 100 },
      data: {
        label: 'Panel Principal',
        voltage: 480,
        I_carga: 100,
        protection: {
          tipo: 'breaker', // Asumiendo un breaker para un panel
          In: 100, // Corriente nominal
          Icu: 10000, // Capacidad interruptiva
        },
      },
    },
    {
      id: 'load1',
      type: 'load',
      position: { x: 500, y: 100 },
      data: { label: 'Carga 1', voltage: 480, I_carga: 50 },
    },
  ],
  edges: [
    { id: 'e-source1-P0', source: 'source1', target: 'P0', data: { length: 10, material: 'Cu', size: '4/0', impedance: 0.05 } },
    { id: 'e-P0-load1', source: 'P0', target: 'load1', data: { length: 5, material: 'Cu', size: '1/0', impedance: 0.02 } },
  ],
  estado: {
    tension: 220,
    modo: 'conocido',
    tipoSistema: '3f',
    isc_conocido: 10,
    trafo_kva: 500, // Este valor será actualizado en el test de carga
    trafo_z: 5.75,
    trafo_vp: 13200,
    trafo_vs: 220,
  },
  ui: {
    tension: 220,
    isc_conocido: 10,
    trafo_kva: 500,
  },
}

// Configuración para reintentos automáticos
const MAX_RETRIES = 3;
const retryCounters = new Map();
const loadTestMessageIdMap = new Map(); // Para el test de carga
// TTL para mensajes (5 segundos)
const MESSAGE_TTL_MILLISECONDS = 5000; 

// Estado de la sesión segura
let sessionToken = null;
let isHandshakeComplete = false;

const messageHistory = new Map();

// Función de utilidad para calcular checksum simple (tipo Java hashCode)
function calculateChecksum(data) {
  if (data === undefined || data === null) return '0';
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash | 0; // Convertir a entero de 32 bits
  }
  return Math.abs(hash).toString(16);
}

// Nueva función para probar la funcionalidad de botones y selectores
async function testButtonFunctionality() {
  if (import.meta.env.DEV) console.log('\n🚀 Iniciando Test de Funcionalidad de Interfaz...');

  const simulateClick = (buttonId) => {
    return new Promise(resolve => {
      const tempHandler = (event) => {
        if (event.data.type === 'BUTTON_ACTION_ACK' && event.data.originalButtonId === buttonId) {
          if (import.meta.env.DEV) console.log(`   [UI] ACK recibido para ${buttonId}: ${event.data.message}`);
          window.removeEventListener('message', tempHandler);
          resolve(event.data.success);
        }
      };
      window.addEventListener('message', tempHandler);
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ 
          type: 'SIMULATE_BUTTON_CLICK', 
          data: { buttonId },
          token: sessionToken,
          timestamp: Date.now()
        }, '*');
      }
    });
  };

  if (import.meta.env.DEV) console.log('   Handshake verificado, probando controles...');

  // Secuencia de pruebas de UI
  await simulateClick('calculate');
  await simulateClick('setModeCompleto');
  await simulateClick('setTipo1f');
  await simulateClick('setVoltage480');
  await simulateClick('setModeConocido'); // Volver a estado estable
  await simulateClick('saveProfile');
  await simulateClick('syncManualFromHTML');

  if (import.meta.env.DEV) console.log('✅ Test de Interfaz completado.\n');
}

// Función para probar la comunicación
export function testICCIntegration() {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('=== Test de Integración ICC Module ===')
  }

  // Verificar que el componente ICCModule esté disponible
  if (typeof window.ICCModule === 'undefined') {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('ICCModule no encontrado')
    }
    return false
  }

  // Verificar que el logo esté disponible
  if (typeof window.IcoreLogo === 'undefined') {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('IcoreLogo no encontrado')
    }
    return false
  }

  const iframe = document.querySelector('iframe')
  if (!iframe) return; // Si no hay iframe, no se puede testear.

  // Helper para envío con registro para reintentos automáticos
  const sendMessage = (payload) => {
    if (!iframe || !iframe.contentWindow) return;
    
    // Si la sesión no está establecida y no es un mensaje de handshake, abortar
    if (!isHandshakeComplete && payload.type !== 'HANDSHAKE_INIT') {
      console.warn(`[Bridge] Intento de enviar ${payload.type} sin handshake completado.`);
      return;
    }

    const checksum = calculateChecksum(payload.data);
    const fullMessage = { ...payload, checksum, token: sessionToken, timestamp: Date.now(), ttl: MESSAGE_TTL_MILLISECONDS };
    
    // Registrar para posible reintento
    messageHistory.set(payload.type, fullMessage);
    if (!retryCounters.has(payload.type)) {
      retryCounters.set(payload.type, 0);
    }

    iframe.contentWindow.postMessage(fullMessage, '*');
  };

  // Simular carga del módulo
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('⏱️ Enviando datos al motor de flujo de potencia...')
  }
  
  // Check if iframe exists and isn't pointing to a chrome error page
  if (iframe && iframe.contentWindow) {
    try {
      // A simple check: if we can't access the origin, it's likely a cross-origin error page
      const isErrored = iframe.contentWindow.location.href.includes('chrome-error');
      if (isErrored) throw new Error('Iframe failed to load');
    } catch (e) {
      console.warn('⚠️ No se puede comunicar con el iframe: El origen no coincide o el servicio está caído.');
    }

    // 1. Generar token único para la sesión
    sessionToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    if (import.meta.env.DEV) {
      console.log('🤝 Iniciando handshake con el módulo ICC...');
    }

    // 2. Enviar mensaje de inicio de handshake
    const handshakePayload = {
      type: 'HANDSHAKE_INIT',
      token: sessionToken,
      timestamp: Date.now()
    };
    iframe.contentWindow.postMessage(handshakePayload, '*');
  }


  // Simular flujo en tiempo real: Cambio de parámetros después de la carga
  setTimeout(() => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('🔄 Sincronización en tiempo real: Actualizando corriente de carga...')
    }
    
    // Simulamos un cambio de carga en el Editor que debe reflejarse en el módulo
    const updatedSystem = {
      ...testSystem,
      estado: { ...testSystem.estado, trafo_kva: 1000 } // Aumentamos trafo para ver cambio en Isc
    };

    const updatePayload = {
      type: 'LOAD_MODEL',
      data: updatedSystem,
    };

    if (iframe && iframe.contentWindow) {
      sendMessage(updatePayload);
      
      // Disparar cálculo inmediatamente después de la actualización
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('⏱️ Enviando comando CALCULATE al módulo ICC...')
      }
      sendMessage({ type: 'CALCULATE' });
    }
  }, 1000)

  // Escuchar respuestas
  const messageHandler = event => {
    // Filtrar mensajes de Vite HMR u otros no relevantes
    if (!event.data || typeof event.data !== 'object' || !event.data.type || !['HANDSHAKE_ACK', 'CHECKSUM_ERROR', 'SYNC_FROM_MODULE', 'AUTO_SYNC_FROM_MODULE', 'BUTTON_ACTION_ACK', 'ICC_READY', 'MODEL_LOADED', 'RESULTS', 'ERROR'].includes(event.data.type)) {
      return; 
    }
    const { type, data, checksum, originalType, timestamp, ttl, token } = event.data;

    // 🛡️ Validación de Handshake
    if (type === 'HANDSHAKE_ACK') {
      if (token === sessionToken) {
        isHandshakeComplete = true;
        if (import.meta.env.DEV) console.log('✅ Handshake completado: Sesión segura establecida.');
        sendMessage({ type: 'LOAD_MODEL', data: { ...testSystem, sourceId: 'source1' } });
        // Una vez cargado el modelo inicial, se ejecutan las pruebas de botones
        testButtonFunctionality(); 
      }
      return;
    }
    // Other message handling...

    // ⏱️ Validación de Tiempo de Vida (TTL)
    if (timestamp && ttl) {
      if (Date.now() - timestamp > ttl) {
        if (import.meta.env.DEV) {
          console.warn(`⚠️ Mensaje ${type} ignorado: Expirado (TTL: ${ttl}ms).`);
        }
        return; // Ignorar mensaje expirado
      }
    }

    // 🛡️ Validación de Integridad (Checksum)
    if (checksum) {
      const expectedChecksum = calculateChecksum(data);
      if (checksum !== expectedChecksum) {
        if (import.meta.env.DEV) {
          console.error(`❌ Error de Integridad: Checksum inválido para el mensaje ${type}. Recibido: ${checksum}, Esperado: ${expectedChecksum}`);
        }
        // Solicitar reintento automático al emisor (no se reintenta aquí directamente, solo se registra)
        if (event.source) {
          event.source.postMessage({ type: 'CHECKSUM_ERROR', originalType: type }, '*');
        }
        return;
      }
      console.log(`✅ Integridad verificada para mensaje: ${type}`);
    }

    switch (type) {
      case 'CHECKSUM_ERROR':
        const failedType = originalType;
        const retries = retryCounters.get(failedType) || 0;
        
        if (retries < MAX_RETRIES) {
          const count = retries + 1;
          retryCounters.set(failedType, count);
          if (import.meta.env.DEV) {
            console.warn(`🔄 Error de checksum detectado por el receptor. Reintentando envío de ${failedType} (${count}/${MAX_RETRIES})...`);
          }
          const originalMessage = messageHistory.get(failedType);
          if (originalMessage && iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(originalMessage, '*');
          }
        } else {
          if (import.meta.env.DEV) {
            console.error(`❌ Límite de reintentos alcanzado para ${failedType}. Comunicación interrumpida por inestabilidad de datos.`);
          }
        }
        break

      case 'SYNC_FROM_MODULE':
      case 'AUTO_SYNC_FROM_MODULE':
        if (import.meta.env.DEV) {
          console.log(`✅ Sincronización desde módulo recibida (${type}):`, data);
          if (data.filename) {
            console.log(`   Nombre de archivo: ${data.filename}`);
          }
        }
        break;

      case 'BUTTON_ACTION_ACK':
        if (import.meta.env.DEV) console.log(`✅ Button Action ACK for ${event.data.originalButtonId}: ${event.data.message}`);
        break;

      case 'ICC_READY':
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('✅ ICC Response:', data)
        }
        break

      case 'MODEL_LOADED':
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('✅ Power Flow Response:', data)
        }
        break

      case 'RESULTS':
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('5. Resultados recibidos:', data)
        }
        // Verificar que el logo reaccione a los resultados
        if (data && data.length > 0) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log('6. Activando logo en modo falla...')
          }
          // El logo debería reaccionar automáticamente
        }
        break

      case 'ERROR':
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error('Error del módulo:', data)
        }
        break
    }
  }

  // New function to test button functionality
  async function testButtonFunctionality() {
    if (import.meta.env.DEV) console.log('\n=== Test de Funcionalidad de Botones ===');

    const simulateClick = (buttonId) => {
      return new Promise(resolve => {
        const tempHandler = (event) => {
          if (event.data.type === 'BUTTON_ACTION_ACK' && event.data.originalButtonId === buttonId) {
            if (import.meta.env.DEV) console.log(`   ACK recibido para ${buttonId}: ${event.data.message}`);
            window.removeEventListener('message', tempHandler);
            resolve(event.data.success);
          }
        };
        window.addEventListener('message', tempHandler);
        sendMessage({ type: 'SIMULATE_BUTTON_CLICK', data: { buttonId } });
      });
    };

    // Wait for handshake to complete before testing buttons
    await new Promise(resolve => {
      const checkHandshake = setInterval(() => {
        if (isHandshakeComplete) {
          clearInterval(checkHandshake);
          resolve();
        }
      }, 100);
    });

    if (import.meta.env.DEV) console.log('   Handshake completo, iniciando pruebas de botones...');

    // Simulate clicks for key buttons
    await simulateClick('calculate');

    if (import.meta.env.DEV) console.log('   Probando selectores de modo, tipo y voltaje...');
    await simulateClick('setModeCompleto');
    await simulateClick('setTipo1f');
    await simulateClick('setVoltage480');
    
    // Restaurar a modo conocido para dejar la UI en un estado estable tras el test
    await simulateClick('setModeConocido');

    await simulateClick('saveProfile');
    await simulateClick('resetProfile');
    await simulateClick('imprimirModulos'); // This will likely open a print dialog, but we verify the function call
    await simulateClick('syncManualFromHTML');
    // Add more buttons as needed

    if (import.meta.env.DEV) console.log('=== Test de Funcionalidad de Botones Completado ===\n');
  }

  window.addEventListener('message', messageHandler)

  // Cleanup después de 10 segundos
  setTimeout(() => {
    window.removeEventListener('message', messageHandler)
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('=== Test Integration ===')
      }
    }
  }, 10000)

  return true
}

// Función para probar el motor compartido
export function testSharedEngine() {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('=== Test Motor Compartido ===')
    }
  }

  // Importar funciones del motor compartido
  import('../../shared/engine/index.js')
    .then(engine => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('1. Motor compartido cargado:', Object.keys(engine))
        }
      }

      // Probar cálculo básico
      const result = engine.calcICC({
        V: 220,
        Z: 0.05,
        factorC: 1.25,
      })

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('2. Cálculo ICC básico:', result)
      }

      // Probar ampacidad
      const ampacity = engine.calcAmpacity({
        material: 'Cu',
        size: '4/0',
        ambientC: 30,
      })

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('2. Cálculo ampacidad:', ampacity)
      }

      // Probar motor completo
      return import('../../shared/engine/icc.js')
    })
    .then(iccEngine => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('4. Motor ICC completo cargado:', Object.keys(iccEngine))
      }

      // Probar cálculo completo
      const sistema = iccEngine.calcularSistemaCompleto({
        tension: 220,
        trafo_kva: 500,
        trafo_z: 5.75,
        nodos: [
          {
            id: 'P1',
            feeder: {
              material: 'cobre',
              calibre: '4/0',
              longitud: 30,
              cargaA: 200,
            },
          },
        ],
      })

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('5. Cálculo sistema completo:', sistema)
        }
      }
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('=== Test motor completado ===')
        }
      }
    })
    .catch(error => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('Error en test motor:', error.message)
      }
    })
}

// Función para probar el logo animado
export function testLogoAnimation() {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('=== Test Logo Animado ===')
  }

  // Verificar que el logo esté en el DOM
  const logoContainer = document.querySelector('.logo-container')
  if (!logoContainer) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Logo container no encontrado')
    }
    return false
  }

  // Activar logo
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('1. Activando logo...')
  }
  logoContainer.classList.add('active')

  // Simular falla
  setTimeout(() => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('2. Activando modo falla...')
    }
    logoContainer.classList.add('fault')

    // Quitar modo falla después de 3 segundos
    setTimeout(() => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('3. Quitando modo falla...')
      }
      logoContainer.classList.remove('fault')
    }, 3000)
  }, 1000)

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('=== Test logo completado ===')
  }
  return true
}

// Función para probar la configuración CORS desde el navegador
export async function testCORS() {
  if (import.meta.env.DEV) {
    console.log('=== Test de Integración CORS ===');
  }

  try {
    // Petición directa al backend (fuera del proxy para forzar el chequeo CORS del navegador)
    const response = await fetch('http://localhost:3001/api/health', {
      method: 'GET',
      mode: 'cors'
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (import.meta.env.DEV) {
        console.error(`❌ CORS: La petición falló con estado ${response.status}. Respuesta: ${errorText}`);
      }
      return false;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      if (import.meta.env.DEV) {
        console.error(`❌ CORS: Respuesta inesperada del backend. Se esperaba JSON, se recibió ${contentType || 'ninguno'}. Contenido: ${responseText}`);
      }
      return false;
    }

    const data = await response.json(); // Aquí es donde el error original podría ocurrir si la respuesta no es JSON
    if (data.success) {
      if (import.meta.env.DEV) {
        console.log('✅ CORS: Comunicación directa permitida por el backend', data);
      }
      return true;
    } else {
      if (import.meta.env.DEV) {
        console.error('❌ CORS: El backend reportó un error:', data.error);
      }
      return false;
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ CORS: Error de acceso (bloqueado o servidor offline):', error.message);
    }
  }
  return false;
}

// Función para probar la carga del bridge ICC
export async function testLoadICCBridge(numMessages = 50, intervalMs = 50) {
  if (import.meta.env.DEV) {
    console.log('=== Test de Carga del Bridge ICC ===');
  }

  if (!isHandshakeComplete) {
    console.error('❌ Test de Carga abortado: El handshake no se ha completado.');
    return false;
  }

  const iframe = document.querySelector('iframe');
  if (!iframe || !iframe.contentWindow) {
    console.error('❌ Iframe no encontrado o no accesible para el test de carga.');
    return false;
  }

  const testResults = {
    sent: 0,
    received: 0,
    checksumErrors: 0,
    ttlExpired: 0,
    retries: 0, // Esto cuenta los reintentos solicitados por el iframe, no los iniciados por este test de carga
    latency: [],
    successfulMessages: new Set(), // Para rastrear mensajes exitosos únicos
  };

  const sendLoadTestMessage = (index) => {
    const messageId = `load-test-${Date.now()}-${index}`;
    const updatedSystem = {
      ...testSystem,
      estado: { ...testSystem.estado, trafo_kva: 500 + index * 10 } // Variar datos para simular cambios
    };

    const payload = {
      type: 'LOAD_MODEL',
      data: updatedSystem,
      messageId: messageId,
    };

    const checksum = calculateChecksum(payload.data);
    const fullMessage = { ...payload, checksum, timestamp: Date.now(), ttl: MESSAGE_TTL_MILLISECONDS };

    loadTestMessageIdMap.set(messageId, { startTime: Date.now(), payload: fullMessage });
    iframe.contentWindow.postMessage(fullMessage, '*');
    testResults.sent++;
  };

  // Escuchar respuestas específicamente para el test de carga
  const loadTestMessageHandler = event => {
    const { type, data, checksum, originalType, timestamp, ttl, messageId } = event.data;

    // ⏱️ Validación de Tiempo de Vida (TTL)
    if (timestamp && ttl && (Date.now() - timestamp > ttl)) {
      testResults.ttlExpired++;
      if (import.meta.env.DEV) {
        console.warn(`⚠️ Mensaje ${type} (ID: ${messageId}) ignorado: Expirado (TTL: ${ttl}ms).`);
      }
      return; // Ignorar mensaje expirado
    }

    // 🛡️ Validación de Integridad (Checksum)
    if (checksum) {
      const expectedChecksum = calculateChecksum(data);
      if (checksum !== expectedChecksum) {
        testResults.checksumErrors++;
        if (import.meta.env.DEV) {
          console.error(`❌ Error de Integridad: Checksum inválido para el mensaje ${type} (ID: ${messageId}). Recibido: ${checksum}, Esperado: ${expectedChecksum}`);
        }
        // Para el test de carga, solo contamos el error. No reintentamos desde aquí.
        return;
      }
    }

    if (type === 'MODEL_LOADED' || type === 'RESULTS') {
      if (loadTestMessageIdMap.has(messageId)) {
        const { startTime } = loadTestMessageIdMap.get(messageId);
        const latency = Date.now() - startTime;
        testResults.latency.push(latency);
        testResults.received++;
        testResults.successfulMessages.add(messageId);
        loadTestMessageIdMap.delete(messageId); // Mensaje procesado
      }
    } else if (type === 'CHECKSUM_ERROR') {
      testResults.retries++;
      if (import.meta.env.DEV) {
        console.warn(`🔄 Reintento solicitado para mensaje original ${originalType} (ID: ${messageId}).`);
      }
    }
  };

  window.addEventListener('message', loadTestMessageHandler);

  for (let i = 0; i < numMessages; i++) {
    sendLoadTestMessage(i);
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  // Esperar un poco más que el TTL para asegurar que todos los mensajes sean procesados o expiren
  await new Promise(resolve => setTimeout(resolve, MESSAGE_TTL_MILLISECONDS + 1000));

  window.removeEventListener('message', loadTestMessageHandler);

  // Reportar resultados
  if (import.meta.env.DEV) {
    console.log('\n=== Resumen del Test de Carga del Bridge ICC ===');
    console.log(`Mensajes enviados: ${testResults.sent}`);
    console.log(`Mensajes recibidos exitosamente: ${testResults.successfulMessages.size}`);
    console.log(`Errores de Checksum: ${testResults.checksumErrors}`);
    console.log(`Mensajes TTL Expirados: ${testResults.ttlExpired}`);
    console.log(`Reintentos solicitados: ${testResults.retries}`);

    if (testResults.latency.length > 0) {
      const avgLatency = testResults.latency.reduce((sum, l) => sum + l, 0) / testResults.latency.length;
      const maxLatency = Math.max(...testResults.latency);
      const minLatency = Math.min(...testResults.latency);
      console.log(`Latencia promedio: ${avgLatency.toFixed(2)} ms`);
      console.log(`Latencia máxima: ${maxLatency} ms`);
      console.log(`Latencia mínima: ${minLatency} ms`);
    } else {
      console.log('No se recibieron respuestas para calcular la latencia.');
    }

    if (testResults.successfulMessages.size === numMessages) {
      console.log('✅ Test de Carga del Bridge ICC: PASSED');
      return true;
    } else {
      console.error('❌ Test de Carga del Bridge ICC: FAILED. No todos los mensajes fueron procesados exitosamente.');
      return false;
    }
  }
  return false;
}

// Exportar todas las funciones de prueba
export const tests = {
  integration: testICCIntegration,
  engine: testSharedEngine,
  logo: testLogoAnimation,
  cors: testCORS,
  loadBridge: testLoadICCBridge,
}

// Auto-ejecutar si estamos en modo desarrollo
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('Modo desarrollo detectado, ejecutando tests...')
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        testButtonFunctionality(); // Run button tests
        tests.cors()
        tests.integration()
        tests.loadBridge() // Añadir el test de carga aquí
        tests.engine()
        tests.logo()
      }, 2000)
    })
  } else {
    setTimeout(() => {
      testButtonFunctionality(); // Run button tests
      tests.cors()
      tests.integration()
      tests.loadBridge() // Añadir el test de carga aquí
      tests.engine()
      tests.logo()
    }, 2000)
  }
}
