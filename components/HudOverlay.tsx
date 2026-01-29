
import React, { useRef, useEffect } from 'react';
import { FractalState, FractalActions } from '../types';
import { useAnimationStore } from '../store/animationStore';

interface HudOverlayProps {
    state: FractalState;
    actions: FractalActions;
    isMobile: boolean;
    hudRefs: {
        container: React.RefObject<HTMLDivElement | null>;
        speed: React.RefObject<HTMLSpanElement | null>;
        dist: React.RefObject<HTMLSpanElement | null>;
        reset: React.RefObject<HTMLButtonElement | null>;
        reticle: React.RefObject<HTMLDivElement | null>;
    };
}

const HudOverlay: React.FC<HudOverlayProps> = ({ state, actions, isMobile, hudRefs }) => {
    const hudSpeedSliderRef = useRef<HTMLDivElement>(null);
    const fadeTimeout = useRef<number | null>(null);

    // --- VISIBILITY LOGIC ---
    // Subscribe to AnimationStore for camera activity.
    // This decouples the visual HUD from the Logic/Controller layer (Navigation).
    useEffect(() => {
        // We use subscribe to avoid re-rendering this entire component 
        // when the boolean changes. We manipulate the DOM ref directly.
        const unsub = useAnimationStore.subscribe(
            (s) => s.isCameraInteracting,
            (isInteracting) => {
                if (hudRefs.container.current) {
                    if (isInteracting) {
                        // Show immediately
                        hudRefs.container.current.style.opacity = '1';
                        if (fadeTimeout.current) {
                            clearTimeout(fadeTimeout.current);
                            fadeTimeout.current = null;
                        }
                    } else {
                        // Delay hide
                        if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
                        fadeTimeout.current = window.setTimeout(() => {
                            if (hudRefs.container.current) {
                                hudRefs.container.current.style.opacity = '0';
                            }
                        }, 2000);
                    }
                }
            }
        );
        return () => {
            unsub();
            if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
        };
    }, []);

    const handleHudSpeedInteraction = (e: React.PointerEvent) => {
        if (!hudSpeedSliderRef.current || state.cameraMode === 'Orbit') return;
        const rect = hudSpeedSliderRef.current.getBoundingClientRect();
        
        const update = (clientX: number) => {
            const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            // Log Scale: 0 -> 0.001 (10^-3), 1 -> 1.0 (10^0)
            const newSpeed = Math.pow(10, (x * 3) - 3);
            actions.setNavigation({ flySpeed: newSpeed });

            // Haptic tick at limits
            if ((x === 0 || x === 1) && navigator.vibrate) navigator.vibrate(5);
        };

        update(e.clientX);
        
        const move = (ev: PointerEvent) => update(ev.clientX);
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    const flySpeed = state.navigation?.flySpeed ?? 0.5;

    // Convert current speed to visual progress (0-1) for the background slider
    const speedProgress = (Math.log10(flySpeed) + 3) / 3;

    return (
        <div 
            ref={hudRefs.container} 
            className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-500 opacity-0"
        >
            <div className="absolute inset-0 flex items-center justify-center">
                
                {/* Center Crosshair */}
                <div className="absolute pointer-events-none opacity-20">
                    {state.cameraMode === 'Fly' ? (
                        <>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40px] h-[1px] bg-cyan-400" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-[40px] bg-cyan-400" />
                        </>
                    ) : (
                        <div className="relative flex items-center justify-center">
                            {/* Orbit Mode: Smaller Cross + Circle */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20px] h-[1px] bg-cyan-400" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-[20px] bg-cyan-400" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24px] h-[24px] rounded-full border border-cyan-400 opacity-60" />
                        </div>
                    )}
                </div>

                {/* Inertial Reticle (Managed imperatively by Navigation loop via ref, Fly Mode Only) */}
                <div 
                    ref={hudRefs.reticle} 
                    className="absolute w-8 h-8 pointer-events-none opacity-0 transition-opacity duration-150 ease-out will-change-transform"
                >
                    <div className="absolute inset-0 border-2 border-cyan-400 rounded-full shadow-[0_0_15px_cyan] opacity-80"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"></div>
                </div>

                {/* HUD Pill Cluster */}
                <div 
                    className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300 ease-out"
                    style={{ bottom: (state.showHints && !isMobile) ? '4rem' : '3.5rem' }}
                >
                    {/* Reset Button (Appears based on distance threshold set by physics hook) */}
                    <button 
                        ref={hudRefs.reset}
                        onClick={() => { actions.resetCamera(); if (navigator.vibrate) navigator.vibrate(30); }}
                        className="pointer-events-auto px-4 py-1.5 bg-black/60 hover:bg-cyan-900/80 text-cyan-400 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-t-lg border-x border-t border-white/10 backdrop-blur-md hidden animate-fade-in shadow-xl mb-[-1px]"
                    >
                        Reset Camera
                    </button>
                    
                    <div className="flex items-stretch gap-px bg-black/40 rounded-full border border-white/10 backdrop-blur-md overflow-hidden pointer-events-auto shadow-2xl">
                        {/* Interactive Speed Component - Hidden in Orbit Mode */}
                        {state.cameraMode === 'Fly' && (
                            <>
                                <div 
                                    ref={hudSpeedSliderRef}
                                    onPointerDown={handleHudSpeedInteraction}
                                    className="relative flex items-center px-6 py-3 cursor-ew-resize group min-w-[120px]"
                                >
                                    <div 
                                        className="absolute inset-0 bg-cyan-500/10 border-r border-cyan-500/20 transition-all duration-300 ease-out"
                                        style={{ width: `${speedProgress * 100}%` }}
                                    />
                                    <span ref={hudRefs.speed} className="relative z-10 font-bold text-cyan-300 font-mono text-[10px] tracking-widest uppercase group-hover:text-white transition-colors">
                                        SPD x{flySpeed.toFixed(3)}
                                    </span>
                                </div>
                                <div className="w-px bg-white/5" />
                            </>
                        )}

                        {/* Distance Display (Updated by usePhysicsProbe) */}
                        <div className="px-6 py-3 bg-white/5 flex items-center min-w-[100px] justify-center">
                            <span ref={hudRefs.dist} className="text-cyan-500/80 font-mono text-[10px] tracking-widest uppercase">
                                DST ---
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HudOverlay;
