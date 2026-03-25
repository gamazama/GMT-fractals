// mesh-preview.ts — Interactive wireframe mesh preview (post-generation)
// Converted from prototype mesh-preview.js

export interface MeshPreviewState {
  positions: Float32Array | null;
  indices: Uint32Array | null;
  normals: Float32Array | null;
  vertexCount: number;
  faceCount: number;
  rotX: number;
  rotY: number;
  zoom: number;
  cx: number;
  cy: number;
  cz: number;
  scale: number;
  dragging: boolean;
  lastMX: number;
  lastMY: number;
}

export function createMeshPreviewState(): MeshPreviewState {
  return {
    positions: null, indices: null, normals: null,
    vertexCount: 0, faceCount: 0,
    rotX: -0.4, rotY: 0.6, zoom: 1.0,
    cx: 0, cy: 0, cz: 0, scale: 1,
    dragging: false, lastMX: 0, lastMY: 0,
  };
}

export function meshPreviewSetMesh(
  state: MeshPreviewState,
  positions: Float32Array,
  indices: Uint32Array,
  vertexCount: number,
  faceCount: number,
  canvasWidth: number,
): void {
  state.positions = positions;
  state.indices = indices;
  state.vertexCount = vertexCount;
  state.faceCount = faceCount;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
  }
  state.cx = (minX + maxX) / 2;
  state.cy = (minY + maxY) / 2;
  state.cz = (minZ + maxZ) / 2;
  state.scale = canvasWidth / (Math.max(maxX - minX, maxY - minY, maxZ - minZ) * 1.15);
}

export function meshPreviewRender(
  state: MeshPreviewState,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  if (!state.positions || !state.indices || state.vertexCount === 0) return;

  const cosX = Math.cos(state.rotX), sinX = Math.sin(state.rotX);
  const cosY = Math.cos(state.rotY), sinY = Math.sin(state.rotY);
  const sc = state.scale * state.zoom;
  const pos = state.positions;
  const cx = state.cx, cy = state.cy, cz = state.cz;

  function proj(i: number): [number, number] {
    const x = pos[i * 3] - cx;
    const y = pos[i * 3 + 1] - cy;
    const z = pos[i * 3 + 2] - cz;
    const rx = x * cosY - z * sinY;
    const rz = x * sinY + z * cosY;
    const ry = y * cosX - rz * sinX;
    return [rx * sc + w / 2, h / 2 - ry * sc];
  }

  const maxDraw = 150000;
  const stride = state.faceCount > maxDraw ? Math.ceil(state.faceCount / maxDraw) : 1;
  let drawn = 0;

  ctx.strokeStyle = 'rgba(42,170,85,0.12)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let f = 0; f < state.faceCount && drawn < maxDraw; f += stride) {
    const a = proj(state.indices[f * 3]);
    const b = proj(state.indices[f * 3 + 1]);
    const c = proj(state.indices[f * 3 + 2]);
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
