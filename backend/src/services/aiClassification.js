// AI Content Classification Service
// Implements multi-provider AI classification with fallback support

const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { logger } = require('../middleware/logging');
const ContentExtractor = require('./contentExtractor');
const { secureConfigService } = require('./secureConfig');

/**
 * AI-powered content classification service
 * Classifies content into 'US Politics/News' vs 'General' categories
 */
class AIClassificationService {
  constructor() {
    this.classificationCache = new Map(); // Simple in-memory cache
    this.initialized = false;
  }

  /**
   * Initialize the service with secure configuration
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Ensure secure config is initialized
      if (!secureConfigService.initialized) {
        await secureConfigService.initialize();
      }
      
      this.initializeClients();
      this.initialized = true;
      logger.info('AIClassificationService initialized with secure configuration');
    } catch (error) {
      logger.error('Failed to initialize AIClassificationService:', error);
      throw error;
    }
  }

  /**
   * Initialize API clients for all providers using secure configuration
   */
  initializeClients() {
    // Google Gemini (Primary)
    const geminiKey = secureConfigService.getApiKey('gemini');
    if (geminiKey) {
      this.geminiClient = new GoogleGenerativeAI(geminiKey);
      this.geminiModel = this.geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
      logger.info('Gemini AI client initialized');
    } else {
      logger.warn('Gemini API key not available');
    }

    // OpenAI (Fallback)
    const openaiKey = secureConfigService.getApiKey('openai');
    if (openaiKey) {
      this.openaiClient = new OpenAI({
        apiKey: openaiKey
      });
      logger.info('OpenAI client initialized');
    } else {
      logger.warn('OpenAI API key not available');
    }

    // Anthropic (Secondary Fallback)
    const anthropicKey = secureConfigService.getApiKey('anthropic');
    if (anthropicKey) {
      this.anthropicClient = new Anthropic({
        apiKey: anthropicKey
      });
      logger.info('Anthropic client initialized');
    } else {
      logger.warn('Anthropic API key not available');
    }
  }

  /**
   * Construct classification prompt for content
   * @param {Object} content - Content object with title and text
   * @returns {string} Formatted prompt
   */
  constructClassificationPrompt(content) {
    // Use enhanced content extraction
    const extractedContent = ContentExtractor.extractForClassification(content);
    
    // Generate optimized prompt
    return ContentExtractor.generateClassificationPrompt(extractedContent);
  }

  /**
   * Classify content using Gemini API
   * @param {string} prompt - Classification prompt
   * @param {Object} extractedContent - Content analysis for confidence scoring
   * @returns {Promise<Object>} Classification result
   */
  async classifyWithGemini(prompt, extractedContent = {}) {
    if (!this.geminiModel) {
      throw new Error('Gemini client not initialized');
    }

    try {
      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      // Extract classification from response
      const classification = this.parseClassificationResponse(text);
      const confidence = this.calculateConfidenceFromGemini(text, classification, extractedContent);
      
      return {
        provider: 'gemini',
        classification,
        confidence,
        rawResponse: text
      };
    } catch (error) {
      logger.error('Gemini classification error:', error);
      throw error;
    }
  }

