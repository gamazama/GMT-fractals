# Harvest: batch-A

Audit pass: decomposing 5 module docs into JSDoc additions, ADRs, and
CLAUDE.md discovery rows. Source files were spot-checked for existing
top-of-file comments; anything already in source is marked SKIP.

ADRs proposed numbering starts at **0005** (existing ADRs end at 0004).

---

## docs/modules/app-gmt/boot-shell.md

### Source files
- `app-gmt/main.tsx` (already has top-of-file JSDoc; rich inline comments)
- `app-gmt/AppGmt.tsx` (granular-selector pattern at lines 95-122)
- `app-gmt/LoadingScreen.tsx` (top-of-file JSDoc present; `triggerBoot` at 75-80, fade-out gate at 140, `[isHydrated]` effect at 155)
- `app-gmt/registerFeatures.ts` (must be side-effect imported)
- `app-gmt/HelpExtras.tsx` (small content module)
- `app-gmt/renderDialogExtras.tsx` (header explains extension-points pattern)
- `hooks/useAppStartup.ts` (`bootEngine` at 75-106; 50 ms setTimeout; `_isSceneReady` param at 53)
- `engine-gmt/renderer/GmtRendererTickDriver.tsx` (30 s timeout polling loop at 90-94 — production bug)

### JSDOC additions

**File: `hooks/useAppStartup.ts`** (multiple invariants live here but are documented only in the module doc)
- On `bootEngine` export (around line 75): add
  ```
  @invariant Re-entrancy guard: `bootRequestedRef` blocks double-fire
    unless `force=true`. Formula switches + file loads pass force=true.
  @invariant 50 ms `setTimeout` yields a React tick so any in-flight
    `loadScene` writes settle before the worker reads `ShaderConfig`.
    DO NOT remove without revisiting LoadingScreen's
    `handleSelectFormula → bootEngineRef.current(true)` race.
  @see app-gmt/LoadingScreen.tsx [isHydrated] effect for the trigger.
  ```
- On the function signature (line 53): add `@deprecated` note on the
  leading-underscore `_isSceneReady` param — flag for removal.

**File: `app-gmt/LoadingScreen.tsx`**
- On `triggerBoot` (line 75): add
  ```
  @invariant `hasBootedRef` is a one-way latch. Once a boot has fired
    this component never auto-boots again. Formula-switch and file-load
    paths force a reboot only when this latch is set
    (see handleSelectFormula / handleFile).
  ```
- On the fade-out condition (line 140): add `@invariant Double-gated
  fade: `isReady` (worker output) AND `cp.phase === 'done'` (compile bar
  hit 100%). Both required so fast compiles don't snap the bar from
  73% → gone.`

**File: `engine-gmt/renderer/GmtRendererTickDriver.tsx`**
- On the boot-poll loop (line 90): add
  ```
  @bug PRODUCTION: 300 × 100 ms poll silently fails after 30 s.
    `onLoaded()` never fires → `isReady` stays false → splash never
    fades. Single console.error, no UI surfacing. See
    plans/doc-audit-state/survey/_followups/q-002.md.
  ```
  (This is the "make the bug greppable from source" mode of JSDoc.)

**File: `app-gmt/main.tsx`**
- Top-of-file already documents the side-effect-import contract for
  `registerFeatures` — SKIP duplicating.
- On the priority-10 shortcut registrations (lines 415-430): the
  existing inline comment at 407-414 already explains why; SKIP.

**File: `app-gmt/AppGmt.tsx`**
- On `setSceneOffset` (lines 193-195): add
  ```
  @invariant Delegates to the store action — never inline-mutates
    cameraSlice. The store action keeps `engine.virtualSpace.state`
    and the Key Cam dirty check in lockstep via OFFSET_SET.
  ```
- On the per-field selector block (lines 95-122): existing block
  comment per UI_PERF_HANDOFF.md is implicit; add explicit
  `@perf Granular selectors only. A single `useEngineStore()` here
   re-renders every child on unrelated store mutations.`

### ADRs to write

- **0005-boot-trigger-via-loadingscreen-effect**
  - Context: Worker boot was originally chained behind a top-level
    `setTimeout(..., 100)` in `main.tsx`. Hardware detection and mobile
    auto-pick later moved into `useAppStartup`'s mount effect, but the
    actual boot still needed to fire AFTER those completed. A timer
    race was the symptom; the cure was an effect-driven trigger.
  - Decision: Move the boot trigger into `LoadingScreen`'s
    `[isHydrated]` effect (`app-gmt/LoadingScreen.tsx:155`). The
    timeout becomes a 50 ms yield inside `bootEngine`, not a top-level
    delay. `isHydrated` (set at `useAppStartup.ts:160`) is the producer;
    the effect is the consumer; `hasBootedRef` is the latch.
  - Consequences: Three near-identically named "ready" flags
    (`isHydrated`, `isReady`, `_isSceneReady`) coexist with subtly
    different semantics — see boot-shell module doc. Boot is now
    double-guarded against double-fire, but the 30 s silent timeout
    in `GmtRendererTickDriver` means a boot failure has no UI surface
    (the splash freezes). `app-gmt/README.md`'s "step 7 setTimeout"
    framing is now wrong and is the canonical drift to fix.

