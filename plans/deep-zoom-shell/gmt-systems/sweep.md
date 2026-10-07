# Sweep - every GMT system outside navigation and lighting, judged for a Mandelbulb-only deep zoomer

Reader: sweep (one of nine). 2026-10-07. Read-only pass, about 12 minutes; nothing was run.
Verdict words: AS-IS, ADAPTER, REWORK, NOT-NOW (as defined in the brief).

How deep I read: for each file below I read the head (the top JSDoc, the state interface, the first
params) and grepped for the decisive symbols. I did not read any file to the end. Engine plugin
verdicts lean on `plans/deep-zoom-shell/BLUEPRINT.md` section 1 and `ENGINE-GAPS.md`, which I read;
the plugin sources themselves I did not open (listed under Unverified).

---

## 1. The one fact that decides most of the feature verdicts

Every feature under `engine-gmt/features/` is two things glued together: a DDFS parameter schema
(panel rows, undo, keyframes, saves) and GLSL text that is injected into GMT's worker shader.

- `engine/FeatureSystem.ts`, `FeatureDefinition.inject` and `.postShader`:
  `inject?: (builder: any, config: ShaderConfig, variant: RenderVariant) => void;` and
  `// postShader: injects GLSL into the POST-PROCESS shader ... Consumed by shaders/chunks/post_process.ts.`
- The GLSL assumes names that only exist inside GMT's marcher. `engine-gmt/features/atmosphere/index.ts`:
  `// Variables in scope: col, d, glow, volumetric, fogScatter`.
  `engine-gmt/features/reflections/index.ts`: `// Variables in scope: p_ray, p_fractal, v, n, albedo, roughness, F, F0, NdotV, reflDir ...`.
- The deep zoomer has no world-space `p`, no distance function it can call again from a hit point
  (perturbation needs a reference orbit), and its shading pass works from a G-buffer.

So a GMT feature can never be "registered and it works". The parameter half is reusable; the GLSL
half is not. Where the same effect is wanted, the honest routes are (a) a shell feature with its own
params feeding the renderer module, or (b) lifting the effect to a place both renderers can reach.
Only screen-space effects qualify for (b) - see rework R1.

Second fact: the page already bakes in one tone map and has no bloom, fog, glow or vignette.
`mandelbulb_deepzoom/index.html` line 1364:
`col = (col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14);   // ACES filmic tone map (Narkowicz)`;
a case-insensitive count of the page gives fog 0, glow 0, bloom 0, vignette 0, gamma 0.

Third fact: GMT's distance-valued params are in absolute world units.
`engine-gmt/features/atmosphere/index.ts`: `float fogFactor = smoothstep(uFogNear, uFogFar, d) * uFogIntensity;`
`engine-gmt/features/optics.ts`: `dofFocus: { ... min: 0.000001, max: 10000.0, ... scale: 'log' }`.
`engine-gmt/features/water_plane.ts`: `height: { ... min: -10.0, max: 10.0 }`.
At a surface distance of 1e-30 every one of these is off the end of its slider. No reader's brief
names this; see "missed" item M1.

---

## 2. Table - GMT features (`engine-gmt/features/`, registered in `features/index.ts` `registerFeatures`)

