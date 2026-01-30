# SignalTrue: Causal Drift Engine - Implementation Plan

**Generated**: January 30, 2026  
**Based on**: DeepTech Category King Execution Spec Analysis

---

## Executive Summary

Your spec is ambitious. Based on my analysis, you have **~40% of the foundation already built**. This plan prioritizes what to push now, what to soften, and what to delay.

---

## CURRENT STATE ASSESSMENT

### ✅ ALREADY BUILT (Use These)

| Component | Location | Status |
|-----------|----------|--------|
| **Baseline Engine (v0.8)** | `backend/services/baselineService.js` | Functional but static thresholds |
| **Drift Detection (v0.9)** | `backend/services/driftService.js`, `bdiService.js` | Good — change-point detection exists |
| **BDI Model** | `backend/models/behavioralDriftIndex.js` | 6 signals, 4 states, driver ranking |
| **Intervention Model** | `backend/models/intervention.js` | 14-day outcome tracking built |
| **Learning Loop (v0.7)** | `backend/services/learningLoopService.js` | Records outcomes, retrieves patterns |
| **Drift Timeline** | `backend/models/driftTimeline.js` | Baseline → Signal → Action → Resolution |
| **Privacy Foundations** | Consent audit model, no message content | Partial |

### ⚠️ NEEDS UPGRADE

| Component | Current State | Gap |
|-----------|--------------|-----|
| **Baselines** | Static 30-day average | No seasonality, no role-awareness |
| **Causal Attribution** | `topDrivers` = ranked correlation | No causal graph, no counterfactuals |
| **Outcome Measurement** | Before/after delta | No control groups, weak confidence |
| **Work Graph** | Not implemented | No structural pressure mapping |
| **Privacy Mirror** | Backend only | No employee-facing UI |

### ❌ NOT BUILT

| Component | Spec Requirement | Risk Level |
|-----------|-----------------|------------|
| Causal Inference Engine | Full causal graphs, synthetic controls | 🔴 HIGH |
| Work Graph | Nodes (Person, Meeting, Project), Edges (Interrupts, Blocks) | 🔴 HIGH |
| Counterfactual Estimation | "If we remove X..." | 🔴 HIGH |
| Control Group Outcome | A/B-style proof | 🟠 MEDIUM |
| Federated Learning | Privacy-preserving ML | 🟠 MEDIUM |

---

## PHASE 1: MOAT FOUNDATION (Weeks 1-6)
**Priority**: 🔴 CRITICAL — Do This First

### 1.1 Upgrade Baseline Engine to Adaptive Baselines

**Current**: `baselineService.js` uses static 30-day average  
**Target**: Seasonality-aware, role-aware, tool-aware baselines

```javascript
// NEW: backend/services/adaptiveBaselineService.js

const AdaptiveBaseline = {
  // Per-entity adaptive baseline with:
  // 1. Day-of-week patterns (Monday vs Friday)
  // 2. Seasonal adjustments (Q4 crunch, summer lull)
  // 3. Role normalization (IC baseline ≠ manager baseline)
  // 4. Tool weight (Slack-heavy team vs Calendar-heavy team)
}
```

**Files to create/modify**:
```
backend/
├── services/
│   └── adaptiveBaselineService.js    # NEW - Core adaptive logic
├── models/
│   └── adaptiveBaseline.js           # NEW - Schema with seasonal patterns
└── routes/
    └── baselines.js                  # NEW - API for baseline inspection
```

**Schema additions** (to `adaptiveBaseline.js`):
```javascript
{
  entityType: { type: String, enum: ['individual', 'team', 'org'] },
  entityId: ObjectId,
  
  // Seasonality patterns
  dayOfWeekPattern: {
    monday: { meetingLoad: Number, afterHours: Number, ... },
    tuesday: { ... },
    // ...
  },
  
  // Role normalization
  roleType: { type: String, enum: ['IC', 'Manager', 'Leader', 'Executive'] },
  roleAdjustments: {
    meetingLoadMultiplier: { type: Number, default: 1.0 },
    afterHoursToleranceMultiplier: { type: Number, default: 1.0 }
  },
  
  // Tool weights (auto-detected from usage)
  toolProfile: {
    slackWeight: { type: Number, default: 0.5 },    // 0-1
    calendarWeight: { type: Number, default: 0.5 }  // 0-1
  },
  
  // Expected ranges (dynamically computed)
  expectedRanges: {
    meetingLoad: { min: Number, max: Number },
    afterHoursActivity: { min: Number, max: Number },
    responseTime: { min: Number, max: Number },
    // ...
  },
  
  // Confidence in baseline
  baselineConfidence: { type: Number }, // 0-100
  sampleDays: { type: Number },
  lastUpdated: { type: Date }
}
```

