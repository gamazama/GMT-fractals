
import React, { useRef, useState, useEffect } from 'react';
import { useEngineStore, getCanvasPhysicalPixelSize } from '../store/engineStore';
import { useAnimationStore } from '../store/animationStore';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();
import { AlertIcon, CloseIcon, CheckIcon, LayersIcon, CubeIcon } from './Icons';
import { collectHelpIds } from '../utils/helpUtils';
// Quality feature was fractal-specific. Apps re-install via their own feature.
type QualityState = Record<string, any>;

const _isFirefox = /Firefox/i.test(navigator.userAgent);

// Global refs to track performance across ticks
const performanceState = {
    lowFpsBuffer: 0,
    lastTime: performance.now(),
    lastFrameCount: 0,
    lastAccumCount: 0,
    setShowWarning: null as ((show: boolean) => void) | null,
    setCurrentFps: null as ((fps: number) => void) | null,
    isPaused: false,
    isScrubbing: false,
    isExporting: false,
    isBroadcastMode: false,
    renderMode: 'PathTracing',
    frameTimestamps: [] as number[] // Track individual frame timings for better analysis
};

// Export tick function for orchestrated updates
export const tick = () => {
    const now = performance.now();
    const delta = now - performanceState.lastTime;

    // Poll every 500ms
    if (delta >= 500) {
        performanceState.lastTime = now;

        // --- Logic Gate ---
        const state = useEngineStore.getState();

        // Use the engine's canonical smoothed FPS — the same value the FPS
        // counter shows and adaptive resolution acts on. (Timing our own tick
        // calls measured the main-thread loop, ~60fps, and never saw a heavy
        // render.) Adaptive res holds raw FPS near target by downscaling, so
        // fpsSmoothed only falls below the warning threshold when it genuinely
        // can't keep up — i.e. adaptive is pinned at its quality floor or off.
        const fps = state.fpsSmoothed;

        // Engine activity signal. accumulationCount climbs only while the engine
        // is actually accumulating samples; it resets to 0 on any camera/param
        // change and stops climbing once a frame is converged or the sample cap
        // is hit. So a STALLED count on a still view means the engine has stopped
        // doing real render work — at which point the loop reports a meaningless
        // ~60fps that must NOT be read as "performance recovered".
        const accumCount = engine.accumulationCount;
        const accumStalled = accumCount === performanceState.lastAccumCount;
        performanceState.lastAccumCount = accumCount;

        // Adaptive state — computed first; the convergence gate depends on it.
        const cfg = state.adaptiveConfig;
        const adaptiveActive = cfg.enabled && !state.adaptiveSuppressed;

        // Sample cap reached — engine intentionally stops rendering.
        const isAccumulationComplete = state.sampleCap > 0 && accumCount >= state.sampleCap;

        // Convergence finished / engine idle: a still view whose sample count is
        // no longer advancing. Covers BOTH the capped case and the infinite-cap
        // ("never stop") case where the engine just holds a converged frame —
        // isAccumulationComplete is always false there. The ~60fps the loop
        // reports in this state is bogus, so we treat it as idle regardless of
        // whether adaptive is on, and never feed it into the recovery math.
        const isConvergedIdle = !state.isUserInteracting && accumCount > 1 && accumStalled;

        // Still-frame convergence IN PROGRESS — only meaningful with adaptive
        // ENABLED: adaptive deliberately holds full resolution while the view is
        // still so it can converge a clean frame, so the low FPS during those
        // accumulation passes is the expected cost of converging, not a
        // responsiveness problem. With adaptive OFF there is no such full-res
        // hold, so a genuinely slow still frame should still warn.
        const isConvergingStill = adaptiveActive && !state.isUserInteracting && accumCount > 4 && !isConvergedIdle;

        // Adaptive headroom: when adaptive is on and still above its quality
        // floor, it can downscale further on its own to recover FPS — so let it.
        // Only warn when adaptive is OFF, hard-suppressed, or already pinned at
        // minQuality and STILL can't keep up (genuine "can't render this fast").
        const adaptiveHasHeadroom = adaptiveActive && state.qualityFraction > cfg.minQuality * 1.05;

        // 1. Ignore if we aren't *trying* to render efficiently (Exporting,
        //    Paused, Scrubbing, Compiling, Tab Hidden, cap reached, converged/
        //    idle, a still frame converging under adaptive, or adaptive still
        //    adapting).
        const isIdle = performanceState.isPaused || performanceState.isScrubbing || document.hidden || engine.isCompiling || performanceState.isExporting || isAccumulationComplete || isConvergedIdle || isConvergingStill || adaptiveHasHeadroom;

        if (isIdle) {
            performanceState.lowFpsBuffer = 0;
            // When the frame has converged / the engine has stopped rendering,
            // clear any visible warning: the scene finished rendering fine, and
            // the bogus ~60fps must never reach the recovery branch below as a
            // false "recovered" signal. (Pause/compile/export deliberately keep
            // a shown warning so its fix-suggestion buttons stay actionable.)
            if ((isConvergedIdle || isAccumulationComplete) && performanceState.setShowWarning) {
                performanceState.setShowWarning(false);
            }
        }
        // 2. Ignore Startup (First 8s)
        else if (now < 8000) { 
            performanceState.lowFpsBuffer = 0;
        }
        else {
            if (performanceState.setCurrentFps) {
                performanceState.setCurrentFps(fps);
            }

            // Thresholds based on Engine Mode
            // PT is naturally slower, so we tolerate lower FPS before warning
            const isPT = performanceState.renderMode === 'PathTracing';
            const lowThreshold = isPT ? 10 : 15;
            const recoveryThreshold = isPT ? 22 : 30;

            if (fps < lowThreshold) {
                // FPS is Low -> Increment Penalty (Fast trigger if very low)
                performanceState.lowFpsBuffer += (fps < 5 ? 2 : 1);
            } else if (fps >= recoveryThreshold) {
                // FPS is Good -> Recover
                // Decrement faster (-3) to make it disappear quickly once performance is back
                performanceState.lowFpsBuffer = Math.max(0, performanceState.lowFpsBuffer - 3);
                
                if (performanceState.lowFpsBuffer === 0 && performanceState.setShowWarning) {
                     performanceState.setShowWarning(false);
                }
            }

            // Trigger Warning Threshold (approx 2.5s of bad performance)
            if (performanceState.lowFpsBuffer >= 5 && performanceState.setShowWarning) {
                performanceState.setShowWarning(true);
            }
        }
    }
};

