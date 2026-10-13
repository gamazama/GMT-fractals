# GMT systems vs the deep zoomer - colour, formula, quality

Reader: colour-formula-quality. Read-only pass, 2026-10-07. Nothing was run.
`PAGE` = `H:/GMT/workspace-gmt/mandelbulb_deepzoom/index.html` (historical, frozen). All other paths
are relative to the worktree root. Line numbers are hints; grep the symbol.

Verdict words: AS-IS / ADAPTER / REWORK / NOT-NOW as defined in the brief.

---

## 1. Facts

### 1.1 What the deep kernel hands back per hit

- `PAGE`, `struct OrbitOut` (line ~377):
  `struct OrbitOut { Hdr3 d; vec2 Dr; vec2 Ddr; vec2 de; int iters; int rebases; bool escaped; float trap; float escR; };`
- The trap is the minimum SQUARED orbit length: `float z2 = dot(zf, zf); trap = min(trap, z2);`
  (`PAGE` ~line 610). The full orbit point `zf = cT0.xyz + dz` exists in f32 at every iteration,
  but only its squared length is kept.
- Bailout is fixed at radius 2: `if (z2 > 4.0) { escaped = true; escR2 = z2; break; }`.
- The kernel does NOT hand raw values to the shading pass. Pass G collapses them into one number,
  chosen by a mode uniform, in `paletteParam(OrbitOut co)` (`PAGE` ~785):
  - mode 1: `float mu = float(co.iters) + 1.0 - log(log(max(co.escR, 2.0001))) / log(uPower); return mu * 0.18;`
  - mode 2: `return log(max(co.trap, 1e-30)) * 1.5;`
  - mode 0: `return 0.0;` (constant colour)
- The G-buffer is ONE RGBA32F output on purpose: "ONE output, always: on ANGLE/Direct3D 11 a second
  output layout is a second, blocking compile of this whole shader (8.6 s measured)" (`PAGE` ~988).
  Its channels, as written at the hit: log depth (`lt`), `kind`, `sPal` (the palette number),
  `nPack` (octahedral normal, 12 bits per axis). Where the step count sits I did not confirm.
- The shading pass turns the number into a colour (`PAGE`, `palette` / `colorFromParam`, ~1085):
  `texture(uGradient, vec2(fract(s), 0.5)).rgb` with `s * uColorScale`. In the new-look path the
  gradient texel is used as-is: `vec3 c = palette(s * uColorScale); // used as it is, as GMT uses its gradient texels` (~1226).
- The page's own comment on depth: "min-|z| barely varies across a deep-zoom frame; log() spreads
  that compressed range back into visible, smooth contrast (the raw value gave one flat colour)".
  This is the central colour fact at depth: any value decided by the early iterations is the same
  for every pixel in the frame.
- Formula controls: power is an INTEGER 2..16 - `let nPower = 8; // integer Mandelbulb power (clamped [2,16])`,
  `nPower=Math.max(2,Math.min(16,n|0)); ... binomN=binomPad(nPower)` (binomial tables are rebuilt per
  power). Phase is two angles (`phaseTheta`, `phasePhi`, seen in `settings()` ~3909). No Julia mode:
  `grep -i julia` on the page returns nothing.
- Quality controls:
  - detail = `surfMul`, panel range `min:0.25,max:32` (~2426). It divides the pixel angle:
    `gl.uniform1f(x.pixAng, Math.tan(0.5*1.1)/H/surfMul)` and deepens bisection:
    `bisectMax + Math.max(0, Math.round(Math.log2(surfMul)))`.
  - reach = a 3-way preset over two numbers:
    `const REACH = [ { maxSteps: 256, farRelax: 0 }, { maxSteps: 512, farRelax: 1.7 }, { maxSteps: 1024, farRelax: 0 } ];`
  - step factor: `let stepRelax = 0; // PERF LEVER (0 = default 0.85): march step = relax·de` (a lever, not in the panel).
  - iterations rise with depth: `const rec = Math.min(160, 32 + Math.ceil(1.35 * Math.max(0, -Math.log10(smoothedDist))));`

### 1.2 GMT colouring (`engine-gmt/features/coloring/`)

