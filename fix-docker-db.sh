#!/bin/bash
# Script to fix Docker database schema issue

echo "🔧 Fixing Docker database schema..."

# Stop and remove containers with volumes
echo "1. Stopping containers and removing volumes..."
docker compose down -v

# Remove any persistent volumes to ensure clean start
echo "2. Removing persistent volumes..."
docker volume prune -f

# Rebuild and start containers
echo "3. Starting containers with fresh database..."
docker compose up -d

# Wait for database to be ready
echo "4. Waiting for database to initialize..."
sleep 10

# Verify the schema
echo "5. Verifying database schema..."
docker compose exec -T db psql -U postgres -d loggenie -c "\d zscaler_logs"

echo "✅ Docker database should now have the correct schema!"
echo "Try uploading a file to test."