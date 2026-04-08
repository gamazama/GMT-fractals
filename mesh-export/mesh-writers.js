// mesh-writers.js — GLB (binary glTF 2.0) and STL (binary) mesh export
// Plain ES2020, no modules. All symbols are global.
// GMT Fractal Explorer — prototype mesh export
//
// Streaming exports: build Blob from typed array chunks instead of one giant
// ArrayBuffer, avoiding the ~2GB browser limit for large meshes.

// ============================================================================
// BinaryWriter — growable little-endian binary buffer (for small headers only)
// ============================================================================

class BinaryWriter {
  constructor(initialSize) {
    if (!initialSize) initialSize = 1024 * 1024;
    this._buf = new ArrayBuffer(initialSize);
    this._view = new DataView(this._buf);
    this._u8 = new Uint8Array(this._buf);
    this._pos = 0;
  }

  get pos() { return this._pos; }
  set pos(v) { this._pos = v; }

  _grow(needed) {
    var required = this._pos + needed;
    if (required <= this._buf.byteLength) return;
    var newSize = this._buf.byteLength;
    while (newSize < required) newSize *= 2;
    var newBuf = new ArrayBuffer(newSize);
    new Uint8Array(newBuf).set(this._u8);
    this._buf = newBuf;
    this._view = new DataView(this._buf);
    this._u8 = new Uint8Array(this._buf);
  }

  u8(v) { this._grow(1); this._view.setUint8(this._pos, v); this._pos += 1; }
  u16(v) { this._grow(2); this._view.setUint16(this._pos, v, true); this._pos += 2; }
  u32(v) { this._grow(4); this._view.setUint32(this._pos, v, true); this._pos += 4; }
  i32(v) { this._grow(4); this._view.setInt32(this._pos, v, true); this._pos += 4; }
  f32(v) { this._grow(4); this._view.setFloat32(this._pos, v, true); this._pos += 4; }

  raw(uint8array) {
    var len = uint8array.length;
    this._grow(len);
    this._u8.set(uint8array, this._pos);
    this._pos += len;
  }

  str(string) {
    var len = string.length;
    this._grow(len);
    for (var i = 0; i < len; i++) this._u8[this._pos++] = string.charCodeAt(i) & 0x7F;
  }

  strNull(string) { this.str(string); this.u8(0); }

  pad(alignment) { this.padWith(alignment, 0); }

  padWith(alignment, byte) {
    var remainder = this._pos % alignment;
    if (remainder === 0) return;
    var padding = alignment - remainder;
    this._grow(padding);
    for (var i = 0; i < padding; i++) this._u8[this._pos++] = byte;
  }

  bulkF32(float32array) {
    var byteLen = float32array.byteLength;
    this._grow(byteLen);
    this._u8.set(new Uint8Array(float32array.buffer, float32array.byteOffset, byteLen), this._pos);
    this._pos += byteLen;
  }

  bulkU32(uint32array) {
    var byteLen = uint32array.byteLength;
    this._grow(byteLen);
    this._u8.set(new Uint8Array(uint32array.buffer, uint32array.byteOffset, byteLen), this._pos);
    this._pos += byteLen;
  }

  bulkU8(uint8array) { this.raw(uint8array); }

  result() { return this._buf.slice(0, this._pos); }
}

// ============================================================================
// exportGLB(mesh) → Blob
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

