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
                        ? 'border-ok/40 bg-ok/20 text-ok'
                        : flash === 'empty'
                            ? 'border-warn/40 bg-warn/20 text-warn'
                            : 'border-line/10 bg-surface/80 text-fg-tertiary hover:text-fg hover:bg-line/10'
                }`}
            >
                {flash === 'empty' ? 'no range' : '⊞ Fit gradient'}
            </button>
            {fitted && (
                <button
                    type="button"
                    onClick={reset}
                    title="Clear the Fit anchor (back to absolute log — colours hold, full range)"
                    className="px-2 h-6 rounded text-[10px] border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors"
                >
                    ↺ fit
                </button>
            )}
        </div>
    );
};

export default FitGradientButton;
