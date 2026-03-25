// vdb-writer.js — OpenVDB file writer (half-float density grids)
// Plain ES2020, no modules. All symbols are global.
// GMT Fractal Explorer — shared between VDB and mesh export prototypes
//
// Provides:
//   floatToHalf(v), BYTE_TO_HALF[256]
//   VDBWriter (binary writer constructor)
//   createTree(), createNode4(), addLeafBlock(tree, bx, by, bz, densityBytes)
//   optimizeTree(tree)
//   serializeVDB(tree, N, boundsMin, boundsRange)

// ============================================================
//  Float16 LUT
// ============================================================
var _f32 = new Float32Array(1);
var _u32 = new Uint32Array(_f32.buffer);
function floatToHalf(v) {
  _f32[0] = v;
  var x = _u32[0];
  var sign = (x >> 16) & 0x8000;
  var exp  = ((x >> 23) & 0xFF) - 127 + 15;
  var frac = x & 0x7FFFFF;
  if (exp <= 0)  return sign;
  if (exp >= 31) return sign | 0x7C00;
  return sign | (exp << 10) | (frac >> 13);
}
var BYTE_TO_HALF = new Uint16Array(256);
for (var i = 0; i < 256; i++) BYTE_TO_HALF[i] = floatToHalf(i / 255.0);

// ============================================================
//  Binary Writer
// ============================================================
function VDBWriter(size) {
  this.buf = new ArrayBuffer(size || 8 * 1024 * 1024);
  this.a = new Uint8Array(this.buf);
  this.v = new DataView(this.buf);
  this.pos = 0;
}
VDBWriter.prototype.grow = function(need) {
  var ns = Math.max(this.buf.byteLength * 2, this.pos + need);
  var nb = new ArrayBuffer(ns);
  new Uint8Array(nb).set(this.a);
  this.buf = nb; this.a = new Uint8Array(nb); this.v = new DataView(nb);
};
VDBWriter.prototype.en = function(n) { if (this.pos + n > this.buf.byteLength) this.grow(n); };
VDBWriter.prototype.u8 = function(v) { this.en(1); this.v.setUint8(this.pos, v); this.pos++; };
VDBWriter.prototype.u16 = function(v) { this.en(2); this.v.setUint16(this.pos, v, true); this.pos += 2; };
VDBWriter.prototype.u32 = function(v) { this.en(4); this.v.setUint32(this.pos, v, true); this.pos += 4; };
VDBWriter.prototype.i32 = function(v) { this.en(4); this.v.setInt32(this.pos, v, true); this.pos += 4; };
VDBWriter.prototype.u64 = function(v) { this.en(8); this.v.setBigUint64(this.pos, v, true); this.pos += 8; };
VDBWriter.prototype.f64 = function(v) { this.en(8); this.v.setFloat64(this.pos, v, true); this.pos += 8; };
VDBWriter.prototype.raw = function(a) { this.en(a.length); this.a.set(a, this.pos); this.pos += a.length; };
VDBWriter.prototype.str = function(s) { this.en(s.length); for (var i = 0; i < s.length; i++) this.a[this.pos++] = s.charCodeAt(i); };
VDBWriter.prototype.name = function(s) { this.u32(s.length); this.str(s); };
VDBWriter.prototype.zeros = function(n) { this.en(n); this.pos += n; };
VDBWriter.prototype.bulk64 = function(arr) { var n = arr.length * 8; this.en(n); this.a.set(new Uint8Array(arr.buffer, arr.byteOffset, n), this.pos); this.pos += n; };
VDBWriter.prototype.bulk16 = function(arr) { var n = arr.length * 2; this.en(n); this.a.set(new Uint8Array(arr.buffer, arr.byteOffset, n), this.pos); this.pos += n; };
VDBWriter.prototype.result = function() { return this.buf.slice(0, this.pos); };

