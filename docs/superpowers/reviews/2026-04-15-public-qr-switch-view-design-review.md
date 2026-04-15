# Review: Public QR Switch View Design

Reviewed spec: `docs/superpowers/specs/2026-04-15-public-qr-switch-view-design.md`
Review date: `2026-04-15`

## Summary

The spec is now very close and no longer has the earlier contract blockers around `units`, VLAN prop types, legend behavior, or filter ambiguity. One medium correctness issue remains around synthetic public port IDs.

## Findings

### Medium

1. The spec still overstates the safety of synthetic public port IDs based on `"{unit}-{index}"`.
   - Spec: [2026-04-15-public-qr-switch-view-design.md](/home/ezswm-claude/docs/superpowers/specs/2026-04-15-public-qr-switch-view-design.md:98), [2026-04-15-public-qr-switch-view-design.md](/home/ezswm-claude/docs/superpowers/specs/2026-04-15-public-qr-switch-view-design.md:115), [2026-04-15-public-qr-switch-view-design.md](/home/ezswm-claude/docs/superpowers/specs/2026-04-15-public-qr-switch-view-design.md:307)
   - Current code: [layoutTemplateSchemas.ts](/home/ezswm-claude/server/validators/layoutTemplateSchemas.ts:8), [layoutTemplateSchemas.ts](/home/ezswm-claude/server/validators/layoutTemplateSchemas.ts:23), [switchRepository.ts](/home/ezswm-claude/server/repositories/switchRepository.ts:101), [SwitchPortGrid.vue](/home/ezswm-claude/app/components/switch/SwitchPortGrid.vue:30)
   - The spec now correctly fixes block IDs by using a guaranteed-unique `blockIndex`, but it still says `port.id = "{unit}-{index}"` is safe because `unit + index` is supposedly unique by existing validation. That part is not true in the current codebase. The layout validators do not enforce non-overlapping block ranges inside a unit, and `generatePortsFromTemplate()` can therefore produce duplicate `unit/index` pairs when template blocks overlap. Since `SwitchPortGrid` keys ports by `port.id`, this is still a real rendering-contract risk. The spec should either:
     - add a validator requirement that port indices must be unique within a unit after template expansion, or
     - switch the synthetic public port ID to a guaranteed-unique derived value such as `"{unit}-{index}-{ordinal}"` or `"p-{ordinal}"`.

## Resolved From Previous Reviews

- `PublicSwitchResponse.units` is now non-null and compatible with `SwitchPortGrid`'s current prop contract.
- `PublicLayoutBlock.id` now uses a guaranteed-unique ordinal-based scheme.
- The `PublicPortList` filter semantics are now explicitly defined.
- VLAN prop compatibility is addressed via `VlanDisplayInfo`.
- Middleware bypass behavior is explicit for both server and client middleware.
- Backup/restore handling is specified with backward compatibility.
- Public legend behavior is now clearly separated from the grid's built-in legend.

## Overall Assessment

Not fully clean yet, but very close. I would not call the spec completely clean until the synthetic public port ID rule is made strictly correct against the actual template validation rules. After that, I would consider it implementation-ready.
