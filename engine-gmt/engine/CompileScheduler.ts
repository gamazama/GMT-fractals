/**
 * Off-thread shader compile orchestrator.
 *
 * Two-stage strategy when KHR_parallel_shader_compile is available:
 *   1. swap to a lightweight preview material (lighting off) so the user
 *      sees pixels within ~1 frame
 *   2. build the full material on a hidden scene, run compileAsync, hot-
 *      swap into place when ready
 *
 * Single-stage fallback when the extension is missing (Firefox) or when
 * the lighting feature is already off (preview === full).
 *
 * Generation counter discards in-flight compiles when a newer one
 * arrives — guards against rapid feature-toggle bursts piling up
 * stale results.
 *
 * Pulled out of FractalEngine so the engine doesn't carry a dozen
 * compile-state fields. External `engine.isCompiling` /
 * `engine.hasCompiledShader` / `engine.lastCompileDuration` are now
 * getters that delegate here.
 */

import * as THREE from 'three';
import { FractalEvents, FRACTAL_EVENTS } from './FractalEvents';
import { createFullscreenPass } from './utils/FullscreenQuad';
import type { ShaderConfig } from './ShaderFactory';
import type { MaterialController } from './MaterialController';
import type { SceneController } from './SceneController';
import type { RenderPipeline } from './RenderPipeline';
import type { ConfigManager } from './managers/ConfigManager';

export interface CompileSchedulerDeps {
    /** Returns the live three renderer (lazy — may be null during boot). */
    getRenderer: () => THREE.WebGLRenderer | null;
    /** mainUniforms read for the resolution null-guard. */
    getMainUniforms: () => any;
    materials:    MaterialController;
    sceneCtrl:    SceneController;
    pipeline:     RenderPipeline;
    configManager: ConfigManager;
    /** FractalEngine.pipelineRender — called between stages so the user
     *  sees the preview material immediately. */
    pipelineRender:    (r: THREE.WebGLRenderer) => void;
    /** FractalEngine.resetAccumulation — TSAA buffer is invalidated when
     *  the shader changes. */
    resetAccumulation: () => void;
}

export class CompileScheduler {
    /** True while a compile is queued or executing. External
     *  `engine.isCompiling` reads this. */
    isCompiling = false;
    /** Set after the first successful compile so subsequent compiles
     *  can `keepCurrent` (keep the existing shader on screen while the
     *  new one builds asynchronously). */
    hasCompiledShader = false;
    /** Most recent compile duration in seconds. */
    lastDuration = 0;

    private generation = 0;
    private timer: ReturnType<typeof setTimeout> | null = null;
    /** Lazy-init scratch scene used for off-thread compileAsync. */
    private scene:  THREE.Scene | null = null;
    private mesh:   THREE.Mesh | null = null;
    private camera: THREE.OrthographicCamera | null = null;
    /** KHR_parallel_shader_compile probe — null until first attempt. */
    private hasParallelCompile: boolean | null = null;
    private lastCompiledFormula: string | null = null;

    constructor(private deps: CompileSchedulerDeps) {}

