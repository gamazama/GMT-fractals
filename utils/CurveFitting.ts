
import { Keyframe } from '../types';
import { nanoid } from 'nanoid';

interface Point {
    t: number; // Absolute frame or normalized time depending on context
    val: number; // Value
}

// --- 1. Fast Bezier Evaluation ---
function evaluateBezier1D(t: number, p0: number, p1: number, p2: number, p3: number) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return (uuu * p0) + (3 * uu * t * p1) + (3 * u * tt * p2) + (ttt * p3);
}

// --- 2. Robust Evaluation & Resampling ---

// Evaluates the current curve at a specific frame (handling existing tangents)
function evaluateCurrentCurve(frame: number, sortedKeys: Keyframe[]): number {
    // Find segment
    let startK = sortedKeys[0];
    let endK = sortedKeys[sortedKeys.length - 1];

    for (let i = 0; i < sortedKeys.length - 1; i++) {
        if (frame >= sortedKeys[i].frame && frame < sortedKeys[i+1].frame) {
            startK = sortedKeys[i];
            endK = sortedKeys[i+1];
            break;
        }
    }
    
    // If frame is exactly on end (or beyond last key), clamp
    if (frame >= endK.frame) return endK.value;
    if (frame <= startK.frame) return startK.value;

    // Calculate t (0..1) for this segment
    const duration = endK.frame - startK.frame;
    const t = (frame - startK.frame) / duration;

    // Handle Interpolation Modes
    if (startK.interpolation === 'Step') return startK.value;
    if (startK.interpolation === 'Linear') return startK.value + (endK.value - startK.value) * t;

    // Bezier
    const p0 = startK.value;
    // Default handles to 0 (flat) if missing, though ideally they exist for Bezier
    const p1 = startK.value + (startK.rightTangent ? startK.rightTangent.y : 0);
    const p2 = endK.value + (endK.leftTangent ? endK.leftTangent.y : 0);
    const p3 = endK.value;

    return evaluateBezier1D(t, p0, p1, p2, p3);
}

// Generates a dense list of points from the current curve
function getResampledPoints(sortedKeys: Keyframe[], step: number = 1): Point[] {
    const points: Point[] = [];
    const startFrame = sortedKeys[0].frame;
    const endFrame = sortedKeys[sortedKeys.length - 1].frame;

    // Ensure at least some samples even for very short clips
    const actualStep = Math.max(step, (endFrame - startFrame) / 50);

    for (let f = startFrame; f <= endFrame; f += actualStep) {
        points.push({
            t: f, // We use absolute frame here, normalized later per segment
            val: evaluateCurrentCurve(f, sortedKeys)
        });
    }
    // Ensure the very last point is included
    if (points.length > 0 && points[points.length-1].t < endFrame) {
        points.push({ t: endFrame, val: evaluateCurrentCurve(endFrame, sortedKeys) });
    }

    return points;
}

// --- 3. Analytic Least Squares Solver (with Safety) ---
function solveLeastSquaresHandles(points: Point[], p0: number, p3: number): { h1: number, h2: number } | null {
    let C11 = 0, C12 = 0, C22 = 0; 
    let R1 = 0, R2 = 0;           

    // Safety Check: Variance detection
    let sumVal = 0;
    let sumValSq = 0;
    
    for (let i = 0; i < points.length; i++) {
        const t = points[i].t;
        const u = 1 - t;
        const val = points[i].val;
        
        sumVal += val;
        sumValSq += val * val;

        // Basis functions (derivatives of Bezier with respect to P1 and P2)
        // B(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t)t^2 P2 + t^3 P3
        // We want to find P1 and P2.
        // Coeff for P1: 3 * (1-t)^2 * t
        // Coeff for P2: 3 * (1-t) * t^2
        
        const b1 = 3 * u * u * t;
        const b2 = 3 * u * t * t;
        const fixedTerm = (u * u * u * p0) + (t * t * t * p3);
        const target = val - fixedTerm;

        C11 += b1 * b1;
        C12 += b1 * b2;
        C22 += b2 * b2;
        R1 += target * b1;
        R2 += target * b2;
    }

    // Check variance: if variance is extremely low, treat as linear
    const n = points.length;
    const mean = sumVal / n;
    const variance = (sumValSq / n) - (mean * mean);
    
    // Threshold depends on value range, but generally if variance is tiny, don't curve.
    if (variance < 1e-9) {
        return null; // Signal to use Linear Handles
    }

    // Solve 2x2
    const det = C11 * C22 - C12 * C12;

    // If determinant is near zero (singular matrix), return linear handles
    if (Math.abs(det) < 1e-9) {
        return null; 
    }

    const h1 = (C22 * R1 - C12 * R2) / det;
    const h2 = (C11 * R2 - C12 * R1) / det;

    return { h1, h2 };
}

