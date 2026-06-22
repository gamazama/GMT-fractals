/**
 * FpsCounter — compact perf readout for the topbar.
 *
 * Click to cycle metrics:
 *   - FPS — the actual rendered-frame rate (worker FRAME_READY cadence), i.e.
 *     how fast the fractal image is really updating. This is the default and
 *     the number that matters while flying. Reads `renderFps`, reported by the
 *     renderer's tick driver. 0 (idle/converged) shows as "--".
 *   - SPS — samples per second: how fast the accumulator is adding path-traced
 *     samples (the rate of change of `accumulationCount`). Derived here on a
 *     fixed 500ms timer so it reads ~0 once the image converges, and survives
 *     accumulation resets (post-reset count treated as samples since the reset).
 *   - UI — main-thread RAF rate (`fpsSmoothed`). Page-refresh cadence, decoupled
 *     from render rate by the frames-in-flight gate (main thread can run 60 while
 *     the worker renders far slower). Debug-only — only in the cycle when
 *     advanced mode is enabled.
 *
 * No coupling to any specific render engine — it reads whatever apps report via
 * reportRenderFps() / reportAccumulation() / reportFps().
 */

import React from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { useViewportFps } from '../Viewport';

type Metric = 'render' | 'sps' | 'ui';

export const FpsCounter: React.FC = () => {
    const { fpsSmoothed, renderFps } = useViewportFps();
    const isPaused = useEngineStore((s) => (s as any).isPaused);
    const advancedMode = useEngineStore((s) => (s as any).advancedMode as boolean);
    const [metric, setMetric] = React.useState<Metric>('render');
    const [sps, setSps] = React.useState(0);

    // Available metrics — 'ui' is debug-only, gated behind advanced mode.
    const metrics: Metric[] = advancedMode ? ['render', 'sps', 'ui'] : ['render', 'sps'];

    // If advanced mode turns off while showing the UI metric, fall back.
    React.useEffect(() => {
        if (!advancedMode && metric === 'ui') setMetric('render');
    }, [advancedMode, metric]);

    const cycle = () => setMetric((m) => {
        const i = metrics.indexOf(m);
        return metrics[(i + 1) % metrics.length];
    });

    // SPS = rate of change of accumulationCount. accumulationCount is reported in
    // ~500ms bursts, so each store update is one measurement.
    React.useEffect(() => {
        if (metric !== 'sps') return;
        const read = () => ((useEngineStore.getState() as any).accumulationCount as number) ?? 0;
        let lastCount = read();
        let lastTime = performance.now();
        let rate = 0; // last measured samples/sec
        const unsub = (useEngineStore as any).subscribe(
            (s: any) => s.accumulationCount as number,
            (count: number) => {
                const now = performance.now();
                const dt = (now - lastTime) / 1000;
                if (dt > 0) {
                    // count < lastCount ⇒ a reset happened; treat the current
                    // count as the samples accrued since the reset.
                    const delta = count >= lastCount ? count - lastCount : count;
                    const inst = delta / dt;
                    // Light smoothing tames the ±500ms report-quantization swing
                    // that dominates at sub-2 SPS, without noticeable lag.
                    rate = rate > 0 ? rate * 0.4 + inst * 0.6 : inst;
                    setSps(rate);
                }
                lastCount = count;
                lastTime = now;
            },
        );
        // Smooth decay instead of a hard timeout: a new sample can't have arrived
        // for longer than `1/elapsed`, so cap the shown rate by that ceiling. A
        // slowing/stopped accumulator glides toward 0 — whereas the old fixed
        // 700ms cutoff wrongly zeroed the readout between samples at 0.5–1 SPS,
        // where the gap between samples exceeds 700ms. For a steady rate the
        // ceiling only meets `rate` right as the next sample is due, so there's
        // no visible dip; it keeps decaying only once accumulation truly stops.
        const tick = window.setInterval(() => {
            const sinceLast = (performance.now() - lastTime) / 1000;
            if (sinceLast <= 0) return;
            const ceiling = 1 / sinceLast;
            if (ceiling < rate) setSps(ceiling < 0.05 ? 0 : ceiling);
        }, 250);
        return () => { unsub(); window.clearInterval(tick); };
    }, [metric]);

    // renderFps < 0 ⇒ this app doesn't report a worker render-rate (e.g.
    // gradient-explorer) — fall back to UI fps so the default readout still works.
    const primaryFps = renderFps >= 0 ? renderFps : fpsSmoothed;
    const value = metric === 'render' ? primaryFps : metric === 'ui' ? fpsSmoothed : sps;
    const unit = metric === 'render' ? 'FPS' : metric === 'ui' ? 'UI' : 'SPS';
    // SPS keeps 1 decimal so slow, sub-frame accumulation rates stay legible
    // (dropping it once large enough that the fraction is noise); FPS/UI read
    // as whole numbers.
    const text = value > 0
        ? `${metric === 'sps' && value < 100 ? value.toFixed(1) : Math.round(value)} ${unit}`
        : `-- ${unit}`;
    const title = isPaused
        ? 'Rendering Paused'
        : metric === 'render'
            ? 'Render rate — actual fractal frames/sec (click to cycle)'
            : metric === 'sps'
                ? 'Samples Per Second — accumulation throughput (click to cycle)'
                : 'UI frame rate — main-thread refresh, debug (click to cycle)';

    const color = isPaused
        ? 'text-fg-faint'
        : metric === 'sps'
            ? 'text-warn/80'
            : metric === 'ui'
                ? 'text-secondary/70'
                : 'text-accent-500/80';

    return (
        <span
            onClick={cycle}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') cycle(); }}
            className={`text-[10px] font-mono w-14 text-right cursor-pointer select-none transition-colors duration-300 hover:text-accent-300 ${color}`}
            title={title}
        >
            {text}
        </span>
    );
};
