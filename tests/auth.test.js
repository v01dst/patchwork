const test = require('node:test');
const assert = require('node:assert');
const { resolveApiSecretAuth } = require('../lib/auth-core.js');

// Explicitly ensure PATCHWORK_API_SECRET is undefined for this suite.
delete process.env.PATCHWORK_API_SECRET;
assert.strictEqual(process.env.PATCHWORK_API_SECRET, undefined);

test('API Secret Auth is FAIL-CLOSED (lib/auth)', async (t) => {
  await t.test('missing PATCHWORK_API_SECRET rejects with 500 and authorized:false (not 200)', () => {
    // Simulate the helper's behavior with the secret unset in the environment.
    const result = resolveApiSecretAuth(process.env.PATCHWORK_API_SECRET, 'any-provided-key');

    assert.strictEqual(result.authorized, false);
    assert.strictEqual(result.status, 500);
    assert.strictEqual(result.error, 'Server Configuration Error');
    assert.strictEqual(result.missingSecret, true);
    // Explicitly NOT a silent 200 / authorized:true.
    assert.notStrictEqual(result.status, 200);
  });

  await t.test('missing secret rejects even when caller supplies a key', () => {
    const result = resolveApiSecretAuth(undefined, 'attacker-guess');
    assert.strictEqual(result.authorized, false);
    assert.strictEqual(result.status, 500);
  });

  await t.test('missing secret rejects even on an empty-string secret', () => {
    const result = resolveApiSecretAuth('', 'anything');
    assert.strictEqual(result.authorized, false);
    assert.strictEqual(result.status, 500);
    assert.strictEqual(result.missingSecret, true);
  });

  await t.test('configured secret + correct key => authorized', () => {
    const result = resolveApiSecretAuth('super-secret-123', 'super-secret-123');
    assert.strictEqual(result.authorized, true);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.missingSecret, undefined);
  });

  await t.test('configured secret + wrong key => 401, not fail-open', () => {
    const result = resolveApiSecretAuth('super-secret-123', 'wrong-key');
    assert.strictEqual(result.authorized, false);
    assert.strictEqual(result.status, 401);
    assert.strictEqual(result.error, 'Unauthorized');
  });

  await t.test('configured secret + no key provided => 401', () => {
    const result = resolveApiSecretAuth('super-secret-123', null);
    assert.strictEqual(result.authorized, false);
    assert.strictEqual(result.status, 401);
  });
});
