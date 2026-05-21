---
source: engine/plugins/Tutorial.tsx
lines: 1-59
last_verified_sha: 07b7a1778111d0a2a760cfb56ff33b6973afece5
additional_sources:
  - engine/plugins/tutorial/runner.ts
  - engine/plugins/tutorial/Overlay.tsx
  - engine/plugins/tutorial/Highlight.tsx
  - engine/plugins/tutorial/anchors.ts
  - engine/plugins/tutorial/triggers.ts
  - engine/plugins/tutorial/stepRenderers.ts
  - engine/plugins/tutorial/actionBus.ts
  - engine/plugins/tutorial/lessons.ts
  - engine/plugins/tutorial/types.ts
  - app-gmt/tutorial/anchors.ts
  - app-gmt/tutorial/effects.ts
  - app-gmt/tutorial/lessons.ts
  - app-gmt/tutorial/stepKinds.tsx
  - app-gmt/tutorial/triggers.ts
audited: 2026-05-20T09:24:11Z
audited_by: claude-opus-4-7
public_api:
  - installTutorial
  - InstallTutorialOptions
  - TutorialRunner
  - TutorialOverlay
  - TutorialHighlight
  - tutorAnchors
  - useTutorAnchor
  - tutorAnchorRef
  - AnchorEntry
  - mergeRefs
  - tutorTriggers
  - onKeyPressed
  - resolveStorePath
  - TriggerSetupCtx
  - TriggerEvaluator
  - stepRenderers
  - StepRenderer
  - StepRenderContext
  - actionBus
  - registerLesson
  - registerLessons
  - listLessons
  - getLesson
  - subscribeLessons
  - TutorialStep
  - TutorialLesson
  - TriggerSpec
  - PositionConfig
  - ANCHOR
  - asOneEdit
  - GMT_LESSONS
  - NEXT_STEPS_ITEMS
  - registerGmtStepKinds
  - registerGmtTriggers
depends_on:
  - e07-plugins-host
  - e01-feature-system
  - a01-boot-shell
  - g03-formula-registry
---

# Tutorial overlay

The tutorial subsystem is a generic guided-tour engine plugin plus the GMT-specific lesson content that drives it. The engine half ships nine built-in trigger kinds, an anchor registry, a step-renderer registry, an action bus, and an overlay/highlight pair; it knows nothing about GMT. The app half (`app-gmt/tutorial/`) registers a typed anchor catalog, two UI-coupled trigger kinds (`tab`, `mode`), one custom step kind (`next-steps`), and four chained lessons covering the Mandelbulb, navigation, lighting, and shadows.

All glue between the two halves is by registration through the `engine/plugins/Tutorial.tsx:1-59` barrel — the engine plugin imports nothing from `app-gmt/`.

## Public API

### Engine plugin (`engine/plugins/Tutorial.tsx`)

