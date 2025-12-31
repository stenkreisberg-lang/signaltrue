# SignalTrue Frontend Developer Guide
## Quick Reference for New Indices & Components

---

## 🎯 Dashboard Hierarchy (CRITICAL)

The dashboard MUST display in this order:

```
1. Behavioral Drift Index (BDI)      ← PRIMARY METRIC
2. Capacity Status + Drivers          ← WITH EXPLANATION
3. Coordination Load Index (CLI)      ← NEW
4. Bandwidth Tax Indicator (BTI)      ← NEW  
5. Silence Risk Indicator (SRI)       ← NEW
6. Raw Metrics (de-emphasized)        ← BACKGROUND DATA
```

---

## 📡 API Endpoints

### Get All Dashboard Data (Single Call)
```javascript
GET /api/dashboard/:teamId

Response:
{
  bdi: { ... },           // Behavioral Drift Index
  capacity: { ... },      // Capacity Status with drivers
  cli: { ... },           // Coordination Load Index
  bti: { ... },           // Bandwidth Tax Indicator
  sri: { ... },           // Silence Risk Indicator
  timeline: { ... },      // Active drift timeline
  interpretation: "..."   // Product positioning text
}
```

### Individual Endpoints
```javascript
// BDI
GET /api/bdi/team/:teamId/latest
GET /api/bdi/team/:teamId/history?limit=30

// All Indices
GET /api/indices/team/:teamId/all

// Capacity
GET /api/capacity/team/:teamId/latest

// Timeline
GET /api/timeline/team/:teamId

// Playbooks
GET /api/playbooks?driftState=Early%20Drift&category=Meeting%20Reduction
```

---

## 🎨 Component Templates

### 1. BehavioralDriftIndexCard.js

