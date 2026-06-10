---
title: Installation
---

# Installation

## Requirements

- **Docker and Docker Compose** (recommended)
- OR **Node.js 22 LTS** + **pnpm 11** for local development

## Docker (Recommended)

The repository ships two compose files:

| File | Purpose |
|---|---|
| `compose.yaml` | Pulls the pre-built image from GHCR (`ghcr.io/slgfire/ezswm:latest`). Default for end users. |
| `compose.dev.yaml` | Builds the image from the local source tree. For development or testing unreleased changes. |

### Quick deploy (no source checkout needed)

Just grab the compose file and a `JWT_SECRET`:

```bash
curl -O https://raw.githubusercontent.com/slgfire/ezswm/main/compose.yaml
mkdir -p data && sudo chown -R 1000:1000 data
export JWT_SECRET=$(openssl rand -hex 32)
docker compose pull && docker compose up -d
```

Data persists in `./data` next to the compose file (bind mount — inspect and back up directly with normal file tools). If your host user isn't uid 1000, see [Custom UID / GID](#custom-uid--gid).

### From source

```bash
git clone https://github.com/slgfire/ezswm.git
cd ezswm
export JWT_SECRET=$(openssl rand -hex 32)
docker compose -f compose.dev.yaml up --build -d
```

## Docker Configuration

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NUXT_JWT_SECRET` | Yes | (empty) | Secret key for JWT token signing. Use a long random string. |
| `PORT` | No | `3000` | Port the application listens on. |
| `DATA_DIR` | No | `/app/data` | Directory for application data (SQLite file, WAL, and the JSON migration archive from older installs). |
| `DATABASE_URL` | No | `file:/app/data/db.sqlite` | SQLite location. Override only if you want the DB somewhere other than next to the data directory. |
| `PUID` / `PGID` | No | `1000` / `1000` | UID/GID the container process runs as. Set `PUID=0 PGID=0` to run as root. |

In Docker, environment variables that configure Nuxt runtime must use the `NUXT_` prefix (e.g., `NUXT_JWT_SECRET` instead of `JWT_SECRET`).

The container's `ENTRYPOINT` runs `prisma migrate deploy` before starting the server, so schema upgrades apply themselves on each container start — no separate migration step.

### Custom UID / GID

The image runs as uid `1000` by default. If your host user isn't uid 1000 (e.g. Synology, Unraid, custom server setup), either:

**Option A — chown `./data` to the container uid (recommended):**

```bash
export PUID=1026 PGID=100   # whatever your host uses
sudo chown -R $PUID:$PGID ./data
docker compose up -d
```

**Option B — run the container as root** (writes everywhere, no chown needed):

```bash
PUID=0 PGID=0 docker compose up -d
```

Both `PUID` and `PGID` are read from the environment by the compose file.

### Data Persistence

The compose files bind-mount `./data` into the container at `/app/data`. Everything lives there:

- `db.sqlite` — the application database
- `db.sqlite-wal`, `db.sqlite-shm` — SQLite's write-ahead log files
- `_archive_<ISO>/` — the JSON files from your previous install, kept after the one-shot 0.21 migration (see [Upgrading to 0.21.x](#upgrading-from-020x-to-021x))

Back up by copying the directory while the container is stopped (or use SQLite's online backup via `.backup` from `sqlite3`).

If you prefer a Docker named volume instead, edit your compose file:

```yaml
volumes:
  - ezswm-data:/app/data

volumes:
  ezswm-data:
```

## Local Development

```bash
git clone https://github.com/slgfire/ezswm.git
cd ezswm
pnpm install
```

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
# edit .env: set JWT_SECRET and verify DATABASE_URL
```

> **Note (0.25.0+):** `DATABASE_URL` is now resolved relative to the **repository root**, not the `prisma/` folder. The default `file:./data/db.sqlite` creates `data/db.sqlite` next to the project root — adjust the path if you use a non-default location.

Start the dev server:

```bash
export JWT_SECRET=dev-secret-change-me
pnpm dev
```

The application is available at `http://localhost:3000`.

**Note:** Without `JWT_SECRET` set, the app uses an empty default which is insecure. Always set a proper secret for any non-local use.

## Updating

### Pull latest image

```bash
docker compose pull
docker compose up -d
```

### Rebuild from source

```bash
git pull
docker compose -f compose.dev.yaml build --no-cache
docker compose -f compose.dev.yaml up -d
```

## Upgrading from 0.20.x to 0.21.x

0.21.0 moved storage from flat JSON files to embedded SQLite. The upgrade is automatic:

1. Pull the new image and restart. The first boot detects the legacy `data/*.json` files alongside an empty database, runs the one-shot migration in a single transaction (every record gets a fresh UUIDv4, all cross-references are remapped), and moves the original JSON files into `data/_archive_<ISO>/` for safekeeping.
2. Logs show the per-entity record counts and the archive location. If the migration fails, the database is left empty and the JSON files stay untouched — investigate and restart.
3. Entity URLs change. Bookmarks pointing at specific sites/switches/networks break once because the IDs are regenerated. The URL paths and the UI itself are unchanged.

::: warning Temporarily disabled features
Bulk import endpoints (`POST /api/backup/import`, `POST /api/data/import`, `POST /api/import/{entity}`) and the activity-log undo button return `501 Not Implemented` in 0.21.x. They're being reworked for SQLite and will return in a follow-up release. Backup *export* (the read side) works against SQLite and produces a new `schema: "sqlite-v1"` payload.
:::

## Backup

### Built-in backup

Use the **Data Management** section in the application settings to download a JSON dump of the database. Restore is currently disabled (see callout above) — copy the SQLite file directly to roll back.

### Manual backup

```bash
# Stop the container first to flush any in-flight writes.
docker compose stop ezswm
cp -r ./data ./backup-$(date +%F)
docker compose start ezswm
```

Online backup with `sqlite3` is also fine if you don't want to stop the container:

```bash
sqlite3 ./data/db.sqlite ".backup './backup-$(date +%F).sqlite'"
```
