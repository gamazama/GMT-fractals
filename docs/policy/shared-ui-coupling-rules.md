---
source: components/AutoFeaturePanel.tsx
lines: 1-702
last_verified_sha: 858f268982da1b084af7c97f66b2acc99e59a4c2
additional_sources:
  - components/Slider.tsx
  - components/Knob.tsx
  - components/contexts/StoreCallbacksContext.tsx
  - components/layout/Dock.tsx
  - components/layout/DropZones.tsx
  - components/vector-input/index.tsx
  - engine-gmt/components/panels/EnginePanel.tsx
  - App.tsx
  - app-gmt/AppGmt.tsx
  - fractal-toy/FractalToyApp.tsx
  - fluid-toy/FluidToyApp.tsx
audited: 2026-05-20T10:18:39Z
audited_by: claude-opus-4-7
public_api:
  - AutoFeaturePanel
  - Knob
  - RawKnob
  - StoreCallbacksProvider
  - useStoreCallbacks
  - StoreCallbacks
depends_on: []
---

# Shared UI coupling rules — what components/* are allowed to depend on

The audit surfaced two real coupling drifts in the shared `components/` tree. `Knob` (`components/Knob.tsx:167-191`) reaches for `useEngineStore` directly via granular selectors while its sibling `Slider` (`components/Slider.tsx:214`) uses `useStoreCallbacks()` — same callbacks, two different consumption patterns (q-088). `AutoFeaturePanel`'s default route for `onUpdate: 'compile'` params (`components/AutoFeaturePanel.tsx:146-153`) hardcodes `movePanel('Engine','left')` + `FractalEvents.emit('engine_queue', …)`, both of which are GMT-app concepts even though the panel lives in shared `components/` (q-089). These primitives are imported by four host apps (`App.tsx:81`, `app-gmt/AppGmt.tsx:198`, `fractal-toy/FractalToyApp.tsx:64`, `fluid-toy/FluidToyApp.tsx:145`); this doc gives prescriptive rules for what a primitive may couple to, with escape hatches for the two real violations.

## Current state (catalog of violations)

| Primitive | Coupling | Severity | Originating followup |
|-----------|----------|----------|----------------------|
| `Knob` (`components/Knob.tsx:175-176`) | Reads `handleInteractionStart` / `handleInteractionEnd` via two granular `useEngineStore` selectors instead of `useStoreCallbacks()`. Comment justifies the granular pattern (`components/Knob.tsx:168-177`) against a *full-store destructure* — not against the context. | Low — same two callbacks, same behaviour in steady state. Pure drift. | q-088 (`plans/doc-audit-state/survey/_followups/q-088.md`) |
| `AutoFeaturePanel` (`components/AutoFeaturePanel.tsx:146-153`) | Default route for `config.onUpdate === 'compile'` calls `useEngineStore.getState().movePanel('Engine', 'left')` then emits `FractalEvents.emit('engine_queue', …)` after a 50 ms `setTimeout`. The panel name `'Engine'` and event channel `'engine_queue'` are GMT-app concepts; the only listener is `engine-gmt/components/panels/EnginePanel.tsx:53-55`. | High — non-GMT hosts (`fluid-toy`, `fractal-toy`, `demo`) would silently break their layout if they ever surfaced a compile-mode param through `AutoFeaturePanel`. The 50 ms delay races EnginePanel mount. | q-089 (`plans/doc-audit-state/survey/_followups/q-089.md`) |
| `Slider` (`components/Slider.tsx:214`) | Already uses `useStoreCallbacks()` for the three callbacks — the clean pattern. Caveat: q-088 verified `fluid-toy/FluidToyApp.tsx:67-71` memoises `storeCallbacks`; the other three hosts (`App.tsx:74-78`, `app-gmt/AppGmt.tsx:164-171`, `fractal-toy/FractalToyApp.tsx:54-58`) **are also memoised** but were unverified at the time the followup was written. All four memoise the value today. | Low — clean today, but the audit-gate stays: any unmemoised Provider value would push a fresh reference per parent render and re-render every Knob/Slider in the tree. | q-088 |
| `Dock` (`components/layout/Dock.tsx:23-47`) | Reads ~15 fields from `useEngineStore` via granular selectors; comment cites the same fluid-toy max-depth-guard scar tissue as Knob (`components/layout/Dock.tsx:24-31`). | Medium — most fields are panel-layout state, not on the `StoreCallbacks` surface; would need a context-surface expansion. | (drift carry-in from `plans/doc-audit-state/survey/e13-shared-ui.md:172`) |
| `DropZones` (`components/layout/DropZones.tsx:5-17`) | Same pattern — granular `useEngineStore` selectors for panel-drag state. | Medium — would need a context-surface expansion. | (drift carry-in) |
| `Vector{2,3,4}Input` (`components/vector-input/index.tsx:27-37`) | Reads two callbacks from `useEngineStore` and **four fields from `useAnimationStore`** (`sequence`, `isRecording`, `addTrack`, `addKeyframe`, `snapshot`). | Medium — `useAnimationStore` is outside the current `StoreCallbacks` surface, so this can't be a one-line swap. | (drift carry-in) |

