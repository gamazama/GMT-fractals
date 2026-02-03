
import React, { useRef, useEffect } from 'react';
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
    const { camera } = useThree();
    
    // Physics State
    const distAverageRef = useRef(10.0);
    const distMinRef = useRef(10.0);
    
    // Internals
    const frameCount = useRef(0);
    const scratchMatrix = useRef(new THREE.Matrix4());
    const camRight = useRef(new THREE.Vector3());
    const camUp = useRef(new THREE.Vector3());
    const probeForward = useRef(new THREE.Vector3());
    
    // PBO Async Readback State
    const pboRef = useRef<WebGLBuffer | null>(null);
    const asyncReading = useRef(false);

    // Init PBO
    useEffect(() => {
        // Use ENGINE renderer, not R3F gl, because Physics Target is on Engine Context
        const renderer = engine.renderer;
        if (!renderer) return;
        
        const glContext = renderer.getContext();
        // WebGL 2 Check
        if (glContext instanceof WebGL2RenderingContext) {
            const pbo = glContext.createBuffer();
            glContext.bindBuffer(glContext.PIXEL_PACK_BUFFER, pbo);
            // 4x4 float pixels = 16 pixels * 4 components * 4 bytes = 256 bytes
            glContext.bufferData(glContext.PIXEL_PACK_BUFFER, 4 * 4 * 4 * 4, glContext.STREAM_READ);
            glContext.bindBuffer(glContext.PIXEL_PACK_BUFFER, null);
            pboRef.current = pbo;
        }

        return () => {
            if (pboRef.current) {
                // Ensure we delete on the correct context
                const ctx = engine.renderer?.getContext();
                if (ctx instanceof WebGL2RenderingContext) {
                    ctx.deleteBuffer(pboRef.current);
                }
            }
        };
    }, []); // Run once on mount

    const processPixelData = (pixelBuffer: Float32Array) => {
        let skyCount = 0;
        let minD = Infinity;
        const hits: number[] = [];

        for(let i=0; i<pixelBuffer.length; i+=4) {
            const val = pixelBuffer[i];
            if (val < -0.5) {
                skyCount++;
            } else if (val > 0.0000000001 && Number.isFinite(val)) {
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

        if (!Number.isFinite(avgD)) avgD = 10.0;
        if (!Number.isFinite(minD)) minD = 10.0;
        const epsilon = 1e-35;
        if (avgD < epsilon) avgD = epsilon;
        if (minD === Infinity || minD < epsilon) minD = epsilon;
        
        distAverageRef.current = avgD;
        distMinRef.current = minD;
        engine.lastMeasuredDistance = avgD;
        
        // UI Updates
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
            const isLostInSpace = skyCount > 12; 
            hudRefs.reset.current.style.display = (isLostInSpace || avgD > 20.0 || avgD < 0.001) ? 'block' : 'none';
        }
    };

    useFrame((state) => {
        frameCount.current++;
        
        // Update Frequency: Every 3 frames
        if (frameCount.current % 3 !== 0) {
            if (hudRefs.speed.current && frameCount.current % 10 === 0) {
                 hudRefs.speed.current.innerText = `SPD ${(speedRef.current * 100).toFixed(1)}%`;
            }
            return;
        }

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
        
        engine.virtualSpace.updateShaderUniforms(
            camera.position,
            phys.uSceneOffsetHigh.value,
            phys.uSceneOffsetLow.value
        );
        phys.uCameraPosition.value.set(0,0,0);
        
        // Render using Engine's Renderer (Not R3F's gl)
        const renderer = engine.renderer;
        if (!renderer) return;

        const originalTarget = renderer.getRenderTarget();
        renderer.setRenderTarget(engine.physicsRenderTarget);
        renderer.clear();
        renderer.render(engine.physicsScene, engine.physicsCamera);

        const glContext = renderer.getContext();
        
        // --- ASYNC READBACK (WebGL 2 PBO) ---
        if (pboRef.current && glContext instanceof WebGL2RenderingContext) {
            // If previous read is pending, try to get result
            if (asyncReading.current) {
                glContext.bindBuffer(glContext.PIXEL_PACK_BUFFER, pboRef.current);
                const buffer = new Float32Array(16 * 4); // 4x4 RGBA
                
                // getBufferSubData is non-blocking if the fence is signaled (implicitly handled by driver usually)
                glContext.getBufferSubData(glContext.PIXEL_PACK_BUFFER, 0, buffer);
                glContext.bindBuffer(glContext.PIXEL_PACK_BUFFER, null);
                
                processPixelData(buffer);
                asyncReading.current = false;
            }

            // Initiate new read
            glContext.bindBuffer(glContext.PIXEL_PACK_BUFFER, pboRef.current);
            glContext.readPixels(0, 0, 4, 4, glContext.RGBA, glContext.FLOAT, 0);
            glContext.bindBuffer(glContext.PIXEL_PACK_BUFFER, null);
            asyncReading.current = true;
        } else {
            // Fallback: Sync Read (WebGL 1)
            const pixelBuffer = new Float32Array(64);
            renderer.readRenderTargetPixels(engine.physicsRenderTarget, 0, 0, 4, 4, pixelBuffer);
            processPixelData(pixelBuffer);
        }

        renderer.setRenderTarget(originalTarget);
    });

    return { distAverageRef, distMinRef };
};
