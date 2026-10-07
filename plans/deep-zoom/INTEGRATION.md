# How the deep zoom gets into GMT

Written 2026-10-07 on branch `deep-zoom-tool` (unmerged, unpushed). Paths are relative to this
worktree unless they start with `mandelbulb_deepzoom/` (the renderer's own repo, a sibling of
`stable/`, local branch `kernel-perf`). Two read-only investigations feed this file; anything they
did not confirm in code is marked UNVERIFIED and has not been checked since.

## The short version

There are three levels. Each is a different product and a different size of job.

| Level | What it is | Size | Formulas | Status |
|---|---|---|---|---|
| 1 | An engine tool that shows the standalone renderer in an iframe and drives it through handles | 1 day | Mandelbulb, integer power 2-16 | built today |
| 2 | The renderer as an engine module: engine panels, timeline, scene files, GMT gradients | 3-5 weeks | Mandelbulb only | not started |
| 3 | Perturbation inside GMT's own marcher, per formula | 2-4 months for the bulb, then 1-3 weeks per smooth formula | a minority of the catalogue | not started; one unproven core problem |

Recommended order: 1 (done) -> 2 in the sub-order given below -> decide on 3 only after a
one-week spike on secondary rays. Level 3 is not a prerequisite for anything a user has asked for.

## Why GMT cannot simply "zoom deeper" today

GMT's 3D marcher stops at a surface distance of about 1e-6 to 1e-7. The cause is the f32 iteration
itself, not the camera bookkeeping:

- `applyPrecisionOffset` in `engine-gmt/shaders/chunks/math.ts` is `return (localPos + low) + high;`.
  The CPU keeps the offset as high + low doubles (`engine/plugins/navigation/core/VirtualSpace.ts`,
  `split()` / `normalize()`), and that precision is thrown away at this add.
- `engine-gmt/shaders/chunks/trace.ts` (grep `precisionLogic`) floors the hit epsilon at
  `distFromFractalOrigin * PRECISION_RATIO_HIGH`. The comment gives 5e-7 (1e-5 on mobile); the
  constant itself was not opened (UNVERIFIED).
- `engine-gmt/shaders/chunks/de.ts` floors the numeric-DE probe too (`numFootprint`, `numProbe`).

More camera digits would not move the wall: `z + c` in f32 absorbs anything below about 6e-8.
The standalone gets past it by iterating a per-pixel delta against a CPU reference orbit (256-bit
BigInt fixed point, grep `[DS-SEAM]` and `makeHP(256)` in `mandelbulb_deepzoom/index.html`). Its
README states the range: flyable to about 1e-77, checked against referees to 1e-50.

## Level 1 - iframe tool (built today)

**What the user gets.** A new engine app, `deep-zoom`, with a purpose-made interface over the
unchanged renderer: an always-on depth readout, starter dives, bookmarks, copy/paste of an exact
location, one-click "record a dive", a path panel with preview and render, and the look controls.
See `INTERFACE.md`. Picture quality, speed and depth are exactly the standalone's, because it is
the standalone.

**What it costs.** One day. Ongoing: the engine carries a vendored copy of a ~3,900-line page, and
that copy can drift from the master.

**Seams (all verified to exist in this worktree today).**
- Vite entry: `deep-zoom.html` + `deep-zoom/main.tsx` (registered in `vite.config.ts`
  `rollupOptions.input`; UNVERIFIED that the entry line has landed - another agent owns it).
- Shell: `deep-zoom/DeepZoomApp.tsx`, `deep-zoom/store.ts`, `deep-zoom/ui/*`.
- Bridge: `deep-zoom/bridge.ts`. It is the only file that touches `iframe.contentWindow`; every
  core handle name is spelled once, there.
- Core side: `window.__dz` version 1 (grep `HOST HANDLE` in the core page): `telemetry`,
  `settings`, `getView`, `setView`, `thumbnail`, `diveTo`. Plus the older loose `window.__*`
  handles (`__recordToggle`, `__renderPath`, `__cancelRender`, `__setReach`, ...).
- Embed mode: `?embed=1` adds `body.embed`, which hides the page's own HUD, top bar, help and
  loading overlay by CSS, and stops the recorder downloading its JSON (grep `EMBED` in the core).
- Vendored copy: `public/deep-zoom-core/index.html`, refreshed by
  `scripts/sync-deep-zoom-core.mjs`. The master stays in `mandelbulb_deepzoom/`.

**What blocks it / known limits.**
- Same origin is required, and the iframe `src` must be relative because the build uses
  `base: './'` (stated in `deep-zoom/bridge.ts`).
- Keyboard focus lives in the iframe while flying; shell shortcuts must listen on both windows.
- Nothing fails at build time if the vendored core drifts. `bridge.ts` records this as an
  `@assumption`; the only guard named there is a headed smoke, `smoke:deep-zoom`, which has not
  been falsified against a broken core (UNVERIFIED that the smoke exists yet).
- None of the engine's systems are in play: no DDFS params, no undo, no engine timeline, no scene
  files, no GMT gradient editor, no MP4 export. Path render is the core's ZIP of PNG frames.
