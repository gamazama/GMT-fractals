/**
 * Per-frame render tick — the hot loop that drives the offscreen canvas.
 *
 * Sequence:
 *   1. Apply main-thread camera + (atomic) sceneOffset.
 *   2. Run the FractalEngine update + compute pipeline.
 *   3. Optional held-final-frame fast path (BucketRenderer post-render hold).
 *   4. Multi-pass bloom (when intensity > 0).
 *   5. Display blit + GL flush.
 *   6. Shadow-state shadow back to main thread.
 *   7. Depth-readback / focus-pick tick (after blit, doesn't affect frame timing).
 *
 * Pulled out of renderWorker.ts so the file's message dispatcher reads
 * as routing, not a 130-line tick body.
 */

import type * as THREE from 'three';
import type { FractalEngine } from '../FractalEngine';
import type { BloomPass } from '../BloomPass';
import type { WorkerDepthReadback } from './WorkerDepthReadback';
import type { WorkerExporter } from './WorkerExporter';
import type { MainToWorkerMessage, WorkerToMainMessage, WorkerShadowState } from './WorkerProtocol';
import { bucketRenderer } from '../BucketRenderer';

// ── DEBUG: per-frame timing instrumentation ──────────────────────────────────
// Diagnoses fly-stutter. Question it answers: is the worker's OWN frame timing
// flat or jittery?
//   • gap + compute both low-variance → worker renders uniformly; the judder is
//     a PRESENTATION beat against vsync → fix = pace to a fixed, refresh-aligned
//     cadence.
//   • compute variance high → the trace itself stalls (GPU command-queue
//     back-pressure under ANGLE, or GC) → fix = bound frames-in-flight (fence-gate).
//   • gap variance high but compute flat → the wait BETWEEN ticks varies
//     (dispatch / present back-pressure).
// Logs a rolling summary every WINDOW frames to the worker console (select the
// renderWorker context in DevTools). Flip to false (or delete this block + its
// three call sites) when done.
const DEBUG_FRAME_TIMING = false;
const _ft = {
    window: 120,
    n: 0,
    lastEntry: 0,
    gap: [] as number[],      // ms between successive render-tick entries (achieved cadence)
    compute: [] as number[],  // ms inside engine.compute() (CPU submit only — GPU runs async)
    total: [] as number[],    // ms entry → end of tick
    gpu: [] as number[],      // ms GPU submit→complete (fence) — balloons under back-pressure
};

// ── FIX: bound frames-in-flight (fence-gate) ─────────────────────────────────
// Root cause of the fly-stutter: the worker submits a full-frame raymarch on
// every tick via gl.flush() (non-blocking) and never checks whether the GPU
// finished the previous frame. Under load the GPU queue balloons (measured
// submit→done latency climbed past 500ms and kept growing) and drains in bursts
// → the image lags ~½s behind the camera and updates unevenly.
//
// The gate holds at most ONE frame in flight: a fence is armed after each blit
// and the next frame won't start until it signals — so latency collapses to ~one
// frame and the cadence evens out at the GPU's true sustainable rate. When the
// GPU is still busy the tick is skipped and the scheduler retries with the LATEST
// camera (coalesced), so we never render stale. The same fence doubles as the
// DEBUG gpu-latency probe. Inactive during bucket/export (own pacing). Flip
// BOUND_FRAMES_IN_FLIGHT to false to A/B against the old render-ahead behaviour.
const BOUND_FRAMES_IN_FLIGHT = true;
let _inflightFence: WebGLSync | null = null;
let _inflightT0 = 0;

