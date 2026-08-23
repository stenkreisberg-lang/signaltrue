/**
 * Possible workload migration (spec §17).
 *
 * The differentiator. A control can improve the metric it targeted while the
 * same demand reappears somewhere else — in another channel, later in the day,
 * or on another team. Removing meetings and watching chat rise 39% is not a
 * successful control; it is displaced demand.
 *
 * Everything this produces is phrased as *possible* migration and paired with
 * questions rather than conclusions. Observational metadata cannot establish
 * that demand moved, only that two things moved together.
 */

import InterventionEvaluation from '../../models/controlReview/interventionEvaluation.js';
import MigrationFinding from '../../models/controlReview/migrationFinding.js';
import ControlIntervention from '../../models/controlReview/controlIntervention.js';
import TeamWorkPatternMetric from '../../models/controlReview/teamMetric.js';
import WorkEvent from '../../models/workEvent.js';
import {
  METRIC_LABELS,
  ALGORITHM_VERSION,
  DATA_QUALITY_RANK,
} from '../../models/controlReview/constants.js';
import { resolveEvaluationDefaults, analysisPeriods, demandIncreased } from './interventionEvaluationService.js';
import { recordAudit } from './auditService.js';

function severityFor(destinationChange) {
  const magnitude = Math.abs(destinationChange);
  if (magnitude >= 0.35) return 'HIGH';
  if (magnitude >= 0.2) return 'MODERATE';
  return 'LOW';
}

function migrationTypeFor(sourceMetric, destinationMetric) {
  if (destinationMetric === 'AFTER_HOURS_ACTIVITY') return 'TIME';
  return 'CHANNEL';
}

function questionsFor({ sourceMetric, destinationMetric, migrationType }) {
  const sourceLabel = METRIC_LABELS[sourceMetric] || sourceMetric;
  const destinationLabel = METRIC_LABELS[destinationMetric] || destinationMetric;

  const shared = [
    `Did the work that previously happened through ${sourceLabel.toLowerCase()} move into ${destinationLabel.toLowerCase()}, or is this an unrelated change?`,
    'What do workers say about how the same work is now being coordinated?',
    'Is there recorded organisational context in this period that would explain the increase?',
  ];

  if (migrationType === 'TIME') {
    return [
      ...shared,
      'Is the same demand now being handled outside configured working hours?',
      'Were expectations about response times changed alongside the control?',
    ];
  }

  if (migrationType === 'TEAM') {
    return [
      ...shared,
      'Did another team absorb work or coordination that this team previously carried?',
      'Was the receiving team consulted about the change?',
    ];
  }

  return [
    ...shared,
    'Has the volume of asynchronous requests changed since the control was implemented?',
    'Is the coordination now happening in a channel with less shared visibility?',
  ];
}

/**
 * Detect possible migration for one control.
 *
 * Only fires when a metric the organisation expected to improve actually did,
 * and another coordination or time metric worsened materially over the same
 * post period. Two unrelated improvements never produce a flag.
 */
