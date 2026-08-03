import IntegrationConnection from '../models/integrationConnection.js';
import Intervention from '../models/intervention.js';
import OperationalOutcome from '../models/operationalOutcome.js';
import ValidationEvidence from '../models/validationEvidence.js';
import ValidationStudy from '../models/validationStudy.js';

export const VALIDATION_STUDIES = [
  {
    key: 'connector_accuracy',
    order: 1,
    phase: 'Prove the data',
    title: 'Connector accuracy and reconciliation',
    question: 'Do normalized SignalTrue records agree with source-of-truth exports?',
    output:
      'Missing, duplicate, count-agreement, timestamp, timezone, and synchronization-delay results by connector.',
    clientValue: 'Shows whether the client can rely on the underlying imported records.',
    signalTrueValue: 'Finds adapter defects and establishes connector-specific quality limits.',
  },
  {
    key: 'measurement_reliability',
    order: 2,
    phase: 'Prove the data',
    title: 'Reliability and missing-data sensitivity',
    question: 'Are results repeatable, stable, and appropriately suppressed as coverage changes?',
    output:
      'Repeatability, baseline stability, missing-data sensitivity, and minimum-data requirements.',
    clientValue: 'Explains when a displayed result is stable enough to review.',
    signalTrueValue: 'Determines readiness gates without inventing universal confidence bands.',
  },
  {
    key: 'construct_validation',
    order: 3,
    phase: 'Prove meaning',
    title: 'Metadata versus validated survey constructs',
    question: 'Which metadata patterns relate to independently measured work experiences?',
    output:
      'Pre-registered construct associations, measurement error, subgroup results, and null findings.',
    clientValue:
      'Separates meaningful associations from attractive but unsupported interpretations.',
    signalTrueValue: 'Supports, revises, or retires model components and language.',
  },
  {
    key: 'network_map_validation',
    order: 4,
    phase: 'Prove meaning',
    title: 'Formal versus observed network validation',
    question: 'How accurately does the inferred work network represent known dependencies?',
    output:
      'Precision, recall, stability, channel coverage, and agreement with directory and survey ties.',
    clientValue: 'Adds confidence to cross-team dependency and bottleneck-candidate reviews.',
    signalTrueValue:
      'Calibrates edge construction and prevents centrality from becoming a people ranking.',
  },
  {
    key: 'longitudinal_validation',
    order: 5,
    phase: 'Prove actionability',
    title: 'Prospective longitudinal validation',
    question: 'Do signals precede independently measured operational outcomes?',
    output:
      'Lead time, base rates, calibration, false alarms, missed outcomes, and subgroup results.',
    clientValue: 'Shows whether an early signal is useful enough to act on.',
    signalTrueValue: 'Distinguishes directional hypotheses from validated forecasts.',
  },
  {
    key: 'intervention_effectiveness',
    order: 6,
    phase: 'Prove actionability',
    title: 'Intervention effectiveness',
    question: 'Do SignalTrue-guided operating changes improve pre-specified outcomes?',
    output:
      'Adoption, before/after change, comparison-group effect where feasible, negative effects, and persistence.',
    clientValue: 'Demonstrates whether a specific management action worked in the client context.',
    signalTrueValue: 'Builds an outcome-backed recommendation library including failed actions.',
  },
  {
    key: 'external_validation',
    order: 7,
    phase: 'Prove credibility',
    title: 'External validation',
    question: 'Do results generalize to organizations not used during development?',
    output: 'Performance by organization size, industry, work model, connector, and geography.',
    clientValue: 'Shows how relevant the evidence is to the client rather than to one pilot.',
    signalTrueValue: 'Defines the population and settings in which each claim is supportable.',
  },
  {
    key: 'independent_review',
    order: 8,
    phase: 'Prove credibility',
    title: 'Independent methodological and privacy review',
    question:
      'Do external reviewers find the methods, claims, controls, and limitations defensible?',
    output: 'Versioned review report, required corrections, residual risks, and re-review date.',
    clientValue: 'Provides assurance beyond SignalTrue reviewing its own work.',
    signalTrueValue: 'Creates an accountable governance and correction process.',
  },
];

