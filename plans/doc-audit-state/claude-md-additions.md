# CLAUDE.md additions — queued for orchestrator merge

Generated 2026-05-20 during the doc-audit Phase 2 harvest application
pass. Each batch section lists candidate rows to be merged into the
project's `CLAUDE.md` "Read Docs Before Coding" table or the
"Architecture Patterns" / "Cross-cuts" notes.

The orchestrator will dedupe and reword as needed before merging.

---

## Batch A

Boot chain, panels/topbar, tutorial, DDFS feature system, and shared
UI primitives. Source: `plans/doc-audit-state/harvest/batch-A.md`.

| Working on... | Read first |
|---------------|-----------|
| App boot order, registry freeze timing, share-URL hydration | `docs/audit-2026-05-20/archive/app-gmt/boot-shell.md` |
| Boot timeout / splash never fades / `isReady` stuck false (PRODUCTION BUG) | `docs/audit-2026-05-20/archive/app-gmt/boot-shell.md` |
| Panel manifest, topbar slots, system menu, light HUD popups | `docs/audit-2026-05-20/archive/app-gmt/panels-layout.md` |
| Tutorial / guided lessons, anchors, triggers, step renderers | `docs/audit-2026-05-20/archive/app-gmt/tutorial.md` |
| DDFS features, registry freeze, auto-setter contract, typed slices | `docs/audit-2026-05-20/archive/engine/feature-system.md` |
| DDFS UI rendering, scalar/vector inputs, CompilableFeatureSection, componentRegistry | `docs/audit-2026-05-20/archive/engine/shared-ui.md` |

Notes:
- Boot chain spans three files (`main.tsx` → `useAppStartup` → `LoadingScreen`).
- The 30 s splash-freeze timeout in `GmtRendererTickDriver` is the
  highest-severity actionable item.

---

## Batch B

Animation, render pipeline, shader builder, plugins host, shortcuts +
undo. Source: `plans/doc-audit-state/harvest/batch-B.md`.

| Working on... | Read first |
|---------------|-----------|
| Animation binders, recording lifecycle, log/camera-pair tracks | `docs/audit-2026-05-20/archive/engine/animation.md` |
| RenderPipeline writeIndex semantics, bloom, accumulation | `docs/audit-2026-05-20/archive/engine/render-pipeline.md` |
| Shader builder, uniform schema, BASE vs feature merge | `docs/audit-2026-05-20/archive/engine/shader-builder.md` |
| Engine plugin host slots (TopBar/Hud/Menu), SceneIO, RenderDialog | `docs/audit-2026-05-20/archive/engine/plugins-host.md` |
| Shortcuts scope stack, per-scope undo lanes | `docs/audit-2026-05-20/archive/engine/shortcuts-undo.md` |

Specific cross-cut notes (raw text — orchestrator picks placement):

- When touching animation binders: check the 6-case resolution order in
  `AnimationEngine.getBinder` (registry → per-id cache → legacy
  `lights.` remap → DDFS vec/scalar → root setter). The UNDERSCORE vec
  form (`power_x`) is checked BEFORE the DOT form (`power.x`).
- When changing recording lifecycle: `recordingSnapshot` doubles as
  scrub source AND cleanBase source. Stop-recording must force-flush
  `recordBuffer` BEFORE clearing `overriddenTracks`, otherwise final
  keyframes are lost.
- When changing RenderPipeline: `writeIndex` points to NEXT write slot,
  not the just-written one — `getPrevious*` helpers invert. "MRT"
  naming is historical; targets are color-only single-attachment.
- When adding a feature uniform: pick a themed prefix (`uPT…`,
  `uLight…`, `uModular…`) — name collisions vs BASE_SCHEMA are
  silently dropped, feature-vs-feature is last-wins. No dev-mode
  warning exists today.
- When changing ShaderBuilder section names: the engine never
  interprets them — engine-gmt's live builder bypasses the generic
  addSection/getSections API entirely (typed methods instead).
