---
subsystem_id: e10-engine-features
audited_at: 2026-05-19T21:13:13Z
files:
  - path: engine/features/index.ts
    blob_sha: c8ba8971fcc5d716a6f81a9ba9d0fe2f96d01e42
    line_count: 34
    read_range: [1, 34]
  - path: engine/features/types.ts
    blob_sha: ef2c2e200fd2812902b9b788a1109876297e5b21
    line_count: 47
    read_range: [1, 47]
  - path: engine/features/ui.tsx
    blob_sha: da3ff8d451f50d40349b457faca121f5b10d41da
    line_count: 58
    read_range: [1, 58]
  - path: engine/features/setFeature.ts
    blob_sha: 112eb19047ab859b22c19ba3ae513954484e878f
    line_count: 81
    read_range: [1, 81]
  - path: engine/features/color_grading.ts
    blob_sha: 5e8b33678aad168d9c78baa8c15007fea131a297
    line_count: 124
    read_range: [1, 124]
  - path: engine/features/post_effects.ts
    blob_sha: ac08955caaebf3ef765ab2e914a626d9cd9cab0b
    line_count: 116
    read_range: [1, 116]
  - path: engine/features/audioMod/AudioAnalysisEngine.ts
    blob_sha: d2cf29b3c0059d4543412114700b44c729dc25c0
    line_count: 243
    read_range: [1, 243]
  - path: engine/features/audioMod/AudioLinkControls.tsx
    blob_sha: bd827b169038e5e81731f2ddf3e4c60c193ce015
    line_count: 174
    read_range: [1, 174]
  - path: engine/features/audioMod/AudioPanel.tsx
    blob_sha: 1062c6876daae22e1121cbe32fad9963c42a2c65
    line_count: 353
    read_range: [1, 353]
  - path: engine/features/audioMod/AudioSpectrum.tsx
    blob_sha: 308f2290d38c9cd2055004314b7e676d90b47094
    line_count: 423
    read_range: [1, 423]
  - path: engine/features/audioMod/index.ts
    blob_sha: 89bbc5e52c5c8bcc0a89001004c3e28076181e78
    line_count: 46
    read_range: [1, 46]
  - path: engine/features/modulation/ModulationEngine.ts
    blob_sha: 9bcca466db7d1619e7de4faa0b90c818e412e10b
    line_count: 197
    read_range: [1, 197]
  - path: engine/features/modulation/applyAt.ts
    blob_sha: f3b0f96d5913e03b0f0f650159a68db9686f43d9
    line_count: 30
    read_range: [1, 30]
  - path: engine/features/modulation/index.ts
    blob_sha: 4974037e5785d3fc448f0836d4ec2a71ef78b1c7
    line_count: 108
    read_range: [1, 108]
  - path: engine/features/webcam/WebcamOverlay.tsx
    blob_sha: 86a85e4881370be855d8821303a5c72764ac885e
    line_count: 408
    read_range: [1, 408]
  - path: engine/features/webcam/index.ts
    blob_sha: ef093b5cde16f08660c156d2b5e56358e07ab192
    line_count: 65
    read_range: [1, 65]
  - path: engine/features/debug_tools/DebugToolsOverlay.tsx
    blob_sha: 036eff490758442a22ae20009ef117250750ba67
    line_count: 17
    read_range: [1, 17]
  - path: engine/features/debug_tools/index.ts
    blob_sha: c8d287ad55025006c82cf7e9ed6873d5f7d20834
    line_count: 27
    read_range: [1, 27]
---

## Public API surface

