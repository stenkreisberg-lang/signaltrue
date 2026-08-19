/**
 * Review Evidence Pack (spec §20).
 *
 * A structured record of the review process, useful for internal governance,
 * audit preparation and HSR/leadership review. It does not claim to prove legal
 * compliance, and the disclaimer in §20.1 appears verbatim on the first page.
 *
 * Every value printed is drawn from stored calculations and frozen into the
 * snapshot, so a pack can be reconciled against its source months later
 * (§37: "all included values match source calculations").
 */

import PDFDocument from 'pdfkit';
import ControlReviewCase from '../../models/controlReview/controlReviewCase.js';
import TriggerEvidence from '../../models/controlReview/triggerEvidence.js';
import ConsultationRecord from '../../models/controlReview/consultationRecord.js';
import ControlIntervention from '../../models/controlReview/controlIntervention.js';
import InterventionEvaluation from '../../models/controlReview/interventionEvaluation.js';
import MigrationFinding from '../../models/controlReview/migrationFinding.js';
import SignalObservation from '../../models/controlReview/signalObservation.js';
import EvidencePack from '../../models/controlReview/evidencePack.js';
import Team from '../../models/team.js';
import User from '../../models/user.js';
import {
  REQUIRED_DISCLAIMER,
  METRIC_LABELS,
  METRIC_UNITS,
  ALGORITHM_VERSION,
} from '../../models/controlReview/constants.js';
import { assessCompleteness } from './reviewCompletenessService.js';
import { buildInterpretation } from './hsInterpretationService.js';
import { overlappingContext } from './controlReviewCaseService.js';
import { recordAudit, caseTimeline } from './auditService.js';
import { describeEvaluation, analysisPeriods, resolveEvaluationDefaults } from './interventionEvaluationService.js';

const INK = '#111827';
const MUTED = '#6B7280';
const RULE = '#E5E7EB';
const ACCENT = '#1F3A5F';

function fmtDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtPct(value) {
  if (value === null || value === undefined) return '—';
  const pct = Math.round(value * 100);
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

function fmtNumber(value) {
  if (value === null || value === undefined) return 'suppressed';
  return Number(value).toFixed(2);
}

/** Gather every input the pack renders, so the snapshot and the PDF agree. */
export async function assembleEvidence({ tenantId, caseId }) {
  const caseDoc = await ControlReviewCase.findOne({ _id: caseId, tenantId }).lean();
  if (!caseDoc) throw new Error('Case not found');

  const defaults = await resolveEvaluationDefaults(tenantId);

  const [evidence, consultations, interventions, teams, owner, completeness] = await Promise.all([
    TriggerEvidence.find({ tenantId, caseId }).sort({ createdAt: 1 }).lean(),
    ConsultationRecord.find({ tenantId, caseId }).sort({ date: 1 }).lean(),
    ControlIntervention.find({ tenantId, caseId }).sort({ implementationDate: 1 }).lean(),
    Team.find({ _id: { $in: caseDoc.teamIds } }).select('name').lean(),
    User.findById(caseDoc.caseOwner).select('name email').lean(),
    assessCompleteness({ tenantId, caseId }),
  ]);

  const interventionIds = interventions.map((i) => i._id);

  const [evaluations, migrations] = await Promise.all([
    interventionIds.length
      ? InterventionEvaluation.find({ tenantId, interventionId: { $in: interventionIds } }).lean()
      : [],
    interventionIds.length
      ? MigrationFinding.find({ tenantId, interventionId: { $in: interventionIds } }).lean()
      : [],
  ]);

  const analysisStart = interventions.length
    ? analysisPeriods(interventions[0], defaults).preStart
    : caseDoc.openedAt;
  const analysisEnd = interventions.length
    ? analysisPeriods(interventions[interventions.length - 1], defaults).postEnd
    : new Date();

  const [contextEvents, observations, timeline] = await Promise.all([
    overlappingContext({ tenantId, teamIds: caseDoc.teamIds, from: analysisStart, to: analysisEnd }),
    SignalObservation.find({
      tenantId,
      teamId: { $in: caseDoc.teamIds },
      periodStart: { $gte: analysisStart, $lte: analysisEnd },
      status: 'DEVIATION_OBSERVED',
    })
      .sort({ periodStart: 1 })
      .lean(),
    caseTimeline({ tenantId, caseId, relatedIds: [...interventionIds, ...consultations.map((c) => c._id)] }),
  ]);

  const interpretation = buildInterpretation({
    caseDoc,
    observations,
    evaluations,
    migrations,
    consultations,
    contextEvents,
    completeness,
  });

  return {
    caseDoc,
    evidence,
    consultations,
    interventions,
    evaluations,
    migrations,
    contextEvents,
    observations,
    completeness,
    interpretation,
    timeline,
    teams,
    owner,
    analysisPeriod: { start: analysisStart, end: analysisEnd },
  };
}

/**
 * Render the pack. Returns { buffer, snapshot } — the caller persists and
 * audits, so this function stays a pure renderer.
 */
export async function renderEvidencePack({ tenantId, caseId }) {
  const data = await assembleEvidence({ tenantId, caseId });
  const buffer = await drawPdf(data);
  return { buffer, snapshot: buildSnapshot(data), data };
}

function buildSnapshot(data) {
  return {
    caseNumber: data.caseDoc.caseNumber,
    title: data.caseDoc.title,
    trigger: data.caseDoc.trigger,
    teams: data.teams.map((t) => t.name),
    observations: data.observations.map((o) => ({
      metric: o.metric,
      periodStart: o.periodStart,
      currentValue: o.currentValue,
      baselineValue: o.baselineValue,
      relativeChange: o.relativeChange,
      robustDeviationScore: o.robustDeviationScore,
      persistencePeriods: o.persistencePeriods,
      dataQuality: o.dataQuality,
      algorithmVersion: o.algorithmVersion,
    })),
    evaluations: data.evaluations.map((e) => ({
      metric: e.metric,
      isExpectedEffect: e.isExpectedEffect,
      prePeriodValue: e.prePeriodValue,
      postPeriodValue: e.postPeriodValue,
      relativeChange: e.relativeChange,
      expectedDirection: e.expectedDirection,
      directionMatched: e.directionMatched,
      sustained: e.sustained,
      reboundDetected: e.reboundDetected,
      dataQuality: e.dataQuality,
      evaluationPossible: e.evaluationPossible,
      unavailableReason: e.unavailableReason,
      analysisPeriod: e.analysisPeriod,
      algorithmVersion: e.algorithmVersion,
    })),
    migrations: data.migrations.map((m) => ({
      migrationType: m.migrationType,
      sourceMetric: m.sourceMetric,
      sourceChange: m.sourceChange,
      destinationMetric: m.destinationMetric,
      destinationChange: m.destinationChange,
      severity: m.severity,
      status: m.status,
      summary: m.summary,
    })),
    completeness: data.completeness,
    interpretation: data.interpretation,
    decision: {
      status: data.caseDoc.status,
      organisationDecision: data.caseDoc.organisationDecision,
      decisionNotes: data.caseDoc.decisionNotes,
      decisionRecordedAt: data.caseDoc.decisionRecordedAt,
    },
    algorithmVersion: ALGORITHM_VERSION,
    generatedAt: new Date(),
  };
}

function drawPdf(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { caseDoc } = data;

    // ── Cover ────────────────────────────────────────────────────────────────
    doc.fillColor(ACCENT).fontSize(22).text('Control Review Evidence Pack');
    doc.moveDown(0.3);
    doc.fillColor(INK).fontSize(15).text(`${caseDoc.caseNumber} — ${caseDoc.title}`);
    doc.moveDown(0.2);
    doc
      .fillColor(MUTED)
      .fontSize(9)
      .text(`Generated ${fmtDate(new Date())} · Algorithm version ${ALGORITHM_VERSION}`);
    doc.moveDown(1);

    // §20.1 — required disclaimer, verbatim, before any finding.
    boxedNote(doc, REQUIRED_DISCLAIMER);
    doc.moveDown(0.8);

    section(doc, '1. Case information and trigger source');
    keyValues(doc, [
      ['Case number', caseDoc.caseNumber],
      ['Status', caseDoc.status.replace(/_/g, ' ')],
      ['Trigger type', caseDoc.trigger.type.replace(/_/g, ' ')],
      ['Trigger date', fmtDate(caseDoc.trigger.date)],
      ['Trigger reference', caseDoc.trigger.reference || '—'],
      ['Teams', data.teams.map((t) => t.name).join(', ') || '—'],
      ['Case owner', data.owner?.name || data.owner?.email || '—'],
      ['Opened', fmtDate(caseDoc.openedAt)],
      ['Closed', fmtDate(caseDoc.closedAt)],
    ]);

    section(doc, '2. Why the review was opened');
    paragraph(doc, caseDoc.initialEvidenceSummary || caseDoc.description || 'Not recorded.');
    if (data.evidence.length) {
      for (const item of data.evidence) {
        bullet(
          doc,
          `${item.sourceName}${item.sourceDate ? ` (${fmtDate(item.sourceDate)})` : ''} — ${
            item.summary || 'No summary recorded.'
          }`
        );
      }
    }

    section(doc, '3. Observed work-pattern evidence');
    if (data.observations.length === 0) {
      paragraph(doc, 'No persistent deviation from the team’s own baseline was recorded in this period.');
    } else {
      // One row per metric. Listing every weekly period repeats the same
      // deviation a dozen times and buries what actually changed.
      const summary = summariseObservations(data.observations);
      table(
        doc,
        ['Metric', 'Periods observed', 'Latest vs baseline', 'Largest change', 'Persist.'],
        summary.map((row) => [
          METRIC_LABELS[row.metric] || row.metric,
          `${fmtDate(row.firstPeriod)} – ${fmtDate(row.lastPeriod)}`,
          `${fmtNumber(row.latestValue)} vs ${fmtNumber(row.baselineValue)}`,
          fmtPct(row.peakChange),
          `${row.maxPersistence}w`,
        ]),
        [130, 130, 95, 70, 40]
      );
      doc.moveDown(0.3);
      doc
        .fillColor(MUTED)
        .fontSize(8)
        .text(
          'Comparison is against each team’s own rolling baseline. “Largest change” is the biggest deviation observed across the range, which may predate the control. Persistence counts consecutive weekly periods in the same direction.',
          LEFT,
          doc.y,
          { width: TEXT_WIDTH }
        );
    }

    section(doc, '4. Data context and methodology');
    paragraph(
      doc,
      'Metrics are calculated from content-free work-event metadata. No message body, email body or document content is processed. Comparison is always against this team’s own historical pattern using robust statistics (median and median absolute deviation), never against an external benchmark.'
    );
    keyValues(doc, [
      ['Baseline', 'Rolling 8 weeks, excluding the current week'],
      ['Analysis period', `${fmtDate(data.analysisPeriod.start)} – ${fmtDate(data.analysisPeriod.end)}`],
      ['Algorithm version', ALGORITHM_VERSION],
      [
        'Metric units',
        (caseDoc.monitoredMetrics || [])
          .map((m) => `${METRIC_LABELS[m] || m}: ${METRIC_UNITS[m] || '—'}`)
          .join('; ') || '—',
      ],
    ]);

    section(doc, '5. Relevant organisational context');
    if (data.contextEvents.length === 0) {
      paragraph(doc, 'No organisational context events were recorded overlapping the analysis period.');
    } else {
      for (const event of data.contextEvents) {
        bullet(
          doc,
          `${event.name} (${event.eventType.replace(/_/g, ' ')}) — ${fmtDate(event.startDate)} to ${fmtDate(
            event.endDate
          )}. ${event.notes || ''}`
        );
      }
    }

    section(doc, '6. Investigation record');
    const investigation = caseDoc.investigation || {};
    keyValues(doc, [
      ['What is known', investigation.whatIsKnown || '—'],
      ['What is uncertain', investigation.whatIsUncertain || '—'],
      ['Why review is needed', investigation.whyReviewIsNeeded || '—'],
      ['Open questions', (investigation.openQuestions || []).join('; ') || '—'],
    ]);

    section(doc, '7. Worker consultation');
    if (caseDoc.consultationNotApplicable?.isNotApplicable) {
      paragraph(doc, `Recorded as not applicable: ${caseDoc.consultationNotApplicable.reason}`);
    } else if (data.consultations.length === 0) {
      paragraph(doc, 'No consultation record has been entered for this case.');
    } else {
      for (const record of data.consultations) {
        doc.moveDown(0.3);
        doc
          .fillColor(INK)
          .fontSize(10)
          .text(
            `${fmtDate(record.date)} · ${record.method.replace(/_/g, ' ')}${
              record.hsrInvolved ? ' · HSR involved' : ''
            }${record.isPostInterventionFollowUp ? ' · post-implementation follow-up' : ''}`,
            { continued: false }
          );
        if (record.groupDescription) {
          doc.fillColor(MUTED).fontSize(9).text(record.groupDescription);
        }
        labelledList(doc, 'Worker views', record.workerViews);
        labelledList(doc, 'Management response', record.managementResponse);
        labelledList(doc, 'Impact on the decision', record.decisionImpact);
        doc
          .fillColor(MUTED)
          .fontSize(9)
          .text(
            `Feedback back to workers: ${
              record.feedbackBackToWorkers?.provided
                ? `${fmtDate(record.feedbackBackToWorkers.date)} — ${record.feedbackBackToWorkers.description}`
                : 'not recorded'
            }`
          );
      }
    }

    section(doc, '8. Action / control details and owner');
    if (data.interventions.length === 0) {
      paragraph(doc, 'No control has been recorded for this case.');
    } else {
      for (const intervention of data.interventions) {
        keyValues(doc, [
          ['Control', intervention.name],
          ['Type', intervention.interventionType.replace(/_/g, ' ')],
          ['Description', intervention.description || '—'],
          ['Implementation date', fmtDate(intervention.implementationDate)],
          ['Implementation confirmed', intervention.implementationConfirmed ? 'Yes' : 'No'],
          ['Status', intervention.status],
        ]);
      }
    }

    section(doc, '9. Expected effects recorded before review');
    for (const intervention of data.interventions) {
      doc.fillColor(MUTED).fontSize(9).text(
        `Recorded ${fmtDate(intervention.expectedEffectsRecordedAt)} — before the post-period comparison.`
      );
      for (const effect of intervention.expectedEffects || []) {
        bullet(
          doc,
          `${METRIC_LABELS[effect.metric] || effect.metric}: expected to ${effect.direction.toLowerCase()}${
            effect.rationale ? ` — ${effect.rationale}` : ''
          }`
        );
      }
    }
    if (data.interventions.length === 0) paragraph(doc, '—');

    section(doc, '10. Before / after evidence');
    const comparable = data.evaluations.filter((e) => e.evaluationPossible);
    if (comparable.length === 0) {
      paragraph(doc, 'No before/after comparison is available. See section 13 for the reason.');
    } else {
      table(
        doc,
        ['Metric', 'Pre', 'Post', 'Change', 'Expected', 'Matched'],
        comparable.map((e) => [
          `${METRIC_LABELS[e.metric] || e.metric}${e.isExpectedEffect ? ' *' : ''}`,
          fmtNumber(e.prePeriodValue),
          fmtNumber(e.postPeriodValue),
          fmtPct(e.relativeChange),
          e.expectedDirection === 'NOT_SPECIFIED' ? '—' : e.expectedDirection.toLowerCase(),
          e.directionMatched === null ? '—' : e.directionMatched ? 'yes' : 'no',
        ]),
        [150, 55, 55, 55, 70, 50]
      );
      doc.moveDown(0.3);
      doc.fillColor(MUTED).fontSize(8).text('* metric the organisation expected this control to change');
      doc.moveDown(0.4);
      for (const evaluation of comparable.filter((e) => e.isExpectedEffect)) {
        bullet(doc, describeEvaluation(evaluation, (METRIC_LABELS[evaluation.metric] || '').toLowerCase()));
      }
    }

    section(doc, '11. Sustainability and rebound evidence');
    const assessed = data.evaluations.filter((e) => e.sustained !== null && e.sustained !== undefined);
    if (assessed.length === 0) {
      paragraph(doc, 'The sustainability window has not yet produced comparable data.');
    } else {
      for (const evaluation of assessed) {
        // "Held" would read as good news on a metric that rose against the
        // intended direction, so the wording stays neutral unless the movement
        // was one the organisation actually wanted.
        const wanted = evaluation.isExpectedEffect && evaluation.directionMatched;
        const outcome = evaluation.reboundDetected
          ? wanted
            ? 'initial improvement was not sustained.'
            : 'the change observed after implementation reversed during the sustainability window.'
          : wanted
            ? 'the improvement held through the sustainability window.'
            : 'the change observed after implementation persisted through the sustainability window.';
        bullet(doc, `${METRIC_LABELS[evaluation.metric] || evaluation.metric}: ${outcome}`);
      }
    }

    section(doc, '12. Workload migration check');
    if (data.migrations.length === 0) {
      paragraph(
        doc,
        'Other coordination, time and team metrics were compared over the same post period. No material migration was flagged.'
      );
    } else {
      for (const migration of data.migrations) {
        bullet(doc, migration.summary);
        doc.fillColor(MUTED).fontSize(9);
        for (const question of (migration.investigationQuestions || []).slice(0, 3)) {
          doc.text(`    · ${question}`, { width: 460 });
        }
        doc.fillColor(INK).fontSize(10);
      }
    }

    section(doc, '13. Worker follow-up');
    const followUps = data.consultations.filter((c) => c.isPostInterventionFollowUp);
    if (followUps.length === 0) {
      paragraph(
        doc,
        'No post-implementation worker follow-up has been recorded. This is shown as an incomplete review component, not as a failed control.'
      );
    } else {
      for (const record of followUps) {
        bullet(
          doc,
          `${fmtDate(record.date)} — ${record.summary || 'Recorded.'} Worker-reported direction: ${record.workerReportedDirection.toLowerCase()}.`
        );
      }
    }

    section(doc, '14. SignalTrue plain-language interpretation');
    for (const [block, lines] of Object.entries(data.interpretation.blocks)) {
      if (!lines.length) continue;
      doc.moveDown(0.25);
      doc.fillColor(ACCENT).fontSize(9.5).text(block.replace(/_/g, ' '));
      doc.fillColor(INK).fontSize(9.5);
      for (const line of lines) bullet(doc, line);
    }

    section(doc, '15. Organisation decision');
    if (!caseDoc.decisionRecordedAt) {
      paragraph(doc, 'No organisation decision has been recorded. Only a person can record this decision.');
    } else {
      keyValues(doc, [
        ['Decision', caseDoc.organisationDecision],
        ['Notes', caseDoc.decisionNotes || '—'],
        ['Recorded', fmtDate(caseDoc.decisionRecordedAt)],
        ['Next review', fmtDate(caseDoc.nextReviewDate)],
        ['Closure status', caseDoc.status.replace(/_/g, ' ')],
      ]);
    }

    section(doc, '16. Review completeness');
    table(
      doc,
      ['Component', 'Status', 'Detail'],
      data.completeness.components.map((c) => [c.label, c.status.replace(/_/g, ' '), c.detail || '—']),
      [150, 80, 205]
    );
    doc.moveDown(0.4);
    doc.fillColor(MUTED).fontSize(8.5).text(data.completeness.note, { width: 460 });

    section(doc, '17. Audit timeline');
    if (data.timeline.length === 0) {
      paragraph(doc, 'No audit events recorded.');
    } else {
      for (const event of data.timeline) {
        doc
          .fillColor(INK)
          .fontSize(9)
          .text(
            `${fmtDate(event.timestamp)} · ${event.action.replace(/_/g, ' ')} · ${
              event.actorEmail || event.actorType
            }`
          );
      }
    }

    section(doc, 'Methodology and limitations appendix');
    for (const line of data.interpretation.blocks.LIMITATIONS || []) bullet(doc, line);
    bullet(
      doc,
      'Team-level output only. Groups below the configured minimum size are suppressed or aggregated upward, including in this pack.'
    );
    bullet(
      doc,
      'No individual psychological, burnout, engagement or productivity score exists in this product.'
    );
    doc.moveDown(0.6);
    boxedNote(doc, REQUIRED_DISCLAIMER);

    // Page numbers. The bottom margin is cleared first: writing inside it is
    // what makes PDFKit break to a new page and append blanks behind the pack.
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;
      doc
        .fillColor(MUTED)
        .fontSize(8)
        .text(
          `${caseDoc.caseNumber} · Control Review Evidence Pack · page ${i + 1} of ${range.count}`,
          LEFT,
          doc.page.height - 35,
          { width: doc.page.width - 100, align: 'center', lineBreak: false }
        );
    }
    doc.flushPages();

    doc.end();
  });
}

