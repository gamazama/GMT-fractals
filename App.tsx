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
import { Dock } from './components/layout/Dock';
import { DropZones } from './components/layout/DropZones';
import DraggableWindow from './components/DraggableWindow';
import { PanelRouter } from './components/PanelRouter';
import { PanelId, PanelState } from './types';

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

  // Memoize the refs object
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
  const isCurrentlyMobile = isMobile || state.debugMobileLayout;
  const quality = (state as any).quality as QualityState;
  const isLiteRender = quality?.precisionMode === 1; 
  const isFlyMobile = isCurrentlyMobile && state.cameraMode === 'Fly';
  const isBroadcast = state.isBroadcastMode;
  const showCrosshair = state.interactionMode !== 'none';

  const handleTimelineContextMenu = (e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      state.openContextMenu(e.clientX, e.clientY, [], ['ui.timeline']);
  };

  const handleLiteToggle = () => {
      const mode = isLiteRender ? 'balanced' : 'lite';
      FractalEvents.emit('is_compiling', `Switching to ${mode} mode...`);
      // @ts-ignore
      const applyPreset = state.applyPreset;
      if (applyPreset) {
          applyPreset({ mode, actions: state });
      }
  };
  
  const handleLoadingFinished = () => {
      setIsLoadingVisible(false);
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

  // Filter floating panels
  const floatingPanels = (Object.values(state.panels) as PanelState[]).filter((p) => p.location === 'float' && p.isOpen);

  return (
    <div className={rootClass}>
      <EngineBridge />
      <DropZones />
      
      {/* Floating Windows Render Layer */}
      {floatingPanels.map(p => (
          <DraggableWindow key={p.id} id={p.id} title={p.id}>
              <PanelRouter activeTab={p.id as PanelId} state={state} actions={state} onSwitchTab={(t) => state.togglePanel(t, true)} />
          </DraggableWindow>
      ))}

      {/* Banner for Mobile */}
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
                        Running lightweight engine.<br/>
                    </p>
                </>
             ) : (
                <>
                    <div className="flex items-center gap-2 text-cyan-500 mb-1">
                        <span className="text-xs font-black uppercase tracking-widest">High Quality Mode</span>
                    </div>
                </>
             )}
             <button 
                onClick={handleLiteToggle}
                className="mt-2 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
             >
                 {isLiteRender ? "Switch to High Quality" : "Switch to Lite Mode"}
             </button>
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
            
            {/* MAIN CONTENT AREA: 3-COLUMN LAYOUT */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* LEFT DOCK */}
                {!isBroadcast && !isCurrentlyMobile && (
                    <Dock side="left" />
                )}

                {/* VIEWPORT (Flex-1 to take available space) */}
                <ViewportArea hudRefs={hudRefs} onSceneReady={() => setIsSceneReady(true)} />
                
                {/* RIGHT DOCK */}
                {!isBroadcast && (
                    <Dock side="right" />
                )}
            </div>
            
            {!isBroadcast && <MobileControls />}
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