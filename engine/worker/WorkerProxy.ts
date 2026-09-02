/**
 * WorkerProxy — stub implementation after engine-extraction.
 *
 * In GMT this class fronted a Web Worker that owned FractalEngine +
 * OffscreenCanvas. The engine extraction stripped the render worker
 * wholesale; this stub preserves the API surface so downstream consumers
 * (store slices, UI components) compile without cascading edits.
 *
 * Apps that want real worker offload re-install it by subclassing or
 * replacing this singleton with their own Worker-backed implementation.
 *
 * Runtime behavior: most methods are no-ops. `post()` does nothing, picks
 * return null, histograms return empty arrays, exports reject immediately.
 * The shadow-state getters return inert defaults so UI doesn't crash.
 */

import * as THREE from 'three';
import type { ShaderConfig } from '../ShaderFactory';
import type { CameraState } from '../../types/common';
import type { AccumulationController } from '../AccumulationController';

// Local type stubs for what used to come from FractalEngine / BucketRenderer.
// Kept deliberately opaque — apps that re-introduce a render engine will
// replace them with their own richer types.
export type EngineRenderState = Record<string, unknown>;
export type BucketRenderConfig = {
    bucketSize: number;
    outputWidth: number;
    outputHeight: number;
    tileCols: number;
    tileRows: number;
    accumulation: boolean;
    samplesPerBucket: number;
};
export type SerializedCamera = {
    position: [number, number, number];
    quaternion: [number, number, number, number];
    fov: number;
};
export type SerializedOffset = { x: number; y: number; z: number; xL: number; yL: number; zL: number };

export class WorkerProxy implements AccumulationController {
    // Inert refs — UI code guards on truthiness
    readonly activeCamera: THREE.PerspectiveCamera | null = null;
    readonly virtualSpace: unknown | null = null;
    readonly renderer: THREE.WebGLRenderer | null = null;
    readonly pipeline: unknown | null = null;

