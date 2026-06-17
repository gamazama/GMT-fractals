---
subsystem_id: a03-tutorial
audited_at: 2026-05-19T20:05:57Z
files:
  - path: app-gmt/tutorial/anchors.ts
    blob_sha: 46817c83bf372f4ee9116ed65eb15f306fc858fa
    lines_read: [1, 61]
  - path: app-gmt/tutorial/effects.ts
    blob_sha: d826455c48d9734c9dec16eb24adfc2a188ac625
    lines_read: [1, 21]
  - path: app-gmt/tutorial/lessons.ts
    blob_sha: 0c1b46af90b082e41190ed2f8a0c87cc70fe550b
    lines_read: [1, 417]
  - path: app-gmt/tutorial/stepKinds.tsx
    blob_sha: 26912a2df9c91474a52b1f6daf9ca45b54b73495
    lines_read: [1, 59]
  - path: app-gmt/tutorial/triggers.ts
    blob_sha: 22fb1a62506d7ab28034d4c3e1d125634258f9af
    lines_read: [1, 28]
  - path: engine/plugins/Tutorial.tsx
    blob_sha: 07b7a1778111d0a2a760cfb56ff33b6973afece5
    lines_read: [1, 59]
  - path: engine/plugins/tutorial/Highlight.tsx
    blob_sha: 6f3c20b9a7c774a65af78ebbe00fe8fe77b9edec
    lines_read: [1, 98]
  - path: engine/plugins/tutorial/Overlay.tsx
    blob_sha: 1b0977b9efed5109351bc87dd9bb684225aeeded
    lines_read: [1, 324]
  - path: engine/plugins/tutorial/actionBus.ts
    blob_sha: eac7526136465c7ab8ca37c3da3e864b5ae80d36
    lines_read: [1, 20]
  - path: engine/plugins/tutorial/anchors.ts
    blob_sha: 4fa2d653dfbdf17b0034ddc660a583dd4d2ca546
    lines_read: [1, 121]
  - path: engine/plugins/tutorial/lessons.ts
    blob_sha: c5f83d0630cb2316101567aa70583fa1fc98ce8a
    lines_read: [1, 29]
  - path: engine/plugins/tutorial/runner.ts
    blob_sha: 757e8d359e19ce95af9f711a3ccea14decd5307e
    lines_read: [1, 163]
  - path: engine/plugins/tutorial/stepRenderers.ts
    blob_sha: ef81048df52598e109f9d5d16a06346876a8dd93
    lines_read: [1, 38]
  - path: engine/plugins/tutorial/triggers.ts
    blob_sha: 695bc704babd13c9554cb0eb01e787d3d119462b
    lines_read: [1, 312]
  - path: engine/plugins/tutorial/types.ts
    blob_sha: 9b5b715824d8ddc7b1f5dd9030a9e50d0d66de3f
    lines_read: [1, 66]
---

## Public API surface

Engine plugin barrel (`engine/plugins/Tutorial.tsx`):
- `installTutorial(options?: InstallTutorialOptions)` — boot-time installer (Tutorial.tsx:35)
- `InstallTutorialOptions { storageKey?: string }` (Tutorial.tsx:29)
- Re-export `TutorialRunner` (Tutorial.tsx:50) — from `./tutorial/runner` (runner.ts:23)
- Re-export `TutorialOverlay` (Tutorial.tsx:51) — from `./tutorial/Overlay` (Overlay.tsx:125)
- Re-export `TutorialHighlight` (Tutorial.tsx:52) — from `./tutorial/Highlight` (Highlight.tsx:35)
- Re-export `tutorAnchors`, `useTutorAnchor`, `tutorAnchorRef`, `AnchorEntry` (Tutorial.tsx:53)
- Re-export `mergeRefs` from `../utils/refs` (Tutorial.tsx:54)
- Re-export `tutorTriggers`, `onKeyPressed`, `resolveStorePath`, `TriggerSetupCtx`, `TriggerEvaluator` (Tutorial.tsx:55)
- Re-export `stepRenderers`, `StepRenderer`, `StepRenderContext` (Tutorial.tsx:56)
- Re-export `actionBus` (Tutorial.tsx:57)
- Re-export `registerLesson`, `registerLessons`, `listLessons`, `getLesson`, `subscribeLessons` (Tutorial.tsx:58)
- Re-export types `TutorialStep`, `TutorialLesson`, `TriggerSpec`, `PositionConfig` (Tutorial.tsx:59)

