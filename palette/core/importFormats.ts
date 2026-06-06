/**
 * importFormats — pure, deterministic gradient-file PARSERS that close the one-way
 * export (`exportFormats.ts`). Each parser reads a TEXT gradient and produces a
 * 256-step RGB ramp, the single interchange the whole palette suite speaks.
 *
 * The formats here round-trip the text formats we emit:
 *   .map (Fractint) · .gpl (GIMP palette) · .ggr (GIMP gradient) · .cpt (colour
 *   palette table) · .css (linear-gradient) · .json.
 * Photoshop .grd is binary (8BGR) — deferred (parse it from bytes in a later pass).
 *
 * CONTRACT (mirrors `palette/core/` rules):
 *   - PURE + deterministic: input text → ramp, no DOM, no `File`, no Date/random.
 *     The `File` read happens in the UI layer; these functions only see a string.
 *   - FAIL-SAFE on untrusted input: malformed / truncated / hostile text returns
 *     `null` (or skips the offending line) and NEVER throws. Loops are bounded
 *     (`MAX_LINES` / `MAX_ANCHORS`) and the regexes are linear (no catastrophic
 *     backtracking) so a pathological file can't hang or blow the stack.
 *   - One ramp seam: a parsed ramp is handed to `registerCustomRamp` by the caller —
 *     this module introduces no second ramp path.
 *
 * @invariant every exported parser returns a 256-length `RGB[]` or `null`; it must
 *   never throw on arbitrary input.
 */

import type { RGB } from './oklab';

export type ImportFormatKey = 'map' | 'gpl' | 'ggr' | 'cpt' | 'css' | 'json';

export interface ImportResult {
  ramp: RGB[];
  format: ImportFormatKey;
}

/** Text extensions we can parse (lower-case, no dot). `.grd` is binary → not here. */
export const IMPORT_EXTENSIONS: readonly ImportFormatKey[] = ['map', 'gpl', 'ggr', 'cpt', 'css', 'json'];

// --- safety bounds (untrusted input) ---
const MAX_TEXT = 16 * 1024 * 1024; // 16 MB — a gradient file is KB; bigger ⇒ reject.
const MAX_LINES = 300_000;
const MAX_ANCHORS = 100_000;

const clampByte = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Build a validated RGB from three numbers, or null if any is non-finite. */
const rgb = (r: number, g: number, b: number): RGB | null =>
  Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)
    ? { r: clampByte(Math.round(r)), g: clampByte(Math.round(g)), b: clampByte(Math.round(b)) }
    : null;

/** Tolerant hex parser: #rgb / #rgba / #rrggbb / #rrggbbaa (alpha dropped), # optional. */
const parseHex = (raw: string): RGB | null => {
  const m = /^#?([0-9a-fA-F]{3,8})$/.exec(raw.trim());
  if (!m) return null;
  let s = m[1];
  if (s.length === 3 || s.length === 4) s = s.split('').map((c) => c + c).join(''); // expand shorthand
  if (s.length === 8) s = s.slice(0, 6); // drop alpha
  if (s.length !== 6) return null;
  return rgb(parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16));
};

/** Split into lines, capped at MAX_LINES so a giant file can't run unbounded. */
const splitLines = (text: string): string[] => text.split(/\r?\n/, MAX_LINES);

/** All signed decimal/scientific numbers on a line. */
const numsOf = (line: string): number[] => {
  const m = line.match(/-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/g);
  return m ? m.map(Number) : [];
};

/** Position-tagged colour anchor (position in [0,1]). */
interface Anchor {
  p: number;
  c: RGB;
}

/** Evenly-spaced anchors from an ordered colour list (single colour ⇒ flat ramp). */
const evenAnchors = (cols: RGB[]): Anchor[] =>
  cols.map((c, i) => ({ p: cols.length === 1 ? 0 : i / (cols.length - 1), c }));

/**
 * Resample a set of colour anchors to a 256-step ramp by linear RGB interpolation.
 * Anchors whose positions coincide with the 256 sample grid (i/255) are reproduced
 * exactly — so dense exports (.map/.gpl/.json/.cpt) round-trip byte-for-byte.
 */
