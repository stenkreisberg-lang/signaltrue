/**
 * Client for the control-verification module.
 *
 * Kept in one place so the product's vocabulary stays consistent across
 * screens: the module talks about controls, reviews and completeness, never
 * about scores, risk levels or success.
 */

import api from './api';

export const METRIC_LABELS = {
  MEETING_LOAD: 'Meeting Load',
  UNINTERRUPTED_CALENDAR_AVAILABILITY: 'Uninterrupted Calendar Availability',
  UNINTERRUPTED_WORK_WINDOW: 'Uninterrupted Work Window',
  AFTER_HOURS_ACTIVITY: 'After-Hours Activity',
  COORDINATION_CHANNEL_LOAD: 'Coordination Channel Load',
  MANAGEMENT_LAYER_COORDINATION_LOAD: 'Management-Layer Coordination Load',
};

/** Never render a raw enum at the reader. */
export function metricLabel(metric) {
  return METRIC_LABELS[metric] || metric;
}

export const CASE_STATUS_LABELS = {
  OPENED: 'Opened',
  INVESTIGATING: 'Investigating',
  CONSULTING: 'Consulting',
  ACTION_PLANNED: 'Control planned',
  IMPLEMENTED: 'Implemented',
  MONITORING: 'Monitoring',
  REVIEW_DUE: 'Review due',
  DECISION_REQUIRED: 'Decision required',
  CLOSED_IMPROVEMENT_OBSERVED: 'Closed — improvement observed',
  CLOSED_NO_MATERIAL_CHANGE: 'Closed — no material change',
  CLOSED_MIXED_EVIDENCE: 'Closed — mixed evidence',
  CLOSED_CONTEXT_EXPLAINS: 'Closed — context explains',
  CLOSED_OTHER: 'Closed — other',
};

export const TRIGGER_LABELS = {
  SIGNALTRUE_PATTERN: 'SignalTrue pattern',
  PSYCHOSOCIAL_SURVEY: 'Psychosocial survey',
  FORMAL_RISK_ASSESSMENT: 'Formal risk assessment',
  WORKER_CONSULTATION: 'Worker consultation',
  HSR_CONCERN: 'Worker safety representative concern',
  HAZARD_REPORT: 'Hazard report',
  INCIDENT: 'Incident or near miss',
  MANAGER_CONCERN: 'Manager concern',
  ORG_CHANGE: 'Organisational change',
  EXTERNAL_CONSULTANT: 'External consultant',
  AUDIT: 'Audit',
  REGULATOR: 'Regulator',
  CLAIM_OR_ABSENCE_PATTERN: 'Claims or absence pattern',
  OTHER: 'Other documented source',
};

export const INTERVENTION_TYPE_LABELS = {
  WORKLOAD: 'Redistribute or reduce workload',
  STAFFING: 'Add or replace capacity',
  MEETING_PRACTICE: 'Remove, shorten or redesign meetings',
  DEADLINES: 'Move or reduce deadline pressure',
  PRIORITIES: 'Reduce competing priorities',
  MANAGER_SUPPORT: 'Add support or escalation capacity',
  WORKING_HOURS: 'Change schedules or on-call expectations',
  ROLE_CLARITY: 'Clarify ownership and accountability',
  TEAM_STRUCTURE: 'Change team design',
  PROCESS: 'Change workflow or process',
  CROSS_TEAM_COORDINATION: 'Change dependencies or interfaces',
  OTHER: 'Other organisational control',
};

export const CONSULTATION_METHOD_LABELS = {
  MEETING: 'Team meeting or structured discussion',
  WORKSHOP: 'Facilitated workshop',
  ONE_TO_ONE: '1:1 consultation',
  PULSE: 'Targeted pulse (2–4 questions)',
  EXISTING_SURVEY: 'Existing employee or psychosocial survey',
  HSR: 'Safety representative / works council consultation',
  OTHER: 'Other documented method',
};

export const CONTEXT_EVENT_LABELS = {
  PRODUCT_LAUNCH: 'Product launch',
  DEADLINE: 'Major deadline',
  INCIDENT: 'Incident',
  REORGANISATION: 'Reorganisation',
  STAFFING_CHANGE: 'Staffing change',
  QUARTER_END: 'Quarter end',
  CUSTOMER_ESCALATION: 'Customer escalation',
  PEAK_SEASON: 'Peak season',
  TECHNOLOGY_CHANGE: 'Technology change',
  OTHER: 'Other context',
};

export const COMPLETENESS_STATUS_LABELS = {
  COMPLETE: 'Complete',
  PARTIAL: 'Partial',
  PENDING: 'Outstanding',
  UNAVAILABLE: 'Unavailable',
  NOT_APPLICABLE: 'Not applicable',
};

export const CLOSURE_OPTIONS = [
  {
    value: 'CLOSED_IMPROVEMENT_OBSERVED',
    label: 'Close — relevant evidence moved in the intended direction',
  },
  {
    value: 'CLOSED_NO_MATERIAL_CHANGE',
    label: 'Close — the intended work-pattern change was not observed',
  },
  { value: 'CLOSED_MIXED_EVIDENCE', label: 'Close — evidence moved in conflicting directions' },
  { value: 'CLOSED_CONTEXT_EXPLAINS', label: 'Close — context indicates no further action' },
  { value: 'CLOSED_OTHER', label: 'Close — other documented reason' },
];