// Wall-clock of the last rendered frame, for frame-rate-independent smoothing.
// The worker renders on its own (gated) cadence, decoupled from the main thread's
// per-tick delta — so the camera-smoothing / accumulation-reset step in
// engine.update() must advance by ACTUAL elapsed time between rendered frames,
// not msg.delta (one main-thread RAF). Otherwise, when frames are gated, the
// smoothed camera under-steps ~10× and crawls toward the target for many frames,
// keeping `userMoved` true → accumulation resets every frame → never settles, and
// tiling can't engage (full frames the whole time). See VirtualSpace.updateSmoothing.
let _lastRenderWallMs = 0;
function _ftStat(a: number[]) {
    const n = a.length;
    if (!n) return { avg: 0, min: 0, max: 0, sd: 0 };
    let sum = 0, min = Infinity, max = -Infinity;
    for (const v of a) { sum += v; if (v < min) min = v; if (v > max) max = v; }
    const avg = sum / n;
    let vsum = 0;
    for (const v of a) { const d = v - avg; vsum += d * d; }
    return { avg, min, max, sd: Math.sqrt(vsum / n) };
}
function _ftRecord(entry: number, computeMs: number): void {
    const now = performance.now();
    if (_ft.lastEntry > 0) _ft.gap.push(entry - _ft.lastEntry);
    _ft.lastEntry = entry;
    _ft.compute.push(computeMs);
    _ft.total.push(now - entry);
    if (++_ft.n >= _ft.window) {
        const g = _ftStat(_ft.gap), c = _ftStat(_ft.compute), t = _ftStat(_ft.total), gpu = _ftStat(_ft.gpu);
        const f = (s: ReturnType<typeof _ftStat>) =>
            `avg ${s.avg.toFixed(1)} sd ${s.sd.toFixed(1)} [${s.min.toFixed(1)}–${s.max.toFixed(1)}]`;
        // eslint-disable-next-line no-console
        console.log(`[frame-timing] n=${_ft.n}  gap: ${f(g)}  compute: ${f(c)}  gpu: ${f(gpu)} (×${_ft.gpu.length})  total: ${f(t)}`);
        _ft.n = 0; _ft.gap.length = 0; _ft.compute.length = 0; _ft.total.length = 0; _ft.gpu.length = 0;
    }
}

/** Live refs the tick reads on every frame. Each may be null until BOOT
 *  finishes wiring the engine; the tick early-outs before touching them. */
export interface RenderTickRefs {
    engine:        FractalEngine | null;
    renderer:      THREE.WebGLRenderer | null;
    canvas:        OffscreenCanvas | null;
    camera:        THREE.PerspectiveCamera | null;
    displayScene:  THREE.Scene | null;
    displayCamera: THREE.OrthographicCamera | null;
    displayMesh:   THREE.Mesh | null;
    bloomPass:     BloomPass | null;
    depthReadback: WorkerDepthReadback;
    /** Active export claims the GPU — tick early-outs while it's running. */
    exporter:      WorkerExporter | null;
}

export interface RenderTickHooks {
    /** Tick counter, advanced once per call (including early-outs). */
    incTickCount: () => number;
    postMsg:      (msg: WorkerToMainMessage, transfer?: Transferable[]) => void;
    getShadowState: () => WorkerShadowState;
}

