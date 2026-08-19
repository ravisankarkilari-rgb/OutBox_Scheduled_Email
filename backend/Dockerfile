# Production Dockerfile for ReachInbox / Outbox Backend & BullMQ Worker
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy root package files & prisma schema
COPY package*.json ./
COPY prisma ./prisma/
COPY backend/package*.json ./backend/
COPY backend/tsconfig.json ./backend/

# Install dependencies
RUN npm install
WORKDIR /app/backend
RUN npm install

# Generate Prisma Client
RUN npx prisma generate --schema=../prisma/schema.prisma

# Copy source code and build TypeScript
COPY backend/src ./src
RUN npm run build

# --- Production Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
COPY prisma ./prisma/
COPY backend/package*.json ./backend/

# Install only production dependencies
WORKDIR /app/backend
RUN npm install --omit=dev

# Copy generated Prisma Client and compiled dist from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/backend/dist ./dist

EXPOSE 5000

# Start command: Run migrations and start Express server + BullMQ worker
CMD ["sh", "-c", "npx prisma migrate deploy --schema=../prisma/schema.prisma && node dist/server.js"]