- `MappingModes.ts`, `MAPPING_MODES`: 15 modes, each a GLSL snippet over exactly four inputs, stated
  in the file header: "`p (vec3 position), result (vec4: x=dist, y=trap, z=iter, w=decomp), n (vec3 normal)`"
  plus two globals (`g_orbitTrap`, `g_geomTrapFinal`). A mode does NOT declare which inputs it
  needs - the need is only visible by reading the GLSL string.
- `generateMappingShader()` emits `float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale)`
  with a `switch` over all 15.
- Where `result` comes from: `engine-gmt/shaders/chunks/de.ts`, `map()` -
  `return vec4(finalD, outTrap, colorIterNorm, decomp);` with
  `colorIterNorm = mix(smoothIter / max(1.0, uIterations), ...)` (iteration is NORMALISED by the
  iteration count), `decomp = atan(z.y, z.x) * INV_TAU + 0.5` captured when `r2 > uEscapeThresh`,
  `g_orbitTrap = min(g_orbitTrap, abs(vec4(z.xyz, r2)))`, and
  `float outTrap = useLLI ? lastLength : trap;` (mode 8 swaps the trap slot for the escape length).
- GMT's Mandelbulb trap is the minimum LENGTH, not squared: `engine-gmt/formulas/Mandelbulb.ts`,
  `trap = min(trap, length(z3));`.
- How a mode value becomes a colour (`engine-gmt/shaders/chunks/material_eval.ts`, layer 1):
  `float t1Raw = val1 * uColorScale + uColorOffset + gmt_colorSpiral(p_fractal, uColorTwist, uColorTwistArms);`
  `float t1 = pow(abs(fract(mod(t1Raw, 1.0))), uGradientBias);`
  `col1 = textureLod0(uGradientTexture, vec2(t1, 0.5)).rgb;`
  Layer 2 is the same with the `2` uniforms, then `blendColors(albedo, col2, uBlendOpacity, uBlendMode)`
  or, for blend mode 6, a normal bump.
- Twist (`engine-gmt/shaders/chunks/coloring.ts`, `gmt_colorSpiral`):
  `return arms * (atan(p.y, p.x) * INV_TAU) + twist * log(max(length(p), 1.0e-3));` - a function of
  absolute position about the world origin.
- The feature def (`coloring/index.ts`, `ColoringFeature`): params `gradient`, `mode`, `scale`,
  `offset`, `repeats`, `phase`, `bias`, `colorIter`, `twist`, `twistArms`, `escape`, the same set
  with `2`, `blendMode`, `blendOpacity`, five `layer3*` noise params, six `trap*` geometric-trap
  params. `mode` takes `options: mappingOptions` - a static list of all 15, not filtered by anything.
  `scale`/`offset`/`repeats`/`phase`/`bias` are `hidden: true` and driven by the `coloring-histogram`
  custom UI (registered in `engine-gmt/features/ui.tsx`, not opened). Its `inject` talks to GMT's
  `ShaderBuilder` only (`builder.addPreamble('vec4 g_orbitTrap = vec4(1e10);')` ...). One `condition`
  reaches into another feature: `{ param: '$texturing.active', bool: true }`.
- `colorIter` ("Stop orbit trap capture at this iteration", 0..24) freezes the trap after N
  iterations.

### 1.3 GMT formula system

- `engine-gmt/formulas/Mandelbulb.ts`, `parameters`:
  `{ label: 'Power', id: 'paramA', min: 2.0, max: 16.0, step: 0.001, default: 8.0 }`,
  `{ label: 'Phase (θ, φ)', id: 'vec2A', type: 'vec2', min: -6.28, max: 6.28, ... scale: 'pi' }`,
  `{ label: 'Z Twist', id: 'paramD', ... }`, `{ label: 'Radiolaria', id: 'vec2B', ... }`.
  Power is a continuous float in GMT (`pow(r, power - 1.0)`); the deep kernel takes whole numbers only.
- The formula already declares what it writes:
  `capabilities: new Set(['shape:per-iteration', 'iter:c-constant', 'render:writes-trap', 'render:writes-iter'] satisfies Capability[])`.
