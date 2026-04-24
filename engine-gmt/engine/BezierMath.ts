
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