### Top-level entry points
- `registerFeatures()` — engine/features/index.ts:17–27 — registers six generic features into `featureRegistry`: `PostEffectsFeature`, `ColorGradingFeature`, `AudioFeature`, `ModulationFeature`, `WebcamFeature`, `DebugToolsFeature`.
- `registerUI()` — engine/features/ui.tsx:37–58 — calls `injectEngineStyles()` (line 44), registers `auto-feature-panel` (line 49), `panel-audio` (line 52, lazy), `overlay-webcam` (line 53), `overlay-debug-tools` (line 54, lazy), `audio-spectrum` (line 56, lazy), `audio-link-controls` (line 57).
- `defineFeature<P>(def)` — engine/features/setFeature.ts:52–54 — identity helper preserving param literal types.
- `setFeature(feature, patch)` — engine/features/setFeature.ts:59–70 — typed wrapper that calls `state.set<Id>(patch)`.
- `getFeature(feature)` — engine/features/setFeature.ts:72–77 — typed slice read.
- `FeatureStateMap` interface — engine/features/types.ts:18–25 — aggregate of all generic feature state slots.
- `FeatureCustomActions` — engine/features/types.ts:29 — extends `ModulationActions` only.
- `DrawnShape` backward-compat stub — engine/features/types.ts:37, type is `unknown` since drawing feature was removed.

### Feature definitions
- `PostEffectsFeature` — engine/features/post_effects.ts:11 — id `'postEffects'`, category `'Post Process'`. Params: `bloomIntensity`, `bloomThreshold`, `bloomRadius`, `caStrength` (post_effects.ts:17–70). Ships `postShader` with bloom + spectral chromatic aberration GLSL (lines 72–115).
- `ColorGradingFeature` — engine/features/color_grading.ts:13 — id `'colorGrading'`. Params: `active`, `toneMapping` (5 options), `saturation`, `levelsMin`, `levelsMax`, `levelsGamma` (color_grading.ts:27–104). Ships `postShader` `applyColorGrading()` and main hook (lines 105–123).
- `AudioFeature` — engine/features/audioMod/index.ts:22 — id `'audio'`, category `'Audio'`, has `tabConfig` + `menuConfig` (lines 27–34). Params: `isEnabled`, `smoothing`, `threshold`, `agcEnabled`, `attack`, `decay`, `highPass`, `lowPass`, `gain` (lines 35–44).
- `ModulationFeature` — engine/features/modulation/index.ts:51 — id `'modulation'`, category `'System'`. Custom `state` + `actions` (`addModulation`, `removeModulation`, `updateModulation`, `selectModulation`) at lines 56–101. Params expose `rules` and `selectedRuleId` as `complex` hidden for persistence (lines 103–107).
- `WebcamFeature` — engine/features/webcam/index.ts:21 — id `'webcam'`, category `'Tools'`. `viewportConfig` registers `'overlay-webcam'` as DOM overlay (lines 26–29). 14 params (lines 36–63).
- `DebugToolsFeature` — engine/features/debug_tools/index.ts:9 — id `'debugTools'`, category `'System'`. `viewportConfig` registers `'overlay-debug-tools'` as DOM overlay with renderOrder 100 (lines 14–18). `menuItems` for GLSL + State Debugger (lines 19–22). Params: `shaderDebuggerOpen`, `stateDebuggerOpen`.

### Engines & singletons
- `audioAnalysisEngine` — engine/features/audioMod/AudioAnalysisEngine.ts:243 — singleton instance of `AudioAnalysisEngine` class (line 46).
- `modulationEngine` — engine/features/modulation/ModulationEngine.ts:197 — singleton instance of `ModulationEngine` class (line 11).
- `applyModulationsAt(time, dt)` — engine/features/modulation/applyAt.ts:19–30 — composite tick helper used by export runners.

### Exported types
- `PostEffectsState` — engine/features/post_effects.ts:4–9.
- `ColorGradingState` — engine/features/color_grading.ts:4–11.
- `AudioState` — engine/features/audioMod/index.ts:6–16.
- `ModulationSource`, `ModulationRule`, `ModulationState`, `ModulationActions` — engine/features/modulation/index.ts:9, 11–36, 38–41, 43–48.
- `WebcamState` — engine/features/webcam/index.ts:4–19.
- `DebugToolsState` — engine/features/debug_tools/index.ts:4–7.
- Re-exported from `engine/features/index.ts:31–34` and `engine/features/types.ts:39–47`.

## Architecture

