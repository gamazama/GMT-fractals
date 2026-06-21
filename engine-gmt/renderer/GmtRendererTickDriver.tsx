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

// If the worker hasn't booted + compiled within this window, assume a silent
// failure (e.g. a shader that won't compile/run on a weak mobile GPU → black
// viewport) and surface the boot-failure panel. Generous so a slow-but-working
// mobile compile isn't falsely tripped.
const BOOT_WATCHDOG_MS = 30000;

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

    // Convergence-stop state (see the gate in useFrame): the last camera we
    // dispatched (for change detection). `lastInvalidateRef` is bumped by the wake
    // subscription below on any output-changing event so a settled loop re-arms.
    const convergeRef = useRef<{ lastCam: SerializedCamera | null }>({ lastCam: null });
    const lastInvalidateRef = useRef(0);

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
        let watchdog: ReturnType<typeof setTimeout> | null = null;
        const clearWatchdog = () => { if (watchdog) { clearTimeout(watchdog); watchdog = null; } };

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
            clearWatchdog();

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

            // Replay textures emitted during pre-boot scene hydration (share
            // URLs, OAuth scene stash). Without this an env HDR / color texture
            // loaded before boot never reaches the worker (the TEXTURE event was
            // dropped, and image params aren't carried in the BOOT config).
            if (proxy.pendingTextures.size) {
                proxy.pendingTextures.forEach((dataUrl, textureType) => {
                    proxy.updateTexture(textureType, dataUrl);
                });
                proxy.pendingTextures.clear();
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

        // Arm the watchdog only if boot didn't already complete synchronously.
        if (!finished) {
            watchdog = setTimeout(() => {
                if (finished) return;
                FractalEvents.emit(FRACTAL_EVENTS.WORKER_BOOT_FAILED, {
                    reason:
                        `Renderer timed out — no frame after ${Math.round(BOOT_WATCHDOG_MS / 1000)}s.\n` +
                        `The shader likely failed to compile or run on this GPU.`,
                });
            }, BOOT_WATCHDOG_MS);
        }

        return () => { clearWatchdog(); unsubs.forEach((u) => u()); };
    }, []);

    // Handle resize (reacts to viewport size AND DPR changes).
    useEffect(() => {
        proxy.resizeWorker(size.width, size.height, dpr);
        // Wake the convergence-stop: a resize reallocates (blank) render targets, but
        // a converged + idle-stopped loop holds a STALE accumulationCount (still at the
        // cap, since no FRAME_READY has reported the resize's reset) so `converged` reads
        // true and it would never render the new targets → a grey/blank frame. Bumping
        // the invalidation timestamp forces a dispatch; the worker then reports the reset
        // count → `!converged` → it re-converges and re-idles on its own.
        lastInvalidateRef.current = performance.now();
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
            FractalEvents.on(FRACTAL_EVENTS.UNIFORM, ({ key, value, noAccumReset }) => {
                if (proxy.isBooted) proxy.setUniform(key, value, noAccumReset);
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
                // Live (post-boot) path. Pre-boot texture emits are caught by an
                // early listener installed in app-gmt/main.tsx (before loadScene
                // runs) and stashed on proxy.pendingTextures — this component
                // mounts too late to catch the boot-time emit. finalize() drains
                // the stash once the worker is ready.
                if (proxy.isBooted) proxy.updateTexture(textureType, dataUrl);
            }),
            FractalEvents.on(FRACTAL_EVENTS.REGISTER_FORMULA, ({ id, shader }: any) => {
                proxy.registerFormula(id, shader);
            }),
        ];

        return () => { unsubs.forEach((u) => u()); };
    }, []);

    // Convergence-stop wake: anything that can change the rendered output bumps the
    // invalidation timestamp so a settled loop resumes — display-only re-grades
    // (bloom/saturation/droste) included, since they don't reset accumulation and so
    // wouldn't otherwise re-arm the loop. (Camera moves + interaction are picked up
    // directly by the gate; these are the discrete worker-bound changes.)
    useEffect(() => {
        // Each wake bumps the invalidation timestamp (re-arms the 500ms window) AND
        // drops the proxy's converged-mirror to 0. The mirror-drop is the robust half:
        // a reset that races past the 500ms window (e.g. a compile longer than 500ms)
        // would otherwise leave `accumulationCount` pinned at the old cap → the gate
        // reads `converged` → stops ticking → the worker never renders a fresh frame →
        // stuck on the first frame until a camera move. Zeroing the mirror keeps the
        // gate ticking until a genuine fresh FRAME_READY re-confirms convergence.
        // IS_COMPILING is included so compile-completion re-arms the loop for the new
        // shader (the dominant "stuck after formula load" case).
        const wake = () => {
            lastInvalidateRef.current = performance.now();
            proxy.invalidateConvergedMirror();
        };
        const unsubs = [
            FRACTAL_EVENTS.UNIFORM, FRACTAL_EVENTS.CONFIG, FRACTAL_EVENTS.CONFIG_DONE,
            FRACTAL_EVENTS.RESET_ACCUM, FRACTAL_EVENTS.OFFSET_SET, FRACTAL_EVENTS.OFFSET_SHIFT,
            FRACTAL_EVENTS.CAMERA_SNAP, FRACTAL_EVENTS.CAMERA_TELEPORT, FRACTAL_EVENTS.TEXTURE,
            FRACTAL_EVENTS.REGISTER_FORMULA, FRACTAL_EVENTS.IS_COMPILING,
        ].map((e) => FractalEvents.on(e, wake));
        return () => unsubs.forEach((u) => u());
    }, []);

    // Performance throttle: when FPS < 20, yield 1 frame/sec to let React
    // render UI (keeps the app responsive during heavy compile/bucket-render).
    const throttleRef = React.useRef({ lastYield: 0, fps: 60, renderFps: 0, frames: 0, lastSample: 0, lastFrameCount: 0 });

    useFrame((_state, delta) => {
        if (!isReady) return;

        // ADR-0061 — drive the InteractionSession watchdog on the frame cadence.
        // Constant-time check; force-clears a stranded begin (a producer that
        // missed its end) past MAX_SESSION_MS so a missed end can't leave the
        // session active forever (the never-converges regression class). A live
        // drag refreshes via throttled pointermove pokes; last line of defence.
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
            const dt = now - t.lastSample;
            // UI fps — how often the main-thread RAF loop runs (≈60 when unblocked).
            // Feeds the adaptive loop and the advanced-mode "UI" readout.
            t.fps = t.frames * 1000 / dt;
            t.frames = 0;
            t.lastSample = now;
            viewport.reportFps(t.fps);

            // Render fps — the worker's TRUE delivered-frame rate, from its
            // FRAME_READY-mirrored frame counter. Decoupled from UI fps: with the
            // frames-in-flight gate the main thread runs at 60 while the worker may
            // render far slower, so this is the honest "how fast is the fractal
            // updating" number the topbar shows by default.
            const fc = proxy.frameCount;
            // A negative delta means the worker restarted (GPU crash / recompile) and
            // its frameCount reset to 0 — report 0 this window and re-baseline, rather
            // than emitting a large negative rate that lingers until the count climbs
            // back past the old high-water mark.
            const dframes = fc - t.lastFrameCount;
            t.lastFrameCount = fc;
            t.renderFps = dframes >= 0 ? dframes * 1000 / dt : 0;
            viewport.reportRenderFps(t.renderFps);

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

        const animState = useAnimationStore.getState();

        // ADR-0061 worker bridge — derive the InteractionSession booleans and
        // send them in renderState. These are the SOLE interaction signals the
        // worker consumers read (the legacy cameraInUse / isGizmoInteracting /
        // mouseOverCanvas derivations are gone). The pure
        // buildRenderInteractionState() pins the key names to EngineRenderState
        // so a producer/consumer typo can't silently read false
        // (debug/test-interaction-wiring.mts guards the round-trip).
        const interactionBlock = buildRenderInteractionState({
            sessionInteracting: storeState.isInteracting(),
            // Filtered subset for the accumulation HOLD consumer: camera / gizmo /
            // scrub gestures only — the set where freezing the frame is correct.
            // Sliders/picker/drawing are excluded (they must re-render fresh),
            // which is the camera+playback+scrub+gizmo hold set the old
            // `cameraInUse || isGizmoInteracting` proxy produced, without the
            // buffered-useFrame lag. Playback/scrub also engage the hold via
            // isSceneAnimating (derived below) — so removing the legacy
            // cameraInUse (which ORed isPlaying/isScrubbing) loses nothing.
            sessionHoldActive: storeState.isInteracting({ only: [INTERACTION_SOURCES.camera, INTERACTION_SOURCES.gizmo, INTERACTION_SOURCES.scrub] }),
            isPlaying: animState.isPlaying,
            // Active LFO ≈ master switch on AND at least one ENABLED animation.
            // This is the autonomous-animation axis (NOT a gesture) adaptive + hold
            // compose with `interacting`.
            //
            // MUST mirror ModulationEngine.updateOscillators' per-anim gate
            // (`if (!anim.enabled) continue`): a `.length > 0` test counts
            // DISABLED entries too, so a scene saved with inert/leftover animation
            // entries (all enabled:false) produces zero actual modulation yet pins
            // isSceneAnimating true forever → adaptive stuck at low res, accumulation
            // never converges (the "stuck after loading some gallery items" bug).
            hasActiveModulation: !!storeState.lfosEnabled && !!storeState.animations?.some((a: { enabled?: boolean }) => a.enabled),
        });

        const renderState = {
            cameraMode: storeState.cameraMode,
            optics:   storeState.optics   ?? null,
            lighting: storeState.lighting ?? null,
            quality:  storeState.quality  ?? null,
            geometry: storeState.geometry ?? null,
            adaptiveSuppressed: !!storeState.adaptiveSuppressed,
            // M5b band loop wants the ACTUAL render rate, not the main-thread RAF
            // rate. Post-gate the main loop runs at 60 while the worker may render
            // far slower, so feeding t.fps would make the band loop think there's
            // headroom and shed bands when it should be adding them. renderFps is
            // the worker's true delivered-frame rate. (The worker's adaptive
            // RESOLUTION self-measures via its own call frequency — only this
            // relayed-value consumer needed repointing.)
            fps: t.renderFps,
            ...interactionBlock, // interacting + isSceneAnimating + sessionHoldActive (ADR-0061)
        };

        // ── Convergence-stop gate ────────────────────────────────────────────
        // Skip the dispatch once the path-traced image is fully converged and nothing is
        // requesting a new frame. Otherwise the worker re-blits the full-screen
        // post-process (+ flush + a cross-thread round trip) every frame for zero visual
        // change — battery/thermal drain on a settled image.
        //
        // "Converged" = accumulation reached the sample cap (the worker has stopped
        // tracing). Keying on the ABSOLUTE cap — not a "stable for N ms" window — is the
        // load-bearing detail: during tiling `accumulationCount` is the per-PASS index,
        // constant for N band-ticks within a pass, so a time/Δ window would expire
        // mid-convergence and freeze a noisy frame. cap=0 (infinite samples) never
        // converges → never idles here. Every wake reason below is main-thread, so the
        // loop can never deadlock on a frame it stopped requesting; a reset drops the
        // count below the cap → `!converged` → it resumes on its own.
        const cv = convergeRef.current;
        const cap = (storeState.sampleCap as number) ?? 0;
        const converged = cap > 0 && proxy.accumulationCount >= cap;
        const lc = cv.lastCam;
        const camMoved = !lc
            || Math.abs(serializedCamera.position[0] - lc.position[0]) > 1e-6
            || Math.abs(serializedCamera.position[1] - lc.position[1]) > 1e-6
            || Math.abs(serializedCamera.position[2] - lc.position[2]) > 1e-6
            || Math.abs(serializedCamera.quaternion[0] - lc.quaternion[0]) > 1e-7
            || Math.abs(serializedCamera.quaternion[1] - lc.quaternion[1]) > 1e-7
            || Math.abs(serializedCamera.quaternion[2] - lc.quaternion[2]) > 1e-7
            || Math.abs(serializedCamera.quaternion[3] - lc.quaternion[3]) > 1e-7
            || serializedCamera.fov !== lc.fov;
        const busy = !!storeState.isBucketRendering || !!storeState.isExporting || !!storeState.adaptiveSuppressed;
        // Keep the loop alive for 500ms after any camera activity. `converged` reads
        // proxy.accumulationCount — a FRAME_READY mirror the worker stops updating
        // while the frames-in-flight gate skips frames. On a quick move-and-stop the
        // mirror can still read "converged" (stale at the old cap) after the camera
        // settles, so without this grace the loop would stop dispatching BEFORE the
        // worker renders the post-move accumulation reset → frozen on the first
        // accumulation frame. Once a fresh FRAME_READY drops the count, `!converged`
        // keeps it alive on its own. (cap=0 never converges, so this is a no-op there.)
        if (camMoved || interactionBlock.interacting) lastInvalidateRef.current = now;
        const wantsRender = !converged || camMoved || busy
            || interactionBlock.interacting || interactionBlock.isSceneAnimating
            || (now - lastInvalidateRef.current) < 500;
        if (wantsRender) {
            proxy.sendRenderTick(serializedCamera, serializedOffset, clampedDelta, renderState);
            cv.lastCam = serializedCamera;
        }
    }, 1);

    return null;
};
