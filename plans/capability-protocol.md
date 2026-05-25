# GMT Feature Compatibility Protocol — Phased Implementation Spec

**Status**: Plan, not built
**Source root**: `h:/GMT/workspace-gmt/dev/`
**Driving initiative**: New Scene wizard (this protocol is sequenced FIRST as the foundation)
**Drafted**: 2026-05-25 via orchestrator audit chain

## Audit corrections (verified against code)

Two diffs vs. earlier audit:

| Earlier audit said | dev/ actually has | Implication |
|---|---|---|
| 42 native formulas | **45** (`engine-gmt/formulas/*.ts`) | P1 budgets scale by ~7% |
| One existing `dependsOn` | **Three**: `LightSpheresFeature.dependsOn = ['lighting']` (`features/lighting/light_spheres.ts:33`), `InterlaceFeature.dependsOn = ['coreMath', 'geometry']` (`features/interlace/index.ts:122`) | Protocol's `requires` model coexists with `dependsOn`, doesn't replace it |

Other audit claims confirmed:
- 12 formulas declare `supportsCuttingPlane: true`. 15 declare `usesSharedRotation: true`. 2 declare `selfContainedSDE: true` (`MandelTerrain`, `JuliaMorph`).
- V3 `generateFullDE` is called from 9 fallback sites in `v3/generate/index.ts` — **none** set `selfContainedSDE`. This is the silent-corruption codepath.
- V4 `emit/index.ts:294` unconditionally sets `selfContainedSDE: true`, no other shader flags.
- `tabConfig.condition` defined in `engine/FeatureSystem.ts:159-163` — unused by greppable callers.
- Two-file CP mirror: `features/core_math.ts:110-120` and `engine-gmt/engine/SDFShaderBuilder.ts:202-206` (ADR-0052).
- GMF stash round-trip for all four flags confirmed (`selfContainedSDE` patched in today).

## Vocabulary (locked)

8 closed capability tokens:
- `shape:per-iteration` — engine owns the outer loop
- `shape:self-contained` — formula owns its loop (runs once + break)
- `shape:modular` — graph-compiled
- `iter:c-constant` — accepts Julia-style c override
- `iter:shared-rotation` — reads `gmt_rotAxis/rotCos/rotSin`
- `estimator:cutting-plane` — writes `cp_dmin/cp_scale/cp_trap`
- `render:writes-trap` — populates result.y for trap-mode coloring
- `render:writes-iter` — populates result.z meaningfully

## Phase ordering summary

| # | Title | Risk | Effort | Blocks | Blocked by |
|---|---|---|---|---|---|
| 0 | Vocabulary + types + reducer + shim | S | 6h | all | — |
| 1 | Native formula capability declarations | M | 10h | P3, P7 | P0 + sub-investigation |
| 2 | Modular + cross-formula rejections | S | 5h | P4 | P0, P1 |
| 3 | AutoFeaturePanel + Engine panel consumers | M | 8h | P4 | P0, P2 |
| 4 | Interlace dropdown fix | S | 3h | — | P2, P3 |
| 5 | V4 emitter capability declarations | M | 5h | P8 | P0 |
| 6 | V3 emitter capability declarations | L | 6h+3h inv. | P8 | P0 + sub-investigation |
| 7 | CP mirror collapse | S | 3h | P8 | P1 |
| 8 | Cleanup, remove shim, deprecate flags | L | 8h | — | P1–P7 |

**Total effort**: ~57h code + ~5h sub-investigations = ~62h. ~2 weeks focused work.

**Critical-path milestone**: P0+P1+P2+P3+P4 = 32h = "user-visible UX win" (disable broken affordances). P5–P8 ship separately.

## Sub-investigations required

**Before P1** (~3h): per-formula classification of `iter:c-constant`, `render:writes-trap`, `render:writes-iter`. Audit method = scan `shader.function` body. Output = table in `dev/docs/gmt/23_Formula_Audit.md`.

**Before P6** (~3h): audit each of the 9 V3 fallback trigger sites in `v3/generate/index.ts:520-595`. Confirm `'shape:self-contained'` is semantically correct. Sample 20 V3-passing formulas, predict + verify capability assignments. Output = table in `dev/docs/gmt/21_Frag_Importer_Current_Status.md`.

## Documentation deliverables (per-phase)