- **0006-registerfeatures-as-side-effect-import**
  - Context: `createFeatureSlice` calls `featureRegistry.freeze()`
    immediately after building slices. Any feature that registers
    after freeze is invisible to the store. ES module import hoisting
    means the order of `import` statements determines what runs before
    the first `useEngineStore` access.
  - Decision: Register all GMT features and formulas via a side-effect
    import at the top of `app-gmt/main.tsx`
    (`import './registerFeatures'`). The file's only job is its
    side-effects; it exports nothing. Subsequent imports
    (`AppGmt → engineStore`) trigger store construction, which freezes
    the registry.
  - Consequences: A future "call `registerGmtFeatures()` directly"
    refactor would silently freeze the registry empty — registry
    contract relies on import ordering being load-bearing. Documented
    in this module doc; not enforceable from TypeScript.

### CLAUDE.md rows

- Boot chain spans three files (main.tsx → useAppStartup → LoadingScreen):
  ```
  | App boot order, registry freeze timing, share-URL hydration |
   `docs/modules/app-gmt/boot-shell.md` |
  ```
- Production splash-freeze:
  ```
  | Boot timeout / splash never fades / `isReady` stuck false |
   `docs/modules/app-gmt/boot-shell.md` (PRODUCTION BUG section) |
  ```

### Notes
- The module doc is unusually source-of-truth — it documents 14
  load-order statements and 8 distinct invariants, much of which is
  NOT in source comments today. Most JSDoc additions above harvest
  what's currently doc-only.
- `app-gmt/README.md` is described as still being the onboarding
  entry point — leave it as-is per project convention; this module
  doc supersedes the boot-order section only.
- The 30 s timeout bug is the highest-severity actionable item in
  this batch.

### DROPPED content (brief)
- Public API table (already in source exports).
- Module-load order table (14 rows): keep in module doc; too long
  for source comments and too detail-specific for an ADR.
- File-by-file `Interactions with other subsystems` table: discovery
  belongs in CLAUDE.md (1-2 rows), not duplicated source-side.
- File-catalog of the six app-gmt files: `glob app-gmt/*.tsx` answers
  this — drop.

---

## docs/modules/app-gmt/panels-layout.md

### Source files
- `engine-gmt/panels.ts` (top-of-file JSDoc present; 11 PanelDefinitions)
- `engine-gmt/topbar.tsx` (top-of-file JSDoc present; `registerGmtTopbar` at 196)
- `engine-gmt/topbar/AdaptiveResolution.tsx` (4 mutually exclusive states)
- `engine-gmt/topbar/CenterHUD.tsx` (700 ms bridge portal + module-mutable `activeLightPopup`)
- `engine-gmt/topbar/GmtBucketController.ts` (only GMT-aware seam)
- `engine-gmt/topbar/Logo.tsx` (project-rename popover)
- `engine-gmt/topbar/ShareLinkButton.tsx` (3-state status)
- `engine-gmt/topbar/ViewportQuality.tsx` (pending bag for compile-time params)
- `engine-gmt/storeTypes.ts` (type-only declaration-merging file)

### JSDOC additions

**File: `engine-gmt/panels.ts`**
- Top-of-file already describes 9-panel mirror; SKIP (note: doc text
  says "9-panel" but the manifest is 11 panels — drift; flag in Notes).
- Add at the `GmtPanels` export:
  ```
  @invariant `order` is logical (10/20/30…) with deliberate gaps so
    inserts don't renumber. Dock sorts by order within a dock; ties
    at the same order resolve in undefined registration sequence.
  @invariant `items: [...]` is used everywhere — GMT does not use the
    `features:` shorthand because every panel needs at least one of
    groupFilter / whitelistParams / compilable / accordion / conditional.
    Sibling apps (fluid-toy, fractal-toy) DO use the shorthand.
  @invariant Camera Manager: `id: 'Camera Manager'` is the canonical
    PanelId used by cameraSlice; `label: 'View Manager'` is the
    user-visible string. The two diverge intentionally.
  ```
- On the Camera Manager entry (lines 459-470): add comment to delete
  the stale `dock: 'float'` block at 453-458 (followup q-005). DO NOT
  add new JSDoc — this is a cleanup, flagged in Notes.

**File: `engine-gmt/topbar.tsx`**
- On `registerGmtTopbar` (line 196): add
  ```
  @invariant One-shot side-effect. MUST be called AFTER `installTopBar`,
    `installMenu`, `installCamera`, and `installBucketRender` have
    installed their slots; this function only populates them.
    Engine-core defaults (project-name, FPS, adaptive) are unregistered
    here and re-registered into the left slot.
  ```