    // Shadow state
    private _shadow = {
        isBooted: false,
        isCompiling: false,
        hasCompiledShader: false,
        isPaused: false,
        dirty: false,
        lastCompileDuration: 0,
        lastMeasuredDistance: 1,
        accumulationCount: 0,
        convergenceValue: 1.0,
        frameCount: 0,
    };
    private _localOffset: SerializedOffset = { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
    private _gpuInfo = '';
    private _halfFloatAlphaSupport = true;
    private _lastGeneratedFrag = '';
    private _isBucketRendering = false;
    private _isExporting = false;
    private _bootSent = false;

    // Callback slots
    private _onCompiling: ((status: boolean | string) => void) | null = null;
    private _onCompileTime: ((duration: number) => void) | null = null;
    private _onShaderCode: ((code: string) => void) | null = null;
    private _onBootedCallback: (() => void) | null = null;
    private _onWorkerFrame: (() => void) | null = null;
    private _onCrash: ((reason: string) => void) | null = null;

    /**
     * @assumption Public mutable field — direct writes are the supported
     *   API, not action dispatch. It is consumed on the MAIN thread, not by
     *   the worker: in GMT, `engine-gmt/store/cameraSlice.ts` stashes every
     *   CAMERA_TELEPORT here, and `engine-gmt/renderer/GmtRendererTickDriver.tsx`
     *   drains it once the worker reports boot-ready, re-emitting
     *   CAMERA_TELEPORT. The field is never transported over postMessage —
     *   `FractalEngine._pendingTeleport` is a separate, worker-local field fed
     *   by the in-worker event bus.
     */
    pendingTeleport: CameraState | null = null;

    /**
     * Modulation offsets set by AnimationSystem — the SECOND of modulation's
     * two paths to the shader.
     *
     * Most targets reach the GPU as a uniform write (`FRACTAL_EVENTS.UNIFORM`).
     * The ones here cannot: geometry pre/post/world rotation, camera
     * position/rotation and the light array are consumed by
     * `UniformManager.syncFrame`, which composes them into matrices and packed
     * arrays rather than reading a per-param uniform.
     *
     * @assumption Public mutable field — `AnimationSystem` REPLACES it every
     *   frame (not mutates), and the real proxy forwards it on every
     *   `sendRenderTick`. For years this field was written but never
     *   transported, so these targets modulated in a render export (where
     *   `EXPORT_RENDER_FRAME` did carry it) and did nothing in the live
     *   viewport. Any new sink here must ride the same message or it will
     *   reproduce that split. @see docs/adr/0107-live-modulation-transport.md
     */
    modulations: Record<string, number> = {};

    // ─── Lifecycle ──────────────────────────────────────────────────────

    initWorkerMode(
        _canvas: HTMLCanvasElement,
        _config: ShaderConfig,
        _width: number,
        _height: number,
        _dpr: number,
        _isMobile: boolean,
        _initialCamera?: { position: [number, number, number]; quaternion: [number, number, number, number]; fov: number }
    ) {
        // No-op: no worker to boot. Apps re-install via subclass.
    }

    restart(
        _newConfig: ShaderConfig,
        _initialCamera?: { position: [number, number, number]; quaternion: [number, number, number, number]; fov: number }
    ) {}

    /**
     * @assumption Stub synthesises immediate `isBooted = true` and invokes
     *   `onBooted` synchronously so generic UI doesn't spin forever on a
     *   "compiling" indicator. Real subclasses replacing this method must
     *   preserve the semantic if generic dev/ code waits on `onBooted`.
     */
    bootWithConfig(
        _config: ShaderConfig,
        _initialCamera?: { position: [number, number, number]; quaternion: [number, number, number, number]; fov: number }
    ) {
        this._bootSent = true;
        // Synthesize an immediate "booted" state so UI stops waiting
        this._shadow.isBooted = true;
        if (this._onBootedCallback) this._onBootedCallback();
    }

    terminateWorker() {}

    // ─── Callback registration ─────────────────────────────────────────

    set onCompiling(cb: ((status: boolean | string) => void) | null) { this._onCompiling = cb; }
    set onCompileTime(cb: ((duration: number) => void) | null) { this._onCompileTime = cb; }
    set onShaderCode(cb: ((code: string) => void) | null) { this._onShaderCode = cb; }
    set onBooted(cb: (() => void) | null) { this._onBootedCallback = cb; }
    set onCrash(cb: ((reason: string) => void) | null) { this._onCrash = cb; }
    registerFrameCounter(cb: (() => void) | null) { this._onWorkerFrame = cb; }

    // ─── Messaging (no-op in stub) ─────────────────────────────────────

    post(_msg: any, _transfer?: Transferable[]) {}

    // ─── Shadow state accessors ────────────────────────────────────────

    get isBooted() { return this._shadow.isBooted; }
    get isCompiling() { return this._shadow.isCompiling; }
    get isExporting() { return this._isExporting; }
    get isBucketRendering() { return this._isBucketRendering; }
    get sceneOffset() { return this._localOffset; }
    get lastGeneratedFrag() { return this._lastGeneratedFrag; }
    get accumulationCount() { return this._shadow.accumulationCount; }
    get convergenceValue() { return this._shadow.convergenceValue; }
    get frameCount() { return this._shadow.frameCount; }
    get lastCompileDuration() { return this._shadow.lastCompileDuration; }
    get lastMeasuredDistance() { return this._shadow.lastMeasuredDistance; }
    set lastMeasuredDistance(v: number) { this._shadow.lastMeasuredDistance = v; }
    get hasCompiledShader() { return this._shadow.hasCompiledShader; }
    /** engine-gmt's proxy reports the last compile cycle's error here; the
     *  stub has no worker and never fails a compile. */
    get lastCompileFailed(): string | null { return null; }
    get dirty() { return this._shadow.dirty; }
    set dirty(v: boolean) { this._shadow.dirty = v; }
    get isPaused() { return this._shadow.isPaused; }
    set isPaused(v: boolean) { this._shadow.isPaused = v; }
    /**
     * @assumption Setters accept values but are silently dropped; getters
     *   return hard false. UI code that toggles them on the stub loses
     *   the write.
     */
    get shouldSnapCamera() { return false; }
    set shouldSnapCamera(_v: boolean) {}
    // ADR-0061 P5 — gizmo drag is the InteractionSession's `gizmo` source now;
    // the `isGizmoInteracting` parity stub was removed with the dual flag.
    get cameraInUse() { return false; }
    set cameraInUse(_v: boolean) {}
    get bootSent() { return this._bootSent; }
    get gpuInfo(): string { return this._gpuInfo || 'Stub (no worker)'; }

    // ─── Commands (no-op in stub) ──────────────────────────────────────

    setUniform(_key: string, _value: unknown, _noAccumReset = false) {}
    setPreviewSampleCap(_n: number) {}
    resetAccumulation() {}
    markInteraction() {}
    updateTexture(_type: 'color' | 'env', _dataUrl: string | null) {}

    queueOffsetSync(offset: SerializedOffset) {
        this._localOffset = { ...offset };
    }

    setShadowOffset(offset: SerializedOffset) {
        this._localOffset = { ...offset };
    }

    applyOffsetShift(_dx: number, _dy: number, _dz: number) {}

    resolveLightPosition(currentPos: { x: number; y: number; z: number }, _wasFixed: boolean) {
        return currentPos;
    }

    measureDistanceAtScreenPoint(
        _x: number, _y: number,
        _renderer: THREE.WebGLRenderer, _camera: THREE.Camera
    ) {
        return this._shadow.lastMeasuredDistance;
    }

    // ─── Picks / probes (inert stubs) ──────────────────────────────────

    pickWorldPosition(x: number, y: number): THREE.Vector3 | null;
    pickWorldPosition(x: number, y: number, async: true, fast?: boolean): Promise<THREE.Vector3 | null>;
    pickWorldPosition(
        _x: number,
        _y: number,
        async?: boolean,
        _fast?: boolean,
    ): THREE.Vector3 | null | Promise<THREE.Vector3 | null> {
        if (!async) return null;
        return Promise.resolve(null as THREE.Vector3 | null);
    }

    startFocusPick(_x: number, _y: number): Promise<number> { return Promise.resolve(-1); }
    sampleFocusPick(_x: number, _y: number): Promise<number> { return Promise.resolve(-1); }
    endFocusPick() {}
    captureSnapshot(): Promise<Blob | null> { return Promise.resolve(null); }
    requestHistogramReadback(_source: 'geometry' | 'color'): Promise<Float32Array> {
        return Promise.resolve(new Float32Array(0));
    }
    getCompiledFragmentShader(): Promise<string | null> { return Promise.resolve(null); }
    getTranslatedFragmentShader(): Promise<string | null> { return Promise.resolve(null); }

    /**
     * Returns the cached half-float-alpha capability published by a real
     * worker on boot. The engine-core stub has no worker so it returns the
     * default (`true`) — subclasses with a real worker mirror the probe via
     * the BOOTED payload (see `engine-gmt/engine/worker/WorkerProxy.ts`).
     */
    checkHalfFloatAlphaSupport(): boolean { return this._halfFloatAlphaSupport; }

    // ─── Worker communication (no-op in stub) ──────────────────────────

    sendRenderTick(
        _camera: SerializedCamera,
        _offset: SerializedOffset,
        _delta: number,
        _renderState: Partial<EngineRenderState>
    ) {}

    resizeWorker(_width: number, _height: number, _dpr: number) {}
    sendConfig(_config: Partial<ShaderConfig>) {}

    registerFormula(
        _id: string,
        _shader: {
            function: string;
            loopBody: string;
            loopInit?: string;
            getDist?: string;
            preamble?: string;
            preambleVars?: string[];
            capabilities?: ReadonlySet<string>;
        }
    ) {}

    // ─── Export (inert — reject immediately) ───────────────────────────

    /**
     * @assumption Reject rather than no-op — callers must `.catch` or use
     *   `try/await`, otherwise the rejection surfaces as an unhandled
     *   promise. `cancelExport` flips `_isExporting = false` WITHOUT
     *   rejecting in-flight promises.
     */
    startExport(
        _config: unknown,
        _stream: WritableStream | null,
        _dirHandle?: FileSystemDirectoryHandle
    ): Promise<void> {
        return Promise.reject(new Error('Export not available: no render worker installed'));
    }

    renderExportFrame(
        _frameIndex: number,
        _time: number,
        _camera: SerializedCamera,
        _offset: SerializedOffset,
        _renderState: Partial<EngineRenderState>,
        _modulations: Record<string, number>
    ): Promise<{ frameIndex: number; progress: number; measuredDistance: number }> {
        return Promise.reject(new Error('Export not available: no render worker installed'));
    }

    finishExport(): Promise<ArrayBuffer | null> {
        return Promise.reject(new Error('Export not available: no render worker installed'));
    }

    cancelExport() { this._isExporting = false; }

    // ─── Bucket render (inert) ──────────────────────────────────────────

    startBucketRender(
        _exportImage: boolean,
        _config: BucketRenderConfig,
        _exportData?: { preset: object; name: string; version: number }
    ) {}

    stopBucketRender() {}

    setPreviewRegion(
        _region: { minX: number; minY: number; maxX: number; maxY: number },
        _outputWidth: number,
        _outputHeight: number,
        _sampleCap: number
    ) {}

    clearPreviewRegion() {}
}

// Singleton accessor with a registry override.
//
// The engine extraction left this stub in place so generic dev/ code
// (engineStore, components, hooks) compiles without a runtime engine.
// Apps that have a real Worker-backed engine (engine-gmt) install over
// the stub at boot via `setProxy()` (from `engine-gmt/renderer/install.ts`),
// so every `getProxy()` call made AFTER install — from generic dev/ code
// and from engine-gmt code alike — returns the SAME instance. Without
// this, the two singletons diverged: dev/ saw a perpetually-unbooted stub
// while engine-gmt operated the real worker.
//
// The registry only fixes late CALLS. A `const engine = getProxy()` at
// module scope still freezes whatever instance existed at module-eval
// time — see the @bug on `setProxy` below.
//
// Apps that don't install (fluid-toy, fractal-toy, test harnesses) get
// the no-op fallback — same behavior as before the registry.
let _proxy: WorkerProxy | null = null;

/**
 * @assumption Must run before any caller has captured a reference from
 *   `getProxy()` — otherwise different consumers can capture different
 *   references (stub vs real). Install at host-app boot.
 *
 * @bug PRODUCTION: that invariant is VIOLATED in app-gmt today, and the
 *   violation is structural rather than an ordering accident.
 *   `engine-gmt/renderer/install.ts` imports `store/engineStore` (line 32),
 *   so ESM evaluates `engineStore`'s body — including its module-scope
 *   `const engine = getProxy()` (`store/engineStore.ts:29`) and, via its own
 *   import of `./slices/historySlice`, `store/slices/historySlice.ts:43` —
 *   BEFORE `installGmtRenderer()` can ever run `setProxy()`. Both consts are
 *   therefore permanently bound to the no-op stub. Verified at runtime on
 *   `app-gmt.html`: the captured instance reports `gpuInfo === 'Stub (no
 *   worker)'`, `isBooted === false`, while `getProxy()` and `window.__gmtProxy`
 *   both return the booted real proxy.
 *   Known consequences:
 *     · `store/engineStore.ts:341` — `if (!engine.isBooted && !engine.bootSent)`
 *       is always true, so `loadScene` always takes the "initial startup"
 *       branch. The post-boot branch (compileGate spinner, full-config flush,
 *       OFFSET_SET push, CONFIG_DONE) is unreachable in app-gmt.
 *     · `store/slices/historySlice.ts:190` — the `engine.resetAccumulation()`
 *       on undo/redo restore is a no-op against the stub.
 *
 *   SEVERITY, MEASURED 2026-07-28 — the second consequence is MASKED, so this
 *   is latent rather than user-visible today. Probed on the running app:
 *   bracketed a `setCoreMath({paramA})` in a param transaction, let
 *   accumulation build to 3, then called `undo()`. The value reverted (8 →
 *   0.42 → 8) AND `accumulationCount` dropped 3 → 1 — i.e. the reset happens
 *   regardless, via the ordinary param-change path (the setter's own reset /
 *   CompileScheduler), not via this dead call. So undo does NOT leave a stale
 *   accumulation buffer, which is what the raw finding implies.
 *   Do not read that as "harmless": the call site is dead code that LOOKS
 *   load-bearing, so anyone reasoning about undo's reset semantics from source
 *   will conclude the wrong mechanism is responsible — and if the redundant
 *   path is ever removed as an optimisation, the bug becomes live with no test
 *   to catch it. The first consequence (loadScene's post-boot branch being
 *   unreachable) was NOT re-measured and may still be user-visible.
 *
 *   The fix is to call `getProxy()` at use time rather than capture it at
 *   module scope; other module-scope captures under `components/` and
 *   `utils/` should be swept at the same time. Note the engine-gmt twin
 *   (`engine-gmt/engine/worker/WorkerProxy.ts`) has NO `setProxy` and its
 *   `getProxy()` is a lazy singleton, so module-scope capture against THAT
 *   module is safe — the ~20 sites across `engine-gmt/**` are not part of this.
 */
export function setProxy(proxy: WorkerProxy): void {
    _proxy = proxy;
}

/**
 * @assumption `getProxy()` lazily creates a stub if no `setProxy()` has
 *   fired — a forgotten install silently downgrades to no-op rather
 *   than crashing. Symptoms: perpetual unbooted state, picks return
 *   null, exports reject. `gpuInfo` returning the literal
 *   `'Stub (no worker)'` is the useful tell.
 */
export function getProxy(): WorkerProxy {
    if (!_proxy) _proxy = new WorkerProxy();
    return _proxy;
}
