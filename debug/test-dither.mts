/**
 * dither lab — fine-tune + verify the shared adaptive-dither tail
 * (`engine/fractal/shaders/ditherTail.ts`).
 *
 * Dithering quality is perceptual, so this does BOTH:
 *   • METRICS — for synthetic ramps with a KNOWN continuous ground truth, it quantises to
 *     8-bit (a) with no dither and (b) with the dither, blurs each (an eye low-pass model),
 *     and reports: BANDING = MSE(blurred − truth) (lower = banding removed) and NOISE =
 *     high-frequency energy (lower = less grain). A good setting drops banding hard without
 *     spiking noise. It sweeps the amplitude cap so we can pick it from numbers.
 *   • MONTAGE — writes `debug/dither-lab.png`: rows = test scenes (incl. a flat ISLAND that
 *     must stay untouched), columns = [truth · no-dither · cap=4 · cap=8 · cap=16] — so the
 *     band-removal-vs-noise trade-off is eyeballable directly.
 *
 * The dither math here MIRRORS the GLSL in `engine/fractal/shaders/ditherTail.ts` (one is
 * GLSL, one is TS — keep them in sync; the constants below match the shader).
 *
 * Run: npx tsx debug/test-dither.mts   (or `npm run test:dither`)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderFieldDithered } from '../palette/core/rampGeometry';
import type { RGB } from '../palette/core/oklab';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

// ── tiny PNG codec (8-bit RGBA, pure node zlib) ────────────────────────────────────────────
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return (buf: Uint8Array): number => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();

interface Image { w: number; h: number; data: Uint8Array; } // RGBA8

const decodePng = (file: string): Image => {
  const buf = readFileSync(file);
  let p = 8; // skip signature
  let w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat: Buffer[] = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8);
    const body = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); bitDepth = body[8]; colorType = body[9]; }
    else if (type === 'IDAT') idat.push(Buffer.from(body));
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`dither lab: expected 8-bit PNG, got ${bitDepth}`);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
  if (!channels) throw new Error(`dither lab: unsupported PNG color type ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = new Uint8Array(w * h * 4);
  const prev = new Uint8Array(stride);
  const cur = new Uint8Array(stride);
  let q = 0;
  const paeth = (a: number, b: number, c: number) => {
    const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < h; y++) {
    const filter = raw[q++];
    for (let i = 0; i < stride; i++) {
      const x = raw[q++];
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = x;
      if (filter === 1) v = x + a; else if (filter === 2) v = x + b;
      else if (filter === 3) v = x + ((a + b) >> 1); else if (filter === 4) v = x + paeth(a, b, c);
      cur[i] = v & 0xff;
    }
    for (let xp = 0; xp < w; xp++) {
      const o = (y * w + xp) * 4, s = xp * channels;
      out[o] = cur[s]; out[o + 1] = cur[channels >= 2 ? s + 1 : s];
      out[o + 2] = cur[channels >= 3 ? s + 2 : s]; out[o + 3] = channels === 4 ? cur[s + 3] : 255;
    }
    prev.set(cur);
  }
  return { w, h, data: out };
};

const encodePng = (img: Image): Buffer => {
  const { w, h, data } = img;
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; data.subarray(y * stride, y * stride + stride).forEach((v, i) => { raw[y * (stride + 1) + 1 + i] = v; }); }
  const chunk = (type: string, body: Uint8Array): Buffer => {
    const len = Buffer.alloc(4); len.writeUInt32BE(body.length, 0);
    const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(typed), 0);
    return Buffer.concat([len, typed, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array(0)),
  ]);
};

// ── the dither (MIRRORS engine/fractal/shaders/ditherTail.ts — keep in sync) ───────────────
const DITHER_FLAT_LO = 0.0005, DITHER_FLAT_HI = 0.004, DITHER_MAX_LIGHT = 4.0;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smoothstep = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Dither one channel triple at pixel (x,y). `slope` = per-channel |dC/dpx| (LSB units handled
 *  inside). `noise` is the RGBA tile. `maxDark` is the swept amplitude cap. */
