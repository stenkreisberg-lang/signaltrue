#!/bin/bash

# Production Environment Setup for AI Recommendations
# Run this on your production server OR add these variables via hosting dashboard

echo "🚀 Setting up AI Recommendations in Production"
echo ""

cat << 'EOF'
═══════════════════════════════════════════════════════════════
PRODUCTION ENVIRONMENT VARIABLES
═══════════════════════════════════════════════════════════════

Add these to your production environment:

AI_RECOMMENDATIONS_ENABLED=true
AI_CONFIDENCE_THRESHOLD=70

Your existing OPENAI_API_KEY or ANTHROPIC_API_KEY will be used.

═══════════════════════════════════════════════════════════════
HOSTING PLATFORM INSTRUCTIONS
═══════════════════════════════════════════════════════════════

🔹 RENDER:
1. Go to https://dashboard.render.com
2. Select your backend service
3. Go to "Environment" tab
4. Add new environment variables:
   - AI_RECOMMENDATIONS_ENABLED = true
   - AI_CONFIDENCE_THRESHOLD = 70
5. Click "Save Changes"
6. Service will auto-redeploy

🔹 VERCEL:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to "Settings" > "Environment Variables"
4. Add:
   - AI_RECOMMENDATIONS_ENABLED = true
   - AI_CONFIDENCE_THRESHOLD = 70
5. Redeploy: vercel --prod

🔹 HEROKU:
heroku config:set AI_RECOMMENDATIONS_ENABLED=true -a your-app-name
heroku config:set AI_CONFIDENCE_THRESHOLD=70 -a your-app-name

🔹 AWS / MANUAL SERVER:
1. SSH into server: ssh user@your-server
2. Edit .env: nano /path/to/signaltrue/backend/.env
3. Add the two lines above
4. Restart: pm2 restart signaltrue (or your process manager)

═══════════════════════════════════════════════════════════════
VERIFICATION
═══════════════════════════════════════════════════════════════

After deployment, verify:

1. Server is running:
   curl https://your-domain.com/
   
2. Learning API works:
   curl https://your-domain.com/api/learning/summary \
     -H "Authorization: Bearer YOUR_TOKEN"
   
   Expected: { "totalLearnings": 0, ... }

3. Check server logs for:
   ✅ MongoDB connected
   ✅ Server running on port 8080
   ⏰ Weekly diagnosis scheduled

═══════════════════════════════════════════════════════════════
MONITORING
═══════════════════════════════════════════════════════════════

Week 1:  Check /api/learning/summary shows 0 learnings
Week 4:  Check /api/learning/summary shows 5-15 learnings
Month 3: Check aiGenerated > 0 (AI starting to activate)
Month 6: Check aiSuccessRate >= 75% (AI performing well)

═══════════════════════════════════════════════════════════════
ROLLBACK (If Needed)
═══════════════════════════════════════════════════════════════

To disable AI recommendations without code changes:

Set: AI_RECOMMENDATIONS_ENABLED=false

System will continue recording learnings but use templates only.

═══════════════════════════════════════════════════════════════

✅ Your code is already deployed to GitHub!
   Commit: 3ac062e
   Branch: main

Next step: Add environment variables to production 👆

EOF

echo ""
echo "Need help? Read AI_QUICK_START.md or AI_RECOMMENDATIONS_README.md"
