---
title: Release Notes
---

# Release Notes

For the in-app changelog (rendered from GitHub releases), click the version number in the sidebar footer.

## v0.21.1 — 2026-06-03

### Docs
- **README + docs site refreshed for the 0.21 SQLite switch.** Installation guide gains a `DATABASE_URL` row + an "Upgrading from 0.20.x" section that walks through the on-boot migration. User guide's Data Management section now reflects that the import/restore/undo paths are temporarily 501 (tracked in [#156](https://github.com/slgfire/ezswm/issues/156)) while export keeps working with the new `schema: "sqlite-v1"` payload. API reference marks the affected endpoints and documents the new export shape. Architecture diagrams updated from "JSON files" to "SQLite via Prisma". ([#159](https://github.com/slgfire/ezswm/pull/159), closes [#158](https://github.com/slgfire/ezswm/issues/158))

No runtime changes — image is byte-identical to 0.21.0 modulo the docs build.

## v0.21.0 — 2026-06-03

### Changed — Storage moved from JSON files to SQLite

The internal storage layer is now **SQLite via Prisma** instead of flat JSON files. The one-shot migration runs **automatically on first boot** when the database is empty and legacy `data/*.json` files are present: every record is rewritten into SQLite with a fresh **UUIDv4** primary key, all cross-references are remapped (including those embedded in activity-log snapshots), and the original JSON files are moved into `data/_archive_<ISO>/` for safekeeping. If anything fails the database is left empty and the JSON files stay untouched, so you can investigate and restart. ([#154](https://github.com/slgfire/ezswm/pull/154), closes [#139](https://github.com/slgfire/ezswm/issues/139) phase 1)

#### Why
- **Cascade deletes are now transactional.** Deleting a network atomically removes its IP allocations and ranges via the SQLite `ON DELETE CASCADE` constraints.
- **Concurrent writes can't lose data** thanks to SQLite's write-serialisation; the previous JSON read-modify-write pattern was last-write-wins.
- **Lookups are indexed** instead of full-file linear scans — the audit log has indexes on `timestamp` and `(entity_type, entity_id)`, and every foreign-key column is indexed.
- **Schema migrations** are now managed by Prisma instead of ad-hoc JSON backfills in the init plugin.

#### Breaking — entity URLs change
All entity primary keys are regenerated as UUIDv4 during the migration, so URLs like `/sites/<id>`, `/sites/<id>/switches/<id>`, `/layout-templates/<id>` etc. have **new IDs after upgrading**. Bookmarks pointing at specific entities break once. Names and labels in the UI are unchanged.

#### Compatibility note — temporarily disabled features
The bulk import endpoints and the activity-log undo button were JSON-file-specific and currently return **`501 Not Implemented`** with a clear message. SQLite-aware replacements will land in a follow-up release. Backup *export* (the read side) is fully working against SQLite and produces a new `schema: "sqlite-v1"` payload.

#### Docker / configuration
- New env var `DATABASE_URL` (default `file:/app/data/db.sqlite` in the image). The data directory is unchanged — the SQLite file + WAL + the migration archive all live there.
- Image entrypoint now runs `prisma migrate deploy` before starting the server, so schema upgrades apply themselves on container start.

## v0.20.3 — 2026-06-02

### Dependencies
- **`@nuxt/ui` 4.8.0 → 4.8.1.** Includes upstream fix `Form: add method="post" to prevent credential leaking via GET before hydration` (relevant for the login form). Also CommandPalette/DashboardSearch prop proxying, SelectMenu `max-height` fallback, Icon recursion fix. ([#151](https://github.com/slgfire/ezswm/pull/151))
- **Dev tooling** patch bumps: `eslint` 10.4.0 → 10.4.1, `tsx` 4.22.3 → 4.22.4, `vitest` 4.1.7 → 4.1.8, `vue-tsc` 3.3.2 → 3.3.3. ([#152](https://github.com/slgfire/ezswm/pull/152))
- **CI:** `pnpm/action-setup` v4 → v6 (pnpm v11 support, internally on Node 24). ([#150](https://github.com/slgfire/ezswm/pull/150))

No application behavior changes — pure dependency rollup so `:latest` keeps up with upstream patches.

## v0.20.1 — 2026-05-30

### Fixed
- **DHCP-range protection now applies on edit too.** Previously the check only ran on create; editing an existing allocation's IP could move it into a DHCP scope. ([#148](https://github.com/slgfire/ezswm/pull/148))

### CI / packaging
- **Versioned release images are now reliably built.** The auto-tag step pushes the tag with `GITHUB_TOKEN`, which doesn't trigger other workflows — so no versioned image was being published. The release workflow now builds and pushes the image itself, from the release commit, with `provenance: false` so GHCR shows a clean per-version page with the correct labels (no more `unknown/unknown` phantom manifest). ([#144](https://github.com/slgfire/ezswm/pull/144), [#146](https://github.com/slgfire/ezswm/pull/146), [#147](https://github.com/slgfire/ezswm/pull/147))
- **Consolidated tagging:** `latest` + `<version>` + `<major.minor>` are produced by the same build (same digest). `latest` always reflects the newest release. The old rolling `:main` and `<sha>` tags are gone — `docker.yml` now only builds `pr-<n>` preview images on PRs.
- **Image version label** is stamped from `package.json` instead of the ref name, so `:latest` no longer reports `version=main`.

## v0.20.0 — 2026-05-29

### Added — IP Addresses overview
A new site-scoped **IP Addresses** page aggregates allocations across all subnets of a site (or all sites in "All Sites" mode). Reachable from the sidebar.

- Full-width, sortable table: IP · Hostname · MAC · Subnet · VLAN · Device Type · Status (+ Site column in All Sites).
- Numeric IP sort, search box + VLAN / Status / Device-Type filters, state preserved in URL and across sessions.
- Row click opens an edit slideover (delete is inside the slideover) — no per-row buttons, clean full-width rows.
- Body scrolls internally with a sticky header: page heading, filters, and column headers stay fixed (desktop + mobile).
- Adding a custom IP auto-derives the subnet from the typed IP (subnet-match); the dropdown is editable, the VLAN is shown read-only.
- DHCP-range protection on create. ([#143](https://github.com/slgfire/ezswm/pull/143), closes [#140](https://github.com/slgfire/ezswm/issues/140))

### Changed — Networks → Subnets
The "Networks" entity is now called **Subnets** throughout the UI (each one has always been a subnet/CIDR; the label now matches).

- All labels updated in EN and DE (nav, breadcrumb, page titles, buttons, messages).
- Routes moved from `/sites/:id/networks` to `/sites/:id/subnets`. A global redirect middleware 301-redirects the old paths (including deep links to a specific subnet), so existing bookmarks keep working.
- Internal code, types (`Network`), API (`/api/networks`) and the activity `entity_type` stay `network` — pure user-facing label change.
- Generic networking terms (network address, network topology, "Network error", point-to-point/host-route networks, the public port hint) are unchanged.

### CI
- **Per-PR preview images:** every PR now builds `ghcr.io/slgfire/ezswm:pr-<number>` that you can `docker pull` and test before merging. ([#142](https://github.com/slgfire/ezswm/pull/142))
