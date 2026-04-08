# GMT Compile-Time Settings: Problem Briefing

This document describes a real-time 3D fractal renderer web app (React + TypeScript + Zustand + Three.js + GLSL shaders). It has a fundamental UX and architecture problem around its compile-time shader settings. Your job is to read this briefing and propose a fresh solution. Do NOT read any other plan files in the repo — work only from what's here.

---

## What the App Does

Users explore and render 3D fractals in the browser. The rendering is done via raymarching shaders on the GPU. The app has two kinds of settings:

- **Runtime params** (uniform-backed): Change instantly. Sliders for color, intensity, camera, etc. User adjusts, sees result immediately.
- **Compile-time params**: Changing any of these requires a full GLSL shader recompilation. The shader is regenerated from scratch and compiled on the GPU. This takes **3-17+ seconds** depending on how many features are enabled, during which the app is completely frozen.

The app uses a **Data-Driven Feature System (DDFS)** where features self-describe their params, UI, and shader injection. Each param declares `onUpdate: 'compile'` or `'uniform'` (default). Features include: lighting, shadows, ambient occlusion, reflections, atmosphere/glow, geometry modifiers, water plane, volumetric scattering, coloring, quality/precision, and more.

---

## The Complete Compile-Time Parameter Inventory

Every param below requires a shader recompile when changed. They are currently all presented in one flat "Engine Panel" UI with a pending/apply batching pattern (user queues changes, clicks "Apply" once, pays the compile cost once).

### Hardware / Precision (set-and-forget, device-dependent)

| Param | Feature | What it does | Values |
|-------|---------|-------------|--------|
| `precisionMode` | quality | Ray epsilon thresholds — mobile GPUs need Standard | 0=High (Desktop), 1=Standard (Mobile) |
| `bufferPrecision` | quality | Render target bit depth — some GPUs don't support Float32 | 0=Float32, 1=HalfFloat16 |
| `compilerHardCap` | quality | MAX_HARD_ITERATIONS #define — safety loop limit | 64-2000 (default 500) |

These describe **what the GPU can handle**. A mobile GPU needs HalfFloat16 and Standard precision regardless of creative intent. A desktop user sets these once and never touches them. They currently sit next to shadow algorithms and box fold toggles in the same panel.

### Subsystem Gates (enable/disable entire rendering subsystems)

| Param | Feature | What it does | Compile cost | What it adds visually |
|-------|---------|-------------|-------------|----------------------|
| `shadowsCompile` | lighting | Master shadow toggle — compiles entire shadow raymarching loop | ~1500ms | Shadows appear under/behind geometry |
| `ptEnabled` | lighting | Path tracing core — adds GI, caustics, soft everything | ~1500ms | Physically-based global illumination |
| `aoEnabled` | ao | Ambient occlusion — darkens crevices and corners | ~200ms | Depth/contact darkening in crevices |
| `glowEnabled` | atmosphere | Volumetric glow around the fractal | varies | Ethereal glow halo effect |
| `reflectionMode` | reflections | Off / Env Map / Raymarched | 0-7500ms | Mirror-like surface reflections |

These are **workflow-level decisions** — "am I exploring (fast, no shadows) or rendering (full quality)?" Toggling shadows on is a 1500ms compile cost decision. Toggling path tracing is a 1500ms one. These are about *what kind of work the user is doing right now*.

### Quality Tuning (how good an already-enabled subsystem looks)

| Param | Feature | What it does | Values | Compile cost |
|-------|---------|-------------|--------|-------------|
| `shadowAlgorithm` | lighting | Shadow softness algorithm | 0=Robust Soft (~3000ms), 1=Lite Soft (~1500ms), 2=Hard (~500ms) | 500-3000ms |
| `specularModel` | lighting | Surface highlight model | 0=Blinn-Phong, 1=Cook-Torrance (~400ms) | 0-400ms |
| `aoMaxSamples` | ao | AO sample cap | 16-256 | minimal |
| `aoStochasticCp` | ao | High-quality stochastic AO noise | boolean | minimal |
| `glowQuality` | atmosphere | Glow computation method | 0=Accurate, 1=Fast | varies |
| `bounceShadows` | reflections | Shadows in reflections | boolean (only when raymarched) | ~4500ms |
| `bounces` | reflections | Reflection bounce count | 1-3 | varies |
| `estimator` | quality | Distance estimation algorithm | Log/Linear/Pseudo/Dampened | minimal |
| `ptNEEAllLights` | lighting | Next Event Estimation for all lights (PT only) | boolean | varies |
| `ptEnvNEE` | lighting | Environment map NEE (PT only) | boolean | varies |

