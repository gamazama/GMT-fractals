# GMT Fractals in Cinema 4D 2026 + Redshift -- OSL Raymarch POC

Proof-of-concept Open Shading Language (OSL) shaders that raymarch GMT's
distance-estimated 3D fractals inside Redshift, on a bounding-cube proxy.

## What's in this folder

- `mandelbulb.osl` -- raymarched power-8 Mandelbulb (345 lines).
- `sierpinski-tetrahedron.osl` -- 3-plane tetrahedral-fold IFS / Tetrix (313 lines).
- `apollonian.osl` -- sphere-inversion Apollonian gasket (316 lines).
- `report.md` -- full feasibility + POC report (verdict, verified RS-OSL capability,
  architecture, GLSL->OSL port path, plugin landscape, VDB fallback, animation,
  per-shader notes, risks, build order).

All three DEs are ported verbatim from GMT's GLSL and verified against the source
(`Mandelbulb.ts`, `SierpinskiTetrahedron.ts`, `Apollonian.ts`). They are
ready to test but have **not** yet been compiled inside a real Redshift instance.

## How to test in Cinema 4D 2026 + Redshift

1. **SAVE your scene first.** Redshift's OSL compiler is crash-prone; save before
   every compile so a crash costs nothing.
2. Create a **Cube** object. Set its **Size to 2** on all axes (so it spans the
   object-space box `[-1, 1]`). For `apollonian.osl`, a unit cube (Size 1, box
   `+/-0.5`) matches its default `cubeHalf = 0.5` -- or set `cubeHalf = 1.0`.
3. Give the cube a **Redshift Standard Material** (RS node material).
4. In the RS node graph, add an **OSL Shader / OSL Script node**.
5. Set the node to **File mode** and point it (folder icon) at one of the `.osl`
   files. (Or use Text mode and paste the source.) The shader's declared params
   and outputs auto-expose as node ports.
6. Wire the outputs:
   - `outColor` -> Standard Material **Emission Color**, and set **Emission Weight = 1.0**.
   - `outAlpha` -> Standard Material **Opacity** (the geometry/cutout opacity).
     1 = opaque on a fractal hit, 0 = transparent on miss (this cuts the cube
     silhouette down to the fractal).
   Leave Base Color / Metalness / Reflection at defaults -- the look is baked
   entirely into Emission (self-lit).
7. Add a **directional light** and/or set the shader's `lightDir` param to taste
   (it is the object-space key-light direction, normalized internally). You can
   turn the cube's own shadow casting off if it interferes.
8. Start cheap, then refine: low `maxSteps` (~128) and low `iterations` (~8) for
   the first compile, then raise once it renders. Render in the Redshift IPR
   (the C4D editor viewport will only show the bare cube).

## If it renders black / flat / empty

- **Empty / wrong-shaped / mirrored:** the camera-ray reconstruction is the most
  fragile part. Try flipping the sign of `I` (`rd = normalize(-I_transformed)`),
  and check the `transform()` space string -- `"common"->"object"` vs `"world"`.
  If the fractal is the wrong size or off-center, adjust `scale`/`fit`/`offset`
  (Mandelbulb `scale`, Sierpinski `fractalFit`, Apollonian `fitScale`/`fitOffset`)
  and the proxy cube's size.
- **Whole cube renders solid (no cutout):** `outAlpha` isn't wired to Opacity, or
  the miss branch isn't setting it to 0. Confirm the Opacity wire.
- **Renders but unlit / fully black surface:** Emission Weight is not 1 (or
  `outColor` is wired to Base Color with no light). Set Emission Weight = 1 and
  wire `outColor` -> Emission Color.
- **Speckle / holes / banding on the surface:** epsilon too tight or steps too
  few. Raise `maxSteps`, or raise `minDist` slightly (Mandelbulb's adaptive eps
  is `minDist*(1+t)`). For the looser IFS, also nudge `fractalFit`.
- **Compile fails or render is very slow (CPU fallback):** drop `iterations` and
  `maxSteps` hard; an unsupported construct or a heavy loop may be forcing CPU.
  Confirm the OSL node compiled at all before chasing the look.
- **C4D crashed on compile:** expected risk -- reopen the saved scene and retry
  with lower `iterations`/`maxSteps`.

## More detail

See `report.md` for the verified Redshift-OSL capability matrix, the full
architecture rationale, the GLSL->OSL port notes, the VDB viewport-fallback and
animation/camera-import paths, per-shader risk notes, and the recommended build
order.