| Sub-system (file read) | What it assumes today | Verdict | The rework, stated generically | Size | What GMT gains or risks |
|---|---|---|---|---|---|
| atmosphere (`atmosphere/index.ts`, `FOG_POST_PROCESS`) | Distance fog and glow composited inside the marcher from `d`, `glow`, `volumetric`; fog start/end in world units | ADAPTER for depth fog: the G-buffer already has depth, so a fog term in the renderer module's shading pass with shell params, expressed in view depths. Glow: NOT-NOW (needs a per-ray accumulator the kernel does not keep) | none to GMT | 0.5 day in the module | none |
| volumetric (`volumetric/index.ts`, `VolumetricFeature`) | God rays: marches light scatter per step (`col += fogScatter`), needs lights in world space and a callable distance function | NOT-NOW. Applies when the kernel can evaluate shadow rays along the view ray, which perturbation cannot do cheaply | - | - | - |
| water_plane (`water_plane.ts`) | A world-space plane at `height` in [-10, 10] united with the fractal | NOT-NOW. A fixed plane has no meaning at 1e-30; would apply only as "a plane hung off the fitted surface plane", which is a new effect | - | - | - |
| droste (`droste/index.ts`) | Screen-space UV warp through `postShader.mainUV` in GMT's post pass | NOT-NOW by itself; becomes AS-IS for free if R1 lands (it is pure screen space) | see R1 | - | - |
| drawing (`drawing/index.ts`, `DrawnShape.center: PreciseVector3`) | Measuring shapes anchored at offset-pair world positions, DOM overlay via `viewportConfig` | NOT-NOW. Would apply with a "ruler" for depth scale; position type is the navigation reader's offset pair, good to 1e-16 only | - | - | - |
| fragmentarium_import (`fragmentarium_import/index.ts`) | Formula Workshop: turns .frag source into a GMT formula for the f32 marcher | NOT-NOW. Applies only when the deep zoomer takes a second formula; each formula needs a hand-derived perturbation delta, which no importer produces | - | - | - |
| reflections (`reflections/index.ts`, `REFL_MODE_ENV`, `REFL_MODE_RAYMARCH`) | Env-map reflection or a second raymarch from the hit point | Raymarched: NOT-NOW (second march needs a new reference). Env-map only: ADAPTER - the G-buffer has the normal, the page's look already has `refl`, `rough`, `metal` (page line 1562) | - | env-map reflection in the module: 1 day | none |
| materials (`materials.ts`, `MaterialState`) | diffuse / specular / roughness / rim / emission / env map and sky source as uniforms in GMT's shading chunk | ADAPTER - owned by the "GMT shading code" reader; listed for completeness. The page's `LOOK0` already carries diffuse, rough, metal, refl, sky | - | - | - |
| ao (`ao/index.ts`, `AOState`) | AO by extra distance-function taps along the normal; compile-time toggle | ADAPTER - the page does AO from the depth buffer instead. Same names, different maths; shell feature `dzLight` holds its params | - | 0 | none |
| texturing (`texturing.ts`) | An image sampled by `mapU` / `mapV` mapping modes computed in the iteration loop | NOT-NOW. Applies when the kernel exports a second mapping value; the G-buffer has one palette parameter | - | - | - |
| coloring (`coloring/index.ts`) | owned by the colour reader | - | - | - | - |
| geometry (`geometry/index.ts`, `GeometryState`: pre/post/world rotation, burning, folds) | Transforms applied to `p` inside the f32 loop | NOT-NOW. Each one changes the iteration, so each needs its own perturbation form. World rotation alone is ADAPTER (rotate the camera basis) | - | - | - |
| core_math (`core_math.ts`, `paramA..F`, vec slots, `iterations`) | The generic formula parameter pool GMT formulas bind to | NOT-NOW. The deep zoomer has power, phase, iterations as named params of its own feature (BLUEPRINT `dzFormula`) | - | - | - |
| weave (`weave.ts`) | Interleaves several formulas by iteration schedule | NOT-NOW. Hybrid perturbation is research, not a port | - | - | - |
| quality (`quality.ts`), optics (`optics.ts`), navigation (`navigation.ts`), camera_manager, lighting, light_spheres, rotation_gizmo | owned by other readers | - | - | - | - |
| engine / Shader Compiler (`engine/index.ts`, `ShaderCompilerFeature`) | A tab that hosts GMT's compile-time switches and viewport quality profiles | NOT-NOW. The deep zoomer has one kernel and a handful of compile toggles; ENGINE-GAPS E31 already records the generic gap | - | - | - |
| ui (`ui.tsx`, `registerGmtUi`) | Registers GMT widgets (histogram, scene widgets, Julia randomize, compiler and camera panels) into `componentRegistry` | NOT-NOW as a block; individual widgets are for the colour and camera readers | - | - | - |
| postEffects (`engine/features/post_effects.ts`: bloom, chromatic aberration) | Params are engine-level, but the GLSL is `postShader` text and bloom reads `uBloomTexture`, "composited by BloomPass in worker" | **REWORK (R1)** | below | M-L | below |
| colorGrading (`engine/features/color_grading.ts`: `uToneMapping`, `uSaturation`, `uLevelsMin/Max/Gamma`) | Same: `postShader` consumed only by `engine-gmt/shaders/chunks/post_process.ts` (`if (feat.postShader) { ... injectedUniforms += ...`) | **REWORK (R1)** | below | with R1 | below |
| modulation + audio (`engine/features/modulation/index.ts`, `audioMod`) | Rules route an LFO or audio band to any DDFS param id | AS-IS for look params once the shell's features are DDFS; BLUEPRINT defers it because power / phase / iterations rebuild the reference orbit. The missing piece is a generic "this param is expensive, do not modulate" flag (a param declaration, not an app check) | optional `modulatable: false` on a param config | S | GMT could mark its own compile-mode params the same way |
| webcam (`engine/features/webcam/index.ts`) | A DOM picture-in-picture overlay with its own params | AS-IS (it is a DOM overlay, renderer-independent); needs the `<FeatureOverlays/>` host of ENGINE-GAPS E2 | - | 0 | - |
| debugTools (`engine/features/debug_tools/index.ts`) | Shader / state debugger overlays; the interaction-session overlay | AS-IS for the state debugger; the shader debugger reads GMT's compiled source - NOT-NOW | - | - | - |

