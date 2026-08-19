/**
 * Trust Deployment Pack and jurisdiction configuration (spec §21, §4).
 *
 * Deployment trust is a product requirement, not a legal-document afterthought.
 * A customer should be able to explain SignalTrue to workers *before*
 * activation — so connector activation is gated on the pack being acknowledged
 * (§36.22), not merely available.
 *
 * The checklist itself is universal: notice, data-flow, metadata dictionary,
 * purpose, consultation, impact assessment, retention, access and audit are
 * good practice in any country. Only the jurisdiction checkpoints vary, and
 * those come from pluggable packs, so an Estonian or German customer is never
 * shown Australian state law.
 *
 * The checkpoints are design references. They are not legal advice and never
 * become a compliance claim in the UI or the Evidence Pack.
 */

import HsDeploymentConfig from '../../models/controlReview/deploymentConfig.js';
import {
  MIN_GROUP_SIZE_DEFAULT,
  MIN_GROUP_SIZE_RECOMMENDED,
  DEFAULT_JURISDICTION,
  REQUIRED_DISCLAIMER,
} from '../../models/controlReview/constants.js';
import { recordAudit } from './auditService.js';
import {
  listJurisdictions,
  resolveCheckpoints,
  resolvePack,
  isKnownJurisdiction,
  unreviewedJurisdictions,
} from './jurisdictionPacks.js';

// §21 — the deliverables a customer needs before workers are told about this.
export const TRUST_PACK_CHECKLIST = [
  {
    key: 'employee_explanation',
    label: 'Employee-facing explanation published',
    required: true,
    guidance:
      'What SignalTrue collects, what it does not collect, why it is used, who can see outputs, and the minimum group rule.',
  },
  {
    key: 'data_flow_map',
    label: 'Data-flow map reviewed',
    required: true,
    guidance:
      'Source systems → metadata ingestion → privacy filter → aggregation → metrics → case and evidence outputs.',
  },
  {
    key: 'metadata_dictionary',
    label: 'Metadata dictionary reviewed',
    required: true,
    guidance:
      'Exact fields and events ingested from each connector, stating explicitly that content fields are excluded.',
  },
  {
    key: 'purpose_statement',
    label: 'Purpose statement recorded',
    required: true,
    guidance:
      'Purpose-limited use for team-level work-design and psychosocial risk management.',
  },
  {
    key: 'consultation_guide',
    label: 'Worker representative consultation completed before deployment',
    required: true,
    guidance:
      'Questions and process for consultation with workers and their representatives — HSR, works council, union or equivalent — before activation.',
  },
  {
    key: 'surveillance_checklist',
    label: 'Monitoring notice and policy checkpoints signed off',
    required: true,
    guidance:
      'Jurisdiction selection, notice and policy checkpoints, and customer sign-off that local requirements were reviewed.',
  },
  {
    key: 'privacy_impact_assessment',
    label: 'Privacy impact assessment completed',
    required: true,
    guidance:
      'Data categories, risks, mitigations, retention, access, subprocessors and deletion.',
  },
  {
    key: 'retention_configuration',
    label: 'Retention configured',
    required: true,
    guidance: 'Customer-configurable retention with documented defaults.',
  },
  {
    key: 'role_access_matrix',
    label: 'Role and access matrix confirmed',
    required: true,
    guidance:
      'Who can view team patterns, cases, consultation summaries and exports.',
  },
  {
    key: 'audit_log_review',
    label: 'Audit log reviewed with the customer',
    required: true,
    guidance: 'Access, edits, exports, case decisions and configuration changes.',
  },
];

// Jurisdiction checkpoints now come from the pack registry, re-exported here so
// existing importers keep working.
export { listJurisdictions, resolvePack };

// §21 — the metadata dictionary, stating what is and is not ingested.
export const METADATA_DICTIONARY = [
  {
    connector: 'Calendar (Microsoft 365 / Google Workspace)',
    ingested: [
      'event start and end time',
      'duration',
      'attendee count',
      'recurring flag',
      'cancelled flag',
      'all-day flag',
      'hashed organiser and attendee identifiers',
      'participant team identifiers',
    ],
    excluded: ['event title', 'event description', 'attachments', 'location free text', 'meeting notes'],
  },
  {
    connector: 'Email (Microsoft 365 / Google Workspace)',
    ingested: ['send/receive timestamp', 'recipient counts', 'internal/external flag', 'hashed thread identifier'],
    excluded: ['subject line', 'message body', 'attachments', 'recipient addresses in clear text'],
  },
  {
    connector: 'Chat (Slack / Teams / Google Chat)',
    ingested: ['message event timestamp', 'channel type', 'hashed channel identifier'],
    excluded: ['message text', 'reactions content', 'files', 'thread content', 'direct message content'],
  },
  {
    connector: 'Directory / HRIS',
    ingested: ['team membership', 'reporting line', 'manager flag', 'working schedule', 'effective dates'],
    excluded: ['salary', 'performance data', 'health information', 'demographic attributes'],
  },
];

