const jwtService = require('../services/jwtService');
const { asyncHandler } = require('./errorHandler');

/**
 * Middleware to authenticate JWT tokens
 * Checks Authorization header and cookies for valid JWT tokens
 */
const authenticateJWT = asyncHandler(async (req, res, next) => {
  let token = null;
  
  // Try to extract token from Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader) {
    token = jwtService.extractTokenFromHeader(authHeader);
  }
  
  // If no token in header, try cookies
  if (!token) {
    token = jwtService.extractTokenFromCookies(req.cookies);
  }
  
  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'No access token provided'
    });
  }
  
  try {
    // Verify the token
    const decoded = jwtService.verifyAccessToken(token);
    
    // Add user info to request object
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
      tokenExp: decoded.exp
    };
    
    // Add token to request for potential revocation
    req.token = token;
    
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid token',
      message: error.message
    });
  }
});

/**
 * Middleware for optional authentication
 * Sets user info if token is valid, but doesn't block request if not
 */
const optionalJWT = asyncHandler(async (req, res, next) => {
  let token = null;
  
  // Try to extract token from Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader) {
    token = jwtService.extractTokenFromHeader(authHeader);
  }
  
  // If no token in header, try cookies
  if (!token) {
    token = jwtService.extractTokenFromCookies(req.cookies);
  }
  
  if (token) {
    try {
      const decoded = jwtService.verifyAccessToken(token);
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
        email: decoded.email,
        tokenExp: decoded.exp
      };
      req.token = token;
    } catch (error) {
      // Token is invalid, but we don't block the request
      req.user = null;
    }
  } else {
    req.user = null;
  }
  
  next();
});

/**
 * Middleware to require specific roles
 * @param {string|string[]} roles - Required role(s)
 */
const requireRole = (roles) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }
    
    if (!roleArray.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required role: ${roleArray.join(' or ')}, current role: ${req.user.role}`
      });
    }
    
    next();
  };
};

/**
 * Middleware to check if user owns resource
 * @param {string} userIdParam - Parameter name containing user ID to check
 */
const requireOwnership = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }
    
    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    
    if (!resourceUserId) {
      return res.status(400).json({
        error: 'Bad request',
        message: `Missing ${userIdParam} parameter`
      });
    }
    
    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check ownership
    if (req.user.userId !== resourceUserId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources'
      });
    }
    
    next();
  };
};

/**
 * Middleware to check token expiration and warn if close to expiry
 */
const checkTokenExpiration = (req, res, next) => {
  if (req.user && req.user.tokenExp) {
    const now = Math.floor(Date.now() / 1000);
    const timeToExpiry = req.user.tokenExp - now;
    
    // Warn if token expires in less than 1 hour (3600 seconds)
    if (timeToExpiry < 3600 && timeToExpiry > 0) {
      res.set('X-Token-Warning', 'Token expires soon');
      res.set('X-Token-Expires-In', timeToExpiry.toString());
    }
  }
  
  next();
};

/**
 * Middleware to refresh token if needed and user has refresh token
 */
const autoRefreshToken = asyncHandler(async (req, res, next) => {
  // Check if we should refresh the token
  if (req.user && req.user.tokenExp) {
    const now = Math.floor(Date.now() / 1000);
    const timeToExpiry = req.user.tokenExp - now;
    
    // Refresh if token expires in less than 30 minutes
    if (timeToExpiry < 1800 && timeToExpiry > 0) {
      const refreshToken = req.cookies?.refresh_token;
      
      if (refreshToken) {
        try {
          const result = jwtService.refreshAccessToken(refreshToken, req.user);
          
          // Set new token in cookie
          res.cookie('access_token', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
          });
          
          res.set('X-Token-Refreshed', 'true');
        } catch (error) {
          // Refresh failed, but don't block the request
          console.warn('Token refresh failed:', error.message);
        }
      }
    }
  }
  
  next();
});

module.exports = {
  authenticateJWT,
  optionalJWT,
  requireRole,
  requireOwnership,
  checkTokenExpiration,
  autoRefreshToken
};