// Activity API Routes
// Provides recent activity feed for dashboard

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { optionalJWT } = require('../middleware/jwtAuth');

const router = express.Router();

/**
 * @swagger
 * /api/activity/recent:
 *   get:
 *     summary: Get recent activity feed
 *     description: Returns recent system activities for dashboard display
 *     tags: [Activity]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of activities to return
 *     responses:
 *       200:
 *         description: Recent activities HTML fragment
 */
router.get('/recent', optionalJWT, asyncHandler(async (req, res) => {
  try {
    const isDemoMode = process.env.DEMO_MODE === 'true';
    
    if (isDemoMode) {
      // Return mock data for demo
      const mockActivityHtml = `
        <div class="space-y-4">
          <div class="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
            <div class="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-900 truncate">
                📄 New Tech content captured
              </p>
              <p class="text-xs text-gray-500 truncate">
                "Latest AI breakthrough in machine learning"
              </p>
              <div class="flex items-center space-x-2 mt-1">
                <span class="text-xs text-gray-400">5m ago</span>
                <span class="text-xs text-gray-400">•</span>
                <span class="text-xs text-gray-400">92% confidence</span>
              </div>
            </div>
          </div>
          <div class="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
            <div class="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-900">
                🤖 AI Classification completed
              </p>
              <div class="flex items-center space-x-2 mt-1">
                <span class="text-xs text-gray-400">12m ago</span>
                <span class="text-xs text-gray-400">•</span>
                <span class="text-xs text-green-600">completed</span>
              </div>
            </div>
          </div>
          <div class="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
            <div class="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-900 truncate">
                📄 New Political content captured
              </p>
              <p class="text-xs text-gray-500 truncate">
                "Breaking news in technology policy"
              </p>
              <div class="flex items-center space-x-2 mt-1">
                <span class="text-xs text-gray-400">18m ago</span>
                <span class="text-xs text-gray-400">•</span>
                <span class="text-xs text-gray-400">87% confidence</span>
              </div>
            </div>
          </div>
        </div>
      `;
      
      res.type('text/html');
      res.send(mockActivityHtml);
      return;
    }
    
    const db = req.app.locals.db;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    
    // Get recent activities from multiple sources
    const activities = await db.query(`
      (
        SELECT 
          'content_capture' as type,
          ci.title,
          ci.url,
          ci.created_at,
          c.name as category,
          ci.processing_status,
          ci.ai_confidence_score
        FROM content_items ci
        LEFT JOIN categories c ON ci.category_id = c.id
        WHERE ci.created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ORDER BY ci.created_at DESC
        LIMIT $1
      )
      UNION ALL
      (
        SELECT 
          'processing_log' as type,
          pl.operation as title,
          '' as url,
          pl.created_at,
          pl.status as category,
          pl.status as processing_status,
          NULL as ai_confidence_score
        FROM processing_logs pl
        WHERE pl.created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
          AND pl.operation IN ('ai_classification', 'digest_generation', 'content_capture')
        ORDER BY pl.created_at DESC
        LIMIT 5
      )
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);
    
    let activityHtml = '';
    
    if (activities.rows.length === 0) {
      activityHtml = `
        <div class="text-center py-8 text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-3a2 2 0 00-2 2v1a2 2 0 002 2h3m-6 0a2 2 0 002-2v-1a2 2 0 00-2-2H9a2 2 0 00-2 2v1a2 2 0 002 2h2.5"></path>
          </svg>
          <p>No recent activity</p>
        </div>
      `;
    } else {
      activityHtml = '<div class="space-y-4">';
      
      activities.rows.forEach(activity => {
        const timeAgo = getTimeAgo(new Date(activity.created_at));
        let icon, statusColor, statusText;
        
        switch (activity.type) {
          case 'content_capture':
            icon = '📄';
            statusColor = getStatusColor(activity.processing_status);
            statusText = getStatusText(activity.processing_status);
            activityHtml += `
              <div class="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                <div class="w-2 h-2 ${statusColor} rounded-full mt-2 flex-shrink-0"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-900 truncate">
                    ${icon} New ${activity.category || 'content'} captured
                  </p>
                  <p class="text-xs text-gray-500 truncate">
                    "${activity.title}"
                  </p>
                  <div class="flex items-center space-x-2 mt-1">
                    <span class="text-xs text-gray-400">${timeAgo}</span>
                    ${activity.ai_confidence_score ? `<span class="text-xs text-gray-400">•</span><span class="text-xs text-gray-400">${Math.round(activity.ai_confidence_score * 100)}% confidence</span>` : ''}
                  </div>
                </div>
              </div>
            `;
            break;
            
          case 'processing_log':
            icon = getLogIcon(activity.title);
            statusColor = activity.category === 'completed' ? 'bg-green-400' : 
                         activity.category === 'failed' ? 'bg-red-400' : 'bg-blue-400';
            activityHtml += `
              <div class="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                <div class="w-2 h-2 ${statusColor} rounded-full mt-2 flex-shrink-0"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-900">
                    ${icon} ${formatOperationName(activity.title)}
                  </p>
                  <div class="flex items-center space-x-2 mt-1">
                    <span class="text-xs text-gray-400">${timeAgo}</span>
                    <span class="text-xs text-gray-400">•</span>
                    <span class="text-xs ${statusColor.replace('bg-', 'text-').replace('-400', '-600')}">${activity.category}</span>
                  </div>
                </div>
              </div>
            `;
            break;
        }
      });
      
      activityHtml += '</div>';
    }
    
    res.type('text/html');
    res.send(activityHtml);
    
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.type('text/html');
    res.send(`
      <div class="text-center py-4 text-red-500">
        <p>Error loading activity</p>
      </div>
    `);
  }
}));

// Helper functions
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getStatusColor(status) {
  switch (status) {
    case 'completed': return 'bg-green-400';
    case 'processing': return 'bg-blue-400';
    case 'needs_review': return 'bg-yellow-400';
    case 'failed': 
    case 'error': return 'bg-red-400';
    default: return 'bg-gray-400';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'completed': return 'Completed';
    case 'processing': return 'Processing';
    case 'needs_review': return 'Needs Review';
    case 'failed':
    case 'error': return 'Failed';
    default: return 'Pending';
  }
}

function getLogIcon(operation) {
  switch (operation) {
    case 'ai_classification': return '🤖';
    case 'digest_generation': return '📋';
    case 'content_capture': return '📥';
    default: return '⚙️';
  }
}

function formatOperationName(operation) {
  return operation
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

module.exports = router;