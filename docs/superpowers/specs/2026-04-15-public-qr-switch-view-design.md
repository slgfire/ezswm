# Design: Public QR Switch View

Generate a QR code per switch that links to a public, read-only mobile view of that switch's port allocation — no login required.

## Context

ezSWM is deployed at `ezswm.saar-lan.de` (publicly reachable). QR stickers are placed on physical switches so anyone can scan and see the port layout. The public view must be completely isolated from the admin UI — no navigation, no search, no edit actions.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Token storage | Klartext in `publicTokens.json` | Internal tool; file access = full data access anyway. Allows re-displaying QR anytime without regeneration. |
| Tokens per switch | One active token | Stable QR stickers — no rotation needed. Revoke + regenerate if compromised. |
| Visible fields (public) | Fixed: name, model, location, port data | No per-token configuration. Management IP, serial, firmware, notes are never shown. |
| URL structure | `/p/:token` | Short path = compact QR code. 32-char nanoid token. |
| Token format | 32-char nanoid (A-Za-z0-9_-) | ~190 bit entropy. Brute-force infeasible. |
| Token file | Separate `publicTokens.json` | Consistent with `lagGroups.json` pattern. Keeps Switch entity clean. |
| QR output | SVG + PNG download + print dialog | Download for label printer software, print dialog for quick printing. |
| Rate limiting | None in app | Traefik handles this at the reverse proxy level. |
| `description` field | Public | Free-text but typically contains "Uplink to X" or "Patch Bay Row 3" — useful for someone standing at the switch. |
| `connected_device` field | Public | Shows what's plugged in — the primary purpose of scanning the QR code. |
| Public page rendering | Client-only fetch with spinner | No SSR needed — the page is scanned on a phone, a brief spinner is acceptable. Avoids SSR complexity with QR/auth. |
| QR URL base | `window.location.origin` at generation time | Works across dev, staging, and production without config. Admin generates QR from the domain they're using. If admins access via internal hostname but stickers need the public URL, they should navigate to the public domain first. |

## Data Model

### New entity: PublicToken

Stored in `/app/data/publicTokens.json` as a JSON array.

```typescript
interface PublicToken {
  id: string                // nanoid, 21 chars
  switch_id: string         // reference to Switch.id
  token: string             // nanoid, 32 chars, URL-safe
  created_at: string        // ISO 8601 UTC
  revoked_at: string | null // ISO 8601 UTC, null if active
  last_access_at: string | null // ISO 8601 UTC, updated on each public view
}
```

**Constraints:**
- One active (non-revoked) token per switch
- Creating a token for a switch that already has an active token returns an error
- Revoking sets `revoked_at`; after revoking, a new token can be created
- Deleting a switch cascades: removes all associated tokens

**Type barrel:** Export from `types/index.ts`.

## Backend

### New repository: `server/repositories/publicTokenRepository.ts`

Methods:
- `getByToken(token: string): PublicToken | null` — lookup by token string, returns null if not found or revoked
- `getBySwitchId(switchId: string): PublicToken | null` — find active (non-revoked) token for a switch
- `getLatestBySwitchId(switchId: string): PublicToken | null` — find the most recent token (including revoked) for admin UI state
- `create(switchId: string): PublicToken` — generate 32-char token, enforce one-per-switch
- `revoke(id: string): PublicToken` — set `revoked_at` to now
- `updateLastAccess(id: string): void` — set `last_access_at` to now
- `deleteBySwitchId(switchId: string): void` — cascade cleanup

### New public API route: `server/api/p/[token].get.ts`

- **No auth required** — see Middleware section below for exact bypass mechanism
- Looks up token → validates not revoked → loads switch with ports → loads VLANs (site-scoped) → loads layout template
- Returns sanitized DTO (see below)
- Updates `last_access_at`
- Returns 404 for invalid or revoked tokens (no distinction)
- Response headers: `X-Robots-Tag: noindex`, `Cache-Control: no-store`

