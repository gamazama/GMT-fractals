/**
 * renderWorker.ts — Web Worker entry point for offscreen fractal rendering.
 *
 * Owns: FractalEngine, THREE.WebGLRenderer, OffscreenCanvas
 * Receives: RENDER_TICK (camera + delta), CONFIG, UNIFORM, etc.
 * Sends back: FRAME_READY (shadow state; canvas auto-presents via transferControlToOffscreen)
 */

import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { FractalEngine } from '../FractalEngine';
import { FractalEvents, FRACTAL_EVENTS } from '../FractalEvents';
import { registry } from '../FractalRegistry';
import type { MainToWorkerMessage, WorkerToMainMessage, WorkerShadowState } from './WorkerProtocol';
import { WorkerExporter } from './WorkerExporter';
import { bucketRenderer } from '../BucketRenderer';
import { handleHistogramReadback } from './WorkerHistogram';
import { WorkerDepthReadback } from './WorkerDepthReadback';
import { BloomPass } from '../BloomPass';
import { createFullscreenPass, type FullscreenPass } from '../utils/FullscreenQuad';

let engine: FractalEngine | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let canvas: OffscreenCanvas | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let exporter: WorkerExporter | null = null;

// Display scene for blitting output texture to the OffscreenCanvas
let displayPass: FullscreenPass | null = null;
let displayScene: THREE.Scene | null = null;
let displayCamera: THREE.OrthographicCamera | null = null;
let displayMesh: THREE.Mesh | null = null;

const depthReadback = new WorkerDepthReadback();
let bloomPass: BloomPass | null = null;

function postMsg(msg: WorkerToMainMessage, transfer?: Transferable[]) {
    if (transfer) {
        (self as any).postMessage(msg, transfer);
    } else {
        (self as any).postMessage(msg);
    }
}

function getShadowState(): WorkerShadowState {
    if (!engine) {
        return {
            isBooted: false, isCompiling: false, hasCompiledShader: false,
            isPaused: false, dirty: false, lastCompileDuration: 0,
            lastMeasuredDistance: 1, accumulationCount: 0, convergenceValue: 1.0, frameCount: 0,
            sceneOffset: { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 }
        };
    }
    const offset = engine.sceneOffset;
    return {
        isBooted: engine.isBooted,
        isCompiling: engine.isCompiling,
        hasCompiledShader: engine.hasCompiledShader,
        isPaused: engine.isPaused,
        dirty: engine.dirty,
        lastCompileDuration: engine.lastCompileDuration,
        lastMeasuredDistance: engine.lastMeasuredDistance,
        accumulationCount: engine.pipeline?.accumulationCount ?? 0,
        convergenceValue: engine.pipeline?.getLastConvergenceResult() ?? 1.0,
        frameCount: 0,
        sceneOffset: {
            x: offset.x, y: offset.y, z: offset.z,
            xL: offset.xL ?? 0, yL: offset.yL ?? 0, zL: offset.zL ?? 0
        }
    };
}

function initDisplayScene() {
    // Mesh material is assigned after engine boots — uses engine.materials.displayMaterial
    // which includes full post-processing (ACES tone mapping, sRGB, color grading)
    displayPass = createFullscreenPass();
    displayScene = displayPass.scene;
    displayCamera = displayPass.camera;
    displayMesh = displayPass.mesh;
}

// Deferred init state — holds INIT params until BOOT triggers full setup.
// This allows the worker to stay responsive to further restarts while the
// GPU may still be busy with an abandoned compile from a terminated worker.
let _deferredInit: Extract<MainToWorkerMessage, { type: 'INIT' }> | null = null;
let _pendingResize: { width: number; height: number; dpr: number } | null = null;

/** Lightweight INIT: just stash the message. Heavy WebGL setup is deferred
 *  to setupEngine() which runs when BOOT arrives. This keeps the worker
 *  responsive to further restarts while the GPU may still be draining an
 *  abandoned compile from a terminated worker. */
function handleInit(msg: Extract<MainToWorkerMessage, { type: 'INIT' }>) {
    _deferredInit = msg;
    postMsg({ type: 'READY' });
}

/** Full engine setup — called once when BOOT arrives. Creates WebGL renderer,
 *  engine, event bridges, and applies the initial config. */