- On `desktopOnly` (line 47): add `@note Non-reactive
  `getState()` read — safe only inside `when:` callbacks that
  TopBarHost re-evaluates on relevant store updates. Inside React
  render, use `useMobileLayout()` instead.`
- On the fallback `openCameraManager` log (line 198): add
  ```
  @drift The log reads "Camera Manager panel not registered yet" but
    the component is registered at engine-gmt/features/ui.tsx:175.
    The accurate message is "openCameraManager callback not wired by
    host app". Followup q-005.
  ```

**File: `engine-gmt/topbar/CenterHUD.tsx`**
- On the `activeLightPopup` write (around lines 76-81): add
  ```
  @invariant Module-mutable singleton — bypasses the store on purpose
    so per-frame gizmo reads don't trigger React renders. If a future
    "edit light from dock panel" interaction wants the same gizmo
    highlight, `LightPanelControls` must also write here.
    Source: features/lighting/utils/GizmoMath.
  ```

**File: `engine-gmt/topbar/ViewportQuality.tsx`**
- On the pendingPTCompile / pendingSubsystems split: add
  ```
  @invariant Two distinct paths for PT params. Runtime params
    (`ptBounces`, `ptGIStrength`) push through `setLighting`
    instantly. Compile-time params (`ptNEEAllLights`, `ptEnvNEE`)
    stay in `pendingPTCompile` until Apply, then the compile pipeline
    rebuilds.
  ```

**File: `engine-gmt/storeTypes.ts`**
- Top-of-file: add (or extend the existing header)
  ```
  @invariant Pure declaration-merging — no runtime exports. MUST be
    imported once before the store is constructed so feature slices
    typecheck on `useEngineStore((s) => s.optics)` etc. The single
    runtime augmentation is `FeatureCustomActions` for LightingActions.
  ```

### ADRs to write

- **0007-single-panel-manifest-vs-per-feature-dock-declarations**
  - Context: Earlier feature-system designs had each feature declare
    its own dock target / order / panel slot via `FeatureTabConfig`
    fields (dock, order, defaultActive). Multi-panel features and
    panels with non-feature children (Graph, Audio, Drawing, Engine)
    couldn't be expressed cleanly — features had to fight for ordering.
  - Decision: Move panel layout to a single `PanelManifest` array per
    app, consumed by `applyPanelManifest`. `FeatureTabConfig` keeps
    only `label / iconId / condition`; dock-positional fields are
    stripped. Features can appear in multiple panels (Coloring shows
    in both Gradient and Scene; Geometry appears 4× in Formula as
    separate compilables). Bespoke panels (Graph, Engine, …) use a
    `component:` id resolved through `componentRegistry`.
  - Consequences: Adding a feature no longer auto-creates a panel —
    the panel manifest must opt it in. Sibling apps own their own
    manifests (fluid-toy and fractal-toy use the `features:` shorthand;
    GMT does not). Compile-spinner ownership now lives in
    `CompileScheduler`, not in panel UI, so toggling a compilable
    section never emits an optimistic "compiling…" flash.

- **0008-activelightpopup-singleton-bypassing-store**
  - Context: The Light Studio HUD writes its hovered/active light
    index every frame to drive the viewport gizmo's range-circle
    highlight. Going through the store would force a React re-render
    per move; subscribing the gizmo to the store via selector still
    couples HUD ⇄ canvas through React.
  - Decision: Introduce a module-mutable singleton `activeLightPopup`
    in `features/lighting/utils/GizmoMath`. Both `CenterHUD` and the
    gizmo read/write it directly; `state.openLightPopupIndex` mirrors
    it for tutorial trigger consumption.
  - Consequences: Performance bypass at the cost of an undocumented
    cross-component contract. Anyone adding a second writer (e.g.
    `LightPanelControls`) must remember to update both surfaces.
    Captured here so future agents don't "tidy up" the singleton.

### CLAUDE.md rows

- Panel layout + topbar composition:
  ```
  | Panel manifest, topbar slots, system menu, light HUD popups |
   `docs/modules/app-gmt/panels-layout.md` |
  ```

### Notes
- Module doc opening paragraph says "11-panel" but the legacy
  `panels.ts` header says "9-panel right dock". Drift: header in
  source should be updated to reflect the actual 11-panel manifest
  (9 right + 2 left) — flag for follow-up edit, not in this audit.
- `engine-gmt/panels.ts:453-458` carries a stale comment block — note
  for cleanup pass; not part of this harvest.

### DROPPED content (brief)
- Public API table (already in `index.ts` re-exports).
- Topbar slot order enumeration (Logo | div | FPS | Pause | …): lives
  in `engine-gmt/topbar.tsx:1-13` header, no need to duplicate.
- Compile-section variant catalog (compilable / compile-dropdown /
  runtime-section): already in feature-system doc / source — drop.
- Per-source-file role table: structural data, IDE/grep answers it.

---

