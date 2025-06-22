// Dailies Content Curator - Firefox Enhanced Content Script
// Cross-browser compatible content extraction with Readability.js and specialized extractors

console.log('Dailies Firefox content script loaded on:', window.location.href);

// Cross-browser API compatibility layer
const api = (function() {
  if (typeof browser !== 'undefined') {
    return browser; // Firefox (promise-based)
  }
  return chrome; // Chrome/fallback (callback-based)
})();

// Import Readability.js for article parsing
let Readability = null;

// Load Readability.js if not already loaded
async function loadReadability() {
  if (Readability) return Readability;
  
  try {
    // Import Readability.js
    const script = document.createElement('script');
    script.src = api.runtime.getURL('lib/readability.js');
    document.head.appendChild(script);
    
    // Wait for script to load
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
    
    Readability = window.Readability;
    console.log('Readability.js loaded successfully');
    return Readability;
    
  } catch (error) {
    console.error('Failed to load Readability.js:', error);
    return null;
  }
}

// Enhanced content type detection based on URL, DOM structure, and metadata
function detectContentType() {
  const url = window.location.href.toLowerCase();
  const hostname = window.location.hostname.toLowerCase().replace('www.', '');
  
  // Video platforms
  if (isVideoContent(hostname, url)) {
    return 'video';
  }
  
  // Social media platforms
  if (isSocialMediaPost(hostname, url)) {
    return 'post';
  }
  
  // News and article content
  if (isArticleContent(hostname, url)) {
    return 'article';
  }
  
  // Check DOM structure for content type
  const domBasedType = detectContentTypeFromDOM();
  if (domBasedType) {
    return domBasedType;
  }
  
  // Default fallback
  return 'other';
}

function isVideoContent(hostname, url) {
  // YouTube
  if (hostname.includes('youtube.com') && url.includes('/watch')) {
    return true;
  }
  
  // Other video platforms
  const videoPlatforms = [
    'vimeo.com', 'dailymotion.com', 'twitch.tv', 'tiktok.com',
    'instagram.com/reel', 'instagram.com/tv', 'facebook.com/watch'
  ];
  
  return videoPlatforms.some(platform => {
    if (platform.includes('/')) {
      return url.includes(platform);
    }
    return hostname.includes(platform);
  });
}

function isSocialMediaPost(hostname, url) {
  // Twitter/X
  if ((hostname.includes('twitter.com') || hostname.includes('x.com')) && 
      (url.includes('/status/') || url.includes('/tweet/'))) {
    return true;
  }
  
  // Reddit posts
  if (hostname.includes('reddit.com') && url.includes('/comments/')) {
    return true;
  }
  
  // LinkedIn posts
  if (hostname.includes('linkedin.com') && 
      (url.includes('/posts/') || url.includes('/feed/update/'))) {
    return true;
  }
  
  // Facebook posts
  if (hostname.includes('facebook.com') && 
      (url.includes('/posts/') || url.includes('/photo') || url.includes('/videos/'))) {
    return true;
  }
  
  // Instagram posts
  if (hostname.includes('instagram.com') && 
      (url.includes('/p/') || url.includes('/reel/'))) {
    return true;
  }
  
  // Medium articles (can be blog-like but often shorter posts)
  if (hostname.includes('medium.com') && url.includes('/@')) {
    return true;
  }
  
  return false;
}

function isArticleContent(hostname, url) {
  // News domains
  const newsDomains = [
    'cnn.com', 'bbc.com', 'nytimes.com', 'washingtonpost.com',
    'reuters.com', 'politico.com', 'npr.org', 'theguardian.com',
    'ap.org', 'axios.com', 'thehill.com', 'foxnews.com', 'msnbc.com',
    'wsj.com', 'ft.com', 'economist.com', 'time.com', 'newsweek.com',
    'usatoday.com', 'abcnews.go.com', 'cbsnews.com', 'nbcnews.com'
  ];
  
  if (newsDomains.some(domain => hostname.includes(domain))) {
    return true;
  }
  
  // URL patterns indicating articles
  const articlePatterns = [
    '/article/', '/news/', '/story/', '/blog/', '/post/',
    '/opinion/', '/editorial/', '/analysis/', '/feature/'
  ];
  
  if (articlePatterns.some(pattern => url.includes(pattern))) {
    return true;
  }
  
  // Blog platforms
  const blogPlatforms = [
    'wordpress.com', 'blogspot.com', 'substack.com', 'ghost.io'
  ];
  
  if (blogPlatforms.some(platform => hostname.includes(platform))) {
    return true;
  }
  
  return false;
}

