// Error Handling Middleware
// Provides centralized error handling with proper status codes and logging

const { logger } = require('./logging');

/**
 * Custom error classes for different types of errors
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400);
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, false);
  }
}

class ExternalServiceError extends AppError {
  constructor(message = 'External service unavailable') {
    super(message, 503, false);
  }
}

/**
 * Convert known error types to AppError instances
 */
const normalizeError = (error) => {
  // Handle Prisma/database errors
  if (error.code === 'P2002') {
    return new ConflictError('Duplicate entry - resource already exists');
  }
  
  if (error.code === 'P2025') {
    return new NotFoundError('Record not found');
  }
  
  if (error.code && error.code.startsWith('P')) {
    return new DatabaseError(`Database error: ${error.message}`);
  }
  
  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid authentication token');
  }
  
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Authentication token expired');
  }
  
  // Handle validation errors
  if (error.name === 'ValidationError') {
    return new ValidationError(error.message, error.details);
  }
  
  // Handle syntax errors
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return new ValidationError('Invalid JSON in request body');
  }
  
  // Handle network/connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return new ExternalServiceError('Connection to external service failed');
  }
  
  // Return as-is if already an AppError
  if (error instanceof AppError) {
    return error;
  }
  
  // Default to internal server error
  return new AppError(
    'Internal server error',
    500,
    false
  );
};

/**
 * Main error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  const normalizedError = normalizeError(error);
  
  // Log error details
  const errorLog = {
    message: normalizedError.message,
    statusCode: normalizedError.statusCode,
    stack: normalizedError.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id,
    timestamp: new Date().toISOString()
  };
  
  // Add user context if available
  if (req.user) {
    errorLog.userId = req.user.userId;
    errorLog.userEmail = req.user.email;
  }
  
  // Add request body for debugging (but sanitize sensitive data)
  if (req.body && Object.keys(req.body).length > 0) {
    errorLog.requestBody = sanitizeForLogging(req.body);
  }
  
  // Log based on error severity
  if (normalizedError.statusCode >= 500) {
    logger.error('Server error', errorLog);
  } else if (normalizedError.statusCode >= 400) {
    logger.warn('Client error', errorLog);
  }
  
  // Prepare response
  const response = {
    error: getErrorType(normalizedError.statusCode),
    message: normalizedError.message,
    statusCode: normalizedError.statusCode,
    timestamp: new Date().toISOString(),
    requestId: req.id
  };
  
  // Add validation details if present
  if (normalizedError instanceof ValidationError && normalizedError.details) {
    response.details = normalizedError.details;
  }
  
  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = normalizedError.stack;
  }
  
  // Send error response
  res.status(normalizedError.statusCode).json(response);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.method} ${req.url} not found`);
  next(error);
};

/**
 * Async error wrapper
 * Catches async errors and passes them to error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global unhandled promise rejection handler
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason.message || reason,
      stack: reason.stack,
      promise: promise.toString(),
      timestamp: new Date().toISOString()
    });
    
    // Graceful shutdown
    process.exit(1);
  });
};

/**
 * Global uncaught exception handler
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Graceful shutdown
    process.exit(1);
  });
};

/**
 * Get error type based on status code
 */
function getErrorType(statusCode) {
  const errorTypes = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    503: 'Service Unavailable'
  };
  
  return errorTypes[statusCode] || 'Unknown Error';
}

/**
 * Sanitize sensitive data for logging
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
  
  return sanitized;
}

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  
  // Middleware
  errorHandler,
  notFoundHandler,
  asyncHandler,
  
  // Global handlers
  handleUnhandledRejection,
  handleUncaughtException
};