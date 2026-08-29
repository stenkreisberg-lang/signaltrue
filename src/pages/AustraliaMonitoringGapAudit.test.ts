import { describe, expect, test } from 'vitest';
import { calculateAuditResult } from './AustraliaMonitoringGapAudit';

describe('Australian monitoring gap result', () => {
  test.each([
    [0, 'Limited monitoring visibility'],
    [4, 'Limited monitoring visibility'],
    [5, 'Developing monitoring practice'],
    [8, 'Developing monitoring practice'],
    [9, 'Established monitoring practice'],
    [12, 'Established monitoring practice'],
  ])('maps score %s to %s', (score, expected) => {
    expect(calculateAuditResult(score)).toBe(expected);
  });
});