- `engine-gmt/types/capabilities.ts`: `Capability` is a closed union ("Adding a new token requires
  an ADR amendment (see ADR-0059)"); features declare `CapabilityRequirements`
  (`primary` / `secondary` / `pair` / `rejects`) and a reducer returns `'ok' | 'disabled' | 'partial'`
  with reasons. So the "panels adapt without a flag" machinery exists - for whole features. Nothing
  I read applies it to individual OPTIONS of an enum (e.g. one mapping mode).
- `engine-gmt/features/geometry/index.ts`: Julia (`juliaMode`, `juliaX/Y/Z`), pre / post / world
  rotation (`preRotX..`, `postRotX..`, `worldRotX..`, under `preRotEnabled`, `onUpdate: 'compile'`),
  burning mode, and the hybrid box-fold params seen in the Mandelbulb preset (`hybridMode`, ...).
  The file notes "no feature-level `requires`".

### 1.4 GMT quality (`engine-gmt/features/quality.ts`)

- `detail`: `label: 'Ray detail'`, `uniform: 'uDetail'`, `min: 0.1, max: 10.0`, default 1.
- `pixelThreshold`: `label: 'Pixel threshold'`, `min: 0.1, max: 2.0`, default 0.5 (the Mandelbulb
  preset sets 0.2).
- How they combine (`engine-gmt/shaders/chunks/de.ts` ~233):
  `float effDetail = uDetail / max(uInternalScale, 1.0e-4); float hitThresh = fp * (uPixelThreshold / max(effDetail, 1.0e-4));`
  - the hit threshold is (pixel footprint) x pixelThreshold / detail.
- `fudgeFactor`: `label: 'Step Size'`, `min: 0.01, max: 1.0`, default 1.
- `maxSteps`: `label: 'Max Ray Steps'`, `uniform: 'uMaxSteps'`, `min: 32`, default 300, capped by
  `compilerHardCap` (`label: 'Hard Loop Cap'`, `onUpdate: 'compile'`).
- Compile-time switches: `precisionMode` ('High (Desktop)' / 'Standard (Mobile)'),
  `bufferPrecision` ('Float32 (HDR)' / 'HalfFloat16'), `estimator`, `refineEnabled`.
- GMT-marcher-only numbers: `distanceMetric`, `deBailout`, `overstepTolerance`, `numDEeps`,
  `numDESmooth`, `mb3dDEsub`, `stepJitter`, `refineSteps`.
- Rule file `.claude/rules/gmt-features.md`: "ADR-0077 (Edge Polish and Step Relaxation were
  removed; do not bring them back)". The page's `farRelax` is a step relaxation. It must stay out of
  GMT's quality feature.

### 1.5 Texturing and weave, one line each

- `engine-gmt/features/texturing.ts`: an image replaces layer 1's gradient; its U and V are two
  mapping-mode values (`getTextureColor`: `getMappingValue(uTextureModeU, ...)`, `getMappingValue(uTextureModeV, ...)`).
- `engine-gmt/features/weave.ts`: a per-iteration schedule that interleaves up to 6 formulas, each
  with its own parameter bank (`ws<k>ParamA` ...); it has no meaning for a single-formula kernel.

### 1.6 What the blueprint already says (`plans/deep-zoom-shell/BLUEPRINT.md`)

A shell-private `dzColour` feature with `mode` = Plain / Iteration / Orbit trap, `useGradient`,
`gradient`; `dzQuality` with `detail` 0.25..32 log and `reach` Short / Relaxed / Full; `dzFormula`
with `power`, `phaseTheta`, `phasePhi`, `iterations`, `autoIterations`. It reuses the engine's
gradient editor and My Gradients shelf. It does not use GMT's mapping-mode numbers, scale/offset,
layers, or histogram.

---

## 2. Mapping modes against the deep kernel

"Today" = from `OrbitOut` + the normal already in the G-buffer, with only arithmetic in the port.

