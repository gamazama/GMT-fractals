# MB3D → GMT Lighting / Material / Colour Import — Mapping Spec

Status: DRAFT (research, read-only). Authority: VERIFIED items are read in MB3D
Pascal source and cross-checked against real `.m3p` bytes; INFERRED items are
derived but not byte-confirmed and need calibration against rendered refs.

Sibling specs: `plans/mb3d/camera-import-spec.md` (the pattern this mirrors),
ADR-0083, `engine-gmt/utils/mb3d/mapCamera.ts` (the reference module shape).

---

## 0. Problem statement (the gap this closes)

`parseMB3D.parseHeader` (`engine-gmt/utils/mb3d/parseMB3D.ts:213-244`) walks
`TMandHeader10` only through the camera / julia / DE scalars; its last reads are
`tilingOptions@428`, `m3dVersion@424`, `zStepDiv@182`. It **never touches the
`Light: TLightingParas9` block at header offset 432** (408 bytes, `432+408 = 840`
= full header). `emitFusedHybrid` deliberately omits `lighting` to inherit
`DEFAULT_LIGHTS` (emitFusedHybrid.ts:170) and never writes `materials` / `coloring`.

Consequences, both currently observable:

- **Universal neutral-grey gap.** Every imported scene renders with GMT's default
  3-point rig and default neutral gradient — none of MB3D's authored lights,
  colours, ambient, fog, or per-iteration palette survive. The certification
  criterion was reduced to *geometry + framing* precisely because of this
  (`plans/mb3d/certification-handoff.md:131-132, 165-166`).
- **Hyperben2 washout.** `Hyperben2-Ozosphere` is geometry-correct but renders an
  over-lit white haze at zoom 8.89 (certification-handoff.md:171). The default rig
  (two ~1.5 + 0.5 intensity point lights, no fog, GMT glow) over-illuminates a
  deep-zoom interior that MB3D rendered with a specific darker key + ambient + depth
  fog. It is **not** a DE problem — it is the missing lighting/material import.

Both are fixed by the same work: read the lighting block, map it, and write the
`lighting` / `materials` / `atmosphere` / `coloring` preset features.

---

## 1. MB3D source byte layout (VERIFIED)

All offsets are absolute into the 840-byte `TMandHeader10` (the same DataView
`parseHeader` already builds). `Light: TLightingParas9` starts at **432**
(`TypeDefinitions.pas:800`). `packed` records → no alignment padding. Layout
verified against `M3Parameter/6 AM - Torii temple.m3p` and `ABoxScale2Start.m3p`.

### 1.1 Non-standard decoders to add (none exist in parseMB3D today)

| decoder | input | formula | source |
|---|---|---|---|
| `readDouble7B(dv, off)` | 7 bytes | 8-byte LE f64 with `byte0 = 0`, stored 7 bytes in bytes 1..7, then `getFloat64` | `Math3D.pas:529-542` (`D7BtoDouble`) |
| `readShortFloat(dv, off)` | 2 signed bytes `[mant, exp]` | `mant · 10^(clamp(exp,-25,25) − 1)` | `Math3D.pas:1182-1184` (`ShortFloatToSingle`) |
| `cardinalToRGBA(c)` | Cardinal (u32 LE) | `r=c&0xFF, g=(c>>8)&0xFF, b=(c>>16)&0xFF, a=c>>24` (RGBA in memory order) | `DivUtils.pas:661-690` (`ColToSVec`) |
| `readTRGB(dv, off)` | 3 bytes | `r=b0, g=b1, b=b2` (sRGB byte order, no scale) | `DivUtils.pas:754-759` (`RGBColToSVecNoScale`) |
| `rgbToHex(r,g,b)` | 3 ints | ``#${hex2(r)}${hex2(g)}${hex2(b)}`` (sRGB, NO linearization at preset layer) | — |

### 1.2 Lights — 6 fixed `TLight8` slots, 32 bytes each, base @500

`Lights: T6Lights = array[0..5] of TLight8` (`TypeDefinitions.pas:210, 276`).
Always 6 physical slots; per-slot fields (`TLight8`, `:198-209`):