// ============================================================
//  VDB Sparse Tree with Tile Support
// ============================================================
// 5-4-3 tree. Bit index = z | (y << log2dim) | (x << 2*log2dim)
var FULL64 = 0xFFFFFFFFFFFFFFFFn;

function createTree() {
  return {
    n5childMask:  new BigUint64Array(512),
    n5valueMask:  new BigUint64Array(512),
    n5tileValues: new Uint16Array(32768),
    n4map: new Map()
  };
}

function createNode4() {
  return {
    childMask:  new BigUint64Array(64),
    valueMask:  new BigUint64Array(64),
    tileValues: new Uint16Array(4096),
    leafMap:    new Map()
  };
}

// Add an 8^3 leaf block. densityBytes[512] indexed in VDB order: lz|(ly<<3)|(lx<<6).
function addLeafBlock(tree, bx, by, bz, densityBytes) {
  var mask = new BigUint64Array(8);
  var data = new Uint16Array(512);
  var count = 0;
  for (var i = 0; i < 512; i++) {
    if (densityBytes[i] > 0) {
      mask[i >> 6] |= 1n << BigInt(i & 63);
      data[i] = BYTE_TO_HALF[densityBytes[i]];
      count++;
    }
  }
  if (count === 0) return 0;

  var x = bx << 3, y = by << 3, z = bz << 3;
  var n5idx = ((z & 4095) >> 7) | (((y & 4095) >> 7) << 5) | (((x & 4095) >> 7) << 10);
  tree.n5childMask[n5idx >> 6] |= 1n << BigInt(n5idx & 63);

  var n4 = tree.n4map.get(n5idx);
  if (!n4) { n4 = createNode4(); tree.n4map.set(n5idx, n4); }

  var n4idx = ((z & 127) >> 3) | (((y & 127) >> 3) << 4) | (((x & 127) >> 3) << 8);
  n4.childMask[n4idx >> 6] |= 1n << BigInt(n4idx & 63);
  n4.leafMap.set(n4idx, { mask: mask, data: data });
  return count;
}

// ============================================================
//  Tile Promotion
// ============================================================
function optimizeTree(tree) {
  var promotedLeaves = 0, promotedN4s = 0;

  tree.n4map.forEach(function(n4, n5k) {
    // Pass 1: promote uniform leaves to node4 tiles
    var toPromote = [];
    n4.leafMap.forEach(function(leaf, n4k) {
      var full = true;
      for (var i = 0; i < 8; i++) { if (leaf.mask[i] !== FULL64) { full = false; break; } }
      if (!full) return;
      var v0 = leaf.data[0], uniform = true;
      for (var i = 1; i < 512; i++) { if (leaf.data[i] !== v0) { uniform = false; break; } }
      if (uniform) toPromote.push([n4k, v0]);
    });
    for (var pi = 0; pi < toPromote.length; pi++) {
      var n4k = toPromote[pi][0], val = toPromote[pi][1];
      n4.leafMap.delete(n4k);
      n4.childMask[n4k >> 6]  &= ~(1n << BigInt(n4k & 63));
      n4.valueMask[n4k >> 6]  |=  1n << BigInt(n4k & 63);
      n4.tileValues[n4k] = val;
      promotedLeaves++;
    }

    // Pass 2: if node4 has only tiles and all same value -> node5 tile
    if (n4.leafMap.size === 0) {
      var allFull = true;
      for (var i = 0; i < 64; i++) { if (n4.valueMask[i] !== FULL64) { allFull = false; break; } }
      if (allFull) {
        var v0 = n4.tileValues[0], uniform = true;
        for (var i = 1; i < 4096; i++) { if (n4.tileValues[i] !== v0) { uniform = false; break; } }
        if (uniform) {
          tree.n4map.delete(n5k);
          tree.n5childMask[n5k >> 6] &= ~(1n << BigInt(n5k & 63));
          tree.n5valueMask[n5k >> 6] |=  1n << BigInt(n5k & 63);
          tree.n5tileValues[n5k] = v0;
          promotedN4s++;
        }
      }
    }
  });

  return { promotedLeaves: promotedLeaves, promotedN4s: promotedN4s };
}

