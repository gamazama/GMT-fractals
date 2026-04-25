
import { HelpSection } from '../../../types/help';

export const COLORING_TOPICS: Record<string, HelpSection> = {
    'panel.gradient': {
        id: 'panel.gradient',
        category: 'Coloring',
        title: 'Coloring Engine',
        content: `
Fractals don't have "texture maps" in the traditional sense. Color is assigned mathematically based on the geometry.

## The Process
1. **Mapping**: The engine measures a specific value at the surface point (e.g., "How far is this point from the origin?").
2. **Transform**: This value is transformed using Scale, Offset, Phase, and Repeat sliders.
3. **Lookup**: The final value (0.0 to 1.0) is used to pick a color from the **Gradient**.

## Dual-Layer System
You can blend two completely different coloring strategies to create complex surfaces.
- **Layer 1**: The Base color.
- **Layer 2**: Detail or Overlay color.
- **Blend Mode**: Determines how they combine (Mix, Add, Multiply, Bump).

## Histogram
The coloring panel includes a live **histogram** that shows how your color values are distributed across the fractal surface. Use it to spot problems — if all the values are bunched up on one side, your colors will look flat. Adjusting Scale, Offset, or Gamma (Bias) while watching the histogram makes it much easier to get a well-spread, vibrant result.
`
    },
    'grad.params': {
        id: 'grad.params',
        category: 'Coloring',
        title: 'Color Parameters',
        parentId: 'panel.gradient',
        content: `
These parameters control how the raw mapping value is transformed before it looks up a color from the gradient.

### Transform Controls
- **Scale**: Stretches or compresses the color pattern. Higher values create more repetitions; lower values spread the pattern out.
- **Offset**: Shifts the entire pattern along the gradient. Use this to "scroll" through colors without changing the pattern shape.
- **Phase**: Rotates the gradient starting point. Think of it like spinning a color wheel — the same colors are used, but they start at a different point in the cycle. Useful for fine-tuning which color lands on which part of the fractal.
- **Repeats**: Controls how many times the gradient repeats across the full mapping range. At 1, the gradient plays once from left to right. At higher values it tiles, creating banded or striped effects. Works well with smooth mappings like Radial or Potential.

### Advanced Controls
- **Gamma (Bias)**: Controls the gamma curve of the gradient lookup (range: 0.1 to 10.0). Values below 1.0 push more of the surface toward the bright end of the gradient; values above 1.0 push toward the dark end. This reshapes how colors distribute across the surface without changing the gradient itself — very useful for bringing out detail in dark or light regions.
- **Color Iterations**: Stops orbit trap capture at a specific iteration count (0 to 24). Normally the orbit trap runs for the full iteration loop, but clamping it early lets you control *which part* of the fractal's iteration process the colors are sampled from. Low values color based on early, large-scale structure; high values reveal finer internal detail. A powerful tool for creative control.
- **Twist**: Distorts the mapping value (range: -5 to 5). Adds a swirl or warp to the color pattern, bending straight bands into curves. Subtle values (0.1–0.5) add organic flow; extreme values create psychedelic distortion.
`
    },
    'grad.mapping': {
        id: 'grad.mapping',
        category: 'Coloring',
        title: 'Mapping Modes',
        parentId: 'panel.gradient',
        content: `
Determines the mathematical property used to select color from the gradient.

### Geometric Mappings
- **Orbit Trap**: Uses the *minimum distance* the orbit point reached relative to the origin during iteration. Creates geometric, cellular, or techno-organic patterns inside the bulbs. Good for "solid" looking interiors.
  - **Reference:** [Wikipedia: Orbit Trap](https://en.wikipedia.org/wiki/Orbit_trap)
- **Orbit X (YZ plane)**: Like Orbit Trap, but only measures distance along the X axis. Reveals structure in the YZ plane — useful for slicing the fractal's internal geometry into layers.
- **Orbit Y (XZ plane)**: Same idea on the Y axis. Highlights horizontal strata and bands through the fractal interior.
- **Orbit Z (XY plane)**: Same idea on the Z axis. Great for height-based coloring of internal structures.
- **Orbit W (Origin)**: Uses the squared distance from the origin at each iteration (like a full 3D orbit trap). Produces smooth, rounded color regions that follow the overall shape of the orbit.
- **Radial**: Based on the distance of the final surface point from the center $(0,0,0)$. Creates spherical gradients and large-scale color shifts.
- **Z-Depth**: Height map based on the Z coordinate. Useful for creating landscapes or strata effects.
- **Angle**: Based on the polar angle around the Z-axis. Creates spirals and pinwheels.
- **Normal**: Based on the surface slope (Up vs Down). Adds pseudo-lighting effects or "snow on peaks" looks.

### Fractal Mappings
- **Iterations (Glow)**: Based on how many iterations it took to decide the point was "solid". Creates smooth, glowing bands outlining the shape. The classic "Electric Sheep" look.
- **Raw Iterations**: Same as Iterations but without smoothing. Shows distinct bands or steps. Useful for technical analysis or stylized "8-bit" looks.
- **Decomposition**: Analytic decomposition of the complex number angles during iteration. Creates checkered, grid-like, or circuit-board patterns. Highly sensitive to the **Escape Radius**.
- **Flow (Angle + Iter)**: Combines Decomposition and Iterations into a single mapping. The result is spiral and grid patterns that follow the fractal's natural flow — think of it as a 2D coordinate system wrapped around the fractal's internal structure. Great for detailed, structured coloring.
- **Potential (Log-Log)**: Measures the electrical potential of the set. Creates very smooth, gradient-like bands, especially near the boundaries of the fractal. Ideal for continuous color flows.
`
    },
    'grad.escape': {
        id: 'grad.escape',
        category: 'Coloring',
        title: 'Escape Radius',
        parentId: 'panel.gradient',
        content: `
The distance from the origin ($R$) at which the formula considers a point to have "escaped" to infinity. Range: 0 to 1000.

### Impact on Coloring
- **Standard**: Usually around 2.0 to 4.0 for basic shapes.
- **Decomposition / Flow**: Requires a higher escape radius (e.g., 10.0 - 100.0) to allow the pattern to resolve fully before the calculation stops. If your decomposition looks noisy or cut off, increase this value.
- **Glow**: Higher values can compress the glow bands slightly.
- **Extreme values (100-1000)**: Pushing the escape radius very high can create interesting effects — patterns become finer, and some mappings reveal structure that is invisible at lower radii. Worth experimenting with!

**Performance Note**: Higher escape radii generally mean more iterations are needed to reach the edge, which can slightly reduce performance or require increasing the **Max Iterations** count.
`
    },
    'grad.layer2': {
        id: 'grad.layer2',
        category: 'Coloring',
        title: 'Layer 2 & Blending',
        parentId: 'panel.gradient',
        content: `
Layer 2 adds surface complexity by overlaying a second pattern on top of the base layer.

### Blend Modes
- **Mix**: Linear interpolation. At 0.5 opacity, the result is 50% Layer 1 and 50% Layer 2.
- **Add**: Adds brightness. Useful for creating glowing veins or energy overlays.
- **Multiply**: Darkens the base color. Great for adding grime, shadows, or ambient occlusion style darkening.
- **Screen**: The opposite of Multiply — brightens by combining the inverse of both layers. Useful for soft glows, light leaks, and ethereal effects. Dark areas in Layer 2 have no effect; light areas brighten the result.
- **Overlay**: Increases contrast. Light parts get lighter, dark parts get darker. Preserves highlights and shadows.
- **Bump (Normal)**: **Does not change color!** Instead, it uses the brightness of Layer 2 to perturb the surface **Normal**.
  - Creates the illusion of physical depth, scratches, or embossing.
  - Requires **Shading** (Lighting) to be visible.
`
    },
    'grad.texture': {
        id: 'grad.texture',
        category: 'Coloring',
        title: 'Image Texturing',
        parentId: 'panel.gradient',
        content: `
Instead of a 1D gradient, you can map a 2D image onto the fractal surface.

### UV Generation
Since fractals are infinite and generated procedurally, they have no native UV coordinates. We must generate them mathematically.
- **U Mapping**: Selects the property for the horizontal (X) texture coordinate.
- **V Mapping**: Selects the property for the vertical (Y) texture coordinate.

### Tips for Good Texturing
- **Decomposition** on U and **Iterations** on V often produces a mapping that follows the natural flow of the fractal structures (like uv-unwrapping).
- **Radial** mapping on both axes can create spherical projection effects.
- **Texture Scale**: Controls how many times the image repeats. High values create detailed surface grain; low values project the image across the whole object.
- **Seamless Textures**: Use tileable images to avoid visible seams.
`
    },
    'grad.noise': {
        id: 'grad.noise',
        category: 'Coloring',
        title: 'Procedural Noise',
        parentId: 'panel.gradient',
        content: `
Adds fine surface detail using a 3D Simplex Noise function calculated in real-time.

### Parameters
- **Scale**: The size of the noise grain.
  - High values (100+) create dusty, sandy, or metallic grain.
  - Low values (1-10) create large blobs or camouflage patterns.
- **Turbulence**: Distorts the noise coordinate space, creating marble-like swirls and fluid distortions.
- **Bump**: Uses the noise value to perturb the surface normals.
  - Positive values create bumps.
  - Negative values create pits/dents.
  - Essential for realistic rock, rust, or concrete surfaces.
- **Mix Strength**: Blends the noise color (single color) with the gradient colors.
`
    },
    'grad.editor': {
        id: 'grad.editor',
        category: 'Coloring',
        title: 'Gradient Editor',
        parentId: 'panel.gradient',
        content: `
The gradient editor lets you design custom color ramps by placing and adjusting color knots along a bar.

### Knots
Click on the gradient bar to add a new knot. Drag knots to reposition them. Select a knot and use the color picker to change its color, or delete it.

### Per-Knot Interpolation
Each knot can have its own interpolation mode, controlling how colors blend between that knot and the next:
- **Linear**: Smooth, even transition between colors (the default).
- **Step**: Hard cut — the color jumps instantly to the next knot with no blending. Great for flat-shaded or "poster" looks.
- **Smooth**: Eased transition that accelerates and decelerates, giving a softer, more natural blend than Linear.

### Bias Handles
Enable **Bias handles** from the context menu (right-click the gradient bar). Bias handles appear between knots and let you push the midpoint of a transition toward one side or the other — so you can make one color dominate more of the space between two knots without moving the knots themselves. Useful for fine-tuning subtle transitions.

### Presets
Right-click the gradient bar to access **gradient presets** — a library of ready-made color ramps you can load instantly. These are a great starting point to tweak from.
`
    }
};