    /** Mark a compile as pending and start the debounce timer.
     *  Coalesces rapid CONFIG bursts into one compile. */
    schedule(): void {
        this.isCompiling = true;
        this.generation++;
        // No IS_COMPILING emit here — for gated compiles (formula switch,
        // scene load) the main thread already showed the spinner via
        // queueCompileAfterSpinner. Non-gated compiles emit when
        // performCompilation actually starts. Emitting from here caused
        // a spinner flash on every parameter adjustment in the debounce
        // window.
        //
        // Don't compile yet — wait for CONFIG_DONE from the main thread,
        // which signals all CONFIGs have been sent. Fallback timer
        // handles non-gated compiles (feature toggles, engine panel)
        // that don't go through queueCompileAfterSpinner.
        if (this.timer !== null) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.timer = null;
            this.fire();
        }, 200);
    }

    /** Called by CONFIG_DONE message or fallback timer. Fires the
     *  actual compile after waiting for the renderer to be ready. */
    fire(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        void (async () => {
            while (!this.deps.getRenderer()) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            try {
                await this.perform();
            } catch (e) {
                console.error('[CompileScheduler] performCompilation failed:', e);
                this.isCompiling = false;
                FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
            }
        })();
    }

    /** Resolves when the next IS_COMPILING `false` event fires. Rejects
     *  on timeout. Used by tests + scene-load to gate on a clean state. */
    awaitCompile(timeoutMs = 30000): Promise<void> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                off();
                reject(new Error(`compile timeout after ${timeoutMs}ms`));
            }, timeoutMs);
            const handler = (status: boolean | string) => {
                if (status === false) {
                    clearTimeout(timer);
                    off();
                    resolve();
                }
            };
            const off = () => FractalEvents.off(FRACTAL_EVENTS.IS_COMPILING, handler);
            FractalEvents.on(FRACTAL_EVENTS.IS_COMPILING, handler);
        });
    }

    dispose(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        // Scene/mesh/camera are leaf three objects; let GC reclaim them.
        this.scene = null;
        this.mesh = null;
        this.camera = null;
    }

    private async perform(): Promise<void> {
        const renderer = this.deps.getRenderer();
        if (!renderer) return;
        const t0 = performance.now();
        const generation = this.generation;

        const mainUniforms = this.deps.getMainUniforms();
        if (mainUniforms.uResolution.value.x === 0 || mainUniforms.uResolution.value.y === 0) {
            mainUniforms.uResolution.value.set(1024, 768);
        }
        this.deps.pipeline.resize(
            Math.floor(mainUniforms.uResolution.value.x),
            Math.floor(mainUniforms.uResolution.value.y),
        );

        const config = this.deps.configManager.config;
        // Mode derives from DDFS lighting state — same logic as MaterialController.
        const lighting = config.lighting as any;
        const mode: 'Direct' | 'PathTracing' = (lighting && lighting.renderMode === 1.0)
            ? 'PathTracing'
            : (config.renderMode || 'Direct');

        // Lazy-detect KHR_parallel_shader_compile (Chrome/ANGLE: yes,
        // Firefox: exposes the extension but compiles synchronously on the
        // GPU thread — preview-then-full just doubles the wait). Force
        // single-stage on Firefox so the user sees one compile, not two.
        if (this.hasParallelCompile === null) {
            const gl = renderer.getContext();
            const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
            const isFirefox = /Firefox\//i.test(ua);
            this.hasParallelCompile = !isFirefox && !!gl.getExtension('KHR_parallel_shader_compile');
        }

        // Compile strategy:
        //   keepCurrent — already compiled, same formula → keep on screen
        //                 while the new one builds. No preview downgrade.
        //   twoStage    — first boot or formula change → preview while full builds.
        //   singleStage — no parallel compile or lighting already off → synchronous.
        const interlaceId = (config as any).interlace?.interlaceCompiled
            ? ((config as any).interlace?.interlaceFormula ?? '')
            : '';
        const compiledFormulaKey = config.formula + (interlaceId ? '+' + interlaceId : '');
        const formulaChanged = compiledFormulaKey !== this.lastCompiledFormula;
        const keepCurrent = this.hasCompiledShader && this.hasParallelCompile && !formulaChanged;

        if (!keepCurrent) {
            // Pick a message that matches what's actually about to happen.
            // Two-stage (parallel compile + new formula) genuinely loads a
            // lighting-off preview first while the full shader builds in
            // the background — "Loading Preview…" reads correctly there.
            // Single-stage (Firefox, or same-formula recompile) is one
            // synchronous compile of the full shader — "Loading Preview…"
            // misleads the user (no preview stage exists).
            const willTwoStage = this.hasParallelCompile && formulaChanged;
            const initialMessage = willTwoStage ? 'Loading Preview...' : 'Compiling Shader...';
            FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, initialMessage);

            // compilePreview returns false when lighting is already off (preview === full).
            const useTwoStage = this.hasParallelCompile && this.deps.materials.compilePreview(config);
            if (!useTwoStage) {
                this.deps.materials.updateConfig(config);
            }

            const needsCompile = !this.hasCompiledShader || this.deps.materials.shaderDirty;

            // Sync uniforms so the preview shader renders with correct parameter
            // values (power, iter count, colours, …) instead of defaults.
            this.deps.materials.syncConfigUniforms(config);
            this.deps.sceneCtrl.setMaterial(this.deps.materials.getMaterial(mode));
            this.deps.resetAccumulation();

            if (needsCompile) {
                this.deps.pipelineRender(renderer);

                // Mark compiled BEFORE yielding — a concurrent perform can
                // start during the yields below and must see the updated
                // formula key, otherwise it thinks the formula changed and
                // does a redundant preview.
                this.hasCompiledShader = true;
                this.lastCompiledFormula = compiledFormulaKey;
                this.deps.materials.shaderDirty = false;
                this.lastDuration = (performance.now() - t0) / 1000;

                await new Promise(resolve => setTimeout(resolve, 20));
                this.deps.pipelineRender(renderer);
                if (useTwoStage) await new Promise(resolve => setTimeout(resolve, 50));
            }

            if (!useTwoStage) {
                // Single-stage done.
                this.lastDuration = (performance.now() - t0) / 1000;
                // Permanent compile timing log — do not remove
                console.log(`[Compile] Single-stage: ${(this.lastDuration * 1000).toFixed(0)}ms (${config.formula})`);
                this.isCompiling = false;
                FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
                FractalEvents.emit(FRACTAL_EVENTS.SHADER_CODE, this.deps.materials.getLastFrag());
                if (this.lastDuration > 0.1) FractalEvents.emit(FRACTAL_EVENTS.COMPILE_TIME, this.lastDuration);
                return;
            }
            // Preview stage complete — Stage 2 (full shader) starts below.
            // Final compile time is logged at the end of Stage 2.
        } else {
            // keepCurrent: sync non-modular uniforms only.
            // Do NOT sync uModularParams here — the old shader is still
            // rendering and expects the old pipeline's param layout.
            // syncModularUniforms zeros the array before refilling, which
            // would corrupt the old shader's slot mapping. Modular params
            // are synced after swapFullMaterial (new shader active).
            this.deps.materials.syncConfigUniforms(config, /* skipModularSync= */ true);
            this.deps.resetAccumulation();
        }

        // Current or preview shader is live. Proceed to async Stage 2.
        // Keep isCompiling = true so handleConfigChange doesn't emit
        // IS_COMPILING false during the async compile (which would kill
        // the spinner).
        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING,
            keepCurrent ? 'Compiling Shader...' : 'Compiling Lighting...');

        // Yield 3 animation frames — each lets handleRenderTick run
        // (compute + blit + flush).
        for (let i = 0; i < 3; i++) {
            if (typeof requestAnimationFrame === 'function') {
                await new Promise(resolve => requestAnimationFrame(resolve));
            } else {
                await new Promise(resolve => setTimeout(resolve, 16));
            }
        }

        // Discard if a newer compile was triggered while we yielded.
        if (generation !== this.generation) return;

        // ── STAGE 2: full shader (async compile on dummy scene) ──
        const tGenStart = performance.now();
        const fullMat = this.deps.materials.buildFullMaterial(config);
        const tGenEnd = performance.now();

        // Lazy-init the dummy compile scene (reused across compiles).
        if (!this.scene) {
            const pass = createFullscreenPass();
            this.scene = pass.scene;
            this.mesh = pass.mesh;
            this.camera = pass.camera;
        }
        this.mesh!.material = fullMat;

        const tGpuStart = performance.now();
        try {
            const compileTarget = this.deps.pipeline.getCompileTarget();
            if (compileTarget) renderer.setRenderTarget(compileTarget);
            await renderer.compileAsync(this.scene!, this.camera!);
            if (compileTarget) renderer.setRenderTarget(null);
        } catch (e) {
            console.warn('[Compile] compileAsync failed, falling back to sync:', e);
            renderer.setRenderTarget(null);
            renderer.compile(this.scene!, this.camera!);
        }
        const tGpuEnd = performance.now();

        // Discard if newer compile triggered while we were compiling.
        if (generation !== this.generation) {
            fullMat.dispose();
            return;
        }

        // Hot-swap: replace preview/current material with fully compiled material.
        this.deps.materials.swapFullMaterial(fullMat);
        this.deps.sceneCtrl.setMaterial(this.deps.materials.getMaterial(mode));
        // Now the new shader is active — sync modular uniforms so the new
        // pipeline's params are in place before the first render.
        if (config.pipeline) {
            this.deps.materials.syncModularUniforms(
                config.pipeline,
                (config.graph as any)?.edges ?? [],
            );
        }
        this.deps.resetAccumulation();
        this.deps.materials.shaderDirty = false;
        this.lastCompiledFormula = compiledFormulaKey;
        this.deps.pipelineRender(renderer);

        const totalElapsed = performance.now() - t0;
        this.lastDuration = totalElapsed / 1000;
        // Permanent compile timing log — do not remove
        console.log(`[Compile] Two-stage: ${totalElapsed.toFixed(0)}ms (${config.formula}, gen=${tGenEnd - tGenStart | 0}ms, gpu=${tGpuEnd - tGpuStart | 0}ms)`);
        if (this.lastDuration > 0.1) FractalEvents.emit(FRACTAL_EVENTS.COMPILE_TIME, this.lastDuration);

        this.isCompiling = false;
        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
        FractalEvents.emit(FRACTAL_EVENTS.SHADER_CODE, this.deps.materials.getLastFrag());
    }
}
