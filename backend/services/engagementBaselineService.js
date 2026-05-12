/**
 * Engagement Baseline Service
 *
 * Builds and updates EngagementBaseline records from EngagementTeamDaily history.
 * Uses median + MAD (not mean + stdDev) per spec Section 8.
 *
 * Key formulas:
 *   MAD = median( abs(value - median(values)) )
 *   scaled_MAD = MAD * 1.4826           (makes it Gaussian-equivalent)
 *   robust_z = (current - median) / max(scaled_MAD, epsilon)
 *
 * Baseline quality scoring (0–100):
 *   - Active days coverage (out of 20 required minimum in 42 days): 50 pts
 *   - Active people count (>= 8 required): 30 pts
 *   - Integration completeness (calendar + messaging): 20 pts
 *
 * The baseline is recomputed weekly (every Monday, configured in scheduler).
 */

import EngagementTeamDaily from '../models/engagementTeamDaily.js';
import EngagementBaseline from '../models/engagementBaseline.js';
import Team from '../models/team.js';

const BASELINE_WINDOW_DAYS = 42;
const MIN_ACTIVE_WORKDAYS = 20;
const MIN_ACTIVE_PEOPLE = 8;
const EPSILON = 0.001; // prevent division by zero in robust-z

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Compute or update the EngagementBaseline for a specific team.
 * Uses the 42 calendar days ending the day before `asOfDate`.
 *
 * @param {string|ObjectId} orgId
 * @param {string|ObjectId} teamId
 * @param {Date} asOfDate  — baseline is computed for the window ending here
 * @returns {Object}       — the saved EngagementBaseline document
 */
