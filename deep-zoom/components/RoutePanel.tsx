/**
 * deep-zoom/components/RoutePanel.tsx - the Route tab: the camera move on the timeline, as a list
 * of its keyframes, and the trail it can be made from.
 *
 * Everything it does is a call into `deep-zoom/route.ts`, where the words (route, keyframe, leg)
 * and the rules are, or into `deep-zoom/trail.ts` (the trail: what the app remembers of how the
 * camera was flown). From the top:
 *   - "Add keyframe" (the K key), Play / Pause (to the last keyframe, then stop; the timeline's
 *     own Play is the engine's and loops as the timeline is set to), and "Render", which opens
 *     the render dialog (`deep-zoom/routeRender.tsx`; it also brings the timeline up, whose child
 *     the dialog is). WHILE A RENDER RUNS everything on this tab but that button is off: the
 *     route's own functions do nothing then (`setRouteRendering` in route.ts), and the tab shows it.
 *   - The trail: its record button (lit while it records) with one line beside it, how deep and
 *     how long the trail is. "Route to here" makes the route from the trail, replacing the one
 *     there; when a jump has ended a deep trail, "Route from the previous trail" is beside it.
 *     A route that holds keyframes set by hand is asked for first (the engine's `Modal`: Escape or
 *     Cancel leaves the route alone, a click outside does nothing).
 *   - Smoothing, while the route came from a trail: how closely it follows what was flown. It cuts
 *     the route again when the hand lets go, not while it drags.
 *   - "As flown" and "Even pace": the route's timing, key times only. Beside them "Reverse"
 *     (`reverseRoute`): a new route that plays this one the other way, one undo step; and
 *     "Smooth...", which opens the smoothing pass's dialog (`SmoothDialog.tsx`; the pass is
 *     route.ts's `smoothRoute`) with the rows selected here as its "Selected legs".
 *   - One line of count, length and depths, and the pace at the playhead; under them, for a route
 *     that can play, one line on FREE LOOK (turning the view while the route plays: route.ts,
 *     FREE LOOK). Pause here is `pauseRoute`: the camera stays the route's, and a free look that
 *     was not recorded returns to it.
 *   - Only while a free look is recorded (one of the three look tracks holds a key): one line that
 *     says so, with "Clear" (`clearLook`: the three tracks go, one animation-undo step).
 * Above the list, "Delete selected" and "Clear route" (`clearRoute`: every keyframe and a recorded
 * free look, the playhead back at the start, one undo step; no question is asked, undo covers it).
 * Then one row a keyframe, in the look of a saved location's row: its picture (taken when it was
 * set, or a moment after the route was cut from the trail; this session only - a keyframe from a
 * loaded scene shows its number), its depth, its time and, from the second row on, a SECONDS FIELD:
 * the length of the leg that arrives at it. A typed length moves that keyframe and every later one
 * (`setLegSeconds`), when the field is left or Enter is pressed. A row goes to its keyframe; its
 * buttons play the leg that arrives at it, replace it with the view on screen, and delete it. Its
 * PIN shows and toggles the K mark (`pinKeyframe` / `unpinKeyframe`, one undo step each): pinned, a
 * smoothing pass keeps this keyframe's aim to the digit (K, Key Cam and a replace pin it; a keyframe
 * cut from the trail or from an older scene is not). The pin stays shown while it is on. A row is
 * red when the leg that arrives at it passes through the solid.
 * SELECTING ROWS: a click selects one (and goes to it), Ctrl / Cmd-click adds or removes one,
 * Shift-click takes the range from the row clicked last. "Delete selected", or the Delete key
 * while the list has the focus (a click on a row gives it), removes them in one undo step
 * (`deleteKeyframes`). The selection is this panel's own state: ids that are no longer keyframes
 * (a delete, an undo, a route cut again) drop out of it by themselves.
 * When the camera is not where the playhead says, one line says so and "Return" puts it back.
 *
 * THE TAB ENDS WITH ROOM FOR THE TIMELINE'S TOGGLE. The engine's round button that opens the
 * timeline ("Animate" while hints are on; `fixed bottom-4 left-4` in components/TimelineHost.tsx)
 * lies over the bottom left corner of the left dock while the timeline is closed, and the last row
 * of a list longer than the dock ended under it. So the tab can be scrolled 48 px further
 * (`data-dz-route-room`): the last row then ends 64 px above the window's edge, which is where the
 * HUD's bottom-left slot keeps clear of the same button (grep `bottom-16` in engine/plugins/Hud.tsx;
 * no dock tab had to before this one). With the timeline shown the button is gone, and so is the room.
 *
 * Registered as `dz-route` in main.tsx (it reads the stores); panels.ts places it.
 *
 * PITFALLS
 *   - Each selector returns a primitive, or an object the store keeps while nothing changed: the
 *     playhead moves every frame while the timeline plays, and the list - 300 rows for a route
 *     cut from a long trail - must not render for it. The row under the playhead is selected by
 *     its index, which changes when the playhead passes a keyframe.
 *   - The trail's line changes as the camera flies: it is `TrailRow`'s own selector, not the list's.
 *   - "Off the route" is asked of the renderer (`cameraOnRoute`: its camera strings against the
 *     route's) when something that could change the answer happens - the playhead moved by hand a
 *     whole frame, the route changing, the camera changing hands (`useRoute`'s `rev`), a flight
 *     landing - and never while the timeline plays.
 *   - The smoothing slider's value is its own while it is held; the route's again on release.
 *   - THE DELETE KEY IS THE LIST'S ONLY WHILE IT HAS THE FOCUS, and it stops there: the timeline's
 *     own Delete (a window listener that removes the keys selected ON THE TIMELINE) must not run
 *     for the same press. Backspace is not taken: it is "back to the view before the last jump".
 *   - A SECONDS FIELD IS AN INPUT INSIDE A ROW THAT IS CLICKED: its clicks stop at the field, or
 *     each would go to the keyframe and select the row. A text input read as a number (a comma or
 *     a point): a number input prints the browser's own decimal mark, 9,83 beside this tab's 9.8.
 *   - THE ROOM FOR THE TOGGLE IS OUT OF FLOW, AND CSS ALONE TAKES IT AWAY. It is an absolute box
 *     56 px high under the tab's own box (the dock's 8 px of bottom padding lie inside it: 48 px
 *     more scroll), hidden while the timeline is in the page (`:has` on the timeline's
 *     `data-help-id="ui.timeline"`: the toggle is there exactly when the timeline is not, and
 *     TimelineHost keeps that in its own state, which nothing here can read). IN FLOW it would be
 *     part of the height the dock's `ScrollSpaceReserver` measures, and the reserver keeps a height
 *     that shrank as an empty spacer until it has been scrolled out of view: opening the timeline
 *     would leave the very gap this avoids. Should the timeline's help id change, the room simply
 *     stays when the timeline is open; on the right dock or in a floating window it is 48 px of
 *     scroll nobody needs.
 *
 * @assumption The selection (click, Ctrl / Cmd-click, Shift-click, the Delete key and its not
 *   reaching the timeline), the seconds field setting its length on Enter and when it is left, and
 *   the two buttons above the list are wiring no node check reaches (the functions they call have
 *   lines in check:deep-zoom-route). Driven once in the real app, 2026-10-12
 *   (debug/scratch/route-fixes/app-six.mts, git-ignored). The row's pin (one undo step a click, shown
 *   while on) and "Smooth..." with the rows selected as its legs: driven once in the real app on the
 *   GPU, 2026-10-17, on the owner's route (debug/scratch/s2/app-smooth.mts, git-ignored).
 * @assumption The last row ends clear of the toggle with the timeline closed, and with it open
 *   the list ends where it did before - measured once, 2026-10-11, in the app at 1280 x 800 with
 *   14 keyframes (debug/scratch/r7c/animate.mts, git-ignored; before the room was there its
 *   "the last row ... is clear of the toggle" line was red, the row 35 px under the button). No
 *   standing guard looks at it.
 */
