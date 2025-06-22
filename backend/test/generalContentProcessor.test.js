// Test suite for General Content Processor
// Tests for lightweight content processing including keyword extraction,
// summarization, reading time calculation, and metadata extraction

const { generalContentProcessor, GENERAL_CONTENT_SCHEMA } = require('../src/services/generalContentProcessor');

describe('GeneralContentProcessor', () => {
  describe('Metadata Extraction', () => {
    it('should extract basic metadata from content object', () => {
      const content = {
        title: 'Test Article Title',
        url: 'https://www.example.com/article',
        content_type: 'article',
        raw_content: 'This is test content.'
      };

      const metadata = generalContentProcessor.extractMetadata(content);

      expect(metadata.title).toBe('Test Article Title');
      expect(metadata.url).toBe('https://www.example.com/article');
      expect(metadata.sourceDomain).toBe('example.com');
      expect(metadata.contentType).toBe('article');
    });

    it('should handle missing URL gracefully', () => {
      const content = {
        title: 'Test Article',
        source_domain: 'example.com'
      };

      const metadata = generalContentProcessor.extractMetadata(content);

      expect(metadata.url).toBe('');
      expect(metadata.sourceDomain).toBe('example.com');
    });

    it('should remove www prefix from domain', () => {
      const content = {
        title: 'Test',
        url: 'https://www.news-site.com/article'
      };

      const metadata = generalContentProcessor.extractMetadata(content);

      expect(metadata.sourceDomain).toBe('news-site.com');
    });

    it('should provide default values for missing fields', () => {
      const content = {};

      const metadata = generalContentProcessor.extractMetadata(content);

      expect(metadata.title).toBe('Untitled');
      expect(metadata.url).toBe('');
      expect(metadata.sourceDomain).toBe('unknown');
      expect(metadata.contentType).toBe('article');
    });
  });

  describe('Content Hashing', () => {
    it('should generate consistent SHA-256 hash for same content', () => {
      const content = {
        title: 'Test Article',
        url: 'https://example.com',
        raw_content: 'This is test content.'
      };

      const hash1 = generalContentProcessor.generateContentHash(content);
      const hash2 = generalContentProcessor.generateContentHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 character hex string
    });

    it('should generate different hashes for different content', () => {
      const content1 = {
        title: 'Test Article 1',
        url: 'https://example.com',
        raw_content: 'This is test content 1.'
      };

      const content2 = {
        title: 'Test Article 2', 
        url: 'https://example.com',
        raw_content: 'This is test content 2.'
      };

      const hash1 = generalContentProcessor.generateContentHash(content1);
      const hash2 = generalContentProcessor.generateContentHash(content2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty content gracefully', () => {
      const content = {};

      const hash = generalContentProcessor.generateContentHash(content);

      expect(hash).toHaveLength(64);
      expect(typeof hash).toBe('string');
    });
  });

  describe('Keyword Extraction', () => {
    it('should extract relevant keywords from text', () => {
      const text = 'Machine learning and artificial intelligence are transforming technology. Deep learning algorithms process vast amounts of data to identify patterns and make predictions.';

      const keywords = generalContentProcessor.extractKeywords(text);

      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords.length).toBeLessThanOrEqual(10);
      
      // Should include relevant technical terms
      const keywordString = keywords.join(' ');
      expect(['machine', 'learning', 'artificial', 'intelligence', 'algorithms', 'data'].some(term => 
        keywordString.includes(term)
      )).toBe(true);
    });

    it('should filter out stop words', () => {
      const text = 'The quick brown fox jumps over the lazy dog and runs through the forest.';

      const keywords = generalContentProcessor.extractKeywords(text);

      // Stop words like 'the', 'and', 'over' should be filtered out
      expect(keywords.includes('the')).toBe(false);
      expect(keywords.includes('and')).toBe(false);
      expect(keywords.includes('over')).toBe(false);
    });

    it('should handle empty or invalid text', () => {
      expect(generalContentProcessor.extractKeywords('')).toEqual([]);
      expect(generalContentProcessor.extractKeywords(null)).toEqual([]);
      expect(generalContentProcessor.extractKeywords(undefined)).toEqual([]);
      expect(generalContentProcessor.extractKeywords(123)).toEqual([]);
    });

    it('should prioritize longer words and higher frequency', () => {
      const text = 'Technology technology technology. Tech tech. Programming programming development development development.';

      const keywords = generalContentProcessor.extractKeywords(text);

      // Should prefer 'technology', 'programming', 'development' over 'tech'
      expect(keywords.includes('technology')).toBe(true);
      expect(keywords.includes('development')).toBe(true);
    });

    it('should limit keywords to 10 items', () => {
      const text = 'word1 '.repeat(20) + 'word2 '.repeat(19) + 'word3 '.repeat(18) + 
                   'word4 '.repeat(17) + 'word5 '.repeat(16) + 'word6 '.repeat(15) +
                   'word7 '.repeat(14) + 'word8 '.repeat(13) + 'word9 '.repeat(12) +
                   'word10 '.repeat(11) + 'word11 '.repeat(10) + 'word12 '.repeat(9);

      const keywords = generalContentProcessor.extractKeywords(text);

      expect(keywords.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Summary Generation', () => {
    it('should generate a concise summary from text', () => {
      const text = 'This is the first sentence of the article. It introduces the main topic. The second sentence provides more detail about the subject matter. Additional sentences contain supporting information and context.';

      const summary = generalContentProcessor.generateSummary(text);

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
      expect(summary.length).toBeLessThanOrEqual(300);
      expect(summary.includes('This is the first sentence')).toBe(true);
    });

    it('should handle single sentence text', () => {
      const text = 'This is a single sentence article about technology trends.';

      const summary = generalContentProcessor.generateSummary(text);

      expect(summary).toBe('This is a single sentence article about technology trends.');
    });

    it('should handle empty or invalid text', () => {
      expect(generalContentProcessor.generateSummary('')).toBe('');
      expect(generalContentProcessor.generateSummary(null)).toBe('');
      expect(generalContentProcessor.generateSummary(undefined)).toBe('');
    });

    it('should truncate very long text', () => {
      const longText = 'word '.repeat(1000);

      const summary = generalContentProcessor.generateSummary(longText);

      expect(summary.length).toBeLessThanOrEqual(300);
    });

    it('should filter out very short or very long sentences', () => {
      const text = 'Hi. This is a reasonable length sentence that should be included in the summary because it contains meaningful content. ' +
                   'This is an extremely long sentence that goes on and on and on and provides way too much detail and should probably be filtered out because it exceeds the reasonable sentence length limits that we have established for good summary generation. Ok.';

      const summary = generalContentProcessor.generateSummary(text);

      expect(summary.includes('reasonable length sentence')).toBe(true);
    });
  });

  describe('Reading Time Calculation', () => {
    it('should calculate reading time based on word count', () => {
      // ~250 words should be 1 minute
      const text = 'word '.repeat(250);

      const readingTime = generalContentProcessor.calculateReadingTime(text);

      expect(readingTime).toBe(1);
    });

    it('should round up to nearest minute', () => {
      // ~300 words should be 2 minutes (300/250 = 1.2, rounded up to 2)
      const text = 'word '.repeat(300);

      const readingTime = generalContentProcessor.calculateReadingTime(text);

      expect(readingTime).toBe(2);
    });

    it('should have minimum reading time of 1 minute', () => {
      const shortText = 'Short text.';

      const readingTime = generalContentProcessor.calculateReadingTime(shortText);

      expect(readingTime).toBe(1);
    });

    it('should handle empty or invalid text', () => {
      expect(generalContentProcessor.calculateReadingTime('')).toBe(0);
      expect(generalContentProcessor.calculateReadingTime(null)).toBe(0);
      expect(generalContentProcessor.calculateReadingTime(undefined)).toBe(0);
    });

    it('should calculate longer reading times correctly', () => {
      // ~1000 words should be 4 minutes
      const longText = 'word '.repeat(1000);

      const readingTime = generalContentProcessor.calculateReadingTime(longText);

      expect(readingTime).toBe(4);
    });
  });

  describe('Content Structure Validation', () => {
    it('should validate correct content structure', () => {
      const content = {
        title: 'Test Article',
        url: 'https://example.com',
        sourceDomain: 'example.com',
        readingTime: 5,
        keywords: ['test', 'article'],
        contentHash: 'a'.repeat(64) // 64-character hash
      };

      const validation = generalContentProcessor.validateContentStructure(content);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should detect missing required fields', () => {
      const content = {
        url: 'https://example.com'
        // Missing title
      };

      const validation = generalContentProcessor.validateContentStructure(content);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Title is required');
    });

    it('should detect invalid data types', () => {
      const content = {
        title: 'Test',
        readingTime: -5, // Invalid negative number
        keywords: 'not an array' // Should be array
      };

      const validation = generalContentProcessor.validateContentStructure(content);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Reading time must be a positive number');
      expect(validation.errors).toContain('Keywords must be an array');
    });

    it('should provide warnings for missing recommended fields', () => {
      const content = {
        title: 'Test Article'
        // Missing URL and sourceDomain
      };

      const validation = generalContentProcessor.validateContentStructure(content);

      expect(validation.warnings).toContain('URL is recommended');
      expect(validation.warnings).toContain('Source domain is recommended');
    });
  });

  describe('Complete Processing Pipeline', () => {
    it('should process content end-to-end successfully', async () => {
      const content = {
        title: 'Revolutionary AI Technology Transforms Healthcare',
        url: 'https://tech-news.com/ai-healthcare',
        source_domain: 'tech-news.com',
        content_type: 'article',
        raw_content: 'Artificial intelligence is revolutionizing healthcare by enabling faster diagnosis and personalized treatment plans. Machine learning algorithms analyze medical data to identify patterns that human doctors might miss. This technology promises to improve patient outcomes while reducing healthcare costs.'
      };

      const result = await generalContentProcessor.process(content);

      // Verify structure
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('sourceDomain');
      expect(result).toHaveProperty('contentType');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('readingTime');
      expect(result).toHaveProperty('contentHash');
      expect(result).toHaveProperty('captureTimestamp');
      expect(result).toHaveProperty('metadata');

      // Verify content
      expect(result.title).toBe(content.title);
      expect(result.url).toBe(content.url);
      expect(result.sourceDomain).toBe('tech-news.com');
      expect(result.summary.length).toBeGreaterThan(0);
      expect(Array.isArray(result.keywords)).toBe(true);
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.readingTime).toBeGreaterThan(0);
      expect(result.contentHash).toHaveLength(64);

      // Verify metadata
      expect(result.metadata.processor).toBe('GeneralContentProcessor');
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });

    it('should handle processing errors gracefully', async () => {
      const invalidContent = null;

      await expect(generalContentProcessor.process(invalidContent)).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should process content quickly', async () => {
      const content = {
        title: 'Performance Test Article',
        raw_content: 'This is a performance test. '.repeat(100)
      };

      const startTime = Date.now();
      await generalContentProcessor.process(content);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200); // Should complete in under 200ms
    });

    it('should handle large content efficiently', async () => {
      const largeContent = {
        title: 'Large Article',
        raw_content: 'word '.repeat(10000) // ~10k words
      };

      const startTime = Date.now();
      const result = await generalContentProcessor.process(largeContent);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.summary.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics and Information', () => {
    it('should provide processor statistics', () => {
      const stats = generalContentProcessor.getStats();

      expect(stats).toHaveProperty('processor');
      expect(stats).toHaveProperty('version');
      expect(stats).toHaveProperty('features');
      expect(stats).toHaveProperty('performance');
      
      expect(stats.processor).toBe('GeneralContentProcessor');
      expect(stats.features.keywordExtraction).toBe('TF-IDF based');
      expect(stats.features.summarization).toBe('Extractive');
    });
  });
});