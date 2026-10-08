/**
 * deep-zoom/components/DepthReadout.tsx - the depth instrument on the picture.
 *
 * A HUD item (`hud.register` id `deep-zoom.depth`, top-left, in main.tsx): the depth to three
 * digits, how many decades are left above the 1e-77 floor, the magnification, the speed along the
 * scale while moving, the yardstick passed, a line past 1e-50 and at the floor, the dive in
 * flight with Stop, and the "Dive to 1e-" field.
 *
 * It reads the telemetry store (8 samples a second). Each selector returns a string or number
 * already rounded for display, so React re-renders only when what is printed changes. The speed
 * is worked out from successive samples in an effect and stored the same way.
 *
 * Shown unless Overlays is None (`dzInspect.overlays`); the top-bar chip keeps the depth on screen
 * then. The last line is the fly speed (surface-distances a second; the wheel on the picture
 * changes it).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { subscribeTelemetry, useDzTelemetry } from '../host/telemetry';
import { overlaysFromIndex } from '../features/inspect';
import { diveTo, stopDive, useDive } from '../diveControl';
import { useDzNavigation } from '../navigationState';
import {
    FLOOR_EXP, YARDSTICK_NOTE, decadesPerSecond, decadesToFloor, formatDepth, formatDepthCompact, validDepth, yardstickFor,
} from './depthFormat';

/** Below this many decades a second the speed line is not shown. */
const MIN_SHOWN_RATE = 0.05;

/** Decades per second, positive going deeper, rounded to 0.1; 0 while still. */
function useDepthRate(): number {
    const [rate, setRate] = useState(0);
    const prev = useRef<{ depth: number; at: number } | null>(null);
    const smooth = useRef(0);
    useEffect(() => subscribeTelemetry((t) => {
        const now = performance.now();
        if (!t.live || !validDepth(t.depth)) { prev.current = null; return; }
        const before = prev.current;
        prev.current = { depth: t.depth, at: now };
        if (!before) return;
        const seconds = (now - before.at) / 1000;
        if (seconds <= 0 || seconds > 1) return;                    // a gap is not a speed
        const raw = decadesPerSecond(before.depth, t.depth, seconds);
        if (Math.abs(raw) > 20) return;                             // a jump is not a speed either
        smooth.current += (raw - smooth.current) * 0.35;
        const shown = Math.round(smooth.current * 10) / 10;
        setRate((r) => (r === shown ? r : shown));
    }), []);
    return rate;
}

const line = 'text-[10px] leading-tight text-fg-tertiary';
const button = 'h-5 px-1.5 rounded border border-line/20 text-[10px] text-fg-secondary hover:text-fg hover:border-line/40';

export const DepthReadout: React.FC = () => {
    const live = useDzTelemetry((t) => t.live);
    const depthText = useDzTelemetry((t) => formatDepth(t.depth));
    const decades = useDzTelemetry((t) => (validDepth(t.depth) ? decadesToFloor(t.depth).toFixed(1) : ''));
    const magnification = useDzTelemetry((t) => (validDepth(t.depth) ? Math.max(0, -Math.log10(t.depth)).toFixed(1) : ''));
    const yardstick = useDzTelemetry((t) => (validDepth(t.depth) ? yardstickFor(t.depth) : ''));
    const zone = useDzTelemetry((t) => (!validDepth(t.depth) ? '' : t.depth <= 1e-74 ? 'floor' : t.depth < 1e-50 ? 'unchecked' : ''));
    const overlays = useEngineStore((s) => overlaysFromIndex(s.dzInspect?.overlays));
    const dive = useDive((s) => s.dive);
    const rate = useDepthRate();
    const flySpeed = useDzNavigation((s) => (s.flySpeed >= 1 ? s.flySpeed.toFixed(1) : s.flySpeed.toFixed(2)));
    const [exponent, setExponent] = useState('12');

    if (!live || overlays === 'none') return null;

    const target = Math.min(FLOOR_EXP, Math.max(1, Math.round(Number(exponent)) || 0));
    const submit = (e: React.FormEvent): void => {
        e.preventDefault();
        void diveTo(Math.pow(10, -target));
    };

    return (
        <div
            data-dz-depth-readout
            className="m-2 px-2.5 py-2 rounded bg-black/60 border border-line/10 select-none"
        >
            <div data-dz-depth className="font-mono tabular-nums text-[18px] leading-none text-fg" title="Depth: distance from the camera to the surface">
                {depthText}
            </div>
            <div className={`${line} mt-1`}>{decades} decades to the 1e-77 floor</div>
            <div className={line}>magnification 10^{magnification}</div>
            {Math.abs(rate) >= MIN_SHOWN_RATE && (
                <div data-dz-depth-rate className={line}>{rate > 0 ? 'falling' : 'rising'} {Math.abs(rate).toFixed(1)} decades/s</div>
            )}
            {yardstick && <div className={line} title={YARDSTICK_NOTE}>past: {yardstick}</div>}
            {zone === 'unchecked' && <div className={line}>past the checked depth (1e-50)</div>}
            {zone === 'floor' && <div className="text-[10px] leading-tight text-warn">floor 1e-77: the 256-bit reference ends here</div>}
            {dive ? (
                <div data-dz-diving className="mt-1.5 flex items-center gap-2 text-[10px] text-fg-secondary">
                    <span>Diving · {formatDepthCompact(dive.from)} to {formatDepthCompact(dive.target)}</span>
                    <button type="button" className={button} onClick={stopDive}>Stop</button>
                </div>
            ) : (
                <form data-dz-dive-form className="mt-1.5 flex items-center gap-1 text-[10px] text-fg-tertiary" onSubmit={submit}>
                    <label htmlFor="dz-dive-exponent">Dive to 1e-</label>
                    <input
                        id="dz-dive-exponent"
                        data-dz-dive-exponent
                        type="number"
                        min={1}
                        max={FLOOR_EXP}
                        step={1}
                        value={exponent}
                        onChange={(e) => setExponent(e.target.value)}
                        className="w-10 h-5 px-1 rounded bg-line/10 border border-line/15 text-fg font-mono text-[10px]"
                    />
                    <button type="submit" className={button}>Dive</button>
                </form>
            )}
            <div
                data-dz-fly-speed
                className={`${line} mt-1`}
                title="Fly speed: how many times the distance to the surface the camera covers in a second. The wheel on the picture changes it. Flying: W A S D, Space or E up, C or Q down, Shift four times as fast; drag the picture to look."
            >
                fly speed {flySpeed}
            </div>
        </div>
    );
};
