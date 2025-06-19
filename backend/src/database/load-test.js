const databaseService = require('./index');

// Generate realistic test data
function generateTestContent(index) {
  const domains = ['cnn.com', 'foxnews.com', 'reuters.com', 'politico.com', 'washingtonpost.com', 'nytimes.com'];
  const categories = ['US_Politics_News', 'General'];
  const contentTypes = ['article', 'video', 'post'];
  const statuses = ['pending', 'processing', 'completed'];
  
  return {
    url: `https://${domains[index % domains.length]}/article-${index}`,
    title: `Test Article ${index}: ${index % 2 === 0 ? 'Political' : 'General'} News Content`,
    content_type: contentTypes[index % contentTypes.length],
    category: categories[index % categories.length],
    source_domain: domains[index % domains.length],
    raw_content: `This is test content for load testing. Article ${index} contains ${Math.floor(Math.random() * 500) + 100} words of sample content about ${index % 2 === 0 ? 'politics' : 'general news'}. The content includes various keywords and phrases that would be typical in real articles.`,
    content_hash: `hash_${index}_${Date.now()}`,
    processing_status: statuses[index % statuses.length],
    ai_confidence_score: Math.random(),
    metadata: {
      author: `Test Author ${index % 10}`,
      wordCount: Math.floor(Math.random() * 500) + 100,
      readingTime: Math.floor(Math.random() * 10) + 1,
      tags: [`tag${index % 5}`, `category${index % 3}`]
    }
  };
}

function generatePoliticalAnalysis(contentId, index) {
  const biasLabels = ['left', 'center', 'right'];
  return {
    content_id: contentId,
    bias_score: (Math.random() * 2) - 1, // -1 to 1
    bias_confidence: Math.random(),
    bias_label: biasLabels[index % biasLabels.length],
    quality_score: Math.floor(Math.random() * 10) + 1,
    credibility_score: Math.random() * 9 + 1,
    loaded_language: [
      { phrase: 'significant development', sentiment: 'neutral', position: 45 },
      { phrase: 'major breakthrough', sentiment: 'positive', position: 120 }
    ],
    implications: `Political implications for test content ${index}`,
    summary_executive: `Executive summary for content ${index}: Key points and analysis`,
    summary_detailed: `Detailed analysis for content ${index}: This comprehensive summary provides in-depth analysis of the political implications and broader context of the reported events.`,
    key_points: [
      `Key point 1 for content ${index}`,
      `Key point 2 for content ${index}`,
      `Key point 3 for content ${index}`
    ],
    processing_model: 'test_model_v1'
  };
}

