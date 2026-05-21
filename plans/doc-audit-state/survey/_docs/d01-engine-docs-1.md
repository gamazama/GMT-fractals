---
batch_id: d01-engine-docs-1
audited_at: 2026-05-20T00:00:00Z
files:
  - path: docs/engine/01_Architecture.md
    blob_sha: 2e28552b34b192beac915d788875d8bf01eca537
    lines_read: [1, 193]
  - path: docs/engine/02_Feature_Registry.md
    blob_sha: 24b74376cdcbd90fce00d1bd744d69caa59b3fbd
    lines_read: [1, 197]
  - path: docs/engine/03_Plugin_Contract.md
    blob_sha: 88fcdc61c4c2a96c6d3b6dc3a2a4ad4f7579af33
    lines_read: [1, 203]
  - path: docs/engine/04_Core_Plugins.md
    blob_sha: eeaa8d5ed8a93dd166cf39078f356e29ddeb5b4f
    lines_read: [1, 237]
  - path: docs/engine/05_Shared_UI.md
    blob_sha: 7d5782a5dcee2ff57e08c66ce326b1426aa97549
    lines_read: [1, 205]
  - path: docs/engine/06_Undo_Transactions.md
    blob_sha: ab32acdf16e2dbcacb3c0cdce8bfec46c663bb3e
    lines_read: [1, 184]
  - path: docs/engine/07_Shortcuts.md
    blob_sha: e3dde1b468a74beecfafab64e766bcc67b7315bb
    lines_read: [1, 212]
  - path: docs/engine/08_Animation.md
    blob_sha: bec46c0b14a6d3863cd5e081eeae0dc40c3d07b2
    lines_read: [1, 363]
  - path: docs/engine/09_Bridges_and_Derived.md
    blob_sha: e0a3af97c7e6e05f3252c6b4950f8c78538d3164
    lines_read: [1, 217]
  - path: docs/engine/10_Viewport.md
    blob_sha: 4c495e344e6488a12ac38a3eb35cbd02b665b8d0
    lines_read: [1, 324]
---

## docs/engine/01_Architecture.md
Foundation doc laying out the engine's three-tier model (core / core-plugins / apps), the render-loop contract, and the canvas/viewport ownership split. Articulates five design principles ("generic by default, hoist patterns at first duplicate, no duplicate UX, follow GMT patterns when porting, apps write features"). Documents store topology (`engineStore` rename, feature state namespaced under `store[featureId]`), phase semantics (SNAPSHOT/ANIMATE/OVERLAY/UI), and explicitly enumerates opinions the engine is NOT holding (renderer, routing, theming, state library, build tool). Includes dated decisions (2026-04-22) on core+bundled-plugins vs minimal/opinionated, app-owns-canvas, explicit render-loop contract.
Key decisions:
- Three-tier model; core has no opinion on chrome/shortcuts/save-load
- App owns canvas, engine owns DOM viewport host (`<ViewportArea>` is a DOM host)
- Engine does NOT spawn RAF; apps install `@engine/render-loop` or call `runTicks` themselves
- Feature state always namespaced under `store[featureId]`
- Zustand assumed; Tailwind currently baked into primitives
Preservable: The five rules + their rationale (especially "hoist patterns at first duplicate" with `trackBinding.ts` as canonical example); the explicit "opinions we're NOT holding" list; rejection rationale for minimal core and opinionated engine alternatives; the GMT-as-senior-dependency framing for porting strategy; aspiration that GMT itself eventually ports onto the engine as a plugin with minimal formula-specific rewriting.
MAY BE STALE: `engineStore` rename ("tentative"); plugin folder split under `engine/plugins/` may not be complete; `installRenderLoop()` is documented but doc 04 says it ships as `<RenderLoopDriver />` component (no install function).