/** Collapse per-period observations into one row per metric. */
function summariseObservations(observations) {
  const byMetric = new Map();

  for (const observation of observations) {
    const existing = byMetric.get(observation.metric);
    if (!existing) {
      byMetric.set(observation.metric, {
        metric: observation.metric,
        firstPeriod: observation.periodStart,
        lastPeriod: observation.periodStart,
        latestValue: observation.currentValue,
        baselineValue: observation.baselineValue,
        peakChange: observation.relativeChange,
        maxPersistence: observation.persistencePeriods,
      });
      continue;
    }

    if (observation.periodStart < existing.firstPeriod) existing.firstPeriod = observation.periodStart;
    if (observation.periodStart >= existing.lastPeriod) {
      existing.lastPeriod = observation.periodStart;
      existing.latestValue = observation.currentValue;
      existing.baselineValue = observation.baselineValue;
    }
    if (Math.abs(observation.relativeChange ?? 0) > Math.abs(existing.peakChange ?? 0)) {
      existing.peakChange = observation.relativeChange;
    }
    existing.maxPersistence = Math.max(existing.maxPersistence, observation.persistencePeriods);
  }

  return [...byMetric.values()].sort((a, b) => Math.abs(b.peakChange ?? 0) - Math.abs(a.peakChange ?? 0));
}