**Implementation priority**: ⭐⭐⭐⭐⭐  
**Risk**: 🟢 LOW — Extension of existing system  
**Effort**: 2 weeks

---

### 1.2 Enhance Drift Detection with Multi-Signal Correlation

**Current**: `driftService.js` detects per-signal drift independently  
**Target**: Detect correlated drift patterns (e.g., meeting load + after-hours rising together)

**Files to modify**:
```
backend/services/driftService.js  # Add correlation detection
```

**New logic to add**:
```javascript
// After individual signal drift detection, add:

async function detectCorrelatedDrift(signals, baseline) {
  const correlations = [];
  
  // Check pairwise signal correlations
  const pairs = [
    ['meetingLoad', 'afterHoursActivity'],      // Common: More meetings → more after-hours
    ['meetingLoad', 'focusTime'],               // Inverse: More meetings → less focus
    ['responseTime', 'afterHoursActivity'],     // Common: Pressure → both degrade
    ['asyncParticipation', 'collaborationBreadth'] // Common: Isolation pattern
  ];
  
  for (const [signalA, signalB] of pairs) {
    const driftA = signals[signalA]?.deviating;
    const driftB = signals[signalB]?.deviating;
    
    if (driftA && driftB) {
      correlations.push({
        pattern: `${signalA}_${signalB}`,
        severity: 'high',
        interpretation: getCorrelationInterpretation(signalA, signalB)
      });
    }
  }
  
  return correlations;
}
```

**Implementation priority**: ⭐⭐⭐⭐⭐  
**Risk**: 🟢 LOW  
**Effort**: 1 week

---

### 1.3 Causal Attribution v0.5 (NOT Full Causal Graphs)

**Current**: `topDrivers` in BDI model = correlation ranking  
**Target**: Ranked likely drivers with temporal precedence + correlation strength

⚠️ **CRITICAL**: Do NOT implement full causal graphs yet. Start with:

**New service**: `backend/services/causalAttributionService.js`

```javascript
/**
 * Causal Attribution v0.5
 * 
 * Uses:
 * 1. Temporal precedence (what changed first?)
 * 2. Correlation strength (what moves together?)
 * 3. Known causal patterns (meeting load → after-hours is known)
 * 
 * Does NOT use:
 * - Full causal graphs (too risky without validation)
 * - Synthetic controls (need more data)
 * - Counterfactual estimation (too speculative)
 */

export async function attributeDriftCauses(teamId, driftEvent) {
  const drivers = [];
  
  // 1. Get temporal sequence of signal changes
  const timeline = await getSignalTimeline(teamId, 30); // last 30 days
  
  // 2. Find what changed FIRST (temporal precedence)
  const leadingIndicators = findLeadingIndicators(timeline, driftEvent.primarySignal);
  
  // 3. Apply known causal patterns
  const knownPatterns = [
    { cause: 'recurring_meetings', effect: 'meeting_fragmentation', strength: 0.7 },
    { cause: 'manager_response_pressure', effect: 'after_hours_creep', strength: 0.6 },
    { cause: 'project_deadline', effect: 'focus_time_drop', strength: 0.8 },
    // ... more patterns from domain expertise
  ];
  
  // 4. Combine temporal + correlation + known patterns
  for (const indicator of leadingIndicators) {
    const knownPattern = knownPatterns.find(p => p.cause === indicator.signal);
    
    drivers.push({
      factor: indicator.signal,
      estimatedContribution: calculateContribution(indicator, knownPattern),
      confidence: indicator.confidence,
      basis: 'temporal_precedence_and_correlation', // Be honest about method
      isKnownPattern: !!knownPattern
    });
  }
  
  // Sort by contribution
  drivers.sort((a, b) => b.estimatedContribution - a.estimatedContribution);
  
  return {
    driftId: driftEvent._id,
    likelyCauses: drivers.slice(0, 3), // Top 3 only
    assumptions: getAssumptions(teamId),
    disclaimer: 'These are likely drivers based on correlation and timing, not proven causes.'
  };
}
```