| in-slot off | abs (slot i) | field | type | decode |
|---|---|---|---|---|
| +0 | 500+i·32 | `Loption` | Byte | bit0 `&1`: 0=ON / 1=OFF · bit2 `&4`: positional (point) · bit5 `&0x20`: angles abs / rel-to-object · bit6 `&0x40`: hard-shadow off |
| +1 | 501+… | `LFunction` | Byte | spec exponent `= 2 << (LFunction & 7)` (∈4..256) · diffuse-fn index `= (LFunction>>4) & 3` |
| +2 | 502 | `Lamp` | ShortFloat (Word) | intensity = `readShortFloat` |
| +4 | 504 | `Lcolor` | TRGB | light colour (R,G,B) |
| +7 | 507 | `LightMapNr` | Word | 0=none; else IBL/lightmap slot (no image bytes → skip) |
| +9 | 509 | `LXpos` | Double7B | global: X **angle (rad)** · poslight: world X |
| +16 | 516 | `AdditionalByteEx` | Byte | overloaded per-slot meta |
| +17 | 517 | `LYpos` | Double7B | global: Y angle (rad) · poslight: world Y |
| +24 | 524 | `FreeByte` | Byte | overloaded per-slot meta |
| +25 | 525 | `LZpos` | Double7B | poslight: world Z (global: unused) |

**Direction / frame** (VERIFIED, `HeaderTrafos.pas:1321-1395`):
- **Global / directional** (`Loption & 4 == 0`): `dir = BuildViewVectorFOV(LYpos, −LXpos)` →
  `(−sinY, sinX, cosX·cosY)` then sign-flipped (`:1364-1368`, `Math3D.pas:2785-2786`).
  Viewer-relative by default; if `Loption & 0x20`, rotated into object space and
  normalized (`:1369-1373`).
- **Positional / point** (`Loption & 4`): world position = `(LXpos, LYpos, LZpos)`
  doubles; light vector `= pos − objectCenter`, `1/d²` falloff in shader
  (`DVecFromLightPos` `DivUtils.pas:448-453`; falloff `PaintThread.pas:497-509`).
- **Colour scaled by amplitude**: global `sLCols[i] *= Lamp` (`:1375`); poslight
  `*= Lamp·1.3` (`:1359`). MB3D *also* multiplies by a width-dependent factor
  (`1000·Lamp/Width` poslight, `300·Lamp/Width` global, `:583-585`) — unit-
  incompatible with GMT, do NOT copy (see §4 intensity).

Real rigs decoded from bytes (VERIFIED): Torii L0 = ON positional, `Loption=0x1c`,
colour `#ffefb9`, amp 0.80, specExp 8, diffFn 0; L1-L5 off. ABoxScale2Start
L0 = ON global white amp 1.0 (X=−0.122, Y=0.942 rad) + L1 = ON global dark-red
`#722c2c` — a key+fill rig.

### 1.3 Material scalars (split across the light record + header)

| where (abs) | type | meaning |
|---|---|---|
| `RoughnessFactor` @434 | Byte 0..255 | `sRoughnessFactor = RoughnessFactor/255²` (`HeaderTrafos.pas:1470`) |
| `TBpos[5]` @460 (Int32) | Int | diffuse multiplier `sDiff = TBpos[5]·0.02` (`:1421`) |
| `TBpos[7] & 0xFFF` @468 | Int | specular multiplier `sSpec = max(0.004, …·0.02)` (`:1422`) |
| `TBpos[8] & 0xFFF` @472 | Int | ambient multiplier `(…)/90` (`:1398`) |
| per-light `LFunction & 7` | — | shininess exponent `2<<(…)` (no separate float) |
| per-light `(LFunction>>4)&3` | — | diffuse function 0..3 (§ shading) |

`TBpos: array[0..11] of Integer` @440 (rec +8). MB3D has **no per-material struct**
and **no separate shininess float**; "material" is these scalars + per-light powers.

### 1.4 Ambient / background / fog colours (all in `TLightingParas9`)