// ── Drawing helpers ──────────────────────────────────────────────────────────

function section(doc, title) {
  if (doc.y > doc.page.height - 140) doc.addPage();
  doc.moveDown(0.8);
  doc.fillColor(ACCENT).fontSize(12).text(title, LEFT, doc.y, { width: TEXT_WIDTH });
  doc.moveTo(50, doc.y + 2).lineTo(doc.page.width - 50, doc.y + 2).strokeColor(RULE).stroke();
  doc.moveDown(0.5);
  doc.fillColor(INK).fontSize(10);
}

// Every text helper anchors at the left margin. keyValues() and table() leave
// the pen indented, and inheriting that indent is what clips prose off the
// right edge of the page.
const LEFT = 50;
const TEXT_WIDTH = 495;

function paragraph(doc, text) {
  doc.fillColor(INK).fontSize(10).text(text, LEFT, doc.y, { width: TEXT_WIDTH });
  doc.moveDown(0.3);
}

function bullet(doc, text) {
  if (doc.y > doc.page.height - 90) doc.addPage();
  doc.fillColor(INK).fontSize(9.5).text(`•  ${text}`, LEFT, doc.y, { width: TEXT_WIDTH });
  doc.moveDown(0.15);
}

function keyValues(doc, pairs) {
  for (const [key, value] of pairs) {
    if (doc.y > doc.page.height - 90) doc.addPage();
    const y = doc.y;
    doc.fillColor(MUTED).fontSize(9).text(key, LEFT, y, { width: 130 });
    doc.fillColor(INK).fontSize(9.5).text(String(value ?? '—'), 185, y, { width: 360 });
    doc.moveDown(0.25);
  }
  doc.moveDown(0.2);
  doc.x = LEFT;
}

