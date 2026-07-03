# MB3D import certification — handoff

Status as of the cert pass on `feat/mb3d-importer` (latest commit `fbd6e7b`). Tracks the
scene-by-scene visual certification against real MB3D renders, plus the open const-pack /
sparse-bulb clusters.

> **⚠ The scene table below predates two later shipments (2026-06-27):** (a) **lighting L0–L3**
> landed, so renders are no longer neutral-grey (the "geometry+framing only" criterion is now
> superseded for the lit scenes); (b) **DsyneGrafix dust is now fixable** via the numerical DE
> estimator (ADR-0085, opt-in) — it's no longer "HARD/unfixed". **Hyperben2-Ozosphere** remains
> lighting-washed pending **fog** application. The next pass is the render-fidelity work in
> `research/fidelity-pass-SESSION.md` (quality-param de-empiricization + numeric-DE lighting + fog).

## ⭐ Session 2026-06-27: LightBulbMoon ×2 recovered, AureliusCat deBailout, DsyneGrafix root-caused

**LightBulbMoon ×2 — UNBLANKED (`e322eec`).** Both were black. Root cause was the BOXSCALE
const-pack: MB3D writes the Amazing-Box/Surf Min-R const as `Sqr(Max(1e-40, MinR))`
(CustomFormulas.pas:462) — it clamps to ≥1e-40 **before** squaring, so a NEGATIVE MinR
collapses to ~0 and DISABLES the inner sphere-fold. `packConstBuffer` did `Max(1e-40,
Sqr(MinR))` (clamp AFTER squaring), keeping the full positive radius (MinR −3.1 → 9.61) →
inner fold active with a huge radius → almost every point scaled by Scale/MinR² → set
collapses to the origin → the (correctly imported) camera framed empty space → black. Both
LightBulbMoon use a negative MinR (Fabulous −3.1, No-Never −2.06); both now render their full
Amazing-Surf geometry (curled horns + spikes / ribbon-and-bulb chains), matching the refs.
**Positive-MinR scenes are byte-identical** (`Sqr(Max(1e-40, 0.358)) == Max(1e-40, 0.358²)`) —
BatJorge/Lenord/all box scenes unchanged. Diagnostic: the discriminator was MinR sign
(black scenes negative, working scenes positive). Also mirrored in `bindOptions` (parametric).

**AureliusCat dIFS deBailout starvation — FIXED (`fbd6e7b`).** Loading AureliusCat-Bamboo
needed a manual deBailout=1000 to look right. `mapDEMeta` correctly set 1000 for dIFS (the
bounded orbit-trap orbit never escapes — it must run ALL iterations or the trap-min is
incomplete), but the **faithful scene-DE override then clobbered it** with the header RStop
(AureliusCat=16, floored to 256). Exempted dIFS (estimator 6) from the RStop→deBailout
override. Only deOption-20 scenes affected; AureliusCat now renders its full spiral-IFS
geometry at import defaults. NB: **already-saved PNGs carry the old baked param — re-import
the .m3p to refresh.**

**DsyneGrafix — the "garbage value" smoking gun is a RED HERRING (not fixed; hard).** Proven:
the parse is byte-exact vs the real `.m3p`; the `-2.6e272` at option index 5 is uninitialized
memory past `optionCount=5` and is **never read**. Formula (verified vs `IdesFormula.m3f`),
weave (box×12 → scaling → ides×2, mode-0), camera, and all values are CORRECT — the intern
box renders fine (Scale 2 → full Mandelbox; the authored Scale 1 genuinely has no bounded set,
so the structure comes entirely from the weave). Box-only renders a clean detailed surface;
the IdesFormula iterations (violent `x'=4x²−64(y²+z²)` explosion at the escape boundary) turn
it to dust. **No DE parameter recovers it** (exhaustively swept estimator/fudge/detail/bailout/
iterations with a now-working tool). It's a DE-discontinuity-at-the-escape-boundary problem —
MB3D resolves it via DEstop surface-hit + bStepsafterDEStop binary-search refinement, which
GMT's single-pass raymarcher lacks. Needs surface-refinement work, not a tuning fix.

