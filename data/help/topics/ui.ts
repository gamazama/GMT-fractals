
import { HelpSection } from '../../../types/help';

export const UI_TOPICS: Record<string, HelpSection> = {
    'ui.controls': {
        id: 'ui.controls',
        category: 'UI',
        title: 'Control Deck',
        content: `
The Control Deck is your primary interface for manipulating the fractal.

## Docking System
The deck is designed to be flexible for multi-monitor or large screen workflows.
- **Undocking**: Click the **Undock Icon** (Square with arrow) next to a tab name to detach it into a floating window.
- **Redocking**: Close the floating window to return it to the main deck.
- **Minimizing**: Click the chevron arrow in the header to collapse the panel to the side/bottom.

## Tabs
- **Formula**: Shape structure, iterations, and core math parameters.
- **Scene**: Camera, Navigation, Fog, and Depth of Field.
- **Light** (Advanced Mode): Lighting studio (3 lights) and shadows.
- **Shader**: Surface material (PBR), Glow, and Ambient Occlusion.
- **Gradient**: Color palettes and texturing.
- **Quality**: Performance tuning, Anti-aliasing, and Resolution.
- **Engine**: Compile-time settings that require shader recompilation.
- **Audio** (when enabled): Audio-reactive parameters.
- **Drawing** (when enabled): Measurement and annotation tools.
- **Camera Manager**: Camera presets, saved views, and composition guides.
- **Graph** (Modular Mode): The node-based formula builder.
`
    },
    'ui.viewport': {
        id: 'ui.viewport',
        category: 'UI',
        title: 'Viewport Interaction',
        content: `
The main view displays the fractal in real-time.

## Focus Picking (DOF)
To set the **Depth of Field** focal plane exactly on a subject:
1. Go to the **Scene** tab.
2. Click **Pick Focus**.
3. Click anywhere on the fractal surface in the viewport.
The camera lens will focus perfectly on that point, blurring foreground and background elements based on the **Aperture** setting.

## Light Gizmos
When the **Light Panel** is open or "Show 3d helpers" is enabled:
- Each light appears as a 3D gizmo with colored axis lines (X=red, Y=green, Z=blue), colored planes, and a center dot filled with the light's color.
- **Drag** the gizmo to reposition the light directly in 3D space.
- **Click the Anchor Icon** below the gizmo to toggle between **Headlamp** (light moves with the camera) and **World** (light stays fixed in the scene) modes.
`
    },
    'ui.colorpicker': {
        id: 'ui.colorpicker',
        category: 'UI',
        title: 'Color Picker',
        content: `
The application uses a compact, high-precision **HSV Slider** system.

## Usage
- **Hue (H)**: Top bar. Shows the spectrum of colors.
- **Saturation (S)**: Middle bar. Intensity of color (Left=White, Right=Vivid).
- **Value (V)**: Bottom bar. Brightness (Left=Black, Right=Bright).

## Context Menu
**Click** or **Right-click** the color swatch (square on the left) to access:
- **Copy/Paste**: Transfer hex codes between pickers.
- **History**: Quickly revert to recently used colors.
- **Quick Picks**: Pure White/Black shortcuts.
`
    },
    'ui.gradient_editor': {
        id: 'ui.gradient_editor',
        category: 'UI',
        title: 'Gradient Editor',
        content: `
A spline-based color ramp editor used for surface coloring.

## Interaction
- **Add Knot**: Click anywhere on the bottom track. In **Step** mode, new knots inherit the held color instead of interpolating.
- **Move Knot**: Drag a knot left/right.
- **Remove Knot**: Drag a knot away from the track or press Delete.
- **Select Multiple**: Drag a selection box or **Shift+Click** knots.
- **Duplicate Knot**: **Ctrl+Drag** a knot to duplicate it.
- **Bias**: Drag the diamond handle between knots to shift the interpolation midpoint. Hidden in **Step** mode (no effect).

## Interpolation Modes
Each knot controls how color transitions to the next knot:
- **Linear**: Straight RGB blend (default).
- **Step**: Hard color switch at the next knot boundary — no blending.
- **Smooth**: Smoothstep easing (ease-in/ease-out).

## Multi-Selection
Select 2+ knots to reveal **bracket handles**:
- **Drag the selection area** to move all selected knots together.
- **Drag the [ ] brackets** on either side to scale/compress the selection. Dragging a bracket past the opposite side inverts the knot order.
- **Ctrl+Drag the selection area** to duplicate the selected knots.

## Presets
Click the **Presets** button (top-right) to load predefined gradients, or Copy/Paste gradients as JSON.

## Context Menu
Right-click the track to:
- **Distribute**: Evenly space selected knots.
- **Invert**: Flip the gradient.
- **Double Knots**: Increase resolution.
- **Bias Handles**: Toggle visibility of bias diamond handles.
- **Reset Default**: Restore the gradient to its default state.
- **Delete Selected**: Remove all currently selected knots.
- **Output Mode**: Switch color space (sRGB, Linear, Inverse ACES).
`
    },
    'ui.histogram': {
        id: 'ui.histogram',
        category: 'UI',
        title: 'Histogram & Auto-Levels',
        content: `
The Histogram visualizes the distribution of values across the fractal surface.

## Why is it useful?
Fractal coloring is based on mapping a value (like Orbit Trap distance) to a gradient.
If the mapping range doesn't match the actual values in the fractal, the image will look flat (all one color) or washed out.

## Controls
- **Graph**: Shows frequency of values. Tall bars mean "lots of pixels have this value".
- **Range Handles**: Drag the left/right handles to define the start/end of the gradient.
- **Auto**: Automatically analyzes the frame and sets the range to cover the most interesting data (ignoring background noise).
- **Refresh**: Manually re-scan the frame (useful if Auto is off to save performance).
`
    },
    'ui.slider': {
        id: 'ui.slider',
        category: 'UI',
        title: 'Precision Sliders',
        content: `
All numeric inputs in the application use **Precision Draggable Sliders**.

## Interaction
- **Drag Number**: Click and hold the number display text to adjust the value. This allows values to extend beyond the visual slider's min/max limits.
- **Shift + Drag Number**: **10x Speed**. Useful for large adjustments.
- **Alt + Drag Number**: **0.1x Precision**. Useful for fine-tuning.
- **Click Number**: Switch to typing mode to enter exact values.
- **Reset**: Hover over the right edge of the slider track to reveal a hidden reset button (restores default value).

## Keyframing
If the Timeline is open and recording, changing a slider will automatically create a keyframe.
Sliders with active animations (LFO or Keyframes) will show a **Key Icon** or Highlight color.
`
    },
    'ui.vector': {
        id: 'ui.vector',
        category: 'UI',
        title: 'Vector3 & Vector2 Controls',
        content: `
Multi-axis numeric controls for position, rotation, and transformation parameters.

## Translation Mode (Default)
Standard X, Y, Z (or X, Y) axis controls.
- **Axis Labels**: X (red), Y (green), Z (blue)
- **Drag**: Adjust individual axis values
- **Double-click Label**: Reset that axis to its default value

## Rotation Mode
Automatically activated for rotation parameters (detected by "rot" in the name).
Displays a **Heliotrope** direction visualizer alongside the numeric inputs.

### Heliotrope (Direction Visualizer)
The circular widget shows the rotation direction in 3D space.
- **Center Dot**: Points toward the camera (forward)
- **Arrow**: Shows the direction the rotation is pointing
- **Boundary Ring**: Represents 90° from center
- **Drag**: Change azimuth (horizontal) and pitch (vertical)
- **Shift + Drag**: Constrain to single axis
- **Alt + Drag**: High precision mode
- **Double-click**: Reset both angles to 0

### Rotation Axes (A, P, ∠)
- **A (Azimuth)**: Horizontal rotation angle (-π to +π)
- **P (Pitch)**: Vertical tilt angle (-π/2 to +π/2)
- **∠ (Angle)**: Additional rotation around the direction vector (vec3 only)

### Unit Display
- **Right-click** the control to toggle between Degrees (°) and Radians (π)
- Display shows 1 decimal, text input accepts up to 6 decimals
- In π mode, type values like "0.5π" or "90°"
`
    },
    'panel.drawing': {
        id: 'panel.drawing',
        category: 'UI',
        title: 'Measurement & Drawing',
        content: `
Tools for annotated screenshots, measurements, and composition planning.

## Tools
- **Rectangle / Circle**: Select a shape type.
- **Origin Modes**:
  - **Global Zero**: Draws on the world plane $(0,0,0)$.
  - **Surface Probe**: Draws on a plane perpendicular to the camera at the exact distance of the fractal surface (like a 3D cursor).

## Keyboard Modifiers
- **Drag**: Draw shape corner-to-corner.
- **Hold Alt**: Draw from Center outward.
- **Hold Shift**: Constrain to 1:1 ratio (Perfect Square/Circle).
- **Hold X**: Snap plane to nearest World Axis (Front/Top/Side).
- **Hold Space**: Move the starting anchor point while drawing.
`
    },
    'panel.webcam': {
        id: 'panel.webcam',
        category: 'UI',
        title: 'Webcam Overlay',
        content: `
> **REQUIRES ADVANCED MODE**

Overlays a live webcam feed on top of the viewport. Useful for recording tutorials, live streaming, or picture-in-picture compositions.

## Features
- **Drag & Resize**: Move and resize the webcam window directly in the viewport.
- **Crop**: Drag the edge handles to crop the feed.
- **Blend Modes**: Normal, Screen, Overlay, Lighten, Difference.
- **Opacity**: 0-3x range (values above 1 boost brightness).
- **3D Tilt**: Applies perspective rotation for a dynamic look.
- **CRT Scanlines**: Retro scanline effect overlay.

## Input Visualization
When enabled, also displays an overlay showing currently pressed keys (WASD, modifiers, mouse buttons, scroll) with fade animations. Useful for tutorials.
`
    },
    'panel.camera_manager': {
        id: 'panel.camera_manager',
        category: 'UI',
        title: 'Camera Manager',
        content: `
Manage camera positions, presets, and composition guides.

## Quick Views
Preset buttons for standard views: **Front, Back, Left, Right, Top, Bottom, Isometric**. Click to teleport the camera instantly.

## Saved Cameras
- **Save**: Click "New Camera" to bookmark the current position and rotation.
- **Restore**: Click a saved camera to teleport back.
- **Rename**: Double-click the camera label.
- **Delete**: Click the X button on a saved camera.

## Composition Guides
Overlay guides for framing your shots:
- **Rule of Thirds** / **Golden Ratio** / **Grid** / **Center Mark** / **Diagonal** / **Spiral** / **Safe Areas**
- Customizable opacity, line width, and color.
- Spiral mode includes rotation, position, scale, and ratio controls.
`
    },
    'ui.resolution': {
        id: 'ui.resolution',
        category: 'UI',
        title: 'Resolution Controls',
        content: `
When in **Fixed Resolution** mode, an overlay appears in the top-left of the viewport.

- **Click Label**: Open a dropdown of common presets (Social Media, 4K, etc.).
- **Drag Label**: Interactively scale the resolution width/height.
- **Fill Button**: Instantly switch back to "Full Screen" mode.
`
    },
    'panel.engine': {
        id: 'panel.engine',
        category: 'UI',
        title: 'Engine Settings',
        content: `
The Engine panel controls compile-time shader features — settings that require rebuilding the GPU program before they take effect.

## How It Works
Unlike most sliders (which update instantly), changes here are **queued** and applied together when you click **Apply**. The shader then recompiles, which takes a few seconds depending on the features enabled.

- **Green dot** = currently compiled into the shader.
- **Yellow dot** = change is pending (waiting for you to click Apply).
- **Blue dot** = updates instantly (no recompile needed).

## Presets
Quick configurations that set multiple features at once:
- **Fastest**: Bare minimum — no shadows, no AO, no reflections. Maximum FPS.
- **Lite**: Lightweight setup suitable for exploration on most hardware.
- **Balanced**: Good mix of visual quality and performance (default).
- **Ultra**: Everything enabled — reflections, volumetrics, high-quality AO.

## Estimated Compile Time
The bottom bar shows the estimated compile time for the current configuration. Complex setups (raymarched reflections + bounce shadows + volumetrics) can take 15 seconds or more.

## Who Is This For?
This panel is for advanced users who want fine control over which shader features are active. Most users can ignore it — the default **Balanced** preset works well for general use.
`
    },
    'ui.performance': {
        id: 'ui.performance',
        category: 'UI',
        title: 'Performance Monitor',
        content: `
The system automatically detects sustained low framerates.

- **Low FPS Warning**: Appears if the renderer struggles to maintain a usable frame rate.
- **Suggestion Buttons**: One or more actions are offered depending on the situation — **Reset Scale**, **Lite Mode**, or **Reduce Resolution** (reduces internal resolution by ~33%) — to help restore interactivity.
- **Dismiss**: Ignores the warning for this session.
`
    }
};
