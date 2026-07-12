<div align="center">
  <img src="public/logo.png" alt="ezSWM" width="400"/>

  [![Version](https://img.shields.io/github/v/release/slgfire/ezswm?label=Version&color=22c55e)](https://github.com/slgfire/ezswm/releases)
  [![License](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
  [![Node](https://img.shields.io/badge/Node-22_LTS-green.svg)](https://nodejs.org)
  [![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82.svg)](https://nuxt.com)
  [![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](compose.yaml)
  [![AI Assisted](https://img.shields.io/badge/AI_Assisted-6B5CE7.svg)](#about)
  [![Dependabot](https://img.shields.io/badge/Dependabot-enabled-0366d6.svg?logo=dependabot)](https://github.com/slgfire/ezswm/security/dependabot)

  **Document your switches, VLANs, and IPs — visually. SQLite, zero setup.**

  [Documentation](https://slgfire.github.io/ezswm/) | [Installation](https://slgfire.github.io/ezswm/guide/installation) | [User Guide](https://slgfire.github.io/ezswm/guide/user-guide) | [API Reference](https://slgfire.github.io/ezswm/api/reference)

</div>

---

## About

ezSWM (easy Switch Management) is an open-source, web-based infrastructure documentation tool designed for LAN parties, homelab setups, and small-to-medium network environments. It provides a visual, intuitive way to document your switch infrastructure — ports, VLANs, IP allocations, and connections — without the overhead of a traditional IPAM/DCIM solution.

All data lives in a single embedded SQLite file inside the volume you mount — no external database server to run, no migrations to wire up manually. Schema upgrades apply themselves on container start.

> This project is developed with AI-assisted workflows. Architecture decisions, implementation, review, and iterative refinement remain human-directed.

---

## Quick Start

Just `docker run`:

```bash
docker run -d -p 3000:3000 \
  -e NUXT_JWT_SECRET=$(openssl rand -hex 32) \
  -v ezswm-data:/app/data \
  ghcr.io/slgfire/ezswm:latest
```

Or with `docker compose` (one file, no source clone needed):

```bash
curl -O https://raw.githubusercontent.com/slgfire/ezswm/main/compose.yaml
export JWT_SECRET=$(openssl rand -hex 32)
docker compose pull && docker compose up -d
```

When writing your own compose file, set `NUXT_JWT_SECRET` in the service `environment:` block. The official `compose.yaml` maps the host-side `JWT_SECRET` variable to `NUXT_JWT_SECRET` for convenience.

Open http://localhost:3000 — follow the setup wizard to create your admin account.

<details>
<summary>More installation options</summary>

### Docker Compose (build from source)

```bash
git clone https://github.com/slgfire/ezswm.git
cd ezswm
export JWT_SECRET=$(openssl rand -hex 32)
docker compose -f compose.dev.yaml up --build -d
```

### Local Development

```bash
git clone https://github.com/slgfire/ezswm.git
cd ezswm
pnpm install
pnpm dev
```

### Demo Data

```bash
./scripts/seed-demo.sh
```

</details>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Nuxt 4](https://nuxt.com) + TypeScript (strict) |
| UI | [Nuxt UI v4](https://ui.nuxt.com) + Tailwind CSS v4 |
| Validation | Zod (server) + UForm (client) |
| Auth | JWT + bcrypt |
| Storage | SQLite via Prisma (`<DATA_DIR>/db.sqlite`) |
| Container | Docker multi-stage (node:22-alpine) |
| CI | GitHub Actions (auto Docker image build) |
| i18n | Nuxt i18n (EN/DE) |

---

## Roadmap

- [x] **Secure VLAN Port Assignment** — VLAN auto-add, target switch sync, LAG VLAN config (v0.14.0)
- [x] **Favorites & Quick Wins** — Favorite switches, global search enhancements, UX improvements (v0.13.0)
- [x] **Topology** — Interactive site-scoped network topology with v-network-graph (v0.12.0)
- [x] **LAG Groups** — Link Aggregation Group management (v0.7.0)
- [x] **Print View** — Printable switch front panel layouts with QR codes (v0.6.0)
- [ ] **Discovery Agent** — Optional agent deployed inside a target network for SNMP/API polling, switch discovery, ports, VLANs, and LLDP/CDP neighbors with reviewed import into ezSWM
- [ ] **Rack Planning** — Visual 19" rack view with height-unit positioning
- [ ] **IPv6 Support** — IPv6 subnet and allocation tracking

---

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

## License

[GNU General Public License v3.0](LICENSE)
