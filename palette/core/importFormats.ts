/**
 * importFormats — pure, deterministic gradient-file PARSERS that close the one-way
 * export (`exportFormats.ts`). Each parser reads a TEXT gradient and produces a
 * 256-step RGB ramp, the single interchange the whole palette suite speaks.
 *
 * The formats here round-trip the text formats we emit:
 *   .map (Fractint) · .gpl (GIMP palette) · .ggr (GIMP gradient) · .cpt (colour
 *   palette table) · .css (linear-gradient, and CSS variables) · .json (colours, an exact
 *   `{stops}` gradient, and W3C design tokens).
 * Photoshop .grd is binary (8BGR) — deferred (parse it from bytes in a later pass).
 *
 * Since ADR-0123 (2026-09-14) a result also carries the NAME the file holds and, for a JSON that
 * is a whole gradient, the exact CONFIG — see `ImportResult`. The router that turns results into
 * favourites is `importGradientFiles.ts`; the PNG / document / zip entrances are not here.
 *
 * CONTRACT for THIS module (`palette/core/` as a whole does NOT hold to it —
 * `favientsExport.ts` / `img2grad/decode.ts` / `favientDnd.ts` /
 * `storage.ts` / `catalogLoader.ts` reach for `document` / `localStorage` / `fetch`):
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
 *   never throw on arbitrary input — proven by:
 *   `npx tsx debug/test-palette-importformats.mts`, both halves falsified 2026-07-29.
 *   Length: shrinking `rampFromAnchors`'s output to 255 turned 36 assertions red
 *   ("<fmt>: \"<preset>\" parses"), because `parseGradientText` gates on
 *   `ramp.length === 256`. No-throw: making `parseCss` throw on non-gradient text turned
 *   section [5]'s "parseCss no throw on nonsense" red. Both exit 1.
 *
 *   NOTE the two halves are guarded at different strengths. `parseGradientText` is
 *   trivially no-throw — it wraps everything in try/catch. The six exported parsers are
 *   NOT wrapped, and section [5] feeds each of them exactly ONE nonsense string
 *   (`'### nonsense ###\n!!!\n'`), so their no-throw claim rests on a single sample per
 *   parser rather than on a fuzz sweep.
 *
 * @invariant a name our exporters write into .gpl / .ggr / .cpt / .json / .css / CSS variables /
 *   design tokens comes back as `name`, exactly; a file carrying none, or only the old `gradient`
 *   placeholder, has no `name`; and a hostile name (newline, 13 numbers, a CSS gradient and
 *   comment terminator) cannot become colour data — proven by:
 *   `npx tsx debug/test-palette-importformats.mts` ("[8] … the name survives", "[8] … no name",
 *   "[8] ggr: a Name line of 13 numbers is not a segment"). Falsified 2026-09-14, see its header.
 * @invariant a `{stops}` JSON (either ADR-0122 form) whose every stop passes the gate returns
 *   `config` exact in position, colour, bias, interpolation, blend and colour space, and one the
 *   gate would thin returns colours with no `config` — proven by:
 *   `npx tsx debug/test-palette-importformats.mts` ("[9] every stop exact", "[9] blend + colour
 *   space exact", "[9] a stop the gate would drop → colours evenly spaced, no config").
 * @invariant CSS variables and design tokens import their colours in order, each within OKLab
 *   ΔE 0.02 at its even position; and an extension outside `IMPORT_EXTENSIONS` +
 *   `SNIFF_EXTENSIONS` is refused — proven by: `npx tsx debug/test-palette-importformats.mts`
 *   ("[10] … within ΔE 0.02", "[11] a GIMP palette named .ai is refused").
 */

import type { RGB } from './oklab';
import type { GradientConfig } from '../../types';
import { coerceGradientConfig } from './editorConfig';
import { gradientDisplayRamp } from './gmtGradient';

export type ImportFormatKey = 'map' | 'gpl' | 'ggr' | 'cpt' | 'css' | 'json';

