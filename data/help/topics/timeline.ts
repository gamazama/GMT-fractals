
import { HelpSection } from '../../../types/help';

export const TIMELINE_TOPICS: Record<string, HelpSection> = {
    'ui.timeline': {
        id: 'ui.timeline',
        category: 'Timeline',
        title: 'Animation Timeline',
        content: `
The central hub for creating motion. It allows you to animate almost any parameter in the application using keyframes.

## Layout
- **Toolbar**: Playback controls, Recording toggle, and View Modes.
- **Navigator**: The mini-map strip below the toolbar. 
  - **Scroll**: Drag the bar left/right.
  - **Zoom**: Drag the edges of the active window or use the scroll wheel.
- **Track List**: On the left. Shows all animated properties grouped by category (Camera, Formula, Optics, Lighting, Shading).
- **Work Area**: The main grid showing keys.
  - **Dope Sheet Mode**: View keyframes as discrete diamonds. Best for timing and retiming.
  - **Graph Editor Mode**: View keyframes as continuous curves. Best for easing and value adjustment.

## Basic Workflow
1. **Record**: Click the **Red Circle** button in the timeline toolbar.
2. **Move Playhead**: Drag the ruler to the desired frame.
3. **Change Value**: Move any slider (e.g., Param A, Light Intensity, Camera Position).
4. A keyframe is automatically created.
5. Move Playhead again and change value again.
6. Press **Space** to play.

## Selection & Editing
- **Click a key**: Select single key.
- **Shift+Click**: Add to selection.
- **Drag empty space**: Marquee — selects every key inside the box. Hold Shift to add to the existing selection.
- **Click a track header (Dope Sheet)**: selects the track only. It does NOT auto-select every key on that track — that way an accidental Delete won't wipe a whole track. To grab every key on a track, use the **select-all icon** that appears when you hover the row.
- **Click a track row (Graph Sidebar)**: selects the track AND turns its eye on so you see the curve. The eye column is the only thing that *hides* a curve — selecting will never hide.
- **Soft Selection**: A persistent toggle mode that can be enabled in the **Keyframe Inspector**. When active, moving a keyframe also influences nearby keys with a smooth falloff.
  - **Falloff Types**: Linear, Dome, S-Curve, Pinpoint.
  - **Radius**: Controls how far the influence extends. Adjust with **Ctrl+Drag**.
- **Copy/Paste**: Use **Ctrl+C** and **Ctrl+V** to duplicate keys (works across different tracks!). You can also right-click for **Duplicate Here**, or **Duplicate & Loop** (x2, x3, x4, x8) to repeat a pattern.
- **Delete**: Press Backspace/Delete.

## Group Operations
Once you have keys selected, an orange **transform bar** appears:
- The bar shows up on the **Global Summary** row at the top, AND on each group row that contains selected keys.
- **Drag the middle**: move all selected keys together in time.
- **Drag the left/right edge**: scale the time range (squeeze or stretch). Bezier handles scale proportionally so the curve shape is preserved.
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
- **Loop Toggle**: Switches between **Loop** (repeat forever) and **Once** (stop at end) playback modes.
- **Record (Red Circle)**: Toggles Auto-Keyframe mode.
  - When enabled, changing ANY slider or moving the camera will automatically create a keyframe at the current time position.
- **Modulation Record Arm**: Separate button for recording Audio/LFO modulation data.
- **Key Cam**: Manually captures the current camera state (Position + Rotation + Zoom) as a keyframe. Use this if you want to set a "pose" without moving the camera.
- **FRM**: Draggable frame counter for precise playhead positioning.
- **LEN**: Draggable duration control for setting the animation length.
- **Render**: Opens the Render/Export popup for video output.
- **Menu**: Access FPS setting, Record Camera toggle, Deterministic Playback, Delete All Keys, and Delete All Tracks.

## FPS & Frame Remapping
The kebab menu's **FPS** field changes the project framerate. The toggle below it controls what happens to your existing keyframes:
- **Keep frames**: Keys stay at the same frame index — a key at frame 30 stays at frame 30. The wall-clock time of every key shifts (at 30→60 fps, frame 30 moves from 1.0s to 0.5s). Use this when you want to retime in frame units.
- **Match time**: Keys are remapped so their wall-clock time is preserved — a key at 1.0s stays at 1.0s. Frame indices are scaled by \`new / old\`, and Bezier handles, the timeline length, and the playhead all scale together. Use this when you want to change framerate without altering the look of the animation.

Both modes are undoable as a single step. At large ratios (e.g. 60→24), keys at adjacent frames in Match-time mode may collide and merge.

## Deterministic Playback
Toggle in the kebab menu. When on, the live preview is throttled to the project FPS so it plays back at the same speed the exported video will run at, regardless of monitor refresh rate. At fps=30 you see exactly 30 timeline frames per real second on a 60Hz, 144Hz, or any other display. Useful when timing motion to music or matching action to a known frame count. When off, playback runs at full RAF speed (smoother but timing is wall-clock based).
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
- **Visibility**: Each row has an **Eye icon** (in both the Graph Editor sidebar AND the Dope Sheet on hover) — this controls whether the curve is drawn in the Graph Editor. Selection and visibility are independent: clicking a track in the Graph Sidebar will turn its eye ON additively, but nothing except the eye itself can turn a track OFF.
- **Select all keys on a track**: Hover a row and click the small **select-all icon** that appears next to the eye. Shift/Ctrl+click adds to the existing selection.
- **Grouping**: Tracks are automatically grouped by category (Camera, Formula, Optics, Lighting, Shading) in the Dope Sheet AND the Graph Sidebar.

## Context Menu
Right-click a track header to access:
- **Delete Track**: Removes the track and all keyframes.

## Post Behavior
Determines what happens after the last keyframe. Access this from the **Graph Editor sidebar** context menu (right-click a track in the sidebar).
- **Hold**: Value stays constant.
- **Loop**: Animation repeats from the start.
- **Offset Loop (Relative)**: Repeats the animation but offsets each cycle so the end value of one loop becomes the start of the next. Useful for continuous rotation or steady movement.
- **Ping-Pong**: Animation reverses, then repeats.
- **Continue**: Value continues changing based on the exit velocity (Slope).
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
When using Bezier interpolation, the handles control how the curve enters and leaves the key. Right-click a key to switch modes:

- **Auto**: Smooth curve fitted automatically from neighbours. Recomputes whenever you add/move adjacent keys. Good first choice.
- **Flat (Ease)**: Both handles flat (slope = 0). Classic "Slow In / Slow Out" — great for hold-then-move motion.
- **Aligned** *(default once you drag a handle)*: Direction is locked across the key (no kink), but each side keeps its own length. Drag one handle and the other rotates to mirror the angle but keeps its existing magnitude. This is the Maya/Blender default and what you want most of the time.
- **Unified**: Direction AND length locked. Dragging one handle mirrors the other to the same length. Use when you want symmetric easing on both sides.
- **Free (Broken)**: Handles fully independent — sharp corners are allowed (incoming slope != outgoing slope).

### Editing handles
- **Drag the diamond on a handle** to reshape the curve. By default it stays Aligned (the other side rotates with it).
- **Hold Ctrl while dragging** to break the link and move just that side (one-shot Free).
- Handles can extend **past** the next/prev key (weighted Bezier) — they'll only stop at the key's own time. The 1/3-of-interval cap that older versions enforced is gone, so curve shapes hold their intent.

### Inserting a key on an existing curve
Ctrl+Click an empty spot on a Bezier curve (or double-click in the Dope Sheet at a frame) to insert a key. The new key sits **exactly on the existing curve** — no kink, no shape change. The neighbours' handles are silently rewritten to keep the segment visually identical (de Casteljau split).

### Move a key in time
Handles scale proportionally so the curve shape is preserved. User-shaped handles on **neighbour** keys are never silently rescaled — your hand-shaping survives every edit.
`
    },
    'anim.graph': {
        id: 'anim.graph',
        category: 'Timeline',
        title: 'Graph Editor (Curves)',
        parentId: 'ui.timeline',
        content: `
A powerful F-Curve editor for fine-tuning motion dynamics.
Switch to this mode using the **Curve Icon** in the timeline toolbar.

## Toolbar Tools (Top Left)
- **Fit View / Selection**: Zooms the view to show all keys or just selected ones.
- **Normalize**: Toggles "Normalized View".
  - **Off**: Shows raw values. Good for seeing true scale.
  - **On**: Scales all curves to fit 0-1 height. Essential for comparing timing between tracks with vastly different values (e.g. Rotation vs Scale).
- **Show Selected Only**: Hides any track in the canvas that has no selected key. Lets you focus on whatever you're actively editing without clutter from the rest of the graph. The sidebar list is unaffected.
- **Euler Filter**: Fixes "Gimbal Lock" or rotation flips where values jump 360 degrees. Unwinds the curves to be continuous.
- **Simplify**: Drag to reduce the number of keyframes while preserving the curve shape.
- **Bake**: Resamples the curve at fixed intervals.
- **Smooth / Bounce**: Physics-based modifiers.
  - **Drag Right**: Applies Gaussian Smoothing to smooth out jitter.
  - **Drag Left**: Applies Spring Physics (Bounce) to create overshoot/elasticity.
  - Right-click for configurable physics settings: **Tension/Spring** and **Friction/Damping**.

## Curve Interaction
- **Select**: Click curve keys or drag a selection box. Shift+click adds to selection.
- **Move**: Drag keys. Hold **Shift** to lock movement to X (Time) or Y (Value) axis.
- **Tangents**: Select a key to see its Bezier handles. Drag handles to adjust easing — by default the other side mirrors direction but keeps its own length (Aligned). Hold **Ctrl while dragging** to break the link.
- **Insert key on curve**: **Ctrl+Click** an empty spot on the curve. The new key sits exactly on the existing curve and the surrounding shape is preserved.
- **Extrapolation**: Dotted lines at the end of the curve visualize the Post Behavior (Loop, Ping-Pong, etc).

## Keyboard
- **A**: Select all keys on currently displayed tracks.
- **Alt+A**: Deselect all keys.
- **Delete / Backspace**: Delete selected keys.
- **F**: Fit view to selection.
- **Ctrl+C / Ctrl+V**: Copy / paste keys.

## Navigation
- **Alt + Right Drag**: Zoom view (Scale Time/Value).
- **Alt + Left Drag**: Pan view.
- **Middle Click Drag**: Pan view.
- **Double Click Ruler**: Fit view to all keyframes.
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
- Use **Fly Mode** to record natural, handheld-like motion paths, then refine them in the Graph Editor using the **Smooth** tool.
`
    },
    'lfo.system': {
        id: 'lfo.system',
        category: 'Timeline',
        title: 'LFO Modulators',
        parentId: 'ui.timeline',
        content: `
Low Frequency Oscillators (LFOs) generate repeating waveforms that can be linked to any animatable parameter, creating organic, rhythmic motion without manually placing keyframes.

## Setup
You can add up to **3 LFO modulators** simultaneously.

## Waveform Shapes
- **Sine**: Smooth, continuous oscillation. Classic "breathing" motion.
- **Triangle**: Linear ramp up and down. Sharper transitions than Sine.
- **Sawtooth**: Ramps up linearly, then drops instantly. Good for repeating sweeps.
- **Pulse**: Switches between two values (on/off). Creates strobe-like effects.
- **Noise**: Random values each cycle. Adds natural variation and chaos.

## Parameters
- **Target**: The parameter to modulate (any slider in the application).
- **Period**: Length of one full cycle (in seconds). Lower = faster oscillation.
- **Strength**: How much the LFO affects the target value.
- **Phase Offset** (Advanced Mode): Shifts the starting point of the waveform. Useful for offsetting multiple LFOs from each other.
- **Smoothing**: Softens sharp transitions in the waveform.

## Waveform Preview
Each LFO displays a small real-time waveform visualization so you can see the shape and timing before applying it.

## Audio Links
LFOs can also be used as modulation sources in the Audio Links system, allowing audio-reactive control combined with oscillator patterns.
`
    },
    'export.video': {
        id: 'export.video',
        category: 'Timeline',
        title: 'Video Export',
        content: `
Renders your animation to a video file. Open the export popup using the **Render** button in the timeline toolbar.

## Resolution
Choose from built-in presets ranging from **720p** to **4K**, plus social media formats optimised for platforms like Instagram and YouTube.

## Quality Settings
- **Format**: Select the output video format.
- **Bitrate**: Controls the file size and compression quality.
- **Samples**: Number of render samples per frame. Higher values produce cleaner images but take longer.
- **Internal Scale (SSAA)**: Renders each frame at a higher resolution internally, then downscales for the final output. This is super-sampled anti-aliasing and produces much sharper results, especially on fine fractal detail.

## Frame Range
- **Start / End Frame**: Set which portion of the animation to render.
- **Frame Step**: Skip frames for faster preview renders (e.g., step 2 renders every other frame).

## Render Modes
- **RAM Mode**: Stores all rendered frames in memory, then encodes the video at the end. Faster encoding but uses more memory.
- **Disk Mode**: Writes each frame to disk as it renders. Uses less memory and is safer for long animations.

## Progress & Controls
- A progress bar shows the current frame, percentage complete, and estimated time remaining.
- **Interrupt**: Pause the render at any time.
- **Resume**: Continue a paused render from where it stopped.
- **Finish Early**: Encode whatever frames have been rendered so far into a shorter video.
- **Discard**: Cancel the render and discard all frames.
`
    }
};
