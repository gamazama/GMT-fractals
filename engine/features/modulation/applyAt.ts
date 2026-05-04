// Apply oscillator + rule modulations for a given controlled time
// and publish the offsets into `liveModulations`. The 5-line dance
// that previously lived inline in three different runners (demo,
// fluid-toy, app-gmt) plus a helper file each.
//
// Usage from an export runner:
//   applyModulationsAt(time, dt);
//   await yieldToReact();
//   encoder.encodeCanvas(canvas, i);
//
// Apps that also need to push modulation offsets into engine uniforms
// (e.g. app-gmt's worker needs uniform values, not slice reads) call
// this first then run their uniform-mapping pass against
// `modulationEngine.offsets`.

import { useEngineStore } from '../../../store/engineStore';
import { modulationEngine } from './ModulationEngine';

export const applyModulationsAt = (time: number, dt: number): void => {
    const storeState = useEngineStore.getState();
    modulationEngine.resetOffsets();
    modulationEngine.updateOscillators(storeState.animations, time, dt);
    const modSlice = (storeState as { modulation?: { rules?: unknown[] } }).modulation;
    if (modSlice?.rules?.length) {
        modulationEngine.update(modSlice.rules as never[], dt);
    }
    storeState.setLiveModulations({ ...modulationEngine.offsets });
};
