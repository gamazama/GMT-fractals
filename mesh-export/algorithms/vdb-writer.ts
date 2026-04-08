// vdb-writer.ts — OpenVDB file writer (scalar half-float + vec3s grids)
// Converted from prototype vdb-writer.js
// GMT Fractal Explorer — shared between VDB and mesh export
//
// Provides:
//   Scalar half-float: createTree(), addLeafBlock(), optimizeTree(), serializeVDB()
//   Vec3 float:        createVec3Tree(), addVec3LeafBlock(), optimizeVec3Tree()
//   Multi-grid:        serializeMultiGridVDB() — density (half) + Cd (vec3s)

// ============================================================
//  Types
// ============================================================

export interface LeafNode {
  mask: BigUint64Array;
  data: Uint16Array;
}

export interface Node4 {
  childMask: BigUint64Array;
  valueMask: BigUint64Array;
  tileValues: Uint16Array;
  leafMap: Map<number, LeafNode>;
}

export interface VDBTree {
  n5childMask: BigUint64Array;
  n5valueMask: BigUint64Array;
  n5tileValues: Uint16Array;
  n4map: Map<number, Node4>;
}

export interface OptimizeResult {
  promotedLeaves: number;
  promotedN4s: number;
}

// ============================================================
//  Vec3 Tree Types (for color grids — full float32 per component)
// ============================================================

export interface Vec3LeafNode {
  mask: BigUint64Array;        // 512 bits — same as scalar
  data: Float32Array;          // 512 * 3 = 1536 floats (RGB per voxel)
}

export interface Vec3Node4 {
  childMask: BigUint64Array;
  valueMask: BigUint64Array;
  tileValues: Float32Array;    // 4096 * 3 = 12288 floats
  leafMap: Map<number, Vec3LeafNode>;
}

export interface Vec3VDBTree {
  n5childMask: BigUint64Array;
  n5valueMask: BigUint64Array;
  n5tileValues: Float32Array;  // 32768 * 3 = 98304 floats
  n4map: Map<number, Vec3Node4>;
}

// ============================================================
//  Float16 LUT
// ============================================================
const _f32 = new Float32Array(1);
const _u32 = new Uint32Array(_f32.buffer);

export function floatToHalf(v: number): number {
  _f32[0] = v;
  const x = _u32[0];
  const sign = (x >> 16) & 0x8000;
  const exp  = ((x >> 23) & 0xFF) - 127 + 15;
  const frac = x & 0x7FFFFF;
  if (exp <= 0)  return sign;
  if (exp >= 31) return sign | 0x7C00;
  return sign | (exp << 10) | (frac >> 13);
}

export const BYTE_TO_HALF = new Uint16Array(256);
for (let i = 0; i < 256; i++) BYTE_TO_HALF[i] = floatToHalf(i / 255.0);

// ============================================================
//  Binary Writer
// ============================================================
export class VDBWriter {
  buf: ArrayBuffer;
  a: Uint8Array;
  v: DataView;
  pos: number;

  constructor(size?: number) {
    this.buf = new ArrayBuffer(size || 8 * 1024 * 1024);
    this.a = new Uint8Array(this.buf);
    this.v = new DataView(this.buf);
    this.pos = 0;
  }

  grow(need: number): void {
    let ns = this.pos + need;
    // For large buffers (>256 MB), grow conservatively to limit peak memory
    if (this.buf.byteLength < 256 * 1024 * 1024) {
      ns = Math.max(this.buf.byteLength * 2, ns);
    } else {
      ns = Math.max(Math.round(this.buf.byteLength * 1.25), ns);
    }
    const nb = new ArrayBuffer(ns);
    new Uint8Array(nb).set(this.a);
    this.buf = nb; this.a = new Uint8Array(nb); this.v = new DataView(nb);
  }

  en(n: number): void { if (this.pos + n > this.buf.byteLength) this.grow(n); }
  u8(v: number): void { this.en(1); this.v.setUint8(this.pos, v); this.pos++; }
  u16(v: number): void { this.en(2); this.v.setUint16(this.pos, v, true); this.pos += 2; }
  u32(v: number): void { this.en(4); this.v.setUint32(this.pos, v, true); this.pos += 4; }
  i32(v: number): void { this.en(4); this.v.setInt32(this.pos, v, true); this.pos += 4; }
  u64(v: bigint): void { this.en(8); this.v.setBigUint64(this.pos, v, true); this.pos += 8; }
  f64(v: number): void { this.en(8); this.v.setFloat64(this.pos, v, true); this.pos += 8; }
  raw(a: Uint8Array): void { this.en(a.length); this.a.set(a, this.pos); this.pos += a.length; }

