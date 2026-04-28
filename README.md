# Professional ICC Calculator

Sistema profesional de cálculo de corrientes de cortocircuito (ICC) y coordinación de protecciones eléctricas tipo ETAP/SKM.

## 🚀 Características Principales

- **Motor ICC tipo ETAP/SKM**: Cálculos precisos según IEEE Std 399, IEC 60909 y NOM-001-SEDE
- **Editor Visual Interactivo**: Arrastra y suelta componentes eléctricos
- **Soporte ATS y Generadores**: Sistemas de respaldo automático
- **Validación en Tiempo Real**: Verificación de ampacidad y capacidad interruptiva
- **Autocorrección Inteligente**: Ajuste automático de calibres y protecciones
- **Exportación a Cortocircuito**: Integración con calculadora standalone

## 📦 Arquitectura

```
Professional ICC Calculator/
├── frontend/          # React + Vite + React Flow
├── backend/           # Node.js + Express
├── cortocircuito/     # Calculadora standalone HTML/JS
└── docs/             # Documentación técnica
```

### Componentes Frontend

- **React Flow**: Editor visual de diagramas eléctricos
- **Zustand**: Gestión de estado global
- **Axios/Fetch**: Comunicación con API
- **TailwindCSS**: Estilos utilitarios

### Componentes Backend

- **Express.js**: API RESTful
- **Motor de Cálculo**: Implementación IEEE/IEC/NOM
- **Validación de Topología**: Verificación de reglas eléctricas
- **CORS**: Configurado para desarrollo

## 🛠️ Instalación

### Requisitos
- Node.js 18+
- npm o yarn

### Pasos

1. **Clonar repositorio**
```bash
git clone https://github.com/yourusername/Professional-ICC-Calculator.git
cd Professional-ICC-Calculator
```

2. **Instalar dependencias**
```bash
# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install
```

3. **Iniciar sistema completo**
```bash
# Windows
start-all.bat

# Node.js (multiplataforma)
node start-all.js

# Linux/Mac
./start-all.sh
```

## 🌐 URLs de Acceso

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Cortocircuito | http://localhost:3002 |

## 📊 Tipos de Nodos Soportados

| Tipo | Descripción | Parámetros |
|------|-------------|------------|
| `transformer` | Transformador de distribución | kVA, Vprimario, Vsecundario, Z% |
| `generator` | Generador de respaldo | kVA, V, fp, Xd |
| `ats` | Transferencia automática | modo (normal/emergencia) |
| `panel` | Tablero de distribución | nombre, descripción |
| `breaker` | Interruptor termomagnético | In, Icu, polos |
| `load` | Carga general | kW, V, fp |
| `motor` | Motor eléctrico | HP, V, eficiencia, fp |

## 🔌 Reglas de Conexión

Las conexiones siguen la jerarquía eléctrica estándar:

```
FUENTE (transformer/generator)
    ↓
ATS (opcional)
    ↓
PANEL / BREAKER
    ↓
CARGA / MOTOR
```

### Reglas de Validación

- **Transformador/Generador** → Panel, Breaker, ATS
- **ATS** → Panel, Breaker
- **Breaker** → Panel, Carga, Motor
- **Panel** → Panel, Breaker, Carga, Motor
- **Nadie puede alimentar un Generador**

## 🧮 Cálculos Implementados

### Cortocircuito (ICC)

```javascript
// Método del transformador
I_sc = I_fl / (Z% / 100)

// Método del generador
I_sc = I_fl / Xd
```

### Ampacidad de Cables

```javascript
// Tabla NOM-001-SEDE Art. 310
I_corregida = I_tabla × F_temp × F_agrup × paralelos

// Verificación
I_corregida ≥ I_carga × 1.25 (factor continuo)
```

### Coordinación de Protecciones

- **Selectividad**: Margen mínimo 20% entre curvas
- **Icu**: Capacidad interruptiva ≥ Isc disponible
- **Factor 125%**: Para cargas continuas (NOM-001-SEDE Art. 310)

## 🧪 Testing

```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test
```

## 📝 API Endpoints

### Power Flow
- `POST /powerflow/run` - Calcular flujo de potencia
- `POST /powerflow/validate` - Validar sistema

### Cortocircuito
- `POST /cortocircuito/calculate` - Calcular ICC por nodo
- `GET /cortocircuito/health` - Estado del servicio

### Simulación
- `POST /simulacion/branches` - Calcular por ramas
- `POST /simulacion/live` - Simulación en tiempo real

## 🎨 Componentes UI

### Tooltip.jsx
```jsx
<Tooltip text="Capacidad en kVA" position="top">
  <input name="kVA" />
</Tooltip>
```

### ValidationPanel
```jsx
<ValidationPanel 
  validationResult={result} 
  onClose={() => setShowPanel(false)} 
/>
```

## 🔧 Configuración

### Variables de Entorno Frontend
```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_NODE_ENV=development
```

### Variables de Entorno Backend
```bash
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
NODE_ENV=development
```

## 📚 Documentación Adicional

- [IEEE Std 399 - Power System Analysis](https://standards.ieee.org/standard/399-1997.html)
- [IEC 60909 - Short-circuit currents](https://webstore.iec.ch/publication/41171)
- [NOM-001-SEDE - Instalaciones Eléctricas](https://www.gob.mx/dof)

## 🤝 Contribuir

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

## 👥 Autores

- **ICC Software SaaS** - *Desarrollo inicial*

---

<p align="center">
  <strong>⚡ Professional ICC Calculator - Motor de Ingeniería Eléctrica</strong>
</p>
