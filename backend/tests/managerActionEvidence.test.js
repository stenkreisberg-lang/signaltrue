import { describe, expect, test } from '@jest/globals';
import { summarizeManagerSeries } from '../services/managerFindings.js';
import {
  buildRollingActorCohorts,
  evaluateActionOutcome,
} from '../services/managerIntelligenceService.js';
import { renderManagerWeeklyDigest } from '../services/managerWeeklyDeliveryService.js';

const action = {
  metric: 'messages',
  baseline: 10,
  baselineKey: 'A',
  baselineWeek: '2026-10-05',
  due14: new Date('2026-10-26'),
  due28: new Date('2026-11-09'),
  direction: 'decrease',
};
const point = (date, sampledOn, value, comparisonKey = 'A') => ({
  date,
  sampledOn,
  value,
  comparisonKey,
  verified: true,
});
const base = point('2026-10-05', '2026-10-11', 10);
const recent = point('2026-10-19', '2026-10-25', 8);
const data = (...points) => ({ eligible: true, trendSeries: [{ key: 'messages', points }] });
describe('comparable manager decisions', () => {
  test('late reviews keep their original window and separate the two decisions', () => {
    const observed = data(
      base,
      recent,
      point('2026-11-02', '2026-11-08', 12),
      point('2026-11-16', '2026-11-22', 30)
    );
    expect(evaluateActionOutcome(action, observed, new Date('2026-11-26'), 14)?.value).toBe(8);
    expect(evaluateActionOutcome(action, observed, new Date('2026-11-26'), 28)?.value).toBe(12);
    expect(
      evaluateActionOutcome(action, data(base, recent), new Date('2026-11-26'), 28)
    ).toBeNull();
  });
  test('rejects changed cohort, corrected baseline, unversioned action and premature review', () => {
    const now = new Date('2026-10-26');
    expect(
      evaluateActionOutcome(action, data(base, { ...recent, comparisonKey: 'B' }), now)
    ).toBeNull();
    expect(evaluateActionOutcome(action, data({ ...base, value: 11 }, recent), now)).toBeNull();
    expect(
      evaluateActionOutcome({ ...action, baselineKey: undefined }, data(base, recent), now)
    ).toBeNull();
    expect(evaluateActionOutcome(action, data(base, recent), new Date('2026-10-24'))).toBeNull();
  });
  test('one sender remains below the floor when two others have calendar data', () => {
    const input = {
      grouped: [
        { _id: '2026-10-25', actors: ['a', 'b', 'c'], messaging: ['a'], calendar: ['b', 'c'] },
      ],
      activeIds: new Set(['a', 'b', 'c']),
      teamId: 'team',
      now: new Date('2026-10-26'),
      count: 1,
    };
    expect(buildRollingActorCohorts({ ...input, field: 'messaging' })['team:2026-10-19']).toBe(1);
    expect(buildRollingActorCohorts({ ...input, field: 'calendar' })['team:2026-10-19']).toBe(2);
  });
  test('requires four comparable weeks and withholds the relative change from a tiny baseline', () => {
    const points = [0.1, 0.2, 0.1, 0.1, 30].map((value) => ({ ...recent, value }));
    expect(summarizeManagerSeries(points, 'messages')).toMatchObject({
      baseline: 0.1,
      current: 30,
      changePct: null,
    });
    expect(
      summarizeManagerSeries([{ ...points[0], comparisonKey: 'C' }, ...points.slice(1)], 'messages')
    ).toBeNull();
  });
  test('Estonian digest uses the same current measurement and escapes the team name', () => {
    const html = renderManagerWeeklyDigest({
      locale: 'et',
      reportWeek: '2026-10-19',
      eligible: [
        {
          teamName: 'Tiim <A>',
          trendSeries: [{ label: 'Vaba kalendriaeg', unit: 'h/in', points: [recent] }],
        },
      ],
    });
    expect(html).toContain('Vaba kalendriaeg: 8 h/in');
    expect(html).toContain('Tiim &lt;A&gt;');
    expect(html).not.toContain('recurring meetings');
  });
});

test('a due action with an unverified baseline produces an insufficient-evidence review during the ingestion grace period', async () => {
  const { recordDueManagerReviews } = await import('../services/managerActionReviewService.js');
  const result = await recordDueManagerReviews(
    { ...action, baselineKey: null },
    data(base, recent),
    new Date('2026-10-26T10:00:00Z')
  );
  expect(result).toMatchObject({ day: 14, status: 'insufficient_evidence', value: null });
});
test('an existing recorded review is returned unchanged on retry', async () => {
  const { recordDueManagerReviews } = await import('../services/managerActionReviewService.js');
  const outcome14 = { value: 9, status: 'improved', measuredAt: new Date('2026-10-26') };
  expect(
    await recordDueManagerReviews(
      { ...action, outcome14 },
      data(base, recent),
      new Date('2026-10-27')
    )
  ).toMatchObject({ day: 14, ...outcome14 });
});
