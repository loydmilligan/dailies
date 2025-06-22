// Data Encryption Service
// Provides encryption/decryption for sensitive data, API keys, and content

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Generate a cryptographically secure encryption key
 * @returns {Buffer} Random encryption key
 */
function generateEncryptionKey() {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Derive encryption key from password using PBKDF2
 * @param {string} password - Password to derive key from
 * @param {Buffer} salt - Salt for key derivation
 * @param {number} iterations - Number of iterations (default: 100000)
 * @returns {Buffer} Derived encryption key
 */
function deriveKeyFromPassword(password, salt, iterations = 100000) {
  return crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, 'sha256');
}

/**
 * Get master encryption key from environment
 * @returns {Buffer} Master encryption key
 */
function getMasterKey() {
  const masterKeyHex = process.env.MASTER_ENCRYPTION_KEY;
  
  if (!masterKeyHex) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MASTER_ENCRYPTION_KEY must be set in production');
    }
    console.warn('MASTER_ENCRYPTION_KEY not set, using default (not secure for production)');
    return crypto.createHash('sha256').update('default-dev-key-change-in-production').digest();
  }
  
  if (masterKeyHex.length !== KEY_LENGTH * 2) {
    throw new Error('MASTER_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  
  return Buffer.from(masterKeyHex, 'hex');
}

/**
 * Encrypt data using AES-256-GCM
 * @param {string|Buffer} data - Data to encrypt
 * @param {Buffer} key - Encryption key (optional, uses master key if not provided)
 * @param {Buffer} associatedData - Additional authenticated data (optional)
 * @returns {Object} Encrypted data with IV and auth tag
 */
function encrypt(data, key = null, associatedData = null) {
  try {
    const encryptionKey = key || getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
    
    if (associatedData) {
      cipher.setAAD(associatedData);
    }
    
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    
    let encrypted = cipher.update(dataBuffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: ALGORITHM
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param {Object} encryptedData - Encrypted data object
 * @param {Buffer} key - Decryption key (optional, uses master key if not provided)
 * @param {Buffer} associatedData - Additional authenticated data (optional)
 * @returns {string} Decrypted data
 */
function decrypt(encryptedData, key = null, associatedData = null) {
  try {
    const decryptionKey = key || getMasterKey();
    const { encrypted, iv, authTag, algorithm } = encryptedData;
    
    if (algorithm !== ALGORITHM) {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
    
    const decipher = crypto.createDecipheriv(algorithm, decryptionKey, Buffer.from(iv, 'base64'));
    
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    
    if (associatedData) {
      decipher.setAAD(associatedData);
    }
    
    let decrypted = decipher.update(Buffer.from(encrypted, 'base64'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Encrypt API key for secure storage
 * @param {string} apiKey - API key to encrypt
 * @param {string} provider - Provider name (for associated data)
 * @returns {Object} Encrypted API key
 */
function encryptApiKey(apiKey, provider) {
  const associatedData = Buffer.from(`api_key:${provider}`, 'utf8');
  return encrypt(apiKey, null, associatedData);
}

/**
 * Decrypt API key from storage
 * @param {Object} encryptedApiKey - Encrypted API key object
 * @param {string} provider - Provider name (for associated data)
 * @returns {string} Decrypted API key
 */
function decryptApiKey(encryptedApiKey, provider) {
  const associatedData = Buffer.from(`api_key:${provider}`, 'utf8');
  return decrypt(encryptedApiKey, null, associatedData);
}

/**
 * Encrypt sensitive content before database storage
 * @param {string} content - Content to encrypt
 * @param {string} contentType - Type of content (for associated data)
 * @param {number} userId - User ID (for associated data)
 * @returns {Object} Encrypted content
 */
function encryptContent(content, contentType = 'general', userId = null) {
  const associatedData = Buffer.from(`content:${contentType}:${userId || 'system'}`, 'utf8');
  return encrypt(content, null, associatedData);
}

/**
 * Decrypt content from database
 * @param {Object} encryptedContent - Encrypted content object
 * @param {string} contentType - Type of content (for associated data)
 * @param {number} userId - User ID (for associated data)
 * @returns {string} Decrypted content
 */
function decryptContent(encryptedContent, contentType = 'general', userId = null) {
  const associatedData = Buffer.from(`content:${contentType}:${userId || 'system'}`, 'utf8');
  return decrypt(encryptedContent, null, associatedData);
}

/**
 * Encrypt user preferences and sensitive user data
 * @param {Object} userData - User data to encrypt
 * @param {number} userId - User ID
 * @returns {Object} Encrypted user data
 */
function encryptUserData(userData, userId) {
  const dataString = JSON.stringify(userData);
  const associatedData = Buffer.from(`user_data:${userId}`, 'utf8');
  return encrypt(dataString, null, associatedData);
}

/**
 * Decrypt user preferences and sensitive user data
 * @param {Object} encryptedUserData - Encrypted user data object
 * @param {number} userId - User ID
 * @returns {Object} Decrypted user data
 */
function decryptUserData(encryptedUserData, userId) {
  const associatedData = Buffer.from(`user_data:${userId}`, 'utf8');
  const decryptedString = decrypt(encryptedUserData, null, associatedData);
  return JSON.parse(decryptedString);
}

/**
 * Hash sensitive data for indexing/searching while maintaining privacy
 * @param {string} data - Data to hash
 * @param {string} salt - Salt for hashing (optional)
 * @returns {string} Hashed data
 */
function hashForIndex(data, salt = null) {
  const hashSalt = salt || process.env.INDEX_HASH_SALT || 'default-salt-change-in-production';
  return crypto.createHmac('sha256', hashSalt).update(data).digest('hex');
}

/**
 * Generate a secure random salt
 * @returns {string} Base64 encoded salt
 */
function generateSalt() {
  return crypto.randomBytes(SALT_LENGTH).toString('base64');
}

/**
 * Secure field encryption for database fields
 * @param {string} fieldValue - Field value to encrypt
 * @param {string} fieldName - Field name for context
 * @param {string} tableName - Table name for context
 * @returns {Object} Encrypted field data
 */
function encryptField(fieldValue, fieldName, tableName = 'unknown') {
  const associatedData = Buffer.from(`field:${tableName}:${fieldName}`, 'utf8');
  return encrypt(fieldValue, null, associatedData);
}

/**
 * Decrypt database field
 * @param {Object} encryptedField - Encrypted field object
 * @param {string} fieldName - Field name for context
 * @param {string} tableName - Table name for context
 * @returns {string} Decrypted field value
 */
function decryptField(encryptedField, fieldName, tableName = 'unknown') {
  const associatedData = Buffer.from(`field:${tableName}:${fieldName}`, 'utf8');
  return decrypt(encryptedField, null, associatedData);
}

/**
 * Encrypt data at rest for file storage
 * @param {Buffer} fileData - File data to encrypt
 * @param {string} fileName - File name for context
 * @returns {Object} Encrypted file data
 */
function encryptFile(fileData, fileName) {
  const associatedData = Buffer.from(`file:${fileName}`, 'utf8');
  return encrypt(fileData, null, associatedData);
}

/**
 * Decrypt file data
 * @param {Object} encryptedFileData - Encrypted file data object
 * @param {string} fileName - File name for context
 * @returns {Buffer} Decrypted file data
 */
function decryptFile(encryptedFileData, fileName) {
  const associatedData = Buffer.from(`file:${fileName}`, 'utf8');
  const decryptedData = decrypt(encryptedFileData, null, associatedData);
  return Buffer.from(decryptedData, 'utf8');
}

/**
 * Key rotation - re-encrypt data with new key
 * @param {Object} encryptedData - Data encrypted with old key
 * @param {Buffer} oldKey - Old encryption key
 * @param {Buffer} newKey - New encryption key
 * @param {Buffer} associatedData - Associated data (optional)
 * @returns {Object} Data re-encrypted with new key
 */
function rotateKey(encryptedData, oldKey, newKey, associatedData = null) {
  const decryptedData = decrypt(encryptedData, oldKey, associatedData);
  return encrypt(decryptedData, newKey, associatedData);
}

/**
 * Validate encryption configuration
 * @returns {Object} Validation results
 */
function validateEncryptionConfig() {
  const results = {
    valid: true,
    issues: []
  };
  
  try {
    // Test master key
    getMasterKey();
  } catch (error) {
    results.valid = false;
    results.issues.push(`Master key issue: ${error.message}`);
  }
  
  // Test encryption/decryption
  try {
    const testData = 'test-encryption-data';
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    
    if (decrypted !== testData) {
      results.valid = false;
      results.issues.push('Encryption/decryption test failed');
    }
  } catch (error) {
    results.valid = false;
    results.issues.push(`Encryption test failed: ${error.message}`);
  }
  
  // Check environment variables
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.MASTER_ENCRYPTION_KEY) {
      results.valid = false;
      results.issues.push('MASTER_ENCRYPTION_KEY not set in production');
    }
    
    if (!process.env.INDEX_HASH_SALT) {
      results.issues.push('INDEX_HASH_SALT not set (using default)');
    }
  }
  
  return results;
}

module.exports = {
  encrypt,
  decrypt,
  encryptApiKey,
  decryptApiKey,
  encryptContent,
  decryptContent,
  encryptUserData,
  decryptUserData,
  encryptField,
  decryptField,
  encryptFile,
  decryptFile,
  hashForIndex,
  generateSalt,
  generateEncryptionKey,
  deriveKeyFromPassword,
  rotateKey,
  validateEncryptionConfig,
  
  // Constants for external use
  ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH,
  TAG_LENGTH
};