// Test suite for Action Service
// Tests for dynamic processor dispatch and specialized content processors

const ActionService = require('../src/services/actionService');

// Mock dependencies
jest.mock('../src/middleware/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../src/services/generalContentProcessor', () => ({
  generalContentProcessor: {
    process: jest.fn().mockResolvedValue({
      summary: 'Test summary',
      keywords: ['test', 'keyword'],
      reading_time: 5
    }),
    calculateReadingTime: jest.fn().mockReturnValue(3)
  }
}));

jest.mock('../src/services/politicalContentAnalyzer', () => ({
  politicalContentAnalyzer: {
    analyzeBias: jest.fn().mockResolvedValue({
      bias_score: 0.2,
      bias_direction: 'center'
    }),
    calculateQualityScore: jest.fn().mockResolvedValue({
      quality_score: 8.5
    }),
    analyzeLoadedLanguage: jest.fn().mockResolvedValue({
      loaded_language_score: 0.3
    })
  }
}));

describe('ActionService', () => {
  let actionService;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      query: jest.fn()
    };

    actionService = new ActionService(mockDb);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize service successfully', async () => {
      await actionService.initialize();

      expect(actionService.initialized).toBe(true);
      expect(actionService.processors.size).toBeGreaterThan(0);
    });

    it('should register all processor categories', async () => {
      await actionService.initialize();

      const processorKeys = Array.from(actionService.processors.keys());
      
      // Check for processor categories
      expect(processorKeys.some(k => k.startsWith('political.'))).toBe(true);
      expect(processorKeys.some(k => k.startsWith('general.'))).toBe(true);
      expect(processorKeys.some(k => k.startsWith('tech.'))).toBe(true);
      expect(processorKeys.some(k => k.startsWith('sports.'))).toBe(true);
      expect(processorKeys.some(k => k.startsWith('printing.'))).toBe(true);
      expect(processorKeys.some(k => k.startsWith('diy.'))).toBe(true);
      expect(processorKeys.some(k => k.startsWith('smarthome.'))).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock an error during processor registration
      jest.spyOn(actionService, 'registerProcessors').mockRejectedValue(new Error('Registration failed'));

      await expect(actionService.initialize()).rejects.toThrow('Registration failed');
      expect(actionService.initialized).toBe(false);
    });
  });

  describe('Action Execution', () => {
    beforeEach(async () => {
      await actionService.initialize();
    });

    it('should execute actions for a category successfully', async () => {
      // Mock database query for actions
      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            name: 'General Processing',
            service_handler: 'general.process',
            execution_order: 1,
            config: {}
          },
          {
            id: 2,
            name: 'Reading Time',
            service_handler: 'general.calculateReadingTime',
            execution_order: 2,
            config: {}
          }
        ]
      });

      const content = {
        id: 123,
        title: 'Test Article',
        raw_content: 'This is test content',
        source_domain: 'example.com'
      };

      const result = await actionService.executeActionsForCategory(content, 1);

      expect(result.executed).toBe(2);
      expect(result.total).toBe(2);
      expect(result.errors).toBe(0);
      expect(result.processingMetrics.totalTime).toBeGreaterThan(0);
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should handle missing processors gracefully', async () => {
      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            name: 'Unknown Processor',
            service_handler: 'unknown.processor',
            execution_order: 1,
            config: {}
          }
        ]
      });

      const content = { id: 123, title: 'Test' };

      const result = await actionService.executeActionsForCategory(content, 1);

      expect(result.executed).toBe(0);
      expect(result.total).toBe(1);
      expect(result.errors).toBe(1);
      expect(result.errorDetails[0].error).toContain('Processor not found');
    });

    it('should handle processor execution errors', async () => {
      // Add a mock processor that throws an error
      actionService.processors.set('test.error', async () => {
        throw new Error('Processor error');
      });

      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            name: 'Error Processor',
            service_handler: 'test.error',
            execution_order: 1,
            config: {}
          }
        ]
      });

      const content = { id: 123, title: 'Test' };

      const result = await actionService.executeActionsForCategory(content, 1);

      expect(result.executed).toBe(0);
      expect(result.total).toBe(1);
      expect(result.errors).toBe(1);
      expect(result.errorDetails[0].error).toContain('Processor error');
    });

    it('should execute actions in correct order', async () => {
      const executionOrder = [];
      
      actionService.processors.set('test.first', async () => {
        executionOrder.push('first');
        return { result: 'first' };
      });
      
      actionService.processors.set('test.second', async () => {
        executionOrder.push('second');
        return { result: 'second' };
      });

      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: 2,
            name: 'Second Action',
            service_handler: 'test.second',
            execution_order: 2,
            config: {}
          },
          {
            id: 1,
            name: 'First Action',
            service_handler: 'test.first',
            execution_order: 1,
            config: {}
          }
        ]
      });

      const content = { id: 123, title: 'Test' };

      const result = await actionService.executeActionsForCategory(content, 1);

      expect(executionOrder).toEqual(['first', 'second']);
      expect(result.executed).toBe(2);
    });

    it('should require service to be initialized', async () => {
      const uninitializedService = new ActionService(mockDb);
      const content = { id: 123, title: 'Test' };

      await expect(uninitializedService.executeActionsForCategory(content, 1))
        .rejects.toThrow('ActionService not initialized');
    });
  });

  describe('Specialized Processors', () => {
    beforeEach(async () => {
      await actionService.initialize();
    });

    describe('Technology Processors', () => {
      it('should extract tech trends', async () => {
        const content = {
          title: 'New AI Framework Released',
          raw_content: 'Machine learning, artificial intelligence, deep learning, neural networks, TensorFlow, PyTorch'
        };

        const processor = actionService.processors.get('tech.extractTrends');
        const result = await processor(content);

        expect(result.trends).toBeDefined();
        expect(Array.isArray(result.trends)).toBe(true);
      });

      it('should analyze technical depth', async () => {
        const content = {
          title: 'Advanced Machine Learning Tutorial',
          raw_content: 'This tutorial covers advanced concepts including gradient descent, backpropagation, and neural network architectures.'
        };

        const processor = actionService.processors.get('tech.analyzeTechnicalDepth');
        const result = await processor(content);

        expect(result.technical_depth).toBeDefined();
        expect(typeof result.technical_depth).toBe('number');
        expect(result.technical_depth).toBeGreaterThanOrEqual(1);
        expect(result.technical_depth).toBeLessThanOrEqual(10);
      });

      it('should extract tools and technologies', async () => {
        const content = {
          title: 'Building with React and Node.js',
          raw_content: 'Using React, Node.js, Express, MongoDB, Docker, and Kubernetes for modern web development.'
        };

        const processor = actionService.processors.get('tech.extractToolsTech');
        const result = await processor(content);

        expect(result.tools).toBeDefined();
        expect(result.technologies).toBeDefined();
        expect(Array.isArray(result.tools)).toBe(true);
        expect(Array.isArray(result.technologies)).toBe(true);
      });
    });

    describe('Sports Processors', () => {
      it('should extract sports statistics', async () => {
        const content = {
          title: 'Game Summary: Team A vs Team B',
          raw_content: 'Final score: Team A 24, Team B 17. Passing yards: 350, Rushing yards: 120.'
        };

        const processor = actionService.processors.get('sports.extractStats');
        const result = await processor(content);

        expect(result.statistics).toBeDefined();
        expect(Array.isArray(result.statistics)).toBe(true);
      });

      it('should identify teams and players', async () => {
        const content = {
          title: 'Lakers vs Warriors Game Recap',
          raw_content: 'LeBron James scored 30 points while Stephen Curry had 25 points for the Warriors.'
        };

        const processor = actionService.processors.get('sports.identifyTeamsPlayers');
        const result = await processor(content);

        expect(result.teams).toBeDefined();
        expect(result.players).toBeDefined();
        expect(Array.isArray(result.teams)).toBe(true);
        expect(Array.isArray(result.players)).toBe(true);
      });
    });

    describe('3D Printing Processors', () => {
      it('should extract print settings', async () => {
        const content = {
          title: 'Custom Phone Case STL',
          raw_content: 'Print settings: Layer height 0.2mm, Infill 20%, Supports yes, Speed 50mm/s'
        };

        const processor = actionService.processors.get('printing.extractSettings');
        const result = await processor(content);

        expect(result.print_settings).toBeDefined();
        expect(typeof result.print_settings).toBe('object');
      });

      it('should classify model type', async () => {
        const content = {
          title: 'Miniature Dragon Figure',
          raw_content: 'Detailed dragon miniature for tabletop gaming'
        };

        const processor = actionService.processors.get('printing.classifyModel');
        const result = await processor(content);

        expect(result.model_category).toBeDefined();
        expect(typeof result.model_category).toBe('string');
      });

      it('should extract file information', async () => {
        const content = {
          url: 'https://thingiverse.com/thing/12345',
          title: 'Cool Model',
          raw_content: 'STL files available for download'
        };

        const processor = actionService.processors.get('printing.extractFileInfo');
        const result = await processor(content);

        expect(result.file_info).toBeDefined();
        expect(typeof result.file_info).toBe('object');
      });
    });

    describe('DIY Electronics Processors', () => {
      it('should extract project details', async () => {
        const content = {
          title: 'Arduino LED Matrix Project',
          raw_content: 'Build an 8x8 LED matrix display using Arduino Uno and WS2812B LEDs'
        };

        const processor = actionService.processors.get('diy.extractProjectDetails');
        const result = await processor(content);

        expect(result.project_type).toBeDefined();
        expect(result.difficulty_level).toBeDefined();
        expect(result.estimated_time).toBeDefined();
      });

      it('should identify electronics components', async () => {
        const content = {
          title: 'ESP32 Weather Station',
          raw_content: 'Components needed: ESP32, DHT22, BMP280, OLED display, resistors, breadboard'
        };

        const processor = actionService.processors.get('diy.identifyComponents');
        const result = await processor(content);

        expect(result.components).toBeDefined();
        expect(Array.isArray(result.components)).toBe(true);
      });
    });

    describe('Smart Home Processors', () => {
      it('should extract smart devices', async () => {
        const content = {
          title: 'Home Assistant Setup Guide',
          raw_content: 'Configure Philips Hue lights, Nest thermostat, and Ring doorbell with Home Assistant'
        };

        const processor = actionService.processors.get('smarthome.extractDevices');
        const result = await processor(content);

        expect(result.devices).toBeDefined();
        expect(Array.isArray(result.devices)).toBe(true);
      });

      it('should extract automation logic', async () => {
        const content = {
          title: 'Smart Home Automation Rules',
          raw_content: 'Turn on lights at sunset, adjust thermostat when away, lock doors at 10 PM'
        };

        const processor = actionService.processors.get('smarthome.extractAutomation');
        const result = await processor(content);

        expect(result.automations).toBeDefined();
        expect(Array.isArray(result.automations)).toBe(true);
      });
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await actionService.initialize();
    });

    it('should execute actions within reasonable time', async () => {
      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            name: 'Fast Action',
            service_handler: 'general.calculateReadingTime',
            execution_order: 1,
            config: {}
          }
        ]
      });

      const content = {
        id: 123,
        title: 'Performance test',
        raw_content: 'Test content'
      };

      const startTime = Date.now();
      const result = await actionService.executeActionsForCategory(content, 1);
      const duration = Date.now() - startTime;

      expect(result.executed).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple actions efficiently', async () => {
      const actions = [];
      for (let i = 1; i <= 5; i++) {
        actions.push({
          id: i,
          name: `Action ${i}`,
          service_handler: 'general.calculateReadingTime',
          execution_order: i,
          config: {}
        });
      }

      mockDb.query.mockResolvedValue({ rows: actions });

      const content = { id: 123, title: 'Multi-action test', raw_content: 'Test content' };

      const startTime = Date.now();
      const result = await actionService.executeActionsForCategory(content, 1);
      const duration = Date.now() - startTime;

      expect(result.executed).toBe(5);
      expect(result.total).toBe(5);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Error Recovery', () => {
    beforeEach(async () => {
      await actionService.initialize();
    });

    it('should continue processing after individual action failures', async () => {
      actionService.processors.set('test.fail', async () => {
        throw new Error('Action failed');
      });

      actionService.processors.set('test.success', async () => {
        return { result: 'success' };
      });

      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            name: 'Failing Action',
            service_handler: 'test.fail',
            execution_order: 1,
            config: {}
          },
          {
            id: 2,
            name: 'Successful Action',
            service_handler: 'test.success',
            execution_order: 2,
            config: {}
          }
        ]
      });

      const content = { id: 123, title: 'Error recovery test' };

      const result = await actionService.executeActionsForCategory(content, 1);

      expect(result.executed).toBe(1);
      expect(result.total).toBe(2);
      expect(result.errors).toBe(1);
      expect(result.results['Successful Action'].success).toBe(true);
      expect(result.results['Failing Action'].success).toBe(false);
    });

    it('should handle database query failures', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      const content = { id: 123, title: 'Database error test' };

      await expect(actionService.executeActionsForCategory(content, 1))
        .rejects.toThrow('Database error');
    });
  });
});