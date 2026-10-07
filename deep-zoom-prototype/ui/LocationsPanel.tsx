/**
 * deep-zoom-prototype/ui/LocationsPanel.tsx — the Locations side panel: save / copy / paste a view,
 * starter dives, and the saved list ("My locations").
 *
 * INTEGRATION SEAMS (the shell wires these; nothing here depends on them being wired)
 *   - Before every jump or dive this panel dispatches `deep-zoom:back-view` on `window` with
 *     `detail: DzView` (the view being left), so the shell can keep its Back view.
 *   - "Dive from here" dispatches `deep-zoom:focus-dive` on `window` (the gauge focuses its
 *     "Dive to 1e-" field). Unwired, the button still performs the jump.
 *   - `saveCurrentView()` is exported so the shell's B shortcut runs the same Bookmark procedure
 *     as the "Save this view" button.
 *
 * PITFALLS
 *   - Telemetry changes about 8 times a second. The panel body selects only `ready`; the live
 *     depth line is its own small component so the list does not re-render at that rate.
 *   - A pasted or imported view may lack look fields. They are filled from the CURRENT view, so a
 *     partial view never reaches `setView` with holes in it.
 *   - Depth is not stored in a bare view. Such a location shows "depth not recorded" rather than a
 *     guessed number.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { DzBridge, DzView } from '../bridge';
import type { Bookmark } from '../store';
import { useDeepZoom } from '../store';
import { Button, PanelFrame, Section } from './kit';
import type { Starter } from './starters';
import { STARTERS } from './starters';

/* ───────── formats ───────── */

/** 6.40e-53 */
export function formatDepth(d: number | null | undefined): string {
    if (typeof d !== 'number' || !Number.isFinite(d) || d <= 0) return '—';
    let exp = Math.floor(Math.log10(d));
    let m = d / Math.pow(10, exp);
    if (Number(m.toFixed(2)) >= 10) { m /= 10; exp += 1; }
    return m.toFixed(2) + 'e' + exp;
}

/** 1e-30 (chips and list rows) */
function compactDepth(d: number): string {
    if (!Number.isFinite(d) || d <= 0) return '—';
    let exp = Math.floor(Math.log10(d));
    let m = Math.round(d / Math.pow(10, exp));
    if (m >= 10) { m = 1; exp += 1; }
    return m + 'e' + exp;
}

function exponentOf(d: number): string {
    if (!Number.isFinite(d) || d <= 0) return '?';
    return 'e' + Math.round(Math.log10(d));
}

/** The bridge's dive pace: 0.6 s per decade, 3 to 40 s (grep DIVE_TIMEOUT_MS in ../bridge.ts). */
function diveSeconds(from: number, to: number): number {
    const decades = Math.max(0, Math.log10(from) - Math.log10(to));
    return Math.round(Math.min(40, Math.max(3, decades * 0.6)));
}

const FLOOR_LIMIT = 1e-76;

/* ───────── location text ───────── */

interface LocationObject {
    format: 'gmt-deepzoom-location';
    version: 1;
    name: string;
    depth: number;
    view: DzView;
}

function toLocation(name: string, depth: number, view: DzView): LocationObject {
    return { format: 'gmt-deepzoom-location', version: 1, name, depth, view };
}

interface ParsedLocation { name: string | null; depth: number; view: DzView }
type ParseResult = { ok: true; items: ParsedLocation[] } | { ok: false; reason: string };

const INT_RE = /^-?\d+$/;
const num = (x: unknown, fallback: number): number => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);

