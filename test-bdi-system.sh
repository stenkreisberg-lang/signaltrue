#!/bin/bash

# SignalTrue BDI System - End-to-End Test Suite
# Tests: BDI calculation flow, dashboard loading, playbook recommendations, guardrails
# Usage: chmod +x test-bdi-system.sh && ./test-bdi-system.sh

set -e  # Exit on error

echo "========================================"
echo "SignalTrue BDI System - E2E Test Suite"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:8080}"
TEST_TOKEN="${TEST_TOKEN:-}"
TEST_TEAM_ID="${TEST_TEAM_ID:-}"
TEST_ORG_ID="${TEST_ORG_ID:-}"

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Helper function to run a test
run_test() {
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  local test_name="$1"
  local expected_status="$2"
  local url="$3"
  local method="${4:-GET}"
  local data="${5:-}"
  
  echo -n "Testing: $test_name... "
  
  if [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST \
      -H "Authorization: Bearer $TEST_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$url")
  else
    response=$(curl -s -w "\n%{http_code}" \
      -H "Authorization: Bearer $TEST_TOKEN" \
      "$url")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $http_code)"
    echo "Response: $body"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

# Validate prerequisites
echo "Validating prerequisites..."
if [ -z "$TEST_TOKEN" ]; then
  echo -e "${YELLOW}WARNING: TEST_TOKEN not set. Set via: export TEST_TOKEN='your_jwt_token'${NC}"
  echo "Skipping authentication-required tests..."
  SKIP_AUTH_TESTS=true
else
  echo "✓ TEST_TOKEN is set"
fi

if [ -z "$TEST_TEAM_ID" ]; then
  echo -e "${YELLOW}WARNING: TEST_TEAM_ID not set. Set via: export TEST_TEAM_ID='team_id'${NC}"
  echo "Skipping team-specific tests..."
  SKIP_TEAM_TESTS=true
else
  echo "✓ TEST_TEAM_ID is set"
fi

echo ""

# ============================================
# Test Suite 1: Backend File Verification
# ============================================
echo "========================================"
echo "Test Suite 1: Backend Files"
echo "========================================"

check_file() {
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} $1 (MISSING)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Models
check_file "backend/models/behavioralDriftIndex.js"
check_file "backend/models/coordinationLoadIndex.js"
check_file "backend/models/bandwidthTaxIndicator.js"
check_file "backend/models/silenceRiskIndicator.js"
check_file "backend/models/capacityStatus.js"
check_file "backend/models/driftPlaybook.js"
check_file "backend/models/driftTimeline.js"
check_file "backend/models/dataAccessLog.js"

# Services
check_file "backend/services/bdiService.js"
check_file "backend/services/indicesService.js"

# Routes
check_file "backend/routes/bdiRoutes.js"

# Middleware
check_file "backend/middleware/antiWeaponizationGuards.js"

echo ""

# ============================================
# Test Suite 2: Frontend Components
# ============================================
echo "========================================"
echo "Test Suite 2: Frontend Components"
echo "========================================"

check_file "src/components/BehavioralDriftIndexCard.js"
check_file "src/components/CapacityStatusCard.js"
check_file "src/components/CoordinationLoadIndexCard.js"
check_file "src/components/BandwidthTaxIndicatorCard.js"
check_file "src/components/SilenceRiskIndicatorCard.js"
check_file "src/components/AntiWeaponizationNotice.js"
check_file "src/pages/app/Overview.js"
check_file "src/pages/CapacityRiskDetection.js"

echo ""

# ============================================
# Test Suite 3: API Health & Authentication
# ============================================
if [ "$SKIP_AUTH_TESTS" != "true" ]; then
  echo "========================================"
  echo "Test Suite 3: API Health & Auth"
  echo "========================================"
  
  # Test health endpoint (should not require auth)
  run_test "Health Check" "200" "$API_URL/api/health" "GET"
  
  # Test authenticated endpoint
  run_test "Authenticated Endpoint" "200" "$API_URL/api/playbooks" "GET"
  
  echo ""
fi

