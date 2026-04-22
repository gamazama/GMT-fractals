# 20 — Fragility Audit 🔒

Known issues found in the 2026-04-22 engine audit, with remediation status. This is the ground-truth "what's broken or fragile" list — all other docs link back here.

## Status key
- 🔴 **Open** — design agreed, not yet implemented.
- 🟡 **In progress** — partial implementation landed.
- 🟢 **Fixed** — implementation complete, verified by smoke tests.
- ⚪ **Deferred** — acknowledged, scheduled for later.
- ⚫ **Dropped** — reconsidered and decided not to fix.

---

## F1 — Late feature registration silently breaks
**Status:** 🟢 Fixed (commit 96a4b5f)
**Severity:** Critical — data loss risk.

**Symptom:** `featureRegistry.register(MyFeature)` called after `createEngineStore()` adds the feature to the registry, but NOT to the store. Setters are undefined; UI panel renders nothing; preset round-trip silently drops feature state.

**Root cause:** [store/createFeatureSlice.ts:18-19](../store/createFeatureSlice.ts#L18-L19) snapshots `featureRegistry.getAll()` at store construction. Late arrivals aren't in the snapshot.

**Today's mitigation:** careful import ordering in `index.tsx` — `registerFeatures.ts` imported before anything that touches `useEngineStore`.

**Designed fix:**
- `featureRegistry.freeze()` called inside `createEngineStore()`.
- Post-freeze `register()` throws in dev (`FeatureRegistryFrozenError`), warns+no-ops in prod.
- Assertion test in smoke-boot: late registration dev throw is observable.

**Docs:** [02_Feature_Registry.md § freeze](02_Feature_Registry.md#the-registrys-frozen-state), [03_Plugin_Contract.md § boot-timeline](03_Plugin_Contract.md#boot-timeline)

---

## F2 — Duplicate feature IDs silently overwrite
**Status:** 🟢 Fixed (commit 96a4b5f)
**Severity:** High — silent fail, data loss.

**Symptom:** two features with the same `id` register → second overwrites first. No warning, no error. The first feature's state is lost.

**Root cause:** [engine/FeatureSystem.ts:236](../engine/FeatureSystem.ts#L236) uses `Map.set()` without duplicate check.

**Designed fix:** `featureRegistry.register()` throws `DuplicateFeatureError` on duplicate ID, in both dev and prod (data-loss severity warrants production-hard throw).

**Docs:** [02_Feature_Registry.md](02_Feature_Registry.md), [03_Plugin_Contract.md § failure-modes](03_Plugin_Contract.md#failure-modes-and-how-each-fails)

---

## F2b — Three undo stacks, routed by hover state
**Status:** 🔴 Open
**Severity:** High — UX confusion.

**Symptom:** Ctrl+Z undoes different things depending on where the mouse is. Users can't predict what will undo. The routing logic is spread across `useKeyboardShortcuts.ts`, `Timeline.tsx`, `timeline/shortcuts.ts`, and reads `isTimelineHovered` from the fractal store.

**Root cause:** three independent stacks (`historySlice`, `cameraSlice`, `sequenceSlice`), ad-hoc router based on UI hover.

**Designed fix:** single unified transaction stack with scope labels (`'param'` / `'camera'` / `'animation'` / `'ui'`). Shortcut scope routes which scope's most-recent entry is popped, not which stack.

**Docs:** [06_Undo_Transactions.md](06_Undo_Transactions.md)

---

## F3 — PresetLogic hardcodes top-level fields
**Status:** 🟢 Fixed (commit a4e7d6b)
**Severity:** Medium — extensibility, not correctness.

**Symptom:** [utils/PresetLogic.ts:114-122](../utils/PresetLogic.ts#L114-L122) explicitly handles `savedCameras`, `cameraRot`, `targetDistance`. Apps with their own top-level state (toy-fluid's saved state, a future app's workspace meta) can't add preset-round-trip fields without editing this file.

**Designed fix:** preset field registry.
```ts
sceneIO.registerField({
  key: 'savedCameras',
  serialize:   (s) => s.savedCameras,
  deserialize: (p, set) => set({ savedCameras: p.savedCameras ?? [] }),
});
```
PresetLogic iterates registered fields instead of hardcoding.

**Docs:** [04_Core_Plugins.md § scene-io](04_Core_Plugins.md#enginescene-io)

---

## F4 — Implicit render-loop contract
**Status:** 🟢 Fixed (commit c6ee640)
**Severity:** Medium — silent fail.

**Symptom:** [engine/TickRegistry.ts](../engine/TickRegistry.ts) exposes `runTicks(dt)` but nothing in the engine calls it. If an app forgets to call it, animations silently don't play.

**Designed fix:**
- Default `@engine/render-loop` plugin that drives RAF.
- Dev-only assertion: if `runTicks` hasn't been called for 3 seconds after boot, log warning.
- Documented explicitly in [01_Architecture.md § render-loop](01_Architecture.md#the-render-loop-contract).

---

## F5 — AnimationEngine hardcodes camera tracks
**Status:** 🔴 Open
**Severity:** Medium — couples engine to camera model.

**Symptom:** [engine/AnimationEngine.ts:74-105](../engine/AnimationEngine.ts#L74-L105) explicitly wires `camera.active_index`, `camera.unified.x/y/z`, `camera.rotation.x/y/z`. Apps with a 2D camera (toy-fluid) or a VR camera (future) have dead animation tracks for fields they don't use.

**Designed fix:** the engine itself has no camera knowledge. `@engine/camera`, when installed, registers its own binders via `binderRegistry.register()`. Camera-less apps install a different camera plugin or none.

**Docs:** [04_Core_Plugins.md § camera](04_Core_Plugins.md#enginecamera), [08_Animation.md § binder-registry](08_Animation.md#binderregistry--explicit-binders)

---

## F6 — `set${Feature}` name-inference for animation
**Status:** 🔴 Open
**Severity:** Medium — silent fail when convention breaks.

**Symptom:** [engine/AnimationEngine.ts:164-189](../engine/AnimationEngine.ts#L164-L189) builds a binder by name-guessing: `const setterName = 'set' + capitalize(featureName)`. Silently returns undefined when naming doesn't match.

**Designed fix:** auto-bind at store-construction time via the feature registry, not at animate time by name inference. See [08_Animation.md § what-replaces-gmts-setter-name-inference](08_Animation.md#what-replaces-gmts-setter-name-inference).

---

## F7 — Circular store dependency (animationStore ↔ fractalStore)
**Status:** 🔴 Open
**Severity:** Low — smell; works today via window handle workaround.

**Symptom:** [store/animationStore.ts:16-19](../store/animationStore.ts#L16-L19) exports itself to `window.useAnimationStore` to avoid a circular import with `fractalStore`.

**Root cause:** implicit bidirectional coupling.

**Designed fix:** express the animation ↔ host coupling as an explicit bridge (see [09_Bridges_and_Derived.md § migration-notes](09_Bridges_and_Derived.md#migration-notes-gmt--engine)). No circular imports; coupling visible in `bridgeRegistry.list()`.

---

## F8 — historySlice snapshots features but not UI state
**Status:** ⚪ Deferred
**Severity:** Low — UX, not correctness.

**Symptom:** [store/slices/historySlice.ts:49-94](../store/slices/historySlice.ts#L49-L94) iterates the feature registry but doesn't include open-panel state, timeline scroll, or similar UI state. Close a panel, change a param, undo — the param reverts but the panel stays closed.

**Designed fix:** `undoable` flag on UI state; opt into undo per-field. Likely the right behavior is "most UI state does NOT undo" (hover states, scroll positions) with explicit opt-in for state worth undoing (expanded/collapsed sections).

**Why deferred:** not blocking toy-fluid port. Revisit once we see concrete pain.

---

## F9 — `componentId` references not validated at registration
**Status:** 🔴 Open
**Severity:** Low — silent render-nothing on typo.

**Symptom:** a feature's `tabConfig.componentId` pointing at an unregistered component silently renders nothing.

**Designed fix:** at freeze time, validate every feature's referenced `componentId` is in `componentRegistry`. Warn in dev (not throw — plugin load order may mean the component registers in a later tick during the same boot; but a full-app-lifetime miss is a dev bug).

---

## F10 — Shader config `formula` field is structurally required
**Status:** ⚪ Deferred
**Severity:** Low — name only, not semantic.

**Symptom:** `store.formula: string` is required; apps without a formula-like selection must populate it with a sentinel. Also it's ugly.

**Designed fix:** rename to `mode: string` or drop entirely. Part of the larger rename pass (fractalStore → engineStore, FractalEvents → EngineEvents) scheduled after toy-fluid port.

**Why deferred:** cosmetic; doesn't block anything.

---

## F11 — Cosmetic fractal naming throughout
**Status:** ⚪ Deferred
**Severity:** Cosmetic.

**Symptom:** `fractalStore`, `useFractalStore`, `FractalEvents`, `FractalStoreState`, `FractalActions`, `"fractal-context-menu"` CSS class.

**Designed fix:** single rename commit once toy-fluid port validates the shape. Tracked in [HANDOFF.md § remaining-work](../HANDOFF.md).

---

## Fragility fix priority order

Blocking toy-fluid port (must do first):
1. ~~**F1** — late registration freeze~~ 🟢 Fixed (96a4b5f)
2. ~~**F2** — duplicate ID detection~~ 🟢 Fixed (96a4b5f)
3. ~~**F3** — preset field registry~~ 🟢 Fixed (a4e7d6b)
4. ~~**F4** — render-loop plugin + dev warning~~ 🟢 Fixed (c6ee640)

Can land incrementally during/after toy-fluid port:
5. **F5** — decouple camera from AnimationEngine
6. **F6** — auto-bind replaces name inference
7. **F7** — animation-host coupling as bridge
8. **F2b** — unified undo stack (major, but port can work with current 3-stack model)
9. **F9** — componentId validation

Deferred:
10. **F8** — UI state undo
11. **F10** — `formula` field rename
12. **F11** — store/events rename pass

---

## Audit methodology

This audit ran three parallel research passes on 2026-04-22:
1. GMT keyboard / topbar / animation / undo survey.
2. toy-fluid architecture and overlap with GMT chrome.
3. gmt-engine seams + fragility audit.

Full reports in the session log; this doc is the distillation.

**Re-audit cadence:** before each major version bump, or after every third core plugin lands, whichever comes first. Add new findings here; close items as 🟢 Fixed with a commit reference.

## Cross-refs

Every architecture doc (01–09) cross-links back to this doc in its "Known fragilities" section. Keep those links current.
