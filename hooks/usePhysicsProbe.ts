
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
    const shaderCompiledRef = useRef(false);
    
    // Depth buffer readback state - reuse buffer to avoid per-frame allocation
    const depthBuffer = useRef<Float32Array | null>(null);
    const readBuffer = useRef(new Float32Array(4));

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
        
        // Skip physics probe during initial shader compilation
        // Wait for engine to indicate shader is compiled AND for several frames to pass
        // to ensure shader is fully compiled and buffer is ready
        if (!engine.hasCompiledShader || frameCount.current < 15) {
            // Just use cached distance during initial compilation
            if (hudRefs.dist.current && frameCount.current % 10 === 0) {
                hudRefs.dist.current.innerText = `DST ${distAverageRef.current.toFixed(4)}`;
            }
            if (hudRefs.speed.current && frameCount.current % 10 === 0) {
                hudRefs.speed.current.innerText = `SPD ${(speedRef.current * 100).toFixed(1)}%`;
            }
            return;
        }
        
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
        
        // Get the previous frame's render target dimensions
        const renderTarget = engine.pipeline.getPreviousRenderTarget?.();
        if (!renderTarget) {
            // Render target not ready yet - use cached distance
            if (hudRefs.dist.current && frameCount.current % 10 === 0) {
                hudRefs.dist.current.innerText = `DST ${distAverageRef.current.toFixed(4)}`;
            }
            if (hudRefs.speed.current && frameCount.current % 10 === 0) {
                hudRefs.speed.current.innerText = `SPD ${(speedRef.current * 100).toFixed(1)}%`;
            }
            return;
        }
        
        // Check if render target has valid dimensions
        const width = renderTarget.width || 1;
        const height = renderTarget.height || 1;
        if (width <= 0 || height <= 0) {
            if (hudRefs.dist.current && frameCount.current % 10 === 0) {
                hudRefs.dist.current.innerText = `DST ${distAverageRef.current.toFixed(4)}`;
            }
            if (hudRefs.speed.current && frameCount.current % 10 === 0) {
                hudRefs.speed.current.innerText = `SPD ${(speedRef.current * 100).toFixed(1)}%`;
            }
            return;
        }
        
        // Read center 4x4 pixels from depth render target
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        
        // Allocate buffer if needed (4x4 = 16 pixels, RGBA = 64 floats)
        if (!depthBuffer.current || depthBuffer.current.length !== 64) {
            depthBuffer.current = new Float32Array(64);
        }
        
        // Read the center pixel from the previous frame's render target
        // Depth is stored in the alpha channel of every pixel
        // Note: This reads from the PREVIOUS frame's buffer, so no GPU stall
        try {
            const centerX = Math.floor(width / 2);
            const centerY = Math.floor(height / 2);
            
            const success = engine.pipeline.readPixels?.(
                renderer,
                centerX, centerY, 1, 1,  // Center pixel
                readBuffer.current
            );
            
            if (success) {
                const depth = readBuffer.current[3]; // Depth is in alpha channel
                if (depth > 0 && depth < 1000 && Number.isFinite(depth)) {
                    processDepthData(depth);
                }
            }
        } catch (e) {
            // Depth readback failed, use cached value
            console.warn('Depth readback failed:', e);
        }
        
        if (hudRefs.speed.current && frameCount.current % 10 === 0) {
            hudRefs.speed.current.innerText = `SPD ${(speedRef.current * 100).toFixed(1)}%`;
        }
    });

    return { distAverageRef, distMinRef };
};
