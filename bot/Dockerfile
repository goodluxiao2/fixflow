# FixFlow Bot Server Dockerfile
# Node.js backend for the bounty hunter system

FROM node:20-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# ============================================
# Dependencies Stage
# ============================================
FROM base AS deps

# Copy package files
COPY package*.json ./

# Install production dependencies only
# Use npm install with --omit=dev since package-lock.json may not exist
RUN npm install --omit=dev && npm cache clean --force

# ============================================
# Production Stage
# ============================================
FROM base AS production

# Set environment to production
ENV NODE_ENV=production

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY --chown=nodejs:nodejs . .

# Remove unnecessary files
RUN rm -rf test/ *.log .env .env.* bounty-hunter-bot.pem

# Use non-root user
USER nodejs

# Expose the application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/index.js"]
