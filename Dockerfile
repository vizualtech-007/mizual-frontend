# Multi-stage Dockerfile for Next.js
FROM node:18-alpine AS base

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Development stage
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Set development environment
ENV NODE_ENV=development

# Start development server with hot reload
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Install only production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start production server
CMD ["npm", "start"]