// Dailies Backend API Server
// Provides secure REST API for Chrome extension and frontend

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./database');
const ContentSanitizer = require('./services/contentSanitizer');
const aiClassificationService = require('./services/aiClassification');
const EnhancedAIClassificationService = require('./services/enhancedAIClassification');
const CategoryService = require('./services/categoryService');
const ActionService = require('./services/actionService');
const politicalContentAnalyzer = require('./services/politicalContentAnalyzer');
const { generalContentProcessor } = require('./services/generalContentProcessor');
const { secureConfigService } = require('./services/secureConfig');
const { authenticateToken, optionalAuth } = require('./middleware/auth');
const { 
  validateContentCapture, 
  validateContentUpdate, 
  validateContentQuery, 
  validateContentId,
  validateDigestQuery,
  validateDigestDate,
  sanitizeStrings,
  validateRequestSize
} = require('./middleware/validation');
const { 
  requestLogger, 
  errorLogger, 
  addRequestId,
  applicationLogger,
  logger 
} = require('./middleware/logging');
const { 
  errorHandler, 
  notFoundHandler, 
  asyncHandler,
  handleUnhandledRejection,
  handleUncaughtException
} = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const politicalRoutes = require('./routes/political');
const generalRoutes = require('./routes/general');
const { setupSwagger } = require('./config/swagger');
const {
  requirePermission,
  requireRole,
  requireResourceOwnership
} = require('./middleware/authorization');
const {
  getEnhancedHelmetConfig,
  rateLimitConfigs,
  additionalSecurityHeaders,
  requestValidation,
  securityMonitoring
} = require('./middleware/security');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database service is already initialized as singleton

// Initialize enhanced services
const enhancedClassifier = new EnhancedAIClassificationService();
const categoryService = new CategoryService(db);
const actionService = new ActionService(db);
const redisService = require('./services/redisService');

// Make services available to routes and middleware
app.locals.db = db;
app.locals.enhancedClassifier = enhancedClassifier;
app.locals.categoryService = categoryService;
app.locals.actionService = actionService;
app.locals.redisService = redisService;

// Setup global error handlers
handleUnhandledRejection();
handleUncaughtException();

// Request ID and size validation
app.use(addRequestId);
app.use(validateRequestSize);

// Enhanced security middleware
app.use(getEnhancedHelmetConfig());
app.use(additionalSecurityHeaders());
app.use(requestValidation());
app.use(securityMonitoring());

