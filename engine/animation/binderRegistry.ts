/**
 * @engine/animation — explicit binder registry.
 *
 * Animation tracks write through "binders" — small functions that
 * convert a float interpolated by the animation engine into a store
 * mutation. The bulk of them are derived automatically from the DDFS
 * feature registry (see AnimationEngine.getBinder case 4 and the
 * UNDERSCORE vec convention in trackBinding.ts). This registry is the
 * escape hatch for the rest:
 *
 *   - Composite camera tracks whose write path isn't a simple setter
 *     (GMT's `camera.unified.*` feeds a split-precision scene-offset
 *     event, not a plain assignment).
 *   - Features whose slice setter doesn't follow the `set${FeatureId}`
 *     convention — F6 in the fragility audit.
 *   - Non-feature globals an app wants to animate (tint, debug knobs).
 *
 * Apps call `registerBinder({ id, write })` at install time; the
 * registry is consulted by AnimationEngine *before* any name-inference
 * or convention-based fallback. Re-registering an id replaces the
 * previous entry, matching the topbar/shortcut slot idempotency rule.
 *
 * Rule: the engine never reaches back to ask an app "what's the setter
 * for feature X?". Apps push binders in.
 */

export interface BinderEntry {
    /** Track ID, e.g. `julia.juliaC_x`, `camera.fov`, or a bespoke
     *  app-global like `tint.intensity`. Matches the strings used by
     *  AnimationEngine.scrub(). */
    id: string;
    /** Called each frame with the interpolated float value. */
    write: (v: number) => void;
    /** Optional UI grouping for the track picker (future ParameterSelector work). */
    category?: string;
    /** Optional human label for the timeline / track picker. */
    label?: string;
}

const _registry = new Map<string, BinderEntry>();

export const binderRegistry = {
    /** Register a binder. Returns an unregister fn so install*() teardowns
     *  don't leak. Re-registering the same id replaces the previous entry. */
    register(entry: BinderEntry): () => void {
        _registry.set(entry.id, entry);
        return () => {
            // Only unregister if this exact entry is still the occupant —
            // a later replacement shouldn't be torn down by the original's
            // owner calling its teardown.
            if (_registry.get(entry.id) === entry) _registry.delete(entry.id);
        };
    },

    /** Lookup a binder by track id. AnimationEngine.getBinder calls this
     *  before falling through to its convention-based chain. */
    lookup(id: string): BinderEntry | undefined {
        return _registry.get(id);
    },

    /** Every registered entry. For the track-picker UI, introspection,
     *  and smokes. */
    list(): BinderEntry[] {
        return Array.from(_registry.values());
    },

    /** Reset — only for tests / HMR. Production apps register once at
     *  boot and never clear. */
    clear() {
        _registry.clear();
    },
};

// Dev-console handle, matching the __camera / __animEngine / __store pattern.
if (typeof window !== 'undefined') {
    (window as any).__binders = binderRegistry;
}
