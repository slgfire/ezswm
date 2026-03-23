<div align="center">
  <img src="logo.png" alt="ezSWM" width="400"/>

  [![License](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
  [![Node](https://img.shields.io/badge/Node-22_LTS-green.svg)](https://nodejs.org)
  [![Nuxt](https://img.shields.io/badge/Nuxt-3.x-00DC82.svg)](https://nuxt.com)
  [![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](compose.yaml)

  **🔌 Document your switches, VLANs, and IPs — visually. No database required.**

</div>

---

## ✨ Features

- **Visual Switch Front Panel** — See your ports as they look on the real switch, color-coded by VLAN
- **Port Documentation** — Click any port to set VLANs, speed, connected devices, descriptions, and more
- **Connected Device Linking** — Link ports to other switches (with bidirectional sync) or freetext device names
- **Port Settings Sync** — When connecting ports, VLANs, speed, and status are synced to the remote side
- **Port Conflict Detection** — Warning when a selected remote port is already connected elsewhere
- **Self-Switch Connections** — Connect ports within the same switch (stacked switch / multi-unit support)
- **Port Reset** — One-click reset to defaults, cleanly removes bidirectional links
- **Smart Port Status** — Prompted to set port to "up" when connecting a port that is "down"
- **VLAN Management** — Track VLANs with unique color assignments across your infrastructure
- **Network & IP Tracking** — Subnet management with IP allocation and range tracking
- **Layout Templates** — Define switch models once, reuse everywhere (RJ45, SFP+, QSFP, management ports)
- **Default Speed per Block** — Set port speed at the template level, override per port as needed
- **Row Layout Modes** — Sequential, odd/even, or even/odd port numbering per block
- **Smart Port Labels** — Labels like `xe-0/0/` auto-generate as `xe-0/0/1`, `xe-0/0/2` etc.
- **Live Label Sync** — Changing a template label updates all switches and cross-references instantly
- **Subnet Calculator** — Built-in IPv4 subnet calculation tool
- **Topology View** — 🚧 Coming soon: interactive network diagram based on switch connections
- **Dark Mode** — Dark theme by default, light mode available
- **i18n** — English and German
- **JSON Storage** — No database setup, just files on disk
- **Docker Ready** — One command to build and run

---

## 🚀 Quick Start

### Docker (recommended)

```bash
export JWT_SECRET=$(openssl rand -hex 32)
docker compose up -d
```

Open http://localhost:3000 — follow the setup wizard to create your admin account.

### Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## ⚙️ Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | — | Secret for JWT token signing |
| `PORT` | No | `3000` | HTTP port |
| `DATA_DIR` | No | `/app/data` | JSON data storage path |

In Docker, use `NUXT_JWT_SECRET` and `NUXT_DATA_DIR` (Nuxt runtime config).

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Nuxt 3](https://nuxt.com) + TypeScript (strict) |
| UI | [Nuxt UI v2](https://ui.nuxt.com) + Tailwind CSS |
| Validation | Zod |
| Auth | JWT + bcrypt |
| Storage | Atomic JSON file writes |
| Container | Docker multi-stage (node:22-alpine) |
| i18n | Nuxt i18n (EN/DE) |

---

## 🏗️ Architecture

```
app/                  # Frontend (pages, components, composables)
server/
  api/                # API routes
  repositories/       # Data access (JSON storage)
  validators/         # Zod schemas
  storage/            # Atomic JSON read/write
types/                # Shared TypeScript interfaces
i18n/locales/         # Translation files
data/                 # Runtime JSON data (gitignored)
```

All data lives in `data/` as JSON files. Storage writes are atomic
(write to temp file, then rename) to prevent corruption.

---

## 🔌 Port Visualization

Ports render based on **Layout Templates** — reusable switch model
definitions with configurable blocks:

| Port Type | Visual |
|-----------|--------|
| RJ45 | Square, standard size |
| SFP / SFP+ | Taller, rounded top, "SFP+" label |
| QSFP | Wide, rounded top, "QSFP" label |
| Management | Teal border |
| Console | Amber border |

Each block supports:
- **Row layout** modes: sequential, odd/even, even/odd
- **Default speed**: applied to all ports in the block
- **Smart labels**: trailing separators (`/`, `-`, `:`, `.`) append index directly

Ports are color-tinted by their native VLAN color and show trunk
indicators (yellow stripe) when tagged VLANs are assigned.

---

## 🔗 Connected Device Linking

Ports support two connection modes:

- **Freetext** — Type any device name and port
- **Switch Reference** — Select a switch and port from dropdowns, creating a bidirectional link

When linking via switch reference:
- Remote port gets the reverse link automatically
- Speed, VLANs, and status are synced to the remote side
- Changing the connection removes the old link cleanly
- Self-switch connections supported (for stacked switches)
- Conflict warning shown if the target port is already connected

---

## 🗺️ Topology

🚧 **Coming soon** — Interactive network topology diagram showing
switch-to-switch connections based on port links. Planned features:

- Auto-layout with force-directed graph
- Click nodes to navigate to switch detail
- Edge labels showing connected ports and VLANs
- Export as PNG/PDF

## 🔗 LAG Groups

🚧 **Coming soon** — Link Aggregation Group management for bundling
multiple physical ports into a single logical link. Planned features:

- Create/manage LAG groups per switch
- Assign ports to LAG groups via UI
- Visual indicator on port grid (colored bottom border per group)
- Bandwidth aggregation and redundancy documentation

---

## 📄 License

[GNU General Public License v3.0](LICENSE)
