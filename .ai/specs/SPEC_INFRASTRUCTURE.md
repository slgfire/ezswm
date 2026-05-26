# SPEC: Infrastructure

This document defines the development setup, Docker configuration, environment variables, CI/verification process, and deployment for ezSWM.

Related documents:
- [SPEC_DATA_MODEL.md](SPEC_DATA_MODEL.md)
- [SPEC_BACKEND.md](SPEC_BACKEND.md)
- [SPEC_FRONTEND.md](SPEC_FRONTEND.md)

---

## 1. Technology Stack (Pinned Versions)

| Technology | Version | Notes |
|------------|---------|-------|
| Node.js | 22 LTS | Docker base image: `node:22-alpine` |
| Nuxt | 3.x (latest 3.x) | With `compatibilityVersion: 4` |
| Nuxt UI | 2.x (latest 2.x) | Dashboard template compatible |
| TypeScript | 5.x | Strict mode |
| Zod | 3.x | Request validation |
| bcrypt | 5.x (or bcryptjs) | Password hashing |
| jsonwebtoken | 9.x | JWT token handling |
| nanoid | 5.x | ID generation |
| Tailwind CSS | via Nuxt UI | No separate install |
| Docker | latest | Multi-stage build |
| docker-compose | v2 | compose.yaml format |

### Dependency Rules

- All versions pinned exactly (e.g., `"nuxt": "3.16.0"`, not `"^3.16.0"`)
- No `^`, no `~`, no `latest`
- `package-lock.json` committed to repository
- Dependencies reviewed before adding

---

## 2. Project Structure

