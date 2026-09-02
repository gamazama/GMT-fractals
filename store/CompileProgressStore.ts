import { create } from 'zustand';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';

/**
 * Compile Progress Store
 *
 * Single source of truth for "the engine is compiling, here's how far
 * along we estimate it is, here's what to show the user."
 *
 * Both views read from this store:
 *   - `LoadingScreen` (boot screen, shown until first compile completes)
 *   - `CompilingIndicator` (post-boot toast, shown for each subsequent
 *     compile)
 *
 * Lifecycle:
 *
 *     start(msg, est)        ┌──────────────┐
 *     ────────────────────►  │  compiling   │ ─── setMessage(msg) ──► (loops)
 *     finish()               │              │
 *     ◄──────────────────── └──────┬───────┘
 *                                  │
 *                                  ▼
 *                          ┌──────────────┐
 *                          │     done     │ ─── reset() ──► idle
 *                          └──────────────┘
 *
 *     fail(reason)  (from COMPILE_FAILED on the main bus, any phase)
 *     ────────────────────►  ┌──────────────┐
 *                            │    failed    │ ─── dismissFailure() / start() ──► idle / compiling
 *                            └──────────────┘
 *
 * `failed` is sticky: `finish()` (the worker's IS_COMPILING:false, which
 * arrives AFTER COMPILE_FAILED on a failed cycle) only leaves `compiling`,
 * so a failure is not overwritten by the end of the same cycle. Until
 * 2026-09-02 a failed compile had no in-app signal at all: the worker kept
 * rendering empty frames and the only trace was a console.error.
 *
 * Progress is computed on demand by `selectProgress(state, now)`. The
 * curve is exponential with a 95 % asymptote until `finish()`, then
 * snaps to 100. Views that animate the bar should poll this selector
 * via rAF.
 */

export type CompilePhase = 'idle' | 'compiling' | 'done' | 'failed';

interface CompileProgressState {
    phase: CompilePhase;
    message: string;
    startedAt: number | null;
    estimateMs: number;
    doneAt: number | null;
    /** Increments on every `start()`. UI keys ref-callbacks / rAF loops on this. */
    cycleId: number;
    /** The worker's compile/link error while `phase === 'failed'`, else null. */
    error: string | null;

    /** Begin a new cycle. Resets progress to 0, sets startedAt to now. */
    start: (message: string, estimateMs: number) => void;

    /** Update the message without resetting the cycle. Called for phase
     *  changes inside one compile (e.g. "Loading Preview…" → "Compiling
     *  Lighting…"). */
    setMessage: (message: string) => void;

    /** Update the estimate (e.g. when ConfigManager has computed a new
     *  one). Affects the *current* in-flight cycle. */
    setEstimate: (estimateMs: number) => void;

    /** Worker reported the compile is complete. Snaps progress to 100 %. */
    finish: () => void;

    /** Force back to idle (e.g. unmount). */
    reset: () => void;

    /** The worker reported a compile/link failure. Sticky until the next
     *  `start()` or an explicit `dismissFailure()`. */
    fail: (reason: string) => void;

    /** User dismissed the failure notice. No-op unless `phase === 'failed'`. */
    dismissFailure: () => void;
}

export const useCompileProgress = create<CompileProgressState>((set) => ({
    phase: 'idle',
    message: '',
    startedAt: null,
    estimateMs: 15000,
    doneAt: null,
    cycleId: 0,
    error: null,

    start: (message, estimateMs) => set((s) => ({
        phase: 'compiling',
        message,
        startedAt: performance.now(),
        estimateMs: Math.max(1000, estimateMs),
        doneAt: null,
        cycleId: s.cycleId + 1,
        error: null,
    })),

    setMessage: (message) => set({ message }),

    setEstimate: (estimateMs) => set({ estimateMs: Math.max(1000, estimateMs) }),

    finish: () => set((s) => s.phase === 'compiling'
        ? { phase: 'done', doneAt: performance.now() }
        : s),

    reset: () => set({
        phase: 'idle',
        message: '',
        startedAt: null,
        doneAt: null,
        error: null,
    }),

    fail: (reason) => set({
        phase: 'failed',
        error: reason,
        doneAt: performance.now(),
    }),

    dismissFailure: () => set((s) => s.phase === 'failed'
        ? { phase: 'idle', message: '', startedAt: null, doneAt: null, error: null }
        : s),
}));

/**
 * Compute current progress in [0, 100].
 *
 * - `idle`: 0
 * - `compiling`: asymptotic exponential approach to 95 % over `estimateMs`
 * - `done`: 100
 */
export const selectProgress = (s: CompileProgressState, now: number): number => {
    if (s.phase === 'done') return 100;
    if (s.phase !== 'compiling' || s.startedAt === null) return 0;
    const t = (now - s.startedAt) / Math.max(1, s.estimateMs);
    return Math.min(95, 95 * (1 - Math.exp(-3 * t)));
};

// Wire `compile_estimate` events directly into the store so the latest
// estimate is always available at `queue()` time (compileGate reads
// `estimateMs` when starting a cycle).
//
// Producers:
//   - useAppStartup.bootEngine emits before `compileGate.queue`
//   - engineStore.setFormula / loadScene can emit before queue (Phase 5)
//   - ConfigManager.flushRebuildLog (worker-side) — does not reach
//     main thread today; bridged via WorkerProxy in a follow-up
// A compile/link failure. engine-gmt's WorkerProxy re-emits the worker's
// ERROR postMessage as COMPILE_FAILED on the main bus once booted (pre-boot
// failures go to WORKER_BOOT_FAILED and the LoadingScreen instead).
//
// @invariant A COMPILE_FAILED on the main bus puts this store in `failed`
//   with the reason, and the CompilingIndicator shows it until the next
//   compile starts or the user dismisses it.
//   — proven by: npm run smoke:compile-failed ("indicator shows the
//   failure", "indicator cleared after a good compile"). Falsified
//   2026-09-02 by removing this subscription: the indicator assertion went
//   red while the proxy flag stayed green.
FractalEvents.on(FRACTAL_EVENTS.COMPILE_FAILED, ({ reason }) => {
    useCompileProgress.getState().fail(reason);
});

FractalEvents.on(FRACTAL_EVENTS.COMPILE_ESTIMATE, (ms) => {
    useCompileProgress.getState().setEstimate(ms);
});
