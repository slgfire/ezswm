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
RUN pnpm build

# Stage 2: Runtime
FROM node:22-alpine AS runtime

WORKDIR /app

# Use the existing `node` user (uid 1000, gid 1000) baked into
# node:22-alpine instead of creating a custom one — same numeric IDs,
# no clash, simpler.

COPY --from=builder /app/.output .output

# Data directory owned by the runtime user.
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", ".output/server/index.mjs"]