function setupEngine(initMsg: Extract<MainToWorkerMessage, { type: 'INIT' }>) {
    canvas = initMsg.canvas;

    // Create WebGL renderer on the OffscreenCanvas
    renderer = new THREE.WebGLRenderer({
        canvas: canvas as any,
        alpha: false,
        depth: false,
        antialias: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
    });
    // We manage sRGB encoding ourselves via uEncodeOutput in the post-process shader.
    // Set LinearSRGBColorSpace so Three.js compiles identical shader programs for canvas
    // and render-target rendering (avoids program hash divergence from outputColorSpace).
    // drawingBufferColorSpace stays 'srgb' regardless, so the browser correctly interprets
    // our sRGB-encoded output for canvas compositing.
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setSize(initMsg.width, initMsg.height, false);
    renderer.setPixelRatio(initMsg.dpr);

    // Create camera — apply initial position from preset so the first preview frame is correct
    camera = new THREE.PerspectiveCamera(initMsg.initialCamera?.fov ?? 60, initMsg.width / initMsg.height, 0.01, 1000);
    if (initMsg.initialCamera) {
        const [px, py, pz] = initMsg.initialCamera.position;
        const [qx, qy, qz, qw] = initMsg.initialCamera.quaternion;
        camera.position.set(px, py, pz);
        camera.quaternion.set(qx, qy, qz, qw);
    }

    // Create engine
    engine = new FractalEngine();
    engine.registerCamera(camera);
    engine.registerRenderer(renderer);
    engine.mainUniforms.uInternalScale.value = initMsg.dpr;

    // Sync initial camera to shader uniforms so the first preview frame renders correctly
    if (initMsg.initialCamera) {
        camera.updateMatrixWorld();
        const m = camera.matrixWorld.elements;
        const tanFov = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.aspect;
        engine.mainUniforms.uCameraPosition.value.set(m[12], m[13], m[14]);
        engine.mainUniforms.uCamBasisX.value.set(m[0], m[1], m[2]).multiplyScalar(tanFov);
        engine.mainUniforms.uCamBasisY.value.set(m[4], m[5], m[6]).multiplyScalar(Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
        engine.mainUniforms.uCamForward.value.set(-m[8], -m[9], -m[10]);
    }

    // Set up display scene for blitting
    initDisplayScene();

    // Bridge engine events back to main thread
    let hasSentBooted = false;
    FractalEvents.on(FRACTAL_EVENTS.IS_COMPILING, (status) => {
        postMsg({ type: 'COMPILING', status });
        if (!status && !hasSentBooted) {
            hasSentBooted = true;
            let gpuInfo = 'Generic WebGL Device';
            try {
                const gl = renderer!.getContext();
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) gpuInfo = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            } catch {}
            postMsg({ type: 'BOOTED', gpuInfo });
        }
    });
    FractalEvents.on(FRACTAL_EVENTS.COMPILE_TIME, (duration) => {
        postMsg({ type: 'COMPILE_TIME', duration });
    });
FractalEvents.on(FRACTAL_EVENTS.SHADER_CODE, (code) => {
        postMsg({ type: 'SHADER_CODE', code });
    });

    // Bridge bucket render events back to main thread
    FractalEvents.on(FRACTAL_EVENTS.BUCKET_STATUS, (data) => {
        if (!data.isRendering && engine) engine.state.isBucketRendering = false;
        postMsg({ type: 'BUCKET_STATUS', ...data });
    });
    FractalEvents.on(FRACTAL_EVENTS.BUCKET_IMAGE, (data) => {
        postMsg({ type: 'BUCKET_IMAGE', ...data }, [data.pixels.buffer as ArrayBuffer]);
    });

    // Initialize bloom pass
    bloomPass = new BloomPass();
    const initPhysW = Math.floor(initMsg.width * initMsg.dpr);
    const initPhysH = Math.floor(initMsg.height * initMsg.dpr);
    bloomPass.resize(initPhysW, initPhysH);

    // Pass BloomPass + display refs to bucket renderer for full post-processing pipeline
    bucketRenderer.setBloomPass(bloomPass);
    if (displayScene && displayCamera) {
        bucketRenderer.setDisplayRefs(displayScene, displayCamera);
    }

    // Resize pipeline — use physical pixels (CSS × DPR) so the shader compiles
    // at the correct resolution from the start (matches RESIZE handler logic).
    engine.mainUniforms.uResolution.value.set(initPhysW, initPhysH);
    engine.pipeline.resize(initPhysW, initPhysH);

    // Preload config — gradients and all uniforms are synced by
    // syncConfigUniforms() during performCompilation() after BOOT.
    engine.preloadConfig(initMsg.initialConfig);
}

