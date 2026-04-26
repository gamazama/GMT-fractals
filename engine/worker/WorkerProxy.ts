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
    convergenceThreshold: number;
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
    private _lastGeneratedFrag = '';
    private _isBucketRendering = false;
    private _isExporting = false;
    private _isGizmoInteracting = false;
    private _bootSent = false;

    // Callback slots
    private _onCompiling: ((status: boolean | string) => void) | null = null;
    private _onCompileTime: ((duration: number) => void) | null = null;
    private _onShaderCode: ((code: string) => void) | null = null;
    private _onBootedCallback: (() => void) | null = null;
    private _onWorkerFrame: (() => void) | null = null;
    private _onCrash: ((reason: string) => void) | null = null;

    // Pending teleport (consumed by tick scene at boot)
    pendingTeleport: CameraState | null = null;

    /** Modulation offsets set by AnimationSystem */
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
    get dirty() { return this._shadow.dirty; }
    set dirty(v: boolean) { this._shadow.dirty = v; }
    get isPaused() { return this._shadow.isPaused; }
    set isPaused(v: boolean) { this._shadow.isPaused = v; }
    get shouldSnapCamera() { return false; }
    set shouldSnapCamera(_v: boolean) {}
    get isGizmoInteracting() { return this._isGizmoInteracting; }
    set isGizmoInteracting(v: boolean) { this._isGizmoInteracting = v; }
    get isCameraInteracting() { return false; }
    set isCameraInteracting(_v: boolean) {}
    get bootSent() { return this._bootSent; }
    get gpuInfo(): string { return this._gpuInfo || 'Stub (no worker)'; }

    // ─── Commands (no-op in stub) ──────────────────────────────────────

    setUniform(_key: string, _value: unknown, _noReset = false) {}
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
    checkHalfFloatAlphaSupport() { return true; }

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
            selfContainedSDE?: boolean;
        }
    ) {}

    // ─── Export (inert — reject immediately) ───────────────────────────

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

// Singleton accessor (preserves GMT's get-proxy pattern)
let _proxy: WorkerProxy | null = null;

export function getProxy(): WorkerProxy {
    if (!_proxy) _proxy = new WorkerProxy();
    return _proxy;
}
