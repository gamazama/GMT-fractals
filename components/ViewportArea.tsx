
import React, { useRef, useState, useLayoutEffect, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { useFractalStore } from '../store/fractalStore';
import HistogramProbe from './HistogramProbe';
import HudOverlay from './HudOverlay';
import type { ActiveHint } from '../hooks/useTutorialHints';
import { AnimationSystem } from './AnimationSystem';
import { useInteractionManager } from '../hooks/useInteractionManager';
import { useRegionSelection } from '../hooks/useRegionSelection';
import { PerformanceMonitor } from './PerformanceMonitor';
import { featureRegistry } from '../engine/FeatureSystem';
import { componentRegistry } from './registry/ComponentRegistry';
import { useMobileLayout } from '../hooks/useMobileLayout';
import { FixedResolutionControls } from './viewport/FixedResolutionControls';
import { CompositionOverlay } from './viewport/CompositionOverlay';
import Navigation from './Navigation';
import { CompilingIndicator } from './CompilingIndicator';
import WorkerTickScene from './WorkerTickScene';
import { WorkerDisplay } from './WorkerDisplay';
import { getProxy } from '../engine/worker/WorkerProxy';
import { setMouseOverCanvas } from '../engine/worker/ViewportRefs';

const engine = getProxy();

// Layout Constants
const LAYOUT_PADDING = 12;
const CONTROLS_OFFSET = 40;

interface HudRefs {
    container: React.RefObject<HTMLDivElement>;
    speed: React.RefObject<HTMLSpanElement>;
    dist: React.RefObject<HTMLSpanElement>;
    reset: React.RefObject<HTMLButtonElement>;
    reticle: React.RefObject<HTMLDivElement>;
}

interface ViewportAreaProps {
    hudRefs: HudRefs;
    onSceneReady: () => void;
    activeHint?: ActiveHint | null;
    onDismissHint?: () => void;
}

// Renders HTML overlays (Webcam, Debuggers)
const DomOverlays = () => {
    const overlays = featureRegistry.getViewportOverlays().filter(o => o.type === 'dom');
    const state = useFractalStore();
    const actions = useFractalStore();
    
    return (
        <div className="absolute inset-0 pointer-events-none z-[20]">
            {overlays.map(config => {
                const Component = componentRegistry.get(config.componentId);
                const featureId = config.id;
                const sliceState = (state as any)[featureId];
                if (Component && sliceState) {
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
                const featureId = config.id;
                const sliceState = (state as any)[featureId];
                if (Component && sliceState) {
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

// ── Region Overlay ──────────────────────────────────────────────────
const HANDLE_DIRS = ['n','s','e','w','ne','nw','se','sw'] as const;
const HANDLE_STYLES: Record<string, string> = {
    n:  'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
    s:  'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
    e:  'top-1/2 right-0 -translate-y-1/2 translate-x-1/2 cursor-ew-resize',
    w:  'top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 cursor-ew-resize',
    ne: 'top-0 right-0 -translate-y-1/2 translate-x-1/2 cursor-nesw-resize',
    nw: 'top-0 left-0 -translate-y-1/2 -translate-x-1/2 cursor-nwse-resize',
    se: 'bottom-0 right-0 translate-y-1/2 translate-x-1/2 cursor-nwse-resize',
    sw: 'bottom-0 left-0 translate-y-1/2 -translate-x-1/2 cursor-nesw-resize',
};

const RegionOverlay: React.FC<{
    region: { minX: number; minY: number; maxX: number; maxY: number };
    isGhostDragging: boolean;
    isDrawing: boolean;
    onClear: () => void;
}> = ({ region, isGhostDragging, isDrawing, onClear }) => {
    const sampleCap = useFractalStore(s => s.sampleCap);
    const setSampleCap = useFractalStore(s => s.setSampleCap);
    const convergenceThreshold = useFractalStore(s => s.convergenceThreshold);
    const canvasPixelSize = useFractalStore(s => s.canvasPixelSize);

    const [samples, setSamples] = useState(0);
    const [convergence, setConvergence] = useState(1.0);

    // Poll accumulation count and convergence from engine proxy
    useEffect(() => {
        const id = setInterval(() => {
            setSamples(engine.accumulationCount);
            setConvergence(engine.convergenceValue);
        }, 100);
        return () => clearInterval(id);
    }, []);

    const regionW = Math.round((region.maxX - region.minX) * canvasPixelSize[0]);
    const regionH = Math.round((region.maxY - region.minY) * canvasPixelSize[1]);

    const capReached = sampleCap > 0 && samples >= sampleCap;
    const thresholdRaw = convergenceThreshold / 100.0;
    const isConverged = convergence < thresholdRaw && samples > 2;

    // Cycle through common sample caps on click
    const cycleSampleCap = useCallback(() => {
        const caps = [0, 64, 128, 256, 512, 1024, 2048, 4096];
        const idx = caps.indexOf(sampleCap);
        const next = idx >= 0 ? caps[(idx + 1) % caps.length] : 256;
        setSampleCap(next);
    }, [sampleCap, setSampleCap]);

    const borderClass = isDrawing
        ? 'border-cyan-400 border-dashed opacity-70'
        : isGhostDragging
            ? 'border-cyan-400 border-dashed opacity-80'
            : 'border-cyan-500 opacity-100';

    return (
        <div
            className={`absolute border-2 z-40 group/box region-box cursor-move transition-opacity duration-75 ${borderClass}`}
            style={{
                left: `${region.minX * 100}%`,
                bottom: `${region.minY * 100}%`,
                right: `${(1 - region.maxX) * 100}%`,
                top: `${(1 - region.maxY) * 100}%`,
            }}
        >
            {/* Header bar */}
            {!isDrawing && (
                <div className="absolute top-0 right-0 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-1.5 pointer-events-auto shadow-md select-none" style={{ backdropFilter: 'blur(4px)' }}>
                    <span className="text-gray-400">{regionW}×{regionH}</span>
                    <div className="w-px h-2.5 bg-white/10" />
                    <span className={capReached ? 'text-green-400' : 'text-cyan-300'}>{samples}</span>
                    <span className="text-gray-500">/ {sampleCap === 0 ? '∞' : sampleCap}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); cycleSampleCap(); }}
                        className="text-gray-500 hover:text-cyan-300 transition-colors px-0.5"
                        title={`Sample cap: ${sampleCap === 0 ? 'Infinite' : sampleCap}. Click to cycle.`}
                    >
                        ⟳
                    </button>
                    <div className="w-px h-2.5 bg-white/10" />
                    <span className={isConverged ? 'text-green-400' : 'text-gray-400'} title={`Convergence: ${(convergence * 100).toFixed(3)}% (threshold: ${convergenceThreshold.toFixed(2)}%)`}>
                        {(convergence * 100).toFixed(2)}%
                    </span>
                    <span className="text-gray-600">/</span>
                    <span className="text-gray-500">{convergenceThreshold.toFixed(2)}%</span>
                    <div className="w-px h-2.5 bg-white/10" />
                    <button
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                        title="Clear Region"
                    >✕</button>
                </div>
            )}

            {/* Resize handles — only when not drawing and not ghost-dragging */}
            {!isDrawing && !isGhostDragging && HANDLE_DIRS.map(dir => (
                <div
                    key={dir}
                    data-handle={dir}
                    className={`absolute w-2.5 h-2.5 bg-cyan-500 border border-cyan-300 rounded-sm pointer-events-auto opacity-0 group-hover/box:opacity-100 transition-opacity ${HANDLE_STYLES[dir]}`}
                />
            ))}
        </div>
    );
};

export const ViewportArea: React.FC<ViewportAreaProps> = ({ hudRefs, onSceneReady, activeHint, onDismissHint }) => {
    const state = useFractalStore();
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    
    const { drawing, interactionMode } = state;
    const isDrawingToolActive = drawing?.active;
    const isSelectingRegion = interactionMode === 'selecting_region';

    const { visualRegion, drawPreview, isGhostDragging, renderRegion } = useRegionSelection(canvasContainerRef);
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
    // Priority: draw preview (while drawing) > visual region (while dragging) > committed region
    const activeRegion = drawPreview || visualRegion || renderRegion;
    const isDrawingPreview = !!drawPreview;
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
        <div ref={viewportRef} className={`relative flex-1 flex items-center justify-center overflow-hidden bg-[#050505] touch-none ${isSelectingRegion ? 'cursor-crosshair' : (isDrawingToolActive ? 'cursor-crosshair' : '')}`} style={{ backgroundImage: isFixed ? 'radial-gradient(circle at center, #111 0%, #050505 100%)' : 'none' }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }} onMouseEnter={() => setMouseOverCanvas(true)} onMouseLeave={() => setMouseOverCanvas(false)} >
            {isFixed && <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} />}
            
            {!isCleanFeed && <HudOverlay state={state} actions={state} isMobile={state.debugMobileLayout || isMobileDevice} activeHint={activeHint} onDismissHint={onDismissHint} hudRefs={hudRefs} />}
            
            {!isCleanFeed && <CompilingIndicator />}
            
            {!isCleanFeed && <PerformanceMonitor />}
            {!isCleanFeed && <AnimationSystem />}
            
            <div ref={canvasContainerRef} style={wrapperStyle} className="relative bg-[#111] group z-0">
                {(isSelectingRegion || isDrawingToolActive) && <div className="absolute inset-0 z-50 cursor-crosshair bg-transparent pointer-events-none" />}

                {activeRegion && !isCleanFeed && (
                    <RegionOverlay region={activeRegion} isGhostDragging={isGhostDragging} isDrawing={isDrawingPreview} onClear={() => state.setRenderRegion(null)} />
                )}

                {/* 2D canvas receives ImageBitmaps from render worker */}
                {viewportSize.w > 0 && viewportSize.h > 0 && (
                    <WorkerDisplay
                        width={isFixed ? w : viewportSize.w}
                        height={isFixed ? h : viewportSize.h}
                    />
                )}

                {/* R3F Canvas — transparent overlay for gizmos, navigation, scene overlays */}
                <Canvas
                    gl={{
                        alpha: true,
                        depth: false,
                        antialias: false,
                        powerPreference: "high-performance",
                        preserveDrawingBuffer: false
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

                    {/* WorkerTickScene drives animation/UI ticks and posts render data to worker */}
                    <WorkerTickScene onLoaded={onSceneReady} />
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
                        onLoadingChange={(v) => state.setHistogramLoading(v)}
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
