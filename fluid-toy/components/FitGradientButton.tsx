/**
 * FitGradientButton — "Fit to view" for Iterations-mode (v2) colour. Reads back the current
 * view's iteration range from the engine and anchors the gradient onto it (palette.iterOffset /
 * iterScale), so the visible structure spreads across one gradient sweep. Colours then HOLD again
 * (the anchor is fixed) until re-fit or reset. Mirrors the Gradient Explorer's Fit-to-view.
 *
 * Registered as the `palette-fit` widget (main.tsx) and placed in the Palette panel under a
 * section gated to Iterations + depth-normalized colour.
 */

import React, { useCallback, useState } from 'react';
import { useSlice, setSlice } from '../../engine/typedSlices';
import { appEngine } from '../engineHandles';

// Identity anchor = absolute pivoted log-iteration (1/LREF). Matches FluidEngine defaults.
const IDENTITY_OFFSET = 0;
const IDENTITY_SCALE = 0.125;

export const FitGradientButton: React.FC = () => {
    const palette = useSlice('palette');
    const [flash, setFlash] = useState<'none' | 'ok' | 'empty'>('none');
    const fitted = palette.iterOffset !== IDENTITY_OFFSET || palette.iterScale !== IDENTITY_SCALE;

    const fit = useCallback(() => {
        const res = appEngine.ref.current?.fitIterationRange?.() ?? null;
        if (res) {
            setSlice('palette', { iterOffset: res.offset, iterScale: res.scale });
            setFlash('ok');
        } else {
            setFlash('empty');
        }
        setTimeout(() => setFlash('none'), 1300);
    }, []);

    const reset = useCallback(() => {
        setSlice('palette', { iterOffset: IDENTITY_OFFSET, iterScale: IDENTITY_SCALE });
    }, []);

    return (
        <div className="flex items-center gap-1.5 px-1 py-0.5">
            <button
                type="button"
                onClick={fit}
                title="Fit the gradient to this view's iteration range. Colours then hold until you re-fit or reset."
                className={`px-2 h-6 rounded text-[10px] border transition-colors ${
                    flash === 'ok'
                        ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200'
                        : flash === 'empty'
                            ? 'border-amber-500/40 bg-amber-500/20 text-amber-200'
                            : 'border-white/10 bg-black/30 text-gray-300 hover:text-white hover:bg-white/10'
                }`}
            >
                {flash === 'empty' ? 'no range' : '⊞ Fit gradient'}
            </button>
            {fitted && (
                <button
                    type="button"
                    onClick={reset}
                    title="Clear the Fit anchor (back to absolute log — colours hold, full range)"
                    className="px-2 h-6 rounded text-[10px] border border-violet-500/30 text-violet-200 hover:bg-violet-500/10 transition-colors"
                >
                    ↺ fit
                </button>
            )}
        </div>
    );
};

export default FitGradientButton;