const rampFromAnchors = (anchors: Anchor[]): RGB[] | null => {
  const a = anchors
    .filter((x) => x && x.c && Number.isFinite(x.p))
    .map((x) => ({ p: x.p < 0 ? 0 : x.p > 1 ? 1 : x.p, c: x.c }));
  if (!a.length) return null;
  a.sort((u, v) => u.p - v.p);
  const last = a.length - 1;
  const out: RGB[] = new Array(256);
  let k = 0; // two-pointer: anchors and samples both ascend
  for (let i = 0; i < 256; i++) {
    const p = i / 255;
    if (p <= a[0].p) {
      out[i] = { ...a[0].c };
      continue;
    }
    if (p >= a[last].p) {
      out[i] = { ...a[last].c };
      continue;
    }
    while (k < last - 1 && a[k + 1].p <= p) k++;
    const lo = a[k];
    const hi = a[k + 1];
    const span = hi.p - lo.p;
    const t = span > 1e-9 ? (p - lo.p) / span : 0;
    out[i] = {
      r: lo.c.r + (hi.c.r - lo.c.r) * t,
      g: lo.c.g + (hi.c.g - lo.c.g) * t,
      b: lo.c.b + (hi.c.b - lo.c.b) * t,
    };
  }
  return out;
};

// ---- .map (Fractint) / .gpl (GIMP palette): one RGB triplet per data line ----

/**
 * Both formats are "one `R G B` triplet per line" with header/comment lines that
 * start with a letter, `#`, or `;` (GIMP's `GIMP Palette` / `Name:` / `Columns:`,
 * Fractint's optional comment). We skip those and read the first three integers of
 * every remaining line, in order, as evenly-spaced ramp colours.
 */
const parseTriplets = (text: string): RGB[] | null => {
  const cols: RGB[] = [];
  for (const raw of splitLines(text)) {
    if (cols.length >= MAX_ANCHORS) break;
    const t = raw.trim();
    if (!t) continue;
    const f = t.charCodeAt(0);
    const isLetter = (f >= 65 && f <= 90) || (f >= 97 && f <= 122);
    if (t[0] === '#' || t[0] === ';' || isLetter) continue; // header / comment
    const n = numsOf(t);
    if (n.length < 3) continue;
    const c = rgb(n[0], n[1], n[2]);
    if (c) cols.push(c);
  }
  return cols.length ? rampFromAnchors(evenAnchors(cols)) : null;
};

export const parseMap = parseTriplets;
export const parseGpl = parseTriplets;

// ---- .ggr (GIMP gradient): per-segment endpoints + midpoint ----

interface GgrSeg {
  l: number;
  m: number;
  r: number;
  c0: RGB;
  c1: RGB;
}

/**
 * GIMP gradient segments: `left mid right  r0 g0 b0 a0  r1 g1 b1 a1  blend coloring`
 * with colour channels in [0,1]. We honour the per-segment MIDPOINT for the default
 * linear blend (type 0); non-linear blend curves and HSV colouring degrade to a
 * linear RGB interpolation (robustness over exactness for non-default files). The
 * `GIMP Gradient` / `Name:` / count header lines have <13 numbers and are skipped.
 */
export const parseGgr = (text: string): RGB[] | null => {
  const segs: GgrSeg[] = [];
  for (const raw of splitLines(text)) {
    if (segs.length >= MAX_ANCHORS) break;
    const n = numsOf(raw);
    if (n.length < 13) continue;
    const c0 = rgb(n[3] * 255, n[4] * 255, n[5] * 255);
    const c1 = rgb(n[7] * 255, n[8] * 255, n[9] * 255);
    if (!c0 || !c1 || !(n[0] <= n[2])) continue;
    segs.push({ l: n[0], m: n[1], r: n[2], c0, c1 });
  }
  if (!segs.length) return null;
  segs.sort((a, b) => a.l - b.l);
  const out: RGB[] = new Array(256);
  let k = 0;
  for (let i = 0; i < 256; i++) {
    const p = i / 255;
    while (k < segs.length - 1 && p > segs[k].r) k++;
    const s = segs[k];
    let f: number;
    if (p <= s.l) f = 0;
    else if (p >= s.r) f = 1;
    else {
      const t = (p - s.l) / (s.r - s.l);
      const mp = (s.m - s.l) / (s.r - s.l);
      f = mp <= 0 || mp >= 1 ? t : t <= mp ? 0.5 * (t / mp) : 0.5 + 0.5 * ((t - mp) / (1 - mp));
    }
    out[i] = {
      r: s.c0.r + (s.c1.r - s.c0.r) * f,
      g: s.c0.g + (s.c1.g - s.c0.g) * f,
      b: s.c0.b + (s.c1.b - s.c0.b) * f,
    };
  }
  return out;
};