const ditherPixel = (
  c: [number, number, number], x: number, y: number, slope: [number, number, number],
  noise: Image, maxDark: number,
): [number, number, number] => {
  const ni = ((y % noise.h) * noise.w + (x % noise.w)) * 4;
  const bn = [noise.data[ni] / 255, noise.data[ni + 1] / 255, noise.data[ni + 2] / 255, noise.data[ni + 3] / 255];
  const tpdf = [bn[0] + bn[1] - 1, bn[2] + bn[3] - 1, bn[3] + bn[0] - 1];
  const s = Math.max(slope[0], slope[1], slope[2]) * 255;
  const gate = smoothstep(DITHER_FLAT_LO, DITHER_FLAT_HI, s);
  const value = Math.max(c[0], c[1], c[2]);
  const maxLSB = mix(maxDark, DITHER_MAX_LIGHT, clamp(value * 2, 0, 1));
  const ampLSB = clamp(1 / Math.max(s, 1e-3), 1, maxLSB) * gate;
  const out: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const taper = clamp(Math.min(c[k], 1 - c[k]) * 255, 0, 1);
    out[k] = c[k] + tpdf[k] * ampLSB * taper / 255;
  }
  return out;
};

const q8 = (v: number) => clamp(Math.round(v * 255), 0, 255);

// ── test scenes: a continuous truth `(x,y)→rgb` + its analytic per-pixel slope ─────────────
interface Scene { name: string; w: number; h: number; truth: (x: number, y: number) => [number, number, number]; slope: (x: number, y: number) => [number, number, number]; flatRegion?: [number, number, number, number]; }

const ramp = (name: string, w: number, h: number, c0: number, c1: number): Scene => ({
  name, w, h,
  truth: (x) => { const t = c0 + (c1 - c0) * (x / (w - 1)); return [t, t, t]; },
  slope: () => { const s = Math.abs(c1 - c0) / (w - 1); return [s, s, s]; },
});

const W = 360, H = 90;
const scenes: Scene[] = [
  // The hard cases are SHALLOW gradients = WIDE bands. 0→0.04 over 360px ≈ 10 LSB ≈ 36px/band.
  ramp('dark wide 0→0.04', W, H, 0.0, 0.04),
  ramp('dark 0→0.1', W, H, 0.0, 0.1),
  ramp('mid wide 0.4→0.45', W, H, 0.4, 0.45),
  ramp('full 0→1', W, H, 0.0, 1.0),
  {
    name: 'island | gradient', w: W, h: H,
    // Left half = constant 0.12 (a pure-colour island → must stay un-dithered); right half a
    // shallow dark gradient (wide bands). Verifies the flat-gate AND band-removal side by side.
    truth: (x) => { const v = x < W / 2 ? 0.12 : 0.12 + 0.05 * ((x - W / 2) / (W / 2 - 1)); return [v, v, v]; },
    slope: (x) => { const s = x < W / 2 ? 0 : 0.05 / (W / 2 - 1); return [s, s, s]; },
    flatRegion: [0, 0, Math.floor(W / 2), H],
  },
];

// ── metrics ────────────────────────────────────────────────────────────────────────────────
const boxBlur = (img: Float64Array, w: number, h: number, r: number): Float64Array => {
  const out = new Float64Array(img.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let sum = 0, n = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
      sum += img[yy * w + xx]; n++;
    }
    out[y * w + x] = sum / n;
  }
  return out;
};

/** Render a scene to a luma field (0..1) under a given dither cap (0 = no dither). */
const renderLuma = (sc: Scene, noise: Image, maxDark: number, useDither: boolean): Float64Array => {
  const out = new Float64Array(sc.w * sc.h);
  for (let y = 0; y < sc.h; y++) for (let x = 0; x < sc.w; x++) {
    const c = sc.truth(x, y);
    const d = useDither ? ditherPixel(c, x, y, sc.slope(x, y), noise, maxDark) : c;
    // luma of the quantised output
    out[y * sc.w + x] = (q8(d[0]) * 0.2126 + q8(d[1]) * 0.7152 + q8(d[2]) * 0.0722) / 255;
  }
  return out;
};

const truthLuma = (sc: Scene): Float64Array => {
  const out = new Float64Array(sc.w * sc.h);
  for (let y = 0; y < sc.h; y++) for (let x = 0; x < sc.w; x++) { const c = sc.truth(x, y); out[y * sc.w + x] = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722; }
  return out;
};

const mse = (a: Float64Array, b: Float64Array) => { let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; } return s / a.length; };

const noise = decodePng(join(ROOT, 'public', 'blueNoiseRGBA.png'));
console.log(`blue-noise tile: ${noise.w}×${noise.h} RGBA`);

