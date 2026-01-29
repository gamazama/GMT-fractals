
import React, { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { engine } from '../engine/FractalEngine';

export const usePhysicsProbe = (
    hudRefs: { 
        dist: React.RefObject<HTMLSpanElement | null>,
        speed: React.RefObject<HTMLSpanElement | null>,
        reset: React.RefObject<HTMLButtonElement | null>
    },
    speedRef: React.MutableRefObject<number>
) => {
    const { camera, gl } = useThree();
    
    // Physics State
    const distAverageRef = useRef(10.0);
    const distMinRef = useRef(10.0);
    
    // Internals for probe rendering
    const pixelBuffer = useRef(new Float32Array(64));
    const frameCount = useRef(0);
    const scratchMatrix = useRef(new THREE.Matrix4());
    const camRight = useRef(new THREE.Vector3());
    const camUp = useRef(new THREE.Vector3());
    const probeForward = useRef(new THREE.Vector3());

    useFrame((state) => {
        frameCount.current++;
        
        // Run Physics Probe (Every 2 frames to save performance)
        if (frameCount.current % 2 === 0) {
            const phys = engine.physicsUniforms;
            phys.uTime.value = state.clock.elapsedTime;
            
            scratchMatrix.current.makeRotationFromQuaternion(camera.quaternion);
            const e = scratchMatrix.current.elements;
            camRight.current.set(e[0], e[1], e[2]);
            camUp.current.set(e[4], e[5], e[6]);
            camera.getWorldDirection(probeForward.current);
            
            const tanFov = Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) * 0.5);
            const height = tanFov; 
            const width = height * (camera as THREE.PerspectiveCamera).aspect;
            
            const PROBE_FOV_SCALE = 0.05; 
            camRight.current.multiplyScalar(width * PROBE_FOV_SCALE);
            camUp.current.multiplyScalar(height * PROBE_FOV_SCALE);
            
            phys.uCamBasisX.value.copy(camRight.current);
            phys.uCamBasisY.value.copy(camUp.current);
            phys.uCamForward.value.copy(probeForward.current);
            
            // Unified Precision Sync
            engine.virtualSpace.updateShaderUniforms(
                camera.position,
                phys.uSceneOffsetHigh.value,
                phys.uSceneOffsetLow.value
            );
            
            phys.uCameraPosition.value.set(0,0,0);
            
            const originalTarget = gl.getRenderTarget();
            gl.setRenderTarget(engine.physicsRenderTarget);
            gl.clear();
            gl.render(engine.physicsScene, engine.physicsCamera);
            gl.readRenderTargetPixels(engine.physicsRenderTarget, 0, 0, 4, 4, pixelBuffer.current);
            gl.setRenderTarget(originalTarget);
            
            const hits: number[] = [];
            let minD = Infinity;
            let skyCount = 0;

            for(let i=0; i<pixelBuffer.current.length; i+=4) {
                const val = pixelBuffer.current[i];
                // Shader returns -1.0 for Sky/Miss
                if (val < -0.5) {
                    skyCount++;
                } else if (val > 0.0000000001 && Number.isFinite(val)) {
                    // Safety: Ensure we don't ingest Infinity or NaN
                    if (val < minD) minD = val;
                    hits.push(val);
                }
            }
            
            let avgD = 0;
            if (hits.length > 0) {
                hits.sort((a,b) => a - b);
                const sampleCount = Math.max(1, Math.floor(hits.length * 0.5));
                let sum = 0;
                for(let k=0; k<sampleCount; k++) sum += hits[k];
                avgD = sum / sampleCount;
            } else {
                avgD = distAverageRef.current > 0 ? distAverageRef.current : 10.0;
                minD = distMinRef.current < Infinity ? distMinRef.current : 10.0;
            }

            // Valid finite check for averages. If invalid, default to safe 10.0
            if (!Number.isFinite(avgD)) avgD = 10.0;
            if (!Number.isFinite(minD)) minD = 10.0;

            const epsilon = 1e-35;
            if (avgD < epsilon) avgD = epsilon;
            if (minD === Infinity || minD < epsilon) minD = epsilon;
            
            distAverageRef.current = avgD;
            distMinRef.current = minD;
            engine.lastMeasuredDistance = avgD;
            
            if (hudRefs.dist.current) {
                if (skyCount > 12) {
                    hudRefs.dist.current.innerText = "DST INF";
                    hudRefs.dist.current.style.color = '#888';
                } else {
                    hudRefs.dist.current.innerText = `DST ${avgD < 0.001 ? avgD.toExponential(2) : avgD.toFixed(4)}`;
                    hudRefs.dist.current.style.color = avgD < 1.0 ? '#ff4444' : '#00ffff';
                }
            }
            
            if (hudRefs.reset.current) {
                // Show reset if:
                // 1. Looking mostly at sky (>75% samples)
                // 2. Too far away (> 20.0 units)
                // 3. Too close (< 0.001 units)
                const isLostInSpace = skyCount > 12; 
                hudRefs.reset.current.style.display = (isLostInSpace || avgD > 20.0 || avgD < 0.001) ? 'block' : 'none';
            }

            if (hudRefs.speed.current) {
                hudRefs.speed.current.innerText = `SPD ${(speedRef.current * 100).toFixed(1)}%`;
            }
        }
    });

    return { distAverageRef, distMinRef };
};
