# Related findings → known issues map

_Generated: 2026-05-21. Walks all 119 followups under `plans/doc-audit-state/survey/_followups/q-*.md` and classifies every "## Related findings" bullet against `docs/modules/bugs.md`, `docs/modules/backlog.md`, the 58 ADRs in `docs/adr/`, and source-file annotations cited by the bullet._

## Method

- 83 of 119 followups contain a `## Related findings` block; 36 do not (3 of those explicitly write "None.").
- 53 q-IDs are already cross-referenced from `backlog.md`; 1 q-ID (q-064) is cross-referenced from `bugs.md`. Bullets in those followups whose topic matches the cross-referenced backlog/bugs row are classified TRACKED.
- Bullets that introduce a new finding distinct from the backlog/bugs row are evaluated independently — many backlog cross-refs surface only ONE of several bullets in the followup, so the others remain UNTRACKED.
- "Cited file" in this map quotes the first file:LL path in the bullet; when absent, the cluster prose is used instead.

## Summary

- Total bullet findings: ~218 (counted across 83 followups; some are sub-bullets of the same finding)
- TRACKED-IN-BUGS: 1
- TRACKED-IN-BACKLOG: 54
- ADDRESSED-IN-SOURCE: 8 (the cited file already carries the JSDoc / comment the bullet flags as worth preserving)
- CAPTURED-IN-ADR: 39 (ADR titles directly cover the topic)
- OBSERVATION (no action needed): 51 (confirmations, invariant statements, single-consumer notes)
- **UNTRACKED: 65** ← these are the value of this audit

---

## UNTRACKED findings (the gap)

_These findings live only in followup files and may have been lost during the migration from Phase 1 surveys into module docs. Listed by topic-cluster, with an opinionated "suggested home" per item._

### Boot lifecycle + LoadingScreen drift

- **From q-001:** `useAppStartup`'s `isSceneReady` parameter is named `_isSceneReady` and is **unused** — the hook does not gate on it.
  - Cited file: `hooks/useAppStartup.ts:53`
  - Suggested home: `backlog.md` cleanup-opportunity row (drop the dead param OR rename it for clarity)
- **From q-001:** Picking a formula *before* the first auto-boot fires is silent because `bootEngineRef.current(true)` is guarded by `if (hasBootedRef.current)`.
  - Cited file: `app-gmt/LoadingScreen.tsx:82-110`
  - Suggested home: Promote to JSDoc on `handleSelectFormula`; this is subtle behaviour future readers will miss.
- **From q-002:** `isHydrated` is a misnomer — the store is hydrated *before* React renders. The flag actually signals "hardware detection ran, mobile presets applied, mount effect complete." `LoadingScreen.tsx:155` is the load-bearing consumer.
  - Cited file: `hooks/useAppStartup.ts` (return value)
  - Suggested home: `backlog.md` cleanup-opportunity (rename to `isStartupReady` / `isPostMountReady`); referenced in the boot ADR-0005 narrative but not its decision.
- **From q-002:** Three "ready"-ish flags coexist in the boot pipeline (`_isSceneReady` unused, `isHydrated` boot-trigger, `isReady` fade-out gate) — Phase-2 cleanup target.
  - Suggested home: `backlog.md` cleanup-opportunity.
- **From q-002:** 30-second timeout at `engine-gmt/renderer/GmtRendererTickDriver.tsx:90-94` is a **silent failure mode** — if `proxy.isBooted` never becomes true, `onLoaded` is never called, LoadingScreen never fades, user sees stuck progress bar with no error UI.
  - Cited file: `engine-gmt/renderer/GmtRendererTickDriver.tsx:90-94`
  - Suggested home: `bugs.md` (user-facing failure mode with no error surface) OR new ADR explaining the silent-degradation choice.
- **From q-078:** `install.ts:70-75` wraps `onBooted` to re-push `sampleCap` + `isPaused` because earlier `installAccumulationBindings` messages can race the worker's FractalEngine creation — undocumented race-recovery pattern.
  - Cited file: `engine-gmt/renderer/install.ts:70-75`
  - Suggested home: Add a class-level comment OR new ADR alongside ADR-0041 (`Worker INIT/BOOT deferred-setup pattern`).
- **From q-078:** `engine-gmt/renderer/install.ts` is not in g01's manifest — possible coverage gap for the engine-core↔engine-gmt singleton-bridge contract.
  - Suggested home: `backlog.md` orphan-sweep / survey-gap row.

### `as any` casts that escape typed contracts

- **From q-066:** `engine/plugins/Camera.ts:60-68` — both `getSlots` and `setSlots` go through `as any`, no type safety on either side.
  - Cited file: `engine/plugins/Camera.ts:60-68`
  - Suggested home: `backlog.md` cleanup-opportunity (matches ADR-0030 "adapter-opaque JSON" rationale, but the cast remains).
- **From q-066:** Five other top-level store keys (`cameraRot`, `targetDistance`, `sceneOffset`, `cameraMode`, `savedCameras`) follow the same unprefixed pattern as `cameraSlots`.
  - Cited file: `utils/defaultPresetFields.ts:16-83`
  - Suggested home: `backlog.md` drift-risk (no namespacing convention for top-level scene store keys).