**Harness `qualityOverride` was a silent no-op — FIXED (`06fc465`).** The cert tool merged
qualityOverride into `st.quality` AFTER prepareScene (post-compile), where it never reached
the shader (`estimator` is a compile-time getDist branch; fudge/detail/bailout/maxSteps are
uniforms synced from `config.quality` at compile). Every prior DE sweep silently rendered the
formula's defaults. Now folded into the config build (`configOverrides.quality`) — verified
TimeMachine detail/fudge sweeps move nb/sigma. **Sweep DE via `configOverrides:{quality:{…}}`.**

Prior sessions landed: the dIFS orbit-trap estimator (`ccc196d`), `_SphereFolding1` decompile
+ FOLDING const-pack (`4e23b56`), multi-slot transform-DE composition (`e35475e`, TimeMachine),
per-slot parameter exposure (`55df087`), faithful scene-DE import (`e72f5ca`).

## ⭐ TimeMachine — multi-slot transform DE + per-slot params (`e35475e`, `55df087`)

**Render fix (`e35475e`).** TimeMachine (4-slot weave `_FoldingOct → _SphereFolding1
→ AmazingBox → Menger3`) rendered blank because `_SphereFolding1`'s sphere fold reads
`mb3dRout` (the squared radius) and divides by it — but GMT left `mb3dRout` at its
loopInit 0.0 → divide-by-zero → NaN → empty. MB3D's `doHybridPasDE` recomputes
`Rout := x*x+y*y+z*z` after EVERY formula step (formulas.pas:3723); the fused
dispatcher now mirrors that (`mb3dRout = dot(z.xyz, z.xyz)` before each slot, gated
`!isDifs` — dIFS keeps mb3dRout as the formula's surface-distance output). TimeMachine:
EMPTY → full mechanical-body + sphere geometry matching `output/TimeMachine.jpg`.

**Per-slot params (`55df087`).** Multi-slot scenes baked all option values; now they
expose per-slot sliders when the params fit GMT's shared uniform budget (6 scalars +
3 vec3), via a cross-slot allocator. TimeMachine exposes all 8: SphereFolding1 R fold;
Amazing Box Scale/Min Radius/Folding Limit; Menger3 Scale/CScale(vec3)/Rotation1/
Rotation2. New `bindOptions` handles option types 8/11 (.FOLDING) and groups an X/Y/Z
scalar triple (Menger CScale) into one vec3. The `mb3dRot()` helper is now emitted once
per fused def (two rotation slots previously redefined it → compile error; this briefly
blanked BatJorge/Lenord/No-Never and was caught + fixed before commit). 4D/Quaternion
hybrids stay baked (they reserve paramA/B for the w-seeds). No regression: 21/21 scenes
match the pre-change nb baseline.

## ⭐ dIFS orbit-trap DE estimator (estimator 6) — LANDED (`ccc196d`)

The MB3D `*IFS` family (DEoption 20) used to render EMPTY: its distance is an
orbit-trap IFS estimate that no GMT estimator reproduced. Now it works.

**The math (verified against MB3D source, not guessed).** `doHybridIFS3D`
(`formulas.pas:3210-3298`, x87/SSE2 asm) returns, per pixel:

    DE = MIN over the orbit of ( Rout / VaryScale )

- `Rout` (TIteration3Dext +56, decompiler scratch **`mb3dRout`**) — each `*IFS`
  formula writes its folded-space surface distance there, already divided by the
  formula's max-abs-reciprocal-scale.
- `VaryScale` (+200, scratch **`mb3dVary`**) — accumulated ABSOLUTE scale: init 1.0
  (`fld1; fstp [esi+112]`), `*= scale` each step when the "apply scale+add" flag is set.
- The running minimum (OTrap field +192) inits to **65535.0** (`d65535`, MB3D's "minDE
  ini"); per iteration `cand = Rout/VaryScale; if cand < min: min = cand` (`divsd`,
  `ucomisd`, `jnc`, `movsd` at 3265-3274). The function returns that MinDE — NOT the
  final-iteration value. (Verified by reading the asm + the decompiled SphereIFS/boxIFS
  GLSL, which write exactly `mb3dRout`/`mb3dVary`. The earlier "OTrap·ln(OTrap)/√grad"
  guess was wrong.)

