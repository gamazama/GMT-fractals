
import { AnimationSequence } from '../types';

/**
 * Thomas Algorithm (TDMA) for solving tridiagonal linear systems Ax = d
 * @param n System size
 * @param a Lower diagonal (a[0] is ignored/unused)
 * @param b Main diagonal
 * @param c Upper diagonal (c[n-1] is ignored/unused)
 * @param d Right hand side vector
 * @returns Solution vector x
 */
function solveTridiagonal(n: number, a: Float64Array, b: Float64Array, c: Float64Array, d: Float64Array): Float64Array {
    const x = new Float64Array(n);
    const cp = new Float64Array(n);
    const dp = new Float64Array(n);

    // Forward sweep
    // Initial coefficients
    const b0 = b[0];
    if (Math.abs(b0) < 1e-12) return x; // Safety fallback

    cp[0] = c[0] / b0;
    dp[0] = d[0] / b0;

    for (let i = 1; i < n; i++) {
        const denom = b[i] - a[i] * cp[i - 1];
        if (Math.abs(denom) < 1e-12) continue; // Safety
        
        if (i < n - 1) {
            cp[i] = c[i] / denom;
        }
        dp[i] = (d[i] - a[i] * dp[i - 1]) / denom;
    }

    // Back substitution
    x[n - 1] = dp[n - 1];
    for (let i = n - 2; i >= 0; i--) {
        x[i] = dp[i] - cp[i] * x[i + 1];
    }

    return x;
}

/**
 * Calculates smoothed values for selected keyframes using Constrained Variational Smoothing.
 * Treats unselected neighbors as hard constraints to maintain C0/C1 continuity.
 */
