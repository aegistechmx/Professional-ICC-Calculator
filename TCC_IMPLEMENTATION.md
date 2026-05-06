# Curvas TCC Reales - Implementación IEC & IEEE
## Time-Current Coordination - Nivel ETAP/SKM

---

## 🎯 **Qué es una TCC (Time-Current Coordination)**

Una curva TCC es:
- **X**: Corriente (A) - escala logarítmica
- **Y**: Tiempo (s) - escala logarítmica
- Muestra cuánto tarda una protección en disparar según la corriente

---

## 📊 **Fórmulas Implementadas**

### **IEC 60255 - Curvas Inversas**

```
t = (k × TMS) / ((I/Is)^α - 1)
```

| Curva | k | α | Uso típico |
|-------|---|---|-------------|
| **Standard Inverse** | 0.14 | 0.02 | Coordinación general |
| **Very Inverse** | 13.5 | 1 | Transformadores |
| **Extremely Inverse** | 80 | 2 | Motores / Cargas |
| **Long Time Inverse** | 120 | 1 | Líneas largas |

### **IEEE C37.112 - Curvas ANSI**

```
t = (A × TD) / ((I/Ip)^B - 1)
```

| Curva | A | B | Uso típico |
|-------|---|---|-------------|
| **Moderately Inverse** | 0.0515 | 0.02 | Breakers electrónicos |
| **Very Inverse** | 19.61 | 2 | Fusibles |
| **Extremely Inverse** | 28.2 | 2 | Protección de motores |

### **Disparo Instantáneo**

```javascript
if (I >= I_instantaneous) {
  t = 0.02s; // 20ms típico
}
```

---

## 🔧 **Archivos Implementados**

### **Backend**
- `backend/src/domain/services/tccEngine.domain.js` - Motor de curvas
- `backend/src/api/controllers/tcc.controller.js` - API endpoints

### **Frontend**
- `frontend/src/components/TCCChart.jsx` - Visualización log-log
- `frontend/src/components/TCCChart.css` - Estilos

---

## 📡 **API Endpoints**

### **1. Generar Curva TCC**
```http
POST /api/tcc/generate
```

**Request:**
```json
{
  "breaker": {
    "pickup": 200,
    "TMS": 0.1,
    "curve": "very",
    "standard": "IEC",
    "instantaneous": 1000,
    "Imax": 10000
  },
  "load": {
    "In": 100,
    "Iarranque": 600
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "breakerCurve": [
      { "I": 220, "t": 12.5 },
      { "I": 1000, "t": 0.02 }
    ],
    "loadCurve": [
      { "I": 100, "t": Infinity },
      { "I": 600, "t": 10 }
    ]
  }
}
```

### **2. Verificar Coordinación**
```http
POST /api/tcc/coordination
```

**Request:**
```json
{
  "downstream": {
    "pickup": 200,
    "TMS": 0.1,
    "curve": "standard",
    "standard": "IEC"
  },
  "upstream": {
    "pickup": 300,
    "TMS": 0.2,
    "curve": "standard",
    "standard": "IEC"
  },
  "margin": 0.2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "coordination": {
      "isCoordinated": true,
      "conflicts": [],
      "minTimeDifference": 0.35,
      "margin": 0.2,
      "recommendations": ["Coordinación satisfactoria"]
    }
  }
}
```

### **3. Curvas de Sistema Completo**
```http
POST /api/tcc/system
```

Genera todas las curvas TCC para todos los breakers del sistema y verifica coordinaciones.

### **4. Punto de Operación**
```http
POST /api/tcc/operating-point
```

Calcula el punto exacto donde la curva intercepta la corriente de falla.

---

## 🎨 **Visualización Frontend**

### **Características del Chart**

✅ **Escala Log-Log Real**
- Eje X: Corriente (A) - log
- Eje Y: Tiempo (s) - log
- Grid logarítmico completo

✅ **Línea de Corriente de Falla**
```jsx
<ReferenceLine x={Icc} stroke="red" label="Icc" />
```

✅ **Punto de Operación**
- Círculo rojo donde la falla intercepta la curva
- Muestra tiempo exacto de disparo

✅ **Análisis de Coordinación**
- Verificación automática de margen (20%)
- Alerta si hay conflictos
- Diferencia de tiempos calculada

---

## 🔍 **Ejemplo de Uso**

### **Crear Curva IEC Standard Inverse**

```javascript
const engine = new TCCEngine();

const breaker = {
  pickup: 200,        // 200A
  TMS: 0.1,          // Time Multiplier
  curve: 'standard',  // IEC Standard Inverse
  standard: 'IEC',
  instantaneous: 1000 // 1000A instantáneo
};

const curve = engine.generateTCCCurve(breaker);
// → Array de {I, t} listo para graficar
```

### **Verificar Coordinación**

```javascript
const downstream = engine.generateTCCCurve(breaker1);
const upstream = engine.generateTCCCurve(breaker2);

const result = engine.checkCoordination(downstream, upstream, 0.2);

if (result.isCoordinated) {
  console.log('✓ Protecciones coordinadas');
} else {
  console.log('✗ Conflictos:', result.conflicts);
  console.log('Recomendaciones:', result.recommendations);
}
```

---

## 📈 **Integración con Componente React**

```jsx
import TCCChart from './components/TCCChart';

<TCCChart
  curves={[
    {
      id: 'breaker-1',
      name: 'Breaker Principal',
      standard: 'IEC',
      curveType: 'very',
      data: curve1,
      color: '#3b82f6',
      Icc: 12000  // Corriente de cortocircuito
    },
    {
      id: 'breaker-2', 
      name: 'Breaker Carga',
      standard: 'IEC',
      curveType: 'standard',
      data: curve2,
      color: '#10b981',
      Icc: 8500
    }
  ]}
  faultCurrent={12000}
  selectedNode={selectedBreaker}
  width={600}
  height={400}
/>
```

---

## ⚡ **Criterios de Coordinación**

### **Regla de Oro**
> La curva **downstream** (aguas abajo) debe estar a la **izquierda y abajo** de la curva **upstream** (backup)

### **Margen Mínimo**
- **IEC**: 0.3s (300ms) entre operaciones
- **IEEE**: 20% del tiempo del breaker downstream

### **Condición de Éxito**
```javascript
// Tiempo upstream > Tiempo downstream + margen
const isCoordinated = t_upstream > (t_downstream * 1.2);
```

---

## 🏆 **Equivalencia con Software Comercial**

| Feature | ETAP | SKM | Nuestra Implementación |
|---------|------|-----|----------------------|
| IEC Curves | ✅ | ✅ | ✅ (4 tipos) |
| IEEE Curves | ✅ | ✅ | ✅ (3 tipos) |
| Log-Log Scale | ✅ | ✅ | ✅ |
| Instantaneous | ✅ | ✅ | ✅ |
| Coordination Check | ✅ | ✅ | ✅ (con recomendaciones) |
| Fault Reference | ✅ | ✅ | ✅ (línea roja) |
| Operating Point | ✅ | ✅ | ✅ (círculo animado) |

---

## 📚 **Referencias**

- **IEC 60255-151**: Measuring relays and protection equipment
- **IEEE C37.112**: Inverse-Time Characteristic Equations
- **NOM-001-SEDE-2012**: Instalaciones Eléctricas (Utilización)

---

*Implementación completa con fórmulas reales IEC & IEEE*
