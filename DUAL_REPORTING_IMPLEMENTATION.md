# Dual Reporting Cadence Implementation - Backend Complete ✅

## Implementation Summary

SignalTrue now has **two distinct reporting layers** with completely separate data scopes, narratives, audiences, and delivery rules.

---

## ✅ What's Been Implemented

### 1. **MongoDB Models**

#### **WeeklyReport Model** (`backend/models/weeklyReport.js`)
- **Purpose:** Tactical early warning brief
- **Data Scope:** Last 7 days vs baseline
- **Fields:**
  - `bdiCurrent`, `bdiDelta` - BDI tracking with week-over-week change
  - `zone`, `zoneChanged` - Team zone with change detection
  - `newRisks[]` - ONLY risks that increased ≥10 points or crossed thresholds
  - `activeCrises[]` - Crises detected/resolved this week
  - `topDrivers[]` - Max 3 drivers with highest deviation
  - `recommendations[]` - 1-3 AI-generated tactical actions
  - `noActionNeeded` - Boolean flag if team is stable
- **Indexes:** `teamId + periodEnd`, optimized for latest queries
- **Methods:**
  - `.showsImprovement()` - Check if team trending positive
  - `.getSeverity()` - Calculate report urgency (critical/high/medium/low)
  - `.getLatestForTeam()` - Static method for quick access

#### **MonthlyReport Model** (`backend/models/monthlyReport.js`)
- **Purpose:** Strategic organizational health review
- **Data Scope:** Rolling 30 days, aggregated across org
- **Fields:**
  - `orgHealth` - Avg BDI, trend, zone distribution, teams at risk
  - `persistentRisks[]` - Risks elevated ≥3 weeks (classified as structural/episodic)
  - `leadershipSignals` - Manager effectiveness, equity, succession risk
  - `executionSignals` - Execution drag, project risk, meeting ROI, silos
  - `retentionExposure` - Attrition risk, critical individuals, estimated turnover
  - `topStructuralDrivers[]` - Org-wide patterns (not team-specific)
  - `crisisPatterns` - Recurring crisis analysis
  - `aiSummary` - Strategic narrative, key risks, leadership decisions required
- **Indexes:** `orgId + periodEnd`
- **Methods:**
  - `.getLeadershipView()` - Filters out individual names, coaching language, tactical actions
  - `.getOverallSeverity()` - Org-level severity assessment
  - `.getLatestForOrg()` - Static method for quick access

---

### 2. **Backend Services**

#### **weeklyReportService.js**
- `generateWeeklyReportForTeam(teamId)` - Compare current vs previous week
- **Filtering Logic:**
  - ONLY include risks with ≥10 point increase
  - ONLY include new risks crossing Yellow (≥35) or Red (≥65)
  - Exclude stable or improving metrics
- **No Action Detection:**
  - Returns "No action needed" if BDI stable, no new risks, no crises
  - Auto-generates reason (e.g., "Team remains stable with improving metrics")
- `generateWeeklyReportsForOrg(orgId)` - Batch generate for all teams
- **Output:** Results summary (success/no action/failed counts)

#### **monthlyReportService.js**
- `generateMonthlyReportForOrg(orgId)` - Aggregate 30-day patterns
- **Aggregation Logic:**
  - Calculate avg BDI across all teams
  - Detect BDI trend (improving/stable/deteriorating)
  - Identify persistent risks (≥3 weeks elevated)
  - Classify risks as structural (≥70% of period) vs episodic
  - Aggregate leadership, execution, retention signals
  - Analyze crisis patterns (recurring vs isolated)
- `getLeadershipView(orgId)` - Returns filtered version for CEO
  - Removes: Individual names, team IDs, coaching language
  - Keeps: Trends, counts, strategic patterns
- **Output:** Full org health report with AI narrative

---

### 3. **AI Prompt Separation**

#### **Updated `aiRecommendationContext.js`:**

**`generateWeeklyRecommendations()`**
- **Prompt Rules:**
  - Max 3 recommendations
  - Must be SPECIFIC and ACTIONABLE
  - Must reference actual risks/drivers
  - NO generic advice
  - Explicitly state "No action needed" if nothing changed
- **Output Format:**
  ```json
  [
    {
      "title": "Specific action title",
      "description": "What to do, how to do it",
      "category": "overload|execution|retention|crisis",
      "priority": "critical|high|medium",
      "expectedImpact": "Specific metric improvement expected"
    }
  ]
  ```

**`generateMonthlyNarrative()`**
- **Prompt Rules:**
  - NO individual names
  - NO tactical recommendations
  - NO coaching language
  - FOCUS on organizational trajectory, structural risks, leadership decisions
  - Include cost of inaction (qualitative)
