// Input Validation Middleware
// Provides comprehensive request validation using express-validator

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 * Returns formatted error response if validation fails
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Log validation errors for debugging
    console.log('Validation errors:', errors.array());
    console.log('Request body keys:', Object.keys(req.body));
    
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid input data provided',
      details: errors.array().map(error => ({
        field: error.path,
        value: error.value,
        message: error.msg,
        location: error.location
      }))
    });
  }
  
  next();
};

/**
 * Content capture validation rules
 */
const validateContentCapture = [
  body('url')
    .isURL()
    .withMessage('Valid URL is required')
    .isLength({ max: 2048 })
    .withMessage('URL too long (max 2048 characters)'),
  
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 500 })
    .withMessage('Title too long (max 500 characters)'),
  
  body('domain')
    .trim()
    .notEmpty()
    .withMessage('Domain is required')
    .isLength({ max: 255 })
    .withMessage('Domain too long (max 255 characters)'),
  
  body('contentType')
    .optional()
    .isIn(['article', 'video', 'post', 'other'])
    .withMessage('Content type must be one of: article, video, post, other'),
  
  body('content.text')
    .optional()
    .isLength({ max: 1000000 }) // 1MB text limit
    .withMessage('Content text too long (max 1MB)'),
  
  body('contentHash')
    .optional()
    .isLength({ min: 6, max: 64 })
    .withMessage('Content hash must be 6-64 characters'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  
  handleValidationErrors
];

/**
 * Content update validation rules
 */
const validateContentUpdate = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid content ID is required'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Title must be 1-500 characters'),
  
  body('category')
    .optional()
    .isIn(['US_Politics_News', 'General'])
    .withMessage('Category must be US_Politics_News or General'),
  
  body('content_type')
    .optional()
    .isIn(['article', 'video', 'post', 'other'])
    .withMessage('Content type must be one of: article, video, post, other'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags.length > 20) {
        throw new Error('Maximum 20 tags allowed');
      }
      return tags.every(tag => 
        typeof tag === 'string' && 
        tag.length >= 1 && 
        tag.length <= 50
      );
    })
    .withMessage('Each tag must be 1-50 characters'),
  
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Notes must be a string (max 5000 characters)'),
  
  handleValidationErrors
];

/**
 * Content list query validation
 */
const validateContentQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('category')
    .optional()
    .isIn(['US_Politics_News', 'General'])
    .withMessage('Category must be US_Politics_News or General'),
  
  query('contentType')
    .optional()
    .isIn(['article', 'video', 'post', 'other'])
    .withMessage('Content type must be one of: article, video, post, other'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be 1-200 characters'),
  
  handleValidationErrors
];

/**
 * Content ID parameter validation
 */
const validateContentId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid content ID is required'),
  
  handleValidationErrors
];

/**
 * Digest query validation
 */
const validateDigestQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO 8601 format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO 8601 format'),
  
  handleValidationErrors
];

/**
 * Digest date parameter validation
 */
const validateDigestDate = [
  param('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format')
    .custom((date) => {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date');
      }
      // Check if date is not too far in the future
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 30);
      if (dateObj > maxDate) {
        throw new Error('Date cannot be more than 30 days in the future');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Generic sanitization for string inputs
 */
const sanitizeStrings = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters but preserve content
      return value
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
        .trim();
    } else if (typeof value === 'object' && value !== null) {
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    return value;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  next();
};

/**
 * Validate request size
 */
const validateRequestSize = (req, res, next) => {
  const contentLength = req.get('content-length');
  
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    return res.status(413).json({
      error: 'Request too large',
      message: 'Request body exceeds 10MB limit'
    });
  }
  
  next();
};

module.exports = {
  handleValidationErrors,
  validateContentCapture,
  validateContentUpdate,
  validateContentQuery,
  validateContentId,
  validateDigestQuery,
  validateDigestDate,
  sanitizeStrings,
  validateRequestSize
};