# MIGRATION STATUS

## Latest Stage

Notice-card rollout — 2026-10-08: the user separately authorized the compact red box on the test domain. One typecheck, fresh no-cache Docker build and isolated migrated runtime passed; source manifests matched, and owned runtime resources were removed. Retained dirty-source image `ezswm:lag-notice-box-0.42.0-uncommitted-20261008T184543Z`, full ID `sha256:5abe2a7efc5364795fa3e049c1f9516a778752ee2b3a546f6ef754f6808d7d62`; evidence `/tmp/opencode/lag-notice-box-docker-0.42.0-20261008T184543Z/`. Parent reviewed the deployment-script delta: only release paths, image constants and chain counts changed; canonical secret validation and accepted backup/rollback control flow stayed unchanged. Separate root/Docker capacity checks passed immediately before execution, with Docker only about 45 MB above the 4,000,000,000 B guard. No deletion or threshold waiver was performed.

The guarded swap ran once at 18:53:22–18:53:36 UTC, exit 0, without retry or rollback. Parent read the actual eleven-line log ending `PREFLIGHT_OK`, `VERIFY_OK`, `DEPLOY_OK`. Current test container `cafa0a9691dfa10854701ca7fb5179696a1cbbbbb6ab398e8cfc623a630bdb81` has Image and Config.Image exactly the new full ID, healthy UID1000, loopback/public health 0.42.0 with `database_ok:true`, and 23 Compose files. Port, origin, data mount, setup/OIDC statuses and canonical secret signature are unchanged. Fresh verified stopped-container whole-data backup: `/tmp/opencode/ezswm-oidc-test/release-lag-notice-box-0.42.0-20261008T184543Z/data-backup`, owner1000/mode700, marker `backup-verified 2026-10-08T18:53:24Z`; scratch and live SQLite integrity checks passed. All 11 migrations remain finished with no pending migrations; all four raw archives are unchanged, with zero new pre-upgrade archives or pruning. Old-image anchor `ezswm:rollback-0.42.0-f29952c0035f-20261008T184543Z` is retained. Source, original auth, package and lockfile stayed unchanged; other four container identities/images/state/networks/mounts and networks/volumes matched. Final Docker free space is 4,045,041,664 B. No new browser/UI or dev-server proof, commit, push, public release or production update was performed. The compact red notice card is deployed for manual visual acceptance.

Local style follow-up (historical implementation) — 2026-10-08: the user accepted the deployed LAG ownership hint and requested the same compact notice-card design as the existing Device warning, in red. Only the notice class list in `SwitchPortSidePanel.vue` changed to `mt-2 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error`. Text, locale entries, ID/role, membership predicate, Reset guards/struck-through label and active Edit LAG action are unchanged. Targeted ESLint and whitespace checks passed once; parent read the resulting markup. At that checkpoint this style change was local/uncommitted; the separately authorized rollout above supersedes that deployment status. Changes remain uncommitted.

Final test-domain deployment — 2026-10-08: after the user manually freed Docker storage, parent independently observed `/var/lib/docker` free space of 5,283,299,328 B, root above 4,000,000,000 B, the unchanged healthy old container and retained new/rollback images. The obsolete read-only storage investigation was cancelled; its root cause remains undiagnosed. Fresh checks passed, and the existing unused guarded deployment script ran once at 18:17:09–18:17:24 UTC, exit 0, without rebuild, retry or rollback. Parent read the actual eleven-line log ending `PREFLIGHT_OK`, `VERIFY_OK`, `DEPLOY_OK`. The test domain now runs full container `b2e7e449cf719fe0267218d172f8deef370c6113c173ecbe7b2bb86bb43c3581`, Image and Config.Image both `sha256:f29952c0035f939b4efc0127cc60d58533407c3044f36e430d16feaaf8e66f1a`, healthy UID1000, loopback/public health 0.42.0 with `database_ok:true`, unchanged port/origin/data mount and 22 Compose files. The fresh stopped-container whole-data backup at `release-lag-notice-0.42.0-20261008T175516Z/data-backup` passed hash/owner/mode and scratch SQLite integrity checks; marker `backup-verified 2026-10-08T18:17:12Z`. Live integrity passed, all 11 migrations remain applied with no pending migrations, and all four raw archives, setup/OIDC status and canonical secret signature are unchanged. Other four container identities/images/state/networks/mounts matched before/after. Immutable old-image anchor `ezswm:rollback-0.42.0-eb8aae88fe3a-20261008T175516Z` is retained. Source fingerprints matched before/after except previously allowed migration-status metadata versus the image build; original auth, package and lockfile stayed unchanged. Final Docker free space was 5,283,295,232 B. No new browser/UI or pnpm dev proof, Git commit/push, public release or production update was performed. The red LAG ownership notice and struck-through Reset label are deployed for manual acceptance.

Approved targeted space recovery — 2026-10-08: after read-only inventory, the user explicitly approved deleting only the unused intermediate images `sha256:2a56b5d33237a959239249541d18f82bbf61ad67cc20b7bf0586929dc012aeeb` and `sha256:da02b24682ee50504bbe74f05a5cbec8b6ac7be013077e9e81260a55add928d4`, then deploying only if capacity passed. One non-force `docker image rm` succeeded for both IDs; parent read the four-line removal log. Despite the estimated 1.37 GB unique reclaim, Docker filesystem free space increased only 36,864 B to 3,815,202,816 B and remained below 4,000,000,000 B; a second capacity read was unchanged. The estimate did not establish actual filesystem reclamation, and the cause remains uninvestigated. No further deletion, cache prune, threshold reduction, deployment-script invocation, live preflight, rollback-anchor tag, backup, stop or up occurred. No post-removal live health/resource snapshot was taken. Evidence: `/tmp/opencode/lag-notice-docker-0.42.0-20261008T175516Z/inv/{rm.log,df.pre-rm,df.post-rm}`. Further work is stopped pending approval for a distinct read-only storage diagnosis, not another speculative cleanup attempt.

Deployment request — 2026-10-08: the user authorized this visual follow-up on the test domain. A fresh dirty-source image `ezswm:lag-notice-0.42.0-uncommitted-20261008T175516Z` (`sha256:f29952c0035f939b4efc0127cc60d58533407c3044f36e430d16feaaf8e66f1a`) passed typecheck, one no-cache Docker build and one isolated migrated runtime; source manifests matched and owned runtime resources were removed. No new browser or pnpm dev check was performed. The deployment was blocked before invoking any live preflight, stop or backup: `/var/lib/docker` had 3,815,165,952 B free, below the 4,000,000,000 B guard, while `/` had 4,327,870,464 B. The preparation report mistakenly queried root capacity twice and falsely identified Docker as the same filesystem; that report is corrected here, and the build occurred without a valid separate Docker capacity precheck. No live deployment, retry, prune, threshold waiver or rollback-anchor creation occurred. The healthy existing eb8 test image and its 21-file Compose chain remain unchanged; no data or archive was removed. New image/runtime evidence: `/tmp/opencode/lag-notice-docker-0.42.0-20261008T175516Z/`; prepared but unexecuted release: `/tmp/opencode/ezswm-oidc-test/release-lag-notice-0.42.0-20261008T175516Z/`. Further progress requires explicitly approved, targeted space recovery; no automatic cleanup is authorized.

Date: 2026-10-08
Stage: User-acceptance follow-up — clearer LAG ownership notice (prepared 0.42.0, uncommitted, deployed on the test domain, NOT publicly released).
Scope: LAG-member ports show a red notice directly under LAG Group and a struck-through label on the already-disabled Reset button. The same membership predicate, reset guards, active Edit LAG action and responsive layout are preserved; no behavior, backend or persistence changes.
Evidence: the user reported Access connection/status/reset checks (1–3), public mobile QR (5), and Viewer Data Management/QR (6–7) passing on the preceding test image. This is scoped manual feedback, not exhaustive LAG cleanup acceptance. The follow-up passed targeted component ESLint, both locale JSON parses and whitespace checks once; parent inspected the notice, label-only styling and unchanged guards. The subsequent typecheck, fresh Docker build/runtime and separately authorized test-domain deployment are recorded above; no new browser/UI proof exists yet. No Git commit is authorized for this follow-up.

## Previous Stage (historical: mobile public QR map and LAG footer acceptance/deployment)

Date: 2026-10-08
Stage: LAG port footer polish, then mobile public switch QR map (branch `fix/viewer-data-qr`, HEAD `563da4938ffa3ee16d738a72491b5a4ba31c5954`, prepared version **0.42.0**, uncommitted on top of the previously verified changes, NOT released; last released 0.41.0) — **SCOPED LOCAL CHECKS COMPLETE**
Scope: the user approved this order (LAG footer first, then the mobile public map). Footer: LAG-member ports show a subdued disabled Reset button, a clear LAG-editor hint and an available, unchanged Edit LAG action. Public page: on phones the read-only port map is shown horizontally above the unchanged list; `publicMode` is forwarded to port items in all three render paths, and the public fallback does not wrap on phones but retains desktop wrapping. Authenticated and print layouts are unchanged in source, but not exhaustively browser-verified. No minimum-member, version, security, backend or data change, no token rotation or camera change, no issue closure.
State: Writers are reconciled; 15 tracked paths are modified and the index is empty. Whole lint, typecheck, the full unit suite (77 files / 1093 tests), production build and a fresh migrated dev startup passed in `/tmp/opencode/acs-final2-131724/`. Dev health reported 0.42.0 and `database_ok:true`; its owned process was stopped and port 3363 freed. Source fingerprints matched before and after. Changes remain uncommitted; the separately authorized test-domain deployment below now includes this change. Last public release remains 0.41.0; 0.42.0 is prepared/test-only.
Docker evidence: one no-cache build (315 seconds), one healthy isolated runtime and one owned-resource teardown passed. Retained dirty-source image `ezswm:public-mobile-0.42.0-uncommitted-20261008T131544Z`, full ID `sha256:eb8aae88fe3a72dc89f3329f99537695722271ce5e49fb4c0413662cb5e3f4f0`; evidence/data in `/tmp/opencode/public-mobile-docker-0.42.0-20261008T131544Z/`. Runtime reported 0.42.0, a healthy database, UID 1000, 11 finished migrations, zero rolled back and SQLite integrity `ok`. Parent read startup/teardown and independently compared source manifests. Other container/network/volume snapshots were unchanged except for the retained image. Nonfatal font-fetch, sourcemap, VueUse-comment and chunk-size warnings remain; owned cleanup freed port 3361.
Browser history: a fresh private migrated production instance and one synthetic seed succeeded, then the first seven-case command stopped with 0 complete passes, 1 failure and 6 not run. Evidence: `/tmp/opencode/acs-mobile-public-prep-131043/`. In the 320px case, map visibility, local horizontal scrolling without page overflow, placement above the list, numeric 1/1–1/48 ordering and absence of edit controls passed before the request assertion failed: it allowed only the token endpoint but also observed `GET /api/_nuxt_icon/heroicons.json?icons`. This is a candidate missing icon-asset allowance in the external test, not established application failure or completed acceptance. DTO secrecy assertions and the remaining public widths, fallback, invalid-token and admin-footer cases did not run. Parent read the failure log and viewed the screenshot. No retry or filter was applied. Owned production cleanup freed port 3362, temporary environment/auth files were deleted and source/package/lock/schema/original-auth fingerprints remained unchanged. A bounded test-contract correction needs separate approval; no real Safari/iPhone, German UI, native login, IdP or phone-scan proof is claimed.
Approved correction and second browser command: the user authorized a ten-minute external-test-only correction and one run. The new private `phase2/` spec allows only exact GETs to its own public token endpoint and the observed local Heroicons endpoint; all unexpected HTTP, request-failure, console and page errors still fail. Existing seeded data was copied, private API auth reminted and no token/entity reseeding performed. The command passed six public cases: 320/390/1280px template maps, real template-free fallback at 390 then 1280px, revoked token and missing token. Assertions cover map placement, local scrolling without page overflow, 48-card numeric ordering, read-only controls and safe public DTO fields. The seventh admin case passed the new member footer's disabled Reset, hint, available Edit LAG and in-viewport Save/Cancel checks, then failed immediately after opening Edit LAG: a button's right edge measured 697.67px against a 390px viewport. Parent read the log and both screenshots; the member footer is visibly compact, while the LAG editor is partially off-screen in the failure capture. Persistent layout overflow versus an in-progress slide transition is unresolved, not a confirmed product defect. Parent independently compared before/after fingerprints (equal) and seven unexpected-error arrays (all empty). No further retry, app change, build or deployment followed; owned cleanup freed port 3362. Full admin-editor acceptance remains open pending a separately approved focused diagnosis.
Focused geometry closure: the user separately approved a five-minute read-only source diagnosis and then one five-minute admin-only observation. Nuxt UI's generated right-side entry animation lasts 200ms; visibility alone did not establish settled geometry. The new external `phase3/` case records native animations and condition-polls their completion without a fixed delay or disabling animation. It passed once (1/1, 5.7 seconds), retaining the original member-footer and Save/Cancel viewport assertions. Before settling, the LAG dialog measured x=384.66px, width=390px, with a running `slide-in-from-right` transform; afterward x=0, width=390, right=390, transform `none` and no active animations. Parent read the passing log, settled geometry and screenshot. This observation establishes the earlier geometry failure as an entry-animation sampling issue for the tested flow, not persistent overflow. No application fix was needed. All seven intended browser cases are covered across the six-case successful public coverage in phase2 and the one successful admin-only command in phase3, not one seven-pass command. Source fingerprints matched; temporary private auth/environment and owned server were cleaned up, port 3362 freed. This remains English Chromium emulation/API-seeded auth, not real Safari/iPhone or exhaustive authenticated/print verification. Only evidence metadata changed after frozen checks. Local scope is complete; no commit, test-domain update or release is authorized by completion.
Separately authorized test-domain deployment — 2026-10-08: user requested the complete acceptance report and an update of `https://ezswm-test.saar-lan.de`. The first guarded image swap failed on an order-sensitive JWT/OIDC environment-line signature; automatic image-only rollback restored the healthy C1 image. Actual key values were unchanged. After explicit new approval, a reviewed external helper canonicalizes the two exact required environment keys, preserves complete values, rejects missing/duplicate/empty keys and compares full SHA-256 signatures before/after. Synthetic fixtures covered ordering, unrelated variables, changed values, equals/newlines/case/whitespace and invalid inputs; the secret check was not skipped. All old release scripts/evidence were preserved.
Final deployment passed once in 14 seconds, exit 0, without rebuild or database restore. Evidence and fresh verified stopped-container whole-data backup: `/tmp/opencode/ezswm-oidc-test/release-public-mobile-canonical-0.42.0-20261008T135050Z/`; marker `backup-verified 2026-10-08T13:53:27Z`. Current full container `c2a83ba15c2b283356fabc0e1ec55c6f330b2df224687a051beb7b47c532163e` has Image and Config.Image exactly `sha256:eb8aae88fe3a72dc89f3329f99537695722271ce5e49fb4c0413662cb5e3f4f0`, healthy UID1000, loopback/public health 0.42.0 with `database_ok:true`, 21 compose files and unchanged origin/3101/data mount. Canonical key signature, setup/OIDC status and image-independent configuration remained unchanged; 11 migrations, no pending and live SQLite integrity `ok`. All four raw pre-upgrade archives remained unchanged, with zero new archives or pruning because the version was already 0.42.0. The six-file whole-data backup passed hash/owner/mode/type and scratch integrity checks. Immutable C1 rollback anchor `ezswm:rollback-0.42.0-c1c23f68a8b4-20261008T135050Z` is retained. Source manifests matched before/after except intentional prior evidence metadata versus the image build; other full container identities were unchanged and resource-list delta was only the new rollback tag. Parent read actual PREFLIGHT_OK/VERIFY_OK/DEPLOY_OK log. No new live browser/login/IdP or physical-phone checks were performed by deployment. No commit, push, merge, public release or production update followed.

## Previous Stage (historical: Access connection status alignment modal — scoped complete)

Date: 2026-10-08
Stage: Access connection status alignment modal (branch `fix/viewer-data-qr`, HEAD `563da4938ffa3ee16d738a72491b5a4ba31c5954`, prepared version **0.42.0**, uncommitted follow-up, NOT released; last released 0.41.0) — **SCOPED LOCAL CHECKS COMPLETE**
Scope: user go 12:00:50 UTC (35 minutes, until 12:35:50 UTC). One shared modal for unequal known up/down statuses; alignment is NOT selected by default, so a normal save keeps the draft's status/link/VLAN changes; Cancel writes nothing and keeps the draft. Both down keeps the optional both-up choice; both up shows no modal. A new, unconfigured ordinary peer with a known status takes it without a forced mode or VLAN; the existing optional Access/VLAN sync and its best-effort outside-transaction limits are unchanged (no global VLAN atomicity promised). Trunk, LAG, unknown and disabled ports are not eligible. Status-only updates are atomic with identity/version guards, preserve metadata and reset nothing.
Root cause: a newly found case — a peer saved with a null mode — was missed by the earlier matrix, which only covered peers already in Access mode (20); a second source-open, configured-peer, no-modal case remains unproven live. The footer LAG polish is queued after this blocker and is neither implemented nor claimed.
State: All writer and validation lanes are reconciled. There are 13 modified tracked paths, with an empty index; package version remains 0.42.0 and dependencies/lockfile are unchanged. No automatic commit or deploy follows. The test domain still runs image C1 in container `58e0198e6b1d5f2274a822f4cdcf938a4b021c09e1fe7c6f349a20163b014e7e`; it does not include this follow-up. The footer LAG polish remains the next separate task.
Implementation and review: the additive target-status protocol supports Up and Down while retaining the legacy Up request. Protocol fields are removed before persistence/activity diffing. Source-version, peer identity/status/initial switch-version and final reciprocal-link checks protect the existing transaction; conflicts roll back its status changes. A bounded pristine unset-mode network-port branch supports fresh and already reciprocal peers without treating unknown/disabled status as Down. Existing optional best-effort VLAN copying is unchanged. The shared modal captures the draft/context and invalidates on permission, target or draft changes; late replies cannot affect a different editor. Both backend and UI received read-only review.
Current source evidence: targeted counterpart-status tests passed 19 cases. Final whole lint, typecheck, full suite (**77 files / 1093 tests**) and production build passed in `/tmp/opencode/current-src-checks-20261008T122338Z/`. The earlier specialist task returned only browser preparation and did not establish those global checks; the separate final source lane closed that gap before the browser ran. Successful h3 harness statuses are stubbed, not native HTTP proof. The dev lane first started directly without migrations and observed a missing-table error/version 0.0.0; contrary to the requested single-start discipline it then stopped, applied 11 migrations to the private database and started `pnpm dev`. The corrected dev run reported 0.42.0, `database_ok:true` and initial setup incomplete, then its owned process was stopped and port 3363 freed. This prerequisite/startup deviation is retained rather than described as a clean first attempt.
Docker evidence: one fresh no-cache build (319 seconds), one healthy isolated runtime and one owned-resource teardown passed. Retained dirty-source image `ezswm:status-align-0.42.0-uncommitted-20261008T120846Z`, full ID `sha256:fc60fc57ddff1b42ff8594e9d8c1d156e847309d6afb3f4f9b4ff793c8ef2fe4`, is not a HEAD-only build. Evidence/data: `/tmp/opencode/status-align-docker-0.42.0-20261008T120846Z/`. Health reported 0.42.0 and a healthy database, UID 1000, initial setup incomplete, 11 finished migrations, zero rolled back and SQLite integrity `ok`. The parent read startup/teardown and independently compared build-before/after manifests. Other container/network/volume snapshots remained unchanged except for the retained image; port 3361 is free. Nonfatal font-fetch, sourcemap, VueUse-comment and chunk-size warnings remain.
Native browser evidence: one command passed **8/8 cases** in 24.7 seconds, workers 1, retries 0, max failures 1. Evidence: `/tmp/opencode/acs-status-ui-prep-120905/`. Cases cover a first connection to an unset peer with automatic VLAN 20 copying and Both Up; an empty-VLAN first connection choosing Both Down while leaving the peer mode unset; an already configured reciprocal Down peer receiving a status-only update; opening the unset reciprocal endpoint in reverse and choosing Both Down; a deliberate local Down draft on an Up/Up pair; default Down/Down saving with no PUT followed by reopening and Both Up; Up/Up description-only saving without a modal; and Cancel preserving a new-link draft before default saving with ordinary VLAN copying. The parent read the full seed/spec/config, corrected omitted-null DTO and reverse-refresh assumptions before execution, read the passing log and independently verified eight real PUT HTTP 200 records with empty unexpected console/page/HTTP/request-failure arrays. The cases wait for a fresh GET of the switch addressed by the PUT and check selected/unrelated port metadata and configured VLAN preservation. No source fixes, retries or mocks were used during this browser command.
Integrity and limitations: the parent independently compared source and browser before/after fingerprints; both match. The original ignored test-auth file retained its trusted hash; the browser used private API-seeded auth and deleted its temporary auth/environment files. Owned production cleanup freed port 3362; data/fixtures/evidence are retained privately. Authentication was not native UI login; browser coverage is English Chromium only, with no new German, IdP, phone, LAG, reset or QR replay. The reported second-open failure on the user's live data was not directly inspected; controlled already-configured and reverse-endpoint cases passed. Completion was recorded before the approved 12:35:50 UTC deadline. Only this evidence metadata changed after the frozen checks; no commit, deployment or release occurred.

## Previous Stage (historical: unified UP confirmation, earlier capture)

Date: 2026-10-08
Stage: Unified Access connection status-up confirmation (branch `fix/viewer-data-qr`, prepared version **0.42.0**, uncommitted, NOT released/published; last actually released version is 0.41.0) — **SCOPED LOCAL CHECKS COMPLETE; TESTED SOURCE RESTORED**
Scope: user approved a unified modal at 10:38:49 UTC (35-minute limit, deadline 11:13:49 UTC) on baseline HEAD `8da1ba4` (the committed LAG-member guard). Saving an Access connection between known switch ports opens one shared ConfirmDialog by status combination: both down offers two independent unchecked source/peer up checkboxes; source up/peer down offers peer only; source down/peer up offers source only; both up shows no dialog. No opt-in changes no status; other edits save normally; Continue editing writes nothing and keeps the draft. Selected up-statuses are applied in the existing port PUT transaction with fresh identity/peer validation; disabled, unknown, free-text, Trunk and LAG ports are never auto-upped. No metadata, reset, LAG, auth, schema or dependency changes; the existing ordinary-Access counterpart-reset checkbox and LAG reset behavior are unchanged.
Implementation and review: the optional peer-UP protocol is extracted before persistence/activity diffing and validated inside the existing port transaction. Peer identity, Access mode, membership, eligibility, initial switch freshness and final reciprocal link are checked before the status change; conflicts roll back the transaction. Ordinary saves and separate best-effort VLAN copying retain their existing behavior. The modal captures the draft and source/peer context; role, target or draft changes invalidate it. Parent review added late-response context guards and corrected an optional-model boolean after the first typecheck failed. That failed result is retained, not counted as a pass.
Unit evidence: the intended targeted command accidentally ran the full suite and passed **77 files / 1086 tests**. Afterwards, a swallowed assertion was removed from the new test file; the final **12 counterpart-status cases** and targeted ESLint passed. The full-suite log therefore predates that test-only correction. Successful statuses in the h3 harness are stubbed, not native HTTP proof. Final whole lint, typecheck, production build and a fresh isolated `pnpm dev` startup passed after the UI guards and boolean correction. Dev health reported 0.42.0 and `database_ok:true`, with 11 fresh migrations. Evidence: `/tmp/opencode/acs-final-20261008T105643Z/`. Owned cleanup freed port 3363. Nonfatal font-fetch, sourcemap, VueUse-comment and chunk-size build warnings remain.
Docker evidence: one fresh no-cache build (340 seconds), one healthy isolated runtime and one owned-resource teardown passed. Retained image `ezswm:access-peer-up-0.42.0-uncommitted-20261008T105116Z`, full ID `sha256:c1c23f68a8b4d7fe23565c6268f3da08b5862910e27d257c2dada7b299dc416e`, includes the final code, not HEAD alone. Evidence/data: `/tmp/opencode/access-peer-up-docker-0.42.0-20261008T105116Z/`. Health reported 0.42.0 and a healthy database; UID 1000, initial setup incomplete, 11 finished migrations, zero rolled back and SQLite integrity `ok` were recorded. The parent read migration/startup and teardown logs and independently compared build-before/after source manifests. Port 3361 is free; other container/network/volume snapshots remained unchanged except for the retained image. The original ignored test-auth file exists and retains the trusted SHA256 `7643244ac77843a46a503c42b4a7f2030bc268f5bcf29676edb07be5e7749527`; an earlier relative-path claim that it was absent was incorrect.
Browser attempt: external scripts in `/tmp/opencode/acs-final-20261008T105643Z/b/` seeded two synthetic switches and five reciprocal Access pairs. A command-path typo exited 127 before a browser ran; the specialist restarted the owned server and recreated private API-login state without reseeding, contrary to the requested stop discipline. The subsequent single five-case browser command stopped after its first failed case (four not run). Observed before failure: named default-off local/peer checkboxes, Cancel retaining a draft with no PUT, and Save without status changes leaving both ports down with no PUT and a source refresh. The script then tried to use Save in the editor it had just closed, omitting the explicitly required port-reopen action. The parent read the script, failure log, DOM snapshot and modal screenshot: the final locator was absent; Save is disabled by baseline/loading guards, not by a clean-draft rule. The failure was not evidence of a product save defect. Owned cleanup freed port 3362; source/package/lock/auth fingerprints were reported unchanged for that first round.
Corrected browser round: user separately approved an eight-minute, test-only closure. One command in `/tmp/opencode/acs-final-20261008T105643Z/b/phase2/` passed **5/5 cases** (18.7 seconds): Down/Down both up, Up/Down peer only, Down/Up local only, Up/Up description-only without a modal, and Down/Down peer only with local remaining down. Cancel/draft retention and default-off request-free saving were retained. Native PUTs returned HTTP 200; exact request fields, peer freshness, full port snapshots apart from selected changes and unchanged configured VLAN lists passed. Reported per-case error arrays were empty. The parent read the passing log and independently diffed the scripts: only the private output path and three required reopen lines changed. The owned server was removed, port 3362 is free, and temporary private environment/auth state was deleted. No new build, source fix, fixture reseeding, commit or deployment was performed for that round.
Source-integrity incident and recovery: during the corrected browser round, `server/validators/switchSchemas.ts` lost its counterpart-UP validation edit and temporarily matched HEAD. The parent verified the missing fields and the before/after fingerprint discrepancy. The actor remains unknown; the specialist denies modifying it and the user reported making no change. After explicit user approval for a three-minute, one-file recovery, the specialist reconstructed the original patch in a private temporary file, verified the exact tested SHA256 before promotion, rechecked current-file stability, and restored only that validator while preserving mode/ownership. The parent independently confirmed the full restored hash `7fbfb28c858f2362873b957dfadc364ac1f5694e916b43ed38365c4c0fa0c7b5` and all **562 hashed source files** against the Docker build-before manifest; the only difference is this intentionally updated migration-status document. Package, lockfile, other code and the ignored auth file match. The tested build evidence therefore applies again to the restored source; no redundant rebuild or browser replay was needed. The unknown actor was not investigated or attributed. Worktree remains uncommitted at HEAD `8da1ba4`, index empty, with 13 changed/untracked paths. Test domain still runs the earlier `0e8737…` image; 0.42.0 remains prepared and unpublished. German, native UI login, IdP and new LAG/QR browser checks were not repeated. No commit, push, deployment or release occurred for this task.

## Previous Stage (historical: LAG-member reset guard)

