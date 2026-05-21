---
source: engine/features/index.ts
lines: 34
last_verified_sha: c8ba8971fcc5d716a6f81a9ba9d0fe2f96d01e42
additional_sources:
  - engine/features/types.ts
  - engine/features/ui.tsx
  - engine/features/setFeature.ts
  - engine/features/color_grading.ts
  - engine/features/post_effects.ts
  - engine/features/audioMod/AudioAnalysisEngine.ts
  - engine/features/audioMod/AudioLinkControls.tsx
  - engine/features/audioMod/AudioPanel.tsx
  - engine/features/audioMod/AudioSpectrum.tsx
  - engine/features/audioMod/index.ts
  - engine/features/modulation/ModulationEngine.ts
  - engine/features/modulation/applyAt.ts
  - engine/features/modulation/index.ts
  - engine/features/webcam/WebcamOverlay.tsx
  - engine/features/webcam/index.ts
  - engine/features/debug_tools/DebugToolsOverlay.tsx
  - engine/features/debug_tools/index.ts
audited: 2026-05-20T08:54:22Z
audited_by: claude-opus-4-7
public_api:
  - registerFeatures
  - registerUI
  - defineFeature
  - setFeature
  - getFeature
  - FeatureStateMap
  - FeatureCustomActions
  - DrawnShape
  - PostEffectsFeature
  - PostEffectsState
  - ColorGradingFeature
  - ColorGradingState
  - AudioFeature
  - AudioState
  - ModulationFeature
  - ModulationState
  - ModulationActions
  - ModulationRule
  - ModulationSource
  - WebcamFeature
  - WebcamState
  - DebugToolsFeature
  - DebugToolsState
  - AudioAnalysisEngine
  - audioAnalysisEngine
  - modulationEngine
  - applyModulationsAt
depends_on:
  - e01-feature-system
---

# engine/features — Bundled engine features

Six generic (non-fractal) DDFS feature definitions that ship with the engine
extract, plus typed wrappers around the auto-generated store setters and the
React-side `componentRegistry` registration entry point. These are the
features that survived the GMT → engine extraction: `postEffects`,
`colorGrading`, `audio`, `modulation`, `webcam`, `debugTools`. Apps (and
future plugins such as GMT raymarching) register their own features on top
of these via `featureRegistry.register(...)` (`engine/features/index.ts:9`,
`engine/features/index.ts:17-27`).

For the underlying `FeatureSystem` / `featureRegistry` / `FeatureDefinition`
signatures themselves see the **e01-feature-system** module doc — this doc
only covers the bundled features, their UI registration, and the two
runtime singletons (`audioAnalysisEngine`, `modulationEngine`) plus the
modulation tick helper.

## Public API

### Entry points (per-app `main.tsx` calls)

| Symbol | Location | Purpose |
|--------|----------|---------|
| `registerFeatures()` | `engine/features/index.ts:17-27` | Registers the six bundled `FeatureDefinition`s into the engine-side `featureRegistry`. |
| `registerUI()` | `engine/features/ui.tsx:37-58` | Injects engine Tailwind `@apply` rules (`engine/features/ui.tsx:44`) and registers six `componentId` → React component bindings in `componentRegistry`. |

### Typed feature accessors

| Symbol | Location | Notes |
|--------|----------|-------|
| `defineFeature<P>(def)` | `engine/features/setFeature.ts:52-54` | Identity helper. Mandatory if you want `setFeature` / `getFeature` to infer per-key param value types — a plain `: FeatureDefinition` annotation widens param types to `ParamType` and breaks inference. |
| `setFeature(feature, patch)` | `engine/features/setFeature.ts:59-70` | Calls `state['set' + Capitalize(feature.id)](patch)` on the engine store. Logs a dev warning if the setter is missing. |
| `getFeature(feature)` | `engine/features/setFeature.ts:72-77` | Returns `state[feature.id]` typed as `FeatureState<F>`. |
| `FeatureState<F>` | `engine/features/setFeature.ts:44-46` | Mapped type that derives JS value shape from each param's declared `type`. |

