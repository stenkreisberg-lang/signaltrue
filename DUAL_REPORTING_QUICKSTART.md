# Dual Reporting Cadence - Quick Start & Testing Guide

## 🚀 Quick Start

### Prerequisites
1. Backend server running: `cd backend && node server.js`
2. MongoDB connected
3. At least one organization and team created
4. TeamState data available (run weekly diagnosis first)

---

## 🧪 Manual Testing Steps

### Step 1: Generate a Weekly Report

```bash
# Option A: Via cron job (automatic)
# Wait until Sunday 11:30 PM, check logs for:
# "⏰ Generating weekly reports for all organizations..."

# Option B: Manual trigger (testing only)
curl -X POST http://localhost:8080/api/reports/weekly/team/YOUR_TEAM_ID/generate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "message": "Weekly report generated successfully",
  "report": {
    "bdiCurrent": 58,
    "bdiDelta": 12,
    "zone": "Stretched",
    "zoneChanged": true,
    "newRisks": [...],
    "recommendations": [...]
  }
}
```

**Check:**
- ✅ Only risks with ≥10 point increase are included
- ✅ `noActionNeeded` = true if team is stable
- ✅ Max 3 recommendations
- ✅ Zone change detected if applicable

---

### Step 2: Fetch Latest Weekly Report

```bash
curl -X GET http://localhost:8080/api/reports/weekly/team/YOUR_TEAM_ID/latest \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Check:**
- ✅ Returns most recent report
- ✅ HR/Admin can access
- ✅ Manager can access (if their team)
- ❌ CEO should NOT see this endpoint

---

### Step 3: Generate a Monthly Report

```bash
# Option A: Via cron job (automatic)
# Wait until 1st of month at 4:00 AM, check logs for:
# "⏰ Generating monthly reports for all organizations..."

# Option B: Manual trigger (testing only)
curl -X POST http://localhost:8080/api/reports/monthly/org/YOUR_ORG_ID/generate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "message": "Monthly report generated successfully",
  "summary": {
    "avgBDI": 52.3,
    "trend": "deteriorating",
    "teamsAtRisk": 7,
    "persistentRisks": 3,
    "criticalAttritionRisk": 5,
    "trajectory": "concerning"
  },
  "report": { ... }
}
```

**Check:**
- ✅ Aggregates 30 days of data
- ✅ Identifies persistent risks (≥3 weeks)
- ✅ Classifies risks as structural/episodic
- ✅ AI summary is strategic (NO tactical recommendations)

---

### Step 4: Fetch Leadership View (CEO Access)

```bash
curl -X GET http://localhost:8080/api/reports/monthly/org/YOUR_ORG_ID/leadership \
  -H "Authorization: Bearer YOUR_CEO_TOKEN"
```

**Expected Response:**
```json
{
  "reportType": "leadership_view",
  "disclaimer": "This view excludes individual-level details and tactical recommendations",
  "data": {
    "orgHealth": { ... },
    "persistentRisks": [
      {
        "riskType": "overload",
        "teamsAffected": 8,
        "classification": "structural"
        // NO team names or IDs
      }
    ]
  }
}
```

**Check:**
- ✅ No individual names in response
- ✅ No team names/IDs
- ✅ Only aggregated counts and trends
- ✅ Strategic narrative only

---

## 🔍 Validation Checklist

### Weekly Reports
- [ ] **Data Scope:** Only includes last 7 days vs baseline
- [ ] **Filtering:** Excludes stable metrics (only new/worsening)
- [ ] **Risk Threshold:** Only includes risks with ≥10 point increase
- [ ] **Recommendations:** Max 3, tactical and actionable
- [ ] **No Action Flag:** Set to true when team stable
- [ ] **Zone Change:** Detected when zone shifts
- [ ] **Crises:** Only shows crises from last 7 days

### Monthly Reports
- [ ] **Data Scope:** Aggregates 30 days, not 7
- [ ] **Persistent Risks:** Flags risks elevated ≥3 weeks
- [ ] **Risk Classification:** Labels as structural (≥70% of period) or episodic
- [ ] **BDI Trend:** Calculates improving/stable/deteriorating
- [ ] **Leadership Signals:** Aggregates manager, equity, succession data
- [ ] **AI Summary:** Strategic narrative with NO tactical recommendations
- [ ] **Leadership View:** Filters out individual names and tactical language

### Role-Based Access
- [ ] **HR/Admin:** Can access both weekly and monthly (full)
- [ ] **Manager:** Can access weekly for THEIR teams only
- [ ] **CEO/Leadership:** Can access monthly leadership view ONLY
- [ ] **Employee:** Cannot access either report type

### Cron Jobs
- [ ] **Weekly:** Runs Sunday 11:30 PM (after TeamState)
- [ ] **Monthly:** Runs 1st of month 4:00 AM
- [ ] **Errors:** Don't crash cron, logged to console
- [ ] **Logs:** Show summary of success/failure per org

---

## 📊 Sample Test Scenarios

### Scenario 1: Stable Team (No Action Needed)
**Setup:**
- BDI: 30 → 28 (improving)
- No risks above Yellow threshold
- No crises

**Expected Weekly Report:**
```json
{
  "noActionNeeded": true,
  "noActionReason": "Team remains stable with improving or steady health metrics",
  "recommendations": [
    {
      "title": "No action required",
      "description": "Team metrics are stable or improving. Continue monitoring.",
      "category": "monitoring",
      "priority": "low"
    }
  ]
}
```

---

### Scenario 2: New Risk Detected
**Setup:**
- BDI: 42 → 58 (worsening)
- Overload risk: 32 → 68 (new Yellow → Red)
- Zone: Stable → Stretched

**Expected Weekly Report:**
```json
{
  "bdiDelta": 16,
  "zoneChanged": true,
  "newRisks": [
    {
      "type": "overload",
      "score": 68,
      "delta": 36,
      "isNew": true
    }
  ],
  "recommendations": [
    {
      "title": "Reduce meeting load by 30%",
      "priority": "critical",
      "category": "overload"
    }
  ]
}
```

---

### Scenario 3: Persistent Structural Risk
**Setup:**
- Overload risk ≥35 for 4 consecutive weeks
- 8 of 10 teams affected

**Expected Monthly Report:**
```json
{
  "persistentRisks": [
    {
      "riskType": "overload",
      "weeksAboveThreshold": 4,
      "avgScore": 68,
      "classification": "structural",
      "affectedTeams": 8
    }
  ],
  "aiSummary": {
    "narrative": "The organization is experiencing structural overload...",
    "leadershipDecisionsRequired": [
      {
        "decision": "Resource allocation review",
        "rationale": "Persistent overload indicates understaffing",
        "urgency": "this-quarter"
      }
    ]
  }
}
```

---

## 🐛 Debugging Tips

### If weekly report shows stable metrics:
```javascript
// Check filtering logic in weeklyReportService.js
function identifyNewOrWorseningRisks(currentState, previousState) {
  // Should only include risks where:
  // 1. delta >= 10 points, OR
  // 2. Crossed Yellow (35) or Red (65) threshold
}
```

### If monthly report has tactical recommendations:
```javascript
// Check AI prompt in aiRecommendationContext.js
export async function generateMonthlyNarrative(monthlyData) {
  // Prompt MUST include:
  // "NO tactical recommendations (no 'schedule 1-on-1s', 'cancel meetings', etc.)"
}
```

### If leadership view shows individual names:
```javascript
// Check getLeadershipView() in monthlyReport.js model
monthlyReportSchema.methods.getLeadershipView = function() {
  // Should filter out:
  // - Individual names
  // - Team names/IDs
  // - Coaching language
}
```

### If cron jobs not running:
```bash
# Check server logs for:
grep "⏰ Cron job scheduled" server.log

