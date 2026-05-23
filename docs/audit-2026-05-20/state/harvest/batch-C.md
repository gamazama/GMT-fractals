# Harvest: batch-C

Five module docs decomposed into JSDoc additions (file:line cited), ADRs (decisions with rationale), and CLAUDE.md rows. Source-file top-of-file JSDoc is already strong in most cases; harvest focuses on invariants that are NOT yet in source comments and on decisions that warrant standalone ADR capture.

---

## docs/modules/engine/adaptive-resolution.md

### Source files
- `engine/AdaptiveResolution.ts` (pure decision module)
- `engine/HardwareDetection.ts` (one-shot hardware probe)
- `engine/plugins/Viewport.tsx` (plugin entry + render-scale source registry)
- `engine/plugins/viewport/ViewportFrame.tsx` (authoritative ResizeObserver + Fixed/Full layout)
- `engine/plugins/viewport/ViewportModeControls.tsx` (mode chrome + render-scale pill)
- `engine/plugins/viewport/FixedResolutionControls.tsx` (drag-resize + aspect presets)
- `engine/plugins/viewport/AdaptiveResolutionBadge.tsx` (four-state pill)

### JSDOC additions

**File: `engine/AdaptiveResolution.ts`**
- Top-of-file already documents the algorithm + caller `selfResized` rule (lines 1-46). NO additional invariant block needed.
- On `tickAdaptiveResolution` (line ~146): `@invariant state.scale is bounded [1.0, 1 / max(0.01, minQuality)] on every smart-mode assignment (AdaptiveResolution.ts:151-152, 230-231, 249).`
- On `tickAdaptiveResolution` (line ~146): `@invariant gateOnAccumOnly disables BOTH the isInteracting activity write AND the (isInteracting || !mouseOverCanvas) clauses of activitySignal (AdaptiveResolution.ts:176, 216-219). Used by fluid-toy whose accumulator is not invalidated by unrelated UI drags.`
- On `tickAdaptiveResolution` (line ~146): `@invariant holdUntilMs only blocks downscale — comparison is strict nextScale > state.scale; upscale is always permitted during hold (AdaptiveResolution.ts:251-256).`
- On `tickAdaptiveResolution` (line ~146): `@invariant fullResAccum resets to 0 whenever scale > 1.001 — deep-accum protection only re-arms after sustained full-res render (AdaptiveResolution.ts:191-195).`

**File: `engine/HardwareDetection.ts`**
- On `detectHardwareProfile` (line 13): `@invariant Not cached — each call allocates and deletes a 1x1 RGBA32F framebuffer + texture. Safe to call repeatedly but not free; detect once at boot (HardwareDetection.ts:22-34).`
- On `detectHardwareProfile` (line 13): `@invariant compilerHardCap flattens both mobile tiers to MOBILE_HARD_CAP (256); desktop uses DEFAULT_HARD_CAP (2000). Units are raymarch/DE loop iteration count, not pixels (HardwareDetection.ts:50-55, data/constants).`

**File: `engine/plugins/Viewport.tsx`**
- On `installViewport` (line ~72): `@invariant Idempotent on subscription wiring (via _installed flag) but setAdaptiveConfig runs every call — a second installViewport({ targetFps: 60 }) WILL apply the config without double-subscribing (Viewport.tsx:73-95).`
- On `viewport.holdAdaptive` (line ~121): `@note Default holdMs is adaptiveConfig.activityGraceMs * 4. The inline comment that still says "graceMs" is a stale source-comment, not the public API name (followup q-041).`

**File: `engine/plugins/viewport/ViewportFrame.tsx`**
- On `ViewportFrame` (line 87): `@invariant Sole authoritative writer of canvasPixelSize (ViewportFrame.tsx:103-136). Mount-time seed uses getBoundingClientRect() so consumers see non-zero size before the first ResizeObserver callback (ViewportFrame.tsx:126-129).`
- On `ViewportFrame` (line 87): `@invariant Fixed-mode inner container forces boxSizing: content-box to defeat Tailwind preflight; without this the 1px outline shrinks saved images by 2px per axis (ViewportFrame.tsx:146-163).`

**File: `engine/worker/ViewportRefs.ts`** (cross-cutting with worker-contract doc)
- On `setMouseOverCanvas` / `isMouseOverCanvas` (lines 120-122): `@invariant Ref-backed, NOT a Zustand selector — adaptive-resolution hot path polls every frame and must not trigger React reconciliation on hover. AdaptiveResolutionBadge therefore does NOT re-render on mouse-over alone; only on the next adaptive state change (followup q-043).`

### ADRs to write

