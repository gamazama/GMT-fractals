// sdf-filter.js — SDF filtering: min feature size, morphological closing, cavity fill
// Plain ES2020, no modules. All symbols are global.
// GMT Fractal Explorer — mesh export prototype
//
// Provides:
//   applyMinFeatureDense(grid, N, threshold)
//   applyMinFeatureSparse(sparseGrid, threshold)
//   morphCloseDense(grid, N, radius, onProgress)
//   morphCloseSparse(sparseGrid, radius, onProgress)
//   separableFilter(src, dst, N, radius, op)
//   cavityFillDense(grid, N, onProgress)
//   cavityFillDilate(sparseGrid, radius, onProgress)

// ============================================================================
// Min Feature Size
// ============================================================================

/**
 * Minimum feature size: flip deeply interior cells to positive (outside).
 * Any cell with sdf < -threshold is set to +threshold, eliminating zero-crossings
 * deeper than threshold from the surface. This removes interior cavities while
 * preserving the outer shell (cells near the surface where |sdf| < threshold are untouched).
 * Works on dense Float32Array grid.
 */
function applyMinFeatureDense(grid, N, threshold) {
  var clamped = 0;
  for (var i = 0; i < grid.length; i++) {
    if (grid[i] < -threshold) { grid[i] = threshold; clamped++; }
  }
  return clamped;
}

/**
 * Minimum feature size for sparse grid.
 * Flips deeply interior cells to positive in allocated blocks only.
 */
