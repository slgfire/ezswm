# Dashboard Shell Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-rolled layout shell (`default.vue` + custom `AppSidebar` / `AppHeader`) with official Nuxt UI v4 dashboard components (`UDashboardGroup`, `UDashboardSidebar`, `UDashboardNavbar`), preserving all behavior and visuals.

**Architecture:** Layout-only swap. `UDashboardGroup` wraps a `UDashboardSidebar` plus a content column whose top is a `UDashboardNavbar`; pages are untouched. Sidebar collapse persists via cookie; the mobile slideover + route-close + Esc come from the components, replacing custom code. Search stays inline in the navbar; breadcrumbs stay a separate bar.

**Tech Stack:** Nuxt 4, Nuxt UI v4 (4.8.2), TypeScript, Tailwind (via Nuxt UI), Vitest, Playwright.

**Spec:** `.ai/specs/REFACTOR_DASHBOARD_SHELL.md`

**Branch:** `refactor/dashboard-shell-nuxtui` (already created; spec committed there).

---

## Key facts (verified against Nuxt UI 4.8.2 source)

- `UDashboardGroup` theme = `fixed inset-0 flex overflow-hidden`; provides the dashboard
  context. Prop `unit` (default `%`) sets the size unit; `storage` default `cookie`.
- `UDashboardSidebar` root theme = `relative hidden lg:flex flex-col min-h-svh min-w-16 w-(--width) shrink-0`.
  Slots: `#header`, **default (body)**, `#footer` — each gets `{ collapsed, collapse }` and
  renders in BOTH the desktop sidebar and the mobile slideover. **Never override `#content`**
  (the mobile-menu wrapper). Width = `defaultSize` in the group's `unit`; `min-w-16` floors
  the collapsed rail at 64px. Props: `collapsible`, `mode` (default `slideover`),
  `autoClose` (default `true`), `default-size` (default 15).
- Toggle/collapse are wired by **global runtime hooks** (`dashboard:sidebar:toggle`,
  `dashboard:sidebar:collapse`), so a toggle in the navbar controls the sidebar regardless
  of tree position. Sidebar auto-closes on route change. `UDashboardSidebarToggle` theme is
  `lg:hidden` (no desktop hamburger).
- `UDashboardNavbar` slots: `#toggle`, `#left`, `#leading`, `#title`, `#right`, default
  (center, theme `hidden lg:flex`). Renders the toggle on the left when `toggleSide="left"`.

## Files

- Modify: `app/components/layout/AppSidebar.vue` — full rewrite to `UDashboardSidebar`.
- Modify: `app/components/layout/AppHeader.vue` — template root → `UDashboardNavbar`; add search-Escape handler; script otherwise unchanged.
- Modify: `app/layouts/default.vue` — full rewrite to `UDashboardGroup`; drop custom shell code.
- Modify: `tests/e2e/keyboard-shortcuts.spec.ts` — retarget mobile-sidebar assertion (CI-gating).
- Modify: `tests/e2e/navigation.spec.ts` — `aside a` → `nav a` (not in CI set; correctness).
- Modify: `package.json` — version `0.29.0` → `0.30.0`.
- Modify: `.ai/MIGRATION_STATUS.md` — new phase entry.
- Unchanged: `SiteSwitcher.vue`, `AppBreadcrumbs.vue`, `ChangelogModal.vue`, all pages, `auth`/`print`/`public` layouts. `AppFooter.vue` (dead) left as-is.

> **Note on verification:** this is a layout/visual refactor — there is no unit-test
> surface, so tasks verify via `pnpm typecheck` + `pnpm lint` + `pnpm dev` (manual) +
> the existing Playwright e2e. Commit after each task.

---

### Task 1: Rewrite `AppSidebar.vue` to `UDashboardSidebar`

**Files:**
- Modify: `app/components/layout/AppSidebar.vue` (full replace)

- [ ] **Step 1: Replace the entire file**

