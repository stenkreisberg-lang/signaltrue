/**
 * Control-Verification module — shared enums and defaults.
 *
 * Source: SignalTrue Australia Product & Developer Implementation Specification
 * v3.0. The specification was written for the Australian market, but nothing in
 * the verification process is Australia-specific: only the deployment
 * checkpoints vary by country, and those live in pluggable jurisdiction packs.
 *
 * The product verifies whether an organisational action changed how work happens.
 * It does not diagnose people, decide legal compliance, or claim causality.
 */

// §5.1 — a case may originate anywhere, not only from SignalTrue detection.
export const TRIGGER_TYPES = [
  'SIGNALTRUE_PATTERN',
  'PSYCHOSOCIAL_SURVEY',
  'FORMAL_RISK_ASSESSMENT',
  'WORKER_CONSULTATION',
  'HSR_CONCERN',
  'HAZARD_REPORT',
  'INCIDENT',
  'MANAGER_CONCERN',
  'ORG_CHANGE',
  'EXTERNAL_CONSULTANT',
  'AUDIT',
  'REGULATOR',
  'CLAIM_OR_ABSENCE_PATTERN',
  'OTHER',
];

// §6 — lifecycle. Closure is always human.
export const CASE_STATUSES = [
  'OPENED',
  'INVESTIGATING',
  'CONSULTING',
  'ACTION_PLANNED',
  'IMPLEMENTED',
  'MONITORING',
  'REVIEW_DUE',
  'DECISION_REQUIRED',
  'CLOSED_IMPROVEMENT_OBSERVED',
  'CLOSED_NO_MATERIAL_CHANGE',
  'CLOSED_MIXED_EVIDENCE',
  'CLOSED_CONTEXT_EXPLAINS',
  'CLOSED_OTHER',
];

export const CLOSED_STATUSES = CASE_STATUSES.filter((s) => s.startsWith('CLOSED_'));

export const OPEN_STATUSES = CASE_STATUSES.filter((s) => !s.startsWith('CLOSED_'));

// §10 — P0 work-pattern metrics.
export const P0_METRICS = [
  'MEETING_LOAD',
  'UNINTERRUPTED_CALENDAR_AVAILABILITY',
  'UNINTERRUPTED_WORK_WINDOW',
  'AFTER_HOURS_ACTIVITY',
  'COORDINATION_CHANNEL_LOAD',
  'MANAGEMENT_LAYER_COORDINATION_LOAD',
];

export const METRIC_LABELS = {
  MEETING_LOAD: 'Meeting Load',
  UNINTERRUPTED_CALENDAR_AVAILABILITY: 'Uninterrupted Calendar Availability',
  UNINTERRUPTED_WORK_WINDOW: 'Uninterrupted Work Window',
  AFTER_HOURS_ACTIVITY: 'After-Hours Activity',
  COORDINATION_CHANNEL_LOAD: 'Coordination Channel Load',
  MANAGEMENT_LAYER_COORDINATION_LOAD: 'Management-Layer Coordination Load',
};

export const METRIC_UNITS = {
  MEETING_LOAD: 'attendee-hours per person per week',
  UNINTERRUPTED_CALENDAR_AVAILABILITY: 'hours per person per week',
  UNINTERRUPTED_WORK_WINDOW: 'hours per person per week',
  AFTER_HOURS_ACTIVITY: 'events per person per week',
  COORDINATION_CHANNEL_LOAD: 'coordination events per person per week',
  MANAGEMENT_LAYER_COORDINATION_LOAD: 'coordination events per manager per week',
};

// Metrics where a higher number means more demand on the team. Used for
// direction handling in evaluation and migration, never for a verdict.
export const HIGHER_IS_MORE_DEMAND = {
  MEETING_LOAD: true,
  UNINTERRUPTED_CALENDAR_AVAILABILITY: false,
  UNINTERRUPTED_WORK_WINDOW: false,
  AFTER_HOURS_ACTIVITY: true,
  COORDINATION_CHANNEL_LOAD: true,
  MANAGEMENT_LAYER_COORDINATION_LOAD: true,
};

// Metrics that can receive displaced demand (§17).
export const COORDINATION_METRICS = [
  'COORDINATION_CHANNEL_LOAD',
  'AFTER_HOURS_ACTIVITY',
  'MEETING_LOAD',
  'MANAGEMENT_LAYER_COORDINATION_LOAD',
];

export const DATA_QUALITY = ['INSUFFICIENT', 'LOW', 'ACCEPTABLE', 'GOOD'];

export const DATA_QUALITY_RANK = {
  INSUFFICIENT: 0,
  LOW: 1,
  ACCEPTABLE: 2,
  GOOD: 3,
};

// §12 — context events.
export const CONTEXT_EVENT_TYPES = [
  'PRODUCT_LAUNCH',
  'DEADLINE',
  'INCIDENT',
  'REORGANISATION',
  'STAFFING_CHANGE',
  'QUARTER_END',
  'CUSTOMER_ESCALATION',
  'PEAK_SEASON',
  'TECHNOLOGY_CHANGE',
  'OTHER',
];

// §14 — consultation methods.
export const CONSULTATION_METHODS = [
  'MEETING',
  'WORKSHOP',
  'ONE_TO_ONE',
  'PULSE',
  'EXISTING_SURVEY',
  'HSR',
  'OTHER',
];

