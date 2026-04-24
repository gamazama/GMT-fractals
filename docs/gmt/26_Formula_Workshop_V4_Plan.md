# Formula Workshop V4 — Rewrite Plan

**Status:** Paused pending architecture rethink — 2026-04-17
**V3 status:** Still active (default). V4 available behind `V4 pipeline (beta)` checkbox in Workshop footer.
**Supersedes:** V3 pipeline in [features/fragmentarium_import/v3/](../features/fragmentarium_import/v3/)
**Related docs:** [21 (current status)](21_Frag_Importer_Current_Status.md), [22 (conversion guide)](22_Frag_to_Native_Formula_Conversion.md), [25 (dev reference)](25_Formula_Dev_Reference.md), [24 (interlace)](24_Formula_Interlace_System.md), [v4-rethink-prompt](research/v4-rethink-prompt.md)

---

## 0. Session reckoning (2026-04-17) — READ FIRST

Two-session V4 build reached a paused state. This summary captures what's true now and what's unresolved. The rest of the doc is the original plan; treat it as historical unless otherwise noted.

### What we built

V4 pipeline end-to-end in [features/fragmentarium_import/v4/](../features/fragmentarium_import/v4/):

- `v4/ingest/` — frag / DEC / plain-GLSL format dispatch + render-model classification
- `v4/preprocess/` — annotation extraction, preset extraction, `#include` inlining, generic `#define` expansion, `time`/`M_PI`/`iGlobalTime`/`Phi`/`TWO_PI` auto-inject
- `v4/analyze/` — regex-based DE detection, helper catalog, globals classification, init body extraction
- `v4/emit/` — self-contained-SDE emission. Reuses V3's [`buildFractalParams`](../features/fragmentarium_import/workshop/param-builder.ts) for preset shape compatibility. Slot routing: `builtin` (iterations), `uJulia` (vec3 Julia coords), `uJuliaMode` (bool Julia toggle), `paramA..F`, `vec2/3/4 A..C`, `ignore` (const-inlined).

Engine side:
- [engine/FractalEvents.ts](../engine/FractalEvents.ts), [WorkerProtocol.ts](../engine/worker/WorkerProtocol.ts), [WorkerProxy.ts](../engine/worker/WorkerProxy.ts) widened `REGISTER_FORMULA` type to carry `selfContainedSDE` flag (B.-1).

Workshop UI:
- `V4 pipeline (beta)` checkbox in [FormulaWorkshop.tsx](../features/fragmentarium_import/FormulaWorkshop.tsx) footer. When on, `handlePreview`/`handleImport` route through `v4.processFormula` instead of V3's detect/transform chain.

Harness:
- [debug/v4-verify.mts](../debug/v4-verify.mts) runs both pipelines through the **real** `ShaderFactory` (v4 and v3 paths both use the real engine compile path, not a simplified scaffold — an earlier version lied).
- [debug/v4-bakeoff.mts](../debug/v4-bakeoff.mts) produces the 2×2 outcome matrix.
- [debug/v4-monitor.mts](../debug/v4-monitor.mts) live dashboard on port 3344.
- [debug/v4-analyze-per-iter.mts](../debug/v4-analyze-per-iter.mts) structural analysis: how many V4-accepted formulas have per-iteration-eligible DE shape.

### Honest measurements (both via real ShaderFactory path)

| | V3 honest | V4 honest |
|---|---:|---:|
| Total passes | 216 | **360** |
| per-iteration (real GMT feature compat) | **46** | **0** |
| self-contained / full-DE-fallback | 170 | 360 |
| NaN failures | 114 | 5 |
| Runtime | 536s | 352s |
| Code | ~3100 LOC | ~1500 LOC |

### Why this is paused

V4 handles more formulas but **loses the feature-compat subset V3 had**:

- Engine features interlace / hybrid fold / burning ship / pre-post rotation only work at the engine's outer loop level. They inject operations *between* outer iterations.
- `selfContainedSDE: true` runs the outer loop exactly once. Engine features skip injection (by design).
- V4 emits 100% self-contained → 0 formulas get those features.
- V3's 46 per-iteration passes are the ones that get real feature support.

"V4 is strictly better than V3" is therefore not true today. Total pass count is higher, feature-compat coverage is lower.

### The architectural blind spot

Original V4 plan (§3.1 below) explicitly chose "self-contained is the ONLY emission path" for simplicity. I rationalised this as "per-iteration eats 86% of V3's failure modes so we can skip it" — but I never weighed the *feature-compat cost* of abandoning per-iteration for the 46 formulas V3 could handle. This was a real oversight in the original thesis.

### Candidate direction (raised this session, not yet evaluated)

**Inner-loop injection**: V4's emit inserts template markers (`FRAG_ITER_PRE(z, i)`, `FRAG_ITER_POST(z, i)`) inside the user's existing loop body. Engine features define those macros with per-iteration operator code. Default macros are empty. Preserves the formula verbatim while giving engine features a place to hook.

Unverified candidate. Needs independent architectural review — see [research/v4-rethink-prompt.md](research/v4-rethink-prompt.md).

### Known working (in app, user-validated)

- V4 panel renders correctly (Iterations + Julia auto-wire to engine-side controls after the [slots.ts](../features/fragmentarium_import/v4/emit/slots.ts) fix)
- Some formulas render correctly via V4 self-contained
- GMF save + reload works for V4-imported formulas (user confirmed)
- Workshop toggle cleanly routes between V3 and V4

### Known broken / limitations

- Interlace, hybrid box fold, burning ship, pre/post rotation do **not** work with V4 self-contained imports. Should either be disabled in UI when a V4 import is active (engine already suppresses them via `selfContainedSDE` check — but UI controls remain clickable) or made to work via the injection idea.
- ~100 formulas still fail `webglCompile` under V4. Error clusters: `mc`/`Eye`/`Target` undeclared (formula-specific vars), `dot2` missing (DEC macro), `phi` redefinition. Each a targeted fix worth ~5 min.
- 46 formulas V3 handled per-iteration now go through V4 self-contained — they render but without interlace/fold/burning.

### Phase tracker (updated)

| Phase | State | Notes |
|---|---|---|
| A (verification harness) | ✓ done | Produced honest baseline |
| B.-1 through B.4 (core V4 pipeline) | ✓ done | End-to-end working |
| B.5 (Workshop UI toggle) | ✓ done | Beta checkbox |
| B.7 (v4-verify `--pipeline=v4`) | ✓ done | Real ShaderFactory path |
| B.9 (bakeoff tool) | ✓ done | |
| **Rethink** | **pending** | See research prompt |
| B.10 (per-iteration emitter in V4) | **not built** — pending rethink direction |
| Phase D (cutover) | **blocked** until V4 is strictly better than V3 |
| Phase E (delete V3) | blocked on D |
| Phase F (UI polish + save-as-native) | GMF already works; rest pending |

### Pointers for next session

