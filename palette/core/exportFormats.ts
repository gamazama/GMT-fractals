/**
 * exportFormats — the palette export suite, ported VERBATIM from the standalone
 * prototypes (generator_template.html + img2grad_template.html). Pure functions
 * over a 256-step RGB ramp so the Generator, Picker and Image modes all share one
 * exporter ("port once", per the integration plan).
 *
 * Text formats: Fractint .map, hex list, CSS, SVG, JSON, JS, Python, CSV,
 * GIMP .gpl + .ggr, .cpt colour palette table (the Generic Mapping Tools /
 * QGIS scientific-colormap format — NOT this app), Paint.NET. Binary: Photoshop .grd v3.
 * PNG export is a canvas op and lives in the component (not pure).
 *
 * The .grd writer reduces the ramp to ≤GRD_MAX stops via Douglas-Peucker (linear
 * RGB error) because Photoshop caps gradient colour stops at ~85, then writes the
 * big-endian 8BGR v3 layout with 16-bit (×257) colour values — see the prototype
 * comments and memory project_softology_palette_param for the format spec.
 */

import type { RGB } from './oklab';
import { buildIdmlSwatchLibrary } from './indesignIdml';

export interface ExportFormatDef {
  key: string;
  label: string;
  ext: string;
  /** Binary formats return a Uint8Array (download only — Copy is disabled). */
  binary?: boolean;
  build: (ramp: RGB[]) => string | Uint8Array;
  /**
   * Collection formats can bundle MANY named gradients into ONE file (e.g. an
   * Illustrator swatch library). When present, the Favients export emits a single
   * combined file instead of a per-gradient .zip.
   */
  collection?: (items: { name: string; ramp: RGB[] }[]) => string | Uint8Array;
}

const ri = (c: RGB): [number, number, number] => [Math.round(c.r), Math.round(c.g), Math.round(c.b)];
const hx2 = (c: [number, number, number]) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
const seq = <T>(f: (i: number) => T): T[] => Array.from({ length: 256 }, (_, i) => f(i));
const f6 = (x: number) => x.toFixed(6);

// ---- Douglas-Peucker stop reduction (for .grd) ----

const GRD_MAX = 40;