import React, { useRef, useState } from 'react';
import { useAnimationStore } from '../../store/animationStore';
import { CheckeredFlagIcon, PauseIcon, PinIcon, PlayIcon, PlusIcon, SaveIcon, TrashIcon } from '../../components/Icons';
import { openRenderPopup } from '../../engine/animation/renderPopupRegistry';
import { BaseSlider } from '../../components/Slider';
import { createLogMapping } from '../../components/inputs/primitives/FormatUtils';
import { Modal } from '../../components/ui/Modal';
import { useDzNavigation } from '../navigationState';
import {
    ROUTE_SMOOTHING, ROUTE_TRACK, ROUTE_TYPED_LEG_SECONDS, cameraOnRoute, clearLook, clearRoute, deleteKeyframe, deleteKeyframes, lookKeyed, pauseRoute, pinKeyframe,
    playLeg, playRoute, replaceKeyframe, retimeRoute, returnToRoute, reverseRoute, routeFromTrail, routeHandSet, routeKeys, routePaceAt, routeSource, scrubRouteTo,
    setKeyframe, setLegSeconds, setRouteSmoothing, unpinKeyframe, useRoute,
} from '../route';
import type { RouteKey } from '../route';
import { SmoothDialog } from './SmoothDialog';
import { setTrailOn, useTrail } from '../trail';
import { formatDepth, formatDepthCompact } from './depthFormat';

