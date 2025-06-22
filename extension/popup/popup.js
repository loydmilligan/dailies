// Dailies Content Curator - Popup Script
// Handles popup UI interactions and communication with background script

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup script loaded');
  
  // Initialize popup
  await initializePopup();
  
  // Set up event listeners
  setupEventListeners();
});

async function initializePopup() {
  try {
    // Get current tab information
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      await updatePageInfo(tab);
    }
    
    // Check extension status
    const response = await chrome.runtime.sendMessage({
      type: 'GET_EXTENSION_STATUS'
    });
    
    console.log('Extension status:', response);
    updateStatus('Ready to capture', 'success');
    
  } catch (error) {
    console.error('Error initializing popup:', error);
    updateStatus('Extension error', 'error');
  }
}

function setupEventListeners() {
  // Capture button click
  const captureBtn = document.getElementById('capture-btn');
  captureBtn.addEventListener('click', handleCaptureClick);
  
  // Options button click
  const optionsBtn = document.getElementById('options-btn');
  optionsBtn.addEventListener('click', handleOptionsClick);
}

async function handleCaptureClick() {
  console.log('Capture button clicked');
  
  try {
    // Update UI to show loading state
    updateStatus('Capturing page...', 'loading');
    disableCaptureButton();
    
    // Send capture message to background script
    const response = await chrome.runtime.sendMessage({
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
  chrome.runtime.openOptionsPage();
}

async function updatePageInfo(tab) {
  const titleEl = document.getElementById('page-title');
  const urlEl = document.getElementById('page-url');
  
  titleEl.textContent = tab.title || 'Untitled Page';
  urlEl.textContent = tab.url || '';
  
  try {
    // Get detailed page info from content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'GET_PAGE_INFO'
    });
    
    if (response.success) {
      const pageInfo = response.data;
      
      // Update capture button text based on detected content type
      const captureBtn = document.getElementById('capture-btn');
      const captureText = captureBtn.querySelector('.capture-text');
      const captureIcon = captureBtn.querySelector('.capture-icon');
      
      switch (pageInfo.contentType) {
        case 'video':
          captureText.textContent = 'Capture Video';
          captureIcon.textContent = '🎥';
          break;
        case 'post':
          captureText.textContent = 'Capture Post';
          captureIcon.textContent = '💬';
          break;
        case 'article':
          captureText.textContent = 'Capture Article';
          captureIcon.textContent = '📰';
          break;
        default:
          captureText.textContent = 'Capture Page';
          captureIcon.textContent = '📄';
      }
      
      // Show if there's selected text
      if (pageInfo.hasSelection) {
        updateStatus('Text selected - ready to capture', 'success');
      }
      
    } else {
      console.warn('Could not get page info:', response.error);
      // Fallback to basic URL-based detection
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
  const captureText = captureBtn.querySelector('.capture-text');
  const captureIcon = captureBtn.querySelector('.capture-icon');
  
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

function updateStatus(message, type = 'default') {
  const statusEl = document.getElementById('status');
  const statusText = statusEl.querySelector('.status-text');
  
  statusText.textContent = message;
  
  // Remove existing status classes
  statusEl.classList.remove('success', 'error', 'loading');
  
  // Add new status class
  if (type !== 'default') {
    statusEl.classList.add(type);
  }
}

function disableCaptureButton() {
  const captureBtn = document.getElementById('capture-btn');
  captureBtn.disabled = true;
  captureBtn.classList.add('loading');
}

function enableCaptureButton() {
  const captureBtn = document.getElementById('capture-btn');
  captureBtn.disabled = false;
  captureBtn.classList.remove('loading');
}