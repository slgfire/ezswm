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
   - Ports (pre-filled from selection, displayed as badges, editable)
   - Remote Device (optional, dropdown of other switches + freetext)
5. On submit: POST to `/api/switches/{id}/lag-groups`, refresh port grid

### 4. LAG Management — Legend

Below the port grid legend, add a LAG section showing all LAGs for this switch:

```
LAG: [stripe-icon] LAG1 — Uplink  4p → sw-core  [edit] [delete]
     [stripe-icon] LAG2 — Server  4p → srv-db01  [edit] [delete]
```

- Each LAG entry shows: stripe icon, name, description, port count, remote device
- Click on LAG name/edit: opens edit slideover (same form as create, pre-filled)
- Click delete: confirmation dialog, then DELETE API call
- LAG entries are clickable chips in a flex row, consistent with existing legend styling

### 5. LAG in Port Side Panel

When viewing a single port in the SwitchPortSidePanel:
- Show "LAG Group" field (read-only display if member, or "None")
- If port is in a LAG: show LAG name as a link/badge, with "Remove from LAG" action
- No LAG assignment dropdown in port editor (LAGs are managed via multi-select + create, not per-port assignment)

### 6. Composable Improvements

Upgrade `useLagGroups.ts`:
- Add proper TypeScript typing (`LAGGroup[]` instead of `any[]`)
- Import LAGGroup type from `~~/types/lagGroup`

### 7. Backend Fixes

**Switch deletion cleanup:**
- In `server/api/switches/[id].delete.ts`: call `lagGroupRepository.deleteBySwitchId(id)` before deleting the switch

**Activity logging:**
- Add `activityRepository.log()` calls to all LAG API routes (create, update, delete)
- Action types: `create`, `update`, `delete` with entity_type `lag_group`

### 8. i18n

Add translation keys for LAG-related UI text in both `en.json` and `de.json`:
- LAG group labels, button text, form labels, tooltips, confirmation dialogs, toast messages, legend entries

### 9. Global Search

Add LAG groups to the search API so they appear in global search results.

## Files to Modify

**Frontend — Components:**
- `app/components/switch/SwitchPortItem.vue` — Replace bottom-stripe with diagonal pattern, add hover tooltip, fix access/trunk dot
- `app/components/switch/SwitchPortGrid.vue` — Add LAG legend section, pass LAG data
- `app/components/switch/SwitchPortSidePanel.vue` — Add LAG group display field

**Frontend — New Components:**
- `app/components/switch/LagGroupSlideover.vue` — Create/edit LAG form

**Frontend — Pages:**
- `app/pages/sites/[siteId]/switches/[id].vue` — Fetch LAGs, pass to grid, add "Create LAG" to bulk actions

**Frontend — Composables:**
- `app/composables/useLagGroups.ts` — Add types

**Backend — API:**
- `server/api/switches/[id].delete.ts` — Add LAG cleanup
- `server/api/switches/[id]/lag-groups/index.post.ts` — Add activity logging
- `server/api/switches/[id]/lag-groups/[id].put.ts` — Add activity logging
- `server/api/switches/[id]/lag-groups/[id].delete.ts` — Add activity logging
- `server/api/search.get.ts` — Add LAG groups to search results

**i18n:**
- `i18n/locales/en.json` — LAG translation keys
- `i18n/locales/de.json` — LAG translation keys

## Out of Scope

- LAG topology visualization (topology page not yet built)
- LAG import/export (can be added later)
- Per-LAG color coding (decided: uniform pattern, details via hover)
- Port speed/VLAN consistency validation on LAG creation (backend already validates port ownership)
