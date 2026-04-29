/**
 * models/index.js - Generator models exports
 *
 * Responsibility: Centralized exports for generator models
 * Architecture: Generator Model → AVR → Governor → PSS
 */

const GeneratorModel = require('./generatorModel')
const AVRModel = require('./avr')
const GovernorModel = require('./governor')
const PSSModel = require('./pss')

module.exports = {
  // Complete generator model
  GeneratorModel,

  // Individual control systems
  AVRModel,
  GovernorModel,
  PSSModel,

  // Combined model factory
  createCompleteGenerator: params => {
    return {
      generator: new GeneratorModel(params),
      avr: new AVRModel(params.avr || {}),
      governor: new GovernorModel(params.gov || {}),
      pss: new PSSModel(params.pss || {}),
    }
  },

  // Model integration utilities
  integrateModels: (generator, avr, governor, pss) => {
    return {
      updateState: (state, inputs, dt) => {
        // Update individual models
        const avrOutput = avr.updateState(state, inputs.V, pss.output, dt)
        const govOutput = governor.updateState(state, inputs.omega, dt)
        const _pssOutput = pss.calculateOutput(state.omega)

        // Update generator state
        return generator.updateState(
          state,
          {
            ...inputs,
            Efd: avrOutput,
            Pm: govOutput,
          },
          dt
        )
      },

      getState: () => {
        return {
          generator: generator.getState(),
          avr: avr.getState(),
          governor: governor.getState(),
          pss: pss.getState(),
        }
      },

      reset: () => {
        generator.reset()
        avr.reset()
        governor.reset()
        pss.reset()
      },
    }
  },
}
