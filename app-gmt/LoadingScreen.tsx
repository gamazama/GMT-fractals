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
import { LoadingRendererCPU } from '../engine-gmt/engine/LoadingRendererCPU';
import { useEngineStore } from '../store/engineStore';
import { registry } from '../engine-gmt/engine/FractalRegistry';
import { ChevronDown, UploadIcon, CubeIcon, NetworkIcon } from '../components/Icons';
import { loadSceneFile } from '../engine/plugins/SceneIO';
import type { Preset } from '../types';
import { useCompileProgress, selectProgress } from '../store/CompileProgressStore';

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
    isHydrated: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isReady, onFinished, startupMode, bootEngine, isHydrated }) => {
    const fgCanvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<LoadingRendererCPU | null>(null);

    const isMenuOpenRef = useRef(false);
    const isReadyRef = useRef(isReady);
    const bootEngineRef = useRef(bootEngine);
    const hasBootedRef = useRef(false);

    useEffect(() => { isReadyRef.current = isReady; }, [isReady]);
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
    useEffect(() => { isMenuOpenRef.current = isMenuOpen; }, [isMenuOpen]);

    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [subtitle] = useState(pickRandomName);

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
        s.applyScalabilityPreset?.(isLiteRender ? 'balanced' : 'lite');
    };

    const formulas = useMemo(() => registry.getAll(), [isMenuOpen]);

    useEffect(() => {
        if (!fgCanvasRef.current) return;
        rendererRef.current = new LoadingRendererCPU(fgCanvasRef.current);

        // rAF loop is purely a view — drives the bar from
        // CompileProgressStore and the CPU Julia spinner from elapsed
        // time. Boot is triggered separately by the `[isHydrated]`
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

            if (isReadyRef.current && cp.phase === 'done' && !menuOpen) {
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

    useEffect(() => { if (isHydrated) triggerBoot(); }, [isHydrated]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-1000" style={{ opacity }}>
            <div className="text-center mb-10 relative animate-fade-in-up z-10">
                <h1 className="text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] mb-2">
                    G<span className="text-cyan-400">M</span>T
                </h1>
                <div className="text-xs text-gray-400 font-mono uppercase tracking-[0.4em]">{subtitle}</div>
            </div>

            <div className="relative z-10 w-[500px] h-16 bg-gray-900/80 rounded-full border border-gray-700/50 overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.1)] backdrop-blur-sm">
                {/* Inner clip uses transform: scaleX so the fill animates on
                    the compositor thread — keeps moving even when the worker's
                    synchronous WebGL compile starves main-thread paint on
                    Firefox. The Julia canvas inside is rendered at full width
                    and revealed by the clip. */}
                <div
                    className="absolute top-0 left-0 w-[500px] h-full origin-left overflow-hidden transition-transform duration-75 ease-linear"
                    style={{ transform: `scaleX(${Math.max(0, Math.min(1, progress / 100))})`, willChange: 'transform' }}
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
