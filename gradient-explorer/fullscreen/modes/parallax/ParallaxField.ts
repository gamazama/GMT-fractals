/**
 * ParallaxField — the CPU particle sim behind the Parallax fullscreen mode.
 *
 * A seeded scatter of depth-layered points, each carrying a LUT coord. The field is PERFECTLY
 * STILL at rest (the no-idle-wiggle contract) — all motion is a direct response to the hand:
 *   • a drag transfers pointer velocity (plus a slight perpendicular swirl, so stirring reads as
 *     stirring, not just smearing) to particles inside the brush, weighted by a smooth radial
 *     falloff AND by depth — near particles take the stir hardest, which is what sells the 3D;
 *   • a press fires a one-shot radial pulse outward from the cursor (a bloom of colour);
 *   • displaced particles spring back to their home seat, slightly underdamped — one gentle
 *     overshoot, then rest. The field always self-heals; a child cannot break it.
 * Stirred particles also gain ENERGY (a flare the renderer turns into brightness/size), which
 * decays in ~a second — touch makes the colours sing, letting go lets them settle.
 *
 * Coordinates: homes are normalized over a margin-extended unit rect (the margin hides the
 * parallax overscan); displacement/velocity are in CSS px so brush falloffs are circular on any
 * aspect. The depth→parallax weight lives in {@link parallaxFactor} — the renderer's vertex
 * shader applies the SAME curve to the camera shift, so stir picking matches what's on screen.
 *
 * @see ParallaxRenderer.ts (instanced sprite renderer) · parallaxMode.tsx (the mode)
 */

import { mulberry32 } from '../../../../palette/core/rampGeometry';
import type { ParallaxColorBy } from './parallaxStore';

/** Normalized margin around the unit rect where homes may sit — covers the parallax camera
 *  overscan so peeking never exposes a bare edge. Exported so parallaxMode DERIVES its max
 *  camera shift from it (single source for the "shift < margin" invariant). */
export const MARGIN = 0.1;

/** Spring stiffness (s⁻²) + damping (s⁻¹) of the return-home pull. ζ ≈ 0.55 — slightly
 *  underdamped: one soft overshoot (a jelly settle), then still. */
const SPRING_K = 30;
const SPRING_C = 6;

/** Fraction of the pointer's velocity transferred to a particle at the brush centre. */
const STIR_GAIN = 0.5;
/** Perpendicular (swirl) fraction of the pointer velocity — the "stirring honey" component. */
const SWIRL_GAIN = 0.3;
/** Outward speed (px/s) of the press pulse at the cursor. */
const PULSE_SPEED = 750;
/** Energy decay rate (s⁻¹) — a flare fades in ~1s. */
const ENERGY_DECAY = 3;
/** Speed (px/s) that charges a particle to full flare. */
const ENERGY_FULL_SPEED = 700;
/** Per-particle jitter on the spatial colour mappings — organic bands, not strata. */
const SPATIAL_JITTER = 0.1;
/** Below this per-particle motion sum (|v| + |disp| px-ish + energy) the field counts as
 *  settled — the caller may skip sim + draw until the next touch (idle power saving). */
const SETTLE_EPS = 0.05;

/** Parallax weight of the FARTHEST layer (the nearest is 1). Exported so ParallaxRenderer
 *  injects the SAME value into its vertex shader — stir picking matches what's on screen. */
export const PAR_FAR = 0.1;

/** Depth → parallax/stir weight: far (z=0) barely moves, near (z=1) moves fully. */
export const parallaxFactor = (z: number): number => PAR_FAR + (1 - PAR_FAR) * z;

/** Per-frame hand input consumed by {@link ParallaxField.step}. */
export interface StirInput {
  /** Cursor position in CSS px (canvas-local), or null when the pointer is outside. */
  x: number;
  y: number;
  /** Cursor movement this frame in CSS px. */
  dx: number;
  dy: number;
  /** Whether the pointer is pressed (drag = stir). */
  dragging: boolean;
  /** One-shot radial pulse strength 0..1 (set on press; the caller clears it after step). */
  pulse: number;
}

