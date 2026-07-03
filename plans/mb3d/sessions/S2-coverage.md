# Session: MB3D Stage 2 — coverage cheap wins (U3 · U6 · U1 · U8)

**Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable` · **Plan:** `COMPLETION-PLAN.md` · **Tracker:** `EXECUTION-STATUS.md`
**Detailed spec:** `plans/mb3d/research/coverage-unlocks.md` §3 (READ IT — this prompt is the execution layer; anchors below were refreshed by an orchestrator recon and are current).

You are widening MB3D scene coverage. Four low-risk, cross-check-gated unlocks move the faithful-import
floor from **22/80 → ~33/80**. Geometry correctness is the bar; commit per unlock; do not push.

## Where we are (baseline to beat)
- Formulas FAITHFUL: **279 / 0 mismatch** · standalone library GOOD: **180** · corpus scenes faithful: **22/80**.
- **Re-baseline at the end:** `npx tsx debug/probe-mb3d-triage.mts` (standalone library GOOD count) and
  `npx tsx debug/scan-mb3d-scenes.mts` (corpus faithful scenes). Update `EXECUTION-STATUS.md` baseline.

## Ground rules
- **Gates green between commits:** `npm run typecheck`, `test:mb3d`(24), `test:mb3d:weave`(42),
  `test:refine`(46), the decompiler `corpus-check.mjs` (**≥279 / 0 mismatch**), `npm run check:mb3d-decompiler`.
- **Real GPU only** for render-triage / scene cert (headed Chrome → ANGLE), never SwiftShader.
- **Decompiler edits (U6, U1) happen at the canonical `/h/tmp/mb3d-decomp/`, not the repo copy** (it has
  `node_modules/capstone-wasm`). Regen workflow below. The drift guard now covers all four `.mjs`.
- Cross-check is the correctness gate — if `corpus-check.mjs` shows any MISMATCH, the decompiler and interpreter
  diverged; fix before committing. Nothing bad-math ships as long as 0 mismatch holds.

## Order: U3 → U6 → U1 → U8
(U3/U8 are isolated app-side — safe anytime. U6 before U1: U6 splits the abs/sign masks off so U1's table
seed is purely real constants. U8 last, grouped as the final cheap win.)

---

## U3 — option-type-12 (4×4 rotation matrix) packer case · APP-SIDE · +3 scenes
`constPacker.ts:73` (`default: throw … unported option type ${t}`) throws for `t=12`. Add `case 12` before it,
mirroring the existing `case 6` (3×3) shape but writing **16 singles** and advancing `i += 5`.

**MB3D source to port** [`CustomFormulas.pas:494-505`]:
```pascal
12: begin
      for j := 0 to 5 do da[j] := dOptionValues[i + j] * pid180;   // 6 angles, deg→rad
      BuildRotMatrix4d(da, MS4);                                   // Math3D.pas:2548
      ps := @MS4[0]; for j := 0 to 15 do begin Dec(p); p^ := ps^; Inc(ps); end;  // 16 singles, downward
      Inc(i, 5);                                                   // +outer i++ = 6 values consumed
    end;
