const pdfService = require('./pdf.service');
const graficasGenerador = require('../../core/graficas/generador');
const calculoService = require('../calculo.service');
const proteccionService = require('../proteccion.service');
const simulacionService = require('../simulacion.service');

/**
 * Orquestador de generación de reporte
 */
exports.generarReporteCompleto = async (data, stream) => {
  try {
    // 1. Ejecutar cálculos necesarios si no vienen en la data
    const iccParams = {
      voltaje: data.parametros_icc?.tension || 480,
      resistencia: data.parametros_icc?.resistencia || 0.02,
      reactancia: data.parametros_icc?.reactancia || 0.05,
      tipo: data.parametros_icc?.tipo || 'trifasico'
    };

    // Use simple ICC calculation for reports (doesn't require full system data)
    const icc = await calculoService.iccSimple(iccParams);

    // Encontrar el valor máximo de Isc
    const max_kA = icc.icc / 1000; // Convert to kA
    icc.max_kA = max_kA;
    icc.tension = iccParams.voltaje;
    icc.modo = data.parametros_icc?.modo || 'conocido';
    
    // Create puntos array with required fields for PDF
    const xr = iccParams.reactancia > 0 ? iccParams.reactancia / iccParams.resistencia : 15;
    icc.puntos = [{
      isc: icc.icc,
      ipeak: icc.icc * 2.3,
      xr: xr,
      nombre: 'Punto Principal'
    }];

    // 2. Analizar protecciones si se proporcionan dispositivos
    let coordinacion = { coordinado: true };
    let tccBuffer = null;
    let protecciones = null;

    if (data.dispositivos && data.dispositivos.length > 0) {
      try {
        const coordData = await proteccionService.analizarCoordinacionCascada({
          dispositivos: data.dispositivos,
          margen: data.margen || 0.2
        });
        coordinacion = coordData.coordinacion;

        // Generar buffer de la gráfica TCC (log-log)
        if (coordData.curvas && coordData.curvas.length > 0) {
          const curvas = coordData.curvas.map((puntos, i) => ({
            nombre: data.dispositivos[i].nombre || `Breaker ${i+1}`,
            puntos: puntos
          }));
          tccBuffer = await graficasGenerador.generarGraficaTCC(curvas);
        }
      } catch (err) {
        console.warn('Error en análisis de coordinación:', err.message);
        coordinacion = { coordinado: false, error: err.message };
      }
    } else {
      // Skip coordination analysis if no devices
      coordinacion = { coordinado: true, mensaje: 'No hay dispositivos para analizar' };
    }

    // 2b. Simular ICC vs tiempo si hay motores
    let iccTimeBuffer = null;
    let simulacionICC = null;
    
    if (data.motores && data.motores.lista && data.motores.lista.length > 0) {
      try {
        // Preparar datos de motores para simulación
        const motoresSim = data.motores.lista.map(m => ({
          potencia_kw: m.hp ? m.hp * 0.746 : m.potencia_kw || 10,
          voltaje: iccParams.voltaje,
          nombre: m.nombre
        }));

        // Ejecutar simulación ICC vs tiempo
        simulacionICC = await simulacionService.simularICC({
          voltaje: iccParams.voltaje,
          resistencia: iccParams.resistencia,
          reactancia: iccParams.reactancia,
          tipo: iccParams.tipo,
          motores: motoresSim,
          t_max: 0.2,
          pasos: 50
        });

        // Generar gráfica ICC vs tiempo
        if (simulacionICC && simulacionICC.curva) {
          const iccTimeData = simulacionICC.curva.map(p => ({
            tiempo: p.t * 1000, // ms
            icc: p.icc_total_ka // kA
          }));
          iccTimeBuffer = await graficasGenerador.generarGraficaICCTiempo(iccTimeData);
        }
      } catch (err) {
        console.warn('Error en simulación ICC:', err.message);
        simulacionICC = { error: err.message };
      }
    }

    // 3. Seleccionar protección SQD si se proporcionan parámetros de carga
    if (data.seleccion_proteccion) {
      try {
        const seleccion = await proteccionService.seleccionarSQD({
          icc_total: max_kA * 1000, // Convertir kA a A
          corriente_carga: data.seleccion_proteccion.corriente_carga
        });
        protecciones = { seleccion };
      } catch (err) {
        console.warn('Error en selección SQD:', err.message);
        protecciones = { error: err.message };
      }
    }

    // 4. Compilar toda la información para el PDF
    const dataReporte = {
      proyecto: data.proyecto || { nombre: 'Proyecto Sin Nombre' },
      empresa: data.empresa || { nombre: 'ICC Software SaaS' },
      icc,
      motores: data.motores || null,
      protecciones,
      coordinacion,
      simulacion: simulacionICC,
      graficas: {
        tcc: tccBuffer,
        icc_tiempo: iccTimeBuffer
      }
    };

    // 5. Generar PDF
    await pdfService.crearReportePDF(dataReporte, stream);
  } catch (error) {
    const errorMsg = error?.message || String(error);
    console.error('Error generando reporte:', errorMsg);
    throw new Error(`Error al generar reporte: ${errorMsg}`);
  }
};
