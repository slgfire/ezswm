# MIGRATION STATUS

## Latest Stage

Date: 2026-04-26
Stage: Phase 26c — Documentation & Screenshot Update
Status: Complete

### Phase 26e Changes (Info-Bar Inline-Expand wie Switch)
- **Info-Leiste als klickbarer Button:** Gesamte Summary-Leiste ist jetzt ein `<button>` mit Hover-State (wie Switch-Seite)
- **Chevron-Toggle:** Expand/Collapse-Chevron rechts in der Info-Leiste, rotiert bei Expand (identisch zu Switch)
- **Inline-Expand:** Zusätzliche Details (Netzwerkadresse, Broadcast, DNS, Description) klappen als `border-t` innerhalb desselben Containers auf — kein separater Block mehr
- **Info-Button aus Header entfernt:** Toggle-Logik ist jetzt vollständig in der Info-Leiste, nicht mehr im Header
- **Konsistenz zu Switch:** Exakt gleiches Interaktionsmuster wie auf der Switch-Detailseite

### Phase 26d Changes (Network Edit Polish)
- **Edit-Kontext klar abgesetzt:** Eigener Container mit `border-primary-500/30` und leichtem Primary-Hintergrund — visuell klar als Edit-Modus erkennbar
- **Edit-Header:** Pencil-Icon + "Netzwerk bearbeiten" Titel + Close-Button — klarer Kontextwechsel
- **Details und Edit getrennt:** `v-show` für Details nur ohne Edit, Edit hat eigenen Container — kein gemeinsamer Block mehr
- **Footer mit Separator:** Cancel/Save durch `border-t border-primary-500/20 pt-4` visuell abgesetzt
- **Description → UTextarea:** Einzeiliges UInput ersetzt durch UTextarea mit 2 Zeilen (konsistent mit VLAN-Panel)
- **Description volle Breite:** Aus dem 2-Spalten-Grid herausgenommen, steht jetzt als eigenes Feld auf voller Breite
- **Pflichtmarker bereinigt:** `+ ' *'` String-Concat entfernt, nutzt stattdessen UFormField `required` Prop

### Phase 26c Changes (Doku & Screenshots)
- **Screenshots aktualisiert:** `screenshot-vlans.png`, `screenshot-networks.png` auf aktuellen UI-Stand gebracht
- **Neue Screenshots:** `screenshot-vlans-detail.png` (VLAN-Sidepanel), `screenshot-network-detail.png` (IP-Übersicht)
- **User Guide EN:** VLAN-Sektion um Sidepanel-Beschreibung + Screenshot ergänzt. Netzwerk-Sektion komplett überarbeitet (IP-Übersicht, klickbare Zeilen, Badges, Ranges)
- **User Guide DE:** Identische Aktualisierungen in deutscher Fassung
- **Globale Suche:** Audit durchgeführt — vollständig funktional, Doku aktuell, kein Handlungsbedarf

### Previous: Phase 26b — Network Page Feinschliff & Konsistenz

### Phase 26b Changes (Feinschliff)
- **IP-Übersicht Header-Alignment:** Titel auf `text-base` angehoben und `mb-3` Spacing — saubere vertikale Ausrichtung mit dem Hinzufügen-Button
- **Host-Zeilen-Hierarchie:** IP-Adresse dezenter (text-xs Mono), Hostname als Primärinfo (text-sm font-medium). Ohne Hostname → IP-Adresse als Fallback-Haupttext
- **Description + MAC als Subtext:** Allocation-Description und MAC-Adresse als zweite Zeile (`text-[11px] text-gray-400`) statt nur MAC
- **Allocation-Edit-Titel:** Zeigt IP-Adresse + Hostname statt generischem "Zuweisung bearbeiten" — analog zum Range-Panel
- **Validierung i18n:** Alle Network-Edit-Fehlermeldungen (Name, Subnet CIDR, Gateway IPv4) über `networks.validation.*` Keys
- **Range IP-Count i18n:** `"123 IPs"` → `$t('networks.ranges.ipCount', { count })` 
- **Delete-Dialog i18n:** `"+ more"` → `$t('common.more')`
- **Sort-Header i18n:** Hardcoded "Name/Subnet/Gateway" → `$t('common.name')`, `$t('networks.infoBar.subnet/gateway')`
- **Sort-Header dezenter:** Von `text-[11px] py-2` auf `text-[10px] py-1.5 text-gray-500` mit Hover-Transition
- **Neue i18n-Keys:** `networks.validation.*`, `networks.ranges.ipCount`, `common.more` (EN + DE)

