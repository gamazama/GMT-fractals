/**
 * deep-zoom/components/JuliaHere.tsx - one button: "Julia from this place".
 *
 * The classic way from a Mandelbrot-type picture to a Julia set: the point at the centre of the view
 * becomes the constant, Julia mode goes on, and the camera goes to where the whole of that Julia set
 * is seen from outside. One undo step; Back returns to the place. The work, and what it says when it
 * cannot (nothing is looked at, the camera is inside the solid), is `juliaFromThisPlace` in
 * `deep-zoom/locations.ts`; the mode itself is the `dzFormula.juliaMode` row above this button.
 *
 * Pressed while Julia mode is already on it takes the point looked at in the Julia set as the next
 * constant: the same action, on the picture as it stands.
 *
 * Registered as `dz-julia-here` in main.tsx; panels.ts places it on the Formula tab, under Julia.
 * Disabled during a dive (a dive owns the camera) and until a renderer is mounted and ready.
 */
import React from 'react';
import { juliaFromThisPlace } from '../locations';
import { useDive } from '../diveControl';

export const JuliaHere: React.FC = () => {
    const diving = useDive((s) => s.dive !== null);
    return (
        <div data-dz-julia-here className="px-2 pb-2">
            <button
                type="button"
                data-dz-julia-from-here
                disabled={diving}
                title="Take the point at the centre of the view as the Julia constant and show the whole of its Julia set"
                onClick={() => { juliaFromThisPlace(); }}
                className="w-full h-6 px-1 rounded border border-line/20 text-[9px] font-semibold text-fg-secondary hover:text-fg hover:border-line/40 disabled:opacity-40"
            >
                Julia from this place
            </button>
        </div>
    );
};
