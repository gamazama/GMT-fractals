
import React, { useRef, useState, useEffect } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { engine } from '../engine/FractalEngine';
import { AlertIcon, CloseIcon, CheckIcon } from './Icons';
import { collectHelpIds } from '../utils/helpUtils';

export const PerformanceMonitor = () => {
    // Logic Refs
    const lowFpsBuffer = useRef(0);
    const lastTimeRef = useRef(performance.now());
    const lastFrameCountRef = useRef(0);
    
    const { resolutionMode, setResolutionMode, setFixedResolution, fixedResolution, isExporting, isBroadcastMode, openContextMenu } = useFractalStore();
    const [showWarning, setShowWarning] = useState(false);
    const [currentFps, setCurrentFps] = useState(60);
    
    const handleContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openContextMenu(e.clientX, e.clientY, [], ids);
        }
    };
    
    useEffect(() => {
        // Reset buffers
        lowFpsBuffer.current = 0;
        lastTimeRef.current = performance.now();
        // Ensure engine pipeline exists before reading
        lastFrameCountRef.current = engine.pipeline ? engine.pipeline.frameCount : 0;

        const loop = () => {
            const now = performance.now();
            const delta = now - lastTimeRef.current;
            
            // Poll every 500ms
            if (delta >= 500) {
                // Determine Frames Rendered
                const currentTotal = engine.pipeline ? engine.pipeline.frameCount : 0;
                const framesRendered = currentTotal - lastFrameCountRef.current;
                
                // Calculate FPS
                // (frames / deltaMs) * 1000 = framesPerSec
                const fps = (framesRendered / delta) * 1000;
                
                // Update Refs
                lastTimeRef.current = now;
                lastFrameCountRef.current = currentTotal;

                // --- Logic Gate ---
                
                // 1. Ignore if not actively rendering (e.g. compiling, exporting, or paused)
                // We use engine.isCompiling status and a sanity check on frames
                if (isExporting || isBroadcastMode || engine.isCompiling) {
                    lowFpsBuffer.current = 0; // Reset buffer to prevent accumulated error
                } 
                // 2. Ignore first 12 seconds (Startup)
                else if (now < 12000) { 
                    lowFpsBuffer.current = 0;
                }
                // 3. Tab Inactive / Hidden
                else if (document.hidden) {
                    lowFpsBuffer.current = 0;
                }
                else {
                    setCurrentFps(fps);

                    if (fps < 24) {
                        // FPS is Low -> Increment Penalty
                        lowFpsBuffer.current += (fps < 10 ? 2 : 1);
                    } else if (fps > 40) {
                        // FPS is Good -> Recover
                        lowFpsBuffer.current = Math.max(0, lowFpsBuffer.current - 2);
                        
                        // Auto-dismiss if performance has recovered
                        setShowWarning(false);
                    }

                    // Trigger Warning Threshold (approx 2.5s of bad performance)
                    if (lowFpsBuffer.current >= 5) {
                        setShowWarning(true);
                    }
                }
            }
            
            // Keep polling
            requestAnimationFrame(loop);
        };

        const rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [isExporting, isBroadcastMode]);

    if (isBroadcastMode || !showWarning) return null;
    
    // Determine if we can reduce resolution further (Min width 320px)
    let currentW = window.innerWidth;
    if (resolutionMode === 'Fixed') {
        currentW = fixedResolution[0];
    }
    
    const canReduce = currentW > 320;

    const handleReduce = () => {
        let w, h;
        if (resolutionMode === 'Full') {
             w = window.innerWidth;
             h = window.innerHeight;
        } else {
             w = fixedResolution[0];
             h = fixedResolution[1];
        }

        // Reduce by 25% (multiply by 0.75), snap to multiple of 8
        const newW = Math.max(320, Math.round((w * 0.75) / 8) * 8);
        const newH = Math.max(240, Math.round((h * 0.75) / 8) * 8);

        setResolutionMode('Fixed');
        setFixedResolution(newW, newH);
        
        // Hide warning temporarily to allow FPS to recover
        setShowWarning(false);
        lowFpsBuffer.current = -20; // Grace period
    };

    return (
        <div 
            className="fixed top-[70px] left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto animate-fade-in-down"
            data-help-id="ui.performance"
            onContextMenu={handleContextMenu}
        >
            <div className="flex items-center gap-3 px-3 py-1.5 bg-red-950/90 border border-red-500/30 rounded-full shadow-lg backdrop-blur-md">
                
                <div className="flex items-center gap-2 text-red-200 text-[10px] font-bold uppercase tracking-wider">
                    <AlertIcon />
                    <span className="whitespace-nowrap">Low FPS ({Math.round(currentFps)})</span>
                </div>

                {canReduce && (
                    <>
                        <div className="h-3 w-px bg-white/10" />
                        <button 
                            onClick={handleReduce}
                            className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded transition-colors uppercase tracking-wide"
                            title="Reduce Resolution by 25%"
                        >
                            <CheckIcon />
                            <span>Reduce</span>
                        </button>
                    </>
                )}
                
                <button 
                    onClick={() => {
                        setShowWarning(false);
                        lowFpsBuffer.current = -40; // Long grace period
                    }}
                    className="text-red-400 hover:text-white transition-colors"
                    title="Dismiss"
                >
                    <CloseIcon />
                </button>
            </div>
        </div>
    );
};
