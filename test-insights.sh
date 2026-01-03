#!/bin/bash

# Insights Feature Test Script
# This script helps test the Diagnosis & Impact Layer

echo "🎯 SignalTrue Insights Feature Test Script"
echo "==========================================="
echo ""

# Check if backend is running
echo "Checking if backend is running..."
if curl -s http://localhost:8080/ > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running. Please start it with: cd backend && npm start"
    exit 1
fi

# Get token from user
echo ""
echo "To test the Insights API, you need:"
echo "1. An authentication token (from localStorage after login)"
echo "2. A valid team ID"
echo ""
read -p "Enter your auth token (or press Enter to skip API tests): " TOKEN
read -p "Enter a team ID to test (or press Enter to skip): " TEAM_ID

if [ -z "$TOKEN" ] || [ -z "$TEAM_ID" ]; then
    echo ""
    echo "⚠️  Skipping API tests (no token or team ID provided)"
    echo ""
    echo "📋 To test the Insights feature:"
    echo "1. Start backend: cd backend && npm start"
    echo "2. Start frontend: npm start"
    echo "3. Login to get a token"
    echo "4. Visit: http://localhost:3000/app/insights/<team-id>"
    echo ""
    exit 0
fi

echo ""
echo "🔬 Running API Tests..."
echo ""

# Test 1: Get insights for team
echo "Test 1: GET /api/insights/team/$TEAM_ID"
echo "--------------------------------------"
INSIGHTS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:8080/api/insights/team/$TEAM_ID)
echo "$INSIGHTS" | jq '.' 2>/dev/null || echo "$INSIGHTS"
echo ""

# Test 2: Trigger manual diagnosis
echo "Test 2: POST /api/insights/team/$TEAM_ID/diagnose (Manual Diagnosis)"
echo "---------------------------------------------------------------"
read -p "Run manual diagnosis for this team? (y/n): " RUN_DIAGNOSIS

if [ "$RUN_DIAGNOSIS" = "y" ]; then
    DIAGNOSIS=$(curl -s -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        http://localhost:8080/api/insights/team/$TEAM_ID/diagnose)
    echo "$DIAGNOSIS" | jq '.' 2>/dev/null || echo "$DIAGNOSIS"
    echo ""
    echo "✅ Diagnosis triggered. Re-fetch insights to see results."
fi

echo ""
echo "🎉 Testing complete!"
echo ""
echo "📚 Next steps:"
echo "- Visit the Insights page: http://localhost:3000/app/insights/$TEAM_ID"
echo "- Check the documentation: INSIGHTS_IMPLEMENTATION_STATUS.md"
echo "- Add navigation links: See INSIGHTS_FRONTEND_GUIDE.md"
echo ""
