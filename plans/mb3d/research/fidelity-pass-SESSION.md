# Session prompt — MB3D import **render-fidelity pass**

**Date:** 2026-06-27 · **Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable`

Paste the **Prompt** block below as the first message of the next session. It deepens the
fidelity of scenes we *already* import (vs widening coverage — the `coverage-unlocks.md` /
`ROADMAP.md` U-series is the alternative front, deliberately deferred). Grounded against a
three-agent survey of the whole MB3D plan surface (2026-06-27).

## Where we are (so the next session starts from truth)

- **Coverage is solid:** 278/279 formulas decompile faithfully (0 cross-check mismatch); 180
  standalone-library formulas GOOD; **22/80** corpus scenes import faithfully (33/80 counting
  default-param code-subs); 20 bundled scenes, ~19 render correctly on **geometry+framing**.
- **Shipped this branch:** camera + lighting/material/palette **L0–L3** (`mapCamera.ts`,
  `mapLighting.ts`); post-hit **surface refinement** (ADR-0084, opt-in — but *proven not* the
  DsyneGrafix fix); **numerical finite-difference DE estimator** (ADR-0085, estimator 7 — the
  actual DsyneGrafix fix, opt-in). Surface-refinement UI is a proper `CompilableFeatureSection`.
- **The fidelity gap** (this session): the `.m3p → quality` param mapping is hand-tuned, the
  numeric-DE *lighting* is not actually working, and fog is parsed but never applied.

## The work items (grounded)

### 1. Quality-param conversion — de-empiricize from `Calc.pas` (the spine)
The importer's render settings are admittedly calibrated-to-refs, not derived:
- `emitFusedHybrid.ts:303` `detail = min(6, 3.3/deStop)` — the `3.3` + cap-6 are "calibrated to the refs".
- `emitFusedHybrid.ts:298` `deBailout = min(4000, max(256, RStop))` — the **256 floor** is a hack (low RStop "starves GMT's DE → black").
- `emitFusedHybrid.ts:308` `fudge = min(0.7, max(0.5, …))` — **ignores the authored `ZstepDiv`** and floors at 0.5.
- `emitFusedHybrid.ts:270` `maxSteps = 1500` — hardcoded ("a balance").
- `constPacker.ts:102-104` `mapDEMeta`: `deOption ∈ {2,5,6,11} → estimator 1`, else `→ estimator 0`.
  **Bug:** `deOption 11` should be **estimator 2** (`Sqrt(Rout)/Abs(w)`, per `certification-handoff.md:201-206`), and any non-analytic-`dr` formula falling to estimator 0 is the garbage-DE setup ADR-0085 describes.

**Do:** delegate agents to read MB3D's actual march/threshold logic — `Calc.pas` step-size
(`ZstepDiv`/`RLastStepWidth`/the per-step advance), DE threshold (`msDEstop`, `DEstop·0.15` hit
offset @`Calc.pas:794`, `mctDEoffset` @`HeaderTrafos.pas:890`), bailout (`RStop`), iteration
cadence — and **derive** the `.m3p → quality` mappings (detail, deBailout, fudge, maxSteps,
estimator) instead of guessing. Replace the hand-tuned constants with source-grounded ones; fix
the `deOption→estimator` map. Validate by re-certing the 20 bundled scenes (`cert-render.mts`) —
the goal is the constants *fall out of the source*, and the certs hold or improve.

### 2. Numeric-DE lighting fix (finish ADR-0085)
ADR-0085 claims the escape-time-gradient normal "works"; **the user observes noisy lighting +
broken shadows** (glow-only is smooth → the geometry/DE is fine; it's the normal + shadow path).
- `numericNormal` (`de.ts`) probes `∇nu` at the *small* `uNumDEeps` (default 0.0015), where the
  escape-time field is chaotic → noisy normal. **Try:** a separate, larger probe for the normal
  (a few × the DE probe, or tied to the pixel footprint `eps` that `GetNormal` already passes),
  and/or averaging.
- Shadows (`shadows.ts`) march `DE_Dist = numericDistance` (4× orbits, noisy) → broken. **Try:** a
  smoother/cheaper shadow DE, or a clamp. Then reconcile ADR-0085 (drop the over-claim, record the
  real fix).

### 3. Fog application (the named Hyperben2 fix)
`DepthCol/DepthCol2/DynFog*` are **parsed but never written** to `atmosphere.fog*` (grep-confirmed
zero fog writes in `engine-gmt/utils/mb3d/`). The mapping table is in `lighting-import-spec.md:224`;
the blocker is the "opaque trackbar math" at `HeaderTrafos.pas:1303-1316`. This is the single named
scene defect with a known cause (Hyperben2-Ozosphere lighting-washed at deep zoom).

### 4. Debt warm-up (10 min)
- Delete the superseded `engine-gmt/utils/mb3d/mapFormula.ts` + `mapScene.ts` + `debug/test-mb3d-map.mts`
  (dead since the weave path; flagged at `converter-design.md`, ADR-0083, memory). Run `npm run orphans` to confirm.
- The stale-doc reconciliations are already done (ADR-0083/0085 Updates, spec banners) — just keep them honest.

## Order, gates

Order: **4 (debt) → 1 (quality-params) → 2 (numeric lighting) → 3 (fog).** Quality-params is the
spine and is agent-driven (read `Calc.pas`, same method that cracked the DE root cause). Keep green:
`npm run typecheck`, `test:mb3d`(24) / `:weave`(42) / `:map`(→delete) / `:refine`(46), the cert
render (`npx tsx debug/cert-render.mts` against `H:/GMT/refSoftware/MB3D/output/`). Real GPU only
(headed Chrome → ANGLE), never headless SwiftShader. Write an ADR if a mapping becomes load-bearing.

---

## Prompt

Continue the MB3D importer on branch `feat/mb3d-importer` at `h:/GMT/workspace-gmt/stable`. This
is a **render-fidelity pass** — make the scenes we already import look like the MB3D reference,
rather than widening coverage. Read `plans/mb3d/research/fidelity-pass-SESSION.md` first (the full
plan + file/line index); also `plans/mb3d/research/dsyne-de-fidelity-findings.md` and ADRs 0083/0084/0085.

Work the four items in this order (details + cites in the SESSION doc):

1. **Debt warm-up:** delete the dead `engine-gmt/utils/mb3d/mapFormula.ts` + `mapScene.ts` +
   `debug/test-mb3d-map.mts` (superseded by the weave path); confirm with `npm run orphans`.
2. **Quality-param conversion (the spine):** the importer's `.m3p → quality` mappings
   (`emitFusedHybrid.ts:270,298,303,308`; `constPacker.ts:92-109 mapDEMeta`) are hand-tuned
   constants "calibrated to the refs". **Delegate agents to read MB3D `Calc.pas`'s step-size + DE
   threshold + bailout + iteration logic** (ZstepDiv/RLastStepWidth, `msDEstop`/`DEstop·0.15`
   @Calc.pas:794, `mctDEoffset` @HeaderTrafos.pas:890, RStop) and **derive** the mappings for
   detail/deBailout/fudge/maxSteps/estimator instead of guessing. Fix the `deOption 11 → estimator`
   map (should be 2, not 1) and the non-analytic fallback. Re-cert the 20 bundled scenes.
3. **Numeric-DE lighting fix:** the escape-time-gradient normal (`numericNormal` in `de.ts`) is
   noisy and shadows are broken (contrary to ADR-0085's claim). Use a separate, larger probe for
   the normal (vs the DE probe `uNumDEeps`) and a smoother/cheaper shadow path; reconcile ADR-0085.
4. **Fog application:** wire the parsed `DepthCol/DepthCol2/DynFog*` → `atmosphere.fog*` (mapping at
   `lighting-import-spec.md:224`, trackbar math at `HeaderTrafos.pas:1303-1316`) — the named
   Hyperben2-Ozosphere washout fix.

Commit per logical step; don't push. Real GPU only for renders. Keep gates green (`typecheck`,
`test:mb3d`/`:weave`/`:refine`, `cert-render.mts`). Write an ADR for any load-bearing mapping decision.

**Alternative front (if we'd rather widen than deepen):** `plans/mb3d/research/coverage-unlocks.md`
ranks the U-series — start U6→U1 (the PAligned16 `Cp` const-pack, ~80 formulas / ≥8 scenes, and it
corrects an ADR-0083 misdiagnosis).
