# Renderer side: what the deep zoomer must offer and accept

Reader: renderer-side (one of nine). Date 2026-10-07. Read-only pass; nothing was run.

Source read: `H:/GMT/workspace-gmt/mandelbulb_deepzoom/index.html` (the historical page, 3974 lines) and
`deep-zoom/bridge.ts` in the worktree. Line numbers are hints; the symbol is the locator.

State of the port: `deep-zoom/renderer/` does **not exist yet** in the worktree. What exists is an
earlier iframe shell (`deep-zoom/bridge.ts`, `DeepZoomApp.tsx`, `ui/*`) that drives the page through
`window.__dz` (version 1) plus loose `window.__*` handles. Everything below is therefore stated against
the page's script, which is what the port will carry verbatim.

Verdict words are about the GMT system on the other side of each seam. "ADAPTER" here means: the
change is inside the ported renderer module or the shell; no GMT/engine system is touched.

---

## 1. Facts

### 1.1 Camera and movement (seam a)

- **State.** `const cam = { pos:[0,0,2.6], yaw:-Math.PI/2, pitch:0, power:8, iters:14, baseSpeed:0.06 }`
  and `let camHP = cam.pos.map(hp.fromNum); // [DS-SEAM] authoritative position`. `hp = makeHP(256)`.
  `cam.pos` is only a double mirror (`cam.pos = camHP.map(hp.toNum)`).
- **Orientation is yaw and pitch only.** `function basis()`:
  `fwd=[cp*cy, sp, cp*sy]; right=[cos(yaw+PI/2),0,sin(yaw+PI/2)]; up = right x fwd`.
  `right` always has y = 0, so there is no roll anywhere, and pitch is clamped:
  `cam.pitch = Math.max(-1.55,Math.min(1.55, cam.pitch - e.movementY*0.0009))`.
- **Everything downstream takes three vectors, not angles.** Pass G and pass S receive
  `uRight, uUp, uFwd` (`SHADE_FRAG` uniforms; `drawDeep` sets `us.fwd/us.right/us.up` from `S.fwd` etc.).
  `fitRig(px, w, h, fwd, right, up)` and `rigDir(azDeg, elDeg, right, up)` also take the vectors.
  So the angle assumption lives in three places only: `basis()`, the mouse handler, and the
  view / path formats (`getView` returns `yaw, pitch`; the recorder pushes `yaw:cam.yaw, pitch:cam.pitch`;
  `capturePathFrame` measures rotation from `kfLastYaw / kfLastPitch`; the path sampler splines them).
