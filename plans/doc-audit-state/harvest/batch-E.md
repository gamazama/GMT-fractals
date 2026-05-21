# Harvest: batch-E

Seven `engine-gmt/` module docs decomposed into JSDoc additions (file:line cited), ADRs (decisions with rationale), and CLAUDE.md rows. Source-file headers are already strong on the heavyweight files (Navigation.tsx, cameraSlice.ts, FormulaWorkshop.tsx, features/index.ts) — harvest focuses on invariants NOT yet captured at the export point and on decisions worth standalone ADR capture. ADR slots used: **0046-0058** (13 slots assigned by this batch). Coordinates with batch-B/C harvest (no overlap on FormulaType — batch B/C did not file that ADR).

---

## docs/modules/engine-gmt/navigation.md

### Source files
- `engine-gmt/navigation/Navigation.tsx` (1404 lines; header block at :1-97 is the canonical design rationale, preserve verbatim)
- `engine-gmt/navigation/HudOverlay.tsx`
- `engine-gmt/navigation/modifiers.ts` (top-of-file rationale at :1-6 preserved)
- `engine-gmt/navigation/useInputController.ts`
- `engine-gmt/navigation/usePhysicsProbe.ts`
- `engine-gmt/navigation/index.ts` (barrel)

### JSDOC additions

**File: `engine-gmt/navigation/Navigation.tsx`**
- Top-of-file header is comprehensive; NO additional top-block needed.
- On `absorbOrbitPosition` (~:265): `@invariant Bumps absorbGenRef every call (Navigation.tsx:273). Async hover picks issued BEFORE that increment compare gen-at-issue to current gen on resolution (:557) and drop themselves if differing — fixes the "quicker the interaction → more likely glitch" bug class. Three modes: silent + keepTarget=false (Orbit onEnd / wheel / middle-drag per-event), silent + keepTarget=true (per-frame PAN absorb shifts target by -camera.position), full setSceneOffset (mode-switch safety only; triggers OFFSET_SET + accumulation reset).`
- On the `useFrame` integrator (~:1016): `@invariant Wheel + middle-drag absorb PER-EVENT, not at burst end. scrollEndTimeout (:644-650) is state-cleanup only — a late firing is harmless. Renaming it "flush" would be a misnomer.`
- On the `useFrame` integrator (~:1016): `@invariant engine.dirty must be set inside every per-event absorb path (wheel :640, custom orbit :805, middle-drag :893, pan per-frame :1336). Per-event absorb returns camera.position to zero, masking motion from the integrator's posChanged check.`

**File: `engine-gmt/navigation/usePhysicsProbe.ts`**
- On `usePhysicsProbe` (line 12): `@invariant Distance smoothing is asymmetric — large increases (>prev*1.5) blend at 8%/frame (~60 frames to converge); decreases snap instantly. Intentional for safety/responsiveness when diving toward a surface; symmetric smoothing would lag flySpeed drop on approach (usePhysicsProbe.ts:64-73).`
- On `usePhysicsProbe` (line 12): `@invariant Worker mode (!engine.renderer) consumes engine.lastMeasuredDistance set by the worker's depth readback (:107-127); direct mode does a 3×3 readback locally against getPreviousRenderTarget() (:129-167). Skipped during initial compile (!engine.hasCompiledShader || frameCount < 15) at :84-90.`

**File: `engine-gmt/navigation/useInputController.ts`**
- On `useInputController` (line 15): `@invariant Ignores keys while isTimelineHovered (useInputController.ts:78-79) so timeline shortcuts aren't shadowed by WASD. Move-state has 10 booleans (forward/back/left/right/up/down/rollL/rollR/boost/precise). Wheel handler is mode-aware: ortho mode adjusts orthoScale, Fly adjusts flySpeed, Orbit only markActivity() — Navigation owns Orbit-mode wheel zoom math.`

**File: `engine-gmt/navigation/modifiers.ts`**
- Top-of-file comment (:1-6) already states the 4×/0.1× modifier convention and the separate UI-slider 10×/0.1× scale via useDragValue. NO additional JSDoc needed.

**File: `engine-gmt/navigation/HudOverlay.tsx`**
- On `HudOverlay` (line ~10): `@invariant region prop defaults to 'all' but splits the crosshair layer from the bottom-pill cluster so apps can anchor the bottom cluster outside a scaled canvas in Fixed mode (HudOverlay.tsx:24-29, 136-138). HUD self-subscribes to engine store via per-field selectors (:38-50); parent stays free to narrow its own subscription.`
- On `HudOverlay` (line ~10): `@invariant Engine HUD intentionally does NOT render hint overlay. activeHint? / onDismissHint? are app-extension hooks — apps mount their own widget alongside (the preserved JSX in the comment at HudOverlay.tsx:259-261 is historical, NOT a TODO). See followup q-110.`

### ADRs to write

- **ADR-0046 — Unified-coordinate camera with treadmill absorb + absorbGenRef race guard**
  - **Context:** Three.js camera.position is f32; deep zoom (1e-15+) loses mantissa headroom and pose jitters at sub-pixel scale. Async hover picks fired during a gesture can resolve AFTER the offset has shifted, producing a "snap to stale pivot" glitch correlating with interaction speed.
  - **Decision:** Canonical world position = `sceneOffset + camera.position`. In steady state `camera.position = (0,0,0)` and the high/low-split `sceneOffset` carries all world coordinate. `absorbOrbitPosition` bakes camera.position into sceneOffset per-event (wheel, middle-drag, custom orbit) AND bumps a monotonic `absorbGenRef` counter; hover picks snapshot the gen at issue and drop themselves on resolution if absorbGenRef has advanced.
  - **Consequences:** Header at `engine-gmt/navigation/Navigation.tsx:1-97` is the canonical design rationale and must stay. Per-event absorb mandates `engine.dirty = true` everywhere absorb fires (wheel :640, custom orbit :805, middle-drag :893, pan per-frame :1336) — without it the integrator's `posChanged` check can't see motion since camera.position is back at zero. Silent + keepTarget=false path uses `engine.queueOffsetSync + direct setState` to skip OFFSET_SET re-emit and accumulation reset while keeping `getPreset()`/share-links accurate.

- **ADR-0047 — Custom cursor-anchored gestures replace drei rotate/dolly when orbitCursorAnchor is on**
  - **Context:** drei's `OrbitControls` rotates/dollies around a fixed target via `lookAt(target)` — incompatible with "rotate around cursor". drei runs at `useFrame` priority -1 (before Navigation's priority 0), so disabling it during a gesture requires synchronous `orbitRef.current.enabled = false` inside the pointer handler — flipping a ref alone leaks one frame.
  - **Decision:** When `orbitCursorAnchor` (default ON) and non-mobile, custom handlers own ROTATE (left-drag), DOLLY (wheel + middle-drag) while drei is restricted to PAN (right-drag). Wheel handler uses `passive: false` to call `preventDefault()`. Touch (`pointerType === 'touch'`) cedes to drei's native `THREE.TOUCH.ROTATE`. Mobile force-disables cursor-anchor regardless of saved setting (multi-touch is drei's responsibility).
  - **Consequences:** When `orbitCursorAnchor=OFF`, drei must be ENABLED for wheel-only PAN — otherwise `enabled=false` at wheel-fire time silently no-ops (no pointerdown precedes wheel-only). Q/E roll must skip the manual `orbitRef.update()` when drei is enabled (avoids `(1 - dampingFactor)` double-multiplication). `OrbitControls.PAN` distance is computed from `camera.position.distanceTo(target)` — after a custom-orbit gesture leaves `target` at `camera.position + forward × 0.0001`, drei pan would no-op; `onStart` re-seats `target` at `distAverageRef` distance.

- **ADR-0048 — Camera-lock and ignoreCamera are duals, not duplicates**
  - **Context:** Camera-locked playback (read-only camera during animation) and record-camera mode (suppress scrub-driven camera output while capturing live input) both touch the same flags: `isPlaying`, `isRecording`, `recordCamera`, sequence containing camera.* tracks. Three independent readers exist: Navigation's `isCameraLocked`, AnimationEngine's `ignoreCamera`, and `engine/plugins/topbar/PauseControls.tsx`.
  - **Decision:** Keep the three open-coded readers separate. They are duals (same input flags, opposite outputs — suppress INPUT vs. suppress SCRUB OUTPUT) and intentionally independent surfaces. Optional refactor target: hoist as named selectors (`selectCameraLocked` / `selectIgnoreCamera`) on animationStore so each surface has one definition.
  - **Consequences:** When changing playback semantics, all three readers must be re-audited together. See followup q-111 in `plans/doc-audit-state/survey/_followups/`.

