
import { HelpSection } from '../../../types/help';

export const GRAPH_TOPICS: Record<string, HelpSection> = {
    'ui.graph': {
        id: 'ui.graph',
        category: 'Graph',
        title: 'Modular Graph Editor',
        content: `
The **Modular Formula** lets you build your own fractal equation by chaining operations together visually — no code required.

## How it works
Standard formulas (like Mandelbulb) are fixed loops:
$z \\to z^8 + c$

The Graph lets you insert, reorder, and combine steps freely:
$z \\to Rotate \\to BoxFold \\to Scale \\to z^8 + c$

The result compiles to GLSL on the fly and replaces the formula shader.

## Node Categories
- **Utils**: Comment/Note (documentation inside the graph), Add C (Julia/Pixel mode).
- **Transforms**: Scale (Mult), IFS Scale (Homothety), Rotate, Translate, Modulo (Repeat).
- **Folds**: Amazing Fold, Abs (Mirror), Box Fold, Sphere Fold, Plane Fold, Menger Fold, Sierpinski Fold.
- **Fractals**: Mandelbulb.
- **Primitives**: Sphere, Box. These write an SDF distance value that can override the iterative DE.
- **Distortion**: Twist (Z), Bend (Y), Sine Wave.
- **Combiners (CSG)**: Union, Subtract, Intersect, Smooth Union, Mix (Lerp). These take **two inputs** (A and B) and merge them.

## Adding Nodes

**Ghost Insert Mode** — the recommended way to add nodes:
1. Select a node type from the **"Add:"** dropdown, or pick one from the **right-click context menu**.
2. The cursor becomes a crosshair and a ghost tooltip follows your mouse.
3. **Click an existing connection** (highlighted in cyan) to insert the node between those two nodes — the old edge is automatically split into two.
4. **Click empty canvas** to place the node freely at that position.
5. **Escape** to cancel without placing.

> CSG/Combiner nodes (which need two inputs) can't be edge-inserted — click the canvas instead.

## Wiring / Connections
- Drag from a **bottom handle** (output) to a **top handle** (input) to connect nodes.
- CSG nodes have **two top handles**: A (left) and B (right).
- The chain starts at **Input Z** and ends at **Output Distance**.
- **Right-click** a connection line to remove it.
- Cycles are prevented — you can't wire a node's output back into its own chain.
- **Deleting a node** (via × or right-click → Delete) automatically reconnects its parent to its child if both exist and the node has a single input (non-CSG).

## Editor Controls
- **Auto Compile**: When checked, the shader recompiles automatically after every structural change.
- **COMPILE**: Forces a manual recompile. Pulses when Auto Compile is off and changes are pending.
- **Backspace / Delete**: Remove selected nodes (no auto-reconnect — use the × button for that).
- **Ctrl+Z / Ctrl+Y**: Undo / Redo graph changes, including node positions.
- **Scroll**: Zoom in/out (0.1× to 4×). Zoom level and pan position are preserved when switching tabs.
- **MiniMap**: Color-coded overview in the corner. Node colors match their category.

## Per-Node Controls
- **Enable/Disable checkbox** (in the node header): Temporarily bypasses the node without deleting it. The card dims to show it's inactive.
- **× button**: Deletes the node and reconnects its chain if possible.
- **Right-click** the node header: Opens a context menu with Delete and help options.

## Node Parameters
Each node exposes sliders for its parameters. Two extras are available per slider:

**Binding (A–F dropdown):**
Set the dropdown next to any slider to **A, B, C, D, E, or F** to link that parameter to the corresponding global formula slider.
- The bound parameter is driven by the global slider instead of its own value.
- Global sliders are animatable via the Timeline — binding lets you keyframe complex graph parameters.
- Select **—** to clear the binding.
- Bound parameters display as **cyan** with a \`(-> ParamX)\` label.

**Logic / Condition (collapsible section at the bottom of each node):**
Make a node execute only on certain fractal iterations:
- **Interval**: The node fires every N iterations (e.g., 3 = every third iteration).
- **Starting Iteration**: Which iteration in the cycle to start on (0-based, up to Interval − 1).
- Example: Interval 3, Start 1 → runs on iterations 1, 4, 7, 10, …
- Enable with the checkbox. Dragging the sliders updates in real time — no recompile needed.

## Presets
Use the **"Load:"** dropdown to load pre-built node chains as a starting point:
- **Mandelbulb (Standard)**, **Amazing Box**, **MixPinski**, **Menger Sponge**, **Kleinian**, **Marble Marcher**
`
    }
};