| Phase | New / updated doc |
|---|---|
| P0 | NEW `dev/docs/gmt/35_Capability_Protocol.md` (vocabulary, reducer, examples) + NEW `dev/docs/adr/0059-feature-capability-protocol.md` |
| P1 | Update `25_Formula_Dev_Reference.md` §3.7–3.9 |
| P2 | Update `03_Modular_System.md` + Modular matrix in `35_Capability_Protocol.md` |
| P3 | Update `01_System_Architecture.md` §2.2 |
| P4 | Update `24_Formula_Interlace_System.md` |
| P5–P6 | Update `21_Frag_Importer_Current_Status.md` + `26_Formula_Workshop_V4_Plan.md` |
| P7 | Addendum to ADR-0052 |
| P8 | Amendment to ADR-0059; rewrite `25_Formula_Dev_Reference.md` §3.7–3.9 |

## Cross-cutting concerns

### Test coverage
- **NEW** `npm run test:compat` in P0: Node-only matrix sweep. For each (primary × {none, every secondary} × each enabled feature singleton), call `evaluateCompat`, write/diff snapshot to `debug/compat-snapshot.jsonl`. Runtime ≤5s.
- Existing `test:baseline`, `test:hybrid`, `test:interlace`, `test:frag` run unchanged through all phases as regression gates.

### GMF round-trip
The protocol introduces no new GMF fields until P8. Capabilities derive at load via shim from existing stashed flags. P8 stashes capabilities directly; falls back to legacy auto-detect for ancient files.

### Compile-gate transition
Protocol does NOT mutate state on formula switch — UI displays disabled affordances; user's saved preset survives. Matches `feedback_no_compile_gate_realtime`.

---

# Phase 0 — Vocabulary, types, reducer, legacy shim

## Scope
**In**: New types file, new reducer, `deriveLegacy` shim, registry decoration on `register()`, `test:compat` harness, ADR-0059, doc 35 stub.
**Out**: No consumer changes. No `inject()` reads reducer. No UI changes.

## Files changed
| Path | Change |
|---|---|
| `dev/engine-gmt/types/fractal.ts` | Add `capabilities?: ReadonlySet<Capability>` to `FractalDefinition` (optional in P0). |
| `dev/engine-gmt/engine/FeatureSystem.ts` | Add `requires?: { primary?, secondary?, pair?, rejects? }` to `FeatureDefinition`. |
| `dev/engine-gmt/engine/FractalRegistry.ts` | `register(def)`: if `def.capabilities` undefined, set via `deriveLegacy(def)`, then `Object.freeze`. Modular gets `'shape:modular'`. |
| `dev/package.json` | Add `"test:compat": "tsx debug/test-compat.mts"`. |

## New files
| Path | Purpose |
|---|---|
| `dev/engine-gmt/types/capabilities.ts` | `Capability` literal union, `CapabilitySet`, `CapabilityRequirements`. Zero deps. |
| `dev/engine-gmt/engine/compat/deriveLegacy.ts` | Pure shim. Hardcodes Modular id check. P8 sunset comment. |
| `dev/engine-gmt/engine/compat/evaluateCompat.ts` | Pure reducer. No memo, no caching. |
| `dev/engine-gmt/engine/compat/index.ts` | Barrel. |
| `dev/debug/test-compat.mts` | Snapshot matrix sweep. |
| `dev/debug/compat-snapshot.jsonl` | Initial snapshot, committed after review. |
| `dev/docs/gmt/35_Capability_Protocol.md` | Reference doc. |
| `dev/docs/adr/0059-feature-capability-protocol.md` | ADR. |

## Backward compatibility
Pure addition. `capabilities` is optional. Existing `shader.*` flags remain authoritative — nothing reads `capabilities` yet.

## Verification
- `npx tsc --noEmit` clean.
- `test:baseline`, `test:hybrid`, `test:interlace` — unchanged.
- `test:compat` — generates initial snapshot. Manual review confirms: Mandelbulb → `{shape:per-iteration}`, MandelTerrain → `{shape:self-contained}`, MengerSponge → `{shape:per-iteration, estimator:cutting-plane}`, Modular → `{shape:modular}`.
- Manual: `npm run dev`, load 5 random scenes — no visible change.

## Risk: **S**
**Biggest risk**: `Object.freeze(capabilities)` breaks downstream mutation. Unlikely — nothing reads it yet.

## Effort: **6h**

## Rollback
Revert all files. No state change, no GMF format change. Single commit, single revert.

---

# Phase 1 — Native formula migration

## Scope
**In**: All 45 formulas declare explicit `capabilities`. Shim stays as safety net.
**Out**: Modular (deferred to P2 — needs rejection wiring). V3/V4-emitted formulas (P5–P6).

