// Logging Middleware
// Provides structured logging using Winston with different levels and formats

const winston = require('winston');
const path = require('path');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(logColors);

// Create log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta
    });
  })
);

// Create console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    level: 'info',
    format: logFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10
  })
];

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  transports,
  exitOnError: false
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Request logging middleware
 * Logs all HTTP requests with details
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request start
  logger.http('Request started', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('content-length'),
    requestId: req.id || generateRequestId()
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    logger.http('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
      requestId: req.id || 'unknown'
    });
    
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Error logging middleware
 * Logs all errors with stack traces and context
 */
const errorLogger = (error, req, res, next) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id || 'unknown',
    timestamp: new Date().toISOString()
  };
  
  // Add user context if available
  if (req.user) {
    errorData.userId = req.user.userId;
    errorData.userEmail = req.user.email;
  }
  
  // Add request body for debugging (but sanitize sensitive data)
  if (req.body && Object.keys(req.body).length > 0) {
    errorData.requestBody = sanitizeForLogging(req.body);
  }
  
  logger.error('Request error', errorData);
  
  next(error);
};

/**
 * Security event logger
 * Logs security-related events
 */
const securityLogger = {
  loginAttempt: (req, email, success, reason = null) => {
    logger.info('Login attempt', {
      email,
      success,
      reason,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      type: 'security_event'
    });
  },
  
  authFailure: (req, reason) => {
    logger.warn('Authentication failure', {
      reason,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
      type: 'security_event'
    });
  },
  
  rateLimitExceeded: (req) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
      type: 'security_event'
    });
  },
  
  suspiciousActivity: (req, activity, details = {}) => {
    logger.warn('Suspicious activity detected', {
      activity,
      details,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
      type: 'security_event'
    });
  }
};

/**
 * Application event logger
 * Logs application-specific events
 */
const applicationLogger = {
  contentCaptured: (contentId, url, userId = null) => {
    logger.info('Content captured', {
      contentId,
      url,
      userId,
      timestamp: new Date().toISOString(),
      type: 'application_event'
    });
  },
  
  digestGenerated: (digestId, date, contentCount) => {
    logger.info('Digest generated', {
      digestId,
      date,
      contentCount,
      timestamp: new Date().toISOString(),
      type: 'application_event'
    });
  },
  
  emailSent: (userId, digestId, email) => {
    logger.info('Email sent', {
      userId,
      digestId,
      email: email.replace(/(.{3}).*(@.*)/, '$1***$2'), // Mask email
      timestamp: new Date().toISOString(),
      type: 'application_event'
    });
  },
  
  processingError: (operation, error, context = {}) => {
    logger.error('Processing error', {
      operation,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      type: 'application_event'
    });
  }
};

/**
 * Sanitize sensitive data for logging
 * Removes or masks sensitive information
 */
function sanitizeForLogging(data) {
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    }
  }
  
  return sanitized;
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add request ID to all requests
 */
const addRequestId = (req, res, next) => {
  req.id = generateRequestId();
  res.set('X-Request-ID', req.id);
  next();
};

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  securityLogger,
  applicationLogger,
  addRequestId
};