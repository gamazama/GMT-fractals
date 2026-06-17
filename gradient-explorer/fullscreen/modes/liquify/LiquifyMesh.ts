/**
 * LiquifyMesh — the CPU soft-body that powers the Liquify fullscreen mode.
 *
 * A dense N×N grid of vertices, each carrying a FIXED LUT coordinate `t = uv.x` (the colour it
 * was "painted" with). Deforming the grid warps the gradient spatially — colours follow the
 * material because each vertex keeps its `t` (the renderer samples `sampleLut(t)`).
 *
 * ── The three position layers (the art-direction contract lives here) ──────────────────────
 *   • `uv`       — the original grid + the FIXED LUT coord. Never moves. Sampled for colour.
 *   • `mlsBase`  — `uv` deformed by the MLS-RIGID handle solver (the AE-Puppet-style global
 *                  shape: drag a handle dot, the sheet follows rigidly with falloff; the 4
 *                  corners + pinned handles are fixed controls). Recomputed only when a handle
 *                  moves.
 *   • `warp`     — the incremental forward-warp brush layer (push / twirl / bloat / pucker /
 *                  smooth / restore), additive on top of `mlsBase`.
 *   • `sculpt`   = `mlsBase + warp` — the AUTHORITATIVE rest shape the user has shaped. This is
 *                  what physics relaxes TOWARD (never toward flat); toggling physics off snaps the
 *                  live mesh back to exactly this.
 *   • `pos`      — the live, physically-simulated mesh. With physics OFF, `pos === sculpt`. With
 *                  physics ON, `pos` is an XPBD soft body that springs/jiggles toward `sculpt`,
 *                  damped, so it settles back to the sculpt (the deformation is never lost).
 *
 * The renderer reads `pos` (deformed geometry) + `t` (colour) each frame.
 *
 * Pure CPU + dependency-light (no GL, no DOM) so it stays testable and portable. Real-time at
 * ~64²–128² by touching only what changed (handle moves recompute MLS; brushes touch the brush
 * neighbourhood; physics early-outs once the kinetic energy settles).
 *
 * @see Schaefer et al. "Image Deformation Using Moving Least Squares" (SIGGRAPH'06) — the rigid
 *   variant, here as a per-vertex weighted rigid (rotation+translation) fit over the handle set.
 * @see Macklin et al. XPBD + Müller "Ten Minute Physics" — the position-based soft body.
 * @see Taubin "A signal processing approach to fair surface design" — the λ|μ smoothing (no shrink).
 */

/** A control handle for the MLS-rigid solver. `rest` is its anchor in the ORIGINAL grid; `cur`
 *  is where the user dragged it to. A `fixed` handle never moves (the 4 corners; a pinned dot). */
export interface LiquifyHandle {
  rest: [number, number];
  cur: [number, number];
  /** Fixed control (corner or user pin) — not draggable, and an XPBD freeze anchor. */
  fixed: boolean;
  /** A user pin (freeze) vs. the 4 implicit corner anchors (which aren't shown / removable). */
  corner: boolean;
}

export type BrushType =
  | 'grab' // MLS handle (drag the dots) — not a warp-layer brush
  | 'push'
  | 'twirl'
  | 'bloat'
  | 'pucker'
  | 'pull'
  | 'smooth'
  | 'restore'
  | 'pin'; // places a fixed MLS handle / XPBD freeze — not a warp-layer brush

/** A smooth radial bump falloff, 1 at the centre → 0 at the rim (C¹). */
const falloff = (t: number): number => {
  if (t >= 1) return 0;
  const u = 1 - t * t;
  return u * u;
};

export class LiquifyMesh {
  readonly n: number; // verts per side
  readonly count: number; // n*n
  /** Fixed LUT coord per vertex (= original uv.x), for the renderer's colour. */
  readonly t: Float32Array;
  /** Triangle index buffer (two tris per cell), Uint32. */
  readonly indices: Uint32Array;

  private uv: Float32Array; // 2*count — original grid positions, fixed
  private mlsBase: Float32Array; // 2*count — uv deformed by the handle solver
  private warp: Float32Array; // 2*count — brush displacement layer
  private sculpt: Float32Array; // 2*count — authoritative rest shape (= mlsBase + warp)
  /** Live simulated positions the renderer draws (= sculpt when physics off). */
  readonly pos: Float32Array; // 2*count
  private prev: Float32Array; // 2*count — pre-integration positions (XPBD velocity)
  private vel: Float32Array; // 2*count
  /** Inverse mass per vertex: 1 (free) or 0 (frozen near a pin) — XPBD. */
  private invMass: Float32Array; // count

