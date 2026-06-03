# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Skips pnpm's interactive modules-dir purge confirmation in non-TTY contexts.
ENV CI=true

# pnpm via corepack — version pinned by packageManager field in package.json.
RUN corepack enable

# Copy manifests first so install layer is cached when only source changes.
# docs/ is a workspace member, so pnpm needs its package.json to satisfy the
# workspace shape (otherwise subsequent commands trigger a re-resolution).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY docs/package.json ./docs/

RUN pnpm install --frozen-lockfile

COPY . .
# Generate Prisma Client (runs again here even though postinstall ran during
# install — guarantees the client matches the committed schema).
RUN pnpm prisma generate
RUN pnpm build

# Drop dev dependencies but keep prisma + @prisma/client + @prisma/engines,
# which we need at runtime for `prisma migrate deploy`.
RUN pnpm prune --prod --ignore-scripts

# Stage 2: Runtime
FROM node:22-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY docker-entrypoint.sh ./

# Data directory owned by the runtime user. The SQLite db + WAL + archived
# JSON files all live in /app/data so they sit on the persistent volume.
RUN mkdir -p /app/data \
 && chown -R node:node /app/data /app/node_modules /app/prisma /app/.output /app/package.json /app/docker-entrypoint.sh \
 && chmod +x /app/docker-entrypoint.sh

USER node

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV DATABASE_URL=file:/app/data/db.sqlite

# BusyBox wget in the alpine base resolves `localhost` to IPv6 `::1` first,
# but nitro listens only on IPv4 0.0.0.0:3000 — use 127.0.0.1 to force IPv4
# so the healthcheck doesn't loop on "Connection refused".
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
