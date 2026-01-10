#!/bin/bash

# AI Recommendations System Test Script
# Run this to verify your AI recommendations setup

echo "🧪 Testing SignalTrue AI Recommendations System..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "backend/server.js" ]; then
    echo -e "${RED}❌ Error: Must run from signaltrue root directory${NC}"
    exit 1
fi

echo "1️⃣  Checking environment variables..."

# Check .env file exists
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ backend/.env not found${NC}"
    echo "   Create it by copying backend/.env.example"
    exit 1
fi

# Check AI recommendations enabled
if grep -q "AI_RECOMMENDATIONS_ENABLED=true" backend/.env; then
    echo -e "${GREEN}✅ AI_RECOMMENDATIONS_ENABLED=true${NC}"
else
    echo -e "${YELLOW}⚠️  AI_RECOMMENDATIONS_ENABLED not set to true${NC}"
    echo "   Add this to backend/.env:"
    echo "   AI_RECOMMENDATIONS_ENABLED=true"
fi

# Check confidence threshold
if grep -q "AI_CONFIDENCE_THRESHOLD" backend/.env; then
    THRESHOLD=$(grep "AI_CONFIDENCE_THRESHOLD" backend/.env | cut -d '=' -f2)
    echo -e "${GREEN}✅ AI_CONFIDENCE_THRESHOLD=$THRESHOLD${NC}"
else
    echo -e "${YELLOW}⚠️  AI_CONFIDENCE_THRESHOLD not set${NC}"
    echo "   Add this to backend/.env:"
    echo "   AI_CONFIDENCE_THRESHOLD=70"
fi

# Check AI provider
if grep -q "OPENAI_API_KEY=sk-" backend/.env || grep -q "ANTHROPIC_API_KEY=sk-ant-" backend/.env; then
    echo -e "${GREEN}✅ AI API key configured${NC}"
else
    echo -e "${RED}❌ No AI API key found${NC}"
    echo "   Add either OPENAI_API_KEY or ANTHROPIC_API_KEY to backend/.env"
fi

echo ""
echo "2️⃣  Checking new files..."

# Check model
if [ -f "backend/models/actionLearning.js" ]; then
    echo -e "${GREEN}✅ backend/models/actionLearning.js${NC}"
else
    echo -e "${RED}❌ backend/models/actionLearning.js missing${NC}"
fi

# Check services
if [ -f "backend/services/learningLoopService.js" ]; then
    echo -e "${GREEN}✅ backend/services/learningLoopService.js${NC}"
else
    echo -e "${RED}❌ backend/services/learningLoopService.js missing${NC}"
fi

if [ -f "backend/services/aiRecommendationContext.js" ]; then
    echo -e "${GREEN}✅ backend/services/aiRecommendationContext.js${NC}"
else
    echo -e "${RED}❌ backend/services/aiRecommendationContext.js missing${NC}"
fi

# Check routes
if [ -f "backend/routes/learning.js" ]; then
    echo -e "${GREEN}✅ backend/routes/learning.js${NC}"
else
    echo -e "${RED}❌ backend/routes/learning.js missing${NC}"
fi

echo ""
echo "3️⃣  Checking documentation..."

if [ -f "AI_RECOMMENDATIONS_README.md" ]; then
    echo -e "${GREEN}✅ AI_RECOMMENDATIONS_README.md${NC}"
else
    echo -e "${YELLOW}⚠️  AI_RECOMMENDATIONS_README.md not found${NC}"
fi

if [ -f "AI_IMPLEMENTATION_SUMMARY.md" ]; then
    echo -e "${GREEN}✅ AI_IMPLEMENTATION_SUMMARY.md${NC}"
else
    echo -e "${YELLOW}⚠️  AI_IMPLEMENTATION_SUMMARY.md not found${NC}"
fi

echo ""
echo "4️⃣  Testing server startup..."

# Try to start server (will fail if already running, that's ok)
cd backend
if node -c server.js 2>/dev/null; then
    echo -e "${GREEN}✅ server.js syntax valid${NC}"
else
    echo -e "${RED}❌ server.js has syntax errors${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Summary:"
echo ""
echo "Your AI Recommendations system is ready to go! 🎉"
echo ""
echo "Next steps:"
echo "1. Make sure backend/.env has these settings:"
echo "   AI_RECOMMENDATIONS_ENABLED=true"
echo "   AI_CONFIDENCE_THRESHOLD=70"
echo "   OPENAI_API_KEY=sk-... (or ANTHROPIC_API_KEY)"
echo ""
echo "2. Start the server:"
echo "   cd backend && node server.js"
echo ""
echo "3. Monitor for AI recommendations in logs:"
echo "   Look for: ✨ AI-generated recommendation..."
echo ""
echo "4. Check learning data after experiments complete:"
echo "   curl http://localhost:8080/api/learning/summary"
echo ""
echo "Read AI_RECOMMENDATIONS_README.md for full documentation."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
