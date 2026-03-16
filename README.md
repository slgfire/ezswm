# ezSWM - Switch & IP Management

A modern, open-source infrastructure documentation tool for switch and IP management. Built for LAN parties, small data centers, and network teams.

## Features

- **Switch Inventory** - Document switches with port-level detail
- **Port Visualization** - Visual port grid with VLAN color coding
- **VLAN Management** - Track VLANs with unique color assignments
- **Network Documentation** - Subnet management with IP allocation tracking
- **IP Management** - Individual IP allocations and range tracking
- **Layout Templates** - Reusable switch model definitions
- **Topology View** - Network connection visualization
- **Subnet Calculator** - IPv4 subnet calculation tool
- **Dark Mode** - Dark theme by default
- **Internationalization** - English and German
- **JSON Storage** - No database required
- **Docker Ready** - Multi-stage Docker build

## Quick Start

### Prerequisites

- Node.js 22 LTS
- npm
- Docker + docker-compose (optional)

### Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000 - you will be guided through initial setup.

### Docker

```bash
export JWT_SECRET=your-secure-random-secret
docker compose build
docker compose up -d
```

Open http://localhost:3000

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | - | Secret for JWT token signing |
| `PORT` | No | `3000` | HTTP port |
| `DATA_DIR` | No | `/app/data` | JSON data storage path |

Note: In Docker, set `NUXT_JWT_SECRET` and `NUXT_DATA_DIR` (Nuxt runtime config convention).

## Technology Stack

- [Nuxt 3](https://nuxt.com) with TypeScript (strict mode)
- [Nuxt UI v2](https://ui.nuxt.com) - UI components
- [Tailwind CSS](https://tailwindcss.com) - Styling
- JSON file storage - No database needed
- Docker - Multi-stage production build

## Data Storage

All data is stored as JSON files in the data directory (`./data` locally, `/app/data` in Docker). The data directory is automatically created on first startup.

## License

[GNU General Public License v3.0](LICENSE)
