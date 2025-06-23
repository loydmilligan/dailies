// Enhanced AI Classification Service for Modular Content Processing
// Supports multiple categories with domain hints and fallback resolution

const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { logger } = require('../middleware/logging');
const { secureConfigService } = require('./secureConfig');

/**
 * Enhanced AI Classification Service with modular category support
 * Classifies content into multiple categories with domain hints and alias resolution
 */
class EnhancedAIClassificationService {
  constructor() {
    this.classificationCache = new Map();
    this.initialized = false;
    this.db = null; // Will be injected
  }

  /**
   * Initialize the service with database connection
   */
  async initialize(database) {
    const startTime = Date.now();
    
    try {
      logger.info('Initializing EnhancedAIClassificationService', {
        hasDatabase: !!database,
        secureConfigInitialized: secureConfigService.initialized
      });

      this.db = database;
      
      if (!secureConfigService.initialized) {
        logger.info('Initializing secure config service...');
        await secureConfigService.initialize();
      }
      
      logger.info('Initializing AI clients...');
      this.initializeClients();
      
      logger.info('Loading categories and configuration from database...');
      await this.loadCategories();
      
      this.initialized = true;
      const initTime = Date.now() - startTime;
      
      logger.info('EnhancedAIClassificationService initialized successfully', {
        initializationTime: initTime,
        categories: this.categories?.length || 0,
        matchers: this.matchers?.length || 0,
        aliases: Object.keys(this.aliases || {}).length,
        fallbackCategory: this.fallbackCategory?.name,
        availableProviders: [
          this.geminiClient ? 'gemini' : null,
          this.openaiClient ? 'openai' : null,
          this.anthropicClient ? 'anthropic' : null
        ].filter(Boolean)
      });
    } catch (error) {
      const initTime = Date.now() - startTime;
      logger.error('Failed to initialize EnhancedAIClassificationService', {
        error: error.message,
        errorType: error.constructor.name,
        initializationTime: initTime,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Initialize AI clients
   */
  initializeClients() {
    // Google Gemini (Primary)
    const geminiKey = secureConfigService.getApiKey('gemini');
    if (geminiKey) {
      this.geminiClient = new GoogleGenerativeAI(geminiKey);
      this.geminiModel = this.geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
    }

    // OpenAI (Fallback)
    const openaiKey = secureConfigService.getApiKey('openai');
    if (openaiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiKey });
    }

    // Anthropic (Secondary Fallback)
    const anthropicKey = secureConfigService.getApiKey('anthropic');
    if (anthropicKey) {
      this.anthropicClient = new Anthropic({ apiKey: anthropicKey });
    }
  }

  /**
   * Load categories and matchers from database
   */
  async loadCategories() {
    try {
      // Load active categories
      const categoriesResult = await this.db.query(`
        SELECT id, name, description, is_fallback 
        FROM categories 
        WHERE is_active = true 
        ORDER BY priority
      `);
      this.categories = categoriesResult.rows;
      
      // Load matchers
      const matchersResult = await this.db.query(`
        SELECT m.*, c.name as category_name
        FROM matchers m
        JOIN categories c ON m.category_id = c.id
        WHERE m.is_active = true AND c.is_active = true
      `);
      this.matchers = matchersResult.rows;
      
      // Load aliases
      const aliasesResult = await this.db.query(`
        SELECT ca.alias, c.name as category_name, c.id as category_id
        FROM category_aliases ca
        JOIN categories c ON ca.category_id = c.id
        WHERE c.is_active = true
      `);
      this.aliases = aliasesResult.rows.reduce((acc, row) => {
        acc[row.alias.toLowerCase()] = {
          name: row.category_name,
          id: row.category_id
        };
        return acc;
      }, {});

      this.fallbackCategory = this.categories.find(c => c.is_fallback);
      
      logger.info('Categories and matchers loaded', {
        categories: this.categories.length,
        matchers: this.matchers.length,
        aliases: Object.keys(this.aliases).length,
        fallback: this.fallbackCategory?.name
      });
    } catch (error) {
      logger.error('Failed to load categories:', error);
      throw error;
    }
  }

  /**
   * Generate hints based on content domain and matchers
   */
  generateHints(content) {
    const hints = [];
    const domain = content.source_domain?.toLowerCase() || '';
    
    // Check domain matchers
    const domainMatchers = this.matchers.filter(m => 
      m.matcher_type === 'domain' && 
      domain.includes(m.pattern.toLowerCase())
    );
    
    domainMatchers.forEach(matcher => {
      if (matcher.is_exclusion) {
        hints.push(`AVOID categorizing as ${matcher.category_name}`);
      } else {
        hints.push(`Content from ${matcher.pattern} is typically ${matcher.category_name}`);
      }
    });
    
    // Check keyword matchers
    const text = `${content.title} ${content.raw_content || ''}`.toLowerCase();
    const keywordMatchers = this.matchers.filter(m => 
      m.matcher_type === 'keyword' &&
      text.includes(m.pattern.toLowerCase())
    );
    
    keywordMatchers.forEach(matcher => {
      if (matcher.is_exclusion) {
        hints.push(`Presence of '${matcher.pattern}' suggests NOT ${matcher.category_name}`);
      } else {
        hints.push(`Keyword '${matcher.pattern}' suggests ${matcher.category_name}`);
      }
    });
    
    return hints;
  }

  /**
   * Construct enhanced classification prompt with categories and hints
   */
  constructClassificationPrompt(content, hints = []) {
    const categoryNames = this.categories
      .filter(c => !c.is_fallback)
      .map(c => c.name);
    
    const hintsText = hints.length > 0 
      ? `\n\nHints based on domain and content analysis:\n${hints.map(h => `- ${h}`).join('\n')}`
      : '';

    return `You are a content classifier that ONLY responds with a category name. No explanations, no markdown, no extra text.

Classify this content into ONE of these categories:
${categoryNames.map(name => `- ${name}`).join('\n')}

Content:
Title: ${content.title}
Source: ${content.source_domain}
Text: ${(content.raw_content || '').substring(0, 2000)}${hintsText}

Respond with ONLY the category name exactly as listed above.`;
  }

  /**
   * Classify content with Gemini
   */
  async classifyWithGemini(prompt) {
    if (!this.geminiModel) {
      throw new Error('Gemini client not initialized');
    }

    const result = await this.geminiModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Strip markdown code fences if present
    text = text.replace(/^```.*?\n?/, '').replace(/\n?```$/, '').trim();
    
    return {
      provider: 'gemini',
      rawCategory: text,
      confidence: this.calculateGeminiConfidence(text)
    };
  }

  /**
   * Classify content with OpenAI
   */
  async classifyWithOpenAI(prompt) {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a content classifier. Respond only with the exact category name.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0
    });

    const text = response.choices[0].message.content.trim();
    
    return {
      provider: 'openai',
      rawCategory: text,
      confidence: this.calculateOpenAIConfidence(response, text)
    };
  }

