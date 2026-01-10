# Dual Reporting API - Frontend Integration Guide

## Quick Reference for Frontend Developers

---

## 📍 Base URL
```
http://localhost:8080/api/reports
```

---

## 🔐 Authentication
All endpoints require:
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

---

## 📊 Weekly Reports (Tactical)

### Get Latest Weekly Report for Team
```http
GET /api/reports/weekly/team/:teamId/latest
```

**Who can access:** HR/Admin, Manager (if their team)

**Response:**
```json
{
  "_id": "...",
  "teamId": "...",
  "periodStart": "2026-01-03T00:00:00.000Z",
  "periodEnd": "2026-01-10T00:00:00.000Z",
  "bdiCurrent": 58,
  "bdiDelta": 12,
  "zone": "Stretched",
  "zoneChanged": true,
  "previousZone": "Stable",
  "newRisks": [
    {
      "type": "overload",
      "score": 72,
      "delta": 15,
      "previousScore": 57,
      "isNew": false
    }
  ],
  "activeCrises": [
    {
      "crisisId": "...",
      "type": "sudden_sentiment_collapse",
      "severity": "critical",
      "status": "active",
      "detectedAt": "2026-01-09T14:30:00.000Z"
    }
  ],
  "topDrivers": [
    {
      "metric": "after_hours_activity",
      "deviation": 0.68,
      "impact": "high"
    }
  ],
  "recommendations": [
    {
      "actionId": "...",
      "title": "Reduce meeting load by 30%",
      "priority": "critical",
      "category": "overload",
      "expectedImpact": "Recover 6 hours/week per person"
    }
  ],
  "noActionNeeded": false,
  "createdAt": "2026-01-10T23:30:00.000Z"
}
```

**Helper methods:**
```javascript
// Check if team is improving
const isImproving = report.bdiDelta < 0 && report.newRisks.length === 0;

// Get severity
const severity = (() => {
  if (report.zone === 'Critical') return 'critical';
  if (report.newRisks.length >= 2 || report.bdiDelta >= 15) return 'high';
  if (report.newRisks.length === 1 || report.bdiDelta >= 5) return 'medium';
  return 'low';
})();
```

---

### Get Weekly Report History
```http
GET /api/reports/weekly/team/:teamId/history?limit=12
```

**Response:**
```json
{
  "teamId": "...",
  "count": 12,
  "reports": [
    {
      "periodStart": "2026-01-03T00:00:00.000Z",
      "periodEnd": "2026-01-10T00:00:00.000Z",
      "bdiCurrent": 58,
      "bdiDelta": 12,
      "zone": "Stretched",
      "zoneChanged": true,
      "newRisks": [...],
      "activeCrises": [...]
    }
  ]
}
```

**Use case:** Trend chart (max 7-day windows)

---

### Manually Generate Weekly Report
```http
POST /api/reports/weekly/team/:teamId/generate
```

**Who can access:** HR/Admin only

**Response:**
```json
{
  "message": "Weekly report generated successfully",
  "report": { ... }
}
```

---

## 📈 Monthly Reports (Strategic)

### Get Latest Monthly Report (Full)
```http
GET /api/reports/monthly/org/:orgId/latest
```

**Who can access:** HR/Admin only