const rowButton = 'p-1 text-fg-faint opacity-0 group-hover:opacity-100';
const topButton = 'rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1 border';
const plainButton = `${topButton} border-line/20 text-fg-secondary hover:text-fg hover:border-line/40 disabled:opacity-40`;
/** The smoothing's track: even steps are even ratios, 0.01 at the left and 0.5 at the right. */
const SMOOTHING_SCALE = createLogMapping(ROUTE_SMOOTHING.min, ROUTE_SMOOTHING.max, { reserveZero: false });

/** The record button and its line. */
const TrailRow: React.FC = () => {
    const on = useTrail((s) => s.on);
    const line = useTrail((s) => s.line);
    return (
        <div className="px-2 pt-2 flex items-center gap-2">
            <button
                type="button"
                data-dz-trail
                aria-pressed={on}
                onClick={() => setTrailOn(!on)}
                title="The trail: the app remembers how you fly, and a route can be made from it afterwards. Switched off, nothing more is added and the trail so far stays."
                className={`${topButton} px-2 ${on ? 'bg-danger/15 border-danger/40 text-fg' : 'border-line/20 text-fg-tertiary hover:text-fg hover:border-line/40'}`}
            >
                <span className={`w-2 h-2 rounded-full ${on ? 'bg-danger' : 'border border-fg-faint'}`} /> Trail
            </button>
            <span data-dz-trail-line className="min-w-0 truncate text-[10px] text-fg-tertiary">{line || (on ? 'Nothing flown yet' : 'Off')}</span>
        </div>
    );
};

/** The smoothing of a route cut from the trail. */
const Smoothing: React.FC<{ value: number }> = ({ value }) => {
    const [held, setHeld] = useState<number | null>(null);
    // The value the hand is on: the release reads it here, before the render that follows the last move.
    const latest = useRef<number | null>(null);
    const shown = held ?? value;
    const release = (): void => {
        const asked = latest.current;
        latest.current = null;
        setHeld(null);
        if (asked !== null) setRouteSmoothing(asked);
    };
    return (
        <div
            data-dz-route-smoothing
            className="px-2 pt-2"
            title="How far the route may lie from what was flown, as a share of the depth there: 0.01 follows closely, 0.5 is a smooth glide with few keyframes. The route is cut again when you let go."
        >
            <BaseSlider
                label="Smoothing"
                value={shown}
                min={ROUTE_SMOOTHING.min}
                max={ROUTE_SMOOTHING.max}
                step={1}
                mapping={SMOOTHING_SCALE}
                overrideText={shown.toFixed(3)}
                onChange={(v) => { latest.current = v; setHeld(v); }}
                onDragEnd={release}
            />
        </div>
    );
};

/** The length of the leg that arrives at a keyframe, in seconds. What is typed is set when the
 *  field is left or Enter is pressed; Escape puts the route's own length back in the field. */
