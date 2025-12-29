# SignalTrue — EXECUTION PLAN
**Transformation: Passive Analytics → Early-Warning Intervention System**

## Architecture Overview

### Current State
- **Onboarding**: Direct to `/dashboard` after login/register
- **Landing**: Dashboard shows integrations + drift alerts + playbook recommendations
- **Metrics**: Backend uses old naming (Meeting Load, After-Hours, Response Latency, etc.)
- **No intervention tracking**: Actions suggested but not persisted or followed up
- **Privacy**: Generic footer link, no product-level transparency

### Target State
- **Onboarding**: Mandatory "First Signal" screen (cannot skip)
- **Landing**: Risk Feed ordered by severity (max 5 signals visible)
- **Metrics**: Renamed to risk signals (Coordination Risk, Boundary Erosion, etc.)
- **Intervention Layer**: Action tracking with 14-day follow-ups
- **Privacy**: Dedicated in-app section with transparency log

---

## Implementation Plan (13 Phases)

### PHASE 1: First Signal Backend Logic
**File**: `backend/services/firstSignalService.js` (NEW)
- Compute ONE signal immediately after Slack/Calendar connect
- Priority: Meeting Load deviation → After-hours trend → Response latency
- Must execute <5 seconds
- Store in User model: `firstSignalShown: Boolean, firstSignalData: Object`

**File**: `backend/routes/firstSignal.js` (NEW)
- `GET /api/first-signal` — Fetch first signal for user
- `POST /api/first-signal/acknowledge` — Mark as shown

### PHASE 2: First Signal UI Component
**File**: `src/components/FirstSignal.js` (NEW)
- Structure: "Something is drifting." + main statement + context + 2 CTAs
- Primary: "See why this matters" → navigate to Risk Feed
- Secondary (muted): "Continue to dashboard"
- Cannot be dismissed without action

**Integration**: Update `App.js` routing
- After successful login, check `user.firstSignalShown`
- If false AND integrations connected → redirect to `/first-signal`
- After acknowledgment → set flag and continue to `/app/signals`

### PHASE 3: Metric Renaming (Backend)
**Files to update**:
- `backend/models/signalV2.js` — Update enum values
- `backend/services/signalTemplates.js` — Replace all keys
- `backend/services/baselineService.js` — Update comments and logic
- `backend/config/metricLabels.js` — Rename all labels

**Mapping**:
```
meeting-load-spike → coordination-risk
after-hours-creep → boundary-erosion
focus-erosion → (keep as focus-fragmentation in V2, or rename to execution-drag?)
response-latency-rise → execution-drag
sentiment-shift → morale-volatility
collaboration-breadth → dependency-spread
```

### PHASE 4: Metric Renaming (Frontend)
**Files to update**:
- `src/components/DriftAlerts.js` — Update signal display names
- `src/pages/app/Signals.js` — Update all references
- Any charts/visualizations referencing old names

### PHASE 5: Signal Interpretation Framework
**Backend**: Update `signalTemplates.js`
- Every signal must export:
  - `whatIsChanging` (data-driven statement)
  - `whyItMatters` (consequence)
  - `whatBreaksIfIgnored` (inaction cost)
  - `recommendedAction` (top action from actions array)

**Frontend**: Update signal card components
- Display all 4 fields on every signal
- No charts without text interpretation

### PHASE 6: Intervention Model
**File**: `backend/models/intervention.js` (NEW)
```javascript
{
  signalId: ObjectId,
  teamId: ObjectId,
  orgId: ObjectId,
  actionTaken: String,
  actionType: String, // from signalTemplates
  startDate: Date,
  recheckDate: Date (startDate + 14 days),
  status: 'active' | 'completed' | 'ignored',
  outcomeDelta: {
    metricBefore: Number,
    metricAfter: Number,
    percentChange: Number
  },
  acknowledgedBy: ObjectId (userId)
}
```

**File**: `backend/routes/interventions.js` (NEW)
- `POST /api/interventions` — Log action taken
- `GET /api/interventions/pending` — Get interventions needing recheck
- `PUT /api/interventions/:id/outcome` — Update with results

### PHASE 7: Intervention UI Components
**File**: `src/components/RecommendedAction.js` (NEW)
- Display: concrete action, expected impact, check-back window
- One-click "Take This Action" button
- Tracks state in Intervention model

**Integration**: Add to every signal card
- Show recommended action block
- If action taken, show "Recheck in X days"
- After 14 days, show comparison (before/after metric)

### PHASE 8: Privacy & Data Use Section
**File**: `src/pages/app/Privacy.js` (NEW)
- What we track (aggregated patterns, metadata only)
- What we NEVER track (message content, individual performance, surveillance)
- Transparency Log (admin-only): timestamped data pulls

**File**: `backend/routes/privacy.js` (NEW)
- `GET /api/privacy/log` — Return transparency log for org
- `GET /api/privacy/explainer/:orgSlug` — Public employee-facing explainer

**Frontend**: Add menu item to app navigation
- "Privacy & Data Use" (not in footer)

### PHASE 9: Risk Feed (Replace Dashboard)
**File**: `src/pages/app/RiskFeed.js` (NEW)
- Default landing after login
- Show "Current Signals" ordered by:
  1. Severity (CRITICAL → RISK → INFO)
  2. Trend velocity
  3. Time unresolved
