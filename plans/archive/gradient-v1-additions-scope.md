# Gradient v1 Additions — Implementation Scope

**Date:** 2026-06-06
**Status:** Scoping (code-grounded). Ready to break into execution streams.
**Source:** Decisions from [gradient-tech-competitive-research.md](gradient-tech-competitive-research.md).
**Scope:** Two additions accepted for v1:
1. ColorBox-style per-channel easing generator mode, in OKLCh.
2. Richer per-segment interpolation bases (monotone-cubic first; Catmull-Rom / B-spline if cheap).

All paths under `h:/GMT/workspace-gmt/dev/`.

---

## Feature 1 — ColorBox-in-OKLCh generator mode

### What it is
Generate a ramp by interpolating each channel **independently** from a start value to an end value,
each channel driven by its **own easing curve**. Lyft's ColorBox does this in HSV; **we do it in
OKLCh (L, C, h)** — strictly better perceptually, and it dovetails with our existing per-channel
generator thinking.

### Current code surface (what exists today)

**Generator config** — `palette/core/generatorPipeline.ts`. Two objects today, **no mode enum**:
- `SlotModifiers` (per-slot A/B, pre-mix): `hueRotate, chroma, contrast, reverse, repeats, phase, mirror`.
- `GeneratorParams` (post-mix global): `mixL, mixC, mixH, reverse, bands, repeats, phase, mirror,
  hueRotate, chroma, contrast, noise, noiseFreq, noiseL, noiseC, noiseH`.

**Pipeline entry** — single hardwired path:
```ts
buildGradientRamp(
  srcA: Channels, srcB: Channels,
  modsA: SlotModifiers, modsB: SlotModifiers,
  params: GeneratorParams,
  curves: Partial<Channels> | null,
  noiseSeed: number,
): BuildResult            // { ramp: RGB[256], base: Channels, final: Channels }
```
Stage order: decompose A+B to OKLCh → per-slot mods → mix per-channel → optional curve override →
global reverse → per-texel loop (t-remap, posterize, sample, contrast/chroma/hue, noise, clamp,
`oklabToRgb()`).

**OKLCh helpers** — `palette/core/oklab.ts`:
`rgbToOklab(c): Lab`, `oklabToRgb(lab): RGB`, `oklabToRgbSafe(lab): RGB` (gamut-safe chroma clip),
`lerpOklab(c1,c2,t): RGB` (polar). OKLCh decompose is inline:
`C = √(a²+b²)`, `h = atan2(b,a)`; recompose `{L, a:C·cos(h), b:C·sin(h)}` → `oklabToRgb`.

**Easing library** — ⚠️ **does not exist.** Only one stray function in the whole codebase:
`engine/math/Easing.ts → easeInOutQuad`. We must create the library.

**Mode selection / UI** — there is no generator-mode concept. `GeneratorStage.tsx` renders the one
pipeline; DDFS params are registered in `palette/features/paletteGenerator.ts`; mode lives in the
generator store/slice.

### Design
A ColorBox ramp is **not** a mix of two sources — it's a direct per-channel sweep. So it's a *parallel*
builder, not a branch deep inside `buildGradientRamp`.

New per-channel config (×3 for L, C, h):
```ts
interface ChannelSweep { start: number; end: number; easing: EasingName; }
interface ColorBoxParams { L: ChannelSweep; C: ChannelSweep; h: ChannelSweep; steps?: number; }
// h.start/end in degrees; respect shortest-vs-longest hue path (reuse our HSV-far convention)
```
New builder:
```ts
buildColorBoxRamp(params: ColorBoxParams): BuildResult
// for i in 0..255: t=i/255; L=lerp(L.start,L.end, ease(L.easing,t)); C=…; h=… (degrees)
//   recompose OKLCh→Lab→ oklabToRgbSafe()   // gamut-safe, preserves hue
```

### Integration steps
1. **Create `palette/core/easings.ts`** — the 25 named curves (easeIn/Out/InOut × Quad/Quart/Sine/
   Cubic/Expo/Quint/Circ/Back + linear), each `(t:number)=>number`, plus an `EasingName` union and a
   `getEasing(name)` lookup. (Pure, trivially unit-testable.)
2. **Add `buildColorBoxRamp()`** to `generatorPipeline.ts` (or a sibling `colorBoxPipeline.ts`),
   reusing `oklabToRgbSafe` for output. Return the same `BuildResult` shape so downstream
   (`stopFit.ts`, texture bake) is unchanged.
3. **Add a generator-mode field** (`generatorMode: 'mixed' | 'colorbox'`) to the generator slice;
   the build call site branches on it.
4. **Register the mode + ColorBox params** as DDFS params in `paletteGenerator.ts` so the UI is
   auto-generated; `GeneratorStage.tsx` shows the ColorBox controls when the mode is active.
5. **Tests** — unit-test `easings.ts` (monotonic where expected, endpoints exact); golden-ramp test
   for `buildColorBoxRamp` via `debug/test-palette-generator.mts`.

### Friction / risk
- **No easing library** — must build (small, isolated).
- **Hue path** — degrees + shortest/longest-path choice; reuse the existing HSV-far convention to stay
  consistent with the sampler.
- **Gamut** — use `oklabToRgbSafe` (not `oklabToRgb`) so high-chroma sweeps don't hue-shift on clamp.
- Low blast radius: it's an additive parallel builder; `BuildResult` contract unchanged.

