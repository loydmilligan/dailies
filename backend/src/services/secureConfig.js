// Secure Configuration Service
// Manages encrypted storage and retrieval of API keys and sensitive configuration

const { 
  encryptApiKey, 
  decryptApiKey, 
  validateEncryptionConfig,
  encryptField,
  decryptField
} = require('./encryption');

/**
 * Secure configuration manager for API keys and sensitive data
 */
class SecureConfigService {
  constructor() {
    this.encryptedKeys = new Map();
    this.keyProviders = new Set(['gemini', 'openai', 'anthropic', 'perplexity']);
    this.initialized = false;
  }

  /**
   * Initialize the secure configuration service
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Validate encryption configuration
      const validation = validateEncryptionConfig();
      if (!validation.valid) {
        throw new Error(`Encryption validation failed: ${validation.issues.join(', ')}`);
      }

      // Load and encrypt API keys from environment
      await this.loadApiKeysFromEnvironment();
      
      this.initialized = true;
      console.log('SecureConfigService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SecureConfigService:', error);
      throw error;
    }
  }

  /**
   * Load API keys from environment variables and encrypt them
   * @returns {Promise<void>}
   */
  async loadApiKeysFromEnvironment() {
    const keyMappings = {
      gemini: 'GEMINI_API_KEY',
      openai: 'OPENAI_API_KEY', 
      anthropic: 'ANTHROPIC_API_KEY',
      perplexity: 'PERPLEXITY_API_KEY'
    };

    for (const [provider, envVar] of Object.entries(keyMappings)) {
      const apiKey = process.env[envVar];
      if (apiKey) {
        try {
          const encryptedKey = encryptApiKey(apiKey, provider);
          this.encryptedKeys.set(provider, encryptedKey);
          console.log(`✓ Encrypted API key for ${provider}`);
        } catch (error) {
          console.error(`Failed to encrypt API key for ${provider}:`, error.message);
        }
      } else {
        console.warn(`⚠️  API key not found for ${provider} (${envVar})`);
      }
    }
  }

  /**
   * Get decrypted API key for a provider
   * @param {string} provider - Provider name
   * @returns {string|null} Decrypted API key or null if not found
   */
  getApiKey(provider) {
    if (!this.initialized) {
      throw new Error('SecureConfigService not initialized');
    }

    const encryptedKey = this.encryptedKeys.get(provider);
    if (!encryptedKey) {
      return null;
    }

    try {
      return decryptApiKey(encryptedKey, provider);
    } catch (error) {
      console.error(`Failed to decrypt API key for ${provider}:`, error.message);
      return null;
    }
  }

  /**
   * Store a new encrypted API key
   * @param {string} provider - Provider name
   * @param {string} apiKey - API key to encrypt and store
   * @returns {boolean} Success status
   */
  setApiKey(provider, apiKey) {
    if (!this.initialized) {
      throw new Error('SecureConfigService not initialized');
    }

    try {
      const encryptedKey = encryptApiKey(apiKey, provider);
      this.encryptedKeys.set(provider, encryptedKey);
      
      // TODO: Persist to secure database storage
      console.log(`API key updated for ${provider}`);
      return true;
    } catch (error) {
      console.error(`Failed to set API key for ${provider}:`, error.message);
      return false;
    }
  }

  /**
   * Remove API key for a provider
   * @param {string} provider - Provider name
   * @returns {boolean} Success status
   */
  removeApiKey(provider) {
    if (!this.initialized) {
      throw new Error('SecureConfigService not initialized');
    }

    const existed = this.encryptedKeys.has(provider);
    this.encryptedKeys.delete(provider);
    
    // TODO: Remove from secure database storage
    if (existed) {
      console.log(`API key removed for ${provider}`);
    }
    
    return existed;
  }

  /**
   * Get list of configured providers
   * @returns {Array<string>} List of providers with keys
   */
  getConfiguredProviders() {
    if (!this.initialized) {
      throw new Error('SecureConfigService not initialized');
    }

    return Array.from(this.encryptedKeys.keys());
  }

  /**
   * Check if a provider has a configured API key
   * @param {string} provider - Provider name
   * @returns {boolean} True if provider has key
   */
  hasApiKey(provider) {
    if (!this.initialized) {
      return false;
    }

    return this.encryptedKeys.has(provider);
  }

  /**
   * Validate all stored API keys
   * @returns {Object} Validation results
   */
  validateApiKeys() {
    if (!this.initialized) {
      throw new Error('SecureConfigService not initialized');
    }

    const results = {
      valid: 0,
      invalid: 0,
      providers: {}
    };

    for (const provider of this.encryptedKeys.keys()) {
      try {
        const key = this.getApiKey(provider);
        if (key && key.length > 0) {
          results.valid++;
          results.providers[provider] = 'valid';
        } else {
          results.invalid++;
          results.providers[provider] = 'empty';
        }
      } catch (error) {
        results.invalid++;
        results.providers[provider] = 'decrypt_failed';
      }
    }

    return results;
  }

  /**
   * Rotate encryption for all API keys (security maintenance)
   * @returns {Promise<Object>} Rotation results
   */
  async rotateApiKeyEncryption() {
    if (!this.initialized) {
      throw new Error('SecureConfigService not initialized');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Re-encrypt all keys with fresh encryption
    for (const [provider, encryptedKey] of this.encryptedKeys.entries()) {
      try {
        const decryptedKey = decryptApiKey(encryptedKey, provider);
        const newEncryptedKey = encryptApiKey(decryptedKey, provider);
        this.encryptedKeys.set(provider, newEncryptedKey);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${provider}: ${error.message}`);
      }
    }

    console.log(`API key encryption rotation completed: ${results.success} success, ${results.failed} failed`);
    return results;
  }

  /**
   * Get service status and health information
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      providersConfigured: this.encryptedKeys.size,
      availableProviders: Array.from(this.keyProviders),
      configuredProviders: this.getConfiguredProviders(),
      encryptionValidation: this.initialized ? validateEncryptionConfig() : null
    };
  }

  /**
   * Securely clear all keys from memory (for shutdown)
   */
  clearKeys() {
    this.encryptedKeys.clear();
    this.initialized = false;
    console.log('SecureConfigService cleared');
  }
}

// Create singleton instance
const secureConfigService = new SecureConfigService();

module.exports = {
  SecureConfigService,
  secureConfigService
};