# syntax=docker/dockerfile:1

# ── Stage 1: build React frontend ──────────────────────────────────────────
FROM node:20-bookworm-slim AS frontend-build

WORKDIR /app/frontend

COPY Rachel-frontend/package.json Rachel-frontend/package-lock.json ./
RUN npm ci

COPY Rachel-frontend/ ./
RUN npm run build


# ── Stage 2: production image (API + static UI) ────────────────────────────
FROM node:20-bookworm-slim AS production

WORKDIR /app

# Native build tools required by better-sqlite3
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY Rachel-backend/package.json Rachel-backend/package-lock.json ./
RUN npm ci --omit=dev

COPY Rachel-backend/ ./
COPY --from=frontend-build /app/frontend/dist ./public

ENV NODE_ENV=production
ENV PORT=3000
ENV STATIC_DIR=/app/public
ENV DATABASE_PATH=/app/data/rachel.db

RUN mkdir -p /app/data

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["node", "main.js"]
