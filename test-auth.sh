#!/bin/bash

# SignalTrue Authentication Test Script
# This script helps you create test users and verify the authentication system

API_URL="http://localhost:8080"

echo "🔐 SignalTrue Authentication Test"
echo "=================================="
echo ""

# Step 1: Get a team ID
echo "📋 Step 1: Fetching available teams..."
TEAMS_RESPONSE=$(curl -s $API_URL/api/teams)
echo "$TEAMS_RESPONSE" | jq '.' || echo "$TEAMS_RESPONSE"

# Extract first team ID (requires jq)
TEAM_ID=$(echo "$TEAMS_RESPONSE" | jq -r '.[0]._id' 2>/dev/null)

if [ "$TEAM_ID" = "null" ] || [ -z "$TEAM_ID" ]; then
    echo ""
    echo "⚠️  No teams found. Please create a team first:"
    echo "   Visit http://localhost:3000 and create a team, or use the API."
    echo ""
    exit 1
fi

echo "✅ Using team ID: $TEAM_ID"
echo ""

# Step 2: Register admin user
echo "📝 Step 2: Registering admin user..."
ADMIN_EMAIL="admin@signaltrue.test"
ADMIN_PASSWORD="password123"

REGISTER_RESPONSE=$(curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"name\": \"Admin User\",
    \"role\": \"admin\",
    \"teamId\": \"$TEAM_ID\"
  }")

echo "$REGISTER_RESPONSE" | jq '.' || echo "$REGISTER_RESPONSE"

# Extract token
ADMIN_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token' 2>/dev/null)

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo ""
    echo "⚠️  Admin registration failed. User might already exist."
    echo "   Trying to login instead..."
    echo ""
    
    # Try login
    LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$ADMIN_EMAIL\",
        \"password\": \"$ADMIN_PASSWORD\"
      }")
    
    echo "$LOGIN_RESPONSE" | jq '.' || echo "$LOGIN_RESPONSE"
    ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token' 2>/dev/null)
fi

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo ""
    echo "❌ Could not get admin token. Please check the error above."
    exit 1
fi

echo "✅ Admin token acquired"
echo ""

# Step 3: Add a viewer user
echo "👤 Step 3: Adding viewer user..."
VIEWER_EMAIL="viewer@signaltrue.test"

VIEWER_RESPONSE=$(curl -s -X POST $API_URL/api/team-members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"email\": \"$VIEWER_EMAIL\",
    \"password\": \"password123\",
    \"name\": \"Viewer User\",
    \"role\": \"viewer\"
  }")

echo "$VIEWER_RESPONSE" | jq '.' || echo "$VIEWER_RESPONSE"
echo ""

# Step 4: List team members
echo "📋 Step 4: Listing team members..."
MEMBERS_RESPONSE=$(curl -s -X GET $API_URL/api/team-members \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$MEMBERS_RESPONSE" | jq '.' || echo "$MEMBERS_RESPONSE"
echo ""

# Summary
echo "=================================="
echo "✅ Authentication Test Complete!"
echo ""
echo "You can now login with:"
echo "   Admin:  $ADMIN_EMAIL / password123"
echo "   Viewer: $VIEWER_EMAIL / password123"
echo ""
echo "Frontend: http://localhost:3000/login"
echo "Backend:  $API_URL"
echo ""
echo "Admin Token (for API testing):"
echo "$ADMIN_TOKEN"
echo ""
