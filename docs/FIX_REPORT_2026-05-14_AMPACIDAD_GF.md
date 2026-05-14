# Correcciones aplicadas — Ampacidad, Margen Térmico y Falla a Tierra

Fecha: 2026-05-14

## Problemas atacados

1. `I_tabla = 0` por calibre no encontrado.
2. Ampacidad fantasma / inflada cuando el lookup de tabla fallaba.
3. Cálculo de margen térmico mostrando 0.0% aunque `I_final > I_diseño`.
4. Sensibilidad fase-tierra marcada como `NO SENSIBLE` usando unidades equivocadas y sin evaluar `GF` real.
5. Inconsistencias entre copias activas: `frontend/public`, `frontend/dist` e `icc-core`.

## Cambios principales

### Normalización de calibre NOM

Se agregó normalización robusta en:

- `core/data/conductores.nom.js`
- `core/MotorAmpacidadNOM.js`
- `calculo/ampacidad_real.js`

Ahora acepta formatos como:

- `500`
- `500 kcmil`
- `500 MCM`
- `4/0 AWG`
- valores numéricos

Todos se normalizan al key NOM interno correcto.

### Bloqueo de ampacidad fantasma

En `calculo/motor.js` ya no se permite continuar si:

- `I_tabla <= 0`
- `I_final <= 0`
- `I_final` no es finito

En lugar de inventar ampacidad, se lanza error explícito con el calibre afectado.

### Terminales con paralelos

Se corrigió `MotorAmpacidadNOM` y `ampacidadNOM` para aplicar límite de terminal por conductor y multiplicar por paralelos correctamente.

Ejemplo validado:

- `500 kcmil`, cobre, 75°C, 31°C, 2 paralelos
- `I_tabla = 380 A`
- `I_corregida = 668.8 A`
- `I_final = 668.8 A`

### Margen térmico real

El margen ahora se calcula como:

```txt
Margen = (I_final - I_diseño) / I_diseño × 100
```

Ya no se propaga `0.0%` cuando existe margen real.

### Sensibilidad fase-tierra / GF

En `ui/resultados.js` se corrigió la comparación:

- Antes: comparaba `ft.iscFt` en kA contra pickup en A.
- Ahora: convierte `If_tierra` a A y evalúa `pickupTierra / ground_pickup / Ig`.

Cuando hay ajuste GF válido, muestra `OK vía GF`.

### Debug Visual Pro

Se ajustó para no reportar “ampacidad inflada” cuando `I_tabla` ya era inválida. Primero se muestra el problema de lookup.

## Validación realizada

- `node --check` en 36 archivos JS modificados: OK.
- Prueba rápida con VM de Node:
  - `ampacidadNOM('500 kcmil')` devuelve `I_tabla=380`, `I_final=668.8` con 2 paralelos.
  - `MotorAmpacidadNOM.calcularAmpacidadNOM(500)` devuelve `I_tabla=380`, `I_final=668.8` con 2 paralelos.
  - `AmpacidadReal.verificarAmpacidad('600 kcmil')` devuelve `I_tabla=420`, `I_final=789.6`, margen real positivo.

## Nota de build

Se intentó correr `npm run build`, pero el paquete no trae `node_modules` instalados dentro del ZIP:

```txt
sh: 1: vite: not found
```

Esto no es error de código; requiere ejecutar `npm install` en `frontend/` antes del build.
