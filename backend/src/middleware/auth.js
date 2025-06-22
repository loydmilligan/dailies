// JWT Authentication Middleware
// Provides secure token-based authentication for API endpoints

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// JWT configuration with enhanced security
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'; // Shorter expiration for security
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const JWT_ISSUER = process.env.JWT_ISSUER || 'dailies-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'dailies-client';

// Security validation
if (JWT_SECRET === 'your-secret-key-change-in-production' && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production environment');
}

if (JWT_SECRET.length < 32) {
  console.warn('JWT_SECRET should be at least 32 characters for security');
}

/**
 * Generate JWT access token with enhanced security options
 * @param {Object} payload - User data to include in token
 * @param {Object} options - Additional token options
 * @returns {string} JWT token
 */
function generateToken(payload, options = {}) {
  const tokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    jti: generateTokenId(), // Unique token ID for revocation
    tokenType: 'access'
  };

  const tokenOptions = {
    expiresIn: options.expiresIn || JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithm: 'HS256',
    ...options
  };

  return jwt.sign(tokenPayload, JWT_SECRET, tokenOptions);
}

/**
 * Generate refresh token for token renewal
 * @param {Object} payload - User data to include in token
 * @returns {string} Refresh token
 */
function generateRefreshToken(payload) {
  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    tokenType: 'refresh',
    jti: generateTokenId()
  };

  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithm: 'HS256'
  });
}

/**
 * Generate unique token ID for revocation tracking
 * @returns {string} Unique token identifier
 */
function generateTokenId() {
  return require('crypto').randomBytes(16).toString('hex');
}

/**
 * Verify JWT token with enhanced security checks
 * @param {string} token - JWT token to verify
 * @param {Object} options - Verification options
 * @returns {Object} Decoded token payload
 */
function verifyToken(token, options = {}) {
  const verifyOptions = {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithms: ['HS256'],
    clockTolerance: 30, // 30 second clock tolerance
    ...options
  };

  const decoded = jwt.verify(token, JWT_SECRET, verifyOptions);
  
  // Additional security checks
  if (!decoded.jti) {
    throw new Error('Token missing unique identifier');
  }
  
  // Check if token is in revocation list (implement as needed)
  if (isTokenRevoked(decoded.jti)) {
    throw new Error('Token has been revoked');
  }
  
  return decoded;
}

/**
 * Check if token is revoked (placeholder for future implementation)
 * @param {string} tokenId - Token unique identifier
 * @returns {boolean} True if token is revoked
 */
function isTokenRevoked(tokenId) {
  // TODO: Implement token revocation list (Redis cache recommended)
  return false;
}

/**
 * Revoke a token by adding it to revocation list
 * @param {string} tokenId - Token unique identifier
 * @returns {Promise<void>}
 */
async function revokeToken(tokenId) {
  // TODO: Implement token revocation (add to Redis cache)
  console.log(`Token ${tokenId} would be revoked`);
}

/**
 * Hash password using bcrypt with enhanced security
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  // Validate password strength
  validatePasswordStrength(password);
  
  // Use higher salt rounds for better security (12 rounds = 2^12 iterations)
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(password, salt);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @throws {Error} If password doesn't meet requirements
 */
function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  // Check for complexity requirements
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  const complexityCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
  
  if (complexityCount < 3) {
    throw new Error('Password must contain at least 3 of: uppercase, lowercase, numbers, special characters');
  }
  
  // Check for common weak passwords
  const commonPasswords = ['password', '12345678', 'qwerty123', 'password123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    throw new Error('Password is too common. Please choose a stronger password');
  }
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Enhanced authentication middleware with security logging
 * Verifies JWT token from Authorization header
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  if (!token) {
    logSecurityEvent('auth_missing_token', {
      ip: clientIP,
      userAgent,
      endpoint: req.path
    });
    
    return res.status(401).json({
      error: 'Access token required',
      message: 'Please provide a valid authorization token'
    });
  }

  try {
    const decoded = verifyToken(token);
    
    // Verify token type
    if (decoded.tokenType !== 'access') {
      throw new Error('Invalid token type');
    }
    
    // Add enhanced user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tokenId: decoded.jti,
      issuedAt: decoded.iat,
      expiresAt: decoded.exp
    };
    
    // Log successful authentication
    logSecurityEvent('auth_success', {
      userId: decoded.userId,
      ip: clientIP,
      endpoint: req.path
    });
    
    next();
  } catch (error) {
    // Log failed authentication attempt
    logSecurityEvent('auth_failed', {
      ip: clientIP,
      userAgent,
      endpoint: req.path,
      error: error.message
    });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please log in again',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is malformed or invalid',
        code: 'TOKEN_INVALID'
      });
    } else {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Unable to verify token',
        code: 'AUTH_FAILED'
      });
    }
  }
};

/**
 * Log security events for monitoring
 * @param {string} event - Event type
 * @param {Object} data - Event data
 */
function logSecurityEvent(event, data) {
  const timestamp = new Date().toISOString();
  
  // Use console for now, integrate with proper logging system later
  console.log(`[SECURITY] ${timestamp} - ${event}:`, JSON.stringify(data));
  
  // TODO: Integrate with security monitoring system (e.g., Splunk, ELK)
}

/**
 * Optional authentication middleware
 * Adds user info to request if token is provided, but doesn't require it
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch (error) {
      // Token invalid, but continue without user info
      console.warn('Invalid token provided:', error.message);
    }
  }

  next();
};

/**
 * Admin role authorization middleware
 * Requires valid token and admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in first'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'Insufficient permissions'
    });
  }

  next();
};

/**
 * Enhanced rate limiting for authentication endpoints
 */
const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    message: 'Please wait 15 minutes before trying again',
    retryAfter: '15 minutes',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurityEvent('rate_limit_exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please wait 15 minutes before trying again',
      retryAfter: '15 minutes',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
};

/**
 * Stricter rate limiting for failed login attempts
 */
const loginRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 failed attempts per window
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    error: 'Too many failed login attempts',
    message: 'Account temporarily locked. Please wait 15 minutes',
    retryAfter: '15 minutes',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  authenticateToken,
  optionalAuth,
  requireAdmin,
  authRateLimit,
  loginRateLimit,
  revokeToken,
  isTokenRevoked,
  logSecurityEvent
};