- **Movement is already a displacement added to the exact position.** In `frame()`:
  `const speed = smoothedDist * cam.baseSpeed * boost * dt * 60;`
  `const mv=(v,s)=>{ for(let j=0;j<3;j++) camHP[j] += hp.fromNum(v[j]*s); ... orbitDirty = true; };`
  with W/S along `fwd`, A/D along `right`, **E/Q along world `[0,1,0]`** (not the camera's up).
  The same thing from outside exists: `window.__moveAlong = (dir, dist)=>{ for(...) camHP[j] += hp.fromNum(dir[j]*dist); ... }`
  (comment: "exact HP move (smoke-test dive)"). `dir` is a world-space double vector, `dist` a double;
  a double times a double keeps 53 bits of the *step*, and the sum is exact in the 256-bit position.
  That is the right shape for an outside navigator: it never needs to hold the position.
- **Absolute set.** `window.__setCamHP = (p)=>{ camHP = p.map(hp.fromNum); ... }` takes **doubles**
  (good to ~1e-16 only; useless below that). The exact one is `__dz.setView(v)`:
  `camHP = v.cam.map(BigInt); cam.yaw = +v.yaw; cam.pitch = +v.pitch;` (BigInt decimal strings).
- **Input capture is the page's own.** `canvas.addEventListener('click',()=>{ if (!inputLocked) canvas.requestPointerLock(); })`,
  a window `mousemove` that turns the camera while `document.pointerLockElement===canvas`, window
  `keydown/keyup` into `keys{}`. There is one switch: `window.__lockInput = (b)=>{ inputLocked = !!b; ... }`
  which blocks the keys and the pointer-lock click (written for test harnesses). With it on, the
  page's own flying is off and only `__moveAlong` / `setView` move the camera.
- **Field of view is a literal.** `Math.tan(0.5*1.1)` appears at 16 sites (grep `tan\(0\.5\s*\*\s*1\.1\)`:
  `fitRig`, `drawDeep`'s `us.fov`, every `x.fov` / `x.pixAng` upload, the probes, thumbnails, export).
  Rays are `normalize(uFwd + uFovScale*(uv.x*uRight + uv.y*uUp))` with `uv` = pixel / `uRes.y` (so
  +-0.5 vertically): half-height tangent 0.5*tan(0.55) = 0.3066, i.e. 34.1 degrees vertical. The path
  file writes `fovScale:1.1` (`__lastPath`) but nothing reads it back as a variable.
- **Iteration count follows depth inside the frame loop.**
  `if (autoIters && deepActive && smoothedDist > 0) { const rec = Math.min(160, 32 + Math.ceil(1.35 * Math.max(0, -Math.log10(smoothedDist)))); if (rec > cam.iters) {...} }`
  It only ever raises. Nothing outside needs to drive it.
- **Two renderers by depth.** `deepActive = deepProg && (modeOverride==='deep' || (modeOverride==='auto' && smoothedDist < 1e-4));`
  Above 1e-4 the page uses its f32 path; the G-buffer, the rig and the new look belong to the deep path.

### 1.2 What it can report (seam b)

- **Surface distance: free, every frame.** With the camera as the reference (`delta = 0`) it comes
  from the reference orbit already built on the CPU: `rawDist = Math.max(0, 0.5*curOrbit.Rk[ke]*Math.log(...)/curOrbit.DRk[ke])`,
  then `smoothedDist` falls instantly and rises slowly (`(1-Math.exp(-1.2*dt))`). Exposed as
  `window.__smoothedDist()` and `__dz.telemetry().depth`. Known weakness, recorded in
  `deep-zoom/bridge.ts` (`diveTo` comment): "that estimate comes from a reference orbit with a
  bailout of 2 and can be well over the true distance" - a navigator must not stride more than a
  small share of it per frame (the bridge uses at most 0.2).
- **A fitted surface plane and the depth range in view: exists, async, deep path and new look only.**
  `const rig = { n: null, near: -1, far: 1 }`, `window.__rig = () => rig`. Source: the G-buffer blitted
  to 32x32 (`RIG_N = 32`, `rigBlit`), read back through a pixel buffer behind a fence (`requestRig` /
  `pollRig`, "hands the fit over a frame or two later. One request in flight at a time"), smoothed
  (`trackRig(pollRig(), 0.3)`). `rig.n` is a unit normal toward the camera in world axes; `near/far`
  are the 5 % and 95 % depths as **log2 relative to `refE`** (`refE = Math.floor(Math.log2(dist))`),
  not lengths. `fitRig` returns null when fewer than 64 of the 1024 samples are surface. It is only
  measured when `look.mode === 1 && S.rig` (`drawDeep`), so with the classic look it is stale.
  Cost: one 32x32 blit plus a 4 KB async read per frame; the page calls it within the march's noise.
- **Depth under a pixel: the data is there, the function is not.** Pass G stores per pixel
  "x log2(t) - uRefE of the hit" (grep `PASS G OUTPUT`), kind in z (0 miss, 1 near hit, 2 far hit,
  3 exhausted), packed normal in w. The only reader today is `window.__readGbuf(n)`, which **re-renders**
  an n x n thumbnail and reads it synchronously - a referee tool, not a pick. A real pick is a 1x1
  `readPixels` on `gbufFbo` at the pixel (the page already does a 1x1 synchronous read twice a second
  for its `gateOn` check, so the cost class is known and small). From it the exact world point is
  `camHP + hp.fromNum(rd * 2^(x + refE))` - exact enough for an orbit pivot or a focus distance.
  The live frame is `frameLong` pixels on its long edge (default 320) and upscaled, so pointer
  coordinates must be scaled to the frame, not the canvas.
- **Not available:** a distance in any direction other than "nearest surface" (no collision probe
  along the movement vector), anything about what is outside the frame, and anything at all from the
  f32 path's picture (unverified whether it writes a G-buffer; `deepActive` suggests not).

### 1.3 Lights (seam c)

- **Three lights, each hard-wired by name.** `SHADE_FRAG` uniforms: `uLightDir` (key), `uFillDir`,
  `uKickDir`, `uFillCol`, `uKickCol`, key strength in `uLookB.x`, `uLightMode` (0 directional /
  1 headlamp / 2 both). In `main()` each is one hand-written line, e.g.
  `col += (dif + spc * pow(max(dot(n, normalize(uFillDir + v)), 0.0), shin)) * uFillCol * nf;`
  The key is always white: "the key is white times uLookB.x". There is no loop and no light count.
- **All three are directions; none has a position.** The directions are made on the CPU each draw:
  key and fill by `rigDir(az, el, right, up)` off the fitted plane (`rigKeyDir`, `look.keyAz/keyElev/keyTurn/fillAz/fillElev`),
  the kicker fixed to the camera: `const k = [0,1,2].map(i => -0.78 * S.up[i] - 0.62 * S.fwd[i]); // GMT's third light: fixed to the camera`.
- **The one positional light is the headlamp, and it shows how position works at any scale.**
  `float a = g.x < -1e29 ? 0.0 : exp2(min(g.x - uFalloffRel, 60.0)); ... / (1.0 + a*a)` with
  `gl.uniform1f(us.falloffRel, Math.log2(dist * falloffMul) - refE)`. Distance is never a length in
  the shader; it is a log relative to the view's scale. Everything in pass S is "in units of this
  pixel's depth" (comment on `shadowed`).
- **Shadows and occlusion are screen-space walks of the depth buffer.** `shadowed(c, Lc, rdC, n, Ldir, seed)`:
  20 geometric steps toward a **direction**, reach `uLookC.z` (= `look.shadowLen` 0.6, in depths),
  softness by tilting the direction (`uLookC.y`). Called for the key and the fill only
  ("Key and fill cast shadows, as there"); the kicker and headlamp cast none. `occlusion()` is 10
  taps, independent of any light, multiplies the whole colour ("as GMT"). The page states the limits:
  "They see one depth layer and only what is in the picture. A caster outside the frame, or behind a
  nearer surface, casts nothing" and "a real shadow ray here would be about a second march per
  shadowed light". Consequence already paid: "An export of the new look ... cannot be tiled".
- **The sky is two constants.** `skyDome(h)` = `mix(vec3(0.133,0.200,0.267), vec3(0.533,0.800,1.000), h)`,
  "up" being the fitted plane's normal (`uPlaneN`), strength `uLookB.y` (`look.sky * 0.33`).
- **Controls today:** `window.__look` (the live object) and `window.__setLook(o)` (`Object.assign(look, o); accumReset = true`).
  All light changes are uniforms; none recompiles. Pass S is a separate small program
  (`const shadeProg = mkProg(SHADE_FRAG)`), so changing its source does not touch the heavy pass G
  shader (whose second layout cost "8.6 s measured").

### 1.4 Material and colour (seam d)

- **Material = four floats.** `uniform vec4 uMat; // GMT's material: roughness, metallic, reflectivity, diffuse`,
  from `look.rough 0.75, look.metal 0.2, look.refl 0.6, look.diffuse 1.0`. The model is the page's
  copy of GMT's Blinn-Phong Direct shading (comment cites `engine-gmt/shaders/chunks/lighting`, grep
  `calculatePBRContribution`, `calculateShading` - that GMT file was **not opened** in this pass).
  No emission, no rim, no environment map, no reflections by marching.
- **Colour = one scalar per pixel through a 1-D lookup.** G-buffer y is "the palette parameter (near
  hits)"; `uColorMode` 0 plain / 1 iteration / 2 orbit trap is decided **in pass G** (`paletteParam(hitOrbit)`),
  so adding a colouring mode means touching the heavy shader. Pass S does
  `texture(uGradient, vec2(fract(s), 0.5))` when `uUseGradient == 1`, else a cosine palette;
  `albedoNew` applies `uColorScale` (repeat) and `uLookB.w` (saturation). No offset/phase, no second
  layer, no blend between layers.
