
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { engine } from '../../engine/FractalEngine';
import { Uniforms } from '../../engine/UniformNames';
import { sonificationEngine } from './SonificationEngine';
import { useFractalStore } from '../../store/fractalStore';

// Scan Resolution: Width x 3 Rows
const PROBE_WIDTH = 256;
const PROBE_HEIGHT = 3;

// Low-Prime Quantization Bins
const BIN_COUNTS = [9, 19, 15]; // Arm 1, 2, 3

export const FHBTProbe: React.FC = () => {
    // We access the specific Sonification slice
    const sonification = useFractalStore(s => (s as any).sonification);
    // We need the action to update lastDimension
    const setSonification = (useFractalStore.getState() as any).setSonification;
    
    const resources = useRef<{
        scene: THREE.Scene;
        camera: THREE.OrthographicCamera;
        renderTarget: THREE.WebGLRenderTarget;
        pixelBuffer: Float32Array;
        mesh: THREE.Mesh;
        scratchMatrix: THREE.Matrix4;
        camRight: THREE.Vector3;
        camUp: THREE.Vector3;
        camForward: THREE.Vector3;
    } | null>(null);
    
    // Setup Resources
    useEffect(() => {
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const renderTarget = new THREE.WebGLRenderTarget(PROBE_WIDTH, PROBE_HEIGHT, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType, 
        });
        
        const pixelBuffer = new Float32Array(PROBE_WIDTH * PROBE_HEIGHT * 4);
        
        // Use the shared physics material directly.
        // This ensures we always have the latest shader code and all global uniforms (Hybrid, etc)
        // are automatically synced by MaterialController.
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), engine.physicsMaterial);
        mesh.frustumCulled = false;
        scene.add(mesh);

        resources.current = { 
            scene, camera, renderTarget, pixelBuffer, mesh,
            scratchMatrix: new THREE.Matrix4(),
            camRight: new THREE.Vector3(),
            camUp: new THREE.Vector3(),
            camForward: new THREE.Vector3()
        };

        return () => {
            renderTarget.dispose();
            // Do NOT dispose engine.physicsMaterial
        };
    }, []); 

    useEffect(() => {
        if (!sonification?.active || !sonification?.isEnabled) {
             sonificationEngine.stop();
             return;
        }

        let frameId = 0;
        let frameCount = 0;

        const loop = () => {
            if (!resources.current || !engine.renderer || !engine.activeCamera) {
                frameId = requestAnimationFrame(loop);
                return;
            }
            
            // Update audio even if we don't render visuals this frame, 
            // but for data scraping we limit to 30fps
            frameCount++;
            if (frameCount % 2 !== 0) {
                 frameId = requestAnimationFrame(loop);
                 return;
            }

            const { scene, camera, renderTarget, pixelBuffer, scratchMatrix, camRight, camUp, camForward } = resources.current;
            const gl = engine.renderer;
            const activeCam = engine.activeCamera as THREE.PerspectiveCamera;
            
            // Ensure mesh is using the latest material (in case it was hot-swapped by engine)
            if (resources.current.mesh.material !== engine.physicsMaterial) {
                resources.current.mesh.material = engine.physicsMaterial;
            }

            // 1. Setup "Focused" Camera
            // We override the Camera Uniforms specifically for this render pass.
            // Since JS is single-threaded, this won't conflict with the main render or other probes
            // as long as they also set their needs before rendering.
            
            const scanScale = sonification.scanArea || 0.1;
            
            scratchMatrix.makeRotationFromQuaternion(activeCam.quaternion);
            const e = scratchMatrix.elements;
            camRight.set(e[0], e[1], e[2]);
            camUp.set(e[4], e[5], e[6]);
            camForward.set(-e[8], -e[9], -e[10]);

            const tanFov = Math.tan(THREE.MathUtils.degToRad(activeCam.fov) * 0.5);
            // Apply Scan Area scaling here
            camRight.multiplyScalar(tanFov * activeCam.aspect * scanScale);
            camUp.multiplyScalar(tanFov * scanScale);

            const physU = engine.physicsMaterial.uniforms;

            // Sync Time (Physics shader needs time for moving objects/waves)
            if (physU.uTime) physU.uTime.value = performance.now() / 1000;

            physU[Uniforms.CamBasisX].value.copy(camRight);
            physU[Uniforms.CamBasisY].value.copy(camUp);
            physU[Uniforms.CamForward].value.copy(camForward);
            
            // Precision Offset
            engine.virtualSpace.updateShaderUniforms(
                activeCam.position,
                physU[Uniforms.SceneOffsetHigh].value,
                physU[Uniforms.SceneOffsetLow].value
            );
            physU[Uniforms.CameraPosition].value.set(0,0,0);
            
            // Render
            const originalTarget = gl.getRenderTarget();
            gl.setRenderTarget(renderTarget);
            gl.clear();
            gl.render(scene, camera);
            
            // Read
            gl.readRenderTargetPixels(renderTarget, 0, 0, PROBE_WIDTH, PROBE_HEIGHT, pixelBuffer);
            gl.setRenderTarget(originalTarget);
            
            // Analyze
            const width = PROBE_WIDTH;
            const patterns: number[][] = [[], [], []];
            const fillRates: number[] = [0, 0, 0];

            // FHBT Hit Logic:
            // pixel.r = Distance (> 0.0001 means hit geometry)
            // pixel.g = Trap Value (Negative means Interior/Lake/Void)
            // We only count it as "Filled" if it Hit Geometry AND is not Interior.
            const isHit = (offset: number) => {
                const dist = pixelBuffer[offset];
                const trap = pixelBuffer[offset + 1];
                return (dist > 0.0001) && (trap >= 0.0);
            };

            // Process each arm with its specific bin count
            for (let arm = 0; arm < 3; arm++) {
                const rowOffset = arm * width * 4;
                const binCount = BIN_COUNTS[arm];
                const pixelsPerBin = Math.floor(width / binCount);
                
                let totalHits = 0;

                for (let b = 0; b < binCount; b++) {
                    // Average density in this bin
                    let binHits = 0;
                    const startX = b * pixelsPerBin;
                    const endX = startX + pixelsPerBin;
                    
                    for (let x = startX; x < endX; x++) {
                        if (isHit(rowOffset + x * 4)) {
                            binHits++;
                            totalHits++;
                        }
                    }
                    
                    const density = binHits / pixelsPerBin;
                    // Quantize: If significant density, mark as 1
                    patterns[arm].push(density > 0.5 ? 1 : 0);
                }
                
                fillRates[arm] = totalHits / width;
            }
            
            // Calculate Fractal Dimension (D)
            const safeR1 = Math.max(0.001, fillRates[0]);
            const safeR2 = Math.max(0.001, fillRates[1]);
            const safeR3 = Math.max(0.001, fillRates[2]);
            
            // FHBT Formula: D = 2^(GeometricMean(FillRates))
            const geometricMean = Math.cbrt(safeR1 * safeR2 * safeR3);
            const D = Math.pow(2.0, geometricMean);
            
            // Update Audio Engine with D (Pitch) and Patterns (Rhythm)
            sonificationEngine.resume();
            sonificationEngine.setMasterGain(sonification.masterGain);
            sonificationEngine.update(D, sonification.baseFrequency, patterns);
            
            // Update UI State (Throttled: only every 20th analysis frame)
            // 30fps render * 1/20 = 1.5 updates per sec
            if (frameCount % 20 === 0 && setSonification) {
                setSonification({ lastDimension: D });
            }
            
            frameId = requestAnimationFrame(loop);
        };
        
        loop();
        
        return () => {
            cancelAnimationFrame(frameId);
            sonificationEngine.stop();
        };

    }, [
        sonification?.active, 
        sonification?.isEnabled, 
        sonification?.baseFrequency, 
        sonification?.masterGain,
        sonification?.scanArea
    ]);

    return null;
};
