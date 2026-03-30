# LAG Groups UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the LAG Groups feature by adding UI for creating, editing, and visualizing Link Aggregation Groups, plus backend fixes for activity logging, switch delete cleanup, and global search.

**Architecture:** Backend already exists (repository, API routes, validators). This plan adds the UI layer (port visualization, create/edit slideover, legend with hover-highlight) and fixes backend gaps (activity logging with `metadata` field, switch delete cleanup, global search). All LAG management flows through the switch detail page — no separate LAG pages.

**Tech Stack:** Nuxt 3.x, Nuxt UI v2, TypeScript, Tailwind CSS, Vue 3 Composition API

**Spec:** `docs/superpowers/specs/2026-03-30-lag-groups-ui-design.md`

---

### Task 0: Backend — Rename LAG route param `[id]` → `[lagId]`

**Files:**
- Rename: `server/api/switches/[id]/lag-groups/[id].get.ts` → `server/api/switches/[id]/lag-groups/[lagId].get.ts`
- Rename: `server/api/switches/[id]/lag-groups/[id].put.ts` → `server/api/switches/[id]/lag-groups/[lagId].put.ts`
- Rename: `server/api/switches/[id]/lag-groups/[id].delete.ts` → `server/api/switches/[id]/lag-groups/[lagId].delete.ts`

**Why:** The current routes use `[id]` for both switch and LAG params (`switches/[id]/lag-groups/[id]`). Nuxt can't reliably distinguish them via `event.context.params?.id`. The codebase already solves this for other nested routes: `ports/[portId]`, `allocations/[allocId]`, `ranges/[rangeId]`.

- [ ] **Step 1: Rename files**

```bash
cd server/api/switches/[id]/lag-groups
mv '[id].get.ts' '[lagId].get.ts'
mv '[id].put.ts' '[lagId].put.ts'
mv '[id].delete.ts' '[lagId].delete.ts'
```

- [ ] **Step 2: Update param access in each file**

In all three renamed files, change `event.context.params?.id` to `event.context.params?.lagId` for the LAG ID:

`[lagId].get.ts`:
```typescript
const lagId = event.context.params?.lagId
```

`[lagId].put.ts`:
```typescript
const lagId = event.context.params?.lagId
```

`[lagId].delete.ts`:
```typescript
const lagId = event.context.params?.lagId
```

The switch ID remains accessible via `event.context.params?.id` from the parent `switches/[id]/` segment.

- [ ] **Step 3: Verify build passes**

Run: `npx nuxt build 2>&1 | tail -3`
Expected: `✨ Build complete!`

- [ ] **Step 4: Commit**

```bash
git add server/api/switches/\[id\]/lag-groups/
git commit -m "refactor(lag): rename route param [id] to [lagId] for disambiguation"
```

---

### Task 1: Backend — ActivityEntry metadata field + switch delete cleanup

**Files:**
- Modify: `types/activity.ts`
- Modify: `server/repositories/activityRepository.ts`
- Modify: `server/api/switches/[id].delete.ts`

- [ ] **Step 1: Add `metadata` field to ActivityEntry type**

In `types/activity.ts`, add `metadata` to the interface:

```typescript
export interface ActivityEntry {
  id: string
  user_id: string
  action: ActivityAction
  entity_type: string
  entity_id: string
  entity_name: string
  changes?: Record<string, unknown>
  previous_state?: Record<string, unknown>
  metadata?: Record<string, unknown>
  timestamp: string
}
```

- [ ] **Step 2: Update activityRepository.log() to accept metadata**

In `server/repositories/activityRepository.ts`, add `metadata` to the `log` method's parameter type:

```typescript
log(data: {
    user_id: string
    action: ActivityAction
    entity_type: string
    entity_id: string
    entity_name: string
    changes?: Record<string, unknown>
    previous_state?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }): ActivityEntry {
```

No other changes needed — the spread `...data` already passes it through.

- [ ] **Step 3: Add LAG cleanup to switch delete handler**

In `server/api/switches/[id].delete.ts`, import lagGroupRepository and call `deleteBySwitchId` before deleting the switch:

```typescript
import { switchRepository } from '../../repositories/switchRepository'
import { activityRepository } from '../../repositories/activityRepository'
import { lagGroupRepository } from '../../repositories/lagGroupRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing switch ID' })
  }

  const existing = await switchRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  }

  // Clean up LAG groups before deleting switch
  lagGroupRepository.deleteBySwitchId(id)

  await switchRepository.delete(id)

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'delete',
    entity_type: 'switch',
    entity_id: id,
    entity_name: existing.name,
  })

  setResponseStatus(event, 204)
  return null
})
```

- [ ] **Step 4: Verify build passes**

Run: `npx nuxt build 2>&1 | tail -3`
Expected: `✨ Build complete!`

- [ ] **Step 5: Commit**

```bash
git add types/activity.ts server/repositories/activityRepository.ts server/api/switches/[id].delete.ts
git commit -m "feat(lag): add metadata field to ActivityEntry, cleanup LAGs on switch delete"
```

---

### Task 2: Backend — Activity logging for LAG API routes

**Files:**
- Modify: `server/api/switches/[id]/lag-groups/index.post.ts`
- Modify: `server/api/switches/[id]/lag-groups/[lagId].put.ts`
- Modify: `server/api/switches/[id]/lag-groups/[lagId].delete.ts`

