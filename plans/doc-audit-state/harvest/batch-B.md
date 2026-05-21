# Harvest: batch-B

Five engine module docs decomposed into JSDoc additions, ADRs, CLAUDE.md rows, and DROPs.
Source files at h:/GMT/workspace-gmt/dev/. Many invariants are already documented inline
(comments at the cited lines); those are noted "(already in source)" and not re-proposed.

---

## docs/modules/engine/animation.md

### Source files
- engine/AnimationEngine.ts
- engine/BezierMath.ts
- engine/animation/AnimationSystem.tsx
- engine/animation/binderRegistry.ts
- engine/animation/trackBinding.ts
- engine/animation/cameraKeyRegistry.ts
- engine/animation/cameraPairRegistry.ts
- engine/animation/logTrackRegistry.ts
- engine/animation/renderPopupRegistry.ts
- engine/animation/modulationTick.ts
- engine/animation/audioClipSync.ts
- engine/animation/audioExportMix.ts
- engine/animation/audioFileCache.ts

### JSDOC additions

**File: engine/AnimationEngine.ts**
- top-of-file `@module engine/AnimationEngine`: `@invariant tick()/scrub() are silent no-ops until connect(animStore, fractalStore) has been called — apps that skip bindStoreToEngine() see no playback rather than a crash.` (cite: engine/AnimationEngine.ts:50, :225, :280 — source has `connect()` JSDoc but not the silent-noop invariant.)
- on `getBinder` (engine/AnimationEngine.ts:74): `@invariant binderRegistry.lookup wins over this.binders per-id cache; checked first so a binder registered AFTER a DDFS-derived lookup still takes effect.` (already in source at :75-81 as inline comment; promote to JSDoc on the method for hover-discoverability).
- on `scrub` (engine/AnimationEngine.ts:280): `@invariant Non-float tracks (track.type !== 'float') are silently dropped — bool/enum/string/image tracks get no step/interpolation behaviour from the engine.` (cite :305; not in source today.)
- on `scrub` (engine/AnimationEngine.ts:280): `@invariant ignoreCamera = isPlaying && isRecording && recordCamera skips ALL camera.* tracks in record-camera mode; camera.position and camera.offset are also hardcoded-skipped unconditionally (legacy carve-out).` (cite :291, :307-309; partially in source as inline comment.)
- on `interpolate` (engine/AnimationEngine.ts:328): `@invariant Bezier is NOT applied on log tracks. Tangent y-values live in absolute value-space; reinterpreting under log would silently change the curve shape. Log tracks evaluate as linear-in-log regardless of stored interpolation type.` (cite engine/animation/logTrackRegistry.ts:22-26 — already documented there but not on the consumer.)

**File: engine/animation/cameraPairRegistry.ts**
- on `evaluatePairedTrack` (:331): `@invariant Even with no panLow registered (lo=0) routing through evaluateDDPairAxis is what guarantees hi/lo coherence at deep zoom — the DD lerp is unconditional.` (cite :338-350; not in source.)
- on the `ddCache` declaration: `@invariant Per-frame cache is invalidated by BOTH frame equality AND sequence reference equality — Zustand swaps the sequence ref on every keyframe write, giving free invalidation.` (cite :224-244, :240-244.)

**File: engine/animation/AnimationSystem.tsx**
- on `tick` (:83): `@invariant Cleanup pass blocks the early-return: while activeTargetsRef.current.size > 0 the tick still runs one pass to clear the previous frame's stale uniforms and emit baselines.` (cite :122-135; not in source.)
- on `tick` (:83): `@invariant Uniforms flow via FractalEvents.emit(FRACTAL_EVENTS.UNIFORM, …) NOT engine.setUniform — engine-core's WorkerProxy is a stub; only hosts with a real bridge receive them.` (cite :30-39; inline comment exists but worth elevating.)

**File: engine/animation/audioExportMix.ts**
- on `mixAudioClipsForExport` (:15): `@invariant The export window uses INCLUSIVE end ((endFrame+1)/fps) — without the +1 the audio mix is one frame short (~40ms at 25fps).` (cite :27-31; not in source.)

