/**
 * deep-zoom-prototype/ui/TopBar.tsx — the one-row bar across the top of the picture.
 *
 * PURPOSE
 *   Left: tool name, formula + power (opens Look), state chip (FLY / DIVE / REC with a clock /
 *   PLAY / RENDER), engine badge (f32 / perturbation / shader state).
 *   Middle: fps, frame size, iterations, still convergence; during a render, the render line and
 *   a Cancel button.
 *   Right: Home, Back, the Record button, and the four panel buttons.
 *   Under the bar on first load: one slim line while the deep shader compiles.
 *
 * INTEGRATION SEAMS
 *   - Reads `useDeepZoom` (telemetry, bridge, panel) and `useDzChrome` from `./DepthGauge`
 *     (captured, overlayMode, home/back view, dive, renderInfo).
 *   - The render line's frame count comes from `useDzChrome.getState().setRenderInfo(...)`, which
 *     the shell calls while a path render runs. A still export has no frame count, so the bar
 *     shows 'rendering · m:ss elapsed' for it.
 *
 * PITFALLS
 *   - Clocks tick once a second and only while recording or rendering, so nothing repaints while
 *     the picture is idle and converging.
 *   - After a click on the bar, keyboard focus is handed back to the renderer (`bridge.focus()`)
 *     so the fly keys keep working.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useDeepZoom } from '../store';
import type { PanelId } from '../store';
import { dzActions, useDzChrome } from './DepthGauge';

function clock(sec: number): string {
    const s = Math.max(0, Math.floor(sec));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

/** Seconds since `active` last became true, ticking once a second; 0 while inactive. */
function useElapsed(active: boolean): number {
    const [sec, setSec] = useState(0);
    useEffect(() => {
        if (!active) {
            setSec(0);
            return undefined;
        }
        const t0 = performance.now();
        setSec(0);
        const id = window.setInterval(() => setSec((performance.now() - t0) / 1000), 1000);
        return () => window.clearInterval(id);
    }, [active]);
    return sec;
}

const Dot = (): React.ReactElement => <span className="text-zinc-600 px-1.5">·</span>;

const barBtn = 'h-6 px-2 rounded text-[12px] border border-white/15 text-zinc-200 hover:bg-white/10 '
    + 'disabled:text-zinc-600 disabled:hover:bg-transparent disabled:cursor-not-allowed';
const chip = 'h-5 px-1.5 rounded border text-[11px] font-mono tabular-nums inline-flex items-center gap-1 whitespace-nowrap';

const PANELS: Array<{ id: Exclude<PanelId, 'none'>; label: string; key: string }> = [
    { id: 'locations', label: 'Locations', key: '1' },
    { id: 'record', label: 'Record', key: '2' },
    { id: 'look', label: 'Look', key: '3' },
    { id: 'help', label: 'Help', key: '/' },
];

const RENDER_LOCK = 'Rendering. Cancel to change the view.';

