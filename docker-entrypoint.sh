#!/bin/sh
set -e

echo "[ezSWM] Applying database migrations..."
node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

echo "[ezSWM] Starting server..."
exec node .output/server/index.mjs
