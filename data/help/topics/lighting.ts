
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
- **Sphere (Area)**: Physical area light with finite extent. Produces geometrically-correct soft shadows and visible specular highlights on glossy/mirror surfaces. Requires Path Tracing mode + the **True Area Lights** engine setting. See *Sphere Area Lights* topic for the full setup.

## Top Bar Interaction
- **Light Orbs**: Click an orb to toggle that light on/off.
- **Hover Popup**: Hover over any orb to open its settings popup — Power, Range, Color/Temperature, Cast Shadows, and a direction control for Sun lights.
- **Anchor Icon**: In the popup header, the anchor icon toggles between **World** (cyan) and **Headlamp** (orange) mode. See *Attachment Mode* below.
- **☰ Menu**: Opens options for Light Type, Intensity Unit, Falloff Curve, Duplicate, and Delete.
- **Right-click**: Opens the quick context menu (same options as ☰, plus a help section).
- **Drag & Drop**: Drag a light orb onto the 3D viewport to place it near the visible surface. Automatically enables shadows and gizmos on drop.
- **Expand (↓)**: The small chevron at the right of the light orbs expands the studio to show all 8 light slots.

## Lights
You can enable up to **8 independent light sources** to sculpt the 3D form. The default setup uses a classic 3-point arrangement:
- **Light 1 (Key)**: The primary illumination.
- **Light 2 (Fill)**: Usually placed opposite the Key light. Use a lower intensity and a cool color.
- **Light 3 (Rim)**: Placed behind the object. Creates a glowing outline.

You can add more lights beyond these three for complex multi-light setups.

