
import { HelpSection } from '../../../types/help';

export const TIMELINE_TOPICS: Record<string, HelpSection> = {
    'ui.timeline': {
        id: 'ui.timeline',
        category: 'Timeline',
        title: 'Animation Timeline',
        content: `
The Timeline allows you to animate almost any parameter in the application using keyframes.

## Interface
- **Dope Sheet**: The default view. Shows keyframes as diamonds. Best for timing adjustments.
- **Graph Editor**: Click the "Curve Icon" to switch. Shows values as curves. Best for smoothing easing and values.
- **Ruler**: The top bar showing frame numbers. Drag here to **Scrub** the timeline.

## Basic Workflow
1. **Enable Record**: Click the **Red Circle** button in the timeline toolbar.
2. **Move Playhead**: Drag the ruler to the desired frame.
3. **Change Value**: Move any slider (e.g., Param A, Light Intensity, Camera Position).
4. A keyframe is automatically created.
5. Move Playhead again and change value again.
6. Press **Space** to play.

## Selection & Editing
- **Click**: Select single key.
- **Shift+Click**: Add to selection.
- **Drag Box**: Select multiple keys.
- **Soft Selection**: Hold **Ctrl** while dragging a key to influence neighbor keys proportionally based on the radius (Rubber band effect).
- **Copy/Paste**: Use **Ctrl+C** and **Ctrl+V** to duplicate keys (works across different tracks!).
- **Delete**: Press Backspace/Delete.
`
    },
    'anim.transport': {
        id: 'anim.transport',
        category: 'Timeline',
        title: 'Transport & Recording',
        parentId: 'ui.timeline',
        content: `
Controls for playback and recording.

## Controls
- **Play/Pause**: Toggle playback (Hotkey: Space).
- **Stop**: Return to frame 0.
- **Record (Red Circle)**: Toggles Auto-Keyframe mode.
  - When enabled, changing ANY slider or moving the camera will automatically create a keyframe at the current time position.
- **Key Cam**: Manually captures the current camera state (Position + Rotation + Zoom) as a keyframe. Use this if you want to set a "pose" without moving the camera.
`
    },
    'anim.tracks': {
        id: 'anim.tracks',
        category: 'Timeline',
        title: 'Tracks',
        parentId: 'ui.timeline',
        content: `
Each animated parameter has its own **Track**.

- **Creation**: Tracks are created automatically when you add a keyframe to a parameter.
- **Visibility**: Use the Eye icon in the Graph Editor sidebar to show/hide curves.
- **Deletion**: Right-click a track header to remove it and all its keyframes.
- **Grouping**: Tracks are automatically grouped by category (Camera, Lighting, Formula) in the Dope Sheet.
`
    },
    'anim.keyframes': {
        id: 'anim.keyframes',
        category: 'Timeline',
        title: 'Keyframes & Interpolation',
        parentId: 'ui.timeline',
        content: `
Keyframes store the value of a parameter at a specific time.

## Interpolation Types
Right-click a keyframe to change how the value moves *between* keys:
- **Bezier (Default)**: Smooth, curved transition. Customisable with handles in the Graph Editor.
- **Linear**: Straight line. Constant speed, sharp turns. Robotic movement.
- **Step**: Instant jump. The value holds constant until the next keyframe, then snaps instantly.

## Tangents (Graph Editor)
When using Bezier interpolation, handles control the curve slope:
- **Auto**: Automatically smooths the curve based on neighbors.
- **Flat (Ease)**: Flattens the slope to 0. Great for "Slow In / Slow Out".
- **Broken**: Allows sharp corners (incoming slope != outgoing slope).
`
    },
    'anim.graph': {
        id: 'anim.graph',
        category: 'Timeline',
        title: 'Graph Editor',
        parentId: 'ui.timeline',
        content: `
Provides precise control over animation curves.

## Navigation
- **Alt + Right Drag**: Zoom view (Scale Time/Value).
- **Alt + Left Drag**: Pan view.
- **Double Click Ruler**: Fit view to all keyframes.

## Editing
- **Select**: Click keys or drag a box.
- **Move**: Drag keys to change Frame (X) or Value (Y).
- **Handles**: Drag the circles attached to keyframes to adjust the curve shape (Bezier only).
`
    },
    'anim.camera': {
        id: 'anim.camera',
        category: 'Animation',
        title: 'Camera Animation',
        content: `
Animating the camera in a fractal is complex due to the infinite scale.

## The "Unified" Camera Key
Unlike standard 3D software which tracks X/Y/Z, this engine tracks **Unified Coordinates** (Fractal Offset + Camera Local).
To keyframe the camera:
1. Move to a position you like.
2. Click the **"KEY CAM"** button in the Timeline Toolbar.
3. This creates keys for Position (Unified) and Rotation (Euler Angles) simultaneously.

## Path Interpolation
- The engine uses **Logarithmic Interpolation** for zoom levels. This ensures that zooming from 1.0 to 1,000,000.0 feels constant speed, rather than accelerating wildly.
- Use **Fly Mode** to record natural, handheld-like motion paths, then refine them in the Graph Editor.
`
    }
};
