-- Migration: Modular Content Processing Architecture
-- Adds tables and schema changes to support data-driven content categorization and processing
-- Date: 2025-06-22
-- Version: 001

-- ============================================================================
-- PHASE 1: Create new tables for modular architecture
-- ============================================================================

-- Table: categories
-- Stores the primary, high-level categories for content
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    is_fallback BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one fallback category exists
    CONSTRAINT single_fallback_category EXCLUDE (is_fallback WITH =) WHERE (is_fallback = true)
);

-- Table: actions
-- Defines the library of available processing functions
CREATE TABLE actions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    service_handler VARCHAR(200) NOT NULL, -- Key that maps to function in code
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: matchers
-- Defines rules used to provide hints to the AI classifier
CREATE TABLE matchers (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    matcher_type VARCHAR(20) NOT NULL CHECK (matcher_type IN ('domain', 'keyword')),
    pattern VARCHAR(500) NOT NULL,
    is_exclusion BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: category_actions
-- Links categories to actions in a many-to-many relationship
CREATE TABLE category_actions (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    action_id INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    execution_order INTEGER DEFAULT 1,
    config JSONB DEFAULT '{}', -- Action-specific parameters
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique category-action pairs
    CONSTRAINT unique_category_action UNIQUE (category_id, action_id)
);

-- Table: category_aliases
-- Maps raw AI outputs to primary categories
CREATE TABLE category_aliases (
    id SERIAL PRIMARY KEY,
    alias VARCHAR(200) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.70,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique aliases
    CONSTRAINT unique_alias UNIQUE (alias)
);

-- ============================================================================
-- PHASE 2: Modify existing content_items table
-- ============================================================================

-- Add new columns to content_items for enhanced classification
ALTER TABLE content_items 
ADD COLUMN ai_raw_category VARCHAR(200),
ADD COLUMN primary_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

-- ============================================================================
-- PHASE 3: Create indexes for optimal performance
-- ============================================================================

-- Categories table indexes
CREATE INDEX idx_categories_is_active ON categories(is_active) WHERE is_active = true;
CREATE INDEX idx_categories_is_fallback ON categories(is_fallback) WHERE is_fallback = true;
CREATE INDEX idx_categories_priority ON categories(priority);

-- Actions table indexes
CREATE INDEX idx_actions_name ON actions(name);
CREATE INDEX idx_actions_is_active ON actions(is_active) WHERE is_active = true;

-- Matchers table indexes
CREATE INDEX idx_matchers_category_id ON matchers(category_id);
CREATE INDEX idx_matchers_type_pattern ON matchers(matcher_type, pattern);
CREATE INDEX idx_matchers_is_active ON matchers(is_active) WHERE is_active = true;

-- Category_actions table indexes
CREATE INDEX idx_category_actions_category_id ON category_actions(category_id);
CREATE INDEX idx_category_actions_action_id ON category_actions(action_id);
CREATE INDEX idx_category_actions_execution_order ON category_actions(category_id, execution_order);
CREATE INDEX idx_category_actions_is_active ON category_actions(is_active) WHERE is_active = true;

-- Category_aliases table indexes
CREATE INDEX idx_category_aliases_alias ON category_aliases(alias);
CREATE INDEX idx_category_aliases_category_id ON category_aliases(category_id);

-- Content_items new column indexes
CREATE INDEX idx_content_items_ai_raw_category ON content_items(ai_raw_category) WHERE ai_raw_category IS NOT NULL;
CREATE INDEX idx_content_items_primary_category_id ON content_items(primary_category_id) WHERE primary_category_id IS NOT NULL;

-- ============================================================================
-- PHASE 4: Create triggers for automatic timestamp updates
-- ============================================================================

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actions_updated_at BEFORE UPDATE ON actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matchers_updated_at BEFORE UPDATE ON matchers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_actions_updated_at BEFORE UPDATE ON category_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_aliases_updated_at BEFORE UPDATE ON category_aliases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PHASE 5: Create useful views for the new architecture
-- ============================================================================

-- View: Category with action counts
CREATE VIEW category_summary AS
SELECT 
    c.id,
    c.name,
    c.description,
    c.is_active,
    c.is_fallback,
    COUNT(ca.action_id) as action_count,
    COUNT(m.id) as matcher_count,
    COUNT(ci.id) as content_count
FROM categories c
LEFT JOIN category_actions ca ON c.id = ca.category_id AND ca.is_active = true
LEFT JOIN matchers m ON c.id = m.category_id AND m.is_active = true
LEFT JOIN content_items ci ON c.id = ci.primary_category_id
GROUP BY c.id, c.name, c.description, c.is_active, c.is_fallback
ORDER BY c.priority, c.name;

-- View: Action usage statistics
CREATE VIEW action_usage AS
SELECT 
    a.id,
    a.name,
    a.service_handler,
    a.is_active,
    COUNT(ca.category_id) as category_count,
    ARRAY_AGG(c.name ORDER BY c.name) as categories
FROM actions a
LEFT JOIN category_actions ca ON a.id = ca.action_id AND ca.is_active = true
LEFT JOIN categories c ON ca.category_id = c.id AND c.is_active = true
GROUP BY a.id, a.name, a.service_handler, a.is_active
ORDER BY a.name;

-- View: Content processing pipeline view
CREATE VIEW content_processing_view AS
SELECT 
    ci.id as content_id,
    ci.title,
    ci.url,
    ci.source_domain,
    ci.captured_at,
    ci.ai_raw_category,
    c.name as primary_category,
    c.is_fallback,
    STRING_AGG(a.name, ', ' ORDER BY ca.execution_order) as processing_actions,
    ci.processing_status
FROM content_items ci
LEFT JOIN categories c ON ci.primary_category_id = c.id
LEFT JOIN category_actions ca ON c.id = ca.category_id AND ca.is_active = true
LEFT JOIN actions a ON ca.action_id = a.id AND a.is_active = true
GROUP BY ci.id, ci.title, ci.url, ci.source_domain, ci.captured_at, 
         ci.ai_raw_category, c.name, c.is_fallback, ci.processing_status
ORDER BY ci.captured_at DESC;

-- ============================================================================
-- PHASE 6: Grant permissions
-- ============================================================================

-- Grant permissions on new tables
GRANT ALL PRIVILEGES ON categories TO dailies_user;
GRANT ALL PRIVILEGES ON actions TO dailies_user;
GRANT ALL PRIVILEGES ON matchers TO dailies_user;
GRANT ALL PRIVILEGES ON category_actions TO dailies_user;
GRANT ALL PRIVILEGES ON category_aliases TO dailies_user;

-- Grant permissions on sequences
GRANT ALL PRIVILEGES ON SEQUENCE categories_id_seq TO dailies_user;
GRANT ALL PRIVILEGES ON SEQUENCE actions_id_seq TO dailies_user;
GRANT ALL PRIVILEGES ON SEQUENCE matchers_id_seq TO dailies_user;
GRANT ALL PRIVILEGES ON SEQUENCE category_actions_id_seq TO dailies_user;
GRANT ALL PRIVILEGES ON SEQUENCE category_aliases_id_seq TO dailies_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
INSERT INTO processing_logs (operation, status, model_used, processing_time_ms, created_at)
VALUES ('migration_001', 'success', 'modular_architecture', 0, NOW());