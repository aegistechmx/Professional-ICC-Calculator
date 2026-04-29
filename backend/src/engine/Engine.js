/**
 * engine/Engine.js - Core simulation engine
 * 
 * Responsibility: Orchestrate plugin-based simulation system
 * Architecture: ETAP-style plugin system
 */

const PluginManager = require('./PluginManager');

class Engine {
  constructor() {
    this.context = {
      powerflow: {},
      opf: {},
      stability: {},
      contingencies: {},
      market: {},
      protection: {}
    };
    
    this.pluginManager = PluginManager;
    this.initialized = false;
  }

  /**
   * Initialize engine and all plugins
   * @param {Object} options - Engine initialization options
   */
  async init(options = {}) {
    if (this.initialized) {
      throw new Error('Engine already initialized');
    }

    this.context.options = options;
    this.context.engine = this;
    
    // Initialize all registered plugins
    await this.pluginManager.initAll(this.context);
    
    this.initialized = true;
    console.log('🚀 Engine initialized successfully');
  }

  /**
   * Run plugin method with payload
   * @param {string} pluginName - Plugin name
   * @param {string} method - Method name
   * @param {Object} payload - Method payload
   * @returns {Promise} Method result
   */
  async run(pluginName, method, payload) {
    if (!this.initialized) {
      throw new Error('Engine not initialized');
    }

    const plugin = this.pluginManager.get(pluginName);
    
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    if (!plugin[method]) {
      throw new Error(`Method ${method} not found in ${pluginName}`);
    }

    try {
      const startTime = Date.now();
      const result = await plugin[method](payload, this.context);
      const duration = Date.now() - startTime;
      
      console.log(`⚡ ${pluginName}.${method} completed in ${duration}ms`);
      
      return {
        success: true,
        data: result,
        plugin: pluginName,
        method,
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ ${pluginName}.${method} failed:`, error.message);
      
      return {
        success: false,
        error: error.message,
        plugin: pluginName,
        method,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run multiple plugins in sequence
   * @param {Array} tasks - Array of {plugin, method, payload}
   * @returns {Promise<Array>} Results
   */
  async runSequence(tasks) {
    const results = [];
    
    for (const task of tasks) {
      const result = await this.run(task.plugin, task.method, task.payload);
      results.push(result);
      
      if (!result.success) {
        console.log(`⚠️ Sequence stopped at ${task.plugin}.${task.method}`);
        break;
      }
    }
    
    return results;
  }

  /**
   * Run multiple plugins in parallel
   * @param {Array} tasks - Array of {plugin, method, payload}
   * @returns {Promise<Array>} Results
   */
  async runParallel(tasks) {
    const promises = tasks.map(task => 
      this.run(task.plugin, task.method, task.payload)
    );

    return Promise.all(promises);
  }

  /**
   * Get engine status
   * @returns {Object} Engine status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      plugins: this.pluginManager.getStats(),
      context: Object.keys(this.context),
      uptime: this.initialized ? Date.now() - this.initTime : 0
    };
  }

  /**
   * Get plugin capabilities
   * @param {string} pluginName - Plugin name
   * @returns {Object} Plugin capabilities
   */
  getPluginCapabilities(pluginName) {
    return this.pluginManager.getCapabilities(pluginName);
  }

  /**
   * List all available plugins
   * @returns {Array} Plugin list
   */
  listPlugins() {
    return this.pluginManager.list().map(name => ({
      name,
      capabilities: this.getPluginCapabilities(name)
    }));
  }

  /**
   * Reset engine context
   */
  reset() {
    this.context = {
      powerflow: {},
      opf: {},
      stability: {},
      contingencies: {},
      market: {},
      protection: {}
    };
    this.context.engine = this;
    console.log('🔄 Engine context reset');
  }

  /**
   * Shutdown engine
   */
  async shutdown() {
    console.log('🛑 Shutting down engine...');
    
    // Cleanup plugins if they have shutdown methods
    for (const pluginName of this.pluginManager.list()) {
      const plugin = this.pluginManager.get(pluginName);
      if (plugin && plugin.shutdown) {
        try {
          await plugin.shutdown(this.context);
        } catch (error) {
          console.error(`❌ Plugin shutdown failed: ${pluginName}`, error);
        }
      }
    }
    
    this.initialized = false;
    console.log('✅ Engine shutdown complete');
  }
}

module.exports = Engine;