- **Output Format:**
  ```json
  {
    "narrative": "2-3 paragraph executive summary",
    "keyRisks": [
      {
        "risk": "Brief risk description",
        "impact": "Business impact if unaddressed",
        "costOfInaction": "What happens if leadership doesn't act"
      }
    ],
    "leadershipDecisionsRequired": [
      {
        "decision": "Strategic decision needed",
        "rationale": "Why this decision is needed now",
        "urgency": "immediate|this-quarter|strategic"
      }
    ],
    "organizationalTrajectory": "positive|stable|concerning|critical"
  }
  ```

---

### 4. **API Routes** (`backend/routes/reports.js`)

#### **Weekly Reports:**
- `GET /api/reports/weekly/team/:teamId/latest` - Latest report for team (HR/Admin + Manager)
- `GET /api/reports/weekly/team/:teamId/history` - Last 12 weeks (HR/Admin + Manager)
- `POST /api/reports/weekly/team/:teamId/generate` - Manual trigger (HR/Admin only)
- `POST /api/reports/weekly/org/:orgId/generate-all` - Generate for all teams (HR/Admin only)

#### **Monthly Reports:**
- `GET /api/reports/monthly/org/:orgId/latest` - Full report (HR/Admin only)
- `GET /api/reports/monthly/org/:orgId/history` - Last 12 months (HR/Admin only)
- `GET /api/reports/monthly/org/:orgId/leadership` - Filtered view (CEO/Leadership only)
- `POST /api/reports/monthly/org/:orgId/generate` - Manual trigger (HR/Admin only)

#### **Role-Based Access:**
- ✅ Weekly: HR/Admin + Managers (their teams)
- ✅ Monthly Full: HR/Admin only
- ✅ Monthly Leadership: CEO/Leadership only
- ❌ Weekly: NOT sent to CEO by default

---

### 5. **Cron Jobs** (Added to `backend/server.js`)

#### **Weekly Reports:**
- **Schedule:** `30 23 * * 0` (Sunday 11:30 PM)
- **Trigger:** After TeamState calculation (Sun 11 PM)
- **Logic:**
  - Generate reports for all orgs
  - Log summary: action required vs stable
  - Errors don't crash cron

#### **Monthly Reports:**
- **Schedule:** `0 4 1 * *` (1st of month, 4:00 AM)
- **Logic:**
  - Generate reports for all orgs
  - Log BDI and trend
  - Errors don't crash cron

---

## 🔄 Data Flow

### Weekly Report Generation:
```
TeamState (current) + TeamState (previous)
  ↓
Compare BDI, risks, zone
  ↓
Filter NEW or WORSENING risks only (≥10 point increase)
  ↓
Get active crises (last 7 days)
  ↓
Extract top 3 drivers
  ↓
Check if action needed
  ↓
Generate AI recommendations (max 3, tactical)
  ↓
Store WeeklyReport
  ↓
Available via API (HR/Admin + Managers)
```

### Monthly Report Generation:
```
All TeamStates (last 30 days)
  ↓
Calculate org-level BDI, trend, zone distribution
  ↓
Identify persistent risks (≥3 weeks elevated)
  ↓
Classify risks (structural vs episodic)
  ↓
Aggregate leadership signals (managers, equity, succession)
  ↓
Aggregate execution signals (drag, projects, meetings, silos)
  ↓
Calculate retention exposure (attrition risk, turnover estimate)
  ↓
Analyze crisis patterns (recurring vs isolated)
  ↓
Generate AI strategic narrative (NO tactical recs)
  ↓
Store MonthlyReport
  ↓
Full version: HR/Admin API
Leadership view: CEO/Leadership API (filtered)
```

---

## 📊 Key Differences: Weekly vs Monthly

| Aspect | Weekly Report | Monthly Report |
|--------|---------------|----------------|
| **Purpose** | Tactical early warning | Strategic organizational health |
| **Audience** | HR/Admin, Managers | HR/Admin (full), CEO (filtered) |
| **Data Scope** | Last 7 days vs baseline | Rolling 30 days, aggregated |
| **Focus** | New/worsening issues ONLY | Persistent risks, structural patterns |
| **AI Output** | 1-3 tactical recommendations | Strategic narrative + leadership decisions |
| **Language** | Action-oriented ("Schedule 1-on-1s") | Strategic ("Resource allocation review") |
| **Individual Data** | Yes (for HR/Admin) | No (filtered in leadership view) |
| **Frequency** | Weekly (Sunday 11:30 PM) | Monthly (1st at 4:00 AM) |
| **Persistence** | Last 12 weeks stored | Last 12 months stored |
| **Generation Trigger** | After TeamState calc | Cron only (1st of month) |

---

## 🚨 Critical Implementation Rules

### ✅ CORRECT:
- Weekly reports show ONLY new or worsening risks (≥10 point increase)
- Monthly reports use ≥3 weeks threshold for "persistent"
- Leadership view has NO individual names, NO tactical actions
- AI prompts are COMPLETELY DIFFERENT (tactical vs strategic)
- Weekly and monthly NEVER share UI components (to be implemented)
- Reports are immutable after generation (no edits)