- **From q-077:** Three audioMod cast sites at `AudioPanel.tsx:134` are still `(store as any)` casts — neither `@ts-ignore` nor `@ts-expect-error`. Either `docs/gmt/07_Code_Health.md:316-326` is stale, or the conversion was reverted.
  - Cited file: `AudioPanel.tsx:134`
  - Suggested home: `bugs.md` doc-stale OR reconcile the audit doc row.
- **From q-078:** `as any` cast at `install.ts:61` (`setEngineProxy(proxy as any)`) — structural-typing escape hatch between engine-core's `setProxy` parameter type and engine-gmt's `WorkerProxy` shape.
  - Cited file: `engine-gmt/renderer/install.ts:61`
  - Suggested home: `backlog.md` cleanup (candidate shared `EngineProxy` interface in engine-core).
- **From q-088:** Four host call sites (`App.tsx`, `app-gmt/AppGmt.tsx`, `fractal-toy/FractalToyApp.tsx`, plus fluid-toy) need their `storeCallbacks` Provider value memoised; an un-memoised value would cascade re-renders through every primitive.
  - Suggested home: `backlog.md` cleanup or invariant note in ADR-0014 ("Shared UI mid-migration — store context vs direct store").

### DDFS / feature-system gaps

- **From q-076:** `defineFeature` exists at `engine/features/setFeature.ts:48-54` but consumers use `FeatureDefinition` literals directly — adoption gap.
  - Cited file: `engine/features/setFeature.ts:48-54`
  - Suggested home: `backlog.md` doc-rewrite (`docs/modules/engine/features.md:87,146-158` already notes it; widening risk is real but no migration path is owned).
- **From q-077:** A typed `callAction` was never built; `applyPreset` callsites in `07_Code_Health.md:322-323` are the same architectural gap surfacing in non-audio code. Two consumer families would migrate.
  - Suggested home: New ADR proposing a `defineFeature` `actions?: Record<string, ActionDef>` slot OR `backlog.md` doc-rewrite-target.
- **From q-089:** 50ms `setTimeout` at `components/AutoFeaturePanel.tsx:148` exists to let `movePanel('Engine', 'left')` mount the panel before `engine_queue` fires; load-bearing race-guard, removable if compile-routing is lifted to a registry.
  - Cited file: `components/AutoFeaturePanel.tsx:148`
  - Suggested home: `backlog.md` cleanup-opportunity (eliminate the timeout when compile-routing is generalised).
- **From q-089:** Compile-routing logic at `EnginePanel.tsx:64-79` (reads `feature?.engineConfig?.toggleParam` + `pConfig?.onUpdate === 'compile'`) is the implicit contract a per-app `compileRouter` would need to replicate.
  - Cited file: `engine-gmt/components/panels/EnginePanel.tsx:64-79`
  - Suggested home: Promote to JSDoc on EnginePanel, or capture in ADR-0055 follow-up.

### Audio engine ↔ UI drift

- **From q-075:** `AudioPanel.tsx:27` replaces the entire `status` object every 100 ms even when nothing changed, triggering React re-renders on every tick. Compounding risk with more sliders.
  - Cited file: `AudioPanel.tsx:27`
  - Suggested home: `backlog.md` cleanup (shallow-equality short-circuit).
- **From q-075:** `connectMicrophone` / `connectSystemAudio` mutate `isMicActive` but the panel never reads it — the green pulse dot binds to `audio.isEnabled` instead. Slight UI/engine drift.
  - Cited file: `AudioAnalysisEngine.ts:91-138`, `AudioPanel.tsx:277`
  - Suggested home: `bugs.md` (UI shows misleading capture-state) OR `backlog.md` doc-rewrite.
- **From q-075:** `loadTrack`-then-`setTimeout(play, 100)` pattern at `AudioPanel.tsx:37-40` is a **third timing hack** racing the `<audio>` element's metadata-load. `waitForMetadata` is the principled fix but unused.
  - Cited file: `AudioPanel.tsx:37-40`
  - Suggested home: `backlog.md` cleanup-opportunity.
- **From q-075:** Phase-2 doc opportunity: `AudioAnalysisEngine` exposes a **pull-only** API plus one event-driven one-shot. Either document the poll convention or plan a `timeupdate` forwarder.
  - Suggested home: New module doc section in audio module OR ADR (poll-by-design vs timeupdate-forwarder).

### Shader / uniform contract drift

- **From q-031:** `backingOnly` flag is undocumented in the survey but used by `uModularParams` to keep the Three.js uniform live without emitting a GLSL declaration.
  - Cited file: `engine-gmt/engine/UniformSchema.ts:19-22`
  - Suggested home: Already partly covered by backlog.md row on `UniformDefinition.backingOnly`, but the **declaration-deferred-to-feature** half is not captured — promote.
- **From q-031:** `EnvRotationMatrix` is in BASE_SCHEMA, not feature-contributed — `UniformNames.ts:53` "Environment" section header is organisational only.
  - Cited file: `engine-gmt/engine/UniformSchema.ts:73`
  - Suggested home: JSDoc on `UniformNames.ts` clarifying that section headers are not a contributor partition.
- **From q-031:** Interlace declarations are **duplicated** between feature `params.*.uniform` descriptors and a hardcoded list in `engine-gmt/engine/SDFShaderBuilder.ts:709`. Both sites need to stay in sync.
  - Cited file: `engine-gmt/engine/SDFShaderBuilder.ts:709`
  - Suggested home: `backlog.md` drift-risk (invariant: builder-side reserved-name list MUST match per-param uniforms).
