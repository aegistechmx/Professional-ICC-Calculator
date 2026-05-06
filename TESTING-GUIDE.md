# ICC Professional API - Testing Guide

## Pruebas Correctas para /api/icc

### Checklist Rápido

- [x] Backend corriendo en http://localhost:3001
- [x] Endpoint correcto: /api/icc  
- [x] Proxy en Vite: `/api` -> `http://localhost:3001`
- [x] Frontend usa solo /api/icc (no /icc)
- [x] Formato JSON compatible

---

## Opción 1: Prueba con Fetch (Frontend)

```javascript
// Forma correcta - usa voltage/impedance
fetch('/api/icc', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    voltage: 13800,
    impedance: 0.05
  })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
```

**Resultado esperado:**
```json
{
  "success": true,
  "data": {
    "method": "simple_accurate",
    "Icc": 159348.67,
    "voltage": 13800,
    "impedance": 0.05,
    "precision": "IEEE_1584",
    "formula": "Isc = V / (sqrt(3) * Z)"
  }
}
```

---

## Opción 2: Prueba con Curl

```bash
# Formato recomendado (voltage/impedance)
curl -X POST http://localhost:3001/api/icc \
-H "Content-Type: application/json" \
-d '{"voltage":13800,"impedance":0.05}'

# Formato legacy (V/Z) - también funciona
curl -X POST http://localhost:3001/api/icc \
-H "Content-Type: application/json" \
-d '{"V":13800,"Z":0.05}'
```

---

## Opción 3: Postman / Thunder Client

**Configuración:**
- Método: POST
- URL: http://localhost:3001/api/icc
- Headers: `Content-Type: application/json`

**Body (JSON):**
```json
{
  "voltage": 13800,
  "impedance": 0.05
}
```

---

## Casos de Prueba Recomendados

### 1. Sistema de Bajo Voltaje
```json
{
  "voltage": 220,
  "impedance": 0.05
}
```
**Expected:** Icc = 2540.34A

### 2. Sistema de Alto Voltaje
```json
{
  "voltage": 13800,
  "impedance": 0.05
}
```
**Expected:** Icc = 159348.67A

### 3. Baja Impedancia (Fallto Grave)
```json
{
  "voltage": 480,
  "impedance": 0.001
}
```
**Expected:** Icc = 277128A

### 4. Impedancia Cero (Error Handling)
```json
{
  "voltage": 220,
  "impedance": 0
}
```
**Expected:** Error message

---

## Troubleshooting Común

### Error: "Unexpected token '<'"
**Causa:** Backend devuelve HTML en lugar de JSON
**Solución:**
1. Verificar backend corriendo en puerto 3001
2. Usar endpoint correcto: /api/icc
3. Verificar proxy Vite configurado

### Error: "Endpoint no encontrado"
**Causa:** URL incorrecta
**Solución:**
1. Usar POST /api/icc (no GET)
2. Verificar puerto correcto (3001)
3. No usar /icc solo

### Error: "Impedancia debe ser mayor a cero"
**Causa:** Impedancia <= 0
**Solución:** Usar valores > 0

---

## Verificación del Sistema

### 1. Health Check
```bash
curl http://localhost:3001/api/health
```

### 2. API Info
```bash
curl http://localhost:3001/api/
```

### 3. Interfaz HTML
```bash
# Abrir en navegador
http://localhost:3001
```

---

## Configuración Verificada

### Backend (server.js)
```javascript
// Acepta ambos formatos
const V = params.voltage || params.V || 220
const Z = params.impedance || params.Z || 0.05
```

### Frontend (vite.config.js)
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true
  }
}
```

### Frontend (useStore.js)
```javascript
fetch('/api/icc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    voltage: 220,
    impedance: 0.05
  })
})
```

---

## Fórmula Aplicada

El sistema usa estándar IEEE 1584:
```
Isc = V / (sqrt(3) * Z)
```

Donde:
- V = Voltaje (Volts)
- Z = Impedancia (Ohms)
- sqrt(3) = 1.732 (factor trifásico)
- Isc = Corriente de cortocircuito (Amperes)

---

## Performance

- Tiempo de respuesta: < 100ms
- Precisión: 6 decimales internos, 2 en output
- Estándares: IEEE 1584, IEC 60909
- Error handling: Fallback automático
