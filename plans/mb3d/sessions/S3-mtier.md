# Session: MB3D Stage 3 — M-tier coverage (U2 · U5 · U4 · U7)

**Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable` · **Plan:** `COMPLETION-PLAN.md` · **Tracker:** `EXECUTION-STATUS.md`
**Detailed spec:** `plans/mb3d/research/coverage-unlocks.md` §4 (U2/U5/U4/U7). Anchors below refreshed by recon (S2 shifted them).

The deeper coverage tier. Target: corpus faithful **27 → ~40+/80** toward the 75% bar. UNLIKE the cheap wins,
**scenes flip on COMBINATIONS** — a multi-slot scene needs ALL its slots supported, so re-triage the corpus
empirically after EACH unlock (`npx tsx debug/scan-mb3d-scenes.mts`) and trust that, not the estimates. Commit
per unlock; do not push.

## Where we are
- Corpus faithful **27/80**; formulas **279/0**; standalone transpile-clean **244**.
- The S2 cheap wins exposed multi-slot co-blockers; this tier clears them. The biggest lever is U5 (forward-branch,
  ~53 formulas, likely frees U4 for near-free); U2 is a trivial prereq; U4+U7 land the actual dIFS-family scenes.

## Ground rules (same as S2)
- Gates green per commit: `typecheck`, `test:mb3d`(24), `:weave`(42), `:refine`(46), `corpus-check.mjs` (**≥279/0**),
  `npm run check:mb3d-decompiler`. Decompiler edits (U5; U4 if it needs a decode) happen at `/h/tmp/mb3d-decomp/`.
- **Decompiler-regen workflow** (U5/U4): edit at `/h/tmp` → `node generate-library.mjs` (writes `decompiled-formulas.ts`)
  → `node corpus-check.mjs` (≥279/0) → **diff `decompiled-formulas.ts`: only NEW keys, existing bodies byte-identical**
  → `cp {decompile,xcheck,generate-library,corpus-check}.mjs` back to `plans/mb3d/decompiler/` → `check:mb3d-decompiler`.
- Real GPU only for triage/cert.

## Order: U2 → U5 → U4 (re-triage) → U7

---

## U2 — dIFS option-count pad · APP-SIDE · trivial prereq (0 scenes solo, co-unlocks the dIFS family)
**Corrected premise (recon):** NOT a second-base/stack-array gap. MB3D `.m3p` slots store a TRUNCATED
`optionCount` (only the edited prefix); MB3D renders with the formula's FULL option list (trailing values from
`IniCFs` defaults — `CustomFormulas.pas:222-233` overwrites all 16 types + sets full `iCFOptionCount`, walk at
`:411` uses the full count). The packer walks `Math.min(16, optionCount)` (`constPacker.ts` packConstBuffer ~`:95`
+ bindOptions ~`:259`) → stops early → `Cm88..112` unwritten. The decompiled bodies + cross-check already assume
the full list — this just feeds the packer the option list MB3D would have used.

**Fix** — normalize the slot in `slotTranspiler.ts` right after the decompiled formula resolves (~`:329-330`),
BEFORE both `bindOptions` and `packConstBuffer`:
```ts
const def = DECOMPILED_DEFAULTS[slot.name!];
if (def && slot.optionCount < def.optionCount) {
  const values = slot.optionValues.slice();
  for (let k = slot.optionCount; k < def.optionCount; k++) values[k] = def.optionValues[k];
  slot = { ...slot, optionTypes: def.optionTypes.slice(), optionValues: values, optionCount: def.optionCount };
}
```
Use the DEF types (file trailing types are stale/zeroed) and DEF values past the loaded prefix. Add the
`DECOMPILED_DEFAULTS` import (already used in `loadMB3DScene.ts`/`mb3dCatalog.ts`). **App-side only → NOT
cross-check-gated; gates stay green automatically.** Confirm: re-pack the 7 truncated scenes → `missing = NONE`.
Solo scene yield ≈ 0 (co-blockers remain) — its payoff lands with U4/U7 below.

---

## U5 — forward-branch structuring · DECOMPILER + CROSS-CHECK · biggest formula-count unlock (~53)
[coverage-unlocks.md §4 U5.] **53 formulas blocked by a rejected `jCC` alone**, not loops. Two root causes:
1. `detectBranch`'s `jCC` regex (`decompile.mjs` ~`:267`, may have shifted post-U6) allows only
   `j(a|ae|b|be|e|ne|z|nz|c|nc|nb)` — **`jg/jle/jl/jge/jns` are excluded**, and `decodeCond`'s test/and arm
   (~`:222-228`) maps only `je/jz/jne/jnz`. After `and ah,mask`, OF=SF=0 so `jg≡jnz`, `jle≡jz` — derivable.
   Gates `_HopSqrt{X,Y,Z}`, `_NeoSqr{X,Y,Z}`, `_hopalong`/`_hopalm1`, `_gnarl*fast`, `koch_cube`/`koch_surf`.
2. `skipFiller` (~`:233`) skips only `wait/fwait/fnop/nop` — an `fxch`/`fst st(i)` between the compare and the
   flag-extract breaks detection (`MsltoeSym2/3/4`).

**Edit (lockstep `decompile.mjs` + `xcheck.mjs`):** extend the `jCC` regex + `decodeCond` to cover the signed
conditions after `and ah,mask`; widen `skipFiller` to step over a balanced `fxch`/`fst st(i)` between compare and
flag-extract. Fully cross-check-gated. Run the regen workflow; **diff `decompiled-formulas.ts` — expect many NEW
formula keys, no existing body changes** (a changed existing body = the branch decode altered something it
shouldn't; investigate). Re-triage scenes.

---

## U4 — sphereIFS + HeightMapIFS decompilation · DECOMPILER · the dIFS-shrub unlockers (re-triage AFTER U5)
[coverage-unlocks.md §4 U4 = sphereIFS +7; recon adds **HeightMapIFS** as a co-blocker of the same `dIFS *shrub*`
scenes.] Both have **no `DECOMPILED_FORMULAS` entry**. **Do AFTER U5** — U5's branch structuring may unblock one
or both for nearly free. Procedure: run each through the decompiler (the corpus-check tooling at `/h/tmp` will show
what pattern it trips — branch / mem / loop). Close whatever sub-blocker it hits if it's in-scope (branch=U5-class,
const=U1/U2-class). If it trips genuine loops/second-base mem (U9/U10), note it and move on — don't force it.
Re-triage: with U2 + sphereIFS + HeightMapIFS, the `dIFS shrub` / `dIFS heart shrub(+otrap)` scenes should flip.

---

## U7 — weave mode 2 (DEcombine / CSG) · APP-SIDE (emitFusedHybrid) · compounds with U2/U4
[coverage-unlocks.md §4 U7.] `emitFusedHybrid` supports only weave mode 0 (alternate). **11 scenes are mode 2**;
≥2 have their single slot already supported (`Dodeca Torus mix`, `ThePearl dIFS`) → mode-2 emit recovers them with
zero new formula work, and `cutted sphere over carpet` joins once U2 lands boxIFS. Implement DEcombine/CSG slot
combination (min/max/blend of per-slot DE) in the fused dispatcher. **Mode 1/3 = 0 scenes in corpus → do NOT
implement.** App-side; visual-verify the recovered scenes.

---

## Owed from Stage 2 (do during this session's GPU pass — they need a real GPU, not cross-check-gated)
1. **U3 visual check** — MixPinski4 / Sierpinski4ex 4×4 rotation matrix ORDER (verify `Melting spot bloxx` vs its
   MB3D ref; a mis-composed matrix renders geometry-wrong but trips no gate).
2. **U8 visual check** — `Dainbramage` FoldInt fold+bulb look.
3. **GPU library GOOD re-baseline** — `npx tsx debug/probe-mb3d-triage.mts` (248 catalog renders — heavy; budget
   for it or run in chunks). Records the real GOOD count vs the 244 transpile-clean proxy. Update the tracker.

## When done
Re-baseline (`scan-mb3d-scenes.mts` + `probe-mb3d-triage.mts`), update `EXECUTION-STATUS.md` (S3 rows, new
corpus + library counts, commits), append a decisions-log line, and **report back**: corpus faithful 27 → ?,
which unlock×combination flipped which scenes, U4's triage result (did U5 free sphereIFS/HeightMapIFS?), the
two owed visual verdicts, and — per the COMPLETION-PLAN 75% bar — whether the real trajectory looks like it
reaches ~48 (60%) here and what the residual blockers are for Stage 3b (U9/U10). If a unlock stalls on genuine
loops/second-base mem, say so — that's the permanent-ceiling boundary, not a failure.