const rdpIdx = (ramp: RGB[], tol: number): number[] => {
  const gc = (i: number) => ri(ramp[i]);
  const keep = new Array(256).fill(false);
  keep[0] = keep[255] = true;
  const st: [number, number][] = [[0, 255]];
  while (st.length) {
    const [a, b] = st.pop()!;
    if (b - a < 2) continue;
    const ca = gc(a);
    const cb = gc(b);
    let md = -1;
    let mi = -1;
    for (let i = a + 1; i < b; i++) {
      const t = (i - a) / (b - a);
      const ir = ca[0] + (cb[0] - ca[0]) * t;
      const ig = ca[1] + (cb[1] - ca[1]) * t;
      const ib = ca[2] + (cb[2] - ca[2]) * t;
      const c = gc(i);
      const d = Math.hypot(c[0] - ir, c[1] - ig, c[2] - ib);
      if (d > md) {
        md = d;
        mi = i;
      }
    }
    if (md > tol) {
      keep[mi] = true;
      st.push([a, mi]);
      st.push([mi, b]);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < 256; i++) if (keep[i]) idx.push(i);
  return idx;
};

/** Reduce a 256-step ramp to ≤`max` representative stop indices (Douglas-Peucker,
 *  escalating tolerance until the budget is met). Shared by .grd, .ai and .idml. */
export const reduceStopIndices = (ramp: RGB[], max: number): number[] => {
  let tol = 1.5;
  let idx = rdpIdx(ramp, tol);
  let g = 0;
  while (idx.length > max && g++ < 40) {
    tol *= 1.35;
    idx = rdpIdx(ramp, tol);
  }
  return idx;
};

const grdStops = (ramp: RGB[]): number[] => reduceStopIndices(ramp, GRD_MAX);

/** Number of colour stops the .grd writer will emit for this ramp. */
export const grdStopCount = (ramp: RGB[]): number => grdStops(ramp).length;

const buildGRD = (ramp: RGB[]): Uint8Array => {
  const gc = (i: number) => ri(ramp[i]);
  const idx = grdStops(ramp);
  const NS = idx.length;
  const size = 8 + 1 + 8 + 2 + NS * 20 + 2 + 2 * 10 + 6;
  const dv = new DataView(new ArrayBuffer(size));
  let p = 0;
  const u8 = (v: number) => {
    dv.setUint8(p, v);
    p++;
  };
  const u16 = (v: number) => {
    dv.setUint16(p, v, false);
    p += 2;
  };
  const i32 = (v: number) => {
    dv.setInt32(p, v, false);
    p += 4;
  };
  '8BGR'.split('').forEach((ch) => u8(ch.charCodeAt(0)));
  u16(3);
  u16(1); // version 3, 1 gradient
  const nm = 'gradient';
  u8(nm.length);
  nm.split('').forEach((ch) => u8(ch.charCodeAt(0)));
  u16(NS); // colour stops
  for (const i of idx) {
    const c = gc(i);
    i32(Math.round((i / 255) * 4096));
    i32(50); // offset 0..4096, midpoint %
    u16(0); // colour model 0 = RGB
    u16(c[0] * 257);
    u16(c[1] * 257);
    u16(c[2] * 257);
    u16(0);
    u16(0); // colour type 0 = user
  }
  u16(2); // transparency stops (fully opaque)
  i32(0);
  i32(50);
  u16(255);
  i32(4096);
  i32(50);
  u16(255);
  for (let k = 0; k < 6; k++) u8(0); // reserved
  return new Uint8Array(dv.buffer);
};

// ---- Adobe Illustrator (.ai) gradient-swatch library ----
//
// A GMT addition (not from the prototypes). Emits a plain-text legacy
// `%!PS-Adobe-3.0` Illustrator 8 document — modern Illustrator (24.0+) opens it
// directly and every gradient lands in the Swatches panel as a real RGB gradient
// swatch. No PDF/Zstd container needed. Each 256-step ramp is reduced to ≤AI_MAX
// stops (shared Douglas-Peucker) so the swatch matches the displayed ramp.
//
// Stop grammar (RGB document, reverse-engineered from a real AI 24.0 export):
//   C M Y K  R G B  2 1 6 50 <rampPoint>     ← RGB authoritative, 2 = "RGB present"
// written as a dual line (data `… %_BS`, then commented twin `%_… Bs`). One ramp
// segment (`%_Br`, rampType 4 = RGB) per (nStops-1); AI regenerates the real ramp.

const AI_MAX = 40;

// SVG/CSS gradients have no spec limit, but every consumer truncates: Figma keeps
// ~32 stops, and other apps cap similarly. So we reduce smartly (Douglas-Peucker)
// to a budget that survives import everywhere, rather than dumping a fixed sample.
const SVG_MAX = 32;

const aiNum = (n: number, dp = 6): string => {
  if (!isFinite(n)) n = 0;
  let s = n.toFixed(dp);
  if (s.indexOf('.') !== -1) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
};

/** Escape a PostScript literal-string body for `(...)`. */
const psStr = (s: string): string => (s || 'gradient').replace(/([\\()])/g, '\\$1');

/** RGB (0-255) -> CMYK (0-1) process fallback (RGB stays authoritative in the file). */
const rgbToCmyk = (r: number, g: number, b: number) => {
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const k = 1 - Math.max(rf, gf, bf);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 1 };
  return { c: (1 - rf - k) / (1 - k), m: (1 - gf - k) / (1 - k), y: (1 - bf - k) / (1 - k), k };
};

/** `C M Y K R G B` colour spec shared by ramp segments and stops. */
const aiColorSpec = (c: RGB): string => {
  const [r, g, b] = ri(c);
  const { c: cy, m, y, k } = rgbToCmyk(r, g, b);
  return `${aiNum(cy)} ${aiNum(m)} ${aiNum(y)} ${aiNum(k)} ${aiNum(r / 255)} ${aiNum(g / 255)} ${aiNum(b / 255)}`;
};

const aiGradientDef = (name: string, ramp: RGB[]): string => {
  // Illustrator lists gradient stops in DESCENDING rampPoint order (100 → 0); the
  // reducer returns ascending positions, so reverse before emitting. Getting this
  // wrong reverses + collapses the stops on import.
  const idx = reduceStopIndices(ramp, AI_MAX).reverse();
  const n = psStr(name);
  const lines: string[] = [`%AI5_BeginGradient: (${n})`, `(${n}) 0 ${idx.length} Bd`, '['];
  for (let i = 0; i < idx.length - 1; i++) lines.push(`${aiColorSpec(ramp[idx[i]])} 4 %_Br`);
  lines.push('[');
  for (let i = 0; i < idx.length; i++) {
    const rampPt = aiNum((idx[i] / 255) * 100);
    const tok = `${aiColorSpec(ramp[idx[i]])} 2 1 6 50 ${rampPt}`;
    lines.push(`${tok} %_BS`);
    lines.push(`%_${tok} Bs`);
  }
  lines.push('BD', '%AI5_EndGradient');
  return lines.join('\n');
};