let _tickCount = 0;

function handleRenderTick(msg: Extract<MainToWorkerMessage, { type: 'RENDER_TICK' }>) {
    if (!engine || !renderer || !camera || !displayScene || !displayCamera) {
        _tickCount++;
        return;
    }
    if (!engine.isBooted) {
        _tickCount++;
        // Still send shadow state so main thread knows compilation status
        postMsg({ type: 'FRAME_READY', bitmap: null, state: getShadowState() });
        return;
    }
    // Skip normal rendering during export — WorkerExporter drives the GPU
    if (exporter?.active) {
        _tickCount++;
        return;
    }

    // Update camera from main thread data
    camera.position.set(msg.camera.position[0], msg.camera.position[1], msg.camera.position[2]);
    camera.quaternion.set(msg.camera.quaternion[0], msg.camera.quaternion[1], msg.camera.quaternion[2], msg.camera.quaternion[3]);
    camera.fov = msg.camera.fov;
    camera.aspect = msg.camera.aspect;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    // Atomic offset sync: when the main thread absorbs orbit camera.position into offset,
    // both arrive together in this RENDER_TICK — no 1-frame mismatch.
    if (msg.syncOffset && engine) {
        engine.virtualSpace.state = msg.offset;
    }
    // Otherwise: VirtualSpace offset is updated via OFFSET_SHIFT/OFFSET_SET messages only.
    // Do NOT override from RENDER_TICK — the store's sceneOffset lags behind real-time
    // offset_shift events from fly mode / orbit pivot, causing frame jumping.

    // Apply render state updates
    if (msg.renderState) {
        engine.setRenderState(msg.renderState);
    }

    // Update engine (VirtualSpace smoothing, uniform sync)
    engine.update(camera, msg.delta, {}, false);

    // Compute fractal (render to internal FBOs)
    engine.compute(renderer);

    // ── BLIT FIRST — submit display frame to GPU before any readback work ──
    // This ensures consistent frame timing: the display render is always the
    // first thing after compute, with no variable-cost operations in between.
    const outputTex = engine.pipeline.getOutputTexture();
    _tickCount++;
    if (outputTex && canvas) {
        // Assign display material on first frame after engine boot
        if (displayMesh && displayMesh.material !== engine.materials.displayMaterial) {
            displayMesh.material = engine.materials.displayMaterial;
        }

        // ── Multi-pass bloom (skipped when intensity = 0) ──
        const bloomIntensity = engine.mainUniforms.uBloomIntensity?.value ?? 0;
        if (bloomIntensity > 0.001 && bloomPass) {
            const threshold = engine.mainUniforms.uBloomThreshold?.value ?? 0.5;
            const radius = engine.mainUniforms.uBloomRadius?.value ?? 1.5;
            bloomPass.render(outputTex, renderer, threshold, radius);
            engine.materials.displayMaterial.uniforms.uBloomTexture.value = bloomPass.getOutput();
        } else {
            engine.materials.displayMaterial.uniforms.uBloomTexture.value = null;
        }

        engine.materials.displayMaterial.uniforms.map.value = outputTex;

        renderer.setRenderTarget(null);
        renderer.clear();
        renderer.render(displayScene, displayCamera);

        // Flush GPU command queue — starts executing the display frame immediately.
        // Without this, the driver may batch commands and execute them later,
        // causing variable presentation timing (stutter).
        const gl = renderer.getContext();
        gl.flush();
    }

    // Send shadow state (no bitmap — canvas auto-presents via transferControlToOffscreen)
    postMsg({ type: 'FRAME_READY', bitmap: null, state: getShadowState() });

    // ── DEPTH READBACK + FOCUS PICK (after blit) — does not affect display timing ──
    depthReadback.tick(engine, renderer, _tickCount, postMsg);

}

// ─── Message Handler ─────────────────────────────────────────────────────

// RENDER_TICK processing:
// Uses MessageChannel to schedule rendering — this lets already-queued messages
// (CONFIG, UNIFORM, OFFSET_SHIFT) process first, then renders with up-to-date state.
// Unlike setTimeout(0) which adds 1-4ms minimum delay, MessageChannel fires in <0.1ms.
let _pendingTick: Extract<MainToWorkerMessage, { type: 'RENDER_TICK' }> | null = null;
let _rendering = false;
let _tickScheduled = false;

