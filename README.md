# ezSWM

Easy Switch and IP Management (ezSWM) is a clean Nuxt 4 application for switch management, realistic block-based port visualization, network documentation, and JSON-based IPAM workflows.

## Features

- Switch inventory with create/edit/delete and detail pages
- Realistic switch front panel rendering using reusable layout templates and layout blocks
- Port documentation with status, VLAN, link details, and inline editing via slideover
- Network management with auto-derived netmask from CIDR prefix
- Network detail tabs for overview, IP allocations, and IP ranges
- Validation for IPv4 allocations and ranges within subnet boundaries
- Global header search across pages, switches, networks, VLANs, subnets, and IP allocations
- Dashboard KPIs and utilization snapshots
- Settings sections for General, Switch models, Port layouts, IPAM defaults, Appearance, and Language
- Nuxt i18n integration (English default + German scaffold)

## Tech Stack

- Nuxt 4
- TypeScript
- Nuxt UI
- Nuxt i18n
- Tailwind CSS via Nuxt UI
- JSON file storage in `/app/data`
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

The application runs on `http://localhost:3000`.

## Data Persistence

Persistent JSON data is mounted through Docker Compose using:

```yaml
volumes:
  - ./data:/app/data
```

The container stores runtime data at `/app/data/store.json`.

## Internationalization

- Default locale: `en`
- Additional locale scaffold: `de`
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
```

## Roadmap

- Stronger overlap validation between IP ranges
- Bulk import/export for switches and networks
- Audit log for configuration changes
- Optional SQLite storage adapter

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request

## License

MIT License
