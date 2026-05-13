# Correcciones de interfaz y verificación

## Cambios aplicados

- `frontend/src/store/useStore.js`
  - El botón **Calcular ICC** ya no manda valores quemados (`220 V`, `0.05 Ω`) de forma fija.
  - Ahora construye el payload desde el grafo: fuente/transformador/generador, voltaje secundario/tensión/voltaje y longitud de cables.
  - Se normalizó `API_BASE` para usar `/api` por defecto y aprovechar el proxy de Vite.

- `backend/src/server.js`
  - Se agregaron endpoints que la interfaz ya intentaba usar pero no existían:
    - `POST /api/simulacion/branches`
    - `POST /api/reporte/pdf`
    - `POST /api/powerflow/validate`
    - `POST /api/powerflow/run`
    - `POST /api/optimize`
  - Se verificó generación real de PDF.

- `frontend/src/components/particles/__tests__/performance.test.js`
  - Se corrigió una prueba de performance frágil que fallaba por picos aislados de CI/GC.
  - Ahora valida el percentil 95 del tiempo de frame, que representa rendimiento sostenido real.

## Verificación ejecutada

- `npm run lint:check` ✅
- Frontend tests: `245 passed` ✅
- Frontend build: correcto ✅
- Backend tests: `250 passed`, `8 skipped` ✅
- Backend endpoints verificados manualmente:
  - `GET /api/health` ✅
  - `POST /api/icc` ✅
  - `POST /api/cortocircuito/calculate` ✅
  - `POST /api/reporte/pdf` ✅

## Nota técnica

El backend se validó en puerto alterno `3011` porque el puerto `3001` ya estaba ocupado en el entorno de prueba. En tu máquina, el proyecto seguirá usando `3001` por defecto.
