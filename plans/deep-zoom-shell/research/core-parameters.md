# core-parameters — the deep-zoom page's parameter inventory, ready for DDFS

Source read: `H:/GMT/workspace-gmt/mandelbulb_deepzoom/index.html` (branch kernel-perf). Line numbers
are hints only; every row names the symbol to grep. The vendored copy at
`public/deep-zoom-core/index.html` in the worktree was NOT diffed against it (see Unverified).

---

## 1. Verified facts

### 1.1 Three invalidation flags, and only three

Every setter in the page ends by raising one of these (grep `let orbitDirty`, `let accumReset`):

| flag | meaning | cost |
|---|---|---|
| `orbitDirty = true` | rebuild the BigInt reference orbit (+ BLA table) at the camera | heavy at depth (about `cam.iters` BigInt evals); also forces `accumReset` |
| `accumReset = true` | restart the 64-sample progressive still (`ACCUM_MAX=64`, `IDLE_HOLD=10`) | cheap; picture goes back to 1 sample |
| shader variant compile | only BLA: `ensureVariant(true,false)` blocks for seconds when BLA is forced `on`; `kickBlaAsync()` compiles in the background for `auto` | one-time |

```js
// frame(), grep "rebuild reference orbit AT the camera"
if (deepActive && (orbitDirty || forceRebuild || !curOrbit)) {
  curOrbit = buildRefOrbit(camHP, cam.iters + 2); uploadOrbit(curOrbit);
  orbitDirty = false; accumReset = true;
}
```

No other parameter recompiles a shader: normals mode, look mode, colour mode, reach, light mode are
all uniforms / branch selectors (verified from their setters — each only sets `accumReset`).

### 1.2 The setters are write-only; read-back is patchy

`window.__dz.settings()` (grep `settings: () =>`) returns exactly 12 values:

```js
settings: () => ({ detail: surfMul, reach: reachMode(), power: nPower, phase: [phaseTheta, phasePhi],
  color: colorMode, cscale: colorScale, light: lightMode, falloff: falloffMul, normals: normalMode,
  land: !!landMode, frame: frameLong, accum: accumEnabled, lookMode: look.mode }),
```

Other read paths that exist: `window.__look` (the live object, 28 fields), `window.__march` (live
object), `window.__cam` (live object: `iters`, `power`, `yaw`, `pitch`, `pos`, `baseSpeed`),
`window.__blaMode()`, `window.__getBlaTau()`, `window.__getGuide()`, `window.__power()`,
`window.__dz.telemetry()` (`iters`, `power`, `mode` = EFFECTIVE deep/f32, `bla` = EFFECTIVE flag).

NO getter at all for: `modeOverride` (the requested mode), `autoIters`, `view1to1`, `gateOn`,
`stepRelax`, `capRelax`, `kfSpacing`, `bisectMax`, `normalIters`, `bisectIters`, `guideK`, `guideR`,
`guideFirst`, and whether a custom gradient is loaded (`gradientTex`).

NO setter handle at all (panel-closure only): `autoIters`, `view1to1`, `cam.iters` (reachable only by
mutating `window.__cam.iters`, which does NOT raise `orbitDirty`).

### 1.3 Setter quirks a store binding must know

- `__setColor(m, s)` and `__setLight(m, f)` are two-in-one and skip a falsy second argument
  (`if(s) colorScale=s`). Harmless since both minimums are > 0, but the store must always send both.
- `__setNormalMode(m)` does NOT raise `accumReset` (the panel row and key N do). A store write through
  the handle leaves a stale accumulated still until something else resets it.
- `__setDiv(d)` does not raise `accumReset` either (harness handle; do not use).
- `__setPhase(th, ph)` is ABSOLUTE; the internal `setPhase(dθ, dφ)` used by keys is RELATIVE and wraps
  to [0, 2π). Argument order is (theta, phi) while the panel lists phi first.
- `__setSurf` clamps to 0.25..256 but the panel slider tops out at 32; key G can go to 256.
- `__setFrame` clamps only at min 2; panel range is 240..2560. The frame actually drawn is
  `min(deepActive ? frameLong : nativeLong, cap)` (grep `const longE =`) — the stored value is a
  request, not the result. Effective size comes back in `telemetry().frameW/frameH`.
- `stepRelax` stores `0` for "default"; the panel getter shows it as 0.85 (`g:()=>stepRelax>0?stepRelax:0.85`).
  Once a user touches the slider it can never return to the sentinel 0 (min is 0.85) — same result, different stored value.
- `__setReach(k)` writes two fields of `march`; `reachMode()` derives the enum back and returns 1
  ("relaxed") for any custom `__setMarch` combination it does not recognise.
