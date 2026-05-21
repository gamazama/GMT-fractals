---
source: engine-gmt/engine/UniformSchema.ts
lines: 104
last_verified_sha: 267fbb91591adf2202ceba758067113e4026e5a9
additional_sources:
  - engine/UniformSchema.ts
  - engine-gmt/engine/UniformNames.ts
  - engine/UniformNames.ts
  - engine-gmt/engine/TickRegistry.ts
  - engine/TickRegistry.ts
  - engine-gmt/engine/FractalEvents.ts
  - engine/FractalEvents.ts
  - engine-gmt/engine/FeatureSystem.ts
  - engine/FeatureSystem.ts
  - engine-gmt/engine/worker/ViewportRefs.ts
  - engine/worker/ViewportRefs.ts
  - engine-gmt/engine/BloomPass.ts
  - engine/BloomPass.ts
  - engine-gmt/engine/RenderPipeline.ts
  - engine/RenderPipeline.ts
  - engine-gmt/engine/managers/ConfigManager.ts
  - engine/managers/ConfigManager.ts
  - engine-gmt/engine/ShaderBuilder.ts
  - engine/ShaderBuilder.ts
  - engine-gmt/engine/ShaderConfig.ts
  - engine/ShaderConfig.ts
  - engine-gmt/engine/ShaderFactory.ts
  - engine/ShaderFactory.ts
  - engine-gmt/engine/ConfigDefaults.ts
  - engine/ConfigDefaults.ts
  - engine-gmt/engine/HardwareDetection.ts
  - engine/HardwareDetection.ts
  - engine-gmt/engine/utils/FullscreenQuad.ts
  - engine/utils/FullscreenQuad.ts
  - engine-gmt/engine/managers/UniformManager.ts
  - engine-gmt/types/common.ts
  - types/common.ts
audited: 2026-05-20T07:30:00Z
audited_by: claude-opus-4-7
public_api:
  - UniformSchema
  - UNIFORM_SCHEMA
  - createUniforms
  - ConfigManager
  - ConfigUpdateResult
  - ShaderBuilder
  - RenderVariant
  - ShaderFactory
  - ShaderConfig
  - UniformManager
  - TICK_PHASE
  - registerTick
  - runTicks
  - FractalEvents
  - featureRegistry
  - FormulaType
  - createDefaultShaderConfig
  - detectHardwareProfile
  - FullscreenPass
  - setViewportCamera
depends_on: []
---

# Engine fork rules — when to fork, when to shim, when to keep one copy

The repo carries two parallel source trees of "engine" code: `engine/` is the GMT-agnostic core that was extracted out of the original monolith and is meant to ship to non-GMT apps (fluid-toy, demo, fractal-toy); `engine-gmt/` is the GMT-specific superset that still owns the raymarcher, the GMT material pipeline, and the worker-side render loop. Three-tier model documented at `docs/engine/01_Architecture.md:20-46` (core → core plugins → apps) treats `engine-gmt/` as a *tightly-coupled domain layer*, not a clean plugin — see the audit acknowledgement at `docs/engine/21_Code_Review_2026-04-25.md:78-82`.

The two trees do not have a 1:1 file mapping. Some files exist in both (and must stay in sync, sometimes via a shim, sometimes deliberately diverged); some exist only in `engine-gmt/` (GMT-specific surface area with no plausible non-GMT use); and the `types/` directory has its own divergence story (the dev/engine-gmt fork has *regressed* to a literal union for `FormulaType` that the stable branch already collapsed to an opaque `string` tag — see `plans/doc-audit-state/survey/_followups/q-102.md`).

This document is the canonical reference subsystem-doc writers cite instead of re-deriving the rules: §"Catalog of fork pairs" enumerates every observed pair and labels it by pattern; §"Rules for new fork-pair work" is prescriptive (which pattern to pick when adding a new fork-pair); §"Invariants" is the must-hold list; §"Known issues / drift to fix" pulls open work items from `plans/doc-audit-state/phase-2-carry-in.json`.

