# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains the Nuxt frontend: routes in `app/pages`, shared UI in `app/components`, layouts in `app/layouts`, and helpers in `app/composables` and `app/utils`.
- `server/` contains the Nitro backend: API handlers in `server/api`, Zod schemas in `server/validators`, storage access in `server/repositories`, and file helpers in `server/storage`.
- `types/` holds shared TypeScript types, `i18n/locales/` holds translations, `public/` holds static assets, and `docs/` contains the VitePress documentation site.
- `tests/` contains unit tests (`*.test.ts`) and Playwright end-to-end tests in `tests/e2e/*.spec.ts`.
- Persisted app data lives in `./data` locally and `/app/data` in containers. Keep direct file access inside `server/repositories`.

## Build, Test, and Development Commands
- `npm run dev` starts the app locally on port `3000`.
- `npm run build` creates the production build; `npm run preview` serves that build locally.
- `npm run typecheck` runs Nuxt type checking in strict TypeScript mode.
- `node --import tsx --test tests/*.test.ts` runs the unit tests used in CI.
- `npx playwright test` runs browser tests; start the app first with `npm run dev`.
- `npm run docs:dev` and `npm run docs:build` run the docs site from `docs/`.
- `docker compose up --build` is the quickest container-level verification pass.

## Coding Style & Naming Conventions
- Match the existing style: 2-space indentation, single quotes, and no semicolons.
- Prefer Vue SFCs with `<script setup lang="ts">`.
- Use PascalCase for Vue components such as `AppHeader.vue`, and camelCase for TypeScript modules such as `switchRepository.ts`.
- Keep UI text, comments, and documentation in English.
- No dedicated lint or format script is checked in, so keep changes consistent with nearby files and finish with `npm run typecheck`.

## Testing Guidelines
- Add unit tests for pure logic and repository behavior in `tests/*.test.ts`.
- Add Playwright coverage for user flows and regressions in `tests/e2e/*.spec.ts`; reserve `*.setup.ts` for shared setup like auth state.
- Use behavior-focused names such as `ipv4.test.ts` and `crud-switches.spec.ts`.

## Commit & Pull Request Guidelines
- Follow the conventional commit style already used here: `feat(device): ...`, `fix(auth): ...`, `chore: ...`.
- Keep commits scoped and imperative; include the domain when it adds clarity.
- PRs should describe user-visible changes, list verification steps, link related issues, and include screenshots for UI changes.
- Update `docs/` and relevant locale files when routes, APIs, or user-facing text change.
