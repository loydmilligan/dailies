const redis = require('redis');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      // Create Redis client with configuration
      const redisConfig = {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectDelay: 5000,
          retries: 5
        }
      };

      this.client = redis.createClient(redisConfig);

      // Error handling
      this.client.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('🔄 Redis Client connecting...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis Client ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('🔌 Redis Client disconnected');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
      
      // Test the connection
      await this.ping();
      
      return this.client;
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error.message);
      throw error;
    }
  }

  async ping() {
    try {
      const result = await this.client.ping();
      console.log('🏓 Redis ping successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Redis ping failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      console.log('🔌 Redis disconnected');
    }
  }

  // Basic cache operations
  async get(key) {
    try {
      if (!this.isConnected) {
        console.warn('⚠️ Redis not connected, skipping get operation');
        return null;
      }
      return await this.client.get(key);
    } catch (error) {
      console.error('❌ Redis get error:', error);
      return null; // Graceful degradation
    }
  }

  async set(key, value, ttlSeconds = 3600) {
    try {
      if (!this.isConnected) {
        console.warn('⚠️ Redis not connected, skipping set operation');
        return false;
      }
      
      const options = ttlSeconds ? { EX: ttlSeconds } : {};
      const result = await this.client.set(key, value, options);
      return result === 'OK';
    } catch (error) {
      console.error('❌ Redis set error:', error);
      return false; // Graceful degradation
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) {
        console.warn('⚠️ Redis not connected, skipping delete operation');
        return false;
      }
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error('❌ Redis delete error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected) {
        return false;
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ Redis exists error:', error);
      return false;
    }
  }

  // JSON operations
  async setJSON(key, value, ttlSeconds = 3600) {
    try {
      const jsonString = JSON.stringify(value);
      return await this.set(key, jsonString, ttlSeconds);
    } catch (error) {
      console.error('❌ Redis setJSON error:', error);
      return false;
    }
  }

  async getJSON(key) {
    try {
      const jsonString = await this.get(key);
      if (!jsonString) return null;
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('❌ Redis getJSON error:', error);
      return null;
    }
  }

  // Cache-aside pattern helper
  async getOrSet(key, fetchFunction, ttlSeconds = 3600) {
    try {
      // Try to get from cache first
      let data = await this.getJSON(key);
      
      if (data !== null) {
        console.log(`📦 Cache hit for key: ${key}`);
        return data;
      }

      // Cache miss - fetch from source
      console.log(`💿 Cache miss for key: ${key}, fetching from source`);
      data = await fetchFunction();
      
      // Store in cache for next time
      if (data !== null && data !== undefined) {
        await this.setJSON(key, data, ttlSeconds);
        console.log(`📝 Cached data for key: ${key}`);
      }
      
      return data;
    } catch (error) {
      console.error('❌ Redis getOrSet error:', error);
      // If caching fails, still return the data from the fetch function
      try {
        return await fetchFunction();
      } catch (fetchError) {
        console.error('❌ Fetch function error:', fetchError);
        throw fetchError;
      }
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'unhealthy', error: 'Not connected' };
      }
      
      await this.ping();
      return { 
        status: 'healthy', 
        connected: this.isConnected,
        timestamp: new Date().toISOString() 
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString() 
      };
    }
  }

  // Dashboard stats caching
  async cacheDashboardStats(stats) {
    return await this.setJSON('dashboard:stats', stats, 300); // 5 minutes
  }

  async getCachedDashboardStats() {
    return await this.getJSON('dashboard:stats');
  }

  async cacheContentList(filters, content, page = 1) {
    const key = `content:list:${JSON.stringify(filters)}:page:${page}`;
    return await this.setJSON(key, content, 600); // 10 minutes
  }

  async getCachedContentList(filters, page = 1) {
    const key = `content:list:${JSON.stringify(filters)}:page:${page}`;
    return await this.getJSON(key);
  }
}

// Export singleton instance
const redisService = new RedisService();
module.exports = redisService;