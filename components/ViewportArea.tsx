
import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
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
import { engine } from '../engine/FractalEngine';
import Navigation from './Navigation';
import { CompilingIndicator } from './CompilingIndicator';
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
    useFrame(() => {
        if (engine.activeCamera) {
             engine.activeCamera.position.copy(camera.position);
             engine.activeCamera.quaternion.copy(camera.quaternion);
             
             // Sync Projection props if perspective
             if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera && (engine.activeCamera as THREE.PerspectiveCamera).isPerspectiveCamera) {
                const engCam = engine.activeCamera as THREE.PerspectiveCamera;
                const r3fCam = camera as THREE.PerspectiveCamera;
                
                if (engCam.fov !== r3fCam.fov) {
                    engCam.fov = r3fCam.fov;
                    engCam.updateProjectionMatrix();
                }
             }
             
             engine.activeCamera.updateMatrixWorld();
        }
    });
    return null;
}

// Master Loop component running inside R3F context
const RenderLoop = () => {
    const { camera, gl, scene } = useThree();
    
    useFrame((state, delta) => {
        // Clamp delta to prevent massive jumps on tab wake
        const safeDelta = Math.min(delta, 0.1);
        
        if (engine.activeCamera) {
             // Navigation now sets engine.isCameraInteracting flag.
             // We combine it with gizmo flag for the master interaction state.
             const isInteracting = engine.isGizmoInteracting || engine.isCameraInteracting;
             
             // Update Engine Logic (Smoothing, Uniforms)
             // We pass empty state object as uniforms are synced via event bus mostly now
             engine.update(engine.activeCamera, safeDelta, {}, isInteracting);
        }
        
        // Draw (to the main canvasRef, not the R3F canvas)
        if (engine.renderer) {
            engine.render(engine.renderer);
        }

        // Explicitly render the R3F overlay scene (Gizmos, UI)
        // This ensures the overlays are drawn even if the default loop behaves unexpectedly
        gl.render(scene, camera);

    }, 1); // Render Priority 1 to ensure it runs after controls/sync

    return null;
}

export const ViewportArea: React.FC<ViewportAreaProps> = ({ hudRefs, onSceneReady }) => {
    const state = useFractalStore();
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
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

    // --- SCALE-TO-FIT LOGIC ---
    // Calculates a uniform scale to ensure the canvas fits within the viewport.
    // This prevents distortion (flex squashing) and ensures the whole composition is visible.
    const padding = 40; 
    const availW = Math.max(1, viewportSize.w - padding);
    const availH = Math.max(1, viewportSize.h - padding);
    let fitScale = 1.0;
    
    if (isFixed) {
        fitScale = Math.min(1.0, availW / w, availH / h);
    }
    
    const wrapperStyle: React.CSSProperties = isFixed ? {
        width: w, 
        height: h, 
        transform: `scale(${fitScale})`,
        transformOrigin: 'center center',
        boxShadow: '0 0 50px rgba(0,0,0,0.5)', 
        border: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0 // CRITICAL: Prevent flexbox from squashing the layout footprint
    } : { width: '100%', height: '100%' };
    
    // Calculate visual dimensions after scaling for UI positioning
    const visW = isFixed ? w * fitScale : viewportSize.w;
    const visH = isFixed ? h * fitScale : viewportSize.h;
    
    const canvasTop = (viewportSize.h - visH) / 2;
    const canvasLeft = (viewportSize.w - visW) / 2;
    const controlsTop = Math.max(LAYOUT_PADDING, canvasTop - CONTROLS_OFFSET);
    const controlsLeft = Math.max(LAYOUT_PADDING, canvasLeft);

    // --- MAIN THREAD ENGINE INITIALIZATION ---
    useEffect(() => {
        if (!canvasRef.current) return;
        
        try {
            const renderer = new THREE.WebGLRenderer({ 
                canvas: canvasRef.current, 
                context: canvasRef.current.getContext('webgl2', { alpha: false, depth: false, antialias: false }) as WebGL2RenderingContext,
                powerPreference: "high-performance"
            });
            renderer.setPixelRatio(state.dpr);
            
            if (viewportSize.w > 0 && viewportSize.h > 0) {
                 renderer.setSize(viewportSize.w, viewportSize.h, false);
            }
            
            engine.registerRenderer(renderer);
            
            // Create a dedicated engine camera (Vanilla)
            const camera = new THREE.PerspectiveCamera(60, Math.max(1, viewportSize.w / viewportSize.h), 0.1, 1000);
            camera.position.set(0, 0, 0); // Init at 0,0,0 to avoid Double Distance
            engine.registerCamera(camera);
            
            onSceneReady();
            
        } catch (e) {
            console.error("Critical Engine Failure:", e);
        }
    }, []);

    // Resize & DPR Effect
    useEffect(() => {
        if (!engine.renderer || !engine.activeCamera) return;
        const width = isFixed ? w : viewportSize.w;
        const height = isFixed ? h : viewportSize.h;
        
        if (width > 0 && height > 0) {
            engine.renderer.setPixelRatio(state.dpr);
            engine.renderer.setSize(width, height, false);
            
            const cam = engine.activeCamera as THREE.PerspectiveCamera;
            cam.aspect = width / height;
            cam.updateProjectionMatrix();
            
            engine.pipeline.resize(width, height);
            engine.resetAccumulation();
        }
    }, [viewportSize.w, viewportSize.h, isFixed, w, h, state.dpr]);

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
                
                {/* 1. MAIN FRACTAL CANVAS (Raw WebGL) */}
                <canvas 
                    ref={canvasRef}
                    className="w-full h-full block absolute inset-0 z-0"
                    onPointerDown={(e) => (e.target as Element).setPointerCapture(e.pointerId)}
                    onPointerMove={handleInput}
                    onWheel={handleInput}
                />
                
                {/* 2. OVERLAY CANVAS (R3F) - Driving the Logic Loop */}
                <div className="absolute inset-0 z-10">
                    <Canvas 
                        gl={{ alpha: true, depth: false, antialias: true }} 
                        // Start at 0,0,0 so we don't apply distance offset twice (once via offset, once via camera pos)
                        camera={{ position: [0,0,0], fov: 60 }} 
                        style={{ pointerEvents: 'auto' }} // Allow input to pass to Navigation
                    >
                        <Navigation 
                            mode={state.cameraMode} 
                            hudRefs={hudRefs}
                            onStart={(s) => state.handleInteractionStart(s)}
                            onEnd={() => state.handleInteractionEnd()}
                            setSceneOffset={state.setSceneOffset}
                            fitScale={fitScale} 
                        />
                        <CameraSync />
                        <SceneOverlays />
                        {/* Master Logic Loop */}
                        <RenderLoop />
                    </Canvas>
                </div>

                {/* 3. DOM OVERLAYS (Webcam, Debug) */}
                <DomOverlays />
                
                {/* Logic Probes - Activated via Reference Counts */}
                {/* PRIMARY HISTOGRAM (Gradient Editor) - Always Geometry Source */}
                {!isCleanFeed && state.histogramActiveCount > 0 && (
                     <HistogramProbe 
                        onUpdate={(d) => state.setHistogramData(d)} 
                        autoUpdate={state.histogramAutoUpdate}
                        trigger={state.histogramTrigger}
                        source="geometry" 
                     />
                )}
                
                {/* SCENE HISTOGRAM (Color Grading) - Always Color Source */}
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
