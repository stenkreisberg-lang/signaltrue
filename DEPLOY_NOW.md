# 🚀 Deploy SignalTrue - Step by Step Guide

## ✅ Status: Ready to Deploy!
- Frontend: Tested ✅ (compiles successfully)
- Backend: Tested ✅ (runs on port 8080)
- Latest code: Pushed to GitHub ✅
- Production build: Created ✅ (103.76 kB)

---

## 📦 STEP 1: Deploy Frontend to Vercel (5 minutes)

### Go to: https://vercel.com

1. **Sign In** with your GitHub account
2. Click **"Add New..."** → **"Project"**
3. Find and click **"Import"** next to `stenkreisberg-lang/signaltrue`
4. **Configure Project:**
   - Framework Preset: **Create React App** (auto-detected)
   - Root Directory: `./` (leave empty/default)
   - Build Command: `npm run build` (auto-filled)
   - Output Directory: `build` (auto-filled)
   - Install Command: `npm install` (auto-filled)
5. **Environment Variables** (Optional - add later):
   - Leave empty for now, we'll add backend URL after step 2
6. Click **"Deploy"** button
7. Wait 2-3 minutes for build to complete
8. ✅ **Save your URL**: `https://signaltrue-xxx.vercel.app`

---

## 🖥️ STEP 2: Deploy Backend to Railway (5 minutes)

### Go to: https://railway.app

1. **Sign In** with your GitHub account
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose **`stenkreisberg-lang/signaltrue`**
5. **Configure Service:**
   - Click on the service → **Settings**
   - **Root Directory**: `backend`
   - **Start Command**: `node server.js`
   - **Build Command**: (leave empty)
6. **Add Environment Variables** (Settings → Variables):
   
   Click **"+ New Variable"** for each:
   
   ```
   MONGO_URI = mongodb+srv://user:pass@cluster.mongodb.net/signaltrue
   PORT = 8080
   FRONTEND_URL = https://signaltrue-xxx.vercel.app
   JWT_SECRET = your-random-secret-here-change-this
   ENCRYPTION_KEY = <see below to generate>
   ```

   **Optional (for OAuth features):**
   ```
   SLACK_CLIENT_ID = your_slack_client_id
   SLACK_CLIENT_SECRET = your_slack_client_secret
   GOOGLE_CLIENT_ID = your_google_client_id
   GOOGLE_CLIENT_SECRET = your_google_client_secret
   MICROSOFT_CLIENT_ID = your_microsoft_client_id
   MICROSOFT_CLIENT_SECRET = your_microsoft_client_secret
   ```

7. Click **"Deploy"**
8. Wait 2-3 minutes for deployment
9. ✅ **Save your URL**: Click on service → Settings → copy the public URL
   (will be like: `https://signaltrue-backend-production.up.railway.app`)

---

## 🔐 STEP 3: Generate Encryption Key

Run this in your terminal:
```bash
node -p "require('crypto').randomBytes(32).toString('hex')"
```
Copy the output and use it as `ENCRYPTION_KEY` in Railway.

---

## 🗄️ STEP 4: Set Up MongoDB (5 minutes) - Optional but Recommended

### Go to: https://mongodb.com/cloud/atlas

1. **Sign in** or create free account
2. Click **"Create"** to create a new cluster
3. Choose **"M0 Free"** tier
4. Choose your preferred region
5. Click **"Create Cluster"**
6. Wait for cluster to be created (2-3 minutes)
7. Click **"Connect"** → **"Drivers"**
8. Copy the connection string, it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/signaltrue
   ```
9. Replace `<username>` and `<password>` with your database credentials
10. Go back to Railway → Update `MONGO_URI` environment variable
11. Click **"Redeploy"** in Railway

---

## 🔗 STEP 5: Connect Frontend to Backend

1. Go back to **Vercel dashboard**
2. Click on your **signaltrue** project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   ```
   Name: REACT_APP_API_URL
   Value: https://signaltrue-backend-production.up.railway.app
   ```
5. Click **"Save"**
6. Go to **Deployments** tab
7. Click **"Redeploy"** on the latest deployment

---

## ✅ STEP 6: Test Your Deployment

### Test Frontend:
1. Visit your Vercel URL: `https://signaltrue-xxx.vercel.app`
2. Check these pages load:
   - Home page
   - Product page (`/product`)
   - Pricing page (`/pricing`)
   - About page (`/about`)
   - Contact page (`/contact`)

### Test Backend:
1. Open: `https://your-railway-url.up.railway.app/` (should see "SignalTrue backend is running 🚀")
2. Test API: `https://your-railway-url.up.railway.app/api/integrations/status?orgSlug=test`

---

## 🎉 You're Live!

Your SignalTrue platform is now deployed and accessible worldwide!

**Frontend**: https://signaltrue-xxx.vercel.app  
**Backend**: https://your-railway-url.up.railway.app

---

## 📝 Next Steps (Optional)

1. **Custom Domain**: Add custom domain in Vercel settings
2. **OAuth Setup**: Configure redirect URIs in Slack/Google/Microsoft developer consoles
3. **Monitoring**: Set up alerts in Railway for downtime
4. **Analytics**: Add Google Analytics to track visitors

---

## 🐛 Troubleshooting

**Frontend doesn't load:**
- Check Vercel deployment logs
- Verify build succeeded
- Check browser console for errors

**Backend errors:**
- Check Railway logs (Click on service → Logs)
- Verify all environment variables are set
- Check MongoDB connection string is correct

**"CORS error" in browser:**
- Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly
- Redeploy backend after updating

---

## 📞 Support

If you encounter issues:
1. Check Railway logs for backend errors
2. Check Vercel deployment logs for frontend errors
3. Verify all environment variables are set correctly
4. Ensure MongoDB is accessible (whitelist IP 0.0.0.0/0 in Atlas)

---

**Total Time: ~15-20 minutes**  
**Cost: $0 (all free tiers)**
