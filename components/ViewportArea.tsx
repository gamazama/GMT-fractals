
import React, { useRef, useState, useLayoutEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useFractalStore } from '../store/fractalStore';
import HistogramProbe from './HistogramProbe';
import { AnimationSystem } from './AnimationSystem';
import { PerformanceMonitor } from './PerformanceMonitor';
import { featureRegistry } from '../engine/FeatureSystem';
import { componentRegistry } from './registry/ComponentRegistry';
import { useMobileLayout } from '../hooks/useMobileLayout';
import { FixedResolutionControls } from './viewport/FixedResolutionControls';
import { CompositionOverlay } from './viewport/CompositionOverlay';
import { CompilingIndicator } from './CompilingIndicator';
import { setMouseOverCanvas } from '../engine/worker/ViewportRefs';

// Generic viewport shell.
//
// The engine provides:
//   - a flex-filled viewport area
//   - fixed/free resolution mode
//   - DOM + R3F overlays bound to feature registrations
//   - composition overlay, compile indicator, animation system, perf monitor
//   - histogram probes for color analysis
//
// Apps install their own render surface (canvas, worker-driven display, …)
// inside the `canvasContainerRef` region by rendering children or by mounting
// a plugin viewport-surface component.

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
    activeHint?: unknown | null;
    onDismissHint?: () => void;
}

const DomOverlays: React.FC = () => {
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

const SceneOverlays: React.FC = () => {
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

export const ViewportArea: React.FC<ViewportAreaProps> = ({ onSceneReady }) => {
    const state = useFractalStore();
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);

    const { isMobile: isMobileDevice } = useMobileLayout();
    const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });

    useLayoutEffect(() => {
        if (!viewportRef.current) return;
        const pushCanvasSize = (w: number, h: number) => {
            const dpr = window.devicePixelRatio || 1;
            const st = useFractalStore.getState();
            if (st.isBucketRendering) return;
            st.setCanvasPixelSize(Math.floor(w * dpr), Math.floor(h * dpr));
        };
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const w = Math.max(1, entry.contentRect.width);
                const h = Math.max(1, entry.contentRect.height);
                setViewportSize({ w, h });
                pushCanvasSize(w, h);
            }
        });
        observer.observe(viewportRef.current);

        const rect = viewportRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            setViewportSize({ w: rect.width, h: rect.height });
            pushCanvasSize(rect.width, rect.height);
        }

        // Signal to parent that the scene is ready (no heavy startup in the
        // generic engine — apps with lazy resources gate their own ready state)
        onSceneReady();

        return () => observer.disconnect();
    }, [onSceneReady]);

    const isFixed = state.resolutionMode === 'Fixed';
    const [w, h] = state.fixedResolution;
    const isCleanFeed = state.isBroadcastMode;

    const padding = 40;
    const availW = Math.max(1, viewportSize.w - padding);
    const availH = Math.max(1, viewportSize.h - padding);
    let fitScale = 1.0;
    if (isFixed) fitScale = Math.min(1.0, availW / w, availH / h);

    const wrapperStyle: React.CSSProperties = isFixed ? {
        width: w, height: h,
        transform: `scale(${fitScale})`,
        transformOrigin: 'center center',
        boxShadow: '0 0 50px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
    } : { width: '100%', height: '100%' };

    const visW = isFixed ? w * fitScale : viewportSize.w;
    const visH = isFixed ? h * fitScale : viewportSize.h;
    const canvasTop = (viewportSize.h - visH) / 2;
    const canvasLeft = (viewportSize.w - visW) / 2;
    const controlsTop = Math.max(LAYOUT_PADDING, canvasTop - CONTROLS_OFFSET);
    const controlsLeft = Math.max(LAYOUT_PADDING, canvasLeft);

    return (
        <div
            ref={viewportRef}
            className="relative flex-1 flex items-center justify-center overflow-hidden bg-[#050505] touch-none"
            style={{ backgroundImage: isFixed ? 'radial-gradient(circle at center, #111 0%, #050505 100%)' : 'none' }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onMouseEnter={() => setMouseOverCanvas(true)}
            onMouseLeave={() => setMouseOverCanvas(false)}
        >
            {isFixed && <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} />}

            {!isCleanFeed && <CompilingIndicator />}
            {!isCleanFeed && <PerformanceMonitor />}
            {!isCleanFeed && <AnimationSystem />}

            <div ref={canvasContainerRef} style={wrapperStyle} className="relative bg-[#111] group z-0">
                {/* R3F Canvas — transparent overlay. Apps install a render
                    surface via SceneOverlays or by replacing this component. */}
                <Canvas
                    gl={{
                        alpha: true,
                        depth: false,
                        antialias: false,
                        powerPreference: "high-performance",
                        preserveDrawingBuffer: false,
                    }}
                    camera={{ position: [0, 0, 0], fov: 60 }}
                    style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}
                    dpr={state.dpr}
                    onPointerDown={(e) => (e.target as Element).setPointerCapture(e.pointerId)}
                >
                    <SceneOverlays />
                </Canvas>

                <DomOverlays />

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
            </div>

            {isFixed && !isCleanFeed && (
                <FixedResolutionControls
                    width={w} height={h} top={controlsTop} left={controlsLeft}
                    maxAvailableWidth={viewportSize.w} maxAvailableHeight={viewportSize.h}
                    onSetResolution={state.setFixedResolution}
                    onSetMode={state.setResolutionMode}
                />
            )}
        </div>
    );
};
