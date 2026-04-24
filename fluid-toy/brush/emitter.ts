/**
 * Stroke emitter — per-frame orchestrator for the brush + particle emitter.
 *
 * Holds the mutable stroke state (particles array, wall-clock hue phase,
 * spacing accumulator, spawn accumulator) in a single `BrushRuntime`
 * object the app creates once and passes through its render loop. Keeps
 * FluidToyApp from growing brush-specific state.
 *
 * Per-frame call from FluidToyApp's RAF loop:
 *
 *   stepBrush({ dtSec, wallClockMs, dragging, cursorUv, cursorVelUv, params })
 *
 *   1. Advances `rainbowPhase` from wallClockMs (smooth whether dragging
 *      or not — reference toy-fluid ties rainbow hue to wall-clock).
 *   2. Spawns `particleRate · dtSec` particles while dragging + emitter on.
 *   3. Steps every live particle and paints it via engine.brush().
 *
 * Per-move call from FluidPointerLayer: `emitStrokeSplat` and
 * `emitPressSplat`. Pointer events aren't frame-rate aligned; we want
 * per-move responsiveness and a guaranteed mark at click-time (press).
 */

import type { FluidEngine } from '../fluid/FluidEngine';
import type { BrushColorMode } from './color';
import { resolveBrushColor } from './color';
import type { Particle } from './particles';
import { PARTICLE_HARD_CAP, spawnParticle, stepParticles } from './particles';

export interface BrushRuntime {
    particles: Particle[];
    /** Wall-clock-derived hue phase 0..1 for rainbow colour mode. */
    rainbowPhase: number;
    /** Running UV arc-length since the last splat — drives brushSpacing. */
    distSinceSplat: number;
    /** Fractional-particle carry-over so rate stays rate·dt exact. */
    spawnAcc: number;
}

export const createBrushRuntime = (): BrushRuntime => ({
    particles: [],
    rainbowPhase: 0,
    distSinceSplat: 0,
    spawnAcc: 0,
});

export interface BrushParams {
    mode: 'paint' | 'erase' | 'stamp' | 'smudge';
    colorMode: BrushColorMode;
    solidColor: [number, number, number];
    gradientLut: Uint8Array | null;
    size: number;         // UV radius
    hardness: number;     // 0..1
    strength: number;     // dye multiplier
    flow: number;         // velocity multiplier (paint/smudge)
    spacing: number;      // min UV travel between splats
    jitter: number;       // hue jitter 0..1
    particleEmitter: boolean;
    particleRate: number;
    particleVelocity: number;
    particleSpread: number;
    particleGravity: number;
    particleDrag: number;
    particleLifetime: number;
    particleSizeScale: number;
}

export interface StepBrushArgs {
    dtSec: number;
    wallClockMs: number;
    dragging: boolean;
    /** Current cursor UV (null → no valid cursor this frame). */
    cursorUv: { u: number; v: number } | null;
    /** Cursor velocity in UV/sec (null → zero). */
    cursorVelUv: { vx: number; vy: number } | null;
    params: BrushParams;
    engine: FluidEngine;
}

/**
 * Per-frame tick. Updates rainbow phase, spawns particles during drag,
 * steps every particle forward, and paints each as a tiny brush splat.
 */