**The implementation** mirrors the cutting-plane estimator (a formula-written global
that getDist reads):
- `core_math.generateGetDist` — estimator **6** returns a file-scope `g_difsDE` global,
  gated on `shader.supportsDifs` (falls back to Linear otherwise), inserted BEFORE the
  `>4.5` CP coercion that would otherwise eat value 6.
- `emitFusedHybrid` — on a `deOption 20` scene with `mb3dRout`+`mb3dVary` in scratch:
  declares `float g_difsDE;` in the def's `preamble`, inits `g_difsDE = 65535.0` in
  `loopInit`, and appends `g_difsDE = min(g_difsDE, mb3dRout/max(|mb3dVary|,1e-9))` to
  `loopBody`; sets `supportsDifs`.
- `mapDEMeta` — `deOption 20` → estimator 6, fudge 0.7, **deBailout 1000** (the bounded
  IFS orbit never escapes, so a high bailout is required to run full iterations).
- `quality.ts` — "dIFS (Orbit Trap)" estimator dropdown option, gated on `supportsDifs`.

**Verified on the real GPU (ANGLE/D3D11).** `AureliusCat-Bamboo`: EMPTY → coherent
spiral IFS geometry. A standalone scan (`debug/probe-mb3d-difs-scan.mts`) renders
**18 of 47** dIFS formulas GOOD (CitrusIFS, LimpetIFS, RoundedBox, ScarabIFS, SphereIFS,
TorusEllipIFS, borgIFS, boxIFS, cubetubeIFS, cylinderIFS, gyroidIFS, pyramIFS,
roomclrIFS, tetratubeIFS, toupieIFS, wavespIFS, QCylIFS, QuadricsIFS). **No regression**:
all 15 certified scenes unaffected (changes fully gated on `deOption 20`). Gates:
typecheck 0, `test:mb3d` 24, `:weave` 41, `:map` 32, decompiler corpus 278/0 (untouched).

The other **29** dIFS formulas are blocked by the `Cp<n>` const-pack gap, NOT the DE —
see "Cp const-pack" below.

## How certification works

- **GMT renders:** `npx tsx debug/cert-render.mts [nameFilter]` → renders every
  bundled scene (or a name match) at its native aspect + faithful camera +
  full-frame into `H:/GMT/refSoftware/MB3D/cert/gmt/<scene>.png`. Uses **headed
  Chrome → real GPU (ANGLE/D3D11)**; the old headless SwiftShader path took hours.
  Needs the harness server up at `localhost:5173/render-harness.html`.
- **MB3D references:** batch-render the matching `M3Parameter/*.m3p` in MB3D →
  `H:/GMT/refSoftware/MB3D/output/<scene>.jpg`. Compare 1:1 against `cert/gmt/`.
- Certification criterion is **geometry + framing**; lighting/colour are not
  imported yet (every GMT render is a neutral grey), so that gap is expected.

## ⭐ Faithful scene-DE import + tighter glow (`e72f5ca`) — recovered Theli/Hyperben/BatJorge-detail

The importer read only `iterations` from the .m3p header and rendered every scene with
the decompiled **formula's** generic DE defaults — so the artist's authored render tuning
was ignored. Theli-At's background Menger half-spheres never resolved; box+Menger scenes
looked crude/blobby. **Root cause was NOT iterations or float32 precision** (both were
red herrings chased this session) — it's the **surface hit threshold** ("Ray detail"):
GMT's default `uDetail` was too coarse for far/fine detail, and the scene's `DEstop`
(which sets exactly that) was unread.

`parseMB3D` now reads `RStop`@92 / `sDEstop`@177 / `mZstepDiv`@182 / `bStepsafterDEStop`@134.
`emitFusedHybrid` maps the authored values into the preset:
- **`DEstop` → Ray detail** (`uDetail` ∝ 1/DEstop; MB3D hit offset ≈ `DEstop·0.15`, Calc.pas:794),
  capped at 6 — **the lever** that brings back far/fine surface detail.
