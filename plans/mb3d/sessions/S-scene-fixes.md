# Session: MB3D scene fixes (validation round 1)

**Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable` · **Tracker:** `EXECUTION-STATUS.md`

User visually tested the 27 bundled scenes against MB3D refs and found 5 bugs. A diagnostic agent
root-caused all 5 (CPU, grounded in `/h/tmp/mb3d-src/`). **Two are already fixed + committed; this
session does the remaining three.** Each needs a real-GPU render to confirm, against the MB3D refs in
`H:/GMT/refSoftware/MB3D/output/`. Commit per fix; do not push; keep gates green
(`typecheck`, `test:mb3d` 24, `:weave` 42, `:refine` 46 — corpus 293/0 is untouched, these are app-side).

## Already fixed (verify they hold, don't redo)
- **Dainbramage** stray triangles — intern #6 FoldInt fold sign was negated (`c44ba3e`). **USER-CONFIRMED GOOD.**
- (chrystal, material colors render fine — leave alone.)

## FIX 0 — Wada basin (STILL BLACK after the deSlot fix `1d49444`) · re-diagnose · HIGH priority
The first fix (prefer the deOption-20 dIFS slot as DE owner) was committed but the scene is **still blank**.
Confirmed facts: slots `PolyFold-symIFS` (deOption **21**, transform) → `SphereIFS` (deOption **20**) →
`SphereIFS` (20). So the routing fix *should* now pick a SphereIFS as `deSlot` and set `isDifs=true` →
estimator 6. Two possibilities to check IN ORDER:
1. **Build staleness** — the user may have re-tested before the dev server picked up the `emitFusedHybrid.ts`
   change. Cheap to rule out: restart `npm run dev`, reload Wada. If it renders now, done.
2. **The routing fix is necessary but not sufficient.** Dump the emitted def for Wada (`parseMB3DBinary` →
   `emitFusedHybrid`, CPU): confirm `deSlot` is a SphereIFS, `isDifs===true`, `supportsDifs` set, `g_difsDE`
   declared in preamble + folded in loopBody, estimator 6, deBailout 1000. If any is off, that's the bug. If all
   look right but it still renders black on GPU, the likely cause is the **`PolyFold-symIFS` transform slot
   corrupting the orbit-trap accumulation**: the dIFS DE is `min over orbit of mb3dRout/mb3dVary`, but on the
   PolyFold iteration that slot may not write a valid `mb3dRout`/`mb3dVary` (it's a transform, not a dIFS owner),
   so the running-min `g_difsDE` folds in a garbage/zero value → DE collapses. Check what `PolyFold-symIFS` writes
   to `mb3dRout`/`mb3dVary`; if it doesn't maintain them, either (a) skip the g_difsDE fold on non-dIFS slots, or
   (b) recompute `mb3dRout`/`mb3dVary` appropriately around the transform. Compare against `material colors`
   (SphereIFS/boxIFS, all-dIFS, renders fine) to see what a clean dIFS weave looks like vs this mixed one.
**GPU confirm:** Wada renders the reflective IFS basin; diff vs `output/Wada basin - Reflect test.jpg`.

---

## FIX 1 — Melting spot bloxx (BLACK) · 4D `w`/`dr` conflation · HIGH confidence
**Diagnosis:** slots `Sierpinski4ex` → `_reciprocalY3b` → `MixPinski4`. `Sierpinski4ex` and `MixPinski4`
are genuinely **4D** — their decompiled bodies read `w` as the **4th spatial coordinate** (body's first op
is `f0 = w`) and write the folded 4th coord back (`w = f0`), while tracking the real DE derivative in
scratch **`mb3dDr1`**. But the transpiler wrapper (`slotTranspiler.ts` ~:374/377) emits `float w = dr;` on
entry and `dr = w;` on exit — so it (a) seeds the 4th coordinate from the running derivative, (b) writes the
folded 4th coord back **into `dr`** (corrupting it), and (c) computes the real derivative `mb3dDr1` but never
feeds it to `dr`. Result: `dr` goes negative, `r/dr` (est 2) is garbage → black. **The U3 type-12 matrix is
CORRECT** (verified byte-for-byte vs `Math3D.pas:2548` — ruled out).

**Fix:** give these formulas a "**w is a coordinate**" path. Detect them (their body's first op reads `w`
as input AND they carry a `mb3dDr*` derivative scratch — e.g. `Sierpinski4ex`, `MixPinski4`; either regex the
body in `slotTranspiler` or emit a `wIsCoord` flag from the generator into `DECOMPILED_*`). For those slots,
the wrapper must:
- seed `w` from a **persistent 4th coordinate** (`z.w`, initialised 0 in `loopInit`, threaded like the other
  4D formulas — see how intern #2 Quaternion seeds `z.w`/`c.w`), NOT from `dr`;
- write the folded 4th coord back to `z.w` (not `dr`);
- route the real derivative `mb3dDr1` into `dr` at slot exit (e.g. `dr = mb3dDr1;` or `dr *= …` per how the
  body accumulates it — read the `Sierpinski4ex` body to see whether `mb3dDr1` is the absolute dr or a factor).
Keep the existing `w = dr`/`dr = w` path for the non-4D decompiled formulas (don't regress them).
**GPU confirm:** Melting spot bloxx renders the Sierpinski/Pinski hybrid instead of black; diff vs
`output/Melting spot bloxx.jpg`. **Regression:** verify no *certified* scene uses `Sierpinski4ex`/`MixPinski4`
(if one does it was already black/garbage, so the fix only helps).

## FIX 2 — Recycledrelatives - Fractal Fan (BLACK) · Julia constant clamped · MED confidence
**Diagnosis:** slots `ABoxMod1`×4 → `ABoxModKali`×4 (both deOption-2 escape boxes; est 2 is correct, `dr`
handled faithfully). The scene is **Julia mode with c = (−0.4, 3, 3)** (parsed correctly). But GMT clamps
`juliaX/Y/Z` to **[−2, 2]** (`features/geometry/index.ts:404-406`, and the `julia` vec3 ~:410). Clamping
`3 → 2` gives the wrong Julia constant → wrong/empty set. MB3D routinely authors |c| > 2.

**Fix:** let MB3D imports carry the **exact** Julia constant past the ±2 UI clamp. Prefer **baking `uJulia`
directly for the import** (set the uniform/value past the slider range) over widening the global clamp — so
native GMT formulas keep their ±2 UI. Find where the importer sets julia (`mapScene`/`loadMB3DScene`/
`emitFusedHybrid` geometry block → the `geometry` feature) and ensure the imported c isn't re-clamped.
**GPU confirm:** render with exact c=(−0.4,3,3) and diff vs `output/Recycledrelatives - Fractal Fan.jpg`.
**MED confidence:** the surviving DE values are healthy, so if it's still black/thin after the clamp fix, the
residual is camera/framing or thin geometry — check the camera pose next, don't assume the clamp is the whole story.

## FIX 3 — Abominog-Ua (MISSING DETAIL, not black) · under-resolved march · MED-LOW
**Diagnosis:** slots `ATetraVS`×16 → `Menger3` → `ABoxModKali`, iter 1000, est 2 (correct for deOption 11).
Geometry is RIGHT but under-resolved — likely the `detail` cap (6) / `detail=3.3/DEstop` + `maxSteps` don't
march this deeply-converging 1000-iter IFS finely enough (same class as the Theli/Hyperben far-detail
truncation). No certain code fix.
**Do:** a GPU sweep — raise `detail` (try 6→8/10) and `maxSteps`, and try **estimator 7 (numeric)** for this
scene; watch the fine far structure fill in vs `output/Abominog-Ua - 12.06.2014.jpg`. If a specific
high-iteration-IFS heuristic emerges (e.g. "iter ≥ 500 → raise detail cap"), land it; otherwise note it as a
per-scene tuning the user can do in the Quality panel and move on. **Low priority vs the two black scenes.**

## When done
Update `EXECUTION-STATUS.md` (scene-fix results: which of the 5 now match their ref, confidence), append a
decisions-log line, and report back: per-scene before→after, any regression on the certified set, and whether
Fix 2/3 needed a judgment call (Julia clamp approach, Abominog heuristic). Re-run `gen-sample-scenes.mjs` only
if the faithful set changed (these are render fixes, so it shouldn't).
