# Harvest: batch-D

Five module docs decomposed into JSDoc additions (file:line cited), ADRs (decisions with rationale), and CLAUDE.md rows. Source code is treated as truth — top-of-file blocks that already cover an invariant are skipped. ADRs use range 0036-0045.

---

## docs/modules/engine/features.md

### Source files
- `engine/features/index.ts` (34L; module header already strong, lines 1-7)
- `engine/features/types.ts` (~47L)
- `engine/features/setFeature.ts` (82L; lines 1-19 already document the pattern)
- `engine/features/ui.tsx` (~60L)
- `engine/features/post_effects.ts`
- `engine/features/color_grading.ts`
- `engine/features/audioMod/AudioAnalysisEngine.ts` (243L; minimal top-of-file)
- `engine/features/audioMod/AudioPanel.tsx`
- `engine/features/audioMod/AudioLinkControls.tsx`
- `engine/features/audioMod/AudioSpectrum.tsx`
- `engine/features/audioMod/index.ts`
- `engine/features/modulation/ModulationEngine.ts` (minimal header; inline comments at lines 7-8, 31-35 strong)
- `engine/features/modulation/applyAt.ts` (top-of-file 1-14 already canonical)
- `engine/features/modulation/index.ts`
- `engine/features/webcam/WebcamOverlay.tsx`
- `engine/features/debug_tools/DebugToolsOverlay.tsx`
- `engine/features/debug_tools/index.ts`

### JSDOC additions

**File: `engine/features/setFeature.ts`**
- On `setterName` (line 56): `@invariant Setter naming is a load-bearing string convention: 'set' + capitalized feature.id. Not type-enforced. A boot-order bug where setFeature() runs before the feature's slice has been registered into the store will hit the dev-only console.warn at line 67-68 silently in production. The same convention is consumed by store auto-wiring and CompilableFeatureSection — see q-013 carry-in.`

**File: `engine/features/modulation/ModulationEngine.ts`**
- Top-of-file: `@invariant LFO master switch (lfosEnabled=false) gates BOTH writes and reads. The early-return at line 35 stops updateOscillators from refreshing lfoValues; the rule-side gate inside update() must also skip LFO-sourced rules, or they read stale cached lfoValues and hang at their final modulated value.`
- Top-of-file: `@invariant LFO phase is unit-period (0..1), not radians. line 40: ((time / period) + phase) % 1. Larger period = slower wiggle. Noise samples at time/period (no phase added).`
- Top-of-file: `@invariant offsets buffer is APPENDED to inside update(), not cleared. Caller (AnimationSystem live path, applyModulationsAt export path) must call resetOffsets() before update(), or rules accumulate across frames.`
- Top-of-file: `@invariant Two rules targeting the same param accumulate into offsets[target], not overwrite. Gain * signal + offset is added to whatever was there.`

**File: `engine/features/audioMod/AudioAnalysisEngine.ts`**
- Top-of-file: `@invariant init() is idempotent — short-circuits on second call (line ~62). Every public entry point (connectMicrophone / connectSystemAudio / loadTrack) calls it first.`
- Top-of-file: `@invariant Mic is connected to the analyser only — NOT to AudioContext.destination — to prevent feedback. System-audio capture is connected to both analyser and destination so the user hears it. Loading a track also disables an active mic; connecting the mic only pauses decks (asymmetric).`
- Top-of-file: `@invariant getTrackInfo().duration returns 0 (NOT 1) when metadata has not yet loaded. The || 1 fallback used to lock AudioStrip clips to 1-second slices; do not reintroduce it.`

**File: `engine/features/modulation/applyAt.ts`**
- (top-of-file already covers usage; no addition needed)

**File: `engine/features/types.ts`**
- On `FeatureStateMap` (line ~18): `@invariant FeatureStateMap is the declaration-merge target for app/plugin feature state. The bundled features extend this generic baseline; apps add their feature-state slots via TypeScript declaration merging. ModulationActions is the only bundled custom-actions interface (FeatureCustomActions extends it).`
- On `DrawnShape` (line ~37): `@deprecated Back-compat stub typed unknown — the drawing feature was removed during the GMT -> engine extraction. Kept so existing preset JSON deserializes without type errors.`

### ADRs to write

- **ADR-0036 — `defineFeature` identity helper preserves param literal types**
  - **Context:** A plain `: FeatureDefinition` annotation widens `params` to `Record<string, ParamConfig>` and erases per-key value types. `setFeature(feature, patch)` and `getFeature(feature)` then degrade to `unknown`-shaped patches with no autocomplete or compile-time validation.
  - **Decision:** Ship `defineFeature<P>(def): typeof def` as a no-op identity helper (engine/features/setFeature.ts:52-54). Authors call it instead of typing the variable; the generic `P extends Record<string, ParamConfig>` captures the literal `params` shape so `FeatureState<F>` mapped types resolve correctly.
  - **Consequences:** Two APIs coexist: `defineFeature(...)` for typed access, `: FeatureDefinition` for legacy. The six bundled feature files still use the legacy annotation — the helper is offered for new app/plugin features rather than back-applied. `setFeature` typing only works for `defineFeature`-authored features today.

- **ADR-0037 — Two registration manifolds: `registerFeatures()` and `registerUI()`**
  - **Context:** Apps with no React surface (or a Tauri host) need engine-side feature data (params, state, actions, shader chunks, viewport configs) without dragging in the React component bindings. The Tailwind `@apply` utility classes (`t-btn`, `t-section-*`, `glass-panel`, `icon-btn`) used by panels are also engine-distributed and must be injected into the host page's stylesheet.
  - **Decision:** Split into two entry points called from per-app `main.tsx`. `registerFeatures()` (engine/features/index.ts:17-27) registers the six bundled FeatureDefinitions into `featureRegistry`. `registerUI()` (engine/features/ui.tsx:37-58) calls `injectEngineStyles()` and registers six `componentId` -> React component bindings in `componentRegistry`. Headless apps call only the first.
  - **Consequences:** Apps choose React surface independently. The styles inject runs on every `registerUI()` call but is idempotent. The split is also a useful boot-order signal: a missing `registerUI()` produces "panel exists but components unmount" rather than a hard crash.

### CLAUDE.md rows

