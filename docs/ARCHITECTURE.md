# Professional ICC Calculator - Architecture Documentation

## System Overview

The Professional ICC Calculator is a full-stack electrical power system simulation application with real-time visualization, industrial-grade analysis capabilities, and dynamic simulation features.

## Architecture Diagram

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │    Backend      │
│   (React)       │         │   (Node.js)     │
│                 │         │                 │
│  ┌───────────┐  │         │  ┌───────────┐  │
│  │ ReactFlow │  │◄──────►│  │   API     │  │
│  │  Editor   │  │  REST   │  │  Routes   │  │
│  └───────────┘  │         │  └───────────┘  │
│                 │         │                 │
│  ┌───────────┐  │         │  ┌───────────┐  │
│  │ Zustand   │  │         │  │ Controllers│  │
│  │  Store    │  │         │  └───────────┘  │
│  └───────────┘  │         │                 │
│                 │         │  ┌───────────┐  │
│  ┌───────────┐  │         │  │   Core    │  │
│  │ Utils     │  │         │  │ Electrical │  │
│  └───────────┘  │         │  │   Engine   │  │
└─────────────────┘         │  └───────────┘  │
                            │                 │
                            │  ┌───────────┐  │
                            │  │ Database  │  │
                            │  │ (Prisma)  │  │
                            │  └───────────┘  │
                            └─────────────────┘
```

## Frontend Architecture

### Technology Stack

- **Framework**: React 18
- **Visualization**: ReactFlow
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Build Tool**: Vite

### Directory Structure

```
frontend/
├── src/
│   ├── components/        # React components
│   │   ├── ReactFlowEditor/
│   │   ├── NodeComponents/
│   │   └── EdgeComponents/
│   ├── store/             # Zustand store
│   │   └── useStore.js
│   ├── utils/             # Utility functions
│   │   ├── voltageColor.js
│   │   ├── lineFlows.js
│   │   ├── applyResults.js
│   │   ├── protection.js
│   │   ├── iecCurves.js
│   │   ├── eventEngine.js
│   │   ├── faultScenario.js
│   │   ├── cascadeSimulation.js
│   │   ├── timelinePlayback.js
│   │   ├── switching.js
│   │   └── advancedVisualization.js
│   ├── services/          # API services
│   └── App.jsx            # Main application
└── package.json
```

### Key Components

#### ReactFlow Editor
- Interactive graph editor for electrical systems
- Custom node components for buses, transformers, motors
- Custom edge components for transmission lines
- Drag-and-drop interface
- Zoom and pan controls

#### Zustand Store
Centralized state management with:
- Nodes and edges data
- Simulation results
- Protection configurations
- Timeline data
- Actions for state updates

#### Utility Modules
- **voltageColor.js**: Voltage-based color coding
- **lineFlows.js**: Power flow calculations with complex numbers
- **protection.js**: IEC protection coordination
- **iecCurves.js**: Standard inverse curve definitions
- **eventEngine.js**: Discrete event simulation
- **cascadeSimulation.js**: Dynamic cascade simulation
- **timelinePlayback.js**: Timeline visualization
- **advancedVisualization.js**: Heat maps, TCC curves

## Backend Architecture

### Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL (configurable)
- **Math Library**: mathjs
- **PDF Generation**: PDFKit

### Directory Structure

```
backend/
├── src/
│   ├── app.js             # Express application
│   ├── server.js          # Server entry point
│   ├── config/            # Configuration
│   │   ├── db.js
│   │   └── auth.js
│   ├── middleware/        # Express middleware
│   │   ├── auth.middleware.js
│   │   └── errorHandler.js
│   ├── controllers/       # Route controllers
│   │   ├── auth.controller.js
│   │   ├── powerflow.controller.js
│   │   ├── icc.controller.js
│   │   ├── protection.controller.js
│   │   └── simulation.controller.js
│   ├── routes/            # API routes
│   │   ├── auth.routes.js
│   │   ├── powerflow.routes.js
│   │   ├── icc.routes.js
│   │   ├── protection.routes.js
│   │   └── simulation.routes.js
│   ├── services/          # Business logic
│   │   ├── auth.service.js
│   │   └── sqd_real.service.js
│   ├── core/              # Core electrical engine
│   │   └── electrical/
│   │       ├── Complex.js
│   │       ├── YbusBuilderV2.js
│   │       ├── NewtonRaphsonSolverV2.js
│   │       ├── FaultAnalysisV2.js
│   │       ├── PerUnitSystem.js
│   │       ├── PowerFlowOrchestrator.js
│   │       ├── SimulationEngine.js
│   │       ├── DynamicMotorModel.js
│   │       ├── ElectricalSystem.js
│   │       └── SimulationTest.js
│   ├── core/reports/      # Report generation
│   │   └── ProfessionalReportGenerator.js
│   └── workers/           # Background workers
│       ├── simulation.worker.js
│       └── pdf.worker.js
└── package.json
```

### Core Electrical Engine

#### Complex Number Arithmetic
- Complex number operations (add, subtract, multiply, divide)
- Polar/rectangular conversions
- Matrix operations with complex numbers

#### Ybus Builder
- Admittance matrix construction
- Line and transformer modeling
- Shunt admittance inclusion
- Tap ratio handling

#### Newton-Raphson Solver
- Complete Jacobian matrix
- Voltage and power mismatch equations
- PV, PQ, and Slack bus handling
- Convergence detection

#### Fault Analysis
- Symmetrical components
- Positive, negative, zero sequence networks
- Zbus matrix construction
- Fault current calculation
- Bus voltage during fault

#### Per-Unit System
- Automatic base voltage detection
- Impedance conversion
- Current and power conversion
- Base change functions

#### Power Flow Orchestrator
- Unified simulation pipeline
- Automatic voltage base assignment
- Per-unit system conversion
- Results in actual and per-unit units

#### Dynamic Motor Models
- Induction motor equivalent circuit
- Synchronous motor swing equation
- Voltage dip simulation
- Torque-speed characteristics

## Data Flow

### Power Flow Analysis

```
User Input (ReactFlow)
    ↓
