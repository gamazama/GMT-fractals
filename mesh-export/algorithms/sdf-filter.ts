// sdf-filter.ts — SDF filtering: min feature size, morphological closing, cavity fill
// Converted from prototype sdf-filter.js
// GMT Fractal Explorer — mesh export

import type { SparseSDFGrid } from './sparse-grid';

// ============================================================================
// Min Feature Size
// ============================================================================

/**
 * Minimum feature size: flip deeply interior cells to positive (outside).
 * Any cell with sdf < -threshold is set to +threshold, eliminating zero-crossings
 * deeper than threshold from the surface.
 */
export function applyMinFeatureDense(grid: Float32Array, _N: number, threshold: number): number {
  let clamped = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] < -threshold) { grid[i] = threshold; clamped++; }
  }
  return clamped;
}

/**
 * Minimum feature size for sparse grid.
 * Flips deeply interior cells to positive in allocated blocks only.
 */
export function applyMinFeatureSparse(sparseGrid: SparseSDFGrid, threshold: number): number {
  let clamped = 0;
  sparseGrid.blocks.forEach((block) => {
    for (let i = 0; i < block.length; i++) {
      if (block[i] < -threshold) { block[i] = threshold; clamped++; }
    }
  });
  return clamped;
}

// ============================================================================
// Morphological Closing
// ============================================================================

/**
 * 3D separable filter (min or max) on a dense Float32Array grid.
 * Applies the filter along X, Y, Z axes sequentially.
 */
export function separableFilter(
  src: Float32Array, dst: Float32Array, N: number, radius: number,
  op: (a: number, b: number) => number
): void {
  // Pass along X
  const tmp1 = new Float32Array(src.length);
  for (let z = 0; z < N; z++) {
    for (let y = 0; y < N; y++) {
      const row = z * N * N + y * N;
      for (let x = 0; x < N; x++) {
        let best = src[row + x];
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx >= 0 && nx < N) best = op(best, src[row + nx]);
        }
        tmp1[row + x] = best;
      }
    }
  }
  // Pass along Y
  const tmp2 = new Float32Array(src.length);
  for (let z = 0; z < N; z++) {
    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) {
        const idx = z * N * N + y * N + x;
        let best = tmp1[idx];
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = y + dy;
          if (ny >= 0 && ny < N) best = op(best, tmp1[z * N * N + ny * N + x]);
        }
        tmp2[idx] = best;
      }
    }
  }
  // Pass along Z
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      for (let z = 0; z < N; z++) {
        const idx = z * N * N + y * N + x;
        let best = tmp2[idx];
        for (let dz = -radius; dz <= radius; dz++) {
          const nz = z + dz;
          if (nz >= 0 && nz < N) best = op(best, tmp2[nz * N * N + y * N + x]);
        }
        dst[idx] = best;
      }
    }
  }
}

/**
 * Morphological closing on a dense grid: dilate (subtract radius) then erode (add radius).
 * radius is in voxels (integer).
 */
export async function morphCloseDense(
  grid: Float32Array, N: number, radius: number,
  onProgress?: (pct: number) => void
): Promise<void> {
  const progress = onProgress || (() => {});
  if (radius <= 0) return;
  const r = Math.round(radius);
  const len = N * N * N;
  const tmp = new Float32Array(len);

  progress(0);
  separableFilter(grid, tmp, N, r, Math.min);
  progress(25);
  await new Promise<void>((re) => { setTimeout(re, 0); });

  separableFilter(tmp, grid, N, r, Math.max);
  progress(50);
}

/**
 * Morphological closing on a sparse grid.
 * Operates block-by-block with neighbor lookups for boundary cells.
 * radius is in voxels.
 */
