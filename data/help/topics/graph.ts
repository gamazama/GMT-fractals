
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
$z \to z^8 + c$

The Graph allows you to insert steps:
$z \to Rotate \to Fold \to Scale \to z^8 + c$

## Node Types
- **Transform**: Rotate, Scale, Translate. Modifies the coordinate space.
- **Fold**: BoxFold, SphereFold, Abs. The core of fractal complexity. Reflects space back onto itself.
- **Logic**: Modulo (Repeat space), Conditions.
- **Combiners**: Union, Subtract. Combines shapes (Constructive Solid Geometry).

## Bindings
You can link any node parameter (like "Rotation X") to a global slider (Param A-F).
1. Click the **Link Icon** next to a node slider.
2. It cycles through Param A, B, C...
3. Now, changing Param A in the main UI will drive that specific node value. This allows you to animate complex graphs easily.
`
    }
};
