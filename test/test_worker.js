// ABOUTME: Comprehensive tests for the Faro Worker including admin APIs and enforcement
// ABOUTME: Tests KV operations, geoblocking, takedowns, and media passthrough

import assert from 'assert';
import { evaluateRule, getAssetIdFromPath, isExpired } from '../src/lib/rules.js';
import { 
  validateBlockRequest, 
  validateUnblockRequest, 
  validateTakedownRequest 
} from '../src/lib/validation.js';
import {
  extractImetaUrls,
  urlToAssetId,
  CATEGORY_SEVERITY,
} from '../src/lib/label_processor.js';

// Mock KV store for testing
class MockKV {
  constructor() {
    this.store = new Map();
  }
  
  async get(key, type = 'text') {
    const value = this.store.get(key);
    if (!value) return null;
    return type === 'json' ? JSON.parse(value) : value;
  }
  
  async put(key, value) {
    this.store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
  
  async delete(key) {
    this.store.delete(key);
  }
}

// Test suite for rules evaluation
function testRulesEvaluation() {
  console.log('Testing rules evaluation...');
  
  // Test expired rules
  const expiredRule = {
    status: 'region',
    countries_blocked: ['US'],
    exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
  };
  assert(isExpired(expiredRule), 'Should detect expired rule');
  
  // Test global block
  const globalRule = {
    status: 'global_block',
    reason: 'policy violation',
  };
  const globalResult = evaluateRule(globalRule, 'US');
  assert.strictEqual(globalResult.code, 410, 'Global block should return 410');
  assert.strictEqual(globalResult.reason, 'policy violation', 'Should use custom reason');
  assert.strictEqual(globalResult.varyCountry, false, 'Global block should not vary by country');
  
  // Test regional block
  const regionalRule = {
    status: 'region',
    countries_blocked: ['US', 'CA'],
    reason: 'legal restriction',
  };
  const usResult = evaluateRule(regionalRule, 'US');
  assert.strictEqual(usResult.code, 451, 'US should be blocked with 451');
  assert.strictEqual(usResult.varyCountry, true, 'Regional block should vary by country');
  
  const ukResult = evaluateRule(regionalRule, 'GB');
  assert.strictEqual(ukResult.code, null, 'GB should not be blocked');
  assert.strictEqual(ukResult.varyCountry, true, 'Should still vary by country even if not blocked');
  
  console.log('✓ Rules evaluation tests passed');
}

// Test asset ID extraction
function testAssetIdExtraction() {
  console.log('Testing asset ID extraction...');
  
  assert.strictEqual(getAssetIdFromPath('/v/abc123'), 'abc123', 'Should extract video ID');
  assert.strictEqual(getAssetIdFromPath('/t/xyz789.jpg'), 'xyz789', 'Should extract thumbnail ID without extension');
  assert.strictEqual(getAssetIdFromPath('/v/folder/file'), 'folder/file', 'Should handle nested paths');
  assert.strictEqual(getAssetIdFromPath('/other/path'), null, 'Should return null for non-media paths');
  assert.strictEqual(getAssetIdFromPath('/'), null, 'Should return null for root path');
  
  console.log('✓ Asset ID extraction tests passed');
}

// Test validation functions
function testValidation() {
  console.log('Testing validation...');
  
  // Test block request validation
  const validBlock = {
    id: 'test123',
    paths: ['/v/test123'],
    countries: ['US', 'CA'],
    reason: 'copyright',
    ttl: 3600,
  };
  assert.strictEqual(validateBlockRequest(validBlock).length, 0, 'Valid block request should pass');
  
  const invalidBlock = {
    id: '',
    paths: [],
    countries: ['INVALID'],
  };
  const blockErrors = validateBlockRequest(invalidBlock);
  assert(blockErrors.length > 0, 'Invalid block request should have errors');
  assert(blockErrors.some(e => e.includes('id')), 'Should report invalid ID');
  assert(blockErrors.some(e => e.includes('paths')), 'Should report invalid paths');
  assert(blockErrors.some(e => e.includes('countries')), 'Should report invalid countries');
  
  // Test takedown validation
  const validTakedown = {
    id: 'test456',
    paths: ['/v/test456', '/t/test456'],
    reason: 'hate_speech',
  };
  assert.strictEqual(validateTakedownRequest(validTakedown).length, 0, 'Valid takedown request should pass');
  
  // Test unblock validation
  const validUnblock = { id: 'test789' };
  assert.strictEqual(validateUnblockRequest(validUnblock).length, 0, 'Valid unblock request should pass');
  
  const invalidUnblock = { id: '' };
  assert(validateUnblockRequest(invalidUnblock).length > 0, 'Invalid unblock should have errors');
  
  console.log('✓ Validation tests passed');
}

// Test label processing
function testLabelProcessing() {
  console.log('Testing label processing...');
  
  // Test imeta URL extraction
  const event = {
    tags: [
      ['imeta', 'url https://divine.video/v/test123', 'm video/mp4'],
      ['imeta', 'url https://divine.video/t/test123.jpg', 'm image/jpeg'],
    ],
    content: 'Check out https://example.com/other',
  };
  
  const urls = extractImetaUrls(event);
  assert(urls.includes('https://divine.video/v/test123'), 'Should extract video URL from imeta');
  assert(urls.includes('https://divine.video/t/test123.jpg'), 'Should extract thumbnail URL from imeta');
  assert(urls.includes('https://example.com/other'), 'Should extract URL from content');
  
  // Test URL to asset ID conversion
  assert.strictEqual(urlToAssetId('https://divine.video/v/abc123'), 'abc123', 'Should convert video URL to asset ID');
  assert.strictEqual(urlToAssetId('https://cdn.divine.video/t/xyz.jpg'), 'xyz', 'Should handle CDN subdomain');
  assert.strictEqual(urlToAssetId('https://other.com/v/test'), null, 'Should return null for non-divine.video URLs');
  
  // Test category severity mapping
  assert.strictEqual(CATEGORY_SEVERITY['sexual_minors'], 'p0', 'Sexual minors should be P0');
  assert.strictEqual(CATEGORY_SEVERITY['copyright'], 'p3', 'Copyright should be P3');
  assert.strictEqual(CATEGORY_SEVERITY['adult_nudity'], 'p2', 'Adult nudity should be P2');
  
  console.log('✓ Label processing tests passed');
}

// Mock fetch for testing media passthrough
global.fetch = async (url) => {
  return new Response('mocked origin response', { status: 200 });
};

// Test Worker with mock environment
async function testWorker() {
  console.log('Testing Worker endpoints...');
  
  // Import worker module dynamically
  const workerModule = await import('../src/worker.js');
  const worker = workerModule.default;
  
  // Create mock environment
  const env = {
    RULES: new MockKV(),
    AUTH_TOKEN: 'test-secret-token',
    ORIGIN_URL: 'https://origin.example.com',
  };
  
  // Test unauthorized admin request
  const unauthorizedReq = new Request('https://test.com/admin/block', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'test' }),
  });
  const unauthorizedRes = await worker.fetch(unauthorizedReq, env, {});
  assert.strictEqual(unauthorizedRes.status, 401, 'Should reject unauthorized request');
  
  // Test authorized block request
  const blockReq = new Request('https://test.com/admin/block', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-secret-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: 'test123',
      paths: ['/v/test123'],
      countries: ['US', 'CA'],
      reason: 'copyright',
      ttl: 3600,
    }),
  });
  const blockRes = await worker.fetch(blockReq, env, {});
  assert.strictEqual(blockRes.status, 200, 'Should accept authorized block request');
  const blockData = await blockRes.json();
  assert(blockData.ok, 'Block response should be ok');
  assert(blockData.rule, 'Should return rule data');
  
  // Verify rule was stored
  const storedRule = await env.RULES.get('asset:test123', 'json');
  assert(storedRule, 'Rule should be stored in KV');
  assert.deepStrictEqual(storedRule.countries_blocked, ['US', 'CA'], 'Countries should be uppercase');
  
  // Test media request with geoblock
  const mediaReq = new Request('https://test.com/v/test123', {
    headers: { 'x-test-country': 'US' },
  });
  const mediaRes = await worker.fetch(mediaReq, env, {});
  assert.strictEqual(mediaRes.status, 451, 'US request should be geoblocked');
  assert(mediaRes.headers.get('Vary') === 'CF-IPCountry', 'Should vary by country');
  
  // Test media request from allowed country
  const allowedReq = new Request('https://test.com/v/test123', {
    headers: { 'x-test-country': 'GB' },
  });
  const allowedRes = await worker.fetch(allowedReq, env, {});
  assert.strictEqual(allowedRes.status, 200, 'GB request should pass through');
  
  // Test unblock
  const unblockReq = new Request('https://test.com/admin/unblock', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-secret-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: 'test123' }),
  });
  const unblockRes = await worker.fetch(unblockReq, env, {});
  assert.strictEqual(unblockRes.status, 200, 'Should accept unblock request');
  
  // Verify rule was removed
  const removedRule = await env.RULES.get('asset:test123', 'json');
  assert.strictEqual(removedRule, null, 'Rule should be removed from KV');
  
  console.log('✓ Worker tests passed');
}

// Run all tests
async function runTests() {
  console.log('Running Faro tests...\n');
  
  try {
    testRulesEvaluation();
    testAssetIdExtraction();
    testValidation();
    testLabelProcessing();
    await testWorker();
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}