### Master state + action maps (declaration-merged)

| Symbol | Location | Notes |
|--------|----------|-------|
| `FeatureStateMap` interface | `engine/features/types.ts:18-25` | Generic baseline state map. Apps/plugins declaration-merge to add their own feature state slots — the header comment at `engine/features/types.ts:1-7` calls this out. |
| `FeatureCustomActions` | `engine/features/types.ts:29` | Extends `ModulationActions` only — modulation is the only bundled feature with custom actions. |
| `DrawnShape` | `engine/features/types.ts:37` | Backward-compat stub typed `unknown`; the drawing feature was removed during extraction. |

### Bundled feature definitions

Six DDFS features. All set `noReset: true` on every param — these are
user-tunable persistent state, not formula params owned by the engine
reset action.

| Feature | id | Location | Category | Notable shape |
|---------|----|----------|----------|----------------|
| `PostEffectsFeature` | `postEffects` | `engine/features/post_effects.ts:11` | Post Process | 4 float params (`bloomIntensity`, `bloomThreshold`, `bloomRadius`, `caStrength`); ships a `postShader` with spectral chromatic aberration (12 samples, `engine/features/post_effects.ts:95-108`) plus a bloom additive composite (`engine/features/post_effects.ts:111-113`). |
| `ColorGradingFeature` | `colorGrading` | `engine/features/color_grading.ts:13` | Post Process | Master `active` toggle gates `toneMapping` (float w/ 5 dropdown options `engine/features/color_grading.ts:45-51`), `saturation`, `levelsMin/Max/Gamma`. `applyColorGrading()` GLSL function at `engine/features/color_grading.ts:107-116`. |
| `AudioFeature` | `audio` | `engine/features/audioMod/index.ts:22` | Audio | Has both `tabConfig` and `menuConfig` (`engine/features/audioMod/index.ts:27-34`). Public params: `isEnabled`, `smoothing`, `gain`. Hidden placeholder DSP params (`threshold`, `agcEnabled`, `attack`, `decay`, `highPass`, `lowPass`) are not consumed yet (`engine/features/audioMod/index.ts:38-43`). |
| `ModulationFeature` | `modulation` | `engine/features/modulation/index.ts:51` | System | The only bundled feature with custom `state` + `actions`: `addModulation`, `removeModulation`, `updateModulation`, `selectModulation` (`engine/features/modulation/index.ts:60-101`). Exposes `rules` and `selectedRuleId` as `complex` hidden params at `engine/features/modulation/index.ts:103-107` purely for persistence/URL-shortening. |
| `WebcamFeature` | `webcam` | `engine/features/webcam/index.ts:21` | Tools | Registers a DOM viewport overlay (`engine/features/webcam/index.ts:26-29`). 14 params spanning position, size, crop, blend mode, CRT scanlines, 3D tilt, font size. |
| `DebugToolsFeature` | `debugTools` | `engine/features/debug_tools/index.ts:9` | System | DOM viewport overlay with `renderOrder: 100` (`engine/features/debug_tools/index.ts:14-18`). Two menu items at `engine/features/debug_tools/index.ts:19-22` (GLSL Debugger, State Debugger). |

### Engines & singletons

| Symbol | Location | Purpose |
|--------|----------|---------|
| `AudioAnalysisEngine` class | `engine/features/audioMod/AudioAnalysisEngine.ts:46` | WebAudio graph owner: one lazily-initialised `AudioContext`, one `AnalyserNode` (fftSize 2048), two `Deck` instances, master `GainNode`, optional `micSource`. |
| `audioAnalysisEngine` singleton | `engine/features/audioMod/AudioAnalysisEngine.ts:243` | Module-level instance. Used directly (not through the store) by `AudioPanel`, `AudioSpectrum`, and the modulation rule pipeline. |
| `modulationEngine` singleton | `engine/features/modulation/ModulationEngine.ts:197` | LFO + modulation-rule signal pipeline. Owns the shared `offsets` accumulator buffer at `engine/features/modulation/ModulationEngine.ts:24`. |
| `applyModulationsAt(time, dt)` | `engine/features/modulation/applyAt.ts:19-30` | Canonical tick composition: reset offsets, run oscillators, run rules, publish to `liveModulations`. Used by export runners (`engine/features/modulation/applyAt.ts:1-14`). |