```
ezswm/
├── app/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppSidebar.vue
│   │   │   ├── AppHeader.vue
│   │   │   ├── AppBreadcrumbs.vue
│   │   │   └── AppFooter.vue
│   │   ├── switch/
│   │   │   ├── SwitchPortGrid.vue
│   │   │   ├── SwitchPortItem.vue
│   │   │   ├── SwitchPortSidePanel.vue
│   │   │   ├── SwitchPortBulkEditor.vue
│   │   │   ├── SwitchInfoCard.vue
│   │   │   └── SwitchUnitDivider.vue
│   │   ├── vlan/
│   │   │   ├── VlanColorSwatch.vue
│   │   │   ├── VlanColorPicker.vue
│   │   │   └── VlanBadge.vue
│   │   ├── network/
│   │   │   ├── SubnetUtilizationBar.vue
│   │   │   ├── IpAllocationTable.vue
│   │   │   ├── IpRangeTable.vue
│   │   │   └── SubnetInfoCard.vue
│   │   ├── topology/
│   │   │   ├── TopologyCanvas.vue
│   │   │   ├── TopologySwitchNode.vue
│   │   │   ├── TopologyLink.vue
│   │   │   └── TopologyExportButton.vue
│   │   ├── template/
│   │   │   ├── TemplateEditor.vue
│   │   │   ├── TemplatePreview.vue
│   │   │   ├── TemplateUnitEditor.vue
│   │   │   └── TemplateBlockEditor.vue
│   │   └── shared/
│   │       ├── EntityTable.vue
│   │       ├── ConfirmDialog.vue
│   │       ├── EmptyState.vue
│   │       ├── FavoriteToggle.vue
│   │       ├── SearchGlobal.vue
│   │       ├── ImportUploader.vue
│   │       └── DashboardWidget.vue
│   ├── composables/
│   │   ├── useSwitches.ts
│   │   ├── useSwitch.ts
│   │   ├── useVlans.ts
│   │   ├── useNetworks.ts
│   │   ├── useIpAllocations.ts
│   │   ├── useIpRanges.ts
│   │   ├── useLayoutTemplates.ts
│   │   ├── useLagGroups.ts
│   │   ├── useActivity.ts
│   │   ├── useUsers.ts
│   │   ├── useSettings.ts
│   │   ├── useAuth.ts
│   │   ├── useSearch.ts
│   │   ├── useDashboard.ts
│   │   ├── useSubnetCalculator.ts
│   │   ├── useTopology.ts
│   │   ├── useImportExport.ts
│   │   └── useBackup.ts
│   ├── pages/
│   │   ├── index.vue                        # Dashboard
│   │   ├── setup.vue                        # Setup wizard
│   │   ├── login.vue                        # Login
│   │   ├── switches/
│   │   │   ├── index.vue                    # List
│   │   │   ├── create.vue                   # Create
│   │   │   └── [id].vue                     # Detail
│   │   ├── vlans/
│   │   │   ├── index.vue                    # List
│   │   │   ├── create.vue                   # Create
│   │   │   └── [id].vue                     # Detail/Edit
│   │   ├── networks/
│   │   │   ├── index.vue                    # List
│   │   │   ├── create.vue                   # Create
│   │   │   └── [id].vue                     # Detail
│   │   ├── topology.vue                     # Topology view
│   │   ├── tools/
│   │   │   └── subnet-calculator.vue        # Subnet calculator
│   │   ├── import-export.vue                # Import/Export
│   │   ├── backup.vue                       # Backup/Restore
│   │   ├── settings.vue                     # Settings
│   │   └── layout-templates/
│   │       ├── index.vue                    # List
│   │       ├── create.vue                   # Create
│   │       └── [id]/
│   │           ├── index.vue                # Detail
│   │           └── edit.vue                 # Editor
│   ├── layouts/
│   │   ├── default.vue                      # Main layout (sidebar + header)
│   │   └── auth.vue                         # Auth layout (login, setup)
│   └── middleware/
│       └── auth.ts                          # Client-side auth guard
├── server/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── setup.post.ts
│   │   │   ├── login.post.ts
│   │   │   ├── logout.post.ts
│   │   │   └── me.get.ts
│   │   ├── switches/
│   │   │   ├── index.get.ts
│   │   │   ├── index.post.ts
│   │   │   ├── [id].get.ts
│   │   │   ├── [id].put.ts
│   │   │   ├── [id].delete.ts
│   │   │   ├── [id]/
│   │   │   │   ├── duplicate.post.ts
│   │   │   │   ├── ports/
│   │   │   │   │   ├── [portId].put.ts
│   │   │   │   │   └── bulk.put.ts
│   │   │   │   └── lag-groups/
│   │   │   │       ├── index.get.ts
│   │   │   │       ├── index.post.ts
│   │   │   │       ├── [id].get.ts
│   │   │   │       ├── [id].put.ts
│   │   │   │       └── [id].delete.ts
│   │   ├── vlans/
│   │   │   ├── index.get.ts
│   │   │   ├── index.post.ts
│   │   │   ├── [id].get.ts
│   │   │   ├── [id].put.ts
│   │   │   ├── [id].delete.ts
│   │   │   └── [id]/
│   │   │       └── references.get.ts
│   │   ├── networks/
│   │   │   ├── index.get.ts
│   │   │   ├── index.post.ts
│   │   │   ├── [id].get.ts
│   │   │   ├── [id].put.ts
│   │   │   ├── [id].delete.ts
│   │   │   └── [id]/
│   │   │       ├── references.get.ts
│   │   │       ├── utilization.get.ts
│   │   │       ├── allocations/
│   │   │       │   ├── index.get.ts
│   │   │       │   ├── index.post.ts
│   │   │       │   ├── [id].get.ts
│   │   │       │   ├── [id].put.ts
│   │   │       │   └── [id].delete.ts
│   │   │       └── ranges/
│   │   │           ├── index.get.ts
│   │   │           ├── index.post.ts
│   │   │           ├── [id].get.ts
│   │   │           ├── [id].put.ts
│   │   │           └── [id].delete.ts
│   │   ├── layout-templates/
│   │   │   ├── index.get.ts
│   │   │   ├── index.post.ts
│   │   │   ├── import.post.ts
│   │   │   ├── [id].get.ts
│   │   │   ├── [id].put.ts
│   │   │   ├── [id].delete.ts
│   │   │   └── [id]/
│   │   │       └── export.get.ts
│   │   ├── activity/
│   │   │   ├── index.get.ts
│   │   │   └── [id]/
│   │   │       └── undo.post.ts
│   │   ├── settings/
│   │   │   ├── index.get.ts
│   │   │   └── index.put.ts
│   │   ├── users/
│   │   │   ├── index.get.ts
│   │   │   ├── index.post.ts
│   │   │   ├── [id].get.ts
│   │   │   ├── [id].put.ts
│   │   │   ├── [id].delete.ts
│   │   │   └── [id]/
│   │   │       └── password.put.ts
│   │   ├── search.get.ts
│   │   ├── health.get.ts
│   │   ├── subnet-calculator.get.ts
│   │   ├── topology.get.ts
│   │   ├── dashboard/
│   │   │   └── stats.get.ts
│   │   ├── backup/
│   │   │   ├── export.get.ts
│   │   │   └── import.post.ts
│   │   ├── import/
│   │   │   ├── template/
│   │   │   │   └── [entity].get.ts
│   │   │   └── [entity].post.ts
│   │   └── export/
│   │       └── [entity].get.ts
│   ├── middleware/
│   │   └── auth.ts                          # Server-side JWT validation
│   ├── repositories/
│   │   ├── userRepository.ts
│   │   ├── switchRepository.ts
│   │   ├── vlanRepository.ts
│   │   ├── networkRepository.ts
│   │   ├── ipAllocationRepository.ts
│   │   ├── ipRangeRepository.ts
│   │   ├── layoutTemplateRepository.ts
│   │   ├── lagGroupRepository.ts
│   │   ├── activityRepository.ts
│   │   └── settingsRepository.ts
│   ├── storage/
│   │   └── jsonStorage.ts                   # Atomic read/write utilities
│   ├── validators/
│   │   ├── switchSchemas.ts
│   │   ├── vlanSchemas.ts
│   │   ├── networkSchemas.ts
│   │   ├── ipAllocationSchemas.ts
│   │   ├── ipRangeSchemas.ts
│   │   ├── layoutTemplateSchemas.ts
│   │   ├── lagGroupSchemas.ts
│   │   ├── userSchemas.ts
│   │   └── settingsSchemas.ts
│   └── utils/
│       ├── ipv4.ts                          # IPv4 validation and calculation
│       └── auth.ts                          # JWT and bcrypt utilities
├── types/
│   ├── switch.ts
│   ├── port.ts
│   ├── vlan.ts
│   ├── network.ts
│   ├── ipAllocation.ts
│   ├── ipRange.ts
│   ├── layoutTemplate.ts
│   ├── lagGroup.ts
│   ├── activity.ts
│   ├── user.ts
│   ├── settings.ts
│   └── api.ts                               # ApiError, ValidationError
├── i18n/
│   └── locales/
│       ├── en.json
│       └── de.json
├── public/
│   └── favicon.ico
├── .ai/
│   ├── STRATEGY.md
│   ├── ARCHITECTURE.md
│   ├── MIGRATION_STATUS.md
│   └── specs/
│       ├── SPEC_DATA_MODEL.md
│       ├── SPEC_BACKEND.md
│       ├── SPEC_FRONTEND.md
│       └── SPEC_INFRASTRUCTURE.md
├── nuxt.config.ts
├── app.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── Dockerfile
├── compose.yaml
├── .env.example
├── .gitignore
├── LICENSE                                   # GPL
├── CLAUDE.md
└── README.md
```

