# Use lightweight official Node.js 20 Alpine Linux image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Copy package definition files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev || npm install --production

# Copy application source code
COPY public ./public
COPY server ./server
COPY database ./database
COPY assets ./assets
RUN mkdir -p uploads

# Expose server port
EXPOSE 3000

# Health check to ensure server is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/shop/settings || exit 1

# Start the application
CMD ["node", "server/index.js"]