export const METRIC_REGISTRY = [
  {
    key: 'meeting_instance_count',
    label: 'Meeting instances',
    measurementClass: 'observed',
    validationStatus: 'technical_validation_planned',
    source: 'Calendar metadata',
    definition: 'Deduplicated scheduled meeting instances in the selected period.',
    denominator: 'None; count for the selected scope and period.',
    limitation: 'A scheduled meeting does not prove that every invitee attended.',
  },
  {
    key: 'meeting_participant_hours',
    label: 'Meeting participant-hours',
    measurementClass: 'derived',
    validationStatus: 'technical_validation_planned',
    source: 'Calendar duration and internal attendee metadata',
    definition: 'Meeting duration multiplied by represented internal participants, then summed.',
    denominator: 'None unless explicitly displayed per mapped person.',
    limitation: 'Calendar participation may differ from actual attendance or attention.',
  },
  {
    key: 'after_hours_activity_share',
    label: 'Activity outside configured working hours',
    measurementClass: 'derived',
    validationStatus: 'technical_validation_planned',
    source: 'Timestamp metadata plus organization timezone and schedule',
    definition: 'Eligible activity outside configured hours divided by all eligible activity.',
    denominator: 'Eligible measured activity for the same source and period.',
    limitation: 'Activity timing does not measure pressure, distress, burnout, or work intensity.',
  },
  {
    key: 'calendar_gap_availability',
    label: 'Calendar gap availability',
    measurementClass: 'derived',
    validationStatus: 'technical_validation_planned',
    source: 'Calendar metadata',
    definition: 'Scheduled working-time gaps remaining between calendar events.',
    denominator: 'Configured working time represented by connected calendars.',
    limitation: 'An open calendar interval is not verified focus, productivity, or recovery time.',
  },
  {
    key: 'cross_team_interaction',
    label: 'Cross-team interaction',
    measurementClass: 'derived',
    validationStatus: 'network_validation_planned',
    source: 'Aggregated communication and meeting metadata plus confirmed team mapping',
    definition: 'Eligible interactions connecting members attributed to different teams.',
    denominator: 'Eligible mapped interactions in the selected network window.',
    limitation: 'Communication volume does not establish dependency quality, importance, or cause.',
  },
  {
    key: 'network_position',
    label: 'Network position and concentration',
    measurementClass: 'derived',
    validationStatus: 'network_validation_planned',
    source: 'Aggregated team-level interaction graph',
    definition: 'Descriptive graph statistics calculated from privacy-eligible team relationships.',
    denominator: 'The covered interaction graph for the stated channel and period.',
    limitation:
      'Centrality identifies structural position, not employee value or proven bottlenecks.',
  },
  {
    key: 'signaltrue_model_index',
    label: 'SignalTrue 0-100 model indices',
    measurementClass: 'internal_model',
    validationStatus: 'not_externally_validated',
    source: 'Documented combinations of observed and derived metrics',
    definition: 'Internal prioritization models used to order patterns for human review.',
    denominator: 'Model-specific; documented with each implementation.',
    limitation:
      'Not a probability, diagnosis, causal estimate, performance score, or industry norm.',
  },
  {
    key: 'ai_interpretation',
    label: 'AI interpretation',
    measurementClass: 'ai_hypothesis',
    validationStatus: 'requires_human_review',
    source: 'Measured evidence and configured organizational context',
    definition: 'A possible explanation, discussion question, or reversible action proposal.',
    denominator: 'Not applicable.',
    limitation: 'AI text is not a measurement and cannot establish cause.',
  },
];

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

export function calculateCoverageSummary(connections = []) {
  const sources = connections
    .filter((connection) => connection.status === 'connected')
    .map((connection) => {
      const totalUsers = Number(connection.coverage?.totalUsers || 0);
      const mappedUsers = Number(connection.coverage?.mappedUsers || 0);
      return {
        type: connection.integrationType,
        status: connection.status,
        mappedUsers,
        totalUsers,
        mappingCoveragePct:
          totalUsers > 0
            ? Math.round((Math.min(mappedUsers, totalUsers) / totalUsers) * 100)
            : null,
        lastSuccessfulSyncAt: connection.sync?.lastSuccessfulSyncAt || null,
        reconciliationStatus: 'not_run',
      };
    });

  return {
    connectedSources: sources.length,
    sourcesWithMeasuredCoverage: sources.filter((source) => source.mappingCoveragePct != null)
      .length,
    sources,
    accuracyClaimAvailable: false,
  };
}

export function calculateOutcomeSummary(interventions = []) {
  const included = interventions.filter(
    (item) => !['cancelled', 'ignored', 'abandoned'].includes(item.status)
  );
  const measured = included.filter(
    (item) =>
      item.outcomeDelta?.computedAt &&
      finite(item.outcomeDelta?.metricBefore) &&
      finite(item.outcomeDelta?.metricAfter)
  );
  const acknowledged = measured.filter((item) => item.acknowledgedAt);

  return {
    totalActions: included.length,
    activeActions: included.filter((item) =>
      ['planned', 'active', 'pending-recheck'].includes(item.status)
    ).length,
    measuredActions: measured.length,
    acknowledgedMeasuredActions: acknowledged.length,
    improvedActions: measured.filter((item) => item.outcomeDelta?.improved === true).length,
    notImprovedActions: measured.filter((item) => item.outcomeDelta?.improved === false).length,
    measurementRatePct:
      included.length > 0 ? Math.round((measured.length / included.length) * 100) : null,
  };
}