---

## 3. Development Setup

### Prerequisites

- Node.js 22 LTS
- pnpm 11.x (`corepack enable` activates the version pinned in `packageManager`)
- Docker + docker-compose (for container testing)

### Local Development

```bash
# Install dependencies (workspace install — covers root + docs/)
pnpm install --frozen-lockfile

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### pnpm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `nuxt dev` | Start dev server with HMR |
| `build` | `nuxt build` | Build for production |
| `preview` | `nuxt preview` | Preview production build |
| `generate` | `nuxt generate` | Static generation (not used) |
| `lint` | `eslint .` | Lint code (future) |
| `typecheck` | `nuxt typecheck` | TypeScript type checking |

### Local Data Directory

For local development, data is stored in `./data/` (gitignored).

---

## 4. Environment Variables

### .env.example

```env
# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Data
DATA_DIR=/app/data

# Authentication
JWT_SECRET=change-me-to-a-random-secret-in-production
```

### Variable Descriptions

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | no | `3000` | HTTP port |
| `HOST` | no | `0.0.0.0` | Bind address |
| `NODE_ENV` | no | `production` | Environment mode |
| `DATA_DIR` | no | `/app/data` | JSON data storage path |
| `JWT_SECRET` | **yes** | none | Secret for JWT signing (must be changed in production) |

### Startup Validation

On application start:
- Warn if `JWT_SECRET` is not set or equals `change-me-to-a-random-secret-in-production`
- Ensure `DATA_DIR` exists and is writable
- Log configured port and host

---

## 5. Docker Configuration

### Dockerfile (Multi-Stage)

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

ENV CI=true
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY docs/package.json ./docs/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Stage 2: Runtime
FROM node:22-alpine AS runtime

WORKDIR /app

# Use existing `node` user (uid 1000) from node:22-alpine base image
# instead of creating a custom user — same numeric IDs, no clash.

# Copy built output
COPY --from=builder /app/.output .output

# Data directory owned by the runtime user
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", ".output/server/index.mjs"]
```

