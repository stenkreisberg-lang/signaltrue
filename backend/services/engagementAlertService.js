/**
 * Engagement Alert Service
 *
 * Implements 5 alert types from spec Section 19.
 * Evaluates whether a team-week result warrants an alert by comparing
 * the current week's scores against historical context.
 *
 * Alert types:
 *   1. rising_strain        — Overall score rising fast (>=8pt WoW or >=15pt over 3 weeks)
 *   2. critical_driver      — Any single subscore enters critical band (>=70)
 *   3. fast_drift           — Score has moved >=20 points in either direction within 4 weeks
 *   4. silent_withdrawal    — Collaboration Withdrawal elevated while overall score looks moderate
 *   5. recovery_collapse    — Recovery Debt >=80 for 2+ consecutive weeks
 *
 * Each alert:
 *   {
 *     alertType:   string           — machine key
 *     title:       string           — human-readable title
 *     severity:    'info'|'warning'|'critical'
 *     message:     string           — one-sentence description
 *     context:     Object           — relevant score snapshot (no individual data)
 *     createdAt:   Date
 *   }
 *
 * PRIVACY: All alerts are team-level only. No individual identification.
 */

import EngagementStrainWeekly from '../models/engagementStrainWeekly.js';

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Evaluate alerts for a freshly-saved EngagementStrainWeekly document.
 *
 * @param {Object} current  — current week's EngagementStrainWeekly lean object
 * @param {string} teamId
 * @param {string} orgId
 * @returns {Array}         — alert objects (may be empty). Caller persists if needed.
 */
export async function evaluateAlerts(current, teamId, _orgId) {
  // Fetch up to 4 prior weeks for trend context
  const history = await EngagementStrainWeekly.find(
    { teamId, weekStart: { $lt: current.weekStart } },
    { weekStart: 1, engagementStrainRisk: 1, subscores: 1, riskState: 1 }
  )
    .sort({ weekStart: -1 })
    .limit(4)
    .lean();

  const alerts = [];

  alerts.push(...checkRisingStrain(current, history));
  alerts.push(...checkCriticalDriver(current));
  alerts.push(...checkFastDrift(current, history));
  alerts.push(...checkSilentWithdrawal(current));
  alerts.push(...checkRecoveryCollapse(current, history));

  return alerts;
}

// ── Alert 1: Rising Strain ─────────────────────────────────────────────────────
// Fires when:
//   - Score rose >= 8 points vs last week, OR
//   - Score rose >= 15 points vs 3 weeks ago

function checkRisingStrain(current, history) {
  const alerts = [];
  const score = current.engagementStrainRisk;

  const lastWeek = history[0];
  const threeAgo = history[2];

  const wowDelta = lastWeek ? score - lastWeek.engagementStrainRisk : null;
  const triDelta = threeAgo ? score - threeAgo.engagementStrainRisk : null;

  if (wowDelta !== null && wowDelta >= 8) {
    alerts.push({
      alertType: 'rising_strain',
      title: 'Work-pattern deviation increased',
      severity: wowDelta >= 15 || score >= 70 ? 'critical' : 'warning',
      message: `The internal deviation index rose ${wowDelta} points week-over-week (now ${score}). Review the underlying direct metrics and context.`,
      context: {
        currentScore: score,
        previousScore: lastWeek.engagementStrainRisk,
        weekOverWeekDelta: wowDelta,
        riskState: current.riskState,
      },
      createdAt: new Date(),
    });
  } else if (triDelta !== null && triDelta >= 15 && !(wowDelta !== null && wowDelta >= 8)) {
    // Only fire the 3-week trend alert if the WoW alert didn't already fire
    alerts.push({
      alertType: 'rising_strain',
      title: 'Sustained work-pattern deviation increase',
      severity: score >= 70 ? 'critical' : 'warning',
      message: `The internal deviation index rose ${triDelta} points over 3 weeks (now ${score}). This is a review rule, not a validated risk threshold.`,
      context: {
        currentScore: score,
        threeWeeksAgo: threeAgo.engagementStrainRisk,
        threeWeekDelta: triDelta,
        riskState: current.riskState,
      },
      createdAt: new Date(),
    });
  }

  return alerts;
}

// ── Alert 2: Critical Driver ───────────────────────────────────────────────────
// Fires when any single subscore enters the critical band (>= 70).