- **ADR-00XX — Pure adaptive-resolution decision module shared by worker + main thread**
  - **Context:** GMT's worker had a downsample feedback loop in `UniformManager.syncFrame`; main-thread apps (fluid-toy, fractal-toy) needed the same algorithm without the worker substrate.
  - **Decision:** Extract `engine/AdaptiveResolution.ts` as a pure module — no DOM, no THREE, no worker assumptions — and call it verbatim from both `UniformManager` and `viewportSlice`. State is per-caller, mutated in place; caller owns buffer resize and accumulation reset.
  - **Consequences:** One algorithm to maintain. The caller-owns-`selfResized` contract is load-bearing — without it, the caller's own accumulation reset reads as scene activity and adaptive re-engages immediately. Only `engine-gmt/engine/managers/UniformManager.ts:137` writes it today; the main-thread slice doesn't need it because it doesn't synchronously reset accumulation in response to scale changes (followup q-042).

- **ADR-00XX — Granular hooks + imperative façade, not a single useViewport()**
  - **Context:** Consumers vary widely — the FPS HUD only needs `fps`/`fpsSmoothed`; the canvas only needs `canvasPixelSize`; the badge needs `adaptiveSuppressed` + `adaptiveConfig`. A unified `useViewport()` would re-render every consumer on any change.
  - **Decision:** Five granular hooks (`useQualityFraction`, `useViewportSize`, `useViewportFps`, `useViewportInteraction`, `useViewportMode`) + an imperative `viewport.*` façade (`frameTick`, `reportFps`, `holdAdaptive`, `suppressAdaptive`, `setConfig`). The planned `useViewport` / `setAdaptive` / `setMode` / `onResize` callback surface from `docs/engine/10_Viewport.md` was deliberately not built.
  - **Consequences:** Each consumer re-renders only on its tracked slice. Apps wire imperative changes via the façade or store actions; there is no `<PerformanceWarning>` / `<ViewportArea canvasSlot>` chrome.

- **ADR-00XX — Render-scale pill source is pluggable, not hard-wired to viewportSlice.renderScale**
  - **Context:** The default in-canvas render-scale pill reads/writes `viewportSlice.renderScale` (fluid-toy / fractal-toy consume that field). GMT's actual internal-pixel multiplier lives at `quality.aaLevel`, so the pill must target a different field.
  - **Decision:** `setRenderScaleSource(source)` registers a `{ use, steps, formatLabel? }` triplet at boot. `RenderScaleControl` picks `DefaultScalePill` vs `CustomScalePill` once (no conditional hook calls) and never changes the choice at runtime.
  - **Consequences:** GMT's `app-gmt/main.tsx:152` is the only caller registering a custom source today. The two-component split is load-bearing because `source.use()` is itself a hook.

### CLAUDE.md rows

- "When touching `engine/AdaptiveResolution.ts`: the algorithm is shared verbatim with `engine-gmt/engine/managers/UniformManager.ts` and with `store/slices/viewportSlice.ts`. Any change must be verified against both callers. The caller MUST set `state.selfResized = true` before a resize-triggered accumulation reset, or adaptive will re-engage immediately."
- "When installing the viewport plugin in a new app: `installViewport()` is idempotent but `setAdaptiveConfig` runs on EVERY call — calling it twice with different `{ targetFps }` will apply the second value. Hovering does NOT re-render React subscribers (`mouseOverCanvas` is a ref); only the next adaptive state change does."

### Notes

- The module doc's `setAdaptive` / `setMode` / `onResize` / `onQualityChange` / `useViewport` / `<ViewportArea canvasSlot>` / `<PerformanceWarning>` enumeration is "planned, never built" — captured in ADR-3 / CLAUDE row scope. Don't accidentally re-document the dead surface.
- `engine-gmt/engine/HardwareDetection.ts` is a duplicate of `engine/HardwareDetection.ts` (recurring duplicate-module-state fork pattern). Out of scope for this harvest; capture as a known drift in `feedback_duplicate_module_state.md` reference.
- `supportsFloat32` vs `caps.bufferPrecision` are redundant signals (followup q-045) — not actionable here but worth noting in any future `types/viewport.ts` cleanup.

### DROPPED content

- The full Public API table (interfaces, prop shapes, re-export list, hook signatures) — restates code; TypeScript IDE tooling already exposes it.
- Detailed algorithm walk-through (smart-adaptive seeding formula, EMA windows, settled-state branch) — restates code; the top-of-file docblock at `AdaptiveResolution.ts:1-46` already summarises it.
- Field-by-field `AdaptiveResolutionState` / `AdaptiveResolutionInput` / `AdaptiveResolutionResult` tables — read from source.
- Component-leaf prop tables (`ViewportFrameProps`, `ViewportModeControlsProps`, `AdaptiveResolutionBadgeProps`) — read from source.
- Historical-context section recounting `docs/engine/10_Viewport.md` aspirations — preserved by pointer in that doc itself; not load-bearing for code edits today.

---

## docs/modules/engine/audio-fps-sync.md

### Source files
- `engine/animation/audioClipSync.ts` (live-preview tick driver)
- `engine/animation/audioExportMix.ts` (offline interleaved-stereo mixdown)
- `engine/animation/audioFileCache.ts` (page-lifetime `File` cache, two-deck)

### JSDOC additions

