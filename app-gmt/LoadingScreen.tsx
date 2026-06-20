/**
 * GMT loading screen — verbatim port of gmt-0.8.5/components/LoadingScreen.tsx.
 *
 * Shows while the worker boots: GMT wordmark, CPU Julia spinner, formula
 * picker dropdown (switches formula before boot), "Load From File..." entry
 * for drag-loading .gmf/.json/.png, Lite Render toggle, and a "LOADING
 * SHARED SCENE" message when started from a #s= URL.
 *
 * Mounts in AppGmt.tsx on top of everything (z-[100]).
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LoadingRendererCPU } from './LoadingRendererCPU';
import { useEngineStore } from '../store/engineStore';
import { registry } from '../engine-gmt/engine/FractalRegistry';
import { GmtWordmark } from '../engine-gmt/topbar/GmtWordmark';
import { ChevronDown, UploadIcon, CubeIcon, NetworkIcon } from '../components/Icons';
import { loadSceneFile } from '../engine/plugins/SceneIO';
import type { Preset } from '../types';
import { useCompileProgress, selectProgress } from '../store/CompileProgressStore';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import { submitFeedback } from '../engine-gmt/feedback/FeedbackClient';
import { collectBootDiagnostics } from '../engine-gmt/engine/webglDiagnostics';

// Injected by Vite's `define` from package.json (see vite.config.ts).
declare const __APP_VERSION__: string;

// Once the engine is ready, the splash may linger this long waiting for the
// cosmetic compile bar to report 'done' — after which it fades regardless, so
// a missed 'done' signal can't trap a rendering app behind the splash.
const LOADING_FADE_GRACE_MS = 1000;

const GMT_NAMES = [
    'Generative Math Tracer', 'GPU Manifold Tracer', 'GPU Mandelorus Tracer',
    'Geometric Morphology Toolkit', 'GLSL Marching Toolkit', 'Generative Morphology Theater',
    'Grand Mathematical Topography', 'Geometric Manifold Traversal', 'Gradient Mapped Topology',
    'Generalized Mesh Tracer', 'Gravitational Manifold Theory', 'Glass Mountain Telescope',
    'Ghost Manifold Terminal', 'Garden of Mathematical Terrain', 'Glimpse Machine Terminal',
    'Grey Matter Telescope', 'Grotesque Math Theater', 'Geometry Mutation Terminal',
    'Grand Mythos Terminal', 'Glowing Mathematical Topologies', 'Guy Makes Things',
    "Guy's Math Toy", 'Gnarly Math Thing', 'Generally Mesmerizing Thingamajig',
    'Give Me Tentacles', 'Gloriously Melted Teapots', 'Gaze-into Mathematical Twilight',
    'Greenwich Mean Time', 'Geometrically Mangled Tesseracts', 'Gratuitous Mandelbulb Torture',
    'Got More Tentacles', 'Groovy Morphing Thingamabob',
];

const pickRandomName = () => GMT_NAMES[Math.floor(Math.random() * GMT_NAMES.length)];
const getThumbPath = (id: string) => `thumbnails/fractal_${id}.jpg`;

interface LoadingScreenProps {
    isReady: boolean;
    onFinished: () => void;
    startupMode: 'default' | 'url';
    bootEngine: (force?: boolean) => void;
    isStartupReady: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isReady, onFinished, startupMode, bootEngine, isStartupReady }) => {
    const fgCanvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<LoadingRendererCPU | null>(null);

    const isMenuOpenRef = useRef(false);
    const isReadyRef = useRef(isReady);
    // When the engine first became ready — lets the fade release after a grace
    // period even if the compile bar never reports 'done' (see fade gate).
    const readyAtRef = useRef<number | null>(null);
    const bootEngineRef = useRef(bootEngine);
    const hasBootedRef = useRef(false);

    useEffect(() => {
        isReadyRef.current = isReady;
        if (isReady && readyAtRef.current === null) readyAtRef.current = performance.now();
    }, [isReady]);
    useEffect(() => { bootEngineRef.current = bootEngine; }, [bootEngine]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeFormula = useEngineStore(s => s.formula);
    const loadScene = useEngineStore(s => s.loadScene);
    const quality = useEngineStore(s => (s as any).quality);
    const isLiteRender = quality?.precisionMode === 1;

    const [progress, setProgress] = useState(0);
    const progressRef = useRef(0);
    const [opacity, setOpacity] = useState(1);
    const [isVisible, setIsVisible] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [bootError, setBootError] = useState<string | null>(null);
    const bootErrorRef = useRef<string | null>(null);
    useEffect(() => { bootErrorRef.current = bootError; }, [bootError]);
    useEffect(() => { isMenuOpenRef.current = isMenuOpen; }, [isMenuOpen]);

    // Surface worker boot failures. Previously the splash sat at the
    // post-bar state forever waiting on `isReady`, which never flipped
    // because GmtRendererTickDriver was polling a `proxy.isBooted` that
    // would never become true. WorkerProxy now emits this event from
    // both _handleWorkerCrash (worker thread died) and the 'ERROR'
    // message handler (worker reported an error before BOOTED arrived).
    useEffect(() => {
        const off = FractalEvents.on(FRACTAL_EVENTS.WORKER_BOOT_FAILED, ({ reason }) => {
            setBootError(reason);
        });
        return off;
    }, []);

    // Boot-failure diagnostics — a main-thread WebGL2 probe (GPU, fragment
    // highp, extensions, OffscreenCanvas) collected lazily once a failure
    // surfaces. Gives the user (and us) an actionable report — the only way
    // to diagnose devices we can't physically test.
    const [diagnostics, setDiagnostics] = useState('');
    useEffect(() => {
        if (bootError && !diagnostics) setDiagnostics(collectBootDiagnostics());
    }, [bootError, diagnostics]);

    const [reportState, setReportState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const sendReport = async () => {
        setReportState('sending');
        try {
            await submitFeedback({
                category: 'bug',
                message: `Engine failed to start.\n\nReason:\n${bootError ?? '(unknown)'}\n\n--- diagnostics ---\n${diagnostics || collectBootDiagnostics()}`,
                includeScene: false,
            });
            setReportState('sent');
        } catch {
            setReportState('error');
        }
    };

    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [subtitle] = useState(pickRandomName);

    /**
     * @invariant `hasBootedRef` is a one-way latch. Once a boot has fired
     *   this component never auto-boots again. Formula-switch and file-load
     *   paths force a reboot only when this latch is set
     *   (see handleSelectFormula / handleFile).
     */
    const triggerBoot = () => {
        if (!hasBootedRef.current) {
            hasBootedRef.current = true;
            if (bootEngineRef.current) bootEngineRef.current();
        }
    };

    const handleSelectFormula = (formulaId: string) => {
        const def = registry.get(formulaId as any);
        if (def && def.defaultPreset) {
            loadScene({ preset: def.defaultPreset as Preset });
        }
        setIsMenuOpen(false);
        setProgress(0);
        progressRef.current = 0;
        if (hasBootedRef.current && bootEngineRef.current) bootEngineRef.current(true);
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            // Routes through the SceneIO-registered parser — for GMT
            // that's the GMF-aware parser that extracts and registers
            // embedded formula defs.
            const preset = await loadSceneFile(file);
            if (!preset) throw new Error('Could not parse scene file.');
            loadScene({ preset });
            setIsMenuOpen(false);
            setProgress(0);
            progressRef.current = 0;
            if (hasBootedRef.current && bootEngineRef.current) bootEngineRef.current(true);
        } catch (err) {
            alert('Load failed: ' + (err instanceof Error ? err.message : String(err)));
        }
    };

    const handleLiteToggle = () => {
        const s = useEngineStore.getState() as any;
        // 'lite' preset was removed (ADR-0079 follow-up); 'fastest' is now the
        // lightest non-preview preset.
        s.applyScalabilityPreset?.(isLiteRender ? 'balanced' : 'fastest');
    };

    const formulas = useMemo(() => registry.getAll(), [isMenuOpen]);

    useEffect(() => {
        if (!fgCanvasRef.current) return;
        rendererRef.current = new LoadingRendererCPU(fgCanvasRef.current);

        // rAF loop is purely a view — drives the bar from
        // CompileProgressStore and the CPU Julia spinner from elapsed
        // time. Boot is triggered separately by the `[isStartupReady]`
        // effect. Fade-out gates on `isReady && phase === 'done'`.
        let frameId = 0;
        const loop = (time: number) => {
            const menuOpen = isMenuOpenRef.current;
            const cp = useCompileProgress.getState();
            const p = selectProgress(cp, performance.now());

            if (Math.floor(p) > Math.floor(progressRef.current) ||
                (cp.phase === 'done' && progressRef.current < 100)) {
                progressRef.current = p;
                setProgress(p);
            }
            if (rendererRef.current) rendererRef.current.render(time, p / 100.0);

            // @invariant Fade when the engine is READY (`isReady` = worker
            // booted + compiled + dispatching frames). Normally we also wait for
            // `cp.phase === 'done'` so a fast compile animates the bar to 100%
            // instead of snapping from 73% → gone. But that 'done' signal can
            // fail to fire (idle no-op / a re-opened compile cycle), which used
            // to trap a fully-rendering app behind the splash forever (mobile).
            // So once ready, a grace window ALSO releases the fade — isReady is
            // the real signal; the bar is cosmetic.
            // bootError holds the splash open on a failure panel — never fade.
            const readyGraceElapsed = readyAtRef.current !== null
                && (performance.now() - readyAtRef.current) > LOADING_FADE_GRACE_MS;
            if (isReadyRef.current && (cp.phase === 'done' || readyGraceElapsed) && !menuOpen && !bootErrorRef.current) {
                if (rendererRef.current) { rendererRef.current.dispose(); rendererRef.current = null; }
                setOpacity(0);
                setTimeout(() => { setIsVisible(false); onFinished(); }, 800);
            } else {
                frameId = requestAnimationFrame(loop);
            }
        };
        frameId = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(frameId);
            if (rendererRef.current) { rendererRef.current.dispose(); rendererRef.current = null; }
        };
    }, []);

    useEffect(() => { if (isStartupReady) triggerBoot(); }, [isStartupReady]);

    if (!isVisible) return null;

    if (bootError) {
        return (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black" style={{ opacity }}>
                <div className="text-center mb-8 relative animate-fade-in-up z-10">
                    <GmtWordmark accent="#f87171" className="h-16 w-auto mx-auto block drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] mb-2" />
                    <div className="text-xs text-red-400/80 font-mono uppercase tracking-[0.4em]">Engine failed to start</div>
                </div>

                <div className="relative z-10 w-[500px] max-w-[90vw] bg-gray-900/80 border border-red-500/40 rounded-xl p-5 shadow-[0_0_50px_rgba(239,68,68,0.15)] backdrop-blur-sm">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-red-400/80 mb-2">Reason</div>
                    <div className="font-mono text-xs text-gray-200 whitespace-pre-wrap break-words max-h-[140px] overflow-auto">
                        {bootError}
                    </div>

                    <details className="mt-4">
                        <summary className="text-[10px] font-bold uppercase tracking-widest text-gray-500 cursor-pointer hover:text-gray-300 select-none">
                            Technical details
                        </summary>
                        <div className="mt-2 font-mono text-[10px] leading-relaxed text-gray-400 whitespace-pre-wrap break-words max-h-[180px] overflow-auto bg-black/40 rounded p-2 border border-white/5">
                            {diagnostics || 'Collecting…'}
                        </div>
                    </details>
                </div>

                <div className="mt-6 flex gap-2 z-20">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 text-xs font-bold rounded border border-cyan-500/40 bg-cyan-900/30 text-cyan-200 hover:bg-cyan-800/40 hover:text-white transition-colors"
                    >
                        Reload
                    </button>
                    <button
                        onClick={sendReport}
                        disabled={reportState === 'sending' || reportState === 'sent'}
                        className="px-4 py-2 text-xs font-bold rounded border border-white/15 bg-white/5 text-gray-200 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-default"
                    >
                        {reportState === 'idle' && 'Send report'}
                        {reportState === 'sending' && 'Sending…'}
                        {reportState === 'sent' && 'Report sent ✓'}
                        {reportState === 'error' && 'Failed — retry'}
                    </button>
                </div>

                <div className="mt-4 max-w-[500px] text-center text-[10px] font-mono text-gray-500 px-4">
                    Sending the report shares the technical details above (no scene data) so we can fix it.
                    Common causes: WebGL2 / OffscreenCanvas disabled, a lost GPU context, or a shader-compile failure on this device.
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-1000" style={{ opacity }}>
            <div className="text-center mb-10 relative animate-fade-in-up z-10">
                <div className="relative inline-block mb-2">
                    <GmtWordmark className="h-16 w-auto block drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                    {/* Version badge: left edge anchored to the logo's top-right corner. */}
                    <span className="absolute top-0 left-full font-mono text-[10px] font-bold leading-none text-white select-none">
                        {__APP_VERSION__}
                    </span>
                </div>
                <div className="text-xs text-gray-400 font-mono uppercase tracking-[0.4em]">{subtitle}</div>
            </div>

            <div className="relative z-10 w-[500px] h-16 bg-gray-900/80 rounded-full border border-gray-700/50 overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.1)] backdrop-blur-sm">
                {/* clip-path masks the canvas reveal — canvas paints once at
                    full width and the clip animates on the compositor thread,
                    so the bar keeps moving even when the worker's synchronous
                    WebGL compile starves main-thread paint on Firefox. */}
                <div
                    className="absolute top-0 left-0 w-[500px] h-full transition-[clip-path] duration-75 ease-linear"
                    style={{
                        clipPath: `inset(0 ${(1 - Math.max(0, Math.min(1, progress / 100))) * 100}% 0 0)`,
                        willChange: 'clip-path',
                    }}
                >
                    <canvas ref={fgCanvasRef} className="absolute top-0 left-0 w-[500px] h-16" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            </div>

            <div className="mt-6 font-mono text-sm text-cyan-500/80 z-20 flex flex-col items-center h-10">
                {startupMode === 'url' ? (
                    <span className="animate-pulse">LOADING SHARED SCENE... {Math.floor(progress)}%</span>
                ) : (
                    <div className="relative flex flex-col items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-cyan-600/80">LOADING</span>
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                title="Click to explore other fractals or load a file"
                                className="flex items-center gap-1 text-cyan-400 hover:text-white transition-colors border-b border-dashed border-cyan-500/30 hover:border-cyan-400 pb-0.5 outline-none"
                            >
                                <span className="font-bold">[{activeFormula}]</span>
                                <span className={`text-[10px] transform transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}><ChevronDown /></span>
                            </button>
                            <span className="text-cyan-600/80">{Math.floor(progress)}%</span>
                        </div>

                        <button
                            onClick={handleLiteToggle}
                            className={`mt-4 px-3 py-1.5 text-[9px] font-bold rounded border transition-all ${
                                isLiteRender
                                    ? 'bg-orange-900/40 text-orange-200 border-orange-500/40 hover:bg-orange-800/50'
                                    : 'bg-white/5 text-gray-500 border-white/5 hover:text-white hover:border-white/20'
                            }`}
                        >
                            {isLiteRender ? 'Lite Render Active' : 'Enable Lite Render'}
                        </button>

                        {isMenuOpen && (
                            <div className="absolute bottom-full mb-4 w-[340px] bg-black/95 border border-white/20 rounded-xl shadow-[0_10px_60px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-fade-in text-xs z-[110]"
                                onMouseLeave={() => setHoveredId(null)}>
                                {hoveredId && hoveredId !== 'Modular' && (
                                    <div className="absolute left-[350px] bottom-0 w-[256px] h-[256px] bg-black border border-cyan-500/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,1)] overflow-hidden animate-fade-in pointer-events-none">
                                        <img src={getThumbPath(hoveredId)} className="w-full h-full object-cover" alt="Preview"
                                            onError={e => { e.currentTarget.style.display = 'none'; }} />
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,4px_100%] pointer-events-none" />
                                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/60 text-cyan-300 font-bold text-[9px] border-t border-white/5">
                                            {registry.get(hoveredId as any)?.name}
                                        </div>
                                    </div>
                                )}
                                <div className="p-1 max-h-[400px] overflow-y-auto custom-scroll">
                                    <button onClick={() => fileInputRef.current?.click()}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:bg-white/10 hover:text-white rounded transition-colors mb-1 border-b border-white/10">
                                        <UploadIcon /> <span className="font-bold text-[10px]">Load From File...</span>
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept=".gmf,.json,.png" onChange={handleFile} />

                                    <div className="px-3 py-1.5 text-[9px] font-bold text-gray-500 bg-white/5 mb-1">Select Engine</div>
                                    {formulas.map(f => (
                                        <button key={f.id} onClick={() => handleSelectFormula(f.id)} onMouseEnter={() => setHoveredId(f.id)}
                                            className={`w-full text-left px-3 py-2.5 transition-all flex gap-3 border-b border-white/5 last:border-b-0 ${f.id === activeFormula ? 'bg-cyan-900/30' : 'hover:bg-white/5'}`}>
                                            <div className="w-16 h-10 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative">
                                                {f.id !== 'Modular' ? (
                                                    <img src={getThumbPath(f.id)} alt={f.name} className="w-full h-full object-cover"
                                                        onError={e => {
                                                            e.currentTarget.style.display = 'none';
                                                            const sib = e.currentTarget.nextElementSibling as HTMLElement | null;
                                                            if (sib) sib.style.display = 'flex';
                                                        }} />
                                                ) : null}
                                                <div className={`w-full h-full items-center justify-center text-gray-700 bg-gray-900 ${f.id !== 'Modular' ? 'hidden' : 'flex'}`}>
                                                    {f.id === 'Modular' ? <NetworkIcon /> : <CubeIcon />}
                                                </div>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-[11px] font-bold tracking-tight mb-0.5 ${f.id === activeFormula ? 'text-cyan-400' : 'text-gray-200'}`}>{f.name}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
