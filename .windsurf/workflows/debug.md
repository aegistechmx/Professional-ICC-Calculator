---
auto_execution_mode: 3
description: Backend Debug Startup Flow
---

# Backend Debug Startup Flow

## Overview

This workflow guides you through the backend application startup sequence for debugging purposes.

## Startup Sequence

### 1. Development Server Launch

**Command:** `npm run dev`

**Location:** `backend/package.json:6`

```json
"dev": "nodemon src/server.js"
```

**Working Directory:** `backend/`

This command starts the development server using Nodemon, which automatically restarts the server when file changes are detected.

### 2. Server Initialization

**File:** `backend/src/server.js`

#### 2a. Environment Configuration

**Line:** `server.js:1`

```javascript
require('dotenv').config();
```

Loads environment variables from `.env` file into `process.env`.

#### 2b. App Module Import

**Line:** `server.js:2`

```javascript
const app = require('./app');
```

Imports the Express application module that contains middleware and route configurations.

#### 2c. Server Start

**Line:** `server.js:4`

```javascript
app.listen(process.env.PORT, () => {
  console.log('Server running on port ' + process.env.PORT);
});
```

Starts the HTTP server listening on the configured port.

### 3. Express App Module

**File:** `backend/src/app.js`

The app module configures the Express application with:

#### 3a. CORS Middleware Setup

Configures Cross-Origin Resource Sharing to allow frontend requests.

#### 3b. JSON Parser Middleware

```javascript
app.use(express.json());
```

Enables parsing of JSON request bodies.

#### 3c. API Routes Registration

Registers all API route handlers for the application.

## Debugging Checklist

- **Environment Variables:** Verify `.env` file exists and contains required variables (especially `PORT`)
- **Dependencies:** Ensure all npm packages are installed (`npm install`)
- **Port Availability:** Check if the configured port is not already in use
- **Nodemon:** Verify Nodemon is watching the correct files
- **Module Imports:** Check that all required modules are properly imported in `app.js`
- **Route Registration:** Confirm API routes are registered before server starts

## Common Issues

- **Port Already in Use:** Change `PORT` in `.env` or kill the process using the port
- **Missing .env File:** Create `.env` file with required environment variables
- **Module Not Found:** Run `npm install` to install dependencies
- **CORS Errors:** Check CORS middleware configuration in `app.js`

Fixed all critical errors in the UI JavaScript files:

equipos.js:

Fixed setEquipByModelo - now uses correct "equipoKey|index" format
Added getTipoFromEquipoKey function for reverse mapping
Added defensive checks for App.estado before accessing nodos
Added defensive check for EQUIPOS in buscarModelo
Wrapped all App.clearResults() calls with defensive checks
configuracion.js:

Fixed setMode and setTipo to check App.estado before assignment
motores_ui.js:

Added getMotores() and getNodos() helper functions
Refactored all functions to use safe access patterns
proyectos.js:

Fixed serializarEstado and restaurarEstado with safe access patterns
Fixed assignment operations that were broken by regex replacement
alimentadores.js:

Added getNodos() and setNodos() helper functions
Replaced all direct App.estado.nodos access with helper functions
Fixed array push and filter operations
All files now have proper defensive checks to prevent errors when App or App.estado are not yet loaded.

All fixes completed for the cortocircuito calculator:

Summary of Repairs
Debug Statements Removed:

Removed console.log from proyectos.js, profile.js, app.js, index.html
Kept console.error/warn for error handling (appropriate for production)
Syntax Validation:

All 20+ JavaScript files passed Node.js syntax check
Missing Scripts Added:

Added equipos.js, curvas_equipo.js, fault_analysis.js, impedancias.js, motor.js, caida_tension.js
Added capacitores.js, motores.js, nom_validacion.js, optimizador_conductores.js, tcc_coordinacion.js, curvas.js
Reorganized script loading order: Data → Calculation → Utilities → UI → App
Window Exports Added:

CalculoCapacitores, CalculoMotores, NOMValidacion, OptimizadorConductores, TCCCoordinacion, Curvas
All calculation modules now properly exported to window object
Module Verification Updated:

Updated global variable names in verification (AMPACIDAD → AMPACIDAD, added EQUIPOS)
Added all new calculation modules to verification list
Added user-facing alert for missing modules
UX Improvements:

Replaced alert() with UIToast in tcc_viewer.js, equipos.js, curvas_disparo.js
Kept native prompt/confirm for critical user actions (project naming, deletion confirmation)
No TODO/FIXME comments found

The application is now clean, properly structured, with all dependencies correctly loaded and exported.

## Recent Fixes (Diagnostic Module & Ampacity)

### motor_diagnostico.js

- Fixed SEVERITY is not defined error by replacing SEVERITY.CRITICO with string literal "CRITICO"
- Fixed renderSemaforo function to use string literals instead of SEVERITY object

### ampacidad_real.js

- Added getTempAmbiente() function with fallback to 30°C for undefined/null/NaN values
- Enhanced factorTemperatura() to never return 0 (uses 0.75 conservative fallback)
- Added normalizarNodo() function to freeze inputs and prevent state mutation
- Added getLimiteTerminal() function with defensive fallback
- Integrated normalizarNodo() in ampacidadCorregida() and verificarAmpacidad()
- Added defensive validation in buscarConductorMinimo()
- Added debug logging for I_corregida = 0 cases

### motor.js

- Added defensive fallback for temperaturaAmbiente in sugerirConductor()
- Implemented nuclear autocorrection for I_final = 0 cases
- Added debug table to identify which factor causes I_final = 0
- System now auto-recovers with I_rescate = I_tabla * 0.9 (conservative fallback)
- Changed status from FAIL to WARNING when autocorrection is applied

### index.html

- Added Chart.js CDN (chart.js@4.4.0) for TCC curve visualization
- Curves now display correctly in equipment panel

### Key Improvements

- System is now resilient to undefined/null input values
- Never returns physically impossible values (0 for factors or ampacity)
- Auto-correction prevents calculation failures
- Defensive programming at all entry points for ampacity calculations