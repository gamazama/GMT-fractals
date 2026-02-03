
import { HelpSection } from '../../../types/help';

export const FORMULA_LIBRARY: Record<string, HelpSection> = {
    // --- CLASSIC SETS ---
    'formula.mandelbulb': {
        id: 'formula.mandelbulb',
        category: 'Formulas',
        title: 'Mandelbulb',
        parentId: 'formula.active',
        content: `
## The Math
The Mandelbulb is a 3D analogue of the Mandelbrot set constructed using Spherical Coordinates.
The iteration maps a point $(x,y,z)$ to spherical $(r, \theta, \phi)$, powers it by $n$, and adds the constant $c$.
$$ v \to v^n + c $$

**Reference:** [Wikipedia: Mandelbulb](https://en.wikipedia.org/wiki/Mandelbulb)
**Credits:** Discovered by **Daniel White** and **Paul Nylander**.

## Parameters
- **Param A (Power)**: The exponent $n$.
  - **8.0**: The classic "Broccoli" shape discovered by Daniel White.
  - **2.0**: A smooth, bulbous shape similar to a 3D Cardioid.
- **Param B (Theta Phase)**: Adds an offset to the polar angle $\theta$ during iteration. Warps the bulbs vertically.
- **Param C (Phi Phase)**: Adds an offset to the azimuthal angle $\phi$. Twists the bulbs horizontally.
- **Param D (Z Twist)**: Applies a spatial twist along the Z-axis after the power function.
- **Param E (Radiolaria)**: Toggles the **Radiolaria Mutation**.
- **Param F (Radio Limit)**: When Radiolaria is on, this clamps the Y-coordinate.

## Radiolaria Mode
Inspired by **Tom Beddard's** Pixel Bender implementation.
If Param E is enabled (> 0.5), the formula clamps the Y-coordinate *during* the iteration loop.
This creates hollow, skeletal structures that resemble microscopic Radiolaria shells.
- **Tip**: Set Coloring Mode to **Trap** to highlight the "cut" surfaces, which are assigned a trap value of 0.
`
    },
    'formula.mandelbar3d': {
        id: 'formula.mandelbar3d',
        category: 'Formulas',
        title: 'Mandelbar 3D (Tricorn)',
        parentId: 'formula.active',
        content: `
## The Math
A 3D variation of the "Tricorn" or Mandelbar set. In 2D, the Tricorn uses the complex conjugate: $z_{n+1} = \bar{z}_n^2 + c$.
In 3D, this manifests as negating specific terms in the squaring formula.

**Reference:** [Wikipedia: Tricorn (Mathematics)](https://en.wikipedia.org/wiki/Tricorn_(mathematics))

## Parameters
- **Param A (Scale)**: Scales the entire coordinate system before iteration.
- **Param B (Offset)**: Shifts the fractal along the X-axis.
- **Param C (Rot X)**: Rotates the coordinate system around X per iteration.
- **Param D (Rot Z)**: Rotates the coordinate system around Z per iteration.
- **Param E (Offset Z)**: Shifts the fractal along the Z-axis.
- **Param F (Twist)**: Twists space based on Z-depth.

## Characteristics
Unlike the Mandelbulb, the Mandelbar tends to be flatter with shelf-like structures and "tri-corner" symmetries. It often resembles alien ruins or stacked pagodas.
`
    },
    'formula.mandelterrain': {
        id: 'formula.mandelterrain',
        category: 'Formulas',
        title: 'Mandel Terrain',
        parentId: 'formula.active',
        content: `
## The Math
This is not a true 3D fractal, but a heightmap generator. It calculates the 2D Mandelbrot set ($z^2+c$) on the XZ plane and uses the iteration count or orbit trap distance to displace the Y (Height) coordinate.

**Reference:** [Wikipedia: Mandelbrot Set](https://en.wikipedia.org/wiki/Mandelbrot_set)
**Credits:** Mathematical basis by **Benoit B. Mandelbrot**.

## Parameters
- **Param A (Height)**: Controls the vertical displacement strength based on the Distance Estimator.
- **Param B (Zoom)**: Zoom level into the 2D complex plane.
- **Param C (Layer 2)**: Adds secondary ripples driven by the "Layer 2" gradient brightness.
- **Param D (Smooth Trap)**: Adds spikey towers based on Orbit Trap proximity.
- **Param E/F (Pan)**: Moves the fractal center coordinates (Julia/Mandelbrot origin).

## Usage
Ideal for creating alien landscapes, canyons, and "Math Mountains".
`
    },
    'formula.quaternion': {
        id: 'formula.quaternion',
        category: 'Formulas',
        title: 'Quaternion Julia',
        parentId: 'formula.active',
        content: `
## The Math
Quaternions are a 4-dimensional number system ($x, y, z, w$). This formula iterates the classic $z^2+c$ using Quaternion multiplication.
Since our screens are 2D and the fractal is 4D, we view a **3D Slice** of the 4D object.

**Reference:** [Wikipedia: Quaternion](https://en.wikipedia.org/wiki/Quaternion)
**Credits:** Number system described by **William Rowan Hamilton**.

## Parameters
- **Param A (Julia W)**: The 4th coordinate of the Julia Constant $C$. Changing this "animates" the fractal as you move through the 4th dimension.
- **Param B (Slice W)**: The w-coordinate of the 3D slice we are rendering.
- **Param C-F (Rotations)**: Rotates the 4D hyper-object on various planes (XY, XZ, XW, YW) before slicing. This creates "inside-out" morphing effects.

## History
Quaternions were described by William Rowan Hamilton in 1843. They are the "true" 3D/4D extension of complex numbers, but because valid multiplication requires 4 dimensions, 3D slices often look "cut off" or smooth compared to the Mandelbulb.
`
    },

    // --- GEOMETRIC & FOLDING ---

    'formula.amazingbox': {
        id: 'formula.amazingbox',
        category: 'Formulas',
        title: 'Amazing Box (Mandelbox)',
        parentId: 'formula.active',
        content: `
## The Math
The Mandelbox is defined by a "Map and Fold" algorithm rather than a power function.
1. **Box Fold**: If a point is outside the box $[-1, 1]$, reflect it back in.
2. **Sphere Fold**: If a point is inside a small sphere, scale it up (inversion).
3. **Scale**: Multiply the vector by a scale factor.

**Reference:** [Wikipedia: Mandelbox](https://en.wikipedia.org/wiki/Mandelbox)
**Credits:** Discovered by **Tom Lowe (Tglad)** in 2010.

## Parameters
- **Param A (Scale)**: The density multiplier. Positive values create solid cubes; negative values create hollow, lattice-like structures.
- **Param B (Min Radius)**: The inner radius of the Sphere Fold (linear scaling region).
- **Param C (Fold Limit)**: The size of the folding box.
- **Param D (Fixed Radius)**: The outer radius of the Sphere Fold (inversion region).
- **Param E/F (Pre-Rotation)**: Rotates space *before* the folds, creating diagonal symmetries.

## History
It is famous for resembling Borg cubes, sci-fi cities, and brutalist architecture.
`
    },
    'formula.marblemarcher': {
        id: 'formula.marblemarcher',
        category: 'Formulas',
        title: 'Marble Marcher',
        parentId: 'formula.active',
        content: `
## The Math
The formula from the game *Marble Marcher*. It is a specialized Menger Sponge Iterated Function System (IFS) that incorporates dynamic rotation and linear shifting in every step.

**Credits:** Created by **CodeParade** for the game [Marble Marcher](https://codeparade.itch.io/marblemarcher).

## Parameters
- **Param A (Scale)**: The scaling factor.
- **Param B/E/F (Shift)**: Linear translation vector.
- **Param C (Rot Z)**: Rotates the Z-plane.
- **Param D (Rot X)**: Rotates the X-plane.

## Usage
Produces highly dynamic, shifting geometric landscapes. Animate the Rotation and Shift parameters to see the geometry unfold and reconfigure itself.
`
    },
    'formula.mengersponge': {
        id: 'formula.mengersponge',
        category: 'Formulas',
        title: 'Menger Sponge',
        parentId: 'formula.active',
        content: `
## The Math
Based on the classic Sierpinski carpet extended to 3D. It recursively subdivides a cube into 27 sub-cubes and removes the center of each face and the center of the cube.
Our implementation adds **Rotation** to the folding steps, creating "Non-Orthogonal" Mengers.

**Reference:** [Wikipedia: Menger Sponge](https://en.wikipedia.org/wiki/Menger_sponge)

## Parameters
- **Param A (Scale)**: The scaling factor. Standard Menger is 3.0.
- **Param B (Offset)**: The spacing between sub-cubes.
- **Param C (Rot X)**: Rotates the coordinate system between iterations.
- **Param D (Rot Z)**: Rotates the coordinate system between iterations.
- **Param E (Z Shift)**: Stretches the fractal vertically.

## Visuals
With rotations set to 0, it looks like a perfect grid. Adding slight rotations creates complex, diagonal, interlocking machinery.
`
    },
    'formula.kleinian': {
        id: 'formula.kleinian',
        category: 'Formulas',
        title: 'Kleinian',
        parentId: 'formula.active',
        content: `
## The Math
Based on Kleinian groups and Limit Sets. It utilizes **Inversion in a Sphere** as its primary operation.
The formula repeats: Box Fold $\to$ Sphere Inversion $\to$ Scale $\to$ Shift.

**Reference:** [Wikipedia: Kleinian Group](https://en.wikipedia.org/wiki/Kleinian_group)
**Credits:** Named after **Felix Klein**.

## Parameters
- **Param A (Scale)**: Controls the size of the spheres.
- **Param B (X Offset)**: Shifts the structure horizontally.
- **Param C (Fold Size)**: Limit of the initial box fold.
- **Param D (K Factor)**: Controls the strength of the spherical inversion.

## Visuals
Resembles organic structures: coral reefs, sponge tissues, or jewelry. It lacks the hard edges of the Mandelbox.
`
    },
    'formula.pseudokleinian': {
        id: 'formula.pseudokleinian',
        category: 'Formulas',
        title: 'Pseudo Kleinian',
        parentId: 'formula.active',
        content: `
## The Math
A modification of the Kleinian formula that introduces a "Magic Factor" (Param D) to warp the inversion logic. It mixes the properties of a Menger Sponge with a Kleinian set.

**Reference:** [Wikipedia: Kleinian Group](https://en.wikipedia.org/wiki/Kleinian_group)

## Parameters
- **Param A (Box Limit)**: Size of the folding box.
- **Param B (Size C)**: Radius of the inversion sphere.
- **Param C (Power)**: Controls the mixing of the coordinate space.
- **Param D (Magic)**: Blends between standard Kleinian and chaotic variation.
- **Param E (Z Shift)**: Vertical offset.
- **Param F (Twist)**: Spatial twist.

## Visuals
Creates intricate, filigree-like patterns that look like carved ivory or 3D printed metal.
`
    },
    'formula.dodecahedron': {
        id: 'formula.dodecahedron',
        category: 'Formulas',
        title: 'Dodecahedron',
        parentId: 'formula.active',
        content: `
## The Math
Uses folding planes aligned to the 12 faces of a Dodecahedron (using the Golden Ratio $\phi$).
Instead of folding into a box (Cube symmetry), it folds space into a Dodecahedron.

**Reference:** [Wikipedia: Regular Dodecahedron](https://en.wikipedia.org/wiki/Regular_dodecahedron)

## Parameters
- **Param A (Scale)**: Expansion factor.
- **Param B (Offset)**: Separation of the faces.
- **Param C/D (Rotation)**: Rotates the symmetry axis.
- **Param E (Z Shift)**: Stretches the shape.
- **Param F (Twist)**: Twists the arms of the fractal.

## Visuals
Produces soccer-ball-like symmetries, icosahedral viruses, and crystalline stars.
`
    },
    'formula.amazingsurface': {
        id: 'formula.amazingsurface',
        category: 'Formulas',
        title: 'Amazing Surface',
        parentId: 'formula.active',
        content: `
## The Math
A hybrid fractal that combines Menger Sponge sorting logic with Kleinian/Mandelbox inversion.
The iteration process:
1. **Sort Axes**: Like a Menger Sponge ($x < y$, etc).
2. **Box Fold**: Clamps and reflects geometry.
3. **Sphere Inversion**: The "Kleinian" part.
4. **Shift & Scale**.

## Parameters
- **Param A (Scale)**: Main scaling factor.
- **Param B (Inv Max)**: Clamps the sphere inversion radius.
- **Param C (Box Size Z)**: Stretches the folding box.
- **Param D (Trans Z)**: Z-axis shift.
- **Param E (Pre-Scale)**: Scales input before folding.
- **Param F (Thickness)**: Defines the surface thickness.
`
    },

    // --- HYBRIDS & VARIANTS ---

    'formula.arisbrot': {
        id: 'formula.arisbrot',
        category: 'Formulas',
        title: 'ArisBrot (Hybrid)',
        parentId: 'formula.active',
        content: `
## The Math
A powerful hybrid discovered by **Dr. Aris** on Fractal Forums. It combines three distinct operations:
1. **Domain Warping:** Twists space based on Z-depth ("Reality Warp").
2. **Kaleidoscopic Fold:** Folds space diagonally (KIFS).
3. **Bulb Power:** Applies the Mandelbulb power function.

## Parameters
- **Param A (Scale)**: Scale of the KIFS fold.
- **Param B (Power)**: The exponent of the Mandelbulb finish.
- **Param C (Reality Warp)**: Strength of the domain twisting.
- **Param D (Void Radius)**: Size of the central spherical clearing.
- **Param E (Offset/Shear)**: Shifts the folding planes.
- **Param F (Warp Phase)**: Rotates the domain warp.

## Visuals
Known for creating "Sci-Fi Portal" looks with a smooth, twisted tunnel leading to a complex geometric center.
`
    },
    'formula.phoenix': {
        id: 'formula.phoenix',
        category: 'Formulas',
        title: 'Phoenix 3D',
        parentId: 'formula.active',
        content: `
## The Math
A 3D generalization of the Phoenix set. Unlike Julia sets which depend only on $z_n$, Phoenix depends on the *previous* iteration $z_{n-1}$.
$$ z_n = z_{n-1}^p + c + K \cdot z_{n-2} $$

**Reference:** [Wikipedia: Phoenix Set](https://en.wikipedia.org/wiki/Phoenix_set)

## Parameters
- **Param A (Power)**: The main exponent.
- **Param B (Distortion Real)**: The real component of the historical influence $K$.
- **Param C (Distortion Imag)**: The imaginary component of $K$.
- **Param D (History Exp)**: Exponent applied to the previous iteration.
- **Param E (Z Stretch)**: Scales the Z-axis.
- **Param F (Twist)**: Applies spatial twist.

## Visuals
Creates distorted, stretching shapes that look like pulling taffy or molten glass.
`
    },
    'formula.buffalo': {
        id: 'formula.buffalo',
        category: 'Formulas',
        title: 'Buffalo 3D',
        parentId: 'formula.active',
        content: `
## The Math
Based on the "Buffalo" variation of the Mandelbrot set: $z_{n+1} = |z_n|^2 + c$.
In 3D, we apply the absolute value to coordinates *before* the rotation/power step.
Also includes a Menger-style scaling step to add structural holes.

**Reference:** [Wikipedia: Burning Ship Fractal](https://en.wikipedia.org/wiki/Burning_Ship_fractal) (Mathematical cousin)

## Parameters
- **Param A (Power)**: The exponent of the bulb function.
- **Param B (Fold Scale)**: Strength of the Menger-style scaling (cuts holes).
- **Param C (Rot X)**: Internal rotation.
- **Param D (Rot Z)**: Internal rotation.

## Visuals
Similar to the Mandelbulb but with a "furry" or "plate-like" texture due to the absolute value folds.
`
    },
    'formula.mixpinski': {
        id: 'formula.mixpinski',
        category: 'Formulas',
        title: 'MixPinski',
        parentId: 'formula.active',
        content: `
## The Math
A variant of the Sierpinski Tetrahedron (Tetrahedral symmetry).
It mixes the folding logic of a Sierpinski with an Analytic inversion and rotation.

**Reference:** [Wikipedia: Sierpinski Triangle (Higher Dimensions)](https://en.wikipedia.org/wiki/Sierpi%C5%84ski_triangle#Analogs_in_higher_dimensions)

## Parameters
- **Param A (Scale)**: Recursive scaling factor (usually 2.0).
- **Param B (Offset)**: Separation of child tetrahedrons.
- **Param C (Rotation)**: Spins the child elements.
- **Param D/E (Shift)**: Offsets the structure in Z/Y.
- **Param F (Twist)**: Twists the entire structure.

## Visuals
Creates "Greeble" surfaces—patterns that look like highly detailed mechanical plating or cityscapes from a bird's eye view.
`
    },
    'formula.amazingsurf': {
        id: 'formula.amazingsurf',
        category: 'Formulas',
        title: 'Amazing Surf',
        parentId: 'formula.active',
        content: `
## The Math
A variation of the Amazing Box discovered by **Kali**. It adds a sinusoidal wave function to the iteration, creating organic, flowing forms.
$$ z \to \text{Fold}(z) + \sin(z) $$

**Credits:** Discovered by **Kali** (Fractal Forums).

## Parameters
- **Param A (Scale)**: Box scale.
- **Param B (Min Radius)**: Sphere fold radius.
- **Param C (Wave Freq)**: Frequency of the sine waves.
- **Param D (Wave Amp)**: Amplitude (height) of the sine waves.
- **Param E (Wave Twist)**: Twists the wave direction.
- **Param F (Vert Shift)**: Shifts the waves vertically.

## Visuals
Creates structures that look like melting machinery, flowing liquid metal, or alien biomechanical surfaces.
`
    },
    'formula.boxbulb': {
        id: 'formula.boxbulb',
        category: 'Formulas',
        title: 'Box Bulb',
        parentId: 'formula.active',
        content: `
## The Math
A direct hybrid of the Box Fold (Mandelbox) and the Mandelbulb.
In each iteration, it first applies a Box Fold, then feeds that result into the Mandelbulb Power function.

## Parameters
- **Param A (Power)**: Mandelbulb exponent.
- **Param B (Min Radius)**: Sphere fold inner radius.
- **Param C (Scale)**: Box fold scale.
- **Param D (Fixed Radius)**: Sphere fold outer radius.
- **Param E/F (Rotation)**: Rotates the coordinates between the Fold and the Power step.

## Visuals
Creates "Boxy Bulbs"—fractals that have the general shape of a Mandelbulb but with square, mechanical surface details.
`
    },
    'formula.mengeradvanced': {
        id: 'formula.mengeradvanced',
        category: 'Formulas',
        title: 'Menger Advanced',
        parentId: 'formula.active',
        content: `
## The Math
An advanced version of the Menger Sponge shader with expanded control over the folding axes and shifts.

**Reference:** [Wikipedia: Menger Sponge](https://en.wikipedia.org/wiki/Menger_sponge)

## Parameters
- **Param A (Scale)**: Size multiplier (3.0 is standard).
- **Param B (Offset)**: Spacing of the sponge.
- **Param C (Rot X)**: Rotates the X-axis fold.
- **Param D (Rot Z)**: Rotates the Z-axis fold.
- **Param E (Shift)**: Linear shift applied after scaling.
- **Param F (Twist)**: Global twist.

## Visuals
Capable of generating "impossible geometry", piping systems, and Escher-like architectural loops.
`
    },
    'formula.bristorbrot': {
        id: 'formula.bristorbrot',
        category: 'Formulas',
        title: 'Bristorbrot',
        parentId: 'formula.active',
        content: `
## The Math
A specific algebraic variation of the Mandelbulb math.
Instead of standard spherical conversion, it uses a unique coordinate mixing strategy:
$y' = y \cdot (2x - z)$
$z' = z \cdot (2x + y)$

**Credits:** Discovered by **Bristor** (Fractal Forums).

## Parameters
- **Param A (Scale)**: Overall size.
- **Param B (Offset)**: Linear offset.
- **Param C/D (Rotation)**: Coordinate rotation.
- **Param E (Shift X)**: X-axis shift.
- **Param F (Twist)**: Z-axis twist.

## Visuals
Produces bulbous but distorted shapes, often with large smooth areas contrasted by sharp, bristly details (hence the name).
`
    },
    'formula.makinbrot': {
        id: 'formula.makinbrot',
        category: 'Formulas',
        title: 'Makin Brot',
        parentId: 'formula.active',
        content: `
## The Math
Another analytic variation discovered by a fractal forum user named **Makin**.
It uses a variation of the triplex multiplication found in the Mandelbulb but swaps axis dependencies.

**Credits:** Discovered by **Makin** (Fractal Forums).

## Parameters
- **Param A (Scale)**: Zoom/Scale of the object.
- **Param B (Offset)**: Offset vector size.
- **Param C/D (Rotation)**: Rotates the system.
- **Param E (Shift Y)**: Shifts the fractal vertically.
- **Param F (Twist)**: Twists the fractal.

## Visuals
Known for creating "Pagoda" shapes and deeply stacked, ornate structures.
`
    },
    'formula.tetrabrot': {
        id: 'formula.tetrabrot',
        category: 'Formulas',
        title: 'Tetrabrot',
        parentId: 'formula.active',
        content: `
## The Math
A pseudo-4D fractal. It uses a specific "Tetrahedral Squaring" function on a 4-component vector, then projects it down to 3D.

**Reference:** [Wikipedia: Quaternion](https://en.wikipedia.org/wiki/Quaternion) (Mathematical basis)

## Parameters
- **Param A (Julia C/W)**: The 4th dimensional constant.
- **Param B (Slice W)**: The 4th dimensional slice plane.
- **Param E (Rot Z)**: Rotation in the Z plane.
- **Param F (Rot X)**: Rotation in the X plane.

## Visuals
Similar to the Quaternion set but often produces more geometric, diamond-like symmetries.
`
    },
    'formula.modular': {
        id: 'formula.modular',
        category: 'Formulas',
        title: 'Modular Builder',
        parentId: 'formula.active',
        content: `
## The System
The Modular Builder allows you to construct your own fractal equation by chaining operations together.
Instead of a fixed equation, you drag-and-drop operations in the **Graph** tab.

## Node Types
- **Transforms**: Rotate, Scale, Translate, Twist.
- **Folds**: Box Fold, Sphere Fold, Abs, Plane Fold.
- **Fractals**: Mandelbulb, Menger.
- **Combiners (CSG)**: Union, Subtract, Intersect, Smooth Union.

## Usage
1. Open the **Graph** tab (or switch Formula to "Modular").
2. Right-click to add nodes.
3. Connect **Input (Z)** $\to$ **Nodes** $\to$ **Output (Distance)**.
4. Bind node parameters to global sliders (Param A-F) to animate them.
`
    },
    'formula.juliamorph': {
        id: 'formula.juliamorph',
        category: 'Formulas',
        title: 'Julia Morph',
        parentId: 'formula.active',
        content: `
## The Math
This formula creates a 3D volume by stacking 2D Julia sets along the Z-axis.
Instead of a single constant $C$, the value of $C$ interpolates from a Start value to an End value as $Z$ changes.

## Usage
1. **Start Shape**: Set using the **Julia Mode** controls (Julia X/Y/Z).
2. **End Shape**: Set using **Param D** (Real) and **Param E** (Imaginary).
3. **Height**: Controls the length of the stack.

## Slicing
This formula is often used with "Slice Thickness" to create disjointed, floating layers (like MRI scans or topographic maps).
`
    }
};
