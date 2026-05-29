# CLAUDE.md - ezSWM

## Mission

Build a modern NetBox-style infrastructure tool for switch and IP
management.

Scope:
- Switch inventory
- Port documentation
- Switch port visualization
- VLAN-based network documentation
- IP allocation management
- IP range management
- Network topology visualization

---

## Read first

Before starting any task read:

- .ai/STRATEGY.md
- .ai/ARCHITECTURE.md
- .ai/MIGRATION_STATUS.md
- .ai/specs/SPEC_DATA_MODEL.md
- .ai/specs/SPEC_BACKEND.md
- .ai/specs/SPEC_FRONTEND.md
- .ai/specs/SPEC_INFRASTRUCTURE.md

These documents define roadmap, architecture, specifications and current state.

---

## Non-Negotiable Rules

This project is a clean start.

Do NOT:
- reuse broken prototypes
- patch legacy implementations
- refactor unknown code without understanding it

Codebase rules:

- Prompts may be German
- Code, comments, UI and documentation must be English
- Use Nuxt 4.x
- UI built with Nuxt UI v4
- No database
- JSON storage only

Persistent storage path:

`/app/data`

---

## Technology Stack

Use exactly:

- Nuxt 4.x
- TypeScript (strict mode)
- Nuxt UI v4
- Nuxt i18n
- Tailwind CSS (via Nuxt UI)
- Zod (request validation)
- bcrypt (password hashing)
- jsonwebtoken (JWT)
- nanoid (ID generation)
- Docker
- docker-compose

Dependencies must be pinned exactly. No `^`, no `~`, no `latest`.

Commit the lockfile.

---

## Versioning

Follow semver for the `version` field in `package.json`:

- **Feature** (new, backwards-compatible functionality) → minor bump (e.g. `0.18.11` → `0.19.0`)
- **Bug fix** → patch bump (e.g. `0.19.0` → `0.19.1`)
- **Breaking change** → major bump

Bump the version in the same PR as the change. Merging to `main` triggers
`.github/workflows/release-tag.yml`, which creates the `v<version>` git tag
and a GitHub release automatically — the `package.json` version is the
single source of truth for the released tag.

Only edit the version in `package.json`. `nuxt.config.ts` reads it from
`process.env.npm_package_version` (and the sidebar reads it from there), so
do not hardcode the version anywhere else.

---

## Git Workflow

- Always work on a feature/bugfix branch — never commit directly to `main`
  (`git checkout -b feat/<name>` or `fix/<name>`). Merge only after approval.
- Do not create commits automatically. Commit and push only when the user
  asks; after finishing changes + tests, stop and report. (A user may
  authorize batch commits up front, e.g. for plan execution.)

---

## Architecture Rules

- Only `server/repositories` may access storage
- JSON writes must be atomic (write temp file → rename)
- Domain types live in `types/`
- Storage utilities live in `server/storage`
- Zod validators live in `server/validators`
- API routes live in `server/api`
- UI logic stays in `app/`
- When adding a searchable field to an entity, also update global search:
  `server/api/search.get.ts` (filter logic) and
  `app/components/layout/AppHeader.vue` (result display)

Follow the architecture described in:

- .ai/ARCHITECTURE.md
- .ai/specs/SPEC_BACKEND.md

---

## UI Layout

The UI follows a dashboard-style layout built with Nuxt UI v4.

Required structure:

- Sidebar navigation
- Header bar (search, user menu, theme toggle)
- Breadcrumb navigation
- Dashboard panels
- Dark mode (default)
- Fully responsive (desktop, tablet, smartphone)

Do NOT create a custom dashboard shell.

---

## Known UI Gotchas

- Nuxt UI v4 `USelect` does not accept empty-string option values — the
  dropdown fails to open on some devices (notably iPad). Use sentinel values
  like `_automatic` / `_no_change` and convert them back to `null`/`undefined`
  on save. (Applies to existing instances; keep new ones consistent.)

---

## Documentation

After completing a feature, update in the same PR:

- `docs/guide/user-guide.md` (English) and `docs/de/guide/user-guide.md` (German)
- `.ai/MIGRATION_STATUS.md` — add a new phase entry

---

## Working Mode

Always follow this order:

1. Fix runtime/build errors
2. Verify stability
3. Update .ai/MIGRATION_STATUS.md
4. Propose next task
5. Implement exactly one task

Never implement features while blockers exist.

---

## Verification Requirements

Before finishing any stage verify:

```bash
pnpm dev
pnpm build
docker compose -f compose.dev.yaml build --no-cache
docker compose -f compose.dev.yaml up
```

Package manager: **pnpm** (workspace at root, `docs/` is a workspace
member). Dependency installs use `pnpm install --frozen-lockfile`.
`.npmrc` enforces `minimum-release-age=10080` (1 week) — new packages
younger than that won't resolve, this is intentional supply-chain
protection.

Compose files: `compose.yaml` pulls the released GHCR image (end-user
default). `compose.dev.yaml` builds locally — that's the one to use
when verifying Dockerfile/build changes.

---

## Acceptance Criteria

A stage is complete only if:

- No client or server console errors exist
- i18n works correctly
- JSON persistence works in `/app/data`
- Docker build succeeds
- Docker runtime succeeds with healthcheck
- MIGRATION_STATUS.md updated

---

## References

- Project roadmap: .ai/STRATEGY.md
- Architecture definition: .ai/ARCHITECTURE.md
- Current implementation status: .ai/MIGRATION_STATUS.md
- Data model specification: .ai/specs/SPEC_DATA_MODEL.md
- Backend specification: .ai/specs/SPEC_BACKEND.md
- Frontend specification: .ai/specs/SPEC_FRONTEND.md
- Infrastructure specification: .ai/specs/SPEC_INFRASTRUCTURE.md