- When loading scenes: `loadSceneFile` is a pure decoder — it does NOT
  apply the preset. Callers MUST follow with
  `useEngineStore.getState().loadScene({ preset })`. Calling
  `loadPreset` directly skips compile-gate + post-boot config flush +
  worker `OFFSET_SET` → post-boot scenes render as fallback sphere.
- When adding a plugin install function: re-registration is REPLACEMENT
  (Map.set) across topbar/hud/menu — there is no append-only mode.
  `install*` idempotency is per-plugin-flavoured; SceneIO captures
  option deps BEFORE the `_installed` short-circuit.
- When adding a timeline-hover shortcut: use `priority: 10` (convention
  — Undo + Space-to-play both follow this). Tiebreak is
  most-recently-registered wins (NOT first-wins, despite legacy
  comments saying otherwise — see `engine/plugins/Shortcuts.ts:184-185`).

---

## Batch C

Adaptive resolution, audio/FPS sync, camera plugin + appHandles +
migrations + StateLibrary slice/UI, worker contract. Source:
`plans/doc-audit-state/harvest/batch-C.md`.

| Working on... | Read first |
|---------------|-----------|
| Adaptive resolution algorithm, viewport plugin, render-scale source | `docs/audit-2026-05-20/archive/engine/adaptive-resolution.md` |
| Audio clip sync, export mixdown, file cache | `docs/audit-2026-05-20/archive/engine/audio-fps-sync.md` |
| Camera plugin adapters, presetField, appHandles, migrations, StateLibrary slice | `docs/audit-2026-05-20/archive/engine/camera-plugin.md` |
| StateLibrary UI primitives (panel, toast, active-snapshot features) | `docs/audit-2026-05-20/archive/engine/state-library-ui.md` |
| Worker proxy stub, ViewportRefs, EngineRenderState contract | `docs/audit-2026-05-20/archive/engine/worker-contract.md` |

Specific cross-cut notes:

- When touching `engine/AdaptiveResolution.ts`: the algorithm is
  shared verbatim with `engine-gmt/engine/managers/UniformManager.ts`
  and `store/slices/viewportSlice.ts`. Any change must be verified
  against both callers. The caller MUST set `state.selfResized = true`
  before a resize-triggered accumulation reset, or adaptive will
  re-engage immediately.
- When installing the viewport plugin in a new app: `installViewport()`
  is idempotent but `setAdaptiveConfig` runs on EVERY call — calling
  it twice with different `{ targetFps }` will apply the second value.
  Hovering does NOT re-render React subscribers (`mouseOverCanvas` is
  a ref); only the next adaptive state change does.
- When changing `audioClipSync.ts`: the three permitted edge cases
  (`justResumed` / `justScrubbed` / out-of-range) are the ONLY times a
  playing deck is touched. Tests must call `_resetAudioClipSync()`
  between cases because module globals (`prevFrame` / `prevPlaying` /
  `ownedDecks`) persist across HMR.
- When installing the camera plugin: import
  `engine/plugins/camera/presetField` as an early side effect BEFORE
  any store-touching import. Importing `Camera.ts` first freezes the
  preset-field registry and `cameraSlots` silently fails to round-trip.
- When installing `installStateLibrary` in a new app: pick a UNIQUE
  `arrayKey` and UNIQUE `actions.add` name — the slice's idempotency
  guard is narrow and either-side collisions cause silent data loss /
  silent action mis-routing (followup q-064). Apps that pass
  `menu: null` must manually mount `<StateLibraryToast arrayKey>`.
- When wiring `StateLibraryPanel`: pass the same `arrayKey` to
  `installStateLibrary` AND `<StateLibraryToast>`. A typo at either
  site silently produces a dead toast — `toastFieldKey(arrayKey)` is
  the only contract and there is no runtime validation.
- When changing `engine/worker/WorkerProxy.ts`: the stub-and-registry
  pattern is load-bearing — `setProxy()` must run before any caller
  has captured a reference from `getProxy()`. The real worker-backed
  implementation lives at `engine-gmt/engine/worker/WorkerProxy.ts`
  and is structurally distinct; do NOT back-port worker-specific code
  into the stub.


