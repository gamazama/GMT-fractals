// sparse-grid.ts — Block-sparse SDF grid for narrow-band multi-resolution sampling
// Converted from prototype sparse-grid.js
//
// Provides:
//   SparseSDFGrid — block-based sparse storage
//   buildNarrowBand — identify surface-adjacent blocks from coarse grid
//   forEachBandBlock — iterate allocated blocks
//   dualContourSparse — dual contouring on sparse grid

import {
  GrowableFloat32, GrowableUint32, EDGE_TABLE,
  gridToWorld, worldToGrid, solveQEF,
  type DCMeshResult, type ProgressCallback
} from './dc-core';

// ============================================================================
// Cancellation support (shared with dc-core)
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
// SparseSDFGrid
// ============================================================================

export class SparseSDFGrid {
  N: number;
  blockSize: number;
  defaultValue: number;
  blocksPerAxis: number;
  blockCellCount: number;
  blocks: Map<number, Float32Array>;
  allocatedCount: number;

  constructor(N: number, blockSize: number = 8, defaultValue: number = 1.0) {
    this.N = N;
    this.blockSize = blockSize;
    this.defaultValue = defaultValue;
    this.blocksPerAxis = Math.ceil(N / blockSize);
    this.blockCellCount = blockSize * blockSize * blockSize;
    this.blocks = new Map();
    this.allocatedCount = 0;
  }

  blockKey(bx: number, by: number, bz: number): number {
    return (bz * this.blocksPerAxis + by) * this.blocksPerAxis + bx;
  }

  allocateBlock(bx: number, by: number, bz: number): Float32Array {
    const key = this.blockKey(bx, by, bz);
    if (!this.blocks.has(key)) {
      const block = new Float32Array(this.blockCellCount);
      block.fill(this.defaultValue);
      this.blocks.set(key, block);
      this.allocatedCount++;
    }
    return this.blocks.get(key)!;
  }

  hasBlock(bx: number, by: number, bz: number): boolean {
    return this.blocks.has(this.blockKey(bx, by, bz));
  }

  set(ix: number, iy: number, iz: number, value: number): void {
    const bs = this.blockSize;
    const bx = (ix / bs) | 0, by = (iy / bs) | 0, bz = (iz / bs) | 0;
    const block = this.allocateBlock(bx, by, bz);
    const lx = ix - bx * bs, ly = iy - by * bs, lz = iz - bz * bs;
    block[(lz * bs + ly) * bs + lx] = value;
  }

  get(ix: number, iy: number, iz: number): number {
    if (ix < 0 || iy < 0 || iz < 0 || ix >= this.N || iy >= this.N || iz >= this.N) {
      return this.defaultValue;
    }
    const bs = this.blockSize;
    const bx = (ix / bs) | 0, by = (iy / bs) | 0, bz = (iz / bs) | 0;
    const key = this.blockKey(bx, by, bz);
    const block = this.blocks.get(key);
    if (!block) return this.defaultValue;
    const lx = ix - bx * bs, ly = iy - by * bs, lz = iz - bz * bs;
    return block[(lz * bs + ly) * bs + lx];
  }

  lerp(fx: number, fy: number, fz: number): number {
    const x0 = Math.floor(fx), y0 = Math.floor(fy), z0 = Math.floor(fz);
    const tx = fx - x0, ty = fy - y0, tz = fz - z0;
    const c000 = this.get(x0, y0, z0),     c100 = this.get(x0+1, y0, z0);
    const c010 = this.get(x0, y0+1, z0),   c110 = this.get(x0+1, y0+1, z0);
    const c001 = this.get(x0, y0, z0+1),   c101 = this.get(x0+1, y0, z0+1);
    const c011 = this.get(x0, y0+1, z0+1), c111 = this.get(x0+1, y0+1, z0+1);
    const c00 = c000*(1-tx)+c100*tx, c10 = c010*(1-tx)+c110*tx;
    const c01 = c001*(1-tx)+c101*tx, c11 = c011*(1-tx)+c111*tx;
    const c0 = c00*(1-ty)+c10*ty, c1 = c01*(1-ty)+c11*ty;
    return c0*(1-tz)+c1*tz;
  }