- The service worker / PWA precache will pick up a ~200 KB extra static page (UNVERIFIED size and
  UNVERIFIED that the precache glob includes `public/deep-zoom-core/`).

## Level 2 - the renderer as an engine module

**What the user gets, beyond level 1.**
- Every scalar (detail, reach, iterations, power, phase, light, falloff, colour scale) becomes a
  DDFS param: auto panels, undo/redo, preset round-trip and keyframes with no per-param wiring.
- One scene file holding parameters, camera and path, including PNG-embedded scenes and
  drag-drop load.
- GMT's gradient editor, the Favients tray, and "send to Deep Zoom" from Gradient Explorer.
- MP4/WebM through the engine's render dialog, with the ZIP of PNGs kept as the lossless option.
- Saved-view slots with thumbnails and hotkeys.
- Still Mandelbulb only, and still the standalone's shading (a deferred pass over a G-buffer), not
  GMT's path tracer, volumetrics, env maps or material slots.

**What it costs.** About 3-5 weeks. Sub-steps, in the order to do them:

1. **Extract `createDeepZoom(canvas, hooks)`** (about 1 week). Two steps: first wrap the inline
   script in one closure (mechanical, behaviour-identical, certify with the existing referee
   harness such as `direct-check.test.mjs`), then cut into files (`hp`, `shaders`, `orbit`,
   `renderer`, `camera`, `path`, `params`, `index`). The standalone `index.html` becomes a thin
   host of the same module so there is still one master. Must change: `window.__x` assignments
   become a returned `api`; sizing stops reading `window.innerWidth`; listeners move off
   `window`/`document` and get a `dispose()`; the host owns the RAF; the `CTLS` DOM builder, HUD
   and `alert()` calls leave core; file pickers and downloads split from the pure halves.
2. **App scaffold** (1-2 days). Copy `fractal-toy/main.tsx` (177 lines) for the plugin install
   order; top bar, menus, help, HUD slots and the update pill come with it.
3. **DDFS features** (3-4 days). The core's `CTLS` table is already a parameter schema
   (`{t:'sec'|'seg'|'rng'|'tog', l, note, g, s, min, max, step}`) and maps nearly one-to-one onto
   `engine/FeatureSystem.ts` param types. Proposed features: `dzFormula`, `dzQuality`, `dzLook`,
   `dzColor`, `dzPath`. One subscriber on the `fluid-toy/useEngineSync.ts` pattern pushes changes
   into `api.set*`; each param names the dirty flag it trips (`orbitDirty` or `accumReset`).
4. **Gradients** (1-2 days). The fit is close to exact: `utils/gradientRamp.ts` resolves a GMT
   gradient to 256 RGBA texels (`RAMP_TEXELS = 256`) and the core's `uploadStrip(rgba, w)` takes
   one RGBA row.
5. **Camera on the timeline** (about 1 week; the piece with real design risk). See "what does not
   fit" below.
6. **Scene save/load and bookmarks** (2-3 days). `engine/plugins/SceneIO.tsx`,
   `utils/PresetFieldRegistry.ts`, `engine/plugins/SceneFileClaims.ts` (accept the standalone's
   path `.json` dropped on the window). UNVERIFIED: whether the preset field registry accepts a
   string-typed app field, which the BigInt camera needs.
7. **Export** (2-3 days). A `RenderDialogRunner` (`engine/plugins/RenderDialog/index.tsx`) that
   steps a path frame and feeds `engine/export/videoEncoder.ts`. Keep the core's own tiler for
   stills; adapting to `BucketRenderHost` (`engine/export/BucketRunner.ts`, three.js-based) is
   judged not worth it, and the core needs the whole picture in one G-buffer for its screen-space
   shadows and AO (`WHOLE_MAX_PX = 40e6`).
8. **Orbit and BLA builds off the main thread** (2-3 days) on the
   `engine/fractal/deepZoom/laRuntime.ts` pattern. UNVERIFIED whether the standalone already does
   this.