// ---- .cpt (colour palette table, GMT/QGIS) ----

/**
 * CPT continuous slices: `z0 r0 g0 b0 z1 r1 g1 b1` (8 numbers) — both endpoints
 * become anchors. A 4-number `z r g b` line is a single anchor. `B`/`F`/`N`
 * (background/foreground/NaN) and `#` comment lines are ignored. `r/g/b` slash
 * syntax is normalised to spaces. The z column is rescaled to [0,1].
 */
export const parseCpt = (text: string): RGB[] | null => {
  const anchors: Anchor[] = [];
  for (const raw of splitLines(text)) {
    if (anchors.length >= MAX_ANCHORS) break;
    const t = raw.trim();
    if (!t || t[0] === '#') continue;
    if (/^[BFN]\b/.test(t)) continue;
    const n = numsOf(t.replace(/\//g, ' '));
    if (n.length >= 8) {
      const c0 = rgb(n[1], n[2], n[3]);
      const c1 = rgb(n[5], n[6], n[7]);
      if (c0) anchors.push({ p: n[0], c: c0 });
      if (c1) anchors.push({ p: n[4], c: c1 });
    } else if (n.length >= 4) {
      const c = rgb(n[1], n[2], n[3]);
      if (c) anchors.push({ p: n[0], c });
    }
  }
  if (!anchors.length) return null;
  let mn = anchors[0].p;
  let mx = anchors[0].p;
  for (const a of anchors) {
    if (a.p < mn) mn = a.p;
    if (a.p > mx) mx = a.p;
  }
  const span = mx - mn;
  return rampFromAnchors(anchors.map((a) => ({ p: span > 1e-12 ? (a.p - mn) / span : 0, c: a.c })));
};

// ---- .css (linear-gradient) ----

/** Split a string on `sep` at paren-depth 0 (so `rgb(r,g,b)` commas don't split). */
const splitTopLevel = (s: string, sep: string): string[] => {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
};

/** A hex or rgb()/rgba() colour anywhere in a CSS colour-stop fragment. */
const cssColor = (frag: string): RGB | null => {
  const h = /#[0-9a-fA-F]{3,8}\b/.exec(frag);
  if (h) {
    const c = parseHex(h[0]);
    if (c) return c;
  }
  const rg = /rgba?\(\s*(-?\d+(?:\.\d+)?%?)[\s,]+(-?\d+(?:\.\d+)?%?)[\s,]+(-?\d+(?:\.\d+)?%?)/i.exec(frag);
  if (rg) {
    const conv = (x: string): number => (x.endsWith('%') ? Number(x.slice(0, -1)) * 2.55 : Number(x));
    return rgb(conv(rg[1]), conv(rg[2]), conv(rg[3]));
  }
  return null;
};

/** Assign positions to CSS stops: use explicit `%`, fill gaps evenly, force ascending. */
const cssPositions = (stops: { c: RGB; pct: number | null }[]): Anchor[] => {
  const n = stops.length;
  const pos: (number | null)[] = stops.map((s) => s.pct);
  if (pos[0] == null) pos[0] = 0;
  if (pos[n - 1] == null) pos[n - 1] = n === 1 ? 0 : 1;
  let i = 0;
  while (i < n) {
    if (pos[i] != null) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && pos[j] == null) j++;
    const lo = pos[i - 1] as number;
    const hi = pos[j] as number;
    const cnt = j - i + 1;
    for (let k = i; k < j; k++) pos[k] = lo + (hi - lo) * ((k - i + 1) / cnt);
    i = j;
  }
  for (let k = 1; k < n; k++) if ((pos[k] as number) < (pos[k - 1] as number)) pos[k] = pos[k - 1];
  return stops.map((s, k) => ({ p: pos[k] as number, c: s.c }));
};

export const parseCss = (text: string): RGB[] | null => {
  let body = text;
  const gi = text.indexOf('gradient(');
  if (gi >= 0) {
    const start = text.indexOf('(', gi);
    let depth = 0;
    let end = -1;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end < 0) return null;
    body = text.slice(start + 1, end);
  }
  const stops: { c: RGB; pct: number | null }[] = [];
  for (const part of splitTopLevel(body, ',')) {
    if (stops.length >= MAX_ANCHORS) break;
    const p = part.trim();
    if (!p) continue;
    const c = cssColor(p); // null for "90deg" / "to right" — skipped
    if (!c) continue;
    const pm = /(-?\d+(?:\.\d+)?)%/.exec(p);
    stops.push({ c, pct: pm ? Number(pm[1]) / 100 : null });
  }
  return stops.length ? rampFromAnchors(cssPositions(stops)) : null;
};

// ---- .json ----

/** A colour from a JSON entry: "#hex" / "rgb(...)" / [r,g,b] / {r,g,b} / {color}. */
const jsonColor = (it: unknown): RGB | null => {
  if (typeof it === 'string') return parseHex(it) ?? cssColor(it);
  if (Array.isArray(it) && it.length >= 3) return rgb(Number(it[0]), Number(it[1]), Number(it[2]));
  if (it && typeof it === 'object') {
    const o = it as Record<string, unknown>;
    if ('r' in o && 'g' in o && 'b' in o) return rgb(Number(o.r), Number(o.g), Number(o.b));
    if (typeof o.color === 'string') return parseHex(o.color) ?? cssColor(o.color);
  }
  return null;
};

/**
 * JSON gradient: an array of colours, or `{ colors: [...] }` / `{ stops: [...] }`.
 * Matches our own `.json` export (`{ name, colors: ["#hex", …] }`) and tolerates
 * common shapes (rgb arrays, stop objects).
 */
export const parseJson = (text: string): RGB[] | null => {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return null;
  }
  let arr: unknown[] | null = null;
  if (Array.isArray(obj)) arr = obj;
  else if (obj && typeof obj === 'object') {
    const o = obj as Record<string, unknown>;
    arr = Array.isArray(o.colors) ? o.colors : Array.isArray(o.stops) ? o.stops : null;
  }
  if (!arr || !arr.length) return null;
  const cols: RGB[] = [];
  for (const it of arr) {
    if (cols.length >= MAX_ANCHORS) break;
    const c = jsonColor(it);
    if (c) cols.push(c);
  }
  return cols.length ? rampFromAnchors(evenAnchors(cols)) : null;
};

