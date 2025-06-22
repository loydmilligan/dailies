// Dailies Content Curator - Background Service Worker
// Handles extension lifecycle, context menus, and message passing

console.log('Dailies service worker starting...');

// Install event - set up context menus
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  // Create context menu items
  chrome.contextMenus.create({
    id: 'capture-page',
    title: 'Capture this page',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'capture-selection',
    title: 'Capture selected text',
    contexts: ['selection']
  });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
  
  switch (info.menuItemId) {
    case 'capture-page':
      handlePageCapture(tab);
      break;
    case 'capture-selection':
      handleSelectionCapture(tab, info.selectionText);
      break;
  }
});

// Message handler for communication with popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Service worker received message:', message);
  
  switch (message.type) {
    case 'CAPTURE_CURRENT_PAGE':
      // When message comes from popup, sender.tab is undefined
      // Get current active tab directly
      chrome.tabs.query({ active: true, currentWindow: true })
        .then(tabs => {
          if (tabs[0]) {
            handlePageCapture(tabs[0]);
            sendResponse({ success: true });
          } else {
            sendResponse({ error: 'No active tab found' });
          }
        })
        .catch(error => {
          console.error('Error getting active tab:', error);
          sendResponse({ error: 'Failed to get active tab' });
        });
      return true; // Keep message channel open for async response
    
    case 'GET_EXTENSION_STATUS':
      sendResponse({ 
        status: 'ready',
        version: chrome.runtime.getManifest().version
      });
      break;
    
    default:
      console.warn('Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }
});

// Enhanced content capture with proper message passing
async function handlePageCapture(tab) {
  console.log('Capturing page:', tab.url);
  
  try {
    // First, ensure content script is injected
    await ensureContentScriptInjected(tab.id);
    
    // Send message to content script for extraction
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'EXTRACT_CONTENT'
    });
    
    if (response.success) {
      console.log('Page content extracted (summary):', {
        url: response.data.url,
        title: response.data.title,
        contentType: response.data.contentType,
        contentLength: response.data.content?.text?.length || 0
      });
      
      // Log complete extraction data for inspection
      console.log('Complete extraction data:', response.data);
      
      // Send to backend API
      try {
        const apiResponse = await apiClient.saveContent(response.data);
        console.log('Content saved to backend:', apiResponse);
        
        if (apiResponse.duplicate) {
          console.log('Content already exists in database');
        }
      } catch (apiError) {
        console.error('Failed to save content to backend:', apiError);
        // Content extraction was successful, but backend save failed
        // User still gets success toast, but we log the backend error
      }
    } else {
      throw new Error(response.error || 'Content extraction failed');
    }
    
  } catch (error) {
    console.error('Error capturing page:', error);
    // Error notification now handled by toast notification in content script
  }
}

// Ensure content script is injected before attempting communication
async function ensureContentScriptInjected(tabId) {
  try {
    // Try to ping the content script first
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    console.log('Content script already loaded');
  } catch (error) {
    console.log('Content script not loaded, injecting...');
    
    // Inject content script
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content/content-script.js']
    });
    
    // Wait a moment for initialization
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Content script injected successfully');
  }
}

async function handleSelectionCapture(tab, selectionText) {
  console.log('Capturing selection:', selectionText);
  
  try {
    // Send message to content script for selection extraction
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'EXTRACT_SELECTION'
    });
    
    if (response.success) {
      console.log('Selection content extracted:', {
        url: response.data.url,
        title: response.data.title,
        hasSelection: !!response.data.content?.selected,
        selectionLength: response.data.content?.selected?.length || 0
      });
      
      // TODO: Send to backend API (will be implemented in later subtasks)
      // Visual confirmation now handled by toast notification in content script
    } else {
      throw new Error(response.error || 'Selection extraction failed');
    }
    
  } catch (error) {
    console.error('Error capturing selection:', error);
    // Error notification now handled by toast notification in content script
  }
}

// Content extraction is now handled by content script via message passing
// This removes the need for function injection

// API Client for Backend Communication
class DailiesAPIClient {
  constructor() {
    this.baseURL = 'http://localhost:3000/api';
    this.maxRetries = 3;
    this.retryDelay = 1000; // Base delay in ms
  }

  async getConfig() {
    try {
      const result = await chrome.storage.local.get(['apiUrl', 'authToken']);
      return {
        baseURL: result.apiUrl || this.baseURL,
        authToken: result.authToken || null
      };
    } catch (error) {
      console.error('Failed to get API config:', error);
      return { baseURL: this.baseURL, authToken: null };
    }
  }

  async makeRequest(endpoint, options = {}) {
    const config = await this.getConfig();
    const url = `${config.baseURL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (config.authToken) {
      headers.Authorization = `Bearer ${config.authToken}`;
    }

    const requestOptions = {
      method: 'GET',
      ...options,
      headers
    };

    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`API request attempt ${attempt + 1}:`, url);
        
        const response = await fetch(url, requestOptions);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${data.error || data.message || 'Unknown error'}`);
        }

        console.log('API request successful:', endpoint);
        return data;

      } catch (error) {
        lastError = error;
        console.error(`API request attempt ${attempt + 1} failed:`, error.message);

        // Don't retry on client errors (4xx)
        if (error.message.includes('HTTP 4')) {
          break;
        }

        // Don't retry on last attempt
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  async saveContent(contentData) {
    return await this.makeRequest('/content/public', {
      method: 'POST',
      body: JSON.stringify(contentData)
    });
  }

  async getHealth() {
    return await this.makeRequest('/health');
  }

  async getContent(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/content?${queryString}` : '/content';
    return await this.makeRequest(endpoint);
  }
}

// Initialize API client
const apiClient = new DailiesAPIClient();

// Context Menu Setup
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for text selection
  chrome.contextMenus.create({
    id: 'capture-selection',
    title: 'Capture selected text with Dailies',
    contexts: ['selection'],
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });

  // Create context menu for page capture
  chrome.contextMenus.create({
    id: 'capture-page',
    title: 'Capture this page with Dailies',
    contexts: ['page'],
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });

  console.log('Dailies context menus created');
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Context menu clicked:', info.menuItemId, 'on tab:', tab.url);
  
  try {
    switch (info.menuItemId) {
      case 'capture-selection':
        await handleSelectionCapture(tab, info.selectionText);
        break;
        
      case 'capture-page':
        await handlePageCapture(tab);
        break;
        
      default:
        console.warn('Unknown context menu item:', info.menuItemId);
    }
  } catch (error) {
    console.error('Context menu action failed:', error);
  }
});

// Visual notifications now handled by toast system in content script