# Installation

## Requirements

- **Docker and Docker Compose** (recommended)
- OR **Node.js 22 LTS** for local development

## Docker (Recommended)

```bash
git clone https://github.com/slgfire/ezswm.git
cd ezswm
```

Create a `docker-compose.yml`:

```yaml
services:
  ezswm:
    image: ghcr.io/slgfire/ezswm:latest
    ports:
      - "3000:3000"
    environment:
      - NUXT_JWT_SECRET=your-secret-key-here
    volumes:
      - ezswm-data:/app/data
    restart: unless-stopped

volumes:
  ezswm-data:
```

Start the application:

```bash
docker compose up -d
```

Alternatively, build from source instead of pulling the image:

```yaml
services:
  ezswm:
    build: .
    # ... same config as above
```

## Docker Configuration

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NUXT_JWT_SECRET` | Yes | (empty) | Secret key for JWT token signing. Use a long random string. |
| `PORT` | No | `3000` | Port the application listens on. |
| `DATA_DIR` | No | `/app/data` | Directory for JSON data storage. |

In Docker, environment variables that configure Nuxt runtime must use the `NUXT_` prefix (e.g., `NUXT_JWT_SECRET` instead of `JWT_SECRET`).

### Data Persistence

Mount a volume or bind mount to `/app/data` to persist data across container restarts. Without this, all data is lost when the container is removed.

```yaml
volumes:
  - ./data:/app/data      # bind mount
  # or
  - ezswm-data:/app/data  # named volume
```

## Local Development

```bash
git clone https://github.com/slgfire/ezswm.git
cd ezswm
npm install
```

Set the JWT secret and start the dev server:

```bash
export JWT_SECRET=dev-secret-change-me
npm run dev
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
docker compose build --no-cache
docker compose up -d
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
