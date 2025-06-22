// General Content Processing Routes
// API endpoints for retrieving and managing general content processing results

const express = require('express');
const { param, query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorization');
const { logger } = require('../middleware/logging');
const { generalContentProcessor } = require('../services/generalContentProcessor');
const databaseService = require('../database');

const router = express.Router();

/**
 * @route GET /api/general/stats
 * @desc Get general content processor statistics
 * @access Private
 */
router.get('/stats',
  authenticateToken,
  requirePermission('content:read'),
  async (req, res) => {
    try {
      const stats = generalContentProcessor.getStats();
      
      res.json({
        success: true,
        stats,
        retrieved_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to retrieve general content stats:', error);
      res.status(500).json({
        error: 'Stats retrieval failed',
        message: error.message
      });
    }
  }
);

/**
 * @route GET /api/general/content/:contentId
 * @desc Get general content processing results for specific content
 * @access Private
 */
router.get('/content/:contentId',
  authenticateToken,
  requirePermission('content:read'),
  [
    param('contentId').isInt({ min: 1 }).withMessage('Valid content ID required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { contentId } = req.params;
      const content = await databaseService.getContentItemById(parseInt(contentId));

      if (!content) {
        return res.status(404).json({
          error: 'Content not found',
          message: 'No content found with this ID'
        });
      }

      // Extract general processing results from metadata
      const generalProcessing = content.metadata?.generalProcessing;

      if (!generalProcessing) {
        return res.status(404).json({
          error: 'General processing results not found',
          message: 'This content has not been processed with general content processor'
        });
      }

      res.json({
        success: true,
        content_id: parseInt(contentId),
        general_processing: generalProcessing,
        content_info: {
          title: content.title,
          url: content.url,
          source_domain: content.source_domain,
          content_type: content.content_type,
          category: content.category,
          created_at: content.created_at
        }
      });

    } catch (error) {
      logger.error('Failed to retrieve general content processing results:', error);
      res.status(500).json({
        error: 'Retrieval failed',
        message: error.message
      });
    }
  }
);

/**
 * @route GET /api/general/search
 * @desc Search general content by keywords
 * @access Private
 */
router.get('/search',
  authenticateToken,
  requirePermission('content:read'),
  [
    query('q').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Search query must be 1-100 characters'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { q: searchQuery, page = 1, limit = 20 } = req.query;

      if (!searchQuery) {
        return res.status(400).json({
          error: 'Search query required',
          message: 'Please provide a search query with parameter "q"'
        });
      }

      // Search for general content (non-political)
      const searchOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        filters: { category: 'General' }
      };

      const results = await databaseService.searchContent(searchQuery, searchOptions);

      // Filter and enhance results with general processing data
      const enhancedItems = results.items.map(item => {
        const generalProcessing = item.metadata?.generalProcessing || {};
        
        return {
          id: item.id,
          title: item.title,
          url: item.url,
          source_domain: item.source_domain,
          content_type: item.content_type,
          created_at: item.created_at,
          summary: generalProcessing.summary || '',
          keywords: generalProcessing.keywords || [],
          reading_time: generalProcessing.readingTime || 0,
          relevance_score: this.calculateRelevanceScore(searchQuery, item, generalProcessing)
        };
      }).sort((a, b) => b.relevance_score - a.relevance_score);

      res.json({
        success: true,
        query: searchQuery,
        results: enhancedItems,
        pagination: {
          page: results.page,
          limit: results.limit,
          total: results.total,
          pages: Math.ceil(results.total / results.limit)
        }
      });

    } catch (error) {
      logger.error('General content search failed:', error);
      res.status(500).json({
        error: 'Search failed',
        message: error.message
      });
    }
  }
);

/**
 * Calculate relevance score for search results
 * @param {string} query - Search query
 * @param {Object} item - Content item
 * @param {Object} generalProcessing - General processing results
 * @returns {number} Relevance score
 */
router.calculateRelevanceScore = function(query, item, generalProcessing) {
  let score = 0;
  const queryLower = query.toLowerCase();
  
  // Title match (highest weight)
  if (item.title && item.title.toLowerCase().includes(queryLower)) {
    score += 10;
  }
  
  // Keywords match
  if (generalProcessing.keywords) {
    const keywordMatches = generalProcessing.keywords.filter(keyword => 
      keyword.toLowerCase().includes(queryLower) || queryLower.includes(keyword.toLowerCase())
    );
    score += keywordMatches.length * 3;
  }
  
  // Summary match
  if (generalProcessing.summary && generalProcessing.summary.toLowerCase().includes(queryLower)) {
    score += 2;
  }
  
  // Domain bonus for certain reliable sources
  const reliableDomains = ['wikipedia.org', 'reuters.com', 'ap.org', 'bbc.com'];
  if (reliableDomains.some(domain => item.source_domain?.includes(domain))) {
    score += 1;
  }
  
  return score;
};

/**
 * @route POST /api/general/reprocess/:contentId
 * @desc Reprocess general content with updated algorithms
 * @access Private (Admin only)
 */
router.post('/reprocess/:contentId',
  authenticateToken,
  requirePermission('admin:write'),
  [
    param('contentId').isInt({ min: 1 }).withMessage('Valid content ID required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { contentId } = req.params;
      const content = await databaseService.getContentItemById(parseInt(contentId));

      if (!content) {
        return res.status(404).json({
          error: 'Content not found',
          message: 'No content found with this ID'
        });
      }

      // Only reprocess general content (not political)
      if (content.category === 'US_Politics_News') {
        return res.status(400).json({
          error: 'Cannot reprocess political content',
          message: 'This endpoint is only for general content reprocessing'
        });
      }

      // Reprocess with general content processor
      const generalProcessing = await generalContentProcessor.process(content);

      // Update content with new processing results
      const updateData = {
        metadata: {
          ...content.metadata,
          generalProcessing: {
            summary: generalProcessing.summary,
            keywords: generalProcessing.keywords,
            readingTime: generalProcessing.readingTime,
            processingTime: generalProcessing.metadata.processingTime,
            processor: generalProcessing.metadata.processor,
            reprocessed_at: new Date().toISOString(),
            reprocessed_by: req.user.userId
          }
        }
      };

      await databaseService.updateContentItem(parseInt(contentId), updateData);

      // Log reprocessing
      await databaseService.createProcessingLog({
        content_items: { connect: { id: parseInt(contentId) } },
        operation: 'general_reprocessing',
        status: 'completed',
        processing_time_ms: generalProcessing.metadata.processingTime
      });

      logger.info('General content reprocessed successfully', {
        contentId: parseInt(contentId),
        userId: req.user.userId,
        processingTime: generalProcessing.metadata.processingTime
      });

      res.json({
        success: true,
        message: 'Content reprocessed successfully',
        content_id: parseInt(contentId),
        processing_results: {
          summary: generalProcessing.summary,
          keywords: generalProcessing.keywords,
          reading_time: generalProcessing.readingTime,
          processing_time: generalProcessing.metadata.processingTime
        }
      });

    } catch (error) {
      logger.error('General content reprocessing failed:', error);
      res.status(500).json({
        error: 'Reprocessing failed',
        message: error.message
      });
    }
  }
);

module.exports = router;