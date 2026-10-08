/**
 * deep-zoom/components/DepthScale.tsx - the whole range as one log column on the picture.
 *
 * A viewport overlay: registered as `overlay-depth-scale` and declared by the `camera` feature's
 * `viewportConfig` (type `dom`), so the engine's `<FeatureOverlays />` mounts it - it is not
 * mounted by hand. The column runs from 1e0 at the top to the 1e-77 floor at the bottom, with a
 * tick every ten decades, the three fixed marks of the range (1e-4 perturbation, 1e-50 checked,
 * 1e-77 floor) and a live marker at the current depth. Below 1e-50 the column is fainter; the
 * last three decades are amber. A click dives to that depth.
 *
 * Shown only when Overlays is All (`dzInspect.overlays`). The overlay box ignores the pointer;
 * the column itself takes it. Stacking comes from the overlay host's tier, none set here.
 * Saved places and the recorded flight's span are drawn on it by later stages.
 */
import React from 'react';
import { useEngineStore } from '../../store/engineStore';
import { useDzTelemetry } from '../host/telemetry';
import { overlaysFromIndex } from '../features/inspect';
import { diveTo } from '../diveControl';
import { FLOOR_EXP, RANGE_MARKS, depthAtFraction, formatDepthCompact, scaleFraction, validDepth } from './depthFormat';

const TICKS = [10, 20, 30, 40, 50, 60, 70];
const top = (exp: number): string => `${(exp / FLOOR_EXP) * 100}%`;

export const DepthScale: React.FC = () => {
    const live = useDzTelemetry((t) => t.live);
    // Rounded to a thousandth of the column: the marker moves, React does not re-render per sample.
    const position = useDzTelemetry((t) => (validDepth(t.depth) ? Math.round(scaleFraction(t.depth) * 1000) / 1000 : -1));
    const label = useDzTelemetry((t) => formatDepthCompact(t.depth));
    const overlays = useEngineStore((s) => overlaysFromIndex(s.dzInspect?.overlays));
    if (!live || overlays !== 'all') return null;

    const onClick = (e: React.MouseEvent<HTMLDivElement>): void => {
        const box = e.currentTarget.getBoundingClientRect();
        void diveTo(depthAtFraction((e.clientY - box.top) / box.height));
    };

    return (
        <div
            data-dz-depth-scale
            title="Depth scale, 1e0 to 1e-77. Click a depth to dive to it."
            onClick={onClick}
            className="absolute right-2 top-3 bottom-3 w-14 pointer-events-auto cursor-pointer select-none"
        >
            {/* the column: checked range, unchecked range, the last three decades */}
            <div className="absolute right-0 w-1 rounded-sm bg-line/40" style={{ top: 0, height: top(50) }} />
            <div className="absolute right-0 w-1 bg-line/20" style={{ top: top(50), height: top(FLOOR_EXP - 3 - 50) }} />
            <div className="absolute right-0 w-1 rounded-sm bg-warn/70" style={{ top: top(FLOOR_EXP - 3), bottom: 0 }} />
            {TICKS.map((exp) => (
                <div key={exp} className="absolute right-0 flex items-center gap-1 -translate-y-1/2" style={{ top: top(exp) }}>
                    <span className="font-mono text-[8px] text-fg-dim">1e-{exp}</span>
                    <span className="block w-2 h-px bg-line/40" />
                </div>
            ))}
            {RANGE_MARKS.map((m) => (
                <div key={m.exp} className="absolute right-0 flex items-center gap-1 -translate-y-1/2" style={{ top: top(m.exp) }} title={m.label}>
                    <span className="block w-3 h-px bg-fg-tertiary" />
                </div>
            ))}
            {position >= 0 && (
                <div data-dz-depth-marker className="absolute right-0 flex items-center gap-1 -translate-y-1/2" style={{ top: `${position * 100}%` }}>
                    <span className="font-mono text-[9px] px-1 rounded bg-black/70 text-fg">{label}</span>
                    <span className="block w-3 h-0.5 bg-accent-500" />
                </div>
            )}
        </div>
    );
};