**Key safeguard**: Always include `disclaimer` field. Never claim causation definitively.

**Implementation priority**: ⭐⭐⭐⭐⭐  
**Risk**: 🟠 MEDIUM — Must be conservative  
**Effort**: 3 weeks

---

## PHASE 2: ADOPTION & TRUST (Weeks 7-12)

### 2.1 Upgrade Intervention Engine

**Current**: `intervention.js` model has 14-day tracking  
**Target**: Structured intervention library with matching logic

**Files to create**:
```
backend/
├── models/
│   └── interventionTemplate.js     # NEW - Library of interventions
├── services/
│   └── interventionMatcherService.js  # NEW - Match drift to interventions
└── data/
    └── interventionLibrary.json    # NEW - Curated intervention catalog
```

**Intervention Template Schema**:
```javascript
{
  interventionId: String,           // e.g., "reduce_recurring_meetings"
  
  // When to apply
  appliesWhen: [{
    driftPattern: String,           // e.g., "meeting_fragmentation_drift"
    minSeverity: String,            // 'low', 'medium', 'high'
    requiredSignals: [String]       // e.g., ["meetingLoad", "focusTime"]
  }],
  
  // Expected effect (be conservative)
  expectedEffect: {
    targetSignal: String,           // e.g., "recovery_gap"
    direction: String,              // 'increase' or 'decrease'
    magnitudeRange: { min: Number, max: Number },  // e.g., { min: 10, max: 25 }
    timeframeDays: Number,          // e.g., 14
    confidence: Number              // 0-1, based on past outcomes
  },
  
  // Manager actions (actionable, not tips)
  managerActions: [{
    action: String,                 // e.g., "Cancel or shorten weekly syncs"
    effort: String,                 // 'low', 'medium', 'high'
    reversible: Boolean             // Can this be undone easily?
  }],
  
  // Evidence from learning loop
  historicalSuccess: {
    timesApplied: Number,
    positiveOutcomes: Number,
    neutralOutcomes: Number,
    negativeOutcomes: Number,
    avgEffectSize: Number
  },
  
  // Governance
  requiresApproval: Boolean,        // Some interventions need HR sign-off
  riskLevel: String                 // 'low', 'medium', 'high'
}
```

**Implementation priority**: ⭐⭐⭐⭐  
**Risk**: 🟢 LOW  
**Effort**: 2 weeks

---

### 2.2 Build Privacy Mirror (Employee-Facing)

**Current**: Backend has consent audit, but no employee UI  
**Target**: Employees can see exactly what data is used

**Files to create**:
```
src/
├── pages/
│   └── privacy/
│       └── PrivacyMirror.js        # NEW - Employee data transparency UI
└── components/
    └── privacy/
        ├── DataUsageCard.js        # What data we collect
        ├── DataNotUsedCard.js      # What we explicitly DON'T use
        └── OutputsCard.js          # What insights are generated
```

**Key UI elements**:
```javascript
// PrivacyMirror.js - Employee view

const PrivacyMirror = () => {
  return (
    <div>
      {/* What we collect */}
      <DataUsageCard
        title="Data We Use"
        items={[
          { source: 'Calendar', data: 'Meeting times, duration, participant count', icon: '📅' },
          { source: 'Slack', data: 'Message timestamps, channel activity (NOT content)', icon: '💬' }
        ]}
      />
      
      {/* What we DON'T use - critical for trust */}
      <DataNotUsedCard
        title="Data We Never Access"
        items={[
          { data: 'Message content', reason: 'Privacy by design' },
          { data: 'Email content', reason: 'Not collected' },
          { data: 'Individual performance scores', reason: 'Team-level only' },
          { data: 'Emotion/sentiment from text', reason: 'No NLP on content' }
        ]}
      />
      
      {/* Outputs */}
      <OutputsCard
        title="What Your Manager Sees"
        items={[
          { output: 'Team Drift Index', visibility: 'Manager + HR', description: 'Aggregate team pattern changes' },
          { output: 'Intervention Recommendations', visibility: 'Manager only', description: 'Suggested actions' }
        ]}
      />
      
      {/* Opt-out */}
      <OptOutSection />
    </div>
  );
};
```