  /**
   * Classify content with Anthropic
   */
  async classifyWithAnthropic(prompt) {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const response = await this.anthropicClient.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 50,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim();
    
    return {
      provider: 'anthropic',
      rawCategory: text,
      confidence: this.calculateAnthropicConfidence(text)
    };
  }

  /**
   * Calculate confidence for Gemini responses
   */
  calculateGeminiConfidence(text) {
    const validCategories = this.categories.map(c => c.name.toLowerCase());
    const textLower = text.toLowerCase();
    
    // Check if response matches a valid category
    const exactMatch = validCategories.includes(textLower);
    if (exactMatch) return 0.95;
    
    // Check partial matches
    const partialMatch = validCategories.some(cat => 
      textLower.includes(cat) || cat.includes(textLower)
    );
    if (partialMatch) return 0.8;
    
    // Short, decisive responses get higher confidence
    if (text.length < 30) return 0.7;
    
    return 0.5; // Default moderate confidence
  }

  /**
   * Calculate confidence for OpenAI responses
   */
  calculateOpenAIConfidence(response, text) {
    if (response.choices[0].finish_reason !== 'stop') {
      return 0.6; // Lower confidence for incomplete responses
    }
    
    const validCategories = this.categories.map(c => c.name.toLowerCase());
    const textLower = text.toLowerCase();
    
    const exactMatch = validCategories.includes(textLower);
    if (exactMatch) return 0.95;
    
    const partialMatch = validCategories.some(cat => 
      textLower.includes(cat) || cat.includes(textLower)
    );
    if (partialMatch) return 0.85;
    
    return 0.6;
  }