const LegSeconds: React.FC<{ id: string; frames: number; fps: number }> = ({ id, frames, fps }) => {
    const [typed, setTyped] = useState<string | null>(null);
    const length = fps > 0 ? String(Number((frames / fps).toFixed(2))) : '0';
    const set = (): void => {
        // A text field, not a number field: that one prints 9,83 where the rest of the tab prints 9.8. Either is read.
        const seconds = typed === null || typed.trim() === '' ? NaN : Number(typed.trim().replace(',', '.'));
        setTyped(null);
        if (seconds >= 0) setLegSeconds(id, seconds);
    };
    return (
        <label
            className="flex items-center gap-0.5 cursor-text"
            onClick={(e) => e.stopPropagation()}
            title={`The length of the leg that arrives at this keyframe, in seconds. Type another and press Enter: this keyframe and every later one move by the difference, in one undo step. Views and depths stay. From one frame to ${ROUTE_TYPED_LEG_SECONDS / 60} minutes.`}
        >
            leg
            <input
                data-dz-route-leg-seconds
                type="text"
                inputMode="decimal"
                value={typed ?? length}
                onChange={(e) => setTyped(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={set}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
                    else if (e.key === 'Escape') setTyped(null);
                }}
                className="w-11 h-4 px-1 rounded bg-line/10 border border-line/15 text-fg font-mono tabular-nums text-[9px]"
            />
            s
        </label>
    );
};

