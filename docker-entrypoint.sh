#!/bin/sh
set -e

DATA_DIR="${DATA_DIR:-/app/data}"
DB_PATH="$DATA_DIR/db.sqlite"
VERSION_MARKER="$DATA_DIR/.version"
BACKUP_DIR="$DATA_DIR/backups"

CURRENT_VERSION="$(node -e 'const fs=require("fs"); const pkg=JSON.parse(fs.readFileSync("package.json","utf8")); if (typeof pkg.version !== "string" || pkg.version.length === 0) process.exit(1); process.stdout.write(pkg.version)')"
STORED_VERSION=""

if [ -f "$VERSION_MARKER" ]; then
  STORED_VERSION="$(tr -d '\r\n' < "$VERSION_MARKER")"
fi

if [ -f "$DB_PATH" ] && [ "$STORED_VERSION" != "$CURRENT_VERSION" ]; then
  mkdir -p "$BACKUP_DIR"

  TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
  OLD_VERSION="$STORED_VERSION"
  if [ -z "$OLD_VERSION" ]; then
    OLD_VERSION="none"
  fi

  BACKUP_NAME="${TIMESTAMP}_from-${OLD_VERSION}_to-${CURRENT_VERSION}"
  TMP_BACKUP_PATH="$BACKUP_DIR/.${BACKUP_NAME}.tmp.$$"
  FINAL_BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

  mkdir "$TMP_BACKUP_PATH"
  cp "$DB_PATH" "$TMP_BACKUP_PATH/db.sqlite"

  if [ -f "${DB_PATH}-wal" ]; then
    cp "${DB_PATH}-wal" "$TMP_BACKUP_PATH/db.sqlite-wal"
  fi

  if [ -f "${DB_PATH}-shm" ]; then
    cp "${DB_PATH}-shm" "$TMP_BACKUP_PATH/db.sqlite-shm"
  fi

  mv "$TMP_BACKUP_PATH" "$FINAL_BACKUP_PATH"
  echo "[ezSWM] Created pre-upgrade backup: $FINAL_BACKUP_PATH"

  BACKUP_COUNT=0
  for backup_path in $(for path in "$BACKUP_DIR"/*; do [ -d "$path" ] && printf '%s\n' "$path"; done | sort -r); do
    BACKUP_COUNT=$((BACKUP_COUNT + 1))
    if [ "$BACKUP_COUNT" -gt 5 ]; then
      rm -rf "$backup_path"
    fi
  done
fi

echo "[ezSWM] Applying database migrations..."
node_modules/.bin/prisma migrate deploy

MARKER_TMP_PATH="${VERSION_MARKER}.tmp.$$"
printf '%s\n' "$CURRENT_VERSION" > "$MARKER_TMP_PATH"
mv "$MARKER_TMP_PATH" "$VERSION_MARKER"

echo "[ezSWM] Starting server..."
exec node .output/server/index.mjs