## docs/modules/app-gmt/tutorial.md

### Source files
- `engine/plugins/Tutorial.tsx` (top-of-file JSDoc present; install +
  re-exports; `_installed` guard at 36)
- `engine/plugins/tutorial/runner.ts` (top-of-file JSDoc present;
  three effects; `safeAdvance` queueMicrotask)
- `engine/plugins/tutorial/Overlay.tsx` (placement ranking, ResizeObserver)
- `engine/plugins/tutorial/Highlight.tsx` (portal pulse, two animations)
- `engine/plugins/tutorial/anchors.ts` (top-of-file JSDoc present;
  `_entries` + `_byId` indices)
- `engine/plugins/tutorial/triggers.ts` (passive/active split, 9 builtins)
- `engine/plugins/tutorial/stepRenderers.ts` (renderer registry)
- `engine/plugins/tutorial/actionBus.ts` (top-of-file JSDoc present —
  rationale for replacing store-monkeypatch is already there)
- `engine/plugins/tutorial/lessons.ts` (Map-based registry)
- `engine/plugins/tutorial/types.ts` (top-of-file JSDoc present)
- `app-gmt/tutorial/anchors.ts` (typed `ANCHOR` catalog)
- `app-gmt/tutorial/effects.ts` (top-of-file JSDoc present —
  `asOneEdit` rationale already there)
- `app-gmt/tutorial/lessons.ts` (top-of-file JSDoc present — porting
  notes from stable already there)
- `app-gmt/tutorial/stepKinds.tsx` (`next-steps` custom renderer)
- `app-gmt/tutorial/triggers.ts` (`tab` + `mode` adapters)

### JSDOC additions

Source headers are very rich here. Most of what would land as JSDoc
is already there. Remaining gaps:

**File: `engine/plugins/Tutorial.tsx`**
- On `InstallTutorialOptions.storageKey` (line 30): the existing
  JSDoc says default `'gmt'`. Per followup q-012 the actual default
  is `'gmt-tutorials'`. **Tighten existing comment** — drift fix.
- On the `as any` setState cast (line 44): add `@todo Typed mutator
  for tutorialCompleted exists only as completeTutorial; remove this
  cast when uiSlice exposes a typed setter (q-012).`

**File: `engine/plugins/tutorial/triggers.ts`**
- On `valuesEqual` (lines 60-70): add
  ```
  @invariant Shallow-keyed deep-equal for plain objects only. Walks
    arrays via length + index-keyed recursion, so sparse arrays or
    non-plain objects may misbehave. Used by `delta` triggers.
  ```
- On `delta` snapshot creation (line 148): add
  ```
  @invariant Snapshots use `JSON.parse(JSON.stringify(v ?? null))`.
    Functions, undefined, cycles, and typed arrays cannot be tracked.
  ```

**File: `engine/plugins/tutorial/runner.ts`**
- On `safeAdvance` (lines 85-92): add
  ```
  @invariant Lock released via `queueMicrotask`. Same-tick passive
    evaluators get one advance per change — intentional dedupe.
    Concurrent listeners observe the pre-advance state once.
  @invariant Step-entry effect returns a NO-OP cleanup; transitions
    are handled explicitly by the next step's entry or by the
    deactivation effect. Relying on React-effect cleanup ordering
    would break under strict-mode double-invocation.
  ```
- On the auto-chain block (lines 138-151): add `@invariant
  `autoStartLesson` chains via `completeTutorial()` + `setTimeout
  (startTutorial(next), 300)`. Closing the tab inside the 300 ms
  window silently breaks the chain.`

**File: `engine/plugins/tutorial/anchors.ts`**
- On `tutorAnchorRef` factory (lines 113-120): the existing comment
  block at 110-112 already flags the memoisation requirement. SKIP.
- On `get(id)` (lines 58-70): add
  ```
  @invariant Prefers a visible (non-zero-rect) entry; falls back to
    the first registered entry if all are zero-sized. Consumers
    needing visibility-only must filter the result themselves.
  ```

**File: `engine/plugins/tutorial/Overlay.tsx`**
- On the ResizeObserver wiring (lines 195-218): the existing comment
  at 189-194 already flags the late-registered-anchor drift. SKIP.

**File: `app-gmt/tutorial/lessons.ts`**
- On the lesson-2 chain detection (lines 165-169): add
  ```
  @invariant Detects "chained from lesson 1" by checking
    `formula === 'Mandelbulb' && geometry?.juliaMode` rather than an
    explicit chain token. Refactoring lesson 1's terminal state could
    silently break the no-reseed-on-chain behaviour.
  ```
- On `seedMandelbulb` import (line 13): add `@invariant Reads from
  `registry`, which must already be populated. Two paths populate it
  before tutorials are reachable (eager top-level statement in
  engine-gmt/formulas/index + the app-gmt boot). Followup q-011.`

### ADRs to write

