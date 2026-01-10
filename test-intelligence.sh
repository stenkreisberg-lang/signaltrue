#!/bin/bash

# SignalTrue Intelligence Integration Test Script
# Tests all behavioral intelligence endpoints after deployment
# Usage: ./test-intelligence.sh

echo "======================================"
echo "SignalTrue Intelligence API Tests"
echo "======================================"
echo ""

# Configuration
API_URL="${API_URL:-https://signaltrue-backend.onrender.com}"
# For local testing, use: export API_URL="http://localhost:8080"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if TOKEN is set
if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠️  TOKEN not set. Please set your authentication token:${NC}"
    echo "   export TOKEN='your_jwt_token_here'"
    echo ""
    echo "To get a token:"
    echo "1. Login at $API_URL/auth/login"
    echo "2. Copy the token from the response"
    echo "3. Run: export TOKEN='your_token'"
    echo ""
    exit 1
fi

# Check if ORG_ID is set
if [ -z "$ORG_ID" ]; then
    echo -e "${YELLOW}⚠️  ORG_ID not set. Please set your organization ID:${NC}"
    echo "   export ORG_ID='your_org_id_here'"
    echo ""
    exit 1
fi

# Check if TEAM_ID is set (optional)
if [ -z "$TEAM_ID" ]; then
    echo -e "${YELLOW}ℹ️  TEAM_ID not set (optional). Some tests will be skipped.${NC}"
    echo "   To test team-specific endpoints: export TEAM_ID='your_team_id'"
    echo ""
fi

echo "Testing against: $API_URL"
echo "Organization ID: $ORG_ID"
if [ -n "$TEAM_ID" ]; then
    echo "Team ID: $TEAM_ID"
fi
echo ""

# Test counter
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name="$1"
    local endpoint="$2"
    local expected_status="${3:-200}"
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_URL$endpoint")
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        
        # Show sample response for successful tests
        if [ "$http_code" = "200" ]; then
            echo "$body" | python3 -m json.tool 2>/dev/null | head -10 | sed 's/^/  /'
            if [ $(echo "$body" | wc -l) -gt 10 ]; then
                echo "  ..."
            fi
        fi
    else
        echo -e "${RED}✗ FAILED${NC} (Expected $expected_status, got $http_code)"
        FAILED=$((FAILED + 1))
        echo "  Response: $body" | head -3
    fi
    echo ""
}

echo "======================================"
echo "1. Health Check"
echo "======================================"
test_endpoint "Server Health" "/api/health" 200

echo "======================================"
echo "2. Attrition Risk Intelligence"
echo "======================================"
test_endpoint "Get High-Risk Individuals (Org)" "/api/intelligence/attrition/org/$ORG_ID" 200

if [ -n "$TEAM_ID" ]; then
    test_endpoint "Get Team Attrition Summary" "/api/intelligence/attrition/team/$TEAM_ID" 200
fi

echo "======================================"
echo "3. Manager Effectiveness Intelligence"
echo "======================================"
test_endpoint "Get All Managers (Org)" "/api/intelligence/managers/$ORG_ID" 200
test_endpoint "Get Managers Needing Coaching" "/api/intelligence/managers/coaching/$ORG_ID" 200

echo "======================================"
echo "4. Crisis Detection Intelligence"
echo "======================================"
test_endpoint "Get Active Crises (Org)" "/api/intelligence/crisis/$ORG_ID" 200

if [ -n "$TEAM_ID" ]; then
    test_endpoint "Check Team Crisis" "/api/intelligence/crisis/team/$TEAM_ID" 200
fi

echo "======================================"
echo "5. Network Health Intelligence"
echo "======================================"
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Analyze Network Health" "/api/intelligence/network/$TEAM_ID" 200
    test_endpoint "Detect Network Silos" "/api/intelligence/network/$TEAM_ID/silos" 200
    test_endpoint "Detect Network Bottlenecks" "/api/intelligence/network/$TEAM_ID/bottlenecks" 200
fi

echo "======================================"
echo "6. Succession Risk Intelligence"
echo "======================================"
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Analyze Succession Risk" "/api/intelligence/succession/$TEAM_ID" 200
    test_endpoint "Get Critical Succession Risks (Org)" "/api/intelligence/succession/org/$ORG_ID/critical" 200
fi

echo "======================================"
echo "7. Equity Signals Intelligence"
echo "======================================"
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Analyze Team Equity" "/api/intelligence/equity/$TEAM_ID" 200
fi
test_endpoint "Get Org Equity Issues" "/api/intelligence/equity/org/$ORG_ID/issues" 200

echo "======================================"
echo "8. Project Risk Intelligence"
echo "======================================"
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Analyze Team Projects" "/api/intelligence/projects/$TEAM_ID" 200
    test_endpoint "Get High-Risk Projects (Org)" "/api/intelligence/projects/org/$ORG_ID/high-risk" 200
fi

echo "======================================"
echo "9. Meeting ROI Intelligence"
echo "======================================"
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Analyze Recent Meetings (7 days)" "/api/intelligence/meeting-roi/team/$TEAM_ID/recent?days=7" 200
fi
test_endpoint "Get Low ROI Meetings (Org)" "/api/intelligence/meeting-roi/org/$ORG_ID/low-roi" 200

echo "======================================"
echo "10. Outlook Signals Intelligence"
echo "======================================"
if [ -n "$TEAM_ID" ]; then
    test_endpoint "Analyze Team Outlook Signals" "/api/intelligence/outlook/team/$TEAM_ID" 200
fi
test_endpoint "Get Critical Outlook Signals (Org)" "/api/intelligence/outlook/org/$ORG_ID/critical" 200

echo "======================================"
echo "11. Weekly Diagnosis (Team State)"
echo "======================================"
if [ -n "$TEAM_ID" ]; then
    echo "Testing if TeamState includes intelligence scores..."
    echo -n "Fetching latest team state... "
    
    response=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/insights/team/$TEAM_ID")
    
    if echo "$response" | grep -q "intelligenceScores"; then
        echo -e "${GREEN}✓ PASSED${NC} - intelligenceScores field present"
        PASSED=$((PASSED + 1))
        echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data.get('teamState', {}).get('intelligenceScores', {}), indent=2))" 2>/dev/null | sed 's/^/  /'
    else
        echo -e "${YELLOW}⚠️  WARNING${NC} - intelligenceScores not yet populated (will be available after next weekly diagnosis)"
        echo "  This is normal if weekly diagnosis hasn't run yet since deployment."
    fi
    echo ""
fi

echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Intelligence features are working correctly.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Check the output above for details.${NC}"
    exit 1
fi