- **Two registration entry points** keep React UI and the engine boot path decoupled: `registerFeatures()` (engine/features/index.ts:17) populates the engine-side `featureRegistry`, and `registerUI()` (engine/features/ui.tsx:37) registers `componentRegistry` entries plus injects Tailwind `@apply` rules via `injectEngineStyles()` (ui.tsx:44).
- **`defineFeature` over `: FeatureDefinition`** — setFeature.ts:48–54 documents that an explicit `FeatureDefinition` annotation widens param types to `ParamType`, so `defineFeature(...)` is mandatory for typed `setFeature`/`getFeature` access (setFeature.ts:9–14, 44–46). The feature files themselves currently still use `FeatureDefinition` annotation (post_effects.ts:11, color_grading.ts:13, audioMod/index.ts:22, modulation/index.ts:51, webcam/index.ts:21, debug_tools/index.ts:9) — typed accessors only work for features authored with `defineFeature`.
- **Setter resolution by convention** — setFeature.ts:56–57 derives setter name as `set${cap(id)}`; setFeature.ts:67–68 warns in dev when not found (boot ordering bug). Reads/writes go through the singleton `useEngineStore` (setFeature.ts:21).
- **Param value-type map** — setFeature.ts:27–38 enumerates the eight scalar/vec types that map to inferred JS shapes. `gradient`, `image`, `complex` deliberately stay `any` (slice-specific).
- **Master state declaration-merging** — types.ts:18–25 defines `FeatureStateMap` and types.ts:29 defines `FeatureCustomActions extends ModulationActions`. Comment at types.ts:16 says apps/plugins extend these via declaration merging to add slots without touching the engine file.
- **Drawing feature was removed during extraction** — types.ts:34–37 keeps `DrawnShape = unknown` only for downstream import compatibility.
- **Post-process shader composition** — PostEffects and ColorGrading both ship a `postShader` block with `uniforms`/`functions`/`main`. `PostEffectsFeature` declares `uniform sampler2D uBloomTexture;` (post_effects.ts:73) and consumes it inside `main`. The CA loop is spectral with 12 samples (post_effects.ts:96–107). Bloom is "composited by BloomPass in worker" (post_effects.ts:110) — actual compositing lives outside this subsystem.
- **`parentId` + `condition` UI conditionals** — color_grading.ts:73–75, 86–89, 100–102 use `parentId: 'active'` + `condition: { bool: true }` to hide levels/saturation when grading is off. post_effects.ts:40–42 uses `parentId: 'bloomIntensity'` + `condition: { gt: 0.0 }` so bloom controls collapse when intensity is zero. Pattern is DDFS-wide.
- **`noReset: true` everywhere** — every param across these six features sets `noReset: true`. Reset semantics are owned by the engine reset action and these are user-tunable persistent state, not formula params.
- **AudioState includes hidden DSP fields not yet wired** — audioMod/index.ts:38–43 declares `threshold`, `agcEnabled`, `attack`, `decay`, `highPass`, `lowPass` as `hidden: true` — placeholder UI; only `smoothing` and `gain` round-trip through `AudioPanel.tsx`.
- **`AudioAnalysisEngine` owns a singleton WebAudio graph** — AudioAnalysisEngine.ts:46–82. One `AudioContext` lazily inited (line 62), one `AnalyserNode` (fftSize 2048, smoothing 0.8, lines 68–70), two `Deck` instances (lines 77–78), a master `GainNode` (line 64), and an optional `micSource` (line 51). Master → Analyser → no destination connection from analyser; Analyser is a tap.
- **Mic vs system-audio routing differs** — AudioAnalysisEngine.ts:107 connects mic only to analyser to avoid feedback; AudioAnalysisEngine.ts:128–130 connects system audio to both analyser (visualize) and destination (listen).
- **Equal-power crossfade** — AudioAnalysisEngine.ts:217–225 uses `cos(v·π/2)` / `cos((1−v)·π/2)` on the two deck gains.
- **`waitForMetadata` is event-driven (no polling)** — AudioAnalysisEngine.ts:177–200 wires `loadedmetadata` + `durationchange` with a timeout. Comment at line 173 explicitly calls this a replacement for an old 50-ms poll.
- **`getTrackInfo().duration` returns 0 when metadata not yet loaded** — AudioAnalysisEngine.ts:205–208 explicit "0 (not 1)" rationale: previous `|| 1` made `AudioStrip`'s `waitForAudioMetadata` false-resolve to a 1-second slice.
- **`ModulationEngine` is the single signal source for both audio and LFO modulation** — modulation/ModulationEngine.ts:11. `updateOscillators()` (line 30) builds LFO offsets, `update()` (line 105) processes rules, both accumulate into `offsets[]` (lines 101, 161).
- **LFO master switch gates offset writes AND normalized-value cache** — ModulationEngine.ts:34–35 "When off, no LFO contributes to offsets AND no lfoValues are refreshed". The corresponding rule-side gate is at ModulationEngine.ts:116–117 — without these, an LFO-sourced rule reads stale cached values and hangs at a final modulated state.
- **Five LFO wave shapes** — ModulationEngine.ts:43–63: Sine, Triangle, Sawtooth, Pulse, Noise. Noise uses a shared `ImprovedNoise` from `three-stdlib` (line 9) with a per-LFO seed offset (lines 55–58) so two same-period noise LFOs trace different curves; sampling at `time / period` makes period meaningful (line 59).
- **Two amplitude conventions for LFOs** — ModulationEngine.ts:81–88: new `{min, max}` shape `mid + halfRange * rawWave`, legacy `amplitude * rawWave` fallback (preserves loaded presets). LFO smoothing uses exponential decay coefficient `50·(1-s)² + 0.1` (line 93).
- **Modulation rule pipeline is 4 stages** — ModulationEngine.ts:119–161: (1) get source signal — audio FFT band-average via `processAudioSignal` (lines 169–194) or cached `lfoValues[source]`; (2) envelope follow with attack/decay coefficients `1 - rule.{attack,decay}^0.2` (lines 134–142); (3) secondary smoothing lerp `1 - smoothing^0.5` (lines 149–154); (4) `gain * signal + offset` accumulated into `offsets[rule.target]` (lines 158–161).
- **Audio band processing has a noise gate and ceiling** — ModulationEngine.ts:188–192: values below `thresholdMin` return 0, range above is normalized to `(rawAvg - thresholdMin) / (thresholdMax - thresholdMin)`, clamped to 1.
- **`applyModulationsAt` is the canonical tick composition** — modulation/applyAt.ts:19–30. Reads `lfosEnabled` from the store root and `audio.isEnabled` from the audio slice (lines 21–22), resets offsets (line 23), runs oscillators, runs rules if any exist, and publishes to `setLiveModulations` (line 29). Comment at applyAt.ts:1–14 says this replaces a 5-line dance previously duplicated across demo / fluid-toy / app-gmt runners.
- **AudioSpectrum is a self-contained editor canvas** — AudioSpectrum.tsx:9–423. Manages its own RAF loop (lines 64–211), uses `modulationEngine.getRuleValue()` for live meters (line 167), supports drag/resize/move/gain operations (lines 213–356), context-menu toggle of log vs linear frequency scale (lines 383–392), and double-click to add a rule (lines 358–381).
- **AudioSpectrum has snap-to-zero behavior for log scale** — AudioSpectrum.tsx:50–52: clicking in the first 2% of width forces freq 0.0 to make sub-bass selectable in log scale.
- **AudioSpectrum couples directly to engine singletons** — AudioSpectrum.tsx:3, 6 import `audioAnalysisEngine` and `modulationEngine` directly, not through the store. Store is used only for the rule list and selection state (lines 12–14).
- **AudioPanel does mixed sync** — AudioPanel.tsx:228–353. Deck status uses a 100-ms `setInterval` poll (lines 23–31) because element events alone don't carry continuous playhead position. Mount-time `setMasterGain(gain ?? 0.8)` (lines 263–265) replays persisted gain into the engine.
- **`AudioLinkControls` is shown for both audio and LFO sources** — AudioLinkControls.tsx:49 sets `isAudio = rule.source === 'audio'`. Frequency-band buttons + info footer are conditional (lines 103–113, 166–171), envelope/smoothing/gain/offset knobs are unconditional (lines 116–163).
- **WebcamOverlay is a registered DOM overlay** — webcam/index.ts:26–29 + ui.tsx:53. Implementation at webcam/WebcamOverlay.tsx:40–408: 15-FPS canvas blit (lines 41–42, 157), `mediaDevices.getUserMedia` with 640×480 ideal (line 89), mirror-X via `ctx.translate(width, 0); ctx.scale(-1, 1)` (lines 180–183), drag/scale/crop handles managed via `dragRef` (lines 58–65, 259–314).
- **WebcamOverlay overlays input visualization** — WebcamOverlay.tsx:6–35 hard-codes `BOTTOM_LABELS`, `WASD_CONFIG`, `KEY_MAP`, `MOUSE_MAP`. Inputs are tracked via global `keydown`/`keyup`/`mousedown`/`mouseup`/`wheel` listeners (lines 111–144) with per-input fade timers (lines 147–155). Used for tutorial/demo recordings of user input.
- **WebcamOverlay blendMode is a float index, not a string** — WebcamOverlay.tsx:45, 318 maps `Math.floor(blendIdx)` into `BLEND_MODES` array (line 38). DDFS uses float for serialization; UI/CSS gets the string.
- **DebugToolsOverlay only mounts the state debugger** — debug_tools/DebugToolsOverlay.tsx:11–17 lazy-loads `StateDebugger`. Comment at lines 6–8: "ShaderDebugger was fractal-specific (raymarching introspection)" — the `shaderDebuggerOpen` param (debug_tools/index.ts:24) is declared but no UI consumes it in this subsystem.

