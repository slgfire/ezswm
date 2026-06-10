## [0.25.4] — 2026-06-11

### Fixed
- IP range rows in the subnet detail view now display the address range in a uniform style, matching regular allocation rows. The IP count is now shown as a colour-coded badge matching the range type (DHCP, static, reserved), replacing the previous small grey text.

---

## [0.25.3] — 2026-06-10

### Fixed
- IP allocations and ranges no longer appear empty when navigating to a subnet via its slug-based URL. The allocation and range API endpoints now correctly resolve the network slug to its UUID before querying child records.

---

## [0.25.2] — 2026-06-10

### Fixed
- Changelog modal no longer shows "unavailable" for logged-in users. The `/api/changelog` and `/api/version-latest` endpoints are now public (no auth token required), matching how the changelog is used before and after login.

---

## [0.25.1] — 2026-06-10

### Fixed
- Fixed Docker startup crash loop after Prisma 7 upgrade: `prisma.config.ts` was missing from the runtime image, causing `prisma migrate deploy` to fail with "datasource.url property is required".

---

## [0.25.0] — 2026-06-10

### Changed
- Upgraded Prisma ORM from 6.18 to 7.8. The database engine now uses the `better-sqlite3` driver adapter instead of the legacy binary engine. Performance and compatibility are equivalent; no data migration is required.

> **Breaking change for source builds:** The `DATABASE_URL` in `.env` is now resolved relative to the repository root (where `prisma.config.ts` lives), not relative to the `prisma/` folder. If you run ezSWM from source and have a custom `DATABASE_URL` path in `.env`, update it accordingly. The default path changes from `file:../data/db.sqlite` to `file:./data/db.sqlite`. Docker deployments using the pre-built image are not affected.

---

## [0.24.2] — 2026-06-10

### Fixed
- Removing a tag from a switch in the edit form now works correctly. Previously the tag was not removed when saved if it was the last tag on the switch.

---

## [0.24.1] — 2026-06-10

### Fixed
- Backup export and restore now work correctly. Previously, restoring a backup always failed because sites were missing from the exported file, causing a database error on import.

---

## [0.24.0] — 2026-06-06

### Changed
- The in-app changelog (click the version number in the sidebar footer) now shows a short, human-readable description for each version instead of a raw list of pull request titles. Available in German and English, matching your UI language setting. Works offline — no internet connection required to view the changelog.

---

## [0.23.4] — 2026-06-05

### Fixed

- Switch and subnet detail pages now load correctly when two different sites share the same short name for a device or subnet (e.g. both have a switch called "sw-core"). Previously the page would show a 404 in that situation.

---

## [0.23.3] — 2026-06-05

### Fixed

- The one-time upgrade migration from 0.21 could silently discard IP allocations without any log message or warning. The count shown in the startup log is now accurate and reflects what was actually saved. Any rows that could not be imported are listed individually with a reason.

### Added

- If your install was affected by the silent-discard bug, a new recovery tool can restore the missing allocations from the original backup automatically. Run it in dry-run mode first to see what would be recovered, then with `?apply=1` to actually restore. Requires admin access.

---

## [0.23.2] — 2026-06-05

### Fixed

- Saving changes to a site, switch, or subnet — and deleting them — now works correctly when navigating via the readable URL (e.g. `/sites/main-office`). Previously these actions returned a "not found" error even though the page itself loaded fine.

---

## [0.23.1] — 2026-06-05

### Fixed

- Creating a new subnet, VLAN, or switch from within a site's readable URL (e.g. `/sites/main-office/subnets/create`) no longer shows a server error. The form now submits correctly.

---

## [0.23.0] — 2026-06-05

### Added

- Switches and subnets now have readable URLs, just like sites. You'll see addresses like `/sites/main-office/switches/core-01` and `/sites/main-office/subnets/management` instead of long UUID strings. Old bookmarks redirect automatically.
- All navigation links, search results, breadcrumbs, and dashboard favorites have been updated to use the new address format.

### Fixed

- If you upgraded from 0.21 to 0.22, some URLs may have gotten placeholder-style short names (e.g. `saarlan-839425`). These are now automatically cleaned up to proper readable names on startup — no manual action needed.
- Renaming a site, switch, or subnet now correctly updates the URL as expected. A previous edge case caused the old URL to stick if you opened the edit form without changing the name.

---

## [0.22.2] — 2026-06-04

### Changed

- Renaming a site, switch, or subnet now also updates its URL. If you rename "Main Office" to "HQ", the URL changes from `/sites/main-office` to `/sites/hq` automatically. Old UUID-based bookmarks (the long-ID form) continue to redirect as before.

---

## [0.22.1] — 2026-06-04

### Added

- Site URLs are now human-readable: `/sites/main-office` instead of `/sites/2b917665-…`. All navigation links have been updated. If you have old bookmarks with UUID-based URLs, they redirect automatically to the new form.
- API filters for switches, subnets, VLANs, and search now accept either the site name-slug or the UUID — both work.

---

## [0.22.0] — 2026-06-04

### Added

- Sites, switches, and subnets now each have a short URL-safe name (slug) generated automatically from their display name. This is the foundation for the readable URLs rolled out in 0.22.1 and 0.23.0. Existing records were migrated automatically.

---

## [0.21.3] — 2026-06-04

### Added

- Import, backup restore, and activity-log undo are fully working again. These features were temporarily unavailable after the 0.21 storage upgrade. The Data Management page is back to full functionality.

---

## [0.21.0] — 2026-06-03

### Changed

- Data is now stored in a SQLite database instead of JSON files. The switch happens automatically on first startup: existing data is migrated, cross-references are preserved, and the original JSON files are kept as a backup archive. If the migration encounters an error, your JSON files are left untouched so you can restart safely.
- Deleting a subnet now atomically removes its IP allocations. Concurrent changes no longer risk overwriting each other.

> **Note:** After upgrading, existing bookmarks to specific sites, switches, or subnets will need to be updated once — the internal IDs changed during migration. Names and all other data are unchanged.

---

## [0.20.x and earlier]

See [GitHub Releases](https://github.com/slgfire/ezswm/releases) for details on versions before 0.21.