- `__setLook(o)` is `Object.assign(look, o)` — partial patches work, no validation, no clamping.
- `__setBla(true|false|'auto')`; forcing `on` runs a BLOCKING compile if the variant is not built
  (the panel shows an overlay first via `showProg` + `setTimeout(finish, 30)`; the handle does not).

### 1.4 `window.__dz.getView()` / `setView()` carry 6 parameters with the camera

```js
getView: () => ({ cam: camHP.map(String), yaw, pitch, iters: cam.iters, power: nPower,
  phase: [phaseTheta, phasePhi], light: lightMode, falloff: falloffMul, color: colorMode,
  cscale: colorScale, surf: surfMul }),
```

So a bookmark / keyframe restores power, phase, iters, light mode, falloff, colour mode, palette
scale and detail — a `setView` is a second writer for 9 parameters the store will also own.
The path sampler `pathApplyCR` restores only `iters`, `power`, `phase` (not light/colour/detail).

---

## 2. The parameter table

Columns: **inval** = O (orbit rebuild), A (accumulation restart), C (shader compile), – (none).
**aud** = E everyday, A advanced, D developer-only lever. "panel" in the set column means the CTLS row's
closure is the only setter.

### 2.1 Rows that are in the CTLS panel (34 rows)

| # | current label | proposed label | type | range | step | default | page variable | set handle | read back | inval | aud |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | mode | Precision | enum `auto` / `deep` / `f32` | – | – | `auto` | `modeOverride` | `__setMode(m)` | none (telemetry.mode is the effective one) | O | A |
| 2 | frame px | Frame size | int px | 240..2560 | 40 | 320 | `frameLong` | `__setFrame(px)` | `__dz.settings().frame` | A | E |
| 3 | 1:1 view | Actual pixels | boolean | – | – | false | `view1to1` | panel only | none | A | A |
| 4 | iters | Iterations | int | 4..160 | 1 | 14 | `cam.iters` | panel only (or `__dz.setView({iters})`) | `__dz.telemetry().iters`, `__cam.iters` | O | E |
| 5 | auto-iters | Auto iterations | boolean | – | – | true | `autoIters` | panel only | none | – (then O when it raises iters) | E |
| 6 | BLA | BLA | enum `off` / `auto` / `on` | – | – | `auto` | `blaMode` (effective: `blaEnabled`) | `__setBla(true/false/'auto')` | `__blaMode()`; effective in `telemetry().bla` | O, C when `on` | A |
| 7 | gate | Accuracy check | boolean | – | – | true | `gateOn` | `__setGate(b)` | none | – | D |
| 8 | reach | Reach | enum short 0 / relaxed 1 / full 2 | – | – | 1 | `march.maxSteps`,`march.farRelax` | `__setReach(k)` | `__dz.settings().reach` | A | E |
| 9 | step relax | Step size | float × | 0.85..2 | 0.05 | 0 (shown 0.85) | `stepRelax` | `__setStepRelax(r)` | none | A | A |
| 10 | res cap | Resolution cap | int × | 1..8 | 1 | 1 | `capRelax` | `__setCapRelax(m)` | none | A | A (can hang the GPU — keep out of everyday) |
| 11 | power n | Power | int | 2..16 | 1 | 8 | `nPower` (+`cam.power`, `binomN`, `binomN1`) | `__setPower(n)` | `__power()`, settings().power | O | E |
| 12 | phase φ | Phase φ | float rad | 0..6.2832 | 0.02 | 0 | `phasePhi` | `__setPhase(th, ph)` | settings().phase[1] | O | E |
| 13 | phase θ | Phase θ | float rad | 0..6.2832 | 0.02 | 0 | `phaseTheta` | `__setPhase(th, ph)` | settings().phase[0] | O | E |
| 14 | normals | Normals | enum screen 0 / 3-tap 1 / 4-tap 2 / depth 3 | – | – | 2 | `normalMode` | `__setNormalMode(m)` (no A!) | settings().normals | A (panel/key) | A |
| 15 | hit landing | Hit landing | boolean | – | – | false (0) | `landMode` | `__setLand(b)` | settings().land | A | A |
| 16 | depth taps | Depth normal radius | enum 1 / 2 / 3 px | – | – | 1 | `look.nrmTap` | `__setLook({nrmTap})` | `__look.nrmTap` | A | A |
| 17 | colour | Colour mode | enum plain 0 / iter 1 / trap 2 | – | – | 0 | `colorMode` | `__setColor(m, s)` | settings().color | A | E |
| 18 | palette | Palette scale | float | 0.1..16 (keys: 0.05..20) | 0.1 | 1.0 | `colorScale` | `__setColor(m, s)` | settings().cscale | A | E |
| 19 | gradient (Load… / reset) | Gradient | action + texture | 256×1 RGBA | – | none (built-in cosine palette) | `gradientTex` | `__loadGradient(file)`, `__loadGradientFile()`, `__clearGradient()` | none | A; also flips colour mode 0→2 | E |
| 20 | detail | Detail | float | 0.25..32 (handle: ..256) | 0.25 | 1.0 | `surfMul` | `__setSurf(m)` | settings().detail | A | E |
| 21 | look | Shading | enum classic 0 / new 1 | – | – | 1 | `look.mode` | `__setLook({mode})` | settings().lookMode | A | E |
| 22 | lighting | Light type | enum direct 0 / lamp 1 / both 2 | – | – | 0 | `lightMode` | `__setLight(m, f)` | settings().light | A | E (classic look) |
| 23 | falloff | Lamp falloff | float | 0.5..32 (keys: 0.25..64) | 0.5 | 4.0 | `falloffMul` | `__setLight(m, f)` | settings().falloff | A | E (classic look) |
| 24 | key height | Key elevation | float ° | 5..85 | 1 | 40 | `look.keyElev` | `__setLook` | `__look` | A | E |
| 25 | key turn | Key rotation | float ° | −180..180 | 5 | 0 | `look.keyTurn` | `__setLook` | `__look` | A | E |
| 26 | light colour | Light tint | float | 0..1 | 0.05 | 0.5 | `look.tint` | `__setLook` | `__look` | A | E |
| 27 | shadows | Shadows | float | 0..1 | 0.05 | 1.0 | `look.shadow` | `__setLook` | `__look` | A | E |
| 28 | occlusion | Occlusion | float | 0..2 | 0.05 | 1.0 | `look.ao` | `__setLook` | `__look` | A | E |
| 29 | sky | Sky | float | 0..2 | 0.05 | 0.3 | `look.sky` | `__setLook` | `__look` | A | E |
| 30 | roughness | Roughness | float | 0.1..1 | 0.05 | 0.75 | `look.rough` | `__setLook` | `__look` | A | E |
| 31 | haze | Haze | float | 0..1 | 0.05 | 0.0 | `look.haze` | `__setLook` | `__look` | A | E |
| 32 | view | Channel | enum picture 0 / normals 2 / depth 3 / occl. 4 / light 5 (value 1 unused) | – | – | 0 | `look.view` | `__setLook` | `__look` | A | A |
| 33 | compare | Compare | enum off 0 / normals 1 / landing 2 | – | – | 0 | `look.compare` | `__setLook` | `__look` | A | D |
| 34 | kf spacing | Keyframe spacing | float × | 0.3..5 (handle min 0.2) | 0.1 | 1.5 | `kfSpacing` | `__setKfSpacing(v)` | none | – | A (belongs to recording, not the still) |

