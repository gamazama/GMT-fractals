# Session prompt — MB3D DE-fidelity front (lead: 4D escape radius)

**Date prepared:** 2026-07-02 · **Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable` (NOT pushed).

Paste the **Prompt** block below as the first message of the next session. It opens the DE-fidelity front —
the current frontier now that **decode is essentially solved** (corpus 333/0 faithful). The lead item (4D
escape radius) is the *one confirmed structural lever* from the 2026-07-01 DE-fidelity audit; the rest of the
ranked front follows if budget remains.

## Where we are (start from truth, not this doc)

- **Decode is solved:** corpus cross-check **333/0** mismatch; the decompiler's cheap+medium tier is done.
  Every remaining scene failure is a **DE / render-fidelity gap** — "the DE GMT computes ≠ the DE MB3D
  computes" — not a decode gap.
- **Faithful marcher (ADR-0088)** shipped + **perf-cleared** (2026-07-02: compile negligible, GPU free-to-faster;
  `research/faithful-marcher-perf-2026-07-02.md`). Euclidean metric + deBailout=rStop² shipped.
- **Bundle: 38 scenes** (Tier-1 landed 32→40 in `484d300`; `Aexion-10bulbs` + `Dainbramage-Hydra` pulled
  **interim** in `7571a51` — they decode but render wrong; the decoded formulas stay in the library and return
  once they render faithfully). This session's #1 + #3 items are what bring them back.
- **Full context:** `EXECUTION-STATUS.md` banner (direction ranking + anchors) and
  `research/scene-unlock-triage-2026-06-30.md` (the 80-scene map).

## ⚠ Two rules that have bitten every prior session — obey them

1. **Never assume — read the MB3D Pascal source (`/h/tmp/mb3d-src/`) and the emitted GLSL, cite `file:line`
   for every DE claim.** The 2026-07-01 audit's *grouping* (which scenes are 4D) is trustworthy; its specific
   one-line fixes are **NOT** — its top-ranked "Rout recompute" fix compile-errored against the real scratch
   (no `mb3dRout` exists; escape uses `dot(z.xyz)`). Verify every proposed fix against the actual emitted
   GLSL + scratch declarations before writing it.
2. **Cross-check has a blind spot (ADR-0087):** it seeds consts identically on both sides, so a
   wrong-but-consistent decode reads 0-mismatch yet renders wrong. **GPU-cert every decode/const/DE change**
   on the real ANGLE/D3D11 path (`cert-render.mts`, headed Chrome — never headless SwiftShader). Visual 1:1
   vs the MB3D ref JPG is the user's call.

---

## Prompt

Work the MB3D **DE-fidelity front** on branch `feat/mb3d-importer` at `h:/GMT/workspace-gmt/stable`. Decode is
solved (corpus 333/0); every remaining scene failure is a DE/render gap. Research each item against the MB3D
Pascal source + the emitted GLSL first (cite `file:line`), implement, CPU-gate, then present real-GPU renders
for my visual verdict. Commit per logical step; don't push. Obey the two rules in
`plans/mb3d/sessions/S-de-fidelity-4d-escape.md` (source-truth + GPU-cert; the audit's one-line fixes are not
trustworthy).

### ITEM 1 — 4D escape radius (the one confirmed structural lever) · effort M · risk HIGH

MB3D dispatches a **DE function per scene** by `deOption` (`HeaderTrafos.pas:497-505`): `doHybridPasDE` (3D,
deOption 0/1/2/11), **`doHybrid4DDEPas` (4D, deOption 4/5/6)**, `doHybridIFS3D` (dIFS, deOption 20). GMT has the
3D + dIFS paths; **4D is the gap.** The 4D path escapes on the **4-component radius `x²+y²+z²+w²`**
(`formulas.pas:3492`, `3518`; read the whole `doHybrid4DDEPas`, ~`formulas.pas:3492-3527`). GMT's shared marcher
escapes on `dot(z.xyz)` (3D only), so genuinely-4D scenes converge on the wrong radius and scatter.

- **Targets:** `Aexion-10bulbs` (the clean 4D target) and `QuatP4hybridJulia` (stretch — it *also* sits in the
  intern-AmBox convergence bank, so 4D escape may be necessary-but-not-sufficient there; treat Aexion as the
  pass/fail signal).
- **Also faithfulises** the existing deOption-5/6 path (`Melting-spot bloxx` uses a 4D coord but a 3D escape
  today — it renders, so it's a **regression canary**, not a target).
- **Approach (verify before coding):** thread a **`#define`-gated 4D-radius escape** through the shared marcher
  at the **escape-radius site(s) in `de.ts`** (3D formulas escape on the 3-component radius today — grep the
  actual token yourself per rule 1, the banner calls it `dot(z.xyz)`) — gated so **3D formulas emit byte-identical
  GLSL**. Extend `has4D`
  (`emitFusedHybrid.ts:104`) to fire on deOption 4/5/6, carry `w` (the z0-plumbing / 4th-coord seed), and sync
  the estimator to the 4D radius. This touches the **shared** kernel → mandatory:
  - a **native-GMT no-change canary**: pick 2-3 native 3D formulas (Mandelbulb, a Menger, an Amazing Box),
    confirm their trace GLSL is byte-identical off-path and they render pixel-identical (this is exactly the
    ADR-0088 byte-identical-off discipline).
  - a **full cert re-pass** of all 38 bundled scenes (`cert-render.mts`) — no regression.