## Rules for new shared UI primitives

These rules apply to any file added under `components/` that is intended for reuse across the four host apps.

1. **Consume store state via context, not direct store imports.** A new primitive MUST read interaction callbacks through `useStoreCallbacks()` (`components/contexts/StoreCallbacksContext.tsx:20`), not via `useEngineStore((s) => s.<callback>)`. Reason: app-agnostic — the host app owns store identity, and a primitive that calls `useEngineStore` cannot be reused by a host that has its own store or stubs the surface for testing. The clean reference is `Slider` (`components/Slider.tsx:214`). The drifted counterpart is `Knob` (`components/Knob.tsx:175-176`).

2. **The context surface is `StoreCallbacks` — three members.** `handleInteractionStart`, `handleInteractionEnd`, `openContextMenu` (`components/contexts/StoreCallbacksContext.tsx:4-8`). Anything outside that surface (panel-layout fields, animation-store actions, condition evaluation) is **not** covered by the context today. A primitive that needs state outside that surface either (a) extends the surface, or (b) accepts the value as a prop from a host-side composing component. It does NOT add a fresh `useEngineStore` call.

3. **Side-effecting routes MUST be parameterised — never hardcoded by app name.** A primitive that needs to dispatch an action to a specific panel or event channel MUST accept that route as a host-supplied callback. Hardcoding a panel name (`'Engine'`) or event channel (`'engine_queue'`) ties the shared `components/` tree to a specific host app. The drifted reference is `AutoFeaturePanel`'s compile route at `components/AutoFeaturePanel.tsx:146-153`; the proposed fix is a `compileRouter` capability on `StoreCallbacks` (see Migration path).

4. **Provider value MUST be memoised in every host.** A primitive consuming `useStoreCallbacks()` only re-renders when the Provider `value` reference changes — so every host that mounts `StoreCallbacksProvider` MUST construct its `storeCallbacks` object via `useMemo` over stable refs. An inline object literal would push a fresh value per parent render and re-render every consumer in the tree, undoing the whole rationale of the context. All four hosts comply today: `App.tsx:74-78`, `app-gmt/AppGmt.tsx:164-171`, `fractal-toy/FractalToyApp.tsx:54-58`, `fluid-toy/FluidToyApp.tsx:67-71`.

5. **Granular `useEngineStore` selectors are an escape hatch, not a default.** Where rule (1) cannot be satisfied (Dock-class state, animation store), the primitive MAY use per-field selectors but MUST carry the same scar-tissue comment as `components/Knob.tsx:168-177` / `components/layout/Dock.tsx:24-31` so the next author knows it is intentional drift, not a fresh import.

