# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Install wget for health checks
RUN apk add --no-cache wget

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

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/v1/health || exit 1

# Start the application
CMD ["npm", "start"]