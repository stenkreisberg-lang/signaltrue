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
 * @param {Object} metricRisks  — { afterHoursMessageRatio: { score, z }, ... }
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

function detectHiddenStrain(subscores, metricRisks, _weekly) {
  const { recoveryDebt, responsivenessPressure, coordinationFriction } = subscores;
  if (![recoveryDebt, responsivenessPressure, coordinationFriction].every(Number.isFinite)) {
    return null;
  }

  const meetingLoadNormal = coordinationFriction < WATCH;

  if (recoveryDebt >= HIGH && responsivenessPressure >= MEDIUM && meetingLoadNormal) {
    const evidence = [];

    if (metricRisks.afterHoursMessageRatio.score >= HIGH)
      evidence.push(
        `After-hours messaging ratio is above baseline (model score: ${metricRisks.afterHoursMessageRatio.score})`
      );
    if (metricRisks.afterHoursEmailRatio.score >= HIGH)
      evidence.push(
        `After-hours email ratio is above baseline (model score: ${metricRisks.afterHoursEmailRatio.score})`
      );
    if (metricRisks.p90ResponseMinutes.score >= MEDIUM)
      evidence.push(
        `P90 response time is above baseline (model score: ${metricRisks.p90ResponseMinutes.score})`
      );
    if (coordinationFriction < WATCH)
      evidence.push(`Meeting-load indicators remain within the internal review band`);

    return {
      patternType: 'hidden_strain',
      title: 'After-hours and response deviation',
      severity: recoveryDebt >= 80 ? 'high' : 'medium',
      evidence,
      interpretation:
        'After-hours and response metadata moved above baseline while meeting-load indicators did not. The data shows co-occurrence, not the cause or employee impact.',
    };
  }

  return null;
}

// ── Pattern 2: Quiet Withdrawal ────────────────────────────────────────────────
//
// Collaboration withdrawal score is high, but overall strain score is moderate.
// Team members are pulling back from cross-team interaction and public channels
// without showing overt distress signals. Classic early disengagement signature.

function detectQuietWithdrawal(subscores, metricRisks, _weekly) {
  const { collaborationWithdrawal, recoveryDebt, responsivenessPressure } = subscores;
  if (![collaborationWithdrawal, recoveryDebt, responsivenessPressure].every(Number.isFinite)) {
    return null;
  }

  const overallStrain = (recoveryDebt + responsivenessPressure) / 2;
  const quietSignal = collaborationWithdrawal >= HIGH && overallStrain < MEDIUM + 10;

  if (quietSignal || collaborationWithdrawal >= HIGH + 10) {
    const evidence = [];

    if (metricRisks.uniqueCollaboratorsPerPerson.score >= MEDIUM)
      evidence.push(
        `Unique collaborator count per person moved outside baseline (model score: ${metricRisks.uniqueCollaboratorsPerPerson.score})`
      );
    if (metricRisks.publicChannelRatio.score >= MEDIUM)
      evidence.push(
        `Public channel participation ratio moved below baseline (model score: ${metricRisks.publicChannelRatio.score})`
      );
    if (metricRisks.reciprocityRatio.score >= MEDIUM)
      evidence.push(
        `Reciprocity ratio moved below baseline (model score: ${metricRisks.reciprocityRatio.score})`
      );
    if (metricRisks.threadParticipationRate.score >= MEDIUM)
      evidence.push(
        `Thread participation rate moved below baseline (model score: ${metricRisks.threadParticipationRate.score})`
      );

    const severity =
      collaborationWithdrawal >= 80 ? 'high' : collaborationWithdrawal >= HIGH ? 'medium' : 'low';

    return {
      patternType: 'quiet_withdrawal',
      title: 'Collaboration metadata decline',
      severity,
      evidence,
      interpretation:
        'Several collaboration metadata measures moved below baseline. The pattern does not establish disengagement, intent, or cause; validate channel coverage and team context.',
    };
  }

  return null;
}

// ── Pattern 3: Manager Bottleneck ──────────────────────────────────────────────
//
// Manager support gap is high AND coordination friction is high.
// Manager is meeting-heavy (high load) but 1:1 quality/frequency is low.
// Classic sign: manager time consumed by coordination instead of people development.

function detectManagerBottleneck(subscores, metricRisks, _weekly) {
  const { managerSupportGap, coordinationFriction } = subscores;
  if (![managerSupportGap, coordinationFriction].every(Number.isFinite)) return null;

  if (managerSupportGap >= HIGH && coordinationFriction >= MEDIUM) {
    const evidence = [];

    if (metricRisks.manager1to1MinutesPerPerson.score >= MEDIUM)
      evidence.push(
        `Manager 1:1 time per person is below team baseline (model score: ${metricRisks.manager1to1MinutesPerPerson.score})`
      );
    const severity = managerSupportGap >= 80 && coordinationFriction >= HIGH ? 'high' : 'medium';

    return {
      patternType: 'manager_bottleneck',
      title: 'Recorded 1:1 and coordination deviation',
      severity,
      evidence,
      interpretation:
        'Recorded 1:1 time moved below baseline while team coordination measures moved above it. The metadata does not measure support quality or establish cause.',
    };
  }

  return null;
}

// ── Pattern 4: Coordination Tax ────────────────────────────────────────────────
//
// Coordination friction is very high. High attendee counts, recurring meeting bloat,
// and meeting load is eating focus time. The team spends more time in meetings
// than doing the actual work those meetings are coordinating.