const aiSwatchCell = (name: string): string =>
  `Bb\n2 (${psStr(name)}) 0 0 0 1 1 0 0 1 0 0 1 Bg\n0 BB\n(${psStr(name)})\nPc`;

/** Number of stops the .ai writer keeps for this ramp (after reduction). */
export const aiStopCount = (ramp: RGB[]): number => reduceStopIndices(ramp, AI_MAX).length;

/**
 * Worst-case colour error (0..~441, RGB euclidean) between the original 256-step
 * ramp and its ≤AI_MAX-stop Illustrator reduction — i.e. how much detail the
 * format limitation costs THIS gradient. ~24+ is visibly lossy.
 */
export const aiReductionError = (ramp: RGB[]): number => {
  const idx = reduceStopIndices(ramp, AI_MAX);
  let maxd = 0;
  for (let s = 0; s < idx.length - 1; s++) {
    const a = idx[s];
    const b = idx[s + 1];
    const ca = ri(ramp[a]);
    const cb = ri(ramp[b]);
    const span = b - a || 1;
    for (let i = a; i <= b; i++) {
      const t = (i - a) / span;
      const c = ri(ramp[i]);
      const d = Math.hypot(c[0] - (ca[0] + (cb[0] - ca[0]) * t), c[1] - (ca[1] + (cb[1] - ca[1]) * t), c[2] - (ca[2] + (cb[2] - ca[2]) * t));
      if (d > maxd) maxd = d;
    }
  }
  return maxd;
};

/** Max-stop budget + the "visibly lossy" threshold for the .ai reduction warning. */
export const AI_STOP_LIMIT = AI_MAX;
export const AI_LOSSY_DELTA = 24;

/** Named gradients whose .ai reduction exceeds `threshold` (the ones to warn about). */
export const aiLossyGradients = (
  items: { name: string; ramp: RGB[] }[],
  threshold = AI_LOSSY_DELTA,
): { name: string; delta: number }[] =>
  items.map((it) => ({ name: it.name, delta: aiReductionError(it.ramp) })).filter((x) => x.delta > threshold);

/** Build a complete Illustrator `.ai` swatch library from one or more named ramps. */
export const buildAiSwatchLibrary = (items: { name: string; ramp: RGB[] }[]): string => {
  // De-dupe swatch names so Illustrator keeps same-named gradients distinct.
  const seen = new Map<string, number>();
  const named = items.map((it) => {
    const base = it.name || 'gradient';
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return { name: n ? `${base} ${n + 1}` : base, ramp: it.ramp };
  });
  const header = [
    '%!PS-Adobe-3.0',
    '%%Creator: GMT Fractal Explorer',
    '%%AI8_CreatorVersion: 29.1.0',
    '%%Title: (GMT Gradients)',
    '%%BoundingBox: 0 0 0 0',
    '%%HiResBoundingBox: 0 0 0 0',
    '%AI5_FileFormat 14.0',
    '%AI3_ColorUsage: Color',
    '%%RGBProcessColor: 0 0 0 ([Registration])',
    '%AI9_ColorModel: 1',
    '%AI5_ArtSize: 14400 14400',
    '%AI5_NumLayers: 1',
    '%%EndComments',
    '%%BeginProlog',
    '%%EndProlog',
    '%%BeginSetup',
    '%AI5_Begin_NonPrinting',
    'Np',
    `${named.length} Bn`,
  ];
  const defs = named.map((it) => aiGradientDef(it.name, it.ramp));
  const palette = ['%AI5_BeginPalette', '0 0 Pb', ...named.map((it) => aiSwatchCell(it.name)), 'PB', '%AI5_EndPalette'];
  return [...header, ...defs, '%AI5_End_NonPrinting--', '%%EndSetup', ...palette, '%%Trailer', '%%EOF', ''].join('\n');
};

