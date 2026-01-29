
import { HelpSection } from '../../../types/help';

export const FORMULA_TOPICS: Record<string, HelpSection> = {
    'formula.active': {
        id: 'formula.active',
        category: 'Formulas',
        title: 'Active Formula',
        content: `
This dropdown selects the mathematical equation used to generate the 3D shape.

## Categories
- **Classic Sets**: The original Mandelbulb and its variations (Power-based).
- **Geometric**: Box folds, Sponges, and Polyhedra (Fold-based).
- **Hybrids**: Formulas that mix folding and power functions for complex, organic-mechanical looks.
- **Systems**: The **Modular Builder**, allowing you to create custom pipelines.
`
    },
    'formula.transform': {
        id: 'formula.transform',
        category: 'Formulas',
        title: 'Local Rotation (Pre-Transform)',
        content: `
Rotates the coordinate system $(x,y,z)$ *before* the fractal formula is applied.

## Why use this?
- **Orientation**: Rotates the fractal object itself, rather than moving the camera around it. This is useful for aligning the fractal with lighting or fog.
- **Symmetry**: Changing the input rotation can drastically change the shape of box-folded fractals (like Amazing Box or Menger Sponge) because the folding planes are axis-aligned. Rotating the space causes the folds to cut at diagonal angles.
`
    }
};
