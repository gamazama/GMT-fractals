# MB3D Importer — Scene-Coverage Unlock Roadmap

**Date:** 2026-06-27 · **Branch:** `feat/mb3d-importer` · **Status:** synthesis of decompiler-ceiling (Investigation A) + 80-scene corpus survey (Investigation B). READ-ONLY research; no source modified.

This document ranks the work that converts MB3D scenes from *blocked* to *importing*, ordered by **scenes-gained-per-effort**. Every number below is grounded in the two investigations; source claims I re-verified against MB3D Pascal are marked **[VERIFIED]**, downstream inferences **[INFER]**.

---

## 1. Current coverage (real numbers)

### Scenes (80-scene corpus, `M3Parameter/*.m3p`)
| Result | Count | % |
|---|---|---|
| Parsed OK (no parse failures) | 80 | 100% |
| **Imports (supported=true)** | **33** | **41%** |
| — fully fused, faithful math | **22** | 27.5% |
| — code-sub substitute (different GMT formula at defaults) | 11 | 13.75% |
| **Blocked (unsupported)** | **47** | **59%** |

**Faithful-import floor = 22/80 (27.5%).** The 11 code-subs set `supported:true` but load a *same-named GMT formula at default params* — flagged loudly in the ledger; they are not MB3D math.

### Formulas (460 `.m3f` corpus, decompiler)
| Result | Count |
|---|---|
| **FAITHFUL** (decompiled + cross-check MATCH) — shipped in `decompiled-formulas.ts` | **279** |
| MISMATCH (gate clean — nothing broken ships) | **0** |
| UNHANDLED (unmodeled pattern → skipped) | 170 |
| ERROR / NO-CODE | 8 / 3 |

Of the 279 shipped, a standalone-load probe shows **179 load standalone**, **88 blocked at load by a leftover `Cp` token**, **10 throw on an unported option type**.

