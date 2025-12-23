# 🚀 SignalTrue Production Deployment Guide

**Status**: Ready to deploy ✅  
**Last Updated**: December 23, 2025  
**Commit**: fb59564

---

## ✅ Pre-Deployment Checklist

- [x] Frontend builds successfully (`npm run build`)
- [x] Backend starts without errors (`node server.js`)
- [x] Jest tests configured for ESM modules
- [x] Debug code removed from production routes
- [x] Code pushed to GitHub (`stenkreisberg-lang/signaltrue`)
- [ ] MongoDB Atlas cluster created
- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] End-to-end testing completed

---

## 📦 STEP 1: Create MongoDB Atlas Database (5 minutes)

### 1.1 Create Free Cluster
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up or sign in
3. Click **"Create"** → **"Deploy a database"**
4. Select **M0 Free** tier
5. Choose your preferred cloud provider & region (AWS recommended)
6. Cluster name: `signaltrue-production`
7. Click **"Create Deployment"**

### 1.2 Create Database User
1. Username: `signaltrue-admin`
2. Password: Generate a secure password (save this!)
3. Click **"Create Database User"**

### 1.3 Configure Network Access
1. Click **"Network Access"** in left sidebar
2. Click **"Add IP Address"**
3. Select **"Allow Access from Anywhere"** (0.0.0.0/0)
4. Click **"Confirm"**

### 1.4 Get Connection String
1. Click **"Database"** → **"Connect"**
2. Click **"Drivers"**
3. Copy the connection string:
   ```
   mongodb+srv://signaltrue-admin:<password>@signaltrue-production.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. Add database name: `signaltrue` at the end:
   ```
   mongodb+srv://signaltrue-admin:YOUR_PASSWORD@signaltrue-production.xxxxx.mongodb.net/signaltrue?retryWrites=true&w=majority
   ```
6. **Save this MONGO_URI** - you'll need it for Railway

---

## 🚂 STEP 2: Deploy Backend to Railway (10 minutes)

### 2.1 Create Railway Account
1. Go to https://railway.app
2. Sign in with GitHub
3. Authorize Railway to access your repositories

### 2.2 Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose **`stenkreisberg-lang/signaltrue`**
4. Railway will detect the repository

### 2.3 Configure Service
1. Click on the deployed service
2. Click **"Settings"** tab
3. **Root Directory**: `backend`
4. **Start Command**: `node server.js`
5. **Build Command**: (leave empty)

### 2.4 Add Environment Variables
Click **"Variables"** tab, then add these one by one:

#### Required Variables:
```bash
NODE_ENV=production
PORT=8080
MONGO_URI=mongodb+srv://signaltrue-admin:YOUR_PASSWORD@signaltrue-production.xxxxx.mongodb.net/signaltrue?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-please
```

#### Generate JWT_SECRET:
```bash
# Run this in your terminal to generate a secure secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Optional Variables (for OAuth - add later):
```bash
FRONTEND_URL=https://your-app.vercel.app
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2.5 Deploy
1. Click **"Deploy"**
2. Wait 3-5 minutes for build to complete
3. Check **"Deployments"** tab for status

### 2.6 Get Backend URL
1. Click **"Settings"** → **"Domains"**
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `https://signaltrue-backend-production.up.railway.app`)
4. **Save this URL** - you'll need it for Vercel

### 2.7 Verify Backend
```bash
# Test in your terminal:
curl https://your-backend-url.up.railway.app/

# Should return:
# SignalTrue backend is running 🚀
```

---

## ▲ STEP 3: Deploy Frontend to Vercel (10 minutes)

### 3.1 Create Vercel Account
1. Go to https://vercel.com/signup
2. Sign up with GitHub
3. Authorize Vercel to access your repositories

### 3.2 Import Project
1. Click **"Add New..."** → **"Project"**
2. Find **`stenkreisberg-lang/signaltrue`**
3. Click **"Import"**

### 3.3 Configure Project
**Framework Preset**: Create React App (auto-detected)  
**Root Directory**: `./` (leave as repository root)  
**Build Command**: `npm run build` (auto-detected)  
**Output Directory**: `build` (auto-detected)  
**Install Command**: `npm install` (auto-detected)

### 3.4 Add Environment Variables
Click **"Environment Variables"**, add:

```bash
# Required: Backend API URL (from Railway Step 2.6)
REACT_APP_API_URL=https://your-backend-url.up.railway.app

# Optional: OAuth Client IDs (if using OAuth)
REACT_APP_SLACK_CLIENT_ID=your-slack-client-id
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
REACT_APP_OUTLOOK_CLIENT_ID=your-microsoft-client-id
```

