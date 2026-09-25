/**
 * paintRamp — painting on a 256-texel gradient (the Gradient Explorer's Paint face).
 *
 * A gradient is a 256-texel ramp (ADR-0122), so a brush on a gradient is a 1-D brush: a dab is
 * a WINDOW of texels around a centre, weighted by a profile (a plateau `hardness` wide with a
 * smoothstep shoulder), and a stroke is dabs laid along the pointer's path every `spacing`.
 * This module is that model and nothing else — no DOM, no store, no React. The face
 * (gradient-explorer/v2/paint/) owns the pointer, the canvases and the commit; it hands this a
 * texel coordinate and a pressure and reads the texels back.
 *
 * WHAT A SESSION IS. `PaintSession` holds the ramp as it was when the face opened (`original`,
 * what Restore paints back and what the face's thin "before" line shows), the ramp as painted
 * so far (`current`), and a stroke-by-stroke undo stack. It never writes a gradient anywhere:
 * committing is the host's (`toRamp` → `makeRampGradient`), and so is discarding (drop the
 * session). Texels are FLOATS in sRGB 0–255 for the whole session and are only rounded when the
 * host encodes the result, so a hundred faint dabs do not stair-step through 8-bit rounding.
 *
 * THE TOOLS. Two families, and the difference is load-bearing:
 *   • WASH tools — Paint, Clone, Restore. A stroke accumulates a per-texel COVERAGE (each dab adds
 *     `flow` of what is left) and a per-texel paint colour, and the texel is recomposited from the
 *     ramp AS THE STROKE FOUND IT (`strokeBase`) every time: `mix(base, blend(base, paint),
 *     coverage × opacity)`. So crossing the same texel again inside one stroke builds toward the
 *     stroke's opacity and never past it — the image-editor rule that makes Opacity a ceiling and
 *     Flow the rate. Clone samples `strokeBase`, never `current`, so a stroke cannot copy its own
 *     paint and smear itself into a repeating pattern.
 *     @invariant A wash stroke never passes its opacity, however often it crosses a texel —
 *       proven by: npm run test:palette-paint ("three passes in one stroke stay at 50 %").
 *       Falsified 2026-09-24 by recompositing from `current` instead of the stroke base: red.
 *     @invariant Clone copies the ramp as the stroke found it — proven by: npm run
 *       test:palette-paint ("painting back over its source still copies j + 10"). Falsified
 *       2026-09-24 by sampling `current`: red.
 *   • BUILD-UP tools — Smudge, Soften, Sharpen, Tone. Each dab rewrites the texels in place, so
 *     passing again does more; holding still keeps working (`hold`, the host's airbrush tick) —
 *     except Smudge, which only moves colour when the brush moves.
 *
 * COLOUR. Paint's Mix is the Explorer's own blend-space vocabulary (`blendLerp`, ADR-0113) — so
 * Spectral is real pigment mixing and yellow over blue goes green. Blend modes follow image
 * editors: the separable ones per channel on sRGB, the colour ones (Hue, Chroma, Colour,
 * Lightness) in OkLCh rather than HSL, so "Colour" keeps the gradient's perceived lightness.
 * Soften, Sharpen, Smudge, Tone, Clone and Restore work in Oklab (rectangular), where a blend of two
 * colours has no hue detour.
 *
 * Pitfalls:
 *   • `blendLerp('spectral', …)` rounds to 8 bits through spectral.js's hex output. The wash
 *     tools recomposite from the stroke base, so that rounding never accumulates; a build-up
 *     tool must not route through Spectral for the same reason.
 *   • Coordinates are TEXEL units along the ramp, 0 … 256, texel i centred at i + 0.5. The host
 *     maps its pixels to that; a dab at c touches texels whose centres are within r + 0.5 of c.
 *   • Mirror paints a second dab at 256 − c; Clone's mirrored dab samples with the offset
 *     negated, so the mirrored copy is the mirror of the copy.
 *
 * @see docs/adr/0129-the-paint-face-paints-a-ramp.md
 * @see gradient-explorer/v2/paint/PaintFace.tsx (the face) · utils/gradientRamp.ts (the ramp form)
 */

import { blendLerp } from '../../utils/colorUtils';
import { rgbToOklab, oklabToRgb, type RGB } from './oklab';
import type { BlendColorSpace } from '../../types/graphics';

