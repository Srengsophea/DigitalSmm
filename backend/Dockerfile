# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Create persistent data volume directory
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 5000

CMD ["node", "dist/server.js"]