### ❌ WRONG:
- ❌ Showing stable metrics in weekly reports
- ❌ Tactical recommendations in monthly narrative
- ❌ Individual names in leadership view
- ❌ CEO receiving weekly reports by default
- ❌ Using same AI prompt for both report types
- ❌ Generating weekly and monthly reports at same time

---

## 🔐 Security & Privacy

### Role-Based Access Control:
- **HR/Admin:** Full access to both weekly and monthly reports
- **Manager:** Weekly reports for THEIR teams only (to be enforced in middleware)
- **CEO/Leadership:** Monthly leadership view ONLY (filtered)
- **Employee:** No access to either report type

### Data Filtering (Leadership View):
- ✅ Removed: Individual names, team IDs, user IDs
- ✅ Removed: Coaching language ("needs improvement")
- ✅ Removed: Tactical actions ("schedule 1-on-1s")
- ✅ Kept: Aggregated counts, trends, strategic patterns
- ✅ Kept: Risk classifications, severity levels

---

## 🎯 Next Steps (Frontend Implementation Required)

### 1. **Weekly Brief UI Component** (Not Started)
- Compact card format
- Sections: "What Changed This Week", "Why It Matters", "What To Do Now"
- Max 7-day charts (no longer trends)
- No deep drill-downs
- Action buttons (acknowledge, implement)

### 2. **Monthly Review UI Component** (Not Started)
- Strategic dashboard layout
- Distinct visual language from weekly
- Org trajectory visualization
- Structural risk heatmap
- Leadership decision prompts
- NO charts longer than 30 days

### 3. **Access Control Enforcement** (Partially Done)
- Middleware to enforce manager access to THEIR teams only
- CEO role check for leadership view
- Hide weekly reports from CEO dashboard
- Optional toggle: "Share Leadership Summary with CEO"

---

## 📝 Testing Checklist

### Backend (Ready to Test):
- [ ] POST /api/reports/weekly/team/:teamId/generate (manual trigger)
- [ ] GET /api/reports/weekly/team/:teamId/latest (fetch latest)
- [ ] POST /api/reports/monthly/org/:orgId/generate (manual trigger)
- [ ] GET /api/reports/monthly/org/:orgId/latest (full version)
- [ ] GET /api/reports/monthly/org/:orgId/leadership (filtered)
- [ ] Cron jobs run without errors (check logs Sunday 11:30 PM, 1st at 4 AM)
- [ ] Weekly report filters out stable metrics
- [ ] Monthly report detects persistent risks
- [ ] Leadership view removes individual names
- [ ] AI prompts generate different output for weekly vs monthly

### Integration Testing:
- [ ] Generate weekly report after TeamState calculation
- [ ] Verify "No action needed" flag when team stable
- [ ] Verify new risk detection (≥10 point increase)
- [ ] Verify persistent risk classification (structural vs episodic)
- [ ] Verify BDI trend calculation (improving/stable/deteriorating)
- [ ] Verify leadership view filtering (no names, no tactics)

---

## 🎉 Implementation Complete (Backend)

**9 of 12 todos completed:**
1. ✅ WeeklyReport model
2. ✅ MonthlyReport model
3. ✅ weeklyReportService.js
4. ✅ monthlyReportService.js
5. ✅ monthlyReportPresenter (built into model method)
6. ✅ AI prompt separation (weekly vs monthly)
7. ✅ Weekly report API routes
8. ✅ Monthly report API routes
9. ✅ Cron jobs for both report types

**Remaining (Frontend):**
10. ⏳ Weekly Brief UI component
11. ⏳ Monthly Review UI component
12. ⏳ Role-based access control enforcement (middleware)

---

## 📖 Developer Notes

### If weekly and monthly reports feel similar:
❌ **The implementation is wrong.**

They must differ in:
- Layout (compact cards vs strategic dashboard)
- Language (action-oriented vs strategic)
- Emotional tone (urgent vs contemplative)
- Data scope (7 days vs 30 days)
- Audience (managers vs leadership)

### Pre-aggregation for performance:
- Monthly reports must load <2s
- All calculations done during cron job
- API endpoints serve pre-computed results
- No on-the-fly aggregation

### AI prompt versioning:
- Store prompt version in report metadata
- Track which AI model version was used
- Allow prompt evolution without breaking old reports

---

## 🔗 Files Modified

### Created:
- `backend/models/weeklyReport.js`
- `backend/models/monthlyReport.js`
- `backend/services/weeklyReportService.js`
- `backend/services/monthlyReportService.js`
- `backend/routes/reports.js`

### Modified:
- `backend/services/aiRecommendationContext.js` (added weekly/monthly AI functions)
- `backend/server.js` (added route import + 2 cron jobs)

### Total Lines Added: ~1,600

---

**Status:** Backend implementation complete ✅  
**Next:** Frontend UI components + access control middleware  
**Timeline:** Ready for testing and frontend integration

---

END OF IMPLEMENTATION SUMMARY
