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
const swaggerUi = require('swagger-ui-express');
const specs = require('./swagger');
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
              connectSrc: ["'self'", "https://api.goalaroo.mcsoko.com"],
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

// Swagger documentation endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Goalaroo API Documentation'
}));

// Simple health check endpoint (bypasses CORS for ELB health checks)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'goalaroo-backend',
    version: '2.0.0'
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
  USER_DATA: 'goalaroo-user-data',
  GOAL_COMPLETIONS: 'goalaroo-goal-completions'
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

// Completion event utility functions
async function logGoalCompletion(email, goalId, childId, notes = null, completedBy = 'parent') {
  const completionEvent = {
    id: uuidv4(),
    email: email.toLowerCase(),
    goalId: goalId,
    childId: childId,
    completedAt: Date.now(),
    completedBy: completedBy,
    notes: notes,
    createdAt: Date.now()
  };
  
  await dynamodb.put({
    TableName: TABLES.GOAL_COMPLETIONS,
    Item: completionEvent
  }).promise();
  
  return completionEvent;
}

async function getGoalCompletions(email, goalId, fromTimestamp = null, toTimestamp = null) {
  const params = {
    TableName: TABLES.GOAL_COMPLETIONS,
    KeyConditionExpression: 'email = :email AND goalId = :goalId',
    ExpressionAttributeValues: {
      ':email': email.toLowerCase(),
      ':goalId': goalId
    }
  };
  
  if (fromTimestamp) {
    params.FilterExpression = 'completedAt >= :from';
    params.ExpressionAttributeValues[':from'] = fromTimestamp;
  }
  
  if (toTimestamp) {
    if (params.FilterExpression) {
      params.FilterExpression += ' AND completedAt <= :to';
    } else {
      params.FilterExpression = 'completedAt <= :to';
    }
    params.ExpressionAttributeValues[':to'] = toTimestamp;
  }
  
  const result = await dynamodb.query(params).promise();
  return result.Items || [];
}

function calculateStreak(completions, goalType) {
  if (!completions || completions.length === 0) return 0;
  
  const sorted = completions.sort((a, b) => b.completedAt - a.completedAt);
  let streak = 1; // Start with 1 for the most recent completion
  
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i-1].completedAt);
    const currDate = new Date(sorted[i].completedAt);
    const daysDiff = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));
    
    if (goalType === 'daily' && daysDiff <= 1) {
      streak++;
    } else if (goalType === 'weekly' && daysDiff <= 7) {
      streak++;
    } else {
      break; // Streak broken
    }
  }
  
  return streak;
}

function calculateLongestStreak(completions, goalType) {
  if (!completions || completions.length === 0) return 0;
  
  const sorted = completions.sort((a, b) => a.completedAt - b.completedAt);
  let currentStreak = 1;
  let longestStreak = 1;
  
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i-1].completedAt);
    const currDate = new Date(sorted[i].completedAt);
    const daysDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
    
    if (goalType === 'daily' && daysDiff <= 1) {
      currentStreak++;
    } else if (goalType === 'weekly' && daysDiff <= 7) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }
    
    longestStreak = Math.max(longestStreak, currentStreak);
  }
  
  return longestStreak;
}

