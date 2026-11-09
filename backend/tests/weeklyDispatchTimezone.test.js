import { describe, test, expect } from '@jest/globals';
import { isMondayOrLater } from '../services/weeklyEmailScheduler.js';

describe('weekly HR email delivery timezone gate', () => {
  test('holds email before 09:00 Tallinn winter local time', () => {
    expect(isMondayOrLater(new Date('2026-11-02T06:59:00.000Z'))).toBe(false);
    expect(isMondayOrLater(new Date('2026-11-02T07:00:00.000Z'))).toBe(true);
  });
  test('holds email before 09:00 Tallinn summer local time', () => {
    expect(isMondayOrLater(new Date('2027-06-21T05:59:00.000Z'))).toBe(false);
    expect(isMondayOrLater(new Date('2027-06-21T06:00:00.000Z'))).toBe(true);
  });
  test('never sends the new week on Sunday or Monday midnight', () => {
    expect(isMondayOrLater(new Date('2026-11-01T22:01:00.000Z'))).toBe(false);
    expect(isMondayOrLater(new Date('2026-11-01T23:59:00.000Z'))).toBe(false);
    expect(isMondayOrLater(new Date('2026-11-03T09:00:00.000Z'))).toBe(true);
  });
});