**Response:**
```json
{
  "_id": "...",
  "orgId": "...",
  "periodStart": "2025-12-10T00:00:00.000Z",
  "periodEnd": "2026-01-10T00:00:00.000Z",
  "orgHealth": {
    "avgBDI": 52.3,
    "bdiTrend": "deteriorating",
    "trendStrength": "moderate",
    "zoneDistribution": {
      "stable": 3,
      "stretched": 5,
      "critical": 2,
      "recovery": 0
    },
    "teamsAtRisk": 7
  },
  "persistentRisks": [
    {
      "riskType": "overload",
      "weeksAboveThreshold": 4,
      "avgScore": 68,
      "affectedTeams": [
        {
          "teamId": "...",
          "teamName": "Engineering",
          "score": 72
        }
      ],
      "classification": "structural"
    }
  ],
  "leadershipSignals": {
    "managerEffectiveness": {
      "avgScore": 65,
      "managersCriticalCount": 2,
      "managersNeedCoachingCount": 5,
      "trend": "stable"
    },
    "equityScoreAvg": 73,
    "equityIssuesCount": 3,
    "successionCriticalCount": 4,
    "avgBusFactor": 2.1
  },
  "executionSignals": {
    "executionDragAvg": 58,
    "highRiskProjectsCount": 7,
    "meetingROILowPercent": 35,
    "decisionVelocity": "moderate",
    "networkSiloScore": 62
  },
  "retentionExposure": {
    "avgAttritionRisk": 48,
    "criticalIndividualsCount": 5,
    "highRiskIndividualsCount": 12,
    "trend": "worsening",
    "estimatedTurnoverRisk": 15
  },
  "topStructuralDrivers": [
    {
      "metric": "after_hours_activity",
      "avgDeviation": 0.72,
      "teamsAffected": 8,
      "severity": "critical"
    }
  ],
  "crisisPatterns": {
    "totalCrises": 12,
    "crisisByType": [
      { "type": "sudden_sentiment_collapse", "count": 5 },
      { "type": "message_volume_spike", "count": 7 }
    ],
    "teamsWithRecurringCrises": 3
  },
  "aiSummary": {
    "narrative": "The organization is experiencing deteriorating health...",
    "keyRisks": [
      {
        "risk": "Widespread overload across 8 teams",
        "impact": "Quality degradation, increased attrition",
        "costOfInaction": "Estimated 15% turnover if unaddressed"
      }
    ],
    "leadershipDecisionsRequired": [
      {
        "decision": "Resource allocation review",
        "rationale": "Persistent overload indicates structural understaffing",
        "urgency": "this-quarter"
      }
    ],
    "organizationalTrajectory": "concerning"
  },
  "generatedAt": "2026-01-01T04:00:00.000Z"
}
```

---

### Get Leadership View (Filtered for CEO)
```http
GET /api/reports/monthly/org/:orgId/leadership
```

**Who can access:** CEO, Leadership roles only

**Response:**
```json
{
  "reportType": "leadership_view",
  "disclaimer": "This view excludes individual-level details and tactical recommendations",
  "data": {
    "periodStart": "2025-12-10T00:00:00.000Z",
    "periodEnd": "2026-01-10T00:00:00.000Z",
    "orgHealth": { ... },
    "persistentRisks": [
      {
        "riskType": "overload",
        "weeksAboveThreshold": 4,
        "avgScore": 68,
        "teamsAffected": 8,
        "classification": "structural"
        // NOTE: No team names or IDs
      }
    ],
    "leadershipSignals": {
      "managerEffectiveness": {
        "avgScore": 65,
        "managersCriticalCount": 2,
        "trend": "stable"
        // NOTE: No individual manager names
      },
      // ... rest of signals
    },
    "retentionExposure": {
      "avgAttritionRisk": 48,
      "criticalIndividualsCount": 5,
      "trend": "worsening",
      "estimatedTurnoverRisk": 15
      // NOTE: No individual names
    },
    "aiSummary": { ... }
  }
}
```

**What's filtered out:**
- Individual names
- Team names/IDs
- Coaching language
- Tactical recommendations

---

### Get Monthly Report History
```http
GET /api/reports/monthly/org/:orgId/history?limit=12
```

**Response:**
```json
{
  "orgId": "...",
  "count": 12,
  "reports": [
    {
      "periodStart": "2025-12-10T00:00:00.000Z",
      "periodEnd": "2026-01-10T00:00:00.000Z",
      "orgHealth": { ... },
      "retentionExposure": { ... },
      "executionSignals": { ... },
      "aiSummary": {
        "organizationalTrajectory": "concerning"
      }
    }
  ]
}
```

---

### Manually Generate Monthly Report
```http
POST /api/reports/monthly/org/:orgId/generate
```

**Who can access:** HR/Admin only

**Response:**
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

---

## 🎨 Frontend Component Guidance

### Weekly Brief Component (Compact)
```jsx
// Example structure
<WeeklyBriefCard>
  <Section title="What Changed This Week">
    {report.noActionNeeded ? (
      <StatusGood>All metrics stable or improving</StatusGood>
    ) : (
      <>
        <BDIChange delta={report.bdiDelta} zone={report.zone} />
        <NewRisksList risks={report.newRisks} />
        {report.activeCrises.length > 0 && (
          <CrisisAlert crises={report.activeCrises} />
        )}
      </>
    )}
  </Section>
  
  <Section title="Why It Matters">
    <DriversList drivers={report.topDrivers} />
  </Section>
  
  <Section title="What To Do Now">
    <RecommendationsList items={report.recommendations} />
  </Section>
</WeeklyBriefCard>
```

