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

- docs/STRATEGY.md
- docs/ARCHITECTURE.md
- docs/MIGRATION_STATUS.md
- docs/specs/SPEC_DATA_MODEL.md
- docs/specs/SPEC_BACKEND.md
- docs/specs/SPEC_FRONTEND.md
- docs/specs/SPEC_INFRASTRUCTURE.md

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
- Use Nuxt 3.x with `compatibilityVersion: 4`
- UI built with Nuxt UI v2 Dashboard template
- No database
- JSON storage only

Persistent storage path:

`/app/data`

---

## Technology Stack

Use exactly:

- Nuxt 3.x (with `compatibilityVersion: 4`)
- TypeScript (strict mode)
- Nuxt UI v2
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

## Architecture Rules

- Only `server/repositories` may access storage
- JSON writes must be atomic (write temp file → rename)
- Domain types live in `types/`
- Storage utilities live in `server/storage`
- Zod validators live in `server/validators`
- API routes live in `server/api`
- UI logic stays in `app/`

Follow the architecture described in:

- docs/ARCHITECTURE.md
- docs/specs/SPEC_BACKEND.md

---

## UI Layout

The UI must follow the official Nuxt UI v2 dashboard template architecture.

Reference:

https://github.com/nuxt-ui-templates/dashboard

Required structure:

- Sidebar navigation
- Header bar (search, user menu, theme toggle)
- Breadcrumb navigation
- Dashboard panels
- Dark mode (default)
- Fully responsive (desktop, tablet, smartphone)

Do NOT create a custom dashboard shell.

---

## Working Mode

Always follow this order:

1. Fix runtime/build errors
2. Verify stability
3. Update docs/MIGRATION_STATUS.md
4. Propose next task
5. Implement exactly one task

Never implement features while blockers exist.

---

## Verification Requirements

Before finishing any stage verify:

```bash
npm run dev
npm run build
docker compose build --no-cache
docker compose up
```

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

- Project roadmap: docs/STRATEGY.md
- Architecture definition: docs/ARCHITECTURE.md
- Current implementation status: docs/MIGRATION_STATUS.md
- Data model specification: docs/specs/SPEC_DATA_MODEL.md
- Backend specification: docs/specs/SPEC_BACKEND.md
- Frontend specification: docs/specs/SPEC_FRONTEND.md
- Infrastructure specification: docs/specs/SPEC_INFRASTRUCTURE.md
