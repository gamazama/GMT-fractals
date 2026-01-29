
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
- **Shading**: Surface material (PBR), Glow, and Ambient Occlusion.
- **Gradients**: Color palettes and texturing.
- **Quality**: Performance tuning, Anti-aliasing, and Resolution.
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
- Lights appear as glowing rings in 3D space.
- **Drag** a ring to move the light directly.
- **Click** a ring to open a quick-access menu for Color and Intensity.
- **Click the Anchor Icon** above a light to toggle between "Fixed" (Headlamp) and "World" modes.
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
**Right-click** the color swatch (square on the left) to access:
- **Copy/Paste**: Transfer hex codes between pickers.
- **History**: Quickly revert to recently used colors.
- **Presets**: Pure White/Black shortcuts.
`
    },
    'ui.gradient_editor': {
        id: 'ui.gradient_editor',
        category: 'UI',
        title: 'Gradient Editor',
        content: `
A spline-based color ramp editor used for surface coloring.

## Interaction
- **Add Knot**: Click anywhere on the bottom track.
- **Move Knot**: Drag a knot left/right.
- **Remove Knot**: Drag a knot down (off the track) or press Delete.
- **Select Multiple**: Drag a selection box or Shift+Click knots.
- **Bias**: Drag the small diamond handle between knots to adjust the interpolation curve (Gamma).

## Context Menu
Right-click the track to:
- **Distribute**: Evenly space selected knots.
- **Invert**: Flip the gradient.
- **Double Knots**: Increase resolution.
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
    'ui.performance': {
        id: 'ui.performance',
        category: 'UI',
        title: 'Performance Monitor',
        content: `
The system automatically detects sustained low framerates.

- **Low FPS Warning**: Appears if the renderer struggles to maintain a usable frame rate.
- **Fix Button**: Instantly reduces the internal resolution by 25% to restore interactivity.
- **Dismiss**: Ignores the warning for this session.
`
    }
};