// ---- Ultra Fractal / IFS gradient (.ugr) ----
//
// The classic 1D flame-fractal palette format (Ultra Fractal, Apophysis/flam3
// `.gradient`, ChaosHelper, and bezo97's IFSRenderer all read it). One or more
// named blocks, each a 400-entry index→colour ring:
//
//   MyGrad {
//   gradient:
//    title="MyGrad" smooth=no
//    index=0 color=12573686
//    ...
//    index=399 color=101873
//   }
//
// Importer contract (verified against IFSRenderer's FlamePalette.FromFileAsync):
//   • colour int is RGB with R as the LEAST-significant byte: R + G·256 + B·65536
//     (NOT 0xRRGGBB). Must be a non-negative integer 0..16777215.
//   • palettes are matched with `{[^{]+}` → no `{` may appear inside a block.
//   • the title regex needs whitespace after the closing quote; every
//     `index=.. color=..` token (the last one included) needs trailing whitespace
//     → end every line, and the file, with a newline.
//   • default ring size is 400 and the importer lerps linearly in RGB between the
//     stops we give. We emit a Douglas-Peucker–reduced set of control nodes
//     (≤UGR_MAX_STOPS) mapped onto the 0..399 ring, with smooth=no — NOT all 400.
//     Every consumer then interpolates LINEARLY between the same nodes: IFSRenderer
//     rebuilds its 400-entry buffer, Apophysis resamples its 256-colour palette, and
//     Ultra Fractal's node-based editor stays editable (a handful of draggable nodes
//     instead of one per ring slot). RDP picks the nodes against linear-interp error,
//     so the reconstruction tracks our ramp within tolerance — the same near-lossless
//     bar the .ai/.idml/.grd swatch exports use. The ramp endpoints (0 and last) are
//     always kept (→ index 0 and 399), so there's no wrap-blend region the importer
//     would otherwise synthesise from the last stop back to the first.

const UGR_INDICES = 400; // Ultra Fractal's native gradient resolution (index 0..399)
// Editable node budget. RDP emits far fewer for the smooth ramps fractal palettes
// almost always are (a 3-colour blend reduces to ~4 nodes, near-lossless); the cap
// only bites on complex multi-lobe ramps, where more nodes = better fidelity and 64
// is still comfortable to hand-edit in UF (vs a wall of 400). Sharp-edged ramps soften
// by ~1 ring slot at each seam under any reduced format — that's inherent to linear
// interp, not this budget; dense-400 would be needed for pixel-exact band edges.
const UGR_MAX_STOPS = 64;

/** UF colour integer: R is the least-significant byte (R + G·256 + B·65536). */
const ugrInt = (c: RGB): number => {
  const [r, g, b] = ri(c);
  return r + g * 256 + b * 65536;
};

/** A UF entry/title identifier: strip block- and title-breaking chars, collapse
 *  whitespace to underscores so it round-trips through Ultra Fractal too. */
