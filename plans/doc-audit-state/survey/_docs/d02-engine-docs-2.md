---
batch_id: d02-engine-docs-2
audited_at: 2026-05-20T00:00:00Z
files:
  - path: docs/engine/11_Plugin_Authoring.md
    blob_sha: 047b6c5a043085a81ea6c8dac0a673b14326e1ae
    lines_read: [1, 233]
  - path: docs/engine/11_TSAA.md
    blob_sha: 086e235251205702b43f55a3db4ebe4a7b30f337
    lines_read: [1, 228]
  - path: docs/engine/12_App_Handles.md
    blob_sha: b5c7b06074d345a27498e8b824ded47aa72b0c93
    lines_read: [1, 116]
  - path: docs/engine/13_Extracting_From_GMT.md
    blob_sha: 4561ea8cb71f9c430a12d61614b62bdcefaa40d2
    lines_read: [1, 87]
  - path: docs/engine/14_Panel_Manifest.md
    blob_sha: 171a71cfa79371a519349db405a680161f90130f
    lines_read: [1, 168]
  - path: docs/engine/15_Camera_Manager_Extraction.md
    blob_sha: 368c999fa168e3a809b49be56e49da95701aeb6e
    lines_read: [1, 257]
  - path: docs/engine/16_Type_Augmentation.md
    blob_sha: ef04f5760621b805b40802d3f9a286ec12b4a118
    lines_read: [1, 195]
  - path: docs/engine/17_Mobile_Layout.md
    blob_sha: ef4346aafb4a7eb56549f01c18765a6297962e2c
    lines_read: [1, 163]
  - path: docs/engine/20_Fragility_Audit.md
    blob_sha: 7124d7bb33b3d133dabde16bc9d16a5580c59162
    lines_read: [1, 382]
  - path: docs/engine/21_Code_Review_2026-04-25.md
    blob_sha: a9190fc313cf009d2938d90af6cb21ba9addede9
    lines_read: [1, 184]
---

## docs/engine/11_Plugin_Authoring.md

Authoring recipe for engine-core plugins (the "slot host" kind: TopBar, Menu, Hud, Help, Shortcuts). The contract: module-scope registry + idempotent `installX()` + `uninstallX()` + `<XHost />` using `useSyncExternalStore` with a monotonic `_rev` snapshot. Seven rules (R1-R7) plus a testing checklist and reference-implementation table. Note: doc 21 found this contract is NOT universal — Camera/Undo/Viewport/Shortcuts use other patterns and the doc should be reframed as "slot-host plugin" recipe.

Key decisions:
- Module-scope registry over `createContext` (non-React code must be able to register before React mounts).
- Monotonic `_rev` counter as `useSyncExternalStore` snapshot (cheap, stable, avoids re-allocating iteration views).
- `install + Host` split: imperative install (default registrations, subscriptions) vs declarative Host (subscribes and renders).
- Cross-plugin composition through peer's public API only — never reach into `_items` or `_subscribers`.

Preservable:
- The seven plugin rules — particularly R2 (never import engine store at module scope, defer via `getStore()` or `globalThis.__store`) ties directly to F1 frozen-registry trap.
- Idempotency requirement: two bundles will both call `installX()` — second must be a no-op.
- `when: () => boolean` predicate over conditional registration — predicate re-evaluates each render, conditional registration freezes at boot.
- Dev-only `window.__myThing` expose for Playwright smoke tests; guard on `import.meta.env.DEV`.
- Reference plugins table — TopBar (original 3-slot), Menu (per-menu sub-registries), Hud (7 slots no engine widgets), Help (cross-plugin composition pattern), Shortcuts (non-React, same registry shape).

MAY BE STALE:
- The "uniform contract" framing — doc 21 explicitly contradicts this. Needs reframing to "slot-host plugins" with a separate note for subscription-style plugins.
- TopBar.tsx as a reference: it had the B1/F16 mutable-Map snapshot bug (fixed 2026-04-25) — should now match the Menu/Hud `_rev` pattern, but the cross-ref still says it's the "original slot-based pattern."

---

## docs/engine/11_TSAA.md

Unified Temporal Super-Sampling + Adaptive Resolution protocol shared across renderer plugins (path tracer, fluid sim, future particle systems). Two engine-core modules: `AccumulationController` (protocol) and `AdaptiveResolution` (pure FPS-driven decision algorithm, no DOM/THREE/worker). Binds to store via `installAccumulationBindings`; consumers either subscribe to `qualityFraction` (main-thread renderers like fluid-toy / fractal-toy) or call `tickAdaptiveResolution` themselves (worker-internal, like GMT). Doc covers the unification rationale (pre-merge logic drifted between `viewportSlice.reportFps` and `UniformManager.syncFrame`), the algorithm steps, the GMT vs fluid-toy consumption flows, and a plumbing-pitfalls audit checklist.

Key decisions:
- One algorithm, one set of tuning constants, one place to fix bugs (replacing two divergent implementations).
- `AccumulationController` is a thin contract; engine-core ships an inert stub at `engine/worker/WorkerProxy.ts`.
- FluidEngine does NOT implement `AccumulationController` — interface's `isPaused` semantics ("no new samples added") conflate with fluid-toy's three distinct pause concepts (TSAA toggle, sim pause, sampleCap). Direct wiring kept; revisit if a second main-thread accumulating renderer arrives.
- Grace period is FPS-scaled: `clamp(2000/stillFps, 100, 3000)` — replaces fixed `activityGraceMs`.
- `gateOnAccumOnly: true` mode — fluid-toy uses this so vorticity-slider tweaks don't drop quality (only fractal-invalidating activity engages adaptive).
- Two channels for worker-bound state: event-bus broadcasts vs `renderState` per-tick payload. Pick one; missing from BOTH = silent bug.