```vue
<template>
  <UDashboardSidebar
    collapsible
    :default-size="16"
    :ui="{ header: 'px-4', body: 'p-0 gap-0', footer: 'px-2 py-2' }"
  >
    <!-- Logo (single header row) -->
    <template #header="{ collapsed }">
      <NuxtLink :to="sitePrefix" class="font-display text-xl font-bold">
        <span class="text-primary-500">ez</span><span v-if="!collapsed" class="tracking-tight text-gray-900 dark:text-white">SWM</span>
      </NuxtLink>
    </template>

    <!-- Site switcher (first) + navigation -->
    <template #default="{ collapsed }">
      <LayoutSiteSwitcher v-if="!collapsed" />
      <nav class="flex-1 overflow-y-auto px-2 py-4">
        <ul class="space-y-1">
          <template v-for="(section, sectionIdx) in navSections" :key="sectionIdx">
            <li v-if="section.divider" class="my-3 border-t border-default" />
            <li v-for="item in section.items" :key="item.to">
              <NuxtLink
                :to="item.to"
                :title="collapsed ? $t(item.label) : undefined"
                class="relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                :class="[
                  isActive(item.to)
                    ? 'sidebar-active bg-primary-500/10 text-primary-500 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white',
                  collapsed ? 'justify-center' : ''
                ]"
              >
                <UIcon :name="item.icon" class="h-5 w-5 flex-shrink-0" />
                <span v-if="!collapsed">{{ $t(item.label) }}</span>
              </NuxtLink>
            </li>
          </template>
        </ul>
      </nav>
    </template>

    <!-- Footer: version/github (hidden when collapsed) + collapse toggle (always) -->
    <template #footer="{ collapsed }">
      <div v-if="!collapsed" class="flex items-center gap-2.5 px-1 font-mono text-sm text-neutral-500">
        <button
          type="button"
          class="relative transition-colors hover:text-primary-500"
          @click="changelogOpen = true"
        >
          v{{ version }}
          <span
            v-if="updateAvailable"
            :title="$t('changelog.updateAvailable')"
            class="absolute -right-2.5 -top-1 h-2 w-2 rounded-full bg-primary-500"
          />
        </button>
        <a href="https://github.com/slgfire/ezswm" target="_blank" rel="noopener" class="text-neutral-400 hover:text-primary-500 transition-colors">
          <UIcon name="i-simple-icons-github" class="h-4.5 w-4.5" />
        </a>
      </div>
      <UDashboardSidebarCollapse class="ml-auto" />
    </template>

    <LayoutChangelogModal v-model:open="changelogOpen" />
  </UDashboardSidebar>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const version = config.public.appVersion

const changelogOpen = ref(false)
const { updateAvailable, load } = useVersionCheck()
onMounted(() => load())

const route = useRoute()
const { currentSiteId } = useCurrentSite()

const sitePrefix = computed(() => `/sites/${currentSiteId.value}`)

const navSections = computed(() => [
  {
    items: [
      { to: sitePrefix.value, icon: 'i-heroicons-home', label: 'nav.dashboard' }
    ]
  },
  {
    divider: true,
    items: [
      { to: `${sitePrefix.value}/switches`, icon: 'i-heroicons-server-stack', label: 'nav.switches' },
      { to: `${sitePrefix.value}/vlans`, icon: 'i-heroicons-tag', label: 'nav.vlans' },
      { to: `${sitePrefix.value}/subnets`, icon: 'i-heroicons-globe-alt', label: 'nav.networks' },
      { to: `${sitePrefix.value}/ip-addresses`, icon: 'i-heroicons-map-pin', label: 'nav.ipAddresses' }
    ]
  },
  {
    divider: true,
    items: [
      ...(currentSiteId.value !== 'all' ? [{ to: `${sitePrefix.value}/topology`, icon: 'i-heroicons-share', label: 'nav.topology' }] : []),
      { to: '/tools/subnet-calculator', icon: 'i-heroicons-calculator', label: 'nav.subnetCalculator' }
    ]
  },
  {
    divider: true,
    items: [
      { to: '/layout-templates', icon: 'i-heroicons-rectangle-group', label: 'nav.layoutTemplates' },
      { to: '/data-management', icon: 'i-heroicons-circle-stack', label: 'nav.dataManagement' }
    ]
  },
  {
    divider: true,
    items: [
      { to: '/sites', icon: 'i-heroicons-building-office-2', label: 'nav.sites' },
      { to: '/settings', icon: 'i-heroicons-cog-6-tooth', label: 'nav.settings' }
    ]
  }
])

function isActive(path: string): boolean {
  // Exact match for Sites management page
  if (path === '/sites') {
    return route.path === '/sites' || route.path === '/sites/'
  }
  // Site-scoped paths
  if (path.startsWith('/sites/')) {
    // Dashboard (/sites/:id) — exact match only
    const isDashboard = path.match(/^\/sites\/[^/]+$/)
    if (isDashboard) {
      return route.path === path || route.path === path + '/'
    }
    return route.path.startsWith(path)
  }
  // Global paths
  return route.path === path || route.path.startsWith(path + '/')
}
</script>
```

