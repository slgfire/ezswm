# Strategic Roadmap: ezSWM

## Product Vision

ezSWM is a lightweight infrastructure documentation tool for switches, VLANs,
IP allocations, and topology. It should stay simple to operate: one application
container, embedded SQLite storage, no external database service, and a UI that
supports real network documentation work without NetBox-level overhead.

Primary scope:

- switch inventory and port documentation
- switch front-panel visualization
- VLAN-based network documentation
- IPv4 allocation and range management
- site-scoped network topology visualization
- import/export and operational documentation workflows

## Current Architecture Principles

- Nuxt 4.x, TypeScript strict mode, Nuxt UI v4.
- SQLite via Prisma in `/app/data` for persistent storage.
- API routes live in `server/api`.
- Repositories in `server/repositories` own persistence access.
- Domain types live in `types/`.
- Validators live in `server/validators`.
- UI logic stays in `app/`.
- Docker is the primary runtime.
- Documentation must stay in sync with user-facing features.

Detailed architecture and implementation rules live in:

- `.ai/ARCHITECTURE.md`
- `.ai/specs/SPEC_DATA_MODEL.md`
- `.ai/specs/SPEC_BACKEND.md`
- `.ai/specs/SPEC_FRONTEND.md`
- `.ai/specs/SPEC_INFRASTRUCTURE.md`

Implementation history and release-stage status live in `.ai/MIGRATION_STATUS.md`.

## Current Roadmap

### 1. Discovery Agent

Optional companion agent deployed inside a target management network. The agent
should collect network facts and send them to ezSWM for reviewed import, not
blindly overwrite documentation.

Initial direction:

- SNMP/API polling from inside the target network
- switch discovery and inventory facts
- port/link status
- VLAN information
- LLDP/CDP neighbors for topology hints
- outbound agent → ezSWM communication with token-based auth
- review/import UI before applying discovered data

Keep credentials local to the agent where possible. ezSWM should receive
discovered facts and import decisions, not become a credential vault for every
network segment by default.

### 2. Rack Planning

Add a visual 19-inch rack view for documenting device placement, rack units,
and site-level physical layout. This is UI-heavy and should reuse existing
switch/device data instead of introducing a separate inventory model unless the
need is proven.

### 3. IPv6 Support

Add IPv6 subnet and allocation tracking. This affects data model, validation,
UI filtering, search, import/export, and documentation, so it should be planned
as a broad feature rather than a small field addition.

### 4. Roles and Permissions

Add Admin/Viewer or similar low-complexity roles once multi-user deployments
need read-only users. Avoid fine-grained RBAC until there is real demand.

### 5. Export and Backup Improvements

Improve operational backup/export workflows where needed:

- per-entity CSV/JSON export
- full backup export/restore
- layout template sharing

Prefer simple file-based flows over custom sync systems.

## Recently Completed Direction

These are no longer roadmap items; see `.ai/MIGRATION_STATUS.md` for details:

- Nuxt UI v4 dashboard shell
- switch front-panel visualization
- VLAN/network/IP CRUD
- topology view
- LAG groups
- print view
- layout template block reordering
- cascade site deletion
- IP allocation subnet move confirmation

## Roadmap Hygiene

This file is the current product direction, not a historical task checklist.
When a feature ships, update `.ai/MIGRATION_STATUS.md` with the completed stage
and keep this roadmap focused on what is still ahead.
