const express = require('express');
const router = express.Router();

// Import individual route modules
const dashboardRoutes = require('./dashboard');

// Root route - redirect to dashboard
router.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// Mount dashboard routes
router.use('/', dashboardRoutes);

// Placeholder routes for other pages (to be implemented in future tasks)
router.get('/content', (req, res) => {
    res.render('pages/content', {
        title: 'Content Management - Dailies',
        page: 'content'
    });
});

router.get('/analytics', (req, res) => {
    res.render('pages/analytics', {
        title: 'Analytics - Dailies',
        page: 'analytics'
    });
});

router.get('/digests', (req, res) => {
    res.render('pages/digests', {
        title: 'Digest Management - Dailies',
        page: 'digests'
    });
});

router.get('/config', (req, res) => {
    res.render('pages/config', {
        title: 'Configuration - Dailies',
        page: 'config'
    });
});

module.exports = router;