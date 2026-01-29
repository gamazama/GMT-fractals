
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LoadingRenderer } from '../engine/LoadingRenderer';
import { useFractalStore } from '../store/fractalStore';
import { registry } from '../engine/FractalRegistry';
import { ChevronDown, UploadIcon, CubeIcon, NetworkIcon } from './Icons';
import { extractMetadata } from '../utils/pngMetadata';
import { Preset } from '../types';
import { QualityState } from '../features/quality';
import { FractalEvents } from '../engine/FractalEvents';
import { engine } from '../engine/FractalEngine';

const getThumbPath = (id: string) => `/thumbnails/fractal_${id}.jpg`;

interface LoadingScreenProps {
  isReady: boolean;
  onFinished: () => void;
  startupMode: 'default' | 'url';
  onPresetLoaded?: (p: Preset) => void;
  bootEngine: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isReady, onFinished, startupMode, onPresetLoaded, bootEngine }) => {
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<LoadingRenderer | null>(null);
  
  // Refs for loop state
  const isReadyRef = useRef(isReady);
  const isMenuOpenRef = useRef(false);
  const bootEngineRef = useRef(bootEngine);

  // Sync refs
  useEffect(() => { isReadyRef.current = isReady; }, [isReady]);
  useEffect(() => { bootEngineRef.current = bootEngine; }, [bootEngine]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const activeFormula = useFractalStore(s => s.formula);
  const setFormula = useFractalStore(s => s.setFormula);
  const loadPreset = useFractalStore(s => s.loadPreset);
  
  const state = useFractalStore();
  const quality = (state as any).quality as QualityState;
  const isLiteRender = quality?.precisionMode === 1;

  const [progress, setProgress] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [isVisible, setIsVisible] = useState(true);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Sync menu state to ref
  useEffect(() => { isMenuOpenRef.current = isMenuOpen; }, [isMenuOpen]);
  
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Auto-boot if URL mode
  useEffect(() => {
      if (startupMode === 'url' && bootEngine) {
          // Force boot immediately for shared links
          bootEngine();
      }
  }, [startupMode, bootEngine]);

  const handleSelectFormula = (formulaId: string) => {
      setFormula(formulaId as any);
      setIsMenuOpen(false);
      setProgress(0);
      
      if (onPresetLoaded) {
          const def = registry.get(formulaId as any);
          if (def && def.defaultPreset) {
              onPresetLoaded(def.defaultPreset as Preset);
          }
      }
      
      if (bootEngineRef.current) bootEngineRef.current();
  };
  
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
          let jsonString = "";
          if (file.type === "image/png") {
              const meta = await extractMetadata(file, "FractalData");
              if (meta) jsonString = meta;
              else throw new Error("No Fractal Data found in PNG.");
          } else {
              jsonString = await file.text();
          }
          const preset = JSON.parse(jsonString);
          loadPreset(preset);
          
          if (onPresetLoaded) {
              onPresetLoaded(preset);
          }

          setIsMenuOpen(false);
          setProgress(0);
          
          if (bootEngineRef.current) bootEngineRef.current();
      } catch (err: any) {
          alert("Load failed: " + err.message);
      }
  };
  
  const handleLiteToggle = () => {
      const mode = isLiteRender ? 'balanced' : 'lite';
      FractalEvents.emit('is_compiling', `Switching to ${mode} mode...`);
      // @ts-ignore
      if (state.applyPreset) {
          // @ts-ignore
          state.applyPreset({ mode, actions: state });
      }
  };
  
  const formulas = useMemo(() => registry.getAll(), []);

  useEffect(() => {
    if (!fgCanvasRef.current) return;
    
    // Safely attempt to create the loading renderer. 
    // If it fails (e.g. context limit), we just proceed without visual flair.
    try {
        rendererRef.current = new LoadingRenderer(fgCanvasRef.current);
    } catch(e) {
        console.warn("LoadingScreen: WebGL context creation failed for spinner.", e);
    }
    
    let frameId = 0;
    let currentProgress = 0;
    let lastFrameTime = performance.now();
    const TARGET_DURATION = 2500; 

    const loop = (time: number) => {
      const now = performance.now();
      const dt = Math.min(now - lastFrameTime, 60);
      lastFrameTime = now;
      
      const ready = isReadyRef.current;
      const menuOpen = isMenuOpenRef.current;

      // Logic: If not waiting for menu, progress automatically.
      // If we hit 60%, trigger boot.
      
      const shouldBoot = currentProgress > 60 && !engine.isBooted && !menuOpen && startupMode !== 'url';
      if (shouldBoot && bootEngineRef.current) {
          bootEngineRef.current();
      }

      if (currentProgress < 100) {
          if (currentProgress > 95 && !ready) {
              // Stall at 95% if engine isn't ready
              currentProgress += dt * (1 / 1000); 
          } else if (ready && currentProgress > 95) {
              // Accelerate to finish if ready
              currentProgress += dt * (100 / 300);
          } else {
              // Normal loading speed
              currentProgress += dt * (100 / TARGET_DURATION);
          }
      }
      
      if (currentProgress > 100) currentProgress = 100;

      // Only update React state if integer value changes to reduce renders
      if (Math.floor(currentProgress) > Math.floor(progress)) {
         setProgress(currentProgress);
      }

      // Render spinner
      if (rendererRef.current) {
          rendererRef.current.render(time, currentProgress / 100.0);
      }

      if (currentProgress >= 100 && !menuOpen) {
        // Double check boot
        if (!engine.isBooted && bootEngineRef.current) {
             bootEngineRef.current();
        }

        // Fade out
        setTimeout(() => {
            setOpacity(0);
            setTimeout(() => {
                setIsVisible(false);
                if (rendererRef.current) rendererRef.current.dispose();
                onFinished();
            }, 800); 
        }, 200);
      } else {
        frameId = requestAnimationFrame(loop);
      }
    };
    
    frameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frameId);
  }, []); 

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
             GPU Mandelbulb Tracer
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
             <span className="animate-pulse tracking-wide">LOADING SHARED SCENE... {Math.floor(progress)}%</span>
        ) : (
            <div className="relative flex flex-col items-center">
                 <div className="flex items-center gap-2">
                     <span className="text-cyan-600/80">LOADING</span>
                     <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center gap-1 text-cyan-400 hover:text-white transition-colors border-b border-dashed border-cyan-500/30 hover:border-cyan-400 pb-0.5 outline-none"
                     >
                         <span className="font-bold tracking-wide uppercase">[{activeFormula}]</span>
                         <span className={`text-[10px] transform transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}><ChevronDown /></span>
                     </button>
                     <span className="text-cyan-600/80">{Math.floor(progress)}%</span>
                 </div>
                 
                 <button 
                    onClick={handleLiteToggle}
                    className={`mt-4 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded border transition-all ${
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
                                 <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/60 text-cyan-300 font-bold uppercase text-[9px] tracking-widest border-t border-white/5">
                                     {registry.get(hoveredId as any)?.name}
                                 </div>
                             </div>
                         )}

                         <div className="p-1 max-h-[400px] overflow-y-auto custom-scroll">
                             <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-300 hover:bg-white/10 hover:text-white rounded transition-colors mb-1 border-b border-white/10"
                             >
                                <UploadIcon /> <span className="font-bold uppercase tracking-wider text-[10px]">Load From File...</span>
                             </button>
                             <input type="file" ref={fileInputRef} className="hidden" accept=".json,.png" onChange={handleFile} />
                             
                             <div className="px-3 py-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest bg-white/5 mb-1">Select Engine</div>
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