function labelledList(doc, label, items = []) {
  if (!items.length) return;
  doc.fillColor(MUTED).fontSize(9).text(`${label}:`, LEFT, doc.y, { width: TEXT_WIDTH });
  doc.fillColor(INK).fontSize(9.5);
  for (const item of items) {
    if (doc.y > doc.page.height - 80) doc.addPage();
    doc.text(`    · ${item}`, LEFT, doc.y, { width: TEXT_WIDTH });
  }
  doc.moveDown(0.2);
}

function table(doc, headers, rows, widths) {
  const startX = 50;
  let y = doc.y;

  doc.fillColor(MUTED).fontSize(8.5);
  let x = startX;
  headers.forEach((header, i) => {
    doc.text(header, x, y, { width: widths[i] });
    x += widths[i];
  });
  y += 14;
  doc.moveTo(startX, y - 3).lineTo(doc.page.width - 50, y - 3).strokeColor(RULE).stroke();

  doc.fillColor(INK).fontSize(9);
  for (const row of rows) {
    const heights = row.map((cell, i) =>
      doc.heightOfString(String(cell ?? '—'), { width: widths[i] })
    );
    const rowHeight = Math.max(...heights, 12);

    if (y + rowHeight > doc.page.height - 70) {
      doc.addPage();
      y = doc.y;
    }

    x = startX;
    row.forEach((cell, i) => {
      doc.text(String(cell ?? '—'), x, y, { width: widths[i] });
      x += widths[i];
    });
    y += rowHeight + 5;
  }
  doc.y = y + 4;
  doc.x = LEFT;
}