### Phase 26 Changes (Network Page IP Overview)
- **IP-Zeilen klickbar:** Ganze Allocation-/Range-Zeile ist jetzt klickbar und öffnet direkt das Edit-Sidepanel
- **Selection-State:** Aktive Zeile bekommt `bg-primary-500/10` Highlight — klare Master-Detail-Verbindung
- **Hover-States verbessert:** Range-Zeilen mit typ-spezifischem Hover, cursor-pointer für alle interaktiven Zeilen
- **Allocation-Zeilen:** Device-Type als UBadge, Status-Badge i18n
- **Range-Zeilen:** Start-IP prominent, End-IP dezenter getrennt dargestellt
- **Sidepanel Header:** Range-Edit mit Type-Badge + IP-Range im Titel, Add/Edit-Panel kontextabhängig
- **Tooltips → native title:** UTooltip ersetzt (verhindert Auto-Focus-Bug)
- **Sprachkonsistenz:** Alle hardcoded Strings i18n, Utilization-Legende i18n
- **Netzwerkliste:** Nicht-funktionaler Edit-Button entfernt

### Previous: Phase 25c — VLAN Sidepanel Switch-Konsistenz (v0.14.3)

### Phase 25c Changes (Switch-Sidepanel-Angleichung)
- **Fix: Tooltip-Auto-Focus-Bug:** `UTooltip` um Edit/Delete-Buttons entfernt — USlideover fokussiert beim Öffnen den ersten Button im `#actions`-Slot, was den Tooltip sofort auslöste. Ersetzt durch natives `title`-Attribut (kein Focus-Trigger)
- **Header vereinheitlicht:** Swatch + "VLAN {id} — {name}" als einfacher Titel-String wie beim Switch-Panel (kein überladenes Custom-Layout). Actions (Edit/Delete) rechts mit `title`-Attribut
- **Card-in-Card eliminiert:** `rounded-lg border p-4` Container um Properties und `rounded-lg border` um Netzwerke entfernt. Body ist jetzt flach mit `space-y-4` wie beim Switch-Panel
- **Status + Farbe als Badges:** Oben im Body als `flex gap-2` Badge-Zeile (wie Switch: type + status Badges). Farb-Badge enthält Swatch + Hex inline
- **Sections mit USeparator:** Netzwerk-Sektion durch `<USeparator />` vom Rest getrennt — gleicher Mechanismus wie im Switch-Panel
- **Labels vereinfacht:** Von `text-[10px] uppercase tracking-wider` zu `text-sm text-gray-400` — gleiche Label-Sprache wie Switch-Panel (`UFormField :label`)
- **Netzwerk-Links flach:** Einfache hover-fähige Liste ohne Border-Container. Leer-Zustand als schlichter `text-gray-500` Text (kein border-dashed)

### Phase 25b Changes (Sidepanel Polish)
- Header entzerrt, Redundanz entfernt, Properties-Sektion, Farbwert aufgewertet, Netzwerk-Sektion, Label-Farbe angepasst

### Phase 25 Changes
- **VLAN list selection state:** Active/selected row highlighted with `bg-primary-500/10` + color accent bar widens from `w-1` to `w-2` (animated) — clear master-detail connection
- **Sort header dezenter:** Reduced from `text-[11px] py-2` to `text-[10px] py-1.5`, softer color (`text-gray-500`), smoother hover transition
- **Metadata hierarchy ruhiger:** "No network" changed from yellow exclamation to italic neutral with minus-circle icon — recognized as empty state, not alarm. Network names get `font-medium` for slight emphasis
- **Sidepanel header redesigned:** VLAN ID in VLAN color (bold) + name baseline-aligned, status badge with `mt-1` spacing — less crammed, clearer priority
- **Sidepanel actions:** Edit + Delete buttons in header actions (consistent with switch panels), tooltips for both
- **Sidepanel info structure:** Sections separated with `border-t border-default` dividers — Description and Networks as own sections with clear visual breaks
- **Networks section with icon header:** Globe icon + uppercase label, hover links with `hover:bg-elevated`, empty state italic gray
- **Edit form color preview:** VlanColorSwatch added next to hex input for live preview
- **Panel close resets edit mode:** Watcher resets `panelEditing` when panel closes
- **Detail page (`[id].vue`) labels unified:** All field labels now use `text-[10px] uppercase tracking-wider text-gray-400` — matches sidepanel and switch page
- **Detail page network links:** Updated to same flex layout with `hover:bg-elevated` and `text-primary-500`
- **Detail page description:** Now in separate `border-t` section below grid

