
import { HelpSection } from '../../../types/help';

export const FORMULA_TOPICS: Record<string, HelpSection> = {
    'formula.active': {
        id: 'formula.active',
        category: 'Formulas',
        title: 'Active Formula',
        content: `
The formula is the mathematical equation that generates the 3D fractal shape. Different formulas produce radically different structures — from organic bulbs to architectural grids to alien landscapes.

## How to Switch Formulas
Open the **Formula** dropdown at the top of the sidebar. You will see a gallery with **thumbnail previews** of each fractal, organized by category. Click any thumbnail to load that formula with its default settings.

You can also **import .gmf formula files** — these are saved scenes that include both the formula and all its parameter settings. Drag a .gmf file into the app window or use the Load button.

## Categories
- **Featured Fractals**: The Mandelbulb and other power-based fractals — the classic shapes that started 3D fractal art.
- **Geometric & Folding**: Box folds, Sponges, Polyhedra, and IFS fractals — architectural, crystalline, and grid-based structures.
- **Hybrids & Experiments**: Formulas that combine folding with power functions, cyclic feedback, or novel mappings for unusual shapes.
- **Systems**: The **Modular Builder**, where you construct your own fractal by chaining operations together.

## The Formula Workshop (Import library)
Beyond the built-in formulas, GMT ships a Workshop that lets you import Fragmentarium \`.frag\` files and DEC formulas — hundreds of community fractals curated from [3Dickulus's Fragmentarium Examples](https://github.com/3Dickulus/Fragmentarium_Examples_Folder) and [Jon Baker's Distance Estimator Compendium](https://jbaker.graphics/writings/DEC.html). Open the Workshop from the Formula dropdown (or via its shortcut).

- **Search / browse**: type in the search bar to find formulas by name, or use the Frag/DEC buttons to browse by category or artist/folder.
- **Dice rolls**: the two dice buttons pick a random formula from the working set (Frag or DEC).
- **Compat badges**: each formula shows a green **V3** or cyan **V4** badge — this is the pipeline GMT will use to render it. V3-badged formulas compose with engine features like interlace and hybrid fold; V4-badged ones render correctly but are standalone.
- **Pipeline selector** (\`auto\` / \`v3\` / \`v4\` in the footer): default is \`auto\` — GMT picks the right pipeline per formula automatically. You can force a specific pipeline when experimenting.
- **"Show broken" toggle**: reveals formulas that neither pipeline can render. Off by default; useful if you want to debug why a specific formula fails.

Most users won't need to think about V3 vs V4 — \`auto\` picks correctly, and the 326 working formulas cover the vast majority of the community library.
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
