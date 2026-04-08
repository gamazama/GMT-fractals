
import { HelpSection } from '../../../types/help';

export const LIGHTING_TOPICS: Record<string, HelpSection> = {
    'panel.light': {
        id: 'panel.light',
        category: 'Lighting',
        title: 'Light Studio',
        content: `
The engine utilizes a sophisticated **Physically Based Rendering (PBR)** approximation to simulate how light interacts with the infinite surfaces of the fractal.

## Light Types
- **Point**: Standard light source. Has position and falloff.
- **Directional (Sun)**: Parallel rays from infinity. Has rotation only. No falloff.

## Top Bar Interaction
- **Light Orbs**: Toggle lights on/off by clicking the orbs in the top bar.
- **Drag & Drop**: Drag a light orb from the top bar directly onto the 3D viewport to place a light on the surface at that point (Raycast placement).
- **Context Menu**: Right-click the light orbs to access quick settings or help.
- **Duplicate Light**: Use the duplicate button in a light's controls to copy its settings to a new light slot.

## Lights
You can enable up to **8 independent light sources** to sculpt the 3D form. The default setup uses a classic 3-point arrangement:
- **Light 1 (Key)**: The primary illumination.
- **Light 2 (Fill)**: Usually placed opposite the Key light. Use a lower intensity and a cool color.
- **Light 3 (Rim)**: Placed behind the object. Creates a glowing outline.

You can add more lights beyond these three for complex multi-light setups.

## Gizmos
When the panel is open or **Show 3d helpers** is enabled, lights appear as glowing sprites in the viewport.
`
    },
    'light.type': {
        id: 'light.type',
        category: 'Lighting',
        title: 'Light Type (Point vs Sun)',
        parentId: 'panel.light',
        content: `
### Point Light
Emits light from a specific point in space radiating outwards.
- **Position**: X, Y, Z coordinates define the origin.
- **Falloff**: Light gets dimmer with distance (Inverse Square Law).
- **Shadows**: Perspective shadows that grow larger/softer with distance from the object.
- **Visible Sphere**: Optionally adds a glowing sphere at the light's position in the scene. You can control its radius and edge softness for a sharp or hazy look.

### Directional Light (Sun)
Emits parallel light rays from infinity.
- **Position**: Irrelevant. Only **Rotation** matters.
- **Falloff**: Disabled (Infinite range). The light creates a constant wall of illumination.
- **Shadows**: Orthographic (Parallel) shadows. Ideally suited for "Sunlight" effects.
- **Visuals**: Indicated by a Sun icon (Rayed Circle) in the top bar.
`
    },
    'light.rot': {
        id: 'light.rot',
        category: 'Lighting',
        title: 'Heliotrope (Direction)',
        parentId: 'panel.light',
        content: `
The **Heliotrope** is a specialized control for setting the angle of Directional (Sun) lights. It maps the 3D sky dome onto a 2D circle.

### How to use
- **Center**: Light comes from directly "Forward" (relative to Camera or World, depending on Mode).
- **Edge**: Light comes from the Horizon (90 degrees).
- **Drag Dot**: Sets the specific angle.

### Parameters
- **Pitch**: Elevation angle (Up/Down). 90° is directly overhead.
- **Yaw**: Compass angle (North/South/East/West).

### Backlighting
If the dot enters the "Backlight Zone" (indicated by red/warning colors), the light is shining from *behind* the target. This creates Rim Lighting but leaves the front face dark.
`
    },
    'light.intensity': {
        id: 'light.intensity',
        category: 'Lighting',
        title: 'Light Intensity & Color',
        parentId: 'panel.light',
        content: `
## Intensity
Controls the energy output of the light source.
- **0.0**: Light is off.
- **1.0**: Standard physical brightness.
- **> 2.0**: High energy. Can cause **Bloom/Glow** artifacts if the surface becomes brighter than 1.0 (pure white).

### Intensity Units
You can choose between two intensity modes:
- **Raw**: A simple multiplier (the default). Good for quick adjustments.
- **Exposure (EV)**: Uses a photographic exposure scale from **-4 to +10 EV**. Each step doubles or halves the brightness. Great when you want precise, predictable control — especially for balancing multiple lights.

**Keyframable**: Yes. Use the diamond icon in the popup menu.

## Color
Light color interacts with the **Surface Material** color via multiplication.
- A **Red Light** on a **White Surface** looks Red.
- A **Red Light** on a **Blue Surface** looks Black (physics correct).
- **Tip**: Use saturation sparingly. Pale lights often look more realistic than deep, saturated lights.

### Color Temperature Mode
Instead of picking a color manually, you can switch to **Color Temperature** mode and use a Kelvin slider (**1000 K – 10000 K**).
- **Low values (1000–3000 K)**: Warm candlelight / golden hour tones.
- **Mid values (5000–6500 K)**: Neutral daylight.
- **High values (8000–10000 K)**: Cool, overcast / blue-sky tones.

This is a quick way to get natural-looking light colors without fiddling with the color picker.
`
    },
    'light.mode': {
        id: 'light.mode',
        category: 'Lighting',
        title: 'Attachment Mode (Headlamp vs World)',
        parentId: 'panel.light',
        content: `
Every light can be anchored in two different coordinate spaces.

### Headlamp
The light is parented to the **Camera**.
- **Behavior**: If you move, the light moves with you.
- **Coordinates**: $(0,0,0)$ places the light exactly inside the camera lens.
- **Use Case**: Flashlights, exploration, ensuring the fractal is always visible while flying.

### World
The light is parented to the **Fractal Universe**.
- **Behavior**: The light exists at a specific coordinate. You can fly past it, orbit around it, or leave it behind.
- **Use Case**: Suns, glowing artifacts, establishing a "sense of place" in a scene.
- **Note**: If you reset the camera position, World lights might end up far away. Use the **Gizmo** to find them.
`
    },
    'light.falloff': {
        id: 'light.falloff',
        category: 'Lighting',
        title: 'Falloff (Inverse Square Law)',
        parentId: 'panel.light',
        content: `
In the real world, light creates a sphere of influence that decays over distance. This setting controls that decay curve.
*Note: This setting is ignored for Directional Lights.*

### Falloff Type
- **Quadratic ($1/d^2$)**: Physically accurate. Light is blindingly bright near the source but fades very quickly. Use this for realistic lamps or fires.
- **Linear ($1/d$)**: Artificial decay. Light travels much further before fading. Useful for abstract scenes where you want to illuminate deep structures without over-exposing the foreground.

### Range
- **0.0**: **Infinite reach**. The light does not decay. It shines with equal intensity at distance $0$ and distance $1,000,000$.
- **> 0.0**: The distance at which the light intensity fades to near-zero. Higher values mean the light reaches **further** before fading out — a larger sphere of influence.

**Keyframable**: Yes. Use the diamond icon.
`
    },
    'shadows': {
        id: 'shadows',
        category: 'Lighting',
        title: 'Raymarched Soft Shadows',
        parentId: 'panel.light',
        content: `
Shadows are essential for depth perception. Without them, it is impossible to tell if a structure is floating or attached.
Each light has its own **Cast Shadow** checkbox, so you can choose exactly which lights produce shadows.

## The Tech: SDF Shadows
We do not use Shadow Maps (rasterization) or BVH Raytracing. We march a ray from the surface *towards* the light.

## Parameters
- **Softness**: Simulates the **Size** of the light source (Area Light). Uses a logarithmic scale.
  - **Low (2–10)**: Pin-point light source. Sharp, hard shadows.
  - **Medium (50–200)**: Moderate-sized light. Visible penumbra.
  - **High (500–2000)**: Very large area light. Extremely soft, diffuse shadows.
- **Intensity**: The opacity of the shadow. Lower this to simulate ambient light filling in the dark spots.
- **Bias**: **Critical Setting**.
  - Pushes the shadow start point away from the surface.
  - **Too Low**: "Shadow Acne" (Black noise/speckles on the surface).
  - **Too High**: "Peter Panning" (Shadow detaches from the object).

## Stochastic Shadows / Area Lights
This is a **compile-time feature** — you need to enable it in the shadow settings, which triggers a shader recompilation. Once enabled, the engine uses randomised sampling to produce realistic area-light shadows.

### Shadow Quality Levels
- **Hard Only**: Traditional sharp shadows with no stochastic sampling. Fastest.
- **Lite Soft**: A lighter stochastic pass — good balance of quality and speed.
- **Robust Soft**: Full stochastic sampling for the highest-quality soft shadows.

### How it looks
- Shadows may appear noisy or grainy while the camera is moving.
- They converge to a clean, high-quality result when the camera stops (via Temporal Accumulation).
- This technique is essential for accurate shadowing on complex sponge/box fractals where traditional methods fail.
`
    },
    'light.pos': {
        id: 'light.pos',
        category: 'Lighting',
        title: 'Light Positioning',
        parentId: 'panel.light',
        content: `
> **REQUIRES ADVANCED MODE**

Precise coordinate control for lights. 
- **Headlamp Mode**: Coordinates are relative to the camera view.
- **World Mode**: Coordinates are absolute in the fractal universe.

**Keyframing**: Use the **Key Icon** in the top bar popup to keyframe the X, Y, and Z coordinates simultaneously.
`
    }
};
