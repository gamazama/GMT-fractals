/**
 * deep-zoom/milestones.ts - one line the first time a depth is passed in a session.
 *
 * Driven by the telemetry store (8 samples a second), not by React: `startMilestones()` is called
 * once from main.tsx. A view that is already deep when the first sample arrives (a loaded scene,
 * a jump) marks everything above it as seen without a toast, so only a crossing made by
 * travelling says something. Names and numbers only.
 */
import { subscribeTelemetry } from './host/telemetry';
import { showToast } from '../engine/store/toastStore';
import { validDepth } from './components/depthFormat';

export const MILESTONES: ReadonlyArray<{ depth: number; text: string }> = [
    { depth: 1e-4, text: 'Perturbation on at 1e-4' },
    { depth: 1e-13, text: 'Past f64 precision at 1e-13' },
    { depth: 1e-30, text: 'Grain of sand at 1e-30' },
    { depth: 1e-50, text: 'Past the checked depth, 1e-50' },
    { depth: 1e-62, text: 'Planck length at 1e-62' },
    { depth: 1e-76, text: 'The range ends at 1e-77' },
];

/** A jump of more than this many decades between two samples is a jump, not travel. */
const TRAVEL_DECADES = 3;

/** Start watching. Returns the function that stops it. */
export function startMilestones(): () => void {
    const seen = new Set<number>();
    let last: number | null = null;
    return subscribeTelemetry((t) => {
        if (!t.live || !validDepth(t.depth)) { last = null; return; }
        const depth = t.depth;
        const travelled = last !== null && Math.abs(Math.log10(last / depth)) <= TRAVEL_DECADES;
        for (const m of MILESTONES) {
            if (depth > m.depth || seen.has(m.depth)) continue;
            seen.add(m.depth);
            if (travelled && last !== null && last > m.depth) showToast(m.text, 'info', 3500);
        }
        last = depth;
    });
}