### CLAUDE.md rows

- "When touching `engine-gmt/navigation/Navigation.tsx`: the header block at :1-97 is canonical design rationale — preserve it. Camera resting state MUST be `position=(0,0,0)` with world in `sceneOffset`. Per-event absorb requires `engine.dirty = true` everywhere it fires. The custom wheel handler uses `passive: false` so it can `preventDefault()` — required for the cursor-anchored translation math."
- "When adding HUD widgets in Orbit mode: pointer-events-auto class is the catch-all UI gate (engine-gmt/navigation/Navigation.tsx:529, 584, 687, 844, 952). Without it, the widget leaks pointer events into the camera handlers. The HUD's `region: 'top' | 'bottom' | 'all'` prop also splits the crosshair from the bottom-pill cluster so the bottom cluster can be anchored outside a scaled canvas."

### Notes / DROPPED content

- Most of the doc's "Invariants" section restates inline comments at the cited lines. Promoted only the ones that aren't visible at the canonical hover target (the function definition).
- The Effect Roster table — pure reference material; keep in module doc.
- HUD-related details (speed-slider log mapping, vibrate-on-limit, cursor-anchor toggle button) — UI specifics, not engine invariants. DROP from JSDoc.
- q-107 / q-108 / q-109 / q-110 / q-111 — followups recorded in the doc; not actionable JSDoc material on their own.
- Orphan-sweep candidates (`unifiedOffsetRef`, local `rollVelocity`, defensive `setIsCameraInteracting` guards) — verification work, not invariant capture.

---

## docs/modules/engine-gmt/formula-registry.md

### Source files
- `engine-gmt/engine/FractalRegistry.ts` (35 lines, ZERO JSDoc — heavy hover-discovery target)
- `engine-gmt/engine/NodeRegistry.ts` (58 lines, ZERO JSDoc)
- `engine-gmt/types/fractal.ts` (FractalDefinition / FractalParameter / Preset / shader flags)
- `engine-gmt/types/common.ts` (FormulaType literal union — hand-maintained)
- `engine-gmt/types/graph.ts` (NodeType / PipelineNode / GraphNode / FractalGraph)
- `engine-gmt/formulas/index.ts` (boot-time registration)
- `engine-gmt/formulas/categories.ts` (PREDEFINED_CATEGORIES)
- `engine-gmt/formulas/Modular.ts` (placeholder with empty shader strings)

### JSDOC additions

**File: `engine-gmt/engine/FractalRegistry.ts`**
- Top-of-file (replace empty line 1): `@module engine-gmt/engine/FractalRegistry — Singleton FractalRegistry mapping formula id → FractalDefinition. Registration is side-effectful at engine-gmt/formulas/index.ts module-import time (42 formulas + 5 legacy aliases). Importers MUST import engine-gmt/formulas/index.ts (directly or transitively) before calling registry.get / getAll / getIds.`
- On `register` (:7): `@invariant No membership check — replacement is silent. Re-registering the same id silently overwrites the prior definition.`
- On `registerAlias` (:11): `@invariant Silently no-ops on unknown target (logs console.warn). Order of alias declarations matters — engine-gmt/formulas/index.ts declares all five aliases AFTER formulas.forEach(register) so they always resolve. Stored as the SAME FractalDefinition reference under a second key (identity comparison works; getAll() dedupes via Set).`
- On `getAll` (:24): `@invariant Deduplicates aliases via Array.from(new Set(this.definitions.values())) — consumers iterating over getAll() see each definition exactly once even when multiple keys point at it.`
- On `getIds` (:29): `@invariant Widens Map.keys() to FormulaType[] via cast — NO runtime check. The 5 alias IDs (UberMenger, FoldingBrot, HyperTorus, HyperbolicMandelbrot, RhombicIcosahedron) are registered but missing from the FormulaType union; the cast hides the drift. See ADR-0049 and followup q-102.`

**File: `engine-gmt/engine/NodeRegistry.ts`**
- Top-of-file (replace empty line 1): `@module engine-gmt/engine/NodeRegistry — Singleton NodeRegistry mapping Modular-graph node id → NodeDefinition. The 25 node definitions are registered from engine-gmt/data/nodes/definitions.ts (owned by g09-modular-graph, NOT this module). engine-gmt/utils/GraphCompiler.ts performs a bare side-effect import of '../data/nodes/definitions' so any compile path triggers registration.`

**File: `engine-gmt/formulas/Modular.ts`**
- On the exported `Modular` const (:4): `@invariant Modular ships EMPTY shader strings (function/loopBody/getDist). The shader factory (g02 / engine-gmt/features/core_math.ts) intercepts id === 'Modular' and splices in graph-compiled GLSL from the preset's pipeline field. Direct shader-string consumers MUST guard against id === 'Modular' or they will compile an empty function body. parameters = [null, null, null, null] is a sentinel — Modular's params come from graph-node bindings, not slot rows.`

**File: `engine-gmt/types/fractal.ts`**
- On `FractalDefinition.shader.usesSharedRotation` (~:87): `@invariant Required for formulas that call gmt_precalcRodrigues in loopInit. Engine swaps gmt_rotAxis / gmt_rotCos / gmt_rotSin between primary/secondary during interlace; without the flag, interlace mode reads stale rotation state.`
- On `FractalDefinition.shader.selfContainedSDE` (~:88-90): `@invariant Mutually exclusive with hybrid-box and interlace. Engine sets SKIP_PRE_BAILOUT, disables hybrid-box fold injection, disables interlacing. Only two formulas opt in: engine-gmt/formulas/JuliaMorph.ts:155 and engine-gmt/formulas/MandelTerrain.ts:272.`
- On `FractalDefinition.shader.supportsCuttingPlane` (~:91-94): `@invariant When true, engine auto-declares cp_dmin / cp_scale / cp_trap globals + initialises them in loopInit. When user picks estimator 5 (Cutting Plane), engine's default getDist returns vec2(abs(cp_dmin), cp_trap). 12 polyhedral formulas use this; the cutting-plane preamble dedup mirrors engine/SDFShaderBuilder.ts (mesh-export coupling — see ADR-0053).`
- On `FractalDefinition.shader.preambleVars` (~:86): `@invariant Mutable globals declared in preamble MUST be listed here. The interlace rewriter renames them (prefix interlace_) when two formulas share GLSL state at compile time. Missing entries silently corrupt cross-formula state. 12 formulas currently use this field.`
- On `FractalDefinition.flags.coordinateMode` (~:99-101): `@deprecated Declared but UNUSED. Grep across engine-gmt/ returns only the type declaration; no formula sets it. Reserved or dead — orphan-sweep candidate.`
- On `FractalDefinition.importSource` (~:103-118): `@invariant Set only by the Workshop V3 importer (engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:943-948). Built-in formulas leave it undefined. V4 imports OMIT importSource — re-editing a V4 formula is not currently supported. See ADR-0056 and docs/modules/engine-gmt/formula-workshop.md.`

### ADRs to write

