/**
 * tcc_digitalizer.js — Motor Híbrido de Digitalización de Curvas TCC
 * Arquitectura industrial tipo ETAP para extracción de curvas de PDFs
 * 
 * Modos:
 * - MODO A: PDF vectorial (extracción directa de paths)
 * - MODO B: PDF imagen (OCR + detección de curvas con OpenCV.js)
 * - MODO C: Fallback manual asistido (calibración por usuario)
 */

var TCCDigitalizer = (function() {
    
    /**
     * Tipos de PDF detectados
     */
    var PDF_TYPE = {
        VECTOR: 'vector',
        IMAGE: 'image',
        UNKNOWN: 'unknown'
    };

    /**
     * Detectar tipo de PDF automáticamente
     * @param {Object} pdf - Objeto PDF de pdf.js
     * @returns {Promise<string>} Tipo de PDF
     */
    async function detectarTipoPDF(pdf) {
        try {
            // Intentar extraer contenido de texto
            const page = await pdf.getPage(1);
            const textContent = await page.getTextContent();
            
            // Si hay suficiente contenido estructurado, es vectorial
            if (textContent.items.length > 50) {
                console.log('[TCCDigitalizer] PDF detectado como VECTORIAL');
                return PDF_TYPE.VECTOR;
            }
            
            console.log('[TCCDigitalizer] PDF detectado como IMAGEN');
            return PDF_TYPE.IMAGE;
        } catch (e) {
            console.error('[TCCDigitalizer] Error detectando tipo PDF:', e);
            return PDF_TYPE.UNKNOWN;
        }
    }

    /**
     * Extraer paths vectoriales de página PDF
     * @param {Object} pdfPage - Página de PDF
     * @returns {Promise<Array>} Array de paths
     */
    async function extraerPaths(pdfPage) {
        try {
            const ops = await pdfPage.getOperatorList();
            const curvas = [];
            
            ops.fnArray.forEach((fn, i) => {
                // Buscar operaciones de construcción de paths
                if (fn === pdfjsLib.OPS.constructPath) {
                    curvas.push(ops.argsArray[i]);
                }
            });
            
            console.log('[TCCDigitalizer] Paths extraídos:', curvas.length);
            return curvas;
        } catch (e) {
            console.error('[TCCDigitalizer] Error extrayendo paths:', e);
            return [];
        }
    }

    /**
     * Normalizar coordenadas log-log
     * @param {Object} punto - Punto en coordenadas de imagen
     * @param {Object} escala - Escala de normalización
     * @returns {Object} Punto normalizado {I, t}
     */
    function normalizar(punto, escala) {
        return {
            I: Math.pow(10, punto.x * escala.logX + escala.offsetX),
            t: Math.pow(10, punto.y * escala.logY + escala.offsetY)
        };
    }

    /**
     * Detectar ejes automáticamente (requiere OpenCV.js)
     * @param {Object} img - Imagen en formato OpenCV
     * @returns {Object} Ejes detectados {ejeX, ejeY}
     */
    function detectarEjes(img) {
        // Fallback: si OpenCV no está disponible, usar valores por defecto
        if (typeof cv === 'undefined') {
            console.warn('[TCCDigitalizer] OpenCV no disponible, usando ejes por defecto');
            return {
                ejeX: { x1: 50, y1: 50, x2: 350, y2: 50 },
                ejeY: { x1: 50, y1: 50, x2: 50, y2: 350 }
            };
        }

        try {
            // Convertir a escala de grises
            const gray = cv.cvtColor(img, cv.COLOR_RGBA2GRAY);
            
            // Detectar bordes
            const edges = cv.Canny(gray, 50, 150);
            
            // Detectar líneas con Hough
            const lines = cv.HoughLines(edges, cv.HOUGH_STANDARD, 1, Math.PI / 180, 100);
            
            // Filtrar líneas horizontales y verticales
            const horizontal = [];
            const vertical = [];
            
            for (let i = 0; i < lines.rows; i++) {
                const rho = lines.data32F[i * 2];
                const theta = lines.data32F[i * 2 + 1];
                
                if (Math.abs(theta) < 0.1 || Math.abs(theta - Math.PI) < 0.1) {
                    horizontal.push({ rho, theta });
                } else if (Math.abs(theta - Math.PI / 2) < 0.1) {
                    vertical.push({ rho, theta });
                }
            }
            
            // Tomar las líneas más largas
            horizontal.sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));
            vertical.sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));
            
            return {
                ejeX: horizontal[0] || null,
                ejeY: vertical[0] || null
            };
        } catch (e) {
            console.error('[TCCDigitalizer] Error detectando ejes:', e);
            return {
                ejeX: null,
                ejeY: null
            };
        }
    }

    /**
     * Calcular escala de normalización a partir de ejes
     * @param {Object} ejeX - Eje X detectado
     * @param {Object} ejeY - Eje Y detectado
     * @param {Object} calibracion - Puntos de calibración manual {x1, y1, x2, y2, I1, I2, t1, t2}
     * @returns {Object} Escala de normalización
     */
    function calcularEscala(ejeX, ejeY, calibracion) {
        // Si hay calibración manual, usarla
        if (calibracion) {
            const logX1 = Math.log10(calibracion.I1);
            const logX2 = Math.log10(calibracion.I2);
            const logY1 = Math.log10(calibracion.t1);
            const logY2 = Math.log10(calibracion.t2);
            
            const scaleX = (logX2 - logX1) / (calibracion.x2 - calibracion.x1);
            const scaleY = (logY2 - logY1) / (calibracion.y2 - calibracion.y1);
            
            return {
                logX: scaleX,
                logY: scaleY,
                offsetX: logX1 - scaleX * calibracion.x1,
                offsetY: logY1 - scaleY * calibracion.y1
            };
        }
        
        // Fallback: escala por defecto
        return {
            logX: 0.01,
            logY: -0.01,
            offsetX: 0,
            offsetY: 4
        };
    }

    /**
     * Digitalizar contorno a puntos I-t
     * @param {Array} contorno - Array de puntos del contorno
     * @param {Object} escala - Escala de normalización
     * @returns {Array} Array de puntos {I, t}
     */
    function digitalizar(contorno, escala) {
        return contorno.map(p => normalizar(p, escala));
    }

    /**
     * Validar curva digitalizada
     * @param {Array} curva - Array de puntos {I, t}
     * @returns {boolean} True si la curva es válida
     */
    function validarCurva(curva) {
        if (!curva || curva.length < 2) return false;
        
        // Verificar que la curva sea decreciente (t debe disminuir cuando I aumenta)
        for (let i = 1; i < curva.length; i++) {
            if (curva[i].t >= curva[i - 1].t) {
                console.warn('[TCCDigitalizer] Curva no es decreciente en índice', i);
                return false;
            }
        }
        
        // Verificar que todos los valores sean positivos
        for (let i = 0; i < curva.length; i++) {
            if (curva[i].I <= 0 || curva[i].t <= 0) {
                console.warn('[TCCDigitalizer] Valores no positivos en índice', i);
                return false;
            }
        }
        
        return true;
    }

    /**
     * Pipeline principal de digitalización
     * @param {Object} pdf - Objeto PDF de pdf.js
     * @param {Object} opciones - Opciones de digitalización
     * @returns {Promise<Object>} Resultado de digitalización
     */
    async function digitalizarPDF(pdf, opciones) {
        opciones = opciones || {};
        
        console.log('[TCCDigitalizer] Iniciando digitalización...');
        
        // Paso 1: Detectar tipo de PDF
        const tipoPDF = await detectarTipoPDF(pdf);
        
        let curvaDigitalizada = [];
        let escala;
        
        if (tipoPDF === PDF_TYPE.VECTOR) {
            // MODO A: Extracción vectorial
            console.log('[TCCDigitalizer] Usando MODO A (vectorial)');
            
            const page = await pdf.getPage(1);
            const paths = await extraerPaths(page);
            
            // TODO: Procesar paths para extraer curva TCC
            // Por ahora, usar calibración manual
            escala = calcularEscala(null, null, opciones.calibracion);
            
        } else if (tipoPDF === PDF_TYPE.IMAGE) {
            // MODO B: Procesamiento de imagen
            console.log('[TCCDigitalizer] Usando MODO B (imagen)');
            
            // TODO: Implementar procesamiento con OpenCV.js
            escala = calcularEscala(null, null, opciones.calibracion);
            
        } else {
            // MODO C: Fallback manual
            console.log('[TCCDigitalizer] Usando MODO C (manual asistido)');
            escala = calcularEscala(null, null, opciones.calibracion);
        }
        
        // Si hay puntos manuales, digitalizarlos
        if (opciones.puntosManuales && opciones.puntosManuales.length > 0) {
            curvaDigitalizada = digitalizar(opciones.puntosManuales, escala);
        }
        
        // Validar curva
        const valida = validarCurva(curvaDigitalizada);
        
        const resultado = {
            tipoPDF: tipoPDF,
            curva: curvaDigitalizada,
            escala: escala,
            valida: valida,
            marca: opciones.marca || 'Desconocido',
            modelo: opciones.modelo || 'Desconocido',
            frame: opciones.frame || 0
        };
        
        console.log('[TCCDigitalizer] Digitalización completada:', resultado);
        return resultado;
    }

    /**
     * Interpolar valor de tiempo para una corriente dada
     * @param {Array} curva - Curva digitalizada
     * @param {number} I - Corriente a interpolar
     * @returns {number} Tiempo interpolado
     */
    function interpolar(curva, I) {
        if (!curva || curva.length === 0) return 0;
        
        // Buscar puntos que rodean a I
        for (let i = 0; i < curva.length - 1; i++) {
            if (curva[i].I <= I && curva[i + 1].I >= I) {
                // Interpolación log-log
                const logI1 = Math.log10(curva[i].I);
                const logI2 = Math.log10(curva[i + 1].I);
                const logT1 = Math.log10(curva[i].t);
                const logT2 = Math.log10(curva[i + 1].t);
                
                const logI = Math.log10(I);
                const logT = logT1 + (logT2 - logT1) * (logI - logI1) / (logI2 - logI1);
                
                return Math.pow(10, logT);
            }
        }
        
        // Extrapolación
        if (I < curva[0].I) return curva[0].t;
        if (I > curva[curva.length - 1].I) return curva[curva.length - 1].t;
        
        return 0;
    }

    return {
        PDF_TYPE: PDF_TYPE,
        detectarTipoPDF: detectarTipoPDF,
        extraerPaths: extraerPaths,
        normalizar: normalizar,
        detectarEjes: detectarEjes,
        calcularEscala: calcularEscala,
        digitalizar: digitalizar,
        validarCurva: validarCurva,
        digitalizarPDF: digitalizarPDF,
        interpolar: interpolar
    };
})();

if (typeof window !== 'undefined') {
    window.TCCDigitalizer = TCCDigitalizer;
    console.log('[TCCDigitalizer] Módulo cargado correctamente');
}
