# Auditoría funcional UI/API — 2026-05-13

## Estado validado

- Frontend lint: OK
- Frontend build: OK
- Frontend tests: 245 passed
- Backend lint: OK
- Backend tests: 250 passed, 8 skipped
- Smoke API manual con backend real: OK

## Correcciones aplicadas

1. Se corrigieron errores de sintaxis que podían romper la interfaz:
   - `frontend/src/App.jsx`: llave/cierre duplicado después de `handleDeleteSelected`.
   - `frontend/src/store/useStore.js`: declaración duplicada de `let value` en sanitización de cables.

2. Se centralizaron rutas API del frontend para usar `/api` por defecto y aprovechar el proxy de Vite:
   - `frontend/src/hooks/useApi.js`
   - `frontend/src/hooks/useApi.ts`
   - `frontend/src/hooks/useAutoCalculate.js`
   - `frontend/src/hooks/useLiveSimulation.js`
   - `frontend/src/hooks/useShortCircuit.js`
   - `frontend/src/hooks/useSimulation.js`
   - `frontend/src/store/graphStore.js`
   - `frontend/src/utils/api.js`

3. Se corrigió respuesta esperada por simulación en vivo:
   - `useLiveSimulation` ahora lee `data.data.nodeResults` además del formato anterior.

4. Se agregaron endpoints backend para evitar botones/paneles muertos por rutas inexistentes:
   - `POST /api/simulate`
   - `POST /api/simulacion/sistema`
   - `POST /api/coordination/auto`
   - `POST /api/coordination/analyze`
   - `POST /api/coordination/suggest`
   - `POST /api/coordination/sensitivity`
   - `POST /api/projects`
   - `GET /api/projects`
   - `GET /api/projects/:id`
   - `PUT /api/projects/:id`
   - `POST /api/projects/:id/save`
   - `DELETE /api/projects/:id`
   - `POST /api/proyectos`
   - `GET /api/system/realtime/stream`
   - `POST /api/system/realtime`
   - `GET /api/system/realtime/:hash`
   - `POST /api/system`

5. Se agregaron fallbacks seguros en `backend/src/server.js` para que el backend no deje de responder si un motor avanzado no carga.

## Smoke test API ejecutado

- `GET /api/health`: OK
- `POST /api/icc`: OK
- `POST /api/cortocircuito/calculate`: OK
- `POST /api/coordination/auto`: OK

## Pendiente para “100% ingeniería”

La app ya compila, prueba y responde funcionalmente. Para declarar 100% técnico/industrial todavía falta validar resultados contra una referencia externa confiable: ETAP, SKM, EasyPower, hoja de cálculo aprobada o memoria manual IEC/ANSI/NOM/CFE.
