const express = require('express');
const router = express.Router();

// Dashboard main page
router.get('/dashboard', async (req, res) => {
    try {
        res.render('pages/dashboard', {
            title: 'Dashboard - Dailies',
            page: 'dashboard'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('error', {
            message: 'Failed to load dashboard',
            error: error
        });
    }
});

// Dashboard API endpoints for HTMX
router.get('/api/dashboard/stats', async (req, res) => {
    try {
        // TODO: Implement actual database queries
        // This is a placeholder that will be replaced with real data
        const stats = {
            totalContent: 0,
            todaysCaptures: 0,
            processingQueue: 0,
            failedClassifications: 0
        };

        res.json(stats);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to load stats' });
    }
});

router.get('/api/dashboard/recent-content', async (req, res) => {
    try {
        // TODO: Implement actual database queries
        // This is a placeholder that will be replaced with real data
        const recentContent = [];

        const html = `
            <div class="space-y-4">
                ${recentContent.length === 0 ? 
                    '<p class="text-gray-500 text-center py-8">No recent content captures</p>' :
                    recentContent.map(item => `
                        <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div class="flex-1">
                                <h4 class="text-sm font-medium text-gray-900">${item.title}</h4>
                                <p class="text-sm text-gray-500">${item.source} • ${item.category}</p>
                            </div>
                            <div class="flex items-center space-x-2">
                                <span class="status-badge status-${item.status}">${item.status}</span>
                                <span class="text-xs text-gray-400">${item.timestamp}</span>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        `;

        res.send(html);
    } catch (error) {
        console.error('Recent content error:', error);
        res.status(500).send('<p class="text-red-500">Failed to load recent content</p>');
    }
});

router.get('/api/dashboard/category-stats', async (req, res) => {
    try {
        // TODO: Implement actual database queries
        // This is a placeholder that will be replaced with real data
        const categoryStats = {
            categories: [0, 0, 0, 0, 0, 0, 0, 0, 0] // 9 categories as per the modular system
        };

        res.json(categoryStats);
    } catch (error) {
        console.error('Category stats error:', error);
        res.status(500).json({ error: 'Failed to load category stats' });
    }
});

router.get('/api/dashboard/timeline-stats', async (req, res) => {
    try {
        // TODO: Implement actual database queries
        // This is a placeholder that will be replaced with real data
        const timelineStats = {
            timeline: {
                labels: ['7 days ago', '6 days ago', '5 days ago', '4 days ago', '3 days ago', '2 days ago', 'Yesterday'],
                data: [0, 0, 0, 0, 0, 0, 0]
            }
        };

        res.json(timelineStats);
    } catch (error) {
        console.error('Timeline stats error:', error);
        res.status(500).json({ error: 'Failed to load timeline stats' });
    }
});

module.exports = router;