function checkCriticalDriver(current) {
  const alerts = [];
  const { subscores } = current;
  if (!subscores) return alerts;

  const DRIVER_LABELS = {
    recoveryDebt: 'Outside-schedule activity',
    focusErosion: 'Focus availability',
    coordinationFriction: 'Coordination metadata',
    responsivenessPressure: 'Response patterns',
    collaborationWithdrawal: 'Collaboration metadata',
    managerSupportGap: 'Recorded 1:1 time',
    workloadVolatility: 'Week-to-week activity',
  };

  for (const [key, label] of Object.entries(DRIVER_LABELS)) {
    const score = subscores[key];
    if (score >= 70) {
      alerts.push({
        alertType: 'critical_driver',
        title: `Modeled driver above strong review band: ${label}`,
        severity: score >= 85 ? 'critical' : 'warning',
        message: `${label} reached ${score}, crossing a SignalTrue internal review band. Verify its direct component metrics before acting.`,
        context: {
          driver: key,
          driverLabel: label,
          driverScore: score,
          overallRisk: current.engagementStrainRisk,
        },
        createdAt: new Date(),
      });
    }
  }

  return alerts;
}

// ── Alert 3: Fast Drift ────────────────────────────────────────────────────────
// Fires when the score has moved >= 20 points in either direction within 4 weeks.
// Catches both rapid deterioration AND rapid false-positive swings.

function checkFastDrift(current, history) {
  const alerts = [];
  if (history.length < 3) return alerts;

  const fourWeeksAgo = history[3] ?? history[history.length - 1];
  const delta = Math.abs(current.engagementStrainRisk - fourWeeksAgo.engagementStrainRisk);

  if (delta >= 20) {
    const direction =
      current.engagementStrainRisk > fourWeeksAgo.engagementStrainRisk ? 'increased' : 'decreased';

    alerts.push({
      alertType: 'fast_drift',
      title: `Large model-score change detected`,
      severity: 'warning',
      message: `The internal deviation index ${direction} by ${delta} points over 4 weeks. Check data coverage and business context before interpreting the change.`,
      context: {
        currentScore: current.engagementStrainRisk,
        fourWeeksAgo: fourWeeksAgo.engagementStrainRisk,
        absoluteDelta: delta,
        direction,
      },
      createdAt: new Date(),
    });
  }

  return alerts;
}

// ── Alert 4: Silent Withdrawal ─────────────────────────────────────────────────
// Fires when Collaboration Withdrawal >= 65 but overall strain score is < 55.
// This pattern is easy to miss in dashboard scanning — alert surfaces it explicitly.

function checkSilentWithdrawal(current) {
  const alerts = [];
  const cw = current.subscores?.collaborationWithdrawal;
  const overall = current.engagementStrainRisk;

  if (cw >= 65 && overall < 55) {
    alerts.push({
      alertType: 'silent_withdrawal',
      title: 'Collaboration metadata decline met a review rule',
      severity: cw >= 80 ? 'critical' : 'warning',
      message: `The collaboration model dimension (${cw}) is above its review band while the overall deviation index is ${overall}. Metadata does not establish disengagement or intent.`,
      context: {
        collaborationWithdrawal: cw,
        overallRisk: overall,
        riskState: current.riskState,
      },
      createdAt: new Date(),
    });
  }

  return alerts;
}

// ── Alert 5: Recovery Collapse ─────────────────────────────────────────────────
// Fires when Recovery Debt >= 80 for 2 or more consecutive weeks.
// Sustained model deviation triggers a team-level context review, not an outcome prediction.

function checkRecoveryCollapse(current, history) {
  const alerts = [];
  const thisRD = current.subscores?.recoveryDebt;

  if (thisRD < 80) return alerts;

  // Count consecutive prior weeks where recoveryDebt was also >= 80
  let consecutiveWeeks = 1; // count current week
  for (const prior of history) {
    if ((prior.subscores?.recoveryDebt ?? 0) >= 80) {
      consecutiveWeeks++;
    } else {
      break; // streak broken
    }
  }

  if (consecutiveWeeks >= 2) {
    alerts.push({
      alertType: 'recovery_collapse',
      title: 'Sustained recovery-pattern deviation',
      severity: consecutiveWeeks >= 3 ? 'critical' : 'warning',
      message: `The recovery-pattern model has remained above its strong internal review band (${thisRD}) for ${consecutiveWeeks} consecutive weeks. Review the direct after-hours and calendar metrics; this is not a burnout diagnosis or prediction.`,
      context: {
        recoveryDebt: thisRD,
        consecutiveWeeks,
        overallRisk: current.engagementStrainRisk,
      },
      createdAt: new Date(),
    });
  }

  return alerts;
}
