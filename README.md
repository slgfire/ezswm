# ezSWM

Open-source network documentation tool for small networks.

## Nuxt 3 Application

A self-hosted Nuxt 3 application for managing and visualizing network switches, port layouts, VLAN networks, and IP allocations.

## Highlights

- Nuxt 3 full-stack app with TypeScript.
- JSON storage today, storage abstraction ready for SQLite later.
- Docker-ready and open-source friendly.
- Network / VLAN overview with subnet utilization metrics.
- IP allocation tracking with status and gateway highlighting.
- Persistent data mounted from `./data` into `/app/data`.

## Storage Architecture

The application now uses a repository + storage engine architecture so API routes and business logic do not depend on JSON files directly.

### Structure

- `server/storage/interfaces/` – repository and storage contracts.
- `server/storage/repositories/` – repository implementations (`SwitchRepository`, `PortRepository`, `LayoutRepository`, `LocationRepository`, `RackRepository`).
- `server/storage/json/` – JSON engine and seed handling.
- `server/storage/index.ts` – central storage context factory used by API routes.

### Current storage backend

- Active implementation: JSON (`store.json`).
- Data directory: `data` locally, `/app/data` in Docker.
- Missing JSON file is created automatically.
- Seed/demo data is generated automatically on first startup when no data exists.
- Writes use a temp file + rename strategy for robust, atomic-like updates.
- IDs are stable and generated once.
- JSON is written with indentation for readability.

## Data Path

The runtime config resolves `DATA_DIR`:

- Local default: `data`
- Docker default: `/app/data`

## Development

```bash
npm install
npm run dev
```

## Docker Compose

```yaml
services:
  ezswm:
    volumes:
      - ./data:/app/data
```

Start with:

```bash
cp .env.example .env
docker compose up -d --build
```

Then open `http://localhost:3000` (or `APP_PORT`).