### What blocks the 47 unsupported scenes (a scene can hit >1)
| n | category |
|---|---|
| **34** | external `[CODE]` never decompiled (no `DECOMPILED_FORMULAS` entry) |
| **21** | const-pack gap in a formula that IS decompiled (`Cm<off>`/`Cp<off>` packer can't resolve) |
| 8 | weave mode 2 (DEcombine/CSG) gate |
| 3 | intern #5/#6 (Bulbox / Folding Int Pow) not transpiled |
| 3 | decompiled body throws (`const-pack: unported option type 12`) |

The two dominant blockers are co-equal in count (34 vs 21) but **not in effort**: the 21 const-pack gaps have working, cross-check-clean GLSL bodies already shipped — they fail only at the packer. That makes const-pack the higher-leverage front.

### Weave-mode distribution (parsed scenes)
- **mode 0 (alternate): 69** — the only mode `emitFusedHybrid` supports
- **mode 2 (DEcombine/CSG): 11** — all blocked unless a code-sub rescues them
- mode 1 (interpolate) / mode 3 (KIFS): **0 in this corpus** → no ROI

### Used-slot-count distribution
1 slot: 28 · 2: 21 · 3: 15 · 4: 11 · 5: 4 · 6: 1. **Any** unsupported slot blocks the whole fuse, so multi-slot hybrids fail fast; single-slot scenes import best.

---

## 2. The unlock roadmap (ranked by scenes-gained-per-effort)

> Effort key: **S** = a few literals / one `case`, fully cross-check-gated, low risk · **M** = decompiler-coverage extension (regex/decode + lockstep cross-check) · **L** = general CFG / second-pointer tracking.

| # | Unlock | Formulas freed | Scenes freed (direct) | Effort | Win type |
|---|---|---|---|---|---|
| **U1** | PAligned16 positive-offset `Cp<n>` const-pack | ~80 (the fixed-table users) | **≥8** (ABoxModKali, _PolyFold-sym, Riemann2, Icosahedron/Knots/`*IFS` families) | **S–M** | **cheap, highest scene yield** |
| **U2** | `Cm88+` second-base / stack-array const-pack | transformIFS, cylinderIFS, boxIFS (the dIFS family) | **≥13** (whole dIFS-family + IFS scenes) | **M** | cheap-ish, biggest single-family scene unlock |
| **U3** | option-type-12 (`6SINGLEANGLES` = 4×4) packer case | 10 formulas (Menger4, MixPinski4, Octahedron4, …) | **3** (MixPinski4/MixPinski4ex/Sierpinski4ex) | **S** | trivial cheap win |
| **U4** | `sphereIFS` decompilation | 1 formula | **7** | **M–L** | single most-frequent hard wall |
| **U5** | forward-branch structuring (signed jCC + `fxch`-between-extract) | ~53 alone + most of 75 mixed | (multi — spreads across many blocked scenes) | **M** | biggest *formula*-count unlock |
| **U6** | abs-via-multiply x87 decode fix | a chunk of the 91 "mask-only" `Cp` leakers | (feeds U1; some scenes directly) | **S** | cheap, prerequisite for part of U1 |
| **U7** | weave mode 2 (DEcombine/CSG) emit | n/a (gate only) | **≥2 now** (Dodeca Torus mix, ThePearl dIFS — slot already supported), up to 5–8 as underlying slots unblock | **M** | unlocks a whole *mode*, compounds with U1/U2/U4 |
| **U8** | intern #6 `Folding Int Pow` transpile | 1 intern | **3** | **S–M** | cheap, self-contained |
| **U9** | complex memory (second base reg `[ebx]/[edx]`, stack-array `[esp+edx+N]`) | 41 alone / 77 total | (feeds Beth*/Msltoe/_juliax2 + ducksIFS/gnarly*IFS) | **L** | deep work, broad formula reach |
| **U10** | genuine internal loops / general CFG structuring | ~12 real (columnsIFS, MengerHyper, ABox/ASurfSmoothFold) | (few) | **L** | deep work, low yield — defer |

---

## 3. Cheap wins (do these first)

These are all **S/S–M**, cross-check-gated (so low risk of shipping bad math), and together recover the bulk of the recoverable scenes.

### U1 — PAligned16 positive-offset `Cp<n>` const-pack  ·  **THE headline fix**
**The handoff's framing is wrong, and this is correctable in ADR-0083/the handoff.** The handoff (`certification-handoff.md:248-274`) calls the `Cp<n>` gap "ambiguous: abs-mask for dIFS vs real const" and says it needs "dumping `pConstPointer16` from a running MB3D." **That is a misdiagnosis — the table is a fully-specified compile-time constant in source.**

**[VERIFIED]** `DivUtils.pas:1616-1644` defines `PAligned16` as literal compile-time doubles, and `CustomFormulas.pas:334` copies its first 216 bytes into *every* formula's const buffer:
```
CustomFormulas.pas:334:  FastMove(PAligned16^, pConstPointer16^, 216);
```
The table (from `DivUtils.pas`, verified line-for-line):
```
Cp-8  = 0.5          (SmoothIt prelude)
Cp0  / Cp8  = 0x7FFFFFFFFFFFFFFF   (abs AND-mask)
Cp16 = -2.0    Cp24 = 1e-100   Cp32 = 1.0    Cp40 = 1.0
Cp48 = -1.0    Cp56 = -1.0     Cp64 = 2.0    Cp72 = 2.0
Cp80 / Cp88 = 0x8000000000000000  (sign XOR-mask)
Cp96 = -1.0    Cp104 = 2.0   Cp112 = 0.5   Cp120 = 3.0   Cp128 = 4.0
Cp136 = 5.0    Cp144 = 6.0   Cp152 = 7.0   Cp160 = 8.0   Cp168 = 10.0
Cp176 = 15.0   Cp184 = 21.0  Cp192 = 28.0  Cp200 = 35.0  Cp208 = 70.0
```
**[VERIFIED]** Every offset above is one of these — **0 corpus formulas use an offset NOT in the table**. Roles are unambiguous by offset: `Cp0/8/80/88` are masks; `Cp16+` are plain fixed doubles.

**Why the cross-check is currently "blind":** `xcheck.mjs:293` and `generate-library.mjs:55` assign **random** values to every `C` token, so a `Cp16` that should be `-2.0` passes regardless. That is the real reason the deterministic rule (no guessing) held — but these values aren't guesses, they're in `DivUtils.pas`.

**Concrete next step (two coordinated edits, must land in lockstep):**
1. **Packer** — in `constPacker.packConstBuffer` (and `bindOptions`), seed the map with the literal PAligned16 values at the positive offsets (`map.set(16,-2); map.set(24,1e-100); map.set(32,1); … map.set(208,70)`), and the abs/neg bit-mask reals at `Cp0/8/80/88`.
2. **Cross-check sites** — `xcheck.mjs`, `generate-library.mjs`, `corpus-check.mjs`: assign these **known** values to `Cp16+` tokens instead of random (random must stay for option-region tokens only), so the gate actually *verifies* them.

**Effort:** **S–M** — ~20 literals; the work is wiring the same constants into 3 cross-check sites + 2 packer sites so they stay in lockstep. **Gates ~80 formulas** library-wide → directly recovers **≥8 scenes** (ABoxModKali ×3, _PolyFold-sym ×3, Riemann2 ×2, plus IcosahedronIFS, KnotsIFS, _ngon, CommaIFS, foldinghexIFS, totoricalIFS, hextgrid2IFS, PolyFold-symIFS, _helispiral). Note: the **91 mask-only** formulas are not all freed by U1 alone — many leak `Cp0/Cp8` via the **U6** abs-via-multiply bug, not the table.

### U3 — option-type-12 (`6SINGLEANGLES`) packer case  ·  trivial
**[VERIFIED — and Investigation A's description is wrong, corrected here]:** option type 12 is **not** "two 3×3 matrices = 18 singles." Per `CustomFormulas.pas:494-505` it is a **4×4 rotation matrix written as 16 singles**, consuming 6 option values:
```pascal
12: begin
      for j := 0 to 5 do da[j] := dOptionValues[i + j] * pid180;
      BuildRotMatrix4d(da, MS4);          // Math3D.pas:2548
      ps := @MS4[0];
      for j := 0 to 15 do begin Dec(p); p^ := ps^; Inc(ps); end;
      Inc(i, 5);                          // + the loop i++ → 6 values consumed
    end;
```
The current packer (`constPacker.ts:73`) throws `unported option type ${t}` for `t=12`. **Concrete next step:** add `case 12` mirroring `BuildRotMatrix4d` (port `Math3D.pas:2548`), writing 16 singles (4-byte each) and advancing `i += 5`. Do **not** copy the `case 6` (3×3) shape — that was the Investigation-A error. **Effort:** **S.** **Frees 10 formulas, 3 scenes** (MixPinski4/MixPinski4ex/Sierpinski4ex, which currently throw `unported option type 12 at index 5`).

### U6 — abs-via-multiply x87 decode fix  ·  cheap, partly a prerequisite for U1
**[INFER from Investigation A disasm]:** `gearIFS`/`Apollo3D-IFS`/`_ngon`/`MitreIFS` emit `f0 = f0 * Cp0` — an x87 `fmul [edi]` against the abs **bit-mask**. Multiplying by `0x7FFF…`-as-double is meaningless; the real op is `abs()` via the mask (capstone/decompiler mis-modeled it as a scalar `fmul`). The SSE2 path already recognizes the mask `andpd`→`abs`; the x87 path does not. **Next step:** teach the decompiler to recognize a mask-operand `fmul`/`fand` as `abs()` (and the XOR-mask form as negate) in the x87 path, mirroring the SSE2 handling. **Effort:** **S.** Frees a chunk of the 91 mask-only leakers that U1 alone would mis-fix.

### U8 — intern #6 `Folding Int Pow` transpile  ·  cheap, self-contained
**[VERIFIED]:** the last stubbed intern. `slotTranspiler.ts:354` (`transpileSlot`) does not handle intern #6. **Next step:** port the intern body (the only remaining stubbed intern formula). **Effort:** **S–M.** **Frees 3 scenes.**

---

## 4. Medium work (high value, do after the cheap wins)

### U2 — `Cm88+` second-base / stack-array const-pack  ·  biggest single-family scene unlock
The dIFS family's GLSL bodies are **already decompiled and cross-check-clean**; they fail only because the packer can't produce the high-offset `Cm<n>` values they read:
- `transformIFS` needs **Cm88** → blocks **6 scenes** (top blocker after sphereIFS)
- `cylinderIFS` needs **Cm88..Cm112** → **4 scenes**
- `boxIFS` needs **Cm100..Cm108** → **3 scenes**

The `dIFS heart shrub` / `dIFS shrub` / `ImpossibleWorld dIFS` scenes are wall-to-wall these. **Next step:** extend `packConstBuffer` to emit the higher option offsets these formulas read (the same option-walk already exists for low offsets; this is extending the reachable range + handling the second-base / stack-array addressing the decompiled body assumes). **Effort:** **M.** **Frees ≥13 scenes** — the largest contiguous scene unlock in the corpus. This is the single best M-tier investment.

### U4 — `sphereIFS` decompilation  ·  most-frequent hard wall
`sphereIFS` is the **#1 blocking formula (7 scenes)** and has **no `DECOMPILED_FORMULAS` entry at all**. It gates many dIFS shrub/IFS scenes. **Next step:** run it through the decompiler; triage which sub-blocker (likely branch-structuring U5 and/or the const-pack U1/U2) it actually trips, then close that. **Effort:** **M–L** depending on what it hits — but with the highest per-formula scene payoff (7) in the corpus. Do **after** U1/U2/U5 land, since one of those may free it for nearly nothing.

### U5 — forward-branch structuring  ·  biggest *formula*-count unlock
**[VERIFIED from Investigation A]:** the 230 `branch-imbalance` markers are **not** a missing opcode and **not** loops — **123 formulas have a rejected `jCC`**, only 24 a true FPU-stack imbalance. **53 formulas are blocked by this alone.** Two confirmed root causes:
1. **`detectBranch` rejects signed `jCC` after `and ah,mask`.** The regex (`decompile.mjs:267`) allows only `j(a|ae|b|be|e|ne|z|nz|c|nc|nb)` — **`jg/jle/jl/jge/jns` are excluded**, and `decodeCond`'s test/and arm (`:222-228`) maps only `je/jz/jne/jnz`. After `and ah,mask`, OF=SF=0, so `jg≡jnz`, `jle≡jz` — trivially derivable. Gates `_HopSqrt{X,Y,Z}`, `_NeoSqr{X,Y,Z}`, `_hopalong`/`_hopalm1`, `_gnarl*fast`, `koch_cube`/`koch_surf`.
2. **A stack op between `fnstsw` and the flag-extract isn't skipped.** `skipFiller` (`:233`) skips only `wait/fwait/fnop/nop`; an `fxch`/`fst st(i)` between compare and extract breaks detection (`MsltoeSym2/3/4`).

**Next step:** extend the `jCC` regex + `decodeCond` to cover signed conditions after `and ah,mask`; widen `skipFiller` to step over a balanced `fxch`/`fst st(i)` between the compare and the flag-extract. **Effort:** **M.** Fully cross-check-gated → low risk. **~53 formulas alone + a component of most of the 75 mixed** → the biggest formula-count unlock, and a likely prerequisite for U4 and several blocked multi-slot scenes.

### U7 — weave mode 2 (DEcombine / CSG) emit
`emitFusedHybrid` supports only mode 0 (alternate). **11 scenes are mode 2**; 3 are rescued by code-sub, 8 blocked. **[VERIFIED from survey]:** at least **2 mode-2 scenes have their underlying single slot already supported** (`Dodeca Torus mix`, `ThePearl dIFS` — both decompiled) → adding mode-2 emit recovers them with **zero** new formula work. As U1/U2/U4 unblock the other slots, mode-2 support compounds to recover up to 5–8. **Next step:** implement DEcombine/CSG slot combination in `emitFusedHybrid` (min/max/blend of per-slot DE). **Effort:** **M.** Mode 1/3 are **0 scenes in this corpus → do not implement.**

---

## 5. Deep work (defer — low yield or high cost)

### U9 — complex memory (second base register, stack-array indexing)  ·  L
**[VERIFIED from `mem-patterns.mjs`]:** **41 formulas blocked by mem alone, 77 total.** Breakdown: `qword [esi-N]` (63), `qword [edi-N]` (35), `qword [esp+edx+N]` stack-array (13 — `ducksIFS`/`gnarly*IFS`), and a **second base register** `[eax]/[ebx]/[edx]` the decompiler doesn't track (the `Beth*`/`Msltoe_Sym`/`_juliax2` "second-base" gap). The substance is the stack-array + second-base cases. **Effort:** **L** (track a second pointer + scaled stack indexing). Broad formula reach but no single concentrated scene cluster → after the M-tier work.

### U10 — genuine internal loops / general CFG structuring  ·  L, low yield
**[VERIFIED — corrects the handoff's "loop/cross-check wall" framing]:** only **56 formulas have a genuine backward jump**, and `detect-loops.mjs` shows just **2 are pow-by-squaring** (`ABoxSmoothFold`, `ASurfSmoothFold`) and **0 are clean counted loops**. The other ~54 backward jumps are **block-reorder gotos, not loops** (`_BPolygon*`, `_Cond*`, `Quadrat3D`, `Makin4D`, the `Tglad*` family) — structurable control flow, recoverable by a general out-of-line/diamond-CFG reconstructor extending the existing `detectOOL` (`decompile.mjs:391`). A true data-dependent iteration count genuinely can't cross-check against straight-line GLSL, but that affects **only ~12 formulas** (`columnsIFS`, `MengerHyper`). **Effort:** **L**, **low yield** → defer or accept as permanent gaps.

---

## 6. Recommended sequence

1. **U3** (S, +3 scenes) — trivial `case 12`, mirror `BuildRotMatrix4d`.
2. **U6** (S) — abs-via-multiply x87 fix; prerequisite for part of U1.
3. **U1** (S–M, +≥8 scenes, ~80 formulas) — PAligned16 table emit + cross-check lockstep. **Correct ADR-0083 / the handoff**: the gap is deterministic, no runtime dump needed.
4. **U8** (S–M, +3 scenes) — intern #6.
5. **U2** (M, +≥13 scenes) — the dIFS-family `Cm88+` packer. **Single best scene ROI.**
6. **U5** (M, ~53 formulas) — forward-branch structuring; likely unblocks part of U4 and several blocked multi-slot scenes for free.
7. **U7** (M, +2 now, more later) — weave mode 2.
8. **U4** (M–L, +7 scenes) — `sphereIFS`; re-triage after U1/U2/U5 (may be nearly free).
9. **U9 / U10** (L) — second-base mem and CFG structuring; defer.

**Projected faithful-import trajectory:** cheap wins (U1+U3+U6+U8) ≈ **22 → ~33 faithful scenes**; add the M-tier (U2+U5+U7+U4) ≈ **→ ~48+ scenes (60%+)**. The remaining ~12 loop-blocked formulas are the genuine, narrow ceiling.

## 7. Doc corrections this synthesis surfaced (for ADR-0083 / certification-handoff)
- **`Cp<n>` const-pack is NOT "ambiguous / needs a runtime dump."** It is the fully-specified PAligned16 table at `DivUtils.pas:1616-1644`, copied per-formula at `CustomFormulas.pas:334`. Deterministic; ~80 formulas; the cross-check is blind today only because the harness randomizes those tokens.
- **The "control-flow / cross-check wall" is overwhelmingly forward-branch structuring (~53 formulas, a decompiler-coverage fix), not loops.** Genuine iteration is ~12 formulas. The wall is real but narrow.
- **Option type 12 = a 4×4 matrix (16 singles, 6 values consumed via `BuildRotMatrix4d`), not two 3×3 matrices.** Mirror `Math3D.pas:2548`, not `case 6`.