Date: 2026-10-08
Stage: Direct reset of LAG-member ports blocked (branch `fix/viewer-data-qr`, prepared version **0.42.0**, uncommitted, NOT released/published) — **SCOPED LOCAL CHECKS COMPLETE**
Scope: `switchRepository.resetPort` rejects any port with a `lag_group_id` (mirrored or unsynced, any member count, with or without the counterpart option) with 409 `LAG member ports must be managed through the LAG editor`, `data.reason: lag_member_reset_forbidden`, before any write. Reset is visibly disabled with a LAG-editor hint; the port panel's membership action opens the associated LAG editor rather than removing a member immediately. Membership and peer mapping are managed in the LAG editor (>= 2 configured members); no automatic detach, dissolve or repair of already inconsistent mirrors. Known switch-version conflicts and other port/LAG assignment conflicts receive distinct localized messages. The local-only reset now uses the same dismissible confirmation dialog as the optional counterpart reset so a membership change can invalidate it. Non-LAG reset semantics, bulk, LAG update/delete flows and schema/auth/deps remain unchanged. The Access-UP prompt is not implemented.
Root cause evidence: the initial external script stopped on a missing VLAN 20 fixture (zero cases); the corrected six-case repro showed four fresh-version post-reset saves rejected by the mirror guard, a distinct stale-version control rejected by the version guard, and a healthy baseline save. Nine new isolated middleware/route tests cover reset rejection with unchanged raw ports, groups and switches, mirrored and unsynced two/three-member groups, SFP/Trunk members, payload variants, auth gates, ordinary reset preservation, healthy LAG save and the existing minimum-two restriction. The h3 harness stubs successful response statuses; its 200 is derived, not native HTTP.
Final automated evidence: one whole-project lint, typecheck, full unit suite (**76 files / 1074 tests**) and production build passed. Evidence: `/tmp/opencode/lag-reset-final-20261008T095211Z/`. An isolated `pnpm dev` start on port 3362 applied 11 fresh migrations and reported 0.42.0 with `database_ok:true`; the startup log has no errors. Owned server cleanup freed the port. Before/after source manifests were reported identical; the original ignored test-auth file was absent in both, not an existing file with a verified hash. The parent read the typecheck, unit summary and dev startup evidence. Nonfatal sourcemap, VueUse-comment and chunk-size build warnings remain.
Fresh Docker evidence: one no-cache build (333 seconds), one healthy isolated runtime and one owned-resource teardown passed. Image `ezswm:lag-member-guard-0.42.0-uncommitted-20261008T094740Z`, full ID `sha256:38245a86d81fc87877e45bb76d1fe981b1354f405f269c3185f1337b719abd48`, was built from the dirty working tree, not HEAD alone. Evidence and retained fresh data: `/tmp/opencode/lag-member-guard-docker-0.42.0-20261008T094740Z/`. Health reported 0.42.0 and a healthy database; UID 1000, 11 finished migrations with zero rolled back, SQLite integrity `ok` and initial setup incomplete were recorded. The parent read all migration/startup lines and teardown, independently compared source manifests and confirmed that resource snapshots differ only by the retained new image. Port 3361 is free; unrelated containers, networks and volumes remained unchanged. Nonfatal font-fetch, sourcemap, VueUse-comment and chunk-size build warnings remain. A source-path grep did not independently prove the guard in the bundled image; the frozen build context, source manifests and resolved image identity are the evidence.
Browser closure: the initial source-check lane stopped before browser preparation because the fixture contract was uncertain; no browser case failed. The parent then read the complete previously validated seed script, resolving that prerequisite within the original 35-minute approval. One copy of that script seeded fresh isolated fixtures, and one production-server browser command passed four tests (three interaction cases, with the conflict-copy case split into two), workers 1, retries 0, max failures 1. Evidence: `/tmp/opencode/lag-reset-final-20261008T095211Z/b/`. The parent read the full 98-line spec and passing run log. A two-member LAG port showed disabled Reset and the editor hint; Edit LAG opened its editor, a real healthy PUT returned HTTP 200, and reciprocal member-port mappings survived. A crafted bodyless member DELETE returned native HTTP 409 with `data.reason: lag_member_reset_forbidden`; before/after API snapshots of both switches and groups matched. Mocked version and mirror-conflict responses produced distinct visible localized titles; these are UI-copy tests, not backend concurrency proof. An ordinary unconnected port retained its enabled reset and checkbox-free confirmation; real DELETE and refresh returned 200, status became down and tested cleared fields were absent, while identity, PoE, helpers, unrelated ports and the configured VLAN list were preserved.
Browser limitations: three-member groups and the below-two restriction have backend regression coverage, not new browser coverage. Healthy save was exercised on one mirrored group; its member-count observation was logged, not an independent exact group-ID preservation assertion. The external error arrays accumulate across tests and classify collected LAG PUT 409/resource-console entries broadly as expected; the reported two entries correspond to the deliberate mocks, with no other collected errors. No German, phone, other-browser, native UI login, IdP, LAG deletion or bulk replay is claimed. Production startup, seeded authentication and owned cleanup were recorded; port 3362 is free and temporary auth/environment files were removed. Repository state and package/lock fingerprints were reported unchanged during the lane, with migration-status metadata excluded from that comparison; the original ignored test-auth file was absent. Test domain still runs the earlier image `0e87…` built before this fix; no new commit, deployment or release occurred. Last public release remains 0.41.0; 0.42.0 is prepared and untagged. Access peer-UP remains the next separate task.

## Previous Stage (historical: Optional counterpart port reset for reciprocal Access peers)

Date: 2026-10-07
Stage: Optional counterpart port reset for reciprocal Access peers (branch `fix/viewer-data-qr`, prepared version **0.42.0**, uncommitted, NOT released/published) — **SCOPED CHECKS COMPLETE; TESTDOMAIN UPDATED**
Scope: a new explicit optional capability is a feature, so the semver minor 0.42.0 is prepared from the last released 0.41.0. The earlier prepared 0.41.1 was never published; its QR/Viewer, Data Management and Issue #289 entries are folded into the 0.42.0 changelog heading (2026-10-07) with no phantom 0.41.1 release. Resetting a local Access non-LAG port connected to the exact reciprocal Access non-LAG peer: default resets only the local configuration and severs the link on both ends (peer config retained); an explicit checkbox naming the target switch and port fully resets the counterpart (status down; speed, mode, access/native/tagged VLANs, link, allocation, description, MAC cleared; port identity, PoE, helpers and the switch's configured VLAN list preserved). Trunk/LAG peers are never offered; missing, stale or invalid targets are rejected atomically without erasing unrelated rows. Optional strict request fields `reset_counterpart` and `expected_counterpart_port_id`; no token, user or identity-provider changes. Existing LAG and bulk flows are frozen; the LAG-checkbox cleanup is planned and not yet tested or claimed. No native-phone, SSO or harness-green claim.
Implementation is source-reviewed and frozen. User approval was time-bounded (2026-10-07, 21:43:04–22:23:04 UTC); no publication or deployment is authorized.
Final completion supersedes the earlier pending-dev and no-deployment remarks: the user subsequently authorized the test-domain update and a new 25-minute bounded workflow. One independent isolated `pnpm dev` start on port 3363 passed, with 11 fresh migrations, version 0.42.0, `database_ok:true` and no warnings/errors in the startup log. The parent read the health JSON and startup log at `/tmp/opencode/access-reset-dev-final-20261008T052541Z/`. The optional login probe redirected with HTTP 302; no new browser/login/IdP proof is claimed. Owned server cleanup freed port 3363 and source hashes remained unchanged.
The approved image-only test deployment ran once on 2026-10-08, 05:28:38–05:28:52 UTC, exit 0, without a rollback or retry. The parent read `PREFLIGHT_OK`, both scratch SQLite integrity results, `VERIFY_OK` and `DEPLOY_OK` in `/tmp/opencode/ezswm-oidc-test/release-access-reset-0.42.0-20261008T052552Z/evidence/deploy.log`. Test container `d898f7156fef496de53c1d9206636f38de8cf5065342fc996704fbaec6e0920e` runs exact image `sha256:0e8737d96f50721e38e42ddbf6a8f4f2031b74499b99e3cc015b150b94620b50`; loopback/public health report 0.42.0 and a healthy database. Compose chain is 18, user 1000:1000, binding remains 127.0.0.1:3101 and data mount is unchanged. A fresh stopped-container whole-data backup at that release's `data-backup/` passed hash/owner/mode/type and scratch-integrity checks before replacement; `state/BACKUP_OK` is retained. Exactly one archive `20261008T052841Z_from-0.41.0_to-0.42.0` was created, with the old three preserved, no retention pruning and 11 unchanged migration rows/no pending migrations. Setup, OIDC/SaarAuth, key fingerprints and the four other containers remained unchanged. Old-image rollback anchor `ezswm:rollback-0.41.0-279c80a9f4b5-20261008T052552Z` is retained. No rebuild, Git commit/push/PR/merge, public release, production deployment, account deletion, token change or provider change occurred. Final app/source image identity was checked against the retained 557-file manifest; only this migration-status evidence differed. Endpoint-level deployment evidence is not a new UI/login/provider check; earlier scoped browser limitations remain explicit. Awaiting user manual test feedback before separate Git/publication approval.
Latest separately approved closure (phase 12, 2026-10-07, 22:44:57–22:45:05 UTC): one browser case passed, exercising normal LAG deletion with both mirror deletion and member reset checked, exact request body `{reset_ports:true,delete_remote:true}` and HTTP 204. All four member ports passed strict reset checks; identity, PoE and helpers were preserved; non-member ports and both configured VLAN lists matched fresh pre-action snapshots. Follow-up switch/LAG GETs returned 200. The parent read the actual 86-line spec, result JSON, preflight and passing run log. The sole captured request-failure event was the exact DELETE's post-204 canceled ERR_ABORTED signature, classified and retained separately using same-CDP-request response/failure correlation and the independent comparison below; all other collected errors were empty. No `response.finished()` wait, reload, source change, reseed or repeated command was used. Evidence: `/tmp/opencode/access-reset-checks-20261007T215009Z/phase12/`.
The previous mirror-only deletion was checked read-only: both group collections empty, links/group IDs cleared, member configuration retained. Contrary to the planned stronger check, no saved pre-action snapshot existed for that fixture; preservation was compared with seeded field values and untouched sibling VLAN lists, a weaker baseline. The final case explicitly checked reset member group IDs were absent but did not separately assert that both post-action group collections were empty; do not overstate that assertion from the agent's report. Access default/opt-in acceptance and default LAG persistence evidence remain valid across their earlier runs, not a single five-case green browser command. Existing LAG implementation was unchanged. Owned server/browser cleanup left port 3362 free; repository, package, lockfile, original auth and non-ignored untracked files were reported unchanged during this lane. No commit, deployment, issue closure or release followed. Independent `pnpm dev` startup remains a required unverified check; full release readiness is not claimed.
Separately approved isolated transport comparison (2026-10-07, 22:41:23–22:41:24 UTC): a standalone loopback HTTP/1.1 server, with no application, database or auth code, returned the same empty 204 to native fetch and the installed ofetch 1.5.1 in the existing Playwright Chromium. Native fetch without body consumption and ofetch both resolved successfully but emitted CDP `loadingFailed`, `canceled:true`, `net::ERR_ABORTED` immediately after the 204. Native fetch with `await response.text()` returned an empty string and emitted `loadingFinished`; the ofetch JSON-200 control also finished normally. All terminal events occurred before context teardown, with no console or page errors. The parent read the complete result JSON and diagnostic script. This reproduces the transport signature independently of ezSWM and supports classifying the matching empty-204 notification in this tested environment; it does not certify other browsers/proxies or retroactively prove every historical abort. The actual evidence directory, resolved via its retained locator after the report named an incorrect timestamp, is `/tmp/opencode/204-fetch-comparison-20261007T224117Z/`. One diagnostic command ran; owned server/browser cleanup and unchanged repository/package/lock/auth were reported. No app change, LAG mutation or additional acceptance test followed. Remaining acceptance: read the already-deleted mirror-only fixture state, then exercise the untouched mirror-plus-member-reset case without the known hanging `response.finished()` observer; only the exact matching 204 cancellation signature may be classified separately from genuine errors. Independent dev startup also remains unverified.
Phase 11 (separately approved, 22:32:10–22:33:14 UTC) completed the default LAG deletion by read-only persisted-state checks: source group absent, mirror retained with exact members but no remote device fields, links cleared and member configuration retained. The two remaining browser cases stopped at the first failure (zero passed, one failed, one not run). Mirror deletion returned HTTP 204; the same CDP Fetch request then emitted `loadingFailed`, `canceled:true`, `net::ERR_ABORTED` six milliseconds later. The test waited on `response.finished()` until its 60-second timeout; no completed body/port-persistence assertion ran. The parent read the CDP request/response/failure identity and timestamps; subsequent switch/LAG GETs succeeded. This shows the abort also occurs without the earlier incorrect 200 assertion, so that assertion's failure alone does not explain it. The underlying transport/app cause remains unknown; the abort was not filtered or accepted as harmless. Mirror-plus-port-reset remains unexecuted, and the second LAG fixture may now be changed by the successful DELETE (not subsequently re-read). Evidence: `/tmp/opencode/access-reset-checks-20261007T215009Z/phase11/`. Own server PGID 1134160 was stopped, port 3362 was free, and source/package/lock/auth were reported unchanged. No automatic retry, reseed, source fix or deployment followed. Access acceptance and earlier automated/Docker checks remain valid; overall LAG acceptance remains incomplete.
Latest separately approved acceptance round (phase 10, 22:14:24–22:14:34 UTC): standard Access reset was completed by read-only persisted-state checks combined with its prior UI/HTTP evidence; counterpart Access reset passed its fresh browser case. Both full-reset ports retained identity, PoE and helpers, unrelated ports and switch VLAN lists matched their actual pre-action snapshots. The script initially assumed configured VLAN lists were `[20,30,40]`; a read-only preflight failed and was corrected to actual snapshot preservation before the one browser command. This was an external-script deviation, not a product change. The command then stopped with one passed, one failed and two not run: default LAG deletion returned the correct HTTP 204, but the script expected 200. The parent independently read the route's explicit 204 and actual failure log; the previous assertion audit missed that status contract. A subsequent `net::ERR_ABORTED` on that DELETE remains unexplained and must not be masked or declared harmless. The deleted source LAG must not be treated as an untouched fixture; its mirror/config persistence checks did not execute. Mirror-only deletion and mirror-plus-member-reset remain unrun. Evidence: `/tmp/opencode/access-reset-checks-20261007T215009Z/phase10/`. Access case error collection was empty; no whole LAG acceptance or clean overall command is claimed. Own server PGID 1124437 was stopped, port 3362 was free, and source/package/lock/original auth state were reported unchanged. Further investigation or execution requires explicit approval; no automatic retry, reseed, commit or deployment followed.
Subsequent separately approved browser command (phase 9, 22:08:18–22:08:27 UTC) stopped at its first failure: zero complete cases passed and four did not run. The corrected Description interaction, both default-unchecked checkbox checks, Cancel preserving the draft, bodyless reset DELETE with HTTP 200, and the post-mutation switch refresh completed. The final local-state assertion expected eleven cleared fields as literal JSON null, but the established `rowToPort` mapper converts them to undefined and JSON omits them. The parent independently read the failure log and mapper; this is a test DTO-contract mismatch, not evidence of failed reset. Status down and empty tagged VLANs matched. The peer-preservation assertion and all other cases remain unexecuted. The recorded error array was empty. The local test port is now reset and its peer link cleared, so it must not be treated as an untouched fixture. No automatic retry or reseed followed; own server PGID 1120962 was stopped and port 3362 was free. Evidence: `/tmp/opencode/access-reset-checks-20261007T215009Z/phase9/`. Full browser acceptance remains open; further work requires explicit approval and a complete remaining-assertion contract audit rather than another unchanged run.
Current automated evidence: whole-project lint, typecheck, full unit suite (75 files / 1065 tests) and production build passed. Logs: `/tmp/opencode/access-reset-checks-20261007T215009Z/source-final-215710/`; the parent read the typecheck log and test summary. Package, lockfile, source and original test-auth state were reported unchanged. A separate isolated dev startup remains unverified; the browser lane used the healthy production artifact at version 0.42.0 with `database_ok: true`.
Current Docker evidence: one no-cache build (316 s), one healthy fresh runtime and one owned-resource cleanup passed. SQLite integrity was `ok`, all 11 migrations finished with zero rolled back, UID was 1000, and initial setup was incomplete as expected. The parent read the migration/integrity, startup and cleanup logs. Retained dirty-working-tree image: `ezswm:access-reset-0.42.0-uncommitted-20261007T215536Z`, full ID `sha256:0e8737d96f50721e38e42ddbf6a8f4f2031b74499b99e3cc015b150b94620b50`; evidence/data: `/tmp/opencode/viewer-data-qr-docker-access-reset-0.42.0-20261007T215536Z`. Nonfatal font-fetch, sourcemap, VueUse-comment and chunk-size warnings remain. Own container/network were removed; other containers, networks and volumes were preserved, and port 3361 was free.
Browser acceptance remains open: one five-case command ran 22:04:43–22:05:48 UTC and stopped at its first failure (zero passed, four not run). Fresh isolated fixtures were seeded through asserted HTTP responses. The default Reset dialog and unchecked counterpart checkbox were reached, but the script then tried to fill the underlying Description field while the confirmation modal was already open. The parent read this ordering in the actual spec; this is a test-script interaction defect, not demonstrated application failure. A label-association defect is not established. No reset or Cancel/draft persistence assertion ran. The recorded error array was empty; no overall UI acceptance is claimed. Evidence: `/tmp/opencode/access-reset-checks-20261007T215009Z/run8.log` and `results/`. Own server PGID 1118171 was stopped, port 3362 was free, and no automatic retry followed. The fixtures were retained unchanged. Further browser work requires explicit approval; no source fix, commit or deployment followed.

---

## Previous Stage (historical: Issue #289 Access connection fix, prepared 0.41.1 scope)

Date: 2026-10-07
Stage: Issue #289 reciprocal Switch-port Access connection fix (branch `fix/viewer-data-qr`, prepared version 0.41.1, uncommitted, NOT released) — **IMPLEMENTED; AUTOMATED CHECKS PASS; Access and occupied-peer browser cases PASS; observed LAG save/reload assertions PASS without console errors; external browser command still FAILS on test-induced request aborts**
Scope: included in the prepared 0.41.1 (no new version, no new Unreleased entry). A reciprocal Switch-port **Access** connection now creates the peer link independently of the optional VLAN copy, and the overwrite warning now uses the correct counterpart port UUID so the false overwrite warning is gone. The originally commented LAG case is not claimed as verified, the issue is not claimed closed, and a manual-save server error is not attributed to this change (the images show only the warning; manual save works).
Implementation: backend — a reciprocal-link helper now runs inside the existing apply transaction; four connected-port assignments in the route were removed and the optional VLAN copy is kept. A designer-owned canonical-UUID change touches two files (written; its own shell ESLint/diff check exited 127 and was not executed). No schema, dependency, token or auth-policy changes.
Evidence so far: 10 new backend tests PASS (isolated route handlers, no literal HTTP): create with VLAN flag false and VLAN 20 copy, metadata, disconnect, clear, move, busy-LAG guard and same-switch cases, plus a positive healthy-LAG group repository fixture (not a full LAG UI/route test). Targeted ESLint on the 3 backend files passed.
Current verification: whole-project lint passed (27 s), typecheck passed (19 s), full unit suite passed (74 files / 1058 tests), production build passed, and the isolated dev instance reported 0.41.1 with `database_ok: true`. Evidence: `/tmp/opencode/bug289-final-source-20261007T202122Z` (the report initially named the directory with a one-second timestamp discrepancy; its retained locator supplied the actual path). The parent read the typecheck log and full-suite summary. This run includes the existing switch/LAG integrity controls, Viewer QR tests and all ten new connection regressions; no full LAG browser/route certification is claimed. Source diff, package, lockfile, both new test files and original test-auth state were unchanged during checks. No repository edits or test retries were made in this lane.
Current Docker verification: one fresh no-cache build passed (313 s), followed by a healthy fresh 0.41.1 runtime with UID 1000, SQLite integrity `ok`, all 11 migrations finished and zero rolled back. The parent read the migration/integrity output, startup and cleanup logs. Retained dirty-working-tree image: `ezswm:viewer-data-qr-289-0.41.1-uncommitted-20261007T202123Z`, full ID `sha256:6e42e9b6d18c9bb39a42bdd94e1d77032fd8dfc24e9422e8d8644f78a8745d0e`; evidence/data: `/tmp/opencode/viewer-data-qr-docker-289-0.41.1-20261007T202123Z`. Non-fatal font-fetch retries, sourcemap, VueUse-comment and chunk-size warnings remain. Own container/network were removed; image and data retained. Existing containers, networks, volumes and source files were preserved. The earlier `e5e6a0…` image is historical and predates this fix.
Open acceptance: neither planned Issue #289 browser scenario ran. The validation lane stopped rather than invent a generated-port fixture or uncertain drawer/selector contract within its budget. Native HTTP reciprocal-save/reload, the correct-counterpart warning suppression on a slug route, and the retained warning for a genuinely different occupied peer are therefore unverified in the browser. The UUID correction is source-reviewed and current lint/typecheck/build-covered, not browser-certified; backend authority is established by isolated real middleware/handler tests, not literal HTTP. No further generation or repeated build/test command was started to bypass the limit. The previous Viewer/QR scoped browser evidence remains historical and is not proof of these new port flows.
Subsequent user-approved combined browser round (Access save/reload, occupied-peer warning, and real LAG save/reload): synthetic fixtures were prepared through asserted real HTTP responses in the retained isolated database. Six switches each have eight generated RJ45 ports, all up; one occupied reciprocal pair and a two-member LAG group were seeded. These fixture calls are not acceptance of the UI flows. The one three-case command ran 2026-10-07T20:40:10Z–20:40:45Z and stopped at the first failure: zero cases passed, one failed, two did not run. The Access drawer opened and Switch connection mode was selected, but `getByRole('dialog').getByLabel('Switch', { exact: true })` never found the dropdown trigger. No save, reciprocal reload, warning assertion or LAG interaction occurred. The parent read the actual failure log and viewed the screenshot, which shows the Switch dropdown present; a selector/accessibility-association mismatch is the leading test-harness explanation, not a demonstrated application save defect. No retry or product change was made. Evidence: `/tmp/opencode/viewer-data-qr-val/phase4/run.log` and `phase4/results/pw/`. A read-only comparison against the Docker source manifest confirmed all 556 files unchanged except the parent's migration-status evidence update; the browser lane subsequently reported unchanged 18-path status, not a new full hash comparison. Own production server PGID 1069273 was stopped and port 3362 reported free. Isolated fixtures and private evidence are retained. Console cleanliness beyond the failed step, native UI linkage and LAG browser acceptance remain unproven. Further work requires a distinct user-approved gate; no automatic repeated attempt was launched.
Latest browser evidence supersedes the earlier open-acceptance remarks above: following user-approved browser cleanup and a complete read-only external-script audit, one corrected three-case command ran 2026-10-07T20:57:55Z–20:58:12Z: one case passed, one failed, one did not run. Access SW01 1/3 → SW03 1/4 saved through the real UI with HTTP 200; both reciprocal IDs and display names persisted after reload. The peer panel on the slug route showed no false occupied-port warning. The parent read the full 116-line external spec, run log and per-case console/API evidence. No console/page errors or HTTP errors were recorded for the executed cases. Evidence: `/tmp/opencode/viewer-data-qr-val/phase5/`.
The second case proved the visible warning for genuinely occupied SW02 1/3 ↔ SW04 1/3, but its final cancel/persistence check did not complete: the script expected all dialogs to disappear immediately and omitted the existing unsaved-changes confirmation. The saved snapshot explicitly shows `Unsaved changes` with `Cancel` and `Leave`; this is a test expectation failure, not a demonstrated application defect. No override was saved. The LAG case did not run. No retry or source change was made. The completed Access case is reusable; remaining checks can use the now-linked isolated Access fixture without resetting it. The owned production server was stopped and port 3362 reported free. Package, lockfile, both new tests, original auth state, diff and 18-path status were reported unchanged during validation. Further attempts require explicit approval; no complete three-case acceptance or full LAG browser certification is claimed.
A separately approved remaining-two-case command ran once on 2026-10-07T21:07:33Z–21:07:46Z, reusing the passed Access fixture without resetting it. The occupied-peer case passed: the warning remained correct, Cancel/Leave discarded the draft, and API checks confirmed both existing reciprocal pairs unchanged. The LAG test body completed all functional assertions: the real edit PUT returned HTTP 200, both groups had exact member sets and reciprocal remote device IDs, all four member ports had correct group IDs and reciprocal port links after reload, and the reopened editor showed the saved remote switch. However, its console guard failed on one unexplained `TypeError: Failed to fetch`; the command exited 1 (one case passed, one failed). There were no recorded HTTP errors, and the occupied-peer case had no console/page errors. This is not a clean LAG pass or stage completion. The parent read the actual spec, run log and case-console JSON. Evidence: `/tmp/opencode/viewer-data-qr-val/phase6/`. No investigation, retry, application change, fixture reset or error masking followed. Own server PGID 1085005 was stopped; port 3362 was free, and original auth/package/lock/both tests/18-path status were reported unchanged. Any request-abort explanation remains a hypothesis until independently evidenced.
The separately approved read-only console analysis found no demonstrated persistence/API defect, but did not establish the failed request. The test reloads immediately after the PUT response, while the UI still awaits its LAG refresh and then emits a saved event whose parent handler awaits switch and LAG GETs. The parent independently read these source paths (`LagGroupSlideover.vue:477–503,610–624`, switch detail `onLagSaved:741–745`). Navigation interrupting one of those requests is a source-supported hypothesis, not a confirmed cause. Saved console data contains no request-failure URL, timestamp, stack or location, so transient network failure cannot be excluded. No new runtime, test, fix or error suppression followed this analysis. A clean observed save after the UI refresh completes could establish the intended acceptance condition, but disappearance of the error alone would not retrospectively prove which request failed in the earlier run.

The separately approved instrumented phase7 command ran once on 2026-10-07T21:13:56Z–21:14:06Z and exited 1. All functional assertions completed: the existing linked LAG saved with HTTP 200; the slideover LAG refresh and both parent refresh GETs returned 200 before reload; exact group IDs, member sets and reciprocal links remained unchanged after reload; the reopened editor retained SW06 and both port mappings. The captured run had no console errors, page errors or HTTP 4xx/5xx. However, the external script then issued an unnecessary second `page.goto` immediately after reload and API checks, aborting requests from the freshly loading page. Its final `bad` assertion therefore failed. The parent read the entire 69-line spec, failure log and independently summarized `results/case7.json`: exactly 10 GET failures, all `net::ERR_ABORTED` at 4410–4413 ms, coincident with the second navigation at 4409 ms. The agent's reference to 72 flagged events was incorrect (it reflected expanded assertion-diff lines). Evidence: `/tmp/opencode/viewer-data-qr-val/phase7/`. This establishes the observed save/refresh/persistence behavior without console errors, not a green complete browser command, and does not retrospectively prove the cause of phase6's earlier `Failed to fetch`. No product fix, error suppression or further test retry followed. Owned server PGID 1088002 was stopped and port 3362 reported free; package, lockfile, original auth state, both new tests, diff and 18-path status were reported unchanged. No foreign browser/MCP process was touched. All three intended functional flows now have scoped evidence across separate commands; formal clean browser-command closure remains open, without certification of other LAG variants, native login or provider flows.
The test domain still runs the 0.41.0 image `sha256:279c80a9f4b5…`, unchanged. No commit, push, release or deploy is claimed.

---

## Previous Stage (historical: Viewer Data Management and QR access, scoped)

Date: 2026-10-07
Stage: Viewer Data Management and QR access correction (branch `fix/viewer-data-qr`, version 0.41.1 prepared) — **SCOPED LOCAL CHECKS COMPLETE; NOT committed, NOT released**
Scope: patch bugfix 0.41.0 → 0.41.1. The viewer UI hides the admin-only Data Management page (sidebar entry hidden, direct `/data-management` shows no content, content hidden on role loss) and lets viewers view/copy/download (SVG/PNG) the existing switch and patch panel QR code (external phone scan; no built-in camera scanner; neutral notice for missing/revoked links; no creation, regeneration or revocation by viewers). Backend policy, schema and dependencies are unchanged; ordinary exports/templates stay viewer-allowed at the API; public URLs `/p/<token>` and `/p/pp/<token>` are stable; the Patch Panels module toggle stays enforced.
Evidence so far: backend handler tests `tests/viewerQrAccess.test.ts` ran 7/7 passed (isolated DB, real auth middleware and route handlers; not HTTP integration; literal 201/204 statuses unproven because `setResponseStatus` is stubbed) on the first real execution after `nuxt prepare`. The earlier attempt ran 0 tests because the ignored `.nuxt/tsconfig.json` was missing in the new worktree (setup cause, not an application regression).
Implementation: Data Management has an admin route guard and role-loss content cleanup; QR read controls are available to resolved authenticated users while token mutation controls and handlers remain admin-only. Review also caught and corrected two Patch Panel header action gates and revoke/loading/confirmation cleanup during role loss. The existing layout and backend policy are unchanged.
Verification: one whole-project lint passed (34 s), current typecheck passed (19 s), full unit suite passed (73 files / 1048 tests, 98 s), and production build passed (156 s). An isolated dev instance reported 0.41.1 and `database_ok: true`. One isolated no-cache Docker build passed (304 s), its fresh runtime was healthy with SQLite integrity `ok`, all 11 migrations finished, zero rolled back, and UID 1000. The parent directly read the retained `.version` marker as 0.41.1. Retained image: `ezswm:viewer-data-qr-0.41.1-uncommitted-20261007T185603Z`, full ID `sha256:e5e6a082432ed8f22a6d295c532f5420286b2e9e73626111e8b87d29638949ad`; evidence/data: `/tmp/opencode/viewer-data-qr-docker-0.41.1-20261007T185603Z`. Non-fatal sourcemap, VueUse-comment and chunk-size warnings remain.
Browser history: the first four-case round stopped in case 1 because `getByRole('navigation').first()` found no element; zero cases passed and cases 2–4 did not run. A separately approved source-contract audit found a fixture bug: the initial-site response is `{site,migrated}`, but the external spec used `response.id`, producing undefined `site_id` and unasserted 400 responses for all synthetic entity creation. The corrected external script reuses the existing site and accounts, asserts every fixture response and token state, uses actual header structure rather than icon CSS, and leaves the app source unchanged. Evidence for the first failure remains `/tmp/opencode/viewer-data-qr-val/results/`.
Browser result (one corrected production round, 2026-10-07T19:22:51Z–19:23:14Z): three cases passed. The Viewer has no Data Management sidebar entry, cannot remain on its direct route and retains Settings Account access; active switch and patch panel QR codes show their expected public URLs and nonblank canvases, SVG/PNG downloads have valid content, and no Viewer token/entity write request occurs; all four missing/revoked fixture branches show the neutral notice without token-mutation controls or requests. Patch Panel header Edit/Delete are absent for Viewer and present for Admin. These are scoped functional results, not a clean-console acceptance.
Diagnosis and closure: the fourth case's text-count failure came from one visible toast title plus the accessibility live-region copy, not two visible notices. The parent reviewed the failure screenshot, and a read-only source audit mapped the null `collapsed`/`size` errors to Nuxt UI's persisted sidebar cookie being deleted by the external script's mid-session `clearCookies()` call. This pinned upstream behavior is unchanged from the baseline; it did not justify an application or dependency change. Evidence for that failed round remains in `/tmp/opencode/viewer-data-qr-val/phase2/results/` and `phase2/observed.log`.
Final targeted browser command (separately approved, 2026-10-07T19:34:57Z–19:35:10Z): only cases 2 and 4 ran, both passed (10.7 s). The external script used a fresh Admin browser context instead of deleting cookies on a mounted app, and checked the exact visible toast title rather than its hidden announcement copy. Active switch/patch panel QR display and SVG/PNG downloads passed with zero Viewer writes and zero console/page errors or error responses; the fresh Admin context retained its controls without errors. The mocked Patch Panel DELETE 403 caused one visible access-change notice, closed the confirmation, removed admin actions, cleared the spinner and issued exactly one DELETE with no retry. The only console/error response was that expected mocked 403; per-case logs contain zero unexpected errors. The parent read the actual assertions and `/tmp/opencode/viewer-data-qr-val/phase3/case-console.json`. All four intended functional cases are covered across successful cases in two commands, not a single four-case pass. Server authority is independently covered by the seven real middleware/handler tests; role loss in the browser remains mocked. QR triggers have a pre-existing missing accessible-name limitation and were located by unique header structure for normal clicks; no German browser round, real phone scan, native login-form or real IdP flow was tested.
Verification history and safety: the new-worktree first test invocation ran zero tests before `nuxt prepare`; the first actual seven-case execution passed. The dev launcher initially backgrounded a command chain that never started the server, then started the isolated server once. Docker required checks passed; an extra wrong-path setup probe returned 401 and an unnecessary follow-up table query failed from command quoting, neither retried. The correct setup endpoint reported a fresh instance. Both approved follow-up browser commands reused the current production artifact; only external scripts and migration-status metadata changed. The final command reused the existing synthetic fixtures without token creation or settings writes. Own dev/production/Docker processes and network were cleaned up, ports 3361/3362 are free, existing auth state and other containers were preserved, and no product source changed during validation. Package, lockfile, original test-auth file, repository QR test and tracked diff were unchanged across the final command. Completion is limited to the documented local scope, not exhaustive browser, locale or external-provider certification.
The test domain still runs the 0.41.0 image `sha256:279c80a9f4b5cd3836820f0b73401d14258e5fbf820024afc1197a040cf8accb`, unchanged. No commit, push, PR, merge, release or deploy is claimed. Released PR #295 and all earlier phase evidence below stay historical.

