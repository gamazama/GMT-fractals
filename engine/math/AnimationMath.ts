
import { Keyframe, BezierHandle } from '../../types';
import { solveBezierY } from '../BezierMath';

/**
 * PURE MATH SERVICE
 * Responsible for all stateless calculation regarding curves, tangents, and interpolation.
 */

// Weight factor for smart tangents: 1/3 of the interval is standard for cubic bezier
const TANGENT_WEIGHT = 0.333;

export const AnimationMath = {
    /**
     * Calculates the interpolated value at a specific frame between two keyframes.
     */
    interpolate: (frame: number, k1: Keyframe, k2: Keyframe, isRotation: boolean = false): number => {
        if (k1.interpolation === 'Step') return k1.value;

        let v1 = k1.value;
        let v2 = k2.value;

        // Handle Rotation Wrapping (Shortest Path)
        if (isRotation) {
            const PI2 = Math.PI * 2;
            const diff = v2 - v1;
            if (diff > Math.PI) v2 -= PI2;
            else if (diff < -Math.PI) v2 += PI2;
        }

        if (k1.interpolation === 'Bezier') {
            const h1x = k1.rightTangent ? k1.rightTangent.x : (k2.frame - k1.frame) * TANGENT_WEIGHT;
            const h1y = k1.rightTangent ? k1.rightTangent.y : 0;
            const h2x = k2.leftTangent ? k2.leftTangent.x : -(k2.frame - k1.frame) * TANGENT_WEIGHT;
            const h2y = k2.leftTangent ? k2.leftTangent.y : 0;

            return solveBezierY(
                frame,
                k1.frame, v1, h1x, h1y,
                k2.frame, v2, h2x, h2y
            );
        }

        // Linear Fallback
        const duration = k2.frame - k1.frame;
        if (duration < 1e-9) return v1;
        const t = (frame - k1.frame) / duration;
        return v1 + (v2 - v1) * t;
    },

    /**
     * Scales Bezier handles when a keyframe's time changes to maintain curve shape.
     */
    scaleHandles: (key: Keyframe, prev: Keyframe | undefined, next: Keyframe | undefined, oldFrame: number, newFrame: number): Partial<Keyframe> => {
        const updates: Partial<Keyframe> = {};
        
        if (key.interpolation !== 'Bezier') return updates;

        // 1. Scale Left Handle (Incoming)
        if (prev && key.leftTangent) {
            const oldDist = oldFrame - prev.frame;
            const newDist = newFrame - prev.frame;
            if (Math.abs(oldDist) > 1e-5 && Math.abs(newDist) > 1e-5) {
                const ratio = newDist / oldDist;
                // Scale BOTH X and Y to preserve angle
                updates.leftTangent = {
                    x: key.leftTangent.x * ratio,
                    y: key.leftTangent.y * ratio
                };
            }
        }

        // 2. Scale Right Handle (Outgoing)
        if (next && key.rightTangent) {
            const oldDist = next.frame - oldFrame;
            const newDist = next.frame - newFrame;
            if (Math.abs(oldDist) > 1e-5 && Math.abs(newDist) > 1e-5) {
                const ratio = newDist / oldDist;
                // Scale BOTH X and Y to preserve angle
                updates.rightTangent = {
                    x: key.rightTangent.x * ratio,
                    y: key.rightTangent.y * ratio
                };
            }
        }

        return updates;
    },

    /**
     * Calculates auto-tangents for a keyframe based on its neighbors.
     * Supports 'Auto' (Smooth/Catmull-Rom) and 'Ease' (Flat) modes.
     */
    calculateTangents: (k: Keyframe, prev: Keyframe | undefined, next: Keyframe | undefined, mode: 'Auto' | 'Ease'): { l: BezierHandle, r: BezierHandle } => {
        if (mode === 'Ease') {
            const lx = prev ? (k.frame - prev.frame) * TANGENT_WEIGHT : 10;
            const rx = next ? (next.frame - k.frame) * TANGENT_WEIGHT : 10;
            return { l: {x: -lx, y: 0}, r: {x: rx, y: 0} };
        }
        
        // Edges
        if (!prev && !next) return { l: {x:-10,y:0}, r: {x:10,y:0} };
        
        if (!prev) {
            // Start: Point linearly towards next
            const m = (next!.value - k.value) / (next!.frame - k.frame);
            const rx = (next!.frame - k.frame) * TANGENT_WEIGHT;
            return { l: {x:-10, y:0}, r: {x: rx, y: rx * m} };
        }
        
        if (!next) {
            // End: Point linearly from prev
            const m = (k.value - prev!.value) / (k.frame - prev!.frame);
            const lx = (k.frame - prev!.frame) * TANGENT_WEIGHT;
            return { l: {x: -lx, y: -lx * m}, r: {x: 10, y: 0} };
        }

        // --- SMART WEIGHTED TANGENTS ---
        // Calculate slopes
        const dt1 = k.frame - prev.frame;
        const dv1 = k.value - prev.value;
        const m1 = dt1 === 0 ? 0 : dv1 / dt1;
        
        const dt2 = next.frame - k.frame;
        const dv2 = next.value - k.value;
        const m2 = dt2 === 0 ? 0 : dv2 / dt2;

        // Monotonicity Check: If slopes change direction (peak/valley), flatten tangents to prevent overshoot
        if (m1 * m2 <= 0) {
            const lx = dt1 * TANGENT_WEIGHT;
            const rx = dt2 * TANGENT_WEIGHT;
            return { l: {x: -lx, y: 0}, r: {x: rx, y: 0} };
        }
        
        // Weighted Average Slope (Catmull-Rom style but weighted by interval)
        const dtTotal = next.frame - prev.frame;
        const dvTotal = next.value - prev.value;
        let m = dtTotal === 0 ? 0 : dvTotal / dtTotal;
        
        // Overshoot Protection
        const limit = 3 * Math.min(Math.abs(m1), Math.abs(m2));
        if (Math.abs(m) > limit) {
            m = Math.sign(m) * limit;
        }
        
        // Calculate handles using weighted x-distances
        const lx = dt1 * TANGENT_WEIGHT;
        const rx = dt2 * TANGENT_WEIGHT;
        
        return { l: { x: -lx, y: -lx * m }, r: { x: rx, y: rx * m } };
    },

    /**
     * Enforces handle constraints (e.g., handles shouldn't cross neighbors).
     */
    constrainHandles: (key: Keyframe, prev: Keyframe | undefined, next: Keyframe | undefined): Partial<Keyframe> => {
        const updates: Partial<Keyframe> = {};
        
        if (key.leftTangent && prev) {
            const dist = key.frame - prev.frame;
            if (dist > 0.001) {
                 const maxLen = dist * TANGENT_WEIGHT;
                 // Constraint: Time (X) shouldn't exceed 1/3 of the interval
                 if (Math.abs(key.leftTangent.x) > maxLen) {
                     const scale = maxLen / Math.abs(key.leftTangent.x);
                     updates.leftTangent = {
                         x: key.leftTangent.x * scale,
                         y: key.leftTangent.y * scale
                     };
                 }
                 // Prevent handle crossing to future
                 if (key.leftTangent.x > 0) {
                     updates.leftTangent = { ...updates.leftTangent, x: 0 };
                 }
            }
        }
        
        if (key.rightTangent && next) {
            const dist = next.frame - key.frame;
            if (dist > 0.001) {
                const maxLen = dist * TANGENT_WEIGHT;
                if (Math.abs(key.rightTangent.x) > maxLen) {
                    const scale = maxLen / Math.abs(key.rightTangent.x);
                    updates.rightTangent = {
                        x: key.rightTangent.x * scale,
                        y: key.rightTangent.y * scale
                    };
                }
                 // Prevent handle crossing to past
                 if (key.rightTangent.x < 0) {
                     updates.rightTangent = { ...updates.rightTangent, x: 0 };
                 }
            }
        }
        
        return updates;
    },
    
    /**
     * Calculates Soft Selection falloff weight (0.0 to 1.0).
     */
    calculateSoftFalloff: (dist: number, radius: number, type: 'Linear' | 'Dome' | 'Pinpoint' | 'S-Curve'): number => {
        if (dist >= radius) return 0;
        const t = dist / radius; 
        
        switch(type) {
            case 'Linear': return 1 - t;
            case 'Dome': return Math.sqrt(1 - t * t);
            case 'Pinpoint': return Math.pow(1 - t, 4);
            case 'S-Curve': return 0.5 * (1 + Math.cos(t * Math.PI));
            default: return 1 - t;
        }
    }
};
