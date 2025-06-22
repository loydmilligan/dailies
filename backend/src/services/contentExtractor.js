// Content Extraction Service
// Enhanced content extraction and preprocessing for AI classification

const { logger } = require('../middleware/logging');

/**
 * Content extraction and preprocessing service
 * Optimizes content for AI classification accuracy
 */
class ContentExtractor {

  /**
   * Extract and preprocess content for classification
   * @param {Object} contentItem - Raw content item
   * @returns {Object} Processed content optimized for classification
   */
  static extractForClassification(contentItem) {
    const {
      title,
      raw_content,
      url,
      source_domain,
      metadata = {},
      content_type
    } = contentItem;

    try {
      // Extract key components
      const extractedTitle = this.cleanTitle(title);
      const extractedText = this.extractRelevantText(raw_content, content_type);
      const urlContext = this.extractUrlContext(url);
      const domainContext = this.extractDomainContext(source_domain);
      const metadataContext = this.extractMetadataContext(metadata);

      // Calculate content signals
      const signals = this.calculateContentSignals(extractedTitle, extractedText, url);

      return {
        title: extractedTitle,
        text: extractedText,
        url,
        source_domain,
        urlContext,
        domainContext,
        metadataContext,
        signals,
        contentLength: extractedText.length,
        titleLength: extractedTitle.length
      };

    } catch (error) {
      logger.error('Content extraction error:', error);
      
      // Return basic extraction on error
      return {
        title: title || '',
        text: raw_content?.substring(0, 1000) || '',
        url: url || '',
        source_domain: source_domain || '',
        urlContext: {},
        domainContext: {},
        metadataContext: {},
        signals: {},
        contentLength: (raw_content || '').length,
        titleLength: (title || '').length
      };
    }
  }

