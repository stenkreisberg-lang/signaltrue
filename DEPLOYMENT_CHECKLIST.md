# 📋 SignalTrue Deployment Checklist

Use this checklist to deploy SignalTrue to production.

## Pre-Deployment Setup

### 1. MongoDB Atlas
- [ ] Create free MongoDB cluster at https://cloud.mongodb.com
- [ ] Create database user with password
- [ ] Whitelist IP addresses (0.0.0.0/0 or specific IPs)
- [ ] Copy connection string (replace `<password>`)

### 2. AI Provider (Choose One)
**Option A: OpenAI**
- [ ] Get API key from https://platform.openai.com/api-keys
- [ ] Add credits to account ($5 minimum recommended)
- [ ] Note: GPT-3.5 ~$0.002/1K tokens, GPT-4 ~$0.03/1K tokens

**Option B: Anthropic**
- [ ] Get API key from https://console.anthropic.com/
- [ ] Add credits to account
- [ ] Note: Claude ~$0.015/1K tokens

### 3. Optional: Slack Integration
- [ ] Create Slack app at https://api.slack.com/apps
- [ ] Add scopes: `channels:history`, `channels:read`, `chat:write`
- [ ] Install to workspace
- [ ] Copy Bot User OAuth Token (xoxb-...)
- [ ] Invite bot to channels: `/invite @SignalTrue`
- [ ] Get channel IDs (right-click channel → View details)

### 4. Optional: Google Calendar
- [ ] Create Google Cloud project
- [ ] Enable Google Calendar API
- [ ] Create Service Account with Calendar Reader role
- [ ] Download JSON credentials file
- [ ] Share team calendars with service account email

### 5. Optional: Email Notifications
- [ ] Enable 2FA on Gmail account
- [ ] Generate app password (Account → Security → App passwords)
- [ ] Copy 16-character password

---

## Backend Deployment (Render)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Production ready - all 6 phases complete"
git push origin main
```

### Step 2: Create Render Account
- [ ] Sign up at https://render.com
- [ ] Connect GitHub account
- [ ] Authorize Render to access your repository

### Step 3: Deploy via Blueprint
- [ ] Go to https://dashboard.render.com/blueprints
- [ ] Click "New Blueprint Instance"
- [ ] Select your GitHub repository
- [ ] Render detects `render.yaml` automatically

### Step 4: Configure Environment Variables

**Required:**
```
MONGO_URI = mongodb+srv://username:PASSWORD@cluster.mongodb.net/signaltrue
OPENAI_API_KEY = sk-...
```

**Recommended:**
```
API_KEY = generate-a-random-secret-key
OPENAI_MODEL = gpt-3.5-turbo
```

**Optional (if using):**
```
ANTHROPIC_API_KEY = sk-ant-...
SLACK_BOT_TOKEN = xoxb-...
GOOGLE_SERVICE_ACCOUNT = {"type":"service_account",...}
EMAIL_HOST = smtp.gmail.com
EMAIL_USER = your-email@gmail.com
EMAIL_PASSWORD = your-16-char-app-password
EMAIL_FROM = SignalTrue <your-email@gmail.com>
NOTIFICATION_EMAIL = recipient@example.com
```

### Step 5: Deploy
- [ ] Click "Apply" to start deployment
- [ ] Wait 3-5 minutes for build to complete
- [ ] Check deployment logs for errors

### Step 6: Verify Backend
- [ ] Visit backend URL: `https://signaltrue-backend.onrender.com`
- [ ] Should see: "SignalTrue backend is running 🚀"
- [ ] Test API: `curl https://signaltrue-backend.onrender.com/api/teams`

---

## Frontend Deployment (Vercel)

### Step 1: Create Vercel Account
- [ ] Sign up at https://vercel.com
- [ ] Connect GitHub account

### Step 2: Import Project
- [ ] Click "Add New..." → "Project"
- [ ] Select your GitHub repository
- [ ] Framework: Create React App (auto-detected)
- [ ] Root Directory: `./` (leave empty)

### Step 3: Configure Environment Variable
- [ ] Go to Project Settings → Environment Variables
- [ ] Add: `REACT_APP_API_URL` = `https://signaltrue-backend.onrender.com`
- [ ] Add to: Production, Preview, Development

### Step 4: Deploy
- [ ] Click "Deploy"
- [ ] Wait 2-3 minutes for build
- [ ] Check build logs for errors

### Step 5: Verify Frontend
- [ ] Visit Vercel URL: `https://signaltrue.vercel.app`
- [ ] Dashboard should load with 3 teams
- [ ] Click "Analyze" button to test AI
- [ ] Click "📊 Timeline" to test charts
- [ ] Toggle dark mode

---

## Post-Deployment Configuration

### 1. Add Real Team Data
```bash
# Connect to your MongoDB Atlas
# Update teams collection with real team names and channel IDs

# Example document:
{
  "name": "Engineering",
  "slackChannelId": "C1234567890",
  "calendarId": "team@company.com",
  "zone": "Stable",
  "bdi": 50,
  "favorite": true
}
```

### 2. Set Baselines
```bash
# For each team, set initial baseline
TEAM_ID="..."  # Get from /api/teams
curl -X POST "https://signaltrue-backend.onrender.com/api/teams/$TEAM_ID/baseline" \
  -H "Content-Type: application/json" \
  -d '{"bdi": 50}'
```