  /** MLS control handles. Index 0..3 are the fixed corners; the rest are user grab/pin handles. */
  readonly handles: LiquifyHandle[] = [];

  private mlsW: Float64Array; // scratch: per-handle weight during an MLS solve
  private smoothScratch: Float32Array; // reused per-pass snapshot for the Taubin (Jacobi) smoother
  /** True while the soft body still has kinetic energy (or was just disturbed) — gates the solve. */
  private settled = true;

  constructor(n: number) {
    this.n = n;
    this.count = n * n;
    const c2 = this.count * 2;
    this.uv = new Float32Array(c2);
    this.mlsBase = new Float32Array(c2);
    this.warp = new Float32Array(c2);
    this.sculpt = new Float32Array(c2);
    this.pos = new Float32Array(c2);
    this.prev = new Float32Array(c2);
    this.vel = new Float32Array(c2);
    this.t = new Float32Array(this.count);
    this.invMass = new Float32Array(this.count).fill(1);
    this.smoothScratch = new Float32Array(c2);

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const k = y * n + x;
        const u = n > 1 ? x / (n - 1) : 0;
        const v = n > 1 ? y / (n - 1) : 0;
        this.uv[2 * k] = u;
        this.uv[2 * k + 1] = v;
        this.t[k] = u; // gradient runs left→right; deforming swirls the bands
      }
    }
    this.mlsBase.set(this.uv);
    this.sculpt.set(this.uv);
    this.pos.set(this.uv);
    this.prev.set(this.uv);

    // The 4 corners are always-fixed MLS controls — the rubber sheet is tacked at its corners, so
    // a single dragged handle deforms with a natural falloff instead of translating everything.
    for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
      this.handles.push({ rest: [cx, cy], cur: [cx, cy], fixed: true, corner: true });
    }
    this.mlsW = new Float64Array(this.handles.length);

    // Two triangles per grid cell.
    const cells = (n - 1) * (n - 1);
    this.indices = new Uint32Array(cells * 6);
    let i = 0;
    for (let y = 0; y < n - 1; y++) {
      for (let x = 0; x < n - 1; x++) {
        const a = y * n + x;
        const b = a + 1;
        const c = a + n;
        const d = c + 1;
        this.indices[i++] = a; this.indices[i++] = b; this.indices[i++] = c;
        this.indices[i++] = c; this.indices[i++] = b; this.indices[i++] = d;
      }
    }
  }

  // ── MLS-rigid handle solver ──────────────────────────────────────────────────────────────
  // Per-vertex weighted rigid (rotation+translation) fit over the handle set (Schaefer et al.
  // rigid MLS). Recomputed only when a handle moves. Cost O(count · handles).

  private recomputeMLS(): void {
    const H = this.handles.length;
    if (this.mlsW.length < H) this.mlsW = new Float64Array(H);
    const w = this.mlsW;
    const hs = this.handles;
    for (let k = 0; k < this.count; k++) {
      const vx = this.uv[2 * k];
      const vy = this.uv[2 * k + 1];
      let sw = 0, pcx = 0, pcy = 0, qcx = 0, qcy = 0;
      for (let h = 0; h < H; h++) {
        const dx = hs[h].rest[0] - vx;
        const dy = hs[h].rest[1] - vy;
        const wi = 1 / (dx * dx + dy * dy + 1e-8); // α = 1
        w[h] = wi;
        sw += wi;
        pcx += wi * hs[h].rest[0];
        pcy += wi * hs[h].rest[1];
        qcx += wi * hs[h].cur[0];
        qcy += wi * hs[h].cur[1];
      }
      if (sw < 1e-12) { this.mlsBase[2 * k] = vx; this.mlsBase[2 * k + 1] = vy; continue; }
      pcx /= sw; pcy /= sw; qcx /= sw; qcy /= sw;
      // Weighted rigid rotation that best maps the (rest − p*) onto (cur − q*).
      let num = 0, den = 0;
      for (let h = 0; h < H; h++) {
        const phx = hs[h].rest[0] - pcx, phy = hs[h].rest[1] - pcy;
        const qhx = hs[h].cur[0] - qcx, qhy = hs[h].cur[1] - qcy;
        num += w[h] * (phx * qhy - phy * qhx);
        den += w[h] * (phx * qhx + phy * qhy);
      }
      const theta = Math.atan2(num, den);
      const cos = Math.cos(theta), sin = Math.sin(theta);
      const rx = vx - pcx, ry = vy - pcy;
      this.mlsBase[2 * k] = qcx + (cos * rx - sin * ry);
      this.mlsBase[2 * k + 1] = qcy + (sin * rx + cos * ry);
    }
    this.recomputeSculptAll();
  }

  /** sculpt = mlsBase + warp, full mesh. Recompute pin masses too (pins may have moved). */
  private recomputeSculptAll(): void {
    for (let i = 0; i < this.sculpt.length; i++) this.sculpt[i] = this.mlsBase[i] + this.warp[i];
    this.recomputePinMass();
    this.disturb();
  }

  /** Freeze (invMass 0) vertices that sit under a pinned handle — the XPBD "Starch" anchor. */
  private recomputePinMass(): void {
    const PIN_R = 0.06;
    this.invMass.fill(1);
    for (const h of this.handles) {
      if (!h.fixed || h.corner) continue; // only user pins freeze verts (corners just shape MLS)
      for (let k = 0; k < this.count; k++) {
        const dx = this.uv[2 * k] - h.rest[0];
        const dy = this.uv[2 * k + 1] - h.rest[1];
        if (dx * dx + dy * dy < PIN_R * PIN_R) this.invMass[k] = 0;
      }
    }
  }

  // ── handles (grab + pin tools) ─────────────────────────────────────────────────────────────

  /** Nearest USER handle (not a corner) to (x,y) within `maxDist`, or -1. */
  nearestHandle(x: number, y: number, maxDist: number): number {
    let best = -1, bestD = maxDist * maxDist;
    for (let i = 4; i < this.handles.length; i++) {
      const h = this.handles[i];
      const dx = h.cur[0] - x, dy = h.cur[1] - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  /** Add a draggable grab handle (or a fixed pin) at (x,y). Returns its index. */
  addHandle(x: number, y: number, pin: boolean): number {
    this.handles.push({ rest: [x, y], cur: [x, y], fixed: pin, corner: false });
    this.recomputeMLS();
    return this.handles.length - 1;
  }

  /** Move a handle's deformed position (a grab drag). */
  moveHandle(i: number, x: number, y: number): void {
    const h = this.handles[i];
    if (!h || h.corner) return;
    h.cur[0] = x; h.cur[1] = y;
    this.recomputeMLS();
  }

  /** Remove a user handle (double-click / off-drag). */
  removeHandle(i: number): void {
    if (i < 4 || i >= this.handles.length) return;
    this.handles.splice(i, 1);
    this.recomputeMLS();
  }

  // ── forward-warp brushes (push / twirl / bloat / pucker / pull / smooth / restore) ──────────

  /**
   * Apply a forward-warp brush stroke, updating the `warp` layer (and `sculpt`) within the brush
   * radius. Operates in CURRENT (deformed) space — distance is measured to each vertex's live
   * sculpt position, the classic Liquify "smear what's under the cursor" behaviour.
   *
   * @param dx,dy  pointer delta since last frame (normalized mesh units) — drives push.
   * @param physicsOn  when false, the live `pos` follows `sculpt` immediately; when true the brush
   *   also imparts a little velocity so a stroke makes the soft body come alive (jiggle).
   */
  applyBrush(
    type: BrushType, bx: number, by: number, radius: number, strength: number,
    dx: number, dy: number, physicsOn: boolean, w: number, h: number,
  ): void {
    if (type === 'grab' || type === 'pin') return; // handle tools, not warp brushes
    if (type === 'smooth') { this.smoothRegion(bx, by, radius, strength, w, h); return; }
    // Work the falloff in SCREEN pixels (the gradient fills the canvas, which is non-square) so the
    // brush footprint is a circle on screen regardless of aspect. Displacements are computed in px
    // then converted back to mesh units (÷w, ÷h). Gains are tuned so full strength is potent.
    const minWH = Math.min(w, h);
    const rPx = radius * minWH;
    const rPx2 = rPx * rPx;
    const TWIRL = 3.5 * strength;
    const PULL = 2.0 * strength;
    const RADIAL_PX = rPx * strength * 1.5; // bloat/pucker outward push at the centre, full strength
    for (let k = 0; k < this.count; k++) {
      const sx = this.sculpt[2 * k], sy = this.sculpt[2 * k + 1];
      const ddxPx = (sx - bx) * w, ddyPx = (sy - by) * h;
      const d2 = ddxPx * ddxPx + ddyPx * ddyPx;
      if (d2 > rPx2) continue;
      const dPx = Math.sqrt(d2);
      const wgt = falloff(dPx / rPx);
      if (wgt <= 0) continue;
      let ox = 0, oy = 0;
      switch (type) {
        case 'push':
          ox = wgt * dx; oy = wgt * dy; // dx,dy are the pointer delta in mesh units (cursor-follow)
          break;
        case 'pull': {
          // gather toward the cursor, in mesh units, with the screen-circular falloff
          ox = -(sx - bx) * wgt * PULL; oy = -(sy - by) * wgt * PULL;
          break;
        }
        case 'twirl': {
          // rotate the SCREEN-space offset, then convert the delta back to mesh units
          const a = wgt * TWIRL;
          const ca = Math.cos(a), sa = Math.sin(a);
          ox = ((ca * ddxPx - sa * ddyPx) - ddxPx) / w;
          oy = ((sa * ddxPx + ca * ddyPx) - ddyPx) / h;
          break;
        }
        case 'bloat': {
          const inv = dPx > 1e-3 ? 1 / dPx : 0;
          ox = (ddxPx * inv) * wgt * RADIAL_PX / w; oy = (ddyPx * inv) * wgt * RADIAL_PX / h;
          break;
        }
        case 'pucker': {
          const inv = dPx > 1e-3 ? 1 / dPx : 0;
          ox = -(ddxPx * inv) * wgt * RADIAL_PX / w; oy = -(ddyPx * inv) * wgt * RADIAL_PX / h;
          break;
        }
        case 'restore': {
          // Reconstruct: decay the brush warp back toward none (handles/MLS shape untouched).
          const decay = wgt * strength;
          this.warp[2 * k] *= (1 - decay);
          this.warp[2 * k + 1] *= (1 - decay);
          this.sculpt[2 * k] = this.mlsBase[2 * k] + this.warp[2 * k];
          this.sculpt[2 * k + 1] = this.mlsBase[2 * k + 1] + this.warp[2 * k + 1];
          // (physics-off: the live mesh follows sculpt via the loop's syncToSculpt — no inline write)
          if (physicsOn && this.invMass[k] > 0) { this.vel[2 * k] *= 0.5; this.vel[2 * k + 1] *= 0.5; }
          continue;
        }
      }
      this.warp[2 * k] += ox;
      this.warp[2 * k + 1] += oy;
      this.sculpt[2 * k] = this.mlsBase[2 * k] + this.warp[2 * k];
      this.sculpt[2 * k + 1] = this.mlsBase[2 * k + 1] + this.warp[2 * k + 1];
      // physics-off: the live mesh follows sculpt via the loop's syncToSculpt (no inline write).
      if (physicsOn && this.invMass[k] > 0) {
        // Impart a little kinetic energy so the body visibly comes alive under the brush.
        this.vel[2 * k] += ox * 6; this.vel[2 * k + 1] += oy * 6;
      }
    }
    this.disturb();
  }

  /** Taubin λ|μ smoothing of the WARP layer within a region (the smooth brush). Smooths brush
   *  roughness without shrinking the overall deformation (plain Laplacian would melt it). Several
   *  λ|μ cycles per stroke so a single pass over the cursor visibly relaxes a crease; the boundary
   *  ring is held fixed (free-boundary Taubin inflates → drift). Falloff is screen-circular. */
  private smoothRegion(bx: number, by: number, radius: number, strength: number, w: number, h: number): void {
    const lambda = 0.65 * strength;
    const mu = -0.68 * strength; // |μ| > λ keeps the passband flat (Taubin) → no shrink
    const minWH = Math.min(w, h);
    const rPx = radius * minWH, rPx2 = rPx * rPx;
    const n = this.n;
    const src = this.smoothScratch;
    for (let iter = 0; iter < 4; iter++) {
      for (const factor of [lambda, mu]) {
        src.set(this.warp); // Jacobi snapshot (reused buffer, no alloc)
        for (let k = 0; k < this.count; k++) {
          const x = k % n, y = (k / n) | 0;
          if (x === 0 || x === n - 1 || y === 0 || y === n - 1) continue; // pin the boundary ring
          const ddxPx = (this.sculpt[2 * k] - bx) * w, ddyPx = (this.sculpt[2 * k + 1] - by) * h;
          const d2 = ddxPx * ddxPx + ddyPx * ddyPx;
          if (d2 > rPx2) continue;
          const wgt = falloff(Math.sqrt(d2) / rPx);
          if (wgt <= 0) continue;
          const lapx = (src[2 * (k - 1)] + src[2 * (k + 1)] + src[2 * (k - n)] + src[2 * (k + n)]) * 0.25 - src[2 * k];
          const lapy = (src[2 * (k - 1) + 1] + src[2 * (k + 1) + 1] + src[2 * (k - n) + 1] + src[2 * (k + n) + 1]) * 0.25 - src[2 * k + 1];
          this.warp[2 * k] += factor * wgt * lapx;
          this.warp[2 * k + 1] += factor * wgt * lapy;
          this.sculpt[2 * k] = this.mlsBase[2 * k] + this.warp[2 * k];
          this.sculpt[2 * k + 1] = this.mlsBase[2 * k + 1] + this.warp[2 * k + 1];
        }
      }
    }
    this.disturb();
  }

  /** Continuous global relaxation of the warp layer (the Smooth slider). A boundary-PINNED,
   *  λ-only Laplacian diffusion — unconditionally convergent (heat diffusion toward a harmonic
   *  interior), so it can't inflate or fold the way free-boundary Taubin λ|μ does when run every
   *  frame. It gently relaxes wrinkles toward smooth; it does NOT erase the low-frequency push
   *  (pinned boundary holds the overall shape). No-op at strength 0. */
  smoothAll(strength: number): void {
    if (strength <= 0) return;
    const lambda = 0.25 * strength; // per-frame diffusion rate (< 0.5 → stable for a 4-neighbour avg)
    const n = this.n;
    const src = this.smoothScratch;
    src.set(this.warp);
    for (let k = 0; k < this.count; k++) {
      const x = k % n, y = (k / n) | 0;
      if (x === 0 || x === n - 1 || y === 0 || y === n - 1) continue; // pin the boundary ring
      const lapx = (src[2 * (k - 1)] + src[2 * (k + 1)] + src[2 * (k - n)] + src[2 * (k + n)]) * 0.25 - src[2 * k];
      const lapy = (src[2 * (k - 1) + 1] + src[2 * (k + 1) + 1] + src[2 * (k - n) + 1] + src[2 * (k + n) + 1]) * 0.25 - src[2 * k + 1];
      this.warp[2 * k] += lambda * lapx;
      this.warp[2 * k + 1] += lambda * lapy;
    }
    for (let i = 0; i < this.sculpt.length; i++) this.sculpt[i] = this.mlsBase[i] + this.warp[i];
    this.disturb();
  }

  /** Reset the brush warp + all user handles back to the flat grid (the big Reset button). */
  reset(): void {
    this.warp.fill(0);
    this.handles.length = 4; // keep the corners
    this.vel.fill(0);
    this.recomputeMLS();
    this.pos.set(this.sculpt);
    this.prev.set(this.sculpt);
  }

  // ── XPBD soft body (off by default; relaxes pos → sculpt, never toward flat) ────────────────

  /** Mark the body disturbed so the solver runs until it settles again. */
  disturb(): void { this.settled = false; }

  /** With physics OFF, the live mesh IS the sculpt (snap; deformation preserved exactly). */
  syncToSculpt(): void {
    this.pos.set(this.sculpt);
    this.prev.set(this.sculpt);
    this.vel.fill(0);
    this.settled = true;
  }

  /**
   * One physics frame. XPBD-style: predict → project (anchor-to-sculpt + structural edges, both
   * toward the SCULPTED shape) → derive velocity, with substeps + velocity damping. Stiffness and
   * damping are [0,1]; pin/freeze verts (invMass 0) are locked to sculpt (compliance 0). Early-outs
   * once kinetic energy is negligible (and snaps pos→sculpt so a still preview is pixel-clean).
   *
   * @param stiffness 0 = floppy/slow return, 1 = rigid (snaps to sculpt). Maps to XPBD compliance.
   * @param damping   0 = lively, 1 = heavily damped.
   */
  step(dt: number, stiffness: number, damping: number): void {
    if (this.settled) return;
    const SUB = 4;
    const sdt = Math.min(dt, 1 / 30) / SUB;
    // Direct PBD stiffness (compliance↔stiffness): pin = 1 (snap), low stiffness = weak pull.
    const anchorK = 0.02 + 0.98 * stiffness;
    const edgeK = 0.2 + 0.8 * stiffness;
    // A small damping FLOOR so even at the slider's 0 the spring still loses energy — otherwise an
    // undamped anchor spring rings forever (and never settles). Caps below 1 at the top end too.
    const velDamp = Math.pow(1 - Math.min(0.99, 0.06 + 0.9 * damping), 1 / SUB);
    // Position-based constraints feed their correction back into velocity (= momentum); at high
    // stiffness + low damping the anchor's large one-step pull, divided by the tiny substep dt, can
    // briefly spike velocity. Clamp the per-substep speed so a poke can never explode the sheet.
    const MAXV = 16, MAXV2 = MAXV * MAXV;
    const n = this.n;
    let maxV2 = 0;
    for (let s = 0; s < SUB; s++) {
      // predict
      for (let k = 0; k < this.count; k++) {
        if (this.invMass[k] === 0) {
          this.pos[2 * k] = this.sculpt[2 * k]; this.pos[2 * k + 1] = this.sculpt[2 * k + 1];
          this.prev[2 * k] = this.pos[2 * k]; this.prev[2 * k + 1] = this.pos[2 * k + 1];
          this.vel[2 * k] = 0; this.vel[2 * k + 1] = 0;
          continue;
        }
        this.prev[2 * k] = this.pos[2 * k];
        this.prev[2 * k + 1] = this.pos[2 * k + 1];
        this.vel[2 * k] *= velDamp; this.vel[2 * k + 1] *= velDamp;
        this.pos[2 * k] += this.vel[2 * k] * sdt;
        this.pos[2 * k + 1] += this.vel[2 * k + 1] * sdt;
      }
      // anchor: pull toward the sculpted rest shape (the contract — never toward flat)
      for (let k = 0; k < this.count; k++) {
        if (this.invMass[k] === 0) continue;
        this.pos[2 * k] += (this.sculpt[2 * k] - this.pos[2 * k]) * anchorK;
        this.pos[2 * k + 1] += (this.sculpt[2 * k + 1] - this.pos[2 * k + 1]) * anchorK;
      }
      // structural edges (right + down): hold the sculpt edge length so a poke travels as a wave
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const k = y * n + x;
          if (x < n - 1) this.solveEdge(k, k + 1, edgeK);
          if (y < n - 1) this.solveEdge(k, k + n, edgeK);
        }
      }
      // velocity
      for (let k = 0; k < this.count; k++) {
        if (this.invMass[k] === 0) continue;
        let vx = (this.pos[2 * k] - this.prev[2 * k]) / sdt;
        let vy = (this.pos[2 * k + 1] - this.prev[2 * k + 1]) / sdt;
        let v2 = vx * vx + vy * vy;
        if (v2 > MAXV2) { const s = MAXV / Math.sqrt(v2); vx *= s; vy *= s; v2 = MAXV2; }
        this.vel[2 * k] = vx; this.vel[2 * k + 1] = vy;
        if (v2 > maxV2) maxV2 = v2;
      }
    }
    // Settle: once still, snap to sculpt so the rendered frame is exactly the sculpt (no drift).
    if (maxV2 < 1e-7) this.syncToSculpt();
  }

  /** XPBD distance constraint toward the current SCULPT edge length (reads the authoritative shape
   *  directly so it can never relax toward flat). Mass-weighted; skips frozen pairs. */
  private solveEdge(a: number, b: number, k: number): void {
    const wa = this.invMass[a], wb = this.invMass[b];
    const wsum = wa + wb;
    if (wsum === 0) return;
    const ax = this.pos[2 * a], ay = this.pos[2 * a + 1];
    const bx = this.pos[2 * b], by = this.pos[2 * b + 1];
    let dx = ax - bx, dy = ay - by;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) return;
    const rest = Math.hypot(
      this.sculpt[2 * a] - this.sculpt[2 * b],
      this.sculpt[2 * a + 1] - this.sculpt[2 * b + 1],
    );
    const diff = (len - rest) / len * k;
    dx *= diff; dy *= diff;
    this.pos[2 * a] -= dx * (wa / wsum); this.pos[2 * a + 1] -= dy * (wa / wsum);
    this.pos[2 * b] += dx * (wb / wsum); this.pos[2 * b + 1] += dy * (wb / wsum);
  }
}
