# MB3D Scene-Unlock Triage — 2026-06-30

**Branch:** `feat/mb3d-importer` · **Method:** GPU re-measure (`cert-render.mts`, real ANGLE/D3D11) + visual
ref-compare (18 scenes read 1:1 vs MB3D originals) + per-formula decompiler gate triage (`diag.mjs`) +
6-agent adversarial source verification against the MB3D Pascal (`/h/tmp/mb3d-src/`) and the canonical
decompiler (`/h/tmp/mb3d-decomp/`). READ-ONLY recon — no importer/decompiler source changed.

> **Why the "33/80 faithful" was stale, and what it really means.** The **import** count (scenes whose slots
> all fuse, `supported=true`) is **33** and is *unchanged* by this session's fixes — the metric/deBailout
> fixes are render-param changes, they don't add imports. What moved is the **renders-faithfully** subset of
> those 33: scenes that imported-but-rendered-blank are now correct. So the meaningful fidelity number went
> **up** while the import count held. This triage separates the two.

---

## 1. Re-measured counts (80-scene corpus)

| Bucket | Count | Notes |
|---|---|---|
| **Imports** (`supported=true`) | **33** | 32 bundled + `spineJulia` (denylisted: white interior). Unchanged. |
| — **renders FAITHFULLY** (geometry matches ref) | **~25** | the meaningful fidelity count; was ~22 floor pre-session |
| — **renders WRONG** (imports but diverges) | **~8** | 7 bundled ⚠ + spineJulia |
| Best-effort substitute (GMT formula at defaults, not MB3D math) | 2 | AboxShapes-Misty, Blood-on-the-dancefloor |
| **Blocked** (does not import) | **45** | gate-mapped in §3 |

GPU re-measure confirmed this session's recoveries: **Recycledrelatives nb 0.00→0.98**, **HalTenny-FoN
0.13→0.45**, **Jost1 0.59→0.67**; all 32 bundled now render (0 EMPTY). Wada (6 spheres) and AkuraPare
(hex ziggurat) confirmed correct from the earlier `[CONSTANTS]` fix.

---

## 2. Per-scene triage — the 32 bundled (in-app loadable) scenes

✅ = faithful geometry+framing (colour may differ by design) · ⚠ = renders but diverges (symptom → fix)

### ✅ FAITHFUL (25)
| Scene | nb | Note |
|---|---|---|
| ABoxScale2Start / ABoxScale3Start | 1.00 | Amazing Box (no ref; certified) |
| Abominog | 1.00 | fern-totems match · ⚠ colour green vs ref orange/teal (colour-import gap, separate) |
| AkuraPare | 1.00 | hex ziggurat matches (`[CONSTANTS]` win) |
| AureliusCat-Bamboo | 1.00 | cylinderIFS+Fern (certified) |
| BatJorge | 1.00 | Amazing Surf weave (certified) |
| Chrystal | 1.00 | sphere-fold + AmBox×2 (validated GOOD) |
| Dainbramage-Nothing-left | 1.00 | FoldInt sign fixed (certified) |
| Genetic Menger | 1.00 | Menger cube matches |
| Hal-Tenny-Resistance | 1.00 | SierpHilbert weave (certified) |
| InAndOutside box | 1.00 | Amazing Box |
| **Jost1** | 0.67 | temple lattice matches ✓ **recovered this session** (low nb is expected for a wireframe) |
| Lenord-Beanstalk | 1.00 | Amazing Surf (certified) |
| LightBulbMoon-Excuse / -Never | 1.00 | Amazing Surf (renders; mild dark-fg lighting) |
| MarkJayBee-Curvichrome | 1.00 | invcylindrical+SierpHilbert (certified) |
| material colors | 1.00 | material/lighting test scene (2 spheres+box — expected content) |
| Melting spot bloxx | 1.00 | 4D cube hybrid matches · ⚠ colour tint (separate lighting matter) |
| MengerTrees | 1.00 | Menger3 (certified) |
| Surreal shell | 1.00 | updateC2+ABoxMod1 shell |
| Theli-At | 1.00 | Menger-spheres subject renders detailed+faithful (banked bg over-fold caveat, §4) |
| TimeMachine | 1.00 | blue-fog atmosphere matches (certified) |
| TreePlanet | 1.00 | OctahedronIFS planet matches |
| Virtual tubes | 0.97 | cube-city matches |
| **Wada basin** | 1.00 | 6 spheres match ref's flower arrangement ✓ (`[CONSTANTS]` win) |

