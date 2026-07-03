# MB3D camera-pose import — spec

Goal: import the MB3D scene's actual camera (zoom / world-rotation / FOV / pivot) into the GMT preset
so an imported scene frames **exactly like MB3D**, not just the centered default `emitFusedHybrid`
emits today. (The neutral preset + centered Orbit camera + 0.01 glow already shipped — c1e6abc.)

## GMT target (what to set on the FractalDefinition.defaultPreset)

Top-level preset keys (NOT under `features`): `cameraPos {x,y,z}` (absorbed into `sceneOffset` on load —
set this OR `sceneOffset`, not both), `cameraRot {x,y,z,w}` (THREE quaternion, camera looks down local
−Z, up +Y), `targetDistance` (number, orbit/surface distance, ≥0.5), `cameraMode: 'Orbit'`. FOV lives in
`features.optics.camFov` (degrees, default 60) — set it from MB3D `fovY`.

## MB3D source math (verified, Pascal at h:/tmp/mb3d-src)

Inputs (parseMB3D `MB3DHeader`): `zoom` (dZoom), `fovY` (DEGREES, full vertical), `midX/Y/Z`
(= dXmid/dYmid/dZmid, the look-at pivot), `wRotX/Y/Z` (**RADIANS** — the JSDoc currently says degrees,
that's WRONG; MB3D stored GUI-degrees×π/180 at Mand.pas:1460), `width`. **Must add to the parser:**
`dZstart` @offset 20, `dZend` @28 (both Float64; `dZmid` is already `midZ` @52).

```
W = header.width
stepWidth = 2.1345 / (zoom * W)                      // DivUtils.pas:1027 — world units per pixel

// View basis (CalcVGradsFromHeader8rots, HeaderTrafos.pas:314) — rotate X→Y→Z, MB3D LEFT-handed:
function axis(seed) {                                 // seed = [1,0,0] right | [0,1,0] up | [0,0,1] fwd
  let [x1,y1,z1] = seed
  let x2=x1, y2=cx*y1+sx*z1, z2=cx*z1-sx*y1           // X (sx=sin wRotX, cx=cos wRotX)
  x1=cy*x2+sy*z2; y1=y2; z1=cy*z2-sy*x2               // Y
  return [cz*x1+sz*y1, cz*y1-sz*x1, z1]               // Z  → unit vector
}
R=axis([1,0,0]); U=axis([0,1,0]); F=axis([0,0,1])     // right / up / forward (view axis)

dist = midZ - dZstart                                 // orbit radius, world units (Mand.pas:2837)
P    = [midX, midY, midZ]                             // pivot
camPos = P - F*dist                                   // camera sits behind the pivot along −forward

// HANDEDNESS: MB3D LH (+Z into screen) → THREE RH (−Z forward). Negate z of every world vector:
flipZ(v) = [v[0], v[1], -v[2]]
P'=flipZ(P); camPos'=flipZ(camPos); U'=flipZ(U)
m = new THREE.Matrix4().lookAt(camPos', P', U')       // −Z points at pivot
quat = new THREE.Quaternion().setFromRotationMatrix(m)
```

Write: `cameraPos = camPos'` (sceneOffset zeroed) · `cameraRot = quat` · `targetDistance = dist` ·
`cameraMode = 'Orbit'` · `features.optics.camFov = fovY`. (Optional pixel-exact: subtract the viewplane
offset `VPoff = stepWidth*height*0.5/tan(fovY*π/360)` from `dist` — not needed for an Orbit camera.)

## Gotchas (from the recon)

- **wRot is RADIANS** — don't deg→rad again. **fovY is degrees** (×π/180 at read time). Fix the parseMB3D JSDoc.
- **Handedness** — must flip Z, or the scene renders mirrored/back-to-front. **Verify on an ASYMMETRIC scene**
  (a symmetric box/Menger hides Z-flip bugs). Asymmetric sample scenes: spineJulia, TreePlanet, Surreal shell.
- **Distance needs dZstart** — `zoom` only sets world-units-per-pixel, not distance. Without `dZstart` you can't
  place the camera; `midZ` is the pivot Z, not a distance.
- **`cameraRot {0,0,0,0}` is invalid** (breaks the camera) — identity is `{0,0,0,w:1}`.
- **Degenerate fallback** — if `zoom<=0` or the pose is NaN, keep the current centered default (don't ship a
  black/stuck camera). Stereo (`bStereoMode≠0`) / pano are out of scope; assume mono perspective.

## Verify

Render a handful via `debug/probe-mb3d-triage.mts`-style harness (or per-scene like the diag probes),
compare framing to the MB3D scene thumbnails, iterate on the Z-flip until an asymmetric scene matches
(not mirrored). Keep `test:mb3d:weave` 41/41 and the catalog render-triage all-GOOD.