/**
 * What a gradient file yields (ADR-0123 item 2, 2026-09-14). `ramp` is always there — the
 * 256-step display ramp. The two optional fields are what the FILE says beyond its colours:
 *
 *   - `name` — the name the file carries, as written: `.gpl` / `.ggr` `Name:`, `.cpt`
 *     `# Name:`, JSON `name`, a leading one-line CSS comment (`/* Sea Glass é *\/`, which our
 *     .css and CSS-variables exports write). Absent when the file carries none — or carries
 *     only `gradient`, the placeholder every exporter wrote before names were written, so an
 *     old file still takes its filename rather than becoming one more "gradient".
 *   - `config` — an EXACT gradient, present only when the file IS one: a `{stops:[…]}` object
 *     (the editor's Copy Gradient JSON, a bare GMT config, either ADR-0122 form) or a bare
 *     array of positioned stops, and only when every stop passes `coerceGradientConfig`. Use it
 *     verbatim; `ramp` is then its display ramp. Absent → the caller fits `ramp`.
 */
export interface ImportResult {
  ramp: RGB[];
  format: ImportFormatKey;
  name?: string;
  config?: GradientConfig;
}

/** Text extensions we can parse (lower-case, no dot). `.grd` is binary → not here. */
export const IMPORT_EXTENSIONS: readonly ImportFormatKey[] = ['map', 'gpl', 'ggr', 'cpt', 'css', 'json'];

/**
 * Extensions whose content is sniffed. No extension at all, or `.txt` (a generic text
 * container — a palette saved from a text editor). ANY OTHER extension this module does not
 * parse is refused: an `.ai` forced through the OS dialog's "All files" used to sniff as a
 * `.cpt` and import garbage.
 */
const SNIFF_EXTENSIONS: readonly string[] = ['', 'txt'];

/** The exporters' pre-2026-09-14 name placeholder — never a name a file carries. */
const PLACEHOLDER_NAME = 'gradient';
const NAME_MAX = 200;

/** A file-carried name, cleaned (control characters → space, trimmed, capped), or undefined
 *  when there is none worth keeping (empty, not a string, or the old placeholder). */
const nameValue = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined;
  const s = Array.from(raw.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim()).slice(0, NAME_MAX).join('').trim();
  return s && s !== PLACEHOLDER_NAME ? s : undefined;
};

/** A parser's full answer: the ramp plus whatever else the file says. */
interface Parsed {
  ramp: RGB[] | null;
  name?: string;
  config?: GradientConfig;
}

/** The first `re` capture among the first 16 lines — header fields sit at the top. */
const headerField = (text: string, re: RegExp): string | undefined => {
  const lines = text.split(/\r?\n/, 16);
  for (const l of lines) {
    const m = re.exec(l);
    if (m) return nameValue(m[1]);
  }
  return undefined;
};

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

/** .gpl: the triplets, and GIMP's `Name:` header line. */
const parseGplFull = (text: string): Parsed => ({ ramp: parseTriplets(text), name: headerField(text, /^\s*Name:\s*(.*)$/) });

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
    // Header lines start with a letter (`GIMP Gradient`, `Name: …`); a segment never does. A
    // name that happens to hold 13 numbers must not be read as a segment.
    const f = raw.trimStart().charCodeAt(0);
    if ((f >= 65 && f <= 90) || (f >= 97 && f <= 122)) continue;
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

/** .ggr: the segments, and the `Name:` header line. */
const parseGgrFull = (text: string): Parsed => ({ ramp: parseGgr(text), name: headerField(text, /^\s*Name:\s*(.*)$/) });

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

/** .cpt: the slices, and a `# Name: …` comment (what our exporter writes; a bare comment is
 *  NOT a name — real .cpt files open with arbitrary notes). */