- "When adding a bundled engine feature: `set${cap(feature.id)}` is a load-bearing string convention — the matching auto-generated store setter must exist before any `setFeature()` call (engine/features/setFeature.ts:56-57). Not type-enforced; boot-order bugs surface as a dev-only console.warn that silent in production. See q-013 carry-in."
- "When working with `modulationEngine.offsets`: the buffer is APPENDED inside `update()`. Caller MUST call `resetOffsets()` (or `applyModulationsAt` which does so) before each tick. Two rules targeting the same param accumulate; `lfosEnabled` gates both writes AND reads of `lfoValues`."

### Notes
- Header docblocks already in source cover most of the audio-engine WebAudio graph topology, modulation pipeline narrative, `applyModulationsAt` rationale. JSDoc additions focus on testable invariants not already inlined.
- `(store as any).updateModulation` tech debt (q-077) is acknowledged in source comments at the three call sites; no JSDoc addition needed — captured as carry-in, not as ADR.
- `WebcamOverlay.blendMode` float-vs-string and `shaderDebuggerOpen` vestigial param are dead/cleanup items, not invariants worth annotating.

### DROPPED content
- Per-feature param tables (PostEffects 4 params, ColorGrading levels/saturation, Audio public + hidden DSP params, Webcam 14 params, DebugTools menu) — restates source.
- Full WebAudio graph topology walk-through — restates AudioAnalysisEngine.ts:46-82.
- `componentRegistry` ID table (6 IDs) — restates ui.tsx:49-57.
- Modulation pipeline 4-stage detail (source signal, envelope, smoothing, output transform) — restates ModulationEngine.ts:119-161.

---

## docs/modules/engine/mobile-layout.md

### Source files
- `hooks/useMobileLayout.ts` (71L; top-of-file lacks docblock but inline comments at 18-24, 35-37, 39-44, 50-65 are strong)
- `engine/components/LandscapeGate.tsx` (28L; top-of-file 1-9 strong)
- `engine/components/MobileScrollIntro.tsx` (56L; top-of-file 1-17 strong, inline 33-40 strong)
- `engine/components/MobileViewportShell.tsx` (53L; top-of-file 1-19 strong, inline 38-42 strong)

### JSDOC additions

**File: `hooks/useMobileLayout.ts`**
- Top-of-file (currently bare): `@invariant Importing this module IS the install step — no installMobile() plugin exists. The module-level resize listener at lines 25-37 is installed at first import inside if (typeof window !== 'undefined'). If no module ever imports this hook, the engine store's isDeviceMobile / isPortrait flags stay at whatever the slice initializer seeded.`
- Top-of-file: `@invariant The 768px breakpoint at line 7 is duplicated in engine/HardwareDetection.ts. Changing the threshold here means changing it there too. See plans/doc-audit-state/survey/_followups/q-083.md.`
- Top-of-file: `@invariant Orientation uses strict innerHeight > innerWidth (line 10). A square viewport counts as landscape and will NOT trigger LandscapeGate.`
- Top-of-file: `@invariant Resize listener is never removed (intentional — module-level singleton lives for app lifetime, inline comment lines 35-37). Under Vite HMR each module re-evaluation leaks one extra listener for the dev session; bounded by inequality guard at line 30, wiped on full reload. No production impact. See q-086.`
- On `isMobileSnapshot` (line 45): `@invariant Non-reactive — reads useEngineStore.getState() without subscribing. Safe inside menu/topbar when: predicates re-evaluated by the host. UNSAFE inside React renders: relies on snapshot, will not re-render on preference / device flips. Use useMobileLayout() inside components.`

**File: `engine/components/LandscapeGate.tsx`**
- On `LandscapeGate` (line 15): `@invariant Consumes raw isDeviceMobile (line 18), not the preference-aware isMobile. Force-Mobile-on-desktop must NOT trigger the rotate prompt — telling a desktop user with a portrait window to rotate is nonsensical. Asymmetric gating policy load-bearing across the three layout primitives.`

**File: `engine/components/MobileScrollIntro.tsx`**
- On `MobileScrollIntro` (line ~29): `@invariant Must render BEFORE <MobileViewportShell> in DOM order (top-of-file lines 7-9). The sticky-shell-after-scroll mechanism depends on the intro contributing pre-shell scroll height; reversing order breaks the address-bar collapse trick.`
- On `MobileScrollIntro` (line ~29): `@invariant Banner uses 100svh (small viewport), shell uses 100dvh (dynamic viewport). The pairing gives the body scroll capacity exceeding the visible viewport by at least the address-bar height — that's the address-bar collapse mechanism. Both heights are load-bearing; do not interchange them with vh.`

**File: `engine/components/MobileViewportShell.tsx`**
- On `MobileViewportShell` (line 37): `@invariant Mobile branch uses 100dvh (dynamic, tracks live viewport including keyboard open/close); vh would leave a black band after the mobile keyboard dismisses. Mobile branch applies env(safe-area-inset-*) padding on all four edges via the frozen MOBILE_STYLE object; desktop branch uses empty style.`

### ADRs to write

- **ADR-0038 — Asymmetric mobile-detection gating policy**
  - **Context:** Three categories of mobile-aware UI exist in GMT: (1) layout shells that handle iOS/Android viewport quirks (sticky shell, address-bar collapse, safe-area padding); (2) rotate-prompt overlays; (3) preference-aware mobile UI (joysticks, mobile menu host, hidden desktop chrome). The user can also Force Mobile UI on a desktop browser via `uiModePreference: 'mobile'`. Forcing mobile shells on a desktop browser deadlocks (desktop body has `overflow: hidden` so a 100svh banner has no scroll past it), and showing "rotate your device" to a desktop portrait window is nonsensical.
  - **Decision:** `useMobileLayout()` returns BOTH a raw `isDeviceMobile` flag AND a preference-aware `isMobile` flag. `LandscapeGate`, `MobileScrollIntro`, `MobileViewportShell` consume `isDeviceMobile`. Joysticks / mobile menu / desktop-chrome hiders consume `isMobile`. Header comment at hooks/useMobileLayout.ts:50-65 is the contract.
  - **Consequences:** Two flag names with subtly different semantics in the public API; consumers must pick correctly per use case. Tested by the q-008 / q-083 followups. Future refactors that collapse the two flags would silently break Force-Mobile-on-desktop.

