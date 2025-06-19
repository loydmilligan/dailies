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

  // Content operations
  async createContentItem(data) {
    return await this.prisma.content_items.create({ data });
  }

  async getContentItems(options = {}) {
    const { take = 50, skip = 0, category, status, orderBy = { captured_at: 'desc' } } = options;
    
    const where = {};
    if (category) where.category = category;
    if (status) where.processing_status = status;

    return await this.prisma.content_items.findMany({
      where,
      take,
      skip,
      orderBy,
      include: {
        political_analysis: true
      }
    });
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

  async getDailyDigest(date) {
    return await this.prisma.daily_digests.findUnique({
      where: { digest_date: date }
    });
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
    const { category, limit = 50 } = options;
    
    const where = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { raw_content: { contains: query, mode: 'insensitive' } }
      ]
    };

    if (category) where.category = category;

    return await this.prisma.content_items.findMany({
      where,
      take: limit,
      include: {
        political_analysis: true
      },
      orderBy: { captured_at: 'desc' }
    });
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