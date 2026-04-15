# MIGRATION STATUS

## Latest Stage

Date: 2026-04-09
Stage: Phase 18 — Keyboard Shortcuts
Status: Complete

---

## Changes

### Phase 1: Project Bootstrap
- Created package.json with all pinned dependencies (Nuxt 3.15.4, Nuxt UI 2.22.3, bcryptjs, nanoid v5, etc.)
- Created nuxt.config.ts with compatibilityVersion 4, i18n, colorMode
- Created Dockerfile (multi-stage, node:22-alpine, non-root user, healthcheck)
- Created compose.yaml with volume mounts and env vars
- Created app structure: pages, layouts, components, composables, middleware
- Created i18n locales (en.json, de.json) with full translations

### Phase 2: Storage & Data Foundation
- Created all TypeScript interfaces in types/ (13 files)
- Created server/storage/jsonStorage.ts with atomic writes (write tmp → rename)
- Created server/utils/ipv4.ts with subnet calculations
- Created server/plugins/initData.ts for data directory initialization
- Created all Zod validators in server/validators/ (9 files)
- Created all repositories in server/repositories/ (10 files)

### Phase 3: Authentication
- Created server/utils/auth.ts (bcryptjs hashing, JWT sign/verify, cookie management)
- Created server/middleware/auth.ts (JWT validation, public path exclusions)
- Created auth API routes (setup, login, logout, me)
- Created app/composables/useAuth.ts (login, logout, setup, user state)
- Created app/middleware/auth.global.ts (route guards, setup redirect)
- Created setup.vue and login.vue pages with auth layout

### Phase 4: Dashboard Shell
- Created AppSidebar.vue (collapsible, nav sections, active state, mobile responsive)
- Created AppHeader.vue (search, user menu, theme toggle, mobile sidebar toggle)
- Created AppBreadcrumbs.vue (dynamic from route)
- Created AppFooter.vue (version, GPL notice)
- Updated default.vue layout (sidebar + header + breadcrumbs + content + footer)
- Created shared components (EmptyState, ConfirmDialog)

### Phase 5: Core CRUD Pages
- Created all API routes: switches (8), VLANs (6), networks (12), layout-templates (7), users (6), settings (2)
- Created utility API routes: search, subnet-calculator, topology, dashboard/stats, activity (with undo)
- Created composables: useSwitches, useVlans, useNetworks, useIpAllocations, useIpRanges, useLayoutTemplates, useUsers, useSettings
- Created CRUD pages: switches (list/create/detail), VLANs (list/create/detail), networks (list/create/detail with IP allocations and ranges), layout-templates (list/create/detail/edit)
- Created settings page with General and Account tabs
- Created placeholder pages: topology, subnet-calculator, import-export, backup

### Phase 6: Switch Port Visualization
- Created SwitchPortGrid.vue (renders ports from layout template, organized by units/blocks)
- Created SwitchPortItem.vue (port shapes, VLAN colors, status indicators, trunk badges)
- Created SwitchUnitDivider.vue (visual separator between stacked units)
- Created SwitchPortSidePanel.vue (USlideover for editing individual ports)
- Created SwitchPortBulkEditor.vue (bulk VLAN/status assignment)
- Created SwitchInfoCard.vue (switch metadata card)
- Integrated port visualization into switch detail page

### Phase 7: Advanced Features
- Created dashboard with KPI widgets (counts, port status, IP utilization bars, warnings, activity feed)
- Created topology API (returns switch connection graph)
- Created subnet calculator page (real-time calculation from CIDR)
- Created activity API with undo support
- Created search API (global search across all entities)
- Created VLAN components (VlanColorSwatch, VlanBadge)

---

## Files Modified/Created

### Config
- package.json, package-lock.json, nuxt.config.ts, tsconfig.json, app.config.ts
- .gitignore, .env.example, Dockerfile, compose.yaml

### Types (types/)
- user.ts, switch.ts, port.ts, vlan.ts, network.ts, ipAllocation.ts, ipRange.ts
- layoutTemplate.ts, lagGroup.ts, activity.ts, settings.ts, api.ts, index.ts

