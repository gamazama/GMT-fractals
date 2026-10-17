/**
 * deep-zoom/components/DepthReadout.tsx - the depth instrument on the picture.
 *
 * A HUD item (`hud.register` id `deep-zoom.depth`, top-left, in main.tsx). Three lines (the owner's
 * first screen, STREAMLINE.md stage 4; until 2026-10-17 it was seven): the depth to three digits
 * with the camera mode as a small pill beside it, how many decades are left above the 1e-77 floor,
 * and the "Dive to 1e-" field with Dive and "Start view" (the camera back to the whole of the
 * formula in force: `jumpStart` in deep-zoom/locations.ts, which says how it differs from the Home
 * key). A dive in flight takes the Dive row's place, with Stop.
 *
 * Lines that come only when they say something: where the nearest surface is when it is not what
 * is looked at (below); past the checked depth (1e-50) and at the floor; and the fly speed, for
 * `SPEED_SHOWN_MS` after it changes (the wheel on the picture changes it). Gone on 2026-10-17: the
 * magnification (the depth said it again), the speed in decades a second, the yardstick passed,
 * and the "pace" line - pace means decades a second only now; that number, the distance the fly
 * speed is multiplied by, is Diagnostics' "Speed scale".
 *
 * THE DEPTH IS WHAT IS LOOKED AT (the owner, 2026-10-09: "we lead with the looked at readout"):
 * the distance to what is in the middle of the picture, from `deep-zoom/navigationState.ts`
 * (`depth`, published by the navigation tick 8 times a second). When the nearest surface is not
 * that - it stands more than half a decade nearer, beside or behind the camera - a second line
 * says where it is; when nothing is in the middle of the picture the nearest surface is the
 * headline and the line under it says so. The nearest surface is the telemetry store's `depth`.
 *
 * THE MODE PILL is a button: a click switches Fly and Orbit, as `Tab` does with the picture focused
 * (deep-zoom/hotkeys.ts). It says the mode in lower case (`data-dz-mode`'s text starts `fly` or
 * `orbit`; CSS capitalises it).
 *
 * Each selector returns a string already rounded for display, so React re-renders only when what
 * is printed changes. Shown unless Overlays is None (`dzInspect.overlays`).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { useDzTelemetry } from '../host/telemetry';
import { overlaysFromIndex } from '../features/inspect';
import { diveTo, stopDive, useDive } from '../diveControl';
import { jumpStart } from '../locations';
import { toggleCameraMode } from '../hotkeys';
import { DZ_MODE_ORBIT, cameraModeOf, useDzNavigation } from '../navigationState';
import { FLOOR_EXP, decadesToFloor, formatDepth, formatDepthCompact, validDepth } from './depthFormat';

/** How long the fly speed stays on screen after it changes. */
const SPEED_SHOWN_MS = 1500;

/** True for `SPEED_SHOWN_MS` after `value` changes (not at mount). */
function useShownAfterChange(value: string): boolean {
    const [shown, setShown] = useState(false);
    const last = useRef(value);
    useEffect(() => {
        if (last.current === value) return undefined;
        last.current = value;
        setShown(true);
        const timer = window.setTimeout(() => setShown(false), SPEED_SHOWN_MS);
        return () => window.clearTimeout(timer);
    }, [value]);
    return shown;
}

const line = 'text-[10px] leading-tight text-fg-tertiary';
const button = 'h-5 px-1.5 rounded border border-line/20 text-[10px] text-fg-secondary hover:text-fg hover:border-line/40';
const FLY_TITLE = 'Fly mode. W A S D, Space up, C down, Q and E roll, Shift four times as fast; drag the picture to look; the wheel sets the speed. Click here, or Tab with the picture focused: Orbit mode.';
const ORBIT_TITLE = "Orbit mode. Drag: turn about the point under the pointer. Wheel, or a middle drag up and down: fly along the pointer's ray to that point, or back from it. Right drag: move it. Q and E roll. Click here, or Tab with the picture focused: Fly mode.";

export const DepthReadout: React.FC = () => {
    const live = useDzTelemetry((t) => t.live);
    const depthText = useDzNavigation((s) => formatDepth(s.depth));
    const decades = useDzNavigation((s) => (validDepth(s.depth) ? decadesToFloor(s.depth).toFixed(1) : ''));
    const zone = useDzNavigation((s) => (!validDepth(s.depth) ? '' : s.depth <= 1e-74 ? 'floor' : s.depth < 1e-50 ? 'unchecked' : ''));
    // The nearest surface, when it is not what is looked at (see the header).
    const isLook = useDzNavigation((s) => s.depthIsLook);
    const lookTenths = useDzNavigation((s) => (validDepth(s.depth) ? Math.round(Math.log10(s.depth) * 10) : NaN));
    const nearestTenths = useDzTelemetry((t) => (validDepth(t.depth) ? Math.round(Math.log10(t.depth) * 10) : NaN));
    const nearestText = useDzTelemetry((t) => formatDepthCompact(t.depth));
    const orbit = useEngineStore((s) => cameraModeOf(s) === DZ_MODE_ORBIT);
    const overlays = useEngineStore((s) => overlaysFromIndex(s.dzInspect?.overlays));
    const dive = useDive((s) => s.dive);
    const flySpeed = useDzNavigation((s) => (s.flySpeed >= 1 ? s.flySpeed.toFixed(1) : s.flySpeed.toFixed(2)));
    const speedShown = useShownAfterChange(flySpeed);
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
            <div className="flex items-center gap-2">
                <div
                    data-dz-depth
                    className="font-mono tabular-nums text-[18px] leading-none text-fg"
                    title="Depth: the distance from the camera to what is in the middle of the picture. The fly speed follows it."
                >
                    {depthText}
                </div>
                <span className="flex-1" />
                {speedShown && (
                    <span data-dz-fly-speed className="text-[10px] text-fg-tertiary tabular-nums" title="Fly speed: how many paces the camera covers in a second. The wheel on the picture changes it.">
                        fly speed {flySpeed}
                    </span>
                )}
                <button
                    type="button"
                    data-dz-mode
                    onClick={toggleCameraMode}
                    className="h-4 px-1.5 rounded-full border border-line/20 text-[9px] leading-none capitalize text-fg-secondary hover:text-fg hover:border-line/40"
                    title={orbit ? ORBIT_TITLE : FLY_TITLE}
                >
                    {orbit ? 'orbit' : 'fly'}
                </button>
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
            <div className={`${line} mt-1`} title="How many decades (steps of ten times closer) are left above 1e-77, where the deep renderer's numbers end.">{decades} decades to the floor</div>
            {zone === 'unchecked' && <div className={line}>past the checked depth (1e-50)</div>}
            {zone === 'floor' && <div className="text-[10px] leading-tight text-warn">floor 1e-77: the deep renderer's numbers end here</div>}
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
                        title="Start view: the camera goes back to where the whole of this formula is seen from outside (in Julia mode, the whole Julia set). The formula's own settings stay as they are. One undo step, and Backspace comes back to this place. The Home key is another thing: it goes to the place the app started with."
                    >
                        Start view
                    </button>
                </form>
            )}
        </div>
    );
};