- **`RStop` → deBailout** (MB3D escapes at `Rout > RStop`), **floored at 256** — a low
  authored RStop (BatJorge=20) starves GMT's DE and renders black, so only let it raise.
- **fudge floored to 0.5** (NOT the literal `ZstepDiv` ~0.1 — over-conservative, saturates
  GMT's ray-step budget; GMT's DE takes larger steps fine).
- **glow tightened** (`glowSharpness` 50→250): the loose default bloom washes out fine
  detail when zoomed in (`glow = exp(-sharpness·DE)`). NB the engine scales glow by
  `fudgeFactor`, so the fudge floor raised it — the tighter sharpness compensates.

GPU-verified, **20/20 render, no regressions**. Theli-At crude → crisp lacy web + Menger
half-spheres (cube detail visible). BatJorge/Genetic/Hyperben/Surreal/Hal-Tenny/ABoxScale
gained detail. Standalone formula loads unaffected (defaultHeader DE fields = 0 → override
skipped). **The hard cross-scene calibration constants (DEstop→uDetail factor 3.3/cap 6,
RStop floor 256, fudge floor 0.5, glowSharpness 250) are empirical — refine against more
refs.**

## Scene status (20 bundled — spineJulia removed) — as of `e72f5ca`

Certification = geometry + framing (lighting/colour still NOT imported — every render is
neutral grey).