export const DATA_FLOW = [
  'Source systems (calendar, email, chat, directory)',
  'Metadata ingestion',
  'Content exclusion / privacy filter',
  'Canonical WorkEvent layer (content-free)',
  'Working schedule normalisation',
  'Team aggregation + minimum group size threshold',
  'Metrics + baseline + pattern findings',
  'ControlReviewCase',
  'Consultation + Intervention',
  'Intervention evaluation',
  'Migration / sustainability checks',
  'Review completeness',
  'Human decision',
  'Evidence Pack + audit event',
];

export async function getOrCreateConfig({ tenantId, actor = null }) {
  let config = await HsDeploymentConfig.findOne({ tenantId });
  if (config) return config;

  config = await HsDeploymentConfig.create({
    tenantId,
    minGroupSize: MIN_GROUP_SIZE_DEFAULT,
    trustPack: {
      checklist: TRUST_PACK_CHECKLIST.map(({ key, label, required }) => ({
        key,
        label,
        required,
        completed: false,
      })),
    },
    updatedBy: actor?.userId || null,
  });

  return config;
}

/** The full pack for display: checklist state plus the reference material. */
export async function getTrustPack({ tenantId, actor = null }) {
  const config = await getOrCreateConfig({ tenantId, actor });

  const checklist = TRUST_PACK_CHECKLIST.map((item) => {
    const stored = config.trustPack?.checklist?.find((c) => c.key === item.key);
    return {
      ...item,
      completed: stored?.completed || false,
      completedAt: stored?.completedAt || null,
      notes: stored?.notes || '',
    };
  });

  const outstanding = checklist.filter((item) => item.required && !item.completed);

  const activeJurisdictions = config.jurisdictions?.length
    ? config.jurisdictions
    : [config.primaryJurisdiction || DEFAULT_JURISDICTION];

  const jurisdictionCheckpoints = resolveCheckpoints(activeJurisdictions);

  // Surfaced so the UI can say "we don't have a pack for this yet, here is the
  // universal checklist" rather than quietly showing the wrong country's rules.
  const unrecognisedJurisdictions = activeJurisdictions.filter(
    (code) => !isKnownJurisdiction(code)
  );

  // Which packs no qualified adviser has signed off on yet. Surfaced rather
  // than hidden: a checklist that looks authoritative but has not been checked
  // is worse than one that says so plainly.
  const awaitingCounselReview = unreviewedJurisdictions(activeJurisdictions);

  return {
    tenantId: String(tenantId),
    jurisdictions: config.jurisdictions,
    primaryJurisdiction: config.primaryJurisdiction,
    minGroupSize: config.minGroupSize,
    recommendedMinGroupSize: MIN_GROUP_SIZE_RECOMMENDED,
    defaultTimezone: config.defaultTimezone,
    retention: config.retention,
    purposeStatement:
      config.purposeStatement ||
      'SignalTrue data is processed solely to support team-level work-design and psychosocial risk management. It is not used for performance management, individual assessment or disciplinary purposes.',
    checklist,
    outstanding: outstanding.map((item) => item.label),
    readyForActivation: outstanding.length === 0 && config.trustPack?.customerLegalReviewConfirmed,
    connectorsActivated: config.connectorsActivated,
    acknowledgedAt: config.trustPack?.acknowledgedAt || null,
    jurisdictionCheckpoints,
    availableJurisdictions: listJurisdictions(),
    unrecognisedJurisdictions,
    awaitingCounselReview,
    dataFlow: DATA_FLOW,
    metadataDictionary: METADATA_DICTIONARY,
    employeeExplanation: buildEmployeeExplanation(config),
    disclaimer: REQUIRED_DISCLAIMER,
    legalNote:
      'These checkpoints are product design references. They are not legal advice. Product and deployment decisions should be reviewed with qualified legal, privacy and work-health-and-safety specialists for the jurisdictions the organisation operates in.',
    counselReviewNote: awaitingCounselReview.length
      ? `The checkpoint list for ${awaitingCounselReview
          .map((j) => j.label)
          .join(', ')} has not yet been reviewed by a qualified adviser for that market. Treat it as a starting point and confirm the requirements that actually apply to you.`
      : '',
  };
}

function buildEmployeeExplanation(config) {
  return {
    whatItCollects: [
      'When meetings happen, how long they run and how many people attend.',
      'When messages, emails and calls happen — counts and timing only.',
      'Your team, your reporting line and your working schedule.',
    ],
    whatItDoesNotCollect: [
      'The content of any message, email, document or meeting.',
      'Any assessment of your psychological state, wellbeing or engagement.',
      'Any individual productivity, performance or ranking score.',
    ],
    whyItIsUsed:
      'To check whether an action the organisation took to reduce a psychosocial work risk actually changed how work happens, whether the change lasted, and whether the demand moved somewhere else.',
    whoCanSeeIt:
      'Health and safety staff and named case owners see team-level patterns. No one — at any level — can see an individual’s figures, because the product does not produce them.',
    minimumGroupRule: `Nothing is reported for a group smaller than ${config.minGroupSize} people. Below that threshold the output is suppressed or rolled up into a larger group.`,
    notUsedFor:
      'This data is not used for performance management, disciplinary processes or individual assessment.',
  };
}

