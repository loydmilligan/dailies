// Content Sanitization Service
// Provides security measures for content processing and storage

const crypto = require('crypto');

/**
 * Comprehensive content sanitization service
 * Prevents XSS, injection attacks, and ensures data integrity
 */
class ContentSanitizer {
  
  /**
   * Sanitize HTML content for safe storage and display
   * @param {string} html - Raw HTML content
   * @returns {string} Sanitized HTML content
   */
  static sanitizeHtml(html) {
    if (!html || typeof html !== 'string') {
      return '';
    }
    
    // Remove script tags and their content
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove dangerous attributes
    const dangerousAttrs = [
      'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
      'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset',
      'onselect', 'onkeydown', 'onkeyup', 'onkeypress'
    ];
    
    dangerousAttrs.forEach(attr => {
      const regex = new RegExp(`\\s${attr}\\s*=\\s*["\'][^"\']*["\']`, 'gi');
      html = html.replace(regex, '');
    });
    
    // Remove javascript: and data: URLs
    html = html.replace(/javascript:/gi, '');
    html = html.replace(/data:/gi, '');
    
    // Remove style attributes that could contain malicious CSS
    html = html.replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove potentially dangerous tags
    const dangerousTags = ['iframe', 'embed', 'object', 'applet', 'form'];
    dangerousTags.forEach(tag => {
      const regex = new RegExp(`<${tag}\\b[^>]*>.*?<\\/${tag}>`, 'gi');
      html = html.replace(regex, '');
      
      // Also remove self-closing tags
      const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/>`, 'gi');
      html = html.replace(selfClosingRegex, '');
    });
    
    return html.trim();
  }
  
  /**
   * Sanitize plain text content
   * @param {string} text - Raw text content
   * @returns {string} Sanitized text content
   */
  static sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    // Remove control characters except newlines, tabs, and carriage returns
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Normalize unicode characters
    text = text.normalize('NFKC');
    
    // Remove excessive whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }
  
  /**
   * Sanitize URL for safe storage and processing
   * @param {string} url - Raw URL
   * @returns {string|null} Sanitized URL or null if invalid
   */
  static sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }
    
    try {
      const urlObj = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return null;
      }
      
      // Remove dangerous fragments
      urlObj.hash = '';
      
      // Limit URL length
      const sanitizedUrl = urlObj.toString();
      if (sanitizedUrl.length > 2048) {
        return null;
      }
      
      return sanitizedUrl;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Sanitize metadata object
   * @param {Object} metadata - Raw metadata object
   * @returns {Object} Sanitized metadata object
   */
  static sanitizeMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      // Sanitize key
      const cleanKey = this.sanitizeText(key);
      if (!cleanKey || cleanKey.length > 100) {
        continue; // Skip invalid keys
      }
      
      // Sanitize value based on type
      if (typeof value === 'string') {
        const cleanValue = this.sanitizeText(value);
        if (cleanValue.length <= 5000) { // Limit value length
          sanitized[cleanKey] = cleanValue;
        }
      } else if (typeof value === 'number' && isFinite(value)) {
        sanitized[cleanKey] = value;
      } else if (typeof value === 'boolean') {
        sanitized[cleanKey] = value;
      } else if (Array.isArray(value)) {
        // Sanitize array values
        const cleanArray = value
          .filter(item => typeof item === 'string' || typeof item === 'number')
          .map(item => typeof item === 'string' ? this.sanitizeText(item) : item)
          .filter(item => item !== '')
          .slice(0, 100); // Limit array length
        
        if (cleanArray.length > 0) {
          sanitized[cleanKey] = cleanArray;
        }
      }
      
      // Limit number of metadata fields
      if (Object.keys(sanitized).length >= 50) {
        break;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Generate secure content hash
   * @param {string} content - Content to hash
   * @returns {string} SHA-256 hash
   */
  static generateContentHash(content) {
    if (!content || typeof content !== 'string') {
      return null;
    }
    
    return crypto
      .createHash('sha256')
      .update(content, 'utf8')
      .digest('hex');
  }
  
  /**
   * Validate and sanitize content item for database storage
   * @param {Object} contentItem - Raw content item
   * @returns {Object} Sanitized content item
   */
  static sanitizeContentItem(contentItem) {
    const sanitized = {};
    
    // Required fields
    sanitized.url = this.sanitizeUrl(contentItem.url);
    if (!sanitized.url) {
      throw new Error('Invalid URL provided');
    }
    
    sanitized.title = this.sanitizeText(contentItem.title);
    if (!sanitized.title || sanitized.title.length < 1) {
      throw new Error('Invalid title provided');
    }
    
    sanitized.source_domain = this.sanitizeText(contentItem.source_domain);
    if (!sanitized.source_domain) {
      throw new Error('Invalid source domain provided');
    }
    
    // Optional fields
    if (contentItem.content_type) {
      const validTypes = ['article', 'video', 'post', 'other'];
      sanitized.content_type = validTypes.includes(contentItem.content_type) 
        ? contentItem.content_type 
        : 'other';
    }
    
    if (contentItem.category) {
      const validCategories = ['US_Politics_News', 'General'];
      sanitized.category = validCategories.includes(contentItem.category)
        ? contentItem.category
        : 'General';
    }
    
    if (contentItem.raw_content) {
      sanitized.raw_content = this.sanitizeText(contentItem.raw_content);
    }
    
    if (contentItem.metadata) {
      sanitized.metadata = this.sanitizeMetadata(contentItem.metadata);
    }
    
    if (contentItem.content_hash) {
      // Validate hash format (should be 64-character hex string for SHA-256)
      if (/^[a-f0-9]{64}$/i.test(contentItem.content_hash)) {
        sanitized.content_hash = contentItem.content_hash.toLowerCase();
      }
    }
    
    // Generate content hash if not provided
    if (!sanitized.content_hash && sanitized.raw_content) {
      sanitized.content_hash = this.generateContentHash(sanitized.raw_content);
    }
    
    // Set processing status
    sanitized.processing_status = 'pending';
    
    return sanitized;
  }
  
  /**
   * Validate content update data
   * @param {Object} updateData - Content update data
   * @returns {Object} Sanitized update data
   */
  static sanitizeContentUpdate(updateData) {
    const sanitized = {};
    
    // Only allow specific fields to be updated
    const allowedFields = {
      title: (value) => this.sanitizeText(value),
      category: (value) => ['US_Politics_News', 'General'].includes(value) ? value : null,
      content_type: (value) => ['article', 'video', 'post', 'other'].includes(value) ? value : null,
      tags: (value) => {
        if (!Array.isArray(value)) return null;
        return value
          .map(tag => this.sanitizeText(tag))
          .filter(tag => tag.length > 0 && tag.length <= 50)
          .slice(0, 20); // Max 20 tags
      },
      metadata: (value) => this.sanitizeMetadata(value),
      manual_classification: (value) => typeof value === 'boolean' ? value : null,
      notes: (value) => {
        const sanitizedNotes = this.sanitizeText(value);
        return sanitizedNotes.length <= 5000 ? sanitizedNotes : null;
      }
    };
    
    for (const [field, sanitizer] of Object.entries(allowedFields)) {
      if (updateData[field] !== undefined) {
        const sanitizedValue = sanitizer(updateData[field]);
        if (sanitizedValue !== null && sanitizedValue !== '') {
          sanitized[field] = sanitizedValue;
        }
      }
    }
    
    return sanitized;
  }
  
  /**
   * Check for potentially malicious patterns in content
   * @param {string} content - Content to analyze
   * @returns {Object} Security analysis result
   */
  static analyzeContentSecurity(content) {
    if (!content || typeof content !== 'string') {
      return { safe: true, issues: [] };
    }
    
    const issues = [];
    
    // Check for script injection patterns
    const scriptPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /expression\s*\(/i
    ];
    
    scriptPatterns.forEach((pattern, index) => {
      if (pattern.test(content)) {
        issues.push({
          type: 'script_injection',
          severity: 'high',
          pattern: pattern.toString()
        });
      }
    });
    
    // Check for SQL injection patterns
    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i
    ];
    
    sqlPatterns.forEach((pattern) => {
      if (pattern.test(content)) {
        issues.push({
          type: 'sql_injection',
          severity: 'medium',
          pattern: pattern.toString()
        });
      }
    });
    
    // Check for excessive length
    if (content.length > 1000000) { // 1MB limit
      issues.push({
        type: 'excessive_length',
        severity: 'medium',
        length: content.length
      });
    }
    
    return {
      safe: issues.length === 0,
      issues: issues
    };
  }
}

module.exports = ContentSanitizer;