---

## Batch E

GMT-specific engine fork — navigation, formula registry + Modular graph, GMF save/load, features mounting, Camera Manager, Formula Workshop (V3/V4 importer). Source: `plans/doc-audit-state/harvest/batch-E.md`. ADRs 0046-0058.

| Working on... | Read first |
|---------------|-----------|
| GMT camera, Orbit/Fly modes, cursor-anchored gestures, sceneOffset treadmill | `docs/audit-2026-05-20/archive/engine-gmt/navigation.md` |
| Formula registry, FractalDefinition, alias drift, FormulaType union | `docs/audit-2026-05-20/archive/engine-gmt/formula-registry.md` |
| Modular graph compiler, uModularParams slot parity, DCE + topo sort | `docs/audit-2026-05-20/archive/engine-gmt/modular-graph.md` |
| GMF format (v1/v2), scene save/load, parseGMF caveats, registry handoff | `docs/audit-2026-05-20/archive/engine-gmt/save-load-gmf.md` |
| DDFS feature catalog (engine-gmt), engine-core shared features, compile/runtime split | `docs/audit-2026-05-20/archive/engine-gmt/features.md` |
| Camera Manager, savedCameras + slot hotkeys, installStateLibrary factory consumer | `docs/audit-2026-05-20/archive/engine-gmt/camera-manager.md` |
| Formula Workshop (Fragmentarium/DEC/Shadertoy import), V3 + V4 pipelines, importSource lifecycle | `docs/audit-2026-05-20/archive/engine-gmt/formula-workshop.md` |

Key rows for the main CLAUDE.md table (orchestrator dedupe target):

- **Navigation:** Header block at `engine-gmt/navigation/Navigation.tsx:1-97` is canonical design rationale — preserve. Camera resting state MUST be `position=(0,0,0)` with world in `sceneOffset`. Per-event absorb requires `engine.dirty = true` everywhere (wheel :640, custom orbit :805, middle-drag :893, pan per-frame :1336). `passive: false` on wheel handler is required for `preventDefault()`. `pointer-events-auto` class is the catch-all UI gate for HUD widgets in Orbit mode.
- **Formula registry:** Registration is side-effectful at `engine-gmt/formulas/index.ts` module-import time; importers must transitively import this file before `registry.get/getAll`. The 5 legacy aliases are registered but NOT in the `FormulaType` union — see ADR-0048. New formula files must add the id to the union OR accept widening at the cast.
- **Modular graph:** `compileGraph` + `updateModularUniforms` MUST allocate / pack `uModularParams` slots in lockstep (ADR-0050). `getParam(key)` order in `def.glsl()` MUST equal `def.inputs` declaration order — no assertion, wrong order silently desyncs sliders. Two synthetic roots `root-start` / `root-end` are hard-coded in three places (ADR-0051).
- **GMF save/load:** GMF parse uses non-greedy regex — a literal `</Shader_Function>` inside GLSL truncates. `isGMFFormat` is a strict prefix check (UTF-8 BOM misclassifies). `saveGMFScene` silently downgrades to JSON for unknown formulas (no log). `loadGMFScene` does NOT register the formula — caller is responsible (ADR-0053). Non-GLSL shader fields ride in `metadata.shaderMeta`; new fields silently dropped unless added to both stash + restore paths.
- **Features mounting:** Engine-core features (PostEffects/ColorGrading/Audio/Modulation/Webcam/DebugTools) are imported BY MODULE IDENTITY from `engine/features/*` — see ADR-0054. The 26-34 line comment block in `engine-gmt/features/index.ts` is the historical record, preserve verbatim. Compile/runtime UI split lives on each feature's `panelConfig` (ADR-0055); AreaLights labeled "runtime" actually triggers compile (ANGLE/D3D11 optimizer workaround). Cutting-plane preamble at `engine-gmt/features/core_math.ts:107-120` MUST mirror `engine/SDFShaderBuilder.ts` for mesh export.
- **Camera Manager:** `installGmtCameraSlice()` is load-order critical (must run before any read of `s.savedCameras`); `app-gmt/main.tsx:107` is the canonical site. `menu: null` opts out of auto-generated menu (ADR-0057) — Camera menu wired by hand in `engine-gmt/topbar.tsx:271-348`, slot-1-9 click handlers MUST route to the same actions as `Mod+1..9` hotkeys. `CameraManagerFeature` (DDFS) is a tab-only stub with `params: {}` — real state in `cameraSlice` (ADR-0056).
- **Formula Workshop:** V3 = per-iteration pipeline (composes with engine features) via V2-shape compat shim at `v3/compat.ts` (marked temporary). V4 = single-shot `processFormula` emitting `selfContainedSDE: true`. Per-formula pipeline auto-picked from `./formulas/v3-v4-catalog.json` (regenerate via `npm run catalog:build` after pipeline changes). `importSource` lifecycle is V3-only — V4 imports can't be re-opened in the Workshop (ADR-0058).