| GMT mode (value) | Needs | Deep kernel | What it takes |
|---|---|---|---|
| Orbit Trap (0) | min orbit length | today | `sqrt(trap)` (deep keeps the square), then GMT's `logTrap` |
| Orbit W (13) | min squared length | today | identical quantity: GMT's `g_orbitTrap.w` is `min r2`, deep's `trap` is `min z2` |
| Iterations (1) | smooth iteration / iteration count | today | the page's `mu`, divided by a FIXED count - not the auto count, or colours slide as iterations rise with depth |
| Raw Iterations (7) | integer iteration | today | `co.iters` |
| Potential (8) | escape length | today | `co.escR`; quality is limited because bailout is fixed at radius 2 |
| Normal (5) | surface normal | today | G-buffer normal, computed in the shading pass, costs nothing in pass G |
| Decomposition (6), Flow (9) | orbit angle at escape | one more value | `atan(zf.y, zf.x)` at the escape iteration (the kernel has `zf` there and throws it away) |
| Orbit X / Y / Z (10-12) | per-axis minimum | one more value | a `vec3` running `min(abs(zf))` next to `trap` |
| Geometric Orbit Trap (14) | distance of each orbit point to a shape | one more value + 4 uniforms | a second running minimum against point / sphere / cross / plane; `zf` is O(1) so f32 is enough |
| Radial (2), Z-Depth (3), Angle (4) | absolute position | cannot apply at depth | position varies by less than 1e-7 of itself across a deep frame; the mode is one flat colour below about 1e-6 |
| Twist / Arms (not a mode, added to every mode) | absolute position | cannot apply at depth | same reason |
| Color Iterations (`colorIter`) | trap frozen after N <= 24 iterations | cannot apply at depth | the first 24 iterations are identical for every pixel of a deep frame |
| Escape Radius (`escape`) | adjustable colour bailout | one more value | a uniform in place of the literal `4.0`; reference orbit must run to the same radius |

Six of fifteen modes work today, four more with three extra kernel values (escape angle, per-axis
trap, geometric trap), three plus twist never work at depth.

**The structural blocker is not the kernel, it is where the mapping happens.** GMT maps in the
shading stage from raw values, so two layers can use two modes and a mode change is free. The page
maps inside pass G and stores one number, so (a) switching mode re-marches the frame, (b) layer 2
cannot have a different mode unless it is Normal, (c) texturing (two values) cannot work. To be
driven by GMT's vocabulary the port's G-buffer has to carry raw values - at least trap and smooth
iteration, ideally escape angle - inside the single RGBA32F target (two values can share a float
the way the normal already does, 12 bits each; whether 12 bits of smooth iteration bands visibly is
untested).

**The second blocker is levelling.** At depth every useful value sits in a narrow band, so GMT's
`scale`/`offset` have to be re-fitted per view. In GMT that is the histogram's job. The shell needs
the same thing fed from the G-buffer.

---

## 3. Verdict table

