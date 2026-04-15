# Keyboard Shortcuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add global Esc key handling to close search results and mobile sidebar, complementing existing `/` search focus and native Nuxt UI Esc handling for modals/slideovers.

**Architecture:** Single global keydown listener in `default.vue` layout. AppHeader exposes a `dismissSearch()` method (hides results, keeps query) and `isSearchOpen` state via defineExpose. Existing inline dismiss paths (`@keydown.escape`, click-outside overlay) are replaced with calls to `dismissSearch()` to keep a single source of truth.

**Tech Stack:** Vue 3 (onMounted, onUnmounted, defineExpose, template ref), Playwright (E2E)

**Prerequisites:** E2E tests require the dev server running on `http://localhost:3000` (no `webServer` in playwright.config.ts). Start with `npm run dev` in a separate terminal before running Playwright.

---

### What already works

- `/` focuses search input (AppHeader.vue:362-367)
- `Esc` closes search results when search input is focused (AppHeader.vue:24 — sets `showResults = false`, keeps query)
- `Esc` closes USlideover and UModal natively (Reka UI `escapeKeyDown` + `dismissible: true`)

### What this plan adds

- Global `Esc` closes search results even when search input is NOT focused (same behavior as the existing input-scoped Esc: hides results, keeps query intact)
- Global `Esc` closes mobile sidebar overlay
- Deduplicates existing search dismiss paths into one `dismissSearch()` function

### Priority order (per Esc press)

1. Search results open → dismiss results (keep query)
2. Mobile sidebar open → close mobile sidebar
3. Otherwise → do nothing (let Nuxt UI handle modals/slideovers natively)

Note: The search and mobile sidebar states are not simultaneously user-reachable (the sidebar overlay covers the header at mobile viewports), so the priority order is defensive — it ensures correct behavior if future layout changes make both states coexist. No E2E test for this edge case.

---

### Task 1: Add test infrastructure (data-testid attributes)

**Files:**
- Modify: `app/components/layout/AppHeader.vue`
- Modify: `app/layouts/default.vue`

- [ ] **Step 1: Add data-testid to search input and results dropdown in AppHeader.vue**

Add `data-testid="search-input"` to the search input element (line 17). Also change `@keydown.escape="showResults = false"` to `@keydown.escape="dismissSearch"` (the function is added in Step 3):

```html
<input
  ref="searchInputRef"
  v-model="searchQuery"
  :placeholder="$t('common.search')"
  data-testid="search-input"
  class="w-64 border-0 bg-transparent py-1.5 pl-2 font-mono text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-white dark:placeholder-gray-500"
  autocomplete="off"
  @focus="showResults = true"
  @keydown.escape="dismissSearch"
  @keydown.down.prevent="moveSelection(1)"
  @keydown.up.prevent="moveSelection(-1)"
  @keydown.enter.prevent="navigateToSelected"
/>
```

Add `data-testid="search-results"` to the search results dropdown div (line 33):

```html
<div
  v-if="showResults && searchQuery.length >= 2"
  data-testid="search-results"
  class="absolute left-0 top-full z-50 mt-1 w-96 rounded-lg border border-default bg-default shadow-lg"
>
```

- [ ] **Step 2: Add data-testid to mobile menu button and sidebar overlay**

In `AppHeader.vue`, add `data-testid="mobile-menu-button"` to the mobile menu UButton (line 5):

```html
<UButton
  class="lg:hidden"
  variant="ghost"
  color="neutral"
  icon="i-heroicons-bars-3"
  data-testid="mobile-menu-button"
  @click="$emit('toggleSidebar')"
/>
```

In `app/layouts/default.vue`, add `data-testid="mobile-sidebar-overlay"` to the mobile sidebar overlay div (line 14):

```html
<div v-if="mobileSidebarOpen" data-testid="mobile-sidebar-overlay" class="fixed inset-0 z-40 lg:hidden">
```

- [ ] **Step 3: Add dismissSearch function, deduplicate dismiss paths, add defineExpose in AppHeader.vue**

Add `dismissSearch` function above the existing `closeSearch` function (line 355):

```typescript
function dismissSearch() {
  showResults.value = false
}
```

Update the click-outside overlay (line 201) to use `dismissSearch` instead of inline assignment:

```html
<div v-if="showResults && searchQuery.length >= 2" class="fixed inset-0 z-40" @click="dismissSearch" />
```

Add defineExpose at the end of the `<script setup>` block:

```typescript
defineExpose({
  dismissSearch,
  isSearchOpen: computed(() => showResults.value && searchQuery.value.length >= 2),
})
```

- [ ] **Step 4: Verify typecheck and build**

Run: `npm run typecheck`
Expected: exit code 0 (note: a `vue-router/volar/sfc-route-blocks` resolution warning may appear — this is pre-existing and not a failure)

Run: `npm run build`
Expected: exit code 0

- [ ] **Step 5: Commit**

```bash
git add app/components/layout/AppHeader.vue app/layouts/default.vue
git commit -m "refactor(header): add dismissSearch, data-testid attrs, deduplicate dismiss paths"
```

---

### Task 2: Write E2E tests for keyboard shortcuts

**Files:**
- Create: `tests/e2e/keyboard-shortcuts.spec.ts`

**Prerequisite:** Dev server must be running on `http://localhost:3000`.