// ---- dispatch ----

const PARSERS: Record<ImportFormatKey, (text: string) => RGB[] | null> = {
  map: parseMap,
  gpl: parseGpl,
  ggr: parseGgr,
  cpt: parseCpt,
  css: parseCss,
  json: parseJson,
};

/** Content sniff when the extension is missing or unrecognised. */
const sniff = (text: string): ImportFormatKey | null => {
  const head = text.slice(0, 4096);
  if (/^\s*GIMP Palette/.test(head)) return 'gpl';
  if (/^\s*GIMP Gradient/.test(head)) return 'ggr';
  // CPT continuous slice: 8 columns on ONE line. Use [ \t] (not \s) so the pattern
  // can't span newlines and mis-flag a 3-column .map file as cpt.
  if (/COLOR_MODEL|^[ \t]*[-\d.]+[ \t]+\d+[ \t]+\d+[ \t]+\d+[ \t]+[-\d.]+[ \t]+\d+/m.test(head)) return 'cpt';
  if (/gradient\s*\(/.test(head)) return 'css';
  const t = head.trimStart();
  if (t[0] === '{' || t[0] === '[') return 'json';
  if (/^\s*\d+\s+\d+\s+\d+/m.test(head)) return 'map';
  return null;
};

/**
 * Parse a gradient file's TEXT into a 256-step ramp. `ext` (lower-case, no dot) is
 * the preferred discriminator; when absent/unknown the content is sniffed. Returns
 * `null` for anything we can't read — never throws.
 */
export const parseGradientText = (text: string, ext?: string): ImportResult | null => {
  try {
    if (typeof text !== 'string' || !text.length || text.length > MAX_TEXT) return null;
    const key = (ext && IMPORT_EXTENSIONS.includes(ext as ImportFormatKey)
      ? (ext as ImportFormatKey)
      : sniff(text)) as ImportFormatKey | null;
    if (!key) return null;
    const ramp = PARSERS[key](text);
    return ramp && ramp.length === 256 ? { ramp, format: key } : null;
  } catch {
    return null; // fail safe on any unexpected input
  }
};
