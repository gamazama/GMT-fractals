
import React, { useRef, useEffect } from 'react';
import { FractalState, FractalActions } from '../types';
import { useAnimationStore } from '../../store/animationStore';
import { useEngineStore as useFractalStore } from '../../store/engineStore';
// Tutorial hint system isn't ported — the HUD renders without the
// <HintDisplay> overlay. Keep the optional `activeHint` / `onDismissHint`
// props in the type so apps that later bring their own hint widget can
// layer it on from outside (render it themselves alongside the HUD).
type ActiveHint = unknown;

interface HudOverlayProps {
    state: FractalState;
    actions: FractalActions;
    isMobile: boolean;
    activeHint?: ActiveHint | null;
    onDismissHint?: () => void;
    hudRefs: {
        container: React.RefObject<HTMLDivElement>;
        speed: React.RefObject<HTMLSpanElement>;
        dist: React.RefObject<HTMLSpanElement>;
        reset: React.RefObject<HTMLButtonElement>;
        reticle: React.RefObject<HTMLDivElement>;
    };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const HudOverlay: React.FC<HudOverlayProps> = ({ state, actions, isMobile, activeHint: _activeHint, onDismissHint: _onDismissHint, hudRefs }) => {
    const hudSpeedSliderRef = useRef<HTMLDivElement>(null);
    const crosshairFadeTimeout = useRef<number | null>(null);
    const bottomFadeTimeout = useRef<number | null>(null);
    const bottomClusterRef = useRef<HTMLDivElement>(null);

    const tabSwitchCount = state.tabSwitchCount;
    const incrementTabSwitchCount = actions.incrementTabSwitchCount;

    // --- VISIBILITY LOGIC ---
    // Crosshair fades quickly (2s), bottom pill cluster stays longer (10s).
    useEffect(() => {
        const unsub = useAnimationStore.subscribe(
            (s) => s.isCameraInteracting,
            (isInteracting) => {
                const container = hudRefs.container.current;
                const bottom = bottomClusterRef.current;

                if (isInteracting) {
                    // Show both immediately
                    if (container) container.style.opacity = '1';
                    if (bottom) bottom.style.opacity = '1';
                    if (crosshairFadeTimeout.current) { clearTimeout(crosshairFadeTimeout.current); crosshairFadeTimeout.current = null; }
                    if (bottomFadeTimeout.current) { clearTimeout(bottomFadeTimeout.current); bottomFadeTimeout.current = null; }
                } else {
                    // Crosshair: fade after 2s
                    if (crosshairFadeTimeout.current) clearTimeout(crosshairFadeTimeout.current);
                    crosshairFadeTimeout.current = window.setTimeout(() => {
                        if (container) container.style.opacity = '0.3';
                    }, 2000);

                    // Bottom cluster: fade after 10s
                    if (bottomFadeTimeout.current) clearTimeout(bottomFadeTimeout.current);
                    bottomFadeTimeout.current = window.setTimeout(() => {
                        if (bottom) bottom.style.opacity = '0.3';
                    }, 10000);
                }
            }
        );
        return () => {
            unsub();
            if (crosshairFadeTimeout.current) clearTimeout(crosshairFadeTimeout.current);
            if (bottomFadeTimeout.current) clearTimeout(bottomFadeTimeout.current);
        };
    }, []);
    
    // --- TAB HINT LOGIC ---
    useEffect(() => {
        // Subscribe to cameraMode changes to increment hint counter
        const unsub = useFractalStore.subscribe(
            (s) => s.cameraMode,
            () => incrementTabSwitchCount()
        );
        return unsub;
    }, [incrementTabSwitchCount]);

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
        <div className="absolute inset-0 pointer-events-none z-10">
            {/* Crosshair layer — fades quickly (2s) */}
            <div
                ref={hudRefs.container}
                className="absolute inset-0 pointer-events-none transition-opacity duration-500 opacity-30"
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* Center Crosshair */}
                    <div className="absolute pointer-events-none opacity-50" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }}>
                        {state.cameraMode === 'Fly' ? (
                            <>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40px] h-[2px] bg-cyan-400" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[40px] bg-cyan-400" />
                            </>
                        ) : (
                            <div className="relative flex items-center justify-center">
                                {/* Orbit Mode: Smaller Cross + Circle */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20px] h-[2px] bg-cyan-400" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[20px] bg-cyan-400" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24px] h-[24px] rounded-full border border-cyan-400 opacity-60" />
                            </div>
                        )}
                    </div>

                    {/* Inertial Reticle (Managed imperatively by Navigation loop via ref, Fly Mode Only) */}
                    <div
                        ref={hudRefs.reticle}
                        className="absolute top-1/2 left-1/2 w-8 h-8 pointer-events-none opacity-0 transition-opacity duration-150 ease-out will-change-transform"
                        style={{ transform: 'translate(-50%, -50%)' }}
                    >
                        <div className="absolute inset-0 border-2 border-cyan-400 rounded-full shadow-[0_0_15px_cyan] opacity-80"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* Bottom cluster — fades slowly (10s) */}
            <div
                ref={bottomClusterRef}
                className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300 ease-out"
                        style={{ bottom: (state.showHints && !isMobile) ? '4rem' : '3.5rem' }}
                    >
                        {/* Reset Button (Appears based on distance threshold set by physics hook) */}
                        <button
                            ref={hudRefs.reset}
                            data-tut="reset-camera"
                            onClick={() => { actions.resetCamera(); if (navigator.vibrate) navigator.vibrate(30); }}
                            className="pointer-events-auto px-4 py-1.5 bg-black/60 hover:bg-cyan-900/80 text-cyan-400 hover:text-white text-[9px] font-bold rounded-t-lg border-x border-t border-white/10 backdrop-blur-md hidden animate-fade-in shadow-xl mb-[-1px]"
                        >
                            Reset Camera
                        </button>

                        <div className="flex items-stretch gap-px bg-black/40 rounded-full border border-white/10 backdrop-blur-md overflow-hidden pointer-events-auto shadow-2xl">
                            {/* Interactive Speed Component - Hidden in Orbit Mode */}
                            {state.cameraMode === 'Fly' && (
                                <>
                                    <div
                                        ref={hudSpeedSliderRef}
                                        data-tut="speed-slider"
                                        onPointerDown={handleHudSpeedInteraction}
                                        className="relative flex items-center px-6 py-3 cursor-ew-resize group min-w-[120px]"
                                    >
                                        <div
                                            className="absolute inset-0 bg-cyan-500/10 border-r border-cyan-500/20 transition-all duration-300 ease-out"
                                            style={{ width: `${speedProgress * 100}%` }}
                                        />
                                        <span ref={hudRefs.speed} className="relative z-10 font-bold text-cyan-300 font-mono text-[10px] group-hover:text-white transition-colors">
                                            Spd x{flySpeed.toFixed(3)}
                                        </span>
                                    </div>
                                    <div className="w-px bg-white/5" />
                                </>
                            )}

                            {/* Distance Display (Updated by usePhysicsProbe).
                                In orbit mode, hosts a small toggle for
                                cursor-anchored orbit (rotates/zooms around
                                whatever's under the mouse). Default on;
                                falls back to centre-pivot on empty space. */}
                            <div className={`px-6 py-3 bg-white/5 flex items-center gap-2 min-w-[100px] justify-center ${state.cameraMode === 'Orbit' ? 'ring-1 ring-cyan-400/40 rounded-r-full' : ''}`}>
                                <span ref={hudRefs.dist} className="text-cyan-500/80 font-mono text-[10px]">
                                    Dst ---
                                </span>
                                {state.cameraMode === 'Orbit' && (() => {
                                    const on = state.navigation?.orbitCursorAnchor ?? true;
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => actions.setNavigation({ orbitCursorAnchor: !on })}
                                            title={on ? 'Orbit/zoom around cursor (click to centre-pivot)' : 'Orbit/zoom around centre (click to cursor-anchor)'}
                                            aria-label="Toggle cursor-anchored orbit"
                                            className={`pointer-events-auto w-4 h-4 flex items-center justify-center rounded-full border transition-colors ${
                                                on
                                                    ? 'border-cyan-400/70 text-cyan-300 hover:bg-cyan-500/20'
                                                    : 'border-white/20 text-gray-500 hover:text-gray-300 hover:border-white/30'
                                            }`}
                                        >
                                            {/* Crosshair-with-dot glyph. Even size + viewBox so
                                                everything is integer-pixel aligned in the 16 px button.
                                                `display:block` kills inline-svg baseline whitespace
                                                that otherwise nudges it down a fraction of a px. */}
                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" style={{ display: 'block' }}>
                                                <line x1="5" y1="1" x2="5" y2="3" />
                                                <line x1="5" y1="7" x2="5" y2="9" />
                                                <line x1="1" y1="5" x2="3" y2="5" />
                                                <line x1="7" y1="5" x2="9" y2="5" />
                                                <circle cx="5" cy="5" r="0.9" fill="currentColor" stroke="none" />
                                            </svg>
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Tutorial Hints — NOT PORTED yet. Original JSX:
                            <HintDisplay activeHint={activeHint ?? null} cameraMode={state.cameraMode} onDismiss={onDismissHint} />
                            Re-enable when the tutorial feature lands. */}

                        {/* Persistent Mode Switch Hint */}
                        {tabSwitchCount < 2 && !isMobile && state.showHints && (
                             <div className="mt-2 text-[10px] font-bold text-cyan-300 animate-pulse bg-cyan-950/40 px-3 py-1 rounded border border-cyan-500/30 shadow-lg">
                                 Press <span className="text-white border border-white/20 rounded px-1 bg-white/10 mx-0.5">Tab</span> for {state.cameraMode === 'Orbit' ? 'Fly' : 'Orbit'} navigation
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HudOverlay;