**File: engine/animation/audioFileCache.ts**
- top-of-file: `@invariant Map is typed 0 | 1 only — three or more decks would require the registry to be refactored.` (cite :6.)

### ADRs to write

- **00NN-animation-camera-pair-linear-in-zoom** — Context: pan whips at deep zoom because world-units-per-frame stays constant while the visible world shrinks exponentially. Decision: pan tweens as a closed-form linear-in-zoom: `pan = c0 + (c1 - c0) * (zT - z0) / (z1 - z0)`, evaluated through `evaluateDDPairAxis` with DD-precision two-sum + Veltkamp-split two-product so hi/lo channels stay coherent past zoom 1e-30. Consequences: constant-screen-space velocity matches what the eye expects; below ~1e-15 lerping (hi, lo) independently would leave ULP-level shake which DD-lerping eliminates. Routing is unconditional even when no `panLow` track exists. (Source rationale preserved in legacy doc, currently only in the module-doc historical-context block.)
- **00NN-animation-log-value-space** — Context: linear lerp on `julia.zoom` 1→1e-30 collapses 99.999% of the timeline to one extreme. Decision: tracks registered via `logTrackRegistry` lerp in `log(v)` and `exp` back. Consequences: constant rate-of-change in scale matches perception; tangent y-values live in absolute value-space so Bezier is NOT supported on log tracks (linear-in-log only, regardless of stored interpolation type).
- **00NN-animation-deterministic-playback** — Context: live preview must match exported frames frame-for-frame so artists trust the WYSIWYG loop. Decision: deterministic mode accumulates wall time and emits integer frames at exactly 1/fps; backlog >0.25s (tab return / debugger pause) is discarded to prevent lurch; LFO `oscTime` is computed from `currentFrame/fps`. Consequences: dt-driven playback at any fps remains the default; deterministic adds a parallel path used during recording / export.

### CLAUDE.md rows
- "When touching animation binders: check the 6-case resolution order in `AnimationEngine.getBinder` (registry → per-id cache → legacy `lights.` remap → DDFS vec/scalar → root setter). The UNDERSCORE vec form (`power_x`) is checked BEFORE the DOT form (`power.x`)."
- "When changing recording lifecycle: `recordingSnapshot` doubles as scrub source AND cleanBase source. Stop-recording must force-flush `recordBuffer` BEFORE clearing `overriddenTracks`, otherwise final keyframes are lost."

### Notes
- Most "invariants" in the module doc are already inline comments at the cited lines — `Mod+Z` style replacement-on-reregister, `bezier-on-log` rationale, etc. Proposed JSDoc additions are selected for the ones that ARE NOT yet on the method docblock (high hover-discovery value).
- The binder-resolution table in the doc is reference material, not invariant — best left in the module doc, not duplicated into JSDoc.
- The `installModulation` idempotency and the `window.__animTickCount` dev getter are implementation details; DROP.

### DROPPED content
- The Public API tables (signatures + line numbers) — pure restated code; reading the file is faster than reading the doc.
- The "binder resolution order" 6-case table — reference material; keep in module doc, not promoted into JSDoc.
- The historical context block from the legacy `docs/engine/08_Animation.md` — already linked; not re-derived.
- `installModulation()` / `uninstallModulation()` lifecycle prose — single sentence in source comment suffices.

---

## docs/modules/engine/render-pipeline.md

### Source files
- engine/RenderPipeline.ts
- engine/BloomPass.ts
- engine/AccumulationController.ts

### JSDOC additions