## docs/engine/02_Feature_Registry.md
Specifies `defineFeature` shape, what gets auto-derived at registration (Zustand slice, setter, undo snapshot, animation tracks, preset serialization, UI panel), and param-type→interpolator table. Covers isolation via `dependsOn`, lifecycle hooks (onActivate/onDeactivate/onParamChange/shouldRender), freeze-at-store-construction rule, and the `useFeatureParam` per-leaf subscription pattern to avoid re-render storms. Documents cache-keyed shader re-injection and lists demo feature as reference. Decisions section codifies registry freeze, explicit dependsOn, first-class `mode` via enum type, and v1 whole-gradient crossfade.
Key decisions:
- Registry frozen post-store construction; throws in dev, no-ops in prod
- Isolation enforced via explicit `dependsOn` (audit showed lint catches only ~60%)
- Modes are first-class via `enum` param type, not ad-hoc strings
- Gradient interpolation is whole-gradient crossfade in v1; per-stop is future work
- Unknown param types throw at registration (no silent dead tracks)
Preservable: The "one file per feature" aspiration; the six auto-derivations enumerated explicitly; the GMT audit findings (silent setter-name mismatch, per-leaf-subscription performance cliff, lint catching only 60% of isolation cases) that motivate the strict-enforcement choices; per-stop gradient as future direction.
MAY BE STALE: Whether all six auto-derivations are actually wired (tabConfig auto-dock placement may be aspirational); `useFeatureParam` may not exist as documented; `ctx.read`/`ctx.emit`/`ctx.getGeneration` lifecycle context API may be partially implemented.

## docs/engine/03_Plugin_Contract.md
Defines the three-file plugin pattern (`registerFeatures.ts` side-effect / store creation / `setup.ts` post-mount), with explicit boot timeline (t=0..t=∞) and failure-mode table mapping each contract violation to dev-throw vs prod-warn behavior. Differentiates "data-loss risk" failures (throw in both) from "graceful-degrade" failures (dev-only throw). Documents `install*()` idempotency, opt-out semantics for every core plugin, and `applyDefaultPanelLayout` convenience. Decisions favor three-file split over single-function install and differentiated error severity.
Key decisions:
- Three-file contract (not one-function registration) — registration must run before store creation
- Freeze errors in dev / warn in prod for isolation; throw both for duplicates (data-loss risk)
- `install*()` is idempotent; calling twice is no-op
- All core plugins are opt-out; headless harness can skip all
Preservable: The boot timeline with explicit t=0..t=∞ stages; the failure-mode table mapping each violation to its dev/prod behavior with rationale; the dev-vs-prod severity distinction philosophy ("shipping app shouldn't crash for missing overlay, but silent ID overwrite would surprise"); aspiration that GMT itself ports as an "apex reference" plugin.
MAY BE STALE: `applyDefaultPanelLayout` helper existence; whether `engineCapabilities.hasAnimation` style capability checks exist; exact error class names (`FeatureRegistryFrozenError`, etc.).

## docs/engine/04_Core_Plugins.md
Plugin ship-status table (eight shipped as of 2026-04-23, `@engine/environment` not built) with per-plugin install signatures, source paths, and rationale. Documents screenshot-folding-into-scene-io decision (byte-for-byte identical output to "Save PNG…"), camera plugin's adapter-based design (no canonical CameraState — different shapes for 2D fluid vs 3D orbit vs 6-DOF), and topbar slot-registration with id-keyed replace semantics. Render-loop ships as `<RenderLoopDriver />` React component, not `install*()`. Animation plugin still named `installModulation()` for historical reasons; rename to `installAnimation()` is candidate.
Key decisions:
- Nine planned core plugins; eight shipped, environment plugin not built
- Screenshot folded into scene-io (no duplicate UX rule)
- Camera plugin is adapter-based; opaque JSON state, app defines captureState/applyState
- Topbar uses id-keyed slot registration; re-register replaces (idempotency)
- Render-loop is a React component, not an install function
- `Alt+S` chosen for screenshot hotkey (Ctrl+S/Ctrl+Shift+S browser-reserved)
Preservable: Camera adapter rationale (the three different camera shapes — 2D `{center,zoom}`, 3D orbit, 6-DOF — that prevent canonical shape); the screenshot-folding story as canonical example of "no duplicate UX" rule; rejected alternatives (auto-install everything, append-only slot registration); hotkey-choice rationale; `installModulation` → `installAnimation` rename candidate as historical naming debt.
MAY BE STALE: Marked statuses ("shipped phase 2/3/4/5") may not match current code; `@engine/environment` placeholder partially absorbed by `useMobileLayout` per the note — unclear current state; `installModulation` may have been renamed; default TopBar registrations (ProjectName left:0, HelpMenu right:0) likely aspirational.

