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
**Status:** 🟢 Fixed (commit b294a5d, part of `@engine/undo` phase 4c)
**Severity:** High — UX confusion.

**Symptom:** Ctrl+Z undoes different things depending on where the mouse is. Users can't predict what will undo. The routing logic is spread across `useKeyboardShortcuts.ts`, `Timeline.tsx`, `timeline/shortcuts.ts`, and reads `isTimelineHovered` from the fractal store.

**Root cause:** three independent stacks (`historySlice`, `cameraSlice`, `sequenceSlice`), ad-hoc router based on UI hover.

**Fix landed:** `historySlice` now owns a single unified transaction stack with scope labels (`'param'` / `'camera'` / `'animation'` / `'ui'`). `@engine/undo` registers two shortcut bindings:
- `Mod+Z` global → `undo()` (pops most recent regardless of scope)
- `Mod+Z` under `'timeline-hover'` scope with priority 10 → `undo('animation')` (pops most recent animation-scoped entry only)

The `'timeline-hover'` scope is pushed by the Timeline component on mouseenter; `@engine/shortcuts` priority resolution does the dispatch. No more `isTimelineHovered` flag in the store.

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
**Status:** 🟢 Fixed (2026-04-25)
**Severity:** Medium — couples engine to camera model.

**Symptom:** AnimationEngine wired `camera.active_index`, `camera.unified.x/y/z`, `camera.rotation.x/y/z` directly with split-precision math + a private `pendingCam` buffer + a `commitState()` that emitted GMT's `CAMERA_TELEPORT` event. Apps with a 2D camera (fluid-toy) or a VR camera had dead branches in the engine for fields they don't use.

**Fix landed:**

- `engine/animation/cameraKeyRegistry.ts` lets apps declare their own camera track list (used by Key Cam button and friends).
- `engine/animation/binderRegistry.ts` lets apps register explicit writers for composite tracks that don't fit the DDFS `feature.param.axis` shape.
- `AnimationEngine` gained `registerScrubHook('pre' | 'post', fn)`. The scrub loop fires pre-hooks before any binder runs (apps read the live camera into their own buffers there) and post-hooks after (apps flush batched writes there).
- The legacy `pendingCam` field, `lastCameraIndex`, `syncBuffersFromEngine`, `commitState`, and the `camera.active_index` / `camera.*` branches in `getBinder` are deleted. The engine no longer imports `THREE`, the worker proxy, viewport refs, `FRACTAL_EVENTS`, or split-precision math.
- GMT moves all of that into `engine-gmt/animation/cameraBinders.ts`, which `installGmtCameraBinders()` wires from `app-gmt/main.tsx`. It registers the seven camera binders + a pre-scrub hook (sync from live camera) + a post-scrub hook (split-precision math + `CAMERA_TELEPORT` emit + `cameraRot` store write).

The engine's animation pipeline is now camera-shape-agnostic. fluid-toy's 2D camera tracks (`julia.center_x`, `julia.zoom`) work via the universal DDFS resolver (case 4); GMT's 3D split-precision camera works via its own binder module + scrub hooks.

**Verified:**
- Typecheck + vite build clean.
- `npm run smoke:boot` clean.
- `npm run smoke:anim-play` clean — playback advances + DDFS param binders fire (julia.power 1 → 6).
- Camera-track animation in app-gmt's timeline still needs a focused smoke or manual sweep to confirm sceneOffset/rotation tracks teleport via the new module — defer to the camera-tracks regression test that lives downstream.