- **ADR-0039 — Address-bar collapse via paired 100svh + 100dvh**
  - **Context:** iOS Safari and Android Chrome retract the URL bar after the user scrolls past a threshold of the page body. GMT wants the canvas to fill the screen after that retraction without leaving a black gap when the keyboard opens, and without per-app glue code.
  - **Decision:** Ship two primitives that compose. `MobileScrollIntro` is a `100svh` banner that adds pre-shell scroll capacity; `MobileViewportShell` is `sticky top-0 h-[100dvh]`. The combined height always exceeds the visible viewport by at least the address-bar height, so the body can scroll. Once scrolled past the intro, the sticky shell locks. `dvh` (not `vh`) tracks the live viewport so the shell also re-fits when the keyboard opens/closes.
  - **Consequences:** Apps MUST render `MobileScrollIntro` before `MobileViewportShell` in DOM order; reordering breaks the mechanism. Two CSS height keywords (`svh` and `dvh`) — both required by the latest CSS Values 4 viewport-units spec. Older browsers (pre-2022) without dvh/svh fall back imperfectly, but the user base is mobile-recent.

### CLAUDE.md rows

- "When adopting mobile-layout primitives: import order matters — importing `hooks/useMobileLayout.ts` IS the install step (no plugin). DOM order matters too — render `<MobileScrollIntro>` BEFORE `<MobileViewportShell>`, or the address-bar collapse trick breaks. Layout shells (LandscapeGate / Intro / Shell) consume RAW `isDeviceMobile`; preference-aware UI (joysticks, mobile menu) consumes `isMobile`. The 768px breakpoint is duplicated in `engine/HardwareDetection.ts` — change both together."

### Notes
- All four files have strong inline / top-of-file comments. JSDoc additions are minimal — only invariants not already documented at the right scope.
- The `import.meta.hot` HMR-leak (q-086) is documented as a known bounded-impact dev-session leak. No fix applied per carry-in; not promoting to a JSDoc addition because the inline comment at 35-37 already calls out the intentional no-removal.

### DROPPED content
- Public API table (5 symbols) — restates source.
- Architecture walk-through of dvh/svh CSS values — captured in ADR-0039.
- Full historical-doc drift table (4 corrections vs `docs/engine/17_Mobile_Layout.md`) — preserved as a pointer in the historical context; not load-bearing for current code.

---

## docs/modules/engine-gmt/renderer.md

### Source files
- `engine-gmt/engine/FractalEngine.ts` (958L; encoder block at 26-32 documented; types at 80-108 documented; cameraInUse explained inline 90-96)
- `engine-gmt/engine/MaterialController.ts` (~600L; cloneUniforms + cyrb53 helpers documented in source)
- `engine-gmt/engine/SceneController.ts` (54L thin)
- `engine-gmt/engine/CompileScheduler.ts` (header docblock 1-21 already strong)
- `engine-gmt/engine/PrecisionMath.ts` (12L re-export shim with self-documenting header)
- `engine-gmt/engine/HardwareDetection.ts`
- `engine-gmt/engine/LoadingRendererCPU.ts`
- `engine-gmt/engine/worker/WorkerProxy.ts` (header 1-9 documents import-type pattern)
- `engine-gmt/engine/worker/WorkerProtocol.ts`
- `engine-gmt/engine/worker/ViewportRefs.ts` (22L shim with self-documenting header 1-22)
- `engine-gmt/engine/worker/WorkerExporter.ts`
- `engine-gmt/engine/worker/WorkerHistogram.ts`
- `engine-gmt/engine/worker/WorkerDepthReadback.ts`
- `engine-gmt/engine/worker/renderWorker.ts`
- `engine-gmt/engine/worker/handleRenderTick.ts`

### JSDOC additions

**File: `engine-gmt/engine/FractalEngine.ts`**
- On `EngineRenderState.cameraInUse` (line ~96): already has inline docblock — NO addition needed.
- On `FractalEngine` class (line ~118): `@invariant engine.renderer and engine.pipeline are null on the main thread under worker mode. Code MUST guard via engine.isBooted or use the shadow state on WorkerProxy. This matches the "What NOT to Do" rule in CLAUDE.md / docs/gmt/01_System_Architecture.md.`
- On `resetAccumulation` (line ~331): `@invariant Deliberately does NOT set dirty = true — would infinite-loop with update(). The dirty flag is for "config changed, recompile" semantics; accumulation reset is a separate concern (RenderPipeline.reset on the next render).`
- On `getEngine` (line ~950) AND `export const engine` (line ~958): `@invariant getEngine() is lazy, but the bottom-of-module \`export const engine = getEngine()\` forces construction on import. New code should prefer getEngine() rather than importing \`engine\` directly so test harnesses can swap the singleton.`
- On the module-scope `PRECOMPUTED_JITTER` array (line ~111): `@invariant Halton(2,3) jitter array (length 2048) is module-scope and shared across all engine instances — safe because it is read-only.`

**File: `engine-gmt/engine/MaterialController.ts`**
- On `setUniform` (line ~385): `@invariant Propagates to FOUR uniform maps (mainUniforms, histogramUniforms, displayMaterial.uniforms, exportMaterial.uniforms) and handles plain-object fallbacks for postMessage-stripped THREE types — Vector3 arriving as {x,y,z}, Matrix3/Matrix4 arriving as {elements:[…]}. New uniform types must add fallback paths or worker -> main writes silently no-op.`
- On `setUniform` (line ~385): `@invariant Skips when the target uniform map lacks the key — adding a new uniform to mainUniforms does not automatically reach display/export materials unless they share refs.`
- On `swapFullMaterial` (line ~348): `@invariant Disposes the old material before reassigning materialDirect/materialPT. Anything that cached a reference to the old material (outside the mainMaterial getter) is at risk. The scheduler reassigns the mesh via sceneCtrl.setMaterial.`
- On `compilePreview` (line ~261): `@invariant Returns false when lighting is already off (preview == full). The CompileScheduler drops to single-stage in that case — there is no preview material to swap to.`

**File: `engine-gmt/engine/CompileScheduler.ts`**
- Header docblock already strong. NO module-level addition.
- On the `generation` field (line 60): `@invariant Protects POST-yield code only — synchronous portions of perform() can still race with rapid CONFIG bursts. hasCompiledShader and lastCompiledFormula are set BEFORE the first async yield so a concurrent perform() sees updated state.`
- On the `keepCurrent` strategy branch (around line 190-256): `@invariant Skips modular uniform sync during the async swap (would zero+refill the array and corrupt the still-rendering old shader's slot mapping). Modular sync runs AFTER swapFullMaterial.`
- On `lastCompiledFormula` (line 68): `@invariant Includes the interlace formula id when interlaceCompiled is true — formula-switch detection must include both halves of the hybrid id, otherwise an interlace-only change skips recompile.`

