// Minimal tests for rule evaluation logic (no external deps)
const assert = require('assert');
const { evaluateRule, isExpired, getAssetIdFromPath } = require('../src/lib/rules.js');

function testEvaluateRegion() {
  const rule = { status: 'region', countries_blocked: ['US'], reason: 'dmca' };
  let r = evaluateRule(rule, 'US');
  assert.strictEqual(r.code, 451, 'US should get 451');
  assert.strictEqual(r.varyCountry, true);
  r = evaluateRule(rule, 'NZ');
  assert.strictEqual(r.code, null, 'NZ should pass');
}

function testEvaluateGlobal() {
  const rule = { status: 'global_block', reason: 'removed' };
  const r = evaluateRule(rule, 'US');
  assert.strictEqual(r.code, 410);
  assert.strictEqual(r.varyCountry, false);
}

function testExpiry() {
  const now = Math.floor(Date.now() / 1000);
  const rule = { status: 'region', countries_blocked: ['US'], exp: now - 10 };
  assert.ok(isExpired(rule, now), 'expired rule');
  const r = evaluateRule(rule, 'US');
  assert.strictEqual(r.code, null, 'expired rule should not apply');
}

function testPathParsing() {
  assert.strictEqual(getAssetIdFromPath('/v/abc'), 'abc');
  assert.strictEqual(getAssetIdFromPath('/t/xyz.jpg'), 'xyz');
  assert.strictEqual(getAssetIdFromPath('/t/dir/xyz.png'), 'dir/xyz');
  assert.strictEqual(getAssetIdFromPath('/other/xyz'), null);
}

function run() {
  testEvaluateRegion();
  testEvaluateGlobal();
  testExpiry();
  testPathParsing();
  console.log('All tests passed.');
}

run();