---

## Previous Stage

Date: 2026-04-24
Stage: Phase 24c — Toolbar Consistency & Info Inline Refactor (v0.14.2)
Status: Complete

### Phase 24c Changes
- **Info moved to inline expand/collapse:** Info-Karte ist jetzt klickbar mit Chevron-Toggle. Details klappen inline unter der Info-Karte auf/zu — kein Toolbar-Button, kein Slideover
- **Toolbar Action-Farben wiederhergestellt:** Edit zurück zu `color="primary"` (konsistent mit allen anderen Seiten: VLANs, Networks, Sites, Layout Templates)
- **Toolbar 3-Gruppen-Layout:** [VLANs | Details] | [PublicAccess | Edit | Duplicate] | [Delete] — mit visuellen Dividern
- **VLANs + Details farbig:** VLANs in violet (passend zum Dashboard-KPI), Details in blau — via Tailwind-Klassen (`text-violet-400`, `text-blue-400`) mit farbigem Hover-Hintergrund
- **Details-Slidepanel beibehalten:** Tabs "Ports" / "Activity", SwitchPortTable mit `embedded`-Prop (keine doppelte Ebene)
- **Utility-Actions (QR + Duplicate):** Von `variant="ghost"` zu `variant="soft"` — dezenter Hintergrund + deutlich sichtbarerer Hover-/Focus-State, konsistent als neutrale Utility-Familie
- **Utility-Actions (QR + Duplicate):** Von `variant="ghost"` zu `variant="soft"` — dezenter Hintergrund + sichtbarerer Hover-/Focus-State
- **Polish:** Redundante Tooltips bei VLANs/Details entfernt, `cursor-pointer` auf Info-Karte
- **Doku-Update:** User Guide (EN+DE) aktualisiert: Port Table/Activity jetzt als Details-Slideover beschrieben, Info-Leiste mit Expand-Toggle dokumentiert, Toolbar-Aktionen beschrieben. Screenshot `screenshot-switch-detail.png` erneuert. README Version-Badge auf 0.14.0, Roadmap ergänzt

### Phase 24b Changes
- **Labels shortened:** "More details" → "Details", tab "Port Table" → "Ports", tab "Recent Activity" → "Activity"
- **Details slideover inner structure simplified:** SwitchPortTable `embedded` prop removes collapsible header/card wrapper; shows compact summary bar + table directly under Ports tab
- **i18n updated:** Added `common.info`, `switches.detailsAction`, `switches.tabs.ports`, `switches.tabs.activity` (EN + DE)

### Phase 24a Changes (2026-04-23)
- **VLAN Selector simplified:** Removed override toggle, lock icons, "+Switch" badges. All site VLANs are now always selectable with informational grouping (configured / other site VLANs)
- **Override moved to Connected Switch selection:** When VLANs are selected, the connected switch list filters to only show switches with those VLANs configured. An override toggle allows showing all switches and auto-adding missing VLANs to the target switch on save
- **Backend: auto-add on current switch:** Port updates now automatically add unconfigured VLANs to the current switch's configured_vlans (no toggle needed)
- **Backend: target switch override:** New `add_vlans_to_target_switch` flag in port update API. When set, missing VLANs are atomically added to the connected target switch
- **Bulk editor simplified:** Override toggle removed (bulk has no connected switch selection)
- **LAG port rehydration:** Ports in LAGs now auto-detect connected switch from LAG remote_device_id
- **LAG VLAN config:** New optional VLAN configuration section in LAG slideover — applies port_mode/VLANs to all LAG member ports via bulk API
- **Site filter fix:** Switch dropdowns (port editor + LAG slideover) now filter by current site_id
- **i18n updated:** Old override keys replaced with target switch override keys + LAG VLAN keys (EN + DE)
- **Switch detail layout simplified:** Configured VLANs moved to action button + slideover; Port Table + Activity moved to "More details" slideover with tabs; Legend zone below port grid stripped of box/card styling; Helper section made collapsible

