/**
 * WorkerProxy — Abstraction layer between UI code and the render worker.
 *
 * All rendering happens in a Web Worker that owns FractalEngine + OffscreenCanvas.
 * This proxy sends messages to the worker and caches shadow state received back.
 *
 * IMPORTANT: This module must NOT have runtime imports from FractalEngine
 * to avoid circular dependency TDZ errors. Use `import type` only.
 */

import * as THREE from 'three';
import type { EngineRenderState } from '../FractalEngine';
import type { ShaderConfig } from '../ShaderFactory';
import type { CameraState } from '../../types/common';
import type { VideoExportConfig } from '../../../engine/codec/VideoExportTypes';
import type { BucketRenderConfig } from '../BucketRenderer';
import type { MainToWorkerMessage, WorkerToMainMessage, WorkerShadowState, SerializedCamera, SerializedOffset } from './WorkerProtocol';
import type { DerivedRotationSpec } from '../../types/fractal';
import { injectMetadata } from '../../../utils/pngMetadata';
import { showToast } from '../../../engine/store/toastStore';
import { FractalEvents, FRACTAL_EVENTS } from '../FractalEvents';
import type { AccumulationController } from '../../../engine/AccumulationController';
import { useCompileProgress } from '../../../store/CompileProgressStore';

/** Low-latency present: create the worker's offscreen WebGL context with
 *  `desynchronized: true` (bypasses the compositor double/triple-buffer + DWM
 *  sync). Measured +59% sustained throughput under load on an RTX 2070 (6.8 →
 *  10.8 fps), clean in initial testing. Read on the main thread (the worker's
 *  `self.location` is the worker-script URL, not the page) and passed via INIT.
 *
 *  DEFAULT ON. Escape hatch: `?lowlatency=0` disables it without a rebuild.
 *  REVERT (flip the default back to off) if any of these surface with extended
 *  use: visible tearing on the viewport, blank/torn PNG snapshots or video-export
 *  frames, present flicker/stutter, or WORSE latency on some GPU/driver combos. */
const LOW_LATENCY_PRESENT: boolean = (() => {
    try {
        if (typeof window === 'undefined') return false;
        return new URLSearchParams(window.location.search).get('lowlatency') !== '0';
    } catch { return true; }
})();

/**
 * Default no-progress window for one `renderExportFrame`: how long the main
 * thread tolerates silence from the render worker mid-frame before declaring
 * the frame dead. It is a STALL detector, not a duration cap. The worker posts
 * EXPORT_HEARTBEAT roughly once per second of GPU time (see
 * `EXPORT_HEARTBEAT_MS` in WorkerExporter) and every beat re-arms the window,
 * so a legitimate multi-minute 4K path-traced frame never trips it — only a
 * frame that goes silent does (a dropped EXPORT_RENDER_FRAME, a worker wedged
 * outside its sample loop). 60 s is ~30× the longest single draw Windows TDR
 * (2 s) permits before the context is lost anyway, so a false trip needs the
 * whole pipeline to freeze without a CONTEXT_LOST. Override per call via
 * `renderExportFrame(..., { stallMs })`; `0` disables the watchdog.
 */
export const EXPORT_FRAME_STALL_MS = 60_000;

export class WorkerProxy implements AccumulationController {
    // ─── Stub properties ─────────────────────────────────────────────
    // These exist on FractalEngine but not on WorkerProxy.  UI code guards
    // access with `if (engine.activeCamera && ...)` so they are always falsy here.
    readonly activeCamera: THREE.PerspectiveCamera | null = null;
    readonly virtualSpace: import('../PrecisionMath').VirtualSpace | null = null;
    readonly renderer: THREE.WebGLRenderer | null = null;
    readonly pipeline: import('../RenderPipeline').RenderPipeline | null = null;

    private _worker: Worker | null = null;
    // Main-thread-only (NOT part of `_shadow`, which FRAME_READY replaces
    // wholesale): the reason the most recent compile cycle failed, or null.
    private _lastCompileFailed: string | null = null;
    private _compileCycleFailed = false;
    private _shadow: WorkerShadowState = {
        isBooted: false, isCompiling: false, hasCompiledShader: false,
        isPaused: false, dirty: false, lastCompileDuration: 0,
        lastMeasuredDistance: 1, centerIsSky: false, accumulationCount: 0, convergenceValue: 1.0, frameCount: 0,
        sceneOffset: { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 }
    };

