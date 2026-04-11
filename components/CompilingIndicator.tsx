
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { FractalEvents } from '../engine/FractalEvents';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();
import { SpinnerIcon } from './Icons';
import { flushCompileWork, consumeNewCycle } from '../store/fractalStore';

export const CompilingIndicator: React.FC = () => {
    const [status, setStatus] = useState<boolean | string>(false);
    const [progress, setProgress] = useState(0);
    const [hiding, setHiding] = useState(false);

    const statusRef = useRef<boolean | string>(false); // tracks status outside React batching
    const hasFlushedRef = useRef(false);
    const awaitingFlushRef = useRef(false); // true between new cycle reset and flush
    const [cycleGen, setCycleGen] = useState(0); // increments on new cycle only
    const intervalRef = useRef(0);
    const startTimeRef = useRef(0);
    const estimateRef = useRef(15000);
    const hideTimer1 = useRef<ReturnType<typeof setTimeout>>();
    const hideTimer2 = useRef<ReturnType<typeof setTimeout>>();
    const safetyTimer = useRef<ReturnType<typeof setTimeout>>();

    // Plain function — only called inside the useEffect closure, no need for useCallback
    const cancelTimers = () => {
        clearInterval(intervalRef.current);
        clearTimeout(hideTimer1.current);
        clearTimeout(hideTimer2.current);
        clearTimeout(safetyTimer.current);
    };

    useEffect(() => {
        if (engine.isCompiling) setStatus(true);

        const handler = (val: boolean | string) => {
            const wasActive = !!statusRef.current;
            statusRef.current = val;
            setStatus(val);

            if (consumeNewCycle()) {
                // ── NEW CYCLE (user switched formula / loaded scene) ──
                // Reset everything: timers, progress, hiding. This is the
                // definitive "reset the light" — only fires when
                // queueCompileAfterSpinner was called, never on worker updates.
                cancelTimers();
                setHiding(false);
                setProgress(0);
                startTimeRef.current = performance.now();
                hasFlushedRef.current = false;
                awaitingFlushRef.current = true;
                setCycleGen(g => g + 1);

                // Start progress animation
                const TARGET_DURATION = estimateRef.current;
                const id = setInterval(() => {
                    const elapsed = performance.now() - startTimeRef.current;
                    const t = elapsed / TARGET_DURATION;
                    const p = Math.min(95, 95 * (1 - Math.exp(-3 * t)));
                    setProgress(p);
                }, 60);
                intervalRef.current = id as unknown as number;

            } else if (!val && wasActive && !awaitingFlushRef.current) {
                // ── CYCLE FINISHED (worker says done) ──
                // Only run if spinner was actually showing (wasActive).
                // Ignore false when spinner is already hidden — handleConfigChange
                // emits false for every non-rebuild param change.
                clearInterval(intervalRef.current);
                setProgress(100);
                hideTimer1.current = setTimeout(() => setHiding(true), 800);
                hideTimer2.current = setTimeout(() => {
                    setHiding(false);
                    setProgress(0);
                }, 1400);
            }
            // Worker status text updates ("Compiling Shader..." → "Compiling Lighting...")
            // just update the text via setStatus above. No reset, no flush.
        };

        const unsub = FractalEvents.on('is_compiling', handler);
        const unsubEstimate = FractalEvents.on('compile_estimate', (ms: number) => {
            estimateRef.current = Math.max(2000, ms);
        });
        return () => { unsub(); unsubEstimate(); cancelTimers(); };
    }, []);

    // ── PING: ref callback fires when the spinner DOM is on screen ──
    // hasFlushedRef ensures we only flush ONCE per cycle.
    // cycleGen changes only on new user-initiated cycles (not worker text updates),
    // so the ref callback is only re-created when a flush is actually needed.
    const pingRef = useCallback((node: HTMLDivElement | null) => {
        if (node && !hasFlushedRef.current) {
            hasFlushedRef.current = true;
            awaitingFlushRef.current = false;
            clearTimeout(safetyTimer.current);
            requestAnimationFrame(() => {
                setTimeout(() => flushCompileWork(), 0);
            });
            safetyTimer.current = setTimeout(() => flushCompileWork(), 300);
        }
    }, [cycleGen]);

    const isVisible = !!status || progress >= 100;
    const showBar = isVisible && !hiding;

    if (!showBar) return null;

    const message = typeof status === 'string' ? status : "Compiling Shader...";
    const isBackgroundCompile = typeof status === 'string' && status.includes('Lighting');

    return (
        <div
            ref={pingRef}
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none ${isBackgroundCompile ? 'opacity-60' : 'opacity-100'}`}
        >
            <div className="bg-black/80 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full flex flex-col items-center gap-1.5 shadow-lg min-w-[200px]">
                <div className="flex items-center gap-2">
                    <SpinnerIcon className={`animate-spin h-3 w-3 ${isBackgroundCompile ? 'text-amber-400' : 'text-cyan-400'}`} />
                    <span className={`text-[9px] font-bold ${isBackgroundCompile ? 'text-amber-200' : 'text-cyan-200'}`}>
                        {message}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500">{Math.floor(progress)}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-[width] duration-150 ease-linear ${
                            progress >= 100
                                ? 'bg-green-400'
                                : isBackgroundCompile ? 'bg-amber-400/60' : 'bg-cyan-400/60'
                        }`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};
