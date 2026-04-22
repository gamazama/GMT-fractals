import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react';
import MobileControls from './components/MobileControls';
import { LoadingScreen } from './components/LoadingScreen';
import { useFractalStore } from './store/fractalStore';
import { ViewportArea } from './components/ViewportArea';
import { useGlobalContextMenu } from './hooks/useGlobalContextMenu';
import GlobalContextMenu from './components/GlobalContextMenu';
import { SmartphoneRotateIcon, TimelineOpenIcon } from './components/Icons';
import { EngineBridge } from './components/EngineBridge';
import { RenderLoopDriver } from './engine/plugins/RenderLoop';
import { useAppStartup } from './hooks/useAppStartup';
import { prefetchHelpTopics } from './data/help/registry';

// --- Code-split: loaded on demand ---
const Timeline = React.lazy(() => import('./components/Timeline'));
const HelpBrowser = React.lazy(() => import('./components/HelpBrowser'));
import { useMobileLayout } from './hooks/useMobileLayout';
import { FractalEvents } from './engine/FractalEvents';
import { Dock } from './components/layout/Dock';
import { DropZones } from './components/layout/DropZones';
import DraggableWindow from './components/DraggableWindow';
import { PanelRouter } from './components/PanelRouter';
import { PanelId, PanelState } from './types';
import { StoreCallbacksProvider } from './components/contexts/StoreCallbacksContext';
import type { StoreCallbacks } from './components/contexts/StoreCallbacksContext';

// The engine app shell. Apps assemble their own TopBar / Workshop / tutorial
// overlays on top of this skeleton; the engine itself provides only viewport,
// docks, floating windows, timeline, context menu, loading screen.
const App: React.FC = () => {
  const state = useFractalStore();
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [isLoadingVisible, setIsLoadingVisible] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);

  const mainWrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);

  const hudRefs = useMemo(() => ({
      container: containerRef,
      speed: speedRef,
      dist: distRef,
      reset: resetRef,
      reticle: reticleRef,
  }), []);

  const { startupMode, bootEngine, isHydrated } = useAppStartup(isSceneReady);
  const { isMobile, isPortrait } = useMobileLayout();
  useGlobalContextMenu();

  useEffect(() => { prefetchHelpTopics(); }, []);

  const isCurrentlyMobile = isMobile || state.debugMobileLayout;
  const isBroadcast = state.isBroadcastMode;
  const showCrosshair = state.interactionMode !== 'none';

  const handleTimelineContextMenu = (e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      state.openContextMenu(e.clientX, e.clientY, [], ['ui.timeline']);
  };

  const handleLoadingFinished = () => {
      setIsLoadingVisible(false);
  };

  const rootClass = isCurrentlyMobile && !isBroadcast
      ? "min-h-[120vh] bg-black"
      : "fixed inset-0 w-full h-full bg-black select-none overflow-hidden flex flex-col";

  const floatingPanels = (Object.values(state.panels) as PanelState[]).filter((p) => p.location === 'float' && p.isOpen);

  const storeCallbacks = useMemo<StoreCallbacks>(() => ({
      handleInteractionStart: state.handleInteractionStart,
      handleInteractionEnd: state.handleInteractionEnd,
      openContextMenu: state.openContextMenu,
  }), [state.handleInteractionStart, state.handleInteractionEnd, state.openContextMenu]);

  return (
    <StoreCallbacksProvider value={storeCallbacks}>
    <div className={rootClass}>
      <EngineBridge />
      <RenderLoopDriver />
      <DropZones />

      {floatingPanels.map(p => (
          <DraggableWindow key={p.id} id={p.id} title={p.id}>
              <PanelRouter activeTab={p.id as PanelId} state={state} actions={state} onSwitchTab={(t) => state.togglePanel(t, true)} />
          </DraggableWindow>
      ))}

      <div
          ref={mainWrapperRef}
          className={`relative bg-black select-none ${showCrosshair ? 'cursor-crosshair' : ''} flex flex-col ${isCurrentlyMobile && !isBroadcast ? 'h-[100vh] sticky top-0 overflow-hidden shadow-2xl' : 'w-full h-full'}`}
          onContextMenu={(e) => e.preventDefault()}
      >
        <LoadingScreen
            isReady={isSceneReady}
            onFinished={handleLoadingFinished}
            startupMode={startupMode}
            bootEngine={bootEngine}
            isHydrated={isHydrated}
        />

        {isCurrentlyMobile && isPortrait && !isLoadingVisible && !isBroadcast && (
            <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-10 text-center text-white">
                <div className="text-cyan-400 mb-6 animate-bounce"><SmartphoneRotateIcon /></div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Landscape Recommended</h2>
                <p className="text-gray-500 text-sm font-mono">Rotate device to access controls.</p>
            </div>
        )}

        {/* Apps install their own TopBar component here. */}

        <div className="flex-1 flex overflow-hidden relative">
            {!isBroadcast && !isCurrentlyMobile && <Dock side="left" />}

            <ViewportArea
                hudRefs={hudRefs}
                onSceneReady={() => setIsSceneReady(true)}
                activeHint={null}
                onDismissHint={() => {}}
            />

            {!isBroadcast && <Dock side="right" />}
        </div>

        {!isBroadcast && <MobileControls />}

        {state.contextMenu.visible && !isBroadcast && (
            <GlobalContextMenu
                x={state.contextMenu.x}
                y={state.contextMenu.y}
                items={state.contextMenu.items}
                targetHelpIds={state.contextMenu.targetHelpIds}
                onClose={state.closeContextMenu}
                onOpenHelp={state.openHelp}
            />
        )}
        {state.helpWindow.visible && (
            <Suspense fallback={null}>
                <HelpBrowser
                    activeTopicId={state.helpWindow.activeTopicId}
                    onClose={state.closeHelp}
                    onNavigate={state.openHelp}
                />
            </Suspense>
        )}

        {!showTimeline && !isBroadcast && (
            <div className={`fixed bottom-4 left-4 z-50 flex gap-2 transition-all duration-500`}>
                <button
                    type="button"
                    onClick={() => setShowTimeline(true)}
                    onContextMenu={handleTimelineContextMenu}
                    className={`p-2 rounded-full border shadow-lg transition-all bg-gray-800 border-gray-600 text-gray-400 hover:text-white`}
                    title="Open Timeline (T)"
                ><TimelineOpenIcon /></button>
            </div>
        )}
        {showTimeline && !isBroadcast && (
            <Suspense fallback={null}>
                <Timeline onClose={() => setShowTimeline(false)} />
            </Suspense>
        )}
      </div>
    </div>
    </StoreCallbacksProvider>
  );
};

export default App;
