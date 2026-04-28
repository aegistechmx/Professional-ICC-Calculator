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
     * Extraer paths vectoriales de una página PDF
     * @param {Object} page - Página PDF de pdf.js
     * @returns {Promise<Array>} Array de paths
     */
    async function extraerPaths(page) {
        try {
            const ops = await page.getOperatorList();
            const viewport = page.getViewport({ scale: 1.0 });
            
            // Extraer paths de los operadores
            const paths = [];
            let currentPath = [];
            
            for (let i = 0; i < ops.fnArray.length; i++) {
                const fn = ops.fnArray[i];
                const args = ops.argsArray[i];
                
                if (fn === 1) { // stroke
                    if (currentPath.length > 0) {
                        paths.push(currentPath);
                        currentPath = [];
                    }
                } else if (fn === 2 || fn === 3) { // moveTo, lineTo
                    currentPath.push(...args);
                }
            }
            
            return paths;
        } catch (e) {
            console.error('[TCCDigitalizer] Error extrayendo paths:', e);
            return [];
        }
    }

    /**
     * Procesar paths vectoriales para extraer curva TCC
     * @param {Array} paths - Array de paths extraídos
     * @param {Object} viewport - Viewport de la página
     * @returns {Array} Array de puntos {x, y} de la curva
     */
    function procesarPaths(paths, viewport) {
        const puntosCurva = [];
        
        paths.forEach(path => {
            if (!path || !Array.isArray(path)) return;
            
            // Procesar comandos del path
            let currentPoint = null;
            let subpath = [];
            
            for (let i = 0; i < path.length; i++) {
                const cmd = path[i];
                
                switch (cmd) {
                    case 'm': // moveto
                        if (subpath.length > 0) {
                            // Cerrar subpath anterior
                            puntosCurva.push(...filtrarPuntosCurva(subpath));
                            subpath = [];
                        }
                        currentPoint = {
                            x: path[i + 1],
                            y: path[i + 2]
                        };
                        subpath.push(currentPoint);
                        i += 2;
                        break;
                        
                    case 'l': // lineto
                        currentPoint = {
                            x: path[i + 1],
                            y: path[i + 2]
                        };
                        subpath.push(currentPoint);
                        i += 2;
                        break;
                        
                    case 'c': // curveto
                        // Para curvas de Bézier, samplear puntos
                        const puntosBezier = samplearBezier(
                            currentPoint,
                            { x: path[i + 1], y: path[i + 2] }, // control point 1
                            { x: path[i + 3], y: path[i + 4] }, // control point 2
                            { x: path[i + 5], y: path[i + 6] }  // end point
                        );
                        subpath.push(...puntosBezier);
                        currentPoint = { x: path[i + 5], y: path[i + 6] };
                        i += 6;
                        break;
                        
                    case 'h': // close path
                        if (subpath.length > 0) {
                            // Cerrar subpath
                            puntosCurva.push(...filtrarPuntosCurva(subpath));
                            subpath = [];
                        }
                        break;
                }
            }
            
            // Procesar último subpath si existe
            if (subpath.length > 0) {
                puntosCurva.push(...filtrarPuntosCurva(subpath));
            }
        });
        
        console.log('[TCCDigitalizer] Puntos extraídos de paths:', puntosCurva.length);
        return puntosCurva;
    }

    /**
     * Samplear puntos de una curva de Bézier cúbica
     * @param {Object} p0 - Punto inicial
     * @param {Object} p1 - Punto de control 1
     * @param {Object} p2 - Punto de control 2
     * @param {Object} p3 - Punto final
     * @returns {Array} Array de puntos sampleados
     */
    function samplearBezier(p0, p1, p2, p3) {
        const puntos = [];
        const steps = 10; // Número de puntos a samplear
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = Math.pow(1 - t, 3) * p0.x +
                     3 * Math.pow(1 - t, 2) * t * p1.x +
                     3 * (1 - t) * Math.pow(t, 2) * p2.x +
                     Math.pow(t, 3) * p3.x;
            const y = Math.pow(1 - t, 3) * p0.y +
                     3 * Math.pow(1 - t, 2) * t * p1.y +
                     3 * (1 - t) * Math.pow(t, 2) * p2.y +
                     Math.pow(t, 3) * p3.y;
            
            puntos.push({ x, y });
        }
        
        return puntos;
    }

    /**
     * Filtrar puntos que corresponden a una curva TCC (no ejes, texto, etc.)
     * @param {Array} puntos - Array de puntos del subpath
     * @returns {Array} Puntos filtrados de la curva
     */
    function filtrarPuntosCurva(puntos) {
        if (puntos.length < 10) return []; // Demasiado pocos puntos
        
        // Calcular bounding box
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        puntos.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });
        
        const width = maxX - minX;
        const height = maxY - minY;
        
        // Filtrar paths que no parecen curvas TCC
        // Las curvas TCC típicamente son más anchas que altas (log-log scale)
        if (height > width * 0.8) return []; // Probablemente eje Y o texto
        
        // Las curvas TCC tienen una forma característica decreciente
        // Verificar que los puntos siguen un patrón de curva
        const angulos = [];
        for (let i = 1; i < puntos.length - 1; i++) {
            const dx1 = puntos[i].x - puntos[i-1].x;
            const dy1 = puntos[i].y - puntos[i-1].y;
            const dx2 = puntos[i+1].x - puntos[i].x;
            const dy2 = puntos[i+1].y - puntos[i].y;
            
            if (dx1 !== 0 && dx2 !== 0) {
                const angle1 = Math.atan2(dy1, dx1);
                const angle2 = Math.atan2(dy2, dx2);
                angulos.push(Math.abs(angle2 - angle1));
            }
        }
        
        // Si hay muchos cambios de dirección bruscos, no es una curva suave
        const cambiosBruscos = angulos.filter(a => a > Math.PI / 4).length;
        if (cambiosBruscos > angulos.length * 0.3) return [];
        
        return puntos;
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
     * Procesar imagen de PDF con OpenCV.js para extraer curva TCC
     * @param {HTMLCanvasElement} canvas - Canvas con la imagen del PDF
     * @returns {Promise<Array>} Array de puntos {x, y} de la curva
     */
    async function procesarImagenOpenCV(canvas) {
        return new Promise((resolve) => {
            if (typeof cv === 'undefined') {
                console.warn('[TCCDigitalizer] OpenCV.js no disponible');
                resolve([]);
                return;
            }

            try {
                // OPTIMIZACIÓN 1: Reducir tamaño de imagen para procesamiento más rápido
                const img = cv.imread(canvas);
                const scaleFactor = 0.5; // Reducir a 50% para mejor rendimiento
                const scaledSize = new cv.Size(
                    Math.floor(img.cols * scaleFactor),
                    Math.floor(img.rows * scaleFactor)
                );

                const scaled = new cv.Mat();
                cv.resize(img, scaled, scaledSize, 0, 0, cv.INTER_LINEAR);

                // Convertir a escala de grises
                const gray = new cv.Mat();
                cv.cvtColor(scaled, gray, cv.COLOR_RGBA2GRAY);

                // OPTIMIZACIÓN 2: Blur adaptativo basado en tamaño de imagen
                const blurSize = Math.max(3, Math.floor(scaled.cols / 200)); // Blur proporcional
                const blurred = new cv.Mat();
                cv.GaussianBlur(gray, blurred, new cv.Size(blurSize, blurSize), 0);

                // OPTIMIZACIÓN 3: Canny con parámetros optimizados
                const edges = new cv.Mat();
                cv.Canny(blurred, edges, 30, 100); // Umbrales más bajos para mejor detección

                // OPTIMIZACIÓN 4: Dilatación más eficiente
                const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2));
                const dilated = new cv.Mat();
                cv.dilate(edges, dilated, kernel);

                // Encontrar contornos con aproximación más simple
                const contours = new cv.MatVector();
                const hierarchy = new cv.Mat();
                cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_TC89_KCOS);

                const puntosCurva = [];
                const maxContours = Math.min(contours.size(), 50); // Limitar procesamiento

                // OPTIMIZACIÓN 5: Procesamiento en lotes con early exit
                for (let i = 0; i < maxContours; i++) {
                    const contour = contours.get(i);

                    // Early exit para contornos muy pequeños
                    if (contour.rows < 20) {
                        contour.delete();
                        continue;
                    }

                    const puntosContorno = [];

                    // OPTIMIZACIÓN 6: Procesamiento vectorizado de puntos
                    const dataPtr = contour.data32S; // Usar data32S para acceso directo
                    for (let j = 0; j < contour.rows; j++) {
                        const idx = j * 2;
                        puntosContorno.push({
                            x: dataPtr[idx] / scaleFactor,     // Escalar de vuelta
                            y: dataPtr[idx + 1] / scaleFactor
                        });
                    }

                    // Filtrar contornos que parecen curvas TCC (optimizado)
                    const puntosFiltrados = filtrarContornoCurvaOptimizado(puntosContorno);
                    if (puntosFiltrados.length > 0) {
                        puntosCurva.push(...puntosFiltrados);
                    }

                    contour.delete();
                }

                // OPTIMIZACIÓN 7: Limpieza de memoria más eficiente
                const matsToDelete = [img, scaled, gray, blurred, edges, dilated, kernel, contours, hierarchy];
                matsToDelete.forEach(mat => {
                    if (mat && typeof mat.delete === 'function') {
                        mat.delete();
                    }
                });

                console.log(`[TCCDigitalizer] Procesamiento optimizado completado: ${puntosCurva.length} puntos de ${maxContours} contornos`);
                resolve(puntosCurva);

            } catch (e) {
                console.error('[TCCDigitalizer] Error procesando imagen con OpenCV:', e);
                resolve([]);
            }
        });
    }

    /**
     * Filtrar contorno para determinar si corresponde a una curva TCC (versión optimizada)
     * @param {Array} contorno - Array de puntos del contorno
     * @returns {Array} Puntos filtrados si es una curva válida
     */
    function filtrarContornoCurvaOptimizado(contorno) {
        const len = contorno.length;
        if (len < 20) return []; // Demasiado pequeño

        // OPTIMIZACIÓN: Calcular bounding box en un solo paso
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let sumX = 0, sumY = 0;

        for (let i = 0; i < len; i++) {
            const p = contorno[i];
            const x = p.x, y = p.y;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            sumX += x;
            sumY += y;
        }

        const width = maxX - minX;
        const height = maxY - minY;

        // Las curvas TCC son más anchas que altas
        if (height > width * 0.7) return [];

        // Verificar aspect ratio
        const aspectRatio = width / height;
        if (aspectRatio < 2 || aspectRatio > 20) return [];

        // OPTIMIZACIÓN: Verificar forma de curva usando estadísticas
        const centroidX = sumX / len;
        const centroidY = sumY / len;

        // Calcular varianza para detectar distribución de puntos
        let varianceX = 0, varianceY = 0;
        for (let i = 0; i < len; i++) {
            const p = contorno[i];
            varianceX += Math.pow(p.x - centroidX, 2);
            varianceY += Math.pow(p.y - centroidY, 2);
        }
        varianceX /= len;
        varianceY /= len;

        // Las curvas TCC tienen mayor varianza en X que en Y
        if (varianceX < varianceY * 2) return [];

        // OPTIMIZACIÓN: Verificar que no sea cerrado (distancia entre extremos)
        const firstPoint = contorno[0];
        const lastPoint = contorno[len - 1];
        const distance = Math.sqrt(
            Math.pow(lastPoint.x - firstPoint.x, 2) +
            Math.pow(lastPoint.y - firstPoint.y, 2)
        );

        if (distance < Math.min(width, height) * 0.1) return []; // Probablemente cerrado

        return contorno;
    }

    /**
     * Detectar ejes automáticamente a partir de puntos crudos
     * @param {Array} puntos - Array de puntos {x, y}
     * @returns {Object} { ejeX, ejeY }
     */
    function detectarEjesAutomaticamente(puntos) {
        if (!puntos || puntos.length === 0) {
            return { ejeX: null, ejeY: null };
        }

        // Encontrar bounds
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        puntos.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });

        // Asumir ejes en los bordes
        return {
            ejeX: { x1: minX, y1: maxY, x2: maxX, y2: maxY },
            ejeY: { x1: minX, y1: minY, x2: minX, y2: maxY }
        };
    }

    /**
     * Detectar ejes de la gráfica usando OpenCV
     * @param {Object} img - Imagen OpenCV
     * @returns {Object} { ejeX, ejeY }
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
            const viewport = page.getViewport({ scale: 1.0 });
            const paths = await extraerPaths(page);
            
            // Procesar paths para extraer curva TCC
            const puntosCrudos = procesarPaths(paths, viewport);
            
            if (puntosCrudos.length > 0) {
                // Detectar ejes automáticamente o usar calibración manual
                const ejesDetectados = detectarEjesAutomaticamente(puntosCrudos);
                escala = calcularEscala(ejesDetectados.ejeX, ejesDetectados.ejeY, opciones.calibracion);
                
                // Digitalizar puntos
                curvaDigitalizada = digitalizar(puntosCrudos, escala);
                console.log('[TCCDigitalizer] Curva extraída de paths vectoriales:', curvaDigitalizada.length, 'puntos');
            } else {
                // Fallback a calibración manual
                console.warn('[TCCDigitalizer] No se encontraron paths válidos, usando calibración manual');
                escala = calcularEscala(null, null, opciones.calibracion);
            }
            
        } else if (tipoPDF === PDF_TYPE.IMAGE) {
            // MODO B: Procesamiento de imagen con OpenCV.js
            console.log('[TCCDigitalizer] Usando MODO B (imagen)');
            
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
            
            // Renderizar página como canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            // Procesar imagen con OpenCV.js
            const puntosImagen = await procesarImagenOpenCV(canvas);
            
            if (puntosImagen.length > 0) {
                // Detectar ejes en la imagen
                const ejesDetectados = detectarEjes(canvas);
                escala = calcularEscala(ejesDetectados.ejeX, ejesDetectados.ejeY, opciones.calibracion);
                
                // Digitalizar puntos
                curvaDigitalizada = digitalizar(puntosImagen, escala);
                console.log('[TCCDigitalizer] Curva extraída de imagen:', curvaDigitalizada.length, 'puntos');
            } else {
                // Fallback a calibración manual
                console.warn('[TCCDigitalizer] No se pudo procesar imagen, usando calibración manual');
                escala = calcularEscala(null, null, opciones.calibracion);
            }
            
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
        procesarPaths: procesarPaths,
        detectarEjesAutomaticamente: detectarEjesAutomaticamente,
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
