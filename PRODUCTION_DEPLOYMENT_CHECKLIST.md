# SignalTrue V2.0 - Production Deployment Checklist

**Date:** _______________  
**Deployed By:** _______________  
**Environment:** Production

---

## Pre-Deployment (Complete BEFORE running deploy.sh)

### 1. Environment Configuration
- [ ] `backend/.env` file exists
- [ ] `MONGO_URI` set to production MongoDB Atlas cluster
- [ ] `JWT_SECRET` set to strong random value (min 32 chars)
- [ ] `NODE_ENV=production`
- [ ] `PORT` configured (8080 recommended)
- [ ] `CORS_ORIGIN` set to production frontend URL
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` configured for emails
- [ ] `ENABLE_AUDIT_LOGGING=true` (required for compliance)
- [ ] `WEEKLY_BRIEF_CRON` configured (e.g., `0 9 * * 1` for Mondays 9am)

### 2. Database Preparation
- [ ] MongoDB Atlas production cluster created
- [ ] Database user created with appropriate permissions
- [ ] IP whitelist configured (or 0.0.0.0/0 for cloud deployments)
- [ ] Backup strategy configured in Atlas
- [ ] Test connection: `mongosh "<MONGO_URI>"`

### 3. Code Review
- [ ] All 17/18 requirements completed ✅
- [ ] Test suite passing (20/20 tests) ✅
- [ ] No console.log or debug code in production
- [ ] API keys and secrets NOT committed to git
- [ ] `.gitignore` includes `.env`, `node_modules`, `build`

### 4. Dependencies
- [ ] `npm install` completed in root directory
- [ ] `npm install` completed in backend directory
- [ ] No security vulnerabilities: `npm audit` (root)
- [ ] No security vulnerabilities: `npm audit` (backend)
- [ ] Node.js version >= 16.x

---

## Deployment Execution

### 5. Run Deployment Script
```bash
./deploy.sh
```

- [ ] All pre-deployment checks passed
- [ ] All tests passed (20/20)
- [ ] Frontend build successful
- [ ] Database seeding completed
- [ ] Environment verified

### 6. Choose Deployment Platform

**Option A: Vercel (Recommended for Frontend + Backend)**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod
```
- [ ] Vercel project connected to GitHub repo
- [ ] Environment variables set in Vercel dashboard
- [ ] Build command: `npm run build`
- [ ] Output directory: `build`
- [ ] Backend API routes configured in `vercel.json`

**Option B: Render (Recommended for Backend)**
- [ ] Create new Web Service on Render
- [ ] Connect GitHub repository
- [ ] Set Build Command: `cd backend && npm install`
- [ ] Set Start Command: `cd backend && npm start`
- [ ] Add environment variables in Render dashboard
- [ ] Configure health check endpoint: `/api/health`

**Option C: Railway**
- [ ] Create new project on Railway
- [ ] Connect GitHub repository
- [ ] Add environment variables
- [ ] Deploy from main branch

