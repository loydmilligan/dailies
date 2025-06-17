# Technical Architecture - Dailies Content Curation System

## System Overview

Dailies follows a microservices-inspired architecture designed for scalability, maintainability, and self-hosted deployment. The system processes content through distinct stages: capture, classification, analysis, synthesis, and delivery.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Browser         │    │ Web Interface   │    │ Email Client    │
│ Extension       │    │ Dashboard       │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────────────┘
          │                      │                      ▲
          │ HTTP/REST            │ HTTP/REST            │ SMTP
          ▼                      ▼                      │
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                             │
│                      (FastAPI/Flask)                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Content   │ │ Processing  │ │   Digest    │
│  Capture    │ │   Engine    │ │ Generator   │
│  Service    │ │             │ │             │
└─────┬───────┘ └─────┬───────┘ └─────┬───────┘
      │               │               │
      ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Message Queue                                 │
│                  (Redis/Celery)                                 │
└─────────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Content   │ │  Political  │ │   Daily     │               │
│  │   Items     │ │  Analysis   │ │  Digests    │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 External Services                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  Gemini AI  │ │    SMTP     │ │   TTS API   │               │
│  │     API     │ │   Server    │ │             │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. API Gateway
**Technology**: FastAPI (Python) or Express.js (Node.js)
**Responsibilities**:
- Request routing and authentication
- Rate limiting and request validation
- CORS handling for browser extension
- Health checks and monitoring endpoints

**Key Endpoints**:
```
POST /api/content/capture      # Capture new content
GET  /api/content              # List captured content
POST /api/content/classify     # Manually classify content
GET  /api/digests              # Retrieve generated digests
POST /api/settings             # Update user preferences
```

### 2. Content Capture Service
**Technology**: Python with BeautifulSoup/Scrapy
**Responsibilities**:
- Web page content extraction
- YouTube transcript retrieval
- Metadata normalization
- Content deduplication

**Processing Pipeline**:
```python
def capture_content(url, content_type):
    # 1. Validate URL and determine content type
    # 2. Extract raw content and metadata
    # 3. Store in database with 'pending' status
    # 4. Trigger async processing job
    # 5. Return capture confirmation
```

### 3. AI Processing Engine
**Technology**: Python with AI SDK integrations
**Responsibilities**:
- Content classification (Politics vs General)
- Political content analysis (bias, quality, implications)
- Summary generation and key point extraction
- Error handling and fallback processing

**Processing Workflow**:
```python
async def process_content(content_id):
    content = await get_content(content_id)
    
    # Step 1: Classification
    category = await classify_content(content)
    
    if category == "US_Politics_News":
        # Step 2: Enhanced analysis
        analysis = await analyze_political_content(content)
        await store_political_analysis(content_id, analysis)
    else:
        # Step 3: Basic processing
        summary = await generate_basic_summary(content)
        await store_basic_analysis(content_id, summary)
    
    await update_content_status(content_id, "processed")
```

### 4. Digest Generation Service
**Technology**: Python with Jinja2 templating
**Responsibilities**:
- Daily content aggregation
- Topic clustering and ranking
- Markdown digest generation
- Email and TTS delivery coordination

**Generation Process**:
```python
async def generate_daily_digest(date):
    # 1. Query political content from past 24 hours
    content = await get_political_content(date)
    
    # 2. Cluster content by topic similarity
    clusters = await cluster_content_by_topic(content)
    
    # 3. Rank clusters by importance
    ranked_clusters = rank_by_importance(clusters)
    
    # 4. Generate markdown digest
    digest = await generate_markdown(ranked_clusters)
    
    # 5. Store and trigger delivery
    await store_digest(date, digest)
    await trigger_delivery(digest)
```

## Database Schema

### Content Items Table
```sql
CREATE TABLE content_items (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'article', 'video', 'post'
    category VARCHAR(50), -- 'US_Politics_News', 'General'
    captured_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    source_domain VARCHAR(255),
    raw_content TEXT,
    content_hash VARCHAR(64), -- For deduplication
    metadata JSONB,
    processing_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_content_items_category ON content_items(category);
CREATE INDEX idx_content_items_captured_at ON content_items(captured_at);
CREATE INDEX idx_content_items_status ON content_items(processing_status);
```

