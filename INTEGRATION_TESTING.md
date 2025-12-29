# Integration Testing Guide - SignalTrue Early-Warning System

**Date:** December 29, 2025  
**Purpose:** Verify end-to-end flow from registration → intervention → outcome measurement

## Test Scenario 1: New User First Signal Flow

**Goal:** Verify First Signal cannot be skipped and redirects work correctly

### Steps:
1. **Register new organization**
   - Navigate to `/register`
   - Create account with email/password
   - Verify JWT token stored in localStorage
   - Expected: Redirect to `/first-signal` (if firstSignalShown=false)

2. **First Signal screen**
   - Verify "Something is drifting" title appears
   - Verify ONE signal displayed (meeting-load OR after-hours OR response-latency)
   - Verify severity badge (CRITICAL, RISK, or INFO)
   - Verify metric delta shown (e.g., "+23% from baseline")
   - **CRITICAL:** Cannot skip without action
   - Click "See why this matters"
   - Expected: Redirect to `/app/risk-feed`

3. **Risk Feed landing**
   - Verify max 5 signals displayed
   - Verify signals sorted by: severity → velocity → time unresolved
   - Verify interpretation framework visible (whatIsChanging, whyItMatters, whatBreaksIfIgnored)
   - Verify RecommendedAction component visible for each signal
   - Expected: Dashboard accessible via nav, but risk-feed is default

