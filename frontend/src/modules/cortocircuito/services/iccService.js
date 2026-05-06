export async function calcularICC(data) {
  const res = await fetch('/api/icc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error('Error en cálculo ICC');
  }

  return res.json();
}

export async function optimizarCoordinacion(breakers, faults, iterations = 100) {
  const res = await fetch('/api/optimize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ breakers, faults, iterations })
  });

  if (!res.ok) {
    throw new Error('Error en optimización');
  }

  const data = await res.json();
  return data.data; // El resultado está en data.data
}
