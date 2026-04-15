# Public QR Switch View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-switch QR codes that link to a public, read-only mobile view of the switch's port allocation — no login required.

**Architecture:** New `publicTokens.json` storage file with its own repository. Public API route at `/api/p/:token` returns a sanitized, component-compatible response. Public page at `/p/:token` reuses existing `SwitchPortGrid`/`SwitchPortItem` with a new `publicMode` prop. Admin UI gets a "Public QR Access" section on the switch detail page. Auth middleware bypasses for `/api/p/` and `/p/` paths.

**Tech Stack:** Nuxt 4, TypeScript, nanoid (32-char tokens), `qrcode` npm package (already installed), Zod validation, JSON file storage.

**Design spec:** `docs/superpowers/specs/2026-04-15-public-qr-switch-view-design.md`

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `types/publicToken.ts` | PublicToken interface |
| `server/repositories/publicTokenRepository.ts` | Token CRUD, lookup by token/switch, revocation, cascade delete |
| `server/validators/publicTokenSchemas.ts` | Zod schema for token validation |
| `server/api/p/[token].get.ts` | Public unauthenticated endpoint — returns sanitized switch data |
| `server/api/switches/[id]/public-token/index.post.ts` | Create token (auth required) |
| `server/api/switches/[id]/public-token/index.get.ts` | Get latest token (auth required) |
| `server/api/switches/[id]/public-token/index.delete.ts` | Revoke token (auth required) |
| `app/composables/usePublicToken.ts` | Client-side token state management |
| `app/layouts/public.vue` | Minimal public layout (no sidebar/header/auth) |
| `app/pages/p/[token].vue` | Public switch view page |
| `app/components/public/PublicPortList.vue` | Card-based port list with filter tabs |
| `app/components/switch/SwitchPublicAccess.vue` | Admin QR code section |
| `tests/public-token.test.ts` | Unit tests for token repository |
| `tests/e2e/public-switch-view.spec.ts` | E2E tests for public view |

### Modified files
| File | Change |
|------|--------|
| `types/vlan.ts` | Add `VlanDisplayInfo` interface |
| `types/index.ts` | Export `PublicToken`, `VlanDisplayInfo` |
| `server/middleware/auth.ts:16-18` | Add prefix check for `/api/p/` |
| `app/middleware/auth.global.ts:1-3` | Add early return for `/p/` |
| `server/plugins/initData.ts:25-36` | Add `publicTokens.json` to init list |
| `server/api/switches/[id].delete.ts:1-3,19` | Import + call `publicTokenRepository.deleteBySwitchId()` |
| `server/api/backup/export.get.ts:7-17` | Add `publicTokens` to backup data |
| `server/api/backup/import.post.ts:10-16,34,47` | Add `publicTokens` to restore (optional key) |
| `app/components/switch/SwitchPortGrid.vue:149-157` | Widen `vlans` prop to `VlanDisplayInfo[]`, add `publicMode` prop, hide legend/interactions |
| `app/components/switch/SwitchPortItem.vue:86-93` | Widen `vlans` prop, add `publicMode` prop, cursor/tooltip changes |
| `app/pages/sites/[siteId]/switches/[id].vue` | Add `SwitchPublicAccess` section |
| `i18n/locales/en.json` | Add `public.*` keys |
| `i18n/locales/de.json` | Add `public.*` keys |
| `.ai/MIGRATION_STATUS.md` | Add Phase 19 entry |

---

### Task 1: Type definitions and VlanDisplayInfo

**Files:**
- Create: `types/publicToken.ts`
- Modify: `types/vlan.ts:1-24`
- Modify: `types/index.ts:1-28`

- [ ] **Step 1: Create PublicToken type**

```typescript
// types/publicToken.ts
export interface PublicToken {
  id: string
  switch_id: string
  token: string
  created_at: string
  revoked_at: string | null
  last_access_at: string | null
}
```

- [ ] **Step 2: Add VlanDisplayInfo to types/vlan.ts**

Add at the top of `types/vlan.ts`, before the existing `VlanStatus` type:

```typescript
// Shared interface for VLAN display data (used by port grid/item components)
export interface VlanDisplayInfo {
  vlan_id: number
  name: string
  color: string
}
```

- [ ] **Step 3: Update types/index.ts barrel exports**

Add these lines to `types/index.ts`:

```typescript
export type { PublicToken } from './publicToken'
export type { VlanDisplayInfo } from './vlan'
```

The existing `VLAN` export stays unchanged.

- [ ] **Step 4: Verify build**

Run: `npx nuxt prepare`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add types/publicToken.ts types/vlan.ts types/index.ts
git commit -m "feat(types): add PublicToken and VlanDisplayInfo types"
```

---

### Task 2: Public token repository

**Files:**
- Create: `server/repositories/publicTokenRepository.ts`
- Create: `server/validators/publicTokenSchemas.ts`

- [ ] **Step 1: Create Zod schema**

```typescript
// server/validators/publicTokenSchemas.ts
import { z } from 'zod'

export const publicTokenSchema = z.object({
  id: z.string(),
  switch_id: z.string(),
  token: z.string().length(32),
  created_at: z.string(),
  revoked_at: z.string().nullable(),
  last_access_at: z.string().nullable()
})
```

- [ ] **Step 2: Create repository**

```typescript
// server/repositories/publicTokenRepository.ts
import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import type { PublicToken } from '~~/types/publicToken'

const FILE = 'publicTokens.json'

function readAll(): PublicToken[] {
  return readJson<PublicToken[]>(FILE)
}

function writeAll(tokens: PublicToken[]): void {
  writeJson(FILE, tokens)
}