const ugrName = (name: string): string =>
  (name || 'gradient').replace(/[{}"\r\n]+/g, '').replace(/\s+/g, '_').slice(0, 48) || 'gradient';

const ugrBlock = (name: string, ramp: RGB[]): string => {
  const safe = ugrName(name);
  const span = ramp.length - 1 || 1;
  const lines = [`${safe} {`, 'gradient:', ` title="${safe}" smooth=no`];
  let lastIdx = -1;
  for (const i of reduceStopIndices(ramp, UGR_MAX_STOPS)) {
    // Map the ramp position (0..len-1) onto the UF 0..399 ring; force strictly
    // increasing indices so no two stops land on the same slot (overwrite-on-import).
    const idx = Math.min(UGR_INDICES - 1, Math.max(lastIdx + 1, Math.round((i / span) * (UGR_INDICES - 1))));
    lines.push(` index=${idx} color=${ugrInt(ramp[i])}`);
    lastIdx = idx;
  }
  lines.push('}');
  return lines.join('\n');
};

/** Build a `.ugr` holding one or more named gradients (de-duped like the .ai
 *  builder so same-named palettes stay distinct in Ultra Fractal). */
const buildUgr = (items: { name: string; ramp: RGB[] }[]): string => {
  const seen = new Map<string, number>();
  const blocks = items.map((it) => {
    const base = ugrName(it.name);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return ugrBlock(n ? `${base}_${n + 1}` : base, it.ramp);
  });
  return blocks.join('\n\n') + '\n';
};

// ---- the suite ----

export const EXPORT_FORMATS: ExportFormatDef[] = [
  {
    key: 'map',
    label: 'Fractint .map',
    ext: 'map',
    build: (r) => seq((i) => ri(r[i]).map((v) => String(v).padStart(3, ' ')).join(' ')).join('\n'),
  },
  { key: 'hex', label: 'Hex list (256)', ext: 'txt', build: (r) => seq((i) => hx2(ri(r[i]))).join('\n') },
  {
    key: 'css',
    label: 'CSS linear-gradient',
    ext: 'css',
    build: (r) =>
      'background: linear-gradient(90deg, ' +
      Array.from({ length: 33 }, (_, k) => hx2(ri(r[Math.round((k / 32) * 255)])) + ' ' + ((k / 32) * 100).toFixed(1) + '%').join(', ') +
      ');',
  },
  {
    key: 'svg',
    label: 'SVG',
    ext: 'svg',
    build: (r) =>
      '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">' +
      reduceStopIndices(r, SVG_MAX).map((i) => '<stop offset="' + ((i / 255) * 100).toFixed(1) + '%" stop-color="' + hx2(ri(r[i])) + '"/>').join('') +
      '</linearGradient></defs><rect width="256" height="32" fill="url(#g)"/></svg>',
  },
  { key: 'json', label: 'JSON', ext: 'json', build: (r) => JSON.stringify({ name: 'gradient', colors: seq((i) => hx2(ri(r[i]))) }) },
  { key: 'js', label: 'JS array (rgb)', ext: 'js', build: (r) => 'const gradient = ' + JSON.stringify(seq((i) => ri(r[i]))) + ';' },
  { key: 'py', label: 'Python list', ext: 'py', build: (r) => 'gradient = [' + seq((i) => '(' + ri(r[i]).join(', ') + ')').join(', ') + ']' },
  { key: 'csv', label: 'CSV', ext: 'csv', build: (r) => 'r,g,b\n' + seq((i) => ri(r[i]).join(',')).join('\n') },
  {
    key: 'gpl',
    label: 'GIMP palette .gpl',
    ext: 'gpl',
    build: (r) => 'GIMP Palette\nName: gradient\nColumns: 16\n#\n' + seq((i) => ri(r[i]).map((v) => String(v).padStart(3, ' ')).join(' ') + '\tc' + i).join('\n'),
  },
  {
    key: 'ggr',
    label: 'GIMP gradient .ggr',
    ext: 'ggr',
    build: (r) => {
      let s = 'GIMP Gradient\nName: gradient\n255\n';
      for (let k = 0; k < 255; k++) {
        const a = ri(r[k]).map((v) => v / 255);
        const b = ri(r[k + 1]).map((v) => v / 255);
        s += [k / 255, (k + 0.5) / 255, (k + 1) / 255, a[0], a[1], a[2], 1, b[0], b[1], b[2], 1].map(f6).join(' ') + ' 0 0\n';
      }
      return s;
    },
  },
  {
    key: 'cpt',
    label: 'Color palette table .cpt',
    ext: 'cpt',
    build: (r) => {
      let s = '# COLOR_MODEL = RGB\n# gradient\n';
      for (let k = 0; k < 255; k++) s += (k / 255).toFixed(5) + ' ' + ri(r[k]).join(' ') + ' ' + ((k + 1) / 255).toFixed(5) + ' ' + ri(r[k + 1]).join(' ') + '\n';
      return s + 'B ' + ri(r[0]).join(' ') + '\nF ' + ri(r[255]).join(' ') + '\nN 128 128 128\n';
    },
  },
  {
    key: 'pdn',
    label: 'Paint.NET',
    ext: 'txt',
    build: (r) =>
      '; paint.net Palette File\n' +
      Array.from({ length: 96 }, (_, k) => 'FF' + ri(r[Math.round((k / 95) * 255)]).map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()).join('\n'),
  },
  { key: 'grd', label: 'Photoshop .grd (binary)', ext: 'grd', binary: true, build: (r) => buildGRD(r) },
  {
    key: 'ai',
    label: 'Illustrator swatches .ai',
    ext: 'ai',
    build: (r) => buildAiSwatchLibrary([{ name: 'gradient', ramp: r }]),
    collection: (items) => buildAiSwatchLibrary(items),
  },
  {
    key: 'idml',
    label: 'InDesign swatches .idml',
    ext: 'idml',
    binary: true,
    build: (r) => buildIdmlSwatchLibrary([{ name: 'gradient', ramp: r }]),
    collection: (items) => buildIdmlSwatchLibrary(items),
  },
  {
    key: 'ugr',
    label: 'IFS / Ultra Fractal .ugr',
    ext: 'ugr',
    build: (r) => buildUgr([{ name: 'gradient', ramp: r }]),
    collection: (items) => buildUgr(items),
  },
];

export const getExportFormat = (key: string): ExportFormatDef | undefined => EXPORT_FORMATS.find((f) => f.key === key);
