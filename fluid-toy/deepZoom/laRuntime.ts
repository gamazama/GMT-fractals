/**
 * Main-thread wrapper for the deep-zoom worker.
 *
 * Owns one Worker instance and a small request/response correlator.
 * Phase 2 surface: `computeReferenceOrbit(req)` → `Promise<RefOrbitResult>`.
 * Phase 5 will add `buildLA` here.
 *
 * Singleton accessor: most app code goes through `getDeepZoomRuntime()`
 * so the worker spins up lazily on first use and survives across
 * fractal-view changes. Tests can construct their own instance.
 */

import type {
    DeepZoomRequest,
    DeepZoomResponse,
} from './deepZoomWorker';

export interface RefOrbitRequest {
    centerX: number;
    centerY: number;
    /** Optional sub-f64 residuals paired with (centerX, centerY) for
     *  deep-zoom pan precision. Forwarded verbatim to the worker. */
    centerLowX?: number;
    centerLowY?: number;
    zoom: number;
    maxIter: number;
    /** Power in z → z^d + c. Default 2. */
    power?: number;
    /** Fractal kind. Default 'mandelbrot'. */
    kind?: 'mandelbrot' | 'julia';
    /** Julia constant. Required when kind='julia'. */
    juliaCx?: number;
    juliaCy?: number;
    /** When true, the worker also builds the LA merge tree and returns
     *  packed table buffers. Set true when the user has `useLA` enabled
     *  on the deepZoom slice. */
    buildLA?: boolean;
    /** Worst-case |dc|² across the screen for AT validity. Pass the
     *  current view's max corner-distance² in fractal coords. Skip
     *  by passing 0 or omitting. */
    screenSqrRadius?: number;
}

/** Optional AT (Approximation Terms) front-load data. */
export interface ATPayload {
    stepLength: number;
    thresholdC: number;
    sqrEscapeRadius: number;
    refCRe: number;
    refCIm: number;
    ccoeffRe: number;
    ccoeffIm: number;
    invZCoeffRe: number;
    invZCoeffIm: number;
}

export interface RefOrbitResult {
    orbit: Float32Array;
    length: number;
    escaped: boolean;
    precisionBits: number;
    buildMs: number;
    laBuildMs: number;
    /** Packed LA table (12 floats / RGBA32F texels per node). Present
     *  only when buildLA was requested and construction succeeded. */
    laTable?: Float32Array;
    /** Packed stage table — pairs of (laIndex, macroItCount) as floats. */
    laStages?: Float32Array;
    laCount: number;
    laStageCount: number;
    /** Present when an outermost-usable AT was built. */
    at?: ATPayload;
}

type Pending = {
    resolve: (result: RefOrbitResult) => void;
    reject: (err: Error) => void;
};

export class DeepZoomRuntime {
    private worker: Worker | null = null;
    private nextId = 1;
    private pending = new Map<number, Pending>();

    private ensureWorker(): Worker {
        if (this.worker) return this.worker;

        // Vite picks up the worker from this URL pattern and bundles it.
        // `type: 'module'` enables ES module imports inside the worker.
        const w = new Worker(
            new URL('./deepZoomWorker.ts', import.meta.url),
            { type: 'module' },
        );
        w.onmessage = (event: MessageEvent<DeepZoomResponse>) => {
            const msg = event.data;
            const slot = this.pending.get(msg.id);
            if (!slot) return;
            this.pending.delete(msg.id);
            if (msg.type === 'orbit') {
                slot.resolve({
                    orbit: new Float32Array(msg.orbit),
                    length: msg.length,
                    escaped: msg.escaped,
                    precisionBits: msg.precisionBits,
                    buildMs: msg.buildMs,
                    laBuildMs: msg.laBuildMs ?? 0,
                    laTable: msg.laTable ? new Float32Array(msg.laTable) : undefined,
                    laStages: msg.laStages ? new Float32Array(msg.laStages) : undefined,
                    laCount: msg.laCount ?? 0,
                    laStageCount: msg.laStageCount ?? 0,
                    at: msg.at,
                });
            } else {
                slot.reject(new Error(msg.message));
            }
        };
        w.onerror = (event) => {
            // Any uncaught worker error rejects every in-flight request
            // and forces a fresh worker on next use. The pending map
            // gets cleared so callers don't hang.
            const err = new Error(`deep-zoom worker crashed: ${event.message}`);
            for (const slot of this.pending.values()) slot.reject(err);
            this.pending.clear();
            this.worker?.terminate();
            this.worker = null;
        };
        this.worker = w;
        return w;
    }

    computeReferenceOrbit(req: RefOrbitRequest): Promise<RefOrbitResult> {
        const worker = this.ensureWorker();
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            const msg: DeepZoomRequest = { type: 'computeOrbit', id, ...req };
            worker.postMessage(msg);
            // LA build at non-power-2 isn't implemented — the LA Step
            // rule is hardcoded for d=2. We still want the orbit to
            // build correctly so PO can use it; the worker will
            // produce the orbit but skip LA when power != 2 (caller
            // should also set buildLA=false to make the intent
            // explicit).
        });
    }

    /**
     * Best-effort cancel for an in-flight request. Phase 2's orbit-only
     * builds typically complete faster than the cancel round-trip, so
     * this is mostly a no-op until phase 5 adds longer LA-construction
     * jobs.
     */
    cancel(id: number): void {
        if (!this.worker) return;
        const msg: DeepZoomRequest = { type: 'cancel', id };
        this.worker.postMessage(msg);
        this.pending.delete(id);
    }

    dispose(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.pending.clear();
    }
}

let _instance: DeepZoomRuntime | null = null;

/**
 * Lazily-created singleton. Call from anywhere on the main thread.
 * Tests should instantiate `DeepZoomRuntime` directly to avoid sharing
 * the worker across cases.
 */
export const getDeepZoomRuntime = (): DeepZoomRuntime => {
    if (!_instance) _instance = new DeepZoomRuntime();
    return _instance;
};