export const PerformanceMonitor = () => {
    // Logic Refs
    const lowFpsBuffer = useRef(0);
    const lastTimeRef = useRef(performance.now());
    const lastFrameCountRef = useRef(0);
    
    // Store Access
    // Full-store subscription — this component recomputes suggestions on any state change,
    // which includes `canvasPixelSize` updates from the ResizeObserver so the "Reduce
    // resolution" button picks up dock-toggle canvas changes automatically.
    const {
        resolutionMode, setResolutionMode, setFixedResolution, fixedResolution,
        isExporting, isBroadcastMode, openContextMenu,
        aaLevel, setAALevel,
        renderMode,
        dpr
    } = useEngineStore();
    const quality = (useEngineStore.getState() as any).quality as QualityState | undefined;

    const isPaused = useEngineStore(s => s.isPaused);
    const isScrubbing = useAnimationStore(s => s.isScrubbing);
    
    // UI State
    const [showWarning, setShowWarning] = useState(false);
    const [currentFps, setCurrentFps] = useState(60);
    
    // Sync state with global performanceState
    useEffect(() => {
        performanceState.setShowWarning = setShowWarning;
        performanceState.setCurrentFps = setCurrentFps;
        performanceState.isPaused = isPaused;
        performanceState.isScrubbing = isScrubbing;
        performanceState.isExporting = isExporting;
        performanceState.isBroadcastMode = isBroadcastMode;
        performanceState.renderMode = renderMode;
        
        // Initial setup
        performanceState.lastTime = performance.now();
        performanceState.lastFrameCount = engine.frameCount;
        
        return () => {
            if (performanceState.setShowWarning === setShowWarning) {
                performanceState.setShowWarning = null;
            }
            if (performanceState.setCurrentFps === setCurrentFps) {
                performanceState.setCurrentFps = null;
            }
        };
    }, [isPaused, isScrubbing, isExporting, isBroadcastMode, renderMode]);
    
    const handleContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openContextMenu(e.clientX, e.clientY, [], ids);
        }
    };

    if (isBroadcastMode || !showWarning) return null;
    
    // --- Suggestions Logic ---

    // 1. Resolution Reduction — use the canonical canvas-size accessor.
    // (Avoids ResizeObserver lag after Fixed-mode toggles — see store/engineStore.ts.)
    const [currentW, currentH] = getCanvasPhysicalPixelSize(useEngineStore.getState());
    
    const canReduce = currentW > 480;

    const handleReduce = () => {
        // Reduce by ~33% (multiply by 0.66)
        // Snap to multiple of 8 for GPU alignment
        const newW = Math.max(320, Math.round((currentW * 0.66) / 8) * 8);
        const newH = Math.max(240, Math.round((currentH * 0.66) / 8) * 8);

        setResolutionMode('Fixed');
        setFixedResolution(newW, newH);
        
        dismissTemporarily();
    };

    // 2. Internal Scale
    const canResetScale = aaLevel > 1.0;
    const handleResetScale = () => {
        setAALevel(1.0);
        dismissTemporarily();
    };

    // 3. Lite Mode
    const qState = quality as QualityState;
    const isLite = qState?.precisionMode === 1.0;
    const canSwitchLite = !isLite;

    const handleLiteMode = () => {
        // We use the Engine Settings logic via a direct action if possible,
        // or just manually set the critical params to save perf.
        const setQuality = (useEngineStore.getState() as any).setQuality;
        const setLighting = (useEngineStore.getState() as any).setLighting;

        if (setQuality) setQuality({ precisionMode: 1.0, bufferPrecision: 1.0 });
        if (setLighting) setLighting({ shadows: false }); // Disable shadows for massive gain

        dismissTemporarily();
    };

    // 4. Adaptive Resolution (especially useful on Firefox)
    // "UI Responsiveness" (adaptiveTarget) is the single switch; 0 = off.
    const canEnableAdaptive = ((qState as any)?.adaptiveTarget ?? 0) <= 0;
    const handleAdaptive = () => {
        const setQuality = (useEngineStore.getState() as any).setQuality;
        if (setQuality) setQuality({ dynamicScaling: true, adaptiveTarget: 30 });
        dismissTemporarily();
    };

    const dismissTemporarily = () => {
        setShowWarning(false);
        lowFpsBuffer.current = -10; // 5s grace period
    };

    return (
        <div 
            className="absolute top-2 right-4 z-[50] pointer-events-auto animate-fade-in-left origin-top-right max-w-[200px]"
            data-help-id="ui.performance"
            onContextMenu={handleContextMenu}
        >
            <div className="flex flex-col gap-1 bg-red-950/90 border border-red-500/30 rounded-lg shadow-xl backdrop-blur-md p-2">
                
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-red-200 text-[10px] font-bold">
                        <AlertIcon />
                        <span>Low FPS ({currentFps.toFixed(1)})</span>
                    </div>
                    <button 
                        onClick={() => {
                            setShowWarning(false);
                            lowFpsBuffer.current = -40; // Long grace period (20s)
                        }}
                        className="text-red-400 hover:text-white transition-colors p-0.5"
                        title="Dismiss"
                    >
                        <CloseIcon />
                    </button>
                </div>
                
                {_isFirefox && (
                    <p className="text-red-300/70 text-[8px] leading-tight mb-0.5">
                        Firefox has a known rendering overhead with OffscreenCanvas that reduces frame rate.
                    </p>
                )}

                <div className="flex flex-col gap-1">
                    {canEnableAdaptive && (
                        <button
                            onClick={handleAdaptive}
                            className="flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5"
                        >
                            <span className="flex items-center gap-1.5"><CheckIcon /> Adaptive Resolution</span>
                            <span className="text-cyan-400 font-bold">Fix</span>
                        </button>
                    )}

                    {canResetScale && (
                        <button
                            onClick={handleResetScale}
                            className="flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5"
                        >
                            <span className="flex items-center gap-1.5"><LayersIcon /> Reset Scale (1x)</span>
                            <span className="text-cyan-400 font-bold">Fix</span>
                        </button>
                    )}

                    {canSwitchLite && (
                        <button
                            onClick={handleLiteMode}
                            className="flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5"
                        >
                            <span className="flex items-center gap-1.5"><CubeIcon /> Enable Lite Mode</span>
                            <span className="text-cyan-400 font-bold">Fix</span>
                        </button>
                    )}

                    {canReduce && (
                        <button
                            onClick={handleReduce}
                            className="flex items-center justify-between bg-black/40 hover:bg-white/10 text-gray-300 text-[9px] px-2 py-1.5 rounded transition-colors border border-white/5"
                        >
                            <span className="flex items-center gap-1.5"><CheckIcon /> Reduce Resolution</span>
                            <span className="text-cyan-400 font-bold">-33%</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
