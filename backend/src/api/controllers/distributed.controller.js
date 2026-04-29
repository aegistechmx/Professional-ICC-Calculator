/**
 * api/controllers/distributed.controller.js - Distributed simulation controller
 *
 * Responsibility: HTTP controller for distributed simulation services
 */

const JobScheduler = require('../../infrastructure/scheduler/jobScheduler')

// Global scheduler instance
let globalScheduler = null

/**
 * Initialize distributed scheduler
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.initializeScheduler = async (req, res) => {
  try {
    if (!globalScheduler) {
      globalScheduler = new JobScheduler({
        redisHost: process.env.REDIS_HOST || 'localhost',
        redisPort: process.env.REDIS_PORT || 6379,
        maxWorkers: process.env.MAX_WORKERS || 8,
        maxConcurrentJobs: process.env.MAX_CONCURRENT_JOBS || 50,
      })

      await globalScheduler.initialize()
    }

    res.json({
      success: true,
      message: 'Distributed scheduler initialized',
      stats: await globalScheduler.getStats(),
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

/**
 * Submit distributed N-1 contingency analysis
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.submitN1Contingency = async (req, res) => {
  try {
    if (!globalScheduler) {
      throw new Error('Scheduler not initialized')
    }

    const { system, options = {} } = req.body

    // Create job specification
    const jobSpec = {
      type: 'contingency',
      data: {
        system,
        options: {
          ...options,
          type: 'N-1',
          maxContingencies: options.maxContingencies || 20,
        },
      },
      priority: options.priority || 'normal',
    }

    const jobId = await globalScheduler.scheduleJob(
      jobSpec.type,
      jobSpec.data,
      {
        priority: jobSpec.priority,
        timeout: options.timeout || 300000, // 5 minutes
      }
    )

    res.json({
      success: true,
      data: {
        jobId,
        message: 'N-1 contingency analysis submitted',
        estimatedTime: '2-5 minutes',
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

/**
 * Submit distributed N-2 contingency analysis
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.submitN2Contingency = async (req, res) => {
  try {
    if (!globalScheduler) {
      throw new Error('Scheduler not initialized')
    }

    const { system, options = {} } = req.body

    // Create job specification
    const jobSpec = {
      type: 'contingency',
      data: {
        system,
        options: {
          ...options,
          type: 'N-2',
          maxContingencies: options.maxContingencies || 50,
        },
      },
      priority: options.priority || 'low', // N-2 is lower priority
    }

    const jobId = await globalScheduler.scheduleJob(
      jobSpec.type,
      jobSpec.data,
      {
        priority: jobSpec.priority,
        timeout: options.timeout || 600000, // 10 minutes
      }
    )

    res.json({
      success: true,
      data: {
        jobId,
        message: 'N-2 contingency analysis submitted',
        estimatedTime: '10-20 minutes',
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

/**
 * Submit distributed Monte Carlo analysis
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.submitMonteCarlo = async (req, res) => {
  try {
    if (!globalScheduler) {
      throw new Error('Scheduler not initialized')
    }

    const { system, scenarios, options = {} } = req.body

    // Create job specification
    const jobSpec = {
      type: 'monte-carlo',
      data: {
        system,
        scenarios: scenarios || generateMonteCarloScenarios(system, options),
      },
      priority: options.priority || 'low',
    }

    const jobId = await globalScheduler.scheduleJob(
      jobSpec.type,
      jobSpec.data,
      {
        priority: jobSpec.priority,
        timeout: options.timeout || 1800000, // 30 minutes
      }
    )

    res.json({
      success: true,
      data: {
        jobId,
        message: 'Monte Carlo analysis submitted',
        estimatedTime: `${scenarios.length * 2}-${scenarios.length * 5} minutes`,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

/**
 * Submit distributed transient stability analysis
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.submitTransientStability = async (req, res) => {
  try {
    if (!globalScheduler) {
      throw new Error('Scheduler not initialized')
    }

    const { system, events, options = {} } = req.body

    // Create job specification
    const jobSpec = {
      type: 'stability',
      data: {
        system,
        events: events || generateStabilityEvents(system, options),
      },
      priority: options.priority || 'high',
    }

    const jobId = await globalScheduler.scheduleJob(
      jobSpec.type,
      jobSpec.data,
      {
        priority: jobSpec.priority,
        timeout: options.timeout || 900000, // 15 minutes
      }
    )

    res.json({
      success: true,
      data: {
        jobId,
        message: 'Transient stability analysis submitted',
        estimatedTime: `${events.length * 1}-${events.length * 3} minutes`,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

/**
 * Get job status
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params

    if (!globalScheduler) {
      throw new Error('Scheduler not initialized')
    }

    const status = await globalScheduler.getJobStatus(jobId)

    res.json({
      success: true,
      data: status,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

/**
 * Cancel job
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.cancelJob = async (req, res) => {
  try {
    const { jobId } = req.params

    if (!globalScheduler) {
      throw new Error('Scheduler not initialized')
    }

    const result = await globalScheduler.cancelJob(jobId)

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

/**
 * Get scheduler statistics
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.getSchedulerStats = async (req, res) => {
  try {
    if (!globalScheduler) {
      throw new Error('Scheduler not initialized')
    }

    const stats = await globalScheduler.getStats()

    res.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

/**
 * Shutdown scheduler
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
exports.shutdownScheduler = async (req, res) => {
  try {
    if (!globalScheduler) {
      throw new Error('Scheduler not initialized')
    }

    await globalScheduler.shutdown()
    globalScheduler = null

    res.json({
      success: true,
      message: 'Distributed scheduler shutdown',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

/**
 * Generate Monte Carlo scenarios
 * @param {Object} system - Power system
 * @param {Object} options - Generation options
 * @returns {Array} Monte Carlo scenarios
 */