**File: `engine-gmt/engine/worker/WorkerProxy.ts`**
- On `_offsetGuarded` (line ~53): `@invariant Drift-converged clear ONLY — no timeout fallback. A previous 2s auto-clear caused an F15 fly-mode bug where stale FRAME_READY data overwrote a fresh teleport. The guard clears when the worker's reported offset converges within 0.001 of the set value (lines 208-222, 554-567).`
- On `applyOffsetShift` (line ~570): `@invariant No-op on main thread — relies on FRAME_READY for _localOffset sync.`
- On `bootWithConfig` (line ~471): `@invariant Automatically restart()s when _bootSent is already true — the sole way to cancel a Firefox synchronous-compile pipeline mid-flight. Requires _container and _lastInitArgs to have been stashed during the first init.`
- On `checkHalfFloatAlphaSupport` (line ~664): `@invariant Permanent stub returning true. Main thread cannot probe a worker's GL context. The real probe lives in the worker's FractalEngine but has no live consumer today (per q-094).`
- On `setConvergenceNeeded` (line ~656): `@invariant Setting false saves one render + two setRenderTarget swaps + one sync readPixels per 8 samples when RegionOverlay isn't mounted.`

**File: `engine-gmt/engine/worker/renderWorker.ts`**
- Near top-of-file constants (line ~110-117): `@invariant renderer.outputColorSpace = THREE.LinearSRGBColorSpace is mandatory. Without it, Three.js compiles different shader programs for canvas vs FBO rendering (program-hash divergence). GMT manages sRGB encoding manually via uEncodeOutput in the post-process shader.`
- On the INIT handler (line ~93-96): `@invariant INIT only stashes the message and replies READY. Heavy WebGL setup is deferred to setupEngine() triggered by BOOT (~line 98-100). Resize messages arriving between INIT and BOOT are buffered in _pendingResize. This lets a terminated worker's GPU compile drain without blocking re-init.`

### ADRs to write

- **ADR-0040 — Two-stage shader compile (preview + async full) with three strategies**
  - **Context:** Heavy GMT shaders take 3-15 seconds to compile under `KHR_parallel_shader_compile`-supported browsers, and synchronously up to ~14 seconds on Firefox where the extension's behaviour is degraded. A single-stage compile freezes the viewport for the duration. Apps want sub-second visual feedback after every formula switch.
  - **Decision:** `CompileScheduler` runs three strategies: `keepCurrent` (parallel compile + same formula + prior compile done — keep current shader on screen while new one builds, defer modular uniform sync until after swap); `twoStage` (parallel compile + new formula — swap to lighting-off preview material in ~1 frame, build full in background, hot-swap); `singleStage` (Firefox sync compile OR lighting already off — preview == full). A generation counter discards in-flight compiles when newer ones arrive; `lastCompiledFormula` includes the interlace formula id so hybrid-id changes trigger rebuilds correctly. Spinner messaging differs between strategies ("Loading Preview..." vs "Compiling Shader...").
  - **Consequences:** Shader compile is no longer a viewport-freezing event under Chrome/Edge. Firefox users still see the freeze (no parallel-compile workaround possible). The modular-uniform-sync-after-swap rule is load-bearing — syncing during async compile corrupts the still-rendering old shader's slot mapping. Compile-telemetry log lines at `engine-gmt/engine/CompileScheduler.ts:238-239,330-331` are marked do-not-remove (used as profiling waypoints in debug/bench-shader.mts).