export async function morphCloseSparse(
  sparseGrid: SparseSDFGrid, radius: number,
  onProgress?: (pct: number) => void
): Promise<void> {
  const progress = onProgress || (() => {});
  if (radius <= 0) return;
  const r = Math.round(radius);
  const N = sparseGrid.N;
  const bs = sparseGrid.blockSize;

  for (let pass = 0; pass < 2; pass++) {
    const op = pass === 0 ? Math.min : Math.max;
    const result = new Map<number, Float32Array>();

    sparseGrid.blocks.forEach((block, key) => {
      const filtered = new Float32Array(block.length);
      const bpa = sparseGrid.blocksPerAxis;
      const bx = key % bpa;
      const by = ((key / bpa) | 0) % bpa;
      const bz = (key / (bpa * bpa)) | 0;
      const startX = bx * bs, startY = by * bs, startZ = bz * bs;

      for (let lz = 0; lz < bs; lz++) {
        for (let ly = 0; ly < bs; ly++) {
          for (let lx = 0; lx < bs; lx++) {
            let best = block[(lz * bs + ly) * bs + lx];
            for (let dz = -r; dz <= r; dz++) {
              for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                  const gx = startX + lx + dx, gy = startY + ly + dy, gz = startZ + lz + dz;
                  best = op(best, sparseGrid.get(gx, gy, gz));
                }
              }
            }
            filtered[(lz * bs + ly) * bs + lx] = best;
          }
        }
      }
      result.set(key, filtered);
    });

    result.forEach((block, key) => {
      sparseGrid.blocks.set(key, block);
    });

    progress(pass === 0 ? 50 : 100);
    await new Promise<void>((re) => { setTimeout(re, 0); });
  }
}

// ============================================================================
// Cavity Fill — Dense Grid
// ============================================================================

/**
 * Cavity fill for dense grid. Flood-fill from grid boundary through positive
 * (outside) cells. Any positive cell not reached is an interior cavity → flip negative.
 */
export async function cavityFillDense(
  grid: Float32Array, N: number,
  onProgress?: (pct: number) => void,
  checkCancel?: () => void
): Promise<number> {
  const progress = onProgress || (() => {});
  const cancel = checkCancel || (() => {});
  const totalCells = N * N * N;
  const visitedBytes = (totalCells + 7) >> 3;
  const visited = new Uint8Array(visitedBytes);

  const idx = (x: number, y: number, z: number) => (z * N + y) * N + x;
  const isVisited = (i: number) => (visited[i >> 3] & (1 << (i & 7))) !== 0;
  const setVisited = (i: number) => { visited[i >> 3] |= (1 << (i & 7)); };

  let queueCap = Math.min(totalCells, 4 * 1024 * 1024);
  let queue = new Int32Array(queueCap);
  let qHead = 0, qTail = 0, qCount = 0;

  const enqueue = (i: number) => {
    if (qCount >= queueCap) {
      const newCap = queueCap * 2;
      const newQ = new Int32Array(newCap);
      for (let qi = 0; qi < qCount; qi++) newQ[qi] = queue[(qHead + qi) % queueCap];
      queue = newQ; qHead = 0; qTail = qCount; queueCap = newCap;
    }
    queue[qTail] = i;
    qTail = (qTail + 1) % queueCap;
    qCount++;
  };

  const dequeue = (): number => {
    const val = queue[qHead];
    qHead = (qHead + 1) % queueCap;
    qCount--;
    return val;
  };

  // Seed: all positive cells on the 6 boundary faces
  for (let z = 0; z < N; z++) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (x === 0 || x === N - 1 || y === 0 || y === N - 1 || z === 0 || z === N - 1) {
          const i = idx(x, y, z);
          if (grid[i] >= 0 && !isVisited(i)) {
            setVisited(i);
            enqueue(i);
          }
        }
      }
    }
  }

  progress(5);

  let processed = 0;
  const NX = [- 1, 1, 0, 0, 0, 0];
  const NY = [0, 0, -1, 1, 0, 0];
  const NZ = [0, 0, 0, 0, -1, 1];

  while (qCount > 0) {
    const ci = dequeue();
    const cx = ci % N;
    const cy = ((ci / N) | 0) % N;
    const cz = (ci / (N * N)) | 0;

    for (let ni = 0; ni < 6; ni++) {
      const nxx = cx + NX[ni], nyy = cy + NY[ni], nzz = cz + NZ[ni];
      if (nxx < 0 || nyy < 0 || nzz < 0 || nxx >= N || nyy >= N || nzz >= N) continue;
      const nIdx = idx(nxx, nyy, nzz);
      if (isVisited(nIdx)) continue;
      if (grid[nIdx] >= 0) {
        setVisited(nIdx);
        enqueue(nIdx);
      }
    }

    processed++;
    if ((processed & 0xFFFFF) === 0) {
      progress(5 + Math.round(85 * processed / totalCells));
      await new Promise<void>((r) => { setTimeout(r, 0); });
      cancel();
    }
  }

  // Any positive cell not visited = interior cavity → flip to negative
  let filled = 0;
  for (let i = 0; i < totalCells; i++) {
    if (grid[i] >= 0 && !isVisited(i)) {
      grid[i] = -Math.abs(grid[i]) - 0.001;
      filled++;
    }
  }

  progress(100);
  return filled;
}

