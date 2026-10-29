# TODO

Short human checklist of the actionable queue. Long-term direction lives in [.ai/STRATEGY.md](.ai/STRATEGY.md); release history in [CHANGELOG/en.md](CHANGELOG/en.md). Update the status here when work changes.

## Open

1. **Switch port miniature in Switch Overview** (user feature, investigation pending).
   - Single switch: show a port miniature. Stack: compact member/port summary with an accessible click-to-expand view of member-labelled miniatures.
   - Must be usable on mobile (no hover-only interaction). Reuse the existing renderer where possible.
   - Starting-point hints: `app/components/switch/SwitchCard.vue`, `app/components/template/TemplateMiniPreview.vue`. Architecture not yet investigated; no effort or data structure is promised.
2. **iPhone UI defects** (reported with three screenshots; mobile fixes in 0.46.1; **accepted** by the user after an iPhone check on the deployed 0.46.1 test domain, 2026-10-29).
   - [x] Switch overview: filters now stack full width above the wrapping view/action controls on phones, and touch switch-card actions sit in the normal card layout (grid and list; desktop hover/focus kept). Checked with focused Playwright in Chromium at 390/320 px (no page overflow or filter-control overlap); confirmed by the user on an iPhone.
   - [x] IP-address overview: filters are now full width on phones (Chromium-checked). The first table row partly obscured by the table header was **not reproduced** in Chromium (table owns the scroll, first row starts below the header) and no sticky-header code change was made; the user's iPhone check found no remaining problem (acceptance, not a root-cause proof).
   - [x] Port visualization: the shared dark scroll-fade `::after` overlay (`.port-grid-unit`) was removed from global CSS; scroll behavior was tested in switch details, layout-template previews and the public viewer in Chromium; confirmed by the user on an iPhone.
   - Status: complete/accepted. The iPhone model, iOS/browser versions and viewport were not supplied (not needed for acceptance). Release 0.46.1 is deployed to the test domain `https://ezswm-test.saar-lan.de` (2026-10-29).
   - Do not assume the historical iPad `USelect` empty-string issue (see `AGENTS.md`, closed PoE issue #217) is the same defect.

3. **Build-context / auth-state security cleanup**: implementation complete (2026-10-29, uncommitted): ignore rules in `.gitignore`/`.dockerignore`, `tests/e2e/.auth/user.json` untracked (file kept locally), regression test `tests/securityIgnore.test.ts`.
   - [x] Credential-risk assessment (2026-10-29): the previously tracked auth JWT expired 2026-03-25T19:55:12Z (issued 2026-03-18), so the server rejects it; no JWT revocation or rotation is needed for this finding. The signature was not tested and no live probe was made. The current public `main` still includes the file until the user approves commit/push/merge; historical copies remain public even afterward. The local staged removal is not remote history erasure and no history rewrite was done.
   - [x] Test-domain default-password check (completed 2026-10-29): a read-only check of the live test-domain container compared the 3 local-password accounts (1 admin) against the one known public E2E default password: 0 matched, 0 errors; no login attempts or changes. It says nothing about password strength or OIDC credentials.

## In progress

- None (no port-miniature implementation started).

## Longer term (not scheduled)

- Discovery Agent, Rack Planning, IPv6: see [.ai/STRATEGY.md](.ai/STRATEGY.md).
- Plugin system: [issue #272](https://github.com/slgfire/ezswm/issues/272), separate backlog, not approved scope.
- Note: some older roadmap items in STRATEGY.md (e.g. the Admin/Viewer roles, export/backup improvements) are already implemented or mostly shipped and are not queued here.

## Completed (brief)

- MCP/OIDC tokens (0.46.0) and the published image; registry fix [PR #329](https://github.com/slgfire/ezswm/pull/329) and docs [PR #330](https://github.com/slgfire/ezswm/pull/330), both merged to `main` (CI 40514021341 success). This does not claim a production deployment.