Engine internals (callable from plugin consumers via the barrel):
- `tutorAnchors.register/unregister/get/getAll/list/listIds/subscribe` (anchors.ts:27-87)
- `useTutorAnchor(id)` hook returning ref-callback (anchors.ts:99-108)
- `tutorAnchorRef(id)` factory for JSX maps (anchors.ts:113-120)
- `tutorTriggers.register/unregister/get/listKinds` (triggers.ts:45-52)
- `resolveStorePath(state, path)` dotted resolver (triggers.ts:56-58)
- `onKeyPressed(fn)` pressed-key feedback subscription (triggers.ts:309)
- `registerBuiltinTriggers()` registers value/bool/delta/compound/or/keypress/keypress_all/delay/action/manual (triggers.ts:292-303)
- `stepRenderers.register/unregister/get/listKinds` (stepRenderers.ts:33-38)
- `actionBus.fire/on` (actionBus.ts:10-20)
- `registerLesson/registerLessons/getLesson/listLessons/subscribeLessons` (lessons.ts:12-29)

GMT app surface (`app-gmt/tutorial/`):
- `ANCHOR` constant catalog incl. dynamic id factories `vpQualityRow`, `lightGizmoLabel`, `gizmoAnchor` (anchors.ts:9-61)
- `asOneEdit(store, fn)` undo-grouping helper (effects.ts:17-21)
- `GMT_LESSONS: TutorialLesson[]` four-lesson export (lessons.ts:417)
- `NEXT_STEPS_ITEMS` array + `registerGmtStepKinds()` registering the `next-steps` renderer (stepKinds.tsx:16-58)
- `registerGmtTriggers()` registering the `tab` and `mode` trigger kinds (triggers.ts:14-28)

## Architecture

