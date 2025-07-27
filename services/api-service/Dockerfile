# Use Node.js 20 Alpine for better compatibility and performance
FROM node:20-alpine

# Install curl for health checks (Render.com prefers curl)
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies for build
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodash -u 1001

# Create data directories with proper permissions
RUN mkdir -p /app/data/events /app/data/users && \
    chown -R nodash:nodejs /app/data

# Switch to non-root user
USER nodash

# Expose port (Render.com uses PORT env variable, default to 10000)
EXPOSE 10000

# Health check compatible with Render.com
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-10000}/v1/health || exit 1

# Start the application
CMD ["npm", "start"]