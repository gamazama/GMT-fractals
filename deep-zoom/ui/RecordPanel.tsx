/**
 * deep-zoom/ui/RecordPanel.tsx — the 'Record' side panel: fly a route, smooth it, set its length,
 * render it to PNG frames, export a still. Sections run top to bottom in the order the job is done.
 *
 * SEAMS
 *   - Reads `bridge`, `path` (the WORKING flight), `telemetry` and `say` from `useDeepZoom`, and
 *     `renderInfo` (frame f of n, fed by the shell) from `useDzChrome`.
 *   - Other parts of the tool put a flight in the store with `setPath` directly (a recorded dive
 *     from the gauge, a starter card, the first-run guide). `mem.workingFor` remembers which store
 *     path `mem.recorded` belongs to; when the store holds a different one, it becomes the new
 *     recorded copy, so Apply never brings an older flight back.
 *   - The path as it arrived (the core's recorder has already de-jittered it once), the depth curve, the render job and the measured seconds per
 *     frame live in the module-level `mem`, because the shell unmounts this panel when it closes
 *     and a render must outlive that.
 *   - Path load / save are done here in the shell (a file input and a JSON download); the bridge
 *     contract has no load/save handle and does not need one.
 *
 * PITFALLS
 *   - `bridge.smoothPath` mutates what it is given: always pass a deep copy of the recorded path.
 *   - `bridge.samplePath(p, tau)` takes tau in the path's own key time (seconds, `frames[i].t`),
 *     while preview and render space frames evenly by DISTANCE. The playhead is therefore a time
 *     scrub and its frame number is approximate.
 *   - The core's recorder smooths a flight once when recording stops (grep `smoothPath(recPath` in
 *     the core page), so the sliders here add EXTRA smoothing; there is no way back to raw keys.
 *   - Preview and render ease in and out (the core's `easeInOut`, a smootherstep over distance),
 *     so a decades-per-second figure is an average: the middle runs at about 1.9x it.
 *   - Seconds per frame is measured when a render finishes; before that the estimate is scaled
 *     from the nearest finished render at the same detail (pixels x samples) and says so.
 *
 * @assumption Smoothing leaves each key's `t` unchanged, so a depth curve logged against recording
 *   time still lines up with the smoothed path. Not proven; if it drifts, the curve is only a guide.
 */
import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { DzBridge, DzPath, DzSettings, DzView } from '../bridge';
import { useDeepZoom } from '../store';
import { useDzChrome } from './DepthGauge';
import { Button, Field, PanelFrame, Section, Seg, Slider } from './kit';

/* ───────── formats ───────── */

