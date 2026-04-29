/**
 * application/index.js - Application module exports
 *
 * Responsibility: Centralized application exports
 */

const { runPowerFlow } = require('./services/powerflow')
const { runOPF } = require('./services/opf')

module.exports = {
  powerflow: { runPowerFlow },
  opf: { runOPF },
}