export class ParallaxField {
  readonly n: number;
  /** Home positions, normalized over [-MARGIN, 1+MARGIN]² (x,y interleaved). */
  private readonly homes: Float32Array;
  /** Depth 0 (far) .. 1 (near), biased toward far — many small far dots, few big near ones. */
  private readonly depth: Float32Array;
  /** LUT coord per particle (recomputed on a colour-mapping change). */
  private readonly lutT: Float32Array;
  /** Per-particle uniform random — the 'mix' colour coord + the 'depth' jitter, stable per seed. */
  private readonly rnd: Float32Array;
  /** Displacement from home + velocity, CSS px (x,y interleaved). */
  private readonly disp: Float32Array;
  private readonly vel: Float32Array;
  /** Stir flare 0..1 per particle (renderer: brightness + size boost). */
  private readonly energy: Float32Array;

  constructor(n: number, seed: number, colorBy: ParallaxColorBy) {
    this.n = n;
    this.homes = new Float32Array(n * 2);
    this.depth = new Float32Array(n);
    this.lutT = new Float32Array(n);
    this.rnd = new Float32Array(n);
    this.disp = new Float32Array(n * 2);
    this.vel = new Float32Array(n * 2);
    this.energy = new Float32Array(n);
    this.regenerate(seed, colorBy);
  }

  /** Re-scatter the field (🎲 Shuffle): fresh homes/depths/colours, displacement cleared. */
  regenerate(seed: number, colorBy: ParallaxColorBy): void {
    const rng = mulberry32(seed * 0x9e3779b9 + 1);
    for (let i = 0; i < this.n; i++) {
      this.homes[2 * i] = -MARGIN + rng() * (1 + 2 * MARGIN);
      this.homes[2 * i + 1] = -MARGIN + rng() * (1 + 2 * MARGIN);
      // Bias depth toward far (perspective: a deep field has many distant points, few close).
      this.depth[i] = Math.pow(rng(), 1.7);
      this.rnd[i] = rng();
    }
    this.disp.fill(0);
    this.vel.fill(0);
    this.energy.fill(0);
    this.setColorBy(colorBy);
  }

  /** Recompute per-particle LUT coords for a colour-mapping mode (cheap — no re-scatter).
   *  The SPATIAL mappings (flow/bloom) are what make the field read as THE GRADIENT rather
   *  than random confetti: colour follows screen position, so the ramp is visible at a glance
   *  and additive neighbours share a hue (overlaps reinforce the local colour, never grey). */
  setColorBy(colorBy: ParallaxColorBy): void {
    for (let i = 0; i < this.n; i++) {
      const hx = this.homes[2 * i];
      const hy = this.homes[2 * i + 1];
      // A touch of per-particle jitter keeps spatial bands organic, not stratified.
      const jit = (this.rnd[i] - 0.5) * SPATIAL_JITTER;
      let t: number;
      switch (colorBy) {
        case 'flow': // the gradient runs left→right across the field (like the gradient strip)
          t = hx + jit;
          break;
        case 'bloom': { // radial: first stop blooms at the centre, last reaches the corners
          const dx = hx - 0.5;
          const dy = hy - 0.5;
          t = Math.sqrt(dx * dx + dy * dy) / 0.72 + jit;
          break;
        }
        case 'depth': // the ramp runs far→near (visible as you peek/stir)
          t = this.depth[i] + jit;
          break;
        default: // 'mix' — every colour at every position
          t = this.rnd[i];
      }
      this.lutT[i] = t < 0 ? 0 : t > 1 ? 1 : t;
    }
  }

  /** Static per-instance attributes (depth, lutT interleaved) for the renderer's static VBO. */
  staticAttribs(): Float32Array {
    const out = new Float32Array(this.n * 2);
    for (let i = 0; i < this.n; i++) {
      out[2 * i] = this.depth[i];
      out[2 * i + 1] = this.lutT[i];
    }
    return out;
  }

