/**
 * H&S operational dashboard and weekly digest (spec §7, §30).
 *
 * The homepage answers five operational questions. It is deliberately not a
 * wall of charts: the product is judged on whether H&S can see the five things
 * that need acting on, not on how many metrics it can render.
 */

import ControlReviewCase from '../../models/controlReview/controlReviewCase.js';
import ControlIntervention from '../../models/controlReview/controlIntervention.js';
import InterventionEvaluation from '../../models/controlReview/interventionEvaluation.js';
import MigrationFinding from '../../models/controlReview/migrationFinding.js';
import PatternFinding from '../../models/controlReview/patternFinding.js';
import ConsultationRecord from '../../models/controlReview/consultationRecord.js';
import EvidencePack from '../../models/controlReview/evidencePack.js';
import Team from '../../models/team.js';
import { METRIC_LABELS, OPEN_STATUSES } from '../../models/controlReview/constants.js';
import { analysisPeriods, resolveEvaluationDefaults } from './interventionEvaluationService.js';
import { assessMixedEvidence } from './reviewCompletenessService.js';

const DAY_MS = 24 * 60 * 60 * 1000;

async function teamNameMap(tenantId, teamIds) {
  const unique = [...new Set(teamIds.map(String))];
  const teams = await Team.find({ _id: { $in: unique }, orgId: tenantId }).select('name').lean();
  return new Map(teams.map((t) => [String(t._id), t.name]));
}

/**
 * The five modules of §7, plus the pattern findings awaiting a human decision
 * on whether to open a case at all.
 */
