# 13 — Extracting a GMT feature as a generic plugin

A cookbook for lifting a piece of GMT into the shared engine so any app can reuse it. This doc exists because "port feature X from GMT" is a recurring task and we want the decision tree crisp.

The worked example below is the TSAA + pause-button extraction (session 2026-04-24). The same decision tree applies to any GMT feature we might want generic.

## The three-question triage

Before touching code, answer these for the feature in question:

**1. Is the STATE generic, or does it only make sense for GMT?**
Example: `aaLevel`, `sampleCap`, `accumulation`, `bucketSize`, `renderRegion` — all generic (any renderer could want them). `juliaC`, `geometry.juliaX` — GMT-specific (no other renderer has them). If a future fluid-toy / fractal-toy / mesh-viewer might plausibly use this field, it's generic.

**2. Is the BEHAVIOUR generic, or does it tie to GMT worker / lighting / uniform names?**
Example: "toggle `isPaused`" is generic — any render loop pauses the same way. "When `renderMode` changes, rewrite the `uRenderMode` uniform" is GMT-specific (the uniform lives in GMT's worker). Split STATE from BEHAVIOUR at the generic/GMT seam.

**3. Is the UI made of generic primitives (Slider, Popover, Icons) or GMT-specific widgets (GradientEditor, LightGizmo)?**
Example: GMT's pause button is `<button><PauseIcon /></button>` + a `<Popover>` around a `<Slider>`. All three live in `components/` already. GMT's Light Gizmo is a bespoke R3F gizmo — not generic.

If all three answers are "generic," the feature extracts as a pure engine-core addition. If any is GMT-specific, that part stays in `engine-gmt/` while the generic parts lift up.

## Worked example: TSAA + pause button

### The STATE (all generic → `store/slices/renderControlSlice.ts`)

- `isPaused`, `sampleCap`, `accumulation` — already there from the Phase F dissection.
- No new state was needed. fluid-toy read these existing fields.

### The BEHAVIOUR (split cleanly)

- **Generic side effect**: on `aaLevel` / `msaaSamples` / `accumulation` change, emit `reset_accum` FractalEvents. Any accumulator app listens. Lives in [renderControlSlice.ts](../../store/slices/renderControlSlice.ts) setters.
- **GMT-specific side effect**: on `renderMode` change, post CONFIG message to the GMT worker + bridge to the GMT lighting DDFS feature's `renderMode`. Lives in [engine-gmt/renderer/bindings.ts](../../engine-gmt/renderer/bindings.ts).

### The UI (generic → `engine/plugins/topbar/PauseControls.tsx`)

Copy-paste of GMT's pause button fragment, with three edits:
1. `useFractalStore` → `useEngineStore`.
2. Drop any reference to GMT-specific slices (`lighting`, `geometry`, etc.).
3. Add an `installPauseControls()` exported function so the host app opts in explicitly.

### The wiring

Fluid-toy's `main.tsx` adds one line: `installPauseControls()`. The generic engine plumbing does the rest — click → `setIsPaused(true)` → `state.isPaused` flips → every subscriber updates (FluidEngine freezes sim, TSAA button shows Play icon, FPS counter dims). The app bridges `isPaused → params.paused` in a 3-line useEffect.

## The 10-minute rule

If a GMT feature passes the triage, the extraction should take under 30 minutes, most of it reading the original to understand edge cases. If you find yourself writing large amounts of new engine-core code to support an extraction, stop and re-triage — you're probably lifting a GMT-specific concept into generic space.

Danger signs:
- The store needs new fields that don't generalise.
- The plugin's install function takes GMT-specific config.
- The component imports from `engine-gmt/`.
- You're adding type overloads to handle both GMT and non-GMT stores.

Any of these → the feature belongs in `engine-gmt/`, not `engine/`.

## Tree placement

| Layer | Contents | Imports from |
|-------|----------|--------------|
| `engine/` | Generic state, behaviour, UI | nothing outside engine/ and shared roots |
| `engine-gmt/` | GMT-specific bridges, worker bindings, DDFS features | `engine/`, shared roots |
| `fluid-toy/`, `fractal-toy/`, future apps | App-specific layout + feature wiring | `engine/` only |
| `app-gmt/` (future) | The GMT app itself | `engine/` + `engine-gmt/` |

New engine-core topbar plugins go under `engine/plugins/topbar/` (see `FpsCounter.tsx`, `AdaptiveResolutionBadge.tsx`, `PauseControls.tsx`). Always expose an idempotent `installXxx()` so apps opt in per-plugin.

## When a GMT feature ISN'T generic

Two examples that stayed in `engine-gmt/`:
- `ViewportArea.tsx` — mounts `AnimationSystem`, reads GMT slice names, is the whole GMT viewport composition. Belongs to `app-gmt/` eventually.
- `rendererSlice` setters that emit `uRegionMin/Max` uniforms — the uniform NAMES are GMT-specific. Bridged in `engine-gmt/renderer/bindings.ts` via store subscriptions.

Rule of thumb: ports that touch the GMT worker protocol, GMT shader uniform names, or specific GMT feature slices (`coloring`, `geometry.juliaX`, `lighting.lights[]`) stay in `engine-gmt/`. Everything else lifts.

## Checklist for future extractions

1. [ ] Run the three-question triage. Write down the STATE / BEHAVIOUR / UI split.
2. [ ] Confirm the generic UI primitives exist in `components/` (Slider, Popover, Icons, etc.).
3. [ ] Confirm the generic store fields exist (or add them to `renderControlSlice` or a new engine-core slice).
4. [ ] Write the component in `engine/plugins/<category>/`. Verbatim copy from GMT, then rename imports.
5. [ ] Add an `installXxx()` function. Idempotent.
6. [ ] Wire into one test app (fluid-toy is the canonical victim).
7. [ ] If behaviour needs GMT-side glue, put it in `engine-gmt/<plugin>/bindings.ts` as store subscriptions.
8. [ ] Smoke-test with a Playwright check — confirm the button renders, click flips state, popover opens.

The goal is: every time we extract a GMT feature, the engine gets richer and GMT gets lighter. Apps like fluid-toy pick up features they didn't have before, for free.
