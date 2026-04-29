// dc-core.ts — Uniform-grid Dual Contouring mesh extraction from SDF grid
// Converted from prototype dc-core.js
//
// Provides:
//   GrowableFloat32, GrowableUint32 — growable typed arrays
//   sdfAt, sdfLerp, sdfGradient — SDF grid helpers
//   gridToWorld, worldToGrid — coordinate conversion
//   EDGE_TABLE — 12 cube edges
//   solveQEF — QEF solver (3x3 Cramer's rule)
//   dualContour — dense uniform-grid dual contouring

// ============================================================================
// Growable Typed Arrays
// ============================================================================

export class GrowableFloat32 {
  data: Float32Array;
  length: number;

  constructor(initialCap: number = 65536) {
    this.data = new Float32Array(initialCap);
    this.length = 0;
  }

  push3(a: number, b: number, c: number): void {
    if (this.length + 3 > this.data.length) {
      const newCap = this.data.length * 2;
      const nd = new Float32Array(newCap);
      nd.set(this.data);
      this.data = nd;
    }
    this.data[this.length++] = a;
    this.data[this.length++] = b;
    this.data[this.length++] = c;
  }

  trim(): Float32Array {
    return this.data.subarray(0, this.length);
  }
}

export class GrowableUint32 {
  data: Uint32Array;
  length: number;

  constructor(initialCap: number = 65536) {
    this.data = new Uint32Array(initialCap);
    this.length = 0;
  }

  push3(a: number, b: number, c: number): void {
    if (this.length + 3 > this.data.length) {
      const newCap = this.data.length * 2;
      const nd = new Uint32Array(newCap);
      nd.set(this.data);
      this.data = nd;
    }
    this.data[this.length++] = a;
    this.data[this.length++] = b;
    this.data[this.length++] = c;
  }

  trim(): Uint32Array {
    return this.data.subarray(0, this.length);
  }
}

// ============================================================================
// Mesh Result Type
// ============================================================================

export interface DCMeshResult {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
  faceCount: number;
}

// ============================================================================
// SDF Grid Helpers
// ============================================================================

/** Sample SDF at integer grid coordinates, clamped to [0, N-1]. */
export function sdfAt(grid: Float32Array, N: number, ix: number, iy: number, iz: number): number {
  ix = ix | 0; iy = iy | 0; iz = iz | 0;
  ix = ix < 0 ? 0 : ix >= N ? N - 1 : ix;
  iy = iy < 0 ? 0 : iy >= N ? N - 1 : iy;
  iz = iz < 0 ? 0 : iz >= N ? N - 1 : iz;
  return grid[(iz * N + iy) * N + ix];
}

/** Trilinear interpolation at fractional grid coordinates. */
export function sdfLerp(grid: Float32Array, N: number, fx: number, fy: number, fz: number): number {
  const x0 = Math.floor(fx), y0 = Math.floor(fy), z0 = Math.floor(fz);
  const tx = fx - x0, ty = fy - y0, tz = fz - z0;
  const c000 = sdfAt(grid, N, x0, y0, z0),     c100 = sdfAt(grid, N, x0+1, y0, z0);
  const c010 = sdfAt(grid, N, x0, y0+1, z0),   c110 = sdfAt(grid, N, x0+1, y0+1, z0);
  const c001 = sdfAt(grid, N, x0, y0, z0+1),   c101 = sdfAt(grid, N, x0+1, y0, z0+1);
  const c011 = sdfAt(grid, N, x0, y0+1, z0+1), c111 = sdfAt(grid, N, x0+1, y0+1, z0+1);
  const c00 = c000 * (1 - tx) + c100 * tx, c10 = c010 * (1 - tx) + c110 * tx;
  const c01 = c001 * (1 - tx) + c101 * tx, c11 = c011 * (1 - tx) + c111 * tx;
  const c0 = c00 * (1 - ty) + c10 * ty, c1 = c01 * (1 - ty) + c11 * ty;
  return c0 * (1 - tz) + c1 * tz;
}

/** Normalized SDF gradient via central differences at fractional grid coords. */
export function sdfGradient(grid: Float32Array, N: number, fx: number, fy: number, fz: number): [number, number, number] {
  const h = 0.5;
  const gx = sdfLerp(grid, N, fx+h, fy, fz) - sdfLerp(grid, N, fx-h, fy, fz);
  const gy = sdfLerp(grid, N, fx, fy+h, fz) - sdfLerp(grid, N, fx, fy-h, fz);
  const gz = sdfLerp(grid, N, fx, fy, fz+h) - sdfLerp(grid, N, fx, fy, fz-h);
  const len = Math.sqrt(gx*gx + gy*gy + gz*gz);
  if (len < 1e-10) return [0, 1, 0];
  const inv = 1 / len;
  return [gx * inv, gy * inv, gz * inv];
}

