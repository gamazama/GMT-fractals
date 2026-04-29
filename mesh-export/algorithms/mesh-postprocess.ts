// Converted from prototype mesh-postprocess.js
// Mesh post-processing: smoothing, cleanup, normals
// GMT Fractal Explorer

import type { MeshData } from './mesh-writers';

// ============================================================================
// Types
// ============================================================================

export interface PostProcessOptions {
  smoothing?: boolean;
  smoothIterations?: number;
  lambda?: number;
  mu?: number;
}

// ============================================================================
// Adjacency
// ============================================================================

/**
 * Build adjacency list: for each vertex, the set of unique neighbor vertex indices.
 * WARNING: Creates one Set per vertex (~100+ bytes each). At >5M vertices this
 * exceeds 500 MB. Callers should check vertex count before calling.
 */
function buildAdjacency(indices: Uint32Array, vertexCount: number): Uint32Array[] {
  const adj: Set<number>[] = new Array(vertexCount);
  for (let v = 0; v < vertexCount; v++) adj[v] = new Set();
  for (let i = 0, len = indices.length; i < len; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    adj[a].add(b); adj[a].add(c);
    adj[b].add(a); adj[b].add(c);
    adj[c].add(a); adj[c].add(b);
  }
  const result: Uint32Array[] = new Array(vertexCount);
  for (let v = 0; v < vertexCount; v++) {
    const s = adj[v];
    const arr = new Uint32Array(s.size);
    let idx = 0;
    for (const nb of s) arr[idx++] = nb;
    result[v] = arr;
  }
  return result;
}

// ============================================================================
// Laplacian / Taubin Smoothing
// ============================================================================

/**
 * Apply one Laplacian smoothing step in-place via a temp buffer.
 */
function laplacianStep(
  positions: Float32Array,
  adjacency: Uint32Array[],
  factor: number,
  temp: Float32Array
): void {
  const vertexCount = adjacency.length;
  temp.set(positions);
  for (let v = 0; v < vertexCount; v++) {
    const neighbors = adjacency[v], nCount = neighbors.length;
    if (nCount === 0) continue;
    const i3 = v * 3;
    const px = temp[i3], py = temp[i3 + 1], pz = temp[i3 + 2];
    let dx = 0, dy = 0, dz = 0;
    for (let n = 0; n < nCount; n++) {
      const ni3 = neighbors[n] * 3;
      dx += temp[ni3] - px; dy += temp[ni3 + 1] - py; dz += temp[ni3 + 2] - pz;
    }
    const inv = factor / nCount;
    positions[i3] = px + dx * inv;
    positions[i3 + 1] = py + dy * inv;
    positions[i3 + 2] = pz + dz * inv;
  }
}

/**
 * Taubin smoothing: alternating positive/negative Laplacian steps
 * to smooth without shrinkage.
 */
export function taubinSmooth(
  mesh: MeshData,
  lambda: number = 0.5,
  mu: number = -0.53,
  iterations: number = 5
): MeshData {
  const adjacency = buildAdjacency(mesh.indices, mesh.vertexCount);
  const temp = new Float32Array(mesh.positions.length);
  for (let iter = 0; iter < iterations; iter++) {
    laplacianStep(mesh.positions, adjacency, lambda, temp);
    laplacianStep(mesh.positions, adjacency, mu, temp);
  }
  return mesh;
}

// ============================================================================
// Vertex Merging (spatial hash)
// ============================================================================

/**
 * Merge vertices within epsilon distance using spatial hashing.
 */
