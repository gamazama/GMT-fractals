/**
 * installFractalRenderer + <FractalRendererCanvas />
 *
 * The main-thread renderer plugin for fractal-toy. Packages the three
 * things the app used to do inline inside FractalToyApp:
 *
 *   1. Canvas element ownership + FractalEngine lifetime
 *   2. Shader assembly for the active formula (rebuild on formula switch,
 *      wrapped in CompileGate so the spinner paints before GPU blocks)
 *   3. Uniform dispatch (formula slice + camera + lighting)
 *
 * An app installs the plugin once at boot (`installFractalRenderer()`)
 * and drops `<FractalRendererCanvas />` somewhere inside its layout
 * (typically as the only child of `<ViewportFrame>`).
 *
 * Why this is a plugin, not inline JSX:
 * The worker-mode renderer (future) presents the exact same contract —
 * same install call, same Canvas component — but creates an OffscreenCanvas
 * and hands it to a real Worker under the hood. Swapping renderers is then
 * a one-line import change in the app, nothing else moves.
 */

import React, { useEffect, useRef } from 'react';
import { FractalEngine } from './FractalEngine';
import { ShaderBuilder } from '../../engine/ShaderBuilder';
import { featureRegistry } from '../../engine/FeatureSystem';
import { useEngineStore } from '../../store/engineStore';
import { compileGate } from '../../store/CompileGate';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { assembleRayMarchShader } from './shaderAssembler';
import { formulaRegistry, type UniformSetters } from './formulaRegistry';
import { CompilingIndicator } from '../../components/CompilingIndicator';
import { menu } from '../../engine/plugins/Menu';
import {
    viewport,
    useQualityFraction,
} from '../../engine/plugins/Viewport';

export interface InstallFractalRendererOptions {
    /** Called once per rendered frame after the draw. Default: report to
     *  @engine/viewport's adaptive-quality loop. Apps can swap this for
     *  custom telemetry. */
    onFrameEnd?: () => void;
}

let _options: InstallFractalRendererOptions = {};
let _installed = false;
let _engine: FractalEngine | null = null;

/** One-time install. Apps call this before mounting the Canvas component.
 *  Also registers a "Formula" dropdown in the topbar populated from every
 *  registered formula — selecting an item writes `state.formula` and the
 *  Canvas's subscription triggers a CompileGate-wrapped rebuild. */
export const installFractalRenderer = (options: InstallFractalRendererOptions = {}): void => {
    _options = options;
    if (_installed) return;
    _installed = true;
    _registerFormulaMenu();
};

const _registerFormulaMenu = (): void => {
    menu.register({
        id: 'formula',
        slot: 'left',
        order: 50,
        label: 'Formula',
        title: 'Switch active formula',
        align: 'start',
        width: 'w-56',
    });
    for (const f of formulaRegistry.getAll()) {
        menu.registerItem('formula', {
            id: `formula:${f.id}`,
            type: 'toggle',
            label: f.name,
            title: f.description,
            isActive: () => (useEngineStore.getState() as any).formula === f.id,
            onToggle: () => {
                const s = useEngineStore.getState() as any;
                if (s.formula === f.id) return;
                // Write formula directly (skipping setFormula's GMT-era
                // compile-gate + CONFIG emit + history reset) — the Canvas
                // subscription below picks up the change and runs the
                // renderer's own compileGate-wrapped rebuild.
                useEngineStore.setState({ formula: f.id } as any);
            },
        });
    }
};

/** Imperative API for consumers that need the raw canvas (PNG export, etc.). */
export const fractalRenderer = {
    /** The <canvas> the renderer is currently driving, or null if not mounted. */
    getCanvas: (): HTMLCanvasElement | null => _engine?.canvas ?? null,
    /** Force-rebuild the shader for the currently-active formula. Routed
     *  through CompileGate so the UI spinner paints before the GPU call. */
    rebuild: (): void => {
        compileGate.queue('Compiling shader…', () => {
            _rebuildNow();
        });
    },
};

// ── Internals ──────────────────────────────────────────────────────────

/** Synchronously assemble + install a new shader for the active formula.
 *  Emits `is_compiling: false` on exit (success OR failure) so the
 *  CompilingIndicator hides — main-thread compile is synchronous, so the
 *  "done" signal fires the same tick the work completes. GMT's path
 *  normally gets this from the worker replying to CONFIG_DONE; our stub
 *  WorkerProxy never replies, so the renderer signals completion itself. */
const _rebuildNow = (): void => {
    const engine = _engine;
    if (!engine) {
        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
        return;
    }

    const state = useEngineStore.getState() as any;
    const formula = formulaRegistry.resolve(state.formula);
    if (!formula) {
        console.warn('[fractalRenderer] no formulas registered — shader will be gradient-only');
    }

    const builder = new ShaderBuilder('Main');
    for (const feat of featureRegistry.getAll()) {
        if (feat.inject) feat.inject(builder, {} as any, 'Main');
    }
    const fragSrc = assembleRayMarchShader(builder, { formula });
    try {
        engine.setShader(fragSrc);
    } catch (e) {
        console.error('[fractalRenderer] shader compile failed:', e);
        FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
        return;
    }

    // Re-push all uniforms because `setShader` invalidates locations.
    _pushAllUniforms();
    FractalEvents.emit(FRACTAL_EVENTS.RESET_ACCUM, undefined);
    FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
};

/** Push every formula + camera + lighting uniform. Called right after
 *  shader swap, and on any slice change for incremental updates. */
