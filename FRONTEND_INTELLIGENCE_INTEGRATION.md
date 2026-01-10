# Frontend Integration for Behavioral Intelligence Features

## 🚨 **CURRENT STATUS: BACKEND COMPLETE, FRONTEND NOT INTEGRATED**

✅ **What's Done** (Backend):
- 10 behavioral intelligence features fully implemented
- 33 API endpoints live at `/api/intelligence/*`
- Cron jobs running automated calculations
- All models, services, and routes tested

❌ **What's Missing** (Frontend):
- No UI components to display the new intelligence data
- Dashboards don't fetch or show attrition risk, manager effectiveness, etc.
- AI recommendations don't incorporate intelligence signals
- No alerts/notifications for crises or high-risk events
- Clients cannot see the new measurements

---

## 📋 **INTEGRATION TASKS REQUIRED**

### **1. Create Intelligence Dashboard Components**

Location: `src/components/intelligence/`

#### Components to Build:

**a) AttritionRiskDashboard.js**
- Fetches: `GET /api/intelligence/attrition/org/:orgId`
- Displays:
  - List of high-risk employees (sorted by risk score)
  - Risk badges (critical/high/medium/low)
  - Predicted exit window (30-60, 60-90, 90-180 days)
  - Key behavioral signals (message drop, response time spike, etc.)
  - "Schedule Retention Conversation" button
- Role Access: HR/Admin only (privacy-preserving)

**b) ManagerEffectivenessDashboard.js**
- Fetches: `GET /api/intelligence/managers/:orgId`
- Displays:
  - Manager leaderboard (effectiveness scores)
  - Color-coded effectiveness levels (excellent/good/needs-improvement/critical)
  - Managers needing coaching (highlighted)
  - Team health trends under each manager
  - Coaching topic recommendations
  - Drill-down to individual manager details
- Role Access: HR/Admin only

**c) CrisisAlertBanner.js**
- Fetches: `GET /api/intelligence/crisis/:orgId` (real-time via polling/WebSocket)
- Displays:
  - Crisis type (team-collapse, mass-exodus, sudden-silence, conflict-spike)
  - Severity (critical/high/moderate)
  - Confidence score
  - Affected team
  - "Acknowledge" and "View Details" buttons
- Behavior: Auto-appears when crisis detected, dismisses when resolved
- Role Access: HR/Admin/Leadership

**d) NetworkHealthWidget.js**
- Fetches: `GET /api/intelligence/network/:teamId`
- Displays:
  - Network visualization (nodes = people, edges = communication frequency)
  - Silo score meter (0-100)
  - Bottleneck warnings (people with >50% of messages)
  - Isolated members (< 3 connections)
  - Recommended interventions ("Schedule cross-team meeting", "Rotate DRI roles")
- Role Access: HR/Admin (anonymized for managers)

**e) SuccessionRiskWidget.js**
- Fetches: `GET /api/intelligence/succession/:teamId`
- Displays:
  - Bus factor score (0-100, lower = higher risk)
  - Top knowledge holders (top 3 people)
  - "At risk if they leave" warnings (combines succession + attrition)
  - Documentation health score
  - Knowledge transfer recommendations
- Role Access: HR/Admin/Leadership

**f) EquitySignalsWidget.js**
- Fetches: `GET /api/intelligence/equity/:teamId`
- Displays:
  - Response time equity chart (min, avg, max response times by person)
  - Participation equity chart (message counts distribution)
  - Workload equity chart (meeting hours, after-hours activity)
  - Voice equity score (% of people contributing >10% of messages)
  - Recommended interventions ("Rotate meeting facilitation", "Review response SLAs")
- Role Access: HR/Admin only (privacy-sensitive)

**g) ProjectRiskWidget.js**
- Fetches: `GET /api/intelligence/projects/:teamId`
- Displays:
  - Inferred projects (detected from meeting titles + Slack keywords)
  - Risk scores (0-100)
  - Negative keywords detected ("blocked", "delayed", "at-risk")
  - Sentiment trend (positive/neutral/negative)
  - Meeting-to-action ratio
- Role Access: All authenticated users

**h) MeetingROIWidget.js**
- Fetches: `GET /api/intelligence/meeting-roi/team/:teamId`
- Displays:
  - Recent meetings with ROI scores (0-100)
  - ROI verdict (high-roi, medium-roi, low-roi)
  - Post-meeting signals (actions taken, documents shared, decisions made)
  - Negative signals (confusion, re-discussion, disengagement)
  - Low-ROI meeting patterns ("Weekly standup has 12% ROI - consider async update")