**File: engine/RenderPipeline.ts**
- on `class RenderPipeline` (:38): `@invariant writeIndex semantics are inverted — the field points to the NEXT target to write, so "previous frame" is the target OPPOSITE writeIndex. getPrevious* helpers and getOutputTexture() invert this; new callers must NOT assume writeIndex == the just-written slot.` (cite :114-134, :362-367 — partially in source comments; promote to class JSDoc.)
- on `mrtTargetA` / `mrtTargetB` (:41-42): `@deprecated-name "MRT" naming is historical — these are single-attachment color-only targets. The header comment "texture[0] = Color, texture[1] = Depth" (line 39) describes an older architecture that no longer exists.` (cite :232; existing in source at :232 but not at the field decl.)
- on `getCompileTarget` (:143): `@invariant The compile target MUST mirror MRT float type. If live target is HalfFloat and compile target is Float, Three.js program param hashes diverge and async compile defeats its purpose. Lazy-created after mrtTargetA exists — do not call before initTargets().` (cite :145-153.)
- on `render` (:524): `@invariant Bucket scissor must be set AFTER setRenderTarget. three.js setRenderTarget overwrites GL scissor with the target's stored values; any refactor that hoists setScissor will silently break bucket rendering.` (cite :562-578; already in source at :562-564.)
- on `render` (:524): `@invariant render() is a no-op when isHolding=true OR sampleCap is reached. clearTargets / resetAccumulation / resize still function — the gate is only on the draw call.` (cite :526-530.)
- on `_convergenceNeeded` (:86): already documented in source at :79-86; no JSDoc addition needed.

**File: engine/BloomPass.ts**
- header (:1): `@stale Header comment says "5 mip levels" but MIP_COUNT = 7 since the radius/spread refactor. Fix when next touching this file.` (cite :6, :16 — known drift.)
- on `dispose` (:339): `@invariant Does NOT dispose the shared fullscreen geometry — the comment at engine/BloomPass.ts:348 records the rule. Future code that reaches into this.mesh.geometry and disposes it will break every other consumer of the shared fullscreen pass.` (cite :348; already in source at :348 but worth promoting.)

