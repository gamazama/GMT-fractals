
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';

/**
 * Compile Spinner Gate
 *
 * Coordinates the compile spinner with GPU-blocking work:
 * 1. Store actions call `queue()` which emits IS_COMPILING and defers the work.
 * 2. CompilingIndicator renders the spinner, then calls `flush()` after the
 *    browser paints — guaranteeing the spinner is visible before the GPU blocks.
 *
 * If `queue()` is called twice before `flush()`, the second work closure wins
 * (intentional — the latest formula/scene takes priority).
 */
class CompileGate {
    private _pendingWork: (() => void) | null = null;
    private _newCyclePending = false;

    /** Queue compile work to run after the spinner is painted.
     *  Sets newCyclePending so the handler knows this is a user-initiated cycle
     *  (not a worker status update). */
    queue(message: string, work: () => void) {
        this._pendingWork = work;
        this._newCyclePending = true;
        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, message);
    }

    /** Check and consume the new-cycle flag. Called by CompilingIndicator's handler. */
    consumeNewCycle(): boolean {
        if (this._newCyclePending) { this._newCyclePending = false; return true; }
        return false;
    }

    /** Called by CompilingIndicator after it has rendered and the browser has painted. */
    flush() {
        if (this._pendingWork) {
            const work = this._pendingWork;
            this._pendingWork = null;
            work();
        }
    }
}

export const compileGate = new CompileGate();