---

## Feature 2 — Richer per-segment interpolation bases

### What it is
Extend `GradientStop.interpolation` beyond `linear|step|smooth|cubic` with **monotone-cubic**
(no-overshoot) and optionally **Catmull-Rom** / **B-spline**.

### Current code surface
**Type** — `types/graphics.ts`:
```ts
interface GradientStop {
  id: string; position: number; color: string;
  bias?: number; interpolation?: 'linear' | 'step' | 'smooth' | 'cubic';
}
```
**Consumer** — `utils/colorUtils.ts → sampleSorted()` (the canonical sampler, byte-identical to the
engine's `generateGradientTextureBuffer`). Per **segment** `(s1 → s2)`:
```ts
let t = (pos - s1.position) / (s2.position - s1.position);
if (bias≠0.5) t = applyBias(t, bias);
const mode = s1.interpolation || 'linear';
if (mode === 'step')              t = 0.0;                 // hold left
else if (mode==='smooth'||'cubic') t = t*t*(3 - 2*t);     // hermite smoothstep
raw = blendLerp(c1, c2, t, blendSpace);                   // blend in rgb|hsv|hsv-far|oklab
```
Interpolation **modulates the t-parameter**, then `blendLerp` interpolates the two colors in
`blendSpace`. **It only sees two stops (s1, s2).**

### Design — two tiers
**Tier A (easy, fits today's architecture): monotone-cubic.**
It's a **two-point** scheme (no overshoot by construction), so it operates on `t` exactly like the
current hermite case — add one branch. This is the headline win from the research (gamut-safety:
overshoot can push a perceptual ramp out of gamut). **Do this first.**

**Tier B (needs a refactor): Catmull-Rom / B-spline.**
These need **four control points** (segment ± neighbours), but `sampleSorted` only has `(s1, s2)`.
Options:
- (B1) Pass lookahead neighbours into the segment branch (`sorted[i-1 … i+2]`, clamp at ends) and do
  the 4-point spline on the **color values** (in `blendSpace`), not just on `t`. Cleanest, keeps
  per-sample sampling.
- (B2) Pre-expand the spline to a dense buffer once per ramp build — simpler math but not as clean for
  the shared sampler; avoid unless B1 proves messy.

**Recommendation:** ship Tier A in v1; do Tier B (via B1) only if it stays cheap.

### Integration steps
1. **Extend the union** in `types/graphics.ts`:
   `'linear' | 'step' | 'smooth' | 'cubic' | 'monotone'` (+ `'catmull' | 'bspline'` if doing Tier B).
2. **`sampleSorted()`** — add `monotone` branch (Tier A). For Tier B, refactor the segment loop to
   pass neighbours and spline on color values.
3. **Bake parity** — `generateGradientTextureBuffer()` must stay byte-identical to `sampleStops()`
   (they share the sampler; verify the comment-asserted invariant still holds).
4. **UI** — add the new modes to the per-stop interpolation picker in `AdvancedGradientEditor.tsx`.
5. **Tests** — extend the sampler/interlace golden tests; run `npm run test:interlace` (the sampler is
   in its blast radius) + `test:baseline`.

### Friction / risk
- **Export is lossy by design** — `palette/core/exportFormats.ts` bakes the 256-texel ramp and
  Douglas-Peucker-reduces to plain position+RGB stops; **interpolation mode is dropped** for .grd /
  .svg / .ai / .ggr. New modes round-trip **only** in GMT-native JSON (add an `interpolation` field
  there). This is acceptable (the baked ramp already captures the visual result) but worth a one-line
  note in the export UI so users aren't surprised.
- **Catmull-Rom overshoot** — ironically can overshoot (unlike monotone-cubic); if it pushes
  out-of-gamut, clamp via the same gamut-safe path. Another reason monotone-cubic is the priority.
- **Sampler is hot + shared** — it's the canonical path used by the engine texture bake; changes are
  gated by `test:interlace`. Keep the common-case (`linear`) branch first for perf.

---

## Suggested sequencing

| # | Item | Effort | Depends on | Gate |
|---|------|--------|-----------|------|
| 1 | `palette/core/easings.ts` (25 curves + lookup) | S | — | unit test |
| 2 | `buildColorBoxRamp()` in OKLCh + mode field + DDFS params + UI | M | (1) | `test-palette-generator.mts` |
| 3 | `monotone` interpolation (Tier A) + UI picker | S | — | `test:interlace`, `test:baseline` |
| 4 | Catmull-Rom / B-spline (Tier B, neighbour refactor) | M | (3) | `test:interlace` |
| 5 | JSON export `interpolation` field + export-UI lossy note | S | (3) | — |

Items 1–2 (ColorBox) and 3 (monotone) are independent and can run in parallel worktrees. Tier B (4)
is the only one carrying a sampler refactor; treat it as optional/stretch for v1.

---

## Open decisions for the user
- **Tier B in v1 or stretch?** Monotone-cubic alone delivers the research's headline benefit; Catmull-
  Rom/B-spline are nice-to-have and carry the only refactor. Default recommendation: monotone in v1,
  Tier B as stretch.
- **ColorBox hue-path default** — shortest path, or expose a per-channel "long way round" toggle for
  hue (we already have the HSV-far convention to reuse)?
- **Leonardo contrast-target export mode** — include now as a third generator mode, or defer? (Marked
  optional in the research doc.)
