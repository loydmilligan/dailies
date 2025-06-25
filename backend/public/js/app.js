// Dailies Content Manager - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dailies Content Manager initialized');
    
    // Initialize HTMX configurations
    if (typeof htmx !== 'undefined') {
        // Configure HTMX
        htmx.config.globalViewTransitions = true;
        htmx.config.scrollBehavior = 'smooth';
        
        // Add loading indicators
        document.addEventListener('htmx:beforeRequest', function(evt) {
            const target = evt.target;
            target.classList.add('loading');
        });
        
        document.addEventListener('htmx:afterRequest', function(evt) {
            const target = evt.target;
            target.classList.remove('loading');
        });
        
        // Show success/error notifications
        document.addEventListener('htmx:responseError', function(evt) {
            showNotification('Request failed. Please try again.', 'error');
        });
        
        console.log('HTMX configured');
    }
    
    // Initialize tooltips and other interactive elements
    initializeTooltips();
    initializeModals();
    initializeSearchFeatures();
});

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${getNotificationClasses(type)} fade-in`;
    notification.innerHTML = `
        <div class="flex items-center">
            <span class="flex-1">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-lg">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationClasses(type) {
    switch (type) {
        case 'success':
            return 'bg-green-100 text-green-800 border border-green-200';
        case 'error':
            return 'bg-red-100 text-red-800 border border-red-200';
        case 'warning':
            return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
        default:
            return 'bg-blue-100 text-blue-800 border border-blue-200';
    }
}

// Initialize tooltips
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(event) {
    const text = event.target.getAttribute('data-tooltip');
    const tooltip = document.createElement('div');
    tooltip.className = 'absolute z-50 px-2 py-1 text-sm bg-gray-900 text-white rounded shadow-lg';
    tooltip.textContent = text;
    tooltip.id = 'tooltip';
    
    document.body.appendChild(tooltip);
    
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.bottom + 5 + 'px';
}

function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

// Initialize modal functionality
function initializeModals() {
    // Close modals when clicking outside
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal-backdrop')) {
            closeModal();
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.add('hidden');
    });
    document.body.classList.remove('overflow-hidden');
}

// Search functionality
function initializeSearchFeatures() {
    const searchInputs = document.querySelectorAll('input[type="search"]');
    searchInputs.forEach(input => {
        let debounceTimer;
        input.addEventListener('input', function(event) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                // Trigger search logic here
                console.log('Search query:', event.target.value);
            }, 300);
        });
    });
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Content management utilities
function selectAllCheckboxes(masterCheckbox) {
    const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = masterCheckbox.checked;
    });
    updateBulkActions();
}

function updateBulkActions() {
    const selectedCheckboxes = document.querySelectorAll('tbody input[type="checkbox"]:checked');
    const bulkActionsButton = document.getElementById('bulk-actions-button');
    
    if (bulkActionsButton) {
        bulkActionsButton.textContent = selectedCheckboxes.length > 0 
            ? `Bulk Actions (${selectedCheckboxes.length})` 
            : 'Bulk Actions';
        bulkActionsButton.disabled = selectedCheckboxes.length === 0;
    }
}

// Chart utilities (for dashboard)
function updateChart(chartId, newData) {
    const chart = Chart.getChart(chartId);
    if (chart) {
        chart.data = newData;
        chart.update();
    }
}

// Export functions to global scope for use in templates
window.showNotification = showNotification;
window.openModal = openModal;
window.closeModal = closeModal;
window.selectAllCheckboxes = selectAllCheckboxes;
window.updateBulkActions = updateBulkActions;
window.formatDate = formatDate;
window.formatBytes = formatBytes;
window.updateChart = updateChart;