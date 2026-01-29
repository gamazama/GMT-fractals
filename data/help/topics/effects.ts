
import { HelpSection } from '../../../types/help';

export const EFFECTS_TOPICS: Record<string, HelpSection> = {
    'effect.droste': {
        id: 'effect.droste',
        category: 'Effects',
        title: 'Escher Droste (Spiral)',
        content: `
The Droste effect recursively maps an image inside itself, creating infinite spirals or loops. This implementation is mathematically based on M.C. Escher's "Print Gallery".

**Reference:** [Wikipedia: Droste Effect](https://en.wikipedia.org/wiki/Droste_effect)
**Artistic Origin:** [M.C. Escher: Print Gallery](https://en.wikipedia.org/wiki/Print_Gallery_(M._C._Escher))

## How it works
It transforms the screen coordinates from **Cartesian** ($x, y$) to **Log-Polar** space. 
This turns scaling (zooming) into a linear shift, allowing us to repeat the image periodically as it shrinks towards the center.

## Key Controls
- **Inner/Outer Radius**: Defines the "Ring" (Annulus) where the image lives. The ratio between these determines how fast the spiral shrinks.
- **Periodicity**: How many times the image repeats per spiral loop.
- **Strands**: Number of separate spiral arms.
`
    },
    'droste.geometry': {
        id: 'droste.geometry',
        category: 'Effects',
        title: 'Geometry & Tiling',
        parentId: 'effect.droste',
        content: `
Controls the physical bounds of the spiral.

- **Inner Radius ($r_1$)**: The size of the "hole" in the center.
- **Outer Radius ($r_2$)**: The outer edge of the image.
- **Tiling**:
  - **Repeat**: Standard tile.
  - **Mirror**: Flips every other tile. Essential for seamless spirals if the image edges don't match.
  - **Clamp**: Stretches the edge pixels (Smear effect).
  - **Transparent**: Only draws the spiral ring, leaving the center/outside empty (or showing the background).
- **Center Shift**: Moves the vanishing point of the spiral.
`
    },
    'droste.structure': {
        id: 'droste.structure',
        category: 'Effects',
        title: 'Spiral Structure',
        parentId: 'effect.droste',
        content: `
Controls the math of the repetition.

- **Periodicity ($P_1$)**: The repetition frequency.
  - **1.0**: Image repeats once per full rotation.
  - **2.0**: Image repeats twice (180° symmetry).
- **Strands ($P_2$)**: The number of "arms" in the spiral.
  - **1**: Single continuous tunnel.
  - **2**: Double helix structure.
- **Auto Period**: Mathematically calculates the perfect Periodicity based on the Radius ratio ($r_2/r_1$) to prevent distortion. Recommended to keep this **ON** unless you want artistic stretching.
- **Mirror Strand**: Alters the rotation logic to align strands seamlessly when using Mirror Tiling.
`
    },
    'droste.transform': {
        id: 'droste.transform',
        category: 'Effects',
        title: 'Transform & Distortion',
        parentId: 'effect.droste',
        content: `
- **Zoom**: Moves the camera *into* the spiral. Because the spiral is infinite, zooming eventually brings you back to the start (just deeper).
- **Rotate**: Standard 2D rotation of the whole frame.
- **Twist**: The core "Escher" switch.
  - **On**: Log-Polar mapping (Spiral).
  - **Off**: Standard Log mapping (Tunnel/Grid).
- **Hyper Droste**: Applies a complex sine function, turning the spiral into a Fractal-like shape.
- **Fractal Points**: When Hyper Droste is on, determines the number of branches/tips in the fractal structure.
`
    }
};