Notes:
- Batch E covers the heaviest engine-gmt fork docs (formula-workshop alone spans 47 files). ADR allocations folded camera-lock/ignoreCamera dual into ADR-0046 and importSource into ADR-0058 to stay within the 13-slot range.
- The fork pattern (engine/ vs engine-gmt/) flagged in `feedback_duplicate_module_state.md` applies broadly here; several docs note near-identical sibling files (HardwareDetection, FormulaFormat, etc.). Out of scope for this batch.

---

## Batch D

Bundled engine features, mobile-layout primitives, GMT renderer (FractalEngine + worker bridge), shader pipeline (ShaderBuilder + UniformManager + ConfigManager), bucket-render + worker-export + readbacks. Source: `plans/doc-audit-state/harvest/batch-D.md`. ADRs 0036-0045.

| Working on... | Read first |
|---------------|-----------|
| Bundled engine features (audio / modulation / webcam / debug / post / grading) | `docs/audit-2026-05-20/archive/engine/features.md` |
| Mobile-layout primitives, address-bar collapse, asymmetric gating | `docs/audit-2026-05-20/archive/engine/mobile-layout.md` |
| FractalEngine + MaterialController + CompileScheduler + Worker bridge | `docs/audit-2026-05-20/archive/engine-gmt/renderer.md` |
| Shader composition: ShaderBuilder 17-position, SDFShaderBuilder, UniformManager.syncFrame, ConfigManager diff | `docs/audit-2026-05-20/archive/engine-gmt/shader-pipeline.md` |
| Bucket render + video/image-sequence export + worker readbacks (depth, histogram) | `docs/audit-2026-05-20/archive/engine-gmt/bucket-render.md` |

Specific cross-cut rows (orchestrator picks placement):

- **engine/features:** When adding a bundled engine feature: `set${cap(feature.id)}` is a load-bearing string convention — the matching auto-generated store setter must exist before any `setFeature()` call (engine/features/setFeature.ts:56-57). Not type-enforced; boot-order bugs surface as a dev-only `console.warn` that's silent in production. See q-013 carry-in.

- **engine/features:** When working with `modulationEngine.offsets`: the buffer is APPENDED inside `update()`. Caller MUST call `resetOffsets()` (or `applyModulationsAt` which does so) before each tick. Two rules targeting the same param accumulate; `lfosEnabled` gates both writes AND reads of `lfoValues`.

- **engine/mobile-layout:** When adopting mobile-layout primitives: import order matters — importing `hooks/useMobileLayout.ts` IS the install step (no plugin). DOM order matters too — render `<MobileScrollIntro>` BEFORE `<MobileViewportShell>`, or the address-bar collapse trick breaks (ADR-0039). Layout shells (Gate / Intro / Shell) consume RAW `isDeviceMobile`; preference-aware UI (joysticks, mobile menu) consumes `isMobile` (ADR-0038). The 768px breakpoint is duplicated in `engine/HardwareDetection.ts` — change both together.

