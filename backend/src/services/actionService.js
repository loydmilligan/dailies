// Action Service - Dynamic processor dispatch for modular content processing
// Executes actions based on category configuration

const { logger } = require('../middleware/logging');

/**
 * Service for executing content processing actions dynamically
 */
class ActionService {
  constructor(database) {
    this.db = database;
    this.processors = new Map();
    this.initialized = false;
  }

  /**
   * Initialize action service with processor registry
   */
  async initialize() {
    const startTime = Date.now();
    
    try {
      logger.info('Initializing ActionService', {
        hasDatabase: !!this.db,
        initialProcessorCount: this.processors.size
      });

      logger.info('Registering content processors...');
      await this.registerProcessors();
      
      this.initialized = true;
      const initTime = Date.now() - startTime;
      
      const processorsByCategory = {
        political: Array.from(this.processors.keys()).filter(k => k.startsWith('political.')),
        general: Array.from(this.processors.keys()).filter(k => k.startsWith('general.')),
        tech: Array.from(this.processors.keys()).filter(k => k.startsWith('tech.')),
        sports: Array.from(this.processors.keys()).filter(k => k.startsWith('sports.')),
        printing: Array.from(this.processors.keys()).filter(k => k.startsWith('printing.')),
        diy: Array.from(this.processors.keys()).filter(k => k.startsWith('diy.')),
        smarthome: Array.from(this.processors.keys()).filter(k => k.startsWith('smarthome.'))
      };

      logger.info('ActionService initialized successfully', {
        initializationTime: initTime,
        totalProcessors: this.processors.size,
        processorsByCategory,
        allProcessors: Array.from(this.processors.keys())
      });
    } catch (error) {
      const initTime = Date.now() - startTime;
      logger.error('Failed to initialize ActionService', {
        error: error.message,
        errorType: error.constructor.name,
        initializationTime: initTime,
        processorCount: this.processors.size,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Register all available processors
   */
  async registerProcessors() {
    try {
      // Import existing processors
      const politicalContentAnalyzer = require('./politicalContentAnalyzer');
      const generalContentProcessor = require('./generalContentProcessor');
      
      // Register political analysis processors
      this.processors.set('political.analyzeBias', async (content) => {
        return await politicalContentAnalyzer.analyzeBias(content);
      });
      
      this.processors.set('political.scoreQuality', async (content) => {
        return await politicalContentAnalyzer.scoreQuality(content);
      });
      
      this.processors.set('political.detectLoadedLanguage', async (content) => {
        return politicalContentAnalyzer.detectLoadedLanguage(content);
      });
      
      this.processors.set('political.generateSummaries', async (content) => {
        return await politicalContentAnalyzer.generateSummaries(content);
      });
      
      this.processors.set('political.assessCredibility', async (content) => {
        return politicalContentAnalyzer.assessSourceCredibility(content.source_domain);
      });

      // Register general processors
      this.processors.set('general.summarize', async (content) => {
        return await generalContentProcessor.generalContentProcessor.process(content);
      });
      
      this.processors.set('general.extractKeywords', async (content) => {
        return generalContentProcessor.extractKeywords(content.raw_content || content.text || '');
      });
      
      this.processors.set('general.calculateReadingTime', async (content) => {
        return { 
          reading_time: generalContentProcessor.calculateReadingTime(content.raw_content || content.text || '')
        };
      });

      // Register technology processors
      this.processors.set('tech.extractTrends', async (content) => {
        return this.extractTechTrends(content);
      });
      
      this.processors.set('tech.analyzeTechnicalDepth', async (content) => {
        return this.analyzeTechnicalDepth(content);
      });
      
      this.processors.set('tech.extractToolsTech', async (content) => {
        return this.extractToolsAndTechnologies(content);
      });

      // Register sports processors
      this.processors.set('sports.extractStats', async (content) => {
        return this.extractSportsStats(content);
      });
      
      this.processors.set('sports.identifyTeamsPlayers', async (content) => {
        return this.identifyTeamsPlayers(content);
      });

      // Register 3D printing processors
      this.processors.set('printing.extractSettings', async (content) => {
        return this.extractPrintSettings(content);
      });
      
      this.processors.set('printing.classifyModel', async (content) => {
        return this.classifyModelType(content);
      });
      
      this.processors.set('printing.extractFileInfo', async (content) => {
        return this.extractFileInfo(content);
      });

      // Register DIY electronics processors
      this.processors.set('diy.extractProjectDetails', async (content) => {
        return this.extractDIYProjectDetails(content);
      });
      
      this.processors.set('diy.identifyComponents', async (content) => {
        return this.identifyElectronicsComponents(content);
      });

      // Register smart home processors
      this.processors.set('smarthome.extractDevices', async (content) => {
        return this.extractSmartDevices(content);
      });
      
      this.processors.set('smarthome.extractAutomation', async (content) => {
        return this.extractAutomationLogic(content);
      });

    } catch (error) {
      logger.error('Failed to register processors:', error);
      throw error;
    }
  }

  /**
   * Execute actions for a category
   */
  async executeActionsForCategory(content, categoryId) {
    if (!this.initialized) {
      throw new Error('ActionService not initialized');
    }

    const startTime = Date.now();
    const contentId = content.id || 'unknown';

    logger.info('Action execution started for category', {
      contentId,
      categoryId,
      contentTitle: content.title?.substring(0, 50),
      contentDomain: content.source_domain,
      processorCount: this.processors.size
    });

    try {
      // Get actions for this category
      const actionsQuery = `
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
      
      const queryStartTime = Date.now();
      const result = await this.db.query(actionsQuery, [categoryId]);
      const actions = result.rows;
      const queryTime = Date.now() - queryStartTime;

      logger.info('Actions retrieved from database', {
        contentId,
        categoryId,
        actionCount: actions.length,
        queryTime,
        actions: actions.map(a => ({
          name: a.name,
          handler: a.service_handler,
          order: a.execution_order
        }))
      });

      if (actions.length === 0) {
        logger.warn('No actions found for category', { 
          contentId,
          categoryId,
          totalProcessingTime: Date.now() - startTime
        });
        return { 
          results: [], 
          executed: 0, 
          total: 0, 
          errors: 0,
          processingMetrics: {
            totalTime: Date.now() - startTime,
            queryTime,
            actionTimes: []
          }
        };
      }

      const results = {};
      let executedCount = 0;
      let errors = [];
      const actionTimes = [];

      // Execute actions in order
      for (const action of actions) {
        const actionStartTime = Date.now();
        
        try {
          const processor = this.processors.get(action.service_handler);
          
          if (!processor) {
            const error = `Processor not found: ${action.service_handler}`;
            logger.error('Missing processor for action', { 
              contentId,
              actionId: action.id,
              actionName: action.name,
              serviceHandler: action.service_handler,
              availableProcessors: Array.from(this.processors.keys())
            });
            errors.push({ 
              action: action.name, 
              error,
              actionId: action.id,
              serviceHandler: action.service_handler
            });
            continue;
          }

          logger.info('Executing action', {
            contentId,
            actionId: action.id,
            actionName: action.name,
            processor: action.service_handler,
            executionOrder: action.execution_order,
            hasConfig: !!action.config,
            config: action.config ? Object.keys(action.config) : undefined
          });

          // Execute with timeout and detailed timing
          const executionStartTime = Date.now();
          const actionResult = await Promise.race([
            processor(content, action.config || {}),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Action timeout after 30 seconds')), 30000)
            )
          ]);
          const executionTime = Date.now() - executionStartTime;
          const totalActionTime = Date.now() - actionStartTime;

          actionTimes.push({
            actionName: action.name,
            executionTime,
            totalTime: totalActionTime
          });

          results[action.name] = {
            success: true,
            result: actionResult,
            executedAt: new Date().toISOString(),
            processor: action.service_handler,
            actionId: action.id,
            executionTime,
            totalTime: totalActionTime
          };

          executedCount++;

          logger.info('Action executed successfully', {
            contentId,
            actionId: action.id,
            actionName: action.name,
            processor: action.service_handler,
            executionTime,
            totalTime: totalActionTime,
            resultKeys: actionResult ? Object.keys(actionResult) : undefined
          });

        } catch (error) {
          const totalActionTime = Date.now() - actionStartTime;
          
          actionTimes.push({
            actionName: action.name,
            executionTime: 0,
            totalTime: totalActionTime,
            failed: true
          });

          logger.error('Action execution failed', {
            contentId,
            actionId: action.id,
            actionName: action.name,
            processor: action.service_handler,
            error: error.message,
            errorType: error.constructor.name,
            executionTime: totalActionTime,
            stack: error.stack
          });

          errors.push({ 
            action: action.name, 
            error: error.message,
            processor: action.service_handler,
            actionId: action.id,
            errorType: error.constructor.name,
            executionTime: totalActionTime
          });
          
          results[action.name] = {
            success: false,
            error: error.message,
            errorType: error.constructor.name,
            executedAt: new Date().toISOString(),
            processor: action.service_handler,
            actionId: action.id,
            executionTime: totalActionTime
          };
        }
      }

      const totalTime = Date.now() - startTime;
      const summary = {
        results,
        executed: executedCount,
        total: actions.length,
        errors: errors.length,
        errorDetails: errors.length > 0 ? errors : undefined,
        processingMetrics: {
          totalTime,
          queryTime,
          actionTimes,
          averageActionTime: actionTimes.length > 0 
            ? actionTimes.reduce((sum, a) => sum + a.totalTime, 0) / actionTimes.length 
            : 0
        }
      };

      logger.info('Action execution pipeline completed', {
        contentId,
        categoryId,
        executed: executedCount,
        total: actions.length,
        errors: errors.length,
        successRate: `${((executedCount / actions.length) * 100).toFixed(1)}%`,
        totalProcessingTime: totalTime,
        averageActionTime: summary.processingMetrics.averageActionTime
      });

      return summary;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error('Failed to execute actions for category', {
        contentId,
        categoryId,
        error: error.message,
        errorType: error.constructor.name,
        totalProcessingTime: totalTime,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Test a specific action
   */
  async testAction(actionName, serviceHandler, testContent = null) {
    try {
      const processor = this.processors.get(serviceHandler);
      
      if (!processor) {
        throw new Error(`Processor not found: ${serviceHandler}`);
      }

      const testData = testContent || {
        id: 'test',
        title: 'Test Content',
        raw_content: 'This is test content for action validation.',
        source_domain: 'test.com',
        url: 'https://test.com/test'
      };

      const result = await processor(testData);
      
      logger.info('Action test completed', {
        actionName,
        serviceHandler,
        success: true
      });

      return {
        success: true,
        result,
        actionName,
        serviceHandler
      };

    } catch (error) {
      logger.error('Action test failed', {
        actionName,
        serviceHandler,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        actionName,
        serviceHandler
      };
    }
  }

  // ========================================================================
  // Processor Implementations
  // ========================================================================

  /**
   * Extract technology trends from content
   */
  async extractTechTrends(content) {
    const text = content.raw_content || content.text || '';
    const trends = [];
    
    // Technology trend keywords
    const trendKeywords = [
      'artificial intelligence', 'machine learning', 'blockchain', 'cryptocurrency',
      'quantum computing', 'edge computing', 'cloud computing', '5G', '6G',
      'internet of things', 'iot', 'augmented reality', 'virtual reality',
      'autonomous vehicles', 'robotics', 'automation', 'cybersecurity'
    ];

    trendKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        trends.push({
          trend: keyword,
          mentions: matches.length,
          context: this.extractContext(text, keyword)
        });
      }
    });

    return {
      tech_trends: trends,
      trend_count: trends.length,
      top_trend: trends.length > 0 ? trends.sort((a, b) => b.mentions - a.mentions)[0] : null
    };
  }

  /**
   * Analyze technical depth of content
   */
  async analyzeTechnicalDepth(content) {
    const text = content.raw_content || content.text || '';
    
    // Technical indicators
    const codePatterns = [
      /```[\s\S]*?```/g, // Code blocks
      /`[^`]+`/g, // Inline code
      /\b[A-Z_]+\s*=\s*[^;]+/g, // Constants
      /function\s+\w+\s*\(/g, // Functions
      /class\s+\w+/g // Classes
    ];

    const technicalTerms = [
      'algorithm', 'api', 'framework', 'library', 'database', 'server',
      'client', 'protocol', 'encryption', 'authentication', 'deployment',
      'scalability', 'performance', 'optimization', 'architecture'
    ];

    let codeBlocks = 0;
    let technicalTermCount = 0;

    // Count code patterns
    codePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) codeBlocks += matches.length;
    });

    // Count technical terms
    technicalTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) technicalTermCount += matches.length;
    });

    const wordCount = text.split(/\s+/).length;
    const technicalDensity = technicalTermCount / Math.max(wordCount, 1);

    let depth = 'beginner';
    if (codeBlocks > 5 || technicalDensity > 0.05) depth = 'advanced';
    else if (codeBlocks > 2 || technicalDensity > 0.02) depth = 'intermediate';

    return {
      technical_depth: depth,
      code_blocks: codeBlocks,
      technical_terms: technicalTermCount,
      technical_density: technicalDensity,
      complexity_score: Math.min(10, (codeBlocks * 2) + (technicalDensity * 100))
    };
  }

