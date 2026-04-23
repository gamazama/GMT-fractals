/**
 * FluidToyApp — root React component for the engine-native Fluid Toy.
 *
 * At 3a this is a scaffold placeholder. Subsequent commits:
 *   3b  FluidEngine mounted inside <ViewportFrame>, canvas subscribes
 *       to canvasPixelSize × qualityFraction for adaptive sim resolution.
 *   3c  Julia feature panel auto-renders in right dock via Dock +
 *       applyDefaultPanelLayout.
 *   3d  Dye feature panel (gradient editor renders automatically from
 *       DDFS gradient-type param).
 *   3e  FluidSim + SceneCamera panels.
 *   3f  Pointer/brush/particle interaction layer on top of the canvas.
 *   3g  Save/load UI using SceneFormat helpers.
 *   3h  Julia-c orbit via AnimationEngine tracks.
 */

import React from 'react';

export const FluidToyApp: React.FC = () => {
    return (
        <div className="fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden flex flex-col items-center justify-center font-mono">
            <div className="text-cyan-400 text-xl mb-2 tracking-wide">Fluid Toy</div>
            <div className="text-gray-500 text-xs mb-8">
                scaffolding — commit 3a. FluidEngine + ViewportFrame in 3b.
            </div>
            <div className="text-[10px] text-gray-700 max-w-md text-center leading-relaxed">
                Engine-native port of toy-fluid — DDFS features, viewport plugin,
                SceneFormat save/load, AnimationEngine keyframes, AdvancedGradientEditor.
                Original prototype at /toy-fluid.html stays untouched as reference.
            </div>
        </div>
    );
};
