// sparse-grid.js — Block-sparse SDF grid for narrow-band multi-resolution sampling
// Plain ES2020, no modules. All symbols are global.
// GMT Fractal Explorer — prototype mesh export

// ============================================================================
// SparseSDFGrid — block-based sparse storage for SDF values
// Only allocates memory for blocks near the surface (narrow band)
// ============================================================================

/**
 * @param {number} N — grid resolution per axis
 * @param {number} blockSize — cells per block edge (default 8)
 * @param {number} defaultValue — returned for unallocated cells (default +1.0)
 */
function SparseSDFGrid(N, blockSize, defaultValue) {
  this.N = N;
  this.blockSize = blockSize || 8;
  this.defaultValue = defaultValue !== undefined ? defaultValue : 1.0;
  this.blocksPerAxis = Math.ceil(N / this.blockSize);
  this.blockCellCount = this.blockSize * this.blockSize * this.blockSize;
  this.blocks = new Map(); // blockKey -> Float32Array
  this.allocatedCount = 0;
}

/**
 * Block key from block indices
 */
SparseSDFGrid.prototype.blockKey = function(bx, by, bz) {
  return (bz * this.blocksPerAxis + by) * this.blocksPerAxis + bx;
};

/**
 * Allocate a block if not already allocated
 */
SparseSDFGrid.prototype.allocateBlock = function(bx, by, bz) {
  var key = this.blockKey(bx, by, bz);
  if (!this.blocks.has(key)) {
    var block = new Float32Array(this.blockCellCount);
    block.fill(this.defaultValue);
    this.blocks.set(key, block);
    this.allocatedCount++;
  }
  return this.blocks.get(key);
};

/**
 * Check if a block is allocated
 */
SparseSDFGrid.prototype.hasBlock = function(bx, by, bz) {
  return this.blocks.has(this.blockKey(bx, by, bz));
};

/**
 * Set value at grid cell (ix, iy, iz)
 */
SparseSDFGrid.prototype.set = function(ix, iy, iz, value) {
  var bs = this.blockSize;
  var bx = (ix / bs) | 0, by = (iy / bs) | 0, bz = (iz / bs) | 0;
  var block = this.allocateBlock(bx, by, bz);
  var lx = ix - bx * bs, ly = iy - by * bs, lz = iz - bz * bs;
  block[(lz * bs + ly) * bs + lx] = value;
};

/**
 * Get value at grid cell (ix, iy, iz)
 * Returns defaultValue for unallocated blocks
 */
SparseSDFGrid.prototype.get = function(ix, iy, iz) {
  if (ix < 0 || iy < 0 || iz < 0 || ix >= this.N || iy >= this.N || iz >= this.N) {
    return this.defaultValue;
  }
  var bs = this.blockSize;
  var bx = (ix / bs) | 0, by = (iy / bs) | 0, bz = (iz / bs) | 0;
  var key = this.blockKey(bx, by, bz);
  var block = this.blocks.get(key);
  if (!block) return this.defaultValue;
  var lx = ix - bx * bs, ly = iy - by * bs, lz = iz - bz * bs;
  return block[(lz * bs + ly) * bs + lx];
};

/**
 * Trilinear interpolation on the sparse grid
 */
SparseSDFGrid.prototype.lerp = function(fx, fy, fz) {
  var x0 = Math.floor(fx), y0 = Math.floor(fy), z0 = Math.floor(fz);
  var tx = fx - x0, ty = fy - y0, tz = fz - z0;
  var c000 = this.get(x0, y0, z0),     c100 = this.get(x0+1, y0, z0);
  var c010 = this.get(x0, y0+1, z0),   c110 = this.get(x0+1, y0+1, z0);
  var c001 = this.get(x0, y0, z0+1),   c101 = this.get(x0+1, y0, z0+1);
  var c011 = this.get(x0, y0+1, z0+1), c111 = this.get(x0+1, y0+1, z0+1);
  var c00 = c000*(1-tx)+c100*tx, c10 = c010*(1-tx)+c110*tx;
  var c01 = c001*(1-tx)+c101*tx, c11 = c011*(1-tx)+c111*tx;
  var c0 = c00*(1-ty)+c10*ty, c1 = c01*(1-ty)+c11*ty;
  return c0*(1-tz)+c1*tz;
};

/**
 * Gradient via central differences on the sparse grid
 */
