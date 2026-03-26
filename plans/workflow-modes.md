# Workflow Modes — Design Document

## The Problems We're Solving

### Problem 1: Four different concerns share one UI surface

The Engine Panel currently presents ~20 compile-time parameters in a flat list. But these parameters serve fundamentally different purposes:

- **Hardware capability** (`precisionMode`, `bufferPrecision`, `compilerHardCap`) — these describe what the GPU can handle. A mobile user doesn't toggle these per-session; they're set once based on the device. Yet they sit alongside creative and quality knobs in the same panel.

- **Workflow intent** (`ptEnabled`, `shadowsCompile`, `aoEnabled`) — these master gates determine whether entire subsystems exist in the shader. Toggling "AO on" is a 200ms compile cost decision. Toggling "Path Tracing on" is a 1500ms one. These are decisions about *what kind of work the user is doing right now* (exploring vs final render), not fine-tuning.

- **Creative tools** (`hybridCompiled`, `waterEnabled`, `ptVolumetric`) — these add new visual possibilities to the fractal. Box fold creates entirely new geometry. Water plane adds a reflective ground. These are creative decisions that happen to cost compile time. They're conceptually part of the formula/scene, not the "engine."

- **Quality dials** (`shadowAlgorithm`, `specularModel`, `aoMaxSamples`) — these tune how good an already-compiled feature looks. They're the "how much" knobs within a subsystem that's already "on."

**Why this matters:** A new user opens the Engine Panel and sees a wall of toggles. They don't know that "Hard Loop Cap" is a hardware setting they'll never touch, "AO Enabled" is a workflow choice they'd change based on what they're doing, "Hybrid Box Fold" is a creative tool that changes what their fractal looks like, and "Shadow Algorithm" is a quality dial within an already-enabled system. The UI treats all four as the same kind of thing.

### Problem 2: Profiles are destructive

The current `ENGINE_PROFILES` (Fastest/Lite/Balanced/Ultra) work by **mutating store state** directly. When you select "Lite," the `applyPreset` action calls `setLighting(params)`, `setAo(params)`, etc., overwriting the DDFS slices with the profile's values.

**What this breaks:** If a user loads a carefully-authored scene with Robust shadows and raymarched reflections, then switches to "Lite" for faster iteration, those quality values are destroyed. Switching back to "Ultra" doesn't restore the original scene — it applies Ultra's generic values, not the scene's authored values.

This is why the current profiles feel like a blunt instrument. Users are reluctant to switch profiles because they lose their scene-specific tuning.

### Problem 3: Mobile is a hack

Mobile detection currently works by force-merging the `lite` profile into the preset during `useAppStartup` (lines 91-101). This means:

- Mobile always gets Lite's exact values, even if the formula's default preset was tuned for mobile.
- The merge happens before `loadScene`, so the preset's intended quality values are destroyed before the store even sees them.
- There's no way for a mobile user to opt into higher quality — the hack is unconditional.

The real mobile concern is two things: (a) the GPU can't handle Float32/High precision (hardware), and (b) the user probably wants faster iteration on a small screen (workflow). These are two separate concerns jammed into one profile merge.

### Problem 4: Compile-time creative features are buried in the engine

Box fold, water plane, volumetric scatter, and area lights are creative choices. They change *what the scene looks like*, not *how well it renders*. But they live in the Engine Panel because they require shader recompilation.

The current routing reinforces this: when you toggle a compile-time param in any feature panel, `AutoFeaturePanel` (line 167-171) intercepts it, opens the Engine Panel, and queues the change there via `engine_queue`. The user is forced out of their creative context into the engine settings, breaking their flow.

The `CompilableFeatureSection` component already solves this for Volumetric — it renders an inline compile bar in the feature's own panel. But most compile-time creative features don't use this pattern. They fall through to the `engine_queue` catchall.

### Problem 5: The compile time gap needs bridging for different use cases

A user doing audio-reactive modulation needs maximum FPS — every compiled feature costs frames. A user composing a scene needs decent visuals without 15-second recompiles after every tweak. A user doing a final render wants every quality feature enabled.

Currently, users manually toggle individual features to manage this tradeoff. There's no way to say "I'm exploring right now, give me speed" and later "I'm done composing, give me full quality" without manually remembering and re-enabling a dozen settings.

---

## Design Principles (drawn from industry patterns)

**Apple (iPhone Camera):** Hide the mechanism, expose the intent. Users pick Photo/Portrait/Cinematic, not "enable depth estimation pipeline." Each mode compiles a different processing pipeline. The user never sees the implementation.

**Adobe (Premiere):** Progressive disclosure. Top-level quality dropdown, wrench icon for details. Playback quality and export quality are separate concerns.