const fmtDepth = (d: number): string => (Number.isFinite(d) && d > 0 ? d.toExponential(2) : '-');
const fmtCompact = (d: number): string => (Number.isFinite(d) && d > 0 ? d.toExponential(0) : '-');
const fmtClock = (sec: number): string => {
    const s = Math.max(0, Math.round(sec));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const deepCopy = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function parseLength(text: string): number | null {
    const s = text.trim();
    if (!s) return null;
    const m = /^(\d+):(\d{1,2}(?:\.\d+)?)$/.exec(s);
    const v = m ? Number(m[1]) * 60 + Number(m[2]) : Number(s);
    return Number.isFinite(v) && v > 0 ? v : null;
}

function pathSeconds(p: DzPath | null): number {
    if (!p || p.frames.length < 2) return 0;
    const t = p.frames[p.frames.length - 1].t;
    return typeof t === 'number' && t > 0 ? t : (p.frames.length - 1) * 1.4;
}

function isPath(v: unknown): v is DzPath {
    const o = v as { frames?: unknown } | null;
    if (!o || !Array.isArray(o.frames) || o.frames.length < 1) return false;
    const k = o.frames[0] as { cam?: unknown; yaw?: unknown } | null;
    return !!k && Array.isArray(k.cam) && k.cam.length === 3 && typeof k.yaw === 'number';
}

/* ───────── session memory (survives the panel closing) ───────── */

interface CurvePoint { u: number; depth: number }
interface RenderDone { text: string; error: boolean }

const mem: {
    recorded: DzPath | null;
    /** The store path `recorded` is the source of. */
    workingFor: DzPath | null;
    curve: CurvePoint[] | null;
    curveFor: DzPath | null;
    log: Array<{ t: number; depth: number }>;
    recStart: number;
    recStartDepth: number;
    logWhole: boolean;
    passes: number;
    strength: number;
    applied: { passes: number; strength: number } | null;
    noteShown: boolean;
    job: 'render' | 'still' | null;
    jobStart: number;
    done: RenderDone | null;
    stillMsg: string;
    secPerFrame: Record<string, number>;
    playhead: number;
} = {
    recorded: null, workingFor: null, curve: null, curveFor: null, log: [], recStart: 0, recStartDepth: 0, logWhole: false,
    passes: 2, strength: 0.4, applied: null, noteShown: false, job: null, jobStart: 0, done: null,
    stillMsg: '', secPerFrame: {}, playhead: 0,
};
const listeners = new Set<() => void>();
const bump = (): void => { listeners.forEach((f) => f()); };

const RENDER_KEY = 'gmt.deepzoom.render.v1';
interface RenderPrefs { longEdge: number; samples: number; seconds: number; fps: number }
function loadPrefs(): RenderPrefs {
    const d: RenderPrefs = { longEdge: 1280, samples: 4, seconds: 10, fps: 30 };
    try {
        const o = JSON.parse(localStorage.getItem(RENDER_KEY) || 'null') as Partial<RenderPrefs> | null;
        if (o) {
            if (typeof o.longEdge === 'number') d.longEdge = clamp(Math.round(o.longEdge), 320, 7680);
            if (typeof o.samples === 'number') d.samples = clamp(Math.round(o.samples), 1, 64);
            if (typeof o.seconds === 'number' && o.seconds > 0) d.seconds = o.seconds;
            if (o.fps === 24 || o.fps === 30 || o.fps === 60) d.fps = o.fps;
        }
    } catch { /* private window: defaults */ }
    return d;
}

const PRESETS: Array<[string, number, number]> = [
    ['First 1280 px · 4', 1280, 4],
    ['Draft 640 px · 4', 640, 4],
    ['HD 1920 px · 8', 1920, 8],
    ['Final 1920 px · 16', 1920, 16],
    ['4K 3840 px · 16', 3840, 16],
];
const REACH = ['short', 'relaxed', 'full'];
const COLOUR = ['plain', 'iteration', 'orbit-trap'];

/* ───────── small local pieces ───────── */

const INPUT = 'pointer-events-auto h-[26px] bg-surface-header border border-line/20 rounded px-2 text-[11px] text-fg-secondary font-mono tabular-nums placeholder:text-fg-faint focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-400';
const NOTE = 'text-[10px] text-fg-dim leading-snug';
const LINE = 'text-[11px] text-fg-secondary font-mono tabular-nums';
const LINK = 'pointer-events-auto underline decoration-dotted cursor-pointer text-fg-tertiary hover:text-fg bg-transparent border-0 p-0 font-mono text-[11px]';

/** A whole-number / decimal field that commits on blur or Enter and clamps to its range. */
function Num({ value, min, max, onCommit, width = 64, label, integer = true }: {
    value: number; min: number; max: number; onCommit: (v: number) => void; width?: number; label: string; integer?: boolean;
}) {
    const [text, setText] = useState(String(value));
    useEffect(() => { setText(String(value)); }, [value]);
    const commit = () => {
        const v = Number(text);
        if (!Number.isFinite(v)) { setText(String(value)); return; }
        const c = clamp(integer ? Math.round(v) : v, min, max);
        setText(String(c));
        if (c !== value) onCommit(c);
    };
    return (
        <input
            aria-label={label}
            className={INPUT}
            style={{ width }}
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        />
    );
}

/** Greys a section out and says why, until the step before it has data. */
function Gate({ reason, children }: { reason: string; children: React.ReactNode }) {
    if (!reason) return <>{children}</>;
    return (
        <div>
            <div className={NOTE + ' pb-1'}>{reason}</div>
            <div className="opacity-40 pointer-events-none" aria-disabled="true">{children}</div>
        </div>
    );
}

function mouseCaptured(bridge: DzBridge): boolean {
    try { return !!bridge.win.document.pointerLockElement; } catch { return false; }
}

const nextFrames = (n: number): Promise<void> => new Promise((res) => {
    const step = (left: number) => { if (left <= 0) res(); else requestAnimationFrame(() => step(left - 1)); };
    step(n);
});

/* ───────── the panel ───────── */

export function RecordPanel() {
    const bridge = useDeepZoom((s) => s.bridge);
    const path = useDeepZoom((s) => s.path);
    const setPath = useDeepZoom((s) => s.setPath);
    const setPanel = useDeepZoom((s) => s.setPanel);
    const say = useDeepZoom((s) => s.say);
    const hasTelemetry = useDeepZoom((s) => s.telemetry !== null);
    const ready = useDeepZoom((s) => !!s.telemetry?.ready);
    const recording = useDeepZoom((s) => !!s.telemetry?.recording);
    const playing = useDeepZoom((s) => !!s.telemetry?.playing);
    const exporting = useDeepZoom((s) => !!s.telemetry?.exporting);
    const keys = useDeepZoom((s) => s.telemetry?.pathFrames ?? 0);
    const depthText = useDeepZoom((s) => (s.telemetry ? fmtDepth(s.telemetry.depth) : '-'));
    const depthCompact = useDeepZoom((s) => (s.telemetry ? fmtCompact(s.telemetry.depth) : '-'));
    const aspect = useDeepZoom((s) => (s.telemetry && s.telemetry.frameH > 0 ? s.telemetry.frameW / s.telemetry.frameH : 16 / 9));

    const info = useDzChrome((s) => s.renderInfo);

    const [, force] = useReducer((x: number) => x + 1, 0);
    useEffect(() => { listeners.add(force); return () => { listeners.delete(force); }; }, []);

    const prefs0 = useRef<RenderPrefs>(loadPrefs()).current;
    const [seconds, setSeconds] = useState(prefs0.seconds);
    const [lengthText, setLengthText] = useState(String(prefs0.seconds));
    const [rateText, setRateText] = useState('');
    const [fps, setFps] = useState<number>(prefs0.fps);
    const [longEdge, setLongEdge] = useState(prefs0.longEdge);
    const [samples, setSamples] = useState(prefs0.samples);
    const [stillEdge, setStillEdge] = useState(3840);
    const [stillSamples, setStillSamples] = useState(64);
    const [diveExp, setDiveExp] = useState(30);
    const [diving, setDiving] = useState(false);
    const [passes, setPasses] = useState(mem.passes);
    const [strength, setStrength] = useState(mem.strength);
    const [playhead, setPlayheadState] = useState(mem.playhead);
    const [reading, setReading] = useState('');
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [settings, setSettings] = useState<DzSettings | null>(null);
    const [flightMsg, setFlightMsg] = useState('');
    const [renderMsg, setRenderMsg] = useState('');
    const [lastOffer, setLastOffer] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const frames = Math.max(2, Math.round(seconds * fps));
    const hasPath = !!path && path.frames.length >= 2;
    const busy = recording || playing || exporting || diving;

    useEffect(() => {
        try { localStorage.setItem(RENDER_KEY, JSON.stringify({ longEdge, samples, seconds, fps })); } catch { /* ignore */ }
    }, [longEdge, samples, seconds, fps]);

    // Look settings for the facts line (cheap read, once a second while the panel is open).
    useEffect(() => {
        if (!bridge) return;
        const read = () => { try { setSettings(bridge.settings()); } catch { /* core busy */ } };
        read();
        const id = window.setInterval(read, 1000);
        return () => window.clearInterval(id);
    }, [bridge]);

    // A flight recorded with M while this panel was closed: offer it rather than guess.
    useEffect(() => {
        if (!bridge || path || recording) return;
        try { setLastOffer(bridge.lastPath()?.frames?.length ?? 0); } catch { setLastOffer(0); }
    }, [bridge, path, recording]);

    /* ── adopting a path ── */

    const adopt = useCallback((recorded: DzPath, curve: CurvePoint[] | null) => {
        if (!bridge) return;
        mem.recorded = deepCopy(recorded);
        // No extra smoothing on arrival: the core's recorder has already de-jittered it.
        const working = deepCopy(recorded);
        mem.applied = null;
        mem.workingFor = working;
        mem.curve = curve && curve.length >= 2 ? curve : null;
        mem.curveFor = mem.curve ? working : null;
        mem.playhead = 0;
        mem.done = null;
        setPlayheadState(0);
        setPath(working);
        bump();
    }, [bridge, setPath]);

    // A flight put in the store by another part of the tool becomes the recorded copy.
    useEffect(() => {
        if (!path || path === mem.workingFor) return;
        mem.recorded = deepCopy(path);
        mem.applied = null;
        mem.workingFor = path;
        mem.done = null;
        mem.playhead = 0;
        setPlayheadState(0);
        bump();
    }, [path]);

    // Recording start / stop, whoever caused it (the button, M, or a recorded dive).
    const wasRecording = useRef<boolean | null>(null);
    useEffect(() => {
        if (!bridge) return;
        const before = wasRecording.current;
        wasRecording.current = recording;
        if (recording) {
            let d = 0;
            try { d = bridge.telemetry().depth; } catch { /* ignore */ }
            mem.log = [{ t: 0, depth: d }];
            mem.recStart = performance.now();
            mem.recStartDepth = d;
            mem.logWhole = before === false;   // mounted mid-recording = the log misses its start
            const id = window.setInterval(() => {
                try { mem.log.push({ t: (performance.now() - mem.recStart) / 1000, depth: bridge.telemetry().depth }); } catch { /* ignore */ }
                bump();
            }, 250);
            return () => window.clearInterval(id);
        }
        if (before === true) {
            let p: DzPath | null = null;
            try { p = bridge.lastPath(); } catch { p = null; }
            if (!p || !isPath(p) || p.frames.length < 2) {
                setFlightMsg('No keys were recorded. Press M and fly it by hand.');
            } else {
                const total = pathSeconds(p) || 1;
                const curve = mem.logWhole
                    ? mem.log.filter((e) => e.depth > 0).map((e) => ({ u: clamp(e.t / total, 0, 1), depth: e.depth }))
                    : null;
                setFlightMsg('');
                adopt(p, curve);
            }
        }
        return undefined;
    }, [recording, bridge, adopt]);

    // A path with no depth curve (loaded, or recorded while the panel was closed): read 32 depths.
    useEffect(() => {
        if (!bridge || !path || path.frames.length < 2 || !ready) return;
        if (mem.curve && mem.curveFor === path) return;
        if (recording || playing || exporting || diving) return;
        let cancelled = false;
        const total = pathSeconds(path);
        // The read moves the live camera along the flight; `home` is where the user was.
        let home: DzView | null = null;
        try { home = bridge.getView(); } catch { home = null; }
        (async () => {
            const pts: CurvePoint[] = [];
            const N = 32;
            for (let i = 0; i < N && !cancelled; i++) {
                const u = i / (N - 1);
                setReading('reading depth ' + (i + 1) + '/' + N);
                try { bridge.samplePath(path, u * total); } catch { break; }
                await nextFrames(2);
                if (cancelled) break;
                try { const d = bridge.telemetry().depth; if (d > 0 && Number.isFinite(d)) pts.push({ u, depth: d }); } catch { /* skip */ }
            }
            if (!cancelled) {
                mem.curve = pts.length >= 2 ? pts : null;
                mem.curveFor = path;
                if (home) { try { bridge.setView(home); } catch { /* ignore */ } }
                home = null;
                setReading('');
                bump();
            }
        })();
        return () => {
            cancelled = true;
            // Closed or interrupted mid-read: put the camera back where the user was.
            if (home) { try { bridge.setView(home); } catch { /* ignore */ } home = null; }
            setReading('');
        };
    }, [bridge, path, ready, recording, playing, exporting, diving]);

    /* ── derived numbers ── */

    const curve = path && mem.curveFor === path ? mem.curve : null;
    let shallow = 0, deepest = 0, deepestU = 1;
    if (curve) {
        for (const p of curve) {
            if (p.depth > shallow) shallow = p.depth;
            if (deepest === 0 || p.depth < deepest) { deepest = p.depth; deepestU = p.u; }
        }
    }
    const decades = shallow > 0 && deepest > 0 ? Math.log10(shallow / deepest) : 0;
    const firstDepth = curve && curve.length ? curve[0].depth : 0;
    const total = pathSeconds(path);

    const depthAt = (u: number): number => {
        if (!curve || curve.length < 2) return 0;
        for (let i = 1; i < curve.length; i++) {
            if (u <= curve[i].u) {
                const a = curve[i - 1], b = curve[i];
                const k = b.u > a.u ? (u - a.u) / (b.u - a.u) : 0;
                return Math.pow(10, Math.log10(a.depth) + (Math.log10(b.depth) - Math.log10(a.depth)) * clamp(k, 0, 1));
            }
        }
        return curve[curve.length - 1].depth;
    };

    /* ── timeline ── */

    const scrub = useCallback((u: number) => {
        const v = clamp(u, 0, 1);
        mem.playhead = v;
        setPlayheadState(v);
        const st = useDeepZoom.getState();
        const p = st.path, b = st.bridge;
        if (!b || !p || p.frames.length < 2) return;
        const t = st.telemetry;
        if (t && (t.recording || t.playing || t.exporting)) return;
        try { b.samplePath(p, v * pathSeconds(p)); } catch { /* ignore */ }
    }, []);

    // Left / Right step one frame, Shift one second; on both windows, since the iframe holds focus.
    useEffect(() => {
        if (!bridge) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            const tag = ((e.target as HTMLElement | null)?.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (mouseCaptured(bridge)) return;
            const st = useDeepZoom.getState();
            if (!st.path || st.path.frames.length < 2) return;
            const stepU = e.shiftKey ? 1 / Math.max(0.1, seconds) : 1 / Math.max(1, frames - 1);
            e.preventDefault();
            scrub(mem.playhead + (e.key === 'ArrowLeft' ? -stepU : stepU));
        };
        const wins: Window[] = [window];
        try { if (bridge.win && bridge.win !== window) wins.push(bridge.win); } catch { /* ignore */ }
        wins.forEach((w) => w.addEventListener('keydown', onKey));
        return () => { wins.forEach((w) => { try { w.removeEventListener('keydown', onKey); } catch { /* frame gone */ } }); };
    }, [bridge, frames, seconds, scrub]);

    // Draw the depth curve. While recording, draw the live log instead.
    const liveCount = recording ? mem.log.length : 0;
    useEffect(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = Math.max(50, cv.clientWidth), H = 72;
        if (cv.width !== Math.round(W * dpr)) cv.width = Math.round(W * dpr);
        if (cv.height !== Math.round(H * dpr)) cv.height = Math.round(H * dpr);
        const g = cv.getContext('2d');
        if (!g) return;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        g.fillStyle = 'rgba(255,255,255,0.04)';
        g.fillRect(0, 0, W, H);
        let pts: CurvePoint[] = [];
        if (recording) {
            const span = mem.log.length ? Math.max(1, mem.log[mem.log.length - 1].t) : 1;
            pts = mem.log.filter((e) => e.depth > 0).map((e) => ({ u: e.t / span, depth: e.depth }));
        } else if (curve) pts = curve;
        if (pts.length < 2) return;
        let lo = 0;
        for (const p of pts) lo = Math.min(lo, Math.log10(p.depth));
        const floor = Math.min(-1, lo);                       // 1e0 at the top, the deepest at the bottom
        const X = (u: number) => 1 + u * (W - 2);
        const Y = (d: number) => 3 + (clamp(Math.log10(d), floor, 0) / floor) * (H - 6);
        // Flat stretches (stalls): under a fifth of the average descent rate.
        const avg = Math.abs(Math.log10(pts[0].depth) - Math.log10(pts[pts.length - 1].depth)) / Math.max(1e-6, pts[pts.length - 1].u - pts[0].u);
        g.fillStyle = 'rgba(251,191,36,0.14)';
        for (let i = 1; i < pts.length; i++) {
            const du = pts[i].u - pts[i - 1].u;
            if (du <= 0) continue;
            const rate = Math.abs(Math.log10(pts[i].depth) - Math.log10(pts[i - 1].depth)) / du;
            if (avg > 0.5 && rate < avg * 0.2) g.fillRect(X(pts[i - 1].u), 0, Math.max(1, X(pts[i].u) - X(pts[i - 1].u)), H);
        }
        g.strokeStyle = 'rgba(255,255,255,0.75)';
        g.lineWidth = 1.25;
        g.beginPath();
        pts.forEach((p, i) => { if (i === 0) g.moveTo(X(p.u), Y(p.depth)); else g.lineTo(X(p.u), Y(p.depth)); });
        g.stroke();
        g.fillStyle = 'rgba(161,161,170,0.9)';
        g.font = '10px ui-monospace, monospace';
        g.fillText('1e0', 3, 11);
        g.fillText('1e' + Math.round(floor), 3, H - 3);
        if (!recording) {
            g.strokeStyle = '#22d3ee';
            g.lineWidth = 1.5;
            g.beginPath(); g.moveTo(X(playhead), 0); g.lineTo(X(playhead), H); g.stroke();
        }
    }, [curve, playhead, recording, liveCount, path]);

    const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!hasPath || busy) return;
        if (e.type === 'pointerdown') { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
        else if (!(e.buttons & 1)) return;
        const r = e.currentTarget.getBoundingClientRect();
        scrub((e.clientX - r.left - 1) / Math.max(1, r.width - 2));
    };

    /* ── actions ── */

    const toggleRecord = () => {
        if (!bridge) return;
        try { bridge.recordToggle(); bridge.focus(); } catch (err) { setFlightMsg(String(err)); }
    };

    const recordDive = async () => {
        if (!bridge || !ready || busy) return;
        const target = Math.pow(10, -clamp(diveExp, 1, 76));
        setDiving(true);
        setFlightMsg('');
        try {
            if (!bridge.recording()) bridge.recordToggle();
            bridge.focus();
            await bridge.diveTo(target);
            if (bridge.recording()) bridge.recordToggle();   // the recording effect adopts the path
            const d = bridge.telemetry().depth;
            say(d <= target * 3 && d >= target / 3 ? 'Arrived · ' + fmtDepth(d) : 'Stopped at ' + fmtDepth(d));
        } catch (err) {
            setFlightMsg(String(err));
        } finally {
            setDiving(false);
        }
    };

    const loadPath = () => {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.json,application/json';
        inp.onchange = () => {
            const f = inp.files && inp.files[0];
            if (!f) return;
            f.text().then((txt) => {
                let o: unknown = null;
                try { o = JSON.parse(txt); } catch { o = null; }
                if (!isPath(o) || o.frames.length < 2) { setFlightMsg('Not a flight file: it needs at least 2 keys with a camera. Nothing was changed.'); return; }
                setFlightMsg('');
                adopt(o, null);
            }).catch(() => setFlightMsg('The file could not be read. Nothing was changed.'));
        };
        inp.click();
    };

    const savePath = () => {
        if (!path) return;
        const url = URL.createObjectURL(new Blob([JSON.stringify(path)], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url; a.download = 'deep-zoom-path.json';
        document.body.appendChild(a); a.click(); a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    };

    const clearPath = () => {
        mem.recorded = null; mem.workingFor = null; mem.curve = null; mem.curveFor = null; mem.applied = null; mem.done = null; mem.playhead = 0;
        setPlayheadState(0); setPath(null); setFlightMsg(''); bump();
    };

    const useLast = () => {
        if (!bridge) return;
        try { const p = bridge.lastPath(); if (isPath(p) && p.frames.length >= 2) adopt(p, null); } catch { /* ignore */ }
    };

    const applySmooth = (p: number, s: number) => {
        if (!bridge) return;
        if (!path) return;
        if (!mem.recorded || mem.workingFor !== path) mem.recorded = deepCopy(path);
        mem.passes = p; mem.strength = s;
        let working = deepCopy(mem.recorded);
        if (p > 0) { try { working = bridge.smoothPath(working, p, s) || working; } catch { return; } }
        mem.applied = p > 0 ? { passes: p, strength: s } : null;
        if (mem.curve) mem.curveFor = working;      // same keys in time: keep the curve
        mem.workingFor = working;
        setPath(working);
        bump();
    };

    const preview = () => {
        if (!bridge || !path) return;
        if (playing) { try { bridge.stopPlay(); } catch { /* ignore */ } return; }
        bridge.focus();
        void bridge.playPath(path, { frames, fps }).catch(() => undefined);
    };

    const startRender = () => {
        if (!bridge || !path) return;
        if (mouseCaptured(bridge)) { setRenderMsg('Release the mouse first'); return; }
        setRenderMsg(''); setConfirmCancel(false);
        const key = longEdge + '|' + samples + '|' + (settings ? settings.detail : '?');
        mem.job = 'render'; mem.jobStart = performance.now(); mem.done = null;
        bump();
        bridge.focus();
        bridge.renderPath(path, { frames, fps, longEdge, samples }).then((res) => {
            const r = (res || {}) as { error?: string; frames?: number; framesRendered?: number; cancelled?: boolean; zips?: unknown };
            const el = (performance.now() - mem.jobStart) / 1000;
            if (r.error) mem.done = { text: r.error, error: true };
            else {
                const n = r.frames ?? r.framesRendered ?? 0;
                if (n > 0) mem.secPerFrame[key] = el / n;
                const deep = deepest > 0 ? ' · deepest ' + fmtCompact(deepest) : '';
                mem.done = r.cancelled
                    ? { text: n > 0 ? 'Cancelled. ' + n + ' frames in ' + fmtClock(el) + ' saved as a partial ZIP.' : 'Cancelled before the first frame finished. Nothing was saved.', error: false }
                    : { text: 'Done. ' + n + ' frames in ' + fmtClock(el) + deep + ' · ZIP downloaded.', error: false };
            }
        }).catch((err) => { mem.done = { text: String(err), error: true }; })
            .finally(() => { mem.job = null; useDeepZoom.getState().say(mem.done ? mem.done.text : null); bump(); });
    };

    const cancel = () => { if (bridge) { try { bridge.cancelRender(); } catch { /* ignore */ } } setConfirmCancel(false); };

    const exportStill = () => {
        if (!bridge) return;
        mem.job = 'still'; mem.jobStart = performance.now(); mem.stillMsg = '';
        bump();
        bridge.focus();
        bridge.exportStill(stillEdge, stillSamples).then((res) => {
            const r = (res || {}) as { error?: string; cancelled?: boolean; W?: number; H?: number };
            if (r.error) mem.stillMsg = /not ready|no deep orbit/.test(r.error) ? 'Still export works below 1e-4. Dive deeper first.' : r.error;
            else if (r.cancelled) mem.stillMsg = 'Cancelled.';
            else mem.stillMsg = 'Saved ' + (r.W ?? '?') + 'x' + (r.H ?? '?') + ' PNG.';
        }).catch((err) => { mem.stillMsg = String(err); })
            .finally(() => { mem.job = null; bump(); });
    };

    // Elapsed clock while a render or still runs.
    useEffect(() => {
        if (!exporting) { setConfirmCancel(false); return; }
        const id = window.setInterval(force, 1000);
        return () => window.clearInterval(id);
    }, [exporting]);

    /* ── render ── */

    const close = () => setPanel('none');
    if (!bridge || !hasTelemetry) {
        return (
            <PanelFrame title="Record" onClose={close} width={340}>
                <div className="px-3 py-3 text-[11px] text-fg-dim">Waiting for the renderer.</div>
            </PanelFrame>
        );
    }

    const size = (edge: number): string => {
        const w = Math.max(2, Math.round(aspect >= 1 ? edge : edge * aspect));
        const h = Math.max(2, Math.round(aspect >= 1 ? edge / aspect : edge));
        return w + 'x' + h;
    };
    const estKey = longEdge + '|' + samples + '|' + (settings ? settings.detail : '?');
    const spfExact = mem.secPerFrame[estKey];
    // No finished render at these settings: scale the nearest one at the same detail by pixels x samples.
    let spfScaled = 0, spfFrom = '';
    if (!spfExact) {
        const want = longEdge * longEdge * samples;
        let best = Infinity;
        for (const k of Object.keys(mem.secPerFrame)) {
            const [e, s, d] = k.split('|');
            if (d !== String(settings ? settings.detail : '?')) continue;
            const have = Number(e) * Number(e) * Number(s);
            const gap = have > 0 ? Math.abs(Math.log(want / have)) : Infinity;
            if (gap < best) { best = gap; spfScaled = mem.secPerFrame[k] * (want / have); spfFrom = e + ' px · ' + s; }
        }
    }
    const spf = spfExact || spfScaled;
    const spfLabel = spfExact ? 'measured' : 'scaled from ' + spfFrom;
    const frameDone = info && info.total > 0 ? Math.max(0, Math.min(info.frame, info.total) - 1) : 0;
    const elapsed = mem.job ? (performance.now() - mem.jobStart) / 1000 : 0;
    const renderReason = !hasPath ? 'No flight yet' : recording ? 'Stop recording first' : !ready ? 'waiting for shader' : playing ? 'Stop the preview first' : exporting ? 'A render is running' : diving ? 'A dive is running' : '';
    const rate = decades > 0 && seconds > 0 ? decades / seconds : 0;
    const playT = playhead * seconds;
    const playFrame = Math.round(playhead * (frames - 1)) + 1;
    const ffmpeg = 'ffmpeg -framerate ' + fps + ' -i frame_%05d.png -c:v libx264 -pix_fmt yuv420p -crf 16 zoom.mp4';
    const recSeconds = recording ? (performance.now() - mem.recStart) / 1000 : 0;
    const showNote = hasPath && !mem.noteShown;
    const rendering = exporting && mem.job === 'render';
    const stilling = exporting && mem.job === 'still';

    return (
        <PanelFrame title="Record" onClose={close} width={340}>
            {/* 1 ─ Flight */}
            <Section title="Flight">
                <div className="flex flex-wrap items-center gap-2">
                    <Button primary={!recording} danger={recording} onClick={toggleRecord} disabled={exporting || playing || diving}
                        title={exporting ? 'A render is running' : playing ? 'Stop the preview first' : diving ? 'A dive is running' : 'Record the camera as you fly (M)'}>
                        {recording ? 'Stop (M)' : 'Record (M)'}
                    </Button>
                    {lastOffer >= 2 && !hasPath && !recording
                        ? <Button onClick={useLast} title="Use the flight recorded with M while this panel was closed">Use last flight · {lastOffer} keys</Button>
                        : null}
                </div>
                {recording ? (
                    <div className={LINE + ' pt-1'}>
                        <span className="text-red-500 font-bold">REC</span> {fmtClock(recSeconds)} · {keys} keys · {fmtCompact(mem.recStartDepth)} to {depthCompact}
                    </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    <span className="text-[11px] text-fg-tertiary">Record a dive to 1e-</span>
                    <Num label="Dive depth exponent" value={diveExp} min={1} max={76} width={44} onCommit={setDiveExp} />
                    <Button onClick={() => { void recordDive(); }} disabled={!ready || busy}
                        title={!ready ? 'waiting for shader' : busy ? 'Busy' : 'Dive straight ahead to 1e-' + diveExp + ' while recording'}>
                        Go
                    </Button>
                    {!ready ? <span className={NOTE}>(waiting for shader)</span> : null}
                    {diving ? <span className={NOTE}>diving · any fly key or Esc stops it</span> : null}
                </div>
                {hasPath && path ? (
                    <div className={LINE + ' pt-2'}>
                        {path.frames.length} keys
                        {firstDepth > 0 && deepest > 0 ? ' · ' + fmtCompact(firstDepth) + ' to ' + fmtCompact(deepest) : ''}
                        {' · power ' + path.frames[0].power}
                    </div>
                ) : !recording ? (
                    <div className="text-[11px] text-fg-dim pt-2">No flight yet. Press Record, fly, press Stop. Or record a dive.</div>
                ) : null}
                {flightMsg ? <div className="text-[11px] text-warn pt-1">{flightMsg}</div> : null}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button onClick={loadPath} disabled={busy} title="Load a flight from a .json file">Load path</Button>
                    <Button onClick={savePath} disabled={!hasPath} title={hasPath ? 'Download deep-zoom-path.json' : 'No flight yet'}>Save path</Button>
                    <button type="button" onClick={clearPath} disabled={!hasPath || busy}
                        className="pointer-events-auto text-[11px] text-fg-tertiary hover:text-red-500 cursor-pointer bg-transparent border-0 disabled:opacity-40 disabled:cursor-default">
                        Clear
                    </button>
                </div>
                <div className={NOTE + ' pt-1'}>Fly the route once. Keys are sparse; smoothing comes next.</div>
                {showNote ? (
                    <div className="mt-2 p-2 border border-line/10 rounded text-[10px] text-fg-tertiary leading-snug">
                        A path stores the camera and the formula. Lighting, detail, reach and the gradient are taken from the Look panel at render time.{' '}
                        <button type="button" className={LINK} onClick={() => { mem.noteShown = true; bump(); }}>Got it</button>
                    </div>
                ) : null}
            </Section>

            {/* 2 ─ Timeline and smoothing */}
            <Section title="Timeline and smoothing">
                <Gate reason={recording ? '' : hasPath ? '' : 'Needs a flight. Record one above.'}>
                    <canvas
                        ref={canvasRef}
                        onPointerDown={onPointer}
                        onPointerMove={onPointer}
                        aria-label="Depth along the flight; drag to scrub"
                        className="pointer-events-auto block w-full rounded-sm border border-line/10 cursor-ew-resize touch-none"
                        style={{ height: 72 }}
                    />
                    <div className={LINE + ' pt-1'}>
                        {reading
                            ? reading
                            : 't ' + playT.toFixed(1) + ' s / ' + seconds.toFixed(1) + ' s · frame ' + playFrame + '/' + frames + (curve ? ' · ' + fmtDepth(depthAt(playhead)) : '')}
                    </div>
                    <div className={NOTE}>Drag to scrub, or Left / Right (Shift = 1 s). The scrub follows recorded time; frames are spaced evenly by distance, so the frame number is approximate. Playback runs a Catmull-Rom curve through the keys.</div>
                    <div className="flex flex-wrap gap-2 pt-2">
                        <Button onClick={() => scrub(0)} disabled={busy}>Go to start</Button>
                        <Button onClick={() => scrub(deepestU)} disabled={busy || !curve} title={curve ? 'Scrub to the deepest point read on this flight' : 'Depth not read yet'}>Go to deepest</Button>
                    </div>
                    <Slider label="Passes" value={passes} min={0} max={8} step={1} onChange={setPasses} />
                    <Slider label="Strength" value={strength} min={0} max={1} step={0.05} onChange={setStrength} format={(v) => v.toFixed(2)} />
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button onClick={() => applySmooth(passes, strength)} disabled={busy}>Apply</Button>
                        <Button onClick={() => applySmooth(0, strength)} disabled={busy || !mem.applied}>Remove extra smoothing</Button>
                    </div>
                    <div className={LINE + ' pt-1'}>
                        {mem.applied ? 'recorder smoothing plus ' + mem.applied.passes + (mem.applied.passes === 1 ? ' pass' : ' passes') + ' at ' + mem.applied.strength.toFixed(2) : 'recorder smoothing only'}
                    </div>
                    <div className={NOTE}>The recorder already smooths a flight once when it stops. Passes add more; 0 adds none.</div>
                </Gate>
            </Section>

            {/* 3 ─ Length */}
            <Section title="Length">
                <Gate reason={hasPath ? '' : 'Needs a flight.'}>
                    <Field label="Length (s or m:ss)" hint="Matching music? Type the track length.">
                        <input
                            aria-label="Length in seconds or m:ss"
                            className={INPUT}
                            style={{ width: 72 }}
                            value={lengthText}
                            onChange={(e) => {
                                setLengthText(e.target.value);
                                const v = parseLength(e.target.value);
                                if (v !== null) { setSeconds(clamp(v, 0.5, 7200)); setRateText(''); }
                            }}
                            onBlur={() => setLengthText(String(Number(seconds.toFixed(2))))}
                        />
                        <span className={NOTE}>{fmtClock(seconds)}</span>
                    </Field>
                    <Seg label="Fps" value={fps} options={[['24', 24], ['30', 30], ['60', 60]]} onChange={(v) => setFps(Number(v))} />
                    <div className={LINE + ' pt-1'}>
                        frames {frames}{rate > 0 ? ' · average ' + rate.toFixed(1) + ' decades/s' : ''}
                    </div>
                    <Field label="Average rate (decades/s)" hint={decades > 0 ? 'This flight covers ' + decades.toFixed(1) + ' decades. Eases in and out; the middle runs at about 1.9x this.' : 'Available once the depth of the flight has been read.'}>
                        <input
                            aria-label="Average rate in decades per second"
                            className={INPUT}
                            style={{ width: 72 }}
                            placeholder="-"
                            inputMode="decimal"
                            disabled={decades <= 0}
                            value={rateText}
                            onChange={(e) => {
                                setRateText(e.target.value);
                                const v = Number(e.target.value);
                                if (decades > 0 && Number.isFinite(v) && v > 0) {
                                    const s = clamp(decades / v, 0.5, 7200);
                                    setSeconds(s); setLengthText(String(Number(s.toFixed(2))));
                                }
                            }}
                        />
                    </Field>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button onClick={preview} disabled={!playing && (recording || exporting || diving || !ready)}
                            title={!ready ? 'waiting for shader' : recording ? 'Stop recording first' : exporting ? 'A render is running' : 'Play the flight in real time'}>
                            {playing ? 'Stop (Esc)' : 'Preview'}
                        </Button>
                        <span className={NOTE}>{frames} frames at live quality</span>
                    </div>
                </Gate>
            </Section>

            {/* 4 ─ Render */}
            <Section title="Render">
                <Gate reason={hasPath ? '' : 'Needs a flight.'}>
                    <div className="flex flex-wrap gap-1.5">
                        {PRESETS.map(([text, edge, smp]) => {
                            const on = edge === longEdge && smp === samples;
                            return (
                                <button key={text} type="button" aria-pressed={on} onClick={() => { setLongEdge(edge); setSamples(smp); }}
                                    className={'pointer-events-auto text-[10px] leading-none px-2 py-1.5 rounded-sm border cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-400 '
                                        + (on ? 'bg-accent-500/20 text-accent-300 border-accent-500/40' : 'bg-line/5 text-fg-tertiary border-line/10 hover:bg-line/15')}>
                                    {text}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap gap-3 pt-1">
                        <Field label="Long edge (px)"><Num label="Long edge in pixels" value={longEdge} min={320} max={7680} onCommit={setLongEdge} /></Field>
                        <Field label="Samples per frame"><Num label="Samples per frame" value={samples} min={1} max={64} onCommit={setSamples} /></Field>
                    </div>
                    <div className={LINE}>{size(longEdge)} · {frames} frames</div>
                    {settings ? (
                        <div className="text-[11px] text-fg-tertiary font-mono pt-1 leading-relaxed">
                            {deepest > 0 ? <><button type="button" className={LINK} onClick={() => scrub(deepestU)}>deepest {fmtCompact(deepest)}</button>{' · '}</> : null}
                            <button type="button" className={LINK} onClick={() => setPanel('look')}>detail {Number(settings.detail.toFixed(2))}</button>{' · '}
                            <button type="button" className={LINK} onClick={() => setPanel('look')}>reach {REACH[settings.reach] ?? settings.reach}</button>{' · '}
                            <button type="button" className={LINK} onClick={() => setPanel('look')}>colour {COLOUR[settings.color] ?? settings.color}</button>{' · '}
                            <button type="button" className={LINK} onClick={() => setPanel('look')}>lighting {settings.lookMode === 1 ? 'new' : 'classic'}</button>
                        </div>
                    ) : null}
                    {settings && settings.detail >= 16 ? <div className="text-[10px] text-warn pt-0.5">At detail 32 a frame takes several seconds.</div> : null}
                    <div className={LINE + ' pt-1'}>
                        {spf
                            ? 'about ' + (spf * frames >= 90 ? Math.round((spf * frames) / 60) + ' min' : Math.round(spf * frames) + ' s') + ' at ' + spf.toFixed(1) + ' s per frame (' + spfLabel + ')'
                            : 'No estimate before the first render. Time left shows once its first frame is done.'}
                    </div>
                    {!rendering ? (
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                            <Button primary onClick={startRender} disabled={!!renderReason} title={renderReason || 'Render the flight to a ZIP of PNG frames'}>
                                Render {frames} frames
                            </Button>
                            {renderReason || renderMsg ? <span className={NOTE}>{renderReason || renderMsg}</span> : null}
                        </div>
                    ) : null}
                </Gate>
                {rendering ? (
                    <div className="mt-2 p-2 border border-line/10 rounded">
                        {info && info.total > 0 ? (
                            <>
                                <div className={LINE}>
                                    frame {Math.min(info.frame, info.total)}/{info.total} · {Math.round((frameDone / info.total) * 100)}% · elapsed {fmtClock(elapsed)}
                                </div>
                                <div className={LINE}>
                                    {frameDone > 0
                                        ? 'about ' + fmtClock((elapsed / frameDone) * (info.total - frameDone)) + ' left · ' + (elapsed / frameDone).toFixed(1) + ' s per frame'
                                        : 'time left after the first frame'}
                                </div>
                                <div className="mt-1 h-0.5 bg-line/10 rounded-sm overflow-hidden">
                                    <div className="h-full bg-cyan-400" style={{ width: ((frameDone / info.total) * 100).toFixed(1) + '%' }} />
                                </div>
                            </>
                        ) : (
                            <div className={LINE}>rendering {frames} frames · elapsed {fmtClock(elapsed)}</div>
                        )}
                        <div className={LINE}>depth {depthText}</div>
                        <div className={NOTE}>Esc also cancels.</div>
                        {confirmCancel ? (
                            <div className="pt-2">
                                <div className="text-[11px] text-fg-secondary">Cancel the render? The finished frames are saved as a partial ZIP.</div>
                                <div className="flex gap-2 pt-1">
                                    <Button onClick={() => setConfirmCancel(false)}>Keep rendering</Button>
                                    <Button danger onClick={cancel}>Cancel render</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="pt-2"><Button onClick={() => setConfirmCancel(true)}>Cancel</Button></div>
                        )}
                    </div>
                ) : null}
                {mem.done && !rendering ? (
                    <div className="pt-2">
                        <div className={'text-[11px] ' + (mem.done.error ? 'text-warn' : 'text-fg')}>{mem.done.text}</div>
                        {!mem.done.error ? (
                            <button type="button" className={LINK + ' mt-1 text-left'} onClick={() => setPanel('look')}>
                                Same flight, another gradient: change it in Look and render again.
                            </button>
                        ) : null}
                    </div>
                ) : null}
                <div className="mt-3">
                    <div className="flex items-start gap-2">
                        <code className="flex-1 min-w-0 block text-[10px] text-fg-secondary font-mono break-all select-text p-1.5 bg-surface-header border border-line/10 rounded-sm">{ffmpeg}</code>
                        <Button onClick={() => {
                            const ok = () => say('ffmpeg line copied');
                            try { void navigator.clipboard.writeText(ffmpeg).then(ok, () => say('Copy failed. Select the line and copy it by hand.')); }
                            catch { say('Copy failed. Select the line and copy it by hand.'); }
                        }}>Copy</Button>
                    </div>
                    <div className={NOTE + ' pt-1'}>Unzip, open a terminal in that folder, paste. Long renders may arrive as more than one ZIP: unzip them into the same folder.</div>
                </div>
            </Section>

            {/* 5 ─ Still */}
            <Section title="Still" defaultOpen={false}>
                <div className="flex flex-wrap gap-3">
                    <Field label="Long edge (px)"><Num label="Still long edge in pixels" value={stillEdge} min={320} max={16384} onCommit={setStillEdge} /></Field>
                    <Field label="Samples"><Num label="Still samples" value={stillSamples} min={1} max={256} onCommit={setStillSamples} /></Field>
                </div>
                <div className={LINE}>{size(stillEdge)}</div>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                    {stilling ? (
                        <>
                            <span className={LINE}>exporting · Esc cancels · {fmtClock(elapsed)}</span>
                            <Button onClick={cancel}>Cancel</Button>
                        </>
                    ) : (
                        <Button onClick={exportStill} disabled={!ready || busy}
                            title={!ready ? 'waiting for shader' : recording ? 'Stop recording first' : busy ? 'Busy' : 'Render this view to a PNG'}>
                            Export PNG
                        </Button>
                    )}
                </div>
                {mem.stillMsg && !stilling ? <div className="text-[11px] text-fg-secondary pt-1">{mem.stillMsg}</div> : null}
                <div className={NOTE + ' pt-1'}>X exports at the core's own defaults.</div>
            </Section>
        </PanelFrame>
    );
}
