# Mandelbulb3D → GMT importer

Loads Mandelbulb3D (MB3D, [thargor6/mb3d](https://github.com/thargor6/mb3d), Delphi/x87) scenes
into GMT. Built 2026-06-25. **Philosophy: deterministic-from-source** — reproduce MB3D's
*actual* math, never guess or rely on GMT's same-named formulas matching by name (the audit
proved most don't). See [`formula-discrepancies.md`](./formula-discrepancies.md) and ADR-0083.

> **Numbers below are STALE (as of 2026-06-27).** Live figures: **278/279** decompiled formulas
> faithful (0 cross-check mismatch), **180** standalone-library GOOD, **20** bundled sample scenes
> (spineJulia removed), **22/80** corpus scenes import faithfully. The "221"/"283"/"21" counts in
> this doc predate Phases 5–10. For the live plan see `research/ROADMAP.md`,
> `research/coverage-unlocks.md`, and `research/fidelity-pass-SESSION.md`. Camera + lighting L0–L3,
> surface refinement (ADR-0084), and the numerical DE estimator (ADR-0085) have all since shipped.

## Pipeline

```
paste/.m3p  → parseMB3D ──→ emitFusedHybrid ──→ loadScene
                              ├─ buildWeaveSequence  (MB3D hybrid cursor → GLSL slot order)
                              ├─ transpileSlot[]     (per slot → GLSL body)
                              │    ├─ intern #0–#4   hand-transpiled from CustomFormulas.pas
                              │    └─ external [CODE] x87-decompiled (decompiled-formulas.ts)
                              ├─ constPacker         (.m3f options → Cm<offset> consts / uniforms)
                              └─ mapDEMeta           (.m3f DEscale/DEoption/RStop → quality)
```

## Runtime modules (`engine-gmt/utils/mb3d/`)

| File | Role |
|---|---|
| `parseMB3D.ts` | Decode the `Mandelbulb3Dv18{…}` text block (custom base64 → packed 840-byte `TMandHeader10` + `THeaderCustomAddon`) **and** raw binary `.m3p` (`parseMB3DBinary`). Byte layout verified vs 32 real blocks. |
| `weaveSequencer.ts` | Port of MB3D `doHybridPas` — precompute the per-iteration slot order → a GLSL `const int` LUT (`weaveSlot(i)`). Mode 0 (ALTERNATE) only. |
| `slotTranspiler.ts` | One slot → GLSL. Intern #0–#4 from MB3D math; external `[CODE]` from the decompiled library; single-slot = parametric (uniforms + sliders). Multi-slot also parametric when it fits the shared `LaneAllocator` (else baked literals). |
| `emitFusedHybrid.ts` | Fuse the slot stack into ONE runtime `FractalDefinition` whose loopBody switches on the iteration index `i`. Seeds 4D `w` for Quaternion; applies decompiled DE meta. Multi-slot params: a cross-slot `LaneAllocator` (24 scalar lanes + up to 6 vec3-shaped units) threads a distinct uniform to each slot's options, packing surplus scalars into idle uVec2*/uVec4* lanes and surplus vec3s into uVec4* `.xyz` holders. |
| `constPacker.ts` | Port of `FillCustomVBufWithVars` + `BuildRotMatrix`: option values → `Cm<offset>` constants. `bindOptions` = parametric — allocates via the shared `LaneAllocator`/`ScalarParamPacker` (`utils/uniformSlots.ts`): scalars dense-pack paramA..F → uVec2*/uVec4* component lanes (combined vec sliders), 3-angle rotations → uVec3* + in-shader `mb3dRot`. `mapDEMeta` = DE settings → quality. |
| `utils/uniformSlots.ts` | **Shared** (with the Formula Workshop). GMT's uniform-slot vocabulary + `slotToUniform` + occupancy algebra (`getSlotOccupancy`/`buildOccupancyMap`/`isSlotConflict`) + `LaneAllocator` (dense 24-scalar-lane cursor + vec3 pool that overflows uVec3*→uVec4* `.xyz` holders, sharing the uVec4 units with scalar-packing) + `ScalarParamPacker` (groups vec-lane scalars into one combined vec slider per base). |
| `decompiled-formulas.ts` | **AUTO-GENERATED.** 221 cross-check-verified x87-decompiled `[CODE]` formula bodies + option metadata + DE meta + default option layout (`DECOMPILED_DEFAULTS`, for standalone loading). |
| `loadMB3DScene.ts` | Thin sink: parse → emit → register → `loadScene`. `loadMB3DScene(text)` + `loadMB3DSceneBytes(.m3p)` + **`loadDecompiledFormula(name)` / `loadInternFormula(idx)`** (standalone single-formula load — synthesizes a one-slot scene at authored defaults). |
| `mb3dCatalog.ts` | Browsable catalog of standalone-loadable formulas (intern + decompiled, filtered by a dry-run transpile so no listed entry fails on click), grouped by a name-derived category. |
| `mapFormula.ts`, `mapScene.ts` | **SUPERSEDED** by the weave path (their Mandelbulb mapping was wrong — GMT Mandelbulb ≠ MB3D Integer Power). Dead except their test; safe to delete. |

UI: `components/panels/formula/ImportMandelbulb3DModal.tsx` — a searchable **formula library**
(click any of the 180 standalone-renderable formulas to load it at its defaults) + scene paste / "Load
.m3p file…". Wired into `FormulaSelect.tsx` (formula menu → Import → "Import Mandelbulb3D…").

## The x87 `[CODE]` decompiler

MB3D ships ~457 external formulas as compiled **x86/x87 machine code** (`[CODE]` blocks), not source.
We decompile them offline (Capstone disassembly → a symbolic x87→GLSL translator) and ship only the
GLSL. Tooling in [`decompiler/`](./decompiler/) (needs the MB3D clone + `npm i capstone-wasm`):

- `decompile.mjs` — x87 bytes → GLSL (FPU stack as mutable `f0..f7`; arithmetic + transcendentals + integer-mem FPU ops + local stack memory). **GP-register abstract interpretation**: each register is tracked as a tagged value (`{coord i}` = x/y/z/w pointer, `{iter o}` = PIteration3D+o, `{var o}` = const-buffer+o, `{int v}`, **`{gpval e}` = a GLSL integer expression**) through `mov`/`add`/`sub`/`lea`/`inc`/`dec`, so `mov edi,[esi+0x30]; add edi,0x80; [edi+0x48]` resolves to **PIteration3D+0xC8 = the per-iteration scratch field VaryScale**. **GP-integer-value tracking** (`{gpval}`): `mov reg,[const/local]` → `int(<ref>)`, folding `and`/`or`/`xor`/`shl`/`sar`/`add`/`sub`/`neg` into the expr; then `and reg,imm; jCC` / `test reg,reg|imm; jCC` / `cmp reg,imm; jCC` emit GLSL option-flag branches (`if ((<e> & imm) != 0)` …) — unlocking the loop-free GP-integer-conditional formulas (`_ngon`, `_PolyFold-sym`, `_updateC2`, the parity sign-flip idiom). `fcom`/`fnstsw` branch detection now skips an intervening `fwait`/`nop`, and the `shr ah,1` extract decodes the jump as **CF-only** (`jb`/`jbe`→`a<b`, `jae`/`ja`→`a>=b`). **x87 flag gotcha (the `_updateC2` / Genetic-Menger c-modulation fix):** `shr ah,1` cleanly extracts only CF=C0=(a<b); its ZF reflects `(ah>>1)==0`, but **AH bits 3-5 hold the FPU TOP field** — nonzero at every real `fcom` site (operands on the stack) — so ZF is effectively *always 0*, collapsing `jbe`→`jb` and `ja`→`jae`. The earlier model assumed TOP=0 → ZF=!C3, which turned `if (a<b) swap` guards (like `_updateC2`'s clamp) into dead **swap-on-equality** — the formula did nothing and the c-modulated Menger went uniform. `xcheck.mjs`'s interpreter was wrong the same way, so the corpus cross-check stayed green while the formula was inert; **both are now fixed to model ZF=0**, keeping the cross-check valid *and* the math correct (corpus stays 278/0-mismatch). The fix is systemic — it applies to every formula using this idiom, not just `_updateC2`. `_updateC2`'s conditional `swap(x, Cx)` is a reflection across `x=Cx` (an isometry, like a Menger/Sierpinski fold), so it correctly never updates `dr`; the base `MengerIFS` linear DE (`DEoption 2`, scale 0.2) renders it crisp at the faithful scale. `[PIter+0x18/0x20/0x28]` decode as **`c.x`/`c.y`/`c.z`** (the iteration constant); the TIteration3D scratch fields (VaryScale@200, bFirstIt@208, Dfree1/2, …) decode as persistent **scratch vars** (`mb3dVary`/`mb3dFirst`/…) — emitted as `loopInit` declarations + `inout` params (the engine already carries them across iterations, like Phoenix). **Structures forward conditional branches** (FPU compare → `fnstsw` → flag-extract → `jCC` diamond, AND integer option-flag `cmp [mem],imm; jCC`) into GLSL `if/else` via a recursive range-processor with FPU-stack-balance checking. The branch detector skips an intervening `fstp st(0)` between the flag-extract and the `jCC` (the common `ftst; fnstsw; sahf; fstp st(0); jCC` pop-the-tested-value idiom, folding its pop into popN), and the else-block detector skips padding nops between the then-block's terminating `jmp <merge>` and the else-block start. **Gap A** — the detector also steps over a flag-neutral `fld [mem]` scheduled *between* `fnstsw` and the flag-extract (the compiler preloads a value the taken branch consumes, e.g. `_PartlyJuliaRoff` `fcompp; fnstsw; fld [edi]; and ah,0x41; jne` / `ABoxSphereOffset4d` `fcomp st(1); fnstsw; fld [esi-0x10]; shr ah,1; jb`): unlike the depth-neutral `fxch`/`fst` interior ops it's a stack PUSH, but the same `interior` path is correct — it overwrites the now-popped compared temp, so the capLines snapshot (built because interior is non-empty) preserves the compared values and `emitBranch`'s `run(idx,idx+1)` emits the push with the proper `top++`. Memory operand only (`mem(o)` is top-independent). Additive: corpus **333→335 faithful, 0 mismatch** (unlocks `_PartlyJuliaRoff` + `ABoxSphereOffset4d`, and any formula with the same instruction scheduling). **Inlines internal `call`/`ret`** (the callee is run inline at the call site; the FPU stack is the arg/return channel) and skips unconditional forward `jmp`s. **Structures out-of-line conditional tail blocks** (`detectOOL`): MB3D's compiler hoists the unconditional path to a merge point M and parks the conditional extra work at the tail, reached by a forward `jCC` and returning via a backward `jmp M` — emitted as `if (taken) { <ool> }` then fall-through to M (no duplication / `return`; regs+top snapshot/restore around the ool). This unlocks the block-reorder "backward jump" formulas (`totoricalIFS`, …) — most of the corpus's backward jumps are reordered gotos, not loops. **dIFS sub-formula preamble seeding**: hybrid-caller sub-formulas (`transformIFS`, `PolyFold*IFS`, the folding/tiling IFS, …) have no `mov <reg>,[ebp+8]` preamble — the caller presets esi/edi. Per `TIteration3Dext`, seed esi = struct+88 (x/y/z/w at `[esi-0x78/-0x70/-0x68/-0x60]` = struct −32..−8, VaryScale at `[esi+0x70]`) and edi = PVar, so the body decompiles. **Genuine loops** (counted `dec reg; jnz`, pow-by-squaring `shr; jne`) left UNHANDLED — they're only ~5 x87 formulas and face a cross-check wall: the loop *count* is an integer option const, but the random-double cross-check harness makes `int(Cm)` in GLSL diverge from the faithful interpreter's byte-decrement, so they can't be verified to 0 mismatch without compromising the independent referee. **SSE2 DECOMPILE PATH (DONE):** a parallel **xmm register file** (8 regs × 2 double lanes `x<n>l`/`x<n>h`, materialized like the f0..f7 FPU temps). Packed ops (`addpd`/`mulpd`/`maxpd`/`minpd`/…) act on both lanes, scalar (`addsd`/…) on the low lane; a packed memory operand `[base]` pulls TWO adjacent doubles (`[base]`,`[base+8]`) — for coords `(x,y)` then `(z,w)`, for the const buffer two adjacent `Cm`/`Cp`. Loads/stores (`movupd`/`movapd`/`movsd`/`movhpd`/`movlpd`/`movddup`), shuffles (`pshufd`/`shufpd`/`unpck[lh]pd`/`haddpd` — qword-clean lane permutations), and `ucomisd`→CF/ZF branches (interior flag-neutral moves run unconditionally, compared lanes snapshotted so a reassign can't corrupt them) are modelled; the box-fold is BRANCHLESS via `maxpd`/`minpd`. **andpd→abs / xorpd→negate**: per `DivUtils.pas` the global SIMD table `[PVar+0/+8]` holds the abs AND-mask, `[PVar+80/+88]` the sign-flip XOR-mask, so those bitwise ops decode to `abs()`/negate (they can't be random consts). **Scaled-index addressing** `[esi+eax*8-0x80]` (the orbit-trap source selector) decodes to a GLSL ternary over the `eax&3` gpval index selecting `{RStopD,x,y,z}` (TIteration3Dext `decompiler_off = ext_offset − 56`; Rout@112 = the IFS DE distance, RStopD@16). The interpreter mirrors every op numerically as `[lo,hi]` pairs — the independent referee, so SSE2 is FULLY cross-checkable (xmm lanes are doubles; no integer-count loop-wall). **Genuine loops** (counted `dec;jnz`, e.g. `columnsIFS`'s column-fold) still hit the cross-check wall. The const harness range was widened to `(-4,4)` so int-cast option flags (`int(Cm)&3`) exercise all 4 orbit-trap ternary branches.
- `xcheck.mjs` — **the correctness guarantee.** A faithful numeric x87 interpreter (independent of the GLSL emitter) vs the decompiled GLSL on random inputs. Validated: 0/12000 on a correct decompile, 6000/12000 with a deliberate bug. Binds GLSL builtins (`sin/cos/sqrt/atan2/exp2/log2/…`) + `Cm`/`Cp` consts — so transcendental formulas are now actually cross-checked (the earlier harness skipped them, hiding ~33).
- `generate-library.mjs` — decompiles all `.m3f`, cross-checks each, emits ONLY verified-faithful ones to `decompiled-formulas.ts` (GLSL + option metadata + DE + default option layout).
- `corpus-check.mjs` — coverage triage over the whole corpus. `triage-categories.mjs` / `bucket-examples.mjs` — classify the UNHANDLED set by blocking reason (control-flow / SSE2 / complex-mem / other-x87). `dis.mjs <Name>` — inspect one formula's disassembly + decompiler output.

**Regenerate:** clone thargor6/mb3d to `h:/tmp/mb3d-src`, `cd plans/mb3d/decompiler`, `npm i capstone-wasm`, `node generate-library.mjs`.

## Coverage (2026-06-26)

| Tier | What | Count |
|---|---|---|
| **Faithful** | Intern #0–#4 (Integer/Real Power, Quaternion, Tricorn, Amazing Box) + **278 cross-check-verified decompiled `[CODE]`** (x87 + **SSE2**: IFS/Menger/Sierpinski, the Amazing Box family incl. **the VaryScale/SmoothFold per-iteration-state variants**, transforms, inversions, mappings, brots/powers, dynamical systems, `_Fold45*` helpers, **GP-integer-conditional** `_ngon`/`_PolyFold-sym`/`_updateC2`, the **dIFS preamble-seeded sub-formulas**, the **out-of-line-goto-structured** `totoricalIFS`/`_Fold45double`, and the **SSE2 *IFS family** `boxIFS`/`SphereIFS`/`cylinderIFS`/`PSphereIFS`/`RoundedBox` + `gyroidIFS`/`schwartzIFS`/`koch_oct`/`tetratubeIFS`/`gear|gumdrop|discoball|lidinoid|wavesp|cubetube|toupie|tritgridIFS` and the `_AmazingBoxSSE2` model case) | 283 |
| **Standalone-loadable** | of the above, the ones that transpile cleanly at defaults AND render visible structure (render-triaged via `debug/probe-mb3d-triage.mts` — **180 GOOD / 0 black / 0 empty**) — exposed in the import-modal library | **180** |
| **Sample scenes** | real `.m3p` hybrid scenes that weave faithfully (every slot decompiles, mode 0), bundled into the modal | **21** |
| Unsupported | multi-slot hybrids with an unhandled slot; weave modes 1–3; formulas reading the positive-offset PAligned16 fixed-double table (`Cp<n>`) the const-packer doesn't yet provide | — |

Mode-0 hybrids of supported slots weave faithfully (the decompiled **transforms** — `_Rotate`, `_Abs*`,
`_Flip*`, `_BenesiT*` — unlock many hybrid scenes). Decompiler triage: **278 faithful, 0 mismatch**, 171
UNHANDLED, 8 error, 3 no-code. Per-iteration STATE, GP-integer-conditional branches, dIFS preamble seeding,
out-of-line goto-structuring all DONE (see the decompiler bullet). **SSE2 decompile path DONE (+57 from 221):**
the parallel xmm model (lanes, packed/scalar arith, shuffles, `ucomisd` branches, andpd/xorpd mask→abs/negate,
scaled-index orbit-trap) — unlocked the **SSE2 *IFS family** (`boxIFS`/`SphereIFS`/`cylinderIFS`/`PSphereIFS`/`RoundedBox`
+ ~50 more SSE2-only formulas). The ~171 remaining: **genuine loops** (counted `dec;jnz` + pow-by-squaring `shr;jne` —
`columnsIFS`'s column-fold, `ABoxSmoothFold`, etc., blocked by the cross-check verifiability wall: the loop *count* is an
integer const that `int(Cm)` in GLSL evaluates differently from the faithful interpreter's byte-decrement under the
random-double harness, so 0-mismatch can't be reached without weakening the referee); **second-base / stack-array memory**
(`[ebx]`/`[esp+edx]`/`[eax+esi*N]` — Beth/ducksIFS/gnarlyIFS/sine-LUT families); **multi-way / cascade branches**
(`fcomp; ja; je` 3-way sign dispatch e.g. `Quadrat3D`; signed `jg`/`jl` compares; irreducible cross-block gotos like
`amazingIFS`); **fixed const-buffer values** above the base that `packConstBuffer` doesn't write (the `_BenesiT*` /
preamble-SSE2 `Cp` formulas); **IEEE-754 bit-hacking** (Amazing Surf 2 manipulates double exponent/sign dwords directly).

## Tests

`npm run test:mb3d` (parser, 24/24) · `test:mb3d:weave` (weave + decompile +
params + **all-catalog emit coverage**, 42/42) · `check:mb3d-decompiler` (repo `decompile.mjs`/`xcheck.mjs` ==
canonical `H:/GMT/stuff/mb3d-decomp/` — drift guard). The legacy `test:mb3d:map` was removed with the superseded
`mapFormula.ts`/`mapScene.ts` (2026-06-27, Stage 0). Render-triage (needs vite:5173): `debug/probe-mb3d-triage.mts`
renders every catalog formula standalone and buckets by render coverage (**180 GOOD / 0 black / 0 empty** — the SSE2
*IFS family all render visible structure, no new denylist entries; a handful of borderline transform-style formulas
flip between GOOD/FLAT/EMPTY run-to-run under SwiftShader's convergence timing — that churn is baseline noise, not a
regression). `debug/probe-mb3d-campose.mts` (needs vite:5173) renders the asymmetric scenes with the imported camera
+ a non-flipped comparison, to verify the Z-flip handedness. `mem-patterns.mjs` histograms the remaining
unhandled memory-operand + opcode forms.

## Next steps (priority order)

1. **Backward-jump bucket — LARGELY DONE.** Of the 57 backward-jump formulas, the dominant content turned out to be
   *block-reorder gotos* (a tail/merge block hoisted before the conditional extra work, reached by a forward `jCC` +
   a backward `jmp` to the merge), not genuine loops. Those are now structured (`detectOOL` + the `fstp st(0)`
   branch-skip + nop-skip else-detection, +6: `totoricalIFS`, `_Fold45double`, …), and the no-preamble dIFS
   sub-formulas are seeded (+17). What's LEFT here, and why each is hard:
   - **Genuine counted loops** (`dec reg; jnz`, e.g. `BT1Pine`/`BT1Pinehedron`) + **pow-by-squaring** (`shr; jne`,
     e.g. `ABoxSmoothFold`/`ASurfSmoothFold`) — only ~5 x87 formulas. **Blocked by a cross-check verifiability wall**:
     the loop count is an integer option const, but the random-double cross-check harness makes a GLSL `int(Cm)` bound
     diverge from the faithful interpreter's literal byte-decrement (`mov al,[mem]; dec al; jne`), so they can't reach
     0 mismatch without feeding the harness integer counts (a gate change that weakens the independent referee).
     To pursue: teach `corpus-check`/`isFaithful` to detect a formula's loop-bound const and supply a small positive
     integer for it (and the interpreter byte-counter + decompiler bounded-`for`). Pow-by-squaring additionally needs
     the `test [ptr+7],0x80; jns; fchs` copysign idiom + push/pop register-save.
   - **Cascade / multi-way + irreducible** — `fcomp; ja; je` 3-way sign dispatch (`Quadrat3D`/`Quad3Db`), signed
     `jg`/`jl` integer compares (`hyperd_1`/`PG-bulb`), and irreducible cross-block gotos where a branch jumps *past*
     the shared exit (`amazingIFS`). Need a real n-way / tail-duplication structurer.
3. **SSE2 decompiler path — DONE (+57: 221→278 faithful, 0 mismatch).** Parallel xmm model (lanes, packed/scalar
   arith, shuffles, `ucomisd` branches, andpd/xorpd mask→abs/negate, scaled-index orbit-trap) — see the decompiler
   bullet. Unlocked the **SSE2 *IFS family** (`boxIFS`/`SphereIFS`/`cylinderIFS`/`PSphereIFS`/`RoundedBox` + ~50 SSE2-only
   formulas; `columnsIFS` remains loop-blocked). The app-side `2Doubles` const-pack fix (one authored value → both packed
   lanes, `constPacker.ts` case 14) + the `2Doubles`/`INTEGER`/`DReci2`/`SReci2`/`DSQUARE`/`DRecipro` `TYPE_MAP` entries
   made them loadable (library 146→**180 GOOD**, scenes 18→**21**). What's LEFT: many remaining SSE2 are x87 duplicates
   (net-new is small now); the genuine-loop ones hit the cross-check wall (step 1).
4. **Fixed const-buffer values (`Cp<n>` positive offsets)** — the `_BenesiT*` family AND the preamble-SSE2 holdouts
   (`schwartzIFS`/`_AmazingBoxSSE2`, a few `Cp` scenes) read the global SIMD table `[PVar+16/+32/+48/…]` (the `DivUtils.pas`
   `PAligned16` fixed doubles: −2, 1, −1, 2, 0.5, 3..70) that `packConstBuffer` doesn't write. **Ambiguity to resolve
   first:** `Cp0` decodes as the abs-mask for dIFS formulas (edi=PVar, consumed by `andpd`→abs) but as a real formula
   const at `PVar+0` for preamble formulas (esi=PVar). Port the `PAligned16` table into a `CP_TABLE` resolver, keyed on
   whether the slot is dIFS-style. ~4–11 scenes + 2 formulas blocked here. (Type 12 `6SingleAngles` also needs a 4×4
   `BuildRotMatrix4d` port in `packConstBuffer` — 2 scenes.)
5. **Sub-formula preambles** — DONE (the dIFS esi=struct+88 / edi=PVar seeding, +17). The remaining no-preamble
   x87 holdouts are image-map formulas (`HeightMapIFS`/`SphereHeightMap`/`*HMVoid` — sample a map texture via
   `PMapFunc`, not replicable) and the cascade/3-way-branch ones (`Apollo2D-IFS`, `foldinginfyIFS` clear; see step 1).
   **Note**: unlocking these formulas grows the standalone *library* (136→146) but not the *scene* count (still 18) —
   the `*IFS` scenes have additional blockers (const-pack missing Cp0/Cp8 above the base, weave modes 1–3), and the
   big `boxIFS`/`sphereIFS`/`cylinderIFS`/`columnsIFS` family is SSE2 (step 3).
6. **Second-base / indexed memory** — `[ebx+off]` (Beth family), `[esp+edx]` / `[esi+eax*8]` IFS arrays.
6. **Camera pose — DONE** (`mapCamera.ts`, ADR-0083). The MB3D scene camera (zoom → world-units-per-pixel,
   `wRotX/Y/Z` RADIANS → view basis via `CalcVGradsFromHeader8rots`, `dZstart`/`midZ` → orbit `dist`, `fovY`
   degrees → `optics.camFov`) maps onto a GMT Orbit pose. Handedness: MB3D is LEFT-handed (+Z into screen), so
   every world vector's Z is negated before the THREE `lookAt` → quaternion (verified on asymmetric scenes —
   spineJulia / TreePlanet / Surreal shell render correctly framed and NOT mirrored; the non-flipped variant
   leaves Surreal shell empty). Degenerate headers (zoom ≤ 0 / NaN / dist ≤ 0) fall back to the centered default.
   **Lighting + colour mapping still pending** — lights/colour use the neutral scaffold defaults (you re-light).
7. **Weave modes 1–3** (interpolate / DEcombine-CSG / KIFS) — DE composition, not just ordering.
8. **Productionize tooling** — move `decompiler/` to a build step + `capstone-wasm` devDep (regen needs the clone).
9. **Cleanup** — delete superseded `mapFormula.ts`/`mapScene.ts` + `test-mb3d-map.mts`.
10. **`_flipC-xyz`** — RESOLVED: now cross-checks faithful (0 mismatch) and ships in the library. (The earlier
    "fails cross-check" note was stale — the formula passes under the current interpreter.)
