# ADR-0122: The 256-texel ramp is the gradient; stops are an optional authoring layer

- **Status:** Accepted
- **Date:** 2026-09-14
- **Relates to:** ADR-0111 (the Working pipeline's input slot — refined, not superseded: stops
  still pass through verbatim under the identity pipeline); ADR-0117 (one sort per render).
  Plan: `plans/gradient-ramp-backbone.md`. Code: `utils/gradientRamp.ts` (the codec and the one
  reader), `utils/colorUtils.ts` (`renderGradientToRamp`, `generateGradientTextureBuffer`),
  `palette/core/stopFit.ts` (`rampToGradientConfig`, `STOP_LAYER_CAP`), `types/graphics.ts` +
  `engine-gmt/types/graphics.ts` (`GradientConfig.ramp`).
  Guard: `npm run test:palette-gradientramp`.

## Context

A `GradientConfig` could only be a list of stops. Every gradient that arrived as samples — the
10,832 catalogue ramps, `.map` / `.ggr` imports, img2grad, the working pipeline's own output —
was FITTED to stops before anything could use it. The fitter is good on gradients a person would
author, and it is the wrong tool for the rest:

- A dense ramp does not become stops, it becomes noise. Fitted at the catalogue seam (ΔE 0.02,
  128-stop cap), 31% of the Softology pack needs more than 96 stops and 47% more than 64; every
  other pack is under 1%.
- It can fail outright. `8ZEBBOW2` (black on every other texel) fitted to 126 black stops: 254
  corner seeds overflowed the budget, the even subsample strode exactly 2 texels, every pick
  landed on the black phase and the budget was gone before the refine could run. BW1, jack's00
  and Cca2 fail the same way.
- The failure propagated: the Curves face fits its keys from the pipeline's BASE, which was the
  render of that fit, so Curves drew black too — although Curves fits the real 256 texels of
  8ZEBBOW2 to within ΔE 0.002 when it is given them.

Meanwhile nothing that DRAWS a gradient needs stops. Every render path already bakes a 256×1
RGBA8 texture (`generateGradientTextureBuffer`) and no shader sees a stop; Adjust, Curves, Mix
and all 21 export formats already run on the 256-step ramp. Stops were load-bearing only for
editing them, for identity (dedupe signatures, export credits, the GX Global catalogue check),
and for persistence — the parts that store or compare them.

## Decision

1. **The ramp is the backbone.** Every consumer reads a gradient through ONE function,
   `renderGradientToRamp(config, colorSpace?)` (display ramps: `gradientDisplayRamp`), never by
   walking `config.stops` itself.
2. **A config is exactly one of two forms.**
   - `stops.length > 0` — a STOP gradient. Its ramp is the render of its stops. It carries no
     `ramp` field; one left over from a spread is ignored (stops win) and stripped at the
     persistence boundaries by `normalizeGradientConfig`.
   - `stops: []` + `ramp` — a RAMP gradient. `ramp` is base64 of 768 bytes: 256 sRGB texels,
     R G B, texel 0 first. `blendSpace` is inert on it; `colorSpace` applies exactly as it does to
     stops (at texture-build time).
   The empty marker is `[]`, never a sentinel string: the favourites loader keeps an entry whose
   stops are `[]` (`Array.isArray`, and `every` on an empty list passes) but drops one whose
   `stops` is not an array, so a tab still running an older build would DELETE a sentinel-marked
   favourite on its next save, where it merely draws a `[]` one wrong.
3. **Stops are an optional addition, created automatically only when cheap.** A ramp is turned
   into a config by `rampToGradientConfig(ramp, opts)`: it fits, and keeps the stops only if the
   fit finished under tolerance within `STOP_LAYER_CAP` (48) stops — otherwise it keeps the ramp.
   48, not the 96 first discussed: the owner (2026-09-14) — past a few dozen, stops are not an
   authoring aid, they are noise, and they cost: every stop edit, drag and preview re-samples the
   list per texel, and a dense list is where the editor lag lives. Measured at the catalogue
   seam, 57% of Softology needs more than 48 stops; core 0.9%, cpt-city 1.5%.
   "Under tolerance" is MEASURED on the render of the fit, not inferred from the fit stopping
   short of its budget (it can stop short and still miss). Stops are kept when at most `FAITHFUL_MISS_TEXELS` (4) texels miss by more than
   `max(0.05, 2.5 × targetDE)` — 355 catalogue fits miss 1–4 edge texels and stay stops; 161 miss
   5 or more and become ramps. With both rules, 2,145 of 11,131 catalogue entries pick as ramps.
   The cap applies to AUTOMATIC fits of a gradient that had no stops. A gradient that already has
   stops (the user added them, or they came authored) keeps a stop layer through pipeline edits,
   re-fitted at the Detail budget as before. "Add stops" on a ramp gradient is an explicit action
   and is not capped.
4. **Persistence writes the ramp only where there are no stops.** A stop gradient's saved form
   is byte-identical to before this ADR, so old tabs, share links, scenes and the backend see
   nothing new for it. The cost, accepted: a stop gradient's ramp is re-rendered on load, so a
   renderer change re-colours saved stop gradients — which was already true.
5. **Identity follows the form.** A ramp gradient's signature is its ramp string; a stop
   gradient's stays its stops. (Hashing every gradient's RENDER was considered and rejected for
   now: the GX Global check has a hand-mirrored server canonicaliser in Deno, and it would have to
   port the whole sampler and all six blend spaces to compute a stop gradient's render.)

## Consequences

- `generateGradientTextureBuffer` and `getGradientCssString` gained the ramp branch; before it,
  a config with no stops rendered black (texture) or black→white (preview).
- Every load boundary that required ≥ 2 stops had to learn the ramp form, or it would silently
  drop ramp gradients: `coerceGradientConfig`, `isWellFormedFavient`, `readFavientDrag`,
  `coerceInput`, the session and share-URL decoders, the GX Global parser and the backend's
  `gx-gradients/validate.ts` (deployed before the client).
- The stop editor gained a ramp mode: the bar paints the ramp, no knots, and an "Add stops"
  action. The blend-space chooser and the palette row's Stops layout have nothing to act on
  there.
- Catalogue signatures for ramp entries no longer depend on the fitter; fitted entries still do,
  so a fitter change still means a re-bake for those.
- A ramp is 1,024 characters. A 500-favourite shelf of ramps is ~0.5 MB of the ~5 MB
  localStorage budget; stop gradients cost what they did.
