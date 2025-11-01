# 🚀 SignalTrue Deployment Guide

Complete guide for deploying SignalTrue to production.

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Vercel         │         │  Render/Railway  │         │  MongoDB    │
│  (Frontend)     │────────▶│  (Backend)       │────────▶│  Atlas      │
│  React SPA      │   API   │  Node.js + Cron  │  Store  │  Database   │
└─────────────────┘         └──────────────────┘         └─────────────┘
                                     │
                                     ├─────▶ OpenAI/Anthropic API
                                     ├─────▶ Slack API
                                     ├─────▶ Google Calendar API
                                     └─────▶ SMTP Server (emails)
```

---

## Part 1: Backend Deployment (Render)

### Prerequisites
1. **MongoDB Atlas** account with cluster created
2. **Render** account (https://render.com)
3. API keys ready:
   - OpenAI or Anthropic API key
   - Slack Bot Token (optional)
   - Google Service Account JSON (optional)
   - SMTP credentials (optional)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Production ready"
git push origin main
```

### Step 2: Deploy on Render

#### Option A: Using Blueprint (Recommended)
1. Go to https://dashboard.render.com/blueprints
2. Click **"New Blueprint Instance"**
3. Connect your GitHub repo: `stenkreisberg-lang/signaltrue`
4. Select the repository
5. Render will detect `render.yaml` automatically
6. Fill in the environment variables:

**Required:**
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/signaltrue
OPENAI_API_KEY=sk-...
```

**Optional:**
```
ANTHROPIC_API_KEY=sk-ant-...
SLACK_BOT_TOKEN=xoxb-...
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=SignalTrue <your-email@gmail.com>
NOTIFICATION_EMAIL=recipient@example.com
API_KEY=your-secret-admin-key
```

7. Click **"Apply"** to deploy

#### Option B: Manual Setup
1. Go to https://dashboard.render.com
2. Click **"New +" → "Web Service"**
3. Connect GitHub repository
4. Configure:
   - **Name**: signaltrue-backend
   - **Region**: Oregon (or nearest)
   - **Branch**: main
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Starter ($7/month)
5. Add environment variables (see above)
6. Click **"Create Web Service"**

### Step 3: Verify Backend
Once deployed, visit your backend URL:
```
https://signaltrue-backend.onrender.com/
```

Should see: `SignalTrue backend is running 🚀`

Test API:
```bash
curl https://signaltrue-backend.onrender.com/api/teams
```

---

## Part 2: Frontend Deployment (Vercel)

### Step 1: Deploy on Vercel

1. Go to https://vercel.com
2. Click **"Add New..." → "Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `./` (leave empty)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `build` (auto-detected)

### Step 2: Add Environment Variable

In Vercel project settings → Environment Variables:
```
REACT_APP_API_URL=https://signaltrue-backend.onrender.com
```

### Step 3: Redeploy
After adding the env var, trigger a redeploy:
- Go to Deployments tab
- Click **"Redeploy"** on the latest deployment

### Step 4: Verify Frontend
Visit your Vercel URL:
```
https://signaltrue.vercel.app
```

You should see the dashboard with teams loading from your backend.

---

## Part 3: MongoDB Atlas Setup

### Create Database
1. Go to https://cloud.mongodb.com
2. Create a new cluster (Free M0 tier available)
3. Set up database access:
   - Database Access → Add User
   - Create username/password
4. Network Access:
   - Add IP: `0.0.0.0/0` (allow from anywhere)
   - Or whitelist Render's IPs
5. Get connection string:
   - Click **"Connect" → "Connect your application"**
   - Copy the connection string
   - Replace `<password>` with your password

Example:
```
mongodb+srv://signaltrue:PASSWORD@cluster0.abcd.mongodb.net/signaltrue?retryWrites=true&w=majority
```

---

## Part 4: Optional Integrations

### Slack Bot Setup
1. Go to https://api.slack.com/apps
2. Create new app → From scratch
3. **OAuth & Permissions**:
   - Add scopes: `channels:history`, `channels:read`, `chat:write`
   - Install to workspace
   - Copy **Bot User OAuth Token** (starts with `xoxb-`)
4. Add bot to channels:
   ```
   /invite @SignalTrue
   ```
5. Get channel IDs:
   - Right-click channel → View channel details
   - Copy Channel ID from the bottom

### Google Calendar API
1. Go to https://console.cloud.google.com
2. Create new project
3. Enable **Google Calendar API**
4. Create Service Account:
   - IAM & Admin → Service Accounts → Create
   - Grant role: **Calendar Reader**
   - Create key (JSON format)
   - Download JSON file
5. Share calendars with service account email
6. Copy entire JSON content to `GOOGLE_SERVICE_ACCOUNT` env var

### Email Notifications (Gmail)
1. Enable 2-Factor Authentication on your Google account
2. Generate App Password:
   - Google Account → Security → 2-Step Verification
   - App passwords → Select app: Mail, device: Other
   - Copy the 16-character password
3. Use these env vars:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_FROM=SignalTrue <your-email@gmail.com>
   NOTIFICATION_EMAIL=recipient@example.com
   ```

---

## Part 5: Cron Jobs (Automatic on Render)

Render automatically runs these cron jobs when deployed:
- **Daily 2 AM**: Slack data refresh (if `SLACK_BOT_TOKEN` set)
- **Daily 2 AM**: Calendar data refresh (if `GOOGLE_SERVICE_ACCOUNT` set)
- **Monday 9 AM**: Weekly summary emails/Slack messages