API Request (POST /powerflow/run)
    ↓
PowerFlowController
    ↓
PowerFlowOrchestrator
    ├─ ReactFlow to ElectricalModel
    ├─ Assign Voltage Bases
    ├─ Convert to Per-Unit
    ├─ Build Ybus Matrix
    ├─ Solve Newton-Raphson
    ├─ Convert Back to Actual Units
    └─ Return Results
    ↓
API Response
    ↓
Frontend (applyResults.js)
    ├─ Calculate Line Flows
    ├─ Apply Voltage Colors
    ├─ Apply Edge Labels
    └─ Update ReactFlow
```

### Protection Coordination

```
User Configures Relays
    ↓
API Request (POST /protection/coordinate)
    ↓
ProtectionController
    ↓
Run Power Flow (for currents)
    ↓
Calculate Trip Times (IEC Curves)
    ↓
Coordinate Relays (upstream/downstream)
    ↓
Auto-Tune TMS Values
    ↓
Return Coordinated Settings
    ↓
Frontend (applyProtection.js)
    ├─ Apply Trip Times
    ├─ Update Node Borders
    └─ Show Coordination Status
```

### Dynamic Simulation

```
User Selects Fault Bus
    ↓
API Request (POST /simulation/cascade)
    ↓
CascadeSimulation Engine
    ├─ Create Fault Event
    ├─ Event Loop:
    │   ├─ Apply Event
    │   ├─ Recalculate Power Flow
    │   ├─ Evaluate Relays
    │   ├─ Schedule Trip Events
    │   ├─ Apply Trips
    │   └─ Record Timeline
    └─ Return Timeline
    ↓
Frontend (playTimeline.js)
    ├─ Play Events in Sequence
    ├─ Update ReactFlow State
    └─ Show Visual Feedback
```

## API Design

### RESTful Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify token

#### Power Flow
- `POST /api/powerflow/run` - Run power flow analysis
- `POST /api/powerflow/quick` - Quick power flow
- `POST /api/powerflow/validate` - Validate system

#### Short Circuit
- `POST /api/icc/calculate` - Calculate fault currents
- `POST /api/icc/analyze` - Full fault analysis
- `GET /api/icc/curves` - Get fault current curves

#### Protection
- `POST /api/protection/coordinate` - Coordinate relays
- `POST /api/protection/tune` - Auto-tune relays
- `GET /api/protection/tcc` - Get TCC curves

#### Simulation
- `POST /api/simulation/cascade` - Run cascade simulation
- `GET /api/simulation/timeline` - Get timeline data
- `POST /api/simulation/playback` - Playback timeline

#### Reports
- `POST /api/reports/generate` - Generate PDF report
- `GET /api/reports/download` - Download report

### Response Format

**Success Response**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Database Schema

### Users Table
- id
- email
- password_hash
- created_at
- updated_at

### Projects Table
- id
- user_id
- name
- description
- system_data (JSON)
- created_at
- updated_at

### Results Table
- id
- project_id
- simulation_type
- results_data (JSON)
- created_at

## Security

### Authentication
- JWT token-based authentication
- Password hashing with bcrypt
- Token expiration handling

### Authorization
- Role-based access control
- API rate limiting
- Request validation with Zod

### Data Protection
- Input sanitization
- SQL injection prevention
- XSS protection
- CORS configuration

## Performance Optimization

### Frontend
- Code splitting with React.lazy()
- Memoization with React.memo()
- Virtual scrolling for large graphs
- Debounced API calls

### Backend
- Caching with Redis (optional)
- Background workers for heavy computations
- Database query optimization
- Response compression

### Simulation
- Sparse matrix operations
- Efficient Jacobian calculation
- Convergence detection
- Early termination

## Deployment

### Environment Variables

**Backend**
```
NODE_ENV=production
PORT=3002
DATABASE_URL=postgresql://...
JWT_SECRET=...
API_BASE_URL=http://localhost:3002
```

**Frontend**
```
VITE_API_BASE_URL=http://localhost:3002
```

### Docker Deployment

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

```dockerfile
# Frontend Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

## Monitoring

### Logging
- Winston logger for backend
- Console logging for frontend
- Error tracking with Sentry (optional)

### Metrics
- API response times
- Simulation execution times
- Error rates
- User activity

## Future Enhancements

- Real-time collaboration
- Cloud-based project storage
- Advanced motor starting analysis
- Harmonic analysis
- Transient stability
- Economic dispatch
- Optimal power flow
