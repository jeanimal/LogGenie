#!/bin/bash

# LogGenie Docker Setup Verification Script
# This script helps verify that Docker mock authentication is configured correctly

echo "🔍 LogGenie Docker Setup Verification"
echo "======================================"

# Check if Docker is running
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found in current directory"
    exit 1
fi

echo "✅ Docker is available"
echo "✅ docker-compose.yml found"

# Check environment variables in docker-compose.yml
echo ""
echo "🔧 Checking docker-compose.yml configuration..."

if grep -q "MOCK_AUTH=true" docker-compose.yml; then
    echo "✅ MOCK_AUTH=true is set in docker-compose.yml"
else
    echo "❌ MOCK_AUTH=true is NOT set in docker-compose.yml"
    echo "   Please add 'MOCK_AUTH=true' to the environment section"
    exit 1
fi

if grep -q "NODE_ENV=development" docker-compose.yml; then
    echo "✅ NODE_ENV=development is set in docker-compose.yml"
else
    echo "❌ NODE_ENV=development is NOT set in docker-compose.yml"
    echo "   Please add 'NODE_ENV=development' to the environment section"
    exit 1
fi

# Check if containers are running
echo ""
echo "🐳 Checking Docker containers..."

if docker compose ps | grep -q "app.*Up"; then
    echo "✅ LogGenie app container is running"
    
    # Check logs for mock auth
    echo ""
    echo "📋 Checking authentication logs..."
    
    if docker compose logs app | grep -q "MOCK_AUTH: true"; then
        echo "✅ Mock authentication is active"
    else
        echo "❌ Mock authentication is NOT active"
        echo "   Container logs:"
        docker compose logs app | grep -i auth | head -5
    fi
    
    # Test connectivity
    echo ""
    echo "🌐 Testing connectivity..."
    
    if curl -s -f http://localhost:3000 > /dev/null; then
        echo "✅ LogGenie is accessible at http://localhost:3000"
    else
        echo "❌ LogGenie is NOT accessible at http://localhost:3000"
        echo "   Check if port 3000 is available or container is running"
    fi
    
else
    echo "❌ LogGenie app container is not running"
    echo "   Run: docker compose up -d"
    exit 1
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Visit http://localhost:3000"
echo "2. Click 'Sign in with Authentication'"
echo "3. Should redirect to dashboard without requiring credentials"
echo "4. If still showing login screen, check the logs:"
echo "   docker compose logs app | grep -i auth"
echo ""
echo "✅ Verification complete!"