These tune **how well** an already-compiled feature performs. Shadow algorithm only matters if shadows are compiled. Bounce shadows only matter if reflections are raymarched. Some are only visible/relevant in specific modes (PT params only matter when PT is enabled).

**Important quirk:** `shadowAlgorithm` is inverted — 0.0=Robust (most expensive), 2.0=Hard (cheapest). Most other params follow "higher = more expensive."

### Creative Capabilities (change what the scene looks like, not how well it renders)

| Param | Feature | What it does | Compile cost |
|-------|---------|-------------|-------------|
| `hybridCompiled` | geometry | Enable hybrid box fold geometry — creates entirely different fractal shapes | ~1200ms |
| `hybridFoldType` | geometry | Which fold algorithm (Menger, Sierpinski, etc.) | ~400ms per type |
| `hybridComplex` | geometry | Complex-plane hybrid iteration | ~1500ms |
| `hybridPermute` | geometry | 6-axis permutation of fold | varies |
| `hybridSwap` | geometry | Swap fold order | varies |
| `preRotMaster` | geometry | Enable pre-rotation transforms | ~600ms |
| `waterEnabled` | water_plane | Add reflective water ground plane | varies |
| `ptVolumetric` | volumetric | Volumetric light scattering | ~5500ms |
| `ptStochasticShadows` | lighting | Area light soft shadows (qualitatively different look) | ~800ms |
| `lightSpheres` | lighting | Visible emissive light spheres in scene | varies |

These add **new visual possibilities**. Enabling box fold creates entirely different geometry. Water plane adds a reflective ground. These are creative decisions that happen to cost compile time. They are conceptually part of the formula/scene, not "engine settings." A user exploring in "fast mode" might still want box fold — it's their creative vision.

### Profile Presets (the four built-in quality bundles)

| Profile | Shadows | AO | Reflections | PT | Precision | Est. Compile |
|---------|---------|----|-----------|----|-----------|-------------|
| **Fastest** | Off | Off | Off | Off | Standard/Half | ~3-4s |
| **Lite** | Hard only | Basic | Env Map | Off | Standard/Half | ~5-6s |
| **Balanced** | Robust Soft | Stochastic | Env Map | Off | High/Float32 | ~7-8s |
| **Ultra** | Robust+Area | Stochastic | Raymarched+Bounce | Yes | High/Float32 | ~17s+ |

Selecting a profile **destructively overwrites** all its params in the Zustand store. If a user carefully tuned shadow settings for a specific scene and switches to "Lite" for faster iteration, those values are gone. Switching back to "Ultra" applies Ultra's generic values, not the scene's original authored values. There is no undo, no restore, no memory of the previous state.

---

## How State Flows (Architecture)

```
User changes param in UI
    |
    v
AutoFeaturePanel detects onUpdate:'compile'
    |
    v
Emits 'engine_queue' event --> Opens Engine Panel
    |
    v
EnginePanel stores in pendingChanges (local React state)
    |
    v
User clicks "Apply" --> Calls store setters for all pending params
    |
    v
createFeatureSlice setter emits FractalEvents.CONFIG
    |
    v
getShaderConfigFromState(store) extracts full config
    |  (currently a pure 1:1 copy — zero transformation/filtering)
    v
CONFIG message sent to Web Worker
    |
    v
ConfigManager.update() diffs against previous config
    |  (checks each param's onUpdate field)
    v
If any compile param changed: ShaderFactory.generateFragmentShader(config)
    |
    v
Each feature's inject() reads config, calls ShaderBuilder methods
    |
    v
Complete GLSL string assembled --> GPU compiles --> App unfreezes
```

