# SignalTrue - Behavioral Drift Detection System

## Product Overview

**SignalTrue is an early-warning system that detects behavioral drift in teams, explains why it matters, and recommends safe, reversible actions before capacity, delivery, or retention are impacted.**

---

## Core Framework

### 1. Behavioral Drift Index (BDI)
**The Primary Metric**

Single, named, defensible index that exposes drift instead of scattered signals.

**Inputs (6 signals)**:
1. Meeting Load
2. After-Hours Activity
3. Response Time
4. Async Participation
5. Focus Time
6. Collaboration Breadth

**Output States**:
- **Stable**: No significant drift detected
- **Early Drift**: 2-3 signals deviating, early warning
- **Developing Drift**: 3-4 signals deviating, sustained pattern
- **Critical Drift**: 4+ signals deviating, urgent intervention needed

**How It Works**:
- Compares current 14-30 day window to learned baseline (first 30 days)
- Drift triggers when 3 or more signals deviate in the same negative direction
- Provides confidence score, top drivers, and recommended playbooks

---

### 2. Coordination Load Index (CLI)
**Reframes meetings as system coordination cost**

**Calculation**: `(Meeting Time + Back-to-Back Meetings + Cross-Team Sync) / Available Focus Time`

**States**:
- **Execution-dominant**: Low coordination, high execution (healthy for delivery)
- **Balanced**: Moderate coordination, adequate focus time
- **Coordination-heavy**: High coordination, reduced execution time
- **Coordination overload**: Unsustainable coordination, minimal execution capacity

**Why It Matters**: High coordination load often indicates unclear ownership or decision structure, not productivity failure.

---

### 3. Bandwidth Tax Indicator (BTI)
**Detects cognitive overload masked by responsiveness**

**Triggers**:
- Faster response times + rising after-hours activity (paradox)
- Shrinking uninterrupted focus blocks
- High interruption frequency

**States**:
- **Low tax**: Sustainable cognitive load
- **Moderate tax**: Increasing interruptions, capacity strain
- **Severe tax**: Cognitive overload, decision quality at risk

**Why It Matters**: High bandwidth tax reduces decision quality even when output appears stable.

---

### 4. Silence Risk Indicator (SRI)
**Detects reduced voice without claiming psychological safety**

**Proxies**:
- Declining async contributions (messages, threads, reactions)
- Narrowing collaboration network (fewer unique interactions)
- Slower upward responses (responses to leadership)
- Flattening sentiment variance (less emotional range)

**States**:
- **Low Silence Risk**: Healthy communication patterns
- **Rising Silence Risk**: Early signs of withdrawal
- **High Silence Risk**: Significant reduction in voice

**Why It Matters**: Silence Risk highlights patterns where people contribute less, often before issues surface openly.

---

### 5. Capacity Status (Enhanced)
**Makes Green / Yellow / Red actionable and defensible**

**Always shows**:
- Top 3 drivers affecting capacity
- One-sentence explanation
- Baseline deviation

**Example**:
- **Yellow** - driven by Meeting Load ↑ (22.5 hrs/week) and Focus Time ↓ (8 hrs/week)
- Explanation: "Capacity under moderate strain, driven by Meeting Load (22.5 hrs/week)."

**Why It Matters**: Capacity reflects the team's ability to sustain current workload without long-term strain. Changes are driven by observable working patterns, not self-reported sentiment.

---

## Drift Response Playbooks

**Standard, safe, reversible actions tied to specific drift patterns**

Each playbook includes:
- **Why** this action is recommended
- **Expected short-term effect** (with metrics)
- **Reversibility note** (can it be undone?)
- **Time-bound scope** (1-2 weeks)

### Default Playbooks

1. **Pause Recurring Meetings** (Meeting Reduction)
   - Timebound: 2 weeks
   - Expected: ↓ 30-40% meeting load, ↑ 20-30% focus time
   - Reversibility: Fully reversible

