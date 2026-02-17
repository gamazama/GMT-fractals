
import React, { useRef, useState, useEffect } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { useAnimationStore } from '../store/animationStore';
import { engine } from '../engine/FractalEngine';
import { AlertIcon, CloseIcon, CheckIcon, LayersIcon, CubeIcon } from './Icons';
import { collectHelpIds } from '../utils/helpUtils';
import { QualityState } from '../features/quality';

// Global refs to track performance across ticks
const performanceState = {
    lowFpsBuffer: 0,
    lastTime: performance.now(),
    lastFrameCount: 0,
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
    
    // Add current frame timestamp
    performanceState.frameTimestamps.push(now);
    
    // Keep only last 2 seconds of timestamps
    const twoSecondsAgo = now - 2000;
    performanceState.frameTimestamps = performanceState.frameTimestamps.filter(t => t > twoSecondsAgo);
    
    const delta = now - performanceState.lastTime;
    
    // Poll every 500ms
    if (delta >= 500) {
        // Calculate FPS using individual frame timings for more accuracy
        let fps = 0;
        if (performanceState.frameTimestamps.length > 1) {
            const firstFrame = performanceState.frameTimestamps[0];
            const lastFrame = performanceState.frameTimestamps[performanceState.frameTimestamps.length - 1];
            const totalTime = lastFrame - firstFrame;
            const framesRendered = performanceState.frameTimestamps.length - 1;
            fps = (framesRendered / totalTime) * 1000;
        }
        
        // Update Refs
        performanceState.lastTime = now;
        performanceState.lastFrameCount = engine.pipeline ? engine.pipeline.frameCount : 0;

        // --- Logic Gate ---
        const state = useFractalStore.getState();

        // Check if Accumulation is finished (Engine stops rendering intentionally)
        const isAccumulationComplete = state.sampleCap > 0 && engine.pipeline && engine.pipeline.accumulationCount >= state.sampleCap;
        
        // 1. Ignore if we aren't *trying* to render efficiently
        // (Exporting, Paused, Scrubbing, Compiling, Tab Hidden, or Finished Accumulating)
        const isIdle = performanceState.isPaused || performanceState.isScrubbing || document.hidden || engine.isCompiling || performanceState.isExporting || isAccumulationComplete;

        if (isIdle) {
            performanceState.lowFpsBuffer = 0; 
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
    const { 
        resolutionMode, setResolutionMode, setFixedResolution, fixedResolution, 
        isExporting, isBroadcastMode, openContextMenu, 
        aaLevel, setAALevel, 
        renderMode,
        quality
    } = useFractalStore();
    
    const isPaused = useFractalStore(s => s.isPaused);
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
        performanceState.lastFrameCount = engine.pipeline ? engine.pipeline.frameCount : 0;
        
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

    // 1. Resolution Reduction
    let currentW = window.innerWidth;
    let currentH = window.innerHeight;
    
    // Use actual canvas size if available for accuracy
    if (engine.renderer) {
        const canvas = engine.renderer.domElement;
        currentW = canvas.width;
        currentH = canvas.height;
    } else if (resolutionMode === 'Fixed') {
        currentW = fixedResolution[0];
        currentH = fixedResolution[1];
    }
    
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
        const setQuality = (useFractalStore.getState() as any).setQuality;
        const setLighting = (useFractalStore.getState() as any).setLighting;
        
        if (setQuality) setQuality({ precisionMode: 1.0, bufferPrecision: 1.0 });
        if (setLighting) setLighting({ shadows: false }); // Disable shadows for massive gain
        
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
                    <div className="flex items-center gap-2 text-red-200 text-[10px] font-bold uppercase tracking-wider">
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
                
                <div className="flex flex-col gap-1">
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
