import { afterEach, describe, expect, jest, test } from '@jest/globals';
import EngagementTeamDaily from '../models/engagementTeamDaily.js';
import { aggregateWeeklyMetrics } from '../services/engagementWeeklyMetricsService.js';

afterEach(() => jest.restoreAllMocks());

describe('unavailable focus-time metrics are not zero activity', () => {
  test('preserves null when calendar data was suppressed', async () => {
    const daily = [{
      date: '2026-11-02', activePeopleCount: 8,
      calendar: { focusHoursAvailablePerPerson: null, focusBlocks90mCount: null },
      messaging: { messagesSentTotal: 35 },
      integrationCoverage: { hasCalendar: true, hasMessaging: true },
    }];
    jest.spyOn(EngagementTeamDaily, 'find')
      .mockReturnValueOnce({ sort: () => ({ lean: async () => daily }) })
      .mockReturnValueOnce({ sort: () => ({ lean: async () => [] }) });

    const result = await aggregateWeeklyMetrics('team-1', '2026-11-02');
    expect(result.focusHoursAvailablePerPerson).toBeNull();
    expect(result.focusBlocks90mCountPerPerson).toBeNull();
    expect(result.integrationCoverage.hasCalendar).toBe(true);
  });
});