- **0009-tutorial-actionbus-vs-store-monkeypatch**
  - Context: An earlier `action` trigger design patched store actions
    at runtime to fire trigger-advance side-effects. Lessons declaring
    `{ kind: 'action', name: 'camera.reset' }` couldn't be expressed
    without each named action knowing about the tutorial system.
  - Decision: Introduce `engine/plugins/tutorial/actionBus.ts` — a
    string-keyed pub/sub. Call sites fire by name
    (`actionBus.fire('camera.reset')`); lesson trigger evaluators
    subscribe by name. No store mutation; clean unsubscribe on lesson
    end.
  - Consequences: Names are stringly-typed and not enumerated centrally
    — typos surface as silent no-advance. The current cost is small
    (one fire site per action) and is documented in
    `engine/plugins/tutorial/actionBus.ts:1-6`.

- **0010-tutorial-anchors-registry-vs-data-attributes**
  - Context: An earlier design used `data-tut="anchor-name"` attributes
    scattered across components. The overlay located them via
    `document.querySelector('[data-tut=...]')` on every step entry.
    Dynamically-rendered components (per-light gizmo labels) were
    awkward; stale DOM (post-unmount) yielded zero-rect anchors.
  - Decision: Replace data-attributes with a module-singleton
    `tutorAnchors` registry. Components opt in via `useTutorAnchor(id)`
    returning a ref-callback. The registry holds live `HTMLElement`
    references; `get(id)` prefers visible entries; multiple components
    can register the same id; the registry is notify-capable so the
    overlay subscribes to layout changes.
  - Consequences: Late-registered anchors are observed for position
    updates but never added to the per-element ResizeObserver — pure
    resize of a late-registered anchor is not tracked (accepted drift,
    flagged in `Overlay.tsx:189-194`). `useTutorAnchor` is hook-bound;
    JSX `.map(...)` bodies need the non-hook `tutorAnchorRef(id)`
    factory and must memoise it.

### CLAUDE.md rows

- Tutorial system spans engine plugin + app content:
  ```
  | Tutorial / guided lessons, anchors, triggers, step renderers |
   `docs/modules/app-gmt/tutorial.md` |
  ```

### Notes
- This module doc is one of the clearest in the set — source headers
  already carry most rationale (`actionBus.ts:1-6`, `anchors.ts:1-12`,
  `triggers.ts:1-15`, `lessons.ts:1-11`, `effects.ts:1-8`). The harvest
  is correspondingly small.
- `Tutorial.tsx` lives under `engine/plugins/` for installation
  convention even though it's UI-facing (followup q-048). Out of scope
  for this audit but worth noting.

### DROPPED content (brief)
- Public API table (engine + app): re-exports + named exports.
- Per-trigger-kind tables (5 passive + 5 active): catalog content;
  belongs in module doc, not source comments.
- Lesson-by-lesson table: catalog content.
- File header rationale duplications: already in-source.

---

## docs/modules/engine/feature-system.md

### Source files
- `engine/FeatureSystem.ts` (large file; param/feature definition
  types + `featureRegistry` class; sparse top-of-file but JSDoc on
  most types)
- `engine/defineEnumParam.ts` (numeric-index enum helper)
- `engine/typedSlices.ts` (top-of-file JSDoc present)
- `store/createFeatureSlice.ts` (inline comment block at lines 18-31
  documents the freeze pattern + Fragility-Audit F1/F3 cites)

### JSDOC additions

**File: `engine/FeatureSystem.ts`**
- The file has no top-of-file JSDoc. Add:
  ```
  /**
   * DDFS — Data-Driven Feature System core.
   *
   * Features declare identity + params + UI + optional shader injection
   * as a plain `FeatureDefinition` literal; the engine derives state
   * slices, setters, uniform definitions, and CONFIG events.
   *
   * @invariant `featureRegistry` is a module singleton — every importer
   *   sees the same instance.
   * @invariant `register()` is HMR-safe for same-object re-register;
   *   different object with same id is dev-warn / prod-throw.
   * @invariant After `freeze()` new registrations throw in dev, warn-
   *   and-no-op in prod. Dev freeze captures the stack so a later
   *   `FeatureRegistryFrozenError` points at the import that prematurely
   *   triggered store construction.
   * @invariant Dependency cycles do NOT throw — `getAll()` logs
   *   `console.error` and falls back to registration order.
   * @invariant `validateComponentRefs` is opt-in (not called from
   *   `freeze()` — component registry is populated later). Soft-warns;
   *   never throws.
   */
  ```
- On `getAll()` (lines 441-448): existing JSDoc was fixed 2026-05-20
  to match the no-throw cycle fallback. SKIP — already accurate.
- On `getDictionary()` (line 477): add
  ```
  @invariant Per-feature dictionary entries are keyed by `shortId` ONLY.
    Params without `shortId` are absent from preset aliases.
  ```
- On `getUniformDefinitions()` (line 511): add
  ```
  @invariant GLSL type normalisation: `color` → `vec3`, `boolean` →
    `float` (1.0/0.0), `image`/`gradient` → `sampler2D` with null
    default. `extraUniforms` are appended unchanged.
  ```

