// Test suite for Enhanced AI Classification Service
// Tests for modular content classification with domain hints and category resolution

const EnhancedAIClassificationService = require('../src/services/enhancedAIClassification');

// Mock dependencies
jest.mock('../src/middleware/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../src/services/secureConfig', () => ({
  secureConfigService: {
    initialized: true,
    initialize: jest.fn(),
    getConfig: jest.fn((key) => {
      const configs = {
        'GEMINI_API_KEY': 'test-gemini-key',
        'OPENAI_API_KEY': 'test-openai-key',
        'ANTHROPIC_API_KEY': 'test-anthropic-key'
      };
      return configs[key];
    })
  }
}));

// Mock AI clients
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn()
    })
  }))
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn()
    }
  }));
});

describe('EnhancedAIClassificationService', () => {
  let service;
  let mockDb;

  beforeEach(() => {
    service = new EnhancedAIClassificationService();
    
    // Mock database
    mockDb = {
      query: jest.fn()
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize service successfully', async () => {
      // Mock database queries for initialization
      mockDb.query.mockImplementation((query) => {
        if (query.includes('FROM categories')) {
          return {
            rows: [
              { id: 1, name: 'US Politics', description: 'Political content', is_fallback: false },
              { id: 2, name: 'Technology', description: 'Tech content', is_fallback: false },
              { id: 9, name: 'Uncategorized', description: 'Fallback category', is_fallback: true }
            ]
          };
        }
        if (query.includes('FROM matchers')) {
          return {
            rows: [
              { id: 1, domain_pattern: 'thingiverse.com', category_id: 3, category_name: '3D Printing' },
              { id: 2, domain_pattern: 'github.com', category_id: 7, category_name: 'Software Development' }
            ]
          };
        }
        if (query.includes('FROM category_aliases')) {
          return {
            rows: [
              { alias: 'politics', category_name: 'US Politics', category_id: 1 },
              { alias: 'tech', category_name: 'Technology', category_id: 2 }
            ]
          };
        }
        return { rows: [] };
      });

      await service.initialize(mockDb);

      expect(service.initialized).toBe(true);
      expect(service.db).toBe(mockDb);
      expect(service.categories).toHaveLength(3);
      expect(service.matchers).toHaveLength(2);
      expect(service.fallbackCategory.name).toBe('Uncategorized');
    });

    it('should handle initialization errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.initialize(mockDb)).rejects.toThrow('Database connection failed');
      expect(service.initialized).toBe(false);
    });
  });

  describe('Domain Hint Generation', () => {
    beforeEach(async () => {
      // Initialize service with mock data
      mockDb.query.mockImplementation((query) => {
        if (query.includes('FROM categories')) {
          return {
            rows: [
              { id: 1, name: 'US Politics', description: 'Political content', is_fallback: false },
              { id: 3, name: '3D Printing', description: '3D printing models', is_fallback: false },
              { id: 9, name: 'Uncategorized', description: 'Fallback category', is_fallback: true }
            ]
          };
        }
        if (query.includes('FROM matchers')) {
          return {
            rows: [
              { id: 1, domain_pattern: 'thingiverse.com', category_id: 3, category_name: '3D Printing' },
              { id: 2, domain_pattern: 'printables.com', category_id: 3, category_name: '3D Printing' },
              { id: 3, domain_pattern: 'github.com', category_id: 7, category_name: 'Software Development' }
            ]
          };
        }
        if (query.includes('FROM category_aliases')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      await service.initialize(mockDb);
    });

    it('should generate hints for matching domains', () => {
      const content = {
        url: 'https://www.thingiverse.com/thing/12345',
        title: 'Cool 3D Model'
      };

      const hints = service.generateHints(content);

      expect(hints).toContain('3D Printing');
      expect(hints.length).toBeGreaterThan(0);
    });

    it('should handle content without URL', () => {
      const content = {
        title: 'Some random article',
        raw_content: 'This is just some content without a URL'
      };

      const hints = service.generateHints(content);

      expect(Array.isArray(hints)).toBe(true);
      expect(hints.length).toBe(0);
    });

    it('should handle malformed URLs gracefully', () => {
      const content = {
        url: 'not-a-valid-url',
        title: 'Article with bad URL'
      };

      const hints = service.generateHints(content);

      expect(Array.isArray(hints)).toBe(true);
    });
  });

  describe('Category Resolution', () => {
    beforeEach(async () => {
      mockDb.query.mockImplementation((query) => {
        if (query.includes('FROM categories')) {
          return {
            rows: [
              { id: 1, name: 'US Politics', description: 'Political content', is_fallback: false },
              { id: 2, name: 'Technology', description: 'Tech content', is_fallback: false },
              { id: 9, name: 'Uncategorized', description: 'Fallback category', is_fallback: true }
            ]
          };
        }
        if (query.includes('FROM matchers')) {
          return { rows: [] };
        }
        if (query.includes('FROM category_aliases')) {
          return {
            rows: [
              { alias: 'politics', category_name: 'US Politics', category_id: 1 },
              { alias: 'political', category_name: 'US Politics', category_id: 1 },
              { alias: 'tech', category_name: 'Technology', category_id: 2 },
              { alias: 'technology', category_name: 'Technology', category_id: 2 }
            ]
          };
        }
        return { rows: [] };
      });

      await service.initialize(mockDb);
    });

    it('should resolve exact category match', () => {
      const resolution = service.resolveCategoryWithAliases('US Politics');

      expect(resolution.category.name).toBe('US Politics');
      expect(resolution.matched).toBe('exact');
      expect(resolution.confidence).toBe(1.0);
    });

    it('should resolve alias match', () => {
      const resolution = service.resolveCategoryWithAliases('politics');

      expect(resolution.category.name).toBe('US Politics');
      expect(resolution.matched).toBe('alias');
      expect(resolution.confidence).toBe(0.9);
    });

    it('should fall back to uncategorized for unknown category', () => {
      const resolution = service.resolveCategoryWithAliases('unknown category');

      expect(resolution.category.name).toBe('Uncategorized');
      expect(resolution.matched).toBe('fallback');
      expect(resolution.confidence).toBe(0.5);
    });

    it('should handle empty or null input', () => {
      const resolution1 = service.resolveCategoryWithAliases('');
      const resolution2 = service.resolveCategoryWithAliases(null);

      expect(resolution1.category.name).toBe('Uncategorized');
      expect(resolution2.category.name).toBe('Uncategorized');
    });
  });

  describe('Classification Prompt Construction', () => {
    beforeEach(async () => {
      mockDb.query.mockImplementation(() => ({
        rows: [
          { id: 1, name: 'US Politics', description: 'Political content', is_fallback: false },
          { id: 2, name: 'Technology', description: 'Tech content', is_fallback: false }
        ]
      }));

      await service.initialize(mockDb);
    });

    it('should construct proper classification prompt', () => {
      const content = {
        title: 'Test Article',
        raw_content: 'This is test content'
      };
      const hints = ['Technology'];

      const prompt = service.constructClassificationPrompt(content, hints);

      expect(prompt).toContain('Test Article');
      expect(prompt).toContain('This is test content');
      expect(prompt).toContain('Technology');
      expect(prompt).toContain('US Politics');
    });

    it('should handle content without hints', () => {
      const content = {
        title: 'Test Article',
        raw_content: 'This is test content'
      };

      const prompt = service.constructClassificationPrompt(content, []);

      expect(prompt).toContain('Test Article');
      expect(prompt).toContain('no specific domain hints');
    });

    it('should handle missing content fields', () => {
      const content = {};
      const hints = [];

      const prompt = service.constructClassificationPrompt(content, hints);

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  describe('Gemini Classification', () => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    beforeEach(async () => {
      mockDb.query.mockImplementation(() => ({ rows: [] }));
      await service.initialize(mockDb);
    });

    it('should successfully classify with Gemini', async () => {
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: jest.fn().mockReturnValue('{"category": "Technology", "confidence": 0.9, "reasoning": "Tech content"}')
          }
        })
      };

      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue(mockModel)
      }));

      const result = await service.classifyWithGemini('test prompt');

      expect(result.category).toBe('Technology');
      expect(result.confidence).toBe(0.9);
      expect(result.provider).toBe('gemini');
    });

    it('should handle Gemini API errors', async () => {
      const mockModel = {
        generateContent: jest.fn().mockRejectedValue(new Error('API Error'))
      };

      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue(mockModel)
      }));

      await expect(service.classifyWithGemini('test prompt')).rejects.toThrow('API Error');
    });

    it('should handle invalid JSON response', async () => {
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: jest.fn().mockReturnValue('Invalid JSON response')
          }
        })
      };

      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue(mockModel)
      }));

      await expect(service.classifyWithGemini('test prompt')).rejects.toThrow();
    });
  });

  describe('Complete Classification Pipeline', () => {
    beforeEach(async () => {
      mockDb.query.mockImplementation((query) => {
        if (query.includes('FROM categories')) {
          return {
            rows: [
              { id: 1, name: 'US Politics', description: 'Political content', is_fallback: false },
              { id: 2, name: 'Technology', description: 'Tech content', is_fallback: false },
              { id: 9, name: 'Uncategorized', description: 'Fallback category', is_fallback: true }
            ]
          };
        }
        if (query.includes('FROM matchers')) {
          return {
            rows: [
              { id: 1, domain_pattern: 'github.com', category_id: 7, category_name: 'Software Development' }
            ]
          };
        }
        if (query.includes('FROM category_aliases')) {
          return {
            rows: [
              { alias: 'tech', category_name: 'Technology', category_id: 2 }
            ]
          };
        }
        return { rows: [] };
      });

      await service.initialize(mockDb);
    });

    it('should classify content successfully end-to-end', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: jest.fn().mockReturnValue('{"category": "tech", "confidence": 0.85, "reasoning": "Technology article"}')
          }
        })
      };

      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue(mockModel)
      }));

      const content = {
        title: 'New JavaScript Framework Released',
        url: 'https://techcrunch.com/js-framework',
        raw_content: 'A new JavaScript framework has been released...'
      };

      const result = await service.classifyContent(content);

      expect(result.provider).toBe('gemini');
      expect(result.rawCategory).toBe('tech');
      expect(result.resolvedCategory.name).toBe('Technology');
      expect(result.matchType).toBe('alias');
      expect(result.confidence).toBeLessThanOrEqual(0.85);
    });

    it('should handle service not initialized', async () => {
      const uninitializedService = new EnhancedAIClassificationService();
      
      const content = { title: 'Test' };

      await expect(uninitializedService.classifyContent(content)).rejects.toThrow('Service not initialized');
    });
  });

  describe('Performance and Caching', () => {
    beforeEach(async () => {
      mockDb.query.mockImplementation(() => ({ rows: [] }));
      await service.initialize(mockDb);
    });

    it('should cache classification results', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: jest.fn().mockReturnValue('{"category": "Technology", "confidence": 0.9, "reasoning": "Tech content"}')
          }
        })
      };

      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue(mockModel)
      }));

      const content = {
        title: 'Test Article',
        raw_content: 'Test content'
      };

      // First classification
      await service.classifyContent(content);
      
      // Second classification (should use cache)
      await service.classifyContent(content);

      // Should only call API once due to caching
      expect(mockModel.generateContent).toHaveBeenCalledTimes(1);
    });

    it('should handle classification within reasonable time', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: jest.fn().mockReturnValue('{"category": "Technology", "confidence": 0.9, "reasoning": "Tech content"}')
          }
        })
      };

      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue(mockModel)
      }));

      const content = {
        title: 'Performance Test Article',
        raw_content: 'This is a performance test article'
      };

      const startTime = Date.now();
      await service.classifyContent(content);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Error Handling and Resilience', () => {
    beforeEach(async () => {
      mockDb.query.mockImplementation(() => ({ rows: [] }));
      await service.initialize(mockDb);
    });

    it('should handle empty content gracefully', async () => {
      const content = {};

      // Should not throw, should handle gracefully
      await expect(service.classifyContent(content)).resolves.toBeDefined();
    });

    it('should handle null content', async () => {
      await expect(service.classifyContent(null)).rejects.toThrow();
    });

    it('should handle very large content', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: jest.fn().mockReturnValue('{"category": "Technology", "confidence": 0.9, "reasoning": "Tech content"}')
          }
        })
      };

      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue(mockModel)
      }));

      const largeContent = {
        title: 'Large Article',
        raw_content: 'word '.repeat(10000) // 10k words
      };

      const result = await service.classifyContent(largeContent);
      
      expect(result).toBeDefined();
      expect(result.provider).toBeDefined();
    });
  });
});