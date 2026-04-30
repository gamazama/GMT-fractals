
import { HelpSection } from '../../../types/help';

export const RENDERING_TOPICS: Record<string, HelpSection> = {
    'panel.render': {
        id: 'panel.render',
        category: 'Rendering',
        title: 'Shading & Materials',
        content: `
Controls the surface properties (PBR) and lighting response of the fractal.
`
    },
    'panel.quality': {
        id: 'panel.quality',
        category: 'Rendering',
        title: 'Quality & Performance',
        content: `
Managing performance is a trade-off between speed and accuracy.

## Core Settings
- **Ray Detail**: Multiplies the epsilon (precision). Lower = Faster but "blobbier". Higher = Sharper but slower.
- **Max Steps** (Advanced): Hard limit on ray calculation. Increase if distant objects are getting cut off (black void).
- **Internal Scale**: Renders at a lower resolution and upscales.
  - **0.5x**: Great for editing/animation. 
  - **1.0x**: Native crispness.
  - **2.0x**: Super-sampling (very slow).
`
    },
    'render.engine': {
        id: 'render.engine',
        category: 'Rendering',
        title: 'Render Engine Mode',
        parentId: 'panel.quality',
        content: `
Switches the fundamental light transport algorithm.

### Direct (Fast)
Standard Raymarching with direct lighting.
- **Fast**: Up to 60FPS on decent GPUs.
- **Features**: Shadows, AO, Fog.
- **Best for**: Exploration, Animation, Real-time usage.

### Path Tracer (GI)
Physically based Monte-Carlo Path Tracing.
- **Slow**: Requires accumulation (image starts noisy and clears up).
- **Features**: Global Illumination (Bounce Light), Emissive Lighting, Soft Area Shadows.
- **Best for**: High-quality still images and photorealistic renders.
`
    },
    'pt.global': {
        id: 'pt.global',
        category: 'Rendering',
        title: 'Path Tracer Globals',
        parentId: 'panel.render',
        content: `
Settings specific to the Path Tracing engine.

- **Bounces**: Number of times light reflects. Higher = brighter interiors but slower render.
- **GI Strength**: Artificial multiplier for bounce light.
- **Stochastic Shadows**: If enabled, treats lights as physical spheres (Area Lights) rather than points. Shadows become softer with distance. Requires accumulation to look smooth.
`
    },
    'bucket.render': {
        id: 'bucket.render',
        category: 'Rendering',
        title: 'High Quality Render',
        parentId: 'panel.quality',
        content: `
Render images at arbitrary resolutions — far beyond what the GPU can draw in a single frame — by rendering in small internal tiles (GPU buckets) and accumulating samples per tile until noise-free. Optionally split the output into a grid of separate PNG files for massive prints.

## Actions
- **Refine**: renders the current viewport at viewport resolution until converged, then holds the cleaned-up frame on screen until you move the camera or change a parameter. Use when you want a clean still of what you're currently looking at.
- **Preview**: click a spot on the canvas to zoom into that area at export pixel density. You stay fully interactive — move sliders, adjust lights, change colors — and the preview re-renders live. See the *Preview Region* section below.
- **Export**: renders at the configured Output Size and saves PNG(s) to disk. With a tile grid > 1×1, each tile saves as its own file. The button shows the file count when tiling is active (e.g. *Export 4×*).

## Quality Settings
- **Convergence Threshold** (default 0.25%): how similar consecutive frames must be before a tile is considered "done". Lower = more samples, higher quality. 0.1% = production, 1% = fast preview.
- **Max Samples / Bucket** (default 64): safety cap so difficult tiles don't accumulate forever. Also caps Preview Region accumulation.

## Output Size
- **Preset**: HD / FHD / QHD / 4K / 5K / 8K UHD, ultrawide (UWQHD, 5K2K), squares, portrait/vertical, skybox, and A0–A3 print sizes at 300 DPI. The list is shared with the Quality > Resolution dropdown.
- **Width / Height**: type any values; snaps to multiples of 8 for GPU alignment.
- **Ratio**: aspect-ratio lock for the W/H pair — *Free* (independent), or one of the standard ratios (1:1, 16:9, 21:9, 4:3, 4:5, 9:16, 2.35:1, 2:1). When set, editing Width recomputes Height (and vice versa). The same ratio list is used by the viewport "fit to window" dropdown.
- **Lock to viewport aspect** (default on): the output automatically tracks the current canvas aspect ratio — open a sidebar, change the window size, and the output height adjusts so what you export matches what you see. Turn off (or pick a static Ratio above) to render an arbitrary aspect; when unlocked, the viewport temporarily switches to a fitted Fixed-mode canvas that matches the output aspect (so the live render doesn't stretch).
- **Match Viewport**: one-click button to set output size to the current canvas dimensions.

The VRAM estimate next to the *Output Size* heading shows the memory cost of a single tile.

## Tile Grid
*Columns × Rows* splits the output into separate PNG files — useful for prints too large for GPU memory in one render (e.g. 20K × 20K split 5×5 = 25 files at 4K each). The header next to *Tile Grid* shows the file count and per-tile pixel size. **1 × 1 = single file** (default).

When tiling is active with bloom or chromatic aberration enabled, visible seams may appear at tile boundaries (spatial effects run per-tile). Disable those effects for seamless stitching.

## GPU Bucket Size
Internal tile size for VRAM safety — distinct from the output tile grid above. Smaller = less memory per tile, larger = faster per-tile cost. 512 is a good default on most GPUs.

## Post-Processing
Bloom, Chromatic Aberration, Color Grading, and Tone Mapping are applied to each image tile's complete composite after its GPU buckets finish. For single-image renders the result matches the live viewport; for tiled renders see the seam note above.

## During Export
The viewport is locked — camera movement, parameter changes, and resizing are blocked to preserve tiled-render integrity. The panel collapses to a compact rendering view that stays out of the canvas: a progress bar plus a stat strip with **Tile** (X / Y), **Elapsed**, and **ETA** (a ±10% range), and a Stop button.

## Preview Region
A live, export-density preview of any canvas section. Unlike Export, this does **not** lock the viewport — you keep full interactivity so you can iterate on the look at final resolution.

1. Click **Preview Region** in the panel. The cursor becomes a crosshair.
2. Hover over the canvas — a dashed fuchsia rectangle follows the cursor, showing which slice of the export will fill the canvas at 1 output-pixel per 1 physical canvas-pixel.
3. Click to start. The viewport now shows the selected region rendered at export density, converging up to **Max Samples Per Bucket**.
4. Adjust anything — sliders, lighting, colors, formula params, camera. The preview re-renders live with the new values, still at export density.
5. Exit via the header **Exit Preview** chip, pressing **Esc**, or closing the panel.

The panel stays open during preview so all your controls remain reachable. Changing Output Width/Height auto-exits the preview (the rendered pixels no longer represent the configured export).
`
    },
    'render.region': {
        id: 'render.region',
        category: 'Rendering',
        title: 'Render Region',
        content: `
Focus accumulation on a specific area of the viewport. Pixels outside the region keep their history unchanged while the selected area accumulates new samples.

## Drawing a Region
1. Click the **Crop Icon** in the top bar (or click it again to cancel).
2. Drag on the viewport to draw the region. A dashed preview appears as you drag.
3. Release to set the region.

## Region Controls
Once set, the region overlay shows live stats:
- **Pixel dimensions** of the selected area (e.g. 820×460).
- **Sample count** — how many accumulation passes have completed.
- **Sample cap** — click the cycle button (⟳) to step through caps: ∞ / 64 / 128 / 256 / 512 / 1024 / 2048 / 4096.
- **Convergence** — live measurement of how much the image is still changing. When below the threshold, it turns green.

## Editing
- **Move**: Drag inside the region box.
- **Resize**: Hover to reveal corner and edge handles, then drag.
- **Clear**: Click ✕ on the overlay or click the crop icon in the top bar.

## Tips
- Use a region to quickly refine a specific detail without waiting for the whole viewport.
- The sample cap shown on the region is the same global setting as the pause menu — changing it in either place updates both.
- Convergence is measured only within the region bounds, not the full viewport.
`
    },
    'quality.detail': {
        id: 'quality.detail',
        category: 'Rendering',
        title: 'Ray Detail (Epsilon)',
        parentId: 'panel.quality',
        content: `
Controls the termination threshold of the raymarcher.

- **1.0 (Standard)**: Stops when ray is within 1 pixel size of the surface.
- **< 1.0 (Low)**: Stops earlier. Faster rendering, but surfaces look "puffy" or "blobby". Small details merge together.
- **> 1.0 (High)**: Forces the ray closer to the surface. Sharpens tiny details but requires significantly more steps (slower).
`
    },
    'quality.fudge': {
        id: 'quality.fudge',
        category: 'Rendering',
        title: 'Slice Optimization (Fudge)',
        parentId: 'panel.quality',
        content: `
Scales the raymarch step size. Also known as "Lipschitz Bound Relaxation".

- **1.0 (Safe)**: Mathematically correct stepping. Guarantees no artifacts.
- **< 1.0 (Slow/Safe)**: Takes smaller steps. Fixes "overstepping" artifacts (holes in the fractal) but is very slow.
- **> 1.0 (Fast/Risky)**: Takes larger steps. Renders much faster, but may clip through thin geometry, creating black noise or missing details.

> **Artistic use:** Values above 1.0 are also used for artistic slicing effects — they cause the ray to overshoot surfaces, creating cut-away or x-ray looks.
`
    },
    'quality.threshold': {
        id: 'quality.threshold',
        category: 'Rendering',
        title: 'Pixel Threshold',
        parentId: 'panel.quality',
        content: `
An adaptive quality optimization. It relaxes the detail requirement for distant objects.
Increasing this makes the background render faster by allowing it to be slightly blurrier, which is often physically realistic (atmospheric scattering limits detail visibility at range).
`
    },
    'quality.steps': {
        id: 'quality.steps',
        category: 'Rendering',
        title: 'Max Steps',
        parentId: 'panel.quality',
        content: `
> **REQUIRES ADVANCED MODE**

The "Fuel Tank" for the ray.
If a ray marches for **N** steps and hasn't hit anything, it gives up (returns Sky color).
- **Low (100)**: Rays die quickly. Deep crevices or distant objects appear as flat black voids.
- **High (500+)**: Rays can travel into deep holes. Required for high zoom levels or very complex sponges. Significantly impacts performance.
`
    },
    'quality.scale': {
        id: 'quality.scale',
        category: 'Rendering',
        title: 'Internal Resolution Scale',
        parentId: 'panel.quality',
        content: `
Controls the resolution of the internal render buffer relative to the screen.

- **0.25x - 0.5x**: Retro/Pixelated look. Extremely fast. Great for complex editing on low-end devices.
- **1.0x**: Native resolution.
- **1.5x - 2.0x**: Super-sampling (SSAA). Renders at a higher resolution and scales down. Eliminates aliasing but is very expensive (4x the pixels).
`
    },
    'mat.diffuse': {
        id: 'mat.diffuse',
        category: 'Rendering',
        title: 'Diffuse Strength',
        parentId: 'panel.render',
        content: `
The base brightness of the surface color.
- **1.0**: Standard brightness.
- **> 1.0**: Boosts color saturation and brightness artificially.
- **0.0**: Surface is black (unless Specular/Emission is active).
`
    },
    'mat.metallic': {
        id: 'mat.metallic',
        category: 'Rendering',
        title: 'Metallic',
        parentId: 'panel.render',
        content: `
Controls the surface conductivity and energy conservation.

- **0.0 (Dielectric)**: Plastic, Wood, Stone. 
  - Reflection color is **White** (4%).
  - Diffuse color is active.
- **1.0 (Metal)**: Gold, Chrome, Iron. 
  - Reflection color is **Tinted** by the surface gradient.
  - Diffuse color is disabled (Metals don't have diffuse scattering).
`
    },
    'mat.specular': {
        id: 'mat.specular',
        category: 'Rendering',
        title: 'Specular Intensity',
        parentId: 'panel.render',
        content: `
The strength of the light reflection (F0).
Even non-metals have some reflection.
- **Increase** to make the surface look wet or shiny.
- **Decrease** for a dry, matte look.
`
    },
    'mat.roughness': {
        id: 'mat.roughness',
        category: 'Rendering',
        title: 'Roughness',
        parentId: 'panel.render',
        content: `
Micro-surface detail.
- **0.0 (Smooth)**: Mirror-like reflections. Sharp highlights.
- **1.0 (Rough)**: Concrete/Chalk. Diffuse reflections. Highlights are spread out and dim.
`
    },
    'mat.rim': {
        id: 'mat.rim',
        category: 'Rendering',
        title: 'Rim Light',
        parentId: 'panel.render',
        content: `
Adds a glowing edge effect based on the viewing angle (Fresnel).
Useful for separating the fractal from the background or adding an "Alien" feel.

- **Rim Light**: Intensity of the edge glow.
- **Rim Sharpness**: Controls the width of the edge. Higher values make the rim thinner and sharper.
`
    },
    'mat.emission': {
        id: 'mat.emission',
        category: 'Rendering',
        title: 'Self-Illumination',
        parentId: 'panel.render',
        content: `
Makes the surface glow independently of light sources.

### Emission Sources
- **Full Surface**: The entire object glows using its final blended color.
- **Layer 1/2**: Only uses the specific gradient layer for the glow color. Useful for making just the "veins" (Layer 2) glow while the base rock (Layer 1) stays dark.
- **Layer 3 (Noise)**: Uses the procedural noise pattern to drive the glow intensity. Great for "magma cracks" or energy fields.
- **Solid Color**: Forces a specific, constant glow color everywhere.

### Path Tracing (GI)
In Path Tracing mode, the **Illumination Power** slider controls how much light the surface emits into the scene (Global Illumination) without changing how bright the surface looks to the camera.
- **1.0**: Physically accurate.
- **> 1.0**: Boosts the bounce light intensity. Great for making dim emissive veins light up a whole room without blowing out the surface detail.
`
    },
    'mat.env': {
        id: 'mat.env',
        category: 'Rendering',
        title: 'Environment Map',
        parentId: 'panel.render',
        content: `
Adds a fake sky reflection to the surface.
Useful for making metals look realistic by giving them something to reflect, even if the background is black.
`
    },
    'mat.glow': {
        id: 'mat.glow',
        category: 'Rendering',
        title: 'Volumetric Glow',
        parentId: 'panel.render',
        content: `
Accumulates light along the ray as it passes *near* fractal surfaces (without hitting them).

- **Intensity**: How bright the air is.
- **Tightness**: Controls where glow appears relative to the fractal surface.
  - **< 1 (Aura mode)**: Glow is suppressed near the surface and peaks further away, creating an outer aura effect. Lower values push the glow peak further out.
  - **1–1000 (Standard)**: Glow hugs the surface. Low values give a general foggy haze, high values give neon outlines around geometry (Tron look).
  - The transition between aura and standard mode blends smoothly in the 0.75–1.0 range.
`
    },
    'mat.ao': {
        id: 'mat.ao',
        category: 'Rendering',
        title: 'Ambient Occlusion (AO)',
        parentId: 'panel.render',
        content: `
Darkens crevices and holes to add depth perception.

- **Intensity**: Darkness of the shadows.
- **Spread**: Radius of the sampling. Larger spread = larger soft shadows in corners.
- **Samples**: Number of AO samples (default 5, adjustable 2–32). More samples = smoother but slower.
- **Stochastic Mode** (toggle):
  - **Off**: Fixed sample positions. Fast and stable — good for editing.
  - **On**: Randomized sample positions each frame. Requires Temporal AA (Accumulation) to look smooth, but produces photorealistic soft shading.
- **AO Tint**: Colorizes the ambient occlusion shadows. By default AO darkens to black, but you can tint it to warm brown, cool blue, etc. for a more stylized look.

### Interaction with Emission
Ambient Occlusion acts as a multiplier for Self-Illumination and Rim Light. This allows "dirt" or crevices to darken glowing parts of the surface, adding realism to magma/energy cracks.

### Path Tracing
In Path Tracer mode, AO is applied **only to the direct camera view**. It is disabled for indirect light bounces to preserve the energy of the Global Illumination system.
`
    },
    'fog.settings': {
        id: 'fog.settings',
        category: 'Rendering',
        title: 'Atmospheric Fog & God Rays',
        parentId: 'panel.scene',
        content: `
Adds depth and atmospheric effects to the scene. Fog controls appear when **Fog Intensity > 0**.

## Distance Fog
- **Fog Intensity**: Master control. Fades distant objects to the Fog Color.
- **Start (Near)**: Distance where fog begins.
- **Fog End**: Distance where everything becomes the solid fog color.
- **Fog Color**: The color distant objects fade into.

## Volumetric Scatter (God Rays)
Simulates light scattering through a participating medium. Requires **Volumetric Scattering (HG)** to be compiled — enable via the Viewport Quality dropdown (Atmosphere: Volumetric) or the Engine panel.

- **Volumetric Density (σ)**: Thickness of the air. Higher values = denser fog, shorter light shafts. Good range: 0.005–0.05.
- **Anisotropy (g)**: Controls direction bias of scattered light (Henyey-Greenstein phase):
  - **0**: Isotropic — light scatters equally in all directions.
  - **+0.9**: Strong forward scatter — classic god rays pointing toward lights.
  - **−0.9**: Back scatter — halo effect around light sources.

## Tips
- God rays accumulate over frames via Temporal Accumulation — they look best when the camera is still.
- Shadow jitter is proportional to the DE distance at each scatter sample, which softens the fractal silhouette in open sky while keeping crisp edges near the surface.
- In Direct mode, god rays work without Path Tracing enabled.
`
    },
    'dof.settings': {
        id: 'dof.settings',
        category: 'Rendering',
        title: 'Depth of Field (DOF)',
        parentId: 'panel.scene',
        content: `
Simulates a physical camera lens by blurring areas outside the focus plane. See **Scene > Optics** for full DOF documentation including Aperture, Focus Distance, Auto-Focus, and High Precision controls.

**Note**: DOF requires **Temporal AA** (Accumulation) to look smooth.
`
    },
    'render.reflections': {
        id: 'render.reflections',
        category: 'Rendering',
        title: 'Reflections',
        parentId: 'panel.render',
        content: `
Adds reflective surfaces to the fractal. Three modes available, from cheapest to most expensive:

## Reflection Methods
- **Off**: No reflections. Fastest.
- **Environment Map**: Samples the environment map at the reflection angle. Cheap, adds realism to metals. Uses Fresnel weighting.
- **Raymarched (Quality)**: Fires actual reflection rays through the fractal. Physically accurate but adds ~7.5s compile time.

## Raymarched Settings
- **Max Bounces (1-3)**: Recursion depth. Each bounce adds a full raytrace pass.
- **Trace Steps**: Precision of the reflection ray (16-128).
- **Roughness Cutoff**: Surfaces rougher than this skip raymarching (performance optimization).
- **Raymarch Mix**: Blend between raymarched (1.0) and environment map (0.0) reflections.
- **Bounce Shadows**: Compute shadows on reflected surfaces. Adds ~4.5s compile time.

## Tips
- Combine with low **Roughness** (0.0-0.3) and high **Metallic** for dramatic mirror effects.
- Use Environment Map mode during editing, then switch to Raymarched for final renders.
`
    },
    'render.volumetric': {
        id: 'render.volumetric',
        category: 'Rendering',
        title: 'Volumetric Scatter',
        parentId: 'panel.render',
        content: `
Henyey-Greenstein single-scatter volumetric rendering. Enables god rays, colored haze, and directional fog effects.

**Note:** This is a compile-time feature. Enabling it triggers a shader recompile (~5.5s). You can also toggle it on/off at runtime without recompiling once it has been compiled in.

## Density & Shadow Rays
- **Density**: Thickness of the participating medium. Log scale — small values (0.01-0.05) produce subtle haze, higher values create thick fog.
- **Anisotropy (g)**: Direction bias for scattered light.
  - **0**: Isotropic (equal scatter in all directions).
  - **+0.9**: Forward scatter — classic god rays pointing toward light sources.
  - **-0.9**: Back scatter — halo effect around lights.
- **Light Sources**: How many lights cast shadow rays into the volume (1-3). More = more expensive.
- **Scatter Tint**: Color of the scattered light.
- **Step Jitter**: Controls random variation in volumetric step positions. Higher values help with temporal accumulation (noise averages out over frames). Lower values produce cleaner single-frame results but may show banding. Can also be used artistically for slicing effects.

## Color Scatter
- **Surface Color Scatter**: Injects the fractal's orbit trap color field into the volume. Creates a colored volumetric haze matching the gradient palette. No shadow rays needed (cheap).
- **Surface Falloff**: Concentrates the color near the fractal surface.

## Height Fog
- **Height Falloff**: Density varies with Y coordinate. Creates ground fog or rising mist.
- **Height Origin**: The Y level where fog is densest.
`
    },
    'mat.reflection': {
        id: 'mat.reflection',
        category: 'Rendering',
        title: 'Reflections',
        parentId: 'panel.render',
        content: `
Adds reflective surfaces to the fractal using raymarched reflection rays.

## How It Works
When enabled, the renderer fires additional rays from the surface in the reflection direction. These rays march through the fractal just like the camera ray, finding what the surface "sees" and blending that into the final image.

## Key Controls
- **Max Bounces (1–3)**: How many times light can bounce between surfaces. One bounce is a simple mirror; two or three bounces let you see reflections of reflections (like standing between two mirrors). More bounces = slower rendering.
- **Roughness**: Smooth surfaces (low roughness) produce sharp, mirror-like reflections. Rough surfaces scatter the reflection into a soft, blurry highlight.
- **Roughness Cutoff**: Surfaces rougher than this threshold skip raymarching entirely to save performance — they fall back to the environment map.
- **Raymarch Mix**: Blends between full raymarched reflections (1.0) and the cheaper environment map reflections (0.0). Useful for dialing in the right balance of quality vs speed.
- **Metallic Influence**: Metallic surfaces tint reflections with their own color (like gold or copper), while non-metallic surfaces (plastic, stone) reflect white light.

## Bounce Shadows
When enabled, reflected surfaces also receive proper shadows — so a reflection of a crevice will show the correct darkness inside it. This adds realism but increases compile time.

## Performance Note
Raymarched reflections are a compile-time feature. Enabling them triggers a shader recompile (roughly 7–8 seconds). Bounce shadows add another 3–5 seconds on top of that. Use Environment Map mode for fast editing, then switch to Raymarched for final renders.
`
    },
    'water.settings': {
        id: 'water.settings',
        category: 'Rendering',
        title: 'Water Plane',
        content: `
An infinite ocean plane with animated waves, integrated into the raymarcher. The water surface participates in shadows, AO, and reflections.

## Controls
- **Height**: Y-level of the water surface.
- **Color**: Albedo of the water.
- **Roughness**: Surface roughness (0 = mirror, 1 = matte).
- **Wave Strength**: Amplitude of the animated waves. Set to 0 for a flat mirror plane.
- **Wave Speed**: Animation speed of the waves.
- **Wave Frequency**: Density of wave peaks.

## How It Works
The water plane is a signed distance field (SDF) composed of 3 layered noise octaves:
1. Rolling swell (sine-based)
2. Organic surface (simplex noise)
3. Fine choppiness (high-frequency noise)

Normals are recomputed via finite differences for accurate specular highlights and reflections.

## Tips
- Works best with **Reflections** enabled (Environment Map or Raymarched).
- Set the fractal near the water surface and use **Fog** to create depth.
`
    },
    'quality.metric': {
        id: 'quality.metric',
        category: 'Rendering',
        title: 'Distance Metric',
        parentId: 'panel.quality',
        content: `
> **REQUIRES ADVANCED MODE**

Controls how "distance" is measured in 3D space. Different metrics produce different geometric styles.

- **Euclidean** (default): Standard straight-line distance. Produces natural, round shapes.
- **Chebyshev**: Uses the largest coordinate difference. Tends to produce cube-like, blocky geometry.
- **Manhattan**: Uses the sum of coordinate differences. Creates diamond-shaped, angular geometry.
- **Minkowski**: A tunable blend between the other metrics. Adjust the exponent to interpolate between Manhattan (1), Euclidean (2), and Chebyshev (infinity).
`
    },
    'quality.estimator': {
        id: 'quality.estimator',
        category: 'Rendering',
        title: 'Distance Estimator',
        parentId: 'panel.quality',
        content: `
> **REQUIRES ADVANCED MODE**

Controls the mathematical method used to estimate the distance to the fractal surface. Different estimators suit different formula types.

- **Analytic Log**: Uses the logarithmic distance estimate. Best for standard fractals (Mandelbulb, Mandelbox) where the analytic derivative is reliable.
- **Linear**: A simpler linear estimate. Can work better for formulas with non-standard divergence behavior.
- **Pseudo**: Approximates the distance without true derivatives. Useful as a fallback when analytic methods produce artifacts.
- **Dampened**: A conservative estimate that under-steps slightly for stability. Helps with formulas prone to overstepping artifacts (holes or noise on surfaces).
`
    },
    'quality.jitter': {
        id: 'quality.jitter',
        category: 'Rendering',
        title: 'Step Jitter',
        parentId: 'panel.quality',
        content: `
> **REQUIRES ADVANCED MODE**

Adds stochastic (random) variation to each ray step position (default 0.15).

- **Purpose**: Breaks up banding and aliasing artifacts by randomizing where the ray samples. Over multiple frames with Temporal AA enabled, the random offsets average out to produce a smooth, noise-free image.
- **0.0**: No jitter. Clean single frames but may show visible stepping bands on smooth surfaces.
- **0.1–0.2**: Subtle variation. Good balance for most scenes.
- **Higher values**: More randomness per frame — noisier in motion but converges faster when still.
`
    },
    'quality.relaxation': {
        id: 'quality.relaxation',
        category: 'Rendering',
        title: 'Step Relaxation',
        parentId: 'panel.quality',
        content: `
> **REQUIRES ADVANCED MODE**

A dynamic fudge factor that automatically adjusts the step size based on the previous step's distance estimate.

When enabled, the raymarcher takes larger steps in open space (where it is safe) and smaller steps near surfaces (where precision matters). This speeds up rendering in scenes with large empty areas without sacrificing surface detail.
`
    },
    'quality.adaptive': {
        id: 'quality.adaptive',
        category: 'Rendering',
        title: 'Adaptive Resolution',
        parentId: 'panel.quality',
        content: `
Automatically adjusts the rendering resolution to maintain a target frame rate (default 30 FPS). Enabled by default — toggle via the top bar icon.

**Context-aware behavior:**
- **Mouse on canvas**: Lowers resolution during camera movement or gizmo interaction. Restores full resolution after a grace period that scales with scene complexity (slow scenes get more time before restoring).
- **Mouse on UI** (panels, menus, sliders): Keeps adaptive resolution active continuously so parameter adjustments and menu interactions stay responsive.

**How it works:** The system measures FPS every 500ms and adjusts the internal render scale (1x–4x downsample) proportionally. A 5% dead zone prevents tiny fluctuations from causing constant resolution changes. On interaction start, the scale is immediately seeded from the current still-frame FPS so there's no slow ramp-up period.

**Target FPS** can be adjusted in the Quality panel. The top bar icon shows the current state: **cyan** = auto mode (will restore full res), **amber** = always-on mode (mouse over UI).

Disabled automatically during bucket rendering and video export.
`
    },
    'export.video': {
        id: 'export.video',
        category: 'Export',
        title: 'Video & Image Sequence Export',
        content: `
Render high-quality video files or per-frame image sequences from the timeline.

### Formats
- **MP4 (H.264 / HEVC / AV1)**: universal video containers. H.264 is the most compatible; HEVC and AV1 give better compression but require a GPU/browser that can encode them.
- **WebM (VP9)**: web-native open format. Firefox encodes VP9 natively (no cap).
- **PNG Sequence (RGBA)**: per-frame image files written into a folder. When you select both Beauty and Alpha, they're merged into one RGBA PNG per frame — perfect for compositing in After Effects, Nuke, Resolume, etc. Depth (if selected) goes out as a separate greyscale PNG per frame.
- **JPG Sequence**: per-frame files, one per selected pass. Lossy but small — good for preview proofs or social-media clips.

### Passes
Three checkboxes control which render passes go to the output:

- **Beauty** — the normal tone-mapped color image.
- **Alpha** — a surface mask (white = surface, black = sky). Anti-aliased "for free" via the accumulation pipeline.
- **Depth** — a linear distance map (near = black, far = white). When Depth is selected you'll see **Near / Far (world units)** inputs — anything closer than Near reads as black, anything farther than Far reads as white. The **Use fog range** shortcut copies your scene's current fog start/end if fog is enabled.

Each selected pass produces its own file for video / JPG exports. PNG merges Beauty + Alpha into one RGBA file.

### Browser Compatibility
- **MP4 / WebM — Disk Mode** (Chrome / Edge / Opera): direct file write. You pick the output file when you click Render; video streams to disk, unlimited file size.
- **MP4 / WebM — RAM Mode** (Firefox / Safari): the entire video is buffered in memory before download. Crashes the tab if the file would exceed ~2–4 GB. Render short segments and stitch in a video editor for long animations.
- **Image Sequences**: **Chrome / Edge only** — needs the directory-picker API. The render button shows a notice in unsupported browsers.

### Firefox notes
- Firefox encodes H.264 through Cisco's OpenH264 plugin, which is **capped at ~31 Mbps** regardless of the bitrate slider. An inline notice appears in the dialog when you set a bitrate above this threshold. Use VP9/WebM (or Chrome) if you need higher bitrate for H.264-visible quality.
- Exported fps / timing is automatically corrected — the encoder returns timestamps with a one-frame leading offset on Firefox, which we cancel internally.

### Settings
- **Resolution**: includes social presets (Square 1:1, Portrait 4:5, Vertical 9:16). Any 2-pixel-aligned resolution works.
- **Bitrate**: the slider value is a "visible quality" target — the encoder is actually given 2.5× this value to compensate for CBR under-shoot on smooth content. 12–20 Mbps on the slider is usually sufficient for 1080p beauty.
- **Samples**: accumulation passes per frame (shared across all render passes in image-sequence mode).
  - 16–32: draft.
  - 64–128: production quality (removes residual grain).
- **Internal Scale**: render above resolution (1.5×–2× for SSAA) at proportionally higher cost.

### Multi-pass file naming
- Single video / single pass: \`{project}_v{n}_{WxH}.{ext}\`
- Video with multiple passes: \`{project}_{pass}_v{n}_{WxH}.{ext}\` — one file per pass.
- PNG merged: \`{project}_v{n}_{WxH}_{frame}.png\`
- JPG / PNG depth: \`{project}_{pass}_v{n}_{WxH}_{frame}.{png|jpg}\`
`
    }
};
