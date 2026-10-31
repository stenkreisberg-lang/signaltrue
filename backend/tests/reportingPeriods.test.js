import { describe, test, expect } from '@jest/globals';
import { completedReportingWeek } from '../utils/reportingPeriods.js';

describe('completed tenant-local reporting weeks', () => {
  test('Tallinn Monday 2 Nov 2026 follows winter DST transition', () => {
    const w = completedReportingWeek(new Date('2026-11-02T05:30:00Z'), 'Europe/Tallinn');
    expect(w.periodStart.toISOString()).toBe('2026-10-25T22:00:00.000Z');
    expect(w.periodEnd.toISOString()).toBe('2026-11-01T22:00:00.000Z');
    expect(w.previousStart.toISOString()).toBe('2026-10-18T21:00:00.000Z');
  });
  test('Tallinn spring DST week contains 167 elapsed hours', () => {
    const w = completedReportingWeek(new Date('2027-03-29T04:30:00Z'), 'Europe/Tallinn');
    expect(w.periodStart.toISOString()).toBe('2027-03-21T22:00:00.000Z');
    expect(w.periodEnd.toISOString()).toBe('2027-03-28T21:00:00.000Z');
    expect((w.periodEnd - w.periodStart) / 3600000).toBe(167);
  });
  test('uses configured Australian timezone and rejects invalid input', () => {
    const au = completedReportingWeek(new Date('2026-11-02T02:00:00Z'),'Australia/Melbourne');
    const ee = completedReportingWeek(new Date('2026-11-02T02:00:00Z'),'Europe/Tallinn');
    expect(au.periodEnd.getTime()).not.toBe(ee.periodEnd.getTime());
    expect(() => completedReportingWeek(new Date(), 'Not/A_Timezone')).toThrow();
  });
});
