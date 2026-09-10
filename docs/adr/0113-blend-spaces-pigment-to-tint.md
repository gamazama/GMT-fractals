# ADR-0113: Blend spaces span pigment→tint, and polar modes gamut-map by chroma

- **Status:** Accepted
- **Date:** 2026-09-10
- **Relates to:** `utils/colorUtils.ts` (grep `blendLerp`, `BLEND_SPACE_ORDER`), `types/graphics.ts` (grep `BlendColorSpace`), `palette/core/editorConfig.ts` (grep `BLEND_SPACES`), `components/AdvancedGradientEditor.tsx` (grep `BlendSpacePicker`)

## Context

Gradient Explorer blended in three spaces — `rgb`, `hsv`, and `oklab` — where `oklab` was
in fact **polar OkLCh**. The owner asked for pigment mixing and a CIE-Lab-family mode, and
a research pass on 2026-09-10 measured the candidates rather than reasoning about them.
Three things came out of that pass, each of which forced a decision.

**1. The existing polar mode was wrong twice over.** `lerpOklab` converted back to sRGB
with `oklabToRgb`, which clamps each linear channel independently. A chroma-preserving
polar blend deliberately bows *out* of gamut, so it hit that clamp constantly — and
per-channel clamping shifts HUE, which is precisely what the polar path exists to protect.
Measured: `#0000FF`→`#FFFF00` at t=0.25 produced `#008DF8` where the hue-preserving answer
is `#0087AC`, **25.8° of drift**, with 13–25° on every other pair tested.

It also branched on `chroma < 0.005` to a rectangular lerp, so two indistinguishable greys
landed in different worlds: `#827E7E`→`#BFA765` and `#847C7C`→`#D7996F` against the same
target, ~24/255 apart.

**2. RYB was researched and rejected.** Gossett–Chen RYB is a hand-fitted cube whose gamut
is much smaller than sRGB: only **32.3%** of the sRGB cube round-trips within 4/255, worst
channel error **128/255**, and `#0000FF` returns as `#2F5997`. Making it safe for an editor
needs endpoint anchoring with a cubic falloff — real work in service of an approximation.
spectral.js models the same phenomenon with Kubelka–Munk across 38 bands, is MIT, needs no
gamut correction (a mix at full concentration *is* the endpoint), and reaches a deeper
green (`#398F54` vs RYB's `#85B17D`). Mixbox looks better than both and is CC BY-NC, which
is incompatible with this project's monetization path.

**3. Six modes break a cycle control.** Blend space was click-to-cycle. Tolerable at three,
a guessing game at six.

## Decision

**Six blend spaces, ordered by how a mode's midpoint departs from the perceptual straight
line.** `BLEND_SPACE_ORDER` is that axis, measured, not alphabetical or historical
(chroma at midpoint relative to a straight lerp; lightness delta):

| | chroma | lightness | |
|---|---|---|---|
| `spectral` | 0.45 | −9.01 | pigment: darker, duller |
| `rgb` | 0.45 | −5.94 | |
| `oklab-rect` | 0.45 | **0.00** | the straight line itself |
| `oklab` (polar OkLCh) | 0.86 | +0.00 | |
| `cielch` | 0.97 | +0.78 | |
| `hsv` | 1.22 | +9.15 | tint: lighter, more saturated |

`oklab-rect` sits at the centre because its bow is *exactly* zero, not approximately —
verified to 2.9e-8 for every pair whose straight line stays in sRGB. That makes the
ordering a property of the maths rather than a matter of taste.

**Polar modes gamut-map by walking chroma down at constant L and h**, never by clamping
channels. Hue is the thing a polar blend promises; chroma is what it spends to keep it.

**The polar→rectangular transition is a chroma-weighted fade, not a threshold.** Hue is
genuinely undefined on the achromatic axis, so every hard rule merely relocates the cliff —
including CSS Color 4's bare "powerless hue" rule, which moves it to exactly 0 where
`#808080` and `#817F7F` still differ by 24/255. Smoothstepping the two paths over
`HUE_FADE` of chroma removes it. The threshold is passed explicitly per space because CIE
Lab's chroma scale is ~360× Oklab's.

**`oklab` keeps its wire value and gains the label "OkLCh"; the new rectangular mode takes
the key `oklab-rect` and the label "Oklab".** The key/label mismatch is deliberate: `oklab`
is the stored value in every saved gradient, share URL and preset, and renaming it would
silently reset them all through `coerceGradientConfig`'s fallback.

**Chooser labels carry no descriptors** — no "(perceptual)", "(standard)", "(short path)"
(owner, 2026-09-10). **The picker opens on click and previews on hover**, re-rendering the
editor's own strip in the hovered mode without emitting. The preview is the explanation, so
a one-word claim beside it is both redundant and arguable.

**The options open into the gap beside the trigger, and the trigger does not move.** The
first build expanded in place; the chip the pointer was already over became a mode chip and
the opening gesture committed a mode by itself — caught in the browser, it silently
switched a gradient to Spectral.

## Consequences

- **No shader and no export work.** All blending is CPU-side through `renderStopsToRamp`,
  and all fifteen export formats consume the baked 256-texel ramp rather than the stops, so
  a new mode is invisible to them. `shareUrl.ts` passes `blendSpace` through as an opaque
  string.
- **Gradients saved before this date look different**, wherever a polar blend left gamut.
  That is the point — they were rendering a hue nobody chose — but it is a visible change
  to existing work, not a silent no-op.
- **`spectral` costs ~1.2 ms per 256-texel segment** against ~microseconds for the others,
  even with spectral `Color` objects memoised on packed RGB (which is itself worth 3×).
  Only gradients that select it pay. If the wall ever shows many spectral gradients at
  once this needs a ramp-level cache, not a faster mix.
- **One runtime dependency added**: spectral.js 3.0.0 (MIT), ~32 KB unminified, declared in
  `types/spectral.d.ts` for only the surface we call.
- **Adding a mode now touches five places**, and `BLEND_SPACES` in
  `palette/core/editorConfig.ts` is the dangerous one: `coerceGradientConfig` falls back
  rather than throwing, so a mode missing there works in the editor and then silently
  resets every gradient saved in it. `npm run test:palette-blendspaces` asserts the
  coverage, restating the union by hand so the check cannot go tautological.
- **RYB is decided against, not deferred.** Revisiting it means overturning the gamut
  numbers above, not just re-litigating taste.