### 2.2 Parameters with NO panel row (handle or key only)

| # | name | proposed label | type | range | default | page variable | set handle | read back | inval | aud |
|---|---|---|---|---|---|---|---|---|---|---|
| 35 | progressive still | Accumulate | boolean | – | true | `accumEnabled` | `__setAccum(b)` | settings().accum | A | A |
| 36 | compare divider | (pointer-driven) | float 0..1 | – | 0.5 | `look.split` | `__setLook({split})` | `__look.split` | A | not a param — transient |
| 37 | look: AO radius | Occlusion radius | float | no panel range | 0.12 | `look.aoRadius` | `__setLook` | `__look` | A | A |
| 38 | look: shadow softness | Shadow softness | float | – | 0.05 | `look.soft` | `__setLook` | `__look` | A | A |
| 39 | look: shadow length | Shadow length | float | – | 0.6 | `look.shadowLen` | `__setLook` | `__look` | A | A |
| 40 | look: haze colour | Haze colour | rgb | – | [0.03,0.05,0.07] | `look.hazeCol` | `__setLook` | `__look` | A | A |
| 41 | look: key strength | Key | float | – | 3.0 | `look.key` | `__setLook` | `__look` | A | A |
| 42 | look: fill strength | Fill | float | – | 0.5 | `look.fill` | `__setLook` | `__look` | A | A |
| 43 | look: kicker strength | Kicker | float | – | 0.25 | `look.kick` | `__setLook` | `__look` | A | A |
| 44 | look: fill colour | Fill colour | rgb (linear) | – | [1.0,0.246,0.0] | `look.fillCol` | `__setLook` | `__look` | A | A |
| 45 | look: kicker colour | Kicker colour | rgb (linear) | – | [0.0,0.246,1.0] | `look.kickCol` | `__setLook` | `__look` | A | A |
| 46 | look: metallic | Metallic | float | – | 0.2 | `look.metal` | `__setLook` | `__look` | A | A |
| 47 | look: reflectivity | Reflectivity | float | – | 0.6 | `look.refl` | `__setLook` | `__look` | A | A |
| 48 | look: diffuse | Diffuse | float | – | 1.0 | `look.diffuse` | `__setLook` | `__look` | A | A |
| 49 | look: saturation | Saturation | float | – | 1.0 | `look.sat` | `__setLook` | `__look` | A | E |
| 50 | look: exposure | Exposure | float | – | 1.0 | `look.exposure` | `__setLook` | `__look` | A | E |
| 51 | look: key azimuth | Key azimuth | float ° | – | 152 | `look.keyAz` | `__setLook` | `__look` | A | A (keyTurn is the user-facing one) |
| 52 | look: fill azimuth | Fill azimuth | float ° | – | −40 | `look.fillAz` | `__setLook` | `__look` | A | A |
| 53 | look: fill elevation | Fill elevation | float ° | – | 21 | `look.fillElev` | `__setLook` | `__look` | A | A |
| 54 | march far span | – | float octaves | – | 6 | `march.farSpan` | `__setMarch(o)` | `__march` | A | D |
| 55 | march far start | – | float (× surface distance) | – | 8 | `march.farFromDist` | `__setMarch(o)` | `__march` | A | D |
| 56 | march max steps / far relax | – | int / float | – | 512 / 1.7 | `march.maxSteps`, `march.farRelax` | `__setMarch(o)` | `__march` | A | D (row 8 is the user-facing enum) |
| 57 | BLA tolerance | BLA tolerance | float | min 1e-9 | 1e-4 | `blaTau` | `__setBlaTau(t)` | `__getBlaTau()` | O | D (open owner call per memory) |
| 58 | guided start | – | boolean | – | true | `guideOn` | `__setGuide(b)` | `__getGuide()` | A | D |
| 59 | guide K | – | float | min 2 | 16 | `guideK` | `__setGuideK(k)` | none | A | D |
| 60 | guide radius | – | int | 1..3 | 1 | `guideR` | `__setGuideR(r)` | none | A | D |
| 61 | guide first-full count | – | int | min 1 | 1 | `guideFirst` | `__setGuideFirst(n)` | none | A | D |
| 62 | bisection cap | – | int | – | 12 | `bisectMax` | `__setBisect(n)` | none | – (handle sets no flag) | D |
| 63 | normal-tap iter cap | – | int | min 0 (0 = full) | 0 | `normalIters` | `__setNormalIters(n)` | none | A | D |
| 64 | bisection iter cap | – | int | min 0 (0 = full) | 0 | `bisectIters` | `__setBisectIters(n)` | none | A | D |
| 65 | force rebuild | – | boolean | – | false | `forceRebuild` | `__forceRebuild(b)` | none | O every frame | D (measurement) |
| 66 | input lock | – | boolean | – | false | `inputLocked` | `__lockInput(b)` | none | – | D (test harness; but the shell NEEDS it, see §4) |
| 67 | frame divisor | – | float | – | – | `frameLong` | `__setDiv(d)` | – | – | D (perf matrix; duplicates row 2) |
| 68 | fly speed | Fly speed | float | – | 0.06 | `cam.baseSpeed` | none (mutate `__cam.baseSpeed`) | `__cam.baseSpeed` | – | E (worth exposing; Shift = ×4 is hard-coded) |

