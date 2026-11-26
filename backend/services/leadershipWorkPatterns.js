import { completedReportingWeek } from '../utils/reportingPeriods.js';

const keys = ['meeting_hours', 'focus_time', 'after_hours', 'messages'];
export function leadershipWorkPatterns(snapshot, timezone, now = new Date()) {
  const expected = completedReportingWeek(now, timezone);
  const currentPeriod =
    snapshot?.reportMode === 'full' &&
    +new Date(snapshot.periodStart) === +expected.periodStart &&
    +new Date(snapshot.periodEnd) === +expected.periodEnd;
  if (!currentPeriod) return { state: 'unavailable', metrics: [] };
  const metrics = keys.map((key) => {
    const row = snapshot.payload?.metrics?.find((m) => m.key === key);
    const current = row?.available === true && Number.isFinite(row.current) ? row.current : null;
    const previous =
      current !== null &&
      !row.comparisonReason &&
      Number.isFinite(row.previous) &&
      row.changePct != null
        ? row.previous
        : null;
    return {
      key,
      current,
      previous,
      delta: previous === null ? null : +(current - previous).toFixed(2),
      unit: row?.unit ?? null,
    };
  });
  return {
    state: metrics.some((m) => m.current !== null) ? 'observed' : 'unavailable',
    metrics,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    reconciled: snapshot.payload?.dataQuality?.sourceToSnapshotParity?.status === 'PASS',
  };
}