**Docs:** [04_Core_Plugins.md § camera](04_Core_Plugins.md#enginecamera), [08_Animation.md § binder-registry](08_Animation.md#binderregistry--explicit-binders)

---

## F6 — `set${Feature}` name-inference for animation
**Status:** 🔴 Open
**Severity:** Medium — silent fail when convention breaks.

**Symptom:** [engine/AnimationEngine.ts:164-189](../engine/AnimationEngine.ts#L164-L189) builds a binder by name-guessing: `const setterName = 'set' + capitalize(featureName)`. Silently returns undefined when naming doesn't match.

**Progress (2026-04-23):** `binderRegistry` (see F5) is the escape hatch. Apps with non-conventional setters register explicitly:

```ts
binderRegistry.register({
  id: 'myFeature.someParam',
  write: (v) => myCustomSetter(v),
});
```

Explicit registration wins over the name-inference branch. Conventional features (fluid-toy's `julia`, `dye`, `fluidSim`, `sceneCamera`, `orbit` all have conventional `setJulia` / `setDye` / etc.) keep working through the auto-path — no migration required.

**Still open:** auto-registering EVERY DDFS param at feature-freeze time (so the inference branch can be retired entirely) is the full fix. Deferred until the first GMT non-conventional case actually shows up — no need to churn working code.

---

## F7 — Circular store dependency (animationStore ↔ fractalStore)
**Status:** 🟢 Fixed (2026-04-25)
**Severity:** Was: Low — smell; works today via window handle workaround.

**Symptom:** Cross-store reads went through `window.useAnimationStore` to dodge a presumed circular import.

**Resolution:** No cycle existed. animationStore depends on its three slice files (playbackSlice / selectionSlice / sequenceSlice), none of which import back into engineStore. The window-handle was leftover scaffolding from an earlier shape that got refactored. Replaced every consumer with a direct `import { useAnimationStore } from '../../store/animationStore'`:

  - `store/engineStore.ts` — top-level eager import; getPreset reader and bindStoreToEngine use the imported reference.
  - `engine/plugins/Undo.tsx` — timeline-hover scoped Mod+Z / Mod+Y use the import.
  - `app-gmt/main.tsx` — Escape handler's animation deselect uses the import.

The `window.useAnimationStore` export stays in animationStore.ts as a dev-console handle (matches the `__camera` / `__animEngine` / `__store` pattern), but it's no longer load-bearing for any in-tree consumer.

**Designed fix from the audit (an explicit `bridgeRegistry`) was not needed** — the cycle was imaginary. Logged the simpler-than-expected resolution.

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

## F13 — AnimationSystem.tsx hardcodes GMT-specific target hijacks
**Status:** 🟢 Fixed (2026-04-23, pending commit)
**Severity:** Medium — silent misbehavior in engine-fork apps; LFO modulation of DDFS vec params didn't reach the store.

**Symptom:** [components/AnimationSystem.tsx:232](../components/AnimationSystem.tsx#L232) had a `julia.*` hijack branch that assumed GMT's `geometry.juliaX/Y/Z` slice and `uJulia` uniform existed. Any engine-fork app that named a feature `julia` (fluid-toy does) had its LFO targets swallowed — `combinedOffsets['julia.juliaC_x']` got assigned `baseX + offset` where `baseX = state.geometry?.juliaX ?? 0`, so the offset was written against a zero base and then pushed to a non-existent uniform. Same issue with the `coloring.*` branch for any app that registered a `coloring` feature.

**Additionally:** the generic DDFS vec handler at line 322 (`/^(\w+)\.([\w]+)_(x|y|z|w)$/`) required `uniformName.endsWith('_{axis}')`, which meant every vec param needed a `uniform` declaration in its feature-registry config. Fluid-toy's `julia.juliaC` has no `uniform` key (it's read from the store directly by `FluidEngine`), so modulation offsets never made it into `liveModulations` for consumer reads.

**Fix landed:**
1. **GMT hijacks gated on slice presence.** `coloring.*` → requires `state.coloring`; `julia.*` / `geometry.*Rot` → requires `state.geometry`. Engine-fork apps without these slices fall through to the generic DDFS dispatch below.
2. **Base-value resolver generalized.** The `paramId` vec regex changed from `/^(vec[234][ABC])_(x|y|z|w)$/` (GMT's specific formula param naming) to `/^(.+)_(x|y|z|w)$/`, validated by checking the base is a vec-shaped object in the slice. Any UNDERSCORE-form DDFS vec target resolves cleanly.
3. **liveModulations decoupled from uniform write.** Section F (vec) and the scalar fallback both always write `liveModulations[targetKey] = base + offset` when the target resolves to a DDFS param. The `engine.setUniform` call is conditional on `uniformName` existing. Consumers that read `liveModulations` directly (fluid-toy's `FluidToyApp.tsx`) now see modulated values for uniformless DDFS vec params.
4. **Orbit LFO target flipped to UNDERSCORE form** (`julia.juliaC_x` / `_y`) + `FluidToyApp.tsx` liveMod reader updated to match. Verified via `debug/smoke-anim-orbit.mts`: enabling orbit advances `liveModulations['julia.juliaC_x']` from the base (−0.363) to base+offset (−0.299) within one second.
5. **Unresolved-target guard.** Added an `isDDFSResolved` flag so the scalar fallback doesn't pollute `liveModulations` with zeros for targets that matched neither a GMT special case nor a DDFS feature param.

**Docs:** [08_Animation.md § binder-registry](08_Animation.md#binderregistry--explicit-binders)

---

## F12 — Vec track ID format mismatch (UNDERSCORE vs DOT)
**Status:** 🟢 Fixed (2026-04-23, pending commit)
**Severity:** Medium — silent fail; vec2 controls don't show live values; Key Cam doesn't round-trip cleanly for vec-backed camera poses.

**Symptom:** GMT's canonical vec track naming is UNDERSCORE suffix: `featureId.param_x` / `_y` / `_z` / `_w`. `AutoFeaturePanel.tsx:313-319` reads `liveModulations[\`${featureId}.${key}_x\`]` and `Vector3Input`/`Vector4Input` pass `trackKeys` in the same form. Phase 5's additions (`cameraKeyRegistry` default paths registered by `fluid-toy/main.tsx` + `fractal-toy/main.tsx`, `AnimationEngine.getBinder` 3-part path extension) used DOT-separated form: `feature.param.x`. Writing a keyframe on `julia.juliaC.x` produced a track whose ID the panel never looked up.

**Fix landed:**
- `engine/AnimationEngine.ts` case 4 now detects UNDERSCORE form via regex `/^(.+)_([xyzw])$/` on the `child` path segment, validates the base name is a vec-shaped object in the slice, and routes to a shared `writeVecAxis` helper. Falls through to scalar when the base isn't a vec. DOT form (phase-5-era) is kept as backward-compat so saved-scene keyframes from early phase-5 don't break.
- `engine/animation/cameraKeyRegistry.ts`'s default `captureCameraKeyFrame` now recognizes `base_axis` on the last path segment, resolves the base to a vec, and picks the axis component. Also auto-calls `addTrack(tid, tid)` if the track doesn't exist yet — the upstream `addKeyframe` silently no-ops on missing tracks.
- `fluid-toy/main.tsx` and `fractal-toy/main.tsx` flipped their `registerCameraKeyTracks` calls to UNDERSCORE form for vec components (`sceneCamera.center_x/y`, `camera.target_x/y/z`).

**Not fixed (deferred to F13):** orbit LFO target in `fluid-toy/orbitTick.ts` uses `julia.juliaC.x/y` but those targets are hijacked by `AnimationSystem.tsx`'s GMT-specific `julia.*` handler before reaching any generic dispatch. Reformatting the LFO target wouldn't help until F13 lands.

**Docs:** [08_Animation.md § track-types](08_Animation.md#track-types)

---

## F14 — Duplicate module-level state across engine-core / engine-gmt overlay
**Status:** 🟡 One instance fixed (commit 163055a, 2026-04-25); broader audit needed.
**Severity:** High — silent data divergence, hard to debug.

**Symptom:** A reader sees `null` / zero / stale state from a module the writer just updated. No type error, no runtime warning. State just isn't where you'd expect it.

**Root cause:** During the engine extraction, several files were copied verbatim from `engine/` into `engine-gmt/engine/` so engine-gmt could provide a gmt-flavoured version. When the two copies are nearly identical, **TypeScript treats them as separate modules** — each gets its own module-level `let _camera = null` (or registry, or singleton). Writes to one are invisible to readers of the other.

**Concrete instance fixed:** `engine/worker/ViewportRefs.ts` and `engine-gmt/engine/worker/ViewportRefs.ts` each held their own `_camera`. `GmtRendererTickDriver` registered the R3F camera on the gmt copy; `utils/timelineUtils.ts` read `null` from the engine-core copy. Manifested as the Key Cam button always going red after capture (rotation tracks couldn't read the camera quaternion). Fix: replaced the gmt copy with a re-export shim around the engine-core module.

**Why it may bite the engine work going forward:** the extraction will keep duplicating files. Anywhere a file holds module-level state — registries, ref containers, event-bus singletons, lazy proxies — duplication splits the state in two without warning.

**Audit checklist:**
- Diff every file in `engine-gmt/engine/**` against its `engine/**` counterpart. If they're ~identical, replace the gmt copy with `export { … } from '../../../engine/path'`.
- Grep for module-level `let _foo` / `const _foo = new Foo()` / `let _registry = new Map()` patterns in both trees and check whether the same name exists in the parallel tree.
- When extracting new code, default to **re-export shims, not copies**. Only copy when the gmt-side genuinely needs different runtime behaviour, and even then keep state in engine-core if at all possible.

**Suspect modules to audit (not yet checked):** anything in `engine-gmt/engine/worker/` that has a sibling in `engine/worker/`; FractalRegistry / featureRegistry / binderRegistry duplicates if any; FractalEvents emitter copies. Quick way: `diff -q -r engine engine-gmt/engine 2>&1 | grep -v "Only in"`.

---

## F15 — Worker `_localOffset` may zero out under FRAME_READY guard timeout
**Status:** ⚪ Flagged — possibly a non-issue; user reports no visual symptoms.
**Severity:** Unknown — diagnosed via `console.log` during the F14 investigation; no user-facing report.

**Symptom (observed in dev console only):** after preset boot, `WorkerProxy.sceneOffset` (= `_localOffset`, the proxy's mirror of the worker's rendered offset) reads `{0,0,0}` while `useEngineStore.getState().sceneOffset` has the real preset values. Anything that reads `engine.sceneOffset` (light-gizmo world positions, the recently-fixed Key Cam capture path before F14, future overlay code) sees zeros instead of the loaded camera position.

**Possible mechanism (unverified):** [WorkerProxy.ts:204-219](../../engine-gmt/engine/worker/WorkerProxy.ts#L204-L219) uses `_offsetGuarded` to ignore FRAME_READY-reported offsets after a `setShadowOffset` call. The guard is supposed to clear when the worker catches up (drift < 0.001), but it also has a 2-second auto-clear timer ([WorkerProxy.ts:524-527](../../engine-gmt/engine/worker/WorkerProxy.ts#L524-L527)). If the worker's actual sceneOffset is genuinely `{0,0,0}` (i.e. the boot-time `OFFSET_SET` message at [main.tsx:312](../../app-gmt/main.tsx#L312) didn't land for some reason), the guard never converges, the 2s timer fires, and the next FRAME_READY overwrites `_localOffset = {0,0,0}`.

**Why it may be a non-issue:** the rendered image looks correct (worker and overlay are internally consistent — both use whatever sceneOffset the worker has). User has not seen visual artefacts in normal use. This was caught only because we instrumented `engine.sceneOffset` for an unrelated investigation.

**If you hit a real symptom:** worker-side instrumentation will tell us which side is wrong:
- Add `console.log('[OFFSET_SET worker recv]', offset)` in [renderWorker.ts § OFFSET_SET](../../engine-gmt/engine/worker/renderWorker.ts) — if it doesn't fire at boot, the message is being dropped on the worker side.
- Add a log right before [WorkerProxy.ts:218](../../engine-gmt/engine/worker/WorkerProxy.ts#L218) printing `_offsetGuarded` and `msg.state.sceneOffset` — if you see `_localOffset` get assigned zeros while the store has real values, the race-after-guard-timeout is real.

**Probable fix shape:** drop the 2s guard auto-clear, or require an explicit "worker has caught up" handshake (sequence number on RENDER_TICK / FRAME_READY) instead of drift-based convergence.

---

## Fragility fix priority order

Blocking toy-fluid port (done):
1. ~~**F1** — late registration freeze~~ 🟢 Fixed (96a4b5f)
2. ~~**F2** — duplicate ID detection~~ 🟢 Fixed (96a4b5f)
3. ~~**F3** — preset field registry~~ 🟢 Fixed (a4e7d6b)
4. ~~**F4** — render-loop plugin + dev warning~~ 🟢 Fixed (c6ee640)
5. ~~**F2b** — unified undo stack~~ 🟢 Fixed (b294a5d)
6. ~~**F12** — vec track ID format~~ 🟢 Fixed (2026-04-23)
7. ~~**F13** — generic modulation dispatch~~ 🟢 Fixed (2026-04-23)

Landing next:
8. ~~**F5** — decouple camera from AnimationEngine~~ 🟡 escape-hatch shipped (2026-04-23); GMT-legacy branches retained as fallback until GMT port
9. ~~**F6** — auto-bind replaces name inference~~ 🟡 escape-hatch shipped (2026-04-23); full auto-registration deferred until a non-conventional case appears
10. **F9** — componentId validation

Deferred:
11. **F7** — animation-host coupling as bridge (smell; works via window handle)
12. **F8** — UI state undo
13. **F10** — `formula` field rename
14. **F11** — store/events rename pass
15. **F14** — engine/engine-gmt duplicate-state audit pass (one fixed, broader sweep pending)
16. **F15** — `_localOffset` guard-clear race (flagged, unverified, possibly non-issue)

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
