// Enhanced Security Middleware
// Provides comprehensive security headers, CSRF protection, and security policies

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logSecurityEvent } = require('./auth');

/**
 * Enhanced helmet configuration with comprehensive security headers
 */
function getEnhancedHelmetConfig() {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", // Required for Swagger UI
          "cdn.jsdelivr.net"
        ],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", // Required for Swagger UI
          "cdn.jsdelivr.net",
          "fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "fonts.gstatic.com",
          "data:"
        ],
        imgSrc: [
          "'self'", 
          "data:", 
          "https:"
        ],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
      },
      reportOnly: false
    },

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },

    // X-Frame-Options
    frameguard: {
      action: 'deny'
    },

    // X-Content-Type-Options
    noSniff: true,

    // X-XSS-Protection (deprecated but still useful for older browsers)
    xssFilter: true,

    // Referrer Policy
    referrerPolicy: {
      policy: ['strict-origin-when-cross-origin']
    },

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false
    },

    // Download Options for IE8+
    ieNoOpen: true,

    // Origin Agent Cluster
    originAgentCluster: true,

    // Permissions Policy (Feature Policy)
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      paymentInstruments: [],
      accelerometer: [],
      gyroscope: [],
      magnetometer: [],
      usb: [],
      bluetooth: []
    }
  });
}

/**
 * Enhanced rate limiting with different tiers
 */
const rateLimitConfigs = {
  // Strict rate limiting for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      error: 'Too many authentication attempts',
      message: 'Please wait 15 minutes before trying again',
      code: 'AUTH_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logSecurityEvent('rate_limit_auth_exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path
      });
      
      res.status(429).json({
        error: 'Too many authentication attempts',
        message: 'Please wait 15 minutes before trying again',
        code: 'AUTH_RATE_LIMIT'
      });
    }
  }),

  // Moderate rate limiting for API endpoints
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      error: 'Too many API requests',
      message: 'Please slow down your requests',
      code: 'API_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Strict rate limiting for content creation
  content: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 content submissions per minute
    message: {
      error: 'Content submission rate limit exceeded',
      message: 'Please wait before submitting more content',
      code: 'CONTENT_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Very strict rate limiting for admin operations
  admin: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 admin operations per minute
    message: {
      error: 'Admin operation rate limit exceeded',
      message: 'Please slow down admin operations',
      code: 'ADMIN_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logSecurityEvent('rate_limit_admin_exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        userId: req.user?.userId
      });
      
      res.status(429).json({
        error: 'Admin operation rate limit exceeded',
        message: 'Please slow down admin operations',
        code: 'ADMIN_RATE_LIMIT'
      });
    }
  })
};

/**
 * CSRF Protection Middleware
 */
function csrfProtection() {
  return (req, res, next) => {
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip CSRF for API endpoints with valid JWT (already authenticated)
    if (req.user && req.headers.authorization) {
      return next();
    }

    // For form submissions and other state-changing operations without JWT
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session?.csrfToken;

    if (!token || !sessionToken || token !== sessionToken) {
      logSecurityEvent('csrf_protection_triggered', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        hasToken: !!token,
        hasSessionToken: !!sessionToken
      });

      return res.status(403).json({
        error: 'CSRF token validation failed',
        message: 'Invalid or missing CSRF token',
        code: 'CSRF_INVALID'
      });
    }

    next();
  };
}

/**
 * Security headers middleware for enhanced protection
 */
function additionalSecurityHeaders() {
  return (req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent page embedding
    res.setHeader('X-Frame-Options', 'DENY');
    
    // XSS Protection (legacy but still useful)
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Strict referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Prevent DNS prefetching
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    
    // Disable Adobe Flash crossdomain.xml
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // Security-focused cache control
    if (req.path.includes('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    // Custom security headers
    res.setHeader('X-API-Version', '1.0');
    res.setHeader('X-Security-Headers', 'enabled');
    
    next();
  };
}

/**
 * Request validation middleware for security
 */
function requestValidation() {
  return (req, res, next) => {
    // Check for suspicious patterns in URLs
    const suspiciousPatterns = [
      /\.\./,  // Path traversal
      /\/etc\/passwd/,  // Unix system files
      /\/proc\//,  // Linux process info
      /cmd\.exe/,  // Windows commands
      /powershell/,  // PowerShell
      /<script/i,  // Script injection
      /javascript:/i,  // JavaScript protocol
      /vbscript:/i,  // VBScript protocol
      /onload=/i,  // Event handlers
      /onerror=/i,
      /eval\(/i,  // Code evaluation
      /expression\(/i,  // CSS expressions
      /xp_cmdshell/i,  // SQL Server commands
      /sp_executesql/i
    ];

    const fullUrl = req.originalUrl || req.url;
    const userAgent = req.get('User-Agent') || '';
    
    // Check URL for suspicious patterns
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fullUrl) || pattern.test(userAgent)) {
        logSecurityEvent('suspicious_request_blocked', {
          ip: req.ip,
          userAgent,
          url: fullUrl,
          pattern: pattern.toString(),
          method: req.method
        });

        return res.status(400).json({
          error: 'Invalid request',
          message: 'Request contains suspicious patterns',
          code: 'SUSPICIOUS_REQUEST'
        });
      }
    }

    // Check for oversized headers
    const maxHeaderSize = 8192; // 8KB
    const headers = JSON.stringify(req.headers);
    if (headers.length > maxHeaderSize) {
      logSecurityEvent('oversized_headers_blocked', {
        ip: req.ip,
        userAgent,
        headerSize: headers.length,
        maxSize: maxHeaderSize
      });

      return res.status(400).json({
        error: 'Headers too large',
        message: 'Request headers exceed maximum size',
        code: 'HEADERS_TOO_LARGE'
      });
    }

    next();
  };
}

/**
 * Security monitoring middleware
 */
function securityMonitoring() {
  return (req, res, next) => {
    // Log security-sensitive requests
    const sensitiveEndpoints = ['/api/auth/', '/api/admin/', '/api/users/'];
    const isSensitive = sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint));
    
    if (isSensitive) {
      logSecurityEvent('sensitive_endpoint_access', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        userId: req.user?.userId,
        timestamp: new Date().toISOString()
      });
    }

    // Track failed authentication attempts per IP
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode === 401 && req.path.includes('/auth/')) {
        logSecurityEvent('failed_authentication_attempt', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          timestamp: new Date().toISOString()
        });
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
}

module.exports = {
  getEnhancedHelmetConfig,
  rateLimitConfigs,
  csrfProtection,
  additionalSecurityHeaders,
  requestValidation,
  securityMonitoring
};