# Should see:
# ⏰ Cron job scheduled: Weekly reports generation Sunday at 11:30 PM
# ⏰ Cron job scheduled: Monthly reports generation 1st of month at 4:00 AM
```

---

## 📝 Manual Verification Steps

### 1. Check Database Records
```javascript
// In MongoDB shell or Compass
db.weeklyreports.find().sort({ createdAt: -1 }).limit(1);
db.monthlyreports.find().sort({ createdAt: -1 }).limit(1);

// Verify:
// - Weekly: periodStart = 7 days before periodEnd
// - Monthly: periodStart = 30 days before periodEnd
// - Both: createdAt is recent
```

### 2. Verify Risk Filtering
```javascript
// Weekly report should ONLY have newRisks where:
report.newRisks.forEach(risk => {
  console.assert(
    risk.delta >= 10 || risk.isNew,
    'Risk should have ≥10 point increase or be new'
  );
});
```

### 3. Verify AI Output Separation
```javascript
// Weekly recommendations should be tactical
weeklyReport.recommendations.forEach(rec => {
  console.assert(
    rec.title.includes('Reduce') || rec.title.includes('Schedule') || rec.title.includes('Cancel'),
    'Weekly recommendations should be action-oriented'
  );
});

// Monthly narrative should be strategic
console.assert(
  !monthlyReport.aiSummary.narrative.includes('Schedule 1-on-1'),
  'Monthly narrative should NOT have tactical language'
);
```

---

## 🎯 Success Criteria

### Backend Implementation Complete When:
- [x] Weekly and monthly models created
- [x] Services generate reports with correct data scope
- [x] API routes enforce role-based access
- [x] Cron jobs scheduled and running
- [x] AI prompts generate different output for weekly vs monthly
- [x] Leadership view filters out individual data
- [x] No syntax errors in code
- [x] Reports stored in MongoDB

### Ready for Frontend When:
- [ ] All endpoints tested and working
- [ ] Sample data generated for UI testing
- [ ] Role-based access verified
- [ ] Cron jobs confirmed running on schedule
- [ ] Documentation reviewed by frontend team

---

## 📞 Support

### Common Issues

**"No TeamState found for team"**
- Run weekly diagnosis first: `scheduleWeeklyJob()` or wait until Sunday 11 PM

**"Could not generate monthly report - insufficient data"**
- Need at least 2 weeks of TeamState data for trend calculation

**"403 Forbidden"**
- Check user role (HR/Admin for full access, CEO for leadership view)

**"Cron job not running"**
- Check `NODE_ENV !== 'test'` in server.js
- Verify cron syntax: `30 23 * * 0` = Sunday 11:30 PM

---

## 🎉 You're Ready!

The backend implementation is complete and ready for:
1. Manual testing (use curl commands above)
2. Frontend integration (see API guide)
3. Production deployment (after testing)

**Next Steps:**
- Test all endpoints
- Generate sample reports
- Hand off to frontend team
- Document any issues found

---

END OF QUICK START GUIDE