---

## Previous Stage (historical)

Date: 2026-10-07
Stage: CI correction for PR #295 (branch `fix/viewer-readonly-ui`, version 0.41.0 still prepared) — **LOCAL FIX VERIFIED; correction commit/push pending; NOT released**
Cause: the pull-request CI job `test` (run 37593537434, head `d629828`) failed once: `tests/dockerBuildContext.test.ts` > "keeps the documented example, with negations AFTER every exclusion" — `AssertionError: expected 10 to be greater than 12`, 1 failed / 1040 passed. An earlier branch commit had added `.slim/` after the `!.env.example` exceptions in `.dockerignore`. Earlier local checks on this branch were scoped and never ran the whole unit suite.
Fix: the existing `.slim/` line was moved above `.env` (after `.git`) so both negations are the last rules; the same 13 patterns remain, each once. The ignore semantics are unchanged: `.slim/` and the `.env*` files stay excluded and `.env.example` stays preserved. Tests, app code, docs guides, package version and lockfile are unchanged.
Verification (local, Node 22.23.2, pnpm 11.0.9): `pnpm test tests/dockerBuildContext.test.ts` — 1 file / 3 tests passed (8 s); full `pnpm test` once — 72 files / 1041 tests passed, 0 failed (92 s). No new Docker build was run for this reorder, and CI is not yet green: the earlier failure stays recorded here as history and CI must be re-run on the pushed fix.

---

## Previous Stage (historical)

Date: 2026-10-07
Stage: Mobile dashboard KPI layout (branch `fix/viewer-readonly-ui`, version 0.41.0 still prepared) — **LOCAL IMPLEMENTATION + SCOPED CHECKS COMPLETE; PR PREPARATION APPROVED, NOT released**
Scope (approved): on phones and compact widths below the `sm` breakpoint the four KPI cards at the top of the site dashboard (`app/pages/sites/[siteId]/index.vue`) are shown as a 2×2 grid; tablet and desktop layouts and the full-width dense panels stay unchanged. Documentation is included in the EN/DE 0.41.0 changelogs and the Dashboard Overview section of both user guides; implementation and verification are tracked separately below.
Implemented: only the four KPI cards were changed to a two-column phone grid, with compact padding, vertically arranged contents, 36px icons, 20px counters and 12px labels. At `sm` and above, the previous two/four-column breakpoints, spacing, horizontal contents, icon sizes, default icon shrink behavior and typography are restored. Other widgets, links, labels, counters, authorization and backend code were not changed. Targeted page ESLint and whitespace checks passed.
Scoped checks: one current `pnpm typecheck` passed (51 s); one isolated `pnpm dev` startup returned health 0.41.0 with `database_ok: true`. One Docker no-cache build, including the production build, passed; one isolated runtime passed health, UID 1000, all 11 finished migrations, SQLite integrity and the initially incomplete setup check. Non-fatal build warnings remain (font-provider fetch retry, module-preload sourcemap, VueUse PURE comments and large chunks). Evidence/data: `/tmp/opencode/mobile-dashboard-final-20261007T080732Z`; retained image `ezswm:mobile-dashboard-0.41.0-uncommitted-20261007T080732Z` = `sha256:91cc1722a63c3ed0e172c97841a8631f9ab530a89ed932f61256719d0aa3e8f6`, built from the dirty working tree, not from HEAD alone.
Browser evidence: actual Chromium rendering of that build with a complete mocked dashboard-statistics response. The final harness run passed seven measurements: EN at 320/390/430/768/1280 px and DE at 320/390 px. Phone cards were two columns/two rows with no KPI or text overflow, including a seven-digit count; 768 px retained two columns and 1280 px four, with the previous wider-screen computed styles. Existing link targets were checked using the site slug. Parent reviewed the DE 320px and EN 1280px screenshots and the recorded results. These are synthetic counts, not proof of server-derived authorization-dependent totals or a native login/SSO flow; no full suite or repeat Users programme was run.
Verification deviation: the browser harness was run three times despite the stop-on-first-failure instruction. The first failed on a site-ID lookup before layout checks, the second on an incorrect UUID-based link expectation (the page uses the site slug), and only the third completed the seven measurements. Only external scripts changed; no application fix or rebuild followed these harness failures. The repeated seed requests then returned expected 403 responses and the harness used API login. The final run recorded no console errors, warnings or page errors; four script requests aborted during navigation, with their cause not independently established. No further retry was authorized or performed by the parent.
Cleanup: only the isolated dev process group and Docker container/network were removed; ports 3361/3362 are free, private auth/JWT files were removed, and image/data/evidence were retained. The source fingerprint and original test-auth hash were unchanged during verification. Pre-existing containers/images/networks/volumes were unchanged except for the new retained image, including the test domain and tunnel.
Deployment: the test domain still runs the 0.41.0 image `sha256:279c80a9f4b5cd3836820f0b73401d14258e5fbf820024afc1197a040cf8accb` (container `7a757d2115acfdedb0eab5c137f0d6945f27aebcfcd05bd55a9aaf46f78f0dbe`); this layout change is NOT live there and no new test-domain update is approved. `package.json` stays at 0.41.0.
Git publication: the user approved committing the completed changes, pushing `fix/viewer-readonly-ui` and opening the 0.41.0 pull request. Merge, release/tagging, production deployment and another test-domain update remain separate approvals. Earlier stages below retain their historical commit/deployment status at the time of those checks.

---

## Previous Stage (historical)

Date: 2026-10-07
Stage: Admin Users management UI and Login icon fix (branch `fix/viewer-readonly-ui`, version 0.41.0) — **LOCAL IMPLEMENTATION + SCOPED CHECKS COMPLETE; PREPARED, NOT released, NOT committed**
Status: the 0.40.2 version was only prepared and never released (last actual release 0.40.1); its unreleased changes are folded into the 0.41.0 minor version. No commit, merge, push, release or deployment is claimed; `package.json` stays at 0.41.0.
Implemented locally (`app/pages/users/index.vue`, locales, `tests/usersManagementApi.test.ts`): Admin create of local accounts (role defaults to Viewer); edit of local display name, role and language (username immutable); confirmed delete of any other account; own-account delete blocked in the UI; the last local emergency admin cannot be deleted or demoted (backend 409). OIDC accounts: no edit affordance and no PUT from the UI (identity-provider managed, roles follow provider mapping), no issuer/subject rendered; delete warns that access at the identity provider is not revoked and the account may be recreated at the next permitted SSO login; activity history is kept and author attribution is removed (null author). A created-date column helps tell duplicate display names apart without exposing provider identity. Viewers get no Users nav entry, list, direct route or admin user list/management API access (own-profile PUT unaffected); default auth gates unchanged. Login page: the extra network icon above the title was removed (3 lines); the ezSWM logo is kept.
Fixes found during verification (also in the 0.41.0 changelog): the create endpoint (`server/api/users/index.post.ts`) now answers invalid requests with a generic HTTP 400, and the Role/Language dropdown options in the create and edit dialogs open above the modal overlay (`:ui="{ content: 'z-[210]' }"` on the four selects in `app/pages/users/index.vue`).
Final typecheck history: the first `pnpm typecheck` failed once with three TS2322 errors at `app/pages/users/index.vue:161,197,242` (log `/tmp/opencode/users-final-closure-20261007T072115Z/typecheck.log`): the three Cancel-button inline assignments (`showCreateDialog = false`, `showEditDialog = false`, `showDeleteDialog = false`) returned a boolean while the typed UButton click handler requires `void | Promise<void>`. They were changed mechanically to void arrow handlers (`() => { showXDialog = false }`; same close behaviour, no other change). After that, targeted ESLint of the page passed (3 s) and the one current `pnpm typecheck` PASSED (exit 0, 57 s); logs: `/tmp/opencode/users-final-closure2-20261007T072645Z/eslint.log`, `/tmp/opencode/users-final-closure2-20261007T072645Z/typecheck.log`. This is a scoped check, not a full lint or test suite.
Checks (separate scoped runs, NOT the whole project and NOT a full suite): 9 tests in `tests/usersManagementApi.test.ts` passed after the generic 400 change, plus 20 existing tests (usersOverviewApi, useAuthRefresh, viewerPermissions) passed = 29 unique targeted tests; targeted ESLint of the changed page/tests passed after the last changes. The unit harness uses a response-status stub, so HTTP 201/204 are not proven by unit tests; they were observed against a real isolated production server (phase 2: `/tmp/opencode/users-final-source-browser-20261006T222043Z/phase2`: 201, 400, 204).
Browser acceptance on an isolated production build (155 s, API 400 + dropdown fix included), API-seeded admin session, synthetic `e2e_um_*` accounts only: a focused scenario passed all four dropdowns (normal pointer clicks, menu content z-index 210, option hit-test OK, create 201, edit 200, values persisted after reload; `/tmp/opencode/users-dropdown-production-20261007T064119Z`). The 7 Users cases are covered across TWO successful runs, not one 7/7 run: the real create/edit case in `/tmp/opencode/users-seven-final-20261007T065555Z` and the other 6 in `/tmp/opencode/users-six-reviewed-final-20261007T071021Z` (18.7 s). The real parts exercised the real handlers (delete, own-account demotion rejected with 409 and persisted, viewer 403); OIDC rows and the mid-draft 403 are mocks and prove client behaviour only, not a provider flow. The tests' console observer saw no unexpected errors (expected 4xx annotated); this is not a claim of a globally clean console. Test-only readiness/locator corrections in `tests/e2e/users-management.spec.ts` followed earlier failed attempts; the application behaviour was not weakened.
Earlier Docker artifact (verified before the Cancel-handler type correction, superseded by the latest artifact below; its image and data are kept): `docker compose build --no-cache` PASSED (295 s; warnings non-fatal, not a clean build: font provider fetch retry, module-preload sourcemap, VueUse PURE comment removal, chunks > 500 kB) and the container became healthy: `/api/health` version 0.41.0, `database_ok: true`, 11 migrations applied to a fresh data dir, SQLite integrity ok, UID 1000. Image `ezswm:users-final-0.41.0-uncommitted-20261007T071259Z` = `sha256:da02b24682ee50504bbe74f05a5cbec8b6ac7be013077e9e81260a55add928d4`, built from the dirty working tree (no commit ID); evidence/data in `/tmp/opencode/users-final-docker-0.41.0-20261007T071259Z`. Cleanup used two `compose down` commands (the first failed on missing `JWT_SECRET` interpolation, the second with a dummy value; no build/runtime retry); only the own container and network were removed, all other containers, images, networks and volumes were unchanged. The setup-status probe used a wrong route (401) and is not claimed; no UI, provider or account acceptance was run in Docker.
Latest Docker artifact (isolated, not the live test domain; built from the dirty working tree after the three-line Cancel type correction, no commit ID): `docker compose build --no-cache` PASSED (298 s; non-fatal warnings: font provider fetch retry, module-preload sourcemap, VueUse PURE comment removal, chunks > 500 kB; not a clean build) and one runtime became healthy: `/api/health` version 0.41.0, `database_ok: true`, 11 migrations found and applied to a fresh data dir (11 finished, 0 rolled back), SQLite integrity ok, process UID 1000, data dir `1000:1000` mode 700, no error/fatal lines in the runtime log, `/api/setup/status` reported `setup_completed: false` on the fresh data. Image `ezswm:users-final-0.41.0-uncommitted-20261007T072754Z` = `sha256:279c80a9f4b5cd3836820f0b73401d14258e5fbf820024afc1197a040cf8accb` (supersedes `sha256:da02b246…`, which is kept with its data). Evidence/data: `/tmp/opencode/users-final-docker-0.41.0-cancel-types-20261007T072754Z`. The working-tree fingerprint was identical before the build and after the runtime. Cleanup: one `compose down` removed only the own container and network; snapshots of all other containers (including the live test domain `f4e6a500` on image `eb100c2e`, 0.40.2, and the tunnel), images, networks and volumes were unchanged except for the new image; port 3361 is free. This is HTTP health, migration and integrity evidence only, not UI acceptance in Docker.
Deployment (2026-10-07, explicitly approved): the test domain now runs 0.41.0 image `sha256:279c80a9f4b5cd3836820f0b73401d14258e5fbf820024afc1197a040cf8accb`, container `7a757d2115acfdedb0eab5c137f0d6945f27aebcfcd05bd55a9aaf46f78f0dbe`, built from the verified dirty working tree. One guarded image-only deployment passed (`DEPLOY_OK`, exit 0, 13 s; no rebuild or rollback): loopback/public health 0.41.0 with `database_ok: true`, 11 unchanged migration rows, unchanged setup/OIDC status, secrets signature and unrelated containers/tunnel. A fresh stopped-container whole-data backup was hash/owner/mode checked with scratch SQLite integrity; the automatic raw SQLite archive `20261007T074123Z_from-0.40.2_to-0.41.0` was also verified, and both previous archives were preserved. Evidence and backup: `/tmp/opencode/ezswm-oidc-test/release-users-0.41.0-20261007T073601Z`. The previous 0.40.2 image is retained under immutable rollback tag `ezswm:rollback-0.40.2-eb100c2e70ac-20261007T073601Z`. Deployment checks cover HTTP/status/filesystem only, not browser login or the provider flow. No existing accounts were edited or deleted, no Git publication or production update occurred; 0.41.0 remains uncommitted and not released.
Limitations: native UI login was not completed (an earlier harness setup failed; no product login defect was found and the programme is not repeated), real OIDC/SSO and a full test suite were not run, and historical Viewer variants not exercised here remain with their prior stage records.
Documentation: user guides (EN/DE) have Create Viewer / Edit / Delete procedures plus safety, SSO-return and author-loss notes; changelogs (EN/DE) have the 0.41.0 entry; `SPEC_FRONTEND.md` Users section updated.

The earlier phase records below are kept unchanged as historical evidence (they refer to the prepared 0.40.2).

---

## Previous Stage (historical)

Date: 2026-10-06
Stage: Viewer read-only UI — Switch, Sites/VLAN, Networks/IPAM, Patch panel/Layout template and Topology families (branch `fix/viewer-readonly-ui`, base main `617245fc`, prepared version 0.40.2) — **IMPLEMENTATION COMPLETE for the planned families; scoped final verification PASSED; local release preparation only (not released, not an exhaustive audit)**
Status: the Switch-family, Sites/VLAN, Networks/IPAM, Patch panel/Layout template and Topology UI work are implemented and were checked in scoped isolated runs; the planned Viewer UI families are complete for this stage and the scoped final verification passed (see the Final verification record). 0.40.2 in `package.json` is a prepared version only: nothing here claims a release, merge, push or deployment (last released: 0.40.1).
Auth forced role refresh follow-up (local, implemented, uncommitted and awaiting the local checkpoint with these docs; scoped checks PASS; stage in progress, not a new release): the original scoped source finding is kept below (a mutation 403 joined an older in-flight `auth/me` request that could have started before the role change and could still answer Admin). Change in `app/composables/useAuth.ts` only (25 insertions, 2 deletions; public API, server, middleware, utils, locales, initial auth, 401 vs 5xx handling and profile/logout/login behaviour unchanged): on an infrastructure 403 the handler no longer joins an older refresh; it invalidates that older refresh and starts one fresh `auth/me` request, published as an immutable `{promise, generation}` batch that each handler captures locally; concurrent 403s join the same batch (one `demoted`, the others `already-handled`, one notice), a normal refresh joins it, an auth transition (login, setup, logout) invalidates it, and a handler whose batch generation no longer matches returns `already-handled` without a notice; the batch cleanup is identity-checked so an old completion cannot clear a newer batch. There is no mutation retry. The older request keeps running but its answer is ignored; only the fresh post-403 `auth/me` resolves the UI role. Evidence: new `tests/useAuthRefresh.test.ts` (6 composable tests against the real composable with the Nuxt-resolved Vue package reused and a fresh app object and state per test and a deferred `$fetch` mock; client-side only, SSR not tested); the expected-red run before the app fix failed deterministically on the missing post-403 `auth/me` request (not on an import or harness error); all 6 passed after the fix, a strengthened case 4 (a third 403 joined after the old batch A completes, proving the old cleanup cannot clear the live batch B) also passed, and the earlier typecheck and scoped ESLint were clean. Independent security review: approved. Native isolated browser checks (own switch, Editor demoted in the database and restored, held routes released, own 3217 server stopped): Case A 11 checks PASS (an old normal background `auth/me` answered Admin 200 and was held; real database demotion; native Save PUT 403; a new `auth/me` issued after the 403 returned Viewer 200; read-only with one toast and no PUT retry; after releasing the old Admin 200 the state stayed Viewer; the switch and all ports, timestamps included, were unchanged). Case B first run FAILED only on my own assertion that expected zero toasts: the data-management page already showed its role-lost notice before the held reply was released (its watcher on edit rights, lines 540-551, raises it on logout; the toast origin was not instrumented, only source-consistent), so this was a wrong harness expectation and not a session resurrection; the failure is kept on record. The user-approved remaining-only Case B run then passed all 11 checks (a held forced Viewer 200 after a backup GET 403; native Logout POST 200; user null on `/login` before the release; after releasing the old reply still null, no new toast by element identity, one backup request and one logout request; a fresh protected `goto` redirected to `/login`). Only the expected 403 resource console errors were seen, no other browser errors; the browser monitor cannot see SSR. Limits: an `auth/me` network error or a 5xx does not give a fresh role (the last resolved role is kept), while a definitive 401/404 still ends the session as before; a 403 callback arriving after an already completed login cannot be told apart without caller changes and is out of scope; not all roles are guaranteed to refresh immediately; backend policy, own-profile handling and the provider are unchanged. The earlier statements about the joined stale auth refresh remain as history and are marked as addressed. Remaining known qualifiers (not changed here): clearing the helper role to Automatic is a server no-op, read-only to admin promotion needs a reopen, and empty-cache reuse is untested. All agreed rest-point tasks are now resolved at their stated scope; this is not a claim of all variants, a full provider run or a full suite. A fresh overall verification and a user-authorized test deployment are separate steps and are not automatic. The prepared 0.40.2 (not released, last release 0.40.1) is unchanged; the test domain still runs the old image for HEAD `0ac1633`, so the port metadata, Cancel, template, topology and auth fixes are local only and NOT deployed; there was no latest production build or Docker run.

