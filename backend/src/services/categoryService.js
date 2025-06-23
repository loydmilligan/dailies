// Category Service - Database operations for modular content processing
// Provides CRUD operations for categories, actions, matchers, and aliases

const { logger } = require('../middleware/logging');

/**
 * Service for managing categories, actions, and processing relationships
 */
class CategoryService {
  constructor(database) {
    this.db = database;
  }

  /**
   * Get all active categories with their actions
   */
  async getCategories(includeInactive = false) {
    try {
      const query = `
        SELECT 
          c.id,
          c.name,
          c.description,
          c.priority,
          c.is_active,
          c.is_fallback,
          COUNT(ca.action_id) as action_count,
          COUNT(m.id) as matcher_count,
          COUNT(ci.id) as content_count
        FROM categories c
        LEFT JOIN category_actions ca ON c.id = ca.category_id AND ca.is_active = true
        LEFT JOIN matchers m ON c.id = m.category_id AND m.is_active = true
        LEFT JOIN content_items ci ON c.id = ci.primary_category_id
        ${includeInactive ? '' : 'WHERE c.is_active = true'}
        GROUP BY c.id, c.name, c.description, c.priority, c.is_active, c.is_fallback
        ORDER BY c.priority, c.name
      `;
      
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get categories:', error);
      throw error;
    }
  }

  /**
   * Get category by ID with full details
   */
  async getCategoryById(categoryId) {
    try {
      const categoryQuery = `
        SELECT * FROM categories WHERE id = $1
      `;
      const categoryResult = await this.db.query(categoryQuery, [categoryId]);
      
      if (categoryResult.rows.length === 0) {
        return null;
      }
      
      const category = categoryResult.rows[0];
      
      // Get actions for this category
      const actionsQuery = `
        SELECT a.*, ca.execution_order, ca.config
        FROM actions a
        JOIN category_actions ca ON a.id = ca.action_id
        WHERE ca.category_id = $1 AND a.is_active = true AND ca.is_active = true
        ORDER BY ca.execution_order
      `;
      const actionsResult = await this.db.query(actionsQuery, [categoryId]);
      
      // Get matchers for this category
      const matchersQuery = `
        SELECT * FROM matchers 
        WHERE category_id = $1 AND is_active = true
        ORDER BY matcher_type, pattern
      `;
      const matchersResult = await this.db.query(matchersQuery, [categoryId]);
      
      return {
        ...category,
        actions: actionsResult.rows,
        matchers: matchersResult.rows
      };
    } catch (error) {
      logger.error('Failed to get category by ID:', error);
      throw error;
    }
  }