  /**
   * Calculate confidence for Anthropic responses
   */
  calculateAnthropicConfidence(text) {
    const validCategories = this.categories.map(c => c.name.toLowerCase());
    const textLower = text.toLowerCase();
    
    const exactMatch = validCategories.includes(textLower);
    if (exactMatch) return 0.95;
    
    const partialMatch = validCategories.some(cat => 
      textLower.includes(cat) || cat.includes(textLower)
    );
    if (partialMatch) return 0.8;
    
    return 0.65;
  }

  /**
   * Resolve raw AI category to primary category using aliases
   */
  resolveCategoryWithAliases(rawCategory) {
    const rawLower = rawCategory.toLowerCase().trim();
    
    // First, try exact category match
    const exactCategory = this.categories.find(c => 
      c.name.toLowerCase() === rawLower
    );
    if (exactCategory) {
      return {
        category: exactCategory,
        matched: 'exact',
        confidence: 0.95
      };
    }
    
    // Try alias lookup
    const alias = this.aliases[rawLower];
    if (alias) {
      const category = this.categories.find(c => c.id === alias.id);
      return {
        category,
        matched: 'alias',
        confidence: 0.9
      };
    }
    
    // Try partial matching
    const partialMatch = this.categories.find(c => {
      const categoryLower = c.name.toLowerCase();
      return categoryLower.includes(rawLower) || rawLower.includes(categoryLower);
    });
    
    if (partialMatch) {
      return {
        category: partialMatch,
        matched: 'partial',
        confidence: 0.7
      };
    }
    
    // Fallback to default category
    return {
      category: this.fallbackCategory,
      matched: 'fallback',
      confidence: 0.5
    };
  }

