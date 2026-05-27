/**
 * Engagement Pattern Detection Service
 *
 * Detects 6 named behavioural patterns from spec Section 13.
 * Each detector takes:
 *   - subscores    — output of engagementSubscoreService.calculateSubscores()
 *   - metricRisks  — raw per-metric risk objects { score, z } from the same call
 *   - weekly       — WeeklyMetrics from engagementWeeklyMetricsService
 *
 * Each detected pattern returns:
 *   {
 *     patternType:     string   — machine key
 *     title:           string   — human-readable name
 *     severity:        'low'|'medium'|'high'
 *     evidence:        string[] — bullet observations (metric-level, no individual IDs)
 *     interpretation:  string   — one-sentence behavioural explanation
 *   }
 *
 * Patterns are only returned when their detection thresholds are met.
 * An empty array means no patterns detected this week.
 *
 * PRIVACY: No individual-level data ever appears in pattern output.
 *          All evidence is team-aggregate only.
 */

// ── Score thresholds ────────────────────────────────────────────────────────────

const HIGH = 70;
const MEDIUM = 55;
const WATCH = 45;

// ── Public API ──────────────────────────────────────────────────────────────────

/**
 * Detect all active patterns for this team-week.
 *
 * @param {Object} subscores    — { recoveryDebt, focusErosion, ... }
 * @param {Object} metricRisks  — { afterHoursActivityRatio: { score, z }, ... }
 * @param {Object} weekly       — WeeklyMetrics aggregate object
 * @returns {Array}             — array of pattern objects (may be empty)
 */
export function detectPatterns(subscores, metricRisks, weekly) {
  const detectors = [
    detectHiddenStrain,
    detectQuietWithdrawal,
    detectManagerBottleneck,
    detectCoordinationTax,
    detectAsyncBreakdown,
    detectEngagementTheatre,
  ];

  const patterns = [];
  for (const detect of detectors) {
    const result = detect(subscores, metricRisks, weekly);
    if (result) patterns.push(result);
  }

  // Sort by severity: high → medium → low
  const SEV_ORDER = { high: 0, medium: 1, low: 2 };
  patterns.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);

  return patterns;
}

// ── Pattern 1: Hidden Strain ────────────────────────────────────────────────────
//
// High recovery debt + high responsiveness pressure, but low coordination friction.
// Team is working hard and always-on, yet meetings look normal — strain is invisible
// to managers because it doesn't show up in meeting overload signals.

function detectHiddenStrain(subscores, metricRisks, weekly) {
  const { recoveryDebt, responsivenessPressure, coordinationFriction } = subscores;

  const afterHoursElevated =
    metricRisks.afterHoursActivityRatio.score >= HIGH ||
    metricRisks.afterHoursMessageRatio.score >= HIGH;

  const meetingLoadNormal = coordinationFriction < WATCH;

  if (recoveryDebt >= HIGH && responsivenessPressure >= MEDIUM && meetingLoadNormal) {
    const evidence = [];

    if (metricRisks.afterHoursActivityRatio.score >= HIGH)
      evidence.push(
        `After-hours activity ratio is elevated (risk score: ${metricRisks.afterHoursActivityRatio.score})`
      );
    if (metricRisks.afterHoursMessageRatio.score >= HIGH)
      evidence.push(
        `After-hours messaging ratio is elevated (risk score: ${metricRisks.afterHoursMessageRatio.score})`
      );
    if (metricRisks.p90ResponseMinutes.score >= MEDIUM)
      evidence.push(
        `P90 response time is elevated, indicating async pressure (risk score: ${metricRisks.p90ResponseMinutes.score})`
      );
    if (coordinationFriction < WATCH)
      evidence.push(`Meeting load appears normal — strain is not visible in calendar data`);

    return {
      patternType: 'hidden_strain',
      title: 'Hidden Strain',
      severity: recoveryDebt >= 80 ? 'high' : 'medium',
      evidence,
      interpretation:
        'The team is showing recovery and responsiveness strain that is invisible in meeting data — work pressure is arriving through async channels rather than calendar overload.',
    };
  }

  return null;
}

// ── Pattern 2: Quiet Withdrawal ────────────────────────────────────────────────
//
// Collaboration withdrawal score is high, but overall strain score is moderate.
// Team members are pulling back from cross-team interaction and public channels
// without showing overt distress signals. Classic early disengagement signature.

