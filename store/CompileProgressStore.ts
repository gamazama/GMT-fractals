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
 * Progress is computed on demand by `selectProgress(state, now)`. The
 * curve is exponential with a 95 % asymptote until `finish()`, then
 * snaps to 100. Views that animate the bar should poll this selector
 * via rAF.
 */

export type CompilePhase = 'idle' | 'compiling' | 'done';

interface CompileProgressState {
    phase: CompilePhase;
    message: string;
    startedAt: number | null;
    estimateMs: number;
    doneAt: number | null;
    /** Increments on every `start()`. UI keys ref-callbacks / rAF loops on this. */
    cycleId: number;

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

    /** Force back to idle (e.g. unmount, error). */
    reset: () => void;
}

export const useCompileProgress = create<CompileProgressState>((set) => ({
    phase: 'idle',
    message: '',
    startedAt: null,
    estimateMs: 15000,
    doneAt: null,
    cycleId: 0,

    start: (message, estimateMs) => set((s) => ({
        phase: 'compiling',
        message,
        startedAt: performance.now(),
        estimateMs: Math.max(1000, estimateMs),
        doneAt: null,
        cycleId: s.cycleId + 1,
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
    }),
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
FractalEvents.on(FRACTAL_EVENTS.COMPILE_ESTIMATE, (ms) => {
    useCompileProgress.getState().setEstimate(ms);
});
