/**
 * FluidToyApp — engine-native Fluid Toy.
 *
 * 3b: FluidEngine mounted inside <ViewportFrame>. Canvas physical-pixel
 * size is driven by canvasPixelSize (authoritative writer: the frame's
 * ResizeObserver) × qualityFraction (driven by the adaptive loop).
 *
 * No bespoke ResizeObserver. No bespoke adaptive loop. Both live in
 * @engine/viewport. FluidEngine's own internal params are still its
 * defaults — DDFS features arrive in 3c-3e.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useEngineStore } from '../store/engineStore';
import { ViewportFrame } from '../engine/plugins/viewport/ViewportFrame';
import { viewport, useQualityFraction, useViewportFps } from '../engine/plugins/Viewport';
import { TopBarHost } from '../engine/plugins/TopBar';
import { HudHost } from '../engine/plugins/Hud';
import { featureRegistry } from '../engine/FeatureSystem';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { FluidEngine } from './fluid/FluidEngine';
import { Dock } from '../components/layout/Dock';
import { DropZones } from '../components/layout/DropZones';
import DraggableWindow from '../components/DraggableWindow';
import { PanelRouter } from '../components/PanelRouter';
import { PanelId, PanelState } from '../types';
import { StoreCallbacksProvider } from '../components/contexts/StoreCallbacksContext';
import type { StoreCallbacks } from '../components/contexts/StoreCallbacksContext';
import { TimelineHost } from '../components/TimelineHost';
import { EngineBridge } from '../components/EngineBridge';
import { RenderLoopDriver } from '../engine/plugins/RenderLoop';
import GlobalContextMenu from '../components/GlobalContextMenu';
import { HelpOverlay } from '../engine/plugins/Help';
import { generateGradientTextureBuffer } from '../utils/colorUtils';
import { forceModeFromIndex } from './features/coupling';
import { kindFromIndex } from './features/julia';
import { fluidStyleFromIndex, toneMappingFromIndex } from './features/postFx';
import { colorMappingFromIndex, dyeBlendFromIndex, dyeDecayModeFromIndex } from './features/palette';
import { showFromIndex } from './features/composite';
import { FluidPointerLayer } from './FluidPointerLayer';
import { registerFluidToyHotkeys } from './hotkeys';
import { appEngine, brushHandles, cursorHandles } from './engineHandles';
import { brushModeFromIndex, brushColorModeFromIndex } from './features/brush';
import { stepBrush, type BrushParams } from './brush';
import { useSlice } from '../engine/typedSlices';

// Read-once helper that flattens the DDFS brush slice + the cached
// gradient LUT into a BrushParams object. Called each frame from the
// RAF loop. Defaults match BrushFeature's DDFS defaults.
const readBrushParamsForFrame = (): BrushParams => {
    const b = (useEngineStore.getState() as any).brush ?? {};
    return {
        mode: brushModeFromIndex(b.mode),
        colorMode: brushColorModeFromIndex(b.colorMode),
        solidColor: [b.solidColor?.x ?? 1, b.solidColor?.y ?? 1, b.solidColor?.z ?? 1],
        gradientLut: brushHandles.ref.current.gradientLut,
        size: b.size ?? 0.15,
        hardness: b.hardness ?? 0,
        strength: b.strength ?? 1,
        flow: b.flow ?? 50,
        spacing: b.spacing ?? 0.005,
        jitter: b.jitter ?? 0,
        particleEmitter: !!b.particleEmitter,
        particleRate: b.particleRate ?? 120,
        particleVelocity: b.particleVelocity ?? 0.3,
        particleSpread: b.particleSpread ?? 0.35,
        particleGravity: b.particleGravity ?? 0,
        particleDrag: b.particleDrag ?? 0.6,
        particleLifetime: b.particleLifetime ?? 1.2,
        particleSizeScale: b.particleSizeScale ?? 0.35,
    };
};

const DomOverlays: React.FC = () => {
    const overlays = featureRegistry.getViewportOverlays().filter(o => o.type === 'dom');
    // Re-render when ANY slice referenced by an overlay changes —
    // not the entire store. Using a single useEngineStore() with no
    // selector here would re-render on every setJulia / animation
    // tick, contributing to the per-pointer-event update cascade
    // that trips React's max-depth guard during fluid drags. We
    // subscribe per-overlay instead.
    return (
        <div className="absolute inset-0 pointer-events-none z-[20]">
            {overlays.map(cfg => {
                const C = componentRegistry.get(cfg.componentId);
                if (!C) return null;
                return <DomOverlayInstance key={cfg.id} cfg={cfg} Component={C} />;
            })}
        </div>
    );
};

// Per-overlay subscription so we re-render only when THIS overlay's
// slice changes (not the whole store). Stable function refs from the
// store are read once via getState() and passed as actions — they
// don't change between renders so we don't subscribe to them.
const DomOverlayInstance: React.FC<{
    cfg: { id: string; componentId: string };
    Component: React.FC<any>;
}> = ({ cfg, Component }) => {
    const slice = useEngineStore((s: any) => s[cfg.id]);
    if (!slice) return null;
    const actions = useEngineStore.getState();
    return <Component featureId={cfg.id} sliceState={slice} actions={actions} />;
};

// Stable empty-fallback for the liveModulations selector. Module-level
// so it's the same reference across renders — using `?? {}` inline
// would create a fresh object every selector call and break Zustand's
// shallow-equality re-render gate.
const EMPTY_MODS: Record<string, number> = Object.freeze({}) as Record<string, number>;

export const FluidToyApp: React.FC = () => {
    // Granular selectors — DO NOT use `useEngineStore()` with no
    // selector here. That subscribes to the entire store, which means
    // every setJulia/setBrush/setLiveModulations etc. re-renders the
    // entire FluidToyApp tree. With React 18's stricter scheduling
    // and rapid pointer-event setter bursts, the cascade of subscriber
    // re-renders during a drag trips React's max-depth guard. Each
    // value below is either a stable function ref (created once at
    // store init) or a coarse panels object that changes rarely.
    const panels = useEngineStore((s) => s.panels);
    const contextMenu = useEngineStore((s) => s.contextMenu);
    const handleInteractionStart = useEngineStore((s) => s.handleInteractionStart);
    const handleInteractionEnd = useEngineStore((s) => s.handleInteractionEnd);
    const openContextMenu = useEngineStore((s) => s.openContextMenu);
    const closeContextMenu = useEngineStore((s) => s.closeContextMenu);
    const togglePanel = useEngineStore((s) => s.togglePanel);
    const openHelp = useEngineStore((s) => s.openHelp);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<FluidEngine | null>(null);
    const rafRef = useRef<number | null>(null);

    const floatingPanels = (Object.values(panels) as PanelState[])
        .filter((p) => p.location === 'float' && p.isOpen);

    const storeCallbacks = useMemo<StoreCallbacks>(() => ({
        handleInteractionStart,
        handleInteractionEnd,
        openContextMenu,
    }), [handleInteractionStart, handleInteractionEnd, openContextMenu]);

    // Authoritative size (written by ViewportFrame's ResizeObserver) ×
    // adaptive quality fraction. FluidEngine.resize() takes CSS pixels
    // (not DPR-multiplied) for its WebGL buffer, matching toy-fluid's
    // original contract. So we divide DPR out and apply quality.
    const canvasPixelSize = useEngineStore((s) => s.canvasPixelSize);
    const quality = useQualityFraction();
    const { fpsSmoothed } = useViewportFps();
    // DDFS feature slices — push into FluidEngine.setParams on change.
    // Typed slice reads — import ./storeTypes.ts once (done by main.tsx)
    // and these calls return real slice shapes, not `any`.
    const julia       = useSlice('julia');
    const coupling    = useSlice('coupling');
    const palette     = useSlice('palette');
    const collision   = useSlice('collision');
    const fluidSim    = useSlice('fluidSim');
    const postFx      = useSlice('postFx');
    const composite   = useSlice('composite');
    // Generic render-control slice — `accumulation` gates TSAA on the
    // background fractal, `sampleCap` bounds the accumulator. Both live
    // in engine-core renderControlSlice so any future app can reuse them.
    const accumulation = useEngineStore((s) => s.accumulation);
    // sampleCap is intentionally NOT subscribed — fluid-toy pins
    // tsaaSampleCap at 64 below (see comment there).
    const isPaused     = useEngineStore((s) => s.isPaused);
    // Live-modulated values (base + LFO/audio/rule offsets). The
    // engine/animation/modulationTick writes this each frame.
    // Read-with-fallback pattern: liveMod[target] if present, else base.
    // Use a STABLE empty fallback — `?? {}` would return a new ref every
    // selector eval, defeating Zustand's reference-equality re-render
    // gate and forcing FluidToyApp to re-render on every store update.
    const liveMod = useEngineStore((s: any) => s.liveModulations ?? EMPTY_MODS);

    // Boot the engine once.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
            const engine = new FluidEngine(canvas, {
                onFrameEnd: () => viewport.frameTick(),
            });
            engineRef.current = engine;
            appEngine.ref.current = engine;
            // globalThis.__appHandles[*] populated automatically by
            // defineAppHandles in dev — smoke tests inspect via that.

            // RAF loop — engine.frame(timeMs) does the full sim + display pass.
            // BEFORE the engine frame we step the brush runtime: advances the
            // rainbow hue phase, spawns/steps particles, and paints each one
            // as a tiny splat via engine.brush(). Particles sit in
            // brushHandles.ref.current.runtime so FluidPointerLayer (per-move
            // emitter) and this per-frame step share one instance.
            let prevT = -1;
            const loop = (t: number) => {
                const dtSec = prevT < 0 ? 0 : Math.min(0.1, (t - prevT) / 1000);
                prevT = t;
                if (engineRef.current) {
                    const cursor = cursorHandles.ref.current;
                    stepBrush(brushHandles.ref.current.runtime, {
                        dtSec,
                        wallClockMs: t,
                        dragging: cursor.dragging,
                        cursorUv: cursor.uv,
                        cursorVelUv: cursor.velUv,
                        params: readBrushParamsForFrame(),
                        engine: engineRef.current,
                    });
                    engineRef.current.frame(t);
                }
                rafRef.current = requestAnimationFrame(loop);
            };
            rafRef.current = requestAnimationFrame(loop);
        } catch (e) {
            console.error('[FluidToy] failed to start engine:', e);
        }

        // Register hotkeys now that engineRef is live (R needs engine.resetFluid).
        registerFluidToyHotkeys(engineRef);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            engineRef.current?.dispose();
            engineRef.current = null;
            appEngine.ref.current = null;
        };
    }, []);

    // Push Julia params. juliaC reads liveModulations first (base+offset
    // from any LFO/audio/rule driver — like the orbit LFOs) and falls
    // back to the DDFS base. That's how orbit, audio-reactive c, and
    // future modulation sources all compose without FluidToyApp knowing
    // they exist.
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || !julia) return;
        const baseX = julia.juliaC?.x ?? 0;
        const baseY = julia.juliaC?.y ?? 0;
        const cx = liveMod['julia.juliaC_x'] ?? baseX;
        const cy = liveMod['julia.juliaC_y'] ?? baseY;
        // Camera pan + zoom live on the julia slice (Fractal tab).
        const center = julia.center ?? { x: 0, y: 0 };
        engine.setParams({
            kind: kindFromIndex(julia.kind),
            juliaC: [cx, cy],
            maxIter: julia.maxIter ?? 310,
            power: julia.power ?? 2,
            center: [center.x ?? 0, center.y ?? 0],
            zoom: julia.zoom ?? 1.5,
        });
    }, [julia, liveMod]);

    // Push Palette params + gradient LUTs whenever they change.
    // Palette owns every display-stage iteration-colour knob plus the
    // dye-blend mode and the (hidden) collision block + dyeMix that
    // will move to their own features on later tabs.
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || !palette) return;

        // Normalize the line-trap normal so the shader's distance math
        // stays well-defined. The slider exposes a raw (x,y) for
        // intuition but the uniform wants a unit vector.
        const rawNx = palette.trapNormal?.x ?? 1;
        const rawNy = palette.trapNormal?.y ?? 0;
        const nLen = Math.hypot(rawNx, rawNy);
        const trapNormal: [number, number] = nLen > 1e-6
            ? [rawNx / nLen, rawNy / nLen]
            : [1, 0];

        const interior = palette.interiorColor ?? { x: 0.02, y: 0.02, z: 0.04 };

        engine.setParams({
            colorMapping:        colorMappingFromIndex(palette.colorMapping),
            colorIter:           palette.colorIter ?? 310,
            escapeR:             palette.escapeR ?? 32,
            interiorColor:       [interior.x ?? 0.02, interior.y ?? 0.02, interior.z ?? 0.04],
            trapCenter:          [palette.trapCenter?.x ?? 0, palette.trapCenter?.y ?? 0],
            trapRadius:          palette.trapRadius ?? 1,
            trapNormal,
            trapOffset:          palette.trapOffset ?? 0,
            stripeFreq:          palette.stripeFreq ?? 4,
            dyeBlend:            dyeBlendFromIndex(palette.dyeBlend),
            gradientRepeat:      palette.gradientRepeat ?? 1,
            gradientPhase:       palette.gradientPhase ?? 0,
        });

        if (palette.gradient) {
            const lut = generateGradientTextureBuffer(palette.gradient);
            engine.setGradientBuffer(lut);
            // Also cache for the brush colour pipeline — paintFromGradient
            // samples the same bytes.
            brushHandles.ref.current.gradientLut = lut;
        }
    }, [palette]);

    // Push collision walls. Mask pass only fires when `enabled`; the
    // *Repeat/*Phase remap t before the collision LUT lookup so walls
    // tile independently of the dye palette.
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || !collision) return;
        engine.setParams({
            collisionEnabled: !!collision.enabled,
            collisionPreview: !!collision.preview,
            collisionRepeat:  collision.repeat ?? 1,
            collisionPhase:   collision.phase ?? 0,
        });
        if (collision.gradient) {
            const lut = generateGradientTextureBuffer(collision.gradient);
            engine.setCollisionGradientBuffer(lut);
        }
    }, [collision]);

    // Push fluid-sim dynamics knobs + coupling-tab force-law knobs.
    // Both slices reach FluidEngine via one call so a change to either
    // schedules a single setParams. simResolution is the user TARGET;
    // the actual sim grid is scaled by qualityFraction (adaptive).
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || !fluidSim || !coupling) return;
        engine.setParams({
            simResolution:  Math.max(64, Math.floor((fluidSim.simResolution ?? 1344) * quality)),
            vorticity:      fluidSim.vorticity ?? 22.1,
            vorticityScale: fluidSim.vorticityScale ?? 1,
            pressureIters:  fluidSim.pressureIters ?? 50,
            dissipation:    fluidSim.dissipation ?? 0.17,
            paused:         !!fluidSim.paused,
            dt:             fluidSim.dt ?? 0.016,
            // Dye-inject + dye-decay subsection live on the Fluid tab.
            dyeInject:          fluidSim.dyeInject ?? 8,
            dyeDecayMode:       dyeDecayModeFromIndex(fluidSim.dyeDecayMode),
            dyeDissipation:     fluidSim.dyeDissipation ?? 1.03,
            dyeChromaDecayHz:   fluidSim.dyeChromaDecayHz ?? 1.03,
            dyeSaturationBoost: fluidSim.dyeSaturationBoost ?? 1,
            // Coupling-tab force law.
            forceMode:      forceModeFromIndex(coupling.forceMode),
            forceGain:      coupling.forceGain ?? -1200,
            interiorDamp:   coupling.interiorDamp ?? 0.59,
            forceCap:       coupling.forceCap ?? 40,
            edgeMargin:     coupling.edgeMargin ?? 0.04,
            // autoQuality stays off in our port — adaptive is handled by
            // @engine/viewport, not FluidEngine's internal loop.
            autoQuality:    false,
        });
    }, [fluidSim, coupling, quality]);

    // (Scene-camera push was merged into the Julia effect above — same
    // slice now.)

    // Push post-FX (tone mapping, exposure, bloom, aberration, refraction,
    // caustics, style preset). Pure display-stage — doesn't touch sim state.
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || !postFx) return;
        engine.setParams({
            fluidStyle:     fluidStyleFromIndex(postFx.fluidStyle),
            toneMapping:    toneMappingFromIndex(postFx.toneMapping),
            exposure:       postFx.exposure ?? 1,
            vibrance:       postFx.vibrance ?? 1.645,
            bloomAmount:    postFx.bloomAmount ?? 0,
            bloomThreshold: postFx.bloomThreshold ?? 0.9,
            aberration:     postFx.aberration ?? 0,
            refraction:       postFx.refraction ?? 0,
            refractSmooth:    postFx.refractSmooth ?? 3,
            refractRoughness: postFx.refractRoughness ?? 0,
            caustics:         postFx.caustics ?? 0,
        });
    }, [postFx]);

    // Push composite mix (show mode + julia / dye / velocity balance).
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || !composite) return;
        engine.setParams({
            show:        showFromIndex(composite.show),
            juliaMix:    composite.juliaMix ?? 0.4,
            dyeMix:      composite.dyeMix ?? 2,
            velocityViz: composite.velocityViz ?? 0.02,
        });
    }, [composite]);

    // Generic render-control → TSAA. Bridges engine-core's renderControl-
    // Slice to FluidEngine's TSAA knobs. Toggling `accumulation` off drops
    // jitter to 0 and stops the blend pass; bumping `sampleCap` lets the
    // accumulator converge further before it plateaus.
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.setParams({
            tsaa:          accumulation ?? true,
            // 64 is plenty for fluid-toy's progressive grid TSAA: K=4
            // per frame × 16 rounds = 256 unique sub-samples by frame
            // 64. The engine-level `sampleCap` (default 256) is sized
            // for GMT's path-traced renderer; we pin the fluid-toy
            // ceiling lower so the GPU stops accumulating once the
            // fractal background has visually settled.
            tsaaSampleCap: 64,
            // Pause button (topbar) → fluid sim. When paused, dye + velocity
            // freeze; the fractal keeps rendering so TSAA can converge.
            paused:        !!isPaused,
        });
    }, [accumulation, isPaused]);

    // Resize whenever physical pixels or quality fraction change.
    useEffect(() => {
        const engine = engineRef.current;
        const [physW, physH] = canvasPixelSize;
        if (!engine || physW < 1 || physH < 1) return;
        const dpr = window.devicePixelRatio || 1;
        // Scale down physical px by DPR to get CSS-ish logical px, then
        // apply quality. FluidEngine.resize expects logical pixels —
        // matches the original toy-fluid contract.
        const logicalW = Math.max(1, Math.floor((physW / dpr) * quality));
        const logicalH = Math.max(1, Math.floor((physH / dpr) * quality));
        engine.resize(logicalW, logicalH);
    }, [canvasPixelSize, quality]);

    return (
        <StoreCallbacksProvider value={storeCallbacks}>
        <div className="fixed inset-0 w-full h-full bg-black text-white select-none overflow-hidden flex flex-col">
            <EngineBridge />
            <RenderLoopDriver />
            <DropZones />

            {floatingPanels.map((p) => (
                <DraggableWindow key={p.id} id={p.id} title={p.id}>
                    {/* PanelRouter expects whole-state for its evalShowIf predicates and
                        legacy passthrough. We grab a current snapshot via getState()
                        instead of subscribing — PanelRouter's children handle their own
                        per-slice subscriptions, so a snapshot here is enough for the
                        coarse top-level predicates. */}
                    <PanelRouter
                        activeTab={p.id as PanelId}
                        state={useEngineStore.getState()}
                        actions={useEngineStore.getState()}
                        onSwitchTab={(t) => togglePanel(t, true)}
                    />
                </DraggableWindow>
            ))}

            <TopBarHost />

            <div className="flex-1 flex overflow-hidden relative">
                <Dock side="left" />

                <ViewportFrame className="flex-1">
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full block touch-none"
                    />
                    <FluidPointerLayer canvasRef={canvasRef} engineRef={engineRef} />
                    <HudHost />
                    <DomOverlays />
                </ViewportFrame>

                <Dock side="right" />
            </div>

            <TimelineHost />

            <HelpOverlay />

            {contextMenu.visible && (
                <GlobalContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenu.items}
                    targetHelpIds={contextMenu.targetHelpIds}
                    onClose={closeContextMenu}
                    onOpenHelp={openHelp}
                />
            )}
        </div>
        </StoreCallbacksProvider>
    );
};