- **ADR-0049 — FormulaType is a literal union; registry is the truth (hand-maintained drift)**
  - **Context:** `FormulaType` at `engine-gmt/types/common.ts:4` is a hand-maintained 43-entry literal union (42 formulas + `'Modular'`). `FractalRegistry.register` accepts any `FractalDefinition` and `getIds()` widens via `as FormulaType[]` cast (`engine-gmt/engine/FractalRegistry.ts:30`). Drift directions: (a) the 5 alias IDs (`UberMenger`, `FoldingBrot`, `HyperTorus`, `HyperbolicMandelbrot`, `RhombicIcosahedron`) are registered but missing from the union — code holding a `FormulaType` cannot type-represent them; (b) `'PseudoKleinian06'` is in the union but the file is `PseudoKleinianAdv.ts`.
  - **Decision:** Keep `FormulaType` as the hand-maintained literal union for the engine-gmt fork (parent project's stable branch has separately adopted opaque-tag `FormulaType = string` — the fork has not). Drift is acknowledged and contained by the `as FormulaType[]` cast. Three remediation options are recorded in followup `plans/doc-audit-state/survey/_followups/q-102.md`.
  - **Consequences:** New formulas must be added to the union explicitly OR consumers must accept `string`-vs-union loss at the registry boundary. Aliases cannot be type-represented as `FormulaType`. New code that needs to round-trip alias IDs (e.g. GMF load) must accept `string` and check membership at runtime.

- **ADR-0050 — Two independent registries (FractalRegistry, NodeRegistry); no cross-reference at type level**
  - **Context:** Whole-formula entries and Modular-graph operator nodes are both registry-backed but live in different domains (a formula is consumed by `ShaderFactory.setFormula`; a node is consumed by `compileGraph` when the active formula is `'Modular'`). Modeling them as one polymorphic registry would force shared base types and cross-domain leak.
  - **Decision:** Two singletons (`registry` at `engine-gmt/engine/FractalRegistry.ts:34`, `nodeRegistry` at `engine-gmt/engine/NodeRegistry.ts:58`). `FractalDefinition` does not know about `NodeDefinition`. The bridge is the `'Modular'` formula whose shader strings are empty placeholders (`engine-gmt/formulas/Modular.ts:13-18`); the shader factory dispatches on `id === 'Modular'` to splice graph-compiled GLSL.
  - **Consequences:** Node-registration site lives outside `g03-formula-registry` (in `engine-gmt/data/nodes/definitions.ts`, owned by g09-modular-graph). The compiler's side-effect import of `'../data/nodes/definitions'` (`engine-gmt/utils/GraphCompiler.ts:5`) is the load-order glue. Any future graph-driven formula id (other than `'Modular'`) must update the shader factory's intercept condition.

### CLAUDE.md rows

- "When touching `engine-gmt/engine/FractalRegistry.ts` / `engine-gmt/formulas/index.ts`: registration is side-effectful and one-shot per file load. Consumers must import `engine-gmt/formulas/index.ts` (directly or transitively) BEFORE calling `registry.get` / `getAll`. The 5 legacy aliases (`UberMenger`, `FoldingBrot`, `HyperTorus`, `HyperbolicMandelbrot`, `RhombicIcosahedron`) are registered but NOT in the `FormulaType` union — see ADR-0049 for the drift contract."
- "When writing a new formula: any mutable global declared in `shader.preamble` MUST be listed in `shader.preambleVars` (interlace rewriter renames them). Formulas calling `gmt_precalcRodrigues` need `shader.usesSharedRotation: true`. Cutting-plane consumers (`shader.supportsCuttingPlane: true`) get `cp_dmin/cp_scale/cp_trap` auto-declared; the preamble dedup must mirror `engine/SDFShaderBuilder.ts` for mesh export to work (ADR-0053)."

### Notes / DROPPED content

- Full Formula Catalog table (42 rows + flags) — reference material, lives in module doc.
- Per-formula line counts — diagnostic only.
- Category-vs-UI-order distinction — UI specifics; documented in module doc.
- Filename vs ID drift in PseudoKleinianAdv.ts → PseudoKleinian06 — captured as a comment opportunity but not actionable at JSDoc level; called out in ADR-0049.

---

## docs/modules/engine-gmt/modular-graph.md

### Source files
- `engine-gmt/utils/GraphCompiler.ts` (194 lines; helpers `buildInputsByTarget`, `buildLiveNodeIds` already JSDoc'd)
- `engine-gmt/utils/graphAlg.ts` (cycle check + topo sort + pipeline↔graph + structural equality)

### JSDOC additions

**File: `engine-gmt/utils/GraphCompiler.ts`**
- Top-of-file (insert above line 1 imports): `@module engine-gmt/utils/GraphCompiler — Turns a Modular pipeline (topologically sorted PipelineNode[] + GraphEdge[]) into the GLSL body of formula_Modular() and produces a matching flat Float32Array of per-frame parameter slots so slider drags update uniforms without a shader recompile. compileGraph + updateModularUniforms MUST allocate / pack uModularParams slots in lockstep — see ADR-0051.`
- On `compileGraph` (:34): `@invariant DCE walks BACKWARD from synthetic root-end via stack.pop() (LIFO ⇒ DFS, NOT BFS as 03_Modular_System.md previously claimed). Nodes unreachable from root-end produce no GLSL and consume no uModularParams slots. Empty active set → identity body (z.xyz += c.xyz; trap = min(trap, length(z.xyz))).`
- On `compileGraph` (:34): `@invariant Disabled nodes still emit the propagation triple v_<id>_p/_d/_dr from in1 (so downstream variable lookups resolve) but DO NOT call def.glsl and DO NOT consume uModularParams slots. The packer mirrors this skip predicate.`
- On `compileGraph` (:34): `@invariant The two synthetic roots are hard-coded string literals in THREE places: the DCE seed (:20), the varMap pre-seed varMap.set('root-start', 'v_start') (:65), and the output-edge target === 'root-end' lookup (:132). Renaming requires touching all three.`
- On `compileGraph` (:34): `@invariant distOverride window is (-1.0, 999.0); v_start_d is seeded to 1000.0 (:56) so non-SDF graphs naturally fall outside and never override the iterative DE. SDF Primitive nodes write < 999.0 to engage distOverride.`
- On `updateModularUniforms` (:162): `@invariant Slot-order parity with compileGraph is LOAD-BEARING. Both share buildInputsByTarget + buildLiveNodeIds, walk pipeline in the same input order, apply the same skip predicates (!liveNodeIds.has(node.id), !node.enabled), and treat condition.active as two leading slots (cmod then crem) ahead of the node's own params. Divergence silently misaligns sliders.`
- On `updateModularUniforms` (:162): `@invariant getParam-call order MUST equal def.inputs declaration order. The compiler's getParam closure ignores the key argument when allocating array slots — it just increments a counter on each unbound call. The packer iterates def.inputs in declaration order. The two only agree because every existing NodeDefinition author has written def.glsl() to call getParam('id') in the same sequence as their inputs: array. NO assertion, NO test enforces this. See followup q-117 and DEV-mode hardening note in module doc.`
- On `updateModularUniforms` (:162): `@invariant Param overflow degrades silently — compiler returns the GLSL literal "0.0"; packer's setP drops writes past MAX_MODULAR_PARAMS. No exception, no console warning.`

**File: `engine-gmt/utils/graphAlg.ts`**
- On `topologicalSort` (:42): `@invariant Does NOT detect cycles — passing a cyclic graph yields a partial pipeline (nodes inside the cycle drop out because their in-degree never reaches 0). The store is expected to call hasCycle() before addEdge commits. Tie-break is alphabetical (queue.sort() each pop), so compile order is deterministic across runs. nodes.find(n => n.id === u) inside the loop is O(N²); acceptable at current preset counts (< ~50 nodes).`
- On `isStructureEqual` (:115): `@invariant Recompile-trigger diff. Compares id/type/enabled, JSON.stringify(bindings ?? {}), and condition.active. condition.mod / condition.rem and node.params values are deliberately excluded so retuning sliders does NOT trigger a recompile. Two semantically equivalent bindings objects whose keys were inserted in different orders compare unequal and spuriously recompile (JSON.stringify is order-sensitive).`

### ADRs to write

- **ADR-0051 — Compile/runtime slot-order parity via shared DCE walk**
  - **Context:** Modular formulas declare a flat `uniform float uModularParams[MAX_MODULAR_PARAMS]` array; the GLSL compiler emits references like `uModularParams[7]` at compile time, but slider drags must update those same indices every frame WITHOUT recompiling. Any divergence between which-slot-is-which on the two sides corrupts sliders silently.
  - **Decision:** `compileGraph` and `updateModularUniforms` share two helpers (`buildInputsByTarget`, `buildLiveNodeIds`), walk `pipeline` in the same input order, apply identical skip predicates (`!liveNodeIds.has(node.id)`, `!node.enabled`), and treat `condition.active` as two leading slots (`cmod` then `crem`) ahead of the node's own params. The `getParam` allocator ignores the `key` argument and just bumps a counter on each unbound call — the convention that `def.glsl()` calls `getParam(key)` in the same order as `def.inputs[]` is what keeps it correct.
  - **Consequences:** A contributor who reorders a `vec3(getParam('x'), getParam('y'), getParam('z'))` template, or appends a new `getParam` call without inserting the corresponding `inputs:` entry in the same position, silently desyncs sliders. Recommended hardening (recorded in followup q-117): wrap `getParam` in DEV builds so the first call snapshots `def.inputs.map(i => i.id)` and asserts each subsequent `key` matches `def.inputs[callIndex].id`, skipping bound entries on the same predicate the packer uses. Production cost is zero behind `import.meta.env.DEV`.

- **ADR-0052 — Two synthetic roots (root-start, root-end) as hard-coded string literals; DCE walks backward (DFS)**
  - **Context:** The Modular graph editor needs explicit start/end anchors so the compiler can compute reachability without committing to a particular pipeline shape. Earlier prototypes used "the first node" / "the last node" by topological index, but disconnected subgraphs and side-tap nodes made that fragile.
  - **Decision:** Two synthetic roots — `'root-start'` (provides `v_start_p/_d/_dr`) and `'root-end'` (the output sink). DCE walks BACKWARD from `'root-end'` via `stack.pop()` (LIFO ⇒ DFS, NOT BFS — the 03_Modular_System.md doc claim is wording drift). Nodes unreachable from `'root-end'` produce no GLSL and consume no `uModularParams` slots.
  - **Consequences:** Renaming a root requires touching three places in `engine-gmt/utils/GraphCompiler.ts`: the DCE seed (line 20), the `varMap` pre-seed (line 65), and the output-edge `target === 'root-end'` lookup (line 132). A fully disconnected graph yields the empty-graph identity body (`z.xyz += c.xyz; trap = min(trap, length(z.xyz))`) — no error, no warning. Acceptable trade-off because the FlowEditor visually shows the disconnection.

### CLAUDE.md rows

- "When touching `engine-gmt/utils/GraphCompiler.ts` or adding a NodeDefinition to `engine-gmt/data/nodes/definitions.ts`: the `getParam(key)` call order inside `def.glsl()` MUST match the `def.inputs[]` declaration order, with bound params skipped on both sides. There is no assertion. Wrong order silently desyncs sliders. Both `compileGraph` and `updateModularUniforms` walk `pipeline` with the same DCE + skip predicates — see ADR-0051."

### Notes / DROPPED content

- Full Public API table — restates code; reading the file is faster.
- Conditional execution GLSL template — interesting but already in module doc, not invariant material.
- O(N²) `topologicalSort` performance note — captured in JSDoc, not ADR-worthy.

---

## docs/modules/engine-gmt/save-load-gmf.md

### Source files
- `engine-gmt/utils/FormulaFormat.ts` (267 lines, top-of-file rationale at :5-11 already strong)
- `engine-gmt/utils/CameraUtils.ts` (well-documented; existing JSDoc covers most exports)
- `engine-gmt/utils/BenchProfiler.tsx`
- `utils/SceneFormat.ts` (engine-core scene-IO primitives — covered by e07-plugins-host, captured here only by reference)

### JSDOC additions

**File: `engine-gmt/utils/FormulaFormat.ts`**
- On `isGMFFormat` (:211): `@invariant Strict prefix check on trimStart() — content must start with '<!--' or '<Metadata>'. A leading UTF-8 BOM or stray container tag will misclassify as JSON. Used as the dispatch predicate by loadGMFScene.`
- On `parseGMF` (:145): `@invariant Tag extraction uses non-greedy <TAG>...</TAG> regex (:146-151). A shader body containing a literal </Shader_Function> (e.g. inside a GLSL line-comment) will truncate early — latent fragility, no current bug hits it. Modular formulas (metadata.id === 'Modular') are explicitly allowed to ship with empty Shader_Function/Shader_Loop (:178); their GLSL is rebuilt from the preset's pipeline at load time.`
- On `generateGMF` (:95): `@invariant shaderMeta is the sole survival path for non-GLSL shader fields. Only preambleVars and usesSharedRotation are stashed into metadata (:103-105) and restored on parse (:191-194). A future field added to the runtime shader object will be silently dropped on save unless added to both the stash and the restore paths.`
- On `saveGMFScene` (:221): `@invariant Silently downgrades to plain JSON.stringify(preset) when registry.get(preset.formula) returns undefined — NO log, NO telemetry. The formula payload embeds def.defaultPreset (NOT the live preset); the current preset is appended in <Scene>.`
- On `loadGMFScene` (:246): `@invariant Does NOT register the formula — caller (System Menu / load handler) checks registry and registers if needed. v1 formula-only GMF (no <Scene> block) synthesizes a preset from def.defaultPreset falling back to { formula: def.id }. Legacy JSON path returns { preset } with no def.`

**File: `engine-gmt/utils/CameraUtils.ts`**
- Existing JSDoc covers each export thoroughly. NO additional JSDoc proposed.
- One single-line note on `getDistanceFromEngine` (:55): `@invariant Returns null (NOT 0) below 0.001 — typically Fly-mode reset. Downstream code must null-check, not coerce to 0.` (Existing doc says "Returns null if camera is at origin" — promote the magic-number rationale.)

**File: `engine-gmt/utils/BenchProfiler.tsx`**
- On `BenchProfiler` (:26): `@invariant Re-reads window.__bench on every render — toggling the bench on/off during a session swaps the React.Profiler wrapping live but pays a per-render property-access cost. The check is intentionally at render time (not module-init) so the bench harness in debug/bench-perf.mts can attach window.__bench AFTER this module is imported but BEFORE AppGmt renders.`

### ADRs to write

- **ADR-0053 — GMF as two-tier HTML-style container (v1 formula-only / v2 with <Scene>)**
  - **Context:** GMT needs a save format that (a) embeds GLSL shader source readably (no JSON-escaped newlines), (b) carries scene state (camera, lights, features, animations), (c) round-trips through copy/paste and PNG iTXt chunks, (d) survives Modular formulas whose GLSL is generated from a node graph at runtime, (e) preserves non-GLSL shader fields like `preambleVars` and `usesSharedRotation` that don't map to a GLSL block.
  - **Decision:** HTML-style tagged container. **v1** carries metadata + GLSL blocks only (`<Metadata>` mandatory; `<Shader_Preamble>`, `<Shader_Init>` optional; `<Shader_Function>`, `<Shader_Loop>` mandatory EXCEPT for `id === 'Modular'`; `<Shader_Dist>` optional). **v2** is v1 plus appended `<Scene>` JSON block holding the full Preset. Block order is fixed. Non-GLSL shader fields ride in `metadata.shaderMeta` (only `preambleVars` and `usesSharedRotation` today). Tag extraction is non-greedy regex; PNG iTXt keyword is `'SceneData'` (legacy read-only `'FractalData'` fallback for gmt-0.8.5).
  - **Consequences:** A shader body containing literal `</Shader_Function>` truncates parse (latent fragility, no current bug). Modular's empty-shader carve-out is a `metadata.id === 'Modular'` string compare; renaming Modular or adding other graph-driven formula ids requires updating the guard. Future runtime-shader fields beyond `preambleVars` / `usesSharedRotation` are silently dropped on save unless added to both stash and restore paths. The default preset baked into `<Metadata>` is the FORMULA'S `defaultPreset`, NOT the live preset — the live preset only lives in `<Scene>`.

- **ADR-0054 — saveGMFScene silently downgrades to JSON; loadGMFScene does NOT register; load is dual-stage**
  - **Context:** Saving a preset whose formula isn't in the registry (typical for in-progress Workshop edits before Import is confirmed, or for scenes loaded from a different fork) needs to NOT throw. Loading a GMF must not invariably register the embedded formula — the registry is the source of truth for "is this formula already known", and clobbering an existing definition with the embedded one would lose any runtime patches the user made since.
  - **Decision:** `saveGMFScene` calls `registry.get(preset.formula)` and silently downgrades to `JSON.stringify(preset, null, 2)` if absent — no log, no telemetry. `loadGMFScene` returns `{ def?, preset }` and does NOT touch the registry; the caller (System Menu / drag-drop handler) checks `registry.get(def.id)` and decides whether to `registry.register(def)`.
  - **Consequences:** Forks that need telemetry on unknown formulas at save-time must wrap `saveGMFScene` themselves. Forks must consistently route loads through their registry-check-and-register handler — calling `loadGMFScene` and then applying the returned `preset` without first ensuring the formula is registered will fail at compile (no formula → empty shader → black screen). The dual-stage load lets the System Menu offer "load formula only" vs "load full scene" without ambiguity.

### CLAUDE.md rows

- "When touching `engine-gmt/utils/FormulaFormat.ts`: GMF parse uses non-greedy `<TAG>...</TAG>` regex — a literal `</Shader_Function>` inside GLSL (e.g. in a line-comment) WILL truncate the parse. `isGMFFormat` is a strict prefix check; UTF-8 BOM will misclassify. `saveGMFScene` silently downgrades to JSON for unknown formulas; `loadGMFScene` does NOT register the formula — caller is responsible. Non-GLSL shader fields (`preambleVars`, `usesSharedRotation`) ride in `metadata.shaderMeta`; new fields are silently dropped unless added to both stash + restore paths."

### Notes / DROPPED content

- Full Public API tables — restate code.
- `neatJSON` / `dedentGLSL` regex specifics — implementation detail.
- `utils/SceneFormat.ts` (engine-core) — covered by e07-plugins-host doc-audit, only referenced here.
- `BenchProfiler` is unrelated to GMF; included in subsystem only for co-location.

---

## docs/modules/engine-gmt/features.md

### Source files (focus areas only — full file list in module doc)
- `engine-gmt/features/index.ts` (109 lines; 26-34 line comment block is canonical historical record — preserve)
- `engine-gmt/features/types.ts` (FeatureStateMap, FeatureCustomActions)
- `engine-gmt/features/core_math.ts` (formula injection orchestrator + cutting-plane preamble dedup)
- `engine-gmt/features/interlace/index.ts` (refusal branches, mesh-variant uniforms)
- `engine-gmt/features/lighting/light_spheres.ts` (registration-order contract at :9-22)
- `engine-gmt/features/lighting/index.ts` (ptEnvNEE migration shim, AreaLights compile-trigger)
- `engine-gmt/features/coloring/index.ts` (SELF_CONTAINED_SDE gate at :377-389)
- `engine-gmt/features/geometry/index.ts` (Hybrid Box compile/runtime split)
- `engine-gmt/features/camera_manager/index.ts` (DDFS stub — real state in cameraSlice)

### JSDOC additions

**File: `engine-gmt/features/index.ts`**
- 26-34 line comment block already captures the design rationale (carry-vs-import-by-identity). Top-of-file JSDoc could promote, but the existing inline comment serves as effective module doc. NO new JSDoc.
- On `registerFeatures` (:43): `@invariant Registration ORDER matters. LightSpheresFeature MUST register after LightingFeature (lighting declares the uniform arrays light_spheres consumes); LightSpheresFeature.dependsOn = ['lighting'] enforces it at the FeatureSystem level. Engine-core features (PostEffectsFeature, ColorGradingFeature, AudioFeature, ModulationFeature, WebcamFeature, DebugToolsFeature) are imported BY MODULE IDENTITY from engine/features/* — re-registration of the same ref short-circuits at FeatureSystem (existing === def). Carrying GMT copies historically produced 6 "Replacing definition" warnings AND broke uToneMapping declaration order during post-pass compile.`

**File: `engine-gmt/features/core_math.ts`**
- On `CoreMathFeature.inject` (~:152): `@invariant The cutting-plane preamble globals (cp_dmin/cp_scale/cp_trap) declared via builder.addPreamble(CP_PREAMBLE) at :110-120 MUST be kept in sync with engine/SDFShaderBuilder.ts's mirror — mesh-export coupling. addPreamble dedupes by exact string, so identical declarations from multiple call paths are safe; drift in the literal text breaks mesh export silently.`
- On `CoreMathFeature.inject` (~:152): `@invariant Modular special-casing: when formula === 'Modular' (:157-208), CoreMath adds the PIPELINE_REV define (forces recompile on graph structural edits), declares uModularParams[MAX_MODULAR_PARAMS], calls compileGraph(pipeline, graph.edges) to produce formula_Modular(), and installs a distOverride short-circuit hook so SDF Primitive nodes can break the iteration loop with distOverride < 999.0.`

**File: `engine-gmt/features/lighting/index.ts`**
- On `LightingFeature.inject` (~:101): `@invariant AreaLights toggle (uAreaLights) triggers a compile, NOT a runtime uniform — labeled "runtime" elsewhere but empirically the ANGLE/D3D11 optimizer predicates BOTH GetSoftShadow and GetHardShadow inside the runtime if (uAreaLights > 0.5) branch, defeating the toggle's intent (:288-431). This is the "ANGLE D3D11 optimizer" pattern (feedback_angle_d3d11_optimizer.md).`
- On `LightingFeature.inject` (~:101): `@invariant ptEnvNEE is a legacy migration shim — boot-time at :31-39: if ptReflMode is undefined AND ptEnvNEE === true, auto-promote to ptReflMode = 1.0 (Env MIS). Explicit ptReflMode writes win. Kept so old scenes load.`

**File: `engine-gmt/features/interlace/index.ts`**
- On `InterlaceFeature.inject` (~:117): `@invariant Refuses to engage if EITHER side of the interlace pair is Modular OR selfContainedSDE. Four refusal branches at :321-333. Engine guards via the SKIP_PRE_BAILOUT define from CoreMath; the rewriter would corrupt Modular's runtime-generated GLSL and a selfContainedSDE formula owns its full inner loop.`
- On `InterlaceFeature.inject` (~:117): `@invariant Mesh-variant interlace plumbing: MESH_GLSL_UNIFORMS only covers primary uniforms — interlace inject explicitly adds uInterlace* declarations via builder.addUniform() when variant === 'Mesh' (:336-345). engine/SDFShaderBuilder.ts must accept these or mesh export fails silently.`

**File: `engine-gmt/features/coloring/index.ts`**
- On the orbit-trap pre/post inject (~:377-389): `@invariant Geometric Orbit Trap pre/post inject is gated OFF SELF_CONTAINED_SDE. Self-contained formulas accumulate the trap in their own inner loop; mixing outer-loop samples would corrupt the min-accumulator.`

**File: `engine-gmt/features/camera_manager/index.ts`**
- On `CameraManagerFeature` (:7): `@invariant params: {} is intentional — Camera Manager state lives in engine-gmt/store/cameraSlice.ts, NOT in the DDFS feature slice. Adding params here without considering the duplication WILL create a shadow store. tabConfig.label 'Camera Manager' must match the panelId passed to installStateLibrary (see ADR-0057). Bespoke CameraManagerPanel is registered separately as 'panel-cameramanager' in engine-gmt/features/ui.tsx.`

**File: `engine-gmt/features/lighting/light_spheres.ts`**
- 9-22 line comment block already captures the rationale ("satellite of lighting", `dependsOn: ['lighting']`). NO new JSDoc.

### ADRs to write

- **ADR-0055 — engine-core feature sharing by module identity, not duplication**
  - **Context:** GMT layered on top of engine-core's feature system, which already ships six general-purpose features (`PostEffectsFeature`, `ColorGradingFeature`, `AudioFeature`, `ModulationFeature`, `WebcamFeature`, `DebugToolsFeature`). Earlier, GMT carried local copies of all six under `engine-gmt/features/{post_effects,color_grading,...}`. Those copies were diff-identical but caused two bugs: (a) `featureRegistry.register` warns "Replacing definition for X" six times at boot, polluting console; (b) the Map insertion order shifted because the GMT copies registered first, then engine-core's `registerFeatures()` re-registered the same names — silently swapping the Map order broke `uToneMapping` declaration order during post-pass compile.
  - **Decision:** Import the six engine-core features directly from `engine/features/*` into `engine-gmt/features/index.ts` (`engine-gmt/features/index.ts:35-40`). `featureRegistry.register` short-circuits on identical refs (`existing === def`), so engine-core's later registration is a no-op. State types are re-exported via `export type { … } from '../../engine/features/*'` (`engine-gmt/features/index.ts:85-109`) — `isolatedModules` enforces the type-only re-export keyword.
  - **Consequences:** A fork that needs to override one of the six must either re-implement the feature locally and accept the "Replacing definition" warning OR fork the entire feature catalogue (heavier). The current pattern keeps the count of "GMT-local feature definitions" honest (20, not 26) and lets engine-core upgrade the shared six without GMT changes. The 26-34 line comment block in `engine-gmt/features/index.ts` is the historical record and must be preserved verbatim.

- **ADR-0056 — DDFS panelConfig drives the compile/runtime UI split**
  - **Context:** Several features have a heavyweight compile-time toggle (e.g. "Volumetric scattering on/off" requires ~5500 ms of shader compile) and a lightweight runtime toggle (e.g. "show volumetrics this frame" is a uniform). The UI must distinguish them so the user understands which knobs require a recompile-pill confirmation; hand-coding each panel's structure duplicates per-feature.
  - **Decision:** Features expose `panelConfig: { compileParam, runtimeToggleParam, compileSettingsParams[], runtimeGroup, label, compileMessage, helpId }` (DDFS). `CompilableFeatureSection` (in engine-core's shared UI) reads `panelConfig` and renders the recompile pill, the settings group gated behind the compile toggle, and the runtime toggle. Three first-party consumers today: geometry's `hybridCompiled` + `hybridMode` (`engine-gmt/features/geometry/index.ts:201-210`), volumetric's `ptVolumetric` + `volEnabled` (`engine-gmt/features/volumetric/index.ts:39-45`), interlace's `interlaceCompiled` + `interlaceEnabled` (`engine-gmt/features/interlace/index.ts:132-139`).
  - **Consequences:** Sliders on compile-gated settings re-render at runtime when the compile pill is unconfirmed, but the SHADER doesn't pick them up until the pill confirms — confusing if the doc doesn't call it out. Boolean toggles labeled "runtime" that actually trigger compile (AreaLights — see core_math ADR rationale) bypass `panelConfig` entirely and live as compile-toggle params; the empirical reason (ANGLE/D3D11 optimizer predicating both branches) is recorded in `feedback_angle_d3d11_optimizer.md`.

### CLAUDE.md rows

- "When adding a new DDFS feature to `engine-gmt/features/`: (1) follow the registration-order contract — features with `dependsOn:` (e.g. LightSpheresFeature → 'lighting') MUST register after their dependency; (2) if the feature shares identity with engine-core, import the ref from `engine/features/*` rather than re-implementing (ADR-0055); (3) for compile-toggle + runtime-toggle pairs, expose `panelConfig` and let `CompilableFeatureSection` render the UI (ADR-0056); (4) `selfContainedSDE` formulas bypass outer-loop features — gate pre/post injects off `SELF_CONTAINED_SDE` to avoid corrupting their inner coord system."
- "When touching `engine-gmt/features/core_math.ts`: the cutting-plane preamble globals (`cp_dmin/cp_scale/cp_trap`) at :110-120 MUST mirror `engine/SDFShaderBuilder.ts` exactly — `builder.addPreamble` dedupes by string, so drift breaks mesh export silently. Interlace + Modular are mutually exclusive; refusal branches live in `engine-gmt/features/interlace/index.ts:321-333`."

### Notes / DROPPED content

- Full per-feature catalog (23 feature areas) — module doc material; reading 23 files of JSDoc would be noise.
- engineStore typing concerns (`as any` casts in ui.tsx) — survey followup, not invariant.
- Orphan-sweep candidates (deferred UI ports) — verification work.
- `'lfo-list'` double-registration redundancy — captured in module doc; not invariant material.
- Per-feature inject patterns (`addPostDEFunction`, `addIntegrator`, etc.) — already covered by shader-builder doc.

---

## docs/modules/engine-gmt/camera-manager.md

### Source files
- `engine-gmt/store/cameraSlice.ts` (310 lines; header at :1-22 is canonical design rationale, preserve)
- `engine-gmt/features/camera_manager/CameraManagerPanel.tsx`
- `engine-gmt/features/camera_manager/logic.ts`
- `engine-gmt/features/camera_manager/index.ts` (16-line DDFS stub)

### JSDOC additions

**File: `engine-gmt/store/cameraSlice.ts`**
- Header at :1-22 is comprehensive; NO new top-of-file JSDoc.
- On `installGmtCameraSlice` (:198): `@invariant Load-order critical. Must run BEFORE any component reads s.savedCameras.length. CameraManagerPanel reads s.savedCameras directly (engine-gmt/features/camera_manager/CameraManagerPanel.tsx:39) and would crash on undefined.length otherwise. app-gmt/main.tsx:107 satisfies this by calling installGmtCameraSlice() immediately after registerGmtUi(); there is NO runtime guard.`
- On `installGmtCameraSlice` (:198): `@invariant Opts out of auto-generated topbar menu via menu: null (:280). engine-gmt/topbar.tsx:271-348 wires the Camera menu by hand (Undo Move, Redo Move, Reset Position, View Manager, Camera Slots 1-9). Slot 1-9 click handlers route to savedCameras[slotIndex] + selectCamera / saveToSlot — the same library actions the Mod+1..9 / 1..9 slot shortcuts hit, so menu clicks and hotkeys agree by construction.`
- On `installGmtCameraSlice` (:198): `@invariant Wraps engine-core history-slice's undoCamera / redoCamera (:296-308) so each call also fires CAMERA_TELEPORT to warp the R3F camera to the restored pose synchronously after the diff applies. Engine-core's history slice is synchronous.`
- On `applyCameraState` (~:77): `@invariant Emits CAMERA_TRANSITION first, then setStates the three camera fields, then probes for setOptics, then engine.resetAccumulation(). Order matters — event listeners may pre-warm shaders before the store flip.`
- On `isCameraModified` (:93): `@invariant Tolerances: position L1 ≤ 0.0001 (sums high+low parts; :105), rotation quaternion L1 ≤ 0.001 (:108-111), optics camType ±0.1, orthoScale ±0.01, camFov ±0.1 (:114-116). Exported so the panel can re-render the dirty marker on every live-camera change.`

**File: `engine-gmt/features/camera_manager/CameraManagerPanel.tsx`**
- On `CameraManagerPanel` (:38): `@invariant Subscribes to s.sceneOffset + s.cameraRot purely as a render trigger (:55-56); isCameraModified reads live values from the store at call time. Dropping those subscriptions would freeze the dirty marker on the active row. Every store action is read via (s as any).addCamera etc. (:41-47) — renaming an action in installStateLibrary config without grepping for the string name breaks the panel at runtime with no type-check warning.`
- On `CameraManagerPanel` (:38): `@invariant RESET preset button is a SUPERSET of the library's resetCamera action — additionally sets camType:0, camFov:60, orthoScale:2 on optics (:68-71). The library's onReset callback only walks the active formula's defaultPreset.`

**File: `engine-gmt/features/camera_manager/logic.ts`**
- On `getDirectionName` (:8): `@invariant Threshold 0.98 on dot(forward, ±cardinal-axis) — used by suggestCameraLabel in cameraSlice.ts:129 to auto-suggest "Front View" / "Top View" etc. when the camera is within ~11° of a cardinal axis.`

### ADRs to write

- **ADR-0057 — Camera Manager as a consumer of engine-core's installStateLibrary factory**
  - **Context:** GMT needed saved-cameras (capture / apply / list / select / slot-shortcuts / undo-redo) with split-precision `sceneOffset` + rotation quaternion + `targetDistance` + `OpticsState` payload. Other engine-core panels (e.g. Material library) had the same need with different payloads. Implementing each as a bespoke slice duplicated the array + active-id + bookkeeping logic.
  - **Decision:** Engine-core ships an `installStateLibrary<T>` factory (covered by e09-camera-plugin) that owns the `savedX` array, `activeXId`, and the eight bookkeeping actions (`addX` / `updateX` / `deleteX` / `duplicateX` / `selectX` / `reorderX` / `saveToSlot` / `resetX`). GMT calls `installStateLibrary<SavedCameraPayload>` with six lifecycle callbacks (`capture`, `apply`, `isModified`, `suggestLabel`, `captureThumbnail`, `onReset`) and the GMT-specific shape of those callbacks lives in `engine-gmt/store/cameraSlice.ts`.
  - **Consequences:** `CameraManagerFeature` (DDFS) is intentionally a tab-only stub with `params: {}` — duplicating fields in the DDFS feature slice would create a shadow store. `CameraManagerPanel` is a shell around the generic `<StateLibraryPanel>` primitive. Engine-core's history slice provides `undoCamera` / `redoCamera`; the GMT wrapper re-fires `CAMERA_TELEPORT` after each call. The `as any` action lookups in the panel are the cost of the string-keyed action surface — typing them would require generic propagation through `installStateLibrary`'s eight-action surface.

- **ADR-0058 — Topbar Camera menu wired by hand (`menu: null` opts out of auto-generated menu)**
  - **Context:** Engine-core's `installStateLibrary` factory can auto-generate a topbar menu listing slots 1-9 plus add/delete/select. GMT wants a richer Camera menu structure: undo/redo move pair at the top, reset position, View Manager (the panel), then Slots 1-9. The auto-generated menu's flat list doesn't capture this organisation, and the topbar's Camera menu predates the factory.
  - **Decision:** `installStateLibrary` call sets `menu: null` (`engine-gmt/store/cameraSlice.ts:280`). The Camera menu is hand-wired in `engine-gmt/topbar.tsx:271-348` and routes Slot 1-9 click handlers to the SAME `savedCameras[slotIndex]` + `selectCamera` / `saveToSlot` actions the `Mod+1..9` / `1..9` slot shortcuts hit.
  - **Consequences:** Menu clicks and hotkeys agree by construction. Future menu reorganisation (move "Reset Position" elsewhere, etc.) is a topbar edit, not a factory config change. Other library consumers (e.g. Material library) that want the auto-generated menu set `menu: { … }` instead of `null`. The "View Manager" label reads the notify-dot via `dotFieldKey('savedCameras')`; the floating-pill toast is `<StateLibraryToast arrayKey="savedCameras" />` in `engine-gmt/topbar.tsx:268`.

### CLAUDE.md rows

- "When touching `engine-gmt/store/cameraSlice.ts`: load-order is load-bearing. `installGmtCameraSlice()` must run BEFORE any component reads `s.savedCameras` — `app-gmt/main.tsx:107` calls it right after `registerGmtUi()`, with no runtime guard. The factory's `menu: null` opt-out is wired by hand in `engine-gmt/topbar.tsx:271-348`; menu Slot 1-9 click handlers MUST route to the same actions as `Mod+1..9` hotkeys (ADR-0058). `CameraManagerFeature` (DDFS) is a tab-only stub with `params: {}` — adding params here creates a shadow store (ADR-0057)."

### Notes / DROPPED content

- DirectionalViewResult shape table — restates code.
- Capture/apply payload field-by-field — already in the existing JSDoc on each accessor.
- Incidental couplings (notify-dot, save-toast widget) — module doc material.

---

## docs/modules/engine-gmt/formula-workshop.md

### Source files (focus on V3/V4 pipeline decision + importSource lifecycle)
- `engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx` (1434 lines; top-of-file already documents split-screen + Preview lifecycle)
- `engine-gmt/features/fragmentarium_import/index.ts` (barrel — V3 re-exports + Workshop)
- `engine-gmt/features/fragmentarium_import/v3/compat.ts` (V3 ↔ V2 adapter — header at :1-9 documents temporariness)
- `engine-gmt/features/fragmentarium_import/v4/index.ts` (processFormula single-shot entry — header at :1-17 strong)
- `engine-gmt/features/fragmentarium_import/formula-library.ts` (manifest + V3/V4 bakeoff)
- `engine-gmt/types/fractal.ts` (importSource shape at :103-118)

### JSDOC additions

**File: `engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx`**
- Top-of-file at :1-10 already strong. NO new top block.
- On `FormulaWorkshop` (:408): `@invariant Preview ID 'frag_workshop_preview' (PREVIEW_ID at :28) is reserved. Every Preview registers it (replacing the prior registration, not orphaning); on close the Workshop restores previousFormulaRef (:886-891). The Workshop calls setFormula(PREVIEW_ID) (:868,878) so the viewport re-compiles the imported formula on every Preview, restored to the pre-Workshop selection on close.`
- On `FormulaWorkshop` (:408): `@invariant Pipeline selector is 'auto' | 'v3' | 'v4' (:437). Effective pipeline is resolved via getRecommendedPipeline (catalog auto-pick), defaulting to 'v4' when the formula ID is unknown (custom paste) at :461-470. The dice predicate filters out catalog entries with recommended === 'none' unless the user opts into "show broken".`
- On `FormulaWorkshop` (:408): `@invariant Re-edit lifecycle: when editFormula prop is set, the Workshop reads registry.get(id)?.importSource and rehydrates state from glsl, selectedFunction, loopMode, mappings (:542-555). V3-imported formulas stamp importSource (:835, :943-948); V4-imported formulas OMIT it — re-editing a V4 formula is not currently supported because V4 has no per-param mapping UI (:898-910). See ADR-0059 — importSource is the V3 round-trip contract.`
- On `FormulaWorkshop` (:408): `@invariant Slot uniqueness enforced at Import (V3 only). Per-component overlap checks run via getSlotOccupancy against valOccupancy before transform (:912-933). V4 skips this entirely — slot assignment is internal to processFormula. Formula names are sanitised to valid GLSL identifiers via rawName.replace(/[^a-zA-Z0-9_]/g, '') (v3/compat.ts:125) — the formula name doubles as the emitted function name.`

**File: `engine-gmt/features/fragmentarium_import/v3/compat.ts`**
- Header at :1-9 already documents the temporary-adapter status. NO new JSDoc.
- On `detectFormulaV3` (:44): `@invariant Runs DEC preprocessing first (:50-54) then analyzeSource → V2-shaped WorkshopDetection so the existing Workshop UI fields (slot mapping table, function picker, loop-mode toggle) stay unchanged.`

**File: `engine-gmt/features/fragmentarium_import/v4/index.ts`**
- Header at :1-17 is strong. NO new JSDoc.
- On `processFormula` (:39): `@invariant Five-stage pipeline (ingest → preprocess → analyze → emit). Emits FractalDefinition with selfContainedSDE: true (:144-151 in v4/types.ts) — V4 formulas are mutually exclusive with engine features that require per-iteration access (interlace, hybrid fold). Unsupported render models (2D, progressive, brute-force-no-DE) short-circuit with a structured Rejection at the ingest stage.`

**File: `engine-gmt/features/fragmentarium_import/formula-library.ts`**
- On `getRecommendedPipeline` (:255): `@invariant Defaults to 'v4' when the catalog is missing or unknown — matches the existing Workshop default. The 'v3-v4-catalog.json' file is generated by npm run catalog:build from honest harness snapshots (debug/v3-honest-snapshot.jsonl, debug/v4-honest-snapshot.jsonl). See ADR-0059.`
- On `loadLibrary` (~:82): `@invariant Idempotent — caches the promise. isLibraryLoaded() is the synchronous check at :135. Fetches ./formulas/manifest.json, ./formulas/dec.json, and best-effort ./formulas/v3-v4-catalog.json; the catalog-fetch failure path defaults all recommendations to 'v4'.`

**File: `engine-gmt/types/fractal.ts`**
- `importSource` JSDoc proposed in formula-registry section above (same field, single JSDoc location).

### ADRs to write

- **ADR-0059 — V3/V4 dual-pipeline with catalog auto-pick + V3 as compat shim**
  - **Context:** Fragmentarium / Shadertoy formulas need a robust importer. V3 was the original pipeline — per-iteration extraction that composes with engine features (interlace, hybrid fold, burning-ship rewrites). V3's analyzer/generator was rewritten with cleaner types, but the Workshop UI (slot mapping table, function picker, loop-mode toggle) was hand-tuned against the V2 types. Rewriting both at once risked a multi-week regression. V4 was designed afterward as a self-contained-SDE emitter — simpler shape, no engine-feature composition. Each pipeline passes a different subset of the formula library; per-formula auto-pick is the only honest UX.
  - **Decision:** Keep both pipelines in the codebase. **V3** uses a compat adapter at `engine-gmt/features/fragmentarium_import/v3/compat.ts` that translates V3's clean types into V2-shaped `WorkshopDetection` / `TransformedFormulaV2` so the Workshop UI stays unchanged ("Temporary — will be removed when the Workshop reads V3 types directly" at `engine-gmt/features/fragmentarium_import/v3/compat.ts:8`). **V4** uses a single-shot `processFormula(source, filename, id?, name?)` entry that returns a complete `FractalDefinition` with `selfContainedSDE: true`. Per-formula recommendation is read from `./formulas/v3-v4-catalog.json` (generated by `npm run catalog:build` from honest harness snapshots). Workshop selector is `'auto' | 'v3' | 'v4'`; auto resolves via `getRecommendedPipeline` defaulting to `'v4'` for unknown IDs (custom paste).
  - **Consequences:** The V3 compat layer is technical debt with a clear retirement condition (rewrite the Workshop UI against V3 types directly). V4-imported formulas can't compose with interlace / hybrid fold because they're self-contained — the catalog routes those formulas to V3. The catalog must be regenerated after adding formulas to the library or changing pipeline behaviour (`npm run catalog:build`). V4 plan paused 2026-04-17 per `docs/gmt/26_Formula_Workshop_V4_Plan.md:3-12`; V3 remains the practical default for formulas that need engine-feature composition.

- **ADR-0060 — importSource as the V3 re-edit round-trip contract; V4 omits it**
  - **Context:** Workshop users iterate on imports (adjust slot mappings, edit GLSL, re-promote variables). Without a re-edit path, every adjustment is a paste-from-scratch. The data needed to re-open the Workshop on an existing formula is: the original source GLSL, the user-picked DE function, the loop mode, the slot mappings.
  - **Decision:** V3 imports stamp `importSource = { glsl, selectedFunction, loopMode, mappings }` onto the registered `FractalDefinition` (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:943-948`). When the Workshop is opened with an `editFormula` prop, it reads `registry.get(id)?.importSource` and rehydrates state. The block is serialised by GMF's `<Metadata>` block (round-trips through save/load). V4 OMITS `importSource` because the V4 path has no per-param mapping UI to round-trip into — re-editing a V4 formula is currently a paste-from-scratch.
  - **Consequences:** `engine-gmt/types/fractal.ts:103-118` defines `importSource?` as optional. Built-in formulas leave it undefined; only V3-imported formulas have it. The asymmetry between V3 (re-editable) and V4 (not) is a known UX wart but acceptable given V4's simpler internal model. A future "V4 re-edit" would need either (a) a per-param mapping UI added to V4 or (b) V4 to stamp its own `importSource` shape — both blocked on the V4 plan resuming.

### CLAUDE.md rows

- "When touching the Workshop importer (`engine-gmt/features/fragmentarium_import/`): V3 is the per-iteration pipeline (composes with interlace + hybrid fold) and uses a V2-shaped compat adapter at `v3/compat.ts` — marked temporary, retire when Workshop UI reads V3 types directly. V4 emits `selfContainedSDE: true` formulas (no engine-feature composition). Per-formula pipeline is auto-picked from `./formulas/v3-v4-catalog.json` (run `npm run catalog:build` after touching either pipeline or adding library formulas). `importSource` lifecycle is V3-only — V4 imports can't be re-opened in the Workshop (ADR-0060)."
- "When changing `FractalDefinition.importSource` or the V3 compat layer: importSource round-trips through GMF (`<Metadata>` block); GMF parser at `engine-gmt/utils/FormulaFormat.ts` doesn't special-case it (just JSON.stringify/parse), but the V3 path at `FormulaWorkshop.tsx:835, :943-948` is the sole writer. Renaming `selectedFunction` / `loopMode` / `mappings` keys breaks re-edit silently — there is no schema check."

### Notes / DROPPED content

- Full File catalog (47 files broken into Workshop UI + V3 + V4 + shared) — module doc material; per-file JSDoc would be noise.
- DEC preprocessor specifics (`dec-preprocessor.ts:750`, `dec-detector.ts:190`) — internal to importer.
- Workshop param-builder slot taxonomy details — module doc reference.
- Variable detector (`detectVariables`, `promoteVariable`) — feature surface, not invariant.
- per-iteration.ts size (1049 lines) — observation, not invariant.

---

## Summary of ADR allocations (0046-0058 used, plus 0059-0060 spillover)

| ADR | Title | Scope |
|---|---|---|
| 0046 | Unified-coordinate camera with treadmill absorb + absorbGenRef race guard | navigation |
| 0047 | Custom cursor-anchored gestures replace drei rotate/dolly when orbitCursorAnchor is on | navigation |
| 0048 | Camera-lock and ignoreCamera are duals, not duplicates | navigation |
| 0049 | FormulaType is a literal union; registry is the truth (drift contract) | formula-registry |
| 0050 | Two independent registries (FractalRegistry, NodeRegistry) | formula-registry |
| 0051 | Compile/runtime slot-order parity via shared DCE walk | modular-graph |
| 0052 | Two synthetic roots; DCE walks backward (DFS) | modular-graph |
| 0053 | GMF as two-tier HTML-style container (v1/v2) | save-load-gmf |
| 0054 | saveGMFScene silently downgrades; loadGMFScene does NOT register | save-load-gmf |
| 0055 | Engine-core feature sharing by module identity | features |
| 0056 | DDFS panelConfig drives compile/runtime UI split | features |
| 0057 | Camera Manager as consumer of installStateLibrary factory | camera-manager |
| 0058 | Topbar Camera menu wired by hand (menu: null) | camera-manager |
| 0059 | V3/V4 dual-pipeline with catalog auto-pick | formula-workshop |
| 0060 | importSource as V3 re-edit contract; V4 omits | formula-workshop |

Notes on the 13-slot budget: the assigned range was 0046-0058 (13 slots). This batch identifies **15** ADR candidates across 7 heavyweight docs. To stay within the assigned slot count I would compress as follows — but I am surfacing the over-count rather than dropping silently. Suggested fold: 0048 (camera-lock dual) could become a section in the navigation ADR rather than standalone (it's an interaction-with-other-subsystems clarification more than a decision). 0060 (importSource omission) is arguably a corollary of 0059 (dual pipeline) and could fold into 0059's Consequences. With those two folds → 13 ADRs in 0046-0058, exactly the assigned range.

**Decision:** I will write ADRs 0046-0058 as listed above, FOLDING 0048 into ADR-0046's Consequences (camera-lock vs ignoreCamera as a documented dual) and FOLDING 0060 into ADR-0059's Consequences (importSource lifecycle as part of the V3/V4 split). Net: 13 ADRs in slots 0046-0058. Final mapping after fold:

| Slot | Title | Folds in |
|---|---|---|
| 0046 | Unified-coordinate camera with treadmill absorb + absorbGenRef race guard | + camera-lock vs ignoreCamera dual (was 0048) |
| 0047 | Custom cursor-anchored gestures replace drei rotate/dolly when orbitCursorAnchor is on | |
| 0048 | FormulaType is a literal union; registry is the truth | (was 0049) |
| 0049 | Two independent registries (FractalRegistry, NodeRegistry) | (was 0050) |
| 0050 | Compile/runtime slot-order parity via shared DCE walk | (was 0051) |
| 0051 | Two synthetic roots; DCE walks backward (DFS) | (was 0052) |
| 0052 | GMF as two-tier HTML-style container (v1/v2) | (was 0053) |
| 0053 | saveGMFScene silently downgrades; loadGMFScene does NOT register | (was 0054) |
| 0054 | Engine-core feature sharing by module identity | (was 0055) |
| 0055 | DDFS panelConfig drives compile/runtime UI split | (was 0056) |
| 0056 | Camera Manager as consumer of installStateLibrary factory | (was 0057) |
| 0057 | Topbar Camera menu wired by hand (menu: null) | (was 0058) |
| 0058 | V3/V4 dual-pipeline with catalog auto-pick + importSource as V3 round-trip contract | + importSource lifecycle (was 0060) |

Cross-references in JSDoc will use the final slot numbers (0046-0058).