**File: `store/createFeatureSlice.ts`**
- Top-of-file: add (file currently opens with imports)
  ```
  /**
   * Builds the Zustand slice from `featureRegistry`. Boot-time hot path:
   * registers features → registers preset fields → freezes both
   * registries → iterates `getAll()` to seed state + install one auto-
   * setter per feature.
   *
   * @invariant Auto-setter name `set${FeatureId with capitalised first
   *   letter}` is a load-bearing STRING convention with NO type
   *   enforcement. Four downstream consumers derive the same name:
   *   PresetLogic.applyPresetState, AnimationEngine.getBinder (case 4),
   *   historySlice.beginParamTransaction, typedSlices.setSlice.
   * @invariant Track-id convention `${featureId}.${paramKey}` (scalars)
   *   and `${featureId}.${paramKey}_<axis>` (UNDERSCORE axes) is the
   *   second load-bearing string contract. See engine/animation/
   *   trackBinding.ts for the authoritative form.
   * @invariant `image`-typed params are deliberately excluded from the
   *   `config` event payload (data URLs can be many MB). Restored via
   *   the `texture` event channel.
   * @invariant The setter has NO `oldValue !== newValue` guard. Every
   *   key in `updates` triggers the full sanitise + emit path; equality
   *   short-circuiting lives downstream in `ConfigManager.areValuesEqual`.
   * @invariant `onSet` extras only land for keys not present in the
   *   user-provided `updates` — preset loads override defaults the
   *   `onSet` would otherwise compute.
   */
  ```
- On `composeFrom` gradient re-buffer (lines 186-210): the inline
  comment already calls out the asymmetry. SKIP.

**File: `engine/defineEnumParam.ts`**
- On `defineEnumParam` export (line 79): add
  ```
  @invariant Synthesises a `type: 'float'` ParamConfig with `options[]`
    of `{label, value: i, hint}`. There is NO string-typed enum
    codepath in `ParamType`. Apps map the integer back to the canonical
    string at the engine boundary via `fromIndex`.
  ```

**File: `engine/typedSlices.ts`**
- Top-of-file JSDoc already covers the declaration-merging rationale.
  SKIP.
- On `applyLiveMod` (line 166): add `@invariant Scalars look up
  `featureId.key`; vec-shaped fields override per axis via
  `featureId.key_x|y|z|w`. Returns the same slice reference if nothing
  was touched (zustand-friendly).`
- On `EMPTY_LIVE_MODS` (lines 121-133): add `@invariant Module-frozen
  singleton fallback — using `?? {}` inline in the selector would
  create a fresh object every render and defeat zustand's reference-
  equality re-render gate.`

### ADRs to write

- **0011-numeric-index-enum-params-via-defineenumparam**
  - Context: Slice values for "enum" params (e.g. estimator mode,
    precision mode) need a compact representation. String-typed enums
    require a separate `ParamType` variant and special handling in
    sanitisation, uniform routing, and the auto-setter. Numeric indices
    are uniform with `float` params throughout the pipeline and trivially
    serialisable.
  - Decision: No string-typed enum codepath. `defineEnumParam(values,
    label, opts)` synthesises a `type: 'float'` `ParamConfig` with
    `options: [{label, value: i, hint}]` and returns `fromIndex` that
    clamps NaN / out-of-range back to the default. Apps map the integer
    to the canonical string at the engine boundary (e.g. before
    emitting a `formula` to the worker).
  - Consequences: One extra indirection at every consumer site that
    needs the string form. Serialised presets carry integers, not
    enum names — preset migrations must remap if the tuple order
    changes. Type safety is opt-in via `EnumParam<typeof Values>`.

- **0012-two-registries-frozen-together-in-createfeaturesslice**
  - Context: Fragility audit F3 found hardcoded non-feature scene
    fields (`cameraRot`, `targetDistance`, `sceneOffset`, `cameraMode`,
    `savedCameras`) scattered across preset save/load sites. Adding a
    new top-level field required edits in 4+ places.
  - Decision: Introduce a sibling `presetFieldRegistry` for non-feature
    preset fields. `createFeatureSlice` registers default fields via
    `registerDefaultPresetFields()`, then freezes BOTH the feature
    registry and the preset-field registry in the same boot step.
    Plugins extend the preset-field registry via side-effect imports
    before store construction (e.g. `engine/plugins/camera/presetField`
    for `cameraSlots`, `engine-gmt/store/gmtPresetFields` for `lights`
    + `pipeline`).
  - Consequences: Plugin authors must remember to side-effect-import
    their preset-field registrar; missing it makes the field silently
    drop from save/load. Both registries share the same freeze
    semantics. Documented in this module doc + the boot-shell doc.

### CLAUDE.md rows