export const PAINT_TEXELS = 256;

export type PaintTool = 'paint' | 'smudge' | 'soften' | 'sharpen' | 'tone' | 'clone' | 'restore';

/** Brushes in the order the face shows them. Soften and Sharpen are two brushes, not one with a
 *  switch (owner, 2026-09-24). */
export const PAINT_TOOLS: readonly PaintTool[] = ['paint', 'smudge', 'soften', 'sharpen', 'tone', 'clone', 'restore'];

export type PaintBlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'softlight' | 'darken' | 'lighten' | 'difference' | 'add'
  | 'hue' | 'chroma' | 'color' | 'lightness';

/** The blend modes, in the order the chooser lists them — names only (the preview is the explanation). */
export const PAINT_BLEND_MODES: readonly { mode: PaintBlendMode; label: string }[] = [
  { mode: 'normal', label: 'Normal' },
  { mode: 'multiply', label: 'Multiply' },
  { mode: 'screen', label: 'Screen' },
  { mode: 'overlay', label: 'Overlay' },
  { mode: 'softlight', label: 'Soft light' },
  { mode: 'darken', label: 'Darken' },
  { mode: 'lighten', label: 'Lighten' },
  { mode: 'difference', label: 'Difference' },
  { mode: 'add', label: 'Add' },
  { mode: 'hue', label: 'Hue' },
  { mode: 'chroma', label: 'Chroma' },
  { mode: 'color', label: 'Colour' },
  { mode: 'lightness', label: 'Lightness' },
];

export interface PaintBrush {
  tool: PaintTool;
  /** Diameter as a percentage of the gradient, 0.5 … 100. */
  size: number;
  /** How much of the radius is at full weight before the shoulder, 0 … 1. */
  hardness: number;
  /** Dab spacing as a multiple of the diameter, 0.02 … 10 (owner, 2026-09-24: "a higher limit, like 1000%"). */
  spacing: number;
  /** Wash tools: the stroke's ceiling. */
  opacity: number;
  /** Wash tools: how much of what is left each dab adds. */
  flow: number;
  blend: PaintBlendMode;
  /** Paint's mix space — the Explorer's blend spaces (ADR-0113). */
  mix: BlendColorSpace;
  /** Paint: per-dab variation of the colour (lightness, chroma, hue), 0 … 1. */
  jitter: number;
  smudge: number;
  soften: number;
  sharpen: number;
  toneTarget: 'L' | 'C' | 'H';
  toneDir: 1 | -1;
  toneAmount: number;
  /** Clone: keep the brush → source distance from one stroke to the next. */
  aligned: boolean;
  mirror: boolean;
  wrap: boolean;
  /** Paint's colour, sRGB 0–255. */
  colour: RGB;
}

export const DEFAULT_BRUSH: PaintBrush = {
  tool: 'paint',
  size: 18,
  hardness: 0.35,
  spacing: 0.12,
  opacity: 0.9,
  flow: 0.45,
  blend: 'normal',
  mix: 'spectral',
  jitter: 0,
  smudge: 0.85,
  soften: 0.5,
  sharpen: 0.35,
  toneTarget: 'L',
  toneDir: 1,
  toneAmount: 0.45,
  aligned: true,
  mirror: false,
  wrap: false,
  colour: { r: 244, g: 196, b: 48 },
};

/** The brush setting the face's STRENGTH handle drives — "how strong" means this on each tool. */
export const strengthKey = (tool: PaintTool): 'opacity' | 'smudge' | 'soften' | 'sharpen' | 'toneAmount' =>
  tool === 'smudge' || tool === 'soften' || tool === 'sharpen' ? tool : tool === 'tone' ? 'toneAmount' : 'opacity';

/** Paint, Clone and Restore lay something down; the others rework what is there. */
export const isWashTool = (tool: PaintTool): boolean => tool === 'paint' || tool === 'clone' || tool === 'restore';

/** Only Paint lays down a colour of its own (the face shows the picker for it alone). */
export const usesColour = (tool: PaintTool): boolean => tool === 'paint';

/** Radius in texels for a diameter given in percent of the gradient. */
export const brushRadius = (size: number): number => Math.max(0.5, (size / 100) * PAINT_TEXELS * 0.5);

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const clamp255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);