| Symbol | Source | Role |
|--------|--------|------|
| `installTutorial(options?)` | `engine/plugins/Tutorial.tsx:35` | Idempotent boot-time installer; registers built-in triggers and re-keys completion storage |
| `InstallTutorialOptions` | `engine/plugins/Tutorial.tsx:29` | `{ storageKey?: string }` — namespaces completion-state localStorage entry |
| `TutorialRunner` | `engine/plugins/tutorial/runner.ts:23` | Mountable state-machine; one-shot per app tree |
| `TutorialOverlay` | `engine/plugins/tutorial/Overlay.tsx:125` | Mountable card chrome + custom-renderer dispatch |
| `TutorialHighlight` | `engine/plugins/tutorial/Highlight.tsx:35` | Pulsing rectangle portal; reusable outside the runner |
| `tutorAnchors` | `engine/plugins/tutorial/anchors.ts:27` | Module-singleton anchor registry (register/unregister/get/getAll/list/listIds/subscribe) |
| `useTutorAnchor(id)` | `engine/plugins/tutorial/anchors.ts:99` | Hook returning a stable ref-callback |
| `tutorAnchorRef(id)` | `engine/plugins/tutorial/anchors.ts:113` | Non-hook ref-callback factory for JSX map bodies |
| `AnchorEntry` | `engine/plugins/tutorial/anchors.ts:17` | `{ id, el }` registry entry shape |
| `mergeRefs` | `engine/utils/refs.ts` (re-exported at `engine/plugins/Tutorial.tsx:54`) | Generic React multi-ref helper |
| `tutorTriggers` | `engine/plugins/tutorial/triggers.ts:45` | Open-set trigger-evaluator registry |
| `onKeyPressed(fn)` | `engine/plugins/tutorial/triggers.ts:309` | Pressed-key feedback subscription (powers `KeyCap` flash) |
| `resolveStorePath(state, path)` | `engine/plugins/tutorial/triggers.ts:56` | Dotted-path store resolver |
| `TriggerSetupCtx` | `engine/plugins/tutorial/triggers.ts:19` | Setup-time context passed to every evaluator |
| `TriggerEvaluator` | `engine/plugins/tutorial/triggers.ts:35` | `{ kind, setup(spec, ctx) → { evaluate?, cleanup? } }` |
| `stepRenderers` | `engine/plugins/tutorial/stepRenderers.ts:33` | Step-kind renderer registry |
| `StepRenderer` | `engine/plugins/tutorial/stepRenderers.ts:26` | `{ kind, render(step, ctx) }` |
| `StepRenderContext` | `engine/plugins/tutorial/stepRenderers.ts:15` | Renderer-side context with `advance/skip/complete/pressedKeys` |
| `actionBus` | `engine/plugins/tutorial/actionBus.ts:10` | Named-event pub/sub consumed by the `action` trigger kind |
| `registerLesson` / `registerLessons` | `engine/plugins/tutorial/lessons.ts:12`, `engine/plugins/tutorial/lessons.ts:16` | Lesson registry mutators |
| `listLessons` / `getLesson` / `subscribeLessons` | `engine/plugins/tutorial/lessons.ts:20`, `engine/plugins/tutorial/lessons.ts:23`, `engine/plugins/tutorial/lessons.ts:26` | Read + subscribe surface used by Help menu integration |
| `TutorialStep<TStore>` | `engine/plugins/tutorial/types.ts:30` | Per-step shape (id, text, trigger, onEnter/Exit, …) |
| `TutorialLesson<TStore>` | `engine/plugins/tutorial/types.ts:60` | `{ id, title, subtitle?, onStart?, steps[] }` |
| `TriggerSpec` | `engine/plugins/tutorial/types.ts:14` | Open-ended `{ kind: string, ...spec }` shape |
| `PositionConfig` | `engine/plugins/tutorial/types.ts:19` | Card placement controls (`offset`, `target`, `side`, `align`) |

### App-side (`app-gmt/tutorial/`)

| Symbol | Source | Role |
|--------|--------|------|
| `ANCHOR` | `app-gmt/tutorial/anchors.ts:9` | Typed catalog of GMT anchor ids; mixes constants and id-factory functions |
| `asOneEdit(store, fn)` | `app-gmt/tutorial/effects.ts:17` | Param-transaction wrapper so multi-mutation lesson seeds collapse to one undo entry |
| `GMT_LESSONS` | `app-gmt/tutorial/lessons.ts:417` | Four-lesson array (Mandelbulb / Navigation / Light Studio / Shadows) |
| `NEXT_STEPS_ITEMS` | `app-gmt/tutorial/stepKinds.tsx:16` | Hoverable follow-up actions shown in `next-steps` cards |
| `registerGmtStepKinds()` | `app-gmt/tutorial/stepKinds.tsx:54` | Registers the `next-steps` custom renderer |
| `registerGmtTriggers()` | `app-gmt/tutorial/triggers.ts:14` | Registers GMT-specific `tab` and `mode` trigger kinds |

## Architecture

### Boot

`installTutorial()` is the single boot entry. It guards on a module-level `_installed` flag (`engine/plugins/Tutorial.tsx:36-37`), then calls `registerBuiltinTriggers()` to install the nine generic evaluators (`engine/plugins/Tutorial.tsx:38`; registrations at `engine/plugins/tutorial/triggers.ts:292-303`). If `options.storageKey` is set the installer re-keys the uiSlice's tutorial-completion store via `setTutorialStorageKey` and pushes the freshly-read `completed` array onto the engine store (`engine/plugins/Tutorial.tsx:40-46`). Apps must additionally call their own registrars (e.g. `registerGmtStepKinds()`, `registerGmtTriggers()`, `registerLessons(GMT_LESSONS)`) before any lesson activates; the engine does not call these.

