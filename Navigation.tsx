import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { engine } from '../engine/FractalEngine';
import { FractalEvents } from '../engine/FractalEvents';
import { CameraState, CameraMode } from '../types';
import { useInputController } from '../hooks/useInputController';
import { usePhysicsProbe } from '../hooks/usePhysicsProbe';
import { useAnimationStore } from '../store/animationStore';
import { useFractalStore, selectMovementLock } from '../store/fractalStore';

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
}

// Fix: Corrected component definition to ensure it returns a valid ReactNode (or null) and completed the logic from truncated source.
const Navigation: React.FC<NavigationProps> = ({ 
  mode, 
  onStart, onEnd, hudRefs,
  setSceneOffset
}) => {
  const { camera, gl } = useThree();
  const orbitRef = useRef<OrbitControlsImpl>(null);
  
  const disableMovement = useFractalStore(selectMovementLock);
  const optics = useFractalStore(s => s.optics);
  const isOrtho = optics && Math.abs(optics.camType - 1.0) < 0.1;
  const navSettings = useFractalStore(s => s.navigation);
  const setNavigation = useFractalStore(s => s.setNavigation);
  
  const [orbitTarget, setOrbitTarget] = useState<THREE.Vector3>(new THREE.Vector3(0,0,0));
  const [isOrbitReady, setIsOrbitReady] = useState(mode === 'Orbit');
  const [orbitControlsKey, setOrbitControlsKey] = useState(0);

  // Pivot Sync Helper: Re-centers the orbit target on the fractal surface
  const syncOrbitTargetToCamera = (overrideDistance?: number) => {
        camera.updateMatrixWorld(); 
        const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        camera.up.copy(currentUp);

        let dist = overrideDistance || engine.lastMeasuredDistance;
        // Fallback for sky/invalid distance
        if (dist <= 1e-7 || dist > 1000.0) {
            dist = useFractalStore.getState().targetDistance || 3.5;
        }
        
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const target = new THREE.Vector3().copy(camera.position).addScaledVector(forward, dist);
        
        setOrbitTarget(target.clone());
        setOrbitControlsKey(prev => prev + 1); // Force OrbitControls re-mount to pick up new target
        setIsOrbitReady(true);
  };

  // On mount, if we are in Orbit mode, we MUST sync the target immediately.
  useEffect(() => {
      if (mode === 'Orbit') {
          syncOrbitTargetToCamera();
      }
  }, []);

  // PASSIVE LISTENER: Navigation now listens for external teleports (URLs, Undos, Presets)
  useEffect(() => {
      const onTeleport = (newState: CameraState) => {
          // Clear velocities
          currentFrameVelocity.current.set(0,0,0);
          currentRotVelocity.current.set(0,0,0);
          rollVelocity.current = 0;
          
          // If we are in Orbit mode, we must sync the pivot to the new camera position/rotation
          if (mode === 'Orbit') {
              syncOrbitTargetToCamera(newState.targetDistance);
          }
      };
      const unsub = FractalEvents.on('camera_teleport', onTeleport);
      return () => unsub();
  }, [mode, camera]);

  const isPlaying = useAnimationStore(s => s.isPlaying);
  const isScrubbing = useAnimationStore(s => s.isScrubbing);
  const isRecording = useAnimationStore(s => s.isRecording);
  const recordCamera = useAnimationStore(s => s.recordCamera);
  const currentFrame = useAnimationStore(s => s.currentFrame);
  const sequence = useAnimationStore(s => s.sequence);
  const captureCameraFrame = useAnimationStore(s => s.captureCameraFrame);
  const setIsCameraInteracting = useAnimationStore(s => s.setIsCameraInteracting);
  
  const { moveState, isDraggingRef, dragStart, mousePos, speedRef, joystickMove, joystickLook, invertY, rollVelocity, isInteracting } = useInputController(
      mode, 
      navSettings?.flySpeed ?? 0.5, 
      (v) => setNavigation({ flySpeed: v }),
      hudRefs
  );
  
  const { distAverageRef } = usePhysicsProbe(hudRefs, speedRef);
  
  const currentFrameVelocity = useRef(new THREE.Vector3());
  const currentRotVelocity = useRef(new THREE.Vector3()); 
  const isMovingRef = useRef(false);
  const stopTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPos = useRef(new THREE.Vector3());
  const lastRot = useRef(new THREE.Quaternion());
  const prevMode = useRef(mode);
  const isOrbitDragging = useRef(false);
  const isScrollingRef = useRef(false);
  const scrollEndTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPlayingRef = useRef(isPlaying);
  const wasScrubbingRef = useRef(isScrubbing);
  const currentZoomSensitivity = useRef(1.0);

  // Handle Wheel Start/End for interaction tracking
  useEffect(() => {
      const onWheel = () => {
          isScrollingRef.current = true;
          if (scrollEndTimeout.current) clearTimeout(scrollEndTimeout.current);
          scrollEndTimeout.current = setTimeout(() => {
              isScrollingRef.current = false;
          }, 100);
      };
      window.addEventListener('wheel', onWheel, { passive: true });
      return () => {
          window.removeEventListener('wheel', onWheel);
          if (scrollEndTimeout.current) clearTimeout(scrollEndTimeout.current);
      };
  }, []);

  const isCameraLocked = (isPlaying && (!isRecording || !recordCamera) && Object.keys(sequence.tracks).some(k => k.startsWith('camera.'))) || isScrubbing;

  useEffect(() => {
      if (isCameraLocked) setIsOrbitReady(false);
      else if (mode === 'Orbit' && !isOrbitReady) syncOrbitTargetToCamera();
  }, [isCameraLocked, mode]);

  // Mode Switching Logic
  useLayoutEffect(() => {
    if (prevMode.current !== mode) {
        FractalEvents.emit('camera_snap', undefined);
        if (mode === 'Fly') {
            FractalEvents.emit('camera_absorb', { camera });
            const so = engine.sceneOffset;
            setSceneOffset({ ...so });
            lastPos.current.set(0,0,0);
            currentFrameVelocity.current.set(0,0,0);
            currentRotVelocity.current.set(0,0,0);
            setIsOrbitReady(false);
        } else if (mode === 'Orbit') {
            syncOrbitTargetToCamera();
        }
        prevMode.current = mode;
    }
  }, [mode, camera]);

  useFrame((state, delta) => {
      const stoppedPlaying = wasPlayingRef.current && !isPlaying;
      const stoppedScrubbing = wasScrubbingRef.current && !isScrubbing;
      if (stoppedPlaying || stoppedScrubbing) {
          FractalEvents.emit('camera_snap', undefined); 
          if (mode === 'Orbit') syncOrbitTargetToCamera();
          else if (mode === 'Fly') {
              FractalEvents.emit('camera_absorb', { camera });
              setSceneOffset({ ...engine.sceneOffset });
          }
      }
      wasPlayingRef.current = isPlaying;
      wasScrubbingRef.current = isScrubbing;

      if (isCameraLocked) {
          if (setIsCameraInteracting) setIsCameraInteracting(false);
          engine.update(camera, delta, state, false);
          return;
      }

      const applyCurve = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 2);
      const hasJoystickMove = Math.abs(joystickMove.current.x) > 0.01 || Math.abs(joystickMove.current.y) > 0.01;
      const hasJoystickLook = Math.abs(joystickLook.current.x) > 0.01 || Math.abs(joystickLook.current.y) > 0.01;
      const posChanged = camera.position.distanceToSquared(lastPos.current) > 1e-12;
      const rotChanged = camera.quaternion.angleTo(lastRot.current) > 1e-11;
      const isCurrentlyActive = isInteracting() || isOrbitDragging.current || isScrollingRef.current;
      
      if (setIsCameraInteracting) setIsCameraInteracting(isCurrentlyActive);

      // DRIVE ENGINE UPDATE WITH INTERACTION FLAG
      engine.update(camera, delta, state, isCurrentlyActive);

      if (isCurrentlyActive && (posChanged || rotChanged)) {
          engine.dirty = true;
          if (!isMovingRef.current && onStart) {
              isMovingRef.current = true;
              onStart(engine.virtualSpace.getUnifiedCameraState(camera));
          }
          if (isRecording && recordCamera) captureCameraFrame(currentFrame, true, isPlaying ? 'Linear' : 'Bezier');
      }

      if (posChanged || rotChanged || isCurrentlyActive) {
          if (stopTimeout.current) clearTimeout(stopTimeout.current);
          stopTimeout.current = setTimeout(() => {
              isMovingRef.current = false;
              if (onEnd) onEnd();
              setSceneOffset({ ...engine.sceneOffset });
              useFractalStore.setState({
                  cameraPos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
                  cameraRot: { x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w },
                  targetDistance: engine.lastMeasuredDistance > 0 ? engine.lastMeasuredDistance : 3.5
              });
          }, 100);
          lastPos.current.copy(camera.position);
          lastRot.current.copy(camera.quaternion);
      }
      
      if (mode === 'Fly') {
          if (disableMovement) return;
          const dist = distAverageRef.current;
          const boost = moveState.current.boost ? 4.0 : 1.0;
          const autoSlow = navSettings?.autoSlow ?? true;
          const targetSpeed = autoSlow ? Math.max(dist * speedRef.current * boost, 1e-6) : 2.0 * speedRef.current * boost;
          
          const tv = new THREE.Vector3(0,0,0);
          if (moveState.current.forward) tv.z -= 1;
          if (moveState.current.backward) tv.z += 1;
          if (moveState.current.left) tv.x -= 1;
          if (moveState.current.right) tv.x += 1;
          if (moveState.current.up) tv.y += 1;
          if (moveState.current.down) tv.y -= 1;
          if (hasJoystickMove) { tv.z -= applyCurve(joystickMove.current.y); tv.x += applyCurve(joystickMove.current.x); }
          
          if (tv.lengthSq() > 0) {
              tv.normalize().multiplyScalar(targetSpeed * delta);
              const mv = tv.clone().applyQuaternion(camera.quaternion);
              FractalEvents.emit('offset_shift', { x: mv.x, y: mv.y, z: mv.z });
          }

          const tr = new THREE.Vector3(0,0,0);
          const yFlip = invertY ? -1 : 1;
          if (isDraggingRef.current) {
              const dx = mousePos.current.x - dragStart.current.x;
              const dy = mousePos.current.y - dragStart.current.y;
              tr.y = -dx * 2.0; tr.x = dy * 2.0 * yFlip; 
          } else if (hasJoystickLook) {
              tr.y = -applyCurve(joystickLook.current.x) * 0.66;
              tr.x = applyCurve(joystickLook.current.y) * 0.66 * yFlip;
          }
          
          tr.z = rollVelocity.current * 0.62;
          
          if (tr.lengthSq() > 0) {
              currentRotVelocity.current.lerp(tr, delta * 20.0);
          } else {
              currentRotVelocity.current.set(0, 0, 0);
          }

          if (currentRotVelocity.current.lengthSq() > 1e-8) {
              camera.rotateX(currentRotVelocity.current.x * delta * 2.5);
              camera.rotateY(currentRotVelocity.current.y * delta * 2.5);
              camera.rotateZ(currentRotVelocity.current.z * delta * 2.5);
          }
      } else if (mode === 'Orbit' && orbitRef.current) {
          orbitRef.current.enabled = !disableMovement && !isCameraLocked;
          orbitRef.current.zoomSpeed = currentZoomSensitivity.current;
          if (Math.abs(rollVelocity.current) > 0.01) {
              const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
              camera.up.applyAxisAngle(fwd, -rollVelocity.current * 2.0 * delta).normalize();
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
                const dist = distAverageRef.current;
                if (dist > 0.0001 && dist < 10.0 && orbitRef.current) {
                    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                    const newTarget = new THREE.Vector3().copy(camera.position).addScaledVector(fwd, dist);
                    orbitRef.current.target.copy(newTarget);
                    const dPivot = camera.position.distanceTo(newTarget);
                    if (dPivot > 1e-8) currentZoomSensitivity.current = Math.max(0.001, (dist / dPivot) * 1.25);
                }
            }}
            onEnd={() => { 
                isOrbitDragging.current = false; 
                if (orbitRef.current) {
                    const shift = orbitRef.current.target.clone();
                    if (shift.lengthSq() > 1e-12) {
                        FractalEvents.emit('offset_shift', { x: shift.x, y: shift.y, z: shift.z });
                        camera.position.sub(shift);
                        camera.updateMatrixWorld();
                        orbitRef.current.target.set(0, 0, 0);
                        setOrbitTarget(new THREE.Vector3(0, 0, 0));
                        setSceneOffset({ ...engine.sceneOffset });
                        orbitRef.current.update();
                    }
                }
            }}
         />;
};

export default Navigation;