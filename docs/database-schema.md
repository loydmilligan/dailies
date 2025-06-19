# Dailies Database Schema Documentation

## Overview

The Dailies content curation system uses PostgreSQL 15+ with a carefully designed schema optimized for AI-powered content processing, political analysis, and daily digest generation. The schema supports 25-50 daily content items with advanced metadata tracking, bias analysis, and retention-focused features.

## Entity Relationship Diagram

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   content_items     │    │  political_analysis  │    │   daily_digests     │
├─────────────────────┤    ├──────────────────────┤    ├─────────────────────┤
│ id (PK)            │────┤ content_id (FK)      │    │ id (PK)            │
│ url                 │    │ bias_score           │    │ digest_date         │
│ title               │    │ bias_confidence      │    │ content_summary     │
│ content_type        │    │ bias_label           │    │ key_topics          │
│ category            │    │ quality_score        │    │ political_summary   │
│ captured_at         │    │ credibility_score    │    │ email_sent_at       │
│ processed_at        │    │ loaded_language      │    │ created_at          │
│ source_domain       │    │ implications         │    │ updated_at          │
│ raw_content         │    │ summary_executive    │    └─────────────────────┘
│ content_hash        │    │ summary_detailed     │
│ metadata            │    │ key_points           │
│ processing_status   │    │ processing_model     │
│ ai_confidence_score │    │ created_at           │
│ manual_override     │    │ updated_at           │
│ created_at          │    └──────────────────────┘
│ updated_at          │
└─────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────┐    ┌──────────────────────┐
│   processing_logs   │    │   user_settings      │
├─────────────────────┤    ├──────────────────────┤
│ id (PK)            │    │ id (PK)             │
│ content_id (FK)    │    │ email_enabled        │
│ operation          │    │ tts_enabled          │
│ status             │    │ ai_model_preference  │
│ model_used         │    │ content_filters      │
│ processing_time_ms │    │ created_at           │
│ error_message      │    │ updated_at           │
│ created_at         │    └──────────────────────┘
└─────────────────────┘
```

## Table Definitions

### 1. content_items

**Purpose**: Core table storing all captured content with metadata and processing status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| url | TEXT | NOT NULL | Original content URL |
| title | TEXT | NOT NULL | Content title or headline |
| content_type | content_type_enum | NOT NULL, DEFAULT 'article' | Type: article, video, post, other |
| category | content_category_enum | NULL | US_Politics_News or General |
| captured_at | TIMESTAMPTZ | DEFAULT NOW() | When content was captured |
| processed_at | TIMESTAMPTZ | NULL | When AI processing completed |
| source_domain | VARCHAR(255) | NOT NULL | Domain of the source (e.g., 'cnn.com') |
| raw_content | TEXT | NULL | Full text content or transcript |
| content_hash | VARCHAR(64) | UNIQUE | SHA-256 hash for deduplication |
| metadata | JSONB | DEFAULT '{}' | Flexible metadata storage |
| processing_status | processing_status_enum | DEFAULT 'pending' | pending, processing, completed, failed, manual_review |
| ai_confidence_score | DECIMAL(3,2) | 0.00-1.00 | AI classification confidence |
| manual_override | BOOLEAN | DEFAULT FALSE | Human review override flag |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

**Business Rules**:
- URL and title are required for all content
- Content hash enables automatic deduplication
- JSONB metadata supports extensible properties (author, word count, social metrics)
- Processing status tracks content through AI pipeline
- Manual override allows human classification corrections

### 2. political_analysis

**Purpose**: Enhanced analysis data specifically for political content, including bias detection and quality assessment.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| content_id | INTEGER | NOT NULL, FK → content_items.id | Parent content reference |
| bias_score | DECIMAL(3,2) | -1.00 to 1.00 | Bias score: -1 (left) to +1 (right) |
| bias_confidence | DECIMAL(3,2) | 0.00-1.00 | Confidence in bias assessment |
| bias_label | bias_label_enum | NULL | Categorical label: left, center, right |
| quality_score | INTEGER | 1-10 | Content quality assessment |
| credibility_score | DECIMAL(3,1) | 1.0-10.0 | Source credibility rating |
| loaded_language | JSONB | DEFAULT '[]' | Array of emotional/biased phrases |
| implications | TEXT | NULL | Analysis of political implications |
| summary_executive | TEXT | NULL | 50-100 word executive summary |
| summary_detailed | TEXT | NULL | 200-300 word detailed analysis |
| key_points | JSONB | DEFAULT '[]' | Array of main points/takeaways |
| processing_model | VARCHAR(50) | NULL | AI model used for analysis |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Analysis creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

**Business Rules**:
- One-to-one relationship with content_items
- Bias score range reflects political spectrum positioning
- Quality and credibility scores guide content prioritization
- JSONB arrays support flexible phrase and point storage
- Model tracking enables A/B testing of AI approaches

### 3. daily_digests

**Purpose**: Generated daily summaries and topic clusters for email delivery and retention.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| digest_date | DATE | NOT NULL, UNIQUE | Date for this digest |
| content_summary | TEXT | NULL | Overall content summary |
| key_topics | JSONB | DEFAULT '[]' | Clustered topics with content references |
| political_summary | TEXT | NULL | Focused political content analysis |
| email_sent_at | TIMESTAMPTZ | NULL | Email delivery timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Digest generation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

**Business Rules**:
- One digest per date enforced by unique constraint
- JSONB topics enable flexible clustering results
- Email tracking supports delivery confirmation
- Political summary provides focused analysis

### 4. user_settings

**Purpose**: User preferences for content filtering, delivery methods, and AI model selection.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| email_enabled | BOOLEAN | DEFAULT TRUE | Email digest delivery preference |
| tts_enabled | BOOLEAN | DEFAULT FALSE | Text-to-speech podcast generation |
| ai_model_preference | VARCHAR(50) | DEFAULT 'gemini' | Preferred AI model for processing |
| content_filters | JSONB | DEFAULT '{}' | User-defined content filtering rules |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Settings creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

**Business Rules**:
- JSONB filters support complex user-defined rules
- Model preference enables personalized AI selection
- Boolean flags control delivery methods

### 5. processing_logs

**Purpose**: Operational monitoring and debugging for AI processing pipeline.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing identifier |
| content_id | INTEGER | FK → content_items.id | Content being processed |
| operation | VARCHAR(50) | NOT NULL | Processing operation: classify, analyze, summarize |
| status | VARCHAR(20) | NOT NULL | Operation result: success, error, timeout |
| model_used | VARCHAR(50) | NULL | AI model identifier |
| processing_time_ms | INTEGER | NULL | Processing duration in milliseconds |
| error_message | TEXT | NULL | Error details if status = error |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Log entry timestamp |

**Business Rules**:
- Foreign key enables tracking per-content processing
- Status tracking supports error monitoring
- Timing data enables performance optimization

## ENUM Types

### content_type_enum
```sql
CREATE TYPE content_type_enum AS ENUM ('article', 'video', 'post', 'other');
```

### content_category_enum  
```sql
CREATE TYPE content_category_enum AS ENUM ('US_Politics_News', 'General');
```

### processing_status_enum
```sql
CREATE TYPE processing_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed', 'manual_review');
```

### bias_label_enum
```sql
CREATE TYPE bias_label_enum AS ENUM ('left', 'center', 'right');
```

## Index Strategy

### Primary Indexes (13 total)

#### Content Items Performance
- `idx_content_items_captured_at`: Timestamp-based retrieval (DESC order)
- `idx_content_items_category`: Political content filtering
- `idx_content_items_source_domain`: Source-based queries
- `idx_content_items_processing_status`: Pipeline status tracking
- `idx_content_items_content_hash`: Deduplication lookups (partial index)

#### Composite Indexes
- `idx_content_items_category_captured`: Political content by date (partial index)
- `idx_content_items_processed_at`: Completed content retrieval (partial index)

#### Full-Text Search
- `idx_content_items_title_fts`: GIN index for title search
- `idx_content_items_content_fts`: GIN index for content search (partial index)

#### Political Analysis
- `idx_political_analysis_content_id`: Foreign key optimization
- `idx_political_analysis_quality_score`: Quality-based sorting (DESC)
- `idx_political_analysis_bias_score`: Bias analysis queries

#### Operational Indexes
- `idx_daily_digests_date`: Digest retrieval (DESC order)
- `idx_processing_logs_created_at`: Log analysis (DESC order)

### Index Performance Characteristics

| Query Type | Expected Performance | Index Used |
|------------|---------------------|------------|
| Primary key lookup | < 1ms | Primary key |
| Category filtering | < 50ms | Category index |
| Date range queries | < 100ms | Timestamp indexes |
| Full-text search | < 200ms | GIN indexes |
| Political analysis joins | < 150ms | Foreign key + composite |
| Source domain filtering | < 30ms | Domain index |

## JSONB Field Schemas

### content_items.metadata
```json
{
  "author": "string",
  "publishDate": "ISO 8601 date",
  "wordCount": "number",
  "readingTime": "number (minutes)",
  "tags": ["array", "of", "strings"],
  "socialMetrics": {
    "shares": "number",
    "likes": "number", 
    "comments": "number"
  },
  "videoData": {
    "duration": "number (seconds)",
    "channel": "string",
    "uploadDate": "ISO 8601 date"
  }
}
```

### political_analysis.loaded_language
```json
[
  {
    "phrase": "string",
    "sentiment": "positive|negative|dramatic|neutral",
    "position": "number (character position)",
    "intensity": "number (1-10)"
  }
]
```

### political_analysis.key_points
```json
[
  "Bullet point text",
  "Another key takeaway",
  "Important implication"
]
```

### daily_digests.key_topics
```json
[
  {
    "topic": "Topic name",
    "contentIds": [1, 2, 3],
    "importance": "number (1-10)",
    "summary": "Topic summary text"
  }
]
```

### user_settings.content_filters
```json
{
  "excludeDomains": ["domain1.com", "domain2.com"],
  "minQualityScore": "number (1-10)",
  "biasRange": {
    "min": "number (-1 to 1)",
    "max": "number (-1 to 1)"
  },
  "categories": ["US_Politics_News", "General"],
  "keywords": {
    "include": ["keyword1", "keyword2"],
    "exclude": ["spam", "clickbait"]
  }
}
```

## Triggers and Constraints

### Automatic Timestamp Updates
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

Applied to: `content_items`, `political_analysis`, `daily_digests`, `user_settings`

### Data Validation Constraints

#### Range Constraints
- `bias_score`: -1.00 ≤ value ≤ 1.00
- `bias_confidence`: 0.00 ≤ value ≤ 1.00  
- `ai_confidence_score`: 0.00 ≤ value ≤ 1.00
- `quality_score`: 1 ≤ value ≤ 10
- `credibility_score`: 1.0 ≤ value ≤ 10.0

#### Referential Integrity
- `political_analysis.content_id` → `content_items.id` (CASCADE DELETE)
- `processing_logs.content_id` → `content_items.id` (CASCADE DELETE)

#### Uniqueness Constraints
- `content_items.content_hash` (partial: WHERE content_hash IS NOT NULL)
- `daily_digests.digest_date`

## Performance Characteristics

### Expected Query Performance (1000+ content items)

| Operation | Target Performance | Optimization |
|-----------|-------------------|--------------|
| Content insertion | < 10ms per item | Batch processing |
| Political analysis creation | < 20ms per item | Single transaction |
| Category filtering | < 50ms for 100 results | Dedicated index |
| Full-text search | < 200ms for 50 results | GIN indexes |
| Daily digest generation | < 2s for day's content | Composite indexes |
| Bias analysis queries | < 100ms for 50 results | Score indexes |

### Scalability Targets

| Metric | Current Capacity | Growth Plan |
|--------|------------------|-------------|
| Daily content items | 25-50 | → 250-500 |
| Total content storage | 10K items | → 100K items |
| Concurrent users | Single user | → 10 users |
| Query response time | < 200ms p95 | Maintain < 500ms p95 |

## Data Retention and Archival

### Content Lifecycle
1. **Active**: Recent content (last 30 days) - full indexing
2. **Archived**: Older content (30+ days) - reduced indexing
3. **Cold Storage**: Historical content (1+ years) - compressed storage

### Retention Policies
- Processing logs: 90 days
- Daily digests: Indefinite (core value)
- Content items: User-configurable (default: 2 years)
- Political analysis: Linked to content item retention

## Schema Evolution Strategy

### Version Control
- All schema changes tracked in migration files
- ENUM types support additive changes without downtime
- JSONB fields provide schema flexibility without migrations

### Backward Compatibility
- New columns added with DEFAULT values
- ENUM expansion maintains existing values
- Index additions are non-blocking operations

### Future Enhancements
- Partitioning by date for content_items (when > 100K records)
- Additional JSONB indexes based on usage patterns
- Read replicas for query performance scaling
- Archive table strategy for historical data