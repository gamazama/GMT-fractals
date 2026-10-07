# Which of GMT's systems must be reworked for the deep zoomer

Architect pass, 2026-10-07. Read-only; nothing was built, run or put on the GPU. Built from the nine
reader maps in `gmt-systems/` (navigation-core, navigation-gmt, light-studio, gmt-shading-chunks,
renderer-side, camera-systems, colour-formula-quality, render-export-anim, sweep) plus `BLUEPRINT.md`
(headings and the plugin table only), `BUILD-PLAN.md` (in full), and one file I opened myself:
`engine-gmt/engine/controllers/CameraController.ts`, `update`. Every code fact below is cited to the
reader that opened the file; where no reader opened it, it says **unverified**. Symbols are the
locators, not line numbers. Sizes are sessions (a focused few hours with its guard run) or days.

**Corrected 2026-10-07 after three skeptic reviews** (`gmt-systems/critic-navigation.md`,
`critic-lighting.md`, `critic-gmt-regression.md`). I checked each finding by grep in
`CameraController.ts`, `usePhysicsProbe.ts`, `useInputController.ts`, `Navigation.tsx`,
`WorkerProxy.ts`, `UniformManager.ts`, `lighting/pbr.ts`, `lighting/shading.ts`, `lighting/env.ts`,
`features/reflections/index.ts`, `LightControls.tsx`, `LightPanelControls.tsx`, `SingleLightGizmo.tsx`,
`renderer/bindings.ts`, `exportRunner.ts`, `engine-gmt/topbar.tsx`, `fluid-toy/main.tsx`, `debug/*.mts`
and the page's fly loop. What changed: the distance-source step left Stage N; the yaw/pitch adapter
is now specified; Alt does not slow flying; the light length unit is no longer stored per light;
`frame` is stored only for its third value; light packing takes modulation; the Light Studio and
route B sizes went up; section 6a lists every saved-data migration; section 10 lists the findings
not taken.

Verdict words: **AS-IS** (use unchanged) / **ADAPTER** (code in `deep-zoom/` or its renderer module
only; GMT untouched) / **REWORK** (the GMT or engine system itself changes, generically) /
**NOT-NOW** (does not apply to a Mandelbulb-only deep zoomer yet).

---

## 1. The answer in ten lines

1. **Navigation must be reworked, and the rework is small because the hard part is already right.**
   GMT's fly code never reads the camera position; it emits a displacement (three doubles) and takes
   a surface distance (one double). Doubles hold a 1e-77 *step* exactly; they cannot hold a 1e-77
   *position*. So the renderer stays the position authority and GMT's navigation drives it.
2. What changes in navigation: the fly integrator and the key/drag/wheel hook move from
   `engine-gmt/` into `engine/plugins/navigation/` with their GMT wiring passed in (a displacement
   sink, speed floors and the wheel step as settings). The distance already arrives as a plain
   argument (`settings.distEstimate`), so GMT's distance probe is NOT touched now. About 3 sessions
   of engine and GMT work (half of it guards that do not exist yet), 1 in the renderer module, 1.75
   of shell glue. GMT's defaults stay today's numbers. Looking around will not feel identical to
   either app: the shell levels the horizon every frame (3.2 d).
3. **`VirtualSpace` is not reworked.** It is good to 1e-16; package F8 would reach 1e-32; the deep
   zoomer needs 1e-77. F8 is not a prerequisite and stays out of this job. No saved `sceneOffset` changes.
4. **The Light Studio must be reworked, and it is the larger job.** Three things in GMT's own code:
   the light record needs a third attachment mode (Surface), with lengths scaled by a unit the
   renderer declares rather than one stored on the light; the Light Studio components must stop
   importing GMT's worker at module scope; the light list must be separable from GMT's shader
   injection. About 7 to 9.5 sessions in GMT (was 4.5 to 6: seven conversion sites not five,
   modulation in the packing, guards that must be written first), 1.5 in the renderer module,
   2 to 2.5 in the shell. GMT users see no change: the third mode is not shown where the renderer
   does not offer it, and no saved GMT scene gains or changes a field.
5. The deep zoomer's shading pass is then driven by GMT's light list in two steps: first a mapping
   layer onto an N-light loop in the module (GMT untouched beyond line 4), later GMT's own shading
   chunks through a surface-inputs entry point with depth-buffer shadow and occlusion providers
   (7.5 to 9.5 sessions in all, was 6 to 6.5: the shading half also carries the miss handler, fog,
   the environment sampler and a uniform feed; plus a compile-time and picture A/B).
6. Shadows will not match: GMT marches a ray per light; the deep zoomer walks its depth buffer and
   sees only what is in the picture. The shell names its own shadow controls and does not borrow GMT's.
7. **Orbit mode, cursor-anchored zoom, light gizmos, depth of field, Camera Manager's directional
   views: NOT-NOW.** Orbit at depth is a 4 to 6 day rework of GMT's most-tuned file; the page has no orbit.
8. Other reworks worth doing, all small and generic: a post-process stack any renderer can run
   (bloom, tone map, levels; 2 to 4 days), mapping modes that declare what they read (1 session),
   the bucket-render status bridge (half a day), GPU-failure overlays in the engine (1 day),
   camera-undo and FBX frame-source providers (1 session each).
9. Everything else is AS-IS or ADAPTER: saved places, timeline, render dialog, pause and sample
   counter, gradient editor, undo, help, tutorial, scene files.
10. The shell does not wait: it flies on the page's own loop and lights with the blueprint's plain
    sliders until each rework lands, and each interim is recorded as a debt with the package that removes it.

---

## 2. Every system

Where a row says "module" it means `deep-zoom/renderer/` (the port; it may change, the historical page may not).

### 2.1 Navigation and camera

| System | Where it lives | Assumes today | Verdict | The rework, one line | Size | When |
|---|---|---|---|---|---|---|
| Position store | `engine/plugins/navigation/core/VirtualSpace.ts` (`normalize`, `move`, `updateShaderUniforms`) | Six doubles, collapsed to one double before the shader: about 1e-16 | **ADAPTER** (not used) | None. The module keeps its 256-bit position; the shell never creates a `VirtualSpace` | 0 | - |
| Fly integrator | `engine-gmt/engine/controllers/CameraController.ts`, `update` | Emits `'offset_shift'` on GMT's bus; speed floors `1e-6` and (Shift) `1e-4`; turns with `camera.rotateX/Y/Z` (the camera's own axes, so roll builds up from yaw alone) | **REWORK** | Move to `engine/plugins/navigation/`; displacement goes to a sink passed in; the two floors become settings whose defaults are today's. No roll setting: the shell levels the camera itself (3.2 d) | 1.25 sessions with a replay test | Stage N (after shell stage 2) |
| Distance into navigation | `engine-gmt/navigation/usePhysicsProbe.ts`, `engine.lastMeasuredDistance` (about 15 readers) | One global on GMT's worker proxy; centre-ray depth; floors `1e-4`; half-float read-back cannot go below about 6e-8 | **ADAPTER** now; REWORK only with a shared HUD or focus widgets | Now: nothing in GMT. The integrator takes `settings.distEstimate` as a number (`distEstimate: distAverageRef.current` in `Navigation.tsx`); the shell passes the module's distance. Later: a source the probe reads raw from, while it keeps publishing its smoothed value to `engine.lastMeasuredDistance` exactly as today (four writes in the probe, one in `Navigation.tsx`; the saved `targetDistance` reads it) | 0 now; 1 session later incl. a probe-smoothing test | Not in Stage N |
| Keys, drag-look, wheel, joystick state | `engine-gmt/navigation/useInputController.ts` | Needs an R3F canvas (`useThree`, `useFrame`); reads GMT store fields `invertY`, `optics.camType`; opens the ADR-0061 camera session | **REWORK** | Renderer-free hook in `engine/plugins/navigation/` taking a DOM element, a tick, `mode`, `isLocked`, `isSuppressed`, `isTouchLayout`, `excludeTarget`, speed get/set, range and wheel-step function, optional wheel override, three activity edges; GMT's hook becomes the wrapper (thicker than first written - see 3.2 e) | 1.25 sessions + 0.5 for a guard that flies, written first | Stage N |
| Speed model | same `update` | distance x fly speed x (4 with Shift), rise eased at 1.2/s, fall instant. Alt does NOT slow flying: `const boost = inputs.move.boost ? 4.0 : 1.0`; `precise` reaches only roll (`rollMod`) and the wheel step. Held keys are normalised (`tv.normalize()`), the page adds them (W+D = 1.41x) | **AS-IS** | Same law as the page (`smoothedDist * baseSpeed * boost * dt * 60`). The number range differs - see 3.2. The shell must pass `autoSlow: true` always: the other branch is an absolute speed (`2.0 * settings.baseSpeed * boost`) | 0 | - |
| Modifiers | `engine-gmt/navigation/modifiers.ts` | Pure | **AS-IS** | Moves with the integrator | minutes | Stage N |
| Movement lock | `store/engineStore.ts`, `selectMovementLock` | Engine store + `interactionConfig.blockCamera` | **AS-IS** | - | 0 | - |
| Orientation | R3F camera quaternion, with roll | quaternion; page is yaw + pitch, pitch clamped at 1.55 | **ADAPTER** | After every `update` the shell reads yaw and pitch off the object, clamps pitch, sets roll to zero and WRITES THE LEVELLED QUATERNION BACK before the next `update`; a one-way read is not enough (3.2 d). Or the module accepts three basis vectors (its passes already take `uRight, uUp, uFwd`) | 0.5 shell, or 0.5 module live + 1 for flight paths | Stage N |
| Field of view | `engine-gmt/features/optics.ts` `camFov` (GMT) / literal `Math.tan(0.5*1.1)` at 16 sites (page) | GMT 10..150 default 60; page fixed 34.1 vertical | **ADAPTER** | Module reads one `fovScale`; shell declares its own `fov` param, default 34.1. Do not register GMT's `optics` feature | 0.5 module + referee re-run | After stage N |
| HUD distance / speed / Reset | `engine-gmt/navigation/HudOverlay.tsx`, `usePhysicsProbe` writers | Reset prompt when `dist < 0.001`; red under 1.0; GMT store reads | **REWORK** (small) or ADAPTER | "Lost" test and colour threshold become predicates the app registers; or the shell keeps its own two readouts through `hud.register` | 0.5 session, optional | Stage N, last |
| Reset / home / Step Back | `engine-gmt/store/cameraSlice.ts` | Home = formula default preset; step back = exactly 1.0 unit | **ADAPTER** | Shell supplies its own home and a step back that is a multiple of the distance | 0.25 | Stage N |
| Touch joysticks | `components/MobileControls.tsx` (sender, **unverified**) | Window events `joyMove` / `joyLook` | **ADAPTER** (probable) | Arrives with the hoisted hook; makes phone flight possible without pointer lock | 0.5, unverified | Later |
| Orbit, cursor-anchored zoom, pivot | `engine-gmt/navigation/Navigation.tsx` (`absorbOrbitPosition`, `snapshotHoverPivotLocal`) | drei OrbitControls in absolute units; `1e-8` / `0.0001` dead zones; world picks as doubles | **NOT-NOW** | Would need view-unit coordinates, a registered pick source and a camera-relative pivot. Applies when the owner asks for orbit at depth | 4 to 6 days, high GMT risk | - |
| Smoothing | `VirtualSpace.updateSmoothing` | Absolute thresholds `10.0`, `1e-18`, `1e-21` | **NOT-NOW** | Not used; the module renders the true pose | - | - |
| Jumps and transitions | `FRACTAL_EVENTS.CAMERA_TELEPORT` / `CAMERA_TRANSITION`, `CameraState` | Position lerped in one double | **ADAPTER** | Shell uses the module's own jump and dive with digit strings | 0 | Shell stage 3 |
| Saved places | `engine/store/installStateLibrary.ts`, `components/StateLibraryPanel.tsx` | Opaque payload | **ADAPTER** | Payload carries the three strings; already in the blueprint | 0.5 | Shell stage 3 |
| Camera slot plugin | `engine/plugins/Camera.ts` | Opaque blob, no labels or thumbnails | **AS-IS**, not used | - | 0 | - |
| GMT Camera Manager | `engine-gmt/features/camera_manager/` | Quaternion + double offsets + `optics`; directional views go orthographic | **NOT-NOW** | "Front view" has no meaning at 1e-40 | - | - |
| GMT scene camera into the deep zoomer | `plans/deep-zoom-in-gmt/HANDOFF-MAPPING.md` | Numeric offset + quaternion | **ADAPTER** | `deep-zoom/handoff.ts`; loses roll, and below 1e-16 on the way back | 1 session | After stage 3 |
| Key Cam and camera tracks | `engine/animation/cameraKeyRegistry.ts` | Keyframe `value: number` | **ADAPTER** | One float `camera.u` + side table of exact views (blueprint section 8) | 0.5 | Shell stage 6 |
| Camera pair (two-word pan) | `engine/animation/cameraPairRegistry.ts` | About 1e-32 | **AS-IS**, not used | Do not extend to N words; the side table covers it | - | - |
| Camera-move undo | `store/slices/historySlice.ts`, `'camera'` scope | Entry is exactly `cameraRot` / `sceneOffset` / `targetDistance` | **ADAPTER** now, **REWORK** for a real Undo Move | The camera scope captures and restores through a registered provider; default = today's three fields | 1 session | After stage N |
| Depth of field, Focus Lock, focus pick | `engine-gmt/features/optics.ts`, `engine-gmt/components/panels/scene_widgets.tsx` | Absolute focus distance, floor 1e-6; widget reads GMT's proxy | **NOT-NOW**; REWORK when the module gets a blur | Focus widgets take depth from the same registered probe as navigation; focus stored in view units | 1 session then | - |
| Rotation gizmo | `engine-gmt/features/rotation_gizmo/` | Edits a formula's rotation params | **NOT-NOW** | Applies when a deep formula has a rotation parameter | - | - |
| FBX / After Effects camera export | `engine-gmt/components/timeline/RenderPopup/sceneSampler.ts`, `sampleScene` | Reads GMT's three.js camera and `sceneOffset` | **REWORK** (small) | Exporters take frames from a source the app supplies; GMT's sampler is the default | 1 GMT + 1 shell | After shell stage 6 |

