
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
import { CameraState, CameraMode } from '../types';
import { useInputController } from '../hooks/useInputController';
import { usePhysicsProbe } from '../hooks/usePhysicsProbe';
import { useAnimationStore } from '../store/animationStore';
import { useFractalStore, selectMovementLock } from '../store/fractalStore';
import { CameraController } from '../engine/controllers/CameraController';

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
  
  const [orbitTarget, setOrbitTarget] = useState<THREE.Vector3>(new THREE.Vector3(0,0,0));
  const [isOrbitReady, setIsOrbitReady] = useState(mode === 'Orbit');
  const [orbitControlsKey, setOrbitControlsKey] = useState(0);

  // -- Physics Controllers --
  const flyController = useRef(new CameraController());
  
  const lastPos = useRef(new THREE.Vector3());
  const lastRot = useRef(new THREE.Quaternion());
  const currentFrameVelocity = useRef(new THREE.Vector3());
  const currentRotVelocity = useRef(new THREE.Vector3()); 
  const rollVelocity = useRef(0); // Need to lift this out of input controller or sync it

  // Input & Physics Hooks
  const { moveState, isDraggingRef, dragStart, mousePos, speedRef, joystickMove, joystickLook, invertY, rollVelocity: inputRollVel, isInteracting } = useInputController(
      mode, 
      navSettings?.flySpeed ?? 0.5, 
      (v) => setNavigation({ flySpeed: v }),
      hudRefs
  );
  
  const { distAverageRef } = usePhysicsProbe(hudRefs, speedRef);

  // Pivot Sync Helper: Re-centers the orbit target on the fractal surface
  const syncOrbitTargetToCamera = (overrideDistance?: number, forceRemount: boolean = false) => {
        camera.updateMatrixWorld(); 
        const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        camera.up.copy(currentUp);

        let dist = overrideDistance || engine.lastMeasuredDistance;
        // Fallback for sky/invalid distance (MISS_DIST = 1000.0 in shader — use >= to catch exact sentinel)
        if (dist <= 1e-7 || dist >= 1000.0) {
            dist = useFractalStore.getState().targetDistance || 3.5;
        }
        
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const target = new THREE.Vector3().copy(camera.position).addScaledVector(forward, dist);
        
        setOrbitTarget(target.clone());

        if (forceRemount) {
             setOrbitControlsKey(prev => prev + 1);
        } else if (orbitRef.current) {
             orbitRef.current.target.copy(target);
             orbitRef.current.update();
        }

        setIsOrbitReady(true);
  };

  // INITIAL SYNC: Fixes Race Condition on First Load
  useEffect(() => {
      const state = useFractalStore.getState();
      
      camera.position.set(state.cameraPos.x, state.cameraPos.y, state.cameraPos.z);
      camera.quaternion.set(state.cameraRot.x, state.cameraRot.y, state.cameraRot.z, state.cameraRot.w);
      camera.updateMatrixWorld();
      
      lastPos.current.copy(camera.position);
      lastRot.current.copy(camera.quaternion);

      // Initialize physics guess to prevent stuck movement on startup
      if (state.targetDistance) distAverageRef.current = state.targetDistance;

      if (mode === 'Orbit') {
          syncOrbitTargetToCamera(state.targetDistance, true);
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
               engine.lastMeasuredDistance = newState.targetDistance;
          }

          // 5. Update store + forward offset to worker
          if (newState.sceneOffset) {
              setSceneOffset(newState.sceneOffset);
              engine.shouldSnapCamera = true;
              engine.dirty = true;
          }

          // 6. Sync Orbit Pivot
          if (mode === 'Orbit' && !isOrbitDragging.current) {
               syncOrbitTargetToCamera(newState.targetDistance, false);
          }
      };
      
      const onResetAccum = () => {};

      const unsub1 = FractalEvents.on('camera_teleport', onTeleport);
      const unsub2 = FractalEvents.on('reset_accum', onResetAccum);
      return () => { unsub1(); unsub2(); };
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
  }, [gl]);
  
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
      else if (mode === 'Orbit' && !isOrbitReady) syncOrbitTargetToCamera(undefined, true);
  }, [isCameraLocked, mode]);

  // Mode Switching Logic
  useLayoutEffect(() => {
    if (prevMode.current !== mode) {
        FractalEvents.emit('camera_snap', undefined);
        if (mode === 'Fly') {
            // Absorb camera position into offset before switching to fly
            const so = engine.sceneOffset;
            const absorbed = {
                x: so.x, y: so.y, z: so.z,
                xL: (so.xL ?? 0) + camera.position.x,
                yL: (so.yL ?? 0) + camera.position.y,
                zL: (so.zL ?? 0) + camera.position.z
            };
            camera.position.set(0, 0, 0);
            camera.updateMatrixWorld();
            setSceneOffset(absorbed);
            FractalEvents.emit('camera_snap', undefined);
            lastPos.current.set(0,0,0);
            currentFrameVelocity.current.set(0,0,0);
            currentRotVelocity.current.set(0,0,0);
            flyController.current.reset();
            setIsOrbitReady(false);
            
            // Reset distance estimate on mode switch to ensure fly speed is reasonable
            const d = engine.lastMeasuredDistance;
            if (d > 0.001) distAverageRef.current = d;
            
        } else if (mode === 'Orbit') {
            syncOrbitTargetToCamera(undefined, true);
        }
        prevMode.current = mode;
    }
  }, [mode, camera]);

  useFrame((state, delta) => {
      const stoppedPlaying = wasPlayingRef.current && !isPlaying;
      const stoppedScrubbing = wasScrubbingRef.current && !isScrubbing;
      
      if (stoppedPlaying || stoppedScrubbing) {
          FractalEvents.emit('camera_snap', undefined); 
          if (mode === 'Orbit') syncOrbitTargetToCamera(undefined, false);
          else if (mode === 'Fly') {
              const so = engine.sceneOffset;
              const absorbed = {
                  x: so.x, y: so.y, z: so.z,
                  xL: (so.xL ?? 0) + camera.position.x,
                  yL: (so.yL ?? 0) + camera.position.y,
                  zL: (so.zL ?? 0) + camera.position.z
              };
              camera.position.set(0, 0, 0);
              camera.updateMatrixWorld();
              setSceneOffset(absorbed);
          }
      }
      wasPlayingRef.current = isPlaying;
      wasScrubbingRef.current = isScrubbing;

      if (isCameraLocked) {
          if (orbitRef.current) orbitRef.current.enabled = false;
          if (setIsCameraInteracting) setIsCameraInteracting(false);
          // Don't update engine here, handled by RenderLoop in ViewportArea
          engine.isCameraInteracting = false; 
          return;
      }
      
      if (mode === 'Orbit' && !isOrbitReady) {
           syncOrbitTargetToCamera(undefined, true);
      }

      const posChanged = camera.position.distanceToSquared(lastPos.current) > 1e-12;
      const rotChanged = camera.quaternion.angleTo(lastRot.current) > 1e-11;
      const cameraMoving = posChanged || rotChanged;
      const isCurrentlyActive = isInteracting() || isOrbitDragging.current || isScrollingRef.current;

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
                    : { position: { x: camera.position.x, y: camera.position.y, z: camera.position.z }, rotation: { x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w }, targetDistance: engine.lastMeasuredDistance };
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
              
              let dist = engine.lastMeasuredDistance;
              // Guard sky/miss sentinel before writing to store (MISS_DIST = 1000.0)
              if (dist <= 0 || dist >= 1000.0) dist = useFractalStore.getState().targetDistance || 3.5;
              if (mode === 'Orbit') {
                  const radius = camera.position.length();
                  if (radius > 1e-4) dist = radius;
              }

              useFractalStore.setState({
                  cameraPos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
                  cameraRot: { x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w },
                  sceneOffset: engine.sceneOffset,
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
  });

  if (mode !== 'Orbit' || !isOrbitReady || isCameraLocked) return null;

  return <OrbitControls 
            ref={orbitRef} 
            key={`orbit-controls-${orbitControlsKey}`} 
            enabled={!disableMovement} 
            makeDefault 
            enableDamping={false}
            target={orbitTarget}
            enableZoom={!isOrtho}
            mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
            touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
            onStart={() => {
                isOrbitDragging.current = true;
                if (orbitRef.current) {
                    const dist = distAverageRef.current > 0 ? distAverageRef.current : (useFractalStore.getState().targetDistance || 3.5);
                    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                    const newTarget = new THREE.Vector3().copy(camera.position).addScaledVector(fwd, dist);
                    
                    orbitRef.current.target.copy(newTarget);
                    orbitRef.current.update();
                    orbitRef.current.saveState(); 
                    
                    const dPivot = camera.position.distanceTo(newTarget);
                    if (dPivot > 1e-8) currentZoomSensitivity.current = Math.max(0.001, (dist / dPivot) * 1.25);
                }
            }}
            onEnd={() => {
                isOrbitDragging.current = false;
                // No pivot absorption here — in worker mode, camera.position.sub(shift)
                // and OFFSET_SHIFT can't be delivered atomically, causing a 1-frame glitch.
                // The pivot is overwritten on next orbit start (onStart), so it doesn't accumulate.
                // Absorption into offset only happens on Orbit→Fly mode switch.
            }}
         />;
};

export default Navigation;