## docs/engine/05_Shared_UI.md
Catalogs UI primitives (Slider, Knob, ToggleSwitch, ColorPicker, AdvancedGradientEditor, etc.) and composite components, with each row mapping the primitive to the contexts it consults. Codifies the "primitive must not import the store" rule with opt-in context pattern (AnimationContext, UndoContext, ContextMenuContext, ShortcutContext, FeatureCompileContext). AdvancedGradientEditor framed as the litmus test for the pure-primitive rule. Decisions cover OKLab as default color interpolation (perceptual uniformity), useFeatureParam as canonical binding hook, and Tailwind-current-with-CSS-variables-future-table.
Key decisions:
- All primitives are pure; capabilities via React context, not imports
- AdvancedGradientEditor promoted to engine-level shared primitive
- OKLab as default color interpolation (RGB lerp passes through muddy grays)
- `useFeatureParam(featureId, paramId)` is canonical binding hook
- No CSS-in-JS; Tailwind utility classes; theme tokens in tailwind.config
Preservable: The opt-in context pattern itself (one capability per context, providers wrap subtrees, consumers gracefully degrade); AdvancedGradientEditor litmus-test framing; OKLab rationale from GMT session retrospective ("colors washing out" until OKLab adopted); the audit-gate aspiration ("before 1.0, grep every primitive for `useEngineStore`/`useFractalStore` imports"); the long-term Tailwind→CSS-variables direction (on the table, not scheduled).
MAY BE STALE: This entire doc is likely largely aspirational per audit context; whether primitives currently satisfy the "no store import" rule; existence of context providers (UndoProvider, AnimationProvider, PaletteLibraryContext); `useFeatureParam` hook; `<Hint>`, `<NumberInput>`, `<DraggableWindow>` may not exist with documented APIs.

## docs/engine/06_Undo_Transactions.md
Per-scope (param/camera) transaction stacks, with a 2026-04-30 migration note recording the explicit revert from a unified-with-tags stack design. State shape, public API (`beginParamTransaction`/`endParamTransaction`/`pushCameraTransaction`, scoped `undo/redo/canUndo/canRedo/peekUndo/peekRedo`), backward-compat shims, and hotkey routing table covering Mod+Z (param), timeline-hover scope (animationStore), and Ctrl+Shift+Z (camera). Documents diff-based storage (only changed keys), 1500ms camera-undo debounce, preset-load-clears-history, and animation-history-intentionally-separate (F2b unification deferred).
Key decisions:
- Per-scope stacks (revert from unified-with-tags) — `scope` required on every public history call
- Typed `pushCameraTransaction(state)`; retire overloaded `handleInteractionStart`
- Patches (diff) not full snapshots
- Preset load clears all stacks (avoids paradoxical states)
- Animation history stays separate in `animationStore.undoStack` (F2b deferred)
- Undo/Redo topbar buttons operate on param scope only — never speculate on intent
Preservable: The full unified-vs-per-scope migration story (the two structural failure modes — implicit-scope conflation and untyped overload at entry); the "Ctrl+Z popped a camera move when the user meant to undo a slider tweak" bug class as motivating evidence; rejected alternative of "keep one stack, default unscoped to skip camera"; non-undoable state philosophy (no `undoable: false` flag yet; future direction is dedicated `ui` slice that snapshotter skips); F2b deferral rationale ("not on current critical path").
MAY BE STALE: Less stale than most engine docs — this one was substantively rewritten 2026-04-30 with a migration note that suggests it's been reconciled with code more recently. F8 (UI-scope undo) explicitly flagged as limitation.

## docs/engine/07_Shortcuts.md
Pluggable shortcut registry replacing GMT's `useKeyboardShortcuts` central hook. Documents registration API, key syntax with `Mod` abstraction (Ctrl on Win/Linux, Cmd on Mac), scope stack with push/pop semantics, resolution order (scope > priority > insertion order), and text-input guard with range-input opt-out preserved from GMT. Includes canonical shortcut tables per plugin (undo/animation/camera/scene-io). Dev tooling exposes `shortcuts.list/lookup/trace`. Decisions favor registry-over-hook, Mod-abstraction, scope-beats-priority tiebreak, and range-inputs-NOT-ignored.
Key decisions:
- Registry replaces central hook (declarative, scope-aware)
- `Mod` key abstraction (Ctrl on Win/Linux, Cmd on Mac)
- Scope beats priority in resolution tiebreak (user intent affinity)
- Range inputs are NOT in the ignore list (sliders keep arrow-keys and Ctrl+Z)
- Re-registration by id is idempotent replace
Preservable: The audit findings that motivated the registry (one big switch statement, can't disable during modal, can't rebind without fork, ad-hoc `isTimelineHovered` threading); scope-beats-priority rationale with the timeline-hover Ctrl+Z example; range-inputs-not-ignored as preserved GMT good UX; aspiration of `smoke:audit-shortcuts` test that would fail on missing descriptions; rebinding-UI affordance (apps read `shortcuts.list()` and persist user config).
MAY BE STALE: Whether the registry is fully implemented vs partially; `shortcuts.trace`, `shortcuts.lookup` dev tooling; the canonical shortcut tables likely partly aspirational; `smoke:audit-shortcuts` test does not exist.