- Engine ships a generic guided-tour plugin; apps own anchor catalogs, lessons, and UI-coupled trigger kinds — engine has no GMT-specific knowledge (`engine/plugins/Tutorial.tsx`:1-21 lists the install contract; the only app-specific code is the `gmt` localStorage default at Tutorial.tsx:43).
- Single boot entry `installTutorial()` is idempotent via `_installed` flag and registers the built-in trigger evaluators (`engine/plugins/Tutorial.tsx`:27-47).
- Persistence is namespaced by passing `storageKey`, which re-keys the uiSlice's tutorial-completion store and reloads from the new key (`engine/plugins/Tutorial.tsx`:40-46).
- Anchor registry is a module-level singleton (no React context) so non-component code (trigger evaluators, overlay) can read element bounds directly (`engine/plugins/tutorial/anchors.ts`:10-25).
- Anchor registration de-duplicates: if the same element is re-registered under a new id, the prior entry is removed first, and disconnected stale elements under an id are pruned on each register (`engine/plugins/tutorial/anchors.ts`:30-46).
- `useTutorAnchor` returns a stable ref-callback that tracks the previously-attached element in a closure so detach (`el===null`) unregisters precisely (`engine/plugins/tutorial/anchors.ts`:99-108).
- `tutorAnchorRef` is a non-hook factory for JSX `.map(...)` bodies where calling the hook with varying id would violate hook order (`engine/plugins/tutorial/anchors.ts`:110-120).
- Trigger evaluators are registered open-set keyed by `kind` string; engine ships nine generic kinds (value, bool, delta, compound, or, keypress, keypress_all, delay, action, manual) registered by `registerBuiltinTriggers()` (`engine/plugins/tutorial/triggers.ts`:292-303).
- Evaluators split into "passive" (return `evaluate(state)` predicate run on every store change — value/bool/delta/compound/or) and "active" (own timers/listeners and call `ctx.advance()` directly — delay/keypress/action/manual) (`engine/plugins/tutorial/triggers.ts`:8-15).
- `value` trigger supports `eq`/`lte`/`gte` with `tolerance`, `abs`, `waitForRelease` (skips while `state.isUserInteracting`), and `settleMs` post-hit dwell timer that re-checks before advancing (`engine/plugins/tutorial/triggers.ts`:86-120).
- `delta` trigger captures a JSON-cloned snapshot of the path at step entry (or after `settleMs`) and compares deeply via `valuesEqual` until the value changes (`engine/plugins/tutorial/triggers.ts`:142-166, helper at 60-70).
- `compound` and `or` recursively build child evaluators sharing the same `TriggerSetupCtx` (snapshot map, advance fn) and combine via `every`/`some` over child `evaluate` results (`engine/plugins/tutorial/triggers.ts`:173-204).
- `keypress_all` accumulates a `seen` set across keydowns; when `waitForRelease`, it arms on the completing keydown and advances on the next keyup so the gesture finishes before the step swaps (`engine/plugins/tutorial/triggers.ts`:238-263).
- Every keydown also broadcasts the key on a pressed-key listener bus (`_pressedListeners` / `onKeyPressed`) consumed by the overlay's `KeyCap` flash effect (`engine/plugins/tutorial/triggers.ts`:213-214, 244-247, 305-312; Overlay.tsx:169-182).
- `TutorialRunner` is the state machine: lesson `onStart` runs once per lesson activation effect (runner.ts:36-42); step entry/exit effect manages `enteredRef`, runs prev `onExit`, fires `forceTab` via host store's `setActiveTab`, then `onEnter`, then sets up the trigger evaluator and subscribes (`engine/plugins/tutorial/runner.ts`:44-135).
- `safeAdvance` re-reads the store, confirms tutorial is still active and on the expected step index, then sets `advancingRef` to coalesce reentrant advances within a microtask — prevents passive evaluators from double-firing (`engine/plugins/tutorial/runner.ts`:85-92, gates at 113-114, 120-121).
- Initial passive-trigger check is queued via `setTimeout(...,0)` so any sync onEnter writes settle into the store before evaluation (`engine/plugins/tutorial/runner.ts`:117-122).
- End-of-lesson is detected when `stepIndex >= lesson.steps.length` in a dedicated effect; if the last step has `autoStartLesson`, runner calls `completeTutorial()` then `setTimeout(startTutorial(next), 300)` to chain (`engine/plugins/tutorial/runner.ts`:138-151).
- `TutorialOverlay` uses an outer gate that subscribes to only `tutorialActive`, mounting the inner component (which subscribes to 5 fields) only when a lesson is running — keeps cost zero in the common case (`engine/plugins/tutorial/Overlay.tsx`:122-129).
- Card placement (`computePosition`) ranks left → right → below; left/right need `PANEL_WIDTH + PANEL_MARGIN*2` (360+28) free; below needs only 120px and is forced when the anchor sits in the top bar (`r.top<120 && r.height<80`) or when step opts in via `position.side='below'` (`engine/plugins/tutorial/Overlay.tsx`:34-78).
- Step transitions fade out for `TRANSITION_MS=200ms`, swap content, fade back in; prev step id tracked in `prevStepIdRef` to detect changes (`engine/plugins/tutorial/Overlay.tsx`:21, 144-167).
- Overlay re-measures anchor positions on `ResizeObserver`, window resize, capture-phase scroll, and the anchor registry's own subscribe — no polling fallback; CSS transform animations on ancestors will lag by one anchor mutation (`engine/plugins/tutorial/Overlay.tsx`:189-218; same pattern in Highlight.tsx:54-69).
- Custom step kinds dispatch via `stepRenderers.get(kind)`; default `'text'` falls through to `TextStepBody` (text + subtext + showKeys caps); custom renderers replace the body but inherit the card chrome (`engine/plugins/tutorial/Overlay.tsx`:240-249; renderers.ts:1-38).
- `actionBus` is a name-keyed pub/sub used by the `action` trigger kind; app code calls `actionBus.fire('camera.reset')` from the existing call site that performs the action, and lessons subscribe declaratively — replaces a prior store-monkeypatch design noted in the file header (`engine/plugins/tutorial/actionBus.ts`:1-20).
- GMT's `tab` and `mode` triggers are tiny adapters comparing `state.activeRightTab` and `state[spec.param]` (only `cameraMode` allowed) — kept app-side because they hard-couple to the right-dock and camera-mode store fields (`app-gmt/tutorial/triggers.ts`:15-27).
- GMT lessons reference anchor ids via the typed `ANCHOR` catalog instead of free strings, so typos surface at compile time; the catalog mixes static ids and id-factory functions for indexed lights/quality rows (`app-gmt/tutorial/anchors.ts`:9-61).
- Multi-mutation lesson seed blocks wrap their `setX` calls in `asOneEdit(store, fn)` which brackets the run with `beginParamTransaction`/`endParamTransaction` so the whole seed collapses to a single undo entry (`app-gmt/tutorial/effects.ts`:17-21, used at lessons.ts:43-47, 131-134, 164-169, 213-217, 330-345).
- `GMT_LESSONS` ships four lessons: Mandelbulb intro (sliders+quality, 13 steps), navigation/camera (11 steps with next-steps terminal), light studio (11 steps with auto-chain), shadows (10 steps with next-steps terminal) — chained via `autoStartLesson` on the second-to-last step (`app-gmt/tutorial/lessons.ts`:39-417).
- Side-effect import `import '../../engine-gmt/storeTypes';` declaration-merges GMT's DDFS feature state types into `FeatureStateMap` so lesson callbacks see typed `coreMath`/`lighting`/`quality`/`geometry` instead of `any` (`app-gmt/tutorial/lessons.ts`:20-24).
- `NextStepsList` (GMT-side custom renderer) maintains hover/flash state locally; rendering `<TutorialHighlight targets={[...]} flash />` from within the card body proves the highlight component is generic and reusable outside the runner-managed step (`app-gmt/tutorial/stepKinds.tsx`:25-52).
- Highlight rect padding is hardcoded 6px outset with cyan pulse animation (`tutorial-pulse` 2s) or one-shot `tutorial-flash` 0.6s; rendered via portal to `document.body` at `zIndex 9999`, overlay card at 9998 (`engine/plugins/tutorial/Highlight.tsx`:24-91, Overlay.tsx:230, 234).