// --- 4. Segment Fitting ---
function fitSegment(
    segmentPoints: Point[], // These are now resampled points with normalized t [0..1]
    fitStrength: number
): { leftY: number, rightY: number } {
    const n = segmentPoints.length;
    if (n < 2) {
        const v = segmentPoints[0].val;
        return { leftY: v, rightY: v };
    }

    const startVal = segmentPoints[0].val;
    const endVal = segmentPoints[n - 1].val;

    // 1. Calculate Linear Handles (The Safe Default)
    // Bezier control points for a straight line are at 1/3 and 2/3 of value diff
    const diff = endVal - startVal;
    const linearH1 = startVal + diff * 0.333;
    const linearH2 = startVal + diff * 0.666;

    // 2. Calculate Best-Fit Handles (The Tight Fit)
    const lsResult = solveLeastSquaresHandles(segmentPoints, startVal, endVal);
    
    let lsH1 = linearH1;
    let lsH2 = linearH2;

    if (lsResult) {
        lsH1 = lsResult.h1;
        lsH2 = lsResult.h2;
    }

    // 3. Blend
    const finalH1 = linearH1 + (lsH1 - linearH1) * fitStrength;
    const finalH2 = linearH2 + (lsH2 - linearH2) * fitStrength;

    return { leftY: finalH1, rightY: finalH2 };
}

// --- 5. Recursive Simplification ---
function simplifyRecursive(
    points: Point[], // Resampled dense points (t is absolute frame)
    resultKeys: Keyframe[],
    errorThreshold: number,
    fitStrength: number
) {
    if (points.length < 2) return;

    const startPt = points[0];
    const endPt = points[points.length - 1];
    const duration = endPt.t - startPt.t;
    
    // Prepare normalized points for solver
    const normPoints = points.map(p => ({
        t: (p.t - startPt.t) / duration,
        val: p.val
    }));

    // Try fit
    const { leftY, rightY } = fitSegment(normPoints, fitStrength);
    
    // Calculate Max Deviation
    let maxDev = 0;
    let splitIndex = -1;
    
    // Optimization: If segment is very small, just accept it
    if (duration < 1.0) {
        maxDev = 0;
    } else {
        for (let i = 1; i < normPoints.length - 1; i++) {
            const t = normPoints[i].t;
            const est = evaluateBezier1D(t, startPt.val, leftY, rightY, endPt.val);
            const dev = Math.abs(est - normPoints[i].val);
            
            if (dev > maxDev) {
                maxDev = dev;
                splitIndex = i;
            }
        }
    }

    if (maxDev <= errorThreshold || points.length <= 2) {
        // Accepted
        
        const prevKey = resultKeys[resultKeys.length - 1];
        
        // Update previous key's right tangent
        // Handles are relative: x is time delta, y is value delta
        if (prevKey) {
            prevKey.rightTangent = { x: duration * 0.333, y: leftY - startPt.val };
        }

        const newKey: Keyframe = {
            id: nanoid(),
            frame: endPt.t,
            value: endPt.val,
            interpolation: 'Bezier',
            brokenTangents: false,
            autoTangent: false,
            leftTangent: { x: -duration * 0.333, y: rightY - endPt.val },
            rightTangent: { x: 1, y: 0 } // Placeholder
        };
        resultKeys.push(newKey);
    } else {
        // Split
        const leftPts = points.slice(0, splitIndex + 1);
        const rightPts = points.slice(splitIndex);
        
        simplifyRecursive(leftPts, resultKeys, errorThreshold, fitStrength);
        simplifyRecursive(rightPts, resultKeys, errorThreshold, fitStrength);
    }
}

// --- 6. Public API ---
export const simplifyTrack = (
    originalKeys: Keyframe[], 
    errorThreshold: number,
    fitStrength: number = 1.0
): Keyframe[] => {
    if (originalKeys.length < 2) return originalKeys;
    fitStrength = Math.max(0, Math.min(1, fitStrength));

    // 1. Sort
    const sorted = [...originalKeys].sort((a, b) => a.frame - b.frame);
    
    // 2. RESAMPLE
    // Convert sparse curve to dense point cloud
    const densePoints = getResampledPoints(sorted, 1.0); // Sample every 1 frame

    const finalKeys: Keyframe[] = [];

    // Push Start Key
    const firstP = densePoints[0];
    finalKeys.push({
        id: nanoid(),
        frame: firstP.t,
        value: firstP.val,
        interpolation: 'Bezier',
        brokenTangents: false,
        autoTangent: false,
        leftTangent: { x: -1, y: 0 },
        rightTangent: { x: 1, y: 0 }
    });

    // 3. Recurse
    simplifyRecursive(densePoints, finalKeys, errorThreshold, fitStrength);

    // 4. Fix Boundaries
    if (finalKeys.length > 0) {
        finalKeys[0].leftTangent = { x: -1, y: 0 }; 
        finalKeys[finalKeys.length - 1].rightTangent = { x: 1, y: 0 };
    }

    return finalKeys;
};
