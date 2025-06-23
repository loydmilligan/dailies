-- Seed Initial Data for Modular Content Processing
-- Populates categories, actions, and relationships for the initial system
-- Date: 2025-06-22
-- Version: 002

-- ============================================================================
-- SEED CATEGORIES
-- ============================================================================

-- Insert initial categories based on user requirements
INSERT INTO categories (name, description, priority, is_active, is_fallback) VALUES
    ('US Politics', 'United States political news, analysis, and commentary', 1, true, false),
    ('Technology', 'General technology news, trends, and innovations', 2, true, false),
    ('Software Development', 'Programming, coding, development tools, and software engineering', 3, true, false),
    ('DIY Electronics', 'Electronics projects, hobby electronics, hacking, and maker content', 4, true, false),
    ('Homelab DevOps', 'Self-hosting, homelab setups, DevOps practices, and infrastructure', 5, true, false),
    ('3D Printing', '3D printing models, techniques, hardware, and community content', 6, true, false),
    ('Smart Home', 'Home automation, Home Assistant, ESPHome, IoT devices', 7, true, false),
    ('Sports', 'Sports news, analysis, scores, and commentary', 8, true, false),
    ('Uncategorized', 'Fallback category for content that cannot be automatically classified', 99, true, true);

-- ============================================================================
-- SEED ACTIONS
-- ============================================================================

-- Insert available processing actions
INSERT INTO actions (name, description, service_handler, is_active) VALUES
    ('analyze_bias', 'Analyze political bias and detect loaded language', 'political.analyzeBias', true),
    ('score_quality', 'Score content quality on factual accuracy and sourcing', 'political.scoreQuality', true),
    ('detect_loaded_language', 'Identify emotionally charged or manipulative language', 'political.detectLoadedLanguage', true),
    ('generate_summaries', 'Generate executive and detailed summaries', 'political.generateSummaries', true),
    ('assess_credibility', 'Assess source credibility and reputation', 'political.assessCredibility', true),
    
    ('extract_tech_trends', 'Extract technology trends and innovations mentioned', 'tech.extractTrends', true),
    ('analyze_technical_depth', 'Assess technical complexity and depth of content', 'tech.analyzeTechnicalDepth', true),
    ('extract_tools_technologies', 'Identify tools, frameworks, and technologies mentioned', 'tech.extractToolsTech', true),
    
    ('extract_sports_stats', 'Extract game statistics, scores, and player data', 'sports.extractStats', true),
    ('identify_teams_players', 'Identify teams, players, and key figures', 'sports.identifyTeamsPlayers', true),
    
    ('extract_print_settings', 'Extract 3D printing parameters and model metadata', 'printing.extractSettings', true),
    ('classify_model_type', 'Classify 3D model type (functional, decorative, etc.)', 'printing.classifyModel', true),
    ('extract_file_info', 'Extract download links and file information', 'printing.extractFileInfo', true),
    
    ('extract_project_details', 'Extract DIY project details and components', 'diy.extractProjectDetails', true),
    ('identify_components', 'Identify electronic components and tools needed', 'diy.identifyComponents', true),
    
    ('extract_smart_devices', 'Identify smart home devices and integrations', 'smarthome.extractDevices', true),
    ('extract_automation_logic', 'Extract automation rules and logic', 'smarthome.extractAutomation', true),
    
    ('summarize', 'Generate basic summary and extract key points', 'general.summarize', true),
    ('extract_keywords', 'Extract important keywords and topics', 'general.extractKeywords', true),
    ('calculate_reading_time', 'Calculate estimated reading time', 'general.calculateReadingTime', true);

-- ============================================================================
-- SEED CATEGORY-ACTION RELATIONSHIPS
-- ============================================================================

-- US Politics category actions
INSERT INTO category_actions (category_id, action_id, execution_order, config) VALUES
    ((SELECT id FROM categories WHERE name = 'US Politics'), 
     (SELECT id FROM actions WHERE name = 'analyze_bias'), 1, '{}'),
    ((SELECT id FROM categories WHERE name = 'US Politics'), 
     (SELECT id FROM actions WHERE name = 'score_quality'), 2, '{}'),
    ((SELECT id FROM categories WHERE name = 'US Politics'), 
     (SELECT id FROM actions WHERE name = 'detect_loaded_language'), 3, '{}'),
    ((SELECT id FROM categories WHERE name = 'US Politics'), 
     (SELECT id FROM actions WHERE name = 'assess_credibility'), 4, '{}'),
    ((SELECT id FROM categories WHERE name = 'US Politics'), 
     (SELECT id FROM actions WHERE name = 'generate_summaries'), 5, '{}');