- [ ] **Step 1: Add activity logging to LAG create**

Replace `server/api/switches/[id]/lag-groups/index.post.ts`:

```typescript
import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { switchRepository } from '../../../../repositories/switchRepository'
import { activityRepository } from '../../../../repositories/activityRepository'
import { createLagGroupSchema } from '../../../../validators/lagGroupSchemas'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) throw createError({ statusCode: 400, message: 'Switch ID required' })

  const body = await readBody(event)
  const validated = createLagGroupSchema.parse(body)

  const group = lagGroupRepository.create(switchId, validated)

  // Resolve port labels for activity log metadata
  const sw = switchRepository.getById(switchId)
  const portLabels = group.port_ids
    .map(pid => sw?.ports.find(p => p.id === pid)?.label || pid)
    .slice(0, 10)

  activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'create',
    entity_type: 'lag_group',
    entity_id: group.id,
    entity_name: group.name,
    metadata: {
      ports: portLabels,
      port_count: group.port_ids.length,
    },
  })

  setResponseStatus(event, 201)
  return group
})
```

- [ ] **Step 2: Add activity logging to LAG update with port diff**

Replace `server/api/switches/[id]/lag-groups/[lagId].put.ts`:

```typescript
import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { switchRepository } from '../../../../repositories/switchRepository'
import { activityRepository } from '../../../../repositories/activityRepository'
import { updateLagGroupSchema } from '../../../../validators/lagGroupSchemas'
import type { LAGGroup } from '../../../../../types/lagGroup'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) throw createError({ statusCode: 400, message: 'Switch ID required' })

  const lagId = event.context.params?.lagId
  if (!lagId) throw createError({ statusCode: 400, message: 'LAG group ID required' })

  const body = await readBody(event)
  const validated = updateLagGroupSchema.parse(body)

  // Get current state before update for diff
  const before = lagGroupRepository.getById(lagId)
  if (!before) throw createError({ statusCode: 404, message: 'LAG group not found' })

  const updated = lagGroupRepository.update(lagId, validated as Partial<Omit<LAGGroup, 'id' | 'switch_id' | 'created_at'>>)

  // Compute port diff for metadata (server-side, don't trust client)
  const sw = switchRepository.getById(switchId)
  const resolveLabel = (pid: string) => sw?.ports.find(p => p.id === pid)?.label || pid

  const metadata: Record<string, unknown> = {}
  if (validated.port_ids) {
    const added = validated.port_ids.filter(p => !before.port_ids.includes(p))
    const removed = before.port_ids.filter(p => !validated.port_ids!.includes(p))
    if (added.length) metadata.added_ports = added.map(resolveLabel)
    if (removed.length) metadata.removed_ports = removed.map(resolveLabel)
  }

  activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'update',
    entity_type: 'lag_group',
    entity_id: updated.id,
    entity_name: updated.name,
    metadata,
  })

  return updated
})
```

- [ ] **Step 3: Add activity logging to LAG delete**

Replace `server/api/switches/[id]/lag-groups/[lagId].delete.ts`:

```typescript
import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { switchRepository } from '../../../../repositories/switchRepository'
import { activityRepository } from '../../../../repositories/activityRepository'

export default defineEventHandler((event) => {
  const switchId = event.context.params?.id
  if (!switchId) throw createError({ statusCode: 400, message: 'Switch ID required' })

  const lagId = event.context.params?.lagId
  if (!lagId) throw createError({ statusCode: 400, message: 'LAG group ID required' })

  // Get before delete for logging
  const group = lagGroupRepository.getById(lagId)
  if (!group) throw createError({ statusCode: 404, message: 'LAG group not found' })

  const sw = switchRepository.getById(switchId)
  const portLabels = group.port_ids
    .map(pid => sw?.ports.find(p => p.id === pid)?.label || pid)

  const deleted = lagGroupRepository.delete(lagId)
  if (!deleted) throw createError({ statusCode: 404, message: 'LAG group not found' })

  activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'delete',
    entity_type: 'lag_group',
    entity_id: group.id,
    entity_name: group.name,
    metadata: {
      ports: portLabels,
      port_count: group.port_ids.length,
    },
  })

  setResponseStatus(event, 204)
  return null
})
```

- [ ] **Step 4: Verify build passes**

Run: `npx nuxt build 2>&1 | tail -3`
Expected: `✨ Build complete!`

- [ ] **Step 5: Commit**

```bash
git add server/api/switches/[id]/lag-groups/
git commit -m "feat(lag): add activity logging with metadata to LAG API routes"
```

---

### Task 3: Backend — Global search for LAG groups

**Files:**
- Modify: `server/api/search.get.ts`

- [ ] **Step 1: Add LAG groups to search results**

In `server/api/search.get.ts`, import `lagGroupRepository` and add LAG search:

Add import at top:
```typescript
import { lagGroupRepository } from '../repositories/lagGroupRepository'
```

Change the early return to include `lagGroups: []`:
```typescript
if (!q || q.length < 2) {
    return { switches: [], vlans: [], networks: [], allocations: [], templates: [], lagGroups: [] }
  }
```

