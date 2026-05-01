const e={"gs.welcome":{id:"gs.welcome",category:"Getting Started",title:"Welcome to GMT",content:`
GMT is a real-time **3D fractal renderer** that runs entirely in your browser. You can explore infinite mathematical structures, sculpt their appearance with physically-based lighting and coloring, animate them, and export your work — no install required.

## What You Can Do
- **Explore** dozens of built-in fractal formulas (Mandelbulb, Mandelbox, Apollonian, Julia sets, and many more)
- **Sculpt** surface detail using parameters A–F on each formula
- **Light** your scene with point lights and sun lights, complete with shadows and ambient occlusion
- **Color** surfaces using palette mapping, orbit traps, or custom gradients
- **Animate** any parameter over time with the Timeline
- **Export** scenes as shareable GMF files, Smart PNG snapshots, or high-quality mesh exports

## Quick Start
1. The fractal renders immediately on load — you're already inside it.
2. **Left-click and drag** the viewport to orbit the camera.
3. Open the **Formula** panel (right side) and try changing the formula from the dropdown.
4. Drag the **A–F sliders** to reshape the fractal.
5. Hit the **Camera Icon** in the top bar to save a snapshot.

Right-click any control to get context-sensitive help for that specific feature.
`},"gs.navigation":{id:"gs.navigation",category:"Getting Started",title:"Navigating the Viewport",parentId:"gs.welcome",content:`
GMT has two camera modes. Press **Tab** to switch between them.

## Orbit Mode (default)
Rotate around a fixed point in space — great for inspecting a fractal from all sides.

- **Left Drag**: Rotate
- **Right Drag**: Pan
- **Scroll**: Zoom in/out
- **Q / E**: Roll the camera

## Fly Mode
Free-fly through the fractal like a spaceship — essential for exploring deep interiors.

- **W / S**: Move forward / backward
- **A / D**: Strafe left / right
- **Space / C**: Ascend / descend
- **Mouse Drag**: Steer (look around)
- **Scroll**: Adjust fly speed
- **Shift**: 4× speed boost
- **Q / E**: Roll the camera

## Tips
- Fractals are **infinitely detailed** — zoom in far enough and new structures appear.
- If you get lost, open the **Camera Manager** (camera icon in the top bar → Camera Manager) to reset to a saved slot or use **Reset Position**.
- **Ctrl + Shift + Z / Y** undoes and redoes camera moves independently of parameter history.
`},"gs.ui_layout":{id:"gs.ui_layout",category:"Getting Started",title:"Understanding the UI",parentId:"gs.welcome",content:`
## Top Bar
The **Top Bar** spans the full width at the top of the screen:
- **Left (Render Tools)**: Logo, render status indicator, quality and accumulation controls
- **Center (Light Studio)**: Quick access to your light slots — click any orb to open its settings, hover to adjust
- **Right**: Camera & Snapshot (camera icon), System Menu (hamburger ≡), Help Menu (?)

## Right Dock (Control Panels)
The **right side panel** is the main control deck, organized into tabs:

| Tab | What it controls |
|-----|-----------------|
| **Formula** | Active formula, parameters A–F, iteration settings |
| **Graph** | Node-based formula builder (Modular formula mode) |
| **Scene** | Background, environment, fog |
| **Shader** | Surface coloring, orbit traps, materials |
| **Gradient** | Color palette editor |
| **Quality** | Ray marching quality, step count, accuracy |

Additional panels (**Light**, **Audio**, **Drawing**) can be opened from the System Menu or their respective feature areas.

## Left Dock
The **left dock** is hidden by default. It opens when you activate specific panels — the **Camera Manager** and the **Engine** panel live here. These can also be floated or moved to the right dock.

## Formula Workshop
The **Formula Workshop** is a code editor for formulas. Open it via the formula dropdown in the Formula panel. It supports both native **GLSL** formulas and imported **Fragmentarium (.frag)** files.

## Timeline (Bottom)
Press **T** to show/hide the animation **Timeline**. Add tracks by right-clicking any parameter's animation icon in the panels.
`},"gs.formulas":{id:"gs.formulas",category:"Getting Started",title:"Choosing a Formula",parentId:"gs.welcome",content:`
The **formula** defines the mathematical shape of the fractal. GMT ships with over 40 built-in formulas.

## Switching Formulas
- Open the **Formula** panel (right dock) and use the dropdown to pick a formula.
- Formulas are grouped by type (classic, polyhedra, Julia variants, etc.)
- Many formulas include presets that configure parameters and scene settings together.

## Parameters A – F
Every formula exposes up to 6 named parameters (shown as **A, B, C, D, E, F** in the UI). These map to the formula's internal constants and dramatically change the shape.

- Drag sliders to explore the parameter space.
- Right-click any slider to reset it, copy its value, or jump to its help entry.

## Formula Workshop
The **Formula Workshop** lets you write or import custom formulas:
- Supports native **GLSL** shader formulas
- Supports **Fragmentarium (.frag)** files — imported and converted automatically
- Open it from the formula dropdown or the System Menu
`},"gs.saving":{id:"gs.saving",category:"Getting Started",title:"Saving & Sharing Your Work",parentId:"gs.welcome",content:`
## Save a Scene (.gmf)
**System Menu → Save Preset** saves a **.gmf** file containing everything: the formula, all parameters, camera position, lighting, animations. Load it back with **System Menu → Load Preset**.

## Smart PNG Snapshots
Click the **Camera Icon** in the Top Bar to take a snapshot. The image is a standard PNG, but the full scene state is invisibly embedded inside it.

- Share the PNG file directly (Discord, email, cloud storage) to let others load your exact scene.
- **Warning**: Social media platforms strip this metadata. The image will look fine but won't restore the scene.

## Share Links
The **System Menu** has a copy link option that encodes the current scene into a URL. Anyone with the link can open it in GMT.

- Formulas written in the Formula Workshop are **too large** for URL sharing — save as GMF instead.
- Very complex animations may have keyframes stripped automatically to fit within URL limits (a warning appears).

## Camera Slots
Save and recall up to 9 camera positions using keyboard shortcuts:
- **Ctrl + 1–9**: Save current camera view to slot 1–9 (creates slot if empty, overwrites if occupied)
- **1–9**: Instantly recall the camera saved in that slot

Camera slots are also visible and manageable in the **Camera Manager** panel (camera icon → Camera Manager). They are saved inside your scene file when you export.
`}},t={"general.undo":{id:"general.undo",category:"General",title:"Undo & History",content:`
The application uses **Three Separate History Stacks** to manage state.
This separation ensures that navigating the world doesn't undo your careful parameter tuning, and vice versa.

## 1. Parameter History (Global)
Tracks changes to sliders, colors, checkboxes, and formula settings.
- **Undo**: **Ctrl + Z**
- **Redo**: **Ctrl + Y**
- **Scope**: Any change made in the Control Deck (Formula, Light, Shading, etc).

## 2. Camera History (Navigation)
Tracks your movement in 3D space (Orbit and Fly modes).
- **Undo**: **Ctrl + Shift + Z**
- **Redo**: **Ctrl + Shift + Y**
- **Why?** Navigation generates thousands of micro-updates. Separating this prevents the "Parameter Undo" from getting clogged with camera moves.
- **UI Access**: You can also use the Undo/Redo buttons in the **Camera Menu** (Camera Icon in Top Bar).

## 3. Timeline History (Animation)
Tracks keyframes, tracks, and sequence data.
- **Undo**: **Ctrl + Z** (Context Sensitive)
- **Redo**: **Ctrl + Y** (Context Sensitive)
- **Context**: This stack is active when your mouse is hovering over the **Timeline Panel**. If you move the mouse away, Ctrl+Z reverts to Parameter Undo.
- **Fallback**: If the timeline undo stack is empty, Ctrl+Z will fall through to Parameter Undo even while hovering the timeline.
`},"general.shortcuts":{id:"general.shortcuts",category:"General",title:"Keyboard Shortcuts",content:`
## Navigation (Fly Mode)
- **W / S**: Move Forward / Backward
- **A / D**: Strafe Left / Right
- **Space**: Move Up (Ascend)
- **C**: Move Down (Descend)
- **Q / E**: Roll Camera Left / Right
- **Shift**: Speed Boost (4x)
- **Mouse Drag**: Look around (Steer)
- **Scroll**: Adjust Fly Speed

## Navigation (Orbit Mode)
- **Left Drag**: Rotate around target
- **Right Drag**: Pan camera
- **Scroll**: Zoom In / Out
- **Q / E**: Roll Camera

## History & Undo
- **Ctrl + Z**: Undo Parameter Change
- **Ctrl + Y**: Redo Parameter Change
- **Ctrl + Shift + Z**: Undo Camera Movement
- **Ctrl + Shift + Y**: Redo Camera Movement

## Camera Slots
- **Ctrl + 1 – Ctrl + 9**: Save current view as camera slot 1–9 (creates if empty, overwrites if occupied)
- **1 – 9**: Recall camera from slot 1–9
- Slots are displayed and manageable in the **Camera Manager** panel (Camera icon → Camera Manager)

## Tools & UI
- **Tab**: Toggle between Orbit and Fly camera modes
- **T**: Toggle Timeline Panel
- **H**: Toggle UI Hints (Tooltip overlay)
- **\` (Backtick)**: Toggle Advanced Mode (show/hide advanced controls)
- **B**: Toggle Broadcast Mode (clean feed — hides all UI overlays)
- **Esc**: Cancel Focus Picking / Close Menus / Deselect / **Exit Broadcast Mode** (important — Broadcast Mode hides all UI, so Esc is the way out!)
- **Space** (non-fly mode): Play / Pause animation

> **Note on Space in Fly Mode**: When the Timeline is open, Space only plays/pauses the animation if your mouse is hovering over the Timeline panel. Otherwise, Space is used for ascending in Fly Mode.
`},"general.disclaimer":{id:"general.disclaimer",category:"General",title:"Disclaimer & Terms",content:`
## Usage & Safety
This software is provided as-is for educational and creative purposes. Young users should have parental guidance when using internet-connected features.

## AI & Human Verification
This application was created through a collaboration between Artificial Intelligence and Human Engineering. 
While rigorous verification processes are in place:
- Both AI and Humans are fallible.
- The software may contain errors, bugs, or inaccuracies.
- Use at your own risk.
`},"general.files":{id:"general.files",category:"General",title:"File Import & Export",content:`
## GMF Files (.gmf) — Primary Save Format
GMT saves scenes as **.gmf** files (GPU Mandelbulb Format). These are human-readable text files containing both the formula shader code and the full scene state (camera, lighting, features, animations).
- **Save**: System Menu → Save Preset (saves as \`.gmf\`)
- **Load**: System Menu → Load Preset (opens a file picker)
- **Self-contained**: Imported/custom formulas are embedded in the file, so they work in any session
- **AI-editable**: The GLSL shader code is plain text with an API reference — LLMs can read and modify formulas directly

## Smart PNGs (Steganography)
When you save a **Snapshot** (via the Camera Icon in the Top Bar), the application embeds the full scene data (in GMF format) into the image metadata. On desktop, clicking the camera icon takes a snapshot directly.
- **Load**: Use System Menu → Load Preset and select the PNG file to restore the scene instantly.
- **Safety**: The visual image is standard PNG. The data is hidden in an \`iTXt\` chunk.
- **Warning**: Social media platforms (Twitter, Facebook, etc.) strip this metadata. Share the file directly (Discord, Drive, Email) to preserve the data.

## Shareable URLs
You can share your scene via the URL bar.
- **Copy Link**: Use the link icon in the System Menu, or the standalone link button in the Top Bar.
- **Imported formulas**: URL sharing is not available for Workshop-imported formulas (the shader code is too large for URLs). The tooltip will show "N/A (Imported)".
- **Limits**: Browsers have a URL limit (approx 4096 characters). If your scene is too complex (e.g., thousands of keyframes), the app will automatically **strip animation data** to generate a working link. A warning "(Anims Removed)" will appear.

## Legacy JSON (.json)
Older \`.json\` preset files can still be loaded for backward compatibility, but GMT no longer saves in this format.
`}},a={"formula.active":{id:"formula.active",category:"Formulas",title:"Active Formula",content:`
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
`},"panel.workshop":{id:"panel.workshop",category:"Formulas",title:"Formula Workshop",content:`
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
`},"formula.transform":{id:"formula.transform",category:"Formulas",title:"Local Rotation (Pre-Transform)",content:`
Rotates the coordinate system $(x,y,z)$ *before* the fractal formula is applied.

## Why use this?
- **Orientation**: Rotates the fractal object itself, rather than moving the camera around it. This is useful for aligning the fractal with lighting or fog.
- **Symmetry**: Changing the input rotation can drastically change the shape of box-folded fractals (like Amazing Box or Menger Sponge) because the folding planes are axis-aligned. Rotating the space causes the folds to cut at diagonal angles.
`}},o={"formula.mandelbulb":{id:"formula.mandelbulb",category:"Formulas",title:"Mandelbulb",parentId:"formula.active",content:`
## The Math
The Mandelbulb is a 3D analogue of the Mandelbrot set constructed using Spherical Coordinates.
The iteration maps a point $(x,y,z)$ to spherical $(r, 	heta, phi)$, powers it by $n$, and adds the constant $c$.
$$ v 	o v^n + c $$

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
`},"formula.appell":{id:"formula.appell",category:"Formulas",title:"Appell Spectral (Ghost)",parentId:"formula.active",content:`
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
`},"formula.mandelorus":{id:"formula.mandelorus",category:"Formulas",title:"Mandelorus (HyperTorus)",parentId:"formula.active",content:`
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
`},"formula.mandelbar3d":{id:"formula.mandelbar3d",category:"Formulas",title:"Mandelbar 3D (Tricorn)",parentId:"formula.active",content:`
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
`},"formula.mandelterrain":{id:"formula.mandelterrain",category:"Formulas",title:"Mandel Terrain",parentId:"formula.active",content:`
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
`},"formula.quaternion":{id:"formula.quaternion",category:"Formulas",title:"Quaternion Julia",parentId:"formula.active",content:`
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
`},"formula.amazingbox":{id:"formula.amazingbox",category:"Formulas",title:"Amazing Box (Mandelbox)",parentId:"formula.active",content:`
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
`},"formula.marblemarcher":{id:"formula.marblemarcher",category:"Formulas",title:"Marble Marcher",parentId:"formula.active",content:`
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
`},"formula.mengersponge":{id:"formula.mengersponge",category:"Formulas",title:"Menger Sponge",parentId:"formula.active",content:`
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
`},"formula.kleinian":{id:"formula.kleinian",category:"Formulas",title:"Kleinian",parentId:"formula.active",content:`
## The Math
Based on Kleinian groups and Limit Sets. It utilizes **Inversion in a Sphere** as its primary operation.
The formula repeats: Box Fold $	o$ Sphere Inversion $	o$ Scale $	o$ Shift.

**Reference:** [Wikipedia: Kleinian Group](https://en.wikipedia.org/wiki/Kleinian_group)
**Credits:** Named after **Felix Klein**.

## Parameters
- **Param A (Scale)**: Controls the size of the spheres.
- **Param B (X Offset)**: Shifts the structure horizontally.
- **Param C (Fold Size)**: Limit of the initial box fold.
- **Param D (K Factor)**: Controls the strength of the spherical inversion.

## Visuals
Resembles organic structures: coral reefs, sponge tissues, or jewelry. It lacks the hard edges of the Mandelbox.
`},"formula.pseudokleinian":{id:"formula.pseudokleinian",category:"Formulas",title:"Pseudo Kleinian",parentId:"formula.active",content:`
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
`},"formula.pseudokleinian06":{id:"formula.pseudokleinian06",category:"Formulas",title:"Pseudo Kleinian 06",parentId:"formula.active",content:`
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
`},"formula.dodecahedron":{id:"formula.dodecahedron",category:"Formulas",title:"Dodecahedron",parentId:"formula.active",content:`
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
`},"formula.amazingsurface":{id:"formula.amazingsurface",category:"Formulas",title:"Amazing Surface",parentId:"formula.active",content:`
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
`},"formula.phoenix":{id:"formula.phoenix",category:"Formulas",title:"Phoenix 3D",parentId:"formula.active",content:`
## The Math
A 3D generalization of the Phoenix set. Unlike Julia sets which depend only on $z_n$, Phoenix depends on the *previous* iteration $z_{n-1}$.
$$ z_n = z_{n-1}^p + c + K cdot z_{n-2} $$

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
`},"formula.buffalo":{id:"formula.buffalo",category:"Formulas",title:"Buffalo 3D",parentId:"formula.active",content:`
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
`},"formula.mixpinski":{id:"formula.mixpinski",category:"Formulas",title:"MixPinski",parentId:"formula.active",content:`
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
`},"formula.sierpinskitetrahedron":{id:"formula.sierpinskitetrahedron",category:"Formulas",title:"Sierpinski Tetrahedron",parentId:"formula.active",content:`
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
`},"formula.amazingsurf":{id:"formula.amazingsurf",category:"Formulas",title:"Amazing Surf",parentId:"formula.active",content:`
## The Math
A variation of the Amazing Box discovered by **Kali**. It adds a sinusoidal wave function to the iteration, creating organic, flowing forms.
$$ z 	o 	ext{Fold}(z) + sin(z) $$

**Credits:** Discovered by **Kali** (Fractal Forums).

## Parameters
- **Scale**: Box scale.
- **Min Radius**: Sphere fold radius.
- **Wave Freq**: Frequency of the sine waves.
- **Wave Amp**: Amplitude (height) of the sine waves.
- **Transform**: A three-axis control — X is Wave Twist (twists the wave direction), Y is Vertical Shift (shifts the waves up/down), and Z is available for additional effects.

## Visuals
Creates structures that look like melting machinery, flowing liquid metal, or alien biomechanical surfaces.
`},"formula.boxbulb":{id:"formula.boxbulb",category:"Formulas",title:"Box Bulb",parentId:"formula.active",content:`
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
`},"formula.mengeradvanced":{id:"formula.mengeradvanced",category:"Formulas",title:"Menger Advanced",parentId:"formula.active",content:`
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
`},"formula.bristorbrot":{id:"formula.bristorbrot",category:"Formulas",title:"Bristorbrot",parentId:"formula.active",content:`
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
`},"formula.makinbrot":{id:"formula.makinbrot",category:"Formulas",title:"Makin Brot",parentId:"formula.active",content:`
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
`},"formula.tetrabrot":{id:"formula.tetrabrot",category:"Formulas",title:"Tetrabrot",parentId:"formula.active",content:`
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
`},"formula.modular":{id:"formula.modular",category:"Formulas",title:"Modular Builder",parentId:"formula.active",content:`
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
3. Connect **Input (Z)** $	o$ **Nodes** $	o$ **Output (Distance)**.
4. Bind node parameters to global sliders (Param A-F) to animate them.
`},"formula.juliamorph":{id:"formula.juliamorph",category:"Formulas",title:"Julia Morph",parentId:"formula.active",content:`
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
`},"formula.borromean":{id:"formula.borromean",category:"Formulas",title:"Borromean (Cyclic)",parentId:"formula.active",content:`
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
`},"formula.kalibox":{id:"formula.kalibox",category:"Formulas",title:"Kali Box",parentId:"formula.active",content:`
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
`},"formula.mandelmap":{id:"formula.mandelmap",category:"Formulas",title:"MandelMap (Unrolled)",parentId:"formula.active",content:`
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
`},"formula.mandelbolic":{id:"formula.mandelbolic",category:"Formulas",title:"MandelBolic",parentId:"formula.active",content:`
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
`},"formula.claude":{id:"formula.claude",category:"Formulas",title:"Claude",parentId:"formula.active",content:`
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
`},"formula.rhombicdodecahedron":{id:"formula.rhombicdodecahedron",category:"Formulas",title:"Rhombic Dodecahedron",parentId:"formula.active",content:`
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
`},"formula.rhombictriacontahedron":{id:"formula.rhombictriacontahedron",category:"Formulas",title:"Rhombic Triacontahedron",parentId:"formula.active",content:`
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
`},"formula.coxeter":{id:"formula.coxeter",category:"Formulas",title:"Coxeter",parentId:"formula.active",content:`
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
`},"formula.cuboctahedron":{id:"formula.cuboctahedron",category:"Formulas",title:"Cuboctahedron",parentId:"formula.active",content:`
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
`},"formula.greatstellateddodecahedron":{id:"formula.greatstellateddodecahedron",category:"Formulas",title:"Great Stellated Dodecahedron",parentId:"formula.active",content:`
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
`}},i={"panel.formula":{id:"panel.formula",category:"Parameters",title:"Formula Parameters",content:`
This panel controls the mathematical equation that defines the fractal's shape.

## How Fractals Work (The Basics)
Fractals are generated by a **Feedback Loop**. We take a point in space ($z$), apply a formula to it, and feed the result back into the formula. We do this many times.
- If the point stays close to the center, it is "solid" (inside the fractal).
- If it shoots off to infinity, it is "empty space".

## Parameters (A-F)
The sliders **Param A** through **Param F** change the constants used in that formula. 
Because every formula is different, these parameters do different things depending on which fractal you have selected.
- **Param A** is usually the most important (Power, Scale, or Size).
- Check the **Help Library** for the specific formula (e.g. "Mandelbulb") to see exactly what each parameter does.

## Iterations
Controls how many times the loop runs.
- **Low (4-8)**: The shape looks smooth, blobby, or simple.
- **High (16-30)**: Fine details, recursive branches, and complex textures emerge.
- **Warning**: Higher iterations take more computing power.

## ⚡ Quick Edit Hotkeys
You can adjust parameters without opening the panel!
1. Hover your mouse over the 3D viewport.
2. Press keys **1, 2, 3, 4, 5, or 6**.
3. A popup slider will appear at your mouse cursor for Param A (1) through Param F (6).
`},"hybrid.mode":{id:"hybrid.mode",category:"Formulas",title:"Hybrid Mode (Box Fold)",content:`
Injects a "Mandelbox" cage around the active fractal.

## Modes
The engine has two different ways of calculating hybrids.

### 1. Standard (Fast Path)
This is the default mode. It runs a fixed loop of Box Folds *before* the main fractal iterations.
- **Performance**: Extremely fast. Zero compilation time.
- **Visual**: Creates a "Cage" or "Frame" around the fractal.
- **Limitations**: Cannot interleave folds (e.g., Box -> Bulb -> Box -> Bulb).

### 2. Advanced Mixing (Complex Path)
Click the **Lock Icon** to enable this.
This mode merges the Box Fold logic into the main iteration loop, allowing for complex **Alternating Formulas**.
- **Capabilities**: Enables **Box Skip** (interleaving) and **Swap Order**.
- **Warning**: Requires a complex shader recompilation. Toggling this on/off takes 30-60 seconds.

## Parameters
- **Box Iterations**: How many times to apply the Box Fold.
- **Scale**: The density of the box frame.
- **Min/Fixed Radius**: Controls the spherical inversion void in the center of the box.
- **Box Skip (Advanced)**: The interval between folds.
    - *Consecutive*: Box, Box, Box, Main...
    - *Every 2nd*: Box, Main, Box, Main... (Interleaved).
- **Swap Order (Advanced)**: Changes whether the Box Fold or Main Formula runs first in the loop.
`},"julia.mode":{id:"julia.mode",category:"Formulas",title:"Julia Mode",content:`
Unlocks the 4D parameter space of the fractal.

**Reference:** [Wikipedia: Julia Set](https://en.wikipedia.org/wiki/Julia_set)
**Credits:** Named after **Gaston Julia**.

## Mandelbrot vs. Julia
-   **Mandelbrot (Default)**: Each pixel represents a different *parameter* $C$. The shape is a map of "behavior". It shows where the formula explodes vs where it stays stable.
-   **Julia (Enabled)**: $C$ is fixed for the entire image (controlled by the **Julia X/Y/Z** sliders). Each pixel represents a different *starting position* $z_0$.

## Usage
1.  Enable **Julia Mode**.
2.  The shape will change significantly.
3.  Adjust **Julia X/Y/Z** sliders. You are now "morphing" the fractal.
4.  Effectively, the "Mandelbrot" shape acts as a map. If you set the Julia coordinates to a point that looks cool on the Mandelbrot map, you will explore the 3D structure of that specific coordinate.

## Animation
Animating the Julia coordinates is the best way to create "shapeshifting" organic motion loops.
`},"lfo.system":{id:"lfo.system",category:"Animation",title:"LFO Modulators",content:`
**Low Frequency Oscillators** allow you to animate parameters automatically over time.

## Usage
1. Click **+** to add an LFO.
2. Select a **Target** (e.g., Param A).
3. Choose a **Shape** (Sine, Sawtooth, Noise).
4. Adjust **Period** (Speed) and **Amplitude** (Strength).

The slider for the target parameter will show a **purple indicator line** on the slider track, showing the current modulated value in real time.
`}},r={"ui.controls":{id:"ui.controls",category:"UI",title:"Control Deck",content:`
The Control Deck is your primary interface for manipulating the fractal.

## Docking System
The deck is designed to be flexible for multi-monitor or large screen workflows.
- **Undocking**: Click the **Undock Icon** (Square with arrow) next to a tab name to detach it into a floating window.
- **Redocking**: Close the floating window to return it to the main deck.
- **Minimizing**: Click the chevron arrow in the header to collapse the panel to the side/bottom.

## Tabs
- **Formula**: Shape structure, iterations, and core math parameters.
- **Scene**: Camera, Navigation, Fog, and Depth of Field.
- **Light** (Advanced Mode): Lighting studio (3 lights) and shadows.
- **Shader**: Surface material (PBR), Glow, and Ambient Occlusion.
- **Gradient**: Color palettes and texturing.
- **Quality**: Performance tuning, Anti-aliasing, and Resolution.
- **Engine** (Advanced Mode): Compile-time settings that require shader recompilation.
- **Audio** (when enabled): Audio-reactive parameters.
- **Drawing** (when enabled): Measurement and annotation tools.
- **Camera Manager**: Camera presets, saved views, and composition guides.
- **Graph** (Modular Mode): The node-based formula builder.
`},"ui.viewport":{id:"ui.viewport",category:"UI",title:"Viewport Interaction",content:`
The main view displays the fractal in real-time.

## Render Region
Click the **Crop Icon** to enter region selection mode, then drag to define an area. Only pixels inside the region accumulate new samples — the rest keep their existing image. The region overlay shows live sample count, convergence status, and pixel dimensions.

- **Move**: Drag inside the box.
- **Resize**: Hover to reveal handles on edges and corners, then drag.
- **Sample Cap**: Click ⟳ on the overlay to cycle through common caps (∞/64/128/256/...).
- **Clear**: Click ✕ on the overlay header or click the crop icon again.

## Focus Picking (DOF)
To set the **Depth of Field** focal plane exactly on a subject:
1. Go to the **Scene** tab.
2. Click **Pick Focus**.
3. Click anywhere on the fractal surface in the viewport.
The camera lens will focus perfectly on that point, blurring foreground and background elements based on the **Aperture** setting.

## Light Gizmos
When the **Light Panel** is open or "Show 3d helpers" is enabled:
- Each light appears as a 3D gizmo with colored axis lines (X=red, Y=green, Z=blue), colored planes, and a center dot filled with the light's color.
- **Drag** the gizmo to reposition the light directly in 3D space.
- **Click the Anchor Icon** below the gizmo to toggle between **Headlamp** (light moves with the camera) and **World** (light stays fixed in the scene) modes.
`},"ui.colorpicker":{id:"ui.colorpicker",category:"UI",title:"Color Picker",content:`
The application uses a compact, high-precision **HSV Slider** system.

## Usage
- **Hue (H)**: Top bar. Shows the spectrum of colors.
- **Saturation (S)**: Middle bar. Intensity of color (Left=White, Right=Vivid).
- **Value (V)**: Bottom bar. Brightness (Left=Black, Right=Bright).

## Context Menu
**Click** or **Right-click** the color swatch (square on the left) to access:
- **Copy/Paste**: Transfer hex codes between pickers.
- **History**: Quickly revert to recently used colors.
- **Quick Picks**: Pure White/Black shortcuts.
`},"ui.gradient_editor":{id:"ui.gradient_editor",category:"UI",title:"Gradient Editor",content:`
A spline-based color ramp editor used for surface coloring.

## Interaction
- **Add Knot**: Click anywhere on the bottom track. In **Step** mode, new knots inherit the held color instead of interpolating.
- **Move Knot**: Drag a knot left/right.
- **Remove Knot**: Drag a knot away from the track or press Delete.
- **Select Multiple**: Drag a selection box or **Shift+Click** knots.
- **Duplicate Knot**: **Ctrl+Drag** a knot to duplicate it.
- **Bias**: Drag the diamond handle between knots to shift the interpolation midpoint. Hidden in **Step** mode (no effect).

## Interpolation Modes
Each knot controls how color transitions to the next knot:
- **Linear**: Straight RGB blend (default).
- **Step**: Hard color switch at the next knot boundary — no blending.
- **Smooth**: Smoothstep easing (ease-in/ease-out).

## Multi-Selection
Select 2+ knots to reveal **bracket handles**:
- **Drag the selection area** to move all selected knots together.
- **Drag the [ ] brackets** on either side to scale/compress the selection. Dragging a bracket past the opposite side inverts the knot order.
- **Ctrl+Drag the selection area** to duplicate the selected knots.

## Presets
Click the **Presets** button (top-right) to load predefined gradients, or Copy/Paste gradients as JSON.

## Context Menu
Right-click the track to:
- **Distribute**: Evenly space selected knots.
- **Invert**: Flip the gradient.
- **Double Knots**: Increase resolution.
- **Bias Handles**: Toggle visibility of bias diamond handles.
- **Reset Default**: Restore the gradient to its default state.
- **Delete Selected**: Remove all currently selected knots.
- **Output Mode**: Switch color space (sRGB, Linear, Inverse ACES).
`},"ui.histogram":{id:"ui.histogram",category:"UI",title:"Histogram & Auto-Levels",content:`
The Histogram visualizes the distribution of values across the fractal surface.

## Why is it useful?
Fractal coloring is based on mapping a value (like Orbit Trap distance) to a gradient.
If the mapping range doesn't match the actual values in the fractal, the image will look flat (all one color) or washed out.

## Controls
- **Graph**: Shows frequency of values. Tall bars mean "lots of pixels have this value".
- **Range Handles**: Drag the left/right handles to define the start/end of the gradient.
- **Auto**: Automatically analyzes the frame and sets the range to cover the most interesting data (ignoring background noise).
- **Refresh**: Manually re-scan the frame (useful if Auto is off to save performance).
`},"ui.slider":{id:"ui.slider",category:"UI",title:"Precision Sliders",content:`
All numeric inputs in the application use **Precision Draggable Sliders**.

## Interaction
- **Drag Number**: Click and hold the number display text to adjust the value. This allows values to extend beyond the visual slider's min/max limits.
- **Shift + Drag Number**: **10x Speed**. Useful for large adjustments.
- **Alt + Drag Number**: **0.1x Precision**. Useful for fine-tuning.
- **Click Number**: Switch to typing mode to enter exact values.
- **Reset**: Hover over the right edge of the slider track to reveal a hidden reset button (restores default value).

## Keyframing
If the Timeline is open and recording, changing a slider will automatically create a keyframe.
Sliders with active animations (LFO or Keyframes) will show a **Key Icon** or Highlight color.
`},"ui.vector":{id:"ui.vector",category:"UI",title:"Vector3 & Vector2 Controls",content:`
Multi-axis numeric controls for position, rotation, and transformation parameters.

## Translation Mode (Default)
Standard X, Y, Z (or X, Y) axis controls.
- **Axis Labels**: X (red), Y (green), Z (blue)
- **Drag**: Adjust individual axis values
- **Double-click Label**: Reset that axis to its default value

## Rotation Mode
Automatically activated for rotation parameters (detected by "rot" in the name).
Displays a **Heliotrope** direction visualizer alongside the numeric inputs.

### Heliotrope (Direction Visualizer)
The circular widget shows the rotation direction in 3D space.
- **Center Dot**: Points toward the camera (forward)
- **Arrow**: Shows the direction the rotation is pointing
- **Boundary Ring**: Represents 90° from center
- **Drag**: Change azimuth (horizontal) and pitch (vertical)
- **Shift + Drag**: Constrain to single axis
- **Alt + Drag**: High precision mode
- **Double-click**: Reset both angles to 0

### Rotation Axes (A, P, ∠)
- **A (Azimuth)**: Horizontal rotation angle (-π to +π)
- **P (Pitch)**: Vertical tilt angle (-π/2 to +π/2)
- **∠ (Angle)**: Additional rotation around the direction vector (vec3 only)

### Unit Display
- **Right-click** the control to toggle between Degrees (°) and Radians (π)
- Display shows 1 decimal, text input accepts up to 6 decimals
- In π mode, type values like "0.5π" or "90°"
`},"panel.drawing":{id:"panel.drawing",category:"UI",title:"Measurement & Drawing",content:`
Tools for annotated screenshots, measurements, and composition planning.

## Tools
- **Rectangle / Circle**: Select a shape type.
- **Origin Modes**:
  - **Global Zero**: Draws on the world plane $(0,0,0)$.
  - **Surface Probe**: Draws on a plane perpendicular to the camera at the exact distance of the fractal surface (like a 3D cursor).

## Keyboard Modifiers
- **Drag**: Draw shape corner-to-corner.
- **Hold Alt**: Draw from Center outward.
- **Hold Shift**: Constrain to 1:1 ratio (Perfect Square/Circle).
- **Hold X**: Snap plane to nearest World Axis (Front/Top/Side).
- **Hold Space**: Move the starting anchor point while drawing.
`},"panel.webcam":{id:"panel.webcam",category:"UI",title:"Webcam Overlay",content:`
> **REQUIRES ADVANCED MODE**

Overlays a live webcam feed on top of the viewport. Useful for recording tutorials, live streaming, or picture-in-picture compositions.

## Features
- **Drag & Resize**: Move and resize the webcam window directly in the viewport.
- **Crop**: Drag the edge handles to crop the feed.
- **Blend Modes**: Normal, Screen, Overlay, Lighten, Difference.
- **Opacity**: 0-3x range (values above 1 boost brightness).
- **3D Tilt**: Applies perspective rotation for a dynamic look.
- **CRT Scanlines**: Retro scanline effect overlay.

## Input Visualization
When enabled, also displays an overlay showing currently pressed keys (WASD, modifiers, mouse buttons, scroll) with fade animations. Useful for tutorials.
`},"panel.camera_manager":{id:"panel.camera_manager",category:"UI",title:"Camera Manager",content:`
Manage camera positions, presets, and composition guides.

## Quick Views
Preset buttons for standard views: **Front, Back, Left, Right, Top, Bottom, Isometric**. Click to teleport the camera instantly.

## Saved Cameras
- **Save**: Click "New Camera" to bookmark the current position and rotation.
- **Restore**: Click a saved camera to teleport back.
- **Rename**: Double-click the camera label.
- **Delete**: Click the X button on a saved camera.

## Composition Guides
Overlay guides for framing your shots:
- **Rule of Thirds** / **Golden Ratio** / **Grid** / **Center Mark** / **Diagonal** / **Spiral** / **Safe Areas**
- Customizable opacity, line width, and color.
- Spiral mode includes rotation, position, scale, and ratio controls.
`},"ui.resolution":{id:"ui.resolution",category:"UI",title:"Resolution Controls",content:`
When in **Fixed Resolution** mode, an overlay appears in the top-left of the viewport.

- **Click Label**: Open a dropdown of common presets (Social Media, 4K, etc.).
- **Drag Label**: Interactively scale the resolution width/height.
- **Fill Button**: Instantly switch back to "Full Screen" mode.
`},"panel.engine":{id:"panel.engine",category:"UI",title:"Engine Settings",content:`
The Engine panel controls compile-time shader features — settings that require rebuilding the GPU program before they take effect. It is available in **Advanced Mode** (toggle via System Menu or the \` key).

## How It Works
Unlike most sliders (which update instantly), changes here are **queued** and applied together when you click **Apply**. The shader then recompiles, which takes a few seconds depending on the features enabled.

- **Green dot** = currently compiled into the shader.
- **Yellow dot** = change is pending (waiting for you to click Apply).
- **Blue dot** = updates instantly (no recompile needed).

## Viewport Quality
For quick quality switching, use the **Viewport Quality** dropdown in the top bar. It provides master presets (Preview, Fastest, Lite, Balanced, Full, Ultra) and per-subsystem tier controls without needing the full Engine panel.

## Estimated Compile Time
The bottom bar shows the estimated compile time for the current configuration. Complex setups (raymarched reflections + bounce shadows + volumetrics) can take 15 seconds or more.

## Who Is This For?
This panel is for advanced users who want fine control over individual compile-time shader features beyond what the Viewport Quality dropdown offers.
`},"ui.performance":{id:"ui.performance",category:"UI",title:"Performance Monitor",content:`
The system automatically detects sustained low framerates.

- **Low FPS Warning**: Appears if the renderer struggles to maintain a usable frame rate.
- **Suggestion Buttons**: One or more actions are offered depending on the situation — **Adaptive Resolution** (auto-adjusts resolution to target FPS), **Reset Scale**, **Reduce Quality**, or **Reduce Resolution** (reduces internal resolution by ~33%).
- **Firefox Note**: On Firefox, a note explains that OffscreenCanvas has a known rendering overhead that reduces frame rate. This is a browser platform limitation, not a bug in GMT.
- **Dismiss**: Ignores the warning for this session.
`}},n={"ui.timeline":{id:"ui.timeline",category:"Timeline",title:"Animation Timeline",content:`
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
`},"anim.transport":{id:"anim.transport",category:"Timeline",title:"Transport & Recording",parentId:"ui.timeline",content:`
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
`},"anim.tracks":{id:"anim.tracks",category:"Timeline",title:"Tracks",parentId:"ui.timeline",content:`
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
`},"anim.keyframes":{id:"anim.keyframes",category:"Timeline",title:"Keyframes & Interpolation",parentId:"ui.timeline",content:`
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
`},"anim.graph":{id:"anim.graph",category:"Timeline",title:"Graph Editor (Curves)",parentId:"ui.timeline",content:`
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
`},"anim.camera":{id:"anim.camera",category:"Animation",title:"Camera Animation",content:`
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
`},"lfo.system":{id:"lfo.system",category:"Timeline",title:"LFO Modulators",parentId:"ui.timeline",content:`
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
`},"export.video":{id:"export.video",category:"Timeline",title:"Video Export",content:`
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
`}},s={"panel.light":{id:"panel.light",category:"Lighting",title:"Light Studio",content:`
The engine utilizes a sophisticated **Physically Based Rendering (PBR)** approximation to simulate how light interacts with the infinite surfaces of the fractal.

## Light Types
- **Point**: Standard light source. Has position and falloff.
- **Directional (Sun)**: Parallel rays from infinity. Has rotation only. No falloff.

## Top Bar Interaction
- **Light Orbs**: Click an orb to toggle that light on/off.
- **Hover Popup**: Hover over any orb to open its settings popup — Power, Range, Color/Temperature, Cast Shadows, and a direction control for Sun lights.
- **Anchor Icon**: In the popup header, the anchor icon toggles between **World** (cyan) and **Headlamp** (orange) mode. See *Attachment Mode* below.
- **☰ Menu**: Opens options for Light Type, Intensity Unit, Falloff Curve, Duplicate, and Delete.
- **Right-click**: Opens the quick context menu (same options as ☰, plus a help section).
- **Drag & Drop**: Drag a light orb onto the 3D viewport to place it near the visible surface. Automatically enables shadows and gizmos on drop.
- **Expand (↓)**: The small chevron at the right of the light orbs expands the studio to show all 8 light slots.

## Lights
You can enable up to **8 independent light sources** to sculpt the 3D form. The default setup uses a classic 3-point arrangement:
- **Light 1 (Key)**: The primary illumination.
- **Light 2 (Fill)**: Usually placed opposite the Key light. Use a lower intensity and a cool color.
- **Light 3 (Rim)**: Placed behind the object. Creates a glowing outline.

You can add more lights beyond these three for complex multi-light setups.

## Gizmos
When **Show 3D helpers** is enabled (in the Advanced Light panel), Point lights appear as draggable glowing sprites in the viewport with X/Y/Z axis handles.
`},"light.type":{id:"light.type",category:"Lighting",title:"Light Type (Point vs Sun)",parentId:"panel.light",content:`
### Point Light
Emits light from a specific point in space radiating outwards.
- **Position**: X, Y, Z coordinates define the origin.
- **Falloff**: Light gets dimmer with distance (Inverse Square Law).
- **Shadows**: Perspective shadows that grow larger/softer with distance from the object.
- **Visible Sphere**: Optionally adds a glowing sphere at the light's position in the scene. You can control its radius and edge softness for a sharp or hazy look.

### Directional Light (Sun)
Emits parallel light rays from infinity.
- **Position**: Irrelevant. Only **Rotation** matters.
- **Falloff**: Disabled (Infinite range). The light creates a constant wall of illumination.
- **Shadows**: Orthographic (Parallel) shadows. Ideally suited for "Sunlight" effects.
- **Visuals**: Indicated by a Sun icon (Rayed Circle) in the top bar.
`},"light.rot":{id:"light.rot",category:"Lighting",title:"Heliotrope (Direction)",parentId:"panel.light",content:`
The **Heliotrope** is a specialized control for setting the angle of Directional (Sun) lights. It maps the 3D sky dome onto a 2D circle.

### How to use
- **Center**: Light comes from directly "Forward" (relative to Camera or World, depending on Mode).
- **Edge**: Light comes from the Horizon (90 degrees).
- **Drag Dot**: Sets the specific angle.

### Parameters
- **Pitch**: Elevation angle (Up/Down). 90° is directly overhead.
- **Yaw**: Compass angle (North/South/East/West).

### Backlighting
If the dot enters the "Backlight Zone" (indicated by red/warning colors), the light is shining from *behind* the target. This creates Rim Lighting but leaves the front face dark.
`},"light.intensity":{id:"light.intensity",category:"Lighting",title:"Light Intensity & Color",parentId:"panel.light",content:`
## Intensity
Controls the energy output of the light source.
- **0.0**: Light is off.
- **1.0**: Standard physical brightness.
- **> 2.0**: High energy. Can cause **Bloom/Glow** artifacts if the surface becomes brighter than 1.0 (pure white).

### Intensity Units
You can choose between two intensity modes:
- **Raw**: A simple multiplier (the default). Good for quick adjustments.
- **Exposure (EV)**: Uses a photographic exposure scale from **-4 to +10 EV**. Each step doubles or halves the brightness. Great when you want precise, predictable control — especially for balancing multiple lights.

**Keyframable**: Yes. Use the diamond icon in the popup menu.

## Color
Light color interacts with the **Surface Material** color via multiplication.
- A **Red Light** on a **White Surface** looks Red.
- A **Red Light** on a **Blue Surface** looks Black (physics correct).
- **Tip**: Use saturation sparingly. Pale lights often look more realistic than deep, saturated lights.

### Color Temperature Mode
Instead of picking a color manually, you can switch to **Color Temperature** mode and use a Kelvin slider (**1000 K – 10000 K**).
- **Low values (1000–3000 K)**: Warm candlelight / golden hour tones.
- **Mid values (5000–6500 K)**: Neutral daylight.
- **High values (8000–10000 K)**: Cool, overcast / blue-sky tones.

This is a quick way to get natural-looking light colors without fiddling with the color picker.
`},"light.mode":{id:"light.mode",category:"Lighting",title:"Attachment Mode (Headlamp vs World)",parentId:"panel.light",content:`
Every light can be anchored in two different coordinate spaces. Toggle between them using the **anchor icon** in the top-left of the light's popup (or the Attachment Mode toggle in the Advanced Light panel).

- **Cyan anchor icon** = World anchored. Click to switch to Headlamp.
- **Orange crossed-anchor icon** = Attached to Camera (Headlamp). Click to switch to World.

When switching modes the light's position is automatically converted so it stays in the same visual location.

### Headlamp (Camera-attached)
The light is parented to the **Camera**.
- **Behavior**: Moves with you as you fly.
- **Coordinates**: $(0,0,0)$ places the light exactly at the camera lens.
- **Use Case**: Flashlights, exploration, ensuring a surface is always lit while navigating.

### World (Scene-anchored)
The light is parented to the **Fractal Universe**.
- **Behavior**: The light exists at a fixed coordinate. You can fly past it, orbit around it, or leave it behind.
- **Use Case**: Suns, glowing artifacts, establishing a "sense of place" in a scene.
- **Note**: If you reset the camera position, World lights might end up far away. Enable **Show 3D helpers** to locate them via their gizmo.
`},"light.falloff":{id:"light.falloff",category:"Lighting",title:"Falloff (Inverse Square Law)",parentId:"panel.light",content:`
In the real world, light creates a sphere of influence that decays over distance. This setting controls that decay curve.
*Note: This setting is ignored for Directional Lights.*

### Falloff Type
- **Quadratic ($1/d^2$)**: Physically accurate. Light is blindingly bright near the source but fades very quickly. Use this for realistic lamps or fires.
- **Linear ($1/d$)**: Artificial decay. Light travels much further before fading. Useful for abstract scenes where you want to illuminate deep structures without over-exposing the foreground.

### Range
- **0.0**: **Infinite reach**. The light does not decay. It shines with equal intensity at distance $0$ and distance $1,000,000$.
- **> 0.0**: The distance at which the light intensity fades to near-zero. Higher values mean the light reaches **further** before fading out — a larger sphere of influence.

**Keyframable**: Yes. Use the diamond icon.
`},shadows:{id:"shadows",category:"Lighting",title:"Raymarched Soft Shadows",parentId:"panel.light",content:`
Shadows are essential for depth perception. Without them, it is impossible to tell if a structure is floating or attached.
Each light has its own **Cast Shadow** checkbox, so you can choose exactly which lights produce shadows.

## The Tech: SDF Shadows
We do not use Shadow Maps (rasterization) or BVH Raytracing. We march a ray from the surface *towards* the light.

## Parameters
- **Softness**: Simulates the **Size** of the light source (Area Light). Uses a logarithmic scale.
  - **Low (2–10)**: Pin-point light source. Sharp, hard shadows.
  - **Medium (50–200)**: Moderate-sized light. Visible penumbra.
  - **High (500–2000)**: Very large area light. Extremely soft, diffuse shadows.
- **Intensity**: The opacity of the shadow. Lower this to simulate ambient light filling in the dark spots.
- **Bias**: **Critical Setting**.
  - Pushes the shadow start point away from the surface.
  - **Too Low**: "Shadow Acne" (Black noise/speckles on the surface).
  - **Too High**: "Peter Panning" (Shadow detaches from the object).

## Stochastic Shadows / Area Lights
This is a **compile-time feature** — you need to enable it in the shadow settings, which triggers a shader recompilation. Once enabled, the engine uses randomised sampling to produce realistic area-light shadows.

### Shadow Quality Levels
- **Hard Only**: Traditional sharp shadows with no stochastic sampling. Fastest.
- **Lite Soft**: A lighter stochastic pass — good balance of quality and speed.
- **Robust Soft**: Full stochastic sampling for the highest-quality soft shadows.

### How it looks
- Shadows may appear noisy or grainy while the camera is moving.
- They converge to a clean, high-quality result when the camera stops (via Temporal Accumulation).
- This technique is essential for accurate shadowing on complex sponge/box fractals where traditional methods fail.
`},"light.pos":{id:"light.pos",category:"Lighting",title:"Light Positioning",parentId:"panel.light",content:`
> **REQUIRES ADVANCED MODE**

Precise coordinate control for lights. 
- **Headlamp Mode**: Coordinates are relative to the camera view.
- **World Mode**: Coordinates are absolute in the fractal universe.

**Keyframing**: Use the **Key Icon** in the top bar popup to keyframe the X, Y, and Z coordinates simultaneously.
`}},l={"panel.render":{id:"panel.render",category:"Rendering",title:"Shading & Materials",content:`
Controls the surface properties (PBR) and lighting response of the fractal.
`},"panel.quality":{id:"panel.quality",category:"Rendering",title:"Quality & Performance",content:`
Managing performance is a trade-off between speed and accuracy.

## Core Settings
- **Ray Detail**: Multiplies the epsilon (precision). Lower = Faster but "blobbier". Higher = Sharper but slower.
- **Max Steps** (Advanced): Hard limit on ray calculation. Increase if distant objects are getting cut off (black void).
- **Internal Scale**: Renders at a lower resolution and upscales.
  - **0.5x**: Great for editing/animation. 
  - **1.0x**: Native crispness.
  - **2.0x**: Super-sampling (very slow).
`},"render.engine":{id:"render.engine",category:"Rendering",title:"Render Engine Mode",parentId:"panel.quality",content:`
Switches the fundamental light transport algorithm.

### Direct (Fast)
Standard Raymarching with direct lighting.
- **Fast**: Up to 60FPS on decent GPUs.
- **Features**: Shadows, AO, Fog.
- **Best for**: Exploration, Animation, Real-time usage.

### Path Tracer (GI)
Physically based Monte-Carlo Path Tracing.
- **Slow**: Requires accumulation (image starts noisy and clears up).
- **Features**: Global Illumination (Bounce Light), Emissive Lighting, Soft Area Shadows.
- **Best for**: High-quality still images and photorealistic renders.
`},"pt.global":{id:"pt.global",category:"Rendering",title:"Path Tracer Globals",parentId:"panel.render",content:`
Settings specific to the Path Tracing engine.

- **Bounces**: Number of times light reflects. Higher = brighter interiors but slower render.
- **GI Strength**: Artificial multiplier for bounce light.
- **Stochastic Shadows**: If enabled, treats lights as physical spheres (Area Lights) rather than points. Shadows become softer with distance. Requires accumulation to look smooth.
`},"bucket.render":{id:"bucket.render",category:"Rendering",title:"High Quality Render",parentId:"panel.quality",content:`
Render images at arbitrary resolutions — far beyond what the GPU can draw in a single frame — by rendering in small internal tiles (GPU buckets) and accumulating samples per tile until noise-free. Optionally split the output into a grid of separate PNG files for massive prints.

## Actions
- **Refine**: renders the current viewport at viewport resolution until converged, then holds the cleaned-up frame on screen until you move the camera or change a parameter. Use when you want a clean still of what you're currently looking at.
- **Preview**: click a spot on the canvas to zoom into that area at export pixel density. You stay fully interactive — move sliders, adjust lights, change colors — and the preview re-renders live. See the *Preview Region* section below.
- **Export**: renders at the configured Output Size and saves PNG(s) to disk. With a tile grid > 1×1, each tile saves as its own file. The button shows the file count when tiling is active (e.g. *Export 4×*).

## Quality Settings
- **Convergence Threshold** (default 0.25%): how similar consecutive frames must be before a tile is considered "done". Lower = more samples, higher quality. 0.1% = production, 1% = fast preview.
- **Max Samples / Bucket** (default 64): safety cap so difficult tiles don't accumulate forever. Also caps Preview Region accumulation.

## Output Size
- **Preset**: HD / FHD / QHD / 4K / 5K / 8K UHD, ultrawide (UWQHD, 5K2K), squares, portrait/vertical, skybox, and A0–A3 print sizes at 300 DPI. The list is shared with the Quality > Resolution dropdown.
- **Width / Height**: type any values; snaps to multiples of 8 for GPU alignment.
- **Ratio**: aspect-ratio lock for the W/H pair — *Free* (independent), or one of the standard ratios (1:1, 16:9, 21:9, 4:3, 4:5, 9:16, 2.35:1, 2:1). When set, editing Width recomputes Height (and vice versa). The same ratio list is used by the viewport "fit to window" dropdown.
- **Lock to viewport aspect** (default on): the output automatically tracks the current canvas aspect ratio — open a sidebar, change the window size, and the output height adjusts so what you export matches what you see. Turn off (or pick a static Ratio above) to render an arbitrary aspect; when unlocked, the viewport temporarily switches to a fitted Fixed-mode canvas that matches the output aspect (so the live render doesn't stretch).
- **Match Viewport**: one-click button to set output size to the current canvas dimensions.

The VRAM estimate next to the *Output Size* heading shows the memory cost of a single tile.

## Tile Grid
*Columns × Rows* splits the output into separate PNG files — useful for prints too large for GPU memory in one render (e.g. 20K × 20K split 5×5 = 25 files at 4K each). The header next to *Tile Grid* shows the file count and per-tile pixel size. **1 × 1 = single file** (default).

When tiling is active with bloom or chromatic aberration enabled, visible seams may appear at tile boundaries (spatial effects run per-tile). Disable those effects for seamless stitching.

## GPU Bucket Size
Internal tile size for VRAM safety — distinct from the output tile grid above. Smaller = less memory per tile, larger = faster per-tile cost. 512 is a good default on most GPUs.

## Post-Processing
Bloom, Chromatic Aberration, Color Grading, and Tone Mapping are applied to each image tile's complete composite after its GPU buckets finish. For single-image renders the result matches the live viewport; for tiled renders see the seam note above.

## During Export
The viewport is locked — camera movement, parameter changes, and resizing are blocked to preserve tiled-render integrity. The panel collapses to a compact rendering view that stays out of the canvas: a progress bar plus a stat strip with **Tile** (X / Y), **Elapsed**, and **ETA** (a ±10% range), and a Stop button.

## Preview Region
A live, export-density preview of any canvas section. Unlike Export, this does **not** lock the viewport — you keep full interactivity so you can iterate on the look at final resolution.

1. Click **Preview Region** in the panel. The cursor becomes a crosshair.
2. Hover over the canvas — a dashed fuchsia rectangle follows the cursor, showing which slice of the export will fill the canvas at 1 output-pixel per 1 physical canvas-pixel.
3. Click to start. The viewport now shows the selected region rendered at export density, converging up to **Max Samples Per Bucket**.
4. Adjust anything — sliders, lighting, colors, formula params, camera. The preview re-renders live with the new values, still at export density.
5. Exit via the header **Exit Preview** chip, pressing **Esc**, or closing the panel.

The panel stays open during preview so all your controls remain reachable. Changing Output Width/Height auto-exits the preview (the rendered pixels no longer represent the configured export).
`},"render.region":{id:"render.region",category:"Rendering",title:"Render Region",content:`
Focus accumulation on a specific area of the viewport. Pixels outside the region keep their history unchanged while the selected area accumulates new samples.

## Drawing a Region
1. Click the **Crop Icon** in the top bar (or click it again to cancel).
2. Drag on the viewport to draw the region. A dashed preview appears as you drag.
3. Release to set the region.

## Region Controls
Once set, the region overlay shows live stats:
- **Pixel dimensions** of the selected area (e.g. 820×460).
- **Sample count** — how many accumulation passes have completed.
- **Sample cap** — click the cycle button (⟳) to step through caps: ∞ / 64 / 128 / 256 / 512 / 1024 / 2048 / 4096.
- **Convergence** — live measurement of how much the image is still changing. When below the threshold, it turns green.

## Editing
- **Move**: Drag inside the region box.
- **Resize**: Hover to reveal corner and edge handles, then drag.
- **Clear**: Click ✕ on the overlay or click the crop icon in the top bar.

## Tips
- Use a region to quickly refine a specific detail without waiting for the whole viewport.
- The sample cap shown on the region is the same global setting as the pause menu — changing it in either place updates both.
- Convergence is measured only within the region bounds, not the full viewport.
`},"quality.detail":{id:"quality.detail",category:"Rendering",title:"Ray Detail (Epsilon)",parentId:"panel.quality",content:`
Controls the termination threshold of the raymarcher.

- **1.0 (Standard)**: Stops when ray is within 1 pixel size of the surface.
- **< 1.0 (Low)**: Stops earlier. Faster rendering, but surfaces look "puffy" or "blobby". Small details merge together.
- **> 1.0 (High)**: Forces the ray closer to the surface. Sharpens tiny details but requires significantly more steps (slower).
`},"quality.fudge":{id:"quality.fudge",category:"Rendering",title:"Slice Optimization (Fudge)",parentId:"panel.quality",content:`
Scales the raymarch step size. Also known as "Lipschitz Bound Relaxation".

- **1.0 (Safe)**: Mathematically correct stepping. Guarantees no artifacts.
- **< 1.0 (Slow/Safe)**: Takes smaller steps. Fixes "overstepping" artifacts (holes in the fractal) but is very slow.
- **> 1.0 (Fast/Risky)**: Takes larger steps. Renders much faster, but may clip through thin geometry, creating black noise or missing details.

> **Artistic use:** Values above 1.0 are also used for artistic slicing effects — they cause the ray to overshoot surfaces, creating cut-away or x-ray looks.
`},"quality.threshold":{id:"quality.threshold",category:"Rendering",title:"Pixel Threshold",parentId:"panel.quality",content:`
An adaptive quality optimization. It relaxes the detail requirement for distant objects.
Increasing this makes the background render faster by allowing it to be slightly blurrier, which is often physically realistic (atmospheric scattering limits detail visibility at range).
`},"quality.steps":{id:"quality.steps",category:"Rendering",title:"Max Steps",parentId:"panel.quality",content:`
> **REQUIRES ADVANCED MODE**

The "Fuel Tank" for the ray.
If a ray marches for **N** steps and hasn't hit anything, it gives up (returns Sky color).
- **Low (100)**: Rays die quickly. Deep crevices or distant objects appear as flat black voids.
- **High (500+)**: Rays can travel into deep holes. Required for high zoom levels or very complex sponges. Significantly impacts performance.
`},"quality.scale":{id:"quality.scale",category:"Rendering",title:"Internal Resolution Scale",parentId:"panel.quality",content:`
Controls the resolution of the internal render buffer relative to the screen.

- **0.25x - 0.5x**: Retro/Pixelated look. Extremely fast. Great for complex editing on low-end devices.
- **1.0x**: Native resolution.
- **1.5x - 2.0x**: Super-sampling (SSAA). Renders at a higher resolution and scales down. Eliminates aliasing but is very expensive (4x the pixels).
`},"mat.diffuse":{id:"mat.diffuse",category:"Rendering",title:"Diffuse Strength",parentId:"panel.render",content:`
The base brightness of the surface color.
- **1.0**: Standard brightness.
- **> 1.0**: Boosts color saturation and brightness artificially.
- **0.0**: Surface is black (unless Specular/Emission is active).
`},"mat.metallic":{id:"mat.metallic",category:"Rendering",title:"Metallic",parentId:"panel.render",content:`
Controls the surface conductivity and energy conservation.

- **0.0 (Dielectric)**: Plastic, Wood, Stone. 
  - Reflection color is **White** (4%).
  - Diffuse color is active.
- **1.0 (Metal)**: Gold, Chrome, Iron. 
  - Reflection color is **Tinted** by the surface gradient.
  - Diffuse color is disabled (Metals don't have diffuse scattering).
`},"mat.specular":{id:"mat.specular",category:"Rendering",title:"Specular Intensity",parentId:"panel.render",content:`
The strength of the light reflection (F0).
Even non-metals have some reflection.
- **Increase** to make the surface look wet or shiny.
- **Decrease** for a dry, matte look.
`},"mat.roughness":{id:"mat.roughness",category:"Rendering",title:"Roughness",parentId:"panel.render",content:`
Micro-surface detail.
- **0.0 (Smooth)**: Mirror-like reflections. Sharp highlights.
- **1.0 (Rough)**: Concrete/Chalk. Diffuse reflections. Highlights are spread out and dim.
`},"mat.rim":{id:"mat.rim",category:"Rendering",title:"Rim Light",parentId:"panel.render",content:`
Adds a glowing edge effect based on the viewing angle (Fresnel).
Useful for separating the fractal from the background or adding an "Alien" feel.

- **Rim Light**: Intensity of the edge glow.
- **Rim Sharpness**: Controls the width of the edge. Higher values make the rim thinner and sharper.
`},"mat.emission":{id:"mat.emission",category:"Rendering",title:"Self-Illumination",parentId:"panel.render",content:`
Makes the surface glow independently of light sources.

### Emission Sources
- **Full Surface**: The entire object glows using its final blended color.
- **Layer 1/2**: Only uses the specific gradient layer for the glow color. Useful for making just the "veins" (Layer 2) glow while the base rock (Layer 1) stays dark.
- **Layer 3 (Noise)**: Uses the procedural noise pattern to drive the glow intensity. Great for "magma cracks" or energy fields.
- **Solid Color**: Forces a specific, constant glow color everywhere.

### Path Tracing (GI)
In Path Tracing mode, the **Illumination Power** slider controls how much light the surface emits into the scene (Global Illumination) without changing how bright the surface looks to the camera.
- **1.0**: Physically accurate.
- **> 1.0**: Boosts the bounce light intensity. Great for making dim emissive veins light up a whole room without blowing out the surface detail.
`},"mat.env":{id:"mat.env",category:"Rendering",title:"Environment Map",parentId:"panel.render",content:`
Adds a fake sky reflection to the surface.
Useful for making metals look realistic by giving them something to reflect, even if the background is black.
`},"mat.glow":{id:"mat.glow",category:"Rendering",title:"Volumetric Glow",parentId:"panel.render",content:`
Accumulates light along the ray as it passes *near* fractal surfaces (without hitting them).

- **Intensity**: How bright the air is.
- **Tightness**: Controls where glow appears relative to the fractal surface.
  - **< 1 (Aura mode)**: Glow is suppressed near the surface and peaks further away, creating an outer aura effect. Lower values push the glow peak further out.
  - **1–1000 (Standard)**: Glow hugs the surface. Low values give a general foggy haze, high values give neon outlines around geometry (Tron look).
  - The transition between aura and standard mode blends smoothly in the 0.75–1.0 range.
`},"mat.ao":{id:"mat.ao",category:"Rendering",title:"Ambient Occlusion (AO)",parentId:"panel.render",content:`
Darkens crevices and holes to add depth perception.

- **Intensity**: Darkness of the shadows.
- **Spread**: Radius of the sampling. Larger spread = larger soft shadows in corners.
- **Samples**: Number of AO samples (default 5, adjustable 2–32). More samples = smoother but slower.
- **Stochastic Mode** (toggle):
  - **Off**: Fixed sample positions. Fast and stable — good for editing.
  - **On**: Randomized sample positions each frame. Requires Temporal AA (Accumulation) to look smooth, but produces photorealistic soft shading.
- **AO Tint**: Colorizes the ambient occlusion shadows. By default AO darkens to black, but you can tint it to warm brown, cool blue, etc. for a more stylized look.

### Interaction with Emission
Ambient Occlusion acts as a multiplier for Self-Illumination and Rim Light. This allows "dirt" or crevices to darken glowing parts of the surface, adding realism to magma/energy cracks.

### Path Tracing
In Path Tracer mode, AO is applied **only to the direct camera view**. It is disabled for indirect light bounces to preserve the energy of the Global Illumination system.
`},"fog.settings":{id:"fog.settings",category:"Rendering",title:"Atmospheric Fog & God Rays",parentId:"panel.scene",content:`
Adds depth and atmospheric effects to the scene. Fog controls appear when **Fog Intensity > 0**.

## Distance Fog
- **Fog Intensity**: Master control. Fades distant objects to the Fog Color.
- **Start (Near)**: Distance where fog begins.
- **Fog End**: Distance where everything becomes the solid fog color.
- **Fog Color**: The color distant objects fade into.

## Volumetric Scatter (God Rays)
Simulates light scattering through a participating medium. Requires **Volumetric Scattering (HG)** to be compiled — enable via the Viewport Quality dropdown (Atmosphere: Volumetric) or the Engine panel.

- **Volumetric Density (σ)**: Thickness of the air. Higher values = denser fog, shorter light shafts. Good range: 0.005–0.05.
- **Anisotropy (g)**: Controls direction bias of scattered light (Henyey-Greenstein phase):
  - **0**: Isotropic — light scatters equally in all directions.
  - **+0.9**: Strong forward scatter — classic god rays pointing toward lights.
  - **−0.9**: Back scatter — halo effect around light sources.

## Tips
- God rays accumulate over frames via Temporal Accumulation — they look best when the camera is still.
- Shadow jitter is proportional to the DE distance at each scatter sample, which softens the fractal silhouette in open sky while keeping crisp edges near the surface.
- In Direct mode, god rays work without Path Tracing enabled.
`},"dof.settings":{id:"dof.settings",category:"Rendering",title:"Depth of Field (DOF)",parentId:"panel.scene",content:`
Simulates a physical camera lens by blurring areas outside the focus plane. See **Scene > Optics** for full DOF documentation including Aperture, Focus Distance, Auto-Focus, and High Precision controls.

**Note**: DOF requires **Temporal AA** (Accumulation) to look smooth.
`},"render.reflections":{id:"render.reflections",category:"Rendering",title:"Reflections",parentId:"panel.render",content:`
Adds reflective surfaces to the fractal. Three modes available, from cheapest to most expensive:

## Reflection Methods
- **Off**: No reflections. Fastest.
- **Environment Map**: Samples the environment map at the reflection angle. Cheap, adds realism to metals. Uses Fresnel weighting.
- **Raymarched (Quality)**: Fires actual reflection rays through the fractal. Physically accurate but adds ~7.5s compile time.

## Raymarched Settings
- **Max Bounces (1-3)**: Recursion depth. Each bounce adds a full raytrace pass.
- **Trace Steps**: Precision of the reflection ray (16-128).
- **Roughness Cutoff**: Surfaces rougher than this skip raymarching (performance optimization).
- **Raymarch Mix**: Blend between raymarched (1.0) and environment map (0.0) reflections.
- **Bounce Shadows**: Compute shadows on reflected surfaces. Adds ~4.5s compile time.

## Tips
- Combine with low **Roughness** (0.0-0.3) and high **Metallic** for dramatic mirror effects.
- Use Environment Map mode during editing, then switch to Raymarched for final renders.
`},"render.volumetric":{id:"render.volumetric",category:"Rendering",title:"Volumetric Scatter",parentId:"panel.render",content:`
Henyey-Greenstein single-scatter volumetric rendering. Enables god rays, colored haze, and directional fog effects.

**Note:** This is a compile-time feature. Enabling it triggers a shader recompile (~5.5s). You can also toggle it on/off at runtime without recompiling once it has been compiled in.

## Density & Shadow Rays
- **Density**: Thickness of the participating medium. Log scale — small values (0.01-0.05) produce subtle haze, higher values create thick fog.
- **Anisotropy (g)**: Direction bias for scattered light.
  - **0**: Isotropic (equal scatter in all directions).
  - **+0.9**: Forward scatter — classic god rays pointing toward light sources.
  - **-0.9**: Back scatter — halo effect around lights.
- **Light Sources**: How many lights cast shadow rays into the volume (1-3). More = more expensive.
- **Scatter Tint**: Color of the scattered light.
- **Step Jitter**: Controls random variation in volumetric step positions. Higher values help with temporal accumulation (noise averages out over frames). Lower values produce cleaner single-frame results but may show banding. Can also be used artistically for slicing effects.

## Color Scatter
- **Surface Color Scatter**: Injects the fractal's orbit trap color field into the volume. Creates a colored volumetric haze matching the gradient palette. No shadow rays needed (cheap).
- **Surface Falloff**: Concentrates the color near the fractal surface.

## Height Fog
- **Height Falloff**: Density varies with Y coordinate. Creates ground fog or rising mist.
- **Height Origin**: The Y level where fog is densest.
`},"mat.reflection":{id:"mat.reflection",category:"Rendering",title:"Reflections",parentId:"panel.render",content:`
Adds reflective surfaces to the fractal using raymarched reflection rays.

## How It Works
When enabled, the renderer fires additional rays from the surface in the reflection direction. These rays march through the fractal just like the camera ray, finding what the surface "sees" and blending that into the final image.

## Key Controls
- **Max Bounces (1–3)**: How many times light can bounce between surfaces. One bounce is a simple mirror; two or three bounces let you see reflections of reflections (like standing between two mirrors). More bounces = slower rendering.
- **Roughness**: Smooth surfaces (low roughness) produce sharp, mirror-like reflections. Rough surfaces scatter the reflection into a soft, blurry highlight.
- **Roughness Cutoff**: Surfaces rougher than this threshold skip raymarching entirely to save performance — they fall back to the environment map.
- **Raymarch Mix**: Blends between full raymarched reflections (1.0) and the cheaper environment map reflections (0.0). Useful for dialing in the right balance of quality vs speed.
- **Metallic Influence**: Metallic surfaces tint reflections with their own color (like gold or copper), while non-metallic surfaces (plastic, stone) reflect white light.

## Bounce Shadows
When enabled, reflected surfaces also receive proper shadows — so a reflection of a crevice will show the correct darkness inside it. This adds realism but increases compile time.

## Performance Note
Raymarched reflections are a compile-time feature. Enabling them triggers a shader recompile (roughly 7–8 seconds). Bounce shadows add another 3–5 seconds on top of that. Use Environment Map mode for fast editing, then switch to Raymarched for final renders.
`},"water.settings":{id:"water.settings",category:"Rendering",title:"Water Plane",content:`
An infinite ocean plane with animated waves, integrated into the raymarcher. The water surface participates in shadows, AO, and reflections.

## Controls
- **Height**: Y-level of the water surface.
- **Color**: Albedo of the water.
- **Roughness**: Surface roughness (0 = mirror, 1 = matte).
- **Wave Strength**: Amplitude of the animated waves. Set to 0 for a flat mirror plane.
- **Wave Speed**: Animation speed of the waves.
- **Wave Frequency**: Density of wave peaks.

## How It Works
The water plane is a signed distance field (SDF) composed of 3 layered noise octaves:
1. Rolling swell (sine-based)
2. Organic surface (simplex noise)
3. Fine choppiness (high-frequency noise)

Normals are recomputed via finite differences for accurate specular highlights and reflections.

## Tips
- Works best with **Reflections** enabled (Environment Map or Raymarched).
- Set the fractal near the water surface and use **Fog** to create depth.
`},"quality.metric":{id:"quality.metric",category:"Rendering",title:"Distance Metric",parentId:"panel.quality",content:`
> **REQUIRES ADVANCED MODE**

Controls how "distance" is measured in 3D space. Different metrics produce different geometric styles.

- **Euclidean** (default): Standard straight-line distance. Produces natural, round shapes.
- **Chebyshev**: Uses the largest coordinate difference. Tends to produce cube-like, blocky geometry.
- **Manhattan**: Uses the sum of coordinate differences. Creates diamond-shaped, angular geometry.
- **Minkowski**: A tunable blend between the other metrics. Adjust the exponent to interpolate between Manhattan (1), Euclidean (2), and Chebyshev (infinity).
`},"quality.estimator":{id:"quality.estimator",category:"Rendering",title:"Distance Estimator",parentId:"panel.quality",content:`
> **REQUIRES ADVANCED MODE**

Controls the mathematical method used to estimate the distance to the fractal surface. Different estimators suit different formula types.

- **Analytic Log**: Uses the logarithmic distance estimate. Best for standard fractals (Mandelbulb, Mandelbox) where the analytic derivative is reliable.
- **Linear**: A simpler linear estimate. Can work better for formulas with non-standard divergence behavior.
- **Pseudo**: Approximates the distance without true derivatives. Useful as a fallback when analytic methods produce artifacts.
- **Dampened**: A conservative estimate that under-steps slightly for stability. Helps with formulas prone to overstepping artifacts (holes or noise on surfaces).
`},"quality.jitter":{id:"quality.jitter",category:"Rendering",title:"Step Jitter",parentId:"panel.quality",content:`
> **REQUIRES ADVANCED MODE**

Adds stochastic (random) variation to each ray step position (default 0.15).

- **Purpose**: Breaks up banding and aliasing artifacts by randomizing where the ray samples. Over multiple frames with Temporal AA enabled, the random offsets average out to produce a smooth, noise-free image.
- **0.0**: No jitter. Clean single frames but may show visible stepping bands on smooth surfaces.
- **0.1–0.2**: Subtle variation. Good balance for most scenes.
- **Higher values**: More randomness per frame — noisier in motion but converges faster when still.
`},"quality.relaxation":{id:"quality.relaxation",category:"Rendering",title:"Step Relaxation",parentId:"panel.quality",content:`
> **REQUIRES ADVANCED MODE**

A dynamic fudge factor that automatically adjusts the step size based on the previous step's distance estimate.

When enabled, the raymarcher takes larger steps in open space (where it is safe) and smaller steps near surfaces (where precision matters). This speeds up rendering in scenes with large empty areas without sacrificing surface detail.
`},"quality.adaptive":{id:"quality.adaptive",category:"Rendering",title:"Adaptive Resolution",parentId:"panel.quality",content:`
Automatically adjusts the rendering resolution to maintain a target frame rate (default 30 FPS). Enabled by default — toggle via the top bar icon.

**Context-aware behavior:**
- **Mouse on canvas**: Lowers resolution during camera movement or gizmo interaction. Restores full resolution after a grace period that scales with scene complexity (slow scenes get more time before restoring).
- **Mouse on UI** (panels, menus, sliders): Keeps adaptive resolution active continuously so parameter adjustments and menu interactions stay responsive.

**How it works:** The system measures FPS every 500ms and adjusts the internal render scale (1x–4x downsample) proportionally. A 5% dead zone prevents tiny fluctuations from causing constant resolution changes. On interaction start, the scale is immediately seeded from the current still-frame FPS so there's no slow ramp-up period.

**Target FPS** can be adjusted in the Quality panel. The top bar icon shows the current state: **cyan** = auto mode (will restore full res), **amber** = always-on mode (mouse over UI).

Disabled automatically during bucket rendering and video export.
`},"export.video":{id:"export.video",category:"Export",title:"Video & Image Sequence Export",content:`
Render high-quality video files or per-frame image sequences from the timeline.

### Formats
- **MP4 (H.264 / HEVC / AV1)**: universal video containers. H.264 is the most compatible; HEVC and AV1 give better compression but require a GPU/browser that can encode them.
- **WebM (VP9)**: web-native open format. Firefox encodes VP9 natively (no cap).
- **PNG Sequence (RGBA)**: per-frame image files written into a folder. When you select both Beauty and Alpha, they're merged into one RGBA PNG per frame — perfect for compositing in After Effects, Nuke, Resolume, etc. Depth (if selected) goes out as a separate greyscale PNG per frame.
- **JPG Sequence**: per-frame files, one per selected pass. Lossy but small — good for preview proofs or social-media clips.

### Passes
Three checkboxes control which render passes go to the output:

- **Beauty** — the normal tone-mapped color image.
- **Alpha** — a surface mask (white = surface, black = sky). Anti-aliased "for free" via the accumulation pipeline.
- **Depth** — a linear distance map (near = black, far = white). When Depth is selected you'll see **Near / Far (world units)** inputs — anything closer than Near reads as black, anything farther than Far reads as white. The **Use fog range** shortcut copies your scene's current fog start/end if fog is enabled.

Each selected pass produces its own file for video / JPG exports. PNG merges Beauty + Alpha into one RGBA file.

### Browser Compatibility
- **MP4 / WebM — Disk Mode** (Chrome / Edge / Opera): direct file write. You pick the output file when you click Render; video streams to disk, unlimited file size.
- **MP4 / WebM — RAM Mode** (Firefox / Safari): the entire video is buffered in memory before download. Crashes the tab if the file would exceed ~2–4 GB. Render short segments and stitch in a video editor for long animations.
- **Image Sequences**: **Chrome / Edge only** — needs the directory-picker API. The render button shows a notice in unsupported browsers.

### Firefox notes
- Firefox encodes H.264 through Cisco's OpenH264 plugin, which is **capped at ~31 Mbps** regardless of the bitrate slider. An inline notice appears in the dialog when you set a bitrate above this threshold. Use VP9/WebM (or Chrome) if you need higher bitrate for H.264-visible quality.
- Exported fps / timing is automatically corrected — the encoder returns timestamps with a one-frame leading offset on Firefox, which we cancel internally.

### Settings
- **Resolution**: includes social presets (Square 1:1, Portrait 4:5, Vertical 9:16). Any 2-pixel-aligned resolution works.
- **Bitrate**: the slider value is a "visible quality" target — the encoder is actually given 2.5× this value to compensate for CBR under-shoot on smooth content. 12–20 Mbps on the slider is usually sufficient for 1080p beauty.
- **Samples**: accumulation passes per frame (shared across all render passes in image-sequence mode).
  - 16–32: draft.
  - 64–128: production quality (removes residual grain).
- **Internal Scale**: render above resolution (1.5×–2× for SSAA) at proportionally higher cost.

### Multi-pass file naming
- Single video / single pass: \`{project}_v{n}_{WxH}.{ext}\`
- Video with multiple passes: \`{project}_{pass}_v{n}_{WxH}.{ext}\` — one file per pass.
- PNG merged: \`{project}_v{n}_{WxH}_{frame}.png\`
- JPG / PNG depth: \`{project}_{pass}_v{n}_{WxH}_{frame}.{png|jpg}\`
`}},c={"panel.gradient":{id:"panel.gradient",category:"Coloring",title:"Coloring Engine",content:`
Fractals don't have "texture maps" in the traditional sense. Color is assigned mathematically based on the geometry.

## The Process
1. **Mapping**: The engine measures a specific value at the surface point (e.g., "How far is this point from the origin?").
2. **Transform**: This value is transformed using Scale, Offset, Phase, and Repeat sliders.
3. **Lookup**: The final value (0.0 to 1.0) is used to pick a color from the **Gradient**.

## Dual-Layer System
You can blend two completely different coloring strategies to create complex surfaces.
- **Layer 1**: The Base color.
- **Layer 2**: Detail or Overlay color.
- **Blend Mode**: Determines how they combine (Mix, Add, Multiply, Bump).

## Histogram
The coloring panel includes a live **histogram** that shows how your color values are distributed across the fractal surface. Use it to spot problems — if all the values are bunched up on one side, your colors will look flat. Adjusting Scale, Offset, or Gamma (Bias) while watching the histogram makes it much easier to get a well-spread, vibrant result.
`},"grad.params":{id:"grad.params",category:"Coloring",title:"Color Parameters",parentId:"panel.gradient",content:`
These parameters control how the raw mapping value is transformed before it looks up a color from the gradient.

### Transform Controls
- **Scale**: Stretches or compresses the color pattern. Higher values create more repetitions; lower values spread the pattern out.
- **Offset**: Shifts the entire pattern along the gradient. Use this to "scroll" through colors without changing the pattern shape.
- **Phase**: Rotates the gradient starting point. Think of it like spinning a color wheel — the same colors are used, but they start at a different point in the cycle. Useful for fine-tuning which color lands on which part of the fractal.
- **Repeats**: Controls how many times the gradient repeats across the full mapping range. At 1, the gradient plays once from left to right. At higher values it tiles, creating banded or striped effects. Works well with smooth mappings like Radial or Potential.

### Advanced Controls
- **Gamma (Bias)**: Controls the gamma curve of the gradient lookup (range: 0.1 to 10.0). Values below 1.0 push more of the surface toward the bright end of the gradient; values above 1.0 push toward the dark end. This reshapes how colors distribute across the surface without changing the gradient itself — very useful for bringing out detail in dark or light regions.
- **Color Iterations**: Stops orbit trap capture at a specific iteration count (0 to 24). Normally the orbit trap runs for the full iteration loop, but clamping it early lets you control *which part* of the fractal's iteration process the colors are sampled from. Low values color based on early, large-scale structure; high values reveal finer internal detail. A powerful tool for creative control.
- **Twist**: Distorts the mapping value (range: -5 to 5). Adds a swirl or warp to the color pattern, bending straight bands into curves. Subtle values (0.1–0.5) add organic flow; extreme values create psychedelic distortion.
`},"grad.mapping":{id:"grad.mapping",category:"Coloring",title:"Mapping Modes",parentId:"panel.gradient",content:`
Determines the mathematical property used to select color from the gradient.

### Geometric Mappings
- **Orbit Trap**: Uses the *minimum distance* the orbit point reached relative to the origin during iteration. Creates geometric, cellular, or techno-organic patterns inside the bulbs. Good for "solid" looking interiors.
  - **Reference:** [Wikipedia: Orbit Trap](https://en.wikipedia.org/wiki/Orbit_trap)
- **Orbit X (YZ plane)**: Like Orbit Trap, but only measures distance along the X axis. Reveals structure in the YZ plane — useful for slicing the fractal's internal geometry into layers.
- **Orbit Y (XZ plane)**: Same idea on the Y axis. Highlights horizontal strata and bands through the fractal interior.
- **Orbit Z (XY plane)**: Same idea on the Z axis. Great for height-based coloring of internal structures.
- **Orbit W (Origin)**: Uses the squared distance from the origin at each iteration (like a full 3D orbit trap). Produces smooth, rounded color regions that follow the overall shape of the orbit.
- **Radial**: Based on the distance of the final surface point from the center $(0,0,0)$. Creates spherical gradients and large-scale color shifts.
- **Z-Depth**: Height map based on the Z coordinate. Useful for creating landscapes or strata effects.
- **Angle**: Based on the polar angle around the Z-axis. Creates spirals and pinwheels.
- **Normal**: Based on the surface slope (Up vs Down). Adds pseudo-lighting effects or "snow on peaks" looks.

### Fractal Mappings
- **Iterations (Glow)**: Based on how many iterations it took to decide the point was "solid". Creates smooth, glowing bands outlining the shape. The classic "Electric Sheep" look.
- **Raw Iterations**: Same as Iterations but without smoothing. Shows distinct bands or steps. Useful for technical analysis or stylized "8-bit" looks.
- **Decomposition**: Analytic decomposition of the complex number angles during iteration. Creates checkered, grid-like, or circuit-board patterns. Highly sensitive to the **Escape Radius**.
- **Flow (Angle + Iter)**: Combines Decomposition and Iterations into a single mapping. The result is spiral and grid patterns that follow the fractal's natural flow — think of it as a 2D coordinate system wrapped around the fractal's internal structure. Great for detailed, structured coloring.
- **Potential (Log-Log)**: Measures the electrical potential of the set. Creates very smooth, gradient-like bands, especially near the boundaries of the fractal. Ideal for continuous color flows.
`},"grad.escape":{id:"grad.escape",category:"Coloring",title:"Escape Radius",parentId:"panel.gradient",content:`
The distance from the origin ($R$) at which the formula considers a point to have "escaped" to infinity. Range: 0 to 1000.

### Impact on Coloring
- **Standard**: Usually around 2.0 to 4.0 for basic shapes.
- **Decomposition / Flow**: Requires a higher escape radius (e.g., 10.0 - 100.0) to allow the pattern to resolve fully before the calculation stops. If your decomposition looks noisy or cut off, increase this value.
- **Glow**: Higher values can compress the glow bands slightly.
- **Extreme values (100-1000)**: Pushing the escape radius very high can create interesting effects — patterns become finer, and some mappings reveal structure that is invisible at lower radii. Worth experimenting with!

**Performance Note**: Higher escape radii generally mean more iterations are needed to reach the edge, which can slightly reduce performance or require increasing the **Max Iterations** count.
`},"grad.layer2":{id:"grad.layer2",category:"Coloring",title:"Layer 2 & Blending",parentId:"panel.gradient",content:`
Layer 2 adds surface complexity by overlaying a second pattern on top of the base layer.

### Blend Modes
- **Mix**: Linear interpolation. At 0.5 opacity, the result is 50% Layer 1 and 50% Layer 2.
- **Add**: Adds brightness. Useful for creating glowing veins or energy overlays.
- **Multiply**: Darkens the base color. Great for adding grime, shadows, or ambient occlusion style darkening.
- **Screen**: The opposite of Multiply — brightens by combining the inverse of both layers. Useful for soft glows, light leaks, and ethereal effects. Dark areas in Layer 2 have no effect; light areas brighten the result.
- **Overlay**: Increases contrast. Light parts get lighter, dark parts get darker. Preserves highlights and shadows.
- **Bump (Normal)**: **Does not change color!** Instead, it uses the brightness of Layer 2 to perturb the surface **Normal**.
  - Creates the illusion of physical depth, scratches, or embossing.
  - Requires **Shading** (Lighting) to be visible.
`},"grad.texture":{id:"grad.texture",category:"Coloring",title:"Image Texturing",parentId:"panel.gradient",content:`
Instead of a 1D gradient, you can map a 2D image onto the fractal surface.

### UV Generation
Since fractals are infinite and generated procedurally, they have no native UV coordinates. We must generate them mathematically.
- **U Mapping**: Selects the property for the horizontal (X) texture coordinate.
- **V Mapping**: Selects the property for the vertical (Y) texture coordinate.

### Tips for Good Texturing
- **Decomposition** on U and **Iterations** on V often produces a mapping that follows the natural flow of the fractal structures (like uv-unwrapping).
- **Radial** mapping on both axes can create spherical projection effects.
- **Texture Scale**: Controls how many times the image repeats. High values create detailed surface grain; low values project the image across the whole object.
- **Seamless Textures**: Use tileable images to avoid visible seams.
`},"grad.noise":{id:"grad.noise",category:"Coloring",title:"Procedural Noise",parentId:"panel.gradient",content:`
Adds fine surface detail using a 3D Simplex Noise function calculated in real-time.

### Parameters
- **Scale**: The size of the noise grain.
  - High values (100+) create dusty, sandy, or metallic grain.
  - Low values (1-10) create large blobs or camouflage patterns.
- **Turbulence**: Distorts the noise coordinate space, creating marble-like swirls and fluid distortions.
- **Bump**: Uses the noise value to perturb the surface normals.
  - Positive values create bumps.
  - Negative values create pits/dents.
  - Essential for realistic rock, rust, or concrete surfaces.
- **Mix Strength**: Blends the noise color (single color) with the gradient colors.
`},"grad.editor":{id:"grad.editor",category:"Coloring",title:"Gradient Editor",parentId:"panel.gradient",content:`
The gradient editor lets you design custom color ramps by placing and adjusting color knots along a bar.

### Knots
Click on the gradient bar to add a new knot. Drag knots to reposition them. Select a knot and use the color picker to change its color, or delete it.

### Per-Knot Interpolation
Each knot can have its own interpolation mode, controlling how colors blend between that knot and the next:
- **Linear**: Smooth, even transition between colors (the default).
- **Step**: Hard cut — the color jumps instantly to the next knot with no blending. Great for flat-shaded or "poster" looks.
- **Smooth**: Eased transition that accelerates and decelerates, giving a softer, more natural blend than Linear.

### Bias Handles
Enable **Bias handles** from the context menu (right-click the gradient bar). Bias handles appear between knots and let you push the midpoint of a transition toward one side or the other — so you can make one color dominate more of the space between two knots without moving the knots themselves. Useful for fine-tuning subtle transitions.

### Presets
Right-click the gradient bar to access **gradient presets** — a library of ready-made color ramps you can load instantly. These are a great starting point to tweak from.
`}},h={"ui.graph":{id:"ui.graph",category:"Graph",title:"Modular Graph Editor",content:`
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
`}},d={"panel.scene":{id:"panel.scene",category:"UI",title:"Scene Panel",content:`
Configures the camera, navigation physics, and atmospheric optics.

## Sections
- **Optics (DOF & Lens)**: Field of view, projection mode, and Depth of Field (blur).
- **Camera & Navigation** (Advanced Mode Only): Movement mode, speed, and absolute coordinates.
- **Atmosphere (Fog)**: Distance fog and volumetric density.
- **Volumetric Scatter**: Atmospheric light scattering.
- **Water Plane** (when enabled): Water surface simulation.
- **Color Correction**: Saturation, levels, and gamma adjustments.
- **Effects**: Bloom, Chromatic Aberration, and Droste effect.
`},"scene.grading":{id:"scene.grading",category:"UI",title:"Color Correction",parentId:"panel.scene",content:`
Post-processing adjustments applied to the final image.

## Controls
- **Saturation**: Controls color intensity. 0.0 is Grayscale, 1.0 is Normal, >1.0 is Vivid.
- **Histogram & Levels**:
  - **Black Point (Min)**: Any pixel darker than this becomes pure black. Increasing this adds contrast.
  - **White Point (Max)**: Any pixel brighter than this becomes pure white.
  - **Gamma**: Non-linear brightness curve. Adjusts mid-tones without crushing blacks or whites.
`},"cam.mode":{id:"cam.mode",category:"UI",title:"Camera Mode",parentId:"panel.scene",content:`
> **REQUIRES ADVANCED MODE**

Determines how the camera moves through the fractal.

## Orbit Mode
The camera rotates around a pivot point.
- **Left Click**: Rotate around target.
- **Right Click**: Pan target.
- **Scroll**: Zoom in/out.
- **Precision**: When you release the mouse, the engine automatically re-centers the coordinate system around your new pivot point. This ensures you can zoom infinitely into details without losing floating-point precision.

## Fly Mode
First-person free flight, similar to a drone or spacecraft.
- **Left Click Drag**: Mouse look (rotate camera).
- **WASD**: Move horizontally.
- **Space/C**: Move Up/Down.
- **Q/E**: Roll.
- **Shift**: Speed Boost (4x).
- **Best For**: Exploration, cinematic fly-throughs, and navigating inside tunnels.

> **Note**: In Fly mode with the timeline open, the Space key only triggers play/pause when hovering over the timeline. Otherwise it moves the camera up.
`},"cam.rotation":{id:"cam.rotation",category:"UI",title:"Camera Rotation",parentId:"cam.mode",content:`
Controls the orientation of the camera in 3D space.

## Mouse Controls
- **Fly Mode**: Click and drag in the viewport to look around freely (mouse-look).
- **Orbit Mode**: Click and drag to rotate around the current pivot point.

## Keyboard Controls
- **Q / E**: Roll the camera left or right (tilt your head). Useful for diagonal compositions or matching a fractal's natural symmetry.

## Rotation Display
The rotation values are shown as three angles (one per axis). You can **right-click** the rotation control to switch between **Degrees** (e.g. 45°) and **Radians** (e.g. 0.25π) — whichever you find easier to work with.
`},"cam.fov":{id:"cam.fov",category:"UI",title:"Field of View (FOV)",parentId:"panel.scene",content:`
Controls the zoom angle of the camera lens (in degrees).

- **High FOV (90°+)**: "Fish-eye" look. Increases sense of speed and scale. Great for flying inside tunnels.
- **Low FOV (10°-30°)**: "Telephoto" look. Flattens depth. Great for macro photography of small details.
- **Standard (60°)**: Natural human vision balance.

## Projection Modes
- **Perspective (Default)**: Standard 3D perspective projection using FOV.
- **Orthographic**: Parallel projection with no perspective distortion. Uses **Ortho Scale** instead of FOV to control the visible area.
- **360 Skybox**: Renders a full 360° equirectangular panorama. Useful for VR content or environment maps.
`},"cam.position":{id:"cam.position",category:"UI",title:"Absolute Position",parentId:"panel.scene",content:`
> **REQUIRES ADVANCED MODE**

The raw coordinate of the camera in fractal space.

## Precision Note
Due to the "Infinite Zoom" engine, this value combines the **Offset** (the position of the universe) and the **Local Camera** (relative position).
Editing these values directly allows for precise teleportation, but be careful: large jumps may land you inside solid geometry (black screen).
`},"scene.geometry":{id:"scene.geometry",category:"UI",title:"Geometry & Transforms",parentId:"panel.formula",content:`
Controls the spatial transformations and geometric modifications applied to the fractal before or during iteration.

## Julia Mode
Switches from **Mandelbrot** mode (where C = position) to **Julia** mode (where C = constant).
- **Julia X/Y/Z**: The 3D Julia constant. Changing these morphs the fractal shape smoothly.
- **Tip**: Find an interesting area in Mandelbrot mode, then toggle Julia and adjust the constant to "freeze" that region.

## Pre-Rotation
Rotates the entire coordinate space before the fractal iteration begins.
- **Rot X / Y / Z**: Euler angles (degrees). Creates tilted, diagonal versions of the fractal.
- **Master Toggle**: Enables/disables all pre-rotation at once.

## Burning Mode
Applies absolute value (\`abs()\`) to coordinates before iteration, creating the "Burning Ship" variant of any formula. Produces sharp, angular structures.

## Hybrid Box (Fold System)
Injects a geometric folding operation into the fractal iteration loop. The fold runs *before* the main formula step each iteration.

### Fold Types
- **Standard**: Classic Mandelbox box fold + sphere fold.
- **Half**: One-sided fold (reflects only positive side).
- **Tetra**: Tetrahedral reflection folds (Sierpinski-like).
- **Octa**: Octahedral reflection folds.
- **Icosa**: Icosahedral/dodecahedral folds (golden ratio reflections).
- **Menger**: Axis-sorting Menger sponge fold.
- **Mirror**: Simple axis-aligned mirror.
- **Decoupled**: Independent per-axis fold limits.
- **Kali**: Kali's abs-inversion fold.

### Hybrid Controls
- **Fold Iterations**: How many fold passes per formula iteration.
- **Scale / MinR / FixedR**: Standard Mandelbox-type fold parameters.
- **Skip / Swap**: Skip the first N iterations, or swap fold/formula order.
- **Add C**: Whether to add the constant C after folding (affects convergence).
- **Shift / Rotation**: Per-fold spatial offsets and rotations.
`},"dof.settings":{id:"dof.settings",category:"Rendering",title:"Depth of Field (DOF)",parentId:"panel.scene",content:`
Simulates a physical camera lens.

- **Camera Blur**: Strength of the blur. 0.0 = Pinhole camera (infinite focus). 
  - The blur effect accumulates over time when the camera is stationary.
  - During camera movement, DOF is temporarily disabled for a stable preview.
  - Supports **High Precision** (down to $0.0001$) for macro photography.
- **Focus Distance**: Distance to the sharp plane.
- **Auto-Focus**: Use the "Pick Focus" button in the Scene tab to click a point and set this value automatically.

**Note**: DOF requires **Temporal Accumulation** to look smooth. It uses stochastic jittering of the camera ray.
`}},u={"post.effects":{id:"post.effects",category:"Effects",title:"Post-Processing Effects",content:`
Post-processing effects are visual adjustments applied **after** the fractal has been rendered. They modify the final image on screen without changing the underlying raymarching, so they have virtually no impact on rendering performance.

## Available Effects
- **Bloom**: Adds a soft glow around bright areas, simulating how real camera lenses scatter intense light.
- **Chromatic Aberration**: Separates color channels at the edges of the frame, mimicking the rainbow fringing of wide-angle lenses.
- **Color Grading**: Controls tone mapping (how HDR brightness is compressed to screen range) and overall color balance — saturation, levels, and gamma.

Each effect has its own detailed settings — expand the sections below to learn more.

## Tips
- Post-processing is always fast, even on lower-end hardware.
- Effects are included in Bucket Renders and Video Exports — what you see in the viewport is what you get in the final file.
`},"effect.bloom":{id:"effect.bloom",category:"Effects",title:"Bloom",content:`
Creates a soft glow around bright areas of the image, simulating how real camera lenses scatter intense light.

## Controls
- **Intensity**: Strength of the glow effect. Higher values produce a more dramatic, dreamy look.
- **Threshold**: Brightness cutoff — only pixels brighter than this value will bloom. Lower threshold = more of the image glows.
- **Spread**: How far the glow extends from bright areas. Higher values create a wider, softer halo.

## Tips
- Works especially well with **Self-Illumination** (emissive surfaces) and bright specular highlights.
- Bloom is a post-processing effect and runs after the main render, so it has minimal performance cost.
`},"effect.chromatic":{id:"effect.chromatic",category:"Effects",title:"Chromatic Aberration",content:`
Simulates the color fringing that occurs in real camera lenses, where red, green, and blue light bend slightly differently through glass.

The effect separates color channels at the edges of the frame, creating rainbow fringing that increases toward the corners — just like a wide-angle lens.

## Tips
- Subtle amounts (low intensity) add a photographic quality.
- Higher amounts create a stylized, glitchy look.
- This is a post-processing effect with minimal performance cost.
`},"effect.colorgrading":{id:"effect.colorgrading",category:"Effects",title:"Color Grading",content:`
Controls the final color processing of the rendered image, similar to color grading in film and photography.

## Tone Mapping
Tone mapping compresses the wide range of light intensities (HDR) into the visible screen range. Different modes produce different visual styles:

- **ACES**: Industry-standard cinematic look. Rich contrast with slightly warm highlights. Great all-round choice.
- **AgX**: Modern filmic curve with excellent highlight handling. Avoids the oversaturated look of ACES in very bright areas.
- **Reinhard**: Classic tone mapping. Softer, more even compression. Good for scenes without extreme brightness.
- **Neutral**: Minimal color shift — closest to the raw render output. Useful when you want full manual control.
- **None**: No tone mapping applied. The raw HDR values are clamped directly. Bright areas will clip to white.

## Color Controls
- **Saturation**: Adjusts the intensity of all colors. 1.0 = natural, 0.0 = grayscale, >1.0 = vivid.
- **Levels**: Adjusts the black and white points of the image for contrast control.
`},"effect.droste":{id:"effect.droste",category:"Effects",title:"Escher Droste (Spiral)",content:`
The Droste effect recursively maps an image inside itself, creating infinite spirals or loops. This implementation is mathematically based on M.C. Escher's "Print Gallery".

**Reference:** [Wikipedia: Droste Effect](https://en.wikipedia.org/wiki/Droste_effect)
**Artistic Origin:** [M.C. Escher: Print Gallery](https://en.wikipedia.org/wiki/Print_Gallery_(M._C._Escher))

## How it works
It transforms the screen coordinates from **Cartesian** ($x, y$) to **Log-Polar** space. 
This turns scaling (zooming) into a linear shift, allowing us to repeat the image periodically as it shrinks towards the center.

## Key Controls
- **Inner/Outer Radius**: Defines the "Ring" (Annulus) where the image lives. The ratio between these determines how fast the spiral shrinks.
- **Periodicity**: How many times the image repeats per spiral loop.
- **Strands**: Number of separate spiral arms. Can be negative (range -12 to 12) — negative values reverse the spiral direction.
`},"droste.geometry":{id:"droste.geometry",category:"Effects",title:"Geometry & Tiling",parentId:"effect.droste",content:`
Controls the physical bounds of the spiral.

- **Inner Radius ($r_1$)**: The size of the "hole" in the center.
- **Outer Radius ($r_2$)**: The outer edge of the image.
- **Tiling**:
  - **Repeat**: Standard tile.
  - **Mirror**: Flips every other tile. Essential for seamless spirals if the image edges don't match.
  - **Clamp**: Stretches the edge pixels (Smear effect).
  - **Transparent**: Only draws the spiral ring, leaving the center/outside empty (or showing the background).
- **Center Shift**: Moves the vanishing point of the spiral.
`},"droste.structure":{id:"droste.structure",category:"Effects",title:"Spiral Structure",parentId:"effect.droste",content:`
Controls the math of the repetition.

- **Periodicity ($P_1$)**: The repetition frequency.
  - **1.0**: Image repeats once per full rotation.
  - **2.0**: Image repeats twice (180° symmetry).
- **Strands ($P_2$)**: The number of "arms" in the spiral. Can be negative (-12 to 12) — negative values reverse the spiral direction.
  - **1**: Single continuous tunnel.
  - **2**: Double helix structure.
- **Auto Period**: Mathematically calculates the perfect Periodicity based on the Radius ratio ($r_2/r_1$) to prevent distortion. Recommended to keep this **ON** unless you want artistic stretching.
- **Mirror Strand**: Alters the rotation logic to align strands seamlessly when using Mirror Tiling.
`},"droste.transform":{id:"droste.transform",category:"Effects",title:"Transform & Distortion",parentId:"effect.droste",content:`
- **Zoom**: Moves the camera *into* the spiral. Because the spiral is infinite, zooming eventually brings you back to the start (just deeper).

### Three Rotation Controls
The Droste effect has three separate rotation axes that each produce distinct visual results:
- **Spiral Rotate**: Rotates the spiral structure itself — the arms twist tighter or looser.
- **Image Spin**: Rotates the image content within the spiral frame, independently of the spiral geometry.
- **Polar Rotate**: Rotates around the polar axis in log-polar space, shifting the mapping angle.

- **Twist**: The core "Escher" switch.
  - **On**: Log-Polar mapping (Spiral).
  - **Off**: Standard Log mapping (Tunnel/Grid).
- **Hyper Droste**: Applies a complex sine function, turning the spiral into a Fractal-like shape.
- **Fractal Points**: When Hyper Droste is on, determines the number of branches/tips in the fractal structure.
`}},p={"panel.audio":{id:"panel.audio",category:"Audio",title:"Audio Engine",content:`
The Audio Engine analyzes sound frequencies in real-time to drive fractal parameters, allowing the visual to react to music or voice.

## How it works
1. **Source**: Select an audio input (Microphone, System Audio, or load a file).
2. **Spectrum**: The engine breaks the sound into frequencies (Bass on left, Treble on right).
3. **Links**: You create "Links" that map a specific frequency range (e.g., the kick drum) to a specific parameter (e.g., Scale).

## Volume and FFT Controls
- **FFT Smooth** (0–0.99): Smooths the frequency analysis over time. Higher values give a more stable, averaged reading.
- **Volume** (0–2): Master gain slider controlling the overall audio level.

## Performance
Audio analysis uses the WebAudio API which processes audio efficiently, but the visualization and modulation application run in the main rendering loop. Modulating complex geometry parameters (like Loop Iterations) every frame can impact GPU performance.
`},"audio.sources":{id:"audio.sources",category:"Audio",title:"Input Sources",parentId:"panel.audio",content:`
Select where the audio data comes from.

- **Microphone**: Uses your default recording device. Great for voice reactivity or ambient room noise.
- **System Audio**: Captures audio from other tabs or applications.
  - *Note*: When the browser dialog appears, you must check the **"Share System Audio"** box, otherwise only video is shared.
- **Load File**: Loads a local audio file (MP3/WAV) and creates a playback deck with play/pause and seek controls.

## Dual Deck / Crossfade
You can load two audio files into **Track A** and **Track B**. Each deck has its own play/pause and seek controls. Use the **Crossfade** slider to blend smoothly between the two tracks — fully left plays only Track A, fully right plays only Track B, and the middle mixes both.
`},"audio.links":{id:"audio.links",category:"Audio",title:"Modulation Links",parentId:"panel.audio",content:`
A **Link** connects a slice of the audio spectrum to a fractal parameter.

## Creating Links
- **Double-click** on the spectrum to create a new modulation box.
- Use the **"+ Add New Link"** button below the spectrum.

## Frequency Selection
The box on the spectrum defines which frequencies drive the parameter.
- **Drag** the box to move it across the frequency range.
- **Drag individual edges** (left, right, top, bottom) to resize the box. The top and bottom edges also control the threshold — signals below the bottom are ignored (noise gate) and signals above the top are clamped (ceiling).
- **Ctrl+Drag** on a box to adjust its gain visually.
- **Right-click** on the spectrum to toggle between **Logarithmic** and **Linear** frequency scale.
- **Quick band buttons**: Bass, Mids, Treble, Full — instantly position the box over common frequency ranges.

Frequency guide:
- **Left (Bass)**: Kick drums, basslines.
- **Middle (Mids)**: Vocals, synths, guitars.
- **Right (Treble)**: Hi-hats, cymbals, air.

## Source Selector
Each link has a **Source** dropdown to choose what drives the modulation:
- **Audio Spectrum** (default): Uses the selected frequency range from the live audio.
- **LFO 1 / LFO 2 / LFO 3**: Low-frequency oscillators that provide rhythmic modulation without any audio input — useful for automated, repeating animation.

## Target Parameter
Each link has a dropdown to choose which fractal parameter to modulate (e.g., Scale, Rotation, Fold Amount).

## Dynamics (Knobs)
Five knobs shape how the signal behaves before it reaches the parameter:
- **Attack** (Rise): How fast the value rises when a sound hits. Low = snappy, high = smooth.
- **Decay** (Fall): How fast the value falls after the sound stops. High decay creates a "trailing" effect.
- **Smooth** (Lerp): Blends between the previous value and the new value each frame, softening rapid changes.
- **Gain** (Mult): Multiplies the output signal. Increase this if the reaction is too subtle.
- **Offset** (Add): Adds a base value to the parameter, so it doesn't drop to zero when silent.

## Active Links
Below the spectrum, a collapsible list shows all your modulation rules. Each entry displays a color indicator, the frequency range, and a delete button for quick management.
`}},m={...e,...t,...a,...o,...i,...r,...n,...s,...l,...c,...h,...d,...u,...p};export{m as HELP_TOPICS};
