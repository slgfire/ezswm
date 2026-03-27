<div align="center">
  <img src="public/logo.png" alt="ezSWM" width="400"/>

  [![Version](https://img.shields.io/badge/Version-0.5.0-22c55e.svg)](https://github.com/slgfire/ezswm/releases)
  [![License](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
  [![Node](https://img.shields.io/badge/Node-22_LTS-green.svg)](https://nodejs.org)
  [![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82.svg)](https://nuxt.com)
  [![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](compose.yaml)
  [![Built with Claude Code](https://img.shields.io/badge/Built_with-Claude_Code-6B5CE7.svg)](https://claude.ai/claude-code)

  **Document your switches, VLANs, and IPs — visually. No database required.**

</div>

---

## About

ezSWM (easy Switch Management) is an open-source, web-based infrastructure documentation tool designed for LAN parties, homelab setups, and small-to-medium network environments. It provides a visual, intuitive way to document your switch infrastructure — ports, VLANs, IP allocations, and connections — without the overhead of a traditional IPAM/DCIM solution.

All data is stored as flat JSON files. No database setup, no migrations, no external dependencies. Just Docker and go.

> This project was built with significant assistance from [Claude Code](https://claude.ai/claude-code) (Anthropic's AI coding assistant). Architecture decisions, code implementation, and iterative refinement were done collaboratively between human and AI.

---

## Screenshots

<div align="center">
  <img src=".ai/images/screenshot-dashboard.png" width="900"/>
  <p><em>Dashboard — KPIs, port status, IP utilization, warnings, activity feed</em></p>
</div>

<div align="center">

| Switches | Layout Templates |
|:---:|:---:|
| <img src=".ai/images/screenshot-switches.png" width="450"/> | <img src=".ai/images/screenshot-templates.png" width="450"/> |

| VLANs | Login |
|:---:|:---:|
| <img src=".ai/images/screenshot-vlans.png" width="450"/> | <img src=".ai/images/screenshot-login.png" width="450"/> |

</div>

---

## Features

### Switch & Port Management

> Visual front-panel rendering with full port documentation

- See your ports as they look on the real switch, color-coded by VLAN
- Click any port to configure VLANs, speed, connected devices, and descriptions
- Link ports to other switches with **bidirectional sync** — speed, VLANs, and status are mirrored automatically
- Conflict detection warns when a target port is already connected
- Self-switch connections for stacked/multi-unit setups
- One-click port reset that cleanly removes bidirectional links

### Layout Templates

> Define switch models once, reuse everywhere

- Support for RJ45, SFP+, QSFP, Management, and Console port types
- Row layout modes: sequential, odd/even, or even/odd numbering
- Smart labels: `xe-0/0/` auto-generates as `xe-0/0/1`, `xe-0/0/2`, ...
- Default speed per block, overridable per port
- Live label sync — template changes propagate to all linked switches instantly

### VLAN & Network Management

> Color-coded VLANs, subnet tracking, IP allocation

- VLAN management with unique color assignments across your infrastructure
- Subnet management with IP allocation and range tracking
- Built-in IPv4 subnet calculator
- Ports show VLAN color tinting and trunk indicators (yellow stripe)

### Search, Export & Administration

> Everything you need to manage your documentation

- Global search across switches, VLANs, networks, IPs, and templates
- Export/import per entity, full backup/restore
- Client-side form validation on all create/edit forms
- Dark mode (deep industrial theme) + light mode
- i18n: English and German
- JSON file storage — no database, no migrations
- Docker-ready with CI/CD image builds

---

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/slgfire/ezswm.git
cd ezswm
export JWT_SECRET=$(openssl rand -hex 32)
docker compose up -d
```

Open http://localhost:3000 — follow the setup wizard to create your admin account.

### Demo Data

Populate with realistic demo data (switches, VLANs, networks, templates):

```bash
./scripts/seed-demo.sh
```

### Docker Pull (from GitHub Container Registry)

```bash
docker pull ghcr.io/slgfire/ezswm:latest
docker run -d -p 3000:3000 -e JWT_SECRET=$(openssl rand -hex 32) -v ezswm-data:/app/data ghcr.io/slgfire/ezswm:latest
```

### Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## Documentation

Full documentation is available at the [ezSWM Docs](https://slgfire.github.io/ezswm/):

- [Installation Guide](https://slgfire.github.io/ezswm/guide/installation) — Docker, local dev, configuration
- [User Guide](https://slgfire.github.io/ezswm/guide/user-guide) — Switches, VLANs, networks, ports
- [API Reference](https://slgfire.github.io/ezswm/api/reference) — All REST endpoints
- [FAQ & Troubleshooting](https://slgfire.github.io/ezswm/guide/faq)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Nuxt 4](https://nuxt.com) + TypeScript (strict) |
| UI | [Nuxt UI v4](https://ui.nuxt.com) + Tailwind CSS v4 |
| Validation | Zod (server) + UForm (client) |
| Auth | JWT + bcrypt |
| Storage | Atomic JSON file writes |
| Container | Docker multi-stage (node:22-alpine) |
| CI | GitHub Actions (auto Docker image build) |
| i18n | Nuxt i18n (EN/DE) |

---

## Roadmap

- **Sites / Locations** — Isolated sites with separate switches, VLANs, and networks per location (e.g. LAN party + data center)
- **Rack Planning** — Visual 19" rack view with height-unit positioning for switches and devices
- **Topology** — Interactive network topology diagram showing switch-to-switch connections
- **LAG Groups** — Link Aggregation Group management with visual port indicators
- **IPv6 Support** — IPv6 subnet and allocation tracking
- **Print View** — Printable switch front panel layouts

---

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

---

## License

[GNU General Public License v3.0](LICENSE)