Notes:
- `collapsed`/`toggle` props are gone; the component manages collapse via the global hook.
- `isActive` and `navSections` are copied **verbatim** from the old file.
- `:ui` zeroes the body padding so the inner `<nav>` (`px-2 py-4`) and `SiteSwitcher`
  (its own `border-b px-3 py-2`) keep their current spacing.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/layout/AppSidebar.vue
git commit -m "refactor(layout): AppSidebar uses UDashboardSidebar"
```

---

### Task 2: Rewrite `AppHeader.vue` template to `UDashboardNavbar`

The `<script setup>` stays as-is **except** the search-Escape handler below. Only the
`<template>` and the `onMounted` keydown listener change.

**Files:**
- Modify: `app/components/layout/AppHeader.vue`

- [ ] **Step 1: Restructure the `<template>` block**

This is a **move**, not a rewrite: the search `<div>`, the theme/lang/user buttons,
and the click-outside overlay are the existing nodes, relocated into navbar slots.
Concretely:
1. Change the root `<header class="...">…</header>` to `<UDashboardNavbar :ui="{ root: 'gap-2', center: 'flex min-w-0', right: 'gap-2' }">…</UDashboardNavbar>`.
2. **Delete** the mobile-menu `UButton` (the one with `data-testid="mobile-menu-button"`)
   and the two wrapper `<div class="flex items-center …">`s.
3. Add `<template #toggle><UDashboardSidebarToggle data-testid="mobile-menu-button" /></template>`.
4. Move the **entire existing search block** — the `<div class="relative hidden sm:block">`
   …through its results-dropdown… `</div>` (currently lines ~15–193, unchanged inside) —
   into `<template #default>…</template>`, and change only that outer wrapper's class from
   `relative hidden sm:block` to `relative hidden w-full sm:block`.
5. Move the existing theme-toggle `ClientOnly`, language `UDropdownMenu`, and user
   `UDropdownMenu` (unchanged) into `<template #right>…</template>`.
6. Keep the trailing `<div v-if="showResults && searchQuery.length >= 2" class="fixed inset-0 z-40" @click="dismissSearch" />` as a **sibling** after `</UDashboardNavbar>` (multi-root template).

The result is exactly this structure (search internals and button internals unchanged):

```vue
<template>
  <UDashboardNavbar :ui="{ root: 'gap-2', center: 'flex min-w-0', right: 'gap-2' }">
    <template #toggle>
      <UDashboardSidebarToggle data-testid="mobile-menu-button" />
    </template>

    <template #default>
      <!-- Search -->
      <div class="relative hidden w-full sm:block">
        <div class="flex items-center rounded-md border border-default bg-elevated px-3" @click="searchInputRef?.focus()">
          <span class="font-mono text-xs font-semibold text-primary-500 select-none">&gt;_</span>
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
          >
          <kbd class="ml-auto hidden rounded border border-default bg-default px-1.5 py-0.5 font-mono text-[10px] text-gray-500 lg:inline-block">/</kbd>
        </div>

        <!-- Search results dropdown (UNCHANGED: copy the existing results markup verbatim) -->
        <div
          v-if="showResults && searchQuery.length >= 2"
          data-testid="search-results"
          class="absolute left-0 top-full z-50 mt-1 w-96 rounded-lg border border-default bg-default shadow-lg"
        >
          <!-- ... keep the entire existing results dropdown content unchanged ... -->
        </div>
      </div>
    </template>

    <template #right>
      <!-- Theme toggle with view transition -->
      <ClientOnly>
        <UButton
          ref="colorModeBtn"
          variant="ghost"
          color="neutral"
          :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
          :aria-label="`Switch to ${isDark ? 'light' : 'dark'} mode`"
          @click="toggleWithTransition"
        />
        <template #fallback>
          <div class="size-8" />
        </template>
      </ClientOnly>

      <!-- Language switcher -->
      <UDropdownMenu :items="languageItems" :content="{ align: 'end' }">
        <UButton variant="ghost" color="neutral" class="gap-1.5" :aria-label="$t('common.language')">
          <UIcon name="i-heroicons-language" class="h-5 w-5" />
          <span class="hidden text-sm font-medium uppercase sm:inline">{{ locale }}</span>
        </UButton>
      </UDropdownMenu>

      <!-- User menu -->
      <UDropdownMenu :items="userMenuItems" :content="{ align: 'end' }">
        <UButton variant="ghost" color="neutral" class="gap-2">
          <UIcon name="i-heroicons-user-circle" class="h-5 w-5" />
          <span class="hidden sm:inline text-sm">{{ user?.display_name }}</span>
        </UButton>
      </UDropdownMenu>
    </template>
  </UDashboardNavbar>

  <!-- Search click-outside overlay (sibling root node) -->
  <div v-if="showResults && searchQuery.length >= 2" class="fixed inset-0 z-40" @click="dismissSearch" />
</template>
```