Camera state (`camHP` 3×BigInt, `cam.yaw`, `cam.pitch`) is NOT a parameter row — it is the view, owned
by another reader's area (`__dz.getView/setView`, `__setCamHP`, `__moveAlong`).

---

## 3. Blueprint — features for the deep-zoom shell

Six DDFS features. Ids are prefixed so they cannot collide with app-gmt's `lighting`, `quality`, etc.
(CLAUDE.md: a duplicate id only warns in dev and throws in a production build.)

| feature id | panel | rows | notes |
|---|---|---|---|
| `dzFormula` | Formula | 11 power, 12 phaseφ, 13 phaseθ, 4 iterations, 5 autoIterations | all O-invalidating; the only group that changes the shape. Iterations is a "floor" when auto is on (see §4.1). |
| `dzQuality` | Quality | 2 frameSize, 20 detail, 8 reach, 14 normals, 16 depthNormalRadius, 15 hitLanding, 35 accumulate, 3 actualPixels; advanced section: 1 precision, 6 bla, 9 stepSize, 10 resolutionCap | resolutionCap needs a guard label with its number only ("1×..8×"); the watchdog warning goes in help text, not the label. |
| `dzLight` | Light | 21 shading; classic sub-block (shown when shading = classic): 22 lightType, 23 lampFalloff; new sub-block (shown when shading = new): 24 keyElevation, 25 keyRotation, 26 lightTint, 27 shadows, 28 occlusion, 29 sky, 30 roughness, 31 haze, 50 exposure, 49 saturation; advanced collapsible: 37–48, 51–53 | The page marks rows 24–31 "New look." in prose only; nothing in CTLS hides them under classic. The manifest's conditional sub-block should. |
| `dzColour` | Colour | 17 colourMode, 18 paletteScale, 19 gradient | gradient = the engine's gradient param (stops or 256-texel ramp, ADR-0122) pushed to the page as a 256×1 strip; see gap G4. |
| `dzInspect` | Inspect | 32 channel, 33 compare | Session-only: must NOT be saved in scenes/presets, must NOT be keyframed, must NOT enter undo. |
| `dzFlight` | Flight | 68 flySpeed, 34 keyframeSpacing | keyframeSpacing dies if the engine timeline replaces the page's recorder; keep it only while `__recordToggle` is the recorder. |