function exportGLB(mesh) {
  var positions = mesh.positions, normals = mesh.normals, colors = mesh.colors, indices = mesh.indices;
  var vertexCount = mesh.vertexCount, faceCount = mesh.faceCount;
  var hasColors = colors != null && colors.length > 0;

  // Compute bounding box
  var min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (var i = 0; i < vertexCount; i++) {
    var x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    if (x < min[0]) min[0] = x; if (y < min[1]) min[1] = y; if (z < min[2]) min[2] = z;
    if (x > max[0]) max[0] = x; if (y > max[1]) max[1] = y; if (z > max[2]) max[2] = z;
  }

  // BIN chunk data sizes — colors stored as FLOAT VEC4 (16 bytes/vertex)
  var posSize = vertexCount * 12, normSize = vertexCount * 12;
  var colSize = hasColors ? vertexCount * 16 : 0;
  var idxSize = faceCount * 3 * 4;
  var posOff = 0, normOff = posSize, colOff = posSize + normSize, idxOff = posSize + normSize + colSize;
  var totalBin = posSize + normSize + colSize + idxSize;
  var binPadding = (4 - (totalBin % 4)) % 4;
  var binPadded = totalBin + binPadding;

  var bufferViews = [], accessors = [], attributes = {}, bv = 0, ac = 0;

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
  var idxAcc = ac;
  bufferViews.push({ buffer: 0, byteOffset: idxOff, byteLength: idxSize, target: 34963 });
  accessors.push({ bufferView: bv, byteOffset: 0, componentType: 5125, count: faceCount * 3, type: 'SCALAR' });

  var primitive = { attributes: attributes, indices: idxAcc, mode: 4 };
  var gltf = {
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

  var jsonStr = JSON.stringify(gltf);
  var jsonPadding = (4 - (jsonStr.length % 4)) % 4;
  var jsonPadded = jsonStr.length + jsonPadding;
  var totalLength = 12 + 8 + jsonPadded + 8 + binPadded;

  // Build GLB header + JSON chunk as a small buffer
  var hdrSize = 12 + 8 + jsonPadded + 8; // GLB header + JSON chunk + BIN chunk header
  var hw = new BinaryWriter(hdrSize + 16);

  // GLB header
  hw.u32(0x46546C67); hw.u32(2); hw.u32(totalLength);

  // JSON chunk
  hw.u32(jsonPadded); hw.u32(0x4E4F534A);
  hw.str(jsonStr);
  for (var pi = 0; pi < jsonPadding; pi++) hw.u8(0x20);

  // BIN chunk header
  hw.u32(binPadded); hw.u32(0x004E4942);

  // Assemble Blob from parts — typed arrays are passed by reference (zero-copy)
  var parts = [
    new Uint8Array(hw._buf, 0, hw._pos),                                         // GLB header + JSON + BIN header
    new Uint8Array(positions.buffer, positions.byteOffset, positions.byteLength), // positions
    new Uint8Array(normals.buffer, normals.byteOffset, normals.byteLength),       // normals
  ];

  if (hasColors) {
    // Convert Uint8 colors (0-255) to Float32 (0.0-1.0) for maximum DCC compatibility
    var colF32 = new Float32Array(vertexCount * 4);
    for (var ci = 0; ci < vertexCount * 4; ci++) colF32[ci] = colors[ci] / 255.0;
    parts.push(new Uint8Array(colF32.buffer));
  }

  parts.push(new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength)); // indices

  if (binPadding > 0) {
    parts.push(new Uint8Array(binPadding)); // padding zeros
  }

  return new Blob(parts, { type: 'application/octet-stream' });
}

// ============================================================================
// exportSTL(mesh) → Blob
//
// Streaming: writes triangles in chunks of ~64K faces (~3.2MB each) to avoid
// allocating one giant buffer. Handles meshes with billions of bytes of STL.
// Standard binary STL. No vertex colors (STL spec doesn't support them).
// ============================================================================

async function exportSTL(mesh, onProgress) {
  onProgress = onProgress || function(){};
  var positions = mesh.positions, indices = mesh.indices, faceCount = mesh.faceCount;

  // STL header (84 bytes: 80-byte header + 4-byte triangle count)
  var hdr = new ArrayBuffer(84);
  var hdrView = new DataView(hdr);
  var hdrStr = 'Fractal Mesh Export - GMT Fractal Explorer';
  for (var i = 0; i < hdrStr.length; i++) hdrView.setUint8(i, hdrStr.charCodeAt(i) & 0x7F);
  for (var i = hdrStr.length; i < 80; i++) hdrView.setUint8(i, 0x20);
  hdrView.setUint32(80, faceCount, true);

  var parts = [new Uint8Array(hdr)];

  // Write triangles in chunks — 50 bytes per triangle, ~64K triangles per chunk
  var CHUNK_FACES = 65536;
  var totalChunks = Math.ceil(faceCount / CHUNK_FACES);

  for (var start = 0; start < faceCount; start += CHUNK_FACES) {
    var end = Math.min(start + CHUNK_FACES, faceCount);
    var count = end - start;
    var buf = new ArrayBuffer(count * 50);
    var view = new DataView(buf);
    var off = 0;

    for (var f = start; f < end; f++) {
      var i0 = indices[f * 3], i1 = indices[f * 3 + 1], i2 = indices[f * 3 + 2];
      var ax = positions[i0 * 3], ay = positions[i0 * 3 + 1], az = positions[i0 * 3 + 2];
      var bx = positions[i1 * 3], by = positions[i1 * 3 + 1], bz = positions[i1 * 3 + 2];
      var cx = positions[i2 * 3], cy = positions[i2 * 3 + 1], cz = positions[i2 * 3 + 2];
      var e1x = bx - ax, e1y = by - ay, e1z = bz - az;
      var e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
      var nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      var len = Math.sqrt(nx * nx + ny * ny + nz * nz);
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
    var chunkIdx = (start / CHUNK_FACES) | 0;
    if ((chunkIdx & 7) === 0) {
      onProgress(Math.round(100 * (chunkIdx + 1) / totalChunks));
      await new Promise(function(r) { setTimeout(r, 0); });
    }
  }

  onProgress(100);
  return new Blob(parts, { type: 'application/octet-stream' });
}

// ============================================================================
// Export size estimation (for UI display before export)
// ============================================================================

function estimateExportSize(mesh, format) {
  if (format === 'stl') {
    return 84 + mesh.faceCount * 50;
  } else {
    // GLB: header + positions + normals + colors + indices
    var hasColors = mesh.colors != null && mesh.colors.length > 0;
    var colSize = hasColors ? mesh.vertexCount * 16 : 0;
    return 1024 + mesh.vertexCount * 24 + colSize + mesh.faceCount * 12;
  }
}

// ============================================================================
// Download helper
// ============================================================================

function downloadBlob(blob, filename) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
