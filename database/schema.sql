-- Dailies Content Curation System Database Schema
-- Optimized for PostgreSQL 15+ with proper normalization and indexing

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create ENUM types for better data integrity
CREATE TYPE content_type_enum AS ENUM ('article', 'video', 'post', 'other');
CREATE TYPE content_category_enum AS ENUM ('US_Politics_News', 'General');
CREATE TYPE processing_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed', 'manual_review');
CREATE TYPE bias_label_enum AS ENUM ('left', 'center', 'right');

-- Table 1: content_items
-- Core table for all captured content with optimized structure
CREATE TABLE content_items (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    content_type content_type_enum NOT NULL DEFAULT 'article',
    category content_category_enum,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    source_domain VARCHAR(255) NOT NULL,
    raw_content TEXT,
    content_hash VARCHAR(64), -- SHA-256 for deduplication
    metadata JSONB DEFAULT '{}',
    processing_status processing_status_enum DEFAULT 'pending',
    ai_confidence_score DECIMAL(3,2) CHECK (ai_confidence_score >= 0.00 AND ai_confidence_score <= 1.00),
    manual_override BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: political_analysis
-- Enhanced analysis data for political content
CREATE TABLE political_analysis (
    id SERIAL PRIMARY KEY,
    content_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    bias_score DECIMAL(3,2) CHECK (bias_score >= -1.00 AND bias_score <= 1.00), -- -1 (left) to +1 (right)
    bias_confidence DECIMAL(3,2) CHECK (bias_confidence >= 0.00 AND bias_confidence <= 1.00),
    bias_label bias_label_enum,
    quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
    credibility_score DECIMAL(3,1) CHECK (credibility_score >= 1.0 AND credibility_score <= 10.0),
    loaded_language JSONB DEFAULT '[]', -- Array of flagged phrases
    implications TEXT,
    summary_executive TEXT, -- 50-100 words
    summary_detailed TEXT, -- 200-300 words
    key_points JSONB DEFAULT '[]', -- Array of bullet points
    processing_model VARCHAR(50), -- Track which AI model was used
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_id) -- Ensure one-to-one relationship
);

-- Table 3: daily_digests
-- Generated daily content summaries
CREATE TABLE daily_digests (
    id SERIAL PRIMARY KEY,
    digest_date DATE NOT NULL UNIQUE,
    content_items_count INTEGER DEFAULT 0,
    political_items_count INTEGER DEFAULT 0,
    topic_clusters JSONB DEFAULT '[]', -- Store cluster information
    digest_markdown TEXT,
    digest_html TEXT, -- For email delivery
    digest_audio_path TEXT, -- Path to TTS file
    email_sent_at TIMESTAMP WITH TIME ZONE,
    generation_duration INTEGER, -- Seconds taken to generate
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 4: user_settings (for future multi-user support)
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID DEFAULT uuid_generate_v4(),
    digest_time TIME DEFAULT '07:00:00',
    digest_frequency VARCHAR(20) DEFAULT 'daily',
    email_address VARCHAR(255),
    email_enabled BOOLEAN DEFAULT TRUE,
    tts_enabled BOOLEAN DEFAULT FALSE,
    ai_model_preference VARCHAR(50) DEFAULT 'gemini',
    content_filters JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 5: processing_logs (for debugging and monitoring)
CREATE TABLE processing_logs (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
    operation VARCHAR(50) NOT NULL, -- 'classify', 'analyze', 'summarize'
    status VARCHAR(20) NOT NULL, -- 'success', 'error', 'timeout'
    model_used VARCHAR(50),
    processing_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for optimal query performance
-- Primary indexes for content_items
CREATE INDEX idx_content_items_captured_at ON content_items(captured_at DESC);
CREATE INDEX idx_content_items_category ON content_items(category) WHERE category IS NOT NULL;
CREATE INDEX idx_content_items_source_domain ON content_items(source_domain);
CREATE INDEX idx_content_items_processing_status ON content_items(processing_status);
CREATE INDEX idx_content_items_content_hash ON content_items(content_hash) WHERE content_hash IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX idx_content_items_category_captured ON content_items(category, captured_at DESC) WHERE category = 'US_Politics_News';
CREATE INDEX idx_content_items_processed_at ON content_items(processed_at DESC) WHERE processed_at IS NOT NULL;

-- Full-text search indexes
CREATE INDEX idx_content_items_title_fts ON content_items USING gin(to_tsvector('english', title));
CREATE INDEX idx_content_items_content_fts ON content_items USING gin(to_tsvector('english', raw_content)) WHERE raw_content IS NOT NULL;

-- Political analysis indexes
CREATE INDEX idx_political_analysis_content_id ON political_analysis(content_id);
CREATE INDEX idx_political_analysis_quality_score ON political_analysis(quality_score DESC);
CREATE INDEX idx_political_analysis_bias_score ON political_analysis(bias_score);

-- Daily digests indexes
CREATE INDEX idx_daily_digests_date ON daily_digests(digest_date DESC);
CREATE INDEX idx_daily_digests_email_sent ON daily_digests(email_sent_at) WHERE email_sent_at IS NOT NULL;

-- Processing logs indexes (for monitoring)
CREATE INDEX idx_processing_logs_content_id ON processing_logs(content_id);
CREATE INDEX idx_processing_logs_created_at ON processing_logs(created_at DESC);
CREATE INDEX idx_processing_logs_status_operation ON processing_logs(status, operation);

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_content_items_updated_at BEFORE UPDATE ON content_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_political_analysis_updated_at BEFORE UPDATE ON political_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_digests_updated_at BEFORE UPDATE ON daily_digests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries

-- View: Recent political content with analysis
CREATE VIEW recent_political_content AS
SELECT 
    ci.id,
    ci.url,
    ci.title,
    ci.source_domain,
    ci.captured_at,
    pa.bias_score,
    pa.bias_label,
    pa.quality_score,
    pa.credibility_score,
    pa.summary_executive
FROM content_items ci
JOIN political_analysis pa ON ci.id = pa.content_id
WHERE ci.category = 'US_Politics_News'
ORDER BY ci.captured_at DESC;

-- View: Daily digest statistics
CREATE VIEW digest_stats AS
SELECT 
    digest_date,
    content_items_count,
    political_items_count,
    (political_items_count::float / NULLIF(content_items_count, 0) * 100)::decimal(5,2) as political_percentage,
    email_sent_at IS NOT NULL as email_sent,
    generation_duration
FROM daily_digests
ORDER BY digest_date DESC;

-- Insert initial user settings record
INSERT INTO user_settings (email_address, email_enabled) 
VALUES ('user@example.com', TRUE) 
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dailies_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dailies_user;