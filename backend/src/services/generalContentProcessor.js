// General Content Processing Service
// Lightweight processing for non-political content with minimal overhead
// Uses extractive techniques instead of AI APIs for cost efficiency

const crypto = require('crypto');
const { logger } = require('../middleware/logging');

/**
 * Lightweight JSON structure for general content storage
 */
const GENERAL_CONTENT_SCHEMA = {
  id: 'string', // UUID or database ID
  url: 'string', // Original URL
  title: 'string', // Extracted title
  sourceDomain: 'string', // Domain of the source
  contentType: 'string', // article, video, post, other
  captureTimestamp: 'string', // ISO timestamp
  summary: 'string', // Brief auto-generated summary (1-2 sentences)
  keywords: 'array', // Array of extracted keywords
  readingTime: 'number', // Estimated reading time in minutes
  contentHash: 'string', // SHA-256 hash for deduplication
  metadata: 'object' // Additional lightweight metadata
};

/**
 * General Content Processor for non-political content
 * Focuses on speed and efficiency over deep analysis
 */
class GeneralContentProcessor {
  constructor() {
    this.initialized = true;
    
    // Common stop words for keyword extraction
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
      'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
      'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
      'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs'
    ]);
    
    // Average reading speed (words per minute)
    this.averageWPM = 250;
  }

  /**
   * Process content and generate lightweight metadata
   * @param {Object} content - Raw content object
   * @returns {Promise<Object>} Processed content with metadata
   */
  async process(content) {
    try {
      const startTime = Date.now();
      
      // Extract basic metadata
      const metadata = this.extractMetadata(content);
      
      // Generate content hash for deduplication
      const contentHash = this.generateContentHash(content);
      
      // Extract keywords using TF-IDF approach
      const keywords = this.extractKeywords(content.raw_content || content.text || '');
      
      // Generate extractive summary
      const summary = this.generateSummary(content.raw_content || content.text || '');
      
      // Calculate reading time
      const readingTime = this.calculateReadingTime(content.raw_content || content.text || '');
      
      const processedContent = {
        ...metadata,
        summary,
        keywords,
        readingTime,
        contentHash,
        captureTimestamp: new Date().toISOString(),
        metadata: {
          processingTime: Date.now() - startTime,
          processor: 'GeneralContentProcessor',
          version: '1.0.0',
          extractionMethod: 'lightweight',
          ...content.metadata
        }
      };
      
      logger.info('General content processed successfully', {
        contentHash,
        processingTime: Date.now() - startTime,
        keywordCount: keywords.length,
        summaryLength: summary.length,
        readingTime
      });
      
      return processedContent;
    } catch (error) {
      logger.error('General content processing failed:', error);
      throw error;
    }
  }

  /**
   * Extract basic metadata from content
   * @param {Object} content - Raw content object
   * @returns {Object} Extracted metadata
   */
  extractMetadata(content) {
    // Handle null/undefined content
    if (!content || typeof content !== 'object') {
      return {
        url: '',
        title: 'Untitled',
        sourceDomain: 'unknown',
        contentType: 'article'
      };
    }
    
    // Extract domain from URL
    let sourceDomain = 'unknown';
    try {
      if (content.url) {
        const url = new URL(content.url);
        sourceDomain = url.hostname.replace(/^www\./, '');
      } else if (content.source_domain) {
        sourceDomain = content.source_domain.replace(/^www\./, '');
      }
    } catch (error) {
      logger.warn('Failed to extract domain from URL:', content.url);
    }
    
    return {
      url: content.url || '',
      title: content.title || 'Untitled',
      sourceDomain,
      contentType: content.content_type || content.contentType || 'article'
    };
  }

  /**
   * Generate SHA-256 hash for content deduplication
   * @param {Object} content - Content object
   * @returns {string} SHA-256 hash
   */
  generateContentHash(content) {
    if (!content || typeof content !== 'object') {
      return crypto.createHash('sha256').update('', 'utf8').digest('hex');
    }
    
    const contentString = `${content.title || ''}|${content.url || ''}|${content.raw_content || content.text || ''}`;
    return crypto.createHash('sha256').update(contentString, 'utf8').digest('hex');
  }

  /**
   * Extract keywords using simplified TF-IDF approach
   * @param {string} text - Content text
   * @returns {Array<string>} Array of keywords
   */
  extractKeywords(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }
    
    try {
      // Clean and tokenize text
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 2 && !this.stopWords.has(word));
      
      if (words.length === 0) {
        return [];
      }
      
      // Calculate word frequencies (term frequency)
      const wordFreq = {};
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
      
      // Calculate TF scores and sort by frequency
      const tfScores = Object.entries(wordFreq)
        .map(([word, freq]) => ({
          word,
          score: freq / words.length, // Normalized frequency
          frequency: freq
        }))
        .sort((a, b) => b.score - a.score);
      
      // Return top 10 keywords, prioritizing longer words and higher frequency
      return tfScores
        .slice(0, 15) // Take top 15 candidates
        .filter(item => item.frequency > 1 || item.word.length > 4) // Filter quality
        .slice(0, 10) // Final top 10
        .map(item => item.word);
        
    } catch (error) {
      logger.warn('Keyword extraction failed:', error);
      return [];
    }
  }

  /**
   * Generate extractive summary (1-2 sentences)
   * @param {string} text - Content text
   * @returns {string} Generated summary
   */
  generateSummary(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    try {
      // Split into sentences
      const sentences = text
        .replace(/\s+/g, ' ') // Normalize whitespace
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 200); // Filter reasonable sentences
      
      if (sentences.length === 0) {
        return text.substring(0, 200) + (text.length > 200 ? '...' : '');
      }
      
      if (sentences.length === 1) {
        return sentences[0] + '.';
      }
      
      // Simple extractive approach: take first sentence and one representative sentence
      const firstSentence = sentences[0];
      
      // Find a sentence with good keyword density from the middle/end
      const keywords = this.extractKeywords(text).slice(0, 5);
      let bestSentence = sentences[1] || '';
      let bestScore = 0;
      
      for (let i = 1; i < Math.min(sentences.length, 10); i++) {
        const sentence = sentences[i];
        const score = keywords.reduce((sum, keyword) => {
          return sum + (sentence.toLowerCase().includes(keyword) ? 1 : 0);
        }, 0);
        
        if (score > bestScore) {
          bestScore = score;
          bestSentence = sentence;
        }
      }
      
      // Combine first sentence with best representative sentence
      const summary = bestSentence && bestSentence !== firstSentence 
        ? `${firstSentence}. ${bestSentence}.`
        : `${firstSentence}.`;
      
      // Ensure summary is reasonable length
      return summary.length > 300 ? summary.substring(0, 297) + '...' : summary;
      
    } catch (error) {
      logger.warn('Summary generation failed:', error);
      return text.substring(0, 200) + (text.length > 200 ? '...' : '');
    }
  }

  /**
   * Calculate estimated reading time in minutes
   * @param {string} text - Content text
   * @returns {number} Reading time in minutes
   */
  calculateReadingTime(text) {
    if (!text || typeof text !== 'string') {
      return 0;
    }
    
    try {
      // Count words (simple whitespace split)
      const wordCount = text.trim().split(/\s+/).length;
      
      // Calculate reading time based on average WPM
      const readingTimeMinutes = Math.ceil(wordCount / this.averageWPM);
      
      // Ensure minimum 1 minute for any content
      return Math.max(1, readingTimeMinutes);
      
    } catch (error) {
      logger.warn('Reading time calculation failed:', error);
      return 1;
    }
  }

  /**
   * Validate content structure against schema
   * @param {Object} content - Content to validate
   * @returns {Object} Validation result
   */
  validateContentStructure(content) {
    const errors = [];
    const warnings = [];
    
    // Required fields
    if (!content.title) errors.push('Title is required');
    if (!content.url) warnings.push('URL is recommended');
    if (!content.sourceDomain) warnings.push('Source domain is recommended');
    
    // Type validations
    if (content.readingTime && (typeof content.readingTime !== 'number' || content.readingTime < 0)) {
      errors.push('Reading time must be a positive number');
    }
    
    if (content.keywords && !Array.isArray(content.keywords)) {
      errors.push('Keywords must be an array');
    }
    
    if (content.contentHash && (typeof content.contentHash !== 'string' || content.contentHash.length !== 64)) {
      warnings.push('Content hash should be a 64-character SHA-256 hash');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get processing statistics
   * @returns {Object} Processing statistics
   */
  getStats() {
    return {
      processor: 'GeneralContentProcessor',
      version: '1.0.0',
      features: {
        keywordExtraction: 'TF-IDF based',
        summarization: 'Extractive',
        readingTimeCalculation: `${this.averageWPM} WPM average`,
        deduplication: 'SHA-256 content hashing'
      },
      performance: {
        averageProcessingTime: '<100ms',
        memoryFootprint: 'minimal',
        externalDependencies: 'none'
      }
    };
  }
}

// Singleton instance
const generalContentProcessor = new GeneralContentProcessor();

module.exports = {
  GeneralContentProcessor,
  generalContentProcessor,
  GENERAL_CONTENT_SCHEMA
};