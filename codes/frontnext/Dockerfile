# Multi-stage so the runtime image carries the built server and nothing else:
# no source, no dev dependencies, no package manager.
FROM node:22-alpine AS deps
WORKDIR /app
# corepack picks the version pinned in package.json. Without that pin it
# downloads whatever is newest, and a lockfile written by one pnpm being
# installed by another is a failure that only ever shows up in CI.
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --reporter=append-only

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0

# Not root. A container that only serves pages has no reason to be able to
# write to its own filesystem as root.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
USER nextjs

EXPOSE 8080
# Cloud Run injects PORT and does not promise 8080, so the default is a
# fallback rather than the value we rely on.
CMD ["sh", "-c", "PORT=${PORT:-8080} node server.js"]