## docs/engine/08_Animation.md
Most complete and reconciled engine doc — explicit scope-split note pointing at `gmt/04_Animation_Engine.md` for app-specific implementation. Documents current implementation (phase 5): `installModulation()` registers GMT's production `AnimationSystem.tick(delta)` into `TickRegistry.ANIMATE` verbatim. Binder resolution table covers six cases (camera.active_index / camera.unified / legacy lights / lighting DDFS / DDFS feature.param / root-prop scalar). Detailed coverage of `trackBinding.ts` (canonical DDFS track-ID derivation collapsing four inlined copies), `binderRegistry` (explicit binders escape hatch shipped 2026-04-23), `cameraKeyRegistry` (keyframe-capture complement), log tracks (log-value-space interpolation for params spanning many decades), and camera pairs (linear-in-zoom pan formula with DD-precision panLow accumulators).
Key decisions:
- Engine reuses GMT's `AnimationSystem.tick` verbatim — zero reinvention
- Vec track-ID uses UNDERSCORE form (`feature.param_x`); F12 fix 2026-04-23
- BinderRegistry as escape hatch when convention breaks (composite cameras, non-standard setters, non-feature globals)
- cameraKeyRegistry separates keyframe-capture (read) from binderRegistry (write)
- Log tracks use `exp(lerp(log v0, log v1, t))` for constant rate-of-change in scale
- Camera pairs use linear-in-zoom closed-form pan formula (`pan = c0 + (c1−c0)·(zT−z0)/(z1−z0)`)
- panLow DD-precision lerp (Knuth two-sum + Veltkamp-split) for ~1e-32 precision through tween
- Tangent modes follow Maya/Blender (Auto/Ease/Aligned/Unified/Free; Aligned default)
- de Casteljau split for curve-preserving keyframe insert
- `setFps(newFps, mode)` with explicit Keep/Match (rescales keyframe.frame + handle.x)
- Deterministic playback throttles to project fps (accumulates wall-clock dt, emits integer frames at ≥1/fps)
- Track-selection actions split by intent (replaced boolean polymorphism)
- Recording always uses captured snapshot as clean base; scrub also reads from snapshot during modulation recording
- Whole-gradient crossfade for v1 gradient tracks
Preservable: The full rationale for log-value-space interpolation (linear lerp on `julia.zoom` 1→1e-30 collapses 99.999% of timeline to one extreme); camera-pair linear-in-zoom math justification (pan whips at deep zoom because world-units-per-frame stays constant while world shrinks exponentially); DD-precision two-sum/Veltkamp-split for sub-f64 quiet motion past e-30; Maya/Blender tangent-mode convention adoption ("GMT was single Unified mode that lost user per-side length intent"); de Casteljau split rationale (Auto-tangents produce visible kinks on hand-shaped curves); FPS Keep/Match modes (DCC tool parity); deterministic playback motivation ("preview matched export frame-for-frame"); the F5/F6/F7/F12/F13 fragility lineage with which are fixed; the F2b deferral.
MAY BE STALE: F5 still 🟡 partial, F6 still 🔴 open, F7 still 🔴 open — these may have shifted; whether `binderRegistry`, `cameraKeyRegistry`, `cameraPairRegistry`, `logTrackRegistry` all exist as documented; `modulation.attach/detach`, `animation.subscribeTrack` APIs.

