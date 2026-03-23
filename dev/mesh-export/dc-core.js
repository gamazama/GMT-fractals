// dc-core.js — Uniform-grid Dual Contouring mesh extraction from SDF grid
// Plain ES2020, no modules. All symbols are global.
// GMT Fractal Explorer — prototype mesh export

// ============================================================================
// Growable Typed Arrays — avoids boxed-double overhead of JS arrays.
// At 20M vertices, JS arrays use ~8 bytes/element (boxed doubles) vs 4 bytes
// for Float32. This saves ~60% memory for large meshes.
// Used by both dense DC (this file) and sparse DC (sparse-grid.js).
// ============================================================================

function GrowableFloat32(initialCap) {
  this.data = new Float32Array(initialCap || 65536);
  this.length = 0;
}
GrowableFloat32.prototype.push3 = function(a, b, c) {
  if (this.length + 3 > this.data.length) {
    var newCap = this.data.length * 2;
    var nd = new Float32Array(newCap);
    nd.set(this.data);
    this.data = nd;
  }
  this.data[this.length++] = a;
  this.data[this.length++] = b;
  this.data[this.length++] = c;
};
GrowableFloat32.prototype.trim = function() {
  return this.data.subarray(0, this.length);
};

function GrowableUint32(initialCap) {
  this.data = new Uint32Array(initialCap || 65536);
  this.length = 0;
}
GrowableUint32.prototype.push3 = function(a, b, c) {
  if (this.length + 3 > this.data.length) {
    var newCap = this.data.length * 2;
    var nd = new Uint32Array(newCap);
    nd.set(this.data);
    this.data = nd;
  }
  this.data[this.length++] = a;
  this.data[this.length++] = b;
  this.data[this.length++] = c;
};
GrowableUint32.prototype.trim = function() {
  return this.data.subarray(0, this.length);
};

// ============================================================================
// SDF Grid Helpers
// ============================================================================

/**
 * Sample SDF at integer grid coordinates, clamped to [0, N-1].
 */
function sdfAt(grid, N, ix, iy, iz) {
  ix = ix | 0; iy = iy | 0; iz = iz | 0;
  ix = ix < 0 ? 0 : ix >= N ? N - 1 : ix;
  iy = iy < 0 ? 0 : iy >= N ? N - 1 : iy;
  iz = iz < 0 ? 0 : iz >= N ? N - 1 : iz;
  return grid[(iz * N + iy) * N + ix];
}

/**
 * Trilinear interpolation at fractional grid coordinates.
 */
function sdfLerp(grid, N, fx, fy, fz) {
  var x0 = Math.floor(fx), y0 = Math.floor(fy), z0 = Math.floor(fz);
  var tx = fx - x0, ty = fy - y0, tz = fz - z0;
  var c000 = sdfAt(grid, N, x0, y0, z0),     c100 = sdfAt(grid, N, x0+1, y0, z0);
  var c010 = sdfAt(grid, N, x0, y0+1, z0),   c110 = sdfAt(grid, N, x0+1, y0+1, z0);
  var c001 = sdfAt(grid, N, x0, y0, z0+1),   c101 = sdfAt(grid, N, x0+1, y0, z0+1);
  var c011 = sdfAt(grid, N, x0, y0+1, z0+1), c111 = sdfAt(grid, N, x0+1, y0+1, z0+1);
  var c00 = c000 * (1 - tx) + c100 * tx, c10 = c010 * (1 - tx) + c110 * tx;
  var c01 = c001 * (1 - tx) + c101 * tx, c11 = c011 * (1 - tx) + c111 * tx;
  var c0 = c00 * (1 - ty) + c10 * ty, c1 = c01 * (1 - ty) + c11 * ty;
  return c0 * (1 - tz) + c1 * tz;
}

/**
 * Normalized SDF gradient via central differences at fractional grid coords.
 * Returns [gx, gy, gz]. If gradient is near-zero, returns [0,1,0].
 */
