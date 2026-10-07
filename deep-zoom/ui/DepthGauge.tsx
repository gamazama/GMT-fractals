/**
 * deep-zoom/ui/DepthGauge.tsx — the always-visible depth instrument on the left edge, plus the
 * small "chrome" store the TopBar and the gauge share.
 *
 * PURPOSE
 *   - `DepthGauge`: the depth readout (surface distance as mantissa-e-exponent, decades to the
 *     1e-77 floor, magnification, yardstick, fall rate), the "Dive to 1e-N" row, and a log scale
 *     from 1e0 to 1e-77 with engine marks, yardsticks, bookmarks and the loaded path's span.
 *   - `useDzChrome`: shell state the contract store (`../store`) does not carry — mouse captured,
 *     overlay mode, home view, back view, deepest depth this session, the running dive, and the
 *     render progress line. It lives here because this slot owns only two files; the shell and
 *     other slots may import it.
 *   - `dzActions`: the shared procedures (go to a view, home, back, dive, record a dive, bookmark,
 *     cycle overlays, focus the dive field) for the shell's shortcut handler to call.
 *   - `fmtDepth` / `fmtDepthCompact` / `decadesToFloor`: the shared depth formats.
 *
 * INTEGRATION SEAMS
 *   - Reads `useDeepZoom` (bridge, telemetry, bookmarks, path); writes `path`, `panel`, `say`.
 *   - The shell (`../DeepZoomApp`) calls `dzActions.*` from its keydown handler: Home -> goHome,
 *     Backspace -> goBack, J -> focusDive, H -> cycleOverlay, B -> bookmark.
 *   - The shell also calls `useDzChrome.getState().setRenderInfo({ frame, total })` while a path
 *     render runs (and `null` after), read from the core's hidden progress box, so the TopBar and
 *     the Record panel can show 'frame 212/300'.
 *   - `deep-zoom:back-view` (a window CustomEvent, detail = DzView) sets the Back view; the
 *     Locations panel and the first-run guide send it before they move the camera.
 *
 * PITFALLS
 *   - Nothing here repaints while the picture is still: the telemetry subscription only sets
 *     React state when a rounded value changes, so the core's still can converge undisturbed.
 *   - Never call a bridge method during render; every call below is in a handler or an effect.
 *   - The gauge root is pointer-events-none; only the readout, the dive row and the 56 px scale
 *     column take clicks, so the picture keeps the rest of the left edge.
 */
