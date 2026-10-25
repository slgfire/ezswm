# syntax=docker/dockerfile:1

# Standalone ezSWM MCP image (Streamable HTTP). The app image stays separate;
# only the mcp package and its production dependency closure are installed here.
ARG NODE_IMAGE=node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53

# Dependency stages install from the root pnpm-lock.yaml with a reduced
# workspace file: the install stays frozen (and subject to the .npmrc
# minimum-release-age), while no app workspace/dependencies are pulled in.
FROM ${NODE_IMAGE} AS deps
RUN test "$(node --version)" = "v24.22.1"
WORKDIR /src
ENV CI=true
RUN corepack enable
COPY pnpm-lock.yaml .npmrc ./
COPY package.json /tmp/ezswm-package.json
COPY mcp/package.json ./mcp/
RUN corepack prepare "$(node -p "require('/tmp/ezswm-package.json').packageManager")" --activate \
 && printf "packages:\n  - 'mcp'\n" > pnpm-workspace.yaml \
 && pnpm install --prod --frozen-lockfile --ignore-scripts

FROM ${NODE_IMAGE} AS builder
RUN test "$(node --version)" = "v24.22.1"
WORKDIR /src
ENV CI=true
RUN corepack enable
COPY pnpm-lock.yaml .npmrc ./
COPY package.json /tmp/ezswm-package.json
COPY mcp/package.json ./mcp/
RUN corepack prepare "$(node -p "require('/tmp/ezswm-package.json').packageManager")" --activate \
 && printf "packages:\n  - 'mcp'\n" > pnpm-workspace.yaml \
 && pnpm install --frozen-lockfile --ignore-scripts
# The root manifest supplies the release version; it is never installed here.
COPY package.json ./
COPY mcp ./mcp
RUN ./mcp/node_modules/.bin/tsc -p mcp/tsconfig.json \
 && node mcp/scripts/version.mjs stamp

FROM ${NODE_IMAGE} AS runtime
RUN test "$(node --version)" = "v24.22.1"
ARG VERSION=0.0.0
WORKDIR /app/mcp

ENV NODE_ENV=production \
    PORT=3000

# Production closure only, copied from the frozen install above.
COPY --from=deps --chown=node:node /src/node_modules /app/node_modules
COPY --from=deps --chown=node:node /src/mcp/node_modules ./node_modules
COPY --from=builder --chown=node:node /src/mcp/dist ./dist
COPY --chown=node:node mcp/package.json ./

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