## Catalog of fork pairs

Each entry below cites the engine-core file:line first, then the engine-gmt file:line. "GMT-only" means no engine-core sibling. "core-only" means no engine-gmt sibling.

### Pattern A: Re-export shim

The engine-gmt copy is reduced to `export * from '../../engine/<file>'` (or a selective named re-export). Use when the file's surface area is identical and the engine-core copy is the single source of truth. Critical because each shimmed module is a **module-scoped singleton** — duplicating the source would split identity (see the post-mortem comment at `engine-gmt/engine/FeatureSystem.ts:1-11`, the canonical "duplicate singleton bites you" cautionary tale).

Observed pairs (canonical form: `export * from '../../engine/...'`):

| engine-core source (sole truth) | engine-gmt shim | Lines (gmt) | Notes |
|---|---|---|---|
| `engine/TickRegistry.ts:1-138` | `engine-gmt/engine/TickRegistry.ts:1-6` | 6 | Tick registry is the only frame-loop dispatcher; identity is load-bearing. |
| `engine/FractalEvents.ts:1-80` | `engine-gmt/engine/FractalEvents.ts:1-7` | 7 | Event-bus module-scoped singleton. |
| `engine/FeatureSystem.ts:1-649` | `engine-gmt/engine/FeatureSystem.ts:1-12` | 12 | Originally a verbatim copy — the comment at `engine-gmt/engine/FeatureSystem.ts:1-11` records the bug that motivated the shim (second registry instance was invisible to the store's `createFeatureSlice`). |
| `engine/UniformNames.ts:1-95` | `engine-gmt/engine/UniformNames.ts:1-2` | 2 | Pure constants; no GMT-specific names. |
| `engine/BloomPass.ts:1-351` | `engine-gmt/engine/BloomPass.ts:1-2` | 2 | Pure math/three pass; no GMT state. |
| `engine/RenderPipeline.ts:1-612` | `engine-gmt/engine/RenderPipeline.ts:1-5` | 5 | Comment at `engine-gmt/engine/RenderPipeline.ts:2-4` records the structural-assignability path that lets GMT's richer `QualityState` flow through the core's loose-record signature. |

One variation — **named selective re-export** at `engine-gmt/engine/worker/ViewportRefs.ts:13-22` lists 8 symbols explicitly rather than using `export *`. The leading comment at `engine-gmt/engine/worker/ViewportRefs.ts:1-12` records the bug that motivated the shim (two module-level `_camera` variables produced silent dirty-state desync between `GmtRendererTickDriver` and `utils/timelineUtils.ts`). This selective form is a footgun: a future export in `engine/worker/ViewportRefs.ts` will not appear on the GMT side until the list at `engine-gmt/engine/worker/ViewportRefs.ts:13-22` is updated. See Rule 6 below.

### Pattern B: Genericized fork

The engine-core copy is the **generic extract**; the engine-gmt copy is the original GMT-coupled module retained for the GMT app. The two are NOT meant to converge — back-porting the JSDoc or the genericised shape from the engine extract to the engine-gmt copy would re-introduce coupling the extraction deliberately stripped (`plans/doc-audit-state/survey/_followups/q-098.md`).

Observed pairs:

| engine-core (generic extract) | engine-gmt (original, coupled) | Delta |
|---|---|---|
| `engine/ShaderBuilder.ts:1-136` (136 lines, 5 generic primitives + escape-hatch `addSection`) | `engine-gmt/engine/ShaderBuilder.ts:1-634` (634 lines, full GMT 17-position raymarcher assembly) | Same class name — see Pattern E discussion below. Engine-core docstring at `engine/ShaderBuilder.ts:1-20` explicitly notes "fractal-specific hooks ... live in plugins." GMT side encodes its 17-position contract in the leading comment at `engine-gmt/engine/ShaderBuilder.ts:1-25` and imports concrete GMT shader chunks (`engine-gmt/engine/ShaderBuilder.ts:27-37`). |
| `engine/ShaderFactory.ts:1-36` (one entry point, variant default-arg) | `engine-gmt/engine/ShaderFactory.ts:1-62` (four entry points: `generateFragmentShader`, `generatePhysicsShader`, `generateHistogramShader`, `generateMeshSDFLibrary`; LightingState coupling at `engine-gmt/engine/ShaderFactory.ts:4,34`) | Engine-core docstring at `engine/ShaderFactory.ts:1-12` notes "the engine itself has no knowledge of render modes ... those are plugin concerns." GMT side hard-codes the four GMT raymarcher variants. |
| `engine/ShaderConfig.ts:1-28` (all fields optional, declaration-merging hook documented at `engine/ShaderConfig.ts:6-9`) | `engine-gmt/engine/ShaderConfig.ts:1-26` (`formula` and `pipelineRevision` required at `engine-gmt/engine/ShaderConfig.ts:13,16`; concrete `PipelineNode[]` / `FractalGraph` typing at `engine-gmt/engine/ShaderConfig.ts:2`; `'Direct' \| 'PathTracing'` literal at `engine-gmt/engine/ShaderConfig.ts:20`) | Engine-core inverts the typing posture: opaque tag + declaration merging. GMT side is concrete. Both retain the `[key: string]: any` feature-state index signature (`engine/ShaderConfig.ts:23`, `engine-gmt/engine/ShaderConfig.ts:25`). |
| `engine/managers/ConfigManager.ts:1-184` (canonical JSDoc at `engine/managers/ConfigManager.ts:1-17`; generic `pipelineRevision` rebuild trigger at `engine/managers/ConfigManager.ts:175-180`) | `engine-gmt/engine/managers/ConfigManager.ts:1-258` (74-line delta carries `detectEngineProfile`/`estimateCompileTime` coupling at `engine-gmt/engine/managers/ConfigManager.ts:4`, `FractalEvents` bus at `engine-gmt/engine/managers/ConfigManager.ts:5`, batched compile log at `engine-gmt/engine/managers/ConfigManager.ts:49-59,201-207`, Modular-specific `pipeline`/`pipelineRevision` handler at `engine-gmt/engine/managers/ConfigManager.ts:243-254`) | `plans/doc-audit-state/survey/_followups/q-098.md` is the authoritative divergence-rationale doc; do NOT back-port the JSDoc. |
| `engine/ConfigDefaults.ts:1-52` (formula optional, no GMT seeding at `engine/ConfigDefaults.ts:9-15`) | `engine-gmt/engine/ConfigDefaults.ts:1-47` (defaults to `'Mandelbulb'` formula, hard-codes `maxSteps: 300`, `renderMode: 'Direct'`, `shadows: true`) | Each tree carries its own "from-scratch" defaults appropriate to its surface. |

### Pattern C: Parametrisation hook

The two files are byte-for-byte (or near byte-for-byte) identical **except** for an import path that resolves to a sibling directory the engine-gmt tree owns separately. The divergence is the parametrisation hook — pulling the code into a shared module would route both engines through the wrong sibling (`plans/doc-audit-state/survey/_followups/q-097.md`).

Observed pairs:

| engine-core | engine-gmt | Differing import | Side effect that breaks naive dedup |
|---|---|---|---|
| `engine/UniformSchema.ts:1-104` imports `registerFeatures` from `./features` (`engine/UniformSchema.ts:5`) | `engine-gmt/engine/UniformSchema.ts:1-104` imports from `../features` (`engine-gmt/engine/UniformSchema.ts:5`) | One extra dot in the import path | Module-load-time call `registerFeatures()` at `engine/UniformSchema.ts:8` / `engine-gmt/engine/UniformSchema.ts:8` populates a different `featureRegistry` set; `UNIFORM_SCHEMA` is built immutably from that registry at `engine/UniformSchema.ts:77-83` / `engine-gmt/engine/UniformSchema.ts:77-83`. A shared module would compose whichever sibling loaded first. |
| `engine/HardwareDetection.ts:1-64` imports constants from `../data/constants` (`engine/HardwareDetection.ts:3`) | `engine-gmt/engine/HardwareDetection.ts:1-64` imports from `../../data/constants` (`engine-gmt/engine/HardwareDetection.ts:3`) | Relative-depth-only difference | Should be promoted to Pattern A (shim) — see "Known issues / drift to fix" below. The file is otherwise byte-identical. |
| `engine/utils/FullscreenQuad.ts:1-26` | `engine-gmt/engine/utils/FullscreenQuad.ts:1-26` | None observed (byte-identical) | Same as above — should be a shim. |

Note that **`HardwareDetection.ts` and `utils/FullscreenQuad.ts` differ from `UniformSchema.ts` in motive**: they have no side-effect tied to a sibling directory; their continued duplication is leftover-from-extraction, not parametrisation. They belong under Pattern A but haven't been migrated yet.

### Pattern D: Engine-gmt only

The file exists in `engine-gmt/engine/` with no `engine/` sibling. Use when the surface area is genuinely GMT-specific (raymarcher uniforms, GMT material pipeline, GMT bucket renderer) and any non-GMT app would write its own implementation rather than parameterise a shared one. The decision to live as GMT-only must be reflected in a leading docstring or class comment explaining the rationale.

Observed pairs (selected — there are ~25 of these total):

| Path | Lines | Why GMT-only |
|---|---|---|
| `engine-gmt/engine/managers/UniformManager.ts:1-413` | 413 | Owns the GMT raymarcher uniform protocol (`uLightDir[i]` light-toward convention at `engine-gmt/engine/managers/UniformManager.ts:354-356`, fog ACES inverse at `engine-gmt/engine/managers/UniformManager.ts:242-258`, 3-stage rotation matrices) — none of which are meaningful outside the raymarcher. |
| `engine-gmt/engine/FractalEngine.ts:1-958` | 958 | Main render-loop orchestrator for GMT — couples to the GMT material pipeline and worker proxy. |
| `engine-gmt/engine/MaterialController.ts:1-606` | 606 | Two-stage GMT shader compilation, preview/full swap. |
| `engine-gmt/engine/SDFShaderBuilder.ts:1-714` | 714 | Standalone mesh-export GLSL generator (separate from the main `ShaderBuilder` — see survey `plans/doc-audit-state/survey/g02-shader-pipeline.md:42-53` for the five-shader API). |
| `engine-gmt/engine/FractalRegistry.ts:1-34` | 34 | GMT-specific formula registry; engine-core has no equivalent (apps register their own variants directly via the feature system). |
| `engine-gmt/engine/CompileScheduler.ts:1-338` | 338 | GMT two-stage compile orchestration. |
| `engine-gmt/engine/worker/renderWorker.ts:1-807` | 807 | GMT worker entry point. |
| `engine-gmt/engine/worker/WorkerProtocol.ts:1-130` | 130 | GMT worker message protocol. |
| `engine-gmt/engine/worker/WorkerExporter.ts:1-893` | 893 | GMT multi-pass export protocol. |
| `engine-gmt/engine/worker/WorkerDepthReadback.ts:1-175` | 175 | GMT depth-readback (auto-readback + focus-pick paths) — see q-112 below for the live `MAX_SKY_DISTANCE` bug. |
| `engine-gmt/engine/PrecisionMath.ts:1-12` | 12 | GMT virtual-space high/low precision (`VirtualSpace`). |

The full list is the set of files under `engine-gmt/engine/**/*.ts` that do not have a matching path under `engine/**/*.ts`.

### Pattern E: Type divergence (declaration-narrowness fork)

Same-name type with different definitions in the two trees, encoding the engine-core vs GMT typing posture. The engine-core copy is deliberately wider (or opaque) so non-GMT apps can widen via declaration merging or simply pass their own concrete value through.

Observed pairs:

| engine-core type (wider/opaque) | engine-gmt type (narrower/concrete) | Notes |
|---|---|---|
| `types/common.ts:7` — `export type FormulaType = string` (opaque tag; comment at `types/common.ts:4-6` documents the declaration-merging widening pattern) | `engine-gmt/types/common.ts:4` — `FormulaType` literal union of 43 string literals | `plans/doc-audit-state/survey/_followups/q-102.md` confirms the engine-gmt union is hand-maintained and has already drifted from the runtime registration site at `engine-gmt/formulas/index.ts:107-111` (five registered aliases — `HyperTorus`, `UberMenger`, `FoldingBrot`, `HyperbolicMandelbrot`, `RhombicIcosahedron` — are not in the union). The opaque-tag posture in `types/common.ts:7` is the stable branch's resolution; the dev/engine-gmt fork has *regressed* to the literal union and is the canonical "type drifts from runtime registration" warning. |
| `engine/ShaderConfig.ts:1-28` (all fields optional, `formula?: string`) | `engine-gmt/engine/ShaderConfig.ts:1-26` (`formula: string` and `pipelineRevision: number` required) | Already enumerated in Pattern B. Same posture: engine-core widens, engine-gmt narrows. |

`ShaderBuilder`'s class-name collision (`engine/ShaderBuilder.ts:24` vs `engine-gmt/engine/ShaderBuilder.ts:42`) is documented as a Pattern B genericized fork above, but it ALSO produces a Pattern E hazard: both classes export the symbol `ShaderBuilder` with no namespace prefix. A consumer grepping for `class ShaderBuilder` finds both; a consumer reading the file map at `docs/gmt/08_File_Structure.md:20` and then opening the path it lists lands on the wrong file relative to the description (the file map points at `ShaderBuilder.ts` but describes the GMT 17-position semantics). The rename to `GmtShaderBuilder` recommended at `docs/engine/21_Code_Review_2026-04-25.md:168` has not yet been done; until it is, the name `ShaderBuilder` is path-disambiguated only.

## Rules for new fork-pair work

R1. **Default to engine-core.** If a new module could plausibly serve at least two apps, write it in `engine/` first. Only fork into `engine-gmt/` when the surface area is genuinely GMT-specific. Reason: `docs/engine/01_Architecture.md:9-11` "Generic by default, specific by exception."

R2. **If the engine-gmt copy would be byte-for-byte identical to the engine-core copy, prefer Pattern A (re-export shim) — `export * from '../../engine/<file>'`.** Reason: any duplicated module is a singleton-identity hazard. The canonical bug post-mortems live at `engine-gmt/engine/FeatureSystem.ts:1-11` (split registry made GMT slices invisible) and `engine-gmt/engine/worker/ViewportRefs.ts:1-12` (split camera ref broke keyframe dirty-detection).

R3. **If the engine-core copy would have only generic, GMT-agnostic logic and the engine-gmt copy needs additional surface area, prefer Pattern B (genericized fork). DO NOT back-port the engine-core JSDoc to the engine-gmt copy.** Reason: the engine-core JSDoc documents what the *extract* deliberately omits (e.g. `engine/managers/ConfigManager.ts:14-16` "Apps that want richer diffing behavior ... layer that on top — the engine stays generic"). Back-porting it onto the GMT copy would mis-document that copy's actual surface. The divergence rationale lives at `plans/doc-audit-state/survey/_followups/q-098.md`.

R4. **If the two files are byte-identical except for one import-path's relative depth AND that import has no module-load side effect on a sibling-tree registry, prefer Pattern A (shim).** This applies to `HardwareDetection.ts` and `utils/FullscreenQuad.ts` today — see "Known issues / drift to fix" below.

R5. **If the two files are byte-identical except for one import path AND that import has a module-load side effect tied to a sibling-tree directory, that is Pattern C (parametrisation hook) — DO NOT collapse to a shim.** Reason: `engine/UniformSchema.ts:8` and `engine-gmt/engine/UniformSchema.ts:8` both call `registerFeatures()` at module load against a sibling `features/` directory that contains a disjoint feature set. A shared module would compose whichever sibling loaded first and pin the wrong registry contents. See `plans/doc-audit-state/survey/_followups/q-097.md`.

R6. **Prefer `export *` to selective named re-exports in Pattern A shims.** Reason: a selective list silently rots whenever a new export is added to the engine-core source. `engine-gmt/engine/worker/ViewportRefs.ts:13-22` is the one current selective-named-shim and is a divergence risk; the other shims use `export *` (e.g. `engine-gmt/engine/TickRegistry.ts:6`, `engine-gmt/engine/UniformNames.ts:2`, `engine-gmt/engine/BloomPass.ts:2`, `engine-gmt/engine/RenderPipeline.ts:5`).

R7. **If you must create a new Pattern D (engine-gmt-only) file, document the rationale in a leading docstring or class comment.** Reason: a contributor reading `engine-gmt/engine/managers/UniformManager.ts` and asking "should there be a sibling at `engine/managers/UniformManager.ts`?" needs to find the answer in the file itself, not by archeology in `docs/`. The current `engine-gmt/engine/managers/UniformManager.ts:1-17` is missing this docstring — see "Known issues / drift to fix" below.

R8. **Type-divergence forks (Pattern E) MUST keep the engine-core copy wider / more opaque than the engine-gmt copy, and the engine-gmt copy MUST own its concrete narrowing.** Reason: the engine-core copy is the substrate for future non-GMT apps that will need to widen the type via declaration merging. The canonical example is `types/common.ts:7` `export type FormulaType = string` vs `engine-gmt/types/common.ts:4` (43-literal union). A future fluid-toy formula must NOT have to widen the engine-core type to add its own ID.

R9. **A new hand-maintained literal-union type whose membership is set at runtime by a separate registration array is a code smell — prefer a derived type or an opaque tag.** Reason: `engine-gmt/types/common.ts:4` is the cautionary example — five runtime aliases are already missing from the union (`engine-gmt/formulas/index.ts:107-111`). The stable branch's `FormulaType = string` opaque tag (`types/common.ts:7`) sidesteps the drift entirely.

R10. **When promoting a Pattern B genericized fork to Pattern A (shim) — i.e. the engine-gmt-specific surface has been re-homed elsewhere — leave a one-commit deprecation comment in the engine-gmt file pointing at the new home before deleting.** Rationale: the only currently-deleted-without-shim case is `engine-gmt/engine/BezierMath.ts` (see `docs/engine/21_Code_Review_2026-04-25.md:65`, recommended for shimming but actually removed wholesale); `engine/BezierMath.ts:1-113` is now the sole copy and `engine-gmt/` consumers must update their imports. This worked because BezierMath is pure math with no GMT consumers — but for any file with GMT consumers, a deprecation comment would have caught the import-path migration cleanly. _(Adopted as established rule 2026-05-20; was originally added as "proposed" pending precedent.)_

## Invariants

- I1. **Re-export shims (Pattern A) MUST use `export * from '../../engine/<file>'` for the canonical form.** Selective named re-exports are tolerated only when there is a documented reason (e.g. `engine-gmt/engine/worker/ViewportRefs.ts:13-22`); even then, R6 applies (this case should be migrated to `export *`).

- I2. **Module-scoped singletons (`featureRegistry`, `FractalEvents`, `TickRegistry`'s `_entries` array, `ViewportRefs`'s `_camera`) MUST have exactly one identity across the whole app.** Two independent module copies produce silent state-desync bugs; see `engine-gmt/engine/FeatureSystem.ts:1-11` and `engine-gmt/engine/worker/ViewportRefs.ts:1-12` for the post-mortems.

- I3. **Pattern C parametrisation-hook pairs MUST NOT be collapsed to a shared module.** The sibling-directory side effect at `engine/UniformSchema.ts:8` and `engine-gmt/engine/UniformSchema.ts:8` makes the parametrisation load-bearing.

- I4. **The engine-core copy of any Pattern B pair MUST carry the canonical JSDoc explaining what the genericisation strips out.** The engine-gmt copy MUST NOT inherit that JSDoc verbatim. See `engine/managers/ConfigManager.ts:1-17` vs `engine-gmt/engine/managers/ConfigManager.ts:1-7`.

- I5. **Type-divergence (Pattern E) MUST be one-way — the engine-core copy is the substrate for future apps, the engine-gmt copy is the GMT concretion.** Tightening the engine-core copy to match the engine-gmt copy violates R8.

- I6. **Doc-path references to engine-gmt-owned files MUST carry the `engine-gmt/` prefix.** Six concrete drops in `docs/gmt/02_Rendering_Internals.md` and `docs/specs/10_Shaped_Emission.md` are catalogued in `plans/doc-audit-state/survey/_followups/q-099.md`; the audit corpus itself (under `plans/doc-audit-state/survey/`) already uses the correct prefix.

- I7. **The `RenderVariant` enum (`engine/ShaderBuilder.ts:22` / `engine-gmt/engine/ShaderBuilder.ts:39`) is the cleanest hand-off point between the engine-core and engine-gmt `ShaderBuilder` classes.** Either tree may import it; downstream code that needs `'Main' | 'Physics' | 'Histogram' | 'Mesh'` should pick whichever side it already imports from, but if the GMT-side `ShaderBuilder` is renamed to `GmtShaderBuilder` (per `docs/engine/21_Code_Review_2026-04-25.md:168`), `RenderVariant` should stay exported from both files unchanged.

## Known issues / drift to fix

Drawn from `plans/doc-audit-state/phase-2-carry-in.json` (the cross-cutting "engine vs engine-gmt fork divergence" theme) and the six followups q-096 through q-102.

| # | Issue | Pattern | Category | Reference |
|---|---|---|---|---|
| K1 | `engine-gmt/engine/ShaderBuilder.ts:42` should be renamed to `GmtShaderBuilder` (the class) and its file to `GmtShaderBuilder.ts`. Rename was recommended at `docs/engine/21_Code_Review_2026-04-25.md:168` and is still pending. | B + E | doc-rewrite-target / cleanup | `plans/doc-audit-state/survey/_followups/q-096.md` |
| K2 | `docs/gmt/08_File_Structure.md:20` describes the GMT-semantic ShaderBuilder but points at the engine-core path. Silent path-vs-semantics mismatch. | B + E | drift | `plans/doc-audit-state/survey/_followups/q-096.md` |
| K3 | `engine/HardwareDetection.ts:1-64` and `engine-gmt/engine/HardwareDetection.ts:1-64` are byte-identical except for the relative depth of the `data/constants` import. Should be promoted to a Pattern A shim (`engine-gmt/engine/HardwareDetection.ts:1-64` → `export * from '../../engine/HardwareDetection'`). | C → A | cleanup | code survey for this doc |
| K4 | `engine/utils/FullscreenQuad.ts:1-26` and `engine-gmt/engine/utils/FullscreenQuad.ts:1-26` are byte-identical (`diff` shows no output). Should be promoted to a Pattern A shim. | C → A | cleanup | code survey for this doc |
| K5 | `engine-gmt/engine/worker/ViewportRefs.ts:13-22` uses a selective named re-export instead of `export *`. New exports added to `engine/worker/ViewportRefs.ts:1-122` (e.g. the `_displayPerspCamera` / `_displayOrthoCamera` snapshot pair was added recently) will silently fail to propagate. Convert to `export *`. | A (selective → wildcard) | cleanup | code survey for this doc |
| K6 | `engine-gmt/types/common.ts:4` is a 43-literal `FormulaType` union and has already drifted — five registered aliases (`HyperTorus`, `UberMenger`, `FoldingBrot`, `HyperbolicMandelbrot`, `RhombicIcosahedron`) at `engine-gmt/formulas/index.ts:107-111` are not in the union. Stable branch (`types/common.ts:7`) has already adopted the opaque-tag resolution. The dev/engine-gmt fork has regressed. Resolution options ranked at `plans/doc-audit-state/survey/_followups/q-102.md`. | E | drift | `plans/doc-audit-state/survey/_followups/q-102.md` |
| K7 | Six `docs/` references drop the `engine-gmt/` prefix and would 404 — `docs/gmt/02_Rendering_Internals.md:142,237,735`, `docs/gmt/43_Bucket_Render_Overhaul.md:23`, `docs/specs/10_Shaped_Emission.md:161,227`. Fix when a doc-refresh window opens. | I6 violation | doc-rewrite-target | `plans/doc-audit-state/survey/_followups/q-099.md` |
| K8 | Stale TODO at `engine-gmt/engine/ShaderConfig.ts:23-25` references `FeatureStateMap`, but engine-core has moved past this model to declaration merging (`engine/ShaderConfig.ts:6-9`). Either rewrite the TODO to point at `docs/gmt/07_Code_Health.md` Cat 3, or match engine-core's declaration-merging framing. | B | cleanup | (carry-in q-100 entry, file `engine-gmt/engine/ShaderConfig.ts:23-25`) |
| K9 | `pipelineRevision` is `required` in `engine-gmt/engine/ShaderConfig.ts:16` but the structurally-equivalent field in `engine/ShaderConfig.ts:14` (`pipelineRevision?: number`) is optional. The `[key: string]: any` index signature at both sites defeats strict-typing enforcement; the required typing in the GMT copy is documentation more than enforcement. | B | drift (informational) | (carry-in q-101 entry) |
| K10 | `engine-gmt/engine/managers/UniformManager.ts:1-17` lacks the "why is this engine-gmt only" docstring required by R7. Add a class-level comment naming the GMT-raymarcher uniform protocol (light-toward direction, fog ACES inverse, 3-stage rotation matrices) as the GMT-specific reason. | D | cleanup | R7 + survey `plans/doc-audit-state/survey/g02-shader-pipeline.md:83-88` |
| K11 | `engine-gmt/engine/ShaderBuilder.ts` Main-variant `buildFragment` builds a `sections` / `profile` / `totalSize` block (~25 lines) that is never read or returned — dead computation per build. Either wire to a debug uniform or delete. | B (dead code) | cleanup | `plans/doc-audit-state/survey/_followups/q-095.md` |

## Historical context

The fork-extraction running tracker is at `docs/engine/21_Code_Review_2026-04-25.md` (especially the file-pair table at `docs/engine/21_Code_Review_2026-04-25.md:60-72` and the recommended-fix-order list at `docs/engine/21_Code_Review_2026-04-25.md:161-178`). That doc's snapshot in time (2026-04-25) is partially executed: the four-shim batch at `docs/engine/21_Code_Review_2026-04-25.md:167` is mostly done (`BloomPass`, `UniformNames`, `RenderPipeline` are now shims) but `BezierMath.ts` was deleted from `engine-gmt/` outright rather than shimmed (the engine-core copy at `engine/BezierMath.ts:1-113` is the sole truth); the `GmtShaderBuilder` rename at `docs/engine/21_Code_Review_2026-04-25.md:168` is pending (K1 above).

The three-tier model at `docs/engine/01_Architecture.md:20-46` frames `engine-gmt/` as a "tightly-coupled domain layer" rather than a clean plugin — quoting the audit at `docs/engine/21_Code_Review_2026-04-25.md:78-82`: "engine-gmt cannot be extracted into a standalone package without bringing the entire `store/` layer with it. The 'clean plugin' framing in the docs is aspirational, not current state." Subsystem doc writers citing this module-doc as their fork-rules reference should also link `docs/engine/01_Architecture.md:20-46` for the substrate model.

The memory note `feedback_duplicate_module_state.md` records the same pattern at a behavioural level (near-identical `engine/` and `engine-gmt/` files have caused split-singleton bugs); this doc is the code-anchored elaboration of that note.
