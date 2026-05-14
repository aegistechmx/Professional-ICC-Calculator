export async function generarReporteICCPro({
  nodes = [],
  edges = [],
  result = {},
  systemParams = {},
  project = {},
}) {
  console.log('Reporte ICC PRO');

  const payload = {
    nodes,
    edges,
    result,
    systemParams,
    project,
  };

  const response = await fetch('/api/reporte/pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Error generando PDF');
  }

  const blob = await response.blob();

  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');

  a.href = url;
  a.download = 'reporte_icc.pdf';

  document.body.appendChild(a);

  a.click();

  a.remove();

  window.URL.revokeObjectURL(url);
}