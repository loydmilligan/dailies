const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

class JWTService {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || this.secret + '_refresh';
    
    if (!this.secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    // Token expiration times
    this.ACCESS_TOKEN_EXPIRY = '24h'; // 24 hours
    this.REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
    
    // Store active refresh tokens (in production, use Redis or database)
    this.refreshTokens = new Set();
  }

  /**
   * Generate access token for user authentication
   * @param {Object} payload - User data to include in token
   * @param {string} payload.userId - User ID
   * @param {string} payload.role - User role
   * @param {string} payload.email - User email
   * @returns {string} JWT access token
   */
  generateAccessToken(payload) {
    if (!payload.userId) {
      throw new Error('userId is required in token payload');
    }

    const tokenPayload = {
      userId: payload.userId,
      role: payload.role || 'user',
      email: payload.email,
      type: 'access',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, this.secret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'dailies-api',
      audience: 'dailies-frontend'
    });
  }

  /**
   * Generate refresh token for remember-me functionality
   * @param {Object} payload - User data to include in token
   * @returns {string} JWT refresh token
   */
  generateRefreshToken(payload) {
    if (!payload.userId) {
      throw new Error('userId is required in token payload');
    }

    const tokenPayload = {
      userId: payload.userId,
      type: 'refresh',
      jti: crypto.randomUUID(), // Unique token ID
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(tokenPayload, this.refreshSecret, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      issuer: 'dailies-api',
      audience: 'dailies-frontend'
    });

    // Store token ID for tracking
    this.refreshTokens.add(tokenPayload.jti);
    
    return token;
  }

  /**
   * Verify and decode access token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: 'dailies-api',
        audience: 'dailies-frontend'
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      } else if (error.name === 'NotBeforeError') {
        throw new Error('Access token not active yet');
      }
      throw error;
    }
  }

  /**
   * Verify and decode refresh token
   * @param {string} token - JWT refresh token to verify
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid, expired, or revoked
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshSecret, {
        issuer: 'dailies-api',
        audience: 'dailies-frontend'
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if token is still active (not revoked)
      if (!this.refreshTokens.has(decoded.jti)) {
        throw new Error('Refresh token has been revoked');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} Token or null if not found
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * Extract token from cookies
   * @param {Object} cookies - Request cookies
   * @returns {string|null} Token or null if not found
   */
  extractTokenFromCookies(cookies) {
    return cookies?.access_token || null;
  }

  /**
   * Revoke refresh token
   * @param {string} token - Refresh token to revoke
   */
  revokeRefreshToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded?.jti) {
        this.refreshTokens.delete(decoded.jti);
      }
    } catch (error) {
      // Token might be malformed, but we still want to attempt revocation
      console.warn('Error revoking refresh token:', error.message);
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Valid refresh token
   * @param {Object} userPayload - Updated user data
   * @returns {Object} New access token and optionally new refresh token
   */
  refreshAccessToken(refreshToken, userPayload) {
    const decoded = this.verifyRefreshToken(refreshToken);
    
    // Generate new access token
    const newAccessToken = this.generateAccessToken({
      userId: decoded.userId,
      role: userPayload.role,
      email: userPayload.email
    });

    return {
      accessToken: newAccessToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRY
    };
  }

  /**
   * Decode token without verification (for extracting payload)
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded payload or null if invalid
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get token expiration time
   * @param {string} token - JWT token
   * @returns {Date|null} Expiration date or null if invalid
   */
  getTokenExpiration(token) {
    const decoded = this.decodeToken(token);
    return decoded?.exp ? new Date(decoded.exp * 1000) : null;
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} True if expired
   */
  isTokenExpired(token) {
    const expiration = this.getTokenExpiration(token);
    return expiration ? expiration < new Date() : true;
  }

  /**
   * Clean up expired refresh tokens
   */
  cleanupExpiredTokens() {
    // In a real application, this would query a database
    // For now, we rely on JWT's built-in expiration
    console.log('Cleanup of expired tokens completed');
  }
}

module.exports = new JWTService();