## Files changed
| Path | Change |
|---|---|
| `dev/engine-gmt/formulas/*.ts` × 44 | Add `shader.capabilities: new Set([...])`. Mechanical translation + manual classification for `iter:c-constant`, `render:writes-trap`, `render:writes-iter`. |
| `dev/engine-gmt/engine/FractalRegistry.ts` | If `def.capabilities` set, use as-is; else shim. Dev-mode warn on divergence. |

## Verification
- `test:compat` — snapshot DIFF expected for new tokens. Snapshot updated + committed.
- `test:baseline`, `test:hybrid`, `test:interlace` — pass.
- Manual: 1 scene per category, no visible change.

## Risk: **M**
**Biggest risk**: misclassification of new tokens locks wrong answer in snapshot.

## Effort: **10h** code + **3h** sub-investigation (precedes implementation)

## Rollback
Revert formula edits. Shim derives same legacy capabilities.

---

# Phase 2 — Modular + cross-formula rejections

## Scope
**In**: Modular declares `'shape:modular'`. Hybrid Box, Burning Ship, Interlace declare `requires.rejects`. `inject()` early-returns stay in place (protocol becomes secondary source of truth).
**Out**: No `inject()` deletion. UI consumer wiring deferred to P3.

## Files changed
| Path | Change |
|---|---|
| `dev/engine-gmt/formulas/Modular.ts` | Add `shader.capabilities = new Set(['shape:modular'])`. |
| `dev/engine-gmt/features/geometry/index.ts` | Declare `requires: { rejects: { primary: ['shape:self-contained', 'shape:modular'] } }`. |
| `dev/engine-gmt/features/interlace/index.ts` | Declare `requires: { rejects: { primary: ['shape:self-contained', 'shape:modular'], secondary: [...] } }`. |
| `dev/engine-gmt/engine/FractalRegistry.ts` | Remove hardcoded Modular branch in `deriveLegacy` — `Modular.ts` declares it directly. |

## Verification
- `test:compat` — snapshot updates: Modular as primary triggers `disabled` for geometry/interlace.
- `test:hybrid`, `test:interlace` — pass.
- Manual: Modular scene + enable Burning Ship → no glitch. Enable Hybrid Box → no glitch.

## Risk: **S**
**Biggest risk**: `geometry` declares `rejects.primary` but `inject()` still has a uncovered branch — driver compile error possible. Mitigation: grep audit pre-merge.

## Effort: **5h**

## Rollback
Revert + re-add hardcoded Modular branch in `deriveLegacy`.

---

# Phase 3 — AutoFeaturePanel + Engine panel consumers

## Scope
**In**: `AutoFeaturePanel.tsx`, `CompilableFeatureSection.tsx`, Engine panel feature checkboxes consult `evaluateCompat()`. Disabled state + tooltip when `status !== 'ok'`.
**Out**: Interlace formula picker (P4). Modular graph node compat.

## Files changed
| Path | Change |
|---|---|
| `dev/engine/components/AutoFeaturePanel.tsx` | Import `evaluateCompat`. `useMemo` keyed on `(primaryId, secondaryId, enabledFeatures)`. Per-feature disabled+tooltip render. |
| `dev/engine/components/CompilableFeatureSection.tsx` | Same pattern. Disabled state grays Compile button. |
| `dev/engine-gmt/components/EnginePanel/EngineFeatureList.tsx` (verify path) | Engine panel checkboxes consult report. |
| `dev/engine/FeatureSystem.ts` | Wire `tabConfig.condition` to call `evaluateCompat`. |

## Verification
- Manual (visual smoke): switch to MandelTerrain → Hybrid Box, Burning Ship, Interlace picker all gray. Switch to Mandelbulb → re-enable.
- `test:compat` no snapshot change (pure UI).
- `test:baseline` pass.

## Risk: **M**
**Biggest risk**: `useMemo` dep miss → panel doesn't re-render on toggle. Mitigation: derive memo key from stable hash.

## Effort: **8h**

## Rollback
Revert files. Disabled-state disappears; reverts to silent rejection.

---

# Phase 4 — Interlace dropdown fix

## Scope
**In**: `getFormulaOptions()` filters via protocol. Disabled options with tooltip for self-contained + Modular.
**Out**: Capability-aware sort/grouping (gold-plating).

## Files changed
| Path | Change |
|---|---|
| `dev/engine-gmt/features/interlace/index.ts` | `getFormulaOptions()` returns `{label, value, disabled?, reason?}`. Filter computed from `requires.rejects.secondary`. |
| Interlace dropdown render site (audit needed — confirm which component) | Render disabled options with tooltip. |