export async function detectMigration({ tenantId, interventionId, actor = null, req = null }) {
  const intervention = await ControlIntervention.findOne({ _id: interventionId, tenantId }).lean();
  if (!intervention) throw new Error('Control not found');

  const defaults = await resolveEvaluationDefaults(tenantId);
  const periods = analysisPeriods(intervention, defaults);

  const evaluations = await InterventionEvaluation.find({
    tenantId,
    interventionId,
    evaluationPossible: true,
  }).lean();

  const findings = [];

  const improvedTargets = evaluations.filter(
    (evaluation) => evaluation.isExpectedEffect && evaluation.directionMatched && evaluation.materialChange
  );

  if (improvedTargets.length === 0) {
    return findings;
  }

  // One finding per receiving metric, attributed to the target that moved most.
  // Without this, a control with three expected effects raises the same
  // displacement three times and the dashboard becomes unreadable.
  const strongestTargetFor = (teamId) =>
    improvedTargets
      .filter((target) => String(target.teamId) === String(teamId))
      .sort((a, b) => Math.abs(b.relativeChange ?? 0) - Math.abs(a.relativeChange ?? 0))[0];

  const targetMetrics = new Set(improvedTargets.map((t) => t.metric));

  // ── Channel and time migration, within the affected team ───────────────────
  for (const destination of evaluations) {
    if (targetMetrics.has(destination.metric)) continue;
    if (!destination.materialChange) continue;
    if (Math.abs(destination.relativeChange ?? 0) < defaults.migrationThreshold) continue;
    if (!demandIncreased(destination.metric, destination.relativeChange)) continue;
    // A metric the organisation also expected to move this way is not migration.
    if (destination.isExpectedEffect && destination.directionMatched) continue;

    const target = strongestTargetFor(destination.teamId);
    if (!target) continue;

    findings.push(
      await upsertFinding({
        tenantId,
        intervention,
        periods,
        migrationType: migrationTypeFor(target.metric, destination.metric),
        source: target,
        destination,
        sourceTeamId: target.teamId,
        destinationTeamId: destination.teamId,
      })
    );
  }

  // ── Team-to-team migration ─────────────────────────────────────────────────
  const strongestOverall = improvedTargets.sort(
    (a, b) => Math.abs(b.relativeChange ?? 0) - Math.abs(a.relativeChange ?? 0)
  )[0];

  findings.push(
    ...(await detectTeamMigration({
      tenantId,
      intervention,
      periods,
      target: strongestOverall,
      defaults,
    }))
  );

  const created = findings.filter(Boolean);

  if (created.length) {
    await recordAudit({
      tenantId,
      actor,
      actorType: actor ? 'USER' : 'SYSTEM',
      action: 'POSSIBLE_WORKLOAD_MIGRATION',
      objectType: 'ControlIntervention',
      objectId: intervention._id,
      metadata: {
        findings: created.map((f) => `${f.sourceMetric}->${f.destinationMetric}`),
      },
      req,
    });
  }

  return created;
}

/**
 * Demand appearing on a team that was not the target of the control. Compares
 * the same pre and post windows on neighbouring teams so a like-for-like claim
 * is possible.
 */
async function detectTeamMigration({ tenantId, intervention, periods, target, defaults }) {
  const affected = (intervention.affectedTeamIds || []).map(String);

  // Only teams this one actually works with. Every other team in the
  // organisation moving at the same time is coincidence, not displacement, and
  // flagging it would bury the real signal.
  const interacting = await findInteractingTeams({
    tenantId,
    teamIds: intervention.affectedTeamIds,
    from: periods.preStart,
    to: periods.postEnd,
  });

  if (interacting.length === 0) return [];

  const neighbourRows = await TeamWorkPatternMetric.find({
    tenantId,
    teamId: { $in: interacting },
    metric: { $in: ['COORDINATION_CHANNEL_LOAD', 'AFTER_HOURS_ACTIVITY', 'MEETING_LOAD'] },
    periodStart: { $gte: periods.preStart, $lt: periods.postEnd },
    suppressed: false,
  })
    .sort({ periodStart: 1 })
    .lean();

  const byTeamMetric = new Map();
  for (const row of neighbourRows) {
    const key = `${row.teamId}|${row.metric}`;
    if (!byTeamMetric.has(key)) byTeamMetric.set(key, { pre: [], post: [], quality: 'GOOD' });
    const bucket = byTeamMetric.get(key);
    if (row.periodStart < periods.preEnd) bucket.pre.push(row.value);
    else if (row.periodStart >= periods.postStart) bucket.post.push(row.value);
    if (DATA_QUALITY_RANK[row.dataQuality] < DATA_QUALITY_RANK[bucket.quality]) {
      bucket.quality = row.dataQuality;
    }
  }

  const findings = [];

  for (const [key, bucket] of byTeamMetric.entries()) {
    const [teamId, metric] = key.split('|');
    if (affected.includes(teamId)) continue;
    if (bucket.pre.length === 0 || bucket.post.length === 0) continue;

    const pre = bucket.pre.reduce((a, b) => a + b, 0) / bucket.pre.length;
    const post = bucket.post.reduce((a, b) => a + b, 0) / bucket.post.length;
    if (pre === 0) continue;

    const relativeChange = (post - pre) / Math.abs(pre);
    if (!demandIncreased(metric, relativeChange)) continue;
    if (Math.abs(relativeChange) < defaults.migrationThreshold) continue;

    findings.push(
      await upsertFinding({
        tenantId,
        intervention,
        periods,
        migrationType: 'TEAM',
        source: target,
        destination: {
          metric,
          relativeChange: Number(relativeChange.toFixed(4)),
          teamId,
          dataQuality: bucket.quality,
        },
        sourceTeamId: target.teamId,
        destinationTeamId: teamId,
      })
    );
  }

  return findings;
}