Preservable:
- Architectural split between protocol (AccumulationController) and algorithm (AdaptiveResolution-pure).
- "Both consumers call `tickAdaptiveResolution(state, input)` per frame; same algorithm, different application layer" — design rule for future accumulating renderers.
- Initial-state push pattern for async-bootable renderers: store subscriptions only fire on changes; pre-boot messages may be silently dropped; wrap `onBooted` to re-push state (see `engine-gmt/renderer/install.ts`).
- Deep-accumulation protection: `accumThreshold = floor(sampleCap * 0.5)` is the canonical override; past that point adaptive is suppressed everywhere — protects partial high-quality results.
- Fluid-toy's two-scale decoupling: fractal/canvas scales with qualityFraction; sim grid runs at user's chosen simResolution with aspect locked via `setSimAspect()` to prevent adaptive-induced FBO reallocation that would wipe dye.
- Plumbing-pitfalls audit checklist: any store flag that gates worker render behaviour must be reachable by the worker via event-bus OR renderState payload — adaptiveSuppressed bug (2026-04-26) was caused by adding the field to renderControlSlice but not plumbing through renderState.
- Authoring-a-new-accumulating-renderer 5-step recipe (controller → bindings → quality-scaling layer choice → reportAccumulation cadence → async-boot initial push).

MAY BE STALE: Nothing flagged — recent (post-2026-04-26 fix referenced inline) and detailed.

---

## docs/engine/12_App_Handles.md

Pattern for app-scoped state that must be reachable from both React components AND non-React code (RAF loops, pointer handlers, customUI components in sibling subtrees) when context plumbing won't work. `defineAppHandles<T>(name, initial)` returns `{name, ref, useSnapshot, subscribe, notify, reset}`. Replaces two prior workarounds: scattered module-scope `let` variables and the grab-bag `engineHandles` god-object. The doc gives a usage matrix (when to use vs alternatives), prescribes one handle per logical concern over flat containers, and exposes a dev-only `globalThis.__appHandles[name]` for Playwright smoke tests.

Key decisions:
- Prefer module-level handle over React context: customUI components mount in sibling subtrees and context can't reach them without rewiring panel rendering.
- Dev-only `globalThis.__appHandles`; production bundles skip the global to avoid accidental API surface.
- Multiple narrow handles vs one big handle — smaller types narrow TS surface, name documents the coupling boundary.
- For high-frequency writes (mouse-move, RAF ticks), skip `notify()` — consumers read `ref.current` fresh every frame anyway.

Preservable:
- Decision matrix:
  - Single React subtree → useState + prop drilling / context.
  - Cross-subtree, both React + non-React readers → `defineAppHandles`.
  - User-visible / preset-round-tripped → DDFS feature slice (NOT this).
  - Transient per-frame, no React → plain module `let`.
- `useSnapshot()` returns ref.current and subscribes — writes via `ref.current.x = ...` do NOT re-render unless writer calls `.notify()`. This is intentional for high-frequency paths.
- The rejection of the grab-bag pattern: god-object grows forever, narrow handles document boundaries.
- Smoke-test access shape: `(globalThis as any).__appHandles?.['fluid-toy.brush']?.ref?.current?.runtime?.particles`.

MAY BE STALE: Nothing flagged.

---

## docs/engine/13_Extracting_From_GMT.md

Cookbook for lifting GMT features into the shared engine. Worked example: TSAA + pause-button extraction (session 2026-04-24). Three-question triage — is the STATE / BEHAVIOUR / UI generic? Each "yes" means that layer lifts to `engine/`; each "no" stays in `engine-gmt/`. Doc covers the worked example end-to-end (state in renderControlSlice, behaviour split, UI as engine/plugins/topbar/PauseControls.tsx), a 10-minute rule with danger signs, tree placement table, examples of features that stayed in engine-gmt (ViewportArea, rendererSlice uRegionMin/Max), and an 8-step checklist for future extractions.

Key decisions:
- Triage before code: write down STATE / BEHAVIOUR / UI split first.
- New engine-core topbar plugins go under `engine/plugins/topbar/` (FpsCounter, AdaptiveResolutionBadge, PauseControls).
- Always expose idempotent `installXxx()` so apps opt in per-plugin.
- Verbatim copy from GMT, then rename imports — don't redesign on extraction.
- Smoke-test with Playwright check (button renders, click flips state, popover opens) as the acceptance gate.

Preservable:
- The three triage questions — apply verbatim to every future extraction.
- Danger signs that mean a feature is NOT generic: new fields that don't generalise, install function takes GMT-specific config, component imports from engine-gmt/, type overloads to handle both stores.
- Tree placement table: engine/ → generic; engine-gmt/ → GMT bridges/worker/DDFS; fluid-toy etc → app-specific layout using only engine/; app-gmt (future) → engine/ + engine-gmt/.
- Rule of thumb for what stays in engine-gmt: GMT worker protocol, GMT shader uniform names, specific GMT feature slices (coloring, geometry.juliaX, lighting.lights[]).
- The 10-minute rule (extraction under 30 min, mostly reading) — if you're writing large amounts of new engine-core code, stop and re-triage.

MAY BE STALE: Nothing flagged.

---

## docs/engine/14_Panel_Manifest.md

Apps declare their dock panels via a `PanelManifest` (array of `PanelDefinition`) — single source of truth for `PanelRouter` + `Dock`. Replaces the per-feature `tabConfig` system that worked at 1:1 toy scale but broke when GMT needed 26 features mapped into ~10 panels with bespoke widgets. Panels are a UX concern; features are state/params/shader concern. Doc covers PanelDefinition type, runtime `applyPanelManifest` / `addPanel` merge semantics, four composition paths (component / items / features-shorthand / empty fallback), the rich `items` PanelItem union (feature/widget/section/separator/collapsible/accordion/compilable/compile-dropdown/runtime-section), compile-spinner contract (CompileScheduler-owned, NOT UI-owned), worked GMT example (10 panels), and migration notes.

Key decisions:
- Panels owned by app, not features. One feature may appear in multiple panels; one panel composes multiple features.
- ShowIfPredicate is dotted-string OR function — string covers 90% of cases.
- Composition resolves richest-first: `component` (bespoke escape) > `items` (richest layout) > `features:`+`widgets:` shorthand > empty fallback.
- Compile-spinner OWNERSHIP is `engine-gmt/engine/CompileScheduler` — emits when shader rebuild is queued, clears on completion/error. Optimistic UI-side emits caused spurious "Compiling..." flashes on runtime-only param changes — those have been removed.
- `store/CompileGate` (`compileGate.queue(message, work)`) for gated compile flows (formula switch, scene load, hardware-profile change) where the spinner must visibly paint before GPU-blocking work.
- New PanelItem fields warranted only when need can't be expressed as widget+slot, predicate, or wrapped component.

