
import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import MandelbulbScene from './MandelbulbScene';
import Navigation from './Navigation';
import HistogramProbe from './HistogramProbe';
import HudOverlay from './HudOverlay';
import { AnimationSystem } from './AnimationSystem';
import { CompilingIndicator } from './CompilingIndicator';
import { useInteractionManager } from '../hooks/useInteractionManager';
import { useRegionSelection } from '../hooks/useRegionSelection';
import { PerformanceMonitor } from './PerformanceMonitor';
import { engine } from '../engine/FractalEngine';
import { featureRegistry } from '../engine/FeatureSystem';
import { componentRegistry } from './registry/ComponentRegistry';
import { useMobileLayout } from '../hooks/useMobileLayout';
import { FixedResolutionControls } from './viewport/FixedResolutionControls';
import { useAnimationStore } from '../store/animationStore';
import { QualityState } from '../features/quality';

// Layout Constants
const LAYOUT_PADDING = 12;
const CONTROLS_OFFSET = 40;

interface HudRefs {
    container: React.RefObject<HTMLDivElement | null>;
    speed: React.RefObject<HTMLSpanElement | null>;
    dist: React.RefObject<HTMLSpanElement | null>;
    reset: React.RefObject<HTMLButtonElement | null>;
    reticle: React.RefObject<HTMLDivElement | null>;
}

interface ViewportAreaProps {
    hudRefs: HudRefs;
    onSceneReady: () => void;
}

// Tiny component to bridge the Engine's sample count to the UI DOM without re-renders
const SampleCounterBridge = ({ labelRef }: { labelRef: React.RefObject<HTMLSpanElement> }) => {
    const { gl } = useThree();
    
    useFrame(() => {
        if (!labelRef.current) return;
        if (engine.pipeline.frameCount % 10 === 0) {
            const delta = engine.pipeline.measureConvergence(gl);
            const percentage = (delta * 100).toFixed(2);
            labelRef.current.innerText = `${percentage}% Δ`;
            if (delta > 0.05) labelRef.current.style.color = '#f87171'; 
            else if (delta > 0.005) labelRef.current.style.color = '#facc15'; 
            else labelRef.current.style.color = '#4ade80'; 
        }
    });
    return null;
};

/**
 * DynamicSceneOverlays: Renders components registered as R3F scene objects (inside Canvas)
 */
const DynamicSceneOverlays = () => {
    const overlays = featureRegistry.getViewportOverlays().filter(o => !o.type || o.type === 'scene');
    const state = useFractalStore();
    const actions = useFractalStore();
    
    return (
        <>
            {overlays.map(config => {
                const Component = componentRegistry.get(config.componentId);
                if (Component) {
                    const featureId = config.id;
                    const sliceState = (state as any)[featureId];
                    return (
                        <Component 
                            key={config.id} 
                            featureId={featureId}
                            sliceState={sliceState}
                            actions={actions}
                        />
                    );
                }
                return null;
            })}
        </>
    );
};

/**
 * DynamicDomOverlays: Renders components registered as DOM overlays (outside Canvas)
 */
const DynamicDomOverlays = () => {
    const overlays = featureRegistry.getViewportOverlays().filter(o => o.type === 'dom');
    const state = useFractalStore();
    const actions = useFractalStore();
    
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {overlays.map(config => {
                const Component = componentRegistry.get(config.componentId);
                if (Component) {
                    const featureId = config.id;
                    const sliceState = (state as any)[featureId];
                    return (
                        <Component 
                            key={config.id} 
                            featureId={featureId}
                            sliceState={sliceState}
                            actions={actions}
                        />
                    );
                }
                return null;
            })}
        </div>
    );
};