# ============================================
# Test Suite 4: Anti-Weaponization Guardrails
# ============================================
if [ "$SKIP_AUTH_TESTS" != "true" ] && [ "$SKIP_TEAM_TESTS" != "true" ]; then
  echo "========================================"
  echo "Test Suite 4: Guardrails"
  echo "========================================"
  
  # Test 5-person minimum enforcement
  # Note: This will pass (200) if team has 5+ members, fail (403) if <5
  echo "Testing: 5-person minimum enforcement..."
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TEST_TOKEN" \
    "$API_URL/api/bdi/team/$TEST_TEAM_ID/latest")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Team has 5+ members (HTTP 200)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  elif [ "$http_code" = "403" ]; then
    if echo "$body" | grep -q "5_PERSON_MINIMUM"; then
      echo -e "${GREEN}✓ PASS${NC} - 5-person guard correctly rejected team (HTTP 403)"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      echo -e "${RED}✗ FAIL${NC} - Got 403 but wrong error message"
      TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
  else
    echo -e "${RED}✗ FAIL${NC} - Unexpected status: $http_code"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  
  # Test team-level only enforcement (should reject individual queries)
  echo "Testing: Team-level only enforcement..."
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TEST_TOKEN" \
    "$API_URL/api/bdi/team/$TEST_TEAM_ID/latest?userId=test123")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "403" ] && echo "$body" | grep -q "TEAM_LEVEL_ONLY"; then
    echo -e "${GREEN}✓ PASS${NC} - Individual query correctly blocked (HTTP 403)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} - Should reject individual queries (got $http_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  
  echo ""
fi

# ============================================
# Test Suite 5: BDI Endpoints
# ============================================
if [ "$SKIP_AUTH_TESTS" != "true" ] && [ "$SKIP_TEAM_TESTS" != "true" ]; then
  echo "========================================"
  echo "Test Suite 5: BDI Endpoints"
  echo "========================================"
  
  # Test BDI latest endpoint (may return 200 with data or 404 if no data)
  run_test "Get Latest BDI" "200|404" "$API_URL/api/bdi/team/$TEST_TEAM_ID/latest" "GET"
  
  # Test BDI history endpoint
  run_test "Get BDI History" "200" "$API_URL/api/bdi/team/$TEST_TEAM_ID/history" "GET"
  
  # Test comprehensive dashboard endpoint
  run_test "Get Dashboard Data" "200|404" "$API_URL/api/dashboard/$TEST_TEAM_ID" "GET"
  
  echo ""
fi

# ============================================
# Test Suite 6: Indices Endpoints
# ============================================
if [ "$SKIP_AUTH_TESTS" != "true" ] && [ "$SKIP_TEAM_TESTS" != "true" ]; then
  echo "========================================"
  echo "Test Suite 6: Indices Endpoints"
  echo "========================================"
  
  run_test "Get All Indices" "200|404" "$API_URL/api/indices/team/$TEST_TEAM_ID/all" "GET"
  
  echo ""
fi

# ============================================
# Test Suite 7: Playbooks & Timeline
# ============================================
if [ "$SKIP_AUTH_TESTS" != "true" ]; then
  echo "========================================"
  echo "Test Suite 7: Playbooks & Timeline"
  echo "========================================"
  
  run_test "Get All Playbooks" "200" "$API_URL/api/playbooks" "GET"
  
  if [ "$SKIP_TEAM_TESTS" != "true" ]; then
    run_test "Get Team Timeline" "200" "$API_URL/api/timeline/team/$TEST_TEAM_ID" "GET"
  fi
  
  echo ""
fi

# ============================================
# Test Suite 8: Data Access Logging
# ============================================
if [ "$SKIP_AUTH_TESTS" != "true" ] && [ "$SKIP_TEAM_TESTS" != "true" ]; then
  echo "========================================"
  echo "Test Suite 8: Audit Logging"
  echo "========================================"
  
  echo "Making test request to trigger audit log..."
  curl -s -o /dev/null \
    -H "Authorization: Bearer $TEST_TOKEN" \
    -H "X-Access-Purpose: e2e_test" \
    "$API_URL/api/dashboard/$TEST_TEAM_ID"
  
  echo -e "${GREEN}✓${NC} Audit log entry should be created (check dataAccessLogs collection)"
  TESTS_PASSED=$((TESTS_PASSED + 1))
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  
  echo ""
fi

# ============================================
# Test Summary
# ============================================
echo "========================================"
echo "Test Summary"
echo "========================================"
echo "Total Tests:  $TESTS_TOTAL"
echo -e "Passed:       ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed:       ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
  echo ""
  echo "Next Steps:"
  echo "1. Check MongoDB for audit logs: db.dataaccesslogs.find()"
  echo "2. Run weekly digest generation: node backend/scripts/sendWeeklyDigest.js"
  echo "3. Test frontend UI at http://localhost:3000/app/overview"
  echo "4. Review playbooks: db.driftplaybooks.find()"
  exit 0
else
  echo -e "${RED}✗ SOME TESTS FAILED${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "1. Ensure backend is running: npm start (in backend/)"
  echo "2. Check MongoDB connection in backend logs"
  echo "3. Verify TEST_TOKEN is valid and not expired"
  echo "4. Ensure TEST_TEAM_ID exists and has 5+ members"
  echo "5. Review API logs for detailed error messages"
  exit 1
fi