export const stepBrush = (rt: BrushRuntime, a: StepBrushArgs): void => {
    // Rainbow hue advances off wall-clock so it stays smooth whether or
    // not the user is moving. 1 Hz full cycle — matches reference.
    rt.rainbowPhase = (a.wallClockMs * 0.001) % 1;

    // Spawn particles while dragging (rate is per second, independent of
    // cursor speed). Hard cap enforced inside spawnParticle.
    const p = a.params;
    if (a.dragging && p.particleEmitter && a.cursorUv) {
        rt.spawnAcc += a.dtSec * p.particleRate;
        const dir = a.cursorVelUv ?? { vx: 0, vy: 0 };
        const dirMag = Math.hypot(dir.vx, dir.vy);
        // Fallback direction when cursor is stationary — random
        // omnidirectional, matching reference's spawnParticle.
        const useRandomDir = dirMag <= 1e-4;

        while (rt.spawnAcc >= 1 && rt.particles.length < PARTICLE_HARD_CAP) {
            rt.spawnAcc -= 1;
            let dx: number, dy: number;
            if (useRandomDir) {
                const ang = Math.random() * Math.PI * 2;
                dx = Math.cos(ang); dy = Math.sin(ang);
            } else {
                dx = dir.vx / dirMag;
                dy = dir.vy / dirMag;
            }
            const color = resolveBrushColor({
                mode: p.colorMode,
                solidColor: p.solidColor,
                gradientLut: p.gradientLut,
                rainbowPhase: rt.rainbowPhase,
                u: a.cursorUv.u, v: a.cursorUv.v,
                vx: dir.vx, vy: dir.vy,
                jitter: p.jitter,
            });
            spawnParticle(rt.particles, {
                u: a.cursorUv.u, v: a.cursorUv.v,
                dirX: dx, dirY: dy,
                color,
                brushSize: p.size,
                particleVelocity: p.particleVelocity,
                particleSpread: p.particleSpread,
                particleLifetime: p.particleLifetime,
                particleSizeScale: p.particleSizeScale,
            });
        }
        if (rt.particles.length >= PARTICLE_HARD_CAP) rt.spawnAcc = 0;
    }

    // Step every particle. Even when not dragging, living particles keep
    // flying — that's the streak effect. Pass engine.sampleMask so
    // particles bounce off collision walls instead of passing through.
    if (rt.particles.length > 0) {
        stepParticles(rt.particles, {
            dtSec: a.dtSec,
            particleGravity: p.particleGravity,
            particleDrag: p.particleDrag,
            sampleMask: (u, v) => a.engine.sampleMask(u, v),
        });
        // Paint each particle as a tiny brush. Age-based alpha makes the
        // streak dissolve instead of snapping out at life=0.
        for (const pt of rt.particles) {
            const alpha = Math.max(0, pt.life / pt.lifeMax);
            a.engine.brush(
                pt.x, pt.y,
                pt.vx * p.flow, pt.vy * p.flow,
                pt.color,
                pt.size,
                p.hardness,
                p.strength * alpha,
                p.mode,
            );
        }
    }
};

export interface EmitSplatArgs {
    u: number;
    v: number;
    dvx: number;  // cursor velocity at splat time, UV/sec
    dvy: number;
    params: BrushParams;
    engine: FluidEngine;
    /** Wall-clock ms — needed for rainbow mode's phase. */
    wallClockMs: number;
}

/**
 * Emit a single stroke sample from the pointer layer. Honours spacing
 * (bails if the cursor hasn't travelled far enough since the last
 * splat), and skips splat emission entirely when the particle emitter
 * is on (particles do the painting in that mode).
 *
 * Returns true if a splat was emitted.
 */
export const emitStrokeSplat = (rt: BrushRuntime, a: EmitSplatArgs): boolean => {
    const p = a.params;
    // Emitter mode: particles do the painting. Skip direct splat.
    if (p.particleEmitter) return false;
    // Spacing: don't splat again until cursor has travelled enough.
    if (rt.distSinceSplat < Math.max(1e-5, p.spacing)) return false;
    rt.distSinceSplat = 0;
    paintSplat(rt, a);
    return true;
};

/** Unconditional splat — used on pointer-down so a single click always
 *  leaves a mark. Bypasses the spacing gate; in particle-emitter mode
 *  the press still produces a dye mark at the click point (reference
 *  behaviour — the emitter handles continuous flow, press handles
 *  "mark the spot"). */
export const emitPressSplat = (rt: BrushRuntime, a: EmitSplatArgs): void => {
    if (a.params.particleEmitter) return;
    paintSplat(rt, a);
    rt.distSinceSplat = 0;
};

/** Shared splat path — resolves colour, calls engine.brush(). */
const paintSplat = (rt: BrushRuntime, a: EmitSplatArgs): void => {
    // Keep rainbow phase fresh here too so single-click splats get a
    // current-clock-tinted colour instead of whatever was set last frame.
    rt.rainbowPhase = (a.wallClockMs * 0.001) % 1;
    const p = a.params;
    const color = resolveBrushColor({
        mode: p.colorMode,
        solidColor: p.solidColor,
        gradientLut: p.gradientLut,
        rainbowPhase: rt.rainbowPhase,
        u: a.u, v: a.v,
        vx: a.dvx, vy: a.dvy,
        jitter: p.jitter,
    });
    a.engine.brush(
        a.u, a.v,
        a.dvx * p.flow, a.dvy * p.flow,
        color,
        p.size,
        p.hardness,
        p.strength,
        p.mode,
    );
};

/** Reset stroke-local state on pointer-down so a new drag starts fresh. */
export const beginStroke = (rt: BrushRuntime): void => {
    rt.distSinceSplat = Infinity; // next move passes the spacing gate immediately
    rt.spawnAcc = 0;
};