### Re-exported types

`PostEffectsState`, `ColorGradingState`, `AudioState`, `ModulationState`,
`ModulationActions`, `ModulationRule`, `ModulationSource`, `WebcamState`,
`DebugToolsState` — re-exported from `engine/features/index.ts:31-34` via
`export * from './audioMod'` etc., and aggregated in
`engine/features/types.ts:39-47`.

## Architecture

### Two registration manifolds, decoupled

The split between `registerFeatures()` (`engine/features/index.ts:17`) and
`registerUI()` (`engine/features/ui.tsx:37`) keeps engine-side feature data
(params, state, actions, shader chunks, viewport configs) independent from
the React UI tree. Apps with no React surface (or a Tauri host) can call
`registerFeatures()` without `registerUI()`. `registerUI()` also injects
the engine's Tailwind `@apply` rules via `injectEngineStyles()`
(`engine/features/ui.tsx:44`) so the `t-btn` / `t-section-*` /
`glass-panel` / `icon-btn` utility classes are available without each app
copying them into its entry HTML.

### `defineFeature` vs `: FeatureDefinition`

`engine/features/setFeature.ts:48-54` documents that a `: FeatureDefinition`
type annotation widens `params` to the registry's `Record<string,
ParamConfig>` and erases the per-key value types `setFeature`/`getFeature`
need. The six bundled feature files currently still use the explicit
annotation (`engine/features/post_effects.ts:11`,
`engine/features/color_grading.ts:13`,
`engine/features/audioMod/index.ts:22`,
`engine/features/modulation/index.ts:51`,
`engine/features/webcam/index.ts:21`,
`engine/features/debug_tools/index.ts:9`) — so typed `setFeature(...)`
access works only for features authored with `defineFeature(...)`. The
helper is offered for new app/plugin features rather than back-applied to
the bundled set.

### Setter name resolution

`engine/features/setFeature.ts:56-57` derives the auto-generated store
setter as `set${cap(feature.id)}` (e.g. `setAudio`, `setWebcam`,
`setPostEffects`). When the lookup misses,
`engine/features/setFeature.ts:67-68` emits a dev-only warning — the cause
is almost always a boot-order bug where `setFeature` is called before the
feature has been registered into the store. The `set${FeatureId}`
convention is shared across the engine; see e01-feature-system + the
DDFS-auto-wiring carry-in entry (q-013) for the full list of sites
consuming this string convention.

### Modulation pipeline

`modulationEngine.update()` runs four stages per enabled rule
(`engine/features/modulation/ModulationEngine.ts:119-161`):

1. **Source signal** — audio FFT band average via `processAudioSignal`
   (`engine/features/modulation/ModulationEngine.ts:169-194`) or cached
   `lfoValues[source]`.
2. **Envelope follow** — attack/decay coefficients
   `1 - rule.{attack,decay}^0.2`
   (`engine/features/modulation/ModulationEngine.ts:134-142`).
3. **Secondary smoothing** — lerp coefficient `1 - smoothing^0.5`
   (`engine/features/modulation/ModulationEngine.ts:149-154`).
4. **Output transform** — `gain * signal + offset`, **accumulated** into
   `offsets[rule.target]`
   (`engine/features/modulation/ModulationEngine.ts:158-161`).

LFO oscillators run separately in
`engine/features/modulation/ModulationEngine.ts:30-103`. Five wave shapes
(Sine / Triangle / Sawtooth / Pulse / Noise) at
`engine/features/modulation/ModulationEngine.ts:43-63`; Noise uses a
shared `ImprovedNoise` from `three-stdlib`
(`engine/features/modulation/ModulationEngine.ts:9`) with a per-LFO seed
offset (`engine/features/modulation/ModulationEngine.ts:55-58`) so two
same-period noise LFOs trace different curves. Amplitude has two
conventions — new `{min, max}` shape `mid + halfRange * rawWave` and a
legacy `amplitude * rawWave` fallback that preserves old presets
(`engine/features/modulation/ModulationEngine.ts:81-88`).

### `applyModulationsAt` — the canonical tick composition

`engine/features/modulation/applyAt.ts:19-30` is the single composition
point that replaces five-line tick dances previously duplicated across
demo/fluid-toy/app-gmt runners
(`engine/features/modulation/applyAt.ts:1-14`). It reads `lfosEnabled` and
`audio.isEnabled` from the store
(`engine/features/modulation/applyAt.ts:21-22`), resets offsets, runs
oscillators + rules, then publishes the offsets to `liveModulations` via
`storeState.setLiveModulations({ ...modulationEngine.offsets })`
(`engine/features/modulation/applyAt.ts:29`). The `setLiveModulations` /
`lfosEnabled` / `liveModulations` slot live on the engine store root —
not on the feature slice — per q-069's investigation; see Interactions
below.

### AudioAnalysisEngine WebAudio graph

`engine/features/audioMod/AudioAnalysisEngine.ts:46-82` builds a single
WebAudio graph lazily. `init()`
(`engine/features/audioMod/AudioAnalysisEngine.ts:61`) short-circuits on
second call so all public entry points
(`connectMicrophone`/`connectSystemAudio`/`loadTrack`) can call it first
without cost. Topology:

- `Master GainNode` (`engine/features/audioMod/AudioAnalysisEngine.ts:64`,
  default gain 0.8) → `AudioContext.destination`.
- `Master GainNode` → `AnalyserNode` (fftSize 2048, smoothing 0.8,
  `engine/features/audioMod/AudioAnalysisEngine.ts:68-70`) — the analyser
  is a tap; no further connection from it.
- Two `Deck` source nodes
  (`engine/features/audioMod/AudioAnalysisEngine.ts:77-78`) feed Master.
- Optional `micSource` — connected only to the analyser
  (`engine/features/audioMod/AudioAnalysisEngine.ts:107`) so the mic does
  not echo to the destination (anti-feedback comment at
  `engine/features/audioMod/AudioAnalysisEngine.ts:104-107`).
- System-audio capture connects to both analyser and destination
  (`engine/features/audioMod/AudioAnalysisEngine.ts:128-130`) so the user
  hears it.

Crossfade is equal-power
(`engine/features/audioMod/AudioAnalysisEngine.ts:217-225`).
`waitForMetadata()`
(`engine/features/audioMod/AudioAnalysisEngine.ts:177-200`) is the
event-driven `<audio>` metadata loader; `getTrackInfo().duration` returns
0 (not 1) when metadata has not yet loaded
(`engine/features/audioMod/AudioAnalysisEngine.ts:205-208`) — the comment
calls out the `|| 1` regression that previously locked AudioStrip clips
to 1-second slices.

### `componentRegistry` IDs registered

`engine/features/ui.tsx:49-57` registers six string IDs (q-071 corrects
q-068: `componentRegistry` is engine-owned at
`components/registry/ComponentRegistry.tsx`, not host-app-owned — the
host app owns *what* gets registered, not the registry itself):

| componentId | Component | Lazy? | Consumer site |
|-------------|-----------|-------|---------------|
| `auto-feature-panel` | `AutoFeaturePanel` | no | PanelRouter looks it up by ID (legacy/external) |
| `panel-audio` | `AudioPanel` | yes | Audio tab content |
| `overlay-webcam` | `WebcamOverlay` | no | Webcam feature `viewportConfig` |
| `overlay-debug-tools` | `DebugToolsOverlay` | yes | Debug feature `viewportConfig` |
| `audio-spectrum` | `AudioSpectrum` | yes | Audio panel inline editor |
| `audio-link-controls` | `AudioLinkControls` | no | Audio panel inline + LFO source rules |

### Post-process shader composition

Both `PostEffectsFeature` and `ColorGradingFeature` ship a `postShader`
block with optional `uniforms` / `functions` / `main` strings — the
engine's shader builder concatenates these into the post-process pass.

- `PostEffectsFeature.postShader` declares `uniform sampler2D
  uBloomTexture;` (`engine/features/post_effects.ts:73`) — actual binding
  of that texture is the worker-side `BloomPass`'s job, called out in
  the comment at `engine/features/post_effects.ts:110`.
- `ColorGradingFeature.toneMapping` is declared as a `float` with
  `options` (`engine/features/color_grading.ts:36-52`): the dropdown
  maps label → float for the shader uniform `uToneMapping`. The
  `applyColorGrading()` function and its master `uGradingActive > 0.5`
  gate live at `engine/features/color_grading.ts:106-122`. Same float-
  options pattern is used by webcam's `blendMode`
  (`engine/features/webcam/index.ts:46-60`).

### UI conditionals — `parentId` + `condition`

DDFS-wide pattern used in the bundled features:
- `engine/features/color_grading.ts:73-75`, `:86-89`, `:100-102` —
  `parentId: 'active', condition: { bool: true }` to collapse levels +
  saturation when grading is off.
- `engine/features/post_effects.ts:40-42`, `:52-54` — `parentId:
  'bloomIntensity', condition: { gt: 0.0 }` to collapse threshold/radius
  when bloom is zero.

## Invariants

- **Setter naming is load-bearing string convention.**
  `engine/features/setFeature.ts:56-57` derives `set${cap(id)}`; the
  matching auto-generated setter must exist on the engine store before
  any `setFeature` call. This is **not** type-enforced. q-013
  cross-cutting carry-in calls this out as one of two DDFS
  string-conventions to document explicitly in module docs.
- **Track-id convention `${featureId}.${paramKey}_<axis>`** drives the
  modulation/keyframe pipeline. The audio UI's `ParameterSelector`
  populates rule `target` strings against this convention
  (`engine/features/audioMod/AudioLinkControls.tsx:65-69`). Also not
  type-enforced — see q-013 carry-in.
- **`liveModulations`, `lfosEnabled`, `setLiveModulations` live on the
  engine store root**, not in any feature slice — per q-069. The
  modulation feature owns `state.modulation.rules` and
  `state.modulation.selectedRuleId`; the tick output lives at
  `state.liveModulations`.
- **`modulationEngine.offsets` is cleared by the caller, not by
  `update()`.** `engine/features/modulation/ModulationEngine.ts:106`
  states "offsets buffer is cleared by AnimationSystem before calling
  this". `resetOffsets()`
  (`engine/features/modulation/ModulationEngine.ts:165-167`) exists and
  is called from `engine/features/modulation/applyAt.ts:23`, but inside
  `update()` itself the accumulator is appended-to. Two rules targeting
  the same param will **accumulate**, not overwrite.
- **LFO master switch gates both writes and reads.**
  `engine/features/modulation/ModulationEngine.ts:34-35` ("When off, no
  LFO contributes to offsets AND no lfoValues are refreshed") plus the
  rule-side gate at
  `engine/features/modulation/ModulationEngine.ts:116-117` — both
  required. Without the rule-side gate, an LFO-sourced rule reads stale
  cached `lfoValues` and hangs at its final modulated value.
- **LFO sampling uses unit-period phase, not radians.**
  `engine/features/modulation/ModulationEngine.ts:40` —
  `((time / period) + phase) % 1`. Noise samples at
  `time / period` (`engine/features/modulation/ModulationEngine.ts:59`),
  so larger period = slower wiggle.
- **`AudioFeature` has no custom actions**; its setter is the
  conventional auto-generated `setAudio`
  (`engine/features/audioMod/AudioPanel.tsx:229`). `ModulationFeature`
  is the only bundled feature with custom actions
  (`engine/features/modulation/index.ts:43-48`,
  `engine/features/modulation/index.ts:60-101`); `FeatureCustomActions`
  in `engine/features/types.ts:29` accordingly extends only
  `ModulationActions`.
- **`(store as any).updateModulation({ id, update })` is acknowledged
  tech debt** (q-077). All three audio-UI sites
  (`engine/features/audioMod/AudioPanel.tsx:134`,
  `engine/features/audioMod/AudioLinkControls.tsx:18`,
  `engine/features/audioMod/AudioSpectrum.tsx:20`) repeat the same
  untyped cast — there is no typed accessor (`callAction`-style) for
  custom feature actions, and there is no design intent in
  `engine/features/setFeature.ts` to grow one.
- **`audioAnalysisEngine.init()` is idempotent** —
  `engine/features/audioMod/AudioAnalysisEngine.ts:62` short-circuits on
  second call. Every public entry point calls it first.
- **Mic does NOT route to destination, system audio does.** Anti-
  feedback by design — see
  `engine/features/audioMod/AudioAnalysisEngine.ts:104-107` versus
  `engine/features/audioMod/AudioAnalysisEngine.ts:128-130`. Loading a
  track also disables an active mic
  (`engine/features/audioMod/AudioAnalysisEngine.ts:145-149`); the
  reverse is not symmetric — connecting the mic only **pauses** decks
  (`engine/features/audioMod/AudioAnalysisEngine.ts:96`).
- **`getTrackInfo().duration` returns 0 when metadata not yet loaded.**
  Explicit `|| 0` (not `|| 1`) at
  `engine/features/audioMod/AudioAnalysisEngine.ts:205-208`; the
  comment explains the previous bug.
- **`AudioPanel`'s 100-ms poll is load-bearing** (q-075).
  `engine/features/audioMod/AudioPanel.tsx:23-31` polls
  `audioAnalysisEngine.getTrackInfo` because the engine exposes only a
  pull API — no `timeupdate` / `play` / `pause` / `ended` forwarding.
  This does **not** contradict `waitForMetadata` (one-shot metadata
  loader vs continuous playhead telemetry). Removing the poll would
  visibly break the play/pause icon and progress bar.
- **`AudioSpectrum` couples directly to engine singletons.**
  `engine/features/audioMod/AudioSpectrum.tsx:3-6` imports
  `audioAnalysisEngine` and `modulationEngine` directly; the store is
  used only for rule list + selection state
  (`engine/features/audioMod/AudioSpectrum.tsx:12-14`).
- **`WebcamOverlay.blendMode` is a float index, not a string.**
  `engine/features/webcam/WebcamOverlay.tsx:45,318` maps
  `Math.floor(blendIdx)` into a local `BLEND_MODES` array
  (`engine/features/webcam/WebcamOverlay.tsx:38`). DDFS persists the
  float; CSS reads the string.
- **`WebcamOverlay` mount-effect depends only on `isEnabled`.**
  `engine/features/webcam/WebcamOverlay.tsx:69-145` starts/stops the
  `getUserMedia` stream and global input listeners on the
  `isEnabled` toggle. The frame loop
  (`engine/features/webcam/WebcamOverlay.tsx:147-209`) re-runs on
  param changes via its own dep array
  (`engine/features/webcam/WebcamOverlay.tsx:209`).
- **`shaderDebuggerOpen` has no consumer in this subsystem.**
  `engine/features/debug_tools/DebugToolsOverlay.tsx:11-17` only mounts
  the `StateDebugger`; the menu item
  (`engine/features/debug_tools/index.ts:20`) toggles a state slot
  nothing here reads. Comment at
  `engine/features/debug_tools/DebugToolsOverlay.tsx:5-8` calls out
  that the shader debugger was fractal-specific and was dropped during
  extraction.
- **`PostEffectsFeature` does NOT bind `uBloomTexture`.** The uniform is
  declared (`engine/features/post_effects.ts:73`) and sampled
  (`engine/features/post_effects.ts:112`); binding is the worker-side
  BloomPass's responsibility (comment at
  `engine/features/post_effects.ts:110`).
- **`isolatedModules` requires `export type` for cross-module re-
  exports.** `engine/features/index.ts:29-30` cites CLAUDE.md;
  `engine/features/index.ts:31-34` uses `export *` from feature index
  files, which is safe because those indexes re-export only types and
  feature defs (not values that would survive into JS output).

## Interactions with other subsystems

- **e01-feature-system** — provides the `featureRegistry` singleton
  (`engine/features/index.ts:9`), `FeatureDefinition` /
  `ParamConfig` / `ParamType` types
  (`engine/features/setFeature.ts:22`), and `componentRegistry`
  consumer via `validateComponentRefs` (per q-068, q-071). The bundled
  features use the full surface: `params`, `state`, `actions`,
  `tabConfig`, `menuConfig`, `menuItems`, `viewportConfig`, `customUI`,
  `postShader`, `category`, `shortId`. The bundled features are
  registered first; app/plugin features register on top later.
- **engine store root (`store/engineStore.ts` per q-069)** — exposes
  `useEngineStore`, `lfosEnabled`, `liveModulations`,
  `setLiveModulations`, `animations`. The modulation tick reads + writes
  these from `engine/features/modulation/applyAt.ts:16-29`. Feature
  slices themselves are created by `createFeatureSlice`; the engine
  store deliberately defers `create()` until first access so
  app-side `registerFeatures.ts` can populate the feature registry
  before the store snapshots the feature manifest (q-069).
- **e03-animation** — `AnimationSystem` is the live caller of
  `modulationEngine.updateOscillators` / `modulationEngine.update`
  (comment at `engine/features/modulation/ModulationEngine.ts:69` and
  `engine/features/modulation/ModulationEngine.ts:106`) and owns the
  `offsets` clear in the live path. The export path uses
  `applyModulationsAt` (this subsystem's
  `engine/features/modulation/applyAt.ts:19`). `anim.baseValue` is
  vestigial — base-value composition is owned by `AnimationSystem.tick`,
  not by `ModulationEngine` (per q-070 carry-in on e03-animation).
- **Worker / RenderPipeline** — `PostEffectsFeature`'s bloom uniform
  `uBloomTexture` is bound worker-side by `BloomPass` (per the comment
  at `engine/features/post_effects.ts:110`). Post-shader chunks are
  composed into the post-process pass; the actual concatenation lives
  in the shader builder (e04-shader-builder).
- **components/registry/ComponentRegistry.tsx** — the engine-owned
  singleton `componentRegistry` (q-071). The bundled features only
  consume it via `registerUI` (`engine/features/ui.tsx:49-57`); the
  React props contract (`FeatureComponentProps`) is consumed by
  `AudioLinkControls`, `WebcamOverlay`, `DebugToolsOverlay`
  (`engine/features/audioMod/AudioLinkControls.tsx:8`,
  `engine/features/webcam/WebcamOverlay.tsx:3`,
  `engine/features/debug_tools/DebugToolsOverlay.tsx:3`).
- **components/AutoFeaturePanel** —
  `engine/features/ui.tsx:11,49` registers it under
  `'auto-feature-panel'` for legacy/external lookup; PanelRouter
  imports it directly now. e13-shared-ui's q-089 carry-in flags that
  `AutoFeaturePanel` itself imperatively calls GMT-app-only concepts
  (`movePanel('Engine','left')`) — that's a shared-UI concern, not a
  bundled-feature concern.
- **engine/styles/componentClasses (`injectEngineStyles`)** —
  `engine/features/ui.tsx:12,44` calls it from `registerUI()` so the
  Tailwind CDN picks up engine `@apply` classes. Idempotent, browser-
  only.
- **three-stdlib** — `ImprovedNoise` is imported by
  `engine/features/modulation/ModulationEngine.ts:5` for noise LFOs.

## Known issues / Phase 2 carry-in

From `plans/doc-audit-state/phase-2-carry-in.json` `by_subsystem`
`e10-engine-features`:

- **q-068 / q-071 (drift, resolved)** — initial claim that
  `componentRegistry` was host-app-owned was wrong. The class +
  singleton live at `components/registry/ComponentRegistry.tsx` (engine
  layer). The host app owns *what* is registered into the singleton, not
  the singleton itself. Doc reflects q-071's canonical statement.
- **q-022 (drift)** — `runTicks(delta)` is seconds, not ms. Two stale
  doc sites at `docs/engine/01_Architecture.md:83` and
  `docs/engine/04_Core_Plugins.md:206` still use ms-flavoured wording.
  Not an e10 code bug; e10's `applyModulationsAt(time, dt)` already
  accepts seconds (`engine/features/modulation/applyAt.ts:19`).

Other carry-in pieces this doc touches in passing:
- **q-013 (cross-cutting DDFS string contracts)** — `set${FeatureId}` and
  `${featureId}.${paramKey}_<axis>` are load-bearing and not type-
  enforced. Called out under Invariants.
- **q-069 (engine store root composition)** — `liveModulations`,
  `lfosEnabled`, `setLiveModulations` live on the store root, not in a
  feature slice. Called out under Architecture + Interactions.
- **q-075 (AudioPanel poll vs `waitForMetadata`)** — load-bearing poll
  documented under Invariants.
- **q-077 (`(store as any).updateModulation`)** — acknowledged tech
  debt; no `callAction` intent in `setFeature.ts`. Documented under
  Invariants. The audio panel call site at
  `engine/features/audioMod/AudioPanel.tsx:134` is missing from
  `docs/gmt/07_Code_Health.md:316-326`'s Cat-3 table; a future
  Code-Health pass should reconcile that table against the live files.

Pending followups (not yet investigated in Sub-phase B): q-072, q-073,
q-074, q-076 are pending in Sub-phase B; doc may need a regen pass once
they land.

In-source dead/vestigial items worth a future cleanup pass:
- `engine/features/webcam/WebcamOverlay.tsx:194-200` — word-wrap
  computations (`words`, `line`, `y`, `lineHeight`) are computed but
  unused; `ctx.fillText(errorMsg, width/2, height/2)` uses the
  unwrapped string.
- `engine/features/debug_tools/index.ts:24` — `shaderDebuggerOpen`
  param + the GLSL Debugger menu item at
  `engine/features/debug_tools/index.ts:20` have no consumer in this
  subsystem after `ShaderDebugger` was dropped at extraction.
- `engine/features/audioMod/index.ts:38-43` — hidden DSP params
  (`threshold`, `agcEnabled`, `attack`, `decay`, `highPass`,
  `lowPass`) are declared but not consumed; only `smoothing` and `gain`
  round-trip through `AudioPanel`.
- `engine/features/types.ts:37` — `DrawnShape = unknown` is a back-
  compat stub for the removed drawing feature.

## Historical context

The bundled features are what survived the GMT → engine extract: the
header comment at `engine/features/index.ts:1-7` describes them as "the
generic (non-fractal) features that survived the engine extraction. A
future app or plugin (e.g. GMT raymarching) will register its own
features on top of these." The drawing feature was removed during that
extraction (`engine/features/types.ts:34-37`); the GLSL shader debugger
was removed because it was raymarching-specific
(`engine/features/debug_tools/DebugToolsOverlay.tsx:5-8`).
`setFeature.ts`'s header comment
(`engine/features/setFeature.ts:1-19`) frames the whole module as a
replacement for the `(state as any).setX(...)` pattern that used to
litter the GMT codebase. `applyModulationsAt`
(`engine/features/modulation/applyAt.ts:1-14`) collapsed three
runner-specific copies of an oscillator/rule tick dance.
`waitForMetadata`
(`engine/features/audioMod/AudioAnalysisEngine.ts:173-176`) explicitly
documents that it replaced a 50 ms metadata-load poll (a different
poll from the one `engine/features/audioMod/AudioPanel.tsx:23-31` still does for playhead
telemetry).
