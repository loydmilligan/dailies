// Swagger/OpenAPI Configuration
// Comprehensive API documentation for Dailies Backend

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Dailies Content Curator API',
    version: '1.0.0',
    description: `
      The Dailies Content Curator API provides secure endpoints for content capture, 
      processing, and retrieval with AI-powered analysis. This API serves both the 
      browser extension and web dashboard for intelligent content curation.
      
      ## Features
      - 🔐 JWT-based authentication
      - 📝 Content capture and processing  
      - 🏷️ Automated content categorization
      - 📊 Daily digest generation
      - 🔍 Full-text search capabilities
      - ⚡ Rate limiting and security
      
      ## Authentication
      Most endpoints require a valid JWT token in the Authorization header:
      \`Authorization: Bearer <your-jwt-token>\`
      
      ## Rate Limits
      - General API: 100 requests per 15 minutes
      - Content submission: 10 requests per minute
      - Authentication: 5 attempts per 15 minutes
    `,
    contact: {
      name: 'Dailies API Support',
      email: 'support@dailies.app'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.dailies.app',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for API authentication'
      }
    },
    schemas: {
      // Error response schema
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error type'
          },
          message: {
            type: 'string',
            description: 'Human-readable error message'
          },
          statusCode: {
            type: 'integer',
            description: 'HTTP status code'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Error timestamp'
          },
          requestId: {
            type: 'string',
            description: 'Unique request identifier'
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
                value: { type: 'string' }
              }
            },
            description: 'Validation error details'
          }
        },
        required: ['error', 'message', 'statusCode', 'timestamp']
      },
      
      // Content schemas
      ContentItem: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Unique content identifier'
          },
          url: {
            type: 'string',
            format: 'uri',
            description: 'Original content URL'
          },
          title: {
            type: 'string',
            description: 'Content title'
          },
          source_domain: {
            type: 'string',
            description: 'Source domain'
          },
          content_type: {
            type: 'string',
            enum: ['article', 'video', 'post', 'other'],
            description: 'Type of content'
          },
          category: {
            type: 'string',
            description: 'Content category (dynamic based on classification system)'
          },
          primary_category_id: {
            type: 'integer',
            description: 'Primary category ID from categories table'
          },
          ai_raw_category: {
            type: 'string',
            description: 'Raw category returned by AI before resolution'
          },
          raw_content: {
            type: 'string',
            description: 'Extracted text content'
          },
          metadata: {
            type: 'object',
            description: 'Additional content metadata'
          },
          content_hash: {
            type: 'string',
            description: 'SHA-256 hash of content'
          },
          processing_status: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed', 'needs_review', 'partial_processing'],
            description: 'Processing status'
          },
          ai_confidence_score: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'AI classification confidence score'
          },
          captured_at: {
            type: 'string',
            format: 'date-time',
            description: 'Content capture timestamp'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Database record creation timestamp'
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Content tags'
          },
          notes: {
            type: 'string',
            description: 'Manual notes'
          }
        },
        required: ['id', 'url', 'title', 'source_domain', 'content_type', 'category']
      },
      
      ContentCaptureRequest: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            description: 'Content URL'
          },
          title: {
            type: 'string',
            description: 'Content title'
          },
          domain: {
            type: 'string',
            description: 'Source domain'
          },
          contentType: {
            type: 'string',
            enum: ['article', 'video', 'post', 'other'],
            description: 'Content type'
          },
          metadata: {
            type: 'object',
            description: 'Additional metadata'
          },
          content: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              extractionMethod: { type: 'string' },
              readingTime: { type: 'integer' },
              length: { type: 'integer' }
            },
            description: 'Extracted content data'
          },
          contentHash: {
            type: 'string',
            description: 'Content hash for deduplication'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Capture timestamp'
          }
        },
        required: ['url', 'title', 'domain']
      },
      
      ContentUpdateRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          category: {
            type: 'string',
            description: 'Content category (must match available categories in system)'
          },
          primary_category_id: {
            type: 'integer',
            description: 'Primary category ID from categories table'
          },
          content_type: {
            type: 'string',
            enum: ['article', 'video', 'post', 'other']
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 20
          },
          metadata: { type: 'object' },
          manual_classification: { type: 'boolean' },
          notes: {
            type: 'string',
            maxLength: 5000
          }
        }
      },
      
      // User schemas
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: {
            type: 'string',
            enum: ['user', 'admin']
          },
          preferences: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          lastLogin: { type: 'string', format: 'date-time' }
        }
      },
      
      LoginRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          password: {
            type: 'string',
            description: 'User password'
          }
        },
        required: ['email', 'password']
      },
      
      RegisterRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          password: {
            type: 'string',
            minLength: 8,
            description: 'Password (min 8 chars with uppercase, lowercase, number, special char)'
          },
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 50,
            description: 'User full name'
          }
        },
        required: ['email', 'password', 'name']
      },
      
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              token: {
                type: 'string',
                description: 'JWT access token'
              }
            }
          }
        }
      },
      
      // Digest schemas
      DailyDigest: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          digest_date: { type: 'string', format: 'date' },
          title: { type: 'string' },
          summary: { type: 'string' },
          content_markdown: { type: 'string' },
          content_count: { type: 'integer' },
          topics: {
            type: 'array',
            items: { type: 'object' }
          },
          statistics: { type: 'object' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      
      // Pagination schema
      PaginationMeta: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            description: 'Current page number'
          },
          limit: {
            type: 'integer',
            description: 'Items per page'
          },
          total: {
            type: 'integer',
            description: 'Total number of items'
          },
          pages: {
            type: 'integer',
            description: 'Total number of pages'
          }
        }
      },
      
      // Standard response wrappers
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            description: 'Success message'
          },
          data: {
            description: 'Response data'
          }
        }
      },
      
      HealthResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'unhealthy']
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          },
          services: {
            type: 'object',
            properties: {
              database: { type: 'string' },
              server: { type: 'string' }
            }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

// Options for swagger-jsdoc
const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    './src/server.js',
    './src/routes/*.js',
    './src/middleware/*.js'
  ]
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger setup function
const setupSwagger = (app) => {
  // Serve swagger docs
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #2563eb; }
    `,
    customSiteTitle: 'Dailies API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true
    }
  }));
  
  // Serve swagger spec as JSON
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log('📚 API Documentation available at /api/docs');
  console.log('📄 OpenAPI spec available at /api/docs.json');
};

module.exports = { setupSwagger, swaggerSpec };