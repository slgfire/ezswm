# Design: Migrate custom layout shell to Nuxt UI v4 dashboard components

Date: 2026-06-15
Status: Approved design (pending spec review)
Target version: 0.30.0 (minor — UI-structural, backwards-compatible)

## Context

The app's layout shell is hand-rolled: `app/layouts/default.vue` is a custom
flexbox shell wrapping custom `LayoutAppSidebar` / `LayoutAppHeader` /
`LayoutAppBreadcrumbs` components, with bespoke mobile-sidebar overlay logic and a
global Escape-key handler. This directly contradicts the project's own rule in
`CLAUDE.md`: *"Do NOT create a custom dashboard shell."*

Nuxt UI v4 (4.8.2, already installed) ships the full dashboard component set
(`UDashboardGroup`, `UDashboardSidebar`, `UDashboardNavbar`,
`UDashboardSidebarCollapse`, etc.). This refactor replaces the hand-rolled shell
with those official components, bringing the project into compliance and removing
custom code (mobile overlay, Esc handling, manual collapse state).

**This is purely structural — no functional or visual change to the app.** All
pages stay untouched, all feature logic (search, theme toggle, language switcher,
breadcrumbs, site switcher) is preserved.

### Decisions locked during brainstorming

- **Global search:** stays **inline** in the navbar (the current `>_` prompt +
  dropdown with 7 result types, keyboard nav, highlight, `/` shortcut). NOT
  migrated to a `UDashboardSearch` command palette.
- **Breadcrumbs:** stay as their **own thin bar** under the navbar (current look),
  not folded into the navbar.
- **Approach:** **layout-only full shell swap.** The navbar lives in the layout
  (not per-page `UDashboardPanel`), so no page files change.
- **Nav links:** keep the **custom `NuxtLink` nav** (preserve the exact `isActive`
  rules), NOT `UNavigationMenu`.

## Architecture

New `app/layouts/default.vue`:

```vue
<UDashboardGroup unit="rem">   <!-- fixed inset-0 flex; storage="cookie" → collapse persists -->
  <LayoutAppSidebar />
  <div class="flex flex-1 flex-col overflow-hidden">
    <LayoutAppHeader />     <!-- root becomes UDashboardNavbar -->
    <LayoutAppBreadcrumbs />
    <main id="main-content" class="flex-1 overflow-y-auto"><slot /></main>
  </div>
</UDashboardGroup>
```

Removed from `default.vue`: `sidebarCollapsed` / `mobileSidebarOpen` refs, the
mobile-overlay `<div>`, the global `onGlobalEsc` handler. The skip-link stays.

`UDashboardGroup` (theme `fixed inset-0 flex overflow-hidden`) provides the dashboard
context (`storage: "cookie"` default) that `UDashboardSidebar` / navbar toggles
inject — collapse state persists across reloads for free.

**Sidebar width — must match the current fixed `w-64` / `w-16` rail.**
`UDashboardSidebar` sizes are numbers interpreted in the group's `unit` (default
`%`), with `defaultSize: 15`, `collapsedSize: 0`. That would make the sidebar
*fluid* (15% of viewport) instead of the current fixed 256px. Fix: set
`unit="rem"` on `UDashboardGroup` and `:default-size="16"` on the sidebar (16rem =
256px = current `w-64`). The sidebar root theme has `min-w-16`, so the collapsed
state floors at 64px = current `w-16` icon rail automatically (no resizable needed;
keep `resizable` off).

## Components

### `app/components/layout/AppSidebar.vue` — rewrite

Root becomes `UDashboardSidebar` (`collapsible`, `mode="slideover"` for mobile):

| Slot | Content |
|------|---------|
| `#header` | **Logo only** (`ez` always, `SWM` text hidden when collapsed). The theme makes `#header` a single `h-(--ui-header-height)` flex row — only the logo fits here. |
| **default** (body) | `LayoutSiteSwitcher` (hidden when collapsed) as the **first** body item, then the nav links — keep `navSections` + `isActive` **verbatim**. Read `collapsed` from the **default-slot prop** (`<template #default="{ collapsed }">`). The current sidebar stacks logo-row → SiteSwitcher-row → nav; the body slot reproduces SiteSwitcher → nav, so visual order is preserved. |
| `#footer` | version button + changelog dot + GitHub link (all hidden when collapsed) + `UDashboardSidebarCollapse` (always; replaces the hand-rolled chevron toggle) — read `collapsed` from the `#footer` slot prop |

Each slot (`#header`, default, `#footer`) receives `{ collapsed, collapse }`. Wire
the same collapse-aware hiding the current sidebar does via its `collapsed` prop
(logo text, SiteSwitcher, version/GitHub block hidden in the rail). On mobile these
slots get `collapsed: false` → everything shows. At the 64px rail the body slot's
`px-4` leaves ~32px for the 20px nav icons — center them (current rail uses `px-3`);
adjust padding if tight.

**Do NOT override `#content`.** `UDashboardSidebar` renders `#header` / default /
`#footer` in BOTH the desktop sidebar and, via its internal `Menu`, the mobile
slideover. `#content` is the mobile-menu wrapper — overriding it replaces that reuse
and breaks the mobile menu. Leave it untouched; the same nav then renders on mobile
automatically (there `collapsed` is always `false` → full labels, correct).

