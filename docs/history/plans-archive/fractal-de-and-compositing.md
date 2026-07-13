# Distance Estimation colour + colour-method compositing (design)

**Status:** DESIGN / research — for discussion before code. Follows the depth-normalized
colour work in [fractal-colour-accumulation-redesign.md](fractal-colour-accumulation-redesign.md).
Target: fluid-toy as the artist tool, Gradient Explorer as the visualizer.

## Context
"Distance" / "Distance Estimate" is `colorMapping` index **10**, the Hubbard exterior DE
`d = ½·|z|·ln|z| / |dz|` (|dz| = dz/dc). v2 already computes it **in pixels** in log space
(`uLogPixelScale`) so it's scale-invariant at any zoom (the old `exp(aux.b)` overflowed f32),
mapped as `1 − exp(−DE_px)` into the cyclic gradient. The falloff constants are first-pass and
DE has no artist controls yet.

## Research findings (SOTA DE colouring)
DE is used three distinct ways; all reuse the same per-pixel `z`, `dz`:

1. **Edge / glow** (white filament on black): `clamp(DE_px/w,0,1)`, `tanh(DE_px/w)`, or our
   `1−exp(−DE_px/w)`. `w` = edge width in px; gamma `pow(·,rate)` shapes it (= Ultra Fractal's
   "DE slope"). [MROB], [Wikibooks demm], [IQ distancefractals].
2. **Banded distance** (contour rings): map **log(DE_px)** through the cyclic palette so rings
   stay even across scales (`k = cycles per distance-decade`). Linear DE bunches rings at the
   boundary; log fixes it. [MROB].
3. **Slope / normal-map lighting** — the highest-impact "make it beautiful" technique, shipped by
   every leading tool (Ultra Fractal Lighting transfer, FractalShades Blinn_lighting, Fractal
   Zoomer bump-map, Kalles/Fraktaler, Mandelbulber). **Analytic and free** for us (we already have
   complex `z` and `dz`): the complex `u = z/dz` is the gradient direction; treat `(Re u, Im u, 1)`
   as a surface normal and Lambert/Blinn shade it. [Chéritat], [FractalShades], [Syntopia].

### Normal-from-derivative lighting (port-ready GLSL)
```glsl
vec2 cdiv(vec2 a, vec2 b){ float d=dot(b,b); return vec2(a.x*b.x+a.y*b.y, a.y*b.x-a.x*b.y)/d; }
// z, dz complex; angle = light azimuth; h = elevation (~0.5..3, higher=flatter)
float slopeShade(vec2 z, vec2 dz, float angle, float h){
  vec2 u = normalize(cdiv(z, dz));            // gradient direction
  vec2 v = vec2(cos(angle), sin(angle));
  float t = (u.x*v.x + u.y*v.y + h) / (1.0 + h);
  return clamp(t, 0.0, 1.0);
}
// composite: finalColor = baseColor * (ambient + (1-ambient)*shade);
// optional specular (Blinn): + pow(max(t,0), shininess) * kSpec
```
Good defaults (from the references): azimuth 45°, height 1.5, strength 0.7, ambient 0.2.

Per-tool: every tool ships **DE-edge/band and DE-lighting as SEPARATE layers**, and the lighting
layer is the one users reach for to make images look sculpted.

## Recommendation (informed by the compositing direction below)
**Do NOT cram lighting into the DE scalar mode.** Split responsibilities:

- **DE colour mode (10)** stays a *base scalar*: edge **or** log-bands via a Linear↔Log toggle,
  plus the **Rate** gamma (reuse the Iterations knob) and optional **Fit-to-view**. Uses `|dz|`.
- **Slope lighting** becomes a **compositing LAYER that multiplies any base mode** (Iterations,
  DE, stripe, traps…), driven by the *direction* of `z/dz`. Controls: light azimuth, elevation,
  strength (mix flat↔lit), ambient, optional specular. This is the first instance of the
  compositing system below, and the single biggest visual upgrade.

## Compositing colour methods (user direction — artist tool)
Artists commonly **add/multiply different colouring methods together** (UF stacks transfer
layers; the DE-edge × DE-lighting combo is the canonical example). Today the pipeline is a single
`uColorMapping` → one scalar → gradient. The artist-tool target is a small **layer stack**: each
layer = {method, its own gradient/params, blend op (multiply / add / over / screen), opacity}.

Staging:
- **Now (high value, contained):** add the **slope-lighting multiply layer** as a toggle+params
  over the existing single base mode. Delivers the beauty win and proves the multiply-composite.
- **Later (fluid-toy artist tool):** generalize to an N-layer stack (base methods add/multiply),
  each with its own gradient. This is the bigger architecture — belongs with the fluid-toy port.

## Implementation notes (for the lighting layer)
- Lighting needs **complex dz** (direction), not just `|dz|` (aux.b stores log|dz| only). Add an
  `out vec2` (the `u = z/dz` normal, or raw dz) to `evalJulia`; `main()` computes `slopeShade`
  per-eval and multiplies `sColor` before accumulating (mean-pools cleanly under TSAA).
- New uniforms: `uLightEnabled, uLightAngle, uLightHeight, uLightStrength, uAmbient` (+ optional
  `uSpecular, uShininess`). Declare in `fractalKernel.ts` (bake only — not the dead display copy).
  Bind in both `FractalColorRenderer` + `FluidEngine`; add to both reset hashes.
- Lives in the shared kernel → both apps benefit. UI: GX fractal controls + fluid-toy palette
  feature (the artist tool gets the full surface).

## Sources
MROB Mu-Ency (Distance Estimator); Wikibooks Fractals/demm; IQ distancefractals + normalsSDF;
Chéritat (math.univ-toulouse.fr Mandelbrot, u=z/dz normal map); FractalShades DEM + Blinn_lighting;
Ultra Fractal Distance Estimator + DE slope + Lighting transfer; Fractal Zoomer (hrkalona);
Fraktaler-3 / Kalles Fraktaler (mathr); Syntopia (DE lighting & colouring).
