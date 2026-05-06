# 🧮 Calculadora de Cortocircuito - ICC Calculator

Una aplicación web standalone para el cálculo de corriente de cortocircuito según normas IEC 60909.

## 🚀 Características

- **Cálculo Trifásico**: Corriente de cortocircuito trifásica con factor de asimetría
- **Cálculo Monofásico**: Corriente de cortocircuito monofásica a tierra
- **Cálculo Bifásico**: Corriente de cortocircuito bifásica
- **Validación en Tiempo Real**: Validación automática de parámetros
- **Datos de Ejemplo**: Conjuntos de datos predefinidos para pruebas
- **Exportación/Importación**: Guardar y cargar cálculos
- **Interfaz Intuitiva**: Diseño moderno con Tailwind CSS

## 📋 Requisitos del Sistema

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Conexión a internet para cálculos del backend
- Resolución mínima: 1024x768

## 🛠️ Instalación y Uso

### Opción 1: Ejecutar Localmente

1. **Clonar el repositorio**:
   ```bash
   git clone <repository-url>
   cd cortocircuito
   ```

2. **Abrir en navegador**:
   - Abrir `index.html` directamente en el navegador
   - O usar un servidor local:
     ```bash
     python -m http.server 8000
     # Luego abrir http://localhost:8000
     ```

### Opción 2: Integración con Backend

La aplicación requiere un backend corriendo en `http://localhost:3002` para realizar los cálculos.

## 📊 Parámetros de Entrada

### Sistema Eléctrico
- **Tensión (V)**: Tensión nominal del sistema (120 - 500,000 V)
- **Corriente de Carga (A)**: Corriente nominal de carga (0.1 - 100,000 A)
- **Factor de Potencia**: Factor de potencia del sistema (0.1 - 1.0)
- **Longitud del Cable (m)**: Longitud del conductor (0.1 - 10,000 m)

### Conductor
- **Calibre**: Sección transversal del conductor
  - 350 kcmil, 4/0 AWG, 3/0 AWG, 2/0 AWG, 1/0 AWG, 12 AWG
- **Temperatura (°C)**: Temperatura ambiente (-40 - 100°C)

## 📈 Resultados del Cálculo

### Corrientes de Cortocircuito
- **Trifásica (kA)**: Corriente de cortocircuito trifásica
- **Trifásica Asimétrica (kA)**: Corriente máxima asimétrica trifásica
- **Monofásica (kA)**: Corriente de cortocircuito monofásica
- **Monofásica Asimétrica (kA)**: Corriente máxima asimétrica monofásica
- **Bifásica (kA)**: Corriente de cortocircuito bifásica
- **Bifásica Asimétrica (kA)**: Corriente máxima asimétrica bifásica

### Sistema Eléctrico
- **Voltaje Nominal (V)**: Voltaje del sistema
- **Caída de Voltaje (%)**: Porcentaje de caída de voltaje
- **Voltaje Mínimo (%)**: Voltaje mínimo durante falla

### Impedancia Equivalente
- **Z Total (Ω)**: Impedancia total del sistema
- **R Total (Ω)**: Resistencia total
- **X Total (Ω)**: Reactancia total
- **Ángulo (°)**: Ángulo de impedancia

## 🎯 Datos de Ejemplo

### Sistema Básico 480V
- Tensión: 480 V
- Corriente: 100 A
- FP: 0.9
- Longitud: 10 m
- Calibre: 350 kcmil
- Temperatura: 30°C

### Sistema Industrial 4160V
- Tensión: 4160 V
- Corriente: 500 A
- FP: 0.85
- Longitud: 25 m
- Calibre: 4/0 AWG
- Temperatura: 40°C

### Sistema Comercial 208V
- Tensión: 208 V
- Corriente: 200 A
- FP: 0.95
- Longitud: 5 m
- Calibre: 3/0 AWG
- Temperatura: 25°C

## 🔧 API Backend

La aplicación se comunica con un backend Node.js/Express que proporciona:

### Endpoints Principales
- `POST /api/cortocircuito/calculate` - Cálculo de cortocircuito
- `GET /health` - Verificación de estado del servicio

### Formato de Request
```json
{
  "tension": 480,
  "corriente": 100,
  "fp": 0.9,
  "longitud": 10,
  "calibre": "350",
  "temperatura": 30
}
```

### Formato de Response
```json
{
  "I_3F_kA": 5.25,
  "I_3F_asym_kA": 8.93,
  "MF_3F": 1.02,
  "I_1F_kA": 4.85,
  "I_1F_asym_kA": 7.25,
  "MF_1F": 1.0,
  "I_2F_kA": 4.52,
  "I_2F_asym_kA": 6.85,
  "MF_2F": 1.01,
  "V_nom": 480,
  "V_drop": 2.5,
  "V_min": 97.5,
  "Z_total": 0.082,
  "R_total": 0.045,
  "X_total": 0.065,
  "angle_deg": 55.2
}
```

## 🏗️ Arquitectura

```
cortocircuito/
├── index.html          # Interfaz principal
├── css/
│   └── estilos.css     # Estilos CSS
├── js/
│   ├── api.js          # Cliente API
│   ├── app.js          # Lógica principal
│   ├── units.js        # Utilidades de unidades
│   ├── testEngine.js   # Motor de pruebas
│   └── profile.js      # Perfilado de rendimiento
└── app/                # Utilidades modulares
    ├── calculo/        # Cálculos especializados
    ├── ui/            # Utilidades de interfaz
    ├── core/          # Funciones core
    ├── datos/         # Gestión de datos
    └── debug/         # Utilidades de debug
```

## 🐛 Solución de Problemas

### Error de Conexión
- Verificar que el backend esté ejecutándose en `http://localhost:3002`
- Revisar la consola del navegador para mensajes de error
- Verificar configuración de CORS en el backend

### Resultados Incorrectos
- Verificar unidades de entrada (V, A, m, °C)
- Confirmar rangos válidos de parámetros
- Revisar calibre del conductor seleccionado

### Problemas de Rendimiento
- Cerrar otras pestañas del navegador
- Verificar conexión a internet
- Revisar uso de memoria del navegador

## 📝 Notas Técnicas

- Basado en norma IEC 60909 para cálculo de cortocircuito
- Utiliza factores de corrección para corriente asimétrica
- Considera temperatura ambiente en cálculos de impedancia
- Incluye caída de voltaje en el análisis

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o reportar bugs:
- Crear issue en el repositorio
- Revisar documentación del backend
- Verificar logs de consola del navegador