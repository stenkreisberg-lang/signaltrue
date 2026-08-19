/**
 * Review Completeness — not "evidence sufficiency" (spec §19).
 *
 * SignalTrue reports which components of a review exist and which are
 * outstanding. It never decides whether the evidence is legally or
 * professionally sufficient; that judgement belongs to the organisation.
 *
 * The distinction is load-bearing: the moment software grades evidence, it is
 * acting as an evidentiary arbiter, which the product must not do.
 */

import ControlReviewCase from '../../models/controlReview/controlReviewCase.js';
import TriggerEvidence from '../../models/controlReview/triggerEvidence.js';
import ConsultationRecord from '../../models/controlReview/consultationRecord.js';
import ControlIntervention from '../../models/controlReview/controlIntervention.js';
import InterventionEvaluation from '../../models/controlReview/interventionEvaluation.js';
import MigrationFinding from '../../models/controlReview/migrationFinding.js';
import ContextEvent from '../../models/controlReview/contextEvent.js';
import { analysisPeriods, resolveEvaluationDefaults } from './interventionEvaluationService.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS = {
  COMPLETE: 'COMPLETE',
  PARTIAL: 'PARTIAL',
  PENDING: 'PENDING',
  UNAVAILABLE: 'UNAVAILABLE',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
};

function component(key, label, status, detail = '') {
  return { key, label, status, detail };
}

/**
 * Assemble the completeness view for a case.
 *
 * Returns components with a status and a plain description each. There is no
 * overall score and no pass/fail: a percentage would be read as a grade.
 */
