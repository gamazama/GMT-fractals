
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
- **Radial**: Based on the distance of the final surface point from the center $(0,0,0)$. Creates spherical gradients and large-scale color shifts.
- **Z-Depth**: Height map based on the Z coordinate. Useful for creating landscapes or strata effects.
- **Angle**: Based on the polar angle around the Z-axis. Creates spirals and pinwheels.
- **Normal**: Based on the surface slope (Up vs Down). Adds pseudo-lighting effects or "snow on peaks" looks.

### Fractal Mappings
- **Iterations (Glow)**: Based on how many iterations it took to decide the point was "solid". Creates smooth, glowing bands outlining the shape. The classic "Electric Sheep" look.
- **Raw Iterations**: Same as Iterations but without smoothing. Shows distinct bands or steps. Useful for technical analysis or stylized "8-bit" looks.
- **Decomposition**: Analytic decomposition of the complex number angles during iteration. Creates checkered, grid-like, or circuit-board patterns. Highly sensitive to the **Escape Radius**.
- **Potential (Log-Log)**: Measures the electrical potential of the set. Creates very smooth, gradient-like bands, especially near the boundaries of the fractal. Ideal for continuous color flows.
`
    },
    'grad.escape': {
        id: 'grad.escape',
        category: 'Coloring',
        title: 'Escape Radius',
        parentId: 'panel.gradient',
        content: `
The distance from the origin ($R$) at which the formula considers a point to have "escaped" to infinity.

### Impact on Coloring
- **Standard**: Usually around 2.0 to 4.0.
- **Decomposition**: Requires a higher escape radius (e.g., 10.0 - 100.0) to allow the "grid" pattern to resolve fully before the calculation stops. If your decomposition pattern looks noisy or cut off, increase this value.
- **Glow**: Higher values can compress the glow bands slightly.

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
    }
};
