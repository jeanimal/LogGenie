# Simple Docker setup for local development
FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for tsx)
RUN npm ci

# Copy all source code
COPY . .

# Create necessary directories
RUN mkdir -p uploads public

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application in development mode using tsx (avoids build issues)
ENV NODE_ENV=development
# Set explicit path for vite.config.ts compatibility
ENV INIT_CWD=/app
ENV PWD=/app
WORKDIR /app

# Use tsx with explicit loader to handle import.meta issues
CMD ["npx", "tsx", "server/index.ts"]
