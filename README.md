# ezSWM

**Easy Switch and IP Management**

ezSWM is a clean, production-minded Nuxt 4 application for switch management, realistic block-based port visualization, network/VLAN administration, and JSON-based IPAM workflows.

## Features

- Switch inventory with full CRUD and detail pages
- Block-based switch front panel rendering (layout templates with multiple blocks)
- Port documentation and inline port editing via slideover
- Network/VLAN CRUD with automatic netmask derivation from prefix
- Per-network IP allocations (validation: IPv4, subnet membership, uniqueness)
- Per-network IP ranges (validation: IPv4, subnet membership, ordering, overlap)
- Global header search across pages, switches, networks, VLANs, IPs, and hostnames
- Dashboard KPIs and subnet utilization overview
- Settings area with layout template management and system scaffolding
- Internationalization-ready architecture (English default + German scaffold)
- Dockerized deployment with persistent JSON data volume

## Tech Stack

- Nuxt 4
- TypeScript
- Nuxt UI
- Nuxt i18n
- Tailwind CSS (via Nuxt UI)
- JSON file storage (`/app/data`)
- Docker + Docker Compose

## Getting Started

### Local development

```bash
npm install
npm run dev
```

The app runs on `http://localhost:3000`.

### Production build

```bash
npm run build
npm run start
```

## Docker Usage

```bash
docker compose up --build
```

App URL: `http://localhost:3000`

## Data Persistence

ezSWM persists all operational data as JSON files under `/app/data` in the container.

Docker Compose mounts this directory using:

```yaml
volumes:
  - ./data:/app/data
```

This keeps data persistent across container rebuilds/restarts.

## Internationalization

- Default locale: `en`
- Additional scaffold locale: `de`
- Locale files:
  - `i18n/locales/en.json`
  - `i18n/locales/de.json`

## Project Structure

```text
components/
  layout/
  dashboard/
  switch/
  network/
  ipam/
  settings/
  ui/
composables/
types/
utils/
i18n/
server/
  api/
  storage/
  repositories/
  plugins/
pages/
data/
```

## Architecture Notes

- Centralized storage layer in `server/storage`
- Repository abstraction in `server/repositories`
- Thin API handlers in `server/api`
- Seed plugin initializes realistic demo data on first run
- Type model centralization in `types/models.ts`

This keeps migration to SQLite straightforward later.

## Roadmap

- Role-based access and audit logs
- Bulk import/export workflows
- Advanced model-to-layout assignment rules
- CIDR-aware visualization and subnet capacity forecasting
- Optional SQLite storage backend

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes with clear messages
4. Open a pull request

## License

MIT License