SparseSDFGrid.prototype.gradient = function(fx, fy, fz) {
  var h = 0.5;
  var gx = this.lerp(fx+h, fy, fz) - this.lerp(fx-h, fy, fz);
  var gy = this.lerp(fx, fy+h, fz) - this.lerp(fx, fy-h, fz);
  var gz = this.lerp(fx, fy, fz+h) - this.lerp(fx, fy, fz-h);
  var len = Math.sqrt(gx*gx + gy*gy + gz*gz);
  if (len < 1e-10) return [0, 1, 0];
  var inv = 1 / len;
  return [gx*inv, gy*inv, gz*inv];
};

/**
 * Memory usage in MB
 */
SparseSDFGrid.prototype.memoryMB = function() {
  return (this.allocatedCount * this.blockCellCount * 4) / (1024 * 1024);
};

// ============================================================================
// buildNarrowBand — identify surface-adjacent blocks from coarse SDF grid
// Returns a Set of block keys that should be allocated in the fine grid
// ============================================================================

/**
 * @param {Float32Array} coarseGrid — flat SDF grid at coarse resolution
 * @param {number} coarseN — coarse grid resolution
 * @param {number} fineN — fine grid resolution
 * @param {number} blockSize — block size for fine grid
 * @param {number} bandWidth — how many coarse cells around surface to include (default 2)
 * @returns {{ bandBlocks: Set<string>, grid: SparseSDFGrid }} band block coordinates + empty sparse grid
 */