/**
 * Teams that shared meetings with the affected team over the analysis window.
 * Derived from participant team identifiers on content-free calendar events —
 * no message content and no individual identity is involved.
 */
export async function findInteractingTeams({ tenantId, teamIds, from, to }) {
  const affected = (teamIds || []).map(String);

  const partnerIds = await WorkEvent.distinct('metadata.participantTeamIds', {
    orgId: tenantId,
    teamId: { $in: teamIds },
    timestamp: { $gte: from, $lt: to },
    'metadata.participantTeamIds': { $exists: true, $ne: [] },
  });

  return partnerIds.filter((id) => id && !affected.includes(String(id)));
}

async function upsertFinding({
  tenantId,
  intervention,
  periods,
  migrationType,
  source,
  destination,
  sourceTeamId,
  destinationTeamId,
}) {
  const sourceLabel = METRIC_LABELS[source.metric] || source.metric;
  const destinationLabel = METRIC_LABELS[destination.metric] || destination.metric;

  const sourcePct = Math.round((source.relativeChange ?? 0) * 100);
  const destinationPct = Math.round((destination.relativeChange ?? 0) * 100);

  const summary =
    migrationType === 'TEAM'
      ? `Possible workload migration. ${sourceLabel} moved ${sourcePct}% on the team the control targeted, while ${destinationLabel} rose ${destinationPct}% on another team over the same period. Demand may have been displaced rather than reduced.`
      : `Possible workload migration. ${sourceLabel} moved ${sourcePct}% in the intended direction, while ${destinationLabel} moved ${destinationPct}% over the same post period. Coordination demand may have shifted rather than reduced.`;

  const existing = await MigrationFinding.findOne({
    tenantId,
    interventionId: intervention._id,
    sourceMetric: source.metric,
    destinationMetric: destination.metric,
    destinationTeamId,
  });

  // A human disposition on an existing finding is never overwritten.
  if (existing && existing.status !== 'OPEN') return existing;

  return MigrationFinding.findOneAndUpdate(
    {
      tenantId,
      interventionId: intervention._id,
      sourceMetric: source.metric,
      destinationMetric: destination.metric,
      destinationTeamId,
    },
    {
      $set: {
        tenantId,
        caseId: intervention.caseId,
        interventionId: intervention._id,
        migrationType,
        sourceMetric: source.metric,
        sourceChange: source.relativeChange,
        sourceTeamId,
        destinationMetric: destination.metric,
        destinationChange: destination.relativeChange,
        destinationTeamId,
        // Deduplicated: a within-team channel migration has the same team on
        // both sides, and listing it twice reads like two teams are involved.
        affectedTeamIds: [
          ...new Set([sourceTeamId, destinationTeamId].filter(Boolean).map(String)),
        ],
        periodStart: periods.postStart,
        periodEnd: periods.postEnd,
        severity: severityFor(destination.relativeChange),
        dataQuality: destination.dataQuality || source.dataQuality || 'ACCEPTABLE',
        status: 'OPEN',
        summary,
        investigationQuestions: questionsFor({
          sourceMetric: source.metric,
          destinationMetric: destination.metric,
          migrationType,
        }),
        algorithmVersion: ALGORITHM_VERSION,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
}

/** Human disposition on a migration finding. */
export async function updateMigrationStatus({
  tenantId,
  findingId,
  actor,
  status,
  investigationNotes = '',
  req = null,
}) {
  const finding = await MigrationFinding.findOneAndUpdate(
    { _id: findingId, tenantId },
    { $set: { status, investigationNotes } },
    { returnDocument: 'after' }
  );

  if (finding) {
    await recordAudit({
      tenantId,
      actor,
      action: 'MIGRATION_FINDING_UPDATED',
      objectType: 'MigrationFinding',
      objectId: finding._id,
      metadata: { status },
      req,
    });
  }

  return finding;
}

export default { detectMigration, updateMigrationStatus };
