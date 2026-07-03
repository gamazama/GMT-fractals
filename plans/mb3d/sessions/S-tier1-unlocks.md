# Session: MB3D Tier-1 cheap scene unlocks (6 verified S-effort fixes, ~+7 scenes)

**Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable` (NOT pushed). **MB3D source:** `/h/tmp/mb3d-src/`.
**Live tracker:** `plans/mb3d/EXECUTION-STATUS.md` (read the "▶ NEXT SESSION" banner first).
**Full triage + evidence:** `plans/mb3d/research/scene-unlock-triage-2026-06-30.md` (read §3 + §5 — every fix below
is source-verified there; don't re-derive the gates).

## Mission
Land the **Tier-1 cheap-unlock batch** the 2026-06-30 recon verified: 6 small, cross-check-gated decompiler/
packer/intern fixes, each source-confirmed against the MB3D Pascal + the canonical decompiler. Expected ≈ **+7
faithful scenes** (corpus render-faithful ~25 → ~32/80). All are S-effort and low-risk; this is the highest
scenes-per-effort work left before the structural Tier-2/Tier-3 walls.

## ⚠ Read these two traps FIRST (both cost real time in prior sessions)
1. **Decompiler drift.** The canonical decompiler is **`/h/tmp/mb3d-decomp/`** (has `node_modules/capstone-wasm`).
   The repo copy `plans/mb3d/decompiler/{decompile,xcheck}.mjs` has drifted before. **Edit + regenerate in
   `/h/tmp/mb3d-decomp/`, then `cp decompile.mjs xcheck.mjs` back to `plans/mb3d/decompiler/`** so the committed
   snapshot reproduces the committed output. `npm run check:mb3d-decompiler` gates this — it must pass.
2. **`diag` UNDERCOUNTS.** The decompiler silently DROPS integer ops it tags NEUTRAL (no UNHANDLED marker), so a
   wrong-but-"clean" decode is possible (this is how Amazing Surf 2 looked cheap but isn't). After any decode
   change, eyeball the emitted GLSL for reads of never-assigned locals — a 0-mismatch corpus pass is necessary,
   NOT sufficient. GPU-cert every decode/const/DE change (the ADR-0087 cross-check blind spot).

## The batch (do in this order — pure cross-check wins first, then the visual-risk one, then the intern)

Each "decompiler" fix = edit `decompile.mjs` + `xcheck.mjs` in lockstep, regenerate `decompiled-formulas.ts`
(`node plans/mb3d/decompiler/generate-library.mjs` — run from `/h/tmp/mb3d-decomp/` per the drift note), confirm
`corpus-check` holds **0 mismatch** (and watch the faithful count rise), then `cp` the two `.mjs` back.

1. **`fild [esi-0x18]` → `ItResultI` (iteration count), SCRATCH offset 64.** Blocks **9 formulas** (TorusIFS,
   boardIFS, PolyPyraIFS, heartKluchIFS, helistairsIFS, loxodromeIFS, Seashell, trifoliumIFS, UmbrellaIFS) — the
   MB3D "OTrap-on-iterations" colour idiom (`fild dword [esi-0x18]; fmul …`). Add offset 64 to the SCRATCH map
   (`mb3dIter`) in both files; GMT-side bind it to `float(i)` (the loop index `i` is already in scope — it's not
   persistent state, it's the current iteration count). Trap-check already PASSED in recon: geometry/DE decode
   clean; only the unused trap-colour output was damaged. → **+Rama-Elysium** (TorusIFS sole blocker, co-slots
   clean). Also unblocks boardIFS (→ Recycledrelatives-Test, needs U7 too) + PolyPyraIFS (→ ImpossibleWorld,
   needs amazingIFS too).
2. **const-pack `case 15` = `DRecipSquare` (`1/max(1e-40, v²)`).** Pure app-side (`engine-gmt/utils/mb3d/
   constPacker.ts`), NOT cross-check-gated — mirror the existing `case 13`/`case 9` reciprocal-square shape, one
   line. → **+toricaleggs** (its sphereIFS slot throws "unported option type 15"; totoricalIFS + hextgrid2IFS
   already clean).
3. **`Aexion1` `[esi-0x38]` → `J4`/Cw (4th Julia const), field-map offset −56.** One-field add to the iter field
   map (`iterName`) in `decompile.mjs` + `xcheck.mjs` (xcheck already seeds `cw`). Everything else in Aexion1
   already decodes. → **+Aexion-10bulbs** (co-slots _PolyFolding/_updateC clean).
4. **Unsigned `ja`/`jbe`-after-`and ah,mask` jCC sync.** The decompiler's `decodeCond` lags the interpreter
   (`xcheck.mjs` already evaluates `ja`/`jbe` after `and`, where CF≡0 so `jbe`≡`je`, `ja`≡`jne`); also call
   `skipFiller` between the cmp/and and the jCC (koch_surf has `nop;nop` between). **Recon measured this:
   corpus 293→296 faithful, 0 mismatch** (unblocks koch_cube, koch_surf, +IQ-bulb-old free). → **+Dainbramage-
   Home-of-the-Ancients** (koch_cube; co-slots ATetraVS/ABoxPlatinumB/koch_oct all clean). NB koch_surf's own
   scenes (KochSurf-Sample-6, Oxnot-Flexing) have OTHER blockers (_Transform; _PartlyJuliaR loops) so they do
   NOT flip — don't expect them.
5. **`_JuliaSets` input-coord offsets 0/8/16 (= C1/C2/C3) in the iter field map.** Add to `iterName`
   (decompile + xcheck). → **+Dainbramage-Hydra** (co-slots IcosahedronIFS/ABoxPlatinumB/koch_oct clean) **and
   +JuliaSetSample**. **⚠ SEMANTIC RISK — needs a GPU visual check, cross-check can't catch it:** C1/C2/C3 are
   MB3D's *pre-4D-rotation input position*; GMT has no such variable, so binding them to `z.xyz` is exact only
   for iteration-0 pretransforms. If `_JuliaSets` runs as a non-first weave slot (after other slots fold `z`)
   the substitution silently diverges. The corpus gate will read GREEN regardless — **render Dainbramage-Hydra
   and compare to the MB3D ref before trusting it.** This is the one Tier-1 fix that can pass the gate but render
   wrong.
6. **Bulbox intern #5 transpile.** `slotTranspiler.ts` `INTERN[5]` is still stubbed ("radius-gated box/bulb
   blend"). It's a radius-gated mix of the already-ported Amazing Box (#4) + integer-power bulb (#0) — a
   self-contained hand-written intern, no decompiler/cross-check (interns have no cross-check; **visual-verify**).
   → **+BulboxCut**.

### After the batch
- **Re-run `node plans/mb3d/decompiler/gen-sample-scenes.mjs`** so the new faithful scenes reach the in-app
  click-to-load list (`sampleScenes.ts`) — measuring coverage ≠ surfacing it (standing process rule).
- **GPU re-measure:** `npx tsx debug/cert-render.mts` (real GPU, dev server on :5173) + `node debug/
  mb3d-contact-sheet.mjs`; confirm the new scenes render faithfully against their refs and **no certified scene
  regressed** (the contact sheet's mark-WRONG list).

## Optional adjacent (S, tool hygiene — 0 scenes but stops a hang)
The decompiler crashes "Maximum call stack size exceeded" on indirect calls (`call [reg+off]`) because the
`call` handler `parseInt`-misparses the indirect operand → infinite recursion. Guard it to emit a clean
`// UNHANDLED indirect call`. Latent hang for the whole Map-func family (HeightMapIFS, _MapTranslate). Do it if
you touch the `call` path anyway.

