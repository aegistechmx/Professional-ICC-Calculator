# Motor de Auto-Coordinación - Nivel ETAP/SKM
## Algoritmo de Optimización Iterativa para Protecciones

---

## 🎯 **Concepto Clave**

Para cada corriente I:
```
t_downstream(I) + Δt < t_upstream(I)
```

Donde **Δt = margen** (típicamente 0.2-0.4 segundos)

**Condición de coordinación exitosa:**
> La curva de abajo debe disparar **antes** que la de arriba, manteniendo un margen de tiempo.

---

## 🔧 **Implementación del Motor**

### **Archivos Creados**

| Archivo | Descripción |
|---------|-------------|
| `backend/src/domain/services/coordinationEngine.domain.js` | Motor de optimización iterativa |
| `backend/src/api/controllers/coordination.controller.js` | API endpoints |
| `frontend/src/components/CoordinationStatusPanel.jsx` | Panel de estado visual |
| `frontend/src/hooks/useCoordination.js` | Hook para integración |
| `frontend/src/components/TCCChartWithCoordination.jsx` | Chart con marcadores |

---

## ⚙️ **Algoritmo de Auto-Coordinación**

### **1. Configuración**
```javascript
const config = {
  margin: 0.3,           // Margen mínimo (s)
  maxIterations: 20,     // Máximo iteraciones
  tmsIncrement: 1.15,    // 15% incremento TMS
  pickupIncrement: 1.2,  // 20% incremento pickup
  instIncrement: 1.1,   // 10% incremento instantáneo
  maxTMS: 1.0,
  maxPickup: 1000
};
```

### **2. Loop de Optimización**
```javascript
while (changed && iterations < MAX_ITER) {
  for (cada par downstream → upstream) {
    1. Generar curvas TCC
    2. Detectar cruces con margen
    3. Si hay conflicto:
       - Ajustar TMS (prioridad 1)
       - Aumentar pickup (prioridad 2)
       - Subir instantáneo (prioridad 3)
    4. Registrar cambio
  }
}
```

### **3. Detección de Cruces**
```javascript
function detectCrossings(curveDown, curveUp, margin) {
  for (cada punto en curveDown) {
    punto_correspondiente = buscarEnCurveUp(punto.I)
    
    if (punto.t + margin >= punto_correspondiente.t) {
      cruce_detectado = {
        I: punto.I,
        tDown: punto.t,
        tUp: punto_correspondiente.t,
        deficit: (punto.t + margin) - punto_correspondiente.t
      }
    }
  }
}
```

### **4. Ajuste Inteligente**
```javascript
function adjustBreaker(upstream, downstream, crossings) {
  // Prioridad 1: TMS
  if (upstream.TMS < 1.0) {
    upstream.TMS *= 1.15;
    return 'TMS_INCREASE';
  }
  
  // Prioridad 2: Pickup
  else if (upstream.pickup < downstream.pickup * 2) {
    upstream.pickup *= 1.2;
    return 'PICKUP_INCREASE';
  }
  
  // Prioridad 3: Instantáneo
  else {
    upstream.instantaneous *= 1.1;
    return 'INSTANTANEOUS_INCREASE';
  }
}
```

---

## 📡 **API Endpoints**

### **1. Auto-Coordinación**
```http
POST /api/coordination/auto
```

**Request:**
```json
{
  "breakers": [
    { "id": "B1", "pickup": 100, "TMS": 0.1, "curve": "standard", "standard": "IEC" },
    { "id": "B2", "pickup": 200, "TMS": 0.1, "curve": "standard", "standard": "IEC" }
  ],
  "options": {
    "margin": 0.3,
    "maxIterations": 20
  }
}
```

**Response:**
```json
{
  "status": "COORDINATED",
  "breakers": [...],
  "iterations": 5,
  "history": [
    {
      "iteration": 1,
      "pair": "B1 → B2",
      "adjustment": "TMS_INCREASE",
      "values": { "old": 0.1, "new": 0.115, "percent": "15.0" }
    }
  ],
  "finalStatus": {
    "isCoordinated": true,
    "totalCrossings": 0,
    "quality": 100
  }
}
```

