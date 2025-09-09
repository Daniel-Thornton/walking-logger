const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway deployment
//app.set('trust proxy', 1);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/walking_logger',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://walking-logger.netlify.app', 'https://walkinglogger.app', 'https://daniel-thornton.github.io'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.'
});

// Initialize database tables
async function initDatabase() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create walks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS walks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        distance DECIMAL(10,2) NOT NULL,
        time_elapsed INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date, distance, time_elapsed)
      )
    `);

    // Create index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_walks_user_date ON walks(user_id, date DESC)
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    // Verify user still exists
    const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [decoded.userId]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = userResult.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed', 
      errors: errors.array() 
    });
  }
  next();
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// User registration
app.post('/api/auth/register', 
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check if user already exists
      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const result = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
        [email, passwordHash]
      );

      const user = result.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'fallback_secret_key',
        { expiresIn: '30d' }
      );

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// User login
app.post('/api/auth/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const result = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'fallback_secret_key',
        { expiresIn: '30d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Verify token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    message: 'Token is valid',
    user: req.user
  });
});

// Get user's walks
app.get('/api/walks', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT date, distance, time_elapsed as "timeElapsed", created_at as "createdAt" FROM walks WHERE user_id = $1 ORDER BY date DESC',
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get walks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add a new walk
app.post('/api/walks',
  authenticateToken,
  [
    body('date').isISO8601().toDate(),
    body('distance').isFloat({ min: 0.01 }),
    body('timeElapsed').isInt({ min: 1 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { date, distance, timeElapsed } = req.body;

      const result = await pool.query(
        'INSERT INTO walks (user_id, date, distance, time_elapsed) VALUES ($1, $2, $3, $4) RETURNING date, distance, time_elapsed as "timeElapsed", created_at as "createdAt"',
        [req.user.id, date, distance, timeElapsed]
      );

      res.status(201).json({
        message: 'Walk added successfully',
        walk: result.rows[0]
      });
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ message: 'A walk with these exact details already exists' });
      }
      console.error('Add walk error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Bulk sync walks (for initial sync from local storage)
app.post('/api/walks/sync',
  authenticateToken,
  [
    body('walks').isArray().withMessage('Walks must be an array'),
    body('walks.*.date').isISO8601().toDate(),
    body('walks.*.distance').isFloat({ min: 0.01 }),
    body('walks.*.timeElapsed').isInt({ min: 1 })
  ],
  handleValidationErrors,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { walks } = req.body;
      let addedCount = 0;
      let skippedCount = 0;

      for (const walk of walks) {
        try {
          await client.query(
            'INSERT INTO walks (user_id, date, distance, time_elapsed) VALUES ($1, $2, $3, $4)',
            [req.user.id, walk.date, walk.distance, walk.timeElapsed]
          );
          addedCount++;
        } catch (error) {
          if (error.code === '23505') { // Unique constraint violation - skip duplicate
            skippedCount++;
          } else {
            throw error; // Re-throw other errors
          }
        }
      }

      await client.query('COMMIT');

      res.json({
        message: 'Sync completed successfully',
        added: addedCount,
        skipped: skippedCount,
        total: walks.length
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Sync walks error:', error);
      res.status(500).json({ message: 'Internal server error during sync' });
    } finally {
      client.release();
    }
  }
);

// Delete a walk
app.delete('/api/walks/:date',
  authenticateToken,
  async (req, res) => {
    try {
      const { date } = req.params;

      const result = await pool.query(
        'DELETE FROM walks WHERE user_id = $1 AND date = $2 RETURNING *',
        [req.user.id, date]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Walk not found' });
      }

      res.json({ message: 'Walk deleted successfully' });
    } catch (error) {
      console.error('Delete walk error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Get user statistics
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_walks,
        COALESCE(SUM(distance), 0) as total_distance,
        COALESCE(AVG(distance), 0) as avg_distance,
        COALESCE(SUM(time_elapsed), 0) as total_time,
        COALESCE(AVG(time_elapsed), 0) as avg_time
      FROM walks 
      WHERE user_id = $1
    `, [req.user.id]);

    const stats = result.rows[0];
    
    // Convert string numbers to actual numbers
    stats.total_walks = parseInt(stats.total_walks);
    stats.total_distance = parseFloat(stats.total_distance);
    stats.avg_distance = parseFloat(stats.avg_distance);
    stats.total_time = parseInt(stats.total_time);
    stats.avg_time = parseFloat(stats.avg_time);

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ message: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Start server
async function startServer() {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`Walking Logger API server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

startServer();





