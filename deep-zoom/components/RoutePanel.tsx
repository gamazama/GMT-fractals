/**
 * deep-zoom/components/RoutePanel.tsx - the Route tab: the camera move on the timeline, as a list
 * of its keyframes, and the trail it can be made from.
 *
 * Everything it does is a call into `deep-zoom/route.ts`, where the words (route, keyframe, leg)
 * and the rules are, or into `deep-zoom/trail.ts` (the trail: what the app remembers of how the
 * camera was flown). From the top:
 *   - "Add keyframe" (the K key), Play / Pause (to the last keyframe, then stop; the timeline's
 *     own Play is the engine's and loops as the timeline is set to), and "Render", which opens the
 *     render dialog (`deep-zoom/routeRender.tsx`; it also brings the timeline up, whose child the
 *     dialog is). WHILE A RENDER RUNS everything on this tab but that button is off: the route's
 *     own functions do nothing then (`setRouteRendering` in route.ts), and the tab shows it.
 *   - The trail, one line: its record button (lit while it records), how deep and how long the
 *     trail is, "Route to here", which makes the route from the trail, replacing the one there,
 *     and `⋯`, THE TAB'S MENU: the engine's `AnchoredMenu` with the engine's menu rows
 *     (`MenuItemList`), as the Places tab's File... is. In it "Route from the previous trail" (off
 *     until a jump has ended a deep trail), "Delete selected" and "Clear route" (`clearRoute`: every
 *     keyframe and a recorded free look, the playhead back at the start, one undo step; no question
 *     is asked, undo covers it). A route that holds keyframes set by hand is asked for before a
 *     route from either trail replaces it (the engine's `Modal`: Escape or Cancel leaves the route
 *     alone, a click outside does nothing). The `⋯` is on this line, not the first: beside the
 *     three buttons there it wrapped "Replace keyframe 11 (K)" onto two lines (seen 2026-10-17).
 *   - TIMING, one row (two keyframes or more): the engine's `Segmented` [As flown | Even | Smooth...]
 *     and "Reverse" beside it. As flown and Even are `retimeRoute`, key times only, one undo step
 *     each; the one the route is in is lit (`routeTiming`: neither after a typed leg, a key moved on
 *     the timeline or a smoothing pass). As flown is for a route cut from the trail. Smooth... opens
 *     the smoothing pass's dialog (`SmoothDialog.tsx`; the pass is route.ts's `smoothRoute`) with
 *     the rows selected here as its "Selected legs". Reverse (`reverseRoute`): a new route that
 *     plays this one the other way, one undo step. (The Smoothing slider that cut a route from the
 *     trail again went on 2026-10-17, STREAMLINE.md stage 6: Smooth... is the one smoothing.)
 *   - One line: the count, the length, the first and the last depth, and the route's PACE - the
 *     decades between those two depths over its length (the one meaning of the word in this app:
 *     decades a second). Under it, for a route that can play, one line on FREE LOOK (turning the
 *     view while the route plays: route.ts, FREE LOOK). Pause here is `pauseRoute`: the camera
 *     stays the route's, and a free look that was not recorded returns to it.
 *   - Only while a free look is recorded (one of the three look tracks holds a key): one line that
 *     says so, with "Clear" (`clearLook`: the three tracks go, one animation-undo step).
 * Then one row a keyframe, in the look of a saved location's row: its picture (taken when it was
 * set, or a moment after the route was cut from the trail; this session only - a keyframe from a
 * loaded scene shows its number), its depth, its time and, from the second row on, a SECONDS FIELD:
 * the length of the leg that arrives at it. A typed length moves that keyframe and every later one
 * (`setLegSeconds`), when the field is left or Enter is pressed. A row's PLAY BUTTON parks the
 * playhead on its keyframe, the camera with it (`playLeg`): from the second row on it plays the leg
 * that arrives there and stops on it, on the first it goes there at once. Its other buttons replace
 * it with the view on screen and delete it. Its PIN shows and toggles the K mark (`pinKeyframe` /
 * `unpinKeyframe`, one undo step each): pinned, a smoothing pass keeps this keyframe's aim to the
 * digit (K, Key Cam and a replace pin it; a keyframe cut from the trail or from an older scene is
 * not). The pin stays shown while it is on. A row is red when the leg that arrives at it passes
 * through the solid.
 * PARKED: while the playhead stands on a keyframe that is not the last (and nothing plays), K
 * gives that keyframe the view on screen (route.ts, `setKeyframe`; the owner's rule). So the add
 * button then reads "Replace keyframe N (K)", and that row says "K replaces" beside its times.
 * SELECTING ROWS: a click selects one - it moves neither the playhead nor the camera (the owner,
 * F3, 2026-10-17: the play button parks) - Ctrl / Cmd-click adds or removes one, Shift-click takes
 * the range from the row clicked last. "Delete selected" in the menu, or the Delete key while the
 * list has the focus (a click on a row gives it), removes them in one undo step (`deleteKeyframes`). The
 * selection is this panel's own state: ids that are no longer keyframes (a delete, an undo, a route
 * cut again) drop out of it by themselves.
 * When the camera is not where the playhead says, one line says so and "Return" puts it back.
 * THE POINTER OVER THE TAB IS THE POINTER OVER THE TIMELINE (GMT's rule, the owner 2026-10-17): the
 * engine's 'timeline-hover' scope is pushed and the store's `isTimelineHovered` set, as the timeline
 * does (components/Timeline.tsx). So Ctrl+Z / Ctrl+Y undo the animation stack, where every edit made
 * here is (anywhere else they undo the app's own stack - a jump, a flight, a slider - and Ctrl+Z after
 * "Clear route" put the camera and the formula back by a jump and left the route cleared); Space
 * plays and pauses the route in either camera mode; and the fly keys are ignored (`keysSuppressed`
 * in deep-zoom/DeepZoomNavigation.tsx). With the scope alone, one Space both played the route and
 * flew up, which stopped it and left the camera off the route (seen 2026-10-17). "Over the tab" is
 * over the scroll box the panel lives in (the dock's), not over the panel's own box, which ends
 * where its content does: after "Clear route" the pointer stands below it (seen 2026-10-17).
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
 *   - THE TIMING ROW IS THE ENGINE'S `Segmented`, at this tab's size: its buttons are made the size
 *     of the tab's own from outside (`[&>button]:...`, which outranks its `h-7 text-[13px]`). Should
 *     Segmented's buttons stop being its direct children, the row is simply larger.
 *   - THE MENU IS IN A PORTAL (the layer host), outside the tab: the pointer over it is not over the
 *     tab, so Ctrl+Z there undoes the app's own stack. It closes on a choice, so the next Ctrl+Z is
 *     over the tab again.
 *   - THE DELETE KEY IS THE LIST'S ONLY WHILE IT HAS THE FOCUS, and it stops there: the timeline's
 *     own Delete (a window listener that removes the keys selected ON THE TIMELINE) must not run
 *     for the same press. Backspace is not taken: it is "back to the view before the last jump".
 *   - A SECONDS FIELD IS AN INPUT INSIDE A ROW THAT IS CLICKED: its clicks stop at the field, or
 *     each would select the row. A text input read as a number (a comma or
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
 *   the two buttons that stood above the list (Delete selected, Clear route) are wiring no node
 *   check reaches (the functions they call have lines in check:deep-zoom-route). Driven once in the real app, 2026-10-12
 *   (debug/scratch/route-fixes/app-six.mts, git-ignored). The row's pin (one undo step a click, shown
 *   while on) and "Smooth..." with the rows selected as its legs: driven once in the real app on the
 *   GPU, 2026-10-17, on the owner's route (debug/scratch/s2/app-smooth.mts, git-ignored).
 * @assumption Ctrl+Z over the tab undoing the route (UNDO OVER THE TAB), a row click that moves
 *   nothing, the play button that parks (row 1 included) and the "Replace keyframe N (K)" label with
 *   its row's mark: tried once in the real app, 2026-10-17 (the browser pane, by hand). No standing
 *   guard reaches them.
 * @assumption The timing row (the timing the route is in lit; As flown, Even and Reverse one undo
 *   step each, which Ctrl+Z over the tab takes back; As flown off on a route set by hand), the `⋯`
 *   menu's three rows (Delete selected with two rows selected, Clear route, Route from the previous
 *   trail after a jump ended a dive of 3.6 decades; each closes the menu, each undone by Ctrl+Z over
 *   the tab), the summary line, and "Replace keyframe 11 (K)" on one line: driven once in the real
 *   app on the GPU, 2026-10-17 (debug/scratch/streamline/stage6-try.mjs and stage6-try2.mjs,
 *   git-ignored; headless Chrome, 1600 x 1000). No standing guard reaches the wiring; `routeTiming`
 *   itself has lines in check:deep-zoom-trail.
 * @assumption The last row ends clear of the toggle with the timeline closed, and with it open
 *   the list ends where it did before - measured once, 2026-10-11, in the app at 1280 x 800 with
 *   14 keyframes (debug/scratch/r7c/animate.mts, git-ignored; before the room was there its
 *   "the last row ... is clear of the toggle" line was red, the row 35 px under the button). No
 *   standing guard looks at it.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useAnimationStore } from '../../store/animationStore';
import { CheckeredFlagIcon, PauseIcon, PinIcon, PlayIcon, PlusIcon, SaveIcon, TrashIcon } from '../../components/Icons';
import { closeRenderPopup, isRenderPopupOpen, openRenderPopup, subscribeRenderPopup } from '../../engine/animation/renderPopupRegistry';
import { AnchoredMenu } from '../../components/ui/AnchoredMenu';
import { Modal } from '../../components/ui/Modal';
import { Segmented } from '../../components/ui/Segmented';
import { MenuItemList } from '../../engine/plugins/Menu';
import type { MenuItem } from '../../engine/plugins/Menu';
import { useShortcutScope } from '../../engine/plugins/Shortcuts';
import { useEngineStore } from '../../store/engineStore';
import { useDzNavigation } from '../navigationState';
import {
    ROUTE_TRACK, ROUTE_TYPED_LEG_SECONDS, cameraOnRoute, clearLook, clearRoute, deleteKeyframe, deleteKeyframes, lookKeyed, pauseRoute, pinKeyframe,
    playLeg, playRoute, replaceKeyframe, retimeRoute, returnToRoute, reverseRoute, routeFromTrail, routeHandSet, routeKeys, routeSource, routeTiming,
    setKeyframe, setLegSeconds, unpinKeyframe, useRoute,
} from '../route';
import type { RouteKey } from '../route';
import { SmoothDialog } from './SmoothDialog';
import { setTrailOn, useTrail } from '../trail';
import { formatDepth, formatDepthCompact } from './depthFormat';

const rowButton = 'p-1 text-fg-faint opacity-0 group-hover:opacity-100';
const topButton = 'rounded py-1 text-[9px] font-bold flex items-center justify-center gap-1 border';
const plainButton = `${topButton} border-line/20 text-fg-secondary hover:text-fg hover:border-line/40 disabled:opacity-40`;
/** The engine's Segmented at the size of this tab's buttons (THE TIMING ROW in the header). */
const timingRow = 'flex-1 [&>button]:flex-1 [&>button]:h-auto [&>button]:py-1 [&>button]:text-[9px] [&>button]:font-bold';
type Timing = 'flown' | 'even' | 'smooth' | 'none';