  /**
   * Classify content using OpenAI API
   * @param {string} prompt - Classification prompt
   * @param {Object} extractedContent - Content analysis for confidence scoring
   * @returns {Promise<Object>} Classification result
   */
  async classifyWithOpenAI(prompt, extractedContent = {}) {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a content classifier. Respond only with the exact classification category as requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      });

      const text = response.choices[0].message.content.trim();
      const classification = this.parseClassificationResponse(text);
      const confidence = this.calculateConfidenceFromOpenAI(response, classification, extractedContent);

      return {
        provider: 'openai',
        classification,
        confidence,
        rawResponse: text
      };
    } catch (error) {
      logger.error('OpenAI classification error:', error);
      throw error;
    }
  }

  /**
   * Classify content using Anthropic API
   * @param {string} prompt - Classification prompt
   * @param {Object} extractedContent - Content analysis for confidence scoring
   * @returns {Promise<Object>} Classification result
   */
  async classifyWithAnthropic(prompt, extractedContent = {}) {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      const response = await this.anthropicClient.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 50,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const text = response.content[0].text.trim();
      const classification = this.parseClassificationResponse(text);
      const confidence = this.calculateConfidenceFromAnthropic(response, classification, extractedContent);

      return {
        provider: 'anthropic',
        classification,
        confidence,
        rawResponse: text
      };
    } catch (error) {
      logger.error('Anthropic classification error:', error);
      throw error;
    }
  }

  /**
   * Parse classification response from AI models
   * @param {string} response - Raw AI response
   * @returns {string} Parsed classification
   */
  parseClassificationResponse(response) {
    const cleanResponse = response.toUpperCase().trim();
    
    if (cleanResponse.includes('US_POLITICS_NEWS') || 
        cleanResponse.includes('US POLITICS') ||
        cleanResponse === 'US_POLITICS_NEWS') {
      return 'US_Politics_News';
    }
    
    if (cleanResponse.includes('GENERAL') || cleanResponse === 'GENERAL') {
      return 'General';
    }
    
    // If unclear, default to General and log for review
    logger.warn('Unclear classification response:', response);
    return 'General';
  }

  /**
   * Calculate confidence score from Gemini response with enhanced analysis
   * @param {string} text - Response text
   * @param {string} classification - Parsed classification
   * @param {Object} extractedContent - Content analysis signals
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidenceFromGemini(text, classification, extractedContent = {}) {
    let confidence = 0.5; // Base confidence
    
    // Response clarity analysis
    const responseLength = text.length;
    const cleanText = text.toUpperCase().trim();
    const hasValidCategory = ['US_POLITICS_NEWS', 'GENERAL'].some(cat => 
      cleanText.includes(cat)
    );
    
    if (!hasValidCategory) {
      confidence = 0.2; // Very low confidence for unclear responses
    } else {
      // Direct, concise response increases confidence
      if (responseLength < 30 && (cleanText === 'US_POLITICS_NEWS' || cleanText === 'GENERAL')) {
        confidence = 0.95;
      } else if (responseLength < 50) {
        confidence = 0.9;
      } else if (responseLength > 200) {
        confidence = 0.6; // Long explanations suggest uncertainty
      } else {
        confidence = 0.8;
      }
    }
    
    // Content signal validation
    confidence = this.adjustConfidenceWithContentSignals(confidence, classification, extractedContent);
    
    // Gemini-specific confidence indicators
    if (text.includes('uncertain') || text.includes('unclear') || text.includes('maybe')) {
      confidence *= 0.7;
    }
    
    if (text.includes('definitely') || text.includes('clearly') || text.includes('obviously')) {
      confidence *= 1.1;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Calculate confidence score from OpenAI response with enhanced analysis
   * @param {Object} response - OpenAI response object
   * @param {string} classification - Parsed classification
   * @param {Object} extractedContent - Content analysis signals
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidenceFromOpenAI(response, classification, extractedContent = {}) {
    const choice = response.choices[0];
    let confidence = 0.5;
    
    // Finish reason analysis
    switch (choice.finish_reason) {
      case 'stop':
        confidence = 0.9; // Completed normally
        break;
      case 'length':
        confidence = 0.7; // Hit token limit
        break;
      case 'content_filter':
        confidence = 0.3; // Content filtered
        break;
      default:
        confidence = 0.6;
    }
    
    // Response characteristics
    const text = choice.message.content.trim();
    const responseLength = text.length;
    
    // Direct, clean response increases confidence
    if (responseLength < 30 && ['US_POLITICS_NEWS', 'GENERAL'].includes(text.toUpperCase())) {
      confidence = Math.max(confidence, 0.95);
    } else if (responseLength > 100) {
      confidence *= 0.8; // Verbose responses suggest uncertainty
    }
    
    // Token usage efficiency (lower usage for simple classification suggests confidence)
    if (response.usage) {
      const tokenEfficiency = response.usage.completion_tokens / 50; // Expected ~10-20 tokens
      if (tokenEfficiency < 0.5) {
        confidence *= 1.1; // Efficient, direct response
      } else if (tokenEfficiency > 2) {
        confidence *= 0.9; // Verbose response
      }
    }
    
    // Content signal validation
    confidence = this.adjustConfidenceWithContentSignals(confidence, classification, extractedContent);
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Calculate confidence score from Anthropic response with enhanced analysis
   * @param {Object} response - Anthropic response object
   * @param {string} classification - Parsed classification
   * @param {Object} extractedContent - Content analysis signals
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidenceFromAnthropic(response, classification, extractedContent = {}) {
    const content = response.content[0];
    const text = content.text.trim();
    let confidence = 0.5;
    
    // Response clarity analysis
    const responseLength = text.length;
    const cleanText = text.toUpperCase();
    
    // Direct classification response
    if (responseLength < 30 && ['US_POLITICS_NEWS', 'GENERAL'].some(cat => 
      cleanText.includes(cat)
    )) {
      confidence = 0.95;
    } else if (responseLength < 50) {
      confidence = 0.9;
    } else if (responseLength > 150) {
      confidence = 0.7; // Verbose responses suggest uncertainty
    } else {
      confidence = 0.85;
    }
    
    // Stop reason analysis (if available)
    if (response.stop_reason === 'end_turn') {
      confidence *= 1.05; // Clean completion
    } else if (response.stop_reason === 'max_tokens') {
      confidence *= 0.9; // Hit token limit
    }
    
    // Usage efficiency
    if (response.usage) {
      const outputTokens = response.usage.output_tokens;
      if (outputTokens < 20) {
        confidence *= 1.1; // Efficient response
      } else if (outputTokens > 50) {
        confidence *= 0.9; // Verbose response
      }
    }
    
    // Content signal validation
    confidence = this.adjustConfidenceWithContentSignals(confidence, classification, extractedContent);
    
    // Anthropic-specific confidence indicators
    if (text.includes('I\'m not sure') || text.includes('uncertain') || text.includes('difficult to classify')) {
      confidence *= 0.6;
    }
    
    if (text.includes('clearly') || text.includes('definitely') || text.includes('obviously')) {
      confidence *= 1.1;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Adjust confidence based on content analysis signals
   * @param {number} baseConfidence - Base confidence from provider
   * @param {string} classification - Predicted classification
   * @param {Object} extractedContent - Content analysis signals
   * @returns {number} Adjusted confidence score
   */
  adjustConfidenceWithContentSignals(baseConfidence, classification, extractedContent) {
    if (!extractedContent.signals) {
      return baseConfidence;
    }
    
    const { signals, domainContext, urlContext } = extractedContent;
    let adjustment = 1.0;
    
    if (classification === 'US_Politics_News') {
      // Positive signals for political classification
      if (signals.politicalKeywordDensity > 0.05) adjustment *= 1.2;
      if (signals.hasUSIndicators) adjustment *= 1.1;
      if (signals.hasGovernmentEntities) adjustment *= 1.1;
      if (domainContext?.isDomainPolitical) adjustment *= 1.3;
      if (urlContext?.politicalScore > 2) adjustment *= 1.2;
      
      // Negative signals
      if (signals.politicalKeywordDensity < 0.01) adjustment *= 0.7;
      if (!signals.hasUSIndicators && domainContext?.tech) adjustment *= 0.8;
    } else {
      // General classification validation
      if (signals.politicalKeywordDensity > 0.1) adjustment *= 0.6; // High political content classified as general
      if (domainContext?.isDomainPolitical && signals.hasUSIndicators) adjustment *= 0.5;
      if (urlContext?.politicalScore > 3) adjustment *= 0.7;
      
      // Positive signals for general classification
      if (signals.politicalKeywordDensity < 0.02) adjustment *= 1.1;
      if (domainContext?.tech || domainContext?.social) adjustment *= 1.1;
    }
    
    return Math.max(0.1, Math.min(1.0, baseConfidence * adjustment));
  }

  /**
   * Validate classification consistency across multiple attempts
   * @param {Array} results - Array of classification results
   * @returns {Object} Consensus result with confidence
   */
  validateClassificationConsistency(results) {
    if (results.length === 0) {
      throw new Error('No classification results to validate');
    }
    
    if (results.length === 1) {
      return results[0];
    }
    
    // Count classifications
    const classifications = {};
    results.forEach(result => {
      const cls = result.classification;
      if (!classifications[cls]) {
        classifications[cls] = [];
      }
      classifications[cls].push(result);
    });
    
    // Find consensus
    const consensusClass = Object.keys(classifications)
      .reduce((a, b) => classifications[a].length > classifications[b].length ? a : b);
    
    const consensusResults = classifications[consensusClass];
    const consensusRatio = consensusResults.length / results.length;
    
    // Calculate average confidence for consensus
    const avgConfidence = consensusResults.reduce((sum, r) => sum + r.confidence, 0) / consensusResults.length;
    
    // Adjust confidence based on consensus strength
    let finalConfidence = avgConfidence;
    if (consensusRatio === 1.0) {
      finalConfidence = Math.min(1.0, avgConfidence * 1.2); // All providers agree
    } else if (consensusRatio >= 0.67) {
      finalConfidence = avgConfidence; // Majority agreement
    } else {
      finalConfidence = Math.max(0.3, avgConfidence * 0.7); // Split decision
    }
    
    return {
      classification: consensusClass,
      confidence: finalConfidence,
      consensus: {
        ratio: consensusRatio,
        providers: consensusResults.map(r => r.provider),
        alternativeViews: Object.keys(classifications).filter(c => c !== consensusClass)
      },
      provider: 'consensus',
      rawResponse: `Consensus from ${consensusResults.length}/${results.length} providers`
    };
  }

  /**
   * Main classification method with enhanced confidence scoring
   * @param {Object} content - Content to classify
   * @param {Object} options - Classification options
   * @returns {Promise<Object>} Classification result
   */
  async classifyContent(content, options = {}) {
    const { title, raw_content: text, url, source_domain, content_hash } = content;
    const { useConsensus = false, minConfidence = 0.5 } = options;
    
    // Check cache first
    if (content_hash && this.classificationCache.has(content_hash)) {
      const cached = this.classificationCache.get(content_hash);
      logger.info('Classification cache hit', { content_hash });
      return { ...cached, fromCache: true };
    }

    // Extract content for analysis
    const extractedContent = ContentExtractor.extractForClassification({
      title,
      raw_content: text,
      url,
      source_domain
    });
    
    const prompt = this.constructClassificationPrompt(extractedContent);

    const providers = [];
    if (this.geminiModel) providers.push('gemini');
    if (this.openaiClient) providers.push('openai');
    if (this.anthropicClient) providers.push('anthropic');

    if (providers.length === 0) {
      throw new Error('No AI providers available');
    }

    let results = [];
    let lastError;
    
    // Try each provider
    for (const provider of providers) {
      try {
        let result;
        
        switch (provider) {
          case 'gemini':
            result = await this.classifyWithGemini(prompt, extractedContent);
            break;
          case 'openai':
            result = await this.classifyWithOpenAI(prompt, extractedContent);
            break;
          case 'anthropic':
            result = await this.classifyWithAnthropic(prompt, extractedContent);
            break;
        }

        results.push(result);
        
        // If not using consensus and confidence is high enough, return immediately
        if (!useConsensus && result.confidence >= minConfidence) {
          // Cache successful result
          if (content_hash) {
            this.classificationCache.set(content_hash, result);
            this.manageCacheSize();
          }

          logger.info('Content classified successfully', {
            provider: result.provider,
            classification: result.classification,
            confidence: result.confidence,
            content_hash
          });

          return result;
        }
        
      } catch (error) {
        lastError = error;
        logger.warn(`Classification failed with ${provider}:`, error.message);
        
        // If not using consensus, continue to next provider
        if (!useConsensus) {
          continue;
        }
      }
      
      // For consensus mode, try all providers regardless of individual confidence
      if (useConsensus && results.length >= 2) {
        break; // We have enough for consensus
      }
    }

    // Process results
    if (results.length === 0) {
      logger.error('All AI providers failed for classification', lastError);
      throw new Error(`Classification failed: ${lastError.message}`);
    }
    
    let finalResult;
    if (useConsensus && results.length > 1) {
      finalResult = this.validateClassificationConsistency(results);
    } else {
      finalResult = results[0]; // Use first successful result
    }
    
    // Check if confidence meets minimum threshold
    if (finalResult.confidence < minConfidence) {
      finalResult.needsManualReview = true;
      logger.warn('Classification confidence below threshold', {
        confidence: finalResult.confidence,
        minConfidence,
        classification: finalResult.classification
      });
    }

    // Cache successful result
    if (content_hash) {
      this.classificationCache.set(content_hash, finalResult);
      this.manageCacheSize();
    }

    logger.info('Content classification completed', {
      provider: finalResult.provider,
      classification: finalResult.classification,
      confidence: finalResult.confidence,
      needsManualReview: finalResult.needsManualReview || false,
      content_hash
    });

    return finalResult;
  }

  /**
   * Manage cache size to prevent memory issues
   */
  manageCacheSize() {
    if (this.classificationCache.size > 1000) {
      const firstKey = this.classificationCache.keys().next().value;
      this.classificationCache.delete(firstKey);
    }
  }

  /**
   * Get classification statistics
   * @returns {Object} Statistics about classification usage
   */
  getStats() {
    return {
      cacheSize: this.classificationCache.size,
      availableProviders: {
        gemini: !!this.geminiModel,
        openai: !!this.openaiClient,
        anthropic: !!this.anthropicClient
      }
    };
  }

  /**
   * Clear classification cache
   */
  clearCache() {
    this.classificationCache.clear();
    logger.info('Classification cache cleared');
  }

  /**
   * Test connectivity to all configured providers
   * @returns {Promise<Object>} Test results
   */
  async testConnectivity() {
    const results = {};
    
    const testContent = {
      title: 'Test Article',
      text: 'This is a test article for connectivity.',
      url: 'https://example.com/test',
      source_domain: 'example.com'
    };
    
    const prompt = this.constructClassificationPrompt(testContent);
    
    // Test Gemini
    if (this.geminiModel) {
      try {
        await this.classifyWithGemini(prompt);
        results.gemini = { status: 'connected', error: null };
      } catch (error) {
        results.gemini = { status: 'error', error: error.message };
      }
    } else {
      results.gemini = { status: 'not_configured', error: 'API key not provided' };
    }
    
    // Test OpenAI
    if (this.openaiClient) {
      try {
        await this.classifyWithOpenAI(prompt);
        results.openai = { status: 'connected', error: null };
      } catch (error) {
        results.openai = { status: 'error', error: error.message };
      }
    } else {
      results.openai = { status: 'not_configured', error: 'API key not provided' };
    }
    
    // Test Anthropic
    if (this.anthropicClient) {
      try {
        await this.classifyWithAnthropic(prompt);
        results.anthropic = { status: 'connected', error: null };
      } catch (error) {
        results.anthropic = { status: 'error', error: error.message };
      }
    } else {
      results.anthropic = { status: 'not_configured', error: 'API key not provided' };
    }
    
    return results;
  }
}

// Singleton instance
const aiClassificationService = new AIClassificationService();

module.exports = aiClassificationService;