## Do NOT cheap-chase (Tier-3 hard walls — separate initiatives, see triage §3 C)
- **Amazing Surf 2** (3 scenes) — IEEE-754 field surgery in the fold body (silently-dropped NEUTRAL int-ops),
  needs a float-bit-pattern model (L). NOT the 2 `jae` branches.
- **HeightMapIFS + _MapTranslate** (4 scenes) — real indirect calls to compiled lightmap samplers reading an
  external disk bitmap; decompiling gains 0, need a texture-asset pipeline.
- **Genuine loops / irreducible CFG** (columnsIFS, gnarly2IFS, MengerHyper, SphCageIFS, TgladTetra, Makin4D,
  amazingIFS, helixIFS, TrifoxComplexAngles, ABoxSmoothFold, _recFold, Quadrat3D, Mandalex, _FoldingTetra3d) —
  the U10 tier, low yield.
- **Intern-AmBox convergence over-fold** (Hyperben2/Theli-bg/QuatP4) — render-wrong, not blocked; needs an
  orbit sim. **Oxnot** math error. **DsyneGrafix** manual est-7. All banked.

## Tier-2 (next after this — medium structural, NOT this session)
U7 two-orbit DEcombine kernel — verified **6 recoverable** (DEcomb1, ExcludeBulbMeng, Mengerplus-for-MC,
ThePearl-dIFS, cutted-sphere-over-carpet, Dodeca-Torus-mix). Engine-core; needs **per-group estimator
selection** + faithful CSG ops (`maxInv` = signed difference, `mixF1` = sequential hand-off, not min). A basic
min/max/maxInv kernel does ~5 of the 6; Dodeca-Torus needs mixF1. Compounds with fix #1 (boardIFS) to add
Recycledrelatives-Test.

## Gates (must pass before commit)
`typecheck` · `test:mb3d` (24) · `test:mb3d:weave` (58) · `corpus-check` (**293/0**, count should RISE on the
decode fixes — that's correct, the cheap fixes add faithful formulas) · `check:mb3d-decompiler` (in-sync after
`cp`-back) · `cert-render.mts` (real GPU) for each new/changed scene + the certified-scene regression sweep.
**Fix #5 additionally requires a GPU visual pass on Dainbramage-Hydra** (semantic risk above).

## Output
- The 6 fixes committed (path-scoped, one logical commit or a small series) on `feat/mb3d-importer`.
- `gen-sample-scenes.mjs` re-run + the new scenes confirmed loadable + cert-rendered.
- EXECUTION-STATUS.md baseline updated (render-faithful count; new scenes named) + a decisions-log entry.
- Any fix that didn't pan out (esp. #5 if the visual diverges) reported honestly, not force-shipped.