export async function buildDashboard({ tenantId, hsRole = 'HS_ADMIN', userId = null, permittedTeamIds = [] }) {
  const defaults = await resolveEvaluationDefaults(tenantId);
  const now = new Date();

  const caseScope = { tenantId };
  if (hsRole === 'CASE_OWNER' && userId) caseScope.caseOwner = userId;
  if (hsRole === 'FUNCTION_LEADER' && permittedTeamIds.length) {
    caseScope.teamIds = { $in: permittedTeamIds };
  }

  const [openCases, interventions, patternFindings] = await Promise.all([
    ControlReviewCase.find({ ...caseScope, status: { $in: OPEN_STATUSES } })
      .sort({ updatedAt: -1 })
      .lean(),
    ControlIntervention.find({ tenantId, status: { $ne: 'CANCELLED' } }).lean(),
    PatternFinding.find({ tenantId, status: 'REVIEW_RECOMMENDED' })
      .sort({ periodStart: -1 })
      .limit(20)
      .lean(),
  ]);

  const caseIds = openCases.map((c) => c._id);
  const interventionIds = interventions.map((i) => i._id);

  const [migrations, evaluations, consultations] = await Promise.all([
    MigrationFinding.find({ tenantId, status: { $in: ['OPEN', 'UNDER_INVESTIGATION'] } })
      .sort({ createdAt: -1 })
      .lean(),
    interventionIds.length
      ? InterventionEvaluation.find({ tenantId, interventionId: { $in: interventionIds } }).lean()
      : [],
    caseIds.length ? ConsultationRecord.find({ tenantId, caseId: { $in: caseIds } }).lean() : [],
  ]);

  const allTeamIds = [
    ...openCases.flatMap((c) => c.teamIds || []),
    ...patternFindings.map((f) => f.teamId),
    ...migrations.flatMap((m) => m.affectedTeamIds || []),
  ];
  const teamNames = await teamNameMap(tenantId, allTeamIds);
  const nameFor = (id) => teamNames.get(String(id)) || 'Unknown team';

  const interventionsByCase = new Map();
  for (const intervention of interventions) {
    const key = String(intervention.caseId);
    if (!interventionsByCase.has(key)) interventionsByCase.set(key, []);
    interventionsByCase.get(key).push(intervention);
  }

  // ── 1. What needs attention now? ───────────────────────────────────────────
  const needsAttention = openCases
    .filter((c) => ['OPENED', 'INVESTIGATING', 'CONSULTING', 'REVIEW_DUE', 'DECISION_REQUIRED'].includes(c.status))
    .map((c) => ({
      caseId: String(c._id),
      caseNumber: c.caseNumber,
      title: c.title,
      status: c.status,
      teams: (c.teamIds || []).map(nameFor),
      triggerType: c.trigger.type,
      openedAt: c.openedAt,
      daysOpen: Math.floor((now - new Date(c.openedAt)) / DAY_MS),
      nextStep: nextStepFor(c, interventionsByCase.get(String(c._id)) || [], consultations),
    }));

  // ── 2. What controls are being implemented? ────────────────────────────────
  const beingImplemented = interventions
    .filter((i) => ['PLANNED', 'IMPLEMENTED'].includes(i.status))
    .map((i) => ({
      interventionId: String(i._id),
      caseId: String(i.caseId),
      name: i.name,
      type: i.interventionType,
      owner: String(i.owner),
      implementationDate: i.implementationDate,
      implementationConfirmed: i.implementationConfirmed,
      teams: (i.affectedTeamIds || []).map(nameFor),
      expectedEffects: (i.expectedEffects || []).map(
        (e) => `${METRIC_LABELS[e.metric] || e.metric} ${e.direction === 'INCREASE' ? '↑' : e.direction === 'DECREASE' ? '↓' : '→'}`
      ),
    }));

  // ── 3. What are we monitoring? ─────────────────────────────────────────────
  const monitoring = interventions
    .filter((i) => i.implementationConfirmed && i.status !== 'REVIEWED')
    .map((i) => {
      const periods = analysisPeriods(i, defaults);
      const daysRemaining = Math.max(0, Math.ceil((periods.postEnd - now) / DAY_MS));
      return {
        interventionId: String(i._id),
        caseId: String(i.caseId),
        name: i.name,
        teams: (i.affectedTeamIds || []).map(nameFor),
        postPeriodEnds: periods.postEnd,
        daysRemaining,
        watching: (i.expectedEffects || []).map((e) => METRIC_LABELS[e.metric] || e.metric),
      };
    })
    .filter((row) => row.daysRemaining > 0);

  // ── 4. Which reviews are due? ──────────────────────────────────────────────
  const reviewsDue = interventions
    .filter((i) => i.implementationConfirmed && i.status !== 'REVIEWED')
    .map((i) => ({ intervention: i, periods: analysisPeriods(i, defaults) }))
    .filter(({ periods }) => now >= periods.postEnd)
    .map(({ intervention, periods }) => ({
      interventionId: String(intervention._id),
      caseId: String(intervention.caseId),
      name: intervention.name,
      teams: (intervention.affectedTeamIds || []).map(nameFor),
      postPeriodEnded: periods.postEnd,
      daysWaiting: Math.floor((now - periods.postEnd) / DAY_MS),
    }));

  // ── 5. Where did the expected improvement not hold? ────────────────────────
  const exceptions = [];

  for (const migration of migrations) {
    exceptions.push({
      type: 'POSSIBLE_WORKLOAD_MIGRATION',
      caseId: String(migration.caseId),
      interventionId: String(migration.interventionId),
      severity: migration.severity,
      summary: migration.summary,
      teams: (migration.affectedTeamIds || []).map(nameFor),
    });
  }

  for (const evaluation of evaluations.filter((e) => e.reboundDetected)) {
    exceptions.push({
      type: 'IMPROVEMENT_NOT_SUSTAINED',
      caseId: String(evaluation.caseId),
      interventionId: String(evaluation.interventionId),
      severity: 'MODERATE',
      summary: `${METRIC_LABELS[evaluation.metric] || evaluation.metric}: initial improvement was not sustained.`,
      teams: [nameFor(evaluation.teamId)],
    });
  }

  const consultationsByCase = new Map();
  for (const record of consultations) {
    const key = String(record.caseId);
    if (!consultationsByCase.has(key)) consultationsByCase.set(key, []);
    consultationsByCase.get(key).push(record);
  }

  for (const caseDoc of openCases) {
    const caseEvaluations = evaluations.filter((e) => String(e.caseId) === String(caseDoc._id));
    if (caseEvaluations.length === 0) continue;
    const mixed = assessMixedEvidence({
      evaluations: caseEvaluations,
      consultations: consultationsByCase.get(String(caseDoc._id)) || [],
    });
    if (mixed.present) {
      exceptions.push({
        type: 'MIXED_EVIDENCE',
        caseId: String(caseDoc._id),
        severity: 'MODERATE',
        summary: mixed.statement,
        teams: (caseDoc.teamIds || []).map(nameFor),
      });
    }
  }

  return {
    generatedAt: now,
    modules: {
      needsAttention: {
        question: 'What needs attention now?',
        items: needsAttention,
      },
      controlsBeingImplemented: {
        question: 'What controls are being implemented?',
        items: beingImplemented,
      },
      monitoring: {
        question: 'What are we monitoring?',
        items: monitoring,
      },
      reviewsDue: {
        question: 'Which reviews are due?',
        items: reviewsDue,
      },
      exceptions: {
        question: 'Where did the expected improvement not hold?',
        items: exceptions,
      },
    },
    reviewRecommendations: patternFindings.map((finding) => ({
      findingId: String(finding._id),
      team: nameFor(finding.teamId),
      periodStart: finding.periodStart,
      persistencePeriods: finding.persistencePeriods,
      basis: finding.recommendationBasis,
      dataQuality: finding.dataQuality,
      summary: finding.summary,
      signals: finding.signals.map((s) => ({
        metric: METRIC_LABELS[s.metric] || s.metric,
        relativeChange: s.relativeChange,
        direction: s.direction,
      })),
    })),
  };
}