export async function assessCompleteness({ tenantId, caseId }) {
  const caseDoc = await ControlReviewCase.findOne({ _id: caseId, tenantId }).lean();
  if (!caseDoc) throw new Error('Case not found');

  const defaults = await resolveEvaluationDefaults(tenantId);

  const [evidence, consultations, interventions] = await Promise.all([
    TriggerEvidence.find({ tenantId, caseId }).lean(),
    ConsultationRecord.find({ tenantId, caseId }).lean(),
    ControlIntervention.find({ tenantId, caseId }).lean(),
  ]);

  // Context is judged over the window the evidence actually covers. A launch
  // that ended before the case was opened can still explain the pre-period
  // pattern the case exists to review.
  const analysisStart = interventions.length
    ? analysisPeriods(interventions[0], defaults).preStart
    : caseDoc.openedAt;

  const contextEvents = await ContextEvent.find({
    tenantId,
    $or: [{ teamIds: { $in: caseDoc.teamIds } }, { teamIds: { $size: 0 } }],
    endDate: { $gte: analysisStart },
  }).lean();

  const interventionIds = interventions.map((i) => i._id);
  const [evaluations, migrations] = await Promise.all([
    interventionIds.length
      ? InterventionEvaluation.find({ tenantId, interventionId: { $in: interventionIds } }).lean()
      : [],
    interventionIds.length
      ? MigrationFinding.find({ tenantId, interventionId: { $in: interventionIds } }).lean()
      : [],
  ]);

  const components = [];

  // 1 — trigger/source documented
  components.push(
    component(
      'trigger',
      'Trigger/source documented',
      evidence.length > 0 || caseDoc.initialEvidenceSummary
        ? STATUS.COMPLETE
        : STATUS.PENDING,
      evidence.length ? `${evidence.length} source record(s) attached.` : ''
    )
  );

  // 2 — work-pattern evidence
  const usableEvaluations = evaluations.filter((e) => e.evaluationPossible);
  const suppressedEvaluations = evaluations.filter((e) => !e.evaluationPossible);
  let workPatternStatus = STATUS.PENDING;
  let workPatternDetail = 'No post-intervention comparison has been produced yet.';

  if (evaluations.length > 0) {
    if (usableEvaluations.length === 0) {
      workPatternStatus = STATUS.UNAVAILABLE;
      workPatternDetail =
        suppressedEvaluations[0]?.unavailableReason ||
        'Work-pattern evidence is unavailable for this comparison.';
    } else if (suppressedEvaluations.length > 0) {
      workPatternStatus = STATUS.PARTIAL;
      workPatternDetail = `${usableEvaluations.length} of ${evaluations.length} metric comparisons available; the rest have data gaps.`;
    } else {
      workPatternStatus = STATUS.COMPLETE;
      workPatternDetail = `${usableEvaluations.length} metric comparison(s) available.`;
    }
  } else if (caseDoc.monitoredMetrics?.length) {
    workPatternDetail = `Monitoring ${caseDoc.monitoredMetrics.length} metric(s); no comparison produced yet.`;
  }
  components.push(
    component('workPatternEvidence', 'Work-pattern evidence', workPatternStatus, workPatternDetail)
  );

  // 3 — context recorded
  components.push(
    component(
      'context',
      'Context recorded',
      contextEvents.length > 0 ? STATUS.COMPLETE : STATUS.PENDING,
      contextEvents.length
        ? `${contextEvents.length} overlapping context event(s).`
        : 'No organisational context has been recorded for this period.'
    )
  );

  // 4 — worker consultation
  const preConsultation = consultations.filter((c) => !c.isPostInterventionFollowUp);
  let consultationStatus = STATUS.PENDING;
  let consultationDetail = 'No consultation recorded.';

  if (caseDoc.consultationNotApplicable?.isNotApplicable) {
    consultationStatus = STATUS.NOT_APPLICABLE;
    consultationDetail = `Recorded as not applicable: ${caseDoc.consultationNotApplicable.reason}`;
  } else if (preConsultation.length > 0) {
    const complete = preConsultation.filter(
      (c) => c.workerViews?.length && c.managementResponse?.length && c.decisionImpact?.length
    );
    consultationStatus = complete.length > 0 ? STATUS.COMPLETE : STATUS.PARTIAL;
    consultationDetail =
      complete.length > 0
        ? `${complete.length} consultation record(s) with worker views, management response and decision impact.`
        : 'Consultation recorded, but worker views, management response or decision impact are missing.';
  }
  components.push(
    component('consultation', 'Worker consultation', consultationStatus, consultationDetail)
  );

  // 5 — feedback back to workers
  const feedbackGiven = consultations.some((c) => c.feedbackBackToWorkers?.provided);
  components.push(
    component(
      'feedbackToWorkers',
      'Feedback communicated back to workers',
      caseDoc.consultationNotApplicable?.isNotApplicable
        ? STATUS.NOT_APPLICABLE
        : feedbackGiven
          ? STATUS.COMPLETE
          : STATUS.PENDING,
      feedbackGiven ? '' : 'No record that outcomes were communicated back to the workers consulted.'
    )
  );

  // 6 — intervention documented
  components.push(
    component(
      'intervention',
      'Intervention documented',
      interventions.length > 0 ? STATUS.COMPLETE : STATUS.PENDING,
      interventions.length ? interventions.map((i) => i.name).join('; ') : 'No control recorded.'
    )
  );

  // 7 — expected effects defined before review
  const withExpectations = interventions.filter((i) => i.expectedEffects?.length);
  components.push(
    component(
      'expectedEffects',
      'Expected effects defined',
      interventions.length === 0
        ? STATUS.PENDING
        : withExpectations.length === interventions.length
          ? STATUS.COMPLETE
          : STATUS.PARTIAL,
      withExpectations.length
        ? `${withExpectations.length} of ${interventions.length} control(s) have expected effects recorded.`
        : ''
    )
  );

  // 8 — post-intervention data
  const postInfo = describePostPeriod(interventions, defaults);
  components.push(
    component('postPeriodData', 'Post-intervention data', postInfo.status, postInfo.detail)
  );

  // 9 — sustainability window
  const sustainInfo = describeSustainability(interventions, evaluations, defaults);
  components.push(
    component('sustainability', 'Sustainability window', sustainInfo.status, sustainInfo.detail)
  );

  // 10 — workload migration check
  components.push(
    component(
      'migrationCheck',
      'Workload migration check',
      evaluations.length === 0
        ? STATUS.PENDING
        : STATUS.COMPLETE,
      migrations.length
        ? `${migrations.length} possible migration finding(s) raised.`
        : evaluations.length
          ? 'Checked; no material migration flagged.'
          : 'Runs once a post-period comparison exists.'
    )
  );

  // 11 — worker follow-up after implementation
  const followUps = consultations.filter((c) => c.isPostInterventionFollowUp);
  components.push(
    component(
      'workerFollowUp',
      'Worker follow-up',
      followUps.length > 0 ? STATUS.COMPLETE : STATUS.PENDING,
      followUps.length
        ? `${followUps.length} post-implementation follow-up record(s).`
        : 'Recommended. A missing follow-up is shown as incomplete, not as a failed control.'
    )
  );

  // 12 — organisation decision
  components.push(
    component(
      'organisationDecision',
      'Organisation decision',
      caseDoc.decisionRecordedAt ? STATUS.COMPLETE : STATUS.PENDING,
      caseDoc.decisionRecordedAt ? caseDoc.organisationDecision : 'Not recorded.'
    )
  );

  const outstanding = components.filter((c) => c.status === STATUS.PENDING || c.status === STATUS.PARTIAL);

  return {
    caseId: String(caseDoc._id),
    caseNumber: caseDoc.caseNumber,
    components,
    outstanding: outstanding.map((c) => c.label),
    // Deliberately not a score, a percentage or a verdict.
    note: 'SignalTrue reports which review components are recorded. Whether the evidence is sufficient is the organisation’s judgement.',
    mixedEvidence: assessMixedEvidence({ evaluations, consultations: followUps.length ? followUps : consultations }),
  };
}