    /**
     * Scene offset synchronized with the rendered image.
     *
     * Updated from two sources:
     *   1. setShadowOffset() — immediate set on mode switches / teleports (sets guard)
     *   2. FRAME_READY — worker reports its offset after rendering (skipped while guarded)
     *
     * NOT updated by applyOffsetShift (removed). This ensures _localOffset always
     * matches the last displayed frame, eliminating drift between gizmo overlay
     * and rendered image during fly mode.
     */
    private _localOffset = { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
    /**
     * When true, FRAME_READY won't overwrite _localOffset until the worker catches up.
     *
     * @invariant Drift-converged clear ONLY — no timeout fallback. A
     *   previous 2s auto-clear caused an F15 fly-mode bug where stale
     *   FRAME_READY data overwrote a fresh teleport. The guard clears
     *   when the worker's reported offset converges within 0.001 of the
     *   set value. See ADR-0042.
     */
    private _offsetGuarded = false;
    private _onCompiling: ((status: boolean | string) => void) | null = null;
    private _onCompileTime: ((duration: number) => void) | null = null;
    private _onShaderCode: ((code: string) => void) | null = null;
    private _onBootedCallback: (() => void) | null = null;
    private _pendingSnapshots: Map<string, (blob: Blob) => void> = new Map();
    private _pendingEnvMaps: Map<string, (blob: Blob | null) => void> = new Map();
    private _pendingPicks: Map<string, (pos: THREE.Vector3 | null) => void> = new Map();
    private _pendingFocusPicks: Map<string, (distance: number) => void> = new Map();
    private _pendingHistograms: Map<string, (data: Float32Array) => void> = new Map();
    private _pendingShaderSource: Map<string, (code: string | null) => void> = new Map();
    private _pendingUniformsSnapshot: Map<string, (u: Record<string, any> | null) => void> = new Map();
    private _pendingRenderInfo: Map<string, (info: any | null) => void> = new Map();
    private _gpuInfo: string = '';
    // Cached half-float-alpha capability published by the worker on BOOTED.
    // Defaults to true; falls back to false only if the probe explicitly
    // reports failure. Exposed via checkHalfFloatAlphaSupport().
    private _halfFloatAlphaSupport: boolean = true;
    private _lastGeneratedFrag: string = '';
    private _onWorkerFrame: (() => void) | null = null;
    private _pendingTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
    private _exportStartTimer: ReturnType<typeof setTimeout> | null = null;
    private _exportFinishTimer: ReturnType<typeof setTimeout> | null = null;

    /** Modulation offsets set by AnimationSystem — forwarded to worker via EXPORT_RENDER_FRAME */
    modulations: Record<string, number> = {};

    // ─── Bucket Render State ─────────────────────────────────────────
    private _isBucketRendering = false;

    // ─── Export State ────────────────────────────────────────────────
    private _isExporting = false;
    private _exportReady: (() => void) | null = null;
    private _exportFrameDone: ((data: { frameIndex: number; progress: number; measuredDistance: number }) => void) | null = null;
    private _exportComplete: ((blob: ArrayBuffer | null) => void) | null = null;
    private _exportError: ((msg: string) => void) | null = null;
    /**
     * Reject route for the in-flight `renderExportFrame` promise.
     *
     * Separate from `_exportError` on purpose: `_exportError` is owned by
     * whichever of startExport/finishExport is currently awaiting, and the frame
     * pump runs *between* those two, so a frame failure has no rejecter of its
     * own without this. See `_handleWorkerCrash` and `_tripExportFrameWatchdog`.
     */
    private _exportFrameFail: ((msg: string) => void) | null = null;
    /**
     * Stall watchdog for the in-flight `renderExportFrame` — see
     * EXPORT_FRAME_STALL_MS. Armed when the frame is posted, re-armed on every
     * EXPORT_HEARTBEAT, cleared by whatever settles the frame (FRAME_DONE,
     * EXPORT_ERROR, crash, or its own trip). Null when no frame is in flight.
     */
    private _exportFrameWatch: { frameIndex: number; stallMs: number; timer: ReturnType<typeof setTimeout> } | null = null;

    // ─── Worker Init ─────────────────────────────────────────────────────

    /** The container element that holds the canvas — needed for restart() */
    private _container: HTMLElement | null = null;
    private _lastInitArgs: {
        config: ShaderConfig; width: number; height: number;
        dpr: number; isMobile: boolean;
        initialCamera?: { position: [number, number, number]; quaternion: [number, number, number, number]; fov: number };
    } | null = null;

    initWorkerMode(
        canvas: HTMLCanvasElement,
        config: ShaderConfig,
        width: number,
        height: number,
        dpr: number,
        isMobile: boolean,
        initialCamera?: { position: [number, number, number]; quaternion: [number, number, number, number]; fov: number }
    ) {
        if (this._worker) return; // Already initialized

        this._container = canvas.parentElement;
        this._lastInitArgs = { config, width, height, dpr, isMobile, initialCamera };

        const offscreen = canvas.transferControlToOffscreen();

        this._worker = new Worker(
            new URL('./renderWorker.ts', import.meta.url),
            { type: 'module' }
        );

        this._worker.onmessage = (e: MessageEvent<WorkerToMainMessage>) => {
            this._handleWorkerMessage(e.data);
        };

        this._worker.onerror = (e) => {
            console.error('[WorkerProxy] Worker error:', e);
            this._handleWorkerCrash('Worker error: ' + (e.message || 'unknown'));
        };

        // Re-populate the fresh worker's (empty) formula registry, then deliver any
        // other pre-boot-queued messages — both BEFORE INIT, so they're processed
        // ahead of the (deferred) boot compile.
        this._replayFormulas();
        this._flushOutbox();

        const initMsg: MainToWorkerMessage = {
            type: 'INIT',
            canvas: offscreen,
            width, height, dpr, isMobile,
            initialConfig: config,
            initialCamera,
            desynchronized: LOW_LATENCY_PRESENT,
        };
        this._worker.postMessage(initMsg, [offscreen]);
    }

    /**
     * Terminate the current worker and restart with a new config.
     * Creates a fresh canvas + worker since transferControlToOffscreen() is one-shot.
     * Used to cancel a synchronous compile on Firefox (only way to interrupt it).
     */
    restart(newConfig: ShaderConfig, initialCamera?: { position: [number, number, number]; quaternion: [number, number, number, number]; fov: number }) {
        if (!this._container || !this._lastInitArgs) return;

        // 1. Kill old worker and clear orphaned timers
        this._clearAllTimers();
        if (this._worker) {
            this._worker.onmessage = null;
            this._worker.onerror = null;
            this._worker.terminate();
            this._worker = null;
        }

        // 2. Reset shadow state
        this._shadow = {
            isBooted: false, isCompiling: false, hasCompiledShader: false,
            isPaused: false, dirty: false, lastCompileDuration: 0,
            lastMeasuredDistance: 1, centerIsSky: false, accumulationCount: 0, convergenceValue: 1.0, frameCount: 0,
            sceneOffset: { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 }
        };

        // 3. Replace canvas (transferControlToOffscreen is one-shot)
        const oldCanvas = this._container.querySelector('canvas');
        if (oldCanvas) oldCanvas.remove();

        const { width, height, dpr, isMobile } = this._lastInitArgs;
        const canvas = document.createElement('canvas');
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
        this._container.appendChild(canvas);

        // 4. Re-init with new config
        this._lastInitArgs = { ...this._lastInitArgs, config: newConfig, initialCamera };
        const offscreen = canvas.transferControlToOffscreen();

        this._worker = new Worker(
            new URL('./renderWorker.ts', import.meta.url),
            { type: 'module' }
        );

        this._worker.onmessage = (e: MessageEvent<WorkerToMainMessage>) => {
            this._handleWorkerMessage(e.data);
        };
        this._worker.onerror = (e) => {
            console.error('[WorkerProxy] Worker error:', e);
            this._handleWorkerCrash('Worker error: ' + (e.message || 'unknown'));
        };

        // Re-register formulas into the fresh worker + flush the outbox, BEFORE
        // INIT. This is the Firefox fix: a restart (synchronous-compile cancel)
        // makes a new worker with an empty registry, so the custom formula must be
        // replayed or the boot compile falls back to a sphere.
        this._replayFormulas();
        this._flushOutbox();

        const initMsg: MainToWorkerMessage = {
            type: 'INIT',
            canvas: offscreen,
            width, height, dpr, isMobile,
            initialConfig: newConfig,
            initialCamera,
            desynchronized: LOW_LATENCY_PRESENT,
        };
        this._worker.postMessage(initMsg, [offscreen]);
    }

    set onCompiling(cb: ((status: boolean | string) => void) | null) { this._onCompiling = cb; }
    set onCompileTime(cb: ((duration: number) => void) | null) { this._onCompileTime = cb; }
    set onShaderCode(cb: ((code: string) => void) | null) { this._onShaderCode = cb; }
    registerFrameCounter(cb: (() => void) | null) { this._onWorkerFrame = cb; }

    private _handleWorkerMessage(msg: WorkerToMainMessage) {
        switch (msg.type) {
            case 'READY':
                break;
            case 'FRAME_READY':
                if (msg.state) {
                    this._shadow = msg.state;
                    // Sync _localOffset from worker's rendered offset.
                    // Skip if guarded (setShadowOffset was called and worker hasn't caught up yet).
                    if (this._offsetGuarded) {
                        const wo = msg.state.sceneOffset;
                        const lo = this._localOffset;
                        const drift = Math.abs((wo.x+wo.xL)-(lo.x+lo.xL)) + Math.abs((wo.y+wo.yL)-(lo.y+lo.yL)) + Math.abs((wo.z+wo.zL)-(lo.z+lo.zL));
                        if (drift < 0.001) {
                            this._offsetGuarded = false; // Worker caught up
                        }
                    } else {
                        this._localOffset = { ...msg.state.sceneOffset };
                    }
                }
                // Count every worker frame for FPS display
                if (this._onWorkerFrame) this._onWorkerFrame();
                break;
            case 'COMPILING': {
                this._shadow.isCompiling = !!msg.status;
                this._shadow.hasCompiledShader = !msg.status || this._shadow.hasCompiledShader;
                // `lastCompileFailed` tracks the CYCLE: cleared when a cycle ends
                // without an ERROR in between (COMPILE_FAILED reaches us before
                // IS_COMPILING:false on a failed cycle — renderWorker registers
                // the bridges in that order on purpose).
                if (msg.status) this._compileCycleFailed = false;
                else if (!this._compileCycleFailed) this._lastCompileFailed = null;
                // Compile resets accumulation worker-side (CompileScheduler), but posts
                // no frame — drop the converged-mirror so the gate keeps requesting ticks
                // through the whole compile and renders the instant the new shader lands.
                // Without this the mirror stays pinned at the old cap and the post-load
                // frame never advances (the "stuck after formula load" deadlock).
                if (msg.status) this.invalidateConvergedMirror();
                if (this._onCompiling) this._onCompiling(msg.status);
                FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, msg.status);

                // Drive the unified progress store. String → phase change
                // (text update). False → cycle finished.
                //
                // Defensive: if the worker fires a string while the store
                // is still idle (e.g. boot path that didn't go through
                // compileGate.queue), open a cycle so the bar animates
                // instead of sitting at 0.
                const cp = useCompileProgress.getState();
                if (msg.status === false) {
                    cp.finish();
                } else if (typeof msg.status === 'string') {
                    if (cp.phase !== 'compiling') {
                        cp.start(msg.status, cp.estimateMs);
                    } else {
                        cp.setMessage(msg.status);
                    }
                }
                break;
            }
            case 'COMPILE_TIME':
                if (msg.duration) this._shadow.lastCompileDuration = msg.duration;
                if (this._onCompileTime) this._onCompileTime(msg.duration);
                FractalEvents.emit(FRACTAL_EVENTS.COMPILE_TIME, msg.duration);
                break;
            case 'SHADER_CODE':
                this._lastGeneratedFrag = msg.code;
                if (this._onShaderCode) this._onShaderCode(msg.code);
                FractalEvents.emit(FRACTAL_EVENTS.SHADER_CODE, msg.code);
                break;
            case 'SHADER_SOURCE_RESULT':
                this._resolveRequest(msg.id, this._pendingShaderSource, msg.code);
                break;
            case 'UNIFORMS_SNAPSHOT_RESULT':
                this._resolveRequest(msg.id, this._pendingUniformsSnapshot, msg.uniforms);
                break;
            case 'BOOTED':
                this._shadow.isBooted = true;
                if (msg.gpuInfo) this._gpuInfo = msg.gpuInfo;
                if (typeof msg.halfFloatAlphaSupport === 'boolean') {
                    this._halfFloatAlphaSupport = msg.halfFloatAlphaSupport;
                }
                // Notify listeners — used to push deferred state (uniforms, camera)
                // that was set in the store before the worker engine existed.
                if (this._onBootedCallback) this._onBootedCallback();
                FractalEvents.emit(FRACTAL_EVENTS.WORKER_BOOTED, undefined);
                break;
            case 'GPU_INFO':
                this._gpuInfo = msg.info;
                break;
            case 'RENDER_INFO':
                this._resolveRequest(msg.id, this._pendingRenderInfo, msg.info);
                break;
            case 'HISTOGRAM_RESULT':
                this._resolveRequest(msg.id, this._pendingHistograms, msg.data);
                break;
            case 'SNAPSHOT_RESULT':
                this._resolveRequest(msg.id, this._pendingSnapshots, msg.blob);
                break;
            case 'ENV_MAP_RESULT':
                this._resolveRequest(msg.id, this._pendingEnvMaps, msg.blob);
                break;
            case 'PICK_RESULT':
                this._resolveRequest(msg.id, this._pendingPicks,
                    msg.position ? new THREE.Vector3(msg.position[0], msg.position[1], msg.position[2]) : null);
                break;
            case 'FOCUS_RESULT':
                this._resolveRequest(msg.id, this._pendingFocusPicks, msg.distance);
                break;
            case 'ERROR':
                console.error('[WorkerProxy] Worker error:', msg.message);
                // If the worker reports an error before BOOTED arrives, this
                // is a boot failure — surface it so the splash can stop
                // pretending to load and show the user what went wrong.
                if (!this._shadow.isBooted) {
                    FractalEvents.emit(FRACTAL_EVENTS.WORKER_BOOT_FAILED, {
                        reason: msg.message || 'unknown worker error'
                    });
                } else {
                    // Post-boot worker error — almost always a shader
                    // compile/link failure from a late-registered or AI-pasted
                    // formula (renderWorker forwards CompileScheduler's
                    // COMPILE_FAILED as this ERROR postMessage). Previously this
                    // was only console.error'd; re-emit it on the main bus so UI
                    // such as the "Modify with AI" modal can show the GLSL log
                    // and offer a one-click "copy error for LLM".
                    this._compileCycleFailed = true;
                    this._lastCompileFailed = msg.message || 'unknown worker error';
                    FractalEvents.emit(FRACTAL_EVENTS.COMPILE_FAILED, {
                        reason: this._lastCompileFailed
                    });
                }
                break;
            case 'CONTEXT_LOST': {
                console.error('[WorkerProxy] WebGL context lost (GPU watchdog reset)');
                // Remember the crash for the NEXT boot so startup can come up in
                // a lighter "safe mode" instead of reloading straight back into
                // the heavy scene that crashed (→ black screen on refresh).
                try { sessionStorage.setItem('gmt.gpuCrashed', '1'); } catch { /* private mode */ }
                FractalEvents.emit(FRACTAL_EVENTS.RENDER_CONTEXT_LOST, {
                    reason: 'The GPU stopped responding while rendering (too heavy a frame for this device).',
                });
                break;
            }
            case 'CONTEXT_RESTORED':
                console.info('[WorkerProxy] WebGL context restored');
                break;

            // ─── Video Export ───
            case 'EXPORT_READY':
                if (this._exportStartTimer) { clearTimeout(this._exportStartTimer); this._exportStartTimer = null; }
                if (this._exportReady) this._exportReady();
                break;
            case 'EXPORT_FRAME_DONE':
                // Update shadow distance so focus lock can track during export
                this._shadow.lastMeasuredDistance = msg.measuredDistance;
                if (this._exportFrameDone) this._exportFrameDone({ frameIndex: msg.frameIndex, progress: msg.progress, measuredDistance: msg.measuredDistance });
                break;
            case 'EXPORT_HEARTBEAT':
                // Liveness only — the frame is still rendering. Re-arm the stall window.
                this._kickExportFrameWatchdog();
                break;
            case 'EXPORT_COMPLETE':
                this._isExporting = false;
                if (this._exportFinishTimer) { clearTimeout(this._exportFinishTimer); this._exportFinishTimer = null; }
                if (this._exportComplete) this._exportComplete(msg.blob ?? null);
                break;
            case 'EXPORT_ERROR':
                this._isExporting = false;
                if (this._exportStartTimer) { clearTimeout(this._exportStartTimer); this._exportStartTimer = null; }
                if (this._exportFinishTimer) { clearTimeout(this._exportFinishTimer); this._exportFinishTimer = null; }
                console.error('[WorkerProxy] Export error:', msg.message);
                // Route to the frame pump FIRST when a frame is in flight. The
                // worker posts EXPORT_ERROR for a failed frame render
                // ('Frame render failed: …'), but by then `_exportError` belongs
                // to startExport's already-settled promise, so calling it is a
                // silent no-op and `renderExportFrame` — which then had no timeout —
                // hung forever. Probe-confirmed against this class.
                if (this._exportFrameFail) { const f = this._exportFrameFail; this._exportFrameFail = null; f(msg.message); }
                else if (this._exportError) { const f = this._exportError; this._exportError = null; f(msg.message); }
                break;

            // ─── Bucket Render ───
            case 'BUCKET_STATUS':
                this._isBucketRendering = msg.isRendering;
                FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, {
                    isRendering: msg.isRendering,
                    progress: msg.progress,
                    totalBuckets: msg.totalBuckets,
                    currentBucket: msg.currentBucket
                });
                break;
            case 'BUCKET_IMAGE':
                this._handleBucketImage(msg);
                break;
        }
    }

    /**
     * Pre-worker outbox — messages posted while `_worker` is null (before
     * {@link initWorkerMode}, or after a crash / terminate) are queued here and
     * flushed at the next worker creation, before INIT, by {@link _flushOutbox}.
     *
     * DO NOT TREAT THIS AS A GENERAL PRE-BOOT SAFETY NET. It only stops the
     * message being dropped on the MAIN side; it does not get it applied. The
     * worker defers all engine construction to BOOT (see `handleInit` /
     * `setupEngine` in `renderWorker.ts`), so anything flushed before INIT lands
     * while `engine` is still null, and every handler except `REGISTER_FORMULA`
     * (writes the registry directly) and `RESIZE` (stashes `_pendingResize`) is
     * an `engine?.` no-op. UNIFORM / CONFIG / TEXTURE / PAUSE / SET_SAMPLE_CAP /
     * RESET_ACCUM / OFFSET_* queued here are delivered and then silently
     * discarded. That is why every real pre-boot payload has its own replay:
     * {@link _registeredFormulas}, {@link pendingTextures},
     * {@link pendingTeleport}, and the `onBooted` re-push in
     * `engine-gmt/renderer/install.ts`. Add a replay, don't rely on this.
     *
     * Measured 2026-07-27 on an app-gmt boot: the outbox is EMPTY at both
     * creation sites — nothing posts before `initWorkerMode` today.
     *
     * @invariant Flushed exactly once per worker, at creation, before INIT.
     */
    private _outbox: Array<{ msg: MainToWorkerMessage; transfer?: Transferable[] }> = [];

    /**
     * Custom formulas (MB3D-hybrid / Workshop) registered via {@link registerFormula}.
     * The worker's formula registry is PER-WORKER and starts EMPTY, so on every
     * worker (re)creation — initWorkerMode + restart() (+ crash-recovery, which
     * re-creates via one of those) — this map is replayed BEFORE INIT
     * ({@link _replayFormulas}). Persistent (never cleared) so a restarted worker
     * can never be asked to compile a formula it lacks.
     *
     * Why not the one-shot outbox: Firefox's synchronous compile blocks BOOTED, so
     * the boot flow cancels + restarts to interrupt it (bootWithConfig → restart).
     * The restart makes a FRESH worker, but the outbox had already been consumed by
     * the first worker → the second worker never got the formula → fallback sphere.
     * A replayed map fixes it regardless of how many times Firefox restarts.
     */
    private _registeredFormulas: Map<string, Extract<MainToWorkerMessage, { type: 'REGISTER_FORMULA' }>['shader']> = new Map();

    /** Post a typed message to the render worker (queued in _outbox if the worker
     *  isn't created yet — see {@link _outbox}). */
    post(msg: MainToWorkerMessage, transfer?: Transferable[]) {
        if (!this._worker) {
            this._outbox.push({ msg, transfer });
            return;
        }
        if (transfer) this._worker.postMessage(msg, transfer);
        else this._worker.postMessage(msg);
    }

    /** Drain the pre-boot outbox to the freshly-created worker, in FIFO order.
     *  Called at both worker-creation sites BEFORE the INIT message. */
    private _flushOutbox() {
        if (!this._worker || this._outbox.length === 0) return;
        const queued = this._outbox;
        this._outbox = [];
        for (const { msg, transfer } of queued) {
            if (transfer) this._worker.postMessage(msg, transfer);
            else this._worker.postMessage(msg);
        }
    }

    /** Replay all registered custom formulas to the current worker, BEFORE INIT, so
     *  a freshly-created worker (initial boot OR a Firefox restart / crash-recovery)
     *  has them in its registry ahead of the boot compile. */
    private _replayFormulas() {
        if (!this._worker || this._registeredFormulas.size === 0) return;
        for (const [id, shader] of this._registeredFormulas) {
            this._worker.postMessage({ type: 'REGISTER_FORMULA', id, shader });
        }
    }

    // ─── Timeout & Request Helpers ──────────────────────────────────────

    /** Create a pending request: register in map, post message, set timeout fallback. */
    private _pendingRequest<T>(
        pendingMap: Map<string, (value: T) => void>,
        msg: (id: string) => MainToWorkerMessage,
        fallback: T,
        timeoutMs: number
    ): Promise<T> {
        const id = crypto.randomUUID();
        return new Promise<T>((resolve) => {
            pendingMap.set(id, resolve);
            this.post(msg(id));
            this._pendingTimeouts.set(id, setTimeout(() => {
                this._pendingTimeouts.delete(id);
                if (pendingMap.has(id)) { pendingMap.delete(id); resolve(fallback); }
            }, timeoutMs));
        });
    }

    /** Resolve a pending request by id, cancel its timeout, and clean up. */
    private _resolveRequest<T>(id: string, pendingMap: Map<string, (value: T) => void>, value: T) {
        const resolve = pendingMap.get(id);
        if (resolve) {
            resolve(value);
            pendingMap.delete(id);
        }
        const timer = this._pendingTimeouts.get(id);
        if (timer) {
            clearTimeout(timer);
            this._pendingTimeouts.delete(id);
        }
    }

    /** Clear all pending timeouts — called on crash and restart. */
    private _clearAllTimers() {
        this._pendingTimeouts.forEach(timer => clearTimeout(timer));
        this._pendingTimeouts.clear();
        if (this._exportStartTimer) { clearTimeout(this._exportStartTimer); this._exportStartTimer = null; }
        if (this._exportFinishTimer) { clearTimeout(this._exportFinishTimer); this._exportFinishTimer = null; }
        this._disarmExportFrameWatchdog();
    }

    // ─── Error Recovery ────────────────────────────────────────────────

    private _onCrash: ((reason: string) => void) | null = null;
    set onCrash(cb: ((reason: string) => void) | null) { this._onCrash = cb; }
    set onBooted(cb: (() => void) | null) { this._onBootedCallback = cb; }

    private _handleWorkerCrash(reason: string) {
        console.error(`[WorkerProxy] Worker crashed: ${reason}. Terminating worker.`);
        const wasBooted = this._shadow.isBooted;
        if (this._worker) {
            this._worker.terminate();
            this._worker = null;
        }
        this._clearAllTimers();
        // Clear pending promises
        this._pendingSnapshots.forEach(resolve => resolve(null as any));
        this._pendingSnapshots.clear();
        this._pendingPicks.forEach(resolve => resolve(null));
        this._pendingPicks.clear();
        this._pendingFocusPicks.forEach(resolve => resolve(-1));
        this._pendingFocusPicks.clear();
        this._pendingHistograms.forEach(resolve => resolve(new Float32Array(0)));
        this._pendingHistograms.clear();
        this._pendingShaderSource.forEach(resolve => resolve(null));
        this._pendingShaderSource.clear();
        this._pendingUniformsSnapshot.forEach(resolve => resolve(null));
        this._pendingUniformsSnapshot.clear();
        this._pendingRenderInfo.forEach(resolve => resolve(null));
        this._pendingRenderInfo.clear();
        // Reject pending export promises.
        //
        // This block used to null the callbacks WITHOUT invoking them, under
        // this same comment. Because `_clearAllTimers()` above has already
        // killed `_exportStartTimer` and `_exportFinishTimer` — the only other
        // settlement paths — and `_worker` is now null so no message can ever
        // arrive, that left startExport/finishExport/renderExportFrame pending
        // FOREVER. Demonstrated with a probe against this class: the promise
        // stays PENDING with every timer disarmed. The user-visible result is a
        // render dialog frozen mid-export whose Stop and Discard buttons are
        // both inert (the pump only reads their refs at the top of its loop,
        // which it never reaches again) and whose close button is disabled by
        // `disableClose={isRendering}`; `isExporting` also stayed true, keeping
        // the movement lock on.
        //
        // Rejecting is safe: all five call sites are in exportRunner.ts and all
        // five sit inside try/catch/finally, so the runner surfaces the error
        // and its `finally` clears isRendering and emits BUCKET_STATUS.
        this._isExporting = false;
        const err = `Worker crashed: ${reason}`;
        if (this._exportError) { const f = this._exportError; this._exportError = null; f(err); }
        if (this._exportFrameFail) { const f = this._exportFrameFail; this._exportFrameFail = null; f(err); }
        this._exportReady = null;
        this._exportComplete = null;
        this._exportFrameDone = null;
        if (this._onCrash) this._onCrash(reason);
        // If the worker died before it ever booted, this is a boot
        // failure — splash subscribes to surface it as an error panel
        // instead of waiting forever for `isBooted`.
        if (!wasBooted) {
            FractalEvents.emit(FRACTAL_EVENTS.WORKER_BOOT_FAILED, { reason });
        }
    }

    /** Terminate the worker */
    terminateWorker() {
        this._handleWorkerCrash('Manual termination');
    }

    // ─── Shadow State Accessors ──────────────────────────────────────────

    get isBooted() { return this._shadow.isBooted; }
    get isCompiling() { return this._shadow.isCompiling; }
    get isExporting() { return this._isExporting; }
    get isBucketRendering() { return this._isBucketRendering; }
    get sceneOffset() { return this._localOffset; }
    get lastGeneratedFrag() { return this._lastGeneratedFrag; }
    /**
     * @invariant Mirror of the worker's sample index, refreshed ONLY on FRAME_READY.
     * The convergence-stop gate (GmtRendererTickDriver) reads this to decide whether
     * the path-traced image is settled. Any reset (compile, RESET_ACCUM, offset
     * teleport) MUST drop this to 0 via invalidateConvergedMirror() — otherwise it
     * stays pinned at the old cap and the gate stops requesting frames (stuck-on-first-
     * frame deadlock, only cleared by a camera move).
     */
    get accumulationCount() { return this._shadow.accumulationCount; }
    /** Read-only diagnostic (present-path workstream): cumulative adaptive FBO resizes. */
    get fboResizes() { return this._shadow.fboResizes ?? 0; }
    get convergenceValue() { return this._shadow.convergenceValue; }
    get frameCount() { return this._shadow.frameCount; }
    get lastCompileDuration() { return this._shadow.lastCompileDuration; }
    get lastMeasuredDistance() { return this._shadow.lastMeasuredDistance; }
    set lastMeasuredDistance(v: number) { this._shadow.lastMeasuredDistance = v; }
    get centerIsSky() { return this._shadow.centerIsSky; }
    set centerIsSky(v: boolean) { this._shadow.centerIsSky = v; }
    get hasCompiledShader() { return this._shadow.hasCompiledShader; }
    /**
     * The worker's error for the most recent compile cycle, or null after a
     * cycle that ended clean. `hasCompiledShader` means a compile was ISSUED
     * (it is set before the link result on purpose — see CompileScheduler);
     * this is the "did it actually succeed" half, kept separate so the
     * latch's concurrency role is untouched.
     *
     * @invariant Non-null from the worker's ERROR postMessage (post-boot)
     *   until the next compile cycle ends without one.
     *   — proven by: npm run smoke:compile-failed ("proxy.lastCompileFailed
     *   names the broken marker", "proxy.lastCompileFailed is null again
     *   after a good compile"). Falsified 2026-09-02 by removing the
     *   assignment in the ERROR case: the first assertion went red.
     */
    get lastCompileFailed(): string | null { return this._lastCompileFailed; }
    get dirty() { return this._shadow.dirty; }
    set dirty(v: boolean) { if (v) this.post({ type: 'SET_DIRTY' }); }
    get isPaused() { return this._shadow.isPaused; }
    set isPaused(v: boolean) { this.post({ type: 'PAUSE', paused: v }); }
    get shouldSnapCamera() { return false; }
    set shouldSnapCamera(v: boolean) { if (v) this.post({ type: 'SNAP_CAMERA' }); }
    /**
     * Stashed teleport payload from applyPresetState — consumed by WorkerTickScene
     * at boot-ready time to sync Navigation. Avoids reading potentially drifted
     * store values and eliminates race with Navigation mount timing.
     */
    pendingTeleport: CameraState | null = null;

    /**
     * Stashed texture payloads from a pre-boot scene hydration (e.g. a share
     * URL applied at module-eval time, before the worker boots). The TEXTURE
     * event is dropped if it fires while `!isBooted`, and image params are NOT
     * carried in the BOOT config (syncConfigUniforms skips them) — so without
     * this stash an env HDR / color texture loaded from a shared scene never
     * reaches the worker and the sky renders black. GmtRendererTickDriver
     * drains this in finalize(), mirroring pendingTeleport.
     */
    pendingTextures: Map<'color' | 'env', string | null> = new Map();

    // ADR-0061 P5 — the gizmo drag is the InteractionSession's `gizmo` source
    // now (the `isGizmoInteracting` shadow was removed with the dual flag).
    // `cameraInUse` here is NOT the removed hold-gate field — it's a write-only
    // MARK_INTERACTION wake pulse Navigation fires on camera interaction (feeds
    // the idle-pause `lastInteractionTime` wake term the ADR keeps). Getter is a
    // stub; the persistent activity signal crosses via the renderState session.
    get cameraInUse() { return false; }
    set cameraInUse(v: boolean) { if (v) this.post({ type: 'MARK_INTERACTION' }); }

    // ─── Methods ─────────────────────────────────────────────────────────

    /** Whether a BOOT message has been sent (worker may still be compiling) */
    private _bootSent = false;
    get bootSent() { return this._bootSent; }

    /**
     * @invariant Automatically `restart()`s when `_bootSent` is already
     *   true — the sole way to cancel a Firefox synchronous-compile
     *   pipeline mid-flight. Requires `_container` and `_lastInitArgs`
     *   to have been stashed during the first init. See ADR-0041.
     */
    bootWithConfig(config: ShaderConfig, initialCamera?: { position: [number, number, number]; quaternion: [number, number, number, number]; fov: number }) {
        // If a boot was already sent (worker is likely compiling — especially on Firefox
        // where the synchronous compile blocks the worker from sending BOOTED back),
        // terminate and restart. There's no API to cancel a synchronous GL compile.
        if (this._bootSent) {
            console.log('[WorkerProxy] Boot already in progress — restarting worker');
            this._bootSent = false;
            this.restart(config, initialCamera);
            this.post({ type: 'BOOT', config, camera: initialCamera });
            this._bootSent = true;
            return;
        }
        this.post({ type: 'BOOT', config, camera: initialCamera });
        this._bootSent = true;
    }

    setUniform(key: string, value: unknown, noAccumReset = false) {
        this.post({ type: 'UNIFORM', key, value, noAccumReset });
    }

    setPreviewSampleCap(n: number) {
        this.post({ type: 'SET_SAMPLE_CAP', n });
    }

    resetAccumulation() {
        this.invalidateConvergedMirror();
        this.post({ type: 'RESET_ACCUM' });
    }

    /**
     * Drop the converged-mirror (`_shadow.accumulationCount`) back to 0 so the
     * convergence-stop gate in GmtRendererTickDriver re-arms IMMEDIATELY after a
     * reset — instead of waiting for the next FRAME_READY to refresh it.
     *
     * WHY this is load-bearing: `_shadow.accumulationCount` is updated in exactly
     * one place — the FRAME_READY handler — and the worker posts FRAME_READY ONLY
     * in response to a RENDER_TICK. A reset (RESET_ACCUM, compile, offset teleport)
     * zeroes the worker's real count but posts no frame, so the mirror stays pinned
     * at the old sample cap. The gate then reads `accumulationCount >= cap` →
     * `converged` → stops sending ticks → the worker never renders → never reports a
     * fresh count → DEADLOCK ("stuck on the first frame") until a camera move forces a
     * tick. Zeroing here keeps `converged` false until a genuine fresh FRAME_READY
     * re-confirms it. FRAME_READY does a full `_shadow = msg.state` replace, so the
     * true value is restored the instant the worker renders again — worst case the
     * gate sends one redundant tick.
     */
    invalidateConvergedMirror() {
        this._shadow.accumulationCount = 0;
    }

    markInteraction() {
        this.post({ type: 'MARK_INTERACTION' });
    }

    updateTexture(type: 'color' | 'env', dataUrl: string | null) {
        if (dataUrl) {
            // Detect HDR/RGBE format: header starts with "#?" → base64 "Iz8" or "Iz9"
            const b64Start = dataUrl.indexOf(';base64,');
            const b64Data = b64Start >= 0 ? dataUrl.substring(b64Start + 8, b64Start + 12) : '';
            const isHDR = dataUrl.startsWith('data:image/vnd.radiance') ||
                          dataUrl.startsWith('data:image/x-hdr') ||
                          b64Data.startsWith('Iz8') || b64Data.startsWith('Iz9') ||
                          // HTTP URLs ending in .hdr (gallery-stored Radiance files).
                          /\.hdr(?:\?|#|$)/i.test(dataUrl);

            if (isHDR) {
                // HDR: send raw ArrayBuffer for RGBE parsing in worker
                fetch(dataUrl)
                    .then(r => r.arrayBuffer())
                    .then(buffer => {
                        this.post({ type: 'TEXTURE_HDR', textureType: type, buffer }, [buffer]);
                    })
                    .catch(e => console.error('[WorkerProxy] HDR texture transfer failed:', e));
            } else {
                // LDR: convert to ImageBitmap and transfer
                fetch(dataUrl)
                    .then(r => r.blob())
                    .then(blob => createImageBitmap(blob, { premultiplyAlpha: 'none', imageOrientation: 'flipY' }))
                    .then(bitmap => {
                        this.post({ type: 'TEXTURE', textureType: type, bitmap }, [bitmap]);
                    })
                    .catch(e => console.error('[WorkerProxy] Texture transfer failed:', e));
            }
        } else {
            this.post({ type: 'TEXTURE', textureType: type, bitmap: null });
        }
    }

    /**
     * Queue an offset to be sent atomically with the next RENDER_TICK.
     * Used by orbit absorb: camera.position is zeroed immediately on the main thread,
     * and the absorbed offset is embedded in the next RENDER_TICK so the worker sees
     * camera=(0,0,0) + new offset in the same message — no 1-frame mismatch.
     */
    private _pendingOffsetSync: SerializedOffset | null = null;

    queueOffsetSync(offset: { x: number; y: number; z: number; xL: number; yL: number; zL: number }) {
        this._pendingOffsetSync = { x: offset.x, y: offset.y, z: offset.z, xL: offset.xL, yL: offset.yL, zL: offset.zL };
        // Update local offset immediately so gizmo overlays are correct
        this.setShadowOffset(offset);
    }

    /**
     * Replace the offset immediately (for OFFSET_SET events — teleports, mode switches).
     * Sets guard to prevent FRAME_READY from overwriting until the worker catches up.
     *
     * Guard clears via the drift-converged check in the FRAME_READY handler
     * (when the worker's reported offset matches what we set, within 0.001).
     * No timeout fallback — earlier 2s auto-clear was defensive paranoia
     * that, in the slow-boot worst case, could fire BEFORE the worker
     * rendered its first post-set frame and let stale FRAME_READY data
     * overwrite _localOffset (F15). The drift check is the deterministic
     * guard; if the worker hangs entirely, the gizmo overlay staying at
     * the user's last set offset is the correct behaviour.
     */
    setShadowOffset(offset: { x: number; y: number; z: number; xL: number; yL: number; zL: number }) {
        this._localOffset = { ...offset };
        this._offsetGuarded = true;
    }

    /**
     * Apply an offset shift to the worker only (fly mode movement).
     * Does NOT update _localOffset — that's synced from FRAME_READY instead,
     * keeping the gizmo overlay aligned with the rendered image.
     */
    applyOffsetShift(_dx: number, _dy: number, _dz: number) {
        // No-op on main thread. The worker receives OFFSET_SHIFT via post()
        // and reports its offset back in FRAME_READY, which updates _localOffset.
    }

    resolveLightPosition(currentPos: { x: number; y: number; z: number }, _wasFixed: boolean) {
        return currentPos;
    }

    measureDistanceAtScreenPoint(_x: number, _y: number, _renderer: THREE.WebGLRenderer, _camera: THREE.Camera) {
        return this._shadow.lastMeasuredDistance;
    }

    pickWorldPosition(x: number, y: number): THREE.Vector3 | null;
    pickWorldPosition(x: number, y: number, async: true, fast?: boolean): Promise<THREE.Vector3 | null>;
    pickWorldPosition(x: number, y: number, async?: boolean, fast?: boolean): THREE.Vector3 | null | Promise<THREE.Vector3 | null> {
        if (!async) return null;
        return this._pendingRequest(this._pendingPicks,
            id => ({ type: 'PICK_WORLD_POSITION', id, x, y, fast: fast || undefined }),
            null, 5000);
    }

    /** Start focus picking: captures depth snapshot from current frame. */
    startFocusPick(x: number, y: number): Promise<number> {
        return this._pendingRequest(this._pendingFocusPicks,
            id => ({ type: 'FOCUS_PICK_START', id, x, y }), -1, 5000);
    }

    /** Sample from the captured depth snapshot at (x, y). No re-rendering needed. */
    sampleFocusPick(x: number, y: number): Promise<number> {
        return this._pendingRequest(this._pendingFocusPicks,
            id => ({ type: 'FOCUS_PICK_SAMPLE', id, x, y }), -1, 2000);
    }

    /** End focus picking and discard the depth snapshot. */
    endFocusPick() {
        this.post({ type: 'FOCUS_PICK_END' });
    }

    captureSnapshot(): Promise<Blob | null> {
        return this._pendingRequest(this._pendingSnapshots as Map<string, (v: Blob | null) => void>,
            id => ({ type: 'CAPTURE_SNAPSHOT', id }), null, 10000);
    }

    captureEnvMap(maxEdge: number = 1024): Promise<Blob | null> {
        return this._pendingRequest(this._pendingEnvMaps,
            id => ({ type: 'CAPTURE_ENV_MAP', id, maxEdge }), null, 10000);
    }

    get gpuInfo(): string {
        return this._gpuInfo || 'Generic WebGL Device';
    }

    requestHistogramReadback(source: 'geometry' | 'color'): Promise<Float32Array> {
        return this._pendingRequest(this._pendingHistograms,
            id => ({ type: 'HISTOGRAM_READBACK', id, source }), new Float32Array(0), 5000);
    }

    getCompiledFragmentShader(): Promise<string | null> {
        return this._pendingRequest(this._pendingShaderSource,
            id => ({ type: 'GET_SHADER_SOURCE', id, variant: 'compiled' } as any), null, 5000);
    }

    getTranslatedFragmentShader(): Promise<string | null> {
        return this._pendingRequest(this._pendingShaderSource,
            id => ({ type: 'GET_SHADER_SOURCE', id, variant: 'translated' } as any), null, 5000);
    }

    /** Snapshot the live mainUniforms map. Used by debug tools (bench-shader) to
     *  replay the engine's exact uniform state in an isolated WebGL2 harness. */
    getUniformsSnapshot(): Promise<Record<string, any> | null> {
        return this._pendingRequest(this._pendingUniformsSnapshot,
            id => ({ type: 'GET_UNIFORMS_SNAPSHOT', id } as any), null, 5000);
    }

    /** Snapshot of THREE.WebGLRenderer.info plus bench-only readRenderTargetPixels
     *  / setRenderTarget counters. Used by bench-perf to diff scenario start →
     *  scenario end and attribute draw calls / RT switches per scenario. */
    getRenderInfo(): Promise<any | null> {
        return this._pendingRequest(this._pendingRenderInfo,
            id => ({ type: 'GET_RENDER_INFO', id } as any), null, 3000);
    }

    /** Toggle the worker's viewport convergence pass on/off. RegionOverlay
     *  is the sole consumer of `convergenceValue`; when it isn't mounted
     *  the measurement (one render + two setRenderTarget swaps + one sync
     *  readPixels every 8 accumulation samples) is wasted GPU work. */
    setConvergenceNeeded(needed: boolean) {
        this.post({ type: 'SET_CONVERGENCE_NEEDED', needed } as any);
    }
    /**
     * Returns the worker's half-float-alpha capability. The worker probes
     * `FractalEngine.checkHalfFloatAlphaSupport()` on boot and ships the
     * result in the `BOOTED` payload; this getter returns the cached value.
     * Defaults to `true` until BOOTED arrives — callers that need a strict
     * answer should wait for `WORKER_BOOTED`. The real fallback is enforced
     * worker-side in `RenderPipeline.initTargets`, so a main-side miss is
     * informational only.
     */
    checkHalfFloatAlphaSupport(): boolean { return this._halfFloatAlphaSupport; }

    // ─── Worker communication ────────────────────────────────────────────

    /**
     * @invariant `modulations` ships on EVERY tick, including when empty. The
     *   dict is the frame's COMPLETE set and the worker replaces its copy
     *   wholesale — sending it only when non-empty would leave a target that
     *   stopped being modulated frozen at its last offset, since nothing else
     *   ever clears the worker's dict. Same drop-out hazard `setOwnedUniforms`
     *   guards for uniform names.
     * @invariant Must be read AFTER the ANIMATE tick phase has run, which is
     *   where `AnimationSystem` fills the dict. GmtRendererTickDriver's
     *   `runTicks()` precedes its dispatch block, so this holds.
     */
    sendRenderTick(camera: SerializedCamera, offset: SerializedOffset, delta: number, renderState: Partial<EngineRenderState>) {
        const modulations = this.modulations;
        // If an offset sync is queued (from orbit absorb), embed it in this tick
        // so camera and offset arrive atomically — no 1-frame mismatch.
        if (this._pendingOffsetSync) {
            const syncOffset = this._pendingOffsetSync;
            this._pendingOffsetSync = null;
            this.post({ type: 'RENDER_TICK', camera, offset: syncOffset, delta, timestamp: performance.now(), renderState, syncOffset: true, modulations });
        } else {
            this.post({ type: 'RENDER_TICK', camera, offset, delta, timestamp: performance.now(), renderState, modulations });
        }
    }

    resizeWorker(width: number, height: number, dpr: number) {
        this.post({ type: 'RESIZE', width, height, dpr });
    }

    sendConfig(config: Partial<ShaderConfig>) {
        this.post({ type: 'CONFIG', config });
    }

    registerFormula(id: string, shader: { function: string; loopBody: string; loopInit?: string; getDist?: string; preamble?: string; preambleVars?: string[]; capabilities?: ReadonlySet<string>; derivedRotations?: DerivedRotationSpec[] }) {
        // Persist so it survives worker restarts (replayed at every creation —
        // _replayFormulas). Post immediately only when the worker already exists
        // (post-boot / runtime import); pre-boot registrations are delivered by the
        // creation-time replay, so they must NOT ride the one-shot outbox.
        this._registeredFormulas.set(id, shader);
        if (this._worker) this.post({ type: 'REGISTER_FORMULA', id, shader });
    }

    // ─── Video Export ────────────────────────────────────────────────

    /**
     * Start an export session on the worker.
     *
     * Video mode: pass a `WritableStream` (from `FileSystemFileHandle.createWritable()`) as the
     * second arg; the worker pipes encoded video chunks into it. `null` means RAM buffer.
     *
     * Image-sequence mode: pass a `FileSystemDirectoryHandle` as the third arg; the worker creates
     * and writes per-frame files inside that directory. `stream` is ignored in this mode.
     *
     * Returns a promise that resolves when the worker is ready to accept frames.
     */
    startExport(
        config: VideoExportConfig,
        stream: WritableStream | null,
        dirHandle?: FileSystemDirectoryHandle,
        audio?: { pcm: Float32Array; sampleRate: number; numFrames: number; durationSec: number }
    ): Promise<void> {
        this._isExporting = true;
        return new Promise((resolve, reject) => {
            // Clearing _exportError alongside _exportReady is load-bearing: leaving
            // this settled promise's rejecter in place is what made a later frame
            // error unreachable (see the EXPORT_ERROR handler).
            this._exportReady = () => { this._exportReady = null; this._exportError = null; resolve(); };
            this._exportError = (msg) => { this._exportError = null; reject(new Error(msg)); };

            // FileSystemWritableFileStream (from File System Access API) is NOT
            // transferable via postMessage, even though it extends WritableStream.
            // Wrap it in a plain WritableStream that proxies writes.
            let transferStream: WritableStream | null = null;
            if (stream) {
                // Keep the original FSWFS on the main thread; create a transferable proxy
                const fsStream = stream;
                transferStream = new WritableStream({
                    write(chunk) { return (fsStream as any).write(chunk); },
                    close() { return (fsStream as any).close(); },
                    abort(reason) { return (fsStream as any).abort(reason); }
                });
            }

            const transfer: Transferable[] = [];
            if (transferStream) transfer.push(transferStream);
            if (audio) transfer.push(audio.pcm.buffer);
            // FileSystemDirectoryHandle is structured-cloneable (since File System Access API landed
            // in workers), so it rides along in the message body without needing a transfer entry.
            this.post({ type: 'EXPORT_START', config, stream: transferStream, dirHandle, audio }, transfer);

            this._exportStartTimer = setTimeout(() => {
                this._exportStartTimer = null;
                if (this._exportReady) {
                    this._exportReady = null;
                    reject(new Error('Export start timed out'));
                }
            }, 10000);
        });
    }

    /**
     * Send a single frame to the worker for rendering + encoding.
     *
     * Resolves on EXPORT_FRAME_DONE. Rejects on EXPORT_ERROR, on a worker
     * crash, or when the stall watchdog trips — no EXPORT_HEARTBEAT and no
     * FRAME_DONE for `opts.stallMs` (default EXPORT_FRAME_STALL_MS). A trip
     * also `cancelExport()`s so the worker session does not outlive the
     * promise; the caller's failure path only has to report.
     *
     * @invariant With the watchdog armed the promise settles within `stallMs`
     *   of the last worker progress message — it can no longer pend forever on
     *   a dropped EXPORT_FRAME_DONE. Proven by: npm run
     *   smoke:export-watchdog ("A1 silent frame rejects within the
     *   window"). Falsified 2026-09-02 by removing the arm below: A1 and A2
     *   stayed PENDING.
     * @invariant Heartbeats extend the window, they do not count against it —
     *   a frame that keeps beating is never aborted however long it takes.
     *   Proven by the same smoke ("A2 stays pending while beating").
     */
    renderExportFrame(
        frameIndex: number,
        time: number,
        camera: SerializedCamera,
        offset: SerializedOffset,
        renderState: Partial<EngineRenderState>,
        modulations: Record<string, number>,
        opts?: { stallMs?: number }
    ): Promise<{ frameIndex: number; progress: number; measuredDistance: number }> {
        const stallMs = opts?.stallMs ?? EXPORT_FRAME_STALL_MS;
        return new Promise((resolve, reject) => {
            this._exportFrameDone = (data) => {
                this._disarmExportFrameWatchdog();
                this._exportFrameDone = null; this._exportFrameFail = null; resolve(data);
            };
            this._exportFrameFail = (msg) => {
                this._disarmExportFrameWatchdog();
                this._exportFrameDone = null; this._exportFrameFail = null; reject(new Error(msg));
            };
            // A previous frame's timer must never outlive its own promise.
            this._disarmExportFrameWatchdog();
            if (stallMs > 0) {
                this._exportFrameWatch = {
                    frameIndex, stallMs,
                    timer: setTimeout(() => this._tripExportFrameWatchdog(frameIndex, stallMs), stallMs),
                };
            }
            this.post({
                type: 'EXPORT_RENDER_FRAME',
                frameIndex, time, camera, offset, renderState, modulations
            });
        });
    }

    /** Restart the stall window for the in-flight export frame. No-op when unarmed. */
    private _kickExportFrameWatchdog() {
        const w = this._exportFrameWatch;
        if (!w) return;
        clearTimeout(w.timer);
        w.timer = setTimeout(() => this._tripExportFrameWatchdog(w.frameIndex, w.stallMs), w.stallMs);
    }

    private _disarmExportFrameWatchdog() {
        if (this._exportFrameWatch) {
            clearTimeout(this._exportFrameWatch.timer);
            this._exportFrameWatch = null;
        }
    }

    /**
     * The window elapsed with no worker progress. Tear the session down AND
     * reject: rejecting alone would leave `exporter.active` true worker-side,
     * so the user's next export would be refused with 'Export already in
     * progress' until a reload. If the worker is wedged the CANCEL is handled
     * once it unblocks; if it dropped the frame the CANCEL is a no-op. Either
     * way `isExporting` drops now, releasing the movement lock. No retry —
     * the runner reports the failure and the user decides.
     */
    private _tripExportFrameWatchdog(frameIndex: number, stallMs: number) {
        this._exportFrameWatch = null;
        const fail = this._exportFrameFail;
        if (!fail) return; // settled between the timer firing and this running
        this.cancelExport();
        const secs = Math.round(stallMs / 1000);
        fail(`Export frame ${frameIndex} stalled — no progress from the render worker for ${secs || stallMs / 1000} s`);
    }

    /**
     * Finish the export: flush encoder, finalize muxer.
     * Returns blob ArrayBuffer for RAM mode, null for disk mode.
     */
    finishExport(): Promise<ArrayBuffer | null> {
        return new Promise((resolve, reject) => {
            this._exportComplete = (blob) => { this._exportComplete = null; resolve(blob); };
            this._exportError = (msg) => { this._exportError = null; reject(new Error(msg)); };
            this.post({ type: 'EXPORT_FINISH' });

            this._exportFinishTimer = setTimeout(() => {
                this._exportFinishTimer = null;
                if (this._exportComplete) {
                    this._exportComplete = null;
                    reject(new Error('Export finish timed out'));
                }
            }, 60000);
        });
    }

    /** Cancel an in-progress export */
    cancelExport() {
        this.post({ type: 'EXPORT_CANCEL' });
        this._isExporting = false;
    }

    // ─── Bucket Render ────────────────────────────────────────────────

    startBucketRender(
        exportImage: boolean,
        config: BucketRenderConfig,
        exportData?: { preset: object; name: string; version: number }
    ) {
        this._isBucketRendering = true;
        this.post({
            type: 'BUCKET_START',
            exportImage,
            config,
            exportData: exportData ? {
                preset: JSON.stringify(exportData.preset),
                name: exportData.name,
                version: exportData.version
            } : undefined
        });
    }

    stopBucketRender() {
        this.post({ type: 'BUCKET_STOP' });
        this._isBucketRendering = false;
    }

    /**
     * Enter Preview Region mode: live, uniform-only zoom into a sub-rect of the export image
     * at export pixel density. Normal interaction (camera, params, sliders) continues to work
     * — each change resets accumulation and re-renders the preview naturally. Accumulation
     * is capped at `sampleCap` (the user's Samples setting). Exit with
     * `clearPreviewRegion()`.
     */
    setPreviewRegion(
        region: { minX: number; minY: number; maxX: number; maxY: number },
        outputWidth: number,
        outputHeight: number,
        sampleCap: number
    ) {
        this.post({ type: 'PREVIEW_REGION_SET', region, outputWidth, outputHeight, sampleCap });
    }

    /** Exit Preview Region mode — reset UV uniforms + sample cap, resume normal viewport. */
    clearPreviewRegion() {
        this.post({ type: 'PREVIEW_REGION_CLEAR' });
    }

    /** Handle completed bucket image from worker — saves to disk via DOM */
    private async _handleBucketImage(msg: Extract<WorkerToMainMessage, { type: 'BUCKET_IMAGE' }>) {
        const { pixels, width, height, presetJson, filename, multiTile } = msg;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = new ImageData(new Uint8ClampedArray(pixels.buffer as ArrayBuffer), width, height);
        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            try {
                // Empty presetJson = caller (BucketRunner) opted out of
                // embedding scene metadata for this render.
                const taggedBlob = presetJson
                    ? await injectMetadata(blob, "FractalData", presetJson)
                    : blob;
                const url = URL.createObjectURL(taggedBlob);
                const link = document.createElement('a');
                link.download = filename;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
                // Notify listeners that a completed render is available —
                // the gallery plugin uses this to offer a "submit to gallery"
                // prompt with the rendered image as the source blob.
                FractalEvents.emit(FRACTAL_EVENTS.BUCKET_RENDER_COMPLETE, {
                    blob: taggedBlob,
                    filename,
                    width,
                    height,
                    multiTile,
                });
            } catch (e) {
                console.error("Failed to inject GMF metadata into render PNG", e);
                // The embed was requested (non-empty presetJson) but failed.
                // We still save the image — losing the render is worse — but the
                // PNG will NOT reopen as a scene, so say so loudly rather than
                // handing the user a silently-stripped file that looks fine.
                if (presetJson) {
                    showToast(
                        'Render saved, but scene data (GMF) could not be embedded — this PNG won’t reopen as a scene.',
                        'error',
                        6000,
                    );
                }
                const link = document.createElement('a');
                link.download = filename;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        }, 'image/png');
    }
}

// Singleton proxy
let _proxy: WorkerProxy | null = null;

export function getProxy(): WorkerProxy {
    if (!_proxy) _proxy = new WorkerProxy();
    return _proxy;
}