- **From q-031:** `uFogColorLinear` is also in BASE_SCHEMA but lives under "Environment" section header — same trap as `EnvRotationMatrix`.
  - Cited file: `engine-gmt/engine/UniformSchema.ts:74`
  - Suggested home: Same JSDoc fix as above.
- **From q-032:** GMT's `engine-gmt/engine/ShaderBuilder.ts:1-26` is the canonical ordering document; engine-fork's generic API has no current consumers using its named sections — two builders are NOT API-compatible.
  - Suggested home: New ADR (or extension of ADR-0019/0043) calling out the two builders' divergence; partly captured in backlog K11 but the API-compatibility framing is new.
- **From q-032:** Mesh variant `buildMeshSDFLibrary` (engine-gmt ShaderBuilder) and `SDFShaderBuilder.ts` are **two different mesh shader paths** — natural unification target for `plans/mesh-export-unification.md`.
  - Cited file: `engine-gmt/engine/ShaderBuilder.ts:304-392` and `engine-gmt/engine/SDFShaderBuilder.ts`
  - Suggested home: `plans/mesh-export-unification.md` (already untracked at repo root).
- **From q-032:** `volumetricTracing` slot name is a misnomer — actual method is `addVolumeTracing(marchCode, finalizeCode)` feeding TWO storage arrays; not a single slot.
  - Cited file: `engine-gmt/engine/ShaderBuilder.ts:568`
  - Suggested home: Update doc / JSDoc to reflect the two-slot injection.
- **From q-032:** `shadingLogic` slot is actually a sub-section of position 15 (integrators), not its own slot — JSDoc explicitly scopes it.
  - Suggested home: Update ADR-0043 ("17-position shader assembly") to clarify the sub-slot.
- **From q-032:** 17-position numbering is non-contiguous in the variant tables (Mesh: 1-9, Physics: 1-10 + custom, Histogram: 1-10 + trace); the unified ordering is a Main-variant contract only.
  - Suggested home: ADR-0043 follow-up.
- **From q-034:** Single-consumer assumption: composite-history contract is fulfilled in exactly one site (`main.ts:73-88`). A second consumer would need to replicate both the region gate and the `mix`.
  - Suggested home: Promote to JSDoc OR new shared `compositeHistory()` GLSL chunk extraction point in `backlog.md`.
- **From q-035:** Byte-identical `shaders/chunks/vertex.ts` at `shaders/chunks/vertex.ts` AND `engine-gmt/shaders/chunks/vertex.ts` — consolidation target.
  - Cited file: `shaders/chunks/vertex.ts`
  - Suggested home: `backlog.md` engine-fork cleanup (extends K3/K4 row on Pattern A shims).

### Engine / engine-gmt fork drift (extends backlog K-series)

- **From q-039:** `engine-gmt/engine/RenderPipeline.ts` half-float / picking code is the sibling-fork copy of `engine/RenderPipeline.ts` — both `halfToFloat` implementations should be reconciled when the fork unifies.
  - Cited file: `engine-gmt/engine/RenderPipeline.ts`
  - Suggested home: `backlog.md` engine-fork drift row.
- **From q-079:** `components/timeline/exportModulations.ts` and `engine-gmt/components/timeline/exportModulations.ts` are sibling duplicates — candidate for duplicate-module-state pattern.
  - Suggested home: `backlog.md` engine-fork drift row.
- **From q-079:** No `@engine/worker` path alias is configured — 37 imports use relative paths.
  - Suggested home: `backlog.md` cleanup-opportunity (low priority).
- **From q-091:** `engine-gmt/engine/LoadingRenderer.ts` (WebGL twin) is in the same orphan boat as `LoadingRendererCPU.ts` and should move together.
  - Suggested home: `backlog.md` orphan-sweep (extends K row on LoadingRendererCPU).
- **From q-096:** `docs/gmt/08_File_Structure.md` as a whole does not surface `engine-gmt/` paths — likely applies to `ShaderFactory.ts`, `ConfigManager.ts`, `RenderPipeline.ts`. Whole-file audit warranted, not just ShaderBuilder line fix.
  - Suggested home: `backlog.md` doc-rewrite expansion (K2 currently scoped to one line).
- **From q-099:** `engine/managers/ConfigManager.ts` (7935 B) and `engine-gmt/engine/managers/ConfigManager.ts` (12174 B) are near-duplicates ~50% size delta.
  - Suggested home: Already partly tracked under q-098, but the specific size delta / divergence-magnitude is not in backlog.
- **From q-100:** `engine-gmt/engine/ShaderConfig.ts:12-22` types fields concretely while `engine/ShaderConfig.ts:11-22` makes them optional/opaque — divergent typing strategies for the same structural surface.
  - Suggested home: `backlog.md` drift (extends K8 currently scoped to TODO comment).
- **From q-093:** Main-thread `WorkerProxy` stubs always resolve `null` — diagnostic tools silently get nothing. Independent of Three upgrade.
  - Cited file: `engine/worker/WorkerProxy.ts:207-208`
  - Suggested home: `backlog.md` cleanup (note when main-thread render mode is re-exercised).
