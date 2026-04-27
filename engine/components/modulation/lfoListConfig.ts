/**
 * App-overridable defaults for the lifted LfoList widget.
 *
 * Two GMT-isms used to live hardcoded inside LfoList:
 *  - the initial `target` for a freshly-added LFO (`'coreMath.paramA'`)
 *  - the seed for `baseValue` (read from `state.coreMath.paramA`)
 *
 * Both are app-specific. fluid-toy's natural default is `'julia.juliaC_x'`;
 * a brand-new app may not have a sensible default at all and want the
 * user to pick from the dropdown first.
 *
 * Apps call `setLfoListConfig({...})` once at boot (anywhere — only read
 * at LFO-add time, not at render time). Omitted fields fall back to the
 * generic null-safe defaults below.
 */

export interface LfoListConfig {
    /** Default `target` string for a newly-added LFO. If null, the
     *  user must pick a target before the LFO does anything (the
     *  modulation engine no-ops on unknown targets). */
    defaultTarget: string | null;
    /** Resolves the slice path that seeds `baseValue` when an LFO is
     *  first added. Returns 0 if nothing sensible exists.
     *
     *  The default implementation walks `state[featureId][paramId]` if
     *  the target is `'<featureId>.<paramId>'`. Apps with vec-axis
     *  conventions (e.g. `'julia.juliaC_x'`) override this to do the
     *  axis split themselves. */
    seedBaseValue: (target: string, state: any) => number;
    /** Hard cap on simultaneous LFOs. Default 16 — runtime cost is
     *  trivial (one oscillator update per LFO per frame); the cap is
     *  there only as a sanity guard against runaway preset growth.
     *  Set lower for constrained UIs or higher (Infinity) for power
     *  users.
     *
     *  Each row collapses to a single header line by default once a
     *  target is picked, so the visual cost of many LFOs is bounded
     *  by the dock height — see LfoList.tsx. */
    maxLfos: number;
}

const DEFAULT_CONFIG: LfoListConfig = {
    defaultTarget: null,
    seedBaseValue: (target, state) => {
        if (!target.includes('.')) return 0;
        const [fid, pid] = target.split('.');
        const slice = state?.[fid];
        if (!slice) return 0;
        // Vec-axis convention used by AnimationEngine binders (and
        // mirrored by AutoFeaturePanel keyframes): `<vec>_x` etc.
        const vecAxisMatch = pid.match(/^(.+)_(x|y|z|w)$/);
        if (vecAxisMatch) {
            const [, base, axis] = vecAxisMatch;
            const vec = slice[base];
            if (vec && typeof vec === 'object' && axis in vec) return Number(vec[axis]) || 0;
            return 0;
        }
        return Number(slice[pid]) || 0;
    },
    maxLfos: 16,
};

let _config: LfoListConfig = DEFAULT_CONFIG;

/** Override LfoList defaults. Pass partial — omitted fields keep defaults. */
export const setLfoListConfig = (overrides: Partial<LfoListConfig>): void => {
    _config = { ..._config, ...overrides };
};

/** Read the current config. Used by LfoList internals. */
export const getLfoListConfig = (): LfoListConfig => _config;
