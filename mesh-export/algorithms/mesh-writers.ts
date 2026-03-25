// mesh-writers.ts — GLB (binary glTF 2.0) and STL (binary) mesh export
// Converted from prototype mesh-writers.js
//
// Streaming exports: build Blob from typed array chunks instead of one giant
// ArrayBuffer, avoiding the ~2GB browser limit for large meshes.

// ============================================================================
// MeshData interface
// ============================================================================

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  colors?: Uint8Array;
  vertexCount: number;
  faceCount: number;
}

// ============================================================================
// BinaryWriter — growable little-endian binary buffer (for small headers only)
// ============================================================================

export class BinaryWriter {
  _buf: ArrayBuffer;
  _view: DataView;
  _u8: Uint8Array;
  _pos: number;

  constructor(initialSize?: number) {
    if (!initialSize) initialSize = 1024 * 1024;
    this._buf = new ArrayBuffer(initialSize);
    this._view = new DataView(this._buf);
    this._u8 = new Uint8Array(this._buf);
    this._pos = 0;
  }

  get pos(): number { return this._pos; }
  set pos(v: number) { this._pos = v; }

  _grow(needed: number): void {
    const required = this._pos + needed;
    if (required <= this._buf.byteLength) return;
    let newSize = this._buf.byteLength;
    while (newSize < required) newSize *= 2;
    const newBuf = new ArrayBuffer(newSize);
    new Uint8Array(newBuf).set(this._u8);
    this._buf = newBuf;
    this._view = new DataView(this._buf);
    this._u8 = new Uint8Array(this._buf);
  }

  u8(v: number): void { this._grow(1); this._view.setUint8(this._pos, v); this._pos += 1; }
  u16(v: number): void { this._grow(2); this._view.setUint16(this._pos, v, true); this._pos += 2; }
  u32(v: number): void { this._grow(4); this._view.setUint32(this._pos, v, true); this._pos += 4; }
  i32(v: number): void { this._grow(4); this._view.setInt32(this._pos, v, true); this._pos += 4; }
  f32(v: number): void { this._grow(4); this._view.setFloat32(this._pos, v, true); this._pos += 4; }

  raw(uint8array: Uint8Array): void {
    const len = uint8array.length;
    this._grow(len);
    this._u8.set(uint8array, this._pos);
    this._pos += len;
  }

  str(string: string): void {
    const len = string.length;
    this._grow(len);
    for (let i = 0; i < len; i++) this._u8[this._pos++] = string.charCodeAt(i) & 0x7F;
  }

  strNull(string: string): void { this.str(string); this.u8(0); }

  pad(alignment: number): void { this.padWith(alignment, 0); }

  padWith(alignment: number, byte: number): void {
    const remainder = this._pos % alignment;
    if (remainder === 0) return;
    const padding = alignment - remainder;
    this._grow(padding);
    for (let i = 0; i < padding; i++) this._u8[this._pos++] = byte;
  }

  bulkF32(float32array: Float32Array): void {
    const byteLen = float32array.byteLength;
    this._grow(byteLen);
    this._u8.set(new Uint8Array(float32array.buffer, float32array.byteOffset, byteLen), this._pos);
    this._pos += byteLen;
  }

  bulkU32(uint32array: Uint32Array): void {
    const byteLen = uint32array.byteLength;
    this._grow(byteLen);
    this._u8.set(new Uint8Array(uint32array.buffer, uint32array.byteOffset, byteLen), this._pos);
    this._pos += byteLen;
  }

  bulkU8(uint8array: Uint8Array): void { this.raw(uint8array); }

  result(): ArrayBuffer { return this._buf.slice(0, this._pos); }
}

// ============================================================================
// exportGLB(mesh) -> Blob
//
// Streaming: assembles Blob from typed array views — positions, normals, and
// indices are passed directly as Blob parts (zero-copy). Only the small JSON
// header and color conversion need temporary buffers.
//
// Vertex colors are stored as FLOAT VEC4 (not UNSIGNED_BYTE normalized).
// This avoids known import issues in Cinema 4D and some Blender versions.
// A PBR material with white baseColorFactor is included so importers
// wire vertex colors to the color channel automatically.
//
// mesh.colors should be a Uint8Array (RGBA, 0-255) — this function
// converts to Float32 internally.
// ============================================================================

