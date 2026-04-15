# Review: Keyboard Shortcuts Plan

Reviewed plan: `docs/superpowers/plans/2026-04-08-keyboard-shortcuts.md`
Review date: `2026-04-09`

## Summary

No blocking findings in the current revision. The earlier issues around Playwright prerequisites, fragile selectors, over-broad `default.vue` replacement, and MIGRATION_STATUS consistency are addressed. What remains are minor execution-quality nits plus one explicit residual risk: the defensive priority-order branch is intentionally left without E2E coverage.

## Findings

### Low

1. Task 1 temporarily references `dismissSearch` before the plan defines it.
   - Plan: `docs/superpowers/plans/2026-04-08-keyboard-shortcuts.md:43-70`, `docs/superpowers/plans/2026-04-08-keyboard-shortcuts.md:94-117`
   - Step 1 rewires `@keydown.escape` to `dismissSearch`, but the function is only added in Step 3. The task still converges to a valid state before verification, so this is not a blocker, but it does mean the intermediate state is temporarily invalid. Reordering Step 3 before Step 1 would make the task cleaner.

2. The task boundary is slightly blurry in Task 1.
   - Plan: `docs/superpowers/plans/2026-04-08-keyboard-shortcuts.md:37-132`
   - Task 1 is framed as "Add test infrastructure", but it also introduces real behavior refactoring (`dismissSearch`, dismiss-path deduplication, `defineExpose`) and touches `app/layouts/default.vue`. That is acceptable, but the task title understates the scope.

3. The defensive priority-order branch remains untested by design.
   - Plan note: `docs/superpowers/plans/2026-04-08-keyboard-shortcuts.md:27-33`
   - Implementation branch: `docs/superpowers/plans/2026-04-08-keyboard-shortcuts.md:255-270`
   - The plan now explicitly documents that search and mobile-sidebar states are not simultaneously user-reachable, so the lack of an E2E test is reasonable. The tradeoff is that the "search first, sidebar second" branch remains unverified and would rely on manual review if future layout changes make that state reachable.

## Resolved From Previous Review

- Playwright prerequisites are now explicit.
- Search and sidebar tests now use dedicated `data-testid` hooks instead of generic CSS selectors.
- The unreachable combined-state priority E2E test was removed and replaced with a documented note.
- The `default.vue` implementation task now uses targeted edits instead of full-file replacement.
- MIGRATION_STATUS header consistency and insertion point are now explicitly handled.

## Verified Commands

- `npm run typecheck`
  - Exit code: `0`
  - Current environment still prints the pre-existing `vue-router/volar/sfc-route-blocks` resolution warning noted in the plan.

- `npm run build`
  - Exit code: `0`
  - Current environment still ends successfully with `Build complete!`

## Overall Assessment

The plan is execution-ready. The remaining points are polish rather than blockers.
