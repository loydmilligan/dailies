// Authentication Routes
// Handles user registration, login, and token management

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { 
  generateToken,
  generateRefreshToken,
  hashPassword, 
  comparePassword, 
  validatePasswordStrength,
  authenticateToken,
  authRateLimit,
  loginRateLimit,
  logSecurityEvent
} = require('../middleware/auth');

const router = express.Router();

// Enhanced rate limiting for auth endpoints
const loginLimiter = rateLimit({
  ...loginRateLimit
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    error: 'Too many registration attempts',
    retryAfter: '1 hour'
  }
});

// Input validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address required'),
  body('password')
    .custom((value) => {
      validatePasswordStrength(value);
      return true;
    })
    .withMessage('Password does not meet security requirements'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be 2-50 characters')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user account
 *     description: Create a new user account with email and password
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Registration failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', registerLimiter, registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, name } = req.body;

    // Check if database service is available
    if (!req.app.locals.db) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Database service not available'
      });
    }

    const db = req.app.locals.db;

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      // Log registration attempt for existing user
      logSecurityEvent('registration_attempt_existing_user', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user record
    const userData = {
      email,
      password_hash: hashedPassword,
      name,
      role: 'user', // Default role
      preferences: {
        digest_time: '08:00',
        timezone: 'UTC',
        email_enabled: true,
        audio_enabled: false
      }
    };

    const user = await db.createUser(userData);

    // Generate JWT tokens
    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });
    
    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email
    });
    
    // Log successful registration
    logSecurityEvent('user_registered', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Return success response (don't include password hash)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.created_at
        },
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Unable to create user account'
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user
 *     description: Login with email and password to receive JWT token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials or account disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Login failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check if database service is available
    if (!req.app.locals.db) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Database service not available'
      });
    }

    const db = req.app.locals.db;

    // Find user by email
    const user = await db.getUserByEmail(email);
    if (!user) {
      // Log failed login attempt - user not found
      logSecurityEvent('login_failed_user_not_found', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      // Log failed login attempt - wrong password
      logSecurityEvent('login_failed_wrong_password', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Check if user account is active
    if (user.status && user.status !== 'active') {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'Your account has been disabled'
      });
    }

    // Update last login timestamp
    await db.updateUserLastLogin(user.id);

    // Generate JWT tokens
    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });
    
    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email
    });
    
    // Log successful login
    logSecurityEvent('user_logged_in', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          preferences: user.preferences,
          lastLogin: new Date().toISOString()
        },
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Unable to authenticate user'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    // Get fresh user data from database
    const user = await db.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account no longer exists'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          preferences: user.preferences,
          createdAt: user.created_at,
          lastLogin: user.last_login
        }
      }
    });

  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      error: 'Failed to get user information',
      message: 'Unable to retrieve user data'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        message: 'Please provide a valid refresh token'
      });
    }
    
    // Verify refresh token
    const { verifyToken } = require('../middleware/auth');
    const decoded = verifyToken(refreshToken);
    
    // Verify token type
    if (decoded.tokenType !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    // Get user data to generate new access token
    const db = req.app.locals.db;
    const user = await db.getUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'User account no longer exists'
      });
    }
    
    // Generate new access token
    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });
    
    // Log token refresh
    logSecurityEvent('token_refreshed', {
      userId: user.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { accessToken }
    });

  } catch (error) {
    logSecurityEvent('token_refresh_failed', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      error: error.message
    });
    
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: 'Token refresh failed',
      message: 'Invalid or expired refresh token'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and revoke tokens
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log logout event
    logSecurityEvent('user_logged_out', {
      userId: req.user.userId,
      tokenId: req.user.tokenId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // TODO: Add token to revocation list when implemented
    // await revokeToken(req.user.tokenId);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Unable to complete logout'
    });
  }
});

module.exports = router;