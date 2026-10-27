# TODO

Short human checklist of the actionable queue. Long-term direction lives in [.ai/STRATEGY.md](.ai/STRATEGY.md); release history in [CHANGELOG/en.md](CHANGELOG/en.md). Update the status here when work changes.

## Open

1. **Switch port miniature in Switch Overview** (user feature, investigation pending).
   - Single switch: show a port miniature. Stack: compact member/port summary with an accessible click-to-expand view of member-labelled miniatures.
   - Must be usable on mobile (no hover-only interaction). Reuse the existing renderer where possible.
   - Starting-point hints: `app/components/switch/SwitchCard.vue`, `app/components/template/TemplateMiniPreview.vue`. Architecture not yet investigated; no effort or data structure is promised.
2. **iPhone UI defects** (reported with three screenshots; reproduction and root causes pending).
   - [ ] Switch overview: search, role filter and view/action controls overlap at phone widths. Review the card action strip, which occupies much of the card heading on touch devices.
   - [ ] IP-address overview: filters have inconsistent widths. The screenshot also shows the first table row partly obscured by the table header; verify scrolling and header positioning.
   - [ ] Port visualization: a dark vertical band remains near the middle while swiping horizontally. Reported in switch details, layout-template previews and the public viewer; investigate shared rendering before applying page-specific fixes.
   - Device family and affected screens are known; capture the iPhone model, iOS/browser versions, viewport and repeatable steps during reproduction. No matching GitHub issue found in the initial search.
   - Do not assume the historical iPad `USelect` empty-string issue (see `AGENTS.md`, closed PoE issue #217) is the same defect. No UI fix has been implemented.

## In progress

- None (no port-miniature implementation started).

## Longer term (not scheduled)

- Discovery Agent, Rack Planning, IPv6: see [.ai/STRATEGY.md](.ai/STRATEGY.md).
- Plugin system: [issue #272](https://github.com/slgfire/ezswm/issues/272), separate backlog, not approved scope.
- Note: some older roadmap items in STRATEGY.md (e.g. the Admin/Viewer roles, export/backup improvements) are already implemented or mostly shipped and are not queued here.

## Completed (brief)

- MCP/OIDC tokens (0.46.0) and the published image; registry fix [PR #329](https://github.com/slgfire/ezswm/pull/329) and docs [PR #330](https://github.com/slgfire/ezswm/pull/330), both merged to `main` (CI 40514021341 success). This does not claim a production deployment.
