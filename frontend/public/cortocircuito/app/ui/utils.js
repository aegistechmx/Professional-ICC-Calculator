/**
 * UI utilities for cortocircuito application
 * Handles DOM manipulation and user interface enhancements
 */

class UIUtils {
    constructor() {
        this.animations = [];
        this.init();
    }

    init() {
        console.log('🎨 UI Utils initialized');
    }

    /**
     * Show loading spinner on element
     * @param {string} elementId - Element ID
     * @param {string} message - Loading message
     */
    showLoading(elementId, message = 'Cargando...') {
        const element = document.getElementById(elementId);
        if (!element) return;

        const spinner = document.createElement('div');
        spinner.className = 'loading-overlay';
        spinner.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-message">${message}</div>
        `;

        element.style.position = 'relative';
        element.appendChild(spinner);
    }

    /**
     * Hide loading spinner from element
     * @param {string} elementId - Element ID
     */
    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const spinner = element.querySelector('.loading-overlay');
        if (spinner) {
            spinner.remove();
        }
    }

    /**
     * Show success message
     * @param {string} message - Success message
     * @param {number} duration - Display duration in ms
     */
    showSuccess(message, duration = 3000) {
        this.showToast(message, 'success', duration);
    }

    /**
     * Show error message
     * @param {string} message - Error message
     * @param {number} duration - Display duration in ms
     */
    showError(message, duration = 5000) {
        this.showToast(message, 'error', duration);
    }

    /**
     * Show warning message
     * @param {string} message - Warning message
     * @param {number} duration - Display duration in ms
     */
    showWarning(message, duration = 4000) {
        this.showToast(message, 'warning', duration);
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Display duration in ms
     */
    showToast(message, type = 'info', duration = 3000) {
        // Remove existing toasts
        const existing = document.querySelectorAll('.toast-notification');
        existing.forEach(toast => toast.remove());

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${this.getToastIcon(type)}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;

        // Add to page
        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Get toast icon based on type
     * @param {string} type - Toast type
     * @returns {string} - Icon emoji
     */
    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    /**
     * Animate element
     * @param {string} elementId - Element ID
     * @param {string} animation - Animation type
     * @param {number} duration - Animation duration in ms
     */
    animate(elementId, animation = 'fadeIn', duration = 500) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Add animation class
        element.classList.add(`animate-${animation}`);

        // Remove after duration
        setTimeout(() => {
            element.classList.remove(`animate-${animation}`);
        }, duration);
    }

    /**
     * Smooth scroll to element
     * @param {string} elementId - Target element ID
     * @param {number} offset - Offset from top
     */
    scrollTo(elementId, offset = 0) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }

    /**
     * Format number for display
     * @param {number} value - Value to format
     * @param {number} decimals - Decimal places
     * @param {string} unit - Unit suffix
     * @returns {string} - Formatted value
     */
    formatNumber(value, decimals = 2, unit = '') {
        if (value === null || value === undefined || isNaN(value)) {
            return `N/A ${unit}`.trim();
        }

        return `${value.toFixed(decimals)} ${unit}`.trim();
    }

    /**
     * Create result card element
     * @param {string} title - Card title
     * @param {string} value - Main value
     * @param {string} unit - Value unit
     * @param {Array} details - Additional details
     * @returns {HTMLElement} - Card element
     */
    createResultCard(title, value, unit, details = []) {
        const card = document.createElement('div');
        card.className = 'result-card';

        let html = `
            <h3>${title}</h3>
            <div class="result-value">${value} <span class="result-unit">${unit}</span></div>
        `;

        if (details.length > 0) {
            html += '<div class="result-details">';
            details.forEach(detail => {
                html += `<p>${detail}</p>`;
            });
            html += '</div>';
        }

        card.innerHTML = html;
        return card;
    }

    /**
     * Update form field with validation styling
     * @param {string} fieldId - Field ID
     * @param {boolean} isValid - Whether field is valid
     * @param {string} message - Validation message
     */
    updateFieldValidation(fieldId, isValid, message = '') {
        const field = document.getElementById(fieldId);
        if (!field) return;

        // Remove existing validation classes
        field.classList.remove('field-valid', 'field-invalid');

        // Add appropriate class
        field.classList.add(isValid ? 'field-valid' : 'field-invalid');

        // Update or create validation message
        let messageEl = field.parentNode.querySelector('.field-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = 'field-message';
            field.parentNode.appendChild(messageEl);
        }

        messageEl.textContent = message;
        messageEl.className = `field-message ${isValid ? 'message-valid' : 'message-invalid'}`;
    }

    /**
     * Load sample data into form
     * @param {object} sampleData - Sample data object
     */
    loadSampleData(sampleData) {
        Object.keys(sampleData).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.value = sampleData[key];
                // Trigger validation
                element.dispatchEvent(new Event('input'));
            }
        });

        this.showSuccess('Datos de ejemplo cargados');
    }

    /**
     * Export form data as JSON
     * @returns {object} - Form data
     */
    exportFormData() {
        const data = {};
        const inputs = document.querySelectorAll('input[type="number"], select');

        inputs.forEach(input => {
            if (input.type === 'number') {
                data[input.id] = parseFloat(input.value) || 0;
            } else {
                data[input.id] = input.value;
            }
        });

        return data;
    }

    /**
     * Import form data from JSON
     * @param {object} data - Form data to import
     */
    importFormData(data) {
        Object.keys(data).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.value = data[key];
                // Trigger validation
                element.dispatchEvent(new Event('input'));
            }
        });

        this.showSuccess('Datos importados correctamente');
    }
}

// Add CSS styles for UI components
const uiStyles = `
<style>
/* Toast notifications */
.toast-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 16px;
    z-index: 1000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    max-width: 300px;
}

.toast-notification.show {
    transform: translateX(0);
}

.toast-success { border-left: 4px solid #10b981; }
.toast-error { border-left: 4px solid #ef4444; }
.toast-warning { border-left: 4px solid #f59e0b; }
.toast-info { border-left: 4px solid #3b82f6; }

.toast-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.toast-icon {
    font-size: 20px;
}

/* Loading overlay */
.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255,255,255,0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.loading-message {
    margin-top: 12px;
    color: #666;
    font-size: 14px;
}

/* Field validation */
.field-valid {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1) !important;
}

.field-invalid {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1) !important;
}

.field-message {
    font-size: 12px;
    margin-top: 4px;
    min-height: 16px;
}

.message-valid {
    color: #10b981;
}

.message-invalid {
    color: #ef4444;
}

/* Animations */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
    animation: fadeIn 0.3s ease;
}

@keyframes slideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
}

.animate-slideIn {
    animation: slideIn 0.3s ease;
}
</style>
`;

// Inject styles into document head
document.head.insertAdjacentHTML('beforeend', uiStyles);

// Global instance
const uiUtils = new UIUtils();

// Export for use in other modules
window.UIUtils = UIUtils;
window.uiUtils = uiUtils;