export const ViewportArea: React.FC<ViewportAreaProps> = ({ hudRefs, onSceneReady }) => {
    const state = useFractalStore();
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const sppLabelRef = useRef<HTMLSpanElement>(null);
    
    const { drawing } = state;
    const isDrawingToolActive = drawing?.active;

    // Use custom hook for Region Selection logic
    const { visualRegion, isGhostDragging, renderRegion, isSelectingRegion } = useRegionSelection(canvasContainerRef);
    
    // Use custom hook for General Interaction (Julia/Focus Picking)
    useInteractionManager(canvasContainerRef);
    
    // Use Standard Mobile Hook
    const { isMobile: isMobileDevice } = useMobileLayout();
    const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });

    useLayoutEffect(() => {
        if (!viewportRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                setViewportSize({ w: entry.contentRect.width, h: entry.contentRect.height });
            }
        });
        observer.observe(viewportRef.current);
        return () => observer.disconnect();
    }, []);

    const isMobile = state.debugMobileLayout || isMobileDevice;
    const isCleanFeed = state.isBroadcastMode;
    const isFixed = state.resolutionMode === 'Fixed';
    const [w, h] = state.fixedResolution;

    const wrapperStyle: React.CSSProperties = isFixed ? {
        width: w, height: h, boxShadow: '0 0 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)'
    } : { width: '100%', height: '100%' };
    
    const activeRegion = visualRegion || renderRegion;
    const fov = state.optics?.camFov || 60;

    // Calculate clamped controls position using constants
    const canvasTop = (viewportSize.h - h) / 2;
    const canvasLeft = (viewportSize.w - w) / 2;
    const controlsTop = Math.max(LAYOUT_PADDING, canvasTop - CONTROLS_OFFSET);
    const controlsLeft = Math.max(LAYOUT_PADDING, canvasLeft);

    // --- DYNAMIC RESOLUTION SCALING LOGIC ---
    const quality = (state as any).quality as QualityState;
    const [isInteracting, setIsInteracting] = useState(false);

    useEffect(() => {
        // Subscribe directly to the Animation Store's interaction flag
        const unsub = useAnimationStore.subscribe(
            (s) => s.isCameraInteracting,
            (val) => setIsInteracting(val)
        );
        return unsub;
    }, []);

    // If dynamic scaling enabled AND interacting, divide DPR by downsample factor
    const targetDpr = (quality?.dynamicScaling && isInteracting) 
        ? state.dpr / (quality.interactionDownsample || 2) 
        : state.dpr;

    return (
        <div ref={viewportRef} className={`relative flex-1 flex items-center justify-center overflow-hidden bg-[#050505] touch-none ${isSelectingRegion ? 'cursor-crosshair' : (isDrawingToolActive ? 'cursor-crosshair' : '')}`} style={{ backgroundImage: isFixed ? 'radial-gradient(circle at center, #111 0%, #050505 100%)' : 'none' }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }} >
            {isFixed && <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} />}
            
            {!isCleanFeed && <HudOverlay state={state} actions={state} isMobile={isMobile} hudRefs={hudRefs} />}
            {!isCleanFeed && <CompilingIndicator />}
            {!isCleanFeed && <PerformanceMonitor />}
            
            {state.showHints && !isMobile && !isCleanFeed && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none text-center animate-fade-in z-20">
                    <div className="text-[10px] text-gray-400 flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm border border-white/5 shadow-lg">
                        {state.cameraMode === 'Orbit' ? (
                            <><span className="flex items-center"><span className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-gray-200 font-bold mr-1 uppercase">Tab</span> Fly Mode</span><span className="w-px h-3 bg-white/20"></span><span className="flex items-center"><span className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-gray-200 font-bold mr-1 uppercase">Scroll</span> Zoom</span><span className="flex items-center"><span className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-gray-200 font-bold mr-1 uppercase">Shift</span> Pan</span></>
                        ) : (
                            <><span className="flex items-center"><span className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-gray-200 font-bold mr-1 uppercase">WASD</span> Move</span><span className="w-px h-3 bg-white/20"></span><span className="flex items-center"><span className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-gray-200 font-bold mr-1 uppercase">Space / C</span> Up / Down</span><span className="flex items-center"><span className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-gray-200 font-bold mr-1 uppercase">Shift</span> Boost</span><span className="w-px h-3 bg-white/20"></span><span className="flex items-center"><span className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-gray-200 font-bold mr-1 uppercase">Tab</span> Orbit Mode</span></>
                        )}
                    </div>
                </div>
            )}
            
            <div ref={canvasContainerRef} style={wrapperStyle} className="relative bg-[#111] group z-0">
                {(isSelectingRegion || isDrawingToolActive) && <div className="absolute inset-0 z-50 cursor-crosshair bg-transparent pointer-events-none" />}
                
                {/* Active Render Region Box */}
                {activeRegion && !isSelectingRegion && !isCleanFeed && (
                    <div className={`absolute border-2 z-40 group/box region-box cursor-move transition-opacity duration-75 ${isGhostDragging ? 'border-cyan-400 border-dashed opacity-80' : 'border-cyan-500 opacity-100'}`} style={{ left: `${activeRegion.minX * 100}%`, bottom: `${activeRegion.minY * 100}%`, right: `${(1 - activeRegion.maxX) * 100}%`, top: `${(1 - activeRegion.maxY) * 100}%`, }} >
                        <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-2 pointer-events-auto shadow-md">
                            <span>{isGhostDragging ? 'Moving...' : 'Active Region'}</span>
                            {!isGhostDragging && <><div className="w-px h-2 bg-cyan-400/50" /><span ref={sppLabelRef} className="font-mono text-[8px] min-w-[50px] text-right" title="Max change vs previous frame">--% Δ</span></>}
                            <div className="w-px h-2 bg-cyan-400/50" /><button onClick={(e) => { e.stopPropagation(); state.setRenderRegion(null); }} className="hover:text-black transition-colors" title="Clear Region" >✕</button>
                        </div>
                        <div data-handle="nw" className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-cyan-600 cursor-nw-resize pointer-events-auto" />
                        <div data-handle="ne" className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-cyan-600 cursor-ne-resize pointer-events-auto" />
                        <div data-handle="sw" className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-cyan-600 cursor-sw-resize pointer-events-auto" />
                        <div data-handle="se" className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-cyan-600 cursor-se-resize pointer-events-auto" />
                        <div data-handle="n" className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-cyan-600 cursor-n-resize pointer-events-auto" />
                        <div data-handle="s" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-cyan-600 cursor-s-resize pointer-events-auto" />
                        <div data-handle="w" className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-4 bg-white border border-cyan-600 cursor-w-resize pointer-events-auto" />
                        <div data-handle="e" className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-4 bg-white border border-cyan-600 cursor-e-resize pointer-events-auto" />
                    </div>
                )}
                
                {/* 3D Scene - Use targetDpr for dynamic scaling */}
                <Canvas dpr={targetDpr} gl={{ antialias: false, preserveDrawingBuffer: true }}>
                    <PerspectiveCamera makeDefault position={[0, 0, 0]} fov={fov} near={0.00001} />
                    <AnimationSystem /> 
                    <Navigation mode={state.cameraMode} hudRefs={hudRefs} onStart={state.handleInteractionStart} onEnd={state.handleInteractionEnd} setSceneOffset={state.setSceneOffset} />
                    <SampleCounterBridge labelRef={sppLabelRef} />
                    <HistogramProbe onUpdate={state.setHistogramData} autoUpdate={state.histogramAutoUpdate} trigger={state.histogramTrigger} source="geometry" />
                    <HistogramProbe onUpdate={state.setSceneHistogramData} autoUpdate={false} trigger={state.sceneHistogramTrigger} source="color" />
                    <DynamicSceneOverlays />
                    <MandelbulbScene onLoaded={onSceneReady} />
                </Canvas>
                
                <DynamicDomOverlays />

                {isSelectingRegion && !isCleanFeed && <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-cyan-900/80 text-cyan-100 text-[10px] font-bold px-3 py-1 rounded-full border border-cyan-500/50 shadow-lg animate-pulse pointer-events-none z-[60]">Drag to select render region</div>}
            </div>

            {/* Fixed Mode Status Overlays */}
            {isFixed && !isCleanFeed && (
                <FixedResolutionControls 
                    width={w}
                    height={h}
                    top={controlsTop}
                    left={controlsLeft}
                    maxAvailableWidth={viewportSize.w}
                    maxAvailableHeight={viewportSize.h}
                    onSetResolution={state.setFixedResolution}
                    onSetMode={state.setResolutionMode}
                />
            )}
        </div>
    );
};