- **Src:** `formulas.pas:3492-3527`, `HeaderTrafos.pas:497-505`, `emitFusedHybrid.ts:104`, GMT `de.ts` escape sites.

### ITEM 2 — Oxnot step-floor (calibration) · cheap-ish · needs a GPU tuning pass

`Oxnot-Shells` DE math is correct; it renders near-black because the importer's deliberate
`Math.max(0.4, fudge)` floor (`emitFusedHybrid.ts:388`, added to guard the `Theli`/`TimeMachine` back-cutoff)
**over-steps** its authored ~0.3. Honor the authored fine step + raise the coupled `maxSteps` budget. This
**trades against** the Theli/TimeMachine cut, so it's a GPU tuning pass, not a constant swap — re-cert Oxnot,
Theli-At, TimeMachine together.

### ITEM 3 — Hydra z0 input-coord plumbing · not a one-liner

`Dainbramage-Hydra`'s noise = its `_JuliaSets` slot re-runs (every 4th iter) and re-lattices from the **folded**
`z` instead of the original pixel. Faithful fix = bind its input-coords (offsets 0/8/16) to a **`z0` captured
once in loopInit** (the same z0-plumbing item 1 needs for the 4th coord), not the evolving `z`. Needs a GPU
visual pass — Hydra has no MB3D ref JPG, so judge coherence, not 1:1.

### ITEM 4 — U7 two-orbit DEcombine kernel (independent, +~6 scenes) · effort M

Engine-core `DE_MASTER` two-orbit path (mode-2 / CSG): two orbits + **per-group estimator selection** (groups
mix est 0/2/dIFS-20) + **faithful CSG ops** — `maxInv` (op 3) is a *signed difference*, `mixF1` (op 6) is a
*sequential orbit hand-off*, not min/max. Recoverable set (verified in the triage §5): DEcomb1,
ExcludeBulbMeng, Mengerplus-for-MC, ThePearl-dIFS, cutted-sphere-over-carpet, Dodeca-Torus-mix; compounds with
the Tier-1 `boardIFS` fix to add Recycledrelatives-Test. Visual-only → GPU-cert each. See triage §5 for the
CSG-op caveats.

### Scope & deliverables

- **Lead deliverable = Item 1** (Aexion-10bulbs rendering faithfully + Melting-spot canary intact + native
  canaries byte-identical + 38-scene cert clean). Items 2-4 in ranked order if budget remains.
- When a scene renders faithfully, re-run `plans/mb3d/decompiler/gen-sample-scenes.mjs` so it reaches the in-app
  list, and **un-pull** it from the interim bundle (`sampleScenes.ts` / `gen-sample-scenes.mjs`, per `7571a51`).
- **Gates (must pass before each commit):** `typecheck`, `test:mb3d` (24), `test:mb3d:weave` (58),
  `test:mb3d:refine` (46), `corpus-check` (hold **333/0**), `check:mb3d-decompiler` (in-sync), and a real-GPU
  `cert-render.mts` pass for any DE/decode/const change.
- Update `EXECUTION-STATUS.md` (drop landed items from the ranking; record what held/moved) and any touched
  ADR/JSDoc. If the 4D escape becomes a load-bearing shared-marcher contract, write a short ADR.
- **I (the user) do the visual 1:1 verdict** — present renders (Aexion-10bulbs, QuatP4, Melting-spot canary,
  2-3 native canaries) and wait for my call before treating a scene as "faithful."

### Non-feature-file scope reminder

The importer branch is being kept push-ready — track which **non-feature** files you touch (debug harnesses,
plans, sample-scene data) so the eventual squash/scope review is clean. `debug/bench-shader.mts` already carries
the reusable `--mb3d-faithful/--mb3d-stepdiv/--mb3d-desub/--formula` flags from the perf session.