- Drop the `collapsed` prop and `toggle` emit — the component manages collapse
  internally and persists it.
- Keep `useVersionCheck`, `ChangelogModal`, `sitePrefix`, all nav data.
- **Risk 3 (collapse + custom nav):** labels hide / icons remain when collapsed,
  driven by the slot-provided `collapsed`. Verify both states.

### `app/components/layout/AppHeader.vue` — rewrite template, keep script

Template root becomes `UDashboardNavbar`. All script logic (search, theme toggle,
language switcher, user menu, `/` shortcut) is unchanged.

| Slot | Content |
|------|---------|
| `#toggle` | sidebar toggle (`toggleSide="left"`, `lg:hidden`) carrying `data-testid="mobile-menu-button"` |
| `#default` (center) | inline search (`>_` prompt, results dropdown, keyboard nav) — keep `data-testid="search-input"` / `search-results` |
| `#right` | theme toggle + language switcher + user menu |

- Remove the custom `mobile-menu-button` (the navbar toggle replaces it).
- **Risk 1 (e2e selectors) — TWO specs affected:**
  - `tests/e2e/keyboard-shortcuts.spec.ts`: add `data-testid="mobile-menu-button"`
    to the navbar toggle (via `#toggle` slot). The mobile **overlay** is
    `UDashboardSidebar`'s internal `Menu` — no clean slot for a `data-testid`, so
    update the `mobile-sidebar-overlay` assertion to target the open slideover
    (`role="dialog"` or a now-visible nav link). Toggle selector stays stable.
  - `tests/e2e/navigation.spec.ts`: clicks `aside a[href="/switches"]` etc. The
    desktop `UDashboardSidebar` root renders as a `<div>` (data-slot="root"), **not
    `<aside>`** — so `aside a[...]` no longer matches. Wrap the nav links in a
    `<nav>` (body slot) and update the spec selectors to `nav a[href=...]` (the
    `<nav>` landmark also improves a11y over the lost `<aside>`).
- **Risk 2 (Esc closes search):** move the search-dismiss-on-Escape behavior into
  `AppHeader` itself (an Escape listener that calls `dismissSearch()` when results
  are open) so it survives removing the global handler. The input's existing
  `@keydown.escape` stays.
- **Risk 4 (search slot styling):** the navbar **center slot theme is
  `hidden lg:flex`** — search would vanish on tablet (the current search is
  `hidden sm:block`, visible from `sm`). Override the center slot class (e.g.
  `:ui="{ center: 'flex' }"` or a wrapper) so the inline search stays visible from
  `sm` up, matching today. Keep the existing search input classes otherwise. Also
  keep the search-results click-outside overlay `<div class="fixed inset-0 z-40">`
  as a sibling node (AppHeader becomes a multi-root SFC: navbar + that overlay).

### Unchanged

`AppBreadcrumbs.vue`, `SiteSwitcher.vue`, `ChangelogModal.vue`, all pages, and the
`auth` / `print` / `public` layouts (independent, don't use this shell).
`AppFooter.vue` is unused (dead) — left as-is, out of scope.

## Risks — all actively addressed (none deferred)

1. **e2e selectors (2 specs)** → `keyboard-shortcuts.spec.ts`: testid on navbar
   toggle + retarget overlay assertion. `navigation.spec.ts`: `aside a` → `nav a`
   (sidebar root is now a `<div>`/`<nav>`, not `<aside>`).
2. **Esc closes search** → Escape handler moved into `AppHeader`.
3. **Collapse + custom nav** → wire `collapsed` slot props (header/body/footer);
   verify icon-rail at `min-w-16`.
4. **Search slot styling** → override center slot (`hidden lg:flex` default) to keep
   search from `sm`; keep click-outside overlay sibling.
5. **Mobile slideover** → `UDashboardSidebar` slideover + `autoClose`; verify open/
   close and close-on-nav-click.
6. **Sidebar width** → `unit="rem"` + `:default-size="16"` so expanded = 256px
   (current `w-64`), collapsed rail = `min-w-16` (64px). Without this the sidebar
   would be fluid (15% viewport).

## Verification

- `pnpm dev` — no client/server console errors; desktop layout visually identical.
- Sidebar collapse persists across reload (cookie); mobile slideover opens/closes
  and closes on nav-link click.
- Search: `/` focuses, results show, arrow-key nav, Escape closes, click navigates.
- Theme toggle (view transition), language switcher, user menu all work in navbar.
- `pnpm test` (vitest) green.
- Sidebar width matches today (≈256px expanded, 64px icon rail collapsed) — not
  fluid; verify at multiple viewport widths.
- `pnpm test:e2e` green — `keyboard-shortcuts.spec.ts` (search testids preserved,
  mobile-sidebar assertion retargeted) and `navigation.spec.ts` (`nav a` selectors).
- `pnpm lint`, `pnpm typecheck`, `pnpm build` green.
- Version bumped to `0.30.0`; docs (`user-guide` EN/DE if any layout mention) +
  `MIGRATION_STATUS.md` updated.