// ── metric sweep ────────────────────────────────────────────────────────────────────────────
// Decompose the quantisation ERROR (out − truth): the BANDING the eye sees is its LOW-frequency
// (spatially coherent) part; dither's grain is the HIGH-frequency part. Good dither moves energy
// from low (banding) to high (noise) — and a little high-freq noise is far less objectionable
// than coherent bands.
const errorEnergies = (sc: Scene, cap: number, useDither: boolean): { banding: number; noise: number } => {
  const truth = truthLuma(sc);
  const out = renderLuma(sc, noise, cap, useDither);
  const err = new Float64Array(out.length);
  for (let i = 0; i < out.length; i++) err[i] = out[i] - truth[i];
  const lo = boxBlur(err, sc.w, sc.h, 3); // r=3 ≈ eye low-pass at normal viewing
  let band = 0, ns = 0;
  for (let i = 0; i < err.length; i++) { band += lo[i] * lo[i]; const hi = err[i] - lo[i]; ns += hi * hi; }
  return { banding: (band / err.length) * 1e6, noise: (ns / err.length) * 1e6 };
};

console.log('\nError of the 8-bit output split by frequency (×1e6):');
console.log('  BANDING = low-freq, coherent (what the eye reads as bands — LOWER is better)');
console.log('  NOISE   = high-freq grain (a little is fine; LOWER is calmer)');
console.log('  cap = DARK amplitude ceiling (LSB). Pick the smallest cap that flattens BANDING.\n');
const caps = [0, 1, 2, 3, 4, 8];
const header = ['scene'.padEnd(20), ...caps.map((c) => (c === 0 ? 'none' : `cap${c}`).padStart(8))].join(' ');
console.log('  BANDING');
console.log('  ' + header);
for (const sc of scenes) {
  const row = caps.map((cap) => errorEnergies(sc, cap, cap !== 0).banding.toFixed(2).padStart(8));
  console.log('  ' + sc.name.padEnd(20) + ' ' + row.join(' '));
}
console.log('\n  NOISE');
console.log('  ' + header);
for (const sc of scenes) {
  const row = caps.map((cap) => errorEnergies(sc, cap, cap !== 0).noise.toFixed(2).padStart(8));
  console.log('  ' + sc.name.padEnd(20) + ' ' + row.join(' '));
}

// ── COLUMN-AVERAGE smoothness (the acceptance test) ──────────────────────────────────────────
// For a HORIZONTAL gradient every column has a CONSTANT true value, so the dithered column
// average must reconstruct it smoothly — no plateaus (steps). This is the criterion that
// matches the eye for band-vs-smooth (the blur metric above is too sensitive to the eye-window).
// Spec: 100px tall × 100px wide, 5%→15% brightness.
console.log('\nCOLUMN-AVERAGE smoothness — 100×100, 5%→15% gradient (the acceptance test):');
console.log('  PLATEAU = longest run of columns whose averages are flat (≤0.1 LSB apart) → a step');
console.log('  WIGGLE  = RMS deviation of column averages from the ideal straight line (LSB)');
console.log('  A smooth result has PLATEAU≈1 (no steps) and small WIGGLE.\n');
{
  const ch = 100, b0 = 0.05, b1 = 0.15;
  // Two widths: the spec'd 100px (steep ⇒ ~4px bands) AND a full-screen 1440px (shallow ⇒
  // ~56px bands) — the latter is where the old over-wide gate suppressed dither.
  const colAvgs = (cw: number, cap: number, useDither: boolean): number[] => {
    const out: number[] = [];
    const sl = (b1 - b0) / (cw - 1);
    for (let x = 0; x < cw; x++) {
      const t = b0 + (b1 - b0) * (x / (cw - 1));
      let sum = 0;
      for (let y = 0; y < ch; y++) {
        const d = useDither ? ditherPixel([t, t, t], x, y, [sl, sl, sl], noise, cap) : [t, t, t] as [number, number, number];
        sum += q8(d[0]);
      }
      out.push(sum / ch); // mean column value in LSB (0..255)
    }
    return out;
  };
  const idealLine = (n: number) => Array.from({ length: n }, (_, x) => (b0 + (b1 - b0) * (x / (n - 1))) * 255);
  const maxPlateau = (a: number[]) => { let best = 1, run = 1; for (let i = 1; i < a.length; i++) { if (Math.abs(a[i] - a[i - 1]) <= 0.1) run++; else run = 1; best = Math.max(best, run); } return best; };
  const wiggle = (a: number[], ideal: number[]) => Math.sqrt(a.reduce((s, v, i) => s + (v - ideal[i]) ** 2, 0) / a.length);
  for (const cw of [100, 1440]) {
    const ideal = idealLine(cw);
    console.log(`  ${cw}px wide (slope ${((b1 - b0) / (cw - 1) * 255).toFixed(3)} LSB/px):`);
    console.log('    cap        PLATEAU   WIGGLE');
    for (const cap of [0, 1, 2, 4, 8]) {
      const a = colAvgs(cw, cap, cap !== 0);
      console.log(`    ${(cap === 0 ? 'none' : `cap${cap}`).padEnd(8)}   ${String(maxPlateau(a)).padStart(7)}   ${wiggle(a, ideal).toFixed(3).padStart(6)}`);
    }
  }
}