### Server
- server/storage/jsonStorage.ts
- server/utils/ipv4.ts, server/utils/auth.ts
- server/plugins/initData.ts
- server/middleware/auth.ts
- server/validators/ (9 schema files)
- server/repositories/ (10 repository files)
- server/api/ (50+ API route files)

### App
- app/layouts/default.vue, app/layouts/auth.vue
- app/components/layout/ (4 components)
- app/components/shared/ (2 components)
- app/components/switch/ (6 components)
- app/components/vlan/ (2 components)
- app/composables/ (8 composables)
- app/middleware/auth.global.ts
- app/pages/ (20+ page files)

### i18n
- i18n/locales/en.json, i18n/locales/de.json

---

## Verification

npm run dev: Passes (starts on port 3000, serves dashboard)

npm run build: Passes (no errors)

docker build: Passes (multi-stage, ~5.6MB output)

docker run: Passes (healthcheck OK, API responds)

API Tests:
- /api/health returns status ok
- /api/auth/setup creates admin user
- /api/auth/login returns JWT
- CRUD operations work for all entities
- Subnet calculator returns correct results
- Data persists in JSON files

---

### Phase 8: Import/Export & Backup
- Created backup export API (full JSON backup of all data)
- Created backup import API (restore with pre-restore backup)
- Created entity export API (per-entity JSON download)
- Created entity import API (JSON array import with validation)
- Created import template API (downloadable templates per entity)

### Phase 9: Polish
- Full i18n translations (EN + DE) with 200+ keys
- Server-side Zod validation on all API routes
- Confirmation dialogs for all destructive actions
- Toast notifications for all CRUD operations
- Empty states on all list pages

### Phase 10: Docker & Production
- GPL v3 LICENSE file
- README.md with setup instructions
- Docker multi-stage build verified
- Docker compose with healthcheck verified
- End-to-end API testing passed (11 test scenarios)

---

## Verification

npm run dev: Passes

npm run build: Passes (no errors, 5.7MB output)

docker build: Passes (multi-stage, node:22-alpine)

docker run: Passes (healthcheck OK, API functional)

End-to-end tests: 11/11 passed
- Health endpoint
- Setup wizard (first admin creation)
- Layout template creation
- Switch creation with auto-port generation (26 ports from template)
- VLAN creation with color
- Network creation with CIDR validation
- IP allocation with subnet membership check
- Subnet calculator
- Dashboard statistics
- Global search
- Backup export

---

## Project Statistics

- 21 pages
- 15 components
- 8 composables
- 67 API routes
- 10 repositories
- 9 validators
- 13 type definitions
- 2 i18n locales (EN, DE)

---

### Phase 11: Switch Port Front-Panel Visualization (2026-03-17)

**Critical bug fix + visual enhancements:**

- Fixed `templateUnits` never being populated — port grid always fell back to flat 12-column layout
- Fixed component name resolution: `SwitchSwitchPortGrid` → `SwitchPortGrid` (SSR rendering issue)
- Added `watch([item, templates])` to populate `templateUnits` from layout template data
- Fetched and passed VLAN data through grid to port items for color-coded backgrounds
- Added VLAN color tinting (native_vlan color at 20% opacity as background)
- Added trunk port indicator (full-width yellow top stripe replacing tiny dot)
- Added SFP/SFP+ port type distinction (taller shape, rounded-t-lg, "SFP" micro-label)
- Added management port visual (teal border) and console port visual (amber border)
- Increased port size from 32x32px to 40x40px with larger font
- Moved port visualization above details card as primary content
- Made details card collapsible (collapsed by default) with chevron toggle
- Details grid now uses 3 columns on large screens
- Breadcrumb now shows switch name instead of ID (via useState override system)
- Fixed Docker healthcheck IPv6 issue (localhost → 127.0.0.1)
- Increased grid spacing between blocks and ports for better readability

