# Multi-stage production Dockerfile for Frontend (Vite + Nginx)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configs
COPY frontend/package*.json ./
RUN npm install

# Copy source code and build
COPY frontend/ ./
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN npm run build

# --- Production Nginx Web Server ---
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx SPA configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