const _tickChannel = new MessageChannel();
_tickChannel.port1.onmessage = () => {
    _tickScheduled = false;
    if (_rendering || !_pendingTick) return;
    _rendering = true;
    const tick = _pendingTick;
    _pendingTick = null;
    handleRenderTick(tick);
    _rendering = false;
};

self.onmessage = (e: MessageEvent<MainToWorkerMessage>) => {
    const msg = e.data;

    try {
        // ── Bucket render lock ──────────────────────────────────────
        // While a bucket render is in progress, reject messages that would
        // corrupt the tiled render (resize, param changes, camera moves, etc.).
        // Only BUCKET_STOP and RENDER_TICK (drives the bucket frame loop) pass through.
        if (engine?.state.isBucketRendering) {
            if (msg.type !== 'BUCKET_STOP' && msg.type !== 'RENDER_TICK') return;
        }

        switch (msg.type) {
            case 'INIT':
                handleInit(msg);
                break;

            case 'BOOT':
                // If engine hasn't been set up yet (deferred from INIT), do it now.
                // This is the point where we accept the GPU stall — the user has
                // committed to this formula and won't switch again.
                if (!engine && _deferredInit) {
                    setupEngine(_deferredInit);
                    _deferredInit = null;
                }
                // Apply camera from BOOT so the first compiled frame has the correct viewpoint
                // (INIT camera may be stale if store wasn't hydrated yet when WorkerDisplay mounted)
                if (msg.camera && camera) {
                    const [px, py, pz] = msg.camera.position;
                    const [qx, qy, qz, qw] = msg.camera.quaternion;
                    camera.position.set(px, py, pz);
                    camera.quaternion.set(qx, qy, qz, qw);
                    camera.fov = msg.camera.fov;
                    camera.updateProjectionMatrix();
                    camera.updateMatrixWorld();
                }
                engine?.bootWithConfig(msg.config);
                // Apply any RESIZE that arrived before engine existed
                if (_pendingResize && renderer && engine) {
                    const pr = _pendingResize;
                    _pendingResize = null;
                    renderer.setSize(pr.width, pr.height, false);
                    renderer.setPixelRatio(pr.dpr);
                    if (camera) {
                        camera.aspect = pr.width / pr.height;
                        camera.updateProjectionMatrix();
                    }
                    const pW = Math.floor(pr.width * pr.dpr);
                    const pH = Math.floor(pr.height * pr.dpr);
                    engine.mainUniforms.uResolution.value.set(pW, pH);
                    engine.mainUniforms.uInternalScale.value = pr.dpr;
                    engine.pipeline.resize(pW, pH);
                    bloomPass?.resize(pW, pH);
                }
                break;

            case 'RESIZE':
                if (renderer && engine) {
                    renderer.setSize(msg.width, msg.height, false);
                    renderer.setPixelRatio(msg.dpr);
                    if (camera) {
                        camera.aspect = msg.width / msg.height;
                        camera.updateProjectionMatrix();
                    }
                    // Physical pixel dimensions (Three.js applies pixelRatio internally)
                    const physW = Math.floor(msg.width * msg.dpr);
                    const physH = Math.floor(msg.height * msg.dpr);
                    const curRes = engine.mainUniforms.uResolution.value;
                    const sizeChanged = curRes.x !== physW || curRes.y !== physH;
                    curRes.set(physW, physH);
                    engine.mainUniforms.uInternalScale.value = msg.dpr;
                    engine.pipeline.resize(physW, physH);
                    bloomPass?.resize(physW, physH);
                    if (sizeChanged) engine.resetAccumulation();
                } else {
                    // Engine not ready yet — store for application after BOOT
                    _pendingResize = { width: msg.width, height: msg.height, dpr: msg.dpr };
                }
                break;

            case 'REGISTER_FORMULA':
                // Register a dynamically-imported formula (Workshop/DEC) in the worker's registry
                // so core_math.ts inject() can find it during shader compilation.
                registry.register({
                    id: msg.id as any,
                    name: msg.id,
                    shader: msg.shader,
                    parameters: [],
                    defaultPreset: {},
                });
                break;

            case 'CONFIG':
                if (engine) {
                    // Forward config update through internal event system
                    FractalEvents.emit(FRACTAL_EVENTS.CONFIG, msg.config);
                }
                break;

            case 'CONFIG_DONE':
                // Main thread finished sending all CONFIGs — compile now.
                // Cancels the fallback timer and fires immediately.
                engine?.fireCompile();
                break;

            case 'UNIFORM':
                engine?.setUniform(msg.key, msg.value, msg.noReset);
                break;

            case 'RENDER_TICK':
                // Buffer latest tick and schedule via MessageChannel.
                // This yields to the event loop so queued CONFIG/UNIFORM messages
                // process first, but with near-zero delay (unlike setTimeout).
                _pendingTick = msg;
                if (!_tickScheduled) {
                    _tickScheduled = true;
                    _tickChannel.port2.postMessage(null);
                }
                break;

            case 'RESET_ACCUM':
                engine?.resetAccumulation();
                break;

            case 'OFFSET_SET':
                if (engine) {
                    engine.virtualSpace.state = msg.offset;
                    if (!msg.noReset) {
                        engine.resetAccumulation();
                    }
                }
                // Always discard buffered tick — its camera/offset data is stale.
                // noReset preserves accumulated samples (inflate/absorb don't change
                // unified position), but the pending tick would render with the old
                // camera at the new offset, producing a wrong frame.
                _pendingTick = null;
                break;

            case 'OFFSET_SHIFT':
                if (engine) {
                    engine.virtualSpace.move(msg.x, msg.y, msg.z);
                    engine.resetAccumulation();
                }
                // Discard any buffered tick — its camera position is stale
                // (orbit pivot shifts camera and offset atomically on main thread,
                // but they arrive as separate messages here)
                _pendingTick = null;
                break;

            case 'SET_SAMPLE_CAP':
                engine?.setPreviewSampleCap(msg.n);
                break;

            case 'PAUSE':
                if (engine) engine.isPaused = msg.paused;
                break;

            case 'SET_DIRTY':
                if (engine) engine.dirty = true;
                break;

            case 'MARK_INTERACTION':
                engine?.markInteraction();
                break;

            case 'SNAP_CAMERA':
                if (engine) engine.shouldSnapCamera = true;
                break;

            case 'CAPTURE_SNAPSHOT':
                if (engine) {
                    engine.captureSnapshot().then(blob => {
                        if (blob) {
                            postMsg({ type: 'SNAPSHOT_RESULT', id: msg.id, blob });
                        }
                    });
                }
                break;

            case 'GET_SHADER_SOURCE':
                if (engine) {
                    let code: string | null = null;
                    if (msg.variant === 'compiled') {
                        code = engine.getCompiledFragmentShader();
                    } else if (msg.variant === 'translated') {
                        code = engine.getTranslatedFragmentShader();
                    }
                    postMsg({ type: 'SHADER_SOURCE_RESULT', id: msg.id, code });
                } else {
                    postMsg({ type: 'SHADER_SOURCE_RESULT', id: msg.id, code: null });
                }
                break;

            case 'TEXTURE':
                if (engine && msg.bitmap) {
                    // Create THREE.Texture from ImageBitmap (transferred from main thread)
                    const tex = new THREE.Texture(msg.bitmap as any);
                    tex.flipY = false; // Already flipped via createImageBitmap imageOrientation
                    tex.needsUpdate = true;
                    if (msg.textureType === 'color') {
                        tex.wrapS = THREE.RepeatWrapping;
                        tex.wrapT = THREE.RepeatWrapping;
                        tex.minFilter = THREE.LinearFilter;
                        tex.magFilter = THREE.LinearFilter;
                        engine.materials.setUniform('uTexture', tex);
                        engine.materials.setUniform('uUseTexture', 1.0);
                    } else {
                        tex.mapping = THREE.EquirectangularReflectionMapping;
                        tex.minFilter = THREE.LinearMipmapLinearFilter;
                        tex.generateMipmaps = true;
                        engine.materials.setUniform('uEnvMapTexture', tex);
                    }
                    engine.resetAccumulation();
                } else if (engine && !msg.bitmap) {
                    if (msg.textureType === 'color') {
                        engine.materials.setUniform('uUseTexture', 0.0);
                    }
                    engine.resetAccumulation();
                }
                break;

            case 'TEXTURE_HDR':
                if (engine) {
                    const rgbeLoader = new RGBELoader();
                    rgbeLoader.setDataType(THREE.HalfFloatType);
                    const hdrData = rgbeLoader.parse(msg.buffer);
                    if (hdrData) {
                        const hdrTex = new THREE.DataTexture(hdrData.data as any, hdrData.width, hdrData.height, THREE.RGBAFormat, hdrData.type);
                        hdrTex.mapping = THREE.EquirectangularReflectionMapping;
                        hdrTex.minFilter = THREE.LinearMipmapLinearFilter;
                        hdrTex.generateMipmaps = true;
                        hdrTex.flipY = true;
                        hdrTex.needsUpdate = true;
                        if (msg.textureType === 'color') {
                            hdrTex.wrapS = THREE.RepeatWrapping;
                            hdrTex.wrapT = THREE.RepeatWrapping;
                            engine.materials.setUniform('uTexture', hdrTex);
                            engine.materials.setUniform('uUseTexture', 1.0);
                        } else {
                            engine.materials.setUniform('uEnvMapTexture', hdrTex);
                        }
                        engine.resetAccumulation();
                    }
                }
                break;

            case 'PICK_WORLD_POSITION':
                if (engine) {
                    const pos = msg.fast
                        ? engine.pickWorldPositionFast(msg.x, msg.y)
                        : engine.pickWorldPosition(msg.x, msg.y);
                    postMsg({
                        type: 'PICK_RESULT',
                        id: msg.id,
                        position: pos ? [pos.x, pos.y, pos.z] : null
                    });
                } else {
                    postMsg({ type: 'PICK_RESULT', id: msg.id, position: null });
                }
                break;

            case 'FOCUS_PICK_START':
                if (engine) {
                    // Depth alpha is DoF-invariant — just snapshot on next frame
                    depthReadback.startFocusPick(msg.id, msg.x, msg.y);
                } else {
                    postMsg({ type: 'FOCUS_RESULT', id: msg.id, distance: -1 });
                }
                break;

            case 'FOCUS_PICK_SAMPLE':
                depthReadback.sampleFocusPick(msg.id, msg.x, msg.y, postMsg);
                break;

            case 'FOCUS_PICK_END':
                depthReadback.endFocusPick();
                break;

            case 'HISTOGRAM_READBACK':
                if (engine && renderer && camera) {
                    handleHistogramReadback(msg.id, msg.source, engine, renderer, camera, postMsg);
                } else {
                    postMsg({ type: 'HISTOGRAM_RESULT', id: msg.id, data: new Float32Array(0) });
                }
                break;

            case 'GET_GPU_INFO': {
                let info = 'Generic WebGL Device';
                try {
                    if (renderer) {
                        const gl = renderer.getContext();
                        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                        if (debugInfo) info = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    }
                } catch {}
                postMsg({ type: 'GPU_INFO', info });
                break;
            }

            // ─── Video Export ───────────────────────────────────────

            case 'EXPORT_START':
                if (engine && renderer && camera) {
                    if (!exporter) {
                        exporter = new WorkerExporter(engine, renderer, camera, postMsg);
                    }
                    exporter.start(msg.config, msg.stream);
                } else {
                    postMsg({ type: 'EXPORT_ERROR', message: 'Engine not ready for export' });
                }
                break;

            case 'EXPORT_RENDER_FRAME':
                if (exporter?.active) {
                    try {
                        exporter.renderFrame(
                            msg.frameIndex, msg.time,
                            msg.camera, msg.offset,
                            msg.renderState, msg.modulations
                        );
                    } catch (e) {
                        postMsg({ type: 'EXPORT_ERROR', message: `Frame render failed: ${e instanceof Error ? e.message : String(e)}` });
                    }
                }
                break;

            case 'EXPORT_FINISH':
                if (exporter?.active) {
                    exporter.finish();
                }
                break;

            case 'EXPORT_CANCEL':
                if (exporter?.active) {
                    exporter.cancel();
                    postMsg({ type: 'EXPORT_COMPLETE', blob: null });
                }
                break;

            // ─── Bucket Render ───────────────────────────────────────
            case 'BUCKET_START':
                if (engine && renderer) {
                    engine.state.bucketConfig = { ...msg.config };
                    const exportData = msg.exportData ? {
                        preset: JSON.parse(msg.exportData.preset),
                        name: msg.exportData.name,
                        version: msg.exportData.version
                    } : undefined;
                    engine.state.isBucketRendering = true;
                    bucketRenderer.start(msg.exportImage, msg.config, exportData);
                }
                break;

            case 'BUCKET_STOP':
                if (engine) {
                    bucketRenderer.stop();
                    engine.state.isBucketRendering = false;
                }
                break;
        }
    } catch (err) {
        postMsg({ type: 'ERROR', message: err instanceof Error ? err.message : String(err) });
    }
};