**File: `engine/animation/audioClipSync.ts`**
- Top-of-file rationale already inline at lines 4-8 (SCRUB_JUMP_SEC) and 22-35 (the never-seek-during-steady-play rule). NO additional top-block needed.
- On `syncAudioClips` (line 36): `@invariant Module globals (prevFrame, prevPlaying, ownedDecks) persist across HMR. Tests must call _resetAudioClipSync() between cases (audioClipSync.ts:10-20).`
- On `syncAudioClips` (line 36): `@invariant Out-of-range during play only pauses an owned deck (ownedDecks.has(deckIndex)) — prevents pausing decks the timeline never claimed from the AudioMod UI (audioClipSync.ts:64-69).`
- On `syncAudioClips` (line 36): `@invariant Out-of-range during pause clears deck ownership — future plays from the AudioMod UI are not reclaimed (audioClipSync.ts:76-81).`
- On `SCRUB_JUMP_SEC` (line 8): `@invariant 0.5s threshold is calibrated against a 25Hz RAF (~40ms/tick). If ANIMATE ticks slower than ~2Hz, false scrub-seeks will appear.`

**File: `engine/animation/audioExportMix.ts`**
- On `mixAudioClipsForExport` (line 15): `@invariant Export window uses inclusive end: (endFrame + 1) / fps covers the trailing frame's full 1/fps slot. Without +1 the audio mix is one frame short (~40ms at 25fps) at the tail. If endFrame ever becomes exclusive, drop the +1 (audioExportMix.ts:27-32).`
- On `mixAudioClipsForExport` (line 15): `@invariant Hard-clipping with no per-clip gain — overlapping clips at full gain distort. AudioClip has no gain field (audioExportMix.ts:97-101).`
- On `mixAudioClipsForExport` (line 15): `@invariant Linear-interpolation resample only — adequate for typical 44.1k → 48k; no anti-alias lowpass for large rate ratios (audioExportMix.ts:70-72).`
- On the `void srcEndT` marker (audioExportMix.ts:91): `@note Intentional unused-binding suppression; preserves documentation value. If surrounding writeLen/audibleEndSec math is refactored, drop the void marker too.`

**File: `engine/animation/audioFileCache.ts`**
- Top-of-file docblock at lines 1-4 already documents the structured-cloneable-metadata-in-store / raw-File-only-here split. NO addition needed.
- On the `cache` Map (line 6): `@invariant deckIndex is the literal union 0 | 1 — AudioAnalysisEngine + the cache both assume a two-deck mixer. Adding a third deck requires widening the union in multiple files.`

### ADRs to write

- **ADR-00XX — Never seek during steady-state play**
  - **Context:** Each `audioAnalysisEngine.seek` on the underlying `<audio>` element produces an audible click. The deck's native clock is already an accurate real-time reference between timeline transitions.
  - **Decision:** Only three edge cases touch a playing deck — `justResumed` (paused→playing), `justScrubbed` (frame delta > 0.5s timeline time), and out-of-range (pause-only). Steady-state play is a no-op even though the timeline frame advances every tick.
  - **Consequences:** No clicking during normal playback. Brief render stalls (5-frame jumps ≈ 0.2s at 25fps) free-run rather than seek — the deck and timeline reconverge on the next tick. The `SCRUB_JUMP_SEC = 0.5` constant is the load-bearing threshold; lowering it would re-introduce stall-clicks, raising it would let real scrubs feel sluggish.

- **ADR-00XX — Raw `File` cached out-of-band, not in the animation store**
  - **Context:** `AudioClip` must round-trip through GMF save / load and (for the offscreen worker) structured-clone. A `File` is structured-cloneable in principle, but storing it on the animation store would bloat snapshots and serialised history with a binary the UI rarely needs after initial peak decode.
  - **Decision:** `audioFileCache` is a module-level `Map<0 | 1, File>` keyed by deck index, written by AudioStrip on file load and cleared on clip remove. Reads happen only inside `mixAudioClipsForExport`. The store carries metadata + structured-cloneable peaks; the `File` lives here only.
  - **Consequences:** Closing the tab loses the file — GMF saves preserve clip metadata but reopening requires a re-upload. Decode failures during export are silent at the boundary (call site at `exportRunner.ts:430-436` swallows + logs); the user only sees a "silent video" outcome. Beauty-pass-only audio dispatch means a pass-dispatch bug could silently produce silent exports.

### CLAUDE.md rows

- "When changing `audioClipSync.ts`: the three permitted edge cases (`justResumed` / `justScrubbed` / out-of-range) are the ONLY times a playing deck is touched. Tests must call `_resetAudioClipSync()` between cases because module globals (`prevFrame` / `prevPlaying` / `ownedDecks`) persist across HMR."

### Notes