- Role Access: All authenticated users

**i) OutlookSignalsWidget.js**
- Fetches: `GET /api/intelligence/outlook/team/:teamId`
- Displays:
  - Email patterns (volume, response time, after-hours rate)
  - Teams status patterns (% time in meetings, available, DND)
  - Call duration analysis (avg meeting length, back-to-back rate)
  - Overload warnings (>6h meetings/day, >30% after-hours emails)
- Role Access: All authenticated users

---

### **2. Integrate Into Existing Pages**

#### **A) Insights Page (`src/pages/app/Insights.js`)**

**Current State**: Shows team state, drift risks, AI recommendations, experiments
**Required Changes**:
```javascript
// Add new data fetching
const [intelligenceData, setIntelligenceData] = useState(null);

useEffect(() => {
  fetchIntelligenceData();
}, [teamId]);

const fetchIntelligenceData = async () => {
  const token = localStorage.getItem('token');
  
  // Fetch all intelligence metrics for this team
  const [attrition, projects, network, succession, equity, meetingROI, outlook] = await Promise.all([
    axios.get(`${API_URL}/api/intelligence/attrition/team/${teamId}`, { headers: { Authorization: `Bearer ${token}` } }),
    axios.get(`${API_URL}/api/intelligence/projects/${teamId}`, { headers: { Authorization: `Bearer ${token}` } }),
    axios.get(`${API_URL}/api/intelligence/network/${teamId}`, { headers: { Authorization: `Bearer ${token}` } }),
    axios.get(`${API_URL}/api/intelligence/succession/${teamId}`, { headers: { Authorization: `Bearer ${token}` } }),
    axios.get(`${API_URL}/api/intelligence/equity/${teamId}`, { headers: { Authorization: `Bearer ${token}` } }),
    axios.get(`${API_URL}/api/intelligence/meeting-roi/team/${teamId}`, { headers: { Authorization: `Bearer ${token}` } }),
    axios.get(`${API_URL}/api/intelligence/outlook/team/${teamId}`, { headers: { Authorization: `Bearer ${token}` } })
  ]);
  
  setIntelligenceData({
    attritionRisk: attrition.data,
    projects: projects.data,
    networkHealth: network.data,
    successionRisk: succession.data,
    equitySignals: equity.data,
    meetingROI: meetingROI.data,
    outlookSignals: outlook.data
  });
};
```

**UI Integration**:
- Add "Intelligence Signals" section below existing risks
- Display widgets for each intelligence type (conditionally render based on role)
- Link intelligence signals to recommended actions ("High attrition risk → 1:1 retention conversations")

#### **B) Dashboard (`src/components/Dashboard.js`)**

**Required Changes**:
- Add new navigation tabs for HR/Admin roles:
  - "Attrition Risk" → AttritionRiskDashboard
  - "Manager Quality" → ManagerEffectivenessDashboard
  - "Network Health" → NetworkHealthWidget (org-level)
  - "Succession Planning" → SuccessionRiskWidget (org-level)
  - "Equity Signals" → EquitySignalsWidget (org-level)
  
- Add crisis alert banner at top (always visible when crisis active):
  ```javascript
  {user?.role === 'hr_admin' || user?.role === 'admin' || user?.role === 'master_admin' ? (
    <CrisisAlertBanner orgId={user.orgId} />
  ) : null}
  ```

#### **C) Overview Page (`src/pages/app/Overview.js`)**

**Current State**: Shows team health dashboard with BDI, capacity, coordination
**Required Changes**:
- Add intelligence summary cards:
  - "🚨 3 team members at high attrition risk" (if applicable)
  - "⚠️ Manager effectiveness: Needs improvement (62/100)" (if applicable)
  - "🔍 2 knowledge bottlenecks detected" (if applicable)
  - "⚖️ Equity issue: 40% response time gap" (if applicable)
  
- Make cards clickable → navigate to detailed intelligence dashboard

---

### **3. Update AI Recommendations to Include Intelligence Signals**

**File**: `backend/services/actionGenerationService.js`

**Current State**: Generates recommendations based on drift risks only
**Required Enhancement**:

```javascript
// In buildRecommendationContext function (backend/services/aiRecommendationContext.js)
async function buildRecommendationContext(teamId, riskType, drivers, weekStart) {
  // ... existing context ...
  
  // ADD: Fetch behavioral intelligence data
  const intelligenceContext = await fetchIntelligenceContext(teamId);
  
  return {
    // ... existing fields ...
    intelligenceSignals: intelligenceContext
  };
}

async function fetchIntelligenceContext(teamId) {
  const team = await Team.findById(teamId);
  const orgId = team.orgId;
  
  // Import all intelligence services
  const [attritionRisks, managerScore, crises, networkHealth, successionRisk, equitySignals] = await Promise.all([
    getTeamRiskSummary(teamId),
    calculateManagerEffectiveness(team.managerId, teamId),
    detectTeamCrisis(teamId),
    analyzeNetworkHealth(teamId),
    analyzeTeamSuccessionRisk(teamId),
    analyzeTeamEquity(teamId)
  ]);
  
  return {
    attrition: {
      highRiskCount: attritionRisks.highRiskCount,
      criticalRiskCount: attritionRisks.criticalRiskCount,
      topRiskSignals: attritionRisks.topSignals || []
    },
    manager: {
      effectivenessScore: managerScore?.effectivenessScore || null,
      effectivenessLevel: managerScore?.effectivenessLevel || null,
      improvementAreas: managerScore?.improvementAreas || []
    },
    crisis: {
      active: crises?.length > 0,
      type: crises?.[0]?.crisisType || null,
      severity: crises?.[0]?.severity || null
    },
    network: {
      siloScore: networkHealth?.siloScore || 0,
      bottleneckCount: networkHealth?.bottlenecks?.length || 0,
      isolatedMemberCount: networkHealth?.isolatedMembers?.length || 0
    },
    succession: {
      busFactor: successionRisk?.busFactor || 100,
      criticalRoles: successionRisk?.criticalRoles || []
    },
    equity: {
      responseTimeEquity: equitySignals?.responseTimeEquity?.equityScore || 100,
      participationEquity: equitySignals?.participationEquity?.equityScore || 100,
      voiceEquity: equitySignals?.voiceEquity?.equityScore || 100
    }
  };
}
```

**AI Prompt Enhancement**:
Update the AI prompt to include intelligence context:

```javascript
const systemPrompt = `You are an expert organizational health advisor. Recommend specific actions based on:

BEHAVIORAL INTELLIGENCE SIGNALS:
${context.intelligenceSignals.attrition.highRiskCount > 0 ? `- ⚠️ ${context.intelligenceSignals.attrition.highRiskCount} team members at high attrition risk` : ''}
${context.intelligenceSignals.manager.effectivenessLevel === 'needs-improvement' || context.intelligenceSignals.manager.effectivenessLevel === 'critical' ? `- ⚠️ Manager effectiveness: ${context.intelligenceSignals.manager.effectivenessLevel} (${context.intelligenceSignals.manager.effectivenessScore}/100)` : ''}
${context.intelligenceSignals.crisis.active ? `- 🚨 ACTIVE CRISIS: ${context.intelligenceSignals.crisis.type} (${context.intelligenceSignals.crisis.severity})` : ''}
${context.intelligenceSignals.network.siloScore > 60 ? `- ⚠️ Silo detection: Score ${context.intelligenceSignals.network.siloScore}/100` : ''}
${context.intelligenceSignals.succession.busFactor < 40 ? `- ⚠️ Succession risk: Bus factor ${context.intelligenceSignals.succession.busFactor}/100` : ''}
${context.intelligenceSignals.equity.responseTimeEquity < 70 ? `- ⚠️ Response time inequity detected (${context.intelligenceSignals.equity.responseTimeEquity}/100)` : ''}

DRIFT RISKS:
${contextPrompt} // existing drift context

Recommend actions that address BOTH intelligence signals AND drift patterns.`;
```

---

### **4. Add Intelligence Metrics to Weekly Diagnosis**

**File**: `backend/services/weeklySchedulerService.js`

**Current State**: Calculates BDI, capacity, coordination, bandwidth tax
**Required Enhancement**:

```javascript
async function diagnoseSingleTeam(team, weekStart) {
  // ... existing BDI calculation ...
  
  // ADD: Calculate intelligence scores
  const intelligenceScores = await calculateIntelligenceScores(team._id, weekStart);
  
  // ADD: Include in team state
  const teamState = await TeamState.create({
    teamId: team._id,
    orgId: team.orgId,
    weekStart,
    // ... existing fields ...
    intelligenceScores // NEW
  });
  
  return teamState;
}

async function calculateIntelligenceScores(teamId, weekStart) {
  const [attrition, manager, crisis, network, succession, equity] = await Promise.all([
    getTeamRiskSummary(teamId),
    // ... fetch all intelligence metrics ...
  ]);
  
  return {
    attritionRisk: {
      highRiskCount: attrition.highRiskCount,
      avgRiskScore: attrition.avgRiskScore
    },
    managerEffectiveness: manager?.effectivenessScore || null,
    crisisActive: crisis?.length > 0,
    networkHealth: network?.siloScore || 0,
    successionRisk: succession?.busFactor || 100,
    equityScore: equity?.overallEquityScore || 100
  };
}
```

**Model Update**:
Add to `backend/models/teamState.js`:
```javascript
intelligenceScores: {
  attritionRisk: {
    highRiskCount: { type: Number, default: 0 },
    avgRiskScore: { type: Number, default: 0 }
  },
  managerEffectiveness: { type: Number },
  crisisActive: { type: Boolean, default: false },
  networkHealth: { type: Number },
  successionRisk: { type: Number },
  equityScore: { type: Number }
}
```

---

### **5. Build Intelligence Notification System**

**File**: `backend/services/intelligenceNotificationService.js` (NEW)

**Purpose**: Alert HR/admins when critical intelligence events occur

```javascript
/**
 * Intelligence Notification Service
 * Sends alerts for critical behavioral events
 */

import User from '../models/user.js';
import Notification from '../models/notification.js';
// Import email service if you have one

/**
 * Notify HR/admins of high attrition risk
 */
export async function notifyAttritionRisk(teamId, riskData) {
  if (riskData.riskScore < 60) return; // Only notify for high risk
  
  const team = await Team.findById(teamId);
  const hrUsers = await User.find({ 
    orgId: team.orgId, 
    role: { $in: ['hr_admin', 'admin', 'master_admin'] }
  });
  
  const notification = {
    type: 'attrition_risk',
    severity: riskData.riskScore >= 80 ? 'critical' : 'high',
    title: `High Attrition Risk Detected`,
    message: `Team member shows ${riskData.riskLevel} flight risk (${riskData.riskScore}/100). Predicted exit: ${riskData.exitWindow}.`,
    data: {
      teamId,
      userId: riskData.userId,
      riskScore: riskData.riskScore,
      signals: riskData.behavioralIndicators
    }
  };
  
  // Create notifications for all HR users
  await Promise.all(hrUsers.map(user => 
    Notification.create({ ...notification, userId: user._id })
  ));
  
  // Send email if critical
  if (riskData.riskScore >= 80) {
    await sendEmailAlert(hrUsers, notification);
  }
}

/**
 * Notify of manager needing coaching
 */
export async function notifyManagerCoaching(managerId, effectivenessData) {
  // Similar implementation
}

/**
 * Notify of crisis event (URGENT)
 */
export async function notifyCrisisEvent(teamId, crisisData) {
  // Real-time alert - highest priority
}

// ... additional notification functions ...
```

**Integration**:
Call notification functions from intelligence services when thresholds crossed:

```javascript
// In attritionRiskService.js
export async function calculateAttritionRisk(userId, teamId) {
  // ... calculation logic ...
  
  // NEW: Send notification if high risk
  if (risk.riskScore >= 60) {
    await notifyAttritionRisk(teamId, risk);
  }
  
  return risk;
}
```

---

### **6. Update Dashboard Navigation**

**File**: `src/components/Dashboard.js`

Add new tabs for HR/Admin roles:

```javascript
const navigationTabs = [
  { name: 'Overview', path: '/dashboard/overview', roles: ['all'] },
  { name: 'Insights', path: '/dashboard/insights', roles: ['all'] },
  { name: 'Attrition Risk', path: '/dashboard/attrition', roles: ['hr_admin', 'admin', 'master_admin'] },
  { name: 'Manager Quality', path: '/dashboard/managers', roles: ['hr_admin', 'admin', 'master_admin'] },
  { name: 'Network Health', path: '/dashboard/network', roles: ['hr_admin', 'admin', 'master_admin'] },
  { name: 'Succession Planning', path: '/dashboard/succession', roles: ['hr_admin', 'admin', 'master_admin'] },
  { name: 'Equity Signals', path: '/dashboard/equity', roles: ['hr_admin', 'admin', 'master_admin'] },
  { name: 'Team Management', path: '/dashboard/teams', roles: ['admin', 'master_admin'] },
  // ... existing tabs ...
];
```