### Key Docker Decisions

- **Alpine** base for small image size
- **Non-root user** (`node`, uid 1000) for security
- **HEALTHCHECK** using `/api/health` endpoint
- Only `.output` directory is copied to runtime (minimal image)
- No source code in production image

---

## 6. compose.yaml

```yaml
services:
  ezswm:
    build: .
    container_name: ezswm
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET:?JWT_SECRET must be set}
      - DATA_DIR=/app/data
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 3s
      start_period: 10s
      retries: 3
```

### Volume Mount

- `./data:/app/data` — persistent JSON storage
- Only the `data/` directory is mounted
- Data survives container recreation

---

## 7. nuxt.config.ts Outline

```typescript
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4
  },

  modules: [
    '@nuxt/ui',
    '@nuxtjs/i18n'
  ],

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' }
    ],
    defaultLocale: 'en',
    langDir: 'locales',
    strategy: 'no_prefix'
  },

  colorMode: {
    preference: 'dark'
  },

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || '',
    dataDir: process.env.DATA_DIR || '/app/data',
    public: {
      appVersion: '0.1.0'
    }
  },

  typescript: {
    strict: true
  },

  devtools: {
    enabled: true
  }
})
```

---

## 8. Health Check Endpoint

### `/api/health`

```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptime": 12345,
  "data_dir": "/app/data",
  "data_writable": true
}
```

- No authentication required
- Checks data directory accessibility
- Returns app version and uptime
- Used by Docker HEALTHCHECK and Traefik

---

## 9. Verification Checklist

Before completing any implementation stage, verify all of the following:

### Development

```bash
# Must succeed without errors
pnpm dev

# Must build without errors
pnpm build

# TypeScript must pass
pnpm typecheck
```

### Docker

```bash
# Must build without errors (compose.dev.yaml builds from source;
# compose.yaml pulls the GHCR image and is for end-user deployment)
docker compose -f compose.dev.yaml build --no-cache

# Must start and pass healthcheck
docker compose -f compose.dev.yaml up -d
docker compose -f compose.dev.yaml ps  # Status: healthy

# Must serve the application
curl http://localhost:3000/api/health
```

### Functional

- [ ] No client-side console errors
- [ ] No server-side console errors
- [ ] i18n works correctly (switch between EN/DE)
- [ ] JSON persistence works in `/app/data`
- [ ] Docker build succeeds
- [ ] Docker runtime succeeds with healthcheck
- [ ] MIGRATION_STATUS.md updated

---

## 10. Data Directory Structure

On first startup, `/app/data/` will be initialized with:

```
/app/data/
├── users.json              # []
├── switches.json           # []
├── vlans.json              # []
├── networks.json           # []
├── ip-allocations.json     # []
├── ip-ranges.json          # []
├── layout-templates.json   # []
├── lag-groups.json         # []
├── activity.json           # []
└── settings.json           # { default AppSettings }
```

### Permissions

- Directory: `755`
- Files: `644`
- Owner: `ezswm:ezswm` (in Docker)
- For local development: current user

### .gitignore

The `data/` directory must be in `.gitignore`:

```
data/
```

---

## 11. Seed Data

- **No seed data** is shipped by default
- Empty arrays for all entity files
- Default settings in `settings.json`
- Layout templates can be imported via the UI (sharing feature)
- Setup wizard creates the first admin user

---

## 12. License