6. **Imperative `useEngineStore.getState()` is reserved for read-only condition evaluation.** `AutoFeaturePanel` reads the full store via `getState()` for `dynamicVisible` / `dynamicConfig` / `condition` evaluation (`components/AutoFeaturePanel.tsx:95-98`) to avoid a full-store subscription. New primitives MAY use this pattern for read-only checks, but MUST NOT use it for action dispatch — the compile-route hardcoding at `components/AutoFeaturePanel.tsx:147` is the anti-pattern.

7. **Provider absence is silent — primitives degrade.** The NOOP fallback at `components/contexts/StoreCallbacksContext.tsx:10-14` means a primitive rendered outside `StoreCallbacksProvider` keeps working but loses undo / context-menu integration. Don't add throw-on-missing-provider guards; storybook / test harnesses depend on the silent degrade.

## Invariants

- **`useStoreCallbacks` is the only React context the engine UI ships today.** `components/contexts/` contains exactly one file: `components/contexts/StoreCallbacksContext.tsx:1-20`. Aspirational contexts (`AnimationProvider`, `UndoProvider`, `ContextMenuProvider`, `ShortcutProvider`, `FeatureCompileContext`) named in the old `docs/engine/05_Shared_UI.md` do not exist — see `docs/audit-2026-05-20/archive/engine/shared-ui.md:181`.

- **The four hosts that mount `StoreCallbacksProvider` are exhaustive.** `App.tsx:81`, `app-gmt/AppGmt.tsx:198`, `fractal-toy/FractalToyApp.tsx:64`, `fluid-toy/FluidToyApp.tsx:145`. Any new host must mount the provider before rendering a `<Slider>` / future-Knob / future-AutoFeaturePanel — the NOOP fallback (`components/contexts/StoreCallbacksContext.tsx:10-14`) hides the omission silently.

- **Memoised Provider `value` is required for the context pattern to be cheaper than granular selectors.** All four hosts use `useMemo` with stable-ref deps: `App.tsx:74-78`, `app-gmt/AppGmt.tsx:164-171` (uses `useEngineStore.getState()` inside `useMemo` with `[]` deps so the snapshot is captured once), `fractal-toy/FractalToyApp.tsx:54-58`, `fluid-toy/FluidToyApp.tsx:67-71`.

- **`onUpdate: 'compile'` default route runs ONLY when `onChangeOverride` is not supplied.** `components/AutoFeaturePanel.tsx:136-141` short-circuits to the override path before the compile fork; `CompilableFeatureSection` passes an override that buffers into pending changes (`components/CompilableFeatureSection.tsx:275` referenced from `docs/audit-2026-05-20/archive/engine/shared-ui.md:217`). The hardcoded GMT route is the *fallback*, not the default behaviour for typical compile-mode params.

- **`FractalEvents.emit('engine_queue', …)` has exactly one listener.** `engine-gmt/components/panels/EnginePanel.tsx:53-55`. Any non-GMT host that surfaces compile-mode params through `AutoFeaturePanel` without supplying an `onChangeOverride` or installing its own listener will lose the update silently — the 50 ms `setTimeout` at `components/AutoFeaturePanel.tsx:148` won't surface the failure.

- **`Knob` and `Slider` resolve the same two callbacks through different mechanisms.** Both end up calling `handleInteractionStart('param')` / `handleInteractionEnd()` on pointer boundaries. The behavioural contract is identical; the consumption pattern is not. This is q-088's drift.

## Migration path for existing violators

### Knob → `useStoreCallbacks` (q-088)

One-line swap at `components/Knob.tsx:167-191`:

- Remove the two `useEngineStore` selectors at `components/Knob.tsx:175-176`.
- Remove the `useEngineStore` import at `components/Knob.tsx:3`.
- Add `const { handleInteractionStart, handleInteractionEnd } = useStoreCallbacks();` and the corresponding import from `./contexts/StoreCallbacksContext` (mirroring `components/Slider.tsx:2,179`).
- Keep the scar-tissue comment (`components/Knob.tsx:168-177`) but reword to note the context pattern is steady-state-equivalent because Provider `value` is memoised by every host (rule 4 above).