const parseCptFull = (text: string): Parsed => ({ ramp: parseCpt(text), name: headerField(text, /^\s*#\s*Name\s*:\s*(.*)$/i) });

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

/**
 * CSS custom properties (`--sea-glass-50: #0b3d4f;` — our CSS-variables export, and any `:root`
 * palette): every declaration whose value is a colour, in the order written, evenly spaced.
 * Before 2026-09-14 this text fell through to the gradient reader, which found no commas and
 * returned the FIRST colour as a flat ramp. Declarations that are not colours are skipped.
 */
const cssVarColors = (text: string): RGB[] => {
  const cols: RGB[] = [];
  const re = /--[A-Za-z0-9_-]+[ \t]*:[ \t]*([^;}\r\n]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && cols.length < MAX_ANCHORS) {
    const c = cssColor(m[1]);
    if (c) cols.push(c);
  }
  return cols;
};

/** A leading one-line `/* … *\/` comment — the name our CSS exports write. A multi-line or
 *  longer comment is a licence header or notes, not a name. */
const cssLeadingName = (text: string): string | undefined => {
  const t = text.trimStart();
  if (!t.startsWith('/*')) return undefined;
  const end = t.indexOf('*/');
  if (end < 0 || end > NAME_MAX + 8) return undefined;
  const body = t.slice(2, end);
  return /[\r\n]/.test(body) ? undefined : nameValue(body);
};

/** .css: a `linear-gradient(…)` (it wins when present), else CSS variables, else the colours
 *  found in the text; and the leading-comment name. */
export const parseCss = (input: string): RGB[] | null => {
  // The leading comment is a name, never colour data: a gradient named "Dusk gradient(2)" or
  // "#1 pick" must not be read as the gradient or as a stop.
  const lead = input.trimStart();
  const close = lead.startsWith('/*') ? lead.indexOf('*/') : -1;
  const text = close >= 0 ? lead.slice(close + 2) : input;
  let body = text;
  const gi = text.indexOf('gradient(');
  if (gi < 0) {
    const vars = cssVarColors(text);
    if (vars.length) return rampFromAnchors(evenAnchors(vars));
  }
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
 * The EXACT gradient a JSON object describes, or null. `{stops:[…], colorSpace?, blendSpace?}`
 * — the editor's Copy Gradient JSON and a bare GMT config, stop form or ramp form (`stops: []`
 * + `ramp`, ADR-0122) — through the one untrusted-config gate, `coerceGradientConfig`.
 *
 * Only when the gate keeps EVERY stop. A list it thins (a stop with no position, an `rgb()`
 * colour the gate does not take) is not a gradient we can reproduce, so it goes to the colour
 * reader below, which is what every such file got before — nothing that imported by colour
 * before 2026-09-14 changes.
 */
const exactJsonConfig = (o: Record<string, unknown>): GradientConfig | null => {
  const stops = o.stops as unknown[];
  const config = coerceGradientConfig(o);
  return config && config.stops.length === stops.length ? config : null;
};

/** A DTCG token `$value` as a colour: a CSS colour string, or the 2025 object form
 *  (`{ hex }`, or sRGB `components` on 0..1). */
const tokenColor = (v: unknown): RGB | null => {
  if (typeof v === 'string') return parseHex(v) ?? cssColor(v);
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.hex === 'string') return parseHex(o.hex);
  const c = o.components;
  if ((o.colorSpace === undefined || o.colorSpace === 'srgb') && Array.isArray(c) && c.length >= 3) return rgb(Number(c[0]) * 255, Number(c[1]) * 255, Number(c[2]) * 255);
  return null;
};

/**
 * W3C design tokens (the DTCG shape our `tokens` export writes: `{ "sea-glass": { "50":
 * { "$value": "#…", "$type": "color" }, … } }`): every colour token, depth-first, in the order
 * the object iterates. A `$type` is inherited from its group; a token with no type anywhere
 * counts when its value reads as a colour. Non-colour tokens are skipped.
 *
 * ORDER: JavaScript iterates integer-like keys ("50", "100", … "950", or "1" … "N") in ascending
 * numeric order whatever order the file wrote them in, and other keys in the order written. Every
 * scale we or Tailwind-style tools write runs low → high, so that is the written order; a file
 * that wrote a numeric scale high → low comes back reversed.
 */
const tokenColors = (root: Record<string, unknown>): RGB[] => {
  const out: RGB[] = [];
  const walk = (node: unknown, type: unknown, depth: number): void => {
    if (out.length >= MAX_ANCHORS || depth > 32 || !node || typeof node !== 'object' || Array.isArray(node)) return;
    const o = node as Record<string, unknown>;
    const t = typeof o.$type === 'string' ? o.$type : type;
    if ('$value' in o) {
      if (t === 'color' || t === undefined) {
        const c = tokenColor(o.$value);
        if (c) out.push(c);
      }
      return;
    }
    for (const k of Object.keys(o)) if (k[0] !== '$') walk(o[k], t, depth + 1);
  };
  walk(root, undefined, 0);
  return out;
};

/** The name our tokens export writes: `$extensions["com.gmt-fractals"].name` on the root or on
 *  its only group (`exportFormats.TOKENS_EXTENSION_KEY`; not imported, to keep this module free
 *  of the exporter). */
const tokensName = (root: Record<string, unknown>): string | undefined => {
  const fromExt = (g: unknown): string | undefined => {
    if (!g || typeof g !== 'object' || Array.isArray(g)) return undefined;
    const ext = (g as Record<string, unknown>).$extensions;
    const mine = ext && typeof ext === 'object' ? (ext as Record<string, unknown>)['com.gmt-fractals'] : undefined;
    return mine && typeof mine === 'object' ? nameValue((mine as Record<string, unknown>).name) : undefined;
  };
  const groups = Object.keys(root).filter((k) => k[0] !== '$');
  return fromExt(root) ?? (groups.length === 1 ? fromExt(root[groups[0]]) : undefined);
};

/**
 * JSON: in this order —
 *   1. an exact gradient (`exactJsonConfig`): `{stops:[…]}` or a bare array of positioned stops;
 *   2. an array of colours, or `{ colors: [...] }` / `{ stops: [...] }` read as colours, evenly
 *      spaced (our own `.json` export is `{ name, colors: ["#hex", …] }`);
 *   3. design tokens.
 * `name` from a top-level string `name`.
 */
const parseJsonFull = (text: string): Parsed | null => {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return null;
  }
  let arr: unknown[] | null = null;
  let name: string | undefined;
  let o: Record<string, unknown> | null = null;
  if (Array.isArray(obj)) {
    arr = obj;
    if (obj.length && obj.every((s) => s && typeof s === 'object' && !Array.isArray(s) && 'position' in s)) {
      const config = exactJsonConfig({ stops: obj });
      if (config) return { ramp: gradientDisplayRamp(config), config };
    }
  } else if (obj && typeof obj === 'object') {
    o = obj as Record<string, unknown>;
    name = nameValue(o.name);
    if (Array.isArray(o.stops)) {
      const config = exactJsonConfig(o);
      if (config) return { ramp: gradientDisplayRamp(config), name, config };
    }
    arr = Array.isArray(o.colors) ? o.colors : Array.isArray(o.stops) ? o.stops : null;
  }
  const cols: RGB[] = [];
  if (arr) {
    for (const it of arr) {
      if (cols.length >= MAX_ANCHORS) break;
      const c = jsonColor(it);
      if (c) cols.push(c);
    }
  } else if (o) {
    cols.push(...tokenColors(o));
    name ??= tokensName(o);
  }
  return cols.length ? { ramp: rampFromAnchors(evenAnchors(cols)), name } : null;
};