| Sub-system | What it assumes today | Verdict | The rework, stated generically | Size | What GMT gains or risks |
|---|---|---|---|---|---|
| Gradient param type + gradient editor + ramp texture | a `type: 'gradient'` DDFS param becomes a strip texture sampled at `(t, 0.5)` | AS-IS | none; the page samples its strip the same way | 0 | nothing |
| Colour maths (scale, offset, gamma, wrap) | `pow(abs(fract(mod(v*scale+offset,1))), bias)` in GMT's `material_eval` chunk | ADAPTER | the port's shading pass uses the same expression and the same param names (`scale`, `offset`, `bias`, `repeats`, `phase`) so a GMT colouring block reads across | 0.5 session, renderer module | none - GMT untouched |
| Mapping modes: Orbit Trap, Orbit W, Iterations, Raw Iterations, Potential, Normal | `result` vec4 + `n` | ADAPTER | port computes GMT's values from `OrbitOut` (sqrt of trap, fixed-count normalise); shell's mode enum uses GMT's numbers 0,1,5,7,8,13 | 0.5 session | none |
| Mapping modes: Decomposition, Flow, Orbit X/Y/Z, Geometric trap | escape angle, per-axis minimum, shape distance | ADAPTER | three more outputs from the ported kernel; raw values in the G-buffer instead of one pre-mapped number | 1-2 sessions, renderer module; colour only, the accuracy referees are unaffected | none |
| Mapping-mode list itself (`MAPPING_MODES`, `mode` options) | every mode is always offered; what a mode needs is hidden in a GLSL string | REWORK | each mapping definition declares the inputs it reads (trap, iteration, escape angle, per-axis trap, shape trap, position, normal); the option list of a param can be narrowed by what the active renderer / formula says it provides. Options that are not provided are shown disabled with the reason, never removed and never rewritten in state | 1 session + an ADR-0059 amendment (new `render:writes-*` tokens) | GAIN: formulas that do not write an iteration count stop offering flat modes - today that is papered over inside mode 1 ("HYBRID FIX ... If we hit max iterations ... mix in Orbit Trap"). RISK: a saved scene holding a now-disabled mode must render exactly as before - the narrowing is display-only |
| `ColoringFeature` definition as a whole | one def mixes state shape, panel layout, and GMT shader injection; a condition reads `$texturing.active` | ADAPTER now, REWORK later | now: shell keeps its own `dzColour` but with GMT's param names, short ids and mode numbers. Later, if both apps should share one panel: split the def into (state + panel) and (shader injection) so a second renderer can mount the first half | now 0; later 1-2 sessions | later GAIN: one colouring panel for two renderers. RISK: the def is in every saved GMT scene; a split must not change ids or defaults |
| Histogram / auto-levels (`coloring-histogram`) | data comes from a GMT worker shader variant (`variant === 'Histogram'` in `ColoringFeature.inject`) | ADAPTER if the component takes data by props; REWORK if it reads GMT's worker directly | generic form: the histogram widget takes a data source (a function returning mapped values), not a renderer | 1 session either way | GAIN: any app can level a gradient. Component not opened - see unverified |
| Layer 2 + blend modes | a second mapping value per pixel | ADAPTER | follows from raw values in the G-buffer; Normal as layer 2 works before that | 0.5 session after the G-buffer change | none |
| Layer 2 blend "Bump (Normal)" | perturbs the shading normal | ADAPTER | shading pass only | 0.25 session | none |
| Layer 3 noise | `snoise` of absolute position | NOT-NOW | would need a position that is stable and fine at depth (e.g. relative to the fitted surface plane); otherwise the noise is flat or swims while flying | - | - |
| Twist / Arms | absolute position about the world origin | NOT-NOW | applies only above about 1e-6; a view-relative spiral would be a different control | - | - |
| Radial / Z-Depth / Angle modes | absolute position | NOT-NOW | same | - | - |
| Color Iterations | early-iteration trap | NOT-NOW | meaningful only at shallow depth | - | - |
| Colour normalisation v2 | not read | NOT-NOW | see unverified | - | - |
| Mandelbulb Power + Phase | float power 2..16 step 0.001; phase vec2 | ADAPTER | shell reads label / range / default from `Mandelbulb.parameters` (`paramA`, `vec2A`) and forces step 1 on power | 0.25 session | none. Note: a GMT scene at power 7.5 has no deep equivalent |
| Z Twist, Radiolaria | extra per-iteration operations | NOT-NOW | each needs its own perturbation form in the kernel; Radiolaria's `min()` is a fold and needs the rebase treatment | 1+ session each, kernel maths | - |
| Julia mode | `iter:c-constant` formulas accept a fixed c | NOT-NOW | kernel variant where the per-pixel difference enters the start value instead of c; a reference orbit per Julia constant | 1-2 sessions, kernel | - |
| Pre / post rotation, hybrids, burning, interlace | per-iteration operations compiled into GMT's loop | NOT-NOW | each is a new perturbation derivation | days each | - |
| World rotation | a rotation of the whole object | ADAPTER | rotate the camera frame in the shell instead of the object | 0.25 session | none |
| "This formula can deep zoom" | capabilities are a closed token set on `shader.capabilities`, reduced against features' `requires` | AS-IS for the shell; REWORK only when a second formula or GMT itself gets a deep kernel | a formula optionally declares a second kernel: which of its parameters that kernel honours and under what limits (e.g. power whole numbers only), and which outputs it writes. One new token names the property ("has an arbitrary-precision kernel"), not an app. Features keep using `requires` / `rejects`; no `if deep zoom` anywhere | 1 session + ADR amendment, when needed | GAIN: per-parameter limits become declarable for any formula. RISK: none until used |
| Quality: detail + pixel threshold | hit threshold = footprint x pixelThreshold / detail | ADAPTER | deep `detail` = GMT `detail / pixelThreshold`. GMT default (1 / 0.5) = deep 2; the Mandelbulb preset (1 / 0.2) = deep 5; deep's 0.25..32 covers it | 0 (a formula in the shell) | none |
| Quality: Step Size (`fudgeFactor`) | march step = factor x distance, 0.01..1 | ADAPTER | the port's `stepRelax` is the same number (page default 0.85); expose it under GMT's name | 0.25 session | none |
| Quality: Max Ray Steps | one integer, default 300 | ADAPTER | deep "reach" = max steps 256 / 512 / 1024 plus a far-stride number GMT has no word for. Keep reach as the shell's own control; do NOT add it to GMT's quality feature (ADR-0077 removed step relaxation there) | 0 | none |
| Quality: iterations | fixed count in `coreMath` | ADAPTER | shell-side auto rule (32 + 1.35 per decade, cap 160) as the blueprint has it | 0 | none |
| Quality: estimator, distance metric, DE bailout, DE scale / smoothing, overstep, DE sub, refinement | GMT marcher internals | NOT-NOW | the deep kernel has one estimator and always bisects | - | - |
| Quality: hard loop cap, ray precision, buffer precision (compile tiers) | GMT shader-compile switches | NOT-NOW | the deep kernel needs RGBA32F and has its own caps | - | - |
| `QualityFeature` definition | about 25 params + GMT shader injection | ADAPTER | shell's `dzQuality` borrows the three names that map; no reuse of the def | 0 | none |
| Texturing | two mapping values per pixel as U and V | NOT-NOW | possible once the G-buffer carries raw values | 0.5 session then | - |
| Weave | several formulas, one loop | NOT-NOW | needs more than one formula with a perturbation kernel | - | - |

