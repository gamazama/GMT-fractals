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

// Dev-only instrumentation: warn if registerTick is ever called but runTicks
// isn't invoked within 3 seconds. Catches the fragility where an app forgets
// to install @engine/render-loop and nothing ticks. See docs/20_Fragility_Audit.md F4.
let _firstRegisterTime = 0;
let _lastTickTime = 0;
let _warnedNoTicks = false;

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
    // Arm the dev-only no-ticks warning on first registration. If something
    // has been registered but nothing ever calls runTicks, the app has a
    // silent rendering-loop bug — flag it loudly after 3s.
    if (_firstRegisterTime === 0) {
        _firstRegisterTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        if (import.meta.env.DEV && typeof setTimeout !== 'undefined') {
            setTimeout(() => {
                if (_lastTickTime === 0 && !_warnedNoTicks) {
                    console.warn(
                        '[TickRegistry] 3 seconds after first registerTick() and runTicks(dt) ' +
                        'has never been called. Animations, overlays, and timeline will not ' +
                        'update. Mount <RenderLoopDriver /> from engine/plugins/RenderLoop ' +
                        '(or call runTicks(dt) every frame yourself). See ' +
                        'docs/01_Architecture.md § render-loop.'
                    );
                    _warnedNoTicks = true;
                }
            }, 3000);
        }
    }

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
 * Called once per frame from WorkerTickScene's useFrame, or from the default
 * RenderLoopDriver in engine/plugins/RenderLoop.
 */
export function runTicks(delta: number): void {
    _lastTickTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
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
