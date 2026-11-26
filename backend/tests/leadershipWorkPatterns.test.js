import { expect, test } from '@jest/globals';
import { leadershipWorkPatterns } from '../services/leadershipWorkPatterns.js';
const now = new Date('2026-11-26T15:00:00Z');
const snapshot = {
  reportMode: 'full',
  periodStart: '2026-11-15T22:00:00Z',
  periodEnd: '2026-11-22T22:00:00Z',
  payload: {
    metrics: [
      {
        key: 'meeting_hours',
        available: true,
        current: 18,
        previous: 27.6,
        unit: 'hours',
        changePct: -34.8,
      },
      {
        key: 'after_hours',
        available: true,
        current: 0,
        previous: 10,
        comparisonReason: 'coverage changed',
      },
      { key: 'messages', available: false, current: 0 },
      { key: 'private_label', current: 12 },
    ],
  },
};
test('leadership reads the same published numbers and honours source comparison limits', () => {
  const result = leadershipWorkPatterns(snapshot, 'Europe/Tallinn', now);
  expect(result.metrics.map((m) => m.current)).toEqual([18, null, 0, null]);
  expect(result.metrics[0].delta).toBe(-9.6);
  expect(result.metrics[2].delta).toBeNull();
  expect(result.reconciled).toBe(false);
});
test('stale, setup and absent snapshots cannot support a weekly leadership finding', () => {
  for (const s of [
    null,
    { ...snapshot, reportMode: 'setup' },
    { ...snapshot, periodEnd: '2026-11-15' },
  ])
    expect(leadershipWorkPatterns(s, 'Europe/Tallinn', now)).toEqual({
      state: 'unavailable',
      metrics: [],
    });
});