**File: engine/AccumulationController.ts**
- Already well-documented at :1-42 (every member has the right JSDoc, including `setPreviewSampleCap`'s historic-name note). No additions proposed.

### ADRs to write

- **00NN-render-pipeline-async-convergence** — Context: synchronous `glReadPixels` on convergence stalls the GPU and the per-8-sample measurement loop visibly hitches. Decision: WebGL2 `fenceSync` + `gl.flush()` + non-blocking `clientWaitSync(timeout=0)`. Sync fallback exists for environments without `fenceSync`. Consequences: convergence readback is cheap when GPU is idle; fallback path is the very stall the async API exists to avoid (deployment targets without `fenceSync` silently degrade).
- **00NN-render-pipeline-convergence-gating** — Context: convergence measurement (1 render + 2 setRenderTarget swaps + sync readPixels every 8 samples) is pure waste when no UI consumer is mounted. Decision: gate behind `_convergenceNeeded` (default false), toggled by `SET_CONVERGENCE_NEEDED` worker message. Only consumer today is engine-gmt's `RegionOverlay`. Consequences: forgetting to call `setConvergenceNeeded(true)` from a new consumer = stale 1.0 reading forever; forgetting to clear it = wasted work.

### CLAUDE.md rows
- "When changing RenderPipeline: `writeIndex` points to NEXT write slot, not the just-written one — getPrevious* helpers invert. 'MRT' naming is historical; targets are color-only single-attachment."

### Notes
- The "MRT" naming drift and the BloomPass "5 mip levels" stale comment are both known-issues already flagged in the doc; a focused source pass (rename + comment fix) would close them without needing further docs.
- The bucket-scissor "set after setRenderTarget" rule already has a load-bearing inline comment at engine/RenderPipeline.ts:562-564 — good current state, no change needed.

### DROPPED content
- Public API table for `RenderPipeline` — pure restated code.
- The 7-mip bloom pipeline description (downsample → upsample → blend) — covered by source comments; DROP.
- The `halfToFloat` subnormal-branch / `Math.clz32` browser-runtime note — implementation detail with no decision to capture.
- The `_compileTarget` rationale block — already self-documenting at the field comment (engine/RenderPipeline.ts:136-140).

---

## docs/modules/engine/shader-builder.md

### Source files
- engine/ShaderBuilder.ts
- engine/ShaderFactory.ts
- engine/ShaderConfig.ts
- engine/UniformSchema.ts
- engine/UniformNames.ts

### JSDOC additions

**File: engine/ShaderBuilder.ts**
- class-level docblock already covers the five-generic-primitives design (engine/ShaderBuilder.ts:1-20). No addition needed.
- on `addSection` (:67): `@invariant Multi-valued; does NOT dedup. Repeat addSection(name, code) with identical strings accumulates duplicates (unlike addHeader/addPreamble/addFunction which dedup on exact-duplicate string).` (cite :67-70 vs :44-54; not in source.)
- on `buildFragment` (:111): existing JSDoc at :105-110 declares it a stub — sufficient.
- on `buildUniformsBlock` (:93): `@invariant Honors UniformDefinition.arraySize only — precision and comment fields are silently dropped. (See engine/UniformSchema.ts for the consumer that DOES enforce backingOnly.)` (cite :93-101.)

**File: engine/ShaderConfig.ts**
- on `interface ShaderConfig` (:11): `@invariant [key: string]: any index signature defeats typo detection — config.fromula does NOT error. Apps that widen via declaration merging restore typo safety on their own well-typed fields.` (cite :27; not in source.)
- on `renderMode?` field (:20): existing comment is fine; no change.

**File: engine/UniformSchema.ts**
- top-of-file: `@invariant Importing this module triggers registerFeatures() at top level — even a types-only import. The merge filters feature-vs-base name collisions SILENTLY (no warning); feature-vs-feature collisions go last-feature-wins via UNIFORM_DEFAULTS reduce.` (cite :5-8, :80-81, :85-88; partially in source as `:7` comment.)
- on `UniformDefinition.backingOnly` (:19-21): `@enforcement shaders/chunks/uniforms.ts (and its engine-gmt mirror) is the SOLE enforcement site — skips GLSL declaration emit when true. ShaderBuilder.buildUniformsBlock and createUniforms ignore this flag.` (cite shaders/chunks/uniforms.ts:8.)

### ADRs to write

- **00NN-shaderbuilder-section-escape-hatch** — Context: a generic engine cannot enumerate every pipeline-specific section name (postMapCode, materialLogic, hybridFold, etc.) without becoming opinionated. Decision: five generic primitives (defines, uniforms, headers, preambles, functions) cover GLSL essentials; a multi-valued `sections: Map<string, string[]>` is a free-form escape hatch where the ENGINE never interprets the names. Plugin assemblers own the canonical name list. Consequences: engine-gmt's live raymarching builder bypasses the generic section API entirely (typed methods) — the section API survives for plugin authors. `renderMode` likewise stays opaque to the engine.
- **00NN-uniformschema-base-vs-feature** — Context: every feature wants to push uniforms; some uniforms (Time, Resolution, scene-offset, region rectangles) belong to the engine regardless. Decision: BASE_SCHEMA covers true engine core PLUS tool/export slots that no-op at defaults PLUS CPU-derived caches of feature-owned source uniforms (EnvRotationMatrix from materials' uEnvRotation; FogColorLinear from atmosphere's uFogColor) hoisted so multiple consumers can read with safe defaults. Feature uniforms are merged via `featureRegistry.getUniformDefinitions()` with feature-vs-base collisions silently dropped. Consequences: review-only collision discipline (convention: features use themed prefixes like `uPT…`, `uLight…`); no runtime guard.

### CLAUDE.md rows
- "When adding a feature uniform: pick a themed prefix (`uPT…`, `uLight…`, `uModular…`) — name collisions vs BASE_SCHEMA are silently dropped, feature-vs-feature is last-wins. No dev-mode warning exists today."
- "When changing ShaderBuilder section names: the engine never interprets them — engine-gmt's live builder bypasses the generic addSection/getSections API entirely (typed methods instead). Section name strings in ShaderBuilder JSDoc are illustrative only."

### Notes
- `UniformDefinition.precision` and `.comment` are documented vestigial — drop or convert to plain `//` comments in a future cleanup commit; not an ADR.
- `BASE_SCHEMA` "Pure Core" comment is stale per the doc — fix in same cleanup pass.

### DROPPED content
- Public API table for ShaderBuilder / ShaderFactory / UniformSchema — pure restated code.
- Detailed `createUniforms` deep-clone walker description — implementation detail.
- The full BASE_SCHEMA inventory — current source is the truth.
- ShaderFactory dispatch description — single-method class, fully covered by the existing top-of-file JSDoc.

---

## docs/modules/engine/plugins-host.md

### Source files
- engine/plugins/TopBar.tsx
- engine/plugins/Hud.tsx
- engine/plugins/Menu.tsx
- engine/plugins/Help.tsx
- engine/plugins/SceneIO.tsx
- engine/plugins/PwaUpdate.tsx
- engine/plugins/topbar/FpsCounter.tsx
- engine/plugins/topbar/ProjectName.tsx
- engine/plugins/topbar/PauseControls.tsx
- engine/plugins/topbar/BucketRenderController.ts
- engine/plugins/topbar/BucketRenderPanel.tsx
- engine/plugins/topbar/installBucketRender.tsx
- engine/plugins/RenderDialog/index.tsx
- engine/plugins/RenderDialog/types.ts
- engine/plugins/RenderDialog/ConfigForm.tsx
- engine/plugins/RenderDialog/RenderingView.tsx

### JSDOC additions

**File: engine/plugins/Menu.tsx**
- on `installMenu` (:243): existing inline comment at :246-264 covers the `queueMicrotask` rationale — promote to JSDoc on `installMenu`: `@invariant queueMicrotask(_notify) defer is load-bearing — Zustand fires subscribers synchronously during setState; immediate _notify calls setState on MenuAnchor's useSyncExternalStore while React is still committing, triggering "Cannot update a component while rendering" warning.`
- on `_hostMounts` (~:165-175): `@invariant Counter, not boolean — two MobileMenuHost mounts in the same render tree (StrictMode dev double-mount) increment/decrement symmetrically; one bool would false-clear on the second mount's cleanup.`

**File: engine/plugins/SceneIO.tsx**
- on `installSceneIO` (:86): `@invariant Captures option values into _getCanvas / _parseScene / _serializeScene / _fileExtension / _snapshotAnchor BEFORE the _installed short-circuit. Reinstall updates captured deps even though registration is skipped — this DELIBERATELY breaks "install* is idempotent" for the captured-deps half of state.` (cite :86-93; partially covered in source.)
- on `installSceneIO` (:86): `@invariant PNG/JPG export menu items + SnapshotButton are gated on _getCanvas AT install time. Registering getCanvas AFTER install will not back-fill these items — apps must uninstall + reinstall, or pass getCanvas up-front.` (cite :122-148.)
- on `loadSceneFile` (:191): `@invariant Pure decoder only — returns a parsed Preset but does NOT apply it. Callers MUST follow with useEngineStore.getState().loadScene({ preset }) — calling loadPreset directly skips the compile gate, post-boot config flush, worker OFFSET_SET, and CONFIG_DONE debounce-skip, causing post-boot scenes to render as fallback sphere.` (cite :191-197; the load-bearing inline comment exists at :288-306 but not on the function itself.)

**File: engine/plugins/PwaUpdate.tsx**
- top-of-file: `@requires vite-plugin-pwa — the 'virtual:pwa-register/react' import is supplied by VitePWA. Apps not shipping as PWA must not install this plugin or the build fails.` (cite :22.)

**File: engine/plugins/RenderDialog/index.tsx**
- on the bitrate auto-recommend effect (:114-118): `@invariant Bitrate auto-recommend overwrites user input on every cfg.width/cfg.height change — Math.round(40 * (w*h) / (1920*1080)) Mbps. A user edit to bitrate survives only until the next resolution edit.`
- on the registration call (:53-60): `@invariant Installs via registerRenderPopup, NOT topbar or menu — the Timeline toolbar's Render button reads getRenderPopup() and hides itself when nothing is registered.`

**File: engine/plugins/topbar/BucketRenderPanel.tsx**
- on the mount effect (~:139-148): `@invariant Resolution-swap snapshots the PRE-SWAP viewport pixel size at mount and uses that snapshot for all subsequent fit calcs — without this, repeated output-dim edits drift against the progressively-shrinking Fixed canvas.`

### ADRs to write

- **00NN-plugins-two-step-scene-load** — Context: a one-step `loadSceneFile` that calls `loadPreset` directly skipped the compile gate, the post-boot full-config flush, the worker `OFFSET_SET`, and the `CONFIG_DONE` debounce-skip — post-boot loads rendered as a fallback sphere. Decision: `loadSceneFile` is a pure decoder (File → Preset | null); callers MUST follow with `useEngineStore.getState().loadScene({ preset })` which orchestrates the full apply pipeline. Consequences: two-call API documented at the load-menu-item callsite and now on the function JSDoc; future load entry points (e.g. drag-drop) must follow the same pattern.
- **00NN-plugins-slot-registry-shape** — Context: three near-identical slot registries (TopBar, Hud, Menu) plus several composed plugins; each plugin reinvented its own state-capture shape (module-state singletons, queueMicrotask fanout, _insertCounter for ordering, controller-interface params). Decision: accept the divergence — every plugin's `install*` is idempotent for the registration block, but capture-deps semantics vary by plugin. Re-registration is REPLACEMENT (Map.set), not append, across all three substrate registries. Consequences: no uniform plugin contract — `docs/engine/03_Plugin_Contract.md`'s "install* is idempotent" rule does NOT hold uniformly (SceneIO breaks it deliberately for captured deps).

### CLAUDE.md rows
- "When loading scenes: `loadSceneFile` is a pure decoder — it does NOT apply the preset. Callers MUST follow with `useEngineStore.getState().loadScene({ preset })`. Calling loadPreset directly skips compile-gate + post-boot config flush + worker OFFSET_SET → post-boot scenes render as fallback sphere."
- "When adding a plugin install function: re-registration is REPLACEMENT (Map.set) across topbar/hud/menu — there is no append-only mode. install* idempotency is per-plugin-flavoured; SceneIO captures option deps BEFORE the _installed short-circuit."

### Notes
- The doc's "no uniform plugin contract" known issue is a structural finding worth surfacing — but it's already captured in the module doc; CLAUDE.md row #2 above captures the actionable rule.
- Several inline comments (Menu queueMicrotask, SceneIO capture-before-installed, BucketRenderPanel snapshot-resolution) are already load-bearing in source — promotions to method-level JSDoc add hover-discoverability.
- DROPPED: the 13-row drift table from the legacy `docs/engine/04_Core_Plugins.md` — historical, not architectural.

### DROPPED content
- Public API tables (all of them) — pure restated code.
- The two-step load pipeline diagram followup (q-054) — captured as the ADR + invariant; no need to duplicate further.
- The "9 vs 13 plugin lineup" historical decision — superseded; surfaces only in historical-context.
- Subsystem-specific implementation prose (BucketRenderPanel's 676 lines, Help's lesson subscription, RenderDialog's progress 0-1 vs 0-100) — implementation detail.

---

## docs/modules/engine/shortcuts-undo.md

### Source files
- engine/plugins/Shortcuts.ts
- engine/plugins/Undo.tsx

### JSDOC additions

**File: engine/plugins/Shortcuts.ts**
- Top-of-file docblock at :1-26 covers the design philosophy and key syntax. No top-level addition.
- on `ShortcutDef` (:28): the per-field comments at :29-48 are sufficient. No change.
- on `installShortcuts` (:217): `@invariant Idempotent via _installed guard — options passed on a SECOND call are silently dropped. A second installShortcuts({domRoot: customRoot}) after a first bare call leaves the listener on window with no warning.` (cite :218-219; not in source.)
- on the dispatcher `resolve()` (~:183-202): `@invariant Tiebreak rule: most-recently-registered wins within the same scope-score + priority. Stable sort + Map insertion order means later registrations end up later in the matches array and win the head slot. (NB: docs/engine/06_Undo_Transactions.md:116 and app-gmt/main.tsx:408-414 INVERT this — they describe the rule as "first wins", which is wrong.)` (already in source at :184-185; promote to method JSDoc for visibility.)
- on `ignoreInputs?` field (:47): `@invariant The name reads as the INVERSE of its semantics — default false MEANS the input guard IS applied. ignoreInputs:true bypasses the guard.` (cite :47, :232; not in source.)

**File: engine/plugins/Undo.tsx**
- on `installUndo` (:88): `@invariant Mod+Shift+Z is registered unconditionally despite the 'Redo (Mac)' label — on Win/Linux it expands to Ctrl+Shift+Z and fires the engine-core redo. App-gmt's camera-undo binding at priority:10 shadows it intentionally.` (cite :112-118; description-label drift.)
- on `uninstallShortcuts` interplay note (file-level): `@invariant uninstallShortcuts() clears the shortcut registry but does NOT reset Undo's _installed flag. A subsequent installUndo() after a bare uninstallShortcuts() is a no-op — the five Undo bindings never come back. Call uninstallUndo() FIRST.` (cite Undo.tsx:79; not in source.)

### ADRs to write

- **00NN-shortcuts-scope-stack** — Context: the previous central if-ladder approach made it impossible for plugins to contribute keybindings without touching a core file, and a Ctrl+Z at the global level couldn't be overridden by the timeline-hovered animation undo without if-ladder edits. Decision: scope-stack-based dispatcher — shortcuts declare a `scope` (default `'global'`); the dispatcher walks the stack newest-first and uses `scopeStack.lastIndexOf(scope) * 10000 + priority` to score. Tiebreak is most-recently-registered (stable sort + insertion order). Consequences: timeline-hover overrides simply push `'timeline-hover'` while hovered and register at scope `'timeline-hover'` priority 10 (convention); registering AFTER another shortcut with the same key+scope+priority wins. Default `consume: true` blocks browser defaults — opt-out with `consume: false`.
- **00NN-undo-per-scope-stacks** — Context: a unified history stack with scope tags caused two user-visible bugs: (1) generic UI calling `undo()` with no scope popped the wrong lane (Ctrl+Z popped a camera move when the user meant to undo a slider tweak); (2) the pre-migration `handleInteractionStart(mode)` accepted either a string or a CameraState object, dispatching at runtime — two recording paths shared a function but not a contract. Decision: per-scope stacks (`'param'`, `'camera'`, plus `animationStore` separately) with typed entry points (`pushCameraTransaction(state: CameraState)`). Topbar buttons hardwire to `'param'`; timeline-hover routes to the separate `animationStore.undo()`. Consequences: both bug classes are now structurally unrepresentable. Animation-store history-deferral (F2b) remains open — unifying would deduplicate stack code but require per-keyframe patch translation; deferred until a cross-scope undo flow needs it. `MAX_STACK = 50` per lane.

### CLAUDE.md rows
- "When adding a timeline-hover shortcut: use `priority: 10` (convention — Undo + Space-to-play both follow this). Tiebreak is most-recently-registered wins (NOT first-wins, despite legacy comments saying otherwise — see engine/plugins/Shortcuts.ts:184-185)."

### Notes
- The "tiebreak direction" drift (legacy docs / app-gmt/main.tsx comment claim first-wins) is a high-value finding — the source comment at :184-185 is authoritative; doc + main.tsx comment need a one-line fix.
- `_scopeSubscribers` / `_notifyScope` are wired but no exported subscription API consumes them — dead-ish; flag for cleanup, not an ADR.
- `popScope('global')` would remove the seed entry with no guard — defensive only by convention. Worth a one-line assertion in a future hardening pass.

### DROPPED content
- Public API tables for `shortcuts.*` methods — pure restated code.
- The full key-normalisation flow (token order, aliases, named-key map) — covered by the top-of-file docblock and the `normalizeKey` source.
- The `installUndo` topbar item order numbers (-20 / -19) — implementation detail.
- The `(state as any)[action]` dead-defensiveness note — micro-cleanup item, not architectural.
- The legacy doc's full migration narrative — preserved by link, not duplicated.

---

## Cross-batch observations

- **Many module doc invariants are ALREADY load-bearing inline comments** at the cited lines (binder-registry-wins, queueMicrotask defer, bucket-scissor-after-setRenderTarget, write-index inversion, eager registerFeatures, Bezier-on-log, etc.). The high-value JSDoc additions are mostly PROMOTIONS — moving the comment from "inline near the relevant statement" to "on the method/class JSDoc so it shows on hover".
- **Three drifts worth fixing in source as a separate cleanup pass** (not ADRs, not JSDoc): BloomPass "5 mip" header (it's 7); RenderPipeline "MRT" naming (color-only single-attachment); the inverted tiebreak rationale in app-gmt/main.tsx:408-414 + docs/engine/06_Undo_Transactions.md:116 (most-recently-registered wins, not first).
- **One genuine doc-rewrite-target with high payoff**: `loadSceneFile` two-step contract — currently only documented inline at the load-menu callsite; deserves JSDoc on the function AND the ADR captured above.
