/**
 * CPU-side particle system for the brush's emitter mode.
 *
 * Lives independently of the fluid — each particle has its own
 * position, velocity, life, colour snapshot, and size. Every frame
 * each particle acts as a tiny brush, calling engine.brush() at its
 * own position with the currently-selected brushMode. That makes
 * particles visible IN the fluid (they paint into the same dye /
 * velocity fields the pointer does) rather than being a separate
 * overlay — the fluid carries their deposits, so streaks that would
 * otherwise be straight lines become curves as the flow bends them.
 *
 * Kept on the CPU for two reasons: the hard cap is small (300 live),
 * and each particle needs to call engine.brush() which already runs
 * a WebGL pass per splat. Moving to a GPU particle texture would
 * need a new sim pass and wouldn't speed up the bottleneck.
 *
 * Spawn rate is time-based (particleRate / sec) so it's independent
 * of cursor travel speed — a slow drag and a fast drag emit the same
 * particles per second.
 */

export const PARTICLE_HARD_CAP = 300;

export interface Particle {
    /** Position in UV space (0..1). */
    x: number;
    y: number;
    /** Velocity in UV/sec. */
    vx: number;
    vy: number;
    /** Remaining life in seconds; culled when ≤ 0. */
    life: number;
    /** Initial life for age-based fade. */
    lifeMax: number;
    /** Colour snapshot at spawn — particle keeps this hue for its life. */
    color: [number, number, number];
    /** Per-particle splat radius in UV. */
    size: number;
}

export interface ParticleSpawnArgs {
    /** Cursor position at spawn, UV 0..1. */
    u: number;
    v: number;
    /** Drag direction in UV/sec (normalised on our side). */
    dirX: number;
    dirY: number;
    /** Colour snapshot — resolved by the brush colour pipeline. */
    color: [number, number, number];
    /** Base brush params. */
    brushSize: number;
    particleVelocity: number;
    particleSpread: number;
    particleLifetime: number;
    particleSizeScale: number;
}

/**
 * Append one particle to `list` (capped at PARTICLE_HARD_CAP).
 * Speed is randomised within 40–100% of the base velocity, and direction
 * gets an angular jitter scaled by particleSpread (0 = beam, 1 = full 360).
 * Position gets a small random offset proportional to brush size so
 * spawns don't all stack on a single pixel.
 */
export const spawnParticle = (list: Particle[], a: ParticleSpawnArgs): void => {
    if (list.length >= PARTICLE_HARD_CAP) return;
    const baseAng = Math.atan2(a.dirY, a.dirX);
    const ang = baseAng + (Math.random() - 0.5) * 2 * a.particleSpread * Math.PI;
    const speed = a.particleVelocity * (0.4 + Math.random() * 0.6);
    const jr = a.brushSize * 0.35;
    list.push({
        x: a.u + (Math.random() - 0.5) * jr,
        y: a.v + (Math.random() - 0.5) * jr,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: a.particleLifetime,
        lifeMax: a.particleLifetime,
        color: [a.color[0], a.color[1], a.color[2]],
        size: a.brushSize * a.particleSizeScale * (0.85 + Math.random() * 0.3),
    });
};

export interface ParticleStepArgs {
    dtSec: number;
    particleGravity: number;
    particleDrag: number;
    /** Optional wall sampler — returns 0..1, 1 = solid. When omitted
     *  (or when it always returns 0), particles pass through freely. */
    sampleMask?: (u: number, v: number) => number;
    /** Energy retained on bounce. 1 = elastic, 0 = stick. Default 0.55
     *  gives a lively bounce without particles rocketing around forever. */
    restitution?: number;
}

/** Reflect (vx,vy) about a unit normal (nx,ny). Pure math. */
const reflect = (vx: number, vy: number, nx: number, ny: number): [number, number] => {
    const d = 2 * (vx * nx + vy * ny);
    return [vx - d * nx, vy - d * ny];
};

