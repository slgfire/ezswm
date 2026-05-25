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
| `DATA_DIR` | No | `/app/data` | Directory for JSON data storage. |
| `PUID` / `PGID` | No | `1000` / `1000` | UID/GID the container process runs as. Set `PUID=0 PGID=0` to run as root. |

In Docker, environment variables that configure Nuxt runtime must use the `NUXT_` prefix (e.g., `NUXT_JWT_SECRET` instead of `JWT_SECRET`).

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

The compose files bind-mount `./data` into the container at `/app/data`. All JSON state lives there. Back up by copying the directory.

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

Set the JWT secret and start the dev server:

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

## Backup

### Built-in backup

Use the **Data Management** section in the application settings to create and restore full backups through the UI.

### Manual backup

The data directory contains all application state as JSON files. Copy it to create a backup:

```bash
# Docker named volume
docker cp $(docker compose ps -q ezswm):/app/data ./backup

# Bind mount
cp -r ./data ./backup
```