**Maxon (C4D/Redshift):** Hierarchical render settings. Pick renderer, then quality tier within that renderer, then per-subsystem overrides. Tiers are relative to the engine, not absolute.

**Game engines (Unreal):** Scalability settings per feature. Hardware auto-detected into a tier. Each feature has its own quality axis (Shadow Quality: Low/Med/High). The user sees "High" and trusts it.

**The pattern across all of them:** Progressive disclosure with 2-3 levels. Top level: one big choice. Second level: quality preset within that choice. Third level: individual overrides for power users.

---

## The Four-Layer Model

The core insight is that compile-time parameters fall into four independent concerns. Rather than being properties of features, these layers are **properties of individual params** — a single feature like Lighting spans all four layers.

### Layer 1 — Hardware Tier

**Problem it solves:** Separating "what can this GPU handle" from "what does this user want."

**Params:** `precisionMode`, `bufferPrecision`, `compilerHardCap`

**Why these three:** They all require recompile when changed, but compile time is constant regardless of value (empirically verified — tested `compilerHardCap` from 10 to 10000, compile time stayed at ~4.9s). They describe GPU capability, not visual intent. A mobile GPU needs HalfFloat16 and Standard precision regardless of what the user is rendering. The hard cap limits iterations for performance, not quality — a user on weak hardware needs fewer iterations even in "Render" mode.

**Where it lives:** Settings/Preferences. Auto-detected at startup. User can override. Not in the main workflow — you set this once and forget it.

**Why this replaces the mobile hack:** Instead of force-merging the `lite` profile into presets (which destroys intended values), mobile sets hardware tier to `mobile` (HalfFloat16, Standard precision, cap 128) and workflow mode to Explore. Two clean, independent decisions instead of one destructive merge.

### Layer 2 — Workflow Mode

**Problem it solves:** Giving users a single control to manage the "speed vs quality" tradeoff without destroying their scene's intended quality.

**How it works — ceilings, not absolutes:** This is the key design decision. A mode defines the *maximum* quality level for each subsystem. If a preset was authored with Hard shadows (cheap), switching to Create mode (which allows up to Lite Soft) doesn't force the shadows to Lite Soft — it keeps Hard because Hard is already below the ceiling. The ceiling only prevents expensive options the user doesn't want during their current workflow.

**Why ceilings instead of absolutes:** This is what makes mode switches non-destructive. The store always holds the intended (full-quality) values from the preset. The mode just filters what reaches the shader. Switching from Explore to Render reveals the preset's full quality without reloading anything. This solves Problem 2 (profiles are destructive).

**Why three modes:**
- **Explore** (~3-4s compile): Maximum FPS for navigation, audio modulation, discovery. No shadows, AO, glow, or PT. The fractal itself renders beautifully; you just skip expensive lighting/post.
- **Create** (~7-8s compile): The everyday composing mode. Soft shadows, basic AO, env-map reflections, glow. Good enough to evaluate a scene's look without the full compile cost.
- **Render** (~15s+ compile): No ceilings. Full quality from the preset passes through. Path tracing available. For final stills and exports.

**Where it lives:** TopBar (RenderTools area), as a segmented control next to existing render controls. Promoted out of the Engine Panel because it's the highest-leverage control — one click changes the entire shader's feature set.

**Why mode switches compile immediately:** Switching from Explore to Create is an intentional, high-level decision. The user expects a recompile. Unlike L4 quality overrides (where you might tweak three settings before applying), a mode switch is a single atomic action.

### Layer 3 — Creative Capabilities

**Problem it solves:** Compile-time creative tools shouldn't be buried in engine settings (Problem 4).

**Which params:** `hybridCompiled`, `hybridFoldType`, `hybridComplex`, `hybridPermute`, `hybridSwap`, `preRotMaster`, `waterEnabled`, `ptVolumetric`, `ptStochasticShadows` (area lights).

**Why these are separate from Layer 2:** They add *new visual possibilities*, not quality levels. Enabling box fold creates entirely different geometry. Water plane adds a reflective ground. These are creative decisions about what the scene contains, not how well it renders. A user in Explore mode might still want box fold enabled — it's part of their creative vision, just with a faster shader around it.

**Where they live:** Inline in their feature panels (geometry panel for hybrid fold, atmosphere/scene panel for water, lighting panel for area lights). The `CompilableFeatureSection` component already handles this pattern for Volumetric — it renders an inline compile bar in context. This pattern needs to be extended to all L3 features.

**Mode interaction:** Creative capabilities are additive. They compile on top of whatever mode is active. The compile time estimate updates to reflect this (e.g., "Create + Volumetric: ~12.5s").

