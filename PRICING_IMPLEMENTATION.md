# SignalTrue Pricing & Access Control Implementation

## ✅ Implementation Complete

This document describes the power-based pricing model with strict feature, access, and narrative separation across plans.

---

## 📊 Pricing Tiers

| Plan | Price | Target Audience | Key Features |
|------|-------|----------------|--------------|
| **Team Intelligence** | €99 | HR Admins, Managers | Weekly reports, Monthly HR reports, Tactical AI |
| **Leadership Intelligence** | €199 | CEOs, Executives | All Team features + Leadership reports, Strategic AI, Industry benchmarks |
| **Organizational Intelligence** | Custom | Board, Enterprise | All Leadership features + Custom models, Board reports, Custom thresholds |

---

## 🏗️ Architecture Overview

### Backend Components

#### 1. Models

**`backend/models/SubscriptionPlan.js`**
- Defines the three pricing tiers (team, leadership, custom)
- Feature flags for each plan
- Methods: `hasFeature()`, `getByPlanId()`

**`backend/models/IndustryBenchmark.js`**
- Stores industry comparison data (Leadership plan and above)
- Percentile-based benchmarks (p25, p50, p75)
- Methods: `getBenchmark()`, `getPercentilePosition()`, `generateNarrative()`

**`backend/models/organizationModel.js`** (extended)
- Added `subscriptionPlanId` field
- Added `customFeatures` for enterprise plans
- Added `subscriptionHistory` for audit trail

#### 2. Services

**`backend/services/accessControlService.js`**
- **CRITICAL**: Enforces strict RBAC at API level
- Key methods:
  - `canAccessFeature(user, org, feature)` - Check feature access
  - `canAccessReport(user, org, reportType)` - Check report access
  - `canUseAiMode(user, org, aiMode)` - Check AI mode access
  - `canAccessBenchmarks(user, org)` - Check benchmark access
  - `getAccessibleFeatures(user, org)` - Get all accessible features
  - `canUpgrade(currentPlan, targetPlan)` - Validate upgrades
  - `canDowngrade(currentPlan, targetPlan)` - Validate downgrades

**`backend/services/monthlyLeadershipReportService.js`**
- Generates CEO/Board-focused monthly reports
- Uses strategic AI prompt (60-120 day horizon)
- Enforces strict separation from HR reports
- Validates no individual names or tactical recommendations

#### 3. Middleware

**`backend/middleware/checkFeatureAccess.js`**
- Blocks API requests BEFORE controllers
- Middleware functions:
  - `checkFeatureAccess(feature)` - Generic feature check
  - `checkReportAccess(reportType)` - Report-specific check
  - `checkAiAccess(aiMode)` - AI mode check
  - `checkBenchmarkAccess` - Benchmark check
  - `attachAccessibleFeatures` - Attach features to request

#### 4. Routes

**`backend/routes/subscriptions.js`**
- `GET /api/subscriptions/plans` - List all plans
- `GET /api/subscriptions/current` - Get current org subscription
- `PUT /api/subscriptions/upgrade` - Upgrade plan
- `PUT /api/subscriptions/downgrade` - Downgrade plan
- `PUT /api/subscriptions/custom-features` - Update custom features (enterprise)
- `GET /api/subscriptions/feature-comparison` - Compare plans

**`backend/routes/benchmarks.js`** (extended)
- **Legacy routes** (kept for backward compatibility):
  - `GET /api/benchmarks/team/:teamId` - Internal team comparisons
  - `GET /api/benchmarks/org/:orgId` - Internal org comparisons
- **New industry benchmark routes** (Leadership €199+):
  - `GET /api/benchmarks/industry/:metric` - Get industry benchmark
  - `POST /api/benchmarks/industry/compare` - Compare org to industry
  - `GET /api/benchmarks/industry/available` - List available benchmarks

#### 5. Constants & Configuration

**`backend/utils/subscriptionConstants.js`**
- Plan definitions with feature matrices
- Strict role-based access matrix
- AI mode configurations (tactical vs strategic)
- Custom plan flags

#### 6. AI Prompts

**`backend/prompts/weeklyAiPrompt_v1.json`**
- Tactical AI for €99 Team Intelligence plan
- Restrictions:
  - 7-14 day horizon
  - Max 3 recommendations
  - Action-oriented tone
  - NO leadership framing, industry comparisons, or strategic language

