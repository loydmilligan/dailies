// Political Content Analysis Routes
// API endpoints for political content analysis features

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorization');
const { rateLimitConfigs } = require('../middleware/security');
const { logger } = require('../middleware/logging');
const politicalContentAnalyzer = require('../services/politicalContentAnalyzer');
const databaseService = require('../database');

const router = express.Router();

/**
 * @route POST /api/political/analyze
 * @desc Analyze political content for bias, quality, loaded language, and generate summaries
 * @access Private
 */
router.post('/analyze',
  authenticateToken,
  requirePermission('content:analyze'),
  rateLimitConfigs.api,
  [
    body('content.title').trim().isLength({ min: 1, max: 500 }).withMessage('Title is required and must be 1-500 characters'),
    body('content.raw_content').optional().isLength({ max: 50000 }).withMessage('Content must be less than 50,000 characters'),
    body('content.source_domain').trim().isLength({ min: 1, max: 255 }).withMessage('Source domain is required'),
    body('content.url').optional().isURL().withMessage('URL must be valid'),
    body('content.content_type').optional().isIn(['article', 'video', 'post', 'other']).withMessage('Invalid content type'),
    body('options.save_to_db').optional().isBoolean().withMessage('save_to_db must be boolean'),
    body('options.content_id').optional().isInt({ min: 1 }).withMessage('content_id must be positive integer')
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

      const { content, options = {} } = req.body;
      
      logger.info('Political analysis requested', {
        user_id: req.user.id,
        source_domain: content.source_domain,
        title_length: content.title?.length,
        content_length: content.raw_content?.length
      });

      // Perform comprehensive political analysis
      const analysisResult = await politicalContentAnalyzer.analyzeContent(content);

      // Save to database if requested
      if (options.save_to_db && options.content_id) {
        try {
          await databaseService.createPoliticalAnalysis({
            content_id: options.content_id,
            bias_score: analysisResult.bias_score,
            bias_confidence: analysisResult.bias_confidence,
            bias_label: analysisResult.bias_label,
            quality_score: analysisResult.quality_score,
            credibility_score: analysisResult.credibility_score,
            loaded_language: analysisResult.loaded_language,
            implications: analysisResult.implications,
            summary_executive: analysisResult.summary_executive,
            summary_detailed: analysisResult.summary_detailed,
            key_points: analysisResult.key_points,
            processing_model: analysisResult.processing_model
          });

          logger.info('Political analysis saved to database', {
            content_id: options.content_id,
            user_id: req.user.id
          });
        } catch (dbError) {
          logger.error('Failed to save political analysis to database:', dbError);
          // Continue without failing the request
        }
      }

      res.json({
        success: true,
        analysis: analysisResult,
        metadata: {
          analyzed_at: new Date().toISOString(),
          user_id: req.user.id,
          saved_to_db: !!(options.save_to_db && options.content_id)
        }
      });

    } catch (error) {
      logger.error('Political analysis failed:', error);
      res.status(500).json({
        error: 'Analysis failed',
        message: error.message
      });
    }
  }
);

/**
 * @route POST /api/political/bias
 * @desc Analyze political bias only
 * @access Private
 */