## Invariants and gotchas

- **`isolatedModules` requires `export type`** — engine/features/types.ts:1–7 + index.ts:29–30 cite CLAUDE.md. `index.ts:31–34` uses `export *` from feature index files; those feature indexes re-export only types + feature defs, so they're safe.
- **`setterName` is `set` + capitalize(id)** — setFeature.ts:56–57. Setters MUST be created by the engine store before any `setFeature` call, else dev warning at line 67.
- **`AudioFeature` is wired to `useEngineStore` via the conventional setter** (`setAudio`) — AudioPanel.tsx:229 destructures it. The feature file does not declare custom actions; the setter comes from the engine's default DDFS-generated setter.
- **`ModulationFeature` is the only generic feature with custom actions** — modulation/index.ts:43–48, 60–101. `types.ts:29` accordingly extends only `ModulationActions`.
- **Modulation `rules` + `selectedRuleId` are declared as `complex` `hidden` params** for URL-shortening/persistence even though they live in `state` (modulation/index.ts:103–107). Pattern: state for runtime, params block for the persistence pass.
- **`AudioFeature` and `ModulationFeature` are coupled at the panel layer** — AudioPanel.tsx imports `useEngineStore().modulation` directly (lines 132), and `AudioLinkControls` is shared between sources (audio + LFO). Removing modulation would break the audio panel.
- **`AudioLinkControls` writes via `(store as any).updateModulation`** — AudioLinkControls.tsx:18 — DDFS payload is `{ id, update }` per modulation/index.ts:94. Other panels (AudioSpectrum.tsx:21, AudioPanel.tsx:134) repeat the same untyped cast — there's no typed accessor for custom actions in this subsystem.
- **`audioAnalysisEngine.init()` is idempotent and called lazily** — AudioAnalysisEngine.ts:62 short-circuits on second call. Every public entry point (`connectMicrophone`, `connectSystemAudio`, `loadTrack`) calls it first.
- **Loading a track disables the mic** — AudioAnalysisEngine.ts:145–149. There's no reciprocal "loading mic stops decks"; mic only pauses decks (line 96).
- **Mic does NOT route to destination** — AudioAnalysisEngine.ts:104–107 explicit comment: "Better: Mic -> Analyser. NOT to Destination." prevents feedback. System audio is opposite (line 130).
- **`modulationEngine.offsets` is cleared externally** — ModulationEngine.ts:106 comment: "offsets buffer is cleared by AnimationSystem before calling this". `resetOffsets()` exists (line 165) and `applyModulationsAt` calls it (applyAt.ts:23), but inside `update()` itself there's no clear — `accumulate` semantics matter when same target is targeted twice.
- **LFO sample-at-`time/period`** — ModulationEngine.ts:59 — period larger = slower noise. Sine et al. similarly use `(time / period + phase) % 1` (line 40). Phase is unit-period (0..1), not radians.
- **WebcamOverlay starts/stops the `getUserMedia` stream on `isEnabled` toggle** — WebcamOverlay.tsx:69–145. Mount-effect chain depends on `isEnabled` only; param changes inside the effect are NOT re-applied via cleanup, but `loop` callback (lines 147–209) re-renders on dep changes (line 209).
- **WebcamOverlay error-state word-wrap is dead code** — WebcamOverlay.tsx:194–200: `words`, `line`, `y`, `lineHeight` are computed but `ctx.fillText(errorMsg, width/2, height/2)` uses the unwrapped string.
- **DebugToolsOverlay's `shaderDebuggerOpen` param has no consumer in this subsystem** — debug_tools/index.ts:24 + DebugToolsOverlay.tsx only renders `StateDebugger` (line 14). The GLSL debugger menu item (debug_tools/index.ts:20) toggles a state slot that nothing here reads.
- **`PostEffectsFeature.postShader` declares `uniform sampler2D uBloomTexture;`** — post_effects.ts:73 — texture binding is the responsibility of the worker-side BloomPass mentioned at post_effects.ts:110. This subsystem does not bind it.
- **`ColorGradingFeature.toneMapping` is declared as `float` with `options`** — color_grading.ts:36–52 — the dropdown maps labels to float values for the shader uniform `uToneMapping`. Other generic features with `options` (webcam blendMode) use the same pattern.