**VLAN resolution:** The public route must load VLANs scoped to the switch's site. Since `vlanRepository.list()` currently takes no arguments and returns all VLANs, the route handler filters the result: `vlanRepository.list().filter(v => v.site_id === switch.site_id)`. This ensures correct name/color mapping when VLAN IDs overlap across sites.

### Public API Response

The public API returns a **component-compatible** shape that can be passed directly into `SwitchPortGrid` and `SwitchPortItem` without client-side transformation. This avoids a normalization layer and ensures visual fidelity with the admin view.

```typescript
interface PublicSwitchResponse {
  name: string
  model: string | null
  location: string | null
  site_name: string | null
  updated_at: string

  // Component-compatible data:
  ports: PublicPort[]        // same shape as Port, minus sensitive fields
  vlans: PublicVlan[]        // site-scoped VLANs used by this switch's ports
  units: PublicLayoutUnit[]         // layout units for grid rendering (empty array if no template)
}
```

**PublicPort** — matches `Port` type shape so `SwitchPortItem` can consume it directly:

```typescript
interface PublicPort {
  id: string                 // synthetic: "p-{ordinal}" where ordinal is the port's array index (0, 1, 2...)
  unit: number
  index: number
  label?: string
  type: PortType             // rj45, sfp, sfp+, qsfp, console, management
  speed?: PortSpeed
  status: PortStatus
  port_mode?: PortMode
  access_vlan?: number       // VLAN ID number — same as Port type
  native_vlan?: number       // VLAN ID number — same as Port type
  tagged_vlans: number[]     // VLAN ID numbers — same as Port type
  connected_device?: string
  description?: string
  poe?: PoeConfig | null
}
```