// CORS configuration for extension and frontend
app.use(cors({
  origin: [
    'chrome-extension://*',
    'http://localhost:*',
    'https://localhost:*'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Enhanced rate limiting
app.use('/api/', rateLimitConfigs.api);
app.use('/api/auth/', rateLimitConfigs.auth);
app.use('/api/admin/', rateLimitConfigs.admin);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// String sanitization
app.use(sanitizeStrings);

// Logging
app.use(requestLogger);

// Setup EJS templating and web interface
const { setupWebInterface } = require('./config/webInterface');
setupWebInterface(app);

// Web interface routes (before API routes)
const webRoutes = require('./routes/web');
app.use('/', webRoutes);

// Authentication routes
app.use('/api/auth', authRoutes);

// Political analysis routes
app.use('/api/political', politicalRoutes);

// General content processing routes
app.use('/api/general', generalRoutes);

// Setup Swagger documentation
setupSwagger(app);

/**
 * @swagger
 * /api/ai/test:
 *   post:
 *     summary: Test AI classification
 *     description: Test the AI classification service with sample content
 *     tags: [AI, Testing]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Content title
 *               text:
 *                 type: string
 *                 description: Content text
 *               url:
 *                 type: string
 *                 description: Content URL
 *               source_domain:
 *                 type: string
 *                 description: Source domain
 *             required: [title]
 *     responses:
 *       200:
 *         description: Classification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 classification:
 *                   type: string
 *                   description: Dynamic category based on AI classification
 *                 confidence:
 *                   type: number
 *                 provider:
 *                   type: string
 *                 fromCache:
 *                   type: boolean
 *       500:
 *         description: Classification failed
 */
app.post('/api/ai/test', requireRole(['admin', 'editor']), asyncHandler(async (req, res) => {
  const { title, text, url, source_domain, useConsensus, minConfidence } = req.body;
  
  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'Title is required'
    });
  }
  
  const testContent = {
    title,
    raw_content: text || '',
    url: url || 'https://example.com/test',
    source_domain: source_domain || 'example.com',
    content_hash: null // No caching for test
  };
  
  const options = {
    useConsensus: useConsensus || false,
    minConfidence: minConfidence || 0.5
  };
  
    const result = await aiClassificationService.classifyContent(testContent, options);
    
    res.json({
      success: true,
      classification: result.classification,
      confidence: result.confidence,
      provider: result.provider,
      fromCache: result.fromCache || false,
      rawResponse: result.rawResponse,
      needsManualReview: result.needsManualReview || false,
      consensus: result.consensus || null
    });
}));

/**
 * @swagger
 * /api/ai/status:
 *   get:
 *     summary: Check AI service status
 *     description: Check connectivity and status of AI classification providers
 *     tags: [AI, System]
 *     security: []
 *     responses:
 *       200:
 *         description: AI service status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 providers:
 *                   type: object
 *                 stats:
 *                   type: object
 */
app.get('/api/ai/status', requireRole(['admin', 'editor']), asyncHandler(async (req, res) => {
    const connectivity = await aiClassificationService.testConnectivity();
    const stats = aiClassificationService.getStats();
    
    res.json({
      success: true,
      providers: connectivity,
      stats
    });
}));

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check the health status of the API and its dependencies
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/HealthResponse'
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: string
 */
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await db.testConnection();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        server: 'running'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

/**
 * @swagger
 * /api/content:
 *   post:
 *     summary: Capture new content
 *     description: Submit content from browser extension for processing and storage
 *     tags: [Content]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContentCaptureRequest'
 *     responses:
 *       201:
 *         description: Content captured successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     contentId:
 *                       type: integer
 *                     data:
 *                       $ref: '#/components/schemas/ContentItem'
 *       400:
 *         description: Invalid input or security risk detected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Content already exists (duplicate)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     duplicate:
 *                       type: boolean
 *                       example: true
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/content', rateLimitConfigs.content, requirePermission('content:create'), validateContentCapture, asyncHandler(async (req, res) => {
    const {
      url,
      title,
      domain,
      contentType,
      metadata,
      content,
      contentHash,
      timestamp
    } = req.body;

    // Perform security analysis on content
    const rawContent = content?.text || '';
    const securityAnalysis = ContentSanitizer.analyzeContentSecurity(rawContent);
    
    if (!securityAnalysis.safe) {
      const highSeverityIssues = securityAnalysis.issues.filter(issue => issue.severity === 'high');
      if (highSeverityIssues.length > 0) {
        return res.status(400).json({
          error: 'Content contains security risks',
          message: 'Content blocked due to potential security threats',
          securityIssues: highSeverityIssues.map(issue => issue.type)
        });
      }
    }

    // Sanitize and prepare content data
    const rawContentData = {
      url: url,
      title: title,
      source_domain: domain,
      content_type: contentType || 'other',
      category: 'pending_classification', // Will be updated after AI classification
      raw_content: rawContent,
      metadata: {
        ...metadata,
        originalMetadata: metadata,
        extractionMethod: content?.extractionMethod,
        contentHash: contentHash,
        capturedAt: timestamp,
        readingTime: content?.readingTime,
        length: content?.length,
        securityAnalysis: securityAnalysis
      },
      content_hash: contentHash
    };

    // Sanitize content data for secure storage
    const contentData = ContentSanitizer.sanitizeContentItem(rawContentData);

    // Check for duplicates
    const existingContent = await db.getContentByHash(contentHash);
    if (existingContent) {
      return res.json({
        success: true,
        message: 'Content already exists',
        contentId: existingContent.id,
        duplicate: true
      });
    }

    // Save content to database
    const savedContent = await db.createContentItem(contentData);

    // Log successful capture
    await db.createProcessingLog({
      content_items: { connect: { id: savedContent.id } },
      operation: 'content_capture',
      status: 'completed'
    });

    // Perform enhanced AI classification and processing asynchronously
    setImmediate(async () => {
      try {
        logger.info('Starting enhanced AI classification and processing', { contentId: savedContent.id });
        
        // Enhanced classification with modular system
        const classificationResult = await enhancedClassifier.classifyContent(savedContent);
        
        logger.info('Enhanced AI classification completed', {
          contentId: savedContent.id,
          rawCategory: classificationResult.rawCategory,
          resolvedCategory: classificationResult.resolvedCategory.name,
          matchType: classificationResult.matchType,
          confidence: classificationResult.confidence,
          provider: classificationResult.provider
        });
        
        // Update content with enhanced classification results
        await categoryService.updateContentCategory(
          savedContent.id, 
          classificationResult.resolvedCategory.id,
          classificationResult.rawCategory
        );
        
        await db.updateContentItem(savedContent.id, {
          ai_confidence_score: classificationResult.confidence,
          processing_status: classificationResult.confidence < 0.7 ? 'needs_review' : 'processing',
          processed_at: new Date()
        });

        // Log AI classification
        await db.createProcessingLog({
          content_items: { connect: { id: savedContent.id } },
          operation: 'enhanced_ai_classification',
          status: 'completed',
          model_used: classificationResult.provider
        });

        // Execute category-specific actions
        const actionResult = await actionService.executeActionsForCategory(
          savedContent, 
          classificationResult.resolvedCategory.id
        );

        logger.info('Category actions executed', {
          contentId: savedContent.id,
          category: classificationResult.resolvedCategory.name,
          actionsExecuted: actionResult.executed,
          totalActions: actionResult.total,
          errors: actionResult.errors
        });

        // Update processing status based on action results
        const finalStatus = actionResult.errors > 0 ? 'needs_review' : 'completed';
        await db.updateContentItem(savedContent.id, {
          processing_status: finalStatus,
          metadata: {
            ...savedContent.metadata,
            enhancedProcessing: {
              category: classificationResult.resolvedCategory.name,
              rawCategory: classificationResult.rawCategory,
              matchType: classificationResult.matchType,
              confidence: classificationResult.confidence,
              actionsExecuted: actionResult.executed,
              processingResults: actionResult.results,
              processingTime: new Date().toISOString()
            }
          }
        });

        logger.info('Enhanced content processing pipeline completed', {
          contentId: savedContent.id,
          finalCategory: classificationResult.resolvedCategory.name,
          finalStatus: finalStatus
        });

      } catch (classificationError) {
        logger.error('AI classification failed', {
          contentId: savedContent.id,
          error: classificationError.message,
          stack: classificationError.stack
        });

        // Log failed classification
        try {
          await db.createProcessingLog({
            content_items: { connect: { id: savedContent.id } },
            operation: 'ai_classification',
            status: 'failed',
            error_message: classificationError.message
          });

          // Mark for manual review
          await db.updateContentItem(savedContent.id, {
            processing_status: 'needs_review'
          });
        } catch (logError) {
          logger.error('Failed to log classification error', {
            contentId: savedContent.id,
            logError: logError.message
          });
        }
      }
    });

    // Application event logging
    applicationLogger.contentCaptured(savedContent.id, savedContent.url);

    res.status(201).json({
      success: true,
      message: 'Content captured successfully',
      contentId: savedContent.id,
      data: {
        id: savedContent.id,
        url: savedContent.url,
        title: savedContent.title,
        contentType: savedContent.content_type,
        category: savedContent.category,
        createdAt: savedContent.created_at
      }
    });
}));

/**
 * @swagger
 * /api/content/public:
 *   post:
 *     summary: Capture new content (public endpoint for Chrome extension)
 *     description: Submit content from browser extension for processing and storage (no authentication required)
 *     tags: [Content]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContentCaptureRequest'
 *     responses:
 *       201:
 *         description: Content captured successfully
 *       400:
 *         description: Invalid input or security risk detected
 *       409:
 *         description: Content already exists (duplicate)
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
app.post('/api/content/public', rateLimitConfigs.content, validateContentCapture, asyncHandler(async (req, res) => {
    const {
      url,
      title,
      domain,
      contentType,
      metadata,
      content,
      contentHash,
      timestamp
    } = req.body;

    // Perform security analysis on content
    const rawContent = content?.text || '';
    const securityAnalysis = ContentSanitizer.analyzeContentSecurity(rawContent);
    
    if (!securityAnalysis.safe) {
      const highSeverityIssues = securityAnalysis.issues.filter(issue => issue.severity === 'high');
      if (highSeverityIssues.length > 0) {
        return res.status(400).json({
          error: 'Content contains security risks',
          message: 'Content blocked due to potential security threats',
          securityIssues: highSeverityIssues.map(issue => issue.type)
        });
      }
    }

    // Sanitize and prepare content data
    const rawContentData = {
      url: url,
      title: title,
      source_domain: domain,
      content_type: contentType || 'other',
      category: 'pending_classification', // Will be updated after AI classification
      raw_content: rawContent,
      metadata: {
        ...metadata,
        originalMetadata: metadata,
        extractionMethod: content?.extractionMethod,
        contentHash: contentHash,
        capturedAt: timestamp,
        readingTime: content?.readingTime,
        length: content?.length,
        securityAnalysis: securityAnalysis,
        captureMethod: 'public_extension' // Mark as public capture
      },
      content_hash: contentHash
    };

    // Sanitize content data for secure storage
    const contentData = ContentSanitizer.sanitizeContentItem(rawContentData);

    // Check for duplicates
    const existingContent = await db.getContentByHash(contentHash);
    if (existingContent) {
      return res.json({
        success: true,
        message: 'Content already exists',
        contentId: existingContent.id,
        duplicate: true
      });
    }

    // Save content to database
    const savedContent = await db.createContentItem(contentData);

    // Log successful capture
    await db.createProcessingLog({
      content_items: { connect: { id: savedContent.id } },
      operation: 'content_capture',
      status: 'completed'
    });

    // Perform enhanced AI classification and processing asynchronously
    setImmediate(async () => {
      try {
        logger.info('Starting enhanced AI classification and processing', { contentId: savedContent.id });
        
        // Enhanced classification with modular system
        const classificationResult = await enhancedClassifier.classifyContent(savedContent);
        
        logger.info('Enhanced AI classification completed', {
          contentId: savedContent.id,
          rawCategory: classificationResult.rawCategory,
          resolvedCategory: classificationResult.resolvedCategory.name,
          matchType: classificationResult.matchType,
          confidence: classificationResult.confidence,
          provider: classificationResult.provider
        });
        
        // Update content with enhanced classification results
        await categoryService.updateContentCategory(
          savedContent.id, 
          classificationResult.resolvedCategory.id,
          classificationResult.rawCategory
        );
        
        await db.updateContentItem(savedContent.id, {
          ai_confidence_score: classificationResult.confidence,
          processing_status: classificationResult.confidence < 0.7 ? 'needs_review' : 'processing',
          processed_at: new Date()
        });

        // Log AI classification
        await db.createProcessingLog({
          content_items: { connect: { id: savedContent.id } },
          operation: 'enhanced_ai_classification',
          status: 'completed',
          model_used: classificationResult.provider
        });

        // Execute category-specific actions
        const actionResult = await actionService.executeActionsForCategory(
          savedContent, 
          classificationResult.resolvedCategory.id
        );

        logger.info('Category actions executed', {
          contentId: savedContent.id,
          category: classificationResult.resolvedCategory.name,
          actionsExecuted: actionResult.executed,
          totalActions: actionResult.total,
          errors: actionResult.errors
        });

        // Update processing status based on action results
        const finalStatus = actionResult.errors > 0 ? 'needs_review' : 'completed';
        await db.updateContentItem(savedContent.id, {
          processing_status: finalStatus,
          metadata: {
            ...savedContent.metadata,
            enhancedProcessing: {
              category: classificationResult.resolvedCategory.name,
              rawCategory: classificationResult.rawCategory,
              matchType: classificationResult.matchType,
              confidence: classificationResult.confidence,
              actionsExecuted: actionResult.executed,
              processingResults: actionResult.results,
              processingTime: new Date().toISOString()
            }
          }
        });

        logger.info('Enhanced content processing pipeline completed', {
          contentId: savedContent.id,
          finalCategory: classificationResult.resolvedCategory.name,
          finalStatus: finalStatus
        });

      } catch (classificationError) {
        logger.error('AI classification failed', {
          contentId: savedContent.id,
          error: classificationError.message,
          stack: classificationError.stack
        });

        // Log failed classification
        try {
          await db.createProcessingLog({
            content_items: { connect: { id: savedContent.id } },
            operation: 'ai_classification',
            status: 'failed',
            error_message: classificationError.message
          });

          // Mark for manual review
          await db.updateContentItem(savedContent.id, {
            processing_status: 'needs_review'
          });
        } catch (logError) {
          logger.error('Failed to log classification error', {
            contentId: savedContent.id,
            logError: logError.message
          });
        }
      }
    });

    // Application event logging
    applicationLogger.contentCaptured(savedContent.id, savedContent.url);

    res.status(201).json({
      success: true,
      message: 'Content captured successfully',
      contentId: savedContent.id,
      data: {
        id: savedContent.id,
        url: savedContent.url,
        title: savedContent.title,
        contentType: savedContent.content_type,
        category: savedContent.category,
        createdAt: savedContent.created_at
      }
    });
}));

/**
 * @swagger
 * /api/content:
 *   get:
 *     summary: Get content items
 *     description: Retrieve a paginated list of content items with optional filtering and search
 *     tags: [Content]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by content category (dynamic categories available)
 *       - in: query
 *         name: contentType
 *         schema:
 *           type: string
 *           enum: [article, video, post, other]
 *         description: Filter by content type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *         description: Search query for title and content
 *     responses:
 *       200:
 *         description: Content items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ContentItem'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/content', requirePermission('content:read'), validateContentQuery, asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      category,
      contentType,
      search
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100), // Max 100 items per request
      filters: {}
    };

    if (category) options.filters.category = category;
    if (contentType) options.filters.content_type = contentType;

    let result;
    if (search) {
      result = await db.searchContent(search, options);
    } else {
      result = await db.getContentItems(options);
    }

    res.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit)
      }
    });
}));

/**
 * @swagger
 * /api/content/{id}:
 *   get:
 *     summary: Get specific content item
 *     description: Retrieve a single content item by its ID
 *     tags: [Content]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Content item ID
 *     responses:
 *       200:
 *         description: Content item retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ContentItem'
 *       404:
 *         description: Content item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Invalid content ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/content/:id', requirePermission('content:read'), validateContentId, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const content = await db.getContentItemById(parseInt(id));

    if (!content) {
      return res.status(404).json({
        error: 'Content not found'
      });
    }

    res.json({
      success: true,
      data: content
    });
}));

/**
 * @swagger
 * /api/content/{id}:
 *   put:
 *     summary: Update content item
 *     description: Update content item fields (manual override). Requires authentication.
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Content item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContentUpdateRequest'
 *     responses:
 *       200:
 *         description: Content updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ContentItem'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Content item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.put('/api/content/:id', authenticateToken, requirePermission('content:update'), validateContentUpdate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Validate content exists
    const existingContent = await db.getContentItemById(parseInt(id));
    if (!existingContent) {
      return res.status(404).json({
        error: 'Content not found'
      });
    }

    // Sanitize update data
    const sanitizedUpdates = ContentSanitizer.sanitizeContentUpdate(updates);
    
    // Add audit trail
    sanitizedUpdates.updated_at = new Date();
    sanitizedUpdates.updated_by = req.user.userId;

    // Update content
    const updatedContent = await db.updateContentItem(parseInt(id), sanitizedUpdates);

    // Log the manual update
    await db.createProcessingLog({
      content_items: { connect: { id: parseInt(id) } },
      operation: 'manual_update',
      status: 'completed'
    });

    res.json({
      success: true,
      message: 'Content updated successfully',
      data: updatedContent
    });
}));

// Get digests list
app.get('/api/digests', requirePermission('digest:read'), validateDigestQuery, asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50), // Max 50 digests per request
      filters: {}
    };

    if (startDate) options.filters.startDate = startDate;
    if (endDate) options.filters.endDate = endDate;

    const result = await db.getDailyDigests(options);

    res.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit)
      }
    });
}));

// Get specific digest by date
app.get('/api/digests/:date', requirePermission('digest:read'), validateDigestDate, asyncHandler(async (req, res) => {
    const { date } = req.params;
    const digest = await db.getDailyDigestByDate(date);

    if (!digest) {
      return res.status(404).json({
        error: 'Digest not found',
        message: `No digest found for date: ${date}`
      });
    }

    res.json({
      success: true,
      data: digest
    });
}));

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get available content categories
 *     description: Retrieve all available content categories with their statistics
 *     tags: [Categories]
 *     security: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: integer }
 *                           name: { type: string }
 *                           description: { type: string }
 *                           priority: { type: integer }
 *                           is_active: { type: boolean }
 *                           is_fallback: { type: boolean }
 *                           action_count: { type: integer }
 *                           matcher_count: { type: integer }
 *                           content_count: { type: integer }
 */
app.get('/api/categories', asyncHandler(async (req, res) => {
  const categories = await categoryService.getCategories();
  
  res.json({
    success: true,
    data: categories
  });
}));

/**
 * @swagger
 * /api/categories/{id}/aliases:
 *   get:
 *     summary: Get aliases for a category
 *     description: Retrieve all aliases for a specific category
 *     tags: [Categories]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category aliases retrieved successfully
 */
app.get('/api/categories/:id/aliases', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const aliases = await categoryService.getAliases(parseInt(id));
  
  res.json({
    success: true,
    data: aliases
  });
}));

