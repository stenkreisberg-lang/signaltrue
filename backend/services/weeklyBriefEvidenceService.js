/**
 * Product evidence guardrails. These thresholds control how SignalTrue communicates and acts;
 * they are not claims of statistical significance or scientific validity.
 */
export const WEEKLY_EVIDENCE_GUARDRAILS = Object.freeze({
  COVERAGE_BLOCKED_BELOW_PCT: 30,
  COVERAGE_DIRECTIONAL_BELOW_PCT: 60,
  COVERAGE_WARNING_BELOW_PCT: 80,
  EVENT_VOLUME_BLOCKED_BELOW: 10,
  EVENT_VOLUME_DIRECTIONAL_BELOW: 30,
});

export const ACTIONABILITY = Object.freeze({
  NO_ACTION: 'no_action',
  DIAGNOSTIC_QUESTION: 'diagnostic_question',
  REVERSIBLE_EXPERIMENT: 'reversible_experiment',
  INTERVENTION: 'intervention',
});

export function determineMetricReadiness({
  metric,
  source,
  mappedUsers = 0,
  totalUsers = 0,
  eventCount = 0,
}) {
  const safeMappedUsers = Math.max(0, Number(mappedUsers) || 0);
  const safeTotalUsers = Math.max(0, Number(totalUsers) || 0);
  const safeEventCount = Math.max(0, Number(eventCount) || 0);
  const coveragePct = safeTotalUsers
    ? Math.round((safeMappedUsers / safeTotalUsers) * 1000) / 10
    : 0;

  let coverageReadiness = 'usable';
  if (coveragePct < WEEKLY_EVIDENCE_GUARDRAILS.COVERAGE_BLOCKED_BELOW_PCT) {
    coverageReadiness = 'blocked';
  } else if (coveragePct < WEEKLY_EVIDENCE_GUARDRAILS.COVERAGE_DIRECTIONAL_BELOW_PCT) {
    coverageReadiness = 'directional_only';
  } else if (coveragePct < WEEKLY_EVIDENCE_GUARDRAILS.COVERAGE_WARNING_BELOW_PCT) {
    coverageReadiness = 'usable_with_warning';
  }

  let volumeReadiness = 'normal';
  if (safeEventCount < WEEKLY_EVIDENCE_GUARDRAILS.EVENT_VOLUME_BLOCKED_BELOW) {
    volumeReadiness = 'blocked_low_volume';
  } else if (safeEventCount < WEEKLY_EVIDENCE_GUARDRAILS.EVENT_VOLUME_DIRECTIONAL_BELOW) {
    volumeReadiness = 'directional_low_volume';
  }

  let readiness = coverageReadiness;
  if (coverageReadiness !== 'blocked') {
    if (volumeReadiness === 'blocked_low_volume') readiness = 'blocked_low_volume';
    else if (coverageReadiness === 'directional_only') readiness = 'directional_only';
    else if (volumeReadiness === 'directional_low_volume') readiness = 'directional_low_volume';
  }

  const eligibleForStatus = ['usable', 'usable_with_warning'].includes(readiness);
  const reason =
    readiness === 'blocked'
      ? `Coverage is ${coveragePct}% (${safeMappedUsers} of ${safeTotalUsers} people), below the 30% product evidence guardrail.`
      : readiness === 'blocked_low_volume'
        ? `Only ${safeEventCount} observations are available, below the 10-event product evidence guardrail.`
        : readiness === 'directional_only'
          ? `Coverage is ${coveragePct}% (${safeMappedUsers} of ${safeTotalUsers} people); use only as a directional prompt.`
          : readiness === 'directional_low_volume'
            ? `Only ${safeEventCount} observations are available; use only as a directional prompt.`
            : readiness === 'usable_with_warning'
              ? `Coverage is ${coveragePct}% (${safeMappedUsers} of ${safeTotalUsers} people); show a visible coverage warning.`
              : 'Coverage and event volume meet the product evidence guardrails.';

  return {
    metric,
    source,
    mappedUsers: safeMappedUsers,
    totalUsers: safeTotalUsers,
    coveragePct,
    eventCount: safeEventCount,
    coverageReadiness,
    volumeReadiness,
    readiness,
    eligibleForStatus,
    reason,
  };
}

export function determineActionability({
  evidence = 'Low',
  readiness = 'blocked',
  persistence = 0,
  severity = 'stable',
} = {}) {
  const evidenceGrade = String(evidence).toLowerCase();
  const readinessState = String(readiness).toLowerCase();
  const severityState = String(severity).toLowerCase();
  const stable = severityState === 'stable' || severityState === 'none';
  const limitedReadiness = [
    'blocked',
    'blocked_low_volume',
    'directional_only',
    'directional_low_volume',
  ].includes(readinessState);

  if (stable) return ACTIONABILITY.NO_ACTION;
  if (evidenceGrade === 'low' || limitedReadiness) return ACTIONABILITY.DIAGNOSTIC_QUESTION;
  if (evidenceGrade === 'medium') {
    return Number(persistence) >= 2
      ? ACTIONABILITY.REVERSIBLE_EXPERIMENT
      : ACTIONABILITY.DIAGNOSTIC_QUESTION;
  }
  if (evidenceGrade === 'high' && Number(persistence) >= 2) {
    return ACTIONABILITY.INTERVENTION;
  }
  return ACTIONABILITY.DIAGNOSTIC_QUESTION;
}

