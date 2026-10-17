/**
 * deep-zoom/components/SmoothDialog.tsx - the Smooth... dialog of the Route tab: the smoothing pass with its
 * options, the pace graph, the progress while the rays are read, and the close keyframes.
 *
 * Every rule lives elsewhere: the dialog's logic in deep-zoom/smoothDialog.ts (what is smoothed, the
 * strength's scale, the readings and the run), the pass in deep-zoom/route.ts (`smoothRoute`, one
 * animation-undo step), its rules in deep-zoom/routeSmooth.ts. The options are the owner's calls of
 * 2026-10-16 (plans/deep-zoom-shell/SMOOTHING.md, "The tool, as decided"), from the top:
 *   - WHAT: the whole route, the legs selected (the Route tab's rows, else the route's keys selected on the
 *     timeline: the first to the last, every leg between) or a frame range (the legs that hold it).
 *   - PACE BY: the route's own picture (the default), the picture with the free look on top, the path alone.
 *   - STRENGTH: one log slider from 4 s to the length of what is smoothed; its far end is one even pace.
 *   - THE MISS ALLOWED at a keyframe and THE FREE LOOK'S SMOOTHING: each a slider with a box to switch it
 *     off (off: every keyframe exact; the look carried as it is).
 *   - THE PACE GRAPH: how fast the middle of the picture moves along the route (picture heights a second,
 *     log), what is smoothed shaded; after a pass the route before it in gray, as it is now in colour, and
 *     the study's score under it (frames off their own 3 s average by over 25 %). The route is read when
 *     the dialog opens and whenever it changes (not while it plays): about 4 s for the owner's 192 s route.
 *   - THE PROGRESS LINE while anything is read, with Cancel; the page stays usable (the reader works in
 *     tasks of 50 ms, the camera back on its view at the end of each).
 *   - CLOSE KEYFRAMES: legs under half a second, a warning, and Merge (his: "warn, merge"; one undo step;
 *     never a K keyframe, never an end).
 *
 * THE SEAM: `RoutePanel` mounts it while it is open and hands it the rows selected. A DraggableWindow, as
 * the render dialog is: the route, the timeline and the Route tab stay usable beside it (Play, select rows,
 * undo on the timeline), and it follows whatever the route becomes. ESCAPE CLOSES IT, except while a pass
 * runs (Cancel is for that), and it is never open beside the render dialog: opening either closes the
 * other (`RoutePanel`). The owner, STREAMLINE.md A11 / F answers, 2026-10-17. Its settings start afresh
 * when it opens again, as they always did.
 *
 * PITFALLS
 *   - IT LIVES IN THE ROUTE TAB: the dock showing another tab unmounts it, and that is Cancel (a pass stopped
 *     before it writes changes nothing; one that has written stands).
 *   - The signature of the route (`routeSignature`) is a string of every key: it is built when one of the
 *     tracks it reads changes, never on a render of its own.
 *   - A reading is not started while the timeline plays or a render runs, and one in flight stops when
 *     either begins: the reader would fight the playing route for the camera, task by task.
 *
 * @assumption The dialog's wiring (the controls to `runSmooth`'s options, the auto reading, Cancel, the graph
 *   and the Merge) is reached by no node check; its logic is (check:deep-zoom-route, "dialog: ..."). Driven in
 *   the real app on the GPU on 2026-10-17 with the owner's route, s7zzzooom (debug/scratch/s2/app-smooth.mts,
 *   git-ignored; headless Chrome, ANGLE d3d11, RTX 5070 Ti): read on opening in 3.9 s; the whole route at the
 *   defaults in 14.2 s (the pass and its rays 5.4 s, the route read after it 8.6 s while 103 keyframes were
 *   pictured again beside it), 192.0 -> 203.3 s, frames off 1,230 -> 248; keyframes 51 to 57 in 7.2 s, 10.5 ->
 *   12.5 s, nothing outside moved, inside 118 -> 18; an undo and a redo of each to the digit with no ray read and
 *   no picture taken; Cancel in the middle of the rays (the route to the digit, no step); Merge (5 of 6 close
 *   keyframes, one step); the pin; Draft at 320p. THE PAGE while it runs: the reader's tasks leave a timer a
 *   turn every 78 ms (median; 158 at p99); the longest task, the pass's writing, 0.5 s.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAnimationStore } from '../../store/animationStore';
import DraggableWindow from '../../components/DraggableWindow';
import Button from '../../components/Button';
import Dropdown from '../../components/Dropdown';
import { BaseSlider } from '../../components/Slider';
import { createLogMapping } from '../../components/inputs/primitives/FormatUtils';
import { z } from '../../components/ui/zIndex';
import { showToast } from '../../engine/store/toastStore';
import { LOOK_TRACKS, ROUTE_ITERATIONS_TRACK, ROUTE_PACE_TRACK, ROUTE_TRACK, closeKeyframes, lookKeyed, mergeCloseKeyframes, routeKeys, useRoute } from '../route';
import type { PaceBy } from '../route';
import { CLOSE_LEG_SECONDS } from '../routeSmooth';
import {
    EVEN, LOOK_SMOOTHING, MISS, closeRows, keyframeMap, knownPace, lastSmoothRun, paceColumns, paceRange, readPace, routeSignature, runSmooth, smoothSpan,
    strayFrames, strengthFor, strengthFromSlider, strengthScale, strengthText, timelinePicked,
} from '../smoothDialog';
import type { PaceReading, SmoothPhase, SmoothRun, SmoothScope, Strength } from '../smoothDialog';

const PACE_BY: Array<{ value: PaceBy; label: string; title: string }> = [
    { value: 'route', label: 'The route\'s own picture', title: 'The middle of the picture the route itself shows, the free look not counted: a look recorded afterwards never retimes the route' },
    { value: 'look', label: 'The picture with the free look', title: 'The middle of what is shown with the free look on top: the steadiest on screen, but the look then sets the route\'s timing' },
    { value: 'path', label: 'The path alone', title: 'The middle of the picture looking where the camera goes: no aim counts' },
];
const PHASE_WORDS: Record<SmoothPhase | 'graph', string> = {
    graph: 'Reading the pace along the route',
    before: 'Reading the route before the pass',
    pass: 'Smoothing: reading the rays',
    after: 'Reading the route after the pass',
};
/** Holds the score's line while there is nothing to say yet (a no-break space). */
const KEEP_LINE = String.fromCharCode(160);
const GRAPH_W = 368, GRAPH_H = 96, GRAPH_LEFT = 22;