---

## Previous Stage

Date: 2026-04-20
Stage: Phase 24 — Secure VLAN Port Assignment (v0.14.0)
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

### Phase 20: Port Helper Usage (2026-04-17)

**Explicit port classification for public helper view:**
- New `PortHelperUsage` type with 6 roles: participant, phone_passthrough, ap, printer, orga, uplink
- Three new optional fields on Port: `helper_usage`, `helper_label`, `show_in_helper_list`
- Side panel editor: "Public Helper View" section with role dropdown, custom label, visibility checkbox
- Bulk editor: three-state helper_usage dropdown (no change / automatic / explicit role)
- Public API passes through all three fields
- PublicPortList rewritten with centralized `getEffectiveUsage()` for both category and purpose
- Backwards-compatible fallback: legacy ports without helper_usage use inference (is_uplink → uplink, tagged_vlans → special, else → participant)
- `show_in_helper_list: false` hides port from helper list (still visible in desktop grid)
- `helper_label` overrides default role label in public view
- Activity logging tracks helper field changes; null→undefined normalization preserves clear-to-automatic in audit log
- Per-role filter chips in public view (Phone + PC, Orga, etc.)
- Full i18n (EN + DE)

**Files changed:**
- `types/port.ts` — PortHelperUsage type, 3 new Port fields
- `types/index.ts` — barrel export
- `server/validators/switchSchemas.ts` — Zod schemas for single + bulk update
- `server/api/p/[token].get.ts` — include helper fields in public response
- `server/api/switches/[id]/ports/[portId].put.ts` — diff allowlist, null normalization
- `server/api/switches/[id]/ports/bulk.put.ts` — null normalization
- `app/components/switch/SwitchPortSidePanel.vue` — helper view section
- `app/components/switch/SwitchPortBulkEditor.vue` — helper_usage dropdown
- `app/components/public/PublicPortList.vue` — rewritten classification logic
- `tests/e2e/public-switch-view.spec.ts` — helper_usage tests
- `i18n/locales/en.json`, `i18n/locales/de.json` — helperUsage.* keys

**Version:** 0.11.0

**Verification:**
- `npm run build`: Passes
- Unit tests: all passing
- E2E tests: public-switch-view.spec.ts updated

---

### Phase 21: Network Topology Visualization (2026-04-18)

**Site-scoped interactive topology:**
- v-network-graph (Vue 3 SVG library) with custom node rendering
- Site-scoped page at `/sites/[siteId]/topology`
- Custom SVG nodes: switch name, role badge, model, port status dots
- One edge per physical port connection (bidirectional dedup)
- LAG members as parallel edges with `edge.gap` spacing
- Cross-site links: ghost nodes with dashed borders
- Detail panel: switch info, port footer, connections grouped by LAG
- Hierarchical auto-layout (Core → Distribution → Access)
- Drag-to-reposition with persistent positions (topologyLayouts.json)
- Reset layout (DELETE endpoint), Fit to screen, PNG export (SVG→Canvas)
- Toolbar, role legend, stats badge
- Topology nav hidden in All Sites context
- Full i18n (EN + DE)

**Files created:**
- `types/topology.ts` — TopologyNode, TopologyLink, TopologyGhostNode, TopologyLayout
- `app/plugins/v-network-graph.ts` — Nuxt plugin
- `app/pages/sites/[siteId]/topology.vue` — main page
- `app/components/topology/TopologyGraph.vue` — graph component
- `app/components/topology/TopologyDetailPanel.vue` — detail panel
- `app/composables/useTopology.ts` — data fetching composable
- `server/api/sites/[siteId]/topology/` — 4 API endpoints (data, layout GET/PUT/DELETE)
- `server/repositories/topologyLayoutRepository.ts` — layout storage
- `server/validators/topologySchemas.ts` — Zod validation