function nextStepFor(caseDoc, interventions, consultations) {
  const caseConsultations = consultations.filter((c) => String(c.caseId) === String(caseDoc._id));

  switch (caseDoc.status) {
    case 'OPENED':
      return 'Record the investigation: what is known, what is uncertain, why review is needed.';
    case 'INVESTIGATING':
      return caseConsultations.length
        ? 'Record the control the organisation has chosen, with its expected effects.'
        : 'Consult workers, or record why consultation is not applicable.';
    case 'CONSULTING':
      return 'Record the control the organisation has chosen, with its expected effects.';
    case 'ACTION_PLANNED':
      return 'Confirm the implementation date once the control is in place.';
    case 'REVIEW_DUE':
      return 'Run the before/after comparison and review the evidence.';
    case 'DECISION_REQUIRED':
      return 'Record the organisation decision. Only a person can close this case.';
    default:
      return interventions.length ? 'Monitoring in progress.' : 'Record the control for this case.';
  }
}

/**
 * Weekly H&S review digest (§30.2). Ten sections, each a list of things a
 * person may need to act on this week.
 */
export async function buildWeeklyDigest({ tenantId, since = null }) {
  const from = since || new Date(Date.now() - 7 * DAY_MS);
  const dashboard = await buildDashboard({ tenantId });

  const [newCases, consultationsPending, decisionsAwaiting, packs] = await Promise.all([
    ControlReviewCase.find({ tenantId, openedAt: { $gte: from } }).select('caseNumber title trigger.type').lean(),
    ControlReviewCase.find({ tenantId, status: 'CONSULTING' }).select('caseNumber title').lean(),
    ControlReviewCase.find({ tenantId, status: 'DECISION_REQUIRED' })
      .select('caseNumber title caseOwner')
      .lean(),
    EvidencePack.find({ tenantId, generatedAt: { $gte: from } }).select('caseNumber version').lean(),
  ]);

  return {
    period: { from, to: new Date() },
    newCasesWorthReviewing: dashboard.reviewRecommendations,
    newCases: newCases.map((c) => `${c.caseNumber} — ${c.title} (${c.trigger.type})`),
    activeInvestigations: dashboard.modules.needsAttention.items.filter(
      (i) => i.status === 'INVESTIGATING'
    ),
    consultationsAwaitingCompletion: consultationsPending.map((c) => `${c.caseNumber} — ${c.title}`),
    controlsBeingImplemented: dashboard.modules.controlsBeingImplemented.items,
    controlsMonitored: dashboard.modules.monitoring.items,
    reviewsDue: dashboard.modules.reviewsDue.items,
    possibleWorkloadMigration: dashboard.modules.exceptions.items.filter(
      (e) => e.type === 'POSSIBLE_WORKLOAD_MIGRATION'
    ),
    shortLivedImprovements: dashboard.modules.exceptions.items.filter(
      (e) => e.type === 'IMPROVEMENT_NOT_SUSTAINED'
    ),
    decisionsAwaitingOwner: decisionsAwaiting.map((c) => `${c.caseNumber} — ${c.title}`),
    evidencePacksGenerated: packs.map((p) => `${p.caseNumber} v${p.version}`),
  };
}

export default { buildDashboard, buildWeeklyDigest };