Preservable:
- The full PanelItem union types — `feature` (with groupFilter/whitelistParams/excludeParams), `widget`, `section`, `separator`, `collapsible`, `accordion`, `compilable`, `compile-dropdown`, `runtime-section`. Doc 21 noted the union has more types than initially documented; this version captures them.
- Compile-spinner contract: scheduler emits, NOT UI components. This is load-bearing — a violation produces spurious flashes.
- When-to-use `items` vs `features:` shorthand decision list (section headers between blocks, feature-appears-twice-with-different-groupFilter, advanced-only sub-blocks with showIf, collapsibles, manifest-level widget props).
- GMT's 10-panel manifest example as canonical reference.
- Migration deletions: FeatureTabConfig.dock/order/componentId/defaultActive/aggregatesFrom removed; applyDefaultPanelLayout.ts deleted; featureRegistry.getTabs() removed; PanelRouter hardcoded special-cases for Graph/CameraManager/Engine removed; Dock.tsx hardcoded per-id visibility removed.

MAY BE STALE: The line "richer than documented (more `PanelItem` types than the doc table lists)" came from doc 21's audit on 2026-04-25; the doc may have since been updated (the version above lists 9 PanelItem types in the union), but worth confirming the table at the top matches.

---

## docs/engine/15_Camera_Manager_Extraction.md

**Status flagged in survey e09 as research/proposal doc whose code shipped.** The original doc opens with "Status: Research. No code changes yet — this doc proposes the shape, the next session implements it." The code DID ship — references to `installStateLibrary`, `savedViews`, `viewLibrary.ts`, `createStateLibrarySlice.ts` appear in doc 16 (Type Augmentation) as battle-tested reference implementations. The doc covers: what's there in engine-gmt today (CameraManagerPanel 519 lines split into 4 blocks — cardinal toolbar GMT-specific / list rendering generic / footer GMT-specific / composition guides separately extractable; cameraSlice 302 lines with every action GMT-specific via CameraUtils + VirtualSpace.split + FRACTAL_EVENTS); what fluid-toy needs (julia.* + zoom + center, "view" is fractal-config-plus-camera blob, not pure camera); a three-layer proposed abstraction (`createStateLibrarySlice<T>` factory → `<StateLibraryPanel>` pure UI primitive → app-specific shells); six open implementation questions; and a five-step implementation sequence.

Key decisions (now shipped):
- User reframing: "the camera manager at its core is a state manager, and in that form would be most useful for a variety of applications." Drove the generic named-state-snapshot primitive.
- Three-layer split: generic factory + generic UI + per-app shells with capture/apply callbacks.
- The generic envelope: `{id, label, thumbnail?, state: <T>, createdAt}`. Everything else is `<T>`-specific.
- Persistence is the app's concern, not the library's — library exposes getSnapshots/setSnapshots.
- Composition overlays (Rule of Thirds, Golden, Grid, Spiral) extract as a SEPARATE plugin (`@engine/composition-overlays`), not bundled with the state library.
- Undo/redo is app-side; library emits `onApplied(state, prev)` event.

Preservable:
- The four-block split of CameraManagerPanel.tsx is the analysis template for similar GMT-side panel extractions — quote it when looking at other large engine-gmt components.
- The capture/apply callback shape (`opts.capture: () => T`, `opts.apply: (state: T) => void`, optional `isModified`, `captureThumbnail`, `suggestLabel`, `onReset`) — this is the shipped surface; matches doc 16's reference to `installStateLibrary`.
- The split of GMT-specific bits (cardinal toolbar → calculateDirectionalView + engine.lastMeasuredDistance + ortho/perspective semantics; footer → CameraPositionDisplay + AutoFeaturePanel optics) from generic bits (list rendering / drag-reorder / rename / dup / delete / dirty-check via callback).
- Multiple-libraries-per-app design: fluid-toy could have "Views" + "Color Palettes" + "Brush Presets" simultaneously.
- "fluid-toy's snapshot shape is NOT a camera — it's a fractal-config-plus-camera blob" — design insight that fixed the naming choice (StateLibrary, not CameraLibrary).
- Composition overlays separation as a design rule: orthogonal concerns extract into separate plugins, even when they shipped together in GMT.
- Shortcuts (Ctrl+1-9 save / 1-9 recall, 38 lines) are already generic — reuses cleanly.