2. **Implement No-Meeting Blocks** (Focus Protection)
   - Timebound: 2 weeks minimum
   - Expected: ↑ 15-25% focus time, ↓ 10-20% bandwidth tax
   - Reversibility: Fully reversible

3. **Clarify Decision Ownership** (Decision Clarity)
   - Timebound: 1 week setup
   - Expected: ↓ 20-30% coordination load, ↑ 20-40% decision closure
   - Reversibility: Fully reversible

4. **Implement Async-First Communication** (Communication Norms)
   - Timebound: 2 weeks adoption
   - Expected: ↓ 20-35% bandwidth tax, ↓ 30-50% interruptions
   - Reversibility: Fully reversible

5. **Reduce Team Size or Scope** (Capacity Adjustment)
   - Timebound: 1 sprint
   - Expected: ↓ 35-50% coordination load, Yellow → Green capacity
   - Reversibility: Scope reversible, team splits harder

---

## Drift Timeline

**Helps HR justify early intervention**

Timeline shows:
1. **Baseline** - When team baseline was established
2. **First Signal** - When drift was first detected
3. **Escalation** - How drift worsened over time
4. **Action Taken** - What playbook was applied
5. **Post-Action** - Impact of the intervention
6. **Resolution** - Return to stable state (or ongoing monitoring)

---

## Signal Confidence Score

**Anti-noise guardrail**

Every alert shows:
- **Number of confirming signals** (1-5)
- **Duration of change** (days)
- **Confounders detected** (holidays, onboarding spikes, incidents)

**Confidence Levels**:
- **Low**: 1 signal, short duration
- **Medium**: 2 signals, sustained
- **High**: 3+ signals, sustained

**Why It Matters**: Prevents HR from acting on noise or one-off spikes.

---

## Anti-Weaponization Guardrails

**Mandatory Safeguards**:
- ✅ No individual-level metrics
- ✅ No team rankings or leaderboards
- ✅ No performance evaluation language
- ✅ Aggregation minimum of 5 people enforced everywhere
- ✅ Team-level signals only

**Persistent UI Notice**:
> "SignalTrue insights are designed for early detection and system improvement. They should not be used for individual performance evaluation."

---

## What SignalTrue Does NOT Do

**Explicitly excluded**:
- ❌ Individual performance scores
- ❌ Emotion or sentiment tracking
- ❌ Personality profiling
- ❌ Predictive attrition claims
- ❌ Surveillance-style views
- ❌ Task tracking or ticketing integration (no Jira, no Linear)

**Product Scope**: Behavioral signals from communication + calendar systems only.

---

## API Documentation

### Primary Endpoints

```bash
# Get all dashboard data (single call)
GET /api/dashboard/:teamId
Returns: { bdi, capacity, cli, bti, sri, timeline, interpretation }

# Behavioral Drift Index
GET /api/bdi/team/:teamId/latest
GET /api/bdi/team/:teamId/history?limit=30
GET /api/bdi/org/:orgId/summary

# All Indices (CLI, BTI, SRI)
GET /api/indices/team/:teamId/all

# Capacity Status
GET /api/capacity/team/:teamId/latest

# Drift Timeline
GET /api/timeline/team/:teamId
GET /api/timeline/:timelineId

# Playbooks
GET /api/playbooks?driftState=Early%20Drift&category=Meeting%20Reduction
GET /api/playbooks/:playbookId
```

---

## Installation & Setup

### Backend Setup

1. **Install dependencies**:
```bash
cd backend
npm install
```

2. **Seed default playbooks**:
```bash
node backend/scripts/seedPlaybooks.js
```

3. **Start backend**:
```bash
cd backend
node server.js
```

4. **Verify installation**:
```bash
./verify-backend.sh
```

### Frontend Setup (Pending)

See `FRONTEND_DEVELOPER_GUIDE.md` for component templates and implementation guide.

---

## Data Collection

### What We Collect (Metadata Only)

**Slack**:
- Message timestamps (not content)
- Thread depth
- Channel activity
- Response latency
- @mentions count
- Emoji reactions count

