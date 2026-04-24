
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();
import { useEngineStore as useFractalStore } from '../../store/engineStore';
import { MAX_SKY_DISTANCE } from '../../data/constants';

/** Format a distance value for the HUD */
const formatDist = (d: number) => d < 0.001 ? d.toExponential(2) : d.toFixed(4);

export const usePhysicsProbe = (
    hudRefs: {
        dist: React.RefObject<HTMLSpanElement | null>,
        speed: React.RefObject<HTMLSpanElement | null>,
        reset: React.RefObject<HTMLButtonElement | null>
    },
    speedRef: React.MutableRefObject<number>
) => {
    const qualityState = useFractalStore(s => s.quality);

    const distAverageRef = useRef(1.0);
    const hasValidMeasurement = useRef(false);
    const frameCount = useRef(0);
    const readBuffer = useRef(new Float32Array(4));

    const updateSpeedHud = () => {
        if (hudRefs.speed.current && frameCount.current % 10 === 0) {
            hudRefs.speed.current.innerText = `SPD ${(speedRef.current * 100).toFixed(1)}%`;
        }
    };

    const updateDistHud = (dist: number, label?: string, color?: string) => {
        if (hudRefs.dist.current) {
            hudRefs.dist.current.innerText = `DST ${formatDist(dist)}${label ? ` ${label}` : ''}`;
            hudRefs.dist.current.style.color = color ?? (dist < 1.0 ? '#ff4444' : '#00ffff');
        }
    };

    const updateResetButton = (dist: number) => {
        if (hudRefs.reset.current) {
            hudRefs.reset.current.style.display = (dist > MAX_SKY_DISTANCE || dist < 0.001) ? 'block' : 'none';
        }
    };

    const processDepthData = (depthValue: number) => {
        // Sky or invalid — keep last valid measurement, default to 1.0 if none
        if (depthValue < 0 || depthValue >= MAX_SKY_DISTANCE || !Number.isFinite(depthValue)) {
            if (!hasValidMeasurement.current) {
                distAverageRef.current = 1.0;
                engine.lastMeasuredDistance = 1.0;
            } else {
                // Floor retained distance so we can always move when pointing at sky
                distAverageRef.current = Math.max(distAverageRef.current, 1e-4);
                engine.lastMeasuredDistance = distAverageRef.current;
            }
            updateDistHud(distAverageRef.current, '(sky)', '#888');
            if (hudRefs.reset.current) hudRefs.reset.current.style.display = 'block';
            return;
        }

        hasValidMeasurement.current = true;

        // Asymmetric smoothing: slow ramp-up prevents speed explosion, instant decrease for safety
        const prev = distAverageRef.current;
        let smoothed = depthValue;
        if (prev > 0 && depthValue > prev * 1.5) {
            // Large increase — blend at ~8% per frame (~60 frames to converge)
            smoothed = prev + (depthValue - prev) * 0.08;
        }
        // Decrease: instant snap — no lag so speed drops immediately when approaching surfaces

        distAverageRef.current = smoothed;
        engine.lastMeasuredDistance = smoothed;

        updateDistHud(smoothed);
        updateResetButton(smoothed);
    };

    useFrame(() => {
        frameCount.current++;

        // Skip during initial shader compilation — need compiled shader + buffer settle time
        if (!engine.hasCompiledShader || frameCount.current < 15) {
            if (frameCount.current % 10 === 0) {
                updateDistHud(distAverageRef.current);
                updateSpeedHud();
            }
            return;
        }

        if (!qualityState) return;
        const probeMode = qualityState.physicsProbeMode ?? 0;

        // MODE 2: Manual distance
        if (probeMode === 2) {
            const manualDistance = qualityState.manualDistance;
            distAverageRef.current = manualDistance;
            engine.lastMeasuredDistance = manualDistance;
            updateDistHud(manualDistance);
            updateResetButton(manualDistance);
            updateSpeedHud();
            return;
        }

        // MODE 0 & 1: Read from depth buffer (previous frame — no stall)
        const renderer = engine.renderer;

        // Worker mode: depth readback happens in worker, shadow state carries lastMeasuredDistance
        if (!renderer) {
            const shadowDist = engine.lastMeasuredDistance;
            if (shadowDist !== distAverageRef.current) {
                processDepthData(shadowDist);
                // Focus Lock: sync dofFocus when distance changes meaningfully (>1%)
                const smoothedDist = distAverageRef.current;
                const store = useFractalStore.getState();
                if (store.focusLock && smoothedDist > 0 && smoothedDist < MAX_SKY_DISTANCE) {
                    const currentFocus = (store as any).optics?.dofFocus ?? 0;
                    const relChange = Math.abs(smoothedDist - currentFocus) / Math.max(currentFocus, 0.0001);
                    if (relChange > 0.01) {
                        (store as any).setOptics({ dofFocus: smoothedDist });
                    }
                }
            }
            updateSpeedHud();
            return;
        }

        // Direct mode: read from previous frame's render target
        const renderTarget = engine.pipeline?.getPreviousRenderTarget?.();
        if (!renderTarget || renderTarget.width <= 0 || renderTarget.height <= 0) {
            if (frameCount.current % 10 === 0) {
                updateDistHud(distAverageRef.current);
                updateSpeedHud();
            }
            return;
        }

        // Sample 3x3 neighborhood around center pixel to reduce DOF noise
        const { width, height } = renderTarget;
        try {
            const centerX = Math.floor(width / 2);
            const centerY = Math.floor(height / 2);
            let validDepthSum = 0;
            let validCount = 0;

            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const sx = centerX + dx;
                    const sy = centerY + dy;
                    if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;

                    const success = engine.pipeline?.readPixels?.(renderer, sx, sy, 1, 1, readBuffer.current);
                    if (success) {
                        const depth = readBuffer.current[3];
                        if (depth > 0 && depth < MAX_SKY_DISTANCE && Number.isFinite(depth)) {
                            validDepthSum += depth;
                            validCount++;
                        }
                    }
                }
            }

            processDepthData(validCount > 0 ? validDepthSum / validCount : Infinity);
        } catch (e) {
            console.warn('Depth readback failed:', e);
        }

        updateSpeedHud();
    });

    return { distAverageRef };
};
