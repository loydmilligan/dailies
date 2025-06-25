// Dashboard Metrics API Routes
// Provides real-time metrics for dashboard components

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { optionalJWT, authenticateJWT } = require('../middleware/jwtAuth');

const router = express.Router();

/**
 * @swagger
 * /api/metrics/today/captures:
 *   get:
 *     summary: Get today's content capture count
 *     description: Returns the number of content items captured today with percentage change from yesterday
 *     tags: [Metrics]
 *     security: []
 *     responses:
 *       200:
 *         description: Today's capture metrics
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "23"
 */
router.get('/today/captures', optionalJWT, asyncHandler(async (req, res) => {
  try {
    const isDemoMode = process.env.DEMO_MODE === 'true';
    
    if (isDemoMode) {
      // Return mock data for demo
      const mockTodayNumber = 23;
      const mockPercentageChange = 12;
      
      res.type('text/plain');
      res.send(`
        <div>
          <span class="text-2xl font-bold text-gray-900">${mockTodayNumber}</span>
          <p class="text-xs text-gray-500 mt-1">
            <span class="text-green-600">
              ↗ ${mockPercentageChange}%
            </span> from yesterday
          </p>
        </div>
      `);
      return;
    }
    
    const db = req.app.locals.db;
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get yesterday's date range for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Query today's captures
    const todayCount = await db.query(
      'SELECT COUNT(*) as count FROM content_items WHERE created_at >= $1 AND created_at < $2',
      [today.toISOString(), tomorrow.toISOString()]
    );
    
    // Query yesterday's captures for comparison
    const yesterdayCount = await db.query(
      'SELECT COUNT(*) as count FROM content_items WHERE created_at >= $1 AND created_at < $2',
      [yesterday.toISOString(), today.toISOString()]
    );
    
    const todayNumber = parseInt(todayCount.rows[0]?.count || 0);
    const yesterdayNumber = parseInt(yesterdayCount.rows[0]?.count || 0);
    
    // Calculate percentage change
    let percentageChange = 0;
    if (yesterdayNumber > 0) {
      percentageChange = Math.round(((todayNumber - yesterdayNumber) / yesterdayNumber) * 100);
    } else if (todayNumber > 0) {
      percentageChange = 100;
    }
    
    // Return just the number for HTMX
    res.type('text/plain');
    res.send(`
      <div>
        <span class="text-2xl font-bold text-gray-900">${todayNumber}</span>
        <p class="text-xs text-gray-500 mt-1">
          <span class="${percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}">
            ${percentageChange >= 0 ? '↗' : '↘'} ${Math.abs(percentageChange)}%
          </span> from yesterday
        </p>
      </div>
    `);
    
  } catch (error) {
    console.error('Error fetching today\'s captures:', error);
    res.type('text/plain');
    res.send('<span class="text-gray-500">Error loading</span>');
  }
}));

/**
 * @swagger
 * /api/metrics/success-rate:
 *   get:
 *     summary: Get processing success rate
 *     description: Returns the percentage of successfully processed content items
 *     tags: [Metrics]
 *     security: []
 *     responses:
 *       200:
 *         description: Processing success rate
 */
