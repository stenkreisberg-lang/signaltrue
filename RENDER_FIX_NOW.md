# 🚨 URGENT: Fix Render MongoDB Authentication Error

## Problem
Backend on Render is failing with: `MongoServerError: Authentication failed.`

## Root Cause
The `MONGO_URI` environment variable on Render is either missing or contains old/incorrect credentials.

## ✅ WORKING Credentials (Verified Locally)
```
mongodb+srv://signaltrue:123signaltrue@cluster0.4olk5ma.mongodb.net/signaltrue?retryWrites=true&w=majority
```

---

## 🔧 SOLUTION: Update Render Environment Variables

### Step 1: Go to Render Dashboard
1. Open: **https://dashboard.render.com**
2. Sign in with GitHub
3. Click on **`signaltrue-backend`** service

### Step 2: Update Environment Variables
1. Click **"Environment"** in the left sidebar
2. Find `MONGO_URI` variable
3. Click **"Edit"** or add if missing
4. Paste this exact value:
   ```
   mongodb+srv://signaltrue:123signaltrue@cluster0.4olk5ma.mongodb.net/signaltrue?retryWrites=true&w=majority
   ```
5. Click **"Save Changes"**

### Step 3: Verify Other Required Variables
Make sure these are also set:

```bash
JWT_SECRET = your-secret-key-change-in-production-to-something-secure
FRONTEND_URL = https://signaltrue.ai
BACKEND_URL = https://signaltrue-backend.onrender.com
PORT = 8080
NODE_ENV = production
```

### Step 4: Redeploy (Automatic)
- Render will **automatically redeploy** after saving environment variables
- Wait 2-3 minutes for deployment
- Check logs for: `✅ MongoDB Connected`

---

## 🔍 Alternative: MongoDB Atlas IP Whitelist

If the above doesn't work, check MongoDB Atlas:

1. Go to: **https://cloud.mongodb.com**
2. Select your cluster: **cluster0.4olk5ma**
3. Click **"Network Access"** (left sidebar)
4. Make sure **`0.0.0.0/0`** is in the IP whitelist
5. If not, click **"Add IP Address"** → **"Allow Access from Anywhere"**
6. Click **"Confirm"**

---

## 📊 Expected Result

After fixing, you should see in Render logs:
```
✅ MongoDB Connected
[Server] Starting SignalTrue API...
Server running on port 8080
```

---

## ⏱️ Time Required
- **2 minutes** to update env vars
- **2-3 minutes** for Render to redeploy
- **Total: ~5 minutes**

---

**ACTION REQUIRED:** Please go to Render dashboard NOW and update the MONGO_URI environment variable.