**Implementation priority**: ⭐⭐⭐⭐⭐  
**Risk**: 🟢 LOW — Critical for sales friction  
**Effort**: 1.5 weeks

---

### 2.3 LLM Narrative Layer (Template-Based Only)

**Current**: Some AI narrative exists in `aiCopilotService.js`  
**Target**: Structured, slot-fill narratives — NOT free-form LLM reasoning

**Files to create**:
```
backend/
├── services/
│   └── narrativeService.js         # NEW - Template-based explanations
└── templates/
    └── driftNarratives.js          # NEW - Curated narrative templates
```

**Template approach** (safe):
```javascript
// driftNarratives.js

export const DRIFT_NARRATIVES = {
  meeting_fragmentation: {
    template: "This team's {severity} risk increased due to a {magnitude}% rise in fragmented meetings {timeframe}. {top_driver_explanation}. {intervention_preview}.",
    
    slots: {
      severity: (drift) => drift.state.toLowerCase(),
      magnitude: (drift) => Math.round(drift.topDrivers[0]?.contribution || 0),
      timeframe: (drift) => formatTimeframe(drift.periodStart, drift.periodEnd),
      top_driver_explanation: (drift) => getDriverExplanation(drift.topDrivers[0]),
      intervention_preview: (drift) => getInterventionPreview(drift.recommendedPlaybooks[0])
    }
  },
  
  after_hours_creep: {
    template: "After-hours activity has increased by {magnitude}% over {duration} days. Primary driver: {top_driver}. {intervention_preview}.",
    // ...
  }
};

// Safe generation - no free-form LLM
export function generateNarrative(driftEvent, template) {
  let narrative = template.template;
  
  for (const [slot, fn] of Object.entries(template.slots)) {
    narrative = narrative.replace(`{${slot}}`, fn(driftEvent));
  }
  
  return narrative;
}
```

**What NOT to do**:
```javascript
// ❌ DANGEROUS - Don't do this
const narrative = await openai.chat({
  messages: [
    { role: 'system', content: 'Explain why this team is struggling...' },
    { role: 'user', content: JSON.stringify(driftEvent) }
  ]
});
```

**Implementation priority**: ⭐⭐⭐⭐  
**Risk**: 🟢 LOW if template-based  
**Effort**: 1 week

---

## PHASE 3: EVIDENCE & SCALE (Weeks 13-20)

### 3.1 Outcome Measurement (Evidence, Not Proof)

**Current**: `intervention.js` has before/after delta  
**Target**: Stronger confidence scoring, uncertainty ranges

**Changes to `intervention.js`**:
```javascript
// Enhanced outcome schema
outcomeDelta: {
  metricBefore: Number,
  metricAfter: Number,
  percentChange: Number,
  improved: Boolean,
  
  // NEW: Uncertainty quantification
  confidence: {
    level: { type: String, enum: ['low', 'medium', 'high'] },
    reason: String,  // e.g., "Short observation window", "Confounding holiday period"
  },
  
  // NEW: Confidence interval
  effectSizeRange: {
    lower: Number,  // 95% CI lower bound
    upper: Number   // 95% CI upper bound
  },
  
  // NEW: Confounders detected
  confounders: [{
    type: String,   // 'holiday', 'reorg', 'incident', 'onboarding'
    impact: String  // 'may inflate effect', 'may mask effect'
  }]
}
```

**Key messaging change**:
- ❌ OLD: "This intervention improved recovery by 38%"
- ✅ NEW: "Evidence suggests improvement of 25-45% (medium confidence). Observed during normal period, no major confounders detected."

**Implementation priority**: ⭐⭐⭐⭐  
**Risk**: 🟢 LOW  
**Effort**: 2 weeks

---

### 3.2 Work Graph v0 (Simplified)

⚠️ **DEFER FULL IMPLEMENTATION** — Build only the minimum viable graph

