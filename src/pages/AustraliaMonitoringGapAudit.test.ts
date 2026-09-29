import { describe, expect, test } from 'vitest';
import { calculateAuditResult } from './AustraliaMonitoringGapAudit';

describe('Australian monitoring gap result', () => {
  test.each([
    [0, 'Build the review process first'],
    [4, 'Build the review process first'],
    [5, 'Control-review evidence gap'],
    [8, 'Control-review evidence gap'],
    [9, 'Strong control-review foundation'],
    [12, 'Strong control-review foundation'],
  ])('maps score %s to %s', (score, expected) => {
    expect(calculateAuditResult(score)).toBe(expected);
  });
});