MAY BE STALE:
- The "Status: Research. No code changes yet" header is FALSE as of survey e09's flag. The doc reads as a proposal but the implementation has shipped (visible in doc 16's reference to `installStateLibrary`, `viewLibrary.ts`, `createStateLibrarySlice.ts`).
- Section 4 "Open questions for the implementation session" — these have presumably been answered by the shipped code (persistence as app-concern is confirmed by doc 16's "your app declares those names via TypeScript declaration merging"; undo as app-side is reflected in the `_viewIsModified` field).
- Section 5 "Implementation sequence (next session)" — all five steps presumably shipped. The estimate was 1-1.5 sessions for steps 1-3 + 0.5 for step 4.
- **Phase 2 should retain the design rationale, then either retitle the doc as "Camera Manager Extraction — Design Reference" or split the still-relevant analysis (the four-block split, the capture/apply shape, the multiple-libraries point) into a new "State Library Design" doc and archive this one.**

---

## docs/engine/16_Type_Augmentation.md

Reference doc for declaration-merging the engine's generic store with app-specific DDFS slice keys and `installStateLibrary` dynamic keys. "Skip it and you'll grow `as any` faster than you can clean it up — fluid-toy carried 33 of them across 10 files before this pattern was applied; engine-gmt carried 24 in features/ui.tsx alone." Two-target rule: DDFS slices need augmentation in BOTH `engine/typedSlices` (for `useSlice('brush')`) AND `engine/features/types` (for `useEngineStore.getState().setBrush(...)`). `EngineStoreState extends FeatureStateMap` and `EngineActions` auto-derives `set<Feature>` setters from FeatureStateMap keys, so the second is the load-bearing one. Covers DDFS canonical pattern with `SliceFromParams<typeof Foo.params>` helper, cross-app leakage (intentional; fluid-toy augmentations leak into app-gmt but the slices aren't registered at runtime there, so harmless), state-library installs (declare-merge into EngineStoreState + EngineActions next to the install call with same literal keys), and why no generic helper exists (TS declaration merging only works with literal keys; can't propagate through a generic).

Key decisions:
- Two-target augmentation rule for DDFS slices.
- `SliceFromParams<typeof Foo.params>` over a second source of truth — DDFS param record is the single source.
- Cross-app type leakage accepted (slices not registered at runtime in other apps appear as `undefined`); per-app tsconfig include lists are strictly worse.
- `engine-gmt/storeTypes.ts` lives in `tsconfig.exclude` — only takes effect when an app explicitly imports it (app-gmt does; fractal-toy and demo should not see GMT slices).
- The two transient toast fields (`<arrayKey>_savedToast`, `<arrayKey>_notifyDot`) included in augmentation only if toast is mounted next to the library.
- `declareStateLibrary<TName, T>(...)` helper was considered and rejected — TS doesn't propagate generic keys through `declare module` blocks.

Preservable:
- The two-target table (AppFeatureSlices vs FeatureStateMap) — this is the load-bearing rule.
- "EngineStoreState extends FeatureStateMap, and EngineActions auto-derives set<Feature>(p: Partial<...>) from FeatureStateMap's keys" — wiring rationale.
- The full storeTypes.ts canonical pattern (no runtime imports; both `declare module` blocks; SliceFromParams helper).
- The state-library augmentation pattern with literal-key duplication between install opts and `declare module` — the irreducibility of this duplication is the reason no generic helper exists.
- When-NOT-to-augment: truly local store keys (use `as any`); engine-managed keys already in types/store.ts (panels, contextMenu, liveModulations, animations).
- Reference implementations: `fluid-toy/storeTypes.ts`, `fluid-toy/viewLibrary.ts`, `engine-gmt/storeTypes.ts`.

MAY BE STALE: Nothing flagged.

---

## docs/engine/17_Mobile_Layout.md

Marked as 🚧 in heading. Engine-level mobile support across detection / preference / layout / menu rendering / per-app composition. No `installMobile()` plugin — pieces live where they naturally belong: hook for detection, slice for preference, components for layout, extension to existing menu plugin for mobile menu rendering. Detection via `useMobileLayout()` hook (`isMobile` + `isPortrait`) and non-React `isMobileSnapshot()`. Tri-state `uiModePreference: 'auto' | 'mobile' | 'desktop'` on store, persisted to localStorage as `gmt.uiModePreference`, replaces prior `debugMobileLayout: boolean`. Layout primitives: `<MobileViewportShell>` (root, implements iOS Safari address-bar-collapse trick via sticky positioning + `100vh` + `env(safe-area-inset-*)` padding) and `<LandscapeGate>` (full-screen overlay on mobile+portrait). Menu rendering: desktop opens local popover; mobile writes to module-level `mobileMenu` state, `<MobileMenuHost>` reads it and renders in scrollable side panel replacing right dock. Performance auto-tuning downgrades 'balanced' preset to 'fastest' on mobile at boot via `detectHardwareProfileMainThread()`. Touch input: drei's OrbitControls handles native touch; custom cursor-anchored orbit handlers in `engine-gmt/navigation/Navigation.tsx` early-return on `e.pointerType === 'touch'`; `<MobileControls>` handles Fly-mode joystick.

Key decisions:
- No `installMobile()` plugin — composition pieces over single install fits the multiple-anchor-point reality (detection hook, store slice, layout component, menu extension).
- Tri-state preference (auto/force-mobile/force-desktop) over boolean — users with edge devices need override.
- Sticky-positioning + 100vh trick for iOS Safari address-bar collapse.
- `env(safe-area-inset-*)` padding on all four edges for notches and gesture bars.
- Mobile menu replaces right dock instead of overflowing as popover.
- Module-level `mobileMenu` state read by host shells via `useSyncExternalStore`.
- Touch input cedes to drei native rather than fighting it — cursor-anchor doesn't translate to multi-touch.

Preservable:
- Sibling-app adoption checklist (6 steps): wrap root in MobileViewportShell → mount LandscapeGate gated on loading-screen → subscribe to mobileMenu and swap right-dock contents → hide desktop-only chrome (left dock, timeline, complex modals) → use useEngineStore for uiModePreference (System menu pill is GMT-side, others register own or omit) → optional auto-pick lighter scalability preset at boot when hardwareProfile.isMobile.
- Topbar item culling via `when: () => !isMobileSnapshot()` predicate; TopBarHost subscribes to uiModePreference + isDeviceMobile so toggles re-evaluate live.
- The iOS sticky-positioning trick (sticky element matches visual viewport on first paint, then sticks once body scrolls 1px, allowing browser to retract address bar; 100vh then resolves to larger post-collapse viewport).
- GMT-specific composition decisions worth replicating: right dock hidden in Fly mode on mobile (joysticks need viewport reach); timeline hidden entirely on mobile; `<MobileControls>` overlay gated on `!loadingVisible && !isBroadcastMode`.
- Touch-input cede rule: custom handlers should detect `e.pointerType === 'touch'` and early-return to drei native.
- `mobileMenu` API surface (open/close/toggle/getActive/subscribe) — design pattern for "side-channel for menu state".
- Known limitation: outside-tap dismissal not implemented; only the X button in MobileMenuHost's header dismisses.
- Future work: `@engine/environment` plugin could absorb useMobileLayout + theme + DPR into a single install-once primitive (placeholder in 04_Core_Plugins.md).
- Animation on mobile deferred — researched in `plans/mobile-animation-research.md`.

MAY BE STALE: The 🚧 marker indicates incomplete; recheck whether the "Known limitations" list (only outside-tap dismissal listed) has grown.

---

## docs/engine/20_Fragility_Audit.md

**Curated list of known issues — preserve ALL findings.** Ground-truth doc for "what's broken or fragile" with F1-F18 entries plus a priority-order summary and audit methodology. Status legend: 🔴 Open / 🟡 In progress / 🟢 Fixed / ⚪ Deferred / ⚫ Dropped. Audit ran three parallel passes on 2026-04-22 (GMT survey, toy-fluid architecture, gmt-engine seams). Re-audit cadence: before each major version bump, or after every third core plugin lands.

Preservable (ALL findings — Phase 2 needs these):

- **F1 — Late feature registration silently breaks.** 🟢 Fixed (commit 96a4b5f). Critical / data loss. `featureRegistry.register(MyFeature)` after `createEngineStore()` adds to registry but not to store; setters undefined; UI renders nothing; preset round-trip silently drops state. Root: `store/createFeatureSlice.ts:18-19` snapshots `featureRegistry.getAll()` at construction. Fix: `featureRegistry.freeze()` inside `createEngineStore()`; post-freeze register throws in dev (`FeatureRegistryFrozenError`), warns+no-ops in prod. Tied to 11_Plugin_Authoring R2 (never import engine store at module scope).

- **F2 — Duplicate feature IDs silently overwrite.** 🟢 Fixed (96a4b5f). High / silent fail / data loss. Two features with same `id` → second overwrites first, no warning. Root: `FeatureSystem.ts:236` uses `Map.set()` without duplicate check. Fix: throw `DuplicateFeatureError` in both dev and prod.

- **F2b — Undo lane conflation.** 🟢 Fixed (2026-04-30, second pass). High / UX confusion. Original: Ctrl+Z undoes different things depending on mouse position (three independent stacks routed by `isTimelineHovered`). First fix (2026-04-23): unified stacks behind one `historySlice.undoStack` with scope labels. Regression 2026-04-29: `undo()` without scope popped newest of any kind; param-undo keystroke fired camera-undo when camera gesture sat on top (provoked by 100ms post-orbit settle + 1500ms camera debounce). Re-fix 2026-04-30: split into per-scope stacks (`paramUndoStack`/`paramRedoStack`/`cameraUndoStack`/`cameraRedoStack`); scope NOW REQUIRED on undo/redo/canUndo/canRedo/peekUndo/peekRedo; unscoped form is gone; `handleInteractionStart` retired in favour of typed entry points (`beginParamTransaction`/`endParamTransaction`/`pushCameraTransaction(state)`). **Phase 2 lesson: per-scope stacks unrepresentable-bug-class > unified-stack-with-labels.**

- **F3 — PresetLogic hardcodes top-level fields.** 🟢 Fixed (a4e7d6b). Medium / extensibility. `utils/PresetLogic.ts:114-122` explicitly handles `savedCameras`/`cameraRot`/`targetDistance`. Fix: preset field registry — `sceneIO.registerField({key, serialize, deserialize})`; PresetLogic iterates registered fields.

- **F4 — Implicit render-loop contract.** 🟢 Fixed (c6ee640). Medium / silent fail. `TickRegistry.runTicks(dt)` exposed but not called by engine itself; app forgetting to call it = animations silently don't play. Fix: default `@engine/render-loop` plugin drives RAF; dev-only assertion logs warning if `runTicks` not called for 3s after boot.

- **F5 — AnimationEngine hardcodes camera tracks.** 🟢 Fixed (2026-04-25). Medium / coupling. AnimationEngine wired `camera.active_index`, `camera.unified.x/y/z`, `camera.rotation.x/y/z` directly with split-precision math + private `pendingCam` + `commitState()` emitting GMT's CAMERA_TELEPORT. Fix shape (preserve verbatim): `engine/animation/cameraKeyRegistry.ts` (apps declare own camera tracks); `engine/animation/binderRegistry.ts` (explicit writers for composite tracks); `AnimationEngine.registerScrubHook('pre' | 'post', fn)` (pre fires before binders for live-camera read into buffers; post fires after for batched-write flush); engine no longer imports THREE, worker proxy, viewport refs, FRACTAL_EVENTS, split-precision math. GMT moves all that into `engine-gmt/animation/cameraBinders.ts`, wired via `installGmtCameraBinders()` from `app-gmt/main.tsx`.

- **F6 — set${Feature} name-inference for animation.** 🔴 Open. Medium / silent fail. `engine/AnimationEngine.ts:164-189` builds binder by name-guessing: `'set' + capitalize(featureName)`. Returns undefined silently on naming mismatch. Progress: `binderRegistry` (F5) is the escape hatch — apps with non-conventional setters register explicitly. Still open: auto-registering every DDFS param at feature-freeze time (so the inference branch retires entirely). Deferred until a non-conventional case appears.

- **F7 — Circular store dependency (animationStore ↔ fractalStore).** 🟢 Fixed (2026-04-25). Was: Low / smell. Resolution: **no cycle existed.** animationStore depends on its three slice files; none import back into engineStore. The `window.useAnimationStore` indirection was leftover scaffolding. Replaced consumers (`store/engineStore.ts`, `engine/plugins/Undo.tsx`, `app-gmt/main.tsx`) with direct imports. The window export stays only as dev-console handle. **Lesson: "designed fix from the audit (explicit `bridgeRegistry`) was not needed — the cycle was imaginary."** Always verify before designing around a presumed constraint.

- **F8 — historySlice snapshots features but not UI state.** ⚪ Deferred. Low / UX. Close panel → change param → undo → param reverts but panel stays closed. Designed fix: `undoable` flag on UI state; opt into undo per-field. Likely "most UI state does NOT undo" with explicit opt-in for state worth undoing (expanded/collapsed sections). Deferred — not blocking toy-fluid port.

- **F9 — componentId references not validated at registration.** 🔴 Open. Low / silent render-nothing. Feature's `tabConfig.componentId` pointing at unregistered component silently renders nothing. Fix: at freeze time, validate every feature's componentId is in componentRegistry; warn in dev (not throw — plugin load order may register in a later tick during same boot).

- **F10 — Shader config `formula` field is structurally required.** ⚪ Deferred. Low / cosmetic. `store.formula: string` required; non-formula apps must populate with a sentinel. Designed fix: rename to `mode: string` or drop. Part of larger rename pass (fractalStore → engineStore, FractalEvents → EngineEvents).

- **F11 — Cosmetic fractal naming throughout.** ⚪ Deferred. Cosmetic. `fractalStore`, `useFractalStore`, `FractalEvents`, `FractalStoreState`, `FractalActions`, `"fractal-context-menu"` CSS class. Designed fix: single rename commit once toy-fluid port validates shape. Tracked in HANDOFF.md.

- **F12 — Vec track ID format mismatch (UNDERSCORE vs DOT).** 🟢 Fixed (2026-04-23). Medium / silent fail. GMT canonical: UNDERSCORE suffix `featureId.param_x/_y/_z/_w`. Phase 5's `cameraKeyRegistry` + `AnimationEngine.getBinder` 3-part path used DOT-separated `feature.param.x`. Track IDs mismatched between writer and panel reader. Fix: AnimationEngine case 4 detects UNDERSCORE via regex `/^(.+)_([xyzw])$/`, validates base is vec-shaped, routes to shared `writeVecAxis` helper; DOT form kept as backward-compat for early phase-5 saved scenes; cameraKeyRegistry's default `captureCameraKeyFrame` auto-calls `addTrack(tid, tid)` if missing (upstream `addKeyframe` silently no-ops on missing tracks). Resolved 2026-04-29: bespoke `fluid-toy/orbitTick.ts` retired — auto-orbit now expressed as two Sine LFOs on `julia.juliaC_x` / `_y` at 90° phase, authored via standard `lfo-list` widget.

- **F13 — AnimationSystem.tsx hardcodes GMT-specific target hijacks.** 🟢 Fixed (2026-04-23). Medium / silent misbehaviour in engine-fork apps. `components/AnimationSystem.tsx:232` had `julia.*` hijack branch assuming GMT's `geometry.juliaX/Y/Z` slice and `uJulia` uniform existed. Any engine-fork app naming a feature `julia` (fluid-toy does) had LFO targets swallowed. Same issue with `coloring.*` branch. Additionally: generic DDFS vec handler at line 322 required `uniformName.endsWith('_{axis}')`, meaning every vec param needed a uniform declaration in feature-registry config — fluid-toy's `julia.juliaC` has no uniform key, so modulation offsets never made it into liveModulations. Fix (preserve verbatim): (1) GMT hijacks gated on slice presence (engine-fork apps without those slices fall through to generic DDFS dispatch); (2) Base-value resolver generalized from `/^(vec[234][ABC])_(x|y|z|w)$/` to `/^(.+)_(x|y|z|w)$/` validated by checking base is vec-shaped; (3) liveModulations decoupled from uniform write (Section F and scalar fallback both always write liveModulations[targetKey] = base + offset when target resolves to DDFS param; engine.setUniform conditional on uniformName existing); (4) Orbit LFO target flipped to UNDERSCORE form; (5) Added `isDDFSResolved` flag so scalar fallback doesn't pollute liveModulations with zeros.

- **F14 — Duplicate module-level state across engine-core / engine-gmt overlay.** 🟡 One instance fixed (commit 163055a); broader audit needed. High / silent data divergence. Files copied verbatim from `engine/` into `engine-gmt/engine/` get treated by TS as separate modules — each gets own module-level `let _camera = null`, writes to one invisible to readers of the other. Fixed instance: `engine/worker/ViewportRefs.ts` vs `engine-gmt/engine/worker/ViewportRefs.ts` (`GmtRendererTickDriver` registered R3F camera on gmt copy; `utils/timelineUtils.ts` read null from engine-core copy; symptom: Key Cam button always red after capture). Fix: replaced gmt copy with re-export shim. **Audit checklist (preserve):** (a) Run `npm run orphans` (knip) for unimported-files list; DO NOT use grep — 2026-04-30 grep-based bulk delete had to be fully reverted because relative `../engine/X` imports were missed. (b) Diff every file in `engine-gmt/engine/**` against `engine/**` counterpart; if ~identical, replace gmt copy with `export { … } from '../../../engine/path'`. (c) Grep for module-level `let _foo`/`const _foo = new Foo()`/`let _registry = new Map()` patterns in both trees and check whether the same name exists in parallel tree. (d) When extracting new code, default to re-export shims, NOT copies. Only copy when gmt-side genuinely needs different runtime behaviour. **Per-file remediation pattern:** diff → replace with `export * from '../../engine/X';` plus one-line migration comment → typecheck + smoke:boot → knip reports gmt copy as dead (delete) or live as shim (leave). **Direction-matters lesson:** when `engine/X.ts` and `engine-gmt/engine/X.ts` are byte-equivalent, knip flags whichever side has no importers as unused — that's a static fact NOT a directive on which side to delete. Right move is almost always to KEEP engine/ generic copy and RETARGET engine-gmt importers, then delete engine-gmt copy. 2026-04-30 triage deleted 4 engine/ files (ConfigDefaults.ts, codec/halton.ts, codec/VideoExportTypes.ts, managers/ConfigManager.ts) before catching this; halton + VideoExportTypes restored and consolidated correctly (engine/ canonical, engine-gmt importers retargeted, engine-gmt copies deleted); ConfigDefaults + ConfigManager restored side-by-side because engine-gmt versions are GMT-specialized variants. **Intentional-orphan registry (`knip.json` ignore list) three buckets:** parked WIP (fragmentarium_import, deepZoom/HDRFloat.ts, mesh-export/sdf-eval.ts); engine-fork generic surface awaiting consumer (timeline/exportHelpers.ts, exportModulations.ts); engine-generic awaiting retarget (engine/ConfigDefaults.ts, engine/managers/ConfigManager.ts).

- **F15 — Worker `_localOffset` may zero out under FRAME_READY guard timeout.** ⚪ Flagged. Possibly non-issue; no visual symptoms reported. After preset boot, `WorkerProxy.sceneOffset` (`_localOffset`) reads `{0,0,0}` while `useEngineStore.getState().sceneOffset` has real preset values. Possible mechanism (unverified): `WorkerProxy.ts:204-219` `_offsetGuarded` ignores FRAME_READY offsets after a `setShadowOffset` call; guard supposed to clear when worker catches up (drift < 0.001) but has 2-second auto-clear timer at WorkerProxy.ts:524-527; if worker's actual offset genuinely `{0,0,0}` (i.e. boot-time OFFSET_SET at main.tsx:312 didn't land), guard never converges, 2s timer fires, next FRAME_READY overwrites `_localOffset = {0,0,0}`. Probable fix shape: drop the 2s guard auto-clear, OR require explicit "worker has caught up" handshake (sequence number on RENDER_TICK/FRAME_READY) instead of drift-based convergence. Instrumentation breadcrumbs preserved in doc.

