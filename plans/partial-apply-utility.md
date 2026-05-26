# Partial-Apply Utility — Spec

**Status**: Spec; not implemented.
**Drafted**: 2026-05-25
**Effort**: S (~3h)

## Why

Three downstream features need to copy a subset of feature state from one source into the live store:

1. **New Scene wizard — shading copy**: user picks formula B as "shading source", we copy B's `defaultPreset.features.{lighting, materials, atmosphere, ao, reflections, volumetric}` into the current scene (replacing those slices, leaving the rest unchanged).
2. **Per-feature Reset** (see `per-feature-reset-feasibility.md`): reset one feature to its declared defaults. Special case of partial-apply where source = "empty preset" (forces ParamConfig.default fallback) and featureIds = [oneFeature].
3. **Future use-case wizard**: pre-canned starting configurations layered over an existing scene.

Each consumer would otherwise reinvent the same plumbing (iterate features, call setters, batch into transaction, fire compile events). One utility avoids that.

## API

```ts
// engine-gmt/utils/applyPartialPreset.ts

import type { Preset } from '../types/preset';

export interface ApplyPartialPresetOptions {
  /** Source preset to read feature state from. Missing keys fall back to
   *  each ParamConfig.default — same convention as full Load Scene
   *  (applyPresetState). Pass an empty `{features: {}}` to reset to
   *  declared defaults. */
  source: Partial<Preset>;
  /** Feature ids whose slices to copy. Features not listed are untouched. */
  featureIds: string[];
  /** Respect ParamConfig.noReset and skip those keys. Default: true.
   *  Pass false only for explicit "scrub everything" use cases (rare). */
  respectNoReset?: boolean;
  /** When true, also include compile-flagged params (triggers rebuild
   *  via the existing onUpdate:'compile' event path). Default: true.
   *  Pass false to do a runtime-only copy (e.g. cosmetic styling tweak
   *  that shouldn't recompile). */
  includeCompileParams?: boolean;
}

/**
 * Apply a partial preset to the live store: copies selected feature
 * slices from `source` into the active state.
 *
 * Semantics:
 * - For each featureId in selection:
 *   - Read `source.features?.[featureId]` (may be undefined).
 *   - For each param in the feature's DDFS declaration:
 *     - Skip if param has `noReset: true` and `respectNoReset !== false`.
 *     - Skip if param has `onUpdate: 'compile'` and `includeCompileParams === false`.
 *     - Value = source[param] ?? ParamConfig.default.
 *   - Call the feature's auto-generated `set${FeatureId}` setter with the batch.
 * - Wraps the whole operation in a single paramTransaction so undo is one step.
 *
 * Does NOT touch:
 * - camera state, animations, audio clips, modular pipeline, lights, savedCameras
 * - features not in featureIds
 * - non-param state on the listed features (e.g. arrays)
 *
 * @returns void. Mutations flow through store setters; the existing
 *   CONFIG event + CompileScheduler picks up compile-flagged changes.
 */
export function applyPartialPreset(opts: ApplyPartialPresetOptions): void;
```

## Implementation sketch (composition of existing pieces)

```ts
// engine-gmt/utils/applyPartialPreset.ts (~50 lines)

import { featureRegistry } from '../../engine/FeatureSystem';
import { useEngineStore } from '../../store/engineStore';

export function applyPartialPreset({
  source,
  featureIds,
  respectNoReset = true,
  includeCompileParams = true,
}: ApplyPartialPresetOptions): void {
  const store = useEngineStore.getState();
  const sourceFeatures = source.features ?? {};

  // Single transaction so undo is one step (historySlice wraps the
  // entire setter sequence below).
  store.beginParamTransaction?.();
  try {
    for (const featureId of featureIds) {
      const feat = featureRegistry.get(featureId);
      if (!feat) continue;
      const sourceSlice = sourceFeatures[featureId] ?? {};
      const setter = (store as any)[`set${featureId[0].toUpperCase()}${featureId.slice(1)}`];
      if (typeof setter !== 'function') continue;

      const updates: Record<string, any> = {};
      for (const [paramKey, config] of Object.entries(feat.params)) {
        if (respectNoReset && config.noReset) continue;
        if (!includeCompileParams && config.onUpdate === 'compile') continue;
        updates[paramKey] = sourceSlice[paramKey] ?? config.default;
      }

      if (Object.keys(updates).length > 0) setter(updates);
    }
  } finally {
    store.endParamTransaction?.();
  }
}
```

## Consumer examples

```ts
// 1. Per-feature reset (Reset button on Lighting panel):
applyPartialPreset({
  source: {}, // forces fallback to ParamConfig.default for all keys
  featureIds: ['lighting'],
});

// 2. New Scene shading copy (user picked AmazingBox as shading source):
const amazingBox = registry.get('AmazingBox');
applyPartialPreset({
  source: amazingBox.defaultPreset,
  featureIds: ['lighting', 'materials', 'atmosphere', 'ao', 'reflections', 'volumetric'],
  // include compile-flagged params so shadows/reflections compile gates flip too
});

// 3. Runtime-only style copy (cosmetic, no recompile):
applyPartialPreset({
  source: pickedFormula.defaultPreset,
  featureIds: ['materials'],
  includeCompileParams: false,
});
```

## What this does NOT do

- **Animation tracks**: out of scope. Tracks bind by `featureId.paramKey`; copying feature slices won't break them (param paths persist), but rewriting the animation sequence is a separate concern.
- **Camera, navigation, optics**: out of scope. These have their own "load" paths.
- **Modular pipeline**: out of scope. `pipeline` is a top-level Preset field, not under `features`.
- **Lights / saved cameras**: out of scope. Arrays of named entities, not feature-slice shaped.
- **Validation**: doesn't check that source's values are within param ranges. Out-of-range values flow through the setter and may visually clamp on render.

## Test plan

- `tsx debug/test-partial-apply.mts` — Node-only sanity check (~30 lines):
  - Mocks store + registers a handful of features
  - Calls `applyPartialPreset` with various source shapes
  - Asserts: only listed feature's slices change; non-listed slices unchanged; defaults fall through for missing keys; noReset keys skipped.
- Manual UI smoke once a consumer exists.

Not snapshot-tested because behavior is purely transactional + store-mutating.

## Edge cases handled

| Case | Behavior |
|------|----------|
| `source.features?.[id]` is `undefined` | All params use `ParamConfig.default` — pure reset semantics. |
| Some keys in source are extra (not in feature's params) | Ignored — only feature-declared params are written. |
| Feature has no setter (mis-registered) | Skip with no error; no state change for that feature. |
| `noReset: true` on a key + key IS in source | Honor noReset by default; skip the key. |
| `onUpdate: 'compile'` key + `includeCompileParams: false` | Skip; runtime params still flow. |
| All features in selection are missing | No-op; no transaction needed (early return acceptable). |

## Open question

- Should `respectNoReset` ALSO be parameterized per featureId? Not for v1 — single bool sufficient for current consumers. If a use case emerges where "reset lighting but preserve materials.noReset", we'd extend then.

## Effort

**S — ~3h.** Single file (~50 lines + types), one test script. No store schema changes. No UI work (that's the consumer's job). All composition of existing primitives: featureRegistry, store setters, paramTransaction.
