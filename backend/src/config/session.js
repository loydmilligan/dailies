const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool for sessions
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Connection timeout
});

// Test the connection pool
pgPool.on('connect', () => {
  console.log('📦 Session store connected to PostgreSQL');
});

pgPool.on('error', (err) => {
  console.error('❌ Session store connection error:', err);
});

// Session configuration
const sessionConfig = {
  store: new pgSession({
    pool: pgPool,
    tableName: 'session', // Table name for sessions
    createTableIfMissing: true, // Auto-create table if it doesn't exist
    pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
    errorLog: console.error
  }),
  secret: process.env.JWT_SECRET || 'fallback-secret-key',
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  name: 'dailies.sid', // Session cookie name
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // CSRF protection
  },
  rolling: true // Reset expiration on activity
};

// For production, add additional security
if (process.env.NODE_ENV === 'production') {
  sessionConfig.cookie.secure = true;
  sessionConfig.cookie.sameSite = 'strict';
}

module.exports = {
  sessionConfig,
  pgPool
};