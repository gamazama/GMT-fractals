
import React, { useEffect, useState, useRef } from 'react';
import { FractalEvents } from '../engine/FractalEvents';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();
import { SpinnerIcon } from './Icons';

export const CompilingIndicator: React.FC = () => {
    const [status, setStatus] = useState<boolean | string>(false);
    const [progress, setProgress] = useState(0);
    const frameRef = useRef(0);
    const startTimeRef = useRef(0);
    const estimateRef = useRef(15000); // Default fallback

    useEffect(() => {
        if (engine.isCompiling) setStatus(true);

        const handler = (val: boolean | string) => {
            setStatus(val);
        };
        const unsub = FractalEvents.on('is_compiling', handler);
        const unsubEstimate = FractalEvents.on('compile_estimate', (ms: number) => {
            estimateRef.current = Math.max(2000, ms); // Floor at 2s
        });
        return () => { unsub(); unsubEstimate(); };
    }, []);

    // Animated progress bar: decelerates over ~15s, snaps to 100% on completion
    useEffect(() => {
        if (status) {
            // Compile started — begin animation
            startTimeRef.current = performance.now();
            setProgress(0);

            const TARGET_DURATION = estimateRef.current;

            const animate = () => {
                const elapsed = performance.now() - startTimeRef.current;
                // Deceleration curve: approaches ~95% asymptotically over TARGET_DURATION
                // Uses 1 - e^(-kt) scaled to cap at ~95%
                const t = elapsed / TARGET_DURATION;
                const p = Math.min(95, 95 * (1 - Math.exp(-3 * t)));
                setProgress(p);
                frameRef.current = requestAnimationFrame(animate);
            };
            frameRef.current = requestAnimationFrame(animate);
        } else if (progress > 0) {
            // Compile finished — snap to 100% then fade out
            cancelAnimationFrame(frameRef.current);
            setProgress(100);
        }

        return () => cancelAnimationFrame(frameRef.current);
    }, [!!status]); // only re-run when status toggles truthy/falsy

    const isVisible = !!status || progress >= 100;
    // Auto-hide after snap to 100%
    const [hiding, setHiding] = useState(false);
    useEffect(() => {
        if (progress >= 100 && !status) {
            const timer = setTimeout(() => setHiding(true), 800);
            const timer2 = setTimeout(() => { setHiding(false); setProgress(0); }, 1400);
            return () => { clearTimeout(timer); clearTimeout(timer2); };
        }
    }, [progress >= 100 && !status]);

    const message = typeof status === 'string' ? status : "Compiling Shader...";
    const isBackgroundCompile = typeof status === 'string' && status.includes('Lighting');
    const showBar = isVisible && !hiding;

    return (
        <div
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none transition-opacity duration-500 ${showBar ? (isBackgroundCompile ? 'opacity-60' : 'opacity-100') : 'opacity-0'}`}
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