```
**`BuildRotMatrix4d`** [`Math3D.pas:2548-2568`] composes 6 plane rotations (plane index tables
`i1=(1,0,0,0,1,2)`, `i2=(2,2,1,3,3,3)`); each step `ms4 ← SM4_i · ms4` (LEFT-multiply, identity start).
⚠ **GOTCHA:** the Pascal does `Multiply2SMatrix4(@SM4,@ms4)` (writes product into SM4) then `ms4 := SM4` — the
product IS retained. Port a `mb3dRotMatrix4d(angles[6]) → float[16]` TS helper verbatim (left-multiply
accumulation); do NOT "simplify" the double-assignment or you'll change the composition order. Write the 16
floats in the same memory order the decompiled body reads (descending `Cm` offsets, matching `case 6`).
**Frees:** MixPinski4 / MixPinski4ex / Sierpinski4ex (currently throw `unported option type 12 at index 5`).
**No cross-check guards app-side packing** → **visually verify MixPinski4 against its MB3D ref** (a mis-ordered
matrix renders geometry-wrong but trips no gate).

---

## U6 — abs-via-multiply x87 decode fix · DECOMPILER + CROSS-CHECK · prereq for part of U1
The SSE2 path already decodes the abs/sign bit-masks; the x87 path mis-models a mask-operand `fmul` as a
scalar multiply by a meaningless `0x7FFF…`-as-double. Mirror the SSE2 handling into x87.

**Reference (SSE2, already correct)** [`decompile.mjs:165-171`]: `andpd/andps` vs operand resolving to
`Cp0`/`Cp8` → `abs(...)`; `xorpd/xorps` vs `Cp80`/`Cp88` → `-(...)` (uses `memVar`, no const registration).
Interpreter mirror [`xcheck.mjs:108-113`]: keys `p0`/`p8` → `Math.abs`, `p80`/`p88` → negate.

**Edit (lockstep, both files at `/h/tmp/mb3d-decomp/`):**
- `decompile.mjs` ARITH block (~`:486-491`), in the memory-operand arm (the `else emit(...)` ~`:490`):
  **before** falling through to `mem(o)` (which registers the const), resolve side-effect-free via `memVar(o)`;
  if it's `'Cp0'`/`'Cp8'` and `m==='fmul'` → `emit(\`${F(0)} = abs(${F(0)});\`); continue;` if `'Cp80'`/`'Cp88'`
  and `m==='fmul'` → `emit(\`${F(0)} = -(${F(0)});\`); continue;`
- `xcheck.mjs` ARITH block (~`:213-219`), mem arm (~`:217`): `resolve(o)`; if `s.k==='const'` key `p0`/`p8` &&
  `m==='fmul'` → `st[S(0)] = Math.abs(st[S(0)])`; `p80`/`p88` → negate; `continue` (skip the numeric `memRead`).
Discriminate strictly on the four fixed PVar offsets, only when the base reg is the PVar pointer (`r.t==='var'`).
Then run the regen workflow. **Frees** mask-only leakers (`gearIFS`, `Apollo3D-IFS`, `_ngon`, `MitreIFS`, …) +
de-risks U1. Corpus should hold ≥279 / 0 mismatch (the mask offsets are no longer multiplied → both sides branch
identically).

---

## U1 — PAligned16 positive-offset `Cp<n>` const-pack · APP-SIDE + CROSS-CHECK · +≥8 scenes
`Cp<n>` tokens currently survive into the GLSL body as undefined ids → the slot is rejected
(`slotTranspiler.ts:315` parametric, `:343` baked). They're the fixed PAligned16 table, copied into every
formula's const buffer (`FastMove(PAligned16,…,216)`, `CustomFormulas.pas:334`).

**The table** [`DivUtils.pas:1623-1650`, verified]:
```
Cp16=-2 · Cp24=1e-100 · Cp32=1 · Cp40=1 · Cp48=-1 · Cp56=-1 · Cp64=2 · Cp72=2
Cp96=-1 · Cp104=2 · Cp112=0.5 · Cp120=3 · Cp128=4 · Cp136=5 · Cp144=6 · Cp152=7
Cp160=8 · Cp168=10 · Cp176=15 · Cp184=21 · Cp192=28 · Cp200=35 · Cp208=70
(Cp-8=0.5; Cp0/Cp8 abs-mask, Cp80/Cp88 sign-mask — handled by U6, NEVER seed as raw doubles)
```
**Edit 1 — app side (`constPacker.ts` + `slotTranspiler.ts`):** export `const PALIGNED16: Record<number,number>`
from `constPacker.ts` with the above. In `transpileSlot`, add a `\bCp(\d+)\b` → `f(PALIGNED16[n])` replacement
in BOTH the parametric (`:308`) and baked (`:335`) arms; **then drop `Cp` from the leftover-rejection regexes**
(`:315`, `:343`) so a resolved `Cp` no longer rejects the slot. Any offset not in the table → still "missing"
(none exist in the corpus).
**Edit 2 — cross-check (3 files at `/h/tmp/mb3d-decomp/`, lockstep):** they assign **random** values to every `C`
token; change them to assign the KNOWN PAligned16 value to `Cp<off>` tokens (keep random for `Cm<n>` option
tokens). Sites: `xcheck.mjs:293`, `generate-library.mjs:55`, `corpus-check.mjs:35`. Define `PALIGNED16` once
(export from `xcheck.mjs`) and import in the other two. **All three must agree** or corpus-check shows MISMATCH.
**Do U6 first** so the masks `Cp0/8/80/88` never reach the body as multiply operands — never materialize them as
the raw `0x7FFF…` double. **Frees** ~80 formulas → ≥8 scenes (ABoxModKali×3, _PolyFold-sym×3, Riemann2×2,
IcosahedronIFS, KnotsIFS, _ngon, CommaIFS, foldinghexIFS, totoricalIFS, …).

---

## U8 — intern #6 `Folding Int Pow` transpile · APP-SIDE · +3 scenes
`slotTranspiler.ts`: `INTERN` map has `0..4`; `INTERN_NAMES` has `6:'Folding Int Pow'`. Dispatch at `~:264`
(`fi >= 0 && fi <= 4`) lets #5/#6 fall to the stub `~:354`. Add `6:` to `INTERN` and widen the dispatch to
include 6 (keep **#5 Bulbox stubbed** — separate work).

**MB3D source** — `HybridFolding` [`formulas.pas:5153-5198`], options [`CustomFormulas.pas:269-274`]:
`option[0]=IntPow` (inner power), `option[1]=Zmul` (double), `option[2]='R fold'` (type-8 `.FOLDING`).
Body = per-axis abs-fold then the intern-#0 integer-power latitude bulb:
```
fold = option[2];
x = abs(x+fold) - abs(x-fold) - x;   // same for y, z
// then latitudeBulb(z, power = round(option[0]), zmul = option[1])   // reuse slotTranspiler.ts:126-141
```
Params: Power (paramA, int 2..8), Z-mul (paramB), R-fold (paramC). Transpile the REAL MB3D math (the intern-port
pattern), not a same-named GMT formula. **No cross-check on interns → visually verify the 3 FoldInt scenes.**

---

## Decompiler-regen workflow (U6, U1 only)
1. Edit `decompile.mjs`/`xcheck.mjs` (+ for U1 `generate-library.mjs`, `corpus-check.mjs`) **in `/h/tmp/mb3d-decomp/`**.
2. `cd /h/tmp/mb3d-decomp && node generate-library.mjs` → writes `…/stable/engine-gmt/utils/mb3d/decompiled-formulas.ts`.
3. `node corpus-check.mjs` → must report **FAITHFUL ≥279 / MISMATCH 0**. Any mismatch = stop, the two sides diverged.
4. **Diff `decompiled-formulas.ts`**: only NEW formula keys should appear; existing bodies must be byte-identical
   (an existing body change means U6/U1 touched a formula it shouldn't — investigate before committing).
5. `cp /h/tmp/mb3d-decomp/{decompile,xcheck,generate-library,corpus-check}.mjs …/stable/plans/mb3d/decompiler/`.
6. `npm run check:mb3d-decompiler` → "OK". Then the repo gates (`typecheck`, `test:mb3d`, `:weave`, `:refine`).

## When done
Re-baseline (`probe-mb3d-triage.mts` + `scan-mb3d-scenes.mts`), update `EXECUTION-STATUS.md` (S2 rows → done,
new GOOD/scene counts, commits), append a decisions-log line, and **report back**: per-unlock scenes gained,
the new faithful-scene count (22 → ?), any unlock that under/over-delivered vs the estimate, and any geometry
that needs a visual call (esp. U3 MixPinski4 matrix order, U8 FoldInt scenes — neither is cross-check-gated).
Also note (per the COMPLETION-PLAN 75% bar) whether the trajectory looks on-track for the M-tier (Stage 3).
