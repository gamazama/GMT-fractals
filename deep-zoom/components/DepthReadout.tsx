/**
 * deep-zoom/components/DepthReadout.tsx - the depth instrument on the picture.
 *
 * A HUD item (`hud.register` id `deep-zoom.depth`, top-left, in main.tsx): the depth to three
 * digits, how many decades are left above the 1e-77 floor, the magnification, the speed along the
 * scale while moving, the yardstick passed, a line past 1e-50 and at the floor, the dive in
 * flight with Stop, and the "Dive to 1e-" field with "Start view" beside it (the camera back to
 * the whole of the formula in force: `jumpStart` in deep-zoom/locations.ts, which says how it
 * differs from the Home key).
 *
 * THE DEPTH IS WHAT IS LOOKED AT (the owner, 2026-10-09: "we lead with the looked at readout"):
 * the distance to what is in the middle of the picture, from `deep-zoom/navigationState.ts`
 * (`depth`, published by the navigation tick 8 times a second). When the nearest surface is not
 * that - it stands more than half a decade nearer, beside or behind the camera - a second line
 * says where it is; when nothing is in the middle of the picture the nearest surface is the
 * headline and the line under it says so. The nearest surface is the telemetry store's `depth`.
 *
 * Each selector returns a string or number already rounded for display, so React re-renders only
 * when what is printed changes. The speed is worked out from successive samples in an effect and
 * stored the same way.
 *
 * Shown unless Overlays is None (`dzInspect.overlays`); the top-bar chip keeps the depth on screen
 * then. The last lines are the fly speed (paces a second; the wheel on the picture changes it)
 * and the pace it is multiplied by at the moment.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { subscribeTelemetry, useDzTelemetry } from '../host/telemetry';
import { overlaysFromIndex } from '../features/inspect';
import { diveTo, stopDive, useDive } from '../diveControl';
import { jumpStart } from '../locations';
import { DZ_MODE_ORBIT, cameraModeOf, useDzNavigation } from '../navigationState';
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
    // The telemetry store is the clock (it is written about 8 times a second whatever the camera
    // does), the navigation store the depth: a depth that has stopped changing must read as 0,
    // and the navigation store says nothing while nothing changes.
    useEffect(() => subscribeTelemetry((t) => {
        const now = performance.now();
        const depth = useDzNavigation.getState().depth;
        if (!t.live || !validDepth(depth)) { prev.current = null; return; }
        const before = prev.current;
        prev.current = { depth, at: now };
        if (!before) return;
        const seconds = (now - before.at) / 1000;
        if (seconds <= 0 || seconds > 1) return;                    // a gap is not a speed
        const raw = decadesPerSecond(before.depth, depth, seconds);
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
    const depthText = useDzNavigation((s) => formatDepth(s.depth));
    const decades = useDzNavigation((s) => (validDepth(s.depth) ? decadesToFloor(s.depth).toFixed(1) : ''));
    const magnification = useDzNavigation((s) => (validDepth(s.depth) ? Math.max(0, -Math.log10(s.depth)).toFixed(1) : ''));
    const yardstick = useDzNavigation((s) => (validDepth(s.depth) ? yardstickFor(s.depth) : ''));
    const zone = useDzNavigation((s) => (!validDepth(s.depth) ? '' : s.depth <= 1e-74 ? 'floor' : s.depth < 1e-50 ? 'unchecked' : ''));
    // The nearest surface, when it is not what is looked at (see the header).
    const isLook = useDzNavigation((s) => s.depthIsLook);
    const lookTenths = useDzNavigation((s) => (validDepth(s.depth) ? Math.round(Math.log10(s.depth) * 10) : NaN));
    const nearestTenths = useDzTelemetry((t) => (validDepth(t.depth) ? Math.round(Math.log10(t.depth) * 10) : NaN));
    const nearestText = useDzTelemetry((t) => formatDepthCompact(t.depth));
    const paceText = useDzNavigation((s) => (validDepth(s.pace) ? formatDepthCompact(s.pace) : ''));
    const orbit = useEngineStore((s) => cameraModeOf(s) === DZ_MODE_ORBIT);
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
            <div
                data-dz-depth
                className="font-mono tabular-nums text-[18px] leading-none text-fg"
                title="Depth: the distance from the camera to what is in the middle of the picture. The fly speed follows it."
            >
                {depthText}
            </div>
            {isLook && lookTenths - nearestTenths > 5 && (
                <div data-dz-nearest className={`${line} mt-1`} title="The nearest surface is not the one in the middle of the picture: it is beside or behind the camera. Flying towards it slows to its distance.">
                    nearest surface {nearestText}
                </div>
            )}
            {!isLook && depthText !== '-' && (
                <div data-dz-nearest className={`${line} mt-1`} title="Nothing is in the middle of the picture (or it has not been reached yet): this is the nearest surface in any direction.">
                    nearest surface; nothing ahead
                </div>
            )}
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
                    <button
                        type="button"
                        data-dz-start-view
                        className={`${button} ml-1`}
                        onClick={jumpStart}
                        title="Start view: the camera goes back to where the whole of this formula is seen from outside (in Julia mode, the whole Julia set). The formula's own settings stay as they are. One undo step, and Backspace comes back to this view. The Home key is another thing: it goes to the view the app started with."
                    >
                        Start view
                    </button>
                </form>
            )}
            <div
                data-dz-mode
                className={`${line} mt-1`}
                title={orbit
                    ? 'Orbit mode. Drag: turn about the point under the pointer. Wheel, or a middle drag up and down: fly along the pointer\'s ray to that point, or back from it. Right drag: move it. Q and E roll; the other fly keys do nothing here. Tab: Fly mode.'
                    : 'Fly mode. W A S D, Space up, C down, Q and E roll, Shift four times as fast; drag the picture to look; the wheel sets the speed. Tab: Orbit mode.'}
            >
                {orbit ? 'orbit' : 'fly'} mode · Tab switches
            </div>
            <div
                data-dz-fly-speed
                className={line}
                title="Fly speed: how many paces the camera covers in a second. The wheel on the picture changes it; the roll of Q and E follows it. Flying: W A S D, Space up, C down, Q and E roll, Shift four times as fast; drag the picture to look."
            >
                fly speed {flySpeed}
            </div>
            {paceText && (
                <div data-dz-pace className={line} title="The pace: the distance the fly speed is multiplied by. It is the nearer of what is looked at and what lies ahead of the move; it falls at once and rises by a limited number of decades a second (Settings, Camera).">
                    pace {paceText}
                </div>
            )}
        </div>
    );
};