function detectCoordinationTax(subscores, metricRisks, _weekly) {
  const { coordinationFriction, focusErosion } = subscores;
  if (![coordinationFriction, focusErosion].every(Number.isFinite)) return null;

  if (coordinationFriction >= HIGH && focusErosion >= MEDIUM) {
    const evidence = [];

    if (metricRisks.attendeeHoursPerPerson.score >= HIGH)
      evidence.push(
        `Attendee-hours per person is above baseline (model score: ${metricRisks.attendeeHoursPerPerson.score})`
      );
    if (metricRisks.avgAttendeeCount.score >= MEDIUM)
      evidence.push(
        `Average meeting attendee count is above baseline (model score: ${metricRisks.avgAttendeeCount.score})`
      );
    if (metricRisks.recurringMeetingRatio.score >= MEDIUM)
      evidence.push(
        `Recurring meeting ratio is above baseline (model score: ${metricRisks.recurringMeetingRatio.score})`
      );
    if (metricRisks.focusHoursAvailablePerPerson.score >= MEDIUM)
      evidence.push(
        `Available focus hours per person are below baseline alongside higher meeting density (model score: ${metricRisks.focusHoursAvailablePerPerson.score})`
      );
    if (metricRisks.fragmentedDayRatio.score >= MEDIUM)
      evidence.push(
        `Fragmented-day ratio is above baseline (model score: ${metricRisks.fragmentedDayRatio.score})`
      );

    const severity = coordinationFriction >= 80 ? 'high' : 'medium';

    return {
      patternType: 'coordination_tax',
      title: 'Coordination-load deviation',
      severity,
      evidence,
      interpretation:
        'Meeting and attendee measures are above baseline while measured focus availability is lower. Review the direct calendar values and local context before inferring cause.',
    };
  }

  return null;
}

// ── Pattern 5: Async Breakdown ─────────────────────────────────────────────────
//
// Responsiveness pressure is high AND collaboration withdrawal is elevated.
// People are both over-pressured to respond AND pulling back from collaboration.
// Indicates communication system is breaking down — high volume + low reciprocity.

function detectAsyncBreakdown(subscores, metricRisks, _weekly) {
  const { responsivenessPressure, collaborationWithdrawal } = subscores;
  if (![responsivenessPressure, collaborationWithdrawal].every(Number.isFinite)) return null;

  if (responsivenessPressure >= HIGH && collaborationWithdrawal >= MEDIUM) {
    const evidence = [];

    if (metricRisks.p90ResponseMinutes.score >= HIGH)
      evidence.push(
        `P90 response latency is above baseline (model score: ${metricRisks.p90ResponseMinutes.score})`
      );
    if (metricRisks.afterHoursMessageRatio.score >= HIGH)
      evidence.push(
        `After-hours messaging ratio is above baseline (model score: ${metricRisks.afterHoursMessageRatio.score})`
      );
    if (metricRisks.reciprocityRatio.score >= MEDIUM)
      evidence.push(
        `Reciprocity ratio moved below baseline (model score: ${metricRisks.reciprocityRatio.score})`
      );
    if (metricRisks.messagesSentPerPerson.score >= MEDIUM)
      evidence.push(
        `Message volume per person is outside baseline range (model score: ${metricRisks.messagesSentPerPerson.score})`
      );

    const severity =
      responsivenessPressure >= 80 && collaborationWithdrawal >= HIGH ? 'high' : 'medium';

    return {
      patternType: 'async_breakdown',
      title: 'Messaging response imbalance',
      severity,
      evidence,
      interpretation:
        'Response and after-hours metadata moved above baseline while reciprocity moved lower. This describes the measured combination and does not establish communication quality or cause.',
    };
  }

  return null;
}

// ── Pattern 6: Engagement Theatre ─────────────────────────────────────────────
//
// High meeting volume and high messaging volume, but reciprocity ratio and
// thread participation are low. The team looks "busy" in raw signal counts
// but genuine collaborative exchange is absent. Activity without engagement.

function detectEngagementTheatre(subscores, metricRisks, _weekly) {
  const { coordinationFriction, responsivenessPressure, collaborationWithdrawal } = subscores;
  if (
    ![coordinationFriction, responsivenessPressure, collaborationWithdrawal].every(Number.isFinite)
  ) {
    return null;
  }

  const highActivity = coordinationFriction >= MEDIUM && responsivenessPressure >= MEDIUM;
  const lowReciprocity = metricRisks.reciprocityRatio.score >= HIGH;
  const lowThreading = metricRisks.threadParticipationRate.score >= HIGH;

  if (highActivity && (lowReciprocity || lowThreading)) {
    const evidence = [];

    if (metricRisks.meetingHoursPerPerson.score >= MEDIUM)
      evidence.push(
        `Meeting hours per person are above baseline (model score: ${metricRisks.meetingHoursPerPerson.score})`
      );
    if (metricRisks.messagesSentPerPerson.score >= MEDIUM)
      evidence.push(
        `Message volume per person is above baseline (model score: ${metricRisks.messagesSentPerPerson.score})`
      );
    if (lowReciprocity)
      evidence.push(
        `Reciprocity ratio is below baseline (model score: ${metricRisks.reciprocityRatio.score})`
      );
    if (lowThreading)
      evidence.push(
        `Thread participation rate is below baseline (model score: ${metricRisks.threadParticipationRate.score})`
      );
    if (metricRisks.publicChannelRatio.score >= MEDIUM)
      evidence.push(
        `Public channel ratio is below baseline alongside high message volume (model score: ${metricRisks.publicChannelRatio.score})`
      );

    const severity = lowReciprocity && lowThreading ? 'high' : 'medium';

    return {
      patternType: 'engagement_theatre',
      title: 'High activity with low reciprocity',
      severity,
      evidence,
      interpretation:
        'Meeting and message activity are above baseline while reciprocity or thread participation is lower. Metadata alone cannot determine engagement or communication quality.',
    };
  }

  return null;
}