## Invariants and gotchas

- `installTutorial()` MUST run before the first lesson starts — otherwise the built-in trigger kinds aren't registered and runner emits `console.warn('[tutorial] no evaluator for trigger kind ...')` and returns without subscribing (`engine/plugins/tutorial/runner.ts`:103-107).
- App-specific triggers (`tab`, `mode`, `action`, …) must be registered before any lesson using them runs; `registerGmtTriggers()` is the GMT entry point but isn't called from the engine — caller responsibility (`app-gmt/tutorial/triggers.ts`:14-28).
- `forceTab` only does something if the host store exposes a `setActiveTab(id)` action; runner type-checks at runtime and silently no-ops if absent (`engine/plugins/tutorial/runner.ts`:72-75).
- `valuesEqual` is a shallow-keyed deep-equal that walks plain objects only; arrays compare via key iteration (length check + index-keyed recursion), so sparse arrays or non-plain objects may misbehave (`engine/plugins/tutorial/triggers.ts`:60-70).
- `delta` snapshots use `JSON.parse(JSON.stringify(v ?? null))` — non-JSON values (functions, undefined, cycles, typed arrays) cannot be tracked (`engine/plugins/tutorial/triggers.ts`:148).
- `waitForRelease` reads `state.isUserInteracting` — host store must surface this field or the value/delta triggers skip the gate entirely (`engine/plugins/tutorial/triggers.ts`:91, 157).
- `safeAdvance` uses `queueMicrotask` to release the lock — same-tick passive evaluators get one chance to fire per change; this is intentional to dedupe but means concurrent listeners may all see the pre-advance state once (`engine/plugins/tutorial/runner.ts`:85-92).
- The runner returns a no-op cleanup from the step-entry effect; `cleanupRef` is fired explicitly only by the deactivation effect or by the next step's entry — relying on React-effect cleanup ordering would break strict-mode double-invocation (`engine/plugins/tutorial/runner.ts`:130-160, comment at 131-134).
- Compound/or child triggers receive the same `ctx` so their `delta` snapshots all land in the same `snapshots` map keyed by `path` — two delta children watching the same path will collide (`engine/plugins/tutorial/triggers.ts`:176-179, 194-197).
- Anchor `get(id)` prefers visible (non-zero rect) entries but falls back to the first registered entry; consumers depending on visibility-only behavior (e.g. when picking between hidden and shown tab content) must handle the fallback themselves (`engine/plugins/tutorial/anchors.ts`:58-70).
- `tutorAnchorRef` is closure-stateful but not memoized — calling it inline in JSX each render produces a new function and forces React to detach/reattach the ref every render; caller must `useMemo`/`useRef` it (file header at `engine/plugins/tutorial/anchors.ts`:110-112).
- `autoStartLesson` triggers a `completeTutorial()` immediately then a 300ms-delayed `startTutorial(next)`; if the user closes the tab/help during that window the chain breaks silently (`engine/plugins/tutorial/runner.ts`:144-148).
- Lesson 2's `onStart` chains from lesson 1 by detecting `formula === 'Mandelbulb' && geometry?.juliaMode` instead of an explicit chain token — refactoring lesson 1's terminal state will silently break the no-reset behavior (`app-gmt/tutorial/lessons.ts`:165-169).
- Lesson 1 step `l1-max-steps` has `onEnter` that *lowers* maxSteps to 64 so the user can observe the under-stepped artifact, while the trigger waits for `gte 200` — the asymmetry is intentional (`app-gmt/tutorial/lessons.ts`:119-124).
- Lessons assume DDFS slice setters like `setQuality`, `setCoreMath`, `setLighting`, `setShadowPanelOpen`, `setShowLightGizmo`, `setSubsystemTier?`, plus root-level `setFormula`, `setCameraMode`, `setActiveTab`, `loadPreset`, `resetCamera` — porting requires a store with this shape (`app-gmt/tutorial/lessons.ts`:31-47, 123, 132-133, 242-253, 330-345).
- `lockNavigation` was a stable-era lesson field that's been dropped — header at `app-gmt/tutorial/lessons.ts`:8-10 documents this in case stable lessons get diffed.

