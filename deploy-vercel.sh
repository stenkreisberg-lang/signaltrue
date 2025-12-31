#!/bin/bash

# SignalTrue V2.0 - Vercel Production Deployment
# This script deploys both frontend and backend to Vercel

set -e

echo "========================================="
echo "SignalTrue V2.0 - Vercel Deployment"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Pre-deployment checks${NC}"
echo "----------------------------------------"

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
  echo -e "${YELLOW}Not logged in to Vercel. Logging in...${NC}"
  vercel login
else
  echo -e "${GREEN}✓${NC} Logged in to Vercel as: $(vercel whoami)"
fi

# Check if build exists
if [ ! -d "build" ]; then
  echo -e "${YELLOW}⚠${NC} Build directory not found. Building frontend..."
  npm run build
fi
echo -e "${GREEN}✓${NC} Frontend build ready"

echo ""
echo -e "${BLUE}Step 2: Deploy Frontend${NC}"
echo "----------------------------------------"
echo "Deploying React app to Vercel..."
echo ""

# Deploy frontend
vercel --prod --yes

echo ""
echo -e "${GREEN}✓${NC} Frontend deployed successfully!"
echo ""

# Get the deployment URL
FRONTEND_URL=$(vercel ls --prod | grep signaltrue | head -1 | awk '{print $2}')
echo -e "${GREEN}Frontend URL:${NC} https://$FRONTEND_URL"
echo ""

echo -e "${BLUE}Step 3: Deploy Backend API${NC}"
echo "----------------------------------------"
echo ""
echo -e "${YELLOW}Backend deployment options:${NC}"
echo ""
echo "Option 1: Deploy backend to Vercel (Recommended)"
echo "  cd backend && vercel --prod"
echo ""
echo "Option 2: Deploy to Render.com"
echo "  1. Go to https://render.com/dashboard"
echo "  2. Click 'New +' > 'Web Service'"
echo "  3. Connect your GitHub repo: stenkreisberg-lang/signaltrue"
echo "  4. Configure:"
echo "     - Name: signaltrue-api"
echo "     - Environment: Node"
echo "     - Build Command: cd backend && npm install"
echo "     - Start Command: cd backend && npm start"
echo "  5. Add Environment Variables (see below)"
echo ""
echo "Option 3: Deploy to Railway"
echo "  cd backend && railway up"
echo ""

read -p "Deploy backend to Vercel now? (y/n): " deploy_backend

if [ "$deploy_backend" = "y" ] || [ "$deploy_backend" = "Y" ]; then
  echo ""
  echo "Deploying backend to Vercel..."
  cd backend
  
  # Check if backend has MongoDB URI configured
  if [ ! -f ".env" ]; then
    echo -e "${RED}✗ backend/.env not found!${NC}"
    echo "Create backend/.env with production settings first."
    echo "See REQUIRED ENVIRONMENT VARIABLES below."
    exit 1
  fi
  
  vercel --prod --yes
  
  BACKEND_URL=$(vercel ls --prod | grep signaltrue-api | head -1 | awk '{print $2}')
  echo ""
  echo -e "${GREEN}✓${NC} Backend deployed successfully!"
  echo -e "${GREEN}Backend API URL:${NC} https://$BACKEND_URL"
  cd ..
else
  echo -e "${YELLOW}Skipping backend deployment.${NC}"
  echo "Deploy manually using one of the options above."
fi

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""

if [ -n "$FRONTEND_URL" ]; then
  echo -e "${GREEN}Frontend:${NC} https://$FRONTEND_URL"
fi

if [ -n "$BACKEND_URL" ]; then
  echo -e "${GREEN}Backend API:${NC} https://$BACKEND_URL"
fi

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "----------------------------------------"
echo ""
echo "1. Configure Environment Variables in Vercel Dashboard"
echo "   Visit: https://vercel.com/dashboard"
echo "   Go to: Your Project > Settings > Environment Variables"
echo ""
echo "2. Add the following variables:"
echo ""
echo "   BACKEND (Required):"
echo "   - MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/signaltrue"
echo "   - JWT_SECRET=<64-char-random-string>"
echo "   - NODE_ENV=production"
echo "   - CORS_ORIGIN=https://$FRONTEND_URL"
echo "   - ENABLE_AUDIT_LOGGING=true"
echo ""
echo "   BACKEND (Optional - Email):"
echo "   - SMTP_HOST=smtp.sendgrid.net"
echo "   - SMTP_PORT=587"
echo "   - SMTP_USER=apikey"
echo "   - SMTP_PASS=<your-sendgrid-key>"
echo "   - SMTP_FROM=noreply@signaltrue.ai"
echo ""
echo "3. Verify Deployment"
echo "   Frontend: curl https://$FRONTEND_URL"
echo "   Backend:  curl https://$BACKEND_URL/api/health"
echo ""
echo "4. Seed Database"
echo "   Run: node backend/scripts/seedPlaybooks.js"
echo ""
echo "5. Test Application"
echo "   - Visit https://$FRONTEND_URL"
echo "   - Login with seed credentials"
echo "   - Check dashboard at /app/overview"
echo ""
echo "6. Configure Custom Domain (Optional)"
echo "   Vercel Dashboard > Domains > Add Domain"
echo ""
echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo ""
echo "Documentation:"
echo "  - Deployment Guide: ./DEPLOYMENT_GUIDE_V2.md"
echo "  - Deployment Checklist: ./PRODUCTION_DEPLOYMENT_CHECKLIST.md"
echo "  - Deployment Success: ./DEPLOYMENT_SUCCESS.md"
echo ""