- Cross-engine import: `engine-gmt/components/timeline/RenderPopup/exportRunner.ts:34` imports `mixAudioClipsForExport` from `engine/animation/audioExportMix` — unusual `engine-gmt → engine` direction. Worth confirming the layering intent during future cleanup but not a bug today.
- The "decode failure is silent" / "beauty-pass-only dispatch" observations are real but live at the exportRunner call site, not in this module — captured for the export-pipeline harvest, not here.

### DROPPED content

- Full Public API table (`MixedAudio` shape, signature of `mixAudioClipsForExport`, etc.) — restates code.
- Per-clip mix loop walkthrough (decode → intersect → resample → sum) — restates code and is already documented inline.
- Edge derivation table (`justResumed` / `justPaused` / `justScrubbed` definitions) — restates one-line expressions at `audioClipSync.ts:45-50`.
- Window math block (exportStartSec / exportEndSec / durationSec / numFrames) — restates `audioExportMix.ts:25-36`.

---

## docs/modules/engine/camera-plugin.md

### Source files
- `engine/plugins/Camera.ts` (adapter-based slot recorder)
- `engine/plugins/camera/presetField.ts` (side-effect preset-field registration)
- `engine/appHandles.ts` (typed-singleton primitive; not camera-specific)
- `engine/migrations.ts` (preset migration layer; not camera-specific)
- `engine/store/createStateLibrarySlice.ts` (generic snapshot library factory)
- `engine/store/installStateLibrary.ts` (slice + shortcuts + menu bundle)

### JSDOC additions

**File: `engine/plugins/Camera.ts`**
- Top-of-file rationale already strong at lines 1-25 (adapter design + the toy-app camera-shape divergence). NO header addition needed.
- On the `camera` singleton (line ~72): `@invariant SLOT_COUNT = 10 but index 0 is unused; valid slots are 1..9. Both saveSlot and recallSlot reject n < 1 || n >= SLOT_COUNT (Camera.ts:58, 78, 94).`
- On `saveSlot` / `recallSlot` (line ~77-99): `@invariant Returns false silently with no console warning when no adapter is registered — a missing camera.register() call is hard to spot. captureState() and applyState() also run inline without try/catch; a thrown adapter propagates out of the shortcut handler.`
- On `uninstallCamera` (line 157): `@invariant Does NOT clear cameraSlots from the store — only nukes shortcuts and the adapter. Data persists; re-install (or preset load) recovers it unchanged (followup q-065).`
- On the `cameraSlots` setState write (line ~67): `@invariant Written via (useEngineStore as any).setState — the as any cast bypasses TypeScript collision detection. A future DDFS feature named cameraSlots would silently overwrite. Keeping the unprefixed key is intentional (wire-format is load-bearing for .gmf preset round-trip); a declare-merged EngineState typing would compile-warn without changing wire format.`

**File: `engine/plugins/camera/presetField.ts`**
- Top-of-file docblock at lines 1-15 already documents the early-side-effect-import contract. NO addition needed.

**File: `engine/appHandles.ts`**
- Top-of-file rationale already strong at lines 1-42. NO header addition needed.
- On `defineAppHandles` (line ~77): `@invariant globalThis.__appHandles[name] is dev-only — gated by import.meta.env.DEV (appHandles.ts:113-115). Production smoke tests cannot enumerate handles.`

**File: `engine/migrations.ts`**
- Top-of-file pattern docblock at lines 1-37 already explains version semantics. NO header addition needed.
- On `applyMigrations` (line ~76): `@invariant m.apply throws are caught and logged; the migration chain continues with the unchanged preset (migrations.ts:82-87). Returning falsy is treated as "no change", not "void output": preset = m.apply(preset) ?? preset (migrations.ts:84).`
- On `_migrations` / `_sorted` (lines 49-50): `@invariant Module-scope state; the first apply or list after any registerMigration re-sorts in place (migrations.ts:64-65, 78-79).`

**File: `engine/store/createStateLibrarySlice.ts`**
- Top-of-file docblock at lines 1-28 already documents the factory pattern. NO header addition needed.
- On `installStateLibrarySlice` (line ~143): `@invariant Idempotency guard at lines 150-154 AND-checks arrayKey + actions.add only. Two unchecked silent-failure scenarios: (a) same arrayKey, different actions.add — re-install silently clobbers arrayKey: [] and wipes saved snapshots; (b) different arrayKey, same actions.add — second install's addSnapshot closure overrides the first, so the cameras library's action silently redirects to the views library's storage. GMT does not trip either today (followup q-064).`
- On `saveToSlot` (line ~297): `@invariant slotIndex > arr.length rejects with a warning toast rather than appending out-of-order (saveToSlot.ts:299-313). slotIndex < arr.length overwrites; slotIndex === arr.length appends.`
- On `update` (line ~230): `@invariant update with no patch overwrites snapshot state with current live state and awaits captureThumbnail inline — rapid double-click of the Save button can race two captures into the array; no de-dup guard. activeIdKey does NOT change on update; selection survives overwrites.`
- On `duplicate` (line ~258): `@invariant Deep-clones via JSON.parse(JSON.stringify(src)), inserts adjacent, AND re-applies — duplicating an inactive snapshot makes it active and triggers apply (side effect).`

