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
  /** What to call this format under the SWATCHES subject, when the ramp wording is wrong
   *  for it ("Hex list (256)" is a ramp fact). Falls back to `label`. */
  swatchLabel?: string;
  ext: string;
  /** Binary formats return a Uint8Array (download only — Copy is disabled). */
  binary?: boolean;
  /** The RAMP subject: the continuous 256-step gradient. `stem` is the gradient's name,
   *  for formats that name what they write; older builders ignore it. */
  /** `budget` is the Settings category's stop override (`stopBudgetOf`); formats that do
   *  not reduce ignore it. */
  build: (ramp: RGB[], stem?: string, budget?: number) => string | Uint8Array;
  /**
   * Collection formats can bundle MANY named gradients into ONE file (e.g. an
   * Illustrator swatch library). When present, the Favients export emits a single
   * combined file instead of a per-gradient .zip.
   */
  collection?: (items: { name: string; ramp: RGB[] }[], budget?: number) => string | Uint8Array;
  /**
   * The SWATCHES subject: build this format from a LIST OF COLOURS — the palette the
   * user composed on the hero — rather than from the 256-step ramp. Absent means the
   * format is about a continuous gradient and does not appear under that subject; the
   * registry's shape is the filter, so there is no second list to keep in step.
   * `stem` is the gradient's name, for formats that name their entries.
   */
  swatches?: (colors: RGB[], stem: string) => string | Uint8Array;
  /**
   * Many named colour LISTS in one file (the swatches counterpart of `collection`).
   * Only .ase implements it — grouping is part of that format, so a whole set stays
   * one file with a named folder per gradient. Everything else zips.
   */
  collectionSwatches?: (items: { name: string; colors: RGB[] }[]) => string | Uint8Array;
}

/** Which face of a gradient an export is taken from (§8b item 5, 2026-09-09). */
export type ExportSubject = 'ramp' | 'swatches';

/** The formats that can serve `subject`. Under 'swatches' this is the registry filtered
 *  to entries carrying a `swatches` builder — the single place that decision is made. */
export const formatsFor = (subject: ExportSubject): ExportFormatDef[] =>
  subject === 'ramp' ? EXPORT_FORMATS : EXPORT_FORMATS.filter((f) => !!f.swatches);

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
 *  escalating tolerance until the budget is met). Every reduced format calls this, each
 *  with its own budget: .grd (`GRD_MAX` 40), .ai (`AI_MAX` 40, re-exported as
 *  `AI_STOP_LIMIT` and reused by `indesignIdml.ts` for .idml), .svg (`SVG_MAX` 32) and
 *  .ugr (`UGR_MAX_STOPS` 64). Grep `reduceStopIndices` for the current call sites rather
 *  than trusting a list here — this one has already gone stale twice. */
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

const grdStops = (ramp: RGB[], budget?: number): number[] => reduceStopIndices(ramp, budget ?? GRD_MAX);

/** Number of colour stops the .grd writer will emit for this ramp. */
export const grdStopCount = (ramp: RGB[], budget?: number): number => grdStops(ramp, budget).length;

