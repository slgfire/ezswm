# LAG Groups UI — Design Specification

## Overview

Complete the LAG Groups feature by adding UI for creating, editing, and visualizing Link Aggregation Groups on the switch detail page. The backend (repository, API routes, validators, composable) already exists — this spec covers the missing UI layer and backend fixes.

## Current State

**Implemented:**
- `types/lagGroup.ts` — LAGGroup interface
- `server/repositories/lagGroupRepository.ts` — Full CRUD with port sync
- `server/api/switches/[id]/lag-groups/` — 5 API endpoints (GET list, GET single, POST, PUT, DELETE)
- `server/validators/lagGroupSchemas.ts` — Zod schemas
- `app/composables/useLagGroups.ts` — Stub composable (untyped)
- `SwitchPortItem.vue` — Existing LAG bottom-stripe indicator (to be replaced)

**Missing:**
- No UI to create/edit/delete LAG groups
- No LAG indicator that is clearly visible (current 3px stripe too subtle)
- No LAG details on hover
- No LAG field in port side panel
- No LAG cleanup on switch deletion
- No activity logging for LAG operations

## Design Decisions

### 1. Port Visualization — LAG Indicator

**Pattern:** Broad diagonal stripes (-45°) as CSS `background-image` overlay across the entire port area.

```css
background-image: repeating-linear-gradient(
  -45deg,
  transparent,
  transparent 5px,
  rgba(148,163,184,0.18) 5px,
  rgba(148,163,184,0.18) 7px
);
```

- Uniform slate-gray color for all LAGs (no per-LAG colors)
- Pattern sits behind port number (number remains fully readable)
- Works on all port types: RJ45, SFP, SFP+, QSFP, Console, Management
- No conflict with existing indicators:
  - Left border: port type color (SFP=sky, QSFP=violet, etc.)
  - Top-right: VLAN dot (Access=square, Trunk=circle+ring)
  - Background: port status (green=up, gray=down, red=disabled)
  - The diagonal stripe pattern overlays the status background at low opacity

**Hover Tooltip:** When hovering over a LAG port, show a tooltip with:
- LAG name
- Member port labels
- Remote device (if set)

Same tooltip pattern as VLAN hover tooltips already used on ports.

### 2. Port Visualization — Access vs Trunk Fix

**Current problem:** Access ports use `rounded-sm` (2px radius) and Trunk ports use `rounded-full` on a 10px dot — nearly indistinguishable.

**Fix:**
- Access: sharp square (`border-radius: 0`)
- Trunk: circle with outer ring (`border-radius: 50%` + `box-shadow: 0 0 0 2px bg, 0 0 0 3px color`)

### 3. LAG Creation Flow

**Workflow:** Port-centric, via multi-select in the port grid.

1. User Ctrl+clicks ports in the grid to multi-select (existing functionality)
2. Bulk action bar appears (already exists for bulk edit)
3. New "Create LAG" button added to bulk action bar (shown when 2+ ports selected)
4. Clicking "Create LAG" opens a USlideover with:
   - Name (required, text input)
   - Description (optional, textarea)
   - Ports (pre-filled from selection, displayed as badges, removable)
   - Remote Device (optional, dropdown of other switches + freetext)
5. On submit: POST to `/api/switches/{id}/lag-groups`, refresh port grid

**UI Validation (before submit):**
- Disable "Create LAG" button and show tooltip reason when:
  - Fewer than 2 ports selected
  - Any selected port is already in another LAG — show which LAG
- These checks happen client-side for immediate feedback; backend validates ownership as additional safety net

**Form behavior:**
- Port changes (add/remove badges) are local state only
- All changes applied on submit, not immediately
- On submit: send final `port_ids` array to API

### 4. LAG Management — Legend

Below the port grid legend, add a LAG section showing all LAGs for this switch.

**Layout:**
- Flex-wrap row of LAG chips
- Each chip shows: diagonal-stripe icon, name, port count, remote device (if set)
- Click chip → opens edit slideover
- Each chip has a small delete button (x icon)

**Collapsing for many LAGs:**
- ≤3 LAGs: show all inline
- \>3 LAGs: show first 3, then a "Show all (N)" toggle button to expand
- Collapsed state persists per session (not saved)

**Hover-Highlight (key UX feature):**
- Hovering a LAG chip in the legend highlights its member ports in the grid
- Non-member ports dim to `opacity: 0.3`
- Provides instant visual feedback about which ports belong to which LAG
- Same highlight applied when hovering a LAG port's tooltip
- **Edge case — Selection vs Hover:** If ports are currently selected (multi-select active), hover-highlight is disabled. Selection always takes visual priority over hover to avoid visual chaos.

**Delete UX:**
- Confirmation dialog shows LAG name AND lists all member port labels that will be released
- Example: "Delete LAG 'LAG1'? Ports Gi1/0/1, Gi1/0/2, Gi1/0/3, Gi1/0/4 will be released."

