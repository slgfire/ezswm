# Nuxt UI v4 Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all Nuxt UI v2 components to Nuxt UI v4 API across the entire ezSWM application.

**Architecture:** Systematic find-and-replace migration of ~550 component usages across ~30 Vue files. Each task targets one component rename/API change and applies it globally. No feature changes — pure API migration.

**Tech Stack:** Nuxt 4.4.2, Nuxt UI 4.5.1, Tailwind CSS 4.1.8, Vue 3.5

---

## Component Migration Reference

| v2 Component | v4 Component | Key Prop Changes |
|---|---|---|
| `UFormGroup` | `UFormField` | — |
| `UDivider` | `USeparator` | — |
| `UDropdown` | `UDropdownMenu` | — |
| `USelect` | `USelect` | `:options` → `:items` |
| `USelectMenu` | `USelectMenu` | `:options` → `:items`, add `:search-input="false"` |
| `UTable` | `UTable` | `:rows` → `:data`, column `key` → `accessorKey`, `label` → `header` |
| `UButton` | `UButton` | `color="gray"` → `color="neutral"` |
| `UBadge` | `UBadge` | `color="gray"` → `color="neutral"` |

Components with NO name/API changes: `UButton`, `UInput`, `UIcon`, `UCard`, `UBadge`, `UTextarea`, `USlideover`, `UForm`, `UTabs`, `UModal`, `UCheckbox`, `UTooltip`

---

### Task 1: Global Component Renames (find-replace)

**Files:** All `.vue` files in `app/`

- [ ] **Step 1: Rename UFormGroup → UFormField**

```bash
find app/ -name "*.vue" -exec sed -i 's/UFormGroup/UFormField/g' {} +
```

- [ ] **Step 2: Rename UDivider → USeparator**

```bash
find app/ -name "*.vue" -exec sed -i 's/UDivider/USeparator/g' {} +
```

- [ ] **Step 3: Rename UDropdown → UDropdownMenu**

```bash
find app/ -name "*.vue" -exec sed -i 's/UDropdown/UDropdownMenu/g' {} +
```

- [ ] **Step 4: Verify renames**

```bash
grep -r "UFormGroup\|UDivider\b\|UDropdown\b" app/ --include="*.vue" | grep -v UDropdownMenu
```

Expected: no output

- [ ] **Step 5: Commit**

```bash
git add app/ && git commit -m "refactor: rename UFormGroup→UFormField, UDivider→USeparator, UDropdown→UDropdownMenu"
```

---

### Task 2: USelect and USelectMenu — `:options` → `:items`

**Files:** All `.vue` files using USelect or USelectMenu with `:options`

- [ ] **Step 1: Fix USelectMenu — rename :options to :items, add :search-input="false"**

For each `<USelectMenu` in the codebase:
- Replace `:options=` with `:items=`
- Add `:search-input="false"` (v2 had no search by default)
- Keep `option-attribute` and `value-attribute` props (still valid)

- [ ] **Step 2: Fix USelect — rename :options to :items**

For each `<USelect` in the codebase:
- Replace `:options=` with `:items=`

- [ ] **Step 3: Verify**

```bash
grep -r ':options=' app/ --include="*.vue" | grep -E "USelect|USelectMenu"
```

Expected: no output

- [ ] **Step 4: Commit**

```bash
git add app/ && git commit -m "refactor: USelect/USelectMenu :options → :items, add :search-input=false"
```

---

### Task 3: UTable — `:rows` → `:data`, column schema changes

**Files:** All `.vue` files using UTable

- [ ] **Step 1: Find all UTable usages**

```bash
grep -rn "UTable\|:rows=\|:columns=" app/ --include="*.vue"
```

- [ ] **Step 2: Replace `:rows=` with `:data=`**

- [ ] **Step 3: Update column definitions — `key` → `accessorKey`, `label` → `header`**

For each computed `columns` array, update:
```ts
// Before
{ key: 'name', label: t('fields.name') }
// After
{ accessorKey: 'name', header: t('fields.name') }
```

- [ ] **Step 4: Update table slot names**

v2 slot pattern: `#name-data="{ row }"`
v4 slot pattern: `#name-cell="{ row }"`

- [ ] **Step 5: Verify and test**

- [ ] **Step 6: Commit**

```bash
git add app/ && git commit -m "refactor: UTable :rows→:data, column key→accessorKey, label→header"
```

---

### Task 4: UButton/UBadge color changes

**Files:** All `.vue` files using `color="gray"` on UButton or UBadge

- [ ] **Step 1: Replace color="gray" with color="neutral" on UButton**

```bash
grep -rn 'color="gray"' app/ --include="*.vue"
```

For each occurrence on a UButton or UBadge, change to `color="neutral"`.

- [ ] **Step 2: Commit**

```bash
git add app/ && git commit -m "refactor: UButton/UBadge color='gray' → color='neutral'"
```

---

### Task 5: Icon set — heroicons → lucide (if needed)

**Files:** All `.vue` files using `i-heroicons-*` icon names

- [ ] **Step 1: Check if heroicons still work in v4**

Nuxt UI v4 defaults to lucide but heroicons should still work via @iconify. Test if existing `i-heroicons-*` icons render. If they do, skip this task.

- [ ] **Step 2: If icons don't render, install heroicons iconify set**

```bash
npm install --save-exact @iconify-json/heroicons
```

- [ ] **Step 3: Commit if changes were needed**

---

### Task 6: Dev server test — fix remaining build errors

**Files:** Various

- [ ] **Step 1: Start dev server**

```bash
rm -rf .nuxt && npx nuxt dev --port 3000
```

- [ ] **Step 2: Open browser, navigate all pages, fix console errors**

- [ ] **Step 3: Fix any remaining component API issues**

- [ ] **Step 4: Commit fixes**

---

### Task 7: Production build + Docker

- [ ] **Step 1: Run production build**

```bash
npm run build
```

- [ ] **Step 2: Fix any build errors**

- [ ] **Step 3: Docker build**

```bash
docker compose build --no-cache
```

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "feat: complete Nuxt UI v4 migration"
```
