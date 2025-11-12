#!/bin/bash

# Railway CLI Debugging Script
# This helps you find the correct service and environment names

echo "🚂 Railway CLI Debugging"
echo "========================"
echo ""

# Check if RAILWAY_TOKEN is set
if [ -z "$RAILWAY_TOKEN" ]; then
    echo "❌ RAILWAY_TOKEN not set"
    echo ""
    echo "Please set your Railway token first:"
    echo "  export RAILWAY_TOKEN='your-token-from-railway-dashboard'"
    echo ""
    echo "Get your token from: https://railway.app/account/tokens"
    exit 1
fi

echo "✅ RAILWAY_TOKEN is set"
echo ""

# Check Railway CLI version
echo "Railway CLI version:"
railway --version
echo ""

# Show current user
echo "Current Railway user:"
railway whoami 2>&1 || echo "Not authenticated yet"
echo ""

# Try to link the project (interactive)
echo "Linking to Railway project..."
echo "(Select your Cohort project when prompted)"
railway link 2>&1 || echo "Already linked or link failed"
echo ""

# List services
echo "Available services:"
railway service list 2>&1 || railway service 2>&1 || echo "Could not list services"
echo ""

# List environments
echo "Available environments:"
railway environment list 2>&1 || railway environment 2>&1 || echo "Could not list environments"
echo ""

# Show project info
echo "Project info:"
railway status 2>&1 || echo "Not linked to a project"
echo ""

echo "========================"
echo "📝 Next Steps:"
echo ""
echo "If you see your services listed above, use those exact names in:"
echo "  - GitHub variable: RAILWAY_STAGING_SERVICE_NAME"
echo "  - GitHub variable: RAILWAY_PRODUCTION_SERVICE_NAME"
echo ""
echo "Common Railway CLI commands:"
echo "  railway up                          # Deploy to current linked service"
echo "  railway up -s <service-name>        # Deploy to specific service"
echo "  railway up -e <environment>         # Deploy to specific environment"
echo "  railway up -s <service> -e <env>    # Deploy to specific service + environment"
