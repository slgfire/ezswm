# ezSWM

Easy Switch and IP Management built with Nuxt 4 and JSON storage.

## Tech Stack
- Nuxt 4
- TypeScript
- Nuxt UI
- Nuxt i18n
- Tailwind via Nuxt UI
- JSON storage in `/app/data`
- Docker + docker-compose

## Development
```bash
npm install
npm run dev
```

## Production build
```bash
npm run build
npm run start
```

## Docker
```bash
cp .env.example .env
docker compose up --build
```

The only mounted persistent volume is `./data:/app/data`.

## Project pages
- Dashboard
- Switches
- Switch detail
- Networks
- Network detail (Overview / IP allocations / IP ranges)
- Settings
