# CLAUDE.md - ezSWM

## Mission

Build a modern NetBox-style infrastructure tool for switch and IP
management.

Scope: - switches - port documentation - switch port visualization -
VLAN-based network documentation - IP allocation management - IP range
management

------------------------------------------------------------------------

## Read first

Before starting any task read:

- docs/STRATEGY.md
- docs/ARCHITECTURE.md
- docs/MIGRATION_STATUS.md

These documents define roadmap, architecture and current state.

------------------------------------------------------------------------

## Non‑Negotiable Rules

This project is a clean start.

Do NOT: - reuse broken prototypes - patch legacy implementations -
refactor unknown code without understanding it

Codebase rules:

-   Prompts may be German
-   Code, comments, UI and documentation must be English
-   Use Nuxt 4 + TypeScript
-   UI built with Nuxt UI Dashboard template
-   No database
-   JSON storage only

Persistent storage path:

/app/data

------------------------------------------------------------------------

## Technology Stack

Use exactly:

-   Nuxt 4
-   TypeScript
-   Nuxt UI
-   Nuxt i18n
-   Tailwind (via Nuxt UI)
-   Docker
-   docker-compose

Dependencies must be pinned.

Do NOT use:

\^ latest

Commit the lockfile.

------------------------------------------------------------------------

## Architecture Rules

-   Only `server/repositories` may access storage
-   JSON writes must be atomic
-   Domain types live in `/types`
-   Storage utilities live in `server/storage`
-   API routes live in `server/api`
-   UI logic stays in `app/`

Follow the architecture described in:

docs/ARCHITECTURE.md

------------------------------------------------------------------------

## UI Layout

The UI must follow the official Nuxt UI dashboard template architecture.

Reference:

https://github.com/nuxt-ui-templates/dashboard

Required structure:

-   sidebar navigation
-   header bar
-   dashboard panels
-   dark mode styling
-   responsive layout

Do NOT create a custom dashboard shell.

------------------------------------------------------------------------

## Working Mode

Always follow this order:

1.  Fix runtime/build errors
2.  Verify stability
3.  Update docs/MIGRATION_STATUS.md
4.  Propose next task
5.  Implement exactly one task

Never implement features while blockers exist.

------------------------------------------------------------------------

## Verification Requirements

Before finishing any stage verify:

npm run dev npm run build docker compose build --no-cache docker compose
up

------------------------------------------------------------------------

## Acceptance Criteria

A stage is complete only if:

-   no client or server console errors exist
-   i18n works correctly
-   JSON persistence works in /app/data
-   Docker build succeeds
-   Docker runtime succeeds
-   MIGRATION_STATUS.md updated

------------------------------------------------------------------------

## References

Project roadmap: docs/STRATEGY.md

Architecture definition: docs/ARCHITECTURE.md

Current implementation status: docs/MIGRATION_STATUS.md
