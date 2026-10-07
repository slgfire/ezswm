# ezSWM Architecture

This document defines the technical architecture of the ezSWM project.

Related documents:

- CLAUDE.md
- .ai/STRATEGY.md
- .ai/MIGRATION_STATUS.md
- .ai/specs/SPEC_DATA_MODEL.md
- .ai/specs/SPEC_BACKEND.md
- .ai/specs/SPEC_FRONTEND.md
- .ai/specs/SPEC_INFRASTRUCTURE.md

---

# 1. High-Level Architecture

ezSWM is a lightweight infrastructure documentation tool built with:

- Nuxt 4.x
- TypeScript (strict mode)
- Nuxt UI v4
- Nuxt i18n
- Zod (validation)
- SQLite via Prisma (`prisma/schema.prisma`, `better-sqlite3` driver adapter)
- Docker

Persistent data is stored in `/app/data` (SQLite file `db.sqlite`, selected via
`DATABASE_URL`; `DATA_DIR` is the directory). The earlier JSON-file storage
design is historical: JSON files are now only read by the one-shot legacy
migration and are used as exchange formats (backups, import/export).

Architecture layers:

1. UI Layer (`app/pages`, `app/components`)
2. Composables Layer (`app/composables`)
3. API Layer (`server/api`)
4. Validation Layer (`server/validators` — Zod schemas)
5. Repository Layer (`server/repositories`)
6. Persistence Layer (Prisma client in `server/db/client.ts`; schema in
   `prisma/schema.prisma`; migrations in `prisma/migrations/`)

---

# 2. Architectural Principles

## Separation of concerns

UI:
- Render data
- Handle user interactions

Composables:
- Client state management
- API calls

API:
- Parse requests
- Validate input (via Zod)
- Call repositories
- Return structured responses

Repositories:
- Persistence logic
- Cross-entity validation

Persistence (Prisma/SQLite):
- Prisma client access to the SQLite database
- Array/object fields that SQLite cannot store natively are JSON strings,
  (de)serialised in the repository layer (see header of `prisma/schema.prisma`)

## Repository-only storage access

`server/repositories` owns database access through Prisma. Current direct
users of `server/db/client.ts` outside repositories are limited to
backup/restore and data/entity export/import, activity undo, admin
allocation recovery, `/api/health` and the startup plugin; new persistence
code belongs in repositories.

## Atomic writes

Primary persistence writes go through Prisma; multi-row changes that must be
atomic use `prisma.$transaction` (e.g. whole-backup restore in
`server/utils/dataRestore.ts`). Schema changes ship as Prisma migrations,
applied with `prisma migrate deploy` by `docker-entrypoint.sh` at container
start (a pre-upgrade copy of the database is kept in `/app/data/backups`).

The temp-file → rename pattern remains only in the legacy file helper
`server/storage/jsonStorage.ts`; it is not the primary persistence path.

## Strict typing

All domain models have TypeScript interfaces in `types/`.

## Validation

All API request validation uses Zod schemas in `server/validators/`.

---

# 3. Project Structure

```
app/
  components/         # Vue components (by domain)
  composables/        # Client-side composables
  pages/              # Route pages
  layouts/            # default.vue, auth.vue
  middleware/          # Client-side auth guard

server/
  api/                # API route handlers
  middleware/          # Server-side auth middleware
  repositories/       # Data persistence (Prisma)
  db/                 # Prisma client (SQLite via better-sqlite3 adapter)
  migrations/         # One-shot legacy JSON -> SQLite migration code
  storage/            # Legacy JSON file helper (not primary persistence)
  validators/         # Zod schemas
  utils/              # IPv4, auth utilities

types/                # TypeScript interfaces

i18n/
  locales/            # en.json, de.json

.ai/
  specs/              # SPEC files

data/                 # Local development data (gitignored)
```

---

# 4. UI Layer Architecture

The UI must follow the Nuxt UI v4 dashboard template architecture.

Reference:
https://github.com/nuxt-ui-templates/dashboard

Layout must include:

- Sidebar navigation (collapsible on mobile)
- Header bar (global search, user menu, theme toggle)
- Breadcrumb navigation
- Dashboard content area
- Footer (version info)
- Dark mode (default)
- Fully responsive (desktop, tablet, smartphone)

Do NOT build a custom shell.

---

# 5. Data Flow

Standard flow:

```
User
→ UI component
→ composable
→ API route
→ Zod validation
→ repository
→ Prisma client
→ SQLite database (`/app/data/db.sqlite`)
```

Response flows back the same way.

---

# 6. Server API Layer

Responsibilities:

- Parse requests
- Validate payloads (Zod)
- Call repositories
- Return structured responses

API must NOT:

- Access the database directly (use repositories; see the documented exceptions above)
- Contain UI logic

Routes are organized by domain:

```
server/api/auth/
server/api/switches/
server/api/vlans/
server/api/networks/
server/api/layout-templates/
server/api/activity/
server/api/settings/
server/api/users/
server/api/search.get.ts
server/api/health.get.ts
server/api/topology.get.ts
server/api/subnet-calculator.get.ts
server/api/dashboard/
server/api/backup/
server/api/import/
server/api/export/
```

Full route table: .ai/specs/SPEC_BACKEND.md §3

---

# 7. Repository Layer

Repositories manage persistence operations.

Typical functions:

- list (with filters)
- getById
- create
- update
- delete

Repositories may:

- Use the Prisma client
- Enforce persistence rules
- Perform cross-entity validation

Repositories must NOT:

- Render UI
- Contain frontend logic

---

# 8. Persistence Layer (SQLite via Prisma)

The database is the SQLite file `/app/data/db.sqlite` (`DATABASE_URL`,
default in Docker `file:/app/data/db.sqlite`).

