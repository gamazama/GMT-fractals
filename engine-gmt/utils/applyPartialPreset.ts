/**
 * Copy selected feature slices from a source preset into the live store.
 *
 * Single utility powering three consumers:
 * 1. Per-feature Reset button (source = {}, featureIds = [oneFeature] →
 *    forces ParamConfig.default fallback for that feature)
 * 2. New Scene wizard's shading copy (source = picked formula's defaultPreset,
 *    featureIds = ['lighting', 'materials', 'atmosphere', 'ao', 'reflections',
 *    'volumetric'])
 * 3. Future use-case wizard pre-canned configurations
 *
 * Pure composition of existing primitives — featureRegistry + auto-generated
 * `set${FeatureId}` setters + paramTransaction. No new store schema.
 *
 * @see dev/plans/partial-apply-utility.md
 */

import { featureRegistry } from '../../engine/FeatureSystem';
import { useEngineStore } from '../../store/engineStore';
import type { Preset } from '../types/fractal';

export interface ApplyPartialPresetOptions {
  /** Source preset to read feature state from. Missing keys fall back to
   *  each ParamConfig.default — same convention as full Load Scene
   *  (applyPresetState). Pass an empty `{}` or `{features: {}}` to reset
   *  to declared defaults. */
  source: Partial<Preset>;
  /** Feature ids whose slices to copy. Features not listed are untouched. */
  featureIds: string[];
  /** Respect ParamConfig.noReset and skip those keys. Default: true.
   *  Pass false only for explicit "scrub everything" use cases (rare). */
  respectNoReset?: boolean;
  /** When true, also include compile-flagged params (triggers rebuild via
   *  the existing onUpdate:'compile' event path). Default: true.
   *  Pass false to do a runtime-only copy (e.g. cosmetic styling tweak
   *  that shouldn't recompile). */
  includeCompileParams?: boolean;
}

/**
 * Apply a partial preset to the live store. Wraps the whole operation in a
 * single paramTransaction so undo is one step.
 *
 * For each featureId in selection:
 * - Reads `source.features?.[featureId]` (may be undefined).
 * - For each declared param in the feature's DDFS config:
 *   - Skips if param has `noReset: true` and `respectNoReset !== false`.
 *   - Skips if param has `onUpdate: 'compile'` and `includeCompileParams === false`.
 *   - Value = source[paramKey] ?? ParamConfig.default.
 * - Calls the feature's auto-generated `set${FeatureId}` setter with the batch.
 *
 * Does NOT touch:
 * - camera state, animations, audio clips, modular pipeline, lights, savedCameras
 * - features not in `featureIds`
 * - non-param state on the listed features (e.g. arrays)
 */
export function applyPartialPreset(opts: ApplyPartialPresetOptions): void {
  const {
    source,
    featureIds,
    respectNoReset = true,
    includeCompileParams = true,
  } = opts;

  if (featureIds.length === 0) return;

  const store = useEngineStore.getState() as any;
  const sourceFeatures = source.features ?? {};

  // Single transaction → undo collapses to one step.
  store.beginParamTransaction?.();
  try {
    for (const featureId of featureIds) {
      const feat = featureRegistry.get(featureId);
      if (!feat) continue;
      const sourceSlice = sourceFeatures[featureId] ?? {};
      const setterName = `set${featureId.charAt(0).toUpperCase()}${featureId.slice(1)}`;
      const setter = store[setterName] as ((updates: Record<string, any>) => void) | undefined;
      if (typeof setter !== 'function') continue;

      const updates: Record<string, any> = {};
      for (const [paramKey, config] of Object.entries(feat.params)) {
        if (respectNoReset && config.noReset) continue;
        if (!includeCompileParams && config.onUpdate === 'compile') continue;
        const sourceValue = sourceSlice[paramKey];
        updates[paramKey] = sourceValue !== undefined ? sourceValue : config.default;
      }

      if (Object.keys(updates).length > 0) setter(updates);
    }
  } finally {
    store.endParamTransaction?.();
  }
}