  str(s: string): void {
    this.en(s.length);
    for (let i = 0; i < s.length; i++) this.a[this.pos++] = s.charCodeAt(i);
  }

  name(s: string): void { this.u32(s.length); this.str(s); }
  zeros(n: number): void { this.en(n); this.pos += n; }

  bulk64(arr: BigUint64Array): void {
    const n = arr.length * 8;
    this.en(n);
    this.a.set(new Uint8Array(arr.buffer, arr.byteOffset, n), this.pos);
    this.pos += n;
  }

  bulk16(arr: Uint16Array): void {
    const n = arr.length * 2;
    this.en(n);
    this.a.set(new Uint8Array(arr.buffer, arr.byteOffset, n), this.pos);
    this.pos += n;
  }

  bulkF32(arr: Float32Array): void {
    const n = arr.length * 4;
    this.en(n);
    this.a.set(new Uint8Array(arr.buffer, arr.byteOffset, n), this.pos);
    this.pos += n;
  }

  /** Return a Uint8Array view of the written data (no copy). */
  result(): Uint8Array { return new Uint8Array(this.buf, 0, this.pos); }
}

// ============================================================
//  VDB Sparse Tree with Tile Support
// ============================================================
// 5-4-3 tree. Bit index = z | (y << log2dim) | (x << 2*log2dim)
const FULL64 = 0xFFFFFFFFFFFFFFFFn;

export function createTree(): VDBTree {
  return {
    n5childMask:  new BigUint64Array(512),
    n5valueMask:  new BigUint64Array(512),
    n5tileValues: new Uint16Array(32768),
    n4map: new Map()
  };
}

export function createNode4(): Node4 {
  return {
    childMask:  new BigUint64Array(64),
    valueMask:  new BigUint64Array(64),
    tileValues: new Uint16Array(4096),
    leafMap:    new Map()
  };
}

// Add an 8^3 leaf block. densityBytes[512] indexed in VDB order: lz|(ly<<3)|(lx<<6).
export function addLeafBlock(
  tree: VDBTree,
  bx: number,
  by: number,
  bz: number,
  densityBytes: Uint8Array
): number {
  const mask = new BigUint64Array(8);
  const data = new Uint16Array(512);
  let count = 0;
  for (let i = 0; i < 512; i++) {
    if (densityBytes[i] > 0) {
      mask[i >> 6] |= 1n << BigInt(i & 63);
      data[i] = BYTE_TO_HALF[densityBytes[i]];
      count++;
    }
  }
  if (count === 0) return 0;

  const x = bx << 3, y = by << 3, z = bz << 3;
  const n5idx = ((z & 4095) >> 7) | (((y & 4095) >> 7) << 5) | (((x & 4095) >> 7) << 10);
  tree.n5childMask[n5idx >> 6] |= 1n << BigInt(n5idx & 63);

  let n4 = tree.n4map.get(n5idx);
  if (!n4) { n4 = createNode4(); tree.n4map.set(n5idx, n4); }

  const n4idx = ((z & 127) >> 3) | (((y & 127) >> 3) << 4) | (((x & 127) >> 3) << 8);
  n4.childMask[n4idx >> 6] |= 1n << BigInt(n4idx & 63);
  n4.leafMap.set(n4idx, { mask: mask, data: data });
  return count;
}