// §15 — control types.
export const INTERVENTION_TYPES = [
  'WORKLOAD',
  'STAFFING',
  'MEETING_PRACTICE',
  'DEADLINES',
  'PRIORITIES',
  'MANAGER_SUPPORT',
  'WORKING_HOURS',
  'ROLE_CLARITY',
  'TEAM_STRUCTURE',
  'PROCESS',
  'CROSS_TEAM_COORDINATION',
  'OTHER',
];

export const INTERVENTION_STATUSES = [
  'PLANNED',
  'IMPLEMENTED',
  'MONITORING',
  'REVIEW_DUE',
  'REVIEWED',
  'CANCELLED',
];

export const EXPECTED_DIRECTIONS = ['INCREASE', 'DECREASE', 'NO_CHANGE'];

// §28.1 — domain events.
export const DOMAIN_EVENTS = [
  'PATTERN_REVIEW_RECOMMENDED',
  'CASE_OPENED',
  'CONSULTATION_RECORDED',
  'INTERVENTION_PLANNED',
  'INTERVENTION_IMPLEMENTED',
  'POST_PERIOD_AVAILABLE',
  'REBOUND_DETECTED',
  'POSSIBLE_WORKLOAD_MIGRATION',
  'REVIEW_DUE',
  'DECISION_RECORDED',
  'EVIDENCE_PACK_GENERATED',
  'PRIVACY_THRESHOLD_SUPPRESSION',
  'CONFIG_CHANGED',
];

// §23 — roles for the H&S module. Mapped from platform roles in hsAccess.js.
export const HS_ROLES = [
  'SYSTEM_ADMIN',
  'HS_ADMIN',
  'CASE_OWNER',
  'FUNCTION_LEADER',
  'AUDITOR_READONLY',
];

// §22.1 — privacy/trust control. Not a statement of legal sufficiency.
export const MIN_GROUP_SIZE_DEFAULT = 8;
export const MIN_GROUP_SIZE_RECOMMENDED = 10;

// §11.2 — baseline defaults.
export const BASELINE_WEEKS_DEFAULT = 8;
export const BASELINE_WEEKS_MINIMUM = 4;

// §9.1 — pilot hypotheses, configurable. NOT legal or scientific thresholds.
export const PATTERN_DEFAULTS = {
  robustDeviationThreshold: 2.0,
  minimumSignals: 2,
  persistencePeriods: 3,
  persistenceWindow: 4,
  minimumDataQuality: 'ACCEPTABLE',
  severeSingleSignalDeviation: 3.5,
  severeSingleSignalRelativeChange: 0.4,
  severeSingleSignalPersistence: 3,
};

// §16 — verification periods.
export const EVALUATION_DEFAULTS = {
  prePeriodDays: 28,
  implementationBufferDays: 7,
  postPeriodDays: 28,
  sustainabilityPeriods: 3,
  materialChangeThreshold: 0.1,
  reboundRecoveryFraction: 0.5,
  migrationThreshold: 0.15,
};

// §21/§4 — deployment jurisdiction.
//
// Deliberately NOT an enum. The verification product is the same in every
// country; only the deployment paperwork differs, and that lives in pluggable
// packs (services/controlReview/jurisdictionPacks.js). Constraining this field
// to one country's regions would lock every other customer out of the product.
export const DEFAULT_JURISDICTION = 'GLOBAL';

// Sensible neutral default. A tenant's real zone comes from its deployment
// config or an explicit WorkingSchedule.
export const DEFAULT_TIMEZONE = 'UTC';

// Stamped onto every stored calculation so historical output stays interpretable.
export const ALGORITHM_VERSION = 'au-control-verification-1.0.0';

// §20.1 — required disclaimer, rendered verbatim in UI and Evidence Pack.
export const REQUIRED_DISCLAIMER =
  'SignalTrue provides work-pattern evidence and review documentation that the organisation may use as part of its broader psychosocial risk-management process. SignalTrue does not determine legal compliance, diagnose psychological harm, or confirm that a hazard or risk has been eliminated.';

export default {
  TRIGGER_TYPES,
  CASE_STATUSES,
  CLOSED_STATUSES,
  OPEN_STATUSES,
  P0_METRICS,
  METRIC_LABELS,
  METRIC_UNITS,
  HIGHER_IS_MORE_DEMAND,
  COORDINATION_METRICS,
  DATA_QUALITY,
  DATA_QUALITY_RANK,
  CONTEXT_EVENT_TYPES,
  CONSULTATION_METHODS,
  INTERVENTION_TYPES,
  INTERVENTION_STATUSES,
  EXPECTED_DIRECTIONS,
  DOMAIN_EVENTS,
  HS_ROLES,
  MIN_GROUP_SIZE_DEFAULT,
  MIN_GROUP_SIZE_RECOMMENDED,
  BASELINE_WEEKS_DEFAULT,
  BASELINE_WEEKS_MINIMUM,
  PATTERN_DEFAULTS,
  EVALUATION_DEFAULTS,
  DEFAULT_JURISDICTION,
  DEFAULT_TIMEZONE,
  ALGORITHM_VERSION,
  REQUIRED_DISCLAIMER,
};