## docs/engine/09_Bridges_and_Derived.md
Defines three coordination patterns (`dependsOn` direct read, `derive()` computed fan-out, `bridge()` bidirectional) replacing GMT's window-global store handles, circular imports, `set${Feature}` side-channels. Documents tick cadence (`onChange` default, `perFrame` opt-in), write-declaration validation, transaction scope (`'bridge'`, not undoable by default), and observability via `bridgeRegistry.list()` / `derivedRegistry.list()`. Worked examples (audio-drives-fluid-decay, derived-camera-target-distance, animation-record-guard) and migration notes mapping GMT's AnimationSystem.tsx + EngineBridge.tsx into explicit bridges. Decisions favor two mechanisms (not one), `onChange` default (flipped from earlier proposal), declared writes, non-undoable by default.
Key decisions:
- Two explicit mechanisms (`derive` for one-way computed, `bridge` for bidirectional)
- `onChange` is default tick cadence (flipped from earlier per-frame default)
- Writes must be declared (whole point of bridges is visibility)
- Bridge writes are not undoable by default (modulation would flood stack)
- Derived values are one-way; write-back requires bridge instead
Preservable: The whole tripartite coordination taxonomy (`dependsOn` / `derive` / `bridge`) as the engine's stated alternative to GMT's ad-hoc patterns; the F7 (animationStore↔fractalStore circular via `window.useAnimationStore`) as the canonical problem this design solves; the rationale for two mechanisms (different semantics benefit from different APIs, intent visible at call site); the onChange-default flip (most coordination is event-shaped, not frame-shaped); migration aspirations (AnimationSystem.tsx → animation-record-guard, EngineBridge.tsx → set of per-subsystem bridges, light-auto-focus → gizmo bridge).
MAY BE STALE: This is one of the most aspirational engine docs — derive/bridge mechanisms likely partially or not built; `bridgeRegistry`/`derivedRegistry`/`useDerived` hook existence unclear; the three migration targets (AnimationSystem, EngineBridge, light-auto-focus) likely still in their original GMT-style implementations.

## docs/engine/10_Viewport.md
Most thorough plugin doc — full audit table mapping current GMT/engine symbols (canvasPixelSize, dpr, resolutionMode, fixedResolution, PerformanceMonitor, FractalEngine.holdForAdaptive, toy-fluid's effectiveSimRes, etc.) to plugin destinations with GENERIC / SEMI-GENERIC / fractal-specific / app-specific classifications. Documents public API (hook + imperative setMode/setFixedResolution/setAdaptive, subscriptions, reportFps/holdAdaptive/suppressAdaptive), state shape under `store.viewport`, registerable suggestion-list for `<PerformanceWarning>`, and adaptive-quality unification note (2026-04-26: pure decision module in `engine/AdaptiveResolution.ts` shared with GMT worker-side `UniformManager.syncFrame`). Open questions cover R3F-Canvas as plugin-vs-default, renderRegion/previewRegion ownership, snap-to-8 universality, and mobile DPR defaults (resolved: future `@engine/environment` plugin owns environmental signals, viewport consults via bridge).
Key decisions:
- Plugin owns dimensions + interaction + adaptive; app owns canvas + quality mapping
- `qualityFraction` is continuous `[0, 1]`, not enum
- `engageOnAccumOnly` flag for apps where accumulator is truth signal (fluid-toy)
- Registerable suggestion list for `<PerformanceWarning>`
- One authoritative ResizeObserver on flex-1 div (not canvas)
- Canvas ownership via `canvasSlot` prop
- Environmental signals (isMobile, isFirefox, GPU queries) NOT viewport-internal; future `@engine/environment` plugin
- Adaptive algorithm extracted to `engine/AdaptiveResolution.ts` pure decision module (2026-04-26)
Preservable: The 80%/20% framing (size modes/DPR/adaptive shared; what "reduce quality" means is app-specific); the full audit-table classification methodology (GENERIC / SEMI-GENERIC / fractal-specific / app-specific); GMT vs toy-fluid duplication story as motivation; rejected alternatives (qualityFraction as enum, plugin-creates-canvas, plugin bakes mobile detection); the 6-step extraction sequence as a plan document; the open-questions section as design negotiation in-progress; future `@engine/environment` plugin scope (isMobile, isFirefox, maxGPUTextureSize, hardwareConcurrency, touch-vs-mouse).
MAY BE STALE: Per audit context this doc is largely aspirational; whether `useViewport` hook + full API surface ships; `engageOnAccumOnly` flag; `<AdaptiveResolutionBadge>` topbar integration; suggestion registry; renderScale segmented picker UI; whether `canvasSlot` prop exists vs hardcoded R3F Canvas; toy-fluid integration may differ from documented `useEffect` example. F4 fix references (3-second dev warning) may not be wired.