No additional configuration needed! Render keeps the service running 24/7.

---

## Part 6: Testing Production Deployment

### Health Checks
```bash
# Backend health
curl https://signaltrue-backend.onrender.com/

# Get teams
curl https://signaltrue-backend.onrender.com/api/teams

# Test Slack refresh (if configured)
curl -X POST https://signaltrue-backend.onrender.com/api/slack/refresh \
  -H "x-api-key: your-api-key"

# Preview notification
TEAM_ID="..." # Get from /api/teams
curl https://signaltrue-backend.onrender.com/api/notifications/preview/$TEAM_ID
```

### Frontend Testing
1. Visit your Vercel URL
2. Check that teams load correctly
3. Click **"📊 Timeline"** on a team card
4. Click **"Analyze"** to test AI playbook generation
5. Expand **Organization Overview** section
6. Toggle dark mode

---

## Part 7: Environment Variables Reference

### Backend (.env or Render)

**Required:**
```bash
PORT=8080
MONGO_URI=mongodb+srv://...
OPENAI_API_KEY=sk-...        # OR Anthropic key
```

**AI Provider (choose one):**
```bash
# Option 1: OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo   # or gpt-4, gpt-4o-mini
AI_PROVIDER=openai

# Option 2: Anthropic
ANTHROPIC_API_KEY=sk-ant-...
AI_PROVIDER=anthropic
```

**Optional Integrations:**
```bash
# Slack
SLACK_BOT_TOKEN=xoxb-...

# Google Calendar
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}

# Email Notifications
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-password
EMAIL_FROM=SignalTrue <your-email@gmail.com>
NOTIFICATION_EMAIL=recipient@example.com

# Security
API_KEY=your-secret-key      # Protects /api/ai-usage and admin endpoints
```

### Frontend (.env.production or Vercel)
```bash
REACT_APP_API_URL=https://signaltrue-backend.onrender.com
```

---

## Part 8: Cost Estimates

### Free Tier Deployment
- **Vercel**: Free (Hobby plan)
- **Render**: $7/month (Starter plan, keeps service always on)
- **MongoDB Atlas**: Free (M0 tier, 512 MB storage)
- **Total**: ~$7/month

### With AI Usage
- **OpenAI GPT-3.5**: ~$0.002 per 1K tokens (~$0.10 per 1000 analyses)
- **Anthropic Claude**: ~$0.015 per 1K tokens (~$0.75 per 1000 analyses)
- **Slack/Calendar APIs**: Free
- **Gmail SMTP**: Free

**Estimated Total**: $10-15/month for small team usage

---

## Part 9: Custom Domain (Optional)

### Vercel Domain
1. Go to your Vercel project
2. Settings → Domains
3. Add your domain: `app.yourdomain.com`
4. Follow DNS configuration steps

### Render Domain
1. Go to your Render service
2. Settings → Custom Domain
3. Add: `api.yourdomain.com`
4. Update DNS:
   ```
   CNAME api yourdomain.onrender.com
   ```

### Update Frontend Env
After custom domain setup:
```bash
REACT_APP_API_URL=https://api.yourdomain.com
```

---

## Part 10: Monitoring & Logs

### Render Logs
- Dashboard → Your Service → Logs tab
- Shows cron job execution, API requests, errors
- Keep logs for 7 days on Starter plan

### Vercel Logs
- Project → Deployments → Click deployment → Logs
- Function logs available for 1 day on Hobby plan

### MongoDB Atlas Monitoring
- Cluster → Metrics
- View connection counts, operations, storage

---

## Troubleshooting

### Backend not starting
```bash
# Check Render logs for:
- MongoDB connection errors → Verify MONGO_URI
- Missing dependencies → Check package.json
- Port binding issues → Use process.env.PORT
```

### Frontend can't reach backend
```bash
# Verify:
1. REACT_APP_API_URL is set in Vercel
2. Backend is running (visit backend URL)
3. CORS is enabled (check server.js)
4. Redeploy frontend after env var change
```

### Cron jobs not running
```bash
# Check:
1. Render logs at scheduled times (2 AM, 9 AM Monday)
2. Required env vars are set (SLACK_BOT_TOKEN, etc.)
3. Service is on paid plan (free tier spins down)
```

### AI analysis fails
```bash
# Verify:
1. OPENAI_API_KEY or ANTHROPIC_API_KEY is valid
2. API key has sufficient credits
3. Check backend logs for API errors
```

---

## Security Checklist

- [ ] MongoDB has authentication enabled
- [ ] MongoDB IP whitelist configured (or 0.0.0.0/0 for cloud hosts)
- [ ] API_KEY set for admin endpoints
- [ ] Environment variables not committed to git
- [ ] HTTPS enforced (automatic on Vercel/Render)
- [ ] Rate limiting enabled on /api/analyze endpoint
- [ ] Service account credentials secured

---

## Next Steps After Deployment

1. **Add Real Teams**: Update MongoDB with actual team data
2. **Configure Slack Channels**: Set `slackChannelId` for each team
3. **Set Baselines**: Use `POST /api/teams/:id/baseline` to set initial baselines
4. **Test Notifications**: Run `POST /api/notifications/weekly` manually first
5. **Monitor Usage**: Check `/api/ai-usage` endpoint regularly
6. **Invite Users**: Share Vercel URL with your team

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas**: https://docs.atlas.mongodb.com
- **OpenAI API**: https://platform.openai.com/docs
- **Slack API**: https://api.slack.com/docs

---

**🎉 Congratulations! SignalTrue is now live in production!**
