
import React, { useRef, useEffect } from 'react';
import { FractalState, FractalActions } from '../types';
import { useEngineStore as useFractalStore } from '../../store/engineStore';
import { useTutorAnchor, mergeRefs, actionBus } from '../../engine/plugins/Tutorial';
import { INTERACTION_SOURCES } from '../interaction/interactionSources';
// Tutorial hint system isn't ported — the HUD renders without the
// <HintDisplay> overlay. Keep the optional `activeHint` / `onDismissHint`
// props in the type so apps that later bring their own hint widget can
// layer it on from outside (render it themselves alongside the HUD).
type ActiveHint = unknown;

interface HudOverlayProps {
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
    /** Which slice of the HUD to render. 'top' = crosshair + reticle
     *  (canvas-relative, tied to view direction). 'bottom' = nav pill
     *  cluster + tab hint (viewport-area-relative — anchor outside the
     *  scaled canvas in Fixed mode). 'all' = both, default. App splits
     *  the two so the bottom cluster doesn't shrink with the canvas. */
    region?: 'top' | 'bottom' | 'all';
}

// Self-subscribed to the store: previously took `state` / `actions` props
// from a full-state subscription in AppGmt, which forced the parent to
// re-render on every store change. By selecting only the fields used here
// we limit re-renders to actual visible changes (camera mode, tab count,
// fly speed, etc.) and leave the parent free to narrow its own subscription.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const HudOverlay: React.FC<HudOverlayProps> = ({ isMobile, activeHint: _activeHint, onDismissHint: _onDismissHint, hudRefs, region = 'all' }) => {
    // Individual selectors — Zustand returns the same primitive/reference
    // on subsequent reads when unchanged, so re-renders only fire on
    // actual changes to these specific fields.
    const tabSwitchCount = useFractalStore((s) => (s as any).tabSwitchCount);
    const cameraMode = useFractalStore((s) => (s as any).cameraMode);
    const navigation = useFractalStore((s) => (s as any).navigation);
    const showHints = useFractalStore((s) => (s as any).showHints);
    const incrementTabSwitchCount = useFractalStore((s) => (s as any).incrementTabSwitchCount);
    const setNavigation = useFractalStore((s) => (s as any).setNavigation);
    const resetCamera = useFractalStore((s) => (s as any).resetCamera);
    const stepBackCamera = useFractalStore((s) => (s as any).stepBackCamera);
    const cameraRecoveryMode = useFractalStore((s) => (s as any).cameraRecoveryMode ?? 'reset');
    const undoCamera = useFractalStore((s) => (s as any).undoCamera);
    const canUndoCamera = useFractalStore((s) => (s as any).canUndo?.('camera') ?? false);
    const state = { tabSwitchCount, cameraMode, navigation, showHints } as unknown as FractalState;
    const actions = { incrementTabSwitchCount, setNavigation, resetCamera } as unknown as FractalActions;
    const hudSpeedSliderRef = useRef<HTMLDivElement>(null);
    const speedSliderAnchorRef = useTutorAnchor('speed-slider');
    const resetCameraAnchorRef = useTutorAnchor('reset-camera');
    const crosshairFadeTimeout = useRef<number | null>(null);
    const bottomFadeTimeout = useRef<number | null>(null);
    const bottomClusterRef = useRef<HTMLDivElement>(null);

    // --- VISIBILITY LOGIC ---
    // Crosshair fades quickly (2s), bottom pill cluster stays longer (10s).
    useEffect(() => {
        const showNow = () => {
            const container = hudRefs.container.current;
            const bottom = bottomClusterRef.current;
            if (container) container.style.opacity = '1';
            if (bottom) bottom.style.opacity = '1';
            if (crosshairFadeTimeout.current) { clearTimeout(crosshairFadeTimeout.current); crosshairFadeTimeout.current = null; }
            if (bottomFadeTimeout.current) { clearTimeout(bottomFadeTimeout.current); bottomFadeTimeout.current = null; }
        };
        const scheduleFade = () => {
            const container = hudRefs.container.current;
            const bottom = bottomClusterRef.current;
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
        };

        // ADR-0061 — fade on the InteractionSession (camera + scrub via the
        // source filter, reproducing the old camera-only fade + adding scrub)
        // instead of the camera-only animationStore flag. Subscribe to the coarse
        // edge boolean; on a rising edge show ONLY if a camera/scrub gesture is
        // the cause (filtered poll); on the falling edge (all hard sources
        // released) start the fade countdown unconditionally — the 200ms session
        // tail is negligible vs the 2s/10s fade, and polling the filtered value
        // at the falling edge would read tail-true and wrongly cancel the fade.
        // (Trade-off: a camera gesture that begins while a non-camera gesture
        // already holds the coarse boolean true won't re-show — rare; cosmetic.)
        const unsub = useFractalStore.subscribe(
            (s) => s.interacting,
            (interacting) => {
                if (interacting) {
                    if (useFractalStore.getState().isInteracting({ only: [INTERACTION_SOURCES.camera, INTERACTION_SOURCES.scrub] })) showNow();
                } else {
                    scheduleFade();
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

    const showTop = region === 'top' || region === 'all';
    const showBottom = region === 'bottom' || region === 'all';
    // Recovery-prompt button morph: at the formula default a Reset is a no-op,
    // so the same button offers a one-unit dolly-back instead (see usePhysicsProbe).
    const isStepBack = cameraRecoveryMode === 'stepback';

    return (
        <div className="absolute inset-0 pointer-events-none z-10">
            {/* Crosshair layer — fades quickly (2s) */}
            {showTop && (
            <div
                ref={hudRefs.container}
                className="absolute inset-0 pointer-events-none transition-opacity duration-500 opacity-30"
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* Center Crosshair */}
                    <div className="absolute pointer-events-none opacity-50" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }}>
                        {state.cameraMode === 'Fly' ? (
                            <>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40px] h-[2px] bg-accent-400" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[40px] bg-accent-400" />
                            </>
                        ) : (
                            <div className="relative flex items-center justify-center">
                                {/* Orbit Mode: Smaller Cross + Circle */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20px] h-[2px] bg-accent-400" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[20px] bg-accent-400" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24px] h-[24px] rounded-full border border-accent-400 opacity-60" />
                            </div>
                        )}
                    </div>

                    {/* Inertial Reticle (Managed imperatively by Navigation loop via ref, Fly Mode Only) */}
                    <div
                        ref={hudRefs.reticle}
                        className="absolute top-1/2 left-1/2 w-8 h-8 pointer-events-none opacity-0 transition-opacity duration-150 ease-out will-change-transform"
                        style={{ transform: 'translate(-50%, -50%)' }}
                    >
                        <div className="absolute inset-0 border-2 border-accent-400 rounded-full shadow-[0_0_15px_rgb(var(--accent-glow))] opacity-80"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-fg rounded-full"></div>
                    </div>
                </div>
            </div>
            )}

            {/* Bottom cluster — fades slowly (10s) */}
            {showBottom && (
            <div
                ref={bottomClusterRef}
                className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300 ease-out"
                        style={{ bottom: (state.showHints && !isMobile) ? '4rem' : '3.5rem' }}
                    >
                        {/* Recovery tabs (appear based on distance threshold set by the
                            physics hook). The Undo button is the reset button's sibling and
                            shares its show/hide — see usePhysicsProbe.updateResetButton.
                            Inset by ~the pill's corner radius so the square bottom corners
                            land on the pill's flat top edge, not over its rounded-full
                            corners; the 1px overlap merges the borders. */}
                        <div className="flex items-end gap-px mb-[-1px] self-stretch mx-5">
                            {/* Reset / Step Back. Visibility is driven imperatively
                                by usePhysicsProbe (inline display, off React's render
                                path); only the label + action morph here. When the
                                camera is already at the formula default a Reset is a
                                no-op, so the prompt offers a one-unit dolly-back to
                                escape a buried / void view instead. */}
                            <button
                                ref={mergeRefs(hudRefs.reset, resetCameraAnchorRef)}
                                onClick={() => {
                                    if (isStepBack) { stepBackCamera?.(); actionBus.fire('camera.stepBack'); }
                                    else { actions.resetCamera(); actionBus.fire('camera.reset'); }
                                    if (navigator.vibrate) navigator.vibrate(30);
                                }}
                                title={isStepBack ? 'Step the camera back one unit (already at default view)' : 'Reset camera to default view'}
                                className="flex-1 pointer-events-auto px-2 py-1.5 bg-surface/80 hover:bg-accent-900/80 text-accent-400 hover:text-fg text-[9px] font-bold rounded-tl-lg border-l border-t border-line/10 backdrop-blur-md hidden animate-fade-in shadow-xl whitespace-nowrap"
                            >
                                {isStepBack ? 'Step Back' : 'Reset'}
                            </button>
                            <button
                                data-hud-undo-camera
                                onClick={() => { undoCamera?.(); actionBus.fire('camera.undo'); if (navigator.vibrate) navigator.vibrate(30); }}
                                disabled={!canUndoCamera}
                                title="Revert the last camera movement (Ctrl+Shift+Z)"
                                className="flex-1 pointer-events-auto px-2 py-1.5 bg-surface/80 hover:bg-accent-900/80 text-accent-400 hover:text-fg text-[9px] font-bold rounded-tr-lg border-r border-t border-line/10 backdrop-blur-md hidden animate-fade-in shadow-xl whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface/80 disabled:hover:text-accent-400"
                            >
                                Undo Cam
                            </button>
                        </div>

                        <div className="flex items-stretch gap-px bg-surface-tabbar rounded-full border border-line/10 backdrop-blur-md overflow-hidden pointer-events-auto shadow-2xl">
                            {/* Interactive Speed Component - Hidden in Orbit Mode */}
                            {state.cameraMode === 'Fly' && (
                                <>
                                    <div
                                        ref={mergeRefs(hudSpeedSliderRef, speedSliderAnchorRef)}
                                        onPointerDown={handleHudSpeedInteraction}
                                        className="relative flex items-center px-6 py-3 cursor-ew-resize group min-w-[120px]"
                                    >
                                        <div
                                            className="absolute inset-0 bg-accent-500/10 border-r border-accent-500/20 transition-all duration-300 ease-out"
                                            style={{ width: `${speedProgress * 100}%` }}
                                        />
                                        <span ref={hudRefs.speed} className="relative z-10 font-bold text-accent-300 font-mono text-[10px] group-hover:text-fg transition-colors">
                                            Spd x{flySpeed.toFixed(3)}
                                        </span>
                                    </div>
                                    <div className="w-px bg-line/5" />
                                </>
                            )}

                            {/* Distance Display (Updated by usePhysicsProbe).
                                In orbit mode, hosts a small toggle for
                                cursor-anchored orbit (rotates/zooms around
                                whatever's under the mouse). Default on;
                                falls back to centre-pivot on empty space. */}
                            <div className={`px-6 py-3 bg-line/5 flex items-center gap-2 min-w-[100px] justify-center ${state.cameraMode === 'Orbit' ? 'ring-1 ring-accent-400/40 rounded-r-full' : ''}`}>
                                <span ref={hudRefs.dist} className="text-accent-500/80 font-mono text-[10px]">
                                    Dst ---
                                </span>
                                {state.cameraMode === 'Orbit' && !isMobile && (() => {
                                    const on = state.navigation?.orbitCursorAnchor ?? true;
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => actions.setNavigation({ orbitCursorAnchor: !on })}
                                            title={on ? 'Orbit/zoom around cursor (click to centre-pivot)' : 'Orbit/zoom around centre (click to cursor-anchor)'}
                                            aria-label="Toggle cursor-anchored orbit"
                                            className={`pointer-events-auto w-4 h-4 flex items-center justify-center rounded-full border transition-colors ${
                                                on
                                                    ? 'border-accent-400/70 text-accent-300 hover:bg-accent-500/20'
                                                    : 'border-line/20 text-fg-dim hover:text-fg-tertiary hover:border-line/30'
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

                        {/* Static navigation hint — ported from stable's <HintDisplay>
                            fallback (the no-active-contextual-hint branch). Restores the
                            essential "how to move the camera" guidance for new users that
                            was lost when the HUD was ported. The full contextual hint-
                            rotation system (useTutorialHints, ~30 hints) is still NOT
                            ported — re-enable <HintDisplay> here when it lands. Gated on
                            showHints + desktop; fades with the bottom cluster (10s). */}
                        {state.showHints && !isMobile && (
                            <div className="mt-2 text-[9px] font-medium text-fg/60 text-center whitespace-nowrap" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                                <span className="text-accent-400/60 font-bold mr-2">[{state.cameraMode}]</span>
                                {state.cameraMode === 'Fly'
                                    ? 'WASD Move · Space/C Vert · Shift Boost'
                                    : 'L-Drag Rotate · R-Drag Pan · Scroll Zoom'}
                            </div>
                        )}

                        {/* Persistent Mode Switch Hint */}
                        {tabSwitchCount < 2 && !isMobile && state.showHints && (
                             <div className="mt-2 text-[10px] font-bold text-accent-300 animate-pulse bg-cyan-950/40 px-3 py-1 rounded border border-accent-500/30 shadow-lg">
                                 Press <span className="text-fg border border-line/20 rounded px-1 bg-line/10 mx-0.5">Tab</span> for {state.cameraMode === 'Orbit' ? 'Fly' : 'Orbit'} navigation
                             </div>
                        )}
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};

export default HudOverlay;