**`backend/prompts/monthlyStrategicAiPrompt_v1.json`**
- Strategic AI for €199+ Leadership Intelligence plan
- Restrictions:
  - 60-120 day horizon
  - Decision prompts (not action items)
  - Organizational-level synthesis
  - NO individual names, tactical recommendations, or HR language

### Frontend Components

#### 1. Context

**`src/contexts/SubscriptionContext.js`**
- Provides subscription state throughout app
- Methods:
  - `hasFeature(feature)` - Check if user has access
  - `planHasFeature(feature)` - Check if plan includes feature
  - `getPlanName()` - Get current plan name
  - `upgrade(targetPlanId)` - Upgrade subscription
  - `downgrade(targetPlanId)` - Downgrade subscription
  - `getUpgradeSuggestion(feature)` - Get upgrade message

#### 2. Components

**`src/components/FeatureGate.js`**
- `<FeatureGate>` - Conditionally render by feature
- `<PlanGate>` - Conditionally render by plan tier
- `<RoleGate>` - Conditionally render by user role
- `<UpgradePrompt>` - Show upgrade suggestion
- `<FeatureList>` - Display available/locked features

**CRITICAL**: Components block rendering entirely. No greyed-out sensitive data.

---

## 🔒 Access Control Matrix

| Feature | HR_ADMIN | MANAGER | CEO | BOARD |
|---------|----------|---------|-----|-------|
| Weekly Report | ✅ | ✅ | ❌ | ❌ |
| Monthly HR Report | ✅ | ❌ | ❌ | ❌ |
| Monthly Leadership Report | ❌ | ❌ | ✅ | ✅ |
| Tactical AI | ✅ | ✅ | ❌ | ❌ |
| Strategic AI | ❌ | ❌ | ✅ | ✅ |
| Industry Benchmarks | ❌ | ❌ | ✅ | ✅ |

**Note**: Access requires BOTH correct plan AND correct role.

---

## 🚀 Deployment Steps

### 1. Database Setup

Run the seed script to initialize subscription plans:

```bash
cd backend
node scripts/seedSubscriptionPlans.js
```

This creates the three pricing tiers in MongoDB.

### 2. Update Server Configuration

Ensure `backend/server.js` mounts the new routes:

```javascript
import subscriptionRoutes from './routes/subscriptions.js';
import benchmarkRoutes from './routes/benchmarks.js';

app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/benchmarks', benchmarkRoutes);
```

### 3. Frontend Integration

Wrap your app with `SubscriptionProvider`:

```jsx
// src/App.js or src/index.js
import { SubscriptionProvider } from './contexts/SubscriptionContext';

function App() {
  return (
    <SubscriptionProvider>
      {/* Your app components */}
    </SubscriptionProvider>
  );
}
```

### 4. Apply Feature Gates

Use `<FeatureGate>` to protect features:

```jsx
import { FeatureGate } from './components/FeatureGate';

function Dashboard() {
  return (
    <div>
      <FeatureGate feature="weeklyReports">
        <WeeklyReportSection />
      </FeatureGate>

      <FeatureGate feature="monthlyReportsLeadership" showUpgrade>
        <LeadershipReportSection />
      </FeatureGate>

      <FeatureGate feature="industryBenchmarks">
        <BenchmarkComparison />
      </FeatureGate>
    </div>
  );
}
```

### 5. Update Report Routes

Apply middleware to existing report endpoints:

```javascript
import { checkReportAccess, checkAiAccess } from '../middleware/checkFeatureAccess.js';

// Weekly reports (Team plan and above)
router.get('/weekly', checkReportAccess('weekly'), async (req, res) => {
  // Generate weekly report with tactical AI only
});

// Monthly HR reports (Team plan and above, HR_ADMIN only)
router.get('/monthly/hr', checkReportAccess('monthly_hr'), async (req, res) => {
  // Generate HR report
});

// Monthly leadership reports (Leadership plan and above, CEO/BOARD only)
router.get('/monthly/leadership', checkReportAccess('monthly_leadership'), async (req, res) => {
  // Generate leadership report
});
```

---

## 🧪 Testing

### Test Feature Access

```bash
# Test as HR_ADMIN on Team plan (€99)
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/subscriptions/current

# Should show:
# - weeklyReports: ✅
# - monthlyReportsHR: ✅
# - monthlyReportsLeadership: ❌
# - aiTactical: ✅
# - aiStrategic: ❌
# - industryBenchmarks: ❌
```

### Test Upgrade

```bash
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"targetPlanId": "leadership"}' \
  http://localhost:8080/api/subscriptions/upgrade
```

