# syntax=docker/dockerfile:1

# Standalone ezSWM MCP image (Streamable HTTP). The app image stays separate;
# only the mcp package and its production dependency closure are installed here.
ARG NODE_IMAGE=node:26.13.0-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216

# pnpm 11 validates all workspace importers even for a filtered install.
# Install build dependencies without scripts, then deploy only the MCP closure.
FROM ${NODE_IMAGE} AS builder
RUN test "$(node --version)" = "v26.13.0"
WORKDIR /src
ENV CI=true
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY docs/package.json ./docs/
COPY mcp/package.json ./mcp/
RUN npm install --global "$(node -p "require('./package.json').packageManager")" \
 && pnpm install --frozen-lockfile --ignore-scripts
COPY mcp ./mcp
RUN ./mcp/node_modules/.bin/tsc -p mcp/tsconfig.json \
 && node mcp/scripts/version.mjs stamp \
 && pnpm --filter ezswm-mcp deploy --legacy --prod /out/mcp

FROM ${NODE_IMAGE} AS runtime
RUN test "$(node --version)" = "v26.13.0"
ARG VERSION=0.0.0
WORKDIR /app/mcp

ENV NODE_ENV=production \
    PORT=3000

# Deployment contains only the MCP package and its production dependencies.
COPY --from=builder --chown=node:node /out/mcp ./

USER node
EXPOSE 3000

LABEL org.opencontainers.image.title="ezswm-mcp" \
      org.opencontainers.image.description="ezSWM MCP server (Streamable HTTP)" \
      org.opencontainers.image.version="${VERSION}"

# The HTTP listener keeps the loopback default. Exposing it is an explicit
# operator opt-in: HOST=0.0.0.0, EZSWM_HTTP_ALLOW_REMOTE_BIND=true and
# EZSWM_HTTP_ALLOWED_HOSTS/EZSWM_HTTP_ALLOWED_ORIGINS, with TLS in front.
# No upstream credentials are baked in: set EZSWM_URL, EZSWM_TOKEN (or
# EZSWM_TOKEN_FILE) and EZSWM_MCP_AUTH_TOKEN at runtime.
CMD ["node", "dist/index.js"]
