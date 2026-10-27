import { describe, expect, it } from 'vitest';
import { normalizeContactIntent } from './Contact';

describe('inbound contact intent routing', () => {
  it('preserves consultant partnership classification', () => {
    expect(normalizeContactIntent('consultant-partnership')).toBe('consultant-partnership');
  });
  it('retains existing free pilot aliases', () => {
    expect(normalizeContactIntent('au-founding-review')).toBe('free-preview');
    expect(normalizeContactIntent('free-preview')).toBe('free-preview');
  });
  it('normalizes unknown values to the existing safe default', () => {
    expect(normalizeContactIntent('not-an-intent')).toBe('free-preview');
  });
});
