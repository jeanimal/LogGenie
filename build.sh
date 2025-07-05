#!/bin/bash

# Build script for LogGenie deployment
echo "Building LogGenie application..."

# Build frontend with Vite
echo "Building frontend..."
npx vite build

# Build backend with esbuild
echo "Building backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Copy static files to expected location for production server
echo "Copying static files..."
if [ -d "dist/public" ]; then
    cp -r dist/public ./public
    echo "Static files copied to ./public"
else
    echo "Warning: dist/public directory not found"
fi

echo "Build completed successfully!"