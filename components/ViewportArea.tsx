
import React, { useRef, useState, useLayoutEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useFractalStore } from '../store/fractalStore';
import HistogramProbe from './HistogramProbe';
import HudOverlay from './HudOverlay';
import { AnimationSystem } from './AnimationSystem';
import { useInteractionManager } from '../hooks/useInteractionManager';
import { useRegionSelection } from '../hooks/useRegionSelection';
import { PerformanceMonitor } from './PerformanceMonitor';
import { featureRegistry } from '../engine/FeatureSystem';
import { componentRegistry } from './registry/ComponentRegistry';
import { useMobileLayout } from '../hooks/useMobileLayout';
import { FixedResolutionControls } from './viewport/FixedResolutionControls';
import { CompositionOverlay } from './viewport/CompositionOverlay';
import { engine } from '../engine/FractalEngine';
import Navigation from './Navigation';
import { CompilingIndicator } from './CompilingIndicator';
import MandelbulbScene from './MandelbulbScene';
import * as THREE from 'three';

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

// Renders HTML overlays (Webcam, Debuggers)
const DomOverlays = () => {
    const overlays = featureRegistry.getViewportOverlays().filter(o => o.type === 'dom');
    const state = useFractalStore();
    const actions = useFractalStore();
    
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-[20]">
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

// Renders R3F overlays (Gizmos, Drawing) inside the Canvas
const SceneOverlays = () => {
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

// Syncs the R3F overlay camera to match the Main Engine camera
const CameraSync = () => {
    const { camera } = useThree();
    const lastPosition = useRef(new THREE.Vector3());
    const lastQuaternion = useRef(new THREE.Quaternion());
    const lastFov = useRef(0);
    
    useFrame(() => {
        if (engine.activeCamera) {
            let hasChanged = false;
            
            // Check if camera position changed
            if (!lastPosition.current.equals(camera.position)) {
                engine.activeCamera.position.copy(camera.position);
                lastPosition.current.copy(camera.position);
                hasChanged = true;
            }
            
            // Check if camera rotation changed
            if (!lastQuaternion.current.equals(camera.quaternion)) {
                engine.activeCamera.quaternion.copy(camera.quaternion);
                lastQuaternion.current.copy(camera.quaternion);
                hasChanged = true;
            }
            
            // Sync Projection props if perspective (and changed)
            if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera && (engine.activeCamera as THREE.PerspectiveCamera).isPerspectiveCamera) {
                const engCam = engine.activeCamera as THREE.PerspectiveCamera;
                const r3fCam = camera as THREE.PerspectiveCamera;
                
                if (engCam.fov !== r3fCam.fov) {
                    engCam.fov = r3fCam.fov;
                    engCam.updateProjectionMatrix();
                    lastFov.current = r3fCam.fov;
                    hasChanged = true;
                }
            }
            
            // Only update matrix world if anything changed
            if (hasChanged) {
                engine.activeCamera.updateMatrixWorld();
            }
        }
    });
    return null;
}

export const ViewportArea: React.FC<ViewportAreaProps> = ({ hudRefs, onSceneReady }) => {
    const state = useFractalStore();
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    
    const { drawing, interactionMode } = state;
    const isDrawingToolActive = drawing?.active;
    const isSelectingRegion = interactionMode === 'selecting_region';

    const { visualRegion, isGhostDragging, renderRegion } = useRegionSelection(canvasContainerRef);
    useInteractionManager(canvasContainerRef);
    
    const { isMobile: isMobileDevice } = useMobileLayout();
    const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });

    useLayoutEffect(() => {
        if (!viewportRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const w = Math.max(1, entry.contentRect.width);
                const h = Math.max(1, entry.contentRect.height);
                setViewportSize({ w, h });
            }
        });
        observer.observe(viewportRef.current);
        
        const rect = viewportRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            setViewportSize({ w: rect.width, h: rect.height });
        }
        
        return () => observer.disconnect();
    }, []);

    const isFixed = state.resolutionMode === 'Fixed';
    const [w, h] = state.fixedResolution;
    const activeRegion = visualRegion || renderRegion;
    const isCleanFeed = state.isBroadcastMode;

    const padding = 40; 
    const availW = Math.max(1, viewportSize.w - padding);
    const availH = Math.max(1, viewportSize.h - padding);
    let fitScale = 1.0;
    
    if (isFixed) {
        fitScale = Math.min(1.0, availW / w, availH / h);
    }
    
    // Explicitly set pixel dimensions for Fixed mode to ensure 1:1 mapping if scale is 1.0
    const wrapperStyle: React.CSSProperties = isFixed ? {
        width: w, 
        height: h, 
        transform: `scale(${fitScale})`,
        transformOrigin: 'center center',
        boxShadow: '0 0 50px rgba(0,0,0,0.5)', 
        border: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0
    } : { width: '100%', height: '100%' };
    
    const visW = isFixed ? w * fitScale : viewportSize.w;
    const visH = isFixed ? h * fitScale : viewportSize.h;
    
    const canvasTop = (viewportSize.h - visH) / 2;
    const canvasLeft = (viewportSize.w - visW) / 2;
    const controlsTop = Math.max(LAYOUT_PADDING, canvasTop - CONTROLS_OFFSET);
    const controlsLeft = Math.max(LAYOUT_PADDING, canvasLeft);

    const handleInput = (e: React.PointerEvent | React.WheelEvent) => {};

    return (
        <div ref={viewportRef} className={`relative flex-1 flex items-center justify-center overflow-hidden bg-[#050505] touch-none ${isSelectingRegion ? 'cursor-crosshair' : (isDrawingToolActive ? 'cursor-crosshair' : '')}`} style={{ backgroundImage: isFixed ? 'radial-gradient(circle at center, #111 0%, #050505 100%)' : 'none' }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }} >
            {isFixed && <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} />}
            
            {!isCleanFeed && <HudOverlay state={state} actions={state} isMobile={state.debugMobileLayout || isMobileDevice} hudRefs={hudRefs} />}
            
            {!isCleanFeed && <CompilingIndicator />}
            
            {!isCleanFeed && <PerformanceMonitor />}
            {!isCleanFeed && <AnimationSystem />}
            
            <div ref={canvasContainerRef} style={wrapperStyle} className="relative bg-[#111] group z-0">
                {(isSelectingRegion || isDrawingToolActive) && <div className="absolute inset-0 z-50 cursor-crosshair bg-transparent pointer-events-none" />}
                
                {activeRegion && !isSelectingRegion && !isCleanFeed && (
                    <div className={`absolute border-2 z-40 group/box region-box cursor-move transition-opacity duration-75 ${isGhostDragging ? 'border-cyan-400 border-dashed opacity-80' : 'border-cyan-500 opacity-100'}`} style={{ left: `${activeRegion.minX * 100}%`, bottom: `${activeRegion.minY * 100}%`, right: `${(1 - activeRegion.maxX) * 100}%`, top: `${(1 - activeRegion.maxY) * 100}%`, }} >
                        <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-2 pointer-events-auto shadow-md">
                            <span>{isGhostDragging ? 'Moving...' : 'Active Region'}</span>
                            <div className="w-px h-2 bg-cyan-400/50" /><button onClick={(e) => { e.stopPropagation(); state.setRenderRegion(null); }} className="hover:text-black transition-colors" title="Clear Region" >✕</button>
                        </div>
                    </div>
                )}
                
                {/* Single Consolidated R3F Canvas */}
                <Canvas 
                    gl={{ 
                        alpha: false, 
                        depth: false, 
                        antialias: false, 
                        powerPreference: "high-performance",
                        // CRITICAL: Prevent auto-clear to allow manual loop control in MandelbulbScene
                        preserveDrawingBuffer: true 
                    }} 
                    camera={{ position: [0,0,0], fov: 60 }} 
                    style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}
                    dpr={state.dpr}
                    onPointerDown={(e) => (e.target as Element).setPointerCapture(e.pointerId)}
                    onPointerMove={handleInput}
                    onWheel={handleInput}
                >
                    <Navigation 
                        mode={state.cameraMode} 
                        hudRefs={hudRefs}
                        onStart={(s) => state.handleInteractionStart(s)}
                        onEnd={() => state.handleInteractionEnd()}
                        setSceneOffset={state.setSceneOffset}
                        fitScale={fitScale} 
                    />
                    
                    {/* The Scene renders the Fractal Quad in a portal */}
                    <MandelbulbScene onLoaded={onSceneReady} />
                    
                    {/* Overlays render on top in the main scene */}
                    <CameraSync />
                    <SceneOverlays />
                </Canvas>

                <DomOverlays />
                
                {/* Composition Overlay - Grid, Thirds, Golden Ratio, Spiral */}
                {!isCleanFeed && (
                    <CompositionOverlay width={isFixed ? w : viewportSize.w} height={isFixed ? h : viewportSize.h} />
                )}
                
                {!isCleanFeed && state.histogramActiveCount > 0 && (
                     <HistogramProbe 
                        onUpdate={(d) => state.setHistogramData(d)} 
                        autoUpdate={state.histogramAutoUpdate}
                        trigger={state.histogramTrigger}
                        source="geometry" 
                     />
                )}
                
                {!isCleanFeed && state.sceneHistogramActiveCount > 0 && (
                    <HistogramProbe
                        onUpdate={(d) => state.setSceneHistogramData(d)}
                        autoUpdate={true} 
                        trigger={state.sceneHistogramTrigger}
                        source="color" 
                    />
                )}

                {isSelectingRegion && !isCleanFeed && <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-cyan-900/80 text-cyan-100 text-[10px] font-bold px-3 py-1 rounded-full border border-cyan-500/50 shadow-lg animate-pulse pointer-events-none z-[60]">Drag to select render region</div>}
            </div>

            {isFixed && !isCleanFeed && (
                <FixedResolutionControls 
                    width={w} height={h} top={controlsTop} left={controlsLeft}
                    maxAvailableWidth={viewportSize.w} maxAvailableHeight={viewportSize.h}
                    onSetResolution={state.setFixedResolution} onSetMode={state.setResolutionMode}
                />
            )}
        </div>
    );
};