| abs | rec | field | type | meaning |
|---|---|---|---|---|
| 436 | +4 | `DynFogCol2` | TRGB | secondary dynamic-fog colour |
| 484 | +52 | `AmbCol` | TRGB | ambient/sky colour (top) |
| 487 | +55 | `DynFogR` | Byte | primary fog R |
| 488 | +56 | `AmbCol2` | TRGB | ambient colour (bottom) — top/bottom gradient by `N.y` |
| 491 | +59 | `DynFogG` | Byte | primary fog G |
| 492 | +60 | `DepthCol` | TRGB | background / depth-fog (near) |
| 495 | +63 | `DynFogB` | Byte | primary fog B |
| 496 | +64 | `DepthCol2` | TRGB | background / depth (far) |
| 816 | +384 | `BGbmp[0..23]` | 24 bytes | BG-image filename (empty ⇒ solid `DepthCol`/`DepthCol2`) |

`TBoptions` (Cardinal @476): `&0x4000`=colour-cycling, `&0x10000`=fine-colour-adjust,
`>>17 &1`=colour-on-orbit-trap, low/next 7 bits = interior colour start/range.

### 1.5 Palette / colour-by-iteration (VERIFIED)

MB3D colours the fractal by iteration count (or orbit-trap value) through a
position-keyed gradient stored IN the header (not an external `.map` for these
anchors):

- **Surface gradient** `LCols: array[0..9] of TLCol8` @692 (rec +260), 10 bytes
  each (`TypeDefinitions.pas:189-193, 277`):
  `Position: Word (0..32767)` · `ColorDif: Cardinal (RGBA)` · `ColorSpe: Cardinal`.
- **Interior gradient** `ICols: array[0..3] of TICol8` @792 (rec +360), 6 bytes
  each: `Position: Word` · `Color: Cardinal`.
- **Axis mapping**: `TBpos[9]`=colour start, `TBpos[10]`=colour range; build at
  `CalcSCstartAndSCmul` (`HeaderTrafos.pas:1185-1186`); `bColCycling`
  (`TBoptions&0x4000`) = wrap.

Application (`PaintThread.pas:383-427`): axis value `g = SIgradient` (smoothed
iteration count) or `OTrap&0x7FFF` if colour-on-orbit-trap; index
`ir = round((g − sCStart)·sCmul·16384)`; bracket by `LCols.Position`; lerp
`ColorDif`/`ColorSpe`.

> CAVEAT (from Investigation B): the full ramp MB3D *renders* is often an external
> `.map` file referenced by name; `LCols`/`ICols` are 10 + 4 *anchor* stops on that
> axis. They are a usable rough gradient but not always the artist's full palette.
> This is the single biggest fidelity gap — flag it (see §3).

### 1.6 Shading model (VERIFIED, `PaintThread.pas:464-720`)

Per-light Phong: diffuse from a 125-entry cosine LUT selected by `diffFn`
(0=near-Lambert, 1=`max(0,d)²`, 2=half-Lambert wrap `d·0.5+0.5`, 3=squared
half-Lambert), `Rough` blends toward a pre-convolved variant; specular
`sSpec·pow(reflect·view, 2<<(LFunction&7))`; ambient `= lerp(AmbCol, AmbCol2,
0.5·N.y+0.5)·dAmbSh ⊙ objCol`; then depth fog → `DepthCol/DepthCol2`, dynamic fog
→ `DynFog*`. `objCol` is the per-iteration palette lookup. This is a standard
diffuse+Phong+graded-ambient+fog model — GMT's Blinn/Cook-Torrance is close enough
that we map *values*, not the exact BRDF.

---

## 2. GMT preset targets (VERIFIED in source)

`emitFusedHybrid` builds a plain `preset` keyed by feature id (emitFusedHybrid.ts:176).
DDFS backfills omitted params from neutral defaults, so we write only overrides.

### 2.1 `preset.features.lighting.lights: LightParams[]`
`LightParams` (`engine-gmt/types/graphics.ts:38-67`):
```ts
{ type: 'Point' | 'Directional' | 'Sphere',
  position: {x,y,z}, rotation: {x,y,z}, color: '#RRGGBB',
  intensity: number, falloff: number, falloffType: 'Linear'|'Quadratic',
  fixed: boolean, visible: boolean, castShadow: boolean,
  // optional, backfilled by normalizeLights(): id, temperature, useTemperature, radius, softness, range }
```
- `color` = sRGB hex string (no linearization at preset layer; GMT linearizes
  internally). `MAX_LIGHTS = 8` (data/constants.ts:19) — MB3D's 6 fit.
