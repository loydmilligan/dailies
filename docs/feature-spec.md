# Feature Specification - Dailies Content Curation System

## 1. Browser Extension

### 1.1 Content Capture
**Purpose**: Seamless bookmarking of web content and YouTube videos

**Functionality**:
- Single-click capture button in browser toolbar
- Context menu integration for right-click capture
- Automatic metadata extraction:
  - Page title and URL
  - Capture timestamp
  - Source domain
  - Page content/transcript
  - Thumbnails for videos

**Technical Requirements**:
- Manifest V3 compliance
- Chrome and Firefox compatibility
- Background script for API communication
- Content script for page analysis

### 1.2 User Interface
- Minimalist popup interface
- Capture confirmation with preview
- Manual tagging option for failed AI classification
- Quick settings access

## 2. AI Processing Pipeline

### 2.1 Content Classification
**Purpose**: Automatic identification of US politics/news content

**Classification Logic**:
```
IF (political_keywords_detected OR news_source_domain) 
   AND (US_context_present) 
THEN category = "US_Politics_News"
ELSE category = "General"
```

**Implementation**:
- Gemini API for text analysis
- Keyword-based fallback system
- Domain whitelist for known news sources
- Confidence scoring (0-1)

### 2.2 Enhanced Political Content Analysis

#### Bias Detection
**Methodology**:
- Language sentiment analysis
- Source credibility scoring
- Loaded language identification
- Political leaning classification (left/center/right)

**Output Structure**:
```json
{
  "bias_score": -0.7,  // -1 (left) to +1 (right)
  "confidence": 0.85,
  "loaded_phrases": ["radical agenda", "destroying democracy"],
  "credibility_score": 6.8  // 1-10 scale
}
```

#### Content Quality Scoring
**Factors**:
- Source reputation (40%)
- Factual accuracy indicators (30%)
- Writing quality and coherence (20%)
- Bias extremity penalty (10%)

#### Implications Analysis
**Process**:
- Extract key claims and statements
- Analyze potential consequences
- Identify stakeholder impacts
- Generate forward-looking insights

### 2.3 Summary Generation
**Length Targets**:
- Executive summary: 50-100 words
- Detailed summary: 200-300 words
- Key points extraction: 3-5 bullet points

## 3. Database Schema

### 3.1 Content Items Table
```sql
CREATE TABLE content_items (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    content_type VARCHAR(50), -- 'article', 'video', 'post'
    category VARCHAR(50), -- 'US_Politics_News', 'General'
    captured_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    source_domain VARCHAR(255),
    raw_content TEXT,
    metadata JSONB,
    processing_status VARCHAR(20) DEFAULT 'pending'
);
```

### 3.2 Political Analysis Table
```sql
CREATE TABLE political_analysis (
    content_id INTEGER REFERENCES content_items(id),
    bias_score DECIMAL(3,2), -- -1.00 to +1.00
    bias_confidence DECIMAL(3,2), -- 0.00 to 1.00
    quality_score INTEGER, -- 1-10
    credibility_score DECIMAL(3,1), -- 1.0-10.0
    loaded_language JSONB, -- array of flagged phrases
    implications TEXT,
    summary_short TEXT,
    summary_detailed TEXT,
    key_points JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3 Daily Digests Table
```sql
CREATE TABLE daily_digests (
    id SERIAL PRIMARY KEY,
    digest_date DATE NOT NULL,
    content_items_count INTEGER,
    political_items_count INTEGER,
    digest_markdown TEXT,
    digest_audio_path TEXT,
    email_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 4. Daily Digest Generation

### 4.1 Content Aggregation
**Process**:
1. Query political content from past 24 hours
2. Sort by importance score (quality × freshness × engagement)
3. Group by topic clusters using semantic similarity
4. Apply diversity filtering to avoid redundancy

### 4.2 Topic Clustering
**Algorithm**:
- Semantic embedding generation
- K-means clustering (dynamic K based on content volume)
- Cluster labeling with representative keywords
- Manual cluster merging for related topics

### 4.3 Markdown Template
```markdown
# Daily Politics & News Digest - {DATE}

## Executive Summary
- Total articles processed: {COUNT}
- Key themes: {THEMES}
- Bias distribution: {BIAS_STATS}

## Top Stories

### {CLUSTER_NAME}
**Importance Score: {SCORE}/10**

#### {ARTICLE_TITLE}
- **Source**: {DOMAIN} | **Bias**: {BIAS_LABEL} | **Quality**: {QUALITY}/10
- **Summary**: {SUMMARY}
- **Implications**: {IMPLICATIONS}
- **Key Points**:
  - {POINT_1}
  - {POINT_2}

---
```

## 5. Delivery System

### 5.1 Email Integration
**Service**: SMTP configuration for self-hosted email
**Format**: HTML email with embedded markdown
**Scheduling**: Daily at user-configured time (default: 7 AM)
**Features**:
- Mobile-responsive design
- One-click unsubscribe
- Archive link to web version

### 5.2 TTS Generation
**Service**: Google Cloud Text-to-Speech or local TTS
**Format**: MP3 audio files
**Features**:
- Natural voice selection
- Speed control (0.8x - 1.5x)
- Chapter markers for topic sections
- Automatic upload to podcast-style feed

## 6. Web Interface

### 6.1 Dashboard
**Components**:
- Recent captures list
- Processing status indicators
- Quick stats (daily/weekly/monthly)
- Search and filter functionality

### 6.2 Content Management
**Features**:
- Bulk operations (delete, recategorize, reprocess)
- Manual content editing
- Tag management
- Export functionality

### 6.3 Settings
**Configuration Options**:
- AI model selection and API keys
- Digest timing and frequency
- Email delivery preferences
- Content filtering rules

## 7. Performance Requirements

### 7.1 Processing Speed
- Content capture: < 5 seconds
- AI analysis: < 30 seconds per item
- Daily digest generation: < 5 minutes

### 7.2 Scalability
- Support for 100+ captures per day
- Historical data retention: 2+ years
- Concurrent processing: 5+ items

### 7.3 Reliability
- 99.5% uptime for capture API
- Automatic retry for failed AI processing
- Graceful degradation for API failures