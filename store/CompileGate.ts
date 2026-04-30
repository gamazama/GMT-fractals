
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import { useCompileProgress } from './CompileProgressStore';

/**
 * Compile Spinner Gate
 *
 * Coordinates the compile spinner with GPU-blocking work:
 * 1. Store actions call `queue(message, work)` which:
 *      - opens a cycle on the unified `CompileProgressStore` so views
 *        (LoadingScreen, CompilingIndicator) animate the bar
 *      - emits IS_COMPILING (legacy event bus consumers)
 *      - defers `work` until `flush()` is called
 * 2. CompilingIndicator renders the spinner, then calls `flush()` after
 *    the browser paints — guaranteeing the spinner is visible before
 *    the GPU blocks on the worker side.
 *
 * `queue()` returns a Promise resolved when the work runs (i.e. flush
 * fires). If `queue()` is called twice before `flush()`, the second work
 * closure wins (intentional — the latest formula/scene takes priority);
 * the first promise rejects with `'superseded'`.
 */
class CompileGate {
    private _pendingWork: (() => void) | null = null;
    private _resolvePending: (() => void) | null = null;
    private _rejectPending: ((reason: string) => void) | null = null;
    private _safetyTimer: ReturnType<typeof setTimeout> | null = null;

    /** Queue compile work to run after the spinner is painted. */
    queue(message: string, work: () => void): Promise<void> {
        // Reject any prior pending cycle.
        if (this._rejectPending) {
            this._rejectPending('superseded');
            this._rejectPending = null;
            this._resolvePending = null;
        }
        if (this._safetyTimer) {
            clearTimeout(this._safetyTimer);
            this._safetyTimer = null;
        }

        this._pendingWork = work;

        const estimate = useCompileProgress.getState().estimateMs;
        useCompileProgress.getState().start(message, estimate);
        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, message);

        // Safety net: if the spinner DOM doesn't paint within 500ms (e.g.
        // CompilingIndicator unmounted, missed render), flush the work
        // anyway so the worker doesn't sit idle forever.
        this._safetyTimer = setTimeout(() => {
            this._safetyTimer = null;
            if (this._pendingWork) this.flush();
        }, 500);

        return new Promise<void>((resolve, reject) => {
            this._resolvePending = resolve;
            this._rejectPending = reject;
        });
    }

    /** Called by CompilingIndicator after it has rendered and the browser has painted. */
    flush() {
        if (this._pendingWork) {
            const work = this._pendingWork;
            const resolve = this._resolvePending;
            this._pendingWork = null;
            this._resolvePending = null;
            this._rejectPending = null;
            if (this._safetyTimer) {
                clearTimeout(this._safetyTimer);
                this._safetyTimer = null;
            }
            work();
            if (resolve) resolve();
        }
    }
}

export const compileGate = new CompileGate();