export function getForecastDisplayTier(gradedPredictionCount = 0, matchedPredictionCount = 0) {
  const graded = Math.max(0, Number(gradedPredictionCount) || 0);
  const matched = Math.min(graded, Math.max(0, Number(matchedPredictionCount) || 0));
  const accuracy = graded ? Math.round((matched / graded) * 1000) / 10 : null;
  let displayTier = 'hidden';
  if (graded >= 12 && accuracy >= 70) displayTier = 'main_report';
  else if (graded >= 6) displayTier = 'experimental_appendix';
  return { gradedPredictionCount: graded, matchedPredictionCount: matched, accuracy, displayTier };
}

function degradeMetric(metric, readiness, reason) {
  return {
    ...metric,
    available: false,
    current: null,
    previous: null,
    changePct: null,
    direction: 'neutral',
    readiness: {
      ...(metric.readiness || {}),
      readiness: readiness || 'blocked',
      eligibleForStatus: false,
      reason:
        reason || metric.readiness?.reason || 'Metric was suppressed by consistency validation.',
    },
  };
}

/**
 * Suppresses contradictory claims before rendering or persistence. It never fabricates a number.
 */
export function validateWeeklyBriefConsistency(inputBrief = {}) {
  const brief = globalThis.structuredClone(inputBrief);
  const diagnostics = [];
  const add = (code, message, path) => diagnostics.push({ code, message, path });

  brief.metrics = (brief.metrics || []).map((metric) => {
    const percentageValue =
      metric.unit === '%' && metric.available !== false && metric.current != null
        ? Number(metric.current)
        : null;
    if (metric.denominator === 0 && percentageValue != null) {
      add(
        'percentage_with_zero_denominator',
        `${metric.key} included a percentage with a zero denominator.`,
        `metrics.${metric.key}`
      );
      return degradeMetric(metric, 'blocked_low_volume', 'No usable observations this week.');
    }
    if (percentageValue > 0 && metric.numerator != null && Number(metric.numerator) === 0) {
      add(
        'positive_percentage_with_zero_numerator',
        `${metric.key} included a positive percentage with a zero numerator.`,
        `metrics.${metric.key}`
      );
      return degradeMetric(
        metric,
        'blocked',
        'The numerator and percentage contradict each other.'
      );
    }
    if (
      /no data|not available|insufficient data/i.test(String(metric.display || '')) &&
      Number(metric.current) > 0
    ) {
      add(
        'no_data_with_positive_metric',
        `${metric.key} displayed no data alongside a positive value.`,
        `metrics.${metric.key}`
      );
      return degradeMetric(metric, 'blocked', 'The displayed availability contradicted the value.');
    }
    if (
      percentageValue != null &&
      metric.denominator > 0 &&
      metric.numerator != null &&
      Math.round((Number(metric.numerator) / Number(metric.denominator)) * 100) !==
        Math.round(Number(metric.current))
    ) {
      add(
        'calculated_count_mismatch',
        `${metric.key} percentage did not match its numerator and denominator.`,
        `metrics.${metric.key}`
      );
      return degradeMetric(
        metric,
        'blocked',
        'Displayed counts did not match the calculated rate.'
      );
    }
    return metric;
  });

  const stable = brief.status?.label === 'Stable';
  const criticalSignals = (brief.signals || []).filter(
    (signal) => signal.severity === 'Critical' || Number(signal.severity) >= 80
  );
  if (stable && criticalSignals.length) {
    add(
      'stable_with_critical_alert',
      'Stable status contradicted an active Critical alert.',
      'status.label'
    );
    brief.status = {
      ...brief.status,
      label: 'Insufficient data',
      evidenceGrade: 'Low',
      reason: 'Contradictory status and alert evidence was suppressed.',
    };
  }

  const primary = brief.actions?.primary;
  if (primary) {
    const lowEvidence =
      String(primary.evidenceGrade || brief.status?.evidenceGrade).toLowerCase() === 'low';
    const highEffort = String(primary.effort).toLowerCase() === 'high';
    const isIntervention = primary.actionability === ACTIONABILITY.INTERVENTION;
    if (lowEvidence && (highEffort || isIntervention)) {
      add(
        'low_evidence_high_effort_action',
        'A high-effort intervention was based on Low evidence.',
        'actions.primary'
      );
      brief.actions.primary = null;
    } else if (stable && isIntervention) {
      add(
        'stable_with_intervention',
        'Stable status and no meaningful movement contradicted an intervention recommendation.',
        'actions.primary'
      );
      brief.actions.primary = null;
    }
  }

  const blockedMetricKeys = new Set(
    brief.metrics
      .filter((metric) => metric.readiness && !metric.readiness.eligibleForStatus)
      .map((metric) => metric.statusKey || metric.key)
  );
  const usedBlocked = (brief.status?.deterioratingMetrics || []).filter((key) =>
    blockedMetricKeys.has(key)
  );
  if (usedBlocked.length) {
    add(
      'blocked_metric_changed_status',
      `Blocked metrics were used in organization status: ${usedBlocked.join(', ')}.`,
      'status.deterioratingMetrics'
    );
    brief.status = {
      ...brief.status,
      label: 'Insufficient data',
      evidenceGrade: 'Low',
      deterioratingMetrics: (brief.status.deterioratingMetrics || []).filter(
        (key) => !blockedMetricKeys.has(key)
      ),
      reason: 'Blocked metrics were removed from organization status.',
    };
  }

  return { valid: diagnostics.length === 0, brief, diagnostics };
}

export function formatMetricReadinessLabel(readiness) {
  return String(readiness || 'unknown').replace(/_/g, ' ');
}
