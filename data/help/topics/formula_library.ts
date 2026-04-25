
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
- **Power**: The exponent $n$.
  - **8.0**: The classic "Broccoli" shape discovered by Daniel White.
  - **2.0**: A smooth, bulbous shape similar to a 3D Cardioid.
- **Phase (theta, phi)**: A two-axis control for the polar and azimuthal angle offsets. Theta warps the bulbs vertically; phi twists them horizontally.
- **Z Twist**: Applies a spatial twist along the Z-axis after the power function.
- **Radiolaria**: A two-axis control — the first slider toggles the Radiolaria mutation on/off, and the second sets the Y-coordinate clamp limit.

## Radiolaria Mode
Inspired by **Tom Beddard's** Pixel Bender implementation.
If Param E is enabled (> 0.5), the formula clamps the Y-coordinate *during* the iteration loop.
This creates hollow, skeletal structures that resemble microscopic Radiolaria shells.
- **Tip**: Set Coloring Mode to **Trap** to highlight the "cut" surfaces, which are assigned a trap value of 0.
`
    },
    'formula.appell': {
        id: 'formula.appell',
        category: 'Formulas',
        title: 'Appell Spectral (Ghost)',
        parentId: 'formula.active',
        content: `
## The Math
Implements a simplified Appell polynomial iteration. The non-conformal subtraction term destabilizes the surface, revealing skeletal interference patterns.
$$ P(x) = x^n - k|x|^2 $$

## The "Ghost" Visuals
Because this formula subtracts magnitude during iteration, it doesn't converge to a hard surface like a standard Mandelbrot.
Instead, it creates a field of "Interference Patterns".
This implementation is designed to be rendered as a **Volumetric Cloud** (using the Glow engine) rather than a solid object.

## Parameters
- **Interference**: The strength of the subtraction term $k$.
  - **0.0**: Standard "Lathe" fractal (Solid).
  - **0.33**: The theoretical Euclidean balance point.
  - **> 0.5**: Breaks the surface, revealing internal veins and structures.
- **Power**: The exponent of the iteration. Default 2.0 for classic behavior; higher values create more complex structures.
- **Ghost Shift**: Shifts the calculation into the 4th dimension. Use this to scan through the "inside" of the ghost.
- **Cloud Density**: Artificially softens the Distance Estimator to make the fractal look like a nebula.
- **Phase**: Rotational offset applied to the azimuthal angle during iteration. Creates twisted, spiraling structures.
`
    },
    'formula.mandelorus': {
        id: 'formula.mandelorus',
        category: 'Formulas',
        title: 'Mandelorus (HyperTorus)',
        parentId: 'formula.active',
        content: `
## The Concept
Standard 3D fractals like the Mandelbulb suffer from "Polar Distortion"—the texture gets pinched at the top and bottom poles (like the north pole of a globe).
The **Mandelorus** solves this by mapping the infinite fractal plane onto the surface of a **Torus** (Donut) instead of a Sphere.
This creates a **Solenoid** structure where the fractal wraps around the ring endlessly.

## The Math
1. Convert 3D position $(x,y,z)$ to Toroidal coordinates $(radius, angle, z)$.
2. The poloidal cross-section (the slice of the donut) forms a complex plane.
3. We iterate the Mandelbrot formula on this slice.
4. We apply a **Twist** rotation to the slice based on the angle around the ring.

## Parameters
- **Ring Radius**: The major radius of the donut. Controls the size of the "hole".
- **Twist (Sym)**: The most important control. Spins the fractal pattern around the ring. Linked to Power so that 1.0 = one full symmetry step.
  - **0.0**: Creates a "Lathe" effect (constant cross-section).
  - **Values > 0**: Creates twisting, cable-like structures that connect endlessly.
- **Power**: The exponent of the Mandelbrot set ($z^2$, $z^3$, etc).
- **Phase (Ring, Cross)**: A two-axis control — the first slider shifts the fractal along the length of the tube, the second rotates the cross-section slice.
- **Vert Scale**: Scales the vertical (Z) axis of the torus cross-section. Use this to squash or stretch the fractal vertically.

## Usage
Perfect for creating "Endless Tunnels" or "Ouroboros" structures. Fly the camera inside the tube for infinite loops.
`
    },
    'formula.mandelbar3d': {
        id: 'formula.mandelbar3d',
        category: 'Formulas',
        title: 'Mandelbar 3D (Tricorn)',
        parentId: 'formula.active',
        content: `