  /**
   * Extract tools and technologies mentioned
   */
  async extractToolsAndTechnologies(content) {
    const text = content.raw_content || content.text || '';
    
    const technologies = {
      languages: ['javascript', 'python', 'java', 'typescript', 'rust', 'go', 'c\\+\\+', 'c#'],
      frameworks: ['react', 'vue', 'angular', 'svelte', 'next.js', 'express', 'django', 'flask'],
      databases: ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'sqlite'],
      cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform'],
      tools: ['git', 'webpack', 'vite', 'eslint', 'prettier', 'jest', 'cypress']
    };

    const found = {};
    Object.keys(technologies).forEach(category => {
      found[category] = [];
      technologies[category].forEach(tech => {
        const regex = new RegExp(`\\b${tech}\\b`, 'gi');
        if (regex.test(text)) {
          found[category].push(tech);
        }
      });
    });

    return {
      technologies_found: found,
      total_technologies: Object.values(found).flat().length,
      primary_stack: this.determinePrimaryStack(found)
    };
  }

  /**
   * Extract sports statistics
   */
  async extractSportsStats(content) {
    const text = content.raw_content || content.text || '';
    
    // Sports stat patterns
    const statPatterns = [
      /\b\d+\s*-\s*\d+\b/g, // Scores (21-14)
      /\b\d+\.\d+%\b/g, // Percentages
      /\b\d+\s+yards?\b/gi, // Yards
      /\b\d+\s+points?\b/gi, // Points
      /\b\d+:\d+\b/g // Time (MM:SS)
    ];

    const stats = [];
    statPatterns.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches) {
        stats.push(...matches.map(match => ({
          type: ['score', 'percentage', 'yards', 'points', 'time'][index],
          value: match,
          context: this.extractContext(text, match)
        })));
      }
    });

    return {
      sports_stats: stats,
      stat_count: stats.length,
      has_scores: stats.some(s => s.type === 'score')
    };
  }

  /**
   * Identify teams and players
   */
  async identifyTeamsPlayers(content) {
    const text = content.raw_content || content.text || '';
    
    // Common team name patterns
    const teamPatterns = [
      /\b[A-Z][a-z]+\s+(Lakers|Warriors|Celtics|Bulls|Heat|Spurs)\b/g,
      /\b(New York|Los Angeles|Chicago|Boston|Miami)\s+[A-Z][a-z]+\b/g,
      /\b[A-Z][a-z]+\s+(FC|United|City|Arsenal|Chelsea)\b/g
    ];

    const teams = [];
    teamPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        teams.push(...matches);
      }
    });

    // Player name patterns (capitalized names)
    const playerPattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g;
    const potentialPlayers = text.match(playerPattern) || [];
    
    // Filter out common non-player phrases
    const players = potentialPlayers.filter(name => 
      !name.match(/^(Last|First|New|Old|Big|Small|Good|Bad|Next|This|That|The|And|But|For|With|From)\s/i)
    ).slice(0, 10); // Limit to 10 potential players

    return {
      teams: [...new Set(teams)], // Remove duplicates
      players: [...new Set(players)], // Remove duplicates
      team_count: new Set(teams).size,
      player_count: new Set(players).size
    };
  }

  /**
   * Extract 3D printing settings
   */
  async extractPrintSettings(content) {
    const text = content.raw_content || content.text || '';
    
    const settings = {};
    
    // Layer height
    const layerHeight = text.match(/layer\s+height[:\s]*(\d+\.?\d*)\s*mm/i);
    if (layerHeight) settings.layer_height = layerHeight[1] + 'mm';
    
    // Infill
    const infill = text.match(/infill[:\s]*(\d+)%/i);
    if (infill) settings.infill = infill[1] + '%';
    
    // Material
    const materials = ['PLA', 'ABS', 'PETG', 'TPU', 'ASA'];
    materials.forEach(material => {
      if (new RegExp(`\\b${material}\\b`, 'i').test(text)) {
        settings.material = material;
      }
    });
    
    // Print time
    const printTime = text.match(/print\s+time[:\s]*(\d+)\s*(hours?|hrs?|minutes?|mins?)/i);
    if (printTime) settings.print_time = printTime[1] + ' ' + printTime[2];

    return {
      print_settings: settings,
      settings_found: Object.keys(settings).length,
      has_complete_settings: Object.keys(settings).length >= 3
    };
  }

  /**
   * Classify 3D model type
   */
  async classifyModelType(content) {
    const text = (content.title + ' ' + (content.raw_content || '')).toLowerCase();
    
    const categories = {
      functional: ['bracket', 'holder', 'organizer', 'tool', 'repair', 'replacement', 'mount'],
      decorative: ['art', 'sculpture', 'vase', 'ornament', 'decoration', 'display'],
      miniature: ['miniature', 'mini', 'tabletop', 'd&d', 'warhammer', 'figure', 'character'],
      toy: ['toy', 'game', 'puzzle', 'fidget', 'educational', 'children']
    };

    let bestCategory = 'general';
    let maxScore = 0;

    Object.entries(categories).forEach(([category, keywords]) => {
      const score = keywords.reduce((acc, keyword) => {
        return acc + (text.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    });

    return {
      model_type: bestCategory,
      confidence: maxScore > 0 ? Math.min(1.0, maxScore / 3) : 0.3,
      keywords_matched: maxScore
    };
  }

  /**
   * Extract file information
   */
  async extractFileInfo(content) {
    const text = content.raw_content || content.text || '';
    
    const fileTypes = ['.stl', '.obj', '.3mf', '.ply', '.gcode'];
    const files = [];
    
    fileTypes.forEach(type => {
      const regex = new RegExp(`\\S+\\${type}`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        files.push(...matches.map(file => ({ name: file, type: type.substring(1) })));
      }
    });

    // Look for download links
    const downloadLinks = text.match(/https?:\/\/[^\s]+\.(stl|obj|3mf|ply|gcode)/gi) || [];

    return {
      file_info: {
        files_mentioned: files,
        download_links: downloadLinks,
        file_count: files.length,
        has_downloads: downloadLinks.length > 0
      }
    };
  }

  /**
   * Extract DIY project details
   */
  async extractDIYProjectDetails(content) {
    const text = content.raw_content || content.text || '';
    
    // Look for project characteristics
    const difficulty = this.extractDifficulty(text);
    const duration = this.extractDuration(text);
    const tools = this.extractTools(text);
    
    return {
      project_details: {
        difficulty_level: difficulty,
        estimated_duration: duration,
        tools_required: tools,
        project_type: this.classifyDIYProject(text)
      }
    };
  }

  /**
   * Identify electronics components
   */
  async identifyElectronicsComponents(content) {
    const text = content.raw_content || content.text || '';
    
    const components = [
      'arduino', 'raspberry pi', 'esp32', 'esp8266', 'atmega',
      'resistor', 'capacitor', 'transistor', 'led', 'sensor',
      'motor', 'servo', 'stepper', 'relay', 'switch'
    ];

    const found = components.filter(component => 
      new RegExp(`\\b${component}\\b`, 'i').test(text)
    );

    return {
      components_identified: found,
      component_count: found.length,
      complexity: found.length > 5 ? 'advanced' : found.length > 2 ? 'intermediate' : 'beginner'
    };
  }

  /**
   * Extract smart home devices
   */
  async extractSmartDevices(content) {
    const text = content.raw_content || content.text || '';
    
    const devices = [
      'smart switch', 'smart plug', 'smart bulb', 'smart lock',
      'thermostat', 'camera', 'doorbell', 'sensor', 'hub',
      'alexa', 'google home', 'home assistant', 'zigbee', 'z-wave'
    ];

    const found = devices.filter(device => 
      new RegExp(`\\b${device}\\b`, 'i').test(text)
    );

    return {
      smart_devices: found,
      device_count: found.length,
      ecosystem: this.identifyEcosystem(text)
    };
  }

  /**
   * Extract automation logic
   */
  async extractAutomationLogic(content) {
    const text = content.raw_content || content.text || '';
    
    // Look for automation patterns
    const triggers = ['when', 'if', 'trigger', 'motion detected', 'door opens'];
    const actions = ['turn on', 'turn off', 'set', 'notify', 'send'];
    
    const automations = [];
    
    // Simple pattern matching for automation rules
    triggers.forEach(trigger => {
      actions.forEach(action => {
        const pattern = new RegExp(`${trigger}[^.]+${action}`, 'gi');
        const matches = text.match(pattern);
        if (matches) {
          automations.push(...matches);
        }
      });
    });

    return {
      automation_rules: automations.slice(0, 5), // Limit to 5 rules
      rule_count: automations.length,
      has_automations: automations.length > 0
    };
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  extractContext(text, term, contextLength = 50) {
    const index = text.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return term;
    
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + term.length + contextLength);
    
    return text.substring(start, end);
  }

  determinePrimaryStack(technologies) {
    const stacks = {
      'React': technologies.frameworks?.includes('react'),
      'Vue': technologies.frameworks?.includes('vue'),
      'Angular': technologies.frameworks?.includes('angular'),
      'Node.js': technologies.languages?.includes('javascript'),
      'Python': technologies.languages?.includes('python'),
      'Java': technologies.languages?.includes('java')
    };

    return Object.entries(stacks)
      .filter(([_, present]) => present)
      .map(([stack, _]) => stack);
  }

  extractDifficulty(text) {
    if (/beginner|easy|simple|basic/i.test(text)) return 'beginner';
    if (/advanced|expert|complex|difficult/i.test(text)) return 'advanced';
    if (/intermediate|medium/i.test(text)) return 'intermediate';
    return 'unknown';
  }

  extractDuration(text) {
    const duration = text.match(/(\d+)\s*(hours?|hrs?|minutes?|mins?|days?)/i);
    return duration ? duration[0] : 'unknown';
  }

  extractTools(text) {
    const tools = ['soldering iron', 'multimeter', 'breadboard', 'jumper wires', 'screwdriver'];
    return tools.filter(tool => new RegExp(`\\b${tool}\\b`, 'i').test(text));
  }

  classifyDIYProject(text) {
    if (/electronics?|circuit|wiring/i.test(text)) return 'electronics';
    if (/woodworking|wood|lumber/i.test(text)) return 'woodworking';
    if (/3d print|printer|filament/i.test(text)) return '3d_printing';
    if (/(home|house|automation)/i.test(text)) return 'home_automation';
    return 'general';
  }

  identifyEcosystem(text) {
    if (/home assistant|hass/i.test(text)) return 'Home Assistant';
    if (/alexa|echo/i.test(text)) return 'Amazon Alexa';
    if (/google home|nest/i.test(text)) return 'Google Home';
    if (/apple homekit/i.test(text)) return 'Apple HomeKit';
    return 'unknown';
  }

  /**
   * Get processor statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      processorCount: this.processors.size,
      processors: Array.from(this.processors.keys())
    };
  }
}

module.exports = ActionService;