Add LAG search before the final return (after `templates`):
```typescript
  const allLagGroups = lagGroupRepository.list()
  const lagGroups = allLagGroups
    .filter(lg => {
      // Optionally filter by site via switch lookup
      if (siteId) {
        const sw = allSwitches.find(s => s.id === lg.switch_id)
        if (!sw || sw.site_id !== siteId) return false
      }
      return (
        lg.name.toLowerCase().includes(q) ||
        lg.description?.toLowerCase().includes(q) ||
        lg.remote_device?.toLowerCase().includes(q)
      )
    })
    .slice(0, MAX_PER_TYPE)
    .map(lg => {
      const sw = allSwitches.find(s => s.id === lg.switch_id)
      return {
        id: lg.id,
        name: lg.name,
        switch_id: lg.switch_id,
        switch_name: sw?.name || '',
        site_id: sw?.site_id || '',
        port_count: lg.port_ids.length,
        remote_device: lg.remote_device,
        description: lg.description,
      }
    })
```

Update the return to include `lagGroups`:
```typescript
  return { switches, vlans, networks, allocations, templates, lagGroups }
```

- [ ] **Step 2: Update AppHeader.vue search results to display LAG groups**

In `app/components/layout/AppHeader.vue`, add LAG groups to the search results rendering. Find the existing search result sections and add a LAG section following the same pattern as switches/vlans/networks. The results should link to `/sites/${lg.site_id}/switches/${lg.switch_id}?lag=${lg.id}`.

Also update the `flatIndex` function and `flatResults` computed to include the new `lagGroups` category.

- [ ] **Step 3: Verify build passes**

Run: `npx nuxt build 2>&1 | tail -3`
Expected: `✨ Build complete!`

- [ ] **Step 4: Commit**

```bash
git add server/api/search.get.ts app/components/layout/AppHeader.vue
git commit -m "feat(lag): add LAG groups to global search with deep-link"
```

---

### Task 4: Frontend — Upgrade useLagGroups composable

**Files:**
- Modify: `app/composables/useLagGroups.ts`

- [ ] **Step 1: Rewrite composable with types and lookup maps**

Replace `app/composables/useLagGroups.ts`:

```typescript
import type { LAGGroup } from '~~/types/lagGroup'

export function useLagGroups(switchId: Ref<string> | string) {
  const items = ref<LAGGroup[]>([])
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  const resolvedId = computed(() => typeof switchId === 'string' ? switchId : switchId.value)

  async function fetch() {
    loading.value = true
    try {
      items.value = await apiFetch(`/api/switches/${resolvedId.value}/lag-groups`)
    } finally {
      loading.value = false
    }
  }

  async function create(body: { name: string; port_ids: string[]; description?: string; remote_device?: string; remote_device_id?: string }) {
    const result = await apiFetch<LAGGroup>(`/api/switches/${resolvedId.value}/lag-groups`, { method: 'POST', body })
    await fetch()
    return result
  }

  async function update(lagId: string, body: Partial<Pick<LAGGroup, 'name' | 'port_ids' | 'description' | 'remote_device' | 'remote_device_id'>>) {
    const result = await apiFetch<LAGGroup>(`/api/switches/${resolvedId.value}/lag-groups/${lagId}`, { method: 'PUT', body })
    await fetch()
    return result
  }

  async function remove(lagId: string) {
    await apiFetch(`/api/switches/${resolvedId.value}/lag-groups/${lagId}`, { method: 'DELETE' })
    await fetch()
  }

  // O(1) lookup by LAG ID
  const lagById = computed(() => {
    const map = new Map<string, LAGGroup>()
    for (const lag of items.value) map.set(lag.id, lag)
    return map
  })

  // O(1) lookup by port ID → which LAG is this port in?
  const lagByPortId = computed(() => {
    const map = new Map<string, LAGGroup>()
    for (const lag of items.value) {
      for (const portId of lag.port_ids) {
        map.set(portId, lag)
      }
    }
    return map
  })

  return { items, loading, fetch, create, update, remove, lagById, lagByPortId }
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx nuxt build 2>&1 | tail -3`
Expected: `✨ Build complete!`

- [ ] **Step 3: Commit**

```bash
git add app/composables/useLagGroups.ts
git commit -m "feat(lag): upgrade composable with types and precomputed lookup maps"
```

---

### Task 5: Frontend — Port visualization (diagonal stripes + access/trunk fix)

**Files:**
- Modify: `app/components/switch/SwitchPortItem.vue`

- [ ] **Step 1: Fix Access vs Trunk VLAN indicator**

In `SwitchPortItem.vue`, change the Access VLAN dot from `rounded-sm` to sharp square (no border-radius), and change the Trunk VLAN dot to use a circle with an outer ring.