function generateMonteCarloScenarios(system, options = {}) {
  const {
    numScenarios = 100,
    loadVariation = 0.1,
    lineOutageProbability = 0.05,
    generatorOutageProbability = 0.02,
  } = options

  const scenarios = []

  for (let i = 0; i < numScenarios; i++) {
    const scenario = {
      id: `mc_${i}`,
      loadVariations: [],
      lineOutages: [],
      generatorOutages: [],
    }

    // Random load variations
    system.buses.forEach((bus, busIndex) => {
      if (Math.random() < 0.3) {
        // 30% chance of load variation
        scenario.loadVariations.push({
          busId: busIndex,
          factor: 1 + (Math.random() - 0.5) * 2 * loadVariation,
        })
      }
    })

    // Random line outages
    system.branches.forEach((branch, branchIndex) => {
      if (Math.random() < lineOutageProbability) {
        scenario.lineOutages.push({
          lineId: branchIndex,
          removed: true,
        })
      }
    })

    // Random generator outages
    system.buses.forEach((bus, busIndex) => {
      if (bus.type === 'PV' && Math.random() < generatorOutageProbability) {
        scenario.generatorOutages.push({
          busId: busIndex,
          reduced: true,
          reductionFactor: Math.random() * 0.5, // 0-50% reduction
        })
      }
    })

    scenarios.push(scenario)
  }

  return scenarios
}

/**
 * Generate stability events
 * @param {Object} system - Power system
 * @param {Object} options - Generation options
 * @returns {Array} Stability events
 */
function generateStabilityEvents(system, options = {}) {
  const {
    numEvents = 10,
    faultTypes = ['3phase', '1phase', 'line_to_line'],
    faultLocations = ['bus', 'line'],
    clearingTimes = [0.1, 0.2, 0.3], // seconds
  } = options

  const events = []

  for (let i = 0; i < numEvents; i++) {
    const faultType = faultTypes[Math.floor(Math.random() * faultTypes.length)]
    const faultLocation =
      faultLocations[Math.floor(Math.random() * faultLocations.length)]
    const clearingTime =
      clearingTimes[Math.floor(Math.random() * clearingTimes.length)]

    let event = {
      id: `stability_${i}`,
      type: faultType,
      clearingTime,
      location: faultLocation,
    }

    if (faultLocation === 'bus') {
      const busIndex = Math.floor(Math.random() * system.buses.length)
      event.bus = busIndex
    } else if (faultLocation === 'line') {
      const lineIndex = Math.floor(Math.random() * system.branches.length)
      event.line = lineIndex
    }

    events.push(event)
  }

  return events
}
