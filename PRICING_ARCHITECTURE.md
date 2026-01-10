# SignalTrue Pricing Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRICING TIERS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐             │
│  │ TEAM €99     │      │ LEADERSHIP   │      │ CUSTOM       │             │
│  │              │      │ €199         │      │ (Enterprise) │             │
│  ├──────────────┤      ├──────────────┤      ├──────────────┤             │
│  │ ✓ Weekly     │      │ ✓ Weekly     │      │ ✓ Weekly     │             │
│  │ ✓ Monthly HR │      │ ✓ Monthly HR │      │ ✓ Monthly HR │             │
│  │ ✗ Leadership │      │ ✓ Leadership │      │ ✓ Leadership │             │
│  │ ✓ Tactical   │      │ ✓ Tactical   │      │ ✓ Tactical   │             │
│  │ ✗ Strategic  │      │ ✓ Strategic  │      │ ✓ Strategic  │             │
│  │ ✗ Benchmarks │      │ ✓ Benchmarks │      │ ✓ Benchmarks │             │
│  │              │      │              │      │ ✓ Custom AI  │             │
│  └──────────────┘      └──────────────┘      └──────────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         REQUEST FLOW (API Level)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Client Request                                                           │
│     │                                                                        │
│     ├─> GET /api/reports/weekly                                             │
│     │   Header: Authorization: Bearer <token>                               │
│     │                                                                        │
│  2. Authentication Middleware                                                │
│     │                                                                        │
│     ├─> authenticateToken(req, res, next)                                   │
│     │   • Validates JWT                                                     │
│     │   • Attaches req.user (with role)                                     │
│     │   • Attaches req.organization                                         │
│     │                                                                        │
│  3. Access Control Middleware ★ CRITICAL ★                                  │
│     │                                                                        │
│     ├─> checkReportAccess('weekly')                                         │
│     │   │                                                                   │
│     │   ├─> accessControlService.canAccessReport(                           │
│     │   │      user: { role: "HR_ADMIN" },                                 │
│     │   │      org: { subscriptionPlanId: "team" },                        │
│     │   │      reportType: "weekly"                                        │
│     │   │    )                                                              │
│     │   │                                                                   │
│     │   ├─> Check 1: Plan has feature?                                     │
│     │   │   ✓ Team plan has weeklyReports: true                            │
│     │   │                                                                   │
│     │   ├─> Check 2: Role allowed?                                         │
│     │   │   ✓ ACCESS_MATRIX[weeklyReports][HR_ADMIN]: true                 │
│     │   │                                                                   │
│     │   └─> Result: { allowed: true }                                      │
│     │                                                                        │
│     ├─> Continue to controller ✓                                            │
│     │                                                                        │
│  4. Controller                                                               │
│     │                                                                        │
│     └─> Generate weekly report with TACTICAL AI                             │
│         • Use weeklyAiPrompt_v1.json                                        │
│         • Max 3 recommendations                                             │
│         • 7-14 day horizon                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      BLOCKED REQUEST EXAMPLE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Client Request                                                           │
│     │                                                                        │
│     ├─> GET /api/benchmarks/industry/bdi                                    │
│     │   User: HR_ADMIN, Plan: Team €99                                     │
│     │                                                                        │
│  2. Access Control Middleware                                                │
│     │                                                                        │
│     ├─> checkBenchmarkAccess()                                              │
│     │   │                                                                   │
│     │   ├─> Check 1: Plan has feature?                                     │
│     │   │   ✗ Team plan has industryBenchmarks: false                      │
│     │   │                                                                   │
│     │   └─> Result: { allowed: false, reason: "Feature not in plan" }      │
│     │                                                                        │
│     ├─> Return 403 Forbidden ✗                                              │
│     │   {                                                                   │
│     │     "error": "Forbidden",                                             │
│     │     "message": "Feature industryBenchmarks not available...",         │
│     │     "upgrade": "Upgrade to Leadership Intelligence (€199)"            │
│     │   }                                                                   │
│     │                                                                        │
│     └─> NEVER reaches controller                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                     FRONTEND COMPONENT FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  <SubscriptionProvider>                                                      │
│    │                                                                         │
│    ├─> Fetch /api/subscriptions/current                                     │
│    │   • Get plan: { planId: "team", features: {...} }                     │
│    │   • Get accessible features: ["weeklyReports", "aiTactical", ...]     │
│    │                                                                         │
│    ├─> Provide context to children                                          │
│    │   • hasFeature(feature)                                                │
│    │   • upgrade(planId)                                                    │
│    │   • getUpgradeSuggestion(feature)                                      │
│    │                                                                         │
│    └─> <Dashboard>                                                          │
│          │                                                                   │
│          ├─> <FeatureGate feature="weeklyReports">                          │
│          │     <WeeklyReports /> ✓ RENDERS                                  │
│          │   </FeatureGate>                                                 │
│          │                                                                   │
│          ├─> <FeatureGate feature="industryBenchmarks" showUpgrade>         │
│          │     <Benchmarks /> ✗ DOES NOT RENDER                             │
│          │     Shows: <UpgradePrompt /> instead                              │
│          │   </FeatureGate>                                                 │
│          │                                                                   │
│          └─> <FeatureGate feature="monthlyReportsLeadership">               │
│                <LeadershipReport /> ✗ DOES NOT RENDER                       │
│                Shows: null (no fallback)                                    │
│              </FeatureGate>                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI MODE SEPARATION                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TACTICAL AI (Team €99)          │  STRATEGIC AI (Leadership €199+)         │
│  ─────────────────────────       │  ───────────────────────────────         │
│                                   │                                          │
│  Horizon: 7-14 days              │  Horizon: 60-120 days                   │
│  Max Recommendations: 3           │  Max Recommendations: Unlimited         │
│  Tone: Action-oriented            │  Tone: Decision prompts                 │
│  Audience: HR/Managers            │  Audience: CEO/Board                    │
│                                   │                                          │
│  Output:                          │  Output:                                 │
│  • "Schedule 3 focus blocks"     │  • "Should you flatten decision-        │
│  • "Conduct 1:1s with..."        │     making or invest in PM capacity?"   │
│  • "Review recurring meetings"   │  • "Meeting governance: culture         │
│                                   │     shift or policy mandate?"           │
│  Prohibited:                      │                                          │
│  ✗ Strategic language             │  Prohibited:                            │
│  ✗ Industry comparisons           │  ✗ Individual names                     │
│  ✗ Leadership framing             │  ✗ Tactical actions                     │
│  ✗ Long-term planning             │  ✗ Manager-level recommendations        │
│                                   │  ✗ HR metrics framing                   │
│  Prompt:                          │                                          │
│  weeklyAiPrompt_v1.json           │  Prompt:                                │
│                                   │  monthlyStrategicAiPrompt_v1.json       │
│                                   │                                          │
└───────────────────────────────────┴─────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATABASE SCHEMA ADDITIONS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SubscriptionPlan Collection                                                 │
│  ────────────────────────                                                   │
│  {                                                                           │
│    _id: ObjectId,                                                           │
│    planId: "team" | "leadership" | "custom",                               │
│    name: "Team Intelligence",                                               │
│    priceEUR: 99,                                                            │
│    features: {                                                              │
│      weeklyReports: true,                                                   │
│      monthlyReportsHR: true,                                                │
│      monthlyReportsLeadership: false,                                       │
│      aiTactical: true,                                                      │
│      aiStrategic: false,                                                    │
│      industryBenchmarks: false,                                             │
│      orgComparisons: false,                                                 │
│      customModels: false                                                    │
│    },                                                                       │
│    isActive: true,                                                          │
│    createdAt: Date,                                                         │
│    updatedAt: Date                                                          │
│  }                                                                           │
│                                                                              │
│  Organization Collection (Extended)                                          │
│  ───────────────────────────────                                            │
│  {                                                                           │
│    _id: ObjectId,                                                           │
│    name: "Acme Corp",                                                       │
│    subscriptionPlanId: "team",  ◄─── NEW                                   │
│    customFeatures: {             ◄─── NEW                                   │
│      enableBoardReports: false,                                             │
│      enableCustomThresholds: false,                                         │
│      enableCustomAiPrompts: false,                                          │
│      enableQuarterlyReviews: false                                          │
│    },                                                                       │
│    subscriptionHistory: [        ◄─── NEW                                   │
│      {                                                                      │
│        planId: "team",                                                      │
│        changedAt: Date,                                                     │
│        changedBy: ObjectId,                                                 │
│        action: "initial"                                                    │
│      }                                                                      │
│    ],                                                                       │
│    // ... existing fields ...                                               │
│  }                                                                           │
│                                                                              │
│  IndustryBenchmark Collection                                                │
│  ─────────────────────────────                                              │
│  {                                                                           │
│    _id: ObjectId,                                                           │
│    industry: "Technology",                                                  │
│    companySizeBand: "51-200",                                               │
│    metric: "bdi",                                                           │
│    p25: 55,                                                                 │
│    p50: 72,                                                                 │
│    p75: 85,                                                                 │
│    sampleSize: 150,                                                         │
│    dataSource: "SignalTrue Aggregate",                                      │
│    createdAt: Date,                                                         │
│    updatedAt: Date                                                          │
│  }                                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT WORKFLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1: Seed Subscription Plans                                             │
│  ────────────────────────────────                                           │
│  $ node backend/scripts/seedSubscriptionPlans.js                            │
│                                                                              │
│  Creates:                                                                    │
│  • Team Intelligence (€99)                                                  │
│  • Leadership Intelligence (€199)                                           │
│  • Organizational Intelligence (Custom)                                     │
│                                                                              │
│  ──────────────────────────────────────────────────────────                 │
│                                                                              │
│  Step 2: Migrate Existing Organizations                                     │
│  ─────────────────────────────────────                                      │
│  $ node backend/scripts/migrateOrganizationSubscriptions.js                 │
│                                                                              │
│  Updates all orgs with:                                                     │
│  • subscriptionPlanId: "team" (default)                                     │
│  • customFeatures: { ... }                                                  │
│  • subscriptionHistory: [{ ... }]                                           │
│                                                                              │
│  ──────────────────────────────────────────────────────────                 │
│                                                                              │
│  Step 3: Deploy Backend                                                     │
│  ───────────────────────                                                    │
│  $ git add .                                                                │
│  $ git commit -m "Add pricing & access control"                             │
│  $ git push origin main                                                     │
│                                                                              │
│  New routes available:                                                      │
│  • /api/subscriptions/*                                                     │
│  • /api/benchmarks/industry/*                                               │
│                                                                              │
│  ──────────────────────────────────────────────────────────                 │
│                                                                              │
│  Step 4: Integrate Frontend                                                 │
│  ─────────────────────────                                                  │
│  Update App.js:                                                             │
│  ```jsx                                                                     │
│  import { SubscriptionProvider } from './contexts/SubscriptionContext';     │
│                                                                              │
│  function App() {                                                           │
│    return (                                                                 │
│      <SubscriptionProvider>                                                 │
│        <Dashboard />                                                        │
│      </SubscriptionProvider>                                                │
│    );                                                                       │
│  }                                                                           │
│  ```                                                                         │
│                                                                              │
│  ──────────────────────────────────────────────────────────                 │
│                                                                              │
│  Step 5: Test                                                               │
│  ─────────────                                                              │
│  $ ./test-pricing.sh                                                        │
│                                                                              │
│  Validates:                                                                 │
│  • Plans exist in DB                                                        │
│  • Access control works                                                     │
│  • Upgrade/downgrade flows                                                  │
│  • Feature gating                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

```

## Files Structure

```
signaltrue/
├── backend/
│   ├── models/
│   │   ├── SubscriptionPlan.js          ★ NEW
│   │   ├── IndustryBenchmark.js         ★ NEW
│   │   └── organizationModel.js         ★ MODIFIED
│   ├── services/
│   │   ├── accessControlService.js      ★ NEW
│   │   └── monthlyLeadershipReportService.js  ★ NEW
│   ├── middleware/
│   │   └── checkFeatureAccess.js        ★ NEW
│   ├── routes/
│   │   ├── subscriptions.js             ★ NEW
│   │   └── benchmarks.js                ★ MODIFIED
│   ├── utils/
│   │   └── subscriptionConstants.js     ★ NEW
│   ├── prompts/
│   │   ├── weeklyAiPrompt_v1.json       ★ NEW
│   │   └── monthlyStrategicAiPrompt_v1.json  ★ NEW
│   ├── scripts/
│   │   ├── seedSubscriptionPlans.js     ★ NEW
│   │   └── migrateOrganizationSubscriptions.js  ★ NEW
│   └── server.js                        ★ MODIFIED
├── src/
│   ├── contexts/
│   │   └── SubscriptionContext.js       ★ NEW
│   └── components/
│       └── FeatureGate.js               ★ NEW
├── PRICING_IMPLEMENTATION.md            ★ NEW
├── PRICING_QUICK_START.md              ★ NEW
├── PRICING_SUMMARY.md                  ★ NEW
├── PRICING_ARCHITECTURE.md             ★ NEW (this file)
└── test-pricing.sh                     ★ NEW
```

## Power Boundary Enforcement

```
┌─────────────────────────────────────────┐
│         User Request                    │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   API Level (Middleware)                │
│   ─────────────────────                 │
│   checkFeatureAccess()                  │
│   • Verify subscription plan            │
│   • Verify user role                    │
│   • Block if unauthorized (403)         │
└────────────┬────────────────────────────┘
             │ authorized
             ▼
┌─────────────────────────────────────────┐
│   Controller                            │
│   ──────────                            │
│   • Generate content                    │
│   • Use appropriate AI mode             │
│   • Return data                         │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   UI Level (FeatureGate)                │
│   ────────────────────                  │
│   hasFeature()                          │
│   • Check accessible features           │
│   • Block render if unauthorized        │
│   • Show upgrade prompt if requested    │
└─────────────────────────────────────────┘

DOUBLE ENFORCEMENT = POWER BOUNDARY
```
