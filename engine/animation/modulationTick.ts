/**
 * Canonical modulation tick.
 *
 * Registers into TickRegistry's ANIMATE phase. Each frame:
 *   1. Reset ModulationEngine's offset buffer
 *   2. Update LFO oscillators from the store's `animations` array
 *   3. Apply rule-based modulations (audio / LFO chains) from any
 *      registered modulation feature
 *   4. Combine resolved offsets with base DDFS values → liveModulations
 *      map in the store
 *
 * Apps consume liveModulations wherever they push state to their render
 * engine: read `liveModulations[targetKey]` first, fall back to the
 * base value from the DDFS slice. This is how ALL continuous drivers
 * (auto-orbit, audio-reactive, webcam-reactive, LFO modulation) feed
 * DDFS params without each feature having to own its own RAF tick.
 *
 * Generic — no GMT-specific hardcoding. Target keys follow dotted
 * paths (`feature.param.sub`) which navigate the store root to find
 * the base value. Works for any DDFS param whose type exposes a
 * scalar-per-component path (float, int, vec2 via .x/.y/.z).
 */

import { registerTick, TICK_PHASE } from '../TickRegistry';
import { useFractalStore } from '../../store/fractalStore';
import { modulationEngine } from '../../features/modulation/ModulationEngine';

let _unregister: (() => void) | null = null;

/** Navigate store state by dotted path; returns the numeric leaf or 0. */
const readBase = (state: any, path: string): number => {
    const parts = path.split('.');
    let v: any = state;
    for (const p of parts) {
        if (v == null) return 0;
        v = v[p];
    }
    return typeof v === 'number' ? v : 0;
};

export const installModulation = () => {
    if (_unregister) return;

    _unregister = registerTick('engine.modulation', TICK_PHASE.ANIMATE, (delta) => {
        const state = useFractalStore.getState() as any;

        const animations = state.animations ?? [];
        const modulation = state.modulation;
        const hasOscillators = animations.length > 0;
        const hasRules = (modulation?.rules?.length ?? 0) > 0;

        if (!hasOscillators && !hasRules) {
            // Nothing to do. Clear any lingering liveModulations so
            // consumers fall back to base DDFS values cleanly.
            if (Object.keys(state.liveModulations ?? {}).length > 0) {
                state.setLiveModulations({});
            }
            return;
        }

        // Step 1-3: drive the ModulationEngine.
        modulationEngine.resetOffsets();
        modulationEngine.updateOscillators(animations, performance.now() / 1000, delta);
        if (hasRules) modulationEngine.update(modulation.rules, delta);

        // Step 4: combine offsets with base values.
        const offsets = modulationEngine.offsets;
        const liveModulations: Record<string, number> = {};
        for (const [targetKey, offset] of Object.entries(offsets)) {
            liveModulations[targetKey] = readBase(state, targetKey) + offset;
        }

        // Commit to the store so subscribers (and save/load) see it.
        state.setLiveModulations(liveModulations);
    });
};

export const uninstallModulation = () => {
    if (_unregister) { _unregister(); _unregister = null; }
};