### Anchor registry

`tutorAnchors` is a module-level singleton with two indices: `_entries` (`element → AnchorEntry`) and `_byId` (`id → Set<element>`) (`engine/plugins/tutorial/anchors.ts:22-23`). `register` (`engine/plugins/tutorial/anchors.ts:28-48`) does three things: if the element was previously registered under a different id it removes the old entry first (`engine/plugins/tutorial/anchors.ts:31-34`), it prunes disconnected stale elements still listed under the new id (`engine/plugins/tutorial/anchors.ts:40-45`), then attaches the new entry and fires `_notify()`. `get(id)` prefers an entry with a non-zero rect, falling back to the first registered entry if all are zero-sized (`engine/plugins/tutorial/anchors.ts:58-70`). `getAll(id)` returns every match in registration order (`engine/plugins/tutorial/anchors.ts:72-76`).

`useTutorAnchor(id)` returns a stable ref-callback that tracks the previously-attached element in a closure so detach (`el === null`) unregisters precisely without a global scan (`engine/plugins/tutorial/anchors.ts:99-108`). `tutorAnchorRef(id)` is a non-hook factory for JSX `.map(...)` bodies where calling the hook with a varying id would violate hook order (`engine/plugins/tutorial/anchors.ts:113-120`).

### Trigger kinds

Evaluators split into two patterns by which field they populate in their setup return:

**Passive** evaluators return `evaluate(state)`, run on every store change by the runner:

| Kind | Spec fields | Behaviour |
|------|-------------|-----------|
| `value` | `path, compare, value, tolerance?, abs?, waitForRelease?, settleMs?` | `eq`/`lte`/`gte` against numeric path; `settleMs` re-checks after dwell timer (`engine/plugins/tutorial/triggers.ts:86-120`) |
| `bool` | `path, value` | Strict-equality test against literal (`engine/plugins/tutorial/triggers.ts:128-133`) |
| `delta` | `path, waitForRelease?, settleMs?` | Captures JSON snapshot at entry (or after `settleMs`), fires when current value differs via `valuesEqual` (`engine/plugins/tutorial/triggers.ts:142-166`) |
| `compound` | `conditions[]` | All child `evaluate` results true via `every` (`engine/plugins/tutorial/triggers.ts:173-185`) |
| `or` | `conditions[]` | Any child `evaluate` result true via `some` (`engine/plugins/tutorial/triggers.ts:192-204`) |

**Active** evaluators install timers/listeners in setup and call `ctx.advance()` directly; they leave `evaluate` undefined:

| Kind | Spec fields | Behaviour |
|------|-------------|-----------|
| `keypress` | `keys[], waitForRelease?` | Any key matches; with `waitForRelease` advances on keyup (`engine/plugins/tutorial/triggers.ts:208-232`) |
| `keypress_all` | `keys[], waitForRelease?` | All keys must have been seen; with `waitForRelease` arms on the completing keydown and fires on next keyup (`engine/plugins/tutorial/triggers.ts:238-263`) |
| `delay` | `ms` | Auto-advance after N ms (`engine/plugins/tutorial/triggers.ts:267-273`) |
| `action` | `name` | Fires when name is broadcast on `actionBus` (`engine/plugins/tutorial/triggers.ts:277-283`) |
| `manual` | — | Next button only — no auto-advance (`engine/plugins/tutorial/triggers.ts:286-289`) |

Every keydown also broadcasts its key on `_pressedListeners`, consumed via `onKeyPressed` by the overlay's `KeyCap` flash effect (`engine/plugins/tutorial/triggers.ts:213`, `engine/plugins/tutorial/triggers.ts:244-247`, `engine/plugins/tutorial/triggers.ts:307-312`; consumer at `engine/plugins/tutorial/Overlay.tsx:169-182`).

`compound` and `or` share the parent's `TriggerSetupCtx` with their children, so children's `delta` snapshots and `cleanup` hooks slot into the same map (`engine/plugins/tutorial/triggers.ts:176-179`, `engine/plugins/tutorial/triggers.ts:194-197`).

GMT contributes two adapters in `app-gmt/tutorial/triggers.ts:14-28`: `tab` compares `state.activeRightTab` and `mode` compares `state[spec.param]` (constrained to `cameraMode`). Both are kept app-side because they hard-couple to GMT store fields.

