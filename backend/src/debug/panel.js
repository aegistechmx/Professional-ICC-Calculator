/**
 * debug/panel.js - Debug UI panel for browser environment
 *
 * Responsibility: Interactive debug panel with log viewing and controls
 */

/**
 * Debug Panel class
 */
class DebugPanel {
  constructor() {
    this.isVisible = false
    this.panelElement = null
    this.logContainer = null
    this.maxLogEntries = 100
  }

  /**
   * Initialize debug panel
   * @param {boolean} showOnStart - Show panel immediately
   */
  init(showOnStart = false) {
    if (typeof document === 'undefined') return

    this.createPanel()

    if (showOnStart) {
      this.show()
    }

    // Add keyboard shortcut (Ctrl+Shift+D)
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        this.toggle()
      }
    })
  }

  /**
   * Create panel HTML
   */
  createPanel() {
    // Create panel container
    this.panelElement = document.createElement('div')
    this.panelElement.id = 'debug-panel'
    this.panelElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 400px;
      height: 500px;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 8px;
      color: white;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 10000;
      display: none;
      flex-direction: column;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    `

    // Create header
    const header = document.createElement('div')
    header.style.cssText = `
      background: #334155;
      padding: 8px;
      border-bottom: 1px solid #475569;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `

    const title = document.createElement('span')
    title.textContent = 'Debug Panel'
    title.style.fontWeight = 'bold'

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '×'
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 16px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
    `
    closeBtn.onclick = () => this.hide()

    header.appendChild(title)
    header.appendChild(closeBtn)

    // Create controls
    const controls = document.createElement('div')
    controls.style.cssText = `
      background: #334155;
      padding: 8px;
      border-bottom: 1px solid #475569;
      display: flex;
      gap: 8px;
    `

    const clearBtn = document.createElement('button')
    clearBtn.textContent = 'Clear'
    clearBtn.style.cssText = `
      background: #ef4444;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    `
    clearBtn.onclick = () => this.clearLogs()

    const refreshBtn = document.createElement('button')
    refreshBtn.textContent = 'Refresh'
    refreshBtn.style.cssText = `
      background: #22c55e;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    `
    refreshBtn.onclick = () => this.refreshLogs()

    const exportBtn = document.createElement('button')
    exportBtn.textContent = 'Export'
    exportBtn.style.cssText = `
      background: #3b82f6;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    `
    exportBtn.onclick = () => this.exportLogs()

    controls.appendChild(clearBtn)
    controls.appendChild(refreshBtn)
    controls.appendChild(exportBtn)

    // Create log container
    this.logContainer = document.createElement('div')
    this.logContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      background: #0f172a;
    `

    // Assemble panel
    this.panelElement.appendChild(header)
    this.panelElement.appendChild(controls)
    this.panelElement.appendChild(this.logContainer)

    // Add to document
    document.body.appendChild(this.panelElement)

    // Make panel draggable
    this.makeDraggable()
  }

  /**
   * Make panel draggable
   */
  makeDraggable() {
    const header = this.panelElement.querySelector('div')
    let isDragging = false
    let currentX
    let currentY
    let initialX
    let initialY

    header.addEventListener('mousedown', e => {
      isDragging = true
      initialX = e.clientX - this.panelElement.offsetLeft
      initialY = e.clientY - this.panelElement.offsetTop
    })

    document.addEventListener('mousemove', e => {
      if (!isDragging) return

      e.preventDefault()
      currentX = e.clientX - initialX // current (A)
      currentY = e.clientY - initialY // current (A)

      this.panelElement.style.left = currentX + 'px' // current (A)
      this.panelElement.style.top = currentY + 'px' // current (A)
    })

    document.addEventListener('mouseup', () => {
      isDragging = false
    })
  }

  /**
   * Show debug panel
   */
  show() {
    if (this.panelElement) {
      this.panelElement.style.display = 'flex'
      this.isVisible = true
      this.refreshLogs()
    }
  }

  /**
   * Hide debug panel
   */
  hide() {
    if (this.panelElement) {
      this.panelElement.style.display = 'none'
      this.isVisible = false
    }
  }

  /**
   * Toggle debug panel visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  /**
   * Refresh log display
   */
  refreshLogs() {
    if (!this.logContainer) return

    const logs = this.getLogs()
    this.logContainer.innerHTML = ''

    logs.slice(-this.maxLogEntries).forEach(log => {
      const logEntry = document.createElement('div')
      logEntry.style.cssText = `
        margin-bottom: 4px;
        padding: 4px;
        border-radius: 2px;
        font-size: 11px;
        word-wrap: break-word;
      `

      // Color based on level
      const levelColors = {
        DEBUG: '#06b6d4',
        INFO: '#22c55e',
        WARN: '#f59e0b',
        ERROR: '#ef4444',
      }

      logEntry.style.backgroundColor = levelColors[log.level] || '#64748b'
      logEntry.style.opacity = '0.9'

      const timestamp = new Date(log.timestamp).toLocaleTimeString()
      const content = `[${timestamp}] [${log.level}] ${log.message}`

      logEntry.textContent = content

      // Add tooltip for data
      if (log.data && Object.keys(log.data).length > 0) {
        logEntry.title = JSON.stringify(log.data, null, 2)
      }

      this.logContainer.appendChild(logEntry)
    })

    // Scroll to bottom
    this.logContainer.scrollTop = this.logContainer.scrollHeight
  }

  /**
   * Clear logs
   */
  clearLogs() {
    if (typeof window !== 'undefined' && window.__DEBUG_LOGS__) {
      window.__DEBUG_LOGS__ = []
    }
    this.refreshLogs()
  }

  /**
   * Export logs
   */
  exportLogs() {
    const logs = this.getLogs()
    const dataStr = JSON.stringify(logs, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement('a')
    link.href = url
    link.download = `debug-logs-${new Date().toISOString().slice(0, 19)}.json`
    link.click()

    URL.revokeObjectURL(url)
  }

  /**
   * Get logs from global debug system
   * @returns {Array} Array of log entries
   */
  getLogs() {
    if (typeof window !== 'undefined' && window.__DEBUG_LOGS__) {
      return window.__DEBUG_LOGS__
    }
    return []
  }
}

// Create global instance
const debugPanel = new DebugPanel()

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DebugPanel
}

// Global assignment for browser
if (typeof window !== 'undefined') {
  window.DebugPanel = debugPanel
}
