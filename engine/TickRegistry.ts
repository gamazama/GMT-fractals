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
 * @invariant Singleton, single-instance. Module-scope state means two engine
 *   boots in the same JS realm would share one tick list. The multi-engine
 *   shape is NOT supported — fork the worker instead. See ADR-0004.
 * @invariant delta is SECONDS, not milliseconds. Every caller passes seconds
 *   (RenderLoopDriver divides by 1000; GmtRendererTickDriver uses R3F useFrame
 *   delta which is already seconds). A future driver passing ms would silently
 *   break every time-dependent tick. See ADR-0002.
 * @invariant Exactly one tick driver per realm. The double-run guard at
 *   DOUBLE_RUN_WINDOW_MS=1 catches the historical RenderLoopDriver +
 *   GmtRendererTickDriver footgun, but is NOT a defence against a future
 *   cross-context driver (e.g. worker-side RAF) landing on staggered timing.
 *   See ADR-0003.
 * @invariant Phases run in numeric order via stable Array.sort comparing
 *   `phase` only. Within a phase, registration order is preserved.
 *   See ADR-0001.
 * @invariant Throws-on-cycle is NOT honored: `getAll()` returns registration
 *   order on cycle and logs to console.error. JSDoc was corrected 2026-05-20
 *   (f-002).
 *
 * Usage:
 *   registerTick('myTick', TICK_PHASE.OVERLAY, (delta) => { ... });
 *   // In useFrame: runTicks(delta);
 *
 * @see docs/adr/0001-tick-phases-as-numeric-constants.md
 * @see docs/adr/0002-tick-delta-in-seconds.md
 * @see docs/adr/0003-single-driver-double-run-guard.md
 * @see docs/adr/0004-tickregistry-singleton-scope.md
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
 *
 * Duplicate names are silently ignored (safe for HMR re-execution) — the
 * returned disposer is a no-op in that case. Caller code that relies on the
 * disposer to clean up something else (e.g. close over an external listener)
 * will silently fail on the duplicate path; current consumers don't depend on
 * this, but future ones must be aware.
 *
 * Returns an unregister function for cleanup. Capture-by-reference + indexOf
 * removal means unregister order does not matter.
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
                        'docs/engine/01_Architecture.md § The render-loop contract.'
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

// Two RAF-driven tick drivers mounted in the same app (the historical
// RenderLoopDriver + GmtRendererTickDriver footgun) call runTicks twice
// per frame, making dt-based work advance at 2× wall-clock. The window
// guard below suppresses the second call.
let _warnedDoubleRun = false;
const DOUBLE_RUN_WINDOW_MS = 1;

/** Run all registered ticks in phase order. Called once per frame by the
 *  active tick driver. */
export function runTicks(delta: number): void {
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    if (_lastTickTime !== 0 && now - _lastTickTime < DOUBLE_RUN_WINDOW_MS) {
        if (import.meta.env.DEV && !_warnedDoubleRun) {
            console.warn(
                '[TickRegistry] runTicks() called twice within ' + DOUBLE_RUN_WINDOW_MS + 'ms — ' +
                'two tick drivers are mounted simultaneously. The duplicate call is being ' +
                'suppressed, but you should fix the wiring: only one of RenderLoopDriver / ' +
                'GmtRendererTickDriver should be mounted at a time (the canonical driver runs ' +
                'TickRegistry phases AND dispatches its renderer). Symptom: animation timeline ' +
                'and modulation advance at 2× wall-clock.'
            );
            _warnedDoubleRun = true;
        }
        return;
    }
    _lastTickTime = now;
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