export function TopBar(): React.ReactElement | null {
    const hasBridge = useDeepZoom((s) => s.bridge !== null);
    const hasTelemetry = useDeepZoom((s) => s.telemetry !== null);
    const ready = useDeepZoom((s) => s.telemetry?.ready ?? false);
    const error = useDeepZoom((s) => s.telemetry?.error ?? '');
    const mode = useDeepZoom((s) => s.telemetry?.mode ?? 'f32');
    const power = useDeepZoom((s) => s.telemetry?.power);
    const fps = useDeepZoom((s) => Math.round(s.telemetry?.fps ?? 0));
    const frameW = useDeepZoom((s) => s.telemetry?.frameW ?? 0);
    const frameH = useDeepZoom((s) => s.telemetry?.frameH ?? 0);
    const iters = useDeepZoom((s) => s.telemetry?.iters ?? 0);
    const accumN = useDeepZoom((s) => s.telemetry?.accumN ?? 0);
    const accumMax = useDeepZoom((s) => s.telemetry?.accumMax ?? 0);
    const recording = useDeepZoom((s) => s.telemetry?.recording ?? false);
    const playing = useDeepZoom((s) => s.telemetry?.playing ?? false);
    const exporting = useDeepZoom((s) => s.telemetry?.exporting ?? false);
    const panel = useDeepZoom((s) => s.panel);

    const captured = useDzChrome((s) => s.captured);
    const overlayMode = useDzChrome((s) => s.overlayMode);
    const hasHome = useDzChrome((s) => s.homeView !== null);
    const hasBack = useDzChrome((s) => s.backView !== null);
    const diving = useDzChrome((s) => s.dive !== null);
    const renderInfo = useDzChrome((s) => s.renderInfo);

    const recSec = useElapsed(recording);
    const renderSec = useElapsed(exporting);

    // Still progress: shown while converging, kept 2 s at full, then hidden.
    const stillDone = accumMax > 0 && accumN >= accumMax;
    const [stillHidden, setStillHidden] = useState(false);
    useEffect(() => {
        if (!stillDone) {
            setStillHidden(false);
            return undefined;
        }
        const id = window.setTimeout(() => setStillHidden(true), 2000);
        return () => window.clearTimeout(id);
    }, [stillDone]);
    const showStill = !exporting && accumN > 1 && accumMax > 0 && !stillHidden;

    // First load: 'compiling' while not ready, then 'ready' for 3 s.
    const wasWaiting = useRef(false);
    const [readyNote, setReadyNote] = useState(false);
    useEffect(() => {
        if (!hasTelemetry) return undefined;
        if (!ready) {
            wasWaiting.current = true;
            return undefined;
        }
        if (!wasWaiting.current) return undefined;
        wasWaiting.current = false;
        setReadyNote(true);
        const id = window.setTimeout(() => setReadyNote(false), 3000);
        return () => window.clearTimeout(id);
    }, [ready, hasTelemetry]);

    if (overlayMode !== 0) return null;

    const refocus = () => {
        try { useDeepZoom.getState().bridge?.focus(); } catch { /* frame gone */ }
    };
    const togglePanel = (id: PanelId) => {
        const s = useDeepZoom.getState();
        s.setPanel(s.panel === id ? 'none' : id);
        refocus();
    };
    const toggleRecord = () => {
        const s = useDeepZoom.getState();
        const b = s.bridge;
        if (!b) return;
        try {
            const on = b.recordToggle();
            if (!on) {
                // Stopped: hand the flight to the Record panel.
                const p = JSON.parse(JSON.stringify(b.lastPath())) as ReturnType<typeof b.lastPath>;
                if (p && Array.isArray(p.frames) && p.frames.length >= 2) {
                    s.setPath(p);
                    s.setPanel('record');
                } else {
                    s.say('No keys were recorded. Fly while recording, then stop.');
                }
            }
        } catch (e) {
            s.say('Recording failed: ' + (e instanceof Error ? e.message : String(e)));
        }
        refocus();
    };
    const cancelRender = () => {
        try { useDeepZoom.getState().bridge?.cancelRender(); } catch { /* frame gone */ }
    };

    // State chip
    let stateChip: React.ReactElement;
    if (exporting) stateChip = <span className={chip + ' border-white/15 text-zinc-200'}>RENDER</span>;
    else if (recording) {
        stateChip = (
            <span className={chip + ' border-red-500/60 text-red-500'}>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                REC {clock(recSec)}
            </span>
        );
    } else if (playing) stateChip = <span className={chip + ' border-white/15 text-zinc-200'}>PLAY</span>;
    else if (diving) stateChip = <span className={chip + ' border-cyan-400/50 text-cyan-400'}>DIVE</span>;
    else stateChip = <span className={chip + ' border-white/15 text-zinc-400'}>FLY</span>;

    // Engine badge
    const ENGINE_TITLE = 'f32 above about 1e-4 surface distance. Below it, perturbation with a 256-bit reference.';
    let badge: React.ReactElement | null = null;
    if (hasTelemetry) {
        if (error !== '') {
            badge = <span className={chip + ' border-amber-400/60 text-amber-400'} title={error}>shader error</span>;
        } else if (!ready) {
            badge = <span className={chip + ' border-white/15 text-zinc-400'} title={ENGINE_TITLE}>f32 · deep shader compiling</span>;
        } else {
            badge = (
                <span className={chip + ' border-white/15 text-zinc-400'} title={ENGINE_TITLE}>
                    {mode === 'deep' ? 'perturbation' : 'f32'}
                </span>
            );
        }
    }

    // Middle
    let middle: React.ReactNode;
    if (!hasTelemetry) {
        middle = <span className="text-zinc-600">{hasBridge ? 'starting' : 'loading renderer'}</span>;
    } else if (exporting) {
        let line = 'rendering · ' + clock(renderSec) + ' elapsed';
        if (renderInfo && renderInfo.total > 0) {
            const f = Math.min(renderInfo.frame, renderInfo.total);
            line = 'frame ' + f + '/' + renderInfo.total + ' · ' + Math.round((f / renderInfo.total) * 100) + '% · '
                + clock(renderSec) + ' elapsed';
            // Measured, not guessed: a time left only once this render has finished a frame.
            // `f` is the frame being rendered, so f - 1 frames are finished.
            const done = f - 1;
            if (done > 0 && renderSec > 0) line += ' · ' + clock((renderSec / done) * (renderInfo.total - done)) + ' left';
        }
        middle = (
            <>
                <span className="text-zinc-200">{line}</span>
                <button type="button" className={barBtn + ' ml-2 font-sans'} title="Stop the render. Frames finished so far are still saved." onClick={cancelRender}>
                    Cancel
                </button>
            </>
        );
    } else {
        middle = (
            <>
                <span>{fps} fps</span>
                <Dot />
                <span>{frameW}x{frameH}</span>
                <Dot />
                <span title="[ ] change iterations, I returns to automatic">iter {iters}</span>
                {showStill && (
                    <>
                        <Dot />
                        <span className="text-zinc-200">still {Math.min(accumN, accumMax)}/{accumMax}</span>
                    </>
                )}
            </>
        );
    }

    const viewLocked = exporting;
    const fade = captured ? 'opacity-[0.35]' : 'opacity-100';

    return (
        <div className={'absolute top-0 left-0 right-0 z-20 select-none transition-opacity duration-150 ' + fade}>
            <div className="relative h-9 flex items-center gap-2 px-2 bg-black/55 backdrop-blur-sm border-b border-white/10 text-[12px] text-zinc-200 whitespace-nowrap">
                {/* LEFT */}
                <span className="font-semibold">Deep Zoom</span>
                <button
                    type="button"
                    className="text-zinc-400 hover:text-zinc-200 disabled:hover:text-zinc-400 disabled:cursor-not-allowed"
                    title={viewLocked ? RENDER_LOCK : 'Formula and power. Opens the Look panel (3)'}
                    disabled={viewLocked}
                    onClick={() => togglePanel('look')}
                >
                    Mandelbulb{typeof power === 'number' ? ' n=' + (Math.round(power * 100) / 100) : ''}
                </button>
                {stateChip}
                {badge}

                {/* MIDDLE */}
                <div className="flex-1 min-w-0 flex items-center justify-center overflow-hidden font-mono tabular-nums text-zinc-400">
                    {middle}
                </div>

                {/* RIGHT */}
                <button
                    type="button"
                    className={barBtn}
                    disabled={!hasHome || viewLocked}
                    title={viewLocked ? RENDER_LOCK : hasHome ? 'Go to the home view (Home)' : 'The renderer has not started yet'}
                    onClick={() => dzActions.goHome()}
                >
                    Home
                </button>
                <button
                    type="button"
                    className={barBtn}
                    disabled={!hasBack || viewLocked}
                    title={viewLocked ? RENDER_LOCK : hasBack ? 'Go back to the view before the last dive or jump (Backspace)' : 'No earlier view'}
                    onClick={() => dzActions.goBack()}
                >
                    Back
                </button>
                <button
                    type="button"
                    className={barBtn + ' inline-flex items-center gap-1.5 ' + (recording ? 'border-red-500/60' : '')}
                    disabled={!hasBridge || viewLocked}
                    title={viewLocked ? RENDER_LOCK : recording ? 'Stop recording (M)' : 'Record flight (M)'}
                    onClick={toggleRecord}
                >
                    <span className={'inline-block w-2 h-2 bg-red-500 ' + (recording ? 'rounded-[1px]' : 'rounded-full')} />
                    {recording ? 'Stop' : 'Rec'}
                </button>
                <span className="w-px h-4 bg-white/10" />
                {PANELS.map((p) => {
                    const lit = panel === p.id;
                    const locked = viewLocked && (p.id === 'locations' || p.id === 'look');
                    return (
                        <button
                            key={p.id}
                            type="button"
                            className={'h-6 px-2 rounded text-[12px] border disabled:text-zinc-600 disabled:cursor-not-allowed '
                                + (lit
                                    ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10'
                                    : 'border-white/15 text-zinc-200 hover:bg-white/10 disabled:hover:bg-transparent')}
                            disabled={locked}
                            title={locked ? RENDER_LOCK : p.label + ' (' + p.key + ')'}
                            aria-pressed={lit}
                            onClick={() => togglePanel(p.id)}
                        >
                            {p.label}
                        </button>
                    );
                })}

                {/* still / render progress along the bottom edge */}
                {showStill && (
                    <div
                        className="absolute left-0 bottom-0 h-0.5 bg-cyan-400"
                        style={{ width: (Math.min(1, accumN / accumMax) * 100).toFixed(1) + '%' }}
                    />
                )}
                {exporting && renderInfo && renderInfo.total > 0 && (
                    <div
                        className="absolute left-0 bottom-0 h-0.5 bg-cyan-400"
                        style={{ width: (Math.min(1, renderInfo.frame / renderInfo.total) * 100).toFixed(1) + '%' }}
                    />
                )}
            </div>

            {/* FIRST LOAD */}
            {hasTelemetry && error === '' && (!ready || readyNote) && (
                <div className="h-5 flex items-center justify-center bg-black/55 border-b border-white/10 text-[11px] text-zinc-400 whitespace-nowrap overflow-hidden">
                    {!ready
                        ? 'Compiling deep shader · 5-10 s, first visit only · you can fly now, down to 1e-4'
                        : 'Deep zoom ready · range 1e-4 to 1e-77'}
                </div>
            )}
        </div>
    );
}
