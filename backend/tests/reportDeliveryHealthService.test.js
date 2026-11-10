import { describe, expect, test } from '@jest/globals';
import { classifyReportDispatch } from '../services/reportDeliveryHealthService.js';

const now = new Date('2026-11-10T16:00:00Z');
describe('report delivery uncertainty monitoring', () => {
  test('never retries unconfirmed sends as though they definitely failed', () => {
    expect(classifyReportDispatch({ status: 'unknown' }, now)).toBe('unconfirmed_delivery');
  });
  test('flags sends stalled beyond the reconciliation window', () => {
    expect(classifyReportDispatch({
      status: 'sending', createdAt: '2026-11-10T15:00:00Z',
    }, now)).toBe('stalled_delivery');
  });
  test('does not flag fresh or confirmed sends', () => {
    expect(classifyReportDispatch({
      status: 'sending', createdAt: '2026-11-10T15:55:00Z',
    }, now)).toBe(null);
    expect(classifyReportDispatch({
      status: 'sent', createdAt: '2026-11-10T14:00:00Z',
    }, now)).toBe(null);
  });
});
