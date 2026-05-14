# Engine Pipeline + Coordination Fix — 2026-05-13

## Objetivo
Eliminar estados contradictorios entre la UI TCC y el motor real de coordinación, y corregir el pipeline de autocorrección para que siga el orden de ingeniería:

1. carga
2. conductor / ampacidad NOM
3. terminales
4. protección
5. falla a tierra
6. TCC / coordinación

## Cambios aplicados

### 1. Un solo frontend
- `ICCModule.jsx` ahora carga siempre `/cortocircuito/index.html`.
- `api.js` del módulo ICC usa `window.location.origin` en lugar de `http://localhost:3002`.
- `package.json` raíz ya no arranca servidor standalone `3002`.
- `start-all.js` reporta el módulo ICC integrado en `http://localhost:5173/cortocircuito/index.html`.

### 2. Pipeline de autocorrección eléctrica
- `motor_autocorreccion_total.js` ahora corrige conductor/paralelos antes de escalar interruptores.
- Si `I_final < I_diseño`, la protección ya no se escala primero; se bloquea hasta corregir ampacidad.
- Se agrega búsqueda de conductor mínimo NOM con `AmpacidadReal.buscarConductorMinimo()`.
- Se recalcula después de corregir conductor para evitar decisiones con estado viejo.

### 3. Ampacidad y terminales
- `getAmpacidadTerminal()` ya no devuelve una variable fuera de alcance (`I_tabla`).
- Tabla de terminales 60 °C corregida para valores conservadores NOM.
- Tabla de terminales ampliada para calibres 700, 800, 900, 1250, 1500, 1750 y 2000 kcmil.

### 4. Coordinación centralizada
- `motor.js` ahora genera `puntos.coordinacionFinal` como fuente única de verdad.
- `window.__ICC_COORDINATION_FINAL` sincroniza el estado central con el visor TCC.
- `tcc_viewer_interactivo.js` evita mostrar “curvas cruzadas” si el motor central ya validó coordinación final.

### 5. Pruebas y estabilidad
- `Particle.createdAt` ahora es monotónico para evitar pruebas intermitentes dentro del mismo milisegundo.
- Sincronización manual usa fallback si el store está mockeado en pruebas.

## Validación ejecutada

### Frontend
- `npm run lint` ✅
- `npm run build` ✅
- `npm run test:run` ✅ — 245 passed

### Backend
- Instalación usada para prueba: `npm ci --ignore-scripts --no-audit --no-fund` por timeout del postinstall de Prisma en este entorno.
- `npm run lint` ✅
- `npm test -- --runInBand` ✅ — 250 passed, 8 skipped

## Nota de ingeniería
La corrección no “maquilla” errores NOM: si el conductor no cumple, el sistema debe permanecer en error crítico aunque TCC esté coordinado. La coordinación se reporta por separado, pero el estado global debe seguir fallando por ampacidad si aplica.
