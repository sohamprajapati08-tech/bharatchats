# Multi-stage production Dockerfile for Bharat Chat
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definitions
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies
RUN npm install --prefix server
RUN npm install --prefix client

# Copy source code
COPY server ./server
COPY client ./client

# Build production bundles
RUN npm run build --prefix server
RUN npm run build --prefix client

# --- Production Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Copy server production artifacts
COPY server/package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/src/db/schema.sql ./dist/db/schema.sql

# Create persistent storage directories
RUN mkdir -p /app/data /app/uploads

EXPOSE 5000

CMD ["node", "dist/index.js"]