router.get('/success-rate', optionalJWT, asyncHandler(async (req, res) => {
  try {
    const isDemoMode = process.env.DEMO_MODE === 'true';
    
    if (isDemoMode) {
      // Return mock data for demo
      const mockSuccessRate = 94;
      
      res.type('text/plain');
      res.send(`
        <div>
          <span class="text-2xl font-bold text-gray-900">${mockSuccessRate}%</span>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div class="bg-green-600 h-2 rounded-full transition-all duration-500" style="width: ${mockSuccessRate}%"></div>
          </div>
        </div>
      `);
      return;
    }
    
    const db = req.app.locals.db;
    
    // Get success rate for last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN processing_status = 'failed' OR processing_status = 'error' THEN 1 END) as failed
      FROM content_items 
      WHERE created_at >= $1
    `, [yesterday.toISOString()]);
    
    const total = parseInt(stats.rows[0]?.total || 0);
    const completed = parseInt(stats.rows[0]?.completed || 0);
    
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    res.type('text/plain');
    res.send(`
      <div>
        <span class="text-2xl font-bold text-gray-900">${successRate}%</span>
        <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div class="bg-green-600 h-2 rounded-full transition-all duration-500" style="width: ${successRate}%"></div>
        </div>
      </div>
    `);
    
  } catch (error) {
    console.error('Error fetching success rate:', error);
    res.type('text/plain');
    res.send('<span class="text-gray-500">Error loading</span>');
  }
}));

/**
 * @swagger
 * /api/metrics/pending-review:
 *   get:
 *     summary: Get pending review count
 *     description: Returns the number of content items pending manual review
 *     tags: [Metrics]
 *     security: []
 *     responses:
 *       200:
 *         description: Pending review count
 */
router.get('/pending-review', optionalJWT, asyncHandler(async (req, res) => {
  try {
    const isDemoMode = process.env.DEMO_MODE === 'true';
    
    if (isDemoMode) {
      // Return mock data for demo
      const mockCount = 7;
      
      res.type('text/plain');
      res.send(`
        <div>
          <span class="text-2xl font-bold text-gray-900">${mockCount}</span>
          <p class="text-xs text-gray-500 mt-1">
            <a href="/content?status=pending" class="text-blue-600 hover:text-blue-800">View all →</a>
          </p>
        </div>
      `);
      return;
    }
    
    const db = req.app.locals.db;
    
    const pendingCount = await db.query(`
      SELECT COUNT(*) as count 
      FROM content_items 
      WHERE processing_status = 'needs_review' 
         OR ai_confidence_score < 0.7
    `);
    
    const count = parseInt(pendingCount.rows[0]?.count || 0);
    
    res.type('text/plain');
    res.send(`
      <div>
        <span class="text-2xl font-bold text-gray-900">${count}</span>
        <p class="text-xs text-gray-500 mt-1">
          <a href="/content?status=pending" class="text-blue-600 hover:text-blue-800">View all →</a>
        </p>
      </div>
    `);
    
  } catch (error) {
    console.error('Error fetching pending review count:', error);
    res.type('text/plain');
    res.send('<span class="text-gray-500">Error loading</span>');
  }
}));

/**
 * @swagger
 * /api/metrics/ai-confidence:
 *   get:
 *     summary: Get average AI confidence score
 *     description: Returns the average AI confidence score for recent classifications
 *     tags: [Metrics]
 *     security: []
 *     responses:
 *       200:
 *         description: Average AI confidence score
 */
router.get('/ai-confidence', optionalJWT, asyncHandler(async (req, res) => {
  try {
    const isDemoMode = process.env.DEMO_MODE === 'true';
    
    if (isDemoMode) {
      // Return mock data for demo
      const mockConfidencePercent = 89;
      
      res.type('text/plain');
      res.send(`
        <div>
          <span class="text-2xl font-bold text-gray-900">${mockConfidencePercent}%</span>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div class="bg-purple-600 h-2 rounded-full transition-all duration-500" style="width: ${mockConfidencePercent}%"></div>
          </div>
        </div>
      `);
      return;
    }
    
    const db = req.app.locals.db;
    
    // Get average confidence for last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const avgConfidence = await db.query(`
      SELECT AVG(ai_confidence_score) as avg_confidence
      FROM content_items 
      WHERE created_at >= $1 
        AND ai_confidence_score IS NOT NULL
    `, [weekAgo.toISOString()]);
    
    const confidence = parseFloat(avgConfidence.rows[0]?.avg_confidence || 0);
    const confidencePercent = Math.round(confidence * 100);
    
    res.type('text/plain');
    res.send(`
      <div>
        <span class="text-2xl font-bold text-gray-900">${confidencePercent}%</span>
        <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div class="bg-purple-600 h-2 rounded-full transition-all duration-500" style="width: ${confidencePercent}%"></div>
        </div>
      </div>
    `);
    
  } catch (error) {
    console.error('Error fetching AI confidence:', error);
    res.type('text/plain');
    res.send('<span class="text-gray-500">Error loading</span>');
  }
}));

/**
 * @swagger
 * /api/metrics/weekly-trends:
 *   get:
 *     summary: Get weekly capture trends data
 *     description: Returns data for weekly trends chart showing daily capture counts
 *     tags: [Metrics]
 *     security: []
 *     responses:
 *       200:
 *         description: Weekly trends data for Chart.js
 */
router.get('/weekly-trends', optionalJWT, asyncHandler(async (req, res) => {
  try {
    const isDemoMode = process.env.DEMO_MODE === 'true';
    
    if (isDemoMode) {
      // Return mock data for demo
      const mockLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const mockValues = [12, 18, 23, 19, 27, 15, 21];
      
      res.json({
        success: true,
        data: {
          labels: mockLabels,
          values: mockValues
        }
      });
      return;
    }
    
    const db = req.app.locals.db;
    
    // Get data for last 7 days
    const trends = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM content_items
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    // Fill in missing days with 0 counts
    const labels = [];
    const values = [];
    const dataMap = new Map();
    
    trends.rows.forEach(row => {
      dataMap.set(row.date, parseInt(row.count));
    });
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      labels.push(dayName);
      values.push(dataMap.get(dateStr) || 0);
    }
    
    res.json({
      success: true,
      data: {
        labels: labels,
        values: values
      }
    });
    
  } catch (error) {
    console.error('Error fetching weekly trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load weekly trends'
    });
  }
}));

/**
 * @swagger
 * /api/metrics/category-distribution:
 *   get:
 *     summary: Get category distribution data
 *     description: Returns data for category distribution pie chart
 *     tags: [Metrics]
 *     security: []
 *     responses:
 *       200:
 *         description: Category distribution data for Chart.js
 */
router.get('/category-distribution', optionalJWT, asyncHandler(async (req, res) => {
  try {
    const isDemoMode = process.env.DEMO_MODE === 'true';
    
    if (isDemoMode) {
      // Return mock data for demo
      const mockLabels = ['Tech', 'Political', 'Sports', 'General', 'Science'];
      const mockValues = [45, 32, 18, 28, 15];
      
      res.json({
        success: true,
        data: {
          labels: mockLabels,
          values: mockValues
        }
      });
      return;
    }
    
    const db = req.app.locals.db;
    
    // Get category distribution for last 7 days
    const distribution = await db.query(`
      SELECT 
        c.name as category,
        COUNT(ci.id) as count
      FROM content_items ci
      JOIN categories c ON ci.category_id = c.id
      WHERE ci.created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY c.id, c.name
      ORDER BY count DESC
      LIMIT 8
    `);
    
    const labels = distribution.rows.map(row => row.category);
    const values = distribution.rows.map(row => parseInt(row.count));
    
    res.json({
      success: true,
      data: {
        labels: labels,
        values: values
      }
    });
    
  } catch (error) {
    console.error('Error fetching category distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load category distribution'
    });
  }
}));

module.exports = router;