- `normalizeLights` (lighting/index.ts:74-84) backfills `id`/`type`/`position`/`rotation`.
- `DEFAULT_LIGHTS` (lighting/index.ts:99-103): 3 Point lights, intensity 1.5 / 0.5 /
  0.25, `useTemperature:true`. This is what we replace.

### 2.2 `preset.features.materials: MaterialState` (materials.ts:7-27)
Relevant keys: `diffuse` (0..2), `specular` "Reflectivity" (0..2), `roughness`
(0.001..1), `reflection` "Metallic" (0..1), `emission`, `rim`,
`envStrength`/`envGradientStops` (a sky/ambient stand-in).

### 2.3 `preset.features.coloring: ColoringState` (coloring/index.ts:7-42)
`gradient: GradientStop[] | GradientConfig` (`{id, position:0..1, color:'#hex'}`),
`mode` (float; `Iterations`/`Z-Depth` modes), `scale`, `offset`, `repeats`,
`phase`, `bias`. `GradientStop` = `engine-gmt/types/graphics.ts:10-16`.

### 2.4 `preset.features.atmosphere: AtmosphereState` (atmosphere/index.ts:42-54)
`fogIntensity` (0..1), `fogNear`, `fogFar`, `fogColor` (THREE.Color | hex),
`fogDensity`, plus the glow keys the importer **already sets**
(`glowIntensity:0.01, glowSharpness:250`, emitFusedHybrid.ts:185).

### 2.5 `preset.features.optics: OpticsState` (optics.ts:4-10)
`camFov` already set from `cam.fov` (emitFusedHybrid.ts:186). No lighting wiring.

---

## 3. Mapping table — clean / approximate / dropped

### Clean (direct or single-formula conversion)

| MB3D | → GMT | conversion |
|---|---|---|
| posLight (`Loption&4`) | `lighting.lights[].type='Point'` | — |
| global light | `lighting.lights[].type='Directional'` | dir = `BuildViewVectorFOV(LYpos,−LXpos)`, then frame (§4) |
| `Lcolor` (TRGB) | `lights[].color` | `rgbToHex` (sRGB, direct) |
| `Loption&1==0` | `lights[].visible=true` | active flag |
| `Loption&0x40` (HS off) | `lights[].castShadow = !(Loption&0x40)` | `iHSenabled=1−((Loption>>6)&1)` |
| posLight position | `lights[].position` | `(LXpos,LYpos,LZpos)` Double7B − `mid` (§4 frame) |
| `RoughnessFactor` @434 | `materials.roughness` | `RoughnessFactor/255` clamped 0.02..1 |
| `AmbCol`/`AmbCol2` | `materials.envGradientStops` (2-stop sky) + `materials.envStrength` | sRGB hex; envStrength from ambient mult `(TBpos[8]&0xFFF)/90` |

### Approximate / lossy (calibrate against refs)

| MB3D | → GMT | why approximate |
|---|---|---|
| `Lamp` ShortFloat | `lights[].intensity` | MB3D scales by width-dependent factor (`300·Lamp/Width` etc.) — incompatible. Decode ShortFloat then apply one empirical global factor `K_LIGHT` (calibrate; GMT defaults run ~0.25..1.5). |
| `(LFunction>>4)&3` diffuse-fn | (no direct knob) | half-Lambert/wrap (fn 2,3) has no GMT analog; record but don't emit, or nudge a fill light up. |
| `2<<(LFunction&7)` spec exp | `materials.specular` + `materials.roughness` heuristic | GMT uses continuous roughness; map highest spec exp → lower roughness. Per-light exponents collapse to one material. |
| `TBpos[5]`→`sDiff`, `TBpos[7]`→`sSpec` | `materials.diffuse`, `materials.specular` | scale `·0.02` then renormalize into GMT's 0..2 ranges. |
| `DynFog*` + fog `TBpos[3,8]` | `atmosphere.fogColor` + `fogIntensity`/`fogNear`/`fogFar` | fog trackbar math (`HeaderTrafos.pas:1303-1316`) is opaque; colour is clean, the near/far/intensity need calibration. INFERRED. |
| `DepthCol`/`DepthCol2` | `atmosphere.fogColor` (or a Z-Depth `coloring.mode`) | depth-cueing gradient; closest analog is fog target colour. |
| `LCols[0..9]` anchors | `coloring.gradient` (iteration mode), `sCStart`/`sCmul`→`offset`/`scale`, `bColCycling`→`repeats`/wrap | only the in-header anchors; may differ from the artist's `.map`. |

