/**
 * Enhanced Calculation Panel
 * Integrates IEEE/IEC standards validation, harmonic analysis, and optimized calculations
 */

import React, { useState, useCallback } from 'react'
import { useSmartCalculation } from '../hooks/useCalculationWorker'
import { generateComplianceReport } from '../utils/ieeeValidation'
import { generateHarmonicSpectrum } from '../utils/harmonicAnalysis'
import { useStore } from '../store/useStore'

/**
 * Enhanced calculation panel with advanced analysis capabilities
 */
const EnhancedCalculationPanel = () => {
  const [activeTab, setActiveTab] = useState('icc')
  const [calculationOptions, setCalculationOptions] = useState({
    useWorker: true,
    validateStandards: true,
    includeHarmonics: false,
    batchSize: 50
  })

  const nodes = useStore(state => state.nodes)
  const edges = useStore(state => state.edges)
  const calculateICC = useStore(state => state.calculateICC)
  const calculatePowerFlow = useStore(state => state.calculatePowerFlow)

  const {
    isCalculating,
    progress,
    error,
    results,
    calculateICC: workerICC,
    calculateHarmonics: workerHarmonics,
    calculatePowerFlow: workerPowerFlow,
    validateStandards: workerValidation,
    clearError,
    clearResults
  } = useSmartCalculation('/src/workers/calculation.worker.js')

  /**
   * Run comprehensive ICC calculation with validation
   */
  const runEnhancedICCCalculation = useCallback(async () => {
    clearError()
    clearResults()

    try {
      let iccResults

      if (calculationOptions.useWorker) {
        iccResults = await workerICC(nodes, edges, calculationOptions)
      } else {
        iccResults = await calculateICC()
      }

      // Validate against standards if requested
      if (calculationOptions.validateStandards) {
        const validationData = {
          calculationType: 'shortCircuit',
          parameters: {
            nodes,
            edges,
            results: iccResults
          },
          standards: ['IEEE1584', 'IEC60909', 'IEEE141']
        }

        const validationResults = await workerValidation(
          validationData.calculationType,
          validationData.parameters,
          validationData.standards
        )

        // Generate compliance report
        const complianceReport = generateComplianceReport(validationResults)

        return {
          ...iccResults,
          validation: validationResults,
          compliance: complianceReport
        }
      }

      return iccResults

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Enhanced ICC calculation failed:', error)
      throw error
    }
  }, [nodes, edges, calculationOptions, workerICC, calculateICC, workerValidation, clearError, clearResults])

  /**
   * Run harmonic analysis
   */
  const runHarmonicAnalysis = useCallback(async () => {
    clearError()
    clearResults()

    try {
      // Generate harmonic spectrum for typical loads
      const harmonics = generateHarmonicSpectrum('rectifier', 100)

      // Calculate system parameters
      const systemVoltage = 480 // Default or calculate from system
      const estimatedFaultCurrent = 10000 // Estimate or calculate
      const loadCurrent = 500 // Estimate or calculate

      const harmonicResults = await workerHarmonics(
        harmonics,
        systemVoltage,
        estimatedFaultCurrent,
        loadCurrent
      )

      return harmonicResults

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Harmonic analysis failed:', error)
      throw error
    }
  }, [workerHarmonics, clearError, clearResults])

  /**
   * Run power flow analysis with validation
   */
  const runEnhancedPowerFlow = useCallback(async () => {
    clearError()
    clearResults()

    try {
      let powerFlowResults

      if (calculationOptions.useWorker) {
        powerFlowResults = await workerPowerFlow(nodes, edges, calculationOptions)
      } else {
        powerFlowResults = await calculatePowerFlow()
      }

      // Validate results
      if (calculationOptions.validateStandards) {
        const validationData = {
          calculationType: 'powerFlow',
          parameters: {
            buses: powerFlowResults.results,
            branches: edges,
            baseMVA: 100,
            baseKV: 0.48
          },
          standards: ['IEEE141']
        }

        const validationResults = await workerValidation(
          validationData.calculationType,
          validationData.parameters,
          validationData.standards
        )

        return {
          ...powerFlowResults,
          validation: validationResults
        }
      }

      return powerFlowResults

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Enhanced power flow failed:', error)
      throw error
    }
  }, [nodes, edges, calculationOptions, workerPowerFlow, calculatePowerFlow, workerValidation, clearError, clearResults])

  /**
   * Render calculation progress
   */
  const renderProgress = () => {
    if (!isCalculating) return null

    return (
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-900">
            Calculating...
          </span>
          <span className="text-sm text-blue-700">
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  /**
   * render error message
   */
  const renderError = () => {
    if (!error) return null

    return (
      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-red-400">!</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Calculation Error
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /**
   * Render results summary
   */
  const renderResults = () => {
    if (!results) return null

    return (
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-sm font-medium text-green-800 mb-2">
          Calculation Results
        </h3>
        <div className="text-sm text-green-700">
          {results.calculationTime && (
            <p>Calculation time: {results.calculationTime.toFixed(2)}ms</p>
          )}
          {results.nodeCount && (
            <p>Nodes processed: {results.nodeCount}</p>
          )}
          {results.validation && (
            <div className="mt-2">
              <p>Standards validation: {results.validation.overallValid ? 'PASS' : 'FAIL'}</p>
              {results.validation.summary && (
                <p>Issues: {results.validation.summary.totalErrors} errors, {results.validation.summary.totalWarnings} warnings</p>
              )}
            </div>
          )}
          {results.compliance && (
            <div className="mt-2">
              <p>Compliance score: {results.compliance.compliance.score.toFixed(1)}%</p>
              <p>Status: {results.compliance.compliance.overall}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Enhanced Electrical Analysis
      </h2>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'icc', label: 'Short Circuit', icon: '' },
            { id: 'powerflow', label: 'Power Flow', icon: '~' },
            { id: 'harmonics', label: 'Harmonics', icon: '' },
            { id: 'standards', label: 'Standards', icon: ' ' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Options */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Calculation Options</h3>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={calculationOptions.useWorker}
              onChange={(e) => setCalculationOptions(prev => ({
                ...prev,
                useWorker: e.target.checked
              }))}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Use Web Worker (faster)</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={calculationOptions.validateStandards}
              onChange={(e) => setCalculationOptions(prev => ({
                ...prev,
                validateStandards: e.target.checked
              }))}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Validate IEEE/IEC Standards</span>
          </label>
        </div>
      </div>

      {/* Progress */}
      {renderProgress()}

      {/* Error */}
      {renderError()}

      {/* Tab content */}
      <div className="space-y-4">
        {activeTab === 'icc' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Short Circuit Analysis
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Calculate short circuit currents with IEEE 1584 and IEC 60909 compliance
            </p>
            <button
              onClick={runEnhancedICCCalculation}
              disabled={isCalculating}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isCalculating ? 'Calculating...' : 'Calculate ICC'}
            </button>
          </div>
        )}

        {activeTab === 'powerflow' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Power Flow Analysis
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Analyze voltage levels and power flows with IEEE 141 compliance
            </p>
            <button
              onClick={runEnhancedPowerFlow}
              disabled={isCalculating}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {isCalculating ? 'Calculating...' : 'Run Power Flow'}
            </button>
          </div>
        )}

        {activeTab === 'harmonics' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Harmonic Analysis
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Analyze harmonic distortion with IEEE 519 compliance
            </p>
            <button
              onClick={runHarmonicAnalysis}
              disabled={isCalculating}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
            >
              {isCalculating ? 'Analyzing...' : 'Analyze Harmonics'}
            </button>
          </div>
        )}

        {activeTab === 'standards' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Standards Validation
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Comprehensive validation against IEEE/IEC standards
            </p>
            <div className="space-y-2 text-sm text-gray-600">
              <p> IEEE 1584-2018 - Arc Flash Calculations</p>
              <p> IEEE 141 (Red Book) - Power System Analysis</p>
              <p> IEC 60909 - Short Circuit Calculations</p>
              <p> IEEE 242 (Buff Book) - Protection Coordination</p>
              <p> IEEE 1159 - Power Quality Monitoring</p>
              <p> IEEE 519 - Harmonic Limits</p>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {renderResults()}
    </div>
  )
}

export default EnhancedCalculationPanel