| Status | Scenes |
|---|---|
| **Certified / rendering correctly** (~19) | Genetic Menger, BatJorge-Pong703, Hal-Tenny-Resistance, ABoxScale2Start, ABoxScale3Start, InAndOutside box, Lenord-Beanstalk, MarkJayBee-Curvichrome, MengerTrees, QuatP4hybridJulia, Surreal shell, TreePlanet, Ellarien-Shrooms, AureliusCat-Bamboo (dIFS — deBailout fixed `fbd6e7b`), TimeMachine, Theli-At-MengerSpheres, **LightBulbMoon-Fabulous** + **LightBulbMoon-No-Never** (both recovered `e322eec`, nb 0.93 / 0.97) |
| **Geometry OK, lighting-washed at deep zoom** | **Hyperben2-Ozosphere** — geometry correct; over-lit white haze at zoom 8.89. User deprioritized: will resolve when MB3D lighting import lands (NOT a DE issue). |
| **Wrong / sparse (HARD — not a tuning fix)** | DsyneGrafix-Getting Loopy — the garbage-value theory is DISPROVEN. Parse/formula/weave/camera all correct; the box-only portion renders a clean surface, but IdesFormula's explosive `x'=4x²−64(y²+z²)` at the escape boundary makes a DE discontinuity GMT's single-pass raymarcher renders as dust. Needs MB3D-style DEstop surface-refinement (binary search). No DE param recovers it. |
| **Removed** | ~~spineJulia~~ — interior-rendered −Z Integer-Power bulb; needs interior/deep-zoom GMT lacks. |

### Remaining problem list (for the next session)

1. **DsyneGrafix** (HARD) — NOT a parse/DE-tuning fix (both falsified). The fused weave's
   DE is discontinuous at IdesFormula's explosive escape boundary. The real lever is a
   surface-hit refinement pass (MB3D's DEstop + `bStepsafterDEStop` binary search) so the
   raymarcher can land on a discontinuous-DE surface. Substantial engine work.
2. **Hyperben2 lighting washout** — wait for MB3D light/material import; not a DE problem.
3. **Deep-zoom scenes** (the 1–2 the user is OK leaving) — anything needing interior or
   sub-1e-6 precision is out of scope for now.
4. **dIFS const-pack gap** (unchanged) — the 29 `Cp<n>`-blocked dIFS formulas (see below).

## Fixes landed this round

- `906280a` — x87 `shr ah,1; jbe` flag fix → `_updateC2` swap fires → **Genetic
  Menger** c-modulation (the TOP-field-in-AH gotcha; corpus-wide, 5 swap sites).
- `758a22f` — intern **Amazing Box** gets estimator 1 (linear box-fold); was
  inheriting analytic estimator 0 and rendering dark/mushy. + the GPU cert tool.
- `1831504` — import ray-march budget 500→1500; **Theli-At / Hyperben2** were
  truncated at 500 steps.
- `12aded8` — `clampIter` honours the authored iteration count up to
  `DEFAULT_HARD_CAP` (was hard-capped at 500).
- **mb3dFirst decompiler fix** (this round) — the dropped `inc [bFirstIt]` write;
  grows Ellarien's mushroom caps. Root cause + scope below.

## RESOLVED: Ellarien "Shrooms" — decompiler dropped the `bFirstIt` write

**It was NOT the DE math (estimator).** The DEoption-11 lead was a red herring:
MB3D `DEoption 11` DE = `Sqrt(Rout)/Abs(w)` (formulas.pas:3690 `doHybridPasDE`,
the `else` branch — `11 and 7 = 3`), which *is* GMT's estimator 2 (`r/dr`), not
estimator 1. But swapping estimators 1↔2 barely moved the render — the user
confirmed estimator wasn't the lever. The real bug was upstream in the **formula
body**, not the DE.

**Root cause.** The Amazing Surf `[CODE]` starts with the once-per-orbit init:
```
837F5000  cmp [edi+0x50], 0   ; bFirstIt  (decompiler offset 208 = mb3dFirst)
7F09      jg  +9              ; skip if already set
FF4750    inc [edi+0x50]      ; bFirstIt++   ← DROPPED by the decompiler
DD46F0    fld [esi-0x10]      ; Cm16 (initial Scale)
DD5F48    fstp [edi+0x48]     ; mb3dVary = Cm16
```
`inc`/`dec` were in the decompiler's `NEUTRAL` set and only the *register* form was
modeled (`decompile.mjs` trackReg) — the **memory** form `inc [edi+0x50]` was
silently skipped. So the `if (!(mb3dFirst > 0.0))` guard fired **every** iteration
→ `mb3dVary` (the evolving `Scale = Scale + Scale_vary·(|Scale|−1)`) reset to its
initial value each step → the Scale-vary accumulation that grows the mushroom
caps/stems was dead. Only the near-identity base ("floor") formed.

**Fix.** Emit GLSL for `inc/dec [mem]` → `mb3dFirst = mb3dFirst + 1.0;` in
`decompile.mjs`, and mirror it in the x87 interpreter `xcheck.mjs` (both sides
previously dropped it, which is why `CMP_KEYS` — which *includes* `mb3dFirst` —
still matched; the lockstep keeps the corpus faithful). Then regenerate
`decompiled-formulas.ts` via `generate-library.mjs`.

**Scope (why no regressions).** The fix only changes behaviour for the 15 formulas
carrying the `bFirstIt`/VaryScale pattern, and only when a scene's `Scale vary ≠ 0`:
- **Ellarien** — `Scale vary = 0.03125` (large) → fixed; caps + stems now grow.
- **LightBulbMoon-Fabulous** — `-0.00625` → improved.
- **Lenord** — `-0.0016` (tiny) → still certified.
- **BatJorge**, **LightBulbMoon-No-Never**, **Surreal shell** (ABoxMod1) — all
  `Scale vary = 0` → byte-identical (the guard's reset target is unchanged).
- Every certified Menger/Sierpinski/box scene uses a DE formula with no vary
  option → unaffected.

**Decompiler source note.** The canonical decompiler is `/h/tmp/mb3d-decomp/`. The
repo snapshot at `plans/mb3d/decompiler/` had drifted: commit `906280a`'s `shr ah`
fix was never copied back. This round re-synced `decompile.mjs` + `xcheck.mjs` from
`/h/tmp` (so the committed snapshot reproduces the committed `decompiled-formulas.ts`).
Gates: `corpus-check.mjs` 278 FAITHFUL / 0 mismatch, `test:mb3d` 24, `:weave` 41,
`:map` 32, typecheck clean.

## Open clusters — precise next-steps

### Cp const-pack gap → up to 28 more dIFS formulas (BLOCKED, investigated)

The 29 dIFS formulas that still ERROR (`[stage=emit] unsupported`) are blocked by
positive-offset const tokens `Cp0/Cp8/Cp16/…`, NOT the DE estimator. Progress this
round (real decoding, no longer a black box):
- The const buffer's fixed table is **`PAligned16`** (`DivUtils.pas:1622-1635`): `+0`/`+8`
  = abs mask `0x7FFF…`, `+16` = −2.0, `+24` = 1e-100, `+32`/`+40` = 1.0, `+48`/`+56` = −1.0,
  `+64`/`+72` = 2.0, `+80`/`+88` = negate mask. Copied into each formula's buffer
  (`FastMove(PAligned16,…,216)`, `CustomFormulas.pas:334`).
- `FillCustomVBufWithVars` (`CustomFormulas.pas:393-569`) writes the `0.5` prelude at
  base−8 and ALL options DOWNWARD (negative offsets) → positive offsets keep the
  PAligned16 table. `fHPVar[i] := pConstPointer16` exactly (`Calc.pas:154`), so the
  decompiler's base is correct and `Cp0` = `PAligned16+0` = the abs mask.
- **RESOLVED 2026-06-27 — NOT a contradiction, NO runtime dump needed.** The 2026-06-27
  research (`plans/mb3d/research/coverage-unlocks.md` §3 "U1", independently re-verified
  against `DivUtils.pas:1616-1644`) shows the table is FULLY SPECIFIED at compile time:
  `Cp0/Cp8` = abs mask, `Cp80/Cp88` = negate mask, and **`Cp16+` are plain fixed doubles**
  (`Cp16=−2`, `Cp24=1e-100`, `Cp32/40=1`, `Cp48/56=−1`, `Cp64/72=2`, `Cp96=−1`, `Cp104=2`,
  `Cp112=0.5`, `Cp120=3`, … `Cp208=70`). The earlier "contradiction" (gearIFS `fmul [edi]`
  against `Cp0`) was a DECODE BUG, not a real-number puzzle: `fmul` against the `0x7FFF…`
  mask IS `abs()` (the SSE2 path already decodes `andpd`→abs; the x87 path mis-modeled it as
  a scalar multiply — that's unlock **U6** in the coverage spec). No offset in the corpus
  falls outside the table.
- **Next step (deterministic, S–M effort — see coverage-unlocks.md U1+U6):** (1) seed
  `constPacker.packConstBuffer` with the literal PAligned16 values at the positive offsets;
  (2) assign those KNOWN values (not random) to `Cp16+` tokens in `xcheck.mjs` /
  `generate-library.mjs` / `corpus-check.mjs` so the gate actually verifies them (random
  stays for option-region tokens); (3) add the x87 abs/negate-via-mask decode (U6). Gates
  ~80 formulas → ≥8 scenes. Triage list: `h:/tmp/mb3d-difs-scan.json` (`ok:false` rows).

### spineJulia solid-white — NOT a DE-estimator issue (investigated, `debug/probe-mb3d-bulb-sweep.mts`)

Swept estimator {0,2,3} × deBailout {4,16,100} × fudge {0.5,0.9} = 18 combos on the real
GPU: **every** combo is SOLID (nb=1.0, σ≈6). So spineJulia (a power-8 Integer-Power julia
bulb) is solid-white regardless of DE params — the ray hits a featureless surface
immediately. This is a **camera/scale/iteration** problem (the view is inside or too close,
or iterations too low for any structure), NOT a DE estimator/fudge/bailout one. Needs a
visual call on the imported camera pose / iteration count, not a DE sweep. DsyneGrafix
(sparse dust) is the overstep direction and may yet respond to a per-scene DE; not swept.

### TimeMachine — `_SphereFolding1` decompiled (`4e23b56`); now compiles, empty render

**RESOLVED (the decompile blocker).** `_SphereFolding1` is a 3-way sphere fold whose middle
case is a `jae` to the function epilogue (`fstp st(0); ret`) — abandon the fold, point
unchanged:

    R2 = mb3dRout;
    if      (R2 >= Cm16) f0 = Cm24 - R2;            // outer fold
    else if (R2 >= Cm32) /* identity — pass F(0) through */ // the jae → epilogue case
    else                 f0 = Cm40 - R2;
    f0 = f0 / R2;  x*=f0; y*=f0; zz*=f0;            // shared merge; identity when f0=R2

The decompiler now handles a non-popping compare whose forward jCC targets the epilogue by
guarding only the rest of the block (`detectBranch`, `decompile.mjs`): the taken case
leaves `F(0)=R2` on the stack and the shared `F(0)/R2` = 1.0 → identity scale. Additive
(only converts a previously-UNHANDLED pattern), cross-check-verified (`xcheck.mjs`'s
interpreter already followed the jump): **corpus 278 → 279 FAITHFUL, 0 mismatch**. Plus
`packConstBuffer` now handles option type 8 (.FOLDING: R,2R,−R,−2R + a 4-byte fn-ptr slot,
mirroring `CustomFormulas.pas:468`), which `_SphereFolding1`'s single option needs.

**TimeMachine now compiles** (was a hard `unsupported` emit error). It still renders EMPTY,
but that is a camera / multi-slot-DE-composition issue, NOT the decompile: it's a 4-slot
weave (`_FoldingOct → _SphereFolding1 → AmazingBox → Menger3`) whose DE is approximated by
Menger3's linear estimator, and an 18-combo GPU DE sweep is uniformly empty (same class as
spineJulia). Needs a visual call on the camera/iteration + better multi-slot DE composition,
not a DE-param tweak. (`_SphereFolding1` + the FOLDING packer also benefit any other scene
using them.)

### Lighting / material / colour import — DONE (2026-06-27, L0–L3)

No longer neutral grey. `parseMB3D` walks the `TLightingParas9` block (@432) and
`mapLighting.ts` (`mapMB3DLighting`, mirrors `mapCamera`) wires it into the preset:
- **L0** (`22e6482`) — parse 6 `TLight8` slots (@500), roughness, `TBpos[3..11]`, ambient/
  depth/fog colours, `LCols` palette anchors. Decoders (Double7B/ShortFloat/TRGB) verified
  vs Math3D.pas + real bytes (Torii L0 `#ffefb9` amp 0.80; ABoxScale2 white + `#722c2c`).
