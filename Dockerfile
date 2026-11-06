# syntax=docker/dockerfile:1

# ---- Base image ----
FROM node:22-alpine AS base

# ---- Install dependencies ----
FROM base AS deps
# Required by some native modules (e.g. sharp) on Alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build the app ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Neon and Better Auth configuration is read at runtime. No credentials are
# required to build, and no database/auth keys are baked into browser assets.
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- Production runtime image ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# `output: "standalone"` (next.config.ts) traces only the files needed to
# run the server, including a minimal node_modules — no separate install
# step needed in this final stage.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
