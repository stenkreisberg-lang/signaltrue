# SignalTrue Repositioning Implementation Guide

## Overview
This document tracks the repositioning of SignalTrue from "analytics dashboard" to "leadership operating system" with comprehensive product, UX, and technical changes.

---

## ✅ COMPLETED: Backend Infrastructure

### 1. New Data Models Created
- **`backend/models/baseline.js`** - Stores calibration period data, baseline metrics, confidence scores, seasonality patterns
- **`backend/models/signal.js`** - Risk-based signals with severity, confidence, drivers, consequences, recommended actions
- **`backend/models/benchmarkSet.js`** - Three-layer benchmarking (internal, role-based, external anonymized)
- **`backend/models/action.js`** - Action tracking with ownership, outcomes, post-action learning loop

### 2. Updated Existing Models
- **`backend/models/organizationModel.js`** - Added `calibration` object with state tracking
- **`backend/models/team.js`** - Added `metadata` object for role-based benchmarking (function, sizeBand)

### 3. New Backend Routes Created
- **`backend/routes/calibration.js`** - Calibration management (start, progress, complete, data source tracking)
- **`backend/routes/signals.js`** - Signal CRUD, filtering, ignored signals list, weekly summary
- **`backend/routes/actions.js`** - Action management, outcome recording, metric tracking

### 4. Server Integration
- **`backend/server.js`** - Mounted new routes: `/api/calibration`, `/api/signals`, `/api/actions`

### 5. Frontend Components Created
- **`src/components/UIComponents.js`** - Shared component library (Button, Card, Badge, ProgressBar, Modal, EmptyState, Spinner)
- **`src/components/CalibrationProgress.js`** - Calibration status dashboard with progress tracking
- **`src/components/SignalCard.js`** - Primary signal display component with severity, confidence, deviation data

---

## 🚧 IN PROGRESS: Frontend Application

### 6. Product Page Redesign (NEXT STEP)
**File**: `src/pages/ProductOverview.js`

**Required Changes**:
- [ ] Replace hero title with: "A Leadership Operating System for Team Health"
- [ ] Update subtitle to emphasize decision guidance over analytics
- [ ] Add 5-step "How It Works" section:
  1. Connect data sources (Slack, Google Calendar)
  2. 30-day baseline calibration (free)
  3. Detect deviations and risk signals
  4. Prescribe trade-off decisions
  5. Track outcomes over time
- [ ] Replace "AI suggestions" language with "deviation intelligence", "risk signals", "decision guidance"
- [ ] Add trust logos (Sharewell, Cleveron, Toggl) - monochrome SVGs
- [ ] Add "Privacy by design" statement
- [ ] Add mini case examples (even if hypothetical, mark as examples)
- [ ] Change primary CTA to "Start Baseline Calibration"
- [ ] Add secondary CTA "See Sample Signals"
- [ ] Add 3 explanatory visuals:
  - Baseline calibration timeline
  - Signal card anatomy (severity → drivers → consequence → action)
  - Before/after benchmark view

### 7. Pricing Page Updates
**File**: `src/pages/Pricing.js`

**Required Changes**:
- [ ] Add explicit statement: "Month 1 = Baseline Calibration Period (free)"
- [ ] Add value statement: "You don't pay for data. You pay for avoiding slow organizational decay."
- [ ] Add privacy reassurance: "No message content. Only metadata. Aggregated at team level."
- [ ] Ensure trust logos appear (Sharewell, Cleveron, Toggl)

### 8. New Application Routes Needed
**File**: `src/App.js`

**New Routes to Add**:
- [ ] `/app/overview` - Main dashboard (replaces current dashboard)
- [ ] `/app/signals` - Signal list and management
- [ ] `/app/benchmarks` - Three-layer benchmarking view
- [ ] `/app/actions` - Action tracking and outcomes
- [ ] `/app/settings` - Org settings, privacy controls

### 9. Core Application Pages to Build

#### A. Overview Page (`src/pages/app/Overview.js`)
- [ ] Calibration progress component (if in calibration)
- [ ] Top 3 critical signals (if calibration complete)
- [ ] Quick stats: new signals this week, ignored signals count
- [ ] Weekly leader summary section
- [ ] CTA to view all signals

#### B. Signals Page (`src/pages/app/Signals.js`)
- [ ] Signal list with filtering (severity, status, team)
- [ ] Calibration gate: show "Signals available after calibration" if in calibration
- [ ] Signal cards grid
- [ ] "Ignored Signals" tab/section (make it visible)
- [ ] Signal detail modal/drawer with:
  - Chart showing baseline vs current value
  - Drivers breakdown
  - Consequence statement
  - Recommended trade-off actions
  - Owner assignment
  - Status tracking
  - Action history

#### C. Benchmarks Page (`src/pages/app/Benchmarks.js`)
- [ ] Default to internal baseline view
- [ ] Toggle "Show external context" (off by default)
- [ ] Three-layer benchmark display:
  1. Internal baseline (always visible)
  2. Role-based (if team metadata exists)
  3. External anonymized (only if toggle is on)
- [ ] Chart showing current vs baseline band
- [ ] Deviation start marker

