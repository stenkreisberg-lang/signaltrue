# OAuth Setup Guide for SignalTrue

## The Issues You're Seeing

### Issue 1: "Unexpected token '<', '<!DOCTYPE'... is not valid JSON"
**Cause:** The frontend is trying to fetch data from the backend API, but it's getting HTML (likely a 404 page) instead of JSON. This happens when:
- The backend server isn't running on the expected URL
- The `REACT_APP_API_URL` environment variable is not set correctly in production
- The frontend is deployed but trying to call `localhost:8080` which doesn't exist in production

**Solution:** Set `REACT_APP_API_URL` to your Railway backend URL in Vercel.

### Issue 2: OAuth Buttons Are Disabled/Don't Work
**Cause:** The OAuth client IDs are not configured. The buttons check for:
- `REACT_APP_SLACK_CLIENT_ID`
- `REACT_APP_GOOGLE_CLIENT_ID`
- `REACT_APP_OUTLOOK_CLIENT_ID`

When these are `undefined`, the buttons show "disabled" or show error messages.

**Solution:** Create OAuth apps and add the client IDs to your environment variables.

### Issue 3: Invite Send Returns JSON Parse Error
**Cause:** Same as Issue 1 - the backend API is not reachable from production.

---

## How to Fix Everything

### Step 1: Set Up Backend on Railway (if not done)

1. Go to [Railway.app](https://railway.app)
2. Create a new project
3. Deploy from your GitHub repo (`stenkreisberg-lang/signaltrue`)
4. Set the root directory to `/backend`
5. Add environment variables in Railway:
   ```
   MONGO_URI=your-mongodb-atlas-connection-string
   PORT=8080
   JWT_SECRET=your-secret-key
   NODE_ENV=production
   ```
6. Note your Railway URL (e.g., `https://signaltrue-backend-production.up.railway.app`)

### Step 2: Configure Frontend Environment Variables in Vercel

1. Go to Vercel dashboard → Your Project → Settings → Environment Variables
2. Add these variables:

```
REACT_APP_API_URL=https://your-railway-backend-url.up.railway.app
REACT_APP_SLACK_CLIENT_ID=your-slack-client-id
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
REACT_APP_OUTLOOK_CLIENT_ID=your-microsoft-client-id
```

3. **Important:** After adding env vars, you MUST redeploy for them to take effect.

### Step 3: Create OAuth Apps

#### Slack OAuth App
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "SignalTrue" and select your workspace
4. Go to "OAuth & Permissions"
5. Add redirect URLs:
   - `https://your-vercel-domain.vercel.app/auth/slack/callback`
   - `http://localhost:3000/auth/slack/callback` (for local dev)
6. Add Bot Token Scopes:
   - `channels:read`
   - `groups:read`
   - `users:read`
   - `chat:write`
   - `team:read`
7. Copy the **Client ID** from "Basic Information" → "App Credentials"
8. Add to Vercel as `REACT_APP_SLACK_CLIENT_ID`

#### Google OAuth App
1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new project (or select existing)
3. Click "Create Credentials" → "OAuth client ID"
4. Select "Web application"
5. Add authorized redirect URIs:
   - `https://your-vercel-domain.vercel.app/auth/google/callback`
   - `http://localhost:3000/auth/google/callback`
6. Copy the **Client ID**
7. Add to Vercel as `REACT_APP_GOOGLE_CLIENT_ID`

#### Microsoft/Outlook OAuth App
1. Go to https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps
2. Click "New registration"
3. Name: "SignalTrue"
4. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
5. Add redirect URIs:
   - `https://your-vercel-domain.vercel.app/auth/outlook/callback`
   - `http://localhost:3000/auth/outlook/callback`
6. Go to "Certificates & secrets" → "Client secrets" → "New client secret"
7. Copy the **Application (client) ID** from the Overview page
8. Add to Vercel as `REACT_APP_OUTLOOK_CLIENT_ID`

### Step 4: Update Backend OAuth Secrets

In Railway, add these environment variables:

```
SLACK_CLIENT_SECRET=your-slack-client-secret
GOOGLE_CLIENT_SECRET=your-google-client-secret
OUTLOOK_CLIENT_SECRET=your-microsoft-client-secret
```

### Step 5: Redeploy

1. **Vercel:** Go to Deployments → Click "..." on latest → "Redeploy"
2. **Railway:** Should auto-deploy when you add env vars

### Step 6: Test

1. Visit your Vercel URL
2. Log in as an admin
3. Go to "Admin Onboarding"
4. You should see a warning if OAuth isn't fully configured
5. Click "Connect Slack" → should open Slack authorization
6. Click "Connect Google" → should open Google authorization
7. Fill out IT admin invite → should successfully create invite

---

## Local Development Setup

1. Copy `.env.example` to `.env` in the repo root:
   ```bash
   cp .env.example .env
   ```

2. Fill in the values:
   ```
   REACT_APP_API_URL=http://localhost:8080
   REACT_APP_SLACK_CLIENT_ID=your-slack-client-id
   REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
   REACT_APP_OUTLOOK_CLIENT_ID=your-microsoft-client-id
   ```

3. Start frontend: `npm start`
4. Start backend: `cd backend && node server.js`

---

## What I Fixed in the Code

1. **Added error handling** for JSON parse failures - now shows helpful message "Backend is not reachable"
2. **Removed disabled attributes** from OAuth buttons - they now show error messages instead
3. **Added configuration warning** - yellow banner appears when OAuth isn't set up
4. **Improved fetch error handling** - won't crash on HTML responses
5. **Created `.env` file** with template values
6. **Better error messages** - tells users exactly which env var is missing

---

## Next Steps After OAuth Setup

Once OAuth is working:
1. Users can connect their accounts
2. Backend needs to implement token exchange in the callback routes
3. Backend needs to store tokens and start polling APIs
4. Email provider (SendGrid/Mailgun) needs to be configured for invite emails