### 2.2 Light, shading, material

| System | Where it lives | Assumes today | Verdict | The rework, one line | Size | When |
|---|---|---|---|---|---|---|
| Light record: colour, temperature, power, EV, on/off, cast-shadow | `engine-gmt/types/graphics.ts`, `LightParams` | Pure data | **AS-IS** | - | 0 | - |
| Light attachment (`fixed`) | same; resolved in `VirtualSpace.getLightShaderVector` | Two frames, world or camera, as a boolean | **REWORK** | `fixed` stays the stored truth for World and Camera (8 files read it directly). An optional `frame: 'surface'` is written only for the third value, always beside `fixed: true`; any update that sets `fixed` clears it. No GMT scene ever carries it, so no migration | 1.5 to 2.5 sessions incl. the round-trip test written first | Stage L |
| Light lengths (`position`, `range`, `radius`) | same; packed in `UniformManager.syncFrame` | Absolute world units; UI -10..10, 0..100; drag-in clamps at 0.0002 | **REWORK** (small) | NOT a field on the light. The view frame the renderer supplies declares the unit its lengths are in (`lengthScale`: 1 in GMT, the view scale in the deep zoomer); the packer multiplies. Stored numbers in GMT scenes keep their meaning, so an older build cannot misread them | 0.25 session on top | Stage L |
| Light list state and actions | `engine-gmt/features/lighting/index.ts`, `LightingFeature` | One object also holding about 20 shadow / path-tracing params and the GLSL injection | **REWORK** | Split the file, not the feature: the list (param, defaults, four actions, helpers) becomes a module with no shader imports; `LightingFeature` spreads it back in | 1 session | Stage L, first |
| Light packing | `engine-gmt/engine/managers/UniformManager.ts`, `syncFrame` light block | Inline in GMT's worker | **REWORK** (small) | A pure exported function `packLights(lights, viewFrame, modulations, targets)`: it adds the eight per-light modulation offsets the block adds today (`modulations[\`lighting.light${i}_intensity\`]` and seven more) and writes into the caller's pre-allocated uniform values, no per-frame allocation | 0.75 to 1 session | Stage L |
| Light Studio UI | `engine-gmt/features/lighting/components/LightControls.tsx`, `LightGizmo.tsx`, `SingleLightGizmo.tsx`, `engine-gmt/components/panels/lighting/LightPanelControls.tsx` | Each opens with `const engine = getProxy()` and reads `engine.sceneOffset` and `ViewportRefs` | **REWORK** | Components read a registered view frame instead of a renderer; the frame conversion (five `engine.sceneOffset` sites in three UI files, plus `VirtualSpace.getLightShaderVector` and `OverlayProjection.storeToWorld`) collapses onto one helper. The three attach toggles are not identical today and each keeps its behaviour. The Sphere prompt that writes `renderMode` / `ptAreaLights` and `ShadowControls.tsx` stay GMT-only content | 2.5 to 3 sessions + 0.5 for the toggle smoke, written first | Stage L |
| Top-bar orb strip | `engine-gmt/topbar/CenterHUD.tsx` (body **unverified**) | Hosts orbs among other GMT HUD items | **REWORK** (small) or ADAPTER | Lift the strip into its own component if it is entangled | 0.5 to 1 | Stage L |
| Aim by dragging an orb | `engine-gmt/hooks/useInteractionManager.ts`; `padCoordToLightEuler` in `GizmoMath.ts` | Maths is pure; placement clamps 0.0002..20 world units | **ADAPTER** (aim); **NOT-NOW** (point placement) | Shell pointer handler calls the same function | 0.5 | Stage L |
| Light gizmos, visible emitters | `LightGizmo.tsx`, `light_spheres.ts` | World positions through GMT camera + offset; emitters are marcher GLSL | **NOT-NOW** | Applies with positional lights in view units; a Surface-frame direction gizmo is new work | 1 to 2 later | - |
| Light types | `LightType` | Point / Directional / Sphere | Directional **AS-IS**; Point as headlamp **ADAPTER**; free Point and Sphere **NOT-NOW** | Free point lights need a per-pixel position from log depth in the module (+0.25) | - | Later |
| Shadows, per light | `castShadow` | Flag | **AS-IS** | - | 0 | - |
| Shadows, global | `LightingFeature` group `shadows` (`shadowSoftness` 2..2000, `shadowSteps`, `shadowBias`, Lite/HQ) | A ray march toward the light | **ADAPTER** under route A; **REWORK** (R4) under route B | Route A: the shell's own feature with id `lighting` (the shared light list + its own `shadows` group: strength, softness 0.05, length 0.6). The panel's `<AutoFeaturePanel featureId="lighting" groupFilter="shadows" />` then shows the shell's rows with no panel change. Route B: GMT's chunk hard-reads `uShadowSoftness`, `uShadowBias`, `uShadowIntensity`, `uShadows` around the provider call, so the shadow parameters must move behind the provider (4.3, R4) or GMT's names get reused with new meanings (decision 8.14) | 0 extra (A); 0.5 to 1 (B) | Shell stage 2; Stage B |
| Ambient occlusion | `engine-gmt/features/ao/` | Extra distance taps along the normal | **ADAPTER** | Depth-buffer occlusion in the module; two numbers | 0 | Shell stage 2 |
| Shading entry | `engine-gmt/shaders/chunks/lighting/shading.ts`, `calculateShading` | Finds the surface inside itself (`getSurfaceMaterial`) | **REWORK** (route B) | A `shadeSurface(p, pAbs, d, n, v, albedo, emission, roughness, surfEps, epsRateBase, seed)` entry; `calculateShading` becomes resolve + call. `pAbs` and `d` are there because GMT's injected reflection block uses `p_fractal` and `d`; `epsRateBase` because `epsRate` is computed per light (`epsRateBase * dot(shadowL, viewDirN)`) | 1 session incl. compile check | Stage B |
| Shadow threshold | `lighting/pbr.ts`, `calculatePBRContribution` | Computes `surfEps` from marcher uniforms and an f32 absolute position; floor `PRECISION_RATIO_HIGH 5.0e-7` | **REWORK** (route B) | The footprint is supplied by whoever found the surface; block moved verbatim | 0.5 session | Stage B |
| Shading-only assembly | `engine-gmt/engine/ShaderBuilder.ts`, `buildFragment` | Always emits distance function + trace + main | **REWORK** (route B) | A builder variant whose surface comes from a pluggable surface-source block; shadow and occlusion providers by name. The shading half is not surface inputs only: it must still emit the miss handler (`sampleMiss`, `g_missSelfFogCover` from `buildMissHandler`), the fog chain (`applyEnvFog`) and the environment sampler | 1.5 to 2 sessions | Stage B |
| Materials, rim, emission, env ambient, env reflection | `engine-gmt/features/materials.ts`, `lighting/env.ts` | As GLSL arguments: n, v, albedo, roughness, direction. As uniforms: the materials, atmosphere (fog), environment (two textures, an average colour computed at load) and AO features, fed today only by GMT's `UniformManager` | **ADAPTER** before route B (the four floats `uMat`); after it **AS-IS in code, plus a uniform feed in the shell** | The shell installs those features and uploads their uniforms and the environment textures to pass S | 1 to 2 sessions (was 0) | Stage B |
| Raymarched reflections, path tracer, volumetric, glow | `features/reflections/`, `chunks/pathtracer.ts`, `features/volumetric/`, `atmosphere` glow | Re-march the fractal | **NOT-NOW** | Need a second-ray provider against the deep surface | - | - |
| Distance fog | `engine-gmt/features/atmosphere/index.ts`, `FOG_POST_PROCESS` | `uFogNear` / `uFogFar` in world units | **ADAPTER** | Fog in the module's shading pass in view depths | 0.5 day | Later |

