# ezSWM

Easy Switch and IP Management (ezSWM) is a clean Nuxt 3 application for switch inventory, port lifecycle, network management, and IP allocation workflows.

## Features

- Dashboard with KPI cards and utilization indicators
- Switch CRUD with block-based front panel rendering
- Port editing via slideover panels
- Network CRUD with subnet and prefix-aware netmask derivation
- IP allocation validation (IPv4, subnet boundary, duplicate prevention)
- IP range management by network
- Layout template management in Settings
- Internationalization (English default, German ready)
- JSON repository storage with centralized persistence layer

## Tech Stack

- Nuxt 3
- TypeScript
- Nuxt UI
- Nuxt i18n
- Tailwind CSS (through Nuxt UI base)
- JSON file storage
- Docker + Docker Compose

## Docker Usage

```bash
cp .env.example .env
docker compose up --build
```

Application URL: `http://localhost:3000`

## Data Persistence

Persistent data is stored in `/app/data` and mounted with:

```yaml
volumes:
  - ./data:/app/data
```

The app uses centralized repositories under `server/storage` for all entities.

## Internationalization

- Default locale: English (`en`)
- Additional locale: German (`de`)
- Locale files:
  - `i18n/locales/en.json`
  - `i18n/locales/de.json`

## Project Structure

```text
components/
  dashboard/
  switch/
  network/
  ipam/
  settings/
  layout/
composables/
types/
utils/
i18n/
server/
  api/
  storage/
pages/
data/
```

## Roadmap

- Role-based access control
- Import/export and backup workflows
- Bulk port operations
- Enhanced subnet analytics
- Optional SQLite storage adapter

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit focused changes
4. Open a pull request with context and screenshots

## License

MIT
