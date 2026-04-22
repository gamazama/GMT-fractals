/**
 * FractalToyApp — the root React component for the Fractal Toy add-on.
 *
 * At 1a this is a scaffold placeholder. Subsequent commits wire in:
 *   1b  FractalEngine canvas mount (inside a ViewportArea overlay)
 *   1c  AutoFeaturePanel for the Mandelbulb feature
 *   1d  Camera feature + panel
 *   1e  Lighting feature + panel
 *
 * Once polished, this component's shape mirrors App.tsx — engine chrome
 * (viewport area, docks, context menu, loading screen) with the
 * raymarched fractal canvas slotted into the viewport.
 */

import React from 'react';

export const FractalToyApp: React.FC = () => {
    return (
        <div className="fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden flex flex-col items-center justify-center font-mono">
            <div className="text-cyan-400 text-xl mb-2 tracking-wide">Fractal Toy</div>
            <div className="text-gray-500 text-xs mb-8">
                scaffolding — commit 1a. FractalEngine lands in 1b, Mandelbulb in 1c.
            </div>
            <div className="text-[10px] text-gray-700 max-w-md text-center leading-relaxed">
                The second live consumer of the gmt-engine plugin surface.
                Proves the shader pipeline (ShaderBuilder.addSection escape
                hatch) and DDFS-driven raymarching on the extracted engine.
            </div>
        </div>
    );
};