// ── ERROR DIFFUSION — the WIGGLE→0 reference, via the PRODUCTION renderFieldDithered ─────────
// Error diffusion feeds the quantisation error forward, so the local average tracks the input
// almost exactly → a gradient's column averages are essentially perfect (WIGGLE→0). The geometry
// modes ship this (CPU cpuField path); we test the REAL function here, not a re-impl. We feed a
// grey ramp (index i → {i,i,i}) so the field position == brightness, and read back the dithered
// column averages.
const GREY_RAMP: RGB[] = Array.from({ length: 256 }, (_, i) => ({ r: i, g: i, b: i }));
const edColAvgs = (colTruth: number[], h: number): number[] => {
  const w = colTruth.length;
  const pos = new Float32Array(w * h), cov = new Float32Array(w * h).fill(1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) pos[y * w + x] = colTruth[x];
  const rgba = renderFieldDithered({ width: w, height: h, pos, cov }, GREY_RAMP, true);
  const out = new Array<number>(w).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[x] += rgba[(y * w + x) * 4];
  return out.map((s) => s / h);
};

// ── RESOLUTION: native vs capped-backing-then-bilinear-upscaled ──────────────────────────────
// The preview renders at a capped backing width then the browser bilinearly upscales to the
// display. Dither done at backing res breaks bands at BACKING pixels; upscaling stretches each
// step-run into more DISPLAY pixels (and low-passes the high-freq noise). Model it on the 1D
// column-average curve (bilinear-X preserves column means, so this is exact for steps/wiggle).
const upscale1D = (a: number[], toW: number): number[] => {
  const out = new Array<number>(toW);
  for (let x = 0; x < toW; x++) {
    const sx = (x / (toW - 1)) * (a.length - 1);
    const i = Math.floor(sx), f = sx - i;
    out[x] = a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * f;
  }
  return out;
};

console.log('\nWIGGLE→0 reference + RESOLUTION effect — dark 5%→15% gradient, 100px tall:');
{
  const ch = 100, b0 = 0.05, b1 = 0.15;
  const colAvgBlue = (cw: number, cap: number): number[] => {
    const out: number[] = []; const sl = (b1 - b0) / (cw - 1);
    for (let x = 0; x < cw; x++) {
      const t = b0 + (b1 - b0) * (x / (cw - 1)); let sum = 0;
      for (let y = 0; y < ch; y++) sum += q8(ditherPixel([t, t, t], x, y, [sl, sl, sl], noise, cap)[0]);
      out.push(sum / ch);
    }
    return out;
  };
  const truthCol = (cw: number) => Array.from({ length: cw }, (_, x) => b0 + (b1 - b0) * (x / (cw - 1)));
  const idealLSB = (cw: number) => truthCol(cw).map((t) => t * 255);
  const maxPlateau = (a: number[]) => { let best = 1, run = 1; for (let i = 1; i < a.length; i++) { if (Math.abs(a[i] - a[i - 1]) <= 0.1) run++; else run = 1; best = Math.max(best, run); } return best; };
  const wiggle = (a: number[], ideal: number[]) => Math.sqrt(a.reduce((s, v, i) => s + (v - ideal[i]) ** 2, 0) / a.length);

  const DISP = 1920;
  // (a) blue-noise dithered at NATIVE display width
  const nat = colAvgBlue(DISP, 8);
  // (b) blue-noise dithered at capped backing 1440, then bilinear-upscaled to display
  const up = upscale1D(colAvgBlue(1440, 8), DISP);
  // (c) error diffusion (the SHIPPING geometry path) at native display width — the WIGGLE→0 ref
  const ed = edColAvgs(truthCol(DISP), ch);
  const ideal = idealLSB(DISP);
  console.log(`  display ${DISP}px; old backing-cap 1440; metrics in DISPLAY pixels:`);
  console.log(`    blue-noise cap8 @ native ${DISP}:  WIGGLE ${wiggle(nat, ideal).toFixed(3)}  (fractal/glQuad GL-tail path)`);
  console.log(`    blue-noise cap8 @ 1440→upscaled:   WIGGLE ${wiggle(up, ideal).toFixed(3)}  (← old upscale widened/blurred it)`);
  console.log(`    error diffusion @ native ${DISP}:   WIGGLE ${wiggle(ed, ideal).toFixed(3)}  (← SHIPPING geometry path, WIGGLE→0)`);
}

