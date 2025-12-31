#!/bin/bash

# SignalTrue - Verify Backend Installation
# This script checks that all new models, services, and routes are properly installed

echo "🔍 SignalTrue Backend Installation Verification"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "backend/server.js" ]; then
    echo "❌ Error: Must be run from the signaltrue root directory"
    exit 1
fi

echo "📁 Checking new model files..."
models=(
    "backend/models/behavioralDriftIndex.js"
    "backend/models/coordinationLoadIndex.js"
    "backend/models/bandwidthTaxIndicator.js"
    "backend/models/silenceRiskIndicator.js"
    "backend/models/capacityStatus.js"
    "backend/models/driftPlaybook.js"
    "backend/models/driftTimeline.js"
)

for model in "${models[@]}"; do
    if [ -f "$model" ]; then
        echo "  ✅ $model"
    else
        echo "  ❌ Missing: $model"
    fi
done

echo ""
echo "📁 Checking new service files..."
services=(
    "backend/services/bdiService.js"
    "backend/services/indicesService.js"
)

for service in "${services[@]}"; do
    if [ -f "$service" ]; then
        echo "  ✅ $service"
    else
        echo "  ❌ Missing: $service"
    fi
done

echo ""
echo "📁 Checking new route files..."
routes=(
    "backend/routes/bdiRoutes.js"
)

for route in "${routes[@]}"; do
    if [ -f "$route" ]; then
        echo "  ✅ $route"
    else
        echo "  ❌ Missing: $route"
    fi
done

echo ""
echo "📁 Checking new script files..."
scripts=(
    "backend/scripts/seedPlaybooks.js"
)

for script in "${scripts[@]}"; do
    if [ -f "$script" ]; then
        echo "  ✅ $script"
    else
        echo "  ❌ Missing: $script"
    fi
done

echo ""
echo "🔧 Checking server.js for route imports..."
if grep -q "import bdiRoutes" backend/server.js; then
    echo "  ✅ bdiRoutes imported"
else
    echo "  ❌ bdiRoutes not imported in server.js"
fi

if grep -q 'app.use("/api/bdi"' backend/server.js; then
    echo "  ✅ BDI routes mounted"
else
    echo "  ❌ BDI routes not mounted in server.js"
fi

echo ""
echo "📚 Checking documentation files..."
docs=(
    "IMPLEMENTATION_SUMMARY.md"
    "FRONTEND_DEVELOPER_GUIDE.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo "  ✅ $doc"
    else
        echo "  ❌ Missing: $doc"
    fi
done

echo ""
echo "🧹 Checking Jira cleanup..."
jira_count=$(grep -r -i "jira" src/ public/ PRODUCT_FEATURES.md PROJECT_COMPLETE.md 2>/dev/null | wc -l)
if [ "$jira_count" -eq 0 ]; then
    echo "  ✅ No Jira references found"
else
    echo "  ⚠️  Warning: $jira_count Jira references still found"
fi

echo ""
echo "================================================"
echo "✅ Backend installation verification complete!"
echo ""
echo "Next steps:"
echo "1. Install dependencies: cd backend && npm install"
echo "2. Seed playbooks: node backend/scripts/seedPlaybooks.js"
echo "3. Start backend: cd backend && node server.js"
echo "4. Test endpoint: curl http://localhost:8080/api/dashboard/:teamId"
echo ""
