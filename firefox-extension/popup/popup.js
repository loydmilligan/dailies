// Dailies Content Curator - Firefox Popup Script
// Cross-browser compatible popup functionality

console.log('Dailies Firefox popup script loaded');

// Cross-browser API compatibility layer
const api = (function() {
  if (typeof browser !== 'undefined') {
    return browser; // Firefox (promise-based)
  }
  return chrome; // Chrome/fallback (callback-based)
})();

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup DOM loaded');
  
  try {
    // Get current active tab
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      await updatePageInfo(tabs[0]);
    }
    
    // Check extension status
    const response = await api.runtime.sendMessage({
      type: 'GET_EXTENSION_STATUS'
    });
    
    console.log('Extension status:', response);
    updateStatus('Ready to capture', 'success');
    
    // Set up event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error('Error initializing popup:', error);
    updateStatus('Extension error', 'error');
  }
});

function setupEventListeners() {
  // Capture button click
  const captureBtn = document.getElementById('capture-btn');
  if (captureBtn) {
    captureBtn.addEventListener('click', handleCaptureClick);
  }
  
  // Options button click
  const optionsBtn = document.getElementById('options-btn');
  if (optionsBtn) {
    optionsBtn.addEventListener('click', handleOptionsClick);
  }
}

async function handleCaptureClick() {
  console.log('Capture button clicked');
  
  try {
    // Update UI to show loading state
    updateStatus('Capturing page...', 'loading');
    disableCaptureButton();
    
    // Send capture message to background script
    const response = await api.runtime.sendMessage({
      type: 'CAPTURE_CURRENT_PAGE'
    });
    
    if (response.success) {
      updateStatus('Page captured successfully!', 'success');
      
      // Auto-close popup after successful capture
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      throw new Error(response.error || 'Capture failed');
    }
    
  } catch (error) {
    console.error('Error capturing page:', error);
    updateStatus('Failed to capture page', 'error');
    enableCaptureButton();
  }
}

function handleOptionsClick() {
  console.log('Options button clicked');
  
  // Open options page
  api.runtime.openOptionsPage();
}

async function updatePageInfo(tab) {
  const titleEl = document.getElementById('page-title');
  const urlEl = document.getElementById('page-url');
  
  if (titleEl) titleEl.textContent = tab.title || 'Untitled Page';
  if (urlEl) urlEl.textContent = tab.url || '';
  
  try {
    // Get detailed page info from content script
    const response = await api.tabs.sendMessage(tab.id, {
      type: 'GET_PAGE_INFO'
    });
    
    if (response && response.success) {
      console.log('Page info:', response.data);
      
      // Update capture button based on content type
      updateCaptureButton(response.data.contentType, response.data.hasSelection);
      
      // Update page info display
      if (titleEl) titleEl.textContent = response.data.title || tab.title;
      if (urlEl) urlEl.textContent = response.data.url || tab.url;
      
    } else {
      console.warn('Failed to get page info from content script');
      updatePageInfoBasic(tab);
    }
    
  } catch (error) {
    console.warn('Content script not ready, using basic detection:', error);
    updatePageInfoBasic(tab);
  }
}

