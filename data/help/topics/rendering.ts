
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
        title: 'High Quality Render (Buckets)',
        parentId: 'panel.quality',
        content: `
Renders the image in small tiles (Buckets) instead of all at once.

## Why use it?
- **High Resolution**: Allows rendering 4K or 8K images that would otherwise crash the GPU memory.
- **Anti-Aliasing**: Each bucket is allowed to accumulate samples until it is perfectly noise-free before moving to the next.
- **Export**: Can automatically save the result as a PNG when finished.

## Usage
1. Click the **Grid Icon** in the top bar.
2. Select **Refine View** to clear up the current viewport.
3. Select **Export Image** to render and download a file.
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
    'quality.tss': {
        id: 'quality.tss',
        category: 'Rendering',
        title: 'Temporal Anti-Aliasing (TSS)',
        parentId: 'panel.quality',
        content: `
**Temporal Super Sampling** is the secret sauce of this engine.

### How it works
Instead of trying to render a perfect image in 16ms (60fps), the engine renders a "noisy" image quickly. It then blends this frame with the previous frame.
Over the course of 10-20 frames, the noise cancels out, revealing a perfect, high-resolution, soft-shadowed image.

### Usage
- **Enabled (Default)**: Image is noisy when moving, but crystal clear when still.
- **Disabled**: Image is always sharp but lacks soft shadows/AO, or runs at very low FPS.
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
- **Tightness**: How close to the surface the glow hugs. 
  - **Low**: General foggy haze.
  - **High**: Neon outlines around geometry (Tron look).
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
- **Mode**:
  - **Fast**: 6 fixed samples. Good for editing.
  - **High**: Stochastic sampling. Requires TSS (Accumulation) to look good, but produces photorealistic shading.

### Interaction with Emission
Ambient Occlusion acts as a multiplier for Self-Illumination and Rim Light. This allows "dirt" or crevices to darken glowing parts of the surface, adding realism to magma/energy cracks.

### Path Tracing
In Path Tracer mode, AO is applied **only to the direct camera view**. It is disabled for indirect light bounces to preserve the energy of the Global Illumination system.
`
    },
    'fog.settings': {
        id: 'fog.settings',
        category: 'Rendering',
        title: 'Atmospheric Fog',
        parentId: 'panel.scene',
        content: `
Adds depth cues by fading distant objects to a color.

- **Start (Near)**: Distance where fog begins.
- **Density (Far)**: Distance where everything becomes solid fog color.
- **Volumetric Density**: Adds a constant "thickness" to the air, making light shafts and distance haze visible even without geometry.
`
    },
    'dof.settings': {
        id: 'dof.settings',
        category: 'Rendering',
        title: 'Depth of Field (DOF)',
        parentId: 'panel.scene',
        content: `
Simulates a physical camera lens.

- **Aperture (Blur)**: Strength of the blur. 0.0 = Pinhole camera (infinite focus).
- **Focus Distance**: Distance to the sharp plane.
- **Auto-Focus**: Use the "Pick Focus" button in the Scene tab to click a point and set this value automatically.

**Note**: DOF requires **Temporal Accumulation** to look smooth. It uses stochastic jittering of the camera ray.
`
    },
    'export.video': {
        id: 'export.video',
        category: 'Export',
        title: 'Video Export',
        content: `
Allows rendering high-quality video sequences offline.

### Browser Compatibility (Disk vs RAM)
Because 4K video files are huge, the exporter works differently depending on your browser.

- **Disk Mode (Chrome / Edge / Opera)**: Uses direct file access. When you click Render, you will be asked where to save the file immediately. The video is streamed directly to your hard drive, allowing unlimited file sizes (perfect for 4K).
- **RAM Mode (Firefox / Safari)**: Must store the *entire video* in memory until finished.
  - **Warning**: If the video file exceeds ~2GB-4GB, the browser tab will crash (Out of Memory).
  - **Workaround**: For long animations in these browsers, render shorter segments and stitch them later in a video editor.

### Settings
- **Resolution**: Includes social presets (Square 1:1, Portrait 4:5, Vertical 9:16).
- **Bitrate**: Higher = Less compression artifacts. 12-20 Mbps is usually sufficient for 1080p.
- **Samples**: How many accumulation passes per frame. 
  - 16-32: Good for Draft.
  - 64-128: Production Quality (removes all grain).
`
    }
};