export function exportGLB(mesh: MeshData): Blob {
  const positions = mesh.positions, normals = mesh.normals, colors = mesh.colors, indices = mesh.indices;
  const vertexCount = mesh.vertexCount, faceCount = mesh.faceCount;
  const hasColors = colors != null && colors.length > 0;

  // Compute bounding box
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    if (x < min[0]) min[0] = x; if (y < min[1]) min[1] = y; if (z < min[2]) min[2] = z;
    if (x > max[0]) max[0] = x; if (y > max[1]) max[1] = y; if (z > max[2]) max[2] = z;
  }

  // BIN chunk data sizes — colors stored as FLOAT VEC4 (16 bytes/vertex)
  const posSize = vertexCount * 12, normSize = vertexCount * 12;
  const colSize = hasColors ? vertexCount * 16 : 0;
  const idxSize = faceCount * 3 * 4;
  const posOff = 0, normOff = posSize, colOff = posSize + normSize, idxOff = posSize + normSize + colSize;
  const totalBin = posSize + normSize + colSize + idxSize;
  const binPadding = (4 - (totalBin % 4)) % 4;
  const binPadded = totalBin + binPadding;

  const bufferViews: Record<string, unknown>[] = [];
  const accessors: Record<string, unknown>[] = [];
  const attributes: Record<string, number> = {};
  let bv = 0, ac = 0;

  // Position
  bufferViews.push({ buffer: 0, byteOffset: posOff, byteLength: posSize, target: 34962 });
  accessors.push({ bufferView: bv, byteOffset: 0, componentType: 5126, count: vertexCount, type: 'VEC3',
    min: [min[0], min[1], min[2]], max: [max[0], max[1], max[2]] });
  attributes['POSITION'] = ac; bv++; ac++;

  // Normal
  bufferViews.push({ buffer: 0, byteOffset: normOff, byteLength: normSize, target: 34962 });
  accessors.push({ bufferView: bv, byteOffset: 0, componentType: 5126, count: vertexCount, type: 'VEC3' });
  attributes['NORMAL'] = ac; bv++; ac++;

  // Color (FLOAT VEC4)
  if (hasColors) {
    bufferViews.push({ buffer: 0, byteOffset: colOff, byteLength: colSize, target: 34962 });
    accessors.push({ bufferView: bv, byteOffset: 0, componentType: 5126, count: vertexCount, type: 'VEC4' });
    attributes['COLOR_0'] = ac; bv++; ac++;
  }

  // Indices
  const idxAcc = ac;
  bufferViews.push({ buffer: 0, byteOffset: idxOff, byteLength: idxSize, target: 34963 });
  accessors.push({ bufferView: bv, byteOffset: 0, componentType: 5125, count: faceCount * 3, type: 'SCALAR' });

  const primitive: Record<string, unknown> = { attributes: attributes, indices: idxAcc, mode: 4 };
  const gltf: Record<string, unknown> = {
    asset: { version: '2.0', generator: 'GMT Fractal Explorer' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [primitive] }],
    accessors: accessors, bufferViews: bufferViews,
    buffers: [{ byteLength: totalBin }]
  };

  // PBR material so vertex colors display correctly in DCC apps
  if (hasColors) {
    gltf.materials = [{
      name: 'FractalVertexColor',
      pbrMetallicRoughness: {
        baseColorFactor: [1.0, 1.0, 1.0, 1.0],
        metallicFactor: 0.0,
        roughnessFactor: 1.0
      }
    }];
    primitive.material = 0;
  }

  const jsonStr = JSON.stringify(gltf);
  const jsonPadding = (4 - (jsonStr.length % 4)) % 4;
  const jsonPadded = jsonStr.length + jsonPadding;
  const totalLength = 12 + 8 + jsonPadded + 8 + binPadded;

  // Build GLB header + JSON chunk as a small buffer
  const hdrSize = 12 + 8 + jsonPadded + 8; // GLB header + JSON chunk + BIN chunk header
  const hw = new BinaryWriter(hdrSize + 16);

  // GLB header
  hw.u32(0x46546C67); hw.u32(2); hw.u32(totalLength);

  // JSON chunk
  hw.u32(jsonPadded); hw.u32(0x4E4F534A);
  hw.str(jsonStr);
  for (let pi = 0; pi < jsonPadding; pi++) hw.u8(0x20);

  // BIN chunk header
  hw.u32(binPadded); hw.u32(0x004E4942);

  // Assemble Blob from ArrayBuffer slices
  const toAB = (ta: { buffer: ArrayBufferLike; byteOffset: number; byteLength: number }) =>
    (ta.buffer as ArrayBuffer).slice(ta.byteOffset, ta.byteOffset + ta.byteLength);

  const parts: ArrayBuffer[] = [
    hw._buf.slice(0, hw._pos),  // GLB header + JSON + BIN header
    toAB(positions),             // positions
    toAB(normals),               // normals
  ];

  if (hasColors) {
    // Convert Uint8 colors (0-255) to Float32 (0.0-1.0) for maximum DCC compatibility
    const colF32 = new Float32Array(vertexCount * 4);
    for (let ci = 0; ci < vertexCount * 4; ci++) colF32[ci] = colors![ci] / 255.0;
    parts.push(colF32.buffer as ArrayBuffer);
  }

  parts.push(toAB(indices)); // indices

  if (binPadding > 0) {
    parts.push(new ArrayBuffer(binPadding)); // padding zeros
  }

  return new Blob(parts, { type: 'application/octet-stream' });
}

