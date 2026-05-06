# icore-icc — Calculadora Profesional de ICC

**Sistema profesional open-source** para cálculo de **corrientes de cortocircuito (ICC)**, coordinación de protecciones y análisis de sistemas eléctricos, inspirado en ETAP/SKM y adaptado a **NOM-001-SEDE**.

---

## 🚀 Características Principales

- **Editor Visual Drag & Drop** (React Flow)
- **Motor de Cálculo Avanzado** (IEEE Std 399, IEC 60909 y NOM-001-SEDE)
- Soporte completo para **Transformadores, Generadores, ATS, Tableros, Motores y Cargas**
- Validación en tiempo real (ampacidad, Icu, selectividad, caída de tensión)
- Coordinación automática de protecciones
- Generación de memorias de cálculo profesionales (PDF)
- Calculadora standalone de cortocircuito

---

## 📁 Estructura del Proyecto

```bash
icore-icc/
├── frontend/                 # React + Vite + React Flow
├── backend/                  # Node.js + Express + Prisma
├── icc-core/cortocircuito/   # Calculadora independiente
├── shared/engine/            # Motor de cálculos compartido
├── docs/                     # Documentación técnica
├── scripts/                  # Herramientas de mantenimiento
├── tests/                    # Pruebas
├── .env.example
└── start-all.js              # Script unificado de inicio