### ⚠ RENDERS-WRONG (7)
| Scene | nb | Symptom | Fix / status |
|---|---|---|---|
| **Recycledrelatives** | 0.98 | geometry **RECOVERED** (radiating fans + central flower match ref) but **darker + a horizontal seam** | accumulation/band-scheduler seam + lighting residual — a render-quality polish, no longer a math/blank bug. Biggest win of the session. |
| HalTenny-FoN | 0.45 | partial — radial symmetry present, ref's cone-spikes not fully resolved | improved from blank; remaining gap is DE-fidelity in the Riemann2+IntPower+FoldIntPow weave |
| Ellarien-Shrooms | 1.00 | mostly-empty tan fog wash, small shroom | lighting/framing — fog-fill dominates; Phase-8 inc[mem] fix landed but the cap growth is camera/lighting-limited |
| DsyneGrafix | 1.00 | solid tan wash (dust collapses to fog at default) | **manual est-7 + numDEeps≈0.1 recovers it** (banked — not statically auto-routable) |
| Hyperben2 | 1.00 | solid grey wash, detailed Menger subject missing | intern-AmBox **over-fold** + fog (BANKED §4) |
| QuatP4hybridJulia | 1.00 | spiky reflected structure, quaternion convergence off | intern-AmBox/quaternion **convergence** class (BANKED §4) |
| Oxnot-Shells | 0.56 | near-black despite 56% coverage | suspected **math error** (BANKED) |

**Bundled tally: 25 ✅ / 7 ⚠ / 0 blocked.**

---

## 3. The 45 blocked scenes — verified gate map

Every distinct blocking formula was triaged with `diag.mjs` (insn count, backward jumps = loops, the
UNHANDLED list) and the actionable ones adversarially verified against the MB3D Pascal source.

> ⚠ **`diag` can UNDERCOUNT** (learned this session): the decompiler silently DROPS integer ops it
> categorises as NEUTRAL — no UNHANDLED marker — so a wrong-but-"clean" decode is possible (Amazing Surf 2
> is the type case). A low UNHANDLED count is necessary, not sufficient; the emitted GLSL must also be
> checked for reads of never-assigned locals.

### Gate buckets

**(A) CHEAP decompiler-scratch / packer fixes — VERIFIED, all effort S, cross-check-gated:**
- **`fild [esi-0x18]` = `ItResultI` (iteration count), offset 64 missing from the SCRATCH map.** The MB3D
  "OTrap-on-iterations" colour idiom. Blocks **9 formulas** (TorusIFS, boardIFS, PolyPyraIFS, heartKluchIFS,
  helistairsIFS, loxodromeIFS, Seashell, trifoliumIFS, UmbrellaIFS). Trap-check PASSED — geometry/DE fully
  decode; only the (unused) orbit-trap-colour output was damaged. Fix = add offset 64 as `mb3dIter` to
  `decompile.mjs`+`xcheck.mjs` SCRATCH, map to `float(i)` GMT-side.
- **const-pack option type 15 = `DRecipSquare` (`1/max(1e-40,v²)`).** Identical shape to existing case 13/9;
  one line in `constPacker.ts`. Blocks `sphereIFS`-via-toricaleggs.
- **`_JuliaSets` `[esi]/[esi+8]/[esi+0x10]` = C1/C2/C3 input coords, offsets 0/8/16 missing from field map.**
  Add to `iterName` (decompile+xcheck). ⚠ semantic caveat: binding input-coords→`z.xyz` is exact only for
  iteration-0 pretransforms; needs a **visual check** on the woven scene (xcheck can't catch a non-first-slot
  divergence).
- **`Aexion1` `[esi-0x38]` = `J4`/Cw (4th Julia const), offset −56 missing from field map.** One-field add.
- **unsigned `ja`/`jbe`-after-`and ah,mask` jCC sync** (the decompiler lags the interpreter, which already
  evaluates these). **Measured: corpus 293→296 faithful, 0 mismatch.** Unblocks koch_surf, koch_cube,
  +IQ-bulb.