// ============================================================================
// exportSTL(mesh) -> Blob
//
// Streaming: writes triangles in chunks of ~64K faces (~3.2MB each) to avoid
// allocating one giant buffer. Handles meshes with billions of bytes of STL.
// Standard binary STL. No vertex colors (STL spec doesn't support them).
// ============================================================================

export async function exportSTL(mesh: MeshData, onProgress?: (percent: number) => void): Promise<Blob> {
  const progressFn = onProgress || function(){};
  const positions = mesh.positions, indices = mesh.indices, faceCount = mesh.faceCount;

  // STL header (84 bytes: 80-byte header + 4-byte triangle count)
  const hdr = new ArrayBuffer(84);
  const hdrView = new DataView(hdr);
  const hdrStr = 'Fractal Mesh Export - GMT Fractal Explorer';
  for (let i = 0; i < hdrStr.length; i++) hdrView.setUint8(i, hdrStr.charCodeAt(i) & 0x7F);
  for (let i = hdrStr.length; i < 80; i++) hdrView.setUint8(i, 0x20);
  hdrView.setUint32(80, faceCount, true);

  const parts: BlobPart[] = [new Uint8Array(hdr)];

  // Write triangles in chunks — 50 bytes per triangle, ~64K triangles per chunk
  const CHUNK_FACES = 65536;
  const totalChunks = Math.ceil(faceCount / CHUNK_FACES);

  for (let start = 0; start < faceCount; start += CHUNK_FACES) {
    const end = Math.min(start + CHUNK_FACES, faceCount);
    const count = end - start;
    const buf = new ArrayBuffer(count * 50);
    const view = new DataView(buf);
    let off = 0;

    for (let f = start; f < end; f++) {
      const i0 = indices[f * 3], i1 = indices[f * 3 + 1], i2 = indices[f * 3 + 2];
      const ax = positions[i0 * 3], ay = positions[i0 * 3 + 1], az = positions[i0 * 3 + 2];
      const bx = positions[i1 * 3], by = positions[i1 * 3 + 1], bz = positions[i1 * 3 + 2];
      const cx = positions[i2 * 3], cy = positions[i2 * 3 + 1], cz = positions[i2 * 3 + 2];
      const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
      const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
      let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len > 1e-12) { nx /= len; ny /= len; nz /= len; }
      view.setFloat32(off, nx, true); view.setFloat32(off + 4, ny, true); view.setFloat32(off + 8, nz, true);
      view.setFloat32(off + 12, ax, true); view.setFloat32(off + 16, ay, true); view.setFloat32(off + 20, az, true);
      view.setFloat32(off + 24, bx, true); view.setFloat32(off + 28, by, true); view.setFloat32(off + 32, bz, true);
      view.setFloat32(off + 36, cx, true); view.setFloat32(off + 40, cy, true); view.setFloat32(off + 44, cz, true);
      view.setUint16(off + 48, 0, true);
      off += 50;
    }

    parts.push(new Uint8Array(buf));

    // Yield to UI every 8 chunks for progress updates
    const chunkIdx = (start / CHUNK_FACES) | 0;
    if ((chunkIdx & 7) === 0) {
      progressFn(Math.round(100 * (chunkIdx + 1) / totalChunks));
      await new Promise<void>(function(r) { setTimeout(r, 0); });
    }
  }

  progressFn(100);
  return new Blob(parts, { type: 'application/octet-stream' });
}

// ============================================================================
// Export size estimation (for UI display before export)
// ============================================================================

export function estimateExportSize(mesh: MeshData, format: string): number {
  if (format === 'stl') {
    return 84 + mesh.faceCount * 50;
  } else {
    // GLB: header + positions + normals + colors + indices
    const hasColors = mesh.colors != null && mesh.colors.length > 0;
    const colSize = hasColors ? mesh.vertexCount * 16 : 0;
    return 1024 + mesh.vertexCount * 24 + colSize + mesh.faceCount * 12;
  }
}

// ============================================================================
// Download helper
// ============================================================================

export function downloadBlob(blob: Blob, filename: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