- **engine-gmt/renderer (compile):** When touching `engine-gmt/engine/CompileScheduler.ts`: the three strategies (`keepCurrent`, `twoStage`, `singleStage`) are load-bearing (ADR-0040). The generation counter only protects POST-async-yield code; rapid CONFIG bursts can still race the synchronous portion of `perform()`. `lastCompiledFormula` includes the interlace formula id so hybrid-id changes trigger rebuilds. Modular uniform sync must defer until AFTER `swapFullMaterial` or the still-rendering old shader's slot mapping corrupts. Compile-telemetry log lines at lines 238-239 / 330-331 are profiling waypoints — do not remove.

- **engine-gmt/renderer (worker):** When changing the worker boundary (`engine-gmt/engine/worker/`): `_offsetGuarded` is drift-converged WITHOUT a timeout fallback (ADR-0042). `applyOffsetShift` is a no-op on main thread. `bootWithConfig` auto-`restart()`s when already booted — the sole Firefox sync-compile cancel escape hatch (ADR-0041) — and depends on `_container`/`_lastInitArgs` having been stashed during init. `renderer.outputColorSpace = LinearSRGBColorSpace` in `renderWorker.ts` is mandatory; without it, canvas vs FBO programs hash differently and Three.js recompiles.

- **engine-gmt/shader-pipeline (builder):** When changing `engine-gmt/engine/ShaderBuilder.ts`: 17-position assembly order is load-bearing (ADR-0043). Always-inject means disabled features still emit stubs — never skip `feat.inject()` for a toggle-off feature. Dedupe-by-string-equality on preamble/function/integrator: emit a single canonical chunk constant, not per-call templates. The Mesh variant emits a LIBRARY (no #version, no main) — mesh-export wraps it.

- **engine-gmt/shader-pipeline (uniforms):** When changing `engine-gmt/engine/managers/UniformManager.ts`: `syncFrame` step order is load-bearing (ADR-0044). `uLightDir[i]` is direction TOWARD the light (negated at the boundary) — shaders use it without per-consumer negation. `uPixelSizeBase` is derived from the POST-adaptive viewport. `adaptiveSuppressed` hard-forces full res; bucket-render and export flows set it. UniformManager is engine-gmt-only — the sibling `engine/managers/` directory only carries `ConfigManager.ts`.

- **engine-gmt/bucket-render:** When touching bucket-render or export pipelines (`engine-gmt/engine/GmtBucketHost.ts`, `engine-gmt/engine/worker/WorkerExporter.ts`): two separate drivers, ONE shared `exportMaterial` + `BloomPass` (ADR-0045). `config.convergenceThreshold` is a percent (host /100). `exportMaterial.uEncodeOutput = 1.0` is mandatory for bucket readback. `onTileBlitToScreen` MUST `gl.flush()`. Image-sequence preview blit MUST reset `uOutputPass = 0` so viewport shows beauty. Encoder bitrate stacks `BITRATE_MULTIPLIER * 2.5` — see ADR-0045 / q-114. `cleanup()` is one-shot — `cancel()` and `finish()` both safe to call.

Notes:
- All 10 ADRs (0036-0045) used. Skipped JSDoc additions where source already documents the invariant (top-of-file blocks for CompileScheduler, BucketRenderer, GmtBucketHost, WorkerExporter, WorkerDepthReadback, WorkerHistogram, SDFShaderBuilder; inline comments inside MobileScrollIntro / Shell / LandscapeGate; existing block on `resetAccumulation` / `engine` / `bootWithConfig` restart path / `compilePreview` two-stage / `syncUniform` skips / `cleanup` short-circuit).
- `checkHalfFloatAlphaSupport` permanent-stub (q-094), `_offsetGuarded` drift-converged (q-093-adjacent), Modular pipeline `pipelineRevision` rebuild gate captured as JSDoc invariants in source; ADRs go to load-bearing system decisions only.