function detectContentTypeFromDOM() {
  // Check OpenGraph type
  const ogType = document.querySelector('meta[property="og:type"]');
  if (ogType) {
    const type = ogType.getAttribute('content').toLowerCase();
    if (type === 'article') return 'article';
    if (type === 'video') return 'video';
  }
  
  // Check structured data
  const jsonLd = document.querySelector('script[type="application/ld+json"]');
  if (jsonLd) {
    try {
      const data = JSON.parse(jsonLd.textContent);
      const type = data['@type'] || data.type;
      if (type) {
        if (['Article', 'NewsArticle', 'BlogPosting'].includes(type)) return 'article';
        if (['VideoObject', 'Video'].includes(type)) return 'video';
      }
    } catch (e) {
      // Invalid JSON-LD, continue
    }
  }
  
  // Check for article-like DOM structure
  const articleElements = [
    'article',
    '[role="main"]',
    '.article',
    '.post-content',
    '.entry-content',
    '.article-body',
    '.story-body',
    '.post-body'
  ];
  
  if (articleElements.some(selector => document.querySelector(selector))) {
    return 'article';
  }
  
  // Check for video elements
  if (document.querySelector('video') || 
      document.querySelector('iframe[src*="youtube"]') ||
      document.querySelector('iframe[src*="vimeo"]')) {
    return 'video';
  }
  
  return null;
}

// Extract basic page metadata
function extractMetadata() {
  const metadata = {
    description: '',
    author: '',
    publishDate: '',
    wordCount: 0,
    lang: document.documentElement.lang || 'en'
  };
  
  // Description from meta tags
  const descMeta = document.querySelector('meta[name="description"]') ||
                   document.querySelector('meta[property="og:description"]') ||
                   document.querySelector('meta[name="twitter:description"]');
  if (descMeta) {
    metadata.description = descMeta.content.trim();
  }
  
  // Author from meta tags or structured data
  const authorMeta = document.querySelector('meta[name="author"]') ||
                     document.querySelector('[rel="author"]') ||
                     document.querySelector('.author') ||
                     document.querySelector('.byline');
  if (authorMeta) {
    metadata.author = (authorMeta.content || authorMeta.textContent || '').trim();
  }
  
  // Publish date from meta tags or structured data
  const dateMeta = document.querySelector('meta[property="article:published_time"]') ||
                   document.querySelector('meta[name="date"]') ||
                   document.querySelector('time[datetime]') ||
                   document.querySelector('.date');
  if (dateMeta) {
    metadata.publishDate = (dateMeta.getAttribute('datetime') || 
                           dateMeta.getAttribute('content') || 
                           dateMeta.textContent || '').trim();
  }
  
  // Word count estimation
  const textContent = document.body.textContent || '';
  metadata.wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
  
  return metadata;
}

// Extract content using Readability.js for articles
async function extractArticleContent() {
  try {
    const ReadabilityClass = await loadReadability();
    if (!ReadabilityClass) {
      throw new Error('Readability.js not available');
    }
    
    // Clone document to avoid modifying the original
    const documentClone = document.cloneNode(true);
    
    // Initialize Readability
    const reader = new ReadabilityClass(documentClone, {
      debug: false,
      maxElemsToParse: 0, // No limit
      nbTopCandidates: 5,
      charThreshold: 500,
      classesToPreserve: ['highlight', 'important']
    });
    
    // Parse the article
    const article = reader.parse();
    
    if (article) {
      return {
        title: article.title || document.title,
        content: article.content || '',
        textContent: article.textContent || '',
        excerpt: article.excerpt || '',
        byline: article.byline || '',
        siteName: article.siteName || window.location.hostname,
        length: article.length || 0,
        readingTime: Math.ceil((article.length || 0) / 200) // ~200 words per minute
      };
    }
    
    throw new Error('Readability failed to parse article');
    
  } catch (error) {
    console.warn('Article extraction failed, falling back to basic extraction:', error);
    return extractBasicContent();
  }
}

