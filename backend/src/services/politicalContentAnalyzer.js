// Political Content Analysis Service
// Enhanced analysis for political content including bias detection, quality scoring, 
// loaded language identification, and comprehensive summary generation

const { logger } = require('../middleware/logging');
const { secureConfigService } = require('./secureConfig');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const aiClassificationService = require('./aiClassification');

/**
 * Comprehensive political content analysis service
 * Implements bias detection, quality scoring, loaded language identification,
 * source credibility assessment, and summary generation
 */
class PoliticalContentAnalyzer {
  constructor() {
    this.initialized = false;
    this.sourceCredibilityDB = new Map(); // In-memory credibility database
    this.loadedLanguagePatterns = [];
    this.initializeCredibilityDatabase();
    this.initializeLoadedLanguagePatterns();
  }

  /**
   * Initialize the analyzer with AI providers
   */
  async initialize() {
    try {
      if (!secureConfigService.initialized) {
        await secureConfigService.initialize();
      }
      
      this.initializeAIClients();
      this.initialized = true;
      logger.info('PoliticalContentAnalyzer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PoliticalContentAnalyzer:', error);
      throw error;
    }
  }

  /**
   * Initialize AI clients using secure configuration
   */
  initializeAIClients() {
    // Primary: Google Gemini
    const geminiKey = secureConfigService.getApiKey('gemini');
    if (geminiKey) {
      this.geminiClient = new GoogleGenerativeAI(geminiKey);
      this.geminiModel = this.geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
    }

    // Fallback: OpenAI
    const openaiKey = secureConfigService.getApiKey('openai');
    if (openaiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiKey });
    }

    // Secondary fallback: Anthropic
    const anthropicKey = secureConfigService.getApiKey('anthropic');
    if (anthropicKey) {
      this.anthropicClient = new Anthropic({ apiKey: anthropicKey });
    }
  }

  /**
   * Initialize source credibility database with known sources
   */
  initializeCredibilityDatabase() {
    // High credibility sources (8-10)
    const highCredibility = [
      'reuters.com', 'ap.org', 'npr.org', 'bbc.com', 'pbs.org',
      'c-span.org', 'factcheck.org', 'snopes.com', 'politifact.com'
    ];

    // Medium-high credibility (6-7.5)
    const mediumHighCredibility = [
      'washingtonpost.com', 'nytimes.com', 'wsj.com', 'economist.com',
      'theatlantic.com', 'newyorker.com', 'usatoday.com', 'abcnews.go.com',
      'cbsnews.com', 'nbcnews.com', 'cnn.com'
    ];

    // Medium credibility (4-6)
    const mediumCredibility = [
      'foxnews.com', 'msnbc.com', 'politico.com', 'thehill.com',
      'huffpost.com', 'salon.com', 'slate.com', 'vox.com'
    ];

    // Lower credibility (2-4)
    const lowerCredibility = [
      'breitbart.com', 'dailywire.com', 'thegatewaypundit.com',
      'infowars.com', 'naturalnews.com', 'zerohedge.com'
    ];

    // Populate database
    highCredibility.forEach(domain => {
      this.sourceCredibilityDB.set(domain, { score: 8.5 + Math.random() * 1.5, tier: 'high' });
    });
    
    mediumHighCredibility.forEach(domain => {
      this.sourceCredibilityDB.set(domain, { score: 6.0 + Math.random() * 1.5, tier: 'medium-high' });
    });
    
    mediumCredibility.forEach(domain => {
      this.sourceCredibilityDB.set(domain, { score: 4.0 + Math.random() * 2.0, tier: 'medium' });
    });
    
    lowerCredibility.forEach(domain => {
      this.sourceCredibilityDB.set(domain, { score: 2.0 + Math.random() * 2.0, tier: 'low' });
    });
  }

  /**
   * Initialize loaded language detection patterns
   */
  initializeLoadedLanguagePatterns() {
    this.loadedLanguagePatterns = [
      // Highly charged political terms
      { pattern: /\b(radical|extremist|terrorist|fascist|communist|socialist)\b/gi, weight: 0.9, category: 'political_labels' },
      { pattern: /\b(destroy|demolish|annihilate|obliterate|devastate)\b/gi, weight: 0.8, category: 'destructive_verbs' },
      { pattern: /\b(fake news|propaganda|brainwash|indoctrinate)\b/gi, weight: 0.8, category: 'media_attacks' },
      
      // Emotional manipulation
      { pattern: /\b(outrageous|shocking|devastating|catastrophic|alarming)\b/gi, weight: 0.7, category: 'emotional_intensifiers' },
      { pattern: /\b(betrayal|conspiracy|scandal|corruption|cover-up)\b/gi, weight: 0.8, category: 'accusatory_terms' },
      
      // Us vs them language
      { pattern: /\b(real Americans|patriots|traitors|enemies of the people)\b/gi, weight: 0.9, category: 'divisive_identity' },
      { pattern: /\b(they want to|they're trying to|their agenda)\b/gi, weight: 0.6, category: 'othering_language' },
      
      // Hyperbolic language
      { pattern: /\b(always|never|every single|completely|totally|absolutely)\b/gi, weight: 0.5, category: 'absolutes' },
      { pattern: /\b(disaster|crisis|emergency|urgent|critical)\b/gi, weight: 0.6, category: 'crisis_language' }
    ];
  }

  /**
   * Analyze political bias of content
   * @param {Object} content - Content object with title and text
   * @returns {Promise<Object>} Bias analysis result
   */
  async analyzeBias(content) {
    const prompt = this.constructBiasAnalysisPrompt(content);
    
    // Try providers in order with fallback
    const providers = [
      { name: 'gemini', client: this.geminiModel, method: 'analyzeBiasWithGemini' },
      { name: 'openai', client: this.openaiClient, method: 'analyzeBiasWithOpenAI' },
      { name: 'anthropic', client: this.anthropicClient, method: 'analyzeBiasWithAnthropic' }
    ].filter(p => p.client);

    if (providers.length === 0) {
      throw new Error('No AI providers available for bias analysis');
    }

    let lastError;
    for (const provider of providers) {
      try {
        logger.info(`Attempting bias analysis with ${provider.name}`);
        const result = await this[provider.method](prompt);
        
        return {
          bias_score: result.biasScore,
          bias_confidence: result.confidence,
          bias_label: result.biasLabel,
          reasoning: result.reasoning,
          provider: result.provider
        };
      } catch (error) {
        lastError = error;
        logger.warn(`Bias analysis failed with ${provider.name}, trying next provider:`, error.message);
        
        // If this is a rate limit error and we have more providers, continue
        if (error.status === 429 && provider !== providers[providers.length - 1]) {
          continue;
        }
        
        // If this is the last provider or a non-retryable error, throw
        if (provider === providers[providers.length - 1]) {
          logger.error('All providers failed for bias analysis:', error);
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Score content quality on 1-10 scale
   * @param {Object} content - Content object
   * @returns {Promise<Object>} Quality score result
   */
  async scoreQuality(content) {
    const prompt = this.constructQualityPrompt(content);
    
    // Try providers in order with fallback
    const providers = [
      { name: 'gemini', client: this.geminiModel, method: 'scoreQualityWithGemini' },
      { name: 'openai', client: this.openaiClient, method: 'scoreQualityWithOpenAI' },
      { name: 'anthropic', client: this.anthropicClient, method: 'scoreQualityWithAnthropic' }
    ].filter(p => p.client);

    if (providers.length === 0) {
      throw new Error('No AI providers available for quality scoring');
    }

    let lastError;
    for (const provider of providers) {
      try {
        logger.info(`Attempting quality scoring with ${provider.name}`);
        const result = await this[provider.method](prompt);
        
        return {
          quality_score: result.qualityScore,
          reasoning: result.reasoning,
          factors: result.factors,
          provider: result.provider
        };
      } catch (error) {
        lastError = error;
        logger.warn(`Quality scoring failed with ${provider.name}, trying next provider:`, error.message);
        
        // If this is a rate limit error and we have more providers, continue
        if (error.status === 429 && provider !== providers[providers.length - 1]) {
          continue;
        }
        
        // If this is the last provider or a non-retryable error, throw
        if (provider === providers[providers.length - 1]) {
          logger.error('All providers failed for quality scoring:', error);
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Detect loaded language in content
   * @param {Object} content - Content object
   * @returns {Object} Loaded language detection result
   */
  detectLoadedLanguage(content) {
    const text = `${content.title} ${content.raw_content || content.text || ''}`;
    const detectedPhrases = [];
    let totalWeight = 0;

    this.loadedLanguagePatterns.forEach(({ pattern, weight, category }) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          detectedPhrases.push({
            phrase: match,
            category,
            weight,
            context: this.extractContext(text, match)
          });
          totalWeight += weight;
        });
      }
    });

    // Calculate loaded language score (0-1)
    const wordCount = text.split(/\s+/).length;
    const loadedLanguageScore = Math.min(1.0, totalWeight / Math.max(wordCount / 100, 1));

    return {
      loaded_language: detectedPhrases,
      loaded_language_score: loadedLanguageScore,
      analysis: {
        total_phrases: detectedPhrases.length,
        total_weight: totalWeight,
        word_count: wordCount,
        intensity: this.categorizeLoadedLanguageIntensity(loadedLanguageScore)
      }
    };
  }

  /**
   * Assess source credibility
   * @param {string} domain - Source domain
   * @returns {Object} Credibility assessment
   */
  assessSourceCredibility(domain) {
    const cleanDomain = domain.toLowerCase().replace(/^www\./, '');
    const credibilityData = this.sourceCredibilityDB.get(cleanDomain);
    
    if (credibilityData) {
      return {
        credibility_score: credibilityData.score,
        tier: credibilityData.tier,
        known_source: true,
        reasoning: `Known source in ${credibilityData.tier} credibility tier`
      };
    }

    // Unknown source - assign neutral score with uncertainty
    const neutralScore = 5.0;
    return {
      credibility_score: neutralScore,
      tier: 'unknown',
      known_source: false,
      reasoning: 'Unknown source - assigned neutral credibility score'
    };
  }

  /**
   * Generate comprehensive summaries
   * @param {Object} content - Content object
   * @returns {Promise<Object>} Summary generation result
   */
  async generateSummaries(content) {
    const prompt = this.constructSummaryPrompt(content);
    
    // Try providers in order with fallback
    const providers = [
      { name: 'gemini', client: this.geminiModel, method: 'generateSummariesWithGemini' },
      { name: 'openai', client: this.openaiClient, method: 'generateSummariesWithOpenAI' },
      { name: 'anthropic', client: this.anthropicClient, method: 'generateSummariesWithAnthropic' }
    ].filter(p => p.client);

    if (providers.length === 0) {
      throw new Error('No AI providers available for summary generation');
    }

    let lastError;
    for (const provider of providers) {
      try {
        logger.info(`Attempting summary generation with ${provider.name}`);
        const result = await this[provider.method](prompt);
        
        return {
          summary_executive: result.executiveSummary,
          summary_detailed: result.detailedSummary,
          key_points: result.keyPoints,
          implications: result.implications,
          provider: result.provider
        };
      } catch (error) {
        lastError = error;
        logger.warn(`Summary generation failed with ${provider.name}, trying next provider:`, error.message);
        
        // If this is a rate limit error and we have more providers, continue
        if (error.status === 429 && provider !== providers[providers.length - 1]) {
          continue;
        }
        
        // If this is the last provider or a non-retryable error, throw
        if (provider === providers[providers.length - 1]) {
          logger.error('All providers failed for summary generation:', error);
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Comprehensive political content analysis
   * @param {Object} content - Content object
   * @returns {Promise<Object>} Complete analysis result
   */
  async analyzeContent(content) {
    if (!this.initialized) {
      await this.initialize();
    }

    logger.info('Starting comprehensive political content analysis', {
      title: content.title?.substring(0, 100),
      source: content.source_domain
    });

    try {
      // Run analyses in parallel for efficiency
      const [
        biasResult,
        qualityResult,
        loadedLanguageResult,
        credibilityResult,
        summaryResult
      ] = await Promise.all([
        this.analyzeBias(content),
        this.scoreQuality(content),
        Promise.resolve(this.detectLoadedLanguage(content)),
        Promise.resolve(this.assessSourceCredibility(content.source_domain)),
        this.generateSummaries(content)
      ]);

      const analysisResult = {
        ...biasResult,
        ...qualityResult,
        ...loadedLanguageResult,
        ...credibilityResult,
        ...summaryResult,
        processing_model: biasResult.provider,
        analysis_timestamp: new Date().toISOString()
      };

      logger.info('Political content analysis completed', {
        bias_label: analysisResult.bias_label,
        quality_score: analysisResult.quality_score,
        credibility_score: analysisResult.credibility_score,
        loaded_phrases: analysisResult.loaded_language?.length || 0
      });

      return analysisResult;
    } catch (error) {
      logger.error('Political content analysis failed:', error);
      throw error;
    }
  }

  // Helper methods for prompt construction and response parsing will be implemented next...
  
  /**
   * Construct bias analysis prompt
   */
  constructBiasAnalysisPrompt(content) {
    return `You are a content analysis AI that ONLY responds with valid JSON. No explanations, no markdown, no extra text.

Analyze the political bias of this content. Respond with a JSON object containing:
- biasScore: number from -1.0 (left-leaning) to +1.0 (right-leaning), 0 is neutral
- biasLabel: "left", "center", or "right"
- confidence: confidence score 0.0-1.0
- reasoning: brief explanation

Example:
Input: "Biden Administration Expands Climate Programs"
Output: {"biasScore": -0.3, "biasLabel": "left", "confidence": 0.8, "reasoning": "Neutral reporting but positive framing of progressive climate policy"}

Content to analyze:
Title: ${content.title}
Source: ${content.source_domain}
Text: ${(content.raw_content || content.text || '').substring(0, 2000)}

Respond only with valid JSON.`;
  }

  /**
   * Construct quality scoring prompt
   */
  constructQualityPrompt(content) {
    return `You are a content analysis AI that ONLY responds with valid JSON. No explanations, no markdown, no extra text.

Score the quality of this political content on a scale of 1-10. Consider:
- Factual accuracy and sourcing
- Writing quality and clarity
- Objectivity vs opinion
- Evidence and citations
- Logical reasoning

Example:
Input: "Supreme Court Ruling Expected Next Week"
Output: {"qualityScore": 7, "reasoning": "Clear reporting with proper attribution, lacks detailed analysis", "factors": ["clear_writing", "proper_sourcing", "lacks_depth"]}

Content:
Title: ${content.title}
Source: ${content.source_domain}
Text: ${(content.raw_content || content.text || '').substring(0, 2000)}

Respond only with valid JSON.`;
  }

  /**
   * Construct summary generation prompt
   */
  constructSummaryPrompt(content) {
    return `You are a content analysis AI that ONLY responds with valid JSON. No explanations, no markdown, no extra text.

Generate comprehensive summaries for this political content. Respond with JSON:
- executiveSummary: 50-100 words, key points only
- detailedSummary: 200-300 words, comprehensive overview
- keyPoints: array of 5-10 bullet point strings
- implications: 100-200 words on potential impact/significance

Example:
Input: "Senate Passes Infrastructure Bill"
Output: {"executiveSummary": "Senate approves $1.2T infrastructure package with bipartisan support, focusing on roads, bridges, and broadband expansion.", "detailedSummary": "The Senate passed a comprehensive infrastructure bill...", "keyPoints": ["$1.2 trillion total funding", "Bipartisan support achieved", "Focus on traditional infrastructure"], "implications": "This legislation could significantly impact economic growth and job creation..."}

Content:
Title: ${content.title}
Source: ${content.source_domain}
Text: ${(content.raw_content || content.text || '').substring(0, 3000)}

Respond only with valid JSON.`;
  }

  /**
   * Analyze bias using Gemini
   */
  async analyzeBiasWithGemini(prompt) {
    const result = await this.geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    try {
      const parsed = JSON.parse(text);
      return { ...parsed, provider: 'gemini' };
    } catch (error) {
      logger.warn('Failed to parse Gemini bias response as JSON:', text);
      return this.fallbackBiasParser(text, 'gemini');
    }
  }

  /**
   * Analyze bias using OpenAI
   */
  async analyzeBiasWithOpenAI(prompt) {
    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    
    const text = response.choices[0].message.content.trim();
    
    try {
      const parsed = JSON.parse(text);
      return { ...parsed, provider: 'openai' };
    } catch (error) {
      logger.warn('Failed to parse OpenAI bias response as JSON. Full response:', {
        prompt: prompt.substring(0, 200) + '...',
        response: text,
        error: error.message
      });
      return this.fallbackBiasParser(text, 'openai');
    }
  }

  /**
   * Analyze bias using Anthropic
   */
  async analyzeBiasWithAnthropic(prompt) {
    const response = await this.anthropicClient.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 300,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const text = response.content[0].text.trim();
    
    try {
      const parsed = JSON.parse(text);
      return { ...parsed, provider: 'anthropic' };
    } catch (error) {
      logger.warn('Failed to parse Anthropic bias response as JSON:', text);
      return this.fallbackBiasParser(text, 'anthropic');
    }
  }

  /**
   * Score quality using Gemini
   */
  async scoreQualityWithGemini(prompt) {
    const result = await this.geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    try {
      const parsed = JSON.parse(text);
      return { ...parsed, provider: 'gemini' };
    } catch (error) {
      logger.warn('Failed to parse Gemini quality response as JSON:', text);
      return this.fallbackQualityParser(text, 'gemini');
    }
  }

  /**
   * Score quality using OpenAI
   */
  async scoreQualityWithOpenAI(prompt) {
    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    
    const text = response.choices[0].message.content.trim();
    
    try {
      const parsed = JSON.parse(text);
      return { ...parsed, provider: 'openai' };
    } catch (error) {
      logger.warn('Failed to parse OpenAI quality response as JSON. Full response:', {
        prompt: prompt.substring(0, 200) + '...',
        response: text,
        error: error.message
      });
      return this.fallbackQualityParser(text, 'openai');
    }
  }

  /**
   * Score quality using Anthropic
   */
  async scoreQualityWithAnthropic(prompt) {
    const response = await this.anthropicClient.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 400,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const text = response.content[0].text.trim();
    
    try {
      const parsed = JSON.parse(text);
      return { ...parsed, provider: 'anthropic' };
    } catch (error) {
      logger.warn('Failed to parse Anthropic quality response as JSON:', text);
      return this.fallbackQualityParser(text, 'anthropic');
    }
  }

  /**
   * Generate summaries using Gemini
   */
  async generateSummariesWithGemini(prompt) {
    const result = await this.geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    try {
      const parsed = JSON.parse(text);
      return { ...parsed, provider: 'gemini' };
    } catch (error) {
      logger.warn('Failed to parse Gemini summary response as JSON:', text);
      return this.fallbackSummaryParser(text, 'gemini');
    }
  }

  /**
   * Generate summaries using OpenAI
   */
  async generateSummariesWithOpenAI(prompt) {
    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    
    const text = response.choices[0].message.content.trim();
    
    try {
      const parsed = JSON.parse(text);
      return { ...parsed, provider: 'openai' };
    } catch (error) {
      logger.warn('Failed to parse OpenAI summary response as JSON. Full response:', {
        prompt: prompt.substring(0, 200) + '...',
        response: text,
        error: error.message
      });
      return this.fallbackSummaryParser(text, 'openai');
    }
  }

  /**
   * Generate summaries using Anthropic
   */
  async generateSummariesWithAnthropic(prompt) {
    const response = await this.anthropicClient.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 800,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const text = response.content[0].text.trim();
    
    try {
      const parsed = JSON.parse(text);
      return { ...parsed, provider: 'anthropic' };
    } catch (error) {
      logger.warn('Failed to parse Anthropic summary response as JSON:', text);
      return this.fallbackSummaryParser(text, 'anthropic');
    }
  }

  /**
   * Fallback bias parser for non-JSON responses
   */
  fallbackBiasParser(text, provider) {
    const biasLabel = this.extractBiasLabel(text);
    const biasScore = this.inferBiasScore(biasLabel, text);
    
    return {
      biasScore,
      biasLabel,
      confidence: 0.6, // Lower confidence for fallback parsing
      reasoning: `Fallback parsing: ${text.substring(0, 200)}...`,
      provider
    };
  }

  /**
   * Fallback quality parser for non-JSON responses
   */
  fallbackQualityParser(text, provider) {
    const qualityScore = this.extractQualityScore(text);
    
    return {
      qualityScore,
      reasoning: `Fallback parsing: ${text.substring(0, 200)}...`,
      factors: ['fallback_analysis'],
      provider
    };
  }

  /**
   * Fallback summary parser for non-JSON responses
   */
  fallbackSummaryParser(text, provider) {
    const sentences = text.split('. ').filter(s => s.length > 10);
    
    return {
      executiveSummary: sentences.slice(0, 2).join('. '),
      detailedSummary: sentences.slice(0, 6).join('. '),
      keyPoints: sentences.slice(0, 5),
      implications: sentences.slice(-2).join('. '),
      provider
    };
  }

  /**
   * Extract bias label from text
   */
  extractBiasLabel(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('left') || lowerText.includes('liberal')) return 'left';
    if (lowerText.includes('right') || lowerText.includes('conservative')) return 'right';
    return 'center';
  }

  /**
   * Infer bias score from label and text
   */
  inferBiasScore(label, text) {
    switch (label) {
      case 'left': return -0.5 - Math.random() * 0.3;
      case 'right': return 0.5 + Math.random() * 0.3;
      default: return (Math.random() - 0.5) * 0.4; // Center with slight variation
    }
  }

  /**
   * Extract quality score from text
   */
  extractQualityScore(text) {
    const scoreMatch = text.match(/(\d+)(?:\/10|\s*out\s*of\s*10)/i);
    if (scoreMatch) {
      return parseInt(scoreMatch[1]);
    }
    
    // Fallback scoring based on quality indicators
    const lowerText = text.toLowerCase();
    let score = 5; // Base score
    
    if (lowerText.includes('excellent') || lowerText.includes('high quality')) score += 2;
    if (lowerText.includes('good') || lowerText.includes('solid')) score += 1;
    if (lowerText.includes('poor') || lowerText.includes('low quality')) score -= 2;
    if (lowerText.includes('bad') || lowerText.includes('terrible')) score -= 3;
    
    return Math.max(1, Math.min(10, score));
  }

  extractContext(text, phrase, contextLength = 50) {
    const index = text.toLowerCase().indexOf(phrase.toLowerCase());
    if (index === -1) return phrase;
    
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + phrase.length + contextLength);
    
    return text.substring(start, end);
  }

  categorizeLoadedLanguageIntensity(score) {
    if (score >= 0.8) return 'very_high';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    if (score >= 0.2) return 'low';
    return 'minimal';
  }
}

// Singleton instance
const politicalContentAnalyzer = new PoliticalContentAnalyzer();

module.exports = politicalContentAnalyzer;