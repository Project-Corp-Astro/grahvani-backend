# Production build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace config
COPY package.json package-lock.json ./
COPY turbo.json ./

# Copy contracts (required for all services)
COPY contracts ./contracts

# Copy the specific service
COPY services/api-gateway ./services/api-gateway

# Install dependencies and build
RUN npm ci
RUN npx turbo run build --filter=@grahvani/api-gateway

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/services/api-gateway/package.json ./package.json
COPY --from=builder /app/services/api-gateway/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080

CMD ["node", "dist/server.js"]