  /**
   * Main classification method
   */
  async classifyContent(content) {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    const startTime = Date.now();
    const contentId = content.id || 'unknown';

    logger.info('Enhanced AI classification started', {
      contentId,
      title: content.title?.substring(0, 50),
      domain: content.source_domain,
      contentLength: content.raw_content?.length || 0,
      availableCategories: this.categories.length,
      availableMatchers: this.matchers.length
    });

    // Check cache
    const cacheKey = content.content_hash || `${content.source_domain}:${content.title}`;
    if (this.classificationCache.has(cacheKey)) {
      const cachedResult = { ...this.classificationCache.get(cacheKey), fromCache: true };
      logger.info('Classification result retrieved from cache', {
        contentId,
        cacheKey: cacheKey.substring(0, 50),
        category: cachedResult.resolvedCategory?.name,
        processingTime: Date.now() - startTime
      });
      return cachedResult;
    }

    // Generate hints
    const hintsStartTime = Date.now();
    const hints = this.generateHints(content);
    const hintsTime = Date.now() - hintsStartTime;
    
    logger.info('Content hints generated', {
      contentId,
      hintsCount: hints.length,
      hintsGenerationTime: hintsTime,
      hints: hints.length > 0 ? hints : undefined
    });

    const prompt = this.constructClassificationPrompt(content, hints);

    // Try providers in order
    const providers = [
      { name: 'gemini', method: 'classifyWithGemini' },
      { name: 'openai', method: 'classifyWithOpenAI' },
      { name: 'anthropic', method: 'classifyWithAnthropic' }
    ].filter(p => this[`${p.name}Client`] || this[`${p.name}Model`]);

    logger.info('Available AI providers for classification', {
      contentId,
      availableProviders: providers.map(p => p.name),
      fallbackCategory: this.fallbackCategory?.name
    });

    let lastError;
    for (const provider of providers) {
      const providerStartTime = Date.now();
      try {
        logger.info(`Attempting classification with ${provider.name}`, {
          contentId,
          provider: provider.name,
          title: content.title?.substring(0, 50),
          domain: content.source_domain,
          hints: hints.length,
          promptLength: prompt.length
        });

        const result = await this[provider.method](prompt);
        const providerTime = Date.now() - providerStartTime;
        
        logger.info(`AI provider ${provider.name} responded`, {
          contentId,
          provider: provider.name,
          rawResponse: result.rawCategory,
          confidence: result.confidence,
          responseTime: providerTime
        });
        
        // Resolve category
        const resolutionStartTime = Date.now();
        const resolution = this.resolveCategoryWithAliases(result.rawCategory);
        const resolutionTime = Date.now() - resolutionStartTime;
        
        logger.info('Category resolution completed', {
          contentId,
          rawCategory: result.rawCategory,
          resolvedCategoryId: resolution.category?.id,
          resolvedCategoryName: resolution.category?.name,
          matchType: resolution.matched,
          resolutionConfidence: resolution.confidence,
          resolutionTime
        });
        
        const finalResult = {
          provider: result.provider,
          rawCategory: result.rawCategory,
          resolvedCategory: resolution.category,
          matchType: resolution.matched,
          confidence: Math.min(result.confidence, resolution.confidence),
          hints: hints.length,
          processingMetrics: {
            totalTime: Date.now() - startTime,
            hintsTime,
            providerTime,
            resolutionTime
          },
          processed_at: new Date().toISOString()
        };

        // Cache result
        this.classificationCache.set(cacheKey, finalResult);
        this.manageCacheSize();

        logger.info('Enhanced AI classification completed successfully', {
          contentId,
          provider: finalResult.provider,
          rawCategory: finalResult.rawCategory,
          resolvedCategory: finalResult.resolvedCategory.name,
          matchType: finalResult.matchType,
          finalConfidence: finalResult.confidence,
          totalProcessingTime: finalResult.processingMetrics.totalTime,
          cacheSize: this.classificationCache.size
        });

        return finalResult;
        
      } catch (error) {
        const providerTime = Date.now() - providerStartTime;
        lastError = error;
        logger.error(`Classification failed with ${provider.name}`, {
          contentId,
          provider: provider.name,
          error: error.message,
          errorType: error.constructor.name,
          responseTime: providerTime,
          stack: error.stack
        });
      }
    }

    // If all providers failed, use fallback
    if (lastError) {
      const totalTime = Date.now() - startTime;
      logger.error('All AI providers failed, using fallback category', {
        contentId,
        finalError: lastError.message,
        totalAttempts: providers.length,
        fallbackCategory: this.fallbackCategory?.name,
        totalProcessingTime: totalTime
      });
      
      const fallbackResult = {
        provider: 'fallback',
        rawCategory: 'Failed Classification',
        resolvedCategory: this.fallbackCategory,
        matchType: 'error_fallback',
        confidence: 0.1,
        hints: hints.length,
        error: lastError.message,
        processingMetrics: {
          totalTime,
          hintsTime,
          providerTime: 0,
          resolutionTime: 0
        },
        processed_at: new Date().toISOString()
      };
      
      return fallbackResult;
    }
  }

  /**
   * Manage cache size
   */
  manageCacheSize() {
    if (this.classificationCache.size > 1000) {
      const firstKey = this.classificationCache.keys().next().value;
      this.classificationCache.delete(firstKey);
    }
  }

  /**
   * Create alias for raw category
   */
  async createAlias(rawCategory, categoryId) {
    try {
      await this.db.query(`
        INSERT INTO category_aliases (alias, category_id)
        VALUES ($1, $2)
        ON CONFLICT (alias) DO UPDATE SET category_id = $2
      `, [rawCategory, categoryId]);
      
      // Reload aliases
      await this.loadCategories();
      
      logger.info('Category alias created', { rawCategory, categoryId });
      return true;
    } catch (error) {
      logger.error('Failed to create alias:', error);
      throw error;
    }
  }

  /**
   * Get classification statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      categories: this.categories?.length || 0,
      matchers: this.matchers?.length || 0,
      aliases: Object.keys(this.aliases || {}).length,
      cacheSize: this.classificationCache.size,
      fallbackCategory: this.fallbackCategory?.name
    };
  }
}

module.exports = EnhancedAIClassificationService;