### Political Analysis Table
```sql
CREATE TABLE political_analysis (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
    bias_score DECIMAL(3,2), -- -1.00 to +1.00
    bias_confidence DECIMAL(3,2), -- 0.00 to 1.00
    bias_label VARCHAR(20), -- 'left', 'center', 'right'
    quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
    credibility_score DECIMAL(3,1), -- 1.0-10.0
    loaded_language JSONB, -- Array of flagged phrases
    implications TEXT,
    summary_executive TEXT, -- 50-100 words
    summary_detailed TEXT, -- 200-300 words
    key_points JSONB, -- Array of bullet points
    processing_model VARCHAR(50), -- Track which AI model was used
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_political_analysis_content_id ON political_analysis(content_id);
CREATE INDEX idx_political_analysis_quality ON political_analysis(quality_score);
```

### Daily Digests Table
```sql
CREATE TABLE daily_digests (
    id SERIAL PRIMARY KEY,
    digest_date DATE NOT NULL UNIQUE,
    content_items_count INTEGER,
    political_items_count INTEGER,
    topic_clusters JSONB, -- Store cluster information
    digest_markdown TEXT,
    digest_html TEXT, -- For email delivery
    digest_audio_path TEXT, -- Path to TTS file
    email_sent_at TIMESTAMP,
    generation_duration INTEGER, -- Seconds taken to generate
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_daily_digests_date ON daily_digests(digest_date);
```

## AI Integration Architecture

### Provider Management
```python
class AIProviderManager:
    def __init__(self):
        self.providers = {
            'gemini': GeminiProvider(),
            'openai': OpenAIProvider(), 
            'anthropic': AnthropicProvider()
        }
        self.primary = 'gemini'
        self.fallback_order = ['openai', 'anthropic']
    
    async def process_with_fallback(self, content, operation):
        for provider_name in [self.primary] + self.fallback_order:
            try:
                provider = self.providers[provider_name]
                result = await provider.process(content, operation)
                return result
            except Exception as e:
                logger.warning(f"Provider {provider_name} failed: {e}")
                continue
        raise Exception("All AI providers failed")
```

### Prompt Templates
```python
CLASSIFICATION_PROMPT = """
Analyze the following content and determine if it belongs to the category 
"US Politics/News" or "General". Consider political figures, policy discussions,
government actions, and news events related to US politics.

Content: {content}

Respond with JSON: {{"category": "US_Politics_News" or "General", "confidence": 0.0-1.0}}
"""

BIAS_ANALYSIS_PROMPT = """
Analyze the political bias of this US political content. Identify:
1. Political leaning (left/center/right)
2. Loaded language and phrases
3. Source credibility indicators
4. Overall bias score from -1.0 (left) to +1.0 (right)

Content: {content}

Respond with structured JSON format.
"""
```

## Browser Extension Architecture

### Manifest V3 Structure
```json
{
  "manifest_version": 3,
  "name": "Dailies Content Capture",
  "version": "1.0.0",
  "permissions": ["activeTab", "storage", "contextMenus"],
  "host_permissions": ["http://localhost:8000/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Capture Content"
  }
}
```

### Extension Components
```javascript
// background.js - Service worker for API communication
class ContentCapture {
  async captureCurrentTab() {
    const tab = await chrome.tabs.query({active: true, currentWindow: true});
    const content = await this.extractContent(tab[0]);
    return await this.sendToAPI(content);
  }
}

// content.js - Page content extraction
function extractPageContent() {
  return {
    url: window.location.href,
    title: document.title,
    content: document.body.innerText,
    metadata: {
      domain: window.location.hostname,
      timestamp: new Date().toISOString()
    }
  };
}
```

## Deployment Architecture

### Docker Configuration
```dockerfile
# Dockerfile for main application
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose Setup
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/dailies
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=dailies
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    
  worker:
    build: .
    command: celery -A main.celery worker --loglevel=info
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
```

## Security Considerations

### API Security
- JWT token authentication for web interface
- API key validation for browser extension
- Rate limiting to prevent abuse
- Input validation and sanitization

### Data Protection
- Encrypted database connections
- Secure API key storage using environment variables
- Content encryption for sensitive political analysis
- Regular security updates and dependency scanning

### Privacy
- No external data sharing
- Local processing and storage
- User-controlled data retention policies
- Transparent logging and audit trails

## Monitoring and Observability

### Health Checks
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": await check_database_connection(),
        "redis": await check_redis_connection(),
        "ai_providers": await check_ai_provider_status()
    }
```

### Metrics Collection
- Content processing throughput
- AI API response times and error rates
- Digest generation performance
- User engagement metrics

### Logging Strategy
- Structured logging with JSON format
- Separate log levels for different components
- Error aggregation and alerting
- Performance monitoring and bottleneck identification

This architecture provides a solid foundation for the Dailies system while maintaining flexibility for future enhancements and scaling requirements.