/**
 * Plain-language interpretation with enforced guardrails (spec §24, §29).
 *
 * The interpretation layer receives aggregated work-pattern figures and
 * customer-entered summaries only — never message bodies, email bodies or
 * anything individual (§24).
 *
 * The forbidden phrases in §24.1 are not a style preference. "Burnout detected"
 * or "the intervention caused X" would make the product a diagnostic and a
 * causal claim, which it is not. Output is screened before it is returned, and
 * a violation drops the offending block rather than shipping it.
 */

import {
  METRIC_LABELS,
  REQUIRED_DISCLAIMER,
} from '../../models/controlReview/constants.js';
import { describeEvaluation } from './interventionEvaluationService.js';

// §24.1 — forbidden automatic language.
export const FORBIDDEN_PATTERNS = [
  /\bemployees? (are|is) stressed\b/i,
  /\bburnout (detected|risk|score)\b/i,
  /\bpsychosocial hazard confirmed\b/i,
  /\bmanager is overloaded\b/i,
  /\bemployees? (are|is) disengaged\b/i,
  /\bcompany is non-?compliant\b/i,
  /\bcontrol is legally effective\b/i,
  /\bthe intervention caused\b/i,
  /\bcaused (a|an|the)? ?\w+ (increase|decrease|reduction|drop|rise)\b/i,
  /\bproves\b/i,
  /\brisk score\b/i,
  /\bconfidence \d+%/i,
  /\bfocus time\b/i,
  /\bevidence (is )?sufficient\b/i,
  /\bcontrol (was )?successful\b/i,
  /\bworkload moved\b/i,
];

export function findForbiddenLanguage(text = '') {
  return FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(text)).map((p) => p.source);
}

export function isLanguageSafe(text = '') {
  return findForbiddenLanguage(text).length === 0;
}

/**
 * Screen a block of generated text. Anything that trips a forbidden pattern is
 * replaced rather than returned — failing closed matters more than fluency.
 */
export function screen(text, fallback = '') {
  const violations = findForbiddenLanguage(text);
  if (violations.length === 0) return { text, violations: [] };
  return {
    text: fallback || 'This statement was withheld because it did not meet the product language rules.',
    violations,
  };
}

/**
 * Build the six-block interpretation of §24 deterministically from the stored
 * evidence. No model call is required for the P0 blocks, which is what makes
 * the output reproducible and auditable against the numbers behind it.
 */
export function buildInterpretation({
  caseDoc,
  observations = [],
  evaluations = [],
  migrations = [],
  consultations = [],
  contextEvents = [],
  completeness = null,
}) {
  const observed = buildObserved({ observations, evaluations });
  const significance = buildSignificance({ evaluations, migrations, completeness });
  const investigate = buildInvestigate({ migrations, evaluations, consultations, completeness });
  const actionOptions = buildActionOptions({ evaluations, migrations, caseDoc });
  const monitor = buildMonitor({ caseDoc, evaluations, migrations });
  const limitations = buildLimitations({ evaluations, observations, contextEvents, completeness });

  const blocks = {
    OBSERVED: observed,
    POSSIBLE_SIGNIFICANCE: significance,
    INVESTIGATE: investigate,
    ACTION_OPTIONS: actionOptions,
    MONITOR: monitor,
    LIMITATIONS: limitations,
  };

  const screened = {};
  const violations = [];

  for (const [key, lines] of Object.entries(blocks)) {
    screened[key] = lines
      .map((line) => {
        const result = screen(line);
        if (result.violations.length) violations.push({ block: key, line, violations: result.violations });
        return result.violations.length ? null : result.text;
      })
      .filter(Boolean);
  }

  return { blocks: screened, violations, disclaimer: REQUIRED_DISCLAIMER };
}

function label(metric) {
  return METRIC_LABELS[metric] || metric;
}

function buildObserved({ observations, evaluations }) {
  const lines = [];

  for (const evaluation of evaluations.filter((e) => e.isExpectedEffect)) {
    lines.push(describeEvaluation(evaluation, label(evaluation.metric).toLowerCase()));
  }

  // One line per metric. The same deviation repeats every week it holds, and
  // restating it four times reads as four findings.
  const deviating = observations.filter((o) => o.status === 'DEVIATION_OBSERVED');
  const latestByMetric = new Map();
  for (const observation of deviating) {
    const existing = latestByMetric.get(observation.metric);
    if (
      !existing ||
      new Date(observation.periodStart) > new Date(existing.periodStart) ||
      observation.persistencePeriods > existing.persistencePeriods
    ) {
      latestByMetric.set(observation.metric, observation);
    }
  }

  for (const observation of latestByMetric.values()) {
    const pct =
      observation.relativeChange === null ? null : Math.round(observation.relativeChange * 100);
    const periods = observation.persistencePeriods;
    lines.push(
      `${label(observation.metric)} was ${
        pct === null ? 'different' : `${pct > 0 ? '+' : ''}${pct}%`
      } compared with this team’s own baseline, persistent across ${periods} weekly period${
        periods === 1 ? '' : 's'
      }.`
    );
  }

  if (lines.length === 0) {
    lines.push('No material work-pattern change has been observed for the periods compared.');
  }

  return lines;
}