## Drift from existing doc
(no existing doc — skip this section, but include the header)

## Open questions

- `engine/plugins/Tutorial.tsx`:24-25 imports `setTutorialStorageKey` from `../../store/slices/uiSlice` and reads `useEngineStore` from `../../store/engineStore` — the engine plugin is therefore not store-agnostic, it hard-imports the engine's store module. Worth flagging if "engine subsystems should be store-injected" is a design goal; out of audit scope here.
- The `Highlight` and `Overlay` ResizeObserver loops iterate `tutorAnchors.getAll(id)` to observe every matching element, but unsubscribe via a single `ro.disconnect()` — fine, but if anchors mutate between mount and unmount, observers for newly-registered elements are picked up by the `tutorAnchors.subscribe(measure/updatePos)` re-render path only, not by the observer instance itself.
- `app-gmt/tutorial/lessons.ts`:13 imports `registry` from `../../engine-gmt/engine/FractalRegistry` — the GMT lessons depend on engine-gmt being initialized before tutorial activation. Not enforced or documented in the file.
- Possibly related but out of claim scope: `engine/utils/refs.ts` (re-exports `mergeRefs` via the barrel at Tutorial.tsx:54) and the `uiSlice` tutorial-state fields (`tutorialActive`, `tutorialLessonId`, `tutorialStepIndex`, `advanceTutorialStep`, `skipTutorial`, `completeTutorial`, `startTutorial`, `tutorialCompleted`, `setTutorialStorageKey`). Help plugin integration (`installHelp({ tutorials })`) is mentioned in Tutorial.tsx:19-20 — not part of this audit.