function sdfGradient(grid, N, fx, fy, fz) {
  var h = 0.5;
  var gx = sdfLerp(grid, N, fx+h, fy, fz) - sdfLerp(grid, N, fx-h, fy, fz);
  var gy = sdfLerp(grid, N, fx, fy+h, fz) - sdfLerp(grid, N, fx, fy-h, fz);
  var gz = sdfLerp(grid, N, fx, fy, fz+h) - sdfLerp(grid, N, fx, fy, fz-h);
  var len = Math.sqrt(gx*gx + gy*gy + gz*gz);
  if (len < 1e-10) return [0, 1, 0];
  var inv = 1 / len;
  return [gx * inv, gy * inv, gz * inv];
}

/**
 * Convert a grid-space coordinate (fractional) to world-space.
 */
function gridToWorld(gx, N, gridMin, gridMax) {
  return gridMin + (gx / (N - 1)) * (gridMax - gridMin);
}

/**
 * Convert a world-space coordinate to fractional grid-space.
 */
function worldToGrid(wx, N, gridMin, gridMax) {
  return ((wx - gridMin) / (gridMax - gridMin)) * (N - 1);
}

// ============================================================================
// Edge Table — 12 edges of a cube
// Corner index: bit 0 = x, bit 1 = y, bit 2 = z
// ============================================================================

var EDGE_TABLE = [
  [0, 1], [2, 3], [4, 5], [6, 7],   // 4 edges along X
  [0, 2], [1, 3], [4, 6], [5, 7],   // 4 edges along Y
  [0, 4], [1, 5], [2, 6], [3, 7]    // 4 edges along Z
];

// ============================================================================
// QEF Solver (3x3 via Cramer's rule with Tikhonov regularization)
// ============================================================================

/**
 * Solve QEF from edge crossings.
 * crossings: array of {point: [x,y,z], normal: [nx,ny,nz]} in world space
 * cellMin, cellMax: world-space bounds for clamping
 * Returns [vx, vy, vz] or null.
 */
function solveQEF(crossings, cellMin, cellMax) {
  if (crossings.length === 0) return null;

  // Mass point (centroid of crossing positions)
  var mpx = 0, mpy = 0, mpz = 0;
  for (var i = 0; i < crossings.length; i++) {
    mpx += crossings[i].point[0];
    mpy += crossings[i].point[1];
    mpz += crossings[i].point[2];
  }
  var invN = 1.0 / crossings.length;
  mpx *= invN; mpy *= invN; mpz *= invN;

  // Build ATA (3x3 symmetric) and ATb (3x1)
  var a00 = 0, a01 = 0, a02 = 0;
  var a11 = 0, a12 = 0, a22 = 0;
  var b0 = 0, b1 = 0, b2 = 0;

  for (var i = 0; i < crossings.length; i++) {
    var n = crossings[i].normal, p = crossings[i].point;
    var d = n[0] * p[0] + n[1] * p[1] + n[2] * p[2];
    a00 += n[0] * n[0]; a01 += n[0] * n[1]; a02 += n[0] * n[2];
    a11 += n[1] * n[1]; a12 += n[1] * n[2]; a22 += n[2] * n[2];
    b0 += n[0] * d; b1 += n[1] * d; b2 += n[2] * d;
  }

  // Tikhonov regularization toward mass point
  var reg = 0.01;
  a00 += reg; a11 += reg; a22 += reg;
  b0 += reg * mpx; b1 += reg * mpy; b2 += reg * mpz;

  // Cramer's rule for 3x3 symmetric system
  var det = a00 * (a11 * a22 - a12 * a12)
          - a01 * (a01 * a22 - a12 * a02)
          + a02 * (a01 * a12 - a11 * a02);

  var vx, vy, vz;
  if (Math.abs(det) < 1e-6) {
    vx = mpx; vy = mpy; vz = mpz;
  } else {
    var inv = 1.0 / det;
    vx = inv * (b0 * (a11 * a22 - a12 * a12) - a01 * (b1 * a22 - a12 * b2) + a02 * (b1 * a12 - a11 * b2));
    vy = inv * (a00 * (b1 * a22 - a12 * b2) - b0 * (a01 * a22 - a12 * a02) + a02 * (a01 * b2 - b1 * a02));
    vz = inv * (a00 * (a11 * b2 - b1 * a12) - a01 * (a01 * b2 - b1 * a02) + b0 * (a01 * a12 - a11 * a02));
  }

  // Clamp to cell bounds + 10% margin
  var mx = (cellMax[0] - cellMin[0]) * 0.1;
  var my = (cellMax[1] - cellMin[1]) * 0.1;
  var mz = (cellMax[2] - cellMin[2]) * 0.1;
  vx = Math.max(cellMin[0] - mx, Math.min(cellMax[0] + mx, vx));
  vy = Math.max(cellMin[1] - my, Math.min(cellMax[1] + my, vy));
  vz = Math.max(cellMin[2] - mz, Math.min(cellMax[2] + mz, vz));

  return [vx, vy, vz];
}