/** The profile: full weight inside `hardness` of the radius, a smoothstep shoulder to the rim. */
const falloff = (d: number, h: number): number => {
  if (d >= 1) return 0;
  if (d <= h) return 1;
  const t = (d - h) / (1 - h);
  return 1 - t * t * (3 - 2 * t);
};

/**
 * A texel's weight at `dist` texels from a dab's centre. The rim is antialiased over one texel
 * (the `clamp` term), so a hard brush does not alias at 256 texels.
 */
export const brushWeight = (dist: number, r: number, hardness: number): number =>
  clamp(r + 0.5 - dist, 0, 1) * falloff(dist / (r + 0.5), hardness);

/** Distance between dabs, in texels. Smudge moves colour one texel at a time, whatever the setting. */
export const dabStep = (b: PaintBrush): number => (b.tool === 'smudge' ? 1 : Math.max(0.25, b.spacing * brushRadius(b.size) * 2));

// ── colour ────────────────────────────────────────────────────────────────────

const toLch = (c: RGB): [number, number, number] => {
  const { L, a, b } = rgbToOklab(c);
  return [L, Math.hypot(a, b), Math.atan2(b, a)];
};
const fromLch = (L: number, C: number, h: number): RGB => oklabToRgb({ L, a: C * Math.cos(h), b: C * Math.sin(h) });

const SEPARABLE: Partial<Record<PaintBlendMode, (b: number, s: number) => number>> = {
  normal: (_b, s) => s,
  multiply: (b, s) => b * s,
  screen: (b, s) => 1 - (1 - b) * (1 - s),
  overlay: (b, s) => (b < 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s)),
  softlight: (b, s) => {
    if (s <= 0.5) return b - (1 - 2 * s) * b * (1 - b);
    const d = b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b);
    return b + (2 * s - 1) * (d - b);
  },
  darken: (b, s) => Math.min(b, s),
  lighten: (b, s) => Math.max(b, s),
  difference: (b, s) => Math.abs(b - s),
  add: (b, s) => Math.min(1, b + s),
};

/** `source` blended onto `base` in `mode` — the colour a full-strength dab would leave. */
export const blendColours = (base: RGB, source: RGB, mode: PaintBlendMode): RGB => {
  const f = SEPARABLE[mode];
  if (f) return { r: f(base.r / 255, source.r / 255) * 255, g: f(base.g / 255, source.g / 255) * 255, b: f(base.b / 255, source.b / 255) * 255 };
  const B = toLch(base);
  const S = toLch(source);
  if (mode === 'hue') return fromLch(B[0], B[1], S[2]);
  if (mode === 'chroma') return fromLch(B[0], S[1], B[2]);
  if (mode === 'color') return fromLch(B[0], S[1], S[2]);
  return fromLch(S[0], B[1], B[2]); // lightness
};

const oklabMix = (a: RGB, b: RGB, t: number): RGB => blendLerp(a, b, t, 'oklab-rect');

// ── the session ───────────────────────────────────────────────────────────────

/** Where a dab of a mirrored or cloning stroke reads and writes. */
interface DabInstance {
  /** Clone: source = texel + offset. */
  offset: number;
  /** Smudge: the colours the brush carries, by texel offset from its centre. */
  carried: Map<number, RGB>;
  /** Smudge: the centre texel of the last dab — the carry only moves when this does. */
  centre: number;
}

interface Stroke {
  before: Float32Array;
  last: number;
  /** Distance travelled since the last dab. */
  travelled: number;
  pressure: number;
  touched: Set<number>;
  instances: DabInstance[];
  brush: PaintBrush;
}

/** A wash stroke, kept so a blend or mix chooser can show it again in another mode. */
interface LastWash {
  base: Float32Array;
  coverage: Float32Array;
  paint: Float32Array;
  opacity: number;
  tool: PaintTool;
}

export class PaintSession {
  /** The ramp as the face opened it — Restore paints this back. */
  readonly original: Float32Array;
  /** The ramp as painted so far. */
  current: Float32Array;
  /** Bumped on every change, so a host can redraw on a number instead of diffing texels. */
  version = 0;
  /** Clone's source, in texels, and the brush → source offset an Aligned clone keeps. */
  cloneSource = PAINT_TEXELS * 0.72;
  cloneOffset: number | null = null;

