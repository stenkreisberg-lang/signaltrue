# SignalTrue Behavioral Drift System - Deployment Guide

**Version:** 2.0 - HR-Ready Behavioral Drift Detection  
**Last Updated:** December 31, 2025

---

## Overview

This guide covers deploying the new Behavioral Drift Index (BDI) system and all associated features for SignalTrue's HR-ready product.

---

## 1. Environment Variables

Add these new environment variables to your `.env` file:

### Required (No Changes from v1.0)
```bash
# Database
MONGO_URI=mongodb://localhost:27017/signaltrue
# or for production:
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/signaltrue

# Server
PORT=8080
NODE_ENV=production

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://yourdomain.com

# Email (for weekly digest)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key
SMTP_FROM=noreply@signaltrue.ai
```

### Optional (New in v2.0)
```bash
# Anti-Weaponization
MIN_TEAM_SIZE=5                    # Minimum team members for aggregation (default: 5)
ENABLE_AUDIT_LOGGING=true          # Enable data access audit trail (default: true)
AUDIT_LOG_RETENTION_DAYS=365       # How long to keep audit logs (default: 365)

# BDI Calculation
BDI_BASELINE_DAYS=90               # Days for baseline calculation (default: 90)
BDI_CALCULATION_SCHEDULE=0 2 * * * # Cron schedule for daily BDI calc (default: 2am daily)

# Weekly Digest
WEEKLY_DIGEST_ENABLED=true         # Enable weekly HR briefs (default: true)
WEEKLY_DIGEST_SCHEDULE=0 9 * * 1   # Cron schedule (default: Mondays 9am)
WEEKLY_DIGEST_RECIPIENTS=hr@company.com,admin@company.com

# Feature Flags
ENABLE_DRIFT_PLAYBOOKS=true        # Enable playbook recommendations (default: true)
ENABLE_DRIFT_TIMELINE=true         # Enable timeline tracking (default: true)
```

---

## 2. Database Migration

### New Collections Created

The following MongoDB collections will be auto-created on first use:

1. **behavioraldriftindices** - Stores BDI calculations
2. **coordinationloadindices** - Stores CLI calculations
3. **bandwidthtaxindicators** - Stores BTI calculations
4. **silenceriskindicators** - Stores SRI calculations
5. **capacitystatuses** - Enhanced capacity tracking
6. **driftplaybooks** - Standard playbook templates
7. **drifttimelines** - Event timeline tracking
8. **dataaccesslogs** - Audit trail for compliance

### Indexes

All indexes are created automatically via Mongoose schemas. No manual index creation needed.

### Backward Compatibility

✅ All existing collections remain unchanged  
✅ Old API endpoints continue to work  
✅ No breaking changes to authentication or user management

---

## 3. Seeding Default Playbooks

After deployment, seed the 5 default drift playbooks:

```bash
cd backend
node scripts/seedPlaybooks.js
```

This creates:
1. **Clarify Decision Ownership** - For high coordination load
2. **Reduce Recurring Syncs** - For meeting overload
3. **Protect Focus Time** - For bandwidth tax
4. **Re-establish Communication Norms** - For silence risk
5. **Rebalance Workload** - For sustained overload

---

## 4. Post-Deployment Verification

### Step 1: Verify Backend Health

```bash
curl http://localhost:8080/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "2.0.0"
}
```

### Step 2: Test BDI Calculation

```bash
# Replace {teamId} with actual team ID from your database
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/bdi/team/{teamId}/latest
```

Expected: BDI object or 404 if no data yet

### Step 3: Test Dashboard Endpoint

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/dashboard/{teamId}
```

Expected: Complete dashboard with BDI, capacity, CLI, BTI, SRI

### Step 4: Verify Guardrails

Try accessing a team with <5 members:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/bdi/team/{smallTeamId}/latest
```

Expected response:
```json
{
  "message": "Team must have at least 5 members for aggregated insights. This protects individual privacy.",
  "currentMembers": 3,
  "minimumRequired": 5,
  "guard": "5_PERSON_MINIMUM"
}
```

### Step 5: Check Audit Logging

```bash
# In MongoDB
use signaltrue
db.dataaccesslogs.find().limit(10)
```

Should see access logs for all dashboard requests.

---

## 5. Migration Checklist

