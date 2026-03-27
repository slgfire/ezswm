# Strategic Roadmap: ezSWM

## Project Vision
A lightweight, database-free infrastructure documentation tool for switch and IP management.

Main scope:
- Switch inventory
- Port documentation
- Switch front port visualization
- VLAN-based network documentation (VLAN as separate entity)
- IP allocation management
- IP range management (static, DHCP, reserved)
- Network topology visualization
- Multi-user authentication

## Core Architecture Principles
- Repository Pattern: only `server/repositories` interact with JSON files
- Atomic Writes: prevent corrupted JSON data
- Nuxt 3.x with `compatibilityVersion: 4` + TypeScript: strict typing for all domain models
- UI First: use the official Nuxt UI v2 Dashboard template structure
- Container First: development and runtime must work through Docker
- Auth: Multi-user with bcrypt password hashing and JWT sessions

Reference UI template:
- https://github.com/nuxt-ui-templates/dashboard

Full specifications:
- .ai/specs/SPEC_DATA_MODEL.md
- .ai/specs/SPEC_BACKEND.md
- .ai/specs/SPEC_FRONTEND.md
- .ai/specs/SPEC_INFRASTRUCTURE.md

---

## Phased Implementation Plan

### Phase 1: Project Bootstrap
- [ ] Initialize Nuxt 3.x project with `compatibilityVersion: 4`
- [ ] Install and configure all dependencies (pinned versions)
- [ ] Configure `nuxt.config.ts` (Nuxt UI v2, i18n, color mode)
- [ ] Set up project structure (directories)
- [ ] Set up `i18n/locales/en.json` and `i18n/locales/de.json`
- [ ] Verify `npm run dev`
- [ ] Verify `npm run build`
- [ ] Verify Docker build and runtime

### Phase 2: Storage & Data Foundation
- [ ] Define TypeScript interfaces for all entities:
  - `User`
  - `Switch`
  - `Port`
  - `VLAN`
  - `Network`
  - `IPAllocation`
  - `IPRange`
  - `LayoutTemplate`, `LayoutUnit`, `LayoutBlock`
  - `LAGGroup`
  - `ActivityEntry`
  - `AppSettings`
- [ ] Implement `jsonStorage.ts` (atomic read/write)
- [ ] Implement all repositories
- [ ] Implement Zod validation schemas
- [ ] Initialize data directory on startup

### Phase 3: Authentication
- [ ] Implement User entity and repository
- [ ] Implement JWT utilities (sign, verify, middleware)
- [ ] Implement bcrypt password hashing
- [ ] Create setup wizard (first admin creation)
- [ ] Create login page
- [ ] Implement auth middleware (client + server)

### Phase 4: Dashboard Shell
- [ ] Implement default layout (sidebar, header, breadcrumbs, footer)
- [ ] Implement auth layout (login, setup)
- [ ] Implement sidebar navigation
- [ ] Implement global search
- [ ] Implement dark mode (default: dark)
- [ ] Implement responsive behavior

### Phase 5: Core CRUD Pages
- [ ] Switches: list, create, detail, edit, delete, duplicate
- [ ] VLANs: list, create, detail, edit, delete (with color picker)
- [ ] Networks: list, create, detail, edit, delete
- [ ] IP Allocations: CRUD within network detail
- [ ] IP Ranges: CRUD within network detail
- [ ] Layout Templates: list, create, detail, edit, delete
- [ ] Toast notifications, filters, pagination, empty states
- [ ] Full i18n for all pages

### Phase 6: Switch Port Visualization
- [ ] Render switch front panel from LayoutTemplate
- [ ] Color-code ports by VLAN color
- [ ] Distinguish trunk vs access ports visually
- [ ] Unit separation for stacked switches
- [ ] Port side panel for editing
- [ ] Bulk port editing
- [ ] Bidirectional switch connections
- [ ] LAG group management

### Phase 7: Advanced Features
- [ ] Topology view (tree layout, drag & drop, VLAN on links, PDF/PNG export)
- [ ] Subnet calculator
- [ ] Subnet utilization bar on network detail
- [ ] Dashboard KPIs and customizable widgets
- [ ] Favorites/pinning
- [ ] Activity feed with undo support

### Phase 8: Import/Export & Backup
- [ ] CSV/JSON import with templates and validation
- [ ] CSV/JSON export per entity
- [ ] Full backup export/restore (ZIP)
- [ ] Layout template export/import (sharing)
- [ ] Print view for switch details

### Phase 9: Polish & Validation
- [ ] Form validation (real-time, all forms)
- [ ] Duplicate IP detection
- [ ] VLAN color uniqueness
- [ ] IP range overlap detection
- [ ] Confirmation dialogs for destructive actions
- [ ] Responsive testing on all screen sizes
- [ ] Full i18n review (EN + DE)
- [ ] Settings page, user profile management

### Phase 10: Docker & Production
- [ ] Finalize multi-stage Dockerfile
- [ ] Finalize compose.yaml
- [ ] Health check validation
- [ ] Production runtime test
- [ ] GPL LICENSE file
- [ ] README.md

### Phase 11 (Post-MVP): Testing & Future
- [ ] Set up vitest, write unit + integration tests
- [ ] IPv6 support
- [ ] SNMP/API port status polling
- [ ] Admin/Viewer roles
- [ ] Structured logging (pino)
- [ ] Copy-to-clipboard for IPs/MACs

---

## Deployment and Production
- Persistent path: `/app/data`
- Environment file: `.env.example`
- Runtime command: `node .output/server/index.mjs`
- License: GPL (project must remain open source)
