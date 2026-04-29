/**
 * engine/bootstrap.js - Plugin bootstrap system
 * 
 * Responsibility: Load and initialize all plugins
 */

const PluginManager = require('./PluginManager');

/**
 * Load all available plugins
 * @returns {Array} Loaded plugins
 */
function loadPlugins() {
  const plugins = [
    require('@/plugins/powerflow'),
    require('@/plugins/opf'),
    require('@/plugins/stability'),
    require('@/plugins/contingency')
  ];

  plugins.forEach(plugin => {
    try {
      PluginManager.register(plugin);
    } catch (error) {
      console.error(`❌ Failed to load plugin ${plugin.name}:`, error.message);
    }
  });

  return plugins;
}

/**
 * Check plugin dependencies
 * @returns {Object} Dependency analysis
 */
function checkDependencies() {
  const pluginManager = require('./PluginManager');
  const analysis = pluginManager.checkDependencies();
  
  if (!analysis.satisfied) {
    console.error('❌ Plugin dependencies not satisfied:');
    analysis.missing.forEach(dep => {
      console.error(`   Missing: ${dep}`);
    });
  }

  return analysis;
}

/**
 * Initialize engine with all plugins
 * @param {Object} options - Engine options
 * @returns {Object} Engine instance
 */
async function initializeEngine(options = {}) {
  const Engine = require('./Engine');
  const engine = new Engine();

  // Load all plugins
  loadPlugins();

  // Check dependencies
  const deps = checkDependencies();
  if (!deps.satisfied) {
    throw new Error('Plugin dependencies not satisfied');
  }

  // Initialize engine
  await engine.init(options);

  return engine;
}

/**
 * Get plugin registry
 * @returns {Object} Plugin registry
 */
function getPluginRegistry() {
  const pluginManager = require('./PluginManager');
  
  return {
    plugins: pluginManager.list(),
    capabilities: pluginManager.list().map(name => 
      pluginManager.getCapabilities(name)
    ),
    stats: pluginManager.getStats()
  };
}

module.exports = {
  loadPlugins,
  checkDependencies,
  initializeEngine,
  getPluginRegistry
};