- DDFS / feature-system contract:
  ```
  | DDFS features, registry freeze, auto-setter contract, typed slices |
   `docs/modules/engine/feature-system.md` |
  ```

### Notes
- The module doc explicitly supersedes `docs/engine/02_Feature_Registry.md`
  for current API. That older doc is aspirational and lists APIs
  (`defineFeature`, `useFeatureParam`, lifecycle hooks,
  `FeatureIsolationError`, `cacheKey`) that don't exist today.
- The "set${FeatureId} string convention" is the single load-bearing
  contract that has cost real time to debug historically. The proposed
  top-of-file `createFeatureSlice` block makes it greppable.
- `q-019` (DuplicatePresetFieldError) was re-checked in the doc and
  marked not-a-bug — leave the row in the doc for future audits;
  nothing to harvest source-side.

### DROPPED content (brief)
- Public API table (~20 rows): already in source exports.
- Per-type ParamType description table: source has JSDoc on each.
- Per-consumer "interactions" table: cross-subsystem CLAUDE row
  carries the discovery hint; the rest is grep.

---

## docs/modules/engine/shared-ui.md

### Source files
- `components/AutoFeaturePanel.tsx` (no top-of-file JSDoc; bug-fix
  comments scattered inline)
- `components/Slider.tsx` (double-mapping fix comment at 142-144)
- `components/Knob.tsx` (granular-selector block at 168-177)
- `components/CompilableFeatureSection.tsx` (top-of-file JSDoc with
  Mode A / Mode B explanation present)
- `components/registry/ComponentRegistry.tsx` (rationale for
  `ComponentType<any>` at lines 15-21 in-source)
- `components/contexts/StoreCallbacksContext.tsx` (NOOP fallback)
- `components/inputs/index.ts` (barrel; per-file headers vary)
- `components/inputs/ScalarInput.tsx` (the canonical primitive)
- `components/vector-input/index.tsx` (animation-connected wrappers)
- `components/layout/Dock.tsx` (granular selectors at 24-31)
- `components/layout/DropZones.tsx` (granular selectors at 6-8)
- `components/panels/engine/EngineFeatureRow.tsx` (dense variant)
- `components/timeline/*` (subtree — out of scope here)
- `components/graph/*` (subtree — out of scope here)

### JSDOC additions

**File: `components/AutoFeaturePanel.tsx`**
- The file has NO top-of-file JSDoc. Add:
  ```
  /**
   * DDFS panel renderer. Walks `feature.params` and emits the right
   * input primitive per type. The connecting layer between the feature
   * registry and the actual store-bound UI.
   *
   * @invariant Composed-vec decomposition (`config.composeFrom`) MUST
   *   run BEFORE the `onChangeOverride` fork (lines 114-122). Moving
   *   decomposition below the override fork breaks "Local Rotation"
   *   vec3 sliders inside `CompilableFeatureSection` (regression noted
   *   in the inline bug-fix comment).
   * @invariant `onUpdate: 'compile'` default route is HARDCODED to the
   *   GMT app — calls `movePanel('Engine', 'left')` and emits
   *   `'engine_queue'` on FractalEvents (lines 147-153). Non-GMT
   *   hosts (fluid-toy, fractal-toy, demo) silently break their layout
   *   if a feature surfaces compile-mode params here. Followup q-089.
   * @invariant `forcedState` flows through props only; child panels
   *   inside `CompilableFeatureSection` still read live store for
   *   condition evaluation (lines 96-98) — compile-settings params
   *   that depend on each other can mismatch.
   * @invariant `data-help-id` is set on every rendered control
   *   (line 492). `collectHelpIds` walks this attribute; do not
   *   strip it.
   */
  ```

**File: `components/Slider.tsx`**
- On `Slider` default export (line 205): add
  ```
  @invariant Silently degrades without `trackId` — `useTrackAnimation
    (undefined, ...)` returns `status: 'none'` with a no-op toggle.
    No visible warning; animation wiring is opt-in.
  ```
- The double-mapping bug-fix comment at 142-144 already exists. SKIP.

**File: `components/CompilableFeatureSection.tsx`**
- Top-of-file JSDoc already covers Mode A / Mode B. Add on
  `handleCompile` (lines 180-193):
  ```
  @invariant Atomic compile flip: writes `{compileParam: true,
    runtimeToggleParam: true}` in ONE setter call so first-time enable
    cannot land in the "uniform on, shader unbuilt" intermediate
    state. `handleUnload` mirrors this for the off-direction.
  ```
- On the `pc`-merge logic (lines 54-72): the existing bug-fix comment
  about stripping undefineds already exists. SKIP.

**File: `components/registry/ComponentRegistry.tsx`**
- Existing inline rationale for `ComponentType<any>` is good. Add at
  the singleton export (line 47):
  ```
  @invariant Module-singleton; no per-app instances, no test isolation.
    `register()` warns and overwrites — last-registered wins. Plugin
    load order matters; no namespacing.
  ```

