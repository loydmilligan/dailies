# Database Service API Documentation

## Overview

The DatabaseService class provides a comprehensive TypeScript interface for all database operations in the Dailies content curation system. Built on Prisma ORM, it handles content management, political analysis, search functionality, and transaction support with full type safety.

## Connection Management

### connect()
Establishes database connection and initializes Prisma client.

```javascript
await databaseService.connect();
```

**Returns**: `Promise<void>`

**Usage**:
```javascript
const databaseService = require('./database');
await databaseService.connect();
console.log('Database connected successfully');
```

### disconnect()
Closes database connection and cleans up resources.

```javascript
await databaseService.disconnect();
```

**Returns**: `Promise<void>`

**Best Practice**: Always call in `finally` blocks to ensure cleanup.

### healthCheck()
Verifies database connectivity and returns status information.

```javascript
const health = await databaseService.healthCheck();
```

**Returns**: 
```typescript
{
  status: 'healthy' | 'error',
  timestamp: Date,
  details?: string
}
```

**Example**:
```javascript
const health = await databaseService.healthCheck();
if (health.status === 'healthy') {
  console.log('Database is operational');
}
```

## Content Operations

### createContentItem(data)
Creates a new content item with automatic timestamp assignment.

**Parameters**:
```typescript
{
  url: string;                    // Required: Content URL
  title: string;                  // Required: Content title
  content_type?: 'article' | 'video' | 'post' | 'other'; // Default: 'article'
  category?: 'US_Politics_News' | 'General';
  source_domain: string;          // Required: Domain (e.g., 'cnn.com')
  raw_content?: string;           // Full text/transcript
  content_hash?: string;          // SHA-256 for deduplication
  metadata?: object;              // JSONB metadata
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'manual_review';
  ai_confidence_score?: number;   // 0.0 - 1.0
  manual_override?: boolean;
}
```

**Returns**: `Promise<ContentItem>`

**Example**:
```javascript
const content = await databaseService.createContentItem({
  url: 'https://example.com/article',
  title: 'Breaking News: Political Development',
  source_domain: 'example.com',
  category: 'US_Politics_News',
  content_type: 'article',
  raw_content: 'Full article text...',
  metadata: {
    author: 'John Reporter',
    publishDate: '2024-01-15T10:30:00Z',
    wordCount: 850,
    tags: ['politics', 'congress']
  }
});

console.log(`Created content item with ID: ${content.id}`);
```

### getContentItems(options)
Retrieves content items with flexible filtering and pagination.

**Parameters**:
```typescript
{
  skip?: number;                  // Pagination offset
  take?: number;                  // Result limit
  where?: {                       // Filtering options
    category?: string;
    processing_status?: string;
    source_domain?: string;
    captured_at?: {
      gte?: Date;
      lte?: Date;
    };
  };
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  include?: {
    political_analysis?: boolean;
    processing_logs?: boolean;
  };
}
```

**Returns**: `Promise<ContentItem[]>`

**Examples**:
```javascript
// Get recent political content
const politicalContent = await databaseService.getContentItems({
  where: {
    category: 'US_Politics_News',
    captured_at: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    }
  },
  include: { political_analysis: true },
  orderBy: { field: 'captured_at', direction: 'desc' },
  take: 50
});

// Get paginated results
const page2 = await databaseService.getContentItems({
  skip: 20,
  take: 20,
  orderBy: { field: 'created_at', direction: 'desc' }
});
```

### getContentItemById(id)
Retrieves a single content item by ID with optional related data.

**Parameters**: `id: number`

**Returns**: `Promise<ContentItem | null>`

**Example**:
```javascript
const content = await databaseService.getContentItemById(123);
if (content) {
  console.log(`Found: ${content.title}`);
} else {
  console.log('Content not found');
}
```

### updateContentItem(id, data)
Updates an existing content item with automatic timestamp handling.

**Parameters**:
- `id: number` - Content item ID
- `data: Partial<ContentItem>` - Fields to update

**Returns**: `Promise<ContentItem>`

**Example**:
```javascript
const updated = await databaseService.updateContentItem(123, {
  processing_status: 'completed',
  processed_at: new Date(),
  ai_confidence_score: 0.92
});

console.log(`Updated status: ${updated.processing_status}`);
```

### deleteContentItem(id)
Permanently deletes a content item and all related analysis data.

**Parameters**: `id: number`

**Returns**: `Promise<ContentItem>`

**Note**: Cascade deletion automatically removes related political_analysis and processing_logs records.

## Political Analysis Operations

### createPoliticalAnalysis(data)
Creates political analysis for a content item.

