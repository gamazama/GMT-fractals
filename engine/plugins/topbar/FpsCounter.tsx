/**
 * FpsCounter — compact perf readout for the topbar.
 *
 * Click to toggle between two metrics:
 *   - FPS — display refresh rate (RAF cadence), from @engine/viewport's
 *     useViewportFps hook (adaptive-loop sample windows, ~500ms).
 *   - SPS — samples per second: how fast the accumulator is adding
 *     path-traced samples (the rate of change of `accumulationCount`).
 *     Derived here on a fixed 500ms timer so it reads ~0 once the image
 *     converges (the count stops advancing but the timer keeps sampling),
 *     and survives accumulation resets (a reset drops the count → we treat
 *     the post-reset count as samples produced since the reset, never a
 *     negative rate). No coupling to any specific render engine — it reads
 *     whatever `accumulationCount` apps report via reportAccumulation().
 */

import React from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { useViewportFps } from '../Viewport';

type Metric = 'fps' | 'sps';

export const FpsCounter: React.FC = () => {
    const { fpsSmoothed } = useViewportFps();
    const isPaused = useEngineStore((s) => (s as any).isPaused);
    const [metric, setMetric] = React.useState<Metric>('fps');
    const [sps, setSps] = React.useState(0);

    // accumulationCount is reported in ~500ms bursts, so each store update IS
    // one measurement window — read it once per change (no moving average) for
    // the burst's true rate. A free-running timer would drift against the report
    // cadence and need smoothing to hide the beat; this doesn't.
    React.useEffect(() => {
        if (metric !== 'sps') return;
        const read = () => ((useEngineStore.getState() as any).accumulationCount as number) ?? 0;
        let lastCount = read();
        let lastTime = performance.now();
        const unsub = (useEngineStore as any).subscribe(
            (s: any) => s.accumulationCount as number,
            (count: number) => {
                const now = performance.now();
                const dt = (now - lastTime) / 1000;
                if (dt > 0) {
                    // count < lastCount ⇒ a reset happened; treat the current
                    // count as the samples accrued since the reset.
                    const delta = count >= lastCount ? count - lastCount : count;
                    setSps(delta / dt);
                }
                lastCount = count;
                lastTime = now;
            },
        );
        // Converged / idle: the count stops updating, so nothing above fires —
        // decay the readout to 0 once a burst window has passed with no change.
        const idle = window.setInterval(() => {
            if (performance.now() - lastTime > 700) setSps(0);
        }, 500);
        return () => { unsub(); window.clearInterval(idle); };
    }, [metric]);

    const showSps = metric === 'sps';
    const value = showSps ? sps : fpsSmoothed;
    const unit = showSps ? 'SPS' : 'FPS';
    // FPS reads as a whole number; SPS keeps 1 decimal so slow, sub-frame
    // accumulation rates stay legible — dropping the decimal once it's large
    // enough that the fraction is noise (and would cost an extra digit).
    const text = value > 0
        ? `${showSps && value < 100 ? value.toFixed(1) : Math.round(value)} ${unit}`
        : `-- ${unit}`;
    const title = isPaused
        ? 'Rendering Paused'
        : showSps
            ? 'Samples Per Second — accumulation throughput (click for FPS)'
            : 'Frames Per Second — display rate (click for samples/sec)';

    return (
        <span
            onClick={() => setMetric((m) => (m === 'fps' ? 'sps' : 'fps'))}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMetric((m) => (m === 'fps' ? 'sps' : 'fps')); }}
            className={`text-[10px] font-mono w-14 text-right cursor-pointer select-none transition-colors duration-300 hover:text-cyan-300 ${
                isPaused ? 'text-gray-600' : showSps ? 'text-amber-500/80' : 'text-cyan-500/80'
            }`}
            title={title}
        >
            {text}
        </span>
    );
};