- Max 5 signals visible
- Each card shows: name, drift indicator (↑↓→), time detected, action status

**Update**: App.js routing
- `/dashboard` → redirect to `/app/signals` (Risk Feed)
- `/app/signals` becomes primary landing

### PHASE 10: Pricing Gates (Feature-Level)
**Backend**: Update existing routes to check subscription tier
- Free: Signals visible, NO alerts, NO interventions, NO history
- €99 (Detection): Alerts enabled, intervention tracking, 30-day history
- €199 (Impact Proof): Executive summary, comparisons, export, internal benchmarks

**Implementation**:
- Middleware: `backend/middleware/checkTier.js`
- Usage: Wrap sensitive routes (alerts, interventions, comparisons)

**Frontend**: Show feature gates
- If free tier: display upgrade CTA instead of locked features
- Never hide data, only hide capabilities

### PHASE 11: Positioning Copy Updates
**Files**:
- `src/pages/Home.js`
- `src/pages/ProductOverview.js`
- `src/pages/About.js`
- `src/pages/Pricing.js`

**Changes**:
- Replace headline: "Detect organizational drift before it becomes damage."
- Use canonical explainer everywhere: "SignalTrue detects early behavioral signals that predict burnout, overload, and execution breakdown before leaders feel the impact."
- Remove: "Measure engagement", "Understand team health"

### PHASE 12: Internal Benchmarks
**Backend**: `backend/services/comparisonService.js` (NEW)
- Compute: Team vs org average, This month vs last month, Before vs after intervention
- Label all comparisons: "Internal comparison. Not industry benchmark."
- NO external benchmarks yet

**Frontend**: Display in Risk Feed and signal detail views
- Show comparison bars/charts
- Clear labeling

### PHASE 13: Final Integration & Gate Enforcement
**Checklist**:
- [ ] First Signal screen cannot be skipped
- [ ] All signal names updated (backend + frontend)
- [ ] Intervention objects persisted on action
- [ ] Privacy page visible in app navigation
- [ ] Risk Feed replaces dashboard as default landing
- [ ] Pricing gates enforced at feature level
- [ ] Text explanation on every signal
- [ ] One-click recommended action on every signal
- [ ] Follow-up recheck logic implemented
- [ ] All positioning copy updated

---

## Critical Dependencies

### User Model Updates
Add to `backend/models/user.js`:
```javascript
firstSignalShown: { type: Boolean, default: false },
firstSignalData: {
  signalType: String,
  value: Number,
  detectedAt: Date
},
subscriptionTier: { 
  type: String, 
  enum: ['free', 'detection', 'impact_proof'], 
  default: 'free' 
}
```

### Organization Model Updates
Add to `backend/models/organizationModel.js`:
```javascript
subscription: {
  plan: { 
    type: String, 
    enum: ['free', 'detection', 'impact_proof'], 
    default: 'free' 
  },
  status: { type: String, default: 'active' },
  pricingTier: {
    alerts: { type: Boolean, default: false },
    interventions: { type: Boolean, default: false },
    history: { type: Boolean, default: false },
    comparisons: { type: Boolean, default: false },
    export: { type: Boolean, default: false }
  }
}
```

---

## Rollout Strategy

### Phase Order (Recommended)
1. **Backend first**: Intervention model + First Signal service
2. **Metric renaming**: Backend → Frontend (coordinated deploy)
3. **UI components**: First Signal → Risk Feed → Intervention blocks
4. **Privacy section**: Backend + Frontend
5. **Pricing gates**: Last (after all features functional)
6. **Copy updates**: Can happen in parallel

### Testing Milestones
1. After Phase 1-2: Test First Signal flow (new user → connect → see signal)
2. After Phase 6-7: Test intervention tracking (take action → recheck in 14 days)
3. After Phase 9: Test Risk Feed as landing page
4. After Phase 10: Test pricing gates (free user cannot access alerts)
5. Final: Full E2E test (register → connect → first signal → take action → recheck)

---

## Open Questions for Confirmation

1. **First Signal Priority**: Confirm priority order (Meeting Load → After-Hours → Response Latency) or adjust?
2. **Metric Naming**: Should `focus-erosion` map to `focus-fragmentation` or `execution-drag`? (Spec says Response Latency → Execution Drag)
3. **Risk Feed Location**: Should `/app/signals` replace `/dashboard` or coexist?
4. **Pricing Tiers**: Confirm €99 = "detection" and €199 = "impact_proof" in code (spec uses "Detection Pack" and "Impact Proof")
5. **Intervention Follow-Up**: Should recheck be automatic (cron job) or manual (user clicks "Check Progress")?

---

## Success Criteria (from Spec)

### Must Ship With:
✅ First Signal screen cannot be skipped
✅ Signal names updated everywhere
✅ Intervention objects persisted
✅ Privacy page visible in app
✅ Risk Feed replaces dashboards
✅ Pricing gates enforced at feature level

### Must NOT Ship Without:
✅ Text explanation on every signal
✅ One-click recommended action
✅ Follow-up recheck logic

---

**Next Step**: Confirm approach, then begin execution starting with Phase 1.