## Verification
- Manual: primary = Mandelbulb, open interlace dropdown → MandelTerrain, JuliaMorph, Modular all disabled with tooltip.
- `test:interlace` — pass.
- `test:compat` no change.

## Risk: **S**
**Biggest risk**: mis-identify dropdown render site. Mitigation: grep `getFormulaOptions(` consumers.

## Effort: **3h**

## Rollback
Revert. Dropdown reverts to "Modular-only filter".

---

# Phase 5 — V4 emitter capability declaration

## Scope
**In**: V4 `emit/index.ts` + `emit/per-iteration.ts` populate `shader.capabilities` based on emitter mode + heuristics (`gmt_*` calls → `iter:shared-rotation`; `cp_*` writes → `estimator:cutting-plane`).
**Out**: V3 (P6). Re-classifying historically-imported formulas.

## Files changed
| Path | Change |
|---|---|
| `dev/engine-gmt/features/fragmentarium_import/v4/emit/index.ts` | After `:283-298` wrapper-build, assign capability set. Self-contained → `'shape:self-contained'`. |
| `dev/engine-gmt/features/fragmentarium_import/v4/emit/per-iteration.ts` | After per-iter emission, assign `'shape:per-iteration'`. Detect `gmt_*` + `cp_*` patterns. |

## Verification
- `test:frag` — 64/64 pass.
- `catalog:build` — regen; snapshot diff bounded to capability fields.
- Manual: import known V4-eligible Fragmentarium file. Engine panel grays Hybrid Box (was clickable-but-broken per `26_Formula_Workshop_V4_Plan.md:76`).

## Risk: **M**
**Biggest risk**: V4 per-iteration emitter is structurally fragile; capability assignment in wrong post-emit slot may double-classify. Mitigation: assign AFTER fallback decision.

## Effort: **5h**

## Rollback
Revert. V4 emissions revert to shim deriving `'shape:self-contained'` from `selfContainedSDE: true`.

---

# Phase 6 — V3 emitter capability declaration

## Scope
**In**: V3 per-iteration path declares `'shape:per-iteration'`. V3 full-DE fallback declares BOTH `'shape:self-contained'` AND sets `shader.selfContainedSDE = true`. Closes silent-corruption hole flagged in `research/v4-rethink-prompt.md:49`.
**Out**: Re-classifying historically-V3-imported formulas. Per-formula CP/rotation detection (could become P6.1).

## Files changed
| Path | Change |
|---|---|
| `dev/engine-gmt/features/fragmentarium_import/v3/generate/full-de.ts` | At each of 9 fallback sites in `v3/generate/index.ts`, mark `shader.selfContainedSDE = true` AND `shader.capabilities = new Set(['shape:self-contained'])`. |
| `dev/engine-gmt/features/fragmentarium_import/v3/generate/index.ts` | Per-iter return at `:601-612` adds `shader.capabilities = new Set(['shape:per-iteration'])`. |
| `dev/engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:837-838` | Defense-in-depth: shim fills if unset. |

## Verification
- `test:frag` — 64/64 pass.
- `catalog:build` — snapshot diff bounded.
- Manual: import a known V3 full-DE-fallback formula. Engine panel grays Hybrid Box. Save GMF, reload — flag survives.

## Risk: **L**
**Biggest risk**: setting `selfContainedSDE: true` on full-DE-fallback imports changes runtime behavior (engine emits SKIP_PRE_BAILOUT + SELF_CONTAINED_SDE defines). Some V3-fallback imports may render differently. Mitigation: stage as behavior-change phase with changelog note + 10 known-good V3-fallback GMF visual-compare.

## Effort: **6h** code + **3h** sub-investigation

## Rollback
Revert. V3 silent corruption returns (acceptable — pre-protocol behavior).

---

# Phase 7 — Cutting Plane mirror collapse

## Scope
**In**: Single helper `pairHasCapability(primary, secondary, cap)` replaces `pairSupportsCP()` mirror.
**Out**: Other capability-mirror collapses (none currently exist at this scale).

## Files changed
| Path | Change |
|---|---|
| `dev/engine-gmt/engine/compat/pairHasCapability.ts` | NEW (or folded into `evaluateCompat.ts`). |
| `dev/engine-gmt/features/core_math.ts` | `:201-205` → `pairHasCapability(def, interlaceDef, 'estimator:cutting-plane')`. Drop inline mirror. |
| `dev/engine-gmt/engine/SDFShaderBuilder.ts` | `:202-206` → same. MIRROR comment deleted. |
| `dev/docs/adr/0052-...md` | Addendum: mirror coupling resolved by ADR-0059. |

