# Environment Variables Quick Reference

## Backend (Railway)

### Required
```bash
NODE_ENV=production
PORT=8080
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/signaltrue?retryWrites=true&w=majority
JWT_SECRET=<generate-with-crypto-randomBytes-32-chars-min>
```

### Optional (Features)
```bash
FRONTEND_URL=https://signaltrue.vercel.app
SLACK_CLIENT_ID=<from-slack-app>
SLACK_CLIENT_SECRET=<from-slack-app>
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
MICROSOFT_CLIENT_ID=<from-azure-ad>
MICROSOFT_CLIENT_SECRET=<from-azure-ad>
```

### Optional (AI & Email)
```bash
# LLM explanations for Engagement Strain drivers (graceful fallback if unset)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini        # Default: gpt-4o-mini

# SMTP for weekly engagement strain email digest (no-op if unset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=<app-password>
SMTP_FROM="SignalTrue <noreply@signaltrue.com>"
```

## Frontend (Vercel)

### Required
```bash
REACT_APP_API_URL=https://signaltrue-backend.up.railway.app
```

### Optional (OAuth)
```bash
REACT_APP_SLACK_CLIENT_ID=<same-as-backend>
REACT_APP_GOOGLE_CLIENT_ID=<same-as-backend>
REACT_APP_OUTLOOK_CLIENT_ID=<same-as-backend>
```

## Generate Secrets

```bash
# JWT Secret (32+ characters):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (if needed):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## MongoDB Atlas Setup

1. Create M0 Free cluster
2. Create database user
3. Allow access from anywhere (0.0.0.0/0)
4. Get connection string
5. Add `/signaltrue` database name to URI
6. Test connection before deployment