-- Technology category actions
INSERT INTO category_actions (category_id, action_id, execution_order, config) VALUES
    ((SELECT id FROM categories WHERE name = 'Technology'), 
     (SELECT id FROM actions WHERE name = 'extract_tech_trends'), 1, '{}'),
    ((SELECT id FROM categories WHERE name = 'Technology'), 
     (SELECT id FROM actions WHERE name = 'analyze_technical_depth'), 2, '{}'),
    ((SELECT id FROM categories WHERE name = 'Technology'), 
     (SELECT id FROM actions WHERE name = 'extract_tools_technologies'), 3, '{}'),
    ((SELECT id FROM categories WHERE name = 'Technology'), 
     (SELECT id FROM actions WHERE name = 'summarize'), 4, '{}');

-- Software Development category actions
INSERT INTO category_actions (category_id, action_id, execution_order, config) VALUES
    ((SELECT id FROM categories WHERE name = 'Software Development'), 
     (SELECT id FROM actions WHERE name = 'extract_tools_technologies'), 1, '{}'),
    ((SELECT id FROM categories WHERE name = 'Software Development'), 
     (SELECT id FROM actions WHERE name = 'analyze_technical_depth'), 2, '{}'),
    ((SELECT id FROM categories WHERE name = 'Software Development'), 
     (SELECT id FROM actions WHERE name = 'summarize'), 3, '{}');

-- DIY Electronics category actions
INSERT INTO category_actions (category_id, action_id, execution_order, config) VALUES
    ((SELECT id FROM categories WHERE name = 'DIY Electronics'), 
     (SELECT id FROM actions WHERE name = 'extract_project_details'), 1, '{}'),
    ((SELECT id FROM categories WHERE name = 'DIY Electronics'), 
     (SELECT id FROM actions WHERE name = 'identify_components'), 2, '{}'),
    ((SELECT id FROM categories WHERE name = 'DIY Electronics'), 
     (SELECT id FROM actions WHERE name = 'summarize'), 3, '{}');

-- Homelab DevOps category actions
INSERT INTO category_actions (category_id, action_id, execution_order, config) VALUES
    ((SELECT id FROM categories WHERE name = 'Homelab DevOps'), 
     (SELECT id FROM actions WHERE name = 'extract_tools_technologies'), 1, '{}'),
    ((SELECT id FROM categories WHERE name = 'Homelab DevOps'), 
     (SELECT id FROM actions WHERE name = 'analyze_technical_depth'), 2, '{}'),
    ((SELECT id FROM categories WHERE name = 'Homelab DevOps'), 
     (SELECT id FROM actions WHERE name = 'summarize'), 3, '{}');

-- 3D Printing category actions
INSERT INTO category_actions (category_id, action_id, execution_order, config) VALUES
    ((SELECT id FROM categories WHERE name = '3D Printing'), 
     (SELECT id FROM actions WHERE name = 'extract_print_settings'), 1, '{}'),
    ((SELECT id FROM categories WHERE name = '3D Printing'), 
     (SELECT id FROM actions WHERE name = 'classify_model_type'), 2, '{}'),
    ((SELECT id FROM categories WHERE name = '3D Printing'), 
     (SELECT id FROM actions WHERE name = 'extract_file_info'), 3, '{}'),
    ((SELECT id FROM categories WHERE name = '3D Printing'), 
     (SELECT id FROM actions WHERE name = 'summarize'), 4, '{}');

-- Smart Home category actions
INSERT INTO category_actions (category_id, action_id, execution_order, config) VALUES
    ((SELECT id FROM categories WHERE name = 'Smart Home'), 
     (SELECT id FROM actions WHERE name = 'extract_smart_devices'), 1, '{}'),
    ((SELECT id FROM categories WHERE name = 'Smart Home'), 
     (SELECT id FROM actions WHERE name = 'extract_automation_logic'), 2, '{}'),
    ((SELECT id FROM categories WHERE name = 'Smart Home'), 
     (SELECT id FROM actions WHERE name = 'summarize'), 3, '{}');

-- Sports category actions
INSERT INTO category_actions (category_id, action_id, execution_order, config) VALUES
    ((SELECT id FROM categories WHERE name = 'Sports'), 
     (SELECT id FROM actions WHERE name = 'extract_sports_stats'), 1, '{}'),
    ((SELECT id FROM categories WHERE name = 'Sports'), 
     (SELECT id FROM actions WHERE name = 'identify_teams_players'), 2, '{}'),
    ((SELECT id FROM categories WHERE name = 'Sports'), 
     (SELECT id FROM actions WHERE name = 'summarize'), 3, '{}');

-- Uncategorized (fallback) category actions - minimal processing
INSERT INTO category_actions (category_id, action_id, execution_order, config) VALUES
    ((SELECT id FROM categories WHERE name = 'Uncategorized'), 
     (SELECT id FROM actions WHERE name = 'summarize'), 1, '{}'),
    ((SELECT id FROM categories WHERE name = 'Uncategorized'), 
     (SELECT id FROM actions WHERE name = 'extract_keywords'), 2, '{}'),
    ((SELECT id FROM categories WHERE name = 'Uncategorized'), 
     (SELECT id FROM actions WHERE name = 'calculate_reading_time'), 3, '{}');

