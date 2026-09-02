
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { useEngineStore } from '../../../store/engineStore';
import { modulationEngine } from '../../../engine/features/modulation/ModulationEngine';
import { applyModulationsAt } from '../../../engine/features/modulation/applyAt';
import { classifyModulationTarget } from '../../../engine/features/modulation/targetRouting';
import {
    planModulationTarget,
    flushModulationComposites,
    newCompositeAccumulator,
} from '../../../engine/features/modulation/applyTarget';

/**
 * Apply modulations (LFOs + rules) for a given export time, then push the
 * resulting offsets into the GMT worker's uniform stream. The first part —
 * reset + oscillators + rules + publish to `liveModulations` — is the generic
 * dance shared with demo / fluid-toy and lives in `applyModulationsAt`. This
 * function adds the GMT-specific uniform-mapping pass on top so the worker
 * (which doesn't read slices directly) sees per-target uniform values.
 *
 * @assumption The dispatch is `planModulationTarget` — the SAME function
 *   AnimationSystem's tick runs. This file used to carry its own copy of the
 *   branch chain, and every drift between the two was an export that disagreed
 *   with the preview: vec axes outside `coreMath`/`geometry` were dropped, each
 *   vec axis overwrote the previous one, `postRot`/`worldRot` were ignored, and
 *   a julia axis modulated to exactly 0 was replaced by its base. Guarded by
 *   `debug/test-modulation-parity.mts`. @see docs/adr/0109-one-modulation-dispatcher.md
 *
 * Differences from the live tick are ONLY in execution, never in dispatch:
 * uniforms go straight to `engine.setUniform` (no worker-bridge event hop, no
 * ownership tracking — nothing else writes during an export), and there is no
 * recording or removed-target cleanup, since an export walks the offsets that
 * exist at one instant.
 */
export function applyExportModulations(time: number, dt: number) {
    // Generic prelude: oscillators + rules → liveModulations.
    applyModulationsAt(time, dt);

    // Rebuilt from the offsets `applyModulationsAt` just published.
    engine.modulations = {};

    const storeState = useEngineStore.getState() as unknown as Record<string, any>;
    const offsets = modulationEngine.offsets;
    const composites = newCompositeAccumulator();

    for (const targetKey of Object.keys(offsets)) {
        const offset = offsets[targetKey];
        if (Math.abs(offset) < 0.000001) continue;

        const routing = classifyModulationTarget(targetKey, storeState);
        const plan = planModulationTarget(targetKey, offset, storeState, routing, composites);

        for (const u of plan.uniforms) engine.setUniform(u.key, u.value, u.noAccumReset);
        for (const [k, v] of plan.engineMods) engine.modulations[k] = v;
    }

    for (const u of flushModulationComposites(composites, storeState)) {
        engine.setUniform(u.key, u.value, u.noAccumReset);
    }
}
