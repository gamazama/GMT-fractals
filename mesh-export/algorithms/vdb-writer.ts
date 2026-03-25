// vdb-writer.ts — OpenVDB file writer (half-float density grids)
// Converted from prototype vdb-writer.js
// GMT Fractal Explorer — shared between VDB and mesh export
//
// Provides:
//   floatToHalf(v), BYTE_TO_HALF[256]
//   VDBWriter (binary writer class)
//   createTree(), createNode4(), addLeafBlock(tree, bx, by, bz, densityBytes)
//   optimizeTree(tree)
//   serializeVDB(tree, N, boundsMin, boundsRange)

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
    const ns = Math.max(this.buf.byteLength * 2, this.pos + need);
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

  result(): ArrayBuffer { return this.buf.slice(0, this.pos); }
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
//  VDB Serialization
// ============================================================
function _sortedKeys(map: Map<number, unknown>): number[] {
  return Array.from(map.keys()).sort(function(a: number, b: number) { return a - b; });
}

function _metaS(w: VDBWriter, k: string, v: string): void { w.name(k); w.name('string'); w.name(v); }
function _metaB(w: VDBWriter, k: string, v: boolean): void { w.name(k); w.name('bool'); w.u32(1); w.u8(v ? 1 : 0); }

function _writeTree(w: VDBWriter, tree: VDBTree): void {
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
  for (let ni = 0; ni < n5keys.length; ni++) {
    const n4 = tree.n4map.get(n5keys[ni])!;
    const n4keys = _sortedKeys(n4.leafMap);
    for (let li = 0; li < n4keys.length; li++) {
      const leaf = n4.leafMap.get(n4keys[li])!;
      w.bulk64(leaf.mask);
      w.u8(6);
      w.bulk16(leaf.data);
    }
  }
}

/**
 * Serialize a VDB tree to binary ArrayBuffer.
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
): ArrayBuffer {
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
