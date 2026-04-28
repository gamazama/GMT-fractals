/**
 * Navigation — camera + input integration. Two modes (Orbit, Fly) drive
 * camera.position / camera.quaternion every frame and push the resulting
 * world pose into the engine via `RENDER_TICK`.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Why this file is large                                              │
 * │                                                                     │
 * │ Orbit and Fly aren't independent components — they share the same   │
 * │ camera, the same VirtualSpace offset, the same gesture pivot, and   │
 * │ the same per-frame integrator. They differ in which inputs drive    │
 * │ the camera (drei's OrbitControls vs. WASD + mouse-look) and which   │
 * │ events are subscribed. The shared state is dense (~20 refs); a      │
 * │ per-mode split would mean either passing a 30-field deps bundle to  │
 * │ every extracted piece or rebuilding what closures provide for free. │
 * │                                                                     │
 * │ The complexity is intrinsic, not accidental. This comment block is  │
 * │ here to make the layout easy to follow without flattening it.       │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ## Coordinate system
 *
 * "Unified" world position = `sceneOffset + camera.position`. The shader
 * always raymarches from the unified position; in steady state the
 * camera sits at origin and `sceneOffset` carries the world coordinate.
 * During gestures `camera.position` accumulates motion locally; on
 * gesture end (or each render tick at the threshold) the local motion
 * gets ABSORBED into `sceneOffset` and `camera.position` resets — this
 * keeps f32 mantissa headroom at deep zoom.
 *
 * `absorbOrbitPosition` is the canonical absorb call. Each absorb bumps
 * `absorbGenRef` so that async pick callbacks issued before the absorb
 * can drop themselves on resolution (see "absorb-gen race guard"
 * comment near absorbGenRef).
 *
 * ## Cursor-anchored gestures
 *
 * Orbit / wheel / middle-drag pivot around the cursor world position
 * when `navigation.orbitCursorAnchor` is on (default). The pivot lives
 * in two refs:
 *   - `hoverPivotWorldRef`: cached WORLD-space hover hit. Stable across
 *     gestures because sceneOffset shifts between gestures (treadmill
 *     absorb on orbit-end, mode-switch teleport, …).
 *   - `gestureActivePivotRef`: LOCAL-space snapshot captured at gesture
 *     start. Held for the gesture so cursor drift mid-gesture doesn't
 *     shift the pivot. sceneOffset is stable for one gesture's lifetime.
 *
 * `snapshotHoverPivotLocal()` does the world→local conversion using the
 * CURRENT sceneOffset at gesture start.
 *
 * ## Effect roster (in source order)
 *
 *   1. mount init       — copy cameraRot from store; init orbit pivot if Orbit.
 *   2. teleport listener — applies external camera state changes (URL, undo,
 *                          preset). Resyncs orbit target + accumulation reset.
 *   3. hover pre-pick   — Orbit only. Fires depth picks under the cursor at
 *                          worker-throttled rate, caches `hoverPivotWorldRef`.
 *   4. wheel zoom       — cursor-anchored dolly. Pivots around the cached
 *                          hover pivot; debounced absorb on idle.
 *   5. custom orbit drag — left-drag ROTATE around hover pivot. Replaces
 *                          drei's native rotate when orbitCursorAnchor is on.
 *   6. middle-drag dolly — cursor-anchored zoom on middle-button drag.
 *   7. pivot reticle    — DOM marker projected from `hoverPivotWorldRef`,
 *                          updated each frame.
 *   8. camera-lock      — listens for engine-set lock state; locks input.
 *   9. mode-switch       — sets up smooth lerp to new mode's pose.
 *  10. fit on mount      — `useLayoutEffect`: position camera so the fractal
 *                          fits the viewport at boot or formula switch.
 *  11. useFrame          — the per-frame integrator. Does, in order:
 *                          input-controller read → physics step → camera
 *                          pose update → sceneOffset absorb → engine
 *                          state push → reticle projection.
 *
 * ## useFrame shape
 *
 * Two top-level branches: `mode === 'Fly'` runs the WASD physics
 * integrator; `mode === 'Orbit'` reads drei's OrbitControls + the
 * custom-orbit handlers and integrates the pivot rotation. Both paths
 * end in the same shared tail: detect movement, drive `lastInteraction`
 * timer, project pivot reticle, push camera pose.
 *
 * ## Mounting
 *
 * The custom OrbitControls block (the JSX `return` near the end) only
 * mounts when `mode === 'Orbit' && isOrbitReady && !isCameraLocked`.
 * Outside Orbit mode the component returns null — Fly mode has no
 * mounted children, only refs + useFrame.
 *
 * ## Where to look first
 *
 *   - new mode? Add to CameraMode enum, then a branch in useFrame +
 *     each mode-gated useEffect.
 *   - new gesture? Add a useEffect grouping its DOM listeners; mind
 *     the absorbGenRef race guard if it issues async picks.
 *   - precision math? VirtualSpace + the absorb logic. Read
 *     `absorbOrbitPosition` and the absorb-gen comment first.
 */

import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
// OrbitControlsImpl type comes from drei's transitive dep on three-stdlib.
// drei re-exports this as the ref type of its <OrbitControls> component.
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();
import { FractalEvents } from '../engine/FractalEvents';
import { CameraState, CameraMode, PreciseVector3 } from '../types';
import { useInputController } from './useInputController';
import { usePhysicsProbe } from './usePhysicsProbe';
import { useAnimationStore } from '../../store/animationStore';
import { captureCameraKeyFrame } from '../../engine/animation/cameraKeyRegistry';
import { useEngineStore as useFractalStore, selectMovementLock } from '../../store/engineStore';
import { CameraController } from '../engine/controllers/CameraController';
import { VirtualSpace } from '../engine/PrecisionMath';

interface NavigationProps {
  mode: CameraMode;
  onStart?: (s: CameraState) => void;
  onEnd?: () => void;
  hudRefs: {
      container: React.RefObject<HTMLDivElement | null>;
      speed: React.RefObject<HTMLSpanElement | null>;
      dist: React.RefObject<HTMLSpanElement | null>;
      reset: React.RefObject<HTMLButtonElement | null>;
      reticle: React.RefObject<HTMLDivElement | null>;
  };
  setSceneOffset: (v: any) => void;
  fitScale?: number; 
}

/** Compute orbit target at `camera.position + forward * distance`. */
const calcOrbitTarget = (camera: THREE.Camera, dist: number, out?: THREE.Vector3): THREE.Vector3 => {
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const target = out || new THREE.Vector3();
    return target.copy(camera.position).addScaledVector(fwd, dist);
};

