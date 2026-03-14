# ezSWM

**Easy Switch and IP Management** is a clean Nuxt 3 rewrite focused on maintainable architecture, realistic switch panel visualization, and practical network/IPAM workflows.

## Features

- Switch inventory with structured switch metadata
- Realistic block-based switch front-panel rendering (multiple blocks per device)
- Port management with slideover editing
- Network management with VLAN, subnet, prefix, and derived netmask
- IPAM inside network details:
  - IP allocations with validation (IPv4, subnet scope, duplicate protection)
  - IP ranges by category (`dhcp`, `reserved`, `static`, `infrastructure`)
- Dashboard with KPI cards and utilization indicators
- Layout template management in settings
- Internationalization setup with English and German locales
- JSON file persistence with centralized repository/storage layer

## Tech Stack

- Nuxt 3
- TypeScript
- Nuxt UI
- Nuxt i18n
- Tailwind CSS (via Nuxt UI base)
- JSON file storage
- Docker + Docker Compose

## Quick Start

### Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:3000`.

## Data Persistence

Application data is persisted as JSON files in `/app/data` inside the container.

The compose setup maps this to the host:

```yaml
volumes:
  - ./data:/app/data
```

Seed data is generated on startup when no JSON files exist.

## Internationalization

- Default locale: `en`
- Additional locale: `de`
- Locale files:
  - `i18n/locales/en.json`
  - `i18n/locales/de.json`

## Project Structure

```text
assets/
components/
composables/
i18n/
layouts/
pages/
server/
  api/
  storage/
    repositories/
types/
utils/
data/
```

## Architecture Notes

- Centralized storage abstraction (`JsonFileStore`) handles filesystem persistence.
- Repositories encapsulate domain persistence concerns:
  - switches
  - networks
  - layouts
- API layer contains business validation and CRUD endpoints.
- UI layer uses Nuxt UI defaults and slideover-based create/edit flows.

## Roadmap

- Add filtering/search and bulk operations
- Add audit trail and history
- Add import/export for layouts and IP plans
- Introduce optional SQLite backend while keeping repository contracts
- Add authentication and RBAC

## Contributing

1. Fork and create a feature branch
2. Implement changes with tests/checks
3. Open a pull request with context and screenshots for UI changes

## License

MIT