function buildNarrowBand(coarseGrid, coarseN, fineN, blockSize, bandWidth) {
  if (bandWidth === undefined) bandWidth = 2;
  if (blockSize === undefined) blockSize = 8;

  var ratio = fineN / coarseN; // e.g., 1024/128 = 8
  var blocksPerAxis = Math.ceil(fineN / blockSize);

  // Step 1: Find coarse cells with sign changes (surface cells)
  var surfaceCells = new Set(); // keys of coarse cells near surface

  for (var iz = 0; iz < coarseN - 1; iz++) {
    for (var iy = 0; iy < coarseN - 1; iy++) {
      for (var ix = 0; ix < coarseN - 1; ix++) {
        var s0 = coarseGrid[(iz * coarseN + iy) * coarseN + ix];
        var sign0 = s0 >= 0;
        var hasChange = false;

        // Check 8 corners of this coarse cell
        for (var dz = 0; dz <= 1 && !hasChange; dz++) {
          for (var dy = 0; dy <= 1 && !hasChange; dy++) {
            for (var dx = 0; dx <= 1; dx++) {
              if (dx === 0 && dy === 0 && dz === 0) continue;
              var sv = coarseGrid[((iz+dz) * coarseN + (iy+dy)) * coarseN + (ix+dx)];
              if ((sv >= 0) !== sign0) { hasChange = true; break; }
            }
          }
        }

        if (hasChange) {
          // Mark this cell and neighbors within bandWidth
          for (var bz = -bandWidth; bz <= bandWidth; bz++) {
            for (var by = -bandWidth; by <= bandWidth; by++) {
              for (var bx = -bandWidth; bx <= bandWidth; bx++) {
                var nx = ix + bx, ny = iy + by, nz = iz + bz;
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
  var grid = new SparseSDFGrid(fineN, blockSize, 1.0);
  var bandBlockCount = 0;

  surfaceCells.forEach(function(cellKey) {
    var cix = cellKey % coarseN;
    var ciy = ((cellKey / coarseN) | 0) % coarseN;
    var ciz = (cellKey / (coarseN * coarseN)) | 0;

    // This coarse cell maps to fine cells [cix*ratio, (cix+1)*ratio) etc.
    var fineMinX = Math.floor(cix * ratio);
    var fineMinY = Math.floor(ciy * ratio);
    var fineMinZ = Math.floor(ciz * ratio);
    var fineMaxX = Math.ceil((cix + 1) * ratio);
    var fineMaxY = Math.ceil((ciy + 1) * ratio);
    var fineMaxZ = Math.ceil((ciz + 1) * ratio);

    // Find all blocks that overlap this fine-cell range
    var bMinX = (fineMinX / blockSize) | 0;
    var bMinY = (fineMinY / blockSize) | 0;
    var bMinZ = (fineMinZ / blockSize) | 0;
    var bMaxX = Math.min(blocksPerAxis - 1, (fineMaxX / blockSize) | 0);
    var bMaxY = Math.min(blocksPerAxis - 1, (fineMaxY / blockSize) | 0);
    var bMaxZ = Math.min(blocksPerAxis - 1, (fineMaxZ / blockSize) | 0);

    for (var bz = bMinZ; bz <= bMaxZ; bz++) {
      for (var by = bMinY; by <= bMaxY; by++) {
        for (var bx = bMinX; bx <= bMaxX; bx++) {
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

  return { grid: grid, surfaceCells: surfaceCells, bandBlockCount: bandBlockCount };
}

// ============================================================================
// forEachBandBlock — iterate only over allocated blocks
// callback(bx, by, bz, blockStartX, blockStartY, blockStartZ)
// ============================================================================

/**
 * Iterate over all allocated blocks in the sparse grid.
 * @param {SparseSDFGrid} grid
 * @param {function} callback - (bx, by, bz, startX, startY, startZ)
 */
function forEachBandBlock(grid, callback) {
  var bs = grid.blockSize;
  var bpa = grid.blocksPerAxis;
  grid.blocks.forEach(function(block, key) {
    var bx = key % bpa;
    var by = ((key / bpa) | 0) % bpa;
    var bz = (key / (bpa * bpa)) | 0;
    callback(bx, by, bz, bx * bs, by * bs, bz * bs);
  });
}

// ============================================================================
// Dual Contouring on sparse grid
// ============================================================================

/**
 * Run dual contouring on a sparse SDF grid (only processes allocated blocks).
 * @param {SparseSDFGrid} grid — sparse grid with SDF values
 * @param {number[]} gridMin — world-space min [x, y, z]
 * @param {number[]} gridMax — world-space max [x, y, z]
 * @param {function} onProgress — progress callback
 * @returns {{ positions: Float32Array, normals: Float32Array, indices: Uint32Array, vertexCount: number, faceCount: number }}
 */
// GrowableFloat32 and GrowableUint32 are defined in dc-core.js (loaded first)

async function dualContourSparse(grid, gridMin, gridMax, onProgress) {
  onProgress = onProgress || function(){};
  var _tick = function() { return new Promise(function(r) { setTimeout(r, 0); }).then(function() { if (window.cancelRequested) throw new Error('CANCELLED'); }); };
  var N = grid.N;
  var M = N - 1;
  var bs = grid.blockSize;
  var bpa = grid.blocksPerAxis;

  // ---- Block-local vertex index storage (compact) ----
  // Phase 1: JS arrays for fast push (~160MB for 10M vertices).
  // After phase 1: compacted into sorted typed arrays (~60MB).
  // Previous approach used Int32Array(512) per block = ~3GB at 1.5M blocks.
  var blockVertexTemp = new Map(); // bk -> { locals: number[], globals: number[] }
  var blockVertexMaps = null;      // bk -> { locals: Uint16Array, globals: Uint32Array } — set after compaction

  function setVertexIndex(ix, iy, iz, vidx) {
    var bx = (ix / bs) | 0, by = (iy / bs) | 0, bz = (iz / bs) | 0;
    var bk = grid.blockKey(bx, by, bz);
    var lx = ix - bx * bs, ly = iy - by * bs, lz = iz - bz * bs;
    var localIdx = (lz * bs + ly) * bs + lx;
    var entry = blockVertexTemp.get(bk);
    if (!entry) {
      entry = { locals: [], globals: [] };
      blockVertexTemp.set(bk, entry);
    }
    entry.locals.push(localIdx);
    entry.globals.push(vidx);
  }

  function getVertexIndex(ix, iy, iz) {
    var bx = (ix / bs) | 0, by = (iy / bs) | 0, bz = (iz / bs) | 0;
    var bk = grid.blockKey(bx, by, bz);
    var entry = blockVertexMaps.get(bk);
    if (!entry) return -1;
    var lx = ix - bx * bs, ly = iy - by * bs, lz = iz - bz * bs;
    var localIdx = (lz * bs + ly) * bs + lx;
    // Binary search on sorted locals
    var locals = entry.locals;
    var lo = 0, hi = locals.length - 1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (locals[mid] === localIdx) return entry.globals[mid];
      if (locals[mid] < localIdx) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  }

  // ---- Block-local edge dedup ----
  var blockEdgeMaps = new Map();

  function markEdge(eMinX, eMinY, eMinZ, axis) {
    var bx = (eMinX / bs) | 0, by = (eMinY / bs) | 0, bz = (eMinZ / bs) | 0;
    var bk = grid.blockKey(bx, by, bz);
    var arr = blockEdgeMaps.get(bk);
    if (!arr) {
      arr = new Uint8Array(grid.blockCellCount);
      blockEdgeMaps.set(bk, arr);
    }
    var lx = eMinX - bx * bs, ly = eMinY - by * bs, lz = eMinZ - bz * bs;
    var idx = (lz * bs + ly) * bs + lx;
    var bit = 1 << axis;
    if (arr[idx] & bit) return true;
    arr[idx] |= bit;
    return false;
  }

  // ---- Phase 1: Find sign-change cells, compute vertices ----
  onProgress('contouring', 0);
  var positions = new GrowableFloat32(262144);
  var normals = new GrowableFloat32(262144);
  var vertexCount = 0;
  var processedBlocks = 0;
  var totalBlocks = grid.allocatedCount;

  // Collect band blocks into an array so we can iterate with async yields
  var bandBlocks = [];
  forEachBandBlock(grid, function(bx, by, bz, startX, startY, startZ) {
    bandBlocks.push([bx, by, bz, startX, startY, startZ]);
  });

  for (var bi = 0; bi < bandBlocks.length; bi++) {
    var bb = bandBlocks[bi];
    var startX = bb[3], startY = bb[4], startZ = bb[5];
    processedBlocks++;

    var endX = Math.min(startX + bs, M);
    var endY = Math.min(startY + bs, M);
    var endZ = Math.min(startZ + bs, M);

    for (var iz = startZ; iz < endZ; iz++) {
      for (var iy = startY; iy < endY; iy++) {
        for (var ix = startX; ix < endX; ix++) {
          var s0 = grid.get(ix, iy, iz);
          var sign0 = s0 >= 0;
          var s = [s0,
            grid.get(ix+1, iy, iz),
            grid.get(ix, iy+1, iz),
            grid.get(ix+1, iy+1, iz),
            grid.get(ix, iy, iz+1),
            grid.get(ix+1, iy, iz+1),
            grid.get(ix, iy+1, iz+1),
            grid.get(ix+1, iy+1, iz+1)
          ];
          var hasChange = false;
          for (var ci = 1; ci < 8; ci++) {
            if ((s[ci] >= 0) !== sign0) { hasChange = true; break; }
          }
          if (!hasChange) continue;

          var crossings = [];
          for (var ei = 0; ei < 12; ei++) {
            var e = EDGE_TABLE[ei];
            var s0v = s[e[0]], s1v = s[e[1]];
            if ((s0v >= 0) === (s1v >= 0)) continue;

            var c0x = ix+(e[0]&1), c0y = iy+((e[0]>>1)&1), c0z = iz+((e[0]>>2)&1);
            var c1x = ix+(e[1]&1), c1y = iy+((e[1]>>1)&1), c1z = iz+((e[1]>>2)&1);

            var lo0=c0x,lo1=c0y,lo2=c0z, hi0=c1x,hi1=c1y,hi2=c1z;
            var sLo=s0v, sHi=s1v;
            for (var bsi=0; bsi<8; bsi++) {
              var mx=(lo0+hi0)*0.5, my=(lo1+hi1)*0.5, mz=(lo2+hi2)*0.5;
              var sm=grid.lerp(mx,my,mz);
              if ((sm>=0)===(sLo>=0)) { lo0=mx; lo1=my; lo2=mz; sLo=sm; }
              else { hi0=mx; hi1=my; hi2=mz; sHi=sm; }
            }
            var px=(lo0+hi0)*0.5, py=(lo1+hi1)*0.5, pz=(lo2+hi2)*0.5;
            var grad=grid.gradient(px,py,pz);
            crossings.push({
              point:[gridToWorld(px,N,gridMin[0],gridMax[0]),gridToWorld(py,N,gridMin[1],gridMax[1]),gridToWorld(pz,N,gridMin[2],gridMax[2])],
              normal:grad
            });
          }
          if (crossings.length===0) continue;

          var cellMin=[gridToWorld(ix,N,gridMin[0],gridMax[0]),gridToWorld(iy,N,gridMin[1],gridMax[1]),gridToWorld(iz,N,gridMin[2],gridMax[2])];
          var cellMax=[gridToWorld(ix+1,N,gridMin[0],gridMax[0]),gridToWorld(iy+1,N,gridMin[1],gridMax[1]),gridToWorld(iz+1,N,gridMin[2],gridMax[2])];
          var v = solveQEF(crossings, cellMin, cellMax);
          if (!v) continue;

          var grad2 = grid.gradient(worldToGrid(v[0],N,gridMin[0],gridMax[0]),worldToGrid(v[1],N,gridMin[1],gridMax[1]),worldToGrid(v[2],N,gridMin[2],gridMax[2]));
          setVertexIndex(ix, iy, iz, vertexCount);
          positions.push3(v[0], v[1], v[2]);
          normals.push3(grad2[0], grad2[1], grad2[2]);
          vertexCount++;
        }
      }
    }

    // Yield to UI every 64 blocks
    if ((processedBlocks & 63) === 0) {
      onProgress('contouring', Math.round(40 * processedBlocks / totalBlocks));
      await _tick();
    }
  }

  onProgress('contouring', 50);
  console.log('DC sparse: ' + vertexCount + ' vertices (' +
    ((positions.data.byteLength + normals.data.byteLength) / (1024*1024)).toFixed(0) + ' MB vertex data)');

  if (vertexCount === 0) {
    return {positions:new Float32Array(0),normals:new Float32Array(0),indices:new Uint32Array(0),vertexCount:0,faceCount:0};
  }

  // ---- Compress SDF to sign-only bitmap, free float data progressively ----
  // Phase 2 only needs sign information (positive/negative), not actual SDF values.
  // At 2048³ with 1.5M blocks, this frees ~3GB of Float32 data, replaced by ~96MB of sign bits.
  // Progressive deletion: extract signs from one block, delete that Float32Array, yield to GC.
  var signMaps = new Map();
  var bytesPerBlock = (grid.blockCellCount + 7) >> 3;
  var freedMB = grid.memoryMB();
  var blockKeys = Array.from(grid.blocks.keys());
  for (var ski = 0; ski < blockKeys.length; ski++) {
    var sk = blockKeys[ski];
    var block = grid.blocks.get(sk);
    var signs = new Uint8Array(bytesPerBlock);
    for (var si = 0; si < block.length; si++) {
      if (block[si] >= 0) signs[si >> 3] |= (1 << (si & 7));
    }
    signMaps.set(sk, signs);
    grid.blocks.delete(sk); // free Float32Array immediately
    // Yield every 256 blocks so GC can reclaim memory incrementally
    if ((ski & 255) === 0) await _tick();
  }
  blockKeys = null;
  grid.allocatedCount = 0;
  var signMB = (signMaps.size * bytesPerBlock / (1024 * 1024)).toFixed(0);
  console.log('Sign compression: freed ' + freedMB.toFixed(0) + ' MB float data, using ' + signMB + ' MB sign maps');

  // ---- Compact vertex maps: JS arrays -> sorted typed arrays ----
  // Converts blockVertexTemp (JS arrays, ~160MB) to blockVertexMaps (typed arrays, ~60MB)
  blockVertexMaps = new Map();
  blockVertexTemp.forEach(function(entry, bk) {
    var n = entry.locals.length;
    // Build index array and sort by localIdx for binary search
    var indices = new Array(n);
    for (var ii = 0; ii < n; ii++) indices[ii] = ii;
    var srcLocals = entry.locals, srcGlobals = entry.globals;
    indices.sort(function(a, b) { return srcLocals[a] - srcLocals[b]; });
    var sortedLocals = new Uint16Array(n);
    var sortedGlobals = new Uint32Array(n);
    for (var ii = 0; ii < n; ii++) {
      sortedLocals[ii] = srcLocals[indices[ii]];
      sortedGlobals[ii] = srcGlobals[indices[ii]];
    }
    blockVertexMaps.set(bk, { locals: sortedLocals, globals: sortedGlobals });
  });
  blockVertexTemp.clear();
  blockVertexTemp = null;
  console.log('Vertex map compaction: ' + blockVertexMaps.size + ' blocks with vertices');

  function getSignPositive(ix, iy, iz) {
    if (ix < 0 || iy < 0 || iz < 0 || ix >= N || iy >= N || iz >= N) return true;
    var sbx = (ix / bs) | 0, sby = (iy / bs) | 0, sbz = (iz / bs) | 0;
    var sbk = grid.blockKey(sbx, sby, sbz);
    var signs = signMaps.get(sbk);
    if (!signs) return true; // unallocated block = default positive
    var slx = ix - sbx * bs, sly = iy - sby * bs, slz = iz - sbz * bs;
    var sli = (slz * bs + sly) * bs + slx;
    return (signs[sli >> 3] & (1 << (sli & 7))) !== 0;
  }

  // ---- Phase 2: Generate faces ----
  // Iterate only cells that have vertices (compact maps), not all 512 cells per block.
  var faces = new GrowableUint32(262144);
  var edgeCount = 0, droppedCount = 0;
  var phase2Blocks = 0;
  var totalPhase2 = blockVertexMaps.size;

  // Convert to array for async iteration (forEach doesn't support await)
  var vertMapEntries = Array.from(blockVertexMaps.entries());

  for (var vmi = 0; vmi < vertMapEntries.length; vmi++) {
    var vmEntry = vertMapEntries[vmi];
    var bk = vmEntry[0];
    var compactVerts = vmEntry[1]; // { locals: Uint16Array, globals: Uint32Array }
    phase2Blocks++;

    var bx = bk % bpa;
    var by = ((bk / bpa) | 0) % bpa;
    var bz = (bk / (bpa * bpa)) | 0;
    var startX = bx * bs, startY = by * bs, startZ = bz * bs;

    // Iterate only cells that actually have vertices
    for (var cvi = 0; cvi < compactVerts.locals.length; cvi++) {
      var localIdx = compactVerts.locals[cvi];
      // Recover ix, iy, iz from localIdx = (lz * bs + ly) * bs + lx
      var lx = localIdx % bs;
      var ly = ((localIdx / bs) | 0) % bs;
      var lz = (localIdx / (bs * bs)) | 0;
      var ix = startX + lx;
      var iy = startY + ly;
      var iz = startZ + lz;
      if (ix >= M || iy >= M || iz >= M) continue;

      for (var ei = 0; ei < 12; ei++) {
        var e = EDGE_TABLE[ei];
        var c0x = ix+(e[0]&1), c0y = iy+((e[0]>>1)&1), c0z = iz+((e[0]>>2)&1);
        var c1x = ix+(e[1]&1), c1y = iy+((e[1]>>1)&1), c1z = iz+((e[1]>>2)&1);

        var sign0p = getSignPositive(c0x, c0y, c0z);
        var sign1p = getSignPositive(c1x, c1y, c1z);
        if (sign0p === sign1p) continue;

        var axis, eMinX = Math.min(c0x,c1x), eMinY = Math.min(c0y,c1y), eMinZ = Math.min(c0z,c1z);
        if (c0x !== c1x) axis = 0;
        else if (c0y !== c1y) axis = 1;
        else axis = 2;

        if (markEdge(eMinX, eMinY, eMinZ, axis)) continue;
        edgeCount++;

        var ax1 = (axis+1)%3, ax2 = (axis+2)%3;
        var ePos = [eMinX, eMinY, eMinZ];

        var vi = [-1,-1,-1,-1];
        var allFound = true;
        for (var qi = 0; qi < 4; qi++) {
          var cc = [ePos[0], ePos[1], ePos[2]];
          cc[ax1] -= (qi & 1) ? 0 : 1;
          cc[ax2] -= (qi & 2) ? 0 : 1;
          if (cc[0] < 0 || cc[1] < 0 || cc[2] < 0 || cc[0] >= M || cc[1] >= M || cc[2] >= M) { allFound = false; break; }
          var v = getVertexIndex(cc[0], cc[1], cc[2]);
          if (v < 0) { allFound = false; break; }
          vi[qi] = v;
        }
        if (!allFound) { droppedCount++; continue; }

        var flip = sign0p;
        if (vi[0]!==vi[1]&&vi[0]!==vi[3]&&vi[1]!==vi[3]) {
          if (flip) faces.push3(vi[0],vi[3],vi[1]); else faces.push3(vi[0],vi[1],vi[3]);
        }
        if (vi[0]!==vi[2]&&vi[0]!==vi[3]&&vi[2]!==vi[3]) {
          if (flip) faces.push3(vi[0],vi[2],vi[3]); else faces.push3(vi[0],vi[3],vi[2]);
        }
      }
    }

    // Yield to UI every 64 blocks
    if ((phase2Blocks & 63) === 0) {
      onProgress('contouring', 50 + Math.round(50 * phase2Blocks / totalPhase2));
      await _tick();
    }
  }

  // Free block-local maps and sign data
  blockVertexMaps = null;
  blockVertexTemp = null;
  blockEdgeMaps = null;
  vertMapEntries = null;
  signMaps = null;

  onProgress('contouring', 100);
  console.log('DC sparse: ' + edgeCount + ' sign-change edges, ' + droppedCount + ' dropped, ' + (faces.length/3) + ' faces');

  return {
    positions: positions.trim(),
    normals: normals.trim(),
    indices: faces.trim(),
    vertexCount: vertexCount,
    faceCount: Math.floor(faces.length / 3)
  };
}