Rows that should NOT become features (test-harness / measurement levers) — reach them, if at all,
from a dev-only "Diagnostics" panel gated on a `?dev` flag, talking to the host interface directly
with no store state:

`7 gateOn` (keep as a HUD toggle, not a saved param), `54–56 __setMarch`, `57 blaTau` (until the owner
decides the tolerance), `58–61 guide*`, `62 bisectMax`, `63 normalIters`, `64 bisectIters`,
`65 forceRebuild`, `66 inputLocked`, `67 __setDiv`, `36 look.split`.

### 3.1 Param sketch a builder can paste and adjust

Shape follows the fields named in this brief (label / type / range / step / default); check the exact
`defineFeature` param schema in `engine/FeatureSystem.ts` before use — I did not open it (Unverified).

```ts
// deep-zoom/features/formula.ts  — values verified against index.html
export const dzFormulaParams = {
  power:          { label: 'Power',           type: 'int',     min: 2,  max: 16,     step: 1,    default: 8 },
  phaseTheta:     { label: 'Phase θ',         type: 'float',   min: 0,  max: 6.2832, step: 0.02, default: 0 },
  phasePhi:       { label: 'Phase φ',         type: 'float',   min: 0,  max: 6.2832, step: 0.02, default: 0 },
  iterations:     { label: 'Iterations',      type: 'int',     min: 4,  max: 160,    step: 1,    default: 14 },
  autoIterations: { label: 'Auto iterations', type: 'boolean', default: true },
};
// deep-zoom/features/quality.ts
export const dzQualityParams = {
  frameSize:  { label: 'Frame size', type: 'int',   min: 240,  max: 2560, step: 40,   default: 320 },
  detail:     { label: 'Detail',     type: 'float', min: 0.25, max: 32,   step: 0.25, default: 1 },
  reach:      { label: 'Reach',      type: 'enum',  options: [[0,'Short'],[1,'Relaxed'],[2,'Full']], default: 1 },
  normals:    { label: 'Normals',    type: 'enum',  options: [[0,'Screen'],[1,'3-tap'],[2,'4-tap'],[3,'Depth']], default: 2 },
  depthNormalRadius: { label: 'Depth normal radius', type: 'enum', options: [[1,'1'],[2,'2'],[3,'3']], default: 1 },
  hitLanding: { label: 'Hit landing',  type: 'boolean', default: false },
  accumulate: { label: 'Accumulate',   type: 'boolean', default: true },
  actualPixels:{ label: 'Actual pixels', type: 'boolean', default: false },
  precision:  { label: 'Precision', type: 'enum', options: [['auto','Auto'],['deep','Deep'],['f32','f32']], default: 'auto' },
  bla:        { label: 'BLA',       type: 'enum', options: [['off','Off'],['auto','Auto'],['on','On']], default: 'auto' },
  stepSize:   { label: 'Step size', type: 'float', min: 0.85, max: 2, step: 0.05, default: 0.85 },
  resolutionCap: { label: 'Resolution cap', type: 'int', min: 1, max: 8, step: 1, default: 1 },
};
```

### 3.2 One host interface, one push function per feature

Everything renderer-facing goes through one object so the iframe can later be swapped for
`createDeepZoom(canvas, options)`. Push whole feature slices; the page's setters are idempotent and
cheap, but ORBIT-invalidating ones must be diffed so a light slider does not rebuild the orbit.