- **ADR-0041 — Worker `INIT`/`BOOT` deferred-setup pattern**
  - **Context:** The render worker owns `FractalEngine` + `WebGLRenderer` + `OffscreenCanvas`. A Firefox sync-compile in flight can pin the GPU thread for tens of seconds. Re-init during that window (preset load, hot-reload, restart()) would either deadlock waiting for setupEngine() or race with the in-flight compile. Without `OffscreenCanvas.transferControlToOffscreen` being repeatable (it's one-shot), the proxy also needs to know when to swap canvases vs reuse.
  - **Decision:** Split worker startup into two messages. `INIT` only stashes the init params and replies `READY`; `setupEngine()` is deferred to `BOOT` (engine-gmt/engine/worker/renderWorker.ts:93-100). Resize messages arriving between the two are buffered in `_pendingResize`. `WorkerProxy.bootWithConfig` automatically calls `restart()` when `_bootSent` is already true — replacing the canvas, terminating the old worker (whose GPU compile drains on its own), creating a fresh one. `_container` and `_lastInitArgs` are stashed during the first init for the recursive restart path.
  - **Consequences:** Firefox users can cancel a stuck compile by triggering any path that reaches `bootWithConfig` (preset load, formula switch in some paths). The cost is one full worker tear-down + creation per cancel — acceptable vs a 14-second viewport freeze. The "INIT just stashes the message" rule is fragile: anything that handles a non-`INIT`/`BOOT` message before BOOT must defer or queue. Recursive restart loses the camera if `_container`/`_lastInitArgs` weren't set during init.

- **ADR-0042 — `_offsetGuarded` drift-converged sync (no timeout fallback)**
  - **Context:** Main-thread overlays (gizmos, picking rays, distance-measure pills) draw against the camera offset; the worker renders against its own offset value transmitted via RENDER_TICK. After a `setShadowOffset` (e.g. orbit-mode camera absorb), there's a window where the worker's FRAME_READY echoes the OLD offset value while the new one is still being applied. A naive sync would race and the overlay would briefly snap-back to the pre-absorb position.
  - **Decision:** `WorkerProxy._offsetGuarded` is set when `setShadowOffset` fires and cleared ONLY when the worker's reported offset converges within 0.001 of the set value. No timeout, no auto-clear. While guarded, FRAME_READY does NOT update `_localOffset`.
  - **Consequences:** Cleanly handles orbit-mode camera absorb, fly-mode teleport, and any path that imperatively writes a new offset. The previous 2s auto-clear caused an F15 fly-mode bug where a stale FRAME_READY arrived past the timeout and overwrote a fresh teleport. The trade-off: if the worker NEVER reports the converged offset (worker crash, suspended tab), `_offsetGuarded` stays set forever. `terminateWorker` clears every pending Map including this state on hard teardown, mitigating the leak.

### CLAUDE.md rows

- "When touching `engine-gmt/engine/CompileScheduler.ts`: the three strategies (`keepCurrent`, `twoStage`, `singleStage`) are load-bearing — see ADR-0040. The generation counter only protects POST-async-yield code; rapid CONFIG bursts can still race the synchronous portion of `perform()`. `lastCompiledFormula` includes the interlace formula id so hybrid-id changes trigger rebuilds. Modular uniform sync must defer until AFTER `swapFullMaterial` or the still-rendering old shader's slot mapping corrupts. Compile-telemetry log lines at lines 238-239 / 330-331 are profiling waypoints — do not remove."

- "When changing the worker boundary (`engine-gmt/engine/worker/`): `_offsetGuarded` is drift-converged WITHOUT a timeout fallback (see ADR-0042). `applyOffsetShift` is a no-op on main thread. `bootWithConfig` auto-`restart()`s when already booted — the sole Firefox sync-compile cancel escape hatch — and depends on `_container`/`_lastInitArgs` having been stashed during init. `renderer.outputColorSpace = LinearSRGBColorSpace` in `renderWorker.ts` is mandatory; without it, canvas vs FBO programs hash differently and Three.js recompiles."

### Notes
- The two re-export shims (`PrecisionMath.ts`, `worker/ViewportRefs.ts`) have strong self-documenting headers and are out-of-scope here. The `setEngineProxy(proxy as any)` cast at `engine-gmt/renderer/install.ts:61` (q-078) lives outside the file set claimed by this module doc — not addressed here.
- The doc's drift table against `docs/gmt/01_System_Architecture.md` (8 rows) is preserved by pointer in the historical-context section; not load-bearing for code edits today.
- `checkHalfFloatAlphaSupport` is a permanent stub (q-094) — captured in JSDoc; no ADR (it's a vestigial probe, not a decision).
- Generation counter rationale is documented inline in CompileScheduler (header lines 12-15). JSDoc addition above tightens to "post-yield only".

### DROPPED content
- Full per-symbol method tables for `FractalEngine`, `MaterialController`, `WorkerProxy`, `CompileScheduler`, `SDFShaderBuilder`-adjacent — restate exported signatures verbatim.
- INIT/BOOT message-flow narrative — captured in ADR-0041.
- Bucket-render hold/jitter detail — captured in the bucket-render doc, not duplicated here.
- HDR env-map RGBE encoder walk-through — restates FractalEngine.ts:33-77.
- Worker INIT/BOOT/RESIZE message flow — captured in ADR-0041.

---

## docs/modules/engine-gmt/shader-pipeline.md

### Source files
- `engine-gmt/engine/ShaderBuilder.ts` (635L; 17-position comment at lines 1-26 already canonical)
- `engine-gmt/engine/SDFShaderBuilder.ts` (top-of-file 1-9 already documents purpose; CP-mirror at 21-30)
- `engine-gmt/engine/ShaderFactory.ts` (63L; always-inject comment at 51-54 already canonical)
- `engine-gmt/engine/ShaderConfig.ts`
- `engine-gmt/engine/UniformSchema.ts` (~100L; side-effect import at 5-8 documented)
- `engine-gmt/engine/UniformNames.ts` (2L re-export shim)
- `engine-gmt/engine/managers/UniformManager.ts`
- `engine-gmt/engine/managers/ConfigManager.ts`

### JSDOC additions

**File: `engine-gmt/engine/ShaderFactory.ts`**
- Class header (line ~9): `@invariant buildShader calls feat.inject() for EVERY registered feature regardless of enabled state (line 50-56). Features that have a toggleParam MUST defensively emit empty stubs when disabled, or other code that references their functions (calculateShading, miss handler, post-process) will fail GL compile.`

**File: `engine-gmt/engine/ShaderBuilder.ts`**
- The 17-position assembly header at lines 1-26 is canonical — NO addition.
- Near the dedupe methods (around line 130-160): `@invariant addPreamble / addFunction / addPostDEFunction / addIntegrator dedupe by string equality via includes(code). Two features emitting semantically identical but textually different strings BOTH inject → duplicate function definitions → GL compile error. Convention: each feature emits a single canonical chunk constant, not a per-call template.`
- On `buildMeshSDFLibrary` (line 304): `@invariant Emits no #version, no void main — Mesh variant returns a GLSL LIBRARY, not a complete shader. Callers (mesh-export gpu-pipeline.ts) wrap it.`

**File: `engine-gmt/engine/SDFShaderBuilder.ts`**
- Top-of-file at lines 21-30 already documents the CP-mirror requirement. NO addition.
- On `buildEstimatorMath` (line ~100): `@invariant Falls back to Linear when estimator=5 (CuttingPlane) is requested but the formula does not declare supportsCuttingPlane. The cp_* globals (CP_PREAMBLE_GLOBALS) are emitted only when the primary OR interlace-secondary declares CP support (pairSupportsCP at line ~204).`
- On `CP_PREAMBLE_GLOBALS` (line 31): `@invariant Byte-shape-compatible mirror of CP_PREAMBLE / CP_INIT in engine-gmt/features/core_math.ts. Drift silently breaks Cutting Plane DE for one path or the other.`

**File: `engine-gmt/engine/UniformSchema.ts`**
- The side-effecting `registerFeatures()` at lines 5-8 already documents the contract. NO addition.
- On `UniformDefinition.backingOnly` (line ~19-21): already documented inline.
- After `featureUniforms` (around line 79-81): `@invariant Base-vs-feature collisions are silently filtered (uniqueFeatures = featureUniforms.filter(...)) with no warning. Feature-vs-feature collisions are NOT filtered — both definitions appear and UNIFORM_DEFAULTS's reduce overwrites last-wins. Convention: base uses generic names (uTime, uResolution, uCameraPosition); features use themed prefixes (uPT*, uLight*, uModular*). Enforced at code review only — see q-029.`

**File: `engine-gmt/engine/managers/UniformManager.ts`**
- On `syncFrame` (line ~64): `@invariant Ordering is load-bearing: adaptive resize -> image-tile sync -> camera basis -> uPixelSizeBase -> virtual-space -> time -> fog -> lights -> rotations. uPixelSizeBase derivation needs the post-adaptive viewportY value; lights need uCameraPosition zeroed first; virtual-space update needs uSceneOffsetHigh/Low handles wired before updateShaderUniforms runs.`
- On `syncFrame` (line ~64): `@invariant adaptiveSuppressed (bucket dialog / export in flight) hard-forces full res. Without it, the FBO resizes mid-export and briefly displays the cleared buffer.`
- On the light direction packing (around line 354-356): `@invariant uLightDir[i] stores direction TOWARD the light — negated and normalized before write. Every shader consumer (NdotL, shadows, volumetrics) uses it without per-consumer negation. Reversing the convention forces touch-ups in every chunk.`

**File: `engine-gmt/engine/managers/ConfigManager.ts`**
- On `syncUniform` (line ~61): `@invariant Skips isCompileTime params (would silently miss the rebuild trigger) and gradient-buffer values (storing the derived Uint8Array would corrupt the config — the source GradientStop[] lives elsewhere).`
- On `update` (line ~132): `@invariant Returns 4-flag diff (rebuildNeeded / uniformUpdate / modeChanged / needsAccumReset). Modular formula's pipelineRevision bump forces rebuildNeeded; bare pipeline updates without a revision bump set uniformUpdate + needsAccumReset only — so structural changes recompile but param-only changes stay runtime.`
- On `flushRebuildLog` / compile-log batching (around line 49-59, 201-207): `@invariant 50ms setTimeout coalesces synchronous chains of update() calls into ONE grouped log even if a shader rebuild happens between them. pendingLogChanges is shared across the chain.`

### ADRs to write

- **ADR-0043 — 17-position shader assembly order with always-inject contract**
  - **Context:** GMT's fragment shader is composed from 50+ feature-defined chunks plus core math/ray/trace/coloring/post. Position-of-emission matters: pre-DE functions can't call post-DE functions, integrators must come after trace, post-process after integrators, composite after post-process. A naive "concatenate in registration order" approach broke whenever a new feature was added between two existing ones. Disabled features that omit `inject()` create undefined-function errors when other features reference their entry points (e.g. `calculateShading` from the lighting feature is called by reflections).
  - **Decision:** `ShaderBuilder` provides 17 ordered positions (defines, uniforms, headers, core math, blue noise, coloring, preambles, pre-DE functions, DE body, post-DE functions, material eval, miss handler, ray-gen, trace, integrators, post-process, composite). Each position has a dedicated `addX()` method that pushes into a per-position storage field. `buildFragment()` walks positions 1-17 in order. `ShaderFactory.buildShader` calls `feat.inject()` for EVERY registered feature regardless of enabled state — features MUST defensively emit empty stubs when disabled. Add-methods that emit reusable chunks (addPreamble, addFunction, addPostDEFunction, addIntegrator) dedupe by string equality.
  - **Consequences:** The 17-position contract is the source of truth — the comment block at `engine-gmt/engine/ShaderBuilder.ts:1-26` and the Main template at lines 603-632 must stay in sync with the storage fields. Always-inject means features carry boilerplate stub branches; the cost is bounded vs the "undefined function" failure mode. Dedupe-by-string-equality means two features with semantically equivalent but textually different chunks both inject — convention: emit a single canonical constant. Variant gates (Physics 1-10, Histogram 1-10 + trace + ray-gen, Mesh 1-9 as library) reuse the same builder.

- **ADR-0044 — Single canonical per-frame uniform writer (`UniformManager.syncFrame`)**
  - **Context:** GMT's uniform set is large (>80 entries spanning camera basis, virtual-space split, fog linearization, light packing, rotation matrices) and many uniforms have non-trivial CPU-side derivations (ACES tonemap quadratic for fog linear color, Euler→matrix builds for rotations, per-light directional packing). Scattering these writes across per-feature systems caused stale-frame bugs (e.g. light direction written before camera basis when headlamp lights need camera quaternion). The path-traced renderer also needs adaptive resolution decisions every frame.
  - **Decision:** A single ordered pipeline in `UniformManager.syncFrame` (engine-gmt/engine/managers/UniformManager.ts:64) runs all per-frame uniform writes in load-bearing order: adaptive resize → image-tile sync → camera basis → `uPixelSizeBase` → virtual-space → time + env rotation → fog linearization → light packing → 3-stage rotation matrices. Adaptive resolution state is delegated to the generic `engine/AdaptiveResolution.ts` module via `tickAdaptiveResolution` so the same algorithm drives any iterative renderer.
  - **Consequences:** Adding a new uniform requires deciding which step it belongs to, not where to wire a new tick callback. The fork divergence is intentional: `engine/managers/` (engine-core) carries only `ConfigManager.ts`; `UniformManager` is engine-gmt-only because the steps above are GMT-renderer-specific. Light direction stored toward-light (negated at boundary) is a downstream-API invariant — every shader chunk depends on the convention. The `adaptiveSuppressed` flag (bucket/export in flight) hard-forces full res — without it the FBO resizes mid-export.

### CLAUDE.md rows

- "When changing `engine-gmt/engine/ShaderBuilder.ts`: 17-position assembly order is load-bearing (ADR-0043). Always-inject means disabled features still emit stubs — never skip `feat.inject()` for a toggle-off feature. Dedupe-by-string-equality on preamble/function/integrator: emit a single canonical chunk constant, not per-call templates. The Mesh variant emits a LIBRARY (no #version, no main) — mesh-export wraps it."

- "When changing `engine-gmt/engine/managers/UniformManager.ts`: `syncFrame` step order is load-bearing (ADR-0044). `uLightDir[i]` is direction TOWARD the light (negated at the boundary) — shaders use it without per-consumer negation. `uPixelSizeBase` is derived from the POST-adaptive viewport. `adaptiveSuppressed` hard-forces full res; bucket-render and export flows set it. UniformManager is engine-gmt-only — the sibling `engine/managers/` directory only carries `ConfigManager.ts`."

### Notes
- The base-vs-feature uniform collision filter (q-029) is captured as a JSDoc invariant rather than an ADR — it's an undocumented quirk, not a decision.
- The class-name collision `engine/ShaderBuilder.ts` (136L generic) vs `engine-gmt/engine/ShaderBuilder.ts` (635L) is documented at `docs/modules/engine-fork-rules.md` (cross-link, not duplicated here).
- The stale TODO in `engine-gmt/engine/ShaderConfig.ts:23-25` (q-100) lags engine-core direction; tracked in Code-Health, not promoted to JSDoc.

### DROPPED content
- Full 17-position table — restates the canonical comment at ShaderBuilder.ts:1-26.
- Full method tables for `ShaderFactory`, `ShaderBuilder`, `SDFShaderBuilder`, `UniformManager`, `ConfigManager` — restate exported signatures.
- Variant-gate position-coverage breakdown (Physics 1-10, Histogram 1-10+trace+ray, Mesh 1-9 lib) — captured by ADR-0043.
- 9-step `syncFrame` detail walk-through — captured by ADR-0044.
- Five mesh-shader generator method enumeration (`buildMeshSDFShader` through `buildMeshPreviewShader`) — read from source.

---

## docs/modules/engine-gmt/bucket-render.md

### Source files
- `engine-gmt/engine/BucketRenderer.ts` (90L; top-of-file 1-13 strong; shim contract documented)
- `engine-gmt/engine/GmtBucketHost.ts` (~280L; top-of-file 1-13 strong; SSAA `getSavedPixelSizeBase` 65-70 strong; aspect-override 89-96 strong)
- `engine-gmt/engine/worker/WorkerExporter.ts` (~890L; top-of-file 1-6 strong; session-state field comments 21-77 strong)
- `engine-gmt/engine/worker/WorkerHistogram.ts` (top-of-file 1-7 strong)
- `engine-gmt/engine/worker/WorkerDepthReadback.ts` (top-of-file 1-10 strong)

### JSDOC additions

**File: `engine-gmt/engine/GmtBucketHost.ts`**
- On `beginRender` (line ~78): `@invariant Aspect override (cam.aspect = outputW/outputH at line ~94) requires UniformManager.syncFrame to skip the cam.aspect re-sync while state.isBucketRendering is true (inline comment 89-96).`
- On `beginRender` (line ~78): `@invariant uFullOutputResolution is seeded ONCE here and held constant across image tiles; only reset in endRender.`
- On `beginGpuBucket` (line ~123): `@invariant Per-GPU-bucket setup writes RegionMin/RegionMax on materials, caches the bucket UV for convergence polling, and applies a pipeline SCISSOR over the bucket pixel rect. The shader still has a vUv-based discard, but scissor is the actual perf-saving mechanism — the discard still costs a history fetch + MRT write per pixel.`
- On `beginGpuBucket` (line ~123): `@invariant Convergence state is per-GPU-bucket, not per-image-tile: convergenceRequested and cachedConvergenceResult reset every beginGpuBucket.`
- On `isCurrentBucketConverged` (line ~152): `@invariant config.convergenceThreshold is a PERCENT — host divides by 100 (line 160). Callers passing raw 0-1 would silently never converge.`
- On the bloom routing in `getReadbackMaterial` (around line 201-208): `@invariant Bloom resolution branches on fullOutput > originalSize (output-upscaled), NOT on whether tiling is active. exportMaterial.uEncodeOutput = 1.0 is mandatory for the bucket readback path — the export material's shader has both encoded and unencoded branches.`
- On `onTileBlitToScreen` (line ~219): `@invariant Must call gl.getContext().flush() (line 239). three.js doesn't always flush after a single render to the default framebuffer; removing the flush can leave the canvas blank on Refine View.`
- On `endRender` (line ~242): `@invariant Pipeline scissor AND region uniforms must BOTH be reset here. Otherwise the next viewport frame's region mask discards everything outside the last bucket. savedPixelSizeBase_ must be cleared (line 277); while >0 it forces FractalEngine.compute() to override uPixelSizeBase.`

**File: `engine-gmt/engine/worker/WorkerExporter.ts`**
- Top-of-file already strong. NO module-level addition.
- On `start` (line ~130): `@invariant 2-px boundary alignment is chroma-subsampling safe — most H.264/H.265 encoders require even dimensions. renderW/H = safe * internalScale for accumulation RTs.`
- On encoder config (around line 226-249): `@invariant Encoder bitrate stacks BITRATE_MULTIPLIER * 2.5. The MULTIPLIER is Mbps→bps unit conversion (data/constants); the 2.5x is a content-specific CBR-undershoot correction. Tuning the user-facing slider requires accounting for both, plus the Firefox OpenH264 Level-4.0 ~31 Mbps cap. See q-114 for the doc-gap analysis.`
- On `renderOnePass` (line ~364): `@invariant config.samples >= 1 required. Clears accumA then writes to it at s=0. Bloom is applied on beauty only — alpha and depth passes write greyscale luminance to the alpha channel and bloom would smear it.`
- On `renderOnePass` (line ~421-433): `@invariant Pixel-buffer Y-flip is IN PLACE. For odd height, halfH = floor(h/2) correctly leaves the middle row untouched (it is its own mirror). Do not change to ceil.`
- On `renderFrameImageSequence` (line ~482): `@invariant uOutputPass MUST be reset to 0 before the preview blit (lines 519-526) so the viewport always shows beauty even when the rendered passes were alpha/depth.`
- On `handleEncodedChunk` (line ~679): `@invariant First-chunk PTS normalization is PER-TRACK — video and audio offsets are independent because audio enters the encoder later and has its own priming delay. Duration is hardcoded to 1/fps because Firefox does not echo the source VideoFrame.duration.`
- On `cleanup` (line ~868): `@invariant One-shot — if (!this.session) return at the top is what makes cancel() and finish() both safe to call. Idempotent teardown.`

**File: `engine-gmt/engine/worker/WorkerDepthReadback.ts`**
- Top-of-file already strong. NO module-level addition.
- On the async readback path (line ~90): `@invariant Reads from pipeline.getPreviousRenderTarget(), NOT the current one — reading the in-flight render target would race the active render.`
- On the PBO allocation (line ~103-112): `@invariant PBO size depends on float format — 8 bytes for half-float (RGBA + HALF_FLOAT), 16 bytes for float (RGBA + FLOAT). Mismatched sizes silently corrupt the readback.`
- On the depth-vs-sky filter (line ~75, 80, 126, 150, 168): `@invariant Depth is read from the alpha channel of the accumulation RT. Anything else in alpha (e.g. coverage during alpha-pass export) would clobber lastMeasuredDistance. The export path explicitly skips the probe during alpha export; the worker tick path does NOT gate on uOutputPass.`
- On focus-pick state machine (line ~131): `@invariant Three phases: pending (set by startFocusPick) → on the next tick the entire depth buffer is snapshotted, the clicked pixel is read, FOCUS_RESULT is posted, state → ready → subsequent sampleFocusPick reads from cached snapshot until endFocusPick clears it.`

**File: `engine-gmt/engine/worker/WorkerHistogram.ts`**
- Top-of-file already strong. NO module-level addition.
- On `handleHistogramReadback` (line 43): `@invariant Color source path silently no-ops (posts Float32Array(0)) when pipeline.getOutputTexture() is null. Main-thread consumer must handle this.`
- On `histogramPass.mesh.material` reassignment (lines 54 and 77): `@invariant Per-call material swap — the module-singleton assumption breaks if a future geometry-and-color side-by-side UI ran two histograms concurrently from the same worker.`
- On the geometry source path (line ~53-70): `@invariant Must zero uCameraPosition (line 62). virtualSpace.updateShaderUniforms has already written the high/low offset split.`

**File: `engine-gmt/engine/BucketRenderer.ts`**
- Top-of-file already strong. NO module-level addition.
- On `update` (line 60): `@invariant Ignores the _gl argument. The renderer is sourced from the host's engine ref. Signature kept for pre-extraction compatibility (FractalEngine, renderWorker, handleRenderTick call this with their renderer).`

### ADRs to write

- **ADR-0045 — Per-frame video/image-export pipeline separate from bucket render**
  - **Context:** Two high-resolution output paths exist in GMT: (1) "bucket render" / Refine View — single still image potentially larger than the viewport, requiring GPU-tile loops for VRAM safety AND image-tile loops for very-large outputs, with async convergence polling per bucket; (2) timeline video / image-sequence export — fixed per-frame resolution, fast turn-around, accumulation via ping-pong RTs, audio mux, encoder bitrate considerations. Earlier prototypes used the bucket renderer for both, but path-traced video export ground to halt because each frame ran the full image-tile + bucket-spiral lifecycle.
  - **Decision:** Two separate drivers sharing `engine.materials.exportMaterial`, the `BloomPass`, and the post-process fullscreen-pass pattern but otherwise structurally distinct. `BucketRenderer`+`GmtBucketHost` drive single-image rendering via the generic `BucketRunner`. `WorkerExporter` allocates its own ping-pong accumulation RTs and walks frames N=samples times per frame, never going through BucketRunner. Both live on the worker side of the boundary. WorkerExporter handles AAC/Opus audio mux, first-chunk PTS normalization (Firefox leading-latency fix), 2-px boundary alignment for chroma-subsampling-safe encoder output, per-frame fire-and-forget file I/O via `imageWriteChain`, and encoder bitrate stacking (`BITRATE_MULTIPLIER * 2.5`).
  - **Consequences:** Two code paths to maintain — convergence polling lives in GmtBucketHost; ping-pong sample loop lives in WorkerExporter. They share neither buffer nor lifecycle but DO share BloomPass + exportMaterial — changes to either ripple to both. The `2.5x` bitrate correction is duplicated at `engine/export/videoEncoder.ts:114` for the main-thread capability probe (which deliberately omits the `2.5x` for capability tests). `12 Mbps` Firefox H264 cap UI in `RenderPopup.tsx` is derived from the same constant — any change to the `2.5x` lands in 4 places simultaneously (q-114). The "render-into-target-and-read-it-back" pattern recurs across `WorkerDepthReadback` (async PBO + fenceSync) and `WorkerHistogram` (128x128 RT + Float32 readback) — the three worker readback subsystems are sibling consumers of the same pipeline / materials / BloomPass triad.

### CLAUDE.md rows

- "When touching bucket-render or export pipelines (`engine-gmt/engine/GmtBucketHost.ts`, `engine-gmt/engine/worker/WorkerExporter.ts`): two separate drivers, ONE shared `exportMaterial` + `BloomPass` (ADR-0045). `config.convergenceThreshold` is a percent (host /100). `exportMaterial.uEncodeOutput = 1.0` is mandatory for bucket readback. `onTileBlitToScreen` MUST `gl.flush()`. Image-sequence preview blit MUST reset `uOutputPass = 0` so viewport shows beauty. Encoder bitrate stacks `BITRATE_MULTIPLIER * 2.5` — see ADR-0045 / q-114. `cleanup()` is one-shot — `cancel()` and `finish()` both safe to call."

### Notes
- q-112 (`MAX_SKY_DISTANCE` vs hardcoded `< 1000`) was fixed 2026-05-20 — no JSDoc needed; carry-in pointer remains in module doc.
- The "two-distinct-concepts" vocabulary (GPU bucket vs image tile) is preserved by pointer in the historical context — the lifecycle hooks `beginImageTile` / `beginGpuBucket` are the load-bearing naming convention.
- `GmtBucketHost`'s SSAA override (`savedPixelSizeBase_`) is documented inline at lines 65-70 and 87 — JSDoc additions tighten the invariant.

### DROPPED content
- Full method table for `BucketRenderer` shim, `GmtBucketHost`, `WorkerExporter`, `WorkerHistogram`, `WorkerDepthReadback` — restate signatures.
- Per-pass video / image-sequence file naming + extension matrix — read from source.
- Audio encode 1024-frame chunking detail — restates inline comment in WorkerExporter.ts.
- Full async-PBO + fenceSync state machine walk-through — captured by ADR-0045 cross-reference.

---

## Summary

- **JSDoc additions:** ~10 invariants per module, file:line-cited. Skipped redundant top-of-file blocks (mobile-layout files, CompileScheduler header, BucketRenderer/GmtBucketHost headers, WorkerExporter/WorkerDepthReadback/WorkerHistogram headers, SDFShaderBuilder header, 17-position ShaderBuilder header all already strong).
- **ADRs:** 10 total — 0036 + 0037 (features), 0038 + 0039 (mobile-layout), 0040 + 0041 + 0042 (renderer), 0043 + 0044 (shader-pipeline), 0045 (bucket-render). Full allocation 0036-0045.
- **CLAUDE.md rows:** 7 total (2 + 1 + 2 + 2 + 1 — within 0-2 per doc cap; bucket-render gets one combined row).
- **Dropped content:** Per-symbol API tables, prop tables, exhaustive signature enumerations, algorithm walk-throughs that exist as inline comments or pointers to read-only design docs.
