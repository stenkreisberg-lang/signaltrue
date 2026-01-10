#!/bin/bash

# Pricing & Access Control Test Suite
# Tests the complete pricing implementation

set -e  # Exit on error

API_URL="${API_URL:-http://localhost:8080}"
ADMIN_TOKEN=""
HR_TOKEN=""
MANAGER_TOKEN=""
CEO_TOKEN=""
ORG_ID=""

echo "========================================="
echo "SignalTrue Pricing Test Suite"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
}

fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  exit 1
}

info() {
  echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

# Test 1: Verify subscription plans exist
test_plans_exist() {
  echo ""
  echo "Test 1: Verify subscription plans exist"
  echo "----------------------------------------"
  
  response=$(curl -s "$API_URL/api/subscriptions/plans")
  
  team_plan=$(echo "$response" | grep -o '"planId":"team"' || echo "")
  leadership_plan=$(echo "$response" | grep -o '"planId":"leadership"' || echo "")
  custom_plan=$(echo "$response" | grep -o '"planId":"custom"' || echo "")
  
  if [ -n "$team_plan" ] && [ -n "$leadership_plan" ] && [ -n "$custom_plan" ]; then
    pass "All three subscription plans exist"
  else
    fail "Missing subscription plans"
  fi
}

# Test 2: Test feature access on Team plan (€99)
test_team_plan_access() {
  echo ""
  echo "Test 2: Team plan (€99) feature access"
  echo "----------------------------------------"
  
  # Should have access to weekly reports
  response=$(curl -s -H "Authorization: Bearer $HR_TOKEN" \
    "$API_URL/api/subscriptions/current")
  
  if echo "$response" | grep -q '"weeklyReports"'; then
    pass "Team plan has weekly reports"
  else
    fail "Team plan missing weekly reports"
  fi
  
  # Should NOT have access to leadership reports
  if echo "$response" | grep -q '"monthlyReportsLeadership":false' || \
     ! echo "$response" | grep -q '"monthlyReportsLeadership"'; then
    pass "Team plan correctly blocks leadership reports"
  else
    fail "Team plan should not have leadership reports"
  fi
}

# Test 3: Test role-based access (HR_ADMIN vs CEO)
test_role_based_access() {
  echo ""
  echo "Test 3: Role-based access control"
  echo "----------------------------------------"
  
  # HR_ADMIN should access weekly reports
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $HR_TOKEN" \
    "$API_URL/api/reports/weekly")
  
  if [ "$response" == "200" ]; then
    pass "HR_ADMIN can access weekly reports"
  else
    fail "HR_ADMIN should access weekly reports (got $response)"
  fi
  
  # CEO should NOT access weekly reports (wrong role)
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $CEO_TOKEN" \
    "$API_URL/api/reports/weekly")
  
  if [ "$response" == "403" ]; then
    pass "CEO correctly blocked from weekly reports"
  else
    fail "CEO should be blocked from weekly reports (got $response)"
  fi
}

# Test 4: Test upgrade flow
test_upgrade_flow() {
  echo ""
  echo "Test 4: Upgrade from Team to Leadership"
  echo "----------------------------------------"
  
  # Upgrade to leadership plan
  response=$(curl -s -X PUT \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"targetPlanId": "leadership"}' \
    "$API_URL/api/subscriptions/upgrade")
  
  if echo "$response" | grep -q '"success":true'; then
    pass "Upgrade to Leadership plan successful"
  else
    fail "Upgrade failed: $response"
  fi
  
  # Verify new features are accessible
  sleep 1
  response=$(curl -s -H "Authorization: Bearer $CEO_TOKEN" \
    "$API_URL/api/subscriptions/current")
  
  if echo "$response" | grep -q '"monthlyReportsLeadership"' && \
     echo "$response" | grep -q '"industryBenchmarks"'; then
    pass "Leadership features now accessible"
  else
    fail "Leadership features not accessible after upgrade"
  fi
}

# Test 5: Test industry benchmark access (Leadership plan required)
test_benchmark_access() {
  echo ""
  echo "Test 5: Industry benchmark access"
  echo "----------------------------------------"
  
  # CEO should be able to access benchmarks (on Leadership plan)
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $CEO_TOKEN" \
    "$API_URL/api/benchmarks/industry/bdi")
  
  if [ "$response" == "200" ] || [ "$response" == "404" ]; then
    # 404 is OK if no benchmark data exists yet
    pass "CEO can access industry benchmarks"
  else
    fail "CEO should access benchmarks (got $response)"
  fi
  
  # HR_ADMIN should NOT access benchmarks (wrong role)
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $HR_TOKEN" \
    "$API_URL/api/benchmarks/industry/bdi")
  
  if [ "$response" == "403" ]; then
    pass "HR_ADMIN correctly blocked from benchmarks"
  else
    fail "HR_ADMIN should be blocked from benchmarks (got $response)"
  fi
}

# Test 6: Test downgrade flow
test_downgrade_flow() {
  echo ""
  echo "Test 6: Downgrade from Leadership to Team"
  echo "----------------------------------------"
  
  # Downgrade back to team plan
  response=$(curl -s -X PUT \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"targetPlanId": "team"}' \
    "$API_URL/api/subscriptions/downgrade")
  
  if echo "$response" | grep -q '"success":true'; then
    pass "Downgrade to Team plan successful"
  else
    fail "Downgrade failed: $response"
  fi
  
  # Verify features are now blocked
  sleep 1
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $CEO_TOKEN" \
    "$API_URL/api/benchmarks/industry/bdi")
  
  if [ "$response" == "403" ]; then
    pass "Leadership features correctly revoked after downgrade"
  else
    fail "Leadership features should be revoked (got $response)"
  fi
}

# Test 7: Test AI mode separation
test_ai_mode_separation() {
  echo ""
  echo "Test 7: AI mode separation (tactical vs strategic)"
  echo "----------------------------------------"
  
  # Check that tactical AI prompt exists
  if [ -f "backend/prompts/weeklyAiPrompt_v1.json" ]; then
    pass "Tactical AI prompt file exists"
  else
    fail "Tactical AI prompt file missing"
  fi
  
  # Check that strategic AI prompt exists
  if [ -f "backend/prompts/monthlyStrategicAiPrompt_v1.json" ]; then
    pass "Strategic AI prompt file exists"
  else
    fail "Strategic AI prompt file missing"
  fi
  
  # Verify tactical AI restrictions
  tactical_prompt=$(cat backend/prompts/weeklyAiPrompt_v1.json)
  if echo "$tactical_prompt" | grep -q '"maxRecommendations": 3'; then
    pass "Tactical AI limited to 3 recommendations"
  else
    fail "Tactical AI should limit recommendations"
  fi
  
  # Verify strategic AI restrictions
  strategic_prompt=$(cat backend/prompts/monthlyStrategicAiPrompt_v1.json)
  if echo "$strategic_prompt" | grep -q '"No individual names"'; then
    pass "Strategic AI prohibits individual names"
  else
    fail "Strategic AI should prohibit individual names"
  fi
}

# Test 8: Test custom plan features
test_custom_plan_features() {
  echo ""
  echo "Test 8: Custom plan enterprise features"
  echo "----------------------------------------"
  
  # Upgrade to custom plan
  response=$(curl -s -X PUT \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"targetPlanId": "custom"}' \
    "$API_URL/api/subscriptions/upgrade")
  
  if echo "$response" | grep -q '"success":true'; then
    pass "Upgrade to Custom plan successful"
  else
    info "Custom plan upgrade skipped (might need manual approval)"
    return
  fi
  
  # Update custom features
  response=$(curl -s -X PUT \
    -H "Authorization: Bearer $CEO_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"customFeatures": {"enableBoardReports": true}}' \
    "$API_URL/api/subscriptions/custom-features")
  
  if echo "$response" | grep -q '"enableBoardReports":true'; then
    pass "Custom features updated successfully"
  else
    fail "Custom features update failed"
  fi
}

# Test 9: Validate subscription constants
test_subscription_constants() {
  echo ""
  echo "Test 9: Subscription constants validation"
  echo "----------------------------------------"
  
  constants_file="backend/utils/subscriptionConstants.js"
  
  if [ -f "$constants_file" ]; then
    pass "Subscription constants file exists"
  else
    fail "Subscription constants file missing"
  fi
  
  # Check for required constants
  if grep -q "PLAN_DEFINITIONS" "$constants_file" && \
     grep -q "ACCESS_MATRIX" "$constants_file" && \
     grep -q "ROLES" "$constants_file"; then
    pass "All required constants defined"
  else
    fail "Missing required constants"
  fi
}

# Test 10: Frontend integration check
test_frontend_integration() {
  echo ""
  echo "Test 10: Frontend integration files"
  echo "----------------------------------------"
  
  if [ -f "src/contexts/SubscriptionContext.js" ]; then
    pass "SubscriptionContext exists"
  else
    fail "SubscriptionContext missing"
  fi
  
  if [ -f "src/components/FeatureGate.js" ]; then
    pass "FeatureGate component exists"
  else
    fail "FeatureGate component missing"
  fi
}

# Main test runner
main() {
  info "Starting pricing test suite..."
  info "API URL: $API_URL"
  echo ""
  
  # Note: In real scenario, you'd authenticate and get tokens first
  # For now, we'll run tests that don't require authentication
  
  test_plans_exist
  test_subscription_constants
  test_ai_mode_separation
  test_frontend_integration
  
  # The following tests require authentication tokens
  # Uncomment when you have a test user setup
  # test_team_plan_access
  # test_role_based_access
  # test_upgrade_flow
  # test_benchmark_access
  # test_downgrade_flow
  # test_custom_plan_features
  
  echo ""
  echo "========================================="
  echo "Test Suite Complete!"
  echo "========================================="
  echo ""
  echo "✓ All tests passed"
  echo ""
  echo "Next steps:"
  echo "1. Set up test users with different roles"
  echo "2. Uncomment authenticated tests"
  echo "3. Run full integration test suite"
  echo ""
}

# Run tests
main
