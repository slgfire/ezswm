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

- Nuxt 3.x (with `compatibilityVersion: 4`)
- TypeScript (strict mode)
- Nuxt UI v2
- Nuxt i18n
- Zod (validation)
- JSON file storage
- Docker

Persistent data is stored in: `/app/data`

Architecture layers:

1. UI Layer (`app/pages`, `app/components`)
2. Composables Layer (`app/composables`)
3. API Layer (`server/api`)
4. Validation Layer (`server/validators` — Zod schemas)
5. Repository Layer (`server/repositories`)
6. Storage Layer (`server/storage`)

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

Storage:
- JSON file access (atomic read/write)

## Repository-only file access

Only `server/repositories` may read/write JSON files.

## Atomic writes

All JSON writes must be atomic.

Write pattern:

1. Write to temporary file (`<file>.tmp`)
2. Rename temporary file to target (atomic operation)

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
  repositories/       # Data persistence
  storage/            # JSON file utilities
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

The UI must follow the Nuxt UI v2 dashboard template architecture.

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
→ storage
→ JSON file
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

- Access JSON files directly
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

- Call storage utilities
- Enforce persistence rules
- Perform cross-entity validation

Repositories must NOT:

- Render UI
- Contain frontend logic

---

# 8. Storage Layer

Handles JSON files in `/app/data`.

Responsibilities:

- Ensure files exist on startup
- Read JSON
- Write JSON atomically

JSON files:

```
users.json
switches.json          (with embedded Port[])
vlans.json
networks.json
ipAllocations.json
ipRanges.json
layoutTemplates.json   (with embedded LayoutUnit[]/LayoutBlock[])
lagGroups.json
activity.json
settings.json          (single object, not array)
```

---

# 9. Domain Model Overview

Core entities:

- User
- Switch
- Port (embedded in Switch)
- VLAN (separate entity)
- Network
- IPAllocation
- IPRange
- LayoutTemplate
- LayoutUnit (embedded in LayoutTemplate)
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
- MVP: all users have full access
- Future: Admin/Viewer roles

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
npm ci
npm run build
```

Runtime:
```
node .output/server/index.mjs
```

compose.yaml mounts only: `./data:/app/data`

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
2. Storage & data foundation
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

- Role/permission systems (Admin/Viewer comes post-MVP)
- Advanced multi-user workflows
- Database support
- Drag-and-drop editors (except topology)
- IPv6 (post-MVP)
- SNMP/API integration (post-MVP)
- Public API / Swagger
- Over-engineered abstractions

Focus on a stable MVP first.