Replace the trunk indicator (line 18-36 area):
```html
<div v-if="isTrunk" class="group/vlan absolute -top-2 -right-2 p-1">
      <div class="h-3 w-3 rounded-full ring-1 ring-white dark:ring-gray-900" :style="{ backgroundColor: vlanDotColor || '#FBBF24', boxShadow: `0 0 0 2px var(--ui-bg, #0a0a0a), 0 0 0 3px ${vlanDotColor || '#FBBF24'}` }" />
```

Replace the access indicator (line 37-38 area):
```html
<div v-else-if="vlanDotColor" class="group/vlan absolute -top-2 -right-2 p-1">
      <div class="h-2.5 w-2.5 ring-1 ring-white dark:ring-gray-900" style="border-radius: 0" :style="{ backgroundColor: vlanDotColor }" />
```

- [ ] **Step 2: Replace LAG bottom-stripe with diagonal pattern + hover tooltip**

Remove the old LAG indicator (the `v-if="port.lag_group_id"` div with `h-[3px]` bottom stripe) and the `lagColors`/`lagColor` computed.

Add a new prop for LAG data:
```typescript
const props = defineProps<{
  port: any
  vlans?: any[]
  selected: boolean
  lagGroup?: any  // LAGGroup or undefined
  dimmed?: boolean  // for hover-highlight dimming
}>()
```

Add diagonal stripe pattern as a computed style:
```typescript
const lagPatternStyle = computed(() => {
  if (!props.lagGroup) return {}
  return {
    backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 5px, rgba(148,163,184,0.18) 5px, rgba(148,163,184,0.18) 7px)`
  }
})
```

Merge `lagPatternStyle` into the existing `portStyle` computed:
```typescript
const portStyle = computed(() => {
  return { ...lagPatternStyle.value }
})
```

Add dimming filter to the root element (uses `brightness` instead of `opacity` to keep text and status colors readable):
```typescript
// In the :style binding on root div, merge with portStyle:
const portStyle = computed(() => {
  return {
    ...lagPatternStyle.value,
    ...(props.dimmed ? { filter: 'brightness(0.5)' } : {}),
  }
})
```

Add a LAG hover tooltip. This tooltip is positioned **below** the port (VLAN tooltips are top-right) to avoid overlap. Uses `z-index: 60` (VLAN tooltips use `z-index: 50`):
```html
<!-- LAG tooltip (below port, higher z-index than VLAN tooltip) -->
<div v-if="lagGroup" class="group/lag absolute inset-0 z-10">
  <div class="pointer-events-none absolute left-0 top-full z-[60] mt-1 hidden min-w-[10rem] rounded-md border border-default bg-default p-2 shadow-lg group-hover/lag:block">
    <div class="space-y-1 text-xs">
      <div class="font-semibold text-gray-700 dark:text-gray-200">{{ lagGroup.name }}</div>
      <div v-if="lagPortLabels.length" class="text-gray-400">
        {{ lagPortLabels.slice(0, 4).join(', ') }}
        <span v-if="lagPortLabels.length > 4"> +{{ lagPortLabels.length - 4 }} more</span>
      </div>
      <div v-if="lagGroup.remote_device" class="text-gray-400">→ {{ lagGroup.remote_device }}</div>
    </div>
  </div>
</div>
```

Add computed for port label resolution (resolves port IDs to labels using the ports prop):
```typescript
const lagPortLabels = computed(() => {
  if (!props.lagGroup) return []
  // Port labels are resolved by the parent component and passed as enriched lagGroup
  return props.lagGroup.port_ids?.map((pid: string) => {
    // Label resolution happens in the parent (switch detail page) when building lagByPortId
    return pid  // Will be enriched with labels in Task 8
  }) || []
})
```

**Tooltip z-index hierarchy:**
- VLAN tooltip (top-right): `z-50`
- LAG tooltip (below port): `z-[60]`
- Both use `pointer-events-none` + `group-hover` pattern, so only one shows at a time based on hover target area.

- [ ] **Step 3: Remove old LAG color logic**

Remove the `lagColors` array and `lagColor` computed (lines 79-86 in original). These are replaced by the diagonal pattern.

- [ ] **Step 4: Verify build passes**

Run: `npx nuxt build 2>&1 | tail -3`
Expected: `✨ Build complete!`

- [ ] **Step 5: Commit**

```bash
git add app/components/switch/SwitchPortItem.vue
git commit -m "feat(lag): diagonal stripe pattern, hover tooltip, access/trunk dot fix"
```

---

### Task 6: Frontend — SwitchPortGrid LAG legend with hover-highlight

**Files:**
- Modify: `app/components/switch/SwitchPortGrid.vue`

- [ ] **Step 1: Add LAG-related props and highlight state**

Add new props to the grid component:
```typescript
const props = defineProps<{
  ports: any[]
  units?: any[]
  vlans?: any[]
  selectedPorts: string[]
  stackSize?: number
  lagGroups?: any[]  // LAGGroup[]
  lagByPortId?: Map<string, any>  // Map<portId, LAGGroup>
}>()
```

Add highlight state:
```typescript
const highlightedLagId = ref<string | null>(null)
```

Add computed for dimming:
```typescript
const isDimmed = (portId: string) => {
  if (!highlightedLagId.value) return false
  if (props.selectedPorts.length > 0) return false  // selection takes priority
  const portLag = props.lagByPortId?.get(portId)
  return !portLag || portLag.id !== highlightedLagId.value
}
```

- [ ] **Step 2: Pass lagGroup and dimmed props to SwitchPortItem**

Update all `<SwitchPortItem>` instances in the template to include the new props:

```html
<SwitchPortItem
  v-for="port in row"
  :key="port.id"
  :port="port"
  :vlans="vlans"
  :selected="selectedPorts.includes(port.id)"
  :lag-group="lagByPortId?.get(port.id)"
  :dimmed="isDimmed(port.id)"
  @click="onPortClick($event, port.id)"
/>
```

Apply this to all three places where `SwitchPortItem` is rendered (multi-row block, single-row block, fallback flat grid).

- [ ] **Step 3: Add LAG legend section below existing legend**

After the existing legend `<div>`, add the LAG legend:

```html
<!-- LAG Legend -->
<div v-if="lagGroups?.length" class="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-default pt-3 text-[11px] text-gray-500 dark:text-gray-400">
  <span class="font-semibold text-gray-600 dark:text-gray-300">LAG:</span>

  <template v-for="(lag, i) in visibleLags" :key="lag.id">
    <div
      class="flex cursor-pointer items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 transition-all hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
      @mouseenter="onLagHover(lag.id)"
      @mouseleave="onLagLeave()"
      @click="$emit('edit-lag', lag)"
    >
      <!-- Diagonal stripe icon -->
      <span class="inline-block h-3 w-4 rounded-sm" style="background-image: repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(148,163,184,0.25) 2px, rgba(148,163,184,0.25) 3px); background-color: rgba(148,163,184,0.1);" />
      <span class="font-medium text-gray-700 dark:text-gray-200">{{ lag.name }}</span>
      <span class="text-gray-400">{{ lag.port_ids.length }}p</span>
      <span v-if="lag.remote_device" class="text-gray-400">→ {{ lag.remote_device }}</span>
      <button
        class="ml-1 rounded p-0.5 text-gray-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30"
        @click.stop="$emit('delete-lag', lag)"
      >
        <UIcon name="i-heroicons-x-mark" class="h-3 w-3" />
      </button>
    </div>
  </template>

  <!-- Show more toggle -->
  <button
    v-if="lagGroups.length > 3"
    class="text-primary-500 hover:text-primary-400 text-[11px]"
    @click="lagExpanded = !lagExpanded"
  >
    {{ lagExpanded ? $t('common.showLess') : $t('lag.showAll', { n: lagGroups.length }) }}
  </button>
</div>
```

- [ ] **Step 4: Add collapse/expand and hover logic**

```typescript
const lagExpanded = ref(false)

const visibleLags = computed(() => {
  if (!props.lagGroups) return []
  if (lagExpanded.value || props.lagGroups.length <= 3) return props.lagGroups
  return props.lagGroups.slice(0, 3)
})

function onLagHover(lagId: string) {
  if (props.selectedPorts.length > 0) return  // selection takes priority
  highlightedLagId.value = lagId
}

function onLagLeave() {
  highlightedLagId.value = null
}
```

- [ ] **Step 5: Add emits**

```typescript
const emit = defineEmits<{
  'select-port': [portId: string]
  'toggle-select': [portId: string]
  'edit-lag': [lag: any]
  'delete-lag': [lag: any]
}>()
```

- [ ] **Step 6: Update legend indicators for access/trunk dot fix**

In the existing legend, update the access and trunk indicators to match the new dot styles:

```html
<span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 bg-gray-400" style="border-radius: 0" /> Access</span>
<span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" style="box-shadow: 0 0 0 1.5px #0a0a0a, 0 0 0 2.5px #9ca3af" /> Trunk</span>
```

- [ ] **Step 7: Verify build passes**

Run: `npx nuxt build 2>&1 | tail -3`
Expected: `✨ Build complete!`

- [ ] **Step 8: Commit**

```bash
git add app/components/switch/SwitchPortGrid.vue
git commit -m "feat(lag): LAG legend with collapse, hover-highlight, access/trunk legend fix"
```

---

### Task 7: Frontend — LagGroupSlideover component

**Files:**
- Create: `app/components/switch/LagGroupSlideover.vue`

- [ ] **Step 1: Create the LAG create/edit slideover component**

Create `app/components/switch/LagGroupSlideover.vue`:

```vue
<template>
  <USlideover
    v-model:open="isOpen"
    :title="isEdit ? $t('lag.edit') : $t('lag.create')"
    :description="isEdit ? $t('lag.editDescription') : $t('lag.createDescription')"
  >
    <template #body>
      <UForm :state="form" :validate="validate" :validate-on="['blur', 'change']" class="space-y-4" @submit="onSubmit">
        <UFormField :label="$t('lag.name') + ' *'" name="name" required>
          <UInput v-model="form.name" class="w-full" />
        </UFormField>

        <UFormField :label="$t('lag.description')" name="description">
          <UTextarea v-model="form.description" :rows="2" class="w-full" />
        </UFormField>

        <UFormField :label="$t('lag.ports')" name="ports">
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="portId in form.port_ids"
              :key="portId"
              color="info"
              variant="soft"
              size="sm"
              class="cursor-pointer"
              @click="removePort(portId)"
            >
              {{ getPortLabel(portId) }}
              <UIcon name="i-heroicons-x-mark" class="ml-0.5 h-3 w-3" />
            </UBadge>
            <span v-if="form.port_ids.length === 0" class="text-sm text-gray-400">
              {{ $t('lag.noPortsSelected') }}
            </span>
          </div>
        </UFormField>

        <UFormField :label="$t('lag.remoteDevice')" name="remote_device">
          <UInput v-model="form.remote_device" :placeholder="$t('lag.remoteDevicePlaceholder')" class="w-full" />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton :loading="saving" icon="i-heroicons-check" @click="onSubmit">
          {{ isEdit ? $t('common.save') : $t('lag.create') }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { LAGGroup } from '~~/types/lagGroup'

const props = defineProps<{
  switchId: string
  ports: any[]  // all switch ports, for label resolution
  existingLags: LAGGroup[]  // for conflict checking
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()

const isOpen = ref(false)
const saving = ref(false)
const editingLag = ref<LAGGroup | null>(null)
const isEdit = computed(() => !!editingLag.value)

const form = reactive({
  name: '',
  description: '',
  port_ids: [] as string[],
  remote_device: '',
})

function getPortLabel(portId: string): string {
  const port = props.ports.find(p => p.id === portId)
  return port?.label || portId
}

function removePort(portId: string) {
  form.port_ids = form.port_ids.filter(id => id !== portId)
}

function validate(state: any) {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: t('lag.validation.nameRequired') })
  }
  if (state.port_ids.length < 2) {
    errors.push({ name: 'ports', message: t('lag.validation.minPorts') })
  }
  // Check for ports already in another LAG
  for (const portId of state.port_ids) {
    const conflict = props.existingLags.find(
      lag => lag.id !== editingLag.value?.id && lag.port_ids.includes(portId)
    )
    if (conflict) {
      errors.push({
        name: 'ports',
        message: t('lag.validation.portInLag', { port: getPortLabel(portId), lag: conflict.name })
      })
      break
    }
  }
  return errors
}

const { create, update } = useLagGroups(props.switchId)

async function onSubmit() {
  const errors = validate(form)
  if (errors.length > 0) return

  saving.value = true
  try {
    const body = {
      name: form.name.trim(),
      port_ids: [...form.port_ids],
      description: form.description.trim() || undefined,
      remote_device: form.remote_device.trim() || undefined,
    }

    if (isEdit.value && editingLag.value) {
      await update(editingLag.value.id, body)
      toast.add({ title: t('lag.messages.updated'), color: 'success' })
    } else {
      await create(body)
      toast.add({ title: t('lag.messages.created'), color: 'success' })
    }

    isOpen.value = false
    emit('saved')
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    saving.value = false
  }
}

function openCreate(portIds: string[]) {
  editingLag.value = null
  form.name = ''
  form.description = ''
  form.port_ids = [...portIds]
  form.remote_device = ''
  isOpen.value = true
}

function openEdit(lag: LAGGroup) {
  editingLag.value = lag
  form.name = lag.name
  form.description = lag.description || ''
  form.port_ids = [...lag.port_ids]  // copy, not reference
  form.remote_device = lag.remote_device || ''
  isOpen.value = true
}

defineExpose({ openCreate, openEdit })
</script>
```

- [ ] **Step 2: Verify build passes**

Run: `npx nuxt build 2>&1 | tail -3`
Expected: `✨ Build complete!`

- [ ] **Step 3: Commit**

```bash
git add app/components/switch/LagGroupSlideover.vue
git commit -m "feat(lag): create LagGroupSlideover component for create/edit"
```

---

### Task 8: Frontend — Wire LAG into switch detail page

**Files:**
- Modify: `app/pages/sites/[siteId]/switches/[id].vue`

- [ ] **Step 1: Add LAG composable and fetch**

In the `<script setup>` section, add after the existing composable calls:

```typescript
const { items: lagGroups, loading: lagLoading, fetch: fetchLags, lagById, lagByPortId } = useLagGroups(id)
```

In `onMounted`, add `fetchLags()`:
```typescript
onMounted(() => {
  fetchSwitch()
  fetchTemplates()
  fetchVlans(siteParams.value)
  fetchLags()
})
```

Add refs for the LAG slideover and delete dialog:
```typescript
const lagSlideoverRef = ref<any>(null)
const showLagDeleteDialog = ref(false)
const lagToDelete = ref<any>(null)
const deletingLag = ref(false)
```

- [ ] **Step 2: Add "Create LAG" button to selection bar**

In the selection bar template (the `v-if="selectedPorts.length > 0"` div), add a "Create LAG" button. It should be disabled when fewer than 2 ports are selected or any selected port is already in a LAG:

```typescript
const canCreateLag = computed(() => {
  if (selectedPorts.value.length < 2) return { allowed: false, reason: t('lag.validation.minPorts') }
  for (const portId of selectedPorts.value) {
    const existingLag = lagByPortId.value.get(portId)
    if (existingLag) {
      const port = item.value?.ports?.find((p: any) => p.id === portId)
      return { allowed: false, reason: t('lag.validation.portInLag', { port: port?.label || portId, lag: existingLag.name }) }
    }
  }
  return { allowed: true, reason: '' }
})
```

Add the button in the selection bar, before the "Bulk Edit" button:
```html
<UTooltip :text="canCreateLag.reason" :disabled="canCreateLag.allowed">
  <UButton
    size="xs"
    variant="soft"
    color="info"
    :disabled="!canCreateLag.allowed"
    @click="lagSlideoverRef?.openCreate(selectedPorts)"
  >
    {{ $t('lag.create') }}
  </UButton>
</UTooltip>
```

- [ ] **Step 3: Pass LAG data to SwitchPortGrid**

Update the `<SwitchPortGrid>` component to pass LAG data:

```html
<SwitchPortGrid
  v-if="item.ports && item.ports.length"
  :ports="item.ports"
  :units="templateUnits"
  :vlans="vlans"
  :selected-ports="selectedPorts"
  :lag-groups="lagGroups"
  :lag-by-port-id="lagByPortId"
  @select-port="onSelectPort"
  @toggle-select="onToggleSelect"
  @edit-lag="lagSlideoverRef?.openEdit($event)"
  @delete-lag="onDeleteLagClick"
/>
```

- [ ] **Step 4: Add LAG slideover and delete dialog to template**

After the existing edit slideover, add:

```html
<!-- LAG Slideover -->
<SwitchLagGroupSlideover
  ref="lagSlideoverRef"
  :switch-id="id"
  :ports="item?.ports || []"
  :existing-lags="lagGroups"
  @saved="onLagSaved"
/>

<!-- LAG Delete confirmation -->
<SharedConfirmDialog
  v-model="showLagDeleteDialog"
  :title="$t('lag.delete')"
  :message="lagDeleteMessage"
  :confirm-label="$t('common.delete')"
  :loading="deletingLag"
  @confirm="onDeleteLag"
/>
```

- [ ] **Step 5: Add LAG event handlers**

```typescript
function onDeleteLagClick(lag: any) {
  lagToDelete.value = lag
  showLagDeleteDialog.value = true
}

const lagDeleteMessage = computed(() => {
  if (!lagToDelete.value) return ''
  const portLabels = lagToDelete.value.port_ids
    .map((pid: string) => item.value?.ports?.find((p: any) => p.id === pid)?.label || pid)
    .join(', ')
  return `${t('lag.deleteConfirm', { name: lagToDelete.value.name })}\n\n${t('lag.portsWillBeReleased')}: ${portLabels}`
})

async function onDeleteLag() {
  if (!lagToDelete.value) return
  deletingLag.value = true
  try {
    const { remove: removeLag } = useLagGroups(id)
    await removeLag(lagToDelete.value.id)
    toast.add({ title: t('lag.messages.deleted'), color: 'success' })
    showLagDeleteDialog.value = false
    lagToDelete.value = null
    await fetchSwitch()
    await fetchLags()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    deletingLag.value = false
  }
}

async function onLagSaved() {
  selectedPorts.value = []
  await fetchSwitch()
  await fetchLags()
}
```

- [ ] **Step 6: Handle deep-link `?lag=` query parameter**

Use a `watch` on `lagById` instead of `nextTick` to handle the race condition where LAG data may not be loaded yet when `onMounted` runs:

```typescript
// Deep-link: ?lag=xyz opens the LAG slideover when data is ready
const lagParam = route.query.lag as string | undefined
if (lagParam) {
  const stopWatch = watch(lagById, (map) => {
    const lag = map.get(lagParam)
    if (lag) {
      lagSlideoverRef.value?.openEdit(lag)
      stopWatch()  // only trigger once
    }
  }, { immediate: true })
}
```

Keep `onMounted` as before (without the `nextTick` block):
```typescript
onMounted(() => {
  fetchSwitch()
  fetchTemplates()
  fetchVlans(siteParams.value)
  fetchLags()
})
```

- [ ] **Step 7: Verify build passes**

Run: `npx nuxt build 2>&1 | tail -3`
Expected: `✨ Build complete!`

- [ ] **Step 8: Commit**

```bash
git add app/pages/sites/[siteId]/switches/[id].vue
git commit -m "feat(lag): wire LAG create/edit/delete into switch detail page"
```

---

### Task 9: Frontend — LAG display in port side panel

**Files:**
- Modify: `app/components/switch/SwitchPortSidePanel.vue`

- [ ] **Step 1: Add LAG group prop**

Add a new prop:
```typescript
const props = defineProps<{
  port: any
  switchId: string
  lagGroup?: any  // LAGGroup this port belongs to, or undefined
}>()
```

Add emit for LAG removal:
```typescript
const emit = defineEmits<{
  saved: []
  'remove-from-lag': [lagId: string, portId: string]
}>()
```

- [ ] **Step 2: Add LAG group display field in the template**

After the connection fields section, add:

```html
<USeparator />

<UFormField :label="$t('lag.group')">
  <div v-if="lagGroup" class="flex items-center gap-2">
    <UBadge color="info" variant="soft" size="sm">{{ lagGroup.name }}</UBadge>
    <span v-if="lagGroup.remote_device" class="text-xs text-gray-400">→ {{ lagGroup.remote_device }}</span>
    <UButton
      size="xs"
      variant="ghost"
      color="error"
      @click="onRemoveFromLag"
    >
      {{ $t('lag.removeFromLag') }}
    </UButton>
  </div>
  <span v-else class="text-sm text-gray-400">{{ $t('common.none') }}</span>
</UFormField>
```

- [ ] **Step 3: Add remove handler**

```typescript
async function onRemoveFromLag() {
  if (!lagGroup || !props.port) return
  emit('remove-from-lag', lagGroup.id, props.port.id)
}
```

- [ ] **Step 4: Update switch detail page to pass lagGroup and handle remove**

In `app/pages/sites/[siteId]/switches/[id].vue`, update the SwitchPortSidePanel usage:

```html
<SwitchPortSidePanel
  v-model="showPortPanel"
  :port="selectedPort"
  :switch-id="id"
  :lag-group="selectedPort ? lagByPortId.get(selectedPort.id) : undefined"
  @saved="fetchSwitch"
  @remove-from-lag="onRemovePortFromLag"
/>
```

Add the handler:
```typescript
async function onRemovePortFromLag(lagId: string, portId: string) {
  const lag = lagById.value.get(lagId)
  if (!lag) return
  try {
    const newPortIds = lag.port_ids.filter(id => id !== portId)
    if (newPortIds.length < 2) {
      // LAG would have < 2 ports, delete it instead
      const { remove: removeLag } = useLagGroups(id)
      await removeLag(lagId)
      toast.add({ title: t('lag.messages.deleted'), color: 'success' })
    } else {
      const { update: updateLag } = useLagGroups(id)
      await updateLag(lagId, { port_ids: newPortIds })
      toast.add({ title: t('lag.messages.portRemoved'), color: 'success' })
    }
    await fetchSwitch()
    await fetchLags()
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'error' })
  }
}
```

- [ ] **Step 5: Verify build passes**

Run: `npx nuxt build 2>&1 | tail -3`
Expected: `✨ Build complete!`

- [ ] **Step 6: Commit**

```bash
git add app/components/switch/SwitchPortSidePanel.vue app/pages/sites/[siteId]/switches/[id].vue
git commit -m "feat(lag): show LAG group in port side panel with remove action"
```

---

### Task 10: i18n — Add LAG translation keys

**Files:**
- Modify: `i18n/locales/en.json`
- Modify: `i18n/locales/de.json`

- [ ] **Step 1: Add English translations**

Add a `lag` section to `i18n/locales/en.json`:

```json
"lag": {
  "group": "LAG Group",
  "create": "Create LAG",
  "edit": "Edit LAG",
  "delete": "Delete LAG",
  "name": "Name",
  "description": "Description",
  "ports": "Ports",
  "remoteDevice": "Remote Device",
  "remoteDevicePlaceholder": "e.g. sw-core-01",
  "removeFromLag": "Remove from LAG",
  "noPortsSelected": "No ports selected",
  "createDescription": "Group selected ports into a Link Aggregation",
  "editDescription": "Modify LAG group properties",
  "deleteConfirm": "Delete LAG \"{name}\"?",
  "portsWillBeReleased": "The following ports will be released",
  "showAll": "Show all ({n})",
  "portCount": "{n} port | {n} ports",
  "validation": {
    "nameRequired": "Name is required",
    "minPorts": "Select at least 2 ports",
    "portInLag": "Port {port} is already in LAG \"{lag}\""
  },
  "messages": {
    "created": "LAG group created",
    "updated": "LAG group updated",
    "deleted": "LAG group deleted",
    "portRemoved": "Port removed from LAG"
  }
}
```

- [ ] **Step 2: Add German translations**

Add a `lag` section to `i18n/locales/de.json`:

```json
"lag": {
  "group": "LAG-Gruppe",
  "create": "LAG erstellen",
  "edit": "LAG bearbeiten",
  "delete": "LAG löschen",
  "name": "Name",
  "description": "Beschreibung",
  "ports": "Ports",
  "remoteDevice": "Remote-Gerät",
  "remoteDevicePlaceholder": "z.B. sw-core-01",
  "removeFromLag": "Aus LAG entfernen",
  "noPortsSelected": "Keine Ports ausgewählt",
  "createDescription": "Ausgewählte Ports zu einer Link Aggregation gruppieren",
  "editDescription": "LAG-Gruppe bearbeiten",
  "deleteConfirm": "LAG \"{name}\" löschen?",
  "portsWillBeReleased": "Folgende Ports werden freigegeben",
  "showAll": "Alle anzeigen ({n})",
  "portCount": "{n} Port | {n} Ports",
  "validation": {
    "nameRequired": "Name ist erforderlich",
    "minPorts": "Mindestens 2 Ports auswählen",
    "portInLag": "Port {port} ist bereits in LAG \"{lag}\""
  },
  "messages": {
    "created": "LAG-Gruppe erstellt",
    "updated": "LAG-Gruppe aktualisiert",
    "deleted": "LAG-Gruppe gelöscht",
    "portRemoved": "Port aus LAG entfernt"
  }
}
```

- [ ] **Step 3: Verify build passes**

Run: `npx nuxt build 2>&1 | tail -3`
Expected: `✨ Build complete!`

- [ ] **Step 4: Commit**

```bash
git add i18n/locales/en.json i18n/locales/de.json
git commit -m "feat(lag): add i18n translations for LAG UI (EN + DE)"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run typecheck**

Run: `npx nuxt typecheck 2>&1 | grep "error TS" | wc -l`
Expected: `0`

- [ ] **Step 2: Run build**

Run: `npx nuxt build 2>&1 | tail -3`
Expected: `✨ Build complete!`

- [ ] **Step 3: Run tests**

Run: `node --import tsx --test tests/*.test.ts 2>&1 | tail -5`
Expected: All tests pass

- [ ] **Step 4: Manual smoke test**

Start dev server: `npx nuxt dev --port 3000`

Test the following:
1. Navigate to a switch detail page
2. Verify Access dots are sharp squares, Trunk dots are circles with rings
3. Ctrl+click 2+ ports → "Create LAG" button appears in selection bar
4. Click "Create LAG" → slideover opens with ports pre-filled
5. Fill name, submit → LAG created, ports show diagonal stripe pattern
6. Hover LAG port → tooltip shows LAG name, ports, remote device
7. Hover LAG chip in legend → non-member ports dim (brightness filter)
8. Click LAG chip → edit slideover opens
9. Click X on LAG chip → delete dialog shows port list
10. Open port side panel → shows LAG group badge with "Remove from LAG"
11. Search for LAG name in global search → result appears
12. Delete switch → verify no orphaned LAG groups in `data/lagGroups.json`

- [ ] **Step 5: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix(lag): address smoke test issues"
```