  /**
   * Clean and normalize title
   * @param {string} title - Raw title
   * @returns {string} Cleaned title
   */
  static cleanTitle(title) {
    if (!title || typeof title !== 'string') {
      return '';
    }

    return title
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[""'']/g, '"') // Normalize quotes
      .substring(0, 200); // Limit length
  }

  /**
   * Extract relevant text based on content type
   * @param {string} rawContent - Raw content text
   * @param {string} contentType - Content type (article, video, post, other)
   * @returns {string} Extracted relevant text
   */
  static extractRelevantText(rawContent, contentType) {
    if (!rawContent || typeof rawContent !== 'string') {
      return '';
    }

    let text = rawContent.trim();
    
    // Remove common noise patterns
    text = this.removeNoisePatterns(text);
    
    // Extract based on content type
    switch (contentType) {
      case 'article':
        return this.extractArticleText(text);
      case 'video':
        return this.extractVideoText(text);
      case 'post':
        return this.extractPostText(text);
      default:
        return this.extractGenericText(text);
    }
  }

  /**
   * Remove common noise patterns from text
   * @param {string} text - Input text
   * @returns {string} Cleaned text
   */
  static removeNoisePatterns(text) {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove common web patterns
      .replace(/\b(subscribe|like|share|comment|follow)\b/gi, '')
      // Remove email patterns
      .replace(/\S+@\S+\.\S+/g, '')
      // Remove URLs (but keep domains for context)
      .replace(/https?:\/\/[^\s]+/g, '')
      // Remove excessive punctuation
      .replace(/[!]{2,}/g, '!')
      .replace(/[?]{2,}/g, '?')
      // Remove common navigation text
      .replace(/\b(home|menu|search|login|register|about|contact)\b/gi, '')
      .trim();
  }

  /**
   * Extract text optimized for article content
   * @param {string} text - Raw article text
   * @returns {string} Optimized article text
   */
  static extractArticleText(text) {
    // For articles, prioritize first paragraphs and key sections
    const paragraphs = text.split('\n').filter(p => p.trim().length > 50);
    
    // Take first 3 paragraphs + any paragraph containing key political terms
    const politicalKeywords = [
      'biden', 'trump', 'congress', 'senate', 'house', 'president',
      'election', 'vote', 'campaign', 'policy', 'government', 'administration',
      'republican', 'democrat', 'gop', 'political', 'politics'
    ];
    
    let relevantParagraphs = paragraphs.slice(0, 3);
    
    // Add paragraphs with political keywords
    paragraphs.slice(3).forEach(paragraph => {
      if (politicalKeywords.some(keyword => 
        paragraph.toLowerCase().includes(keyword.toLowerCase())
      )) {
        relevantParagraphs.push(paragraph);
      }
    });
    
    return relevantParagraphs.join(' ').substring(0, 2000);
  }

  /**
   * Extract text optimized for video content
   * @param {string} text - Raw video text (description, transcript)
   * @returns {string} Optimized video text
   */
  static extractVideoText(text) {
    // For videos, focus on description and key metadata
    // Remove timestamp patterns common in transcripts
    const cleanText = text
      .replace(/\d{1,2}:\d{2}(?::\d{2})?\s*/g, '') // Remove timestamps
      .replace(/\[.*?\]/g, '') // Remove bracket annotations
      .replace(/\(.*?\)/g, ''); // Remove parenthetical notes
    
    return cleanText.substring(0, 1500);
  }

  /**
   * Extract text optimized for social media posts
   * @param {string} text - Raw post text
   * @returns {string} Optimized post text
   */
  static extractPostText(text) {
    // For posts, remove hashtags and mentions but keep main content
    const cleanText = text
      .replace(/#\w+/g, '') // Remove hashtags
      .replace(/@\w+/g, '') // Remove mentions
      .replace(/\bhttps?:\/\/\S+/g, ''); // Remove URLs
    
    return cleanText.trim().substring(0, 1000);
  }

  /**
   * Extract text for generic content
   * @param {string} text - Raw text
   * @returns {string} Optimized generic text
   */
  static extractGenericText(text) {
    // For generic content, take first portion and any political sections
    return text.substring(0, 1500);
  }

  /**
   * Extract context from URL patterns
   * @param {string} url - Content URL
   * @returns {Object} URL context signals
   */
  static extractUrlContext(url) {
    if (!url || typeof url !== 'string') {
      return {};
    }

    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const searchParams = urlObj.searchParams;

      const context = {
        hasElectionPath: /\b(election|vote|campaign|primary)\b/.test(pathname),
        hasPoliticsPath: /\b(politics|government|congress|senate)\b/.test(pathname),
        hasNewsPath: /\b(news|breaking|latest)\b/.test(pathname),
        hasOpinionPath: /\b(opinion|editorial|op-ed)\b/.test(pathname),
        hasVideoPath: /\b(video|watch|tv)\b/.test(pathname),
        pathSegments: pathname.split('/').filter(s => s.length > 0),
        queryParams: Object.fromEntries(searchParams.entries())
      };

      // Check for political indicators in path
      context.politicalScore = 0;
      if (context.hasElectionPath) context.politicalScore += 3;
      if (context.hasPoliticsPath) context.politicalScore += 3;
      if (context.hasNewsPath) context.politicalScore += 1;
      if (context.hasOpinionPath) context.politicalScore += 1;

      return context;

    } catch (error) {
      return {};
    }
  }

  /**
   * Extract context from domain
   * @param {string} domain - Source domain
   * @returns {Object} Domain context signals
   */
  static extractDomainContext(domain) {
    if (!domain || typeof domain !== 'string') {
      return {};
    }

    const cleanDomain = domain.toLowerCase().replace(/^www\./, '');

    // Political and news domain categories
    const domainCategories = {
      majorNews: ['cnn.com', 'foxnews.com', 'msnbc.com', 'nytimes.com', 'washingtonpost.com'],
      politicalNews: ['politico.com', 'thehill.com', 'rollcall.com', 'axios.com'],
      wireServices: ['reuters.com', 'ap.org', 'bloomberg.com'],
      broadcastNews: ['cbs.com', 'nbc.com', 'abc.com', 'npr.org'],
      opinion: ['slate.com', 'vox.com', 'huffpost.com', 'dailybeast.com'],
      conservative: ['foxnews.com', 'nypost.com', 'wsj.com', 'nationalreview.com'],
      liberal: ['msnbc.com', 'cnn.com', 'huffpost.com', 'motherjones.com'],
      social: ['twitter.com', 'x.com', 'facebook.com', 'reddit.com'],
      tech: ['techcrunch.com', 'wired.com', 'arstechnica.com', 'verge.com']
    };

    const context = {};
    
    // Categorize domain
    for (const [category, domains] of Object.entries(domainCategories)) {
      context[category] = domains.some(d => cleanDomain.includes(d));
    }

    // Calculate political likelihood score
    context.politicalScore = 0;
    if (context.majorNews) context.politicalScore += 2;
    if (context.politicalNews) context.politicalScore += 4;
    if (context.wireServices) context.politicalScore += 1;
    if (context.broadcastNews) context.politicalScore += 2;
    if (context.opinion) context.politicalScore += 1;

    context.isDomainPolitical = context.politicalScore >= 2;

    return context;
  }

  /**
   * Extract context from metadata
   * @param {Object} metadata - Content metadata
   * @returns {Object} Metadata context signals
   */
  static extractMetadataContext(metadata) {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }

    const context = {
      hasAuthor: !!metadata.author,
      hasPublishDate: !!metadata.publishDate,
      hasKeywords: !!metadata.keywords,
      hasTags: !!metadata.tags,
      hasCategory: !!metadata.category
    };

    // Check for political keywords in metadata
    const politicalKeywords = [
      'politics', 'election', 'government', 'congress', 'senate', 'biden', 'trump'
    ];

    const allMetadataText = JSON.stringify(metadata).toLowerCase();
    context.hasPoliticalKeywords = politicalKeywords.some(keyword =>
      allMetadataText.includes(keyword)
    );

    return context;
  }

  /**
   * Calculate content signals for classification
   * @param {string} title - Content title
   * @param {string} text - Content text
   * @param {string} url - Content URL
   * @returns {Object} Content signals
   */
  static calculateContentSignals(title, text, url) {
    const signals = {};

    // Political keyword density
    const politicalKeywords = [
      'biden', 'trump', 'harris', 'congress', 'senate', 'house',
      'election', 'vote', 'voting', 'campaign', 'republican', 'democrat',
      'gop', 'dnc', 'rnc', 'president', 'administration', 'government',
      'policy', 'legislation', 'bill', 'law', 'supreme court', 'scotus',
      'governor', 'mayor', 'political', 'politics'
    ];

    const allText = `${title} ${text}`.toLowerCase();
    const words = allText.split(/\s+/);
    const politicalMatches = words.filter(word =>
      politicalKeywords.some(keyword => word.includes(keyword))
    );

    signals.politicalKeywordDensity = politicalMatches.length / Math.max(words.length, 1);
    signals.politicalKeywordCount = politicalMatches.length;
    signals.totalWordCount = words.length;

    // US-specific indicators
    const usIndicators = [
      'america', 'american', 'usa', 'united states', 'us ', 'washington dc',
      'white house', 'capitol hill', 'federal', 'state', 'constitution'
    ];

    signals.hasUSIndicators = usIndicators.some(indicator =>
      allText.includes(indicator)
    );

    // Government entity mentions
    const governmentEntities = [
      'fbi', 'cia', 'nsa', 'doj', 'department of', 'agency', 'bureau',
      'commission', 'committee', 'subcommittee'
    ];

    signals.hasGovernmentEntities = governmentEntities.some(entity =>
      allText.includes(entity)
    );

    return signals;
  }

  /**
   * Generate optimized prompt for classification
   * @param {Object} extractedContent - Processed content from extractForClassification
   * @returns {string} Optimized classification prompt
   */
  static generateClassificationPrompt(extractedContent) {
    const {
      title,
      text,
      url,
      source_domain,
      urlContext,
      domainContext,
      signals
    } = extractedContent;

    // Build context hints
    const contextHints = [];
    
    if (domainContext.isDomainPolitical) {
      contextHints.push('Source is a political/news domain');
    }
    
    if (urlContext.politicalScore > 0) {
      contextHints.push('URL contains political indicators');
    }
    
    if (signals.politicalKeywordDensity > 0.02) {
      contextHints.push('High political keyword density');
    }
    
    if (signals.hasUSIndicators) {
      contextHints.push('Contains US-specific references');
    }

    const prompt = `
Classify this content as either "US_Politics_News" or "General".

CLASSIFICATION RULES:
- "US_Politics_News": Content specifically about US federal, state, or local politics, elections, government officials, policy, or political parties
- "General": Everything else (international politics, business, tech, sports, entertainment, etc.)

CONTENT TO ANALYZE:
Title: "${title}"
Source: ${source_domain}
URL: ${url}
${contextHints.length > 0 ? `Context: ${contextHints.join(', ')}\n` : ''}
Content: "${text.substring(0, 800)}${text.length > 800 ? '...' : ''}"

IMPORTANT:
- Be strict about US Politics classification
- International politics = "General"
- Business/economic news (unless US political policy) = "General"
- Must be specifically about US political system, elections, or governance

RESPOND WITH ONLY: "US_Politics_News" or "General"

Classification:`.trim();

    return prompt;
  }
}

module.exports = ContentExtractor;