### 3. Manual Data Refresh
```bash
# Refresh Slack data (if configured)
curl -X POST "https://signaltrue-backend.onrender.com/api/slack/refresh" \
  -H "x-api-key: your-api-key"

# Refresh Calendar data (if configured)
curl -X POST "https://signaltrue-backend.onrender.com/api/calendar/refresh-all" \
  -H "x-api-key: your-api-key"
```

### 4. Test Notifications
```bash
# Preview AI summary for a team
TEAM_ID="..."
curl "https://signaltrue-backend.onrender.com/api/notifications/preview/$TEAM_ID"

# Send test weekly summaries (optional)
curl -X POST "https://signaltrue-backend.onrender.com/api/notifications/weekly" \
  -H "x-api-key: your-api-key"
```

---

## Verify Cron Jobs

Cron jobs start automatically when backend is deployed:

- [ ] **Daily 2 AM**: Slack data refresh (check Render logs next morning)
- [ ] **Daily 2 AM**: Calendar data refresh (check Render logs next morning)
- [ ] **Monday 9 AM**: Weekly summaries (check Render logs Monday morning)

Check logs in Render Dashboard → Your Service → Logs tab

---

## Optional: Custom Domain

### Backend Domain (api.yourdomain.com)
- [ ] Go to Render → Settings → Custom Domain
- [ ] Add: `api.yourdomain.com`
- [ ] Update DNS: `CNAME api yourdomain.onrender.com`

### Frontend Domain (app.yourdomain.com)
- [ ] Go to Vercel → Settings → Domains
- [ ] Add: `app.yourdomain.com`
- [ ] Follow DNS configuration steps
- [ ] Update env: `REACT_APP_API_URL=https://api.yourdomain.com`
- [ ] Redeploy frontend

---

## Monitoring Setup

### Render Monitoring
- [ ] Enable email notifications for failed deployments
- [ ] Set up log retention (7 days on Starter plan)
- [ ] Monitor database connection count

### Vercel Monitoring
- [ ] Check function execution times
- [ ] Monitor bandwidth usage
- [ ] Review build logs for warnings

### MongoDB Atlas
- [ ] Set up performance alerts
- [ ] Monitor storage usage (512 MB on free tier)
- [ ] Review connection counts

---

## Security Checklist

- [ ] MongoDB authentication enabled
- [ ] MongoDB IP whitelist configured
- [ ] API_KEY set in Render environment
- [ ] HTTPS enforced (automatic on Render/Vercel)
- [ ] No secrets committed to Git
- [ ] .env files in .gitignore
- [ ] Service account credentials secured

---

## Testing Checklist

After deployment, test:

### Frontend
- [ ] Dashboard loads with teams
- [ ] Dark mode toggle works
- [ ] Team cards display correctly
- [ ] Timeline modal opens and shows graph
- [ ] Organization dashboard expands
- [ ] AI analyze button works
- [ ] Mobile responsive layout

### Backend
- [ ] Health check returns 200
- [ ] GET /api/teams returns data
- [ ] POST /api/analyze generates playbook
- [ ] GET /api/teams/:id/history returns data
- [ ] POST /api/notifications/preview works
- [ ] Admin endpoints require API key

### Integrations
- [ ] Slack data refreshes successfully
- [ ] Calendar data fetches successfully
- [ ] Email notifications send successfully
- [ ] Cron jobs execute on schedule

---

## Cost Tracking

Keep track of your monthly costs:

| Service | Cost | Notes |
|---------|------|-------|
| Render (Starter) | $7/month | Backend hosting |
| Vercel (Hobby) | Free | Frontend hosting |
| MongoDB (M0) | Free | Database (512 MB) |
| OpenAI API | ~$5-10/month | Based on usage |
| Slack API | Free | - |
| Gmail SMTP | Free | - |
| **Total** | **~$12-17/month** | For small team |

---

## Troubleshooting

### Backend won't start
- Check Render logs for error messages
- Verify MONGO_URI is correct
- Ensure all required env vars are set

### Frontend can't reach backend
- Verify REACT_APP_API_URL in Vercel
- Check backend is running (visit backend URL)
- Redeploy frontend after env changes

### AI analysis fails
- Verify API key is valid and has credits
- Check backend logs for API errors
- Test with curl to isolate issue

### Cron jobs not running
- Verify service is on paid Render plan (not free)
- Check Render logs at scheduled times
- Ensure required env vars are set

---

## Success Criteria

✅ Backend deployed and accessible  
✅ Frontend deployed and loading teams  
✅ MongoDB connected and persisting data  
✅ AI analysis generating playbooks  
✅ Timeline graphs displaying historical data  
✅ Organization dashboard showing metrics  
✅ Cron jobs executing on schedule  
✅ (Optional) Slack integration working  
✅ (Optional) Calendar integration working  
✅ (Optional) Email notifications sending  

---

## Next Steps

After successful deployment:

1. **Invite Users**: Share Vercel URL with team
2. **Monitor Usage**: Check `/api/ai-usage` endpoint regularly
3. **Set Baselines**: Establish baseline for each team
4. **Configure Alerts**: Set up monitoring alerts
5. **Document Access**: Create internal wiki with credentials
6. **Schedule Reviews**: Weekly check-ins on team BDI trends

---

## Support

Need help? Check:
- **Full Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Project Overview**: [README.md](README.md)
- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs

---

**🎉 You're ready to deploy SignalTrue!**

Follow this checklist step-by-step and you'll have a production-ready performance monitoring system for your teams.