import React, { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import type { DzView } from '../bridge';
import { useDeepZoom } from '../store';
import type { Bookmark } from '../store';

// ---------------------------------------------------------------------------------------------
// Shared formats
// ---------------------------------------------------------------------------------------------

export const FLOOR_EXP = 77;

export function validDepth(d: number | null | undefined): d is number {
    return typeof d === 'number' && Number.isFinite(d) && d > 0;
}

/** 6.40e-53 */
export function fmtDepth(d: number | null | undefined): string {
    if (!validDepth(d)) return '—';
    return d.toExponential(2).replace('e+', 'e');
}

/** 6e-53 (chips, list rows, titles) */
export function fmtDepthCompact(d: number | null | undefined): string {
    if (!validDepth(d)) return '—';
    return d.toExponential(0).replace('e+', 'e');
}

/** 77 + log10(depth), never below 0. */
export function decadesToFloor(d: number): number {
    return Math.max(0, FLOOR_EXP + Math.log10(d));
}

/** The whole-number exponent of a depth: 6.4e-53 -> 53. */
function exponentOf(d: number): number {
    return Math.max(0, -Math.floor(Math.log10(d)));
}

// ---------------------------------------------------------------------------------------------
// Chrome store (shell state the contract store lacks)
// ---------------------------------------------------------------------------------------------

export interface DzDive {
    from: number;
    to: number;
    recording: boolean;
}

export interface DzRenderInfo {
    frame: number;
    total: number;
}

export interface DzChromeState {
    /** Pointer lock is held by the renderer's document. */
    captured: boolean;
    /** 0 = everything, 1 = depth readout only, 2 = nothing. */
    overlayMode: 0 | 1 | 2;
    homeView: DzView | null;
    backView: DzView | null;
    /** Smallest surface distance seen this session. */
    deepest: number | null;
    dive: DzDive | null;
    /** 'Arrived · 1.00e-40' / 'Stopped at 3.10e-22', shown for 3 s. */
    diveResult: string | null;
    renderInfo: DzRenderInfo | null;
    /** Bumped to ask the gauge to open and focus its dive field. */
    diveFocusTick: number;
    setRenderInfo(r: DzRenderInfo | null): void;
    setOverlayMode(m: 0 | 1 | 2): void;
}

export const useDzChrome = create<DzChromeState>((set) => ({
    captured: false,
    overlayMode: 0,
    homeView: null,
    backView: null,
    deepest: null,
    dive: null,
    diveResult: null,
    renderInfo: null,
    diveFocusTick: 0,
    setRenderInfo: (renderInfo) => set({ renderInfo }),
    setOverlayMode: (overlayMode) => set({ overlayMode }),
}));

let diveResultTimer: number | undefined;

function showDiveResult(msg: string): void {
    useDzChrome.setState({ diveResult: msg });
    if (diveResultTimer !== undefined) window.clearTimeout(diveResultTimer);
    diveResultTimer = window.setTimeout(() => useDzChrome.setState({ diveResult: null }), 3000);
}

function goToView(view: DzView): void {
    const { bridge } = useDeepZoom.getState();
    if (!bridge) return;
    try {
        useDzChrome.setState({ backView: bridge.getView() });
        bridge.setView(view);
        bridge.focus();
    } catch (e) {
        useDeepZoom.getState().say('Could not go to that view: ' + (e instanceof Error ? e.message : String(e)));
    }
}

async function dive(targetDepth: number, record: boolean): Promise<void> {
    const dz = useDeepZoom.getState();
    const bridge = dz.bridge;
    if (!bridge || useDzChrome.getState().dive) return;
    // Never below 1e-76 (the floor is 1e-77), whatever the caller passed.
    const target = Math.max(targetDepth, 1e-76);
    const from = dz.telemetry && validDepth(dz.telemetry.depth) ? dz.telemetry.depth : 1;
    let startedRecording = false;
    try {
        useDzChrome.setState({ backView: bridge.getView(), dive: { from, to: target, recording: record }, diveResult: null });
        if (record && !bridge.recording()) {
            bridge.recordToggle();
            startedRecording = true;
        }
        bridge.focus(); // so Esc and the fly keys reach the core and can cancel
        await bridge.diveTo(target);
    } catch (e) {
        dz.say('Dive failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
        useDzChrome.setState({ dive: null });
    }
    try {
        if (record) {
            if (bridge.recording() && (startedRecording || record)) bridge.recordToggle();
            const p = JSON.parse(JSON.stringify(bridge.lastPath())) as ReturnType<typeof bridge.lastPath>;
            if (!p || !Array.isArray(p.frames) || p.frames.length < 2) {
                dz.say('No keys were recorded. Press M and fly it by hand.');
            } else {
                dz.setPath(p);
            }
            dz.setPanel('record');
        }
        const d = bridge.telemetry().depth;
        if (validDepth(d)) {
            const ratio = d / target;
            showDiveResult(ratio < 3 && ratio > 1 / 3 ? 'Arrived · ' + fmtDepth(d) : 'Stopped at ' + fmtDepth(d));
        }
    } catch (e) {
        dz.say('Dive ended with an error: ' + (e instanceof Error ? e.message : String(e)));
    }
}

/** Shared procedures. Safe to call with no bridge (they do nothing). */
export const dzActions = {
    goToView,
    goHome(): void {
        const h = useDzChrome.getState().homeView;
        if (h) goToView(h);
    },
    goBack(): void {
        const b = useDzChrome.getState().backView;
        if (b) goToView(b);
    },
    dive,
    cycleOverlay(): void {
        const m = useDzChrome.getState().overlayMode;
        useDzChrome.setState({ overlayMode: ((m + 1) % 3) as 0 | 1 | 2 });
    },
    focusDive(): void {
        const s = useDzChrome.getState();
        useDzChrome.setState({ diveFocusTick: s.diveFocusTick + 1, overlayMode: s.overlayMode === 2 ? 1 : s.overlayMode });
    },
    bookmark(): void {
        const dz = useDeepZoom.getState();
        const bridge = dz.bridge;
        if (!bridge) return;
        try {
            const depth = bridge.telemetry().depth;
            let thumb = '';
            try { thumb = bridge.thumbnail(128); } catch { /* a location without a picture is still a location */ }
            const now = Date.now();
            const b: Bookmark = {
                id: 'b' + now.toString(36) + Math.floor(Math.random() * 1e6).toString(36),
                name: 'View ' + fmtDepth(depth),
                createdAt: now,
                depth,
                thumb,
                view: bridge.getView(),
            };
            dz.addBookmark(b);
            dz.say('Saved · ' + fmtDepth(depth));
        } catch (e) {
            dz.say('Could not save this view: ' + (e instanceof Error ? e.message : String(e)));
        }
    },
};

// ---------------------------------------------------------------------------------------------
// Marks
// ---------------------------------------------------------------------------------------------

const YARDSTICKS: Array<{ exp: number; name: string }> = [
    { exp: 6, name: 'Milky Way' },
    { exp: 14, name: "Neptune's orbit" },
    { exp: 20, name: 'Earth' },
    { exp: 30, name: 'grain of sand' },
    { exp: 37, name: 'atom' },
    { exp: 42, name: 'proton' },
    { exp: 62, name: 'Planck length' },
];
const YARDSTICK_TITLE = 'If the bulb were the observable universe (8.8e26 m across).';

const ENGINE_MARKS: Array<{ exp: number; label: string }> = [
    { exp: 4, label: '1e-4 perturbation' },
    { exp: 50, label: '1e-50 certified' },
    { exp: 77, label: '1e-77 floor' },
];

const DECADE_TICKS = [10, 20, 30, 40, 60, 70];

const MILESTONES: Array<{ depth: number; text: string }> = [
    { depth: 1e-4, text: 'Perturbation on · 1e-4' },
    { depth: 1e-13, text: 'Past f64 · 1e-13' },
    { depth: 1e-30, text: 'Grain of sand · 1e-30' },
    { depth: 1e-50, text: 'Past certified depth · 1e-50' },
    { depth: 1e-62, text: 'Planck length · 1e-62' },
    { depth: 1e-76, text: 'Floor · 1e-77 is the end of the range' },
];
const milestonesSeen = new Set<number>();

function pct(exp: number): string {
    return (Math.min(FLOOR_EXP, Math.max(0, exp)) / FLOOR_EXP * 100).toFixed(2) + '%';
}

function yardstickFor(d: number): string {
    let name = '';
    for (const y of YARDSTICKS) if (d <= Math.pow(10, -y.exp)) name = y.name;
    return name;
}

// ---------------------------------------------------------------------------------------------
// Session tracking: pointer capture, home view, deepest depth, fall rate, milestones
// ---------------------------------------------------------------------------------------------

function useChromeSync(onPulse: () => void): number {
    const bridge = useDeepZoom((s) => s.bridge);
    const [rate, setRate] = useState(0);
    const pulseRef = useRef(onPulse);
    pulseRef.current = onPulse;

    // Mouse captured = pointer lock on the renderer's document.
    useEffect(() => {
        if (!bridge) return undefined;
        let doc: Document | null = null;
        try { doc = bridge.win.document; } catch { doc = null; }
        if (!doc) return undefined;
        const d = doc;
        const onLock = () => useDzChrome.setState({ captured: !!d.pointerLockElement });
        d.addEventListener('pointerlockchange', onLock);
        onLock();
        return () => {
            d.removeEventListener('pointerlockchange', onLock);
            useDzChrome.setState({ captured: false });
        };
    }, [bridge]);

    // The Locations panel and the first-run guide announce the view they are about to leave
    // (`deep-zoom:back-view`, detail = DzView) so Back / Backspace returns to it.
    useEffect(() => {
        const onBack = (e: Event) => {
            const v = (e as CustomEvent<DzView | null>).detail;
            if (v && Array.isArray(v.cam)) useDzChrome.setState({ backView: v });
        };
        window.addEventListener('deep-zoom:back-view', onBack);
        return () => window.removeEventListener('deep-zoom:back-view', onBack);
    }, []);

    // Home view: captured once, when the core first answers.
    useEffect(() => {
        if (!bridge || useDzChrome.getState().homeView) return;
        try { useDzChrome.setState({ homeView: bridge.getView() }); } catch { /* core not answering yet */ }
    }, [bridge]);

    useEffect(() => {
        const samples: Array<{ t: number; l: number }> = [];
        let last: number | null = null;
        const onSample = (d: number | undefined) => {
            if (!validDepth(d)) return;
            const now = performance.now();
            const l = Math.log10(d);
            samples.push({ t: now, l });
            while (samples.length > 2 && now - samples[0].t > 1100) samples.shift();
            const first = samples[0];
            const dt = (now - first.t) / 1000;
            const r = dt > 0.2 ? Math.round(((first.l - l) / dt) * 10) / 10 : 0; // + = falling
            setRate((prev) => (prev === r ? prev : r));

            const c = useDzChrome.getState();
            if (c.deepest === null || d < c.deepest) useDzChrome.setState({ deepest: d });

            // Milestones: the deepest newly crossed one speaks; shallower ones are marked seen.
            if (last !== null) {
                let text = '';
                for (const m of MILESTONES) {
                    if (d <= m.depth && !milestonesSeen.has(m.depth)) {
                        milestonesSeen.add(m.depth);
                        text = m.text;
                    }
                }
                if (text) {
                    useDeepZoom.getState().say(text);
                    pulseRef.current();
                }
            } else {
                // The opening view is not a crossing.
                for (const m of MILESTONES) if (d <= m.depth) milestonesSeen.add(m.depth);
            }
            last = d;
        };
        return useDeepZoom.subscribe((s, prev) => {
            if (s.telemetry !== prev.telemetry) onSample(s.telemetry?.depth);
        });
    }, []);

    return rate;
}

// ---------------------------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------------------------

const surface = 'bg-black/70 backdrop-blur-sm border border-white/10 rounded-md';
const smallBtn = 'h-7 px-2 rounded text-[12px] border border-white/15 text-zinc-200 hover:bg-white/10 '
    + 'disabled:text-zinc-600 disabled:hover:bg-transparent disabled:cursor-not-allowed';
const primaryBtn = 'h-7 px-2 rounded text-[12px] font-semibold bg-cyan-500 text-black hover:bg-cyan-400 '
    + 'disabled:bg-white/10 disabled:text-zinc-600 disabled:cursor-not-allowed';

export function DepthGauge(): React.ReactElement | null {
    const hasBridge = useDeepZoom((s) => s.bridge !== null);
    const depthRaw = useDeepZoom((s) => s.telemetry?.depth);
    const ready = useDeepZoom((s) => s.telemetry?.ready ?? false);
    const exporting = useDeepZoom((s) => s.telemetry?.exporting ?? false);
    const hasTelemetry = useDeepZoom((s) => s.telemetry !== null);
    const bookmarks = useDeepZoom((s) => s.bookmarks);
    const path = useDeepZoom((s) => s.path);

    const overlayMode = useDzChrome((s) => s.overlayMode);
    const deepest = useDzChrome((s) => s.deepest);
    const diveState = useDzChrome((s) => s.dive);
    const diveResult = useDzChrome((s) => s.diveResult);
    const diveFocusTick = useDzChrome((s) => s.diveFocusTick);

    const [pulse, setPulse] = useState(false);
    const pulseTimer = useRef<number | undefined>(undefined);
    const rate = useChromeSync(() => {
        setPulse(true);
        if (pulseTimer.current !== undefined) window.clearTimeout(pulseTimer.current);
        pulseTimer.current = window.setTimeout(() => setPulse(false), 600);
    });
    useEffect(() => () => {
        if (pulseTimer.current !== undefined) window.clearTimeout(pulseTimer.current);
    }, []);

    const [rowOpen, setRowOpen] = useState(false);
    const [expText, setExpText] = useState('16');
    const inputRef = useRef<HTMLInputElement | null>(null);

    const depth = validDepth(depthRaw) ? depthRaw : null;
    const curExp = depth !== null ? exponentOf(depth) : 0;

    const openRow = (exp?: number) => {
        const n = Math.min(76, Math.max(1, Math.round(exp ?? curExp + 12)));
        setExpText(String(n));
        setRowOpen(true);
        window.setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 0);
    };
    const closeRow = (refocus: boolean) => {
        setRowOpen(false);
        if (refocus) {
            try { useDeepZoom.getState().bridge?.focus(); } catch { /* frame gone */ }
        }
    };

    // J (through dzActions.focusDive) opens and focuses the dive field.
    const firstTick = useRef(diveFocusTick);
    useEffect(() => {
        if (diveFocusTick === firstTick.current) return;
        firstTick.current = diveFocusTick;
        openRow();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [diveFocusTick]);

    if (overlayMode === 2) return null;

    const n = Math.round(Number(expText));
    const nValid = /^\d+$/.test(expText.trim()) && n >= 1 && n <= 76;
    const target = nValid ? Math.pow(10, -n) : 0;
    let blocked = '';
    if (!hasBridge) blocked = 'The renderer has not started yet';
    else if (!nValid) blocked = 'Type a whole number from 1 to 76';
    else if (exporting) blocked = 'Rendering. Cancel to change the view.';
    else if (diveState) blocked = 'A dive is running. Esc stops it.';
    else if (n > 4 && !ready) blocked = 'waiting for shader';
    else if (depth !== null && target >= depth) blocked = 'Already deeper than 1e-' + n;

    const startDive = (record: boolean) => {
        if (blocked) return;
        setRowOpen(false);
        void dzActions.dive(target, record);
    };

    const decades = depth !== null ? decadesToFloor(depth) : 0;
    const yard = depth !== null ? yardstickFor(depth) : '';
    const absRate = Math.abs(rate);

    let status: React.ReactNode = null;
    if (depth !== null && depth <= 1e-74) {
        status = <div className="text-[11px] text-amber-400">floor 1e-77 · 256-bit reference ends here</div>;
    } else if (depth !== null && depth < 1e-50) {
        status = <div className="text-[11px] text-zinc-400">past certified depth (1e-50)</div>;
    }

    // Path span on the scale.
    let pathTop = -1;
    let pathBottom = -1;
    if (path && Array.isArray(path.frames)) {
        let lo = Infinity;
        let hi = 0;
        for (const f of path.frames) {
            if (validDepth(f.surf)) {
                if (f.surf < lo) lo = f.surf;
                if (f.surf > hi) hi = f.surf;
            }
        }
        if (hi > 0 && lo < Infinity) {
            pathTop = -Math.log10(hi);
            pathBottom = -Math.log10(lo);
        }
    }

    const onScaleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        if (r.height <= 0) return;
        const exp = Math.round(((e.clientY - r.top) / r.height) * FLOOR_EXP);
        if (depth !== null && exp > -Math.log10(depth) && exp >= 1) openRow(Math.min(76, exp));
        else if (rowOpen) closeRow(true);
    };

    return (
        <div
            className="absolute left-2 top-[44px] bottom-3 z-10 flex flex-col gap-2 pointer-events-none select-none"
            style={{ width: 190 }}
        >
            {/* READOUT */}
            <div className={surface + ' pointer-events-auto px-2 py-1.5'}>
                <button
                    type="button"
                    className="block w-full text-left cursor-pointer"
                    title="Dive to a depth (J)"
                    onClick={() => (rowOpen ? closeRow(true) : openRow())}
                >
                    <div className="flex items-baseline gap-2">
                        <span
                            className={'font-mono tabular-nums whitespace-nowrap text-[20px] leading-6 font-semibold transition-colors duration-500 '
                                + (pulse ? 'text-cyan-300' : 'text-zinc-200')}
                        >
                            {fmtDepth(depth)}
                        </span>
                        <span className="text-[10px] text-zinc-400">{hasTelemetry ? 'surface distance' : 'starting'}</span>
                    </div>
                    {depth !== null && (
                        <>
                            <div className="font-mono tabular-nums text-[12px] text-zinc-200">
                                {decades.toFixed(1)} decades to floor
                            </div>
                            <div className="font-mono tabular-nums text-[11px] text-zinc-400">
                                magnification 10^{(-Math.log10(depth)).toFixed(1)}
                            </div>
                        </>
                    )}
                </button>
                {yard !== '' && (
                    <div className="text-[11px] text-zinc-400" title={YARDSTICK_TITLE}>{yard}</div>
                )}
                {absRate >= 0.05 && (
                    <div className="font-mono tabular-nums text-[11px] text-zinc-400">
                        {rate > 0 ? 'falling' : 'rising'} {absRate.toFixed(1)} decades/s
                    </div>
                )}
                {status}
                {diveState && (
                    <div className="text-[11px] text-cyan-400 font-mono tabular-nums">
                        {diveState.recording ? 'Recording dive' : 'Diving'} · {fmtDepthCompact(diveState.from)} to{' '}
                        {fmtDepthCompact(diveState.to)} · Esc stops
                    </div>
                )}
                {!diveState && diveResult && (
                    <div className="text-[11px] text-zinc-200 font-mono tabular-nums">{diveResult}</div>
                )}
            </div>

            {/* DIVE ROW */}
            {rowOpen && (
                <div className={surface + ' pointer-events-auto px-2 py-1.5 flex flex-col gap-1.5'} style={{ width: 300 }}>
                    <div className="flex items-center gap-1.5">
                        <label className="text-[12px] text-zinc-200 font-mono" htmlFor="dz-dive-exp">Dive to 1e-</label>
                        <input
                            id="dz-dive-exp"
                            ref={inputRef}
                            type="number"
                            min={1}
                            max={76}
                            step={1}
                            value={expText}
                            onChange={(e) => setExpText(e.target.value)}
                            onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') startDive(false);
                                else if (e.key === 'Escape') closeRow(true);
                            }}
                            className="h-7 w-14 px-1.5 rounded bg-black/60 border border-white/20 text-[12px] text-zinc-200 font-mono tabular-nums focus:outline-none focus:border-cyan-400"
                        />
                        <button type="button" className={primaryBtn} disabled={blocked !== ''} title={blocked || 'Fly straight ahead to 1e-' + n + ' (Enter)'} onClick={() => startDive(false)}>
                            Dive
                        </button>
                        <button type="button" className={smallBtn} disabled={blocked !== ''} title={blocked || 'Record the flight while diving, then open the Record panel'} onClick={() => startDive(true)}>
                            Record this dive
                        </button>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                        {blocked === 'waiting for shader'
                            ? '(waiting for shader) targets below 1e-4 open when it has compiled'
                            : blocked !== ''
                                ? blocked
                                : 'Straight ahead along the view, about 0.4 s per decade. Any fly key or Esc stops it.'}
                    </div>
                </div>
            )}

            {/* SCALE */}
            {overlayMode === 0 && (
                <div className="relative flex-1 min-h-0 my-2 rounded bg-gradient-to-r from-black/60 via-black/45 to-transparent" style={{ width: 190 }}>
                    {/* click strip (56 px) */}
                    <div
                        className="absolute left-0 top-0 bottom-0 pointer-events-auto cursor-pointer"
                        style={{ width: 56 }}
                        title="Click below the marker to dive to that decade"
                        onClick={onScaleClick}
                    />
                    {/* the line: certified, uncertified (fainter), floor zone (amber) */}
                    <div className="absolute w-px bg-white/25" style={{ left: 16, top: 0, height: pct(50) }} />
                    <div className="absolute w-px bg-white/[0.12]" style={{ left: 16, top: pct(50), height: pct(24) }} />
                    <div className="absolute w-px bg-amber-400" style={{ left: 16, top: pct(74), bottom: 0 }} />

                    {/* decade ticks */}
                    {DECADE_TICKS.map((e) => (
                        <div key={e} className="absolute flex items-center" style={{ left: 16, top: pct(e), transform: 'translateY(-50%)' }}>
                            <span className="block h-px w-2 bg-white/25" />
                            <span className="ml-1 font-mono tabular-nums text-[10px] text-zinc-400">1e-{e}</span>
                        </div>
                    ))}
                    {/* engine marks */}
                    {ENGINE_MARKS.map((m) => (
                        <div key={m.exp} className="absolute flex items-center" style={{ left: 16, top: pct(m.exp), transform: 'translateY(-50%)' }}>
                            <span className={'block h-px w-3 ' + (m.exp === 77 ? 'bg-amber-400' : 'bg-white/40')} />
                            <span className={'ml-1 font-mono tabular-nums text-[10px] whitespace-nowrap ' + (m.exp === 77 ? 'text-amber-400' : 'text-zinc-400')}>
                                {m.label}
                            </span>
                        </div>
                    ))}
                    {/* yardsticks */}
                    {YARDSTICKS.map((y) => (
                        <div
                            key={y.exp}
                            className="absolute pointer-events-auto rounded-full bg-zinc-400"
                            style={{ left: 7, top: pct(y.exp), width: 3, height: 3, transform: 'translateY(-50%)' }}
                            title={y.name + ' · 1e-' + y.exp + '. ' + YARDSTICK_TITLE}
                        />
                    ))}
                    {/* loaded path span */}
                    {pathTop >= 0 && (
                        <div
                            className="absolute border-l border-t border-b border-cyan-400/60"
                            style={{ left: 11, width: 4, top: pct(pathTop), height: 'calc(' + pct(pathBottom) + ' - ' + pct(pathTop) + ')', minHeight: 2 }}
                            title={'Loaded flight · ' + fmtDepthCompact(Math.pow(10, -pathTop)) + ' to ' + fmtDepthCompact(Math.pow(10, -pathBottom))}
                        />
                    )}
                    {/* deepest today */}
                    {deepest !== null && (
                        <div
                            className="absolute h-px bg-white/30 pointer-events-auto"
                            style={{ left: 4, width: 26, top: pct(-Math.log10(deepest)) }}
                            title={'deepest today ' + fmtDepthCompact(deepest)}
                        />
                    )}
                    {/* bookmarks */}
                    {bookmarks.map((b) => (validDepth(b.depth) ? (
                        <button
                            key={b.id}
                            type="button"
                            className="absolute pointer-events-auto rounded-full border border-zinc-200 hover:border-cyan-400 hover:bg-cyan-400/40 cursor-pointer"
                            style={{ left: 22, top: pct(-Math.log10(b.depth)), width: 7, height: 7, transform: 'translateY(-50%)' }}
                            title={b.name + ' · ' + fmtDepth(b.depth)}
                            disabled={exporting}
                            onClick={() => dzActions.goToView(b.view)}
                        />
                    ) : null))}
                    {/* current depth marker */}
                    {depth !== null && (
                        <div
                            className="absolute flex items-center"
                            style={{ left: 10, top: pct(-Math.log10(depth)), transform: 'translateY(-50%)', transition: 'top 120ms ease-out' }}
                        >
                            <span className="block bg-cyan-400" style={{ width: 12, height: 2 }} />
                            <span
                                className="block"
                                style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderRight: '5px solid rgb(34 211 238)' }}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