**What to build now**:
```javascript
// backend/models/workGraph.js - SIMPLIFIED

const workGraphNodeSchema = new mongoose.Schema({
  // Only these node types for v0:
  nodeType: { type: String, enum: ['person', 'team', 'meeting'] },
  nodeId: ObjectId,
  
  // Simple edges only:
  edges: [{
    targetType: String,
    targetId: ObjectId,
    relationship: { 
      type: String, 
      enum: ['member_of', 'attends', 'organizes', 'reports_to'] 
      // NO complex edges like 'interrupts', 'blocks_recovery' yet
    },
    weight: Number  // Frequency or strength
  }]
});
```

**What to DEFER**:
- "Interrupts" edges (requires semantic analysis)
- "Blocks recovery" edges (requires inference)
- "Urgency hubs" (requires message content or proxy)
- "Coordination tax" calculations (requires more graph ops)

**Implementation priority**: ⭐⭐  
**Risk**: 🟠 MEDIUM if scoped; 🔴 HIGH if full spec  
**Effort**: 3 weeks (v0 only)

---

## WHAT NOT TO BUILD (DEFER TO PHASE 4+)

| Component | Spec Section | Why Defer |
|-----------|--------------|-----------|
| Full Causal Graphs | Section 4 | Need 10x more data and validation |
| Synthetic Controls | Section 4 | Requires similar "untreated" groups |
| Counterfactual Estimation | Section 4 | Too speculative, liability risk |
| Federated Learning | Section 8 | Infra complexity, low ROI now |
| Complex Work Graph Edges | Section 5 | Requires semantic analysis |
| Control Group Outcomes | Section 7 | Rarely possible in real orgs |
| Benchmark Intelligence | Section 12 | Need 50+ customers first |

---

## RISK MITIGATION CHECKLIST

### Before Pushing Phase 1:

- [ ] **Add disclaimers** to all causal attribution outputs
- [ ] **Add confidence intervals** to all effect size claims
- [ ] **Add "not used" section** to privacy documentation
- [ ] **Test with sparse data** — what happens at 50% calendar coverage?
- [ ] **Test with confounders** — holiday period, reorg, incident

### Before Pushing Phase 2:

- [ ] **User test privacy mirror** with 5 employees — do they trust it?
- [ ] **Review LLM templates** for hallucination risk
- [ ] **Add "dismiss with reason"** to intervention recommendations
- [ ] **Legal review** of employee data visibility claims

### Before Pushing Phase 3:

- [ ] **Validate outcome measurement** with 10 real interventions
- [ ] **A/B test narrative formats** — which do managers act on?
- [ ] **Document data requirements** — minimum viable data for each feature

---

## SUCCESS METRICS BY PHASE

| Phase | Metric | Target |
|-------|--------|--------|
| **Phase 1** | Drift detection accuracy (vs manual HR flags) | >70% correlation |
| **Phase 1** | False positive rate | <20% |
| **Phase 2** | Manager intervention adoption rate | >40% take action |
| **Phase 2** | Employee privacy trust score (survey) | >7/10 |
| **Phase 3** | Intervention outcome confidence | >60% medium+ confidence |
| **Phase 3** | Renewal justification score | >80% cite outcome data |

---

## FINAL DECISION MATRIX

| Component | Push Now | Push with Caution | Defer |
|-----------|----------|-------------------|-------|
| Adaptive Baselines | ✅ | | |
| Multi-Signal Drift | ✅ | | |
| Causal Attribution v0.5 | | ✅ | |
| Intervention Templates | ✅ | | |
| Privacy Mirror | ✅ | | |
| Template Narratives | ✅ | | |
| Outcome Measurement | | ✅ | |
| Work Graph v0 | | ✅ | |
| Full Causal Graphs | | | ❌ |
| Counterfactuals | | | ❌ |
| Synthetic Controls | | | ❌ |
| Federated Learning | | | ❌ |

---

## NEXT STEPS

1. **Approve Phase 1 scope** — Reply with any modifications
2. **I'll generate the actual code** for each component in order
3. **We'll test with your existing data** before moving to Phase 2

**Estimated total effort**: 16-20 weeks for Phases 1-3  
**Recommended team**: 2 backend engineers + 1 frontend + 0.5 PM

---

*This plan prioritizes building a defensible moat (Drift → Explain → Act → Measure) while avoiding the high-risk speculative features that could backfire.*
