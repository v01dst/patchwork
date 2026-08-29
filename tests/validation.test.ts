import { describe, it, expect } from 'vitest';
import { ALLOWED_PRIORITIES } from '../lib/constants';

describe('Validation Rules & Enums', () => {
  it('validates allowed priorities correctly', () => {
    expect(ALLOWED_PRIORITIES).toContain('low');
    expect(ALLOWED_PRIORITIES).toContain('medium');
    expect(ALLOWED_PRIORITIES).toContain('high');
    expect(ALLOWED_PRIORITIES).toContain('urgent');
    // @ts-expect-error test invalid string
    expect(ALLOWED_PRIORITIES.includes('critical')).toBe(false);
  });

  it('validates date format parsing', () => {
    const validDate = '2026-08-30';
    const invalidDate = 'invalid-date-string';
    expect(isNaN(Date.parse(validDate))).toBe(false);
    expect(isNaN(Date.parse(invalidDate))).toBe(true);
  });
});