**Parameters**:
```typescript
{
  content_id: number;             // Required: Parent content ID
  bias_score?: number;            // -1.0 to 1.0 (left to right)
  bias_confidence?: number;       // 0.0 to 1.0
  bias_label?: 'left' | 'center' | 'right';
  quality_score?: number;         // 1 to 10
  credibility_score?: number;     // 1.0 to 10.0
  loaded_language?: Array<{       // Biased/emotional phrases
    phrase: string;
    sentiment: string;
    position: number;
    intensity?: number;
  }>;
  implications?: string;          // Political implications analysis
  summary_executive?: string;     // 50-100 word summary
  summary_detailed?: string;      // 200-300 word detailed analysis
  key_points?: string[];          // Array of main takeaways
  processing_model?: string;      // AI model identifier
}
```

**Returns**: `Promise<PoliticalAnalysis>`

**Example**:
```javascript
const analysis = await databaseService.createPoliticalAnalysis({
  content_id: 123,
  bias_score: -0.3,
  bias_confidence: 0.85,
  bias_label: 'left',
  quality_score: 8,
  credibility_score: 7.5,
  loaded_language: [
    {
      phrase: 'shocking revelation',
      sentiment: 'dramatic',
      position: 156,
      intensity: 7
    }
  ],
  summary_executive: 'Congressional hearing reveals new evidence of policy implications affecting healthcare legislation.',
  key_points: [
    'New healthcare provisions introduced',
    'Bipartisan support uncertain',
    'Implementation timeline unclear'
  ],
  processing_model: 'gemini-1.5-pro'
});
```

### getPoliticalAnalysisByContentId(contentId)
Retrieves political analysis for a specific content item.

**Parameters**: `contentId: number`

**Returns**: `Promise<PoliticalAnalysis | null>`

## Search Operations

### searchContent(query, options)
Performs full-text search across content titles and text.

**Parameters**:
```typescript
{
  query: string;                  // Search query
  options?: {
    limit?: number;               // Result limit (default: 50)
    category?: string;            // Filter by category
    source_domain?: string;       // Filter by domain
    include_analysis?: boolean;   // Include political analysis
  }
}
```

**Returns**: `Promise<ContentItem[]>`

**Examples**:
```javascript
// Basic search
const results = await databaseService.searchContent('healthcare policy', {
  limit: 25,
  category: 'US_Politics_News'
});

// Advanced search with analysis
const detailed = await databaseService.searchContent('election reform', {
  limit: 10,
  include_analysis: true
});

// Domain-specific search
const cnnArticles = await databaseService.searchContent('congress', {
  source_domain: 'cnn.com',
  limit: 20
});
```

### getContentForDigest(date)
Retrieves content for daily digest generation.

**Parameters**: `date: Date` - Target date for digest

**Returns**: `Promise<ContentItem[]>` - Content items with political analysis included

**Example**:
```javascript
const today = new Date();
const digestContent = await databaseService.getContentForDigest(today);

console.log(`Found ${digestContent.length} items for today's digest`);
```

## User Settings Operations

### getUserSettings()
Retrieves current user settings (single-user system).

**Returns**: `Promise<UserSettings | null>`

**Example**:
```javascript
const settings = await databaseService.getUserSettings();
if (settings) {
  console.log(`Email enabled: ${settings.email_enabled}`);
  console.log(`Preferred model: ${settings.ai_model_preference}`);
}
```

### updateUserSettings(data)
Updates user preferences and delivery settings.

**Parameters**:
```typescript
{
  email_enabled?: boolean;
  tts_enabled?: boolean;
  ai_model_preference?: string;
  content_filters?: {
    excludeDomains?: string[];
    minQualityScore?: number;
    biasRange?: {
      min: number;
      max: number;
    };
    categories?: string[];
  };
}
```

**Returns**: `Promise<UserSettings>`

**Example**:
```javascript
const updated = await databaseService.updateUserSettings({
  email_enabled: true,
  tts_enabled: false,
  ai_model_preference: 'claude-3-sonnet',
  content_filters: {
    excludeDomains: ['spam-site.com'],
    minQualityScore: 6,
    biasRange: { min: -0.5, max: 0.5 },
    categories: ['US_Politics_News']
  }
});
```

## Processing Logs Operations

### createProcessingLog(data)
Creates a log entry for AI processing operations.

**Parameters**:
```typescript
{
  content_id?: number;            // Optional: Related content ID
  operation: string;              // Operation type: 'classify', 'analyze', 'summarize'
  status: string;                 // Result: 'success', 'error', 'timeout'
  model_used?: string;            // AI model identifier
  processing_time_ms?: number;    // Processing duration
  error_message?: string;         // Error details if status = 'error'
}
```

**Returns**: `Promise<ProcessingLog>`

**Example**:
```javascript
const log = await databaseService.createProcessingLog({
  content_id: 123,
  operation: 'political_analysis',
  status: 'success',
  model_used: 'gemini-1.5-pro',
  processing_time_ms: 1250
});