**File: `engine/store/installStateLibrary.ts`**
- Top-of-file docblock at lines 1-19 already documents the opt-out structure. NO header addition needed.
- On `installStateLibrary` (line ~100): `@invariant Toast topbar slot is auto-mounted only when opts.menu is non-null. Apps passing menu: null (e.g. app-gmt's hand-wired Camera menu) must mount <StateLibraryToast arrayKey> themselves (installStateLibrary.ts:106-109, 112-126).`
- On slot-shortcut handlers (lines ~147-163): `@invariant Read action functions at fire time, not install time — robust against ordering between installStateLibrary and the underlying slice install.`

### ADRs to write

- **ADR-00XX — Two parallel snapshot systems by design**
  - **Context:** The lightweight `@engine/camera` adapter plugin stores up to 9 opaque-JSON snapshots in `cameraSlots[]` with no list UI. The richer `installStateLibrary` factory adds `StateSnapshot<T>` envelopes with labels / thumbnails / drag-reorder / inline-rename / multi-library support. Apps' needs split — fractal-toy is happy with the lightweight slots; GMT and fluid-toy need the managed library UX.
  - **Decision:** Neither system is deprecated. Apps that want both install `installCamera({ hideShortcuts: true })` for the preset round-trip + `window.__camera` dev handle AND `installStateLibrary` for the managed library. The camera plugin's adapter is intentionally never registered in dual-install apps; save/recall via the camera plugin would no-op anyway.
  - **Consequences:** `Ctrl+1..9` binds in exactly one system per app (controlled by `hideShortcuts`). Two storage keys, two action surfaces, two shortcut registries. A future palettes / brush-presets library follows the `installStateLibrary` template (not the camera plugin) (followup q-065).

- **ADR-00XX — Adapter-opaque JSON for camera state, not a canonical shape**
  - **Context:** Toy apps have radically different camera shapes — fluid-toy's 2D `{ center, zoom }`, fractal-toy's 3D orbit `{ orbitTheta, orbitPhi, distance, fov, target }`, GMT's 6-DOF camera. A canonical-shape plugin would force bad abstractions.
  - **Decision:** Apps register a `CameraAdapter { featureId, captureState, applyState }`. The plugin stores `Record<string, any>` and never interprets it. No DDFS knowledge, no feature-state shape, no Three.js dependency.
  - **Consequences:** A headless test harness, a VR app, or a 2D side-scroller all plug in with the same API. Type safety inside slots is the adapter's responsibility — the plugin can't enforce shape compatibility across save / load.

- **ADR-00XX — `installStateLibrary` shipped as two keys (arrayKey + activeIdKey), not one**
  - **Context:** The original proposal (`docs/engine/15_Camera_Manager_Extraction.md:131`) imagined a single `storeKey` option with derived field names. As the factory shipped, GMT and fluid-toy both wanted to control the active-id field name independently (`activeCameraId` vs `activeViewId`) for declaration merging on `EngineStoreState`.
  - **Decision:** Two explicit keys (`arrayKey`, `activeIdKey`) and an explicit `StateLibraryActionNames` map for the 8 internal action names. GMT keeps literal `addCamera` / `selectCamera` names rather than a derived prefix.
  - **Consequences:** Apps pay two configuration parameters instead of one; in return, type augmentation per library is straightforward and multiple libraries (cameras + views + future palettes) coexist without prefix collisions. The narrow idempotency guard (arrayKey + actions.add) is a known gap (followup q-064) — fix is module-scope `Set<string>` registries.

### CLAUDE.md rows

- "When installing the camera plugin: import `engine/plugins/camera/presetField` as an early side effect BEFORE any store-touching import. Importing `Camera.ts` first freezes the preset-field registry and `cameraSlots` silently fails to round-trip. Follow the pattern at `fluid-toy/main.tsx` / `fractal-toy/main.tsx`."
- "When installing `installStateLibrary` in a new app: pick a UNIQUE `arrayKey` and UNIQUE `actions.add` name — the slice's idempotency guard is narrow and either-side collisions cause silent data loss / silent action mis-routing (followup q-064). Apps that pass `menu: null` must manually mount `<StateLibraryToast arrayKey>` as a topbar slot."

### Notes

- The module doc bundles SIX distinct primitives — camera plugin, presetField, appHandles, migrations, createStateLibrarySlice, installStateLibrary — and the StateLibrary UI primitives live in a parallel sibling subsystem (e09b, see next entry). Future restructure: split `migrations.ts` and `appHandles.ts` into their own module docs; they appear here by location, not by topic.
- Phase 2 carry-in items (subsystem-gaps, latent bugs) are recorded in the source doc; not duplicated as ADRs here because they're tracked work, not shipped decisions.
- The cross-cutting `setState(... as any)` pattern across plugins (`cameraSlots`, `tutorialCompleted`, `lights`, etc.) is a recurring fork-divergence pattern — capture in `feedback_duplicate_module_state.md` reference, not as an ADR here.

