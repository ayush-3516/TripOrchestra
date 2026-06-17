# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — build the frontend (and typecheck the backend)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app

# Install all workspace deps using only the manifests first (better layer caching).
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci

# Copy sources and build the SPA -> frontend/dist (also runs backend tsc --noEmit).
COPY shared ./shared
COPY frontend ./frontend
COPY backend ./backend
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — runtime (backend serves the API + the built frontend)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Prod-only deps (tsx is a runtime dep, so the server runs without devDependencies).
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --omit=dev && npm cache clean --force

# Backend source + shared types (run via tsx, which resolves the @shared alias).
COPY shared ./shared
COPY backend ./backend
# Built SPA from the build stage.
COPY --from=build /app/frontend/dist ./frontend/dist

EXPOSE 5000
# Railway injects $PORT; config.ts reads it (defaults to 5000).
CMD ["npm", "--workspace", "backend", "run", "start"]
