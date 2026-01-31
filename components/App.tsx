
import React, { useState, useRef, useMemo } from 'react';
import Controls from './components/Controls';
import TopBar from './components/TopBar';
import Timeline from './components/Timeline'; 
import MobileControls from './components/MobileControls';
import { LoadingScreen } from './components/LoadingScreen';
import { useFractalStore } from './store/fractalStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ViewportArea } from './components/ViewportArea';
import { useGlobalContextMenu } from './hooks/useGlobalContextMenu';
import GlobalContextMenu from './components/GlobalContextMenu';
import HelpBrowser from './components/HelpBrowser';
import { PopupSliderSystem } from './components/PopupSliderSystem';
import { SmartphoneRotateIcon, TimelineOpenIcon, AlertIcon, CheckIcon } from './components/Icons';
import { EngineBridge } from './components/EngineBridge';
import { useAppStartup } from './hooks/useAppStartup';
import { useMobileLayout } from './hooks/useMobileLayout';
import { QualityState } from './features/quality';
import { FractalEvents } from './engine/FractalEvents';

const App: React.FC = () => {
  const state = useFractalStore();
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [isLoadingVisible, setIsLoadingVisible] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false); 
  
  const mainWrapperRef = useRef<HTMLDivElement>(null);
  
  // Refs for HUD elements (stable between renders)
  const containerRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);

  // Memoize the refs object to ensure referential stability for downstream dependency arrays
  const hudRefs = useMemo(() => ({
      container: containerRef,
      speed: speedRef,
      dist: distRef,
      reset: resetRef,
      reticle: reticleRef
  }), []);

  // --- Logic Hooks ---
  const { startupMode, queuePresetLoad, bootEngine } = useAppStartup(isSceneReady);
  const { isMobile, isPortrait } = useMobileLayout();
  useKeyboardShortcuts(showTimeline, setShowTimeline);
  useGlobalContextMenu();

  // --- Computed UI State ---
  // "isCurrentlyMobile" affects UI Layout (Controls vs MobileControls)
  // Strictly tied to device capabilities OR forced mobile layout (via Debug switch)
  const isCurrentlyMobile = isMobile || state.debugMobileLayout;
  
  // "Lite Render" is now a check on the Quality Feature State
  const quality = (state as any).quality as QualityState;
  const isLiteRender = quality?.precisionMode === 1; // 1 = Standard/Mobile
  
  const isFlyMobile = isCurrentlyMobile && state.cameraMode === 'Fly';
  const isBroadcast = state.isBroadcastMode;

  // Determine cursor based on interaction mode
  const showCrosshair = state.interactionMode !== 'none';

  const handleTimelineContextMenu = (e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      state.openContextMenu(e.clientX, e.clientY, [], ['ui.timeline']);
  };

  const handleLiteToggle = () => {
      // Use the DDFS Meta-Action for applying engine profiles
      const mode = isLiteRender ? 'balanced' : 'lite';
      
      // Provide immediate feedback to user
      FractalEvents.emit('is_compiling', `Switching to ${mode} mode...`);

      // @ts-ignore
      const applyPreset = state.applyPreset;
      if (applyPreset) {
          applyPreset({ mode, actions: state });
      }
  };
  
  const handleLoadingFinished = () => {
      setIsLoadingVisible(false);
      
      // Fix for stale camera state on first load:
      // Re-broadcast the camera state to ensure Navigation/OrbitControls are synced
      // with the Engine's VirtualSpace after the heavy compilation/boot process.
      // We use the current store state which was set by useAppStartup -> loadPreset
      FractalEvents.emit('camera_teleport', {
          position: state.cameraPos,
          rotation: state.cameraRot,
          sceneOffset: state.sceneOffset,
          targetDistance: state.targetDistance
      });
  };

  const rootClass = isCurrentlyMobile && !isBroadcast
      ? "min-h-[120vh] bg-black" 
      : "fixed inset-0 w-full h-full bg-black select-none overflow-hidden flex flex-col";

  return (
    <div className={rootClass}>
      <EngineBridge />
      
      {/* Banner: Only show on Mobile Layout (for scrolling to fullscreen) */}
      {isCurrentlyMobile && !isBroadcast && (
          <div className="w-full bg-[#080808] border-b border-white/10 p-8 pb-12 flex flex-col items-center text-center gap-3">
             <div className="w-12 h-1 bg-gray-800 rounded-full mb-2" />
             
             {isLiteRender ? (
                <>
                    <div className="flex items-center gap-2 text-amber-500 mb-1">
                        <AlertIcon />
                        <span className="text-xs font-black uppercase tracking-widest">Lite Render Mode</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed max-w-[320px]">
                        Running lightweight engine for high performance.<br/>
                        <span className="text-gray-500 block mt-2 font-mono text-[9px] border-t border-white/5 pt-2 space-y-0.5">
                            <span className="text-green-500/80 block">✓ Fast Glow (Accumulation Only)</span>
                            <span className="text-green-500/80 block">✓ EnvMap Reflections (No Marching)</span>
                            <span className="text-green-500/80 block">✓ Low-Step AO (2) & Shadows (16)</span>
                            <span className="text-green-500/80 block">✓ Reduced Precision (1e-5) & Lights (3)</span>
                            <span className="text-red-500/60 block mt-1.5 pt-1 border-t border-white/5">✕ Hybrid Cage & Path Tracer Disabled</span>
                        </span>
                    </p>
                </>
             ) : (
                <>
                    <div className="flex items-center gap-2 text-cyan-500 mb-1">
                        <span className="text-xs font-black uppercase tracking-widest">High Quality Mode</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed max-w-[320px]">
                        Full desktop-class rendering enabled.<br/>
                        <span className="text-gray-600 block mt-1 text-[9px]">Battery usage may increase significantly.</span>
                    </p>
                </>
             )}
             
             {/* Toggle Button for Mobile Banner */}
             <button 
                onClick={handleLiteToggle}
                className="mt-2 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
             >
                 {isLiteRender ? "Switch to High Quality" : "Switch to Lite Mode"}
             </button>

             <div className="text-[9px] text-gray-600 font-mono mt-6 flex flex-col items-center animate-pulse">
                <span className="tracking-[0.2em] uppercase font-bold">Scroll to Enter</span>
                <svg width="12" height="12" viewBox='0 0 24 24' fill="none" stroke="currentColor" strokeWidth="2" className="mt-1 opacity-50"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
             </div>
          </div>
      )}

      <div 
          ref={mainWrapperRef}
          className={`relative bg-black select-none ${showCrosshair ? 'cursor-crosshair' : ''} flex flex-col ${isCurrentlyMobile && !isBroadcast ? 'h-[100vh] sticky top-0 overflow-hidden shadow-2xl' : 'w-full h-full'}`} 
          onContextMenu={(e) => e.preventDefault()}
      >
        <LoadingScreen 
            isReady={isSceneReady} 
            onFinished={handleLoadingFinished} 
            startupMode={startupMode} 
            onPresetLoaded={queuePresetLoad}
            bootEngine={bootEngine}
        />
        
        {isCurrentlyMobile && isPortrait && !isLoadingVisible && !isBroadcast && (
            <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-10 text-center text-white">
                <div className="text-cyan-400 mb-6 animate-bounce"><SmartphoneRotateIcon /></div>
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Landscape Recommended</h2>
                <p className="text-gray-500 text-sm font-mono tracking-widest">Rotate device to access controls.</p>
            </div>
        )}
        {!isLoadingVisible && (
          <>
            {!isBroadcast && <TopBar />}
            <div className="flex-1 flex overflow-hidden relative">
                <ViewportArea hudRefs={hudRefs} onSceneReady={() => setIsSceneReady(true)} />
                {!isBroadcast && <Controls state={state} actions={state} presets={[]} onExport={()=>{}} onImport={()=>{}} />}
            </div>
            {!isBroadcast && <MobileControls />}
            {/* Debuggers are now rendered via DynamicDomOverlays inside ViewportArea */}
            {!isBroadcast && <PopupSliderSystem />}
            {state.contextMenu.visible && !isBroadcast && (
                <GlobalContextMenu x={state.contextMenu.x} y={state.contextMenu.y} items={state.contextMenu.items} targetHelpIds={state.contextMenu.targetHelpIds} onClose={state.closeContextMenu} onOpenHelp={state.openHelp} />
            )}
            {state.helpWindow.visible && <HelpBrowser activeTopicId={state.helpWindow.activeTopicId} onClose={state.closeHelp} onNavigate={state.openHelp} />}
            {!showTimeline && !isFlyMobile && !isBroadcast && (
                <div className={`fixed bottom-4 left-4 z-50 flex gap-2 transition-all duration-500`}>
                    <button onClick={() => setShowTimeline(true)} onContextMenu={handleTimelineContextMenu} className={`p-2 rounded-full border shadow-lg transition-all bg-gray-800 border-gray-600 text-gray-400 hover:text-white`} title="Open Timeline (T)"><TimelineOpenIcon /></button>
                </div>
            )}
            {showTimeline && !isBroadcast && <Timeline onClose={() => setShowTimeline(false)} />}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
