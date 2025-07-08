const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const validator = require('validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// AWS Configuration
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-1' });

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.mcsoko.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Simple health check endpoint (bypasses CORS for ELB health checks)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'goalaroo-backend'
  });
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://goalaroo.mcsoko.com',
      'https://www.goalaroo.mcsoko.com',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Allow health check requests (no origin) in all environments
    if (!origin) {
      console.log('CORS allowing null origin (likely health check)');
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // Cache preflight for 24 hours
};

app.use(cors(corsOptions));

// Pre-flight requests
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// JWT Secret - fail fast if not configured
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

// Database table names
const TABLES = {
  USERS: 'goalaroo-users',
  MAGIC_CODES: 'goalaroo-magic-codes',
  USER_DATA: 'goalaroo-user-data'
};

// Utility functions
function generateMagicCode() {
  return crypto.randomInt(100000, 999999).toString();
}

function generateJWT(email) {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyJWT(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const user = verifyJWT(token);
  if (!user) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}

// Email sending function
async function sendMagicCodeEmail(email, code) {
  const params = {
    Source: process.env.FROM_EMAIL || 'noreply@goalaroo.mcsoko.com',
    Destination: {
      ToAddresses: [email]
    },
    Message: {
      Subject: {
        Data: 'Your Goalaroo Magic Code',
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 48px; margin-bottom: 10px;">🦘</div>
                <h1 style="color: #764ba2; margin: 0;">Goalaroo</h1>
                <p style="color: #666; margin: 10px 0;">Track your child's progress with fun!</p>
              </div>
              
              <div style="background: #f8f9fa; border-radius: 15px; padding: 30px; text-align: center; margin-bottom: 30px;">
                <h2 style="color: #333; margin-bottom: 20px;">Your Magic Code</h2>
                <div style="background: white; border: 2px dashed #007AFF; border-radius: 10px; padding: 20px; margin: 20px 0;">
                  <div style="font-size: 32px; font-weight: bold; color: #007AFF; letter-spacing: 5px;">${code}</div>
                </div>
                <p style="color: #666; margin: 0;">Enter this code in the app to sign in</p>
              </div>
              
              <div style="text-align: center; color: #999; font-size: 14px;">
                <p>This code will expire in 10 minutes</p>
                <p>If you didn't request this code, please ignore this email</p>
              </div>
            </div>
          `,
          Charset: 'UTF-8'
        }
      }
    }
  };

  try {
    await ses.sendEmail(params).promise();
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  console.log('Health check request from:', req.headers.origin);
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    cors: {
      origin: req.headers.origin,
      frontendUrl: process.env.FRONTEND_URL
    }
  });
});

// CORS debug endpoint
app.get('/api/cors-debug', (req, res) => {
  console.log('CORS debug request from:', req.headers.origin);
  res.json({
    message: 'CORS is working',
    requestOrigin: req.headers.origin,
    allowedOrigins: [
      'https://goalaroo.mcsoko.com',
      'https://www.goalaroo.mcsoko.com',
      process.env.FRONTEND_URL
    ].filter(Boolean),
    environment: {
      FRONTEND_URL: process.env.FRONTEND_URL,
      NODE_ENV: process.env.NODE_ENV
    }
  });
});

// Send magic code
app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const code = generateMagicCode();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

    // Store magic code in DynamoDB
    await dynamodb.put({
      TableName: TABLES.MAGIC_CODES,
      Item: {
        email: email.toLowerCase(),
        code: code,
        expiresAt: expiresAt,
        createdAt: Date.now()
      }
    }).promise();

    // Send email
    const emailSent = await sendMagicCodeEmail(email, code);
    
    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send email' });
    }

    res.json({ message: 'Magic code sent successfully' });
  } catch (error) {
    console.error('Error sending magic code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify magic code
app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !validator.isEmail(email) || !code) {
      return res.status(400).json({ error: 'Valid email and code required' });
    }

    // Get magic code from DynamoDB
    const result = await dynamodb.get({
      TableName: TABLES.MAGIC_CODES,
      Key: { email: email.toLowerCase() }
    }).promise();

    if (!result.Item || result.Item.code !== code) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    if (Date.now() > result.Item.expiresAt) {
      return res.status(400).json({ error: 'Code expired' });
    }

    // Delete used code
    await dynamodb.delete({
      TableName: TABLES.MAGIC_CODES,
      Key: { email: email.toLowerCase() }
    }).promise();

    // Create or update user
    const userId = uuidv4();
    await dynamodb.put({
      TableName: TABLES.USERS,
      Item: {
        email: email.toLowerCase(),
        userId: userId,
        lastLogin: Date.now(),
        createdAt: Date.now()
      }
    }).promise();

    // Generate JWT token
    const token = generateJWT(email.toLowerCase());

    res.json({
      token,
      user: {
        email: email.toLowerCase(),
        userId: userId
      }
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user data
app.get('/api/user/data', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;

    const result = await dynamodb.get({
      TableName: TABLES.USER_DATA,
      Key: { email: email.toLowerCase() }
    }).promise();

    if (!result.Item) {
      return res.json({ children: [], goals: [] });
    }

    res.json({
      children: result.Item.children || [],
      goals: result.Item.goals || []
    });
  } catch (error) {
    console.error('Error getting user data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save user data
app.post('/api/user/data', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const { children, goals } = req.body;

    await dynamodb.put({
      TableName: TABLES.USER_DATA,
      Item: {
        email: email.toLowerCase(),
        children: children || [],
        goals: goals || [],
        updatedAt: Date.now()
      }
    }).promise();

    res.json({ message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error saving user data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync data (merge local and server data) - Fixed sync logic to return correct data
app.post('/api/user/sync', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const { localChildren, localGoals, lastSyncTime } = req.body;
    
    console.log(`Sync request from ${email}:`, {
      localChildrenCount: localChildren?.length || 0,
      localGoalsCount: localGoals?.length || 0,
      lastSyncTime: lastSyncTime
    });

    // Get server data
    const result = await dynamodb.get({
      TableName: TABLES.USER_DATA,
      Key: { email: email.toLowerCase() }
    }).promise();

    const serverData = result.Item || { children: [], goals: [] };
    const serverLastUpdate = serverData.updatedAt || 0;
    
    console.log(`Server data for ${email}:`, {
      serverChildrenCount: serverData.children?.length || 0,
      serverGoalsCount: serverData.goals?.length || 0,
      serverLastUpdate: serverLastUpdate
    });

    // If no lastSyncTime or local data is newer, use local data
    if (!lastSyncTime || lastSyncTime > serverLastUpdate) {
      console.log(`Using local data for ${email}: local sync time ${lastSyncTime}, server update ${serverLastUpdate}`);
      
      const newUpdateTime = Date.now();
      await dynamodb.put({
        TableName: TABLES.USER_DATA,
        Item: {
          email: email.toLowerCase(),
          children: localChildren || [],
          goals: localGoals || [],
          updatedAt: newUpdateTime
        }
      }).promise();

      const response = {
        children: localChildren || [],
        goals: localGoals || [],
        lastSyncTime: newUpdateTime
      };
      console.log(`Returning local data for ${email}:`, {
        childrenCount: response.children.length,
        goalsCount: response.goals.length,
        lastSyncTime: response.lastSyncTime
      });
      return res.json(response);
    }

    // Otherwise, return server data
    console.log(`Using server data for ${email}: local sync time ${lastSyncTime}, server update ${serverLastUpdate}`);
    const response = {
      children: serverData.children || [],
      goals: serverData.goals || [],
      lastSyncTime: serverLastUpdate
    };
    console.log(`Returning server data for ${email}:`, {
      childrenCount: response.children.length,
      goalsCount: response.goals.length,
      lastSyncTime: response.lastSyncTime
    });
    res.json(response);
  } catch (error) {
    console.error('Error syncing data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Goalaroo backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 