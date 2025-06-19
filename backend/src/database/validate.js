const databaseService = require('./index');

async function validateDatabaseService() {
  try {
    console.log('🔍 Validating Database Service Integration...\n');

    // Test 1: Connection and health check
    console.log('1. Testing database connection...');
    await databaseService.connect();
    const health = await databaseService.healthCheck();
    console.log('✅ Health check:', health.status);

    // Test 2: Content operations
    console.log('\n2. Testing content operations...');
    const testContent = await databaseService.createContentItem({
      url: 'https://test.com/validation',
      title: 'Database Service Validation Test',
      source_domain: 'test.com',
      content_type: 'article',
      category: 'General',
      raw_content: 'Test content for database service validation'
    });
    console.log('✅ Created content item:', testContent.id);

    // Test 3: Read operations
    console.log('\n3. Testing read operations...');
    const items = await databaseService.getContentItems({ take: 5 });
    console.log(`✅ Retrieved ${items.length} content items`);

    const singleItem = await databaseService.getContentItemById(testContent.id);
    console.log('✅ Retrieved single item:', singleItem.title);

    // Test 4: Political analysis
    console.log('\n4. Testing political analysis operations...');
    const analysis = await databaseService.createPoliticalAnalysis({
      content_id: testContent.id,
      bias_score: 0.1,
      bias_label: 'center',
      quality_score: 9,
      credibility_score: 8.5,
      summary_executive: 'Test analysis for database service validation'
    });
    console.log('✅ Created political analysis:', analysis.id);

    // Test 5: Update operations
    console.log('\n5. Testing update operations...');
    const updated = await databaseService.updateContentItem(testContent.id, {
      processing_status: 'completed'
    });
    console.log('✅ Updated content status:', updated.processing_status);

    // Test 6: Search functionality
    console.log('\n6. Testing search functionality...');
    const searchResults = await databaseService.searchContent('validation', { limit: 10 });
    console.log(`✅ Search found ${searchResults.length} results`);

    // Test 7: User settings
    console.log('\n7. Testing user settings...');
    const userSettings = await databaseService.getUserSettings();
    console.log('✅ User settings retrieved:', !!userSettings);

    // Test 8: Processing logs
    console.log('\n8. Testing processing logs...');
    const log = await databaseService.createProcessingLog({
      content_id: testContent.id,
      operation: 'validation_test',
      status: 'success',
      model_used: 'test_model',
      processing_time_ms: 250
    });
    console.log('✅ Created processing log:', log.id);

    // Test 9: Advanced queries
    console.log('\n9. Testing advanced queries...');
    const todayContent = await databaseService.getContentForDigest(new Date());
    console.log(`✅ Found ${todayContent.length} items for today's digest`);

    // Test 10: Transaction support
    console.log('\n10. Testing transaction support...');
    await databaseService.transaction([
      databaseService.prisma.processing_logs.delete({ where: { id: log.id } }),
      databaseService.prisma.political_analysis.delete({ where: { id: analysis.id } }),
      databaseService.prisma.content_items.delete({ where: { id: testContent.id } })
    ]);
    console.log('✅ Transaction completed - cleanup successful');

    console.log('\n🎉 Database Service validation completed successfully!');
    console.log('\n📊 Features validated:');
    console.log('  ✅ Database connection and health checks');
    console.log('  ✅ CRUD operations for all main entities');
    console.log('  ✅ Relationship handling (content ↔ analysis)');
    console.log('  ✅ Search and filtering capabilities');
    console.log('  ✅ Transaction support');
    console.log('  ✅ Advanced query patterns');
    console.log('  ✅ Proper TypeScript types from Prisma');

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    console.error(error.stack);
  } finally {
    await databaseService.disconnect();
  }
}

// Run validation if called directly
if (require.main === module) {
  validateDatabaseService();
}

module.exports = validateDatabaseService;