function parseOne(raw: unknown, base: DzView): ParsedLocation | string {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'no cam field';
    const o = raw as Record<string, unknown>;
    const inner = o.view && typeof o.view === 'object' && !Array.isArray(o.view) ? (o.view as Record<string, unknown>) : o;
    const cam = inner.cam;
    if (cam === undefined || cam === null) return 'no cam field';
    if (!Array.isArray(cam) || cam.length !== 3) return 'cam must be three integers';
    const strs: string[] = [];
    for (const c of cam) {
        const s = typeof c === 'string' ? c.trim() : '';
        if (!INT_RE.test(s)) return 'cam must be three integers';
        strs.push(s);
    }
    if (typeof inner.yaw !== 'number' || !Number.isFinite(inner.yaw)
        || typeof inner.pitch !== 'number' || !Number.isFinite(inner.pitch)) return 'no yaw or pitch';
    const ph = inner.phase;
    const phase: [number, number] = Array.isArray(ph) && ph.length === 2
        ? [num(ph[0], base.phase[0]), num(ph[1], base.phase[1])]
        : [base.phase[0], base.phase[1]];
    const view: DzView = {
        cam: [strs[0], strs[1], strs[2]],
        yaw: inner.yaw,
        pitch: inner.pitch,
        iters: num(inner.iters, base.iters),
        power: num(inner.power, base.power),
        phase,
        light: num(inner.light, base.light),
        falloff: num(inner.falloff, base.falloff),
        color: num(inner.color, base.color),
        cscale: num(inner.cscale, base.cscale),
        surf: num(inner.surf, base.surf),
    };
    const depth = num(o.depth, 0);
    return { name: typeof o.name === 'string' && o.name.trim() ? o.name.trim() : null, depth: depth > 0 ? depth : 0, view };
}

/** Accepts a location object, a bare view, a bookmark, or an array of any of them. */
function parseLocations(text: string, base: DzView): ParseResult {
    let data: unknown;
    try { data = JSON.parse(text); } catch { return { ok: false, reason: 'not JSON' }; }
    const list: unknown[] = Array.isArray(data) ? data : [data];
    if (list.length === 0) return { ok: false, reason: 'no cam field' };
    const items: ParsedLocation[] = [];
    for (const raw of list) {
        const r = parseOne(raw, base);
        if (typeof r === 'string') return { ok: false, reason: r };
        items.push(r);
    }
    return { ok: true, items };
}

/* ───────── procedures ───────── */

let idSeq = 0;
function newId(): string {
    idSeq += 1;
    return 'loc-' + Date.now().toString(36) + '-' + idSeq.toString(36) + Math.floor(Math.random() * 1296).toString(36);
}

function defaultName(depth: number): string {
    return depth > 0 ? 'View ' + formatDepth(depth) : 'View';
}

function announceBack(view: DzView): void {
    try { window.dispatchEvent(new CustomEvent<DzView>('deep-zoom:back-view', { detail: view })); } catch { /* old browser */ }
}

function liveDepth(b: DzBridge): number {
    try { return b.telemetry().depth; } catch { return 0; }
}

/** Go to a view. With `keepLook` the current look (light, falloff, colour, detail) is kept. */
function goTo(b: DzBridge, view: DzView, keepLook: boolean): void {
    const here = b.getView();
    announceBack(here);
    b.setView(keepLook
        ? { ...view, light: here.light, falloff: here.falloff, color: here.color, cscale: here.cscale, surf: here.surf }
        : view);
}

/** The Bookmark procedure. Exported for the shell's B shortcut. Returns false when the core is not connected. */
export function saveCurrentView(): boolean {
    const s = useDeepZoom.getState();
    const b = s.bridge;
    if (!b) { s.say('Not connected to the renderer yet.'); return false; }
    try {
        const depth = liveDepth(b);
        let thumb = '';
        try { thumb = b.thumbnail(128); } catch { thumb = ''; }
        s.addBookmark({ id: newId(), name: defaultName(depth), createdAt: Date.now(), depth, thumb, view: b.getView() });
        s.say('Saved · ' + formatDepth(depth));
        return true;
    } catch (e) {
        s.say('Could not save this view: ' + (e instanceof Error ? e.message : String(e)));
        return false;
    }
}

async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch { return false; }
    }
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/* ───────── small pieces ───────── */

const LINK = 'text-[11px] text-fg-tertiary hover:text-fg underline-offset-2 hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-default disabled:no-underline focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-400';
const LINK_DANGER = 'text-[11px] text-fg-dim hover:text-danger cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-400';

function ExponentTile({ depth, size }: { depth: number; size: number }) {
    return (
        <div
            style={{ width: size, height: size }}
            className="shrink-0 flex items-center justify-center rounded bg-black/60 border border-line/10 font-mono tabular-nums text-[15px] font-semibold text-fg-secondary"
        >
            {exponentOf(depth)}
        </div>
    );
}

/** The one piece that follows telemetry at its full rate. */
function DivingLine() {
    const depth = useDeepZoom((s) => s.telemetry?.depth);
    return <span className="font-mono tabular-nums text-accent-300">Diving · {formatDepth(depth)} · Esc stops</span>;
}