**Google Calendar**:
- Meeting duration
- Meeting frequency
- Attendee count
- Time blocks
- After-hours events

**Microsoft Teams** (optional):
- Message timestamps (not content)
- Thread depth
- Channel activity
- Response latency
- Meeting metadata

**We NEVER collect**:
- Message content
- Screen activity
- Keystrokes
- Individual surveillance data
- Task tracking data

---

## Dashboard Hierarchy (CRITICAL)

**Must display in this order**:
1. **Behavioral Drift Index** ← PRIMARY METRIC
2. **Capacity Status** + Drivers ← WITH EXPLANATION
3. **Coordination Load Index**
4. **Bandwidth Tax Indicator**
5. **Silence Risk Indicator**
6. Raw Metrics (de-emphasized)

This prevents HR from drowning in data and focuses on actionable insights.

---

## Language Guidelines

### DO NOT USE:
- ❌ "burnout"
- ❌ "engagement drop"
- ❌ "psychological safety"
- ❌ "individual performance"
- ❌ "team ranking"

### USE INSTEAD:
- ✅ "capacity risk" or "sustained overload"
- ✅ "participation shift"
- ✅ "communication patterns"
- ✅ "team-level signals"
- ✅ "behavioral patterns"

---

## Support & Maintenance

### Calculating Indices

```javascript
// Calculate BDI for current period
import { calculateBDI } from './services/bdiService.js';

const now = new Date();
const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
const bdi = await calculateBDI(teamId, twoWeeksAgo, now);

// Calculate all indices
import { calculateAllIndices } from './services/indicesService.js';
const { cli, bti, sri } = await calculateAllIndices(teamId, twoWeeksAgo, now);
```

### Seeding New Playbooks

```javascript
import DriftPlaybook from './models/driftPlaybook.js';

const newPlaybook = new DriftPlaybook({
  name: 'Custom Playbook',
  category: 'Meeting Reduction',
  appliesTo: {
    driftStates: ['Early Drift'],
    triggerSignals: ['meetingLoad']
  },
  action: {
    title: 'Action title',
    description: 'Action description',
    timebound: '2 weeks'
  },
  why: 'Rationale',
  expectedEffect: { description: 'Expected outcome' },
  reversibility: { isReversible: true, note: 'How to revert' },
  risk: { level: 'Low' },
  effort: { level: 'Medium', estimatedHours: 3 }
});

await newPlaybook.save();
```

---

## Testing Checklist

**Backend** (Ready):
- [x] BDI calculation with baseline
- [x] CLI state transitions
- [x] BTI trigger detection
- [x] SRI proxy detection
- [x] Capacity status driver identification
- [x] Playbook filtering
- [x] Timeline event creation
- [x] Dashboard endpoint response

**Frontend** (Pending):
- [ ] BDI card renders
- [ ] Capacity card shows drivers
- [ ] Indices display states
- [ ] Timeline visualizes correctly
- [ ] Playbooks filter properly
- [ ] Dashboard hierarchy correct
- [ ] Anti-weaponization notice appears
- [ ] Language is HR-appropriate

---

## Metrics & Success

**Track**:
- % of teams in each BDI state
- Time from drift start to detection
- Playbook usage and success rate
- Time to resolution (days)
- False positive rate

**Success Criteria**:
- 80%+ teams have baseline within 30 days
- 90%+ drift detected before Red capacity
- 70%+ playbooks show positive impact
- 0% individual-level data exposure
- 100% alerts include confidence + action

---

## Documentation

- **Implementation Summary**: See `IMPLEMENTATION_SUMMARY.md`
- **Frontend Guide**: See `FRONTEND_DEVELOPER_GUIDE.md`
- **API Reference**: See above
- **Copilot Instructions**: See `.github/copilot-instructions.md`

---

## License & Usage

SignalTrue is proprietary software. All rights reserved.

**Contact**: support@signaltrue.ai

---

*Last Updated: 2025-12-31*
*Version: 2.0 (HR-Ready with BDI Framework)*
