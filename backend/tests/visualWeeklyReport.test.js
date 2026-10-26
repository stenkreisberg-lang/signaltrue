import { describe, expect, test } from '@jest/globals';
import { buildReportTrendSeries } from '../services/reportTrendService.js';
import { renderVisualWeeklyEmail } from '../services/visualWeeklyEmailService.js';

describe('visual weekly reporting', () => {
  const now = new Date('2026-10-26T12:00:00.000Z');
  test('uses real rolling-seven-day records, preserves missing weeks and excludes team records', () => {
    const series = buildReportTrendSeries([
      { date: new Date('2026-10-13T00:00:00Z'), meetingInstanceCount7d: 750, meetingCount7d: 752, messageCount7d: 22 },
      { date: new Date('2026-10-21T00:00:00Z'), meetingInstanceCount7d: 685, meetingCount7d: 690, messageCount7d: 0 },
      { date: new Date('2026-10-22T00:00:00Z'), meetingInstanceCount7d: 9999, teamId: 'TEAM_A' },
    ], now);
    expect(series.weekly).toHaveLength(26);
    expect(series.daily).toHaveLength(7);
    expect(series.weekly.at(-1).meetings).toBe(685);
    expect(series.weekly.at(-1).after_hours).toBeNull(); // no messages; not 0%
    expect(series.weekly.at(-2).meetings).toBe(750);
    expect(series.weekly.at(-3).meetings).toBeNull(); // do not fabricate missing history
  });
  test('does not show attendee-expanded legacy count as comparable unique meetings', () => {
    const result = buildReportTrendSeries([
      { date: new Date('2026-10-20T00:00:00Z'), meetingInstanceCount7d: 0, meetingCount7d: 1000 },
    ], now);
    expect(result.weekly.at(-1).meetings).toBeNull();
  });
  test('client email shows visual history, evidence gaps and a concrete coverage action', () => {
    const snapshot = {
      orgName: 'Example',
      periodStart: new Date('2026-10-19'), periodEnd: now,
      status: { label: 'Stable', evidenceGrade: 'Low' },
      coverage: { mappingCoveragePct: 98 },
      metrics: [
        {key:'meetings',label:'Meetings',unit:'meetings',available:true,current:685,previous:750,baseline:738,changePct:-9},
        {key:'after_hours',label:'After-hours messaging',unit:'%',available:false,readiness:{mappedUsers:1,totalUsers:42}},
        {key:'focus_time',label:'Uninterrupted time',unit:'hours',available:false,readiness:{mappedUsers:1,totalUsers:42}},
      ],
      observations: [], actions: {primary: null},
    };
    const series = buildReportTrendSeries([
      { date: new Date('2026-10-13'), meetingInstanceCount7d: 750 },
      { date: new Date('2026-10-21'), meetingInstanceCount7d: 685 },
    ], now);
    const html = renderVisualWeeklyEmail(snapshot, series);
    expect(html).toContain('685');
    expect(html).toContain('Meeting count over time');
    expect(html).toContain('No organization-wide trend is inferred');
    expect(html).toContain('verify Microsoft Teams permissions');
    expect(html).toContain('/app/latest-brief');
    expect(html).not.toContain('Week-over-week comparison');
    expect(html).not.toContain('No action recommended this week');
  });
});
