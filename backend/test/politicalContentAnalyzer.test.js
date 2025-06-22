// Test suite for Political Content Analyzer
// Comprehensive tests for bias detection, quality scoring, loaded language detection,
// source credibility assessment, and summary generation

const politicalContentAnalyzer = require('../src/services/politicalContentAnalyzer');
const { secureConfigService } = require('../src/services/secureConfig');

describe('PoliticalContentAnalyzer', () => {
  beforeEach(() => {
    // Mock secure config service
    jest.spyOn(secureConfigService, 'initialize').mockResolvedValue();
    jest.spyOn(secureConfigService, 'getApiKey').mockImplementation((provider) => {
      const keys = {
        'gemini': 'test-gemini-key',
        'openai': 'test-openai-key',
        'anthropic': 'test-anthropic-key'
      };
      return keys[provider];
    });
    
    // Reset analyzer state
    politicalContentAnalyzer.initialized = false;
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Source Credibility Assessment', () => {
    it('should assign high credibility to known reliable sources', () => {
      const result = politicalContentAnalyzer.assessSourceCredibility('reuters.com');
      
      expect(result.credibility_score).toBeGreaterThan(8.0);
      expect(result.tier).toBe('high');
      expect(result.known_source).toBe(true);
    });

    it('should assign medium-high credibility to mainstream news sources', () => {
      const result = politicalContentAnalyzer.assessSourceCredibility('washingtonpost.com');
      
      expect(result.credibility_score).toBeGreaterThan(6.0);
      expect(result.credibility_score).toBeLessThan(8.0);
      expect(result.tier).toBe('medium-high');
      expect(result.known_source).toBe(true);
    });

    it('should assign lower credibility to known problematic sources', () => {
      const result = politicalContentAnalyzer.assessSourceCredibility('infowars.com');
      
      expect(result.credibility_score).toBeLessThan(5.0);
      expect(result.tier).toBe('low');
      expect(result.known_source).toBe(true);
    });

    it('should assign neutral credibility to unknown sources', () => {
      const result = politicalContentAnalyzer.assessSourceCredibility('unknown-news-site.com');
      
      expect(result.credibility_score).toBe(5.0);
      expect(result.tier).toBe('unknown');
      expect(result.known_source).toBe(false);
    });

    it('should handle www prefix correctly', () => {
      const result1 = politicalContentAnalyzer.assessSourceCredibility('www.reuters.com');
      const result2 = politicalContentAnalyzer.assessSourceCredibility('reuters.com');
      
      expect(result1.credibility_score).toBe(result2.credibility_score);
      expect(result1.tier).toBe(result2.tier);
    });
  });

  describe('Loaded Language Detection', () => {
    it('should detect political labels', () => {
      const content = {
        title: 'Radical Extremist Policies Threaten Democracy',
        raw_content: 'These socialist policies are destroying America with their fascist approach.'
      };
      
      const result = politicalContentAnalyzer.detectLoadedLanguage(content);
      
      expect(result.loaded_language.length).toBeGreaterThan(0);
      expect(result.loaded_language_score).toBeGreaterThan(0.1);
      
      const categories = result.loaded_language.map(item => item.category);
      expect(categories).toContain('political_labels');
    });

    it('should detect emotional intensifiers', () => {
      const content = {
        title: 'Shocking Revelation About Devastating Policy',
        raw_content: 'This outrageous decision is absolutely catastrophic for the nation.'
      };
      
      const result = politicalContentAnalyzer.detectLoadedLanguage(content);
      
      expect(result.loaded_language.length).toBeGreaterThan(0);
      const categories = result.loaded_language.map(item => item.category);
      expect(categories).toContain('emotional_intensifiers');
    });

    it('should detect us vs them language', () => {
      const content = {
        title: 'Real Americans vs The Enemy',
        raw_content: 'Patriots must stand against those who want to destroy our values.'
      };
      
      const result = politicalContentAnalyzer.detectLoadedLanguage(content);
      
      expect(result.loaded_language.length).toBeGreaterThan(0);
      const categories = result.loaded_language.map(item => item.category);
      expect(['divisive_identity', 'othering_language'].some(cat => categories.includes(cat))).toBe(true);
    });

    it('should provide context for detected phrases', () => {
      const content = {
        title: 'Test Article',
        raw_content: 'The radical policies implemented by the extremist government are devastating.'
      };
      
      const result = politicalContentAnalyzer.detectLoadedLanguage(content);
      
      expect(result.loaded_language[0]).toHaveProperty('context');
      expect(typeof result.loaded_language[0].context).toBe('string');
      expect(result.loaded_language[0].context.length).toBeGreaterThan(0);
    });

    it('should handle content with no loaded language', () => {
      const content = {
        title: 'Weather Update for Tomorrow',
        raw_content: 'The forecast indicates sunny skies with mild temperatures across the region.'
      };
      
      const result = politicalContentAnalyzer.detectLoadedLanguage(content);
      
      expect(result.loaded_language).toHaveLength(0);
      expect(result.loaded_language_score).toBe(0);
      expect(result.analysis.intensity).toBe('minimal');
    });

    it('should categorize intensity levels correctly', () => {
      expect(politicalContentAnalyzer.categorizeLoadedLanguageIntensity(0.9)).toBe('very_high');
      expect(politicalContentAnalyzer.categorizeLoadedLanguageIntensity(0.7)).toBe('high');
      expect(politicalContentAnalyzer.categorizeLoadedLanguageIntensity(0.5)).toBe('medium');
      expect(politicalContentAnalyzer.categorizeLoadedLanguageIntensity(0.3)).toBe('low');
      expect(politicalContentAnalyzer.categorizeLoadedLanguageIntensity(0.1)).toBe('minimal');
    });
  });

  describe('Fallback Parsers', () => {
    it('should parse bias from non-JSON text', () => {
      const text = 'This article shows a clear left-leaning bias in its presentation.';
      const result = politicalContentAnalyzer.fallbackBiasParser(text, 'test');
      
      expect(result.biasLabel).toBe('left');
      expect(result.biasScore).toBeLessThan(0);
      expect(result.confidence).toBe(0.6);
      expect(result.provider).toBe('test');
    });

    it('should extract quality scores from text', () => {
      expect(politicalContentAnalyzer.extractQualityScore('The quality is 8/10')).toBe(8);
      expect(politicalContentAnalyzer.extractQualityScore('Score: 7 out of 10')).toBe(7);
      expect(politicalContentAnalyzer.extractQualityScore('excellent quality')).toBeGreaterThan(6);
      expect(politicalContentAnalyzer.extractQualityScore('poor quality')).toBeLessThan(4);
    });

    it('should handle bias label extraction', () => {
      expect(politicalContentAnalyzer.extractBiasLabel('left-leaning article')).toBe('left');
      expect(politicalContentAnalyzer.extractBiasLabel('conservative viewpoint')).toBe('right');
      expect(politicalContentAnalyzer.extractBiasLabel('liberal perspective')).toBe('left');
      expect(politicalContentAnalyzer.extractBiasLabel('neutral coverage')).toBe('center');
    });

    it('should generate summaries from plain text', () => {
      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. Sixth sentence.';
      const result = politicalContentAnalyzer.fallbackSummaryParser(text, 'test');
      
      expect(result.executiveSummary).toContain('First sentence');
      expect(result.detailedSummary).toContain('First sentence');
      expect(Array.isArray(result.keyPoints)).toBe(true);
      expect(result.keyPoints.length).toBeGreaterThan(0);
      expect(result.provider).toBe('test');
    });
  });

  describe('Context Extraction', () => {
    it('should extract context around phrases', () => {
      const text = 'This is a long text with a specific phrase in the middle of the content.';
      const phrase = 'specific phrase';
      
      const context = politicalContentAnalyzer.extractContext(text, phrase, 20);
      
      expect(context).toContain(phrase);
      expect(context.length).toBeGreaterThan(phrase.length);
    });

    it('should handle phrases not found in text', () => {
      const text = 'This is some text.';
      const phrase = 'missing phrase';
      
      const context = politicalContentAnalyzer.extractContext(text, phrase);
      
      expect(context).toBe(phrase);
    });

    it('should respect context length limits', () => {
      const text = 'a'.repeat(1000);
      const phrase = 'specific';
      const contextText = text + phrase + text;
      
      const context = politicalContentAnalyzer.extractContext(contextText, phrase, 10);
      
      expect(context.length).toBeLessThan(50); // phrase + 2*contextLength + some buffer
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      await politicalContentAnalyzer.initialize();
      
      expect(politicalContentAnalyzer.initialized).toBe(true);
      expect(secureConfigService.initialize).toHaveBeenCalledTimes(1);
    });

    it('should handle missing API keys gracefully', async () => {
      secureConfigService.getApiKey.mockReturnValue(null);
      
      await politicalContentAnalyzer.initialize();
      
      expect(politicalContentAnalyzer.initialized).toBe(true);
    });
  });

  describe('Database Integration', () => {
    it('should have credibility database populated', () => {
      expect(politicalContentAnalyzer.sourceCredibilityDB.size).toBeGreaterThan(0);
      
      // Test a few known entries
      expect(politicalContentAnalyzer.sourceCredibilityDB.has('reuters.com')).toBe(true);
      expect(politicalContentAnalyzer.sourceCredibilityDB.has('infowars.com')).toBe(true);
      expect(politicalContentAnalyzer.sourceCredibilityDB.has('washingtonpost.com')).toBe(true);
    });

    it('should have loaded language patterns configured', () => {
      expect(Array.isArray(politicalContentAnalyzer.loadedLanguagePatterns)).toBe(true);
      expect(politicalContentAnalyzer.loadedLanguagePatterns.length).toBeGreaterThan(0);
      
      // Check pattern structure
      const pattern = politicalContentAnalyzer.loadedLanguagePatterns[0];
      expect(pattern).toHaveProperty('pattern');
      expect(pattern).toHaveProperty('weight');
      expect(pattern).toHaveProperty('category');
    });
  });

  describe('Error Handling', () => {
    it('should validate content input', () => {
      expect(() => {
        politicalContentAnalyzer.detectLoadedLanguage({});
      }).not.toThrow();
      
      expect(() => {
        politicalContentAnalyzer.detectLoadedLanguage(null);
      }).toThrow();
    });
  });

  describe('Performance', () => {
    it('should complete loaded language detection quickly', () => {
      const start = Date.now();
      const content = {
        title: 'Test Article with Some Political Language',
        raw_content: 'This radical policy is absolutely devastating to our democracy.'
      };
      
      politicalContentAnalyzer.detectLoadedLanguage(content);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle large content efficiently', () => {
      const start = Date.now();
      const largeContent = {
        title: 'Large Article',
        raw_content: 'word '.repeat(10000) + 'radical extremist policies'
      };
      
      const result = politicalContentAnalyzer.detectLoadedLanguage(largeContent);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500); // Should handle large content efficiently
      expect(result.loaded_language.length).toBeGreaterThan(0);
    });
  });
});