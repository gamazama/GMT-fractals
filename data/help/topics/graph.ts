
import { HelpSection } from '../../../types/help';

export const GRAPH_TOPICS: Record<string, HelpSection> = {
    'ui.graph': {
        id: 'ui.graph',
        category: 'Graph',
        title: 'Modular Graph Editor',
        content: `
The **Modular Formula** allows you to build your own fractal equation by chaining operations together.

## How it works
Standard formulas (like Mandelbulb) are hard-coded loops:
$z \\to z^8 + c$

The Graph allows you to insert steps:
$z \\to Rotate \\to Fold \\to Scale \\to z^8 + c$

## Node Categories
- **Utils**: Comment/Note, Add C (Julia/Pixel), Custom (Legacy).
- **Transforms**: Scale (Mult), IFS Scale (Homothety), Rotate, Translate, Modulo (Repeat).
- **Folds**: Amazing Fold, Abs (Mirror), Box Fold, Sphere Fold, Plane Fold, Menger Fold, Sierpinski Fold. The core of fractal complexity — these reflect space back onto itself.
- **Fractals**: Mandelbulb.
- **Primitives**: Sphere, Box.
- **Distortion**: Twist (Z), Bend (Y), Sine Wave.
- **Combiners (CSG)**: Union, Subtract, Intersect, Smooth Union, Mix (Lerp). Combines shapes using Constructive Solid Geometry.

## How to Add Nodes
- Use the **"Add: Select Node..."** dropdown at the top-left of the editor.
- **Right-click** on the canvas to open a context menu with available nodes.
- Use the **"Load: Select Preset..."** dropdown to load pre-built node chains as a starting point.

## Wiring / Connections
- Each node has **input handles** (top, cyan) and **output handles** (bottom, cyan).
- CSG/Combiner nodes have **two input handles** (A and B) for combining two shapes.
- The chain starts at the **Input Z** node and ends at the **Output Distance** node.
- **Drag** from one handle to another to create a connection.
- **Right-click** on an edge (connection line) to remove it.
- The editor prevents cycles — you cannot wire a node's output back into its own input chain.

## Editor Controls
- **Auto Compile**: When checked, the fractal recompiles automatically after every change.
- **Preview Mode**: When checked, uses a faster preview shader while editing.
- **COMPILE**: Button for manual recompile (useful when Auto Compile is off).
- **Backspace / Delete**: Remove selected nodes.
- **Shift-click**: Select multiple nodes. **Ctrl/Cmd-click**: Add individual nodes to selection.
- **MiniMap**: A small overview map in the corner for navigating large graphs.
- **Zoom**: Scroll to zoom in/out (0.1x to 4x range).

## Per-Node Features
- **Enable/Disable toggle**: Temporarily bypass a node without deleting it.
- **Delete (X button)**: Remove a node from the graph.
- **Condition (per-iteration logic)**: Nodes can be set to execute only on specific iterations using "if iter % Mod == Rem". This lets you apply different operations on alternating iterations for more complex fractal structures.

## Bindings
You can link any node parameter (like "Rotation X") to a global slider (Param A-D).
1. Click the **Link Icon** next to a node slider.
2. It cycles through Param A, B, C, D.
3. Now, changing Param A in the main UI will drive that specific node value. This allows you to animate complex graphs easily.
`
    }
};