router.post('/bias',
  authenticateToken,
  requirePermission('content:analyze'),
  rateLimitConfigs.api,
  [
    body('content.title').trim().isLength({ min: 1, max: 500 }).withMessage('Title is required'),
    body('content.raw_content').optional().isLength({ max: 50000 }).withMessage('Content too long'),
    body('content.source_domain').trim().isLength({ min: 1 }).withMessage('Source domain required')
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

      const { content } = req.body;
      const biasResult = await politicalContentAnalyzer.analyzeBias(content);

      res.json({
        success: true,
        bias: biasResult,
        analyzed_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Bias analysis failed:', error);
      res.status(500).json({
        error: 'Bias analysis failed',
        message: error.message
      });
    }
  }
);

/**
 * @route POST /api/political/quality
 * @desc Score content quality
 * @access Private
 */
router.post('/quality',
  authenticateToken,
  requirePermission('content:analyze'),
  rateLimitConfigs.api,
  [
    body('content.title').trim().isLength({ min: 1, max: 500 }).withMessage('Title is required'),
    body('content.raw_content').optional().isLength({ max: 50000 }).withMessage('Content too long'),
    body('content.source_domain').trim().isLength({ min: 1 }).withMessage('Source domain required')
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

      const { content } = req.body;
      const qualityResult = await politicalContentAnalyzer.scoreQuality(content);

      res.json({
        success: true,
        quality: qualityResult,
        analyzed_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Quality scoring failed:', error);
      res.status(500).json({
        error: 'Quality scoring failed',
        message: error.message
      });
    }
  }
);

/**
 * @route POST /api/political/loaded-language
 * @desc Detect loaded language in content
 * @access Private
 */
router.post('/loaded-language',
  authenticateToken,
  requirePermission('content:analyze'),
  [
    body('content.title').trim().isLength({ min: 1, max: 500 }).withMessage('Title is required'),
    body('content.raw_content').optional().isLength({ max: 50000 }).withMessage('Content too long')
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

      const { content } = req.body;
      const loadedLanguageResult = politicalContentAnalyzer.detectLoadedLanguage(content);

      res.json({
        success: true,
        loaded_language: loadedLanguageResult,
        analyzed_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Loaded language detection failed:', error);
      res.status(500).json({
        error: 'Loaded language detection failed',
        message: error.message
      });
    }
  }
);

/**
 * @route GET /api/political/credibility/:domain
 * @desc Get source credibility score
 * @access Private
 */
router.get('/credibility/:domain',
  authenticateToken,
  requirePermission('content:read'),
  [
    param('domain').trim().isLength({ min: 1, max: 255 }).withMessage('Valid domain required')
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

      const { domain } = req.params;
      const credibilityResult = politicalContentAnalyzer.assessSourceCredibility(domain);

      res.json({
        success: true,
        domain,
        credibility: credibilityResult,
        analyzed_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Credibility assessment failed:', error);
      res.status(500).json({
        error: 'Credibility assessment failed',
        message: error.message
      });
    }
  }
);

/**
 * @route POST /api/political/summarize
 * @desc Generate comprehensive summaries
 * @access Private
 */
router.post('/summarize',
  authenticateToken,
  requirePermission('content:analyze'),
  rateLimitConfigs.api,
  [
    body('content.title').trim().isLength({ min: 1, max: 500 }).withMessage('Title is required'),
    body('content.raw_content').isLength({ min: 100, max: 50000 }).withMessage('Content must be 100-50000 characters'),
    body('content.source_domain').trim().isLength({ min: 1 }).withMessage('Source domain required')
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

      const { content } = req.body;
      const summaryResult = await politicalContentAnalyzer.generateSummaries(content);

      res.json({
        success: true,
        summaries: summaryResult,
        analyzed_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Summary generation failed:', error);
      res.status(500).json({
        error: 'Summary generation failed',
        message: error.message
      });
    }
  }
);

/**
 * @route GET /api/political/analysis/:contentId
 * @desc Get existing political analysis for content
 * @access Private
 */
router.get('/analysis/:contentId',
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
      const analysis = await databaseService.getPoliticalAnalysis(parseInt(contentId));

      if (!analysis) {
        return res.status(404).json({
          error: 'Analysis not found',
          message: 'No political analysis found for this content'
        });
      }

      res.json({
        success: true,
        analysis,
        content_id: parseInt(contentId)
      });

    } catch (error) {
      logger.error('Failed to retrieve political analysis:', error);
      res.status(500).json({
        error: 'Retrieval failed',
        message: error.message
      });
    }
  }
);

/**
 * @route GET /api/political/stats
 * @desc Get political analysis statistics
 * @access Private
 */
router.get('/stats',
  authenticateToken,
  requirePermission('admin:read'),
  async (req, res) => {
    try {
      const stats = {
        credibility_database_size: politicalContentAnalyzer.sourceCredibilityDB.size,
        loaded_language_patterns: politicalContentAnalyzer.loadedLanguagePatterns.length,
        analyzer_initialized: politicalContentAnalyzer.initialized,
        available_ai_providers: {
          gemini: !!politicalContentAnalyzer.geminiClient,
          openai: !!politicalContentAnalyzer.openaiClient,
          anthropic: !!politicalContentAnalyzer.anthropicClient
        }
      };

      res.json({
        success: true,
        stats,
        retrieved_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to retrieve political analysis stats:', error);
      res.status(500).json({
        error: 'Stats retrieval failed',
        message: error.message
      });
    }
  }
);

module.exports = router;