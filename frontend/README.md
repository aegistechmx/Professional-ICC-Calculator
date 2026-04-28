# ICC Calculator - Frontend Visual Editor

Editor visual tipo ETAP para sistemas eléctricos usando React Flow.

## Stack Tecnológico

- **React 18** - UI Framework
- **React Flow 11** - Editor visual con nodos arrastrables
- **Zustand** - State management
- **Tailwind CSS** - Estilos
- **Vite** - Build tool
- **Axios** - Cliente HTTP

## Instalación

```bash
cd frontend
npm install
```

## Desarrollo

```bash
npm run dev
```

El frontend se ejecuta en `http://localhost:3000` y proxy las peticiones al backend en `http://localhost:3001`.

## Componentes del Editor

### Nodos Eléctricos

- 🔌 **Transformador** - Transformador de potencia (kVA, primario, secundario, Z)
- ⚡ **Breaker** - Interruptor automático (In, Icu, tipo)
- 📦 **Tablero** - Panel de distribución (tensión, fases)
- 🏭 **Motor** - Motor de inducción (HP, voltaje, eficiencia)
- 💡 **Carga** - Carga general (potencia kW, factor de potencia)

### Funcionalidades

1. **Drag & Drop** - Arrastrar componentes desde sidebar al canvas
2. **Conexiones** - Conectar nodos con líneas (click en handle y arrastrar)
3. **Zoom/Pan** - Navegar el canvas con controles o mouse
4. **Minimap** - Vista general del sistema
5. **Calcular ICC** - Enviar sistema visual al backend para cálculo
6. **Generar PDF** - Exportar reporte profesional con gráficas

## Integración con Backend

El editor convierte el sistema visual a modelo eléctrico:

```javascript
// Nodos → Elementos eléctricos
{
  elementos: [
    { id: '1', tipo: 'transformador', nombre: 'Transformador', kVA: 500, ... },
    { id: '2', tipo: 'breaker', nombre: 'Breaker', In: 100, ... }
  ],
  conexiones: [
    { id: 'e1', origen: '1', destino: '2' }
  ]
}
```

## Endpoints Backend

- `POST /api/calculo/icc` - Calcular corriente de cortocircuito
- `POST /api/reporte/pdf` - Generar reporte PDF
- `POST /api/proyectos` - Guardar proyecto

## Estructura de Archivos

```
frontend/
├── src/
│   ├── components/
│   │   ├── Editor.jsx          # Canvas React Flow
│   │   ├── Sidebar.jsx          # Panel de componentes
│   │   └── nodes/
│   │       ├── BreakerNode.jsx
│   │       ├── TransformerNode.jsx
│   │       ├── PanelNode.jsx
│   │       ├── LoadNode.jsx
│   │       └── MotorNode.jsx
│   ├── store/
│   │   └── useStore.js          # Zustand store
│   ├── App.jsx                 # Componente principal
│   ├── main.jsx                # Entry point
│   └── index.css               # Estilos globales
├── package.json
├── vite.config.js
├── tailwind.config.js
└── index.html
```

## Características Profesionales

✔ Editor visual tipo software de ingeniería (ETAP)
✔ Símbolos eléctricos estandarizados
✔ Conexiones reales entre componentes
✔ Conversión automática a modelo eléctrico
✔ Integración directa con backend
✔ Cálculo ICC desde editor visual
✔ Generación de PDF profesional