### 2.3 Colour, formula, quality

| System | Where it lives | Assumes today | Verdict | The rework, one line | Size | When |
|---|---|---|---|---|---|---|
| Gradient param, editor, My Gradients | engine `type: 'gradient'` | Strip texture at `(t, 0.5)` | **AS-IS** | Module needs `setGradientTexels` (0.25) | 0 | Shell stage 5 |
| Colour maths (scale, offset, bias) | `engine-gmt/shaders/chunks/material_eval.ts` | `pow(abs(fract(mod(v*scale+offset,1))), bias)` | **ADAPTER** | Module's shading pass uses the same expression and GMT's param names | 0.5 | Shell stage 5 |
| Mapping modes 0, 1, 5, 7, 8, 13 | `engine-gmt/features/coloring/MappingModes.ts` | `result` vec4 + normal | **ADAPTER** | Module computes GMT's values (sqrt of its squared trap, fixed-count normalise); shell enum uses GMT's numbers | 0.5 | Shell stage 5 |
| Modes needing escape angle, per-axis trap, shape trap | same | Values the kernel computes and throws away | **ADAPTER** | Raw values in the one RGBA32F G-buffer instead of one pre-mapped number | 1 to 2 module | Later |
| The mode list itself | `MAPPING_MODES`, `ColoringFeature.mode` | Every mode always offered; needs hidden in GLSL strings | **REWORK** | Each mapping declares the inputs it reads; options a renderer or formula does not provide show disabled with the reason | 1 session + ADR-0059 amendment | Later |
| Histogram / auto-levels | `coloring-histogram` (**unverified**, not opened) | Data from a GMT worker shader variant | **REWORK** or ADAPTER | The widget takes a data function, not a renderer | 1 session | Later |
| Position-based modes, twist, colour iterations, layer 3 noise | `gmt_colorSpiral`, modes 2 to 4 | Absolute position; one flat colour below about 1e-6 | **NOT-NOW** | - | - | - |
| Power and phase | `engine-gmt/formulas/Mandelbulb.ts`, `parameters` | Float power; kernel takes whole numbers 2..16 | **ADAPTER** | Shell reads label/range from the formula and forces step 1 | 0.25 | Shell stage 2 |
| Julia, Z Twist, Radiolaria, rotations, hybrids, weave | `geometry/index.ts`, `weave.ts` | Per-iteration operations | **NOT-NOW** | Each needs its own perturbation derivation | days each | - |
| "This formula has a deep kernel" | `engine-gmt/types/capabilities.ts` | Closed token set (ADR-0059) | **AS-IS** now; REWORK at the second formula | One token naming the property, per-parameter limits declarable | 1 session then | - |
| Quality (detail, step size, max steps) | `engine-gmt/features/quality.ts` | GMT marcher internals | **ADAPTER** | Shell maps: deep detail = GMT `detail / pixelThreshold`; keep "reach" as the shell's own (ADR-0077 removed step relaxation from GMT) | 0 | Shell stage 2 |

### 2.4 Rendering out, animation, chrome

| System | Where it lives | Assumes today | Verdict | The rework, one line | Size | When |
|---|---|---|---|---|---|---|
| Pause, sample counter, Auto-Stop | `engine/AccumulationController.ts`, `engine/plugins/topbar/PauseControls.tsx` | A controller with pause, cap, reset, count | **ADAPTER** | Shell object over the module; module needs `pause` and a sample-target setter | 0.25 | Shell stage 2 |
| High-res still panel | `engine/plugins/topbar/installBucketRender.tsx`, `BucketRenderController` | start / stop / count | **ADAPTER** | A controller like fluid-toy's calling the module's own tiled export | 1 session | Shell stage 6 |
| `BUCKET_STATUS` -> `isBucketRendering` bridge | copied in `fluid-toy/main.tsx` and `engine-gmt/renderer/bindings.ts` (both read) | Every app copies 8 lines or the panel cancels the job. Both copies set `isBucketRendering` and `isExporting`; GMT's also releases `setActiveRenderSampleCap` on the false edge, and GMT's video `exportRunner.ts` emits the same event | **REWORK** | The two-flag bridge registers when `installBucketRender` is called (not when the button mounts: GMT installs it `when: desktopOnly`). GMT keeps its one sample-cap line. No smoke finishes a render: unguarded | half a day | With stage 6 |
| `BucketRunner` + `BucketRenderHost` | `engine/export/BucketRunner.ts` | three.js, one RGBA accumulator, shades per bucket | **NOT-NOW** | Deep shading needs the whole picture's depth; leave ADR-0067's code alone | - | - |
| Video render dialog | `engine/plugins/RenderDialog/` | A runner callback | **AS-IS** + shell runner | Shared frame loop in `engine/export/` is optional (1 day) | 1 session | Shell stage 6 |
| Timeline, binders, scrub hooks | `engine/AnimationEngine.ts` | Plain numbers | **AS-IS** | Use `registerScrubHook('post')` so one scrub is one seek | 0 | Shell stage 6 |
| LFO / audio modulation | `engine/animation/modulationTick.ts` | Renderer adds offsets each frame | **ADAPTER** for look params; needs a param flag for the rest | Optional `modulatable: false` on a param config | half a day | Later |
| Bloom, lens, tone map, levels, Droste | `engine/features/post_effects.ts`, `color_grading.ts`; assembled only in `engine-gmt/shaders/chunks/post_process.ts` | Sliders exist in every app; the effect runs only in GMT's worker | **REWORK** | An engine post pass: registered `postShader` blocks + a colour texture from whichever renderer | 2 to 4 days (tone map, levels, lens first: 1.5) | After shell stage 7 |
| Context-lost prompt, `?diag` | `app-gmt/RenderContextLostOverlay.tsx`, `app-gmt/DiagnosticsOverlay.tsx` | app-gmt files; only GMT's `WorkerProxy` emits the event | **REWORK** | Both become engine components; any renderer emits `RENDER_CONTEXT_LOST` | 1 day | With stage 7 |
| Share link, gallery | `engine-gmt/gallery/sharedScene.ts`, `createSharedScene(gmf, meta)` | The row is GMT scene text | **REWORK** | The record gains an app id and an opaque payload | 1 to 2 days + backend (**unverified**) | Owner call |
| Adaptive resolution, interaction session (ADR-0061) | `store/slices/viewportSlice.ts`, `.claude/rules/interaction-session.md` | GMT gesture producers and consumers | **NOT-NOW**, becomes ADAPTER with stage N | The hoisted input hook's `onActivity` opens the session | - | Stage N |
| Loading screen, tutorial lessons, About, GMT settings, Shader Compiler tab | `app-gmt/` | GMT content | **NOT-NOW** | Shell writes its own content on the engine's plugins | - | - |
| TopBar, Menu, Shortcuts, Undo, Hud, Help, Session, SceneIO, state library | `engine/plugins/` | Renderer-agnostic | **AS-IS** (gaps in ENGINE-GAPS.md) | - | - | - |
| Water plane, drawing, texturing, Formula Workshop, webcam, debug tools | `engine-gmt/features/`, `engine/features/` | World-space or f32-marcher | **NOT-NOW** (webcam and the state debugger AS-IS) | - | - | - |

---

## 3. Navigation, in depth

### 3.1 What the deep-zoom user does

He opens Deep Zoom and flies it with the hands he already has from GMT.

- **Keys:** W/S forward and back, A/D strafe, Space/C up and down, Shift 4x. There is no slow
  key: Alt slows only roll and the wheel step in GMT, and the page has no Alt at all (adding one
  would be new behaviour in both apps - decision 8.15). Q/E roll only if the module takes a full
  basis (decision 8.3); otherwise Q/E are unbound, not remapped.
- **Look:** left-drag, GMT's rate control (the further from where the button went down, the faster
  the turn - `tr.y = -inputs.dragDelta.x * 2.0` in `CameraController.update`). No pointer lock by
  default (decision 8.2).
- **Wheel:** changes fly speed, as in GMT's Fly mode, but in proportional steps (3.2 c): GMT's
  fixed steps of 0.005 to 0.02 would take 155 notches to get from 0.5 to the page's 3.6.
- **What will feel different from the page, said plainly:** (1) up and down move along the
  camera's own up (`tv.y += 1` then `applyQuaternion(camera.quaternion)`), where the page moves
  along world Y (`mv([0,1,0], speed)`) - looking down and pressing Space moves you differently;
  (2) held keys are normalised, so W+D is 1.0x where the page gives 1.41x - dive timings measured
  on the page will not match; (3) the turn rate on screen stays constant at steep pitch, where the
  page's slows by the cosine of the pitch.