export const handleRenderTick = (
    refs: RenderTickRefs,
    msg: Extract<MainToWorkerMessage, { type: 'RENDER_TICK' }>,
    hooks: RenderTickHooks,
): boolean => {
    const { engine, renderer, camera, displayScene, displayCamera, displayMesh,
            canvas, exporter, bloomPass, depthReadback } = refs;

    if (!engine || !renderer || !camera || !displayScene || !displayCamera) {
        hooks.incTickCount();
        return true;
    }
    if (!engine.isBooted) {
        hooks.incTickCount();
        // Still send shadow state so main thread sees compilation status.
        hooks.postMsg({ type: 'FRAME_READY', bitmap: null, state: hooks.getShadowState() });
        return true;
    }
    // Skip normal rendering during export — WorkerExporter drives the GPU.
    if (exporter?.active) {
        hooks.incTickCount();
        return true;
    }

    const _ftEntry = DEBUG_FRAME_TIMING ? performance.now() : 0;

    // ── Frames-in-flight gate (poll) ──
    // If the previous frame is still executing on the GPU, skip this tick rather
    // than piling another full frame onto the queue. Returning false tells the
    // scheduler to retry shortly with the latest (coalesced) camera. The same
    // fence signal feeds the DEBUG gpu-latency stat. See block at top of file.
    const _gateActive = BOUND_FRAMES_IN_FLIGHT
        && !bucketRenderer.getIsRunning() && !bucketRenderer.isHoldingFinalFrame();
    if (_inflightFence) {
        const _gl = renderer.getContext() as WebGL2RenderingContext;
        // Decide whether the previous frame's GPU work is done. This MUST be
        // un-wedgeable: any path that leaves the gate skipping forever freezes the
        // image. Three guards:
        //  • SYNC_FLUSH_COMMANDS_BIT — the fence is armed after the frame's
        //    gl.flush(), so without forcing a flush here it is never pushed to the
        //    GPU when nothing else renders (static max-SPS accumulation) and never
        //    signals.
        //  • WAIT_FAILED / a thrown call (fence from a lost context, driver error)
        //    is treated as "done" — better to render-ahead once than to freeze.
        //  • If we are NOT gating in this mode (bucket / held-final-frame), drop the
        //    fence regardless so a stale one can't carry into the next live frame.
        let _done = true;
        try {
            const _s = _gl.clientWaitSync(_inflightFence, _gl.SYNC_FLUSH_COMMANDS_BIT, 0);
            _done = _s === _gl.ALREADY_SIGNALED || _s === _gl.CONDITION_SATISFIED || _s === _gl.WAIT_FAILED;
            if (DEBUG_FRAME_TIMING && _inflightT0 && _s !== _gl.WAIT_FAILED && _done) {
                _ft.gpu.push(performance.now() - _inflightT0);
            }
        } catch {
            _done = true; // invalid/dead sync — never block on it
        }
        if (_done || !_gateActive) {
            try { _gl.deleteSync(_inflightFence); } catch { /* already invalid */ }
            _inflightFence = null;
        } else {
            return false; // GPU still busy and we're gating — don't render-ahead
        }
    }

    // ── Apply main-thread camera ──
    camera.position.set(msg.camera.position[0], msg.camera.position[1], msg.camera.position[2]);
    camera.quaternion.set(msg.camera.quaternion[0], msg.camera.quaternion[1], msg.camera.quaternion[2], msg.camera.quaternion[3]);
    camera.fov = msg.camera.fov;
    camera.aspect = msg.camera.aspect;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    // Atomic offset sync: when the main thread absorbs orbit camera.position
    // into offset, both arrive together in this RENDER_TICK — no 1-frame mismatch.
    if (msg.syncOffset) {
        engine.virtualSpace.state = msg.offset;
    }
    // Otherwise: VirtualSpace offset is updated via OFFSET_SHIFT/OFFSET_SET messages only.
    // Do NOT override from RENDER_TICK — the store's sceneOffset lags behind real-time
    // offset_shift events from fly mode / orbit pivot, causing frame jumping.

    if (msg.renderState) {
        engine.setRenderState(msg.renderState);
    }

    // FractalEngine.update releases any held final frame when the user has moved
    // camera / changed params; the held path below only runs when no interaction
    // has occurred.
    //
    // Use REAL elapsed time between rendered frames (not msg.delta, one main-thread
    // RAF) so camera smoothing settles in correct wall-clock time regardless of the
    // gated render cadence. Clamped like the main thread's clampedDelta to avoid a
    // tab-switch/pause feeding a huge step. See _lastRenderWallMs.
    const _nowMs = performance.now();
    const realDelta = _lastRenderWallMs > 0
        ? Math.min((_nowMs - _lastRenderWallMs) / 1000, 0.1)
        : msg.delta;
    _lastRenderWallMs = _nowMs;
    engine.update(camera, realDelta, {}, false);

    // ── Held final-frame path ──
    // After Refine View / Preview Region finishes, BucketRenderer retains its final
    // composite and re-blits it each tick. Skip compute + normal display while
    // holding — otherwise the normal display path would overwrite the final image.
    if (bucketRenderer.isHoldingFinalFrame()) {
        bucketRenderer.blitHeldFinalFrame();
        hooks.incTickCount();
        hooks.postMsg({ type: 'FRAME_READY', bitmap: null, state: hooks.getShadowState() });
        return true;
    }

    const _ftC0 = DEBUG_FRAME_TIMING ? performance.now() : 0;
    engine.compute(renderer);
    const _ftComputeMs = DEBUG_FRAME_TIMING ? performance.now() - _ftC0 : 0;

    // ── Blit first — submit display frame to the GPU before any readback work ──
    // Consistent frame timing: display render is always the first thing after
    // compute, with no variable-cost operations in between.
    const outputTex = engine.pipeline.getOutputTexture();
    const tickCount = hooks.incTickCount();
    if (outputTex && canvas) {
        // Assign display material on first frame after engine boot.
        if (displayMesh && displayMesh.material !== engine.materials.displayMaterial) {
            displayMesh.material = engine.materials.displayMaterial;
        }

        // Multi-pass bloom (skipped when intensity = 0).
        const bloomIntensity = engine.mainUniforms.uBloomIntensity?.value ?? 0;
        if (bloomIntensity > 0.001 && bloomPass) {
            const threshold = engine.mainUniforms.uBloomThreshold?.value ?? 0.5;
            const radius    = engine.mainUniforms.uBloomRadius?.value ?? 1.5;
            bloomPass.render(outputTex, renderer, threshold, radius);
            engine.materials.displayMaterial.uniforms.uBloomTexture.value = bloomPass.getOutput();
        } else {
            engine.materials.displayMaterial.uniforms.uBloomTexture.value = null;
        }

        engine.materials.displayMaterial.uniforms.map.value = outputTex;

        renderer.setRenderTarget(null);
        renderer.clear();

        // Bucket render: each tile's output may not match the canvas aspect (e.g.
        // 2×1 tile grid on a square output produces 1:2 tiles on a 1:1 canvas).
        // Stretching to fill the canvas would distort the live preview during
        // render. Letterbox the tile into a centered rect matching its own
        // aspect so the preview matches what gets saved.
        const gl = renderer.getContext();
        const boxTapsUniform = engine.materials.displayMaterial.uniforms.uPreviewBoxTaps;
        if (bucketRenderer.getIsRunning()) {
            const [tileW, tileH] = bucketRenderer.getCurrentTilePixelSize();
            const cW = canvas.width, cH = canvas.height;
            if (tileW > 0 && tileH > 0) {
                const tileAspect = tileW / tileH;
                const canvasAspect = cW / Math.max(1, cH);
                let vx = 0, vy = 0, vw = cW, vh = cH;
                if (Math.abs(tileAspect - canvasAspect) > 0.002) {
                    if (tileAspect > canvasAspect) {
                        vh = Math.floor(cW / tileAspect);
                        vy = Math.floor((cH - vh) / 2);
                    } else {
                        vw = Math.floor(cH * tileAspect);
                        vx = Math.floor((cW - vw) / 2);
                    }
                }
                // NxN box average in displayMaterial when the source tile is
                // larger than its on-canvas footprint. Bilinear-only would only
                // sample 4 of every (ratio^2) source texels and look pixelated.
                // The kernel spaces taps by 1/uResolution, so uResolution MUST be
                // the tile texture size — UniformManager skips its uResolution sync
                // while bucket rendering, so set it here or the taps smear across
                // (tileRes/viewportRes)× too many texels and the preview blurs.
                engine.materials.displayMaterial.uniforms.uResolution.value.set(tileW, tileH);
                if (boxTapsUniform) {
                    const ratio = Math.max(tileW / Math.max(1, vw), tileH / Math.max(1, vh));
                    boxTapsUniform.value = Math.min(8, Math.max(1, Math.ceil(ratio)));
                }
                renderer.setViewport(vx, vy, vw, vh);
                renderer.render(displayScene, displayCamera);
                renderer.setViewport(0, 0, cW, cH);
            } else {
                if (boxTapsUniform) boxTapsUniform.value = 1;
                renderer.render(displayScene, displayCamera);
            }
        } else {
            if (boxTapsUniform) boxTapsUniform.value = 1;
            renderer.render(displayScene, displayCamera);
        }

        // Flush GPU command queue — starts executing the display frame
        // immediately. Without this, the driver may batch commands and
        // execute them later, causing variable presentation timing.
        gl.flush();
        // Arm the frames-in-flight fence (and the gpu-latency probe). Only when
        // none is pending, so gate-off A/B still measures clean, non-overlapping
        // frames rather than overwriting an unsignalled fence.
        if ((BOUND_FRAMES_IN_FLIGHT || DEBUG_FRAME_TIMING) && !_inflightFence) {
            const gl2 = gl as WebGL2RenderingContext;
            _inflightFence = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
            _inflightT0 = performance.now();
        }
    }

    hooks.postMsg({ type: 'FRAME_READY', bitmap: null, state: hooks.getShadowState() });

    // Depth readback / focus pick — runs after blit so it doesn't affect display timing.
    depthReadback.tick(engine, renderer, tickCount, hooks.postMsg);

    if (DEBUG_FRAME_TIMING) _ftRecord(_ftEntry, _ftComputeMs);
    return true;
};