**File: `components/contexts/StoreCallbacksContext.tsx`**
- On `NOOP_CALLBACKS` (lines 10-14): add
  ```
  @invariant Missing provider is SILENT. Primitives rendered outside
    `StoreCallbacksProvider` still work but lose undo + context-menu
    integration without any warning. Hosts must wrap their tree in the
    provider explicitly.
  ```

**File: `components/Knob.tsx`**
- On `Knob` connected export (line 167): the existing granular-selector
  block at 168-177 already explains why direct store access. SKIP.
- Optionally add `@todo q-088: migrate to `useStoreCallbacks()` once
  every host memoises its callbacks. One-line swap when ready.`

### ADRs to write

- **0013-componentregistry-componenttype-any-deliberate-widening**
  - Context: An earlier signature was
    `ComponentType<FeatureComponentProps> | ComponentType<any>`. The
    union failed TypeScript's variance check — the compiler couldn't
    pick a branch and forced an `as any` cast at every register call
    site (28 across the project at the time).
  - Decision: Widen the registry's component type to plain
    `React.ComponentType<any>`. Bespoke panels (StateLibrary,
    FormulaSelect, etc.) register with arbitrary prop shapes alongside
    DDFS feature components; the registry doesn't try to type-narrow.
    DDFS-driven panels still receive typed `FeatureComponentProps`
    by virtue of how `AutoFeaturePanel` constructs the props object.
  - Consequences: Losing per-component prop typing at the registry
    boundary; gained 28 dropped casts. The trade is documented at the
    component-type declaration (`components/registry/ComponentRegistry.tsx:15-21`).

- **0014-shared-ui-mid-migration-store-context-vs-direct-store**
  - Context: Primitives in `components/` initially read `useEngineStore`
    directly. A target design ("pure primitives, store via opt-in
    context") was sketched in `docs/engine/05_Shared_UI.md` with five
    contexts (Animation / Undo / ContextMenu / Shortcut / FeatureCompile).
    Migrating all primitives at once is high-risk.
  - Decision: Adopt the opt-in context pattern incrementally. Today
    only `Slider` consumes the single landed context
    (`StoreCallbacksContext`). `Knob`, `Vector*Input`, `Dock`,
    `DropZones`, and `AutoFeaturePanel` keep direct store access until
    each host's callbacks are memoised and the granular-selector
    pattern can be retired. Followup q-088 spells out the one-line
    `Knob` migration once host memoisation is audited.
  - Consequences: The "primitives must not import the store" rule
    from the original `docs/engine/05_Shared_UI.md` is aspirational,
    not enforced. Migration risk is per-host re-render correctness —
    must be tested empirically (fluid-toy max-depth-guard cascade is
    the historical pain point). This ADR captures the deliberate
    incremental approach so future agents don't "fix" the
    inconsistency in one sweep.

### CLAUDE.md rows

- Shared UI primitives + DDFS panel renderer:
  ```
  | DDFS UI rendering, scalar/vector inputs, CompilableFeatureSection,
   componentRegistry | `docs/modules/engine/shared-ui.md` |
  ```

### Notes
- `components/topbar/` is an empty directory — orphan to clean up
  outside this audit.
- `AXIS_CONFIG` is duplicated between `components/inputs/types.ts:161`
  and `components/vector-input/types.ts:13`; both are used. Pure
  cleanup item, not an invariant.
- The 50 ms `setTimeout` in `AutoFeaturePanel.tsx:148` is racing
  EnginePanel mount — q-089 is the path forward once a second app
  surfaces compile-mode params via this code path.
- Massive orphan-sweep list in the module doc is out of scope for
  harvest; that's a separate cleanup task.

### DROPPED content (brief)
- Multiple "file → exports → purpose" tables: pure restated code,
  IDE/grep answers them.
- Timeline + graph subtrees: out of scope here (separate module docs
  exist for those).
- The "what is NOT in this subsystem" section enumerating five
  aspirational contexts that don't exist: useful historical context
  but already captured in ADR 0014; not source-side material.

---

## Summary of artifacts proposed

- **JSDoc additions** (across 5 docs): roughly 24 distinct edits
  spanning 13 source files.
  - boot-shell: 6 edits across 5 files.
  - panels-layout: 5 edits across 4 files.
  - tutorial: 5 edits across 4 files (much already in-source).
  - feature-system: 4 edits across 4 files.
  - shared-ui: 4 edits across 5 files.
- **ADRs** to draft: 10 new ADRs (0005 – 0014).
- **CLAUDE.md rows**: 6 discovery rows.
- **Dropped content**: ~28 catalog / public-API / restated-code
  sections across the 5 docs.

ADRs cover genuinely directional decisions (boot-via-effect,
side-effect imports as registration, single panel manifest,
activeLightPopup singleton, action bus vs monkeypatch, anchor
registry vs data-attrs, numeric-index enums, two-registry freeze,
ComponentType widening, mid-migration store-context pattern). None
are pure "the API does X" restatements.
