
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LoadingRendererCPU } from '../engine/LoadingRendererCPU';
import { useFractalStore } from '../store/fractalStore';
import { registry } from '../engine/FractalRegistry';
import { ChevronDown, UploadIcon, CubeIcon, NetworkIcon } from './Icons';
import { extractMetadata } from '../utils/pngMetadata';
import { loadGMFScene } from '../utils/FormulaFormat';
import { Preset } from '../types';
import { QualityState } from '../features/quality';
import { FractalEvents } from '../engine/FractalEvents';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();

const GMT_NAMES = [
  // Serious / poetic
  'Generative Math Tracer',
  'GPU Manifold Tracer',
  'GPU Mandelorus Tracer',
  'Geometric Morphology Toolkit',
  'GLSL Marching Toolkit',
  'Generative Morphology Theater',
  'Grand Mathematical Topography',
  'Geometric Manifold Traversal',
  'Gradient Mapped Topology',
  'Generalized Mesh Tracer',
  'Gravitational Manifold Theory',
  // Evocative / artistic
  'Glass Mountain Telescope',
  'Ghost Manifold Terminal',
  'Garden of Mathematical Terrain',
  'Glimpse Machine Terminal',
  'Grey Matter Telescope',
  'Grotesque Math Theater',
  'Geometry Mutation Terminal',
  'Grand Mythos Terminal',
  'Glowing Mathematical Topologies',
  // Playful / fun
  'Guy Makes Things',
  "Guy's Math Toy",
  'Gnarly Math Thing',
  'Generally Mesmerizing Thingamajig',
  'Give Me Tentacles',
  'Gloriously Melted Teapots',
  'Gaze-into Mathematical Twilight',
  'Greenwich Mean Time',
  'Geometrically Mangled Tesseracts',
  'Gratuitous Mandelbulb Torture',
  'Got More Tentacles',
  'Groovy Morphing Thingamabob',
];

const pickRandomName = () => GMT_NAMES[Math.floor(Math.random() * GMT_NAMES.length)];

const getThumbPath = (id: string) => `thumbnails/fractal_${id}.jpg`;