function describePostPeriod(interventions, defaults) {
  if (interventions.length === 0) {
    return { status: STATUS.PENDING, detail: 'No control recorded yet.' };
  }

  const now = new Date();
  const descriptions = interventions.map((intervention) => {
    const periods = analysisPeriods(intervention, defaults);
    const postDays = intervention.postPeriodDays ?? defaults.postPeriodDays;
    if (now >= periods.postEnd) return { done: true, text: `${postDays} days available` };
    const remaining = Math.max(0, Math.ceil((periods.postEnd - now) / DAY_MS));
    return { done: false, text: `${remaining} days remaining` };
  });

  const allDone = descriptions.every((d) => d.done);
  return {
    status: allDone ? STATUS.COMPLETE : STATUS.PENDING,
    detail: descriptions.map((d) => d.text).join('; '),
  };
}

function describeSustainability(interventions, evaluations, defaults) {
  if (interventions.length === 0) {
    return { status: STATUS.PENDING, detail: 'No control recorded yet.' };
  }

  const assessed = evaluations.filter((e) => e.sustained !== null && e.sustained !== undefined);
  if (assessed.length === 0) {
    const now = new Date();
    const remainingWeeks = interventions.map((intervention) => {
      const periods = analysisPeriods(intervention, defaults);
      const windows = intervention.sustainabilityPeriods ?? defaults.sustainabilityPeriods;
      const end = new Date(periods.postEnd.getTime() + windows * 7 * DAY_MS);
      return Math.max(0, Math.ceil((end - now) / (7 * DAY_MS)));
    });
    return {
      status: STATUS.PENDING,
      detail: `${Math.max(...remainingWeeks)} week(s) remaining in the sustainability window.`,
    };
  }

  const rebounds = assessed.filter((e) => e.reboundDetected);
  return {
    status: STATUS.COMPLETE,
    detail: rebounds.length
      ? `Initial improvement was not sustained for ${rebounds.length} metric(s).`
      : 'Observed changes held through the sustainability window.',
  };
}

/**
 * Mixed evidence (§18.2).
 *
 * Work-pattern metrics and worker feedback are never collapsed into one score.
 * When they point in different directions, the product says so and stops.
 */
export function assessMixedEvidence({ evaluations = [], consultations = [] }) {
  const expected = evaluations.filter((e) => e.isExpectedEffect && e.evaluationPossible);
  if (expected.length === 0) return { present: false, statement: '', workerDirection: 'NOT_ASSESSED' };

  const matched = expected.filter((e) => e.directionMatched && e.materialChange);
  const metricsImproved = matched.length > 0 && matched.length === expected.filter((e) => e.materialChange).length;
  const metricsWorsened = expected.some((e) => e.materialChange && e.directionMatched === false);

  const latestConsultation = [...consultations]
    .filter((c) => c.workerReportedDirection && c.workerReportedDirection !== 'NOT_ASSESSED')
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const workerDirection = latestConsultation?.workerReportedDirection || 'NOT_ASSESSED';

  if (workerDirection === 'NOT_ASSESSED') {
    return { present: false, statement: '', workerDirection };
  }

  if (metricsImproved && workerDirection === 'WORSENED') {
    return {
      present: true,
      workerDirection,
      statement:
        'Mixed evidence. Work-pattern metrics moved in the intended direction while workers reported that the work has become harder. Further investigation may be required.',
    };
  }

  if ((metricsWorsened || !metricsImproved) && workerDirection === 'IMPROVED') {
    return {
      present: true,
      workerDirection,
      statement:
        'Mixed evidence. Workers reported improvement while the observed work patterns did not move in the intended direction. Further investigation may be required.',
    };
  }

  return { present: false, workerDirection, statement: '' };
}

export const COMPLETENESS_STATUS = STATUS;

export default { assessCompleteness, assessMixedEvidence, COMPLETENESS_STATUS };