  gradient(fx: number, fy: number, fz: number): [number, number, number] {
    const h = 0.5;
    const gx = this.lerp(fx+h, fy, fz) - this.lerp(fx-h, fy, fz);
    const gy = this.lerp(fx, fy+h, fz) - this.lerp(fx, fy-h, fz);
    const gz = this.lerp(fx, fy, fz+h) - this.lerp(fx, fy, fz-h);
    const len = Math.sqrt(gx*gx + gy*gy + gz*gz);
    if (len < 1e-10) return [0, 1, 0];
    const inv = 1 / len;
    return [gx*inv, gy*inv, gz*inv];
  }

  memoryMB(): number {
    return (this.allocatedCount * this.blockCellCount * 4) / (1024 * 1024);
  }
}

// ============================================================================
// buildNarrowBand
// ============================================================================

export interface NarrowBandResult {
  grid: SparseSDFGrid;
  surfaceCells: Set<number>;
  bandBlockCount: number;
}

export function buildNarrowBand(
  coarseGrid: Float32Array,
  coarseN: number,
  fineN: number,
  blockSize: number = 8,
  bandWidth: number = 2
): NarrowBandResult {
  const ratio = fineN / coarseN;
  const blocksPerAxis = Math.ceil(fineN / blockSize);

  // Step 1: Find coarse cells with sign changes
  const surfaceCells = new Set<number>();

  for (let iz = 0; iz < coarseN - 1; iz++) {
    for (let iy = 0; iy < coarseN - 1; iy++) {
      for (let ix = 0; ix < coarseN - 1; ix++) {
        const s0 = coarseGrid[(iz * coarseN + iy) * coarseN + ix];
        const sign0 = s0 >= 0;
        let hasChange = false;

        for (let dz = 0; dz <= 1 && !hasChange; dz++) {
          for (let dy = 0; dy <= 1 && !hasChange; dy++) {
            for (let dx = 0; dx <= 1; dx++) {
              if (dx === 0 && dy === 0 && dz === 0) continue;
              const sv = coarseGrid[((iz+dz) * coarseN + (iy+dy)) * coarseN + (ix+dx)];
              if ((sv >= 0) !== sign0) { hasChange = true; break; }
            }
          }
        }

        if (hasChange) {
          for (let bz = -bandWidth; bz <= bandWidth; bz++) {
            for (let by = -bandWidth; by <= bandWidth; by++) {
              for (let bx = -bandWidth; bx <= bandWidth; bx++) {
                const nx = ix + bx, ny = iy + by, nz = iz + bz;
                if (nx >= 0 && ny >= 0 && nz >= 0 && nx < coarseN && ny < coarseN && nz < coarseN) {
                  surfaceCells.add((nz * coarseN + ny) * coarseN + nx);
                }
              }
            }
          }
        }
      }
    }
  }

  // Step 2: Map coarse surface cells to fine-grid blocks
  const grid = new SparseSDFGrid(fineN, blockSize, 1.0);
  let bandBlockCount = 0;

  surfaceCells.forEach(cellKey => {
    const cix = cellKey % coarseN;
    const ciy = ((cellKey / coarseN) | 0) % coarseN;
    const ciz = (cellKey / (coarseN * coarseN)) | 0;

    const fineMinX = Math.floor(cix * ratio);
    const fineMinY = Math.floor(ciy * ratio);
    const fineMinZ = Math.floor(ciz * ratio);
    const fineMaxX = Math.ceil((cix + 1) * ratio);
    const fineMaxY = Math.ceil((ciy + 1) * ratio);
    const fineMaxZ = Math.ceil((ciz + 1) * ratio);

    const bMinX = (fineMinX / blockSize) | 0;
    const bMinY = (fineMinY / blockSize) | 0;
    const bMinZ = (fineMinZ / blockSize) | 0;
    const bMaxX = Math.min(blocksPerAxis - 1, (fineMaxX / blockSize) | 0);
    const bMaxY = Math.min(blocksPerAxis - 1, (fineMaxY / blockSize) | 0);
    const bMaxZ = Math.min(blocksPerAxis - 1, (fineMaxZ / blockSize) | 0);

    for (let bz = bMinZ; bz <= bMaxZ; bz++) {
      for (let by = bMinY; by <= bMaxY; by++) {
        for (let bx = bMinX; bx <= bMaxX; bx++) {
          if (!grid.hasBlock(bx, by, bz)) {
            grid.allocateBlock(bx, by, bz);
            bandBlockCount++;
          }
        }
      }
    }
  });

  console.log('Narrow band: ' + surfaceCells.size + ' coarse surface cells -> ' +
    bandBlockCount + ' fine blocks (' + grid.memoryMB().toFixed(1) + ' MB) out of ' +
    (blocksPerAxis * blocksPerAxis * blocksPerAxis) + ' total blocks');

  return { grid, surfaceCells, bandBlockCount };
}

