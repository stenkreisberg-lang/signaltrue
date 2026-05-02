# SignalTrue — Full System Specification
## MongoDB Schema · API Endpoints · Scoring Engine Service Spec
**Version:** 1.0 · **Date:** 2026-05-02 · **Branch:** main

> This is the single authoritative document for engineers and technical advisors. It covers every MongoDB collection change required, every API endpoint per product component, and the full scoring engine as a single, self-contained service specification. All proposed additions and changes are clearly marked **[NEW]**, **[CHANGE]**, or **[EXISTING]** against the current codebase.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [MongoDB Schema — Full Collection Inventory](#2-mongodb-schema--full-collection-inventory)
   - 2.1 MetricsDaily
   - 2.2 BehavioralDriftIndex
   - 2.3 RiskWeekly
   - 2.4 RiskDriver
   - 2.5 Team
   - 2.6 Baseline
   - 2.7 Signal / SignalV2
   - 2.8 IntegrationMetricsDaily
   - 2.9 WorkEvent
   - 2.10 DriftTimeline / DriftEvent
   - 2.11 [NEW] ScoringAuditLog
   - 2.12 [NEW] TeamSizeGate
   - 2.13 [NEW] RetentionPolicy
   - 2.14 [NEW] DSARRequest
   - 2.15 User / Organization (relevant fields)
3. [Schema Change Summary](#3-schema-change-summary)
4. [API Endpoint Definitions — Per Component](#4-api-endpoint-definitions--per-component)
   - 4.1 Authentication & User Management
   - 4.2 Teams & Organizations
   - 4.3 Integrations (Calendar, Slack, Google Chat, Outlook)
   - 4.4 Metrics & Baselines
   - 4.5 Behavioral Drift Index (BDI)
   - 4.6 Risk Scores & Drivers
   - 4.7 Signals
   - 4.8 AI Copilot
   - 4.9 Weekly Brief & Reports
   - 4.10 Playbooks & Actions
   - 4.11 Dashboard & Insights
   - 4.12 Admin / Superadmin
   - 4.13 [NEW] Privacy & DSAR
   - 4.14 [NEW] Scoring Engine (Internal)
5. [Scoring Engine — Single Service Specification](#5-scoring-engine--single-service-specification)
   - 5.1 Purpose and Boundaries
   - 5.2 Inputs
   - 5.3 Composite Score Architecture
   - 5.4 Capacity Drift Score
   - 5.5 Coordination Drag Score
   - 5.6 Cohesion Drift Score
   - 5.7 Overall Team Drift Score
   - 5.8 Behavioral Drift Index (BDI)
   - 5.9 Overload Risk
   - 5.10 Execution Risk
   - 5.11 Retention Strain Risk
   - 5.12 Team State Determination
   - 5.13 Baseline Management
   - 5.14 Confidence Scoring
   - 5.15 Privacy Gate
   - 5.16 Audit Trail
   - 5.17 Service Interface (function signatures)
   - 5.18 Error Handling
   - 5.19 Scheduling
6. [Implementation Gaps & Remediation](#6-implementation-gaps--remediation)

---

## 1. Architecture Overview

```
Integration Connectors (Slack / Google Calendar / Google Chat / Outlook / Teams)
        │
        ▼
Ingestion Services (slackService, calendarService, coreIntegrationAdapters)
        │
        ▼
Raw Event Store  ──►  WorkEvent  ──►  IntegrationMetricsDaily
        │
        ▼
Daily Normalization ──► MetricsDaily   (one doc per team per day)
        │
        ├──► Baseline Service  ──►  Baseline  (rolling 30-day learned baseline)
        │
        ▼
Scoring Engine  (single service: scoringEngineService.js)
        ├──► BehavioralDriftIndex        (BDI + 6 signals + drift state)
        ├──► RiskWeekly                  (overload / execution / retention_strain)
        ├──► RiskDriver                  (per-metric traceability)
        ├──► [NEW] ScoringAuditLog       (immutable audit trail of every score run)
        └──► TeamState                   (team-level health state)
                │
                ▼
Presentation Layer
        ├──► Signals / CategoryKingSignals
        ├──► Weekly Brief (weeklyBriefService)
        ├──► AI Copilot  (aiCopilotService → OpenAI / Anthropic)
        ├──► Playbooks / Actions
        └──► Dashboard APIs (frontend React)
```

**Guiding constraints for every API and score:**

| Constraint | Rule |
|---|---|
| Minimum team size | Never return analytics for teams with `actualSize < 5`. Return `{ suppressed: true, reason: 'insufficient_sample' }` with HTTP 204. |
| AI inputs | Always `privacy_mode: 'metadata_only'`. Never send message content to an AI provider. |
| Scoring reproducibility | Every score run must write a `ScoringAuditLog` entry with inputs, weights, and output. |
| Retention | No raw event data older than 90 days. Aggregated metrics retained 2 years. |

---

## 2. MongoDB Schema — Full Collection Inventory

All schemas use ES module `import mongoose from 'mongoose'` and `export default`. `timestamps: true` is enabled on all collections unless noted.

---

### 2.1 MetricsDaily

**File:** `backend/models/metricsDaily.js`  
**Status:** [EXISTING] with [CHANGE] additions

```js
const metricsDailySchema = new mongoose.Schema({
  teamId:  { type: ObjectId, ref: 'Team', required: true, index: true },
  orgId:   { type: ObjectId, ref: 'Organization', index: true },
  date:    { type: Date, required: true, index: true },  // normalized to 00:00 UTC

  // — Meeting signals —
  meetingHoursWeek:       { type: Number, default: 0 },  // raw hours in week window
  meetingLoadIndex:       { type: Number, default: 0 },  // meetingHoursWeek / 40
  backToBackBlocks:       { type: Number, default: 0 },  // [NEW] count of back-to-back ≥2 meetings
  meetingFragmentScore:   { type: Number, default: 0 },  // [NEW] 0–1 calendar fragmentation

  // — After-hours —
  afterHoursRate:         { type: Number, default: 0 },  // 0–1 fraction of events after 6 pm / before 8 am
  weekendActivityRate:    { type: Number, default: 0 },  // [NEW] fraction of events on weekends

  // — Response latency —
  responseMedianMins:     { type: Number, default: 0 },
  responseLatencyTrend:   { type: Number, default: 0 },

  // — Focus time —
  focusTimeRatio:         { type: Number, default: 0 },  // focusHours / 40
  focusHoursWeek:         { type: Number, default: 0 },  // [NEW] explicit hours for clarity

  // — Collaboration —
  uniqueContacts:         { type: Number, default: 0 },
  crossTeamContacts:      { type: Number, default: 0 },  // [NEW] unique contacts outside own team
  networkBreadthChange:   { type: Number, default: 0 },

  // — Async participation —
  messageCount:           { type: Number, default: 0 },  // [NEW] total messages sent in period
  asyncParticipationIdx:  { type: Number, default: 0 },  // [NEW] normalized 0–1

  // — Sentiment / tone —
  sentimentAvg:           { type: Number, default: 0 },
  sentimentShift:         { type: Number, default: 0 },

  // — Composite —
  energyIndex:            { type: Number, default: 0 },  // 0–100 auto-tuned
  energyWeights:          { type: Object, default: {} },

  // — Data quality —
  dataQuality:            { type: Number, default: 0 },  // [NEW] 0–1 coverage score
  activeUserCount:        { type: Number, default: 0 },  // [NEW] distinct users with data this day
}, { timestamps: true });

metricsDailySchema.index({ teamId: 1, date: 1 }, { unique: true });
metricsDailySchema.index({ orgId: 1, date: -1 });
```

**[CHANGE] New fields added:** `backToBackBlocks`, `meetingFragmentScore`, `weekendActivityRate`, `focusHoursWeek`, `crossTeamContacts`, `messageCount`, `asyncParticipationIdx`, `dataQuality`, `activeUserCount`.

---

### 2.2 BehavioralDriftIndex

**File:** `backend/models/behavioralDriftIndex.js`  
**Status:** [EXISTING] with [CHANGE] additions

```js
const behavioralDriftIndexSchema = new mongoose.Schema({
  orgId:       { type: ObjectId, ref: 'Organization', required: true, index: true },
  teamId:      { type: ObjectId, ref: 'Team', required: true, index: true },
  periodStart: { type: Date, required: true, index: true },
  periodEnd:   { type: Date, required: true },

  // 6 Input Signals
  signals: {
    meetingLoad:          signalSubSchema,   // hours/week
    afterHoursActivity:   signalSubSchema,   // % 0–100
    responseTime:         signalSubSchema,   // hours
    asyncParticipation:   signalSubSchema,   // message count
    focusTime:            signalSubSchema,   // hours/week
    collaborationBreadth: signalSubSchema,   // unique collaborators
  },

  // Drift state
  state:                 { type: String, enum: ['Stable','Early Drift','Developing Drift','Critical Drift'], default: 'Stable' },
  driftScore:            { type: Number, default: 0, min: 0, max: 100 },
  deviatingSignalsCount: { type: Number, default: 0 },
  negativeSignalsCount:  { type: Number, default: 0 },

  topDrivers: [{
    signal:        String,
    contribution:  Number,
    currentValue:  Number,
    baselineValue: Number,
    change:        String,
  }],

  summary:         { type: String },
  interpretation:  { type: String },

  // Baseline snapshot (first 30 days)
  baseline: {
    meetingLoad:          Number,
    afterHoursActivity:   Number,
    responseTime:         Number,
    asyncParticipation:   Number,
    focusTime:            Number,
    collaborationBreadth: Number,
    establishedDate:      Date,
    sampleSize:           Number,
  },

  // Per-signal % change thresholds
  thresholds: {
    meetingLoad:          { type: Number, default: 20 },
    afterHoursActivity:   { type: Number, default: 30 },
    responseTime:         { type: Number, default: 25 },
    asyncParticipation:   { type: Number, default: 20 },
    focusTime:            { type: Number, default: 20 },
    collaborationBreadth: { type: Number, default: 25 },
  },

  confidence:           { type: Number, default: 0, min: 0, max: 1 },
  recommendedPlaybooks: [{ type: ObjectId, ref: 'DriftPlaybook' }],

  // [NEW] Scoring engine version that produced this record
  scoringVersion: { type: String, default: '1.0.0' },
  // [NEW] Reference to the audit log entry
  auditLogId: { type: ObjectId, ref: 'ScoringAuditLog' },
}, { timestamps: true });

bdiSchema.index({ teamId: 1, periodStart: -1 });
bdiSchema.index({ orgId: 1, periodStart: -1 });
```

**[CHANGE] New fields:** `scoringVersion`, `auditLogId`.

---

### 2.3 RiskWeekly

**File:** `backend/models/riskWeekly.js`  
**Status:** [EXISTING] with [CHANGE] additions

```js
const riskWeeklySchema = new mongoose.Schema({
  teamId:   { type: ObjectId, ref: 'Team', required: true, index: true },
  weekStart:{ type: Date, required: true, index: true },
  riskType: { type: String, required: true, enum: ['overload','execution','retention_strain'] },

  score:      { type: Number, required: true, min: 0, max: 100 },
  band:       { type: String, required: true, enum: ['green','yellow','red'] },
  confidence: { type: String, required: true, enum: ['low','medium','high'], default: 'medium' },
  explanation:{ type: String },

  // [NEW] raw inputs snapshot for auditability
  inputSnapshot: { type: Object, default: {} },
  // [NEW] per-metric contribution breakdown
  contributions: [{
    metricKey:   String,
    weight:      Number,
    deviation:   Number,
    contribution: Number,
  }],
  // [NEW] scoring version
  scoringVersion: { type: String, default: '1.0.0' },
}, { timestamps: true });

riskWeeklySchema.index({ teamId: 1, weekStart: -1 });
riskWeeklySchema.index({ teamId: 1, riskType: 1, weekStart: -1 });
```

**[CHANGE] New fields:** `inputSnapshot`, `contributions`, `scoringVersion`.

---

### 2.4 RiskDriver

**File:** `backend/models/riskDriver.js`  
**Status:** [EXISTING] — no schema changes required

```js
const riskDriverSchema = new mongoose.Schema({
  teamId:            { type: ObjectId, ref: 'Team', required: true, index: true },
  weekStart:         { type: Date, required: true, index: true },
  riskType:          { type: String, required: true, enum: ['overload','execution','retention_strain'] },
  metricKey:         { type: String, required: true },
  contributionWeight:{ type: Number, required: true, min: 0, max: 1 },
  deviation:         { type: Number, required: true },
  explanationText:   { type: String },
}, { timestamps: true });

riskDriverSchema.index({ teamId: 1, weekStart: -1, riskType: 1 });
```

---

### 2.5 Team

**File:** `backend/models/team.js`  
**Status:** [EXISTING] with [CHANGE] additions

```js
const teamSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  orgId:  { type: ObjectId, ref: 'Organization', required: true },
  zone:   { type: String, enum: ['Recovery','Stable','Watch','Surge'], default: 'Stable' },
  bdi:    { type: Number, default: 50 },
  trend:  { type: Number, default: 0 },
  favorite: { type: Boolean, default: false },

  energyIndex:              { type: Number, default: 50 },
  resilienceScore:          { type: Number, default: 50 },
  executionCapacityScore:   { type: Number, default: 50 },
  decisionSpeedScore:       { type: Number, default: 50 },
  structuralHealthScore:    { type: Number, default: 50 },

  drift:           { type: String },
  recommendedAction: { type: String },

  metadata: {
    function:   { type: String, enum: ['Engineering','Product','Design','Marketing','Sales','Support','Operations','Other'] },
    sizeBand:   { type: String, enum: ['1-5','6-10','11-20','21-50','50+'] },
    actualSize: { type: Number },
  },

  baseline: {
    bdi:  Number,
    date: Date,
    signals: { slack: Object, calendar: Object },
  },

  seasonalityFlags: { type: Object, default: {} },
  driverWeights:    { type: Object, default: {} },

  bdiHistory: [{ bdi: Number, timestamp: Date, slackSignals: Object, calendarSignals: Object }],

  slackSignals:      { messageCount: Number, avgResponseDelayHours: Number, sentiment: Number },
  googleChatSignals: { messageCount: Number, avgResponseDelayHours: Number, afterHoursCount: Number, afterHoursPercentage: Number, avgThreadDepth: Number, sentiment: Number, adHocMeetingCount: Number, estimatedMeetingHours: Number, adHocAfterHoursMeetings: Number },
  calendarSignals:   { meetingHoursWeek: Number, afterHoursMeetings: Number, recoveryScore: Number, focusHoursWeek: Number, focusToMeetingRatio: Number },

  slackChannelId:    { type: String },
  googleChatSpaceId: { type: String },
  calendarId:        { type: String },
  playbook:          { type: String, default: '' },

  // [NEW] Composite Drift Scores (Proposed model — capacity/coordination/cohesion)
  capacityDriftScore:     { type: Number, default: null },
  coordinationDragScore:  { type: Number, default: null },
  cohesionDriftScore:     { type: Number, default: null },
  overallDriftScore:      { type: Number, default: null },
  driftScoreUpdatedAt:    { type: Date },

  // [NEW] Privacy gate flag
  analyticsEnabled: { type: Boolean, default: true },  // false when actualSize < 5
  privacyGateFiredAt: { type: Date },

}, { timestamps: true });
```

**[CHANGE] New fields:** `capacityDriftScore`, `coordinationDragScore`, `cohesionDriftScore`, `overallDriftScore`, `driftScoreUpdatedAt`, `analyticsEnabled`, `privacyGateFiredAt`.

---

### 2.6 Baseline

**File:** `backend/models/baseline.js`  
**Status:** [EXISTING] — confirm fields cover all METRIC_FIELD_MAP keys

Expected structure:

```js
const baselineSchema = new mongoose.Schema({
  teamId:    { type: ObjectId, ref: 'Team', required: true, unique: true },
  orgId:     { type: ObjectId, ref: 'Organization' },
  windowDays:{ type: Number, default: 30 },
  metrics: {
    // One entry per metric key in METRIC_FIELD_MAP
    after_hours_activity: { mean: Number, median: Number, std: Number, p25: Number, p75: Number, mad: Number, sampleSize: Number },
    meeting_load:         { mean: Number, median: Number, std: Number, p25: Number, p75: Number, mad: Number, sampleSize: Number },
    back_to_back_meetings:{ mean: Number, median: Number, std: Number, p25: Number, p75: Number, mad: Number, sampleSize: Number },
    focus_time:           { mean: Number, median: Number, std: Number, p25: Number, p75: Number, mad: Number, sampleSize: Number },
    response_time:        { mean: Number, median: Number, std: Number, p25: Number, p75: Number, mad: Number, sampleSize: Number },
    participation_drift:  { mean: Number, median: Number, std: Number, p25: Number, p75: Number, mad: Number, sampleSize: Number },
    meeting_fragmentation:{ mean: Number, median: Number, std: Number, p25: Number, p75: Number, mad: Number, sampleSize: Number },
    // [NEW] Keys for new composite scores
    weekend_activity:     { mean: Number, median: Number, std: Number, p25: Number, p75: Number, mad: Number, sampleSize: Number },
    cross_team_contacts:  { mean: Number, median: Number, std: Number, p25: Number, p75: Number, mad: Number, sampleSize: Number },
  },
  confidence:       { type: Number, default: 0, min: 0, max: 1 },
  establishedAt:    { type: Date },
  lastUpdatedAt:    { type: Date },
  // [NEW]
  scoringVersion:   { type: String, default: '1.0.0' },
}, { timestamps: true });
```

---

### 2.7 Signal / SignalV2

**File:** `backend/models/signal.js`, `backend/models/signalV2.js`  
**Status:** [EXISTING] — no schema changes. Ensure the following fields are present:

```js
{
  orgId, teamId,
  type: String,        // e.g. 'meeting-load-spike', 'after-hours-creep'
  severity: String,    // 'low' | 'medium' | 'high' | 'critical'
  value: Number,
  baselineValue: Number,
  detectedAt: Date,
  resolvedAt: Date,
  metadata: Object,
}
```

---

### 2.8 IntegrationMetricsDaily

**File:** `backend/models/integrationMetricsDaily.js`  
**Status:** [EXISTING] — confirm fields present. Expected:

```js
{
  teamId, orgId, date, source,  // source: 'slack' | 'google_calendar' | 'google_chat' | 'outlook' | 'teams'
  meetingCount7d, meetingDurationTotalHours7d, backToBackMeetingBlocks,
  messageCount7d, afterHoursMessageRatio, focusTimeAvailabilityHours,
  calendarFragmentationScore, responseLatencyMedianMins,
}
```

---

### 2.9 WorkEvent

**File:** `backend/models/workEvent.js`  
**Status:** [EXISTING] — no schema changes required

```js
{
  teamId, orgId, userId,
  eventType: String,   // 'message' | 'meeting' | 'focus_block' | 'after_hours_event'
  source: String,
  occurredAt: Date,
  durationMins: Number,
  metadata: Object,
}
```

---

### 2.10 DriftTimeline / DriftEvent

**Files:** `backend/models/driftTimeline.js`, `backend/models/driftEvent.js`  
**Status:** [EXISTING] — no changes required

---

### 2.11 [NEW] ScoringAuditLog

**File:** `backend/models/scoringAuditLog.js`  
**Purpose:** Immutable, append-only record of every scoring engine run. Required for auditability, reproducibility, and debugging.

```js
import mongoose from 'mongoose';

const scoringAuditLogSchema = new mongoose.Schema({
  teamId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  orgId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  runAt:     { type: Date, required: true, default: Date.now, index: true },
  trigger:   { type: String, enum: ['cron', 'manual', 'api', 'integration_push'], required: true },
  scoreType: { type: String, enum: ['bdi', 'overload', 'execution', 'retention_strain', 'composite_drift', 'full_run'], required: true },
  scoringVersion: { type: String, required: true },

  // Snapshot of raw inputs used for this run
  inputSnapshot: {
    weekStart:    Date,
    metricsUsed:  Object,     // { metricKey: value, ... }
    baselines:    Object,     // { metricKey: baselineMean, ... }
    baselineConf: Number,     // baseline confidence 0–1
    teamSize:     Number,
  },

  // Outputs
  outputSnapshot: {
    scores:  Object,   // { bdi: 72, overload: 48, ... }
    bands:   Object,   // { overload: 'yellow', ... }
    state:   String,
    drivers: Array,
  },

  // Weights used
  weights: Object,     // { after_hours_activity: 0.35, ... }

  // Privacy gate result
  privacyGatePassed: { type: Boolean, required: true },
  privacySuppressed: { type: Boolean, default: false },

  durationMs: { type: Number },   // wall-clock time to run scoring
  error:      { type: String },   // set if run failed
}, {
  timestamps: false,    // runAt is the authoritative timestamp
  collection: 'scoringauditlogs',
});

// Never update — this is an append-only log
scoringAuditLogSchema.set('strict', true);
scoringAuditLogSchema.index({ teamId: 1, runAt: -1 });
scoringAuditLogSchema.index({ orgId: 1, runAt: -1 });

export default mongoose.model('ScoringAuditLog', scoringAuditLogSchema);
```

---

### 2.12 [NEW] TeamSizeGate

**File:** `backend/models/teamSizeGate.js`  
**Purpose:** Records every time analytics are suppressed due to insufficient team size. Used for operational visibility and privacy compliance.

```js
import mongoose from 'mongoose';

const teamSizeGateSchema = new mongoose.Schema({
  teamId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  orgId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  endpoint:     { type: String, required: true },   // e.g. 'GET /api/bdi/:teamId'
  reportedSize: { type: Number },
  minRequired:  { type: Number, default: 5 },
  suppressedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

export default mongoose.model('TeamSizeGate', teamSizeGateSchema);
```

---

### 2.13 [NEW] RetentionPolicy

**File:** `backend/models/retentionPolicy.js`  
**Purpose:** Stores configurable retention windows per data type per org.

```js
import mongoose from 'mongoose';

const retentionPolicySchema = new mongoose.Schema({
  orgId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
  rawEventRetentionDays:       { type: Number, default: 90 },
  metricsRetentionDays:        { type: Number, default: 730 },  // 2 years
  auditLogRetentionDays:       { type: Number, default: 1825 }, // 5 years
  chatLogRetentionDays:        { type: Number, default: 30 },   // shortest window
  lastPurgeAt:                 { type: Date },
  nextScheduledPurgeAt:        { type: Date },
}, { timestamps: true });

export default mongoose.model('RetentionPolicy', retentionPolicySchema);
```

---

### 2.14 [NEW] DSARRequest

**File:** `backend/models/dsarRequest.js`  
**Purpose:** Tracks Data Subject Access Requests (GDPR / CCPA).

```js
import mongoose from 'mongoose';

const dsarRequestSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orgId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  requestType:  { type: String, enum: ['export','delete','rectify'], required: true },
  status:       { type: String, enum: ['pending','processing','completed','failed'], default: 'pending' },
  requestedAt:  { type: Date, default: Date.now },
  completedAt:  { type: Date },
  exportUrl:    { type: String },    // signed S3/GCS URL for export
  notes:        { type: String },
  processedBy:  { type: String },    // admin user ID or 'system'
}, { timestamps: true });

dsarRequestSchema.index({ userId: 1, requestedAt: -1 });

export default mongoose.model('DSARRequest', dsarRequestSchema);
```

---

### 2.15 User / Organization (relevant fields)

**Status:** [EXISTING] — ensure these fields exist:

**User:**
```js
{
  email, passwordHash, role,  // 'admin' | 'member' | 'viewer' | 'superadmin'
  orgId, teamId,
  privacyConsentGivenAt: Date,     // [NEW] timestamp of GDPR consent
  privacyConsentVersion: String,   // [NEW] e.g. '2026-01'
  deletedAt: Date,                 // [NEW] soft-delete for DSAR
}
```

**Organization:**
```js
{
  name, adminUserId, plan,
  minTeamSizeForAnalytics: { type: Number, default: 5 },  // [NEW] configurable per org
  privacyMode: { type: String, enum: ['metadata_only','aggregated_only'], default: 'metadata_only' }, // [NEW]
}
```

---

## 3. Schema Change Summary

| Collection | Change Type | New Fields |
|---|---|---|
| `MetricsDaily` | [CHANGE] | `backToBackBlocks`, `meetingFragmentScore`, `weekendActivityRate`, `focusHoursWeek`, `crossTeamContacts`, `messageCount`, `asyncParticipationIdx`, `dataQuality`, `activeUserCount` |
| `BehavioralDriftIndex` | [CHANGE] | `scoringVersion`, `auditLogId` |
| `RiskWeekly` | [CHANGE] | `inputSnapshot`, `contributions`, `scoringVersion` |
| `Team` | [CHANGE] | `capacityDriftScore`, `coordinationDragScore`, `cohesionDriftScore`, `overallDriftScore`, `driftScoreUpdatedAt`, `analyticsEnabled`, `privacyGateFiredAt` |
| `Baseline` | [CHANGE] | `weekend_activity`, `cross_team_contacts` metric keys; `scoringVersion` |
| `ScoringAuditLog` | [NEW] | Full new collection |
| `TeamSizeGate` | [NEW] | Full new collection |
| `RetentionPolicy` | [NEW] | Full new collection |
| `DSARRequest` | [NEW] | Full new collection |
| `User` | [CHANGE] | `privacyConsentGivenAt`, `privacyConsentVersion`, `deletedAt` |
| `Organization` | [CHANGE] | `minTeamSizeForAnalytics`, `privacyMode` |

---

## 4. API Endpoint Definitions — Per Component

**Global conventions:**

- Base URL: `https://api.signaltrue.com` (production) / `http://localhost:8080` (dev)
- All endpoints prefixed with `/api`
- Authentication: `Authorization: Bearer <jwt>` unless marked **[PUBLIC]**
- Error envelope: `{ "error": true, "message": "...", "code": "ERROR_CODE" }`
- Success envelope: `{ "data": ..., "meta": { ... } }`
- Privacy-suppressed response: HTTP 204 + `{ "suppressed": true, "reason": "insufficient_sample", "minRequired": 5 }`

---

### 4.1 Authentication & User Management

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | [PUBLIC] | Register a new user + org |
| POST | `/api/auth/login` | [PUBLIC] | Log in, returns JWT |
| POST | `/api/auth/logout` | ✓ | Invalidate session |
| POST | `/api/auth/refresh` | ✓ | Refresh JWT |
| POST | `/api/auth/forgot-password` | [PUBLIC] | Send reset email |
| POST | `/api/auth/reset-password` | [PUBLIC] | Reset password with token |
| GET  | `/api/auth/me` | ✓ | Get current user profile |
| PUT  | `/api/auth/me` | ✓ | Update profile |
| POST | `/api/auth/consent` | ✓ | **[NEW]** Record GDPR consent (`{ version, givenAt }`) |

**POST /api/auth/register**
```
Body:    { email, password, name, orgName }
Returns: { data: { userId, orgId, token } }
```

**POST /api/auth/login**
```
Body:    { email, password }
Returns: { data: { token, expiresAt, user: { id, email, role, orgId } } }
```

---

### 4.2 Teams & Organizations

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/organizations/:orgId` | ✓ | Get org details |
| PUT  | `/api/organizations/:orgId` | admin | Update org settings |
| GET  | `/api/teams` | ✓ | List teams for caller's org |
| POST | `/api/teams` | admin | Create a team |
| GET  | `/api/teams/:teamId` | ✓ | Get team details |
| PUT  | `/api/teams/:teamId` | admin | Update team metadata |
| DELETE | `/api/teams/:teamId` | admin | Delete team + cascade |
| GET  | `/api/teams/:teamId/members` | ✓ | List team members |
| POST | `/api/teams/:teamId/members` | admin | Add member |
| DELETE | `/api/teams/:teamId/members/:userId` | admin | Remove member |
| GET  | `/api/teams/:teamId/state` | ✓ | **[NEW]** Current team health state + composite drift scores |

**GET /api/teams/:teamId/state**
```
Returns: {
  data: {
    state: 'healthy' | 'strained' | 'overloaded' | 'breaking',
    bdi: 72,
    overallDriftScore: 54,
    capacityDriftScore: 60,
    coordinationDragScore: 50,
    cohesionDriftScore: 42,
    analyticsEnabled: true,
    updatedAt: ISO8601
  }
}
```

---

### 4.3 Integrations

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/integrations` | ✓ | List connected integrations for org |
| POST | `/api/integrations/slack/connect` | admin | Connect Slack workspace (OAuth) |
| POST | `/api/slack/refresh` | admin | Trigger Slack data pull |
| GET  | `/api/calendar/events` | ✓ | List calendar events (authenticated user) |
| POST | `/api/calendar/refresh/:teamId` | admin | Trigger calendar refresh for team |
| POST | `/api/integrations/google-chat/connect` | admin | Connect Google Chat space |
| POST | `/api/integrations/outlook/connect` | admin | Connect Outlook/Teams |
| GET  | `/api/integrations/:teamId/coverage` | ✓ | **[NEW]** Integration data coverage report |
| DELETE | `/api/integrations/:integrationId` | admin | Disconnect integration |

**GET /api/integrations/:teamId/coverage**
```
Returns: {
  data: {
    sources: {
      slack:            { connected: true,  lastSync: ISO8601, coveragePct: 0.87 },
      google_calendar:  { connected: true,  lastSync: ISO8601, coveragePct: 0.95 },
      google_chat:      { connected: false, lastSync: null,    coveragePct: 0    },
      outlook:          { connected: false, lastSync: null,    coveragePct: 0    },
    },
    overallCoverage: 0.91,
    recommendation: 'Connect Google Chat for messaging signals.'
  }
}
```

---

### 4.4 Metrics & Baselines

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/metrics/:teamId/daily` | ✓ | Daily metrics (query: `?from=&to=`) |
| GET  | `/api/metrics/:teamId/weekly` | ✓ | Weekly aggregated metrics |
| POST | `/api/metrics/:teamId/ingest` | service | **[NEW]** Internal: write MetricsDaily record |
| GET  | `/api/baselines/:teamId` | ✓ | Get team baseline |
| POST | `/api/baselines/:teamId/recalculate` | admin | Force baseline recalculation |
| GET  | `/api/baselines/:teamId/confidence` | ✓ | **[NEW]** Baseline confidence + quality report |

**GET /api/metrics/:teamId/daily**
```
Query:   ?from=2026-04-01&to=2026-04-30&fields=meetingHoursWeek,afterHoursRate
Returns: {
  data: [ { date, meetingHoursWeek, afterHoursRate, focusTimeRatio, ... } ]
}
```

**GET /api/baselines/:teamId/confidence**
```
Returns: {
  data: {
    confidence: 0.82,
    sampleDays: 28,
    windowDays: 30,
    meetsMinimum: true,
    gapDays: 2,
    recommendation: 'Confidence will reach high in 2 more days of data.'
  }
}
```

---

### 4.5 Behavioral Drift Index (BDI)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/bdi/:teamId` | ✓ | Latest BDI record for team |
| GET  | `/api/bdi/:teamId/history` | ✓ | BDI history (query: `?weeks=12`) |
| POST | `/api/bdi/:teamId/calculate` | admin | Trigger BDI calculation now |
| GET  | `/api/bdi/:orgId/org` | ✓ | All team BDIs for an org |
| GET  | `/api/bdi/:teamId/drivers` | ✓ | Top signal drivers for latest BDI |
| GET  | `/api/bdi/:teamId/timeline` | ✓ | Drift state timeline |

**GET /api/bdi/:teamId**
```
Returns: {
  data: {
    teamId, periodStart, periodEnd,
    state: 'Early Drift',
    driftScore: 42,
    deviatingSignalsCount: 2,
    negativeSignalsCount: 2,
    signals: {
      meetingLoad:          { value: 28, deviating: true,  direction: 'negative' },
      afterHoursActivity:   { value: 18, deviating: false, direction: 'neutral'  },
      responseTime:         { value: 3.2,deviating: true,  direction: 'negative' },
      asyncParticipation:   { value: 94, deviating: false, direction: 'neutral'  },
      focusTime:            { value: 12, deviating: false, direction: 'neutral'  },
      collaborationBreadth: { value: 8,  deviating: false, direction: 'neutral'  },
    },
    topDrivers: [ { signal: 'meetingLoad', contribution: 38, currentValue: 28, baselineValue: 20, change: '+40%' } ],
    summary: 'Meeting load and response time are deviating negatively.',
    confidence: 0.84,
    scoringVersion: '1.0.0',
    updatedAt: ISO8601
  }
}
```

---

### 4.6 Risk Scores & Drivers

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/risks/:teamId/current` | ✓ | All three current risk scores |
| GET  | `/api/risks/:teamId/history` | ✓ | Risk history (query: `?weeks=12&type=overload`) |
| GET  | `/api/risks/:teamId/drivers` | ✓ | Risk drivers for the latest week |
| POST | `/api/risks/:teamId/calculate` | admin | Trigger full risk recalculation |
| GET  | `/api/risks/:orgId/org-summary` | ✓ | All teams' risk summary for org |

**GET /api/risks/:teamId/current**
```
Returns: {
  data: {
    weekStart: ISO8601,
    overload:         { score: 48, band: 'yellow', confidence: 'high', explanation: '...' },
    execution:        { score: 62, band: 'yellow', confidence: 'medium', explanation: '...' },
    retention_strain: { score: 31, band: 'green',  confidence: 'high', explanation: '...' },
    teamState: 'strained'
  }
}
```

**GET /api/risks/:teamId/drivers**
```
Returns: {
  data: {
    overload: [
      { metricKey: 'after_hours_activity', contributionWeight: 0.35, deviation: 0.54, explanationText: '...' },
      ...
    ],
    execution: [ ... ],
    retention_strain: [ ... ]
  }
}
```

---

### 4.7 Signals

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/signals` | ✓ | Signals for caller's org (query: `?teamId=&severity=&type=`) |
| GET  | `/api/signals/:signalId` | ✓ | Single signal detail |
| POST | `/api/signals` | service | Create signal (internal ingestion) |
| PUT  | `/api/signals/:signalId/resolve` | admin | Mark signal resolved |
| GET  | `/api/signals/:teamId/summary` | ✓ | **[NEW]** Signal summary by severity for team |

---

### 4.8 AI Copilot

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/ai/copilot` | ✓ | Generate analysis + recommendations from signals payload |
| POST | `/api/ai/copilot/playbooks` | ✓ | Get matching playbooks for signals |
| POST | `/api/ai/copilot/what-to-measure` | ✓ | Recommend integrations based on gaps |
| POST | `/api/ai/copilot/feedback` | ✓ | Submit feedback on a copilot response |
| GET  | `/api/ai/copilot/usage` | admin | **[NEW]** AI token usage summary |

**POST /api/ai/copilot** — enforces `privacy_mode: 'metadata_only'`
```
Body: {
  teamId: ObjectId,
  timeRange: { from: ISO8601, to: ISO8601 },
  signals: { ... },            // optional override
  policies: {
    privacy_mode: 'metadata_only'   // REQUIRED
  }
}
Returns: {
  data: {
    summary: 'string',
    evidence: [ { metric, value, baseline, change } ],
    recommendedActions: [ { action, priority, rationale } ],
    playbooks: [ { title, steps } ],
    templates: [ { context, message } ],
    metadata_only_confirmed: true
  }
}
```

---

### 4.9 Weekly Brief & Reports

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/weekly-brief/:orgId` | ✓ | Latest weekly brief HTML |
| POST | `/api/weekly-brief/:orgId/generate` | admin | Trigger brief generation now |
| POST | `/api/weekly-brief/:orgId/send` | admin | Email brief to recipients |
| GET  | `/api/reports/:teamId/monthly` | ✓ | Monthly leadership report |
| GET  | `/api/reports/:orgId/export` | admin | Export full report (PDF/CSV) |
| GET  | `/api/reports/:teamId/ceo-summary` | executive | CEO summary |

---

### 4.10 Playbooks & Actions

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/playbooks` | ✓ | List all available playbooks |
| GET  | `/api/playbooks/:playbookId` | ✓ | Get single playbook |
| POST | `/api/playbooks/match` | ✓ | Match playbooks to current team signals |
| GET  | `/api/actions/:teamId` | ✓ | Recommended actions for team |
| PUT  | `/api/actions/:actionId/complete` | ✓ | Mark action completed |

---

### 4.11 Dashboard & Insights

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/insights/:orgId/overview` | ✓ | Org-level insight overview |
| GET  | `/api/insights/:teamId/detail` | ✓ | Team-level insight detail |
| GET  | `/api/dashboard/:orgId` | ✓ | Full dashboard data bundle (BDI + risks + signals) |
| GET  | `/api/comparisons/:teamId` | ✓ | Team vs org average vs benchmark |
| GET  | `/api/benchmarks` | ✓ | Industry benchmark data |

**GET /api/dashboard/:orgId** — single response bundle for the dashboard
```
Returns: {
  data: {
    teams: [
      {
        teamId, name, state,
        bdi: { driftScore, state },
        risks: { overload, execution, retention_strain },
        topSignals: [ ... ],
        analyticsEnabled: true
      }
    ],
    orgSummary: { avgBDI, riskDistribution: { green: 4, yellow: 2, red: 1 } },
    lastUpdated: ISO8601
  }
}
```

---

### 4.12 Admin / Superadmin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/admin/orgs` | superadmin | List all orgs |
| POST | `/api/admin/orgs/:orgId/purge` | superadmin | **[NEW]** Trigger data purge per retention policy |
| GET  | `/api/admin/scoring-audit` | superadmin | **[NEW]** Query `ScoringAuditLog` |
| POST | `/api/admin/scoring-audit/:teamId/run` | superadmin | **[NEW]** Manually trigger full scoring run |
| GET  | `/api/admin/team-size-gates` | superadmin | **[NEW]** List privacy gate events |

---

### 4.13 [NEW] Privacy & DSAR

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/privacy/dsar` | ✓ | Submit DSAR request (`export` / `delete` / `rectify`) |
| GET  | `/api/privacy/dsar/:requestId` | ✓ | Check DSAR status |
| GET  | `/api/privacy/dsar` | admin | List all DSAR requests for org |
| POST | `/api/privacy/dsar/:requestId/process` | admin | Process a DSAR request |
| GET  | `/api/privacy/consent/:userId` | admin | Get user consent record |
| POST | `/api/privacy/purge/:orgId` | admin | Trigger retention purge for org |

**POST /api/privacy/dsar**
```
Body:    { requestType: 'export' | 'delete' | 'rectify', notes: '...' }
Returns: { data: { requestId, status: 'pending', estimatedCompletionAt } }
```

---

### 4.14 [NEW] Scoring Engine (Internal)

These endpoints are **service-internal**, not exposed publicly. They are called by the scheduler or admin triggers only. Authenticated via service token (`X-Service-Token` header).

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/internal/scoring/run/:teamId` | service | Run full scoring for one team |
| POST | `/internal/scoring/run-org/:orgId` | service | Run scoring for all teams in org |
| POST | `/internal/scoring/bdi/:teamId` | service | Run BDI calculation only |
| POST | `/internal/scoring/risks/:teamId` | service | Run all three risk calculations |
| POST | `/internal/scoring/composite/:teamId` | service | Run composite drift scores |
| GET  | `/internal/scoring/status/:teamId` | service | Last run status + output summary |

---

## 5. Scoring Engine — Single Service Specification

**File to create:** `backend/services/scoringEngineService.js`

This service is the **single authoritative source** for all score computation in SignalTrue. It replaces the current fragmented calls to `bdiService.js`, `riskCalculationService.js`, and ad-hoc scoring in other services. All scores — BDI, risk, composite drift — flow through this service.

---

### 5.1 Purpose and Boundaries

**Responsibilities:**
- Fetch inputs (metrics, baselines) from DB
- Apply privacy gate (suppress if `actualSize < minTeamSizeForAnalytics`)
- Run all scoring algorithms with explicit, auditable weights
- Write `BehavioralDriftIndex`, `RiskWeekly`, `RiskDriver`, `TeamState`, and update `Team` composite score fields
- Write `ScoringAuditLog` entry for every run
- Return a structured `ScoringResult` object

**Not responsible for:**
- Integration data ingestion (slackService, calendarService)
- AI-text generation (aiCopilotService)
- Email / notification dispatch (weeklyBriefService)
- Frontend-facing API responses (route handlers call this service)

---

### 5.2 Inputs

```js
/**
 * @typedef {Object} ScoringInput
 * @property {string}  teamId       - MongoDB ObjectId
 * @property {Date}    weekStart    - Start of the scoring week (Monday 00:00 UTC)
 * @property {string}  trigger      - 'cron' | 'manual' | 'api' | 'integration_push'
 * @property {boolean} [forceRun]   - bypass privacy gate for admin overrides (logged)
 */
```

**Metric keys used in scoring:**

| Key | MetricsDaily field | Higher is better |
|---|---|---|
| `after_hours_activity` | `afterHoursRate` | No |
| `meeting_load` | `meetingLoadIndex` | No |
| `back_to_back_meetings` | `backToBackBlocks` | No |
| `focus_time` | `focusTimeRatio` | Yes |
| `response_time` | `responseMedianMins` | No |
| `participation_drift` | `uniqueContacts` | Yes |
| `meeting_fragmentation` | `meetingFragmentScore` | No |
| `weekend_activity` | `weekendActivityRate` | No |
| `cross_team_contacts` | `crossTeamContacts` | Yes |
| `async_participation` | `asyncParticipationIdx` | Yes |

---

### 5.3 Composite Score Architecture

The scoring engine implements **two complementary score systems** that coexist:

**System A — Existing (preserved, required by current UI):**

| Score | Model | Output |
|---|---|---|
| BDI (Behavioral Drift Index) | 6-signal count model | `driftScore` 0–100, `state` |
| Overload Risk | 4-metric weighted deviation | `score` 0–100, `band` |
| Execution Risk | 4-metric weighted deviation | `score` 0–100, `band` |
| Retention Strain Risk | 3-metric trend slope | `score` 0–100, `band` |

**System B — Proposed Composite (new, written to Team fields):**

| Score | Weight | Output |
|---|---|---|
| Capacity Drift Score | 40% of Overall | `capacityDriftScore` 0–100 |
| Coordination Drag Score | 35% of Overall | `coordinationDragScore` 0–100 |
| Cohesion Drift Score | 25% of Overall | `cohesionDriftScore` 0–100 |
| **Overall Team Drift Score** | — | `overallDriftScore` 0–100 |

Both systems run in every `scoringEngineService.runFullScoring()` call.

---

### 5.4 Capacity Drift Score

**Purpose:** Measure whether the team's capacity is being eroded by unsustainable patterns.

**Inputs and weights:**

| Metric | Weight | Direction |
|---|---|---|
| `after_hours_activity` | 0.30 | higher → worse |
| `meeting_load` | 0.25 | higher → worse |
| `back_to_back_meetings` | 0.20 | higher → worse |
| `focus_time` | 0.15 | lower → worse (inverted) |
| `weekend_activity` | 0.10 | higher → worse |

**Formula:**

```
deviationᵢ = (currentᵢ − baselineᵢ) / baselineᵢ        // clamped to [−1, +1]
// For focus_time: deviationᵢ = −deviationᵢ            // invert: less focus = positive risk
contributionᵢ = max(0, deviationᵢ) × weightᵢ
CapacityDriftScore = round(Σ contributionᵢ × 100)        // 0–100
```

---

### 5.5 Coordination Drag Score

**Purpose:** Detect coordination breakdown — slow responses, fragmented time, unresolved collaboration loops.

**Inputs and weights:**

| Metric | Weight | Direction |
|---|---|---|
| `response_time` | 0.30 | higher → worse |
| `meeting_fragmentation` | 0.25 | higher → worse |
| `participation_drift` | 0.20 | lower → worse (inverted) |
| `cross_team_contacts` | 0.15 | lower → worse (inverted, if cross-team activity drops) |
| `async_participation` | 0.10 | lower → worse (inverted) |

**Formula:** same deviation + contribution pattern as Capacity.

```
CoordinationDragScore = round(Σ contributionᵢ × 100)     // 0–100
```

---

### 5.6 Cohesion Drift Score

**Purpose:** Detect communication concentration, social isolation patterns, and weakening team cohesion.

**Inputs and weights:**

| Metric | Weight | Direction |
|---|---|---|
| `collaboration_breadth` (BDI signal) | 0.35 | lower → worse (inverted) |
| `async_participation` | 0.25 | lower → worse (inverted) |
| `response_time` (as silence proxy) | 0.20 | higher → worse |
| `after_hours_activity` (burnout proxy) | 0.20 | higher → worse |

**Formula:** same deviation + contribution pattern.

```
CohesionDriftScore = round(Σ contributionᵢ × 100)        // 0–100
```

---

### 5.7 Overall Team Drift Score

```
OverallDriftScore = round(
  0.40 × CapacityDriftScore +
  0.35 × CoordinationDragScore +
  0.25 × CohesionDriftScore
)
```

**Banding:**

| Score | Band | Label |
|---|---|---|
| 0–24 | green | Stable |
| 25–49 | yellow | Watch |
| 50–74 | orange | Concerning |
| 75–100 | red | Critical |

---

### 5.8 Behavioral Drift Index (BDI)

**Preserved from existing `bdiService.js` — now called from scoring engine.**

**Signals (6):**

| Signal | Threshold (% change) | Higher worse |
|---|---|---|
| `meetingLoad` | 20% | Yes |
| `afterHoursActivity` | 30% | Yes |
| `responseTime` | 25% | Yes |
| `asyncParticipation` | 20% | No (lower is worse) |
| `focusTime` | 20% | No (lower is worse) |
| `collaborationBreadth` | 25% | No (lower is worse) |

**Deviation check per signal:**
```
percentChange = ((current − baseline) / baseline) × 100
deviating = |percentChange| > threshold
direction = if signal is "higher-worse":
              percentChange > threshold → 'negative'
              percentChange < −threshold → 'positive'
            else (lower-worse):
              percentChange < −threshold → 'negative'
              percentChange > threshold → 'positive'
```

**Score:**
```
negativeSignalsCount = count(signals where direction === 'negative')
driftScore = min(round((negativeSignalsCount / 6) × 100), 100)
```

**State mapping:**
```
negativeSignalsCount = 0–1  →  'Stable'
negativeSignalsCount = 2    →  'Early Drift'
negativeSignalsCount = 3–4  →  'Developing Drift'
negativeSignalsCount = 5–6  →  'Critical Drift'
```

**Top drivers:** top 3 signals sorted by `|percentChange|` descending.

**Known gap:** driftScore is count-based, not magnitude-weighted. A future v2 improvement is:
```
driftScore_v2 = round(Σ (|percentChange| / threshold) × directionWeight / 6 × 100)
```
This is specced but not yet implemented. Mark as `scoringVersion: '1.1.0'` when shipped.

---

### 5.9 Overload Risk

**Formula (preserved from `riskCalculationService.js`):**

```
overload_risk =
  0.35 × max(0, deviation(after_hours_activity)) +
  0.30 × max(0, deviation(meeting_load)) +
  0.20 × max(0, deviation(back_to_back_meetings)) +
  0.15 × max(0, deviation(focus_time, isHigherBetter=true))

score = round(overload_risk × 100)   // 0–100
band  = score < 35 ? 'green' : score < 65 ? 'yellow' : 'red'
```

`deviation(x, baseline, isHigherBetter)`:
```
d = (x − baseline) / baseline         // clamped to [−1, +1]
if isHigherBetter: d = −d
return clamp(d, −1, 1)
```

**Drivers:** any metric with `deviation > 0.1` is recorded in `RiskDriver`.

---

### 5.10 Execution Risk

```
execution_risk =
  0.30 × max(0, deviation(response_time)) +
  0.25 × max(0, deviation(participation_drift, isHigherBetter=true)) +
  0.25 × max(0, deviation(meeting_fragmentation)) +
  0.20 × max(0, deviation(focus_time, isHigherBetter=true))

score = round(execution_risk × 100)
band  = getRiskBand(score)
```

---

### 5.11 Retention Strain Risk

**Based on 3-week trend slope, not point deviation:**

For each metric, compute linear regression slope over 21 days of `MetricsDaily` data:

```
slope = linearRegressionSlope(daily values over 21 days)
normalizedSlope = slope / mean(daily values)   // dimensionless

retention_strain_risk =
  0.40 × max(0, normalizedSlope(after_hours_activity)) +
  0.30 × max(0, normalizedSlope(meeting_load)) +
  0.30 × max(0, normalizedSlope(response_time))

score = round(retention_strain_risk × 100)
band  = getRiskBand(score)
```

**Drivers:** any metric with `normalizedSlope > 0.1` is recorded.

---

### 5.12 Team State Determination

```
function determineTeamState(overloadScore, executionScore, retentionScore, recentExecutionHighWeeks):
  if recentExecutionHighWeeks >= 2 (execution score ≥ 65 for last 2 weeks):
    return 'breaking'
  if overloadScore >= 65:
    return 'overloaded'
  if overloadScore >= 35 OR executionScore >= 35 OR retentionScore >= 35:
    return 'strained'
  return 'healthy'
```

---

### 5.13 Baseline Management

**Baseline window:** 30 calendar days from first data point.

**Baseline statistics computed per metric:**

```
{ mean, median, std, mad, p25, p75, sampleSize, confidence }
```

**Confidence scoring** (`baselineCalculations.js`):

```
confidence = (sampleSize / windowDays) × coverageWeight × qualityWeight
```

Where:
- `coverageWeight` = fraction of days with non-zero data
- `qualityWeight` = fraction of metrics with `sampleSize ≥ 5`

**Baseline update trigger:** recompute if `sampleSize` changes by > 5% since last update, or if admin requests.

**Rolling update (future):** baselines should shift with an exponentially weighted window (EWA) with `α = 0.1`. Not yet implemented. Plan as `scoringVersion: '1.2.0'`.

---

### 5.14 Confidence Scoring

Every scoring run produces a `confidence` field (`low | medium | high`):

```
function determineConfidence(baselines):
  coveredMetrics = count(metrics where baselineMean > 0)
  totalMetrics   = count(all required metrics)
  ratio = coveredMetrics / totalMetrics

  if ratio >= 0.8:  return 'high'
  if ratio >= 0.5:  return 'medium'
  return 'low'
```

---

### 5.15 Privacy Gate

**Called at the start of every scoring run, before any DB writes or calculations.**

```js
async function privacyGate(teamId, orgId) {
  const team = await Team.findById(teamId).select('metadata.actualSize').lean();
  const org  = await Organization.findById(orgId).select('minTeamSizeForAnalytics').lean();

  const minSize = org?.minTeamSizeForAnalytics ?? 5;
  const actualSize = team?.metadata?.actualSize ?? 0;

  if (actualSize < minSize) {
    // Log suppression
    await TeamSizeGate.create({ teamId, orgId, endpoint: 'scoringEngine', reportedSize: actualSize, minRequired: minSize });
    await Team.findByIdAndUpdate(teamId, { analyticsEnabled: false, privacyGateFiredAt: new Date() });
    return { passed: false, reason: 'insufficient_sample', actualSize, minRequired: minSize };
  }

  return { passed: true };
}
```

If gate fails, `runFullScoring` writes a `ScoringAuditLog` entry with `privacySuppressed: true` and returns early. No scores are written to DB.

---

### 5.16 Audit Trail

Every `runFullScoring` call writes exactly one `ScoringAuditLog` document:

```js
await ScoringAuditLog.create({
  teamId, orgId,
  runAt: new Date(),
  trigger,
  scoreType: 'full_run',
  scoringVersion: SCORING_VERSION,  // semver constant at top of file
  inputSnapshot: { weekStart, metricsUsed, baselines, baselineConf, teamSize },
  outputSnapshot: { scores, bands, state, drivers },
  weights: WEIGHTS,
  privacyGatePassed: gate.passed,
  privacySuppressed: !gate.passed,
  durationMs: Date.now() - startTime,
});
```

---

### 5.17 Service Interface (function signatures)

```js
// backend/services/scoringEngineService.js

export const SCORING_VERSION = '1.0.0';

/**
 * Run all scores for a team. Entry point for scheduler and admin triggers.
 * @param {string} teamId
 * @param {Date}   weekStart
 * @param {string} trigger   'cron' | 'manual' | 'api' | 'integration_push'
 * @returns {Promise<ScoringResult>}
 */
export async function runFullScoring(teamId, weekStart, trigger = 'cron') { ... }

/**
 * Run only BDI calculation.
 */
export async function runBDI(teamId, weekStart, trigger = 'cron') { ... }

/**
 * Run only risk calculations (overload, execution, retention_strain).
 */
export async function runRiskScores(teamId, weekStart, trigger = 'cron') { ... }

/**
 * Run only composite drift scores (capacity, coordination, cohesion, overall).
 */
export async function runCompositeDrift(teamId, weekStart, trigger = 'cron') { ... }

/**
 * Run full scoring for every team in an org.
 */
export async function runOrgScoring(orgId, weekStart, trigger = 'cron') { ... }

/**
 * @typedef {Object} ScoringResult
 * @property {string}  teamId
 * @property {boolean} suppressed          - true if privacy gate blocked run
 * @property {string}  [suppressReason]
 * @property {Object}  bdi                 - { driftScore, state, topDrivers, confidence }
 * @property {Object}  risks               - { overload, execution, retention_strain }
 * @property {Object}  compositeDrift      - { capacity, coordination, cohesion, overall }
 * @property {string}  teamState           - 'healthy' | 'strained' | 'overloaded' | 'breaking'
 * @property {string}  auditLogId          - ScoringAuditLog._id
 * @property {number}  durationMs
 */
```

---

### 5.18 Error Handling

| Situation | Behavior |
|---|---|
| Team not found | Throw `ScoringError('TEAM_NOT_FOUND')`, log to audit with `error` field |
| No metrics data | Return all scores = 0, confidence = 'low', write audit log |
| Baseline not established | Calculate with `confidence = 'low'`, note in audit log |
| DB write failure | Rollback in-memory, write audit log with `error`, surface to caller |
| Privacy gate fires | Write `TeamSizeGate`, write audit log with `privacySuppressed: true`, return `{ suppressed: true }` |

All errors are caught, written to `ScoringAuditLog.error`, and re-thrown as structured `ScoringError` objects:

```js
class ScoringError extends Error {
  constructor(code, message, meta = {}) {
    super(message);
    this.code = code;
    this.meta = meta;
  }
}
```

---

### 5.19 Scheduling

The scoring engine should run on the following schedule (configured in `backend/server.js` or `integrationSyncScheduler.js`):

| Trigger | Schedule | Scope |
|---|---|---|
| Weekly full scoring (all orgs) | Every Monday 02:00 UTC | `runOrgScoring` for all orgs |
| Post-integration sync | After any successful Slack/Calendar/Chat refresh | `runFullScoring` for that team |
| On-demand | Admin API call to `/internal/scoring/run/:teamId` | Single team |
| Nightly BDI-only | Every night 01:00 UTC | `runBDI` for all teams with new data |

Cron expressions:
```
Full weekly scoring:  '0 2 * * 1'     // Monday 02:00 UTC
Nightly BDI:          '0 1 * * *'     // Every night 01:00 UTC
```

---

## 6. Implementation Gaps & Remediation

| # | Gap | Priority | Remediation |
|---|---|---|---|
| 1 | **Privacy gate not uniformly enforced** — many API endpoints and UI components return team analytics without checking `actualSize`. | P0 — before pilot | Add `enforcePrivacyGate` middleware to all `/api/bdi/*`, `/api/risks/*`, `/api/metrics/*`, `/api/insights/*` routes. Middleware reads `Team.analyticsEnabled` and returns 204 if false. |
| 2 | **ScoringAuditLog does not exist** — no immutable record of score computation. | P0 — before pilot | Create `scoringAuditLog.js` model (section 2.11) and wire into every scoring call. |
| 3 | **`chatLog.js` and `documentChunk.js` may store raw message content** — compliance risk. | P0 — before pilot | Audit both models. If text is stored: encrypt at rest, enforce access control, add to retention policy (30-day purge). Confirm content is never sent to AI providers. |
| 4 | **No DSAR endpoints** — GDPR/CCPA non-compliant. | P0 — before pilot | Implement `DSARRequest` model and `/api/privacy/dsar` endpoints (section 4.13). |
| 5 | **`RetentionPolicy` not implemented** — data piles up indefinitely. | P0 — before pilot | Create model (section 2.13), add purge cron (`0 3 * * 0` Sunday 03:00 UTC), wire `purgeExpiredData.js` utility. |
| 6 | **BDI driftScore is purely count-based** — low resolution. | P1 — before paid customers | Implement magnitude-weighted driftScore_v2 (section 5.8). Ship as `scoringVersion: '1.1.0'`. |
| 7 | **Composite drift scores not implemented** — `capacityDriftScore`, `coordinationDragScore`, `cohesionDriftScore`, `overallDriftScore` fields on Team are empty. | P1 — before paid customers | Implement sections 5.4–5.7 in `scoringEngineService.js`. |
| 8 | **No background job queue** — synchronous scoring blocks the Express process for large orgs. | P1 — before paid customers | Add BullMQ + Redis. Each `runFullScoring` call enqueues a job. Express route returns `{ jobId }` immediately and result is polled or pushed via webhook. |
| 9 | **No server-side PDF generation** — weekly brief is HTML-only. | P2 | Add Puppeteer (headless Chromium) to backend. `weeklyBriefService.generatePDF(orgId)` renders the HTML brief to PDF and stores at signed URL. |
| 10 | **Energy index auto-tuning is not implemented** — `energyWeights` field on `MetricsDaily` is populated but the auto-tune loop is missing. | P2 | Implement a simple OLS regression weekly job that updates `energyWeights` based on correlation of inputs with a proxy outcome (e.g., `retentionStrain` score). |
| 11 | **Baseline uses first-30-day window only** — no rolling update. | P2 | Implement EWA baseline update (`α = 0.1`) in `baselineService.js`. Ship as `scoringVersion: '1.2.0'`. |
| 12 | **No integration tests for scoring** — formulas are not validated by tests. | P1 | Add Jest tests for every formula in `scoringEngineService.js`. Provide fixture inputs and expected outputs for each score type. |

---

*Document end. Single authoritative source for SignalTrue scoring, schema, and API design.*  
*All [NEW] and [CHANGE] items are design proposals against the `main` branch as of 2026-05-02.*