**Gray area — `ptStochasticShadows` and `reflectionMode >= RAYMARCH`:** These span creative and quality. Area lights produce a qualitatively different shadow look (not just "better shadows"). Raymarched reflections show actual scene reflections (not just an env map approximation). The binary "enabled/disabled" is a creative choice (L3); the quality knobs within (bounce count, shadow softness) are L4. This mirrors the volumetric pattern: the gate is creative, the density/anisotropy sliders are runtime quality.

### Layer 4 — Per-Feature Quality

**Problem it solves:** Power users need fine control within their current mode.

**Which params:** `shadowAlgorithm`, `specularModel`, `ptNEEAllLights`, `ptEnvNEE`, `aoMaxSamples`, `aoStochasticCp`, `reflectionMode` (as override), `bounceShadows`, `bounces`, `glowQuality`, `estimator`.

**Where they live:** Engine Panel, which simplifies to: mode selector at top, collapsible per-feature quality overrides below, compile status at bottom. These use the existing pending/apply pattern — the user may tweak several L4 params before compiling.

**Why the pending/apply pattern survives here but not for modes:** Mode switches are one-click atomic decisions. L4 overrides are incremental tweaking — you might adjust shadow algorithm, AO samples, and specular model before you're ready to compile. Compiling after each individual change would waste time. The pending/apply pattern lets users batch these changes.

**Conditional visibility:** PT-specific params (`ptNEEAllLights`, `ptEnvNEE`) only appear when PT is compiled (Render mode). Shadow quality params only appear when `shadowsCompile` is true. This prevents showing controls that have no effect.

**`estimator` (distance estimator):** Doesn't fit neatly in any layer — it's a formula-specific technical choice that affects surface quality. Lives in L4 as an advanced override.

---

## Architecture

### Core Principle: Store Holds Intended State

**Why this matters:** This is the single most important architectural decision. It's what makes mode switches non-destructive and presets portable.

The Zustand store always holds the **full-quality intended values**. Mode filtering happens at the `getShaderConfigFromState()` boundary — the single funnel where all feature state flows to the engine.

```
Store (intended)  -->  getShaderConfigFromState()  -->  mode ceiling filter  -->  ShaderConfig (effective)
                                                                                     |
getPreset() reads store directly (uncapped)                                   Worker receives effective config
GMF save reads store directly (uncapped)
URL share reads store directly (uncapped)
```

**Why `getShaderConfigFromState()` is the right insertion point:** It's already the single funnel. Every path that sends config to the worker reads through this function — boot, loadScene, CONFIG events from feature setters. Inserting the ceiling filter here means every path automatically becomes mode-aware without any per-path changes.

**What this breaks:** The current `applyPreset` action in `features/engine/index.ts` directly mutates DDFS slices. This bypasses the filter — it overwrites intended values with profile values. This action must be reworked or removed. Mode changes should only write to `workflowMode` state; the filter does the rest.

**Consequence for save/load:**
- GMF files save intended (uncapped) values. A scene saved in Create mode still contains its Robust shadow settings. Portable.
- URL shares don't encode mode. The recipient renders with their own mode. No risk of crashing a weak GPU with someone else's Render-mode link.
- Loading a preset in Explore mode stores the full quality, compiles with Explore ceilings. Switching to Render later reveals the full quality without reloading.

### DDFS Changes

Add a `tier` field to `ParamConfig` in `engine/FeatureSystem.ts`:

```typescript
tier?: 'hardware' | 'ceiling' | 'creative' | 'quality';
```

**Why on ParamConfig, not on the feature:** Most features span 2-3 layers. Lighting has hardware params (none currently), ceiling params (`ptEnabled`, `shadowsCompile`), creative params (`ptStochasticShadows`), and quality params (`shadowAlgorithm`, `specularModel`). The layer is a property of the param, not the feature.

**What this drives:**
- `AutoFeaturePanel` routing: `tier: 'creative'` compiles inline, `tier: 'quality'` routes to Engine Panel. Currently all compile params route to Engine Panel via `engine_queue` — this becomes tier-aware.
- Mode filtering: only `tier: 'ceiling'` params are capped by mode.
- UI visibility: `tier: 'quality'` params conditionally shown based on their parent gate's compiled state.

### Mode Ceiling Data Structure

