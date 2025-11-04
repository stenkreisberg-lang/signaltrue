# Vercel + Render OAuth Configuration Guide

This guide explains how to configure OAuth integrations when deploying SignalTrue with:
- **Frontend on Vercel** (React app)
- **Backend on Render** (Node.js API server with cron jobs)

## Architecture Overview

```
┌─────────────────────┐         ┌──────────────────────────┐
│  Vercel              │         │  Render                  │
│  Frontend            │────────▶│  Backend API             │
│  app.signaltrue.ai   │   API   │  api.signaltrue.com      │
└─────────────────────┘         └──────────────────────────┘
                                          │
                                          ├──▶ Slack OAuth
                                          ├──▶ Google OAuth  
                                          └──▶ Microsoft OAuth
```

## Why This Architecture?

The backend needs to run on a traditional Node.js server (Render/Railway) because it:
- Runs cron jobs for scheduled data refreshes
- Maintains persistent database connections
- Has long-running processes

Vercel is perfect for the React frontend (static files + CDN).

---

## Prerequisites

Before starting, you'll need:
1. ✅ GitHub account with your SignalTrue repository
2. ✅ Vercel account (free tier works)
3. ✅ Render account (free tier works initially)
4. ✅ MongoDB Atlas account with cluster created
5. ✅ OpenAI or Anthropic API key

---

## Part 1: Backend Deployment on Render

### Step 1: Deploy Backend

1. Go to https://render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `signaltrue-backend`
   - **Region**: Oregon (or nearest)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Starter ($7/month) or Free

5. Add **Essential** environment variables:
```
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/signaltrue
OPENAI_API_KEY=sk-...
API_KEY=your-random-secret-key-for-admin-endpoints
```

6. Click **"Create Web Service"**

Your backend will be deployed to: `https://signaltrue-backend.onrender.com`

### Step 2: Verify Backend

Visit your backend URL. You should see:
```
SignalTrue backend is running 🚀
```

Test the API:
```bash
curl https://signaltrue-backend.onrender.com/api/integrations/status
```

---

## Part 2: Frontend Deployment on Vercel

### Step 1: Deploy Frontend

1. Go to https://vercel.com
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect it's a Create React App
5. **Important**: Leave Root Directory as `./` (not `backend`)

### Step 2: Configure Environment Variables

In Vercel Project Settings → Environment Variables, add:

```
REACT_APP_API_URL=https://signaltrue-backend.onrender.com
```

Apply to: **Production**, **Preview**, and **Development**

### Step 3: Deploy

Click **"Deploy"**

Your frontend will be at: `https://signaltrue.vercel.app` (or your custom domain)

---

## Part 3: OAuth Configuration

Now that both frontend and backend are deployed, configure OAuth integrations.

### Slack OAuth Setup

#### Step 1: Create Slack App
1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. Name: `SignalTrue`
4. Select your workspace

#### Step 2: Configure OAuth & Permissions
1. Go to **"OAuth & Permissions"**
2. Under **"Redirect URLs"**, add:
   ```
   https://signaltrue-backend.onrender.com/api/integrations/slack/oauth/callback
   ```
   
   For local development, also add:
   ```
   http://localhost:8080/api/integrations/slack/oauth/callback
   ```

3. Under **"Bot Token Scopes"**, add:
   - `channels:history`
   - `channels:read`
   - `chat:write`
   - `users:read`
   - `team:read`

#### Step 3: Get Credentials
1. Go to **"Basic Information"** → **"App Credentials"**
2. Copy **Client ID** and **Client Secret**

#### Step 4: Add to Render
In Render → Your Service → Environment, add:
```
SLACK_CLIENT_ID=1234567890.1234567890
SLACK_CLIENT_SECRET=abcdef1234567890abcdef1234567890
SLACK_REDIRECT_URI=https://signaltrue-backend.onrender.com/api/integrations/slack/oauth/callback
APP_URL=https://signaltrue.vercel.app
```

⚠️ **Important**: After adding env vars, Render will auto-redeploy your backend.

---

### Google OAuth Setup

#### Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Enable **Google Calendar API** and **Gmail API**

#### Step 2: Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Application type: **Web application**
4. Name: `SignalTrue`

5. Under **"Authorized redirect URIs"**, add:
   ```
   https://signaltrue-backend.onrender.com/api/integrations/google/oauth/callback
   http://localhost:8080/api/integrations/google/oauth/callback
   ```

#### Step 3: Get Credentials
Copy the **Client ID** and **Client Secret**

#### Step 4: Add to Render
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://signaltrue-backend.onrender.com/api/integrations/google/oauth/callback
```

---

### Microsoft/Outlook OAuth Setup

#### Step 1: Register Azure App
1. Go to https://portal.azure.com
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **"New registration"**
   - Name: `SignalTrue`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**

#### Step 2: Configure Redirect URIs
1. Go to **Authentication** → **Add a platform** → **Web**
2. Add redirect URIs:
   ```
   https://signaltrue-backend.onrender.com/api/integrations/microsoft/oauth/callback
   http://localhost:8080/api/integrations/microsoft/oauth/callback
   ```

#### Step 3: Get Credentials
1. Go to **Overview** → Copy **Application (client) ID**
2. Go to **Certificates & secrets** → **New client secret** → Copy the **Value**

#### Step 4: Add API Permissions
1. Go to **API permissions** → **Add a permission** → **Microsoft Graph**
2. Add **Delegated permissions**:
   - `Calendars.Read`
   - `Mail.Read`
   - `User.Read`
   - `offline_access`

#### Step 5: Add to Render
```
MS_APP_CLIENT_ID=your-app-client-id
MS_APP_CLIENT_SECRET=your-client-secret
MS_APP_TENANT=common
MS_APP_REDIRECT_URI=https://signaltrue-backend.onrender.com/api/integrations/microsoft/oauth/callback
```

---

## Part 4: Verification

### Test OAuth Flow

1. Visit your Vercel frontend: `https://signaltrue.vercel.app`
2. Log in with admin credentials
3. Navigate to organization settings
4. Try connecting each integration:

#### Slack
- Click **"Connect Slack"**
- Should redirect to Slack authorization
- Approve permissions
- Should redirect back to your dashboard with success message

#### Google (Calendar/Gmail)
- Click **"Connect Google Calendar"** or **"Connect Gmail"**
- Should redirect to Google sign-in
- Select your account and approve permissions
- Should redirect back to your dashboard

#### Microsoft (Outlook/Teams)
- Click **"Connect Outlook"** or **"Connect Teams"**
- Should redirect to Microsoft sign-in
- Approve permissions
- Should redirect back to your dashboard

### Check Integration Status

Visit: `https://signaltrue-backend.onrender.com/api/integrations/status`

You should see:
```json
{
  "available": {
    "slack": true,
    "teams": true,
    "gmail": true,
    "outlook": true,
    "calendar": true
  },
  "connected": {
    "slack": false,
    "teams": false,
    "gmail": false,
    "outlook": false,
    "calendar": false
  },
  "oauth": {
    "slack": "/api/integrations/slack/oauth/start",
    "teams": "/api/integrations/microsoft/oauth/start?scope=teams",
    ...
  }
}
```

**"available"** should show `true` for integrations where you've set the client ID.

---

## Complete Environment Variables Reference

### Backend (Render)

#### Required
```bash
NODE_ENV=production
PORT=8080
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/signaltrue
OPENAI_API_KEY=sk-...
API_KEY=your-admin-key
APP_URL=https://signaltrue.vercel.app
```

#### OAuth (Optional but recommended)
```bash
# Slack
SLACK_CLIENT_ID=1234567890.1234567890
SLACK_CLIENT_SECRET=abc123...
SLACK_REDIRECT_URI=https://signaltrue-backend.onrender.com/api/integrations/slack/oauth/callback

# Google
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=https://signaltrue-backend.onrender.com/api/integrations/google/oauth/callback

# Microsoft
MS_APP_CLIENT_ID=your-client-id
MS_APP_CLIENT_SECRET=your-secret
MS_APP_TENANT=common
MS_APP_REDIRECT_URI=https://signaltrue-backend.onrender.com/api/integrations/microsoft/oauth/callback
```

### Frontend (Vercel)

```bash
REACT_APP_API_URL=https://signaltrue-backend.onrender.com
```

---

## Troubleshooting

### "localhost refused to connect"
**Cause**: Frontend is trying to call `localhost:8080` in production.

**Fix**: Ensure `REACT_APP_API_URL` is set in Vercel to your Render backend URL, then redeploy frontend.

### "OAuth not configured" error
**Cause**: Missing OAuth environment variables on backend.

**Fix**: Verify all three variables are set:
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_REDIRECT_URI`

### OAuth redirect URL mismatch
**Cause**: The redirect URI in your OAuth app doesn't match what's in `SLACK_REDIRECT_URI`.

**Fix**: Make sure the URLs match exactly, including `https://` and no trailing slashes.

### "Unexpected token '<'" or JSON parse errors
**Cause**: Backend is not reachable, frontend is getting HTML error page instead of JSON.

**Fix**: 
1. Check backend is running: visit `https://signaltrue-backend.onrender.com`
2. Verify `REACT_APP_API_URL` in Vercel
3. Redeploy frontend after changing env vars

### Render service won't start
**Cause**: Missing required environment variables.

**Fix**: Ensure at minimum `MONGO_URI` and `OPENAI_API_KEY` are set in Render.

---

## Custom Domains (Optional)

### Backend Domain
1. In Render → Settings → Custom Domain
2. Add: `api.yourdomain.com`
3. Update DNS: `CNAME api yourapp.onrender.com`
4. Update all OAuth redirect URIs to use `api.yourdomain.com`
5. Update `APP_URL` if frontend domain changed

### Frontend Domain
1. In Vercel → Settings → Domains
2. Add: `app.yourdomain.com`
3. Follow Vercel's DNS instructions
4. Update `REACT_APP_API_URL` to use `api.yourdomain.com`
5. Update `APP_URL` in Render to use `app.yourdomain.com`
6. Redeploy frontend

---

## Security Checklist

- [ ] `MONGO_URI` uses strong password and is not committed to Git
- [ ] OAuth client secrets are set in Render environment (not in code)
- [ ] `API_KEY` is set for admin endpoints
- [ ] Redirect URIs in OAuth apps match your Render backend URL exactly
- [ ] `.env` files are in `.gitignore`
- [ ] HTTPS is enforced (automatic on Render and Vercel)

---

## Next Steps

After OAuth is configured:
1. ✅ Test each integration from your frontend
2. ✅ Invite team members to connect their accounts
3. ✅ Monitor Render logs for OAuth callback successes/failures
4. ✅ Set up monitoring for your Render service
5. ✅ Configure custom domains if desired

---

## Need Help?

Common resources:
- **Slack API Docs**: https://api.slack.com/docs
- **Google OAuth**: https://developers.google.com/identity/protocols/oauth2
- **Microsoft Graph**: https://learn.microsoft.com/en-us/graph/auth-v2-user
- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs

---

**🎉 You're all set!** Your SignalTrue deployment should now have working OAuth integrations.
