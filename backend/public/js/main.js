// Main JavaScript file for Dailies Web Interface

// Dashboard Charts
let categoryChart = null;
let timelineChart = null;

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupHTMXErrorHandling();
});

// Initialize dashboard charts and data
function initializeDashboard() {
    if (window.location.pathname === '/dashboard' || window.location.pathname === '/') {
        loadDashboardStats();
        initializeCharts();
    }
}

// Load dashboard statistics
function loadDashboardStats() {
    // This will be populated by HTMX calls to the backend
    fetch('/api/dashboard/stats')
        .then(response => response.json())
        .then(data => {
            updateDashboardStats(data);
        })
        .catch(error => {
            console.error('Error loading dashboard stats:', error);
            // Show fallback data
            updateDashboardStats({
                totalContent: '0',
                todaysCaptures: '0',
                processingQueue: '0',
                failedClassifications: '0'
            });
        });
}

// Update dashboard statistics
function updateDashboardStats(data) {
    const elements = {
        'total-content': data.totalContent || '0',
        'todays-captures': data.todaysCaptures || '0',
        'processing-queue': data.processingQueue || '0',
        'failed-classifications': data.failedClassifications || '0'
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Initialize Chart.js charts
function initializeCharts() {
    initializeCategoryChart();
    initializeTimelineChart();
}

// Category Distribution Chart
function initializeCategoryChart() {
    const ctx = document.getElementById('category-chart');
    if (!ctx) return;

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Politics', 'Technology', 'Sports', 'General', 'Business', 'Science', 'Health', 'Entertainment', 'Other'],
            datasets: [{
                data: [0, 0, 0, 0, 0, 0, 0, 0, 0],
                backgroundColor: [
                    '#3B82F6', '#8B5CF6', '#10B981', '#6B7280', 
                    '#F59E0B', '#EF4444', '#14B8A6', '#F97316', '#84CC16'
                ],
                borderWidth: 2,
                borderColor: '#FFFFFF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });

    // Load category data
    loadCategoryData();
}

// Processing Timeline Chart
function initializeTimelineChart() {
    const ctx = document.getElementById('timeline-chart');
    if (!ctx) return;

    timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Content Processed',
                data: [],
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    // Load timeline data
    loadTimelineData();
}

// Load category distribution data
function loadCategoryData() {
    fetch('/api/dashboard/category-stats')
        .then(response => response.json())
        .then(data => {
            if (categoryChart && data.categories) {
                categoryChart.data.datasets[0].data = data.categories;
                categoryChart.update();
            }
        })
        .catch(error => {
            console.error('Error loading category data:', error);
        });
}

// Load timeline data
function loadTimelineData() {
    fetch('/api/dashboard/timeline-stats')
        .then(response => response.json())
        .then(data => {
            if (timelineChart && data.timeline) {
                timelineChart.data.labels = data.timeline.labels;
                timelineChart.data.datasets[0].data = data.timeline.data;
                timelineChart.update();
            }
        })
        .catch(error => {
            console.error('Error loading timeline data:', error);
        });
}

// Setup HTMX error handling
function setupHTMXErrorHandling() {
    document.body.addEventListener('htmx:responseError', function(event) {
        console.error('HTMX Error:', event.detail);
        showErrorMessage('Failed to load data. Please try again.');
    });

    document.body.addEventListener('htmx:sendError', function(event) {
        console.error('HTMX Send Error:', event.detail);
        showErrorMessage('Network error. Please check your connection.');
    });
}

// Show error message
function showErrorMessage(message) {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

// Utility function to format numbers
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Utility function to format dates
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