// Basic content extraction fallback
function extractBasicContent() {
  // Try to find main content areas
  const contentSelectors = [
    'article',
    '[role="main"]',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.content',
    'main',
    '#content',
    '.main-content'
  ];
  
  let contentElement = null;
  for (const selector of contentSelectors) {
    contentElement = document.querySelector(selector);
    if (contentElement) break;
  }
  
  // Fallback to body if no specific content area found
  if (!contentElement) {
    contentElement = document.body;
  }
  
  const textContent = contentElement.textContent || '';
  
  return {
    title: document.title,
    content: contentElement.innerHTML || '',
    textContent: textContent.trim(),
    excerpt: textContent.slice(0, 300) + (textContent.length > 300 ? '...' : ''),
    byline: '',
    siteName: window.location.hostname,
    length: textContent.length,
    readingTime: Math.ceil(textContent.split(/\s+/).length / 200)
  };
}

// Extract video content from various platforms
function extractVideoContent() {
  const hostname = window.location.hostname.toLowerCase();
  
  if (hostname.includes('youtube.com')) {
    return extractYouTubeContent();
  } else if (hostname.includes('vimeo.com')) {
    return extractVimeoContent();
  } else if (hostname.includes('twitch.tv')) {
    return extractTwitchContent();
  } else {
    return extractGenericVideoContent();
  }
}

// Extract YouTube video information
function extractYouTubeContent() {
  try {
    // Extract video ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    
    if (!videoId) {
      throw new Error('No video ID found in URL');
    }
    
    // Extract video metadata from page
    const title = document.querySelector('h1.ytd-video-primary-info-renderer') ||
                  document.querySelector('h1[class*="title"]') ||
                  document.querySelector('meta[property="og:title"]');
    
    const channel = document.querySelector('#channel-name a') ||
                   document.querySelector('.ytd-channel-name a') ||
                   document.querySelector('[class*="channel-name"]');
    
    const description = document.querySelector('#description') ||
                       document.querySelector('[class*="description"]') ||
                       document.querySelector('meta[name="description"]');
    
    const duration = document.querySelector('.ytp-time-duration') ||
                    document.querySelector('[class*="duration"]');
    
    const uploadDate = document.querySelector('#info [class*="date"]') ||
                      document.querySelector('meta[itemprop="uploadDate"]');
    
    const viewCount = document.querySelector('#count [class*="view-count"]') ||
                     document.querySelector('[class*="view-count"]');
    
    return {
      videoId: videoId,
      title: getElementText(title) || document.title,
      channel: getElementText(channel) || '',
      description: getElementText(description) || '',
      duration: getElementText(duration) || '',
      uploadDate: getElementText(uploadDate) || getMetaContent('uploadDate') || '',
      viewCount: getElementText(viewCount) || '',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      // Transcript will be fetched via backend API in later subtasks
      transcript: null
    };
    
  } catch (error) {
    console.error('YouTube content extraction failed:', error);
    return {
      videoId: null,
      title: document.title,
      error: error.message
    };
  }
}

function extractVimeoContent() {
  try {
    // Extract video ID from URL
    const videoId = window.location.pathname.split('/').pop();
    
    const title = document.querySelector('h1[data-test-id="video-title"]') ||
                 document.querySelector('.player_title') ||
                 document.querySelector('meta[property="og:title"]');
    
    const author = document.querySelector('[data-test-id="video-author"]') ||
                  document.querySelector('.byline a') ||
                  document.querySelector('meta[name="author"]');
    
    const description = document.querySelector('.player_description') ||
                       document.querySelector('meta[property="og:description"]');
    
    return {
      videoId: videoId,
      title: getElementText(title) || document.title,
      author: getElementText(author) || '',
      description: getElementText(description) || '',
      platform: 'Vimeo'
    };
  } catch (error) {
    console.error('Vimeo content extraction failed:', error);
    return extractBasicContent();
  }
}

function extractTwitchContent() {
  try {
    const title = document.querySelector('h1[data-a-target="stream-title"]') ||
                 document.querySelector('.tw-title') ||
                 document.querySelector('meta[property="og:title"]');
    
    const streamer = document.querySelector('[data-a-target="user-display-name"]') ||
                    document.querySelector('.channel-info-content h1') ||
                    document.querySelector('meta[name="author"]');
    
    const category = document.querySelector('[data-a-target="stream-game-link"]') ||
                    document.querySelector('.game-link');
    
    return {
      title: getElementText(title) || document.title,
      streamer: getElementText(streamer) || '',
      category: getElementText(category) || '',
      platform: 'Twitch'
    };
  } catch (error) {
    console.error('Twitch content extraction failed:', error);
    return extractBasicContent();
  }
}