/** Threshold above which the mask value counts as a solid wall. Matches
 *  the shader's 0.5 cut-off — cells at ≥0.5 in the grayscale mask block
 *  fluid flow. */
const WALL_THRESHOLD = 0.5;

/**
 * Step all live particles forward by `dtSec`. When a `sampleMask` is
 * supplied, particles crossing into solid cells reflect their velocity
 * about the mask-gradient normal (scaled by restitution) and get
 * pushed back to their pre-step position plus a tiny normal-out offset.
 *
 * Returns the number culled.
 */
export const stepParticles = (list: Particle[], a: ParticleStepArgs): number => {
    // Exponential drag: v *= exp(-drag·dt). Stable across any dt.
    const decay = Math.exp(-a.particleDrag * a.dtSec);
    const restitution = a.restitution ?? 0.55;
    // Finite-difference step for normal estimation, in UV space. Tuned
    // smaller than a CPU-mask cell (1/128 ≈ 0.0078) so near-wall cells
    // still give a non-degenerate gradient.
    const ND = 0.01;
    let culled = 0;
    for (let i = list.length - 1; i >= 0; i--) {
        const pt = list[i];
        pt.vx *= decay;
        pt.vy *= decay;
        pt.vy += a.particleGravity * a.dtSec;
        const prevX = pt.x;
        const prevY = pt.y;
        pt.x  += pt.vx * a.dtSec;
        pt.y  += pt.vy * a.dtSec;
        pt.life -= a.dtSec;

        // Wall-bounce: if we stepped INTO a wall, reflect off the mask
        // gradient normal. Use the new position to probe so we bounce
        // even when the previous frame was already just outside a wall.
        if (a.sampleMask && a.sampleMask(pt.x, pt.y) >= WALL_THRESHOLD) {
            // Try two finite-diff radii — the inner probe handles fat
            // walls, the outer catches narrow ones (1-cell-wide walls
            // would otherwise give a zero gradient and fall through).
            let gx = a.sampleMask(pt.x + ND, pt.y) - a.sampleMask(pt.x - ND, pt.y);
            let gy = a.sampleMask(pt.x, pt.y + ND) - a.sampleMask(pt.x, pt.y - ND);
            let gLen = Math.hypot(gx, gy);
            if (gLen <= 1e-6) {
                const ND2 = ND * 3;
                gx = a.sampleMask(pt.x + ND2, pt.y) - a.sampleMask(pt.x - ND2, pt.y);
                gy = a.sampleMask(pt.x, pt.y + ND2) - a.sampleMask(pt.x, pt.y - ND2);
                gLen = Math.hypot(gx, gy);
            }
            let nx: number, ny: number;
            if (gLen > 1e-6) {
                // Normal points AWAY from the wall (mask increases toward
                // solid, so gradient points INTO the wall — negate to get
                // the surface-out direction).
                nx = -gx / gLen;
                ny = -gy / gLen;
            } else {
                // Gradient still zero — wall is wider than our probes.
                // Fall back to the particle's incoming-velocity direction
                // as an approximate surface-out normal (it must have come
                // from free space, so -velocity points out).
                const vMag = Math.hypot(pt.vx, pt.vy);
                if (vMag > 1e-6) { nx = -pt.vx / vMag; ny = -pt.vy / vMag; }
                else             { nx = 1; ny = 0; }
            }
            [pt.vx, pt.vy] = reflect(pt.vx, pt.vy, nx, ny);
            pt.vx *= restitution;
            pt.vy *= restitution;
            // Revert to the safe pre-step position and nudge along the
            // normal so the next-frame sampleMask clears the wall.
            pt.x = prevX + nx * ND;
            pt.y = prevY + ny * ND;
        }

        // Cull particles off-canvas or at end of life. Generous margin on
        // the canvas check so gravity arcs that dip off-screen can return.
        if (pt.life <= 0 || pt.x < -0.2 || pt.x > 1.2 || pt.y < -0.2 || pt.y > 1.2) {
            list.splice(i, 1);
            culled++;
        }
    }
    return culled;
};