export function mergeStudyProgress(studyDocuments = [], evidence = []) {
  const documents = new Map(studyDocuments.map((study) => [study.studyKey, study]));

  return VALIDATION_STUDIES.map((definition) => {
    const document = documents.get(definition.key);
    const studyEvidence = evidence.filter((item) => item.studyKey === definition.key);
    const organizationEvidence = studyEvidence.filter((item) => item.orgId);
    const productEvidence = studyEvidence.filter((item) => !item.orgId);

    return {
      ...definition,
      status: document?.status || 'planned',
      protocolVersion: document?.protocolVersion || 'draft',
      protocolUrl: document?.protocolUrl || null,
      preregistrationUrl: document?.preregistrationUrl || null,
      startedAt: document?.startedAt || null,
      completedAt: document?.completedAt || null,
      publicSummary: document?.publicSummary || null,
      limitations: document?.limitations || [],
      sample: document?.sample || { organizations: 0, teams: 0, observations: 0 },
      verifiedEvidenceCount: studyEvidence.length,
      organizationEvidenceCount: organizationEvidence.length,
      productEvidenceCount: productEvidence.length,
    };
  });
}

function applyReconciliationEvidence(coverage, evidence) {
  const connectorEvidence = evidence.filter(
    (item) =>
      item.studyKey === 'connector_accuracy' && item.evidenceType === 'connector_reconciliation'
  );

  const sources = coverage.sources.map((source) => {
    const matching = connectorEvidence.filter((item) =>
      (item.sourceSystems || []).includes(source.type)
    );
    const clientEvidence = matching.some((item) => item.orgId);
    const productEvidence = matching.some((item) => !item.orgId);
    return {
      ...source,
      reconciliationStatus: clientEvidence
        ? 'verified_for_client'
        : productEvidence
          ? 'product_evidence_available'
          : 'not_run',
    };
  });

  return {
    ...coverage,
    sources,
    accuracyClaimAvailable: sources.some(
      (source) => source.reconciliationStatus === 'verified_for_client'
    ),
  };
}

async function getOperationalOutcomeSummary(orgId) {
  const [records, families, sources] = await Promise.all([
    OperationalOutcome.countDocuments({ orgId }),
    OperationalOutcome.distinct('family', { orgId }),
    OperationalOutcome.distinct('source', { orgId }),
  ]);
  return { records, families, sources };
}

export async function getValidationSummary(orgId) {
  const [connections, interventions, independentOutcomes, studyDocuments, evidence] =
    await Promise.all([
      IntegrationConnection.find({ orgId })
        .select('integrationType status sync.lastSuccessfulSyncAt coverage')
        .lean(),
      Intervention.find({ orgId }).select('status outcomeDelta acknowledgedAt').lean(),
      getOperationalOutcomeSummary(orgId),
      ValidationStudy.find({}).lean(),
      ValidationEvidence.find({
        reviewStatus: 'verified',
        $or: [{ orgId }, { orgId: null }, { orgId: { $exists: false } }],
      })
        .select(
          'studyKey orgId evidenceType metricKey result evidenceLevel externalReference sourceSystems supportsClaim doesNotSupport createdAt verifiedAt'
        )
        .sort({ createdAt: -1 })
        .lean(),
    ]);

  const studies = mergeStudyProgress(studyDocuments, evidence);
  const coverage = applyReconciliationEvidence(calculateCoverageSummary(connections), evidence);
  return {
    generatedAt: new Date(),
    notice:
      'Validation status describes available evidence, not organization or employee performance.',
    coverage,
    outcomes: calculateOutcomeSummary(interventions),
    independentOutcomes,
    evidence: {
      verifiedRecords: evidence.length,
      organizationRecords: evidence.filter((item) => item.orgId).length,
      productRecords: evidence.filter((item) => !item.orgId).length,
      recent: evidence.slice(0, 12).map((item) => ({
        studyKey: item.studyKey,
        evidenceType: item.evidenceType,
        metricKey: item.metricKey,
        result: item.result || null,
        evidenceLevel: item.evidenceLevel,
        externalReference: item.externalReference || null,
        sourceSystems: item.sourceSystems || [],
        supportsClaim: item.supportsClaim,
        doesNotSupport: item.doesNotSupport,
        scope: item.orgId ? 'organization' : 'product',
        verifiedAt: item.verifiedAt || item.createdAt,
      })),
    },
    studies,
    metrics: METRIC_REGISTRY,
  };
}