/** Convert a grid-space coordinate (fractional) to world-space. */
export function gridToWorld(gx: number, N: number, gridMin: number, gridMax: number): number {
  return gridMin + (gx / (N - 1)) * (gridMax - gridMin);
}

/** Convert a world-space coordinate to fractional grid-space. */
export function worldToGrid(wx: number, N: number, gridMin: number, gridMax: number): number {
  return ((wx - gridMin) / (gridMax - gridMin)) * (N - 1);
}

// ============================================================================
// Edge Table — 12 edges of a cube
// Corner index: bit 0 = x, bit 1 = y, bit 2 = z
// ============================================================================

export const EDGE_TABLE: ReadonlyArray<[number, number]> = [
  [0, 1], [2, 3], [4, 5], [6, 7],   // 4 edges along X
  [0, 2], [1, 3], [4, 6], [5, 7],   // 4 edges along Y
  [0, 4], [1, 5], [2, 6], [3, 7]    // 4 edges along Z
];

// ============================================================================
// QEF Solver (3x3 via Cramer's rule with Tikhonov regularization)
// ============================================================================

interface Crossing {
  point: [number, number, number];
  normal: [number, number, number];
}

/**
 * Solve QEF from edge crossings.
 * Returns [vx, vy, vz] or null.
 */
export function solveQEF(
  crossings: Crossing[],
  cellMin: [number, number, number],
  cellMax: [number, number, number]
): [number, number, number] | null {
  if (crossings.length === 0) return null;

  // Mass point (centroid of crossing positions)
  let mpx = 0, mpy = 0, mpz = 0;
  for (let i = 0; i < crossings.length; i++) {
    mpx += crossings[i].point[0];
    mpy += crossings[i].point[1];
    mpz += crossings[i].point[2];
  }
  const invN = 1.0 / crossings.length;
  mpx *= invN; mpy *= invN; mpz *= invN;

  // Build ATA (3x3 symmetric) and ATb (3x1)
  let a00 = 0, a01 = 0, a02 = 0;
  let a11 = 0, a12 = 0, a22 = 0;
  let b0 = 0, b1 = 0, b2 = 0;

  for (let i = 0; i < crossings.length; i++) {
    const n = crossings[i].normal, p = crossings[i].point;
    const d = n[0] * p[0] + n[1] * p[1] + n[2] * p[2];
    a00 += n[0] * n[0]; a01 += n[0] * n[1]; a02 += n[0] * n[2];
    a11 += n[1] * n[1]; a12 += n[1] * n[2]; a22 += n[2] * n[2];
    b0 += n[0] * d; b1 += n[1] * d; b2 += n[2] * d;
  }

  // Tikhonov regularization toward mass point
  const reg = 0.01;
  a00 += reg; a11 += reg; a22 += reg;
  b0 += reg * mpx; b1 += reg * mpy; b2 += reg * mpz;

  // Cramer's rule for 3x3 symmetric system
  const det = a00 * (a11 * a22 - a12 * a12)
            - a01 * (a01 * a22 - a12 * a02)
            + a02 * (a01 * a12 - a11 * a02);

  let vx: number, vy: number, vz: number;
  if (Math.abs(det) < 1e-6) {
    vx = mpx; vy = mpy; vz = mpz;
  } else {
    const inv = 1.0 / det;
    vx = inv * (b0 * (a11 * a22 - a12 * a12) - a01 * (b1 * a22 - a12 * b2) + a02 * (b1 * a12 - a11 * b2));
    vy = inv * (a00 * (b1 * a22 - a12 * b2) - b0 * (a01 * a22 - a12 * a02) + a02 * (a01 * b2 - b1 * a02));
    vz = inv * (a00 * (a11 * b2 - b1 * a12) - a01 * (a01 * b2 - b1 * a02) + b0 * (a01 * a12 - a11 * a02));
  }

  // Clamp to cell bounds + 10% margin
  const mx = (cellMax[0] - cellMin[0]) * 0.1;
  const my = (cellMax[1] - cellMin[1]) * 0.1;
  const mz = (cellMax[2] - cellMin[2]) * 0.1;
  vx = Math.max(cellMin[0] - mx, Math.min(cellMax[0] + mx, vx));
  vy = Math.max(cellMin[1] - my, Math.min(cellMax[1] + my, vy));
  vz = Math.max(cellMin[2] - mz, Math.min(cellMax[2] + mz, vz));

  return [vx, vy, vz];
}

// ============================================================================
// Cancellation support
// ============================================================================

let cancelRequested = false;

export function requestCancel(): void { cancelRequested = true; }
export function resetCancel(): void { cancelRequested = false; }