**Important:** in Step 1 do NOT delete the existing results-dropdown inner markup —
copy the full existing block (Switches / VLANs / Networks / Allocations / Ranges /
Templates / LAG Groups groups) verbatim into the `<!-- ... -->` placeholder above. Only
the wrappers changed (header → navbar slots); the search internals are identical. The
mobile-menu `UButton` and the old `<header>`/wrapper `<div>`s are removed.

- [ ] **Step 2: Add a search-Escape handler in `onMounted`**

The global Esc handler is being removed from `default.vue` (Task 3). Preserve
"Escape closes open search results" by extending AppHeader's existing `onMounted`
keydown listener. Replace the current `onMounted(() => { ... })` block with:

```ts
onMounted(() => {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
      e.preventDefault()
      searchInputRef.value?.focus()
    } else if (e.key === 'Escape' && showResults.value) {
      dismissSearch()
    }
  })
})
```

(The input's own `@keydown.escape="dismissSearch"` stays for the focused case; this
adds the blurred case the global handler used to cover.)

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/components/layout/AppHeader.vue
git commit -m "refactor(layout): AppHeader uses UDashboardNavbar; search Esc self-contained"
```

---

### Task 3: Rewrite `default.vue` to `UDashboardGroup`

**Files:**
- Modify: `app/layouts/default.vue` (full replace)

- [ ] **Step 1: Replace the entire file**

```vue
<template>
  <UDashboardGroup unit="rem">
    <!-- Skip to main content (a11y) -->
    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-primary-500 focus:px-4 focus:py-2 focus:text-white focus:outline-none">
      Skip to main content
    </a>

    <LayoutAppSidebar />

    <div class="flex flex-1 flex-col overflow-hidden">
      <LayoutAppHeader />
      <LayoutAppBreadcrumbs />
      <main id="main-content" class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </UDashboardGroup>
</template>
```

Removed: `sidebarCollapsed` / `mobileSidebarOpen` refs, the mobile-overlay `<div>`, the
`onGlobalEsc` handler and its listeners, the `headerRef`. No `<script setup>` is needed
(delete it). Mobile open/close, route-close, and Escape are handled by the components.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS, 0 errors. (If `AppHeader`'s `defineExpose({ dismissSearch, isSearchOpen })`
now triggers an unused warning, it is harmless; optionally remove it.)

- [ ] **Step 3: Manual smoke (desktop)**

Run: `pnpm dev`, open the app, log in.
Expected: sidebar (logo, site switcher, nav, footer version + collapse chevron), navbar
(search center, theme/lang/user right), breadcrumb bar, content. No console errors.
Collapse the sidebar → icon rail (icons only); reload → still collapsed (cookie).

- [ ] **Step 4: Commit**

```bash
git add app/layouts/default.vue
git commit -m "refactor(layout): default layout uses UDashboardGroup; drop custom shell code"
```

---

### Task 4: Update e2e specs

**Files:**
- Modify: `tests/e2e/keyboard-shortcuts.spec.ts`
- Modify: `tests/e2e/navigation.spec.ts`

- [ ] **Step 1: Retarget the mobile-sidebar assertion (keyboard-shortcuts.spec.ts)**

The `mobile-menu-button` testid is preserved (added to the navbar toggle). The
`mobile-sidebar-overlay` testid no longer exists — the mobile sidebar is a Nuxt UI
slideover (`role="dialog"`). Replace the two `mobile-sidebar-overlay` lines in the
`'Esc closes mobile sidebar'` test:

```ts
    // Sidebar slideover should be visible
    await expect(page.getByRole('dialog')).toBeVisible()

    // Press Esc — should close sidebar
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
```

- [ ] **Step 2: Fix the sidebar selector (navigation.spec.ts)**

The desktop sidebar root is now a `<div>` containing a `<nav>` (not `<aside>`). Replace
each `aside a[href="..."]` with `nav a[href="..."]`:

```ts
    await page.locator('nav a[href="/switches"]').click()
    // ...
    await page.locator('nav a[href="/vlans"]').click()
    // ...
    await page.locator('nav a[href="/networks"]').click()
    // ...
    await page.locator('nav a[href="/settings"]').click()
