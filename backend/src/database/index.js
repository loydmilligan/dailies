const { PrismaClient } = require('@prisma/client');

class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  // Connection management
  async connect() {
    try {
      await this.prisma.$connect();
      console.log('✅ Connected to PostgreSQL database');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
    console.log('🔌 Disconnected from database');
  }

  // Health check
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }

  async testConnection() {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  // Content operations
  async createContentItem(data) {
    return await this.prisma.content_items.create({ data });
  }

  async getContentItems(options = {}) {
    const { page = 1, limit = 20, filters = {} } = options;
    const skip = (page - 1) * limit;
    
    const where = {};
    if (filters.category) where.category = filters.category;
    if (filters.content_type) where.content_type = filters.content_type;
    if (filters.status) where.processing_status = filters.status;

    const [items, total] = await Promise.all([
      this.prisma.content_items.findMany({
        where,
        take: limit,
        skip,
        orderBy: { captured_at: 'desc' },
        include: {
          political_analysis: true
        }
      }),
      this.prisma.content_items.count({ where })
    ]);

    return {
      items,
      total,
      page,
      limit
    };
  }

  async getContentItemById(id, includeAnalysis = true) {
    return await this.prisma.content_items.findUnique({
      where: { id },
      include: {
        political_analysis: includeAnalysis,
        processing_logs: true
      }
    });
  }

  async getContentByHash(contentHash) {
    return await this.prisma.content_items.findFirst({
      where: { content_hash: contentHash }
    });
  }

  async updateContentItem(id, data) {
    return await this.prisma.content_items.update({
      where: { id },
      data
    });
  }

  // Political analysis operations
  async createPoliticalAnalysis(data) {
    return await this.prisma.political_analysis.create({ data });
  }

  async getPoliticalAnalysis(contentId) {
    return await this.prisma.political_analysis.findUnique({
      where: { content_id: contentId }
    });
  }

  // Daily digest operations
  async createDailyDigest(data) {
    return await this.prisma.daily_digests.create({ data });
  }

  async getDailyDigestByDate(date) {
    return await this.prisma.daily_digests.findUnique({
      where: { digest_date: date }
    });
  }

  async getDailyDigests(options = {}) {
    const { page = 1, limit = 20, filters = {} } = options;
    const skip = (page - 1) * limit;

    const where = {};
    if (filters.startDate) where.digest_date = { gte: new Date(filters.startDate) };
    if (filters.endDate) {
      where.digest_date = { 
        ...where.digest_date,
        lte: new Date(filters.endDate) 
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.daily_digests.findMany({
        where,
        take: limit,
        skip,
        orderBy: { digest_date: 'desc' }
      }),
      this.prisma.daily_digests.count({ where })
    ]);

    return {
      items,
      total,
      page,
      limit
    };
  }

  async getRecentDigests(limit = 10) {
    return await this.prisma.daily_digests.findMany({
      take: limit,
      orderBy: { digest_date: 'desc' }
    });
  }

  // User settings operations
  async getUserSettings() {
    return await this.prisma.user_settings.findFirst();
  }

  async updateUserSettings(id, data) {
    return await this.prisma.user_settings.update({
      where: { id },
      data
    });
  }

  // User management
  async createUser(data) {
    return await this.prisma.users.create({ data });
  }

  async getUserById(id) {
    return await this.prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        preferences: true,
        created_at: true,
        last_login: true,
        status: true
      }
    });
  }

  async getUserByEmail(email) {
    return await this.prisma.users.findUnique({
      where: { email }
    });
  }

  async updateUserLastLogin(userId) {
    return await this.prisma.users.update({
      where: { id: userId },
      data: { last_login: new Date() }
    });
  }

  // Processing logs
  async createProcessingLog(data) {
    return await this.prisma.processing_logs.create({ data });
  }

  async getProcessingLogs(contentId) {
    return await this.prisma.processing_logs.findMany({
      where: { content_id: contentId },
      orderBy: { created_at: 'desc' }
    });
  }

  // Advanced queries
  async getContentForDigest(date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    return await this.prisma.content_items.findMany({
      where: {
        captured_at: {
          gte: startDate,
          lt: endDate
        },
        processing_status: 'completed'
      },
      include: {
        political_analysis: true
      },
      orderBy: {
        captured_at: 'desc'
      }
    });
  }

  async searchContent(query, options = {}) {
    const { page = 1, limit = 20, filters = {} } = options;
    const skip = (page - 1) * limit;
    
    const where = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { raw_content: { contains: query, mode: 'insensitive' } }
      ]
    };

    if (filters.category) where.category = filters.category;
    if (filters.content_type) where.content_type = filters.content_type;

    const [items, total] = await Promise.all([
      this.prisma.content_items.findMany({
        where,
        take: limit,
        skip,
        include: {
          political_analysis: true
        },
        orderBy: { captured_at: 'desc' }
      }),
      this.prisma.content_items.count({ where })
    ]);

    return {
      items,
      total,
      page,
      limit
    };
  }

  // Transaction support
  async transaction(operations) {
    return await this.prisma.$transaction(operations);
  }

  // Raw query support for complex operations
  async executeRaw(query, params = []) {
    return await this.prisma.$queryRawUnsafe(query, ...params);
  }
}

// Singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;