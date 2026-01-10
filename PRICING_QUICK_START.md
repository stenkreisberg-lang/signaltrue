# 🚀 Quick Start: Pricing & Access Control

## Step 1: Initialize Subscription Plans

Run the seed script to create the three pricing tiers in your database:

```bash
cd backend
node scripts/seedSubscriptionPlans.js
```

Expected output:
```
✅ Successfully seeded subscription plans:

Team Intelligence (team)
  Price: €99
  Features:
    weeklyReports: ✓
    monthlyReportsHR: ✓
    monthlyReportsLeadership: ✗
    ...

Leadership Intelligence (leadership)
  Price: €199
  Features:
    weeklyReports: ✓
    monthlyReportsHR: ✓
    monthlyReportsLeadership: ✓
    ...

Organizational Intelligence (custom)
  Price: Custom
  Features:
    (all enabled)
```

## Step 2: Assign Plans to Organizations

Update existing organizations to have a plan:

```javascript
// In MongoDB shell or migration script
db.organizations.updateMany(
  { subscriptionPlanId: { $exists: false } },
  { $set: { 
    subscriptionPlanId: 'team', // or 'leadership', 'custom'
    customFeatures: {
      enableBoardReports: false,
      enableCustomThresholds: false,
      enableCustomAiPrompts: false,
      enableQuarterlyReviews: false
    },
    subscriptionHistory: []
  }}
);
```

Or via API (requires admin):

```bash
curl -X PUT \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"subscriptionPlanId": "team"}' \
  http://localhost:8080/api/organizations/<org-id>
```

## Step 3: Test Access Control

### Test 1: Check Current Subscription

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/subscriptions/current
```

Expected response:
```json
{
  "current": {
    "planId": "team",
    "plan": {
      "planId": "team",
      "name": "Team Intelligence",
      "priceEUR": 99,
      "features": { ... }
    },
    "customFeatures": { ... },
    "subscriptionHistory": []
  },
  "access": {
    "features": [
      "weeklyReports",
      "monthlyReportsHR",
      "aiTactical"
    ],
    "role": "HR_ADMIN"
  }
}
```

### Test 2: Try Accessing Gated Feature (Should Fail)

```bash
# As HR_ADMIN on Team plan, try to access leadership reports
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/reports/monthly/leadership
```

Expected response:
```json
{
  "error": "Forbidden",
  "message": "Feature monthlyReportsLeadership not available in Team Intelligence plan",
  "reportType": "monthly_leadership"
}
```

### Test 3: Upgrade Plan

```bash
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"targetPlanId": "leadership"}' \
  http://localhost:8080/api/subscriptions/upgrade
```

Expected response:
```json
{
  "success": true,
  "upgrade": {
    "from": "team",
    "to": "leadership",
    "featuresGained": [
      "monthlyReportsLeadership",
      "aiStrategic",
      "industryBenchmarks",
      "orgComparisons"
    ],
    "featuresLost": []
  },
  "backfill": {
    "status": "queued",
    "months": 3,
    "message": "Backfilling 3 months of leadership reports"
  }
}
```

### Test 4: Access Previously Blocked Feature (Should Succeed)

```bash
# Now as CEO on Leadership plan, access industry benchmarks
curl -H "Authorization: Bearer <ceo-token>" \
  http://localhost:8080/api/benchmarks/industry/bdi
```

## Step 4: Integrate Frontend

### 4A: Wrap App with SubscriptionProvider

Edit `src/App.js` or `src/index.js`:

```jsx
import React from 'react';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <SubscriptionProvider>
      <Dashboard />
    </SubscriptionProvider>
  );
}

export default App;
```

### 4B: Use FeatureGate in Components

Example - Protect Industry Benchmarks:

```jsx
// src/components/Benchmarks.js
import React from 'react';
import { FeatureGate } from './FeatureGate';

function Benchmarks() {
  return (
    <div>
      <h1>Performance Insights</h1>
      
      {/* Internal org comparisons - available to all */}
      <section>
        <h2>Team Comparisons</h2>
        <TeamBenchmarks />
      </section>

      {/* Industry benchmarks - Leadership plan only */}
      <FeatureGate 
        feature="industryBenchmarks" 
        showUpgrade={true}
      >
        <section>
          <h2>Industry Benchmarks</h2>
          <IndustryComparison />
        </section>
      </FeatureGate>
    </div>
  );
}

export default Benchmarks;
```

### 4C: Show Plan-Based Navigation

```jsx
// src/components/Navigation.js
import React from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';

function Navigation() {
  const { hasFeature, getPlanName } = useSubscription();

  return (
    <nav>
      <div className="plan-badge">{getPlanName()}</div>
      
      <ul>
        <li><a href="/dashboard">Dashboard</a></li>
        
        {hasFeature('weeklyReports') && (
          <li><a href="/reports/weekly">Weekly Reports</a></li>
        )}
        
        {hasFeature('monthlyReportsHR') && (
          <li><a href="/reports/monthly-hr">Monthly HR Reports</a></li>
        )}
        
        {hasFeature('monthlyReportsLeadership') && (
          <li><a href="/reports/monthly-leadership">Leadership Reports</a></li>
        )}
        
        {hasFeature('industryBenchmarks') && (
          <li><a href="/benchmarks">Industry Benchmarks</a></li>
        )}
        
        <li><a href="/settings/subscription">Upgrade Plan</a></li>
      </ul>
    </nav>
  );
}

