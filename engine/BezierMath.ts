
// Bezier Math Solver for F-Curves
// Solves 2D Cubic Bezier for y given x (Time) using Newton-Raphson iteration

const NEWTON_ITERATIONS = 4;

function A(aA1: number, aA2: number) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
function B(aA1: number, aA2: number) { return 3.0 * aA2 - 6.0 * aA1; }
function C(aA1: number) { return 3.0 * aA1; }

function calcBezierAt(t: number, p0: number, p1: number, p2: number, p3: number) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    
    return uuu * p0 + 
           3 * uu * t * p1 + 
           3 * u * tt * p2 + 
           ttt * p3;
}

function getSlopeAt(t: number, p0: number, p1: number, p2: number, p3: number) {
    const u = 1 - t;
    return 3 * u * u * (p1 - p0) + 
           6 * u * t * (p2 - p1) + 
           3 * t * t * (p3 - p2);
}

// Finds T for a given X on the curve defined by control points p0, p1, p2, p3
export function solveCubicBezierT(x: number, x0: number, x1: number, x2: number, x3: number): number {
    const duration = x3 - x0;
    if (duration <= 1e-9) return 0; // Prevent divide by zero / infinite loop
    
    // Initial guess: Linear interpolation
    let t = (x - x0) / duration;
    
    // Newton-Raphson
    for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
        // Calculate x(t)
        const currentX = calcBezierAt(t, x0, x1, x2, x3);
        const currentSlope = getSlopeAt(t, x0, x1, x2, x3);
        
        if (Math.abs(currentSlope) < 1e-9) break; // Slope too small
        
        const dx = currentX - x;
        t -= dx / currentSlope;
    }
    
    return Math.max(0, Math.min(1, t));
}

/**
 * De Casteljau split of a cubic Bezier at parameter t.
 * Given control points P0..P3, returns the new control points produced by splitting:
 *   - left subcurve: P0, q0, r0, s
 *   - right subcurve: s, r1, q2, P3
 * Used to insert a key on an existing Bezier segment without changing its shape.
 */
export function splitCubicBezier(
    t: number,
    p0x: number, p0y: number,
    p1x: number, p1y: number,
    p2x: number, p2y: number,
    p3x: number, p3y: number
): {
    sx: number; sy: number;
    leftP1x: number; leftP1y: number;  // q0
    leftP2x: number; leftP2y: number;  // r0
    rightP1x: number; rightP1y: number; // r1
    rightP2x: number; rightP2y: number; // q2
} {
    const u = 1 - t;
    const q0x = u * p0x + t * p1x, q0y = u * p0y + t * p1y;
    const q1x = u * p1x + t * p2x, q1y = u * p1y + t * p2y;
    const q2x = u * p2x + t * p3x, q2y = u * p2y + t * p3y;
    const r0x = u * q0x + t * q1x, r0y = u * q0y + t * q1y;
    const r1x = u * q1x + t * q2x, r1y = u * q1y + t * q2y;
    const sx  = u * r0x + t * r1x, sy  = u * r0y + t * r1y;
    return {
        sx, sy,
        leftP1x: q0x, leftP1y: q0y,
        leftP2x: r0x, leftP2y: r0y,
        rightP1x: r1x, rightP1y: r1y,
        rightP2x: q2x, rightP2y: q2y,
    };
}

export function solveBezierY(
    frame: number, 
    k1Frame: number, k1Val: number, k1HandleX: number, k1HandleY: number, // Handle 1 is Right Tangent of k1
    k2Frame: number, k2Val: number, k2HandleX: number, k2HandleY: number // Handle 2 is Left Tangent of k2
): number {
    // Control Points
    const p0x = k1Frame;
    const p0y = k1Val;
    
    const p1x = k1Frame + k1HandleX;
    const p1y = k1Val + k1HandleY;
    
    const p2x = k2Frame + k2HandleX; // k2HandleX is usually negative relative to k2
    const p2y = k2Val + k2HandleY;
    
    const p3x = k2Frame;
    const p3y = k2Val;
    
    // 1. Solve T for Time
    const t = solveCubicBezierT(frame, p0x, p1x, p2x, p3x);
    
    // 2. Solve Y for Value
    return calcBezierAt(t, p0y, p1y, p2y, p3y);
}