---

## 🎯 **SUMMARY: WHAT THE CLIENT WILL SEE AFTER INTEGRATION**

### **Before Integration** (Current):
✅ Weekly behavioral drift diagnosis (BDI, capacity, coordination)
✅ AI-powered action recommendations
✅ Experiment tracking
✅ Loop-closing insights

❌ No attrition risk visibility
❌ No manager effectiveness tracking
❌ No crisis alerts
❌ No succession planning
❌ No network health insights
❌ No equity monitoring

### **After Integration** (Target):

**For HR/Admins**:
1. **Attrition Risk Dashboard**: See all high-risk employees, predicted exit windows, behavioral signals → Schedule retention conversations
2. **Manager Quality Dashboard**: See all managers ranked, coaching needs, team health trends → Provide targeted coaching
3. **Crisis Alert Banner**: Real-time alerts when team collapse, mass exodus, or conflict spike detected → Immediate intervention
4. **Network Health Dashboard**: Visualize communication silos, bottlenecks, isolated members → Reorganize team structure
5. **Succession Planning Dashboard**: See knowledge concentration, bus factor, critical roles → Plan knowledge transfer
6. **Equity Signals Dashboard**: Monitor response time, participation, workload equity → Address DEI issues proactively

**For All Users**:
1. **Enhanced Insights Page**: Existing drift analysis PLUS project risk, meeting ROI, Outlook signals
2. **Smarter AI Recommendations**: Actions now consider attrition risk, manager quality, network issues (not just drift)
3. **Weekly Diagnosis**: Includes intelligence scores alongside BDI metrics

**For Managers**:
1. **Team Summary**: See aggregate attrition risk ("2 team members need attention - contact HR"), network health, meeting ROI
2. **Own Effectiveness Score**: See their own manager quality score + coaching recommendations

---

## ⚡ **IMPLEMENTATION PRIORITY**

### **Phase 1: High-Value Quick Wins** (1-2 weeks)
1. ✅ Build AttritionRiskDashboard (highest ROI - prevents turnover)
2. ✅ Build CrisisAlertBanner (prevents team collapse)
3. ✅ Integrate intelligence into AI recommendations (makes recommendations 10x better)
4. ✅ Add intelligence scores to weekly diagnosis (automatic integration)

### **Phase 2: Manager & Team Health** (2-3 weeks)
5. Build ManagerEffectivenessDashboard
6. Build NetworkHealthWidget
7. Build SuccessionRiskWidget
8. Add notification system for critical events

### **Phase 3: Advanced Features** (3-4 weeks)
9. Build EquitySignalsWidget
10. Build ProjectRiskWidget
11. Build MeetingROIWidget
12. Build OutlookSignalsWidget
13. Add all intelligence widgets to Insights page

---

## 🔒 **PRIVACY & ROLE-BASED ACCESS**

| Feature | HR/Admin | Manager | Team Member |
|---------|----------|---------|-------------|
| **Attrition Risk** | Full names + scores | "X members at risk (contact HR)" | Nothing |
| **Manager Effectiveness** | All manager scores | Own score only | Nothing |
| **Crisis Events** | Full details | Team alerts only | Nothing |
| **Network Health** | Full names | Anonymized ("bottleneck detected") | Nothing |
| **Succession Risk** | Full names | Anonymized | Nothing |
| **Equity Signals** | Full details | Aggregated team score | Nothing |
| **Project Risk** | All teams | Own team only | Own team only |
| **Meeting ROI** | All teams | Own team only | Own team only |
| **Outlook Signals** | All teams | Own team only | Own team only |

---

## 📞 **NEXT STEPS**

**To complete frontend integration, start with:**
1. Create `src/components/intelligence/` folder
2. Build AttritionRiskDashboard.js (highest priority)
3. Build CrisisAlertBanner.js (highest urgency)
4. Update actionGenerationService.js to fetch intelligence context
5. Add intelligence scores to teamState model + weekly diagnosis

**This will give clients immediate visibility into the 10 new behavioral intelligence features.**