Key facts:
- `getShaderConfigFromState()` is the **single funnel** — every path (boot, loadScene, CONFIG events) goes through it.
- It currently does **zero transformation** — copies every feature slice as-is into ShaderConfig.
- The store always holds the actual values the user has set or the preset loaded.
- `getPreset()` reads the store directly for save/export (uncapped, unfiltered).
- GMF save files store full scene state including all compile-time values.

### The Batching Rationale

Compile-time params live in the Engine Panel specifically so users can **batch multiple changes and pay the compile cost once**. The pending/apply pattern means: toggle shadows on, change shadow algorithm, enable AO, adjust AO samples — four changes, one 8-second compile instead of four separate compiles totaling 20+ seconds. This is a genuinely important UX benefit that any solution must preserve.

### Mobile Startup Hack

Mobile detection (`pointer: coarse` or `innerWidth < 768`) happens in `useAppStartup`. When detected, the Lite profile is **force-merged into the preset** before `loadScene()`:

```
Object.entries(ENGINE_PROFILES.lite).forEach(([featureId, params]) => {
    Object.assign(preset.features[featureId], params);
});
```

This means:
- Mobile always gets Lite's exact values even if the formula's preset was tuned for mobile
- The merge destroys the preset's intended quality values before the store even sees them
- There's no way for a mobile user to opt into higher quality
- Loading a scene mid-session on mobile bypasses this check entirely

### Existing Inline Compile Pattern

One feature already handles compile-time params inline in its own panel: **Volumetric**. It uses `CompilableFeatureSection` with a `panelConfig`:
- `compileParam: 'ptVolumetric'` (compile gate)
- `runtimeToggleParam: 'volEnabled'` (instant on/off uniform)
- Runtime params (density, anisotropy) shown only when compiled

This pattern works well but is underadopted. Most compile-time features still route through the Engine Panel via `engine_queue`.

---

## User Pain Points (From Persona Research)

### The New User (Creative Hobbyist)

She comes from Procreate and Canva. Every toggle in her world is instant. She opens the Engine Panel and sees a wall of toggles with labels like "Stochastic AO," "Hard Loop Cap: 500," "Estimator: Analytic (Log)," and "Ray Precision: High (Desktop)." She can't distinguish hardware constraints from creative tools from quality dials — the UI treats them identically.

She unchecks "Volumetric Glow." The dot turns amber and starts pulsing. The bottom shows "Pending" with an "Apply" button and "~6.2s." She doesn't understand why unchecking a checkbox didn't just uncheck it. She has never used software where toggling a setting requires a separate "Apply" step. She clicks Apply. The app freezes for 6 seconds. She thinks it crashed.

She switches profiles out of curiosity. Ultra takes 17 seconds. The app is completely frozen. She considers closing the tab.

### The Power User (Digital Artist / VJ)

He has two workflows: live performance (max FPS) and gallery prints (max quality). His actual live setup is somewhere between Fastest and Lite — none of the four profiles match. He can't save custom profiles.

Every context switch requires manually toggling 6-7 individual params (shadows, shadow algorithm, reflection mode, AO mode, precision, buffer precision, hard cap), then hitting Apply. That's 10-17 seconds of freeze plus the mental overhead of remembering all 6-7 changes. He does this switch 6-7 times per day.

If he selects "Ultra" and had manually tuned two params away from it for a specific print (e.g., disabled bounce shadows to avoid noise in this composition), Ultra overwrites that customization. There is no way to save "Live Set" or "Gallery Print" as custom profiles. The "Custom" label appears when settings deviate but can't be saved or recalled.

He appreciates the pending/apply batching — queuing up 6 changes and compiling once is better than 6 separate compiles. But he wishes he could save the queued state as a named profile.

### The Mobile User (Curious Visitor)

She opened a link her friend shared. The app detected her phone and force-merged the Lite profile, silently destroying the scene's intended quality settings. She sees a degraded version — no raymarched reflections, simplified shadows — but there's no indication the scene was downgraded. The composition looks substantially different from what her friend intended.