interface Work { phase: SmoothPhase | 'graph'; done: number; of: number }
type Outcome = { kind: 'done'; run: SmoothRun; what: string } | { kind: 'cancelled' } | { kind: 'nothing' };

const plural = (n: number, one: string, many = `${one}s`): string => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/**
 * The pace graph over a window of the route (`win`: frames from its first keyframe, in its timing now), log upward.
 * `beforeAt` places the reading before a pass on that timing, through the keyframes (`keyframeMap`): the two lines
 * meet at every keyframe. `shade`: what is smoothed; `marks`: keyframes to tick (a zoomed window only).
 */
const PaceGraph: React.FC<{
    before: PaceReading | null; beforeAt?: (i: number) => number; now: PaceReading | null;
    win: [number, number]; shade: [number, number] | null; marks: number[]; fps: number;
}> = ({ before, beforeAt, now, win, shade, marks, fps }) => {
    const width = GRAPH_W - GRAPH_LEFT, [lo, hi] = win;
    const colsBefore = useMemo(() => (before ? paceColumns(before.speed, width, lo, hi, beforeAt) : null), [before, beforeAt, lo, hi, width]);
    const colsNow = useMemo(() => (now ? paceColumns(now.speed, width, lo, hi) : null), [now, lo, hi, width]);
    const range = useMemo(() => paceRange(...[colsBefore, colsNow].filter((c): c is Float64Array => !!c)), [colsBefore, colsNow]);
    const y = (v: number): number => GRAPH_H - 4 - ((Math.log(v) - Math.log(range.lo)) / (Math.log(range.hi) - Math.log(range.lo))) * (GRAPH_H - 8);
    const path = (cols: Float64Array | null): string => {
        if (!cols) return '';
        let d = '', pen = false;
        cols.forEach((v, c) => {
            if (!(v > 0)) { pen = false; return; }
            d += `${pen ? 'L' : 'M'}${(GRAPH_LEFT + c + 0.5).toFixed(1)},${y(v).toFixed(1)}`;
            pen = true;
        });
        return d;
    };
    const x = (frame: number): number => GRAPH_LEFT + ((frame - lo) * width) / Math.max(1, hi - lo);
    const ticks = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10].filter((v) => v > range.lo && v < range.hi);
    const seconds = (frame: number): string => `${(frame / fps).toFixed(hi - lo < 60 * fps ? 1 : 0)} s`;
    const shown = shade && [Math.max(lo, shade[0]), Math.min(hi, shade[1])];
    return (
        <svg data-dz-smooth-graph width={GRAPH_W} height={GRAPH_H} className="block bg-surface-sunken rounded border border-line/10" role="img"
            aria-label="How fast the middle of the picture moves along the route">
            {shown && shown[1] > shown[0] && <rect x={x(shown[0])} y={0} width={Math.max(1, x(shown[1]) - x(shown[0]))} height={GRAPH_H} className="fill-accent-500/15" />}
            {shade && [shade[0], shade[1]].filter((s) => s > lo && s < hi).map((s, i) => <line key={i} x1={x(s)} x2={x(s)} y1={0} y2={GRAPH_H} className="stroke-accent-500/60" strokeWidth={1} />)}
            {ticks.map((v) => (
                <g key={v}>
                    <line x1={GRAPH_LEFT} x2={GRAPH_W} y1={y(v)} y2={y(v)} className="stroke-line/10" strokeWidth={1} />
                    <text x={GRAPH_LEFT - 3} y={y(v) + 3} textAnchor="end" className="fill-fg-faint" fontSize={8}>{v}</text>
                </g>
            ))}
            {marks.map((m) => <line key={m} x1={x(m)} x2={x(m)} y1={GRAPH_H - 4} y2={GRAPH_H} className="stroke-fg-faint" strokeWidth={1} />)}
            {(before || now) && <text x={GRAPH_LEFT + 2} y={10} className="fill-fg-faint" fontSize={8}>{seconds(lo)}</text>}
            {(before || now) && <text x={GRAPH_W - 3} y={10} textAnchor="end" className="fill-fg-faint" fontSize={8}>{seconds(hi)}</text>}
            <path d={path(colsBefore)} fill="none" className="stroke-fg-faint" strokeWidth={1} data-dz-smooth-graph-before={before ? '' : undefined} />
            <path d={path(colsNow)} fill="none" className="stroke-accent-400" strokeWidth={1.25} data-dz-smooth-graph-now={now ? '' : undefined} />
        </svg>
    );
};