function boxedNote(doc, text) {
  doc.fontSize(8.5);
  const height = doc.heightOfString(text, { width: 465 }) + 16;
  const top = doc.y;
  doc.rect(LEFT, top, doc.page.width - 100, height).fillAndStroke('#F3F4F6', RULE);
  doc.fillColor(INK).fontSize(8.5).text(text, 65, top + 8, { width: 465 });
  doc.y = top + height;
}

/**
 * Generate, persist and audit a pack. Every export is logged (§23, §36.21).
 */
export async function generateEvidencePack({ tenantId, caseId, actor, req = null }) {
  const { buffer, snapshot, data } = await renderEvidencePack({ tenantId, caseId });

  const previous = await EvidencePack.findOne({ tenantId, caseId }).sort({ version: -1 }).lean();
  const version = (previous?.version || 0) + 1;
  const fileName = `${data.caseDoc.caseNumber}-evidence-pack-v${version}.pdf`;

  const pack = await EvidencePack.create({
    tenantId,
    caseId,
    caseNumber: data.caseDoc.caseNumber,
    version,
    format: 'PDF',
    fileName,
    byteLength: buffer.length,
    snapshot,
    completenessAtGeneration: data.completeness,
    generatedBy: actor.userId,
    generatedAt: new Date(),
  });

  await recordAudit({
    tenantId,
    actor,
    action: 'EVIDENCE_PACK_GENERATED',
    objectType: 'EvidencePack',
    objectId: pack._id,
    metadata: { caseId: String(caseId), version, fileName, byteLength: buffer.length },
    req,
  });

  return { pack, buffer, fileName };
}

/**
 * Re-render an existing pack for download.
 *
 * Downloading is not generating: the pack keeps its own version and file name,
 * so a reviewer who was handed "v2" receives v2 rather than minting a new
 * version on every click. The export is still audited (§23, §36.21).
 */
export async function exportEvidencePack({ tenantId, packId, actor, req = null }) {
  const pack = await EvidencePack.findOne({ _id: packId, tenantId }).lean();
  if (!pack) throw new Error('Evidence pack not found');

  const { buffer } = await renderEvidencePack({ tenantId, caseId: pack.caseId });

  await recordAudit({
    tenantId,
    actor,
    action: 'EVIDENCE_PACK_EXPORTED',
    objectType: 'EvidencePack',
    objectId: pack._id,
    metadata: {
      caseId: String(pack.caseId),
      version: pack.version,
      fileName: pack.fileName,
      byteLength: buffer.length,
    },
    req,
  });

  return { pack, buffer, fileName: pack.fileName };
}

export default { assembleEvidence, renderEvidencePack, generateEvidencePack, exportEvidencePack };