**Files changed:**
- `server/plugins/initData.ts` — topologyLayouts.json init
- `server/api/backup/export.get.ts` — include in backup
- `server/api/backup/import.post.ts` — include in restore
- `server/api/sites/[id].delete.ts` — cleanup on site deletion
- `app/components/layout/AppSidebar.vue` — site-scoped nav
- `i18n/locales/en.json`, `de.json` — topology keys

**Files removed:**
- `app/pages/topology.vue` — replaced by site-scoped
- `server/api/topology.get.ts` — replaced by site-scoped

**Version:** 0.12.0

**Verification:**
- `npm run build`: Passes

---

### Phase 21b: Topology UI/UX Polish (2026-04-18)

**Visual improvements to topology graph:**
- Edge visibility: normal color `#555` (was `#2a2a2a`), hover `#999`, selected green with width 3.5
- Removed duplicate node labels (v-network-graph default label hidden via `label.visible: false`)
- Role-based node sizing: Core 164x80, Distribution 150x74, Access 140x68
- Role-colored node borders: subtle tint matching role color, stronger on hover
- Node hover state: border opacity increase + SVG glow filter in role color
- Port status symbols: ▲ up (green), — down (gray), ▼ disabled (red) instead of identical circles
- Auto-fit on page load (`fitToContents()` after 200ms mount delay)
- Compact icon toolbar: +/− zoom, fit, reset, export as icon-only buttons with dividers
- Improved legend: filled circles + port status symbol explanation in bottom bar
- Better auto-layout spacing: 220px horizontal, 250px vertical (was 200/200)

**Files changed:**
- `app/components/topology/TopologyGraph.vue` — complete UI overhaul
- `i18n/locales/en.json` — added zoomIn, zoomOut keys
- `i18n/locales/de.json` — added zoomIn, zoomOut keys

**Verification:**
- `npm run build`: Passes
- Zero console errors

---

### Phase 21c: Topology UI Polish Refinement (2026-04-18)

**Focused polish pass:**
- Native fit-to-view via `autoPanAndZoomOnLoad: 'fit-content'` with `fitContentMargin: 50` (replaces manual setTimeout)
- Node bounding box matches largest node (168x82) preventing right-edge clipping
- Slightly larger nodes: Access 148x72 (was 140x68), Dist 156x76 (was 150x74), Core 168x82 (was 164x80)
- Edge fanout: `gap: 12` + `margin: 8` for cleaner parallel link spacing
- Dist border opacity 0.25 vs Access 0.15 for stronger visual differentiation
- Model text left-aligned (matching name) instead of centered
- Port count label (`48p`) added for context next to status symbols
- Toolbar + bottom bar: `backdrop-blur-sm`, `shadow-md`, `bg-elevated/90` for cohesive floating look
- Stats merged into legend bar (single bottom element instead of two)
- Tier y-spacing 260 (was 250) for better vertical distribution

**Files changed:**
- `app/components/topology/TopologyGraph.vue`
- `.ai/MIGRATION_STATUS.md`

**Verification:**
- `npm run build`: Passes
- Zero console errors

---

### Phase 21d: Topology Final Layout + Edge Attachment Fix (2026-04-18)

**Layout polish:**
- Asymmetric fitContentMargin `{ top: 20, bottom: 60, left: 60, right: 60 }` — graph sits higher, less empty space above
- Bottom/side padding prevents node clipping near edges and legend bar
- Edge gap increased to 14 for cleaner parallel link fanout from core

**Edge-to-node attachment fix:**
- Root cause: node config `width/height` (168x82) was larger than actual SVG rects (148x72 for Access), causing edges to terminate at the config boundary instead of the visual card edge
- Fix: `edge.margin: null` — edges now extend to node center, visually clipped by the opaque node background rect drawn in the `#override-node` slot
- Edges attach flush to all node sizes regardless of role

**Minor:**
- Port count label font bumped to 9px (was 8px) for readability

**Files changed:**
- `app/components/topology/TopologyGraph.vue`
- `.ai/MIGRATION_STATUS.md`

**Verification:**
- `npm run build`: Passes
- Zero console errors

---

### Phase 21e: Selection Polish + Panel Re-fit (2026-04-18)

**Selection state:**
- Selected node uses role-colored border at 0.55 opacity (was uniform green 0.5)
- Dedicated `glow-selected` SVG filter with green glow (stdDeviation 4, opacity 0.2)
- Selection feels integrated with role colors instead of a disconnected overlay
- Guard against NaN SVG attributes when scale is briefly undefined during transitions

