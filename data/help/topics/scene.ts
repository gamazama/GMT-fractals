
import { HelpSection } from '../../../types/help';

export const SCENE_TOPICS: Record<string, HelpSection> = {
    'panel.scene': {
        id: 'panel.scene',
        category: 'UI',
        title: 'Scene Panel',
        content: `
Configures the camera, the sky and atmosphere, and post-processing.

## Sections
- **Optics (DOF & Lens)**: Field of view, projection mode, and Depth of Field (blur).
- **Camera & Navigation** (Advanced Mode Only): Movement mode, speed, and absolute coordinates.
- **Background & Sky**: What surrounds the fractal — a solid color, gradient, or HDR sky image — and how much it shows and lights the scene.
- **Fog**: Distance fog that follows the sky's colors by default.
- **Volumetric Scatter**: Atmospheric light scattering (compiled in only when you enable it).
- **Water Plane** (when enabled): Water surface simulation.
- **Color Correction**: Saturation, levels, and gamma adjustments.
- **Effects**: Bloom, Chromatic Aberration, and Droste effect.
`
    },
    'scene.background': {
        id: 'scene.background',
        category: 'UI',
        title: 'Background & Sky',
        parentId: 'panel.scene',
        content: `
The backdrop IS the sky: one environment definition feeds everything that looks at it — the visible background, environment lighting, fog color, and reflections.

## Source
Pick what the sky is:
- **Solid**: A single **Sky Color**. Simple, and still a real sky — lighting and fog read from it.
- **Gradient**: A **Sky Gradient** you can edit like any other gradient.
- **Sky Image**: An HDR environment map. The **Skies** button opens the Sky Library — bundled sample skies load with one click, and skies you upload are kept on your device. **Rotation** turns the sky around you.

## The two consumer sliders
- **Sky Visibility**: How much of the sky you *see* behind the fractal. At 0 the backdrop is black but the sky can still light the scene.
- **Environment Light**: How much the sky *illuminates* the fractal surface.

Camera Blur (Depth of Field) softens the backdrop consistently with scene depth, so an out-of-focus sky reads naturally.
`
    },
    'scene.fog': {
        id: 'scene.fog',
        category: 'UI',
        title: 'Fog',
        parentId: 'panel.scene',
        content: `
Distance fog fades the fractal toward the sky. Turn up **Fog Intensity** and its controls unfold beneath it.

## Controls
- **Fog Range**: A dual-thumb slider — where the fog starts and where it saturates.
- **Sky Tint**: How much the fog takes its color from the sky, per viewing direction. At full tint, fog in front of a sunset horizon is warm while fog against the zenith is cool — it belongs to the scene. Lower the tint to reveal a flat **Fog Color** of your choosing underneath.
- **Density**: How thick the fog builds across the range.

Fog is consistent everywhere it appears: it also grades reflections along their reflected rays and dims distant light spheres, so foggy scenes hold together.

## Volumetric Scatter
The section below Fog adds true light scattering — god-rays and glowing air around lights. It costs compile time and framerate, so it is **compiled in only when you enable it** with its toggle; quality presets never switch it on behind your back.
`
    },
    'scene.grading': {
        id: 'scene.grading',
        category: 'UI',
        title: 'Color Correction',
        parentId: 'panel.scene',
        content: `
Post-processing adjustments applied to the final image.

## Controls
- **Saturation**: Controls color intensity. 0.0 is Grayscale, 1.0 is Normal, >1.0 is Vivid.
- **Histogram & Levels**:
  - **Black Point (Min)**: Any pixel darker than this becomes pure black. Increasing this adds contrast.
  - **White Point (Max)**: Any pixel brighter than this becomes pure white.
  - **Gamma**: Non-linear brightness curve. Adjusts mid-tones without crushing blacks or whites.
`
    },
    'cam.mode': {
        id: 'cam.mode',
        category: 'UI',
        title: 'Camera Mode',
        parentId: 'panel.scene',
        content: `
> **REQUIRES ADVANCED MODE**

Determines how the camera moves through the fractal.

## Orbit Mode
The camera rotates around a pivot point.
- **Left Click**: Rotate around target.
- **Right Click**: Pan target.
- **Scroll**: Zoom in/out.
- **Precision**: When you release the mouse, the engine automatically re-centers the coordinate system around your new pivot point. This ensures you can zoom infinitely into details without losing floating-point precision.

## Fly Mode
First-person free flight, similar to a drone or spacecraft.
- **Left Click Drag**: Mouse look (rotate camera).
- **WASD**: Move horizontally.
- **Space/C**: Move Up/Down.
- **Q/E**: Roll.
- **Shift**: Speed Boost (4x).
- **Best For**: Exploration, cinematic fly-throughs, and navigating inside tunnels.

> **Note**: In Fly mode with the timeline open, the Space key only triggers play/pause when hovering over the timeline. Otherwise it moves the camera up.
`
    },
    'cam.rotation': {
        id: 'cam.rotation',
        category: 'UI',
        title: 'Camera Rotation',
        parentId: 'cam.mode',
        content: `
Controls the orientation of the camera in 3D space.

## Mouse Controls
- **Fly Mode**: Click and drag in the viewport to look around freely (mouse-look).
- **Orbit Mode**: Click and drag to rotate around the current pivot point.

## Keyboard Controls
- **Q / E**: Roll the camera left or right (tilt your head). Useful for diagonal compositions or matching a fractal's natural symmetry.

## Rotation Display
The rotation values are shown as three angles (one per axis). You can **right-click** the rotation control to switch between **Degrees** (e.g. 45°) and **Radians** (e.g. 0.25π) — whichever you find easier to work with.
`
    },
    'cam.fov': {
        id: 'cam.fov',
        category: 'UI',
        title: 'Field of View (FOV)',
        parentId: 'panel.scene',
        content: `
Controls the zoom angle of the camera lens (in degrees).

- **High FOV (90°+)**: "Fish-eye" look. Increases sense of speed and scale. Great for flying inside tunnels.
- **Low FOV (10°-30°)**: "Telephoto" look. Flattens depth. Great for macro photography of small details.
- **Standard (60°)**: Natural human vision balance.

## Projection Modes
- **Perspective (Default)**: Standard 3D perspective projection using FOV.
- **Orthographic**: Parallel projection with no perspective distortion. Uses **Ortho Scale** instead of FOV to control the visible area.
- **360 Skybox**: Renders a full 360° equirectangular panorama. Useful for VR content or environment maps.
`
    },
    'cam.position': {
        id: 'cam.position',
        category: 'UI',
        title: 'Absolute Position',
        parentId: 'panel.scene',
        content: `
> **REQUIRES ADVANCED MODE**

The raw coordinate of the camera in fractal space.

## Precision Note
Due to the "Infinite Zoom" engine, this value combines the **Offset** (the position of the universe) and the **Local Camera** (relative position).
Editing these values directly allows for precise teleportation, but be careful: large jumps may land you inside solid geometry (black screen).
`
    },
    'scene.geometry': {
        id: 'scene.geometry',
        category: 'UI',
        title: 'Geometry & Transforms',
        parentId: 'panel.formula',
        content: `
Controls the spatial transformations and geometric modifications applied to the fractal before or during iteration.

## Julia Mode
Switches from **Mandelbrot** mode (where C = position) to **Julia** mode (where C = constant).
- **Julia X/Y/Z**: The 3D Julia constant. Changing these morphs the fractal shape smoothly.
- **Tip**: Find an interesting area in Mandelbrot mode, then toggle Julia and adjust the constant to "freeze" that region.

## Pre-Rotation
Rotates the entire coordinate space before the fractal iteration begins.
- **Rot X / Y / Z**: Euler angles (degrees). Creates tilted, diagonal versions of the fractal.
- **Master Toggle**: Enables/disables all pre-rotation at once.

## Burning Mode
Applies absolute value (\`abs()\`) to coordinates before iteration, creating the "Burning Ship" variant of any formula. Produces sharp, angular structures.

## Hybrid Box (Fold System)
Injects a geometric folding operation into the fractal iteration loop. The fold runs *before* the main formula step each iteration.

### Fold Types
- **Standard**: Classic Mandelbox box fold + sphere fold.
- **Half**: One-sided fold (reflects only positive side).
- **Tetra**: Tetrahedral reflection folds (Sierpinski-like).
- **Octa**: Octahedral reflection folds.
- **Icosa**: Icosahedral/dodecahedral folds (golden ratio reflections).
- **Menger**: Axis-sorting Menger sponge fold.
- **Mirror**: Simple axis-aligned mirror.
- **Decoupled**: Independent per-axis fold limits.
- **Kali**: Kali's abs-inversion fold.

### Hybrid Controls
- **Fold Iterations**: How many fold passes per formula iteration.
- **Scale / MinR / FixedR**: Standard Mandelbox-type fold parameters.
- **Skip / Swap**: Skip the first N iterations, or swap fold/formula order.
- **Add C**: Whether to add the constant C after folding (affects convergence).
- **Shift / Rotation**: Per-fold spatial offsets and rotations.
`
    },
    'dof.settings': {
        id: 'dof.settings',
        category: 'Rendering',
        title: 'Depth of Field (DOF)',
        parentId: 'panel.scene',
        content: `
Simulates a physical camera lens.

- **Camera Blur**: Strength of the blur. 0.0 = Pinhole camera (infinite focus). 
  - The blur effect accumulates over time when the camera is stationary.
  - During camera movement, DOF is temporarily disabled for a stable preview.
  - Supports **High Precision** (down to $0.0001$) for macro photography.
- **Focus Distance**: Distance to the sharp plane.
- **Auto-Focus**: Use the "Pick Focus" button in the Scene tab to click a point and set this value automatically.

**Note**: DOF requires **Temporal Accumulation** to look smooth. It uses stochastic jittering of the camera ray.
`
    }
};