// ============================================================================
// Cavity Fill — Sparse Grid (Dilate + Flood)
// ============================================================================

export interface CavityFillResult {
  filled: number;
  dilated: number;
  seeds: number;
}

/**
 * Dilate-then-flood cavity fill for sparse grids.
 * 1. BFS-dilate interior (SDF<0) outward by `radius` voxels
 * 2. Flood fill from boundary through non-dilated cells
 * 3. Unreachable positive cells = sealed cavities → flip to negative
 */
export async function cavityFillDilate(
  sparseGrid: SparseSDFGrid, radius: number,
  onProgress?: (pct: number) => void,
  checkCancel?: () => void
): Promise<CavityFillResult> {
  const progress = onProgress || (() => {});
  const cancel = checkCancel || (() => {});
  const N = sparseGrid.N;
  const bs = sparseGrid.blockSize;
  const bpa = sparseGrid.blocksPerAxis;
  const bytesPerBlock = (sparseGrid.blockCellCount + 7) >> 3;

  function bitGet(map: Map<number, Uint8Array>, ix: number, iy: number, iz: number): boolean {
    if (ix < 0 || iy < 0 || iz < 0 || ix >= N || iy >= N || iz >= N) return false;
    const bx = (ix / bs) | 0, by = (iy / bs) | 0, bz = (iz / bs) | 0;
    const bk = (bz * bpa + by) * bpa + bx;
    const bits = map.get(bk);
    if (!bits) return false;
    const lx = ix - bx * bs, ly = iy - by * bs, lz = iz - bz * bs;
    const li = (lz * bs + ly) * bs + lx;
    return (bits[li >> 3] & (1 << (li & 7))) !== 0;
  }

  function bitSet(map: Map<number, Uint8Array>, ix: number, iy: number, iz: number): void {
    const bx = (ix / bs) | 0, by = (iy / bs) | 0, bz = (iz / bs) | 0;
    const bk = (bz * bpa + by) * bpa + bx;
    const bits = map.get(bk);
    if (!bits) return;
    const lx = ix - bx * bs, ly = iy - by * bs, lz = iz - bz * bs;
    const li = (lz * bs + ly) * bs + lx;
    bits[li >> 3] |= (1 << (li & 7));
  }

  // Growable BFS queue with distance tracking (for dilation)
  let dqCap = 2 * 1024 * 1024;
  let dqCoords = new Int32Array(dqCap);
  let dqDist = new Uint8Array(dqCap);
  let dqHead = 0, dqTail = 0;

  function dqGrow(): void {
    const count = dqTail - dqHead;
    const newCap = dqCap * 2;
    const newC = new Int32Array(newCap);
    const newD = new Uint8Array(newCap);
    for (let i = 0; i < count; i++) {
      newC[i] = dqCoords[(dqHead + i) % dqCap];
      newD[i] = dqDist[(dqHead + i) % dqCap];
    }
    dqCoords = newC; dqDist = newD; dqHead = 0; dqTail = count; dqCap = newCap;
  }

  function dqPush(coord: number, dist: number): void {
    if (dqTail - dqHead >= dqCap - 1) dqGrow();
    dqCoords[dqTail % dqCap] = coord;
    dqDist[dqTail % dqCap] = dist;
    dqTail++;
  }

  function dqPop(): { coord: number; dist: number } {
    const c = dqCoords[dqHead % dqCap];
    const d = dqDist[dqHead % dqCap];
    dqHead++;
    return { coord: c, dist: d };
  }

  // Growable BFS queue (coords only, for flood fill)
  let qCap = 2 * 1024 * 1024;
  let qBuf = new Int32Array(qCap);
  let qHead = 0, qTail = 0;

  function qGrow(): void {
    const count = qTail - qHead;
    const newCap = qCap * 2;
    const newBuf = new Int32Array(newCap);
    for (let i = 0; i < count; i++) newBuf[i] = qBuf[(qHead + i) % qCap];
    qBuf = newBuf; qHead = 0; qTail = count; qCap = newCap;
  }

  function qPush(v: number): void {
    if (qTail - qHead >= qCap - 1) qGrow();
    qBuf[qTail++ % qCap] = v;
  }

  function qPop(): number { return qBuf[qHead++ % qCap]; }

  // ---- Step 1: Build sign field (1 = inside where SDF < 0) ----
  const signMap = new Map<number, Uint8Array>();
  sparseGrid.blocks.forEach((block, key) => {
    const bits = new Uint8Array(bytesPerBlock);
    for (let i = 0; i < block.length; i++) {
      if (block[i] < 0) bits[i >> 3] |= (1 << (i & 7));
    }
    signMap.set(key, bits);
  });

  // ---- Step 2: BFS DILATE interior by R voxels ----
  let dilateSeeds = 0;

  sparseGrid.blocks.forEach((block, key) => {
    const bx = key % bpa, by = ((key / bpa) | 0) % bpa, bz = (key / (bpa * bpa)) | 0;
    const startX = bx * bs, startY = by * bs, startZ = bz * bs;
    for (let lz = 0; lz < bs; lz++) {
      for (let ly = 0; ly < bs; ly++) {
        for (let lx = 0; lx < bs; lx++) {
          const li = (lz * bs + ly) * bs + lx;
          if (block[li] < 0) continue;
          const ix = startX + lx, iy = startY + ly, iz = startZ + lz;
          let adjNeg = false;
          for (let d = 0; d < 6 && !adjNeg; d++) {
            const nx = ix + (d === 0 ? -1 : d === 1 ? 1 : 0);
            const ny = iy + (d === 2 ? -1 : d === 3 ? 1 : 0);
            const nz = iz + (d === 4 ? -1 : d === 5 ? 1 : 0);
            if (sparseGrid.get(nx, ny, nz) < 0) adjNeg = true;
          }
          if (adjNeg) {
            bitSet(signMap, ix, iy, iz);
            dqPush((iz * N + iy) * N + ix, 1);
            dilateSeeds++;
          }
        }
      }
    }
  });

  console.log('[CavityFill] Dilate by ' + radius + ': ' + dilateSeeds + ' surface seeds');
  progress(5);
  let dilatedCount = 0, dilPops = 0;
  while (dqHead < dqTail) {
    const item = dqPop();
    const ci = item.coord, dist = item.dist;
    const cx = ci % N, cy = ((ci / N) | 0) % N, cz = (ci / (N * N)) | 0;
    for (let d = 0; d < 6; d++) {
      const nx = cx + (d === 0 ? -1 : d === 1 ? 1 : 0);
      const ny = cy + (d === 2 ? -1 : d === 3 ? 1 : 0);
      const nz = cz + (d === 4 ? -1 : d === 5 ? 1 : 0);
      if (nx < 0 || ny < 0 || nz < 0 || nx >= N || ny >= N || nz >= N) continue;
      if (bitGet(signMap, nx, ny, nz)) continue;
      bitSet(signMap, nx, ny, nz);
      dilatedCount++;
      if (dist + 1 < radius) dqPush((nz * N + ny) * N + nx, dist + 1);
    }
    if ((++dilPops & 0x3FFFF) === 0) {
      progress(5 + Math.round(20 * Math.min(1, dilatedCount / (dilateSeeds * radius + 1))));
      await new Promise<void>((r) => { setTimeout(r, 0); });
      cancel();
    }
  }
  console.log('[CavityFill] Dilate done: ' + dilatedCount + ' cells expanded');
  progress(30);

  // ---- Step 3: Flood fill from boundary through non-signMap cells ----
  const floodVisited = new Map<number, Uint8Array>();
  sparseGrid.blocks.forEach((_block, key) => {
    floodVisited.set(key, new Uint8Array(bytesPerBlock));
  });

  sparseGrid.blocks.forEach((_block, key) => {
    const signBits = signMap.get(key)!;
    const bx = key % bpa, by = ((key / bpa) | 0) % bpa, bz = (key / (bpa * bpa)) | 0;
    const startX = bx * bs, startY = by * bs, startZ = bz * bs;
    for (let lz = 0; lz < bs; lz++) {
      for (let ly = 0; ly < bs; ly++) {
        for (let lx = 0; lx < bs; lx++) {
          const li = (lz * bs + ly) * bs + lx;
          if (signBits[li >> 3] & (1 << (li & 7))) continue;
          const ix = startX + lx, iy = startY + ly, iz = startZ + lz;
          let isSeed = false;
          if (ix === 0 || ix === N - 1 || iy === 0 || iy === N - 1 || iz === 0 || iz === N - 1) {
            isSeed = true;
          } else if (lx === 0 || lx === bs - 1 || ly === 0 || ly === bs - 1 || lz === 0 || lz === bs - 1) {
            for (let d = 0; d < 6 && !isSeed; d++) {
              const nx = ix + (d === 0 ? -1 : d === 1 ? 1 : 0);
              const ny = iy + (d === 2 ? -1 : d === 3 ? 1 : 0);
              const nz = iz + (d === 4 ? -1 : d === 5 ? 1 : 0);
              const nbx = (nx / bs) | 0, nby = (ny / bs) | 0, nbz = (nz / bs) | 0;
              if (!sparseGrid.hasBlock(nbx, nby, nbz)) isSeed = true;
            }
          }
          if (isSeed) {
            const fv = floodVisited.get(key)!;
            fv[li >> 3] |= (1 << (li & 7));
            qPush((iz * N + iy) * N + ix);
          }
        }
      }
    }
  });

  const floodSeeds = qTail;
  console.log('[CavityFill] Flood fill: ' + floodSeeds + ' boundary seeds');
  progress(40);
  let flooded = 0, floodPops = 0;
  while (qHead < qTail) {
    const ci = qPop();
    const cx = ci % N, cy = ((ci / N) | 0) % N, cz = (ci / (N * N)) | 0;
    for (let d = 0; d < 6; d++) {
      const nx = cx + (d === 0 ? -1 : d === 1 ? 1 : 0);
      const ny = cy + (d === 2 ? -1 : d === 3 ? 1 : 0);
      const nz = cz + (d === 4 ? -1 : d === 5 ? 1 : 0);
      if (nx < 0 || ny < 0 || nz < 0 || nx >= N || ny >= N || nz >= N) continue;
      const nbx = (nx / bs) | 0, nby = (ny / bs) | 0, nbz = (nz / bs) | 0;
      const nbk = (nbz * bpa + nby) * bpa + nbx;
      const nlx = nx - nbx * bs, nly = ny - nby * bs, nlz = nz - nbz * bs;
      const nli = (nlz * bs + nly) * bs + nlx;
      const fv = floodVisited.get(nbk);
      if (!fv) continue;
      if (fv[nli >> 3] & (1 << (nli & 7))) continue;
      if (bitGet(signMap, nx, ny, nz)) continue;
      fv[nli >> 3] |= (1 << (nli & 7));
      qPush((nz * N + ny) * N + nx);
      flooded++;
    }
    if ((++floodPops & 0x3FFFF) === 0) {
      progress(40 + Math.round(40 * flooded / (flooded + (qTail - qHead) + 1)));
      await new Promise<void>((r) => { setTimeout(r, 0); });
      cancel();
    }
  }
  console.log('[CavityFill] Flood done: ' + flooded + ' cells reached');
  progress(85);

  // ---- Step 4: Fill unreachable positive cells ----
  let filled = 0;
  sparseGrid.blocks.forEach((block, key) => {
    const vis = floodVisited.get(key)!;
    for (let i = 0; i < block.length; i++) {
      if (block[i] >= 0 && !(vis[i >> 3] & (1 << (i & 7)))) {
        block[i] = -Math.abs(block[i]) - 0.001;
        filled++;
      }
    }
  });

  progress(100);
  console.log('[CavityFill] Filled: ' + filled + ' cavity cells');
  return { filled, dilated: dilatedCount, seeds: dilateSeeds };
}
