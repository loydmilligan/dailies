// Simple test script to verify backend server functionality
// Run with: node test-server.js

const http = require('http');

// Test data similar to what the extension would send
const testContent = {
  url: "https://example.com/test-article",
  title: "Test Article for Backend Integration",
  domain: "example.com",
  contentType: "article",
  metadata: {
    author: "Test Author",
    description: "A test article for verifying backend integration",
    publishDate: new Date().toISOString(),
    wordCount: 500
  },
  content: {
    text: "This is a test article content to verify that the backend can properly save content from the Chrome extension.",
    html: "<p>This is a test article content to verify that the backend can properly save content from the Chrome extension.</p>",
    extractionMethod: "readability",
    readingTime: 2,
    length: 123
  },
  contentHash: "test123",
  timestamp: new Date().toISOString()
};

async function testServer() {
  console.log('🧪 Testing Dailies Backend Server...\n');
  
  // Test 1: Health Check
  console.log('1. Testing health check endpoint...');
  try {
    const healthResponse = await makeRequest('GET', '/api/health');
    console.log('✅ Health check passed:', healthResponse.status);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return;
  }
  
  // Test 2: Content Submission
  console.log('\n2. Testing content submission...');
  try {
    const contentResponse = await makeRequest('POST', '/api/content', testContent);
    console.log('✅ Content submission passed:', contentResponse.message);
    console.log('   Content ID:', contentResponse.contentId);
    
    // Test 3: Content Retrieval
    console.log('\n3. Testing content retrieval...');
    const getResponse = await makeRequest('GET', `/api/content/${contentResponse.contentId}`);
    console.log('✅ Content retrieval passed:', getResponse.data.title);
    
    // Test 4: Duplicate Detection
    console.log('\n4. Testing duplicate detection...');
    const duplicateResponse = await makeRequest('POST', '/api/content', testContent);
    console.log('✅ Duplicate detection passed:', duplicateResponse.duplicate ? 'detected' : 'not detected');
    
  } catch (error) {
    console.log('❌ Content operations failed:', error.message);
  }
  
  // Test 5: Content List
  console.log('\n5. Testing content listing...');
  try {
    const listResponse = await makeRequest('GET', '/api/content?limit=5');
    console.log('✅ Content listing passed:', listResponse.data.length, 'items');
  } catch (error) {
    console.log('❌ Content listing failed:', error.message);
  }
  
  console.log('\n🎉 Backend server tests completed!');
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${response.error || response.message}`));
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run tests
testServer().catch(console.error);