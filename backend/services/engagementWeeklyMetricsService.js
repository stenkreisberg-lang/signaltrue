/**
 * Engagement Weekly Metrics Service
 *
 * Aggregates 7 days of EngagementTeamDaily records into a single
 * WeeklyMetrics object that the scoring engine can consume.
 *
 * Aggregation strategy per metric type:
 *   - Ratios (0–1): weighted mean by activePeopleCount
 *   - Totals: sum across days
 *   - Per-person values: weighted mean by activePeopleCount
 *   - Counts (back-to-back, focus blocks, etc.): sum
 *   - Latency (median/p90): median-of-medians approximation
 *     (exact percentile requires raw data; this is correct for the scoring purpose)
 *
 * Also computes week-over-week change fields needed for Workload Volatility:
 *   - week_over_week_meeting_load_change
 *   - week_over_week_message_volume_change
 *   - week_over_week_after_hours_change
 *   - new_recurring_meetings_count   (derived)
 *   - activity_spike_days            (days > 1.5× baseline day value)
 */

import EngagementTeamDaily from '../models/engagementTeamDaily.js';

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Aggregate a team's EngagementTeamDaily records for a given week into a
 * WeeklyMetrics object.
 *
 * @param {string|ObjectId} teamId
 * @param {string} weekStart   — YYYY-MM-DD (Monday)
 * @returns {Object|null}      — WeeklyMetrics, or null if insufficient data
 */
export async function aggregateWeeklyMetrics(teamId, weekStart) {
  const weekEnd = addDays(weekStart, 6); // Sunday inclusive

  const days = await EngagementTeamDaily.find({
    teamId,
    date: { $gte: weekStart, $lte: weekEnd },
  })
    .sort({ date: 1 })
    .lean();

  if (days.length === 0) return null;

  // Also fetch the prior week for week-over-week calculations
  const prevWeekStart = addDays(weekStart, -7);
  const prevWeekEnd = addDays(weekStart, -1);
  const prevDays = await EngagementTeamDaily.find({
    teamId,
    date: { $gte: prevWeekStart, $lte: prevWeekEnd },
  })
    .sort({ date: 1 })
    .lean();

  const activePeopleCount = Math.round(weightedMean(days, 'activePeopleCount', null));

  return {
    weekStart,
    weekEnd,
    activePeopleCount,

    // ── Calendar ──────────────────────────────────────────────────────────────
    meetingHoursPerPerson: wMean(days, 'calendar.meetingHoursPerPerson'),
    attendeeHoursPerPerson: wMean(days, 'calendar.attendeeHoursPerPerson'),
    recurringMeetingRatio: wMean(days, 'calendar.recurringMeetingRatio'),
    avgAttendeeCount: wMean(days, 'calendar.avgAttendeeCount'),
    backToBackMeetingCount: sumField(days, 'calendar.backToBackMeetingCount'),
    fragmentedDayRatio: wMean(days, 'calendar.fragmentedDayRatio'),
    focusHoursAvailablePerPerson: wMean(days, 'calendar.focusHoursAvailablePerPerson'),
    focusBlocks90mCountPerPerson: perPerson(days, 'calendar.focusBlocks90mCount'),
    manager1to1MinutesPerPerson: wMean(days, 'calendar.manager1to1MinutesPerPerson'),
    cancelled1to1Count: sumField(days, 'calendar.cancelled1to1Count'),
    afterHoursMeetingMinutes: sumField(days, 'calendar.afterHoursMeetingMinutes'),

    // Derived: after_hours_meeting_ratio (for Recovery Debt)
    afterHoursMeetingRatio: derivedAfterHoursMeetingRatio(days),

    // ── Messaging ─────────────────────────────────────────────────────────────
    messagesSentPerPerson: wMean(days, 'messaging.messagesSentPerPerson'),
    afterHoursMessageRatio: wMean(days, 'messaging.afterHoursMessageRatio'),
    medianResponseMinutes: medianOfMedians(days, 'messaging.medianResponseMinutes'),
    p90ResponseMinutes: medianOfMedians(days, 'messaging.p90ResponseMinutes'),
    uniqueCollaboratorsPerPerson: wMean(days, 'messaging.uniqueCollaboratorsPerPerson'),
    publicChannelRatio: wMean(days, 'messaging.publicChannelRatio'),
    dmRatio: wMean(days, 'messaging.dmRatio'),
    threadParticipationRate: wMean(days, 'messaging.threadParticipationRate'),
    reciprocityRatio: wMean(days, 'messaging.reciprocityRatio'),

    // ── Email ─────────────────────────────────────────────────────────────────
    afterHoursEmailRatio: wMean(days, 'email.afterHoursEmailRatio'),
    medianReplyMinutes: medianOfMedians(days, 'email.medianReplyMinutes'),

    // ── After-hours composite (all sources) for Recovery Debt ─────────────────
    afterHoursActivityRatio: derivedAfterHoursActivityRatio(days),

    // ── Workload Volatility inputs (week-over-week) ───────────────────────────
    weekOverWeekMeetingLoadChange: weekOverWeekChange(
      days,
      prevDays,
      'calendar.meetingHoursPerPerson'
    ),
    weekOverWeekMessageVolumeChange: weekOverWeekChange(
      days,
      prevDays,
      'messaging.messagesSentPerPerson'
    ),
    weekOverWeekAfterHoursChange: weekOverWeekChange(
      days,
      prevDays,
      'calendar.afterHoursMeetingMinutes'
    ),
    newRecurringMeetingsCount: estimateNewRecurringMeetings(days, prevDays),
    activitySpikeDays: countActivitySpikeDays(days),

    // Integration coverage — majority vote across the week
    integrationCoverage: {
      hasCalendar: majorityTrue(days, 'integrationCoverage.hasCalendar'),
      hasMessaging: majorityTrue(days, 'integrationCoverage.hasMessaging'),
      hasEmail: majorityTrue(days, 'integrationCoverage.hasEmail'),
      hasOrgStructure: majorityTrue(days, 'integrationCoverage.hasOrgStructure'),
    },
  };
}

