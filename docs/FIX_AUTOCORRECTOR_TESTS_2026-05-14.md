# Fix aplicado — Autocorrector conductores/protecciones + pruebas QA

Fecha: 2026-05-14

## Cambios principales

1. `AmpacidadReal.resolverAgrupamiento` ahora distingue:
   - `MANUAL_VALIDO`: factor manual coincide con NOM/CCC.
   - `AUTO_CORREGIDO`: factor manual inconsistente; se corrige automáticamente al factor NOM.
   - `MANUAL_NUM_CONDUCTORES`: conductor count manual sin factor manual.
   - `AUTO`: CCC calculado desde configuración.

2. La prueba `Agrupamiento inconsistente` ya debe pasar porque el motor devuelve `AUTO_CORREGIDO` cuando el factor manual no coincide con los conductores portadores de corriente.

3. La prueba `Validación ingeniería` ahora siempre incluye:
   - `tiempo`
   - `duration`
   - `elapsedMs`

   Con esto se elimina `Tiempo: undefinedms`.

4. Se agregó `autocorrector_conductores_protecciones.js`, cargado antes de `motor_autocorreccion_total.js`.

5. `MotorAutocorreccionTotal` ahora invoca el autocorrector explícito antes de recalcular y antes de TCC.

## Regla de ingeniería preservada

NOM / ampacidad / terminales tienen prioridad sobre TCC. El autocorrector no debe escalar protección si el conductor no cumple.

## Archivos sincronizados

Se aplicó en las copias activas y espejos:

- `frontend/public/cortocircuito/js/...`
- `frontend/public/cortocircuito/cortocircuito/js/...`
- `frontend/dist/cortocircuito/js/...`
- `frontend/dist/cortocircuito/cortocircuito/js/...`
- `icc-core/cortocircuito/js/...`
- `icc-core/cortocircuito/cortocircuito/js/...`

## Validación realizada

- `node --check` sobre archivos modificados.
- Prueba directa en VM Node de `resolverAgrupamiento`:
  - manual inconsistente `0.5` con 3 conductores → `AUTO_CORREGIDO`.
  - manual válido `1.0` con 3 conductores → `MANUAL_VALIDO`.