## The Math
The 3D extension of the Tricorn (Mandelbar) fractal. The iteration uses: $x' = x^2 - y^2 - z^2$, $y' = 2xy$, $z' = -2xz$. The conjugation (negation on $z'$) creates the distinctive tri-corner symmetry.

**Reference:** [Wikipedia: Tricorn (Mathematics)](https://en.wikipedia.org/wiki/Tricorn_(mathematics))

## Parameters
- **Param A (Scale)**: Scales the entire coordinate system before iteration.
- **Rotation (Vec3B)**: 3D rotation using direction + angle (Rodrigues formula). Pre-calculated for performance.
- **Offset (Vec3A)**: Shifts the fractal along X/Y/Z axes.
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
- **Map Zoom**: Zoom level into the 2D complex plane. Uses exponential scaling (power of 2).
- **Pan (Real, Imag)**: A two-axis control that moves the fractal center coordinates on the complex plane.
- **Height: Distance Estimator**: Controls the vertical displacement strength based on the Distance Estimator.
- **Height: Layer 2 Gradient**: Adds secondary ripples driven by the "Layer 2" gradient brightness.
- **Height: SmoothTrap**: Adds spikey towers based on Orbit Trap proximity.

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
- **Julia C (W)**: The 4th coordinate of the Julia Constant $C$. Changing this "animates" the fractal as you move through the 4th dimension.
- **Slice W**: The w-coordinate of the 3D slice we are rendering.
- **Damping**: Adds momentum feedback to the iteration trajectory, creating smoother variants of the fractal (Kosalos variant).
- **Inversion Radius**: Enables spherical inversion pre-transform. When greater than 0, inverts space around the Inversion Center, creating inside-out shapes.
- **Inversion Angle**: Angular twist applied during the spherical inversion.
- **Rot 3D (XY, XZ)**: A two-axis control for 3D rotations on the XY and XZ planes before iteration.
- **Rot 4D (XW, YW)**: A two-axis control for 4D rotations on the XW and YW planes. Creates "inside-out" morphing effects unique to 4D objects.
- **Inversion Center**: A three-axis control (X, Y, Z) that sets the center point for the spherical inversion.

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
- **Scale**: The density multiplier. Positive values create solid cubes; negative values create hollow, lattice-like structures.
- **Min Radius**: The inner radius of the Sphere Fold (linear scaling region).
- **Folding Limit**: The size of the folding box.
- **Fixed Radius**: The outer radius of the Sphere Fold (inversion region).
- **Pre-Rotation**: A three-axis rotation (X, Y, Z) applied *before* the folds, creating diagonal symmetries.

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
Algorithm: abs → Rot Z → Menger fold (sort descending) → Rot X → Scale → Shift.

**Credits:** Created by **CodeParade** for the game [Marble Marcher](https://codeparade.itch.io/marblemarcher).

## Parameters
- **Param A (Scale)**: The scaling factor.
- **Shift (Vec3A)**: Linear translation vector (X, Y, Z).
- **Rotation (Vec3B)**: X = Rot Z angle (after abs), Y = Rot X angle (after Menger fold). Pre-calculated sin/cos for performance.

## Usage
Produces highly dynamic, shifting geometric landscapes. Animate the Rotation and Shift parameters to see the geometry unfold and reconfigure itself.
**Tip:** Select **Chebyshev** distance metric in Quality for the classic look.
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
- **Scale**: The scaling factor. Standard Menger is 3.0.
- **Offset**: A three-axis control (X, Y, Z) for the spacing between sub-cubes. Axes can be linked for uniform scaling or adjusted independently for stretched variations.
- **Rotation**: A three-axis rotation (X, Y, Z) applied to the coordinate system between iterations.
- **Center Z**: A toggle (0 or 1). When on, restores the full cubic symmetry so the sponge is centered. When off, you get a corner-aligned fractal.

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
    'formula.pseudokleinian06': {
        id: 'formula.pseudokleinian06',
        category: 'Formulas',
        title: 'Pseudo Kleinian 06',
        parentId: 'formula.active',
        content: `
## The Math
Scale-1 JuliaBox with "Thingy" distance estimator by Knighty and Theli-at. Each iteration applies a box fold, sphere fold, and Julia shift:

$$p \\leftarrow 2 \\cdot \\text{clamp}(p, -\\text{CSize}, \\text{CSize}) - p$$
$$k = \\max(\\text{Size} / r^2,\\; 1), \\quad p \\leftarrow k \\cdot p$$
$$p \\leftarrow p + C$$

The DE uses the "Thingy" shape — a twisted cylindrical cross-section controlled by Thickness (x, y).

**Sphere Inversion** wraps the infinite periodic tiling into a bounded sphere via Möbius inversion. InvRadius and InvCenter control the inversion sphere.

**Reference:** [Fractal Forums: Fragmentarium Pseudo Kleinian](http://www.fractalforums.com/3d-fractal-generation/fragmentarium-an-ide-for-exploring-3d-fractals-and-other-systems-on-the-gpu/msg32270/)

## Parameters
- **Size**: Sphere fold radius. 1.0 = scale-1 Julia box.
- **CSize**: Box fold half-size per axis. CSize.z also offsets z before the loop.
- **C**: Julia constant shift. Zero = pure Kleinian; non-zero = Julia variant.
- **Thickness**: x = TThickness (DE numerator), y = TThickness2 (cylindrical shell radius).
- **Inversion**: Toggle + InvRadius. Wraps infinite tiling into bounded sphere.
- **InvCenter**: Sphere inversion center. Classic value (1.15, 0.5, −2).
- **Offset**: Translates the Thingy DE shape origin.
- **DEoffset**: Subtracts from the final DE, inflating the surface.

## Visuals
Produces nested bubble lattices, soap-film geometries, and intricate Kleinian group limit sets. With inversion off, generates infinite periodic tunnel/room structures.
`
    },
    'formula.dodecahedron': {
        id: 'formula.dodecahedron',
        category: 'Formulas',
        title: 'Dodecahedron',
        parentId: 'formula.active',
        content: `
## The Math
Kaleidoscopic IFS with true dodecahedral symmetry. Uses 3 golden-ratio reflection normals based on Knighty's method:
- $n_1 = \\text{normalize}(-1, \\phi-1, 1/(\\phi-1))$
- $n_2 = \\text{normalize}(\\phi-1, 1/(\\phi-1), -1)$
- $n_3 = \\text{normalize}(1/(\\phi-1), -1, \\phi-1)$

Each iteration reflects across all 3 normals × 3 repetitions = **9 fold operations**, producing the full icosahedral/dodecahedral reflection group.

**Reference:** [Wikipedia: Regular Dodecahedron](https://en.wikipedia.org/wiki/Regular_dodecahedron)
**Credits:** Based on **Knighty's** Kaleidoscopic IFS (Syntopia 2010).

## Parameters
- **Param A (Scale)**: Expansion factor. Default 2.618 (golden ratio).
- **Param B (Offset)**: Separation of the faces.
- **Rotation (Vec3B)**: 3D rotation using direction + angle (Rodrigues formula). Pre-calculated for performance.
- **Shift (Vec3A)**: Linear offset in X/Y/Z.
- **Param F (Twist)**: Twists the arms of the fractal along the Z-axis.

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
- **Power (p)**: The main exponent applied via spherical coordinates.
- **History Exp**: Exponent applied to the previous iteration value $z_{n-1}$. At 1.0 it is linear; higher values create more extreme feedback.
- **Twist**: Applies a spatial twist along the Z-axis before the power function.
- **History Depth**: Blends between $z_{n-1}$ (depth 0) and $z_{n-2}$ (depth 1) for deeper memory effects.
- **Distortion (Re, Im)**: A two-axis control for the historical influence $K$. The real and imaginary components control how the previous iteration feeds back into the current one.
- **Phase (theta, phi)**: A two-axis control for phase offsets applied to the spherical angles during the power function.
- **Stretch**: A three-axis control (X, Y, Z) for anisotropic stretching of the coordinates. Axes can be linked for uniform scaling.
- **Abs Fold**: A three-axis toggle (per-axis on/off) that applies absolute value folding after the power function, creating "Burning Phoenix" variants.
- **Pre-Rotation**: A three-axis rotation (X, Y, Z) applied before the power function.

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
The Buffalo fractal — a Mandelbulb variant with **selective per-axis absolute value folding**. Ported from Mandelbulber via 3Dickulus, based on the original by youhn @ fractalforums.com.

The signature feature is choosing which axes get abs() applied before and after the power iteration. The default (abs on Y+Z post-iteration) creates the distinctive "buffalo horn" shape.

**Reference:** [Wikipedia: Burning Ship Fractal](https://en.wikipedia.org/wiki/Burning_Ship_fractal) (Mathematical cousin)

## Parameters
- **Param A (Power)**: The Mandelbulb exponent. Default 2 for the classic Buffalo shape.
- **Abs After Power (Vec3A)**: Per-axis absolute value toggles AFTER the power iteration (0=off, 1=on). Default: Y=1, Z=1 for the signature buffalo shape.
- **Abs Before Power (Vec3B)**: Per-axis absolute value toggles BEFORE the power iteration (0=off, 1=on). Default: all off.
- **Rotation (Vec3C)**: 3D rotation using direction + angle (Rodrigues formula).

## Visuals
With default post-abs Y+Z: creates the distinctive buffalo/horn shape. Try different abs combinations for varied symmetries. All axes on = classic Burning Ship style.
`
    },
    'formula.mixpinski': {
        id: 'formula.mixpinski',
        category: 'Formulas',
        title: 'MixPinski',
        parentId: 'formula.active',
        content: `
## The Math
A faithful port of **Darkbeam's** 4D Sierpinski-Menger hybrid from Fragmentarium. Alternates between two folding systems in 4D:
1. **Sierpinski folds**: 6 axis-pair reflections in 4D $(x+y, x+z, y+z, x+w, y+w, z+w)$, then uniform scale + offset.
2. **Menger folds**: Axis-aligned scale with Z abs-fold, creating the characteristic rectangular holes.

**Credits:** Original by **Darkbeam** (Fragmentarium).

## Parameters
- **Param A (Sierpinski Scale)**: Scale for the Sierpinski phase.
- **Param C (Menger Scale)**: Scale for the Menger phase.
- **Param B (W 4th Dim)**: Initial 4th dimension coordinate (w-component).
- **Sierpinski Offset (Vec3A)**: XYZ offset for the Sierpinski phase.
- **Menger Offset (Vec3B)**: XYZ offset for the Menger phase.
- **4D Offsets (Vec2A)**: X = Sierpinski W offset, Y = Menger W offset.
- **Rotation (Vec3C)**: 3D rotation (Rodrigues formula).

## Distance Estimator
Uses a custom 4D Chebyshev norm: $r = \\max(|x|, |y|, |z|, |w|)$, then $(r-1)/|dr|$.

## Visuals
Creates complex hybrid structures mixing tetrahedral and cubic symmetries — mechanical lattices, alien cityscapes, and intricate geometric patterns.
`
    },
    'formula.sierpinskitetrahedron': {
        id: 'formula.sierpinskitetrahedron',
        category: 'Formulas',
        title: 'Sierpinski Tetrahedron',
        parentId: 'formula.active',
        content: `
## The Math
The classic Sierpinski Tetrahedron (Tetrix) — a 3D IFS fractal built from reflective folds across tetrahedron face planes.
Each iteration applies 3 fold operations:
1. If $x + y < 0$: swap and negate $x, y$
2. If $x + z < 0$: swap and negate $x, z$
3. If $y + z < 0$: swap and negate $y, z$

Then scales and offsets the result.

**Reference:** [Wikipedia: Sierpinski Triangle (Higher Dimensions)](https://en.wikipedia.org/wiki/Sierpi%C5%84ski_triangle#Analogs_in_higher_dimensions)

## Parameters
- **Scale (Vec3C)**: Per-axis scale factor with linkable toggle for uniform scaling. Default 2.0.
- **Param B (Offset)**: Separation of child tetrahedrons.
- **Rotation (Vec3B)**: 3D rotation using direction + angle (Rodrigues formula). Pre-calculated for performance.
- **Shift (Vec3A)**: Linear offset in X/Y/Z.
- **Param F (Twist)**: Z-axis twist.

## Distance Estimator
Uses Linear (Unit 1.0) estimator: $(r-1)/dr$, correct for IFS with default scale 2 and offset 1.

## Visuals
Creates "Greeble" surfaces — patterns that look like highly detailed mechanical plating or cityscapes from a bird's eye view.
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
- **Scale**: Box scale.
- **Min Radius**: Sphere fold radius.
- **Wave Freq**: Frequency of the sine waves.
- **Wave Amp**: Amplitude (height) of the sine waves.
- **Transform**: A three-axis control — X is Wave Twist (twists the wave direction), Y is Vertical Shift (shifts the waves up/down), and Z is available for additional effects.

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
A custom 3D polynomial fractal. No folding or spherical conversion — the asymmetric cross-terms between axes create sharp crystalline edges mixed with smooth bulb regions.
$$x' = x^2 - y^2 - z^2$$
$$y' = y(2x - z)$$
$$z' = z(2x + y)$$

**Credits:** Discovered by **Bristor** (Fractal Forums).

## Parameters
- **Param A (Scale)**: Overall size multiplier.
- **Param B (Offset)**: Y-axis linear offset.
- **Rotation (Vec3A)**: 3D rotation with direction + angle (rotation mode). Pre-calculated sin/cos.
- **Param C (Shift X)**: X-axis shift.
- **Param D (Twist)**: Z-axis twist.

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
A custom 3D polynomial discovered by **Makin** (Fractal Forums). Uses a variation of the triplex multiplication:
$$x' = x^2 - y^2 - z^2$$
$$y' = 2xy$$
$$z' = 2z(x - y)$$

## Parameters
- **Param A (Scale)**: Size multiplier.
- **Rotation (Vec3B)**: 3D rotation using direction + angle (Rodrigues formula). Pre-calculated for performance.
- **Shift (Vec3A)**: Linear offset in X/Y/Z.
- **Param F (Twist)**: Z-axis twist.

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

## Parameters
- **Height (Z Scale)**: Controls the vertical extent of the Julia stack.
- **Slice Interval**: Spacing between repeating slices. Set to 0 for a continuous solid.
- **Slice Thickness**: The width of each slice. Creates disjointed, floating layers (like MRI scans or topographic maps).
- **Start C**: A two-axis control (Real, Imaginary) for the Julia constant at the bottom of the stack.
- **End C**: A two-axis control (Real, Imaginary) for the Julia constant at the top. The constant smoothly interpolates between Start C and End C along the height.
- **Twist**: Rotates the 2D Julia cross-section around the center as Z changes, creating spiraling structures.
- **Bend**: Curves the entire column along the X-axis. Positive and negative values bend in opposite directions.
- **Taper**: Scales the cross-section based on Z position — positive values make the top wider, negative makes it narrower.
`
    },
    'formula.borromean': {
        id: 'formula.borromean',
        category: 'Formulas',
        title: 'Borromean (Cyclic)',
        parentId: 'formula.active',
        content: `
## The Math
Treats 3D space as three coupled 2D complex planes (XY, YZ, ZX). The output of one plane feeds into the next, creating a cyclic "Rock-Paper-Scissors" feedback loop. This produces tetrahedral symmetries and solid, non-spherical shapes without using spherical coordinates.

## Parameters
- **Param A (Power)**: Exponent applied to each axis component. Default 2.0.
- **Param B (Connection)**: The "Link Strength" — controls coupling between planes via cross-terms. Higher values create more interlocking geometry.
- **Param C (Repulsion)**: The "Subtractive Force" — how much adjacent axis power is subtracted. Creates voids and cavities.
- **Param D (Balance)**: "Mixing Force" — adds a third axis into each equation, breaking bilateral symmetry.
- **Param E (Phase)**: Phase shift rotation applied per iteration.
- **Param F (Invert)**: Sign flip toggle for the connection cross-terms. Switches between two distinct fractal families.

## Visuals
Creates unique tetrahedral and cubic symmetries that look fundamentally different from spherical-coordinate fractals like the Mandelbulb. Good for crystalline, mineral-like structures.
`
    },
    'formula.kalibox': {
        id: 'formula.kalibox',
        category: 'Formulas',
        title: 'Kali Box',
        parentId: 'formula.active',
        content: `
## The Math
A Mandelbox variant by **Kali** (fractalforums.com), optimized by **Rrrola**. The iteration combines:
1. **Rotation** around the (1,1,0) axis
2. **Abs-fold + Translation** (classic box fold)
3. **Clamped Sphere Inversion** (Rrrola's optimization)
4. **Scale and add constant**

**Credits:** Original by **Kali** (fractalforums.com), sphere inversion optimization by **Rrrola**.

## Parameters
- **Param A (Scale)**: Overall scaling factor. Default 2.043.
- **Param B (MinRad2)**: Minimum radius squared for the sphere inversion clamp. Controls "density" of detail.
- **Translation (Vec3A)**: Added after the abs-fold. Primary shape control.
- **Param F (Rotation)**: Axis-angle rotation around (1,1,0), applied each iteration.

## Visuals
Produces organic, cave-like structures and alien landscapes. Less "boxy" than the standard Mandelbox due to the rotation and clamped inversion.
`
    },
    'formula.mandelmap': {
        id: 'formula.mandelmap',
        category: 'Formulas',
        title: 'MandelMap (Unrolled)',
        parentId: 'formula.active',
        content: `
## The Math
"Unrolls" the Mandelbulb surface onto a flat plane using coordinate projection. The XZ plane maps to angles on the bulb surface, and Y maps to radius offset. Three projection modes are available.

## Projections (Param D)
- **Spherical (0)**: Mercator-like mapping. Classic look, distorts at poles.
- **Cylindrical (1)**: Unwraps to an infinite vertical column. No polar distortion.
- **Toroidal (2)**: Wraps around a donut. Seamless tiling in all directions.

## Parameters
- **Param A (Power)**: Mandelbulb exponent. Default 8.0.
- **Param B (Height Amp)**: Controls how Y maps to radius offset (vertical amplitude).
- **Param C (Map Scale)**: Scales XZ coordinates before projection (texture density).
- **Param D (Projection)**: Dropdown — Spherical / Cylindrical / Toroidal.
- **Phase (Vec2A)**: Phase shifts for theta and phi angles. Includes "Symmetry Shift" compensation to lock features in place as they mutate.

## Visuals
Creates infinite fractal terrains, tileable surfaces, and seamless textures. The Toroidal mode is perfect for endless tunnels and looping worlds.
`
    },
    'formula.mandelbolic': {
        id: 'formula.mandelbolic',
        category: 'Formulas',
        title: 'MandelBolic',
        parentId: 'formula.active',
        content: `
## The Math
The MandelBolic is a true 3D geometric extension of the Mandelbrot set into Hyperbolic 3-Space using the Poincaré-Ahlfors extension.

This approach bypasses the limitations of 3D algebra by preserving perfect spherical bulbs, exact periodicity, and the true 3D cardioid core without the "smeared" artifacts of standard 3D fractals.

## The Ahlfors Extension
The formula uses a conformal mapping that extends the complex plane into hyperbolic 3-space:
$$ M = (|Z|^2 - T^2) / |Z|^2 $$

Where Z is the 2D complex plane (x, y) and T is the hyperbolic height (z).

## Parameters
- **Param A (Power)**: The exponent of the iteration. Default is 2.0 for classic Mandelbrot behavior.
- **Param B (Hyp. Scale)**: Scales the hyperbolic height growth. Controls how fast the Z-dimension expands.
- **Param C (Conformal Shift)**: Distorts the hyperbolic mapping. Creates unique geometric variations.
- **Param D (Phase Twist)**: Adds rotational offset during iteration. Creates spiraling arms.
- **Param E (Z-Offset)**: Constant offset added to the Z coordinate each iteration.
- **Param F (Trap Scale)**: Scales the orbit trap distance for coloring.

## Visuals
Creates organic, bulbous structures with perfect spherical details. The hyperbolic extension produces unique "saddle" and "feather" filaments that differ from standard Mandelbulb fractals.
`
    },

    // --- HARMONIC / GOLDEN RATIO ---

    'formula.claude': {
        id: 'formula.claude',
        category: 'Formulas',
        title: 'Claude',
        parentId: 'formula.active',
        content: `
## Origin
This formula was designed by **Claude** (Anthropic's AI) as a self-portrait in mathematics. Given the prompt *"create a fractal that embodies Claude,"* it chose the golden ratio $\\phi$ as the unifying principle — a constant that appears in nature, art, and geometry as the archetype of harmony emerging from simple rules. The result is a fractal where every structural element traces back to $\\phi$: the fold planes, the rotation axis, and the default parameters.

## The Math
A harmonic resonance fractal built entirely on the golden ratio $\\phi = (1+\\sqrt{5})/2$.

The iteration combines four operations:

1. **Icosahedral Fold** — Three reflections across planes whose normals are constructed from $\\phi$:
   - $n_1 = \\text{normalize}(-1,\\; \\phi\\!-\\!1,\\; 1/(\\phi\\!-\\!1))$
   - $n_2 = \\text{normalize}(\\phi\\!-\\!1,\\; 1/(\\phi\\!-\\!1),\\; -1)$
   - $n_3 = \\text{normalize}(1/(\\phi\\!-\\!1),\\; -1,\\; \\phi\\!-\\!1)$
   These create partial icosahedral (5-fold) symmetry in a single pass of 3 reflections.

2. **Harmonic Fold** — A 4th reflection plane whose normal is $n_3$ rotated around the **golden axis** $(1, \\phi, 0)$ by the Harmonic angle, using the Rodrigues formula. This is unique to this formula — no other IFS fractal has a continuously-variable fold normal direction.

3. **Sphere Inversion** — Clamped Mandelbox-style: points inside Inner R² are scaled by $\\text{Fix}/\\text{Inner}$, points between Inner R² and Fix R² are inverted by $\\text{Fix}/r^2$. Creates recursive depth.

4. **IFS Scale + Offset** — Standard $z = S \\cdot z - \\text{offset} \\cdot (S-1)$, centering the attractor at the Offset position.

## Parameters
- **Param A (Scale)**: Main IFS expansion factor. Default 2.0.
- **Param B (Harmonic)**: Angle (radians) that sweeps the 4th fold plane around the golden axis. Like an overtone enriching a fundamental frequency.
  - **0.0**: 4th fold coincides with $n_3$ (redundant — pure icosahedral base).
  - **0.61**: Default. Creates rich structural variation.
  - **±π**: Maximum deviation from base symmetry.
- **Param C (Inner R²)**: Sphere fold inner radius squared. Smaller = more recursive detail.
- **Param D (Fix R²)**: Sphere fold fixed radius squared. Controls where inversion activates.
- **Offset (Vec3A)**: 3D IFS center. The fractal attractor converges at this point.
- **Rotation (Vec3B)**: Pre-fold 3D rotation (azimuth/pitch/angle, Rodrigues formula). Changes which region of space enters each fold sector.
- **Param F (Twist)**: Position-dependent rotation along the Y-axis. Creates spiraling arms.

## The Golden Ratio Connection
$\\phi$ appears at every level of this fractal:
- **Fold normals** $n_1, n_2, n_3$ — constructed from $\\phi$ and $1/\\phi$
- **Golden axis** $(1, \\phi, 0)$ — an icosahedral vertex direction, used as the harmonic sweep axis
- **Default harmonic angle** 0.61 $\\approx 1/\\phi$ — the golden ratio conjugate

## Visuals
Produces organic, layered structures with pentagonal symmetry undertones. The harmonic fold creates smooth structural transitions as you sweep through the parameter — like zooming through different "perspectives" of the same golden-ratio geometry. Best explored with the Rotation control to find different viewpoints of the fold structure.
`
    },

    // --- CATALAN & COXETER ---

    'formula.rhombicdodecahedron': {
        id: 'formula.rhombicdodecahedron',
        category: 'Formulas',
        title: 'Rhombic Dodecahedron',
        parentId: 'formula.active',
        content: `
## The Math
Catalan solid fractal — the dual of the cuboctahedron. Uses the RD's own face normals as fold planes, NOT the standard Knighty fold. Reflecting through $(1,\\pm 1,0)/\\sqrt{2}$ and $(0,1,\\pm 1)/\\sqrt{2}$ generates the chiral octahedral group (24 elements), producing a fold domain bounded entirely by RD face planes.

In this domain the RD SDF simplifies to a single cutting plane: $d = (x + y - s) / \\sqrt{2}$.

This gives true rhombic dodecahedral geometry at ALL iteration levels.

**Reference:** [Wikipedia: Rhombic Dodecahedron](https://en.wikipedia.org/wiki/Rhombic_dodecahedron)

## Parameters
- **Scale**: IFS expansion factor. Default 2.0.
- **Offset**: Size of the cutting plane / face separation.
- **Rotation (Vec3B)**: 3D pre-fold rotation (Rodrigues formula).
- **Shift (Vec3A)**: Linear offset in X/Y/Z.
- **Twist**: Spatial twist deformation.

## Visuals
Produces fractal structures with rhombic (diamond-shaped) faces at every zoom level. 12 faces arranged in octahedral symmetry.
`
    },
    'formula.rhombictriacontahedron': {
        id: 'formula.rhombictriacontahedron',
        category: 'Formulas',
        title: 'Rhombic Triacontahedron',
        parentId: 'formula.active',
        content: `
## The Math
The 3D shadow of a 6-dimensional hypercube — Buckminster Fuller's favorite shape. 30 golden-ratio rhombic faces with full icosahedral symmetry.

The Knighty icosahedral fold planes are icosidodecahedron vertex normals — the RT's own face normals. After folding, the domain concentrates near the z-axis where the cutting plane simplifies to $d = z - s$.

This gives correct RT geometry at all iteration levels.

**Reference:** [Wikipedia: Rhombic Triacontahedron](https://en.wikipedia.org/wiki/Rhombic_triacontahedron)

## Parameters
- **Scale**: IFS expansion factor. Default 1.618 (the golden ratio).
- **Offset**: Size parameter controlling face separation.
- **Rotation (Vec3B)**: 3D pre-fold rotation (Rodrigues formula).
- **Shift (Vec3A)**: Linear offset in X/Y/Z.
- **Twist**: Spatial twist deformation.

## Visuals
Produces icosahedral-symmetry fractals with 30 rhombic faces. The golden ratio appears naturally in the face proportions.
`
    },
    'formula.coxeter': {
        id: 'formula.coxeter',
        category: 'Formulas',
        title: 'Coxeter',
        parentId: 'formula.active',
        content: `
## The Math
A parameterized Coxeter symmetry fractal that continuously interpolates between the three finite reflection groups in 3D:

- **N = 3**: Tetrahedral [3,3]
- **N = 4**: Octahedral [3,4]
- **N = 5**: Icosahedral [3,5]
- **Fractional N**: Novel intermediate symmetries unique to this formula

## Parameters
- **Scale**: IFS expansion factor.
- **Offset**: Size parameter.
- **Symmetry N**: The Coxeter group order. Sweep from 3 to 5 to morph the geometry.
- **Rotation (Vec3B)**: 3D pre-fold rotation.
- **Shift (Vec3A)**: Linear offset.
- **Twist**: Spatial twist deformation.

## Visuals
Explore fractional N values to discover shapes that don't exist in classical geometry — smooth interpolations between tetrahedral, octahedral, and icosahedral symmetry.
`
    },
    'formula.cuboctahedron': {
        id: 'formula.cuboctahedron',
        category: 'Formulas',
        title: 'Cuboctahedron',
        parentId: 'formula.active',
        content: `
## The Math
Archimedean solid fractal — the rectification of both the cube and octahedron. Uses the Knighty octahedral fold with a cutting-plane distance estimator. 14 faces (8 triangles + 6 squares).

**Reference:** [Wikipedia: Cuboctahedron](https://en.wikipedia.org/wiki/Cuboctahedron)
**Credits:** Based on **Knighty's** Kaleidoscopic IFS.

## Parameters
- **Scale**: IFS expansion factor.
- **Offset**: Face separation / size.
- **Rotation (Vec3B)**: 3D pre-fold rotation.
- **Shift (Vec3A)**: Linear offset.
- **Twist**: Spatial twist deformation.

## Visuals
Produces fractals with mixed triangular and square faces — a geometry that appears in crystal structures (face-centered cubic packing).
`
    },
    'formula.greatstellateddodecahedron': {
        id: 'formula.greatstellateddodecahedron',
        category: 'Formulas',
        title: 'Great Stellated Dodecahedron',
        parentId: 'formula.active',
        content: `
## The Math
One of the four Kepler-Poinsot polyhedra — a stellated dodecahedron. Uses the Knighty icosahedral fold with a stellation-depth parameter.

**Reference:** [Wikipedia: Great Stellated Dodecahedron](https://en.wikipedia.org/wiki/Great_stellated_dodecahedron)

## Parameters
- **Scale**: IFS expansion factor.
- **Offset**: Size parameter.
- **Stellation**: Controls how far the star points extend outward.
- **Rotation (Vec3B)**: 3D pre-fold rotation.
- **Shift (Vec3A)**: Linear offset.
- **Twist**: Spatial twist deformation.

## Visuals
Produces spiky, star-like fractals with icosahedral symmetry. The stellation parameter interpolates between a dodecahedron and the fully stellated form.
`
    }
};
