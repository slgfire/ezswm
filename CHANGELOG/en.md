## [Unreleased]

---

## [0.42.0] — 2026-10-07

### Added
- Switch-port connections: when you reset a local Access port (not in a LAG) connected to its reciprocal Access counterpart, you can optionally also reset that counterpart. The option is unchecked by default and shows the target switch and port; checked, the counterpart is fully reset while its PoE, helper settings, port identity and the switch's VLAN list are kept. Trunk and LAG peers are not offered, by default the counterpart keeps its configuration, and LAG and bulk resets are unchanged.

### Fixed
- Viewer role (Data Management): the **Data Management** entry is no longer shown in the sidebar for viewers, and a direct visit to `/data-management` shows no page content for them. If an admin loses the role while the page is open, its content is hidden. Profile and settings remain available. The server-side permissions for ordinary exports, import-template download and entity export are unchanged.
- Viewer role (QR codes): viewers can now view the existing public-access QR code of a switch or patch panel and copy the link, download it as SVG or PNG, or scan it with an external phone camera. When no valid link exists (missing or revoked) a neutral notice is shown. Viewers still cannot create, regenerate or revoke links; admin controls are unchanged. The public URLs (`/p/<token>`, `/p/pp/<token>`) are unchanged, and the Patch Panels module toggle is still enforced.
- Switch-port connections (Issue #289): saving a reciprocal Switch-port **Access** connection now creates the peer link independently of the optional VLAN copy, and the overwrite warning now compares against the correct counterpart port, so the false "overwrite" warning for an already-correct counterpart no longer appears. Choosing a different, occupied peer still shows the overwrite warning. No schema, dependency, token or authentication changes.

## [0.41.0] — 2026-10-07

### Added
- Users: admins can manage accounts on the **Users** page: create a local account (the role defaults to Viewer), edit a local account's display name, role and language (the username cannot be changed), and delete any other account after confirmation. You cannot delete your own account, and the last local emergency admin cannot be removed or demoted.
- SSO accounts are managed by the identity provider and cannot be edited on this page; their roles follow provider mapping. Deletion remains possible with a warning: it does not revoke access at the identity provider, and the account may be recreated at the next permitted SSO sign-in. Deleting an account keeps its activity history but removes the author attribution.
- A created-date column helps tell accounts with the same display name apart without exposing provider identity. Viewers cannot access the admin user list or management API; their own profile settings are unchanged.

### Fixed
- Users: creating an account with an invalid request now returns a generic validation error (HTTP 400) instead of a server error.
- Users: the Role and Language options in the create and edit dialogs now open above the dialog and can be selected.
- Login: removed the extra network icon above the title; the ezSWM logo is kept.
- Roles: when a save is rejected because your role changed (403), the app now starts one fresh role check after that rejection instead of reusing an older role request that may still be running. Several rejections at the same moment share that one check and show a single notice. The older request keeps running but its answer is ignored, and logging out or in while a check is running is respected. A rejected change is never retried. Network errors or temporary server errors keep the last known role; an expired or invalid session still ends the session as before.
- Topology: node positions are now saved and restored by the switch ID instead of the visible switch name. Two switches whose names look identical in the graph because the label is shortened (for example the same long prefix) no longer overwrite each other's position when you drag them; each drag saves the positions of all nodes, and positions stay stable across successive moves and reloads. Appearance, dragging, permissions, Reset layout and export are unchanged.
- Layout templates: saving a template in the editor now keeps the existing block IDs when you edit, reorder or move blocks; a newly added block gets a new ID. Block IDs from older templates (any non-empty text) are accepted. If the template changed since the page was loaded (a block ID that no longer exists or belongs to another template), the save is rejected with a message to reload; duplicate block IDs in a request are rejected. Clients that send no block IDs, or empty ones, still get all-new IDs as before. If a template already contains duplicate stored block IDs, a save that sends block IDs is rejected with an error (nothing is repaired automatically); saving only name or description (no layout) is unaffected. Creating, importing and duplicating templates still assign new IDs.
- Port editor: saving a port now sends only the fields you changed. A metadata-only save (for example just the description) no longer turns untouched unset, empty or off values (port mode, device, connected port, MAC address, helper visibility) into defaults, and a save with no changes sends no request. A deliberate VLAN or port-mode change saves the mode and the access, native and tagged VLANs together (an unset mode becomes the mode shown in the panel); a connection change saves the connection fields together, and a VLAN change on a switch-linked port keeps the link and synchronizes the connected switch. For LAG members only the shared fields that actually changed (status, speed, VLANs, connection, helper settings) are propagated to the other members, never descriptions, MAC addresses or unchanged link details. Save is disabled until the panel has loaded its options, and text typed in the meantime is kept. Not changed: clearing the helper role back to Automatic is still ignored by the server. Cancel is now also reliable while the panel is still loading: after an earlier save, reopening a port and clicking Cancel without editing closes it without an unsaved-changes prompt, while a genuinely typed change still asks before it is discarded (Cancel keeps the draft, Leave discards it).
- Public port list: ports are now listed in a fixed default order (RJ45, SFP, SFP+, QSFP, management, console, then by unit and index). Uplink, tagged-VLAN and disabled-status badges no longer move ports within the list, the existing filters (including tech-only visibility) are unchanged, and with a LAG filter ports are still grouped by LAG name first, then ordered by type, unit and index. The physical port grid and the admin views are unchanged.
- Viewer role (Switch pages): the switch list, switch details, ports, LAG groups, switch creation, public access and QR print now match the existing read-only permissions. Viewers no longer see create, edit, delete, duplicate, bulk, LAG, switch-group, favorite, persisted-sort and public-token controls that the server rejects with 403. Ports and LAG groups open as read-only details (mouse and keyboard), and a direct link to the create page returns to the switch list. Browsing, search, details, ordinary exports, printing, local display preferences, own profile/language, local password change (current password required; not for OIDC accounts) and logout remain available; admins keep full access. The server continues to reject infrastructure writes for viewers.
- Viewer role (Sites and VLANs): the sites list, site creation and site dashboard and the VLAN list, VLAN creation and VLAN detail pages no longer show the create, edit and delete controls that the server rejects with 403. Direct links to the site or VLAN create pages return to the nearest list with a view-only notice before any form appears. VLAN details and the VLAN panel stay readable, with their associated networks and navigation links, and local sorting and filtering are unchanged. On the site dashboard only the network-creation hint and the empty-state switch-creation action are hidden; read links stay. If an admin loses the role while editing, an open site editor is closed and a site or VLAN draft is discarded, an open VLAN panel stays read-only (its edit and delete state is dropped), and the first rejected request (403) refreshes the role once, shows a single notice and is not retried.
- Viewer role (Networks and IP addresses): the network list, network creation and network detail pages and the IP address overview no longer show the create, edit, delete, add and network-move controls that the server rejects with 403. Direct links to the network create page return to the network list with a view-only notice before any form appears. Network details (subnet information and utilization) stay readable, IP allocation rows and IP range rows open as read-only inspectors with a Close button, and the IP address table opens read-only labelled details; local filtering and sorting are unchanged. If an admin loses the role while an allocation, range or network editor is open, edit drafts and delete state are discarded, the open inspector stays read-only, and the first rejected request (403) refreshes the role once, shows a single notice and is not retried. A network reload that finishes after the role was lost no longer leaves a permanent loading spinner.
- Viewer role (Patch panels and layout templates): the patch panel list and details and the layout template list, details, creation and editing pages no longer show the create, edit, delete, duplicate and public-link management controls that the server rejects with 403. Patch panel sockets open as labelled read-only inspectors by mouse, keyboard or touch with a Close button. Direct links to template creation (including import and clone) and template editing return to the template list or detail page with a view-only notice before any form, library or editor is shown. Admins keep the side toggle (clicking the active L or R again clears it) and public-link management; a valid public patch panel link is still readable without signing in. Ordinary patch panel printing is unchanged. If an admin loses the role while a socket or template editor is open, the first rejected save (403) refreshes the role once, shows a single notice, is not retried, and the editor falls back to the read-only view without a save prompt.
- Viewer role (Topology): viewers can read the topology, pan, zoom and fit the view, and select a switch to see a read-only detail panel with its connections; nodes cannot be dragged, the Reset layout button is not shown, and no layout is saved. Admins keep native drag autosave of node positions (saved shortly after a drag) and Reset layout, which deletes the saved layout without a confirmation. If an admin is demoted on the server while a page is still open, a drag save sent after that is rejected once (403) without retry, one notice is shown and the saved layout stays unchanged; once the page learns the new role it becomes view-only and queued saves are cancelled, while a request that was already sent cannot be cancelled afterwards. The dragged node may stay at its unsaved position on screen until the page is reloaded. Node clicks now use the graph library's movement filter, which separates a normal click from a drag release.
- Topology: Reset layout now blocks new position saves while a reset is in progress: queued saves are cancelled and an in-flight save is awaited before the layout is deleted, so a save can no longer recreate the layout right after a reset.
- Docker: the build context now excludes the local `.slim/` planning folder. The `.slim/` rule sits before the `!.env.example` exceptions in `.dockerignore`, so the exceptions stay last as the existing test requires.
- Role changes: if an admin is demoted to viewer while a port editor is open, the next save is rejected once by the server (403) without retry, the editor becomes read-only with a single notice, and nothing is saved. A delayed session refresh can no longer bring a user back after logout.
- Settings and Data Management: admin-only writes and secret reads (general settings, OIDC configuration and check, backup download and restore, import) now handle a lost admin role once: the first rejected request (403) refreshes the role, shows a single notice and is not retried; the admin parts disappear and the page falls back to Account or Export. Late file or OIDC responses and a held backup/import file read are ignored after the role is lost, and not-yet-started restore/import requests are blocked once the interface confirms the role loss, and your own unsaved account and password edits stay protected by the leave confirmation. Backup and restore stay admin-only and exports (which can include public tokens) are unchanged.
- Settings: saving your own profile (display name, language) now refreshes the signed-in user through the normal session refresh, so the header name and language update after a successful session refresh, without console warnings.
- QR print: viewers can print an existing, valid public-access QR code; if the link is missing or revoked, the QR code is omitted with a notice and no link is created or reactivated. Public pages are unaffected.
- The stored language preference (EN/DE) is now applied on a full page load without error.
- Opening a switch, site or network by its UUID link now redirects to the slug URL during server rendering as well (the session cookie is forwarded), which removes a breadcrumb hydration mismatch on the switch UUID link.

### Changed
- Site dashboard: on phones and compact widths (up to the small breakpoint) the four KPI cards at the top now show in two columns (2×2) instead of one column. Tablet and desktop layouts and the full-width panels are unchanged.
- Documentation: user guides (EN/DE) describe the view-only Switch interface and its current limits; stale "future Viewer role / all users are admin" wording in the architecture and specs was corrected. Server permissions and exports (which can include public tokens) are unchanged.

## [0.40.1] — 2026-10-05

### Changed
- Documentation: project instructions, architecture and specs now describe the current SQLite/Prisma persistence; JSON files remain only exchange/compatibility formats (backups, import/export, legacy migration input); array/object fields are serialized as JSON inside SQLite columns.
- Documentation: the English and German FAQ now state the real password-recovery limitation and describe a safe backup with the container stopped.
- Documentation: the README logo is centered horizontally and approximately vertically on GitHub.
- Documentation: the release history was backfilled for 0.34.0 through 0.40.0 in the English and German changelogs.
- Patch Panels: the socket side (L/R) in the socket edit form is now chosen with visible L (green) and R (blue) buttons instead of a dropdown; only one side can be selected, and clicking the selected button again clears only the side (hint: "Click again to clear the selection.").
- Project process: every push to Git must add a meaningful entry under `[Unreleased]` in `CHANGELOG/en.md` and `CHANGELOG/de.md`; on a version bump the applicable entries move under the new version heading.

---

## [0.40.0] — 2026-10-05

### Added
- OIDC / SSO login: standard OpenID Connect Authorization Code flow with PKCE (S256), with state, nonce, ID-token signature, issuer and subject validation. A provider that advertises only symmetric signing algorithms (e.g. HS256) is not supported. Accounts are not linked by username or email, and the local emergency admin remains available.
- SSO roles and groups are re-evaluated on every SSO login; the Viewer role is read-only for infrastructure data. OIDC settings are configured by admins under Settings, including a connection check and an optional provider name on the login page.
- Admin-only read-only Users page showing username, display name, role and whether the account is local or OIDC.
- Port speed `40G` (QSFP) with NetBox `40gbase-x-qsfpp` mapping; new defaults include 40G.

### Changed
- Settings: Basic and optional-feature settings (Patch Panels, Switch Groups) are saved with a single Save action. The Account page shows an OIDC-managed notice for SSO users. The login page shows the local form first with SSO below. Consistent UI polish and sidebar logo spacing.
- Backups: the full JSON backup now round-trips Patch Panel data (panels, sockets, public tokens) and stores an OIDC client secret only in encrypted form and does not include the OIDC encryption key. Backups still contain password hashes and public access tokens, so treat them as secret.
- New optional environment variables `PUBLIC_BASE_URL` (callback origin) and `OIDC_ENCRYPTION_KEY` (needed only to store a confidential client secret; public clients work without it).

---

## [0.39.0] — 2026-09-30

### Added
- Switch Groups: switches can be organized into site-scoped groups with a grouped view on the switches page, an assignment menu, and a group manager. The feature is enabled by default and can be turned off in Settings; stored groups and assignments are kept and restored when it is re-enabled. The API reference documents the new group endpoints.

---

## [0.38.0] — 2026-09-23

### Added
- Networks can be excluded from the dashboard and subnet utilization figures with a new per-network option (default: included). Adds a database migration.

---

## [0.37.2] — 2026-09-13

### Fixed
- Switch detail: after renaming a switch, the page URL now follows the new slug so follow-up edits no longer target the old address and fail.

---

## [0.37.1] — 2026-09-08

### Changed
- Documentation: refreshed the API reference.

---

## [0.37.0] — 2026-09-08

### Added
- Patch Panels: each panel can have one revocable, read-only public link that authenticated users can generate, copy and revoke, plus a public panel page and a print view.

---

## [0.36.0] — 2026-09-05

### Added
- Optional standalone Patch Panels (disabled by default, enabled in Settings): 12/24/48-port panels with optional left/right remote-side information, outlet number, location and tested status. Panels are listed per site or across all sites and appear in search; data is retained when the feature is turned off. Adds a database migration.

---

## [0.35.4] — 2026-09-04

### Fixed
- Switch print layout: denser port grid so more ports fit on a printed page.

---

## [0.35.3] — 2026-09-03

### Fixed
- Switch print layout: more compact printed layout.

---

## [0.35.2] — 2026-09-03

### Fixed
- QR sticker print layout standardized.

---

## [0.35.1] — 2026-09-02

### Fixed
- Bulk port editor: the status control now uses the same Up/Down/Disabled button style as single-port editing, with a separate "No change" state that leaves status untouched.
- Documentation: added RTK command guidance for contributors.

---

## [0.35.0] — 2026-09-02

### Added
- Port editing: the status selector is now an exclusive Up/Down/Disabled button group instead of a dropdown.

---

## [0.34.3] — 2026-09-01

### Fixed
- Switch edit: clearing optional text fields (model, manufacturer, serial, location, rack position, management IP, firmware, notes) now persists the cleared value instead of keeping the old one.

---

## [0.34.2] — 2026-08-31

### Fixed
- Switch edit: changing the layout template or stack size now shows a confirmation dialog listing the ports that would be removed, so ports are no longer deleted unexpectedly.

---

## [0.34.0] — 2026-08-31

### Added
- Docker startup now creates a pre-upgrade SQLite backup (database plus WAL/SHM files) under the data directory's `backups/` folder when the app version changes, keeps the newest five, and stops before migrations if the backup fails.
- Switch, port and LAG updates are now protected against concurrent edits (conflicts return a clear 409), switch deletion and regeneration clean up port connections and remote LAG references consistently, and bulk port updates reject missing or foreign targets atomically.

---

## [0.33.0] — 2026-08-02

### Added
- LAG duplicate: remote switch can now be selected when duplicating a LAG, so a replacement switch can be chosen instead of copying the original remote link. The remote section, port mapping, and conflict warnings are all visible in duplicate mode.
- LAG create/duplicate: port status (up/down/disabled) can now be set for all member ports simultaneously — both local and remote when a remote switch is selected.
- Helper view (mobile): connected ports are now visually highlighted with an emerald left border and emerald connection text, making linked ports easy to spot at a glance.
- Layout template creation: port blocks can now be reordered using up/down buttons during template creation, matching the behavior already available in the edit view.

### Fixed
- Helper view (mobile): port sorting no longer interleaves types randomly. Ports are now grouped by type (RJ45 → SFP → SFP+ → QSFP → Management → Console) within each usage category, so the list reads in physical-panel order.

---

## [0.31.4] — 2026-07-14

### Changed
- Dependency maintenance release: updated Nuxt i18n, marked, and development tooling after CI validation. The nanoid major update remains separate for explicit review.
- Publishing this version refreshes the Docker release tags `latest`, `0.31.4`, and `0.31`.

---

## [0.31.0] — 2026-06-26

### Added
- Layout template editor: port blocks can now be reordered by dragging (grab the handle on the left) or using the up/down buttons in the block header. The new order is saved as part of the template and reflected everywhere the template is used.

---

## [0.30.2] — 2026-06-26

### Fixed
- Device library import: ports with `poe_mode: pd` (Powered Device / PoE input) are no longer incorrectly tagged as PoE PSE ports. Affected the MikroTik CRS326-24G-2S+RM, where `ether1` is the switch's own power input and was causing all 24 ports to appear as "PoE Passive 24V".

---

## [0.30.1] — 2026-06-19

### Fixed
- LAG groups: the remote-port target dropdown now groups ports by type (copper, then fibre/uplink, then console/management) instead of interleaving each block's first port, so the list reads in physical-panel order.
- Layout templates: the PoE dropdown no longer fails to open when a block has no PoE type set (caused by an empty-string value incompatible with Nuxt UI v4 USelect); a "None" option is now shown and selected by default.

---

## [0.30.0] — 2026-06-16

### Changed
- The app layout now uses the standard Nuxt UI dashboard components. It looks the same, but the sidebar's collapsed state is remembered across reloads, the mobile menu opens as a slide-over, and the header search is left-aligned.

---

## [0.29.2] — 2026-06-18

### Fixed
- LAG groups: the remote-port target dropdown no longer lets you pick the same remote port for two local ports, and the ports are now listed in natural order (by unit/index).
- LAG groups: clicking Save with an empty name now shows the required-field error instead of silently doing nothing.

---

## [0.29.1] — 2026-06-16

### Fixed
- Marking a switch as a favourite from the switch list no longer fails silently. The request used the per-site slug without a site context and returned 404; it now uses the switch's unique ID.

---

## [0.29.0] — 2026-06-15

### Added
- Language switcher in the header (top right) to toggle between English and German at any time. Your choice is saved to your profile and persists across reloads and devices.

### Changed
- The unsaved-changes confirmation now applies consistently to every editing side panel — switch and port editing, bulk port edits, LAG groups, IP allocations and ranges, networks, VLANs and sites. Closing a panel with unsaved changes (clicking outside, Escape, or Cancel) prompts you first.

---

## [0.28.0] — 2026-06-15

### Added
- Confirmations (resetting a port, overwriting a LAG connection, leaving a page with unsaved changes) now use in-app dialogs instead of native browser pop-ups.

### Fixed
- Resetting a port now fully clears its configuration and connection and severs the link on both ends, instead of leaving a stale back-link on the peer switch.

---

## [0.27.2] — 2026-06-13

### Fixed
- Port and LAG actions on a switch reached via a slug URL no longer hit the wrong switch or return 404. Per-site slugs (unique per site, not globally) are now disambiguated using the site context.

---

## [0.27.1] — 2026-06-13

### Fixed
- Editing ports and LAG groups on a switch opened via its slug-based URL now works. The endpoints resolve the slug to the switch's ID before applying changes.

---

## [0.27.0] — 2026-06-13

### Added
- Switch-list filters (location, role, tags) are now scoped to the current site, each filter has its own reset button, and the filter controls show icons.

---

## [0.26.1] — 2026-06-11

### Fixed
- Removed the duplicate "required" asterisk that appeared on some form-field labels.

---

## [0.26.0] — 2026-06-11

### Added
- Import devices from the NetBox device library directly in the switch quick-create modal. Selecting a template auto-fills the manufacturer and model (editable; manual changes lock the field).

---

## [0.25.6] — 2026-06-11

### Fixed
- Changelog modal now works correctly in the production Docker image. The CHANGELOG files were bundled (after the v0.25.5 path fix) but read from the wrong Nitro storage namespace (`assets:server` instead of `assets:changelog`), so the API still returned an empty list.

---

## [0.25.5] — 2026-06-11

### Fixed
- Changelog modal now shows release notes in the production Docker image. The CHANGELOG files were not being bundled into the server build because the asset path was resolved relative to the Nuxt `app/` directory instead of the project root.

---

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