**Panel integration:**
- Graph auto-re-fits when detail panel opens or closes via `watch(panelOpen)`
- All nodes remain visible even with the 290px panel taking canvas space

**Files changed:**
- `app/components/topology/TopologyGraph.vue`
- `app/pages/sites/[siteId]/topology.vue`
- `.ai/MIGRATION_STATUS.md`

**Verification:**
- `npm run build`: Passes

---

### Phase 21f: Panel Reuse + Edge Highlighting + Node Differentiation (2026-04-18)

**Panel → USlideover:**
- Replaced custom `w-[290px]` div with `<USlideover>` matching the app's standard side panel
- Title/description props, `#body` + `#footer` slots, standard close behavior
- Graph gets full canvas width (panel overlays, no longer pushes)
- Connection cards emit `highlight-edge` on hover for edge highlighting

**Edge highlighting:**
- Panel connection hover → edge selected in graph via `setSelectedEdges()`
- Edge selection style: green `rgba(34,197,94,0.6)` width 3.5

**Node differentiation:**
- Role accent bar: 3px vertical stripe on left edge in role color (Core 0.7 opacity, others 0.4)
- Wider size gap: Core 176x86, Dist 160x78, Access 148x72 (was 168/156/148)
- Combined with role-colored borders → clear hierarchy at a glance

**Files changed:**
- `app/components/topology/TopologyDetailPanel.vue` — rewritten to USlideover
- `app/components/topology/TopologyGraph.vue` — accent bar, highlight-edge, size update
- `app/pages/sites/[siteId]/topology.vue` — new events, panel overlay layout
- `.ai/MIGRATION_STATUS.md`

**Verification:**
- `npm run build`: Passes

---

### Phase 21g: Side Panel UX Improvements (2026-04-18)

**Panel content restructuring:**
- Role badge moved into USlideover description ("Core · Juniper · QFX5100")
- Connections grouped by target switch — one card per switch instead of per link
- Port mappings as compact monospace rows (local ↔ remote) inside each card
- LAG sub-groups shown as labeled sections within switch cards
- VLANs deduplicated per target switch, shown once at bottom of card
- Port stats dots reduced from 2px to 1.5px, tighter spacing
- Overall vertical density significantly improved

**Files changed:**
- `app/components/topology/TopologyDetailPanel.vue`
- `.ai/MIGRATION_STATUS.md`

**Verification:**
- `npm run build`: Passes

---

### Phase 21h: Graph Layout + Node Readability (2026-04-18)

**Layout improvements:**
- Reduced ySpacing from 260 to 200 (was briefly 160, too aggressive)
- Empty tiers skipped so nodes don't float with unnecessary gaps
- Lower-tier nodes sorted by primary connected upper node to minimize edge crossings
- Edge margin set to 2 (edges stop at node boundary, no pass-through)
- fitContentMargin adjusted: top 30, bottom/left/right 50

**Node readability:**
- Wider nodes: Core 196x86 (was 176), Dist 176x78 (was 160), Access 164x72 (was 148)
- Increased truncation limits: Core 20 chars, Dist 17, Access 16 (were 16/14/14)
- Model text truncation: Core 30, others 24 (were 26/22)
- Subtle role-tinted background fill per node (Core red 3%, Dist blue 2%, Access green 1.5%)

**Node differentiation:**
- Core accent bar widened to 4px (was 3), opacity 0.8
- Distribution accent bar opacity 0.5 (was 0.4)
- Graduated opacity: Core 0.8 → Dist 0.5 → Access 0.35
- v-network-graph bounding box updated to 196x86 to match largest node

**Files changed:**
- `app/components/topology/TopologyGraph.vue`
- `.ai/MIGRATION_STATUS.md`

**Verification:**
- `npm run build`: Passes

---

### Phase 21i: Edge Type Differentiation + Card Design Alignment (2026-04-18)

**Node card design aligned with switch overview:**
- Identical structure: Name + Badge header, Model subtitle, port footer
- Port footer matches switch cards: "XX PORTS" left, colored dots right, border-t separator
- Removed accent bar and triangle port symbols
- Dynamic name truncation based on node width

