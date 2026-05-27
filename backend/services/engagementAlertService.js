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
export async function evaluateAlerts(current, teamId, orgId) {
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
      title: 'Engagement Strain Rising',
      severity: wowDelta >= 15 || score >= 70 ? 'critical' : 'warning',
      message: `Team engagement strain risk rose ${wowDelta} points week-over-week (now ${score}).`,
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
      title: 'Sustained Engagement Strain Increase',
      severity: score >= 70 ? 'critical' : 'warning',
      message: `Team engagement strain risk rose ${triDelta} points over 3 weeks (now ${score}).`,
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
    recoveryDebt: 'Recovery Debt',
    focusErosion: 'Focus Erosion',
    coordinationFriction: 'Coordination Friction',
    responsivenessPressure: 'Responsiveness Pressure',
    collaborationWithdrawal: 'Collaboration Withdrawal',
    managerSupportGap: 'Manager Support Gap',
    workloadVolatility: 'Workload Volatility',
  };

  for (const [key, label] of Object.entries(DRIVER_LABELS)) {
    const score = subscores[key];
    if (score >= 70) {
      alerts.push({
        alertType: 'critical_driver',
        title: `Critical Driver: ${label}`,
        severity: score >= 85 ? 'critical' : 'warning',
        message: `${label} reached ${score} — in the critical risk band.`,
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
      title: `Fast Score Drift Detected`,
      severity: 'warning',
      message: `Team engagement strain risk ${direction} by ${delta} points over 4 weeks — rapid drift may indicate a structural change.`,
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
      title: 'Silent Withdrawal Detected',
      severity: cw >= 80 ? 'critical' : 'warning',
      message: `Collaboration Withdrawal (${cw}) is elevated while overall strain score appears moderate (${overall}) — disengagement may be underway without visible strain markers.`,
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
// Sustained high recovery debt is a strong precursor to burnout.

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
      title: 'Sustained Recovery Debt — Burnout Risk',
      severity: consecutiveWeeks >= 3 ? 'critical' : 'warning',
      message: `Recovery Debt has been in the critical range (${thisRD}) for ${consecutiveWeeks} consecutive weeks. Sustained after-hours work patterns significantly increase burnout risk.`,
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