- **From q-093:** Defensive `typeof programWrapper.fragmentShader === 'object'` check at `engine-gmt/engine/FractalEngine.ts:885` implicitly documents a Three.js shape variance — only in source, not in any user-facing doc.
  - Suggested home: Promote to JSDoc OR ADR (Three upgrade contract).
- **From q-094:** `engine/RenderPipeline.ts:199` assumes WebGL2 `HALF_FLOAT` always succeeds when `bufferPrecision > 0.5` — no graceful fallback if alpha-in-HalfFloat unsupported on a given mobile GPU. The probe (`checkHalfFloatAlphaSupport`) was meant to fill this gap but never got wired in.
  - Cited file: `engine/RenderPipeline.ts:199`
  - Suggested home: `bugs.md` (real failure mode on mobile) OR `backlog.md` wired-but-unused.

### Worker / shared-UI store-coupling drift

- **From q-080:** `engine/worker/ViewportRefs.ts:120-122` `mouseOverCanvas` already flagged in `docs/engine/10_Viewport.md:310` for migration to viewport slice — confirmed by q-080 but not lifted into `backlog.md`.
  - Suggested home: `backlog.md` carry-in.
- **From q-081:** `<TExtra = Record<string, unknown>>` at `engine/plugins/RenderDialog/types.ts:41` is the precedent pattern for generic + opaque default — applicable to `EngineRenderState` boundary.
  - Suggested home: `backlog.md` cleanup-opportunity (type-tightening target).
- **From q-088:** Vector*Input reads `useAnimationStore` (`vector-input/index.tsx:33-37`) — outside the current `StoreCallbacks` context surface. Multi-line fix OR context-surface expansion needed.
  - Cited file: `components/vector-input/index.tsx:33-37`
  - Suggested home: `backlog.md` doc-rewrite (extends shared-ui-coupling-rules row on Dock/DropZones/Vector*Input drift; the q-088 row already exists but the AnimationStore-specific call-out is new).
- **From q-119:** `app-gmt/main.tsx:472` duplicates the `(window as any).__store = useEngineStore;` assignment — either site can satisfy the `apply.ts` lookup depending on which app booted first.
  - Cited file: `app-gmt/main.tsx:472`
  - Suggested home: `backlog.md` cleanup (race-condition risk between two assignment sites).

### View Manager / panel-manifest drift

- **From q-005:** Label vs id divergence — manifest entry uses `id: 'Camera Manager'` but `label: 'View Manager'`. User-facing text is "View Manager" everywhere; internal references stay `'Camera Manager'`. Intentional but undocumented.
  - Suggested home: Promote to JSDoc on the manifest entry OR `backlog.md` doc-note.
- **From q-005:** `topbar.tsx:198` default fallback says "panel not registered yet" — reads like registration is incomplete; should be "openCameraManager callback not wired by host app."
  - Cited file: `engine-gmt/topbar.tsx:198`
  - Suggested home: `backlog.md` cleanup-opportunity (misleading log).
- **From q-084:** `'system'` menu registration gated behind `advancedMode` at `engine-gmt/topbar.tsx:575` — `docs/engine/17_Mobile_Layout.md:31-33` does not mention this gate.
  - Suggested home: `backlog.md` doc-rewrite.
- **From q-006:** `setOpenLightPopupIndex` is written only by CenterHUD; a future "edit light from dock panel" interaction wanting to drive the same gizmo highlight would need LightPanelControls to call this too.
  - Suggested home: `backlog.md` doc-note (asymmetric writer).
- **From q-006:** Shadow-panel surface differs — CenterHUD uses a portal popup driven by store `shadowPanelOpen`; LightPanelControls inlines `AutoFeaturePanel` with `groupFilter="shadows"`. Two paths to the same shadow params.
  - Suggested home: `backlog.md` drift-risk.
- **From q-051:** `engine/plugins/TopBar.tsx:32-34` mixes import paths (`./topbar/`, `./viewport/`) — visible asymmetry that would resolve if `AdaptiveResolutionBadge` moved to `topbar/`.
  - Cited file: `engine/plugins/TopBar.tsx:32-34`
  - Suggested home: `backlog.md` cleanup-opportunity.
- **From q-051:** `FixedResolutionControls.tsx` / `ViewportModeControls.tsx` may also be topbar/control-bar candidates depending on where they're mounted.
  - Suggested home: `backlog.md` orphan-sweep.

### Tutorial / Help / Shortcuts

- **From q-010:** Overlay effect dep array uses `displayedStep?.id` rather than the resolved anchor list — switching would force re-observation but thrash on every register/unregister. Documented intent but no rationale comment in source.
  - Cited file: `engine/plugins/tutorial/Overlay.tsx:218`
  - Suggested home: Promote rationale to source comment / JSDoc.
- **From q-012:** `applyToStore` callback in `setTutorialStorageKey` uses `as any` because slice surface lacks a typed setter for `tutorialCompleted`. Minor type-debt.
  - Cited file: `engine/plugins/Tutorial.tsx:44`
  - Suggested home: `backlog.md` cleanup-opportunity.
- **From q-056:** `installCamera({ hideShortcuts: true })` suggests Camera plugin could register `Ctrl+Shift+Z` ignoring `hideShortcuts` — worth verifying no such code path exists.
  - Cited file: `app-gmt/main.tsx:245`
  - Suggested home: New followup (verification) OR `backlog.md` invariant check.