**Files changed:**
- `app/pages/switches/[id].vue` — layout reorder, templateUnits fix, VLAN fetch, breadcrumb override, collapsible details
- `app/components/switch/SwitchPortGrid.vue` — vlans prop, improved spacing
- `app/components/switch/SwitchPortItem.vue` — VLAN colors, trunk stripe, port type shapes, larger size
- `app/components/layout/AppBreadcrumbs.vue` — useState-based label override system
- `compose.yaml` — healthcheck IPv4 fix

---

### Phase 13: Dark Theme & UI Polish (2026-03-24)

**Dark theme token overrides:**
- Overrode Nuxt UI v4 CSS custom properties for deep-dark industrial look
- `--ui-bg: #0e0e0e`, `--ui-bg-elevated: #161616`, `--ui-border: #222222`
- Restored consistent visual hierarchy: body (#0a0a0a) → bg-default (#0e0e0e) → bg-elevated (#161616)

**Hover visibility fix:**
- Created `.row-hover` CSS class with `rgba(255,255,255,0.10)` for dark mode
- Replaced invisible `hover:bg-elevated` on VLAN, Network, and IP allocation list rows
- Created `.list-container` CSS class with visible border for list containers

**Card border fix:**
- Replaced `ring ring-default` (thick, odd-looking) with `.card-glow` border styling
- `card-glow` now sets border via CSS (`rgba(255,255,255,0.08)` dark mode) with green glow on hover
- Applied to Switch cards, Template cards, Dashboard KPI cards

**Favicon and page titles:**
- Generated favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png from logo.png
- Added `titleTemplate: '%s — ezSWM'` to nuxt.config.ts
- Added `useHead()` with page-specific titles to all 20 pages
- Dynamic pages show entity names (e.g. "sw-core — ezSWM", "VLAN 100 — Server-VLAN — ezSWM")

**Files changed:**
- `app/assets/css/main.css` — dark theme tokens, .row-hover, .list-container, .card-glow border
- `nuxt.config.ts` — app.head with title, titleTemplate, favicon links
- `public/` — favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png
- All 20 page files in `app/pages/` — useHead() titles
- `app/pages/vlans/index.vue`, `app/pages/networks/index.vue` — row-hover, list-container
- `app/pages/switches/index.vue`, `app/pages/layout-templates/index.vue` — card-glow borders
- `app/pages/index.vue` — card-glow borders on KPI cards

**Verification:**
- `npm run build`: Passes (8.95 MB output)
- `docker compose build --no-cache`: Passes
- Zero console errors/warnings
- Dark theme visually consistent across all pages
- Hover effects clearly visible on list rows
- Card borders clean with green glow on hover

---

### Phase 14: LAG Groups UI (2026-03-31)

**LAG Group Management:**
- Upgraded useLagGroups composable with TypeScript types and precomputed lookup maps (lagById, lagByPortId)
- Created LagGroupSlideover component for create/edit LAG (dynamic title, port badges, validation)
- Added "Create LAG" button to port multi-select bulk action bar with inline validation hints
- Added LAG legend section to port grid with collapse/expand (≤3 inline, >3 collapsible)
- Added hover-highlight: hovering LAG in legend dims non-member ports (brightness filter)
- Added LAG group display in port side panel with "Remove from LAG" action
- Added LAG deep-link support (?lag=id opens edit slideover)

**Port Visualization Fixes:**
- Replaced LAG bottom-stripe indicator with diagonal stripe pattern (CSS class .lag-stripe)
- Added LAG hover tooltip on ports (name, port count, remote device)
- Fixed Access vs Trunk VLAN dot: Access = sharp square, Trunk = circle with outer ring

**Backend Improvements:**
- Added `metadata` field to ActivityEntry type for structured audit logging
- Added activity logging to all LAG API routes (create/update/delete) with port labels and diffs
- Added LAG cleanup on switch deletion (lagGroupRepository.deleteBySwitchId)
- Renamed route param [id] to [lagId] for LAG routes (disambiguation)
- Added LAG groups to global search API with deep-link URLs

**Shared Utilities:**
- Created app/utils/ports.ts with resolvePortLabel utility
- Added .lag-stripe, .lag-stripe-icon, .lag-dimmed CSS classes

**i18n:**
- Added full LAG translation keys (EN + DE) with pluralization and validation messages

**Files changed:**
- `types/activity.ts` — metadata field
- `server/repositories/activityRepository.ts` — metadata in log()
- `server/api/switches/[id].delete.ts` — LAG cleanup
- `server/api/switches/[id]/lag-groups/` — renamed to [lagId], added activity logging
- `server/api/search.get.ts` — LAG search
- `app/utils/ports.ts` — new utility
- `app/assets/css/main.css` — LAG CSS classes
- `app/composables/useLagGroups.ts` — typed with lookup maps
- `app/components/switch/SwitchPortItem.vue` — diagonal stripes, tooltip, dot fix
- `app/components/switch/SwitchPortGrid.vue` — LAG legend, hover-highlight
- `app/components/switch/SwitchPortSidePanel.vue` — LAG display + remove
- `app/components/switch/LagGroupSlideover.vue` — new component
- `app/components/layout/AppHeader.vue` — LAG in search results
- `app/pages/sites/[siteId]/switches/[id].vue` — LAG integration
- `i18n/locales/en.json`, `i18n/locales/de.json` — LAG translations

**Verification:**
- `npx nuxt typecheck`: 0 errors
- `npm run build`: Passes
- Unit tests: 105/105 passing

---

### Phase 15: Print CSS (2026-04-01)

**Print Feature:**
- Print CSS with scoped `.print-mode` class on body
- Dedicated `print.vue` layout (no sidebar/header)
- Multi-switch print page (`/sites/{siteId}/switches/print?ids=...`)
- Switch picker popover with checkboxes grouped by site
- Single switch print via hover icon on switch cards
- Access ports tinted with VLAN color (85% opacity) in print
- Trunk ports marked with black 16px dot in print
- `printMode` prop on SwitchPortItem/SwitchPortGrid for print-specific rendering
- Compact VLAN legend per switch in print output
- A4 landscape format with page breaks between switches
- Auto-opens in new tab via `window.open()`

**Files created:**
- `app/layouts/print.vue` — minimal print layout
- `app/pages/sites/[siteId]/switches/print.vue` — multi-switch print page
- `app/components/switch/SwitchPrintLegend.vue` — print VLAN legend

**Files changed:**
- `app/assets/css/main.css` — print CSS rules, `.print-preview` styles
- `app/components/switch/SwitchPortItem.vue` — `printMode` prop, VLAN tint, trunk dot
- `app/components/switch/SwitchPortGrid.vue` — `printMode` prop passthrough
- `app/pages/sites/[siteId]/switches/index.vue` — print picker popover, hover print icon
- `i18n/locales/en.json`, `i18n/locales/de.json` — print translations

**Version:** 0.6.0

**Verification:**
- `npx nuxt typecheck`: 0 errors
- `npm run build`: Passes
- Unit tests: 105/105 passing

---

### Phase 16: Activity Log Details (2026-04-02)

**Activity Log Improvements:**
- Port updates now log previous_state with field-by-field diff (only changed fields)
- Compact human-readable activity descriptions (e.g. "SFP+ 1/20: VLAN 100 assigned, activated")
- Dashboard: short summary (max 3 changes per entry)
- Switch detail: full summary (all changes) in collapsible "Recent Activity" section
- Activity API supports ?entity_id filter for per-entity activity
- All activity descriptions i18n-ready (EN + DE)
- Relative time strings i18n-ready ("just now" / "gerade eben")

**UI Fixes:**
- PoE option only shown for RJ45 ports
- Connection mode buttons renamed: Switch / Device / Custom

**Version:** 0.7.0

---

## Open Issues

- Topology page: interactive network diagram (Coming Soon placeholder in UI)
- Form validation is server-side only (no real-time client validation)
- Dashboard widget reordering not implemented
- IPv6 support not included (as per spec: post-MVP)

---

### Phase 17: Device Allocation Dropdown (2026-04-02)

**Device Connection Mode:**
- Replaced freetext "Device" mode with dropdown of IP allocations filtered by port's VLAN/network
- Access port: shows allocations from access_vlan network(s)
- Trunk port: shows allocations from all tagged + native VLAN networks
- No VLAN: shows hint "Assign a VLAN first"
- Dropdown with search, sorted by IP, grouped by network prefix for trunk ports
- "None" option to clear allocation
- Stale allocation handling (VLAN changed after assignment shows ⚠ marker)

**Backend:**
- Added `connected_allocation_id` to Port type
- New references endpoint: GET /api/networks/:id/allocations/:allocId/references
- Allocation delete clears connected_allocation_id on referencing ports
- Switch duplicate clears connected_allocation_id on all ports
- Port reset clears connected_allocation_id
- _createRemoteLink clears connected_allocation_id (prevents dual-state)
- connected_allocation_id in audit diff logging

**Frontend:**
- Rehydration: port with connected_allocation_id auto-selects Device mode
- Mode-switch clearing: switching modes clears previous mode's state
- Form state re-loaded on panel open (cancel discards changes)
- Port conflict detection includes allocation-occupied ports
- LAG sync includes connected_allocation_id
- Allocation delete warning shows affected ports via SharedConfirmDialog

**Version:** 0.8.0

---

### Phase 18: Keyboard Shortcuts (2026-04-09)

**Global keyboard shortcuts:**
- `/` focuses search input (existing, unchanged)
- `Esc` dismisses search results globally (even when input not focused), keeps query intact
- `Esc` closes mobile sidebar overlay
- Modals and slideovers already handle Esc natively via Reka UI
- Priority order: search results → mobile sidebar → native Nuxt UI

**Implementation:**
- `dismissSearch()` + `isSearchOpen` exposed from AppHeader via defineExpose
- Existing dismiss paths (`@keydown.escape`, click-outside overlay) deduplicated to use `dismissSearch()`
- Global keydown listener in default.vue layout with headerRef
- `data-testid` attributes added for search-input, search-results, mobile-menu-button, mobile-sidebar-overlay

**Files changed:**
- `app/components/layout/AppHeader.vue` — dismissSearch, defineExpose, data-testid attrs, dedup dismiss paths
- `app/layouts/default.vue` — global Esc listener with headerRef, data-testid on sidebar overlay

**Files created:**
- `tests/e2e/keyboard-shortcuts.spec.ts` — 4 E2E tests (/ focus, Esc input-scoped, Esc global, mobile sidebar)

**Verification:**
- `npm run typecheck`: Passes (exit 0)
- `npm run build`: Passes
- E2E tests: keyboard-shortcuts.spec.ts passing

---

### Phase 19: Public QR Switch View (2026-04-15)

**Public read-only switch view via QR code:**
- New `publicTokens.json` storage with dedicated repository
- Public API route `GET /api/p/:token` — returns sanitized switch data (no auth)
- Admin API routes for token lifecycle (create/get/revoke)
- QR code generation (SVG + PNG) via `qrcode` package
- Print sticker dialog (~62x29mm label format)
- Public mobile-first page at `/p/:token` — dark theme, port grid + port list
- Reuses `SwitchPortGrid`/`SwitchPortItem` with `publicMode` prop
- `PublicPortList` component with filter tabs (All/Occupied/Unused)
- `VlanDisplayInfo` interface for widened component props
- Auth bypass in both server and client middleware
- Backup/restore includes `publicTokens.json` (backwards compatible)
- Switch delete cascades to token deletion
- Security: 32-char tokens, `noindex`, `no-store`, no internal IDs leaked
- Full i18n (EN + DE)

**Files created:**
- `types/publicToken.ts`
- `server/repositories/publicTokenRepository.ts`
- `server/validators/publicTokenSchemas.ts`
- `server/api/p/[token].get.ts`
- `server/api/switches/[id]/public-token/` (3 routes)
- `app/composables/usePublicToken.ts`
- `app/layouts/public.vue`
- `app/pages/p/[token].vue`
- `app/components/public/PublicPortList.vue`
- `app/components/switch/SwitchPublicAccess.vue`
- `tests/public-token.test.ts`
- `tests/e2e/public-switch-view.spec.ts`

**Files changed:**
- `types/vlan.ts` — VlanDisplayInfo interface
- `types/index.ts` — barrel exports
- `server/middleware/auth.ts` — /api/p/ bypass
- `app/middleware/auth.global.ts` — /p/ bypass
- `server/plugins/initData.ts` — publicTokens.json init
- `server/api/switches/[id].delete.ts` — cascade delete
- `server/api/backup/export.get.ts` — include publicTokens
- `server/api/backup/import.post.ts` — restore publicTokens
- `app/components/switch/SwitchPortGrid.vue` — publicMode, VlanDisplayInfo
- `app/components/switch/SwitchPortItem.vue` — publicMode, VlanDisplayInfo
- `app/pages/sites/[siteId]/switches/[id].vue` — QR section
- `i18n/locales/en.json`, `i18n/locales/de.json` — public.* keys

**Version:** 0.10.0

**Verification:**
- `npm run build`: Passes
- Unit tests: public-token.test.ts passing (8/8)
- E2E tests: public-switch-view.spec.ts (5 tests)

---

## Feature Backlog

### Quick Wins
- Port utilization bar on switch cards (% ports up/configured)
- Favoriten/Pinned switches — star icon, pinned cards shown first
- CSV export for switches, VLANs, networks
- Port table view — collapsible table below port grid for copy-paste

### Medium Effort
- VLAN matrix per switch — which VLANs on which switch, as grid/matrix
- Activity log per entity — "recent changes to this switch" in detail panel
- Bulk import — CSV/JSON upload for switches, VLANs, networks
- Real-time client-side form validation

### Larger Features
- Topology: interactive graph visualization (v-network-graph or similar)
- Dashboard widgets customizable — drag & drop reorder KPI cards
- PDF export — switch front panel as printable PDF
- IPv6 support

### Testing & Quality
- Phase 11: Testing (vitest, unit tests for repositories and IPv4 utils)
- Print view CSS

---

### Phase 12: Nuxt UI v4 Migration — Fixes (2026-03-22)

**USlideover accessibility fixes:**
- Replaced all 6 `#header` slot overrides with native `title`/`description` props
- Eliminates reka-ui `DialogTitle`/`DialogDescription` console warnings
- Files: SwitchPortSidePanel.vue, SwitchPortBulkEditor.vue, vlans/index.vue, networks/[id].vue (x2), switches/[id].vue

**UModal accessibility fix:**
- Added `title`/`description` props to ConfirmDialog.vue

**UTabs v4 slot API migration:**
- Migrated settings.vue from `#item` + `v-if="item.key"` to named slot properties (`#general`, `#account`)
- Migrated data-management.vue from `#item` to named slots (`#backup`, `#export`, `#import`)
- Fixed Settings and Data Management pages showing empty tab content

**USelect v4 empty value fix:**
- Removed `{ label: '---', value: '' }` items from USelect (v4 forbids empty string values)
- Added `placeholder` prop instead for optional fields
- Fixed 500 error on switches/create, networks/create, layout-templates/create/edit
- Files: switches/create.vue, networks/create.vue, networks/[id].vue, layout-templates/create.vue, layout-templates/[id]/edit.vue, SwitchPortBulkEditor.vue

**Form input full-width styling:**
- Added `class="w-full"` to ~60 UInput/USelect/USelectMenu/UTextarea components across 12 files
- All form fields inside UFormField now render full-width consistently
- Files: all create pages, edit slideovers, settings, data-management, port side panel, bulk editor

**Verification:**
- All pages tested: Dashboard, Switches, VLANs, Networks, Layout Templates, Settings, Data Management
- All create pages render correctly with full-width form fields
- Port edit slideover, VLAN detail slideover, switch edit slideover all working
- Zero console errors, zero warnings
- `npm run build`: Passes (8.95 MB output)
- `docker compose build --no-cache`: Passes

---

## History

### Phase 0 — Documentation & Planning (2026-03-16)
- Created all SPEC documents
- Updated CLAUDE.md, STRATEGY.md, ARCHITECTURE.md
