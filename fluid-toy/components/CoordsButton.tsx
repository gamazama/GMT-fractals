/**
 * CoordsButton — copies the exact current view + colour state to the clipboard
 * (and console), mirroring the Gradient Explorer's fractal "Copy coords" button.
 * For bug reports + reproducing a specific spot in a debugging session: paste
 * the JSON back to set center/centerLow/zoom/juliaC/colorMapping/etc.
 */

import React, { useCallback } from 'react';
import { useSlice } from '../../engine/typedSlices';
import { useClipboardCopy } from '../../hooks/useClipboardCopy';
import { useDeepZoomDiag } from '../deepZoom/diagnostics';

export const CoordsButton: React.FC = () => {
    const julia = useSlice('julia');
    const palette = useSlice('palette');
    const deepZoom = useSlice('deepZoom');
    const diag = useDeepZoomDiag();
    const clip = useClipboardCopy(1500);
    const copied = clip.state === 'copied';

    const copy = useCallback(() => {
        const json = JSON.stringify({
            center: [julia.center.x, julia.center.y],
            centerLow: [julia.centerLow?.x ?? 0, julia.centerLow?.y ?? 0],
            zoom: julia.zoom,
            kind: julia.kind === 0 ? 'julia' : 'mandelbrot',
            juliaC: [julia.juliaC.x, julia.juliaC.y],
            power: julia.power,
            colorMapping: palette.colorMapping,
            gradientRepeat: palette.gradientRepeat,
            gradientPhase: palette.gradientPhase,
            deepZoom: deepZoom.enabled,
            autoIter: deepZoom.autoIter,
            iterMul: deepZoom.iterMul,
            deepStats: {
                orbitLength: diag.orbitLength,
                laCount: diag.laCount,
                juliaMs: diag.juliaMs,
            },
        }, null, 0);
        // eslint-disable-next-line no-console
        console.log('[fluid-toy coords]', json);
        void clip.copy(json);
    }, [julia, palette, deepZoom, diag, clip]);

    return (
        <button
            type="button"
            onClick={copy}
            title="Copy the exact view + colour state (center / zoom / juliaC / colorMapping / iter) to the clipboard"
            className={`pointer-events-auto px-2 h-6 rounded text-[10px] border transition-colors ${
                copied
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200'
                    : 'border-white/10 bg-black/40 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
        >
            {copied ? '✓ Copied' : '⧉ Copy coords'}
        </button>
    );
};

export default CoordsButton;