// ============================================================================
// Uniform-Grid Dual Contouring (async, yields to prevent UI freezing)
// Used for dense grids at resolutions <= 256^3
// ============================================================================

/**
 * Extract a triangle mesh from a dense SDF grid using dual contouring.
 *
 * @param {Float32Array} sdfGrid  SDF values indexed as grid[z*N*N + y*N + x]
 * @param {number} N              Grid resolution per axis
 * @param {number} gridMin        World-space minimum (same for all axes)
 * @param {number} gridMax        World-space maximum
 * @param {number} maxDepth       Unused (sparse variant uses block depth)
 * @param {function} onProgress   Callback: onProgress(phase, percentInt)
 * @returns {Promise<{ positions: Float32Array, normals: Float32Array, indices: Uint32Array,
 *             vertexCount: number, faceCount: number }>}
 */
async function dualContour(sdfGrid, N, gridMin, gridMax, maxDepth, onProgress) {
  onProgress = onProgress || function(){};
  var _tick = function() { return new Promise(function(r) { setTimeout(r, 0); }).then(function() { if (window.cancelRequested) throw new Error('CANCELLED'); }); };
  var M = N - 1; // cells per axis

  // ---- Phase 1: Find sign-change cells, compute vertices ----
  onProgress('contouring', 0);
  var vertexMap = new Map();
  var posArr = new GrowableFloat32(8192);
  var normArr = new GrowableFloat32(8192);
  var vertexCount = 0;

  for (var iz = 0; iz < M; iz++) {
    if ((iz & 7) === 0) {
      onProgress('contouring', Math.round(40 * iz / M));
      await _tick();
    }
    for (var iy = 0; iy < M; iy++) {
      for (var ix = 0; ix < M; ix++) {
        var s0 = sdfGrid[(iz * N + iy) * N + ix];
        var sign0 = s0 >= 0;
        var s = [s0,
          sdfGrid[(iz * N + iy) * N + ix + 1],
          sdfGrid[(iz * N + (iy + 1)) * N + ix],
          sdfGrid[(iz * N + (iy + 1)) * N + ix + 1],
          sdfGrid[((iz + 1) * N + iy) * N + ix],
          sdfGrid[((iz + 1) * N + iy) * N + ix + 1],
          sdfGrid[((iz + 1) * N + (iy + 1)) * N + ix],
          sdfGrid[((iz + 1) * N + (iy + 1)) * N + ix + 1]
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

          var c0x = ix + (e[0] & 1), c0y = iy + ((e[0] >> 1) & 1), c0z = iz + ((e[0] >> 2) & 1);
          var c1x = ix + (e[1] & 1), c1y = iy + ((e[1] >> 1) & 1), c1z = iz + ((e[1] >> 2) & 1);

          // Binary search for zero-crossing on trilinearly interpolated SDF
          var lo0 = c0x, lo1 = c0y, lo2 = c0z, hi0 = c1x, hi1 = c1y, hi2 = c1z;
          var sLo = s0v, sHi = s1v;
          for (var bsi = 0; bsi < 8; bsi++) {
            var mx = (lo0 + hi0) * 0.5, my = (lo1 + hi1) * 0.5, mz = (lo2 + hi2) * 0.5;
            var sm = sdfLerp(sdfGrid, N, mx, my, mz);
            if ((sm >= 0) === (sLo >= 0)) { lo0 = mx; lo1 = my; lo2 = mz; sLo = sm; }
            else { hi0 = mx; hi1 = my; hi2 = mz; sHi = sm; }
          }
          var px = (lo0 + hi0) * 0.5, py = (lo1 + hi1) * 0.5, pz = (lo2 + hi2) * 0.5;
          var grad = sdfGradient(sdfGrid, N, px, py, pz);
          crossings.push({
            point: [gridToWorld(px, N, gridMin, gridMax), gridToWorld(py, N, gridMin, gridMax), gridToWorld(pz, N, gridMin, gridMax)],
            normal: grad
          });
        }
        if (crossings.length === 0) continue;

        var cellMin = [gridToWorld(ix, N, gridMin, gridMax), gridToWorld(iy, N, gridMin, gridMax), gridToWorld(iz, N, gridMin, gridMax)];
        var cellMax = [gridToWorld(ix + 1, N, gridMin, gridMax), gridToWorld(iy + 1, N, gridMin, gridMax), gridToWorld(iz + 1, N, gridMin, gridMax)];
        var v = solveQEF(crossings, cellMin, cellMax);
        if (!v) continue;

        var grad2 = sdfGradient(sdfGrid, N, worldToGrid(v[0], N, gridMin, gridMax), worldToGrid(v[1], N, gridMin, gridMax), worldToGrid(v[2], N, gridMin, gridMax));
        var key = (iz * M + iy) * M + ix;
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
  var faces = new GrowableUint32(8192);
  var processedEdges = new Set();
  var edgeCount = 0, droppedCount = 0;
  var phase2Count = 0;
  var phase2Total = vertexMap.size;

  // Convert to array for async iteration
  var vmEntries = Array.from(vertexMap.entries());

  for (var vmi = 0; vmi < vmEntries.length; vmi++) {
    var vidx = vmEntries[vmi][1];
    var key = vmEntries[vmi][0];
    phase2Count++;

    var ix = key % M;
    var iy = ((key / M) | 0) % M;
    var iz = (key / (M * M)) | 0;

    for (var ei = 0; ei < 12; ei++) {
      var e = EDGE_TABLE[ei];
      var c0x = ix + (e[0] & 1), c0y = iy + ((e[0] >> 1) & 1), c0z = iz + ((e[0] >> 2) & 1);
      var c1x = ix + (e[1] & 1), c1y = iy + ((e[1] >> 1) & 1), c1z = iz + ((e[1] >> 2) & 1);

      var sv0 = sdfGrid[(c0z * N + c0y) * N + c0x];
      var sv1 = sdfGrid[(c1z * N + c1y) * N + c1x];
      if ((sv0 >= 0) === (sv1 >= 0)) continue;

      var axis, eMinX = Math.min(c0x, c1x), eMinY = Math.min(c0y, c1y), eMinZ = Math.min(c0z, c1z);
      if (c0x !== c1x) axis = 0;
      else if (c0y !== c1y) axis = 1;
      else axis = 2;

      var edgeKey = (eMinZ * N + eMinY) * N * 4 + eMinX * 4 + axis;
      if (processedEdges.has(edgeKey)) continue;
      processedEdges.add(edgeKey);
      edgeCount++;

      var ax1 = (axis + 1) % 3, ax2 = (axis + 2) % 3;
      var ePos = [eMinX, eMinY, eMinZ];

      var vi = [-1, -1, -1, -1];
      var allFound = true;
      for (var qi = 0; qi < 4; qi++) {
        var cc = [ePos[0], ePos[1], ePos[2]];
        cc[ax1] -= (qi & 1) ? 0 : 1;
        cc[ax2] -= (qi & 2) ? 0 : 1;
        if (cc[0] < 0 || cc[1] < 0 || cc[2] < 0 || cc[0] >= M || cc[1] >= M || cc[2] >= M) { allFound = false; break; }
        var ckey = (cc[2] * M + cc[1]) * M + cc[0];
        var v = vertexMap.get(ckey);
        if (v === undefined) { allFound = false; break; }
        vi[qi] = v;
      }
      if (!allFound) { droppedCount++; continue; }

      var flip = sv0 >= 0;
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
      await _tick();
    }
  }

  onProgress('contouring', 100);
  console.log('DC: ' + edgeCount + ' sign-change edges, ' + droppedCount + ' dropped (boundary), ' + faces.length / 3 + ' faces');

  var positions = posArr.trim();
  var normals = normArr.trim();
  var indices = faces.trim();
  var faceCount = Math.floor(faces.length / 3);
  return { positions: positions, normals: normals, indices: indices, vertexCount: vertexCount, faceCount: faceCount };
}