/**
 * @swagger
 * /api/categories/{id}/aliases:
 *   post:
 *     summary: Create a new category alias
 *     description: Create a new alias for automatic category resolution
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               alias:
 *                 type: string
 *                 description: The alias text
 *               confidence_threshold:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 default: 0.7
 *                 description: Confidence threshold for this alias
 *             required: [alias]
 *     responses:
 *       201:
 *         description: Alias created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 */
app.post('/api/categories/:id/aliases', authenticateToken, requireRole(['admin', 'editor']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { alias, confidence_threshold } = req.body;

  if (!alias) {
    return res.status(400).json({
      error: 'Alias is required'
    });
  }

  const result = await categoryService.createAlias(alias, parseInt(id), confidence_threshold);
  
  res.status(201).json({
    success: true,
    message: 'Category alias created successfully',
    data: result
  });
}));

/**
 * @swagger
 * /api/processing/stats:
 *   get:
 *     summary: Get content processing statistics
 *     description: Retrieve statistics about content processing by category
 *     tags: [Processing]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           default: '7 days'
 *         description: Time range for statistics (e.g., '7 days', '30 days')
 *     responses:
 *       200:
 *         description: Processing statistics retrieved successfully
 */
app.get('/api/processing/stats', asyncHandler(async (req, res) => {
  const { timeRange = '7 days' } = req.query;
  const stats = await categoryService.getProcessingStats(timeRange);
  
  res.json({
    success: true,
    data: stats
  });
}));

// Error handling middleware
app.use(errorLogger);
app.use(errorHandler);

// 404 handler for undefined routes
app.use('*', notFoundHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  secureConfigService.clearKeys();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  secureConfigService.clearKeys();
  process.exit(0);
});

// Initialize secure services and start server
async function startServer() {
  try {
    // Initialize secure configuration service
    await secureConfigService.initialize();
    
    // Initialize AI classification service with secure config
    await aiClassificationService.initialize();
    
    // Initialize enhanced services
    await enhancedClassifier.initialize(db);
    await actionService.initialize();
    
    // Initialize political content analyzer
    await politicalContentAnalyzer.initialize();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🔒 Secure configuration initialized`);
      console.log(`🤖 AI classification service ready`);
      console.log(`⚡ Enhanced AI classification service ready`);
      console.log(`🎯 Political content analyzer ready`);
      console.log(`🚀 Action service ready with processors`);
      console.log(`📚 API Documentation available at /api/docs`);
      console.log(`📄 OpenAPI spec available at /api/docs.json`);
      console.log(`Dailies API server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;