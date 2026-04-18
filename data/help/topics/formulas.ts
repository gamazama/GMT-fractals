
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

## Want more formulas?
Open the **Formula Workshop** to browse hundreds of community fractals from Fragmentarium and the Distance Estimator Compendium. Right-click inside the Workshop for a dedicated help topic.
`
    },
    'panel.workshop': {
        id: 'panel.workshop',
        category: 'Formulas',
        title: 'Formula Workshop',
        content: `
The Formula Workshop opens a library of hundreds of community fractals beyond the built-ins: curated Fragmentarium (\`.frag\`) examples and the Distance Estimator Compendium (DEC), spanning classic and experimental shapes.

## Finding a formula

- **Search** — type any part of a name, artist, or tag in the search bar at the top.
- **Browse** — click the **Frag** or **DEC** buttons to browse by category or artist.
- **Surprise me** — the two dice buttons pick a random formula for you.

Click any result to load it; the scene updates immediately.

## Badge colors

Each formula in the library has a small colored badge. It tells you how the formula will behave:

- **Green "Iteration"** — the formula runs as a per-iteration step inside the engine's main loop. That means you can use it as a primary or secondary formula in the **Interlace** feature, and combine it with engine folds (hybrid box fold, sphere fold, burning ship). This is the richer mode for building hybrid and layered fractals.
- **Cyan "Standalone"** — the formula is a self-contained distance estimator that runs as a single unit. Renders correctly on its own, but **can't be interlaced** with another formula or mixed with engine folds.

This distinction mostly matters when you're building hybrid or layered fractals. If you're just exploring, either badge is a fine pick — both render.

## Custom imports

Paste \`.frag\` or GLSL source directly into the editor in the Workshop, or drop a file into the window. GMT auto-detects the formula's shape and maps its parameters to on-screen sliders so you can tweak them like a built-in.

## Advanced controls

- **Mode selector** (Auto / Iteration / Standalone at the bottom): leave on **Auto**. GMT picks the right rendering path per formula automatically — Iteration when the formula supports it, Standalone otherwise. Force a specific mode only if you're investigating why a particular formula doesn't render as expected.
- **Show broken**: reveals formulas that can't be rendered in either mode. Off by default — mostly useful for formula authors debugging compatibility.

## References

- [3Dickulus's Fragmentarium Examples](https://github.com/3Dickulus/Fragmentarium_Examples_Folder)
- [Jon Baker's Distance Estimator Compendium](https://jbaker.graphics/writings/DEC.html)
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
