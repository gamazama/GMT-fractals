// mesh-preview.js — Interactive wireframe mesh preview (post-generation)
// Plain ES2020, no modules. All symbols are global.
// GMT Fractal Explorer — mesh export prototype
//
// Provides:
//   MeshPreviewState (constructor)
//   meshPreviewSetMesh(state, positions, indices, vertexCount, faceCount, canvasWidth)
//   meshPreviewRender(state, ctx, w, h)

// ============================================================================
// State
// ============================================================================

/**
 * Create a new mesh preview state object.
 * @returns {object} state
 */
function MeshPreviewState() {
  return {
    positions: null, indices: null, normals: null,
    vertexCount: 0, faceCount: 0,
    rotX: -0.4, rotY: 0.6, zoom: 1.0,
    cx: 0, cy: 0, cz: 0, scale: 1,
    dragging: false, lastMX: 0, lastMY: 0
  };
}

// ============================================================================
// Setup
// ============================================================================

/**
 * Set mesh data and compute bounding box for centering/scaling.
 * @param {object} state - MeshPreviewState
 * @param {Float32Array} positions
 * @param {Uint32Array} indices
 * @param {number} vertexCount
 * @param {number} faceCount
 * @param {number} canvasWidth - canvas width for scale computation
 */
function meshPreviewSetMesh(state, positions, indices, vertexCount, faceCount, canvasWidth) {
  state.positions = positions;
  state.indices = indices;
  state.vertexCount = vertexCount;
  state.faceCount = faceCount;

  var minX = Infinity, minY = Infinity, minZ = Infinity;
  var maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (var i = 0; i < vertexCount; i++) {
    var x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
  }
  state.cx = (minX + maxX) / 2;
  state.cy = (minY + maxY) / 2;
  state.cz = (minZ + maxZ) / 2;
  state.scale = canvasWidth / (Math.max(maxX - minX, maxY - minY, maxZ - minZ) * 1.15);
}

// ============================================================================
// Rendering
// ============================================================================

/**
 * Render wireframe mesh preview to a 2D canvas context.
 * @param {object} state - MeshPreviewState
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w - canvas width
 * @param {number} h - canvas height
 */
function meshPreviewRender(state, ctx, w, h) {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  if (!state.positions || state.vertexCount === 0) return;

  var cosX = Math.cos(state.rotX), sinX = Math.sin(state.rotX);
  var cosY = Math.cos(state.rotY), sinY = Math.sin(state.rotY);
  var sc = state.scale * state.zoom;

  function proj(i) {
    var x = state.positions[i * 3] - state.cx;
    var y = state.positions[i * 3 + 1] - state.cy;
    var z = state.positions[i * 3 + 2] - state.cz;
    var rx = x * cosY - z * sinY;
    var rz = x * sinY + z * cosY;
    var ry = y * cosX - rz * sinX;
    return [rx * sc + w / 2, h / 2 - ry * sc];
  }

  // Uniform face sampling to prevent tiling artifacts at high res
  var maxDraw = 150000;
  var stride = state.faceCount > maxDraw ? Math.ceil(state.faceCount / maxDraw) : 1;
  var drawn = 0;

  ctx.strokeStyle = 'rgba(42,170,85,0.12)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (var f = 0; f < state.faceCount && drawn < maxDraw; f += stride) {
    var a = proj(state.indices[f * 3]), b = proj(state.indices[f * 3 + 1]), c = proj(state.indices[f * 3 + 2]);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(a[0], a[1]);
    drawn++;
  }
  ctx.stroke();

  ctx.fillStyle = '#888';
  ctx.font = '11px monospace';
  ctx.fillText(state.vertexCount.toLocaleString() + ' verts, ' + state.faceCount.toLocaleString() + ' faces', 4, h - 4);
  ctx.fillStyle = '#555';
  ctx.fillText('drag to rotate, scroll to zoom', 4, 14);
}