### Test Benchmark Access (Leadership plan required)

```bash
# Should fail on Team plan
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/benchmarks/industry/bdi

# Should succeed on Leadership plan as CEO
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/benchmarks/industry/bdi
```

---

## 🎯 Validation Checklist

Ensure the following are true:

### ❌ FAIL CONDITIONS (Implementation is incorrect if ANY of these are true):

- [ ] €99 users can infer leadership insights
- [ ] CEO can see tactical HR content
- [ ] AI sounds similar across tiers
- [ ] Individual names appear in leadership reports
- [ ] Strategic AI includes tactical recommendations
- [ ] Tactical AI includes strategic framing
- [ ] Benchmarks are accessible to non-leadership roles
- [ ] Greyed-out content reveals sensitive data in UI

### ✅ SUCCESS CONDITIONS (All must be true):

- [x] Plans are stored in database with correct feature flags
- [x] Access control enforced at API level (not just UI)
- [x] Middleware blocks unauthorized requests before controllers
- [x] Tactical AI limited to 7-14 days, max 3 actions
- [x] Strategic AI uses 60-120 day horizon, no individual names
- [x] Leadership reports separate from HR reports
- [x] Industry benchmarks gated to Leadership plan + CEO/BOARD roles
- [x] Frontend components block rendering (not grey out)
- [x] Upgrade/downgrade logic handles feature transitions
- [x] Subscription history tracked for audit

---

## 📝 Usage Examples

### Example 1: Protecting a Feature

```jsx
import { FeatureGate } from '../components/FeatureGate';

function IndustryBenchmarks() {
  return (
    <FeatureGate 
      feature="industryBenchmarks" 
      showUpgrade={true}
    >
      <div>
        <h2>Industry Benchmarks</h2>
        {/* Benchmark charts and data */}
      </div>
    </FeatureGate>
  );
}
```

### Example 2: Different Content by Plan

```jsx
import { PlanGate } from '../components/FeatureGate';

function MonthlyReports() {
  return (
    <div>
      <PlanGate requiredPlan="team">
        <HRMonthlyReport />
      </PlanGate>

      <PlanGate requiredPlan="leadership">
        <LeadershipMonthlyReport />
      </PlanGate>
    </div>
  );
}
```

### Example 3: Upgrade Flow

```jsx
import { useSubscription } from '../contexts/SubscriptionContext';
import { UpgradePrompt } from '../components/FeatureGate';

function SettingsPage() {
  const { getPlanName, canUpgradeTo, upgrade } = useSubscription();

  const handleUpgrade = async () => {
    try {
      await upgrade('leadership');
      alert('Successfully upgraded to Leadership Intelligence!');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div>
      <h2>Current Plan: {getPlanName()}</h2>
      
      {canUpgradeTo('leadership') && (
        <button onClick={handleUpgrade}>
          Upgrade to Leadership (€199)
        </button>
      )}
    </div>
  );
}
```

---

## 🔐 Security Notes

1. **Double Enforcement**: Access is checked at BOTH API (middleware) and UI (FeatureGate) levels
2. **No Data Leakage**: Blocked features return 403, not partial data
3. **Role Validation**: Middleware verifies both subscription tier AND user role
4. **Immutable Reports**: Reports are generated once and stored (no retroactive access)
5. **Audit Trail**: All subscription changes logged in `subscriptionHistory`

---

## 🛠️ Maintenance

### Adding a New Feature

1. Add feature flag to `subscriptionConstants.js` plan definitions
2. Add role access matrix entry
3. Update `checkFeatureAccess` middleware if needed
4. Create `<FeatureGate>` component in UI
5. Update documentation

### Changing Pricing

1. Update `PLAN_DEFINITIONS` in `subscriptionConstants.js`
2. Re-run seed script to update database
3. Update marketing/pricing page

### Adding a New Plan

1. Add plan definition to `subscriptionConstants.js`
2. Update plan hierarchy in access control service
3. Create migration for existing organizations
4. Update frontend plan selection UI

---

## 📞 Support

For questions about this implementation:
- **Backend**: Check `backend/services/accessControlService.js`
- **Frontend**: Check `src/contexts/SubscriptionContext.js`
- **API**: Check `backend/routes/subscriptions.js`

**Remember**: SignalTrue pricing is a POWER BOUNDARY, not a feature toggle.

---

## 📄 License

Proprietary - SignalTrue Internal Implementation
