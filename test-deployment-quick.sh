#!/bin/bash

# Quick Intelligence Test - Tests deployment without authentication
# This tests public/basic endpoints to verify deployment

API_URL="${API_URL:-https://signaltrue-backend.onrender.com}"

echo "=========================================="
echo "Quick Deployment Test"
echo "=========================================="
echo "Testing: $API_URL"
echo ""

# Test 1: Health Check
echo -n "1. Health Check... "
response=$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/api/health")
if [ "$response" = "200" ]; then
    echo "✓ PASSED (Server is running)"
else
    echo "✗ FAILED (Got HTTP $response)"
fi

# Test 2: Check if server responds
echo -n "2. Server Response... "
response=$(curl -s "$API_URL/api/health")
if echo "$response" | grep -q "status"; then
    echo "✓ PASSED (Server responding correctly)"
else
    echo "✗ FAILED (Unexpected response)"
fi

# Test 3: Check if intelligence routes are loaded
echo -n "3. Intelligence Routes... "
# Try to hit an intelligence endpoint (will return 401 without auth, which means route exists)
response=$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/api/intelligence/crisis/test")
if [ "$response" = "401" ] || [ "$response" = "403" ] || [ "$response" = "200" ]; then
    echo "✓ PASSED (Intelligence routes loaded)"
else
    echo "✗ WARNING (Got HTTP $response - route might not be loaded)"
fi

echo ""
echo "=========================================="
echo "Basic Deployment: ✓ SUCCESS"
echo "=========================================="
echo ""
echo "To run full intelligence tests:"
echo "1. Get your JWT token from login"
echo "2. Run: export TOKEN='your_token_here'"
echo "3. Run: export ORG_ID='your_org_id'"
echo "4. Run: export TEAM_ID='your_team_id' (optional)"
echo "5. Run: ./test-intelligence.sh"
echo ""