// ============================================================
//  VDB Serialization
// ============================================================
function _sortedKeys(map) { return Array.from(map.keys()).sort(function(a, b) { return a - b; }); }

function _metaS(w, k, v) { w.name(k); w.name('string'); w.name(v); }
function _metaB(w, k, v) { w.name(k); w.name('bool'); w.u32(1); w.u8(v ? 1 : 0); }

function _writeTree(w, tree) {
  w.u32(1); w.u32(0); w.u32(0); w.u32(1);
  w.i32(0); w.i32(0); w.i32(0);
  w.bulk64(tree.n5childMask);
  w.bulk64(tree.n5valueMask);
  w.u8(6);
  w.bulk16(tree.n5tileValues);

  var n5keys = _sortedKeys(tree.n4map);
  for (var ni = 0; ni < n5keys.length; ni++) {
    var n4 = tree.n4map.get(n5keys[ni]);
    w.bulk64(n4.childMask);
    w.bulk64(n4.valueMask);
    w.u8(6);
    w.bulk16(n4.tileValues);
    var n4keys = _sortedKeys(n4.leafMap);
    for (var li = 0; li < n4keys.length; li++) w.bulk64(n4.leafMap.get(n4keys[li]).mask);
  }
  for (var ni = 0; ni < n5keys.length; ni++) {
    var n4 = tree.n4map.get(n5keys[ni]);
    var n4keys = _sortedKeys(n4.leafMap);
    for (var li = 0; li < n4keys.length; li++) {
      var leaf = n4.leafMap.get(n4keys[li]);
      w.bulk64(leaf.mask);
      w.u8(6);
      w.bulk16(leaf.data);
    }
  }
}

/**
 * Serialize a VDB tree to binary ArrayBuffer.
 * @param tree - VDB tree from createTree/addLeafBlock
 * @param {number} N - grid resolution
 * @param {number[]} boundsMin - grid min coordinate [x, y, z]
 * @param {number} boundsRange - grid extent (e.g. 3.0)
 */
function serializeVDB(tree, N, boundsMin, boundsRange) {
  var leafCount = 0;
  tree.n4map.forEach(function(n4) { leafCount += n4.leafMap.size; });
  var estSize = 200000 + leafCount * 1200 + tree.n4map.size * 10000;
  var w = new VDBWriter(Math.max(estSize, 1024 * 1024));

  // Header
  w.raw(new Uint8Array([0x20, 0x42, 0x44, 0x56, 0, 0, 0, 0]));
  w.u32(224); w.u32(8); w.u32(1);
  w.u8(0);
  w.str('d2b59639-ac2f-4047-9c50-9648f951180c');
  w.u32(0); w.u32(1);

  // Grid
  w.name('density');
  w.name('Tree_float_5_4_3_HalfFloat');
  w.u32(0);
  w.u64(BigInt(w.pos + 24));
  w.u64(0n); w.u64(0n);
  w.u32(0);

  // Metadata
  w.u32(4);
  _metaS(w, 'class', 'unknown');
  _metaS(w, 'file_compression', 'none');
  _metaB(w, 'is_saved_as_half_float', true);
  _metaS(w, 'name', 'density');

  // Transform
  var s = boundsRange / N;
  w.name('AffineMap');
  w.f64(s); w.f64(0); w.f64(0); w.f64(0);
  w.f64(0); w.f64(s); w.f64(0); w.f64(0);
  w.f64(0); w.f64(0); w.f64(s); w.f64(0);
  w.f64(boundsMin[0]); w.f64(boundsMin[1]); w.f64(boundsMin[2]); w.f64(1);

  // Tree
  _writeTree(w, tree);
  return w.result();
}
