
import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { engine } from '../engine/FractalEngine';
import { useFractalStore } from '../store/fractalStore';

export const usePhysicsProbe = (
    hudRefs: { 
        dist: React.RefObject<HTMLSpanElement | null>,
        speed: React.RefObject<HTMLSpanElement | null>,
        reset: React.RefObject<HTMLButtonElement | null>
    },
    speedRef: React.MutableRefObject<number>
) => {
    const { camera } = useThree();
    const qualityState = useFractalStore(s => s.quality);
    
    // Physics State
    const distAverageRef = useRef(10.0);
    const distMinRef = useRef(10.0);
    
    // Internals
    const frameCount = useRef(0);
    
    // Depth buffer readback state
    const depthBuffer = useRef<Float32Array | null>(null);

    const processDepthData = (depthValue: number) => {
        // Check for valid depth (not sky, not invalid)
        if (depthValue < 0 || depthValue > 1000 || !Number.isFinite(depthValue)) {
            // Sky or invalid - use cached distance
            const cachedDist = distAverageRef.current > 0 ? distAverageRef.current : 10.0;
            
            if (hudRefs.dist.current) {
                hudRefs.dist.current.innerText = "DST INF";
                hudRefs.dist.current.style.color = '#888';
            }
            if (hudRefs.reset.current) {
                hudRefs.reset.current.style.display = 'block';
            }
            return;
        }
        
        // Valid depth
        distAverageRef.current = depthValue;
        distMinRef.current = depthValue;
        engine.lastMeasuredDistance = depthValue;
        
        if (hudRefs.dist.current) {
            hudRefs.dist.current.innerText = `DST ${depthValue < 0.001 ? depthValue.toExponential(2) : depthValue.toFixed(4)}`;
            hudRefs.dist.current.style.color = depthValue < 1.0 ? '#ff4444' : '#00ffff';
        }
        if (hudRefs.reset.current) {
            const isLostInSpace = depthValue > 100.0 || depthValue < 0.001;
            hudRefs.reset.current.style.display = isLostInSpace ? 'block' : 'none';
        }
    };

    useFrame((state) => {
        frameCount.current++;
        
        // Get physics probe mode (0=GPU, 1=CPU, 2=Manual)
        // Default to GPU (0) which now reads from depth buffer
        const probeMode = qualityState.physicsProbeMode ?? 0;
        
        // MODE 2: Manual Distance - no calculation needed
        if (probeMode === 2) {
            const manualDistance = qualityState.manualDistance;
            distAverageRef.current = manualDistance;
            distMinRef.current = manualDistance;
            engine.lastMeasuredDistance = manualDistance;
            
            if (hudRefs.dist.current) {
                hudRefs.dist.current.innerText = `DST ${manualDistance < 0.001 ? manualDistance.toExponential(2) : manualDistance.toFixed(4)}`;
                hudRefs.dist.current.style.color = manualDistance < 1.0 ? '#ff4444' : '#00ffff';
            }
            if (hudRefs.reset.current) {
                const isLostInSpace = manualDistance > 100.0 || manualDistance < 0.001;
                hudRefs.reset.current.style.display = isLostInSpace ? 'block' : 'none';
            }
            
            if (hudRefs.speed.current && frameCount.current % 10 === 0) {
                 hudRefs.speed.current.innerText = `SPD ${(speedRef.current * 100).toFixed(1)}%`;
            }
            return;
        }
        
        // MODE 0 & 1: Read from depth buffer (previous frame - no stall)
        // The depth buffer is written during the main render pass (MRT location 1)
        // We read from the PREVIOUS frame's buffer which is already complete
        
        const renderer = engine.renderer;
        if (!renderer) return;
        
        // Get the previous frame's depth render target dimensions
        const depthTarget = engine.pipeline.getPreviousDepthTarget?.();
        if (!depthTarget) {
            // Depth buffer not ready yet - use cached distance
            if (hudRefs.dist.current && frameCount.current % 10 === 0) {
                hudRefs.dist.current.innerText = `DST ${distAverageRef.current.toFixed(4)}`;
            }
            if (hudRefs.speed.current && frameCount.current % 10 === 0) {
                hudRefs.speed.current.innerText = `SPD ${(speedRef.current * 100).toFixed(1)}%`;
            }
            return;
        }
        
        // Read center 4x4 pixels from depth render target
        const width = depthTarget.width || 1;
        const height = depthTarget.height || 1;
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        
        // Allocate buffer if needed (4x4 = 16 pixels, RGBA = 64 floats)
        if (!depthBuffer.current || depthBuffer.current.length !== 64) {
            depthBuffer.current = new Float32Array(64);
        }
        
        // Read from the depth render target using custom WebGL2 method
        // This reads from COLOR_ATTACHMENT1 (depth texture in MRT)
        // Note: This reads from the PREVIOUS frame's buffer, so no GPU stall
        try {
            const success = engine.pipeline.readDepthPixels?.(
                renderer,
                centerX - 2, centerY - 2, 4, 4,
                depthBuffer.current
            );
            
            if (success) {
                // Average the valid depth values (depth is in .r component, so every 4th value)
                let sum = 0;
                let count = 0;
                for (let i = 0; i < 64; i += 4) {
                    const d = depthBuffer.current[i]; // .r component
                    if (d > 0 && d < 1000 && Number.isFinite(d)) {
                        sum += d;
                        count++;
                    }
                }
                
                if (count > 0) {
                    const avgDepth = sum / count;
                    processDepthData(avgDepth);
                }
            }
        } catch (e) {
            // Depth target not ready, use cached
        }
        
        if (hudRefs.speed.current && frameCount.current % 10 === 0) {
            hudRefs.speed.current.innerText = `SPD ${(speedRef.current * 100).toFixed(1)}%`;
        }
        
        if (hudRefs.speed.current && frameCount.current % 10 === 0) {
            hudRefs.speed.current.innerText = `SPD ${(speedRef.current * 100).toFixed(1)}%`;
        }
    });

    return { distAverageRef, distMinRef };
};
