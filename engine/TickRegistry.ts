/**
 * TickRegistry — Phase-based tick orchestrator for the main-thread render loop.
 *
 * All per-frame work on the main thread registers here with a named phase.
 * Phases run in fixed order each frame:
 *
 *   SNAPSHOT → Freeze camera state for this frame
 *   ANIMATE  → Timeline, oscillators, modulation (mutates store)
 *   OVERLAY  → DOM overlays (gizmos) using snapshot + updated store
 *   UI       → Counters, monitors, timeline displays
 *
 * The DISPATCH step (sendRenderTick) stays in WorkerTickScene because
 * it needs R3F camera serialization and proxy access.
 *
 * Navigation's useFrame stays separate at R3F priority 0 (runs before
 * this registry) because it handles camera physics tied to React hooks/refs.
 *
 * Usage:
 *   registerTick('myTick', TICK_PHASE.OVERLAY, (delta) => { ... });
 *   // In useFrame: runTicks(delta);
 */

export const TICK_PHASE = {
    SNAPSHOT: 0,
    ANIMATE: 1,
    OVERLAY: 2,
    UI: 3,
} as const;

export type TickPhase = typeof TICK_PHASE[keyof typeof TICK_PHASE];

interface TickEntry {
    name: string;
    phase: TickPhase;
    fn: (delta: number) => void;
}

const _entries: TickEntry[] = [];
let _needsSort = false;

/**
 * Register a tick function into a phase.
 * Duplicate names are silently ignored (safe for HMR re-execution).
 * Returns an unregister function for cleanup.
 */
export function registerTick(
    name: string,
    phase: TickPhase,
    fn: (delta: number) => void
): () => void {
    if (_entries.some(e => e.name === name)) return () => {};
    const entry: TickEntry = { name, phase, fn };
    _entries.push(entry);
    _needsSort = true;
    return () => {
        const idx = _entries.indexOf(entry);
        if (idx >= 0) { _entries.splice(idx, 1); }
    };
}

/**
 * Run all registered ticks in phase order.
 * Called once per frame from WorkerTickScene's useFrame.
 */
export function runTicks(delta: number): void {
    if (_needsSort) {
        _entries.sort((a, b) => a.phase - b.phase);
        _needsSort = false;
    }
    for (let i = 0; i < _entries.length; i++) {
        _entries[i].fn(delta);
    }
}

/**
 * Debug: return a manifest of all registered ticks in execution order.
 * Usage: console.table(getTickManifest())
 */
export function getTickManifest(): Array<{ phase: string; name: string }> {
    const phaseNames = ['SNAPSHOT', 'ANIMATE', 'OVERLAY', 'UI'];
    if (_needsSort) {
        _entries.sort((a, b) => a.phase - b.phase);
        _needsSort = false;
    }
    return _entries.map(e => ({
        phase: phaseNames[e.phase] ?? String(e.phase),
        name: e.name
    }));
}