/** A box that switches an optional slider on and off, and the slider. */
const Optional: React.FC<{ on: boolean; setOn: (on: boolean) => void; label: string; title: string; disabled?: boolean; name: string; children: React.ReactNode }> = ({ on, setOn, label, title, disabled, name, children }) => (
    <div className={disabled ? 'opacity-50' : ''} title={title}>
        <label className="flex items-center gap-1.5 t-label cursor-pointer select-none">
            <input type="checkbox" data-dz-smooth-option={name} checked={on && !disabled} disabled={disabled} onChange={(e) => setOn(e.target.checked)} className="accent-accent-500" />
            {label}
        </label>
        {on && !disabled && <div className="pl-5 pt-0.5">{children}</div>}
    </div>
);

export const SmoothDialog: React.FC<{ picked: readonly string[]; onClose: () => void }> = ({ picked, onClose }) => {
    // The route's tracks: the dialog follows whatever the route becomes (a pass, an undo, an edit in the Route tab).
    const depth = useAnimationStore((s) => s.sequence.tracks[ROUTE_TRACK]);
    const pace = useAnimationStore((s) => s.sequence.tracks[ROUTE_PACE_TRACK]);
    const iters = useAnimationStore((s) => s.sequence.tracks[ROUTE_ITERATIONS_TRACK]);
    const look0 = useAnimationStore((s) => s.sequence.tracks[LOOK_TRACKS[0]]);
    const look1 = useAnimationStore((s) => s.sequence.tracks[LOOK_TRACKS[1]]);
    const look2 = useAnimationStore((s) => s.sequence.tracks[LOOK_TRACKS[2]]);
    const fps = useAnimationStore((s) => s.fps);
    const playing = useAnimationStore((s) => s.isPlaying);
    const onTimeline = useAnimationStore((s) => s.selectedKeyframeIds);
    const rendering = useRoute((s) => s.rendering);
    const keys = routeKeys();
    const looked = lookKeyed();

    const fromTimeline = useMemo(() => timelinePicked(onTimeline), [onTimeline]);
    const rows = picked.filter((id) => keys.some((k) => k.id === id));
    const legsFrom: 'tab' | 'timeline' | null = rows.length >= 2 ? 'tab' : fromTimeline.length >= 2 ? 'timeline' : null;
    const legIds = legsFrom === 'tab' ? rows : legsFrom === 'timeline' ? fromTimeline : [];

    const [scope, setScope] = useState<SmoothScope>(() => (legsFrom ? 'legs' : 'route'));
    const [frames, setFrames] = useState<[number, number]>(() => [keys[0]?.frame ?? 0, keys[keys.length - 1]?.frame ?? 0]);
    const [typed, setTyped] = useState<[string | null, string | null]>([null, null]);
    const [paceBy, setPaceBy] = useState<PaceBy>('route');
    const [strength, setStrength] = useState<Strength>(4);
    const [missOn, setMissOn] = useState(true);
    const [miss, setMiss] = useState<number>(MISS.initial);
    const [lookOn, setLookOn] = useState(true);
    const [lookSec, setLookSec] = useState<number>(LOOK_SMOOTHING.initial);
    const [work, setWork] = useState<Work | null>(null);
    const [busy, setBusy] = useState(false);
    const [outcome, setOutcome] = useState<Outcome | null>(null);
    const [, setReadings] = useState(0);
    /** The route (its signature) whose reading Cancel stopped: not read again by itself until the route changes. */
    const [stoppedAt, setStoppedAt] = useState<string | null>(null);
    const runCtl = useRef<AbortController | null>(null), graphCtl = useRef<AbortController | null>(null);

    const span = smoothSpan(keys, scope, legIds, frames, fps);
    const seconds = span?.seconds ?? 0;
    const scale = strengthScale(seconds);
    const mapping = useMemo(() => createLogMapping(scale.min, Math.max(scale.max, scale.min * 1.0001), { reserveZero: false }), [scale.min, scale.max]);
    // What the route is, for the readings: built when one of its tracks changes (a string of every key), not every render.
    const sig = useMemo(() => routeSignature(paceBy), [depth, pace, iters, paceBy, fps, look0, look1, look2]);
    const now = knownPace(paceBy, sig);
    const last = lastSmoothRun();
    const before = last && last.afterSig === sig && last.before?.by === paceBy ? last.before : null;
    const close = useMemo(() => closeRows(keys, closeKeyframes(), fps), [depth, fps]);

    // The route as it stands is read when there is no reading of it: on opening, after a pass or an undo, for another
    // "Pace by". Not while it plays or renders, nor during a run (which reads for itself).
    useEffect(() => {
        if (busy || now || keys.length < 2 || playing || rendering || stoppedAt === sig) return;
        const ctl = new AbortController();
        graphCtl.current = ctl;
        const wait = setTimeout(() => {
            setWork({ phase: 'graph', done: 0, of: 1 });
            void readPace(paceBy, (done, of) => { if (!ctl.signal.aborted) setWork({ phase: 'graph', done, of }); }, ctl.signal).then(() => {
                // Stopped (Cancel, a run, playback): its line goes - a run's own line is left to the run.
                setWork((w) => (w?.phase === 'graph' ? null : w));
                if (!ctl.signal.aborted) setReadings((n) => n + 1);
            });
        }, 300);
        return () => { clearTimeout(wait); ctl.abort(); setWork((w) => (w?.phase === 'graph' ? null : w)); };
    }, [sig, busy, !!now, playing, rendering, keys.length >= 2, stoppedAt]);
    // Closing the dialog (or the Route tab going away) is Cancel.
    useEffect(() => () => { runCtl.current?.abort(); graphCtl.current?.abort(); }, []);

    const what = !span ? '' : scope === 'route' ? 'the whole route'
        : `keyframes ${span.a + 1} to ${span.b + 1}`;
    const smooth = async (): Promise<void> => {
        if (!span || busy) return;
        graphCtl.current?.abort();
        const ctl = new AbortController();
        runCtl.current = ctl;
        setBusy(true);
        setOutcome(null);
        const run = await runSmooth({
            strength: strengthFor(strength, seconds), miss: missOn ? miss : null, look: lookOn && looked ? lookSec : null, paceBy, ...(span.range ? { range: span.range } : {}),
        }, (phase, done, of) => setWork({ phase, done, of }), ctl.signal);
        runCtl.current = null;
        setBusy(false);
        setWork(null);
        setReadings((n) => n + 1);
        setOutcome(run ? { kind: 'done', run, what } : ctl.signal.aborted ? { kind: 'cancelled' } : { kind: 'nothing' });
    };
    const cancel = (): void => {
        if (!runCtl.current && work?.phase === 'graph') setStoppedAt(sig);  // the graph's own reading: not started again by itself
        runCtl.current?.abort();
        graphCtl.current?.abort();
    };
    const merge = (): void => {
        const gone = mergeCloseKeyframes(CLOSE_LEG_SECONDS);
        showToast(gone.length > 0 ? `${plural(gone.length, 'close keyframe')} merged. One undo on the timeline brings ${gone.length === 1 ? 'it' : 'them'} back` : 'No close keyframe could be merged: each leg has a K keyframe or an end on both sides', gone.length > 0 ? 'success' : 'info', 5000);
    };
    const frameField = (i: 0 | 1): React.ReactNode => (
        <input
            type="text"
            inputMode="numeric"
            data-dz-smooth-frame={i === 0 ? 'from' : 'to'}
            value={typed[i] ?? String(frames[i])}
            onChange={(e) => setTyped((t) => (i === 0 ? [e.target.value, t[1]] : [t[0], e.target.value]))}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={() => {
                const v = Number((typed[i] ?? '').trim());
                if (typed[i] !== null && Number.isFinite(v)) setFrames((f) => (i === 0 ? [Math.round(v), f[1]] : [f[0], Math.round(v)]));
                setTyped((t) => (i === 0 ? [null, t[1]] : [t[0], null]));
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
            className="w-14 h-5 px-1 rounded bg-surface-sunken border border-line/10 text-fg font-mono tabular-nums text-[10px]"
        />
    );

    // The graph: the whole route, or what is smoothed with room each side (half its length, 5 s at least) to see its edges.
    const first = keys[0]?.frame ?? 0, total = keys.length > 1 ? keys[keys.length - 1].frame - first : 0;
    const shade: [number, number] | null = span ? [keys[span.a].frame - first, keys[span.b].frame - first] : null;
    const part = !!span && scope !== 'route' && (span.a > 0 || span.b < keys.length - 1);
    const pad = span ? Math.max(5 * fps, span.frames / 2) : 0;
    const win: [number, number] = part && shade ? [Math.max(0, shade[0] - pad), Math.min(total, shade[1] + pad)] : [0, Math.max(1, total)];
    const marks = part ? keys.map((k) => k.frame - first).filter((f) => f > win[0] && f < win[1]) : [];
    const beforeAt = useMemo(() => {
        if (!before || !last || !now) return undefined;
        const m = keyframeMap(last.framesBefore, last.framesAfter);
        return (i: number): number => m(before.first + i) - now.first;
    }, [before, last, now]);
    const strayNow = useMemo(() => (now ? strayFrames(now.speed, now.fps) : null), [now]);
    const strayBefore = useMemo(() => (before ? strayFrames(before.speed, before.fps) : null), [before]);
    // A part of the route: its own frames off too, before (in its old frames) and now.
    const inNow = useMemo(() => (now && part && shade ? strayFrames(now.speed, now.fps, shade[0], shade[1]) : null), [now, part, shade?.[0], shade?.[1]]);
    const inBefore = useMemo(() => {
        if (!before || !last || !part || !span) return null;
        const f0 = last.framesBefore[0];
        return strayFrames(before.speed, before.fps, last.framesBefore[span.a] - f0, last.framesBefore[span.b] - f0);
    }, [before, last, part, span?.a, span?.b]);
    const share = work && work.of > 0 ? Math.min(1, work.done / work.of) : 0;
    const off = busy || rendering;

    return (
        <DraggableWindow title="Smooth the route" onClose={onClose} dismissOnEscape={!busy} initialPos={{ x: 300, y: 64 }} zIndex={z('tool')}
            initialSize={{ width: 396, height: Math.max(420, Math.min(780, window.innerHeight - 96)) }}>
            <div data-dz-smooth className="flex flex-col h-full text-[10px] text-fg-tertiary">
                <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-2.5">
                    <fieldset disabled={off} className="space-y-2.5 min-w-0">
                        <div>
                            <div className="t-label mb-1">What is smoothed</div>
                            <div className="flex gap-1">
                                <Button size="small" label="Whole route" active={scope === 'route'} data-dz-smooth-scope="route" onClick={() => setScope('route')}
                                    title="Every leg of the route" />
                                <Button size="small" label="Selected legs" active={scope === 'legs'} data-dz-smooth-scope="legs" onClick={() => setScope('legs')}
                                    title="The legs from the first keyframe selected to the last: rows of the Route tab (click, Shift-click), or the route's keys on the timeline" />
                                <Button size="small" label="Frames" active={scope === 'frames'} data-dz-smooth-scope="frames" onClick={() => setScope('frames')}
                                    title="A range of the timeline's frames: the legs that hold it are smoothed" />
                            </div>
                            {scope === 'frames' && (
                                <div className="flex items-center gap-1 pt-1.5">
                                    frames {frameField(0)} to {frameField(1)}
                                </div>
                            )}
                            <div data-dz-smooth-what className="pt-1 leading-snug">
                                {span ? (
                                    <>
                                        <span className="text-fg-secondary">{scope === 'route' ? 'The whole route' : `Keyframes ${span.a + 1} to ${span.b + 1}`}</span>
                                        {' '}· {plural(span.b - span.a, 'leg')} · {seconds.toFixed(1)} s
                                        {scope === 'legs' && legsFrom === 'timeline' && ' (selected on the timeline)'}
                                        {scope === 'frames' && ' (the legs that hold the frames)'}
                                    </>
                                ) : scope === 'legs' ? (
                                    <span className="text-warn">Select two keyframes or more: rows in the Route tab, or the route's keys on the timeline.</span>
                                ) : scope === 'frames' ? (
                                    <span className="text-warn">No leg lies in those frames.</span>
                                ) : (
                                    <span className="text-warn">The route needs two keyframes.</span>
                                )}
                            </div>
                            <div className="pt-0.5 text-fg-faint leading-snug">Pauses inside are smoothed too: to keep one, leave its legs out.</div>
                        </div>

                        <Dropdown<PaceBy>
                            label="Pace by"
                            value={paceBy}
                            onChange={setPaceBy}
                            options={PACE_BY.map((p) => ({ value: p.value, label: p.label }))}
                        />

                        <div data-dz-smooth-strength title="How long a change of pace may take: the pace is averaged over this. At the far end, one even pace over what is smoothed.">
                            <BaseSlider
                                label="Strength"
                                value={strengthFor(strength, seconds) || scale.min}
                                min={scale.min}
                                max={Math.max(scale.max, scale.min * 1.0001)}
                                step={0.01}
                                mapping={mapping}
                                overrideText={span ? strengthText(strength, seconds) : '-'}
                                disabled={!scale.slides}
                                onChange={(v) => setStrength(strengthFromSlider(v, seconds))}
                            />
                        </div>

                        <Optional name="miss" on={missOn} setOn={setMissOn} label="Keyframe aims may move"
                            title="Off: every keyframe's aim stays exact. On: a keyframe's aim may move by this much to smooth the turn; keyframes with the K mark (the pin on their row) and the two ends of what is smoothed stay exact.">
                            <BaseSlider label="By up to" value={miss} min={MISS.min} max={MISS.max} step={0.5} overrideText={`${miss.toFixed(1)}°`} onChange={setMiss} />
                        </Optional>
                        <Optional name="look" on={lookOn} setOn={setLookOn} label={looked ? 'Smooth the free look' : 'Smooth the free look (none is recorded)'} disabled={!looked}
                            title="The recorded free look goes with the route either way. On, it is also smoothed over this many seconds: 0.5 s moved it by 5 degrees at most on the owner's route; 1 s flattens a quick glance.">
                            <BaseSlider label="Over" value={lookSec} min={LOOK_SMOOTHING.min} max={LOOK_SMOOTHING.max} step={0.1} overrideText={`${lookSec.toFixed(1)} s`} onChange={setLookSec} />
                        </Optional>
                    </fieldset>

                    <div>
                        <div className="t-label mb-1 flex justify-between">
                            <span>Pace along the route</span>
                            <span className="font-normal text-fg-faint">{part ? 'around what is smoothed · ' : ''}picture heights a second</span>
                        </div>
                        <PaceGraph before={before} beforeAt={beforeAt} now={now} win={win} shade={shade} marks={marks} fps={fps} />
                        <div className="flex gap-3 pt-1 text-[9px]">
                            {before && <span className="flex items-center gap-1"><span className="inline-block w-3 h-px bg-fg-faint" />before the pass</span>}
                            <span className="flex items-center gap-1"><span className="inline-block w-3 h-px bg-accent-400" />{before ? 'now' : 'the route'}</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 bg-accent-500/15 border-x border-accent-500/50" />smoothed</span>
                        </div>
                        <div data-dz-smooth-score className="pt-1 leading-snug" title="Frames where the middle of the picture strays over 25 % from its own 3 s average: the score the study judged a timing by">
                            {strayNow === null ? (now !== null || work ? KEEP_LINE : stoppedAt === sig ? 'Reading the pace was cancelled: Smooth reads it first.'
                                : 'The pace is read when the route is not playing.')
                                : <>
                                    Off their own 3 s average by over 25 %:{' '}
                                    <span className="font-mono text-fg-secondary">{strayBefore !== null ? `${plural(strayBefore, 'frame')} -> ${strayNow.toLocaleString('en-US')}` : plural(strayNow, 'frame')}</span>
                                    {inNow !== null && <>, in what is smoothed <span className="font-mono text-fg-secondary">{inBefore !== null ? `${inBefore.toLocaleString('en-US')} -> ` : ''}{inNow.toLocaleString('en-US')}</span></>}
                                </>}
                        </div>
                        <div className="pt-0.5 text-fg-faint leading-snug">A pass cannot smooth what lies outside what is smoothed: an edge on a rough stretch stays as rough.</div>
                    </div>

                    {close.length > 0 && (
                        <div data-dz-smooth-close className="px-2 py-1.5 rounded border border-warn/30 space-y-1">
                            <div className="text-warn font-bold">{plural(close.length, 'leg')} under {CLOSE_LEG_SECONDS} s</div>
                            <div className="leading-snug">
                                {close.map((c, i) => (
                                    <span key={c.id} className={c.merge ? '' : 'text-fg-faint'} title={c.merge ? undefined : 'Both of its keyframes are K keyframes or ends: a merge leaves it'}>
                                        {i > 0 && ', '}{c.number - 1}-{c.number} <span className="font-mono">{c.seconds.toFixed(2)} s</span>
                                    </span>
                                ))}
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="flex-1 leading-snug text-fg-faint">Merge drops one keyframe of each (never a K one or an end): the one whose loss moves the path least. At a wall pass that costs the picture its pace.</span>
                                <Button size="small" label="Merge" className="!flex-none" data-dz-smooth-merge disabled={off || !close.some((c) => c.merge)} onClick={merge}
                                    title="Merge the close keyframes, in one undo step" />
                            </div>
                        </div>
                    )}
                </div>

                {/* The footer: what is going on (or what the last run did), and the one button. Out of the scroll, so it is always seen. */}
                <div className="p-1.5 bg-surface-sunken/50 border-t border-line/10 shrink-0 space-y-1.5">
                    {work ? (
                        <div data-dz-smooth-progress className="space-y-1 px-0.5">
                            <div className="flex justify-between">
                                <span>{work.phase === 'pass' && work.done >= work.of && work.of > 1 ? 'Smoothing: writing the route' : PHASE_WORDS[work.phase]}</span>
                                <span className="font-mono text-accent-300">{Math.round(share * 100)} %</span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-sunken rounded-full overflow-hidden border border-line/10">
                                <div className="h-full bg-accent-500" style={{ width: `${share * 100}%` }} />
                            </div>
                        </div>
                    ) : outcome && (
                        <div data-dz-smooth-outcome className="leading-snug px-0.5">
                            {outcome.kind === 'cancelled' ? 'Cancelled: nothing changed.'
                                : outcome.kind === 'nothing' ? 'Nothing was smoothed: the route changed while its rays were read, a render began, or there is no renderer.'
                                    : <Done run={outcome.run} what={outcome.what} />}
                        </div>
                    )}
                    <div className="flex gap-1">
                    {work ? (
                        <Button label="Cancel" data-dz-smooth-cancel onClick={cancel} fullWidth title={busy && work.phase === 'after' ? 'Stop reading the route after the pass: the pass stays' : 'Stop: nothing changes'} />
                    ) : (
                        <Button label={span ? `Smooth ${what}` : 'Smooth'} variant="primary" fullWidth data-dz-smooth-run disabled={!span || off}
                            onClick={() => { void smooth(); }} title="Run the pass: one undo on the timeline takes it back" />
                    )}
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

/** What a pass did, in a line or two. */
const Done: React.FC<{ run: SmoothRun; what: string }> = ({ run, what }) => {
    const moved = run.result.aimsMoved.filter((m) => m > 0), most = moved.length > 0 ? Math.max(...moved) : 0;
    return (
        <>
            <span className="text-fg-secondary">Smoothed {what}:</span>{' '}
            <span className="font-mono">{run.result.seconds[0].toFixed(1)} s -&gt; {run.result.seconds[1].toFixed(1)} s</span>.{' '}
            {moved.length > 0 ? `${plural(moved.length, 'aim')} moved, by ${most.toFixed(1)}° at most.` : 'No aim moved.'}{' '}
            {!run.after && 'The route was not read after it. '}One undo on the timeline brings the route back.
        </>
    );
};