### Animation / camera-lock

- **From q-055:** `handleInteractionStart`'s legacy CameraState-overload shim at `store/slices/historySlice.ts:289-297` may be removable; grep for remaining callers needed.
  - Cited file: `store/slices/historySlice.ts:289-297`
  - Suggested home: `backlog.md` cleanup-opportunity (shim retirement candidate).
- **From q-111:** `PauseControls.tsx:40` builds its own `isEffectivePaused` with a different conjunction than camera-lock predicates — there is no single canonical "lock" selector.
  - Cited file: `components/PauseControls.tsx:40`
  - Suggested home: `backlog.md` doc-note (extends q-111 backlog row on `isCameraLocked` vs `ignoreCamera`).
- **From q-107:** `Navigation.tsx:1107-1143` re-localises hover pivot every frame against `engine.sceneOffset`; surrounding comment flags drift-while-idle as a "stale-offset bug" canary.
  - Suggested home: Promote to ADR or JSDoc (this is an existing canary, not a new bug, but the rationale should be preserved).

### Export pipeline / mesh export

- **From q-114:** Capability probe asymmetry at `engine/export/videoEncoder.ts:54` omits the `2.5×` factor — intentional but undocumented as such.
  - Cited file: `engine/export/videoEncoder.ts:54`
  - Suggested home: JSDoc paragraph at the encoder, OR `backlog.md` doc-rewrite.
- **From q-114:** `RenderPopup.tsx` 12 Mbps threshold is the only UI surface of the multiplier — must move with the `2.5×` factor if it changes.
  - Suggested home: `backlog.md` invariant (three-site sync requirement).
- **From q-115:** `ExportPanel.handleGenerate` only nulls `lastMesh`/`lastBlob`; does NOT call `resetMeshResult`, so log/memory arrays survive into next generate.
  - Cited file: `mesh-export/components/ExportPanel.tsx:102-106`
  - Suggested home: `bugs.md` (minor memory leak) OR `backlog.md` cleanup.
- **From q-115:** `resetMeshResult` does not reset `lastTimings`'s sibling `useNarrowBand` flag — will carry over from previous run.
  - Cited file: `mesh-export/store/meshExportStore.ts:335-339`
  - Suggested home: `bugs.md` (state-bleed bug).
- **From q-115:** `loadGMFIntoStore` is reachable from `MeshExportApp.tsx:24` (auto-load) without a preceding `resetMeshResult`. Safe today but leaks if auto-load is ever called more than once per tab.
  - Suggested home: `backlog.md` latent-bug (auto-load idempotence).

### Modular graph / Formula Workshop

- **From q-105:** A new subsystem (`g11-formula-workshop` or `f01-fragmentarium-importer`) should own `importSource` lifecycle, V3/V4 pipelines, and FormulaWorkshop UI. Currently deferred in g05.
  - Suggested home: Phase 2 new subsystem (already noted in `phase-2-new-subsystems.json`?) — verify and promote.
- **From q-117:** A DEV assertion piggy-backed on the `key` argument inside `getParam` closure could validate `inputs:` ↔ `getParam` order without changing semantics.
  - Cited file: `engine-gmt/utils/GraphCompiler.ts:104-114`
  - Suggested home: `backlog.md` cleanup-opportunity (defensive DEV check).
- **From q-118:** `fluid-toy/fluid/FluidEngine.ts:28-99` — ~70 lines of enum tables that would naturally live in a `types.ts` if size reduction is wanted.
  - Suggested home: `backlog.md` low-priority refactor (cosmetic, per the q-118 author).

### Audio FPS / interaction

- **From q-041:** `reportFps` has a subtle throttle asymmetry — when quality crosses threshold but sample not yet due, `_lastStateUpdateMs` is NOT stamped, allowing rapid quality crossings to write `qualityFraction` every frame without updating `fps`/`fpsSmoothed`.
  - Cited file: `store/slices/viewportSlice.ts:200`
  - Suggested home: `backlog.md` drift-note (likely fine but surprising).
- **From q-041:** `setRenderScale` is the only setter in the slice that does NOT emit `reset_accum` — resolution-affecting changes (`setResolutionMode`, `setFixedResolution`, `setDpr`) all do. Likely intentional but worth a doc note.
  - Suggested home: `backlog.md` invariant (or JSDoc).
- **From q-041:** Slice ↔ module unit mismatch: slice's `interactionDownsample` is a quality fraction (0..1), module's is a divisor (≥1). Conversion at `viewportSlice.ts:172-174` with 0.01 floor for div-by-zero.
  - Suggested home: Promote conversion-rationale to JSDoc on the slice action.
- **From q-041:** `setAdaptiveSuppressed` lives in `renderControlSlice.ts`, NOT `viewportSlice.ts` as the original audit claim implied — audit claim for e06 should split adaptive-suppression ownership across two slices.
  - Suggested home: `backlog.md` survey-error correction (extends q-040 backlog row).
- **From q-041:** `holdAdaptive` mutates module-level state (`_holdUntilMs`), not store state — invisible to Zustand subscribers. Apps calling it around accumulation starts won't see a re-render; effect only manifests in next `reportFps` tick.
  - Cited file: `store/slices/viewportSlice.ts:26-27`
  - Suggested home: Promote to JSDoc on `holdAdaptive`.