export async function computeAndSaveBaseline(orgId, teamId, asOfDate = new Date()) {
  const endDate = toDateStr(addDays(asOfDate, -1));      // yesterday
  const startDate = toDateStr(addDays(asOfDate, -BASELINE_WINDOW_DAYS));

  // Fetch all EngagementTeamDaily records in the baseline window
  const dailyDocs = await EngagementTeamDaily.find({
    teamId,
    date: { $gte: startDate, $lte: endDate },
  })
    .sort({ date: 1 })
    .lean();

  // Active workdays = days with activePeopleCount >= MIN_ACTIVE_PEOPLE
  const activeDocs = dailyDocs.filter((d) => d.activePeopleCount >= MIN_ACTIVE_PEOPLE);
  const activeDays = activeDocs.length;

  // Not enough data — save an invalid baseline marker and return
  if (activeDays < MIN_ACTIVE_WORKDAYS) {
    const doc = await EngagementBaseline.findOneAndUpdate(
      { orgId, teamId },
      {
        $set: {
          orgId,
          teamId,
          baselinePeriodDays: BASELINE_WINDOW_DAYS,
          baselineStart: startDate,
          baselineEnd: endDate,
          isValid: false,
          baselineQuality: {
            activeDays,
            activePeopleMedian: median(activeDocs.map((d) => d.activePeopleCount)),
            qualityScore: 0,
          },
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );
    console.info(
      `[EngagementBaseline] Team ${teamId}: baseline invalid — ` +
        `only ${activeDays} active days (need ${MIN_ACTIVE_WORKDAYS})`
    );
    return doc;
  }

  // ── Compute per-metric baseline statistics ─────────────────────────────────
  const metrics = computeAllMetricBaselines(activeDocs);

  // ── Baseline quality score ─────────────────────────────────────────────────
  const activePeopleValues = activeDocs.map((d) => d.activePeopleCount);
  const activePeopleMedian = median(activePeopleValues);

  const qualityScore = computeQualityScore(activeDays, activePeopleMedian, activeDocs);

  // ── Upsert ────────────────────────────────────────────────────────────────
  const doc = await EngagementBaseline.findOneAndUpdate(
    { orgId, teamId },
    {
      $set: {
        orgId,
        teamId,
        baselinePeriodDays: BASELINE_WINDOW_DAYS,
        baselineStart: startDate,
        baselineEnd: endDate,
        metrics,
        baselineQuality: {
          activeDays,
          activePeopleMedian,
          qualityScore,
        },
        isValid: true,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  console.info(
    `[EngagementBaseline] Team ${teamId}: baseline updated ` +
      `(activeDays=${activeDays}, qualityScore=${qualityScore})`
  );
  return doc;
}

/**
 * Update baselines for all teams in an org.
 * Called every Monday by the weekly job scheduler.
 */
export async function computeBaselinesForOrg(orgId, asOfDate = new Date()) {
  const teams = await Team.find({ orgId }).lean();
  const results = [];

  for (const team of teams) {
    try {
      const result = await computeAndSaveBaseline(orgId, team._id, asOfDate);
      results.push(result);
    } catch (err) {
      console.error(
        `[EngagementBaseline] Error for team ${team._id}:`,
        err.message
      );
    }
  }

  return results;
}

/**
 * Compute a robust z-score for a single metric value against its baseline.
 *
 * @param {number} currentValue
 * @param {Object} metricBaseline  — { median, scaledMad }
 * @returns {number}               — robust z-score (positive = worse for risk)
 */
export function robustZ(currentValue, metricBaseline) {
  if (!metricBaseline || metricBaseline.median === null) return 0;
  const denom = Math.max(metricBaseline.scaledMad ?? EPSILON, EPSILON);
  return (currentValue - metricBaseline.median) / denom;
}

/**
 * Convert a robust z-score to a 0–100 risk score (spec Section 9).
 *
 * score = clamp(50 + z * 12.5, 0, 100)
 *
 * Interpretation:
 *   0–29   healthy
 *   30–49  watch
 *   50–69  strain
 *   70–100 critical
 */
export function zToRiskScore(z) {
  return Math.max(0, Math.min(100, Math.round(50 + z * 12.5)));
}

// ── Metric Baseline Computation ────────────────────────────────────────────────

/**
 * Compute median + MAD + scaled_MAD for every spec metric across the active days.
 */
function computeAllMetricBaselines(activeDocs) {
  const extract = (field) =>
    activeDocs
      .map((d) => getNestedField(d, field))
      .filter((v) => v !== null && v !== undefined && typeof v === 'number');

  return {
    // Calendar
    meetingHoursPerPerson:        buildMetricBaseline(extract('calendar.meetingHoursPerPerson')),
    attendeeHoursPerPerson:       buildMetricBaseline(extract('calendar.attendeeHoursPerPerson')),
    recurringMeetingRatio:        buildMetricBaseline(extract('calendar.recurringMeetingRatio')),
    avgAttendeeCount:             buildMetricBaseline(extract('calendar.avgAttendeeCount')),
    backToBackMeetingCount:       buildMetricBaseline(extract('calendar.backToBackMeetingCount')),
    fragmentedDayRatio:           buildMetricBaseline(extract('calendar.fragmentedDayRatio')),
    focusHoursAvailablePerPerson: buildMetricBaseline(extract('calendar.focusHoursAvailablePerPerson')),
    focusBlocks90mCount:          buildMetricBaseline(extract('calendar.focusBlocks90mCount')),
    manager1to1MinutesPerPerson:  buildMetricBaseline(extract('calendar.manager1to1MinutesPerPerson')),
    cancelled1to1Count:           buildMetricBaseline(extract('calendar.cancelled1to1Count')),
    afterHoursMeetingMinutes:     buildMetricBaseline(extract('calendar.afterHoursMeetingMinutes')),

    // Messaging
    messagesSentPerPerson:        buildMetricBaseline(extract('messaging.messagesSentPerPerson')),
    afterHoursMessageRatio:       buildMetricBaseline(extract('messaging.afterHoursMessageRatio')),
    medianResponseMinutes:        buildMetricBaseline(
      activeDocs.map((d) => d.messaging?.medianResponseMinutes).filter((v) => v !== null)
    ),
    p90ResponseMinutes:           buildMetricBaseline(
      activeDocs.map((d) => d.messaging?.p90ResponseMinutes).filter((v) => v !== null)
    ),
    uniqueCollaboratorsPerPerson: buildMetricBaseline(extract('messaging.uniqueCollaboratorsPerPerson')),
    publicChannelRatio:           buildMetricBaseline(extract('messaging.publicChannelRatio')),
    dmRatio:                      buildMetricBaseline(extract('messaging.dmRatio')),
    threadParticipationRate:      buildMetricBaseline(extract('messaging.threadParticipationRate')),
    reciprocityRatio:             buildMetricBaseline(
      activeDocs.map((d) => d.messaging?.reciprocityRatio).filter((v) => v !== null)
    ),

    // Email
    afterHoursEmailRatio:         buildMetricBaseline(extract('email.afterHoursEmailRatio')),
    medianReplyMinutes:           buildMetricBaseline(
      activeDocs.map((d) => d.email?.medianReplyMinutes).filter((v) => v !== null)
    ),
  };
}

/**
 * Build the { median, mad, scaledMad, sampleSize } object for one metric.
 */
function buildMetricBaseline(values) {
  if (!values || values.length === 0) {
    return { median: null, mad: null, scaledMad: null, sampleSize: 0 };
  }

  const med = median(values);
  const deviations = values.map((v) => Math.abs(v - med));
  const madValue = median(deviations);
  const scaledMad = madValue * 1.4826;

  return {
    median: round4(med),
    mad: round4(madValue),
    // If MAD is zero, fall back to the standard deviation as a last resort.
    // If that is also zero, scaledMad stays at 0 (robust_z will be 0 unless value changes).
    scaledMad: scaledMad > 0 ? round4(scaledMad) : round4(stdDev(values)),
    sampleSize: values.length,
  };
}

// ── Baseline Quality Score ─────────────────────────────────────────────────────

/**
 * 0–100 quality score based on:
 *   50 pts — active days coverage (scaled to minimum of 20)
 *   30 pts — active people count (scaled, min 8 = 60pts, 12 = 80pts, 20+ = 100pts)
 *   20 pts — integration completeness
 */
function computeQualityScore(activeDays, activePeopleMedian, activeDocs) {
  // Days coverage: 50 pts at full, scaled linearly from 20 to 42 days
  const daysCoverage = Math.min(1, activeDays / BASELINE_WINDOW_DAYS);
  const daysScore = Math.round(50 * daysCoverage);

  // People score
  let peopleScore = 0;
  if (activePeopleMedian >= 20) peopleScore = 30;
  else if (activePeopleMedian >= 12) peopleScore = 24;
  else if (activePeopleMedian >= 8) peopleScore = 18;

  // Integration coverage: check what was present in the majority of days
  const calendarDays = activeDocs.filter((d) => d.integrationCoverage?.hasCalendar).length;
  const messagingDays = activeDocs.filter((d) => d.integrationCoverage?.hasMessaging).length;
  const emailDays = activeDocs.filter((d) => d.integrationCoverage?.hasEmail).length;

  const calendarCoverage = calendarDays / activeDocs.length;
  const messagingCoverage = messagingDays / activeDocs.length;
  const emailCoverage = emailDays / activeDocs.length;

  let integrationScore = 0;
  if (calendarCoverage > 0.5) integrationScore += 8;
  if (messagingCoverage > 0.5) integrationScore += 8;
  if (emailCoverage > 0.5) integrationScore += 4;

  return Math.min(100, daysScore + peopleScore + integrationScore);
}

// ── Math Utilities ─────────────────────────────────────────────────────────────

function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(arr) {
  if (!arr || arr.length < 2) return 0;
  const m = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function round4(v) {
  return Math.round(v * 10000) / 10000;
}

function toDateStr(date) {
  return new Date(date).toISOString().split('T')[0];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Safely access a nested field like 'calendar.meetingHoursPerPerson' from an object.
 */
function getNestedField(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