```ts
export interface DeepZoomHost {
  // one call per feature; implementation diffs against last-pushed and calls only what changed
  applyFormula(p: { power: number; phaseTheta: number; phasePhi: number; iterations: number; autoIterations: boolean }): void;
  applyQuality(p: DzQuality): void;
  applyLight(p: DzLight): void;      // -> __setLook(patch) + __setLight(mode, falloff)
  applyColour(p: DzColour): void;    // -> __setColor(mode, scale) + gradient strip
  applyInspect(p: { channel: number; compare: number }): void;
  // the two-way half (see §4): the renderer reports values it changed by itself
  onSelfChange(cb: (patch: Partial<DzSelfChanged>) => void): () => void;
  readAll(): DzAllParams;            // full snapshot, for boot and for "adopt the page's state"
}
```

Mapping to today's handles (iframe implementation):

```ts
applyFormula: power -> __setPower(n); phase -> __setPhase(theta, phi)   // (theta, phi) order
              iterations -> __dz.setIters (MISSING, see §5); autoIterations -> __dz.setAutoIters (MISSING)
applyQuality: frameSize -> __setFrame; detail -> __setSurf; reach -> __setReach; hitLanding -> __setLand
              normals -> __setNormalMode(m) THEN __setLook({}) to force accumReset (handle forgets it)
              depthNormalRadius -> __setLook({nrmTap}); accumulate -> __setAccum; precision -> __setMode
              bla -> __setBla(v === 'auto' ? 'auto' : v === 'on'); stepSize -> __setStepRelax; resolutionCap -> __setCapRelax
              actualPixels -> MISSING handle
applyLight:   __setLook({mode,keyElev,keyTurn,tint,shadow,ao,sky,rough,haze,...}); __setLight(lightMode, falloffMul)
applyColour:  __setColor(colorMode, colorScale); gradient -> __loadGradient(File) today, __dz.setGradientStrip later
applyInspect: __setLook({view, compare})
```

---

## 4. Every way the page changes a parameter by itself (two-way-sync hazards)

Ordered by how badly each breaks a store that believes it owns the value.

### 4.1 Auto iterations ratchet up with depth — never down (grep `auto iteration budget`)

```js
if (autoIters && deepActive && smoothedDist > 0) {
  const rec = Math.min(160, 32 + Math.ceil(1.35 * Math.max(0, -Math.log10(smoothedDist))));
  if (rec > cam.iters) { cam.iters = rec; orbitDirty = true; }
}
```

Runs every frame. At 1e-77 `rec` = 32 + ceil(103.95) = 136. It only raises; flying back out leaves
iterations high. A store that re-pushes its own `iterations: 14` is overwritten again on the next
frame (a tug-of-war that rebuilds the orbit twice per frame). **Design answer:** the stored param is
`iterations` = the user's floor; the live value is telemetry (`telemetry().iters`), shown in the HUD
and next to the slider, never written back into the store. Keyframes/bookmarks keep carrying the
live value through the view (`getView().iters`), as they do now.

### 4.2 BLA auto flips the effective flag (grep `function updateBlaAuto`)

