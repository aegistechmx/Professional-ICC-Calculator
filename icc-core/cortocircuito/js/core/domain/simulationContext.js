/**
 * simulationContext.js — Normalizador de Contexto de Simulación
 * Convierte datos crudos del sistema en un contexto estandarizado
 * Todas las validaciones y cálculos usan este contexto (Single Source of Truth)
 * 
 * @author Professional ICC Calculator Team
 * @version 2.0.0
 */

const SimulationContext = (function() {
    'use strict';

    // ============================================================
    // API PÚBLICA PRINCIPAL
    // ============================================================

    /**
     * Construye contexto completo del sistema desde datos crudos
     * @param {Object} data - Datos del sistema (nodos, configuración, etc.)
     * @returns {Object} Contexto normalizado
     */
    function buildContext(data) {
        if (!data) {
            console.error('[SimulationContext] Datos no proporcionados');
            return null;
        }

        const ctx = {
            // Identificación
            id: data.id || generateId(),
            timestamp: Date.now(),
            version: '2.0.0',

            // Configuración del sistema
            systemType: data.systemType || data.tipoSistema || '3F',
            voltage: parseFloat(data.voltage || data.V || 480),
            frequency: parseFloat(data.frequency || 60),
            
            // Datos de fuente
            Isc: parseFloat(data.Isc || data.isc || 0),
            xrRatio: parseFloat(data.xrRatio || data.xr || 15),
            Zsource: parseFloat(data.Zsource || data.Z_fuente || 0),
            
            // Transformador
            transformer: normalizeTransformer(data.transformer || data.trafo),
            
            // Nodos/Alimentadores
            nodes: normalizeNodes(data.nodes || data.nodos || []),
            
            // Contexto de carga (opcional)
            loadContext: normalizeLoadContext(data.loadContext || data.contextoCarga),
            
            // Configuración de cálculo
            config: normalizeConfig(data.config || data.configuracion),
            
            // Estado de resultados
            results: {
                calculated: false,
                errors: [],
                warnings: []
            }
        };

        // Enriquecer contexto con datos calculados
        enrichContext(ctx);

        return ctx;
    }

    /**
     * Construye contexto para un nodo específico
     * @param {Object} node - Nodo individual
     * @param {Object} systemContext - Contexto del sistema (opcional)
     * @returns {Object} Contexto normalizado del nodo
     */
    function buildNodeContext(node, systemContext) {
        if (!node) return null;

        const sys = systemContext || {};

        return {
            // Identificación
            nodeId: node.id || generateId(),
            nodeName: node.name || node.nombre || node.id,

            // Datos eléctricos
            current: parseFloat(node.current || node.I_carga || node.I || 0),
            voltage: parseFloat(node.voltage || sys.voltage || 480),
            power: parseFloat(node.power || node.P || 0),
            powerFactor: parseFloat(node.powerFactor || node.FP || 0.9),

            // Cortocircuito en el nodo
            Isc: parseFloat(node.isc || node.Isc || sys.Isc || 0),
            xrRatio: parseFloat(node.xr || node.xrRatio || sys.xrRatio || 15),
            faultPhaseToGround: parseFloat(node.faultPhaseToGround || node.ift || 0),

            // Conductor
            conductor: normalizeConductor(node.conductor || node.feeder || {}),

            // Protección
            protection: normalizeProtection(node.protection || node.equip || {}),

            // Datos físicos
            length: parseFloat(node.length || node.longitud || 0),

            // Contexto de carga
            loadContext: normalizeLoadContext(node.loadContext),

            // Resultados pre-calculados (si existen)
            ampacity: node.ampacity || (node.resultados?.ampacidad?.I_final),
            voltageDrop: node.voltageDrop || node.caidaTension,
            voltageDropPercent: node.voltageDropPercent || node.resultados?.caidaTension?.porcentaje,

            // Referencia al nodo original
            originalNode: node
        };
    }

    // ============================================================
    // NORMALIZADORES ESPECÍFICOS
    // ============================================================

    function normalizeTransformer(trafo) {
        if (!trafo) return null;

        return {
            kva: parseFloat(trafo.kva || trafo.kVA || 500),
            impedance: parseFloat(trafo.impedance || trafo.Z || trafo['%Z'] || 5.75),
            voltagePrimary: parseFloat(trafo.voltagePrimary || trafo.vp || 13200),
            voltageSecondary: parseFloat(trafo.voltageSecondary || trafo.vs || 480),
            connection: trafo.connection || trafo.conexion || 'Yg',
            grounding: trafo.grounding || trafo.aterramiento || 'solido',
            x0Config: trafo.x0Config || trafo.configX0 || 'plano_acero'
        };
    }

    function normalizeNodes(nodes) {
        if (!Array.isArray(nodes)) return [];

        return nodes.map((node, index) => {
            const normalized = {
                id: node.id || `nodo_${index}`,
                name: node.name || node.nombre || node.id || `Nodo ${index + 1}`,
                
                // Corriente y carga
                I_carga: parseFloat(node.I_carga || node.current || node.I || 0),
                P: parseFloat(node.P || node.power || 0),
                FP: parseFloat(node.FP || node.powerFactor || 0.9),
                esContinua: node.esContinua !== undefined ? node.esContinua : true,

                // Conductor/Feeder
                calibre: node.calibre || node.conductor?.calibre || '12',
                material: node.material || node.conductor?.material || 'cobre',
                tempAislamiento: parseInt(node.tempAislamiento || node.aislamiento || 75),
                numConductores: parseInt(node.numConductores || node.conductores || 3),
                paralelos: parseInt(node.paralelos || node.paralelo || 1),
                longitud: parseFloat(node.longitud || node.length || 0),
                canalizacion: node.canalizacion || node.conduit || 'conduit',
                agrupamiento: parseInt(node.agrupamiento || 3),

                // Ambiente
                tempAmbiente: parseInt(node.tempAmbiente || node.temperatura || 30),

                // Equipo de protección
                equip: normalizeProtection(node.equip || node.protection || {}),

                // Resultados de cálculos previos
                resultados: node.resultados || {},
                CDT: node.CDT || {},
                
                // Fallas calculadas
                isc: parseFloat(node.isc || node.Isc || 0),
                xr: parseFloat(node.xr || node.xrRatio || 15),
                faseTierra: node.faseTierra || null,

                // Contexto de carga
                loadContext: normalizeLoadContext(node.loadContext || node.contextoCarga),

                // Referencia original
                _original: node
            };

            return normalized;
        });
    }

    function normalizeConductor(cond) {
        return {
            size: cond.size || cond.calibre || '12',
            material: cond.material || 'cobre',
            insulationTemp: parseInt(cond.insulationTemp || cond.tempAislamiento || 75),
            numConductors: parseInt(cond.numConductors || cond.conductores || 3),
            parallelRuns: parseInt(cond.parallelRuns || cond.paralelos || 1),
            length: parseFloat(cond.length || cond.longitud || 0),
            conduitType: cond.conduitType || cond.canalizacion || 'conduit'
        };
    }

    function normalizeProtection(prot) {
        if (!prot) return null;

        return {
            type: prot.type || prot.tipo || 'termmag',
            model: prot.model || prot.modelo || '',
            frame: prot.frame || prot.marco || '',
            tripUnit: prot.tripUnit || prot.unidadDisparo || 'TM',
            
            // Capacidades
            ratedCurrent: parseFloat(prot.ratedCurrent || prot.In || prot.amp || 0),
            breakerCapacity: parseFloat(prot.breakerCapacity || prot.cap || prot.kA || 0),
            
            // Ajustes LSIG
            l: parseFloat(prot.l || prot.L || 0.8),
            s: parseFloat(prot.s || prot.S || 5),
            i: parseFloat(prot.i || prot.I || 10),
            g: parseFloat(prot.g || prot.G || 0),
            
            // Disparo tierra
            groundFaultPickup: parseFloat(prot.groundFaultPickup || prot.iDisparo || 0),
            
            // Curva TCC
            curve: prot.curve || prot.curva || 'SI'
        };
    }

    function normalizeLoadContext(lc) {
        if (!lc) return null;

        return {
            // Corrientes de fase
            phaseCurrents: {
                ia: parseFloat(lc.ia || lc.Ia || 0),
                ib: parseFloat(lc.ib || lc.Ib || 0),
                ic: parseFloat(lc.ic || lc.Ic || 0),
                in: parseFloat(lc.in || lc.In || 0)
            },
            
            // Armónicos
            harmonicCurrent: parseFloat(lc.harmonicCurrent || lc.In_harm || 0),
            thdi: parseFloat(lc.thdi || lc.THDi || 0),
            
            // Desbalance
            unbalance: parseFloat(lc.unbalance || lc.desbalance || 0),
            
            // Configuración
            hasSinglePhaseLoads: lc.hasSinglePhaseLoads || lc.cargasMonofasicas || false,
            continuousLoadFactor: parseFloat(lc.continuousLoadFactor || lc.fcc || 1.25),
            
            // Ampacidad del neutro (si está calculada)
            neutralAmpacity: parseFloat(lc.neutralAmpacity || 0),
            neutralCurrent: parseFloat(lc.neutralCurrent || 0)
        };
    }

    function normalizeConfig(cfg) {
        return {
            // Modo de cálculo
            calculationMode: cfg?.calculationMode || cfg?.modoCalculo || 'completo',
            
            // Factores de diseño
            continuousLoadFactor: parseFloat(cfg?.continuousLoadFactor || cfg?.fcc || 1.25),
            safetyMargin: parseFloat(cfg?.safetyMargin || cfg?.margen || 1.25),
            
            // Límites
            maxVoltageDrop: parseFloat(cfg?.maxVoltageDrop || cfg?.maxCaida || 3),
            maxGroupingConductors: parseInt(cfg?.maxGroupingConductors || 20),
            maxParallelRuns: parseInt(cfg?.maxParallelRuns || 4),
            
            // Opciones
            evaluateCoordination: cfg?.evaluateCoordination !== undefined ? 
                cfg.evaluateCoordination : true,
            includeMotorContribution: cfg?.includeMotorContribution || false,
            includeCapacitorDischarge: cfg?.includeCapacitorDischarge || false,
            
            // Depuración
            debug: cfg?.debug || false,
            verbose: cfg?.verbose || false
        };
    }

    // ============================================================
    // ENRIQUECIMIENTO DE CONTEXTO
    // ============================================================

    function enrichContext(ctx) {
        // Calcular Isc si no está definida pero hay transformador
        if (!ctx.Isc && ctx.transformer) {
            const trafo = ctx.transformer;
            const Z = trafo.impedance / 100;
            const Isc = (trafo.kva * 1000) / (Math.sqrt(3) * trafo.voltageSecondary * Z);
            ctx.Isc = Isc / 1000; // Convertir a kA
            ctx._calculatedIsc = true;
        }

        // Enriquecer nodos con datos del sistema
        ctx.nodes.forEach(node => {
            // Heredar Isc del sistema si no tiene
            if (!node.isc && ctx.Isc) {
                node.isc = ctx.Isc;
            }

            // Calcular ampacidad de diseño con factor de carga continua
            if (node.I_carga && !node.I_diseño) {
                node.I_diseño = node.I_carga * (node.esContinua ? 1.25 : 1.0);
            }
        });

        // Calcular impedancias si no están definidas
        if (!ctx.Zsource && ctx.Isc && ctx.voltage) {
            ctx.Zsource = ctx.voltage / (Math.sqrt(3) * ctx.Isc * 1000);
        }
    }

    // ============================================================
    // HELPERS
    // ============================================================

    function generateId() {
        return 'sim_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Extrae el contexto de validación para un nodo específico
     * Compatible con ValidationEngine
     */
    function extractValidationContext(node, systemContext) {
        const ctx = buildNodeContext(node, systemContext);
        
        return {
            // Cortocircuito
            Isc: ctx.Isc,
            equipmentCapacity: ctx.protection?.breakerCapacity,
            xrRatio: ctx.xrRatio,
            faultPhaseToGround: ctx.faultPhaseToGround,
            
            // Ampacidad
            current: ctx.current,
            ampacity: ctx.ampacity,
            
            // Caída de tensión
            voltageDropPercent: ctx.voltageDropPercent,
            
            // Protección
            breakerCapacity: ctx.protection?.breakerCapacity,
            groundFaultPickup: ctx.protection?.groundFaultPickup,
            breakerTrips: node.resultados?.proteccion?.dispara,
            
            // Contexto de carga
            loadContext: ctx.loadContext,
            
            // Referencias
            nodeId: ctx.nodeId,
            node: node
        };
    }

    /**
     * Actualiza el contexto del sistema con resultados de validación
     */
    function updateWithValidation(ctx, validationResult) {
        ctx.results.validation = validationResult;
        ctx.results.valid = validationResult.valid;
        ctx.results.errors = validationResult.errors;
        ctx.results.warnings = validationResult.warnings;
        
        return ctx;
    }

    /**
     * Actualiza el contexto con resultados de cálculo
     */
    function updateWithCalculation(ctx, calcResult) {
        ctx.results.calculated = true;
        ctx.results.calculation = calcResult;
        
        return ctx;
    }

    // ============================================================
    // EXPORTAR API
    // ============================================================

    return {
        // Métodos principales
        buildContext: buildContext,
        buildNodeContext: buildNodeContext,
        extractValidationContext: extractValidationContext,
        
        // Actualizaciones
        updateWithValidation: updateWithValidation,
        updateWithCalculation: updateWithCalculation,
        
        // Normalizadores individuales (para uso externo)
        normalizeTransformer: normalizeTransformer,
        normalizeNodes: normalizeNodes,
        normalizeConductor: normalizeConductor,
        normalizeProtection: normalizeProtection,
        normalizeLoadContext: normalizeLoadContext,
        normalizeConfig: normalizeConfig,
        
        // Helpers
        generateId: generateId
    };

})();

// Exportar para diferentes entornos
if (typeof window !== 'undefined') {
    window.SimulationContext = SimulationContext;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimulationContext;
}