async function getGoalStats(email, goalId, goalType) {
  const completions = await getGoalCompletions(email, goalId);
  const currentStreak = calculateStreak(completions, goalType);
  const longestStreak = calculateLongestStreak(completions, goalType);
  const iterationCount = completions.length;
  
  return {
    iterationCount,
    currentStreak,
    longestStreak,
    lastCompleted: completions.length > 0 ? Math.max(...completions.map(c => c.completedAt)) : null,
    completionHistory: completions.sort((a, b) => b.completedAt - a.completedAt)
  };
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

/**
 * @swagger
 * /api/auth/send-code:
 *   post:
 *     summary: Send magic code to user's email
 *     description: Sends a 6-digit magic code to the provided email address for authentication
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRequest'
 *     responses:
 *       200:
 *         description: Magic code sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Magic code sent successfully"
 *       400:
 *         description: Invalid email address
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    
    const code = generateMagicCode();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes
    
    // Store magic code
    await dynamodb.put({
      TableName: TABLES.MAGIC_CODES,
      Item: {
        email: email.toLowerCase(),
        code,
        expiresAt,
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

/**
 * @swagger
 * /api/auth/verify-code:
 *   post:
 *     summary: Verify magic code and authenticate user
 *     description: Verifies the 6-digit magic code and returns a JWT token for authentication
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyCodeRequest'
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid or expired code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }
    
    // Get stored code
    const result = await dynamodb.get({
      TableName: TABLES.MAGIC_CODES,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    if (!result.Item || result.Item.code !== code || result.Item.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }
    
    // Delete used code
    await dynamodb.delete({
      TableName: TABLES.MAGIC_CODES,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    // Generate JWT token
    const token = generateJWT(email);
    
    // Create or get user
    const userResult = await dynamodb.get({
      TableName: TABLES.USERS,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    if (!userResult.Item) {
      // Create new user
      await dynamodb.put({
        TableName: TABLES.USERS,
        Item: {
          email: email.toLowerCase(),
          createdAt: Date.now(),
          lastLogin: Date.now()
        }
      }).promise();
      
      // Initialize user data
      await dynamodb.put({
        TableName: TABLES.USER_DATA,
        Item: {
          email: email.toLowerCase(),
          children: [],
          goals: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      }).promise();
    } else {
      // Update last login
      await dynamodb.update({
        TableName: TABLES.USERS,
        Key: { email: email.toLowerCase() },
        UpdateExpression: 'SET lastLogin = :lastLogin',
        ExpressionAttributeValues: {
          ':lastLogin': Date.now()
        }
      }).promise();
    }
    
    res.json({
      token,
      user: { email: email.toLowerCase() }
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/children:
 *   get:
 *     summary: Get all children for the authenticated user
 *     description: Retrieves all children associated with the authenticated user
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of children retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Child'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/children', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    
    const result = await dynamodb.get({
      TableName: TABLES.USER_DATA,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    const children = result.Item?.children || [];
    res.json(children);
  } catch (error) {
    console.error('Error getting children:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/children:
 *   post:
 *     summary: Create a new child
 *     description: Creates a new child for the authenticated user
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, avatar, color]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Child's name
 *                 minLength: 1
 *                 maxLength: 50
 *               avatar:
 *                 type: string
 *                 description: Emoji or avatar representation
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *                 description: Hex color code for the child
 *     responses:
 *       201:
 *         description: Child created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Child'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/children', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const childData = req.body;
    
    // Validate required fields
    if (!childData.name || !childData.avatar || !childData.color) {
      return res.status(400).json({ error: 'Name, avatar, and color are required' });
    }
    
    // Generate unique ID
    const child = {
      id: uuidv4(),
      name: childData.name,
      avatar: childData.avatar,
      color: childData.color,
      createdAt: Date.now()
    };
    
    // Get current data
    const result = await dynamodb.get({
      TableName: TABLES.USER_DATA,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    const userData = result.Item || { children: [], goals: [] };
    userData.children.push(child);
    userData.updatedAt = Date.now();
    
    // Save to database
    await dynamodb.put({
      TableName: TABLES.USER_DATA,
      Item: {
        email: email.toLowerCase(),
        children: userData.children,
        goals: userData.goals,
        updatedAt: userData.updatedAt
      }
    }).promise();
    
    res.status(201).json(child);
  } catch (error) {
    console.error('Error creating child:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/children/{id}:
 *   put:
 *     summary: Update a child
 *     description: Updates an existing child's information
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Child ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Child's name
 *                 minLength: 1
 *                 maxLength: 50
 *               avatar:
 *                 type: string
 *                 description: Emoji or avatar representation
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *                 description: Hex color code for the child
 *     responses:
 *       200:
 *         description: Child updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Child'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Child not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.put('/api/children/:id', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const { id } = req.params;
    const updates = req.body;
    
    // Get current data
    const result = await dynamodb.get({
      TableName: TABLES.USER_DATA,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    const userData = result.Item || { children: [], goals: [] };
    const childIndex = userData.children.findIndex(c => c.id === id);
    
    if (childIndex === -1) {
      return res.status(404).json({ error: 'Child not found' });
    }
    
    // Update child
    userData.children[childIndex] = {
      ...userData.children[childIndex],
      ...updates,
      updatedAt: Date.now()
    };
    
    userData.updatedAt = Date.now();
    
    // Save to database
    await dynamodb.put({
      TableName: TABLES.USER_DATA,
      Item: {
        email: email.toLowerCase(),
        children: userData.children,
        goals: userData.goals,
        updatedAt: userData.updatedAt
      }
    }).promise();
    
    res.json(userData.children[childIndex]);
  } catch (error) {
    console.error('Error updating child:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/children/{id}:
 *   delete:
 *     summary: Delete a child
 *     description: Deletes a child and all associated goals
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Child ID
 *     responses:
 *       200:
 *         description: Child deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Child deleted successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete('/api/children/:id', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const { id } = req.params;
    
    // Get current data
    const result = await dynamodb.get({
      TableName: TABLES.USER_DATA,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    const userData = result.Item || { children: [], goals: [] };
    
    // Remove child
    userData.children = userData.children.filter(c => c.id !== id);
    
    // Remove associated goals
    userData.goals = userData.goals.filter(g => g.childId !== id);
    
    userData.updatedAt = Date.now();
    
    // Save to database
    await dynamodb.put({
      TableName: TABLES.USER_DATA,
      Item: {
        email: email.toLowerCase(),
        children: userData.children,
        goals: userData.goals,
        updatedAt: userData.updatedAt
      }
    }).promise();
    
    res.json({ message: 'Child deleted successfully' });
  } catch (error) {
    console.error('Error deleting child:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/goals:
 *   get:
 *     summary: Get all goals for the authenticated user
 *     description: Retrieves all goals associated with the authenticated user
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of goals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Goal'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/goals', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    
    const result = await dynamodb.get({
      TableName: TABLES.USER_DATA,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    const goals = result.Item?.goals || [];
    res.json(goals);
  } catch (error) {
    console.error('Error getting goals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/goals:
 *   post:
 *     summary: Create new goals
 *     description: Creates new goals for one or more children. Creates individual goals for each child in the childIds array.
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGoalRequest'
 *     responses:
 *       201:
 *         description: Goals created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Goal'
 *       400:
 *         description: Missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/goals', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const goalData = req.body;
    
    // Validate required fields
    if (!goalData.name || !goalData.type || !goalData.childIds || !Array.isArray(goalData.childIds)) {
      return res.status(400).json({ error: 'Name, type, and childIds array are required' });
    }
    
    // Get current data
    const result = await dynamodb.get({
      TableName: TABLES.USER_DATA,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    const userData = result.Item || { children: [], goals: [] };
    const createdGoals = [];
    
    // Create individual goals for each child
    const groupId = uuidv4();
    goalData.childIds.forEach(childId => {
      const goal = {
        id: uuidv4(),
        groupId: groupId,
        childId: childId,
        name: goalData.name,
        type: goalData.type,
        color: goalData.color || '#007AFF',
        status: 'active',
        startTime: Date.now(),
        createdAt: Date.now(),
        themeType: goalData.type,
        repeat: goalData.repeat || false,
        repeatSchedule: goalData.repeatSchedule || null,
        progress: 0,
        completedAt: null,
        iterationCount: 0,
        streak: 0,
        lastCompleted: null
      };
      
      // Add timer-specific properties
      if (goalData.type === 'timer') {
        goal.duration = goalData.duration;
        goal.unit = goalData.unit;
        goal.totalDuration = goalData.totalDuration;
        goal.themeType = 'timer';
      }
      
      // Add count-specific properties
      if (goalData.type === 'countdown' || goalData.type === 'countup' || goalData.type === 'daily' || goalData.type === 'weekly') {
        goal.target = goalData.target;
        goal.current = goalData.current || 0;
      }
      
      userData.goals.push(goal);
      createdGoals.push(goal);
    });
    
    userData.updatedAt = Date.now();
    
    // Save to database
    await dynamodb.put({
      TableName: TABLES.USER_DATA,
      Item: {
        email: email.toLowerCase(),
        children: userData.children,
        goals: userData.goals,
        updatedAt: userData.updatedAt
      }
    }).promise();
    
    res.status(201).json(createdGoals);
  } catch (error) {
    console.error('Error creating goals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/goals/{id}:
 *   put:
 *     summary: Update a goal
 *     description: Updates an existing goal's information
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Goal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Goal name
 *               type:
 *                 type: string
 *                 enum: [timer, countdown, countup]
 *                 description: Type of goal
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *                 description: Hex color code for the goal
 *               status:
 *                 type: string
 *                 enum: [active, paused, completed, waiting]
 *                 description: Current status of the goal
 *               progress:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Progress percentage
 *               current:
 *                 type: number
 *                 description: Current value for count goals
 *               completedAt:
 *                 type: integer
 *                 format: int64
 *                 nullable: true
 *                 description: Timestamp when goal was completed
 *     responses:
 *       200:
 *         description: Goal updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Goal'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Goal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.put('/api/goals/:id', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const { id } = req.params;
    const updates = req.body;
    
    // Get current data
    const result = await dynamodb.get({
      TableName: TABLES.USER_DATA,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    const userData = result.Item || { children: [], goals: [] };
    const goalIndex = userData.goals.findIndex(g => g.id === id);
    
    if (goalIndex === -1) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    // Update goal
    const prevGoal = userData.goals[goalIndex];
    const wasCompleted = prevGoal.status === 'completed';
    const willBeCompleted = updates.status === 'completed';
    let updatedGoal = {
      ...prevGoal,
      ...updates,
      updatedAt: Date.now()
    };

    // If goal is being completed now (and wasn't before), update streak/iteration
    if (!wasCompleted && willBeCompleted) {
      updatedGoal.iterationCount = (prevGoal.iterationCount || 0) + 1;
      updatedGoal.lastCompleted = Date.now();
      // Handle streaks for daily/weekly
      if (prevGoal.type === 'daily' || prevGoal.type === 'weekly') {
        const now = Date.now();
        const lastCompleted = prevGoal.lastCompleted || 0;
        let periodMs = 24 * 60 * 60 * 1000; // daily
        if (prevGoal.type === 'weekly') periodMs = 7 * 24 * 60 * 60 * 1000;
        // If last completed was in the previous period, increment streak
        if (lastCompleted > 0 && now - lastCompleted <= periodMs * 1.5) {
          updatedGoal.streak = (prevGoal.streak || 0) + 1;
        } else {
          updatedGoal.streak = 1;
        }
      }
    }
    userData.goals[goalIndex] = updatedGoal;
    
    userData.updatedAt = Date.now();
    
    // Save to database
    await dynamodb.put({
      TableName: TABLES.USER_DATA,
      Item: {
        email: email.toLowerCase(),
        children: userData.children,
        goals: userData.goals,
        updatedAt: userData.updatedAt
      }
    }).promise();
    
    res.json(userData.goals[goalIndex]);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/goals/{id}/complete:
 *   post:
 *     summary: Log a goal completion
 *     description: Logs a completion event for a goal and returns updated stats
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Goal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Optional notes about the completion
 *               completedBy:
 *                 type: string
 *                 enum: [parent, child, auto]
 *                 default: parent
 *                 description: Who completed the goal
 *     responses:
 *       200:
 *         description: Goal completion logged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 completionEvent:
 *                   $ref: '#/components/schemas/GoalCompletion'
 *                 stats:
 *                   $ref: '#/components/schemas/GoalStats'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Goal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/goals/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const { id } = req.params;
    const { notes, completedBy = 'parent' } = req.body;
    
    // Get current data to verify goal exists and get its type
    const result = await dynamodb.get({
      TableName: TABLES.USER_DATA,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    const userData = result.Item || { children: [], goals: [] };
    const goal = userData.goals.find(g => g.id === id);
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    // Log the completion event
    const completionEvent = await logGoalCompletion(email, id, goal.childId, notes, completedBy);
    
    // Get updated stats
    const stats = await getGoalStats(email, id, goal.type);
    
    res.json({
      completionEvent,
      stats
    });
  } catch (error) {
    console.error('Error logging goal completion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/goals/{id}/completions:
 *   get:
 *     summary: Get goal completion history
 *     description: Retrieves all completion events for a specific goal
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Goal ID
 *       - in: query
 *         name: from
 *         schema:
 *           type: integer
 *           format: int64
 *         description: Filter completions from this timestamp
 *       - in: query
 *         name: to
 *         schema:
 *           type: integer
 *           format: int64
 *         description: Filter completions to this timestamp
 *     responses:
 *       200:
 *         description: Completion history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GoalCompletion'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Goal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/goals/:id/completions', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const { id } = req.params;
    const { from, to } = req.query;
    
    // Verify goal exists
    const result = await dynamodb.get({
      TableName: TABLES.USER_DATA,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    const userData = result.Item || { children: [], goals: [] };
    const goal = userData.goals.find(g => g.id === id);
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    // Get completion history
    const completions = await getGoalCompletions(
      email, 
      id, 
      from ? parseInt(from) : null, 
      to ? parseInt(to) : null
    );
    
    res.json(completions);
  } catch (error) {
    console.error('Error getting goal completions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/goals/{id}/stats:
 *   get:
 *     summary: Get goal statistics
 *     description: Retrieves calculated statistics for a goal including iteration count, streaks, and completion history
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Goal ID
 *     responses:
 *       200:
 *         description: Goal statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GoalStats'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Goal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/goals/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const { id } = req.params;
    
    // Verify goal exists and get its type
    const result = await dynamodb.get({
      TableName: TABLES.USER_DATA,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    const userData = result.Item || { children: [], goals: [] };
    const goal = userData.goals.find(g => g.id === id);
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    // Get calculated stats
    const stats = await getGoalStats(email, id, goal.type);
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting goal stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/goals/{id}/reset:
 *   post:
 *     summary: Reset a goal
 *     description: Resets a goal by clearing all completion events and resetting progress
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Goal ID
 *     responses:
 *       200:
 *         description: Goal reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Goal reset successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Goal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/goals/:id/reset', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const { id } = req.params;
    
    // Get current data to verify goal exists
    const result = await dynamodb.get({
      TableName: TABLES.USER_DATA,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    const userData = result.Item || { children: [], goals: [] };
    const goal = userData.goals.find(g => g.id === id);
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    // Delete all completion events for this goal
    const completions = await getGoalCompletions(email, id);
    
    // Delete each completion event
    for (const completion of completions) {
      await dynamodb.delete({
        TableName: TABLES.GOAL_COMPLETIONS,
        Key: {
          email: email.toLowerCase(),
          goalId: id
        },
        ConditionExpression: 'id = :completionId',
        ExpressionAttributeValues: {
          ':completionId': completion.id
        }
      }).promise();
    }
    
    // Reset goal progress
    goal.current = 0;
    goal.progress = 0;
    goal.status = 'active';
    goal.updatedAt = Date.now();
    
    // Save updated goal
    await dynamodb.put({
      TableName: TABLES.USER_DATA,
      Item: {
        email: email.toLowerCase(),
        children: userData.children,
        goals: userData.goals,
        updatedAt: userData.updatedAt
      }
    }).promise();
    
    res.json({ 
      message: 'Goal reset successfully',
      deletedCompletions: completions.length
    });
  } catch (error) {
    console.error('Error resetting goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/goals/{id}:
 *   delete:
 *     summary: Delete a goal
 *     description: Deletes a goal. If the goal has a groupId, all goals in the group will be deleted.
 *     tags: [Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Goal ID
 *     responses:
 *       200:
 *         description: Goal deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Goal deleted successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Goal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete('/api/goals/:id', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    const { id } = req.params;
    
    // Get current data
    const result = await dynamodb.get({
      TableName: TABLES.USER_DATA,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    const userData = result.Item || { children: [], goals: [] };
    
    // Find the goal to get its groupId
    const goalToDelete = userData.goals.find(g => g.id === id);
    
    if (!goalToDelete) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    // Remove goal(s) - if it has a groupId, remove all goals in the group
    if (goalToDelete.groupId) {
      userData.goals = userData.goals.filter(g => g.groupId !== goalToDelete.groupId);
    } else {
      userData.goals = userData.goals.filter(g => g.id !== id);
    }
    
    userData.updatedAt = Date.now();
    
    // Save to database
    await dynamodb.put({
      TableName: TABLES.USER_DATA,
      Item: {
        email: email.toLowerCase(),
        children: userData.children,
        goals: userData.goals,
        updatedAt: userData.updatedAt
      }
    }).promise();
    
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/user/data:
 *   get:
 *     summary: Get all user data
 *     description: Retrieves all children and goals for the authenticated user (backward compatibility endpoint)
 *     tags: [User Data]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserData'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/user/data', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user;
    
    const result = await dynamodb.get({
      TableName: TABLES.USER_DATA,
      Key: { email: email.toLowerCase() }
    }).promise();
    
    const userData = result.Item || { children: [], goals: [] };
    
    res.json({
      children: userData.children || [],
      goals: userData.goals || []
    });
  } catch (error) {
    console.error('Error getting user data:', error);
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
  console.log(`Version: 2.0.0 - Clean CRUD API`);
});