**Option D: Self-Hosted (VPS/EC2)**
- [ ] Server provisioned (Ubuntu 22.04+ recommended)
- [ ] Node.js installed
- [ ] PM2 installed: `npm install -g pm2`
- [ ] Nginx configured as reverse proxy
- [ ] SSL certificate configured (Let's Encrypt)
- [ ] Backend started: `pm2 start backend/server.js --name signaltrue-api`
- [ ] Frontend served via Nginx from `build/`

---

## Post-Deployment Verification

### 7. Backend Health Checks
```bash
# Replace <YOUR_PRODUCTION_URL> with actual URL
export API_URL="https://your-api.com"

# Health check
curl $API_URL/api/health
# Expected: {"status": "ok", "timestamp": "..."}

# Auth endpoint
curl $API_URL/api/auth/signup -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","role":"admin"}'

# BDI endpoint (requires auth)
curl $API_URL/api/bdi/team/TEAM_ID/latest \
  -H "Authorization: Bearer YOUR_TOKEN"
```

- [ ] Health endpoint returns 200 OK
- [ ] Auth endpoints respond correctly
- [ ] BDI endpoints require authentication
- [ ] 5-person minimum enforced (test with small team)
- [ ] CORS headers present for frontend domain

### 8. Frontend Verification
Visit: `https://your-frontend-url.com`

- [ ] Home page loads
- [ ] Login/signup works
- [ ] Dashboard redirects to `/app/overview`
- [ ] BDI card displays with status
- [ ] Anti-weaponization notice visible
- [ ] All 5 index cards present (BDI, Capacity, CLI, BTI, SRI)
- [ ] No console errors in browser DevTools

### 9. Database Verification
```bash
# Connect to production MongoDB
mongosh "<MONGO_URI>"

# Check collections exist
use signaltrue
show collections

# Verify playbooks seeded
db.driftplaybooks.countDocuments()
# Expected: 5

# Check indexes
db.behavioraldriftindices.getIndexes()
db.dataaccesslogs.getIndexes()
```

- [ ] All required collections exist
- [ ] 5 default playbooks seeded
- [ ] Indexes created on key fields
- [ ] TTL index on DataAccessLog (365 days)

### 10. Security Validation
- [ ] HTTPS enabled (SSL certificate valid)
- [ ] JWT_SECRET is strong and unique
- [ ] CORS restricted to frontend domain only
- [ ] No sensitive data in logs
- [ ] Rate limiting configured (if applicable)
- [ ] Audit logging enabled and working
- [ ] 5-person minimum enforced

### 11. Monitoring Setup
- [ ] Error logging configured (Sentry, LogRocket, etc.)
- [ ] Uptime monitoring configured (UptimeRobot, Pingdom)
- [ ] Database monitoring enabled (MongoDB Atlas alerts)
- [ ] Performance monitoring configured (New Relic, DataDog)
- [ ] Alerts configured for:
  - [ ] API errors (5xx responses)
  - [ ] Database connection failures
  - [ ] High CPU/memory usage
  - [ ] Failed cron jobs

### 12. Cron Jobs & Background Tasks
- [ ] Weekly digest cron configured
- [ ] BDI calculation cron configured (if automated)
- [ ] Test cron execution: Check logs for weekly brief generation
- [ ] Verify emails sent successfully

**Cron Setup Example (PM2 on VPS):**
```bash
# Add to crontab
crontab -e

# Weekly digest - Mondays at 9am
0 9 * * 1 curl -X POST http://localhost:8080/api/weekly-brief/send

# Daily BDI recalculation - Every day at 2am
0 2 * * * curl -X POST http://localhost:8080/api/bdi/recalculate
```

---

## Post-Deployment Tasks

### 13. Documentation Updates
- [ ] Update README.md with production URL
- [ ] Document API endpoints in team wiki
- [ ] Share deployment credentials with team (secure vault)
- [ ] Update support contact information

### 14. Team Notification
- [ ] Notify stakeholders deployment is complete
- [ ] Share production URLs (frontend + API)
- [ ] Share access credentials (for admins only)
- [ ] Schedule training session for HR users

### 15. Backup Verification
- [ ] Database backups configured (MongoDB Atlas automated backups)
- [ ] Backup restoration tested
- [ ] Backup retention policy: 30 days minimum
- [ ] Document backup restoration procedure

---

## Rollback Plan (if needed)

### If Deployment Fails:
1. **Identify Issue:**
   - Check backend logs: `pm2 logs` or platform logs
   - Check MongoDB connection
   - Review environment variables

2. **Immediate Rollback:**
   ```bash
   # Revert to previous Git commit
   git revert HEAD
   git push origin main
   
   # Or redeploy previous version via platform
   vercel --prod  # deploys latest commit
   ```

3. **Database Rollback:**
   ```bash
   # Restore from latest backup in MongoDB Atlas
   # Atlas > Clusters > Backup > Restore
   ```

4. **Notify Users:**
   - Post status update on status page
   - Email affected users (if any)
   - Estimate time to resolution

---

## Production Environment Variables Reference

**Required:**
```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/signaltrue?retryWrites=true&w=majority
JWT_SECRET=<64-char-random-string>
NODE_ENV=production
PORT=8080
CORS_ORIGIN=https://your-frontend.vercel.app
ENABLE_AUDIT_LOGGING=true
```

**Email (Required for weekly digest):**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxx
SMTP_FROM=noreply@signaltrue.ai
```

**Optional:**
```env
WEEKLY_BRIEF_CRON=0 9 * * 1
BDI_CALCULATION_CRON=0 2 * * *
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Success Criteria

✅ **Deployment is successful when:**
- All 15 checklist sections completed
- Frontend accessible at production URL
- Backend API responding to health checks
- Authentication working
- BDI dashboard loading with all 5 indices
- Anti-weaponization guardrails enforced
- Audit logging enabled
- Weekly digest cron configured
- No critical errors in logs (first 24 hours)
- Performance acceptable (< 2s page load)

---

## Support & Troubleshooting

**Common Issues:**

1. **"Cannot connect to MongoDB"**
   - Check MONGO_URI format
   - Verify IP whitelist in Atlas
   - Test connection with mongosh

2. **"CORS error" in frontend**
   - Verify CORS_ORIGIN matches frontend URL exactly
   - Check protocol (http vs https)

3. **"JWT authentication failed"**
   - Verify JWT_SECRET is set and consistent
   - Check token expiration (default 7 days)

4. **"BDI calculation not triggering"**
   - Check cron job configured
   - Verify team has >= 5 members
   - Check backend logs for errors

**Support Contacts:**
- Technical Lead: _____________
- DevOps: _____________
- Emergency: _____________

---

**Deployment Sign-off:**

- [ ] All checklist items completed
- [ ] Production verified working
- [ ] Monitoring configured
- [ ] Team notified

**Signed:** _______________  
**Date:** _______________