#### D. Actions Page (`src/pages/app/Actions.js`)
- [ ] Action list with filtering (owner, status, due date)
- [ ] Action cards showing:
  - Signal title
  - Action description
  - Owner
  - Status
  - Due date
  - Expected effect
- [ ] Outcome recording modal
- [ ] Post-action metrics chart
- [ ] Learning loop feedback form

---

## 📋 PENDING: Signal Generation Logic

### 10. Signal Detection Service
**File to Create**: `backend/services/signalDetection.js`

**Requirements**:
- [ ] Trigger when deviation exceeds threshold for sustained period (not one-off spikes)
- [ ] Calculate deviation vs baseline using Baseline model
- [ ] Determine severity based on deviation magnitude
- [ ] Calculate confidence based on baseline quality
- [ ] Estimate time-to-impact
- [ ] Identify top 2-3 drivers
- [ ] Generate consequence statement based on signal type
- [ ] Populate recommended actions with trade-offs

### 11. Signal Type Templates
**File to Create**: `backend/services/signalTemplates.js`

**Define templates for each signal type**:
- `meeting-load-spike`: Consequence + 3 actions (remove meetings, convert to async, add focus blocks)
- `after-hours-creep`: Consequence + 3 actions (set quiet hours, fix escalation rules, rotate on-call)
- `focus-erosion`: Consequence + actions
- `response-delay-increase`: Consequence + actions
- `message-volume-drop`: Consequence + actions
- `recovery-deficit`: Consequence + actions
- `sentiment-decline`: Consequence + actions

### 12. Baseline Computation Service
**File to Create**: `backend/services/baselineComputation.js`

**Requirements**:
- [ ] Calculate mean, variance, percentiles (p25, p75) for each metric
- [ ] Detect seasonality (weekday patterns, monthly patterns)
- [ ] Calculate confidence score based on sample size and variance
- [ ] Store baseline data to Baseline model
- [ ] Schedule rolling window recalculation post-calibration (90-day window)

---

## 🎨 PENDING: UX & Visual Improvements

### 13. Visual Consistency
- [ ] Standardize header across all pages (same logo, padding, nav items)
- [ ] Create typography scale (H1, H2, body) - use Tailwind classes consistently
- [ ] Implement 8px grid spacing system
- [ ] Standardize button styles (already in UIComponents.js, ensure usage)
- [ ] Standardize card components (already in UIComponents.js, ensure usage)

### 14. Chart Components
**File to Create**: `src/components/SignalChart.js`

**Requirements**:
- [ ] Show baseline as shaded band (p25-p75 range)
- [ ] Show current value as line
- [ ] Highlight "Deviation start" marker
- [ ] Add "Explain this chart" tooltip for non-analytical users