function extractGenericVideoContent() {
  try {
    // Try to find video elements and metadata
    const video = document.querySelector('video');
    const title = document.querySelector('h1') ||
                 document.querySelector('meta[property="og:title"]') ||
                 document.querySelector('title');
    
    const description = document.querySelector('meta[property="og:description"]') ||
                       document.querySelector('meta[name="description"]');
    
    return {
      title: getElementText(title) || document.title,
      description: getElementText(description) || '',
      hasVideo: !!video,
      platform: 'Generic Video'
    };
  } catch (error) {
    console.error('Generic video extraction failed:', error);
    return extractBasicContent();
  }
}

// Extract social media post content
function extractSocialContent() {
  const hostname = window.location.hostname.toLowerCase();
  
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return extractTwitterContent();
  } else if (hostname.includes('reddit.com')) {
    return extractRedditContent();
  } else if (hostname.includes('facebook.com')) {
    return extractFacebookContent();
  } else if (hostname.includes('linkedin.com')) {
    return extractLinkedInContent();
  } else if (hostname.includes('instagram.com')) {
    return extractInstagramContent();
  } else if (hostname.includes('medium.com')) {
    return extractMediumContent();
  } else {
    return extractBasicContent();
  }
}

function extractTwitterContent() {
  try {
    const tweet = document.querySelector('[data-testid="tweet"]') ||
                  document.querySelector('article[role="article"]');
    
    if (!tweet) {
      throw new Error('Tweet content not found');
    }
    
    const text = tweet.querySelector('[data-testid="tweetText"]') ||
                 tweet.querySelector('[lang]');
    
    const author = tweet.querySelector('[data-testid="User-Names"]') ||
                  document.querySelector('meta[property="og:title"]');
    
    const timestamp = tweet.querySelector('time') ||
                     tweet.querySelector('[data-testid="Time"]');
    
    return {
      title: `Tweet by ${getElementText(author)}`,
      content: getElementText(text) || '',
      textContent: getElementText(text) || '',
      author: getElementText(author) || '',
      timestamp: getElementText(timestamp) || '',
      platform: 'Twitter'
    };
    
  } catch (error) {
    console.error('Twitter content extraction failed:', error);
    return extractBasicContent();
  }
}

function extractRedditContent() {
  try {
    const post = document.querySelector('[data-test-id="post-content"]') ||
                 document.querySelector('.Post') ||
                 document.querySelector('article');
    
    if (!post) {
      throw new Error('Reddit post not found');
    }
    
    const title = post.querySelector('h1') ||
                  document.querySelector('meta[property="og:title"]');
    
    const content = post.querySelector('[data-test-id="post-content"]') ||
                   post.querySelector('.usertext-body');
    
    const author = post.querySelector('[data-testid="post_author_link"]') ||
                  post.querySelector('.author');
    
    const subreddit = post.querySelector('[data-testid="subreddit-name"]') ||
                     document.querySelector('meta[property="og:site_name"]');
    
    return {
      title: getElementText(title) || document.title,
      content: getElementText(content) || '',
      textContent: getElementText(content) || '',
      author: getElementText(author) || '',
      subreddit: getElementText(subreddit) || '',
      platform: 'Reddit'
    };
    
  } catch (error) {
    console.error('Reddit content extraction failed:', error);
    return extractBasicContent();
  }
}

function extractFacebookContent() {
  // Facebook has heavy restrictions, use basic extraction
  return extractBasicContent();
}

function extractLinkedInContent() {
  try {
    // LinkedIn post selectors
    const post = document.querySelector('[data-urn]') ||
                 document.querySelector('.feed-shared-update-v2') ||
                 document.querySelector('.occludable-update');
    
    if (!post) {
      return extractBasicContent();
    }
    
    const content = post.querySelector('.feed-shared-text') ||
                   post.querySelector('.update-components-text') ||
                   post.querySelector('.break-words');
    
    const author = post.querySelector('.feed-shared-actor__name') ||
                  post.querySelector('.update-components-actor__name') ||
                  document.querySelector('meta[property="og:title"]');
    
    return {
      title: `LinkedIn Post by ${getElementText(author)}`,
      content: getElementText(content) || '',
      textContent: getElementText(content) || '',
      author: getElementText(author) || '',
      platform: 'LinkedIn'
    };
  } catch (error) {
    console.error('LinkedIn extraction failed:', error);
    return extractBasicContent();
  }
}

