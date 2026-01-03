# 🚀 Insights Feature Deployment Checklist

Use this checklist when deploying the Diagnosis & Impact Layer to production.

## ✅ Pre-Deployment Checklist

### Database Preparation

- [ ] **Verify MongoDB collections** - Ensure database can create new collections
- [ ] **Check indexes** - Models will auto-create indexes, but verify they're created:
  - `teamStates` - index on `teamId` + `weekStart`
  - `riskWeeklies` - index on `teamId` + `weekStart` + `riskType`
  - `riskDrivers` - index on `teamId` + `weekStart` + `riskType`
  - `teamActions` - index on `teamId` + `status`
  - `experiments` - index on `teamId` + `status`
  - `impacts` - index on `experimentId`

### Data Requirements

- [ ] **Teams exist** - At least one team with `isActive: true`
- [ ] **Metrics collected** - Teams have recent metrics data
- [ ] **Baselines calculated** - Each team has baseline data with:
  - `after_hours_activity` (mean, stdDev)
  - `meeting_load` (mean, stdDev)
  - `back_to_back_meetings` (mean, stdDev)
  - `focus_time` (mean, stdDev)
  - `response_time` (mean, stdDev)
  - `participation_drift` (mean, stdDev)
  - `meeting_fragmentation` (mean, stdDev)

### Code Integration

- [ ] **Metrics integration** - Update `experimentTrackingService.js`:
  - Replace `capturePreMetrics()` with real metric queries
  - Replace `capturePostMetrics()` with real metric queries
  
- [ ] **Navigation added** - Users can access `/app/insights/:teamId`
  - Add link to team dashboard, OR
  - Add to main navigation menu, OR
  - Add to team list/cards

### Environment Variables

- [ ] **No new env vars required** - Feature uses existing configuration
- [ ] **Verify JWT_SECRET** - Required for authenticated routes
- [ ] **Verify MONGO_URI** - Required for database connection

## 🧪 Testing Checklist

### Local Testing

- [ ] **Backend starts** - `cd backend && npm start`
  - Should see: "⏰ Cron job scheduled: Weekly diagnosis"
- [ ] **Frontend builds** - `npm run build`
  - Should complete without errors
- [ ] **Syntax validation** - All new files have valid syntax
- [ ] **Manual diagnosis** - Test POST `/api/insights/team/:teamId/diagnose`
- [ ] **View insights** - Visit `/app/insights/:teamId` in browser

### API Testing

- [ ] **GET insights** - Returns current state, risks, action, experiment
- [ ] **POST diagnose** - Triggers diagnosis and generates data
- [ ] **POST activate** - Starts experiment when action activated
- [ ] **POST dismiss** - Updates action status to dismissed
- [ ] **GET experiments** - Returns experiment history

### End-to-End Flow

- [ ] **Diagnosis generates** - Weekly job creates TeamState + RiskWeekly
- [ ] **Risks have drivers** - RiskDriver records show contributing metrics
- [ ] **Actions generate** - Strained+ teams get recommended actions
- [ ] **One-action constraint** - Can't activate second action while one is active
- [ ] **Experiment starts** - Activating action creates Experiment record
- [ ] **Experiment completes** - Past end date triggers impact measurement
- [ ] **Impact generated** - Impact record created with results

## 📊 Data Validation

### Sample Data Check

Run this query in MongoDB to verify data structure:

```javascript
// Check team states
db.teamStates.findOne({})

// Expected structure:
{
  teamId: ObjectId,
  weekStart: Date,
  state: 'healthy' | 'strained' | 'overloaded' | 'breaking',
  confidence: 75,
  summaryText: "Team is operating within normal parameters...",
  dominantRisk: 'overload' | 'execution' | 'retention_strain',
  createdAt: Date,
  updatedAt: Date
}

// Check risk scores
db.riskWeeklies.findOne({})

// Expected structure:
{
  teamId: ObjectId,
  weekStart: Date,
  riskType: 'overload' | 'execution' | 'retention_strain',
  score: 45.2,
  band: 'yellow',
  confidence: 80,
  explanationText: "Team showing moderate overload...",
  createdAt: Date
}

// Check actions
db.teamActions.findOne({})

// Expected structure:
{
  teamId: ObjectId,
  linkedRisk: 'overload',
  title: 'Introduce quiet hours',
  whyThisAction: 'After-hours activity is 40% above baseline...',
  duration: 3,
  status: 'suggested',
  createdAt: Date
}
```

