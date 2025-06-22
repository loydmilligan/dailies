// Dailies Content Curator - Firefox Options Script
// Cross-browser compatible settings configuration and storage

console.log('Dailies Firefox options script loaded');

// Cross-browser API compatibility layer
const api = (function() {
  if (typeof browser !== 'undefined') {
    return browser; // Firefox (promise-based)
  }
  return chrome; // Chrome/fallback (callback-based)
})();

document.addEventListener('DOMContentLoaded', () => {
  console.log('Options page DOM loaded');
  
  // Initialize options page
  loadSettings();
  
  // Set up event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // Settings form submission
  const form = document.getElementById('settings-form');
  if (form) {
    form.addEventListener('submit', handleSaveSettings);
  }
  
  // Test connection button
  const testBtn = document.getElementById('test-connection');
  if (testBtn) {
    testBtn.addEventListener('click', handleTestConnection);
  }
}

async function loadSettings() {
  try {
    // Load settings from browser storage
    let settings;
    
    if (api.storage.sync.get.length > 1) {
      // Chrome-style callback
      settings = await new Promise(resolve => {
        api.storage.sync.get({
          backendUrl: 'http://localhost:3000',
          apiKey: '',
          autoCapture: false
        }, resolve);
      });
    } else {
      // Firefox-style promise
      settings = await api.storage.sync.get({
        backendUrl: 'http://localhost:3000',
        apiKey: '',
        autoCapture: false
      });
    }
    
    // Populate form fields
    const backendUrlEl = document.getElementById('backend-url');
    const apiKeyEl = document.getElementById('api-key');
    const autoCaptureEl = document.getElementById('auto-capture');
    
    if (backendUrlEl) backendUrlEl.value = settings.backendUrl;
    if (apiKeyEl) apiKeyEl.value = settings.apiKey;
    if (autoCaptureEl) autoCaptureEl.checked = settings.autoCapture;
    
    console.log('Settings loaded:', settings);
    
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

async function handleSaveSettings(event) {
  event.preventDefault();
  
  try {
    // Get form data
    const formData = new FormData(event.target);
    const settings = {
      backendUrl: formData.get('backendUrl').trim(),
      apiKey: formData.get('apiKey').trim(),
      autoCapture: formData.get('autoCapture') === 'on'
    };
    
    // Validate backend URL
    if (!isValidUrl(settings.backendUrl)) {
      throw new Error('Please enter a valid backend URL');
    }
    
    // Save to browser storage
    if (api.storage.sync.set.length > 1) {
      // Chrome-style callback
      await new Promise((resolve, reject) => {
        api.storage.sync.set(settings, () => {
          if (api.runtime.lastError) {
            reject(new Error(api.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    } else {
      // Firefox-style promise
      await api.storage.sync.set(settings);
    }
    
    // Also save API config to local storage for background script
    const localSettings = {
      apiUrl: settings.backendUrl + '/api',
      authToken: settings.apiKey || null
    };
    
    if (api.storage.local.set.length > 1) {
      // Chrome-style callback
      await new Promise((resolve, reject) => {
        api.storage.local.set(localSettings, () => {
          if (api.runtime.lastError) {
            reject(new Error(api.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    } else {
      // Firefox-style promise
      await api.storage.local.set(localSettings);
    }
    
    console.log('Settings saved:', settings);
    showStatus('Settings saved successfully!', 'success');
    
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus(error.message || 'Error saving settings', 'error');
  }
}

async function handleTestConnection() {
  try {
    // Get current backend URL
    let settings;
    
    if (api.storage.sync.get.length > 1) {
      // Chrome-style callback
      settings = await new Promise(resolve => {
        api.storage.sync.get(['backendUrl', 'apiKey'], resolve);
      });
    } else {
      // Firefox-style promise
      settings = await api.storage.sync.get(['backendUrl', 'apiKey']);
    }
    
    const backendUrl = settings.backendUrl;
    
    if (!backendUrl) {
      throw new Error('Please configure a backend URL first');
    }
    
    showStatus('Testing connection...', 'info');
    
    // Test connection to backend
    const response = await fetch(`${backendUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.apiKey && { 'Authorization': `Bearer ${settings.apiKey}` })
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      showStatus(`Connection successful! Server status: ${data.status || 'healthy'}`, 'success');
    } else {
      throw new Error(`Server responded with status ${response.status}`);
    }
    
  } catch (error) {
    console.error('Connection test failed:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      showStatus('Connection failed - server may be offline or URL incorrect', 'error');
    } else {
      showStatus(`Connection failed: ${error.message}`, 'error');
    }
  }
}

function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status-message');
  
  if (!statusEl) return;
  
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  statusEl.style.display = 'block';
  
  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Handle options page errors gracefully
window.addEventListener('error', (event) => {
  console.error('Options page error:', event.error);
  showStatus('An error occurred on the options page', 'error');
});

console.log('Dailies Firefox options script initialized');