export function isClosed(status) {
  return typeof status === 'string' && status.startsWith('CLOSED_');
}

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(value));
}

export function formatPercent(value) {
  if (value === null || value === undefined) return '—';
  const pct = Math.round(value * 100);
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

export function formatNumber(value) {
  if (value === null || value === undefined) return 'suppressed';
  return Number(value).toFixed(2);
}

const controlReviewApi = {
  meta: () => api.get('/control-review/meta').then((r) => r.data),
  recommendedMetrics: (triggerType) =>
    api.get(`/control-review/meta/recommended-metrics/${triggerType}`).then((r) => r.data),
  suggestedEffects: (interventionType) =>
    api.get(`/control-review/meta/expected-effects/${interventionType}`).then((r) => r.data),

  dashboard: () => api.get('/hs/dashboard').then((r) => r.data),
  weeklyDigest: () => api.get('/hs/weekly-digest').then((r) => r.data),

  listCases: (params) => api.get('/control-review/cases', { params }).then((r) => r.data),
  getCase: (caseId) => api.get(`/control-review/cases/${caseId}`).then((r) => r.data),
  openCase: (body) => api.post('/control-review/cases', body).then((r) => r.data),
  saveInvestigation: (caseId, body) =>
    api.patch(`/control-review/cases/${caseId}/investigation`, body).then((r) => r.data),
  setStatus: (caseId, status) =>
    api.patch(`/control-review/cases/${caseId}/status`, { status }).then((r) => r.data),
  recordDecision: (caseId, body) =>
    api.post(`/control-review/cases/${caseId}/decision`, body).then((r) => r.data),
  addTriggerEvidence: (caseId, body) =>
    api.post(`/control-review/cases/${caseId}/trigger-evidence`, body).then((r) => r.data),
  consultationNotApplicable: (caseId, reason) =>
    api
      .post(`/control-review/cases/${caseId}/consultation-not-applicable`, { reason })
      .then((r) => r.data),
  completeness: (caseId) =>
    api.get(`/control-review/cases/${caseId}/completeness`).then((r) => r.data),

  recordConsultation: (caseId, body) =>
    api.post(`/control-review/cases/${caseId}/consultations`, body).then((r) => r.data),
  recordFeedback: (consultationId, body) =>
    api.post(`/control-review/consultations/${consultationId}/feedback`, body).then((r) => r.data),

  planIntervention: (caseId, body) =>
    api.post(`/control-review/cases/${caseId}/interventions`, body).then((r) => r.data),
  confirmImplementation: (interventionId, body) =>
    api.post(`/control-review/interventions/${interventionId}/implement`, body).then((r) => r.data),
  evaluate: (interventionId) =>
    api.post(`/control-review/interventions/${interventionId}/evaluate`).then((r) => r.data),
  updateMigration: (findingId, body) =>
    api.patch(`/control-review/migrations/${findingId}`, body).then((r) => r.data),

  generateEvidencePack: (caseId) =>
    api.post(`/control-review/cases/${caseId}/evidence-pack`).then((r) => r.data),
  downloadEvidencePack: (packId) =>
    api
      .get(`/control-review/evidence-packs/${packId}/download`, { responseType: 'blob' })
      .then((r) => r.data),

  patternFindings: (status) =>
    api.get('/work-patterns/pattern-findings', { params: { status } }).then((r) => r.data),
  dismissFinding: (findingId, reason) =>
    api
      .post(`/work-patterns/pattern-findings/${findingId}/dismiss`, { reason })
      .then((r) => r.data),

  teamMetrics: (teamId, weeks) =>
    api.get(`/work-patterns/teams/${teamId}/metrics`, { params: { weeks } }).then((r) => r.data),
  recalculate: (teamId, weeks) =>
    api.post(`/work-patterns/teams/${teamId}/recalculate`, { weeks }).then((r) => r.data),

  contextEvents: (teamId) =>
    api.get('/work-patterns/context-events', { params: { teamId } }).then((r) => r.data),
  createContextEvent: (body) => api.post('/work-patterns/context-events', body).then((r) => r.data),
  deleteContextEvent: (eventId) =>
    api.delete(`/work-patterns/context-events/${eventId}`).then((r) => r.data),

  trustPack: () => api.get('/hs/trust-pack').then((r) => r.data),
  updateTrustPackItem: (key, body) =>
    api.patch(`/hs/trust-pack/checklist/${key}`, body).then((r) => r.data),
  updateTrustConfiguration: (body) =>
    api.patch('/hs/trust-pack/configuration', body).then((r) => r.data),
  activateConnectors: (legalReviewConfirmed) =>
    api.post('/hs/trust-pack/activate', { legalReviewConfirmed }).then((r) => r.data),

  auditEvents: (params) => api.get('/hs/audit-events', { params }).then((r) => r.data),
};

export default controlReviewApi;
