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
 *   - Values of a COLLECTION whose members come and go (`registerPrefix`): one writer for every id
 *     under a prefix, told the id. The deep zoomer's iteration-schedule rules are the first
 *     (`dzSchedule.<param>.<rule>...`). An exact registration still wins over a prefix, and the
 *     longest matching prefix over a shorter one.
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

/** A writer for every track id that starts with `prefix` (see the header). */
export interface PrefixBinderEntry {
    prefix: string;
    write: (id: string, v: number) => void;
}

const _registry = new Map<string, BinderEntry>();
const _prefixes = new Map<string, PrefixBinderEntry>();

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

    /** Register a writer for every id under a prefix (see the header). Returns an unregister fn;
     *  re-registering a prefix replaces it, as `register` does. */
    registerPrefix(entry: PrefixBinderEntry): () => void {
        _prefixes.set(entry.prefix, entry);
        return () => { if (_prefixes.get(entry.prefix) === entry) _prefixes.delete(entry.prefix); };
    },

    /** Lookup a binder by track id: an exact registration, else the longest matching prefix.
     *  AnimationEngine.getBinder calls this before falling through to its convention-based chain. */
    lookup(id: string): BinderEntry | undefined {
        const exact = _registry.get(id);
        if (exact) return exact;
        let best: PrefixBinderEntry | undefined;
        for (const pe of _prefixes.values()) if (id.startsWith(pe.prefix) && (!best || pe.prefix.length > best.prefix.length)) best = pe;
        return best ? { id, write: (v: number) => best!.write(id, v) } : undefined;
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
        _prefixes.clear();
    },
};

// Dev-console handle, matching the __camera / __animEngine / __store pattern.
if (typeof window !== 'undefined') {
    (window as any).__binders = binderRegistry;
}
