/**
 * Single source for snapshotting BrushParams from the live store.
 *
 * Both the per-frame RAF tick (FluidToyApp) and the per-pointer-event
 * splat path (FluidPointerLayer) need the same flattened-and-typed
 * brush snapshot. Keeping the read here removes the duplicate fallback
 * defaults the two readers used to maintain in parallel (which had
 * already drifted on `size` between the two copies).
 */

import { useEngineStore } from '../../store/engineStore';
import { brushModeFromIndex, brushColorModeFromIndex } from '../features/brush';
import { brushHandles } from '../engineHandles';
import { applyLiveMod } from '../../engine/typedSlices';
import type { BrushParams } from './emitter';

/**
 * Read the live brush slice + cached gradient LUT and return a
 * BrushParams snapshot. Each call is a fresh getState() so RAF / pointer
 * events always see the user's current settings.
 *
 * Defaults are belt-and-braces — DDFS's createFeatureSlice hydrates the
 * slice from BrushFeature.params at boot, so missing fields would only
 * appear under genuine runtime corruption.
 */
export const readBrushParams = (): BrushParams => {
    const state = useEngineStore.getState();
    // Brush params are read on the imperative path (per-pointer-event
    // splat + RAF particle tick), so we apply liveModulations here the
    // same way useEngineSync applies them for slice → engine.params.
    // Without this, an LFO targeting brush.size shows its modulation
    // indicator on the slider but the actual splat radius is unchanged.
    const b = applyLiveMod(state.brush, 'brush', state.liveModulations ?? {});
    return {
        mode: brushModeFromIndex(b.mode),
        colorMode: brushColorModeFromIndex(b.colorMode),
        solidColor: [b.solidColor.x, b.solidColor.y, b.solidColor.z],
        gradientLut: brushHandles.ref.current.gradientLut,
        size: b.size,
        hardness: b.hardness,
        strength: b.strength,
        flow: b.flow,
        spacing: b.spacing,
        jitter: b.jitter,
        particleEmitter: b.particleEmitter,
        particleRate: b.particleRate,
        particleVelocity: b.particleVelocity,
        particleSpread: b.particleSpread,
        particleGravity: b.particleGravity,
        particleDrag: b.particleDrag,
        particleLifetime: b.particleLifetime,
        particleSizeScale: b.particleSizeScale,
    };
};