function applyMinFeatureSparse(sparseGrid, threshold) {
  var clamped = 0;
  sparseGrid.blocks.forEach(function(block) {
    for (var i = 0; i < block.length; i++) {
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
function separableFilter(src, dst, N, radius, op) {
  // Pass along X
  var tmp1 = new Float32Array(src.length);
  for (var z = 0; z < N; z++) {
    for (var y = 0; y < N; y++) {
      var row = z * N * N + y * N;
      for (var x = 0; x < N; x++) {
        var best = src[row + x];
        for (var dx = -radius; dx <= radius; dx++) {
          var nx = x + dx;
          if (nx >= 0 && nx < N) best = op(best, src[row + nx]);
        }
        tmp1[row + x] = best;
      }
    }
  }
  // Pass along Y
  var tmp2 = new Float32Array(src.length);
  for (var z = 0; z < N; z++) {
    for (var x = 0; x < N; x++) {
      for (var y = 0; y < N; y++) {
        var idx = z * N * N + y * N + x;
        var best = tmp1[idx];
        for (var dy = -radius; dy <= radius; dy++) {
          var ny = y + dy;
          if (ny >= 0 && ny < N) best = op(best, tmp1[z * N * N + ny * N + x]);
        }
        tmp2[idx] = best;
      }
    }
  }
  // Pass along Z
  for (var y = 0; y < N; y++) {
    for (var x = 0; x < N; x++) {
      for (var z = 0; z < N; z++) {
        var idx = z * N * N + y * N + x;
        var best = tmp2[idx];
        for (var dz = -radius; dz <= radius; dz++) {
          var nz = z + dz;
          if (nz >= 0 && nz < N) best = op(best, tmp2[nz * N * N + y * N + x]);
        }
        dst[idx] = best;
      }
    }
  }
}

/**
 * Morphological closing on a dense grid: dilate (subtract radius) then erode (add radius).
 * This fills gaps/cavities smaller than radius while preserving the outer shape.
 * Uses a fast separable min/max filter (3-pass per operation).
 * radius is in voxels (integer).
 */
async function morphCloseDense(grid, N, radius, onProgress) {
  onProgress = onProgress || function(){};
  if (radius <= 0) return;
  var r = Math.round(radius);
  var len = N * N * N;
  var tmp = new Float32Array(len);

  // Separable min filter (dilate) along X, Y, Z
  onProgress(0);
  separableFilter(grid, tmp, N, r, Math.min);
  onProgress(25);
  await new Promise(function(re) { setTimeout(re, 0); });

  // Separable max filter (erode) along X, Y, Z
  separableFilter(tmp, grid, N, r, Math.max);
  onProgress(50);
}

/**
 * Morphological closing on a sparse grid.
 * Operates block-by-block with neighbor lookups for boundary cells.
 * radius is in voxels.
 */
async function morphCloseSparse(sparseGrid, radius, onProgress) {
  onProgress = onProgress || function(){};
  if (radius <= 0) return;
  var r = Math.round(radius);
  var N = sparseGrid.N;
  var bs = sparseGrid.blockSize;

  for (var pass = 0; pass < 2; pass++) {
    var op = pass === 0 ? Math.min : Math.max;
    var result = new Map();

    sparseGrid.blocks.forEach(function(block, key) {
      var filtered = new Float32Array(block.length);
      var bpa = sparseGrid.blocksPerAxis;
      var bx = key % bpa;
      var by = ((key / bpa) | 0) % bpa;
      var bz = (key / (bpa * bpa)) | 0;
      var startX = bx * bs, startY = by * bs, startZ = bz * bs;

      for (var lz = 0; lz < bs; lz++) {
        for (var ly = 0; ly < bs; ly++) {
          for (var lx = 0; lx < bs; lx++) {
            var best = block[(lz * bs + ly) * bs + lx];
            for (var dz = -r; dz <= r; dz++) {
              for (var dy = -r; dy <= r; dy++) {
                for (var dx = -r; dx <= r; dx++) {
                  var gx = startX + lx + dx, gy = startY + ly + dy, gz = startZ + lz + dz;
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

    result.forEach(function(block, key) {
      sparseGrid.blocks.set(key, block);
    });

    onProgress(pass === 0 ? 50 : 100);
    await new Promise(function(re) { setTimeout(re, 0); });
  }
}

// ============================================================================
// Cavity Fill — Dense Grid
// ============================================================================

/**
 * Cavity fill for dense grid. Flood-fill from grid boundary through positive
 * (outside) cells. Any positive cell not reached is an interior cavity → flip negative.
 * Uses a BFS with a flat queue. Visited bits stored as Uint8Array (1 bit per cell).
 * @param {Float32Array} grid
 * @param {number} N
 * @param {function} onProgress
 * @param {function} checkCancel - called periodically; should throw if cancelled
 * @returns {number} cells filled
 */
async function cavityFillDense(grid, N, onProgress, checkCancel) {
  onProgress = onProgress || function(){};
  checkCancel = checkCancel || function(){};
  var totalCells = N * N * N;
  var visitedBytes = (totalCells + 7) >> 3;
  var visited = new Uint8Array(visitedBytes);

  function idx(x, y, z) { return (z * N + y) * N + x; }
  function isVisited(i) { return (visited[i >> 3] & (1 << (i & 7))) !== 0; }
  function setVisited(i) { visited[i >> 3] |= (1 << (i & 7)); }

  var queueCap = Math.min(totalCells, 4 * 1024 * 1024);
  var queue = new Int32Array(queueCap);
  var qHead = 0, qTail = 0, qCount = 0;

  function enqueue(i) {
    if (qCount >= queueCap) {
      var newCap = queueCap * 2;
      var newQ = new Int32Array(newCap);
      for (var qi = 0; qi < qCount; qi++) newQ[qi] = queue[(qHead + qi) % queueCap];
      queue = newQ; qHead = 0; qTail = qCount; queueCap = newCap;
    }
    queue[qTail] = i;
    qTail = (qTail + 1) % queueCap;
    qCount++;
  }

  function dequeue() {
    var val = queue[qHead];
    qHead = (qHead + 1) % queueCap;
    qCount--;
    return val;
  }

  // Seed: all positive cells on the 6 boundary faces
  for (var z = 0; z < N; z++) {
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        if (x === 0 || x === N-1 || y === 0 || y === N-1 || z === 0 || z === N-1) {
          var i = idx(x, y, z);
          if (grid[i] >= 0 && !isVisited(i)) {
            setVisited(i);
            enqueue(i);
          }
        }
      }
    }
  }

  onProgress(5);

  var processed = 0;
  while (qCount > 0) {
    var ci = dequeue();
    var cx = ci % N;
    var cy = ((ci / N) | 0) % N;
    var cz = (ci / (N * N)) | 0;

    var nx = [cx-1, cx+1, cx, cx, cx, cx];
    var ny = [cy, cy, cy-1, cy+1, cy, cy];
    var nz = [cz, cz, cz, cz, cz-1, cz+1];

    for (var ni = 0; ni < 6; ni++) {
      var nxx = nx[ni], nyy = ny[ni], nzz = nz[ni];
      if (nxx < 0 || nyy < 0 || nzz < 0 || nxx >= N || nyy >= N || nzz >= N) continue;
      var nIdx = idx(nxx, nyy, nzz);
      if (isVisited(nIdx)) continue;
      if (grid[nIdx] >= 0) {
        setVisited(nIdx);
        enqueue(nIdx);
      }
    }

    processed++;
    if ((processed & 0xFFFFF) === 0) {
      onProgress(5 + Math.round(85 * processed / totalCells));
      await new Promise(function(r) { setTimeout(r, 0); });
      checkCancel();
    }
  }

  // Any positive cell not visited = interior cavity → flip to negative
  var filled = 0;
  for (var i = 0; i < totalCells; i++) {
    if (grid[i] >= 0 && !isVisited(i)) {
      grid[i] = -Math.abs(grid[i]) - 0.001;
      filled++;
    }
  }

  onProgress(100);
  visited = null;
  queue = null;
  return filled;
}

// ============================================================================
// Cavity Fill — Sparse Grid (Dilate + Flood)
// ============================================================================

/**
 * Dilate-then-flood cavity fill for sparse grids.
 * 1. BFS-dilate interior (SDF<0) outward by `radius` voxels — closes
 *    passages narrower than 2*radius.
 * 2. Flood fill from boundary through non-dilated cells.
 * 3. Unreachable positive cells = sealed cavities → flip to negative.
 *
 * @param {SparseSDFGrid} sparseGrid
 * @param {number} radius — dilation radius in voxels
 * @param {function} onProgress
 * @param {function} checkCancel - called periodically; should throw if cancelled
 * @returns {{ filled, dilated, seeds }}
 */
async function cavityFillDilate(sparseGrid, radius, onProgress, checkCancel) {
  onProgress = onProgress || function(){};
  checkCancel = checkCancel || function(){};
  var N = sparseGrid.N;
  var bs = sparseGrid.blockSize;
  var bpa = sparseGrid.blocksPerAxis;
  var bytesPerBlock = (sparseGrid.blockCellCount + 7) >> 3;

  function bitGet(map, ix, iy, iz) {
    if (ix < 0 || iy < 0 || iz < 0 || ix >= N || iy >= N || iz >= N) return false;
    var bx = (ix / bs) | 0, by = (iy / bs) | 0, bz = (iz / bs) | 0;
    var bk = (bz * bpa + by) * bpa + bx;
    var bits = map.get(bk);
    if (!bits) return false;
    var lx = ix - bx * bs, ly = iy - by * bs, lz = iz - bz * bs;
    var li = (lz * bs + ly) * bs + lx;
    return (bits[li >> 3] & (1 << (li & 7))) !== 0;
  }

  function bitSet(map, ix, iy, iz) {
    var bx = (ix / bs) | 0, by = (iy / bs) | 0, bz = (iz / bs) | 0;
    var bk = (bz * bpa + by) * bpa + bx;
    var bits = map.get(bk);
    if (!bits) return;
    var lx = ix - bx * bs, ly = iy - by * bs, lz = iz - bz * bs;
    var li = (lz * bs + ly) * bs + lx;
    bits[li >> 3] |= (1 << (li & 7));
  }

  // Growable typed-array BFS queue (coords only)
  var qBuf, qHead, qTail, qCap;
  function qInit(cap) {
    qCap = cap || 2 * 1024 * 1024;
    qBuf = new Int32Array(qCap);
    qHead = 0; qTail = 0;
  }
  function qGrow() {
    var count = qTail - qHead;
    var newCap = qCap * 2;
    var newBuf = new Int32Array(newCap);
    for (var i = 0; i < count; i++) newBuf[i] = qBuf[(qHead + i) % qCap];
    qBuf = newBuf; qHead = 0; qTail = count; qCap = newCap;
  }
  function qPush(v) {
    if (qTail - qHead >= qCap - 1) qGrow();
    qBuf[qTail++ % qCap] = v;
  }
  function qPop() { return qBuf[qHead++ % qCap]; }
  function qEmpty() { return qHead >= qTail; }
  function qFree() { qBuf = null; }

  // Growable BFS queue WITH distance tracking (for dilation)
  var dqCoords, dqDist, dqHead, dqTail, dqCap;
  function dqInit(cap) {
    dqCap = cap || 2 * 1024 * 1024;
    dqCoords = new Int32Array(dqCap);
    dqDist = new Uint8Array(dqCap);
    dqHead = 0; dqTail = 0;
  }
  function dqGrow() {
    var count = dqTail - dqHead;
    var newCap = dqCap * 2;
    var newC = new Int32Array(newCap);
    var newD = new Uint8Array(newCap);
    for (var i = 0; i < count; i++) {
      newC[i] = dqCoords[(dqHead + i) % dqCap];
      newD[i] = dqDist[(dqHead + i) % dqCap];
    }
    dqCoords = newC; dqDist = newD; dqHead = 0; dqTail = count; dqCap = newCap;
  }
  function dqPush(coord, dist) {
    if (dqTail - dqHead >= dqCap - 1) dqGrow();
    dqCoords[dqTail % dqCap] = coord;
    dqDist[dqTail % dqCap] = dist;
    dqTail++;
  }
  function dqPop() {
    var c = dqCoords[dqHead % dqCap];
    var d = dqDist[dqHead % dqCap];
    dqHead++;
    return { coord: c, dist: d };
  }
  function dqEmpty() { return dqHead >= dqTail; }
  function dqFree() { dqCoords = null; dqDist = null; }

  // ---- Step 1: Build sign field (1 = inside where SDF < 0) ----
  var signMap = new Map();
  sparseGrid.blocks.forEach(function(block, key) {
    var bits = new Uint8Array(bytesPerBlock);
    for (var i = 0; i < block.length; i++) {
      if (block[i] < 0) bits[i >> 3] |= (1 << (i & 7));
    }
    signMap.set(key, bits);
  });

  // ---- Step 2: BFS DILATE interior by R voxels ----
  dqInit();
  var dilateSeeds = 0;

  sparseGrid.blocks.forEach(function(block, key) {
    var bx = key % bpa, by = ((key / bpa) | 0) % bpa, bz = (key / (bpa * bpa)) | 0;
    var startX = bx * bs, startY = by * bs, startZ = bz * bs;
    for (var lz = 0; lz < bs; lz++) {
      for (var ly = 0; ly < bs; ly++) {
        for (var lx = 0; lx < bs; lx++) {
          var li = (lz * bs + ly) * bs + lx;
          if (block[li] < 0) continue;
          var ix = startX + lx, iy = startY + ly, iz = startZ + lz;
          var adjNeg = false;
          for (var d = 0; d < 6 && !adjNeg; d++) {
            var nx = ix + (d===0?-1:d===1?1:0), ny = iy + (d===2?-1:d===3?1:0), nz = iz + (d===4?-1:d===5?1:0);
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
  onProgress(5);
  var dilatedCount = 0, dilPops = 0;
  while (!dqEmpty()) {
    var item = dqPop();
    var ci = item.coord, dist = item.dist;
    var cx = ci % N, cy = ((ci / N) | 0) % N, cz = (ci / (N * N)) | 0;
    for (var d = 0; d < 6; d++) {
      var nx = cx + (d===0?-1:d===1?1:0), ny = cy + (d===2?-1:d===3?1:0), nz = cz + (d===4?-1:d===5?1:0);
      if (nx < 0 || ny < 0 || nz < 0 || nx >= N || ny >= N || nz >= N) continue;
      if (bitGet(signMap, nx, ny, nz)) continue;
      bitSet(signMap, nx, ny, nz);
      dilatedCount++;
      if (dist + 1 < radius) dqPush((nz * N + ny) * N + nx, dist + 1);
    }
    if ((++dilPops & 0x3FFFF) === 0) {
      onProgress(5 + Math.round(20 * Math.min(1, dilatedCount / (dilateSeeds * radius + 1))));
      await new Promise(function(r) { setTimeout(r, 0); });
      checkCancel();
    }
  }
  dqFree();
  console.log('[CavityFill] Dilate done: ' + dilatedCount + ' cells expanded');
  onProgress(30);

  // ---- Step 3: Flood fill from boundary through non-signMap cells ----
  var floodVisited = new Map();
  sparseGrid.blocks.forEach(function(block, key) {
    floodVisited.set(key, new Uint8Array(bytesPerBlock));
  });

  qInit();
  sparseGrid.blocks.forEach(function(block, key) {
    var signBits = signMap.get(key);
    var bx = key % bpa, by = ((key / bpa) | 0) % bpa, bz = (key / (bpa * bpa)) | 0;
    var startX = bx * bs, startY = by * bs, startZ = bz * bs;
    for (var lz = 0; lz < bs; lz++) {
      for (var ly = 0; ly < bs; ly++) {
        for (var lx = 0; lx < bs; lx++) {
          var li = (lz * bs + ly) * bs + lx;
          if (signBits[li >> 3] & (1 << (li & 7))) continue;
          var ix = startX + lx, iy = startY + ly, iz = startZ + lz;
          var isSeed = false;
          if (ix === 0 || ix === N-1 || iy === 0 || iy === N-1 || iz === 0 || iz === N-1) {
            isSeed = true;
          } else if (lx === 0 || lx === bs-1 || ly === 0 || ly === bs-1 || lz === 0 || lz === bs-1) {
            for (var d = 0; d < 6 && !isSeed; d++) {
              var nx = ix + (d===0?-1:d===1?1:0), ny = iy + (d===2?-1:d===3?1:0), nz = iz + (d===4?-1:d===5?1:0);
              var nbx = (nx / bs) | 0, nby = (ny / bs) | 0, nbz = (nz / bs) | 0;
              if (!sparseGrid.hasBlock(nbx, nby, nbz)) isSeed = true;
            }
          }
          if (isSeed) {
            var fv = floodVisited.get(key);
            fv[li >> 3] |= (1 << (li & 7));
            qPush((iz * N + iy) * N + ix);
          }
        }
      }
    }
  });

  var floodSeeds = qTail;
  console.log('[CavityFill] Flood fill: ' + floodSeeds + ' boundary seeds');
  onProgress(40);
  var flooded = 0, floodPops = 0;
  while (!qEmpty()) {
    var ci = qPop();
    var cx = ci % N, cy = ((ci / N) | 0) % N, cz = (ci / (N * N)) | 0;
    for (var d = 0; d < 6; d++) {
      var nx = cx + (d===0?-1:d===1?1:0), ny = cy + (d===2?-1:d===3?1:0), nz = cz + (d===4?-1:d===5?1:0);
      if (nx < 0 || ny < 0 || nz < 0 || nx >= N || ny >= N || nz >= N) continue;
      var nbx = (nx / bs) | 0, nby = (ny / bs) | 0, nbz = (nz / bs) | 0;
      var nbk = (nbz * bpa + nby) * bpa + nbx;
      var nlx = nx - nbx * bs, nly = ny - nby * bs, nlz = nz - nbz * bs;
      var nli = (nlz * bs + nly) * bs + nlx;
      var fv = floodVisited.get(nbk);
      if (!fv) continue;
      if (fv[nli >> 3] & (1 << (nli & 7))) continue;
      if (bitGet(signMap, nx, ny, nz)) continue;
      fv[nli >> 3] |= (1 << (nli & 7));
      qPush((nz * N + ny) * N + nx);
      flooded++;
    }
    if ((++floodPops & 0x3FFFF) === 0) {
      onProgress(40 + Math.round(40 * flooded / (flooded + (qTail - qHead) + 1)));
      await new Promise(function(r) { setTimeout(r, 0); });
      checkCancel();
    }
  }
  qFree();
  signMap = null;
  console.log('[CavityFill] Flood done: ' + flooded + ' cells reached');
  onProgress(85);

  // ---- Step 4: Fill unreachable positive cells ----
  var filled = 0;
  sparseGrid.blocks.forEach(function(block, key) {
    var vis = floodVisited.get(key);
    for (var i = 0; i < block.length; i++) {
      if (block[i] >= 0 && !(vis[i >> 3] & (1 << (i & 7)))) {
        block[i] = -Math.abs(block[i]) - 0.001;
        filled++;
      }
    }
  });

  onProgress(100);
  floodVisited = null;
  console.log('[CavityFill] Filled: ' + filled + ' cavity cells');
  return { filled: filled, dilated: dilatedCount, seeds: dilateSeeds };
}
