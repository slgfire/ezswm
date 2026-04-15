# Review: Public QR Switch View Implementation

Reviewed against the current workspace on 2026-04-15.

## Findings

### 1. High: The feature is not present in the checked-out backend surface

The implementation paths defined by the spec are missing entirely from the current workspace:

- `types/publicToken.ts`
- `server/repositories/publicTokenRepository.ts`
- `server/validators/publicTokenSchemas.ts`
- `server/api/p/[token].get.ts`
- `server/api/switches/[id]/public-token/index.post.ts`
- `server/api/switches/[id]/public-token/index.get.ts`
- `server/api/switches/[id]/public-token/index.delete.ts`

This is not just a naming mismatch in one area. The existing auth middleware still only knows the old public endpoints and uses exact path matching without the required `/api/p/` bypass, so the public API path from the spec does not exist in the current code path either. See [server/middleware/auth.ts](/home/ezswm-claude/server/middleware/auth.ts:3).

Impact: there is currently no public token model, no public token persistence layer, no public API, and no admin API to create or revoke tokens.

### 2. High: Public route access is still blocked by the current auth flow

The server middleware still only skips hard-coded exact matches and does not bypass dynamic `/api/p/:token` routes. See [server/middleware/auth.ts](/home/ezswm-claude/server/middleware/auth.ts:17).

The client route middleware also has no early return for `/p/:token` and still runs setup and auth checks for every route. See [app/middleware/auth.global.ts](/home/ezswm-claude/app/middleware/auth.global.ts:4) and [app/middleware/auth.global.ts](/home/ezswm-claude/app/middleware/auth.global.ts:47).

Impact: even if a public page or API route were added later, the current middleware would still send users into the authenticated app flow instead of allowing anonymous access.

### 3. High: Data lifecycle integration for public tokens is missing

The storage bootstrap still initializes only the existing JSON files and does not create `publicTokens.json`. See [server/plugins/initData.ts](/home/ezswm-claude/server/plugins/initData.ts:25).

Backup export and restore also do not include any `publicTokens` payload. See [server/api/backup/export.get.ts](/home/ezswm-claude/server/api/backup/export.get.ts:7) and [server/api/backup/import.post.ts](/home/ezswm-claude/server/api/backup/import.post.ts:10).

Switch deletion still only cleans up LAG groups before deleting the switch. There is no token cascade cleanup. See [server/api/switches/[id].delete.ts](/home/ezswm-claude/server/api/switches/[id].delete.ts:18).

The shared type barrel also has no `PublicToken` export. See [types/index.ts](/home/ezswm-claude/types/index.ts:1).

Impact: the feature has no persistence bootstrap, no backup compatibility, no delete cascade, and no shared type export surface.

### 4. High: Frontend/admin/public UI implementation is missing

The admin switch detail page does not include a public QR access section or any related component integration. The page renders the existing switch details, selection bar, grid, table, and activity sections only. See [app/pages/sites/[siteId]/switches/[id].vue](/home/ezswm-claude/app/pages/sites/[siteId]/switches/[id].vue:67) and [app/pages/sites/[siteId]/switches/[id].vue](/home/ezswm-claude/app/pages/sites/[siteId]/switches/[id].vue:204).

The expected frontend paths are also missing:

- `app/composables/usePublicToken.ts`
- `app/layouts/public.vue`
- `app/pages/p/[token].vue`
- `app/components/public/PublicPortList.vue`
- `app/components/switch/SwitchPublicAccess.vue`

Impact: there is no admin UI to generate or revoke links, no public page to render a scanned token, no public layout, and no public port list.

### 5. Medium: The shared grid components still have none of the public-view compatibility changes

`SwitchPortGrid` still types `vlans` as full `VLAN[]`, has no `publicMode` prop, still renders the built-in legend unconditionally, and still only derives legend VLANs from `native_vlan`. See [app/components/switch/SwitchPortGrid.vue](/home/ezswm-claude/app/components/switch/SwitchPortGrid.vue:76), [app/components/switch/SwitchPortGrid.vue](/home/ezswm-claude/app/components/switch/SwitchPortGrid.vue:154), and [app/components/switch/SwitchPortGrid.vue](/home/ezswm-claude/app/components/switch/SwitchPortGrid.vue:268).

`SwitchPortItem` also still types `vlans` as full `VLAN[]`. See [app/components/switch/SwitchPortItem.vue](/home/ezswm-claude/app/components/switch/SwitchPortItem.vue:86).

`types/vlan.ts` still exposes only the full `VLAN` interface and has no `VlanDisplayInfo` helper type. See [types/vlan.ts](/home/ezswm-claude/types/vlan.ts:12).

Impact: the current component contracts still match the pre-feature admin-only model and are not prepared for the reduced public DTO described in the spec.

### 6. Medium: There is no implementation-level test coverage for the feature

The expected test files are missing:

- `tests/public-token.test.ts`
- `tests/e2e/public-switch-view.spec.ts`

A repository search also returns no test references for `public-token`, `/api/p/`, `publicTokens`, `SwitchPublicAccess`, or the public page route.

Impact: even if the feature were partially implemented elsewhere, there is no visible unit or end-to-end safety net for token lifecycle, middleware bypass, public API behavior, or the mobile public page flow.

## Notes

- `git status --short` in this workspace shows only untracked `.codex` and `docs/superpowers/`. There are no visible tracked source changes for the feature under `app/`, `server/`, `tests/`, or `types/`.
- If the implementation exists in another branch, worktree, or unstaged directory outside this checkout, this review is looking at the wrong code location. In the current checkout, the feature is not present.

## Verification

No tests were run. This review was based on direct inspection of the current repository state and targeted searches for the implementation paths and integration points defined by the spec.