```

- [ ] **Step 3: Run the CI-gating e2e against a built server**

e2e runs against the production build (as CI does), not `pnpm dev`. In one shell:
`pnpm build` then start the server, e.g.
`NUXT_DATA_DIR=/tmp/ezswm-e2e PORT=3000 node .output/server/index.mjs`.
In another: `pnpm exec playwright test tests/e2e/keyboard-shortcuts.spec.ts`.
Expected: PASS (search shortcuts + mobile sidebar open/close).

(CI runs only `settings`, `keyboard-shortcuts`, `subnet-calculator`. `navigation.spec.ts`
is fixed for correctness but is not in the CI set.)

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/keyboard-shortcuts.spec.ts tests/e2e/navigation.spec.ts
git commit -m "test(e2e): retarget layout selectors to Nuxt UI dashboard shell"
```

---

### Task 5: Version bump, docs, full verification

**Files:**
- Modify: `package.json`
- Modify: `.ai/MIGRATION_STATUS.md`

- [ ] **Step 1: Bump version**

In `package.json`, change `"version": "0.29.0"` to `"version": "0.30.0"`.

- [ ] **Step 2: Add a MIGRATION_STATUS entry**

Prepend under `## Latest Stage` (mirror the existing entry format):

```markdown
## Latest Stage

Date: 2026-06-15
Stage: Layout shell migrated to Nuxt UI v4 dashboard components
Status: Complete
Version: 0.30.0

### Refactor: hand-rolled shell → UDashboardGroup/Sidebar/Navbar (v0.30.0)

The custom flexbox layout (`default.vue` + bespoke `AppSidebar`/`AppHeader`, mobile
overlay, global Esc handler) is replaced by official Nuxt UI v4 dashboard components,
bringing the project into line with its own CLAUDE.md rule ("do not create a custom
dashboard shell"). `UDashboardGroup` (unit="rem") wraps `UDashboardSidebar` (collapse
persists via cookie, mobile slideover + route-close + Esc handled by the component) and
a content column whose top is `UDashboardNavbar`. Search stays inline in the navbar
center slot; breadcrumbs stay a separate bar. Sidebar width pinned to 16rem (=256px) with
a 64px icon rail via `min-w-16`. All pages untouched. e2e selectors updated
(`mobile-sidebar-overlay` → slideover `role="dialog"`; `aside a` → `nav a`).
```

- [ ] **Step 3: Full verification suite**

Run each; all must pass:
```bash
pnpm typecheck     # 0 errors
pnpm lint          # No issues
pnpm test          # vitest green
pnpm build         # build complete
```
Manual (`pnpm dev`): desktop layout visually matches the old one; sidebar collapse
persists across reload; mobile (≤1024px) shows hamburger, opens slideover, closes on
nav-link click and on Esc; search `/` focuses, arrow-key nav, Esc closes, click
navigates; theme toggle, language switch, user menu work; sidebar width is ~256px
(not fluid) at several viewport widths.

- [ ] **Step 4: Commit**

```bash
git add package.json .ai/MIGRATION_STATUS.md
git commit -m "chore: bump to v0.30.0; document dashboard shell refactor"
```

---

## Self-review notes (already reconciled with the spec)

- All 6 spec risks have tasks: e2e selectors (Task 4), Esc-search (Task 2 Step 2),
  collapse+nav (Task 1, `collapsed` slot props + rail), search slot styling (Task 2,
  `center: 'flex'` + `hidden sm:block` + click-outside sibling), mobile slideover
  (component default + Task 3 manual), sidebar width (Task 3, `unit="rem"` +
  `:default-size="16"`).
- Names consistent across tasks: `isActive`, `navSections`, `sitePrefix`, `dismissSearch`,
  `languageItems`, `userMenuItems`, `searchInputRef`, `showResults`, `searchQuery`.
- No page files touched; `SiteSwitcher`/`AppBreadcrumbs`/`ChangelogModal` unchanged.

## Final integration

After Task 5, push the branch and open a PR (per project workflow); test the per-PR
GHCR image (`pr-<n>`) before merging. Merging to `main` auto-tags `v0.30.0`.