function updatePageInfoBasic(tab) {
  // Enhanced fallback content type detection
  const captureBtn = document.getElementById('capture-btn');
  const captureText = captureBtn?.querySelector('.capture-text');
  const captureIcon = captureBtn?.querySelector('.capture-icon');
  
  if (!captureBtn || !captureText || !captureIcon) return;
  
  const url = tab.url.toLowerCase();
  const hostname = new URL(tab.url).hostname.toLowerCase().replace('www.', '');
  
  // Video platforms
  if (url.includes('youtube.com/watch')) {
    captureText.textContent = 'Capture YouTube Video';
    captureIcon.textContent = '🎥';
  } else if (hostname.includes('vimeo.com')) {
    captureText.textContent = 'Capture Vimeo Video';
    captureIcon.textContent = '🎥';
  } else if (hostname.includes('twitch.tv')) {
    captureText.textContent = 'Capture Twitch Stream';
    captureIcon.textContent = '📺';
  } else if (hostname.includes('tiktok.com')) {
    captureText.textContent = 'Capture TikTok Video';
    captureIcon.textContent = '🎵';
  // Social media platforms
  } else if ((hostname.includes('twitter.com') || hostname.includes('x.com')) && url.includes('/status/')) {
    captureText.textContent = 'Capture Tweet';
    captureIcon.textContent = '🐦';
  } else if (hostname.includes('linkedin.com') && url.includes('/posts/')) {
    captureText.textContent = 'Capture LinkedIn Post';
    captureIcon.textContent = '💼';
  } else if (hostname.includes('reddit.com') && url.includes('/comments/')) {
    captureText.textContent = 'Capture Reddit Post';
    captureIcon.textContent = '📱';
  } else if (hostname.includes('instagram.com') && (url.includes('/p/') || url.includes('/reel/'))) {
    captureText.textContent = 'Capture Instagram Post';
    captureIcon.textContent = '📸';
  } else if (hostname.includes('facebook.com')) {
    captureText.textContent = 'Capture Facebook Post';
    captureIcon.textContent = '💬';
  } else if (hostname.includes('medium.com')) {
    captureText.textContent = 'Capture Medium Article';
    captureIcon.textContent = '📰';
  // News and article sites
  } else if (isNewsOrArticleSite(hostname, url)) {
    captureText.textContent = 'Capture Article';
    captureIcon.textContent = '📰';
  } else {
    captureText.textContent = 'Capture Page';
    captureIcon.textContent = '📄';
  }
}

function isNewsOrArticleSite(hostname, url) {
  const newsDomains = [
    'cnn.com', 'bbc.com', 'nytimes.com', 'washingtonpost.com',
    'reuters.com', 'politico.com', 'npr.org', 'theguardian.com',
    'ap.org', 'axios.com', 'thehill.com', 'foxnews.com', 'msnbc.com'
  ];
  
  const articlePatterns = [
    '/article/', '/news/', '/story/', '/blog/', '/post/',
    '/opinion/', '/editorial/', '/analysis/'
  ];
  
  return newsDomains.some(domain => hostname.includes(domain)) ||
         articlePatterns.some(pattern => url.includes(pattern));
}

function updateCaptureButton(contentType, hasSelection) {
  const captureBtn = document.getElementById('capture-btn');
  const captureText = captureBtn?.querySelector('.capture-text');
  const captureIcon = captureBtn?.querySelector('.capture-icon');
  
  if (!captureBtn || !captureText || !captureIcon) return;
  
  // Map content types to UI
  const typeMap = {
    'article': { text: 'Capture Article', icon: '📰' },
    'video': { text: 'Capture Video', icon: '🎥' },
    'post': { text: 'Capture Post', icon: '💬' },
    'other': { text: 'Capture Page', icon: '📄' }
  };
  
  const config = typeMap[contentType] || typeMap['other'];
  captureText.textContent = config.text;
  captureIcon.textContent = config.icon;
  
  // Add selection indicator if text is selected
  if (hasSelection) {
    captureText.textContent += ' (+ Selection)';
  }
}

function updateStatus(message, type = 'default') {
  const statusEl = document.getElementById('status');
  const statusText = statusEl?.querySelector('.status-text');
  
  if (!statusEl || !statusText) return;
  
  statusText.textContent = message;
  statusEl.className = `status status-${type}`;
}

function disableCaptureButton() {
  const captureBtn = document.getElementById('capture-btn');
  if (captureBtn) {
    captureBtn.disabled = true;
    captureBtn.classList.add('loading');
  }
}

function enableCaptureButton() {
  const captureBtn = document.getElementById('capture-btn');
  if (captureBtn) {
    captureBtn.disabled = false;
    captureBtn.classList.remove('loading');
  }
}

// Handle popup errors gracefully
window.addEventListener('error', (event) => {
  console.error('Popup error:', event.error);
  updateStatus('Popup error occurred', 'error');
});

console.log('Dailies Firefox popup script initialized');