function detectQuietWithdrawal(subscores, metricRisks, weekly) {
  const { collaborationWithdrawal, recoveryDebt, responsivenessPressure } = subscores;

  const overallStrain = (recoveryDebt + responsivenessPressure) / 2;
  const quietSignal = collaborationWithdrawal >= HIGH && overallStrain < MEDIUM + 10;

  if (quietSignal || collaborationWithdrawal >= HIGH + 10) {
    const evidence = [];

    if (metricRisks.uniqueCollaboratorsPerPerson.score >= MEDIUM)
      evidence.push(
        `Unique collaborator count per person is declining (risk score: ${metricRisks.uniqueCollaboratorsPerPerson.score})`
      );
    if (metricRisks.publicChannelRatio.score >= MEDIUM)
      evidence.push(
        `Public channel participation ratio is dropping (risk score: ${metricRisks.publicChannelRatio.score})`
      );
    if (metricRisks.reciprocityRatio.score >= MEDIUM)
      evidence.push(
        `Reciprocity ratio (two-way interactions) is falling (risk score: ${metricRisks.reciprocityRatio.score})`
      );
    if (metricRisks.threadParticipationRate.score >= MEDIUM)
      evidence.push(
        `Thread participation rate is declining (risk score: ${metricRisks.threadParticipationRate.score})`
      );

    const severity =
      collaborationWithdrawal >= 80 ? 'high' : collaborationWithdrawal >= HIGH ? 'medium' : 'low';

    return {
      patternType: 'quiet_withdrawal',
      title: 'Quiet Withdrawal',
      severity,
      evidence,
      interpretation:
        'The team is reducing voluntary collaboration — fewer cross-team interactions, less public channel activity, and declining reciprocity — without obvious strain triggers. This is an early disengagement signal.',
    };
  }

  return null;
}

// ── Pattern 3: Manager Bottleneck ──────────────────────────────────────────────
//
// Manager support gap is high AND coordination friction is high.
// Manager is meeting-heavy (high load) but 1:1 quality/frequency is low.
// Classic sign: manager time consumed by coordination instead of people development.

function detectManagerBottleneck(subscores, metricRisks, weekly) {
  const { managerSupportGap, coordinationFriction } = subscores;

  if (managerSupportGap >= HIGH && coordinationFriction >= MEDIUM) {
    const evidence = [];

    if (metricRisks.manager1to1MinutesPerPerson.score >= MEDIUM)
      evidence.push(
        `Manager 1:1 time per person is below team baseline (risk score: ${metricRisks.manager1to1MinutesPerPerson.score})`
      );
    if (metricRisks.cancelled1to1Count.score >= MEDIUM)
      evidence.push(
        `1:1 cancellation rate is elevated (risk score: ${metricRisks.cancelled1to1Count.score})`
      );
    if (metricRisks.managerMeetingLoad.score >= MEDIUM)
      evidence.push(
        `Manager meeting load is high — calendar time available for 1:1s is compressed (risk score: ${metricRisks.managerMeetingLoad.score})`
      );
    if (metricRisks.managerResponseLatency.score >= MEDIUM)
      evidence.push(
        `Manager async response latency is elevated (risk score: ${metricRisks.managerResponseLatency.score})`
      );

    const severity = managerSupportGap >= 80 && coordinationFriction >= HIGH ? 'high' : 'medium';

    return {
      patternType: 'manager_bottleneck',
      title: 'Manager Bottleneck',
      severity,
      evidence,
      interpretation:
        'The manager appears to be a coordination bottleneck — heavy meeting load is crowding out 1:1 time and reducing async responsiveness. Team support quality is declining as a side-effect of coordination demands.',
    };
  }

  return null;
}

// ── Pattern 4: Coordination Tax ────────────────────────────────────────────────
//
// Coordination friction is very high. High attendee counts, recurring meeting bloat,
// and meeting load is eating focus time. The team spends more time in meetings
// than doing the actual work those meetings are coordinating.

function detectCoordinationTax(subscores, metricRisks, weekly) {
  const { coordinationFriction, focusErosion } = subscores;

  if (coordinationFriction >= HIGH && focusErosion >= MEDIUM) {
    const evidence = [];

    if (metricRisks.attendeeHoursPerPerson.score >= HIGH)
      evidence.push(
        `Attendee-hours per person is significantly above baseline (risk score: ${metricRisks.attendeeHoursPerPerson.score})`
      );
    if (metricRisks.avgAttendeeCount.score >= MEDIUM)
      evidence.push(
        `Average meeting attendee count is elevated (risk score: ${metricRisks.avgAttendeeCount.score})`
      );
    if (metricRisks.recurringMeetingRatio.score >= MEDIUM)
      evidence.push(
        `Recurring meeting ratio is high — meeting debt is accumulating (risk score: ${metricRisks.recurringMeetingRatio.score})`
      );
    if (metricRisks.focusHoursAvailablePerPerson.score >= MEDIUM)
      evidence.push(
        `Available focus hours per person are shrinking due to meeting density (risk score: ${metricRisks.focusHoursAvailablePerPerson.score})`
      );
    if (metricRisks.fragmentedDayRatio.score >= MEDIUM)
      evidence.push(
        `Fragmented day ratio is high — meetings are breaking up contiguous work time (risk score: ${metricRisks.fragmentedDayRatio.score})`
      );

    const severity = coordinationFriction >= 80 ? 'high' : 'medium';

    return {
      patternType: 'coordination_tax',
      title: 'Coordination Tax',
      severity,
      evidence,
      interpretation:
        "Meeting overhead is consuming a disproportionate share of the team's working time. High attendee counts and recurring meeting bloat are taxing focus and reducing the hours available for deep work.",
    };
  }

  return null;
}

