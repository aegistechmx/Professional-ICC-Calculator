// Chart generation is optional - if dependencies are not installed, return null
let chartJSNodeCanvas = null;
let Chart = null;

try {
  const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
  const { Chart: ChartJS, registerables } = require('chart.js');
  
  Chart = ChartJS;
  Chart.register(...registerables);
  
  const width = 800;
  const height = 600;
  chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
} catch (err) {
  console.warn('Chart dependencies not installed. Chart generation disabled.');
}

/**
 * Genera imagen de gráfica TCC (Log-Log)
 */
async function generarGraficaTCC(curvas) {
  if (!chartJSNodeCanvas) {
    console.warn('Chart generation not available');
    return null;
  }

  const configuration = {
    type: 'line',
    data: {
      datasets: curvas.map((curva, index) => ({
        label: curva.nombre || `Protección ${index + 1}`,
        data: curva.puntos.map(p => ({ x: p.corriente, y: p.tiempo })),
        borderColor: curva.color || obtenerColorIndex(index),
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        showLine: true,
        stepped: false
      }))
    },
    options: {
      responsive: false,
      scales: {
        x: {
          type: 'logarithmic',
          title: { display: true, text: 'Corriente (A)' },
          min: 10,
          max: 100000,
          ticks: {
            callback: function(value) {
              return value.toLocaleString();
            }
          }
        },
        y: {
          type: 'logarithmic',
          title: { display: true, text: 'Tiempo (s)' },
          min: 0.01,
          max: 1000,
          ticks: {
            callback: function(value) {
              return value.toLocaleString();
            }
          }
        }
      },
      plugins: {
        legend: { display: true, position: 'top' },
        title: { display: true, text: 'Curva Tiempo-Corriente (TCC)' }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

/**
 * Genera imagen de gráfica ICC vs Tiempo
 */
async function generarGraficaICCTiempo(datos) {
  if (!chartJSNodeCanvas) {
    console.warn('Chart generation not available');
    return null;
  }

  const configuration = {
    type: 'line',
    data: {
      datasets: [{
        label: 'Corriente de Cortocircuito',
        data: datos.map(d => ({ x: d.tiempo, y: d.icc })),
        borderColor: '#e11d48',
        backgroundColor: 'rgba(225, 29, 72, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      scales: {
        x: { title: { display: true, text: 'Tiempo (ms)' } },
        y: { title: { display: true, text: 'Corriente (kA)' } }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

function obtenerColorIndex(index) {
  const colores = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];
  return colores[index % colores.length];
}

module.exports = {
  generarGraficaTCC,
  generarGraficaICCTiempo
};
