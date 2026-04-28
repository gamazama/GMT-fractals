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
): void => {
    const { engine, renderer, camera, displayScene, displayCamera, displayMesh,
            canvas, exporter, bloomPass, depthReadback } = refs;

    if (!engine || !renderer || !camera || !displayScene || !displayCamera) {
        hooks.incTickCount();
        return;
    }
    if (!engine.isBooted) {
        hooks.incTickCount();
        // Still send shadow state so main thread sees compilation status.
        hooks.postMsg({ type: 'FRAME_READY', bitmap: null, state: hooks.getShadowState() });
        return;
    }
    // Skip normal rendering during export — WorkerExporter drives the GPU.
    if (exporter?.active) {
        hooks.incTickCount();
        return;
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
    engine.update(camera, msg.delta, {}, false);

    // ── Held final-frame path ──
    // After Refine View / Preview Region finishes, BucketRenderer retains its final
    // composite and re-blits it each tick. Skip compute + normal display while
    // holding — otherwise the normal display path would overwrite the final image.
    if (bucketRenderer.isHoldingFinalFrame()) {
        bucketRenderer.blitHeldFinalFrame();
        hooks.incTickCount();
        hooks.postMsg({ type: 'FRAME_READY', bitmap: null, state: hooks.getShadowState() });
        return;
    }

    engine.compute(renderer);

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
                renderer.setViewport(vx, vy, vw, vh);
                renderer.render(displayScene, displayCamera);
                renderer.setViewport(0, 0, cW, cH);
            } else {
                renderer.render(displayScene, displayCamera);
            }
        } else {
            renderer.render(displayScene, displayCamera);
        }

        // Flush GPU command queue — starts executing the display frame
        // immediately. Without this, the driver may batch commands and
        // execute them later, causing variable presentation timing.
        gl.flush();
    }

    hooks.postMsg({ type: 'FRAME_READY', bitmap: null, state: hooks.getShadowState() });

    // Depth readback / focus pick — runs after blit so it doesn't affect display timing.
    depthReadback.tick(engine, renderer, tickCount, hooks.postMsg);
};