Pre-flight check: confirm all four hosts still memoise `storeCallbacks` (verified at time of writing: `App.tsx:74-78`, `app-gmt/AppGmt.tsx:164-171`, `fractal-toy/FractalToyApp.tsx:54-58`, `fluid-toy/FluidToyApp.tsx:67-71`) — any regression there would re-render every Knob on every parent render, which is exactly the cascade the original comment was written to avoid.

Post-flight: empirically retest fluid-toy pan/zoom for the max-depth-guard cascade the comment cites. The diagnosis in the existing comment was sound against the *naive* full-store destructure but does not actually argue against `StoreCallbacksContext`; the swap should be invisible in steady state.

### AutoFeaturePanel → `compileRouter` capability (q-089)

The hardcoded route at `components/AutoFeaturePanel.tsx:146-153` is:

```
if (config?.onUpdate === 'compile') {
    useEngineStore.getState().movePanel('Engine', 'left');
    setTimeout(() => {
        for (const [k, v] of Object.entries(updates)) {
            FractalEvents.emit('engine_queue', { featureId, param: k, value: v });
        }
    }, 50);
    return;
}
```

The clean fix is to lift the route to the `StoreCallbacks` context as an optional fourth member:

1. Add `compileRouter?: (featureId: string, param: string, value: unknown) => void;` to `StoreCallbacks` (`components/contexts/StoreCallbacksContext.tsx:4-8`).
2. Add a `NOOP_CALLBACKS.compileRouter: undefined` entry (`components/contexts/StoreCallbacksContext.tsx:10-14`).
3. In `app-gmt/AppGmt.tsx:164-171` install the GMT default: a `compileRouter` that calls `movePanel('Engine', 'left')` and emits `engine_queue` — but without the 50 ms `setTimeout`, since the host now owns mount ordering and can guarantee EnginePanel is mounted before the queue event fires (or call `handleParamChangeRef.current(...)` directly, bypassing the event bus).
4. In `components/AutoFeaturePanel.tsx:146-153` replace the hardcoded body with `storeCallbacks.compileRouter?.(featureId, k, v)` per scalar.
5. Other hosts (`App.tsx`, `fluid-toy/FluidToyApp.tsx`, `fractal-toy/FractalToyApp.tsx`) leave `compileRouter` undefined; the call is a silent no-op, matching the q-089 finding that those apps don't surface compile-mode params today.

The 50 ms delay disappears as a side effect — its only purpose was to paper over the EnginePanel mount race (`engine-gmt/components/panels/EnginePanel.tsx:48-62` registers the listener in a `useEffect`, which runs after the imperative `movePanel('Engine','left')` from `components/AutoFeaturePanel.tsx:147` resolves but before the subscription is installed). Once the host owns the route, the host owns the ordering.

The `handleParamChangeRef.current(featureId, param, value)` callback at `engine-gmt/components/panels/EnginePanel.tsx:54` is the contract the GMT default `compileRouter` would replicate — the same `mustQueue` branching at `engine-gmt/components/panels/EnginePanel.tsx:68-104` decides instant-vs-queued application and would run unchanged.

## Interactions with other subsystems

- **`docs/audit-2026-05-20/archive/engine/shared-ui.md`** — primary module doc. The Invariants section there names both violations (`docs/audit-2026-05-20/archive/engine/shared-ui.md:231`, `docs/audit-2026-05-20/archive/engine/shared-ui.md:247`) and the Known issues section carries the same followups (`docs/audit-2026-05-20/archive/engine/shared-ui.md:273`, `docs/audit-2026-05-20/archive/engine/shared-ui.md:275`). This doc supersedes those entries for prescriptive rules; that doc stays the structural reference for the primitive catalog.

- **`docs/modules/engine/feature-system.md`** — the `onUpdate: 'compile'` param flag and `engineConfig.toggleParam` / `engineConfig.mode` shapes are owned by the feature system. The `compileRouter` capability's payload shape (`featureId`, `param`, `value`) must match what `engine-gmt/components/panels/EnginePanel.tsx:64-104` expects — that's the contract a future override must replicate.