// ============================================================
//  Tile Promotion
// ============================================================
export function optimizeTree(tree: VDBTree): OptimizeResult {
  let promotedLeaves = 0, promotedN4s = 0;

  tree.n4map.forEach(function(n4: Node4, n5k: number) {
    // Pass 1: promote uniform leaves to node4 tiles
    const toPromote: [number, number][] = [];
    n4.leafMap.forEach(function(leaf: LeafNode, n4k: number) {
      let full = true;
      for (let i = 0; i < 8; i++) { if (leaf.mask[i] !== FULL64) { full = false; break; } }
      if (!full) return;
      const v0 = leaf.data[0];
      let uniform = true;
      for (let i = 1; i < 512; i++) { if (leaf.data[i] !== v0) { uniform = false; break; } }
      if (uniform) toPromote.push([n4k, v0]);
    });
    for (let pi = 0; pi < toPromote.length; pi++) {
      const n4k = toPromote[pi][0], val = toPromote[pi][1];
      n4.leafMap.delete(n4k);
      n4.childMask[n4k >> 6]  &= ~(1n << BigInt(n4k & 63));
      n4.valueMask[n4k >> 6]  |=  1n << BigInt(n4k & 63);
      n4.tileValues[n4k] = val;
      promotedLeaves++;
    }

    // Pass 2: if node4 has only tiles and all same value -> node5 tile
    if (n4.leafMap.size === 0) {
      let allFull = true;
      for (let i = 0; i < 64; i++) { if (n4.valueMask[i] !== FULL64) { allFull = false; break; } }
      if (allFull) {
        const v0 = n4.tileValues[0];
        let uniform = true;
        for (let i = 1; i < 4096; i++) { if (n4.tileValues[i] !== v0) { uniform = false; break; } }
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

  return { promotedLeaves, promotedN4s };
}

// ============================================================
//  Vec3 Tree — creation, insert, optimize
// ============================================================

export function createVec3Tree(): Vec3VDBTree {
  return {
    n5childMask:  new BigUint64Array(512),
    n5valueMask:  new BigUint64Array(512),
    n5tileValues: new Float32Array(32768 * 3),
    n4map: new Map()
  };
}

function createVec3Node4(): Vec3Node4 {
  return {
    childMask:  new BigUint64Array(64),
    valueMask:  new BigUint64Array(64),
    tileValues: new Float32Array(4096 * 3),
    leafMap:    new Map()
  };
}

/**
 * Add an 8^3 vec3 leaf block. rgb is a flat array of [r,g,b, r,g,b, ...] with 512 entries
 * indexed in VDB order: vdbIdx = lz | (ly<<3) | (lx<<6).
 * Values are 0-255 byte range, stored as float 0.0-1.0.
 * A voxel is active if any of its R,G,B components > 0.
 */
export function addVec3LeafBlock(
  tree: Vec3VDBTree,
  bx: number,
  by: number,
  bz: number,
  r: Uint8Array,
  g: Uint8Array,
  b: Uint8Array,
): number {
  const mask = new BigUint64Array(8);
  const data = new Float32Array(512 * 3);
  let count = 0;
  for (let i = 0; i < 512; i++) {
    if (r[i] > 0 || g[i] > 0 || b[i] > 0) {
      mask[i >> 6] |= 1n << BigInt(i & 63);
      data[i * 3]     = r[i] / 255.0;
      data[i * 3 + 1] = g[i] / 255.0;
      data[i * 3 + 2] = b[i] / 255.0;
      count++;
    }
  }
  if (count === 0) return 0;

  const x = bx << 3, y = by << 3, z = bz << 3;
  const n5idx = ((z & 4095) >> 7) | (((y & 4095) >> 7) << 5) | (((x & 4095) >> 7) << 10);
  tree.n5childMask[n5idx >> 6] |= 1n << BigInt(n5idx & 63);

  let n4 = tree.n4map.get(n5idx);
  if (!n4) { n4 = createVec3Node4(); tree.n4map.set(n5idx, n4); }

  const n4idx = ((z & 127) >> 3) | (((y & 127) >> 3) << 4) | (((x & 127) >> 3) << 8);
  n4.childMask[n4idx >> 6] |= 1n << BigInt(n4idx & 63);
  n4.leafMap.set(n4idx, { mask, data });
  return count;
}

/** Optimize vec3 tree — promote uniform leaves/nodes to tiles. */
export function optimizeVec3Tree(tree: Vec3VDBTree): OptimizeResult {
  let promotedLeaves = 0, promotedN4s = 0;

  tree.n4map.forEach(function(n4: Vec3Node4, n5k: number) {
    const toPromote: [number, number, number, number][] = [];
    n4.leafMap.forEach(function(leaf: Vec3LeafNode, n4k: number) {
      let full = true;
      for (let i = 0; i < 8; i++) { if (leaf.mask[i] !== FULL64) { full = false; break; } }
      if (!full) return;
      const r0 = leaf.data[0], g0 = leaf.data[1], b0 = leaf.data[2];
      let uniform = true;
      for (let i = 1; i < 512; i++) {
        if (leaf.data[i * 3] !== r0 || leaf.data[i * 3 + 1] !== g0 || leaf.data[i * 3 + 2] !== b0) {
          uniform = false; break;
        }
      }
      if (uniform) toPromote.push([n4k, r0, g0, b0]);
    });
    for (const [n4k, rv, gv, bv] of toPromote) {
      n4.leafMap.delete(n4k);
      n4.childMask[n4k >> 6]  &= ~(1n << BigInt(n4k & 63));
      n4.valueMask[n4k >> 6]  |=  1n << BigInt(n4k & 63);
      n4.tileValues[n4k * 3]     = rv;
      n4.tileValues[n4k * 3 + 1] = gv;
      n4.tileValues[n4k * 3 + 2] = bv;
      promotedLeaves++;
    }

    if (n4.leafMap.size === 0) {
      let allFull = true;
      for (let i = 0; i < 64; i++) { if (n4.valueMask[i] !== FULL64) { allFull = false; break; } }
      if (allFull) {
        const r0 = n4.tileValues[0], g0 = n4.tileValues[1], b0 = n4.tileValues[2];
        let uniform = true;
        for (let i = 1; i < 4096; i++) {
          if (n4.tileValues[i * 3] !== r0 || n4.tileValues[i * 3 + 1] !== g0 || n4.tileValues[i * 3 + 2] !== b0) {
            uniform = false; break;
          }
        }
        if (uniform) {
          tree.n4map.delete(n5k);
          tree.n5childMask[n5k >> 6] &= ~(1n << BigInt(n5k & 63));
          tree.n5valueMask[n5k >> 6] |=  1n << BigInt(n5k & 63);
          tree.n5tileValues[n5k * 3]     = r0;
          tree.n5tileValues[n5k * 3 + 1] = g0;
          tree.n5tileValues[n5k * 3 + 2] = b0;
          promotedN4s++;
        }
      }
    }
  });

  return { promotedLeaves, promotedN4s };
}

// ============================================================
//  VDB Serialization
// ============================================================
function _sortedKeys(map: Map<number, unknown>): number[] {
  return Array.from(map.keys()).sort(function(a: number, b: number) { return a - b; });
}

function _metaS(w: VDBWriter, k: string, v: string): void { w.name(k); w.name('string'); w.name(v); }
function _metaB(w: VDBWriter, k: string, v: boolean): void { w.name(k); w.name('bool'); w.u32(1); w.u8(v ? 1 : 0); }

function _writeTree(w: VDBWriter, tree: VDBTree): void {
  // TreeBase: bufferCount=1
  // RootNode: background=0.0f (4 bytes), numTiles=0, numChildren=1
  // Child origin [0,0,0]
  w.u32(1); w.u32(0); w.u32(0); w.u32(1);
  w.i32(0); w.i32(0); w.i32(0);
  w.bulk64(tree.n5childMask);
  w.bulk64(tree.n5valueMask);
  w.u8(6);
  w.bulk16(tree.n5tileValues);

  const n5keys = _sortedKeys(tree.n4map);
  for (let ni = 0; ni < n5keys.length; ni++) {
    const n4 = tree.n4map.get(n5keys[ni])!;
    w.bulk64(n4.childMask);
    w.bulk64(n4.valueMask);
    w.u8(6);
    w.bulk16(n4.tileValues);
    const n4keys = _sortedKeys(n4.leafMap);
    for (let li = 0; li < n4keys.length; li++) w.bulk64(n4.leafMap.get(n4keys[li])!.mask);
  }
  // Free leaf data after writing to reduce peak memory
  for (let ni = 0; ni < n5keys.length; ni++) {
    const n4 = tree.n4map.get(n5keys[ni])!;
    const n4keys = _sortedKeys(n4.leafMap);
    for (let li = 0; li < n4keys.length; li++) {
      const leaf = n4.leafMap.get(n4keys[li])!;
      w.bulk64(leaf.mask);
      w.u8(6);
      w.bulk16(leaf.data);
      (leaf as any).data = null;
    }
  }
}

/** Write vec3s tree topology + leaf data.
 *  Same structure as scalar tree but:
 *  - Background value is Vec3f (12 bytes) instead of float (4 bytes)
 *  - Tile values and leaf data are Vec3f (3 floats per voxel)
 *  - Compression metadata byte is still 6 (NO_MASK_AND_ALL_VALS enum, not a size)
 */
function _writeVec3Tree(w: VDBWriter, tree: Vec3VDBTree): void {
  // TreeBase::writeTopology
  w.u32(1);                              // bufferCount

  // RootNode::writeTopology — Vec3f background (12 bytes, all zeros)
  w.f64(0); w.u32(0);                   // background Vec3f(0,0,0) = 3 floats = 12 bytes
  w.u32(0);                              // numTiles
  w.u32(1);                              // numChildren (one N5 node)
  w.i32(0); w.i32(0); w.i32(0);         // child origin [0,0,0]

  // InternalNode1 (N5, 32^3) topology
  w.bulk64(tree.n5childMask);
  w.bulk64(tree.n5valueMask);
  w.u8(6);                               // NO_MASK_AND_ALL_VALS (compression enum, always 6)
  w.bulkF32(tree.n5tileValues);

  // InternalNode2 (N4, 16^3) topology per N5 child
  const n5keys = _sortedKeys(tree.n4map);
  for (let ni = 0; ni < n5keys.length; ni++) {
    const n4 = tree.n4map.get(n5keys[ni])!;
    w.bulk64(n4.childMask);
    w.bulk64(n4.valueMask);
    w.u8(6);
    w.bulkF32(n4.tileValues);
    const n4keys = _sortedKeys(n4.leafMap);
    for (let li = 0; li < n4keys.length; li++) w.bulk64(n4.leafMap.get(n4keys[li])!.mask);
  }

  // LeafNode (8^3) buffers — free data after writing to reduce peak memory
  for (let ni = 0; ni < n5keys.length; ni++) {
    const n4 = tree.n4map.get(n5keys[ni])!;
    const n4keys = _sortedKeys(n4.leafMap);
    for (let li = 0; li < n4keys.length; li++) {
      const leaf = n4.leafMap.get(n4keys[li])!;
      w.bulk64(leaf.mask);
      w.u8(6);
      w.bulkF32(leaf.data);
      (leaf as any).data = null; // free 6 KB/leaf during serialization
    }
  }
}

/** Write grid transform (shared by scalar and vec3 grids). */
function _writeTransform(w: VDBWriter, N: number, boundsMin: [number, number, number], boundsRange: number): void {
  const s = boundsRange / N;
  w.name('AffineMap');
  w.f64(s); w.f64(0); w.f64(0); w.f64(0);
  w.f64(0); w.f64(s); w.f64(0); w.f64(0);
  w.f64(0); w.f64(0); w.f64(s); w.f64(0);
  w.f64(boundsMin[0]); w.f64(boundsMin[1]); w.f64(boundsMin[2]); w.f64(1);
}

/**
 * Write a scalar half-float grid's data block.
 */
function _writeGridData(
  w: VDBWriter,
  tree: VDBTree,
  name: string,
  N: number,
  boundsMin: [number, number, number],
  boundsRange: number
): void {
  w.u32(0);  // compression: none
  w.u32(4);  // 4 metadata entries
  _metaS(w, 'class', 'unknown');
  _metaS(w, 'file_compression', 'none');
  _metaB(w, 'is_saved_as_half_float', true);
  _metaS(w, 'name', name);
  _writeTransform(w, N, boundsMin, boundsRange);
  _writeTree(w, tree);
}

/**
 * Write a vec3s grid's data block.
 */
function _writeVec3GridData(
  w: VDBWriter,
  tree: Vec3VDBTree,
  name: string,
  N: number,
  boundsMin: [number, number, number],
  boundsRange: number
): void {
  w.u32(0);  // compression: none
  w.u32(4);  // 4 metadata entries
  _metaS(w, 'class', 'unknown');
  _metaS(w, 'file_compression', 'none');
  _metaB(w, 'is_saved_as_half_float', false);
  _metaS(w, 'name', name);
  _writeTransform(w, N, boundsMin, boundsRange);
  _writeVec3Tree(w, tree);
}

/**
 * Serialize a VDB tree to binary Uint8Array view.
 * Note: serialization is destructive — leaf data is freed during writing.
 * @param tree - VDB tree from createTree/addLeafBlock
 * @param N - grid resolution
 * @param boundsMin - grid min coordinate [x, y, z]
 * @param boundsRange - grid extent (e.g. 3.0)
 */
export function serializeVDB(
  tree: VDBTree,
  N: number,
  boundsMin: [number, number, number],
  boundsRange: number
): Uint8Array {
  let leafCount = 0;
  tree.n4map.forEach(function(n4: Node4) { leafCount += n4.leafMap.size; });
  const estSize = 200000 + leafCount * 1200 + tree.n4map.size * 10000;
  const w = new VDBWriter(Math.max(estSize, 1024 * 1024));

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
  const s = boundsRange / N;
  w.name('AffineMap');
  w.f64(s); w.f64(0); w.f64(0); w.f64(0);
  w.f64(0); w.f64(s); w.f64(0); w.f64(0);
  w.f64(0); w.f64(0); w.f64(s); w.f64(0);
  w.f64(boundsMin[0]); w.f64(boundsMin[1]); w.f64(boundsMin[2]); w.f64(1);

  // Tree
  _writeTree(w, tree);
  return w.result();
}

/**
 * Serialize a VDB file with density (scalar half-float) + Cd (vec3s float) grids.
 * Layout per OpenVDB spec: interleaved [descriptor][offsets][data] per grid.
 *
 * @param densityTree - density tree (scalar half-float)
 * @param colorTree - Cd color tree (vec3s float, RGB 0.0-1.0)
 * @param N - grid resolution
 * @param boundsMin - grid min coordinate [x, y, z]
 * @param boundsRange - grid extent
 *
 * Note: serialization is destructive — leaf data is freed during writing.
 */
export function serializeMultiGridVDB(
  densityTree: VDBTree,
  colorTree: Vec3VDBTree,
  N: number,
  boundsMin: [number, number, number],
  boundsRange: number
): Uint8Array {
  // Estimate buffer size
  let densityLeaves = 0;
  densityTree.n4map.forEach(function(n4: Node4) { densityLeaves += n4.leafMap.size; });
  let colorLeaves = 0;
  colorTree.n4map.forEach(function(n4: Vec3Node4) { colorLeaves += n4.leafMap.size; });
  // vec3 leaves are ~6x larger than half-float leaves (1536*4 vs 512*2)
  const estSize = 200000 + densityLeaves * 1200 + densityTree.n4map.size * 10000
                + 200000 + colorLeaves * 7200 + colorTree.n4map.size * 60000;
  const w = new VDBWriter(Math.max(estSize, 2 * 1024 * 1024));

  // File header
  w.raw(new Uint8Array([0x20, 0x42, 0x44, 0x56, 0, 0, 0, 0]));
  w.u32(224); w.u32(8); w.u32(1);
  w.u8(0);
  w.str('d2b59639-ac2f-4047-9c50-9648f951180c');
  w.u32(0);   // 0 file-level metadata entries
  w.u32(2);   // 2 grids: density + Cd

  // Grid 1: density (scalar half-float) — same layout as single-grid serializeVDB
  w.name('density');
  w.name('Tree_float_5_4_3_HalfFloat');
  w.u32(0);                              // instance parent (empty string)
  w.u64(BigInt(w.pos + 24));             // gridPos
  w.u64(0n); w.u64(0n);                 // blockPos, endPos
  _writeGridData(w, densityTree, 'density', N, boundsMin, boundsRange);

  // Grid 2: Cd (vec3s float)
  w.name('Cd');
  w.name('Tree_vec3s_5_4_3');
  w.u32(0);                              // instance parent (empty string)
  w.u64(BigInt(w.pos + 24));             // gridPos
  w.u64(0n); w.u64(0n);                 // blockPos, endPos
  _writeVec3GridData(w, colorTree, 'Cd', N, boundsMin, boundsRange);

  return w.result();
}
