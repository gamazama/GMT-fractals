
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
import { useInputController } from '../hooks/useInputController';
import { usePhysicsProbe } from '../hooks/usePhysicsProbe';
import { useAnimationStore } from '../store/animationStore';
import { useFractalStore, selectMovementLock } from '../store/fractalStore';
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
  const absorbOrbitPosition = (silent = false) => {
      if (camera.position.lengthSq() < 1e-8) return;
      const so = engine.sceneOffset;
      const absorbed = {
          x: so.x, y: so.y, z: so.z,
          xL: (so.xL ?? 0) + camera.position.x,
          yL: (so.yL ?? 0) + camera.position.y,
          zL: (so.zL ?? 0) + camera.position.z
      };
      orbitRadiusRef.current = camera.position.length() || orbitRadiusRef.current;
      camera.position.set(0, 0, 0);
      camera.updateMatrixWorld();

      // Reset OrbitControls target so its update() (drei priority -1) doesn't
      // change the quaternion via lookAt. A tiny offset along the current forward
      // direction keeps lookAt non-degenerate and preserves the orientation.
      if (orbitRef.current) {
          const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
          orbitRef.current.target.copy(fwd.multiplyScalar(0.0001));
          orbitTargetZero.current.copy(orbitRef.current.target);
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

  // Set up orbit pivot from current camera state (used on init and mode switch to orbit)
  const initOrbitPivot = (overrideDistance?: number) => {
      camera.updateMatrixWorld();
      camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion));
      let dist = overrideDistance || engine.lastMeasuredDistance;
      if (dist <= 1e-7 || dist >= 1000.0) dist = useFractalStore.getState().targetDistance || 3.5;
      orbitRadiusRef.current = dist;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const target = new THREE.Vector3().copy(camera.position).addScaledVector(forward, dist);
      orbitTargetZero.current.copy(target);
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
               // Update orbit target so it's correct if OrbitControls reads it before next onStart
               const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
               orbitTargetZero.current.copy(camera.position).addScaledVector(fwd, d);
               if (orbitRef.current) {
                   orbitRef.current.target.copy(orbitTargetZero.current);
                   orbitRef.current.update();
               }
          }
      };
      
      const onResetAccum = () => {};

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
      const unsub2 = FractalEvents.on('reset_accum', onResetAccum);
      const unsub3 = FractalEvents.on('camera_transition', onTransition);
      return () => { unsub1(); unsub2(); unsub3(); };
  }, [mode, camera]);

  const isPlaying = useAnimationStore(s => s.isPlaying);
  const isScrubbing = useAnimationStore(s => s.isScrubbing);
  const isRecording = useAnimationStore(s => s.isRecording);
  const recordCamera = useAnimationStore(s => s.recordCamera);
  const currentFrame = useAnimationStore(s => s.currentFrame);
  const sequence = useAnimationStore(s => s.sequence);
  const captureCameraFrame = useAnimationStore(s => s.captureCameraFrame);
  
  const isMovingRef = useRef(false);
  const stopTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMode = useRef(mode);
  const isOrbitDragging = useRef(false);
  const isScrollingRef = useRef(false);
  const scrollEndTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPlayingRef = useRef(isPlaying);
  const wasScrubbingRef = useRef(isScrubbing);
  const currentZoomSensitivity = useRef(1.0);
  const isCameraLockedRef = useRef(false);
  const allowOrbitInteraction = useRef(false);

  // Handle Wheel Start/End for interaction tracking (canvas only, not UI panels)
  useEffect(() => {
      const el = gl.domElement;
      const onWheel = () => {
          isScrollingRef.current = true;
          if (scrollEndTimeout.current) clearTimeout(scrollEndTimeout.current);
          scrollEndTimeout.current = setTimeout(() => {
              isScrollingRef.current = false;
          }, 100);
      };
      el.addEventListener('wheel', onWheel, { passive: true });
      return () => {
          el.removeEventListener('wheel', onWheel);
          if (scrollEndTimeout.current) clearTimeout(scrollEndTimeout.current);
      };
  }, [gl, mode]);
  
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
              const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
              orbitTargetZero.current.copy(camera.position).addScaledVector(fwd, d);
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
      const isCurrentlyActive = isInteracting() || isOrbitDragging.current || isScrollingRef.current;

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
            if (isRecording && recordCamera) captureCameraFrame(currentFrame, true, isPlaying ? 'Linear' : 'Bezier');
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

          const dragDx = isDraggingRef.current ? mousePos.current.x - dragStart.current.x : 0;
          const dragDy = isDraggingRef.current ? mousePos.current.y - dragStart.current.y : 0;

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
          orbitRef.current.enabled = !disableMovement && !isCameraLockedRef.current && (allowOrbitInteraction.current || isOrbitDragging.current || isScrollingRef.current);
          orbitRef.current.zoomSpeed = currentZoomSensitivity.current;
          
          orbitRef.current.rotateSpeed = 1.0 / (fitScale || 1.0);
          
          if (Math.abs(inputRollVel.current) > 0.01) {
              const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
              camera.up.applyAxisAngle(fwd, -inputRollVel.current * 2.0 * delta).normalize();
              orbitRef.current.update();
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
            enableZoom={!isOrtho}
            mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
            touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
            onStart={() => {
                isOrbitDragging.current = true;
                if (orbitRef.current) {
                    const dist = distAverageRef.current > 0 ? distAverageRef.current : (useFractalStore.getState().targetDistance || 3.5);
                    orbitRadiusRef.current = dist;
                    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                    const newTarget = new THREE.Vector3().copy(camera.position).addScaledVector(fwd, dist);

                    orbitRef.current.target.copy(newTarget);
                    orbitRef.current.update();
                    orbitRef.current.saveState();

                    const dPivot = camera.position.distanceTo(newTarget);
                    if (dPivot > 1e-8) currentZoomSensitivity.current = Math.max(0.001, (dist / dPivot) * 1.25);
                    lastPos.current.copy(camera.position);
                }
            }}
            onEnd={() => {
                isOrbitDragging.current = false;
                const r = camera.position.length();
                if (r > 1e-4) orbitRadiusRef.current = r;
                // Absorb camera.position into offset atomically via RENDER_TICK.
                // No accumulation reset — unified position unchanged.
                absorbOrbitPosition(true);
            }}
         />;
};

export default Navigation;
