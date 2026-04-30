
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { SpinnerIcon } from './Icons';
import { compileGate } from '../store/CompileGate';
import { useCompileProgress, selectProgress } from '../store/CompileProgressStore';

/**
 * CompilingIndicator — toast at top-center showing compile progress.
 *
 * Reads phase/message/cycleId from the unified CompileProgressStore.
 * Drives the visible progress bar via an rAF loop polling the same
 * store's `selectProgress(state, now)`. The bar uses `transform: scaleX`
 * so it keeps animating during heavy worker compiles that stall main-
 * thread paint (notably Firefox single-stage compile).
 *
 * Lifecycle responsibilities still owned here:
 *   - Hold visible for 800ms after `done`, then fade out (UX polish)
 *   - Call `compileGate.flush()` once the spinner DOM has painted, so
 *     the GPU-blocking work runs only after the user sees the spinner
 */
export const CompilingIndicator: React.FC = () => {
    const phase = useCompileProgress(s => s.phase);
    const message = useCompileProgress(s => s.message);
    const cycleId = useCompileProgress(s => s.cycleId);

    // Local UI state — purely view-side.
    const [progress, setProgress] = useState(0);
    const [hiding, setHiding] = useState(false);
    const flushedForCycleRef = useRef(0); // last cycleId we called flush() for
    const hideTimer1 = useRef<ReturnType<typeof setTimeout>>();
    const hideTimer2 = useRef<ReturnType<typeof setTimeout>>();

    // Reset hiding/progress when a new cycle starts.
    useEffect(() => {
        if (phase === 'compiling') {
            setHiding(false);
            setProgress(0);
        }
    }, [cycleId, phase]);

    // rAF progress loop. Re-arms on cycleId change so it survives
    // StrictMode dev's mount → cleanup → remount.
    useEffect(() => {
        if (phase !== 'compiling') return;
        let cancelled = false;
        const tick = () => {
            if (cancelled) return;
            const p = selectProgress(useCompileProgress.getState(), performance.now());
            setProgress(p);
            if (p < 95) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        return () => { cancelled = true; };
    }, [cycleId, phase]);

    // Done → snap to 100, schedule fade-out, then reset the store.
    useEffect(() => {
        if (phase !== 'done') return;
        setProgress(100);
        clearTimeout(hideTimer1.current);
        clearTimeout(hideTimer2.current);
        hideTimer1.current = setTimeout(() => setHiding(true), 800);
        hideTimer2.current = setTimeout(() => {
            setHiding(false);
            setProgress(0);
            useCompileProgress.getState().reset();
        }, 1400);
        return () => {
            clearTimeout(hideTimer1.current);
            clearTimeout(hideTimer2.current);
        };
    }, [phase]);

    // pingRef: fires when spinner DOM is committed. After paint we flush
    // the queued GPU-blocking work. Keyed on cycleId so each cycle gets
    // exactly one flush.
    const pingRef = useCallback((node: HTMLDivElement | null) => {
        if (node && flushedForCycleRef.current !== cycleId && cycleId > 0) {
            flushedForCycleRef.current = cycleId;
            requestAnimationFrame(() => {
                setTimeout(() => compileGate.flush(), 0);
            });
        }
    }, [cycleId]);

    const isVisible = phase === 'compiling' || phase === 'done';
    const showBar = isVisible && !hiding;
    if (!showBar) return null;

    const displayMessage = message || 'Compiling Shader…';
    const isBackgroundCompile = displayMessage.includes('Lighting');

    return (
        <div
            ref={pingRef}
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none ${isBackgroundCompile ? 'opacity-60' : 'opacity-100'}`}
        >
            <div className="bg-black/80 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full flex flex-col items-center gap-1.5 shadow-lg min-w-[200px]">
                <div className="flex items-center gap-2">
                    <SpinnerIcon className={`animate-spin h-3 w-3 ${isBackgroundCompile ? 'text-amber-400' : 'text-cyan-400'}`} />
                    <span className={`text-[9px] font-bold ${isBackgroundCompile ? 'text-amber-200' : 'text-cyan-200'}`}>
                        {displayMessage}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500">{Math.floor(progress)}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    {/* transform: scaleX runs on the compositor thread, so the
                        bar keeps animating even when the worker's synchronous
                        WebGL compile stalls main-thread paint on Firefox /
                        Chrome with heavy presets. transition-[width] does not
                        — width changes hit layout on the render thread. */}
                    <div
                        className={`h-full w-full rounded-full origin-left transition-transform duration-150 ease-linear ${
                            progress >= 100
                                ? 'bg-green-400'
                                : isBackgroundCompile ? 'bg-amber-400/60' : 'bg-cyan-400/60'
                        }`}
                        style={{ transform: `scaleX(${Math.max(0, Math.min(1, progress / 100))})`, willChange: 'transform' }}
                    />
                </div>
            </div>
        </div>
    );
};