### Dropped (no equivalent — document in ledger)

| MB3D | reason |
|---|---|
| External `.map` palette | not embedded; only `LCols`/`ICols` anchors available. **Biggest gap.** Default to seeding `coloring.gradient` from `LCols` anchors, flagged as approximate. |
| Lightmaps / IBL (`Loption&2`, `LightMapNr`, `BGbmp` image) | no image bytes in importer; light still imports as plain Point/Directional. |
| `ICols` interior gradient | GMT has no separate inside-colouring; fold into the main gradient or drop. |
| Exact diffuse/specular BRDF functions | quantized MB3D functions vs GMT continuous Cook-Torrance; values approximated. |

---

## 4. Coordinate / colour-space / intensity conversions

- **Colour space:** MB3D `TRGB` = sRGB 0-255 bytes; GMT `LightParams.color` and
  atmosphere colours are sRGB hex strings — **byte→hex direct, no linearization at
  the preset layer** (GMT linearizes internally, cf. `uFogColorLinear`).
- **Directional-light frame:** the global-light direction is built **viewer-relative**
  (sign-flipped after `BuildViewVectorFOV`), rotated to object space only if
  `Loption & 0x20`. The camera map already reconstructs the camera basis from
  `hVGrads` (mapCamera.ts). So a viewer-relative MB3D light must be rotated by the
  SAME camera rotation `cam.cameraRot` to land in world space before writing GMT's
  `position`/`rotation`. Map abs-angle lights (`&0x20`) → `fixed:true`,
  viewer-relative → `fixed:false`. (Pass `cam` into `mapMB3DLighting`, exactly as
  Investigation B recommends.)
- **Position frame:** posLight `Double7B` positions are MB3D mid-relative
  (`HeaderTrafos.pas:1360` subtracts `lvMidPos`). The camera map absorbs `mid` into
  `sceneOffset` (`cameraPos` → `sceneOffset` on load; emitFusedHybrid.ts:188-190).
  Apply the **same `mid` offset** to light positions so they share GMT's frame.
- **Intensity:** decode ShortFloat, then renormalize by one empirical `K_LIGHT` —
  do NOT copy the raw width-scaled MB3D value. Calibrate against refs like the
  existing `K_DETAIL` / fudge floors (emitFusedHybrid.ts:255-289). INFERRED factor.

---

## 5. New parseMB3D fields to surface

Extend the `MB3DHeader` interface (parseMB3D.ts:44-98) and `parseHeader`
(parseMB3D.ts:213-244). Add the four decoders from §1.1 as module helpers.

```ts
export interface MB3DLight {
  on: boolean;                 // (Loption & 1) === 0
  positional: boolean;         // (Loption & 4) !== 0
  absAngles: boolean;          // (Loption & 0x20) !== 0
  hardShadow: boolean;         // (Loption & 0x40) === 0
  specExp: number;             // 2 << (LFunction & 7)
  diffuseFn: number;           // (LFunction >> 4) & 3
  amp: number;                 // readShortFloat(Lamp)
  color: string;               // '#RRGGBB' from Lcolor TRGB
  x: number; y: number; z: number; // Double7B — angles (global) OR world pos (poslight)
}

// added to MB3DHeader:
  lights: MB3DLight[];         // 6 slots @500
  roughnessFactor: number;     // @434 byte
  diffMul: number;             // TBpos[5]·0.02   @460
  specMul: number;             // (TBpos[7]&0xFFF)·0.02   @468
  ambMul: number;              // (TBpos[8]&0xFFF)/90   @472
  ambCol: string;              // TRGB @484
  ambCol2: string;             // TRGB @488
  depthCol: string;            // TRGB @492
  depthCol2: string;           // TRGB @496
  dynFog: string;              // '#'+DynFogR@487 DynFogG@491 DynFogB@495
  colStops: { pos: number; colorDif: string; colorSpe: string }[]; // LCols @692 ×10
  bColCycling: boolean;        // TBoptions@476 & 0x4000
  colStart: number;            // TBpos[9]  @476-region (axis start)
  colRange: number;            // TBpos[10] (axis range)
}
```