/** The trail's line: the record button, how deep and how long the trail is, "Route to here", and the tab's menu (`children`). */
const TrailRow: React.FC<{ onRoute: () => void; children: React.ReactNode }> = ({ onRoute, children }) => {
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
            <span data-dz-trail-line className="flex-1 min-w-0 truncate text-[10px] text-fg-tertiary">{line || (on ? 'Nothing flown yet' : 'Off')}</span>
            <button
                type="button"
                data-dz-route-here
                disabled={!line}
                onClick={onRoute}
                title="Make the route from the trail: from where it began to this view, without its dead ends. It replaces the route."
                className={`${plainButton} px-2 shrink-0`}
            >
                Route to here
            </button>
            {children}
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
    // A free look is recorded: one of its three tracks holds a key (asked again at every change of the store; a boolean).
    const looked = useAnimationStore(() => lookKeyed());
    const thumbnails = useRoute((s) => s.thumbnails);
    const solid = useRoute((s) => s.solid);
    const rendering = useRoute((s) => s.rendering);
    useRoute((s) => s.rev);
    useDzNavigation((s) => s.flying);
    const previous = useTrail((s) => s.previous);
    /** The trail a route is asked for from (true: the previous one), while the question stands. */
    const [asking, setAsking] = useState<boolean | null>(null);
    /** The rows picked (key ids), and the row a Shift-click takes its range from. */
    const [picked, setPicked] = useState<readonly string[]>([]);
    const rangeFrom = useRef<string | null>(null);
    /** The Smooth... dialog is open. One dialog at a time: the render dialog opening closes it, and it closes that. */
    const [smoothing, setSmoothing] = useState(false);
    useEffect(() => subscribeRenderPopup(() => { if (isRenderPopupOpen()) setSmoothing(false); }), []);
    /** Where the tab's menu is open (the corner it hangs from), or null. */
    const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
    /** The pointer is over the tab: it counts as over the timeline (THE POINTER OVER THE TAB in the header). */
    const [hovered, setHovered] = useState(false);
    useShortcutScope('timeline-hover', hovered);
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        // The TAB is the scroll box this panel lives in (the dock's, a window's), not the panel's own box:
        // after "Clear route" the list is gone and the pointer stands below it.
        let box = rootRef.current?.parentElement ?? null;
        while (box && !/auto|scroll/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
        const area = box ?? rootRef.current;
        if (!area) return undefined;
        const hover = (on: boolean): void => { setHovered(on); useEngineStore.getState().setIsTimelineHovered(on); };
        const enter = (): void => hover(true), leave = (): void => hover(false);
        area.addEventListener('pointerenter', enter);
        area.addEventListener('pointerleave', leave);
        if (area.matches(':hover')) hover(true);
        return () => { area.removeEventListener('pointerenter', enter); area.removeEventListener('pointerleave', leave); hover(false); };
    }, []);

    const keys = routeKeys();
    // Parked on a keyframe that is not the last: K gives it the view on screen (PARKED in the header).
    const parked = !playing && under >= 0 && under < keys.length - 1;
    // Ids that are keyframes no more (a delete, an undo, a route cut again) are no selection.
    const selected = picked.filter((id) => keys.some((k) => k.id === id));
    const source = routeSource();
    const seconds = (frames: number): string => (fps > 0 ? frames / fps : 0).toFixed(1);
    const length = keys.length > 0 ? keys[keys.length - 1].frame - keys[0].frame : 0;
    // The pace: the decades between the first and the last depth over the route's length.
    const pace = length > 0 && fps > 0 ? (Math.abs(Math.log10(keys[0].depth / keys[keys.length - 1].depth)) / (length / fps)).toFixed(2) : '0.00';
    const off = !playing && keys.length > 0 && !cameraOnRoute();
    const act = (run: (id: string) => void, id: string) => (e: React.MouseEvent): void => { e.stopPropagation(); run(id); };
    const make = (fromPrevious: boolean): void => { if (routeHandSet()) setAsking(fromPrevious); else routeFromTrail(fromPrevious); };
    /** A click on a row. With Shift: the range from the row clicked last. With Ctrl / Cmd: this row
     *  in or out. Plain: this row alone. None of them moves the playhead or the camera. */
    const pick = (key: RouteKey, i: number) => (e: React.MouseEvent): void => {
        if (e.shiftKey) {
            const last = keys.findIndex((k) => k.id === rangeFrom.current), from = last >= 0 ? last : under >= 0 ? under : i;
            setPicked(keys.slice(Math.min(from, i), Math.max(from, i) + 1).map((k) => k.id));
            return;
        }
        rangeFrom.current = key.id;
        if (e.ctrlKey || e.metaKey) { setPicked(selected.includes(key.id) ? selected.filter((id) => id !== key.id) : [...selected, key.id]); return; }
        setPicked([key.id]);
    };
    const removeSelected = (): void => { if (selected.length > 0) deleteKeyframes(selected); setPicked([]); };
    const openSmooth = (): void => { closeRenderPopup(); setSmoothing(true); };
    const menuItems: MenuItem[] = [
        {
            id: 'previous', type: 'button', label: 'Route from the previous trail', disabled: !previous, onSelect: () => make(true),
            title: previous ? `Make the route from the trail the last jump ended (${previous}). It replaces the route.` : 'No previous trail is kept: a jump keeps the trail it ends, when that went deep.',
        },
        { id: 'list', type: 'separator' },
        {
            id: 'delete', type: 'button', label: selected.length > 0 ? `Delete selected (${selected.length})` : 'Delete selected', disabled: selected.length === 0, onSelect: removeSelected,
            title: 'Delete the selected keyframes, in one undo step (the Delete key does the same after a click in the list). To select: click a keyframe, Ctrl-click (Cmd on a Mac) to add or remove one, Shift-click for the range.',
        },
        {
            id: 'clear', type: 'button', label: 'Clear route', disabled: keys.length === 0, onSelect: () => { setPicked([]); clearRoute(); },
            title: 'Clear the route: every keyframe goes, and a recorded free look with them; the playhead returns to the start. One undo on the timeline brings all of it back. The trail stays.',
        },
    ];
    const onListKey = (e: React.KeyboardEvent): void => {
        if (e.key !== 'Delete' || selected.length === 0 || (e.target as HTMLElement).tagName === 'INPUT') return;
        e.preventDefault();
        e.stopPropagation();                                         // not the timeline's Delete as well (see the header)
        removeSelected();
    };

    return (
        <div ref={rootRef} data-dz-route className="relative flex flex-col">
            <div className="px-2 pt-2 flex gap-1">
                <button
                    type="button"
                    data-dz-route-add={parked ? 'replace' : 'add'}
                    disabled={rendering}
                    onClick={() => { setKeyframe(); }}
                    title={parked
                        ? `Give keyframe ${under + 1} the view on screen; it keeps its time (K). The playhead is parked on it: move the playhead off it to add a keyframe after the last one instead.`
                        : 'Add a keyframe from this view, after the last one (K). With the playhead parked on an earlier keyframe (its row\'s play button), that keyframe takes this view instead.'}
                    className={`${topButton} flex-1 bg-accent-900/40 hover:bg-accent-800 text-accent-300 border-accent-500/30 disabled:opacity-40`}
                >
                    {parked ? <><SaveIcon /> Replace keyframe {under + 1} (K)</> : <><PlusIcon /> Add keyframe</>}
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
            <TrailRow onRoute={() => make(false)}>
                <button
                    type="button"
                    data-dz-route-more
                    aria-haspopup="menu"
                    aria-expanded={!!menuAt}
                    onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenuAt(menuAt ? null : { x: r.right - 224, y: r.bottom + 2 }); }}
                    title="More: Route from the previous trail, Delete selected, Clear route"
                    className={`${plainButton} w-6 shrink-0`}
                >
                    ⋯
                </button>
            </TrailRow>
            {keys.length > 1 && (
                <div data-dz-route-timing className="px-2 pt-1 flex gap-1">
                    <Segmented<Timing>
                        name="route-timing"
                        options={[
                            { id: 'flown', name: 'As flown', disabled: !source, title: 'Time the route as it was flown: the trail\'s own clock, a pause counted as half a second. For a route made from the trail. One undo on the timeline brings the timing back.' },
                            { id: 'even', name: 'Even', title: 'Time every leg by its length on screen, at 0.5 decades a second. One undo on the timeline brings the timing back.' },
                            { id: 'smooth', name: 'Smooth...', title: 'Even out how fast the picture moves, and the turn: the whole route or the legs selected, with a graph before and after. Positions never move. One undo on the timeline brings it back.' },
                        ]}
                        value={routeTiming() ?? 'none'}
                        onChange={(id) => { if (id === 'smooth') openSmooth(); else retimeRoute(id === 'flown'); }}
                        pad="px-1"
                        className={timingRow}
                    />
                    <button
                        type="button"
                        data-dz-route-reverse
                        onClick={reverseRoute}
                        title="Make the route run the other way: the last keyframe becomes the first, and the picture at the playhead stays. One undo on the timeline brings it back."
                        className={`${plainButton} px-2`}
                    >
                        Reverse
                    </button>
                </div>
            )}

            {keys.length > 0 && (
                <div className="px-2 pt-2 text-[10px] leading-tight text-fg-tertiary">
                    <div data-dz-route-summary title="The keyframes, the route's length, its first and last depth, and its pace: the decades between those two depths over the length.">
                        {keys.length} keyframe{keys.length === 1 ? '' : 's'} · {seconds(length)} s
                        {' '}· <span className="font-mono tabular-nums">{formatDepthCompact(keys[0].depth)} -&gt; {formatDepthCompact(keys[keys.length - 1].depth)}</span>
                        {keys.length > 1 && <>{' '}· <span data-dz-route-pace className="font-mono tabular-nums">{pace}</span> decades a second</>}
                    </div>
                    {keys.length > 1 && (
                        <div
                            data-dz-route-look-help
                            className="pt-1 text-fg-faint"
                            title="Free look: the view is turned on top of the route, and the route plays on. A fly key, the wheel or Orbit mode still stop it and hand you the camera. Without Record the turn is gone when playback stops; with Record on (the timeline's record button, camera recording enabled) it is kept as three tracks: Look pan, Look tilt, Look roll, and Record goes off when playback stops."
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
                    const then = i === keys.length - 1 ? 'K then adds a keyframe after it' : 'K then gives it the view on screen';
                    return (
                        <div
                            key={key.id}
                            data-dz-route-key={i + 1}
                            data-dz-route-selected={chosen || undefined}
                            aria-selected={chosen}
                            onClick={pick(key, i)}
                            title="Select this keyframe. Ctrl-click adds it to the selection or takes it out; Shift-click selects the range. Its play button takes the playhead and the camera to it."
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
                                    {here && parked && (
                                        <span data-dz-route-parked className="text-accent-300 font-bold" title="The playhead is parked on this keyframe: K gives it the view on screen">K replaces</span>
                                    )}
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
                                <button
                                    type="button"
                                    data-dz-route-leg
                                    onClick={act(playLeg, key.id)}
                                    className={`${rowButton} hover:text-accent-400`}
                                    title={i === 0 ? `Go to this keyframe: the playhead is parked on it, and ${then}` : `Play the leg to this keyframe and park the playhead on it: ${then}`}
                                >
                                    <PlayIcon />
                                </button>
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

            {menuAt && (
                <AnchoredMenu anchor={menuAt} onClose={() => setMenuAt(null)} ignore="[data-dz-route-more]" className="w-56 bg-surface border border-line/15 rounded-lg shadow-2xl p-1">
                    <div data-dz-route-menu>
                        <MenuItemList items={menuItems} close={() => setMenuAt(null)} />
                    </div>
                </AnchoredMenu>
            )}

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