### DROPPED content

- Full per-symbol API tables for all 6 modules — restate exported signatures verbatim.
- Field-by-field option enumeration for `StateLibraryOptions<T>` and `InstallStateLibraryOptions<T>` — read from source.
- `TOAST_FIELD_SUFFIX` / `DOT_FIELD_SUFFIX` constant values — restate code.
- Detailed action-by-action walkthrough (add returns Promise<string>, select(null) clears active only, etc.) — restates internal contracts already self-documenting in source.
- Historical-context section comparing shipped surface to `docs/engine/15_Camera_Manager_Extraction.md` proposal — preserved as a pointer; the proposal is the design rationale and stays read-only.

---

## docs/modules/engine/state-library-ui.md

### Source files
- `components/StateLibraryPanel.tsx` (list + thumbnail + drag-reorder + inline-rename shell)
- `engine/components/StateLibraryToast.tsx` (saved-toast pill)
- `components/ActiveSnapshotFeatures.tsx` (DDFS-panel footer)

### JSDOC additions

**File: `components/StateLibraryPanel.tsx`**
- Top-of-file docblock at lines 1-23 already enumerates owned vs not-owned concerns. NO header addition needed.
- On `StateLibraryPanel` (line 95): `@invariant Only the drag-handle child is draggable; the row itself is NOT. Without this split, row click would race against the HTML5 drag-start and frequently swallow the click (StateLibraryPanel.tsx:197-217). Drag handlers stopPropagation on dragStart.`
- On `StateLibraryPanel` (line 95): `@invariant Slot-shortcut hint is hardcoded to the first 9 rows. Rows at index >= 9 render no Ctrl+N hint regardless of how many snapshots exist (StateLibraryPanel.tsx:260-264). Matches the slice's count: 9 default.`
- On `StateLibraryPanel` (line 95): `@invariant isModified is consulted ONLY for the active row — non-active rows never render the modified marker even if dirty (StateLibraryPanel.tsx:194). The cyan highlight already identifies which row is "live"; the asterisk only adds value there.`
- On `StateLibraryPanel` (line 95): `@invariant Delete fires immediately — no confirmation dialog. UX safety is offloaded to the slice's undo hooks (StateLibraryPanel.tsx:59 header comment).`
- On rename input (lines ~239-240): `@invariant Rename submits on Enter or blur; Escape clears editId without firing onRename — cancel semantics are key-driven, not button-driven.`

**File: `engine/components/StateLibraryToast.tsx`**
- Top-of-file docblock at lines 1-19 already documents the topbar-slot mount pattern. NO header addition needed.
- On `StateLibraryToast` (line 31): `@invariant Returns null when no toast is pending — no internal timer; the slice owns toast lifetime via setTimeout (engine/components/StateLibraryToast.tsx:34).`
- On `StateLibraryToast` (line 31): `@invariant toastFieldKey(arrayKey) is the only contract between toast and slice. A typo in arrayKey at EITHER call site produces a dead toast with no runtime error (StateLibraryToast.tsx:23, 32).`

**File: `components/ActiveSnapshotFeatures.tsx`**
- Top-of-file docblock at lines 1-26 already documents the inline-editing pattern. NO header addition needed.
- On `ActiveSnapshotFeatures` (line 54): `@invariant Collapses to null when both !activeId AND inactiveLabel === null. Default behaviour hides the footer entirely when no snapshot is active; supply an inactiveLabel string to keep the header visible as a "free camera" / "no view" hint (ActiveSnapshotFeatures.tsx:62, 66).`
- On `ActiveSnapshotFeatures` (line 54): `@invariant The Deselect button only renders when BOTH activeId is truthy AND onDeselect was provided (ActiveSnapshotFeatures.tsx:72-80).`

### ADRs to write

- **ADR-00XX — UI primitives are fully controlled, never own library state**
  - **Context:** `createStateLibrarySlice` already owns the snapshot list, active id, transient toast field, and notify-dot field. If the UI primitives also managed local list state, the two would diverge under undo / preset load / multi-pane scenarios.
  - **Decision:** `StateLibraryPanel` is fully controlled — every piece of snapshot data plus every handler comes from props; only transient UI (editId, editName, in-flight drag) lives in `useState`. `StateLibraryToast` and `ActiveSnapshotFeatures` each subscribe to exactly one store field via `useEngineStore` and never write to the store.
  - **Consequences:** Three primitives that work identically for cameras, views, palettes, and any future library. App-side shells (e.g. `CameraManagerPanel`) wire the slots (`toolbarBefore` / `toolbarAfter` / `footer` / `presets[]`). The dead-toast-on-typo silent failure (q-064-adjacent) is a contract risk worth a future mount-time validation.

### CLAUDE.md rows

- "When wiring `StateLibraryPanel`: pass the same `arrayKey` to `installStateLibrary` AND `<StateLibraryToast>`. A typo at either site silently produces a dead toast — `toastFieldKey(arrayKey)` is the only contract and there is no runtime validation."

