// Dailies Content Curator - Options Script
// Handles settings configuration and storage

document.addEventListener('DOMContentLoaded', () => {
  console.log('Options script loaded');
  
  // Initialize options page
  loadSettings();
  
  // Set up event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // Settings form submission
  const form = document.getElementById('settings-form');
  form.addEventListener('submit', handleSaveSettings);
  
  // Test connection button
  const testBtn = document.getElementById('test-connection');
  testBtn.addEventListener('click', handleTestConnection);
}

async function loadSettings() {
  try {
    // Load settings from Chrome storage
    const settings = await chrome.storage.sync.get({
      backendUrl: 'http://localhost:3000',
      apiKey: '',
      autoCapture: false
    });
    
    // Populate form fields
    document.getElementById('backend-url').value = settings.backendUrl;
    document.getElementById('api-key').value = settings.apiKey;
    document.getElementById('auto-capture').checked = settings.autoCapture;
    
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
    
    // Save to Chrome storage (sync for cross-device settings)
    await chrome.storage.sync.set(settings);
    
    // Also save API config to local storage for background script
    await chrome.storage.local.set({
      apiUrl: settings.backendUrl + '/api',
      authToken: settings.apiKey || null
    });
    
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
    const settings = await chrome.storage.sync.get(['backendUrl', 'apiKey']);
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
      showStatus(`Connection successful! Server: ${data.version || 'unknown'}`, 'success');
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