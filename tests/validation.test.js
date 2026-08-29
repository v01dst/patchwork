const test = require('node:test');
const assert = require('node:assert');

test('Validation Rules & Enums', async (t) => {
  const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

  await t.test('validates allowed priorities correctly', () => {
    assert.strictEqual(ALLOWED_PRIORITIES.includes('low'), true);
    assert.strictEqual(ALLOWED_PRIORITIES.includes('medium'), true);
    assert.strictEqual(ALLOWED_PRIORITIES.includes('high'), true);
    assert.strictEqual(ALLOWED_PRIORITIES.includes('urgent'), true);
    assert.strictEqual(ALLOWED_PRIORITIES.includes('critical'), false);
  });

  await t.test('validates date format parsing', () => {
    const validDate = '2026-08-30';
    const invalidDate = 'invalid-date-string';
    assert.strictEqual(isNaN(Date.parse(validDate)), false);
    assert.strictEqual(isNaN(Date.parse(invalidDate)), true);
  });
});