- **What will feel different from GMT:** the horizon stays level. GMT's free-fly lets it tilt.
- **HUD:** `DST 3.20e-41` (GMT's `formatDist` already switches to exponent under 0.001), `SPD` as a
  number, the crosshair, the hint line `WASD Move · Space/C Vert · Shift Boost`. The Reset prompt
  appears only when the centre is sky, never because the distance is small. The iteration count
  rises by itself (`rec = min(160, 32 + ceil(1.35 * -log10(dist)))`, module's own).
- **Not there:** Tab does not switch to Orbit (there is no orbit); no cursor-anchored zoom.
- **Phone:** the two on-screen sticks only. The hook switches drag-look OFF on phones
  (`if (isMobile && mode === 'Fly') return;` in `useInputController.ts`), so phone flight rests
  entirely on the `joyMove` / `joyLook` senders (`components/MobileControls.tsx`, unverified).

### 3.2 The seams

One rule makes all of them work (navigation-core, section 2): **navigation may hand the renderer a
displacement and may ask it for a distance; it never reads the absolute position back as numbers.**

**(a) Position authority - a displacement sink.**
Contract: `translate(dx: number, dy: number, dz: number): void`, world axes, world units.
- Changes: `CameraController.update` gains the sink as a required setting and loses its one hard
  line `FractalEvents.emit('offset_shift', { x: mv.x, y: mv.y, z: mv.z })`. Its single call site in
  `engine-gmt/navigation/Navigation.tsx` passes a sink that emits exactly that event, so
  `FractalEngine` (`this.virtualSpace.move(x, y, z)`) and `GmtRendererTickDriver` (`OFFSET_SHIFT`)
  receive what they receive today.
- Module offers: `moveAlong(dir, dist)` - it exists (`window.__moveAlong`, "exact HP move",
  `camHP[j] += hp.fromNum(dir[j]*dist)`), the same `hp.fromNum` path the page's own keys take, so
  no exactness is lost. The shell calls `moveAlong([dx, dy, dz], 1)` - it does not normalise and
  re-multiply. The shell's sink clamps one stride to 0.2 of
  the reported distance. That clamp is needed: I read `const safeDelta = Math.min(delta, 0.1)` in
  `update`, so a hitched frame at fly speed 1 with Shift moves 0.4 of the distance, and the module's
  distance "can be well over the true distance" (`deep-zoom/bridge.ts`, `diveTo` comment, per renderer-side).
- I chose a sink argument over "the shell subscribes to `OFFSET_SHIFT` on the engine bus"
  (navigation-gmt's cheaper variant): the event name is GMT's worker vocabulary and a second
  listener on it is an accident waiting for the day both renderers are on one page.

**(b) Distance - a plain argument now; no GMT change.** (Corrected: the first version made a
registered distance source step N1. Both skeptics showed it is not needed and not safe.)
- The integrator already takes the distance as a number: `settings: { baseSpeed, distEstimate, autoSlow }`,
  fed in `Navigation.tsx` by `distEstimate: distAverageRef.current`. The shell passes the module's
  `rawDist` the same way. Nothing in GMT changes for flying.
- Why the source was unsafe as written: `usePhysicsProbe.ts` is a reader AND a writer of
  `engine.lastMeasuredDistance` (`= 1.0`, `= distAverageRef.current`, `= smoothed`,
  `= manualDistance`), `Navigation.tsx` writes it on camera load
  (`engine.lastMeasuredDistance = newState.targetDistance`), and the proxy has the setter
  (`set lastMeasuredDistance(v)` in `WorkerProxy.ts`). The write-back is load-bearing: the worker
  branch only reprocesses when `shadowDist !== distAverageRef.current`, and the saved
  `targetDistance`, Step Back, focus pick and light drag-in all read the smoothed, written-back
  value. A read-only source either wraps nothing or changes the fly-speed ramp and what is saved.
  No script in `debug/*.mts` references `usePhysicsProbe` (grep), so nothing would go red.
- When it comes back (only with a shared HUD, N6, or the focus widgets): "the probe reads the raw
  distance from the source and still publishes its smoothed value where it does today"; the other
  readers are left alone; a node test on the probe's smoothing with a fixed distance series is
  written and falsified first. No `kind` field until something branches on it.
- Module offers: `smoothedDist` and `rawDist` each frame, the nearest-surface distance, from the
  reference orbit (`rawDist = 0.5*Rk*log(Rk)/DRk`) - free, already computed. Needs only `rawDist`
  exposed (0.1 session). Feed `rawDist`, not `smoothedDist`: the integrator eases it itself
  (`smoothedDistEstimate`, `DIST_INCREASE_LERP_RATE = 1.2`), so the easing is not doubled.
- **N4 acceptance line:** with the host owning input the module must keep computing `rawDist` and
  its own `smoothedDist` every frame, because its automatic iteration count, resolution cap and
  `refE` read that `smoothedDist` (port not opened - unverified). Speed and iteration count then
  follow two separately-clocked copies of the same easing; harmless, but known.
- The two distances feel different: GMT (centre ray) flies fast past a wall while looking into open
  space; the deep zoomer (nearest surface) slows. That is the page's behaviour today.

**(c) Speed model.**
Contract: settings on the integrator - `minSpeed` (default `1e-6`), `boostMinDistance` (default
`1e-4`) - and on the input hook a `speedRange` (default `[0.001, 1.0]`, the clamp in
`handleWheel`) and a `wheelStep(current, dir)` function whose default is today's three additive
steps (`let step = 0.01; if (current < 0.05) step = 0.005; if (current > 0.1) step = 0.02;`).
The shell passes a proportional step. GMT's HUD line `SPD ${(speedRef.current * 100).toFixed(1)}%`
assumes a top of 1.0, so the shell shows its own speed readout as a number.
- `autoSlow` must be `true` in the shell, always: the other branch
  (`2.0 * settings.baseSpeed * boost`) is an absolute speed, the same failure at depth as the floor.
- Why the floors must be settable: at a surface distance of 1e-30, one frame at the `1e-6` floor
  throws the camera 22 decades past the surface. A deep app passes 0 for both.
- Why the range must be settable, in real numbers: GMT's law is distance x fly speed per second,
  default 0.5 (`engine-gmt/features/navigation.ts`), wheel-clamped to at most 1.0. The page's law is
  `dist * 0.06 * dt * 60` = 3.6 x distance per second. A dive from 1 to 1e-77 is 177 e-foldings:
  **49 seconds at the page's 3.6; 5.9 minutes at GMT's default 0.5; 89 seconds with Shift held.**
  The shell passes a wider range and its own default (decision 8.4). GMT's numbers do not move.

**(d) Orientation and field of view.**
Contract: the integrator rotates an object with a quaternion (today a `THREE.Camera`; any
`THREE.Object3D` serves - the shell needs no R3F canvas for this). The renderer is told the result.
- **Corrected - the yaw/pitch option is not a one-way read.** The integrator turns with
  `camera.rotateX(...)`, `camera.rotateY(...)`, `camera.rotateZ(...)`: three.js turns about the
  object's OWN axes, so once pitch is not zero, turning left/right tilts the horizon with Q/E never
  pressed. If the shell only read yaw and pitch each frame, the object would keep its roll and the
  next move (`tv.clone().applyQuaternion(camera.quaternion)`) would use a basis the picture is not
  drawn with: strafe and Space/C drift off-axis, growing as the user looks around. So N5's adapter
  does this after every `update`: read yaw and pitch (Euler order 'YXZ'), clamp pitch at 1.55, set
  roll to zero, **write the levelled quaternion back into the object**, then tell the module. GMT
  and the integrator are untouched by it; no `roll` or `upAxis` setting is added.
- Module offers (choose one, decision 8.3): `setYawPitch` with the levelling adapter above (0.5
  session in the shell, flight-path format unchanged), or a basis / quaternion input (0.5 session
  live - pass G, pass S, `fitRig`, `rigDir` already take three vectors - plus 1 session for path
  format v2 with slerp; v1 files then read as roll 0).
- Field of view never enters movement. The module turns its literal into one variable (16 sites,
  0.5 session, accuracy referees re-run at a second angle); the shell declares `fov`, default 34.1.
  (The colour reader flagged "1.1 rad = 63 degrees"; renderer-side resolves it: rays use
  `uv` = pixel / height, so the half-height tangent is 0.5 x tan(0.55) = 0.3066, which is 34.1 vertical.)

**(e) Input.**
Contract (widened after review; the first version left out inputs the hook really has):
`useNavigationInput({ element, tick, mode, isLocked, isSuppressed, isTouchLayout, excludeTarget, invertY, speed, setSpeed, speedRange, wheelStep, onWheel?, onActivityBegin?, onActivityPoke?, onActivityEnd? })`
returning move state, joystick refs, modifiers, drag state.
- What the hook reads today, each with its place in the contract: `mode: CameraMode` (branches in
  the wheel, mouse-down and mouse-move handlers) -> `mode`; `useFractalStore.getState().isTimelineHovered`
  (keys ignored over the timeline - the shell has a timeline from stage 6) -> `isSuppressed()`;
  `useMobileLayout()` -> `isTouchLayout`; the `hudRefs` click exclusion and its
  `.closest('.pointer-events-auto')` fallback -> `excludeTarget(el)`; `store.beginInteraction` /
  `pokeInteraction` / `endInteraction` (three calls, not one) -> the three activity edges;
  `selectMovementLock` in three places -> `isLocked`; `optics.camType` / `orthoScale` /
  `setOptics` -> `onWheel`.
- Changes: `useInputController.ts` loses `useThree`, `useFrame` and those store reads and becomes
  a wrapper that supplies all of the above with today's values. `components/ui/stopNavKeys.ts`
  changes an import path.
- Module offers: `setInputOwner('host' | 'self')` - today `window.__lockInput(b)` blocks the page's
  keys and the pointer-lock click; the `mousemove` look also needs gating (0.25 session).

### 3.3 What GMT keeps, and how that is proven

Unchanged: `VirtualSpace`, `sceneOffset` and `targetDistance` in saves, `usePhysicsProbe` and
every reader and writer of `engine.lastMeasuredDistance`, every worker message, Orbit mode, the
HUD's look, every default number. No flag is added; GMT passes today's values through the new
arguments. Stage N touches no saved data, so it needs no migration.

Guards that exist: `npm run typecheck`; `npm run smoke:engine-gmt` (Navigation mounts, no page
errors); `npm run smoke:orbit` (orbit drag reaches `sceneOffset`); `npm run test:interaction`,
`test:interaction:wiring`, `test:interaction:coverage` (the ADR-0061 session edges);
`npm run smoke:camera`; `npm run test:gmf` (scene round trip).

**The gap, stated plainly:** `.claude/rules/navigation.md` cites only `smoke:engine-gmt` and
`smoke:orbit`. No reader found a smoke that flies. So step N0 below writes the guard first, against
today's code: a node test that replays a fixed input script through `CameraController.update` and
records the emitted displacements; after the move the same script must give the same numbers to the
last bit. It must be falsified once (change `DIST_INCREASE_LERP_RATE`, watch it go red) before it
is cited. The script must include a held-Shift case at a tiny distance (the `1e-4` floor) and an
`autoSlow: false` case, or the two floors move unguarded.

**A second gap, found in review:** the guards first cited for N3 do not open the file being
rewritten. No script in `debug/*.mts` references `useInputController` (grep over the directory;
the only script matching any of `useInputController | usePhysicsProbe | CameraController |
LightGizmo | getLightShaderVector | syncFrame` is `test-modulation-coverage.mts`). `smoke:orbit`
drives an orbit drag only; keys, wheel speed, joystick refs, invert-Y and the orthographic wheel
case are untested. So before N3: extend N0's replay to drive the hook's output shape (key down and
up, wheel, drag delta) through to displacements, and add a fly step to `smoke:orbit` or a sibling
(hold W for N frames, assert `sceneOffset` moved along the view direction). That is step N0b.

### 3.4 Steps, each leaving both apps working

| Step | What | Size | Both apps after it |
|---|---|---|---|
| N0 | Replay test for the fly integrator, written against today's code and falsified; includes held Shift at a tiny distance and `autoSlow: false` | 0.5 | Nothing moved |
| ~~N1~~ | Removed from Stage N (3.2 b). The distance source returns only with N6 or the focus widgets, with its own test | - | - |
| N2 | Integrator into `engine/plugins/navigation/` with the sink and the two floors as settings; `modifiers.ts` moves with it; `engine-gmt` re-exports | 0.75 | GMT identical (N0 green) |
| N0b | Guard for the input hook, on today's code: replay extended to the hook's output shape; a smoke that flies (hold W, `sceneOffset` moved along the view direction); both falsified | 0.5 | Nothing moved |
| N3 | Renderer-free input hook with the widened contract (3.2 e); GMT's hook becomes the wrapper | 1.25 | GMT identical (N0b, `smoke:orbit` for drag, `typecheck`). `test:interaction*` guards the ADR-0061 edges only if it reaches the hook - unverified |
| N4 | Module: `setInputOwner`, `rawDist`, `setYawPitch` or basis; keeps computing `rawDist` / `smoothedDist` under host input | 0.75 to 1.35 | Shell still flies on the page's loop until N5 |
| N5 | Shell `deep-zoom/navigation.ts`: mounts the hook on the surface, runs the integrator on a tick with `autoSlow: true` and the module's `rawDist` as `distEstimate`, levels the quaternion and writes it back each frame, sink -> `moveAlong([dx,dy,dz], 1)` with the 0.2 clamp, proportional wheel step, `isSuppressed` over the timeline, own DST / SPD readouts, home / step back; switches the module to host input | 1.75 | Shell flies on GMT's code; the page-loop interim is deleted |
| N6 | Optional: distance source (read raw, keep publishing smoothed) + HUD predicates so the shell mounts GMT's HUD cluster | 1.5 with the probe test | - |
| Later | Module `fov` variable + shell param; camera-undo provider; orbit at depth only on request | 0.5 / 1 / 4 to 6 days | - |

Order: N0, N2, N0b, N3, N4, N5. Total now: about 3 sessions in the engine and GMT (1 of them
guards), about 1 in the module, 1.75 in the shell. One ADR.

---

## 4. The Light Studio, in depth

### 4.1 What the owner does

He opens the Light Studio he knows - orbs in the top bar, the hover popup, the heliotrope pad, the
panel tab - above a surface at 1e-40. The default rig is three lights whose attachment reads
**Surface**: a white key 40 degrees above the surface from azimuth 152, a fill at 21 degrees from
-40 a sixth as strong, a kicker fixed to the Camera. He drags the key round the pad; the light
rakes the surface and keeps raking it as he flies and turns. He adds a fourth light, picks a
colour temperature, sets Power in EV, ticks Cast Shadows. He switches a light to Camera and gives
it a Range of 40: a headlamp whose pool holds its size on screen at any depth, because in this
app every light length is in view units. World is listed and disabled below the depth where it
stops meaning anything.

**What "Surface" really is** (corrected): elevation above the surface, direction in the picture.
The page's `rigDir(azDeg, elDeg, right, up)` builds the azimuth from the CAMERA's right and up
(`ca * right[i] + sa * up[i]`) and only the elevation from the fitted plane. So a Surface light
keeps its height above the ground but turns with him when he turns the camera. It does not stay
put on the surface the way a World light would. If he expects that from the name, the name is
wrong - decision 8.16.

What he does not get, said by name in the panel: Sphere lights, visible emitters, draggable
position gizmos, GMT's Hardness / Quality (Steps) / Bias rows (under route A the shell's shadow
rows are Strength, Softness, Length), shadows from anything outside the picture.

Six things that will surprise him at 1e-40, none of them bugs:
1. Turn the camera and a Surface light turns with it (above).
2. Tick Cast Shadows on a fourth light and nothing happens: the cap is 2 to 3, and
   `LightControls.tsx` has a per-light checkbox with no cap. L5 must disable the box past the cap
   through `supports.maxShadowLights`.
3. The lights lag a flying frame and freeze during a still; an exported still measures the rig
   afresh, so it can be lit slightly differently from the frame he was looking at (page behaviour).
4. After route B the sky follows the ground only if the shading frame is plane-aligned, and if it
   is, a loaded environment map swims as the plane fit drifts (4.3).
5. The shadow rows change meaning between route A and route B unless decision 8.14 goes to (a).
6. The default rig's colours are not GMT's #ff8800 / #0088ff: the page forces the key white and
   gives fill and kicker half of GMT's colour (`tint: 0.5`, `fillCol: [1.0, 0.246, 0.0]`, per the
   lighting skeptic; not re-read by me). The colour picker will show what the page uses.

### 4.2 Data model and units, stated generically

Facts (light-studio 1.2, 1.7): `VirtualSpace.getLightShaderVector` knows two frames,
`if (isFixed) { …applyQuaternion(camera.quaternion) } else { lightPos.x - (so.x + so.xL) - camera.position.x … }`.
The same conversion is written at seven or more sites, not five: `engine.sceneOffset` is read at
`LightControls.tsx` (1 site), `LightPanelControls.tsx` (2), `SingleLightGizmo.tsx` (2), plus
`getLightShaderVector` and `storeToWorld` in `engine/overlay/OverlayProjection.ts`. The three
attach toggles are not identical: `SingleLightGizmo.tsx` writes `{ fixed: !wasFixed, position: newPos }`,
the other two write `{ fixed: !wasFixed, position: newPos, rotation: newRot }`. Lengths are
absolute: `k = 99.0 / (range * range)`, position step 0.01, drag-in floor
`Math.max(0.0002, Math.min(20.0, engine.lastMeasuredDistance * 0.5))` - so GMT's own point lights
stop being placeable below a surface distance of about 4e-4.

Changes (corrected: one stored field for one fact, and no unit stored on the light):

1. **`fixed` stays the stored truth for World and Camera.** It is read directly in eight files
   (`UniformManager.ts`, `LightControls.tsx`, `SingleLightGizmo.tsx`, `lighting/index.ts`,
   `LightGizmo.tsx`, `utils/GizmoMath.ts`, `LightPanelControls.tsx`, and the engine API
   `storeToWorld(..., fixed: boolean, ...)`), and lights arrive with `fixed` and no `frame` from
   formula presets (`AmazingSurf.ts`, `Bristorbrot.ts`, `KleinianJos.ts`: `fixed: true`; a flat
   `light0_fixed: false` in `AmazingSurface.ts`, converter not found - unverified). None of that
   changes.
2. **`frame?: 'surface'` is the only new stored value, and it is the third state, not a second
   copy of the first two.** One function reads it:
   `lightFrame(l) = l.frame === 'surface' ? 'surface' : (l.fixed ? 'camera' : 'world')`.
   Two write rules, enforced in `updateLight` (it is a partial merge, so the bad state is otherwise
   reachable): a light written as Surface is written `{ frame: 'surface', fixed: true }`; any
   update that sets `fixed` deletes `frame`. So `{ fixed: true, frame: 'world' }` cannot exist, and
   a build or app that does not know `frame` reads a Surface light as Camera - which is also the
   fallback the packer uses when the renderer reports no plane.
   **Migration: none.** GMT never offers Surface (item 5), so no GMT scene, preset or share link
   ever carries `frame`; old scenes round-trip byte-identical by construction, not by a converter.
   Surface means: elevation above a plane the renderer reports, azimuth in the picture.
3. **The length unit is declared by the renderer's view frame, not stored per light.** The view
   frame carries `lengthScale` (1 in GMT; the view scale in the deep zoomer) and the packer
   multiplies `position`, `range`, `radius` by it. The first version put `lengthUnit` on the light;
   that changed the meaning of saved numbers with no version stamp, and an older build would have
   read view units as world units. Now a GMT scene's numbers mean what they always meant, and the
   deep zoomer's scene files (its own format, its own version stamp) are always in view units.
   A light is therefore not portable between the two apps as raw numbers: the handoff converter
   (`deep-zoom/handoff.ts`) multiplies or divides by the view scale. GMT's Quadratic falloff in
   view units is the page's headlamp exactly: page `1/(1 + (d/L)^2)`, GMT
   `1/(1 + 99 d^2/range^2)`, equal at range = 9.95 L (L = 4 x surface distance by default, so 39.8;
   the Range slider is 0..100 so 40 fits).
4. **One packer**, `packLights(lights, viewFrame, modulations, targets)`, a pure function that
   writes into the caller's pre-allocated uniform values (the block writes in place today:
   `getLightShaderVector(effectivePos, l.fixed, cam, posArr[i])`; "arrays out" would allocate every
   frame in the worker's hot loop). It takes the per-frame modulation map, because the block adds
   eight offsets per light before packing (`dIntensity`, `dFalloff`, `dX/Y/Z`, `dRotX/Y/Z` from
   ``modulations[`lighting.light${i}_...`]``). Without that argument LFO and audio on lights go
   silently dead, and a fixed-list equality test would still pass. The shell passes its own
   modulation map, or light modulation does nothing in the deep zoomer.
5. **A view frame** any renderer supplies, as plain values:
   `{ orientation, positionRelative, lengthScale, surfaceNormal | null, supports: { frames, maxLights, maxShadowLights, types } }`.
   GMT has TWO callers that build it, not one: the worker from its own `VirtualSpace.offset` and
   camera (for packing), and the main-thread UI from the proxy's `sceneOffset` and the viewport
   camera (for the pad and gizmos). GMT declares `frames: ['world', 'camera']`. The deep zoomer's
   provider reports the plane from `fitRig` (32 x 32 read-back, one or two frames late; null when
   fewer than 64 of 1024 samples are surface - then the packer falls back to Camera) and `supports`
   with Directional + headlamp, shadows on at most 3 lights.
6. **The attachment control lists only the frames the provider declares.** With two it renders as
   today's control, unchanged: the anchor icon button in `LightControls.tsx`
   (`title={light.fixed ? 'Attached to Camera ...' : 'World Anchored ...'}`) and the two-entry
   toggle in `LightPanelControls.tsx` (`{ label: 'Headlamp', value: true }`). With three it is a
   three-way choice, names only: World / Camera / Surface. That is a redesign of the hover popup's
   icon button for the three-frame case, not a relabel (0.5 session, in L4). GMT users therefore
   see no change until GMT has its own plane fit (decision 8.7).
7. **The Euler mapping for Surface must be written down in L4 and tested.** A light's direction is
   `rotation` as an Euler in order 'YXZ' applied to (0, 0, -1) (`UniformManager.ts`,
   `this.lightEuler.set(..., 'YXZ')`). For a Surface light the same Euler is applied in the basis
   (picture-right projected into the plane, plane normal, their cross product): `rotation.x` is the
   elevation, `rotation.y` the azimuth about the normal. The sign and zero of the azimuth are fixed
   by the L0 referee ("default rig, azimuth 152 / elevation 40, reproduces today's frame"); whether
   GMT's vector points toward or away from the light was not read - unverified.

No `if deep zoom` anywhere: the Light Studio asks the view frame what it supports. Every `supports`
field today is a deep-zoom limit; that is stated, not hidden - GMT's own values are the full set.

### 4.3 How GMT's lights come to drive the deep zoomer's shading pass

**Route A - mapping layer (first).** In the module, the three hand-written lights in `SHADE_FRAG`
(`uLightDir`, `uFillDir`, `uKickDir`, `uFillCol`, `uKickCol`, key forced white) become a loop over
uniform arrays of 8: direction or view-relative position, colour x intensity, falloff as a log
relative to `refE`, casts-shadow. The shell subscribes to its store's light list, runs the same
`packLights` GMT's worker runs (with its own modulation map), and uploads the arrays. The shell
registers its own feature under the id `lighting` - the shared light list plus its own `shadows`
group - because every Light Studio component reads `s.lighting` by name. Pass S is its own small program, so the
8.6 s pass-G compile is not touched. Referee: the default rig must reproduce today's frame.
The maths stays the page's hand-copied twin of GMT's Blinn-Phong - a parallel copy, recorded as a
debt that route B removes.

**Route B - GMT's own chunks (second).** gmt-shading-chunks finds this feasible in three generic
steps, in the order that keeps GMT safe:
- R2: the shadow footprint (`surfEps`, `epsRate`) becomes an argument supplied by whoever found the
  surface; the block moves verbatim out of `calculatePBRContribution`, `PRECISION_RATIO_HIGH` and
  all. The chunk's JSDoc states that shading runs in a camera-local frame whose unit the caller
  chooses (1 world unit in GMT; 1 = the view scale for a depth-buffer caller).
- R1: `calculateShading` splits at its `getSurfaceMaterial` line into resolve + `shadeSurface(...)`.
- R3: a `ShaderBuilder.buildFragment` variant that emits the shading half only, with the surface
  from a caller's block and `GetSoftShadow` / `GetAO` supplied by name. Both already exist as whole
  functions pushed through `addPostDEFunction`, and both already have a second implementation (the
  `return 1.0` stubs), so the provider seam half-exists. The module's `shadowed()` and
  `occlusion()` become the depth-buffer providers behind GMT's signatures.
Four corrections to route B from the lighting review, all checked in the chunks:
- **R1's signature is longer.** `shadeSurface(p, pAbs, d, n, v, albedo, emission, roughness, surfEps, epsRateBase, seed)`.
  GMT's injected reflection block uses `length(p_fractal) * PRECISION_RATIO_HIGH` and
  `traceReflectionRay(currRo, currRd, d, reflFade)` (`features/reflections/index.ts`), so GMT keeps
  working only if the split function still carries both. And `epsRate` is per light
  (`float epsRate = epsRateBase * dot(shadowL, viewDirN);`), so the argument is `epsRateBase`.
- **The shading half is not surface inputs only.** `getShadingGLSL` defines `sampleMissEnv`
  unconditionally, which calls `sampleMiss(ro, rd, roughness, uEnvStrength)` and writes
  `g_missSelfFogCover` - both generated by `ShaderBuilder.buildMissHandler`. `calculateShading`
  calls `applyEnvFog(GetEnvMap(...))`. So R3 must emit the miss handler, the fog chain and the
  environment chunk, and the shell must install the atmosphere, environment, AO and materials
  features and feed their uniforms (two environment textures, an average colour computed at load)
  from something that is not GMT's `UniformManager`. That uniform feed is a new line item: 1 to 2
  sessions.
- **R4 (new): shadow parameters move behind the provider.** In `pbr.ts` the provider call sits
  inside `if (calcShadows && uShadows > 0.5 && uLightShadows[i] > 0.5)`, is handed
  `float shK = uShadowSoftness;` and an origin pushed by `surfEps * (2.0 + uShadowBias * 500.0)`,
  and its result is mixed by `uShadowIntensity`. A depth-buffer provider's Strength / Softness /
  Length have no path into that. Stated generically: a shadow provider declares its own parameter
  block and its own controls; the gate and the mix stay in the loop. 0.5 to 1 session, with GMT's
  emitted shader text diffed. The alternative is decision 8.14 (b).
- **The shading frame must be named.** GMT's environment sampler has up = +Y of the shading frame
  (`float t = dir.y * 0.5 + 0.5`, `acos(dir.y)`) and can only turn about Y
  (`dir.xz = uEnvRotationMatrix * dir.xz`). The page's dome has up = the fitted plane's normal
  (`skyDome(0.5 + 0.5 * dot(n, uPlaneN))`, per the lighting skeptic). So for route B to keep route
  A's picture the caller must rotate `n`, `v` and every light direction into a plane-aligned frame
  (+Y = fitted normal) - R2's JSDoc line says so - and then a loaded HDR sky visibly swims in
  reflections as the plane fit drifts. If the frame is not plane-aligned, every default view
  relights. "Dome and reflection match route A" goes into the A/B referee.

After B, materials, rim, emission, environment ambient and reflection, and Cook-Torrance are GMT's
code and GMT's uniforms in the deep zoomer. Unverified and able to move the size: how separable
`UniformManager` and the uniform schema are from the worker, and the cold-compile cost of the split
on Direct3D (ADR-0075 territory; nothing was measured). No skeptic opened `ShaderBuilder` beyond
`buildMissHandler`; route B's guards are unreviewed.

### 4.4 What will not look the same - said honestly

| GMT feature | In the deep zoomer | Why |
|---|---|---|
| Marched soft shadows (Hardness 2..2000, up to 512 steps, Lite / HQ penumbra) | Depth-buffer walk, 20 steps, softness by tilting the direction | A real shadow ray is "about a second march per shadowed light" (page comment) |
| Shadows from off-screen or hidden casters | None | The walk sees one depth layer and only the picture |
| Shadows on every light | At most 2 to 3 lights | 20 texel reads per pixel per shadowed light |
| Point light in World | Becomes directional; its Range never or always cuts off | At 1e-30 a light at (-2, 1, 2) is 1e30 view-widths away. Geometry, not code |
| Point light falloff | Matches GMT's Quadratic only in view units; Linear needs one more term in the loop | Lengths never enter f32; they are logs relative to the view scale |
| Sphere lights, emitter balls, Shadow Jitter | Absent | Need path tracing or marcher GLSL |
| Marched ambient occlusion | Screen-space, 10 taps | Same reason as shadows |
| Raymarched reflections | Environment reflection only | A second march needs a new reference orbit |
| Environment "up" | Route A: the fitted plane's normal, not world Y. Route B: +Y of whatever frame the caller shades in - plane-aligned to match A, and then an environment map swims with the fit | There is no meaningful world up at depth |
| A Surface light when the camera turns | Turns with the camera; only its elevation is tied to the surface | `rigDir` takes its azimuth from the camera's right and up |
| Cast Shadows on a 4th light | Box disabled past the cap | 20 texel reads per pixel per shadowed light |
| Lighting of an exported still | Rig measured afresh at export, so it can differ slightly from the live frame | The live rig eases toward each plane fit; export blocks and measures now |
| A light saved here, opened in GMT | Surface reads as Camera; lengths must be converted by the handoff | GMT has no plane fit and uses world units |
| LFO / audio on lights | Works only if the shell feeds its modulation map to `packLights` | The offsets are added inside the packer |
| Tiled high-res export | Shading runs after the whole depth buffer is assembled | Shadows and occlusion read the whole picture |
| Above a surface distance of 1e-4 | The module's f32 path has no G-buffer, rig or N lights (**unverified**) | Force the deep path in the shell (0.25) or accept the gap |

### 4.5 Steps, each leaving both apps working

| Step | What | Where | Size | Guard |
|---|---|---|---|---|
| L0 | N-light loop in pass S + three placement modes; default rig reproduces today's frame | module | 1.5 | picture-equality referee on the GPU |
| L-guard | Written FIRST, against today's code, each falsified once: (1) a light round-trip node test with real scenes - one `fixed: true` preset, one flat-key preset, one partial merge; (2) a packing test with a non-zero modulation entry for each of the 8 `LIGHT_PROPS` and one `fixed: true` light; (3) a smoke that toggles attachment through each of the three toggles and asserts the light's screen position does not jump | GMT | 1 | These ARE the guards. `debug/test-gmf-roundtrip.mts` has zero lines matching `light`; `test:modulation-coverage` checks routing, not that `syncFrame` applies the offset; `smoke:chrome` fails on a page error and asserts no light position |
| L1 | Light list split out of `LightingFeature` (same id `lighting`, key `lights`, short ids) | GMT | 1 | L-guard (1); `typecheck`; `smoke:engine-gmt` (boot only) |
| L2 | `packLights(lights, viewFrame, modulations, targets)`; `syncFrame` calls it, writing in place | GMT | 0.75 to 1 | L-guard (2), bit-equal before and after |
| L3 | View-frame values; the four UI files stop importing `getProxy` / `ViewportRefs`; seven conversion sites onto one helper, each toggle keeping what it writes today | GMT | 2.5 to 3 | L-guard (3) for each toggle; `smoke:chrome` |
| L4 | `frame: 'surface'` with its two write rules, `lightFrame`, `lengthScale` on the view frame, the control that lists declared frames (two = today's control), the three-way popup design, the Surface Euler mapping | GMT | 1.5 to 2.5 | L-guard (1) extended: a Surface light opened without Surface support reads as Camera; `{ fixed }` merged onto a Surface light clears `frame` |
| L5 | Shell: its own `lighting` feature (light list + own shadow group), the deep view frame, mount the orb strip and panel, pack with its modulation map + upload, Cast Shadows cap, default Surface rig, aim-by-drag | shell | 2 to 2.5 | `smoke:deep-zoom` step: turn the pad, centre-pixel shading changes |
| L6 | Orb strip lifted out of `CenterHUD.tsx` if entangled | GMT | 0.5 to 1 | `smoke:chrome` |
| B1-B4 | R2, R1 (longer signature), R3 (with miss handler, fog, environment), R4 (shadow parameters behind the provider), the uniform feed; then pass S assembled from GMT's chunks in a plane-aligned frame | GMT + module + shell | 4.5 to 6.5 + 1 A/B + 2 | `test:shader`, `test:refine`, `test:env-sampling`; cold-compile time before and after; emitted Direct shader text diffed; "dome and reflection match route A". Unreviewed by the skeptics |
| Later | GMT plane fit (so Surface is offered in GMT) 1 to 2; positional gizmos in view units 1 to 2 | GMT | - | - |

Route A total: about 7 to 9.5 sessions in GMT (1 of them guards), 1.5 in the module, 2 to 2.5 in
the shell. Route B adds about 7.5 to 9.5. Two ADRs (light frames and length scale; surface-inputs
shading). Saved data: nothing in GMT changes; the shell's one migration is in section 6a.

---

## 5. The other systems that need rework

- **Post-process stack (sweep R1).** `postEffects` and `colorGrading` are engine features, so their
  sliders, undo and keyframes exist in every shell - and do nothing outside GMT, because only
  `engine-gmt/shaders/chunks/post_process.ts` assembles `postShader`. Seam: an engine post pass,
  "linear colour texture in, display colour out". The module drops its fixed ACES line (in the
  module, not the page). GMT risk: assembly order is load-bearing ("a subtle Map insertion-order
  change broke uToneMapping", `engine-gmt/features/index.ts`); guard by diffing GMT's emitted post
  shader. 2 to 4 days; tone map, levels and lens first is 1.5.
- **Mapping modes declare their inputs (colour reader).** Six of fifteen GMT modes work at depth
  today, four more with extra kernel outputs, three plus twist never. Seam: each mapping names what
  it reads; a param's options narrow, display-only, by what the renderer or formula provides. GMT
  gains honest menus for formulas that write no iteration count. 1 session + ADR-0059 amendment.
- **Histogram takes a data function** (component unverified). 1 session.
- **Bucket status bridge into `installBucketRender`.** Half a day; fluid-toy's comment records lost
  renders without it. Corrected: do NOT simply remove GMT's copy. GMT's handler in
  `engine-gmt/renderer/bindings.ts` does three things - `s.setIsBucketRendering?.(data.isRendering)`,
  `s.setIsExporting?.(data.isRendering)`, and on the false edge `s.setActiveRenderSampleCap?.(null)` -
  and GMT's video exporter emits the same event (`exportRunner.ts`, one `isRendering: true` site
  per frame and two `false` sites). The engine bridge sets the two flags (fluid-toy's copy sets
  both too) and is registered when `installBucketRender` is called, not when the button mounts -
  GMT installs with `when: desktopOnly`, so a mount-time bridge would drop phones. GMT keeps one
  line for the sample-cap release. No smoke runs a bucket or video render to its end (not every
  smoke was opened - unverified): treat as unguarded and check a video export by hand.
- **GPU-failure and diagnostics overlays into the engine (sweep R2).** 1 day; keep the
  `gmt.gpuCrashed` key name. The page handles context loss nowhere.
- **Camera-undo scope takes a provider.** 1 session, guard `smoke:undo`.
- **Camera-path exporters take a frame source.** 1 + 1 sessions; re-export one known GMT shot and
  diff the bytes. Limit to state before promising it: one FBX holds about 15 decades of a dive.
- **Share link carries an app id (sweep R3).** Live-table schema change; owner call.
- **Param declarations:** `modulatable: false` (half a day) and `unit: 'scene-length'` (below).

---

## 6. Cross-cutting seams, each listed once

| # | Seam (generic) | Used by | ADR |
|---|---|---|---|
| S1 | **Displacement sink**: navigation emits displacements, the renderer owns the position | fly integrator; later orbit, camera undo | new: "Navigation emits displacements" (with S7) |
| S2 | **Scene probe** - NOT in Stage N. Flying needs none: the distance is already a plain argument of the integrator. Later, with a shared HUD or focus widgets: the probe reads raw distance from a source and keeps publishing its smoothed value; `pick(x, y)` and `plane()` as optional members | later: HUD, Reset prompt, light drag-in, focus lock, orbit pivot | its own ADR when built |
| S3 | **View frame**: orientation, relative position, length scale, surface normal, declared support - plain values, built by whoever calls (in GMT: the worker and the UI, separately) | Light Studio UI, light packer, gizmos, `OverlayProjection.storeToWorld` | new: "Lights resolve against a view frame" (with S4) |
| S4 | **A third frame on placed things** (`frame: 'surface'`, stored only for the third value, `fixed: true` beside it) **and a length scale the renderer declares** (not stored on the thing) | lights now; fog distances, focus distance, drawn shapes later (sweep M1) | same ADR |
| S5 | **Surface-inputs shading**: footprint as an argument, `shadeSurface` (with `pAbs`, `d`, `epsRateBase`), shading-only builder variant that still carries the miss handler, fog and environment, shadow and occlusion providers by name each owning its parameter block, a named shading frame | deep zoomer's pass S; GMT's reflection hits and path tracer later | new: "Shading takes a surface" |
| S6 | **Light packing as a pure function** taking the modulation map and writing in place | GMT worker, deep zoomer adapter | under S3's ADR |
| S7 | **Renderer-free input hook** with a wheel-step function, a suppress predicate and three activity edges | GMT, deep zoomer, fractal-toy | under S1's ADR |
| S8 | **Post pass over any colour texture** | GMT, deep zoomer, fluid-toy | new: "Post-process runs outside the worker" |
| S9 | **Mappings declare inputs; options narrow by capability** | colouring menus, later texturing | ADR-0059 amendment |
| S10 | **Providers with today's behaviour as default**: camera-undo state, export frame source, histogram data, bucket status | several | none (no decision changes) |

ADR numbers are taken at write time; 0131 and 0132 already exist on the audio branch.

### 6a. Saved data: every rework that touches it, and its migration

| Rework | What is saved | Migration |
|---|---|---|
| Stage N (integrator, input hook) | Nothing. `sceneOffset`, `cameraRot`, `targetDistance` are written by the same code as today | None |
| Distance source (deferred) | `targetDistance` is saved from `engine.lastMeasuredDistance` | None, on the condition in 3.2 b: the probe keeps publishing its smoothed value there |
| `VirtualSpace` / package F8 | Would change saved `sceneOffset` values | Not part of this job; no saved value moves |
| Light `frame: 'surface'` (L4) | One optional key on a light, written only for Surface, always with `fixed: true` | None in GMT: GMT never writes it. Readers that do not know it see Camera. No scene version bump |
| Light length scale (L4) | Nothing: declared by the renderer, not stored | None. GMT numbers keep their meaning. Lights crossing between the apps are converted in `deep-zoom/handoff.ts` |
| Light list split (L1), packer (L2), UI (L3) | Same feature id `lighting`, same key `lights`, same short ids | None; proven by L-guard (1) |
| Shell `dzLight` sliders -> light list (L5) | `keyElevation`, `keyTurn`, `lightTint`, `lightType`, `lampFalloff` leave `dzLight` | The shell stamps a scene version from its first saved file; L5 ships one migration that turns the five values into the default Surface rig. Saved places and flight paths made before L5 go through it too |
| Shell `fov` param | A new shell param | Absent reads as 34.1, the page's value |
| Flight-path format v2 (only if roll is on, decision 8.3) | Orientation as a quaternion | v1 files read as yaw / pitch with roll 0; v1 is never rewritten |
| Mapping modes declare inputs | The stored mode number does not change | None: an unsupported stored mode stays stored and shows as unavailable; it is not rewritten |
| Share link gains an app id | A live table row | Rows without an app id read as GMT scenes (column nullable or defaulted). Backend not opened - unverified; owner call |
| Camera-undo provider | Undo history (session-only as far as the readers saw - unverified) | None expected |
| Post-process stack, GPU-failure overlays, bucket bridge, exporter frame source, histogram | No stored value changes; `postEffects` / `colorGrading` ids and the `gmt.gpuCrashed` key keep their names | None |

---

## 7. What this changes in the shell's build plan

Notes for the blueprint's authors; I did not edit their files.

1. **BLUEPRINT section 2 ("under a host the renderer keeps fly keys only", `host.setHotkeys('fly')`)
   becomes the interim, not the design.** Stage 1 still flies on the page's loop. A new **Stage N**
   (packages N0, N2, N0b, N3 in the engine and GMT - there is no N1 any more - N4 in the module,
   N5 in the shell) can start beside stage 2 - it
   shares no file with the shell integrators - and N5 lands after stage 4 (keys) and **before stage
   6**, so recorded flights are flown with the final controls. After N5 the module runs with host
   input and S4-1's fly-key relay is deleted.
2. **DECISIONS D3 (three key meanings change) should be re-opened**: with GMT's map, vertical is
   Space/C and Q/E are roll or unbound. **D10 (phone)** changes too: flight no longer needs pointer lock.
3. **BLUEPRINT plugin table, "PauseControls / BucketRender: not used" is half wrong**
   (render-export-anim): only `BucketRunner` is three.js-bound. Add to stage 2 an
   `AccumulationController` adapter + `installPauseControls()`, and to stage 6 a bucket controller.
   Module needs `pause`, a sample-target setter and a public reset.
4. **`dzLight` (S2-2) is the interim for the Light Studio.** Stage 2 ships the plain sliders. A new
   **Stage L** (L0 in the module any time; L1-L4 in GMT; L5 in the shell) lands after stage 5. At L5
   the light list is the feature `lighting` with key `lights`; `keyElevation`, `keyTurn`,
   `lightTint`, `lightType`, `lampFalloff` leave `dzLight`; shadows, occlusion, sky, roughness, haze
   stay. So the shell must stamp a scene version from its first saved file and L5 ships a migration
   that turns the five slider values into the default Surface rig.
5. **`dzColour` (S2-2, S5-1) should use GMT's mode numbers (0, 1, 5, 7, 8, 13) and GMT's
   `scale` / `offset` / `bias` names from the start** - one session, no GMT change, and a GMT
   colouring block then reads across.
6. **Stage B** (GMT's shading chunks in pass S) and the post stack go after stage 7; both need the
   module transport, not the iframe.
7. **BUILD-PLAN's R packages edit the page master on `kernel-perf`.** The owner's later instruction
   freezes the page; `deep-zoom/renderer/` exists in the worktree (`core.js`, `core.d.ts`, `port`).
   Every module handle in this document (`setInputOwner`, `rawDist`, basis input, `fov`, N lights,
   `pause`, `setGradientTexels`, `pick`) belongs in the module. Stage N's N4 can still be proven on
   the iframe transport with handles that exist today (`__moveAlong`, `__lockInput`,
   `__smoothedDist`), except orientation, which needs the new handle.
8. **Smoke growth:** add to `smoke:deep-zoom` at N5 "hold W 1 s with host input, `getView().cam`
   changed and the page's own key handler did not fire"; at L5 "turn the pad, centre pixel changes".
9. **Hold the first push** until the owner says ship (sweep M6: a new HTML entry joins the precache).

---

## 8. Decisions only the owner can make

1. **Is GMT's navigation the deep zoomer's flying?** Yes (about 5.75 sessions, one master, the
   on-screen sticks on phones) / keep the page's loop (0 now, a permanent second copy). **Recommend
   yes**, as Stage N. Know before saying yes: up/down follows the camera, held keys are normalised,
   and the horizon is kept level by the shell (3.1).
2. **Mouse look.** GMT's left-drag rate control / the page's pointer lock (`cam.yaw += e.movementX*0.0009`).
   **Recommend GMT's drag-look**; if pointer lock is missed, add it once, as a second look source in
   the engine hook, where GMT gets it too.
3. **Roll.** Off in v1 (Q/E unbound, yaw/pitch, flight-path format unchanged) / on (module takes a
   basis, +0.5, and path format v2, +1). **Recommend off in v1.**
4. **Fly speed.** GMT's default (0.5 x distance per second: a full dive is 5.9 minutes, 89 seconds
   with Shift) / the page's (3.6: 49 seconds). **Recommend the shell passes range 0.01..8 and
   default 3.6**, shown as a number; GMT's range and default stay.
5. **Which distance.** Nearest surface (the module's, exact, slows near any wall) / under the
   crosshair (GMT's meaning; needs `pick`). **Recommend nearest.** It is the shell's own argument
   to the integrator, so nothing in GMT has to know which it is.
6. **Light attachment in the deep zoomer.** Surface and Camera offered, World listed and disabled
   below about 1e-6 / all three always. **Recommend the first.**
7. **Does GMT get Surface lights now?** (a) Not shown in GMT until GMT has a plane fit: GMT's
   attachment control stays exactly as it is, and Surface has one implementer for now / (b) shown
   but disabled in GMT with a reason (a visible change to a shipped control for no GMT gain) /
   (c) build GMT's plane fit inside stage L (+1 to 2 sessions) so the option has two implementers
   the day it lands. **Recommend (a)**, with (c) as its own later change and its own A/B. Both
   skeptics objected to (b), which the first version of this document proposed.
8. **Route A only, or A then B?** **Recommend A now, B after stage 7 as its own project** with a
   cold-compile measurement and a picture A/B on GMT before it merges.
9. **Light count.** Keep 8 for one shared list, shadows on at most 3 in the deep zoomer (declared,
   not hidden) / a per-renderer cap. **Recommend 8.**
10. **Post stack: when.** After stage 7, tone map / levels / lens first (1.5 days), bloom second.
11. **Share link schema** (live table, backend repo not opened). Needed before "look at this at
    1e-40" links are short. Recommend deciding after stage 3 shows how long the packed link is.
12. **F8 stays out.** Confirm: nothing here needs `VirtualSpace` changed, and no saved value moves.
13. **Who edits the module once the port lands** (BUILD-PLAN D2 assumed the page master).
14. **Shadow rows after route B.** (a) A shadow provider owns its parameter block and its controls
    (rework R4, 0.5 to 1 session; the shell keeps Strength / Softness / Length) / (b) the deep
    zoomer's shadow controls become GMT's Opacity / Hardness / Bias with new meanings (0 sessions,
    same names for different quantities). **Recommend (a).** Not needed until stage B.
15. **A slow key.** Neither app has one for flying (Alt slows only roll and the wheel step in GMT;
    the page has no Alt). Leave it out / add Alt = 0.1x to the shared integrator, which changes
    GMT's feel too. **Recommend leave it out** unless he wants it in both.
16. **The name "Surface".** The light keeps its elevation above the surface but turns with the
    camera. Keep the name / pick another (names only, his call) / make it truly surface-fixed
    (azimuth from a stored tangent instead of the camera; new behaviour, not the look approved on
    the page; about 1 session in the module). **Recommend keep the behaviour, his call on the name.**
17. **Up and down.** Along the camera's up, as GMT (free with the shared integrator) / along world
    Y, as the page (the shell would subtract and re-add the vertical part of each displacement in
    its sink; 0.25 session; no GMT change). **Recommend GMT's**, one master.

---

## 9. Unverified, and what could move a size

- Opened by me in the first pass: `CameraController.update` only; everything else rested on the
  nine readers. In the correction pass I grepped the files listed at the top for each quoted line;
  I did not read them top to bottom.
- Resolved since the first pass: `getProxy()` only constructs the proxy object and
  `get sceneOffset() { return this._localOffset; }` works with no worker (`new Worker(` is further
  down, in an init path), so the four Light Studio files import and render without GMT's worker
  today, against a zero offset. L3 therefore does not strictly have to precede L5. No existing
  script drags a light or flies (grep of `debug/*.mts`).
- Still unverified after the correction: the converter for the flat `light0_fixed` preset form;
  whether GMT's light vector points toward or away from the light; whether `test:interaction*`
  reaches `useInputController`; `ShadowControls.tsx` (reads `shadowsCompile`, `areaLights`,
  `shadowAlgorithm` per the lighting skeptic) and where it is mounted; the page's `tint: 0.5` /
  `fillCol` defaults; the modulation deltas' definition above the light block.
- No reader opened: `HudOverlay.tsx` body, `CenterHUD.tsx` body, `components/MobileControls.tsx`,
  `coloring-histogram`, `GmtRendererTickDriver.tsx`, `UniformManager` separability from the worker,
  the shared-scene backend. (`engine-gmt/renderer/bindings.ts` is now read: its `BUCKET_STATUS`
  handler is quoted in section 5.)
- Not measured: compile time of a looped `SHADE_FRAG`; cold-compile cost of splitting
  `calculateShading`; whether the module's f32 path (surface distance above 1e-4) can run pass S.
- Not reviewed by any skeptic: route B's guards, the post-process stack, the camera-undo provider,
  the exporters, the share link, the tutorial.
- `deep-zoom/renderer/` appeared during this job (`core.js`, `core.d.ts`, `harness.ts`, `index.ts`,
  `port`); its contents were not read.

---

## 10. Skeptic findings: taken, and not taken

Taken (each fixed in the text above): navigation 1 (roll from yaw), 2 (distance source out of
Stage N), 3 (Alt), 4 (hook contract and wheel law), 5 (differences from the page); lighting 1
(shadow names vs route B), 2 (miss handler, fog, environment, signature), 3 (environment up), 4
(Surface is single-consumer and misnamed; Euler mapping; portability), 5 (packing and UI
undercounted); regression 1 (distance written back and saved), 2 (packing drops modulation), 3
(two fields for one fact), 4 (bucket bridge, in part), 5 and 6 (guards do not touch the code), 7
(seams GMT pays for).

Not taken, or taken differently:

1. **Regression 4, one detail: "fluid-toy's copy calls only `setIsBucketRendering`."** Wrong. I read
   `s.setIsBucketRendering?.(data.isRendering); s.setIsExporting?.(data.isRendering);` in
   `fluid-toy/main.tsx`. So the engine bridge sets both flags, not one; only the sample-cap release
   is GMT's own. The rest of the finding (video export emits the event; install time, not mount)
   holds and is in section 5.
2. **Regression 3, the fix "gate `lengthUnit` behind a scene version."** Not taken as written. A
   version gate still leaves a stored number whose meaning depends on a sibling field. The unit is
   no longer stored on the light at all (4.2 item 3), which removes the misread instead of
   detecting it.
3. **Regression 3, "neither `engine/migrations.ts` nor `app-gmt/migrations.ts` contains a light
   entry (grep `light`)."** The grep is not clean: `app-gmt/migrations.ts` has six matching lines,
   all about the environment light (`f.materials?.envStrength`). The substance holds - nothing
   there migrates a light record - and the corrected design needs no migration.
4. **Navigation 1, fix (b): an `upAxis: 'local' | 'world'` setting on the integrator.** Not taken.
   Fix (a), the shell writing a levelled quaternion back each frame, costs GMT nothing and adds no
   setting that only one app would use.
5. **Lighting 4 / regression 7, fix "schedule GMT's plane fit inside stage L."** Not taken as the
   default. The other fix both offered (do not show an option the renderer does not declare) keeps
   GMT's shipped control untouched and costs nothing; the plane fit stays decision 8.7 (c).
6. **Lighting 1, option (b): reuse GMT's Opacity / Hardness / Bias with new meanings.** Not
   recommended (same names for different quantities); left to the owner as decision 8.14.
7. **Navigation 2, "touches about 15 readers."** The step as first written changed only the probe;
   the fifteen are readers of the global it writes. The conclusion (remove the step) is taken for
   the write-back reason, not this one.
8. **Lighting 4, "`lengthUnit: 'view'` is the more genuinely generic ... GMT already has a view
   scale."** True, but no GMT use was named by anyone (regression 7), and the skeptic's own
   unverified note (is `lastMeasuredDistance` steady enough to scale a Range without popping, does
   it reset accumulation) is a reason not to wire it into GMT now. GMT's length scale stays 1.