### 5. LAG in Port Side Panel

When viewing a single port in the SwitchPortSidePanel:
- Show "LAG Group" field (read-only display if member, or "None")
- If port is in a LAG: show LAG name as a badge, with "Remove from LAG" action button
- "Remove from LAG" is a direct API call (PUT to update LAG's port_ids) + toast notification — no additional confirmation needed since it's a non-destructive, easily reversible action
- No LAG assignment dropdown in port editor (LAGs are managed via multi-select + create, not per-port assignment)

### 6. Composable Improvements

Upgrade `useLagGroups.ts`:
- Add proper TypeScript typing (`LAGGroup[]` instead of `any[]`)
- Import LAGGroup type from `~~/types/lagGroup`
- Add precomputed lookup maps as computed properties:
  - `lagById: ComputedRef<Map<string, LAGGroup>>` — O(1) lookup by LAG ID
  - `lagByPortId: ComputedRef<Map<string, LAGGroup>>` — O(1) lookup by port ID (for hover tooltips, port side panel)
- These maps prevent O(n) filtering on every hover/render

### 7. Backend Fixes

**Switch deletion cleanup:**
- In `server/api/switches/[id].delete.ts`: call `lagGroupRepository.deleteBySwitchId(id)` before deleting the switch

**Activity logging:**
- Add `activityRepository.log()` calls to all LAG API routes (create, update, delete)
- Action types: `create`, `update`, `delete` with entity_type `lag_group`
- Use a new `metadata` field on ActivityEntry (not `previous_state`) for semantic correctness
- Add `metadata?: Record<string, unknown>` to the ActivityEntry type

Activity log metadata per action:
```
create:  { metadata: { ports: ['Gi1/0/1', 'Gi1/0/2'], port_count: 2 } }
update:  { metadata: { added_ports: ['Gi1/0/3'], removed_ports: ['Gi1/0/1'] } }
delete:  { metadata: { ports: ['Gi1/0/1', 'Gi1/0/2'], port_count: 2 } }
```

### 8. i18n

Add translation keys for LAG-related UI text in both `en.json` and `de.json`:
- Labels: LAG Group, Name, Description, Remote Device, Ports
- Actions: Create LAG, Edit LAG, Delete LAG, Remove from LAG
- Pluralization: `{n} port | {n} ports`
- Toasts: LAG created, LAG updated, LAG deleted, Port removed from LAG
- Validation: "Port already in LAG '{name}'", "Select at least 2 ports"
- Delete dialog: "Delete LAG '{name}'?", "The following ports will be released:"
- Legend: "Show all ({n})", LAG section label

### 9. Global Search

Add LAG groups to the search API results with proper structure:
- `type: 'lag_group'`
- `title: lagName`
- `subtitle: 'Switch {switchName} · {n} ports'`
- `url: /sites/{siteId}/switches/{switchId}?lag={lagId}` (deep-links to switch with LAG highlighted/slideover open)

## Files to Modify

**Frontend — Components:**
- `app/components/switch/SwitchPortItem.vue` — Replace bottom-stripe with diagonal pattern, add hover tooltip, fix access/trunk dot
- `app/components/switch/SwitchPortGrid.vue` — Add LAG legend section with collapse/expand and hover-highlight, pass LAG data
- `app/components/switch/SwitchPortSidePanel.vue` — Add LAG group display field with remove action

**Frontend — New Components:**
- `app/components/switch/LagGroupSlideover.vue` — Create/edit LAG form with port badges and validation (dynamic title: "Create LAG" / "Edit LAG", dynamic button: "Create" / "Save")

**Frontend — Pages:**
- `app/pages/sites/[siteId]/switches/[id].vue` — Fetch LAGs, pass to grid, add "Create LAG" to bulk actions with validation

**Frontend — Composables:**
- `app/composables/useLagGroups.ts` — Add types, lagById, lagByPortId computed maps

**Backend — Types:**
- `types/activity.ts` — Add `metadata?: Record<string, unknown>` to ActivityEntry

**Backend — API:**
- `server/api/switches/[id].delete.ts` — Add LAG cleanup
- `server/api/switches/[id]/lag-groups/index.post.ts` — Add activity logging with metadata
- `server/api/switches/[id]/lag-groups/[id].put.ts` — Add activity logging with metadata (added/removed ports)
- `server/api/switches/[id]/lag-groups/[id].delete.ts` — Add activity logging with metadata
- `server/api/search.get.ts` — Add LAG groups to search results

**i18n:**
- `i18n/locales/en.json` — LAG translation keys with pluralization
- `i18n/locales/de.json` — LAG translation keys with pluralization

## Out of Scope

- LAG topology visualization (topology page not yet built)
- LAG import/export (can be added later)
- Per-LAG color coding (decided: uniform pattern, details via hover)
- Port type incompatibility validation (mixed SFP+RJ45 LAGs are valid in practice)