`defaultHeader()` (loadMB3DScene.ts:70-80) must set these to empty/zero
(`lights: []`, colours `''`) so a synthesized standalone formula falls through to
DEFAULT_LIGHTS (mirrors the `hVGrads: []` → centered-camera fallback already there).

---

## 6. emitFusedHybrid wiring (mirrors mapCamera)

Add a `mapLighting.ts` sibling to `mapCamera.ts` — pure function with a degenerate
fallback that returns nothing, so headerless/standalone loads keep DEFAULT_LIGHTS:

```ts
export interface MB3DLightingResult {
  lights: LightParams[];                 // [] ⇒ inherit DEFAULT_LIGHTS
  material?: Partial<MaterialState>;     // roughness/diffuse/specular
  atmosphere?: Partial<AtmosphereState>; // fogColor/fogIntensity/fogNear/fogFar
  coloring?: Partial<ColoringState>;     // gradient/mode/offset/scale/repeats
  envGradientStops?: GradientStop[];     // ambient sky stand-in
}
export function mapMB3DLighting(h: MB3DHeader, cam: MB3DCameraPose): MB3DLightingResult
```

In `emitFusedHybrid`, after `const cam = mapMB3DCamera(h)` (line 175):

```ts
const lit = mapMB3DLighting(h, cam);
// ... in the preset literal:
features: {
  atmosphere: { glowIntensity: 0.01, glowSharpness: 250, ...(lit.atmosphere ?? {}) },
  optics: { camFov: cam.fov },
  ...(lit.lights.length > 0 ? { lighting: { lights: lit.lights } } : {}),
  ...(lit.material ? { materials: lit.material } : {}),
  ...(lit.coloring ? { coloring: lit.coloring } : {}),
}
```

Rules (mirroring the camera/DE pattern):
- **Only write `lighting` when `lit.lights.length > 0`** — else inherit
  DEFAULT_LIGHTS (preserves current good behaviour for standalone loads).
- **Merge fog into the existing `atmosphere` literal** (don't replace the glow keys
  already there at line 185).
- **Gate behind the same degenerate guard** as the camera/DE override: a
  `defaultHeader()` synthesized scene has `lights:[]` → `mapMB3DLighting` returns
  empty → DEFAULT_LIGHTS preserved (loadMB3DScene.ts:70-80).
- **Flag the palette gap** in the import ledger (`reasons`/a `note`), consistent
  with the existing `code-sub` flagging, since `coloring.gradient` is only the
  `LCols` anchors, not the full `.map`.

---

## 7. How this fixes the two named problems

- **Universal neutral grey:** writing `lighting.lights` (actual MB3D colours/positions),
  `materials.roughness/diffuse/specular`, and (approximate) `coloring.gradient` from
  `LCols` replaces the default rig + neutral gradient. Imported scenes pick up their
  authored key/fill colours and per-iteration palette — moving certification past
  *geometry + framing* (certification-handoff.md:131-132, 316).
- **Hyperben2 washout:** the default rig (1.5 + 0.5 intensity, no fog) over-lights a
  deep-zoom interior. Importing MB3D's actual lower-amp lights (renormalized via
  `K_LIGHT`), the authored `AmbCol` and `DepthCol`-driven depth fog (`atmosphere.fog*`),
  and the artist's `RoughnessFactor` darkens and grounds the surface, killing the
  white haze. It was explicitly deprioritized pending this import
  (certification-handoff.md:171, 181). The fog/depth target is the load-bearing
  piece — the haze is unfogged glow over a flat-lit surface.

---

## 8. Phased plan (effort estimates)

**Phase L0 — parse the block (foundation).** Add the 4 decoders + extend
`MB3DHeader`/`parseHeader` with the §5 fields; extend `defaultHeader()`. Add a
`debug/` probe dumping decoded lights/colours for a few `.m3p` to sanity-check
against the §1.2 verified examples (Torii `#ffefb9` amp 0.80, ABoxScale2 white +
`#722c2c`). No preset wiring yet. **Effort: ~0.5 day.** Risk: low (pure parse,
byte-verifiable).