const buildGRD = (ramp: RGB[], budget?: number): Uint8Array => {
  const gc = (i: number) => ri(ramp[i]);
  const idx = grdStops(ramp, budget);
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

const aiGradientDef = (name: string, ramp: RGB[], budget?: number): string => {
  // Illustrator lists gradient stops in DESCENDING rampPoint order (100 → 0); the
  // reducer returns ascending positions, so reverse before emitting. Getting this
  // wrong reverses + collapses the stops on import.
  const idx = reduceStopIndices(ramp, budget ?? AI_MAX).reverse();
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
export const aiStopCount = (ramp: RGB[], budget?: number): number => reduceStopIndices(ramp, budget ?? AI_MAX).length;

/**
 * Worst-case colour error (0..~441, RGB euclidean) between the original 256-step
 * ramp and its ≤AI_MAX-stop Illustrator reduction — i.e. how much detail the
 * format limitation costs THIS gradient. ~24+ is visibly lossy.
 */
export const aiReductionError = (ramp: RGB[], budget?: number): number => {
  const idx = reduceStopIndices(ramp, budget ?? AI_MAX);
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

/**
 * Named gradients whose reduction to `budget` stops exceeds `threshold` — the ones to warn
 * about. `budget` defaults to the .ai/.idml/.ase limit, which is what this measured (and
 * only ever measured) before the Settings category made the budget movable.
 */
export const aiLossyGradients = (
  items: { name: string; ramp: RGB[] }[],
  threshold = AI_LOSSY_DELTA,
  budget?: number,
): { name: string; delta: number }[] =>
  items.map((it) => ({ name: it.name, delta: aiReductionError(it.ramp, budget) })).filter((x) => x.delta > threshold);

/** Build a complete Illustrator `.ai` swatch library from one or more named ramps. */
export const buildAiSwatchLibrary = (items: { name: string; ramp: RGB[] }[], budget?: number): string => {
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
  const defs = named.map((it) => aiGradientDef(it.name, it.ramp, budget));
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

/**
 * THE STOP BUDGET, per format (owner, 2026-09-10 — folded into the export window's Settings
 * category). Every format here flattens a 256-step ramp to a handful of stops because its
 * own file format says so, and until now each budget was a private constant nobody could
 * see or move. They are the DEFAULTS now: `stopBudgetOf` takes an override and hands back
 * what a given format will actually write.
 *
 * A format absent from this table does not reduce at all (it writes the ramp, or a fixed
 * count the format itself dictates — .map's 256, Paint.NET's 96), so an override means
 * nothing to it and it is never offered one.
 */
export const STOP_BUDGETS: Readonly<Record<string, number>> = Object.freeze({
  grd: GRD_MAX,
  svg: SVG_MAX,
  ai: AI_MAX,
  idml: AI_MAX,
  ase: AI_MAX,
  ugr: UGR_MAX_STOPS,
});

/** What `key` will actually reduce to, or null if it does not reduce. */
export const stopBudgetOf = (key: string, override?: number): number | null => {
  const base = STOP_BUDGETS[key];
  if (base === undefined) return null;
  return override && override > 1 ? Math.round(override) : base;
};

/** UF colour integer: R is the least-significant byte (R + G·256 + B·65536). */
const ugrInt = (c: RGB): number => {
  const [r, g, b] = ri(c);
  return r + g * 256 + b * 65536;
};

/** A UF entry/title identifier: strip block- and title-breaking chars, collapse
 *  whitespace to underscores so it round-trips through Ultra Fractal too. */
const ugrName = (name: string): string =>
  (name || 'gradient').replace(/[{}"\r\n]+/g, '').replace(/\s+/g, '_').slice(0, 48) || 'gradient';

const ugrBlock = (name: string, ramp: RGB[], budget?: number): string => {
  const safe = ugrName(name);
  const span = ramp.length - 1 || 1;
  const lines = [`${safe} {`, 'gradient:', ` title="${safe}" smooth=no`];
  let lastIdx = -1;
  for (const i of reduceStopIndices(ramp, budget ?? UGR_MAX_STOPS)) {
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
const buildUgr = (items: { name: string; ramp: RGB[] }[], budget?: number): string => {
  const seen = new Map<string, number>();
  const blocks = items.map((it) => {
    const base = ugrName(it.name);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return ugrBlock(n ? `${base}_${n + 1}` : base, it.ramp, budget);
  });
  return blocks.join('\n\n') + '\n';
};

// ---- the SWATCHES subject: a list of colours, not a ramp ----
//
// A gradient has two faces, and until 2026-09-09 the export suite only knew one of them.
// Every builder above takes the 256-step RAMP. But the hero also carries a PALETTE — the
// handful of swatches the user actually placed along that ramp (`palette/core/
// paletteSample.ts`, `workingStore.positions`) — and for a whole family of formats THAT is
// the natural input: a GIMP palette wants your seven colours, not 256 samples of them; so
// does a Tailwind scale, a design-token file, an .ase library.
//
// So a format may declare a second builder, `swatches`. It is not a replacement: `build`
// keeps its exact meaning and its round-trip guard (`test:palette-importformats` re-parses
// .gpl and friends from their 256-entry ramp form). A format with no `swatches` builder
// simply does not appear under the Swatches subject — the registry's shape IS the filter,
// so there is no second list to keep in step.
//
// @invariant every EXPORT_FORMATS entry still has a `build`, so the old shell's Extras
//   panels (palette/components/GeneratorExtrasPanel.tsx + ImageExtrasPanel.tsx, which
//   iterate the registry and call `.build` unconditionally) cannot meet a format they
//   choke on — proven by: `npx tsx debug/test-palette-exportsubjects.mts`
//   ("[1] every registry format still builds from a 256-step ramp").

/** A Tailwind-shaped scale's step count, and its step names. */
/** The .ase stop budget — the same 40 the .grd / .ai reductions use, so an .ase and an .ai
 *  of the same gradient agree on which colours matter. */
const ASE_MAX = AI_MAX;

const SCALE_STEPS = 11;
const SCALE_KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** Sample a colour list down to `n` evenly spaced entries (a ramp's swatch form). */
const rampToSwatches = (r: RGB[], n: number): RGB[] =>
  Array.from({ length: n }, (_, k) => r[Math.round((k / (n - 1)) * (r.length - 1))]);

/** A CSS/JS-safe identifier stem from a gradient name. */
const identOf = (name: string): string =>
  (name || 'gradient').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'gradient';

/** Step names for a colour list: a Tailwind-style 50…950 scale at exactly SCALE_STEPS,
 *  plain 1-based indices otherwise. Keeps the eleven-colour case idiomatic without
 *  pretending an arbitrary count is a scale. */
const stepNames = (n: number): string[] =>
  n === SCALE_STEPS ? SCALE_KEYS.map(String) : Array.from({ length: n }, (_, i) => String(i + 1));

// ---- Adobe Swatch Exchange (.ase) ----
//
// The interchange every Adobe app and most third-party colour tools read. Binary,
// big-endian:
//
//   "ASEF" | u16 major=1 | u16 minor=0 | u32 blockCount
//   block: u16 type | u32 length (bytes AFTER this field) | payload
//     type 0x0001 = colour entry, 0xC001 = group start, 0xC002 = group end
//     colour entry payload: u16 nameLen (UTF-16 units INCLUDING the null terminator)
//                           | name as UTF-16BE + U+0000 | 4 ASCII colour-model bytes
//                           | model floats (RGB = 3 × f32, 0..1) | u16 colour type
//     group start payload:  the same name fields, nothing else
//     group end payload:    empty (length 0)
//
// The declared name length counts UTF-16 CODE UNITS — not bytes and not code points — so a
// name carrying an emoji contributes 2. Iterating with `charCodeAt` is deliberate for that
// reason; `Array.from` would undercount a surrogate pair and shift every following block.

const aseNameUnits = (s: string): number[] => {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
  out.push(0); // the terminating null is part of the declared length
  return out;
};

interface AseBlock {
  type: number;
  name?: string;
  color?: RGB;
}

const buildAseBlocks = (blocks: AseBlock[]): Uint8Array => {
  const bodies = blocks.map((b) => {
    if (b.type === 0xc002) return new Uint8Array(0);
    const units = aseNameUnits(b.name ?? '');
    const extra = b.color ? 4 + 12 + 2 : 0;
    const buf = new DataView(new ArrayBuffer(2 + units.length * 2 + extra));
    let p = 0;
    buf.setUint16(p, units.length, false);
    p += 2;
    for (const u of units) {
      buf.setUint16(p, u, false);
      p += 2;
    }
    if (b.color) {
      for (const ch of 'RGB ') {
        buf.setUint8(p, ch.charCodeAt(0));
        p += 1;
      }
      const ch01 = (v: number) => Math.min(1, Math.max(0, Math.round(v) / 255));
      buf.setFloat32(p, ch01(b.color.r), false);
      p += 4;
      buf.setFloat32(p, ch01(b.color.g), false);
      p += 4;
      buf.setFloat32(p, ch01(b.color.b), false);
      p += 4;
      buf.setUint16(p, 2, false); // 2 = normal (not global, not spot)
    }
    return new Uint8Array(buf.buffer);
  });
  const total = 12 + bodies.reduce((a, b) => a + 6 + b.length, 0);
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  let p = 0;
  for (const ch of 'ASEF') {
    dv.setUint8(p, ch.charCodeAt(0));
    p += 1;
  }
  dv.setUint16(p, 1, false);
  p += 2;
  dv.setUint16(p, 0, false);
  p += 2;
  dv.setUint32(p, blocks.length, false);
  p += 4;
  blocks.forEach((b, i) => {
    dv.setUint16(p, b.type, false);
    p += 2;
    dv.setUint32(p, bodies[i].length, false);
    p += 4;
    out.set(bodies[i], p);
    p += bodies[i].length;
  });
  return out;
};

/** One flat .ase of `colors`, each named "<stem> <step>". */
export const buildAse = (colors: RGB[], stem = 'gradient'): Uint8Array =>
  buildAseBlocks(colors.map((c, i) => ({ type: 0x0001, name: `${stem} ${stepNames(colors.length)[i]}`, color: c })));

/** One .ase holding a GROUP per named colour list — what a whole set exports to. This is
 *  why .ase is the only swatches format that bundles rather than zipping: grouping is IN
 *  the format, so twenty palettes stay twenty named folders in Illustrator's panel. */
export const buildAseGroups = (items: { name: string; colors: RGB[] }[]): Uint8Array => {
  const seen = new Map<string, number>();
  const blocks: AseBlock[] = [];
  for (const it of items) {
    const base = it.name || 'gradient';
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    const label = n ? `${base} ${n + 1}` : base;
    const names = stepNames(it.colors.length);
    blocks.push({ type: 0xc001, name: label });
    it.colors.forEach((c, i) => blocks.push({ type: 0x0001, name: `${label} ${names[i]}`, color: c }));
    blocks.push({ type: 0xc002 });
  }
  return buildAseBlocks(blocks);
};

// ---- text formats over a colour list ----

const hexList = (colors: RGB[]): string[] => colors.map((c) => hx2(ri(c)));

/** Tailwind: a `theme.extend.colors` fragment. Eleven colours become a real 50…950 scale. */
const buildTailwind = (colors: RGB[], stem = 'gradient'): string =>
  '// tailwind.config.js — theme.extend.colors\n' +
  `${JSON.stringify(identOf(stem))}: {\n` +
  stepNames(colors.length)
    .map((n, i) => `  ${JSON.stringify(n)}: ${JSON.stringify(hexList(colors)[i])},`)
    .join('\n') +
  '\n},\n';

/** W3C design tokens (the DTCG draft shape: `$value` + `$type`). */
const buildTokens = (colors: RGB[], stem = 'gradient'): string => {
  const names = stepNames(colors.length);
  const hx = hexList(colors);
  const body: Record<string, { $value: string; $type: string }> = {};
  names.forEach((n, i) => {
    body[n] = { $value: hx[i], $type: 'color' };
  });
  return JSON.stringify({ [identOf(stem)]: body }, null, 2);
};

/** CSS custom properties on `:root`. */
const buildCssVars = (colors: RGB[], stem = 'gradient'): string => {
  const id = identOf(stem);
  const hx = hexList(colors);
  return ':root {\n' + stepNames(colors.length).map((n, i) => `  --${id}-${n}: ${hx[i]};`).join('\n') + '\n}\n';
};

// ---- the suite ----

export const EXPORT_FORMATS: ExportFormatDef[] = [
  {
    key: 'map',
    label: 'Fractint .map',
    ext: 'map',
    build: (r) => seq((i) => ri(r[i]).map((v) => String(v).padStart(3, ' ')).join(' ')).join('\n'),
  },
  {
    key: 'hex',
    label: 'Hex list (256)',
    swatchLabel: 'Hex list',
    ext: 'txt',
    build: (r) => seq((i) => hx2(ri(r[i]))).join('\n'),
    swatches: (c) => hexList(c).join('\n'),
  },
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
    build: (r, _stem, budget) =>
      '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">' +
      reduceStopIndices(r, budget ?? SVG_MAX).map((i) => '<stop offset="' + ((i / 255) * 100).toFixed(1) + '%" stop-color="' + hx2(ri(r[i])) + '"/>').join('') +
      '</linearGradient></defs><rect width="256" height="32" fill="url(#g)"/></svg>',
  },
  {
    key: 'json',
    label: 'JSON',
    ext: 'json',
    build: (r, stem) => JSON.stringify({ name: stem || 'gradient', colors: seq((i) => hx2(ri(r[i]))) }),
    swatches: (c, stem) => JSON.stringify({ name: stem || 'gradient', colors: hexList(c) }, null, 2),
  },
  {
    key: 'js',
    label: 'JS array (rgb)',
    swatchLabel: 'JS array (hex)',
    ext: 'js',
    build: (r) => 'const gradient = ' + JSON.stringify(seq((i) => ri(r[i]))) + ';',
    swatches: (c) => 'const palette = ' + JSON.stringify(hexList(c)) + ';',
  },
  {
    key: 'py',
    label: 'Python list',
    ext: 'py',
    build: (r) => 'gradient = [' + seq((i) => '(' + ri(r[i]).join(', ') + ')').join(', ') + ']',
    swatches: (c) => 'palette = [' + hexList(c).map((h) => JSON.stringify(h)).join(', ') + ']',
  },
  {
    key: 'csv',
    label: 'CSV',
    ext: 'csv',
    build: (r) => 'r,g,b\n' + seq((i) => ri(r[i]).join(',')).join('\n'),
    swatches: (c) => 'name,hex,r,g,b\n' + c.map((x, i) => [stepNames(c.length)[i], hx2(ri(x)), ...ri(x)].join(',')).join('\n'),
  },
  {
    key: 'gpl',
    label: 'GIMP palette .gpl',
    ext: 'gpl',
    build: (r) => 'GIMP Palette\nName: gradient\nColumns: 16\n#\n' + seq((i) => ri(r[i]).map((v) => String(v).padStart(3, ' ')).join(' ') + '\tc' + i).join('\n'),
    swatches: (c, stem) =>
      'GIMP Palette\nName: ' +
      (stem || 'gradient') +
      '\nColumns: ' +
      Math.min(16, c.length) +
      '\n#\n' +
      c.map((x, i) => ri(x).map((v) => String(v).padStart(3, ' ')).join(' ') + '\t' + stepNames(c.length)[i]).join('\n'),
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
    swatches: (c) =>
      '; paint.net Palette File\n' + c.map((x) => 'FF' + ri(x).map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()).join('\n'),
  },
  { key: 'grd', label: 'Photoshop .grd (binary)', ext: 'grd', binary: true, build: (r, _stem, budget) => buildGRD(r, budget) },
  {
    key: 'ai',
    label: 'Illustrator swatches .ai',
    ext: 'ai',
    build: (r, stem, budget) => buildAiSwatchLibrary([{ name: stem || 'gradient', ramp: r }], budget),
    collection: (items, budget) => buildAiSwatchLibrary(items, budget),
  },
  {
    key: 'idml',
    label: 'InDesign swatches .idml',
    ext: 'idml',
    binary: true,
    build: (r, stem, budget) => buildIdmlSwatchLibrary([{ name: stem || 'gradient', ramp: r }], budget),
    collection: (items, budget) => buildIdmlSwatchLibrary(items, budget),
  },
  {
    key: 'ugr',
    label: 'IFS / Ultra Fractal .ugr',
    ext: 'ugr',
    build: (r, stem, budget) => buildUgr([{ name: stem || 'gradient', ramp: r }], budget),
    collection: (items, budget) => buildUgr(items, budget),
  },
  // ---- swatch-native formats (S5 / §8b item 5, 2026-09-09) ----
  //
  // These four are ABOUT a list of colours, so their swatches builder is the honest one and
  // their ramp builder is a sampling of it: .ase takes the ramp's key stops (the same RDP
  // reduction .grd and .ai use, so an .ase of a gradient and an .ai of it agree on which
  // colours matter), while the three scale formats take SCALE_STEPS even steps — eleven,
  // because that is the shape Tailwind, token files and CSS variable sets are written in,
  // and at exactly eleven `stepNames` gives the idiomatic 50…950 keys.
  {
    key: 'ase',
    label: 'Adobe swatches .ase',
    ext: 'ase',
    binary: true,
    build: (r, stem, budget) => buildAse(reduceStopIndices(r, budget ?? ASE_MAX).map((i) => r[i]), stem || 'gradient'),
    swatches: (c, stem) => buildAse(c, stem || 'gradient'),
    collection: (items) =>
      buildAseGroups(items.map((it) => ({ name: it.name, colors: reduceStopIndices(it.ramp, ASE_MAX).map((i) => it.ramp[i]) }))),
    collectionSwatches: (items) => buildAseGroups(items),
  },
  {
    key: 'tw',
    label: 'Tailwind colors',
    ext: 'js',
    build: (r, stem) => buildTailwind(rampToSwatches(r, SCALE_STEPS), stem || 'gradient'),
    swatches: (c, stem) => buildTailwind(c, stem || 'gradient'),
  },
  {
    key: 'tokens',
    label: 'Design tokens (W3C)',
    ext: 'json',
    build: (r, stem) => buildTokens(rampToSwatches(r, SCALE_STEPS), stem || 'gradient'),
    swatches: (c, stem) => buildTokens(c, stem || 'gradient'),
  },
  {
    key: 'cssvars',
    label: 'CSS variables',
    ext: 'css',
    build: (r, stem) => buildCssVars(rampToSwatches(r, SCALE_STEPS), stem || 'gradient'),
    swatches: (c, stem) => buildCssVars(c, stem || 'gradient'),
  },
];

export const getExportFormat = (key: string): ExportFormatDef | undefined => EXPORT_FORMATS.find((f) => f.key === key);