interface LoadingScreenProps {
  isReady: boolean;
  onFinished: () => void;
  startupMode: 'default' | 'url';
  bootEngine: (force?: boolean) => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isReady, onFinished, startupMode, bootEngine }) => {
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<LoadingRendererCPU | null>(null);

  // Refs for loop state
  const isMenuOpenRef = useRef(false);
  const isReadyRef = useRef(isReady);
  const bootEngineRef = useRef(bootEngine);
  const hasBootedRef = useRef(false);

  // Sync refs
  useEffect(() => { isReadyRef.current = isReady; }, [isReady]);
  useEffect(() => { bootEngineRef.current = bootEngine; }, [bootEngine]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFormula = useFractalStore(s => s.formula);
  const loadScene = useFractalStore(s => s.loadScene);
  const applyPreset = useFractalStore(s => (s as any).applyPreset);

  const quality = useFractalStore(s => (s as any).quality) as QualityState;
  const isLiteRender = quality?.precisionMode === 1;

  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const [opacity, setOpacity] = useState(1);
  const [isVisible, setIsVisible] = useState(true);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Sync menu state to ref
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

      // If boot already happened (Chrome, or Firefox after bar completed),
      // force restart to pick up the new formula. If boot hasn't happened yet
      // (Firefox, bar still running), just let the store update — the deferred
      // boot will pick up the new config when it fires.
      if (hasBootedRef.current && bootEngineRef.current) {
          bootEngineRef.current(true);
      }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
          let content = "";
          if (file.type === "image/png") {
              const meta = await extractMetadata(file, "FractalData");
              if (meta) content = meta;
              else throw new Error("No Fractal Data found in PNG.");
          } else {
              content = await file.text();
          }

          // Detect GMF vs legacy JSON format
          const { def, preset } = loadGMFScene(content);

          // loadScene handles: formula registration (main + worker),
          // store hydration, full config flush, and offset sync.
          loadScene({ def: def || undefined, preset });

          setIsMenuOpen(false);
          setProgress(0);
          progressRef.current = 0;

          if (hasBootedRef.current && bootEngineRef.current) bootEngineRef.current(true);
      } catch (err) {
          alert("Load failed: " + (err instanceof Error ? err.message : String(err)));
      }
  };

  const handleLiteToggle = () => {
      const mode = isLiteRender ? 'balanced' : 'lite';
      FractalEvents.emit('is_compiling', `Switching to ${mode} mode...`);
      if (applyPreset) {
          const actions = useFractalStore.getState();
          applyPreset({ mode, actions });
      }
  };

  const formulas = useMemo(() => registry.getAll(), []);

  useEffect(() => {
    if (!fgCanvasRef.current) return;

    // CPU-based Julia set spinner — no GPU contention on any browser.
    rendererRef.current = new LoadingRendererCPU(fgCanvasRef.current);

    let frameId = 0;
    let currentProgress = 0;
    let lastFrameTime = performance.now();
    const TARGET_DURATION = 2500;

    const loop = (time: number) => {
      const now = performance.now();
      const dt = Math.min(now - lastFrameTime, 60);
      lastFrameTime = now;

      const menuOpen = isMenuOpenRef.current;

      // Linear progress over TARGET_DURATION — purely cosmetic
      if (currentProgress < 100) {
          currentProgress += dt * (100 / TARGET_DURATION);
      }
      if (currentProgress > 100) currentProgress = 100;

      // Only update React state if integer value changes to reduce renders
      if (Math.floor(currentProgress) > Math.floor(progressRef.current)) {
         progressRef.current = currentProgress;
         setProgress(currentProgress);
      }

      if (rendererRef.current) {
          rendererRef.current.render(time, currentProgress / 100.0);
      }

      if (currentProgress >= 100 && !menuOpen) {
        triggerBoot();

        if (isReadyRef.current) {
            if (rendererRef.current) {
                rendererRef.current.dispose();
                rendererRef.current = null;
            }
            setOpacity(0);
            setTimeout(() => {
                setIsVisible(false);
                onFinished();
            }, 800);
        } else {
            frameId = requestAnimationFrame(loop);
        }
      } else {
        frameId = requestAnimationFrame(loop);
      }
    };

    frameId = requestAnimationFrame(loop);

    return () => {
        cancelAnimationFrame(frameId);
        if (rendererRef.current) {
            rendererRef.current.dispose();
            rendererRef.current = null;
        }
    };
  }, []);

  // Boot immediately — CPU spinner has no GPU contention.
  useEffect(() => { triggerBoot(); }, []);

  if (!isVisible) return null;

  return (
    <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-1000"
        style={{ opacity: opacity }}
    >
      <div className="text-center mb-10 relative animate-fade-in-up z-10">
         <h1 className="text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] mb-2">
            G<span className="text-cyan-400">M</span>T
         </h1>
         <div className="text-xs text-gray-400 font-mono uppercase tracking-[0.4em]">
             {subtitle}
         </div>
      </div>

      <div className="relative z-10 w-[500px] h-16 bg-gray-900/80 rounded-full border border-gray-700/50 overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.1)] backdrop-blur-sm">
        <div
            className="absolute top-0 left-0 h-full overflow-hidden will-change-[width] transition-[width] duration-75 ease-linear"
            style={{ width: `${progress}%` }}
        >
            <canvas
                ref={fgCanvasRef}
                className="absolute top-0 left-0 w-[500px] h-16"
            />
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
                    {isLiteRender ? "Lite Render Active" : "Enable Lite Render"}
                 </button>

                 {isMenuOpen && (
                     <div
                        className="absolute bottom-full mb-4 w-[340px] bg-black/95 border border-white/20 rounded-xl shadow-[0_10px_60px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-fade-in text-xs z-[110]"
                        onMouseLeave={() => setHoveredId(null)}
                     >
                         {hoveredId && hoveredId !== 'Modular' && (
                             <div className="absolute left-[350px] bottom-0 w-[256px] h-[256px] bg-black border border-cyan-500/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,1)] overflow-hidden animate-fade-in pointer-events-none">
                                 <img
                                    src={getThumbPath(hoveredId)}
                                    className="w-full h-full object-cover"
                                    alt="Preview"
                                    onError={e => {
                                        e.currentTarget.style.display='none';
                                    }}
                                 />
                                 <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,4px_100%] pointer-events-none" />
                                 <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/60 text-cyan-300 font-bold text-[9px] border-t border-white/5">
                                     {registry.get(hoveredId as any)?.name}
                                 </div>
                             </div>
                         )}

                         <div className="p-1 max-h-[400px] overflow-y-auto custom-scroll">
                             <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:bg-white/10 hover:text-white rounded transition-colors mb-1 border-b border-white/10"
                             >
                                <UploadIcon /> <span className="font-bold text-[10px]">Load From File...</span>
                             </button>
                             <input type="file" ref={fileInputRef} className="hidden" accept=".gmf,.json,.png" onChange={handleFile} />

                             <div className="px-3 py-1.5 text-[9px] font-bold text-gray-500 bg-white/5 mb-1">Select Engine</div>
                             {formulas.map(f => (
                                 <button
                                    key={f.id}
                                    onClick={() => handleSelectFormula(f.id)}
                                    onMouseEnter={() => setHoveredId(f.id)}
                                    className={`w-full text-left px-3 py-2.5 transition-all flex gap-3 border-b border-white/5 last:border-b-0 ${
                                        f.id === activeFormula ? 'bg-cyan-900/30' : 'hover:bg-white/5'
                                    }`}
                                 >
                                     <div className="w-16 h-10 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative">
                                        {f.id !== 'Modular' ? (
                                            <img
                                                src={getThumbPath(f.id)}
                                                alt={f.name}
                                                className="w-full h-full object-cover"
                                                onError={e => {
                                                    e.currentTarget.style.display='none';
                                                    if (e.currentTarget.nextElementSibling) {
                                                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                                    }
                                                }}
                                            />
                                        ) : null}
                                        <div className={`w-full h-full items-center justify-center text-gray-700 bg-gray-900 ${f.id !== 'Modular' ? 'hidden' : 'flex'}`}>
                                            {f.id === 'Modular' ? <NetworkIcon /> : <CubeIcon />}
                                        </div>
                                     </div>
                                     <div className="flex flex-col min-w-0">
                                         <span className={`text-[11px] font-bold tracking-tight mb-0.5 ${f.id === activeFormula ? 'text-cyan-400' : 'text-gray-200'}`}>
                                            {f.name}
                                         </span>
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
