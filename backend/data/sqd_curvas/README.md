# Curvas TCC Digitalizadas - Schneider Electric / Square D

## Proceso de Digitalización

1. **Obtener PDF de fabricante**
   - Descargar del sitio de Schneider Electric
   - Buscar "TCC Curves" o "Time-Current Curves"

2. **Digitalizar con WebPlotDigitizer**
   - URL: https://apps.automeris.io/wpd/
   - Subir captura de la gráfica
   - Configurar:
     - Plot Type: 2D (X-Y)
     - Axes: Log-Log
     - X-Axis: Current (A) - log scale
     - Y-Axis: Time (s) - log scale

3. **Marcar puntos**
   - Seleccionar puntos clave de la curva:
     - Long-time region
     - Short-time pickup
     - Instantaneous pickup
     - Zona de transición
   - Mínimo 15-20 puntos recomendado

4. **Exportar**
   - Format: CSV
   - Descargar archivo
   - Renombrar a: `[MODELO]_curve.csv`

## Formatos Soportados

### CSV Simple
```csv
corriente,tiempo
100,10
200,5
500,1
...
```

### CSV con Headers
```csv
# Curva NSX250
corriente,tiempo
100,10
...
```

## Curvas Disponibles

| Archivo | Modelo | In (A) | Icu (kA) |
|---------|--------|--------|----------|
| NSX250_curve.csv | NSX250 | 250 | 36 |
| NSX400_curve.csv | NSX400 | 400 | 50 |

## Precisión

- Interpolación log-log para máxima precisión
- Error típico: < 5% comparado con datos de fabricante
- Tolerancia de banda incluida en puntos seleccionados

## Notas

- Las curvas digitizadas son aproximaciones de las curvas reales
- Para aplicaciones críticas, verificar contra datos oficiales del fabricante
- Las tolerancias típicas son ±10% en tiempo

## Referencias

- Schneider Electric: https://www.se.com/
- WebPlotDigitizer: https://apps.automeris.io/wpd/
- IEEE Std 399: IEEE Recommended Practice for Industrial and Commercial Power Systems Analysis