export function mergeCloseVertices(mesh: MeshData, epsilon: number = 1e-6): MeshData {
  const positions = mesh.positions, normals = mesh.normals, indices = mesh.indices;
  const vertexCount = mesh.vertexCount;
  const cellSize = epsilon > 0 ? epsilon : 1e-6;
  const invCell = 1.0 / cellSize;
  const grid = new Map<string, number[]>();
  const remap = new Int32Array(vertexCount);
  remap.fill(-1);
  const newPositions: number[] = [], newNormals: number[] = [];
  let newCount = 0;

  function cellKey(ix: number, iy: number, iz: number): string { return ix + ',' + iy + ',' + iz; }

  for (let v = 0; v < vertexCount; v++) {
    const v3 = v * 3;
    const px = positions[v3], py = positions[v3 + 1], pz = positions[v3 + 2];
    const ix = Math.floor(px * invCell), iy = Math.floor(py * invCell), iz = Math.floor(pz * invCell);
    let merged = false;

    for (let dx = -1; dx <= 1 && !merged; dx++) {
      for (let dy = -1; dy <= 1 && !merged; dy++) {
        for (let dz = -1; dz <= 1 && !merged; dz++) {
          const key = cellKey(ix + dx, iy + dy, iz + dz);
          const bucket = grid.get(key);
          if (bucket === undefined) continue;
          for (let b = 0; b < bucket.length; b++) {
            const other = bucket[b], o3 = other * 3;
            const ex = positions[o3] - px, ey = positions[o3 + 1] - py, ez = positions[o3 + 2] - pz;
            if (ex * ex + ey * ey + ez * ez <= epsilon * epsilon) {
              remap[v] = remap[other];
              merged = true;
              break;
            }
          }
        }
      }
    }

    if (!merged) {
      remap[v] = newCount;
      newPositions.push(px, py, pz);
      newNormals.push(normals[v3], normals[v3 + 1], normals[v3 + 2]);
      newCount++;
    }

    const homeKey = cellKey(ix, iy, iz);
    const homeBucket = grid.get(homeKey);
    if (homeBucket === undefined) grid.set(homeKey, [v]);
    else homeBucket.push(v);
  }

  const newIndices = new Uint32Array(indices.length);
  for (let i = 0, len = indices.length; i < len; i++) {
    newIndices[i] = remap[indices[i]];
  }

  return {
    positions: new Float32Array(newPositions),
    normals: new Float32Array(newNormals),
    indices: newIndices,
    vertexCount: newCount,
    faceCount: mesh.faceCount
  };
}

// ============================================================================
// Degenerate Face Removal
// ============================================================================

/**
 * Remove triangles with zero or near-zero area.
 */
export function removeDegenerateFaces(mesh: MeshData): MeshData {
  const positions = mesh.positions, indices = mesh.indices, faceCount = mesh.faceCount;
  const validIndices: number[] = [];
  for (let f = 0; f < faceCount; f++) {
    const fi = f * 3, ai = indices[fi] * 3, bi = indices[fi + 1] * 3, ci = indices[fi + 2] * 3;
    const abx = positions[bi] - positions[ai], aby = positions[bi + 1] - positions[ai + 1], abz = positions[bi + 2] - positions[ai + 2];
    const acx = positions[ci] - positions[ai], acy = positions[ci + 1] - positions[ai + 1], acz = positions[ci + 2] - positions[ai + 2];
    const cx = aby * acz - abz * acy, cy = abz * acx - abx * acz, cz = abx * acy - aby * acx;
    if (cx * cx + cy * cy + cz * cz >= 1e-20)
      validIndices.push(indices[fi], indices[fi + 1], indices[fi + 2]);
  }
  return {
    positions: mesh.positions, normals: mesh.normals,
    indices: new Uint32Array(validIndices),
    vertexCount: mesh.vertexCount,
    faceCount: validIndices.length / 3
  };
}

// ============================================================================
// Vertex Normal Recomputation
// ============================================================================

/**
 * Compute smooth vertex normals from face normals (area-weighted).
 * Operates on existing typed arrays -- no extra allocations.
 */