### Runner state machine

`TutorialRunner` is one component holding three effects:

1. **Lesson `onStart`** runs once per lesson activation (`engine/plugins/tutorial/runner.ts:36-42`).
2. **Step entry / trigger wiring** runs whenever `stepIndex` advances (`engine/plugins/tutorial/runner.ts:44-135`): exits the previous step (`engine/plugins/tutorial/runner.ts:60-67`), bumps `enteredRef`, calls `setActiveTab(step.forceTab)` if the host store exposes it (`engine/plugins/tutorial/runner.ts:71-75`), runs `step.onEnter`, builds a `TriggerSetupCtx` with `safeAdvance` and `snapshots`, resolves the evaluator via `tutorTriggers.get(step.trigger.kind)` (warns and returns if missing — `engine/plugins/tutorial/runner.ts:103-107`), and subscribes the passive predicate to the store with an initial-check `setTimeout(..., 0)` so any sync `onEnter` writes settle before evaluation (`engine/plugins/tutorial/runner.ts:111-122`).
3. **End-of-lesson** fires when `stepIndex >= lesson.steps.length`; if the terminal step has `autoStartLesson`, runner calls `completeTutorial()` then `setTimeout(startTutorial(next), 300)` to chain (`engine/plugins/tutorial/runner.ts:138-151`).

`safeAdvance` re-reads the store, confirms the runner is still on the expected step, sets `advancingRef`, advances, and releases via `queueMicrotask` so reentrant passive evaluators on the same tick coalesce into one advance (`engine/plugins/tutorial/runner.ts:85-92`).

A separate effect cleans up on full deactivation (`engine/plugins/tutorial/runner.ts:154-160`). The step-entry effect returns a no-op cleanup; transitions are handled explicitly by the entry effect or the deactivation effect to survive React strict-mode double-invocation (`engine/plugins/tutorial/runner.ts:130-134`).

### Overlay placement

`TutorialOverlay` uses an outer gate that subscribes to a single field (`tutorialActive`) so the inner component — which subscribes to five — is unmounted in the common case (`engine/plugins/tutorial/Overlay.tsx:122-129`). `computePosition` (`engine/plugins/tutorial/Overlay.tsx:34-80`) ranks left → right → below; left/right require `PANEL_WIDTH + PANEL_MARGIN*2` (360 + 28) free, below requires 120 px and is forced when the anchor sits in the top bar (`r.top < 120 && r.height < 80` — `engine/plugins/tutorial/Overlay.tsx:57`) or when the step opts in via `position.side === 'below'`. Step transitions fade out for `TRANSITION_MS = 200ms`, swap content, fade in (`engine/plugins/tutorial/Overlay.tsx:21`, `engine/plugins/tutorial/Overlay.tsx:144-167`).

Layout-change handling: ResizeObserver on each currently-resolved anchor element, plus window resize, capture-phase scroll, and the anchor registry's own `subscribe(updatePos)` — no polling fallback (`engine/plugins/tutorial/Overlay.tsx:195-218`; mirror in `engine/plugins/tutorial/Highlight.tsx:54-69`).

Step-kind dispatch lives at `engine/plugins/tutorial/Overlay.tsx:240-249`: `kind ?? 'text'` is looked up via `stepRenderers.get(kind)`; the default `'text'` falls through to a built-in `TextStepBody` that renders `text + subtext + showKeys` chips (`engine/plugins/tutorial/Overlay.tsx:97-120`). Custom renderers replace the body but inherit the card chrome (title, step counter, advance buttons).

### Highlight

`TutorialHighlight` is a portal-rendered pulsing rectangle anchored to `document.body` at `zIndex 9999` (overlay card sits at 9998 — `engine/plugins/tutorial/Overlay.tsx:230`, `engine/plugins/tutorial/Overlay.tsx:234`). Padding is a fixed 6 px outset (`engine/plugins/tutorial/Highlight.tsx:81-84`). Two animation modes: 2-second `tutorial-pulse` (default) and a one-shot 0.6-second `tutorial-flash` (`engine/plugins/tutorial/Highlight.tsx:24-32`, `engine/plugins/tutorial/Highlight.tsx:89-91`). The component is reusable outside the runner — GMT's `NextStepsList` renders `<TutorialHighlight targets={[...]} flash />` from within a `next-steps` card body (`app-gmt/tutorial/stepKinds.tsx:49`).

