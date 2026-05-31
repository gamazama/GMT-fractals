/**
 * <GmtRendererTickDriver /> — direct port of GMT's `WorkerTickScene.tsx`.
 *
 * R3F component that drives the render worker via useFrame. Mounts INSIDE
 * the app's <Canvas> (from @react-three/fiber) and sends RENDER_TICK every
 * frame with camera + scene-offset + renderState.
 *
 * Phase ordering each frame:
 *   Priority 0: App's navigation / camera physics
 *   Priority 1: This driver — runs TickRegistry phases, then dispatches
 *
 * TickRegistry phases (runs in order each frame):
 *   SNAPSHOT → ANIMATE → OVERLAY → UI → [DISPATCH RENDER_TICK inline]
 *
 * NOTE: Phase C shell — the tick registrations below are commented out
 * because they live in `engine-gmt/features/*` which is still a Phase E
 * port. The component compiles + the per-frame dispatch works, but
 * animation and gizmo ticks won't fire until features land. GMT's FPS
 * counter / performance monitor ticks also defer to Phase E.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { getProxy } from '../engine/worker/WorkerProxy';
import { useEngineStore } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import type { SerializedCamera, SerializedOffset } from '../engine/worker/WorkerProtocol';
import {
    setViewportCamera,
    setViewportCanvas,
    snapshotDisplayCamera,
    getViewportCamera,
    isMouseOverCanvas,
} from '../engine/worker/ViewportRefs';
import { registerTick, runTicks, TICK_PHASE } from '../engine/TickRegistry';
import { viewport } from '../../engine/plugins/Viewport';
import { reportAccumulationToStore } from '../../store/slices/installAccumulationBindings';
import { buildRenderInteractionState } from './renderInteractionState';
import { INTERACTION_SOURCES } from '../interaction/interactionSources';

// ── Tick Registration — SNAPSHOT phase ──────────────────────────────────
// Capture the display camera for overlay components (light gizmos, drawing
// tools) that need the same camera state the worker is about to receive.

registerTick('snapshotDisplayCamera', TICK_PHASE.SNAPSHOT, () => {
    const cam = getViewportCamera();
    if (cam) snapshotDisplayCamera(cam);
});

// ── Feature-provided ticks — registered by features themselves at
//    module load (Phase E). Examples from GMT:
//      - 'animationTick'         ANIMATE   (features/animation/AnimationSystem)
//      - 'lightGizmoTick'        OVERLAY   (features/lighting/LightGizmo)
//      - 'drawingOverlayTick'    OVERLAY   (features/drawing/DrawingOverlay)
//      - 'fpsCounterTick'        UI        (features/debug/FpsCounter)
//      - 'performanceMonitorTick' UI       (features/debug/PerformanceMonitor)
//      - 'trackRowTick'          UI        (features/animation/TrackRow)

// ── Component ────────────────────────────────────────────────────────

interface GmtRendererTickDriverProps {
    onLoaded?: () => void;
}

export const GmtRendererTickDriver: React.FC<GmtRendererTickDriverProps> = ({ onLoaded }) => {
    const { camera, size, gl } = useThree();
    const [isReady, setIsReady] = useState(false);
    const proxy = getProxy();
    const dpr = useEngineStore((s: any) => s.dpr);

    // Track latest viewport size in a ref so post-compile resize uses
    // current values, not stale closure captures from mount.
    const sizeRef = useRef({ width: size.width, height: size.height, dpr });
    sizeRef.current = { width: size.width, height: size.height, dpr };

    // Register R3F camera + canvas for DOM overlays (light gizmos, etc.)
    useEffect(() => {
        setViewportCamera(camera);
        setViewportCanvas(gl.domElement);
    }, [camera, gl]);

    // Wait for worker boot + compile via event subscription.
    //
    // Previously a 300 × 100 ms poll: on boot failure it bailed silently
    // after 30 s, leaving the splash frozen forever (no `onLoaded` →
    // `isReady` stays false → fade-out gate never opens). The unbounded
    // `while (proxy.isCompiling)` second loop had no timeout at all.
    //
    // The replacement subscribes to WORKER_BOOTED + IS_COMPILING:false
    // and runs the readiness check on each tick. Boot failure is now
    // surfaced through WORKER_BOOT_FAILED (handled by LoadingScreen),
    // not by silently waiting out a timer.
    useEffect(() => {
        let finished = false;

        const finalize = () => {
            if (finished) return;
            if (!proxy.isBooted) return;
            // hasCompiledShader is a one-way latch — true once the first
            // COMPILING:false arrives. Using it instead of `!isCompiling`
            // avoids the race where the worker is between init and the
            // first COMPILING:true (isCompiling momentarily false, but no
            // compile has actually happened yet).
            if (!proxy.hasCompiledShader) return;
            if (proxy.isCompiling) return;

            finished = true;

            // Re-push viewport size — layout may have shifted during compile.
            const s = sizeRef.current;
            proxy.resizeWorker(s.width, s.height, s.dpr);

            // Consume stashed teleport from applyPresetState — the exact
            // payload computed during loadScene, not a re-read from the
            // store (which may have drifted if orbit/physics ticks ran
            // between mount and boot-ready).
            const stashed = proxy.pendingTeleport;
            if (stashed) {
                proxy.pendingTeleport = null;
                FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, stashed);
            }

            setIsReady(true);
            if (onLoaded) onLoaded();
        };

        const unsubs = [
            FractalEvents.on(FRACTAL_EVENTS.WORKER_BOOTED, finalize),
            FractalEvents.on(FRACTAL_EVENTS.IS_COMPILING, (status) => {
                if (status === false) finalize();
            }),
        ];

        // Synchronous catch-up: events may have already fired before this
        // effect runs (e.g. fast boot, StrictMode remount).
        finalize();

        return () => { unsubs.forEach((u) => u()); };
    }, []);

    // Handle resize (reacts to viewport size AND DPR changes).
    useEffect(() => {
        proxy.resizeWorker(size.width, size.height, dpr);
    }, [size.width, size.height, dpr]);

    // Bridge FractalEvents → worker. Before boot, CONFIG/UNIFORM/RESET are
    // suppressed — they'd queue on the worker and trigger a redundant
    // second compile after BOOT delivers the full config.
    useEffect(() => {
        const unsubs = [
            FractalEvents.on(FRACTAL_EVENTS.CONFIG, (config) => {
                // Same ShaderConfig cast as GmtRendererCanvas — generic
                // store type → GMT proxy's narrower type.
                if (proxy.isBooted) proxy.sendConfig(config as any);
            }),
            FractalEvents.on(FRACTAL_EVENTS.CONFIG_DONE, () => {
                // Main-thread flushes accumulated CONFIG diffs with this
                // signal — worker fires its own fireCompile() in response,
                // skipping the 200ms scheduleCompile debounce.
                if (proxy.isBooted) proxy.post({ type: 'CONFIG_DONE' });
            }),
            FractalEvents.on(FRACTAL_EVENTS.UNIFORM, ({ key, value, noReset }) => {
                if (proxy.isBooted) proxy.setUniform(key, value, noReset);
            }),
            FractalEvents.on(FRACTAL_EVENTS.RESET_ACCUM, () => {
                if (proxy.isBooted) proxy.resetAccumulation();
            }),
            FractalEvents.on(FRACTAL_EVENTS.OFFSET_SET, (v: any) => {
                const offset = { x: v.x, y: v.y, z: v.z, xL: v.xL ?? 0, yL: v.yL ?? 0, zL: v.zL ?? 0 };
                proxy.setShadowOffset(offset);
                if (proxy.isBooted) proxy.post({ type: 'OFFSET_SET', offset });
            }),
            FractalEvents.on(FRACTAL_EVENTS.OFFSET_SHIFT, ({ x, y, z }) => {
                proxy.applyOffsetShift(x, y, z);
                if (proxy.isBooted) proxy.post({ type: 'OFFSET_SHIFT', x, y, z });
            }),
            FractalEvents.on(FRACTAL_EVENTS.CAMERA_SNAP, () => {
                proxy.shouldSnapCamera = true;
            }),
            FractalEvents.on(FRACTAL_EVENTS.TEXTURE, ({ textureType, dataUrl }) => {
                if (proxy.isBooted) proxy.updateTexture(textureType, dataUrl);
            }),
            FractalEvents.on(FRACTAL_EVENTS.REGISTER_FORMULA, ({ id, shader }: any) => {
                proxy.registerFormula(id, shader);
            }),
        ];

        return () => { unsubs.forEach((u) => u()); };
    }, []);

    // Performance throttle: when FPS < 20, yield 1 frame/sec to let React
    // render UI (keeps the app responsive during heavy compile/bucket-render).
    const throttleRef = React.useRef({ lastYield: 0, fps: 60, frames: 0, lastSample: 0 });

    // ADR-0061 P4 — divergence instrument state (dev overlay only). Tracks the
    // accumulation count across frames to derive the legacy accum-drop signal,
    // and the overlay-open edge so each parallel-run pass starts from a zeroed
    // counter. See the divergence block in the dispatch useFrame.
    const divProbe = React.useRef({ prevOpen: false, prevAccum: 0, lastDropMs: -Infinity });

    useFrame((_state, delta) => {
        if (!isReady) return;

        // ADR-0061 (P3a) — drive the InteractionSession watchdog on the frame
        // cadence now that producers can create sessions. Constant-time check;
        // force-clears a stranded begin (a producer that missed its end) past
        // MAX_SESSION_MS. INERT: no consumer reads `interacting` yet (that is
        // P4); the only effect is the dev overlay collapsing a stuck session.
        useEngineStore.getState().tickInteractionWatchdog();

        // Clamp delta — prevents tab-switch / debugger-pause from feeding a
        // huge delta into VirtualSpace smoothing (would trigger a spurious
        // accumulation reset).
        const clampedDelta = Math.min(delta, 0.1);

        // Track FPS + yield frames when struggling.
        const now = performance.now();
        const t = throttleRef.current;
        t.frames++;
        if (now - t.lastSample >= 500) {
            t.fps = t.frames * 1000 / (now - t.lastSample);
            t.frames = 0;
            t.lastSample = now;
            viewport.reportFps(t.fps);
            reportAccumulationToStore(useEngineStore, proxy);
        }
        if (t.fps < 20 && now - t.lastYield >= 1000) {
            t.lastYield = now;
            runTicks(clampedDelta);
            return;
        }

        // Run all registered ticks: SNAPSHOT → ANIMATE → OVERLAY → UI.
        runTicks(clampedDelta);

        // Sync R3F camera FOV with optics — raycaster/gizmo projections
        // must match the rendered image's FOV.
        const cam = camera as THREE.PerspectiveCamera;
        const storeFov = (useEngineStore.getState() as any).optics?.camFov ?? 60;
        if (cam.fov !== storeFov) {
            cam.fov = storeFov;
            cam.updateProjectionMatrix();
        }

        // DISPATCH — serialize camera + state and send to render worker.
        const serializedCamera: SerializedCamera = {
            position: [cam.position.x, cam.position.y, cam.position.z],
            quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
            fov: cam.fov || 60,
            aspect: cam.aspect || (size.width / size.height),
        };

        const storeState = useEngineStore.getState() as any;
        const offset = storeState.sceneOffset || { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
        const serializedOffset: SerializedOffset = {
            x: offset.x, y: offset.y, z: offset.z,
            xL: offset.xL ?? 0, yL: offset.yL ?? 0, zL: offset.zL ?? 0,
        };

        // `cameraInUse` (engine-side hold gate) ORs the animationStore's
        // user-driven flag with `isPlaying` and `isScrubbing` so the engine
        // suppresses accumulation reset during animation playback and timeline
        // scrubbing — same path that already worked for orbit drag. Keeps
        // path-tracer accumulation from thrashing on every per-frame
        // CAMERA_TELEPORT during heavy playback.
        const animState = useAnimationStore.getState();

        // ADR-0061 worker bridge — derive the InteractionSession booleans and
        // send them in renderState. SENT BUT UNUSED in P2: no consumer reads
        // renderState.interacting / .isSceneAnimating yet (that is P4). The
        // pure buildRenderInteractionState() pins the key names to
        // EngineRenderState so a producer/consumer typo can't silently read
        // false (debug/test-interaction-wiring.mts guards the round-trip).
        const interactionBlock = buildRenderInteractionState({
            sessionInteracting: storeState.isInteracting(),
            // Filtered subset for the accumulation HOLD consumer (P4): camera /
            // gizmo / scrub gestures only — the set where freezing the frame is
            // correct. Sliders/picker/drawing are excluded (they must re-render
            // fresh), exactly as the legacy `cameraInUse || isGizmoInteracting`
            // set behaved, just without the buffered-useFrame lag.
            sessionHoldActive: storeState.isInteracting({ only: [INTERACTION_SOURCES.camera, INTERACTION_SOURCES.gizmo, INTERACTION_SOURCES.scrub] }),
            isPlaying: animState.isPlaying,
            // Active LFO ≈ LFOs enabled with at least one animation bound. This
            // is the autonomous-animation axis (NOT a gesture) adaptive composes
            // with `interacting` in P4.
            hasActiveModulation: !!storeState.lfosEnabled && (storeState.animations?.length ?? 0) > 0,
        });

        const renderState = {
            cameraMode: storeState.cameraMode,
            cameraInUse: animState.isCameraInteracting || animState.isPlaying || animState.isScrubbing,
            isGizmoInteracting: proxy.isGizmoInteracting,
            mouseOverCanvas: isMouseOverCanvas(),
            optics:   storeState.optics   ?? null,
            lighting: storeState.lighting ?? null,
            quality:  storeState.quality  ?? null,
            geometry: storeState.geometry ?? null,
            adaptiveSuppressed: !!storeState.adaptiveSuppressed,
            ...interactionBlock, // interacting + isSceneAnimating + sessionHoldActive (ADR-0061)
            // ADR-0061 P4 — per-consumer flags cross to the worker so adaptive
            // (UniformManager) + hold/idle-pause (FractalEngine) pick session-vs-
            // legacy independently. Defaulted OFF → behaves as the legacy proxy.
            interactionConsumerFlags: storeState.interactionConsumerFlags,
        };

        proxy.sendRenderTick(serializedCamera, serializedOffset, clampedDelta, renderState);

        // ── ADR-0061 P4 — parallel-run divergence instrument (dev overlay only) ──
        // Compares the session's adaptive-activity view (what the consumers now
        // use) against the legacy adaptive activity it replaces (proxy +
        // accum-drop), so the user's visual pass is OBJECTIVE rather than vibes:
        // near-zero divergence = agreement; a spike named `slider`/`picker`/
        // `drawing` is the expected "session leads the laggy accum-drop" win; a
        // spike during obvious camera/gizmo use would flag a missed producer (a
        // real regression). Gated on the overlay being open → zero overhead in
        // normal use. The counter zeroes on each overlay open.
        const overlayOpen = !!(storeState as any).debugTools?.interactionSessionOpen;
        if (overlayOpen) {
            if (!divProbe.current.prevOpen) {
                storeState.resetInteractionDivergence();
                divProbe.current.prevAccum = proxy.accumulationCount;
                divProbe.current.lastDropMs = -Infinity;
            }
            // Legacy accum-drop: an external accumulation reset (param / camera /
            // preset change) within a short recency window. ~250ms ≈ the session
            // debounce tail; the FPS-scaled adaptive grace is worker-internal, so
            // this is an instrument approximation — enough to spot gross
            // disagreement, not micro-timing at the edges.
            const ac = proxy.accumulationCount;
            if (ac < divProbe.current.prevAccum) divProbe.current.lastDropMs = now;
            divProbe.current.prevAccum = ac;
            const accumDropRecent = now - divProbe.current.lastDropMs < 250;

            const legacyActive = (renderState.cameraInUse || renderState.isGizmoInteracting) || accumDropRecent;
            const sessionActive = interactionBlock.interacting || interactionBlock.isSceneAnimating;
            if (sessionActive !== legacyActive) {
                const recent = Array.from(storeState.getRecentInteractionSources?.() ?? []) as string[];
                const src = recent.length ? recent.join('+') : (accumDropRecent ? 'accum-drop' : '—');
                storeState.noteInteractionDivergence(`session=${sessionActive ? 1 : 0} legacy=${legacyActive ? 1 : 0} src=${src}`);
            }
        }
        divProbe.current.prevOpen = overlayOpen;
    }, 1);

    return null;
};