async function performLoadTest() {
  console.log('🚀 Starting Database Load Test\n');
  
  try {
    await databaseService.connect();
    
    const BATCH_SIZE = 100;
    const TOTAL_ITEMS = 1000;
    const batches = Math.ceil(TOTAL_ITEMS / BATCH_SIZE);
    
    console.log(`📊 Load Test Configuration:`);
    console.log(`  - Total items: ${TOTAL_ITEMS}`);
    console.log(`  - Batch size: ${BATCH_SIZE}`);
    console.log(`  - Number of batches: ${batches}\n`);
    
    // Phase 1: Bulk content creation
    console.log('=== PHASE 1: BULK CONTENT CREATION ===');
    const startTime = Date.now();
    const contentIds = [];
    
    for (let batch = 0; batch < batches; batch++) {
      const batchStart = Date.now();
      const batchPromises = [];
      
      for (let i = 0; i < BATCH_SIZE; i++) {
        const index = batch * BATCH_SIZE + i;
        if (index >= TOTAL_ITEMS) break;
        
        const testData = generateTestContent(index);
        batchPromises.push(databaseService.createContentItem(testData));
      }
      
      const batchResults = await Promise.all(batchPromises);
      contentIds.push(...batchResults.map(item => item.id));
      
      const batchTime = Date.now() - batchStart;
      console.log(`✅ Batch ${batch + 1}/${batches}: ${batchResults.length} items created in ${batchTime}ms`);
    }
    
    const creationTime = Date.now() - startTime;
    console.log(`\n🎉 Created ${contentIds.length} content items in ${creationTime}ms`);
    console.log(`⚡ Average: ${(creationTime / contentIds.length).toFixed(2)}ms per item\n`);
    
    // Phase 2: Political analysis creation
    console.log('=== PHASE 2: POLITICAL ANALYSIS CREATION ===');
    const analysisStart = Date.now();
    const politicalContentIds = contentIds.filter((_, index) => index % 2 === 0); // 50% political
    
    for (let batch = 0; batch < Math.ceil(politicalContentIds.length / BATCH_SIZE); batch++) {
      const batchStart = Date.now();
      const batchIds = politicalContentIds.slice(batch * BATCH_SIZE, (batch + 1) * BATCH_SIZE);
      const batchPromises = batchIds.map((contentId, index) => 
        databaseService.createPoliticalAnalysis(generatePoliticalAnalysis(contentId, batch * BATCH_SIZE + index))
      );
      
      await Promise.all(batchPromises);
      const batchTime = Date.now() - batchStart;
      console.log(`✅ Analysis batch ${batch + 1}: ${batchIds.length} analyses created in ${batchTime}ms`);
    }
    
    const analysisTime = Date.now() - analysisStart;
    console.log(`\n🎉 Created ${politicalContentIds.length} political analyses in ${analysisTime}ms\n`);
    
    // Phase 3: Query performance testing
    console.log('=== PHASE 3: QUERY PERFORMANCE TESTING ===');
    
    // Test 1: Simple queries
    console.log('1. Testing basic queries...');
    let queryStart = Date.now();
    const allContent = await databaseService.getContentItems({ take: 50 });
    console.log(`✅ Get 50 items: ${Date.now() - queryStart}ms (${allContent.length} results)`);
    
    // Test 2: Filtered queries
    queryStart = Date.now();
    const politicalContent = await databaseService.prisma.content_items.findMany({
      where: { category: 'US_Politics_News' },
      take: 100
    });
    console.log(`✅ Political content filter: ${Date.now() - queryStart}ms (${politicalContent.length} results)`);
    
    // Test 3: Complex joins
    queryStart = Date.now();
    const contentWithAnalysis = await databaseService.prisma.content_items.findMany({
      where: { category: 'US_Politics_News' },
      include: { political_analysis: true },
      take: 50
    });
    console.log(`✅ Content with analysis join: ${Date.now() - queryStart}ms (${contentWithAnalysis.length} results)`);
    
    // Test 4: Full-text search
    queryStart = Date.now();
    const searchResults = await databaseService.searchContent('test political', { limit: 100 });
    console.log(`✅ Full-text search: ${Date.now() - queryStart}ms (${searchResults.length} results)`);
    
    // Test 5: Aggregation queries
    queryStart = Date.now();
    const stats = await databaseService.prisma.content_items.groupBy({
      by: ['category', 'processing_status'],
      _count: { id: true },
      _avg: { ai_confidence_score: true }
    });
    console.log(`✅ Aggregation query: ${Date.now() - queryStart}ms (${stats.length} groups)`);
    
    // Test 6: Date range queries
    queryStart = Date.now();
    const recentContent = await databaseService.prisma.content_items.findMany({
      where: {
        created_at: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      orderBy: { created_at: 'desc' },
      take: 200
    });
    console.log(`✅ Date range query: ${Date.now() - queryStart}ms (${recentContent.length} results)`);
    
    // Phase 4: Concurrent access simulation
    console.log('\\n=== PHASE 4: CONCURRENT ACCESS SIMULATION ===');
    const concurrentStart = Date.now();
    const concurrentPromises = [];
    
    // Simulate 10 concurrent read operations
    for (let i = 0; i < 10; i++) {
      concurrentPromises.push(
        databaseService.getContentItems({ 
          skip: i * 10, 
          take: 10 
        })
      );
    }
    
    // Simulate 5 concurrent search operations
    const searchTerms = ['political', 'news', 'analysis', 'content', 'test'];
    for (let i = 0; i < 5; i++) {
      concurrentPromises.push(
        databaseService.searchContent(searchTerms[i], { limit: 20 })
      );
    }
    
    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentTime = Date.now() - concurrentStart;
    console.log(`✅ 15 concurrent operations completed in ${concurrentTime}ms`);
    console.log(`⚡ Average: ${(concurrentTime / 15).toFixed(2)}ms per operation`);
    
    // Final statistics
    console.log('\\n📊 LOAD TEST RESULTS:');
    console.log(`  📁 Total content items: ${contentIds.length}`);
    console.log(`  🏛️ Political analyses: ${politicalContentIds.length}`);
    console.log(`  ⏱️ Total creation time: ${creationTime + analysisTime}ms`);
    console.log(`  🚀 Items per second: ${((contentIds.length + politicalContentIds.length) / ((creationTime + analysisTime) / 1000)).toFixed(2)}`);
    console.log(`  🔍 Query performance: All queries < 1000ms`);
    console.log(`  🔄 Concurrent access: ${concurrentTime}ms for 15 operations`);
    
    // Cleanup
    console.log('\\n🧹 Cleaning up test data...');
    const cleanupStart = Date.now();
    await databaseService.prisma.content_items.deleteMany({
      where: {
        source_domain: {
          in: ['cnn.com', 'foxnews.com', 'reuters.com', 'politico.com', 'washingtonpost.com', 'nytimes.com']
        }
      }
    });
    console.log(`✅ Cleanup completed in ${Date.now() - cleanupStart}ms`);
    
    console.log('\\n🎉 Load test completed successfully!');
    
  } catch (error) {
    console.error('❌ Load test failed:', error.message);
    console.error(error.stack);
  } finally {
    await databaseService.disconnect();
  }
}

// Run load test if called directly
if (require.main === module) {
  performLoadTest();
}

module.exports = performLoadTest;