The `id` field uses a synthetic `"p-{ordinal}"` value (where ordinal is the port's array index: 0, 1, 2...) so the components can key by `port.id` as they do today. Array index is guaranteed unique regardless of template validation rules. The public view never needs to reference a port by its real ID.

**Stripped from PublicPort** (vs full `Port`): `connected_device_id`, `connected_port_id`, `connected_port`, `mac_address`, `lag_group_id`, `connected_allocation_id`. The real `id` (nanoid) is replaced with a synthetic key.

**PublicVlan** — matches `VLAN` type shape for `vlans` prop:

```typescript
interface PublicVlan {
  vlan_id: number
  name: string
  color: string
}
```

Only the fields needed for `SwitchPortItem`'s `getVlanColor()` and `getVlanName()` lookups. The API response filters to only VLANs actually referenced by this switch's ports (across `access_vlan`, `native_vlan`, and `tagged_vlans` fields), not all site VLANs.

**Component type compatibility:** `SwitchPortGrid` and `SwitchPortItem` currently type their `vlans` prop as `VLAN[]`, which includes required fields like `id`, `site_id`, `status`, etc. that the public response does not provide. To make the public response directly passable without transformation, the component props must be widened to a minimal interface:

```typescript
// Shared interface for VLAN display data (used by port grid/item components)
interface VlanDisplayInfo {
  vlan_id: number
  name: string
  color: string
}
```

Change `SwitchPortGrid` and `SwitchPortItem` props from `vlans?: VLAN[]` to `vlans?: VlanDisplayInfo[]`. This is a non-breaking change since `VLAN` already satisfies `VlanDisplayInfo` (structural subtyping). The full `VLAN` type in the admin context will still work. Define `VlanDisplayInfo` in `types/vlan.ts` alongside the existing `VLAN` interface.

**PublicLayoutUnit** — includes `row_layout` and synthetic block IDs:

```typescript
interface PublicLayoutUnit {
  unit_number: number
  label?: string
  blocks: PublicLayoutBlock[]
}

interface PublicLayoutBlock {
  id: string                 // synthetic: "blk-{unit_number}-{blockIndex}" where blockIndex is array position
  type: PortType              // reuse existing union: 'rj45' | 'sfp' | 'sfp+' | 'qsfp' | 'console' | 'management'
  count: number
  start_index: number
  rows: number
  row_layout?: RowLayout     // sequential, odd-even, even-odd — needed for grid rendering
  label?: string
}
```

The `id` field uses a synthetic value so the grid can key blocks by `block.id`. For guaranteed uniqueness, the API uses the block's ordinal index within the unit as fallback: `"blk-{unit_number}-{blockIndex}"` where `blockIndex` is the array position (0, 1, 2...). This is always unique regardless of block field combinations. `row_layout` is included because `SwitchPortGrid.getRowsForBlock()` uses it to determine port ordering.

**Stripped from public output:** switch management_ip, serial_number, firmware_version, notes, all real internal IDs (switch id, port nanoid IDs, VLAN entity IDs, layout block real IDs, connected_device_id, connected_port_id, connected_allocation_id, lag_group_id, mac_address).

**Site name resolution:** The public route loads the site record via `siteRepository.getById(switch.site_id)` to populate `site_name`.

### New admin API routes: `server/api/switches/[id]/public-token/`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/switches/:id/public-token` | Create token for switch |
| GET | `/api/switches/:id/public-token` | Get latest token including revoked (for admin UI state) |
| DELETE | `/api/switches/:id/public-token` | Revoke active token |

All three require auth (standard JWT middleware).

The GET endpoint returns the latest token (active or revoked) so the admin UI can distinguish "never had a token" (404) from "had one, it was revoked" (token object with `revoked_at` set). This enables the persistent "Token revoked — Generate New Link" state.

### Middleware changes

**Server middleware (`server/middleware/auth.ts`):**

The current middleware uses exact path matching: `PUBLIC_PATHS.some(p => path === p)`. The public API route `/api/p/:token` has a dynamic segment, so exact matching won't work. Add a **prefix check** before the exact match:

```typescript
// Early return for public API prefixes (dynamic routes)
if (path.startsWith('/api/p/')) return

// Existing exact-match logic unchanged
if (PUBLIC_PATHS.some(p => path === p)) return
```

**Client middleware (`app/middleware/auth.global.ts`):**

The current middleware has no exclusion list — it checks auth state on every route. Add an early return at the top of the handler:

```typescript
// Public routes — no auth required
if (to.path.startsWith('/p/')) return
```

This must be the first check, before `checkSetup()` or `fetchUser()`, to avoid unnecessary API calls on public pages.

### Cascade on switch delete

`server/api/switches/[id].delete.ts`: Call `publicTokenRepository.deleteBySwitchId(id)`.

### Storage initialization

`server/plugins/initData.ts`: Initialize `publicTokens.json` with `[]`.

### Backup/Restore integration

**Export (`server/api/backup/export.get.ts`):**
Add `publicTokens: readJson('publicTokens.json')` to the backup `data` object.

**Import (`server/api/backup/import.post.ts`):**
- Do NOT add `publicTokens` to `requiredKeys` — older backups won't have it. Instead, use `body.data.publicTokens ?? []` as fallback when restoring
- Add `publicTokens: 'publicTokens.json'` to the `fileMap`
- Add `publicTokens: readJson('publicTokens.json')` to the pre-restore backup

This ensures QR tokens survive backup/restore cycles. Since stickers are physically attached to switches, losing tokens means reprinting all stickers.

## Frontend — Admin UI

### Switch detail page section: "Public QR Access"

New component `SwitchPublicAccess.vue`, added to the switch detail page as a collapsible section.

**States:**

1. **No token (404 from GET):** Single button "Generate Public Link"
2. **Active token (token with `revoked_at === null`):**
   - QR code preview (SVG, rendered client-side via `qrcode` package)
   - Full public URL displayed (copyable)
   - Buttons: Copy Link, Download SVG, Download PNG, Print Sticker, Revoke Token
   - Metadata: created at, last accessed at
3. **Revoked token (token with `revoked_at !== null`):** "Token revoked on {date}" message + "Generate New Link" button

### QR code generation

Client-side using the `qrcode` npm package (already in `package.json`).
- SVG for inline display and SVG download
- PNG via canvas for PNG download
- Content: `${window.location.origin}/p/{token}` — adapts to the current domain automatically

### Print sticker dialog

Button "Print Sticker" opens a new browser window with a print-optimized page:
- QR code (large)
- Switch name
- Location (if set)
- `@media print` CSS, ~62x29mm label format
- Auto-triggers `window.print()`

### New composable: `app/composables/usePublicToken.ts`

```typescript
function usePublicToken(switchId: string) {
  const token: Ref<PublicToken | null>
  const loading: Ref<boolean>

  async function fetchToken(): Promise<void>   // GET, sets token or null
  async function createToken(): Promise<void>  // POST, sets token
  async function revokeToken(): Promise<void>  // DELETE, refreshes token state
}
```

## Frontend — Public View

### Layout: `app/layouts/public.vue`

Minimal layout — no sidebar, no header, no footer, no auth guard.
- Dark background (#0a0a0a)
- Centered content container, max-width 480px
- `<meta name="robots" content="noindex">`
- No links to admin UI

### Page: `app/pages/p/[token].vue`

- Uses `definePageMeta({ layout: 'public' })`
- Fetches `/api/p/:token` via `useFetch('/api/p/' + token, { server: false })` — `server: false` prevents SSR fetch, ensures client-only rendering with spinner
- **Loading state:** Spinner
- **Error state (404):** "This link is no longer valid" — no details, no hints, no retry
- **Success state:**
  1. Switch header: name, model, location
  2. Port grid: reuses `SwitchPortGrid` + `SwitchPortItem` with `publicMode` prop
  3. VLAN legend (compact, inline)
  4. Port list (`PublicPortList.vue`) with filter tabs
  5. Footer: "Powered by ezSWM" + last updated timestamp

### Component changes

`SwitchPortGrid.vue` and `SwitchPortItem.vue`:
- Add `publicMode` prop (boolean, default false)
- When `publicMode` is true:
  - No click handlers, no `@click` emit, `onPortClick` is a no-op
  - No selection state (`selectedPorts` passed as empty array)
  - Hide multi-select legend hint (`{{ $t('switches.ports.multiSelectHint') }}` section)
  - Hide LAG legend section entirely (no LAG data passed in public mode)
  - `cursor-default` instead of `cursor-pointer` on port items
  - Read-only hover tooltip: keep VLAN info tooltip visible, hide LAG section
  - No edit-lag / delete-lag emits
- No key changes needed: the public API returns `port.id` as synthetic `"p-{ordinal}"`, and `block.id` as synthetic `"blk-{unit_number}-{blockIndex}"` — the components key by `.id` as they already do
- `row_layout` is included in the public response, so `getRowsForBlock()` works correctly
- **Legend in publicMode:** The grid's built-in legend (status, port types, indicators, multi-select hint) is hidden entirely when `publicMode` is true. Instead, the public page (`app/pages/p/[token].vue`) renders its own compact inline VLAN legend between the grid and the port list — just colored dots with VLAN ID + name, no status/type/indicator rows. This avoids modifying the grid's complex legend logic. The VLAN list for the legend comes from the `vlans` array in the API response (already filtered to site-scoped VLANs used by this switch's ports, including `access_vlan`, `native_vlan`, and `tagged_vlans`)

### New component: `app/components/public/PublicPortList.vue`

Card-based scrollable port list:
- Each occupied port: card with VLAN color left border, label, status badge, VLAN info, connected device, speed
- Empty ports: dimmed cards (50% opacity), minimal info
- Filter tabs: All / Occupied / Unused (local state, no URL params)
  - **Occupied** = port has `status === 'up'` OR `connected_device` is set OR any VLAN is assigned (`access_vlan`, `native_vlan`, or `tagged_vlans.length > 0`)
  - **Unused** = everything else (status down/disabled, no connection, no VLAN)
- Filter within this switch only — no global search

## i18n

New keys under `public` namespace in both `en.json` and `de.json`:
- Public view: page title, error message, filter labels, footer, status badges
- Admin section: "Public QR Access" heading, all button labels, confirmation dialogs, success/error toasts

## Security

| Measure | Implementation |
|---------|---------------|
| Token entropy | 32-char nanoid (~190 bit), brute-force infeasible |
| No enumeration | 404 for invalid AND revoked tokens (no distinction) |
| Data minimization | Public response strips IPs, serials, firmware, notes; real internal IDs (nanoids) replaced with synthetic rendering keys |
| Free-text fields | `description` and `connected_device` are intentionally public — they contain port-level info useful at the physical switch |
| No admin links | Public view has zero links/routes to admin UI |
| Search engine exclusion | `X-Robots-Tag: noindex` header + `<meta>` tag |
| Cache prevention | `Cache-Control: no-store` on public API response — ensures revocation is immediate |
| Revocation | Immediate — revoked tokens return 404, no cached stale content |
| Access tracking | `last_access_at` updated on each view |
| Rate limiting | Handled by Traefik (not in application) |

## Testing

### Unit tests (`tests/public-token.test.ts`)

- Token creation returns 32-char token
- One token per switch enforced (second create returns error)
- Token lookup by token string
- Revoked token returns null from `getByToken()`
- `getLatestBySwitchId()` returns revoked token (for admin UI)
- Switch delete cascades to token deletion

### E2E tests (`tests/e2e/public-switch-view.spec.ts`)

- Public API route `GET /api/p/:validtoken` returns 200 with sanitized response
- Public API route `GET /api/p/:revokedtoken` returns 404
- Public API route `GET /api/p/:invalidtoken` returns 404
- Public page `/p/:token` renders without redirect to login (auth bypass works)
- Public page renders port grid and port list
- Server auth middleware does NOT block `/api/p/:token`

## Files

| Action | Path |
|--------|------|
| Create | `types/publicToken.ts` |
| Create | `server/repositories/publicTokenRepository.ts` |
| Create | `server/validators/publicTokenSchemas.ts` |
| Create | `server/api/p/[token].get.ts` |
| Create | `server/api/switches/[id]/public-token/index.post.ts` |
| Create | `server/api/switches/[id]/public-token/index.get.ts` |
| Create | `server/api/switches/[id]/public-token/index.delete.ts` |
| Create | `app/composables/usePublicToken.ts` |
| Create | `app/layouts/public.vue` |
| Create | `app/pages/p/[token].vue` |
| Create | `app/components/public/PublicPortList.vue` |
| Create | `app/components/switch/SwitchPublicAccess.vue` |
| Create | `tests/public-token.test.ts` |
| Create | `tests/e2e/public-switch-view.spec.ts` |
| Modify | `types/index.ts` — export PublicToken, VlanDisplayInfo |
| Modify | `types/vlan.ts` — add VlanDisplayInfo interface |
| Modify | `server/middleware/auth.ts` — prefix check for `/api/p/` |
| Modify | `app/middleware/auth.global.ts` — early return for `/p/` |
| Modify | `server/plugins/initData.ts` — initialize `publicTokens.json` |
| Modify | `server/api/switches/[id].delete.ts` — cascade token delete |
| Modify | `server/api/backup/export.get.ts` — include publicTokens |
| Modify | `server/api/backup/import.post.ts` — restore publicTokens |
| Modify | `app/components/switch/SwitchPortGrid.vue` — add `publicMode` prop |
| Modify | `app/components/switch/SwitchPortItem.vue` — add `publicMode` prop |
| Modify | `app/pages/sites/[siteId]/switches/[id].vue` — add QR section |
| Modify | `i18n/locales/en.json` — public.* keys |
| Modify | `i18n/locales/de.json` — public.* keys |
| Modify | `.ai/MIGRATION_STATUS.md` |

## Risks

1. **`qrcode` package SSR compatibility:** The package is installed but never used. It may not work in SSR context — QR generation must be client-only (`<ClientOnly>` wrapper or `onMounted`).
2. **Global auth guard:** Both server and client middleware must be updated with the exact bypass patterns described above. Missing either one breaks the public view.