---

## 4. The reworks, in order of weight

1. **Renderer module (not a GMT system): map in the shading pass, not in pass G.** Raw trap + smooth
   iteration (+ escape angle, per-axis trap) in the one RGBA32F target. Without this GMT's layers,
   texturing and histogram cannot drive the surface colour, and a mode change costs a re-march.
   1-2 sessions. The 8.6 s second-output compile rules out simply adding a target.
2. **Mapping definitions declare their inputs; option lists narrow by what the renderer provides.**
   The only change to a GMT system that this area needs. 1 session + ADR-0059 amendment. GMT gets
   honest mode menus for formulas that do not write iteration or trap.
3. **A levelling source for the histogram.** At depth the page itself says raw values are "one flat
   colour". Whoever owns the histogram widget should take data by function. 1 session.

Everything else is either shell arithmetic (quality names, power step) or does not apply to a
Mandelbulb-only kernel yet.

Recommended first build: keep the blueprint's `dzColour`, but give it GMT's mode numbers
(0, 1, 5, 7, 8, 13), GMT's `scale` / `offset` / `bias` names and GMT's colour expression. That costs
about one session, touches no GMT file, and keeps the door open for rework 2.

---

## 5. Unverified

- `coloring-histogram` component (`engine-gmt/features/ui.tsx`, `engine-gmt/panels.ts`): not opened.
  How it gets data, and how `repeats` / `phase` become `scale` / `offset`, is inferred from the
  `hidden: true` params and the `'Histogram'` shader variant only.
- `engine-gmt/engine/compat/evaluateCompat.ts`: not opened; behaviour taken from the JSDoc in
  `engine-gmt/types/capabilities.ts`. Whether any DDFS mechanism can disable a single enum option
  today: not checked - I saw none in the files read.
- Colour normalisation v2 (`colorNormV2`): not found in the files I opened; not assessed.
- Interlace, hybrid box-fold shader code, `geometry/transforms.ts`, `geometry/folds/`: not opened;
  verdicts rest on the param list in `geometry/index.ts` only.
- G-buffer channel layout: `lt`, `kind`, `sPal`, `nPack` read at the write site; the step-count
  channel and the exact channel order not confirmed.
- `co.escR` is used as a radius in `paletteParam`; that it is `sqrt(escR2)` was not traced.
- Whether 12-bit packing of smooth iteration is enough to avoid banding: untested.
- The page computes the pixel angle as `Math.tan(0.5*1.1)/H` (1.1 rad = 63.0 degrees), which does
  not match the 34.1 degrees vertical stated in the brief. Not my area - flag for the navigation
  reader.
- `deep-zoom/renderer/` (the port): not read; everything about the kernel is from the frozen page.
- Julia / Z Twist / Radiolaria kernel sizes are estimates, not derivations.