## Gizmos
When **Show 3D helpers** is enabled (in the Advanced Light panel), Point lights appear as draggable glowing sprites in the viewport with X/Y/Z axis handles.
`
    },
    'light.type': {
        id: 'light.type',
        category: 'Lighting',
        title: 'Light Type (Point / Sun / Sphere)',
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

### Sphere (Area)
Physical area light with finite extent — the most realistic option.
- **Light Radius**: Defines the *physical size* of the light source. Larger = softer shadows, more diffused highlights.
- **Shadows**: Geometrically correct — sharp close to the light's occluder, gradually softening with distance. Determined by physics (radius + distance), not the global Hardness slider.
- **Specular Highlights**: Glossy and mirror surfaces show a real reflection of the light surface — the bright highlight you'd expect from a physical lamp reflecting off polished material.
- **Visible Sphere**: Toggles only the rendered emitter ball. The light continues to integrate as an area light either way.
- **Requires**: Path Tracing mode + the **True Area Lights** engine setting (Engine panel → Path Tracing → True Area Lights). See *Sphere Area Lights* topic for the full setup.
- **In Direct mode**: Behaves as a Point light at the sphere's center. The per-light popover shows an amber warning when the prerequisites aren't met.
`
    },
    'light.sphere': {
        id: 'light.sphere',
        category: 'Lighting',
        title: 'Sphere Area Lights',
        parentId: 'panel.light',
        content: `
**Physically-correct area lights for the path tracer.** A real lamp has a finite size — its shadows are geometrically softer when far from the surface and sharper when close, and it produces visible specular reflections on polished materials. Sphere area lights deliver this; Point lights cannot.

## How to enable

1. **Engine panel → Path Tracing → Path Tracing Core**: ON.
2. **Engine panel → Active Mode**: Path Tracing (GI).
3. **Engine panel → True Area Lights**: ON. This is a one-time recompile (~600 ms).
4. **Per light**: right-click any light orb (or use the ☰ menu) and pick **Sphere (Area)**. The light gets a default radius of 0.5 — tune it to taste.

If any of these are missing, the light's popover shows an amber warning explaining what's needed.

## What changes vs Point lights

- **Soft shadows are physical**, not faked. Width depends on the sphere's radius and the distance between occluder and surface — exactly how a lamp behaves in real life. The global *Hardness* slider does not apply.
- **Glossy and mirror surfaces show specular highlights from the light** — a bright reflection of the sphere itself on polished material. Point lights never produced this in the path tracer.
- **Convergence is roughly twice as fast** for scenes with sphere lights — clean shadows in ~64-128 accumulation frames instead of 256+. The PT combines two estimators (next-event sampling + BSDF sampling) using Multiple Importance Sampling.

## The Visible Sphere toggle

For Sphere lights, the **Visible Sphere** toggle controls *only* whether the glowing emitter ball is rendered in the viewport. The light continues to integrate as an area light when off — handy for getting a clean "invisible studio lighting" look while still benefitting from the physical shadows and reflections.

For Point lights the toggle keeps its old behaviour: off = invisible analytical light at zero radius.

## Sliders that don't apply

- **Hardness** (in the Shadow panel): Affects only Point and Directional lights.
- **Soft Shadow Jitter** (engine panel): A separate trick for faking soft shadows on Point lights via stochastic sampling. Not used by Sphere lights — they have real area sampling instead.
- **Edge Softness** (per-light): Controls the *visible emitter sphere's* halo shape, not the area-light shadow softness.

## Performance

- One-time compile cost: ~600 ms when you enable True Area Lights.
- Per-frame GPU cost scales with the number of Sphere lights (each bounce ray tests against every sphere light). Default 3-light scenes are fine. With 8+ Sphere lights enabled, the cost may show up — bench-verify if needed.
- Default scenes that don't enable True Area Lights pay no cost — the new code paths are stripped at GPU compile.
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
Every light can be anchored in two different coordinate spaces. Toggle between them using the **anchor icon** in the top-left of the light's popup (or the Attachment Mode toggle in the Advanced Light panel).

- **Cyan anchor icon** = World anchored. Click to switch to Headlamp.
- **Orange crossed-anchor icon** = Attached to Camera (Headlamp). Click to switch to World.

When switching modes the light's position is automatically converted so it stays in the same visual location.

### Headlamp (Camera-attached)
The light is parented to the **Camera**.
- **Behavior**: Moves with you as you fly.
- **Coordinates**: $(0,0,0)$ places the light exactly at the camera lens.
- **Use Case**: Flashlights, exploration, ensuring a surface is always lit while navigating.

### World (Scene-anchored)
The light is parented to the **Fractal Universe**.
- **Behavior**: The light exists at a fixed coordinate. You can fly past it, orbit around it, or leave it behind.
- **Use Case**: Suns, glowing artifacts, establishing a "sense of place" in a scene.
- **Note**: If you reset the camera position, World lights might end up far away. Enable **Show 3D helpers** to locate them via their gizmo.
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
- **Hardness**: Controls penumbra width for **Point and Directional lights only**. Uses a logarithmic scale.
  - **Low (2–10)**: Pin-point light source. Sharp, hard shadows.
  - **Medium (50–200)**: Moderate-sized light. Visible penumbra.
  - **High (500–2000)**: Very large light. Extremely soft, diffuse shadows.
  - *Sphere area lights ignore this — their softness comes from physical sphere sampling.*
- **Intensity**: The opacity of the shadow. Lower this to simulate ambient light filling in the dark spots.
- **Bias**: **Critical Setting**.
  - Pushes the shadow start point away from the surface.
  - **Too Low**: "Shadow Acne" (Black noise/speckles on the surface).
  - **Too High**: "Peter Panning" (Shadow detaches from the object).

## Soft Shadow Jitter (formerly "Area Lights")
A **compile-time feature** — enable it in the shadow settings to recompile the shader with stochastic shadow code. Once on, the engine perturbs the shadow ray within a cone to *fake* soft shadows on Point and Directional lights via accumulation. This is a fast approximation, not physically correct.

For *true* area lights with geometrically-correct soft shadows + visible specular highlights, use the **Sphere** light type instead — see *Sphere Area Lights* topic. The two systems are independent: jitter still works for Point lights, sphere sampling drives Sphere lights.

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
