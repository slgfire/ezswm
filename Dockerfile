# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runtime

WORKDIR /app

# Create non-root user
RUN addgroup -S ezswm && adduser -S ezswm -G ezswm

# Copy built output
COPY --from=builder /app/.output .output

# Create data directory
RUN mkdir -p /app/data && chown -R ezswm:ezswm /app/data

USER ezswm

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", ".output/server/index.mjs"]
