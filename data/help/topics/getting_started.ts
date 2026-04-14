
import { HelpSection } from '../../../types/help';

export const GETTING_STARTED_TOPICS: Record<string, HelpSection> = {
    'gs.welcome': {
        id: 'gs.welcome',
        category: 'Getting Started',
        title: 'Welcome to GMT',
        content: `
GMT is a real-time **3D fractal renderer** that runs entirely in your browser. You can explore infinite mathematical structures, sculpt their appearance with physically-based lighting and coloring, animate them, and export your work — no install required.

## What You Can Do
- **Explore** dozens of built-in fractal formulas (Mandelbulb, Mandelbox, Apollonian, Julia sets, and many more)
- **Sculpt** surface detail using parameters A–F on each formula
- **Light** your scene with point lights and sun lights, complete with shadows and ambient occlusion
- **Color** surfaces using palette mapping, orbit traps, or custom gradients
- **Animate** any parameter over time with the Timeline
- **Export** scenes as shareable GMF files, Smart PNG snapshots, or high-quality mesh exports

## Quick Start
1. The fractal renders immediately on load — you're already inside it.
2. **Left-click and drag** the viewport to orbit the camera.
3. Open the **Formula** panel (right side) and try changing the formula from the dropdown.
4. Drag the **A–F sliders** to reshape the fractal.
5. Hit the **Camera Icon** in the top bar to save a snapshot.

Right-click any control to get context-sensitive help for that specific feature.
`
    },
    'gs.navigation': {
        id: 'gs.navigation',
        category: 'Getting Started',
        title: 'Navigating the Viewport',
        parentId: 'gs.welcome',
        content: `
GMT has two camera modes. Press **Tab** to switch between them.

## Orbit Mode (default)
Rotate around a fixed point in space — great for inspecting a fractal from all sides.

- **Left Drag**: Rotate
- **Right Drag**: Pan
- **Scroll**: Zoom in/out
- **Q / E**: Roll the camera

## Fly Mode
Free-fly through the fractal like a spaceship — essential for exploring deep interiors.

- **W / S**: Move forward / backward
- **A / D**: Strafe left / right
- **Space / C**: Ascend / descend
- **Mouse Drag**: Steer (look around)
- **Scroll**: Adjust fly speed
- **Shift**: 4× speed boost
- **Q / E**: Roll the camera

## Tips
- Fractals are **infinitely detailed** — zoom in far enough and new structures appear.
- If you get lost, open the **Camera Manager** (camera icon in the top bar → Camera Manager) to reset to a saved slot or use **Reset Position**.
- **Ctrl + Shift + Z / Y** undoes and redoes camera moves independently of parameter history.
`
    },
    'gs.ui_layout': {
        id: 'gs.ui_layout',
        category: 'Getting Started',
        title: 'Understanding the UI',
        parentId: 'gs.welcome',
        content: `
## Top Bar
The **Top Bar** spans the full width at the top of the screen:
- **Left (Render Tools)**: Logo, render status indicator, quality and accumulation controls
- **Center (Light Studio)**: Quick access to your light slots — click any orb to open its settings, hover to adjust
- **Right**: Camera & Snapshot (camera icon), System Menu (hamburger ≡), Help Menu (?)

## Right Dock (Control Panels)
The **right side panel** is the main control deck, organized into tabs:

| Tab | What it controls |
|-----|-----------------|
| **Formula** | Active formula, parameters A–F, iteration settings |
| **Graph** | Node-based formula builder (Modular formula mode) |
| **Scene** | Background, environment, fog |
| **Shader** | Surface coloring, orbit traps, materials |
| **Gradient** | Color palette editor |
| **Quality** | Ray marching quality, step count, accuracy |

Additional panels (**Light**, **Audio**, **Drawing**) can be opened from the System Menu or their respective feature areas.

## Left Dock
The **left dock** is hidden by default. It opens when you activate specific panels — the **Camera Manager** and the **Engine** panel live here. These can also be floated or moved to the right dock.

## Formula Workshop
The **Formula Workshop** is a code editor for formulas. Open it via the formula dropdown in the Formula panel. It supports both native **GLSL** formulas and imported **Fragmentarium (.frag)** files.

## Timeline (Bottom)
Press **T** to show/hide the animation **Timeline**. Add tracks by right-clicking any parameter's animation icon in the panels.
`
    },
    'gs.formulas': {
        id: 'gs.formulas',
        category: 'Getting Started',
        title: 'Choosing a Formula',
        parentId: 'gs.welcome',
        content: `
The **formula** defines the mathematical shape of the fractal. GMT ships with over 40 built-in formulas.

## Switching Formulas
- Open the **Formula** panel (right dock) and use the dropdown to pick a formula.
- Formulas are grouped by type (classic, polyhedra, Julia variants, etc.)
- Many formulas include presets that configure parameters and scene settings together.

## Parameters A – F
Every formula exposes up to 6 named parameters (shown as **A, B, C, D, E, F** in the UI). These map to the formula's internal constants and dramatically change the shape.

- Drag sliders to explore the parameter space.
- Right-click any slider to reset it, copy its value, or jump to its help entry.

## Formula Workshop
The **Formula Workshop** lets you write or import custom formulas:
- Supports native **GLSL** shader formulas
- Supports **Fragmentarium (.frag)** files — imported and converted automatically
- Open it from the formula dropdown or the System Menu
`
    },
    'gs.saving': {
        id: 'gs.saving',
        category: 'Getting Started',
        title: 'Saving & Sharing Your Work',
        parentId: 'gs.welcome',
        content: `
## Save a Scene (.gmf)
**System Menu → Save Preset** saves a **.gmf** file containing everything: the formula, all parameters, camera position, lighting, animations. Load it back with **System Menu → Load Preset**.

## Smart PNG Snapshots
Click the **Camera Icon** in the Top Bar to take a snapshot. The image is a standard PNG, but the full scene state is invisibly embedded inside it.

- Share the PNG file directly (Discord, email, cloud storage) to let others load your exact scene.
- **Warning**: Social media platforms strip this metadata. The image will look fine but won't restore the scene.

## Share Links
The **System Menu** has a copy link option that encodes the current scene into a URL. Anyone with the link can open it in GMT.

- Formulas written in the Formula Workshop are **too large** for URL sharing — save as GMF instead.
- Very complex animations may have keyframes stripped automatically to fit within URL limits (a warning appears).

## Camera Slots
Save and recall up to 9 camera positions using keyboard shortcuts:
- **Ctrl + 1–9**: Save current camera view to slot 1–9 (creates slot if empty, overwrites if occupied)
- **1–9**: Instantly recall the camera saved in that slot

Camera slots are also visible and manageable in the **Camera Manager** panel (camera icon → Camera Manager). They are saved inside your scene file when you export.
`
    }
};
