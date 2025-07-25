const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Goalaroo API',
      version: '2.0.0',
      description: 'A comprehensive API for the Goalaroo child goal tracking application. This API provides endpoints for user authentication, child management, and goal tracking with support for various goal types including timers, countdown, and countup goals.',
      contact: {
        name: 'Goalaroo Support',
        email: 'support@goalaroo.mcsoko.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://api.goalaroo.mcsoko.com',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/verify-code endpoint'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        },
        AuthRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            }
          }
        },
        VerifyCodeRequest: {
          type: 'object',
          required: ['email', 'code'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            code: {
              type: 'string',
              pattern: '^[0-9]{6}$',
              description: '6-digit magic code sent to email'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT token for authentication'
            },
            user: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email'
                }
              }
            }
          }
        },
        Child: {
          type: 'object',
          required: ['name', 'avatar', 'color'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the child'
            },
            name: {
              type: 'string',
              description: 'Child\'s name',
              minLength: 1,
              maxLength: 50
            },
            avatar: {
              type: 'string',
              description: 'Emoji or avatar representation'
            },
            color: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
              description: 'Hex color code for the child'
            },
            createdAt: {
              type: 'integer',
              format: 'int64',
              description: 'Timestamp when child was created'
            },
            updatedAt: {
              type: 'integer',
              format: 'int64',
              description: 'Timestamp when child was last updated'
            }
          }
        },
        Goal: {
          type: 'object',
          required: ['name', 'type', 'childIds'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the goal'
            },
            groupId: {
              type: 'string',
              format: 'uuid',
              description: 'Group identifier for related goals'
            },
            childId: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the child this goal belongs to'
            },
            name: {
              type: 'string',
              description: 'Goal name',
              minLength: 1,
              maxLength: 100
            },
            type: {
              type: 'string',
              enum: ['daily', 'weekly', 'timer', 'countdown', 'countup'],
              description: 'Type of goal'
            },
            color: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
              description: 'Hex color code for the goal'
            },
            status: {
              type: 'string',
              enum: ['active', 'paused', 'completed', 'waiting'],
              description: 'Current status of the goal'
            },
            startTime: {
              type: 'integer',
              format: 'int64',
              description: 'Timestamp when goal started'
            },
            createdAt: {
              type: 'integer',
              format: 'int64',
              description: 'Timestamp when goal was created'
            },
            themeType: {
              type: 'string',
              description: 'Theme type for the goal'
            },
            repeat: {
              type: 'boolean',
              description: 'Whether the goal repeats'
            },
            repeatSchedule: {
              type: 'object',
              nullable: true,
              description: 'Schedule for repeating goals'
            },
            progress: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Progress percentage (0-100)'
            },
            completedAt: {
              type: 'integer',
              format: 'int64',
              nullable: true,
              description: 'Timestamp when goal was completed'
            },
            // Timer-specific properties
            duration: {
              type: 'number',
              description: 'Duration for timer goals'
            },
            unit: {
              type: 'string',
              enum: ['seconds', 'minutes', 'hours', 'days'],
              description: 'Time unit for timer goals'
            },
            timerType: {
              type: 'string',
              enum: ['countdown', 'countup'],
              description: 'Type of timer'
            },
            totalDuration: {
              type: 'number',
              description: 'Total duration in milliseconds'
            },
            // Count-specific properties
            target: {
              type: 'number',
              description: 'Target value for count goals'
            },
            current: {
              type: 'number',
              description: 'Current value for count goals'
            },
            updatedAt: {
              type: 'integer',
              format: 'int64',
              description: 'Timestamp when goal was last updated'
            },
            iterationCount: {
              type: 'number',
              description: 'Number of times this goal has been completed (for streaks, etc.)'
            },
            streak: {
              type: 'number',
              description: 'Current streak of successful completions'
            },
            lastCompleted: {
              type: 'integer',
              format: 'int64',
              description: 'Timestamp when goal was last completed (for streaks)'
            }
          }
        },
        GoalCompletion: {
          type: 'object',
          required: ['id', 'email', 'goalId', 'childId', 'completedAt', 'completedBy'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the completion event'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            goalId: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the goal that was completed'
            },
            childId: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the child who completed the goal'
            },
            completedAt: {
              type: 'integer',
              format: 'int64',
              description: 'Timestamp when the goal was completed'
            },
            completedBy: {
              type: 'string',
              enum: ['parent', 'child', 'auto'],
              description: 'Who completed the goal'
            },
            notes: {
              type: 'string',
              nullable: true,
              description: 'Optional notes about the completion'
            },
            createdAt: {
              type: 'integer',
              format: 'int64',
              description: 'Timestamp when the completion event was created'
            }
          }
        },
        GoalStats: {
          type: 'object',
          properties: {
            iterationCount: {
              type: 'number',
              description: 'Total number of times this goal has been completed'
            },
            currentStreak: {
              type: 'number',
              description: 'Current streak of consecutive completions'
            },
            longestStreak: {
              type: 'number',
              description: 'Longest streak of consecutive completions ever achieved'
            },
            lastCompleted: {
              type: 'integer',
              format: 'int64',
              nullable: true,
              description: 'Timestamp of the most recent completion'
            },
            completionHistory: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/GoalCompletion'
              },
              description: 'List of all completion events, sorted by most recent first'
            }
          }
        },
        CreateGoalRequest: {
          type: 'object',
          required: ['name', 'type', 'childIds'],
          properties: {
            name: {
              type: 'string',
              description: 'Goal name'
            },
            type: {
              type: 'string',
              enum: ['daily', 'weekly', 'timer', 'countdown', 'countup'],
              description: 'Type of goal'
            },
            childIds: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid'
              },
              description: 'Array of child IDs to create goals for'
            },
            color: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
              description: 'Hex color code'
            },
            repeat: {
              type: 'boolean',
              description: 'Whether the goal repeats'
            },
            repeatSchedule: {
              type: 'object',
              nullable: true,
              description: 'Schedule for repeating goals'
            },
            // Timer-specific properties
            duration: {
              type: 'number',
              description: 'Duration for timer goals'
            },
            unit: {
              type: 'string',
              enum: ['seconds', 'minutes', 'hours', 'days'],
              description: 'Time unit for timer goals'
            },
            timerType: {
              type: 'string',
              enum: ['countdown', 'countup'],
              description: 'Type of timer'
            },
            totalDuration: {
              type: 'number',
              description: 'Total duration in milliseconds'
            },
            // Count-specific properties
            target: {
              type: 'number',
              description: 'Target value for count goals'
            },
            current: {
              type: 'number',
              description: 'Current value for count goals'
            }
          }
        },
        UserData: {
          type: 'object',
          properties: {
            children: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Child'
              }
            },
            goals: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Goal'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints'
      },
      {
        name: 'Children',
        description: 'Child management endpoints'
      },
      {
        name: 'Goals',
        description: 'Goal management endpoints'
      },
      {
        name: 'User Data',
        description: 'User data management endpoints'
      }
    ]
  },
  apis: ['./server.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs; 