### Doc paths / aspirational APIs

- **From q-024:** Exact H2 in engine doc is `## The render-loop contract` (line 81), not `§ render-loop` — citation in `TickRegistry.ts:71` warn-string should match.
  - Cited file: `engine/TickRegistry.ts:71`
  - Suggested home: Already in backlog under tick-registry section; the heading-mismatch detail is the actionable bit.
- **From q-103:** `g09-modular-graph.md:80` open question defers full audit of `data/nodes/definitions.ts` — that separate audit has not happened, only q-117's partial read.
  - Suggested home: Phase 2 new subsystem candidate (node definitions audit gap).

---

## TRACKED-IN-BUGS findings (sanity check)

- q-064: `installStateLibrarySlice` collision guard — confirmed in bugs.md.

## TRACKED-IN-BACKLOG findings (where the backlog already covers the topic)

_Listed once per (q-ID, backlog topic) pair. Multiple bullets in the same followup may collapse here._

- q-004: PanelManifest `widgets: { before, after, between }` unused — backlog row exists.
- q-005: Stale `dock: 'float'` comment block at `engine-gmt/panels.ts:453-458` — backlog row exists.
- q-010: ResizeObserver drift on late-registered anchors — backlog row exists (q-010 acceptable per design).
- q-012: Stale JSDoc on `InstallTutorialOptions.storageKey` — backlog row exists.
- q-017: Gradient composite asymmetry; `MaterialController.setGradient` hard-codes layer mapping — backlog rows exist.
- q-021: Phantom `installRenderLoop({ store })` docs reference — backlog row exists.
- q-022/q-023: TickRegistry `runTicks(delta)` is seconds, warn-once flags never reset — backlog rows exist.
- q-024: TickRegistry warn-string path drift — backlog row exists.
- q-025: Single-instance contract not surfaced — backlog row exists.
- q-026/q-027/q-028: `UniformSchema.precision` vestigial, `BASE_SCHEMA` "Pure Core" comment stale, `backingOnly` JSDoc — backlog rows exist.
- q-029: Two silent uniform-name collision paths — backlog row exists.
- q-030/q-031: Two uniform-contribution paths (`extraUniforms` vs `params.*.uniform`) — backlog row exists.
- q-034: `uHistory` vs `uHistoryTexture` naming drift; `uRegionMin`/`uRegionMax` gate undocumented — backlog rows exist.
- q-035: GLSL1 `varying` vs GLSL3 `out` in CONVERGENCE_FRAG — backlog row exists.
- q-040: ViewportAdaptiveConfig field-name drift — backlog row exists.
- q-043: `mouseOverCanvas` ref-based invariant — backlog row exists.
- q-045: `supportsFloat32` / `bufferPrecision` redundancy; `types/viewport.ts` misnamed — backlog rows exist.
- q-049: `engine/plugins/navigation/core/VirtualSpace.ts` orphan — backlog row exists.
- q-052: Non-existent `BucketRenderTypes` import — backlog row exists.
- q-053: `uninstallHelp` STATE-leak — backlog row exists.
- q-055: `priority: 10` convention for hover-shadowed timeline shortcuts — backlog row exists.
- q-056: Inverted tiebreak comment in `app-gmt/main.tsx:408-414`; `Mod+Shift+Z` "Redo (Mac)" label — backlog rows exist.
- q-057: `_scopeSubscribers` dead-ish — backlog row exists.
- q-060: `animUndo`'s `(state as any)[action]` cast — backlog row exists.
- q-063: `docs/engine/16_Type_Augmentation.md` cross-link missing — backlog row exists.
- q-070/q-111: `ignoreCamera` vs `isCameraLocked` shared-selector proposal — backlog rows exist.
- q-072/q-073/q-074: Orphan-sweep candidates (componentClasses, helpUtils, Icons, etc.) — backlog rows exist.
- q-083: Mobile-detect heuristic duplicated across HardwareDetection and useMobileLayout — backlog row exists.
- q-086: HMR resize listener leak — backlog row exists.
- q-088/q-089: Dock/DropZones/Vector*Input granular-selector drift — backlog row exists.
- q-091/q-092: Bucket render config redundancy; `LoadingRendererCPU` orphan — backlog rows exist.
- q-094: `checkHalfFloatAlphaSupport` permanent stub — backlog row exists.
- q-095: Dead profiling block in `ShaderBuilder.buildFragment` — backlog row exists.
- q-096: `ShaderBuilder.ts` class-name collision (rename to `GmtShaderBuilder`) — backlog row exists.
- q-097: `UniformSchema` re-export refuted — backlog row exists.
- q-098: `ConfigManager` 74-line delta intentional — backlog row exists.
- q-099: 6 `engine-gmt/` prefix-missing doc paths — backlog row exists.
- q-100: Stale TODO in `engine-gmt/engine/ShaderConfig.ts:23-25` — backlog row exists.
- q-101: `pipelineRevision` required-vs-optional divergence — backlog row exists.
- q-102: `FormulaType` literal union vs registration drift; `flags.coordinateMode` dead code — backlog rows exist.

## ADDRESSED-IN-SOURCE findings (annotation already present)