## 3. Table - engine plugins (`engine/plugins/`)

Verdicts for these come from BLUEPRINT section 1, which adopts them by exact call; I add only what
this sweep changes.

| Sub-system | What it assumes today | Verdict | Rework, generic | Size | GMT gains / risks |
|---|---|---|---|---|---|
| TopBar, Menu, Shortcuts, Undo, Hud, Help, WhatsNew, PwaUpdate, Session, SceneFileClaims, Tutorial | Renderer-agnostic registries | AS-IS (BLUEPRINT rows; small gaps E5, E7, E12, E25-E27 already listed) | - | - | - |
| SceneIO | One synchronous canvas for PNG snapshots | ADAPTER, REWORK only if the PNG is blank (E8). The page's context is `preserveDrawingBuffer:false` (page line 299), so E8 is likely needed | `getSnapshot(): Promise<Blob>` | S | none |
| Viewport (`viewport/ViewportFrame`, `AdaptiveResolutionBadge`, `FixedResolutionControls`, `InteractionSessionBadge`) | The frame's resolution and adaptive controls write the engine slice and GMT's `quality` | ADAPTER with controls hidden (E3, E4). See missed item M3 | resolution sink | S-M | - |
| RenderLoop | App calls `runTicks` | AS-IS | - | - | - |
| RenderDialog (`RenderDialog/`), `topbar/BucketRender*`, `PauseControls` | owned by the render / export reader | - | - | - | - |
| Camera (`Camera.ts`, `camera/presetField.ts`), `navigation/core` | owned by the navigation and camera readers | - | - | - | - |

## 4. Table - app-gmt and the GMT library around it