```jsx
import React from 'react';

const BehavioralDriftIndexCard = ({ bdi }) => {
  if (!bdi) return null;

  const stateColors = {
    'Stable': 'green',
    'Early Drift': 'yellow',
    'Developing Drift': 'orange',
    'Critical Drift': 'red'
  };

  return (
    <div className="card">
      <h2>Behavioral Drift Index</h2>
      
      {/* State Badge */}
      <div className={`badge badge-${stateColors[bdi.state]}`}>
        {bdi.state}
      </div>
      
      {/* Drift Score */}
      <div className="score">
        {bdi.driftScore}/100
      </div>
      
      {/* Summary */}
      <p className="summary">{bdi.summary}</p>
      
      {/* Top Drivers */}
      <div className="drivers">
        <h3>Top Drivers</h3>
        {bdi.topDrivers?.map((driver, i) => (
          <div key={i} className="driver">
            <span className="name">{driver.signal}</span>
            <span className="change">{driver.change}</span>
          </div>
        ))}
      </div>
      
      {/* Confidence */}
      <div className="confidence">
        <span>Confidence: {bdi.confidence?.level}</span>
        <span>{bdi.confidence?.confirmingSignals} confirming signals</span>
        <span>{bdi.confidence?.durationDays} days sustained</span>
      </div>
      
      {/* Interpretation */}
      <p className="interpretation">{bdi.interpretation}</p>
      
      {/* Recommended Playbooks */}
      {bdi.recommendedPlaybooks?.length > 0 && (
        <div className="playbooks">
          <h3>Recommended Actions</h3>
          {bdi.recommendedPlaybooks.map((playbook, i) => (
            <button key={i} className="playbook-btn">
              {playbook.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

### 2. CapacityStatusCard.js (Enhanced)

```jsx
const CapacityStatusCard = ({ capacity }) => {
  if (!capacity) return null;

  const statusColors = {
    'Green': 'green',
    'Yellow': 'yellow',
    'Red': 'red'
  };

  return (
    <div className="card">
      <h2>Capacity Status</h2>
      
      {/* Status Badge */}
      <div className={`badge badge-${statusColors[capacity.status]}`}>
        {capacity.status}
      </div>
      
      {/* Score */}
      <div className="score">
        {capacity.capacityScore}/100
      </div>
      
      {/* ONE-SENTENCE EXPLANATION (CRITICAL) */}
      <p className="explanation">{capacity.explanation}</p>
      
      {/* Drivers (CRITICAL - ALWAYS SHOW) */}
      <div className="drivers">
        <h3>Drivers</h3>
        {capacity.drivers?.map((driver, i) => (
          <div key={i} className="driver">
            <span className="icon">{driver.icon}</span>
            <span className="name">{driver.name}</span>
            <span className={`direction ${driver.direction}`}>
              {driver.direction === 'negative' ? '↓' : '↑'}
            </span>
            <span className="change">{driver.change}</span>
          </div>
        ))}
      </div>
      
      {/* Interpretation */}
      <p className="interpretation">{capacity.interpretation}</p>
    </div>
  );
};
```

### 3. CoordinationLoadIndexCard.js

```jsx
const CoordinationLoadIndexCard = ({ cli }) => {
  if (!cli) return null;

  const stateColors = {
    'Execution-dominant': 'green',
    'Balanced': 'blue',
    'Coordination-heavy': 'orange',
    'Coordination overload': 'red'
  };

  return (
    <div className="card">
      <h2>Coordination Load Index</h2>
      
      <div className={`badge badge-${stateColors[cli.state]}`}>
        {cli.state}
      </div>
      
      <div className="score">
        {cli.coordinationLoad}%
      </div>
      
      {/* Breakdown */}
      <div className="breakdown">
        <div>Meeting Time: {cli.meetingTime.toFixed(1)} hrs</div>
        <div>Back-to-Back: {cli.backToBackMeetings.toFixed(1)} hrs</div>
        <div>Cross-Team: {cli.crossTeamSync.toFixed(1)} hrs</div>
        <div>Focus Time: {cli.availableFocusTime.toFixed(1)} hrs</div>
      </div>
      
      {/* Interpretation */}
      <p className="interpretation">{cli.interpretation}</p>
      
      {/* Recommended Actions */}
      {cli.recommendedActions?.length > 0 && (
        <div className="actions">
          {cli.recommendedActions.map((action, i) => (
            <div key={i} className="action">
              <strong>{action.action}</strong>
              <p>{action.expectedEffect}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### 4. BandwidthTaxIndicatorCard.js

```jsx
const BandwidthTaxIndicatorCard = ({ bti }) => {
  if (!bti) return null;

  const stateColors = {
    'Low tax': 'green',
    'Moderate tax': 'yellow',
    'Severe tax': 'red'
  };

  return (
    <div className="card">
      <h2>Bandwidth Tax Indicator</h2>
      
      <div className={`badge badge-${stateColors[bti.state]}`}>
        {bti.state}
      </div>
      
      <div className="score">
        {bti.bandwidthTaxScore}/100
      </div>
      
      {/* Triggers Detected */}
      {bti.triggers?.filter(t => t.detected).length > 0 && (
        <div className="triggers">
          <h3>Detected Triggers</h3>
          {bti.triggers.filter(t => t.detected).map((trigger, i) => (
            <div key={i} className={`trigger severity-${trigger.severity}`}>
              <strong>{trigger.name}</strong>
              <p>{trigger.description}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Impact Indicators */}
      {Object.values(bti.impactIndicators || {}).some(v => v) && (
        <div className="impact-indicators">
          <h3>Impact Risks</h3>
          {bti.impactIndicators.decisionQualityRisk && (
            <div className="risk">⚠️ Decision Quality at Risk</div>
          )}
          {bti.impactIndicators.sustainabilityRisk && (
            <div className="risk">⚠️ Sustainability at Risk</div>
          )}
          {bti.impactIndicators.burnoutRisk && (
            <div className="risk">⚠️ Burnout Risk</div>
          )}
        </div>
      )}
      
      {/* Interpretation */}
      <p className="interpretation">{bti.interpretation}</p>
    </div>
  );
};
```

### 5. SilenceRiskIndicatorCard.js

```jsx
const SilenceRiskIndicatorCard = ({ sri }) => {
  if (!sri) return null;

  const stateColors = {
    'Low Silence Risk': 'green',
    'Rising Silence Risk': 'yellow',
    'High Silence Risk': 'red'
  };

  return (
    <div className="card">
      <h2>Silence Risk Indicator</h2>
      
      <div className={`badge badge-${stateColors[sri.state]}`}>
        {sri.state}
      </div>
      
      <div className="score">
        {sri.silenceRiskScore}/100
      </div>
      
      {/* Proxies Detected */}
      {sri.proxies?.filter(p => p.detected).length > 0 && (
        <div className="proxies">
          <h3>Detected Proxies</h3>
          {sri.proxies.filter(p => p.detected).map((proxy, i) => (
            <div key={i} className={`proxy severity-${proxy.severity}`}>
              <strong>{proxy.name}</strong>
              <p>{proxy.description}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Deviation Metrics */}
      {sri.deviation && (
        <div className="deviations">
          <h3>Changes from Baseline</h3>
          {sri.deviation.asyncContributionChange && (
            <div>Contributions: {sri.deviation.asyncContributionChange.toFixed(0)}%</div>
          )}
          {sri.deviation.collaborationNetworkChange && (
            <div>Network: {sri.deviation.collaborationNetworkChange.toFixed(0)}%</div>
          )}
          {sri.deviation.upwardResponseChange && (
            <div>Upward Response: +{sri.deviation.upwardResponseChange.toFixed(0)}%</div>
          )}
        </div>
      )}
      
      {/* Interpretation */}
      <p className="interpretation">{sri.interpretation}</p>
    </div>
  );
};
```

### 6. AntiWeaponizationNotice.js (REQUIRED)

```jsx
const AntiWeaponizationNotice = () => {
  return (
    <div className="alert alert-warning" style={{ 
      position: 'sticky', 
      top: 0, 
      zIndex: 1000,
      backgroundColor: '#fff3cd',
      border: '1px solid #ffc107',
      padding: '12px',
      borderRadius: '4px',
      marginBottom: '20px'
    }}>
      <strong>⚠️ Important:</strong> SignalTrue insights are designed for early detection 
      and system improvement. They should not be used for individual performance evaluation.
    </div>
  );
};

// Use in Overview.js, TeamAnalytics.js, etc.
```

---

## 📊 Data Structures

### BDI Response
```typescript
{
  state: 'Stable' | 'Early Drift' | 'Developing Drift' | 'Critical Drift',
  driftScore: number, // 0-100
  deviatingSignalsCount: number,
  negativeSignalsCount: number,
  signals: {
    meetingLoad: { value: number, deviating: boolean, direction: string },
    afterHoursActivity: { ... },
    responseTime: { ... },
    asyncParticipation: { ... },
    focusTime: { ... },
    collaborationBreadth: { ... }
  },
  topDrivers: [
    { signal: string, contribution: number, currentValue: number, 
      baselineValue: number, change: string }
  ],
  summary: string,
  interpretation: string,
  confidence: {
    score: number,
    level: 'Low' | 'Medium' | 'High',
    confirmingSignals: number,
    durationDays: number,
    confounders: string[]
  },
  recommendedPlaybooks: [ ... ]
}
```

### Capacity Response
```typescript
{
  status: 'Green' | 'Yellow' | 'Red',
  capacityScore: number, // 0-100
  drivers: [
    {
      name: string,
      direction: 'positive' | 'negative',
      contribution: number,
      value: number,
      change: string,
      icon: string
    }
  ],
  explanation: string,  // ONE-SENTENCE SUMMARY (CRITICAL)
  interpretation: string,
  deviation: {
    trend: 'improving' | 'stable' | 'declining'
  }
}
```

---

## 🎨 UI Text Requirements

### ALWAYS Include These Texts

**BDI Card:**
> "Behavioral Drift Index shows whether a team's working patterns are changing compared to their own historical baseline. It detects early coordination and capacity issues before outcomes are affected."

**Capacity Card:**
> "Capacity reflects the team's ability to sustain current workload without long-term strain. Changes are driven by observable working patterns, not self-reported sentiment."

**CLI Card:**
> "Coordination Load shows how much time teams spend aligning work versus executing it. High coordination load often indicates unclear ownership or decision structure."

**BTI Card:**
> "Bandwidth Tax reflects how much cognitive capacity is consumed by constant interruptions and urgency. High tax reduces decision quality even when output appears stable."

**SRI Card:**
> "Silence Risk highlights patterns where people contribute less or avoid sharing input, often before issues surface openly."

---

## 🚫 Language Replacements (CRITICAL)

### DO NOT USE:
- ❌ "burnout"
- ❌ "engagement drop"
- ❌ "psychological safety"
- ❌ "individual performance"
- ❌ "team ranking"
- ❌ "surveillance"

### USE INSTEAD:
- ✅ "capacity risk" or "sustained overload"
- ✅ "participation shift"
- ✅ "communication patterns"
- ✅ "team-level signals"
- ✅ "behavioral patterns"
- ✅ "early warning signals"

---

## 🔧 Utility Functions

### Fetch Dashboard Data
```javascript
export async function fetchDashboardData(teamId) {
  const response = await fetch(`/api/dashboard/${teamId}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  return await response.json();
}
```

### Format Drift State for Display
```javascript
export function getDriftStateColor(state) {
  const colors = {
    'Stable': '#10b981',
    'Early Drift': '#f59e0b',
    'Developing Drift': '#f97316',
    'Critical Drift': '#ef4444'
  };
  return colors[state] || '#6b7280';
}
```

### Format Capacity Status for Display
```javascript
export function getCapacityStatusColor(status) {
  const colors = {
    'Green': '#10b981',
    'Yellow': '#f59e0b',
    'Red': '#ef4444'
  };
  return colors[status] || '#6b7280';
}
```

---

## 📋 Implementation Checklist

### High Priority (Week 1)
- [ ] Create BehavioralDriftIndexCard component
- [ ] Update CapacityStatusCard with drivers display
- [ ] Add AntiWeaponizationNotice to Overview.js
- [ ] Reorganize Overview.js dashboard hierarchy
- [ ] Test /api/dashboard/:teamId endpoint

### Medium Priority (Week 2)
- [ ] Create CoordinationLoadIndexCard component
- [ ] Create BandwidthTaxIndicatorCard component
- [ ] Create SilenceRiskIndicatorCard component
- [ ] Integrate all cards into dashboard
- [ ] Add loading and error states

### Low Priority (Week 3)
- [ ] Create DriftTimelineView component
- [ ] Create PlaybookLibrary component
- [ ] Link playbooks to BDI recommendations
- [ ] Add historical charts for BDI/Capacity

### Language Cleanup (Ongoing)
- [ ] Replace "burnout" → "capacity risk" in all files
- [ ] Replace "engagement drop" → "participation shift"
- [ ] Remove "psychological safety" references
- [ ] Update marketing pages
- [ ] Update documentation

---

## 🐛 Common Issues & Solutions

**Issue**: BDI data not showing
- Check if baseline is established (requires 30 days of data)
- Verify `/api/bdi/team/:teamId/latest` returns data
- Check browser console for errors

**Issue**: Capacity drivers empty
- Ensure metrics are being collected (meeting load, focus time, etc.)
- Check CapacityStatus model calculations
- Verify data exists in MetricsDaily collection

**Issue**: Timeline not updating
- BDI must change state to trigger timeline event
- Check DriftTimeline collection for records
- Verify timeline status is 'Active'

---

## 📞 Backend Endpoints Reference

```
BASE_URL: http://localhost:8080/api (development)

# Primary Endpoints
GET  /dashboard/:teamId                    → All dashboard data
GET  /bdi/team/:teamId/latest             → Latest BDI
GET  /indices/team/:teamId/all            → CLI, BTI, SRI
GET  /capacity/team/:teamId/latest        → Capacity with drivers
GET  /timeline/team/:teamId               → Drift timelines
GET  /playbooks?driftState=:state         → Filtered playbooks

# Historical Data
GET  /bdi/team/:teamId/history?limit=30   → BDI history
GET  /bdi/org/:orgId/summary              → Org-wide stats

# Calculations (Admin/System Only)
POST /bdi/team/:teamId/calculate          → Calculate BDI
POST /indices/team/:teamId/calculate      → Calculate all indices
```

---

## 🎯 Success Criteria

**Dashboard must:**
- Display BDI as the PRIMARY metric (top of page)
- Always show Capacity drivers with explanation
- Display all 5 indices (BDI, Capacity, CLI, BTI, SRI) in order
- Include anti-weaponization notice on every page
- Use HR-appropriate language (no "burnout", "psychological safety")
- Show confidence level for all drift signals
- Link to recommended playbooks when drift detected

**Each index card must:**
- Display state/status with color coding
- Show numerical score
- Include interpretation text (from model)
- List key drivers or proxies
- Show baseline deviation
- Be responsive and accessible

---

*For questions or issues, see: `/IMPLEMENTATION_SUMMARY.md`*