export const publicTokenRepository = {
  getByToken(token: string): PublicToken | null {
    const all = readAll()
    return all.find(t => t.token === token && t.revoked_at === null) ?? null
  },

  getBySwitchId(switchId: string): PublicToken | null {
    const all = readAll()
    return all.find(t => t.switch_id === switchId && t.revoked_at === null) ?? null
  },

  getLatestBySwitchId(switchId: string): PublicToken | null {
    const all = readAll()
    const forSwitch = all
      .filter(t => t.switch_id === switchId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return forSwitch[0] ?? null
  },

  create(switchId: string): PublicToken {
    const existing = this.getBySwitchId(switchId)
    if (existing) {
      throw createError({ statusCode: 409, message: 'Switch already has an active public token' })
    }

    const token: PublicToken = {
      id: nanoid(),
      switch_id: switchId,
      token: nanoid(32),
      created_at: new Date().toISOString(),
      revoked_at: null,
      last_access_at: null
    }

    const all = readAll()
    all.push(token)
    writeAll(all)
    return token
  },

  revoke(id: string): PublicToken {
    const all = readAll()
    const index = all.findIndex(t => t.id === id)
    if (index === -1) {
      throw createError({ statusCode: 404, message: 'Token not found' })
    }
    all[index]!.revoked_at = new Date().toISOString()
    writeAll(all)
    return all[index]!
  },

  updateLastAccess(id: string): void {
    const all = readAll()
    const token = all.find(t => t.id === id)
    if (token) {
      token.last_access_at = new Date().toISOString()
      writeAll(all)
    }
  },

  deleteBySwitchId(switchId: string): void {
    const all = readAll()
    const filtered = all.filter(t => t.switch_id !== switchId)
    if (filtered.length !== all.length) {
      writeAll(filtered)
    }
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npx nuxt prepare`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add server/repositories/publicTokenRepository.ts server/validators/publicTokenSchemas.ts
git commit -m "feat(backend): add public token repository and schema"
```

---

### Task 3: Unit tests for public token repository

**Files:**
- Create: `tests/public-token.test.ts`

- [ ] **Step 1: Write unit tests**

```typescript
// tests/public-token.test.ts
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

// Set up test data directory before importing repository
const TEST_DATA_DIR = join(import.meta.dirname, '.test-data-public-token')

// We need to mock the runtime config before importing the repository
process.env.NUXT_DATA_DIR = TEST_DATA_DIR

describe('publicTokenRepository', () => {
  let publicTokenRepository: typeof import('../server/repositories/publicTokenRepository').publicTokenRepository

  beforeEach(async () => {
    // Clean and recreate test data dir
    rmSync(TEST_DATA_DIR, { recursive: true, force: true })
    mkdirSync(TEST_DATA_DIR, { recursive: true })
    writeFileSync(join(TEST_DATA_DIR, 'publicTokens.json'), '[]')

    // Re-import to get fresh module (repository reads from disk)
    const mod = await import('../server/repositories/publicTokenRepository')
    publicTokenRepository = mod.publicTokenRepository
  })

  it('creates a token with 32-char token string', () => {
    const token = publicTokenRepository.create('switch-1')
    assert.strictEqual(token.token.length, 32)
    assert.strictEqual(token.switch_id, 'switch-1')
    assert.strictEqual(token.revoked_at, null)
    assert.strictEqual(token.last_access_at, null)
    assert.ok(token.id.length > 0)
    assert.ok(token.created_at.length > 0)
  })

  it('enforces one active token per switch', () => {
    publicTokenRepository.create('switch-1')
    assert.throws(
      () => publicTokenRepository.create('switch-1'),
      (err: any) => err.statusCode === 409
    )
  })

  it('allows new token after revoking', () => {
    const first = publicTokenRepository.create('switch-1')
    publicTokenRepository.revoke(first.id)
    const second = publicTokenRepository.create('switch-1')
    assert.notStrictEqual(first.token, second.token)
  })

  it('looks up active token by token string', () => {
    const created = publicTokenRepository.create('switch-1')
    const found = publicTokenRepository.getByToken(created.token)
    assert.ok(found)
    assert.strictEqual(found!.id, created.id)
  })

  it('returns null for revoked token from getByToken', () => {
    const created = publicTokenRepository.create('switch-1')
    publicTokenRepository.revoke(created.id)
    const found = publicTokenRepository.getByToken(created.token)
    assert.strictEqual(found, null)
  })

  it('getLatestBySwitchId returns revoked token', () => {
    const created = publicTokenRepository.create('switch-1')
    publicTokenRepository.revoke(created.id)
    const latest = publicTokenRepository.getLatestBySwitchId('switch-1')
    assert.ok(latest)
    assert.ok(latest!.revoked_at)
  })

  it('deleteBySwitchId removes all tokens for switch', () => {
    const first = publicTokenRepository.create('switch-1')
    publicTokenRepository.revoke(first.id)
    publicTokenRepository.create('switch-1')
    publicTokenRepository.deleteBySwitchId('switch-1')
    assert.strictEqual(publicTokenRepository.getLatestBySwitchId('switch-1'), null)
  })

  it('updateLastAccess sets timestamp', () => {
    const created = publicTokenRepository.create('switch-1')
    assert.strictEqual(created.last_access_at, null)
    publicTokenRepository.updateLastAccess(created.id)
    const updated = publicTokenRepository.getByToken(created.token)
    assert.ok(updated!.last_access_at)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `node --import tsx --test tests/public-token.test.ts`
Expected: All tests pass. If there are import issues with `createError` (Nitro global), the repository may need a small adjustment — wrap the throw in a plain `Error` for testability or mock the global.

- [ ] **Step 3: Fix any import issues**

If `createError` is not available in test context, update the repository to throw plain errors:

Replace in `publicTokenRepository.ts`:
```typescript
throw createError({ statusCode: 409, message: 'Switch already has an active public token' })
```
with:
```typescript
const err = new Error('Switch already has an active public token') as any
err.statusCode = 409
throw err
```

Same for the 404 in `revoke()`.

- [ ] **Step 4: Verify all tests pass**

Run: `node --import tsx --test tests/public-token.test.ts`
Expected: 8 tests pass

- [ ] **Step 5: Commit**

```bash
git add tests/public-token.test.ts server/repositories/publicTokenRepository.ts
git commit -m "test: add unit tests for public token repository"
```

---

### Task 4: Storage init, middleware bypass, and cascade delete

**Files:**
- Modify: `server/plugins/initData.ts:25-36`
- Modify: `server/middleware/auth.ts:10-18`
- Modify: `app/middleware/auth.global.ts:1-3`
- Modify: `server/api/switches/[id].delete.ts:1-3,19`

- [ ] **Step 1: Add publicTokens.json to init**

In `server/plugins/initData.ts`, add `'publicTokens.json'` to the `arrayFiles` array (after `'sites.json'`):

```typescript
  const arrayFiles = [
    'users.json',
    'switches.json',
    'vlans.json',
    'networks.json',
    'ipAllocations.json',
    'ipRanges.json',
    'layoutTemplates.json',
    'lagGroups.json',
    'activity.json',
    'sites.json',
    'publicTokens.json'
  ]
```

- [ ] **Step 2: Add server middleware bypass**

In `server/middleware/auth.ts`, add a prefix check before the existing `PUBLIC_PATHS` check. After line 15 (`if (!path.startsWith('/api/')) return`), add:

```typescript
  // Public API routes with dynamic segments
  if (path.startsWith('/api/p/')) return
```

- [ ] **Step 3: Add client middleware bypass**

In `app/middleware/auth.global.ts`, add an early return as the very first line inside the handler function (after `export default defineNuxtRouteMiddleware(async (to) => {`):

```typescript
  // Public routes — no auth required
  if (to.path.startsWith('/p/')) return
```

- [ ] **Step 4: Add cascade delete**

In `server/api/switches/[id].delete.ts`, add the import at line 3:

```typescript
import { publicTokenRepository } from '../../repositories/publicTokenRepository'
```

Then after the `lagGroupRepository.deleteBySwitchId(id)` call (line 19), add:

```typescript
  publicTokenRepository.deleteBySwitchId(id)
```

- [ ] **Step 5: Verify build**

Run: `npx nuxt prepare && npm run build`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add server/plugins/initData.ts server/middleware/auth.ts app/middleware/auth.global.ts server/api/switches/\[id\].delete.ts
git commit -m "feat(backend): auth bypass, storage init, and cascade delete for public tokens"
```

---

### Task 5: Backup/restore integration

**Files:**
- Modify: `server/api/backup/export.get.ts:4-17`
- Modify: `server/api/backup/import.post.ts:10-16,34,47`

- [ ] **Step 1: Add to backup export**

In `server/api/backup/export.get.ts`, add to the `data` object (after `settings`):

```typescript
      publicTokens: readJson('publicTokens.json')
```

- [ ] **Step 2: Add to backup import**

In `server/api/backup/import.post.ts`:

1. Do NOT add `'publicTokens'` to `requiredKeys` (backwards compatibility).

2. Add to `fileMap` (inside the try block):
```typescript
      publicTokens: 'publicTokens.json',
```

3. Add to `preRestoreBackup`:
```typescript
    publicTokens: readJson('publicTokens.json'),
```

4. Handle optional key in the restore loop — change the restore logic to handle missing keys:
```typescript
    for (const [key, fileName] of Object.entries(fileMap)) {
      const data = body.data[key] ?? []
      writeJson(fileName as string, data)
    }
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add server/api/backup/export.get.ts server/api/backup/import.post.ts
git commit -m "feat(backup): include publicTokens in backup/restore"
```

---

### Task 6: Admin API routes for token management

**Files:**
- Create: `server/api/switches/[id]/public-token/index.post.ts`
- Create: `server/api/switches/[id]/public-token/index.get.ts`
- Create: `server/api/switches/[id]/public-token/index.delete.ts`

- [ ] **Step 1: Create POST route (create token)**

```typescript
// server/api/switches/[id]/public-token/index.post.ts
import { publicTokenRepository } from '../../../../repositories/publicTokenRepository'
import { switchRepository } from '../../../../repositories/switchRepository'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) {
    throw createError({ statusCode: 400, message: 'Missing switch ID' })
  }

  const sw = switchRepository.getById(switchId)
  if (!sw) {
    throw createError({ statusCode: 404, message: 'Switch not found' })
  }

  const token = publicTokenRepository.create(switchId)
  setResponseStatus(event, 201)
  return token
})
```

- [ ] **Step 2: Create GET route (get latest token)**

```typescript
// server/api/switches/[id]/public-token/index.get.ts
import { publicTokenRepository } from '../../../../repositories/publicTokenRepository'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) {
    throw createError({ statusCode: 400, message: 'Missing switch ID' })
  }

  const token = publicTokenRepository.getLatestBySwitchId(switchId)
  if (!token) {
    throw createError({ statusCode: 404, message: 'No public token found' })
  }

  return token
})
```

- [ ] **Step 3: Create DELETE route (revoke token)**

```typescript
// server/api/switches/[id]/public-token/index.delete.ts
import { publicTokenRepository } from '../../../../repositories/publicTokenRepository'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) {
    throw createError({ statusCode: 400, message: 'Missing switch ID' })
  }

  const token = publicTokenRepository.getBySwitchId(switchId)
  if (!token) {
    throw createError({ statusCode: 404, message: 'No active public token found' })
  }

  const revoked = publicTokenRepository.revoke(token.id)
  return revoked
})
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add server/api/switches/\[id\]/public-token/
git commit -m "feat(api): add admin token management routes (create/get/revoke)"
```

---

### Task 7: Public API route

**Files:**
- Create: `server/api/p/[token].get.ts`

- [ ] **Step 1: Create public route**

```typescript
// server/api/p/[token].get.ts
import { publicTokenRepository } from '../../repositories/publicTokenRepository'
import { switchRepository } from '../../repositories/switchRepository'
import { vlanRepository } from '../../repositories/vlanRepository'
import { layoutTemplateRepository } from '../../repositories/layoutTemplateRepository'
import { siteRepository } from '../../repositories/siteRepository'
import type { Port } from '~~/types/port'
import type { LayoutUnit } from '~~/types/layoutTemplate'

export default defineEventHandler(async (event) => {
  const tokenStr = event.context.params?.token
  if (!tokenStr) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const tokenRecord = publicTokenRepository.getByToken(tokenStr)
  if (!tokenRecord) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const sw = switchRepository.getById(tokenRecord.switch_id)
  if (!sw) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  // Update last access (fire-and-forget)
  publicTokenRepository.updateLastAccess(tokenRecord.id)

  // Load site name
  const site = siteRepository.getById(sw.site_id)
  const siteName = site?.name ?? null

  // Load VLANs scoped to switch's site
  const allVlans = vlanRepository.list()
  const siteVlans = allVlans.filter(v => v.site_id === sw.site_id)

  // Collect VLAN IDs used by this switch's ports
  const usedVlanIds = new Set<number>()
  for (const port of sw.ports) {
    if (port.access_vlan) usedVlanIds.add(port.access_vlan)
    if (port.native_vlan) usedVlanIds.add(port.native_vlan)
    for (const vid of port.tagged_vlans) {
      usedVlanIds.add(vid)
    }
  }

  // Build public VLANs (only used ones)
  const publicVlans = siteVlans
    .filter(v => usedVlanIds.has(v.vlan_id))
    .map(v => ({ vlan_id: v.vlan_id, name: v.name, color: v.color }))

  // Build public ports (strip sensitive fields, synthetic IDs)
  const publicPorts = sw.ports.map((port: Port, i: number) => ({
    id: `p-${i}`,
    unit: port.unit,
    index: port.index,
    label: port.label,
    type: port.type,
    speed: port.speed,
    status: port.status,
    port_mode: port.port_mode,
    access_vlan: port.access_vlan,
    native_vlan: port.native_vlan,
    tagged_vlans: port.tagged_vlans,
    connected_device: port.connected_device,
    description: port.description,
    poe: port.poe ?? null
  }))

  // Build public layout units (synthetic block IDs)
  let publicUnits: any[] = []
  if (sw.layout_template_id) {
    const template = layoutTemplateRepository.getById(sw.layout_template_id)
    if (template) {
      publicUnits = template.units.map((unit: LayoutUnit) => ({
        unit_number: unit.unit_number,
        label: unit.label,
        blocks: unit.blocks.map((block, bi) => ({
          id: `blk-${unit.unit_number}-${bi}`,
          type: block.type,
          count: block.count,
          start_index: block.start_index,
          rows: block.rows,
          row_layout: block.row_layout,
          label: block.label
        }))
      }))
    }
  }

  // Set security headers
  setHeader(event, 'X-Robots-Tag', 'noindex')
  setHeader(event, 'Cache-Control', 'no-store')

  return {
    name: sw.name,
    model: sw.model ?? null,
    location: sw.location ?? null,
    site_name: siteName,
    updated_at: sw.updated_at,
    ports: publicPorts,
    vlans: publicVlans,
    units: publicUnits
  }
})
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/api/p/
git commit -m "feat(api): add public switch view route /api/p/:token"
```

---

### Task 8: Widen component VLAN props and add publicMode

**Files:**
- Modify: `app/components/switch/SwitchPortGrid.vue:149-157,1-146`
- Modify: `app/components/switch/SwitchPortItem.vue:81-93,1-78`

- [ ] **Step 1: Update SwitchPortItem props**

In `app/components/switch/SwitchPortItem.vue`, change the import and props:

Replace:
```typescript
import type { VLAN } from '~~/types/vlan'
```
with:
```typescript
import type { VlanDisplayInfo } from '~~/types/vlan'
```

Replace in props:
```typescript
  vlans?: VLAN[]
```
with:
```typescript
  vlans?: VlanDisplayInfo[]
  publicMode?: boolean
```

In the template, change the root `div`:
- Add to the `:class` binding: `publicMode ? 'cursor-default' : 'cursor-pointer'`
- Remove the existing `cursor-pointer` from the static classes

Change the tooltip `v-if` condition from:
```
v-if="hasTooltipContent && !printMode"
```
to:
```
v-if="hasTooltipContent && !printMode && !publicMode"
```

Add a simpler read-only tooltip for public mode after the existing tooltip div:
```html
    <!-- Public mode: read-only info tooltip -->
    <div v-if="hasTooltipContent && publicMode" v-show="hovered" class="pointer-events-none absolute left-0 top-full z-[60] mt-1 min-w-[10rem] rounded-md border border-default bg-default p-2 shadow-lg">
      <div class="space-y-1.5 text-xs">
        <template v-if="isTrunk">
          <div class="font-semibold text-gray-700 dark:text-gray-200">Trunk</div>
          <div v-if="port.native_vlan" class="flex items-center gap-1.5">
            <div class="h-2 w-2 flex-shrink-0 rounded" :style="{ backgroundColor: getVlanColor(port.native_vlan) }" />
            <span class="font-medium text-gray-700 dark:text-gray-200">{{ port.native_vlan }}</span>
            <span class="truncate text-gray-400">{{ getVlanName(port.native_vlan) }}</span>
            <span class="ml-auto flex-shrink-0 text-[10px] text-primary-500">N</span>
          </div>
          <div v-for="vid in port.tagged_vlans" :key="vid" class="flex items-center gap-1.5">
            <div class="h-2 w-2 flex-shrink-0 rounded" :style="{ backgroundColor: getVlanColor(vid) }" />
            <span class="font-medium text-gray-700 dark:text-gray-200">{{ vid }}</span>
            <span class="truncate text-gray-400">{{ getVlanName(vid) }}</span>
          </div>
        </template>
        <template v-else-if="vlanDotColor">
          <div class="font-semibold text-gray-700 dark:text-gray-200">Access</div>
          <div class="flex items-center gap-1.5">
            <div class="h-2 w-2 flex-shrink-0 rounded-sm" :style="{ backgroundColor: vlanDotColor }" />
            <span class="font-medium text-gray-700 dark:text-gray-200">{{ port.access_vlan || port.native_vlan }}</span>
            <span class="text-gray-400">{{ getVlanName((port.access_vlan || port.native_vlan)!) }}</span>
          </div>
        </template>
      </div>
    </div>
```

- [ ] **Step 2: Update SwitchPortGrid props and legend**

In `app/components/switch/SwitchPortGrid.vue`, change the import:

Replace:
```typescript
import type { VLAN } from '~~/types/vlan'
```
with:
```typescript
import type { VlanDisplayInfo } from '~~/types/vlan'
```

Update props:
```typescript
  vlans?: VLAN[]
```
to:
```typescript
  vlans?: VlanDisplayInfo[]
  publicMode?: boolean
```

In the template, wrap the entire legend section (the `port-legend` div with status/type/indicators) with:
```html
<template v-if="!publicMode">
  <!-- existing legend div -->
</template>
```

Also wrap the LAG legend section with:
```html
<template v-if="!publicMode">
  <!-- existing LAG legend div -->
</template>
```

Hide the multi-select hint — this is already inside the legend which is now hidden in publicMode, so no extra change needed.

In the `onPortClick` function, add early return:
```typescript
function onPortClick(event: MouseEvent, portId: string) {
  if (props.publicMode) return
  // ... existing logic
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Verify existing tests still pass**

Run: `node --import tsx --test tests/*.test.ts`
Expected: All existing tests pass

- [ ] **Step 5: Commit**

```bash
git add app/components/switch/SwitchPortGrid.vue app/components/switch/SwitchPortItem.vue
git commit -m "feat(components): add publicMode prop and widen vlans to VlanDisplayInfo"
```

---

### Task 9: i18n translations

**Files:**
- Modify: `i18n/locales/en.json`
- Modify: `i18n/locales/de.json`

- [ ] **Step 1: Add English translations**

Add to `en.json` under a new `"public"` key at the top level:

```json
"public": {
  "title": "Switch Port Map",
  "error": "This link is no longer valid.",
  "loading": "Loading switch data...",
  "footer": "Powered by ezSWM",
  "lastUpdated": "Last updated: {date}",
  "filter": {
    "all": "All",
    "occupied": "Occupied",
    "unused": "Unused"
  },
  "port": {
    "trunk": "Trunk",
    "vlans": "VLANs"
  },
  "admin": {
    "title": "Public QR Access",
    "generate": "Generate Public Link",
    "generateNew": "Generate New Link",
    "copyLink": "Copy Link",
    "downloadSvg": "Download SVG",
    "downloadPng": "Download PNG",
    "printSticker": "Print Sticker",
    "revoke": "Revoke Token",
    "revokeConfirm": "Are you sure you want to revoke this public link? The QR code sticker will stop working.",
    "revoked": "Token revoked on {date}",
    "createdAt": "Created",
    "lastAccess": "Last accessed",
    "lastAccessNever": "Never",
    "publicUrl": "Public URL",
    "generated": "Public link generated",
    "revokedSuccess": "Public link revoked",
    "copied": "Link copied to clipboard",
    "linkLabel": "Public link for this switch"
  }
}
```

- [ ] **Step 2: Add German translations**

Add to `de.json` under a new `"public"` key at the top level:

```json
"public": {
  "title": "Switch-Portbelegung",
  "error": "Dieser Link ist nicht mehr gültig.",
  "loading": "Lade Switch-Daten...",
  "footer": "Powered by ezSWM",
  "lastUpdated": "Zuletzt aktualisiert: {date}",
  "filter": {
    "all": "Alle",
    "occupied": "Belegt",
    "unused": "Frei"
  },
  "port": {
    "trunk": "Trunk",
    "vlans": "VLANs"
  },
  "admin": {
    "title": "Öffentlicher QR-Zugang",
    "generate": "Öffentlichen Link erstellen",
    "generateNew": "Neuen Link erstellen",
    "copyLink": "Link kopieren",
    "downloadSvg": "SVG herunterladen",
    "downloadPng": "PNG herunterladen",
    "printSticker": "Sticker drucken",
    "revoke": "Token widerrufen",
    "revokeConfirm": "Möchten Sie diesen öffentlichen Link wirklich widerrufen? Der QR-Code-Sticker funktioniert dann nicht mehr.",
    "revoked": "Token widerrufen am {date}",
    "createdAt": "Erstellt",
    "lastAccess": "Letzter Zugriff",
    "lastAccessNever": "Nie",
    "publicUrl": "Öffentliche URL",
    "generated": "Öffentlicher Link erstellt",
    "revokedSuccess": "Öffentlicher Link widerrufen",
    "copied": "Link in Zwischenablage kopiert",
    "linkLabel": "Öffentlicher Link für diesen Switch"
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add i18n/locales/en.json i18n/locales/de.json
git commit -m "feat(i18n): add public QR access translations (EN + DE)"
```

---

### Task 10: usePublicToken composable

**Files:**
- Create: `app/composables/usePublicToken.ts`

- [ ] **Step 1: Create composable**

```typescript
// app/composables/usePublicToken.ts
import type { PublicToken } from '~~/types/publicToken'

export function usePublicToken(switchId: Ref<string> | string) {
  const id = toValue(switchId)
  const token = ref<PublicToken | null>(null)
  const loading = ref(false)

  async function fetchToken() {
    loading.value = true
    try {
      const data = await $fetch<PublicToken>(`/api/switches/${id}/public-token`)
      token.value = data
    } catch (e: any) {
      if (e?.statusCode === 404) {
        token.value = null
      }
    } finally {
      loading.value = false
    }
  }

  async function createToken() {
    loading.value = true
    try {
      const data = await $fetch<PublicToken>(`/api/switches/${id}/public-token`, {
        method: 'POST'
      })
      token.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  async function revokeToken() {
    loading.value = true
    try {
      await $fetch(`/api/switches/${id}/public-token`, {
        method: 'DELETE'
      })
      await fetchToken()
    } finally {
      loading.value = false
    }
  }

  return { token, loading, fetchToken, createToken, revokeToken }
}
```

- [ ] **Step 2: Verify build**

Run: `npx nuxt prepare`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/composables/usePublicToken.ts
git commit -m "feat(composable): add usePublicToken for token lifecycle management"
```

---

### Task 11: SwitchPublicAccess admin component

**Files:**
- Create: `app/components/switch/SwitchPublicAccess.vue`

- [ ] **Step 1: Create the component**

```vue
<template>
  <div class="rounded-lg border border-default bg-default/30 p-4">
    <button
      class="flex w-full items-center justify-between text-left"
      @click="expanded = !expanded"
    >
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200">
        {{ $t('public.admin.title') }}
      </h3>
      <UIcon
        :name="expanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
        class="h-4 w-4 text-gray-400"
      />
    </button>

    <div v-if="expanded" class="mt-4 space-y-4">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center gap-2 text-sm text-gray-400">
        <UIcon name="i-heroicons-arrow-path" class="h-4 w-4 animate-spin" />
        {{ $t('public.loading') }}
      </div>

      <!-- No token -->
      <div v-else-if="!token">
        <UButton
          :label="$t('public.admin.generate')"
          icon="i-heroicons-qr-code"
          color="primary"
          @click="handleCreate"
        />
      </div>

      <!-- Revoked token -->
      <div v-else-if="token.revoked_at" class="space-y-3">
        <div class="flex items-center gap-2 text-sm text-amber-500">
          <UIcon name="i-heroicons-exclamation-triangle" class="h-4 w-4" />
          {{ $t('public.admin.revoked', { date: formatDate(token.revoked_at) }) }}
        </div>
        <UButton
          :label="$t('public.admin.generateNew')"
          icon="i-heroicons-qr-code"
          color="primary"
          @click="handleCreate"
        />
      </div>

      <!-- Active token -->
      <div v-else class="space-y-4">
        <!-- QR Code preview -->
        <div class="flex justify-center">
          <ClientOnly>
            <div ref="qrContainer" class="rounded-lg bg-white p-3" />
          </ClientOnly>
        </div>

        <!-- Public URL -->
        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-500">{{ $t('public.admin.publicUrl') }}</label>
          <div class="flex items-center gap-2">
            <code class="flex-1 truncate rounded bg-gray-100 px-2 py-1 text-xs dark:bg-neutral-800">
              {{ publicUrl }}
            </code>
            <UButton
              icon="i-heroicons-clipboard"
              size="xs"
              color="neutral"
              variant="ghost"
              :label="$t('public.admin.copyLink')"
              @click="copyLink"
            />
          </div>
        </div>

        <!-- Metadata -->
        <div class="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div>
            <span class="font-medium">{{ $t('public.admin.createdAt') }}:</span>
            {{ formatDate(token.created_at) }}
          </div>
          <div>
            <span class="font-medium">{{ $t('public.admin.lastAccess') }}:</span>
            {{ token.last_access_at ? formatDate(token.last_access_at) : $t('public.admin.lastAccessNever') }}
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-wrap gap-2">
          <UButton
            :label="$t('public.admin.downloadSvg')"
            icon="i-heroicons-arrow-down-tray"
            size="xs"
            color="neutral"
            variant="outline"
            @click="downloadSvg"
          />
          <UButton
            :label="$t('public.admin.downloadPng')"
            icon="i-heroicons-arrow-down-tray"
            size="xs"
            color="neutral"
            variant="outline"
            @click="downloadPng"
          />
          <UButton
            :label="$t('public.admin.printSticker')"
            icon="i-heroicons-printer"
            size="xs"
            color="neutral"
            variant="outline"
            @click="printSticker"
          />
          <UButton
            :label="$t('public.admin.revoke')"
            icon="i-heroicons-x-circle"
            size="xs"
            color="error"
            variant="outline"
            @click="showRevokeConfirm = true"
          />
        </div>
      </div>
    </div>

    <!-- Revoke confirmation -->
    <SharedConfirmDialog
      v-model="showRevokeConfirm"
      :title="$t('public.admin.revoke')"
      :message="$t('public.admin.revokeConfirm')"
      @confirm="handleRevoke"
    />
  </div>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'

const props = defineProps<{
  switchId: string
  switchName: string
  switchLocation?: string
}>()

const { t } = useI18n()
const toast = useToast()

const expanded = ref(false)
const showRevokeConfirm = ref(false)
const qrContainer = ref<HTMLDivElement>()

const { token, loading, fetchToken, createToken, revokeToken } = usePublicToken(props.switchId)

const publicUrl = computed(() => {
  if (!token.value?.token) return ''
  return `${window.location.origin}/p/${token.value.token}`
})

onMounted(() => {
  fetchToken()
})

watch([token, qrContainer], async () => {
  if (token.value?.token && !token.value.revoked_at && qrContainer.value) {
    await nextTick()
    const url = `${window.location.origin}/p/${token.value.token}`
    qrContainer.value.innerHTML = await QRCode.toString(url, {
      type: 'svg',
      width: 200,
      margin: 0,
      color: { dark: '#000000', light: '#ffffff' }
    })
  }
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

async function handleCreate() {
  try {
    await createToken()
    toast.add({ title: t('public.admin.generated'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message || 'Error', color: 'error' })
  }
}

async function handleRevoke() {
  try {
    await revokeToken()
    toast.add({ title: t('public.admin.revokedSuccess'), color: 'success' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message || 'Error', color: 'error' })
  }
  showRevokeConfirm.value = false
}

async function copyLink() {
  await navigator.clipboard.writeText(publicUrl.value)
  toast.add({ title: t('public.admin.copied'), color: 'success' })
}

async function downloadSvg() {
  const url = publicUrl.value
  const svg = await QRCode.toString(url, { type: 'svg', width: 400, margin: 1 })
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  downloadBlob(blob, `${props.switchName}-qr.svg`)
}

async function downloadPng() {
  const url = publicUrl.value
  const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 1 })
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  downloadBlob(blob, `${props.switchName}-qr.png`)
}

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function printSticker() {
  const url = publicUrl.value
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!DOCTYPE html>
<html><head><title>QR Sticker</title>
<style>
  @media print { @page { size: 62mm 29mm; margin: 0; } }
  body { margin: 0; padding: 4mm; display: flex; align-items: center; gap: 3mm; font-family: system-ui; }
  .qr { width: 21mm; height: 21mm; }
  .info { font-size: 8pt; line-height: 1.3; }
  .name { font-weight: bold; font-size: 9pt; }
</style></head><body>
  <div class="qr" id="qr"></div>
  <div class="info">
    <div class="name">${props.switchName}</div>
    ${props.switchLocation ? `<div>${props.switchLocation}</div>` : ''}
  </div>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1/build/qrcode.min.js"><\/script>
  <script>
    QRCode.toCanvas(document.createElement('canvas'), '${url}', {width: 200, margin: 0}, function(err, canvas) {
      canvas.style.width = '21mm';
      canvas.style.height = '21mm';
      document.getElementById('qr').appendChild(canvas);
      setTimeout(function() { window.print(); }, 300);
    });
  <\/script>
</body></html>`)
  w.document.close()
}
</script>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors. If `qrcode` has SSR issues, the `<ClientOnly>` wrapper and `onMounted`/`watch` patterns should prevent them.

- [ ] **Step 3: Commit**

```bash
git add app/components/switch/SwitchPublicAccess.vue
git commit -m "feat(ui): add SwitchPublicAccess component with QR code generation"
```

---

### Task 12: Integrate SwitchPublicAccess into switch detail page

**Files:**
- Modify: `app/pages/sites/[siteId]/switches/[id].vue`

- [ ] **Step 1: Add the component to the switch detail page**

Find the switch detail page. After the existing content sections (port grid, details card, activity), add the `SwitchPublicAccess` component:

```vue
<SwitchPublicAccess
  :switch-id="item.id"
  :switch-name="item.name"
  :switch-location="item.location"
/>
```

No import needed — Nuxt auto-imports components.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/pages/sites/\[siteId\]/switches/\[id\].vue
git commit -m "feat(ui): integrate public QR access section into switch detail page"
```

---

### Task 13: Public layout and page

**Files:**
- Create: `app/layouts/public.vue`
- Create: `app/pages/p/[token].vue`

- [ ] **Step 1: Create public layout**

```vue
<!-- app/layouts/public.vue -->
<template>
  <div class="min-h-screen bg-[#0a0a0a] text-gray-200">
    <Head>
      <Meta name="robots" content="noindex" />
    </Head>
    <div class="mx-auto max-w-lg px-4 py-6">
      <slot />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Create public page**

```vue
<!-- app/pages/p/[token].vue -->
<template>
  <div>
    <!-- Loading -->
    <div v-if="pending" class="flex min-h-[60vh] items-center justify-center">
      <div class="text-center text-gray-500">
        <UIcon name="i-heroicons-arrow-path" class="mb-2 h-8 w-8 animate-spin" />
        <p class="text-sm">{{ $t('public.loading') }}</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex min-h-[60vh] items-center justify-center">
      <div class="text-center text-gray-500">
        <UIcon name="i-heroicons-exclamation-circle" class="mb-2 h-12 w-12 text-gray-600" />
        <p class="text-sm">{{ $t('public.error') }}</p>
      </div>
    </div>

    <!-- Success -->
    <div v-else-if="data" class="space-y-4">
      <!-- Header -->
      <div class="text-center">
        <div class="text-[10px] uppercase tracking-widest text-gray-600">ezSWM</div>
        <h1 class="mt-1 text-xl font-bold text-gray-100">{{ data.name }}</h1>
        <p v-if="data.model || data.location" class="mt-0.5 text-sm text-gray-500">
          <span v-if="data.model">{{ data.model }}</span>
          <span v-if="data.model && data.location"> · </span>
          <span v-if="data.location">{{ data.location }}</span>
        </p>
      </div>

      <!-- Port Grid -->
      <SwitchPortGrid
        :ports="data.ports"
        :units="data.units"
        :vlans="data.vlans"
        :selected-ports="[]"
        :public-mode="true"
      />

      <!-- Compact VLAN Legend -->
      <div v-if="data.vlans.length" class="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        <div
          v-for="vlan in data.vlans"
          :key="vlan.vlan_id"
          class="flex items-center gap-1.5"
        >
          <div class="h-2.5 w-2.5 rounded-sm" :style="{ backgroundColor: vlan.color }" />
          <span class="text-gray-400">VLAN {{ vlan.vlan_id }}</span>
          <span class="text-gray-500">{{ vlan.name }}</span>
        </div>
      </div>

      <!-- Port List -->
      <PublicPortList :ports="data.ports" :vlans="data.vlans" />

      <!-- Footer -->
      <div class="border-t border-gray-800 pt-4 text-center text-[10px] text-gray-600">
        <div>{{ $t('public.footer') }}</div>
        <div class="mt-0.5 text-gray-700">
          {{ $t('public.lastUpdated', { date: new Date(data.updated_at).toLocaleString() }) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'public' })

const route = useRoute()
const tokenStr = route.params.token as string

useHead({ title: 'Switch Port Map' })

const { data, pending, error } = useFetch(`/api/p/${tokenStr}`, {
  server: false
})
</script>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/layouts/public.vue app/pages/p/
git commit -m "feat(ui): add public layout and switch view page at /p/:token"
```

---

### Task 14: PublicPortList component

**Files:**
- Create: `app/components/public/PublicPortList.vue`

- [ ] **Step 1: Create the component**

```vue
<!-- app/components/public/PublicPortList.vue -->
<template>
  <div class="space-y-3">
    <!-- Filter tabs -->
    <div class="flex gap-1 text-xs">
      <button
        v-for="f in filters"
        :key="f.key"
        class="rounded-md px-3 py-1.5 transition-colors"
        :class="activeFilter === f.key
          ? 'bg-gray-700 text-gray-100'
          : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'"
        @click="activeFilter = f.key"
      >
        {{ f.label }} ({{ f.count }})
      </button>
    </div>

    <!-- Port cards -->
    <div class="space-y-1.5">
      <div
        v-for="port in filteredPorts"
        :key="port.id"
        class="rounded-lg border p-3 transition-colors"
        :class="isOccupied(port)
          ? 'border-gray-700 bg-[#161616]'
          : 'border-gray-800/50 bg-[#111] opacity-50'"
        :style="isOccupied(port) && getPortVlanColor(port) ? { borderLeftWidth: '3px', borderLeftColor: getPortVlanColor(port)! } : {}"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold">{{ port.label || `${port.unit}/${port.index}` }}</span>
            <span
              class="text-[11px]"
              :class="port.status === 'up' ? 'text-green-500' : port.status === 'disabled' ? 'text-red-400' : 'text-gray-600'"
            >
              &#9679; {{ port.status.toUpperCase() }}
            </span>
          </div>
          <span v-if="getVlanLabel(port)" class="text-[11px]" :style="{ color: getPortVlanColor(port) || '#888' }">
            {{ getVlanLabel(port) }}
          </span>
        </div>
        <div v-if="getPortDetails(port)" class="mt-1 text-xs text-gray-500">
          {{ getPortDetails(port) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VlanDisplayInfo } from '~~/types/vlan'

interface PublicPort {
  id: string
  unit: number
  index: number
  label?: string
  type: string
  speed?: string
  status: string
  port_mode?: string
  access_vlan?: number
  native_vlan?: number
  tagged_vlans: number[]
  connected_device?: string
  description?: string
  poe?: any
}

const props = defineProps<{
  ports: PublicPort[]
  vlans: VlanDisplayInfo[]
}>()

const { t } = useI18n()
const activeFilter = ref<'all' | 'occupied' | 'unused'>('all')

function isOccupied(port: PublicPort): boolean {
  return port.status === 'up'
    || !!port.connected_device
    || !!port.access_vlan
    || !!port.native_vlan
    || port.tagged_vlans.length > 0
}

const filters = computed(() => {
  const occupied = props.ports.filter(isOccupied).length
  return [
    { key: 'all' as const, label: t('public.filter.all'), count: props.ports.length },
    { key: 'occupied' as const, label: t('public.filter.occupied'), count: occupied },
    { key: 'unused' as const, label: t('public.filter.unused'), count: props.ports.length - occupied }
  ]
})

const filteredPorts = computed(() => {
  if (activeFilter.value === 'occupied') return props.ports.filter(isOccupied)
  if (activeFilter.value === 'unused') return props.ports.filter(p => !isOccupied(p))
  return props.ports
})

function getVlan(vlanId: number): VlanDisplayInfo | undefined {
  return props.vlans.find(v => v.vlan_id === vlanId)
}

function getPortVlanColor(port: PublicPort): string | null {
  const vid = port.access_vlan || port.native_vlan
  if (vid) return getVlan(vid)?.color ?? null
  if (port.tagged_vlans.length > 0) return getVlan(port.tagged_vlans[0]!)?.color ?? null
  return null
}

function getVlanLabel(port: PublicPort): string | null {
  if (port.tagged_vlans.length > 0) return t('public.port.trunk')
  const vid = port.access_vlan || port.native_vlan
  if (!vid) return null
  const vlan = getVlan(vid)
  return vlan ? `VLAN ${vid}` : null
}

function getPortDetails(port: PublicPort): string | null {
  const parts: string[] = []
  if (port.connected_device) parts.push(port.connected_device)
  if (port.speed) parts.push(port.speed)
  if (port.tagged_vlans.length > 0) {
    const vlanNames = port.tagged_vlans.map(v => v.toString()).join(',')
    parts.push(`${t('public.port.vlans')} ${vlanNames}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}
</script>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/components/public/PublicPortList.vue
git commit -m "feat(ui): add PublicPortList component with filter tabs"
```

---

### Task 15: E2E tests

**Files:**
- Create: `tests/e2e/public-switch-view.spec.ts`

- [ ] **Step 1: Write E2E tests**

```typescript
// tests/e2e/public-switch-view.spec.ts
import { test, expect } from '@playwright/test'

const BASE = 'http://127.0.0.1:3000'

test.describe('Public Switch View', () => {
  let validToken: string
  let authCookie: string

  test.beforeAll(async ({ request }) => {
    // Login to get auth cookie
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { username: 'admin', password: 'admin123!' }
    })
    const cookies = loginRes.headers()['set-cookie']
    authCookie = cookies?.split(';')[0] || ''

    // Find an existing switch
    const switchesRes = await request.get(`${BASE}/api/switches`, {
      headers: { Cookie: authCookie }
    })
    const switches = await switchesRes.json()

    if (switches.length === 0) {
      test.skip()
      return
    }

    const switchId = switches[0].id

    // Create public token
    const tokenRes = await request.post(`${BASE}/api/switches/${switchId}/public-token`, {
      headers: { Cookie: authCookie }
    })

    if (tokenRes.ok()) {
      const tokenData = await tokenRes.json()
      validToken = tokenData.token
    }
  })

  test('public API returns 404 for invalid token', async ({ request }) => {
    const res = await request.get(`${BASE}/api/p/nonexistent-token-12345678901`)
    expect(res.status()).toBe(404)
  })

  test('public API returns 200 for valid token', async ({ request }) => {
    test.skip(!validToken, 'No valid token available')
    const res = await request.get(`${BASE}/api/p/${validToken}`)
    expect(res.status()).toBe(200)

    const data = await res.json()
    expect(data).toHaveProperty('name')
    expect(data).toHaveProperty('ports')
    expect(data).toHaveProperty('vlans')
    expect(data).toHaveProperty('units')
    // Should NOT have sensitive fields
    expect(data).not.toHaveProperty('management_ip')
    expect(data).not.toHaveProperty('serial_number')
    expect(data).not.toHaveProperty('firmware_version')
    expect(data).not.toHaveProperty('notes')

    // Check headers
    expect(res.headers()['x-robots-tag']).toBe('noindex')
    expect(res.headers()['cache-control']).toBe('no-store')
  })

  test('public API returns sanitized ports without internal IDs', async ({ request }) => {
    test.skip(!validToken, 'No valid token available')
    const res = await request.get(`${BASE}/api/p/${validToken}`)
    const data = await res.json()

    if (data.ports.length > 0) {
      const port = data.ports[0]
      expect(port.id).toMatch(/^p-\d+$/)
      expect(port).not.toHaveProperty('connected_device_id')
      expect(port).not.toHaveProperty('connected_port_id')
      expect(port).not.toHaveProperty('mac_address')
      expect(port).not.toHaveProperty('lag_group_id')
      expect(port).not.toHaveProperty('connected_allocation_id')
    }
  })

  test('public page renders without login redirect', async ({ page }) => {
    test.skip(!validToken, 'No valid token available')
    await page.goto(`${BASE}/p/${validToken}`)
    // Should NOT be redirected to login
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain('/login')
    expect(page.url()).toContain(`/p/${validToken}`)
  })

  test('server auth middleware does not block /api/p/', async ({ request }) => {
    // This should return 404 (not found), NOT 401 (auth required)
    const res = await request.get(`${BASE}/api/p/some-fake-token-here-1234567`)
    expect(res.status()).toBe(404)
    expect(res.status()).not.toBe(401)
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/public-switch-view.spec.ts
git commit -m "test(e2e): add public switch view E2E tests"
```

---

### Task 16: Update MIGRATION_STATUS.md and bump version

**Files:**
- Modify: `.ai/MIGRATION_STATUS.md`
- Modify: `package.json`

- [ ] **Step 1: Bump version in package.json**

Update `"version"` from `"0.9.0"` to `"0.10.0"`.

- [ ] **Step 2: Add Phase 19 to MIGRATION_STATUS.md**

Add at the end of the phases section (before Feature Backlog):

```markdown
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
- Unit tests: public-token.test.ts passing
- E2E tests: public-switch-view.spec.ts passing
```

- [ ] **Step 3: Commit**

```bash
git add .ai/MIGRATION_STATUS.md package.json
git commit -m "docs: add Phase 19 (Public QR Switch View) to migration status, bump to v0.10.0"
```

---

### Task 17: Full verification

- [ ] **Step 1: Run unit tests**

Run: `node --import tsx --test tests/*.test.ts`
Expected: All tests pass

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors (or only pre-existing ones)

- [ ] **Step 4: Manual smoke test**

Start dev server: `npm run dev`

1. Navigate to a switch detail page — verify "Public QR Access" section appears
2. Click "Generate Public Link" — verify QR code appears
3. Copy the public URL and open in an incognito window — verify the public view loads without login
4. Verify port grid and port list render correctly
5. Test filter tabs (All/Occupied/Unused)
6. Revoke the token — verify the public URL now shows an error
7. Generate a new link — verify it works

- [ ] **Step 5: Run E2E tests (if app is running)**

Run: `npx playwright test tests/e2e/public-switch-view.spec.ts`
Expected: All tests pass