**Visual rules:**
- Max 7-day trend charts
- No drill-downs
- Action buttons (Acknowledge, Implement)
- Color coding: Red (critical), Yellow (high), Blue (medium), Green (low)

---

### Monthly Review Component (Strategic)
```jsx
// Example structure
<MonthlyReviewDashboard>
  <Header>
    <OrgTrajectory trajectory={report.aiSummary.organizationalTrajectory} />
    <BDITrend trend={report.orgHealth.bdiTrend} />
  </Header>
  
  <Grid>
    <HealthOverview data={report.orgHealth} />
    <PersistentRisksHeatmap risks={report.persistentRisks} />
    <LeadershipSignalsCard signals={report.leadershipSignals} />
    <RetentionExposureCard data={report.retentionExposure} />
    <ExecutionHealthCard signals={report.executionSignals} />
    <CrisisPatternsCard patterns={report.crisisPatterns} />
  </Grid>
  
  <AINarrative>
    <StrategicSummary text={report.aiSummary.narrative} />
    <KeyRisksList risks={report.aiSummary.keyRisks} />
    <LeadershipDecisions decisions={report.aiSummary.leadershipDecisionsRequired} />
  </AINarrative>
</MonthlyReviewDashboard>
```

**Visual rules:**
- Different color palette than weekly
- Max 30-day charts
- Strategic language (no "schedule 1-on-1s")
- No individual names in leadership view

---

## 🔄 Polling Strategy

### Weekly Reports
```javascript
// Poll on Sundays after 11:30 PM
if (isSunday && currentHour >= 23) {
  pollInterval = 5 * 60 * 1000; // 5 minutes
} else {
  pollInterval = 60 * 60 * 1000; // 1 hour (no new data expected)
}
```

### Monthly Reports
```javascript
// Poll on 1st of month after 4:00 AM
if (isFirstOfMonth && currentHour >= 4) {
  pollInterval = 10 * 60 * 1000; // 10 minutes
} else {
  pollInterval = 24 * 60 * 60 * 1000; // Daily check
}
```

---

## 🚨 Error Handling

### Common Errors
```javascript
// 404: No report available yet
if (error.status === 404) {
  return <EmptyState message="Report will be generated Sunday at 11:30 PM" />;
}

// 403: Insufficient permissions
if (error.status === 403) {
  return <AccessDenied message="Contact your HR admin for access" />;
}

// 500: Server error
if (error.status === 500) {
  return <ErrorState message="Report generation failed. Contact support." />;
}
```

---

## 📝 State Management Example

```javascript
// Weekly report state
const [weeklyReport, setWeeklyReport] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchWeeklyReport = async () => {
    try {
      const response = await fetch(
        `/api/reports/weekly/team/${teamId}/latest`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          setWeeklyReport(null); // No report yet
          return;
        }
        throw new Error('Failed to fetch weekly report');
      }
      
      const data = await response.json();
      setWeeklyReport(data);
    } catch (error) {
      console.error('Error fetching weekly report:', error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchWeeklyReport();
}, [teamId, token]);
```

---

## 🎯 Testing Endpoints

### Quick Test (Backend Running)
```bash
# Get latest weekly report (replace :teamId)
curl -X GET http://localhost:8080/api/reports/weekly/team/YOUR_TEAM_ID/latest \
  -H "Authorization: Bearer YOUR_TOKEN"

# Manually generate weekly report (HR/Admin only)
curl -X POST http://localhost:8080/api/reports/weekly/team/YOUR_TEAM_ID/generate \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get leadership view (CEO only)
curl -X GET http://localhost:8080/api/reports/monthly/org/YOUR_ORG_ID/leadership \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📚 Related Documentation
- [Main Implementation Summary](./DUAL_REPORTING_IMPLEMENTATION.md)
- [Complete Features Guide](./SIGNALTRUE_COMPLETE_FEATURES_GUIDE.md)
- [Backend API Docs](./backend/README.md)

---

**Questions?** Check backend logs or contact backend team.

END OF FRONTEND INTEGRATION GUIDE
