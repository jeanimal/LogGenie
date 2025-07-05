#!/bin/bash

# LogGenie Deployment Script
# This script prepares the application for production deployment

set -e  # Exit on any error

echo "🚀 Starting LogGenie deployment build..."

# Step 1: Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/ public/

# Step 2: Build frontend
echo "📦 Building frontend with Vite..."
npx vite build

# Step 3: Build backend
echo "⚙️  Building backend with esbuild..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Step 4: Copy static files to correct location
echo "📂 Copying static files to production location..."
if [ -d "dist/public" ]; then
    cp -r dist/public ./public
    echo "✅ Static files copied successfully"
else
    echo "❌ Error: dist/public directory not found!"
    exit 1
fi

# Step 5: Verify build
echo "🔍 Verifying build structure..."
if [ -f "dist/index.js" ] && [ -d "public" ]; then
    echo "✅ Build completed successfully!"
    echo ""
    echo "📋 Deployment ready:"
    echo "  - Backend: dist/index.js"
    echo "  - Frontend: public/"
    echo ""
    echo "🏃 To start production server:"
    echo "  NODE_ENV=production node dist/index.js"
else
    echo "❌ Build verification failed!"
    exit 1
fi