- **`docs/modules/engine/shortcuts-undo.md`** — `handleInteractionStart('param')` / `handleInteractionEnd()` bracket every primitive drag boundary, feeding the per-scope undo transaction system. Rule 1 keeps that surface uniform: every primitive consumes those two callbacks through the same context, so undo coverage is symmetric across `Slider`, `Knob`, `Vector*Input`, and any new primitive.

## Known issues / Phase 2 carry-in

- **q-088 — Knob/Slider context mismatch.** Migration is a one-line swap on `components/Knob.tsx:175-176` after the host-memoisation check. All four hosts memoise today (`App.tsx:74-78`, `app-gmt/AppGmt.tsx:164-171`, `fractal-toy/FractalToyApp.tsx:54-58`, `fluid-toy/FluidToyApp.tsx:67-71`); the followup was written before the other three were verified. The fluid-toy max-depth-guard claim has not been empirically retested — q-088 notes that's a 30-minute test, not a refactor blocker. Full path: `plans/doc-audit-state/survey/_followups/q-088.md`.

- **q-089 — AutoFeaturePanel hardcoded GMT route.** Proposed `compileRouter` capability per the Migration path above. Until a second app surfaces compile-mode params through `AutoFeaturePanel`, this is documentation work, not a refactor. The 50 ms `setTimeout` at `components/AutoFeaturePanel.tsx:148` is a smell that disappears once the host owns mount ordering. Full path: `plans/doc-audit-state/survey/_followups/q-089.md`.

- **Dock / DropZones / Vector*Input drift.** Same granular-selector pattern, but their store reads aren't on the `StoreCallbacks` surface — `Dock` reads ~15 panel-layout fields (`components/layout/Dock.tsx:32-47`), `Vector*Input` reads four animation-store fields (`components/vector-input/index.tsx:32-36`). Migrating these is a context-surface-expansion exercise, not a one-line swap. Out of scope for the q-088 / q-089 fixes but worth tracking as a Phase 3 carry-in.

- **`components/AutoFeaturePanel.tsx:95-98` imperative `getState()` read.** This is allowed by rule 6 (read-only condition evaluation) but should be documented as the only sanctioned use of `useEngineStore.getState()` inside the shared `components/` tree. Any new caller of `getState()` for action dispatch falls under the rule 3 prohibition.

## Historical context

The Knob/Slider asymmetry has explicit scar tissue in the source. The block comment at `components/Knob.tsx:168-177` reads:

> Granular selectors — destructuring `useEngineStore()` would subscribe this Knob to the ENTIRE store, re-rendering on every setter. With many Knobs in a panel tree, that's the dominant contributor to the per-pointer-event subscriber cascade that trips React's max-depth guard during fluid-toy pan/zoom. These two refs are stable (created once at store init), so the selectors return the same value every time and never re-render.

That diagnosis is sound against the *naive* alternative (full-store destructure via `const { handleInteractionStart } = useEngineStore()` with no selector), but it is not actually an argument against `StoreCallbacksContext`. A context consumer re-renders only when the Provider `value` reference changes, not when arbitrary store fields change — and rule 4 above keeps that value stable. The same scar tissue appears in `components/layout/Dock.tsx:24-31`, `components/layout/DropZones.tsx:6-8`, and `components/vector-input/index.tsx:27-37`; for those, the store reads aren't on the current context surface, so the granular pattern is genuinely the right escape hatch until the surface expands.

The compile-route hardcoding at `components/AutoFeaturePanel.tsx:146-153` predates the four-host split — `AutoFeaturePanel` was authored when there was only one app and `'Engine'` was an unambiguous panel name. The Phase 2 disposition flags it as the worst remaining cross-app coupling in the shared UI tree; the `compileRouter` capability is the path back to the rule 3 ideal.