`blaMode` (the user's choice, 3-way) never changes by itself. `blaEnabled` flips on below 1e-13 and
off above 1e-12 once the background compile is ready, raising `orbitDirty`. Store owns `blaMode`
only; `telemetry().bla` is display-only. No hazard if those two are kept apart.

### 4.3 Loading a gradient switches colour mode plain → trap (grep `function uploadStrip`)

```js
accumReset = true;
if (colorMode === 0){ colorMode = 2; }       // give the gradient something to colour
```

Fires on `__loadGradient`, `__loadGradientFile`, and on drag-and-drop anywhere on the page
(`addEventListener('drop'`). The store's `colourMode` goes stale silently. **Design answer:** the
shell does the same thing in ITS setter (set gradient ⇒ if colourMode is plain, set trap, one undo
step), then pushes mode after the strip so the page's side effect is a no-op.

### 4.4 Path playback and export force `modeOverride = 'deep'`

Three sites: grep `modeOverride = 'deep'` (in `__playPath` near 3465, `__renderPath` near 3541, and
one more near 3848). Whether each restores the previous value afterwards is UNVERIFIED. The store's
`precision` can be stale after any playback/export.

### 4.5 Path playback / `setView` / `diveTo` write formula and look parameters

- `pathApplyCR` (every playback frame): `cam.iters`, `__setPower(p1.power)`, `__setPhase(...)`.
- `__dz.setView(v)`: iters, power, phase, lightMode, falloffMul, colorMode, colorScale, surfMul.
- So power / phase are effectively animated by the page's own path format. If the engine timeline
  takes over animation, the store must be the single writer and views must stop carrying these 8
  fields — or the shell must read them back after every `setView` and commit them as one undo step.

### 4.6 The page's own keys (grep `addEventListener('keydown'`) — 21 bindings that mutate parameters

| key | effect | param |
|---|---|---|
| `]` / `[` | iters ±1 (4..160) | iterations |
| I | toggle | autoIterations |
| N | cycle 0..3 | normals |
| P | cycle auto → deep → f32 | precision |
| R | cycle 360/540/720/1080/1440 (from 320 the first press lands on 360) | frameSize |
| `-` / `=` | power ∓1 | power |
| `,` / `.` | phase θ ∓0.06 (wraps) | phaseTheta |
| `;` / `'` | phase φ ∓0.06 (wraps) | phasePhi |
| C | cycle 0..2 | colourMode |
| 9 / 0 | ÷1.3 / ×1.3 (0.05..20) | paletteScale |
| F / G | ÷1.5 / ×1.5 (0.25..256) | detail |
| V | toggle | gate |
| L | cycle 0..2 | lightType |
| T / Y | ÷1.4 / ×1.4 (0.25..64) | lampFalloff |
| X | export 2560 px, 16 samples (deep only) | action |
| M | record toggle | action |
| ? | About panel (no-op when `EMBED`, via `openPanel`) | action |
| Esc | cancel export / stop playback / close About | action |

Plus held keys read from `keys[...]` each frame for flight (WASD etc., Shift = ×4) — another
reader's area. The handler is on the iframe's own `window`, so it fires whenever the iframe has
focus (it always does while flying: `canvas.requestPointerLock()` on click).

**Design answer:** these 21 parameter keys must move to the engine Shortcuts plugin and be silenced
in the page. `__lockInput(true)` is too blunt — it also kills flight keys and pointer lock
(`if (inputLocked) return;` is the first statement, and the canvas click handler checks it too).
Needs the additive `paramKeys` switch in §5.

### 4.7 Pointer-driven: compare divider

`addEventListener('mousemove', ...)` writes `look.split` and raises `accumReset` whenever
`look.compare` is non-zero and the pointer is not locked. Transient; never store it.

### 4.8 The page's own panel and 150 ms poll

`setInterval(()=>{ if(isOpen(ctlEl)) syncControls(); }, 150)` — the page already solves two-way sync
for its own panel by POLLING its getters. In embed mode `openPanel` returns early
(`if (EMBED) return;`), so the page's panel cannot open and is not a second writer. Verified.

### 4.9 Clamps that make the stored value differ from the applied one

`frameLong` (drawn = `min(frameLong, cap)`, cap shrinks at extreme zoom and scales with `capRelax`),
`__setSurf` 0.25..256, `__setPower` 2..16 with `n|0`, `__setGuideR` 1..3, `__setBlaTau` ≥ 1e-9,
`__setKfSpacing` ≥ 0.2 and falsy → 1.5. Keep DDFS ranges inside these so the clamp never fires.

---

## 5. Missing for a clean store-driven renderer — small additive handles

All additive on `window.__dz`; none changes an existing handle. Bump `__dz.version` to 2.

```js
// 1. one complete, flat snapshot — a getter for every setter
__dz.params = () => ({
  mode: modeOverride, frame: frameLong, view1to1, iters: cam.iters, autoIters,
  bla: blaMode, blaTau, gate: gateOn, reach: reachMode(), stepRelax, capRelax,
  power: nPower, phaseTheta, phasePhi, normals: normalMode, land: !!landMode,
  color: colorMode, cscale: colorScale, hasGradient: !!gradientTex, detail: surfMul,
  light: lightMode, falloff: falloffMul, accum: accumEnabled, kfSpacing,
  flySpeed: cam.baseSpeed, look: { ...look }, march: { ...march },
  guide: { on: guideOn, k: guideK, r: guideR, first: guideFirst },
  bisectMax, normalIters, bisectIters,
});

// 2. one patch setter with correct invalidation per key (fixes the __setNormalMode gap,
//    gives iters / autoIters / view1to1 / flySpeed the handles they lack)
__dz.setParams = (patch) => { /* per key: assign, clamp, raise orbitDirty or accumReset */ };

// 3. a change event for values the PAGE changed by itself (not echoes of setParams)
__dz.onChange = (cb) => { /* returns an unsubscribe */ };
//    fire with { key, value, cause } where cause is one of:
//    'autoIters' | 'gradientLoad' | 'key' | 'path' | 'setView' | 'export' | 'blaAuto'

// 4. silence parameter keys without killing flight
__dz.setParamKeys = (on) => { paramKeysOn = !!on; };   // gate the 21 bindings in §4.6 only

// 5. gradient as data, not a File, and without the colour-mode side effect
__dz.setGradientStrip = (rgba /* Uint8Array(w*4) */, w) => { /* uploadStrip minus the colorMode flip */ };
__dz.clearGradient = () => window.__clearGradient();

// 6. effective values, already half-present in telemetry(): add
//    frameCap (the `cap` in `const longE =`), blaReady (variant compiled), blaErr
```

Until those exist the interim is: poll. The page itself polls at 150 ms; the shell can call
`__dz.settings()` + `__dz.telemetry()` + read `__look` / `__march` / `__cam` / `__blaMode()` on the
telemetry tick it already has, and diff. That covers 11 of the self-changing values; it cannot see
`modeOverride`, `autoIters`, `gateOn`, `view1to1` (no getter) — for those four the shell must be the
only writer, which holds as long as the page's parameter keys are not reachable.

---

## 6. Gaps (engine-side, stated generically) and interim workarounds

- **G1 — A param whose live value is driven by the renderer.** DDFS assumes the store owns every
  value; "iterations" is a user floor plus a renderer-raised live value. Generic need: a param can
  declare a read-only *effective value* source shown beside the control. Interim: store the floor,
  render the live number from telemetry in a registered widget next to the slider.
- **G2 — Session-only params.** `dzInspect` (channel, compare) and the diagnostics must not enter
  saves, presets, undo or keyframes. Whether DDFS has a per-param or per-feature "transient" flag is
  UNVERIFIED (I did not open `engine/FeatureSystem.ts`). Interim: keep them out of DDFS — local state
  in a registered component — which is exactly the hand-rolled path the owner wants to avoid, so
  check for the flag first.
- **G3 — Invalidation class per param.** The engine's GMT path distinguishes uniform updates from
  recompiles; this renderer needs "orbit rebuild" vs "accumulation restart" vs "blocking compile"
  and a busy overlay for the last. Generic need: a param declares a cost class the shell can react
  to (debounce heavy ones during a drag, show progress for blocking ones). Interim: the host
  implementation debounces `power` / `phase` / `iterations` / `precision` / `bla` itself and shows
  its own overlay around `__setBla(true)`.
- **G4 — Gradient into an external renderer.** The engine gradient param is stops or a 256-texel
  ramp; the page takes a `File`. Interim: bake the ramp to a 256×1 PNG `File` in the host and call
  `__loadGradient(file)`, then immediately re-push colour mode to undo the page's plain → trap flip.
  Proper: `__dz.setGradientStrip` (§5.5).
- **G5 — External writers into the store.** Bookmark jump, path playback and gradient load change
  several features at once from outside the store. Generic need: an "adopt external state as one
  undo step" entry on the store. Whether one exists is UNVERIFIED. Interim: after `setView`, read
  back `__dz.settings()` and write the 8 fields through the normal setters inside one undo group.
- **G6 — Conditional sub-blocks keyed on another feature's enum** (classic vs new shading rows;
  depth-normal radius only when normals = depth, and `normals` lives in `dzQuality` while its
  dependent could sit in `dzLight`). The manifest has conditional sub-blocks per CLAUDE.md; whether
  the condition can read a different feature's param is UNVERIFIED. Interim: keep each dependent
  row in the same feature as its switch (done in §3).
