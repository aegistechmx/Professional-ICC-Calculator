/**
 * engine/PluginManager.js - Plugin management system
 * 
 * Responsibility: Register and manage simulation plugins
 * Architecture: ETAP-style plugin system
 */

class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.context = {};
  }

  /**
   * Register a plugin
   * @param {Object} plugin - Plugin to register
   */
  register(plugin) {
    if (!plugin.name) {
      throw new Error('Plugin must have a name');
    }

    if (!plugin.version) {
      throw new Error('Plugin must have a version');
    }

    if (!plugin.init) {
      throw new Error('Plugin must have init method');
    }

    this.plugins.set(plugin.name, plugin);
    console.log(`🔌 Plugin registered: ${plugin.name} v${plugin.version}`);
  }

  /**
   * Get plugin by name
   * @param {string} name - Plugin name
   * @returns {Object} Plugin instance
   */
  get(name) {
    return this.plugins.get(name);
  }

  /**
   * List all registered plugins
   * @returns {Array} Plugin names
   */
  list() {
    return Array.from(this.plugins.keys());
  }

  /**
   * Initialize all plugins
   * @param {Object} context - Engine context
   */
  async initAll(context) {
    this.context = context;
    
    console.log(`🚀 Initializing ${this.plugins.size} plugins...`);
    
    for (const plugin of this.plugins.values()) {
      try {
        if (plugin.init) {
          await plugin.init(context);
          console.log(`✅ Plugin initialized: ${plugin.name}`);
        }
      } catch (error) {
        console.error(`❌ Plugin initialization failed: ${plugin.name}`, error);
      }
    }
  }

  /**
   * Get plugin capabilities
   * @param {string} name - Plugin name
   * @returns {Object} Plugin capabilities
   */
  getCapabilities(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) return null;

    return {
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      methods: Object.keys(plugin).filter(key => typeof plugin[key] === 'function'),
      dependencies: plugin.dependencies || []
    };
  }

  /**
   * Check plugin dependencies
   * @returns {Object} Dependency analysis
   */
  checkDependencies() {
    const analysis = {
      satisfied: true,
      missing: [],
      circular: []
    };

    for (const plugin of this.plugins.values()) {
      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          if (!this.plugins.has(dep)) {
            analysis.satisfied = false;
            analysis.missing.push(dep);
          }
        }
      }
    }

    return analysis;
  }

  /**
   * Get plugin statistics
   * @returns {Object} Plugin statistics
   */
  getStats() {
    return {
      total: this.plugins.size,
      names: this.list(),
      capabilities: this.list().map(name => this.getCapabilities(name))
    };
  }
}

// Singleton instance
module.exports = new PluginManager();
