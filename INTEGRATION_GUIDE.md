# Guía de Integración ICC Module

## Resumen

Se ha completado la integración del módulo ICC (cortocircuito) dentro de React usando la estrategia de iframe con comunicación postMessage bidireccional.

## Arquitectura Implementada

```
frontend/
  src/
    components/
      ICCModule.jsx          # Componente React con iframe
      IcoreLogo.jsx           # Logo animado (alias)
      IcoreLogoAnimated.jsx   # Logo animado completo
    pages/
      ICCCalculator.jsx      # Página de ejemplo completa
    test-integration.js      # Tests de integración
  public/
    cortocircuito/
      index.html              # Módulo HTML incrustado
      js/                     # Scripts del módulo
      css/                    # Estilos del módulo

shared/
  engine/
    index.js                 # Motor básico compartido
    icc.js                   # Motor ICC completo compartido
```

## Flujo de Comunicación

### React hacia iframe (postMessage)
- `LOAD_MODEL` - Carga modelo del sistema
- `CALCULATE` - Ejecuta cálculo ICC
- `RESET` - Resetea el sistema
- `GET_STATE` - Solicita estado actual

### iframe hacia React (postMessage)
- `ICC_READY` - Módulo listo para usar
- `RESULTS` - Resultados del cálculo
- `MODEL_LOADED` - Modelo cargado
- `STATE_RESPONSE` - Respuesta de estado

## Uso Básico

### 1. Importar el componente
```jsx
import ICCModule from './components/ICCModule';
import IcoreLogo from './components/IcoreLogo';
```

### 2. Usar en tu aplicación
```jsx
function MyComponent() {
  const [results, setResults] = useState(null);
  
  return (
    <div>
      <IcoreLogo active={results?.fault} />
      <ICCModule
        systemModel={systemModel}
        onResults={setResults}
        onReady={() => console.log('Módulo listo')}
      />
    </div>
  );
}
```

### 3. Enviar comandos
```jsx
// Cargar modelo
const iframe = document.querySelector('iframe');
iframe.contentWindow.postMessage({
  type: 'LOAD_MODEL',
  data: { tension: 220, isc_conocido: 10 }
}, '*');

// Calcular
iframe.contentWindow.postMessage({
  type: 'CALCULATE'
}, '*');
```

## Motor Compartido

### Funciones disponibles
```javascript
import { calcICC, calcAmpacity, calcularSistemaCompleto } from '../shared/engine/icc.js';

// Cálculo básico
const resultado = calcICC({
  V: 220,
  Z: 0.05,
  factorC: 1.25
});

// Sistema completo
const sistema = calcularSistemaCompleto({
  tension: 220,
  trafo_kva: 500,
  trafo_z: 5.75,
  nodos: [...]
});
```

## Logo Animado

### Estados
- `active={true}` - Logo activo con animación normal
- `active={false}` - Logo inactivo
- `fault={true}` - Modo falla con chispas y glow intenso

### Uso
```jsx
<IcoreLogo 
  active={systemReady} 
  fault={faultDetected}
  size={200}
/>
```

## Testing

### Ejecutar tests de integración
```javascript
import { tests } from './test-integration.js';

// Test comunicación
tests.integration();

// Test motor compartido
tests.engine();

// Test logo animado
tests.logo();
```

## Configuración del Servidor

### Para desarrollo
```bash
npm start  # React dev server (porta 3000)
# El módulo ICC se sirve desde /public/cortocircuito/
```

### Para producción
```bash
npm run build
# El módulo ICC se copia automáticamente al build
```

## Rutas Importantes

- `/cortocircuito/index.html` - Módulo ICC principal
- `/shared/engine/index.js` - Motor básico compartido
- `/shared/engine/icc.js` - Motor completo compartido

## Troubleshooting

### Problemas comunes

1. **Módulo no carga**
   - Verificar que `/cortocircuito/index.html` exista en `public/`
   - Revisar la consola del iframe

2. **Comunicación no funciona**
   - Verificar que los postMessage usen el mismo formato
   - Revisar los listeners en ambos lados

3. **Logo no anima**
   - Verificar que el CSS esté cargado
   - Revisar las clases `.active` y `.fault`

4. **Motor compartido no funciona**
   - Verificar las rutas de importación
   - Revisar que los módulos se exporten correctamente

### Debug

```javascript
// Activar logs detallados
localStorage.setItem('icc_debug', 'true');

// Ver estado del módulo
console.log(window.ICCEngine); // Motor compartido
console.log(window.App); // Módulo HTML
```

## Próximos Pasos

1. **Migración gradual**: Mover componentes del HTML a React uno por uno
2. **Unificación completa**: Reemplazar completamente el motor del HTML
3. **Optimización**: Lazy loading de módulos pesados
4. **Testing**: Suite completa de tests end-to-end

## Referencias

- [PostMessage API](https://developer.mozilla.org/es/docs/Web/API/Window/postMessage)
- [React iframe patterns](https://reactjs.org/docs/iframe.html)
- [NOM-001-SEDE-2012](https://www.dof.gob.mx/nota_detalle.php?codigo=5234064&fecha=28/11/2012)

---

**Estado**: Integración completa y funcional  
**Versión**: 1.0.0  
**Fecha**: 2026-04-29