### 3.5 Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. Vercel will automatically deploy on every push to `main`

### 3.6 Get Frontend URL
1. After deployment completes, copy your production URL
2. Example: `https://signaltrue.vercel.app`
3. This is your live application URL!

### 3.7 Update Backend FRONTEND_URL
1. Go back to Railway
2. Update the `FRONTEND_URL` environment variable to your Vercel URL
3. Redeploy the backend service

---

## 🔐 STEP 4: Configure OAuth Apps (Optional)

### 4.1 Slack OAuth App
1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. App Name: `SignalTrue`
4. Pick a workspace for development
5. Click **"OAuth & Permissions"**
6. **Redirect URLs**: Add `https://your-frontend.vercel.app/auth/slack/callback`
7. **Scopes** → **Bot Token Scopes**: Add:
   - `channels:read`
   - `groups:read`
   - `users:read`
   - `team:read`
8. **Install to Workspace**
9. Copy **Client ID** and **Client Secret**
10. Add to Railway and Vercel environment variables

### 4.2 Google OAuth App
1. Go to https://console.cloud.google.com/
2. Create new project: `SignalTrue`
3. Enable **Google Calendar API** and **People API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. **Authorized redirect URIs**: `https://your-frontend.vercel.app/auth/google/callback`
7. Copy **Client ID** and **Client Secret**
8. Add to Railway and Vercel environment variables

### 4.3 Microsoft OAuth App
1. Go to https://portal.azure.com/
2. **Azure Active Directory** → **App registrations** → **New registration**
3. Name: `SignalTrue`
4. **Redirect URI**: `https://your-frontend.vercel.app/auth/outlook/callback`
5. **API permissions** → **Add permission** → **Microsoft Graph**:
   - `offline_access`
   - `Calendars.Read`
   - `Mail.Read`
   - `User.Read`
6. **Certificates & secrets** → Create new client secret
7. Copy **Application (client) ID** and **Client Secret**
8. Add to Railway and Vercel environment variables

---

## ✅ STEP 5: Post-Deployment Testing

### 5.1 Test Backend Health
```bash
curl https://your-backend.railway.app/
# Expected: "SignalTrue backend is running 🚀"
```

### 5.2 Test Frontend
1. Visit `https://your-frontend.vercel.app`
2. Should see homepage
3. Click **"Get Started"** or **"Sign Up"**
4. Complete registration flow

### 5.3 Test Registration & Login
```bash
# Test registration:
curl -X POST https://your-backend.railway.app/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "name": "Test User",
    "role": "hr_admin",
    "companyName": "Test Company"
  }'

# Should return JWT token and user object
```

### 5.4 Test Admin Onboarding
1. Log in with test account
2. Navigate to `/admin/onboarding`
3. Verify integration buttons appear
4. Test OAuth flow (if configured)

---

## 🎯 Production URLs

After deployment, update this section with your actual URLs:

- **Frontend**: https://signaltrue.vercel.app
- **Backend API**: https://signaltrue-backend-production.up.railway.app
- **MongoDB**: mongodb+srv://signaltrue-production.xxxxx.mongodb.net

---

## 🔄 Continuous Deployment

Both Vercel and Railway are configured for automatic deployment:

- **Push to `main`** → Automatic deployment
- **Pull Request** → Preview deployment (Vercel only)
- **Rollback** → One-click rollback in Vercel/Railway dashboards

---

## 🐛 Troubleshooting

### Backend won't start
- Check Railway logs: **"View Logs"** in service
- Verify all required env vars are set
- Verify MONGO_URI is correct and database allows connections

### Frontend shows blank page
- Check browser console for errors
- Verify `REACT_APP_API_URL` is set correctly
- Verify backend is accessible from frontend

### OAuth redirect errors
- Verify redirect URIs match exactly in OAuth app settings
- Verify client IDs match in both Railway and Vercel
- Check CORS settings in backend allow frontend domain

### Database connection errors
- Verify MongoDB Atlas allows connections from 0.0.0.0/0
- Verify MONGO_URI password is correct
- Verify database name is appended to connection string

---

## 📞 Support

If you encounter issues:
1. Check Railway logs: `Service → Deployments → View Logs`
2. Check Vercel logs: `Deployment → View Function Logs`
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

---

## 🎉 Success!

Your SignalTrue application is now live at:
- **App**: https://your-frontend.vercel.app
- **API**: https://your-backend.railway.app

Share the app URL with your team and start onboarding!