const _pushAllUniforms = (): void => {
    const engine = _engine;
    if (!engine) return;
    const s = useEngineStore.getState() as any;

    // Formula slice — look up the active formula and delegate to its
    // pushUniforms callback.
    const formula = formulaRegistry.resolve(s.formula);
    if (formula) {
        const featureId = formula.id.toLowerCase();
        const sliceState = s[featureId];
        if (sliceState && formula.pushUniforms) {
            formula.pushUniforms(_uniformSetters(engine), sliceState);
        }
    }

    _pushCamera(s.camera);
    _pushLighting(s.lighting);
};

const _uniformSetters = (engine: FractalEngine): UniformSetters => ({
    setF:  (n, v)              => engine.setUniformF(n, v),
    setI:  (n, v)              => engine.setUniformI(n, v),
    set2F: (n, a, b)           => engine.setUniform2F(n, a, b),
    set3F: (n, a, b, c)        => engine.setUniform3F(n, a, b, c),
    set4F: (n, a, b, c, d)     => engine.setUniform4F(n, a, b, c, d),
});

const _pushCamera = (camera: any): void => {
    if (!_engine || !camera) return;
    _engine.setUniformF('uCamOrbitTheta', camera.orbitTheta ?? 0.6);
    _engine.setUniformF('uCamOrbitPhi',   camera.orbitPhi ?? 0.2);
    _engine.setUniformF('uCamDistance',   camera.distance ?? 2.5);
    _engine.setUniformF('uCamFov',        camera.fov ?? 60);
    const t = camera.target;
    _engine.setUniform3F('uCamTarget', t?.x ?? 0, t?.y ?? 0, t?.z ?? 0);
};

const _pushLighting = (lighting: any): void => {
    if (!_engine || !lighting) return;
    const d = lighting.direction;
    _engine.setUniform3F('uLightDir', d?.x ?? 0.5, d?.y ?? 0.8, d?.z ?? 0.5);
    const c = lighting.color;
    if (c && typeof c === 'object' && 'r' in c) {
        _engine.setUniform3F('uLightColor', c.r, c.g, c.b);
    } else if (typeof c === 'string') {
        const hex = parseInt(c.replace('#', ''), 16);
        _engine.setUniform3F('uLightColor',
            ((hex >> 16) & 0xff) / 255,
            ((hex >>  8) & 0xff) / 255,
            ( hex        & 0xff) / 255,
        );
    } else {
        _engine.setUniform3F('uLightColor', 1, 1, 1);
    }
    _engine.setUniformF('uLightIntensity', lighting.intensity ?? 1.0);
    _engine.setUniformF('uAmbient',        lighting.ambient ?? 0.15);
    _engine.setUniformF('uAoAmount',       lighting.aoAmount ?? 0.4);
    _engine.setUniform3F('uAlbedo',
        lighting.albedoR ?? 0.85,
        lighting.albedoG ?? 0.72,
        lighting.albedoB ?? 0.55,
    );
};

// ── Canvas component ───────────────────────────────────────────────────

/**
 * The canvas + engine lifetime. Drop inside `<ViewportFrame>`. Resizes
 * itself on canvasPixelSize × qualityFraction changes (dynamic-resolution
 * trick: smaller WebGL buffer, browser blits to the full-size canvas
 * element).
 */
export const FractalRendererCanvas: React.FC = () => {
    if (!_installed) {
        console.warn('[fractalRenderer] <FractalRendererCanvas /> rendered without installFractalRenderer() — frame telemetry will be missing.');
    }

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const canvasPixelSize = useEngineStore((s) => s.canvasPixelSize);
    const quality = useQualityFraction();

    // Boot engine + install initial shader. Subscribes run inside this
    // effect so the renderer plugin OWNS the subscriptions — no React
    // effects in FractalToyApp push uniforms anymore.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
            const engine = new FractalEngine(canvas, {
                onFrameEnd: _options.onFrameEnd ?? (() => viewport.frameTick()),
            });
            _engine = engine;
            _rebuildNow();
            engine.start();
        } catch (e) {
            console.error('[fractalRenderer] failed to start engine:', e);
            return;
        }

        // Slice subscriptions → targeted uniform pushes.
        const store = useEngineStore;
        const unsubs: Array<() => void> = [];

        // Formula change → full rebuild via CompileGate.
        unsubs.push(store.subscribe(
            (s) => s.formula,
            () => fractalRenderer.rebuild(),
        ));

        // Active-formula slice → just push uniforms (no recompile needed).
        unsubs.push(store.subscribe(
            (s) => {
                const formula = formulaRegistry.resolve((s as any).formula);
                if (!formula) return null;
                return (s as any)[formula.id.toLowerCase()];
            },
            (sliceState) => {
                if (!_engine || !sliceState) return;
                const formula = formulaRegistry.resolve((store.getState() as any).formula);
                if (!formula?.pushUniforms) return;
                formula.pushUniforms(_uniformSetters(_engine), sliceState);
            },
        ));

        unsubs.push(store.subscribe((s: any) => s.camera,   (c) => _pushCamera(c)));
        unsubs.push(store.subscribe((s: any) => s.lighting, (l) => _pushLighting(l)));

        return () => {
            unsubs.forEach((u) => u());
            _engine?.dispose();
            _engine = null;
        };
    }, []);

    // Resize drawing buffer on frame size × quality changes.
    useEffect(() => {
        const engine = _engine;
        if (!engine) return;
        const [physW, physH] = canvasPixelSize;
        if (physW < 1 || physH < 1) return;
        engine.resize(
            Math.max(1, Math.floor(physW * quality)),
            Math.max(1, Math.floor(physH * quality)),
        );
    }, [canvasPixelSize, quality]);

    return (
        <>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
            <CompilingIndicator />
        </>
    );
};