**What does not fit and needs an engine decision.**
- **BigInt camera tracks.** `types/animation.ts` has `Track.type` as the literal `'float'`,
  `Keyframe.value: number`, and binders are `write(v: number)`. Recommended: keep the exact poses
  in an app-owned side table in the scene (the recorder's `recPath`, BigInts as strings) and put
  one float track on the timeline, `dzPath.u`, whose binder calls the core's path seek. The
  core's arc-length Catmull-Rom in high precision does the interpolation; the graph editor
  retimes `u`. `engine/animation/binderRegistry.ts` already allows registering a binder for a
  non-feature global, so this starts with no engine type change. Rejected: splitting the position
  into f64 limbs (five to six per axis for 1e-77, and per-limb Bezier is meaningless) and a fully
  generic `Keyframe.value: unknown` (touches every timeline consumer).
- **Depth-relative input.** Fly speed scales with distance to the surface, and a slider step that
  makes sense at 1e-3 is meaningless at 1e-60. The engine's sliders and camera plugin assume
  absolute units. Navigation stays in core for now.
- **Six-number cameras elsewhere.** `engine-gmt/animation/cameraBinders.ts`,
  `engine/animation/cameraKeyRegistry.ts`, and the FBX / AE exporters assume six numbers. Level 2
  sidesteps them (deep-zoom is its own app); level 3 cannot.

**What blocks it.** Nothing technical for steps 1-4 and 6-8. Step 5 needs the track decision
above written as an ADR. The whole level depends on step 1 keeping the certification harness
green; without that the lifted code is unproven.

## Level 3 - perturbation inside GMT's marcher

**What the user gets.** Deep zoom in app-gmt itself, with GMT's own lighting, on the formulas that
can carry a perturbed kernel.

**What it costs.** About 2-4 months for Mandelbulb alone, 1-3 weeks per additional smooth formula,
open-ended for fold formulas.

**Seams.**
- Formula contract: `engine-gmt/types/fractal.ts` `shader` block has no slot for a perturbed
  iteration or a reference-orbit builder. A new capability token in
  `engine-gmt/types/capabilities.ts` needs an ADR amendment (the file says so, citing ADR-0059).
- DE assembly: `engine-gmt/shaders/chunks/de.ts`. `map` / `mapDist` take an absolute `vec3 p`;
  a perturbed path takes a delta with an exponent. Every caller passes `p + uCameraPosition`:
  `trace.ts`, `material_eval.ts`, `pathtracer.ts`, `lighting/shading.ts`, `lighting/pbr.ts`,
  `lighting/volumetric_scatter.ts`. This is the widest seam.
- Marcher: `trace.ts` carries distance as one float; the standalone's `marchNear` carries
  mantissa + exponent.
- Worker: `engine-gmt/engine/worker/WorkerProtocol.ts`. The orbit build must be ordered against
  `OFFSET_SET` / `OFFSET_SHIFT` so no frame marches with a stale orbit.
- Uniforms/textures: `engine-gmt/engine/UniformSchema.ts`, `managers/UniformManager.ts` (orbit
  texture, BLA table, reference exponent, binomial arrays).
- Precedent to copy as a pattern, not as maths: `engine/fractal/deepZoom/*` and
  `engine/fractal/DeepZoomController.ts` (about 3,200 lines, 2D complex z^d + c).

**What blocks it.**
1. **Secondary rays.** GMT's look marches shadows, AO, reflections and path-tracer bounces from
   the hit point in absolute coordinates. The standalone avoids the problem by shading from the
   depth buffer. Whether true secondary marching is stable at 1e-30 and beyond is unproven here.
2. **Per-formula derivation and proof.** The bulb kernel is hand-derived and certified at 11
   depths. It cannot be generated from a formula's GLSL string. GMT's own Mandelbulb
   (`engine-gmt/formulas/Mandelbulb.ts`) has a float power, Z-twist and Radiolaria that the kernel
   does not cover.
3. **Catalogue fit** (classified by name and an acos/atan grep over the 48 files in
   `engine-gmt/formulas/`; UNVERIFIED per formula). Plausible: Mandelbulb, Quaternion, Tetrabrot,
   and other smooth power maps. Hard: fold formulas (Buffalo, BoxBulb, the Mandelbox family).
   Poor fit: the IFS and Kleinian families. Cannot: Modular, Workshop / Fragmentarium imports,
   MB3D imports, any hybrid of two formulas.
4. **Compile cost.** The standalone's deep program takes about 5 s (its README); adding it to
   GMT's marcher may hit ANGLE/D3D11 limits (UNVERIFIED).

**Recommendation.** Do not start level 3 on a schedule. Run a one-week spike on blocker 1 (one
marched shadow ray at 1e-30, judged against the depth-buffer shadow). If it fails, level 2 is the
end state and that is a good end state.

## The decision made today

**Decision.** Deep zoom enters GMT as a separate engine app, `deep-zoom`, that embeds the
standalone renderer unchanged in a same-origin iframe and drives it through `window.__dz` and the
page's existing handles. The renderer's master copy stays in `mandelbulb_deepzoom/`; the engine
carries a synced copy under `public/deep-zoom-core/`.

**Why.**
- The renderer is mid-overhaul on `kernel-perf` (one kernel, two-pass renderer, new look; colour
  is next). Lifting it into modules now would fork a moving file. An iframe copies it whole and
  re-syncs with one script.
- The certified numbers (1e-50 against referees) belong to that exact page. Embedding keeps them
  true; any rewrite would have to re-earn them.
- The interface is the part that did not exist. An enthusiast-facing shell can be designed,
  built and judged now, and what it learns (the view-as-text format, the depth gauge, the record
  flow) carries into level 2 unchanged because `bridge.ts` is the only seam.
- It needed 21 lines of additive code in the core's host handle plus an embed flag; nothing in
  the engine core changed (UNVERIFIED line count; grep `HOST HANDLE`).

**What it gives up.** Undo, engine timeline, scene files, GMT gradients and MP4 export, until
level 2. A drift risk between the two copies of the page, guarded today only by a version check
in `connectCore`.

**ADR.** This should become an ADR when the branch merges. No number is assigned here: numbers
taken on unmerged branches collide. The ADR should also record the `__dz` version-1 contract and
the rule that only `deep-zoom/bridge.ts` may name a core handle.
