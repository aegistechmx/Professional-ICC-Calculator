# Integración de Modo Simulación Animado

## Cambios aplicados

- Se agregó `frontend/src/components/SimulationAnimationLayer.jsx`.
- El modo `simulation` ahora muestra un panel flotante de simulación animada.
- El usuario puede elegir tipo de falla y nodo de falla.
- La simulación ejecuta un cálculo de cortocircuito previo si el backend está disponible.
- Si el backend no responde, la animación corre con valores estimados para no bloquear la UX.
- Se agregaron efectos visuales:
  - arco eléctrico,
  - onda radial tipo shockwave,
  - flujo animado por conductores,
  - propagación de falla,
  - flash de disparo de breakers,
  - contador de eventos/trips.

## Uso

1. Abrir `http://localhost:5173/`.
2. Cambiar a `Modo Simulación`.
3. Seleccionar tipo de falla y nodo.
4. Presionar `Disparar falla`.

## Nota técnica

La capa usa el store principal `useStore`, por lo que ya se sincroniza con el editor React Flow y los resultados de `/api/cortocircuito/calculate`.