- **F16 — TopBar useSyncExternalStore snapshot returns mutable Map.** 🟢 Fixed (2026-04-25). Low in practice (works) / medium correctness. `engine/plugins/TopBar.tsx:108-109` getSnapshot returns `_items` Map directly; Map identity never changes between calls; React's concurrent-mode tearing detection can't see changes; re-renders fire via side-channel `onStoreChange()`. Fix: return `_rev` integer (same pattern Menu.tsx and Hud.tsx already use). Source: B1 from doc 21.

- **F17 — Dead require in GLSLToJS.ts.** 🟢 Fixed (2026-04-25). Medium / silent until code path runs. `engine-gmt/engine/GLSLToJS.ts:176` had `require('../store/fractalStore')` — path doesn't exist (file is `store/engineStore.ts`). Would throw `Cannot find module` in production. Fix: update to `require('../../../store/engineStore')` or ES import. Source: B2 from doc 21.

- **F18 — Two AnimationEngine singletons may be active simultaneously.** 🟢 Resolved (2026-04-25) — NOT an issue. Verification: `engine-gmt/engine/AnimationEngine.ts` does not exist; grep of all `engine-gmt/` imports shows only two files, both pointing at `'../../engine/AnimationEngine'` (engine-core): `engine-gmt/animation/cameraBinders.ts:26` and `engine-gmt/components/timeline/RenderPopup/exportRunner.ts:21`. Source: B3 from doc 21.