Before resuming coding, read:
1. This §0
2. [research/v4-rethink-prompt.md](research/v4-rethink-prompt.md) — the open design question
3. [docs/21 §V4 Verification Baseline](21_Frag_Importer_Current_Status.md#v4-verification-baseline) — honest numbers
4. Below §1 onwards for the historical plan (context, not instructions)

Session's conclusion: **don't write more V4 code until the architectural rethink has produced a clear direction.** Current V4 is a viable beta, not a cutover candidate.

---

## 0.1 Forward plan (resolved 2026-04-17, post-rethink)

User decided direction after independent review. Three workstreams:

### (1) V4 per-iteration emitter — `v4/emit/per-iteration.ts`

Rebuild the per-iteration extraction path inside V4, keeping V4's clean boundaries. Not a copy of V3 — V4's cleaner rename / preset / slot handling means we can get a higher per-iter pass rate than V3's 46 without V3's surgical regex fragility.

Scope:
- New `v4/emit/per-iteration.ts` emitter alongside existing self-contained
- `v4/emit/index.ts` dispatcher: if structural analyzer flags per-iter eligible, try per-iter emission; fallback to self-contained if conversion fails
- Reuse V3's pattern detectors (`detectVec4Tracker`, `detectScalarDRAccumulator`, `detectAccumulatorPattern`, `detectVec3WorkingVar`) — they're clean logic, not the fragile part
- Skip V3's 7 bailout-trigger orchestrator — self-contained is V4's honest fallback
- Return expression → `getDist` conversion
- Cross-iteration state hoisting to preamble + preambleVars

Expected ~400-600 LOC. Target: ≥50 per-iter passes (V3 managed 46; V4's cleaner rename should exceed).

**Status: first iteration landed 2026-04-17. ~720 LOC. Not yet cutover-ready.**

Implementation: [v4/emit/per-iteration.ts](../features/fragmentarium_import/v4/emit/per-iteration.ts). Dispatcher in [v4/emit/index.ts](../features/fragmentarium_import/v4/emit/index.ts) prefers per-iter, falls back to self-contained on structural disqualifier / failed conversion / parse-check failure.

Eligibility gate: a formula takes per-iter only if it (a) has a for/while loop, (b) no pre/post-loop value-return or position mutations, (c) no counter-dependent logic beyond the standard `i < ColorIterations` whitelist, (d) a **recognized tracker pattern** (vec4 tracker / vec3 working var / scalar DR accumulator / max-accumulator), and (e) no unrecognised cross-iteration state. Parse-check in the dispatcher rejects emissions whose GLSL is structurally malformed; they fall back to self-contained.

Post-partition: pre-loop decls referenced by the return expression are hoisted to preamble globals + loopInit assignments (so getDist can see them); others stay inside formula_X. Template-shadow rename handles formulas that declare local `c` or `trap` vars colliding with the formula_X signature.

Measured coverage (harness runs 2026-04-17, latest after tracker-preLoop rename fix):

| Metric | V4 baseline (all self-contained) | V4 + per-iter |
|---|---:|---:|
| Total passes | 394 | 330 |
| Per-iter passes | 0 | 13 |
| Structurally per-iter-eligible | — | 39 (22 frag + 28 DEC; narrowed from 71) |
| Per-iter cohort webglCompile fails | — | 20 |
| Per-iter cohort render/sample fails | — | 7 |

Gap to "strictly better than V3": about 64 passes. Confirmed fixes in the latest run: amazingsurface now passes per-iter (template-shadow rename for local `c` + tracker rename applied to pre-loop before partitioning so `vec4 c = Julia ? ... : p;` has `p→z` mapping).

Remaining failure clusters in the per-iter cohort:
- `frag_DE` signature mismatch when the formula calls DE itself as a helper (Xray_skifs)
- Inline `#define` inside DE body corrupted by split/partition (fractal_de102-class)
- `rxy` / `d` undeclared — locals inside nested scopes that partitioning mishandled (PseudoKnightyan)
- `fixIntFloatArithmetic` applied only to formula_X wrapper, not helpers in preamble (fractal_de43-class)
- `renderNonDegenerate` on formulas where per-iter semantics differ subtly from self-contained (Kalibox, menger_iterated_20, default_mandelbox) — likely MinRad2-style param that needs non-default preset to render visibly

Smoke test: [debug/test-v4-per-iter.mts](../debug/test-v4-per-iter.mts). Expected classifications: Mandelbox → per-iter; Tetrahedron / QuaternionJulia / FoldcutToy → self-contained (position-is-tracker, cross-iter state, unrecognized anchor respectively).

Next steps to close the gap (not done this session):
1. Apply `fixIntFloatArithmetic` to helpers in preamble, not just the formula_X wrapper
2. Rename `DE`-colliding helpers to `frag_DE` across the body's call sites (one case from Xray_skifs)
3. Investigate the 3 `renderNonDegenerate` per-iter fails — likely incorrect tracker mapping in edge cases
4. Consider a lighter structural-sanity check at emit time (post-parse AST walk) to catch undeclared locals

### (2) V3 fallback dispatcher

For formulas V4 cannot handle (either pipeline path), Workshop transparently falls back to V3. User never sees the difference — formula works by whatever means available.

Scope:
- Workshop's `buildAndRegisterV4`: if V4 `processFormula` returns `{ok: false}` OR V4 emits code that fails the harness, try V3's `detectFormulaV3 + transformFormulaV3 + buildAndRegister` as fallback
- Log which pipeline was used (diagnostic, not user-facing)
- Keep V3 in tree until V4's coverage is demonstrably ≥ V3's AND no regressions in 2-week monitoring period
- Phase E (delete V3) deferred until fallback metrics show zero V3-required cases over sustained use

### (3) AI skill: Fragmentarium-to-native formula converter

Rather than fighting the impedance mismatch automatically, offer users a **Claude skill** that AI-assists converting a `.frag` into a hand-crafted native `.ts` formula. The output is a real GMT formula (not an import), fully first-class for all engine features.

Scope:
- New skill in `.claude/skills/frag-to-native/` or similar
- Skill reads a `.frag` file, references [docs/22](22_Frag_to_Native_Formula_Conversion.md) + [docs/25](25_Formula_Dev_Reference.md)
- Produces a native `.ts` formula file in `formulas/user/` (gitignored) following the per-iteration OR self-contained native convention
- Uses the testing harness to verify the output before saving
- User reviews the diff, accepts or tweaks

This sidesteps the importer entirely for formulas users actually care about. Imported-via-V4 stays for casual browsing; conversion-to-native is the path for "I want this formula to really work with everything."

### Ordering

1. **(1) V4 per-iteration emitter** — foundation
2. **(2) V3 fallback dispatcher** — safety net for the 46 (and edge cases)
3. **(3) AI skill** — escape hatch for power users
4. Re-measure: V4+fallback vs V3 alone. Only cutover when strictly better.
5. Then Phase D → E → F.

### Revised direction (2026-04-17, post-architecture research)

See [research/hybrid-formula-architecture-comparison.md](research/hybrid-formula-architecture-comparison.md) for the full analysis. Key finding: Mandelbulber2 (the leading OSS 3D fractal renderer) uses **the exact same per-iteration contract as GMT**, and explicitly does not attempt to hybridize full-DE formulas — they require authors to refactor into per-iteration form. The impedance mismatch between Fragmentarium and the engine is a one-time import cost, not an architectural problem.

Consequences:
- **Item (1) — V4 per-iter emitter — is now opt-in only.** First iteration landed 2026-04-17 (~720 LOC in [v4/emit/per-iteration.ts](../features/fragmentarium_import/v4/emit/per-iteration.ts)). Default dispatcher routes to self-contained; per-iter is gated behind `globalThis.V4_ENABLE_PER_ITER` for future experimentation. Measured: 330 total passes with per-iter dispatched first vs 394 with self-contained-only — a net regression. Foundation kept, not promoted.
- **Item (2) — V3 fallback dispatcher — deferred indefinitely.** If per-iter at runtime isn't the path, bridging to V3 at runtime isn't either.
- **Item (3) — AI-assisted .frag → native .ts converter — elevated to primary path.** Move the transformation from runtime to build-time. Same pattern Mandelbulber uses (canonical `.cpp` formula, `.cl` autogenerated).
- **New item (4): N-formula hybrid sequences.** GMT's interlace hardcodes primary + secondary. Mandelbulber's `seq[i] → formula_idx` with per-formula start/stop/weight is the generalization already noted in [docs/24 §8](24_Formula_Interlace_System.md#structural-longer-term). Real feature investment lives here.

---

## 1. Summary

V3 forces foreign (Fragmentarium / DEC) formulas into the engine's per-iteration loop shape. That transformation is the source of essentially all pipeline fragility. V4 inverts the default: emit every import as a **self-contained SDE** (`selfContainedSDE: true`), passing the original DE function through nearly unchanged. The engine already supports this pattern natively ([JuliaMorph.ts:155](../formulas/JuliaMorph.ts#L155), [docs/25 §3.3a](25_Formula_Dev_Reference.md#L135-L203)) — we just stop fighting it.

**Primary goal:** handle more formulas with dramatically less code and no regex-surgery layer.
**Secondary goal:** honest verification (actual WebGL compile + sample-point eval) replacing the current AST-parse-only gate.

---

## 2. Diagnosis — why V3 is the wrong shape

### 2.1 The structural mismatch

Every Fragmentarium/DEC formula has the same shape:

```
uniforms + //slider[…] annotations
optional void init()             — per-pixel setup
helper functions
float DE(vec3 p) {
    // local state
    for/while loop { … may break, may write orbitTrap … }
    // post-loop math
    return distance;
}
```

This is **structurally identical** to the engine's `selfContainedSDE` native pattern. The engine even exposes `SKIP_PRE_BAILOUT` via `#define` for self-contained formulas ([de.ts:81](../shaders/chunks/de.ts#L81)). V3 instead tries to rip out the loop body and reshape it into the engine's outer per-iteration loop — a complete shape conversion.

### 2.2 Fragility is a symptom of the wrong default

[generate/index.ts](../features/fragmentarium_import/v3/generate/index.ts#L505-L584) has **seven** regex-based triggers that bail out of per-iteration mode into `generateFullDE`:

| # | Trigger | Line |
|---|---|---|
| -1 | Pre-loop `return` statements | 505 |
| 0 | No-loop formula with helper calls | 516 |
| 1 | getDist references out-of-scope locals | 526 |
| 1b | No-loop formula declaring local `r`/`dr` | 534 |
| 2 | Unbounded vec4 inversion | 543 |
| 3 | Counter-variable iteration-dependent logic | 556 |
| 4 | Post-loop position mods | 573 |
| 5 | Pre-loop position mods | 581 |

Each trigger is a regex probe. Surrounding them: `removeVarFromDecl` does surgery on comma-separated float decls with regex, `stripOrbitTrapDecl` regex-matches `vec4 g_orbitTrap`, `injectOrbitTracking` walks brace depth inside a string, `fixIntFloatArithmetic` is post-hoc patchwork. **Any formula outside the happy path either falls through these or gets corrupted.**

### 2.3 The "full-DE fallback" is selfContainedSDE-in-disguise — broken

- [full-de.ts:31](../features/fragmentarium_import/v3/generate/full-de.ts#L31): `z = vec4(1e10, 1e10, 1e10, 1.0);` — corrupts `z` to force engine bailout
- `selfContainedSDE` appears **zero** times anywhere in [features/fragmentarium_import/](../features/fragmentarium_import/)
- Consequences: engine still runs pre-bailout check ([core_math.ts:132](../features/core_math.ts#L132)), geometry still injects hybrid fold ([geometry/index.ts:412](../features/geometry/index.ts#L412)), interlace tries to work on globals it can't rename ([interlace/index.ts:298](../features/interlace/index.ts#L298))
- Workshop's `loopMode: 'single'` ([FormulaWorkshop.tsx:413](../features/fragmentarium_import/FormulaWorkshop.tsx#L413)) knows the function is self-contained but never communicates that downstream

### 2.4 The "64/64 passing" claim is a regression allowlist

[test-frag-importer.mts](../debug/test-frag-importer.mts) lists ~60 hand-picked files with explicit `// not importable` exclusions. It's a regression guard for already-working cases, not a coverage measurement.

### 2.5 The "494 verified formulas" claim is AST-parse only

[shader-validator-results.jsonl](../debug/shader-validator-results.jsonl) (304 entries): 183 GLSL-parse pass, **0 WebGL-verified**. [build-passing-lists.mts:67](../debug/build-passing-lists.mts#L67) treats "no WebGL result" as pass by default. Many library entries likely don't actually render.

---

## 3. V4 design

### 3.1 One pipeline, one emission path

Treat every import as a self-contained DE. Wrap the original `float DE(vec3)` with a minimal adapter, set `selfContainedSDE: true`, pack the result into `z.xyzw` per [docs/25 §3.3a](25_Formula_Dev_Reference.md#L135-L203). The engine's outer loop runs exactly once with `break`, just like native self-contained formulas.

**No per-iteration extraction. No fallback heuristics. No regex surgery on function bodies.**

### 3.2 Five-stage pipeline

| Stage | Job | Est. LOC |
|---|---|---|
| **1. Ingest** | Format detection → dispatch to frag / dec / plain-glsl adapter. Produces normalized `RawSource`. | ~300 |
| **2. Preprocess** | Strip `//slider[…]` into structured metadata. Inline `#include` (MathUtils, DE-Raytracer builtins). DEC: promote literals to uniforms. No AST work. **Behavior specified by [Fragmentarium's own preprocessor](https://github.com/Syntopia/Fragmentarium) (GPL-3, license-compatible)** — port behavior, not code. See §11. | ~500 |
| **3. Analyze** | One AST pass. Find DE candidates (signature `float X(vec3)`), helpers, uniforms, globals, `init()`. No extraction, no renaming, no classification beyond what the UI displays. | ~400 |
| **4. Emit** | Build `FractalDefinition` with `selfContainedSDE: true`. Helpers → `preamble`. Globals → `preamble` + `preambleVars`. `init()` → `loopInit`. DE function → `function`, essentially untouched, one-line namespace-safe renames for engine collisions (`map`, `mod289`, etc.). Wrapper emits `z.xyzw` coloring pack. | ~400 |
| **5. Verify** | WebGL compile + sample-point eval at 8–16 positions (finite, non-NaN, plausible magnitude, finite gradient). Gate accept/reject. | ~300 |

**Total:** ~1900 LOC. Current V3 generator + parsers + transform + compat ≈ 3100 LOC. Net delete ≈ 1200 LOC plus deletion of V2 parsers/transforms already loaded as fallback.

### 3.3 Emitted formula shape

```typescript
const def: FractalDefinition = {
  id: 'imp_QuaternionJulia',
  name: 'Quaternion Julia (imported)',
  shader: {
    selfContainedSDE: true,
    preamble: `
      // helpers (verbatim + engine-collision renames)
      mat3 rotationMatrix3(vec3 v, float a) { … }
      vec3 frag_boxFold(vec3 p, float f) { … }
      // mutable globals
      mat3 fracRotation1;
    `,
    preambleVars: ['fracRotation1'],
    loopInit: `
      // original void init() body, params renamed to slot uniforms
      fracRotation1 = uParamA * rotationMatrix3(normalize(uVec3B), uParamC);
    `,
    function: `
      // original DE function — nearly untouched
      float frag_DE(vec3 p) { /* …exactly as source… */ }

      void formula_imp_QuaternionJulia(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;
        float de = frag_DE(p);
        // engine already updated g_orbitTrap via the original function
        trap = min(trap, g_orbitTrap.w);
        // coloring pack per docs/25 §3.3a
        float angle = atan(p.y, p.x);
        z = vec4(abs(de) * cos(angle), abs(de) * sin(angle), de, 0.0);
      }
    `,
    loopBody: 'formula_imp_QuaternionJulia(z, dr, trap, c); break;',
    getDist: 'return vec2(z.z, 0.0);',
  },
  parameters: [ /* user-mapped slots */ ],
};
```

**Properties:**
- DE function body is passed through **verbatim** after a parameter-rename pass that only touches uniform identifiers, engine-colliding function names, and orbit-trap declarations. No structural rewrites.
- Post-loop math, local variables, break conditions, pre/post-loop transforms, counter-dependent logic — **all preserved**, because we don't disassemble.
- Coloring packs into `z.xyzw` at the wrapper boundary, never inside the user's function.

### 3.4 What's kept from V3

- [v3/analyze/preprocess.ts](../features/fragmentarium_import/v3/analyze/preprocess.ts) — `#include` inlining, annotation stripping. Clean and reusable.
- [v3/analyze/params.ts](../features/fragmentarium_import/v3/analyze/params.ts) — uniform + slider annotation extraction. Works well.
- [v3/analyze/init.ts](../features/fragmentarium_import/v3/analyze/init.ts) — `void init()` body detection.
- [parsers/dec-preprocessor.ts](../features/fragmentarium_import/parsers/dec-preprocessor.ts) — DEC macro expansion + constant promotion.
- [formula-library.ts](../features/fragmentarium_import/formula-library.ts) — category index (data, not logic).

### 3.5 What's deleted

- Per-iteration extraction: [v3/generate/loop-body.ts](../features/fragmentarium_import/v3/generate/loop-body.ts), all seven bailout heuristics in [generate/index.ts](../features/fragmentarium_import/v3/generate/index.ts)
- Pattern detectors: [v3/generate/patterns.ts](../features/fragmentarium_import/v3/generate/patterns.ts) (vec4 tracker, vec3 anchor, scalar-dr accumulator, NewMenger accumulator)
- Surgical regex layer: `removeVarFromDecl`, `stripOrbitTrapDecl`, `injectOrbitTracking`, `fixIntFloatArithmetic`, `expandSwizzleWrites`
- V2 compat: [v3/compat.ts](../features/fragmentarium_import/v3/compat.ts), V2 types in [types.ts](../features/fragmentarium_import/types.ts)
- V2 fallback: [parsers/ast-parser.ts](../features/fragmentarium_import/parsers/ast-parser.ts), [parsers/preprocessor.ts](../features/fragmentarium_import/parsers/preprocessor.ts), [parsers/uniform-parser.ts](../features/fragmentarium_import/parsers/uniform-parser.ts), entire [transform/](../features/fragmentarium_import/transform/) directory
- [workshop/detection.ts](../features/fragmentarium_import/workshop/detection.ts), [workshop/preview.ts](../features/fragmentarium_import/workshop/preview.ts) (V2 entry points)

---

## 4. Coverage expectation

### 4.1 What V4 should handle that V3 currently struggles with

| Formula | V3 status | V4 reason it works |
|---|---|---|
| QuaternionJulia | Full-DE fallback | DE unchanged; `dp` derivative tracker lives inside frag_DE untouched |
| LivingKIFS | Full-DE fallback | Local vars never extracted out of DE scope |
| FoldcutToy | Full-DE fallback | `void init()` → `loopInit`; `scalep`, `DE1` pre/post-loop state preserved |
| BioCube, RecFold | Full-DE fallback | Same — no scope extraction needed |
| PseudoKleinian orbit trap | Broken (trap writes don't propagate) | `Thing2(p)` helper writes to `g_orbitTrap` directly (engine global); wrapper reads it after call |
| DEC pre-loop position mods | Bails to full-DE | Preserved verbatim; no "pre-loop mod detector" needed |
| Formulas with counter-dependent `if(i==N)` | Bails to full-DE | Counter lives inside the original loop, always works |

### 4.2 What remains architecturally unsupported

- **2D brute raytracers** (no DE function): RotJulia, BioMorph, sinhJulia, HiddenBrotCos, etc. Different render loop entirely. V4 rejects cleanly with a specific error.
- **Formulas with custom ray setup** (#define providesInit that overrides the ray pipeline). Out of scope.
- **`providesColor` formulas** that define their own color output via Fragmentarium's color pipeline. Could be supported later via a color-provider hook — not in V4 scope.
- **Interlace / hybrid fold / burning ship on imports.** Per [docs/25 §3.3a](25_Formula_Dev_Reference.md#L184), these features are architecturally undefined for self-contained SDEs. They're already broken on V3's full-DE fallbacks (silently); V4 just makes the opt-out explicit.

---

## 5. Engine-side changes

**All perf-neutral. No trace-loop changes, no uniform-schema changes, no compile-pipeline changes.**

1. **New GLSL helper** in [shaders/chunks/](../shaders/chunks/): `frag_packSelfContained(de, p, iterNorm)` — one tiny function that does the `z.xyzw` encoding. ~10 lines. Used by V4 imports; native self-contained formulas may optionally adopt it.
2. **Trap auto-fallback** in the engine's self-contained path: if `trap` is still `1e10` after the formula call, auto-set `trap = dot(z.xyz, z.xyz)`. One line in [core_math.ts](../features/core_math.ts) or [shaders/chunks/de.ts](../shaders/chunks/de.ts).

Nothing else.

---

## 6. Phases & schedule

| Phase | Deliverable | Estimate |
|---|---|---|
| **A. Verification harness** | Extend existing [debug/shader-validator.mts](../debug/shader-validator.mts). Adds sample-point eval + render thumbnail. Produces honest baseline on current library. | 2 days |
| **B. V4 pipeline** | New `v4/` directory. Stages 1–4 implemented. Entry point returns `FractalDefinition`. No UI changes yet — callable via dev toggle. | 4–5 days |
| **C. Corpus bakeoff** | Run Phase A harness against V3 (via compat) and V4 outputs on all 580+ frag files + DEC corpus. Publish honest per-pipeline numbers. | 1 day |
| **D. Cutover** | Workshop default = V4. V3 stays behind a temporary "legacy" toggle if bakeoff flags any regression. | 1 day |
| **E. Delete V3** | Remove V3, V2 parsers, transform, compat.ts, V2 types. ~3100 LOC delete. | 0.5 day |
| **F. UI polish + save-as-native** | Three-pane Workshop (source / uniforms / preview+verify). "Save as .ts" emits clean native formula into `formulas/user/`. | 1–2 days |

**Total:** ~10 working days. Parallel-build keeps V3 operational throughout A–D.

---

## 7. Non-goals

- **Interlace/hybrid-fold/burning-ship compat for imports.** Architecturally incompatible with self-contained SDEs. Users wanting those features must author native formulas.
- **Retiring `FormulaType` union.** Unnecessary churn; runtime registration already works fine.
- **Dynamic uniform schema.** V4 uses existing `paramA..F` / `vec2A..C` / `vec3A..C` / `vec4A..C` slots. No engine-side uniform changes.
- **Per-iteration extraction as opt-in.** Deleted entirely. Bakeoff (Phase C) may reverse this if it finds a formula family that genuinely benefits.
- **Color-provider hooks.** Out of V4 scope; can be added later for `providesColor` formulas.

---

## 8. Open questions

1. Are we willing to publish honest WebGL-verified numbers even if library shrinks significantly (e.g. 494 → 180)? Default: yes.
2. Phase A harness output: pass/fail log only, or also render thumbnails for eyeball-checking "compiles but renders garbage"? Default: thumbnails (slower but more useful).
3. Phase F save-as-native: `formulas/user/` (gitignored, personal) or `formulas/imported/` (committed, shareable)? Default: `formulas/user/`.
4. Bakeoff regressions: if V4 fails on formulas V3 handled, do we ship V4 anyway (with a regression list for later) or block Phase D? Default: ship with known-regressions list.

---

## 9. Phase A — detailed plan

**Objective:** Establish honest coverage baseline for the current pipeline by actually compiling + evaluating every library formula in WebGL2, rather than AST-parse-only. Output is the ground truth against which V4 will be measured.

### A.0 — Inventory existing validator (0.5 day)

[debug/shader-validator.mts](../debug/shader-validator.mts) (985 LOC) already does:
- Parse validation in Node via `@shaderfrog/glsl-parser`
- Builds simulated engine shader scaffold (`ENGINE_SCAFFOLD`)
- `--webgl` mode opens a local dashboard on port 3333, compiles in browser WebGL2, reports back
- Streams results to [shader-validator-results.jsonl](../debug/shader-validator-results.jsonl)

**What it doesn't do:**
- Sample-point evaluation (value sanity, gradient sanity)
- Render thumbnails
- `--webgl` mode has never been run on the full corpus (jsonl contains zero `webglStatus: 'pass'`)
- Run autonomously — requires manual browser open and button click per session

**Action:** read the entire file, document the existing dashboard protocol, identify extension points. Do not rewrite; extend.

### A.0b — Study Fragmentarium source as preprocessor spec (0.5 day)

[Fragmentarium](https://github.com/Syntopia/Fragmentarium) (syntopia/Fragmentarium, GPL-3) is the canonical reference for the `.frag` file format — 15+ years of accumulated edge-case handling. Their C++/Qt preprocessor is the ground truth for:

- `#include` resolution (search paths, circular handling)
- `//slider[min, default, max]` annotation parsing (float / int / vec2 / vec3 / vec4, with step overrides)
- `#preset NAME` / `#endpreset` block parsing
- `#group` hierarchy
- `#define providesInit`, `#define providesColor`, `#define providesBackground` semantics (we currently don't handle these)
- `#buffershader`, `#vertex`, `#FragmentProgram` (mostly not applicable to our pipeline)
- Default preset resolution (when `#preset Default` is present, those values should be our defaults)

**Action:** clone their repo locally, read `Fragmentarium-Source/SyntopiaCore/GLEngine/` and any preprocessor-related files. Produce a short internal doc `docs/26b_Fragmentarium_Spec.md` listing every preprocessor behavior and marking each as "V4 handles / V4 must add / V4 explicitly rejects." This becomes the Stage 2 spec.

**Licensing:** GPL-3 matches ours. If we port code verbatim in addition to behavior, we attribute in source comments. Most likely outcome is clean-room re-implementation in TS from the behavior spec, which keeps license boundaries clean regardless.

### A.1 — Verification spec (with exact thresholds)

A formula **passes** iff all six gates pass. Each gate produces a categorical failure reason; results are recorded per-gate in the jsonl so we can analyse failure distributions.

#### Gate 1: `parse`

- AST parses via `@shaderfrog/glsl-parser` in `quiet: false` mode
- No fatal warnings matching `/Encountered (undefined variable|undeclared type)/` except for names in the engine-defines allowlist (`PI`, `MAX_HARD_ITERATIONS`, `g_orbitTrap`, etc. — same list as current validator)
- **Exists today** in [shader-validator.mts:334](../debug/shader-validator.mts#L334). No change.

#### Gate 2: `webglCompile`

- Fragment shader compiles in WebGL2 context: `gl.getShaderParameter(fs, gl.COMPILE_STATUS) === true`
- Program links: `gl.getProgramParameter(prog, gl.LINK_STATUS) === true`
- Vertex shader is the fixed passthrough from existing validator
- **Scaffold:** [shader-validator.mts `ENGINE_SCAFFOLD`](../debug/shader-validator.mts#L48). V4 uses the same scaffold with its own `{{FORMULA_*}}` injection.

#### Gate 3: `sampleFinite` — no NaN/Inf in distance

**64 deterministic sample positions** rendered to an 8×8 RGBA32F framebuffer.
Positions form a 4×4×4 grid at axis offsets `{-1.83, -0.62, 0.65, 1.81}` (x), `{-1.87, -0.68, 0.63, 1.85}` (y), `{-1.84, -0.65, 0.61, 1.87}` (z). Per-axis jitter avoids exact-zero coordinates that trigger divide-by-zero singularities in many fractal DEs. Each pixel's fragment writes `vec4(distance, gradientMag, 0, 1)`.

**Pass condition:** ≥ **56 of 64** samples (87.5%) have finite non-NaN distance. Slack accounts for sky positions, discontinuities, or fractal-interior points that can legitimately NaN without the formula being broken overall.

#### Gate 4: `sampleNonConstant` — variation across samples

- `max(distances) - min(distances) > 1e-3`
- Rejects formulas returning a near-constant value.

#### Gate 5: `gradientFinite` — Lipschitz sanity

Central-difference gradient at each sample: `grad = (map(p+ε·x̂) − map(p−ε·x̂)) / (2ε)`, ε = 0.01. Magnitude = `length(vec3(gx, gy, gz))`.

**Pass condition:** ≥ **48 of 64** samples (75%) have `0.001 ≤ |grad| ≤ 1e4`. Fractals have sharp features; tolerate up to a quarter of samples hitting discontinuities.

#### Gate 6: `renderNonDegenerate` — DE-slice visualisation with NaN-detection

Instead of raymarching (which depends on camera framing hitting the fractal), the preview shader samples `map()` directly on a 2×2 quadrant of axis-aligned slices:

- Top-left: XY slice at Z=0
- Top-right: XZ slice at Y=0
- Bottom-left: YZ slice at X=0
- Bottom-right: diagonal slice

All positions receive a tiny irrational offset (`vec3(0.017, 0.023, 0.031)`) to avoid exact-zero coordinates, mimicking real-camera behaviour.

**Colour key (hue-distinct so readback can disambiguate):**
- **Orange (255, 128, 0)** — NaN/Inf at this position
- **Blue bands** — exterior (`d > 0`), log-scale banded for visibility
- **Green bands** — interior (`d < 0`), log-scale banded

**Pass conditions (both must hold):**
1. `nanFraction ≤ 30%` — at most 30% of the 4096 pixels are orange (genuinely broken DE)
2. At least one R/G/B channel has σ ≥ 4.0 — rejects all-one-colour outputs

**Why this design:** A formula that's valid at 64 sample positions but NaN across large 3D regions (common for V3-wrapped formulas with numerical instabilities) gets caught by the slice visualisation, where gate 3's 64-point sampling would let it through.

### A.1b — uIterations auto-detection (driver side)

V3's full-DE fallback rewrites hardcoded `for (int i = 0; i < N; ...)` loops to use `if (i >= int(uIterations)) break;`. Authors calibrate DE stability for the original N; running more than N iterations can drive the DE to NaN (classic Mandelbox divergence). The driver detects the hardcoded limit via regex and sets `uIterations` to match. If the formula exposes an `Iterations`-named uniform, that takes precedence.

### A.1b — Per-gate failure bucketing

Each formula row in the extended jsonl carries:

```jsonc
{
  "name": "PseudoKleinian",
  "category": "frag",
  "fragPath": "Knighty Collection/PseudoKleinian.frag",
  "parse":               { "ok": true },
  "webglCompile":        { "ok": true },
  "sampleFinite":        { "ok": false, "reason": "sample 7 returned NaN" },
  "sampleNonConstant":   { "ok": false, "reason": "range = 2.3e-9" },
  "gradientFinite":      { "ok": true, "passedCount": 14 },
  "renderNonDegenerate": { "ok": true, "sigma": [12.4, 8.1, 6.7] },
  "overall":             "fail",
  "failFirstGate":       "sampleFinite",
  "thumbnail":           "thumbnails/a7f3c9d2.png",
  "timeMs":              438
}
```

`failFirstGate` is the key field for triage — tells us how to categorise library health.

### A.2 — Autonomous harness + dashboard extensions (1.5 days)

**Primary path — autonomous via Playwright:**

- New dep: `playwright` (dev-dep; ~200MB install includes Chromium). Run `npx playwright install chromium`.
- New entry point: `debug/v4-verify.mts` that:
  1. Launches headless Chromium via Playwright.
  2. Loads a self-contained validator HTML page (new file, `debug/validator.html`) that exposes a WebGL2 context + a message protocol (`{formula, source, uniforms}` in → `{parse, webglCompile, samples[], thumbnail}` out).
  3. Streams results to `shader-validator-results.jsonl` (same format, extended columns).
  4. Exits non-zero if regressions against a checked-in expected-set are detected.
- Runs unattended. Full corpus target: <10 min. Single-formula smoke test: <5s.

**Secondary path — interactive dashboard** (keep the existing `--webgl` mode for debugging a specific formula):
- Same `validator.html` powers both. Dashboard just loads it with a manual control panel overlay.
- Use this when you want to step through a problem formula and see GLSL errors in the browser console.

**Capabilities added to `validator.html` (used by both paths):**

1. **Sample-point eval shader**: after program link, render a 4×4 framebuffer where each pixel computes `map()` at a predetermined position, read back via `gl.readPixels`. Values → `sampleFinite` / `sampleNonConstant` / `gradientFinite` columns.
2. **Thumbnail render**: 64×64 viewport, fixed camera (origin, -Z, dist 2.0), render engine preview shader, read pixels, encode PNG. Store as `debug/thumbnails/<hash>.png`, referenced from jsonl.
3. **Per-formula status messages** over `postMessage` (dashboard) or exposed window bindings (Playwright).

**Tooling decision:** browser-side WebGL2 was already the right call — it's the real driver stack our engine uses. The addition is Playwright to make it unattended.

**Dependencies to install in Phase A:**

```
npm install --save-dev playwright
npx playwright install chromium
```

No runtime deps added to the shipped app.

### A.3 — Run baseline on corpus (0.5 day)

- All 580+ `.frag` files under `reference/Examples/`
- All DEC formulas in [random-formulas.ts](../features/fragmentarium_import/random-formulas.ts)
- Report: counts per failure class, regression list (which library entries claim to work but don't), comparison to current `passing-formulas.ts`

### A.4 — Publish honest numbers (0.5 day)

- Update [passing-formulas.ts](../features/fragmentarium_import/passing-formulas.ts) to reflect verified pass only
- Update [docs/21](21_Frag_Importer_Current_Status.md) with honest coverage numbers per failure class
- Flag library browser UI entries that fail sampling or render

### A.5 — Success criteria

- Every formula in the library has a honest pass/fail with a specific reason
- Full corpus runs in <10 minutes (headroom for re-runs during V4 development)
- Results are reproducible across runs (deterministic sample positions)
- CI-ready: the harness exit code reflects regression status against a checked-in expected set

### A.6 — Open decisions for Phase A

- **Render camera**: fixed-at-origin looking -Z, distance 2.0 from fractal center, default uniform values, all DDFS features disabled. Reasonable? Or honour formula-provided `#preset Default`? Default (pending user): use `#preset Default` when present, else fixed fallback.
- **Thumbnails storage**: separate `debug/thumbnails/` dir with content-hashed filenames, jsonl references by hash. Cleaner jsonl, gitignored dir.
- **Harness mode**: autonomous Playwright is the primary path (decided above). Dashboard stays for interactive debugging.

---

## 10. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Phase A reveals current library is 60%+ broken | High | Acceptable — honest numbers is the point. Library UI flags unverified entries. |
| V4 fails on a formula family V3 handled via per-iteration extraction | Medium | Bakeoff (Phase C) identifies. Decision point per formula: keep regression as known issue, or hand-author the few affected formulas as native .ts files. |
| `selfContainedSDE` opt-outs (no interlace/fold) upset users of those features on imports | Low | Already broken on V3 (silently). V4 makes the opt-out visible + documented. |
| Compile-time regression from extra preamble code | Low | V4 emits *less* code than V3's full-DE (no `injectOrbitTracking`, no iter counter injection). Measure in Phase C. |
| Engine helper (`frag_packSelfContained`) shader-link overhead | Negligible | Inlined by every driver. |
| Playwright install adds ~200MB to dev environment | Low | Dev-only dep. Already common in web projects. Can be gated behind optional install if needed. |
| Fragmentarium preprocessor reveals behavior we can't replicate in a browser sandbox | Medium | Most is string preprocessing — trivially portable. File-system `#include` needs a resolver abstraction (already have Vite glob-based resolver). If any feature genuinely requires a native runtime, explicitly reject it and document. |

---

## 12. Phase B — detailed plan (V4 pipeline implementation)

**Goal:** implement stages 1–4 of the V4 pipeline in a new `v4/` directory, parallel to `v3/`. No UI cutover — new pipeline invokable via dev flag. Emit `FractalDefinition` directly (no V2 compat bridge). Callable through the existing verification harness for bakeoff in Phase C.

**Estimated effort:** 5.5–6.5 working days (includes B.-1 prerequisite).

**Validation findings from Phase A review** (folded into tasks below):
- Worker protocol drops `selfContainedSDE` on transit to worker — blocking for V4. **Added as B.-1.**
- `#preset Default` exists in 43% of frag files — B.8 helps meaningfully but isn't universal.

### Execution status (as of 2026-04-17) — **Phase B COMPLETE**

| Task | Status | Notes |
|---|---|---|
| B.-1 widen worker protocol | ✓ done | Verified: `SKIP_PRE_BAILOUT` reaches shader for Workshop-registered self-contained formulas |
| B.0 scaffolding | ✓ done | `v4/types.ts`, `v4/index.ts`, `v4/README.md`, subdirs. Typecheck clean |
| B.1 ingest | ✓ done | 12/12 smoke tests. Corpus: 549 accepted / 370 categorically rejected (V4 correctly rejects `#donotrun`, 2D, `providesColor` formulas V3 mistakenly accepted) |
| B.2 preprocess | ✓ done | 549/549 preprocessed cleanly. Generic `#define` expansion, `#preset` extraction, `Phi`/`TWO_PI` auto-injection. 271 (49%) have `#preset Default` |
| B.3 analyze | ✓ done | 549/549 analyzed. Regex-based DE detection, helper catalogue, globals classification |
| B.4 emit | ✓ done | `selfContainedSDE: true` emission, Style A getDist (`return vec2(r, dr);`), slot assignment, ignored-param const-inline, int/bool rename wrapping |
| B.5 integration entry | ✓ done | `V4 pipeline (beta)` checkbox in Workshop footer. `buildAndRegisterV4` helper registers full FractalDefinition including `selfContainedSDE` flag |
| B.6 engine helper | deferred | Not needed — V4's inline wrapper is ~8 lines and works. Could consolidate later |
| B.7 v4 harness route | ✓ done | `--pipeline=v4` flag routes verify through `v4.processFormula` |
| B.8 parameter-aware verification | ✓ implicit | V4 preprocess already overrides annotation defaults with `#preset Default` values. The harness picks them up via `FractalParameter.default` |
| B.9 bakeoff prep | ✓ done | `debug/v4-bakeoff.mts` produces 2×2 outcome matrix + per-gate regression/improvement lists |

### Phase B final measurement (2026-04-17)

| Metric | V3 baseline | **V4** | Δ |
|---|---:|---:|---:|
| Total passes | 318 | **394** | **+76** (+24%) |
| Fragmentarium `.frag` passes | 67 | **124** | **+85%** |
| DEC passes | 251 | **270** | +8% |
| Total failures | 287 | **156** | **−46%** |
| NaN failures (sampleFinite + sampleNonConstant) | 113 | **5** | **−96%** |
| Corpus runtime | 273s | **140s** | 2× faster |
| Regressions (V3 pass → V4 fail) | — | 32 | 21 are correct library-file rejections; 11 true regressions (3.5% of V3 baseline) |
| Improvements (V3 fail → V4 pass) | — | **105** | Includes V3's known-broken cases (BioCube, FoldcutToy, etc.) |

**Verdict: V4 thesis validated.** Self-contained-SDE emission eliminates the per-iteration extraction's structural fragility. Ready for Phase D cutover consideration once user validates the Workshop UI flow interactively.

### B.-1 — Widen worker protocol (0.5 day, **blocking prerequisite**)

The `REGISTER_FORMULA` event type and worker protocol currently carry only a subset of `FractalDefinition.shader`. Missing fields matter for V4 emission:

| File | Line | Current | Change |
|---|---|---|---|
| [engine/FractalEvents.ts](../engine/FractalEvents.ts) | 51 | `shader: { function, loopBody, loopInit?, getDist?, preamble? }` | add `selfContainedSDE?: boolean` |
| [engine/worker/WorkerProtocol.ts](../engine/worker/WorkerProtocol.ts) | 83 | same shape | add `selfContainedSDE?: boolean` |
| [engine/worker/WorkerProxy.ts](../engine/worker/WorkerProxy.ts) | 621 | `registerFormula(id, shader: {...})` | widen shader type |
| [engine/worker/renderWorker.ts](../engine/worker/renderWorker.ts) | 396 | `registry.register({ … shader: msg.shader … })` | pass through unchanged (msg.shader is widened) |

**Verification:** register a minimal self-contained test formula from the Workshop (e.g. copy JuliaMorph's shader fields verbatim), confirm `SKIP_PRE_BAILOUT` define appears in the compiled shader ([core_math.ts:133](../features/core_math.ts#L133)).

**Why blocking:** without this, V4's `selfContainedSDE: true` emission in B.4 has no effect — the flag never reaches the shader compiler. All downstream coverage improvements depend on this working.

**Not included in this prerequisite** (out of scope for V4 Phase B, defer to later):
- `preambleVars` — used by interlace rewriter, but [interlace/index.ts:298](../features/interlace/index.ts#L298) bails on self-contained formulas anyway, so V4 imports don't benefit.
- `usesSharedRotation` — cosmetic.
- `parameters` / `defaultPreset` — only used on main thread (for UI). Worker hardcodes empty, which is fine since worker doesn't build UI.

### B.0 — Scaffolding (0.5 day)

Create `features/fragmentarium_import/v4/` with:

- `v4/types.ts` — unified types (no V2 compat). Key shapes: `RawSource`, `PreprocessedSource`, `FormulaAnalysis`, `GeneratedFormula`, `Result<T>` (success/error sum type).
- `v4/index.ts` — public entry `processFormula(source, filename): Result<FractalDefinition>`, stub only.
- `v4/README.md` — one-pager, points at this plan doc.

Rejection types formalised here: `Rejection = { kind: 'unsupported_render_model' | 'no_de_function' | 'buffer_shader' | 'vertex_shader' | 'provides_color' | 'donotrun' | 'textures_unsupported', message: string, include?: string }`.

### B.1 — Stage 1 Ingest (0.5 day)

- `v4/ingest/frag.ts` — read `.frag` source, look at `#include`s and `#camera` to classify render model against the tables in [26b §5](26b_Fragmentarium_Spec.md#5-render-model-classification-via-include). Reject 2D and multi-pass up front.
- `v4/ingest/dec.ts` — thin wrapper around existing [parsers/dec-preprocessor.ts](../features/fragmentarium_import/parsers/dec-preprocessor.ts). DEC goes through the same downstream stages as frag.
- `v4/ingest/plain-glsl.ts` — bare GLSL with a `float DE(vec3)` function, minimal preprocessing.
- `v4/ingest/index.ts` — format detection + dispatch.

Each adapter returns a `RawSource = { format, source, filename, presetHints, renderModel }`.

### B.2 — Stage 2 Preprocess (1 day)

Port behavior from [docs/26b_Fragmentarium_Spec.md](26b_Fragmentarium_Spec.md) — clean-room TS re-implementation of Fragmentarium's preprocessor:

- `v4/preprocess/annotations.ts` — strip `uniform TYPE name; slider[…]` and `color[…]` annotations, capture as structured metadata. Handles all variants: float/int/vec2/vec3/vec4 sliders, color/floatColor, checkbox, sampler2D (rejected). Carries lock types and tooltips.
- `v4/preprocess/includes.ts` — inline curated builtin set (MathUtils, Complex, EmulatedDouble, *-Noise, QuilezLib, Shadertoy). Non-whitelisted includes are either ignored (render-model includes like `DE-Raytracer.frag`) or rejected (multi-pass).
- `v4/preprocess/presets.ts` — extract `#preset NAME…#endpreset` blocks. Parse the `key = value` lines inside. Resolve `Default` preset's values keyed by parameter name → used as formula defaults.
- `v4/preprocess/replace.ts` — handle `#replace "from" "to"` with correct ordering (later lines only, skip lines containing `#replace`).
- `v4/preprocess/strip.ts` — comment-out / remove `#camera`, `#info`, `#group`, `#define dontclearonchange`, `#vertex…#endvertex`, `void main`.
- `v4/preprocess/index.ts` — orchestrator: `preprocess(RawSource): Result<PreprocessedSource>`. Output has inlined GLSL, structured parameters with annotations + preset defaults, group hierarchy, metadata.

**Parameter defaults are first-class from this stage onward.** Stage 4 emission and verification both use preset values when present.

### B.3 — Stage 3 Analyze (1 day)

One AST pass over the preprocessed GLSL:

- `v4/analyze/ast.ts` — helpers for traversal (find function definitions, uniform declarations, globals, loops).
- `v4/analyze/de-detection.ts` — find candidate DE functions (signature `float X(vec3)` or similar). Report multiple candidates if present — user picks in UI.
- `v4/analyze/helpers.ts` — catalog helper functions reachable from the DE.
- `v4/analyze/globals.ts` — classify top-level identifiers: mutable globals (→ preambleVars), const globals, uninitialized.
- `v4/analyze/params.ts` — reconcile annotation metadata with actual uniform declarations in the GLSL. Handle missing/extra uniforms gracefully.
- `v4/analyze/init.ts` — find `void init()` body. Classify its statements by frequency (pixel-scope vs one-time) — carry forward from V3 if needed, but simpler now.

Produces `FormulaAnalysis = { deFunction, helperFunctions, mutableGlobals, constGlobals, uninitializedGlobals, parameters, initBody?, presets }`.

### B.4 — Stage 4 Emit (1.5 days)

Build `FractalDefinition` with `selfContainedSDE: true`. No per-iteration extraction, no regex surgery.

- `v4/emit/slots.ts` — auto-assign parameters to engine slots (`paramA..F`, `vec2A..C`, `vec3A..C`, `vec4A..C`). Prefer name hints (`Scale → paramA`, `Julia → paramF` as bool, `Iterations → uIterations`, etc.). Emit warnings if slot pressure is exceeded.
- `v4/emit/rename.ts` — namespace-safe identifier renames. Only touches: (a) uniform names mapped to slots, (b) engine-colliding function names (`map`, `mod289`, `permute`, `taylorInvSqrt`, `snoise` — see [core list](../features/fragmentarium_import/v3/generate/index.ts#L230-L238)), (c) `orbitTrap → g_orbitTrap`. DE function body content is otherwise preserved verbatim.
- `v4/emit/preamble.ts` — helpers + const globals + mutable globals → `FractalDefinition.shader.preamble`. Mutable globals listed in `preambleVars` per [docs/25 §3.6](25_Formula_Formula_Dev_Reference.md#36-shaderpreamblevars-optional-but-critical-for-interlace).
- `v4/emit/loop-init.ts` — `void init()` body → `FractalDefinition.shader.loopInit` (renamed to use slot uniforms).
- `v4/emit/wrapper.ts` — build the `formula_X(z,dr,trap,c) { vec3 p = z.xyz; float de = frag_DE(p); pack z.xyzw; }` wrapper per [docs/25 §3.3a](25_Formula_Dev_Reference.md#33a-self-contained-sde-pattern). Coloring pack uses `frag_packSelfContained` (see B.6).
- `v4/emit/parameters.ts` — build `FractalDefinition.parameters` array from `FormulaAnalysis.parameters` + slot assignments. **Defaults come from preset Default if present, else slider-annotation defaults.**
- `v4/emit/index.ts` — orchestrator. Output: `FractalDefinition` ready to register.

### B.5 — Integration entry point (0.5 day)

- `v4/index.ts` exports `processFormula(source, filename): Result<FractalDefinition>` as the public API.
- Workshop UI change: add a `useV4Pipeline` dev toggle (default false). When on, Workshop calls `v4.processFormula()` instead of the V3 `detect → transform → buildFractalParams` chain.
- No other UI changes in Phase B — we want bakeoff signal, not UX iteration.

### B.6 — Engine helper (0.5 day)

- New GLSL helper in `shaders/chunks/frag-pack.ts` (or similar): `frag_packSelfContained(de, p, iterNorm)`.
  - Encodes distance into `z.w` (or via a return-compatible `vec4`), decomposition angle into `z.xy`, normalized iter count into `dr`.
  - ~10 lines of GLSL.
- Add engine-side auto-trap fallback: if `trap` is still `1e10` after the formula call, `trap = dot(z.xyz, z.xyz)`. One-line change in [shaders/chunks/de.ts](../shaders/chunks/de.ts).
- Perf check: compile the engine once with and without these additions. Expected delta: zero (inlined by driver, no runtime cost).

### B.7 — V4 harness integration (0.5 day)

Extend [debug/v4-verify.mts](../debug/v4-verify.mts) with a `--pipeline=v4` flag that routes ingestion through `v4.processFormula()` instead of V3. Writes to a separate output file (`debug/v4-pipeline-results.jsonl`) so we can diff against the V3 baseline in Phase C.

Smoke test: run V4 pipeline on 10 known-good .frag files. Expected: ≥ 8 pass.

### B.8 — Parameter-aware verification (1 day)

**Insight from A.3 baseline:** many "fails" are parameter-starved — formulas that compile cleanly but produce invisible output with generic uniform defaults. Author-calibrated `#preset Default` blocks exist in 251 of 580 frag files (43%) and should be honoured when present.

Work items:

- `v4/preprocess/presets.ts` (already in B.2) parses preset `key = value` lines into `{ paramName: value }`.
- `v4-verify.mts` gains `--with-preset-default`: when running a formula, use its parsed preset Default values for the engine uniforms corresponding to the formula's parameters.
- Harness logic: resolve `preset Default { Scale = 2.0; MinRad2 = 0.25; ... }` → `paramA = 2.0; paramB = 0.25; ...` (via slot mapping from Stage 4).
- When no `Default` preset exists, fall back to slider-annotation defaults (V3-style).

**Expected impact:** pass rate rises for the ~43% of frags with a Default preset. DEC corpus benefits less (constants already promoted via DEC preprocessor). Phase C bakeoff will quantify. Not a silver bullet — just removes one systematic source of false negatives.

### B.9 — Bakeoff prep (0.5 day)

- Ensure `v4-pipeline-results.jsonl` format matches `v4-verify-results.jsonl` so `build-v4-passing.mts` and `v4-diff-baseline.mts` both accept it.
- Add a `--compare-pipelines` flag to v4-diff-baseline or a new `v4-bakeoff.mts` that takes two jsonl files and produces the 2×2 outcome matrix (V3-pass/V4-pass/regression/improvement) with formula names per bucket.

### B — deliverables checklist

- [ ] `v4/` directory with stages 1–4 (~1900 LOC per §3.2 estimate, parameter work adds ~200)
- [ ] `v4/types.ts` with unified types (no V2 bridge)
- [ ] `#preset Default` parsing and propagation to uniform defaults
- [ ] Workshop UI `useV4Pipeline` dev toggle (not default)
- [ ] `shaders/chunks/frag-pack.ts` helper + auto-trap fallback in `de.ts`
- [ ] `debug/v4-verify.mts --pipeline=v4` flag routing through V4
- [ ] `debug/v4-verify.mts --with-preset-default` flag honouring author calibration
- [ ] V4 smoke test passes on 10 known-good formulas
- [ ] V3 remains untouched and default; no regressions in existing Workshop

---

## 13. Phases C–F — sketch

### Phase C — Corpus bakeoff (1 day)

Run the V4-pipeline verification against the full 920-formula corpus. Compare per-formula against the V3 baseline (`debug/v4-expected-passing.txt`).

**Deliverables:**
- `debug/v4-bakeoff-results.jsonl` — V4 pipeline results
- Bakeoff report with 2×2 outcome matrix:
  - V3 ✓ V4 ✓ (both pass — no change)
  - V3 ✓ V4 ✗ (regression — investigate each)
  - V3 ✗ V4 ✓ (improvement — new coverage)
  - V3 ✗ V4 ✗ (both fail — no change)
- Per-bucket formula lists
- Aggregate pass rate comparison

**Decision point:** ship V4 if (regressions ≤ 5% of V3 passes) OR (V4 total passes ≥ V3 total passes). Otherwise: investigate top regression clusters, extend V4, re-run.

### Phase D — Cutover (1 day)

- Workshop `processFormula` entry becomes V4 by default.
- V3 accessible via `workshop.useV3Legacy` dev toggle (escape hatch during bug-report window).
- Update `build-v4-passing.mts` to run from V4 results.
- User-facing changelog entry: honest pass counts, what formulas gained/lost support.

### Phase E — Delete V3 (0.5 day)

- Remove `v3/`, `parsers/`, `transform/`, `v3/compat.ts`.
- Remove V2 types from `types.ts`; V4 types become canonical.
- Update all imports across Workshop UI, engine entry points, test harness.
- ~3100 LOC deletion (per §3.5 estimate).
- Run existing regression tests.

### Phase F — UI polish + save-as-native (1–2 days)

- Three-pane Workshop UI (source / parameters / preview).
- Live verification badge (re-uses V4 gates on each user param change).
- "Save as Native Formula" → emit a clean `.ts` file into `formulas/user/` (gitignored) that auto-registers on next boot. Imports become real native formulas, fully first-class thereafter (interlace/fold apply to the `.ts` file if the user writes it that way).
- Library browser filters by verification status (already-a-pass / not-yet-verified / known-fail).

### Phase total

Phases B (5–6 days) + C (1) + D (1) + E (0.5) + F (1–2) = **8.5–10.5 working days**.

---

## 11. External references

- **Fragmentarium** — [github.com/Syntopia/Fragmentarium](https://github.com/Syntopia/Fragmentarium). GPL-3. Canonical reference for `.frag` format and preprocessor semantics. Referenced as spec in Stage 2 and Phase A.0b.
- **Fragmentarium examples bundled here** — [features/fragmentarium_import/reference/Examples/](../features/fragmentarium_import/reference/Examples/) (580+ files).
- **DEC (Distance Estimator Compendium)** — integrated via [parsers/dec-preprocessor.ts](../features/fragmentarium_import/parsers/dec-preprocessor.ts).
- **GLSL AST parser** — [@shaderfrog/glsl-parser](https://github.com/ShaderFrog/glsl-parser).