**(B) MEDIUM — engine-core / decompiler-coverage (effort M):**
- **U7 two-orbit DEcombine kernel** (mode-2 / CSG). The biggest single structural lever. See §5 for the
  *verified* recoverable set and the CSG-op caveats.
- **`_PartlyJuliaRoff`** — shares the `[esi]` fix + a 2nd blocker (interleaved-`fld` conditional-negate branch).
- **`_SinY`** scaled-index coord selector + write-dispatch; **`_Transform`** unmapped struct field `[esi+0x98]`
  (Theli-At-Black needs both).
- **`boardIFS`** is cleared by fix (A) `fild`; then gates Recycledrelatives-Test (with U7) + half of Sabine62.

**(C) HARD WALLS — separate, do not cheap-chase (effort L or out-of-band):**
- **Amazing Surf 2** — NOT the branches. IEEE-754 **field surgery in the fold body** (exponent-clamp +
  sign-carry power-of-two multiplier), silently dropped as NEUTRAL int-ops → current GLSL multiplies by an
  unassigned local. Needs promoting the model to track a float *and* its bit-pattern
  (`floatBitsToInt`/`intBitsToFloat`). L, high-risk. **Re-labelled** (was "bit-hacking in the branch").
- **HeightMapIFS (`call [esi+0x10c]`) + `_MapTranslate` (`call [edi+0x160]`)** — genuine indirect calls to
  compiled MB3D lightmap samplers (`GetMapPixelDirectXY` / `GetMapPixelSphere`) that read an **external
  bitmap from disk** (Map nr). Decompiling gains **0 scenes**; faithful render needs a **texture-asset
  pipeline** (bundle the map image, GLSL `texture()` at the call site) — a separate M-L initiative.
  - **Tool-hygiene bonus (S):** the decompiler crashes ("Maximum call stack size exceeded") on these because
    the `call` handler `parseInt`-misparses an indirect memory operand → infinite recursion. Guard it to emit
    a clean `// UNHANDLED indirect call`. 0 scenes, but it's a latent hang for the whole Map-func family.
- **Genuine loops / irreducible CFG** (backward jumps present): columnsIFS, gnarly2IFS (stack-array
  `[esp+edx]`), MengerHyper, SphCageIFS, TgladTetra, Makin4D, amazingIFS, helixIFS, TrifoxComplexAngles,
  ABoxSmoothFold, _recFold, Quadrat3D, Mandalex (conditional early-`ret` in a subroutine), _FoldingTetra3d
  (irreducible shared-tail). Each L, low yield — the U10 tier; some are permanent x-check gaps.
- **Long-tail single externals** (1 scene each, mostly forward/mem, not yet verified-cheap): ABoxSphereOffset4d,
  Quadrat3D, _FoldingTetra3d, Mandalex, ABoxSmoothFold, MengerHyper, Makin4D-p2a, TorusIFS-co `amazingIFS`,
  Aexion C/Aexion1-variants, #24184576 (unknown custom), JITTrigExample, GeneralQuat, _TranslateC4d, KaliLinCombSSE2sm.

---

## 4. Render-wrong residuals (import OK, math/render diverges) — banked, NOT push blockers

- **Intern-AmBox convergence over-fold** — Hyperben2, Theli (background slab), QuatP4. GMT's intern Amazing
  Box keeps folding where MB3D settles by ~40 iters. NOT the c-add (tried+reverted). Needs an orbit-by-orbit
  sim of GMT intern #4 vs MB3D's disassembled `_AmazingBox` `[CODE]`. Workarounds: `iterations~40` + est 4.
- **Oxnot** — suspected genuine math error. **DsyneGrafix** — dust; manual est-7 recovers.
- **Recycledrelatives darkness + horizontal seam** — NEW residual on a now-recovered scene; a render-quality
  (accumulation seam + lighting) polish, not a decode/weave bug.

---

## 5. Prioritized unlock plan (scenes-gained per fix)

