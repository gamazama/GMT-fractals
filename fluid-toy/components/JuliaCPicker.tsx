/**
 * DDFS-native wrapper around MandelbrotPicker. Registered as the
 * component id `julia-c-picker`; mounted into the Julia panel via
 * JuliaFeature.customUI with parentId: 'juliaC'.
 *
 * Reads `sliceState.juliaC` + `sliceState.power` and pushes changes
 * back via `actions.setJulia({ juliaC })`. Gradient LUT is pulled
 * from the DyeGradientLUT cache (populated by the gradient pipeline)
 * when available so the picker's colour mapping tracks the live
 * display palette.
 */

import React, { useMemo } from 'react';
import type { FeatureComponentProps } from '../../components/registry/ComponentRegistry';
import { MandelbrotPicker } from './MandelbrotPicker';

export const JuliaCPicker: React.FC<FeatureComponentProps> = ({ sliceState, actions }) => {
    const juliaC = sliceState.juliaC ?? { x: -0.36303304426511473, y: 0.16845183018751916 };
    const power = sliceState.power ?? 2;

    // TODO: thread the dye's gradient LUT through here when the fluid
    // engine exposes it (currently the LUT lives inside FluidEngine
    // and isn't surfaced to React). The FALLBACK_LUT inside the picker
    // renders a neutral grayscale until then.
    const lut = useMemo<Uint8Array | undefined>(() => undefined, []);

    return (
        <MandelbrotPicker
            cx={juliaC.x}
            cy={juliaC.y}
            power={power}
            gradientLut={lut}
            onChange={(cx, cy) => actions.setJulia({ juliaC: { x: cx, y: cy } })}
        />
    );
};