**GNU General Public License (GPL)**

- Project must always remain open source
- All modifications must also be open source
- `LICENSE` file in project root

---

## 13. Implementation Phases

Based on STRATEGY.md, refined with SPEC decisions:

### Phase 1: Project Bootstrap
- Initialize Nuxt 3.x project with compatibilityVersion: 4
- Install and configure all dependencies (pinned versions)
- Configure nuxt.config.ts (Nuxt UI v2, i18n, color mode)
- Set up project structure (directories)
- Verify: pnpm dev, pnpm build, Docker build + run

### Phase 2: Storage & Data Foundation
- Define all TypeScript interfaces in types/
- Implement jsonStorage.ts (atomic read/write)
- Implement all repositories
- Implement Zod validation schemas
- Initialize data directory on startup
- Verify: JSON persistence works

### Phase 3: Authentication
- Implement User entity and repository
- Implement JWT utilities (sign, verify, middleware)
- Implement bcrypt password hashing
- Create setup wizard (first admin)
- Create login page
- Implement auth middleware (client + server)
- Verify: login flow works

### Phase 4: Dashboard Shell
- Implement default layout (sidebar, header, footer)
- Implement auth layout (login, setup)
- Implement sidebar navigation
- Implement breadcrumbs
- Implement global search
- Implement dark mode (default: dark)
- Implement responsive behavior
- Verify: navigation works, responsive, dark mode

### Phase 5: Core CRUD Pages
- Switches: list, create, detail, edit, delete, duplicate
- VLANs: list, create, detail, edit, delete (with color picker)
- Networks: list, create, detail, edit, delete
- IP Allocations: CRUD within network detail
- IP Ranges: CRUD within network detail
- Layout Templates: list, create, detail, edit, delete
- Toast notifications for all CRUD actions
- Filters and pagination on all lists
- Empty states for all pages
- i18n for all pages
- Verify: full CRUD works, i18n correct

### Phase 6: Switch Port Visualization
- Implement SwitchPortGrid component
- Render ports based on LayoutTemplate
- Color-code by VLAN color
- Distinguish trunk vs access ports visually
- Unit separation for stacks
- Port side panel for editing
- Bulk port editing
- Bidirectional switch connections
- LAG group management
- Verify: visualization renders correctly, port editing works

### Phase 7: Advanced Features
- Topology view (tree layout, drag & drop, VLAN on links, export PDF/PNG)
- Subnet calculator
- Subnet utilization bar on network detail
- Dashboard KPIs and widgets (customizable)
- Favorites/pinning
- Activity feed with undo support
- Verify: all features work

### Phase 8: Import/Export & Backup
- CSV/JSON import with templates and validation
- CSV/JSON export per entity
- Backup export (ZIP)
- Backup restore with confirmation
- Layout template export/import
- Print view for switch details
- Verify: import/export round-trip works

### Phase 9: Polish & Validation
- Form validation (all forms, real-time)
- Duplicate IP detection
- VLAN color uniqueness
- IP range overlap detection
- Confirmation dialogs for destructive actions
- Responsive testing on all screen sizes
- Full i18n review (EN + DE complete)
- Settings page (all options)
- User profile management
- Verify: no console errors, all validation works

### Phase 10: Docker & Production
- Finalize multi-stage Dockerfile
- Finalize compose.yaml
- Health check validation
- Production runtime test
- End-to-end container test
- GPL LICENSE file
- README.md
- Verify: full production deployment works

### Phase 11 (Post-MVP): Testing & Future
- Set up vitest
- Unit tests for repositories
- Unit tests for IPv4 utilities
- Integration tests for API routes
- Future: IPv6 support
- Future: SNMP/API port status
- Future: Admin/Viewer roles
- Future: Structured logging (pino)

---

## 14. Update Workflow

After each phase:

1. Update `.ai/MIGRATION_STATUS.md` with:
   - Stage name and date
   - Status (complete/in progress/blocked)
   - Changes made
   - Files modified
   - Verification results
   - Open issues
   - Next tasks

2. Ensure all four docs stay aligned:
   - CLAUDE.md
   - .ai/STRATEGY.md
   - .ai/ARCHITECTURE.md
   - .ai/MIGRATION_STATUS.md