```typescript
export const MODE_CEILINGS = {
    explore: {
        lighting: { shadowsCompile: false, ptEnabled: false, specularModel: 0.0 },
        ao: { aoEnabled: false },
        atmosphere: { glowEnabled: false },
        reflections: { reflectionMode: 0.0, bounceShadows: false },
        coloring: { layer3Enabled: false },
    },
    create: {
        lighting: { shadowsCompile: true, shadowAlgorithm: 1.0, ptEnabled: false, specularModel: 0.0 },
        ao: { aoEnabled: true, aoStochasticCp: false, aoMaxSamples: 16 },
        atmosphere: { glowEnabled: true, glowQuality: 1.0 },
        reflections: { reflectionMode: 1.0, bounceShadows: false },
        coloring: { layer3Enabled: true },
    },
    render: {
        // No ceilings — full intended state passes through
    },
};
```

### Ceiling Direction Problem

Most params follow "higher = more expensive," so `Math.min(intended, ceiling)` caps correctly. But `shadowAlgorithm` is inverted: 0.0 = Robust (expensive), 2.0 = Hard (cheap).

**Options:**
1. Add `costDirection: 'ascending' | 'descending'` to ParamConfig. Filter checks direction.
2. Define ceiling values as `{ max: number }` or `{ min: number }` to make direction explicit.
3. Normalize the inverted params so all params follow "higher = more expensive." This would mean changing `shadowAlgorithm` values everywhere — too invasive.
4. Just hard-code the comparison per-param in the ceiling filter. Simple but not data-driven.

This needs a decision before implementation.

---

## Implementation Phases

Each phase is independently shippable and testable.

### Phase 1 — Store Infrastructure (no UI changes)

Add `tier` to `ParamConfig`. Annotate all compile-time params. Add `MODE_CEILINGS`. Add `workflowMode` state. Nothing reads it yet — all existing behavior unchanged.

### Phase 2 — Filtering Layer (engine integration, no UI)

Modify `getShaderConfigFromState()` to apply mode ceilings. Verify `getPreset()` returns uncapped values. Strip `workflowMode` from URL shares.

**Test:** Set `workflowMode` via dev tools. Verify compile features match mode. Verify save/load preserves intended values.

### Phase 3 — Startup Integration

Replace mobile lite-profile hack with hardware tier + mode defaults. Replace LoadingScreen "Lite Render" toggle with Explore/Create picker.

### Phase 4 — Mode Strip UI

Segmented control in RenderTools. Compile time estimates per mode. Mobile dropdown in SystemMenu.

### Phase 5 — Engine Panel Simplification

Mode selector at top, L4 overrides below, compile status at bottom. Tier-aware routing in AutoFeaturePanel. Mode-aware gating in CompilableFeatureSection.

### Phase 6 — Creative Capabilities Relocation

L3 features compile inline via CompilableFeatureSection in their own panels. No Engine Panel routing.

### Phase 7 — Cleanup

Deprecate `applyPreset` mutation. Keep `ENGINE_PROFILES` as reference data. Update docs.

---

## Open Questions

1. **Ceiling direction:** How to handle `shadowAlgorithm` (0.0 = expensive, 2.0 = cheap)? Needs a `costDirection` hint or alternative approach. See options above. perhaps to direct testing on the feature's exact cost.

2. **Mode defaults:** Create for desktop, Explore for mobile? Should mode default be configurable in Settings? Or should mobile just be about ocmpatibility and getting it to run?

3. **Mode persistence:** localStorage across sessions? The user's preference probably shouldn't reset each visit. This is important for future work too.

4. **Animation/export:** Should video export auto-elevate to Render mode? The export system already has its own quality settings — may need mode awareness. - no each mode has its own aesthetic and the user want to get what they see. The name 'Render mode' may be confusing. However render mode may needs it own refinement, like a fixed (not filled) canvas size.

5. **Custom indicator:** When L4 overrides deviate from mode defaults, show "Custom (Create)" where? Mode strip should stay clean — probably Engine Panel only.

6. **PT toggle fate:** Currently standalone in RenderTools. With modes, PT only compiles in Render. Options: (a) hide in Explore/Create, (b) clicking it switches to Render mode. Option (b) is more discoverable. Also questionable since its a creative tool that looks very different and happens to run very slowly.

7. **Interaction with `lockSceneOnSwitch`:** When switching formulas with scene lock on, the locked scene retains its intended values. Mode continues to filter at the boundary. Should work cleanly, but needs verification. 

8. **`renderMode` (Direct vs PT):** This is orthogonal to workflow mode — it's which compiled renderer is *active*, not which is *available*. Each mode defines whether PT is compiled; the `renderMode` toggle switches between Direct and PT when both are compiled. In Explore/Create (PT not compiled), the toggle is hidden or shows "PT unavailable — switch to Render mode." - more confusion around this render mode idea.

Notes:
We still need a 'preview' mode for near instant compile times  - all the  other modes cost 4s or more to compile.