- **Gradient input is a file.** `window.__loadGradient(file)`, `__loadGradientFile()` (opens a file
  picker), `__clearGradient()`. There is no "here are N RGBA texels" entry; the loader body was not
  read (unverified what sizes and formats it accepts).

---

## 2. What the ported module has to offer and accept

Sizes are for work inside `deep-zoom/renderer/` after the verbatim port. One session = one focused
working session of a few hours including its referee run.

**(a) Movement and orientation from outside**

| Need | Today | Change in the module | Size | Stays verbatim |
|---|---|---|---|---|
| Move by a view-relative displacement | `__moveAlong(dir, dist)` (world dir, absolute length) | Add `moveView(dx, dy, dz, units)` = basis vectors x `smoothedDist`-relative or absolute length; a thin wrapper over the same `camHP[j] += hp.fromNum(...)` line | 0.25 session | `camHP`, `makeHP`, orbit rebuild, `orbitDirty` |
| Switch the page's own flying off | `__lockInput(true)` | Rename as a proper `setInputOwner('host' or 'self')`; also gate the pointer-lock `mousemove` | 0.25 session | handlers themselves |
| Orientation from outside, with roll | yaw/pitch only in `basis()` | `basis()` returns from a stored unit quaternion (or three vectors) when one is set; yaw/pitch path kept as the default writer of that quaternion | 0.5 session for live view | pass G, pass S, `fitRig`, `rigDir` (all already take vectors) |
| ...and in saved views and flight paths | `getView/setView`, recorder, `capturePathFrame`, the spline sampler all store yaw+pitch | Path format v2: quaternion per frame, slerp/squad in the sampler, rotation distance from the quaternion; v1 files still load | 1 session, plus a path-replay referee | position spline on BigInt |
| Field of view | literal `Math.tan(0.5*1.1)` at 16 sites; path writes `fovScale:1.1` | One `fovScale()` read everywhere, including `pixAng` (detail), `fitRig`, thumbnails, export, the CPU probes | 0.5 session; accuracy referees must be re-run at a second FOV | everything else. Risk: the resolution caps and `surfMul` tuning were measured at 34.1 degrees only |
| Exact absolute position in/out | `__dz.getView().cam` (BigInt strings), `setView` | none | 0 | - |
| World "up" for E/Q | world `[0,1,0]` | Host decides (it sends the displacement) | 0 | - |

