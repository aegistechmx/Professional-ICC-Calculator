# Professional ICC Calculator - User Guide

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Power Flow Analysis](#power-flow-analysis)
4. [Short Circuit Analysis](#short-circuit-analysis)
5. [Protection Coordination](#protection-coordination)
6. [Dynamic Simulation](#dynamic-simulation)
7. [Motor Analysis](#motor-analysis)
8. [PDF Reports](#pdf-reports)
9. [Troubleshooting](#troubleshooting)

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:3002`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## Quick Start

1. Open the frontend application in your browser

2. Create a new electrical system by adding buses and branches

3. Configure component parameters (voltage, power, impedance)

4. Run power flow analysis

5. View results with visual feedback

## Power Flow Analysis

### Running Power Flow

```javascript
const { calculatePowerFlow } = useStore();

await calculatePowerFlow({
  Sbase_MVA: 100,
  maxIter: 20,
  tol: 1e-6
});
```

### Visual Feedback

- **Node Colors**: Green (normal), Red (low voltage), Blue (high voltage), Purple (overvoltage)
- **Edge Labels**: Power flow in MW and MVAR
- **Current Display**: Current in kA on edges
- **Animation**: Animated flow lines showing direction

### Interpreting Results

- **Voltage**: Per-unit voltage magnitude (normal range: 0.95-1.05 pu)
- **Angle**: Voltage angle in degrees
- **Power Flow**: Active power (MW) and reactive power (MVAR)
- **Current**: Line current in kA

## Short Circuit Analysis

### Running Fault Analysis

```javascript
const { calculateICC } = useStore();

await calculateICC({
  faultType: '3P',
  faultBus: 'bus_1',
  preFaultLoadFlow: true
});
```

### Fault Types

- **3P**: Three-phase fault

- **LG**: Line-to-ground fault

- **LL**: Line-to-line fault

- **LLG**: Double line-to-ground fault

### Results

- Symmetrical currents (positive, negative, zero sequence)
- Asymmetrical currents (phase A, B, C)
- Bus voltages during fault
- Branch fault currents

## Protection Coordination

### Configuring Relays

```javascript
const { addProtection } = useStore();

addProtection({
  id: 'relay_1',
  bus: 'bus_1',
  pickup_kA: 0.5,
  TMS: 0.5,
  curve: 'standard',
  upstream: 'relay_2'
});
```

### IEC Curves

- **Standard Inverse**: k=0.14, α=0.02
- **Very Inverse**: k=13.5, α=1
- **Extremely Inverse**: k=80, α=2

### Running Coordination

```javascript
const { runProtectionCoordination } = useStore();

await runProtectionCoordination({
  Sbase_MVA: 100
});
```

### Coordination Results

- Trip times for each relay
- Coordination status (coordinated/not coordinated)
- Auto-tuned TMS values
- Visual feedback on nodes

## Dynamic Simulation

### Running Cascade Simulation

```javascript
const { runCascadeSimulation } = useStore();

await runCascadeSimulation('bus_3', {
  maxTime: 2.0
});
```

### Playing Timeline

```javascript
const { playSimulationTimeline } = useStore();

await playSimulationTimeline({
  speed: 1,
  delay: 300
});
```

### Simulation Events

- **Fault**: Voltage collapse at bus
- **Trip**: Relay operates and opens breaker
- **Reclose**: Automatic breaker reclosing

### Timeline Visualization

- Real-time playback of events
- Visual feedback at each step
- Current and voltage evolution

## Motor Analysis

### Dynamic Motor Models

The system includes dynamic motor models for:

- **Induction Motors**: Slip-based torque-speed characteristics
- **Synchronous Motors**: Swing equation dynamics

### Motor Parameters

```javascript
{
  type: 'induction',
  hp: 100,
  voltage: 0.48,
  efficiency: 0.92,
  powerFactor: 0.85,
  xd: 0.2,
  xd_prime: 0.15,
  H: 3
}
```

### Voltage Dip Simulation

```javascript
const { MotorSimulator } = require('./DynamicMotorModel');

const simulator = new MotorSimulator();
simulator.addMotor(motorData);

const results = simulator.simulateVoltageDip(0.8, 0.5, 0.01);
```

## PDF Reports

### Generating Simulation Report

```javascript
const { generateReport } = require('./ProfessionalReportGenerator');

const generator = new ProfessionalReportGenerator();
generator.generateSimulationReport(
  {
    simulationResult: result,
    systemInfo: system,
    protectionData: protections
  },
  'output/report.pdf'
);
```

### Report Sections

1. Executive Summary
2. System Topology
3. Voltage Analysis
4. Power Flow Results
5. Protection Analysis
6. Coordination Summary
7. Recommendations
8. Disclaimer

## Troubleshooting

### Power Flow Not Converging

**Possible causes:**
- No slack bus defined
- System is not connected
- Unbalanced generation/load
- Extremely high impedances

**Solutions:**
- Add a slack bus with sufficient generation
- Check topology with validateTopology()
- Balance generation and load
- Review impedance values

### Voltage Violations

**Possible causes:**
- Insufficient reactive power support
- Long transmission lines
- High load concentrations

**Solutions:**
- Add capacitors or reactors
- Adjust transformer taps
- Add shunt compensation
- Increase voltage base

### Protection Not Coordinating

**Possible causes:**
- TMS values too low
- Pickup currents too high
- Wrong curve selection

**Solutions:**
- Run auto-tuneRelays()
- Adjust TMS values manually
- Select appropriate IEC curve
- Verify pickup settings

### Dynamic Simulation Issues

**Possible causes:**
- Fault current too low
- Relay times too fast
- System becomes unstable

**Solutions:**
- Check fault impedance
- Increase TMS values
- Verify system stability
- Review motor dynamics

## API Reference

### Power Flow API

**POST** `/powerflow/run`

```json
{
  "nodes": [...],
  "edges": [...],
  "options": {
    "Sbase_MVA": 100,
    "maxIter": 20,
    "tol": 1e-6
  }
}
```

### Short Circuit API

**POST** `/icc/calculate`

```json
{
  "system": {...},
  "fault": {
    "type": "3P",
    "bus": "bus_1",
    "impedance": 0
  }
}
```

### Protection API

**POST** `/protection/coordinate`

```json
{
  "relays": [...],
  "flows": [...],
  "options": {
    "margin": 0.3,
    "iterations": 10
  }
}
```

## Best Practices

1. **Always validate topology** before running simulations

2. **Use per-unit system** for consistent calculations

3. **Check convergence** before using results

4. **Verify protection settings** before coordination

5. **Review fault current levels** before protection studies

6. **Document assumptions** in project files

7. **Run sensitivity analysis** for critical parameters

8. **Backup system configurations** regularly

## Support

For issues or questions:
- Check the troubleshooting section
- Review the code documentation
- Examine error logs in console
- Verify API responses in DevTools