### **2. Análisis Sin Modificar**
```http
POST /api/coordination/analyze
```

### **3. Sugerencias Manuales**
```http
POST /api/coordination/suggest
```

### **4. Análisis de Sensibilidad**
```http
POST /api/coordination/sensitivity
```

---

## 🎨 **Visualización Frontend**

### **Estados de Coordinación**

| Estado | Color | Badge | Significado |
|--------|-------|-------|-------------|
| **COORDINATED** | 🟢 Verde | ✓ | Todas las protecciones coordinadas |
| **PARTIAL** | 🟡 Amarillo | ⚠ | Algunos conflictos resueltos |
| **CONFLICT** | 🔴 Rojo | ✗ | Cruces no resueltos |

### **Panel de Estado**
- **Score de calidad**: 0-100%
- **Iteraciones**: Número de ajustes realizados
- **Pares de protección**: Estado de cada par
- **Historial**: Registro de todos los cambios
- **Sugerencias**: Recomendaciones manuales

### **Marcadores en Chart**
- 🔴 Círculo pulsante en zonas de conflicto
- 📍 Tooltip con información del cruce
- ❌ X indicando punto exacto

---

## 📊 **Criterios de Éxito**

### **Regla de Oro**
> **t_upstream > t_downstream × 1.2** (margen 20%)

### **Margen Mínimo por Tipo**
| Tipo de Protección | Margen Típico |
|-------------------|---------------|
| Breakers (IEC) | 0.3s (300ms) |
| Breakers (IEEE) | 0.2s (200ms) |
| Fusibles | 0.2s (200ms) |

### **Score de Calidad**
```javascript
quality = (pares_coordinados / total_pares) × 100

quality >= 80% → EXCELENTE
quality >= 50% → ACEPTABLE
quality < 50%  → REVISAR
```

---

## 🔄 **Flujo de Uso**

```
1. Sistema con breakers no coordinados
   ↓
2. Ejecutar POST /api/coordination/auto
   ↓
3. Motor itera y ajusta parámetros
   ↓
4. Retorna breakers coordinados + historial
   ↓
5. Frontend muestra panel visual
   - Verde: Coordinado ✓
   - Amarillo: Parcial ⚠
   - Rojo: Conflictos ✗
   ↓
6. Usuario puede aplicar o revertir cambios
   ↓
7. Chart TCC muestra marcadores de conflicto
```

---

## 💎 **Diferenciadores PRO**

✅ **Optimización Iterativa**: Hasta 20 iteraciones automáticas  
✅ **Estrategia Inteligente**: Prioriza TMS → Pickup → Instantáneo  
✅ **Detección Precisa**: Identifica puntos exactos de cruce  
✅ **Historial Completo**: Cada ajuste registrado  
✅ **Sugerencias Manuales**: Cuando auto no es suficiente  
✅ **Análisis Sensibilidad**: Diferentes márgenes probados  
✅ **Score de Calidad**: Métrica cuantitativa de coordinación  

---

## 🏆 **Equivalencia con Software Comercial**

| Feature | ETAP | SKM | Nuestra Implementación |
|---------|------|-----|----------------------|
| Auto-Coordinate | ✅ | ✅ | ✅ (con historial) |
| Margin Check | ✅ | ✅ | ✅ (configurable) |
| Iterative Adjust | ✅ | ✅ | ✅ (3 estrategias) |
| Quality Score | ✅ | ✅ | ✅ (0-100%) |
| Visual Markers | ✅ | ✅ | ✅ (SVG overlay) |
| Sensitivity Analysis | ✅ | ✅ | ✅ (múltiples márgenes) |

---

## 🚀 **Esto es Software de Ingeniería Real**

### **Problema Resuelto**
- Optimización no lineal con restricciones físicas
- Comportamiento iterativo convergente
- Múltiples variables (TMS, pickup, Iinst)
- Solución práctica para ingenieros eléctricos

### **Base para Estudios**
- Coordinación de protecciones NOM-001
- Estudios de selectividad
- Memoria de cálculo profesional
- Software tipo ETAP/SKM

---

*Motor de auto-coordinación completo - Nivel despacho de ingeniería* ⚡🎓
