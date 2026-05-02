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
import { injectMetadata } from '../../../utils/pngMetadata';
import { FractalEvents, FRACTAL_EVENTS } from '../FractalEvents';
import type { AccumulationController } from '../../../engine/AccumulationController';
import { useCompileProgress } from '../../../store/CompileProgressStore';

export class WorkerProxy implements AccumulationController {
    // ─── Stub properties ─────────────────────────────────────────────
    // These exist on FractalEngine but not on WorkerProxy.  UI code guards
    // access with `if (engine.activeCamera && ...)` so they are always falsy here.
    readonly activeCamera: THREE.PerspectiveCamera | null = null;
    readonly virtualSpace: import('../PrecisionMath').VirtualSpace | null = null;
    readonly renderer: THREE.WebGLRenderer | null = null;
    readonly pipeline: import('../RenderPipeline').RenderPipeline | null = null;

    private _worker: Worker | null = null;
    private _shadow: WorkerShadowState = {
        isBooted: false, isCompiling: false, hasCompiledShader: false,
        isPaused: false, dirty: false, lastCompileDuration: 0,
        lastMeasuredDistance: 1, accumulationCount: 0, convergenceValue: 1.0, frameCount: 0,
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
    /** When true, FRAME_READY won't overwrite _localOffset until the worker catches up. */
    private _offsetGuarded = false;
    private _onCompiling: ((status: boolean | string) => void) | null = null;
    private _onCompileTime: ((duration: number) => void) | null = null;
    private _onShaderCode: ((code: string) => void) | null = null;
    private _onBootedCallback: (() => void) | null = null;
    private _pendingSnapshots: Map<string, (blob: Blob) => void> = new Map();
    private _pendingPicks: Map<string, (pos: THREE.Vector3 | null) => void> = new Map();
    private _pendingFocusPicks: Map<string, (distance: number) => void> = new Map();
    private _pendingHistograms: Map<string, (data: Float32Array) => void> = new Map();
    private _pendingShaderSource: Map<string, (code: string | null) => void> = new Map();
    private _pendingUniformsSnapshot: Map<string, (u: Record<string, any> | null) => void> = new Map();
    private _gpuInfo: string = '';
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

        const initMsg: MainToWorkerMessage = {
            type: 'INIT',
            canvas: offscreen,
            width, height, dpr, isMobile,
            initialConfig: config,
            initialCamera
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
            lastMeasuredDistance: 1, accumulationCount: 0, convergenceValue: 1.0, frameCount: 0,
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

        const initMsg: MainToWorkerMessage = {
            type: 'INIT',
            canvas: offscreen,
            width, height, dpr, isMobile,
            initialConfig: newConfig,
            initialCamera
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
                // Notify listeners — used to push deferred state (uniforms, camera)
                // that was set in the store before the worker engine existed.
                if (this._onBootedCallback) this._onBootedCallback();
                break;
            case 'GPU_INFO':
                this._gpuInfo = msg.info;
                break;
            case 'HISTOGRAM_RESULT':
                this._resolveRequest(msg.id, this._pendingHistograms, msg.data);
                break;
            case 'SNAPSHOT_RESULT':
                this._resolveRequest(msg.id, this._pendingSnapshots, msg.blob);
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
                if (this._exportError) this._exportError(msg.message);
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

    /** Post a typed message to the render worker */
    post(msg: MainToWorkerMessage, transfer?: Transferable[]) {
        if (this._worker) {
            if (transfer) this._worker.postMessage(msg, transfer);
            else this._worker.postMessage(msg);
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
    }

    // ─── Error Recovery ────────────────────────────────────────────────

    private _onCrash: ((reason: string) => void) | null = null;
    set onCrash(cb: ((reason: string) => void) | null) { this._onCrash = cb; }
    set onBooted(cb: (() => void) | null) { this._onBootedCallback = cb; }

    private _handleWorkerCrash(reason: string) {
        console.error(`[WorkerProxy] Worker crashed: ${reason}. Terminating worker.`);
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
        // Reject pending export promises
        if (this._exportReady) { this._exportReady = null; }
        if (this._exportComplete) { this._exportComplete = null; }
        if (this._exportFrameDone) { this._exportFrameDone = null; }
        if (this._exportError) { this._exportError = null; }
        if (this._onCrash) this._onCrash(reason);
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
    get accumulationCount() { return this._shadow.accumulationCount; }
    get convergenceValue() { return this._shadow.convergenceValue; }
    get frameCount() { return this._shadow.frameCount; }
    get lastCompileDuration() { return this._shadow.lastCompileDuration; }
    get lastMeasuredDistance() { return this._shadow.lastMeasuredDistance; }
    set lastMeasuredDistance(v: number) { this._shadow.lastMeasuredDistance = v; }
    get hasCompiledShader() { return this._shadow.hasCompiledShader; }
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

    private _isGizmoInteracting = false;
    get isGizmoInteracting() { return this._isGizmoInteracting; }
    set isGizmoInteracting(v: boolean) { this._isGizmoInteracting = v; }
    get isCameraInteracting() { return false; }
    set isCameraInteracting(v: boolean) { if (v) this.post({ type: 'MARK_INTERACTION' }); }

    // ─── Methods ─────────────────────────────────────────────────────────

    /** Whether a BOOT message has been sent (worker may still be compiling) */
    private _bootSent = false;
    get bootSent() { return this._bootSent; }

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

    setUniform(key: string, value: unknown, noReset = false) {
        this.post({ type: 'UNIFORM', key, value, noReset });
    }

    setPreviewSampleCap(n: number) {
        this.post({ type: 'SET_SAMPLE_CAP', n });
    }

    resetAccumulation() {
        this.post({ type: 'RESET_ACCUM' });
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
                          b64Data.startsWith('Iz8') || b64Data.startsWith('Iz9');

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
    checkHalfFloatAlphaSupport() { return true; }

    // ─── Worker communication ────────────────────────────────────────────

    sendRenderTick(camera: SerializedCamera, offset: SerializedOffset, delta: number, renderState: Partial<EngineRenderState>) {
        // If an offset sync is queued (from orbit absorb), embed it in this tick
        // so camera and offset arrive atomically — no 1-frame mismatch.
        if (this._pendingOffsetSync) {
            const syncOffset = this._pendingOffsetSync;
            this._pendingOffsetSync = null;
            this.post({ type: 'RENDER_TICK', camera, offset: syncOffset, delta, timestamp: performance.now(), renderState, syncOffset: true });
        } else {
            this.post({ type: 'RENDER_TICK', camera, offset, delta, timestamp: performance.now(), renderState });
        }
    }

    resizeWorker(width: number, height: number, dpr: number) {
        this.post({ type: 'RESIZE', width, height, dpr });
    }

    sendConfig(config: Partial<ShaderConfig>) {
        this.post({ type: 'CONFIG', config });
    }

    registerFormula(id: string, shader: { function: string; loopBody: string; loopInit?: string; getDist?: string; preamble?: string; selfContainedSDE?: boolean }) {
        this.post({ type: 'REGISTER_FORMULA', id, shader });
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
        dirHandle?: FileSystemDirectoryHandle
    ): Promise<void> {
        this._isExporting = true;
        return new Promise((resolve, reject) => {
            this._exportReady = () => { this._exportReady = null; resolve(); };
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
            // FileSystemDirectoryHandle is structured-cloneable (since File System Access API landed
            // in workers), so it rides along in the message body without needing a transfer entry.
            this.post({ type: 'EXPORT_START', config, stream: transferStream, dirHandle }, transfer);

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
     * Returns a promise that resolves when the frame is done.
     */
    renderExportFrame(
        frameIndex: number,
        time: number,
        camera: SerializedCamera,
        offset: SerializedOffset,
        renderState: Partial<EngineRenderState>,
        modulations: Record<string, number>
    ): Promise<{ frameIndex: number; progress: number; measuredDistance: number }> {
        return new Promise((resolve) => {
            this._exportFrameDone = (data) => { this._exportFrameDone = null; resolve(data); };
            this.post({
                type: 'EXPORT_RENDER_FRAME',
                frameIndex, time, camera, offset, renderState, modulations
            });
        });
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
     * is capped at `sampleCap` (the user's Max Samples Per Bucket setting). Exit with
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
        const { pixels, width, height, presetJson, filename } = msg;
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
                const taggedBlob = await injectMetadata(blob, "FractalData", presetJson);
                const url = URL.createObjectURL(taggedBlob);
                const link = document.createElement('a');
                link.download = filename;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
            } catch (e) {
                console.error("Failed to inject metadata", e);
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