| Sub-system (file read) | What it assumes today | Verdict | Rework, generic | Size | GMT gains / risks |
|---|---|---|---|---|---|
| Context-lost overlay (`app-gmt/RenderContextLostOverlay.tsx`) | Lives in app-gmt but listens to an engine event: `FractalEvents.on(FRACTAL_EVENTS.RENDER_CONTEXT_LOST, ({ reason }) => ...`; only `engine-gmt/engine/worker/WorkerProxy.ts` emits it; recovery uses the `gmt.gpuCrashed` session flag | **REWORK (R2)** | below | S | below |
| Diagnostics overlay (`app-gmt/DiagnosticsOverlay.tsx`, `?diag`) | Imports `engine-gmt/engine/webglDiagnostics` (`collectBootDiagnostics`) and `engine-gmt/feedback/FeedbackClient` | **REWORK (R2)** | below | with R2 | below |
| Loading screen (`app-gmt/LoadingScreen.tsx`, `LoadingRendererCPU.ts`) | "verbatim port of gmt-0.8.5"; formula picker from `engine-gmt/engine/FractalRegistry`, compile bar from `store/CompileProgressStore`, CPU Julia spinner | NOT-NOW as a component (it is GMT's splash, do not parallel it). ADAPTER for the need: the shell shows its own short "compiling" state from the host's compile handle (BUILD-PLAN handle H5). Would become REWORK only if the owner wants one splash for all shells | - | 0.5 day in the shell | - |
| Settings host (`app-gmt/SettingsHost.tsx`, `engine-gmt/installGmtSettings.tsx`) | `registerCoreSettings(...)` is generic; `registerGmtSettings()` adds GMT hardware caps (staged, recompiles) and UI mode | AS-IS for core settings (BLUEPRINT uses it); GMT settings NOT-NOW | - | - | - |
| Help extras (`app-gmt/HelpExtras.tsx`), `engine-gmt/support.ts` (`gmtSupportConfig`) | About body (version, GPU, credits) is GMT content; support config is already shared by every shell | Support: AS-IS. About body: ADAPTER (the shell writes its own) | - | 1-2 hours | - |
| Tutorial lessons (`app-gmt/tutorial/lessons.ts`, `anchors.ts`, `triggers.ts`, `stepKinds.tsx`) | GMT lessons seeded on the Mandelbulb formula in GMT's registry | NOT-NOW (GMT content). The engine Tutorial plugin is AS-IS; the shell writes its own lesson | - | - | - |
| Migrations (`app-gmt/migrations.ts`) | App registers slice migrations; the engine applies them inside `loadPreset` before any setter | AS-IS (machinery). The shell registers none on day one but must stamp a version from its first saved file | - | 0 | - |
| Share link (`engine-gmt/topbar/ShareLinkButton.tsx`, `engine-gmt/gallery/sharedScene.ts`) | `createSharedScene(gmf: string, meta)` posts `{ gmf, title, formula }`; the row is `gmf_text`; the reader opens it as a GMT scene | **REWORK (R3)** | below | M | below |
| Gallery (`engine-gmt/gallery/installGallery.tsx`, `loadGalleryScene.ts`, `SubmitGalleryModal.tsx`) | Curated catalogue of GMT scenes; submission uploads a GMF plus image | NOT-NOW for browsing inside the shell; the payload question is the same as R3 | with R3 | - | - |
| Auth (`engine-gmt/auth/installAuth.tsx`) | Profile chip in the top bar, overlays | AS-IS, but only worth mounting once R3 exists (it only matters for "my shares") | - | - | - |
| Feedback (`engine-gmt/feedback/installFeedback.tsx`) | A dock panel opened from Help; reads the engine store | AS-IS (BLUEPRINT uses `feedbackPanelEntry()`) | - | - | - |
| explorerTrip (`app-gmt/explorerTrip.ts`) | Carries GMT's current gradient to the Gradient Explorer through a one-shot key; resolves from GMT's send targets | ADAPTER today (the shared My Gradients shelf already crosses apps); the generic fix is ENGINE-GAPS E28 | E28 | M | - |
| Mobile shell (`engine/components/MobileViewportShell.tsx`, `LandscapeGate.tsx`, `components/MobileControls.tsx`) | Phone layout plus on-screen sticks that drive GMT's navigation | NOT-NOW: flight needs pointer lock (page has 5 `pointerlock` hits; BLUEPRINT DECISIONS D10). Applies when the navigation readers define a touch flight input; then the sticks belong to their rework, not to a new shell copy | - | - | - |
| GMT top-bar widgets (`engine-gmt/topbar/AdaptiveResolution.tsx`, `ViewportQuality.tsx`, `CenterHUD.tsx`, `GmtBucketController.ts`) | Read `s.quality` and call `getProxy()` (the worker) | NOT-NOW; the shell registers its own status chip | - | - | - |
| Render adjuncts (`AfxRenderAdjunct.tsx`, `FbxRenderAdjunct.tsx`, `renderDialogExtras.tsx`) | owned by the export and camera readers | - | - | - | - |

---

## 5. The three reworks that matter most to a deep-zoom user (outside navigation and lighting)

### R1 - a post-process stack any renderer can run (bloom, lens, tone map, levels, and Droste for free)

Today: `postEffects` and `colorGrading` are engine features (`engine/features/index.ts` registers
both for every app), so their panel rows, undo and keyframes already exist in any shell. But their
effect is GLSL text in `postShader`, and the only code that assembles `postShader` is
`engine-gmt/shaders/chunks/post_process.ts`, inside GMT's worker. Bloom additionally depends on a
worker-side pass (`// Multi-Pass Bloom (composited by BloomPass in worker)`). A shell that
registers these features gets working sliders that do nothing.

Rework, generic: an engine-level "post pass" - a small module that takes the registered features'
`postShader` blocks, builds one fragment shader, and runs it over a colour texture supplied by
whichever renderer the app has. GMT's worker becomes its first caller; the new shell's renderer
module hands it the shading pass output (and drops its hard-coded ACES line in the module, not the
page). No renderer names in the engine; the contract is "linear colour texture in, display colour
out".

Why it matters most: the page's picture has no bloom and one fixed tone curve; GMT users expect
both, and Droste (a pure UV warp) arrives with no extra work.

Size: M-L, 2 to 4 days, plus an ADR. Bloom is the expensive part (its blur passes must move with
it); doing tone map, levels, saturation and lens first is about 1.5 days.

GMT gains: the post pass becomes testable outside the worker, and fluid-toy can use it. Risks: the
assembled shader must stay byte-identical for GMT, and `engine-gmt/features/index.ts` already
records a trap here - "a subtle Map insertion-order change broke uToneMapping declaration during
post-pass compile". Order of assembly is load-bearing; guard it by diffing GMT's emitted post
shader before and after.

### R2 - GPU failure and diagnostics surfaces belong to the engine, not to app-gmt

Today: the context-lost prompt and the `?diag` report are app-gmt files. The first already speaks
an engine event (`FRACTAL_EVENTS.RENDER_CONTEXT_LOST` in `engine/FractalEvents.ts`), but only GMT's
`WorkerProxy` emits it. The second imports `engine-gmt/engine/webglDiagnostics`. The page handles
context loss nowhere (0 hits for `webglcontextlost`), and deep zoom is the heaviest single-frame
GPU load in the product - the case the overlay's own header names ("a too-heavy frame on a weak
mobile GPU; also Windows TDR on desktop").

Rework, generic: move both overlays into the engine as components any app mounts; any renderer
reports loss by emitting the existing event; the capability report takes a WebGL context as an
argument instead of assuming the worker's; the "safe mode on next boot" flag becomes a per-app key
with an app-supplied downgrade callback. The shell's host then emits the event from the module's
canvas (an adapter of about 10 lines).

Size: S, about 1 day including GMT re-pointing its imports. No ADR needed (no decision changes).

GMT gains: fluid-toy and the Gradient Explorer get the same recovery. Risk: low; the one thing to
keep is GMT's `gmt.gpuCrashed` key name, or users mid-recovery lose the safe-mode boot once.

### R3 - a shared link that says which app it is for

Today: `createSharedScene(gmf, meta)` uploads GMF text and the row is `gmf_text`; the link is
`?s=<id>` on GMT's origin and the reader loads it as a GMT scene. A deep-zoom location is the thing
its users most want to pass around ("look at this at 1e-40"), and the BLUEPRINT's own share route is
a preset packed into the URL - which carries three 256-bit coordinates as strings and grows long.

Rework, generic: the shared-scene record gains an app id and an opaque text payload (GMF stays the
payload for GMT); the client becomes `createSharedDocument(appId, text, meta)`, and the link opener
resolves the app id to an entry page. The share button moves from `engine-gmt/topbar/` to a shared
place and takes "how to serialise the current scene" as a prop. Same change lets the gallery hold
non-GMT entries later.

Size: M, 1 to 2 days of client work plus a backend migration and edge-function change (separate
repo, not opened - unverified). Needs the owner: it is a schema change on a live table.

GMT gains: fluid-toy scenes become shareable by the same link. Risk: existing `?s=` links must keep
resolving - default the app id to GMT for old rows.

Runner-up, small: a param-level "do not modulate" declaration so LFO / audio can be installed in
the shell without rebuilding the reference orbit every frame (S, half a day).

---

## 6. Systems the other eight briefs would likely miss

- **M1 - absolute-distance parameters.** Every GMT param that is a length (fog start / end, DOF
  focus distance, water height, volumetric height origin, drawn shape sizes) is a world-unit
  number with a fixed slider range. Under deep zoom the natural unit is "multiples of the current
  surface distance". If any GMT look feature is ever shared with the deep zoomer, the generic
  rework is a param declaration - `unit: 'scene-length'` - that the panel and the renderer both
  interpret against a scale the app supplies (1 for GMT, so GMT is unchanged). This also decides
  how a light's distance and a camera's focus are stored, so the Light Studio and camera readers
  should agree on it. Size if done: M, with an ADR.
- **M2 - the feature = params + injected GLSL coupling itself** (section 1). The lighting readers
  will hit it for `lighting`; it holds for all 21 GMT features. Any plan that says "reuse feature
  X" must say which half.
- **M3 - the interaction session and adaptive resolution** (`engine/plugins/viewport/InteractionSessionBadge.tsx`,
  `AdaptiveResolutionBadge.tsx`, `engine-gmt/topbar/AdaptiveResolution.tsx` writing
  `quality.adaptiveTarget`). The deep zoomer has its own "moving vs still" accumulation logic. Two
  owners of "is the user interacting" is the gap; it sits between the navigation and quality
  briefs and may fall between them. Verdict pending their findings; I read only the top-bar widget.
- **M4 - failure and support surfaces** (R2): context loss, `?diag`, feedback screenshots
  (`engine-gmt/feedback/feedbackScreenshot.ts`, not opened) all assume the worker's canvas.
- **M5 - sharing and accounts** (R3): share link, gallery, auth.
- **M6 - the service worker and deploy.** A new HTML entry joins the precache and every push can
  swap chunks under an open tab (owner's standing note on pushes). Not read in code; flagged so
  the build plan holds the first push until the owner says ship.
- **M7 - tutorial anchors and help topics are per-app content**, not systems: nothing to rework,
  but nobody's brief owns writing them (BLUEPRINT section 10 does).

---

## 7. Unverified

- Engine plugin sources (`engine/plugins/*.tsx`, `tutorial/`, `viewport/`, `RenderDialog/`): not
  opened; verdicts restate BLUEPRINT section 1 and ENGINE-GAPS.
- `engine-gmt/shaders/chunks/post_process.ts`: only the `postShader` loop (lines 29-34) was read.
  Where the bloom texture is produced ("BloomPass in worker") is taken from the comment in
  `engine/features/post_effects.ts`, not from the pass itself.
- Whether fluid-toy runs `postEffects` / `colorGrading` at all: a grep of `fluid-toy/` and
  `gradient-explorer/` for the feature names found nothing, so probably not; not traced further.
- The backend for shared scenes and the gallery (separate repo): not opened. The R3 size for the
  backend half is a guess.
- `components/MobileControls.tsx`, `engine/components/MobileViewportShell.tsx`: located by grep, not
  read. "Sticks drive GMT's navigation" is from memory of the layout, not from this pass.
- `engine-gmt/gallery/*` other than the heads of `installGallery.tsx` and `sharedScene.ts`.
- `app-gmt/AppGmt.tsx`, `main.tsx`, `registerFeatures.ts`, `favientsMigration.ts`: not opened.
- `coloring/MappingModes.ts`, `camera_manager/*`, `lighting/*`, `quality.ts`, `navigation.ts`,
  `rotation_gizmo/RotationGizmoOverlay.tsx`: left to their owning readers.
- The existing `deep-zoom/` folder already in the worktree (`DeepZoomApp.tsx`, `bridge.ts`,
  `store.ts`; `main.tsx` says "no engine store, no plugins") is last week's lean shell; only
  `main.tsx` was read.
- All sizes are estimates from reading heads of files; none is backed by a spike.