- q-017: `store/createFeatureSlice.ts:193-198` comment block explicitly notes gradient-composite asymmetry.
- q-017: `utils/colorUtils.ts:316-318` comment flags GLSL preview / `getGradientCssString` coupling.
- q-023: Header comment in `engine-gmt/engine/TickRegistry.ts` re-export shim states single-instance contract.
- q-031: Inline comment exists for `composeFrom` gradient asymmetry (cross-reference to q-017).
- q-080: `docs/engine/10_Viewport.md:161` already labels `mouseOverCanvas` "GENERIC (misplaced in worker folder)".
- q-082: `engine-gmt/engine/worker/WorkerProxy.ts:25-30` comment confirms `virtualSpace`/`pipeline` are always falsy on the proxy.
- q-094: `engine-gmt/engine/worker/WorkerProxy.ts:664` is a permanent stub — comment explains.
- q-110: `HudOverlay.tsx:32-37` "self-subscribed" comment block is a preservable-rationale comment in the same file.

## CAPTURED-IN-ADR findings

- q-001 (boot guards): ADR-0005 (Boot trigger via LoadingScreen effect).
- q-003 (RenderScaleSource pluggable, two-component split): ADR-0026.
- q-004 (single panel manifest): ADR-0007.
- q-005 (View Manager as adapter consumer): ADR-0056.
- q-005/q-057 (topbar Camera menu wired by hand): ADR-0057.
- q-006 (activeLightPopup singleton bypassing store): ADR-0008.
- q-007 (menuConfig vs menuItems[] surface): ADR-0007 / ADR-0037.
- q-010 (tutorial anchors registry): ADR-0010.
- q-012 (tutorial actionBus): ADR-0009.
- q-021/q-022/q-023/q-024/q-025 (tick semantics, delta units, single driver, doc paths): ADR-0001 / 0002 / 0003 / 0004.
- q-026/q-027/q-028 (UniformSchema base vs feature): ADR-0020.
- q-029/q-030/q-031 (uniform contribution + collision conventions): ADR-0020.
- q-032/q-033/q-043 (17-position shader assembly; mouseOverCanvas): ADR-0019 / 0035 / 0043.
- q-034/q-035 (convergence pipeline / region gate): ADR-0017 / 0018.
- q-040/q-041/q-045 (adaptive resolution + viewport config): ADR-0024 / 0025.
- q-041 (renderControlSlice ownership of `setAdaptiveSuppressed`): ADR-0026 (pluggable source).
- q-044 (compilerHardCap tier flattening): ADR-0024.
- q-047 (per-app config + `engageOnAccumOnly`): ADR-0024 / 0026.
- q-055/q-056/q-058/q-059 (shortcuts scope, priority, lookup, ignoreSelector): ADR-0022.
- q-060 (animUndo guard): ADR-0023.
- q-063/q-066 (Camera adapter / installStateLibrary): ADR-0030 / 0031.
- q-070/q-111 (camera-lock / ignoreCamera): ADR-0015 / 0016.
- q-075 (audio engine pull-only): ADR-0027 / 0028.
- q-076 (`defineFeature` identity helper): ADR-0036.
- q-079/q-080/q-081/q-082 (worker proxy boundary opaque types): ADR-0033 / 0034.
- q-083/q-084 (mobile gating asymmetric, address-bar collapse): ADR-0038 / 0039.
- q-088/q-089 (DDFS compile/runtime split, store-context migration): ADR-0014 / 0055.
- q-090 (topbar widgets / register flow): ADR-0037 / 0057.
- q-091 (orphan registered renderer): ADR-0054.
- q-093 (Three.js shape variance): ADR-0033 (worker stub-after-extraction).
- q-095 (ShaderBuilder section escape): ADR-0019.
- q-096 (ShaderBuilder class-name collision): ADR-0054.
- q-097 (UniformSchema base vs feature): ADR-0020.
- q-098/q-100/q-101 (ConfigManager / ShaderConfig drift): ADR-0054.
- q-102/q-106 (FormulaType literal union vs registry): ADR-0048.
- q-103/q-104/q-117 (two registries; node graph compile/runtime parity): ADR-0049 / 0050 / 0051.
- q-107 (custom cursor-anchored gestures): ADR-0047.
- q-109 (HudOverlay region branches): ADR-0046 (unified coordinate camera).
- q-110 (engine HUD vs app HintDisplay split): ADR-0046.
- q-112 (worker `-1` sentinel for missed click): ADR-0034 (opaque worker boundary).
- q-113 (Histogram readback serial dispatch): ADR-0044.
- q-114 (per-frame export pipeline separate from bucket): ADR-0045.
- q-116 (mesh preview delegation): ADR-0058 (V3/V4 dual-pipeline catalog).
- q-118 (fluid engine sub-controllers): ADR-0054.
- q-119 (`window.__engineStore` / `__store` debug surface): ADR-0033.

## OBSERVATION (no action needed)

_These are confirmations, single-consumer notes, or invariant statements that the followups surfaced but do not flag as actionable._