// ── flat-gate assertion: the island region must receive ZERO dither ──────────────────────────
console.log('\nFLAT-GATE (island must be untouched):');
let gateFail = 0;
for (const sc of scenes) {
  if (!sc.flatRegion) continue;
  const [rx, ry, rw, rh] = sc.flatRegion;
  let maxDelta = 0;
  for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) {
    const c = sc.truth(x, y);
    const d = ditherPixel(c, x, y, sc.slope(x, y), noise, 8);
    maxDelta = Math.max(maxDelta, Math.abs(q8(d[0]) - q8(c[0])));
  }
  const ok = maxDelta === 0;
  if (!ok) gateFail++;
  console.log(`  ${ok ? '✓' : '✗'} ${sc.name}: flat region max 8-bit delta = ${maxDelta} (want 0)`);
}

// ── visual montage: rows = scenes, cols = [truth · no-dither · blue-noise · error-diffusion] ──
// Compares the two SHIPPING paths: blue-noise GL tail (fractal/glQuad) vs error diffusion
// (geometry). Pre-render the error-diffusion buffer per scene (whole-field; grey ramp, pos=luma).
const edBuffers = scenes.map((sc) => {
  const pos = new Float32Array(sc.w * sc.h), cov = new Float32Array(sc.w * sc.h).fill(1);
  for (let y = 0; y < sc.h; y++) for (let x = 0; x < sc.w; x++) { const c = sc.truth(x, y); pos[y * sc.w + x] = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722; }
  return renderFieldDithered({ width: sc.w, height: sc.h, pos, cov }, GREY_RAMP, true);
});
const variants = ['truth', 'no-dither', 'blue-noise cap8', 'error-diffusion (ship)'];
const cellRGB = (si: number, vi: number, x: number, y: number): [number, number, number] => {
  const sc = scenes[si]; const c = sc.truth(x, y);
  if (vi === 0) return [c[0] * 255, c[1] * 255, c[2] * 255];
  if (vi === 1) return [q8(c[0]), q8(c[1]), q8(c[2])];
  if (vi === 2) { const d = ditherPixel(c, x, y, sc.slope(x, y), noise, 8); return [q8(d[0]), q8(d[1]), q8(d[2])]; }
  const o = (y * sc.w + x) * 4; const b = edBuffers[si]; return [b[o], b[o + 1], b[o + 2]];
};
const GAP = 8, COLS = variants.length;
const mw = W * COLS + GAP * (COLS + 1);
const mh = H * scenes.length + GAP * (scenes.length + 1);
const montage: Image = { w: mw, h: mh, data: new Uint8Array(mw * mh * 4).fill(40) };
for (let i = 0; i < montage.data.length; i += 4) montage.data[i + 3] = 255;
scenes.forEach((sc, si) => {
  variants.forEach((_v, vi) => {
    const ox = GAP + vi * (W + GAP), oy = GAP + si * (H + GAP);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const rgb = cellRGB(si, vi, x, y);
      const o = ((oy + y) * mw + (ox + x)) * 4;
      montage.data[o] = rgb[0]; montage.data[o + 1] = rgb[1]; montage.data[o + 2] = rgb[2]; montage.data[o + 3] = 255;
    }
  });
});
const outPath = join(ROOT, 'debug', 'dither-lab.png');
writeFileSync(outPath, encodePng(montage));
console.log(`\nMontage → ${outPath}`);
console.log('Columns: ' + variants.join(' · '));
console.log(`\n${gateFail === 0 ? '✓ flat-gate holds' : `✗ ${gateFail} flat-gate FAILURE(S)`}`);
process.exit(gateFail === 0 ? 0 : 1);