function extractInstagramContent() {
  try {
    // Instagram selectors (limited due to restrictions)
    const caption = document.querySelector('meta[property="og:description"]') ||
                   document.querySelector('meta[name="description"]');
    
    const title = document.querySelector('meta[property="og:title"]') ||
                 document.querySelector('title');
    
    return {
      title: getElementText(title) || 'Instagram Post',
      content: getElementText(caption) || '',
      textContent: getElementText(caption) || '',
      platform: 'Instagram'
    };
  } catch (error) {
    console.error('Instagram extraction failed:', error);
    return extractBasicContent();
  }
}

function extractMediumContent() {
  try {
    // Medium article selectors
    const article = document.querySelector('article') ||
                   document.querySelector('.postArticle-content');
    
    if (!article) {
      return extractBasicContent();
    }
    
    const title = article.querySelector('h1') ||
                 document.querySelector('meta[property="og:title"]');
    
    const content = article.querySelector('.section-content') ||
                   article.querySelector('.postArticle-content') ||
                   article;
    
    const author = document.querySelector('.authorName') ||
                  document.querySelector('meta[name="author"]');
    
    return {
      title: getElementText(title) || '',
      content: getElementText(content) || '',
      textContent: getElementText(content) || '',
      author: getElementText(author) || '',
      platform: 'Medium'
    };
  } catch (error) {
    console.error('Medium extraction failed:', error);
    return extractBasicContent();
  }
}

// Helper function to safely get text content from elements
function getElementText(element) {
  if (!element) return '';
  
  if (element.content) return element.content; // For meta tags
  if (element.textContent) return element.textContent.trim();
  if (element.innerText) return element.innerText.trim();
  
  return '';
}

// Helper function to get meta tag content
function getMetaContent(name) {
  const meta = document.querySelector(`meta[name="${name}"]`) ||
               document.querySelector(`meta[property="${name}"]`) ||
               document.querySelector(`meta[itemprop="${name}"]`);
  return meta ? meta.content : '';
}

// Get selected text with context
function getSelectedTextWithContext() {
  const selection = window.getSelection();
  if (!selection.rangeCount || selection.isCollapsed) {
    return null;
  }
  
  const selectedText = selection.toString().trim();
  if (!selectedText) return null;
  
  // Get context around selection
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const containerText = container.textContent || '';
  
  const selectionStart = containerText.indexOf(selectedText);
  const contextStart = Math.max(0, selectionStart - 100);
  const contextEnd = Math.min(containerText.length, selectionStart + selectedText.length + 100);
  
  return {
    text: selectedText,
    context: containerText.slice(contextStart, contextEnd),
    length: selectedText.length
  };
}

// Main content extraction function
async function extractPageContent(includeSelection = false) {
  console.log('Extracting content from:', window.location.href);
  
  try {
    const contentType = detectContentType();
    const metadata = extractMetadata();
    const selectedText = includeSelection ? getSelectedTextWithContext() : null;
    
    let extractedContent = {};
    
    // Extract content based on type
    switch (contentType) {
      case 'article':
        extractedContent = await extractArticleContent();
        break;
      case 'video':
        extractedContent = extractVideoContent();
        break;
      case 'post':
        extractedContent = extractSocialContent();
        break;
      default:
        extractedContent = extractBasicContent();
    }
    
    // Build final data structure
    const result = {
      // Basic page info
      url: window.location.href,
      title: extractedContent.title || document.title,
      domain: window.location.hostname,
      timestamp: new Date().toISOString(),
      contentType: contentType,
      
      // Metadata
      metadata: {
        ...metadata,
        ...extractedContent.metadata
      },
      
      // Content
      content: {
        html: contentType === 'article' ? extractedContent.content : document.documentElement.outerHTML,
        text: extractedContent.textContent || '',
        excerpt: extractedContent.excerpt || metadata.description,
        readingTime: extractedContent.readingTime || 0,
        length: extractedContent.length || 0,
        selected: selectedText
      },
      
      // Type-specific data
      ...(contentType === 'video' && { video: extractedContent }),
      ...(contentType === 'post' && { social: extractedContent }),
      
      // Processing info
      extractionMethod: contentType === 'article' ? 'readability' : 'basic',
      contentHash: await generateContentHash(extractedContent.textContent || ''),
      
      // Size limits
      _sizeWarning: checkContentSize(extractedContent)
    };
    
    console.log('Content extraction completed:', {
      type: contentType,
      titleLength: result.title.length,
      contentLength: result.content.text.length,
      hasSelection: !!selectedText
    });
    
    return result;
    
  } catch (error) {
    console.error('Content extraction failed:', error);
    
    // Return basic fallback data
    return {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      timestamp: new Date().toISOString(),
      contentType: 'other',
      error: error.message,
      content: {
        html: '',
        text: document.body.textContent?.slice(0, 1000) || '',
        selected: includeSelection ? getSelectedTextWithContext() : null
      }
    };
  }
}

