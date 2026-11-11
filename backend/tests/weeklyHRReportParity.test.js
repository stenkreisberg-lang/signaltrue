import { describe, expect, test } from '@jest/globals';
import {
  buildHRReportPresentation, reportVersion, formatHRValue,
} from '../services/weeklyReportPresentationService.js';
import { weeklyHRPdfBuffer } from '../services/weeklyReportPdfService.js';
import {
  pickTeamMeasurement, evaluateFollowUpMeasurement,
} from '../services/weeklyReportReviewService.js';

const snapshot = {
  id: '507f191e810c19729de860aa',
  orgId: '507f191e810c19729de860ab',
  orgName: 'Näidisorganisatsioon',
  periodStart: new Date('2026-11-02T00:00:00Z'),
  periodEnd: new Date('2026-11-09T00:00:00Z'),
  generatedAt: new Date('2026-11-11T12:00:00Z'),
  reportMode: 'full',
  coverage: { totalUsers: 10 },
  metrics: [
    { key: 'meeting_hours', label: 'Meeting hours', unit: 'hours', available: true,
      current: 11.8, previous: 10.2, changePct: 15.7,
      readiness: { mappedUsers: 9, totalUsers: 10 } },
    { key: 'messages', label: 'Messaging total', unit: 'messages', available: true,
      current: 743, previous: 670, changePct: 10.8,
      readiness: { mappedUsers: 8, totalUsers: 10 } },
    { key: 'after_hours', label: 'After hours', unit: '%', available: true,
      current: 8.3, previous: 7.6, changePct: null,
      comparisonReason: 'Source coverage changed',
      readiness: { mappedUsers: 8, totalUsers: 10 } },
    { key: 'focus_time', label: 'Calendar availability', unit: 'hours',
      available: false, current: null,
      readiness: { mappedUsers: 1, totalUsers: 10, reason: 'No verified calendar observation' } },
  ],
  trend: [
    { weekStart: '2026-10-19', label: '3w ago', meetingHours: 9.4 },
    { weekStart: '2026-10-26', label: '2w ago', meetingHours: null },
    { weekStart: '2026-11-02', label: '1w ago', meetingHours: 11.8 },
  ],
  teamReadiness: [],
  actionOutcomes: [],
};

describe('P2 saved HR report: same values in PDF, dashboard and email', () => {
  test('keeps raw totals distinct from per-person measurements', () => {
    const view = buildHRReportPresentation(snapshot);
    expect(view.metrics.find(item => item.key === 'messages')).toMatchObject({
      label: 'Sõnumid kokku', current: 743,
    });
    expect(view.metrics.find(item => item.key === 'meeting_hours')).toMatchObject({
      current: 11.8, delta: 1.6,
    });
    expect(view.metrics.find(item => item.key === 'after_hours')).toMatchObject({
      current: 8.3, comparable: false, delta: null,
    });
    expect(view.metrics.find(item => item.key === 'focus_time')).toMatchObject({
      current: null, available: false,
    });
    expect(formatHRValue(view.metrics[0])).toBe('11,8 h');
  });

  test('version changes only when frozen report content changes', () => {
    expect(reportVersion(snapshot)).toBe(reportVersion({ ...snapshot, generatedAt: new Date() }));
    expect(reportVersion(snapshot)).not.toBe(reportVersion({
      ...snapshot,
      metrics: snapshot.metrics.map(item => item.key === 'messages' ? { ...item, current: 744 } : item),
    }));
  });

  test('never claims source reconciliation from baseline completion alone', () => {
    const view = buildHRReportPresentation(snapshot);
    expect(view.sourceReconciled).toBe(false);
    expect(view.sourceWarning).toMatch(/vastavuskontroll/);
    expect(buildHRReportPresentation({
      ...snapshot, dataQuality: { sourceToSnapshotParity: { status: 'PASS' } },
    }).sourceReconciled).toBe(true);
  });

  test('generates a real two-page PDF from the saved snapshot without a data fetch', async () => {
    const pdf = await weeklyHRPdfBuffer(snapshot);
    expect(pdf.subarray(0, 4).toString('ascii')).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1800);
  });
});

describe('P2 team-action review must use the same team measurement', () => {
  const team = {
    id: '507f191e810c19729de860ac',
    points: [{
      measured: true, complete: true, sampledOn: '2026-11-08',
      meetingHoursPerRepresentedPerson: 11.8, calendarActors: 2,
      messagesPerRepresentedPerson: 43, messagingActors: 2,
    }],
  };
  test('two-member teams use the same exact metric and evidence logic', () => {
    expect(pickTeamMeasurement(team, 'meetingHoursPerRepresentedPerson')).toMatchObject({
      value: 11.8, contributors: 2, source: 'calendar',
    });
    expect(pickTeamMeasurement(team, 'messagesPerRepresentedPerson')).toMatchObject({
      value: 43, contributors: 2, source: 'messaging',
    });
  });
  test('denies an action when a source or team metric has no measurements', () => {
    expect(pickTeamMeasurement(team, 'not_a_metric')).toBeNull();
    expect(pickTeamMeasurement({
      ...team, points: [{ ...team.points[0], calendarActors: 1 }],
    }, 'meetingHoursPerRepresentedPerson')).toBeNull();
  });
  test('a missing later week is not reported as improvement', () => {
    const result = evaluateFollowUpMeasurement({
      metricKey: 'meetingHoursPerRepresentedPerson',
      baselinePeriod: new Date('2026-11-08'), baselineContributors: 2,
    }, team);
    expect(result.comparability).toBe('missing_data');
  });
  test('a changed contributor count requires review before comparing', () => {
    const result = evaluateFollowUpMeasurement({
      metricKey: 'meetingHoursPerRepresentedPerson',
      baselinePeriod: new Date('2026-11-08'), baselineContributors: 2,
    }, { ...team, points: [{
      ...team.points[0], sampledOn: '2026-11-22', calendarActors: 3,
      meetingHoursPerRepresentedPerson: 10.9,
    }] });
    expect(result.comparability).toBe('not_comparable');
  });
});