Responsibilities:

- `server/db/client.ts`: lazily constructed `PrismaClient` with the
  `@prisma/adapter-better-sqlite3` adapter
- `prisma/schema.prisma` is the source of truth for tables; incremental SQL
  migrations live in `prisma/migrations/` and are applied by
  `docker-entrypoint.sh` (`prisma migrate deploy`)
- `server/plugins/initData.ts` (Nitro startup plugin) connects to the
  database, ensures the singleton settings row and runs the legacy migration
  when needed

Tables/models (see `prisma/schema.prisma`): Site, PatchPanel, PatchPanelToken,
PatchPanelSocket, Switch, SwitchGroup, Port (separate table, no longer
embedded in Switch), Vlan, Network, IpAllocation, IpRange, LagGroup,
LayoutTemplate, PublicToken, User, OidcConfig, OidcLoginTxn, ActivityEntry,
TopologyLayout, AppSettings.

Legacy JSON compatibility (not primary storage):

- If the database is empty and legacy files such as `switches.json`,
  `users.json` or `settings.json` exist in `DATA_DIR`, the startup plugin runs
  the one-shot `server/migrations/jsonToPrisma.ts` migration and archives the
  originals in an `_archive_<ISO>/` directory
- Backups (`GET /api/backup/export`) are a single JSON document with
  `schema: "sqlite-v1"`, restored by `POST /api/backup/import`
- CSV/JSON entity import/export and layout-template JSON export/import

---

# 9. Domain Model Overview

Core entities:

- User
- Switch
- Port (separate `Port` table linked to Switch; legacy JSON embedded it)
- VLAN (separate entity)
- Network
- IPAllocation
- IPRange
- LayoutTemplate
- LayoutUnit (nested in the LayoutTemplate `units` JSON string)
- LayoutBlock (embedded in LayoutUnit)
- LAGGroup
- ActivityEntry
- AppSettings

All interfaces live in `types/`.

Full data model: .ai/specs/SPEC_DATA_MODEL.md

---

# 10. Authentication Architecture

- Multi-user with bcrypt password hashing
- JWT tokens (7 days default, 30 days with "Remember me")
- Setup wizard on first start (create admin)
- Server middleware validates JWT on all API routes (except /auth/setup, /auth/login, /health)
- Client middleware redirects unauthenticated users to login
- Roles: `admin` (full access) and `viewer` (read-only for infrastructure data; own profile/language, own local password and logout are allowed). Enforced server-side per request in `server/middleware/auth.ts` / `server/utils/requireAdmin.ts`; the UI hides write controls for viewers (not a security boundary)

---

# 11. Validation Architecture

Reusable Zod schemas in `server/validators/` validate:

- IPv4 format
- Subnet membership
- CIDR notation
- Duplicate IP detection
- IP range overlap
- VLAN ID uniqueness (1-4094)
- VLAN color uniqueness
- MAC address format

Validation occurs in API routes before calling repositories.

---

# 12. Search Architecture

Global search lives in the header.

Search scope:

- Switches (name, model, location, management_ip, serial_number)
- VLANs (vlan_id, name, routing_device)
- Networks (name, subnet)
- Ports (label, description, connected_device)
- IP Allocations (ip_address, hostname, mac_address)

Server-side search via `/api/search?q=<query>`.

---

# 13. Internationalization Architecture

Locales live in:

```
i18n/locales/en.json
i18n/locales/de.json
```

Configuration in `nuxt.config.ts`:

```typescript
i18n: {
  locales: [
    { code: 'en', name: 'English', file: 'en.json' },
    { code: 'de', name: 'Deutsch', file: 'de.json' }
  ],
  defaultLocale: 'en',
  langDir: 'locales',
  strategy: 'no_prefix'
}
```

Default language: English.
Language is stored per user.
Everything is translated (labels, errors, toasts, tooltips, placeholders).

---

# 14. Docker and Runtime Architecture

Docker uses multi-stage builds.

Builder:
```
pnpm install --frozen-lockfile
pnpm build
```

Runtime:
```
node .output/server/index.mjs
```

compose.yaml mounts only: `./data:/app/data` (holds the SQLite database)

Health check: `GET /api/health`

Full Docker configuration: .ai/specs/SPEC_INFRASTRUCTURE.md

---

# 15. Documentation Rules

Documents must stay aligned:

- CLAUDE.md
- .ai/STRATEGY.md
- .ai/ARCHITECTURE.md
- .ai/MIGRATION_STATUS.md
- .ai/specs/SPEC_*.md

After each stage:

- Update MIGRATION_STATUS.md
- Ensure architecture rules are respected
- Verify all SPECs are still accurate

---

# 16. Implementation Priorities

1. Project bootstrap
2. Storage & data foundation (originally JSON files; now SQLite via Prisma)
3. Authentication
4. Dashboard shell
5. Core CRUD pages
6. Switch port visualization
7. Advanced features (topology, calculator, dashboard KPIs)
8. Import/export & backup
9. Polish & validation
10. Docker & production

Full phase details: .ai/STRATEGY.md and .ai/specs/SPEC_INFRASTRUCTURE.md §13

---

# 17. Non-Goals for Early Stages

Avoid early complexity:

- Role/permission systems (historical early-stage note; Admin/Viewer roles now exist, see `.ai/MIGRATION_STATUS.md`)
- Advanced multi-user workflows
- External database services (embedded SQLite via Prisma is the current storage)
- Drag-and-drop editors (except topology)
- IPv6 (post-MVP)
- SNMP/API integration (post-MVP)
- Public API / Swagger
- Over-engineered abstractions

Focus on a stable MVP first.
