#!/bin/bash
# Test script for employee auto-sync flow
# This tests the complete flow: IT admin connects → employees sync → HR assigns to teams

echo "🧪 Testing Employee Auto-Sync Flow"
echo "=================================="
echo ""

# Check if backend is running
echo "1. Checking if backend is running..."
BACKEND_URL=${BACKEND_URL:-http://localhost:8080}
if curl -s "$BACKEND_URL" > /dev/null; then
  echo "✅ Backend is running at $BACKEND_URL"
else
  echo "❌ Backend is not running. Start it with: cd backend && node server.js"
  exit 1
fi

echo ""
echo "2. Test Flow:"
echo "   Step 1: IT Admin connects Slack/Google integration"
echo "   Step 2: System auto-syncs employees in background"
echo "   Step 3: Check sync status API"
echo "   Step 4: HR Admin views Employee Directory"
echo "   Step 5: HR assigns employees to teams"
echo ""

# Login as admin to get token
echo "3. Getting authentication token..."
read -p "Enter admin email: " ADMIN_EMAIL
read -s -p "Enter admin password: " ADMIN_PASSWORD
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Successfully authenticated"
echo ""

# Check sync status
echo "4. Checking employee sync status..."
SYNC_STATUS=$(curl -s -X GET "$BACKEND_URL/api/employee-sync/status" \
  -H "Authorization: Bearer $TOKEN")

echo "Sync Status:"
echo "$SYNC_STATUS" | jq '.'
echo ""

TOTAL_USERS=$(echo $SYNC_STATUS | jq -r '.totalUsers')
PENDING_USERS=$(echo $SYNC_STATUS | jq -r '.pendingUsers')
UNASSIGNED_USERS=$(echo $SYNC_STATUS | jq -r '.unassignedUsers')
SLACK_CONNECTED=$(echo $SYNC_STATUS | jq -r '.slackConnected')
GOOGLE_CONNECTED=$(echo $SYNC_STATUS | jq -r '.googleConnected')

echo "📊 Summary:"
echo "   Total Employees: $TOTAL_USERS"
echo "   Pending (not claimed): $PENDING_USERS"
echo "   Unassigned: $UNASSIGNED_USERS"
echo "   Slack Connected: $SLACK_CONNECTED"
echo "   Google Connected: $GOOGLE_CONNECTED"
echo ""

# List employees
echo "5. Fetching employee list..."
EMPLOYEES=$(curl -s -X GET "$BACKEND_URL/api/team-members" \
  -H "Authorization: Bearer $TOKEN")

EMPLOYEE_COUNT=$(echo $EMPLOYEES | jq '. | length')
echo "✅ Found $EMPLOYEE_COUNT employees in database"
echo ""

if [ "$EMPLOYEE_COUNT" -gt 0 ]; then
  echo "Sample employees:"
  echo "$EMPLOYEES" | jq '[.[0:3][] | {name, email, accountStatus, source, teamId}]'
  echo ""
fi

# Test manual sync (optional)
echo "6. Manual Sync Test (optional)"
echo "   Would you like to trigger a manual sync?"
read -p "   Type 'slack' for Slack sync, 'google' for Google sync, or 'skip' to skip: " SYNC_CHOICE

if [ "$SYNC_CHOICE" = "slack" ] || [ "$SYNC_CHOICE" = "google" ]; then
  echo "   Triggering $SYNC_CHOICE employee sync..."
  SYNC_RESULT=$(curl -s -X POST "$BACKEND_URL/api/employee-sync/$SYNC_CHOICE" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "   Sync Result:"
  echo "$SYNC_RESULT" | jq '.'
  
  if [ "$(echo $SYNC_RESULT | jq -r '.success')" = "true" ]; then
    CREATED=$(echo $SYNC_RESULT | jq -r '.stats.created')
    UPDATED=$(echo $SYNC_RESULT | jq -r '.stats.updated')
    echo "   ✅ Sync completed: $CREATED created, $UPDATED updated"
  else
    echo "   ⚠️  Sync returned: $(echo $SYNC_RESULT | jq -r '.message')"
  fi
  echo ""
fi

# List teams
echo "7. Fetching teams..."
TEAMS=$(curl -s -X GET "$BACKEND_URL/api/team-management/organization" \
  -H "Authorization: Bearer $TOKEN")

TEAM_COUNT=$(echo $TEAMS | jq '. | length')
echo "✅ Found $TEAM_COUNT teams"

if [ "$TEAM_COUNT" -gt 0 ]; then
  echo "Teams:"
  echo "$TEAMS" | jq '[.[] | {_id, name, memberCount}]'
fi
echo ""

# Test team assignment (optional)
if [ "$EMPLOYEE_COUNT" -gt 0 ] && [ "$TEAM_COUNT" -gt 1 ]; then
  echo "8. Team Assignment Test (optional)"
  read -p "   Would you like to test assigning an employee to a team? (y/n): " ASSIGN_TEST
  
  if [ "$ASSIGN_TEST" = "y" ]; then
    # Get first unassigned employee
    UNASSIGNED_TEAM_ID=$(echo $TEAMS | jq -r '.[] | select(.name == "Unassigned") | ._id')
    FIRST_EMPLOYEE=$(echo $EMPLOYEES | jq -r ".[] | select(.teamId == \"$UNASSIGNED_TEAM_ID\") | ._id" | head -n 1)
    
    if [ -z "$FIRST_EMPLOYEE" ] || [ "$FIRST_EMPLOYEE" = "null" ]; then
      echo "   ℹ️  No unassigned employees found to test with"
    else
      # Get a target team (not Unassigned)
      TARGET_TEAM=$(echo $TEAMS | jq -r '.[] | select(.name != "Unassigned") | ._id' | head -n 1)
      
      if [ -n "$TARGET_TEAM" ]; then
        echo "   Assigning employee $FIRST_EMPLOYEE to team $TARGET_TEAM..."
        ASSIGN_RESULT=$(curl -s -X PUT "$BACKEND_URL/api/team-management/$TARGET_TEAM/members/$FIRST_EMPLOYEE" \
          -H "Authorization: Bearer $TOKEN")
        
        if echo $ASSIGN_RESULT | jq -e '.message' > /dev/null; then
          echo "   ✅ $(echo $ASSIGN_RESULT | jq -r '.message')"
        else
          echo "   ❌ Assignment failed"
        fi
      fi
    fi
  fi
fi

echo ""
echo "=================================="
echo "✅ Employee Auto-Sync Test Complete"
echo ""
echo "📋 Next Steps:"
echo "   1. Open frontend at http://localhost:3000"
echo "   2. Login as HR Admin"
echo "   3. View Employee Directory (should show all synced employees)"
echo "   4. Use bulk assign or individual assign to move employees to teams"
echo "   5. Verify measurements start working for assigned teams"
echo ""
echo "🔗 Key URLs:"
echo "   - Employee Directory: http://localhost:3000/dashboard (HR Admin view)"
echo "   - Sync Status API: $BACKEND_URL/api/employee-sync/status"
echo "   - Manual Sync: POST $BACKEND_URL/api/employee-sync/slack or /google"
echo ""