  private undoStack: Float32Array[] = [];
  private redoStack: Float32Array[] = [];
  private stroke: Stroke | null = null;
  private strokeBase: Float32Array;
  private coverage = new Float32Array(PAINT_TEXELS);
  private paint = new Float32Array(PAINT_TEXELS * 3);
  private last: LastWash | null = null;
  private readonly random: () => number;

  constructor(original: ArrayLike<RGB>, random: () => number = Math.random) {
    this.original = new Float32Array(PAINT_TEXELS * 3);
    for (let i = 0; i < PAINT_TEXELS; i++) {
      const c = original[Math.min(original.length - 1, i)];
      this.original[i * 3] = c.r;
      this.original[i * 3 + 1] = c.g;
      this.original[i * 3 + 2] = c.b;
    }
    this.current = this.original.slice();
    this.strokeBase = this.current;
    this.random = random;
  }

  get strokes(): number { return this.undoStack.length; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
  get painting(): boolean { return this.stroke !== null; }
  /** Anything to commit: the ramp differs from the one the face opened with. */
  get changed(): boolean { return !sameTexels(this.current, this.original); }

  texel(i: number, from: Float32Array = this.current): RGB {
    return { r: from[i * 3], g: from[i * 3 + 1], b: from[i * 3 + 2] };
  }

  /** The painted ramp, rounded and clamped — what the host encodes. */
  toRamp(from: Float32Array = this.current): RGB[] {
    const out: RGB[] = new Array(PAINT_TEXELS);
    for (let i = 0; i < PAINT_TEXELS; i++) out[i] = { r: Math.round(clamp255(from[i * 3])), g: Math.round(clamp255(from[i * 3 + 1])), b: Math.round(clamp255(from[i * 3 + 2])) };
    return out;
  }

  /** Linear sample between texel centres at `x` (texel units); wraps or clamps at the ends. */
  sample(from: Float32Array, x: number, wrap: boolean): RGB {
    const t = x - 0.5;
    const i = Math.floor(t);
    const f = t - i;
    const at = (k: number): number => (wrap ? ((k % PAINT_TEXELS) + PAINT_TEXELS) % PAINT_TEXELS : clamp(k, 0, PAINT_TEXELS - 1));
    const a = at(i) * 3;
    const b = at(i + 1) * 3;
    return { r: from[a] + (from[b] - from[a]) * f, g: from[a + 1] + (from[b + 1] - from[a + 1]) * f, b: from[a + 2] + (from[b + 2] - from[a + 2]) * f };
  }

  setCloneSource(x: number): void {
    this.cloneSource = clamp(x, 0, PAINT_TEXELS);
    this.cloneOffset = null;
  }

  /** The offset a clone stroke starting at `c` would use — what the face draws the source at. */
  cloneOffsetFor(c: number): number {
    return this.cloneOffset ?? this.cloneSource - c;
  }

  beginStroke(c: number, pressure: number, brush: PaintBrush): void {
    if (this.stroke) this.endStroke();
    this.strokeBase = this.current.slice();
    this.coverage.fill(0);
    this.paint.fill(0);
    if (brush.tool === 'clone' && (this.cloneOffset === null || !brush.aligned)) this.cloneOffset = this.cloneSource - c;
    const offset = brush.tool === 'clone' ? this.cloneOffset ?? 0 : 0;
    const centres = this.centres(c, brush);
    this.stroke = {
      before: this.current.slice(),
      last: c,
      travelled: 0,
      pressure,
      touched: new Set(),
      brush,
      instances: centres.map((cc, k) => {
        const inst: DabInstance = { offset: k === 0 ? offset : -offset, carried: new Map(), centre: Math.round(cc) };
        if (brush.tool === 'smudge') this.footprint(cc, brushRadius(brush.size), brush, (j, _w, i) => inst.carried.set(i - inst.centre, this.texel(j)));
        return inst;
      }),
    };
    if (brush.tool !== 'smudge') this.dab(c, pressure);
    this.flush();
  }

  /** Move the stroke to `c`, laying dabs every `dabStep` along the way. */
  strokeTo(c: number, pressure: number, brush?: PaintBrush): void {
    const s = this.stroke;
    if (!s) return;
    if (brush) s.brush = brush;
    const step = dabStep(s.brush);
    const dist = Math.abs(c - s.last);
    const dir = Math.sign(c - s.last);
    s.pressure = pressure;
    let rest = dist;
    let pos = s.last;
    while (s.travelled + rest >= step) {
      const adv = step - s.travelled;
      pos += dir * adv;
      rest -= adv;
      s.travelled = 0;
      this.dab(pos, pressure);
    }
    s.travelled += rest;
    s.last = c;
    this.flush();
  }

  /** The brush held still: the build-up tools keep working (an airbrush); Smudge does not. */
  hold(): void {
    const s = this.stroke;
    if (!s || s.brush.tool === 'smudge') return;
    this.dab(s.last, s.pressure);
    this.flush();
  }

  /** Close the stroke. True when it changed anything (and so became an undo step). */
  endStroke(): boolean {
    const s = this.stroke;
    if (!s) return false;
    this.stroke = null;
    if (sameTexels(this.current, s.before)) return false;
    this.undoStack.push(s.before);
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack.length = 0;
    this.last = isWashTool(s.brush.tool)
      ? { base: this.strokeBase.slice(), coverage: this.coverage.slice(), paint: this.paint.slice(), opacity: s.brush.opacity, tool: s.brush.tool }
      : null;
    return true;
  }

  undo(): boolean {
    if (this.stroke || !this.undoStack.length) return false;
    this.redoStack.push(this.current);
    this.current = this.undoStack.pop()!;
    this.last = null;
    this.version++;
    return true;
  }

  redo(): boolean {
    if (this.stroke || !this.redoStack.length) return false;
    this.undoStack.push(this.current);
    this.current = this.redoStack.pop()!;
    this.last = null;
    this.version++;
    return true;
  }

  /**
   * Show the LAST Paint stroke again in another blend mode or mix space — the chooser's hover
   * preview, and what choosing leaves behind (the stroke keeps the mode you chose it in). False
   * when there is no Paint stroke to show (undone, or another brush came after it).
   */
  recompositeLast(blend: PaintBlendMode, mix: BlendColorSpace): boolean {
    const w = this.last;
    if (!w || w.tool !== 'paint' || this.stroke) return false;
    for (let j = 0; j < PAINT_TEXELS; j++) {
      if (w.coverage[j] <= 0) continue;
      const base = this.texel(j, w.base);
      const out = blendLerp(base, blendColours(base, this.texel(j, w.paint), blend), w.coverage[j] * w.opacity, mix);
      this.write(j, out);
    }
    this.version++;
    return true;
  }

  // ── internals ───────────────────────────────────────────────────────────────

  private centres(c: number, b: PaintBrush): number[] {
    return b.mirror ? [c, PAINT_TEXELS - c] : [c];
  }

  private write(j: number, c: RGB): void {
    this.current[j * 3] = clamp255(c.r);
    this.current[j * 3 + 1] = clamp255(c.g);
    this.current[j * 3 + 2] = clamp255(c.b);
  }

  /** Every texel a dab at `c` reaches, with its weight and its unwrapped index. */
  private footprint(c: number, r: number, b: PaintBrush, fn: (j: number, w: number, i: number) => void): void {
    for (let i = Math.floor(c - r - 1); i <= Math.ceil(c + r + 1); i++) {
      const w = brushWeight(Math.abs(i + 0.5 - c), r, b.hardness);
      if (w <= 0) continue;
      let j = i;
      if (j < 0 || j >= PAINT_TEXELS) {
        if (!b.wrap) continue;
        j = ((j % PAINT_TEXELS) + PAINT_TEXELS) % PAINT_TEXELS;
      }
      fn(j, w, i);
    }
  }

  private jittered(b: PaintBrush): RGB {
    if (b.jitter <= 0) return b.colour;
    const [L, C, h] = toLch(b.colour);
    const j = b.jitter;
    const rnd = (): number => this.random() - 0.5;
    return fromLch(clamp(L + rnd() * 0.22 * j, 0, 1), Math.max(0, C * (1 + rnd() * 0.8 * j)), h + rnd() * 1.1 * j);
  }

  private dab(c: number, pressure: number): void {
    const s = this.stroke!;
    const b = s.brush;
    const r = brushRadius(b.size);
    const colour = b.tool === 'paint' ? this.jittered(b) : b.colour;
    const cs = this.centres(c, b);
    for (let k = 0; k < cs.length; k++) this.applyDab(cs[k], r, pressure, s.instances[k], colour, b);
  }

  private applyDab(c: number, r: number, p: number, inst: DabInstance, colour: RGB, b: PaintBrush): void {
    const s = this.stroke!;
    switch (b.tool) {
      case 'paint':
      case 'clone':
      case 'restore':
        this.footprint(c, r, b, (j, w) => {
          const add = w * b.flow * p;
          const old = this.coverage[j];
          const now = old + (1 - old) * add;
          if (now <= old) return;
          const src = b.tool === 'restore' ? this.texel(j, this.original) : b.tool === 'clone' ? this.sample(this.strokeBase, j + 0.5 + inst.offset, b.wrap) : colour;
          // the stroke's paint colour at this texel is the coverage-weighted mean of its dabs'
          const f = (now - old) / now;
          this.paint[j * 3] += (src.r - this.paint[j * 3]) * f;
          this.paint[j * 3 + 1] += (src.g - this.paint[j * 3 + 1]) * f;
          this.paint[j * 3 + 2] += (src.b - this.paint[j * 3 + 2]) * f;
          this.coverage[j] = now;
          s.touched.add(j);
        });
        return;
      case 'smudge': {
        const centre = Math.round(c);
        if (centre === inst.centre) return;
        inst.centre = centre;
        this.footprint(c, r, b, (j, w, i) => {
          const k = i - centre;
          const here = this.texel(j);
          const out = oklabMix(here, inst.carried.get(k) ?? here, w * b.smudge * p);
          this.write(j, out);
          inst.carried.set(k, out);
        });
        return;
      }
      case 'soften':
      case 'sharpen': {
        const lab = new Float32Array(PAINT_TEXELS * 3);
        for (let j = 0; j < PAINT_TEXELS; j++) {
          const o = rgbToOklab(this.texel(j));
          lab[j * 3] = o.L; lab[j * 3 + 1] = o.a; lab[j * 3 + 2] = o.b;
        }
        const kb = Math.max(1, Math.round(r * 0.22));
        this.footprint(c, r, b, (j, w) => {
          let L = 0, A = 0, B = 0, n = 0;
          for (let o = -kb; o <= kb; o++) {
            let q = j + o;
            if (q < 0 || q >= PAINT_TEXELS) q = b.wrap ? ((q % PAINT_TEXELS) + PAINT_TEXELS) % PAINT_TEXELS : clamp(q, 0, PAINT_TEXELS - 1);
            L += lab[q * 3]; A += lab[q * 3 + 1]; B += lab[q * 3 + 2]; n++;
          }
          // sharpen is an unsharp mask applied again on every dab, so it runs at a third of soften's rate
          const t = w * p * (b.tool === 'soften' ? 0.6 * b.soften : -0.2 * b.sharpen);
          const x = j * 3;
          // soften moves toward the neighbourhood mean; sharpen moves away from it (unsharp)
          this.write(j, oklabToRgb({ L: lab[x] + (L / n - lab[x]) * t, a: lab[x + 1] + (A / n - lab[x + 1]) * t, b: lab[x + 2] + (B / n - lab[x + 2]) * t }));
        });
        return;
      }
      case 'tone':
        this.footprint(c, r, b, (j, w) => {
          let [L, C, h] = toLch(this.texel(j));
          const t = w * b.toneAmount * p * b.toneDir;
          if (b.toneTarget === 'L') L = clamp(L + t * 0.035, 0, 1);
          else if (b.toneTarget === 'C') C = Math.max(0, C * (1 + t * 0.1));
          else h += t * 0.07;
          this.write(j, fromLch(L, C, h));
        });
        return;
    }
  }

  /** Recomposite what the wash tools touched since the last flush, and mark the change. */
  private flush(): void {
    const s = this.stroke;
    if (s && isWashTool(s.brush.tool)) {
      const b = s.brush;
      for (const j of s.touched) {
        const base = this.texel(j, this.strokeBase);
        const src = this.texel(j, this.paint);
        const top = b.tool === 'paint' ? blendColours(base, src, b.blend) : src;
        this.write(j, b.tool === 'paint' ? blendLerp(base, top, this.coverage[j] * b.opacity, b.mix) : oklabMix(base, top, this.coverage[j] * b.opacity));
      }
      s.touched.clear();
    }
    this.version++;
  }
}

const sameTexels = (a: Float32Array, b: Float32Array): boolean => {
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-4) return false;
  return true;
};