export function computeVertexNormals(mesh: MeshData): MeshData {
  const positions = mesh.positions, indices = mesh.indices, normals = mesh.normals;
  const vertexCount = mesh.vertexCount, faceCount = mesh.faceCount;

  for (let i = 0; i < vertexCount * 3; i++) normals[i] = 0;

  for (let f = 0; f < faceCount; f++) {
    const fi = f * 3, ia = indices[fi], ib = indices[fi + 1], ic = indices[fi + 2];
    const a3 = ia * 3, b3 = ib * 3, c3 = ic * 3;
    const abx = positions[b3] - positions[a3], aby = positions[b3 + 1] - positions[a3 + 1], abz = positions[b3 + 2] - positions[a3 + 2];
    const acx = positions[c3] - positions[a3], acy = positions[c3 + 1] - positions[a3 + 1], acz = positions[c3 + 2] - positions[a3 + 2];
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    normals[a3] += nx; normals[a3 + 1] += ny; normals[a3 + 2] += nz;
    normals[b3] += nx; normals[b3 + 1] += ny; normals[b3 + 2] += nz;
    normals[c3] += nx; normals[c3 + 1] += ny; normals[c3 + 2] += nz;
  }

  for (let v = 0; v < vertexCount; v++) {
    const v3 = v * 3, nx = normals[v3], ny = normals[v3 + 1], nz = normals[v3 + 2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 1e-12) { const inv = 1 / len; normals[v3] *= inv; normals[v3 + 1] *= inv; normals[v3 + 2] *= inv; }
  }
  return mesh;
}

// ============================================================================
// Winding Consistency
// ============================================================================

/**
 * Orient triangle winding so face normals point outward from mesh centroid.
 */
export function ensureConsistentWinding(mesh: MeshData): MeshData {
  const positions = mesh.positions, indices = mesh.indices;
  const vertexCount = mesh.vertexCount, faceCount = mesh.faceCount;

  let cx = 0, cy = 0, cz = 0;
  for (let v = 0; v < vertexCount; v++) {
    const v3 = v * 3;
    cx += positions[v3]; cy += positions[v3 + 1]; cz += positions[v3 + 2];
  }
  const inv = 1 / vertexCount; cx *= inv; cy *= inv; cz *= inv;

  for (let f = 0; f < faceCount; f++) {
    const fi = f * 3, ia = indices[fi], ib = indices[fi + 1], ic = indices[fi + 2];
    const a3 = ia * 3, b3 = ib * 3, c3 = ic * 3;
    const tcx = (positions[a3] + positions[b3] + positions[c3]) / 3;
    const tcy = (positions[a3 + 1] + positions[b3 + 1] + positions[c3 + 1]) / 3;
    const tcz = (positions[a3 + 2] + positions[b3 + 2] + positions[c3 + 2]) / 3;
    const abx = positions[b3] - positions[a3], aby = positions[b3 + 1] - positions[a3 + 1], abz = positions[b3 + 2] - positions[a3 + 2];
    const acx = positions[c3] - positions[a3], acy = positions[c3 + 1] - positions[a3 + 1], acz = positions[c3 + 2] - positions[a3 + 2];
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    if (nx * (tcx - cx) + ny * (tcy - cy) + nz * (tcz - cz) < 0) {
      const tmp = indices[fi + 1]; indices[fi + 1] = indices[fi + 2]; indices[fi + 2] = tmp;
    }
  }
  return mesh;
}

// ============================================================================
// Pipeline
// ============================================================================

/**
 * Run the full post-processing pipeline with automatic large-mesh guards.
 * - Degenerate face removal: skipped for >5M faces (JS array overhead)
 * - Taubin smoothing: skipped for >5M vertices (adjacency Set memory)
 * - Vertex normals: always runs (no extra allocations)
 */
export function postProcessMesh(mesh: MeshData, options?: PostProcessOptions): MeshData {
  const opts = options ?? {};
  const smoothing = opts.smoothing ?? true;
  const smoothIterations = opts.smoothIterations ?? 5;
  const lambda = opts.lambda ?? 0.5;
  const mu = opts.mu ?? -(lambda + 0.03);

  // Skip degenerate face removal for very large meshes (JS array push overhead)
  if (mesh.faceCount < 5000000) {
    mesh = removeDegenerateFaces(mesh);
  }

  // Skip smoothing for large meshes -- adjacency Set overhead is ~100 bytes x vertexCount
  // At >5M vertices, that alone exceeds 500 MB and crashes the tab.
  if (smoothing && smoothIterations > 0) {
    if (mesh.vertexCount > 5000000) {
      console.warn('Skipping smoothing: ' + mesh.vertexCount.toLocaleString() + ' vertices too large (>5M limit)');
    } else {
      mesh = taubinSmooth(mesh, lambda, mu, smoothIterations);
    }
  }

  mesh = computeVertexNormals(mesh);
  return mesh;
}