Topology node identity follow-up (local, implemented, uncommitted and awaiting the local checkpoint with these docs; scoped checks PASS; stage in progress, not a new release): reproduction on the previous HEAD with two own legal, distinct switch names (`Topology-Collision-Alpha` / `-Bravo`) that both render the same visible `Topology-Collision…`: a native drag sent one PUT with one position key for two rendered nodes, because the node ID was read back from the visible, possibly truncated label (exact text, else prefix match). Change (3 source files, no server/composable/permission/reset/export change): the existing transparent interaction rect of each node carries an invisible `data-topology-node-id`; the drag-end reader takes a full snapshot of all rendered nodes and a new pure helper `collectTopologyNodePositions` keys each world translate by that ID (known IDs include ghost nodes as before; missing/unknown IDs and malformed or non-finite numbers are omitted; no name fallback) instead of merging a partial event map. Evidence: `tests/topologyNodePositions.test.ts` 6 cases; the first run was 5 of 6 (a `parseFloat` leniency accepted `1.2.3`), a bounded `Number()` correction then gave 6 of 6; typecheck and scoped ESLint for the three files passed earlier and the helper-only ESLint passed after the correction (not repeated). Native isolated browser rounds with own fixtures (deleted afterwards, HTTP 204, counts 0, own 3217 server stopped, roles unchanged): `topo-id-verify` Admin case 27 checks PASS (marker count 1 per real UUID; native drag of A gave one PUT 200 with both UUID keys, body equal to the DOM world positions, the layout GET and the raw row; a second drag of B gave one more PUT 200 with both keys, A retained and B changed; full switch entities unchanged; after a reload each marker rendered at its persisted position; the A inspector showed the full name and its own switch link); the Viewer part passed 11 positive checks (local and persisted positions unchanged after real drag attempts, timestamp unchanged, zero writes, Reset hidden) and then failed on a temporary harness predicate that wrongly treated the allowed `GET /api/settings` as admin-only, which is not an application defect; the user-approved remaining-only run `topo-id-viewer-inspect` passed 9 checks (full name `Topology-Collision-Bravo`, B's real UUID in the open-switch link, Close, an unchanged empty layout so no timestamp was involved, zero writes, no admin-prefix reads). Limits: one tested legal pair of identical visible names, not every possible name set; ghost-node handling is covered by a helper unit test and the server ownership filter is unchanged; no native browser export check; the browser monitor cannot see SSR; no provider, full suite, latest production build or Docker run for the latest source; the previous build applies to the old HEAD. The prepared 0.40.2 (not released, last release 0.40.1) is unchanged; the test domain still runs the old image for HEAD `0ac1633`, so the port metadata, Cancel, template and topology fixes are local only and NOT deployed. The joined stale auth refresh noted here as open was addressed by the later auth refresh follow-up above. Earlier qualifiers stay (helper-role null clear is a server no-op, read-only to admin promotion needs a reopen, empty-cache reuse untested).

Template block ID preservation follow-up (local, implemented, uncommitted; scoped checks PASS; not one full suite): the Admin template editor now sends the persisted block `id` (kept separate from the local `_uid`; blocks added in the session have none), the update schema accepts an optional non-empty string id (arbitrary historic ids, not UUID-only; empty means none) and rejects duplicate ids across units, and `layoutTemplateRepository.update` (units saves only, before any write) preserves a supplied id only if it belongs to the template's current blocks: unknown, stale or foreign ids give 409 with a reload message, duplicate supplied ids give 400, and blocks without an id get a fresh uuid; a payload where all blocks have no (or empty) ids intentionally re-mints every id (legacy behaviour). Currently stored duplicate ids give an explicit 400 on a units save only when any id is supplied (no automatic renumbering, no migration, no data repair); metadata-only updates without units are unaffected. Create (schema strips ids) and duplicate (fresh ids) are unchanged. Evidence: the layout template repository test file passes 13 of 13 (5 existing + 8 new: schema parse, id preservation across description/full units/reorder/unit move, new block fresh id, legacy no-id and empty-id remint, 409 foreign/unknown with the template unchanged, 400 duplicate with the template unchanged, stored duplicate behaviour, duplicate/create fresh ids); typecheck and scoped ESLint PASS. Native isolated browser rounds (own template, deleted afterwards; count 0, admin role unchanged, own 3217 server stopped and freed): C1 a native Description save sent the real block ids and no `_uid`, and the raw stored `units` were identical (ids included), with only the template's description and `updated_at` changing; the first C2 attempt FAILED on a temporary harness selector (the move-down locator also matched the select chevrons), a remaining-only run was then user-approved and passed: C2 a native move-down kept both ids and contents and only the order and timestamp changed; C3 a native Add Block with start index 10 kept the existing ids and content and the new block had no id in the request and a fresh unique id after saving; C4 (HTTP, not native UI) duplicate gave all fresh unique ids with equal content, and a foreign id and an unknown id gave 409 and a duplicate id gave 400, with the full template (GET and raw row, timestamps included) unchanged. This closes the earlier pp-templates30 block-id regeneration observation, which is kept below as historical evidence. Limits: unit-move and the schema create-strip behaviour are covered by the unit tests only (the new-block case also ran natively as C3); a native clone or import flow was not run; the browser monitor cannot see SSR; no production build or Docker run for the latest source (no reruns); no baseline proof. The prepared 0.40.2 (not released, last release 0.40.1) is unchanged; the test domain still runs the old image for HEAD `0ac1633`, so the port metadata, Cancel and template fixes are local only and NOT deployed. The topology node-name prefix mapping risk has since been addressed by the later topology node ID follow-up above. The joined stale auth refresh item has since been addressed by the later auth refresh follow-up above. No separate topology or auth item is pending from this list; previously known qualifiers stay (helper-role null clear is a server no-op, read-only to admin promotion needs a reopen, empty-cache reuse untested).

Port panel Cancel-during-loading follow-up (local, implemented; scoped checks PASS; not committed by this entry): one instrumented pre-fix probe showed an "Unsaved changes" prompt on a native Cancel with no edit only in the sequence earlier Save, close, reopen with the real options GET held (`baselineReady` false); a freshly loaded page with the GET held and a reopen with options loaded closed cleanly. The probe could not read the guard snapshot or dirty flag; the stale-guard lifecycle (a save closes the panel without resetting the snapshot, so the next open compared against the old snapshot until the options settled) is a source-consistent explanation, not an internal trace and not a historical baseline proof (the original code was not rerun). Change, in `SwitchPortSidePanel.vue` only: the guard reads a canonical state that represents an unresolved pending switch link by its pending IDs, a synchronous guard snapshot is taken from the frozen seed at the end of both rehydrate paths (open and port change) before any await, and stale selected switch/port IDs are cleared before the pending IDs are assigned; the shared guard, helpers, server, template and copy are unchanged. Affected typecheck and scoped ESLint PASS (one each). Native isolated browser round `cancel-fix-verify`, all 5 scoped cases PASS (separate from the 19 helper unit cases and earlier metadata rounds, which were not repeated): A fresh typed edit while options were held showed the Unsaved prompt, its Cancel (Stay) kept panel and draft, Leave closed with zero writes and unchanged raw rows; B after an earlier Save, reopen with the GET held and no edit, Cancel closed with no confirm and zero writes; C reopened-instance typed edit during the hold showed the prompt, Leave closed with zero writes; D draft typed while held, released, native Save sent only `description` and `expected_updated_at` with unset metadata preserved; E a switch-linked port closed cleanly with the GET held and with options loaded, link rows unchanged; a late GET after closing did not reopen or change anything. Limits: no pre-fix run of case A was done, so no before/after claim for typed edits; the native Cancel click call took about 4.7 s to return in the verification and about 4.2 s in the probe (unexplained, not claimed instantaneous); the browser monitor cannot see SSR; no production build, Docker, provider or new test-domain validation; the test domain still runs the old build for HEAD `0ac1633`, so neither the metadata fix (`55e7074`) nor this guard change is deployed. Unchanged limits and deferred items: read-only to admin promotion needs a reopen, empty-cache reuse is untested, clearing the helper role to Automatic remains a server no-op, and topology node-name prefix mapping and joined stale auth refresh were untouched at that time (template block ID churn, the topology node-name prefix mapping and the joined stale auth refresh were addressed by the later follow-ups above). No release is claimed; the prepared 0.40.2 entry (last release 0.40.1) is unchanged.

Port metadata save-preservation follow-up (local, implemented; separate scoped checks PASS, NOT one full suite; not committed by this entry): a native Description-only Save on a port with unset metadata reproduced five unrelated raw normalizations (`port_mode` NULL→`access`, `connected_device`/`connected_port`/`mac_address` NULL→`""`, `show_in_helper_list` NULL→1). The port side panel now builds a save candidate and a baseline from the rehydrated port (frozen seed, not the live form), sends only changed scalars, atomic VLAN groups (mode/access/native/tagged) and atomic connection groups, adds the unchanged link IDs plus the sync flag when a VLAN change is saved on a switch link, skips the PUT when nothing changed, and propagates only actually changed shared fields to LAG members (never description/MAC/link IDs, no bulk when none changed). Save is disabled until the baseline is ready. Evidence: 19 helper unit cases PASS (10 new + 9 existing); affected typecheck and scoped ESLint PASS. Native isolated rounds, each scoped and run separately: S1 text typed during held option load was kept and saved description-only, no-edit reopen sent zero writes; S2 stored empty strings/NULL mode/hidden visibility preserved, explicit description clear emitted `""`, status+MAC saved only those fields; S3 a reused editor opened on a fully loaded link saved description-only with link metadata and peer rows unchanged; S4 LAG description edit sent one PUT and no bulk (sibling row unchanged), shared status sent one PUT plus one bulk with only `status`; S5 explicit mode/VLAN change sent the atomic VLAN group with raw diff limited to those four fields; S6 VLAN change on an already linked port sent the full VLAN group plus unchanged connection IDs and flag, the peer port and both configured VLAN lists synchronized, and the following description save sent only description with no peer resync. Two harness defects (a wrong VLAN trigger selector in S5, and request IDs anonymized before assertion in S6) were recorded and corrected in the harness; no application failure was inferred from them. Open/deferred, not fixed: (historical observation, now addressed by the Cancel-during-loading follow-up above) a Cancel attempt while options were held open did not close the panel within the test timeout; a read-only to admin promotion needs the panel to be reopened; reuse with an empty cache was not tested; clearing the helper role to Automatic (null) is still a server no-op and out of scope; an intentional VLAN edit may normalize a previously unset mode. The browser monitor cannot see SSR; no production build, Docker or new test-domain validation of this change was done, and the previous build applies to old HEAD `0ac1633`, so this fix is NOT deployed to the test domain. Other deferred items at that time (template block ID churn, since addressed by the later template block ID follow-up above; topology node-name prefix mapping, since addressed by the later topology node ID follow-up above; joined stale auth refresh, since addressed by the later auth refresh follow-up above) — none of these remain untouched. No release is claimed and the prepared 0.40.2 entry (last release 0.40.1) is unchanged.

Public port list sort follow-up (local, implemented and scoped checks PASS; not committed by this entry): the public port list has a fixed default order (RJ45, SFP, SFP+, QSFP, management, console, then numeric unit/index) that uplink, tagged-VLAN and disabled-status badges no longer disturb, existing filters unchanged, LAG-filter grouping by LAG name then type/unit/index, physical grid and admin views unchanged. Four offline cases using the actual extracted comparator passed (mixed connector families and usage/status, numeric unit/index, unknown-family fallback, LAG grouping), and one isolated typecheck passed; rendering and filter-chip interaction were not exercised. The test domain was deployed just before this patch, so this sort change is NOT deployed there; it keeps the previously deployed 0.40.2 image (`8dfa`) with the old sorting until a new authorized build and deploy. The Final verification record below remains evidence for the earlier code; no new build, browser check, push or merge is claimed for this comparator.
Goal: align the UI with the existing server-enforced Viewer role. Kept for viewers: browsing, search, details, ordinary exports and print, local display preferences, own profile/language, local password change (current password required; OIDC accounts have no ezSWM password) and logout. Admin behaviour and public pages are unchanged. Server permissions are unchanged and no role permissions or export restrictions are added (current exports include public tokens). Client role state can be stale until navigation/refetch/denied action; the server enforces immediately.
Implemented (Switch family): switch list/detail/port/LAG/create/public-access/QR print gates and read-only inspectors; centralized `canEditInfrastructure` role state with a single-flight `auth/me` refresh (generation-guarded) and one-time demotion handling on 403; Viewer QR print uses an existing non-revoked token via GET only (never creates or reactivates); stored language applied on full page load; the UUID→slug middleware forwards the request cookie on SSR. Sites/VLAN family (six pages: sites list/create/dashboard, VLAN list/create/detail): `canEditInfrastructure` gates the header, hover and empty-state create/edit/delete controls; page-level mutations, entry-confirmed deletes and post-await generation guards; no shared `useSites`/`useVlans` changes; direct create pages resolve auth before mount and redirect to the nearest `list?access=readonly`; mixed VLAN detail/panel stay readable with associated network navigation; on the dashboard only the subnet-create hint and the empty-state switch-create action are hidden; on role loss the site editor closes and drafts are discarded, the VLAN panel stays read-only (draft and delete dialog dropped, snapshot reset, no dirty-close save), and the first stale admin 403 refreshes the role once with one notice and no retry. Settings and Data Management are now guarded: admin-only writes/secret reads (settings save, OIDC config/check, backup download/restore, import) use the central 403 handler (`handleInfrastructureForbidden`, single-flight refresh, one access-changed notice, no retry); late file/OIDC responses are ignored by a page-local admin generation plus permission and file-identity checks; role loss clears the selected file/import/dialog state and falls back to Account/Export, while the personal Account/password dirty guard is preserved (one dirty tracker with an admin baseline); the own-profile save refreshes the user through `fetchUser` instead of writing the read-only user. Topology has a view-only adaptation (gated drag, autosave and Reset, read-only detail panel) that passed the scoped native browser runs listed in the Topology follow-up and the scoped final verification recorded below.
Checks (scoped, this isolated environment): `nuxt typecheck` PASS (after the UUID→slug cookie fix); five pure helper unit cases passed earlier (`tests/viewerPermissions.test.ts`); isolated Chromium checks passed for Viewer mouse/keyboard port and LAG inspection, direct create-link redirect, Viewer QR print (existing valid token GET only; missing/revoked fallback, EN/DE), ordinary print with a stubbed `window.print`, mobile ordering/favorites read-only (no persisted change), Admin port description save (PUT 200, persisted), Admin→Viewer demotion with an editor open (one PUT 403, no retry, read-only with one notice, port unchanged), delayed `auth/me` vs UI logout (no user resurrection), and one switch-UUID navigation (301→200, no hydration warnings). Expected console entries include the browser's own 403/404 resource messages; no claim that the whole application console is clean.
Not covered / pending: topology paths not tested in a native browser (Reset while a drag save is queued or in flight and role loss before a queued save is dispatched are covered by the 6 `topologyAutosave` composable tests but not by a native browser run; a late authorized 200, mobile tap, PNG export, and whether Reset closes an already open selection are not covered); runtime-unexercised Patch panel/Layout template paths (ordinary patch panel print link, QuickCreateModal, delayed public-token operations, demote→repromote); runtime-unexercised Networks/IPAM paths (VLAN association display shows a dash only: no VLAN fixture; network move and the `loadNetwork` role-loss reload race are source/typecheck-covered only); runtime-unexercised Sites/VLAN paths (dashboard network hint and empty-state switch action, associated-network links: no fixture; source guards retained); site/network UUID redirect branches (source-reviewed only); full test suite, OIDC/provider and public QR branch baselines, full SSR browser coverage. Browser monitoring cannot see SSR requests.
Final verification record (2026-10-06, local only; no testdomain/production update or publication): lint `--max-warnings=0` PASS, `nuxt typecheck` PASS and the production build PASS (the build log has non-fatal font-fetch, sourcemap, VueUse and chunk-size warnings; no blanket-clean claim). Tests: `tests/authMiddleware.test.ts`, `tests/oidcAuthPolicy.test.ts` and `tests/usersOverviewApi.test.ts` PASS (35 cases); the new `tests/topologyAutosave.test.ts` PASS (6 cases: the actual `useTopology` composable with fake timers and deferred requests; its first run failed because the test imported `vue` directly, which pnpm only installs as a Nuxt transitive dependency, so it now loads the installed Nuxt Vue through `createRequire` with no dependency change); the earlier 5 pure `tests/viewerPermissions.test.ts` cases passed in a separate run and are not part of a combined-suite claim. A fresh isolated dev server on port 3318 (new data directory, the 11 existing migrations applied) answered `/api/health` with `database_ok` true, the exact data directory and version 0.40.2, and `setup/status` as uninitialised. One no-cache isolated Docker build and run (build about 299 s, healthy after about 15 s, 11 migrations applied, read-only SQLite integrity check ok) used only its own container and network, which were removed afterwards; the data, image and logs were retained and the five pre-existing containers were unchanged in id, name and image. Lint reported two mechanical errors that were fixed (a local computed in `LagGroupSlideover.vue` renamed to `isReadonly` to stop clashing with the `readonly` prop, and an unused middleware argument removed in `layout-templates/create.vue`); the Docker build context now excludes `.slim/`. Topology Reset now has a synchronous in-progress guard so no new save starts while a queued or in-flight save and the DELETE are running; this is covered by the new tests and a focused review, not by a native browser concurrent-reset test. Ordinary topology browser runs (topology35/36) passed except the previously recorded unexplained `GET …/topology-layout` abort, and a denied drag keeps its local coordinates until reload. Deferred issues and coverage limits (not resolved by this stage): nested template block-id churn on Admin template save, the pre-existing SVG node-name prefix mapping risk (since addressed by the later topology node ID follow-up above), a joined pre-demotion refresh that can leave stale UI (the server still returns 403 with no retry; since addressed by the later auth refresh follow-up above), and the untested variants listed above.
Follow-up checks (2026-10-06, isolated local fresh DB; not production/testdomain/provider): `nuxt typecheck` PASS after the settings/data-management/profile edits. settings19 (Viewer): own profile save PUT 200, wrong current password returned 400 (not 403) with the normal error and no access-changed notice, ordinary entity export and CSV template download PASS; it also showed four read-only `Object.assign(user.value…)` Vue warnings, which the profile fix removed. settings21: a strict readiness gate (`isHydrating === false`, auth resolved, role, tab/input) made a native file select succeed (the earlier failure was consistent with selecting before hydration). settings22 PASS: A held backup file read then role loss produced no restore/import POST after the held file read was released and one notice (the stale backup-download GET itself returned 403; that 403 refresh was triggered by a controlled DOM dispatch of the backup download, not a native click); B held OIDC config response with typed account/password kept, admin config UI gone and the leave confirmation cancelled; C native General Save after DB demotion gave one PUT 403, no retry, one notice and unchanged persisted settings. profile23 PASS: native Viewer name + German language save, one PUT 200 and one `auth/me` GET per save, header name/locale updated, restored to English via the UI, persisted readback agreed, zero console warnings. Not tested: demote→repromote during initial settings load, and the pre-save joined-refresh branch of the profile save; no full suite, build, Docker, new tests or whole-application console-clean claim. State: scoped follow-up prepared for the authorized local checkpoint; not pushed or released.
Topology follow-up (2026-10-06, isolated local fresh DB; own site, two switches and one link created and deleted; not production/testdomain/provider): source: `useTopology.ts`/`useTopologyGraphConfig.ts`/`TopologyGraph.vue`/`topology.vue` gate dragging, autosave and Reset with `canEditInfrastructure` and handle the first stale 403 through the central helper (one notice, queued saves cancelled, no retry); the Viewer detail panel is read-only. A narrow `TopologyGraph.vue` change (uncommitted at the time of this entry) replaced the rect `@click`/`isDragging` flag with the library `node:click` handler because source review confirmed that the node's native click handler bypassed the graph library's movement filter and that a one-shot drag flag could swallow the next click; earlier runs showed inconsistent panel outcomes and the exact event sequence was not traced (the later runs passed with the change). `nuxt typecheck` PASS (exit 0). topology35: Viewer plain native click opens the read-only detail panel (name, metadata, connections) with Close; a native drag attempt ending on the node opens no panel (0 dialogs immediately and after a 1.5 s window), moves no node and leaves the layout and entity rows unchanged, GET only; a following genuine click opens a stable panel; Admin native drag moved a node, produced one debounced `PUT` 200 with finite positions for the own node ids, the persisted position equals the local transform, other entities unchanged, the panel stayed closed after the drag, a following click opened a stable panel, and the reload positions matched. topology36 (baseline layouts seeded through the Setup Admin API as fixtures): Admin native Reset (no confirm dialog) made one `DELETE` 204, the layout refetch, no `PUT`, the layout GET returned an empty `node_positions` and the reload showed default positions with the layout still empty; the stale-role case (Editor demoted in the DB without client refresh) gave one `PUT` 403, one `auth/me`, one notice, a view-only page without Reset, a persisted layout deep-equal to the baseline including `updated_at`, and a second drag with no write; the denied first drag left the node at its unsaved local position until reload (the reload restored the baseline). Limits recorded: topology36 Reset logged one unexplained `GET …/topology-layout` `net::ERR_ABORTED` before the Reset click (not investigated; later GETs succeeded); the only console error in the stale-role case was the expected 403 resource message, and no claim is made that all requests or the whole console are clean; an already dispatched save cannot be cancelled. Browser request capture cannot see SSR. Known template block-id churn is a separate backend/schema matter and is not part of this item. Fixtures and layout were deleted (204), the Editor is admin, the Viewer is EN, servers stopped; artifacts under `/tmp/opencode/viewer-switch-browser-direct-20261005/topology32` to `topology36`.
Patch panel / Layout template follow-up (2026-10-06, isolated local fresh DB; own fixtures created and deleted; the patch panel flag was enabled temporarily and its original settings restored; not production/testdomain/provider): `nuxt typecheck` PASS (exit 0) for the eight app files. pp-templates29: Viewer patch panel list/detail (no create or public-link controls), native-click and keyboard socket inspection and a 390x844 tap opened labelled read-only inspectors with Close, a valid public link was readable without login, GET only, zero console warnings/errors; its case 2 failure was a temp locator defect. pp-templates30: Viewer template list/detail, direct `create?mode=import`, `create?clone=<id>` and `<id>/edit` redirects without forms, and mobile PASS; Admin socket native Save (L on, L off clearing the side, then R plus a unique location) PUT 200 with full snapshots differing only in the target side/location and `updated_at`, and the public-link management drawer GET 200; the Admin template Description native Save PUT 200 persisted, but the strict full-integrity comparison FAILED only on internal layout-block `id` values being regenerated on save (the template edit form drops block ids, the validator has no `id` key and the repository falls back to `randomUUID()`; these server and mapping sources are unchanged from base `617245fc` to HEAD, so this is a source observation, not a baseline runtime proof; not claimed harmless at that time; historical evidence kept, addressed afterwards by the template block ID preservation follow-up above). pp-templates31: a DB-demoted Editor with a socket editor open produced one PUT 403, one `auth/me`, one notice, a read-only inspector with no Save/Reset/inputs, no unsaved prompt and a fully deep-equal patch panel (sockets, ids, timestamps); the same for the template editor (one PUT 403, one notice, fallback to the read-only detail, no unsaved prompt, template including block ids and timestamps deep-equal); the template case made two `auth/me` GETs against one for the socket (no exact cause proven; the protected navigation to the read-only detail is the source-level explanation for the additional GET, not a mutation retry). Only the expected 403 resource console errors were seen, with no claim that the application console is otherwise clean; browser request capture cannot see SSR. Cleanup: fixtures deleted, flag and settings restored, Editor admin, Viewer EN, servers stopped. Artifacts under `/tmp/opencode/viewer-switch-browser-direct-20261005/pp-templates29`, `pp-templates30` and `pp-templates31`. Not tested: full OIDC/provider and public routes beyond the single valid public link, QuickCreateModal, delayed public-token races, demote→repromote, ordinary patch panel print, full suite and build/Docker.
Networks/IPAM follow-up (2026-10-06, isolated local fresh DB; own fixtures created and deleted with HTTP 204; not production/testdomain/provider): Networks/IPAM sources (`subnets/index|create|[id].vue`, `ip-addresses/index.vue`, `NetworkAllocationForm`, `IpAddressForm`) gate create/edit/delete/add/move controls with `canEditInfrastructure`; direct `/subnets/create` redirects to `/subnets?access=readonly` before form mount; allocation/range/IP rows open read-only inspectors; role loss discards drafts and delete state and keeps inspectors read-only; the first stale admin 403 refreshes the role once with one notice and no retry; the `loadNetwork` loading flag is cleared when its request settles (typecheck PASS, source-level). networks-ipam27 case 1 PASS: Viewer network list (no create/hover actions), filter and sort, detail read-only with subnet information, allocation and range inspectors with Close, `/subnets/create` redirect with notice and no form, GET only, zero console warnings/errors. An earlier case 2 failure in that run was a temp-harness defect (a non-exact `Add` button locator matched the sortable `IP Address` column header), not an app failure. networks-ipam28 (remaining cases only) PASS: IP address overview (no exact `Add` button, filter hide/show, read-only labelled inspector with no inputs/Save/Delete/Move, Close; 390x844 row and range inspection, GET only, zero console warnings/errors); Admin native Description saves for network, allocation and range (each PUT 200; full before/after GET snapshots differ only in `description` and `updated_at`, restored); stale Editor (DB-demoted without client refresh) allocation Save gave one PUT 403, one `auth/me`, one notice, no retry, a read-only original inspector whose Close showed no unsaved prompt, and an unchanged allocation row (one expected 403 resource console error). Browser request capture cannot see SSR. Cleanup: own fixtures deleted, Editor admin, Viewer EN, server stopped. Artifacts under `/tmp/opencode/viewer-switch-browser-direct-20261005/networks-ipam27` and `networks-ipam28`. No full-feature, build/Docker, provider or public-role audit claim.
Sites/VLAN follow-up checks (2026-10-06, isolated local fresh DB; not production/testdomain/provider): `nuxt typecheck` PASS (exit 0). sites-vlan24 PASS: Viewer sites list (no create/hover actions, card link kept), `/sites/create` redirect to `/sites?access=readonly` with notice and no form, site dashboard readable with read navigation, no create links, only GETs and no secret reads. sites-vlan25 PASS: Viewer VLAN list filter/sort, read-only panel (no inputs/Save/Delete, Close works), VLAN detail read-only, `/vlans/create` redirect with notice and no form, mobile 390x844 panel; zero warnings/errors. sites-vlan26 PASS: Admin site and VLAN description native saves (PUT 200; full before/after snapshots differ only in `description` and `updated_at`, `_counts` unchanged), and a stale Editor (DB-demoted without client refresh) native VLAN Save gave one PUT 403, one `auth/me`, one notice, no retry, a read-only panel whose Close showed no unsaved prompt, and an unchanged VLAN (one expected 403 console error only). Browser request capture cannot see SSR. Two earlier harness failures (a wrong filter locator and a snapshot taken before the test VLAN was created) were temp-harness defects, not app failures, and are not repeated. Cleanup: own VLAN deleted, site description restored to null, Editor admin, Viewer EN, server stopped. Artifacts retained under `/tmp/opencode/viewer-switch-browser-direct-20261005/sites-vlan24`, `sites-vlan25`, `sites-vlan26`. No full-feature, build/Docker, provider or public-role audit claim.
Known separate issue (historical finding, kept as written; it has since been addressed by the later port metadata save-preservation follow-up above): saving a port from the Admin side panel normalizes absent values (`port_mode` → `access`, connected device/port/MAC `null` → `''`). Its runtime impact was not established and it is not claimed harmless.
Documentation: user guides (EN/DE) and changelogs (EN/DE) cover the Switch, Sites/VLAN, Networks/IPAM, Patch panel/Layout template, Topology, Settings and Data Management work and its current limits; stale "future Viewer / all users admin" wording in `.ai/ARCHITECTURE.md` and the specs was updated earlier.

## Previous Stage

Date: 2026-10-05
Stage: Release status: PR #291 merged and v0.40.0 released; logo spacing and SSO login accepted by the user on the test domain; production update is performed by the user
Status (2026-10-05, per user report): PR #291 is merged and v0.40.0 is released. The user accepted the sidebar logo position and SSO login on the test domain. This is a user report only, not an independent all-provider or per-account security test. Production: the user updates production themselves; this document does not claim that production is updated. (Historical at release confirmation: no further task was active then.) The cancelled colour test run and the cancelled German closing report stay cancelled and are not revived. Historical context: the rest of this stage entry, the entries below and the log `.slim/deepwork/oidc-283.md` record the state at the time they were written (including the pre-merge wording "not yet published", pre-merge CI notes and testdomain deployment details) and are not an execution plan. Superseded: the "JSON only / no database" lines in `AGENTS.md` and parts of `.ai/ARCHITECTURE.md` are historical; the real stack is SQLite via Prisma in `/app/data`.

Historical pre-merge status text (kept for traceability): Acceptance (2026-10-05): the user reported the sidebar logo position satisfactory and that SSO login works on the latest testdomain image `b9f46263…`. This is a user report only, not an independent all-provider or per-account security test. The previously requested German final report was cancelled by the user; no report is pending. Documentation: the four synthetic screenshots are now described as examples captured before the final logo-spacing fix; the other 19 per-guide screenshots remain unverified legacy assets; no recapture. Version correction (2026-10-05, user-authorized): the earlier 0.40.1 bump was premature. 0.40.0 was never published (no `v0.40.0` or `v0.40.1` tag existed), so `package.json` is set back to 0.40.0 as the release version of PR #291; merging to `main` is intended to trigger the automatic `v0.40.0` tag, GitHub release and GHCR image via `release-tag.yml`. The testdomain runs the identical 0.40.0 version (image `b9f46263…`); production deployment was cancelled and is left to the user. Source and documentation changes belong to the user-authorized PR #291 follow-up; the earlier published-head CI (`029b016`) does not cover them. CI on head `824781e` passed all 7 applicable checks (lint, typecheck, test, e2e, app build, Docker build/push, docs build; docs deploy is skipped on PRs); the version-correction commit is checked separately before merge. The expensive colour full run (523/336) stays cancelled; no active blockers are claimed from it. Documentation build passed; its chunk-size warning is non-blocking.
Previous status (before publication): PR #291 remained OPEN (head `029b016`, published-head CI green; not merged or released). The testdomain ran `ezswm:logo-spacing-verified`, image `sha256:b9f46263d7e0e0cc2a2b77012088daca75f987420695e39ceaf8729d9ef36e36`, including the neutral UI, Settings introductions, measured sidebar logo spacing, Patch Panel backup repair and 22 page introductions. Source changes were uncommitted and unpushed; published-head CI did not cover them. The excessive colour-testing programme was cancelled by the user: the earlier full run recorded 179 passed, 8 failed and 336 dependency-not-executed; the corrected eight V14 cases later passed separately once. No clean full-523 run is claimed, and the 336 remaining cases were not executed.
Last released version: 0.40.0. Prepared package/test-domain version: 0.40.1 (`package.json` is the single source of truth for the prepared version).
Current follow-up (latest): the documentation work on branch `docs/sqlite-prisma-readme` (PR #294, OPEN) now also prepares patch version 0.40.1 in `package.json` (the last RELEASED version is still 0.40.0). The initial uncommitted Patch Panel socket side UI change was deployed to the test domain; its subsequent refinement (compact toggle buttons with click-again-to-clear) is deployed to the test domain only (uncommitted/unpushed) (see its phase below). The "documentation only" description applies to the original docs task, not to that UI change. Production is untouched. The UI change is not committed or pushed; PR #294 is not merged and 0.40.1 is not released.

### Phase: Patch Panel socket side selection (2026-10-05)

- Change (LOCAL, uncommitted, not pushed): in `app/pages/sites/[siteId]/patch-panels/[id].vue` the socket edit side dropdown is replaced by two compact, left-aligned toggle buttons in the switch-port status button style, L (green/primary) and R (blue/info), in a labelled group with `aria-pressed`; native Enter/Space toggle them as well. Only one can be selected; clicking the selected button again deselects it, so neither selected means side null. A visible hint reads English "Click again to clear the selection." / German "Erneut klicken, um die Auswahl aufzuheben." (locale strings owned by the designer lane). The null save mapping and dirty guard remain unchanged, so clearing changes only the side. The earlier separate "Not set" control (three-option variant) is gone. This version is now deployed to the test domain (see the toggle deployment record below); the earlier two-button/checkmark image `b2e45cc3…` was the previous test image.
- Documentation: EN/DE user guide (Patch Panels section) and the `[0.40.1]` changelog entries describe it. The version stays 0.40.1 (no further bump).
- User acceptance (2026-10-05, user report only): the user reported that the latest toggle/hint version looks right and that they tested it in the browser ("passt, habs im browser auch getestet"). This is a user report of that one feature, distinct from agent testing; it is not an automated, full-browser or OIDC verification claim. The deployment evidence below remains the original health/artifact record. The change is committed and pushed to PR #294 (open, not merged); 0.40.1 is not released until the PR is merged and the release workflow has run.
- Test-domain deployment of the toggle/hint version (2026-10-05, second user-authorized round, test instance only): one no-cache build from the working tree produced image `ezswm:patch-panel-toggle-20261005T094440Z` (`sha256:c6a10949…5823`, version 0.40.1, user node). The source manifest (8 modified files; no package/Prisma/infra change) was identical before and after the build. Artifact check: the page bundle containing `patchPanels.sideToggleHint` also contains `aria-pressed`, and both hint strings are in the built output; the previous image `b2e45cc3…` has none of these markers (only legacy `sideNone` references). Backup: container stopped, whole data directory (incl. WAL/SHM) copied offline into `/tmp/opencode/ezswm-oidc-test/release-patch-panel-toggle-20261005T094440Z/state/backup-20261005T095028Z` with hash/owner/SQLite-integrity verification and `BACKUP_VERIFIED`. The service was recreated with an image-only override (13-file compose chain). Same version: `.version` stays 0.40.1, backup entries unchanged (no new pre-upgrade backup), logs show 11 migrations with none pending. Loopback and public `/api/health` report ok, 0.40.1, database_ok true; setup completed, OIDC enabled; key/origin fingerprints and the previous releases' override files unchanged; tunnel/other containers unchanged. Rollback anchor `ezswm:rollback-anchor-20261005T094440Z` (= `b2e45cc3…`); no rollback needed. Health/artifact evidence only: no browser, login or UI interaction test was run, so the toggle/hint behaviour in the live UI is unverified until the user checks it. Still uncommitted/unpushed; not released. The earlier deployment record below stays as historical evidence.
- Test-domain deployment (2026-10-05, user-authorized, test instance only): one no-cache build from the working tree produced image `ezswm:patch-panel-side-20261005T084800Z` (`sha256:b2e45cc3…71d6`, version 0.40.1, user 1000). Static image checks: no `.env*`/`.slim` files; the compiled client bundle with `patchPanels.sideNone` contains radiogroup + aria-checked (the previous image's bundle does not). The container `ezswm-oidc-test` was stopped, the whole data directory was copied offline (hash/owner/SQLite-integrity verified, `BACKUP_VERIFIED`), and the service was recreated with an image-only override; `prisma migrate deploy` reported no pending migrations and the entrypoint wrote its expected pre-upgrade backup. Loopback and public `/api/health` report status ok, version 0.40.1, database_ok true; setup completed and OIDC enabled; JWT/OIDC-key/origin fingerprints unchanged; production/dev/tunnel containers unchanged. Rollback anchor `ezswm:rollback-anchor-20261005T084800Z` (= previous `b9f46263…`); no rollback needed. Evidence dir `/tmp/opencode/ezswm-oidc-test/release-patch-panel-side-20261005T084800Z/`. This is health/artifact evidence only: no browser, login, OIDC or UI interaction test was run, so the L/R behaviour in the live UI is unverified until the user checks it. Still uncommitted/unpushed; not released.
- Evidence scope: the initial implementation and intermediate three-button refinement were reviewed statically. The two separately authorized test-domain deployment rounds each added one Docker build, image-artifact checks, a fresh verified offline backup and runtime health/preservation checks as recorded above. The current toggle/hint source was compared with `app/components/switch/SwitchPortSidePanel.vue`, its `_none` to null save mapping and EN/DE copy were checked, and `git diff --check` passed. The second round's compiled markers and running image ID cover the current artifact, not browser interaction. Production/dev container names were absent from the recorded container list; no independent production/dev runtime verification or separate ID capture is claimed. The recorded other-container identities, including the tunnel, were unchanged. No test suite, browser interaction or login/OIDC flow test was run; no commit or push was performed for this UI change.

### Phase: Documentation — SQLite/Prisma alignment of instructions and specs (2026-10-05)

- Scope: documentation only (no code, `package.json`, lockfile, version, build, test, dev-server or deployment change). Included in this combined documentation change: a README hero/logo markup adjustment (the logo image is placed in a centered wrapper intended to balance horizontal and vertical centering; exact markup is owned by the README change). It is markup only; no browser rendering or pixel-exact alignment is claimed as verified.
- Corrected `AGENTS.md`, `.ai/ARCHITECTURE.md`, `.ai/specs/SPEC_DATA_MODEL.md`, `SPEC_BACKEND.md` and `SPEC_INFRASTRUCTURE.md`: primary persistence is SQLite via Prisma (`prisma/schema.prisma`, `prisma/migrations/`, `server/db/client.ts`, `DATABASE_URL`, `docker-entrypoint.sh` running `prisma migrate deploy`); the old "no database / JSON storage only" and "atomic JSON writes" rules are marked historical. The `/app/data` convention, repository boundary (with the documented direct-client exceptions), Nuxt 4 / Nuxt UI v4 / strict TypeScript stay.
- JSON files are now documented only as exchange/compatibility formats (separately, array/object fields are stored as JSON strings inside SQLite columns, which is column serialisation, not file storage): `sqlite-v1` full backup (`/api/backup/export|import`), inventory export, CSV/JSON entity import/export, layout-template JSON, and the one-shot legacy JSON → SQLite migration (`server/migrations/jsonToPrisma.ts`, originals archived in `_archive_<ISO>/`). `server/storage/jsonStorage.ts` is a legacy helper not used for primary persistence.
- FAQ follow-up (user-approved): `docs/guide/faq.md` and `docs/de/guide/faq.md` no longer claim JSON-file/"no database" storage or atomic JSON writes, and the obsolete "delete `data/users.json`" password advice was replaced. Documented limitation: no self-service recovery and no admin password reset exist (password change requires the current password; SSO accounts have no ezSWM password); no recovery command is invented. The reset-everything and file-copy backup answers now warn about data loss / stopping the container first. Static source reading only.
- Historical phase records below are intentionally unchanged. Not verified at runtime (static source reading only). Remaining stale statements outside this scope (for example the early-MVP authentication/role wording in `ARCHITECTURE.md` §10 and `SPEC_BACKEND.md`/`SPEC_DATA_MODEL.md` role notes, detailed entity field tables vs. newer columns) are not rewritten here.
- Release preparation (user-authorized): `package.json` is bumped 0.40.0 → 0.40.1 (PATCH, documentation/changelog only) in PR #294 and the former `[Unreleased]` entries now sit under `[0.40.1] — 2026-10-05`. v0.40.0 remains the last released version; 0.40.1 is only prepared and NOT released until PR #294 is merged to `main` (statically, `release-tag.yml` then tags `v0.40.1`, creates the GitHub release from the `## [0.40.1]` section of `CHANGELOG/en.md`, and pushes GHCR tags `latest`, `0.40.1`, `0.40`). No release, deployment or new image exists yet; no builds or tests were run.
- Changelog follow-up (docs only; now part of PR #294): `CHANGELOG/en.md` and `CHANGELOG/de.md` (the authoritative copies, included by `docs/release-notes.md` and `docs/de/release-notes.md`) were last documented at 0.33.0 although tags reach v0.40.0. Added an `[Unreleased]` section (this PR #294 documentation changes and the new changelog policy) and a `[0.40.0] — 2026-10-05` entry grounded in PR #291 (`9a716bd`, tag date) and the OIDC phase below. Historical backfill (user-requested): added 0.34.0, 0.34.2, 0.34.3, 0.35.0–0.35.4, 0.36.0, 0.37.0–0.37.2, 0.38.0, 0.39.0 using tag dates and the first-parent commits per `vX..vY` tag range (PRs #263–#284; one commit per release, 0.35.1 has two; 0.33.1 notes from #263 are folded into 0.34.0 because no v0.33.1 tag exists). Notes come from commit stats and the per-commit phase records; the 0.33.0 heading date (2026-08-02) differs from its tag date (2026-08-13) and was left unchanged. No older history was reconstructed. The 0.40.0 wording was re-checked against OIDC source (PKCE S256, asymmetric algorithms, encrypted client secret, env vars). `AGENTS.md` now requires an `[Unreleased]` entry before each push and moving entries under the version heading on a version bump. No version change, no CI enforcement.

### Phase: Measured logo spacing above the Site selector (2026-10-04)

- User clarified the intended center: between the sidebar top and the top edge of the Site selector, not the header alone. Designer browser measurements reported a 64 px header, selector top at 72 px and visible logo center at 31.8 px, versus the desired 36 px. SVG whitespace contributed only about 0.2 px; the selector's 8 px top padding was independently confirmed in source.
- Added conditional `pt-2` to the logo link only when expanded. A fresh isolated browser's in-memory class preview measured the visible center moving to 35.8 px, with header, click area, logo size and selector position unchanged; collapsed layout is unchanged. The preview reported eight synthetic API responses, five blocked unknown API requests and zero backend API forwarding. Single-file ESLint and parent source/diff checks passed. This was a preview on the preceding artifact, not a visual measurement of the newly built image.
- One no-cache production build and guarded deployment completed in approximately 5m43s. The specialist verified an unchanged 81-file source manifest, the compiled conditional `pt-2` and image environment-file exclusion. Fresh verified offline backup: `/tmp/opencode/ezswm-oidc-test/release-logo-spacing/state/backup-20261004T215515Z`; data-hash/SQLite checks and unchanged JWT/OIDC-key/origin fingerprints were reported. No restore, reseed, key rotation, per-account comparison or credentialed SSO check occurred.
- Parent independently confirmed the new immutable image, running/healthy state, public login/health HTTP 200, `status: ok`, `database_ok: true`, and private backup-directory/verification-marker ownership and modes. Current restart: `/tmp/opencode/ezswm-oidc-test/release-logo-spacing/dc-new.sh up -d --no-build --no-deps ezswm`; eleven effective Compose files are reported. Image-only rollback pins `5319ba4…`; no rollback was needed. Old helpers, images, backups and other services were reported preserved. Live visual acceptance remains a human check; no new test series, version bump, Git publication or merge.

### Phase: Sidebar logo vertical centering and testdomain deployment (2026-10-04)

- Replaced absolute logo-link positioning and the one-pixel optical offset with the existing header flex layout (`flex h-full flex-1 items-center justify-center`). Logo dimensions and the rest of the dashboard shell remain unchanged. Single-file ESLint and parent diff checks passed; visual confirmation on the new build remains a human check.
- One no-cache production Docker build passed in 4m47s. The deployment specialist verified an unchanged 81-file source manifest, the new class string in the built chunk and environment-file exclusion. No host lint, typecheck, unit/browser suite or dev-server checks were repeated; no source, version, Git publication or merge changes were made during deployment.
- Fresh verified offline backup: `/tmp/opencode/ezswm-oidc-test/release-logo-alignment/state/backup-20261004T213143Z`. The specialist reported successful SQLite integrity/data-hash checks and unchanged JWT/OIDC-key/origin fingerprints, without restore, reseed or rotation. Parent independently confirmed private directory/verification-marker modes and ownership. Individual accounts and credentialed SSO were not checked.
- At that stage, parent independently confirmed immutable image `5319ba4…`, running/healthy container state, public `/login` and `/api/health` HTTP 200, and health `status: ok` / `database_ok: true`. Its restart helper was `release-logo-alignment/dc-new.sh` with ten effective Compose files and rollback to `389941…`. This was superseded by the measured-spacing deployment above; older restart wrappers can revert the deployment and must not be used as current helpers.
- The interrupted first attempt had no completed build artifact to reuse. Replacement execution took approximately 12 minutes, exceeding its ten-minute budget; one transient startup connection reset was handled by the existing readiness helper. No deployment rollback was needed. Other services, old images/backups and retained failed datasets were reported untouched. No further test or repair loop was started.

### Phase: Short page introductions and testdomain deployment (2026-10-04)

- Status: English/German page-introduction copy built and deployed in image `389941…`, replacing `e12`. No version bump, Git publication or merge.
- Added concise, localized descriptions under the existing page titles for site overview/create/dashboard, switch list/create/detail, VLAN list/create/detail, subnet list/create/detail, IP addresses, Patch Panel list/detail, layout-template list/create/detail/edit, subnet calculator, and data management. The public Patch Panel view now identifies its panel/port information as read-only. Existing descriptions in Settings and Users remain unchanged.
- Login/setup already explain their purpose; the public switch map keeps its existing device context and port-use guidance. The topology view remains canvas-first and its existing empty states already explain their purpose. Print views and dialogs are unchanged; no token value is shown.
- User-guide EN/DE now describe localized page introductions, neutral page surfaces alongside preserved semantic VLAN/status colors, and per-entity import/export versus full administrator backup/restore; the stale 0.21.x disabled warning was removed. Both locale JSON files parse and all 22 new keys are translated and referenced. Final ESLint with zero warnings passed for app pages, layouts and layout components, including the public Patch Panel page; host typecheck and one no-cache Docker production build passed. Concurrent build-manifest changes were confined to the documentation lane, not app source. No full unit/browser suite or dev-server check was repeated.
- Deployment evidence: a fresh verified offline backup is retained at `/tmp/opencode/ezswm-oidc-test/release-page-descriptions/state/backup-20261004T202655Z`; helper manifest, unchanged-source and SQLite checks passed. Keys/origin fingerprints were unchanged; no reset, restore or rotation occurred. Parent independently confirmed the target image, running/healthy state, public login and health HTTP 200, `database_ok: true`, and private backup-directory/verification-marker modes. Restart uses `release-page-descriptions/dc-new.sh` with nine effective Compose files; rollback pins `e12`. Real credentialed login, full SSO and per-account comparisons were not performed.
- Screenshots: four synthetic screenshots (Sites list, site dashboard, Switches list, Layout Templates) were captured from the then-current `ezswm:page-descriptions-verified` image via an isolated Playwright browser with API requests intercepted and mocked or blocked; the capture reported zero backend API requests passed through. Icon requests were mocked using genuine SVG data from local packages/cache without backend or external forwarding, but parent visual review still found missing sidebar/toolbar icons; the captures are not fully representative of live icon rendering and do not establish a live-app icon defect. The assets are saved as `screenshot-{sites,dashboard,switches,templates}-synthetic-current.png` and referenced in both EN/DE user guides. The remaining 19 image references in each guide are legacy assets and have not been reverified. These captures predate the latest logo-centering deployment. A docs build was not run.
- Sidebar logo vertical centering was subsequently corrected and deployed as recorded in the phase above. Logo size, horizontal centering, site-selector position and overall dashboard shell layout are preserved.

### Phase: OIDC / SSO login (v0.40.0)

- Storage: existing SQLite/Prisma (user-approved; older "JSON only" lines in AGENTS/specs are stale and not realigned here). Migrations `20260930120000_oidc_sso` and `20261001120000_oidc_provider_name`: nullable `User.password_hash`, `auth_provider`, `oidc_issuer`/`oidc_subject` (unique pair), `oidc_session_version`, `OidcConfig` singleton (incl. observed groups, optional `provider_name`), `OidcLoginTxn`.
- Provider-independent standard OIDC Authorization Code + PKCE (openid-client 6.8.8, pinned), state, nonce, ID-token signature/JWKS/issuer/`sub` validation, single-use server-side login transactions with browser binding. No email auto-linking. An asymmetric signing algorithm (e.g. RS256) is REQUIRED; HS256 is unsupported and rejected.
- Admin GUI (Settings → Authentication): enabled, optional provider display name (trimmed, max 64, plaintext, cosmetic only — no logout/invalidation), issuer, client ID, client secret (AES-256-GCM, never returned; DTO only `client_secret_configured`), scopes, groups claim (name or dot path), admin/viewer groups (exact; admin wins), unmatched→viewer toggle (default off; ON also covers missing/empty/unmapped, malformed/overage still denied), explicit `allow_http_issuer` with warning. Check = read-only discovery of the saved config, not a login.
- Encryption key correction: a public client (no secret) needs NO `OIDC_ENCRYPTION_KEY`; a configured/new confidential secret requires a separate canonical 32-byte key (`OIDC_ENCRYPTION_KEY`, runtime `NUXT_OIDC_ENCRYPTION_KEY`; no JWT-secret fallback). Missing/wrong key disables only secret-dependent SSO; local recovery untouched. Key stays outside backups; same key restores the secret, a different key clears the SSO enabled flag on restore (warning shown); the local admin must re-enter the secret AND re-enable SSO. Public clients without a secret remain key-free.
- `PUBLIC_BASE_URL` (origin only; `NUXT_PUBLIC_BASE_URL` also): canonical https origin; exact callback `/api/auth/oidc/callback`. Blank = callback derived from the request origin; app starts normally. compose.yaml/compose.dev.yaml/.env.example updated (this closure edited `.env.example` comments only).
- Roles/groups: re-evaluated on each SSO login; stale JWT revisions rejected, DB authoritative; Viewer read-only for infrastructure data (no admin settings/users/backups/OIDC config; own profile/language/local-password/logout excepted); OIDC users cannot be promoted manually; local emergency admin protected. Observed groups are learned only from permitted, successful SSO logins (no directory API/live poll/push); suggestions are filtered against unsaved draft mappings reactively, hiding an assigned suggestion keeps observed history and removing the mapping restores it, manual unobserved entries allowed. Any meaningful security change bumps the revision/session policy.
- UI: new Admin-only read-only Users page (username, display name, role, local/OIDC; no create/edit/delete/password reset; the user API still has admin CRUD). Settings Basic + Optional features (Patch Panels/Switch Groups) saved with one Save action (`common.save`); Account page shows profile, local password and an OIDC-managed notice; login shows the local form first with SSO below.
- API: `GET/PUT /api/auth/oidc/config`, `POST /api/auth/oidc/check` (admin), `GET /status` (`{enabled}` plus `provider_name` only when enabled and non-blank), `/start`, `/callback` (public).
- Related items documented: Logo (PR #285, selective: fixed branding assets only, no wholesale merge) and QSFP 40G (#287: additive `40G` port speed, NetBox `40gbase-x-qsfpp` mapping, combo-dedup rank 40G between 10G and 100G; no XFP port type, no 25G speed, 40G not restricted to QSFP ports, no Prisma migration, stored speed arrays preserved with no startup backfill, new defaults include 40G). VM #290 was removed from the current batch in favor of a SEPARATE future configurable-IPAM-type-list feature; that feature is NOT implemented and not documented as released.
- Docs updated: EN/DE user guide, EN/DE installation, EN/DE API reference, `.env.example` comments.

### Phase: Patch Panel full JSON backup fix (2026-10-04, verified locally)

- Status: user-prioritized bug fix, verified locally and deployed first in `e12`, retained in subsequent images including the current `b9f4626…` image. The source files are not committed or pushed; green CI of head `029b016` does not cover this change. No version bump; release-version handling remains pending. Offline raw-SQLite whole-data-directory backups are unaffected.
- Bug: the full JSON backup (`GET /api/backup/export`) omitted Patch Panel data, so export → restore silently lost all panels, sockets and tokens.
- Fix: the export now adds `patchPanels`, `patchPanelSockets` and `patchPanelTokens` (19 arrays: 16 + 3, still `schema: "sqlite-v1"`). Restore deletes tokens/sockets/panels before sites and inserts panels after sites, then sockets and tokens, all inside the existing atomic transaction (timeouts unchanged).
- Restore rules: legacy backups with all three keys absent are accepted only if the current panel/socket/token tables are all empty; if any current Patch Panel data exists the restore is rejected with 400 before any write. If any of the three keys is present, all three must be arrays (partial/null/non-array → 400). Three explicit empty arrays are an intentional empty snapshot and delete existing panel data. UUID/FK/unique failures roll back atomically. Local-admin, OIDC revision/cache and key-warning behavior is unchanged.
- Security note: the full admin backup contains password hashes, the encrypted OIDC secret and Patch Panel public access token values; it never contains a plaintext OIDC client secret, the OIDC encryption key or pending login transactions. Public access tokens (Patch Panel and Switch public tokens) are stored as usable values, so treat the backup as secret and never make it public. Store it confidentially. The viewer inventory export is intentionally unchanged and is not a restorable whole backup.
- Evidence (parent-run, local): new regression test `tests/patchPanelBackupRoundTrip.test.ts` was confirmed red (0/0/0) before the fix and green after (1 panel / 12 sockets / 2 tokens with non-secret metadata intact, via the in-process h3 harness and an isolated test Prisma SQLite, not live-network). Full unit run: 67 files / 991 tests passed (including 20 new tests); legacy and OIDC restore tests pass. Browser/UI suites were not run for this fix; the pending broad UI/screenshot/docs work stays paused and queued separately.

### Phase: PR #291 review follow-up — algorithm negotiation + HTTP exception docs (verified locally)

- Status: implementation, independent security review, compiled browser checks and visual review accepted locally. History: these follow-ups were later published as three review follow-up commits on PR #291 (head `029b016`, CI green, PR still open, not merged or released) and the image `1953…` was deployed to the testdomain on 2026-10-03. (Earlier wording, "not deployed; testdomain on the final0067 image", described the state before that deployment.)
- Implemented behavior: missing ID-token algorithm advertisement defaults to RS256 (intentional compatibility, not standards-compliant discovery); present but malformed/empty/only-unsupported lists fail fast with admin connection-check code `unsupported_id_token_alg`; these negotiation failures map to `oidc_unavailable` for public login. The existing asymmetric allow-list and signature, issuer, state, nonce, PKCE and UserInfo-subject checks remain unchanged.
- `allow_http_issuer` documented as a deliberate trusted, isolated internal/lab exception; HTTPS stays the normal default including private-network IdPs; it also covers advertised token/JWKS/UserInfo endpoints; HTTP lacks confidentiality/authenticity and TLS remains recommended on a LAN. No address-range filter, no TLS-verification disable.
- Unit evidence (parent-run): 65 files / 971 tests passed. New real-HTTP tests use genuinely signed PS256 tokens and JWKS, reject wrong-key/tampered signatures without provisioning, and cover unsupported advertisements, missing/mismatched discovery issuers and upstream PKCE rejection. The earlier 943-test result below is historical.
- Compiled artifact: `ezswm:oidc-review-verified`, immutable `sha256:1953a644f5d03401bb212d7f1ed4cbf94db878db2ed2325893ba12ccdb640fd3`. Explicit synthetic-dotenv preparation/type-check/build, full lint and ordinary-root no-cache Docker build passed; image environment-file exclusion and guarded runtime/preservation checks passed. A separate fresh GET-only dev check passed and was stopped safely; 11 completed migration names match the source folders, with zero users/sites/login transactions.
- Browser/visual evidence: one 12-case run passed with zero failures, retries, flaky tests or skips (four EN/DE connection-check result cases plus eight existing palette cases). Strict console/page-error guards passed. All 20 actual screenshots were reviewed and accepted; some tall mobile Groups captures crop the lower card, while result captures show the complete notices. The check responses are synthetic UI mocks, not real-provider discovery/login proof; native signature evidence is supplied by the real-HTTP unit tests.
- Sidebar centering and neutral Authentication presentation were also verified locally before the review-follow-up deployment described above. Fixture baseline values and protected-container metadata were preserved; owned verification instances were stopped. Earlier language-menu/DEV timing and network-root-cause limitations remain recorded, not claimed fixed. This evidence does not establish the later local UI/backup changes or a published release.
- Docs touched: EN/DE user guide, installation and API reference. No version bump.

### Original-batch verification (historical, before the review-follow-up deployment)

- Verified (parent-run): full Vitest 64 files / 943 tests passed after the bounded API validation correction. Real h3 HTTP tests verify layout-template POST/PUT invalid-input 400 responses without validation details, template/activity writes or non-empty stacks, valid 40G persistence and the existing missing-template 404. The same generic 400 handling applies to single/bulk port updates; template import and unrelated API validation are outside this correction. Earlier targeted qsfp40g/deviceLibrary/logoAssets 98 tests passed; scoped ESLint on touched product files passed; type-check/lint and safe Docker checks from earlier phases passed. Earlier human Authentik admin login was user-reported as separate evidence and does not verify all providers or group mappings.
- Final artifact: `ezswm:oidc-final-validated`, immutable `sha256:0067651d81312681d5a0ba8cf85cd29cb23ce19ef054f445c182c7666b141f8e`, includes the API validation correction. Explicit synthetic-dotenv host preparation/type-check/build and full lint passed; ordinary-root-context Docker no-cache build and image environment-file exclusion checks passed. Guarded candidate runtime/healthcheck, existing-data preservation and all 11 applied migration names were verified. A separate fresh container of this same image verifies the compiled Setup path and fresh defaults including 40G, without creating users or sites.
- Browser gate accepted WITH LIMIT as equivalent per-case coverage: 262/263 strict-clean in the combined run (207 + 20 + 28 + 8); the remaining case strict-clean in two independent confirmations on the unchanged artifact, with unchanged error guards and zero console/page errors in both. The original case failed its console guard on `ERR_NETWORK_CHANGED`/dynamic-chunk loading, not a content assertion. The environment root cause remains unproven; this is NOT a clean single-run 263 result or a network-root-cause fix. Generic link notifications in both confirmations did not coincide with browser errors. Earlier language-menu intermittence, preferred-language-on-load and DEV ClientOnly timing remain recorded limitations, not repaired behavior.
- Supplemental visual captures: three additional cases passed once with zero retries/failures/skips: the fully scrolled OIDC-managed Account notice in DE/mobile320 and the open 40G selector at desktop1440/mobile320. Designer reviewed all three actual screenshots and accepted them without visual blockers. Earlier accepted screenshots and strict assertions are reused only where the final artifact preserves their relevant behavior.
- Fresh release dry-run passed: test-instance identity, old/new immutable image IDs, unchanged key/canonical-origin fingerprints, tunnel, health/setup/SSO readiness, available space and image-only Compose shape verified. One controlled execute then completed successfully after a fresh verified offline backup; no rollback was needed.
- At that stage, the isolated public test instance ran the approved final0067 image, healthy, version 0.40.0. Parent independently checked public health/database, completed setup and enabled SSO (all HTTP 200). Read-only backup/live comparison reported all 21 tables and their rows unchanged, all 11 migration names applied, and unchanged JWT/master-key/canonical-origin fingerprints. Other services and stopped verification instances were left unchanged. A real authenticated admin/Authentik login was not repeated during this deployment; earlier user-reported Authentik Admin login remains separate evidence. This was a testdomain update, not a published GitHub release; the current deployed image is recorded above.
- Documentation validation: targeted links/parity/markdown review of the edited docs only; no build, install or full checks were run for the documentation closure.

---

## Previous Stage

Date: 2026-09-29
Stage: Switch Groups toggle documentation update
Status: Complete
Version: 0.39.0

### Docs: Switch Groups default-on + disable/re-enable behavior clarified (v0.39.0)

- Updated EN/DE user guides to document that Switch Groups are enabled by default.
- Documented global Settings toggle behavior for Switch Groups (disable/re-enable).
- Clarified disabled-state behavior: group UI is hidden and group-management endpoints are gated, while stored groups and switch assignments are retained and restored on re-enable.
- Clarified assignment and group-manager behavior in the Switch Groups section (site-scoped grouping, ordering constraints, delete unassign behavior).
- Added screenshot references in both guides for settings toggle, grouped view, and assignment menu.
- Updated EN/DE API reference to document:
  - `/api/switch-groups/*` routes return 404 when Switch Groups are disabled.
  - Generic switch create/update routes remain available, but requests carrying `group_id` return 400 while disabled.

---

Date: 2026-09-25
Stage: Per-site switch groups documentation update
Status: Complete
Version: 0.39.0

### Feature docs: per-site switch groups behavior and ordering constraints (v0.39.0)

- Documented per-site switch group assignment and clarified that each switch can be assigned to a site-local group.
- Documented site-local display preference between grouped and flat list rendering.
- Documented that group collapse/expand state is stored locally per site.
- Documented ordering constraints: groups are reorderable, switches are reorderable only within their own group, and ungrouped switches stay fixed last.
- Documented delete behavior: removing a group unassigns its switches and does not delete switch records.
- Clarified that **All Sites** behavior remains unchanged.
- Updated both user guides (EN/DE) with matching content and bumped release version to 0.39.0.

---

Date: 2026-09-21
Stage: Dashboard subnet utilization exclusions feature
Status: Complete
Version: 0.38.0

### Feature: optional subnet exclusion from dashboard utilization widgets (v0.38.0)

- Added `exclude_from_utilization` to the Network data model (Prisma schema + migration), defaulting to `false`.
- Exposed the flag in domain typing, repository persistence, and network Zod schemas for create/update.
- Added an edit-only toggle in the subnet detail slideover to control dashboard exclusion.
- Updated dashboard stats so only `networkUtilization` and derived `highUsageNetworks` respect exclusion.
- Kept network counts, favorites, and per-subnet detail utilization unchanged.
- Added focused tests for schema/repository default + persistence and dashboard filtering behavior.

---

Date: 2026-09-10
Stage: Switch rename route sync after slug change
Status: Complete
Version: 0.37.2

### Fix: switch detail route now follows renamed slug (v0.37.2)

- Fixed switch-detail save flow so a successful rename immediately replaces the current URL with the returned new switch slug (`/sites/<site>/switches/<new-slug>`).
- This prevents stale-route follow-up edits from targeting the old slug and failing after rename.
- Preserved existing site-scoped route behavior and normal save/optimistic-concurrency handling.
- Added focused E2E regression coverage to verify URL transition to the new slug after rename.

---

Date: 2026-09-04
Stage: API reference parity and route/auth audit sync
Status: Complete
Version: 0.37.1

### Docs: API reference fully aligned with current routes and auth gates (v0.37.1)

- Rewrote EN/DE API reference pages to accurately enumerate current `server/api` routes and methods.
- Corrected auth/public behavior to match `server/middleware/auth.ts` (including public exceptions and dynamic `/api/p/*` routes).
- Added missing endpoint groups: Sites, Setup/System, Device Library, Admin allocation recovery, configured VLAN mutation route, switch/patch-panel public token lifecycle, patch-panel routes, and allocation references.
- Updated data-model section and full-backup payload notes to include Patch Panel entities as part of the live model and explicitly note current backup payload coverage.
- Scope is documentation-only; no runtime/API behavior changed.

---

Date: 2026-09-04
Stage: Public read-only Patch Panel links
Status: Complete
Version: 0.37.0

### Feature: revocable public Patch Panel links (v0.37.0)

- Added one signed/random, revocable public **read-only** link per Patch Panel.
- Authenticated users can generate, copy, and revoke the link from Patch Panel detail.
- Public view shows panel data plus per-port details: port number, outlet number, location, optional L/R remote-end marker, and tested state.
- Public view is intentionally limited: no editing, no app navigation, and no search.
- Patch Panels remain settings-gated: disabling Patch Panels makes public links unavailable while retaining stored Patch Panel data.
- Added Patch Panel list-level **Print All** for the current filtered set; print output stays compact (one row per port number) and includes status/outlet/location/optional L-R metadata with preserved visual state colors.

---

Date: 2026-09-04
Stage: Optional standalone Patch Panels
Status: Complete
Version: 0.36.0

### Feature: optional standalone Patch Panels with settings gate (v0.36.0)

- Added Patch Panels as an optional feature that is **disabled by default** and enabled from **Settings**.
- Added data model + migration for standalone patch panels and sockets, with data retained when the feature is later disabled.
- Added API + UI feature gate behavior: when disabled, Patch Panels are hidden from navigation/views/search; when enabled, data is visible again.
- Added site-scoped and all-sites listing for patch panels.
- Added standalone 12/24/48-port panel creation with immutable numeric panel ports; each port represents one physical patch-panel port and can store optional L/R remote-side information plus outlet number/location/tested status.
- V1 scope is standalone only: no relation to switches or topology.

---

Date: 2026-09-03
Stage: Dense switch print layout + VLAN/trunk markers
Status: Complete
Version: 0.35.4

### Fix: dense compact switch print keeps ports readable and unclipped (v0.35.4)

- Updated switch-port printing to a dense single-line compact landscape layout with physically ordered ports, reducing clipping on high port-count switches.
- In compact print, each access port shows VLAN ID + VLAN color, and each trunk port shows a **`T`** marker.
- The VLAN legend remains available with VLAN ID, name, and color.

---

Date: 2026-09-03
Stage: Compact switch print layout
Status: Complete
Version: 0.35.3

### Fix: switch-port print uses compact landscape layout for dense switches (v0.35.3)

- Updated switch-port print output to a compact landscape layout so high port-count switches remain fully visible on the printed page.
- Preserved existing visual cues: VLAN color tinting for access ports and trunk markers.
- For consistent physical scaling, print with **Actual size** in the browser print dialog.

---

Date: 2026-09-02
Stage: Fixed-size QR sticker print layout
Status: Complete
Version: 0.35.2

### Fix: QR sticker print uses fixed 70 × 37 mm layout with stable preview (v0.35.2)

- Updated QR sticker printing to a fixed-size layout: **70 × 37 mm** stickers in a **3 × 8 grid on A4**.
- Print preview now reflects that fixed layout, so on-screen preview and printed output stay consistent.
- Scope is print layout/preview consistency only; no backend behavior changes.

---

Date: 2026-09-02
Stage: Bulk port editor status control consistency
Status: Complete
Version: 0.35.1

### Fix: bulk port edit status uses segmented buttons with No change option (v0.35.1)

- Updated the bulk port editor status control to the same Up/Down/Disabled button style used in single-port editing.
- Kept a distinct **No change** state so bulk updates can leave status untouched unless one of the explicit status buttons is selected.
- This is a UI consistency bugfix only; backend behavior is unchanged.

---

Date: 2026-09-01
Stage: Port status segmented button group
Status: Complete
Version: 0.35.0

### Feature: port status selector as accessible button group (v0.35.0)

- Replaced the Up/Down/Disabled dropdown in the port edit slideover (`SwitchPortSidePanel.vue`) with an exclusive segmented button group matching the existing connection-type affordance.
- Colors: Up green, Down red, Disabled neutral gray; the selected option keeps a tinted background, idle options share the neutral connection-type styling.
- Accessibility: native `button` elements with `role="radiogroup"`/`role="radio"` + `aria-checked`, arrow-key navigation (left/up previous, right/down next, wrapping), full keyboard tab focus and visible focus ring, i18n labels via existing `legend.up/down/disabled` keys.
- Underlying `form.status` field, validation, save semantics and LAG set-up prompt unchanged; no backend or validator changes.
- User guides (EN/DE) updated; version bumped `0.34.3` → `0.35.0`.

---

Date: 2026-08-31
Stage: Switch edit optional-text clear payload fix
Status: Complete
Version: 0.34.3

### Fix: clearing optional switch text fields now persists as null (v0.34.3)

- Fixed switch edit payload normalization so clearing optional text metadata sends `null` instead of dropping the key.
- This now correctly persists explicit clears for fields like model/manufacturer/serial/location/rack position/management IP/firmware/notes.
- Preserved existing semantics: blank `layout_template_id` is still omitted (keep current template), empty `tags` still reaches API as "clear all", `stack_size` remains numeric.
- Added focused regression test coverage for `model: ''` -> `model: null` payload generation.

---

Date: 2026-08-31
Stage: Template/stack-change destructive-port confirmation dialog docs
Status: Complete
Version: 0.34.2

### Fix: documented confirmation before destructive template/stack changes (v0.34.2)

- Documented new switch-edit behavior (EN/DE guides): before applying a template change or stack-size change that would remove existing ports, ezSWM shows a confirmation dialog.
- Documented that the dialog lists affected ports scheduled for deletion.
- Documented that choosing Cancel keeps the current unsaved edits intact and returns the user to the form.
- Bumped app version from `0.34.1` to `0.34.2` in `package.json`.

---

Date: 2026-08-31
Stage: Non-destructive switch template-change port reconciliation
Status: Complete
Version: 0.34.1

### Hotfix: preserve matching port configuration on switch template change (v0.34.1)

- Replaced switch template-change full port delete/recreate behavior with bounded reconciliation in `switchRepository.update`.
- Matching generated ports are now preserved by `(unit, index, type)` so user configuration (VLAN fields, links, LAG membership, helper fields, PoE overrides, descriptions) remains intact.
- Added expected new-template ports that are missing and deleted only unmatched old ports.
- Unmatched-port deletion clears reciprocal peer links first via `clearPeerLinksForDeletedPorts`.
- Added regression coverage proving a 2-port→4-port template switch keeps shared-port config/VLAN state, adds new ports, and removes only unmatched ports.
- Updated user guides (EN/DE) to document non-destructive behavior and bumped version to `0.34.1`.

Date: 2026-08-31
Stage: Automated Docker pre-upgrade SQLite backup
Status: Complete
Version: 0.34.0

### Feature: fail-closed pre-migration backup with version marker (v0.34.0)

- Extended `docker-entrypoint.sh` to read runtime version from `package.json`, compare it to `/app/data/.version`, and create a pre-upgrade backup only when `db.sqlite` exists and versions differ (or marker is missing).
- Backup path is `/app/data/backups/<UTC>_from-<old>_to-<new>/` and includes `db.sqlite` plus optional `db.sqlite-wal` and `db.sqlite-shm` files.
- Backup flow is fail-closed: if backup create/copy/prune fails, startup exits before `prisma migrate deploy`.
- Retention is automatic: keep only the newest five backup directories.
- Version marker write is atomic and happens only after successful migrations.
- Updated installation and user guides (EN/DE) with behavior, retention, and recovery location.

---

Date: 2026-08-26
Stage: Switch/port/LAG integrity hardening
Status: Complete
Version: 0.33.1

### Fix: transactional switch/port/LAG integrity and conflict handling (v0.33.1)

- Added transactional optimistic-concurrency checks for switch update, bulk port updates, and LAG create/update using `expected_updated_at` with consistent 409 responses and `current_updated_at` payloads.
- Fixed switch stack/template regeneration behavior so `null` and `1` are treated as equivalent only when `stack_size` is explicitly changed; true size changes still regenerate ports.
- Added shared peer cleanup before port deletions and applied it to switch regeneration, template unmatched-port deletion, and switch deletion flows.
- On switch deletion, remote mirror LAG rows that reference the deleted switch are decoupled (`remote_device`/`remote_device_id` set to `null`) without touching unrelated LAGs.
- Hardened bulk port updates: validator now accepts required sync fields; repository now rejects missing/foreign targets atomically instead of skipping.
- Sidepanel LAG member sync now uses one bulk request after primary save with a safe payload (no `connected_port` / `connected_port_id`) and conflict errors bubble to outer handling.

---

## Previous Stage

Date: 2026-08-13
Stage: User guide and LAG/QR behavior completion
Status: Complete
Version: 0.33.0

### Feature: shipped PR #257 behavior set finalized (v0.33.0)

Delivered the documented behavior updates across LAG workflows, template creation, and QR output:

- LAG remote-link handling now surfaces duplication/mapping/conflict visibility clearly, including common member status.
- LAG deletion supports optional remote/reset behavior instead of forcing a single delete path.
- Public helper LAG presentation now uses the shared filter/color/sort behavior.
- Layout template creation flow keeps block reordering behavior during creation.
- QR stickers are unbranded, and single-switch sticker printing now uses the correct switch identity.

---

## Previous Stage

Date: 2026-08-01
Stage: ConfirmDialog close-button dismiss behavior fix
Status: Complete
Version: 0.32.2

### Fix: confirmation dialogs now dismiss consistently across close actions (v0.32.2)

Fixed inconsistent close handling in confirmation dialogs:

- Dialogs can now be dismissed consistently via Cancel, close button, Escape, or backdrop click (where enabled).
- Close-button behavior now matches the existing Cancel/Escape/backdrop dismiss flow.

### Fix: synchronized LAG display keeps target/peer switch names readable (v0.32.1)

Fixed a sync regression where display-only names could degrade after LAG member synchronization:

- LAG legend chips again show the target switch name for synchronized LAGs.
- Member-port conflict information retains readable peer switch names.
- Synchronization no longer degrades those names to `Unknown`.

### Feature: public/shared QR cards show LAG badge + full group name (v0.32.0)

The public helper/shared QR port list now shows LAG membership context without
revealing technical internals:

- Ports that are members of a LAG display a LAG pill on the public/shared card.
- The full LAG group name is shown on that card for clear identification.
- LAG internals (member composition, mappings, remote-link details) remain hidden.

### Feature: refined port configuration copy flow and save consistency (v0.32.1)

Completed the follow-up polish for port configuration copy and related editing flow:

- Source port selection is restricted to same-switch ports in single-port edit.
- Source picker uses a searchable menu with a capped option list for large switches.
- Copy prefill includes custom/helper field values in both single-port and bulk edit flows.
- Saving a LAG member applies the synced values consistently across that LAG's member ports.
- Save/apply persistence remains correctly site-scoped across port edits, including LAG-related updates.
- Slideover cancel actions now use standardized cancel styling for consistent UX.

### Feature: source-based port configuration prefill with normal save/apply (v0.32.0)

Port configuration copy now follows a prefill-first workflow:

- Single-port edit adds an optional source picker in the sidepanel footer next to
  Save. Selecting a source port on the same switch prefills the form only.
- Bulk edit source selection now supports all switch ports (including currently
  selected targets), prefills the bulk form, and still requires normal Apply.
- Source selection never performs direct persistence; users review/edit first,
  then use existing Save/Apply actions.
- Copy contract excludes description and LAG membership; for connections it copies
  only manual/freetext peer values (custom device name + peer port), while real
  switch links and IP/allocation links are never copied.

### Feature: safe LAG and port configuration copy/edit (v0.32.0)

Added safe local-only duplication and configuration-copy workflows:

- LAGs can be duplicated as memberless, local-only groups without copying remote
  devices, mappings, or links.
- Port configuration can be copied on the same switch with only manual/freetext
  peer values copied for connections (custom device name + peer port); real switch
  links, IP/allocation links, and LAG membership are not copied. LAG targets are
  restricted to prevent conflicts.
- For LAG members, manual device + peer-port values are synchronized identically
  across the whole LAG, and users can edit the shared manual device name afterward.
- LAG member and name integrity is preserved during editing and duplication.
- One delete dialog supports retaining the remote LAG by default or explicitly
  deleting it.
- Remote deletion is server-side transactional, and remote mirror edits stay
  synchronized with strict ownership and reciprocity checks. Conflicts return
  HTTP 409 without partial mutation.

Documentation and verification will be finalized by the orchestrator.

---

## Previous Stage

Date: 2026-06-28
Stage: IP allocation network move confirmation
Status: Complete
Version: 0.31.3

### Fix: confirm IP allocation moves between subnets (v0.31.3)

Editing an IP allocation now keeps normal saves strict, but guides intentional moves:

- If the new IP belongs to another subnet in the same site, the backend returns a
  structured move suggestion instead of only the old subnet range error.
- The IP address form shows a confirmation dialog with old/new IP, subnet, and VLAN
  preview; when several subnets match, the target subnet must be selected.
- Confirming the dialog sends the target `network_id` explicitly and records the
  allocation update in the activity log.

---

## Previous Stage

Date: 2026-06-27
Stage: Cascade site deletion
Status: Complete
Version: 0.31.2

### Fix: delete sites together with their scoped data (v0.31.2)

Deleting a site now removes the site and all scoped data in one action instead of
blocking with “Cannot delete site with existing entities”:

- Switches and their ports, LAG groups, and public tokens.
- VLANs, networks, IP allocations, IP ranges, and topology layout.
- Activity log entries for the deleted site and its scoped child entities.

No new delete activity entry is written for the removed site because the site-scoped
activity history is intentionally removed with the site.

---

## Previous Stage

Date: 2026-06-27
Stage: Typecheck cleanup for public pages and authenticated API routes
Status: Complete
Version: 0.31.1

### Fix: restore green Nuxt typecheck (v0.31.1)

Fixed TypeScript-only issues that left `pnpm typecheck` failing while runtime behavior
continued to work:

- Added explicit payload typing for the public switch map page and subnet calculator fetches.
- Added the H3 auth context declaration used by authenticated API handlers.
- Replaced optional auth access in protected API routes with the typed auth context.
- Added a typed import request body for data imports.

No user-facing behavior changed.

---

## Previous Stage

Date: 2026-06-26
Stage: Layout template block reordering (drag-and-drop + up/down buttons)
Status: Complete
Version: 0.31.0

### Feature: Port Block Reordering in Layout Template Editor (v0.31.0)

Added drag-and-drop reordering of port blocks within each unit in the layout template
editor (`app/pages/layout-templates/[id]/edit.vue`). Uses the already-present
`vuedraggable` dependency.

- **Drag handle** (bars icon, left of each block header) — grab to drag block to new position
- **Up / Down buttons** (chevron icons, right of block header) — keyboard-/touch-friendly alternative; disabled at list boundaries
- **`_uid` field** added to `FormBlock` (module-level counter, never serialised) — stable `item-key` for draggable reconciliation
- **`moveBlock(unitIndex, blockIndex, direction)`** — splice/insert helper shared by both buttons; draggable mutates the array directly via `:list`

Closes #216.

---

## Previous Stage

Date: 2026-06-19
Stage: LAG remote-port dropdown — group by type for a natural order
Status: Complete
Version: 0.30.1

### Fix: LAG remote-port dropdown grouped by type (v0.30.1)

`remotePortOptions` (`useRemoteConnection`) sorted only by `unit`/`index`. When a
switch's layout has several blocks that each restart their index at 1 (e.g. rj45,
sfp, qsfp, console all starting at 1), every block's "1/1" port clustered at the
top and the types interleaved. The sort now adds a type-rank tiebreaker
(rj45 → sfp → sfp+ → qsfp → console → management) between unit and index, so each
block's ports stay together and read in physical-panel order.

---

## Previous Stage

Date: 2026-06-16
Stage: Layout shell migrated to Nuxt UI v4 dashboard components
Status: Complete
Version: 0.30.0

### Refactor: hand-rolled shell → UDashboardGroup/Sidebar/Navbar (v0.30.0)

The custom flexbox layout (`default.vue` + bespoke `AppSidebar`/`AppHeader`, mobile
overlay, global Esc handler) is replaced by official Nuxt UI v4 dashboard components,
bringing the project into line with its own CLAUDE.md rule ("do not create a custom
dashboard shell"). `UDashboardGroup` (unit="rem") wraps `UDashboardSidebar` (collapse
persists via cookie, mobile slideover + route-close + Esc handled by the component) and
a content column whose top is `UDashboardNavbar`. Search stays inline and left-aligned
in the navbar (`#left` slot); breadcrumbs stay a separate bar. Sidebar width pinned to
16rem (=256px) with a 64px icon rail via `min-w-16`. All pages untouched. e2e selectors
updated (`mobile-sidebar-overlay` → slideover `role="dialog"`; `aside a` → `nav a`),
plus a route-smoke test covering every main page in the new shell.

---

## Previous Stage

Date: 2026-06-18
Stage: Fix LAG remote-port mapping (duplicate target, sort) + empty-name save feedback
Status: Complete
Version: 0.29.2

### Fix: LAG slideover bugs (v0.29.2)

Three issues in the LAG group slideover (`useRemoteConnection` + `LagGroupSlideover.vue`):
- The remote-port target dropdown shared one option list across all local ports with
  no dedup, so the same remote port could be mapped to two local ports. Added
  `availableRemotePortOptions(localPortId)`, which hides remote ports already taken by
  other local ports (keeping "None" and the row's own current selection).
- The remote-port options were unsorted; they are now ordered by `unit`/`index`.
- The Save button (in the footer, outside the `UForm`) called `onSubmit` directly,
  which `validate()`d and `return`ed silently on error — so saving with an empty name
  did nothing with no feedback. The button now calls `lagFormRef.submit()`, so the
  `UForm` runs validation and surfaces the required-field error (matching the
  switch-edit pattern).

---

## Previous Stage

Date: 2026-06-16
Stage: Fix favorite toggle 404 (per-site slug not resolvable)
Status: Complete
Version: 0.29.1

### Fix: favorite toggle hit 404 on per-site slugs (v0.29.1)

`toggleFavorite` in `switches/index.vue` sent `PUT /api/switches/<slug>` without a
`siteId`. Since switch slugs are unique per-site (not globally), the handler's
`getByIdOrSlug` falls back to a PK lookup which can't match a slug → 404, and the
star never toggled (the failure was swallowed silently). Fixed by sending the
switch **PK** (`sw.id`), which resolves directly regardless of site. Same class as
the earlier per-site-slug sub-resource fixes (#195/#196); this call was missed.

### Stage: unsaved-changes guard across all slideovers + header language switcher (v0.29.0)

Date: 2026-06-15
Status: Complete

### Feature: unsaved-changes guard made consistent across every slideover (v0.29.0)

Previously only the switch-detail edit slideover prompted before discarding
unsaved edits (bespoke logic in `useSwitchEditForm`). Full-page forms were
already covered by `useUnsavedChanges` (route-leave + `beforeunload`), but
**slideovers close without a route change**, so every other edit panel discarded
silently.

New `useSlideoverGuard(form, close)` composable (`app/composables/`) snapshots
the editable surface on open and confirms via the existing global `useConfirm()`
before closing a dirty panel — same copy/keys as the full-page guard
(`common.unsavedChangesTitle/Warning/leave`). `form` accepts a getter so panels
whose editable state spans multiple refs (port panel's VLAN/connection state,
LAG slideover's vlan/portMapping/remote refs) snapshot their **whole** surface,
not just the main `form`. Snapshots are taken after async rehydrate settles to
avoid phantom-dirty on open.

Wired into: `SwitchPortSidePanel`, `SwitchPortBulkEditor`, `LagGroupSlideover`,
`IpAddressForm`, the three slideovers on `subnets/[id].vue` (network edit, range
edit, allocation/range add via `NetworkAllocationForm`), the `sites/index.vue`
edit panel, and the `vlans/index.vue` in-panel edit. `useSwitchEditForm` was
refactored onto the shared composable so the whole app shares one implementation.
Pattern per slideover: `:open` + `@update:open="onOpenChange"`, cancel buttons →
`requestClose`, `takeSnapshot()` once the form is populated.

**Z-index fix (global):** Nuxt UI v4 gives both modals and slideovers `z-[100]`
content with an un-z-indexed overlay, so any modal opened over an open slideover
could render *behind* it (stacking fell back to DOM order — intermittent, cleared
by reload). This hit the unsaved-changes confirm and also `VlanRemoveConfirmDialog`
(rendered inside the configured-VLANs slideover). Fixed once in `app/app.config.ts`
by pinning `ui.modal.slots.overlay`/`content` to `z-[200]`, so every modal sits
above any slideover app-wide.

### Feature: header language switcher (v0.29.0)

DE/EN switcher (`UDropdownMenu`, `i-heroicons-language`) added top-right in
`AppHeader.vue` between the theme toggle and user menu. Mirrors the Settings →
Account flow: `setLocale(code)` + `updateUser({ language })` so the choice
persists to the user profile and survives reload (`auth.global.ts` re-applies
`user.language`). New i18n key `common.language` (EN/DE).

### Fix: port reset now actually clears the port and severs the link (v0.28.0)

`DELETE /api/switches/[id]/ports/[portId]` reset a port by calling
`updatePort()` with every field set to `undefined`. But `portUpdateInput()`
skips `undefined` fields (correct PATCH semantics), so on reset the local port's
connection (`connected_*`) and config (`speed`, `port_mode`, `access_vlan`,
`native_vlan`, `description`, `mac_address`) were **never written** — only
`status:'down'` and `tagged_vlans:[]` took effect. The peer's reciprocal link
was cleared, so the source switch lost its back-link while the reset port still
showed the cross-connection.

New dedicated `switchRepository.resetPort(idOrSlug, portId)` writes explicit
`null`s (type-safe at the Prisma column layer, unlike the optional `Port` type)
and severs the bidirectional link on both ends. The peer's own config is kept —
only the link is removed (NetBox cable-removal semantics). The single-port reset
in `SwitchPortSidePanel.vue` now also sends `?siteId` so per-site-ambiguous
slugs resolve. Covered by `tests/portReset.test.ts`.

### Feature: in-app confirmation dialogs replace native browser popups (v0.28.0)

All `window.confirm()` / `window.prompt()` calls are gone. A promise-based
`useConfirm()` composable backed by a single global `SharedConfirmHost` (mounted
in `app.vue`, rendering the existing `SharedConfirmDialog`) provides
`await confirm({ title, message, confirmLabel? })`. Migrated: port bulk-reset
(`switches/[id].vue`), the two LAG-slideover confirms, and the unsaved-changes
navigation guard (now an async `onBeforeRouteLeave`). The public-access copy
fallback (`window.prompt`) became an error toast since the link is already shown.

### LAG mirror: correct edit reconstruction + symmetric delete cleanup (v0.28.0)

- `syncRemoteLag` stored the local switch **slug** (`props.switchId`, the route
  param) into the mirror LAG's `remote_device_id` and the remote ports'
  `connected_device_id`, while the primary side (and all comparisons) used the
  switch **UUID**. Editing the mirror LAG on the target switch therefore failed
  to reconstruct: Remote Device showed "— None —" and the port mapping was empty.
  Now the mirror stores the local UUID; `useRemoteConnection` resolves any switch
  ref (slug or UUID) to the UUID (`resolveSwitchUuid`) and `existingRemoteLag` /
  `remotePortOptions` / `switchOptions` compare tolerantly, so both new and older
  (slug) data reconstruct. `openEdit` normalizes `selectedRemoteSwitchId` to the
  UUID after the switch list loads.
- Deleting a LAG only removed the group row; the member ports' and their peers'
  connection fields were never cleared, so the cross-connection survived (and the
  mirror match in the page used the route slug, missing the UUID-keyed source).
  `lagGroupRepository.delete` now severs the links on both ends in a transaction,
  and the page matches the mirror by UUID or slug. Covered by
  `tests/lagDelete.test.ts`.

### LAG remote-port selector: searchable + correct conflict label (v0.28.0)

- The "port already in LAG X on the remote switch" warning showed a raw port
  UUID. `remotePortLagConflicts` (`useRemoteConnection.ts`) resolved the label by
  re-looking-up the remote switch's ports and fell back to the UUID; it now uses
  `mapping.remotePortLabel` (the value already chosen for that mapping, same
  source as `getPortConflict`).
- The remote-port `USelectMenu` in `LagGroupSlideover` had `:search-input="false"`;
  re-enabled with a localized placeholder so users can filter the target port by
  typing (e.g. "45"), like the VLAN selectors.

### Fix: per-site-ambiguous switch slug in port/LAG/token endpoints (v0.27.2)

v0.27.1 made the switch sub-resource repositories resolve a slug to the PK via
`getById`, but `getById` returns `null` for a slug that exists on more than one
site (slugs are unique per-site, not globally). So a switch whose slug is shared
across sites (e.g. two "sw-core") still failed — port reset returned
**"Switch not found"**, etc.

Mirroring the canonical pattern from `/api/switches/[id]` GET/PUT, all switch
sub-resource handlers now resolve the switch via a shared
`resolveSwitchParam(event)` helper (`server/utils/resolveSwitchParam.ts`) that
honours a `?siteId=<uuid-or-slug>` query to disambiguate, then passes the real
PK to the repositories: `ports/[portId]` PUT+DELETE, `ports/bulk` PUT,
`configured-vlans` PUT, `lag-groups` GET+POST, `public-token` GET/POST/DELETE.
The frontend now sends `siteId` on these calls (`useSwitch` port methods,
`useLagGroups`, `usePublicToken`, the LAG slideover's local-switch calls, and the
bulk-reset DELETE), since the detail page addresses switches by slug.

### LAG mirror: surface why the mirror group is missing

When creating a LAG with a remote switch, the mirror LAG group is only created if
at least two member ports are mapped to concrete remote ports. Previously the
mirror step returned silently when ports were unmapped, so the user saw the
remote ports/VLANs configured (those are written by the port-connection sync) but
no LAG group, with no explanation. The slideover now shows a warning toast
(`lag.mirrorNotCreated` / `lag.mirrorNeedsPortMapping`) in that case.

### Fix: port & LAG mutations 500/404 when switch addressed by slug (v0.27.1)

The switch detail page addresses the switch by its slug (`/sites/<site>/switches/<slug>`),
so all port/LAG mutation endpoints receive the slug as `[id]`. Several repository
methods used that value directly in `prisma.…update({ where: { id } })` /
`findUnique({ where: { id } })`, which only matches the UUID primary key — so the
operations failed:

- **Bulk port edit** → HTTP 500 (`prisma.switch.update()` — record not found).
- **LAG create** → HTTP 404 "Switch not found".
- **Port reset/clear** (port DELETE → `updatePort`) → HTTP 404 "Port not found"
  (`oldPort.switch_id !== switchId`, UUID vs slug).
- **Clear configured VLANs** → HTTP 404 "Switch not found".

Fix: the affected repository methods now resolve the identifier (UUID **or**
globally-unique slug) to the real PK before any `where: { id }` use, matching the
existing pattern in `update()` / `getById()`:
`bulkUpdatePorts`, `applyPortVlanUpdate`, `updatePort`, `addVlansToSwitch`,
`applyConfiguredVlansRemoval` (switchRepository) and `create` (lagGroupRepository).
The single-port handler also now stores the resolved UUID (`existing.id`) as the
back-link `connected_device_id` on the connected target port instead of the slug.

A follow-up codebase audit found the same bug class in switch sub-resources that
query/write by `switch_id` foreign key (handlers validated the switch with a
slug-aware lookup but then passed the raw slug to the FK query):

- **Public access token** (`public-token` POST/GET/DELETE) — create stored
  `switch_id = <slug>` (orphaned token); GET/DELETE looked up by slug → 404 even
  when a token existed. Handlers now resolve `sw.id` first.
- **LAG group list** (`lag-groups` GET) — `list(<slug>)` filtered by `switch_id`
  → always returned `[]`. Handler now resolves `sw.id`.
- **Allocation references** (`networks/[id]/allocations/[allocId]/references`) —
  compared `allocation.network_id` (UUID) against the raw network slug → wrong
  404. Now compares against the resolved `network.id`.

Site, network, VLAN, IP-allocation and IP-range CRUD were audited and found
already safe (slug-aware repos / UUID-only params).

### Switch filter bar: site-scoped options, per-filter reset, icons (v0.27.0)

Three improvements to the switch list filter bar (`switches/index.vue`):

- **Site-scoped options** — location and tag dropdown options now derived from
  the already-loaded (site-scoped) switch list via computed sets, instead of a
  second API fetch that returned global values. Removed `availableLocations` /
  `availableTags` refs and the redundant `apiFetch` call from `loadData()`.
- **Resettable filters** — each dropdown now starts with a sentinel "All …" entry
  (`FILTER_ALL = '_all'`). Selecting it clears that filter. Composable
  `useSwitchListFilters.ts` treats `'_all'` as no-filter, defaulting all refs to
  `'_all'` instead of `undefined`.
- **Icons** — `USelectMenu` controls replaced with `USelect` (icon-capable,
  functionally identical without search). Leading icons: map-pin (location),
  rectangle-stack (roles), tag (tags) — matching the IP-addresses page pattern.

### Fix: duplicate / non-red asterisk in required-field labels (v0.26.1)

Some form labels rendered `Name **` (two asterisks, the first non-red) or a
single non-red asterisk. Cause: a literal `' *'` was concatenated onto
`:label` while Nuxt UI v4 `UFormField required` already renders its own red
asterisk. Removed all literal `' *'` (16 occurrences across 7 files) and moved
`required` onto the `UFormField` where it had been on the inner `UInput`
(`IpAddressForm.vue`, `NetworkAllocationForm.vue`, `subnets/[id].vue`). Now a
single red asterisk renders consistently. No i18n change (locale strings never
contained asterisks).

### NetBox Import in Quick-Create Modal + Auto-Fill Manufacturer/Model

- **Quick-Create Template Modal** (`app/components/template/QuickCreateModal.vue`) extended
  with a Manuell / Aus Bibliothek tab switcher using `UTabs`. The Library tab embeds the
  existing `TemplateLibraryImport` component — search, port preview, skipped-interface
  warning — and calls `create()` directly with the schema-valid template object emitted
  by `LibraryImport`. No duplicate import logic.
- **Auto-fill in switch create form** (`app/pages/sites/[siteId]/switches/create.vue`):
  a `watch` on `layout_template_id` copies `manufacturer` + `model` from the selected
  template into the switch form (if blank or previously auto-filled). Manual user edits
  lock the field so template switches don't overwrite intentional values.
- i18n: added `templates.quickCreate.tabManual` / `tabLibrary` keys (EN + DE).
- Version bumped 0.25.6 → 0.26.0 (new feature, minor bump).

### Previous: Changelog Assets Fix (v0.25.6)

### Setup Wizard Changes
- **First-run flow now has two steps:** Step 1 = admin account (existing), Step 2 = first site naming. Operator chooses the name instead of getting an opaque "Default" site
- **Migration scenario covered:** legacy installs without `sites.json` no longer silently get a "Default" site at startup — the same wizard is reused but only Step 2 is shown (banner reports how many orphan switches/VLANs/networks will be reassigned)
- **Settings:** new `sites_initialized: boolean` flag in `AppSettings`. Backfilled on startup for existing installs (`sites_initialized = sites.length > 0`) so returning users aren't bounced into the wizard
- **New endpoints:** `GET /api/setup/status` (public — returns setup/sites flags + orphan counts), `POST /api/setup/initial-site` (auth-required — creates the site, reassigns orphans, flips `sites_initialized=true`; locked once flipped)
- **`server/plugins/migrateSites.ts`:** rewritten as detection-only — counts orphans and logs them, never auto-creates a site
- **Middleware (`auth.global.ts`):** routes through `/setup` for both `!setup_completed` and `!sites_initialized` cases; allows login in between when only the site step is pending
- **`useAuth` composable:** adds `sitesInitialized`, `setupOrphans`, `createInitialSite()`; `checkSetup()` now reads `/api/setup/status` instead of `/api/settings`

### Docs Updated
docs/guide/user-guide.md, docs/de/guide/user-guide.md (i18n: `setup.*` keys added to EN+DE)

### Previous: Tooling — pnpm Migration + Compose Split + GHCR Volume Fix

Date: 2026-05-24
Stage: Tooling — pnpm Migration + Compose Split + GHCR Volume Fix
Status: Complete
Version: 0.18.1

### Tooling Migration Changes
- **Package manager:** npm → pnpm 11.0.9 (pinned via `packageManager` field, activated via `corepack enable`)
- **Workspace:** Root + `docs/` configured as pnpm workspace (`pnpm-workspace.yaml`, single root `pnpm-lock.yaml`)
- **Supply-chain guard:** `.npmrc` enforces `minimum-release-age=10080` (1 week) — fresh package versions younger than this won't resolve
- **Build-script approvals:** `allowBuilds` in `pnpm-workspace.yaml` whitelists `@parcel/watcher`, `esbuild`, `unrs-resolver`, `vue-demi` (pnpm 10+ blocks scripts by default)
- **Dockerfile:** Switched to `corepack enable` + `pnpm install --frozen-lockfile` with `ENV CI=true` (avoids interactive modules-purge prompt in non-TTY contexts)
- **CI workflows:** `ci.yml` + `docs.yml` use `pnpm/action-setup@v4` + `actions/setup-node@v6` with `cache: pnpm`
- **Root scripts:** `docs:*` scripts use `pnpm --filter ezswm-docs <cmd>` instead of `npm run --prefix docs`

### Compose Split + GHCR Volume Fix
- **`compose.yaml`:** Now pulls `ghcr.io/slgfire/ezswm:latest` (no `build:`) — end users can `curl` the file and run without a source checkout
- **`compose.dev.yaml`:** New file — `build: .` for local development / Dockerfile iteration
- **Volume strategy:** Kept the `./data` bind mount (transparent backup/inspect from host) but solved the original EACCES bug by combining with the uid 1000 default + `PUID`/`PGID` override (see below). Users with host uid ≠ 1000 chown `./data` once, or run as root via `PUID=0`
- **Verified:** `docker compose pull && docker compose up -d` works end-to-end against GHCR — `/api/health` returns `{"status":"ok","data_writable":true}` (tested earlier with a named-volume variant; same Dockerfile, same runtime)

### Container User UID Change (BREAKING for existing deployments)
- **Old:** custom `ezswm` user via `addgroup -S` / `adduser -S` → got Alpine system uid `100`, gid `101`
- **New:** reuse the existing `node` user (uid `1000`, gid `1000`) baked into `node:22-alpine` — standard user range, matches common Nuxt/Nitro Docker templates, more compatible with host UIDs
- **Configurable per deployment:** compose files now declare `user: "${PUID:-1000}:${PGID:-1000}"` — override via env (e.g. Synology `PUID=1026`, or `PUID=0 PGID=0` for root)
- **Migration for existing GHCR users on v0.18.0:** after pulling the new image, chown your `./data` directory once: `sudo chown -R 1000:1000 ./data` (or set `PUID=0 PGID=0` to run as root and skip)
- **Verified:** default (`uid=1000(node)`) and root override (`PUID=0 → uid=0(root)`) both serve `/api/health` ok

### Docs Updated
README, AGENTS.md, .ai/INSTALLATION.md, .ai/ARCHITECTURE.md, .ai/STRATEGY.md, .ai/specs/SPEC_INFRASTRUCTURE.md, docs/guide/installation.md, docs/de/guide/installation.md

### Previous: Phase 31 — Component Refactoring: Extract Composables & Sub-Components

### Phase 31 Changes
- **Goal:** Reduce 5 files >750 lines by extracting composables and sub-components — no feature changes, no UI changes
- **New utils (auto-imported):** `subnetCalculations.ts`, `roleColors.ts`, `topologyRoleColors.ts`, `topologyLayout.ts`, `exportGraphPng.ts`
- **New composables (auto-imported):** `useSwitchEditForm.ts`, `useTemplateUnits.ts`, `useActivityLog.ts`, `useSwitchListFilters.ts`, `useSelectionPopover.ts`, `useTopologyGraphConfig.ts`, `useRemoteConnection.ts`, `useLagVlanConfig.ts`
- **New components:** `network/NetworkInfoBar.vue`, `network/NetworkUtilizationBar.vue`, `network/NetworkAllocationForm.vue`, `switch/SwitchCard.vue`, `switch/SwitchInfoBar.vue`
- **New tests:** `tests/subnetCalculations.test.ts` (18 tests)
- **Line reductions:** `networks/[id].vue` 893→615, `switches/index.vue` 754→447, `switches/[id].vue` 940→680, `TopologyGraph.vue` 759→549, `LagGroupSlideover.vue` 757→542 — total ~1270 lines removed
- **Also:** Replaced raw `$fetch` CRUD in network detail with `useIpAllocations`/`useIpRanges` composables; fixed nested ref v-model bug in switch list

### Previous: Phase 30 — vitest Setup: Test Migration + Repository/Validator/JWT Coverage

### Phase 30 Changes
- **vitest installed:** Replaced Node.js built-in test runner with vitest (globals mode, setupFiles for Nuxt stubs)
- **5 existing tests migrated:** auth, ipv4, deviceLibrary, public-token, validators — from `node:test`/`node:assert` to vitest globals
- **Test helpers:** `tests/testHelpers.ts` (mutable runtime config per test) + `tests/vitest.setup.ts` (Nuxt auto-import stubs: `useRuntimeConfig`, `createError`)
- **Repository tests (new):** networkRepository (11), vlanRepository (8), ipRangeRepository (11), ipAllocationRepository (15) — CRUD + all validation logic
- **JWT tests (new):** signToken/verifyToken with fake timers for deterministic expiry assertions (7d/30d)
- **MAC validation tests (new):** 9 tests for `isValidMacAddress`
- **Update schema tests (new):** updateSwitchSchema, updateNetworkSchema, updateIpAllocationSchema, updateIpRangeSchema, updateSiteSchema, updateVlanSchema edge cases
- **CI updated:** `node --import tsx --test` → `npm run test`
- **Total: 9 test files, 381 tests, ~3.4s runtime**

### Previous: Phase 29 — Quick Wins: Copy-to-Clipboard, Device Types, Network List UX

### Phase 29 Changes
- **Copy-to-clipboard:** Klick auf IP/Subnet/MAC/Mask kopiert den Wert direkt. Kein Icon, `cursor-copy` als Hinweis, grüner Text-Flash + Toast als Feedback. Fallback für HTTP (non-secure context). Nur auf Detail-Seiten und Tools, nicht auf Listen (Navigation-Konflikt)
- **Device Types erweitert:** `router` und `firewall` als neue Device Types für IP Allocations (Type, Validator, i18n EN+DE, Frontend-Dropdown)
- **Numerische Subnet-Sortierung:** Networks-Liste sortiert Subnets jetzt numerisch (IP-Oktett-Vergleich) statt lexikografisch. Gateway-Sortierung ebenfalls numerisch
- **Listen-Zustand in URL:** Suchtext (`q`), VLAN-Filter (`vlan`), Sortierspalte (`sort`), Sortierrichtung (`dir`) werden als URL Query-Parameter gespeichert. Reload/Back/Forward behält Zustand

### Previous: Phase 28 — Data Management UX, Import Fixes, IPv4 Special Nets, Final Polish

### Phase 28 Changes (Data Management UX Cleanup)
- **Tab-Benennung:** "Backup" → "Backup & Restore" — klarere Semantik
- **Keine doppelten Überschriften:** Export/Import-Tabs zeigen Formular direkt ohne extra Card-Wrapper und redundante Titel
- **Backup-Tab Cards:** Überschriften von "EXPORT"/"IMPORT" → "CREATE BACKUP"/"RESTORE BACKUP" — eindeutig, keine Verwechslung mit Daten-Export/Import
- **Backup-Beschreibungen:** "ZIP file" → "JSON file" korrigiert (Backup exportiert JSON, nicht ZIP)
- **Import Entity-Type Label:** Nutzt eigenen i18n-Key `dataManagement.import.selectType` statt Export-Key
- **Drag & Drop:** Auch auf Backup-Restore Dropzone hinzugefügt (konsistent mit Import)
- **Weniger Verschachtelung:** Export/Import-Content direkt unter Tab statt in list-container Card — kompakter, weniger Leerraum
- **Erklärende Beschreibungstexte:** Export + Import haben jeweils einen kurzen Einleitungstext der erklärt was passiert
- **Import-Flow klarer:** Template-Download mit Hint-Text inline, Dropzone mit "Datei hierher ziehen oder klicken" + Format-/Size-Hint
- **Begriffe bereinigt:** DE durchgehend "Backup" statt gemischt "Sicherung"/"Backup", Template-Key von Export nach Import verschoben
- **i18n aktualisiert:** EN + DE mit neuen Keys (`backupRestoreTab`, `createTitle`, `restoreTitle`, `import.selectType`, `export.description`, `import.description`, `import.dropOrSelect`, `import.templateHint`, `import.downloadTemplate`)
- **Paginierung entfernt:** Alle 7 List-Endpoints (VLANs, Switches, Networks, Sites, Allocations, Ranges, Layout Templates) liefern jetzt alle Items — keine page/per_page-Logik mehr
- **Settings "Items per page" entfernt:** War toter Code, wurde nirgendwo im Frontend genutzt — Feld, Type, Validator, Default und i18n-Keys bereinigt
- **Frontend Paginierungs-Workarounds entfernt:** per_page-Parameter aus allen Frontend-Fetches entfernt, Paginierungs-Loops in SwitchPortSidePanel vereinfacht
- **IPv4-Sondernetze /31 und /32:** Network-Detailseite zeigt RFC-konforme Labels (Endpoint A/B für /31, Host Address für /32), Badges "Point-to-Point"/"Host Route", Subnet Calculator nutzt gleiche Logik, DHCP-Range-Erstellung für /31 und /32 im Backend blockiert, Range-Tab in Add-Panel bei Sondernetzen ausgeblendet
- **Import: IP Ranges als neuer Entity-Typ:** Import-Endpoint um `ranges` erweitert (network_id, start_ip, end_ip, type), DHCP-Ranges aus Allocations-Datei separiert
- **Settings-Seite Polish:** Seiten-Wrapper `p-6` wie alle Hauptseiten, Formularfelder innerhalb Cards auf `max-w-lg` begrenzt, Buttons linksbündig, Section-Titel "General" statt Feldname, Felder gestapelt statt breites Grid — Cards nutzen volle Breite, Felder darin bleiben kompakt

### Phase 27b Changes (Docs Audit & PR Prep)
- **Doku-Audit:** README, EN User Guide, DE User Guide gegen aktuellen UI-Stand geprüft — alle korrekt und aktuell
- **Screenshot-Audit:** Alle 17 referenzierten Screenshots geprüft — passen zum aktuellen UI, kein Update nötig
- **Globale Suche Audit:** Voll funktionsfähig mit 6 Entitätstypen, Keyboard-Navigation, Site-Scoping, Highlighting — in beiden Guides vollständig dokumentiert
- **Keine Doku-Lücken:** Create-Page-Vereinheitlichung war rein layout-bezogen, Feld-Beschreibungen in Guides bereits korrekt

### Phase 27 Changes (Create-Seiten vereinheitlicht)
- **Zentrierter Wrapper:** Alle 4 Create-Seiten nutzen `mx-auto w-full max-w-5xl px-6 py-6`
- **Einheitlicher Header:** `gap-3`, Back-Button mit `aria-label`, `text-2xl font-bold` Titel
- **Section-Titel i18n:** Alle hardcodierten Section-Titel durch i18n-Keys ersetzt (EN + DE)
  - Sites: `sites.sections.siteInfo`
  - Switches: `switches.sections.basicInfo`, `networkLocation`, `templateClassification`
  - Networks: `networks.sections.networkInfo`, `vlanDescription`
  - VLANs: Section-Titel "VLAN" bleibt (universal)
- **Max-Width `max-w-5xl`:** Einheitlich 64rem für alle — genug Platz für Switch-Grids, Site wirkt nicht verloren
- **Footer-Abstand optimiert:** Footer aus `space-y-6` herausgenommen, eigenes `mt-4` — kompakterer Abstand zur letzten Card, konsistent auf allen 4 Seiten
- **VLAN Color-Input poliert:** Nativer Color-Picker versteckt hinter gestyltem Label mit Farbvorschau-Dot, Hex-Input mit `font-mono`, VlanColorSwatch entfernt (redundant)
- **Keine fachlichen Änderungen:** Formulare, Felder und Logik unverändert

### Phase 26g Changes (Expanded Info-Bereich finalisiert)
- **Gleiche visuelle Sprache wie Header:** Expanded-Bereich nutzt `flex flex-wrap` mit vertikalen Dividern (`h-8 w-px`) — identisch zum oberen Summary-Header
- **Kompakte Info-Zeile:** Network, Broadcast, DNS als gleichwertige Info-Items mit Mono-Font und Dividern
- **DNS kompakt:** `formatDns()` kürzt bei >3 Einträgen auf `"1.1.1.1, 8.8.8.8 +2"`
- **Description als Subtext:** Nur wenn vorhanden, als `line-clamp-2 text-sm text-gray-500` unter der Info-Zeile — kein eigener Block
- **Kein Grid mehr:** Statt `grid grid-cols-2` jetzt `flex flex-wrap` mit Dividern wie der Header
- **Kein Card-in-Card:** Alles innerhalb desselben Containers, `border-t` als Trennung, gleicher `px-5`

### Phase 26f Changes (Edit → Slideover, Info-Bar finalisiert)
- **Inline-Edit komplett entfernt:** Der grüne Inline-Edit-Block auf der Hauptseite existiert nicht mehr
- **Neues Edit-Slideover:** Netzwerk-Bearbeitung findet jetzt in einem USlideover statt — konsistent zu VLAN/Allocation/Range-Panels
  - Header: "Netzwerk bearbeiten" Titel
  - Body: Name, Subnet, Gateway, DNS, VLAN, Description (UTextarea)
  - Footer: Cancel + Save
  - Schließt sich automatisch nach erfolgreichem Speichern
- **Edit-Button vereinfacht:** Kein Toggle mehr (war pencil/x-mark), nur noch pencil → öffnet Slideover
- **Seite jetzt ruhiger:** Ohne Inline-Edit-Block fokussiert die Seite klar auf Info-Bar + IP-Übersicht
- **editFormRef:** Verwendet ref für Form-Submit aus Footer heraus (wie VLAN-Panel)

### Phase 26e Changes (Info-Bar Inline-Expand wie Switch)
- **Info-Leiste als klickbarer Button:** Gesamte Summary-Leiste ist jetzt ein `<button>` mit Hover-State (wie Switch-Seite)
- **Chevron-Toggle:** Expand/Collapse-Chevron rechts in der Info-Leiste, rotiert bei Expand (identisch zu Switch)
- **Inline-Expand:** Zusätzliche Details (Netzwerkadresse, Broadcast, DNS, Description) klappen als `border-t` innerhalb desselben Containers auf — kein separater Block mehr
- **Info-Button aus Header entfernt:** Toggle-Logik ist jetzt vollständig in der Info-Leiste, nicht mehr im Header
- **Konsistenz zu Switch:** Exakt gleiches Interaktionsmuster wie auf der Switch-Detailseite

### Phase 26d Changes (Network Edit Polish)
- **Edit-Kontext klar abgesetzt:** Eigener Container mit `border-primary-500/30` und leichtem Primary-Hintergrund — visuell klar als Edit-Modus erkennbar
- **Edit-Header:** Pencil-Icon + "Netzwerk bearbeiten" Titel + Close-Button — klarer Kontextwechsel
- **Details und Edit getrennt:** `v-show` für Details nur ohne Edit, Edit hat eigenen Container — kein gemeinsamer Block mehr
- **Footer mit Separator:** Cancel/Save durch `border-t border-primary-500/20 pt-4` visuell abgesetzt
- **Description → UTextarea:** Einzeiliges UInput ersetzt durch UTextarea mit 2 Zeilen (konsistent mit VLAN-Panel)
- **Description volle Breite:** Aus dem 2-Spalten-Grid herausgenommen, steht jetzt als eigenes Feld auf voller Breite
- **Pflichtmarker bereinigt:** `+ ' *'` String-Concat entfernt, nutzt stattdessen UFormField `required` Prop

### Phase 26c Changes (Doku & Screenshots)
- **Screenshots aktualisiert:** `screenshot-vlans.png`, `screenshot-networks.png` auf aktuellen UI-Stand gebracht
- **Neue Screenshots:** `screenshot-vlans-detail.png` (VLAN-Sidepanel), `screenshot-network-detail.png` (IP-Übersicht)
- **User Guide EN:** VLAN-Sektion um Sidepanel-Beschreibung + Screenshot ergänzt. Netzwerk-Sektion komplett überarbeitet (IP-Übersicht, klickbare Zeilen, Badges, Ranges)
- **User Guide DE:** Identische Aktualisierungen in deutscher Fassung
- **Globale Suche:** Audit durchgeführt — vollständig funktional, Doku aktuell, kein Handlungsbedarf

### Previous: Phase 26b — Network Page Feinschliff & Konsistenz

### Phase 26b Changes (Feinschliff)
- **IP-Übersicht Header-Alignment:** Titel auf `text-base` angehoben und `mb-3` Spacing — saubere vertikale Ausrichtung mit dem Hinzufügen-Button
- **Host-Zeilen-Hierarchie:** IP-Adresse dezenter (text-xs Mono), Hostname als Primärinfo (text-sm font-medium). Ohne Hostname → IP-Adresse als Fallback-Haupttext
- **Description + MAC als Subtext:** Allocation-Description und MAC-Adresse als zweite Zeile (`text-[11px] text-gray-400`) statt nur MAC
- **Allocation-Edit-Titel:** Zeigt IP-Adresse + Hostname statt generischem "Zuweisung bearbeiten" — analog zum Range-Panel
- **Validierung i18n:** Alle Network-Edit-Fehlermeldungen (Name, Subnet CIDR, Gateway IPv4) über `networks.validation.*` Keys
- **Range IP-Count i18n:** `"123 IPs"` → `$t('networks.ranges.ipCount', { count })` 
- **Delete-Dialog i18n:** `"+ more"` → `$t('common.more')`
- **Sort-Header i18n:** Hardcoded "Name/Subnet/Gateway" → `$t('common.name')`, `$t('networks.infoBar.subnet/gateway')`
- **Sort-Header dezenter:** Von `text-[11px] py-2` auf `text-[10px] py-1.5 text-gray-500` mit Hover-Transition
- **Neue i18n-Keys:** `networks.validation.*`, `networks.ranges.ipCount`, `common.more` (EN + DE)

### Phase 26 Changes (Network Page IP Overview)
- **IP-Zeilen klickbar:** Ganze Allocation-/Range-Zeile ist jetzt klickbar und öffnet direkt das Edit-Sidepanel
- **Selection-State:** Aktive Zeile bekommt `bg-primary-500/10` Highlight — klare Master-Detail-Verbindung
- **Hover-States verbessert:** Range-Zeilen mit typ-spezifischem Hover, cursor-pointer für alle interaktiven Zeilen
- **Allocation-Zeilen:** Device-Type als UBadge, Status-Badge i18n
- **Range-Zeilen:** Start-IP prominent, End-IP dezenter getrennt dargestellt
- **Sidepanel Header:** Range-Edit mit Type-Badge + IP-Range im Titel, Add/Edit-Panel kontextabhängig
- **Tooltips → native title:** UTooltip ersetzt (verhindert Auto-Focus-Bug)
- **Sprachkonsistenz:** Alle hardcoded Strings i18n, Utilization-Legende i18n
- **Netzwerkliste:** Nicht-funktionaler Edit-Button entfernt

### Previous: Phase 25c — VLAN Sidepanel Switch-Konsistenz (v0.14.3)

### Phase 25c Changes (Switch-Sidepanel-Angleichung)
- **Fix: Tooltip-Auto-Focus-Bug:** `UTooltip` um Edit/Delete-Buttons entfernt — USlideover fokussiert beim Öffnen den ersten Button im `#actions`-Slot, was den Tooltip sofort auslöste. Ersetzt durch natives `title`-Attribut (kein Focus-Trigger)
- **Header vereinheitlicht:** Swatch + "VLAN {id} — {name}" als einfacher Titel-String wie beim Switch-Panel (kein überladenes Custom-Layout). Actions (Edit/Delete) rechts mit `title`-Attribut
- **Card-in-Card eliminiert:** `rounded-lg border p-4` Container um Properties und `rounded-lg border` um Netzwerke entfernt. Body ist jetzt flach mit `space-y-4` wie beim Switch-Panel
- **Status + Farbe als Badges:** Oben im Body als `flex gap-2` Badge-Zeile (wie Switch: type + status Badges). Farb-Badge enthält Swatch + Hex inline
- **Sections mit USeparator:** Netzwerk-Sektion durch `<USeparator />` vom Rest getrennt — gleicher Mechanismus wie im Switch-Panel
- **Labels vereinfacht:** Von `text-[10px] uppercase tracking-wider` zu `text-sm text-gray-400` — gleiche Label-Sprache wie Switch-Panel (`UFormField :label`)
- **Netzwerk-Links flach:** Einfache hover-fähige Liste ohne Border-Container. Leer-Zustand als schlichter `text-gray-500` Text (kein border-dashed)

### Phase 25b Changes (Sidepanel Polish)
- Header entzerrt, Redundanz entfernt, Properties-Sektion, Farbwert aufgewertet, Netzwerk-Sektion, Label-Farbe angepasst

### Phase 25 Changes
- **VLAN list selection state:** Active/selected row highlighted with `bg-primary-500/10` + color accent bar widens from `w-1` to `w-2` (animated) — clear master-detail connection
- **Sort header dezenter:** Reduced from `text-[11px] py-2` to `text-[10px] py-1.5`, softer color (`text-gray-500`), smoother hover transition
- **Metadata hierarchy ruhiger:** "No network" changed from yellow exclamation to italic neutral with minus-circle icon — recognized as empty state, not alarm. Network names get `font-medium` for slight emphasis
- **Sidepanel header redesigned:** VLAN ID in VLAN color (bold) + name baseline-aligned, status badge with `mt-1` spacing — less crammed, clearer priority
- **Sidepanel actions:** Edit + Delete buttons in header actions (consistent with switch panels), tooltips for both
- **Sidepanel info structure:** Sections separated with `border-t border-default` dividers — Description and Networks as own sections with clear visual breaks
- **Networks section with icon header:** Globe icon + uppercase label, hover links with `hover:bg-elevated`, empty state italic gray
- **Edit form color preview:** VlanColorSwatch added next to hex input for live preview
- **Panel close resets edit mode:** Watcher resets `panelEditing` when panel closes
- **Detail page (`[id].vue`) labels unified:** All field labels now use `text-[10px] uppercase tracking-wider text-gray-400` — matches sidepanel and switch page
- **Detail page network links:** Updated to same flex layout with `hover:bg-elevated` and `text-primary-500`
- **Detail page description:** Now in separate `border-t` section below grid

---

## Previous Stage

Date: 2026-04-24
Stage: Phase 24c — Toolbar Consistency & Info Inline Refactor (v0.14.2)
Status: Complete

### Phase 24c Changes
- **Info moved to inline expand/collapse:** Info-Karte ist jetzt klickbar mit Chevron-Toggle. Details klappen inline unter der Info-Karte auf/zu — kein Toolbar-Button, kein Slideover
- **Toolbar Action-Farben wiederhergestellt:** Edit zurück zu `color="primary"` (konsistent mit allen anderen Seiten: VLANs, Networks, Sites, Layout Templates)
- **Toolbar 3-Gruppen-Layout:** [VLANs | Details] | [PublicAccess | Edit | Duplicate] | [Delete] — mit visuellen Dividern
- **VLANs + Details farbig:** VLANs in violet (passend zum Dashboard-KPI), Details in blau — via Tailwind-Klassen (`text-violet-400`, `text-blue-400`) mit farbigem Hover-Hintergrund
- **Details-Slidepanel beibehalten:** Tabs "Ports" / "Activity", SwitchPortTable mit `embedded`-Prop (keine doppelte Ebene)
- **Utility-Actions (QR + Duplicate):** Von `variant="ghost"` zu `variant="soft"` — dezenter Hintergrund + deutlich sichtbarerer Hover-/Focus-State, konsistent als neutrale Utility-Familie
- **Utility-Actions (QR + Duplicate):** Von `variant="ghost"` zu `variant="soft"` — dezenter Hintergrund + sichtbarerer Hover-/Focus-State
- **Polish:** Redundante Tooltips bei VLANs/Details entfernt, `cursor-pointer` auf Info-Karte
- **Doku-Update:** User Guide (EN+DE) aktualisiert: Port Table/Activity jetzt als Details-Slideover beschrieben, Info-Leiste mit Expand-Toggle dokumentiert, Toolbar-Aktionen beschrieben. Screenshot `screenshot-switch-detail.png` erneuert. README Version-Badge auf 0.14.0, Roadmap ergänzt

### Phase 24b Changes
- **Labels shortened:** "More details" → "Details", tab "Port Table" → "Ports", tab "Recent Activity" → "Activity"
- **Details slideover inner structure simplified:** SwitchPortTable `embedded` prop removes collapsible header/card wrapper; shows compact summary bar + table directly under Ports tab
- **i18n updated:** Added `common.info`, `switches.detailsAction`, `switches.tabs.ports`, `switches.tabs.activity` (EN + DE)

### Phase 24a Changes (2026-04-23)
- **VLAN Selector simplified:** Removed override toggle, lock icons, "+Switch" badges. All site VLANs are now always selectable with informational grouping (configured / other site VLANs)
- **Override moved to Connected Switch selection:** When VLANs are selected, the connected switch list filters to only show switches with those VLANs configured. An override toggle allows showing all switches and auto-adding missing VLANs to the target switch on save
- **Backend: auto-add on current switch:** Port updates now automatically add unconfigured VLANs to the current switch's configured_vlans (no toggle needed)
- **Backend: target switch override:** New `add_vlans_to_target_switch` flag in port update API. When set, missing VLANs are atomically added to the connected target switch
- **Bulk editor simplified:** Override toggle removed (bulk has no connected switch selection)
- **LAG port rehydration:** Ports in LAGs now auto-detect connected switch from LAG remote_device_id
- **LAG VLAN config:** New optional VLAN configuration section in LAG slideover — applies port_mode/VLANs to all LAG member ports via bulk API
- **Site filter fix:** Switch dropdowns (port editor + LAG slideover) now filter by current site_id
- **i18n updated:** Old override keys replaced with target switch override keys + LAG VLAN keys (EN + DE)
- **Switch detail layout simplified:** Configured VLANs moved to action button + slideover; Port Table + Activity moved to "More details" slideover with tabs; Legend zone below port grid stripped of box/card styling; Helper section made collapsible

---

## Previous Stage

Date: 2026-04-20
Stage: Phase 24 — Secure VLAN Port Assignment (v0.14.0)
Status: Complete

---

## Changes

### Phase 1: Project Bootstrap
- Created package.json with all pinned dependencies (Nuxt 3.15.4, Nuxt UI 2.22.3, bcryptjs, nanoid v5, etc.)
- Created nuxt.config.ts with compatibilityVersion 4, i18n, colorMode
- Created Dockerfile (multi-stage, node:22-alpine, non-root user, healthcheck)
- Created compose.yaml with volume mounts and env vars
- Created app structure: pages, layouts, components, composables, middleware
- Created i18n locales (en.json, de.json) with full translations

### Phase 2: Storage & Data Foundation
- Created all TypeScript interfaces in types/ (13 files)
- Created server/storage/jsonStorage.ts with atomic writes (write tmp → rename)
- Created server/utils/ipv4.ts with subnet calculations
- Created server/plugins/initData.ts for data directory initialization
- Created all Zod validators in server/validators/ (9 files)
- Created all repositories in server/repositories/ (10 files)

### Phase 3: Authentication
- Created server/utils/auth.ts (bcryptjs hashing, JWT sign/verify, cookie management)
- Created server/middleware/auth.ts (JWT validation, public path exclusions)
- Created auth API routes (setup, login, logout, me)
- Created app/composables/useAuth.ts (login, logout, setup, user state)
- Created app/middleware/auth.global.ts (route guards, setup redirect)
- Created setup.vue and login.vue pages with auth layout

### Phase 4: Dashboard Shell
- Created AppSidebar.vue (collapsible, nav sections, active state, mobile responsive)
- Created AppHeader.vue (search, user menu, theme toggle, mobile sidebar toggle)
- Created AppBreadcrumbs.vue (dynamic from route)
- Created AppFooter.vue (version, GPL notice)
- Updated default.vue layout (sidebar + header + breadcrumbs + content + footer)
- Created shared components (EmptyState, ConfirmDialog)

### Phase 5: Core CRUD Pages
- Created all API routes: switches (8), VLANs (6), networks (12), layout-templates (7), users (6), settings (2)
- Created utility API routes: search, subnet-calculator, topology, dashboard/stats, activity (with undo)
- Created composables: useSwitches, useVlans, useNetworks, useIpAllocations, useIpRanges, useLayoutTemplates, useUsers, useSettings
- Created CRUD pages: switches (list/create/detail), VLANs (list/create/detail), networks (list/create/detail with IP allocations and ranges), layout-templates (list/create/detail/edit)
- Created settings page with General and Account tabs
- Created placeholder pages: topology, subnet-calculator, import-export, backup

### Phase 6: Switch Port Visualization
- Created SwitchPortGrid.vue (renders ports from layout template, organized by units/blocks)
- Created SwitchPortItem.vue (port shapes, VLAN colors, status indicators, trunk badges)
- Created SwitchUnitDivider.vue (visual separator between stacked units)
- Created SwitchPortSidePanel.vue (USlideover for editing individual ports)
- Created SwitchPortBulkEditor.vue (bulk VLAN/status assignment)
- Created SwitchInfoCard.vue (switch metadata card)
- Integrated port visualization into switch detail page

### Phase 7: Advanced Features
- Created dashboard with KPI widgets (counts, port status, IP utilization bars, warnings, activity feed)
- Created topology API (returns switch connection graph)
- Created subnet calculator page (real-time calculation from CIDR)
- Created activity API with undo support
- Created search API (global search across all entities)
- Created VLAN components (VlanColorSwatch, VlanBadge)

---

## Files Modified/Created

### Config
- package.json, package-lock.json, nuxt.config.ts, tsconfig.json, app.config.ts
- .gitignore, .env.example, Dockerfile, compose.yaml

### Types (types/)
- user.ts, switch.ts, port.ts, vlan.ts, network.ts, ipAllocation.ts, ipRange.ts
- layoutTemplate.ts, lagGroup.ts, activity.ts, settings.ts, api.ts, index.ts

### Server
- server/storage/jsonStorage.ts
- server/utils/ipv4.ts, server/utils/auth.ts
- server/plugins/initData.ts
- server/middleware/auth.ts
- server/validators/ (9 schema files)
- server/repositories/ (10 repository files)
- server/api/ (50+ API route files)

### App
- app/layouts/default.vue, app/layouts/auth.vue
- app/components/layout/ (4 components)
- app/components/shared/ (2 components)
- app/components/switch/ (6 components)
- app/components/vlan/ (2 components)
- app/composables/ (8 composables)
- app/middleware/auth.global.ts
- app/pages/ (20+ page files)

### i18n
- i18n/locales/en.json, i18n/locales/de.json

---

## Verification

npm run dev: Passes (starts on port 3000, serves dashboard)

npm run build: Passes (no errors)

docker build: Passes (multi-stage, ~5.6MB output)

docker run: Passes (healthcheck OK, API responds)

API Tests:
- /api/health returns status ok
- /api/auth/setup creates admin user
- /api/auth/login returns JWT
- CRUD operations work for all entities
- Subnet calculator returns correct results
- Data persists in JSON files

---

### Phase 8: Import/Export & Backup
- Created backup export API (full JSON backup of all data)
- Created backup import API (restore with pre-restore backup)
- Created entity export API (per-entity JSON download)
- Created entity import API (JSON array import with validation)
- Created import template API (downloadable templates per entity)

### Phase 9: Polish
- Full i18n translations (EN + DE) with 200+ keys
- Server-side Zod validation on all API routes
- Confirmation dialogs for all destructive actions
- Toast notifications for all CRUD operations
- Empty states on all list pages

### Phase 10: Docker & Production
- GPL v3 LICENSE file
- README.md with setup instructions
- Docker multi-stage build verified
- Docker compose with healthcheck verified
- End-to-end API testing passed (11 test scenarios)

---

## Verification

npm run dev: Passes

npm run build: Passes (no errors, 5.7MB output)

docker build: Passes (multi-stage, node:22-alpine)

docker run: Passes (healthcheck OK, API functional)

End-to-end tests: 11/11 passed
- Health endpoint
- Setup wizard (first admin creation)
- Layout template creation
- Switch creation with auto-port generation (26 ports from template)
- VLAN creation with color
- Network creation with CIDR validation
- IP allocation with subnet membership check
- Subnet calculator
- Dashboard statistics
- Global search
- Backup export

---

## Project Statistics

- 21 pages
- 15 components
- 8 composables
- 67 API routes
- 10 repositories
- 9 validators
- 13 type definitions
- 2 i18n locales (EN, DE)

---

### Phase 11: Switch Port Front-Panel Visualization (2026-03-17)

**Critical bug fix + visual enhancements:**

- Fixed `templateUnits` never being populated — port grid always fell back to flat 12-column layout
- Fixed component name resolution: `SwitchSwitchPortGrid` → `SwitchPortGrid` (SSR rendering issue)
- Added `watch([item, templates])` to populate `templateUnits` from layout template data
- Fetched and passed VLAN data through grid to port items for color-coded backgrounds
- Added VLAN color tinting (native_vlan color at 20% opacity as background)
- Added trunk port indicator (full-width yellow top stripe replacing tiny dot)
- Added SFP/SFP+ port type distinction (taller shape, rounded-t-lg, "SFP" micro-label)
- Added management port visual (teal border) and console port visual (amber border)
- Increased port size from 32x32px to 40x40px with larger font
- Moved port visualization above details card as primary content
- Made details card collapsible (collapsed by default) with chevron toggle
- Details grid now uses 3 columns on large screens
- Breadcrumb now shows switch name instead of ID (via useState override system)
- Fixed Docker healthcheck IPv6 issue (localhost → 127.0.0.1)
- Increased grid spacing between blocks and ports for better readability

**Files changed:**
- `app/pages/switches/[id].vue` — layout reorder, templateUnits fix, VLAN fetch, breadcrumb override, collapsible details
- `app/components/switch/SwitchPortGrid.vue` — vlans prop, improved spacing
- `app/components/switch/SwitchPortItem.vue` — VLAN colors, trunk stripe, port type shapes, larger size
- `app/components/layout/AppBreadcrumbs.vue` — useState-based label override system
- `compose.yaml` — healthcheck IPv4 fix

---

### Phase 13: Dark Theme & UI Polish (2026-03-24)

**Dark theme token overrides:**
- Overrode Nuxt UI v4 CSS custom properties for deep-dark industrial look
- `--ui-bg: #0e0e0e`, `--ui-bg-elevated: #161616`, `--ui-border: #222222`
- Restored consistent visual hierarchy: body (#0a0a0a) → bg-default (#0e0e0e) → bg-elevated (#161616)

**Hover visibility fix:**
- Created `.row-hover` CSS class with `rgba(255,255,255,0.10)` for dark mode
- Replaced invisible `hover:bg-elevated` on VLAN, Network, and IP allocation list rows
- Created `.list-container` CSS class with visible border for list containers

**Card border fix:**
- Replaced `ring ring-default` (thick, odd-looking) with `.card-glow` border styling
- `card-glow` now sets border via CSS (`rgba(255,255,255,0.08)` dark mode) with green glow on hover
- Applied to Switch cards, Template cards, Dashboard KPI cards

**Favicon and page titles:**
- Generated favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png from logo.png
- Added `titleTemplate: '%s — ezSWM'` to nuxt.config.ts
- Added `useHead()` with page-specific titles to all 20 pages
- Dynamic pages show entity names (e.g. "sw-core — ezSWM", "VLAN 100 — Server-VLAN — ezSWM")

**Files changed:**
- `app/assets/css/main.css` — dark theme tokens, .row-hover, .list-container, .card-glow border
- `nuxt.config.ts` — app.head with title, titleTemplate, favicon links
- `public/` — favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png
- All 20 page files in `app/pages/` — useHead() titles
- `app/pages/vlans/index.vue`, `app/pages/networks/index.vue` — row-hover, list-container
- `app/pages/switches/index.vue`, `app/pages/layout-templates/index.vue` — card-glow borders
- `app/pages/index.vue` — card-glow borders on KPI cards

**Verification:**
- `npm run build`: Passes (8.95 MB output)
- `docker compose build --no-cache`: Passes
- Zero console errors/warnings
- Dark theme visually consistent across all pages
- Hover effects clearly visible on list rows
- Card borders clean with green glow on hover

---

### Phase 14: LAG Groups UI (2026-03-31)

**LAG Group Management:**
- Upgraded useLagGroups composable with TypeScript types and precomputed lookup maps (lagById, lagByPortId)
- Created LagGroupSlideover component for create/edit LAG (dynamic title, port badges, validation)
- Added "Create LAG" button to port multi-select bulk action bar with inline validation hints
- Added LAG legend section to port grid with collapse/expand (≤3 inline, >3 collapsible)
- Added hover-highlight: hovering LAG in legend dims non-member ports (brightness filter)
- Added LAG group display in port side panel with "Remove from LAG" action
- Added LAG deep-link support (?lag=id opens edit slideover)

**Port Visualization Fixes:**
- Replaced LAG bottom-stripe indicator with diagonal stripe pattern (CSS class .lag-stripe)
- Added LAG hover tooltip on ports (name, port count, remote device)
- Fixed Access vs Trunk VLAN dot: Access = sharp square, Trunk = circle with outer ring

**Backend Improvements:**
- Added `metadata` field to ActivityEntry type for structured audit logging
- Added activity logging to all LAG API routes (create/update/delete) with port labels and diffs
- Added LAG cleanup on switch deletion (lagGroupRepository.deleteBySwitchId)
- Renamed route param [id] to [lagId] for LAG routes (disambiguation)
- Added LAG groups to global search API with deep-link URLs

**Shared Utilities:**
- Created app/utils/ports.ts with resolvePortLabel utility
- Added .lag-stripe, .lag-stripe-icon, .lag-dimmed CSS classes

**i18n:**
- Added full LAG translation keys (EN + DE) with pluralization and validation messages

**Files changed:**
- `types/activity.ts` — metadata field
- `server/repositories/activityRepository.ts` — metadata in log()
- `server/api/switches/[id].delete.ts` — LAG cleanup
- `server/api/switches/[id]/lag-groups/` — renamed to [lagId], added activity logging
- `server/api/search.get.ts` — LAG search
- `app/utils/ports.ts` — new utility
- `app/assets/css/main.css` — LAG CSS classes
- `app/composables/useLagGroups.ts` — typed with lookup maps
- `app/components/switch/SwitchPortItem.vue` — diagonal stripes, tooltip, dot fix
- `app/components/switch/SwitchPortGrid.vue` — LAG legend, hover-highlight
- `app/components/switch/SwitchPortSidePanel.vue` — LAG display + remove
- `app/components/switch/LagGroupSlideover.vue` — new component
- `app/components/layout/AppHeader.vue` — LAG in search results
- `app/pages/sites/[siteId]/switches/[id].vue` — LAG integration
- `i18n/locales/en.json`, `i18n/locales/de.json` — LAG translations

**Verification:**
- `npx nuxt typecheck`: 0 errors
- `npm run build`: Passes
- Unit tests: 105/105 passing

---

### Phase 15: Print CSS (2026-04-01)

**Print Feature:**
- Print CSS with scoped `.print-mode` class on body
- Dedicated `print.vue` layout (no sidebar/header)
- Multi-switch print page (`/sites/{siteId}/switches/print?ids=...`)
- Switch picker popover with checkboxes grouped by site
- Single switch print via hover icon on switch cards
- Access ports tinted with VLAN color (85% opacity) in print
- Trunk ports marked with black 16px dot in print
- `printMode` prop on SwitchPortItem/SwitchPortGrid for print-specific rendering
- Compact VLAN legend per switch in print output
- A4 landscape format with page breaks between switches
- Auto-opens in new tab via `window.open()`

**Files created:**
- `app/layouts/print.vue` — minimal print layout
- `app/pages/sites/[siteId]/switches/print.vue` — multi-switch print page
- `app/components/switch/SwitchPrintLegend.vue` — print VLAN legend

**Files changed:**
- `app/assets/css/main.css` — print CSS rules, `.print-preview` styles
- `app/components/switch/SwitchPortItem.vue` — `printMode` prop, VLAN tint, trunk dot
- `app/components/switch/SwitchPortGrid.vue` — `printMode` prop passthrough
- `app/pages/sites/[siteId]/switches/index.vue` — print picker popover, hover print icon
- `i18n/locales/en.json`, `i18n/locales/de.json` — print translations

**Version:** 0.6.0

**Verification:**
- `npx nuxt typecheck`: 0 errors
- `npm run build`: Passes
- Unit tests: 105/105 passing

---

### Phase 16: Activity Log Details (2026-04-02)

**Activity Log Improvements:**
- Port updates now log previous_state with field-by-field diff (only changed fields)
- Compact human-readable activity descriptions (e.g. "SFP+ 1/20: VLAN 100 assigned, activated")
- Dashboard: short summary (max 3 changes per entry)
- Switch detail: full summary (all changes) in collapsible "Recent Activity" section
- Activity API supports ?entity_id filter for per-entity activity
- All activity descriptions i18n-ready (EN + DE)
- Relative time strings i18n-ready ("just now" / "gerade eben")

**UI Fixes:**
- PoE option only shown for RJ45 ports
- Connection mode buttons renamed: Switch / Device / Custom

**Version:** 0.7.0

---

## Open Issues

- Topology page: interactive network diagram (Coming Soon placeholder in UI)
- Form validation is server-side only (no real-time client validation)
- Dashboard widget reordering not implemented
- IPv6 support not included (as per spec: post-MVP)

---

### Phase 17: Device Allocation Dropdown (2026-04-02)

**Device Connection Mode:**
- Replaced freetext "Device" mode with dropdown of IP allocations filtered by port's VLAN/network
- Access port: shows allocations from access_vlan network(s)
- Trunk port: shows allocations from all tagged + native VLAN networks
- No VLAN: shows hint "Assign a VLAN first"
- Dropdown with search, sorted by IP, grouped by network prefix for trunk ports
- "None" option to clear allocation
- Stale allocation handling (VLAN changed after assignment shows ⚠ marker)

**Backend:**
- Added `connected_allocation_id` to Port type
- New references endpoint: GET /api/networks/:id/allocations/:allocId/references
- Allocation delete clears connected_allocation_id on referencing ports
- Switch duplicate clears connected_allocation_id on all ports
- Port reset clears connected_allocation_id
- _createRemoteLink clears connected_allocation_id (prevents dual-state)
- connected_allocation_id in audit diff logging

**Frontend:**
- Rehydration: port with connected_allocation_id auto-selects Device mode
- Mode-switch clearing: switching modes clears previous mode's state
- Form state re-loaded on panel open (cancel discards changes)
- Port conflict detection includes allocation-occupied ports
- LAG sync includes connected_allocation_id
- Allocation delete warning shows affected ports via SharedConfirmDialog

**Version:** 0.8.0

---

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
- E2E tests: keyboard-shortcuts.spec.ts passing

---

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
- Unit tests: public-token.test.ts passing (8/8)
- E2E tests: public-switch-view.spec.ts (5 tests)

---

### Phase 20: Port Helper Usage (2026-04-17)

**Explicit port classification for public helper view:**
- New `PortHelperUsage` type with 6 roles: participant, phone_passthrough, ap, printer, orga, uplink
- Three new optional fields on Port: `helper_usage`, `helper_label`, `show_in_helper_list`
- Side panel editor: "Public Helper View" section with role dropdown, custom label, visibility checkbox
- Bulk editor: three-state helper_usage dropdown (no change / automatic / explicit role)
- Public API passes through all three fields
- PublicPortList rewritten with centralized `getEffectiveUsage()` for both category and purpose
- Backwards-compatible fallback: legacy ports without helper_usage use inference (is_uplink → uplink, tagged_vlans → special, else → participant)
- `show_in_helper_list: false` hides port from helper list (still visible in desktop grid)
- `helper_label` overrides default role label in public view
- Activity logging tracks helper field changes; null→undefined normalization preserves clear-to-automatic in audit log
- Per-role filter chips in public view (Phone + PC, Orga, etc.)
- Full i18n (EN + DE)

**Files changed:**
- `types/port.ts` — PortHelperUsage type, 3 new Port fields
- `types/index.ts` — barrel export
- `server/validators/switchSchemas.ts` — Zod schemas for single + bulk update
- `server/api/p/[token].get.ts` — include helper fields in public response
- `server/api/switches/[id]/ports/[portId].put.ts` — diff allowlist, null normalization
- `server/api/switches/[id]/ports/bulk.put.ts` — null normalization
- `app/components/switch/SwitchPortSidePanel.vue` — helper view section
- `app/components/switch/SwitchPortBulkEditor.vue` — helper_usage dropdown
- `app/components/public/PublicPortList.vue` — rewritten classification logic
- `tests/e2e/public-switch-view.spec.ts` — helper_usage tests
- `i18n/locales/en.json`, `i18n/locales/de.json` — helperUsage.* keys

**Version:** 0.11.0

**Verification:**
- `npm run build`: Passes
- Unit tests: all passing
- E2E tests: public-switch-view.spec.ts updated

---

### Phase 21: Network Topology Visualization (2026-04-18)

**Site-scoped interactive topology:**
- v-network-graph (Vue 3 SVG library) with custom node rendering
- Site-scoped page at `/sites/[siteId]/topology`
- Custom SVG nodes: switch name, role badge, model, port status dots
- One edge per physical port connection (bidirectional dedup)
- LAG members as parallel edges with `edge.gap` spacing
- Cross-site links: ghost nodes with dashed borders
- Detail panel: switch info, port footer, connections grouped by LAG
- Hierarchical auto-layout (Core → Distribution → Access)
- Drag-to-reposition with persistent positions (topologyLayouts.json)
- Reset layout (DELETE endpoint), Fit to screen, PNG export (SVG→Canvas)
- Toolbar, role legend, stats badge
- Topology nav hidden in All Sites context
- Full i18n (EN + DE)

**Files created:**
- `types/topology.ts` — TopologyNode, TopologyLink, TopologyGhostNode, TopologyLayout
- `app/plugins/v-network-graph.ts` — Nuxt plugin
- `app/pages/sites/[siteId]/topology.vue` — main page
- `app/components/topology/TopologyGraph.vue` — graph component
- `app/components/topology/TopologyDetailPanel.vue` — detail panel
- `app/composables/useTopology.ts` — data fetching composable
- `server/api/sites/[siteId]/topology/` — 4 API endpoints (data, layout GET/PUT/DELETE)
- `server/repositories/topologyLayoutRepository.ts` — layout storage
- `server/validators/topologySchemas.ts` — Zod validation

**Files changed:**
- `server/plugins/initData.ts` — topologyLayouts.json init
- `server/api/backup/export.get.ts` — include in backup
- `server/api/backup/import.post.ts` — include in restore
- `server/api/sites/[id].delete.ts` — cleanup on site deletion
- `app/components/layout/AppSidebar.vue` — site-scoped nav
- `i18n/locales/en.json`, `de.json` — topology keys

**Files removed:**
- `app/pages/topology.vue` — replaced by site-scoped
- `server/api/topology.get.ts` — replaced by site-scoped

**Version:** 0.12.0

**Verification:**
- `npm run build`: Passes

---

### Phase 21b: Topology UI/UX Polish (2026-04-18)

**Visual improvements to topology graph:**
- Edge visibility: normal color `#555` (was `#2a2a2a`), hover `#999`, selected green with width 3.5
- Removed duplicate node labels (v-network-graph default label hidden via `label.visible: false`)
- Role-based node sizing: Core 164x80, Distribution 150x74, Access 140x68
- Role-colored node borders: subtle tint matching role color, stronger on hover
- Node hover state: border opacity increase + SVG glow filter in role color
- Port status symbols: ▲ up (green), — down (gray), ▼ disabled (red) instead of identical circles
- Auto-fit on page load (`fitToContents()` after 200ms mount delay)
- Compact icon toolbar: +/− zoom, fit, reset, export as icon-only buttons with dividers
- Improved legend: filled circles + port status symbol explanation in bottom bar
- Better auto-layout spacing: 220px horizontal, 250px vertical (was 200/200)

**Files changed:**
- `app/components/topology/TopologyGraph.vue` — complete UI overhaul
- `i18n/locales/en.json` — added zoomIn, zoomOut keys
- `i18n/locales/de.json` — added zoomIn, zoomOut keys

**Verification:**
- `npm run build`: Passes
- Zero console errors

---

### Phase 21c: Topology UI Polish Refinement (2026-04-18)

**Focused polish pass:**
- Native fit-to-view via `autoPanAndZoomOnLoad: 'fit-content'` with `fitContentMargin: 50` (replaces manual setTimeout)
- Node bounding box matches largest node (168x82) preventing right-edge clipping
- Slightly larger nodes: Access 148x72 (was 140x68), Dist 156x76 (was 150x74), Core 168x82 (was 164x80)
- Edge fanout: `gap: 12` + `margin: 8` for cleaner parallel link spacing
- Dist border opacity 0.25 vs Access 0.15 for stronger visual differentiation
- Model text left-aligned (matching name) instead of centered
- Port count label (`48p`) added for context next to status symbols
- Toolbar + bottom bar: `backdrop-blur-sm`, `shadow-md`, `bg-elevated/90` for cohesive floating look
- Stats merged into legend bar (single bottom element instead of two)
- Tier y-spacing 260 (was 250) for better vertical distribution

**Files changed:**
- `app/components/topology/TopologyGraph.vue`
- `.ai/MIGRATION_STATUS.md`

**Verification:**
- `npm run build`: Passes
- Zero console errors

---

### Phase 21d: Topology Final Layout + Edge Attachment Fix (2026-04-18)

**Layout polish:**
- Asymmetric fitContentMargin `{ top: 20, bottom: 60, left: 60, right: 60 }` — graph sits higher, less empty space above
- Bottom/side padding prevents node clipping near edges and legend bar
- Edge gap increased to 14 for cleaner parallel link fanout from core

**Edge-to-node attachment fix:**
- Root cause: node config `width/height` (168x82) was larger than actual SVG rects (148x72 for Access), causing edges to terminate at the config boundary instead of the visual card edge
- Fix: `edge.margin: null` — edges now extend to node center, visually clipped by the opaque node background rect drawn in the `#override-node` slot
- Edges attach flush to all node sizes regardless of role

**Minor:**
- Port count label font bumped to 9px (was 8px) for readability

**Files changed:**
- `app/components/topology/TopologyGraph.vue`
- `.ai/MIGRATION_STATUS.md`

**Verification:**
- `npm run build`: Passes
- Zero console errors

---

### Phase 21e: Selection Polish + Panel Re-fit (2026-04-18)

**Selection state:**
- Selected node uses role-colored border at 0.55 opacity (was uniform green 0.5)
- Dedicated `glow-selected` SVG filter with green glow (stdDeviation 4, opacity 0.2)
- Selection feels integrated with role colors instead of a disconnected overlay
- Guard against NaN SVG attributes when scale is briefly undefined during transitions

**Panel integration:**
- Graph auto-re-fits when detail panel opens or closes via `watch(panelOpen)`
- All nodes remain visible even with the 290px panel taking canvas space

**Files changed:**
- `app/components/topology/TopologyGraph.vue`
- `app/pages/sites/[siteId]/topology.vue`
- `.ai/MIGRATION_STATUS.md`

**Verification:**
- `npm run build`: Passes

---

### Phase 21f: Panel Reuse + Edge Highlighting + Node Differentiation (2026-04-18)

**Panel → USlideover:**
- Replaced custom `w-[290px]` div with `<USlideover>` matching the app's standard side panel
- Title/description props, `#body` + `#footer` slots, standard close behavior
- Graph gets full canvas width (panel overlays, no longer pushes)
- Connection cards emit `highlight-edge` on hover for edge highlighting

**Edge highlighting:**
- Panel connection hover → edge selected in graph via `setSelectedEdges()`
- Edge selection style: green `rgba(34,197,94,0.6)` width 3.5

**Node differentiation:**
- Role accent bar: 3px vertical stripe on left edge in role color (Core 0.7 opacity, others 0.4)
- Wider size gap: Core 176x86, Dist 160x78, Access 148x72 (was 168/156/148)
- Combined with role-colored borders → clear hierarchy at a glance

**Files changed:**
- `app/components/topology/TopologyDetailPanel.vue` — rewritten to USlideover
- `app/components/topology/TopologyGraph.vue` — accent bar, highlight-edge, size update
- `app/pages/sites/[siteId]/topology.vue` — new events, panel overlay layout
- `.ai/MIGRATION_STATUS.md`

**Verification:**
- `npm run build`: Passes

---

### Phase 21g: Side Panel UX Improvements (2026-04-18)

**Panel content restructuring:**
- Role badge moved into USlideover description ("Core · Juniper · QFX5100")
- Connections grouped by target switch — one card per switch instead of per link
- Port mappings as compact monospace rows (local ↔ remote) inside each card
- LAG sub-groups shown as labeled sections within switch cards
- VLANs deduplicated per target switch, shown once at bottom of card
- Port stats dots reduced from 2px to 1.5px, tighter spacing
- Overall vertical density significantly improved

**Files changed:**
- `app/components/topology/TopologyDetailPanel.vue`
- `.ai/MIGRATION_STATUS.md`

**Verification:**
- `npm run build`: Passes

---

### Phase 21h: Graph Layout + Node Readability (2026-04-18)

**Layout improvements:**
- Reduced ySpacing from 260 to 200 (was briefly 160, too aggressive)
- Empty tiers skipped so nodes don't float with unnecessary gaps
- Lower-tier nodes sorted by primary connected upper node to minimize edge crossings
- Edge margin set to 2 (edges stop at node boundary, no pass-through)
- fitContentMargin adjusted: top 30, bottom/left/right 50

**Node readability:**
- Wider nodes: Core 196x86 (was 176), Dist 176x78 (was 160), Access 164x72 (was 148)
- Increased truncation limits: Core 20 chars, Dist 17, Access 16 (were 16/14/14)
- Model text truncation: Core 30, others 24 (were 26/22)
- Subtle role-tinted background fill per node (Core red 3%, Dist blue 2%, Access green 1.5%)

**Node differentiation:**
- Core accent bar widened to 4px (was 3), opacity 0.8
- Distribution accent bar opacity 0.5 (was 0.4)
- Graduated opacity: Core 0.8 → Dist 0.5 → Access 0.35
- v-network-graph bounding box updated to 196x86 to match largest node

**Files changed:**
- `app/components/topology/TopologyGraph.vue`
- `.ai/MIGRATION_STATUS.md`

**Verification:**
- `npm run build`: Passes

---

### Phase 21i: Edge Type Differentiation + Card Design Alignment (2026-04-18)

**Node card design aligned with switch overview:**
- Identical structure: Name + Badge header, Model subtitle, port footer
- Port footer matches switch cards: "XX PORTS" left, colored dots right, border-t separator
- Removed accent bar and triangle port symbols
- Dynamic name truncation based on node width

**Edge type visual differentiation:**
- Normal links: thin (1.5px), solid, `#555`
- Trunk links (multiple VLANs): medium (2px), dashed `6,3`, `#666`
- LAG links: thick (3px), solid, `#7a8999` (blue-gray)
- Per-edge styling via v-network-graph function configs
- Custom edge data (`isLag`, `isTrunk`) passed to graphEdges
- Legend updated with edge type indicators (solid/dashed/thick lines)

**Files changed:**
- `app/components/topology/TopologyGraph.vue`
- `.ai/MIGRATION_STATUS.md`

**Verification:**
- `npm run build`: Passes

---

### Phase 21j: Mini Layout Polish (2026-04-18)

- fitContentMargin tightened: top 20, bottom 40, sides 40 (was 30/50/50)
- xSpacing 200 (was 210) — slightly denser horizontal layout

**Files changed:**
- `app/components/topology/TopologyGraph.vue`
- `.ai/MIGRATION_STATUS.md`

---

### Phase 21k: Documentation Audit + Release Readiness (2026-04-19)

**README.md:**
- Version badge updated: 0.8.0 → 0.12.0
- Roadmap: Topology, LAG Groups, Print View marked as completed with version tags
- Rack Planning and IPv6 remain as planned

**User Guide (EN + DE):**
- Added full "Network Topology" section (EN: ~60 lines, DE: ~60 lines)
- Covers: overview, graph layout, edge types (Link/Trunk/LAG), detail panel, toolbar, saved positions
- Two new topology screenshots added

**API Reference (EN + DE):**
- Removed stale `GET /api/topology` global endpoint
- Added 4 site-scoped topology endpoints: data, layout GET/PUT/DELETE

**Screenshots:**
- `screenshot-topology.png` — full topology graph view
- `screenshot-topology-detail.png` — topology with detail panel open

**Files changed:**
- `README.md`
- `docs/guide/user-guide.md`
- `docs/de/guide/user-guide.md`
- `docs/api/reference.md`
- `docs/de/api/reference.md`
- `docs/public/images/screenshot-topology.png` (new)
- `docs/public/images/screenshot-topology-detail.png` (new)
- `.ai/MIGRATION_STATUS.md`

---

## Feature Backlog

### Quick Wins
(all completed)

### Medium Effort
- VLAN matrix per switch — which VLANs on which switch, as grid/matrix
- Activity log per entity — "recent changes to this switch" in detail panel
- Bulk import — CSV/JSON upload for switches, VLANs, networks
- Real-time client-side form validation

### Larger Features
- Rack Planning — visual 19" rack view with height-unit positioning
- Dashboard widgets customizable — drag & drop reorder KPI cards
- PDF export — switch front panel as printable PDF
- IPv6 support

### Testing & Quality
- Phase 11: Testing (vitest, unit tests for repositories and IPv4 utils)
- Print view CSS

---

### Phase 12: Nuxt UI v4 Migration — Fixes (2026-03-22)

**USlideover accessibility fixes:**
- Replaced all 6 `#header` slot overrides with native `title`/`description` props
- Eliminates reka-ui `DialogTitle`/`DialogDescription` console warnings
- Files: SwitchPortSidePanel.vue, SwitchPortBulkEditor.vue, vlans/index.vue, networks/[id].vue (x2), switches/[id].vue

**UModal accessibility fix:**
- Added `title`/`description` props to ConfirmDialog.vue

**UTabs v4 slot API migration:**
- Migrated settings.vue from `#item` + `v-if="item.key"` to named slot properties (`#general`, `#account`)
- Migrated data-management.vue from `#item` to named slots (`#backup`, `#export`, `#import`)
- Fixed Settings and Data Management pages showing empty tab content

**USelect v4 empty value fix:**
- Removed `{ label: '---', value: '' }` items from USelect (v4 forbids empty string values)
- Added `placeholder` prop instead for optional fields
- Fixed 500 error on switches/create, networks/create, layout-templates/create/edit
- Files: switches/create.vue, networks/create.vue, networks/[id].vue, layout-templates/create.vue, layout-templates/[id]/edit.vue, SwitchPortBulkEditor.vue

**Form input full-width styling:**
- Added `class="w-full"` to ~60 UInput/USelect/USelectMenu/UTextarea components across 12 files
- All form fields inside UFormField now render full-width consistently
- Files: all create pages, edit slideovers, settings, data-management, port side panel, bulk editor

**Verification:**
- All pages tested: Dashboard, Switches, VLANs, Networks, Layout Templates, Settings, Data Management
- All create pages render correctly with full-width form fields
- Port edit slideover, VLAN detail slideover, switch edit slideover all working
- Zero console errors, zero warnings
- `npm run build`: Passes (8.95 MB output)
- `docker compose build --no-cache`: Passes

---

### Phase 23: Switch Detail Lower Section UX (2026-04-19)

**Visual consolidation of the lower section on switch detail page:**
- Legend (Status/Type/Mode), VLANs, LAG chips, and multi-select hint consolidated into one `list-container` card
- "Indicators" label renamed to "Mode" (`legend.mode` i18n key, `legend.access` for Access)
- VLANs moved to own row with VLAN ID + name display
- LAG chips get `truncate max-w-[150px]` on name spans for long names
- Multi-select hint as last row inside legend card, auto-hides when ports are selected
- Multi-select hint text updated: "Mehrfachauswahl: Strg/Cmd + Klick auf Ports"
- Port Table collapsible upgraded to card with status metadata (up/down/disabled counts in header)
- Recent Activity collapsible upgraded to card with entry count + latest timestamp in header
- Both collapsibles get `border-t` separator between header and content when expanded
- All three cards share `list-container rounded-lg bg-default` visual style
- Trunk box-shadow uses `var(--color-default)` for dark/light mode compatibility

**Bug fix:**
- `usedVlans` computed in `SwitchPortGrid.vue` now collects `access_vlan` and `tagged_vlans` in addition to `native_vlan`

**i18n:**
- New keys: `legend.mode`, `legend.access`, `switches.portTable.portsCount`, `switches.portTable.upCount/downCount/disabledCount`, `switches.activity.entriesCount`, `switches.activity.latest`
- Updated: `switches.ports.multiSelectHint`
- Pluralization support for port/entry counts

**Files changed:**
- `app/components/switch/SwitchPortGrid.vue` — legend card consolidation, usedVlans fix
- `app/components/switch/SwitchPortTable.vue` — card style, portStats, metadata header
- `app/pages/sites/[siteId]/switches/[id].vue` — activity card, spacing adjustments
- `i18n/locales/de.json`, `i18n/locales/en.json` — new and updated keys

**Verification:**
- `npm run build`: Passes (8.55 MB output)

---

### Phase 23b: Documentation Update (2026-04-20)

**VitePress documentation audit and refresh:**
- Updated 7 screenshots to reflect current UI (switch detail with card layout, LAG highlight, switches list with favorites, dashboard, sites, subnet calculator)
- Added missing documentation sections: Sites Management, Subnet Calculator, Favorite Switches
- Updated switch detail description to cover new legend card, port table card with status metadata, activity card with latest timestamp
- Fixed bulk port editing instruction: "Shift or Ctrl" → "Ctrl (or Cmd on Mac)"
- Updated LAG legend description to reflect card-based layout
- Referenced previously unused screenshots (sites, subnet-calculator) in user guide
- All changes applied to both EN and DE user guides

**Files changed:**
- `docs/guide/user-guide.md` — 3 text updates + 3 new sections
- `docs/de/guide/user-guide.md` — same changes in German
- `docs/public/images/screenshot-switch-detail.png` — replaced
- `docs/public/images/screenshot-lag-portgrid.png` — replaced
- `docs/public/images/screenshot-lag-highlight.png` — replaced
- `docs/public/images/screenshot-switches.png` — replaced
- `docs/public/images/screenshot-dashboard.png` — replaced
- `docs/public/images/screenshot-sites.png` — replaced
- `docs/public/images/screenshot-subnet-calculator.png` — replaced

**Verification:**
- All 13 referenced screenshots match current UI
- No broken image paths
- No console errors
- EN and DE content structurally identical

### Phase 24: Secure VLAN Port Assignment — Design (2026-04-20)

**Design/Planning phase — no code changes yet.**

Goal: Safer VLAN assignment to switch ports with explicit switch-VLAN configuration.

**Key design decisions:**
- New `configured_vlans: number[]` field on Switch type
- Grouped VLAN selector: "Configured on this switch" (selectable) + "Other site VLANs" (disabled by default)
- Override toggle "Add VLAN to switch" enables selecting unconfigured VLANs
- One-time Nitro server plugin for data migration (no lazy read side-effects)
- Atomic operations: switch config + port assignment in single write
- VLAN removal with port cleanup: full UI flow with per-port decisions for access_vlan/native_vlan
- Consistent HTTP error semantics (422/404/409)
- Direct switch-VLAN management API route

**Spec document:** `docs/superpowers/specs/2026-04-20-vlan-port-assignment-design.md`

**Status:** Spec v6 final (all reviews resolved), awaiting implementation.

**v6 additions (follow-up review 2026-04-22, pass 2):**
- Bulk-Port-Update: explicit `expected_updated_at` in schema, check once at start, all-or-nothing semantics
- Remove/remove_confirmed limited to single VLAN-ID for v1 (multi-VLAN as follow-up)
- Replacement VLAN validated against post-remove state of configured_vlans
- Activity action types (`add_configured_vlans`, `remove_configured_vlans`) + frontend formatting in implementation plan
- Bulk atomicity: all ports validated before any write, no partial updates

**v5 additions (follow-up review 2026-04-22):**
- All-or-nothing batch semantics for add/remove vlan_ids arrays
- Completeness invariant for remove_confirmed: port_cleanup must exactly match requires_decision
- 2-step remove bound to concurrency: 409 analysis returns current_updated_at, confirm sends expected_updated_at
- Migration normalizes existing but invalid configured_vlans arrays (duplicates, out-of-range, unsorted)

**v4 additions (review findings):**
- Optimistic concurrency sharpened: LAG-sync excluded, response returns `updated_at` for follow-up requests
- `configured_vlans` removed from generic switch schemas, only via dedicated routes/internal default
- 404/409 made consistent (deleted VLAN = 404 everywhere)
- Dedicated repository method `applyPortVlanUpdate(...)` instead of generic update
- `configured_vlans` invariant: deduplicated, sorted, valid IDs after every write
- Activity logging defined for all configured-vlans operations

**v3 additions:**
- Optimistic concurrency via `expected_updated_at` for clean 404/409 distinction
- Idempotent start migration with logging
- Explicit null-behavior rules for access_vlan/native_vlan
- LAG-Sync consciously deferred to follow-up feature

---

## History

### Phase 0 — Documentation & Planning (2026-03-16)
- Created all SPEC documents
- Updated CLAUDE.md, STRATEGY.md, ARCHITECTURE.md