// ── Derived Metric Helpers ─────────────────────────────────────────────────────

/**
 * Composite after-hours activity ratio across all sources (messages + emails + meetings).
 * Approximates spec Section 7.2:
 *   after_hours_events / total_events
 */
function derivedAfterHoursActivityRatio(days) {
  if (days.length === 0) return 0;
  const ratios = days.map((d) => {
    const msgRatio = d.messaging?.afterHoursMessageRatio ?? 0;
    const emailRatio = d.email?.afterHoursEmailRatio ?? 0;
    const meetRatio =
      d.calendar?.afterHoursMeetingMinutes > 0
        ? d.calendar.afterHoursMeetingMinutes / Math.max(d.calendar.meetingHoursTotal * 60, 1)
        : 0;
    // Simple average of the three source ratios (equal weight)
    return (msgRatio + emailRatio + meetRatio) / 3;
  });
  return round4(median(ratios));
}

function derivedAfterHoursMeetingRatio(days) {
  if (days.length === 0) return 0;
  const values = days.map((d) => {
    const totalMins = (d.calendar?.meetingHoursTotal ?? 0) * 60;
    const ahMins = d.calendar?.afterHoursMeetingMinutes ?? 0;
    return totalMins > 0 ? ahMins / totalMins : 0;
  });
  return round4(mean(values.filter((v) => v > 0)));
}

// ── Week-over-week Change ──────────────────────────────────────────────────────

/**
 * Fractional change in a metric from the prior week to this week.
 * Returns 0 if no prior data.
 */
function weekOverWeekChange(days, prevDays, field) {
  const current = wMean(days, field);
  const previous = wMean(prevDays, field);
  if (previous === 0 || previous === null) return 0;
  return round4((current - previous) / previous);
}

/**
 * Estimate new recurring meetings by comparing recurring counts between weeks.
 * A simple proxy: increase in total recurring_meeting_ratio * meeting count.
 */
function estimateNewRecurringMeetings(days, prevDays) {
  const currRatio = wMean(days, 'calendar.recurringMeetingRatio');
  const prevRatio = wMean(prevDays, 'calendar.recurringMeetingRatio');
  const delta = currRatio - prevRatio;
  // If ratio rose by more than 0.05, flag estimated new recurring meetings
  return delta > 0.05 ? Math.round(delta * 10) : 0;
}

/**
 * Count days where total team activity (messages + meeting hours) was > 1.5×
 * the week's own median — a spike day.
 */
function countActivitySpikeDays(days) {
  if (days.length === 0) return 0;
  const activityValues = days.map(
    (d) => (d.messaging?.messagesSentTotal ?? 0) + (d.calendar?.meetingHoursTotal ?? 0) * 60
  );
  const med = median(activityValues);
  if (med === 0) return 0;
  return activityValues.filter((v) => v > med * 1.5).length;
}

// ── Aggregation Primitives ─────────────────────────────────────────────────────

/**
 * Weighted mean of a field across days, weighted by activePeopleCount.
 */
function wMean(days, field) {
  return round4(weightedMean(days, field, 'activePeopleCount'));
}

function weightedMean(docs, field, weightField) {
  const validDocs = docs.filter((d) => {
    const v = getField(d, field);
    return v !== null && v !== undefined;
  });
  if (validDocs.length === 0) return 0;

  if (!weightField) {
    return mean(validDocs.map((d) => getField(d, field)));
  }

  let weightedSum = 0;
  let totalWeight = 0;
  for (const d of validDocs) {
    const v = getField(d, field);
    const w = getField(d, weightField) || 1;
    weightedSum += v * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function sumField(days, field) {
  return days.reduce((s, d) => s + (getField(d, field) ?? 0), 0);
}

function perPerson(days, countField) {
  const total = sumField(days, countField);
  const people = Math.max(1, Math.round(weightedMean(days, 'activePeopleCount', null)));
  return round4(total / people);
}

/**
 * Median-of-medians: used for latency fields where we stored the daily median.
 * More robust than mean for latency aggregation.
 */
function medianOfMedians(days, field) {
  const values = days
    .map((d) => getField(d, field))
    .filter((v) => v !== null && v !== undefined && typeof v === 'number');
  if (values.length === 0) return null;
  return round4(median(values));
}

function majorityTrue(days, field) {
  if (days.length === 0) return false;
  const trueCount = days.filter((d) => getField(d, field) === true).length;
  return trueCount > days.length / 2;
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function getField(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round4(v) {
  return Math.round(v * 10000) / 10000;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}
