/**
 * deep-zoom/components/RoutePanel.tsx - the Route tab: the camera move on the timeline, as a list
 * of its keyframes.
 *
 * Everything it does is a call into `deep-zoom/route.ts`, where the words (route, keyframe, leg)
 * and the rules are. Top: "Add keyframe" (the K key), Play / Pause (to the last keyframe, then
 * stop; the timeline's own Play is the engine's and loops as the timeline is set to), one line of
 * count, length and depths, and the pace at the playhead. Then one row a keyframe, in the look of
 * a saved location's row: the picture taken when it was set (this session only - a keyframe from
 * a loaded scene shows its number), its depth, its time. A row goes to its keyframe; its buttons
 * play the leg that arrives at it, replace it with the view on screen, and delete it. A row is red
 * when the leg that arrives at it passes through the solid.
 * When the camera is not where the playhead says, one line says so and "Return" puts it back.
 *
 * Registered as `dz-route` in main.tsx (it reads the stores); panels.ts places it.
 *
 * PITFALLS
 *   - Each selector returns a primitive, or an object the store keeps while nothing changed: the
 *     playhead moves every frame while the timeline plays, and the list must not render for it.
 *   - "Off the route" is asked of the renderer (`cameraOnRoute`: its camera strings against the
 *     route's) when something that could change the answer happens - the playhead moving a whole
 *     frame, the route changing, the camera changing hands (`useRoute`'s `rev`), a flight landing
 *     - and never while the timeline plays.
 */
import React from 'react';
import { useAnimationStore } from '../../store/animationStore';
import { PauseIcon, PlayIcon, PlusIcon, SaveIcon, TrashIcon } from '../../components/Icons';
import { useDzNavigation } from '../navigationState';
import {
    ROUTE_TRACK, cameraOnRoute, deleteKeyframe, playLeg, playRoute, replaceKeyframe, returnToRoute, routeKeys, routePaceAt,
    scrubRouteTo, setKeyframe, stopRoutePlayback, useRoute,
} from '../route';
import { formatDepth, formatDepthCompact } from './depthFormat';

const rowButton = 'p-1 text-fg-faint opacity-0 group-hover:opacity-100';
const topButton = 'rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1 border';

export const RoutePanel: React.FC = () => {
    // The track is another object after every edit of the route: the list follows it.
    useAnimationStore((s) => s.sequence.tracks[ROUTE_TRACK]);
    const fps = useAnimationStore((s) => s.fps);
    const playing = useAnimationStore((s) => s.isPlaying);
    const frame = useAnimationStore((s) => Math.round(s.currentFrame));
    const pace = useAnimationStore((s) => routePaceAt(s.currentFrame, s.fps).toFixed(2));
    const thumbnails = useRoute((s) => s.thumbnails);
    const solid = useRoute((s) => s.solid);
    useRoute((s) => s.rev);
    useDzNavigation((s) => s.flying);

    const keys = routeKeys();
    const seconds = (frames: number): string => (fps > 0 ? frames / fps : 0).toFixed(1);
    const off = !playing && keys.length > 0 && !cameraOnRoute();
    const act = (run: (id: string) => void, id: string) => (e: React.MouseEvent): void => { e.stopPropagation(); run(id); };

    return (
        <div data-dz-route className="flex flex-col">
            <div className="px-2 pt-2 flex gap-1">
                <button
                    type="button"
                    data-dz-route-add
                    onClick={() => { setKeyframe(); }}
                    title="Add a keyframe from this view, after the last one (K). With the playhead on an earlier keyframe, that keyframe takes this view instead."
                    className={`${topButton} flex-1 bg-accent-900/40 hover:bg-accent-800 text-accent-300 border-accent-500/30`}
                >
                    <PlusIcon /> Add keyframe
                </button>
                <button
                    type="button"
                    data-dz-route-play
                    disabled={keys.length < 2}
                    onClick={playing ? stopRoutePlayback : playRoute}
                    title="Play the route from the playhead to its last keyframe"
                    className={`${topButton} w-16 border-line/20 text-fg-secondary hover:text-fg hover:border-line/40 disabled:opacity-40`}
                >
                    {playing ? <PauseIcon /> : <PlayIcon />} {playing ? 'Pause' : 'Play'}
                </button>
            </div>

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
                        No keyframes yet. Press K to add this view.
                    </div>
                )}
                {keys.map((key, i) => {
                    const here = Math.abs(key.frame - frame) < 0.5;
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
        </div>
    );
};
