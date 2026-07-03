# MB3D scene fixes — round 2 (from contact-sheet review)

**Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable` · queued behind the running **param-packing** session
(which edits `emitFusedHybrid.ts`/`constPacker.ts`/`slotTranspiler.ts` — fixes touching those WAIT for it to commit).
Diagnoses are CPU-grounded (dump via parse→emit + reading bodies); each needs a GPU confirm vs the ref.

## ★ Shared fix — the missing-`dr` gap (6 scenes, one lever)
Decompiled transform/inversion slots write NO `dr` (`Riemann2`, `_PolyFold-sym`, `_invcylindrical`,
`_reciprocalX3b/X2/Y3b`, `SierpHilbert`, `MengerKochV2`, `ABoxModKali`). The transpiler passes `dr` through
unchanged (`slotTranspiler.ts:377`), but an inversion scales space → `r/dr` (est 2) is wrong → malformed/black.
- **Affected:** Melting spot bloxx (A2), HalTenny Freak Of Nature, Hal-Tenny Resistance, Jost1, Oxnot Shells (black), Recycledrelatives (black, the "fragmented" class — `ABoxModKali` no-dr is the mechanism).
- **Numeric DE est7 REBUILT (`e28d1a1`) — works in the app, but NOT a clean auto-route.** The fixed-iteration
  `Rout` estimator now forms DsyneGrafix correctly (recipe: est7 · dDEscale 0.1 · Ray detail ~1.5 (numeric DE is
  rougher → looser hit threshold) · iterations ~15 · fudge 1.0 · maxSteps ~250). The dr-gap route needs THREE
  things in `emitFusedHybrid.ts`/`mapDEMeta`, not just an estimator flip:
  1. **Port the zoom-derived `dDEscale`** (MB3D `x1/n`, `HeaderTrafos.pas:769`) into `mapDEMeta` so `numDEeps`
     auto-sets per scene — the session left it a MANUAL knob, so Melting/Oxnot are "partial not clean" at one
     value. This port is the key to making est7 clean rather than hand-tuned.
  2. **Iterations from the WEAVE CYCLE, not the header max.** The importer sets `uIterations` from the header
     (~2000); est7 re-iterates to a fixed count, so 2000 is slow + wrong — use the weave cycle length (~15).
  3. **Route missing-`dr` scenes** (used non-dIFS slot writes no `dr`/`mb3dDr1`/`mb3dVary`) to est7 + set the
     recipe (looser Ray detail, fudge, maxSteps).
  **⚠ VERIFY IN THE REAL APP, NOT THE HARNESS** — `runMB3DWeaveTest` does NOT surface the runtime recipe
  (iterations/detail/dDEscale never reach the render), so est7 renders flat in the harness while working in the
  app. (Follow-up: fix `render-harness.ts` to apply the recipe so est7 is headless-certifiable — see S-numeric-de.md.)
- **Deeper alt (future):** analytic `dr *= jacobianScale` for recognized transforms (sphere inversion 1/r², box
  fold ±1, scale-add |s|) — exact, probe-free, 4× cheaper where the decompiler can prove every slot's Jacobian;
  numeric DE stays the general fallback.

## A1 — march-budget maxed (Theli, TimeMachine)
Fudge at the 0.3 floor + maxSteps at the 2000 cap (`quality.ts:52,85` hard cap) → tiny steps can't cross the
volume → back cut off. **Fix (emitFusedHybrid.ts:366,371 — WAITS for param session):** fudge floor 0.3→0.4
**+ set `overstepTolerance ≈ 2.0`** (closest-miss recovery, `trace.ts:221-245`; GMT's analog of MB3D's
`bStepsafterDEStop` binary-search, currently dropped at `:372`). GPU sweep to pick 0.4 vs 0.45 + confirm no
thin-detail overshoot. Raising the 2000 hard cap is a bigger blast radius — avoid; the floor+overstep is the lever.

## Hyperben2 — GEOMETRY REGRESSION (extra Menger planes) — diagnose next
User re-inspected: NOT fog — the geometry changed, extra Menger cutting planes vs the certified version. Hyperben2
was previously certified-correct, so this **regressed** — prime suspect the `[CONSTANTS]` fix (88 bodies) or U5 (14
bodies) altering a Menger slot's body. Decompiler-side → **independent of the param session, can diagnose now.**
Action: find Hyperben2's Menger slot, check whether its `[CONSTANTS]`/U5 decode changed and whether the new body
is wrong (extra planes = a fold-count/plane const dropped or mis-applied). **This means the `[CONSTANTS]` change
needs a fuller regression sweep across previously-certified Menger scenes — the contact-sheet review is that sweep.**

## Wada — DIAGNOSED (center sphere = lost iteration-0 base capture) — fix in emitFusedHybrid (WAITS for param session)
User pinpoint: outer ring is correct in position+size; ONLY the center sphere is missing (vs the MB3D ref). So
it's NOT the trap mis-placing/mis-scaling — it's the trap NOT CAPTURING the center primitive. Mechanism: the
difsFold (`emitFusedHybrid.ts:178-183`) fires ONLY after a deOption-20 slot (SphereIFS) — FIX 0's gating. The
center sphere is the iteration-0 / base primitive; the orbit STARTS near it, but Wada's weave runs the
**PolyFold-symIFS transform FIRST**, displacing the point off-center before any SphereIFS evaluates it, so the
un-folded center distance is never folded into `g_difsDE`. MB3D's `doHybridIFS3D` (formulas.pas:3210-3298)
captures the base/initial distance.
**Fix (verify against doHybridIFS3D first):** seed `g_difsDE` with the base sphere distance, OR fold the trap on
iteration 0 at the un-transformed point (capture before/independent of the first transform slot). Confirm MB3D's
trap-init mechanism in `doHybridIFS3D` before implementing. Unrelated to the numeric-DE class (Wada is dIFS est 6).

## Deferred / known
- **DsyneGrafix** — fine-tune to align with GMT; user deferred until more of this class appears.
- **Recycledrelatives** — folded into the dr-gap fix above (was "known fragmented"; mechanism = `ABoxModKali` no-dr).

## Fog (Group D) — DROPPED
Hyperben2 was the only fog-flagged scene and it's actually geometry, so the `mapLighting.ts` white-guard tweak is
NOT needed now. (Keep the diagnosis on file in case a genuinely fog-washed scene appears later: lower the guard
onset 0.6→0.45 / cap desaturated-grey fog at intensity ~0.15.)

## Execution order (BOTH foundational sessions committed: param `7038844`, numeric-DE `e28d1a1` — tree clean)
All `emitFusedHybrid.ts` (+ mapDEMeta) edits — commit per item, GPU-verify each in the REAL app (not the harness):
1. **Theli + TimeMachine** (cleanest) — fudge floor 0.3→0.4 + `overstepTolerance≈2.0`. GPU sweep 0.4 vs 0.45,
   confirm no thin-detail overshoot. Independent of everything.
2. **Wada** — seed `g_difsDE` with the base-sphere distance (capture iter-0 / the untransformed point). **Read
   `doHybridIFS3D` (formulas.pas:3210-3298) first** to confirm MB3D's trap-init, then mirror it. GPU: center
   sphere returns.
3. **dr-gap (hardest, the 3-part numeric route above)** — port `dDEscale` from `HeaderTrafos.pas:769` into
   `mapDEMeta`, fix iterations→weave-cycle, route missing-`dr` scenes to est7 + recipe. Verify Melting/Oxnot/Jost1/
   HalTenny-FoN/Hal-Tenny-Resistance/Recycledrelatives IN THE APP (harness won't show it). Per-scene tuning likely.
4. **Hyperben2 regression** (decompiler-side, independent of the above) — diagnose which Menger slot's `[CONSTANTS]`/
   U5 body change added the extra planes; fix at `/h/tmp/mb3d-decomp/` + regen.
Then a full GPU re-cert (`cert-render.mts` + the contact sheet) to confirm no regression + the fixes hold.