**Edge type visual differentiation:**
- Normal links: thin (1.5px), solid, `#555`
- Trunk links (multiple VLANs): medium (2px), dashed `6,3`, `#666`
- LAG links: thick (3px), solid, `#7a8999` (blue-gray)
- Per-edge styling via v-network-graph function configs
- Custom edge data (`isLag`, `isTrunk`) passed to graphEdges
- Legend updated with edge type indicators (solid/dashed/thick lines)

**Files changed:**
- `app/components/topology/TopologyGraph.vue`
- `.ai/MIGRATION_STATUS.md`

**Verification:**
- `npm run build`: Passes

---

### Phase 21j: Mini Layout Polish (2026-04-18)

- fitContentMargin tightened: top 20, bottom 40, sides 40 (was 30/50/50)
- xSpacing 200 (was 210) — slightly denser horizontal layout

**Files changed:**
- `app/components/topology/TopologyGraph.vue`
- `.ai/MIGRATION_STATUS.md`

---

### Phase 21k: Documentation Audit + Release Readiness (2026-04-19)

**README.md:**
- Version badge updated: 0.8.0 → 0.12.0
- Roadmap: Topology, LAG Groups, Print View marked as completed with version tags
- Rack Planning and IPv6 remain as planned

**User Guide (EN + DE):**
- Added full "Network Topology" section (EN: ~60 lines, DE: ~60 lines)
- Covers: overview, graph layout, edge types (Link/Trunk/LAG), detail panel, toolbar, saved positions
- Two new topology screenshots added

**API Reference (EN + DE):**
- Removed stale `GET /api/topology` global endpoint
- Added 4 site-scoped topology endpoints: data, layout GET/PUT/DELETE

**Screenshots:**
- `screenshot-topology.png` — full topology graph view
- `screenshot-topology-detail.png` — topology with detail panel open

**Files changed:**
- `README.md`
- `docs/guide/user-guide.md`
- `docs/de/guide/user-guide.md`
- `docs/api/reference.md`
- `docs/de/api/reference.md`
- `docs/public/images/screenshot-topology.png` (new)
- `docs/public/images/screenshot-topology-detail.png` (new)
- `.ai/MIGRATION_STATUS.md`

---

## Feature Backlog

### Quick Wins
(all completed)

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

### Phase 23: Switch Detail Lower Section UX (2026-04-19)

**Visual consolidation of the lower section on switch detail page:**
- Legend (Status/Type/Mode), VLANs, LAG chips, and multi-select hint consolidated into one `list-container` card
- "Indicators" label renamed to "Mode" (`legend.mode` i18n key, `legend.access` for Access)
- VLANs moved to own row with VLAN ID + name display
- LAG chips get `truncate max-w-[150px]` on name spans for long names
- Multi-select hint as last row inside legend card, auto-hides when ports are selected
- Multi-select hint text updated: "Mehrfachauswahl: Strg/Cmd + Klick auf Ports"
- Port Table collapsible upgraded to card with status metadata (up/down/disabled counts in header)
- Recent Activity collapsible upgraded to card with entry count + latest timestamp in header
- Both collapsibles get `border-t` separator between header and content when expanded
- All three cards share `list-container rounded-lg bg-default` visual style
- Trunk box-shadow uses `var(--color-default)` for dark/light mode compatibility

**Bug fix:**
- `usedVlans` computed in `SwitchPortGrid.vue` now collects `access_vlan` and `tagged_vlans` in addition to `native_vlan`

**i18n:**
- New keys: `legend.mode`, `legend.access`, `switches.portTable.portsCount`, `switches.portTable.upCount/downCount/disabledCount`, `switches.activity.entriesCount`, `switches.activity.latest`
- Updated: `switches.ports.multiSelectHint`
- Pluralization support for port/entry counts

**Files changed:**
- `app/components/switch/SwitchPortGrid.vue` — legend card consolidation, usedVlans fix
- `app/components/switch/SwitchPortTable.vue` — card style, portStats, metadata header
- `app/pages/sites/[siteId]/switches/[id].vue` — activity card, spacing adjustments
- `i18n/locales/de.json`, `i18n/locales/en.json` — new and updated keys

**Verification:**
- `npm run build`: Passes (8.55 MB output)

---

### Phase 23b: Documentation Update (2026-04-20)