export const calculateConstrainedSmoothing = (
    trackIds: string[],
    sequence: AnimationSequence, // Must be the snapshot (original state)
    selectedKeyframeIds: string[],
    smoothStrength: number
) => {
    const updates: { trackId: string, keyId: string, patch: { value: number } }[] = [];
    const selectedSet = new Set(selectedKeyframeIds);

    // Tuning Parameters
    // w_fit: Weight for fidelity to original shape (Volume preservation)
    // w_smooth: Weight for minimizing curvature (Laplacian)
    const wFit = 1.0;
    const wSmooth = Math.max(0, smoothStrength * 5.0); // Scale up UI value for better feel

    if (wSmooth <= 0.001) return updates;

    trackIds.forEach(tid => {
        const track = sequence.tracks[tid];
        if (!track || track.keyframes.length < 3) return; // Need at least 3 points for meaningful curvature

        // 1. Sort Keys by Frame
        const sortedKeys = [...track.keyframes].sort((a, b) => a.frame - b.frame);
        
        // 2. Identify Selection Indices
        const selectedIndices: number[] = [];
        sortedKeys.forEach((k, i) => {
            if (selectedSet.has(`${tid}::${k.id}`)) {
                selectedIndices.push(i);
            }
        });

        if (selectedIndices.length === 0) return;

        // 3. Group into Contiguous Segments
        // We solve the system independently for each contiguous block of selected keys.
        // Gaps (unselected keys) act as anchors between blocks.
        const segments: number[][] = [];
        let currentSegment: number[] = [selectedIndices[0]];
        
        for (let i = 1; i < selectedIndices.length; i++) {
            if (selectedIndices[i] === selectedIndices[i - 1] + 1) {
                currentSegment.push(selectedIndices[i]);
            } else {
                segments.push(currentSegment);
                currentSegment = [selectedIndices[i]];
            }
        }
        segments.push(currentSegment);

        // 4. Solve for each segment
        segments.forEach(segmentIndices => {
            const n = segmentIndices.length;
            const startIdx = segmentIndices[0];
            const endIdx = segmentIndices[n - 1];

            // Arrays for Tridiagonal Matrix (Ax = d)
            const A_lower = new Float64Array(n);
            const A_main = new Float64Array(n);
            const A_upper = new Float64Array(n);
            const D_rhs = new Float64Array(n);

            // SAFETY CHECK: Single Point at Boundary
            // If the segment is just 1 point and it's at the track ends, 
            // curvature is undefined. Skip smoothing to prevent inversion artifacts.
            const isAtTrackStart = startIdx === 0;
            const isAtTrackEnd = endIdx === sortedKeys.length - 1;
            
            if (n === 1 && (isAtTrackStart || isAtTrackEnd)) {
                return; // Skip this segment
            }

            // Populate System
            for (let i = 0; i < n; i++) {
                const globalIdx = segmentIndices[i];
                const originalVal = sortedKeys[globalIdx].value;

                // --- STABLE FORMULATION (Implicit Heat Equation) ---
                // Equation: -s * P_prev + (1 + 2s) * P_curr - s * P_next = Original_Value
                // This ensures the Main Diagonal (b) is ALWAYS positive, preventing oscillation.
                
                let a = -wSmooth;       // Lower diagonal (Negative)
                let b = wFit + 2 * wSmooth; // Main diagonal (Positive & Dominant)
                let c = -wSmooth;       // Upper diagonal (Negative)
                let d = wFit * originalVal;

                // --- Boundary Logic ---

                // 1. Left Boundary (i == 0)
                if (i === 0) {
                    if (startIdx > 0) {
                        // CASE: Hard Constraint (Connection to unselected keys)
                        // Equation: -s*P_left + (1+2s)P_0 - s*P_1 = O
                        // We know P_left, so move it to RHS: (1+2s)P_0 - s*P_1 = O + s*P_left
                        // Since 'a' is negative, subtracting 'a * left' is effectively adding 's * left'
                        d -= a * sortedKeys[startIdx - 1].value; 
                        a = 0; 
                    } else {
                        // CASE: Start of Track (Neumann / Natural)
                        // Ghost Point P_-1 = P_1
                        // Laplacian stencil: P_-1 - 2P_0 + P_1 = 2P_1 - 2P_0
                        // Eq: -s(2P_1 - 2P_0) + P_0 = O
                        // => 2sP_0 - 2sP_1 + P_0 = O
                        // => (1 + 2s)P_0 - 2sP_1 = O
                        b = wFit + 2 * wSmooth; // Keep diagonal dominant
                        c = -2 * wSmooth;      // Double the off-diagonal pull
                        a = 0;
                    }
                } 
                
                // 2. Right Boundary (i == n - 1)
                if (i === n - 1) {
                    if (endIdx < sortedKeys.length - 1) {
                        // CASE: Hard Constraint
                        // Eq: -s*P_{n-2} + (1+2s)P_{n-1} - s*P_right = O
                        // Move P_right to RHS
                        d -= c * sortedKeys[endIdx + 1].value;
                        c = 0;
                    } else {
                        // CASE: End of Track (Neumann / Natural)
                        // Ghost Point P_N+1 = P_N-1
                        // Laplacian stencil: P_N-1 - 2P_N + P_N+1 = 2P_N-1 - 2P_N
                        // Eq: -s(2P_N-1 - 2P_N) + P_N = O
                        // => -2sP_N-1 + 2sP_N + P_N = O
                        // => -2sP_N-1 + (1 + 2s)P_N = O
                        b = wFit + 2 * wSmooth;
                        a = -2 * wSmooth;      // Double the off-diagonal pull
                        c = 0;
                    }
                }

                // Assign to Matrix Arrays
                A_main[i] = b;
                
                // Only set lower diagonal if we are not the first row
                if (i > 0) {
                    A_lower[i] = a; 
                }
                
                // Only set upper diagonal if we are not the last row
                if (i < n - 1) {
                    A_upper[i] = c;
                }
                
                D_rhs[i] = d;
            }

            // Solve
            const solution = solveTridiagonal(n, A_lower, A_main, A_upper, D_rhs);

            // Generate Updates
            for (let i = 0; i < n; i++) {
                const globalIdx = segmentIndices[i];
                const key = sortedKeys[globalIdx];
                const newVal = solution[i];

                if (Math.abs(newVal - key.value) > 1e-9) {
                    updates.push({
                        trackId: tid,
                        keyId: key.id,
                        patch: { value: newVal }
                    });
                }
            }
        });
    });

    return updates;
};