- [ ] **Step 1: Write E2E tests**

Create `tests/e2e/keyboard-shortcuts.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Keyboard Shortcuts', () => {
  test('/ focuses search input', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('search-input')).toBeVisible()

    await page.keyboard.press('/')
    await expect(page.getByTestId('search-input')).toBeFocused()
  })

  test('Esc dismisses search results without clearing query (input focused)', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.getByTestId('search-input')

    // Type a query to trigger results
    await searchInput.click()
    await searchInput.fill('test')
    await expect(page.getByTestId('search-results')).toBeVisible({ timeout: 3000 })

    // Esc while input focused — should hide results, keep query
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('search-results')).toBeHidden()
    await expect(searchInput).toHaveValue('test')
  })

  test('Esc dismisses search results globally (input NOT focused)', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.getByTestId('search-input')

    // Type a query to trigger results
    await searchInput.click()
    await searchInput.fill('test')
    await expect(page.getByTestId('search-results')).toBeVisible({ timeout: 3000 })

    // Blur the input by pressing Tab (avoids triggering click-outside overlay)
    await page.keyboard.press('Tab')
    await expect(searchInput).not.toBeFocused()

    // Results should still be visible after Tab
    await expect(page.getByTestId('search-results')).toBeVisible()

    // Now press Esc globally — this exercises the new global handler
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('search-results')).toBeHidden()
    await expect(searchInput).toHaveValue('test')
  })

  test('Esc closes mobile sidebar', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')

    // Open mobile sidebar via hamburger menu
    await expect(page.getByTestId('mobile-menu-button')).toBeVisible()
    await page.getByTestId('mobile-menu-button').click()

    // Sidebar overlay should be visible
    await expect(page.getByTestId('mobile-sidebar-overlay')).toBeVisible()

    // Press Esc — should close sidebar
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('mobile-sidebar-overlay')).toBeHidden()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx playwright test tests/e2e/keyboard-shortcuts.spec.ts --project=chromium`
Expected: at minimum, "Esc dismisses search results globally" and "Esc closes mobile sidebar" fail because the global handler doesn't exist yet.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/keyboard-shortcuts.spec.ts
git commit -m "test(shortcuts): E2E tests for / focus, global Esc dismiss, mobile sidebar close"
```

---

### Task 3: Implement global Esc listener in default layout

**Files:**
- Modify: `app/layouts/default.vue`

- [ ] **Step 1: Add headerRef and LayoutAppHeader ref binding**

In the `<template>`, change the LayoutAppHeader line from:

```html
<LayoutAppHeader @toggle-sidebar="mobileSidebarOpen = !mobileSidebarOpen" />
```

to:

```html
<LayoutAppHeader ref="headerRef" @toggle-sidebar="mobileSidebarOpen = !mobileSidebarOpen" />
```

- [ ] **Step 2: Add the global Esc handler in script setup**

Add the following after the existing `mobileSidebarOpen` ref in `<script setup>`:

```typescript
const headerRef = ref<{ dismissSearch: () => void; isSearchOpen: boolean } | null>(null)

function onGlobalEsc(e: KeyboardEvent) {
  if (e.key !== 'Escape') return

  // 1. Search results open → dismiss (hide results, keep query)
  if (headerRef.value?.isSearchOpen) {
    headerRef.value.dismissSearch()
    return
  }

  // 2. Mobile sidebar open → close it
  if (mobileSidebarOpen.value) {
    mobileSidebarOpen.value = false
    return
  }

  // 3. Otherwise: let Nuxt UI handle modals/slideovers natively
}

onMounted(() => {
  document.addEventListener('keydown', onGlobalEsc)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onGlobalEsc)
})
```

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run typecheck`
Expected: exit code 0 (pre-existing `vue-router/volar/sfc-route-blocks` warning may appear)

Run: `npm run build`
Expected: exit code 0

- [ ] **Step 4: Run E2E tests to verify they pass**

Run: `npx playwright test tests/e2e/keyboard-shortcuts.spec.ts --project=chromium`
Expected: all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add app/layouts/default.vue
git commit -m "feat(shortcuts): global Esc to close search results and mobile sidebar"
```

---

### Task 4: Update MIGRATION_STATUS

**Files:**
- Modify: `.ai/MIGRATION_STATUS.md`

- [ ] **Step 1: Update the Latest Stage header**

Replace lines 3-7:

Old:
```markdown
## Latest Stage

Date: 2026-03-16
Stage: Phases 1-10 — Full MVP Implementation
Status: Complete
```

New:
```markdown
## Latest Stage

Date: 2026-04-09
Stage: Phase 18 — Keyboard Shortcuts
Status: Complete
```

- [ ] **Step 2: Add Phase 18 section after Phase 17**

Insert after the `---` separator on line 406 (immediately after Phase 17's `**Version:** 0.8.0`):

```markdown

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
- E2E tests: 4/4 passing
```

- [ ] **Step 3: Remove keyboard shortcuts from Feature Backlog Quick Wins**

On line 414, remove:

```
- Keyboard shortcuts — `/` to focus search, `Esc` to close panels
```

- [ ] **Step 4: Commit**

```bash
git add .ai/MIGRATION_STATUS.md
git commit -m "docs: add Phase 18 keyboard shortcuts to MIGRATION_STATUS"
```
