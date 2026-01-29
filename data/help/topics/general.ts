
import { HelpSection } from '../../../types/help';

export const GENERAL_TOPICS: Record<string, HelpSection> = {
    'general.undo': {
        id: 'general.undo',
        category: 'General',
        title: 'Undo & History',
        content: `
The application uses **Three Separate History Stacks** to manage state.
This separation ensures that navigating the world doesn't undo your careful parameter tuning, and vice versa.

## 1. Parameter History (Global)
Tracks changes to sliders, colors, checkboxes, and formula settings.
- **Undo**: **Ctrl + Z**
- **Redo**: **Ctrl + Y**
- **Scope**: Any change made in the Control Deck (Formula, Light, Shading, etc).

## 2. Camera History (Navigation)
Tracks your movement in 3D space (Orbit and Fly modes).
- **Undo**: **Ctrl + Shift + Z**
- **Redo**: **Ctrl + Shift + Y**
- **Why?** Navigation generates thousands of micro-updates. Separating this prevents the "Parameter Undo" from getting clogged with camera moves.
- **UI Access**: You can also use the Undo/Redo buttons in the **Camera Menu** (Camera Icon in Top Bar).

## 3. Timeline History (Animation)
Tracks keyframes, tracks, and sequence data.
- **Undo**: **Ctrl + Z** (Context Sensitive)
- **Redo**: **Ctrl + Y** (Context Sensitive)
- **Context**: This stack is active when your mouse is hovering over the **Timeline Panel**. If you move the mouse away, Ctrl+Z reverts to Parameter Undo.
`
    },
    'general.shortcuts': {
        id: 'general.shortcuts',
        category: 'General',
        title: 'Keyboard Shortcuts',
        content: `
## Navigation (Fly Mode)
- **W / S**: Move Forward / Backward
- **A / D**: Strafe Left / Right
- **Space**: Move Up (Ascend)
- **C**: Move Down (Descend)
- **Q / E**: Roll Camera Left / Right
- **Shift**: Speed Boost (4x)
- **Mouse Drag**: Look around (Steer)
- **Scroll**: Adjust Fly Speed

## Navigation (Orbit Mode)
- **Left Drag**: Rotate around target
- **Right Drag**: Pan camera
- **Scroll**: Zoom In / Out
- **Q / E**: Roll Camera

## History & Undo
- **Ctrl + Z**: Undo Parameter Change
- **Ctrl + Y**: Redo Parameter Change
- **Ctrl + Shift + Z**: Undo Camera Movement
- **Ctrl + Shift + Y**: Redo Camera Movement

## Tools & UI
- **1 - 6**: Open Quick-Edit Slider for Params A-F (at mouse cursor)
- **Tab**: Toggle between Orbit and Fly Mode
- **T**: Toggle Timeline Panel
- **H**: Toggle UI Hints (Tooltip overlay)
- **Esc**: Cancel Focus Picking / Close Menus / Deselect
`
    },
    'general.disclaimer': {
        id: 'general.disclaimer',
        category: 'General',
        title: 'Disclaimer & Terms',
        content: `
## Age Restriction
According to Google's Terms of Service, this application is **not intended for users under the age of 18**.

## AI & Human Verification
This application was created through a collaboration between Artificial Intelligence and Human Engineering. 
While rigorous verification processes are in place:
- Both AI and Humans are fallible.
- The software may contain errors, bugs, or inaccuracies.
- Use at your own risk.
`
    },
    'general.files': {
        id: 'general.files',
        category: 'General',
        title: 'File Import & Export',
        content: `
## Smart PNGs (Steganography)
When you save a **Snapshot** (via the Camera Menu), the application embeds the full scene data into the image metadata.
- **Load**: Simply **drag and drop** the PNG file back into the browser window to restore the scene instantly.
- **Safety**: The visual image is standard PNG. The data is hidden in a \`tEXt\` chunk.
- **Warning**: Social media platforms (Twitter, Facebook, etc.) strip this metadata. Share the file directly (Discord, Drive, Email) to preserve the data.

## Shareable URLs
You can share your scene via the URL bar.
- **Copy Link**: Use the link icon in the System Menu.
- **Limits**: Browsers have a URL limit (approx 4096 characters). If your scene is too complex (e.g., thousands of keyframes), the app will automatically **strip animation data** to generate a working link. A warning "(Anims Removed)" will appear.
`
    }
};