### Action bus

`actionBus` is a string-keyed pub/sub (`engine/plugins/tutorial/actionBus.ts:8-20`). Apps call `actionBus.fire('camera.reset')` from the call sites that already perform the action; lessons subscribe declaratively via `{ kind: 'action', name: 'camera.reset' }`. The file header (`engine/plugins/tutorial/actionBus.ts:1-6`) notes this replaced an earlier store-monkeypatch design.

### Lesson registry

`engine/plugins/tutorial/lessons.ts:9-29` is a simple `Map<id, lesson>` with `register/registerLessons/get/list/subscribe`. The Help plugin reads it for menu entries; the runner reads it on step entry; the Overlay reads it for title + step counter.

### GMT lessons

`GMT_LESSONS` ships four lessons chained via `autoStartLesson` on each lesson's terminal step (`app-gmt/tutorial/lessons.ts:155`, `app-gmt/tutorial/lessons.ts:204`, `app-gmt/tutorial/lessons.ts:321`):

| # | Title | Steps | Terminal | Notes |
|---|-------|-------|----------|-------|
| 1 | The Mandelbulb | 13 | `delay 5000` → autoStart 2 | Slider controls + quality params; reseeds Mandelbulb in `onStart` (`app-gmt/tutorial/lessons.ts:39-158`) |
| 2 | It's Time to Fly | 11 | `manual` → autoStart 3 | Navigation + camera modes; ends with a `next-steps` terminal (`app-gmt/tutorial/lessons.ts:160-207`) |
| 3 | The Light Studio | 11 | `manual` → autoStart 4 | Light orbs, gizmos, anchoring; uses `compound` with `delta` + `bool` (`app-gmt/tutorial/lessons.ts:209-324`) |
| 4 | Shadows | 10 | `manual` (terminal) | Hardness, steps, area lights; ends with a `next-steps` card (`app-gmt/tutorial/lessons.ts:326-415`) |

Lesson `onStart` blocks wrap multi-mutation seeds in `asOneEdit(store, fn)` (`app-gmt/tutorial/effects.ts:17-21`) so the whole seed collapses to one undo entry. Call sites at `app-gmt/tutorial/lessons.ts:43-47`, `app-gmt/tutorial/lessons.ts:164-169`, `app-gmt/tutorial/lessons.ts:213-217`, and `app-gmt/tutorial/lessons.ts:330-345`.

The side-effect import at `app-gmt/tutorial/lessons.ts:24` (`import '../../engine-gmt/storeTypes';`) declaration-merges GMT's DDFS feature state types into `FeatureStateMap` so lesson callbacks see typed `coreMath`, `lighting`, `quality`, `geometry` instead of `any`.

### Anchor catalog

`app-gmt/tutorial/anchors.ts:9-61` exposes `ANCHOR` — a typed catalog mixing static ids and id-factory functions. Lessons reference these constants instead of free strings; typos surface at compile time. Factories `vpQualityRow(id)` (`app-gmt/tutorial/anchors.ts:40`), `lightGizmoLabel(i)` (`app-gmt/tutorial/anchors.ts:55`), and `gizmoAnchor(i)` (`app-gmt/tutorial/anchors.ts:56`) generate per-row / per-light anchor ids.

### Next-steps renderer

The `next-steps` custom step kind is the only renderer GMT contributes (`app-gmt/tutorial/stepKinds.tsx:54-58`). `NextStepsList` (`app-gmt/tutorial/stepKinds.tsx:25-52`) maintains hover / flash state locally, renders six follow-up labels, and overlays `<TutorialHighlight targets={[...]} flash={...} />` on hover and click.

## Invariants