## Drift from existing doc

No existing doc — skip.

## Open questions

- The actual implementations of `toneMapping`, `applyColorGrading`'s post-process pipeline integration, and `uBloomTexture` binding live outside this directory (referenced as "BloomPass in worker" at post_effects.ts:110 but the worker code is not in this audit's scope). Where these are wired is unclear from the files audited.
- `featureRegistry.register` (from `engine/FeatureSystem`) — the actual registry shape, FeatureDefinition interface details (`tabConfig`, `menuConfig`, `menuItems`, `viewportConfig`, `customUI`, `postShader`, `state`, `actions`, `params`, `condition`), and `componentRegistry` are outside scope. ParamType, ParamConfig, FeatureDefinition signatures are imported here (setFeature.ts:22, post_effects.ts:2 etc.) but not defined.
- `useEngineStore` shape, `setLiveModulations`, `lfosEnabled`, default DDFS setter generation, `liveModulations` slice — referenced from applyAt.ts:16, 29 and ModulationEngine.ts but defined in `store/engineStore` outside scope.
- `AnimationParams` (imported at ModulationEngine.ts:5) and `AnimationSystem` (referenced in comments at ModulationEngine.ts:69, 106) — animation subsystem ownership of `offsets` clearing and base-value composition is outside scope.
- `componentRegistry`, `ComponentRegistry.FeatureComponentProps` (referenced at AudioLinkControls.tsx:8, DebugToolsOverlay.tsx:3, WebcamOverlay.tsx:3, ui.tsx:10) — UI dispatch shape outside scope.
- `injectEngineStyles` (ui.tsx:12, 44) — Tailwind CDN integration mechanism outside scope.
- `helpUtils.collectHelpIds`, `types/help.ContextMenuItem`, `openContextMenu` (used by AudioPanel.tsx:7, 238–245 and AudioSpectrum.tsx:7, 14, 383–392) — help/context-menu plumbing outside scope.
- Shared component imports (`Knob`, `Slider`, `DotToggle`, `CollapsibleSection`, `ParameterSelector`, `SectionLabel`, `StateDebugger`, `AutoFeaturePanel`, `Icons`) — outside scope.
- `AudioPanel`'s 100-ms poll of `audioAnalysisEngine.getTrackInfo` (AudioPanel.tsx:23–31) is not a documented anti-pattern but contradicts the event-driven design of `waitForMetadata` — unclear whether intentional or due to lack of `timeupdate` plumbing.
- Whether downstream `app-gmt`, `demo`, `fluid-toy`, or future GMT-raymarching plugins ever call `defineFeature` instead of `: FeatureDefinition` — not visible from this subsystem alone.
- `state[selectedRuleId]` and `state.modulation.rules` access via `(store as any)` casts throughout the audio UI — there's no typed accessor like `setFeature` for custom feature actions; whether `setFeature.ts` is intended to grow `callAction(feature, action, payload)` typing is unclear.
