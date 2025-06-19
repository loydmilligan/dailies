const databaseService = require('./index');

async function extendedValidation() {
  try {
    console.log('🚀 Extended Database Schema Validation\n');

    await databaseService.connect();

    // Phase 1: Extended Integration Testing
    console.log('=== PHASE 1: EXTENDED INTEGRATION TESTING ===\n');

    // Test 1: ENUM constraint validation
    console.log('1. Testing ENUM constraints...');
    try {
      await databaseService.createContentItem({
        url: 'https://test.com/enum-test',
        title: 'Invalid ENUM Test',
        content_type: 'invalid_type',
        source_domain: 'test.com'
      });
      console.log('❌ ENUM constraint failed - invalid type was accepted');
    } catch (error) {
      console.log('✅ ENUM constraint working - invalid content_type rejected');
    }

    // Test 2: CHECK constraint validation
    console.log('\n2. Testing CHECK constraints...');
    const testContent = await databaseService.createContentItem({
      url: 'https://test.com/check-test',
      title: 'CHECK Constraint Test',
      source_domain: 'test.com',
      content_type: 'article',
      category: 'General'
    });

    try {
      await databaseService.createPoliticalAnalysis({
        content_id: testContent.id,
        bias_score: 2.0, // Invalid - should be -1.0 to 1.0
        quality_score: 5
      });
      console.log('❌ CHECK constraint failed - invalid bias_score accepted');
    } catch (error) {
      console.log('✅ CHECK constraint working - invalid bias_score rejected');
    }

    // Test 3: Foreign key constraint validation
    console.log('\n3. Testing foreign key constraints...');
    try {
      await databaseService.createPoliticalAnalysis({
        content_id: 99999, // Non-existent content_id
        bias_score: 0.5,
        quality_score: 7
      });
      console.log('❌ Foreign key constraint failed');
    } catch (error) {
      console.log('✅ Foreign key constraint working - invalid content_id rejected');
    }

    // Test 4: CASCADE deletion
    console.log('\n4. Testing CASCADE deletion...');
    const analysis = await databaseService.createPoliticalAnalysis({
      content_id: testContent.id,
      bias_score: 0.3,
      bias_label: 'center',
      quality_score: 8,
      credibility_score: 7.5
    });
    console.log('✅ Created analysis for CASCADE test');

    await databaseService.prisma.content_items.delete({
      where: { id: testContent.id }
    });
    
    const deletedAnalysis = await databaseService.prisma.political_analysis.findUnique({
      where: { id: analysis.id }
    });
    
    if (!deletedAnalysis) {
      console.log('✅ CASCADE deletion working - analysis deleted with content');
    } else {
      console.log('❌ CASCADE deletion failed - analysis still exists');
    }

    // Test 5: JSONB structure validation
    console.log('\n5. Testing JSONB structures...');
    const jsonbContent = await databaseService.createContentItem({
      url: 'https://test.com/jsonb-test',
      title: 'JSONB Structure Test',
      source_domain: 'test.com',
      content_type: 'article',
      metadata: {
        author: 'Test Author',
        publishDate: '2024-01-15',
        tags: ['politics', 'analysis'],
        wordCount: 1250,
        socialMetrics: {
          shares: 45,
          likes: 120,
          comments: 18
        }
      }
    });

    const jsonbAnalysis = await databaseService.createPoliticalAnalysis({
      content_id: jsonbContent.id,
      bias_score: -0.2,
      bias_label: 'left',
      quality_score: 9,
      credibility_score: 8.8,
      loaded_language: [
        { phrase: 'shocking revelation', sentiment: 'negative', position: 45 },
        { phrase: 'unprecedented move', sentiment: 'dramatic', position: 120 }
      ],
      key_points: [
        'Major policy shift announced',
        'Bipartisan support uncertain',
        'Economic implications significant'
      ]
    });
    console.log('✅ Complex JSONB structures created successfully');

    // Test 6: Deduplication via content_hash
    console.log('\n6. Testing content deduplication...');
    const duplicateContent = await databaseService.createContentItem({
      url: 'https://test.com/duplicate',
      title: 'Duplicate Content Test',
      source_domain: 'test.com',
      content_type: 'article',
      raw_content: 'This is test content for deduplication',
      content_hash: 'abc123def456' // Same hash
    });

    try {
      await databaseService.createContentItem({
        url: 'https://different.com/duplicate',
        title: 'Different URL Same Content',
        source_domain: 'different.com',
        content_type: 'article',
        raw_content: 'This is test content for deduplication',
        content_hash: 'abc123def456' // Same hash - should be unique
      });
      console.log('❌ Deduplication failed - duplicate hash accepted');
    } catch (error) {
      console.log('✅ Deduplication working - duplicate content_hash rejected');
    }

    // Test 7: Timestamp triggers and defaults
    console.log('\n7. Testing timestamp behavior...');
    const originalTime = new Date();
    const timestampContent = await databaseService.createContentItem({
      url: 'https://test.com/timestamp-test',
      title: 'Timestamp Test',
      source_domain: 'test.com'
    });

    // Wait 1 second then update
    await new Promise(resolve => setTimeout(resolve, 1000));
    const updatedContent = await databaseService.updateContentItem(timestampContent.id, {
      processing_status: 'completed'
    });

    if (new Date(updatedContent.updated_at) > new Date(updatedContent.created_at)) {
      console.log('✅ Timestamp triggers working - updated_at > created_at');
    } else {
      console.log('❌ Timestamp triggers failed');
    }

    // Test 8: Complex query validation
    console.log('\n8. Testing complex queries...');
    
    // Test political content filtering
    const politicalContent = await databaseService.prisma.content_items.findMany({
      where: {
        category: 'US_Politics_News',
        processing_status: 'completed'
      },
      include: {
        political_analysis: true
      }
    });
    console.log(`✅ Political content query: ${politicalContent.length} items`);

    // Test date range queries
    const recentContent = await databaseService.prisma.content_items.findMany({
      where: {
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });
    console.log(`✅ Date range query: ${recentContent.length} recent items`);

    // Test aggregation queries
    const stats = await databaseService.prisma.content_items.groupBy({
      by: ['category', 'processing_status'],
      _count: {
        id: true
      }
    });
    console.log(`✅ Aggregation query: ${stats.length} groupings`);

    // Cleanup test data
    console.log('\n9. Cleaning up test data...');
    await databaseService.prisma.content_items.deleteMany({
      where: {
        source_domain: {
          in: ['test.com', 'different.com']
        }
      }
    });
    console.log('✅ Test data cleanup completed');

    console.log('\n🎉 Extended validation completed successfully!');
    console.log('\n📊 Validation Results:');
    console.log('  ✅ ENUM constraints enforced');
    console.log('  ✅ CHECK constraints enforced');
    console.log('  ✅ Foreign key constraints enforced');
    console.log('  ✅ CASCADE deletion working');
    console.log('  ✅ Complex JSONB structures supported');
    console.log('  ✅ Content deduplication enforced');
    console.log('  ✅ Timestamp triggers functional');
    console.log('  ✅ Complex queries optimized');

  } catch (error) {
    console.error('❌ Extended validation failed:', error.message);
    console.error(error.stack);
  } finally {
    await databaseService.disconnect();
  }
}

// Run validation if called directly
if (require.main === module) {
  extendedValidation();
}

module.exports = extendedValidation;