-- ============================================================================
-- SEED MATCHERS (Domain-based hints for 3D printing)
-- ============================================================================

-- 3D Printing domain matchers
INSERT INTO matchers (category_id, matcher_type, pattern, is_exclusion, is_active) VALUES
    ((SELECT id FROM categories WHERE name = '3D Printing'), 'domain', 'thingiverse.com', false, true),
    ((SELECT id FROM categories WHERE name = '3D Printing'), 'domain', 'printables.com', false, true),
    ((SELECT id FROM categories WHERE name = '3D Printing'), 'domain', 'myminifactory.com', false, true),
    ((SELECT id FROM categories WHERE name = '3D Printing'), 'domain', 'cults3d.com', false, true),
    ((SELECT id FROM categories WHERE name = '3D Printing'), 'domain', 'thangs.com', false, true),
    ((SELECT id FROM categories WHERE name = '3D Printing'), 'domain', 'prusaprinters.org', false, true),
    ((SELECT id FROM categories WHERE name = '3D Printing'), 'domain', 'yeggi.com', false, true);

-- Technology domain matchers
INSERT INTO matchers (category_id, matcher_type, pattern, is_exclusion, is_active) VALUES
    ((SELECT id FROM categories WHERE name = 'Technology'), 'domain', 'techcrunch.com', false, true),
    ((SELECT id FROM categories WHERE name = 'Technology'), 'domain', 'arstechnica.com', false, true),
    ((SELECT id FROM categories WHERE name = 'Technology'), 'domain', 'theverge.com', false, true),
    ((SELECT id FROM categories WHERE name = 'Technology'), 'domain', 'wired.com', false, true);

-- Software Development domain matchers
INSERT INTO matchers (category_id, matcher_type, pattern, is_exclusion, is_active) VALUES
    ((SELECT id FROM categories WHERE name = 'Software Development'), 'domain', 'github.com', false, true),
    ((SELECT id FROM categories WHERE name = 'Software Development'), 'domain', 'stackoverflow.com', false, true),
    ((SELECT id FROM categories WHERE name = 'Software Development'), 'domain', 'dev.to', false, true),
    ((SELECT id FROM categories WHERE name = 'Software Development'), 'domain', 'medium.com', false, true),
    ((SELECT id FROM categories WHERE name = 'Software Development'), 'domain', 'hackernews.ycombinator.com', false, true);

-- Smart Home domain matchers
INSERT INTO matchers (category_id, matcher_type, pattern, is_exclusion, is_active) VALUES
    ((SELECT id FROM categories WHERE name = 'Smart Home'), 'domain', 'home-assistant.io', false, true),
    ((SELECT id FROM categories WHERE name = 'Smart Home'), 'domain', 'esphome.io', false, true),
    ((SELECT id FROM categories WHERE name = 'Smart Home'), 'domain', 'community.home-assistant.io', false, true);

-- DIY Electronics domain matchers
INSERT INTO matchers (category_id, matcher_type, pattern, is_exclusion, is_active) VALUES
    ((SELECT id FROM categories WHERE name = 'DIY Electronics'), 'domain', 'instructables.com', false, true),
    ((SELECT id FROM categories WHERE name = 'DIY Electronics'), 'domain', 'hackaday.com', false, true),
    ((SELECT id FROM categories WHERE name = 'DIY Electronics'), 'domain', 'adafruit.com', false, true),
    ((SELECT id FROM categories WHERE name = 'DIY Electronics'), 'domain', 'sparkfun.com', false, true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Display summary of seeded data
SELECT 'Categories' as table_name, COUNT(*) as count FROM categories
UNION ALL
SELECT 'Actions' as table_name, COUNT(*) as count FROM actions
UNION ALL
SELECT 'Category-Action Relationships' as table_name, COUNT(*) as count FROM category_actions
UNION ALL
SELECT 'Matchers' as table_name, COUNT(*) as count FROM matchers;

-- Show categories with their action counts
SELECT 
    c.name as category,
    c.is_fallback,
    COUNT(ca.action_id) as action_count,
    STRING_AGG(a.name, ', ' ORDER BY ca.execution_order) as actions
FROM categories c
LEFT JOIN category_actions ca ON c.id = ca.category_id
LEFT JOIN actions a ON ca.action_id = a.id
GROUP BY c.id, c.name, c.is_fallback, c.priority
ORDER BY c.priority;

-- Log seeding completion
INSERT INTO processing_logs (operation, status, model_used, processing_time_ms, created_at)
VALUES ('seed_initial_data', 'success', 'manual_seed', 0, NOW());