  /**
   * Advance the sim one frame. `camX/camY` is the current parallax camera shift (CSS px) so the
   * brush picks particles where they APPEAR, not where they live; `stirRadius` is the brush
   * radius in CSS px; `w/h` the canvas CSS size.
   *
   * @returns true when the field has fully settled (no touch, all residual motion below the
   * visible threshold) — the caller may stop simulating/drawing until the next wake.
   */
  step(dt: number, input: StirInput | null, w: number, h: number, stirRadius: number, camX: number, camY: number): boolean {
    const { n, homes, depth, disp, vel, energy } = this;
    const decay = Math.exp(-ENERGY_DECAY * dt);
    const touching = input !== null && (input.dragging || input.pulse > 0);
    const r2 = stirRadius * stirRadius;
    // Pointer velocity (px/s) from the per-frame delta.
    const pvx = touching ? input.dx / dt : 0;
    const pvy = touching ? input.dy / dt : 0;
    let maxMotion = 0;

    for (let i = 0; i < n; i++) {
      energy[i] *= decay;
      let vx = vel[2 * i];
      let vy = vel[2 * i + 1];

      if (touching) {
        const par = parallaxFactor(depth[i]);
        // On-screen position = home + displacement + parallax shift (matches the vertex shader).
        const sx = homes[2 * i] * w + disp[2 * i] + camX * par;
        const sy = homes[2 * i + 1] * h + disp[2 * i + 1] + camY * par;
        const ox = sx - input.x;
        const oy = sy - input.y;
        const d2 = (ox * ox + oy * oy) / r2;
        if (d2 < 3) {
          const fall = Math.exp(-2.5 * d2);
          const wz = fall * par; // near particles take the hand hardest — the depth cue
          let gained = 0;
          if (input.dragging) {
            // Velocity transfer + a perpendicular swirl component.
            vx += (pvx * STIR_GAIN - pvy * SWIRL_GAIN) * wz;
            vy += (pvy * STIR_GAIN + pvx * SWIRL_GAIN) * wz;
            gained = Math.hypot(pvx, pvy) * STIR_GAIN * wz;
          }
          if (input.pulse > 0) {
            const d = Math.sqrt(ox * ox + oy * oy) + 1e-3;
            const push = PULSE_SPEED * input.pulse * wz;
            vx += (ox / d) * push;
            vy += (oy / d) * push;
            gained += push;
          }
          const e = energy[i] + gained / ENERGY_FULL_SPEED;
          energy[i] = e > 1 ? 1 : e;
        }
      }

      // Spring back home (semi-implicit Euler — stable at our dt cap).
      vx += (-SPRING_K * disp[2 * i] - SPRING_C * vx) * dt;
      vy += (-SPRING_K * disp[2 * i + 1] - SPRING_C * vy) * dt;
      disp[2 * i] += vx * dt;
      disp[2 * i + 1] += vy * dt;
      vel[2 * i] = vx;
      vel[2 * i + 1] = vy;
      const m = Math.abs(vx) + Math.abs(vy) + Math.abs(disp[2 * i]) + Math.abs(disp[2 * i + 1]) + energy[i];
      if (m > maxMotion) maxMotion = m;
    }
    return !touching && maxMotion < SETTLE_EPS;
  }

  /** Fill the renderer's dynamic per-instance buffer: (x px, y px, energy) per particle.
   *  `out.length` must be `n * 3`. The parallax camera shift is applied in the vertex shader. */
  writeDynamic(out: Float32Array, w: number, h: number): void {
    const { n, homes, disp, energy } = this;
    for (let i = 0; i < n; i++) {
      out[3 * i] = homes[2 * i] * w + disp[2 * i];
      out[3 * i + 1] = homes[2 * i + 1] * h + disp[2 * i + 1];
      out[3 * i + 2] = energy[i];
    }
  }
}
