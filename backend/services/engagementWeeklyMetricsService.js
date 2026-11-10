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

  const calendarDays = days.filter((d) => d.integrationCoverage?.hasCalendar === true);
  const messagingDays = days.filter((d) => d.integrationCoverage?.hasMessaging === true);
  const emailDays = days.filter((d) => d.integrationCoverage?.hasEmail === true);
  const prevCalendarDays = prevDays.filter((d) => d.integrationCoverage?.hasCalendar === true);
  const prevMessagingDays = prevDays.filter((d) => d.integrationCoverage?.hasMessaging === true);
  const activePeopleCount = Math.round(weightedMean(days, 'activePeopleCount', null));

  return {
    weekStart,
    weekEnd,
    activePeopleCount,

    // ── Calendar ──────────────────────────────────────────────────────────────
    meetingHoursPerPerson: sourceMean(calendarDays, 'calendar.meetingHoursPerPerson'),
    attendeeHoursPerPerson: sourceMean(calendarDays, 'calendar.attendeeHoursPerPerson'),
    recurringMeetingRatio: sourceMean(calendarDays, 'calendar.recurringMeetingRatio'),
    avgAttendeeCount: sourceMean(calendarDays, 'calendar.avgAttendeeCount'),
    backToBackMeetingCount: sourceSum(calendarDays, 'calendar.backToBackMeetingCount'),
    fragmentedDayRatio: sourceMean(calendarDays, 'calendar.fragmentedDayRatio'),
    focusHoursAvailablePerPerson: sourceMean(calendarDays, 'calendar.focusHoursAvailablePerPerson'),
    focusBlocks90mCountPerPerson: perPersonOrNull(calendarDays, 'calendar.focusBlocks90mCount'),
    manager1to1MinutesPerPerson: sourceMean(calendarDays, 'calendar.manager1to1MinutesPerPerson'),
    cancelled1to1Count: sourceSum(calendarDays, 'calendar.cancelled1to1Count'),
    afterHoursMeetingMinutes: sourceSum(calendarDays, 'calendar.afterHoursMeetingMinutes'),

    // Derived: after_hours_meeting_ratio (for Recovery Debt)
    afterHoursMeetingRatio: derivedAfterHoursMeetingRatio(days),

    // ── Messaging ─────────────────────────────────────────────────────────────
    messagesSentPerPerson: sourceMean(messagingDays, 'messaging.messagesSentPerPerson'),
    afterHoursMessageRatio: sourceMean(messagingDays, 'messaging.afterHoursMessageRatio'),
    medianResponseMinutes: medianOfMedians(messagingDays, 'messaging.medianResponseMinutes'),
    p90ResponseMinutes: medianOfMedians(messagingDays, 'messaging.p90ResponseMinutes'),
    uniqueCollaboratorsPerPerson: sourceMean(messagingDays, 'messaging.uniqueCollaboratorsPerPerson'),
    publicChannelRatio: sourceMean(messagingDays, 'messaging.publicChannelRatio'),
    dmRatio: sourceMean(messagingDays, 'messaging.dmRatio'),
    threadParticipationRate: sourceMean(messagingDays, 'messaging.threadParticipationRate'),
    reciprocityRatio: sourceMean(messagingDays, 'messaging.reciprocityRatio'),

    // ── Email ─────────────────────────────────────────────────────────────────
    afterHoursEmailRatio: sourceMean(emailDays, 'email.afterHoursEmailRatio'),
    medianReplyMinutes: medianOfMedians(emailDays, 'email.medianReplyMinutes'),

    // ── After-hours composite (all sources) for Recovery Debt ─────────────────
    afterHoursActivityRatio: derivedAfterHoursActivityRatio(days),

    // ── Workload Volatility inputs (week-over-week) ───────────────────────────
    weekOverWeekMeetingLoadChange: weekOverWeekChange(
      calendarDays,
      prevCalendarDays,
      'calendar.meetingHoursPerPerson'
    ),
    weekOverWeekMessageVolumeChange: weekOverWeekChange(
      messagingDays,
      prevMessagingDays,
      'messaging.messagesSentPerPerson'
    ),
    weekOverWeekAfterHoursChange: weekOverWeekChange(
      calendarDays,
      prevCalendarDays,
      'calendar.afterHoursMeetingMinutes'
    ),
    newRecurringMeetingsCount: estimateNewRecurringMeetings(calendarDays, prevCalendarDays),
    activitySpikeDays: countActivitySpikeDays(days.filter((day) => day.integrationCoverage?.hasCalendar || day.integrationCoverage?.hasMessaging)),

    // Evidence provenance for HR and engineering checks. Missing source days
    // remain unavailable, never a synthetic zero-activity measurement.
    measurementEvidence: {
      dailySnapshots: days.length,
      calendarObservedDays: calendarDays.length,
      messagingObservedDays: messagingDays.length,
      emailObservedDays: emailDays.length,
      calendarEventCount: sourceSum(calendarDays, 'measurementEvidence.calendarEventCount') ?? 0,
      messagingEventCount: sourceSum(messagingDays, 'measurementEvidence.messagingEventCount') ?? 0,
      emailEventCount: sourceSum(emailDays, 'measurementEvidence.emailEventCount') ?? 0,
      excludedUnmappedOrInactiveEvents: sumField(days, 'measurementEvidence.excludedUnmappedOrInactiveEvents'),
    },
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
  let observed = 0;
  let afterHours = 0;
  for (const day of days) {
    const cal = day.integrationCoverage?.hasCalendar && Number.isFinite(day.calendar?.meetingCount);
    const msg = day.integrationCoverage?.hasMessaging && Number.isFinite(day.messaging?.messagesSentTotal);
    const email = day.integrationCoverage?.hasEmail && Number.isFinite(day.email?.emailsSentTotal);
    if (cal) {
      observed += day.calendar.meetingCount;
      afterHours += Math.max(0, Number(day.calendar.afterHoursMeetingCount) || 0);
    }
    if (msg) {
      const count = day.messaging.messagesSentTotal;
      observed += count;
      afterHours += count * (day.messaging.afterHoursMessageRatio || 0);
    }
    if (email) {
      const count = day.email.emailsSentTotal;
      observed += count;
      afterHours += count * (day.email.afterHoursEmailRatio || 0);
    }
  }
  return observed > 0 ? round4(afterHours / observed) : null;
}