### 15. Visual Language for Severity/Confidence
- [ ] Severity badges with icons (already in UIComponents.js and SignalCard.js)
- [ ] Confidence badges with icons (already implemented)
- [ ] Consistent color coding:
  - Critical: red (#dc2626)
  - Risk: orange (#ea580c)
  - Informational: blue (#3b82f6)
  - High confidence: emerald (#059669)
  - Medium confidence: yellow (#eab308)
  - Low confidence: gray (#64748b)

---

## 📝 PENDING: Copy & Messaging Updates

### 16. Global Copy Changes
**Files to Update**: All marketing pages, all app pages

**Replace**:
- "AI suggestions" → "decision guidance", "recommended trade-offs"
- "dashboard insights" → "deviation intelligence"
- "analytics" → "risk signals", "signal intelligence"
- "free trial" → "Baseline Calibration Period"
- "benchmarking" → "internal baseline comparison"

### 17. Consequence Statements
**File to Create**: `backend/data/consequenceStatements.js`

**Define one-liner consequences per signal type**:
```javascript
{
  'meeting-load-spike': 'This pattern tends to precede focus erosion and decision delays.',
  'after-hours-creep': 'This pattern tends to precede burnout risk and disengagement.',
  'focus-erosion': 'This pattern tends to precede delivery delays and quality issues.',
  // ... etc for all signal types
}
```

---

## 🔒 PENDING: Privacy & Compliance

### 18. Privacy Controls
**File to Create**: `src/pages/app/PrivacySettings.js`

**Requirements**:
- [ ] Admin can set aggregation level
- [ ] Admin can set minimum group size for metrics visibility
- [ ] Toggle for external benchmark participation (opt-in)
- [ ] Display "no message content stored" policy
- [ ] Audit log viewer for data access

### 19. Privacy Enforcement
**File to Create**: `backend/middleware/privacyEnforcement.js`

**Requirements**:
- [ ] Enforce "no message content stored" at ingestion level
- [ ] Check minimum group size before returning metrics
- [ ] Log all data access events for audit

---

## 🧪 PENDING: Quality Assurance

### 20. Consistency Checks
- [ ] Same header, logo, typography across all pages
- [ ] Tailwind styles applied consistently in production and local
- [ ] No duplicate nav items or concepts

### 21. Functional Checks
- [ ] Calibration gating works (no recommendations during calibration)
- [ ] Signal cards load fast and are readable
- [ ] Benchmarks default to internal baseline
- [ ] External benchmark toggle is off by default
- [ ] Actions can be assigned, tracked, closed with outcomes
- [ ] Outcome recording updates signal status
- [ ] Time-to-normalization is calculated correctly

### 22. UX Acceptance Criteria
- [ ] User can understand product in 30 seconds on `/product`
- [ ] New user can connect and start calibration without confusion
- [ ] Manager can see top 3 risks and what to do in under 2 minutes
- [ ] Ignored signals are visible (not hidden)
- [ ] Inaction cost is visible as an option

---

## 🚀 Deployment Checklist

### 23. Before Production Deploy
- [ ] All models have proper indexes
- [ ] All routes have authentication middleware
- [ ] Environment variables documented
- [ ] Calibration period defaults to 30 days
- [ ] Baseline confidence thresholds configured
- [ ] Signal detection thresholds configured
- [ ] Cron job for baseline recalculation (post-calibration)
- [ ] Cron job for signal detection runs daily
- [ ] Test calibration flow end-to-end
- [ ] Test signal creation and action workflow
- [ ] Test benchmark calculation

### 24. Data Migration (if needed)
- [ ] Migrate existing orgs to calibration state
- [ ] Create baseline records for existing teams
- [ ] Generate initial signals for teams with data
- [ ] Backfill action records from existing data (if applicable)

---

## 📊 Implementation Priority

### Phase 1: Core Calibration Flow (Week 1)
1. Complete Product page redesign
2. Create Overview page with CalibrationProgress component
3. Test calibration start/progress/complete flow
4. Deploy calibration UI

### Phase 2: Signal Intelligence (Week 2)
1. Build signal detection service
2. Create signal templates with consequences
3. Build Signals page with filtering
4. Build SignalDetail modal/drawer
5. Test signal creation and display

### Phase 3: Actions & Outcomes (Week 3)
1. Build Actions page
2. Implement action assignment workflow
3. Build outcome recording UI
4. Implement learning loop telemetry
5. Test action lifecycle

### Phase 4: Benchmarking (Week 4)
1. Build baseline computation service
2. Create Benchmarks page
3. Implement three-layer benchmark calculation
4. Add external benchmark toggle
5. Test benchmark display and updates

### Phase 5: Polish & Deploy (Week 5)
1. Update all copy across marketing pages
2. Add trust logos and privacy statements
3. Visual consistency pass
4. Create consequence statements for all signal types
5. Privacy controls and audit logging
6. Quality assurance testing
7. Production deployment

---

## 📁 File Structure (New/Modified)

### Backend
```
backend/
├── models/
│   ├── baseline.js ✅ NEW
│   ├── signal.js ✅ NEW
│   ├── benchmarkSet.js ✅ NEW
│   ├── action.js ✅ NEW
│   ├── organizationModel.js ✅ UPDATED
│   └── team.js ✅ UPDATED
├── routes/
│   ├── calibration.js ✅ NEW
│   ├── signals.js ✅ NEW
│   └── actions.js ✅ NEW
├── services/
│   ├── signalDetection.js ⏳ TODO
│   ├── signalTemplates.js ⏳ TODO
│   └── baselineComputation.js ⏳ TODO
├── middleware/
│   └── privacyEnforcement.js ⏳ TODO
└── data/
    └── consequenceStatements.js ⏳ TODO
```

### Frontend
```
src/
├── components/
│   ├── UIComponents.js ✅ NEW
│   ├── CalibrationProgress.js ✅ NEW
│   ├── SignalCard.js ✅ NEW
│   ├── SignalDetail.js ⏳ TODO
│   └── SignalChart.js ⏳ TODO
├── pages/
│   ├── ProductOverview.js ⏳ UPDATE
│   ├── Pricing.js ⏳ UPDATE
│   └── app/
│       ├── Overview.js ⏳ NEW
│       ├── Signals.js ⏳ NEW
│       ├── Benchmarks.js ⏳ NEW
│       ├── Actions.js ⏳ NEW
│       └── PrivacySettings.js ⏳ NEW
└── App.js ⏳ UPDATE (add new routes)
```

---

## 🎯 Success Metrics

### Product Positioning
- [ ] Zero mentions of "AI suggestions" or "analytics dashboard"
- [ ] All pages use "leadership operating system" language
- [ ] Calibration period is clear and unavoidable

### UX
- [ ] Time to understand product < 30 seconds
- [ ] Time to start calibration < 2 minutes
- [ ] Time to see top risks (post-calibration) < 2 minutes
- [ ] Ignored signals have dedicated visibility

### Technical
- [ ] Calibration gating prevents premature signal display
- [ ] Benchmarks default to internal baseline
- [ ] Signal detection runs without false positives
- [ ] Action outcomes improve recommendation quality over time

---

## Next Steps

1. **Immediate**: Update Product page with new narrative and CTAs
2. **Then**: Build Overview page with calibration gating
3. **Then**: Implement signal detection service with templates
4. **Then**: Build Signals page with detail modal
5. **Then**: Continue through phases outlined above

---

**Questions or blockers?** Reference this document and update completion status as you go.
