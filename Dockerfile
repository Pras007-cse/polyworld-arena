# Stage 1: Build Frontend and Backend
FROM node:20-slim AS builder
WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_MAXSOCKETS=5

# Copy package manifests first for Docker layer caching
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install frontend dependencies and build frontend
RUN --mount=type=cache,id=s/5ef5fad1-1e27-4a2d-8b07-53d1bdb568e4-/root/.npm,target=/root/.npm \
    cd frontend && npm ci
COPY shared ./shared
COPY frontend ./frontend
RUN cd frontend && npm run build

# Install backend dependencies and build backend
RUN --mount=type=cache,id=s/5ef5fad1-1e27-4a2d-8b07-53d1bdb568e4-/root/.npm,target=/root/.npm \
    cd backend && npm ci
COPY backend ./backend
RUN cd backend && npm run build

# Stage 2: Production Runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000 \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_MAXSOCKETS=5

# Install only production dependencies for backend (utilizing npm cache from builder)
COPY backend/package*.json ./backend/
RUN --mount=type=cache,id=s/5ef5fad1-1e27-4a2d-8b07-53d1bdb568e4-/root/.npm,target=/root/.npm \
    cd backend && npm ci --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 4000
CMD ["node", "backend/dist/backend/src/index.js"]