/** JSON as a ramp (see `parseJsonFull` for what is read, and in what order). */
export const parseJson = (text: string): RGB[] | null => parseJsonFull(text)?.ramp ?? null;

// ---- dispatch ----

const PARSERS: Record<ImportFormatKey, (text: string) => Parsed | null> = {
  map: (t) => ({ ramp: parseMap(t) }),
  gpl: parseGplFull,
  ggr: parseGgrFull,
  cpt: parseCptFull,
  css: (t) => ({ ramp: parseCss(t), name: cssLeadingName(t) }),
  json: parseJsonFull,
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
  if (/--[A-Za-z0-9_-]+[ \t]*:/.test(head)) return 'css'; // CSS variables
  if (/^\s*\d+\s+\d+\s+\d+/m.test(head)) return 'map';
  return null;
};

/**
 * Parse a gradient file's TEXT. `ext` (lower-case, no dot) decides the format when it is one
 * we parse; with NO extension (or `.txt`) the content is sniffed; any other extension is
 * refused (`null`) — see `SNIFF_EXTENSIONS`. Returns `null` for anything we can't read — never
 * throws. See `ImportResult` for `name` and `config`.
 */
export const parseGradientText = (text: string, ext?: string): ImportResult | null => {
  try {
    if (typeof text !== 'string' || !text.length || text.length > MAX_TEXT) return null;
    const e = typeof ext === 'string' ? ext.toLowerCase() : '';
    let key: ImportFormatKey | null;
    if ((IMPORT_EXTENSIONS as readonly string[]).includes(e)) key = e as ImportFormatKey;
    else if (SNIFF_EXTENSIONS.includes(e)) key = sniff(text);
    else return null;
    if (!key) return null;
    const p = PARSERS[key](text);
    if (!p || !p.ramp || p.ramp.length !== 256) return null;
    const out: ImportResult = { ramp: p.ramp, format: key };
    if (p.name) out.name = p.name;
    if (p.config) out.config = p.config;
    return out;
  } catch {
    return null; // fail safe on any unexpected input
  }
};