function buildSignificance({ evaluations, migrations, completeness }) {
  const lines = [];

  const matched = evaluations.filter((e) => e.isExpectedEffect && e.directionMatched && e.materialChange);
  const unmatched = evaluations.filter(
    (e) => e.isExpectedEffect && e.directionMatched === false && e.materialChange
  );

  if (matched.length) {
    lines.push(
      'Observed work-pattern changes were consistent with the intended direction. Other factors may have contributed, and this is not evidence that the control caused the change.'
    );
  }
  if (unmatched.length) {
    lines.push(
      `The intended change was not observed for ${unmatched
        .map((e) => label(e.metric).toLowerCase())
        .join(', ')}. This may warrant further investigation.`
    );
  }
  if (migrations.length) {
    lines.push(
      'Possible workload migration was flagged: demand may have shifted to another channel, time or team rather than reduced.'
    );
  }
  if (evaluations.some((e) => e.reboundDetected)) {
    lines.push('Initial improvement was not sustained across the sustainability window.');
  }
  if (completeness?.mixedEvidence?.present) {
    lines.push(completeness.mixedEvidence.statement);
  }
  if (lines.length === 0) {
    lines.push('There is not yet enough comparison evidence to describe possible significance.');
  }

  return lines;
}

function buildInvestigate({ migrations, evaluations, consultations, completeness }) {
  const lines = [];

  for (const migration of migrations) {
    lines.push(...(migration.investigationQuestions || []).slice(0, 3));
  }

  if (evaluations.some((e) => e.reboundDetected)) {
    lines.push('What changed between the post period and the sustainability window?');
    lines.push('Did the control remain in place, or did the previous practice return?');
  }

  if (consultations.length === 0) {
    lines.push('What are workers experiencing that the work-pattern metadata cannot show?');
  }

  if (completeness?.mixedEvidence?.present) {
    lines.push(
      'Why do the observed work patterns and the worker experience point in different directions?'
    );
  }

  if (lines.length === 0) {
    lines.push('What organisational context overlaps the periods being compared?');
    lines.push('What do workers say has changed about how the work is done?');
  }

  return [...new Set(lines)].slice(0, 8);
}

function buildActionOptions({ evaluations, migrations, caseDoc }) {
  const lines = [
    'These are options for human consideration. SignalTrue does not prescribe controls.',
  ];

  if (migrations.length) {
    lines.push(
      'Consider whether the underlying demand — not only the channel it arrives through — needs a workload, priority or coordination control.'
    );
    lines.push('Consider consulting the group the demand may have moved to.');
  }

  if (evaluations.some((e) => e.reboundDetected)) {
    lines.push(
      'Consider whether the control needs reinforcement, a different control, or an owner with authority to hold the change.'
    );
  }

  const unmatched = evaluations.filter((e) => e.isExpectedEffect && e.directionMatched === false);
  if (unmatched.length) {
    lines.push(
      'Consider whether the control addressed the actual driver, and what worker consultation suggests instead.'
    );
  }

  if (!caseDoc?.decisionRecordedAt) {
    lines.push(
      'Record the organisation decision — continue, adjust, replace or close the control review.'
    );
  }

  return lines;
}

function buildMonitor({ caseDoc, evaluations, migrations }) {
  const metrics = new Set(caseDoc?.monitoredMetrics || []);
  for (const evaluation of evaluations.filter((e) => e.isExpectedEffect)) metrics.add(evaluation.metric);
  for (const migration of migrations) metrics.add(migration.destinationMetric);

  const lines = [...metrics].map((metric) => `Continue observing ${label(metric)}.`);
  lines.push('Record any organisational context that overlaps the monitoring period.');
  if (migrations.length) {
    lines.push('Observe whether the increase in the receiving channel, time or team persists.');
  }
  return lines;
}

function buildLimitations({ evaluations, observations, contextEvents, completeness }) {
  const lines = [
    'This is observational work-pattern metadata. It cannot establish that the control caused any observed change.',
    'It cannot describe an individual’s psychological state, and no individual-level score exists in this product.',
  ];

  const unavailable = evaluations.filter((e) => !e.evaluationPossible);
  if (unavailable.length) {
    lines.push(
      `No comparison was possible for ${unavailable.length} metric(s): ${[
        ...new Set(unavailable.map((e) => e.unavailableReason)),
      ].join(' ')}`
    );
  }

  const lowQuality = [...evaluations, ...observations].filter((row) =>
    ['LOW', 'INSUFFICIENT'].includes(row.dataQuality)
  );
  if (lowQuality.length) {
    lines.push('Some comparisons rest on reduced data coverage; treat magnitudes with caution.');
  }

  const immature = observations.filter((o) => o.baseline && o.baseline.mature === false);
  if (immature.length) {
    lines.push(
      'Some baselines are shorter than the recommended eight weeks, so the comparison point is less stable.'
    );
  }

  if (contextEvents.length) {
    lines.push(
      `Recorded organisational context overlaps the analysis period: ${contextEvents
        .map((c) => c.name)
        .join(', ')}. This may offer an alternative explanation.`
    );
  }

  if (completeness?.outstanding?.length) {
    lines.push(`Outstanding review components: ${completeness.outstanding.join(', ')}.`);
  }

  return lines;
}

export default {
  FORBIDDEN_PATTERNS,
  findForbiddenLanguage,
  isLanguageSafe,
  screen,
  buildInterpretation,
};