export default Navigation;
```

## Step 5: Protect Existing Report Endpoints

If you have existing report routes, add the middleware:

```javascript
// backend/routes/reports.js
import { checkReportAccess } from '../middleware/checkFeatureAccess.js';

// Weekly reports - Team plan and above, HR/Manager only
router.get('/weekly/:teamId', 
  checkReportAccess('weekly'), 
  async (req, res) => {
    // Your existing weekly report logic
  }
);

// Monthly HR reports - Team plan and above, HR_ADMIN only
router.get('/monthly/hr', 
  checkReportAccess('monthly_hr'), 
  async (req, res) => {
    // Your existing monthly HR report logic
  }
);

// Monthly leadership reports - Leadership plan and above, CEO/Board only
router.get('/monthly/leadership', 
  checkReportAccess('monthly_leadership'), 
  async (req, res) => {
    // NEW: Use monthlyLeadershipReportService
    const report = await monthlyLeadershipReportService.generateReport(
      req.organization,
      new Date(),
      {}
    );
    res.json(report);
  }
);
```

## Step 6: Seed Sample Benchmark Data (Optional)

For testing industry benchmarks:

```javascript
// backend/scripts/seedBenchmarks.js
import IndustryBenchmark from '../models/IndustryBenchmark.js';

const sampleBenchmarks = [
  {
    industry: 'Technology',
    companySizeBand: '51-200',
    metric: 'bdi',
    p25: 55,
    p50: 72,
    p75: 85,
    sampleSize: 150
  },
  {
    industry: 'Technology',
    companySizeBand: '51-200',
    metric: 'meetingLoad',
    p25: 25,
    p50: 35,
    p75: 45,
    sampleSize: 150
  }
];

await IndustryBenchmark.insertMany(sampleBenchmarks);
```

## Step 7: Test Full Flow

1. **Start backend**: `cd backend && node server.js`
2. **Login as HR_ADMIN** on Team plan (€99)
3. **Verify access**:
   - ✅ Can see weekly reports
   - ✅ Can see monthly HR reports
   - ❌ Cannot see monthly leadership reports
   - ❌ Cannot see industry benchmarks
4. **Upgrade to Leadership plan**:
   ```bash
   curl -X PUT -H "Authorization: Bearer <token>" \
     -d '{"targetPlanId": "leadership"}' \
     http://localhost:8080/api/subscriptions/upgrade
   ```
5. **Login as CEO** (same org, now Leadership plan)
6. **Verify new access**:
   - ✅ Can see monthly leadership reports
   - ✅ Can see industry benchmarks
   - ❌ Still cannot see weekly reports (wrong role)
   - ❌ Still cannot see monthly HR reports (wrong role)

## Validation Checklist

After integration, verify:

- [ ] Database has 3 subscription plans (team, leadership, custom)
- [ ] Organizations have `subscriptionPlanId` field
- [ ] API returns 403 for unauthorized feature access
- [ ] Frontend hides locked features completely (no greyed-out content)
- [ ] Role + subscription both checked for access
- [ ] Upgrade/downgrade flows work
- [ ] Leadership reports use strategic AI (60-120 day horizon)
- [ ] Weekly reports use tactical AI (7-14 day horizon, max 3 actions)
- [ ] Industry benchmarks only accessible to Leadership plan + CEO/Board roles

## Troubleshooting

### "Subscription plan not found"
- Run seed script: `node backend/scripts/seedSubscriptionPlans.js`

### "Organization context required"
- Ensure your auth middleware sets `req.organization`
- Check that user's organization has `subscriptionPlanId` set

### "Feature access denied" but user should have access
- Check both plan features AND role access matrix
- Verify `ACCESS_MATRIX` in `subscriptionConstants.js`

### Frontend shows locked feature
- Ensure `SubscriptionProvider` wraps your app
- Check that `<FeatureGate>` is used correctly
- Verify API call to `/api/subscriptions/current` succeeds

## Next Steps

1. **Create pricing page**: Show plan comparison in UI
2. **Add payment integration**: Connect to Stripe for upgrades
3. **Implement backfill logic**: Generate historical leadership reports on upgrade
4. **Create admin panel**: Manage org subscriptions
5. **Add usage analytics**: Track feature usage by plan
6. **Implement custom features**: Allow enterprise orgs to enable/disable custom flags

## Documentation

- Full implementation: `PRICING_IMPLEMENTATION.md`
- Access control service: `backend/services/accessControlService.js`
- Subscription constants: `backend/utils/subscriptionConstants.js`
- Frontend integration: `src/contexts/SubscriptionContext.js`

---

**Remember**: SignalTrue pricing is a POWER BOUNDARY, not a feature toggle. Access is blocked at API level, not just UI.
