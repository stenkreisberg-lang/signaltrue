/**
 * Pure unit tests for the weekly brief data-sanity layer (no DB required).
 * Integration coverage lives in weeklyBriefGating.test.js (needs mongodb-memory-server).
 */
import { describe, expect, test } from '@jest/globals';
import { detectDataAnomalies, isCatchAllTeam } from '../services/weeklyBriefService.js';

const now = new Date('2026-07-06T12:00:00Z');
const base = {
  tw: { afterHoursRatio: 0.15, focusTimeAvailability: 8 },
  sixWeekAvg: { afterHoursRatio: 0.18, focusTimeAvailability: 9 },
  twMessages: 120,
  sixWeekRawAvg: { messages: 130 },
  integrationConnections: [],
  now,
};

describe('catch-all team detection', () => {
  test('flags common catch-all bucket names', () => {
    for (const name of ['Unassigned', 'general', ' OTHER ', 'No Team', 'default']) {
      expect(isCatchAllTeam(name)).toBe(true);
    }
  });
  test('does not flag real team names', () => {
    for (const name of ['Engineering', 'Marketing', 'General Counsel', 'IT osakond', null]) {
      expect(isCatchAllTeam(name)).toBe(false);
    }
  });
});

describe('detectDataAnomalies', () => {
  test('healthy data produces no anomalies', () => {
    const { anomalies, suspectMetrics } = detectDataAnomalies(base);
    expect(anomalies).toHaveLength(0);
    expect(suspectMetrics.size).toBe(0);
  });

  test('after-hours collapse to exactly 0% vs meaningful history is declared, not celebrated', () => {
    const { anomalies, suspectMetrics } = detectDataAnomalies({
      ...base,
      tw: { ...base.tw, afterHoursRatio: 0 },
      sixWeekAvg: { ...base.sixWeekAvg, afterHoursRatio: 0.47 },
    });
    expect(anomalies.some((a) => a.kind === 'after_hours_collapse')).toBe(true);
    expect(suspectMetrics.has('afterHours')).toBe(true);
  });

  test('message volume collapse (e.g. 3 msgs vs 6wk avg of 130) is flagged as broken sync', () => {
    const { anomalies, suspectMetrics } = detectDataAnomalies({
      ...base,
      twMessages: 3,
      sixWeekRawAvg: { messages: 130 },
    });
    expect(anomalies.some((a) => a.kind === 'message_collapse')).toBe(true);
    expect(suspectMetrics.has('messages')).toBe(true);
  });

  test('connector marked "connected" but silent for weeks is reported stale', () => {
    const { anomalies, staleConnectors } = detectDataAnomalies({
      ...base,
      integrationConnections: [
        {
          _id: 'x1',
          integrationType: 'microsoft-teams',
          status: 'connected',
          sync: { lastSyncAt: new Date('2026-06-16') }, // 20 days before `now`
        },
        {
          _id: 'x2',
          integrationType: 'microsoft-outlook',
          status: 'connected',
          sync: { lastSyncAt: new Date('2026-07-05') }, // fresh
        },
      ],
    });
    expect(staleConnectors).toHaveLength(1);
    expect(staleConnectors[0].integrationType).toBe('microsoft-teams');
    expect(anomalies.some((a) => a.kind === 'stale_connector')).toBe(true);
  });

  test('focus time at zero with zero history is marked unmeasured (suspect), not a finding', () => {
    const { suspectMetrics } = detectDataAnomalies({
      ...base,
      tw: { ...base.tw, focusTimeAvailability: 0 },
      sixWeekAvg: { ...base.sixWeekAvg, focusTimeAvailability: 0 },
    });
    expect(suspectMetrics.has('focusTime')).toBe(true);
  });

  test('legitimately quiet weeks are NOT flagged (low history, low current)', () => {
    const { anomalies } = detectDataAnomalies({
      ...base,
      twMessages: 0,
      sixWeekRawAvg: { messages: 2 }, // org that barely uses chat
      tw: { ...base.tw, afterHoursRatio: 0 },
      sixWeekAvg: { ...base.sixWeekAvg, afterHoursRatio: 0.05 }, // low history
    });
    expect(anomalies).toHaveLength(0);
  });
});