const Navigation: React.FC<NavigationProps> = ({
  mode, 
  onStart, onEnd, hudRefs,
  setSceneOffset,
  fitScale = 1.0
}) => {
  const { camera, gl } = useThree();
  const orbitRef = useRef<OrbitControlsImpl>(null);
  
  const disableMovement = useFractalStore(selectMovementLock);
  const optics = useFractalStore(s => s.optics);
  const isOrtho = optics && Math.abs(optics.camType - 1.0) < 0.1;
  const navSettings = useFractalStore(s => s.navigation);
  const setNavigation = useFractalStore(s => s.setNavigation);
  const setIsCameraInteracting = useAnimationStore(s => s.setIsCameraInteracting);
  
  const [isOrbitReady, setIsOrbitReady] = useState(mode === 'Orbit');
  const orbitTargetZero = useRef(new THREE.Vector3(0, 0, 0));

  // -- Physics Controllers --
  const flyController = useRef(new CameraController());

  // Unified coordinate system: shadow state always holds canonical world position
  const orbitRadiusRef = useRef(3.5);
  const unifiedOffsetRef = useRef<PreciseVector3>({ x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 });

  // Cursor-anchored orbit/zoom pivot.
  //
  // hoverPivotWorldRef: WORLD-space coordinates (sceneOffset INCLUDED).
  //   Lives across gestures — sceneOffset can shift between gestures
  //   (treadmill absorb on orbit-end, mode-switch teleport, etc.) so a
  //   local-space cache would go stale. World coords are stable; we
  //   re-localize at each gesture-start using the current sceneOffset.
  //   null = pick miss → caller falls back to camera-forward pivot.
  // gestureActivePivotRef: LOCAL-space snapshot captured at gesture
  //   start (orbit pointerdown / wheel burst). Held for the duration so
  //   cursor drift mid-gesture doesn't shift the pivot. sceneOffset is
  //   stable for the duration of one gesture (absorb only fires on up).
  const hoverPivotWorldRef = useRef<THREE.Vector3 | null>(null);
  const gestureActivePivotRef = useRef<THREE.Vector3 | null>(null);
  const lastHoverPickPxRef = useRef<{ x: number; y: number } | null>(null);
  // In-flight gate — only one hover pick at a time. When the worker
  // is the bottleneck (busy rendering), this throttles us naturally
  // to whatever rate the worker can resolve. When the worker is
  // idle, picks fire at near-mousemove rate. Beats a fixed time
  // throttle that's always either too slow or too eager.
  const hoverPickInFlightRef = useRef(false);

  // Async-pick race guard: every absorbOrbitPosition shifts sceneOffset.
  // Picks issued before that absorb were computed against the OLD
  // sceneOffset; if their async resolution lands AFTER the absorb,
  // they'd write a hoverPivotWorld with stale coords → reticle and
  // next-gesture pivot are off by camPos. Each absorb bumps this gen;
  // pick callbacks drop themselves if their gen-at-issue ≠ current.
  // Symptom this fixes: "quicker the interaction → more likely glitch."
  const absorbGenRef = useRef(0);

  // DOM reticle that visualises the orbit/zoom pivot — shown whenever
  // a pick has captured a fractal surface (hover or gesture). Updated
  // per-frame in useFrame; doubles as a debug aid for confirming that
  // sceneOffset → local conversion stays correct across absorbs.
  const pivotMarkerRef = useRef<HTMLDivElement | null>(null);
  // Pre-allocated scratch for the per-frame projection — avoid GC.
  const pivotProjVec = useRef(new THREE.Vector3());
  const pivotLocalVec = useRef(new THREE.Vector3());

  // Convert the cached world-space hover pivot to a local-space pivot
  // using the engine's CURRENT sceneOffset. Used by all gesture-start
  // handlers (orbit pointerdown, wheel burst-start, middle-drag down).
  const snapshotHoverPivotLocal = (): THREE.Vector3 | null => {
      if (!hoverPivotWorldRef.current) return null;
      const so = engine.sceneOffset;
      const w = hoverPivotWorldRef.current;
      return new THREE.Vector3(
          w.x - (so.x + (so.xL ?? 0)),
          w.y - (so.y + (so.yL ?? 0)),
          w.z - (so.z + (so.zL ?? 0)),
      );
  };
  
  const lastPos = useRef(new THREE.Vector3());
  const lastRot = useRef(new THREE.Quaternion());
  const currentFrameVelocity = useRef(new THREE.Vector3());
  const currentRotVelocity = useRef(new THREE.Vector3());
  const rollVelocity = useRef(0); // Need to lift this out of input controller or sync it

  // --- Smooth camera transition state ---
  const transitionRef = useRef<{
      active: boolean;
      startPos: THREE.Vector3;
      startRot: THREE.Quaternion;
      endState: CameraState;
      endPos: THREE.Vector3;
      endRot: THREE.Quaternion;
      elapsed: number;
      duration: number;
  } | null>(null);

  // Input & Physics Hooks
  const { moveState, isDraggingRef, dragStart, mousePos, speedRef, joystickMove, joystickLook, invertY, rollVelocity: inputRollVel, isInteracting } = useInputController(
      mode, 
      navSettings?.flySpeed ?? 0.5, 
      (v) => setNavigation({ flySpeed: v }),
      hudRefs
  );
  
  const { distAverageRef } = usePhysicsProbe(hudRefs, speedRef);

  // Helper: absorb any non-zero camera.position into sceneOffset.
  // silent=true: queues atomic offset sync via RENDER_TICK (no accum reset) — for orbit onEnd.
  // silent=false: uses setSceneOffset (full sync + accum reset) — for mode switches.
  // keepTarget=true: shift OrbitControls.target by -camera.position so it
  //   stays at the same WORLD position. Used by per-frame pan absorb,
  //   which needs target preserved to keep drei's pan sensitivity stable.
  //   Default behaviour (false) resets target to fwd × 0.0001 — appropriate
  //   for orbit/zoom where target is a throwaway lookAt sentinel.
  const absorbOrbitPosition = (silent = false, keepTarget = false) => {
      if (camera.position.lengthSq() < 1e-8) return;
      // Bump the async-pick generation BEFORE we shift sceneOffset.
      // Any pick callback that was in flight at this point will see a
      // stale gen and drop itself, preventing it from writing
      // hoverPivotWorldRef with coords computed against the OLD
      // sceneOffset (which would jump the reticle / next-gesture pivot
      // by exactly the absorb delta).
      absorbGenRef.current++;
      // Note: hoverPivotWorldRef is intentionally NOT cleared here.
      // World coordinates are stable across absorbs — only the
      // sceneOffset / camera-local split changes. Clearing would
      // force a "fly to centre" on the next wheel burst when the
      // cursor hasn't moved (the pre-pick wouldn't refire because of
      // the 10 px movement gate, leaving snapshotHoverPivotLocal
      // empty → fallback to forward → zoom around screen centre).
      // absorbGenRef above already drops in-flight picks so they
      // can't write a stale world point.
      const so = engine.sceneOffset;
      const absorbed = {
          x: so.x, y: so.y, z: so.z,
          xL: (so.xL ?? 0) + camera.position.x,
          yL: (so.yL ?? 0) + camera.position.y,
          zL: (so.zL ?? 0) + camera.position.z
      };
      orbitRadiusRef.current = camera.position.length() || orbitRadiusRef.current;
      const camDelta = keepTarget && orbitRef.current
          ? new THREE.Vector3().copy(camera.position)
          : null;
      camera.position.set(0, 0, 0);
      camera.updateMatrixWorld();

      if (orbitRef.current) {
          if (camDelta) {
              // Pan-style absorb: keep target's world position by
              // shifting it into the new local frame.
              orbitRef.current.target.sub(camDelta);
              orbitTargetZero.current.copy(orbitRef.current.target);
          } else {
              // Orbit/zoom: reset target so update() lookAt is a no-op.
              const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
              orbitRef.current.target.copy(fwd.multiplyScalar(0.0001));
              orbitTargetZero.current.copy(orbitRef.current.target);
          }
      }

      if (silent) {
          // Queue offset to be sent atomically with the next RENDER_TICK.
          // This avoids the 1-frame mismatch where camera=(0,0,0) reaches the
          // worker before the new offset, causing a visible shift.
          engine.queueOffsetSync(absorbed);
      } else {
          setSceneOffset(absorbed);
      }
      lastPos.current.set(0, 0, 0);
  };

  // Cancel the wheel-burst-end debounce when a new gesture starts.
  // The timer is purely a state-cleanup heuristic (no offset mutation
  // — wheel events absorb per-event), so calling it "flush" is a
  // misnomer; we just want fresh state for the new gesture rather
  // than waiting for the 100 ms tail.
  const cancelScrollEndTimer = () => {
      if (scrollEndTimeout.current) {
          clearTimeout(scrollEndTimeout.current);
          scrollEndTimeout.current = null;
      }
      isScrollingRef.current = false;
      gestureActivePivotRef.current = null;
  };

  // Set up orbit pivot from current camera state (used on init and mode switch to orbit)
  const initOrbitPivot = (overrideDistance?: number) => {
      camera.updateMatrixWorld();
      camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion));
      let dist = overrideDistance || engine.lastMeasuredDistance;
      if (dist <= 1e-7 || dist >= 1000.0) dist = useFractalStore.getState().targetDistance || 3.5;
      orbitRadiusRef.current = dist;
      calcOrbitTarget(camera, dist, orbitTargetZero.current);
      setIsOrbitReady(true);
  };

  // INITIAL SYNC: Fixes Race Condition on First Load
  useEffect(() => {
      const state = useFractalStore.getState();

      // Camera always starts at origin — world position is in sceneOffset
      camera.position.set(0, 0, 0);
      camera.quaternion.set(state.cameraRot.x, state.cameraRot.y, state.cameraRot.z, state.cameraRot.w);
      camera.updateMatrixWorld();

      lastPos.current.copy(camera.position);
      lastRot.current.copy(camera.quaternion);

      // Initialize physics guess and orbit radius
      if (state.targetDistance) {
          distAverageRef.current = state.targetDistance;
          orbitRadiusRef.current = state.targetDistance;
      }

      if (mode === 'Orbit') {
          // Set up orbit pivot — camera stays at origin, target placed ahead at surface distance.
          // No offset manipulation needed: OrbitControls will move camera.position during drag,
          // and the shader sees unified position = sceneOffset + camera.position correctly.
          initOrbitPivot(state.targetDistance);
      }
  }, []);

  // PASSIVE LISTENER: Navigation now listens for external teleports (URLs, Undos, Presets)
  useEffect(() => {
      const onTeleport = (newState: CameraState) => {
          // 1. Force R3F Camera to the teleport destination
          camera.position.set(newState.position.x, newState.position.y, newState.position.z);
          camera.quaternion.set(newState.rotation.x, newState.rotation.y, newState.rotation.z, newState.rotation.w);
          camera.updateMatrixWorld();

          // 2. Clear velocities
          currentFrameVelocity.current.set(0,0,0);
          currentRotVelocity.current.set(0,0,0);
          flyController.current.reset();

          // 3. Update trackers so useFrame doesn't trigger a "move" event
          lastPos.current.copy(camera.position);
          lastRot.current.copy(camera.quaternion);

          // 4. RESET PHYSICS ESTIMATE (CRITICAL FIX)
          // Prevents "stuck" Fly Mode where speed remains near 0 if previous scene was close-up
          if (newState.targetDistance && newState.targetDistance > 0.001) {
               distAverageRef.current = newState.targetDistance;
               orbitRadiusRef.current = newState.targetDistance;
               engine.lastMeasuredDistance = newState.targetDistance;
          }

          // 5. Update store + forward offset to worker
          if (newState.sceneOffset) {
              setSceneOffset(newState.sceneOffset);
              engine.shouldSnapCamera = true;
              engine.dirty = true;
          }

          // 6. Sync orbit pivot for next interaction
          if (mode === 'Orbit') {
               const d = newState.targetDistance || distAverageRef.current || 3.5;
               orbitRadiusRef.current = d;
               // Update camera.up to preserve roll (Q/E rotation) through OrbitControls' lookAt.
               // Without this, lookAt uses the stale up vector and strips roll.
               camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion));
               // Update orbit target so it's correct if OrbitControls reads it before next onStart
               calcOrbitTarget(camera, d, orbitTargetZero.current);
               if (orbitRef.current) {
                   orbitRef.current.target.copy(orbitTargetZero.current);
                   orbitRef.current.update();
               }
          }
      };
      
      // Smooth camera transition (lerp/slerp over duration)
      const onTransition = (targetState: CameraState) => {
          if (!targetState.sceneOffset) {
              // No offset info — fall back to instant teleport
              onTeleport(targetState);
              return;
          }
          // Compute unified start/end positions for interpolation
          const so = engine.sceneOffset;
          const startUnified = new THREE.Vector3(
              so.x + (so.xL ?? 0) + camera.position.x,
              so.y + (so.yL ?? 0) + camera.position.y,
              so.z + (so.zL ?? 0) + camera.position.z
          );
          const tOff = targetState.sceneOffset;
          const endUnified = new THREE.Vector3(
              tOff.x + (tOff.xL ?? 0) + targetState.position.x,
              tOff.y + (tOff.yL ?? 0) + targetState.position.y,
              tOff.z + (tOff.zL ?? 0) + targetState.position.z
          );

          // If distance is negligible, just teleport
          if (startUnified.distanceTo(endUnified) < 1e-6) {
              onTeleport(targetState);
              return;
          }

          transitionRef.current = {
              active: true,
              startPos: startUnified,
              startRot: camera.quaternion.clone(),
              endState: targetState,
              endPos: endUnified,
              endRot: new THREE.Quaternion(
                  targetState.rotation.x, targetState.rotation.y,
                  targetState.rotation.z, targetState.rotation.w
              ),
              elapsed: 0,
              duration: 0.5
          };
      };

      const unsub1 = FractalEvents.on('camera_teleport', onTeleport);
      const unsub3 = FractalEvents.on('camera_transition', onTransition);
      return () => { unsub1(); unsub3(); };
  }, [mode, camera]);

  const isPlaying = useAnimationStore(s => s.isPlaying);
  const isScrubbing = useAnimationStore(s => s.isScrubbing);
  const isRecording = useAnimationStore(s => s.isRecording);
  const recordCamera = useAnimationStore(s => s.recordCamera);
  const currentFrame = useAnimationStore(s => s.currentFrame);
  const sequence = useAnimationStore(s => s.sequence);
  // Camera-keyframe captures funnel through the cameraKeyRegistry's
  // single entry point — host (engine-gmt) registered captureGmtCameraKeyFrame
  // resolves it to a sceneOffset + Euler-rotation snapshot. Replaces the
  // legacy captureCameraFrame on useAnimationStore which had a stub
  // CameraUtils.getUnifiedFromEngine in engine-core (returned 0,0,0).
  
  const isMovingRef = useRef(false);
  const stopTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMode = useRef(mode);
  const isOrbitDragging = useRef(false);
  // Custom-orbit gesture (left-drag using our cursor-anchored math).
  // Distinct from `isOrbitDragging` which now signals OrbitControls'
  // pan (right-drag) onStart/onEnd. We need both:
  //   - `isCustomOrbitRef` → disable drei's auto-update so its
  //     per-frame lookAt(target) doesn't fight our rotation math.
  //   - `isOrbitDragging`  → pan is owned by drei; keep its update()
  //     running so PAN works.
  const isCustomOrbitRef = useRef(false);
  // Frozen azimuth axis for the duration of a custom-orbit gesture.
  // Captured at pointerdown from camera.up so Q/E roll between
  // gestures is honoured but azimuth doesn't drift within a gesture.
  const gestureUpRef = useRef(new THREE.Vector3());
  const isScrollingRef = useRef(false);
  const scrollEndTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPlayingRef = useRef(isPlaying);
  const wasScrubbingRef = useRef(isScrubbing);
  const currentZoomSensitivity = useRef(1.0);
  const isCameraLockedRef = useRef(false);
  const allowOrbitInteraction = useRef(false);

  // ── Cursor-anchored orbit/zoom: hover pre-pick ──────────────────────
  // Pick the world-space point under the cursor on pointermove so a
  // recent pivot is cached when the user clicks. Picks are async
  // (worker readPixels); pre-picking avoids the round-trip wait at
  // gesture start.
  //
  // Rate self-throttles via an in-flight gate: only one pick at a
  // time. When the worker is busy, picks queue up to one ahead;
  // when idle, picks fire at near-mousemove rate. No fixed time cap.
  // A 10 px movement gate skips picks while the cursor is parked.
  //
  // Result is cached in WORLD space so it stays valid across gestures
  // even when sceneOffset shifts (treadmill absorb, mode switch, etc.).
  // Localization happens at gesture-start via snapshotHoverPivotLocal.
  useEffect(() => {
      if (mode !== 'Orbit') return;
      const el = gl.domElement;
      const onMove = (e: PointerEvent) => {
          const settings = useFractalStore.getState().navigation;
          if (!settings?.orbitCursorAnchor) return;
          if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;
          // Skip during ANY camera gesture — pan (isOrbitDragging),
          // wheel/middle (isScrollingRef), AND custom left-drag
          // (isCustomOrbitRef). The last one was missing: during a
          // custom orbit drag, the cached gesture pivot is what
          // matters; firing fresh picks here would just stall the
          // worker for nothing (and risk a stale absorbGenRef miss).
          if (isOrbitDragging.current || isScrollingRef.current || isCustomOrbitRef.current) return;
          if (hoverPickInFlightRef.current) return;
          const last = lastHoverPickPxRef.current;
          if (last) {
              const dx = e.clientX - last.x;
              const dy = e.clientY - last.y;
              if (dx * dx + dy * dy < 100) return; // < 10 px movement
          }
          lastHoverPickPxRef.current = { x: e.clientX, y: e.clientY };
          const rect = el.getBoundingClientRect();
          const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          const myGen = absorbGenRef.current;
          hoverPickInFlightRef.current = true;
          const promise = engine.pickWorldPosition(ndcX, ndcY, true, true);
          Promise.resolve(promise).then((world) => {
              hoverPickInFlightRef.current = false;
              // Drop if an absorb shifted sceneOffset since this pick
              // was issued — the world coords baked into `world` are
              // computed from the worker's pre-absorb virtualSpace, so
              // localizing them later would be off by the absorb delta.
              if (myGen !== absorbGenRef.current) return;
              hoverPivotWorldRef.current = world ?? null;
          });
      };
      el.addEventListener('pointermove', onMove);
      return () => el.removeEventListener('pointermove', onMove);
  }, [mode, gl]);

  // Custom wheel handler — cursor-anchored zoom is a TRANSLATION along
  // the cursor ray (camera moves toward/away from the picked point with
  // rotation unchanged). OrbitControls.DOLLY isn't suitable: it scales
  // the camera-target vector AND calls lookAt(target), which when target
  // is the off-axis cursor pivot causes a visible lateral re-orientation.
  //
  // Math: new_pos = pivot + (camera - pivot) * f, where f > 1 zooms out.
  // The cursor's world point stays at the same ray from the camera, so
  // (modulo perspective foreshortening) the cursor pixel stays put.
  //
  // Active only when the cursor-anchor toggle is on; toggle off bails at
  // the top so drei's native DOLLY runs untouched. On pick miss within
  // anchored mode, falls back to camera-forward pivot.
  useEffect(() => {
      if (mode !== 'Orbit') return;
      const el = gl.domElement;
      const wOffset = new THREE.Vector3();
      const wFwd    = new THREE.Vector3();
      const onWheel = (e: WheelEvent) => {
          if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;
          // Toggle off → drei owns DOLLY natively, get out of the way.
          if (!useFractalStore.getState().navigation?.orbitCursorAnchor) return;
          if (selectMovementLock(useFractalStore.getState())) return;
          if (isCameraLockedRef.current) return;
          e.preventDefault();

          // Burst-start: snapshot pivot, mark scrolling, suppress drei.
          // "First event in burst" = no active gesture pivot.
          if (!gestureActivePivotRef.current) {
              const local = snapshotHoverPivotLocal();
              if (local) {
                  gestureActivePivotRef.current = local;
              } else {
                  // Pick miss → fallback to camera-forward at orbit radius.
                  wFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
                  const dist = Math.max(0.01, orbitRadiusRef.current);
                  gestureActivePivotRef.current = new THREE.Vector3().copy(camera.position).addScaledVector(wFwd, dist);
              }
              isScrollingRef.current = true;
              if (orbitRef.current) orbitRef.current.enabled = false;
          }
          const pivot = gestureActivePivotRef.current!;

          // Pure translation along cursor→pivot ray.
          const dollySpeed = currentZoomSensitivity.current || 1.0;
          const f = Math.exp(e.deltaY * 0.0015 * dollySpeed);
          wOffset.subVectors(camera.position, pivot).multiplyScalar(f);
          camera.position.copy(pivot).add(wOffset);
          orbitRadiusRef.current = camera.position.distanceTo(pivot);

          // Absorb-per-event: bake camera.position into sceneOffset
          // immediately so we never sit between events with non-zero
          // camera.position. The local pivot needs to follow into the
          // NEW local frame (shift by -camera.position before reset).
          // This eliminates the destructive role of the burst-end
          // timer — it now only cleans up state, no offset mutation,
          // so a late-firing timer is harmless even mid-next-gesture.
          if (camera.position.lengthSq() > 1e-8) {
              pivot.sub(camera.position);
              absorbOrbitPosition(true);
          }
          orbitRadiusRef.current = pivot.length();

          // Realign target along forward — keeps OrbitControls'
          // auto-frame lookAt(target) a no-op (no snap to pivot).
          if (orbitRef.current) {
              wFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
              orbitRef.current.target.copy(camera.position).addScaledVector(wFwd, orbitRadiusRef.current);
          }
          // Reset accumulation. The useFrame posChanged/rotChanged
          // path can't detect this gesture: per-event absorb returns
          // camera.position to (0,0,0) every event so the position
          // delta is always zero. The view DID change (sceneOffset
          // shifted), but useFrame doesn't watch sceneOffset. Set
          // dirty here, where we know the view has moved.
          engine.dirty = true;
          // Burst-end heuristic — wheel API has no `wheelend` event,
          // so we still need a debounce timer. But it now ONLY does
          // state cleanup (no offset mutation), so a late firing is
          // safe regardless of what gesture is currently active.
          if (scrollEndTimeout.current) clearTimeout(scrollEndTimeout.current);
          scrollEndTimeout.current = setTimeout(() => {
              isScrollingRef.current = false;
              gestureActivePivotRef.current = null;
              scrollEndTimeout.current = null;
          }, 100);
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => {
          el.removeEventListener('wheel', onWheel);
          if (scrollEndTimeout.current) clearTimeout(scrollEndTimeout.current);
      };
  }, [mode, gl, camera]);

  // Custom left-drag orbit — replaces OrbitControls.ROTATE.
  //
  // OrbitControls.ROTATE always calls camera.lookAt(target), which
  // forces the camera to face the target each frame. When target is
  // the off-axis cursor pivot, the first lookAt rotates the camera so
  // the cursor jumps to screen centre — visible as a one-frame snap.
  //
  // Custom math (Blender "rotate around cursor" style):
  //   1. Rotate (camera.position - pivot) by user input → camera moves
  //      on a sphere around pivot.
  //   2. Rotate camera.quaternion by the SAME delta angles.
  // Both rotated by the same composite quaternion → the pivot's
  // direction-from-camera stays invariant in camera-space, so the
  // cursor pixel stays put. The world rotates around the cursor.
  useEffect(() => {
      if (mode !== 'Orbit') return;
      const el = gl.domElement;
      let dragging = false;
      let lastX = 0, lastY = 0;
      const orbitPivot = new THREE.Vector3();

      const onDown = (e: PointerEvent) => {
          if (e.button !== 0) return; // left only
          if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;
          // Toggle off → drei owns ROTATE natively.
          if (!useFractalStore.getState().navigation?.orbitCursorAnchor) return;
          if (selectMovementLock(useFractalStore.getState())) return;
          if (isCameraLockedRef.current) return;

          // Flush any pending wheel-end absorb BEFORE we snapshot the
          // pivot — otherwise the absorb may fire mid-drag and shift
          // sceneOffset out from under our cached local pivot.
          cancelScrollEndTimer();

          dragging = true;
          lastX = e.clientX;
          lastY = e.clientY;

          // Snapshot pivot — localize the world-space hover pivot using
          // the CURRENT sceneOffset (cached value would be stale if
          // sceneOffset shifted since the pick — e.g., after
          // absorbOrbitPosition baked the previous gesture into it).
          // Pick miss → fall back to camera-forward at last surface dist.
          const local = snapshotHoverPivotLocal();
          if (local) {
              orbitPivot.copy(local);
          } else {
              const dist = distAverageRef.current > 0 ? distAverageRef.current : (useFractalStore.getState().targetDistance || 3.5);
              orbitRadiusRef.current = dist;
              const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
              orbitPivot.copy(camera.position).addScaledVector(fwd, dist);
          }
          gestureActivePivotRef.current = orbitPivot.clone();
          // Freeze the azimuth axis at the camera's current up. Q/E
          // roll between gestures gets picked up here; within a
          // gesture the axis stays put so the up pole doesn't drift.
          gestureUpRef.current.copy(camera.up).normalize();
          isCustomOrbitRef.current = true;
          // Disable drei's frame-loop update synchronously — its
          // useFrame priority (-1) runs BEFORE our priority-0
          // useFrame, so flipping the ref alone would let one frame
          // of lookAt(target) slip through. Touch enabled directly.
          if (orbitRef.current) orbitRef.current.enabled = false;

          // Re-calibrate zoom sensitivity from new pivot distance —
          // matches the OrbitControls onStart calibration so wheel /
          // middle-drag feel consistent during the same focus.
          const dist = distAverageRef.current > 0 ? distAverageRef.current : (useFractalStore.getState().targetDistance || 3.5);
          const dPivot = camera.position.distanceTo(orbitPivot);
          if (dPivot > 1e-8) currentZoomSensitivity.current = Math.max(0.001, (dist / dPivot) * 1.25);
          lastPos.current.copy(camera.position);
      };

      // Pre-allocated scratch — pointermove fires at 60-120 Hz and
      // a `new Vector3()` per event would generate measurable GC.
      const sUp     = new THREE.Vector3();
      const sRight  = new THREE.Vector3();
      const sFwd    = new THREE.Vector3();
      const sOffset = new THREE.Vector3();
      const qTheta  = new THREE.Quaternion();
      const qPhi    = new THREE.Quaternion();

      const onMove = (e: PointerEvent) => {
          if (!dragging) return;
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          lastX = e.clientX;
          lastY = e.clientY;
          if (dx === 0 && dy === 0) return;

          // Apply rotation SYNCHRONOUSLY here. drei's OrbitControls
          // calls scope.update() from inside its pointermove handler
          // for the same reason: under render strain, deferring to
          // useFrame costs a full render-frame of latency (the camera
          // doesn't move until the next render). Synchronous keeps
          // the pose fresh — when R3F's render runs it always sees
          // the latest pointermove already applied. The orbit math
          // is microseconds; coalescing isn't worth the latency.
          const orbitPivot = gestureActivePivotRef.current;
          if (!orbitPivot) return;
          const gestureUp = gestureUpRef.current;

          const rotSpeed = 1.0 / (fitScale || 1.0);
          const H = el.clientHeight || 1;
          const thetaDelta = -2 * Math.PI * (dx / H) * rotSpeed;
          let   phiDelta   = -2 * Math.PI * (dy / H) * rotSpeed;

          // Azimuth around frozen gesture-up.
          sUp.copy(gestureUp);
          qTheta.setFromAxisAngle(sUp, thetaDelta);
          sOffset.subVectors(camera.position, orbitPivot).applyQuaternion(qTheta);
          camera.position.copy(orbitPivot).add(sOffset);
          camera.quaternion.premultiply(qTheta);

          // Polar clamp + qPhi around post-azimuth camera.right.
          sFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
          const polarFromUp = Math.acos(THREE.MathUtils.clamp(sFwd.dot(sUp), -1, 1));
          const eps = 0.02;
          const polarTarget = polarFromUp - phiDelta;
          if (polarTarget < eps)           phiDelta = polarFromUp - eps;
          if (polarTarget > Math.PI - eps) phiDelta = polarFromUp - (Math.PI - eps);

          sRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
          qPhi.setFromAxisAngle(sRight, phiDelta);
          sOffset.subVectors(camera.position, orbitPivot).applyQuaternion(qPhi);
          camera.position.copy(orbitPivot).add(sOffset);
          camera.quaternion.premultiply(qPhi);

          camera.up.copy(gestureUp);

          orbitRadiusRef.current = camera.position.distanceTo(orbitPivot);
          if (orbitRef.current) {
              sFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
              orbitRef.current.target.copy(camera.position).addScaledVector(sFwd, orbitRadiusRef.current);
          }

          // Reset accumulation. useFrame's rotChanged check would
          // detect this on the NEXT frame (lastRot was updated end
          // of last frame, before this onMove ran), but flagging
          // dirty here matches what the wheel / middle handlers do
          // and avoids a one-frame blur on the first move.
          engine.dirty = true;
      };

      const onUp = (e: PointerEvent) => {
          if (e.button !== 0) return;
          if (!dragging) return;
          dragging = false;
          gestureActivePivotRef.current = null;
          isCustomOrbitRef.current = false;
          // Match the original OrbitControls.onEnd: capture final orbit
          // radius and absorb camera.position into sceneOffset
          // atomically (silent — no accumulation reset).
          const r = camera.position.length();
          if (r > 1e-4) orbitRadiusRef.current = r;
          absorbOrbitPosition(true);
      };

      el.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      return () => {
          el.removeEventListener('pointerdown', onDown);
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
      };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, gl, camera, fitScale]);

  // Custom middle-drag handler — same translation math as the wheel,
  // delta driven by vertical drag (down = zoom in, matching Blender /
  // most DCCs). OrbitControls' MIDDLE.DOLLY is bypassed (we set MIDDLE
  // to a benign mode below).
  useEffect(() => {
      if (mode !== 'Orbit') return;
      const el = gl.domElement;
      let active = false;
      let lastY = 0;
      const onDown = (e: PointerEvent) => {
          if (e.button !== 1) return; // middle only
          if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;
          // Toggle off → drei owns MIDDLE.DOLLY natively.
          if (!useFractalStore.getState().navigation?.orbitCursorAnchor) return;
          if (selectMovementLock(useFractalStore.getState())) return;
          if (isCameraLockedRef.current) return;
          cancelScrollEndTimer();
          active = true;
          lastY = e.clientY;
          gestureActivePivotRef.current = snapshotHoverPivotLocal();
          isScrollingRef.current = true;
          if (orbitRef.current) orbitRef.current.enabled = false;
          e.preventDefault();
      };
      const mFwd    = new THREE.Vector3();
      const mOffset = new THREE.Vector3();
      const onMove = (e: PointerEvent) => {
          if (!active) return;
          const dy = e.clientY - lastY;
          lastY = e.clientY;
          if (dy === 0) return;
          const dollySpeed = currentZoomSensitivity.current || 1.0;
          // Drag down (positive dy) → zoom in (factor < 1)
          const f = Math.exp(-dy * 0.005 * dollySpeed);
          // Lazy-init gesture pivot with a fresh Vector3 (not a scratch
          // reused next call). On no-hover, fall back to forward.
          if (!gestureActivePivotRef.current) {
              mFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
              gestureActivePivotRef.current = new THREE.Vector3()
                  .copy(camera.position)
                  .addScaledVector(mFwd, Math.max(0.01, orbitRadiusRef.current));
          }
          const pivot = gestureActivePivotRef.current;
          mOffset.subVectors(camera.position, pivot).multiplyScalar(f);
          camera.position.copy(pivot).add(mOffset);
          // Per-event absorb (same pattern as wheel) — keeps
          // camera.position at 0 between events, so onUp's absorb
          // is a no-op and there's no end-of-gesture snap. Pivot is
          // shifted into the new local frame (sub camera.position
          // that's about to be baked into sceneOffset).
          if (camera.position.lengthSq() > 1e-8) {
              pivot.sub(camera.position);
              absorbOrbitPosition(true);
          }
          orbitRadiusRef.current = pivot.length();
          if (orbitRef.current) {
              mFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
              orbitRef.current.target.copy(camera.position).addScaledVector(mFwd, orbitRadiusRef.current);
          }
          // Reset accumulation — see same note in wheel handler.
          engine.dirty = true;
      };
      const onUp = (e: PointerEvent) => {
          if (e.button !== 1) return;
          active = false;
          gestureActivePivotRef.current = null;
          isScrollingRef.current = false;
          // Absorb to keep main / worker / store in sync after the
          // gesture (same reason as the wheel scrollEndTimeout above).
          absorbOrbitPosition(true);
      };
      el.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      return () => {
          el.removeEventListener('pointerdown', onDown);
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
      };
  }, [mode, gl, camera]);

  // Pivot-marker reticle — small DOM dot that visualises the active
  // orbit/zoom pivot. Shown only while a gesture is in progress; the
  // per-frame position is computed in useFrame by projecting
  // gestureActivePivotRef into screen space (see useFrame body).
  useEffect(() => {
      if (mode !== 'Orbit') return;
      const parent = gl.domElement.parentElement;
      if (!parent) return;
      const dot = document.createElement('div');
      dot.style.cssText = [
          'position:absolute',
          'pointer-events:none',
          'width:14px',
          'height:14px',
          'border:2px solid rgb(34, 211, 238)', // cyan-400
          'background:rgba(34, 211, 238, 0.2)',
          'border-radius:50%',
          'transform:translate(-50%, -50%)',
          'opacity:0',
          'transition:opacity 120ms ease-out',
          'z-index:5',
          'box-shadow:0 0 6px rgba(34, 211, 238, 0.6)',
      ].join(';');
      parent.appendChild(dot);
      pivotMarkerRef.current = dot;
      return () => {
          if (dot.parentElement) dot.parentElement.removeChild(dot);
          pivotMarkerRef.current = null;
      };
  }, [mode, gl]);

  // Strict Orbit Gating: Listen for Pointer events on the canvas to enable/disable controls
  useEffect(() => {
      if (mode !== 'Orbit') return;
      const el = gl.domElement;

      const onPointerDown = (e: PointerEvent) => {
           // Ignore if hitting UI overlay
           if ((e.target as HTMLElement).closest('.pointer-events-auto')) {
               allowOrbitInteraction.current = false;
               return;
           }

           allowOrbitInteraction.current = true;

           if (orbitRef.current) {
               orbitRef.current.enabled = true;
           }
      };

      const onPointerUp = () => {
           allowOrbitInteraction.current = false;
           gestureActivePivotRef.current = null;
      };

      el.addEventListener('pointerdown', onPointerDown, { capture: true });
      window.addEventListener('pointerup', onPointerUp);

      return () => {
          el.removeEventListener('pointerdown', onPointerDown, { capture: true });
          window.removeEventListener('pointerup', onPointerUp);
      };
  }, [mode, gl]);

  const isCameraLocked = (isPlaying && (!isRecording || !recordCamera) && Object.keys(sequence.tracks).some(k => k.startsWith('camera.'))) || isScrubbing;
  isCameraLockedRef.current = isCameraLocked;

  useEffect(() => {
      if (isCameraLocked) setIsOrbitReady(false);
      else if (mode === 'Orbit' && !isOrbitReady) {
          // Re-enable orbit after unlock
          initOrbitPivot();
      }
  }, [isCameraLocked, mode]);

  // Mode Switching Logic
  useLayoutEffect(() => {
    if (prevMode.current !== mode) {
        FractalEvents.emit('camera_snap', undefined);

        // Safety: absorb any residual orbit position (e.g. mid-scroll switch)
        absorbOrbitPosition();

        if (mode === 'Fly') {
            FractalEvents.emit('camera_snap', undefined);
            lastPos.current.set(0, 0, 0);
            currentFrameVelocity.current.set(0, 0, 0);
            currentRotVelocity.current.set(0, 0, 0);
            flyController.current.reset();
            setIsOrbitReady(false);
            // Seed fly speed from orbit radius or surface distance
            const d = engine.lastMeasuredDistance;
            if (d > 0.001) distAverageRef.current = d;
            else if (orbitRadiusRef.current > 0.001) distAverageRef.current = orbitRadiusRef.current;
        } else if (mode === 'Orbit') {
            // Camera is at origin after absorb — set up orbit pivot
            initOrbitPivot();
        }
        prevMode.current = mode;
    }
  }, [mode, camera]);

  useFrame((state, delta) => {
      const stoppedPlaying = wasPlayingRef.current && !isPlaying;
      const stoppedScrubbing = wasScrubbingRef.current && !isScrubbing;
      
      if (stoppedPlaying || stoppedScrubbing) {
          FractalEvents.emit('camera_snap', undefined);
          // Animation commits with position=(0,0,0) via teleport — seed orbit pivot
          if (mode === 'Orbit') {
              const d = distAverageRef.current || engine.lastMeasuredDistance || 3.5;
              orbitRadiusRef.current = d;
              calcOrbitTarget(camera, d, orbitTargetZero.current);
              if (orbitRef.current) {
                  orbitRef.current.target.copy(orbitTargetZero.current);
                  orbitRef.current.update();
              }
          }
      }
      wasPlayingRef.current = isPlaying;
      wasScrubbingRef.current = isScrubbing;

      // --- Smooth camera transition ---
      if (transitionRef.current?.active) {
          const t = transitionRef.current;
          t.elapsed += delta;
          const raw = Math.min(t.elapsed / t.duration, 1.0);
          // Smoothstep easing
          const progress = raw * raw * (3.0 - 2.0 * raw);

          // Interpolate unified position
          const interpPos = new THREE.Vector3().lerpVectors(t.startPos, t.endPos, progress);
          // Slerp rotation
          const interpRot = t.startRot.clone().slerp(t.endRot, progress);

          // Apply via teleport mechanism: split interpPos into offset + local(0,0,0)
          const sX = VirtualSpace.split(interpPos.x);
          const sY = VirtualSpace.split(interpPos.y);
          const sZ = VirtualSpace.split(interpPos.z);

          const newOffset = {
              x: sX.high, y: sY.high, z: sZ.high,
              xL: sX.low, yL: sY.low, zL: sZ.low
          };

          camera.position.set(0, 0, 0);
          camera.quaternion.copy(interpRot);
          camera.updateMatrixWorld();

          setSceneOffset(newOffset);
          engine.shouldSnapCamera = true;
          engine.dirty = true;

          lastPos.current.copy(camera.position);
          lastRot.current.copy(camera.quaternion);

          if (raw >= 1.0) {
              // Transition complete — finalize with exact target state
              transitionRef.current = null;
              // Emit a teleport with exact final state to ensure precision
              FractalEvents.emit('camera_teleport', t.endState);
          }
          return; // Skip normal camera logic during transition
      }

      if (isCameraLocked) {
          if (orbitRef.current) orbitRef.current.enabled = false;
          if (setIsCameraInteracting) setIsCameraInteracting(false);
          // Don't update engine here, handled by RenderLoop in ViewportArea
          engine.isCameraInteracting = false; 
          return;
      }
      
      if (mode === 'Orbit' && !isOrbitReady) {
           initOrbitPivot();
      }

      const posChanged = camera.position.distanceToSquared(lastPos.current) > 1e-12;
      const rotChanged = camera.quaternion.angleTo(lastRot.current) > 1e-11;
      const cameraMoving = posChanged || rotChanged;
      const isCurrentlyActive = isInteracting() || isOrbitDragging.current || isCustomOrbitRef.current || isScrollingRef.current;

      // Pivot-marker reticle. Shows wherever a valid pick lives:
      //   - During an active gesture → gestureActivePivotRef (frozen
      //     for the duration so the dot stays put, confirming the
      //     orbit-around-cursor math keeps NDC invariant).
      //   - Between gestures → hoverPivotWorldRef, re-localised each
      //     frame from the CURRENT sceneOffset. If the dot suddenly
      //     drifts when no input is happening, that's a sign of a
      //     stale-offset bug (useful for debugging the "occasional
      //     glitch at end of interactions").
      const dot = pivotMarkerRef.current;
      if (dot) {
          let pivot: THREE.Vector3 | null = null;
          if (gestureActivePivotRef.current && (isCustomOrbitRef.current || isScrollingRef.current)) {
              pivot = gestureActivePivotRef.current;
          } else if (hoverPivotWorldRef.current) {
              const so = engine.sceneOffset;
              const w = hoverPivotWorldRef.current;
              pivotLocalVec.current.set(
                  w.x - (so.x + (so.xL ?? 0)),
                  w.y - (so.y + (so.yL ?? 0)),
                  w.z - (so.z + (so.zL ?? 0)),
              );
              pivot = pivotLocalVec.current;
          }

          if (pivot) {
              pivotProjVec.current.copy(pivot).project(camera);
              const v = pivotProjVec.current;
              // v.z > 1 → behind camera; |v.x|, |v.y| in NDC. Hide if
              // off-screen with margin, hide if behind the camera.
              const onScreen = v.z < 1
                  && v.x >= -1.2 && v.x <= 1.2
                  && v.y >= -1.2 && v.y <= 1.2;
              if (onScreen) {
                  const px = (v.x + 1) * 0.5 * gl.domElement.clientWidth;
                  const py = (-v.y + 1) * 0.5 * gl.domElement.clientHeight;
                  dot.style.left = `${px}px`;
                  dot.style.top = `${py}px`;
                  // Brighter during active gesture, subtler when just
                  // hovering — gives a "passive tracker → engaged"
                  // affordance without a hard mode switch.
                  const active = isCustomOrbitRef.current || isScrollingRef.current;
                  dot.style.opacity = active ? '1' : '0.55';
              } else {
                  dot.style.opacity = '0';
              }
          } else {
              dot.style.opacity = '0';
          }
      }

      // Cancel smooth transition on user input
      if (isCurrentlyActive && transitionRef.current) {
          transitionRef.current = null;
      }

      if (setIsCameraInteracting) setIsCameraInteracting(isCurrentlyActive);

      // Signal Engine Interaction State (Consumer is RenderLoop in ViewportArea)
      engine.isCameraInteracting = isCurrentlyActive;

      // No dirty kick needed here — the engine's own threshold detection
      // in update() handles accumulation transitions naturally:
      //   - During movement above threshold → engine resets each frame
      //   - Movement drops below threshold → accumulation starts automatically
      // A dirty kick would reset already-accumulated frames, causing a flash.

        // Only reset accumulation when there's significant camera movement
        if (isCurrentlyActive && (posChanged || rotChanged)) {
            // Reset accumulation on camera movement
            engine.dirty = true;
            if (!isMovingRef.current && onStart) {
                isMovingRef.current = true;
                const camState = engine.virtualSpace
                    ? engine.virtualSpace.getUnifiedCameraState(camera, engine.lastMeasuredDistance)
                    : { position: { x: camera.position.x, y: camera.position.y, z: camera.position.z }, rotation: { x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w }, sceneOffset: { ...engine.sceneOffset }, targetDistance: engine.lastMeasuredDistance };
                onStart(camState);
            }
            if (isRecording && recordCamera) {
                captureCameraKeyFrame(currentFrame, {
                    skipSnapshot: true,
                    interpolation: isPlaying ? 'Linear' : 'Bezier',
                });
            }
        }

      if (posChanged || rotChanged || isCurrentlyActive) {
          if (stopTimeout.current) clearTimeout(stopTimeout.current);
          stopTimeout.current = setTimeout(() => {
              isMovingRef.current = false;
              if (onEnd) onEnd();
              
              if (useFractalStore.getState().isUserInteracting) return;
              
              // targetDistance always means surface distance (never orbit radius)
              let dist = engine.lastMeasuredDistance;
              // Guard sky/miss sentinel before writing to store (MISS_DIST = 1000.0)
              if (dist <= 0 || dist >= 1000.0) dist = useFractalStore.getState().targetDistance || 3.5;

              // Always write normalized state: position=(0,0,0), everything in offset
              const so = engine.sceneOffset;
              const normalizedOffset = {
                  x: so.x, y: so.y, z: so.z,
                  xL: (so.xL ?? 0) + camera.position.x,
                  yL: (so.yL ?? 0) + camera.position.y,
                  zL: (so.zL ?? 0) + camera.position.z
              };
              VirtualSpace.normalize(normalizedOffset);

              useFractalStore.setState({
                  cameraRot: { x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w },
                  sceneOffset: normalizedOffset,
                  targetDistance: dist
              });
          }, 100);
          lastPos.current.copy(camera.position);
          lastRot.current.copy(camera.quaternion);
      }
      
      if (mode === 'Fly') {
          if (disableMovement) return;

          // Scale drag delta by fitScale so fixed-resolution mode doesn't amplify sensitivity
          const scale = fitScale || 1.0;
          const dragDx = isDraggingRef.current ? (mousePos.current.x - dragStart.current.x) * scale : 0;
          const dragDy = isDraggingRef.current ? (mousePos.current.y - dragStart.current.y) * scale : 0;

          // Drive reticle to show drag offset from center
          if (hudRefs.reticle.current) {
              if (isDraggingRef.current && (Math.abs(dragDx) > 0.001 || Math.abs(dragDy) > 0.001)) {
                  const vw = gl.domElement.clientWidth * 0.5;
                  const vh = gl.domElement.clientHeight * 0.5;
                  hudRefs.reticle.current.style.opacity = '1';
                  hudRefs.reticle.current.style.transform = `translate(calc(-50% + ${dragDx * vw}px), calc(-50% + ${-dragDy * vh}px))`;
              } else {
                  hudRefs.reticle.current.style.opacity = '0';
              }
          }

          flyController.current.update(
              camera,
              delta,
              {
                  move: moveState.current,
                  look: joystickLook.current,
                  moveJoy: joystickMove.current,
                  isDragging: isDraggingRef.current,
                  dragDelta: { x: dragDx, y: dragDy },
                  invertY
              },
              {
                  baseSpeed: speedRef.current,
                  distEstimate: distAverageRef.current,
                  autoSlow: navSettings?.autoSlow ?? true
              }
          );

      } else if (mode === 'Orbit' && orbitRef.current) {
          // Read movement lock fresh — the React prop `disableMovement` may be stale in this closure
          const movementLocked = selectMovementLock(useFractalStore.getState());
          // Drei-enabled gating depends on which mode we're in.
          //
          // Toggle ON (cursor-anchor): custom handlers own ROTATE /
          // DOLLY / MIDDLE. Drei must NOT auto-update during those —
          // its priority -1 useFrame calls lookAt(target) every
          // frame which fights our custom rotation. Drei still owns
          // PAN (right-drag), so enable when isOrbitDragging or for
          // the brief allowOrbitInteraction window so its pointerdown
          // can latch on. Disable during custom gestures.
          //
          // Toggle OFF (native): drei owns everything. Always
          // enabled (subject to lock predicates) so its own wheel /
          // pointer handlers run for ROTATE / DOLLY / PAN. Without
          // this, scroll zoom silently no-ops because drei finds
          // enabled=false at wheel time (no pointerdown precedes
          // wheel-only interactions).
          const cursorAnchor = useFractalStore.getState().navigation?.orbitCursorAnchor ?? true;
          if (cursorAnchor) {
              const customActive = isCustomOrbitRef.current || isScrollingRef.current;
              orbitRef.current.enabled = !movementLocked && !isCameraLockedRef.current && !customActive && (allowOrbitInteraction.current || isOrbitDragging.current);
          } else {
              orbitRef.current.enabled = !movementLocked && !isCameraLockedRef.current;
          }
          orbitRef.current.zoomSpeed = currentZoomSensitivity.current;

          orbitRef.current.rotateSpeed = 1.0 / (fitScale || 1.0);

          // Q/E roll velocity application — gated on movementLocked too,
          // otherwise a held Q or E (or a tiny residual after release)
          // rotates the camera even while interactionMode is 'picking_focus'
          // / 'selecting_region' / etc. Generic across every lock predicate
          // (interactionMode, isExporting, isBucketRendering, feature
          // interactionConfig.blockCamera) since selectMovementLock covers
          // all of them.
          if (!movementLocked && Math.abs(inputRollVel.current) > 0.01) {
              const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
              camera.up.applyAxisAngle(fwd, -inputRollVel.current * 2.0 * delta).normalize();
              orbitRef.current.update();
          }

          // Per-frame pan absorb. drei owns pan: each pan-move shifts
          // camera.position AND target by the same delta. We can't
          // intercept per-event, so we absorb here (priority 0, after
          // drei's priority -1 update). Same goal as wheel/middle:
          // keep camera.position at 0 between events so the eventual
          // onEnd absorb is a no-op and there's no end-of-pan snap.
          // keepTarget=true preserves target's WORLD position (only
          // its local-space coords shift to match the new sceneOffset).
          if (isOrbitDragging.current && camera.position.lengthSq() > 1e-8) {
              absorbOrbitPosition(true, true);
              // Reset accumulation: per-frame absorb zeroes
              // camera.position so the useFrame posChanged check
              // can't see that pan has moved the view.
              engine.dirty = true;
          }
      }

      // Shadow unified offset: always up-to-date canonical world position
      // regardless of whether OrbitControls has a non-zero camera.position mid-drag
      const so = engine.sceneOffset;
      unifiedOffsetRef.current = {
          x: so.x, y: so.y, z: so.z,
          xL: (so.xL ?? 0) + camera.position.x,
          yL: (so.yL ?? 0) + camera.position.y,
          zL: (so.zL ?? 0) + camera.position.z
      };
  });

  if (mode !== 'Orbit' || !isOrbitReady || isCameraLocked) return null;

  return <OrbitControls 
            ref={orbitRef} 
            enabled={!disableMovement}
            makeDefault
            enableDamping={false}
            target={orbitTargetZero.current}
            // Cursor-anchor toggle controls which path owns rotate/zoom.
            //   ON  → custom handlers (cursor-anchored, fights drei).
            //         LEFT and MIDDLE bound to -1 (no-op) so drei stays
            //         out of the way; enableZoom=false for the same
            //         reason. Pan still goes through drei.
            //   OFF → drei native ROTATE / DOLLY / PAN, identical to
            //         the pre-toggle path. The custom handlers
            //         self-gate (see early return on settings check)
            //         so they don't interfere.
            enableZoom={!(navSettings?.orbitCursorAnchor ?? true)}
            mouseButtons={(navSettings?.orbitCursorAnchor ?? true)
                ? { LEFT: -1 as any, MIDDLE: -1 as any, RIGHT: THREE.MOUSE.PAN }
                : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
            touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
            onStart={() => {
                // Pan-only via OrbitControls now. Critically, set
                // target ahead of the camera at orbit-radius distance:
                // OrbitControls.PAN computes the per-pixel world-space
                // delta from `camera.position.distanceTo(target)`. If
                // the target is still at the camera (e.g., after a
                // custom-orbit gesture reset it to camera.position +
                // forward × tiny), PAN's distance is ~0 and pan
                // becomes a no-op.
                isOrbitDragging.current = true;
                cancelScrollEndTimer();
                if (orbitRef.current) {
                    const dist = distAverageRef.current > 0
                        ? distAverageRef.current
                        : (useFractalStore.getState().targetDistance || 3.5);
                    orbitRadiusRef.current = dist;
                    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                    orbitRef.current.target.copy(camera.position).addScaledVector(fwd, dist);
                    orbitRef.current.update();
                    lastPos.current.copy(camera.position);
                }
            }}
            onEnd={() => {
                isOrbitDragging.current = false;
                const r = camera.position.length();
                if (r > 1e-4) orbitRadiusRef.current = r;
                absorbOrbitPosition(true);
            }}
         />;
};

export default Navigation;