- **L1** (`22e6482`) — active lights → GMT LightParams. Positional → world Point; global
  (viewer-relative `BuildViewVectorFOV`) → Directional headlamp (`fixed:true`);
  object-absolute → world-fixed. Colour direct, intensity = amp·`K_LIGHT` (1.1).
- **glow OFF** (`243e339`) — the importer's old aesthetic glow WAS the Hyperben2 washout
  (white haze on deep-zoom); removed now that real lights are in.
- **L2** (`876bb8e`) — roughness (`/255`), diffuse (`TB5·0.02`), specular
  (`max(.004,(TB7&0xFFF)·0.02)`), graded env ambient from `AmbCol/AmbCol2`·`(TB8&0xFFF)/90`
  (gentle, keeps the glow-off contrast). All verified vs HeaderTrafos.pas.
- **L3** (`10aa972`) — `LCols` anchors → coloring gradient (Iterations mode), behind a
  SATURATION GATE: external-`.map` scenes leave near-grey in-header anchors (Genetic renders
  green from its `.map` but its anchors are grey), so adopt the gradient only when an anchor
  is genuinely saturated (>0.22). 14/20 adopt a real palette; 6 `.map`-driven stay neutral.

All gated on the scene having active lights → standalone loads keep DEFAULT_LIGHTS + default
material/colour. GPU-verified: LightBulbMoon warm-gold + Theli tan match their refs;
Hyperben2 reads as a clean matte-grey Menger. **Remaining:** external-`.map` hue (permanent
approximation — kept neutral, not guessed); fog (DepthCol/DynFog parsed, not applied — opaque
trackbar math). Spec: `plans/mb3d/research/lighting-import-spec.md`; ADR-0083 Update 2026-06-27.

## Verify loop

`npx tsx debug/cert-render.mts ellarien` → compare `cert/gmt/Ellarien___Shrooms_are_coming.png`
to `output/Ellarien - Shrooms are coming.jpg`. A correct result grows the mushroom
caps/stems, not just the floor. Keep gates green: `npm run typecheck`,
`test:mb3d`/`:weave`/`:map`, and the decompiler `corpus-check.mjs`.