## 🔄 Deployment Steps

### 1. Backend Deployment

- [ ] **Commit new files**:
  ```bash
  git add backend/models/teamState.js
  git add backend/models/riskWeekly.js
  git add backend/models/riskDriver.js
  git add backend/models/teamAction.js
  git add backend/models/experiment.js
  git add backend/models/impact.js
  git add backend/services/riskCalculationService.js
  git add backend/services/actionGenerationService.js
  git add backend/services/experimentTrackingService.js
  git add backend/services/weeklySchedulerService.js
  git add backend/routes/insights.js
  git add backend/server.js
  ```

- [ ] **Deploy backend** - Follow your normal deployment process
- [ ] **Verify scheduler starts** - Check logs for "Weekly diagnosis scheduled"
- [ ] **Test API endpoints** - Use curl or Postman to verify routes work

### 2. Frontend Deployment

- [ ] **Commit new files**:
  ```bash
  git add src/pages/app/Insights.js
  git add src/components/insights/TeamStateBadge.js
  git add src/components/insights/RiskCard.js
  git add src/components/insights/ActionCard.js
  git add src/components/insights/ExperimentCard.js
  git add src/App.js
  ```

- [ ] **Build frontend** - `npm run build`
- [ ] **Deploy frontend** - Follow your normal deployment process
- [ ] **Test in production** - Visit insights page for a test team

### 3. First Run

- [ ] **Wait for Monday 1 AM** - Or trigger manual diagnosis:
  ```bash
  curl -X POST https://api.yourdomain.com/api/insights/team/<team-id>/diagnose \
    -H "Authorization: Bearer <token>"
  ```

- [ ] **Verify data created** - Check MongoDB collections
- [ ] **Check for errors** - Review server logs
- [ ] **Test user flow** - Have a test user activate an action

## 📈 Monitoring

### Key Metrics to Track

- [ ] **Weekly job completion rate** - Should run every Monday
- [ ] **Diagnosis success rate** - % of teams successfully diagnosed
- [ ] **Action activation rate** - % of suggested actions that get activated
- [ ] **Experiment completion rate** - % of experiments that finish
- [ ] **API response times** - Insights endpoints should be fast (<500ms)

### Error Monitoring

Watch for:
- Failed diagnosis jobs (check logs every Monday)
- Missing baseline data errors
- Experiment completion failures
- API authentication errors

### Database Growth

Expected collection sizes after 4 weeks (100 teams):
- `teamStates`: ~400 documents (100 teams × 4 weeks)
- `riskWeeklies`: ~1,200 documents (100 teams × 3 risks × 4 weeks)
- `riskDrivers`: ~4,800 documents (100 teams × 3 risks × 4 drivers × 4 weeks)
- `teamActions`: ~50-100 documents (only strained+ teams)
- `experiments`: ~20-40 documents (subset of activated actions)
- `impacts`: ~10-20 documents (completed experiments)

## 🐛 Rollback Plan

If issues occur:

### Quick Rollback
1. Remove insights route from `backend/server.js`
2. Remove insights route from `src/App.js`
3. Redeploy both backend and frontend
4. Data remains in database for future retry

### Clean Rollback
1. Stop the weekly scheduler (remove from server.js)
2. Remove API routes (optional - they won't be called)
3. Keep database collections (no breaking changes)
4. Can re-enable later without data loss

## ✅ Post-Deployment Validation

### Week 1
- [ ] First weekly job runs successfully
- [ ] TeamStates created for all active teams
- [ ] RiskWeeklies created (3 per team)
- [ ] At least one action generated
- [ ] Insights page loads without errors

### Week 2
- [ ] Historical data accumulates
- [ ] Trend detection starts working (retention strain needs 3 weeks)
- [ ] At least one action activated
- [ ] Experiments tracking properly

### Week 4
- [ ] First experiments complete
- [ ] Impact measurements generated
- [ ] Results displayed correctly
- [ ] Users understand the flow

## 📞 Support

If issues arise:
1. Check server logs for error messages
2. Verify database collections exist and have data
3. Test manual diagnosis endpoint
4. Review `INSIGHTS_README.md` for troubleshooting

## 🎉 Success Criteria

Deployment is successful when:
- ✅ Weekly job runs without errors
- ✅ All active teams have current insights
- ✅ Users can view insights page
- ✅ Actions can be activated
- ✅ Experiments complete and measure impact
- ✅ No performance degradation
- ✅ No breaking changes to existing features

---

**Ready to deploy! 🚀**