function tick(): Promise<void> {
  return new Promise<void>(r => setTimeout(r, 0)).then(() => {
    if (cancelRequested) throw new Error('CANCELLED');
  });
}

// ============================================================================
// Uniform-Grid Dual Contouring (async, yields to prevent UI freezing)
// ============================================================================

export type ProgressCallback = (phase: string, percent: number) => void;

/**
 * Extract a triangle mesh from a dense SDF grid using dual contouring.
 */
export async function dualContour(
  sdfGrid: Float32Array,
  N: number,
  gridMin: [number, number, number],
  gridMax: [number, number, number],
  _maxDepth: number,
  onProgress: ProgressCallback = () => {}
): Promise<DCMeshResult> {
  const M = N - 1; // cells per axis

  // ---- Phase 1: Find sign-change cells, compute vertices ----
  onProgress('contouring', 0);
  const vertexMap = new Map<number, number>();
  const posArr = new GrowableFloat32(8192);
  const normArr = new GrowableFloat32(8192);
  let vertexCount = 0;

  for (let iz = 0; iz < M; iz++) {
    if ((iz & 7) === 0) {
      onProgress('contouring', Math.round(40 * iz / M));
      await tick();
    }
    for (let iy = 0; iy < M; iy++) {
      for (let ix = 0; ix < M; ix++) {
        const s0 = sdfGrid[(iz * N + iy) * N + ix];
        const sign0 = s0 >= 0;
        const s = [s0,
          sdfGrid[(iz * N + iy) * N + ix + 1],
          sdfGrid[(iz * N + (iy + 1)) * N + ix],
          sdfGrid[(iz * N + (iy + 1)) * N + ix + 1],
          sdfGrid[((iz + 1) * N + iy) * N + ix],
          sdfGrid[((iz + 1) * N + iy) * N + ix + 1],
          sdfGrid[((iz + 1) * N + (iy + 1)) * N + ix],
          sdfGrid[((iz + 1) * N + (iy + 1)) * N + ix + 1]
        ];
        let hasChange = false;
        for (let ci = 1; ci < 8; ci++) {
          if ((s[ci] >= 0) !== sign0) { hasChange = true; break; }
        }
        if (!hasChange) continue;

        const crossings: Crossing[] = [];
        for (let ei = 0; ei < 12; ei++) {
          const e = EDGE_TABLE[ei];
          const s0v = s[e[0]], s1v = s[e[1]];
          if ((s0v >= 0) === (s1v >= 0)) continue;

          const c0x = ix + (e[0] & 1), c0y = iy + ((e[0] >> 1) & 1), c0z = iz + ((e[0] >> 2) & 1);
          const c1x = ix + (e[1] & 1), c1y = iy + ((e[1] >> 1) & 1), c1z = iz + ((e[1] >> 2) & 1);

          // Binary search for zero-crossing on trilinearly interpolated SDF
          let lo0 = c0x, lo1 = c0y, lo2 = c0z, hi0 = c1x, hi1 = c1y, hi2 = c1z;
          let sLo = s0v, sHi = s1v;
          for (let bsi = 0; bsi < 8; bsi++) {
            const mx = (lo0 + hi0) * 0.5, my = (lo1 + hi1) * 0.5, mz = (lo2 + hi2) * 0.5;
            const sm = sdfLerp(sdfGrid, N, mx, my, mz);
            if ((sm >= 0) === (sLo >= 0)) { lo0 = mx; lo1 = my; lo2 = mz; sLo = sm; }
            else { hi0 = mx; hi1 = my; hi2 = mz; sHi = sm; }
          }
          const px = (lo0 + hi0) * 0.5, py = (lo1 + hi1) * 0.5, pz = (lo2 + hi2) * 0.5;
          const grad = sdfGradient(sdfGrid, N, px, py, pz);
          crossings.push({
            point: [gridToWorld(px, N, gridMin[0], gridMax[0]), gridToWorld(py, N, gridMin[1], gridMax[1]), gridToWorld(pz, N, gridMin[2], gridMax[2])],
            normal: grad
          });
        }
        if (crossings.length === 0) continue;

        const cMin: [number, number, number] = [gridToWorld(ix, N, gridMin[0], gridMax[0]), gridToWorld(iy, N, gridMin[1], gridMax[1]), gridToWorld(iz, N, gridMin[2], gridMax[2])];
        const cMax: [number, number, number] = [gridToWorld(ix + 1, N, gridMin[0], gridMax[0]), gridToWorld(iy + 1, N, gridMin[1], gridMax[1]), gridToWorld(iz + 1, N, gridMin[2], gridMax[2])];
        const v = solveQEF(crossings, cMin, cMax);
        if (!v) continue;

        const grad2 = sdfGradient(sdfGrid, N, worldToGrid(v[0], N, gridMin[0], gridMax[0]), worldToGrid(v[1], N, gridMin[1], gridMax[1]), worldToGrid(v[2], N, gridMin[2], gridMax[2]));
        const key = (iz * M + iy) * M + ix;
        vertexMap.set(key, vertexCount);
        posArr.push3(v[0], v[1], v[2]);
        normArr.push3(grad2[0], grad2[1], grad2[2]);
        vertexCount++;
      }
    }
  }

  onProgress('contouring', 50);
  console.log('DC: ' + vertexCount + ' vertices from ' + vertexMap.size + ' cells');

  if (vertexCount === 0) {
    return { positions: new Float32Array(0), normals: new Float32Array(0), indices: new Uint32Array(0), vertexCount: 0, faceCount: 0 };
  }

  // ---- Phase 2: Generate faces from grid edges ----
  const faces = new GrowableUint32(8192);
  const processedEdges = new Set<number>();
  let edgeCount = 0, droppedCount = 0;
  let phase2Count = 0;
  const phase2Total = vertexMap.size;

  const vmEntries = Array.from(vertexMap.entries());

  for (let vmi = 0; vmi < vmEntries.length; vmi++) {
    const vidx = vmEntries[vmi][1];
    const key = vmEntries[vmi][0];
    phase2Count++;

    const ix = key % M;
    const iy = ((key / M) | 0) % M;
    const iz = (key / (M * M)) | 0;

    for (let ei = 0; ei < 12; ei++) {
      const e = EDGE_TABLE[ei];
      const c0x = ix + (e[0] & 1), c0y = iy + ((e[0] >> 1) & 1), c0z = iz + ((e[0] >> 2) & 1);
      const c1x = ix + (e[1] & 1), c1y = iy + ((e[1] >> 1) & 1), c1z = iz + ((e[1] >> 2) & 1);

      const sv0 = sdfGrid[(c0z * N + c0y) * N + c0x];
      const sv1 = sdfGrid[(c1z * N + c1y) * N + c1x];
      if ((sv0 >= 0) === (sv1 >= 0)) continue;

      let axis: number;
      const eMinX = Math.min(c0x, c1x), eMinY = Math.min(c0y, c1y), eMinZ = Math.min(c0z, c1z);
      if (c0x !== c1x) axis = 0;
      else if (c0y !== c1y) axis = 1;
      else axis = 2;

      const edgeKey = (eMinZ * N + eMinY) * N * 4 + eMinX * 4 + axis;
      if (processedEdges.has(edgeKey)) continue;
      processedEdges.add(edgeKey);
      edgeCount++;

      const ax1 = (axis + 1) % 3, ax2 = (axis + 2) % 3;
      const ePos = [eMinX, eMinY, eMinZ];

      const vi = [-1, -1, -1, -1];
      let allFound = true;
      for (let qi = 0; qi < 4; qi++) {
        const cc = [ePos[0], ePos[1], ePos[2]];
        cc[ax1] -= (qi & 1) ? 0 : 1;
        cc[ax2] -= (qi & 2) ? 0 : 1;
        if (cc[0] < 0 || cc[1] < 0 || cc[2] < 0 || cc[0] >= M || cc[1] >= M || cc[2] >= M) { allFound = false; break; }
        const ckey = (cc[2] * M + cc[1]) * M + cc[0];
        const v = vertexMap.get(ckey);
        if (v === undefined) { allFound = false; break; }
        vi[qi] = v;
      }
      if (!allFound) { droppedCount++; continue; }

      const flip = sv0 >= 0;
      if (vi[0] !== vi[1] && vi[0] !== vi[3] && vi[1] !== vi[3]) {
        if (flip) faces.push3(vi[0], vi[3], vi[1]); else faces.push3(vi[0], vi[1], vi[3]);
      }
      if (vi[0] !== vi[2] && vi[0] !== vi[3] && vi[2] !== vi[3]) {
        if (flip) faces.push3(vi[0], vi[2], vi[3]); else faces.push3(vi[0], vi[3], vi[2]);
      }
    }

    // Yield to UI every 4096 vertices
    if ((phase2Count & 0xFFF) === 0) {
      onProgress('contouring', 50 + Math.round(50 * phase2Count / phase2Total));
      await tick();
    }
  }

  onProgress('contouring', 100);
  console.log('DC: ' + edgeCount + ' sign-change edges, ' + droppedCount + ' dropped (boundary), ' + faces.length / 3 + ' faces');

  const positions = posArr.trim();
  const normals = normArr.trim();
  const indices = faces.trim();
  const faceCount = Math.floor(faces.length / 3);
  return { positions, normals, indices, vertexCount, faceCount };
}