## Verification
- `test:baseline`, `test:hybrid`, `test:interlace` — pass.
- Manual: mesh export Menger Sponge + interlace Mandelbulb. Result identical to today.

## Risk: **S**
**Biggest risk**: `addPreamble` dedup misses edge case if capability missing on V3-imported CP formula (P6 didn't classify CP). Mitigation: dev-mode assertion warns on divergence.

## Effort: **3h**

## Rollback
Revert. Inline duplication returns.

---

# Phase 8 — Cleanup: remove shim, deprecate legacy flags

## Scope
**In**: Remove `deriveLegacy.ts`. `capabilities` REQUIRED. Mark legacy flags `@deprecated`. GMF stashes capability set directly. Remove or wire `tabConfig.condition`.
**Out**: Renaming legacy flags (just delete).

## Files changed
| Path | Change |
|---|---|
| `dev/engine-gmt/engine/compat/deriveLegacy.ts` | DELETED. |
| `dev/engine-gmt/engine/FractalRegistry.ts` | Remove shim fallback; throw at `register()` if `capabilities` undefined. |
| `dev/engine-gmt/types/fractal.ts` | `capabilities` REQUIRED. Legacy flags `@deprecated`. |
| `dev/engine-gmt/utils/FormulaFormat.ts` | `generateGMF` stashes `shaderMeta.capabilities` as serialized array. `parseGMF` reads; missing → legacy auto-detect fallback. |
| `dev/engine-gmt/formulas/*.ts` | Delete legacy flags (capabilities are SoT). |
| `dev/engine-gmt/engine/FeatureSystem.ts` | Remove `tabConfig.condition` if unused, OR rename to `tabConfig.requires`. |
| `dev/docs/gmt/25_Formula_Dev_Reference.md` | §3.7–3.9 rewritten. |

## Verification
- `npx tsc --noEmit` clean. Any lingering `shader.selfContainedSDE` read errors out.
- All test scripts pass.
- GMF compat: load 5 pre-P8 GMF files — succeed via auto-detect fallback.
- Manual full smoke.

## Risk: **L**
**Biggest risk**: a consumer (worker protocol? mesh export?) still reads legacy flag via `any` widening. Mitigation: grep all four legacy flag names across all dev/ subdirs. Expected post-P0–P7 count: type def + GMF stash only.

## Effort: **8h**

## Rollback
Revert. **Only phase with non-trivial rollback** — GMF files saved between P8 and rollback need one-shot migration script. Flag in PR template.

---

## Files to read first (per-phase implementer)

| Phase | Read before starting |
|---|---|
| P0 | `dev/engine-gmt/types/fractal.ts`, `dev/engine-gmt/engine/FractalRegistry.ts`, `dev/engine/FeatureSystem.ts`, `dev/docs/adr/0048-...md`, this spec |
| P1 | `dev/docs/gmt/25_Formula_Dev_Reference.md`, `dev/docs/gmt/23_Formula_Audit.md`, P1 sub-investigation report |
| P2 | `dev/docs/gmt/03_Modular_System.md`, `dev/engine-gmt/features/geometry/index.ts:440-500`, `dev/engine-gmt/features/interlace/index.ts:300-340` |
| P3 | `dev/docs/gmt/01_System_Architecture.md` §2.2, `dev/engine/components/AutoFeaturePanel.tsx`, `dev/engine/components/CompilableFeatureSection.tsx` |
| P4 | `dev/engine-gmt/features/interlace/index.ts:44-52`, P3 PR for the pattern |
| P5 | `dev/docs/gmt/26_Formula_Workshop_V4_Plan.md` §0, `dev/engine-gmt/features/fragmentarium_import/v4/emit/index.ts`, ADR-0058 |
| P6 | `dev/docs/gmt/21_Frag_Importer_Current_Status.md`, `dev/engine-gmt/features/fragmentarium_import/v3/generate/index.ts:500-612`, P6 sub-investigation report, `dev/docs/research/v4-rethink-prompt.md` |
| P7 | `dev/docs/adr/0052-...md`, `dev/engine-gmt/features/core_math.ts:100-250`, `dev/engine-gmt/engine/SDFShaderBuilder.ts:195-220` |
| P8 | This spec + P1–P7 PRs |
