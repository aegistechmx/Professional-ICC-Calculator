/**
 * reporte_visual.js — Generación de Reporte PDF Visual
 * Captura visualmente las secciones de la UI usando html2canvas
 */

var UIReporteVisual = (function() {

    /**
     * Generar reporte PDF visual de la interfaz
     */
    function generarReporteVisual() {
        if (!App.estado.resultados) {
            UIToast.mostrar('Primero debe realizar un cálculo', 'error');
            return;
        }

        UIToast.mostrar('Generando reporte visual...', 'info');

        // Capturar toda la interfaz principal
        var mainContent = document.querySelector('main') || document.body;
        
        html2canvas(mainContent, {
            scale: 1.5,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: mainContent.scrollWidth,
            windowHeight: mainContent.scrollHeight
        }).then(function(canvas) {
            var doc = new window.jspdf.jsPDF('p', 'mm', 'letter');
            var pw = doc.internal.pageSize.getWidth();
            var ph = doc.internal.pageSize.getHeight();

            // Encabezado
            doc.setFillColor(15, 18, 28);
            doc.rect(0, 0, pw, 25, 'F');
            doc.setTextColor(245, 158, 11);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Reporte de Cortocircuito - Visual', 15, 15);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(180, 180, 200);
            doc.text('NOM-001-SEDE-2012', 15, 22);
            doc.setTextColor(120, 120, 140);
            doc.setFontSize(7);
            doc.text(new Date().toLocaleString('es-MX'), pw - 15, 15, {align: 'right'});

            // Calcular dimensiones para ajustar al PDF
            var maxWidth = pw - 30;
            var ratio = maxWidth / canvas.width;
            var imgHeight = canvas.height * ratio;

            // Si la imagen es muy alta, usar orientación horizontal
            if (imgHeight > ph - 40) {
                doc = new window.jspdf.jsPDF('l', 'mm', 'letter');
                pw = doc.internal.pageSize.getWidth();
                ph = doc.internal.pageSize.getHeight();
                
                // Rehacer encabezado en horizontal
                doc.setFillColor(15, 18, 28);
                doc.rect(0, 0, pw, 25, 'F');
                doc.setTextColor(245, 158, 11);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('Reporte de Cortocircuito - Visual', 15, 15);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(180, 180, 200);
                doc.text('NOM-001-SEDE-2012', 15, 22);
                doc.setTextColor(120, 120, 140);
                doc.setFontSize(7);
                doc.text(new Date().toLocaleString('es-MX'), pw - 15, 15, {align: 'right'});
                
                maxWidth = pw - 30;
                ratio = maxWidth / canvas.width;
                imgHeight = canvas.height * ratio;
            }

            // Agregar imagen completa
            var imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 15, 35, maxWidth, imgHeight);

            // Pie de página
            doc.setFontSize(7);
            doc.setTextColor(120, 120, 140);
            doc.text('Página 1 de 1', pw - 15, ph - 10, {align: 'right'});

            // Guardar
            doc.save('reporte_cortocircuito_visual_' + new Date().toISOString().slice(0, 10) + '.pdf');
            UIToast.mostrar('Reporte visual generado', 'success');
        }).catch(function(error) {
            console.error('Error capturando interfaz:', error);
            UIToast.mostrar('Error al generar reporte visual', 'error');
        });
    }

    /**
     * Generar PDF con las capturas
     */
    function generarPDFConCapturas(doc, capturas, pw, ph, startY) {
        var y = startY;

        capturas.forEach(function(captura) {
            if (!captura) return;

            // Título de sección
            if (y > ph - 100) {
                doc.addPage();
                y = 20;
            }

            doc.setFillColor(245, 158, 11);
            doc.roundedRect(15, y, pw - 30, 6, 1, 1, 'F');
            doc.setTextColor(10, 12, 24);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(captura.titulo, 18, y + 4.2);
            y += 12;

            // Calcular dimensiones para ajustar al PDF
            var maxWidth = pw - 30;
            var ratio = maxWidth / captura.width;
            var imgHeight = captura.height * ratio;

            // Verificar si cabe en la página
            if (y + imgHeight > ph - 20) {
                doc.addPage();
                y = 20;
            }

            // Agregar imagen
            doc.addImage(captura.imgData, 'PNG', 15, y, maxWidth, imgHeight);
            y += imgHeight + 15;
        });

        // Pie de página
        var totalPages = doc.internal.getNumberOfPages();
        for (var i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(120, 120, 140);
            doc.text('Página ' + i + ' de ' + totalPages, pw - 15, ph - 10, {align: 'right'});
        }

        // Guardar
        doc.save('reporte_cortocircuito_visual_' + new Date().toISOString().slice(0, 10) + '.pdf');
        UIToast.mostrar('Reporte visual generado', 'success');
    }

    /**
     * Capturar sección específica
     */
    function capturarSeccion(seccionId) {
        var elemento = document.getElementById(seccionId);
        if (!elemento) {
            UIToast.mostrar('Sección no encontrada', 'error');
            return;
        }

        html2canvas(elemento, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        }).then(function(canvas) {
            var link = document.createElement('a');
            link.download = seccionId + '_' + new Date().toISOString().slice(0, 10) + '.png';
            link.href = canvas.toDataURL();
            link.click();
            UIToast.mostrar('Imagen guardada', 'success');
        }).catch(function(error) {
            console.error('Error:', error);
            UIToast.mostrar('Error al capturar sección', 'error');
        });
    }

    return {
        generarReporteVisual: generarReporteVisual,
        capturarSeccion: capturarSeccion
    };
})();

if (typeof window !== 'undefined') {
    window.UIReporteVisual = UIReporteVisual;
}
