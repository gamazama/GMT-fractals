# Per-Feature Reset Button — Feasibility

**Status**: Research complete. Build recommendation: **GO**.
**Drafted**: 2026-05-25
**Effort**: S (~4h)

## Data path

Canonical default per param lives in `ParamConfig.default` (each feature's `features/*/index.ts`). The auto-generated `applyPresetState()` falls back to `config.default` for any missing keys. Formula-level `defaultPreset.features[featureId]` overrides exist for scene-loading but are NOT the authority for "reset to feature defaults" — using DDFS canonical defaults keeps reset semantics distinct from Load Scene.

## Reset mechanism + which params

Each feature has an auto-generated `set${FeatureId}` setter (see `createFeatureSlice.ts:83`) accepting a batch update. Reset = build a `{paramKey: config.default}` map for all params except those with `noReset: true`, then call the setter once. The existing flag `ParamConfig.noReset` (already used on e.g. `aoMaxSamples`, `aoStochasticCp`) excludes those keys from the reset.

**Compile-flagged params**: reset DOES affect them. The existing `onUpdate: 'compile'` event path queues a rebuild automatically. This is the right behavior — reset is "make this feature look default" and that includes compile state.

**History**: automatic. Multi-param setter calls are captured as a single transaction by `endParamTransaction()` (`historySlice.ts:159`). Undo restores pre-reset state in one step.

## UX placement

**Recommendation**: small reset-arrow icon at the right side of each feature panel section's header (in `AutoFeaturePanel.tsx`). Mockup:

```
[AO Icon] Ambient Occlusion              [↻]
─────────────────────────────────────────────
  AO Intensity     [slider]            0.50
  AO Spread        [slider]            0.10
  ...
```

Alternatives considered:
- Right-click context menu (`data-help-id`): hidden, discovery friction.
- Toggle-button-adjacent: conflicts semantically with enable/disable.

The header-icon placement aligns with the "affordance per-feature" mental model.

## Edge cases

| Case | Handling |
|------|----------|
| `noReset: true` params | Excluded from reset (already in DDFS schema). |
| Formula `defaultPreset` overrides | Ignored. Use `ParamConfig.default`. Distinct semantics from Load Scene. |
| Features with non-param state (arrays — lights, animations) | Out of scope for v1. Add per-feature custom reset action later if needed. |
| Interdependent defaults | Use `ParamConfig.default` as-is. `onSet` hooks fire during the batched setter call, so cascades work. |
| Confirmation dialog | Not required. Undo covers it; one-click + undo if wrong is acceptable UX. |

## Effort + risks

**Effort: S (~4 hours).** Add reset handler + button in AutoFeaturePanel header. ~30 lines React + button styling. No new state machinery — feature setter, history, and config event plumbing already exist.

**Key risks**:
1. `noReset` audit — verify existing usage in ao/index.ts, geometry/index.ts is correct; add to other features if they have analogous "don't clobber" params.
2. Compile-param reset triggering unexpected rebuilds — test that a reset of a compile-mode feature (e.g. toggles) queues the rebuild correctly via the existing event path.
3. History integration — spot-check undo on a compiled-mode feature reset captures the transaction correctly.

## Recommendation

**GO.** Design is sound, integrates cleanly with existing infrastructure. Pure UI work + a loop over `feature.params`. No protocol or schema changes needed. Could ship as a standalone PR independent of New Scene work.