### TIER 1 — cheap, verified, cross-check-gated (effort S each). Net ≈ **+7 scenes**.
| # | Fix | Effort | Scenes gained |
|---|---|---|---|
| 1 | `fild [esi-0x18]`→`ItResultI` scratch (9 formulas) | S | **Rama-Elysium** (+ unblocks boardIFS→Recycledrelatives-Test w/ U7; PolyPyraIFS w/ amazingIFS) |
| 2 | const-pack `case 15` (DRecipSquare) | S | **toricaleggs** |
| 3 | `_JuliaSets` input-coord offsets 0/8/16 ⚠visual-check | S | **Dainbramage-Hydra, JuliaSetSample** |
| 4 | `Aexion1` `[esi-0x38]`→Cw offset | S | **Aexion-10bulbs** |
| 5 | unsigned `ja/jbe`-after-`and` jCC sync | S | **Dainbramage-Home-of-the-Ancients** (koch_cube) |
| 6 | Bulbox intern #5 (radius-gated mix of ported AmBox+IntPow bulb) | S | **BulboxCut** |

→ **6 cheap edits, ~7 new faithful scenes** (~25 → ~31-32 / 80, ~40%). All cross-check-gated; #3 needs a
GPU visual pass.

### TIER 2 — medium structural (effort M). Net ≈ **+5-7 scenes**.
- **U7 two-orbit DEcombine kernel** → verified **6 RECOVERABLE** (both groups fully supported): DEcomb1,
  ExcludeBulbMeng, Mengerplus-for-MC, ThePearl-dIFS, **cutted-sphere-over-carpet** (prior note missed it),
  + Dodeca-Torus-mix. **Caveats (must implement faithfully):** the kernel needs **per-group estimator
  selection** (groups mix est 0/2/dIFS-20), and the 6 CSG ops are not all "min" — `maxInv` (op 3) is a
  signed CSG *difference*, `mixF1` (op 6) is a *sequential orbit hand-off* not a combine. A basic
  min/max/maxInv kernel faithfully renders ~5 of the 6; Dodeca-Torus needs the mixF1 path. Compounds with
  Tier-1 fix #1 to add **Recycledrelatives-Test** (boardIFS).
- `_PartlyJuliaRoff` branch fix → +ABoxPartlyJuliaRoff. `_SinY`+`_Transform` → +Theli-At-Black-Mandelbulb.

→ ~38-40 / 80 (~48-50%) after Tier 1+2.

### TIER 3 — hard walls (separate initiatives, do NOT cheap-chase)
- **Texture-asset pipeline** for HeightMapIFS/_MapTranslate lightmap samplers → +4 scenes (dIFS-shrub ×3,
  Insect-Menger). M-L, out-of-band (needs a GLSL texture seam + bundled map images).
- **IEEE-754 bit-pattern model** for Amazing Surf 2 → +3 scenes (Bill-Snowzell, Ellarien-Embellished,
  Lenord-ASurf2). L, high-risk.
- **Genuine-loop / irreducible-CFG structurer** (U10) → the loop-blocked formula tail; low yield.
- **Intern-AmBox convergence sim** → un-banks Hyperben2/Theli-bg/QuatP4 (render-wrong, not blocked).

### Realistic ceiling
The roadmap's 60/80 (75%) target is **not reachable** without Tier-3 (texture pipeline + bit-model +
two-orbit kernel + genuine-loop CFG + intern-AmBox convergence). Empirical ceiling with Tier 1+2 (cheap +
medium) ≈ **~40/80 faithful (~50%)**; pushing into the high-50s needs the texture pipeline and U7-faithful.

---

## 6. Recommended sequence
1. **Tier-1 batch** (fixes 1-6) — all S, cross-check-gated, ~7 scenes. Land #1/#2/#4/#5 first (pure
   cross-check wins), then #3 with a GPU visual pass, then #6 (Bulbox intern). Re-run `gen-sample-scenes.mjs`
   so unlocks reach the in-app list.
2. **Decompiler indirect-call crash guard** (S, tool hygiene — stops the Map-func family hanging the corpus run).
3. **U7 two-orbit kernel** (M, +5-7) — implement per-group estimators + the 6 CSG ops faithfully; visual-only,
   so GPU-cert each.
4. Tier-3 walls as deliberate, separate initiatives.

**Gates for any code that follows:** `typecheck`, `test:mb3d` (24), `test:mb3d:weave` (58), `corpus-check`
(must hold 0-mismatch; the cheap fixes raise the faithful count), `check:mb3d-decompiler`, and a real-GPU
`cert-render.mts` pass for any decode/const/DE change (cross-check has the ADR-0087 blind spot).
