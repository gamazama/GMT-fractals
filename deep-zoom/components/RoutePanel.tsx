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
 *   - "As flown" and "Even pace": the route's timing, key times only.
 *   - One line of count, length and depths, and the pace at the playhead.
 * Then one row a keyframe, in the look of a saved location's row: the picture taken when it was
 * set (this session only - a keyframe from a loaded scene or a trail shows its number), its depth,
 * its time. A row goes to its keyframe; its buttons play the leg that arrives at it, replace it
 * with the view on screen, and delete it. A row is red when the leg that arrives at it passes
 * through the solid.
 * When the camera is not where the playhead says, one line says so and "Return" puts it back.
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
 */
import React, { useRef, useState } from 'react';
import { useAnimationStore } from '../../store/animationStore';
import { CheckeredFlagIcon, PauseIcon, PlayIcon, PlusIcon, SaveIcon, TrashIcon } from '../../components/Icons';
import { openRenderPopup } from '../../engine/animation/renderPopupRegistry';
import { BaseSlider } from '../../components/Slider';
import { createLogMapping } from '../../components/inputs/primitives/FormatUtils';
import { Modal } from '../../components/ui/Modal';
import { useDzNavigation } from '../navigationState';
import {
    ROUTE_SMOOTHING, ROUTE_TRACK, cameraOnRoute, deleteKeyframe, playLeg, playRoute, replaceKeyframe, retimeRoute, returnToRoute, routeFromTrail,
    routeHandSet, routeKeys, routePaceAt, routeSource, scrubRouteTo, setKeyframe, setRouteSmoothing, stopRoutePlayback, useRoute,
} from '../route';
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

export const RoutePanel: React.FC = () => {
    // The track is another object after every edit of the route: the list follows it.
    useAnimationStore((s) => s.sequence.tracks[ROUTE_TRACK]);
    const fps = useAnimationStore((s) => s.fps);
    const playing = useAnimationStore((s) => s.isPlaying);
    // The playhead: a whole frame while it is moved by hand, nothing while the timeline plays.
    useAnimationStore((s) => (s.isPlaying ? -1 : Math.round(s.currentFrame)));
    const under = useAnimationStore((s) => routeKeys().findIndex((k) => Math.abs(k.frame - s.currentFrame) < 0.5));
    const pace = useAnimationStore((s) => routePaceAt(s.currentFrame, s.fps).toFixed(2));
    const thumbnails = useRoute((s) => s.thumbnails);
    const solid = useRoute((s) => s.solid);
    const rendering = useRoute((s) => s.rendering);
    useRoute((s) => s.rev);
    useDzNavigation((s) => s.flying);
    const flown = useTrail((s) => s.line !== '');
    const previous = useTrail((s) => s.previous);
    /** The trail a route is asked for from (true: the previous one), while the question stands. */
    const [asking, setAsking] = useState<boolean | null>(null);

    const keys = routeKeys();
    const source = routeSource();
    const seconds = (frames: number): string => (fps > 0 ? frames / fps : 0).toFixed(1);
    const off = !playing && keys.length > 0 && !cameraOnRoute();
    const act = (run: (id: string) => void, id: string) => (e: React.MouseEvent): void => { e.stopPropagation(); run(id); };
    const make = (fromPrevious: boolean): void => { if (routeHandSet()) setAsking(fromPrevious); else routeFromTrail(fromPrevious); };

    return (
        <div data-dz-route className="flex flex-col">
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
                    onClick={playing ? stopRoutePlayback : playRoute}
                    title="Play the route from the playhead to its last keyframe"
                    className={`${plainButton} w-16`}
                >
                    {playing ? <PauseIcon /> : <PlayIcon />} {playing ? 'Pause' : 'Play'}
                </button>
                <button
                    type="button"
                    data-dz-route-render
                    onClick={openRenderPopup}
                    title="Render the route as PNG frames into a folder. With no route, the timeline as it is."
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

            <div className="p-2 space-y-1">
                {keys.length === 0 && (
                    <div className="text-center text-fg-faint text-[10px] italic py-4 px-2 break-words">
                        No keyframes yet. Press K to add this view, or fly and make the route from the trail.
                    </div>
                )}
                {keys.map((key, i) => {
                    const here = i === under;
                    const through = !!solid[key.id];
                    const picture = thumbnails[key.id];
                    return (
                        <div
                            key={key.id}
                            data-dz-route-key={i + 1}
                            onClick={() => scrubRouteTo(key.frame)}
                            title="Go to this keyframe"
                            className={`flex items-center gap-1.5 p-1.5 rounded border group cursor-pointer ${
                                through ? 'bg-danger/10 border-danger/40'
                                    : here ? 'bg-accent-900/20 border-accent-500/50'
                                        : 'bg-line/5 border-transparent hover:border-line/10'
                            }`}
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
                                <div className="text-[9px] leading-tight text-fg-dim truncate">{seconds(key.frame)} s</div>
                                {through && (
                                    <div data-dz-route-solid className="text-[9px] leading-tight text-danger truncate" title="The leg that arrives at this keyframe passes through the solid: the picture goes blank on the way. Move one of its two keyframes, or add one between them.">
                                        Leg passes through the solid
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
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