- `installTutorial()` MUST run before any lesson activates — otherwise the runner emits `console.warn('[tutorial] no evaluator for trigger kind ...')` and silently returns (`engine/plugins/tutorial/runner.ts:103-107`).
- App-specific triggers must be registered before any lesson using them runs; `registerGmtTriggers()` is the GMT entry point but is not called from the engine — caller responsibility (`app-gmt/tutorial/triggers.ts:14-28`).
- `forceTab` only takes effect if the host store exposes a `setActiveTab(id)` action; the runner type-checks at runtime and silently no-ops if absent (`engine/plugins/tutorial/runner.ts:72-75`).
- `valuesEqual` (`engine/plugins/tutorial/triggers.ts:60-70`) is a shallow-keyed deep-equal that walks plain objects only. Arrays compare via key iteration (length check + index-keyed recursion), so sparse arrays or non-plain objects may misbehave.
- `delta` snapshots use `JSON.parse(JSON.stringify(v ?? null))` (`engine/plugins/tutorial/triggers.ts:148`) — non-JSON values (functions, undefined, cycles, typed arrays) cannot be tracked.
- `waitForRelease` reads `state.isUserInteracting` (`engine/plugins/tutorial/triggers.ts:91`, `engine/plugins/tutorial/triggers.ts:157`) — host store must surface this field or the gate is skipped entirely.
- `safeAdvance` uses `queueMicrotask` to release its lock (`engine/plugins/tutorial/runner.ts:85-92`); same-tick passive evaluators get one advance per change, which is intentional to dedupe but means concurrent listeners all see the pre-advance state once.
- The runner returns a no-op cleanup from the step-entry effect (`engine/plugins/tutorial/runner.ts:130-134`); `cleanupRef` is fired explicitly by the next step's entry or by the deactivation effect — relying on React-effect cleanup ordering would break strict-mode double-invocation.
- Compound / or child triggers receive the same `ctx`, so their `delta` snapshots all land in the same `snapshots` map keyed by `path` — two delta children watching the same path would collide (`engine/plugins/tutorial/triggers.ts:176-179`, `engine/plugins/tutorial/triggers.ts:194-197`).
- `tutorAnchors.get(id)` prefers a visible entry but falls back to the first registered entry; consumers depending on visibility-only behaviour must filter the result themselves (`engine/plugins/tutorial/anchors.ts:58-70`).
- `tutorAnchorRef` is closure-stateful but not memoized — calling it inline in JSX each render produces a new function and forces React to detach/reattach the ref every render. Caller must `useMemo`/`useRef` it (note at `engine/plugins/tutorial/anchors.ts:110-112`).
- `autoStartLesson` calls `completeTutorial()` then `setTimeout(startTutorial(next), 300)` — closing the tab during the 300 ms window breaks the chain silently (`engine/plugins/tutorial/runner.ts:144-148`).
- Lesson 2's `onStart` detects "chained from lesson 1" by checking `formula === 'Mandelbulb' && geometry?.juliaMode` rather than an explicit chain token (`app-gmt/tutorial/lessons.ts:165-169`). Refactoring lesson 1's terminal state would silently break the no-reseed-on-chain behaviour.
- Lesson 1 step `l1-max-steps` has an `onEnter` that lowers `maxSteps` to 64 so the user can see the under-stepped artifact, while the trigger waits for `gte 200` (`app-gmt/tutorial/lessons.ts:119-124`). The asymmetry is intentional.
- ResizeObserver instances in Overlay and Highlight observe anchors resolved at effect-run time only; late-registered elements get a one-shot position re-measure via `tutorAnchors.subscribe(...)` but never join the observer set. Pure resize of a late-registered anchor is therefore not observed; the comment block at `engine/plugins/tutorial/Overlay.tsx:189-194` flags this as accepted drift. (See followup q-010.)

## Interactions with other subsystems