// Generate simple hash for content deduplication
async function generateContentHash(content) {
  try {
    // Simple hash for deduplication (not cryptographic)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  } catch (error) {
    return Date.now().toString(36);
  }
}

// Check content size and warn if too large
function checkContentSize(content) {
  const contentStr = JSON.stringify(content);
  const sizeKB = Math.round(contentStr.length / 1024);
  
  if (sizeKB > 500) {
    return `Content size (${sizeKB}KB) exceeds recommended limit of 500KB`;
  }
  
  return null;
}

// Listen for messages from background script
api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  switch (message.type) {
    case 'EXTRACT_CONTENT':
      extractPageContent(false)
        .then(result => {
          showSuccessToast(result.contentType, result.title);
          sendResponse({ success: true, data: result });
        })
        .catch(error => {
          showErrorToast('Failed to capture content');
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicates async response
      
    case 'EXTRACT_SELECTION':
      extractPageContent(true)
        .then(result => {
          createToast('Selected text captured!');
          sendResponse({ success: true, data: result });
        })
        .catch(error => {
          showErrorToast('Failed to capture selection');
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicates async response
      
    case 'GET_PAGE_INFO':
      sendResponse({
        success: true,
        data: {
          url: window.location.href,
          title: document.title,
          domain: window.location.hostname,
          contentType: detectContentType(),
          hasSelection: !window.getSelection().isCollapsed
        }
      });
      break;
      
    case 'PING':
      sendResponse({ success: true, message: 'Content script ready' });
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Toast notification system for visual confirmation
function createToast(message, type = 'success') {
  // Remove any existing toast
  const existingToast = document.querySelector('.dailies-toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'dailies-toast';
  toast.innerHTML = `
    <div class="dailies-toast-content">
      <div class="dailies-toast-icon">
        ${type === 'success' ? '✓' : '⚠'}
      </div>
      <div class="dailies-toast-message">${message}</div>
    </div>
  `;

  // Add CSS styles
  const styles = `
    .dailies-toast {
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      z-index: 2147483647 !important;
      background: ${type === 'success' ? '#10b981' : '#f59e0b'} !important;
      color: white !important;
      padding: 12px 16px !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      min-width: 250px !important;
      max-width: 400px !important;
      transform: translateX(100%) !important;
      transition: transform 0.3s ease-out !important;
      pointer-events: none !important;
    }
    
    .dailies-toast.show {
      transform: translateX(0) !important;
    }
    
    .dailies-toast.hide {
      transform: translateX(100%) !important;
      opacity: 0 !important;
    }
    
    .dailies-toast-content {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }
    
    .dailies-toast-icon {
      font-size: 18px !important;
      font-weight: bold !important;
    }
    
    .dailies-toast-message {
      flex: 1 !important;
      line-height: 1.4 !important;
    }
  `;

  // Inject styles if not already present
  let styleElement = document.querySelector('#dailies-toast-styles');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'dailies-toast-styles';
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }

  // Add toast to page
  document.body.appendChild(toast);

  // Trigger show animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, 3000);

  return toast;
}

function showSuccessToast(contentType, title) {
  const typeMap = {
    'article': 'Article',
    'video': 'Video',
    'post': 'Post',
    'other': 'Content'
  };
  
  const contentTypeName = typeMap[contentType] || 'Content';
  const truncatedTitle = title.length > 50 ? title.substring(0, 50) + '...' : title;
  
  createToast(`${contentTypeName} captured successfully!`);
}

function showErrorToast(message) {
  createToast(message, 'error');
}

// Initialize content script
console.log('Dailies Firefox content script initialized for:', detectContentType());