- [ ] **Environment variables** configured in production
- [ ] **Database connection** verified
- [ ] **Backend deployed** and health check passing
- [ ] **Frontend deployed** with new components
- [ ] **Default playbooks** seeded via script
- [ ] **BDI calculation** cron job scheduled
- [ ] **Weekly digest** cron job configured
- [ ] **Audit logging** enabled and tested
- [ ] **5-person minimum** enforced on all team endpoints
- [ ] **Marketing pages** updated with new messaging
- [ ] **Documentation** reviewed by compliance team
- [ ] **Team training** conducted on new metrics

---

## 6. Cron Jobs Setup

### Option A: Using node-cron (in-process)

Already configured in `backend/server.js` - no action needed.

### Option B: Using System Cron (recommended for production)

Add to crontab:

```bash
# Daily BDI calculation (2am)
0 2 * * * cd /path/to/signaltrue/backend && node scripts/calculateDailyBDI.js

# Weekly digest (Mondays 9am)
0 9 * * 1 cd /path/to/signaltrue/backend && node scripts/sendWeeklyDigest.js

# Cleanup old audit logs (daily 3am)
0 3 * * * cd /path/to/signaltrue/backend && node scripts/cleanupAuditLogs.js
```

### Option C: Using External Scheduler (Render, Heroku)

Configure in platform dashboard using the cron expressions above.

---

## 7. Monitoring & Alerts

### Key Metrics to Monitor

1. **BDI Calculation Success Rate** - Should be >95%
2. **API Response Times** - Dashboard endpoint should be <500ms
3. **5-Person Guard Rejections** - Track teams affected
4. **Audit Log Volume** - Monitor for unusual access patterns
5. **Weekly Digest Delivery Rate** - Should be 100%

### Recommended Alerts

- BDI calculation failures >5% in 24 hours
- Dashboard endpoint errors >1% in 1 hour
- Unusual data access detected (>100 requests/hour per user)
- Team falls below 5-person minimum
- Weekly digest fails to send

---

## 8. Rollback Plan

If issues arise, rollback is straightforward:

### Step 1: Revert Backend
```bash
git checkout previous-stable-tag
npm install
npm start
```

### Step 2: Revert Frontend
```bash
git checkout previous-stable-tag
npm install
npm run build
```

### Step 3: Disable New Features
In `.env`:
```bash
ENABLE_DRIFT_PLAYBOOKS=false
ENABLE_DRIFT_TIMELINE=false
WEEKLY_DIGEST_ENABLED=false
```

**Note:** Existing BDI/CLI/BTI/SRI data remains in database and won't be deleted.

---

## 9. Security Checklist

- [ ] All API endpoints require authentication
- [ ] 5-person minimum enforced on team queries
- [ ] Individual-level queries blocked
- [ ] Audit logging enabled for compliance
- [ ] CORS configured for production domain
- [ ] JWT secret is 32+ characters and random
- [ ] HTTPS enabled in production
- [ ] Database credentials stored securely
- [ ] Email credentials stored securely
- [ ] No sensitive data in client-side logs

---

## 10. Common Issues

### Issue: BDI showing null for all teams

**Cause:** No historical data yet  
**Solution:** Wait 24 hours for first calculation, or run manual calculation:
```bash
node backend/scripts/calculateDailyBDI.js
```

### Issue: Weekly digest not sending

**Cause:** SMTP credentials incorrect or cron not running  
**Solution:** Test email manually:
```bash
node backend/scripts/testEmail.js
```

### Issue: 5-person guard rejecting valid teams

**Cause:** Team.members array not populated  
**Solution:** Ensure team member sync is working:
```bash
node backend/scripts/syncTeamMembers.js
```

### Issue: Frontend shows "No BDI data available"

**Cause:** API endpoint not returning data  
**Solution:** Check browser console and network tab, verify JWT token is valid

---

## 11. Support Contacts

- **Technical Issues:** dev@signaltrue.ai
- **Deployment Help:** ops@signaltrue.ai
- **Compliance Questions:** legal@signaltrue.ai
- **General Support:** support@signaltrue.ai

---

## 12. Next Steps After Deployment

1. **Monitor dashboard** for first 48 hours
2. **Review audit logs** weekly for unusual patterns
3. **Collect user feedback** from HR admins
4. **Schedule team training** on new metrics
5. **Review playbook effectiveness** after 30 days
6. **Update documentation** based on learnings

---

**Deployment Date:** _________________  
**Deployed By:** _________________  
**Verified By:** _________________  
**Rollback Plan Tested:** [ ] Yes [ ] No
