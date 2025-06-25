const csrf = require('csrf');
const rateLimit = require('express-rate-limit');

// Initialize CSRF tokens
const tokens = new csrf();

// CSRF token secret - in production, store this securely
const csrfSecret = process.env.CSRF_SECRET || 'dailies-csrf-secret-key-2024';

/**
 * Generate CSRF token for forms
 */
const generateCSRFToken = () => {
  return tokens.create(csrfSecret);
};

/**
 * Verify CSRF token
 */
const verifyCSRFToken = (token) => {
  return tokens.verify(csrfSecret, token);
};

/**
 * Middleware to add CSRF token to request
 */
const addCSRFToken = (req, res, next) => {
  // Add CSRF token to locals for templates
  res.locals.csrfToken = generateCSRFToken();
  
  // Add to response headers for AJAX requests
  res.set('X-CSRF-Token', res.locals.csrfToken);
  
  next();
};

/**
 * Middleware to verify CSRF token on state-changing requests
 */
const verifyCSRF = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for API endpoints with JWT authentication
  if (req.path.startsWith('/api/') && req.headers.authorization) {
    return next();
  }
  
  let token = null;
  
  // Try to get token from various sources
  token = req.body._csrf || 
          req.headers['x-csrf-token'] || 
          req.headers['csrf-token'] ||
          req.query._csrf;
  
  if (!token) {
    return res.status(403).json({
      error: 'CSRF token missing',
      message: 'CSRF token is required for this request'
    });
  }
  
  // Verify the token
  if (!verifyCSRFToken(token)) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'CSRF token verification failed'
    });
  }
  
  next();
};

/**
 * Enhanced rate limiting for authentication endpoints
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many authentication attempts from this IP',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Strict rate limiting for password reset attempts
 */
const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    error: 'Too many password reset attempts',
    message: 'Please wait before requesting another password reset',
    retryAfter: '1 hour'
  }
});

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Prevent XSS attacks
  res.set('X-XSS-Protection', '1; mode=block');
  
  // Prevent MIME type sniffing
  res.set('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.set('X-Frame-Options', 'DENY');
  
  // Referrer policy
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com",
    "img-src 'self' data: https:",
    "font-src 'self' https:",
    "connect-src 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
  
  res.set('Content-Security-Policy', csp);
  
  // Permissions Policy (formerly Feature Policy)
  res.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

/**
 * Secure cookie configuration
 */
const secureCookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Input sanitization for common attack vectors
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    return value;
  };
  
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (req.body.hasOwnProperty(key)) {
        req.body[key] = sanitizeValue(req.body[key]);
      }
    }
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (req.query.hasOwnProperty(key)) {
        req.query[key] = sanitizeValue(req.query[key]);
      }
    }
  }
  
  next();
};

/**
 * Monitor and log security events
 */
const securityMonitoring = (req, res, next) => {
  // Log suspicious requests
  const suspiciousPatterns = [
    /\.\./,           // Directory traversal
    /<script/i,       // XSS attempts
    /union.*select/i, // SQL injection
    /exec\(/i,        // Code execution
    /eval\(/i         // Code evaluation
  ];
  
  const requestString = JSON.stringify({
    url: req.url,
    body: req.body,
    query: req.query,
    headers: req.headers
  });
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestString)) {
      console.warn('Suspicious request detected:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        pattern: pattern.toString(),
        timestamp: new Date().toISOString()
      });
      break;
    }
  }
  
  next();
};

module.exports = {
  generateCSRFToken,
  verifyCSRFToken,
  addCSRFToken,
  verifyCSRF,
  authRateLimit,
  passwordResetRateLimit,
  securityHeaders,
  secureCookieConfig,
  sanitizeInput,
  securityMonitoring
};