// ── Pattern 5: Async Breakdown ─────────────────────────────────────────────────
//
// Responsiveness pressure is high AND collaboration withdrawal is elevated.
// People are both over-pressured to respond AND pulling back from collaboration.
// Indicates communication system is breaking down — high volume + low reciprocity.

function detectAsyncBreakdown(subscores, metricRisks, weekly) {
  const { responsivenessPressure, collaborationWithdrawal } = subscores;

  if (responsivenessPressure >= HIGH && collaborationWithdrawal >= MEDIUM) {
    const evidence = [];

    if (metricRisks.p90ResponseMinutes.score >= HIGH)
      evidence.push(
        `P90 response latency is significantly elevated (risk score: ${metricRisks.p90ResponseMinutes.score})`
      );
    if (metricRisks.afterHoursResponseRatio.score >= HIGH)
      evidence.push(
        `After-hours response ratio is elevated — team is responding outside work hours (risk score: ${metricRisks.afterHoursResponseRatio.score})`
      );
    if (metricRisks.reciprocityRatio.score >= MEDIUM)
      evidence.push(
        `Reciprocity ratio is falling — conversations are becoming one-directional (risk score: ${metricRisks.reciprocityRatio.score})`
      );
    if (metricRisks.messagesSentPerPerson.score >= MEDIUM)
      evidence.push(
        `Message volume per person is outside baseline range (risk score: ${metricRisks.messagesSentPerPerson.score})`
      );

    const severity =
      responsivenessPressure >= 80 && collaborationWithdrawal >= HIGH ? 'high' : 'medium';

    return {
      patternType: 'async_breakdown',
      title: 'Async Breakdown',
      severity,
      evidence,
      interpretation:
        "Async communication is under strain — high response pressure is combining with reduced collaborative reciprocity, signalling that the team's messaging system is generating more demand than it's resolving.",
    };
  }

  return null;
}

// ── Pattern 6: Engagement Theatre ─────────────────────────────────────────────
//
// High meeting volume and high messaging volume, but reciprocity ratio and
// thread participation are low. The team looks "busy" in raw signal counts
// but genuine collaborative exchange is absent. Activity without engagement.

function detectEngagementTheatre(subscores, metricRisks, weekly) {
  const { coordinationFriction, responsivenessPressure, collaborationWithdrawal } = subscores;

  const highActivity = coordinationFriction >= MEDIUM && responsivenessPressure >= MEDIUM;
  const lowReciprocity = metricRisks.reciprocityRatio.score >= HIGH;
  const lowThreading = metricRisks.threadParticipationRate.score >= HIGH;

  if (highActivity && (lowReciprocity || lowThreading)) {
    const evidence = [];

    if (metricRisks.meetingHoursPerPerson.score >= MEDIUM)
      evidence.push(
        `Meeting hours per person are elevated (risk score: ${metricRisks.meetingHoursPerPerson.score})`
      );
    if (metricRisks.messagesSentPerPerson.score >= MEDIUM)
      evidence.push(
        `Message volume per person is elevated (risk score: ${metricRisks.messagesSentPerPerson.score})`
      );
    if (lowReciprocity)
      evidence.push(
        `Reciprocity ratio is low — communication is not generating two-way exchange (risk score: ${metricRisks.reciprocityRatio.score})`
      );
    if (lowThreading)
      evidence.push(
        `Thread participation rate is low — conversations are not prompting engagement (risk score: ${metricRisks.threadParticipationRate.score})`
      );
    if (metricRisks.publicChannelRatio.score >= MEDIUM)
      evidence.push(
        `Public channel ratio is declining despite high message volume (risk score: ${metricRisks.publicChannelRatio.score})`
      );

    const severity = lowReciprocity && lowThreading ? 'high' : 'medium';

    return {
      patternType: 'engagement_theatre',
      title: 'Engagement Theatre',
      severity,
      evidence,
      interpretation:
        'The team is generating high activity signals — meetings and messages — but genuine engagement indicators (reciprocity, thread participation) are low. Busyness is substituting for real collaborative exchange.',
    };
  }

  return null;
}