interface DiveJob { index: number; record: boolean }
interface DiveResult { index: number; text: string; warn: boolean }

/* ───────── starter cards ───────── */

function StarterCard({ starter, ready, connected, running, busy, result, onDive }: {
    starter: Starter;
    ready: boolean;
    connected: boolean;
    running: DiveJob | null;
    busy: boolean;
    result: string | null;
    onDive(record: boolean): void;
}) {
    const needsShader = starter.depth < 1e-4 || starter.startDepth < 1e-4;
    const offered = starter.depth >= FLOOR_LIMIT;
    const waiting = needsShader && !ready;
    const disabled = !connected || waiting || busy || !offered;
    const why = !connected ? 'Not connected to the renderer yet'
        : waiting ? 'Waiting for the deep shader to compile'
            : busy ? 'A dive is running. Esc stops it.' : undefined;
    return (
        <div className="flex gap-2 py-2 border-t border-line/5 first:border-t-0">
            <ExponentTile depth={starter.depth} size={56} />
            <div className="min-w-0 flex-1">
                <div className="text-[12px] text-fg">{starter.name}</div>
                <div className="font-mono tabular-nums text-[11px] text-fg-tertiary">
                    to {compactDepth(starter.depth)} · from about {compactDepth(starter.startDepth)} · about {diveSeconds(starter.startDepth, starter.depth)} s
                </div>
                <div className="text-[11px] text-fg-dim">{starter.blurb}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Button onClick={() => onDive(false)} disabled={disabled} title={why}>Dive</Button>
                    <Button onClick={() => onDive(true)} disabled={disabled} title={why}>Record this dive</Button>
                    {waiting && connected ? <span className="text-[11px] text-fg-dim">(waiting for shader)</span> : null}
                </div>
                {running ? (
                    <div className="mt-1 text-[11px]">
                        <DivingLine />{running.record ? <span className="text-danger"> · REC</span> : null}
                    </div>
                ) : result ? (
                    <div className="mt-1 text-[11px] font-mono tabular-nums text-fg-secondary">{result}</div>
                ) : null}
            </div>
        </div>
    );
}

/* ───────── saved rows ───────── */

function LocationRow({ mark, connected, onGo, onDiveFrom, onRecordFrom, onCopy }: {
    mark: Bookmark;
    connected: boolean;
    onGo(): void;
    onDiveFrom(): void;
    onRecordFrom(): void;
    onCopy(): void;
}) {
    const rename = useDeepZoom((s) => s.renameBookmark);
    const remove = useDeepZoom((s) => s.removeBookmark);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(mark.name);
    const [asking, setAsking] = useState(false);

    const commit = () => {
        const name = draft.trim();
        if (name && name !== mark.name) rename(mark.id, name);
        setEditing(false);
    };

    return (
        <li className="flex gap-2 py-2 border-t border-line/5 first:border-t-0">
            {mark.thumb
                ? <img src={mark.thumb} alt="" width={64} height={64} className="shrink-0 w-16 h-16 rounded object-cover border border-line/10" />
                : <ExponentTile depth={mark.depth} size={64} />}
            <div className="min-w-0 flex-1">
                {editing ? (
                    <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commit}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') commit();
                            else if (e.key === 'Escape') { setDraft(mark.name); setEditing(false); }
                        }}
                        aria-label="Location name"
                        className="w-full h-[24px] bg-surface-header border border-line/20 rounded px-1.5 text-[12px] text-fg font-mono focus:outline-none focus:border-accent-400"
                    />
                ) : (
                    <button
                        type="button"
                        title="Click to rename"
                        onClick={() => { setDraft(mark.name); setEditing(true); }}
                        className="block max-w-full truncate text-left text-[12px] text-fg hover:text-accent-300 cursor-text focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-400"
                    >
                        {mark.name}
                    </button>
                )}
                <div className="font-mono tabular-nums text-[11px] text-fg-tertiary">
                    {mark.depth > 0 ? formatDepth(mark.depth) : 'depth not recorded'}
                    {mark.view.power !== 8 ? ' · n=' + mark.view.power : ''}
                </div>
                {asking ? (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-fg-secondary">
                        <span>Delete &lsquo;{mark.name}&rsquo;?</span>
                        <button type="button" className={LINK_DANGER} onClick={() => remove(mark.id)}>Delete</button>
                        <button type="button" className={LINK} onClick={() => setAsking(false)}>Keep</button>
                    </div>
                ) : (
                    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                        <button type="button" className={LINK + ' text-accent-300'} disabled={!connected} onClick={onGo}>Go</button>
                        <button type="button" className={LINK} disabled={!connected} onClick={onDiveFrom}>Dive from here</button>
                        <button type="button" className={LINK} disabled={!connected} onClick={onRecordFrom}>Record from here</button>
                        <button type="button" className={LINK} onClick={onCopy}>Copy</button>
                        <button type="button" className={LINK_DANGER} onClick={() => setAsking(true)}>Delete</button>
                    </div>
                )}
            </div>
        </li>
    );
}