### Notes

- The `engine/components/` vs `components/` location split is intentional: `StateLibraryToast` is engine-distributed and imports intra-engine from `../store/createStateLibrarySlice`; the panel and features are app-side and import via `../engine/store/createStateLibrarySlice`. Don't relocate without checking import paths in consumers.
- The async-save race (rapid double-click on Save) is real but lives at the slice layer (e09), not in these primitives — `StateLibraryPanel` does no debouncing on the Save button.

### DROPPED content

- Full prop table for `StateLibraryPanel` (required + optional with defaults) — restates code.
- Prop tables for `StateLibraryToast` / `ActiveSnapshotFeatures` — restate code.
- "Architecture" walkthrough of slot-driven composition + dynamic Tailwind grid — already inline in source comments.
- Detailed slot enumeration (`toolbarBefore`, `toolbarAfter`, `footer`, `presets[]`) — read from the props interface.

---

## docs/modules/engine/worker-contract.md

### Source files
- `engine/worker/WorkerProxy.ts` (stub + registry singleton)
- `engine/worker/ViewportRefs.ts` (R3F camera + canvas refs + display-camera snapshot + mouseOverCanvas ref)

### JSDOC additions

**File: `engine/worker/WorkerProxy.ts`**
- Top-of-file docblock at lines 1-15 already documents the stub-after-extraction shape. NO header addition needed.
- On `setProxy` / `getProxy` (lines 296-303): `@invariant getProxy() lazily creates a stub if no setProxy() has fired — a forgotten install silently downgrades to no-op rather than crashing. Symptoms: perpetual unbooted state, picks return null, exports reject. gpuInfo returning the literal 'Stub (no worker)' is the useful tell (WorkerProxy.ts:155, 300-303).`
- On `setProxy` (line 296): `@invariant Must run before any caller has captured a reference from getProxy() — otherwise different consumers can capture different references (stub vs real). Install at host-app boot.`
- On `bootWithConfig` (line 104): `@invariant Stub synthesises immediate isBooted = true and invokes onBooted synchronously so generic UI doesn't spin forever on a "compiling" indicator. Real subclasses replacing this method must preserve the semantic if generic dev/ code waits on onBooted (WorkerProxy.ts:108-112).`
- On `startExport` / `renderExportFrame` / `finishExport` (lines 237-258): `@invariant Reject rather than no-op — callers must .catch or use try/await, otherwise the rejection surfaces as an unhandled promise. cancelExport flips _isExporting = false WITHOUT rejecting in-flight promises.`
- On the `shouldSnapCamera` / `cameraInUse` getter/setter pairs (lines 148-153): `@invariant Setters accept values but are silently dropped; getters return hard false. UI code that toggles them on the stub loses the write.`
- On `pendingTeleport` / `modulations` (lines 80, 83): `@invariant Public mutable fields — direct writes are the supported API, not action dispatch. AnimationSystem writes modulations every frame; the real worker reads it on sendRenderTick.`

**File: `engine/worker/ViewportRefs.ts`**
- Top-of-file docblock at lines 1-14 already documents the R3F-overlay bridge. NO header addition needed.
- On `setMouseOverCanvas` / `isMouseOverCanvas` (lines 120-122): `@invariant Module-scope let, NOT a Zustand selector — the adaptive-resolution hot path polls every frame and must not trigger React reconciliation on hover. The AdaptiveResolutionBadge does NOT re-render automatically when the mouse crosses the canvas; only on the next adaptive state change (followup q-043).`
- On `snapshotDisplayCamera` (line 60): `@invariant Reads engineStore via (as any) cast (ViewportRefs.ts:61). If optics is absent, the snapshot silently treats the camera as perspective (isOrtho = false). The ortho-mode test is camType > 0.5 && camType < 1.5 — brittle if more camera types are added.`
- On `snapshotDisplayCamera` (line 60): `@invariant Lazy display-camera allocation, never freed. _displayPerspCamera and _displayOrthoCamera are allocated on first use and survive for the module's lifetime — fine for a singleton, but tests iterating ViewportRefs should know.`
- On `getDisplayCamera` (line 113): `@invariant Falls back to live _camera before first snapshot — overlays consuming the result before SNAPSHOT has run will get the live perspective camera (wrong projection if ortho is active).`
- On `setViewportCamera` / `setViewportCanvas` (lines 32-39): `@invariant Module-level singleton state — multiple <Canvas> instances would clobber each other; no per-canvas isolation.`

### ADRs to write