### Verification Points:
- [ ] firstSignalShown=false blocks access to /app/* routes
- [ ] POST /api/first-signal/acknowledge marks firstSignalShown=true
- [ ] Login redirects: master-admin → /master-admin, first-signal-not-shown → /first-signal, default → /app/risk-feed
- [ ] FirstSignal cannot be closed without clicking CTA

---

## Test Scenario 2: Intervention Lifecycle (14-Day Follow-Up)

**Goal:** Verify action tracking, recheck trigger, and outcome computation

### Steps:
1. **Connect integration (Slack or Google Calendar)**
   - Navigate to integrations page
   - Complete OAuth flow
   - Verify `integrations.slack.installed=true` OR `integrations.google.scope='calendar'`
   - Wait 24 hours for calibration to start generating signals

2. **Take action on a signal**
   - Navigate to `/app/risk-feed`
   - Select a signal (e.g., coordination-risk)
   - Click "Take This Action" on primary recommended action
   - Expected: POST /api/interventions creates intervention object
   - Verify intervention saved:
     ```json
     {
       "signalId": "<signal_id>",
       "actionTaken": "No-meeting Wednesdays",
       "effort": "Medium",
       "timeframe": "2 weeks",
       "startDate": "2025-12-29",
       "recheckDate": "2026-01-12", // +14 days
       "status": "active",
       "metricBefore": 2.3
     }
     ```

3. **Wait 14 days (or manually advance recheckDate for testing)**
   - Intervention status should auto-transition to "pending-recheck" when recheckDate passes
   - GET /api/interventions/pending should return this intervention

4. **Recheck outcome (hybrid: auto-compute + acknowledgment)**
   - Option A (Auto-compute):
     - POST /api/interventions/:id/auto-compute
     - Fetches current metric value from MetricsDaily
     - Computes outcomeDelta: { metricBefore, metricAfter, percentChange, improved }
     - Updates intervention status to "completed"
   
   - Option B (Manual acknowledgment):
     - User views intervention in Risk Feed
     - Sees "Recheck in 14 days" countdown
     - After 14 days, sees "Time to recheck" prompt
     - Clicks "Measure outcome"
     - Frontend displays before/after metrics
     - User confirms or marks abandoned

5. **Verify outcome display**
   - Navigate to `/app/risk-feed`
   - Find the original signal
   - Verify intervention outcome badge:
     - ✅ "Improved -15%" (if percentChange < 0 and improved=true)
     - ⚠️ "No change +2%" (if percentChange near 0)
     - ❌ "Worsened +18%" (if percentChange > 0 and improved=false)

### Verification Points:
- [ ] Intervention persisted with recheckDate = startDate + 14 days
- [ ] Status transitions: active → pending-recheck → completed
- [ ] Auto-compute fetches MetricsDaily and calculates delta
- [ ] Frontend displays outcome with visual indicator
- [ ] Abandoned interventions marked with DELETE /api/interventions/:id

---

## Test Scenario 3: Pricing Gates Enforcement

**Goal:** Verify free tier cannot access interventions, history, or export

### Steps:
1. **Create free tier organization**
   - Register new org
   - Verify `subscription.plan='free'` (default)

2. **Attempt to create intervention**
   - Navigate to `/app/risk-feed`
   - Click "Take This Action"
   - Expected: POST /api/interventions returns 403
   - Response body:
     ```json
     {
       "message": "This feature requires detection tier or higher",
       "currentTier": "free",
       "requiredTier": "detection",
       "upgrade": true,
       "upgradeUrl": "/pricing"
     }
     ```
   - Frontend should display upgrade prompt

3. **Attempt to view history > 7 days**
   - Navigate to team history page
   - Request 30-day history
   - Expected: GET /api/teams/:id/history?days=30 returns only 7 days
   - Response includes: `{ tierLimit: 7, requestedDays: 30, upgrade: true }`

4. **Attempt to export data**
   - Try GET /api/export/metrics-csv
   - Expected: 403 Forbidden
   - Response: "This feature requires impact_proof tier"

5. **Upgrade to detection tier**
   - Update Organization: `subscription.plan='detection'`
   - Retry intervention creation
   - Expected: POST /api/interventions succeeds (201 Created)
   - Verify history limit increased to 30 days
   - Verify export still blocked (requires impact_proof)

6. **Upgrade to impact_proof tier**
   - Update Organization: `subscription.plan='impact_proof'`
   - Retry export
   - Expected: GET /api/export/metrics-csv succeeds (200 OK)
   - Verify comparisons endpoint accessible: GET /api/comparisons/team-vs-org/:teamId

### Verification Points:
- [ ] Free tier: signals visible, interventions blocked, 7-day history
- [ ] Detection tier: interventions allowed, 30-day history, export blocked
- [ ] Impact Proof tier: all features enabled, 90-day history, comparisons + export
- [ ] Middleware returns correct upgrade prompts with pricing URL
- [ ] Frontend gracefully handles 403 responses

---

## Test Scenario 4: Internal Benchmarks (Impact Proof Only)

**Goal:** Verify comparison computations and "Not industry benchmark" disclaimers

### Steps:
1. **Set up Impact Proof tier org with multiple teams**
   - Create org with `subscription.plan='impact_proof'`
   - Create 3+ teams with different activity levels
   - Populate MetricsDaily for past 60 days

2. **Team vs Org Average**
   - GET /api/comparisons/team-vs-org/:teamId?days=30
   - Expected response:
     ```json
     {
       "type": "team_vs_org",
       "disclaimer": "Internal comparison. Not industry benchmark.",
       "metrics": {
         "meetingLoad": {
           "team": 2.3,
           "org": 1.8,
           "delta": "+27.8",
           "status": "above"
         }
       }
     }
     ```
   - Verify disclaimer present in all comparisons

3. **Month-over-Month**
   - GET /api/comparisons/month-over-month/:teamId
   - Expected: Compare current month vs last month
   - Verify trends: "increasing", "decreasing", "slowing", "improving"

4. **Before/After Intervention**
   - Create intervention with known before metric
   - Wait or mock recheckDate
   - GET /api/comparisons/intervention/:interventionId
   - Expected: Shows 7-day average before vs 7-day average after
   - Verify percentChange calculation
   - Verify "improved" boolean set correctly

### Verification Points:
- [ ] All comparisons include disclaimer: "Internal comparison. Not industry benchmark."
- [ ] Team vs org compares against organization average (not external benchmark)
- [ ] Month-over-month uses current month start vs last month start
- [ ] Intervention comparison uses 7-day windows before/after
- [ ] All endpoints require impact_proof tier (403 if detection or free)

---

## Test Scenario 5: Privacy Transparency Log

**Goal:** Verify transparency log visible and data use explainer accessible

### Steps:
1. **Access transparency log (admin view)**
   - Login as admin
   - Navigate to `/app/privacy`
   - Click "Transparency Log" tab
   - Expected: Table shows timestamped data pulls
   - Example entries:
     ```
     Timestamp | Source | Action | Aggregation Level | Records
     2025-12-28 | Slack | Sync public channels | Team-level counts only | 1247
     2025-12-28 | Google Calendar | Sync meeting metadata | Duration aggregates | 89
     ```
   - Verify "No individual data accessed" disclaimer

2. **Public explainer (employee-facing)**
   - GET /api/privacy/explainer/:orgSlug (no auth required)
   - Expected: Returns public explainer JSON
   - Verify sections: whatWeTrack, whatWeNeverTrack, howWeProtect, yourRights
   - Confirm message content emphasis on team-level aggregation

3. **Privacy visible in app menu**
   - Verify Privacy link in navigation (NOT footer)
   - Present in: RiskFeed nav, Signals nav, Overview nav
   - Click Privacy → navigate to `/app/privacy`
   - Verify 3 tabs: Overview, Transparency Log, Full Policy

### Verification Points:
- [ ] Transparency log requires authentication
- [ ] Public explainer accessible without login (by orgSlug)
- [ ] Privacy link visible in app navigation (not just footer)
- [ ] All content emphasizes "team-level only, no individual surveillance"

---

## Regression Checks

**After all changes, verify:**

1. **First Signal Priority Logic**
   - Meeting load deviation (>20%) checked first
   - If no meeting signal, check after-hours (>15%)
   - If no after-hours, check response latency (>25%)
   - Computation completes in <5 seconds

2. **Metric Renaming Consistency**
   - Backend uses: coordination-risk, boundary-erosion, execution-drag, morale-volatility, dependency-spread, focus-erosion
   - Frontend displays correct names in Risk Feed
   - Signal templates have interpretation framework (whatIsChanging, whyItMatters, whatBreaksIfIgnored)

3. **Routing Hierarchy**
   - Master admin → `/master-admin`
   - First signal not shown → `/first-signal`
   - Default authenticated → `/app/risk-feed`
   - Legacy `/dashboard` still accessible via nav

4. **RecommendedAction Component**
   - One-click action logging works
   - Effort badges display (Low/Medium/High)
   - Expandable alternatives show
   - Inaction warnings visible
   - Post-action: recheck countdown displays

---

## Success Criteria

✅ **Phase 1-2 (First Signal):** Cannot skip, redirects to risk-feed, shows ONE signal  
✅ **Phase 3-5 (Metric Renaming):** All signals use risk-based names, interpretation framework present  
✅ **Phase 6-8 (Interventions):** Action logged, 14-day follow-up, auto-compute outcome  
✅ **Phase 9 (Risk Feed):** Max 5 signals, severity-sorted, default landing  
✅ **Phase B (Privacy):** Transparency log visible, public explainer, app menu link  
✅ **Phase C (Positioning):** Home/Product/About use "Detect organizational drift" messaging  
✅ **Phase 10 (Pricing Gates):** Free tier blocked from interventions/history/export  
✅ **Phase 11 (Benchmarks):** Team vs org, month-over-month, intervention impact all labeled "Internal comparison"  

---

## Known Issues / Future Work

- [ ] Frontend comparisons display (backend ready, UI pending)
- [ ] Email alerts for pending rechecks (requires SMTP config)
- [ ] Mobile responsive testing for Risk Feed
- [ ] Performance testing with >100 signals
- [ ] Multi-org isolation testing (ensure orgId filters work)

---

**Test Environment:**
- Backend: Node.js + Express + MongoDB
- Frontend: React 18 + React Router
- Auth: JWT (localStorage)
- Database: MongoDB Atlas (or in-memory for testing)

**Testing Tools:**
- Manual QA in browser
- Postman/curl for API testing
- MongoDB Compass for data verification
- Chrome DevTools for network/storage inspection