**Phase L1 — lights → preset (the big visible win).** Build `mapLighting.ts`
(lights only): point/dir classification, colour hex, ShortFloat intensity ×
`K_LIGHT`, frame transform via `cam`, visible/castShadow, abs→fixed. Wire into
`emitFusedHybrid` gated on `lights.length>0`. Calibrate `K_LIGHT` against 3-4 refs.
**Effort: ~1 day.** Risk: medium (intensity + frame calibration). *This alone
removes most of the neutral-grey complaint and starts on Hyperben2.*

**Phase L2 — material + ambient + fog.** Add `materials.roughness/diffuse/specular`
(from `RoughnessFactor`/`TBpos[5,7]`), `envGradientStops` from `AmbCol`/`AmbCol2`,
and `atmosphere.fog*` from `DepthCol`/`DynFog*`. Calibrate fog near/far/intensity.
**Effort: ~1 day.** Risk: medium (fog trackbar math is opaque/INFERRED). *Closes
the Hyperben2 washout.*

**Phase L3 — palette (approximate, flagged).** Map `LCols` anchors →
`coloring.gradient` (iteration mode), `sCStart`/`sCmul` → `offset`/`scale`,
`bColCycling` → repeats/wrap. Flag in ledger as approximate (external `.map`
dropped). **Effort: ~1 day.** Risk: medium-high (gradient axis calibration; biggest
fidelity gap).

Total ~3.5 days. L1 is the highest value-per-effort; L2 fixes the named washout;
L3 is the residual-quality pass with a permanent fidelity caveat.

---

## 9. Verification plan

Reuse the existing cert harness (certification-handoff.md:125-130):
- **MB3D refs:** batch-render matching `M3Parameter/*.m3p` → `cert/.../<scene>.jpg`.
- **GMT renders:** render the bundled scene at native aspect + faithful camera →
  `cert/gmt/<scene>.png` (headed Chrome → real GPU/ANGLE).
- **Per phase:**
  - L0: byte-dump probe matches the §1.2 verified examples exactly.
  - L1: light colour/direction visually matches (key from correct side, right hue);
    no over-/under-exposure vs MB3D mid-tones. Calibrate `K_LIGHT` on Torii (warm
    single key), ABoxScale2 (white+red rig), Hyperben2 (deep-zoom interior).
  - L2: Hyperben2 white haze gone (fog grounds the surface); ambient tint matches.
  - L3: per-iteration colour bands track MB3D's (accepting `.map` divergence).
- **Regression gate:** standalone formula loads unaffected (defaultHeader → empty
  lights → DEFAULT_LIGHTS). Run `npm run typecheck`, `test:mb3d`, `test:weave`, and
  the triage/scan corpus — none touch lighting, so all must stay green.
- **Canonical calibration set:** Torii (positional warm), ABoxScale2 (key+fill),
  Hyperben2 (the washout case), one dIFS scene (AureliusCat) for palette.

---

## 10. Open questions

1. **`K_LIGHT` intensity factor** (INFERRED) — MB3D's width-dependent amplitude
   scaling has no GMT equivalent; needs one empirical global factor calibrated
   against refs. Does one factor hold across positional vs directional (MB3D uses
   different `1000·` vs `300·` width scales)?
2. **Fog trackbar math** (INFERRED) — do `TBpos[3]`/`TBpos[8]` map linearly to
   `fogNear`/`fogFar`? The trackbar math (`HeaderTrafos.pas:1303-1316`) is opaque;
   may need a lookup or pure calibration.
3. **Palette source** — is the in-header `LCols` ramp ever the *complete* palette,
   or always anchors on an external `.map`? Determines whether L3 can ever be
   "faithful" or is permanently "approximate".
4. **Diffuse-function mapping** — half-Lambert/wrap (diffFn 2,3) lights the back
   faces; no GMT analog. Drop, or compensate by nudging fill-light placement?
5. **Per-light spec exponent collapse** — 6 lights with distinct exponents must
   collapse to one `materials.roughness`. Pick max exponent, average, or the
   brightest light's?
6. **`fixed:false` orbit-locking** — viewer-relative lights mapped to `fixed:false`
   move with the orbit. Does that match MB3D's intent (lights rotate with the
   camera) for a static import, or should they bake to world-fixed?
