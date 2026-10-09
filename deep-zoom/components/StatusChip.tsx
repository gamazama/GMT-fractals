/**
 * deep-zoom/components/StatusChip.tsx — the renderer's state in the top bar, centre slot.
 *
 * Registered, never mounted by hand: `topbar.register({ id: 'deep-zoom.status', slot: 'center',
 * order: 0, component: StatusChip })` in deep-zoom/main.tsx.
 *
 * Stage 1 shows two things, and only while a host is drawing (`live`):
 *   - the engine badge: `perturbation`, or `f32` for the seconds the deep shader takes to compile;
 *   - beside it, for the 20 or so seconds the ray march's shader takes to build, `ray march: building`
 *     (the owner, 2026-10-09: "the 20s switch on is fine except it needs some indication") - the
 *     picture is the page's march until it goes; and `ray march failed` if it could not be built;
 *   - the depth, compact: `6.40e-53`. Depth is the camera's distance to the surface.
 * It keeps the depth on screen whichever dock tab is open and when the picture's own overlays are
 * hidden. Package S2-5 extends it (state, live iterations, drawn size, still progress) and moves
 * `formatDepth` to `components/depthFormat.ts`, which is S2-5's file.
 *
 * Reads the telemetry store beside the host (8 writes a second), never the engine store. Each
 * `useDzTelemetry` call selects ONE primitive; the depth is selected already formatted, so the
 * chip re-renders when the text changes, not on every sample.
 */

import React from 'react';
import { useDzTelemetry } from '../host/telemetry';
import { useHost } from '../host/current';
import { formatDepth } from './depthFormat';

/**
 * A depth as mantissa with two decimals and a bare exponent: `6.4e-53` gives `6.40e-53`, `1.5`
 * gives `1.50e0`. The shape the stage smokes match with `/^\d\.\d\de-?\d+$/`.
 * S2-5 moves this to `components/depthFormat.ts`; keep the two outputs above when it does.
 */

const RAY_BUILDING_TITLE = 'The ray march\'s shader is being built, about 20 seconds the first time. The picture is drawn with the older march until it is ready, then changes by itself.';
const RAY_FAILED_TITLE = 'The ray march\'s shader could not be built on this machine. The older march is drawn instead; Step size applies again.';
const ENGINE_TITLE = 'Perturbation with a 256-bit reference, at every depth. "f32" shows only for the seconds that renderer takes to start.';

export const StatusChip: React.FC = () => {
    const live = useDzTelemetry((t) => t.live);
    const mode = useDzTelemetry((t) => t.mode);
    const depth = useDzTelemetry((t) => formatDepth(t.depth));
    const iters = useDzTelemetry((t) => t.iters);
    // The ray march's shader: the host's `compile` event with what 'variant' (it is not telemetry - the module's
    // sample keeps the frozen page's keys). It starts to build seconds after the host mounts, so nothing is missed.
    const host = useHost();
    const [ray, setRay] = React.useState<'compiling' | 'ready' | 'failed'>('ready');
    React.useEffect(() => {
        setRay('ready');
        if (!host) return undefined;
        return host.on('compile', (e) => { if (e.what === 'variant') setRay(e.state); });
    }, [host]);
    const size = useDzTelemetry((t) => `${t.frameW} x ${t.frameH}`);
    // The still's progress, in deep mode only (the f32 picture, shown while the deep shader compiles, does not accumulate).
    const still = useDzTelemetry((t) => (t.mode === 'deep' && t.accumMax > 0 ? `${t.accumN}/${t.accumMax}` : ''));

    // Before the first sample, and after a host is disposed, the store holds placeholders.
    if (!live) return null;

    return (
        <div data-dz-status className="flex items-center gap-2 text-[10px] font-mono select-none">
            <span
                data-dz-status-mode
                title={ENGINE_TITLE}
                className="px-1.5 py-0.5 rounded border border-line/15 text-fg-tertiary"
            >
                {mode === 'deep' ? 'perturbation' : 'f32'}
            </span>
            {ray === 'compiling' && (
                <span data-dz-status-ray="building" title={RAY_BUILDING_TITLE} className="px-1.5 py-0.5 rounded border border-line/15 text-fg-secondary">
                    ray march: building
                </span>
            )}
            {ray === 'failed' && (
                <span data-dz-status-ray="failed" title={RAY_FAILED_TITLE} className="px-1.5 py-0.5 rounded border border-line/15 text-fg-secondary">
                    ray march failed
                </span>
            )}
            <span data-dz-status-depth title="Depth: distance from the camera to the surface" className="text-fg-secondary tabular-nums">
                {depth}
            </span>
            <span data-dz-status-iters title="Iterations in use now" className="text-fg-tertiary tabular-nums">it {iters}</span>
            <span data-dz-status-size title="The size the renderer is drawing at" className="text-fg-tertiary tabular-nums">{size}</span>
            {still && <span data-dz-status-still title="Samples gathered for this still" className="text-fg-tertiary tabular-nums">{still}</span>}
        </div>
    );
};