- **`a01-boot-shell`** — GMT calls `installTutorial({ storageKey: 'gmt' })`, the GMT registrars, and mounts `<TutorialRunner />` + `<TutorialOverlay />` at boot. `installTutorial()` itself imports `useEngineStore` and `setTutorialStorageKey` from the engine store module (`engine/plugins/Tutorial.tsx:24-25`), so the plugin is store-bound; per followup q-009 this is normal for engine plugins.
- **`e07-plugins-host`** — Tutorial is one of the engine's installable plugins; the barrel pattern at `engine/plugins/Tutorial.tsx:50-59` is the standard public surface. Help-plugin integration ("Help → Tutorials" menu) is automatic when `installHelp({ tutorials })` is also passed (`engine/plugins/Tutorial.tsx:19-20`).
- **`e01-feature-system`** — GMT lessons read and write DDFS feature slices (`coreMath`, `lighting`, `quality`, `geometry`) via setters like `setQuality`, `setCoreMath`, `setLighting`, `setShadowPanelOpen`, `setShowLightGizmo`, `setSubsystemTier`. Anchor ids in the `'param:'` namespace are registered by `AutoFeaturePanel` / `FormulaParamsWidget` (note at `app-gmt/tutorial/anchors.ts:18-19`). Lesson seeds wrap mutations in `beginParamTransaction` / `endParamTransaction` via `asOneEdit` (`app-gmt/tutorial/effects.ts:17-21`).
- **`g03-formula-registry`** — `seedMandelbulb` reads the `'Mandelbulb'` formula def's `defaultPreset` from `registry` (`app-gmt/tutorial/lessons.ts:13`, `app-gmt/tutorial/lessons.ts:28-37`). The registry is populated by an eager top-level statement in `engine-gmt/formulas/index.ts` (per followup q-011) — but the load-order contract is not documented at the import site.
- **`a02-panels-layout`** (right-dock) — `forceTab` calls `setActiveTab(id)` to switch the right dock (`engine/plugins/tutorial/runner.ts:71-75`); GMT's `tab` trigger compares `state.activeRightTab` (`app-gmt/tutorial/triggers.ts:18`).

## Known issues / Phase 2 carry-in

- **Stale doc comment on `InstallTutorialOptions.storageKey`** — JSDoc at `engine/plugins/Tutorial.tsx:30-32` says the default is `'gmt'`. The actual default key, set in the uiSlice module variable, is `'gmt-tutorials'` (per followup q-012). Cleanup: tighten the JSDoc.
- **`as any` setState cast** — `useEngineStore.setState({ tutorialCompleted: completed } as any)` at `engine/plugins/Tutorial.tsx:44` is needed because the uiSlice exposes only `completeTutorial` as a typed mutator for `tutorialCompleted`. Minor type-debt smell (per followup q-012).
- **Load-order contract for `seedMandelbulb`** — `app-gmt/tutorial/lessons.ts:13` imports `registry` without a comment that it must already be populated. Followup q-011 confirms two independent paths populate it before tutorials are reachable; a defensive site-comment would close the documentation gap.
- **ResizeObserver drift on late-registered anchors** — see Invariants. Acceptable per design; only worth raising if a future step targets an anchor that resizes after registration (followup q-010).
- **`lockNavigation` lesson field dropped** — historical, documented in the header at `app-gmt/tutorial/lessons.ts:9-10`. Mentioned in case stable's lessons get diffed.

## Historical context

The file headers contain almost all the rationale for the current shape:

- `engine/plugins/tutorial/actionBus.ts:1-6` — "replaces the `action` trigger's store-monkeypatch with a named-event broadcast." The bus exists because the prior design patched store actions to fire trigger advances; declarative subscription is cleaner.
- `engine/plugins/tutorial/anchors.ts:1-12` — "replaces `data-tut="..."` attributes scattered across components." The registry stores live `HTMLElement` references so the overlay and highlight read bounds directly; no `document.querySelector`.
- `engine/plugins/tutorial/anchors.ts:89-98` — explains why `useTutorAnchor` tracks the previous element in a closure: it avoids a global "scan disconnected elements" pass on every change.
- `engine/plugins/tutorial/triggers.ts:1-15` — explains the passive/active split and the recursive `compound` / `or` model.
- `engine/plugins/tutorial/types.ts:1-12` — explains why `TutorialStep` and `TutorialLesson` are generic over the host store type (apps narrow to their typed store, eliminating `(store as any)` casts).
- `app-gmt/tutorial/lessons.ts:1-11` — porting rationale from stable's `data/tutorialLessons.ts`: typed `ANCHOR` constants instead of strings, unified `position` config, `nextStepsMode: true` → `kind: 'next-steps'`, `action: 'resetCamera'` triggers replaced by `actionBus.fire(name)` at the call site, and `lockNavigation` dropped because it was declared but never consumed in stable.
- `app-gmt/tutorial/effects.ts:1-8` — explains why lesson seeds wrap mutations in a param-transaction: undoing a scene seed in one Ctrl+Z, not 4-5 keystrokes that each wind through a feature setter.

Tutorial.tsx lives under `engine/plugins/` for plugin-installation convention reasons but is conceptually UI-facing — see followup q-048 for the placement note.