**VitePress documentation audit and refresh:**
- Updated 7 screenshots to reflect current UI (switch detail with card layout, LAG highlight, switches list with favorites, dashboard, sites, subnet calculator)
- Added missing documentation sections: Sites Management, Subnet Calculator, Favorite Switches
- Updated switch detail description to cover new legend card, port table card with status metadata, activity card with latest timestamp
- Fixed bulk port editing instruction: "Shift or Ctrl" → "Ctrl (or Cmd on Mac)"
- Updated LAG legend description to reflect card-based layout
- Referenced previously unused screenshots (sites, subnet-calculator) in user guide
- All changes applied to both EN and DE user guides

**Files changed:**
- `docs/guide/user-guide.md` — 3 text updates + 3 new sections
- `docs/de/guide/user-guide.md` — same changes in German
- `docs/public/images/screenshot-switch-detail.png` — replaced
- `docs/public/images/screenshot-lag-portgrid.png` — replaced
- `docs/public/images/screenshot-lag-highlight.png` — replaced
- `docs/public/images/screenshot-switches.png` — replaced
- `docs/public/images/screenshot-dashboard.png` — replaced
- `docs/public/images/screenshot-sites.png` — replaced
- `docs/public/images/screenshot-subnet-calculator.png` — replaced

**Verification:**
- All 13 referenced screenshots match current UI
- No broken image paths
- No console errors
- EN and DE content structurally identical

### Phase 24: Secure VLAN Port Assignment — Design (2026-04-20)

**Design/Planning phase — no code changes yet.**

Goal: Safer VLAN assignment to switch ports with explicit switch-VLAN configuration.

**Key design decisions:**
- New `configured_vlans: number[]` field on Switch type
- Grouped VLAN selector: "Configured on this switch" (selectable) + "Other site VLANs" (disabled by default)
- Override toggle "Add VLAN to switch" enables selecting unconfigured VLANs
- One-time Nitro server plugin for data migration (no lazy read side-effects)
- Atomic operations: switch config + port assignment in single write
- VLAN removal with port cleanup: full UI flow with per-port decisions for access_vlan/native_vlan
- Consistent HTTP error semantics (422/404/409)
- Direct switch-VLAN management API route

**Spec document:** `docs/superpowers/specs/2026-04-20-vlan-port-assignment-design.md`

**Status:** Spec v6 final (all reviews resolved), awaiting implementation.

**v6 additions (follow-up review 2026-04-22, pass 2):**
- Bulk-Port-Update: explicit `expected_updated_at` in schema, check once at start, all-or-nothing semantics
- Remove/remove_confirmed limited to single VLAN-ID for v1 (multi-VLAN as follow-up)
- Replacement VLAN validated against post-remove state of configured_vlans
- Activity action types (`add_configured_vlans`, `remove_configured_vlans`) + frontend formatting in implementation plan
- Bulk atomicity: all ports validated before any write, no partial updates

**v5 additions (follow-up review 2026-04-22):**
- All-or-nothing batch semantics for add/remove vlan_ids arrays
- Completeness invariant for remove_confirmed: port_cleanup must exactly match requires_decision
- 2-step remove bound to concurrency: 409 analysis returns current_updated_at, confirm sends expected_updated_at
- Migration normalizes existing but invalid configured_vlans arrays (duplicates, out-of-range, unsorted)

**v4 additions (review findings):**
- Optimistic concurrency sharpened: LAG-sync excluded, response returns `updated_at` for follow-up requests
- `configured_vlans` removed from generic switch schemas, only via dedicated routes/internal default
- 404/409 made consistent (deleted VLAN = 404 everywhere)
- Dedicated repository method `applyPortVlanUpdate(...)` instead of generic update
- `configured_vlans` invariant: deduplicated, sorted, valid IDs after every write
- Activity logging defined for all configured-vlans operations

**v3 additions:**
- Optimistic concurrency via `expected_updated_at` for clean 404/409 distinction
- Idempotent start migration with logging
- Explicit null-behavior rules for access_vlan/native_vlan
- LAG-Sync consciously deferred to follow-up feature

---

## History

### Phase 0 — Documentation & Planning (2026-03-16)
- Created all SPEC documents
- Updated CLAUDE.md, STRATEGY.md, ARCHITECTURE.md