  /**
   * Get fallback category
   */
  async getFallbackCategory() {
    try {
      const result = await this.db.query(
        'SELECT * FROM categories WHERE is_fallback = true AND is_active = true LIMIT 1'
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get fallback category:', error);
      throw error;
    }
  }

  /**
   * Get actions for a category in execution order
   */
  async getCategoryActions(categoryId) {
    try {
      const query = `
        SELECT 
          a.id,
          a.name,
          a.description,
          a.service_handler,
          ca.execution_order,
          ca.config
        FROM actions a
        JOIN category_actions ca ON a.id = ca.action_id
        WHERE ca.category_id = $1 
          AND a.is_active = true 
          AND ca.is_active = true
        ORDER BY ca.execution_order
      `;
      
      const result = await this.db.query(query, [categoryId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get category actions:', error);
      throw error;
    }
  }

  /**
   * Get all actions
   */
  async getActions(includeInactive = false) {
    try {
      const query = `
        SELECT 
          a.*,
          COUNT(ca.category_id) as category_count,
          ARRAY_AGG(c.name ORDER BY c.name) FILTER (WHERE c.name IS NOT NULL) as categories
        FROM actions a
        LEFT JOIN category_actions ca ON a.id = ca.action_id AND ca.is_active = true
        LEFT JOIN categories c ON ca.category_id = c.id AND c.is_active = true
        ${includeInactive ? '' : 'WHERE a.is_active = true'}
        GROUP BY a.id, a.name, a.description, a.service_handler, a.is_active
        ORDER BY a.name
      `;
      
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get actions:', error);
      throw error;
    }
  }

  /**
   * Get matchers with category information
   */
  async getMatchers(categoryId = null) {
    try {
      let query = `
        SELECT 
          m.*,
          c.name as category_name
        FROM matchers m
        JOIN categories c ON m.category_id = c.id
        WHERE m.is_active = true AND c.is_active = true
      `;
      const params = [];
      
      if (categoryId) {
        query += ' AND m.category_id = $1';
        params.push(categoryId);
      }
      
      query += ' ORDER BY c.name, m.matcher_type, m.pattern';
      
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get matchers:', error);
      throw error;
    }
  }

  /**
   * Get aliases with category information
   */
  async getAliases(categoryId = null) {
    try {
      let query = `
        SELECT 
          ca.*,
          c.name as category_name
        FROM category_aliases ca
        JOIN categories c ON ca.category_id = c.id
        WHERE c.is_active = true
      `;
      const params = [];
      
      if (categoryId) {
        query += ' AND ca.category_id = $1';
        params.push(categoryId);
      }
      
      query += ' ORDER BY c.name, ca.alias';
      
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get aliases:', error);
      throw error;
    }
  }

  /**
   * Create a new category alias
   */
  async createAlias(alias, categoryId, confidenceThreshold = 0.7) {
    try {
      const query = `
        INSERT INTO category_aliases (alias, category_id, confidence_threshold)
        VALUES ($1, $2, $3)
        ON CONFLICT (alias) 
        DO UPDATE SET 
          category_id = $2,
          confidence_threshold = $3,
          updated_at = NOW()
        RETURNING *
      `;
      
      const result = await this.db.query(query, [alias, categoryId, confidenceThreshold]);
      
      logger.info('Category alias created/updated', {
        alias,
        categoryId,
        confidenceThreshold
      });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create alias:', error);
      throw error;
    }
  }

  /**
   * Delete an alias
   */
  async deleteAlias(aliasId) {
    try {
      const result = await this.db.query(
        'DELETE FROM category_aliases WHERE id = $1 RETURNING alias',
        [aliasId]
      );
      
      if (result.rows.length > 0) {
        logger.info('Category alias deleted', { aliasId, alias: result.rows[0].alias });
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to delete alias:', error);
      throw error;
    }
  }

  /**
   * Update content item with category
   */
  async updateContentCategory(contentId, categoryId, rawCategory = null) {
    const startTime = Date.now();
    
    try {
      logger.info('Updating content category assignment', {
        contentId,
        categoryId,
        rawCategory,
        operation: 'category_assignment'
      });

      const query = `
        UPDATE content_items 
        SET 
          primary_category_id = $2,
          ai_raw_category = $3,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, primary_category_id, ai_raw_category, updated_at
      `;
      
      const result = await this.db.query(query, [contentId, categoryId, rawCategory]);
      const updateTime = Date.now() - startTime;
      
      if (result.rows.length > 0) {
        const updatedRecord = result.rows[0];
        
        // Get category name for logging
        const categoryQuery = 'SELECT name FROM categories WHERE id = $1';
        const categoryResult = await this.db.query(categoryQuery, [categoryId]);
        const categoryName = categoryResult.rows[0]?.name || 'Unknown';

        logger.info('Content category updated successfully', {
          contentId,
          categoryId,
          categoryName,
          rawCategory,
          previousCategory: 'pending_classification',
          updateTime,
          updatedAt: updatedRecord.updated_at
        });
        
        return updatedRecord;
      }
      
      logger.warn('Content category update returned no rows', {
        contentId,
        categoryId,
        rawCategory,
        updateTime
      });
      
      return null;
    } catch (error) {
      const updateTime = Date.now() - startTime;
      logger.error('Failed to update content category', {
        contentId,
        categoryId,
        rawCategory,
        error: error.message,
        errorType: error.constructor.name,
        updateTime,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get content processing statistics
   */
  async getProcessingStats(timeRange = '7 days') {
    try {
      const query = `
        SELECT 
          c.name as category,
          COUNT(ci.id) as content_count,
          COUNT(CASE WHEN ci.processing_status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN ci.processing_status = 'failed' THEN 1 END) as failed_count,
          COUNT(CASE WHEN ci.processing_status = 'pending' THEN 1 END) as pending_count,
          AVG(ci.ai_confidence_score) as avg_confidence
        FROM categories c
        LEFT JOIN content_items ci ON c.id = ci.primary_category_id
          AND ci.captured_at >= NOW() - INTERVAL '${timeRange}'
        WHERE c.is_active = true
        GROUP BY c.id, c.name, c.priority
        ORDER BY c.priority
      `;
      
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get processing stats:', error);
      throw error;
    }
  }

  /**
   * Get uncategorized content that needs manual review
   */
  async getUncategorizedContent(limit = 50) {
    try {
      const fallbackCategory = await this.getFallbackCategory();
      if (!fallbackCategory) {
        return [];
      }
      
      const query = `
        SELECT 
          ci.id,
          ci.title,
          ci.url,
          ci.source_domain,
          ci.ai_raw_category,
          ci.captured_at,
          ci.ai_confidence_score
        FROM content_items ci
        WHERE ci.primary_category_id = $1
          AND ci.ai_confidence_score < 0.8
        ORDER BY ci.captured_at DESC
        LIMIT $2
      `;
      
      const result = await this.db.query(query, [fallbackCategory.id, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get uncategorized content:', error);
      throw error;
    }
  }

  /**
   * Search aliases for suggestions
   */
  async searchAliasesForCategory(searchTerm, limit = 10) {
    try {
      const query = `
        SELECT 
          ca.alias,
          c.name as category_name,
          c.id as category_id,
          ca.confidence_threshold
        FROM category_aliases ca
        JOIN categories c ON ca.category_id = c.id
        WHERE ca.alias ILIKE $1 AND c.is_active = true
        ORDER BY LENGTH(ca.alias), ca.alias
        LIMIT $2
      `;
      
      const result = await this.db.query(query, [`%${searchTerm}%`, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to search aliases:', error);
      throw error;
    }
  }

  /**
   * Batch update content categories
   */
  async batchUpdateContentCategories(updates) {
    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const update of updates) {
        const { contentId, categoryId, rawCategory } = update;
        
        const result = await client.query(`
          UPDATE content_items 
          SET 
            primary_category_id = $2,
            ai_raw_category = $3,
            updated_at = NOW()
          WHERE id = $1
          RETURNING id, primary_category_id, ai_raw_category
        `, [contentId, categoryId, rawCategory]);
        
        if (result.rows.length > 0) {
          results.push(result.rows[0]);
        }
      }
      
      await client.query('COMMIT');
      
      logger.info('Batch category update completed', {
        updated: results.length,
        total: updates.length
      });
      
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Batch category update failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = CategoryService;