- **Fix-priority order summary:** blocking toy-fluid port (F1, F2, F3, F4, F2b, F12, F13 all 🟢 Fixed); landing next (F5 escape-hatch shipped; F6 escape-hatch shipped/full auto deferred; F9 still open; F17, F18, F16 all 🟢 Fixed); deferred (F7, F8, F10, F11, F14 ongoing, F15 unverified).

MAY BE STALE: Nothing flagged — doc explicitly tracks status of every item.

---

## docs/engine/21_Code_Review_2026-04-25.md

**Independent multi-agent audit conducted 2026-04-25 — preserve all findings.** Four agents surveyed engine core / engine plugins / engine-gmt / three app entry points / smoke tests / package & onboarding independently, then synthesised against architecture docs. Records the delta — what matches docs, where docs overstate or are wrong, live bugs, onboarding gaps. Most B-findings are now folded into the 20 audit as F16/F17/F18.

Preservable findings (especially live bugs B1-B3 and patterns):

**What matches the docs:**
- FeatureSystem / DDFS core — freeze semantics, topological sort (Kahn's algorithm), duplicate-ID detection, dev-stack-capture in FeatureRegistryFrozenError all production-grade. `createFeatureSlice.ts` correctly calls `featureRegistry.freeze()` before iterating. Cache invalidation via `sortedCache = null` on every `register()` call present.
- Boot order across all three apps (`app-gmt/main.tsx`, `fluid-toy/main.tsx`, `fractal-toy/main.tsx`) honours `registerFeatures → store → setup`. Side-effect import first, before React, before any store-touching module.
- DDFS feature definitions in engine-gmt (lighting, coloring, quality, navigation) are clean pure-data + shader-injection. No store reads, no side effects, correct DDFS shape.
- PanelManifest richer than initially documented (more PanelItem types — `'compilable'` real and used) but structurally matches.
- F14 partial fix — 4 shims real (engine-gmt/engine/worker/ViewportRefs.ts, FeatureSystem.ts, FractalEvents.ts, TickRegistry.ts).
- trackBinding + binderRegistry exist at `engine/animation/trackBinding.ts` and `engine/animation/binderRegistry.ts`.

**Where docs overstate or are wrong:**

- **Plugin pattern is NOT uniform.** 11_Plugin_Authoring.md and 04_Core_Plugins.md describe a uniform "module-scope registry + `_rev` subscriber + idempotent installX + useSyncExternalStore host" contract. Shipped plugins do not all follow this. Table from doc (preserve verbatim):
  | Plugin | Module-scope registry | `_rev` snapshot | useSyncExternalStore host | installX guard |
  |---|---|---|---|---|
  | Menu.tsx | ✅ | ✅ | ✅ | ✅ |
  | Hud.tsx | ✅ | ✅ | ✅ | ✅ |
  | TopBar.tsx | ✅ | ❌ (bug — B1, now F16 🟢 fixed) | ✅ | ✅ |
  | Shortcuts.ts | ✅ | n/a | n/a (DOM-driven) | ✅ |
  | SceneIO.tsx | n/a | n/a | via TopBar slots | ✅ |
  | Camera.ts | ❌ (Zustand via cast) | n/a | n/a | ✅ |
  | Undo.tsx | n/a | n/a | Zustand selectors | ✅ |
  | Viewport.tsx | n/a | n/a | Zustand hooks | ✅ |
  | RenderLoop.tsx | n/a | n/a | n/a | ❌ (none) |
  Action: update 11_Plugin_Authoring to clarify registry pattern applies to "UI slot host" plugins; add note that imperative/subscription plugins follow a different shape.

- **Dual-tree problem wider than F14 acknowledges.** Full diff table (preserve verbatim):
  | File | Status | Risk |
  |---|---|---|
  | worker/ViewportRefs.ts | ✅ Shim | Fixed |
  | FeatureSystem.ts | ✅ Shim | Fixed |
  | FractalEvents.ts | ✅ Shim | Fixed |
  | TickRegistry.ts | ✅ Shim | Fixed |
  | AnimationEngine.ts | ❌ Two different class architectures | High — was B3, NOW F18 🟢 verified non-issue |
  | RenderPipeline.ts | ❌ Verbatim ±1 import line | Medium — will drift |
  | BezierMath.ts | ❌ Verbatim copy | Low (pure math, no state) |
  | BloomPass.ts | ❌ Verbatim copy | Low (no state) |
  | UniformNames.ts | ❌ Verbatim copy | Low (constants only) |
  | ConfigDefaults.ts | Intentionally diverged (GMT values) | Documented |
  | ShaderConfig.ts | Intentionally diverged | Documented |
  | ShaderFactory.ts | Intentionally diverged | Documented |
  | ConfigManager.ts | Intentionally diverged (442 lines) | Documented |
  | ShaderBuilder.ts | Two completely different classes, same name | Medium — naming confusion |
  RenderPipeline.ts, BezierMath.ts, BloomPass.ts, UniformNames.ts should all be shims — verbatim copies with no GMT-specific content. Fix is one line each. ShaderBuilder.ts is intentional split (generic 5-primitive engine-core vs GMT's 17-slot GLSL assembler) but shared class name creates confusion — GMT version should be renamed `GmtShaderBuilder`.

- **engine-gmt is a coupled domain layer, NOT a clean plugin.** 35+ files in `engine-gmt/` import directly from `../../store/engineStore`. Renderer components reach into app-level Zustand store via `getState() as any` in hot paths (`GmtRendererCanvas.tsx:28`, `GmtRendererTickDriver.tsx:207, 221, 231`). Acknowledged inline with comments but not documented as known architectural compromise. **Cannot be extracted into standalone package without bringing entire store/ layer.** Action: add note to 03_Plugin_Contract and 04_Core_Plugins clarifying engine-gmt is a tightly-coupled domain layer that uses the app store directly, not a plugin in the same sense as engine-core plugins.

**Live bugs found:**
- **B1 — TopBar useSyncExternalStore snapshot is mutable.** `engine/plugins/TopBar.tsx:108-109`. Returns `_items` Map directly; identity never changes; React tearing detection can't see changes; re-renders via side-channel `onStoreChange()`. Fix: return `_rev` integer (Menu/Hud pattern). Low practical / medium correctness. → Folded into F16 🟢 fixed 2026-04-25.
- **B2 — Dead require in GLSLToJS.ts.** `engine-gmt/engine/GLSLToJS.ts:176`. `require('../store/fractalStore')` — path doesn't exist. Will throw if path executes. Fix: update to `require('../../../store/engineStore')` or ES import. → Folded into F17 🟢 fixed 2026-04-25.
- **B3 — Two AnimationEngine singletons may be active simultaneously.** Files: `engine/AnimationEngine.ts` (generic) vs `engine-gmt/engine/AnimationEngine.ts` (GMT-specific). Symptom-if-real: writes to one singleton invisible to readers of the other; animation tracks silently diverge. → Folded into F18 🟢 verified non-issue 2026-04-25 (the engine-gmt file does NOT exist).

**Onboarding gaps:**
- **README.md is stale.** Top-level README describes GMT the fractal explorer (mentions FractalEngine.ts as singleton, lists formula library, links to fractal feature docs); says dev server at localhost:5173, actual port is 3400 (set in vite.config.ts). New developer's first two actions both wrong. Fix: rewrite README as application engine description, one paragraph on plugin model, point at demo/README.md for add-on walkthrough, fix port.
- **demo/README.md omits registerFeatures.ts.** File table lists DemoFeature.ts, DemoOverlay.tsx, setup.ts — omits demo/registerFeatures.ts which is the most critical file (must be imported first). Fix: add to file table with note about import-first requirement.
- **18 of 28 smoke tests have no npm run script.** package.json wires 10 of 28 .mts smoke files. Remaining 18 runnable via `npx tsx debug/smoke-*.mts` but invisible to tab-completion. Notable unwired: smoke-engine-gmt, smoke-fluid-presets, smoke-track-binding, smoke-migrations, smoke-tsaa. Fix: wire all, or add smoke:all glob script.
- **Package identity.** `package.json` "name" is "gmt-fractal" not "gmt-engine"; `express` in `dependencies` not `devDependencies` (leftover from removed custom server).

**Accurate-picture-of-current-state table (preserve verbatim — it's the audit's bottom line):**
| Dimension | Status | Notes |
|---|---|---|
| Architecture intent | ✅ Sound | Three-tier model holds |
| FeatureSystem / DDFS core | ✅ Production-grade | Best part of the codebase |
| Plugin pattern (registry-style) | ✅ Consistent | Menu, Hud follow it correctly |
| Plugin pattern (all plugins) | ⚠️ Varies | Pattern in 11_Plugin_Authoring is for one type only |
| TopBar snapshot | 🔴 Bug (B1) — now F16 🟢 fixed | Returned mutable Map, not `_rev` |
| GLSLToJS dead require | 🔴 Bug (B2) — now F17 🟢 fixed | Crashed if code path ran |
| Dual AnimationEngine singletons | 🔴 Unverified (B3) — now F18 🟢 non-issue | engine-gmt file does not exist |
| F14 dual-tree scope | ⚠️ Wider than audited | 4 shims real; 4 trivial copies unaddressed (RenderPipeline, BezierMath, BloomPass, UniformNames) |
| engine-gmt isolation | ⚠️ Coupled layer | 35+ store imports; not a standalone plugin |
| Boot order | ✅ Correct | All three apps honour the contract |
| Smoke test quality | ✅ Real tests | Playwright, behavioural assertions |
| Smoke test discovery | ⚠️ 18/28 unwired | Tab-completion misses most tests |
| README | ❌ Stale | Wrong port, wrong product description |
| demo/README.md | ⚠️ Missing file | registerFeatures.ts absent from file table |
| Package name / express | ⚠️ Stale | "gmt-fractal", express in wrong section |

**Recommended fix order from doc:** Immediate bugs (B1, B2, B3 — done as F16/F17/F18). Short-term structural (shim RenderPipeline/BezierMath/BloomPass/UniformNames; rename engine-gmt/engine/ShaderBuilder.ts → GmtShaderBuilder.ts; update F14 with full scope). Onboarding (rewrite README; add registerFeatures.ts to demo/README.md; wire 18 smoke tests; move express + fix name). Longer-term doc accuracy (update 11_Plugin_Authoring to clarify pattern scope; add engine-gmt coupling note to 03_Plugin_Contract and 04_Core_Plugins; bundle with F10/F11 fractal naming).

MAY BE STALE:
- Items folded into 20_Fragility_Audit (B1/F16, B2/F17, B3/F18) — doc 21 is the original audit-of-record; doc 20 is the running status tracker. Keep both in Phase 2 — 21 is the historical "what an outside survey saw at this point in time" snapshot, useful for re-audit cadence calibration.
- The 4 trivial shim candidates (RenderPipeline.ts, BezierMath.ts, BloomPass.ts, UniformNames.ts) status as of 2026-05-20 unknown — Phase 2 should verify whether these have been shimmed.
- README rewrite / demo/README.md fix / smoke-test wiring / package identity fixes — status unknown as of survey date; Phase 2 verify.
- ShaderBuilder.ts rename to GmtShaderBuilder.ts — status unknown.
- 11_Plugin_Authoring uniform-pattern reframe — verify if completed.