- **G7 — Parameter keys inside an iframe.** The engine Shortcuts plugin cannot see keydown events
  that land in the iframe's window. Interim: forward keydown/keyup from the iframe to the parent
  (same-origin, so a listener can be attached from outside) and add `__dz.setParamKeys(false)`.
  Goes away with the module build.

---

## 7. Unverified

- `engine/FeatureSystem.ts` and the panel-manifest param schema were not opened — the param objects
  in §3.1 use the field names from the brief, not the engine's actual schema.
- `public/deep-zoom-core/index.html` (the vendored copy the worktree embeds) was not diffed against
  the source page read here; `deep-zoom/bridge.ts` says nothing fails at build time if it drifts.
- Whether `__playPath` / `__renderPath` / the third `modeOverride = 'deep'` site restore the previous
  mode afterwards.
- The body of the `drop` handler (assumed to call `__loadGradient`; only its first line was read).
- The exact `cap` formula behind `const longE =` (how `capRelax` and depth feed it).
- Shader-side meaning and safe ranges of the 17 `look` fields with no panel row (rows 37–53):
  defaults are verified, ranges are not — the page never gives them one.
- `README.md` / `HANDOFF.md` of mandelbulb_deepzoom were not opened; "about 100 `window.__` handles"
  was not counted. This file covers the 27 `__set*` handles plus the getters listed in §1.2.
- `gate` internals (`gate.relT`) and what the HUD shows from it.