- q-001: store hydration confirmation; double-boot guard is correctly defended.
- q-002: `cp.phase === 'done'` is the third leg of fade-out gate — intentional anti-jarring design.
- q-003: Default fallback (`DefaultScalePill`) exists for non-GMT apps.
- q-004: PanelDefinition resolution order is well-documented at the manifest source.
- q-007: `featureId` injection by accessor is by design.
- q-010: `_notify()` fires on both anchor mount and unmount — subscribe-driven re-measure runs both ends.
- q-012: Tutorial barrel re-exports a wider public surface — informational only.
- q-017: Malformed gradient produces a black ramp rather than an error (could mask bugs — but flagged elsewhere).
- q-023: Low-FPS double-`runTicks` branch is mutually exclusive — not actually double-ticking.
- q-024: `docs/engine/01_Architecture.md:185` self-references the warning — cite both directions OK.
- q-030: Cross-fork contribution path — informational.
- q-031: Confirms `extraUniforms` for env CDF samplers and `uModularParams` — informational.
- q-033: Cross-ref to q-032 — informational.
- q-035: 6 ShaderMaterials share the GLSL3 VERTEX_SHADER — inventory note.
- q-044: `compilerHardCap` flattens low+mid tiers (intentional).
- q-045: No default `HardwareProfile` exports — runtime-only.
- q-047: Confirms three apps install plugin; only GMT overrides — informational.
- q-048: Plugin naming history (Tutorial under engine/plugins/ for historical reasons).
- q-055: `useShortcutScope('timeline-hover')` reset-on-unmount safety net.
- q-057: Six callsite pins for the dead-ish `_scopeSubscribers` — observation only.
- q-058: Sole `shortcuts.lookup()` reference outside its definition site — observation.
- q-059: `uninstallShortcuts` defends both capture flags — anticipatory.
- q-063: Wording correction (augmentation target is `engine/types/store` module).
- q-066: Wire-format key is literal string `'cameraSlots'` — informational.
- q-076: `plans/doc-audit-state/survey/e01-feature-system.md:102` claim is stale — minor.
- q-082: q-049 / q-082 target hint clarification — informational.
- q-084: `engine-gmt/topbar.tsx` is sole consumer of `UiModePreferenceMenuItem`.
- q-085: Overlaps with q-012 at declaration site only.
- q-086: No `import.meta.hot` usage in `dev/` — pattern would be a first instance.
- q-087: `MobileControls` emits `joyMove`/`joyLook` events; no direct engine call.
- q-090: Topbar directory cleanup opportunity (`components/topbar/` empty).
- q-098: `flushRebuildLog` path — informational coupling note.
- q-099: Audit corpus already uses correct `engine-gmt/` prefix.
- q-100: `FeatureStateMap` is already used as augmentation target — informational.
- q-101: `engine-gmt/store/modularSlice.ts:34` starts `pipelineRevision: 1` — informational.
- q-102: Stable branch already mitigates with `FormulaType = string` — informational.
- q-103: Tier-A read of `NodeRegistry.ts` was complete — declaration side is fully audited.
- q-104: One asymmetric coupling (savedCameras lives in cameraSlice, escapes the features bucket).
- q-105: g05 / g08 cross-refs — informational.
- q-106: Five alias registrations bear "Legacy Alias" comments; "Formerly X" tags in `description` fields.
- q-109: Default value `region = 'all'` — informational.
- q-110: "Press Tab" mode-switch hint is an in-HUD micro-hint distinct from `HintDisplay` system.
- q-111: Five Navigation consumers of `isCameraLockedRef.current` — informational.
- q-111: Other `startsWith('camera.')` consumers serve orthogonal purposes — informational.
- q-112: Doc claim at `docs/gmt/02_Rendering_Internals.md:664` is already aligned; only code drifts.
- q-112: `engine-gmt/hooks/useInteractionManager.ts:85` filters `dist > 0` — defensive against worker sentinel.
- q-113: Three single-dispatch / single-UI-consumer confirmations.
- q-116: PreviewCanvas split-work partly done — observation.
- q-119: `store/engineStore.ts:517-522` confirms direction of travel away from window handles.

## Followups with no Related findings (or "None.")

q-008, q-009, q-011, q-013, q-014, q-015, q-016, q-018, q-019, q-020, q-026, q-027, q-028, q-029, q-036, q-037, q-038, q-040, q-042, q-046, q-050 ("None."), q-052, q-053, q-054, q-061, q-062, q-064, q-065, q-067, q-068, q-069, q-071, q-108 ("None."), q-120 ("None.").

(Each of these either had no Related findings section, or wrote "None." explicitly. Their primary `## Answer` content may already be tracked via the q-ID cross-refs in `backlog.md` / `bugs.md`.)

---

## How to act on this map

1. **The UNTRACKED section is the high-signal output.** Each bullet has an opinionated "Suggested home" — bugs.md / backlog.md / new ADR / promote-to-JSDoc / drop-as-observation.
2. The most common UNTRACKED home is `backlog.md` (cleanup-opportunity / drift-risk rows). About 12 candidates are `bugs.md` or new-ADR caliber.
3. Two **untracked silent failure modes** stand out as likely `bugs.md` promotions: q-002 (30s polling timeout with no error UI) and q-094 (HALF_FLOAT alpha-channel mobile fallback unwired).
4. Two **new-subsystem-audit gaps** stand out: q-105 (Formula Workshop / fragmentarium importer needs its own subsystem) and q-103 (full `data/nodes/definitions.ts` audit was deferred but never scheduled).
