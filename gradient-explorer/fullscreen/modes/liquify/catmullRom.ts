/**
 * catmullRom — smooth (C1) upsampling of the Liquify control grid for rendering.
 *
 * The soft-body SIM runs on a coarse regular grid (cheap + stable — MLS/XPBD/Taubin all exploit
 * the implicit grid neighbours). But drawing that grid directly is a piecewise-LINEAR approximation
 * of the warp: under heavy stretch the triangles fan out and you see Mach-band creases at every
 * edge ("poly soup"). The fix is to DECOUPLE render resolution from sim resolution — at draw time,
 * upsample the coarse deformed grid into a finer one through a **Catmull-Rom** patch.
 *
 * Catmull-Rom is INTERPOLATING (the fine surface passes exactly through the coarse control points)
 * and C1 across cell boundaries, so the displayed surface is smooth — no creases — while the sim
 * grid stays coarse. The subdivision factor `S` is chosen per frame from the on-screen stretch
 * (a GLOBAL level → a uniform fine grid → no T-junction cracks). `S = 1` reproduces the coarse grid
 * exactly (the flat-grid A/B baseline).
 *
 * Pure + dependency-light (no GL/DOM) so it's testable. @see debug/test-liquify-mesh.mts
 */

const clampi = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** Uniform Catmull-Rom basis: the cubic through (p1,p2) given neighbours (p0,p3), param t∈[0,1]. */
const cr = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - 3 * p2 + p3 - p0) * t3);
};

/** Verts-per-side of the render grid for a sim grid of side `n` subdivided by `S`. */
export const renderSide = (n: number, S: number): number => (n - 1) * S + 1;

/** One Catmull-Rom row value: component `c` of the cubic across columns (i0-1..i0+2) at row `jj`. */
const rowVal = (pos: Float32Array, n: number, i0: number, jj: number, tx: number, c: number): number => {
  const j = clampi(jj, 0, n - 1) * n;
  const a = pos[2 * (j + clampi(i0 - 1, 0, n - 1)) + c];
  const b = pos[2 * (j + clampi(i0, 0, n - 1)) + c];
  const d = pos[2 * (j + clampi(i0 + 1, 0, n - 1)) + c];
  const e = pos[2 * (j + clampi(i0 + 2, 0, n - 1)) + c];
  return cr(a, b, d, e, tx);
};

/**
 * Upsample a coarse deformed grid `pos` (n×n, xy-interleaved) into `out` (RN×RN, xy-interleaved)
 * via separable Catmull-Rom. `out` must be sized `renderSide(n,S)² * 2`. Edge cells clamp-extend
 * their control neighbourhood. At `S = 1` `out` equals `pos` (the interpolation property).
 */
export const upsampleCatmullRom = (pos: Float32Array, n: number, S: number, out: Float32Array): void => {
  const RN = renderSide(n, S);
  const inv = 1 / S;
  for (let rj = 0; rj < RN; rj++) {
    const gy = rj * inv;
    const j0 = Math.min(n - 2, gy | 0);
    const ty = gy - j0;
    for (let ri = 0; ri < RN; ri++) {
      const gx = ri * inv;
      const i0 = Math.min(n - 2, gx | 0);
      const tx = gx - i0;
      // separable: 4 Catmull-Rom rows across x (per component), then one across y.
      const x = cr(
        rowVal(pos, n, i0, j0 - 1, tx, 0), rowVal(pos, n, i0, j0, tx, 0),
        rowVal(pos, n, i0, j0 + 1, tx, 0), rowVal(pos, n, i0, j0 + 2, tx, 0), ty,
      );
      const y = cr(
        rowVal(pos, n, i0, j0 - 1, tx, 1), rowVal(pos, n, i0, j0, tx, 1),
        rowVal(pos, n, i0, j0 + 1, tx, 1), rowVal(pos, n, i0, j0 + 2, tx, 1), ty,
      );
      const k = 2 * (rj * RN + ri);
      out[k] = x; out[k + 1] = y;
    }
  }
};

/** The render grid's fixed LUT coord per vertex (= rest x; smooth across the fine grid). */
export const buildRenderT = (n: number, S: number): Float32Array => {
  const RN = renderSide(n, S);
  const t = new Float32Array(RN * RN);
  for (let j = 0; j < RN; j++) for (let i = 0; i < RN; i++) t[j * RN + i] = RN > 1 ? i / (RN - 1) : 0;
  return t;
};

/** The render grid's triangle index buffer (two tris per cell), matching LiquifyMesh's winding. */
export const buildRenderIndices = (n: number, S: number): Uint32Array => {
  const RN = renderSide(n, S);
  const idx = new Uint32Array((RN - 1) * (RN - 1) * 6);
  let p = 0;
  for (let y = 0; y < RN - 1; y++) {
    for (let x = 0; x < RN - 1; x++) {
      const a = y * RN + x, b = a + 1, c = a + RN, d = c + 1;
      idx[p++] = a; idx[p++] = b; idx[p++] = c;
      idx[p++] = c; idx[p++] = b; idx[p++] = d;
    }
  }
  return idx;
};