**(b) Reports for a navigation system**

| Report | Today | Change in the module | Size | Cost at run time |
|---|---|---|---|---|
| Surface distance | `__smoothedDist()`, `telemetry().depth` | Also expose `rawDist` (unsmoothed) and the mode (`deep`/`f32`) | 0.1 session | none (CPU, already computed) |
| Fitted plane + depth range | `__rig()`, new look only, log2-relative range | Measure whenever a host asks, not only when `look.mode === 1`; return range as multiples of the surface distance | 0.25 session | 32x32 async read, 1-2 frames late |
| Depth / world point / normal under a pixel | none live (`__readGbuf` re-renders) | `pick(x, y)` = 1x1 `readPixels` of `gbufFbo` -> `{ kind, t, normal, pointHP }`; an async (fence) variant for hover | 0.5 session | one sync 1-texel read per click; do not call per frame synchronously |
| Orbit about a picked point | none | `orbitAbout(pointHP, dYaw, dPitch)`: rotate the (small, double) offset `camHP - pointHP`, write back exactly | 0.5 session | none |
| Collision along a movement vector | none | Not offered. A host limits each stride to a share of the surface distance (0.2 is the bridge's tested figure) | - | - |

**(c) Lights from outside**

| Need | Today | Change in the module | Size | Stays verbatim |
|---|---|---|---|---|
| N lights instead of three named ones | three hand-written lines, key forced white | `const int MAX_LIGHTS` (8 is plenty); uniform arrays `uLDir[N]` (xyz = direction or position, w = type), `uLCol[N]` (colour x intensity), `uLParam[N]` (falloff as log2 relative to `refE`, shadow on/off, softness); one loop in `main()` replacing lines for key/fill/kicker/headlamp | 1 session + a picture-equality referee (the default rig must reproduce today's frame) | pass G entirely; `occlusion`, normals from depth, haze, tone map |
| Who places the lights | `rigDir` off the fitted plane, inside `drawDeep` | Keep `fitRig`/`rigDir` as one *placement mode* ("follows the surface"); add "fixed to camera" (the kicker and headlamp already are) and "fixed in the scene". The host sends, per light, mode + angles or position | 0.5 session | `fitRig`, `trackRig`, the three measuring modes |
| A point light at scale 1e-30 | only the headlamp (at the camera) | Position is held outside the shader: either camera-relative in units of the surface distance, or an exact scene anchor (three BigInts, e.g. from `pick()`), turned each frame on the CPU into `(lightHP - camHP) / 2^refE` - three O(1) floats. In pass S the vector to the light is `Lp/2^Lc - rd` in the pixel's own depth units, the same trick as `uFalloffRel`. No length ever enters f32 | included in the loop session above (+0.25) | - |
| Shadows for a point or spot light | `shadowed()` walks toward a direction | Pass a per-pixel direction and stop the walk at the light's distance: 3 lines. Each shadowed light = 20 more texel reads per pixel; cap shadowed lights (2-3) | 0.25 session | the walk itself |
| What those shadows cannot do | - | A light outside the frame, behind the camera, or behind a nearer surface is shadowed only by what is on screen. A scene-anchored light left behind by a dive is 10^n depths away and becomes, in effect, directional with no usable shadow. A true shadow costs "about a second march per shadowed light" in pass G - not proposed | - | - |
| Light gizmos / visible light spheres | none | Draw in pass S or as a shell overlay by projecting the camera-relative position; hide when behind the depth at that pixel (one `pick`-style compare in the shader) | 0.5 session, optional | - |
| Sky / environment | two constants in `skyDome` | Two colour uniforms (trivial). An environment *map* is a new lookup with a "which way is up" question at depth (today: the fitted plane's normal) | 0.1 session for colours; map = NOT-NOW | - |

**(d) Material and colour**

| Need | Today | Change in the module | Size | Stays verbatim |
|---|---|---|---|---|
| Roughness, metallic, reflectivity, diffuse | `uMat` via `__setLook({rough, metal, refl, diffuse})` | none | 0 | all |
| Gradient given as data | file only (`__loadGradient(file)`) | `setGradientTexels(Uint8Array, width)` uploading to the existing `gradientTex` | 0.25 session | `palette()` |
| Repeat / phase / saturation | `uColorScale`, `uLookB.w`; no phase | one `uColorOffset` float in pass S | 0.1 session | - |
| More colouring modes or a second layer | `paletteParam` in pass G, one scalar in G-buffer y | New modes change the heavy shader (its compile is the 8.6 s class) and a second layer needs a second free G-buffer channel - there is none (x depth, y palette, z steps+kind, w normal) | 2+ sessions each; NOT-NOW | - |
| Emission, rim, env reflections | absent | pass S only, no march | 0.25 session each if wanted | - |

---

## 3. Verdict table

"What it assumes today" is the renderer's side; the GMT-side assumption is another reader's file and
is marked where I rely on the brief rather than on code I opened.

| Sub-system | What it assumes today (renderer side) | Verdict | The rework, stated generically | Size | What GMT gains or risks |
|---|---|---|---|---|---|
| Navigation: fly movement | Renderer accepts a world displacement and keeps the exact position itself (`__moveAlong`); speed = surface distance x 0.06 per frame at 60 fps | **REWORK** (small) if GMT's navigation is to drive it; ADAPTER if the shell writes its own fly loop | The navigation system emits *intent* - a view-relative displacement scaled by a host-supplied "scene scale" number, plus an orientation - to a registered **camera sink**, instead of writing a position it owns. The sink owns precision. Scale comes from a registered provider (here: surface distance) | Navigation side: other reader. Renderer side: 0.5 session | GMT gains a navigation that no longer cares how position is stored, which is also what F8 (double-double) needs. Risk: GMT's own sink must reproduce today's motion exactly; saved `sceneOffset` untouched if GMT's sink is the current code |
| Navigation: position state | 256-bit fixed point inside the renderer; outside only as BigInt strings | **ADAPTER** | none - position never enters GMT's `VirtualSpace`. The shell stores the three strings as an opaque view value | 0 | No GMT risk. (Brief's fact, not re-read here: VirtualSpace is good to ~1e-16; even F8's ~1e-32 is 45 decades short of 1e-77, so it cannot hold this position either way) |
| Navigation: orientation | yaw + pitch, no roll, pitch clamped at +-1.55 | **ADAPTER** | Module accepts a quaternion (section 2a) | 0.5 session live, +1 session for paths | none |
| Navigation: orbit / focus on a point | No pick, no pivot | **ADAPTER**, depends on a "pick" capability | Module adds `pick` and `orbitAbout`. If GMT's orbit mode reads depth from GMT's own worker, that read must become a registered "depth under pointer" provider - REWORK on the GMT side only in that case (unverified) | 1 session in the module | GMT gains a seam any second renderer can fill |
| Navigation: speed / slow-down near surface | Proportional to distance, instant fall, slow rise; estimate can read high | **ADAPTER** | Module reports `rawDist` + smoothed; host caps stride at <= 0.2 of it | 0.1 session | none |
| Navigation: input capture (pointer lock, keys) | Page owns window key listeners and canvas pointer lock; `__lockInput` turns them off | **ADAPTER** | `setInputOwner` in the module | 0.25 session | none |
| Camera: field of view | Literal 34.1 degrees at 16 sites | **ADAPTER** | One variable in the module; re-referee | 0.5 session + referee time | none. Until done, any GMT camera panel must show FOV as fixed |
| Camera: iteration count with depth | Renderer raises it itself (`autoIters`) | **AS-IS** (renderer's own business) | - | 0 | - |
| Saved views / flight keyframes | yaw, pitch, BigInt strings, `fovScale:1.1` constant | **ADAPTER** | Path format v2 in the module (quaternion, FOV per frame) | 1 session | none |
| Light Studio: light list (N lights, colour, intensity, on/off) | Three named lights, key always white | **ADAPTER** on the renderer side; **REWORK** on the GMT side if the Light Studio writes straight to GMT's worker uniforms | Light Studio edits a plain list of light descriptions and hands it to a registered **light sink**; each sink declares what it supports (max count, types, per-light shadows, which placement frames). Controls a sink does not declare are not shown | Module: 1.5 sessions. GMT side: other reader | GMT gains a Light Studio usable by any renderer; risk is the usual one for a seam through a shipped panel - saved scenes must round-trip byte-identical |
| Light Studio: where a light is (its frame) | Directions hung off a plane fitted to the view, or fixed to the camera. No scene-fixed lights | **REWORK** | A light's placement carries a **frame**: scene, camera, or "view surface" (a plane the renderer reports). GMT today presumably has scene and camera frames only (unverified); the third is new and generic - any renderer that can report a dominant surface normal can offer it | Module 0.5 session; GMT side unverified | GMT could gain surface-following lights itself (useful at its own deeper zooms). Risk: a new enum value in saved lights - must default to today's behaviour |
| Light Studio: point / spot position | No positional light except the headlamp | **REWORK** (units) | Position expressed relative to an anchor and in units of a host-supplied scale, not as absolute scene coordinates in doubles. At 1e-30 an absolute f64 position cannot say "a little to the left of the camera" | Module: in the loop session. GMT side: depends on how Light Studio stores positions (unverified) | Gain: light positions that survive any scale. Risk: touches saved light positions - needs a no-op conversion for GMT's existing scenes |
| Light Studio: draggable light gizmo in the viewport | Nothing to project against but the camera basis | **ADAPTER** with `pick`; NOT-NOW for a first shell | Module projects camera-relative positions; depth test against the G-buffer | 0.5 session | none |
| Light Studio: shadows (per-light on/off, softness) | Screen-space depth walk; directional; key + fill only | **ADAPTER**, with a declared limit | Per-light shadow flag and softness map onto `shadowed()`; point lights get a per-pixel direction. The sink declares "shadows: screen-space, max 2-3 lights" so the UI can say what it is by name | 0.25 session | none. Not a match for GMT's marched shadows; off-screen casters cast nothing |
| Ambient occlusion | Screen-space, 10 taps, light-independent, strength + radius | **ADAPTER** | Map two numbers | 0 | none |
| Sky / environment light | Two fixed colours, "up" = fitted plane normal | **ADAPTER** for colours; **NOT-NOW** for an environment map | Would apply once a map lookup and an "up" convention at depth are decided | 0.1 session | none |
| Material (roughness, metallic, reflectivity, diffuse) | Four floats, GMT's Blinn-Phong copy | **AS-IS** for those four through `setLook`; **NOT-NOW** for emission, rim, marched reflections | Emission/rim are pass-S-only additions (0.25 session each) when wanted | 0 | none |
| Colour: gradient | 1-D strip texture, from a file picker only | **ADAPTER** | Module accepts texels; shell feeds it the engine's gradient ramp | 0.25 session | none |
| Colour: mapping modes, layers | One scalar per pixel chosen in pass G; no free G-buffer channel | **NOT-NOW** | Applies when a second colour layer or new mappings are wanted: needs pass G changes and a wider G-buffer | 2+ sessions each | none |
| Tiled / bucket export with the new look | "cannot be tiled" - shadows and occlusion read the whole picture | **NOT-NOW** for GMT's bucket renderer | Would apply only with marched shadows or a full-size G-buffer strategy per bucket | - | none |
| Shallow views (surface distance > 1e-4) | A different, f32 renderer; rig / G-buffer / new look belong to the deep path | **ADAPTER**, and a gap to state | Either force `__setMode('deep')` for the shell or accept that plane, pick and N lights are absent above 1e-4 until the f32 path is given the same pass S | 0.25 session to force; unverified cost | none |

---

## 4. The reworks that matter most

1. **Navigation emits intent to a camera sink; it does not own the position.** The renderer is
   already built for this (`camHP[j] += hp.fromNum(v[j]*s)`); GMT's navigation is the side that
   assumes it holds the number. No precision upgrade to `VirtualSpace` reaches 1e-77, so the only
   route that lets GMT's navigation fly the deep zoomer is displacement-in, exact-position-stays-inside,
   with scale (surface distance) and optional pick supplied by registered providers.
2. **Light placement gets a frame and scale-relative units.** "Follows the view's surface", "fixed
   to camera", "fixed in scene", with positions relative to an anchor in units of a host scale. This
   is the one Light Studio concept the deep zoomer cannot fake with an adapter, because an absolute
   double position is meaningless at 1e-30.
3. **Light Studio talks to a light sink with declared capabilities** (count, types, shadow kind,
   frames). Renderer side it is 1.5 sessions in pass S and `drawDeep`, with pass G untouched.

Renderer-side total if all ADAPTER rows are built: about 6-7 sessions (movement/orientation 1.5,
path format 1, FOV 0.5, reports + pick + orbit 1.5, N lights + placement + point shadows 2, gradient
and small colour 0.5), each needing its own referee run on the GPU.

---

## 5. Unverified

- `deep-zoom/renderer/` does not exist yet; nothing about what the port exposes could be checked.
  `plans/deep-zoom-shell/BLUEPRINT.md` and `ENGINE-GAPS.md` exist and were **not opened**.
- Every statement about GMT's side (navigation plugin, `VirtualSpace`, Light Studio storage, GMT's
  light types and frames, how GMT's orbit mode gets depth) is from the brief or inference; no file
  under `engine/`, `engine-gmt/` or `app-gmt/` was opened in this pass.
- The page's claim that its shading equals GMT's Blinn-Phong (`calculatePBRContribution`,
  `calculateShading`) was not checked against `engine-gmt/shaders/chunks/lighting`.
- Whether the f32 path (surface distance > 1e-4) writes a G-buffer or can use pass S: not read.
- `hp.fromNum` body (line ~1850) not read: the claim "a double step is added exactly" rests on the
  `[DS-SEAM]` comment and on `__moveAlong`'s "exact HP move" comment.
- `__loadGradient` body not read (accepted image sizes/formats unknown).
- The path sampler's orientation interpolation was seen only through grep hits (`kfLastYaw`,
  `__samplePath`), not read in full; "1 session" for path format v2 is an estimate.
- Compile time of `SHADE_FRAG` after adding a light loop: assumed small because it is a separate
  program from pass G; not measured (GPU off limits for this job).
- All sizes are estimates from reading; none was tried.