// Error logging
const errorLog = await databaseService.createProcessingLog({
  content_id: 456,
  operation: 'classify',
  status: 'error',
  model_used: 'claude-3-sonnet',
  processing_time_ms: 5000,
  error_message: 'API rate limit exceeded'
});
```

## Transaction Support

### transaction(operations)
Executes multiple operations in a single database transaction.

**Parameters**: `operations: Promise[]` - Array of Prisma operations

**Returns**: `Promise<any[]>` - Results of all operations

**Example**:
```javascript
// Create content and analysis atomically
const [content, analysis] = await databaseService.transaction([
  databaseService.prisma.content_items.create({
    data: {
      url: 'https://example.com/news',
      title: 'Breaking News',
      source_domain: 'example.com'
    }
  }),
  // Note: This would need the content ID, so a different pattern is used
]);

// Better pattern for dependent operations:
await databaseService.prisma.$transaction(async (prisma) => {
  const content = await prisma.content_items.create({
    data: {
      url: 'https://example.com/news',
      title: 'Breaking News',
      source_domain: 'example.com'
    }
  });
  
  const analysis = await prisma.political_analysis.create({
    data: {
      content_id: content.id,
      bias_score: 0.2,
      quality_score: 8
    }
  });
  
  return { content, analysis };
});
```

## Error Handling

### Common Error Types

#### Prisma Validation Errors
```javascript
try {
  await databaseService.createContentItem(invalidData);
} catch (error) {
  if (error.code === 'P2002') {
    console.log('Unique constraint violation (duplicate content_hash)');
  } else if (error.code === 'P2003') {
    console.log('Foreign key constraint violation');
  }
}
```

#### Custom Validation
```javascript
try {
  await databaseService.createPoliticalAnalysis({
    content_id: 999, // Non-existent content
    bias_score: 2.0  // Invalid range
  });
} catch (error) {
  console.log('Validation error:', error.message);
}
```

### Best Practices

#### Connection Management
```javascript
const databaseService = require('./database');

async function processContent() {
  try {
    await databaseService.connect();
    
    // Database operations here
    const content = await databaseService.createContentItem(data);
    
  } catch (error) {
    console.error('Processing failed:', error);
  } finally {
    await databaseService.disconnect();
  }
}
```

#### Batch Operations
```javascript
// Efficient batch creation
const contentPromises = contentArray.map(data => 
  databaseService.createContentItem(data)
);
const results = await Promise.all(contentPromises);

// Transaction for related operations
await databaseService.prisma.$transaction(async (prisma) => {
  const content = await prisma.content_items.create({ data: contentData });
  const analysis = await prisma.political_analysis.create({ 
    data: { ...analysisData, content_id: content.id }
  });
  const log = await prisma.processing_logs.create({
    data: { content_id: content.id, operation: 'analyze', status: 'success' }
  });
});
```

#### Pagination Pattern
```javascript
async function getAllContent() {
  const pageSize = 100;
  let skip = 0;
  let allContent = [];
  
  while (true) {
    const batch = await databaseService.getContentItems({
      skip,
      take: pageSize,
      orderBy: { field: 'id', direction: 'asc' }
    });
    
    if (batch.length === 0) break;
    
    allContent.push(...batch);
    skip += pageSize;
  }
  
  return allContent;
}
```

## Performance Considerations

### Query Optimization
- Use `include` sparingly - only fetch related data when needed
- Implement pagination for large result sets
- Use specific field selection with Prisma's `select` option
- Leverage database indexes by filtering on indexed columns

### Connection Pooling
- Prisma automatically manages connection pooling
- Default pool size: 5 connections
- Adjust via `DATABASE_URL` connection string parameters

### Caching Strategy
- Cache frequently accessed user settings
- Use Redis for search result caching
- Implement application-level caching for digest data

## Type Definitions

```typescript
interface ContentItem {
  id: number;
  url: string;
  title: string;
  content_type: 'article' | 'video' | 'post' | 'other';
  category?: 'US_Politics_News' | 'General';
  captured_at: Date;
  processed_at?: Date;
  source_domain: string;
  raw_content?: string;
  content_hash?: string;
  metadata: object;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'manual_review';
  ai_confidence_score?: number;
  manual_override: boolean;
  created_at: Date;
  updated_at: Date;
  political_analysis?: PoliticalAnalysis;
}

interface PoliticalAnalysis {
  id: number;
  content_id: number;
  bias_score?: number;
  bias_confidence?: number;
  bias_label?: 'left' | 'center' | 'right';
  quality_score?: number;
  credibility_score?: number;
  loaded_language: Array<{
    phrase: string;
    sentiment: string;
    position: number;
    intensity?: number;
  }>;
  implications?: string;
  summary_executive?: string;
  summary_detailed?: string;
  key_points: string[];
  processing_model?: string;
  created_at: Date;
  updated_at: Date;
}

interface UserSettings {
  id: number;
  email_enabled: boolean;
  tts_enabled: boolean;
  ai_model_preference: string;
  content_filters: object;
  created_at: Date;
  updated_at: Date;
}

interface ProcessingLog {
  id: number;
  content_id?: number;
  operation: string;
  status: string;
  model_used?: string;
  processing_time_ms?: number;
  error_message?: string;
  created_at: Date;
}
```