- **ADR-00XX — Stub-after-extraction with registry-pattern singleton**
  - **Context:** In stable, `WorkerProxy` fronted a real Web Worker that owned `FractalEngine` + OffscreenCanvas. The engine extraction (dev/) stripped the render worker wholesale. Downstream consumers — store slices, UI components, hooks, ~30 files outside `engine/worker/` — could not be cascade-edited without breaking the engine-extraction milestone.
  - **Decision:** Preserve the full API surface as a no-op stub in engine-core. Apps that want real worker offload install over the stub via `setProxy` / `getProxy` — one shared singleton across imports. Generic dev/ code and engine-gmt's real-worker code both call `getProxy()` and see the same instance.
  - **Consequences:** Generic code compiles and runs against the stub (picks return null, exports reject, `gpuInfo === 'Stub (no worker)'`). The host app's install site must run BEFORE any caller captures a reference, or stub / real diverge. The cross-fork `setEngineProxy(proxy as any)` cast at `engine-gmt/renderer/install.ts:61` is a structural-typing escape hatch; a shared `EngineProxy` interface would close that gap (followup q-078).

- **ADR-00XX — Opaque types at the worker boundary**
  - **Context:** `EngineRenderState`, `BucketRenderConfig`, `SerializedCamera`, `SerializedOffset` could carry richer types (the real worker fills `EngineRenderState` with many fields), but the stub doesn't know them and freezing the shapes would force engine-core changes every time the real engine grew a field.
  - **Decision:** Keep the four shapes deliberately minimal — `EngineRenderState = Record<string, unknown>`, `virtualSpace: unknown | null`, `pipeline: unknown | null`. The real worker fills the gaps; the stub stays generic.
  - **Consequences:** Apps re-introducing a real engine swap richer types without touching the contract. No compile-time validation of `EngineRenderState` shape — callers rely on convention.

- **ADR-00XX — `mouseOverCanvas` is a ref, not store state**
  - **Context:** Adaptive resolution polls hover state every frame. Driving hover through Zustand would trigger React reconciliation on every mouse-cross and on every subscriber re-render (the AdaptiveResolutionBadge would re-render on every hover).
  - **Decision:** `_mouseOverCanvas` is a module-scope `let` accessed via plain `setMouseOverCanvas` / `isMouseOverCanvas` functions. Not a hook, not a selector, not store-backed.
  - **Consequences:** The badge does NOT re-render automatically when the mouse crosses the canvas — only when the next adaptive state change fires. This is the load-bearing contract; future "make it reactive" refactors would regress the adaptive-resolution hot path (followup q-043). Documented in both the worker-contract and adaptive-resolution module docs.

### CLAUDE.md rows

- "When changing `engine/worker/WorkerProxy.ts`: the stub-and-registry pattern is load-bearing — `setProxy()` must run before any caller has captured a reference from `getProxy()`. The real worker-backed implementation lives at `engine-gmt/engine/worker/WorkerProxy.ts` and is structurally distinct; do NOT back-port worker-specific code into the stub (engine/ stays generic; engine-gmt/ keeps GMT-specific behaviour)."

### Notes

- `ViewportRefs.ts` is filed under `engine/worker/` for historical reasons — it used to live next to the WorkerProxy that fed the worker camera. A future refactor could relocate it to a more honestly-named module. Not actionable in Phase 2.
- The `EngineRenderState = Record<string, unknown>` and `unknown | null` typings on `virtualSpace` / `pipeline` are deliberately opaque (captured in ADR-2 above). Future apps may want a typed interface; today's contract supports the extraction milestone.
- The cross-fork `setEngineProxy(proxy as any)` cast at `engine-gmt/renderer/install.ts:61` is filed against g06 (not e11 / not g01); a shared `EngineProxy` interface in engine-core that both the stub and the real proxy implement would close the gap.

### DROPPED content

- Full method table for the stub (40+ methods with stub behaviour) — restates code; type info is the documentation.
- Per-field shadow-state accessor table (`isBooted`, `isCompiling`, `accumulationCount`, etc.) — read from source.
- Pick-overload signature enumeration — read from source.
- Bucket-render and export-lifecycle method tables — read from source.
- ViewportRefs full API table (set/get for camera + canvas + display-camera) — read from source.
- Survey enumeration of ~30 consumer files — preserved as a pointer; not load-bearing for code edits today.

---

## Summary

- **JSDoc additions:** 4-7 invariants per module, all with `file:line` citations. Skipped redundant top-of-file blocks where source already has strong rationale (AdaptiveResolution, audioClipSync, audioFileCache, Camera, presetField, appHandles, migrations, createStateLibrarySlice, installStateLibrary, StateLibraryPanel, StateLibraryToast, ActiveSnapshotFeatures, WorkerProxy, ViewportRefs all have strong headers already).
- **ADRs:** 12 total across the 5 docs (3 + 2 + 3 + 1 + 3) — only decisions with rationale that survives outside the source.
- **CLAUDE.md rows:** 5 total (2 + 1 + 2 + 1 + 1 — within 0-2 per doc cap; adaptive-resolution and camera-plugin each warrant two distinct guidance lines).
- **Dropped content:** Per-symbol API tables, prop tables, exhaustive signature enumerations, algorithm walk-throughs, and historical-context narratives that exist as pointers to read-only design docs.