export async function updateChecklistItem({ tenantId, actor, key, completed, notes = '', req = null }) {
  const config = await getOrCreateConfig({ tenantId, actor });

  const existing = config.trustPack.checklist.find((item) => item.key === key);
  if (existing) {
    existing.completed = completed;
    existing.completedBy = completed ? actor.userId : null;
    existing.completedAt = completed ? new Date() : null;
    existing.notes = notes;
  } else {
    const template = TRUST_PACK_CHECKLIST.find((item) => item.key === key);
    if (!template) throw new Error(`Unknown trust pack item: ${key}`);
    config.trustPack.checklist.push({
      key,
      label: template.label,
      required: template.required,
      completed,
      completedBy: completed ? actor.userId : null,
      completedAt: completed ? new Date() : null,
      notes,
    });
  }

  config.updatedBy = actor.userId;
  await config.save();

  await recordAudit({
    tenantId,
    actor,
    action: 'TRUST_PACK_ITEM_UPDATED',
    objectType: 'HsDeploymentConfig',
    objectId: config._id,
    metadata: { key, completed },
    req,
  });

  return getTrustPack({ tenantId, actor });
}

export async function updateConfiguration({ tenantId, actor, updates, req = null }) {
  const config = await getOrCreateConfig({ tenantId, actor });

  const allowed = [
    'jurisdictions',
    'primaryJurisdiction',
    'minGroupSize',
    'defaultTimezone',
    'patternThresholds',
    'evaluationDefaults',
    'retention',
    'purposeStatement',
  ];

  const applied = {};
  for (const key of allowed) {
    if (updates[key] === undefined) continue;
    if (key === 'minGroupSize') {
      // The floor is a product control, not a customer preference (§22.1).
      const requested = Number(updates[key]);
      config.minGroupSize = Math.max(MIN_GROUP_SIZE_DEFAULT, requested || MIN_GROUP_SIZE_DEFAULT);
      applied[key] = config.minGroupSize;
      continue;
    }
    config[key] = updates[key];
    applied[key] = updates[key];
  }

  config.updatedBy = actor.userId;
  await config.save();

  await recordAudit({
    tenantId,
    actor,
    action: 'CONFIG_CHANGED',
    objectType: 'HsDeploymentConfig',
    objectId: config._id,
    metadata: applied,
    req,
  });

  return getTrustPack({ tenantId, actor });
}

/**
 * Acknowledge the pack and activate connectors. Refuses while any required
 * item is outstanding — the gate is the point (§36.22).
 */
export async function acknowledgeAndActivate({ tenantId, actor, legalReviewConfirmed, req = null }) {
  const config = await getOrCreateConfig({ tenantId, actor });

  const outstanding = TRUST_PACK_CHECKLIST.filter((item) => item.required).filter((item) => {
    const stored = config.trustPack.checklist.find((c) => c.key === item.key);
    return !stored?.completed;
  });

  if (outstanding.length) {
    const error = new Error(
      `The Trust Deployment Pack must be completed before connectors are activated. Outstanding: ${outstanding
        .map((i) => i.label)
        .join(', ')}`
    );
    error.code = 'TRUST_PACK_INCOMPLETE';
    throw error;
  }

  if (!legalReviewConfirmed) {
    const error = new Error(
      'The customer must confirm that local workplace surveillance and privacy requirements were reviewed with their own legal adviser.'
    );
    error.code = 'LEGAL_REVIEW_REQUIRED';
    throw error;
  }

  config.trustPack.acknowledgedBy = actor.userId;
  config.trustPack.acknowledgedAt = new Date();
  config.trustPack.customerLegalReviewConfirmed = true;
  config.connectorsActivated = true;
  config.connectorsActivatedAt = new Date();
  config.updatedBy = actor.userId;
  await config.save();

  await recordAudit({
    tenantId,
    actor,
    action: 'TRUST_PACK_ACKNOWLEDGED',
    objectType: 'HsDeploymentConfig',
    objectId: config._id,
    metadata: { connectorsActivated: true },
    req,
  });

  return getTrustPack({ tenantId, actor });
}

/** Guard for ingestion paths: refuse to pull data before the pack is done. */
export async function assertConnectorsPermitted(tenantId) {
  const config = await HsDeploymentConfig.findOne({ tenantId }).select('connectorsActivated').lean();
  if (!config?.connectorsActivated) {
    const error = new Error(
      'Connector activation is blocked until the Trust Deployment Pack is completed and acknowledged.'
    );
    error.code = 'TRUST_PACK_INCOMPLETE';
    throw error;
  }
  return true;
}

export default {
  TRUST_PACK_CHECKLIST,
  listJurisdictions,
  resolvePack,
  METADATA_DICTIONARY,
  DATA_FLOW,
  getOrCreateConfig,
  getTrustPack,
  updateChecklistItem,
  updateConfiguration,
  acknowledgeAndActivate,
  assertConnectorsPermitted,
};