/* ───────── the panel ───────── */

export function LocationsPanel() {
    const bridge = useDeepZoom((s) => s.bridge);
    const ready = useDeepZoom((s) => s.telemetry?.ready ?? false);
    const hasTelemetry = useDeepZoom((s) => s.telemetry !== null);
    const bookmarks = useDeepZoom((s) => s.bookmarks);
    const say = useDeepZoom((s) => s.say);
    const setPanel = useDeepZoom((s) => s.setPanel);

    const [restoreLook, setRestoreLook] = useState(false);
    const [pasting, setPasting] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [pasteError, setPasteError] = useState<string | null>(null);
    const [job, setJob] = useState<DiveJob | null>(null);
    const [result, setResult] = useState<DiveResult | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const jobRef = useRef(false);

    const connected = bridge !== null && hasTelemetry;

    // Shallow to deep; locations with no recorded depth go last.
    const sorted = useMemo(() => {
        const key = (b: Bookmark) => (b.depth > 0 ? -Math.log10(b.depth) : Number.POSITIVE_INFINITY);
        return [...bookmarks].sort((a, b) => key(a) - key(b) || a.createdAt - b.createdAt);
    }, [bookmarks]);

    const fail = useCallback((what: string, e: unknown) => {
        say(what + ': ' + (e instanceof Error ? e.message : String(e)));
    }, [say]);

    const copyCurrent = async () => {
        if (!bridge) return;
        try {
            const depth = liveDepth(bridge);
            const text = JSON.stringify(toLocation(defaultName(depth), depth, bridge.getView()), null, 1);
            const ok = await copyText(text);
            say(ok ? 'Location copied · ' + formatDepth(depth) + ' · ' + text.length + ' chars' : 'Could not reach the clipboard.');
        } catch (e) { fail('Could not copy', e); }
    };

    const copyRow = async (m: Bookmark) => {
        const text = JSON.stringify(toLocation(m.name, m.depth, m.view), null, 1);
        const ok = await copyText(text);
        say(ok ? 'Location copied · ' + formatDepth(m.depth) + ' · ' + text.length + ' chars' : 'Could not reach the clipboard.');
    };

    const toBookmarks = (items: ParsedLocation[]): Bookmark[] => items.map((it) => ({
        id: newId(),
        name: it.name ?? defaultName(it.depth),
        createdAt: Date.now(),
        depth: it.depth,
        thumb: '',
        view: it.view,
    }));

    const submitPaste = () => {
        if (!bridge) { setPasteError('Not connected to the renderer yet.'); return; }
        let base: DzView;
        try { base = bridge.getView(); } catch (e) { setPasteError('The renderer did not answer: ' + String(e)); return; }
        const r = parseLocations(pasteText, base);
        if (!r.ok) { setPasteError('Not a deep-zoom location: ' + r.reason); return; }
        try {
            // A pasted location is exact text, so its look fields are honoured only when asked for.
            goTo(bridge, r.items[0].view, !restoreLook);
            if (r.items.length > 1) useDeepZoom.getState().importBookmarks(toBookmarks(r.items));
            say(r.items.length > 1
                ? 'Opened the first of ' + r.items.length + ' locations · all added to My locations'
                : 'Went to pasted location' + (r.items[0].depth > 0 ? ' · ' + formatDepth(r.items[0].depth) : ''));
            setPasting(false);
            setPasteText('');
            setPasteError(null);
            bridge.focus();
        } catch (e) { setPasteError('The renderer refused that view: ' + (e instanceof Error ? e.message : String(e))); }
    };

    const runStarter = async (index: number, record: boolean) => {
        const b = bridge;
        const starter = STARTERS[index];
        if (!b || !starter || jobRef.current) return;
        if (starter.depth < FLOOR_LIMIT) return;
        jobRef.current = true;
        setResult(null);
        setJob({ index, record });
        let startedRecording = false;
        try {
            // A starter is a whole scene, so its view goes in whole (power, phase and look).
            goTo(b, starter.view, false);
            await sleep(400); // let the new reference orbit land before the dive samples the surface
            if (record && !b.recording()) { b.recordToggle(); startedRecording = true; }
            b.focus();
            await b.diveTo(starter.depth);
            if (startedRecording && b.recording()) b.recordToggle();
            const d = liveDepth(b);
            const arrived = d > 0 && d <= starter.depth * 3 && d >= starter.depth / 3;
            setResult({
                index,
                warn: !arrived,
                text: arrived ? 'Arrived · ' + formatDepth(d) : 'Stopped at ' + formatDepth(d) + ' · aim at the surface and dive again',
            });
            if (record) {
                const path = JSON.parse(JSON.stringify(b.lastPath())) as ReturnType<DzBridge['lastPath']> | null;
                if (!path || !Array.isArray(path.frames) || path.frames.length < 2) {
                    say('No keys were recorded. Press M and fly it by hand.');
                } else {
                    useDeepZoom.getState().setPath(path);
                    setPanel('record');
                }
            }
        } catch (e) {
            try { if (startedRecording && b.recording()) b.recordToggle(); } catch { /* core gone */ }
            setResult({ index, warn: true, text: 'Dive failed: ' + (e instanceof Error ? e.message : String(e)) });
        } finally {
            jobRef.current = false;
            setJob(null);
        }
    };

    const goRow = (m: Bookmark) => {
        if (!bridge) return;
        try { goTo(bridge, m.view, !restoreLook); bridge.focus(); } catch (e) { fail('Could not go there', e); }
    };

    const diveFromRow = (m: Bookmark) => {
        if (!bridge) return;
        try {
            goTo(bridge, m.view, !restoreLook);
            window.dispatchEvent(new CustomEvent('deep-zoom:focus-dive'));
        } catch (e) { fail('Could not go there', e); }
    };

    const recordFromRow = (m: Bookmark) => {
        if (!bridge) return;
        try {
            goTo(bridge, m.view, !restoreLook);
            if (!bridge.recording()) bridge.recordToggle();
            bridge.focus();
            say('Recording · fly, then press M to stop');
        } catch (e) { fail('Could not start recording', e); }
    };

    const exportAll = () => {
        try {
            const list = sorted.map((m) => toLocation(m.name, m.depth, m.view));
            const url = URL.createObjectURL(new Blob([JSON.stringify(list, null, 1)], { type: 'application/json' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'deep-zoom-locations.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.setTimeout(() => URL.revokeObjectURL(url), 2000);
            say('Exported ' + list.length + ' locations (thumbnails left out)');
        } catch (e) { fail('Could not export', e); }
    };

    const importFile = async (file: File) => {
        try {
            const text = await file.text();
            // Look fields missing from a file are filled from the current view, or neutral values with no core.
            let base: DzView = { cam: ['0', '0', '0'], yaw: 0, pitch: 0, iters: 14, power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 };
            if (bridge) { try { base = bridge.getView(); } catch { /* keep neutral */ } }
            const r = parseLocations(text, base);
            if (!r.ok) { say('Not a deep-zoom location file: ' + r.reason); return; }
            const have = new Set(useDeepZoom.getState().bookmarks.map((m) => m.view.cam.join(',') + '|' + m.view.yaw + '|' + m.view.pitch));
            const fresh = r.items.filter((it) => !have.has(it.view.cam.join(',') + '|' + it.view.yaw + '|' + it.view.pitch));
            useDeepZoom.getState().importBookmarks(toBookmarks(fresh));
            say('Imported ' + fresh.length + ' of ' + r.items.length + ' locations' + (fresh.length < r.items.length ? ' (the rest were already here)' : ''));
        } catch (e) { fail('Could not import', e); }
    };

    return (
        <PanelFrame title="Locations" onClose={() => setPanel('none')} width={340}>
            <div className="p-3 border-b border-line/10">
                <div className="flex flex-wrap items-center gap-1.5">
                    <Button primary onClick={() => { saveCurrentView(); }} disabled={!connected} title={connected ? 'Save this view to My locations (B)' : 'Not connected to the renderer yet'}>Save this view</Button>
                    <Button onClick={() => { void copyCurrent(); }} disabled={!connected} title={connected ? 'Copy the exact view as JSON text' : 'Not connected to the renderer yet'}>Copy location</Button>
                    <Button onClick={() => { setPasting((p) => !p); setPasteError(null); }} disabled={!connected} title={connected ? 'Restore a view from JSON text' : 'Not connected to the renderer yet'}>Paste location</Button>
                </div>
                {!connected ? <div className="mt-2 text-[11px] text-fg-dim">Waiting for the renderer.</div> : null}
                {pasting ? (
                    <div className="mt-2">
                        <textarea
                            autoFocus
                            rows={6}
                            value={pasteText}
                            onChange={(e) => { setPasteText(e.target.value); setPasteError(null); }}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder="Paste a location (JSON)"
                            spellCheck={false}
                            className="w-full resize-y bg-surface-header border border-line/20 rounded px-2 py-1.5 font-mono text-[11px] text-fg-secondary placeholder:text-fg-faint focus:outline-none focus:border-accent-400"
                        />
                        {pasteError ? <div role="alert" className="mt-1 text-[11px] text-warn">{pasteError}</div> : null}
                        <div className="mt-1.5 flex items-center gap-1.5">
                            <Button primary onClick={submitPaste} disabled={!pasteText.trim()} title={pasteText.trim() ? undefined : 'Paste some text first'}>Go</Button>
                            <Button onClick={() => { setPasting(false); setPasteText(''); setPasteError(null); }}>Cancel</Button>
                        </div>
                    </div>
                ) : null}
            </div>

            <Section title="Starter dives">
                <div className="mb-1 text-[11px] text-fg-dim">
                    Each jumps to a view from the sample flight and dives straight ahead. Start depths are approximate.
                </div>
                {STARTERS.map((s, i) => (
                    <StarterCard
                        key={s.name}
                        starter={s}
                        ready={ready}
                        connected={connected}
                        running={job && job.index === i ? job : null}
                        busy={job !== null}
                        result={result && result.index === i ? result.text : null}
                        onDive={(record) => { void runStarter(i, record); }}
                    />
                ))}
            </Section>

            <Section title={'My locations' + (bookmarks.length ? ' · ' + bookmarks.length : '')}>
                <label className="flex items-center gap-2 text-[11px] text-fg-secondary cursor-pointer select-none">
                    <input type="checkbox" checked={restoreLook} onChange={(e) => setRestoreLook(e.target.checked)} className="accent-cyan-400" />
                    <span>Also restore look settings</span>
                </label>
                <div className="mb-1 text-[11px] text-fg-dim">
                    {restoreLook ? 'Lighting, colour and detail come from the location.' : 'Lighting, colour and detail stay as they are now.'} Power, phase and iterations are always restored.
                </div>
                {sorted.length === 0 ? (
                    <div className="py-3 text-[11px] text-fg-tertiary">No locations yet. Press B while flying, or Save this view.</div>
                ) : (
                    <ul className="m-0 p-0 list-none">
                        {sorted.map((m) => (
                            <LocationRow
                                key={m.id}
                                mark={m}
                                connected={connected}
                                onGo={() => goRow(m)}
                                onDiveFrom={() => diveFromRow(m)}
                                onRecordFrom={() => recordFromRow(m)}
                                onCopy={() => { void copyRow(m); }}
                            />
                        ))}
                    </ul>
                )}
            </Section>

            <div className="p-3 border-t border-line/10">
                <div className="flex flex-wrap items-center gap-1.5">
                    <Button onClick={exportAll} disabled={bookmarks.length === 0} title={bookmarks.length === 0 ? 'Nothing saved yet' : 'Downloads deep-zoom-locations.json, thumbnails left out'}>Export all (JSON)</Button>
                    <Button onClick={() => fileRef.current?.click()}>Import (JSON)</Button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".json,application/json,text/plain"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (f) void importFile(f);
                        }}
                    />
                </div>
                <div className="mt-1.5 text-[11px] text-fg-dim">Saved in this browser. If its storage fills up, export, then delete some.</div>
            </div>
        </PanelFrame>
    );
}