The Path Tracing toggle is visible and available in the top bar. Tapping it will likely crash her GPU or render at 2 FPS. There's no warning, no hardware check, no confirmation dialog. The only guard is a tooltip saying "(Experimental)."

If she opens the Engine Panel on her phone, the 10px controls are cramped, slider targets conflict with scroll gestures, and the pending/apply concept is even more confusing on mobile than desktop.

---

## Cross-Domain Insights (Patterns That Work Elsewhere)

### Pattern: Geographic Separation by Concern
Almost every mature creative tool puts hardware config in Preferences/Settings (a separate modal), creative parameters inline in the workspace, and output/export on its own page. Three concerns, three locations.

### Pattern: Viewport Quality as Viewport Tool
DaVinci Resolve's proxy mode is a dropdown on the viewer itself (Off / Half / Quarter). It's treated like zoom — a transient viewport property, not a project setting. The project always has full quality; the viewport just shows a cheaper approximation. Status bar shows the current proxy level so you always know.

### Pattern: Per-Unit Bypass Without Removal
In every DAW, every effect has a bypass toggle that disables it instantly without removing it or losing its settings. Click bypass, effect is skipped. Click again, it's back with all its knobs untouched. Blender does this with modifier visibility toggles. Resolve does it with node enable/disable.

### Pattern: Dual-Field (Working / Final Side by Side)
Blender's Sampling section has two fields literally next to each other: "Viewport: 4" and "Render: 4096." Both values are always visible. No mode switching, no hidden state. You know exactly what you'll get in each context.

### Pattern: Progressive Disclosure Views (Same State, Different Lenses)
Hearing aid fitting software has three views of the same settings: Basic (2-3 sliders), Advanced (~10 params), Fine Tuning (30+ params). Not different panels or pages — different *zoom levels* on the same surface. The underlying state is identical; the UI just reveals more or less of it.

### Pattern: Preset + Per-Category Override with Tracking
Unreal Engine has independent quality levels per category (Shadows: Low/Med/High, Textures: Low/Med/High, etc.). A master preset sets all categories. You can override any category independently. The UI shows "High (custom: Shadows=Medium)" — the system remembers the relationship between the base preset and your overrides. You're never in a "Custom" dead end.

### Pattern: Workspaces (Parallel Complete States)
Bloomberg Terminal maintains multiple "workspaces" — each a full independent state snapshot. Switching workspaces doesn't apply a template to a shared surface; it swaps to a completely independent state. No destructive overwrites, no preset conflicts. Changes in one workspace don't affect others.

### Pattern: Profile-Defined Parameter Surfaces
The Decent espresso machine shows different parameters depending on which shot profile is selected. A "Classic" profile exposes grind compensation; a "Blooming" profile exposes bloom time. The profile determines which params exist, not just which are relevant.

### Pattern: Background Compilation
In many DAWs and video editors, expensive processing happens in the background while the user continues working. After Effects' RAM Preview renders cached frames while you can still edit. The timeline shows green bars for cached frames, yellow for "needs re-render." The user is never frozen out.

---

## Three Directional Constraints

These are the only directional hints for your solution:

1. **The store should always hold intended (full-quality) state.** Presets, saves, and exports should read uncapped values. Whatever filtering or reduction happens should be derived, not destructive.

2. **`getShaderConfigFromState()` is the right insertion point for any filtering.** It's the single funnel where all state flows to the engine. It currently does zero transformation. Any quality reduction, mode filtering, or proxy logic should happen here.

3. **Hardware settings need geographic separation from creative/quality controls.** Precision mode, buffer precision, and hard loop cap are device properties, not creative decisions. They should not sit next to shadow algorithms and box fold toggles.

---

## Your Task

Propose a concrete solution to the problems described above. Consider:
- How to organize the ~50 compile-time params so different user types can find what they need
- How to make workflow/context switching fast and non-destructive
- How to handle mobile gracefully without silent quality destruction
- How to preserve the batching benefit (change multiple params, compile once)
- How the solution maps to the existing DDFS architecture and `getShaderConfigFromState()` funnel
- What the user actually sees and interacts with in the UI

Be specific about data structures, UI layout, and interaction flows. Ground your proposal in the architecture and constraints described here.