// ============================================================================
// forEachBandBlock
// ============================================================================

export function forEachBandBlock(
  grid: SparseSDFGrid,
  callback: (bx: number, by: number, bz: number, startX: number, startY: number, startZ: number) => void
): void {
  const bs = grid.blockSize;
  const bpa = grid.blocksPerAxis;
  grid.blocks.forEach((_block, key) => {
    const bx = key % bpa;
    const by = ((key / bpa) | 0) % bpa;
    const bz = (key / (bpa * bpa)) | 0;
    callback(bx, by, bz, bx * bs, by * bs, bz * bs);
  });
}

// ============================================================================
// Dual Contouring on sparse grid
// ============================================================================

export async function dualContourSparse(
  grid: SparseSDFGrid,
  gridMin: [number, number, number],
  gridMax: [number, number, number],
  onProgress: ProgressCallback = () => {}
): Promise<DCMeshResult> {
  const N = grid.N;
  const M = N - 1;
  const bs = grid.blockSize;
  const bpa = grid.blocksPerAxis;

  // ---- Block-local vertex index storage (compact) ----
  let blockVertexTemp: Map<number, { locals: number[]; globals: number[] }> | null = new Map();
  let blockVertexMaps: Map<number, { locals: Uint16Array; globals: Uint32Array }> | null = null;

  function setVertexIndex(ix: number, iy: number, iz: number, vidx: number): void {
    const bx = (ix / bs) | 0, by = (iy / bs) | 0, bz = (iz / bs) | 0;
    const bk = grid.blockKey(bx, by, bz);
    const lx = ix - bx * bs, ly = iy - by * bs, lz = iz - bz * bs;
    const localIdx = (lz * bs + ly) * bs + lx;
    let entry = blockVertexTemp!.get(bk);
    if (!entry) {
      entry = { locals: [], globals: [] };
      blockVertexTemp!.set(bk, entry);
    }
    entry.locals.push(localIdx);
    entry.globals.push(vidx);
  }

  function getVertexIndex(ix: number, iy: number, iz: number): number {
    const bx = (ix / bs) | 0, by = (iy / bs) | 0, bz = (iz / bs) | 0;
    const bk = grid.blockKey(bx, by, bz);
    const entry = blockVertexMaps!.get(bk);
    if (!entry) return -1;
    const lx = ix - bx * bs, ly = iy - by * bs, lz = iz - bz * bs;
    const localIdx = (lz * bs + ly) * bs + lx;
    // Binary search on sorted locals
    const locals = entry.locals;
    let lo = 0, hi = locals.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (locals[mid] === localIdx) return entry.globals[mid];
      if (locals[mid] < localIdx) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  }

  // ---- Block-local edge dedup ----
  const blockEdgeMaps = new Map<number, Uint8Array>();

  function markEdge(eMinX: number, eMinY: number, eMinZ: number, axis: number): boolean {
    const bx = (eMinX / bs) | 0, by = (eMinY / bs) | 0, bz = (eMinZ / bs) | 0;
    const bk = grid.blockKey(bx, by, bz);
    let arr = blockEdgeMaps.get(bk);
    if (!arr) {
      arr = new Uint8Array(grid.blockCellCount);
      blockEdgeMaps.set(bk, arr);
    }
    const lx = eMinX - bx * bs, ly = eMinY - by * bs, lz = eMinZ - bz * bs;
    const idx = (lz * bs + ly) * bs + lx;
    const bit = 1 << axis;
    if (arr[idx] & bit) return true;
    arr[idx] |= bit;
    return false;
  }

  // ---- Phase 1: Find sign-change cells, compute vertices ----
  onProgress('contouring', 0);
  const positions = new GrowableFloat32(262144);
  const normals = new GrowableFloat32(262144);
  let vertexCount = 0;
  let processedBlocks = 0;
  const totalBlocks = grid.allocatedCount;

  const bandBlocks: [number, number, number, number, number, number][] = [];
  forEachBandBlock(grid, (bx, by, bz, startX, startY, startZ) => {
    bandBlocks.push([bx, by, bz, startX, startY, startZ]);
  });

  for (let bi = 0; bi < bandBlocks.length; bi++) {
    const bb = bandBlocks[bi];
    const startX = bb[3], startY = bb[4], startZ = bb[5];
    processedBlocks++;

    const endX = Math.min(startX + bs, M);
    const endY = Math.min(startY + bs, M);
    const endZ = Math.min(startZ + bs, M);

    for (let iz = startZ; iz < endZ; iz++) {
      for (let iy = startY; iy < endY; iy++) {
        for (let ix = startX; ix < endX; ix++) {
          const s0 = grid.get(ix, iy, iz);
          const sign0 = s0 >= 0;
          const s = [s0,
            grid.get(ix+1, iy, iz),
            grid.get(ix, iy+1, iz),
            grid.get(ix+1, iy+1, iz),
            grid.get(ix, iy, iz+1),
            grid.get(ix+1, iy, iz+1),
            grid.get(ix, iy+1, iz+1),
            grid.get(ix+1, iy+1, iz+1)
          ];
          let hasChange = false;
          for (let ci = 1; ci < 8; ci++) {
            if ((s[ci] >= 0) !== sign0) { hasChange = true; break; }
          }
          if (!hasChange) continue;

          const crossings: { point: [number, number, number]; normal: [number, number, number] }[] = [];
          for (let ei = 0; ei < 12; ei++) {
            const e = EDGE_TABLE[ei];
            const s0v = s[e[0]], s1v = s[e[1]];
            if ((s0v >= 0) === (s1v >= 0)) continue;

            const c0x = ix+(e[0]&1), c0y = iy+((e[0]>>1)&1), c0z = iz+((e[0]>>2)&1);
            const c1x = ix+(e[1]&1), c1y = iy+((e[1]>>1)&1), c1z = iz+((e[1]>>2)&1);

            let lo0=c0x,lo1=c0y,lo2=c0z, hi0=c1x,hi1=c1y,hi2=c1z;
            let sLo=s0v;
            for (let bsi=0; bsi<8; bsi++) {
              const mx=(lo0+hi0)*0.5, my=(lo1+hi1)*0.5, mz=(lo2+hi2)*0.5;
              const sm=grid.lerp(mx,my,mz);
              if ((sm>=0)===(sLo>=0)) { lo0=mx; lo1=my; lo2=mz; sLo=sm; }
              else { hi0=mx; hi1=my; hi2=mz; }
            }
            const px=(lo0+hi0)*0.5, py=(lo1+hi1)*0.5, pz=(lo2+hi2)*0.5;
            const grad=grid.gradient(px,py,pz);
            crossings.push({
              point:[gridToWorld(px,N,gridMin[0],gridMax[0]),gridToWorld(py,N,gridMin[1],gridMax[1]),gridToWorld(pz,N,gridMin[2],gridMax[2])],
              normal:grad
            });
          }
          if (crossings.length===0) continue;

          const cellMin: [number, number, number] = [gridToWorld(ix,N,gridMin[0],gridMax[0]),gridToWorld(iy,N,gridMin[1],gridMax[1]),gridToWorld(iz,N,gridMin[2],gridMax[2])];
          const cellMax: [number, number, number] = [gridToWorld(ix+1,N,gridMin[0],gridMax[0]),gridToWorld(iy+1,N,gridMin[1],gridMax[1]),gridToWorld(iz+1,N,gridMin[2],gridMax[2])];
          const v = solveQEF(crossings, cellMin, cellMax);
          if (!v) continue;

          const grad2 = grid.gradient(worldToGrid(v[0],N,gridMin[0],gridMax[0]),worldToGrid(v[1],N,gridMin[1],gridMax[1]),worldToGrid(v[2],N,gridMin[2],gridMax[2]));
          setVertexIndex(ix, iy, iz, vertexCount);
          positions.push3(v[0], v[1], v[2]);
          normals.push3(grad2[0], grad2[1], grad2[2]);
          vertexCount++;
        }
      }
    }

    if ((processedBlocks & 63) === 0) {
      onProgress('contouring', Math.round(40 * processedBlocks / totalBlocks));
      await tick();
    }
  }

  onProgress('contouring', 50);
  console.log('DC sparse: ' + vertexCount + ' vertices (' +
    ((positions.data.byteLength + normals.data.byteLength) / (1024*1024)).toFixed(0) + ' MB vertex data)');

  if (vertexCount === 0) {
    return { positions: new Float32Array(0), normals: new Float32Array(0), indices: new Uint32Array(0), vertexCount: 0, faceCount: 0 };
  }

  // ---- Compress SDF to sign-only bitmap, free float data progressively ----
  const signMaps = new Map<number, Uint8Array>();
  const bytesPerBlock = (grid.blockCellCount + 7) >> 3;
  const freedMB = grid.memoryMB();
  let blockKeys: number[] | null = Array.from(grid.blocks.keys());
  for (let ski = 0; ski < blockKeys.length; ski++) {
    const sk = blockKeys[ski];
    const block = grid.blocks.get(sk)!;
    const signs = new Uint8Array(bytesPerBlock);
    for (let si = 0; si < block.length; si++) {
      if (block[si] >= 0) signs[si >> 3] |= (1 << (si & 7));
    }
    signMaps.set(sk, signs);
    grid.blocks.delete(sk);
    if ((ski & 255) === 0) await tick();
  }
  blockKeys = null;
  grid.allocatedCount = 0;
  const signMB = (signMaps.size * bytesPerBlock / (1024 * 1024)).toFixed(0);
  console.log('Sign compression: freed ' + freedMB.toFixed(0) + ' MB float data, using ' + signMB + ' MB sign maps');

  // ---- Compact vertex maps ----
  blockVertexMaps = new Map();
  blockVertexTemp!.forEach((entry, bk) => {
    const n = entry.locals.length;
    const indices = new Array(n);
    for (let ii = 0; ii < n; ii++) indices[ii] = ii;
    const srcLocals = entry.locals, srcGlobals = entry.globals;
    indices.sort((a: number, b: number) => srcLocals[a] - srcLocals[b]);
    const sortedLocals = new Uint16Array(n);
    const sortedGlobals = new Uint32Array(n);
    for (let ii = 0; ii < n; ii++) {
      sortedLocals[ii] = srcLocals[indices[ii]];
      sortedGlobals[ii] = srcGlobals[indices[ii]];
    }
    blockVertexMaps!.set(bk, { locals: sortedLocals, globals: sortedGlobals });
  });
  blockVertexTemp!.clear();
  blockVertexTemp = null;
  console.log('Vertex map compaction: ' + blockVertexMaps.size + ' blocks with vertices');

  function getSignPositive(ix: number, iy: number, iz: number): boolean {
    if (ix < 0 || iy < 0 || iz < 0 || ix >= N || iy >= N || iz >= N) return true;
    const sbx = (ix / bs) | 0, sby = (iy / bs) | 0, sbz = (iz / bs) | 0;
    const sbk = grid.blockKey(sbx, sby, sbz);
    const signs = signMaps.get(sbk);
    if (!signs) return true;
    const slx = ix - sbx * bs, sly = iy - sby * bs, slz = iz - sbz * bs;
    const sli = (slz * bs + sly) * bs + slx;
    return (signs[sli >> 3] & (1 << (sli & 7))) !== 0;
  }

  // ---- Phase 2: Generate faces ----
  const faces = new GrowableUint32(262144);
  let edgeCount = 0, droppedCount = 0;
  let phase2Blocks = 0;
  const totalPhase2 = blockVertexMaps.size;

  let vertMapEntries: [number, { locals: Uint16Array; globals: Uint32Array }][] | null = Array.from(blockVertexMaps.entries());

  for (let vmi = 0; vmi < vertMapEntries.length; vmi++) {
    const vmEntry = vertMapEntries[vmi];
    const bk = vmEntry[0];
    const compactVerts = vmEntry[1];
    phase2Blocks++;

    const bx = bk % bpa;
    const by = ((bk / bpa) | 0) % bpa;
    const bz = (bk / (bpa * bpa)) | 0;
    const startX = bx * bs, startY = by * bs, startZ = bz * bs;

    for (let cvi = 0; cvi < compactVerts.locals.length; cvi++) {
      const localIdx = compactVerts.locals[cvi];
      const lx = localIdx % bs;
      const ly = ((localIdx / bs) | 0) % bs;
      const lz = (localIdx / (bs * bs)) | 0;
      const ix = startX + lx;
      const iy = startY + ly;
      const iz = startZ + lz;
      if (ix >= M || iy >= M || iz >= M) continue;

      for (let ei = 0; ei < 12; ei++) {
        const e = EDGE_TABLE[ei];
        const c0x = ix+(e[0]&1), c0y = iy+((e[0]>>1)&1), c0z = iz+((e[0]>>2)&1);
        const c1x = ix+(e[1]&1), c1y = iy+((e[1]>>1)&1), c1z = iz+((e[1]>>2)&1);

        const sign0p = getSignPositive(c0x, c0y, c0z);
        const sign1p = getSignPositive(c1x, c1y, c1z);
        if (sign0p === sign1p) continue;

        let axis: number;
        const eMinX = Math.min(c0x,c1x), eMinY = Math.min(c0y,c1y), eMinZ = Math.min(c0z,c1z);
        if (c0x !== c1x) axis = 0;
        else if (c0y !== c1y) axis = 1;
        else axis = 2;

        if (markEdge(eMinX, eMinY, eMinZ, axis)) continue;
        edgeCount++;

        const ax1 = (axis+1)%3, ax2 = (axis+2)%3;
        const ePos = [eMinX, eMinY, eMinZ];

        const vi = [-1,-1,-1,-1];
        let allFound = true;
        for (let qi = 0; qi < 4; qi++) {
          const cc = [ePos[0], ePos[1], ePos[2]];
          cc[ax1] -= (qi & 1) ? 0 : 1;
          cc[ax2] -= (qi & 2) ? 0 : 1;
          if (cc[0] < 0 || cc[1] < 0 || cc[2] < 0 || cc[0] >= M || cc[1] >= M || cc[2] >= M) { allFound = false; break; }
          const v = getVertexIndex(cc[0], cc[1], cc[2]);
          if (v < 0) { allFound = false; break; }
          vi[qi] = v;
        }
        if (!allFound) { droppedCount++; continue; }

        const flip = sign0p;
        if (vi[0]!==vi[1]&&vi[0]!==vi[3]&&vi[1]!==vi[3]) {
          if (flip) faces.push3(vi[0],vi[3],vi[1]); else faces.push3(vi[0],vi[1],vi[3]);
        }
        if (vi[0]!==vi[2]&&vi[0]!==vi[3]&&vi[2]!==vi[3]) {
          if (flip) faces.push3(vi[0],vi[2],vi[3]); else faces.push3(vi[0],vi[3],vi[2]);
        }
      }
    }

    if ((phase2Blocks & 63) === 0) {
      onProgress('contouring', 50 + Math.round(50 * phase2Blocks / totalPhase2));
      await tick();
    }
  }

  // Free block-local maps and sign data
  blockVertexMaps = null;
  vertMapEntries = null;

  onProgress('contouring', 100);
  console.log('DC sparse: ' + edgeCount + ' sign-change edges, ' + droppedCount + ' dropped, ' + (faces.length/3) + ' faces');

  return {
    positions: positions.trim(),
    normals: normals.trim(),
    indices: faces.trim(),
    vertexCount,
    faceCount: Math.floor(faces.length / 3)
  };
}