export const RoutePanel: React.FC = () => {
    // The track is another object after every edit of the route: the list follows it.
    useAnimationStore((s) => s.sequence.tracks[ROUTE_TRACK]);
    const fps = useAnimationStore((s) => s.fps);
    const playing = useAnimationStore((s) => s.isPlaying);
    // The playhead: a whole frame while it is moved by hand, nothing while the timeline plays.
    useAnimationStore((s) => (s.isPlaying ? -1 : Math.round(s.currentFrame)));
    const under = useAnimationStore((s) => routeKeys().findIndex((k) => Math.abs(k.frame - s.currentFrame) < 0.5));
    const pace = useAnimationStore((s) => routePaceAt(s.currentFrame, s.fps).toFixed(2));
    // A free look is recorded: one of its three tracks holds a key (asked again at every change of the store; a boolean).
    const looked = useAnimationStore(() => lookKeyed());
    const thumbnails = useRoute((s) => s.thumbnails);
    const solid = useRoute((s) => s.solid);
    const rendering = useRoute((s) => s.rendering);
    useRoute((s) => s.rev);
    useDzNavigation((s) => s.flying);
    const flown = useTrail((s) => s.line !== '');
    const previous = useTrail((s) => s.previous);
    /** The trail a route is asked for from (true: the previous one), while the question stands. */
    const [asking, setAsking] = useState<boolean | null>(null);
    /** The rows picked (key ids), and the row a Shift-click takes its range from. */
    const [picked, setPicked] = useState<readonly string[]>([]);
    const rangeFrom = useRef<string | null>(null);
    /** The Smooth... dialog is open. */
    const [smoothing, setSmoothing] = useState(false);

    const keys = routeKeys();
    // Ids that are keyframes no more (a delete, an undo, a route cut again) are no selection.
    const selected = picked.filter((id) => keys.some((k) => k.id === id));
    const source = routeSource();
    const seconds = (frames: number): string => (fps > 0 ? frames / fps : 0).toFixed(1);
    const off = !playing && keys.length > 0 && !cameraOnRoute();
    const act = (run: (id: string) => void, id: string) => (e: React.MouseEvent): void => { e.stopPropagation(); run(id); };
    const make = (fromPrevious: boolean): void => { if (routeHandSet()) setAsking(fromPrevious); else routeFromTrail(fromPrevious); };
    /** A click on a row. With Shift: the range from the row clicked last. With Ctrl / Cmd: this row
     *  in or out. Plain: this row alone, and the camera goes to it. */
    const pick = (key: RouteKey, i: number) => (e: React.MouseEvent): void => {
        if (e.shiftKey) {
            const last = keys.findIndex((k) => k.id === rangeFrom.current), from = last >= 0 ? last : under >= 0 ? under : i;
            setPicked(keys.slice(Math.min(from, i), Math.max(from, i) + 1).map((k) => k.id));
            return;
        }
        rangeFrom.current = key.id;
        if (e.ctrlKey || e.metaKey) { setPicked(selected.includes(key.id) ? selected.filter((id) => id !== key.id) : [...selected, key.id]); return; }
        setPicked([key.id]);
        scrubRouteTo(key.frame);
    };
    const removeSelected = (): void => { if (selected.length > 0) deleteKeyframes(selected); setPicked([]); };
    const onListKey = (e: React.KeyboardEvent): void => {
        if (e.key !== 'Delete' || selected.length === 0 || (e.target as HTMLElement).tagName === 'INPUT') return;
        e.preventDefault();
        e.stopPropagation();                                         // not the timeline's Delete as well (see the header)
        removeSelected();
    };

    return (
        <div data-dz-route className="relative flex flex-col">
            <div className="px-2 pt-2 flex gap-1">
                <button
                    type="button"
                    data-dz-route-add
                    disabled={rendering}
                    onClick={() => { setKeyframe(); }}
                    title="Add a keyframe from this view, after the last one (K). With the playhead on an earlier keyframe, that keyframe takes this view instead."
                    className={`${topButton} flex-1 bg-accent-900/40 hover:bg-accent-800 text-accent-300 border-accent-500/30 disabled:opacity-40`}
                >
                    <PlusIcon /> Add keyframe
                </button>
                <button
                    type="button"
                    data-dz-route-play
                    disabled={keys.length < 2 || rendering}
                    onClick={playing ? pauseRoute : playRoute}
                    title="Play the route from the playhead to its last keyframe"
                    className={`${plainButton} w-16`}
                >
                    {playing ? <PauseIcon /> : <PlayIcon />} {playing ? 'Pause' : 'Play'}
                </button>
                <button
                    type="button"
                    data-dz-route-render
                    onClick={openRenderPopup}
                    title="Render the route: PNG frames into a folder, or a video file. With no route, the timeline as it is."
                    className={`${plainButton} w-[72px]`}
                >
                    <CheckeredFlagIcon /> Render
                </button>
            </div>

            {/* Off while a render runs: a disabled fieldset for the keyboard, no pointer events for the mouse. */}
            <fieldset disabled={rendering} className={`min-w-0 flex flex-col ${rendering ? 'opacity-50 pointer-events-none' : ''}`}>
            <TrailRow />
            <div className="px-2 pt-1 flex gap-1">
                <button
                    type="button"
                    data-dz-route-here
                    disabled={!flown}
                    onClick={() => make(false)}
                    title="Make the route from the trail: from where it began to this view, without its dead ends. It replaces the route."
                    className={`${plainButton} flex-1`}
                >
                    Route to here
                </button>
                {previous && (
                    <button
                        type="button"
                        data-dz-route-previous
                        onClick={() => make(true)}
                        title={`Make the route from the trail the last jump ended (${previous}). It replaces the route.`}
                        className={`${plainButton} flex-1`}
                    >
                        Route from the previous trail
                    </button>
                )}
            </div>

            {source && <Smoothing value={source.smoothing} />}
            {keys.length > 1 && (
                <div className="px-2 pt-1 flex gap-1">
                    <button
                        type="button"
                        data-dz-route-flown
                        disabled={!source}
                        onClick={() => retimeRoute(true)}
                        title="Time the route as it was flown: the trail's own clock, a pause counted as half a second. For a route made from the trail."
                        className={`${plainButton} flex-1`}
                    >
                        As flown
                    </button>
                    <button
                        type="button"
                        data-dz-route-even
                        onClick={() => retimeRoute(false)}
                        title="Time every leg by its length on screen, at 0.5 decades a second"
                        className={`${plainButton} flex-1`}
                    >
                        Even pace
                    </button>
                    <button
                        type="button"
                        data-dz-route-reverse
                        onClick={reverseRoute}
                        title="Make the route run the other way: the last keyframe becomes the first, and the picture at the playhead stays. One undo on the timeline brings it back."
                        className={`${plainButton} flex-1`}
                    >
                        Reverse
                    </button>
                    <button
                        type="button"
                        data-dz-route-smooth
                        aria-pressed={smoothing}
                        onClick={() => setSmoothing(true)}
                        title="Smooth the route's pace and turn: the whole route or the legs selected, with a graph of the pace before and after. Positions never move. One undo on the timeline brings it back."
                        className={`${plainButton} flex-1`}
                    >
                        Smooth...
                    </button>
                </div>
            )}

            {keys.length > 0 && (
                <div className="px-2 pt-2 text-[10px] leading-tight text-fg-tertiary">
                    <div data-dz-route-summary>
                        {keys.length} keyframe{keys.length === 1 ? '' : 's'} · {seconds(keys[keys.length - 1].frame - keys[0].frame)} s
                        {' '}· <span className="font-mono tabular-nums">{formatDepthCompact(keys[0].depth)} -&gt; {formatDepthCompact(keys[keys.length - 1].depth)}</span>
                    </div>
                    <div data-dz-route-pace title="How fast the picture moves at the playhead: the camera's speed over its depth.">
                        pace <span className="font-mono tabular-nums">{pace}</span> decades a second
                    </div>
                    {keys.length > 1 && (
                        <div
                            data-dz-route-look-help
                            className="pt-1 text-fg-faint"
                            title="Free look: the view is turned on top of the route, and the route plays on. A fly key, the wheel or Orbit mode still stop it and hand you the camera. Without Record the turn is gone when playback stops; with Record on (the timeline's record button, camera recording enabled) it is kept as three tracks: Look pan, Look tilt, Look roll."
                        >
                            Free look: while it plays, turn with a drag (Fly mode) or Q / E. Record on the timeline keeps it.
                        </div>
                    )}
                </div>
            )}

            {looked && (
                <div data-dz-route-look className="mx-2 mt-2 px-2 py-1 rounded border border-line/20 flex items-center justify-between gap-2 text-[10px] text-fg-tertiary">
                    <span>A free look is recorded on this route.</span>
                    <button
                        type="button"
                        data-dz-route-look-clear
                        onClick={clearLook}
                        title="Remove the recorded free look (the tracks Look pan, Look tilt and Look roll). One undo on the timeline brings it back."
                        className="h-5 px-1.5 rounded border border-line/30 text-[10px] hover:text-fg hover:border-line/50"
                    >
                        Clear
                    </button>
                </div>
            )}

            {off && (
                <div data-dz-route-off className="mx-2 mt-2 px-2 py-1 rounded border border-warn/30 flex items-center justify-between gap-2 text-[10px] text-warn">
                    <span>The camera is off the route.</span>
                    <button
                        type="button"
                        data-dz-route-return
                        onClick={returnToRoute}
                        title="Put the camera back on the route at the playhead"
                        className="h-5 px-1.5 rounded border border-warn/40 text-[10px] hover:bg-warn/10"
                    >
                        Return
                    </button>
                </div>
            )}

            <div className="px-2 pt-2 flex gap-1">
                <button
                    type="button"
                    data-dz-route-delete-selected
                    disabled={selected.length === 0}
                    onClick={removeSelected}
                    title="Delete the selected keyframes, in one undo step (the Delete key does the same after a click in the list). To select: click a keyframe, Ctrl-click (Cmd on a Mac) to add or remove one, Shift-click for the range."
                    className={`${plainButton} flex-1`}
                >
                    <TrashIcon /> Delete selected{selected.length > 0 ? ` (${selected.length})` : ''}
                </button>
                <button
                    type="button"
                    data-dz-route-clear
                    disabled={keys.length === 0}
                    onClick={() => { setPicked([]); clearRoute(); }}
                    title="Clear the route: every keyframe goes, and a recorded free look with them; the playhead returns to the start. One undo on the timeline brings all of it back. The trail stays."
                    className={`${plainButton} flex-1`}
                >
                    Clear route
                </button>
            </div>

            <div data-dz-route-list tabIndex={0} onKeyDown={onListKey} className="p-2 space-y-1 outline-none">
                {keys.length === 0 && (
                    <div className="text-center text-fg-faint text-[10px] italic py-4 px-2 break-words">
                        No keyframes yet. Press K to add this view, or fly and make the route from the trail.
                    </div>
                )}
                {keys.map((key, i) => {
                    const here = i === under;
                    const through = !!solid[key.id];
                    const picture = thumbnails[key.id];
                    const chosen = selected.includes(key.id);
                    return (
                        <div
                            key={key.id}
                            data-dz-route-key={i + 1}
                            data-dz-route-selected={chosen || undefined}
                            aria-selected={chosen}
                            onClick={pick(key, i)}
                            title="Go to this keyframe. Ctrl-click adds it to the selection or takes it out; Shift-click selects the range."
                            className={`flex items-center gap-1.5 p-1.5 rounded border group cursor-pointer select-none ${
                                through ? 'bg-danger/10 border-danger/40'
                                    : here ? 'bg-accent-900/20 border-accent-500/50'
                                        : 'bg-line/5 border-transparent hover:border-line/10'
                            } ${chosen ? 'ring-1 ring-inset ring-accent-400' : ''}`}
                        >
                            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-surface-section border border-line/5">
                                {picture ? (
                                    <img src={picture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-fg-ghost text-[7px]">{i + 1}</div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className={`text-xs font-bold font-mono tabular-nums truncate block ${here ? 'text-fg' : 'text-fg-muted group-hover:text-fg-tertiary'}`}>
                                    {formatDepth(key.depth)}
                                </span>
                                <div className="flex items-center gap-1.5 text-[9px] leading-tight text-fg-dim">
                                    <span title="When the route reaches this keyframe">{seconds(key.frame)} s</span>
                                    {i > 0 && <LegSeconds id={key.id} frames={key.frame - keys[i - 1].frame} fps={fps} />}
                                </div>
                                {through && (
                                    <div data-dz-route-solid className="text-[9px] leading-tight text-danger truncate" title="The leg that arrives at this keyframe passes through the solid: the picture goes blank on the way. Move one of its two keyframes, or add one between them.">
                                        Leg passes through the solid
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                <button
                                    type="button"
                                    data-dz-route-pin={key.exact ? 'on' : 'off'}
                                    aria-pressed={!!key.exact}
                                    onClick={act(key.exact ? unpinKeyframe : pinKeyframe, key.id)}
                                    className={key.exact ? 'p-1 text-accent-400 hover:text-accent-300' : `${rowButton} hover:text-accent-400`}
                                    title={key.exact
                                        ? 'Exact (the K mark): a smoothing pass keeps this keyframe\'s aim to the digit. Click to let it go: a pass may then move it by the miss allowed.'
                                        : 'Not exact: a smoothing pass may move this keyframe\'s aim by the miss allowed. Click to pin it, as K does.'}
                                >
                                    <PinIcon on={!!key.exact} />
                                </button>
                                {i > 0 && (
                                    <button type="button" data-dz-route-leg onClick={act(playLeg, key.id)} className={`${rowButton} hover:text-accent-400`} title="Play the leg to this keyframe">
                                        <PlayIcon />
                                    </button>
                                )}
                                <button type="button" data-dz-route-replace onClick={act(replaceKeyframe, key.id)} className={`${rowButton} hover:text-fg-muted`} title="Replace with the view on screen">
                                    <SaveIcon />
                                </button>
                                <button type="button" data-dz-route-delete onClick={act(deleteKeyframe, key.id)} className={`${rowButton} hover:text-danger`} title="Delete">
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            </fieldset>

            {/* Room under the last row for the timeline's toggle: out of flow, gone while the timeline is shown (see the header). */}
            <div data-dz-route-room aria-hidden className="absolute left-0 top-full h-14 w-px pointer-events-none [:root:has([data-help-id='ui.timeline'])_&]:hidden" />

            {smoothing && <SmoothDialog picked={selected} onClose={() => setSmoothing(false)} />}

            {asking !== null && (
                <Modal onClose={() => setAsking(null)}>
                    <div data-dz-route-ask className="bg-surface border border-warn/30 rounded-md shadow-2xl w-[420px] p-4 space-y-3">
                        <h3 className="text-[12px] font-bold text-warn">Replace the route?</h3>
                        <p className="text-[11px] text-fg-tertiary leading-snug">
                            The route holds keyframes that were set by hand. A route made from the trail replaces all of them.
                            One undo on the timeline brings them back.
                        </p>
                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                type="button"
                                data-dz-route-ask-cancel
                                onClick={() => setAsking(null)}
                                className="px-3 py-1 text-[10px] font-medium text-fg-tertiary hover:bg-line/5 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                data-dz-route-ask-replace
                                onClick={() => { const fromPrevious = asking; setAsking(null); routeFromTrail(fromPrevious); }}
                                className="px-3 py-1 text-[10px] font-bold bg-warn-strong hover:bg-warn text-fg rounded"
                            >
                                Replace
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