function derivedAfterHoursMeetingRatio(days) {
  let minutes = 0;
  let afterHours = 0;
  for (const day of days) {
    if (!day.integrationCoverage?.hasCalendar) continue;
    const total = Number(day.calendar?.meetingHoursTotal || 0) * 60;
    if (total <= 0) continue;
    minutes += total;
    afterHours += Number(day.calendar?.afterHoursMeetingMinutes || 0);
  }
  return minutes > 0 ? round4(afterHours / minutes) : null;
}

// ── Week-over-week Change ──────────────────────────────────────────────────────

/**
 * Fractional change in a metric from the prior week to this week.
 * Returns 0 if no prior data.
 */
function weekOverWeekChange(days, prevDays, field) {
  if (days.length === 0 || prevDays.length === 0) return null;
  const current = sourceMean(days, field);
  const previous = sourceMean(prevDays, field);
  if (current === null || previous === null || previous === 0) return null;
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
function sourceMean(observedDays, field) {
  return observedDays.length ? wMeanOrNull(observedDays, field) : null;
}

function sourceSum(observedDays, field) {
  return observedDays.length ? sumField(observedDays, field) : null;
}

function wMeanOrNull(days, field) {
  const observed = days.filter((item) => Number.isFinite(getField(item, field)));
  return observed.length ? wMean(observed, field) : null;
}

function perPersonOrNull(days, field) {
  const observed = days.filter((item) => Number.isFinite(getField(item, field)));
  return observed.length ? perPerson(observed, field) : null;
}

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
