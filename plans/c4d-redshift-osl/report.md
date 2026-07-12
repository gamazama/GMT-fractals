# GMT to Cinema 4D / Redshift: Raymarched Fractal Pipeline -- Feasibility & POC

*Research + proof-of-concept report. Audience: the GMT author. Decision-grade, honest, concrete.*

---

> ## ⏸ STATUS (2026-06-25): PARKED
>
> **Decision: shelved until Redshift gains an SDF-as-geometry hook.** The POC proved the technical points below, but also proved the ceiling: an OSL shader in Redshift can only *shade an existing surface* (the bounding-cube proxy) — it cannot define geometry the renderer intersects. So there is no true depth, self-shadowing, GI, reflection/refraction or DOF on the fractal itself — only a front-surface look. Self-lit emission looked "homebrewed"; the shaders were reworked to "let RS light it" (below), which is better but still capped by the proxy-depth wall.
>
> **The bar is Octane Vectron**, which works because Octane exposes SDFs as *native procedural geometry* (OSL returns a distance; Octane's path-tracer intersects it as real geometry — full lighting, animated, zero mesh/VRAM). Redshift has no equivalent. Mesh/VDB was ruled out by the user (slow + not animatable).
>
> **Work preserved & reusable:** the three `.osl` shaders here were ported from GMT's GLSL DEs and reworked to output albedo + object-space normal + AO + cutout alpha (`selfLit=0` = let RS light it; `selfLit=1` = legacy preview). The hard part — the OSL distance functions (`mandelDE`, `apolloDE`, the Sierpinski fold) — **transfers directly to Octane Vectron**, where it would get the native treatment. Revisit if (a) Redshift ships SDF geometry, or (b) an Octane Vectron POC is wanted.

## 1. Executive Summary

**Verdict: GO -- WITH CAVEATS.**

Taking GMT's raymarched distance-estimated (DE) fractals into Cinema 4D 2026 + Redshift via a hand-marched OSL surface shader is **technically sound and architecturally well-understood**, and three proof-of-concept shaders (Mandelbulb, Sierpinski tetrahedron, Apollonian gasket) are already written and DE-verified against the GMT source. Every load-bearing capability the approach depends on has been independently verified against Maxon docs, the OSL spec, and Redshift practitioner write-ups (Section 2). Redshift runs OSL on the GPU, supports the bounded loops a sphere-trace needs, loads a user `.osl` directly, and exposes the globals (`P`, `I`) required to reconstruct a camera ray. The architecture -- march the fractal on a bounding-cube proxy, emit color/opacity through *named ports* (not closures), transparent on miss -- is the only viable shape and the POC shaders implement it correctly.

**The single biggest risk is that nothing has been compiled inside an actual Redshift instance yet.** The shaders are verified *as DE ports* and *as architecture*, not *as RS-GPU-compilable programs*. The specific first-compile gate is **GPU-compiler tolerance of the OSL constructs used** -- array initializers (`vector koff[4] = {...}`), indexed component writes (`p[0] = ...`), and 64-512-iteration nested loops. The OSL *language* permits all of these and official RS example shaders use loops up to 512 steps, but no documented hard cap exists and heavy/unsupported constructs silently fall back to CPU or fail to compile on a given backend (CUDA/OptiX vs Metal vs HIP). Until a real RS 2026.x build compiles and renders these, "feasible" means *feasible by construction*, not *demonstrated*.

Secondary risks, all bounded and addressed in-shader: AO is a heuristic (step-ratio, not traced -- `trace()` is unreliable in RS); per-scene tuning of `scale`/`fit`/`minDist` is expected; and the most-likely ray-reconstruction fix is the `I` sign and the `transform()` space-string (world vs object).

---

## 2. Redshift OSL Capability (VERIFIED)

All four claims below were run through both a confirm and a refute lens (`verify.json`). Verdicts and sources follow each.

### 2.1 GPU execution + loop limits -- **CONFIRMED** (confirm + refute both held)

Redshift executes OSL **on the GPU** across all three backends: CUDA/OptiX (NVIDIA), Metal (Apple), HIP (AMD). The decisive evidence is that AMD support was specifically gated on putting OSL *inside HIP* (AMD's GPU-compute API) -- if OSL ran on CPU, that gating would be unnecessary. OSL has been supported since April 2021; HIP/AMD became official around RS 3.6 (2024); RS 2026.x adds OSL `dx()`/`dy()` derivative support and fixes an "OSL node not found in the shader kernel" bug ("shader kernel" = GPU compute kernel) -- so OSL is live and actively maintained in the target build.

**Bounded loops work.** The OSL spec permits `for`/`while`/`do`/`break`/`continue` with *runtime* (non-constant) bounds. Official Maxon RS OSL shaders prove it on the GPU: `ParallaxOcclusionMapping.osl` runs a `while` march loop with per-step `texture()` lookups, bounded by `numLayers` *capped at 512*; `KuwaharaFilter.osl` runs nested `for` loops with a runtime-computed bound (`radSteps = int(Radius*1000)`) reaching thousands of iterations.

**No documented hard iteration cap.** The practical limit is GPU compile/perf: high iteration counts raise register pressure -> lower occupancy / spilling -> slowdown, and unsupported constructs fall back to slower CPU. A 64-512-step march is within demonstrated range but is *capability-confirmed, not application-demonstrated* -- no official raymarched 3D DE fractal example exists. The one documented OSL loop restriction (no closures inside loops, RS 2026.2 validation) does **not** affect a march loop: the loop computes only floats/vectors and any closure is emitted once after it.

- Sources: irendering.net/choosing-amd-gpus-for-redshift-all-things-you-need-to-know/ ; cgchannel.com/2021/08/redshift-gets-new-easy-ui/ ; github.com/Maxon-Computer/Redshift-OSL-Shaders (ParallaxOcclusionMapping.osl, KuwaharaFilter.osl) ; support.maxon.net/hc/en-us/articles/22785884501532-Redshift-2026-0-0-2025-09-September-10-2025 ; open-shading-language.readthedocs.io/en/latest/syntax.html ; en.wikipedia.org/wiki/Open_Shading_Language

### 2.2 Surface emission / no shader-generated geometry -- **CONFIRMED** (confirm + refute both held)

An OSL **surface shader cannot relocate the ray-surface hit point.** The OSL spec is explicit: surface shaders "may not alter the position of the surface"; "one may only call `displace()` or alter `P` in a displacement shader" -- and Redshift never runs OSL as a displacement shader (it feeds OSL values into its *native* normal-offset Displacement node). So there is **no pure-OSL "shader generates geometry" path.** The fractal must live on a bounding proxy mesh and be cut out by Opacity on ray-miss.

**Output via named color/float ports, NOT closures.** Redshift implements only the *deprecated* `diffuse`/`oren_nayar`/`microfacet` closures; other closures (emission, glass, etc.) fail to compile or **crash the RS core**, and a closure output wired to a material input is *silently ignored*. The supported, robust path is plain `output color` / `output float` ports: `outColor -> Emission Color` (Emission Weight 1), `outAlpha -> Opacity`. This is exactly what the POC shaders do.

**`trace()` and `getattribute()` are unreliable** in RS OSL (silently return black). Therefore AO and self-shadow must be **hand-marched** -- they cannot be queried from the renderer.

- Sources: open-shading-language.readthedocs.io/en/main/grosssyntax.html ; microbion.co.uk/html/osl_1.htm ; microbion.co.uk/html/osl_3.htm ; pixelnpixel.com/hidden-power-of-redshifts-osl-shaders/ ; support.maxon.net/hc/en-us/articles/25598911679644-Using-the-OSL-shader-in-Redshift-Part-1 (KB 403'd to automated fetch; corroborated via the above)

### 2.3 .osl loading -- **CONFIRMED, with a caveat** (confirm held; refute downgraded one sub-claim to partial)

RS in C4D 2026 loads a user `.osl` via the **OSL Shader / OSL Script node**: File mode (folder icon -> path) or Text mode (paste into the Code field). Variables declared in the `.osl` signature -- inputs *and* `output` vars -- auto-expose as node ports you wire into a Standard Material. Confirmed live in the 2026 line by release notes (2026.4.0, Mar 2026, fixes an OSL-node-in-shader-kernel bug).

**Caveat (the refute lens):** what reaches the material is a *value* (color/float/vector driving Base Color / Emission / Opacity / Bump), **not a BSDF closure** -- a true surface-closure output is ignored (see 2.2). Practical friction: external `.osl` file paths can break on another machine; `#include` files must sit in the same folder *and* often need a C4D restart before RS sees them. **RS OSL is reported crash-prone -- save the scene before compiling.** (2026 capability is inferred from 2024-25 evidence + 2026.x release notes; no removal indicated.)

- Sources: help.maxon.net/c4d/2025/en-us/Subsystems/Default/Content/html/OSL_Shader.html ; support.maxon.net/hc/en-us/articles/26688356633756-Redshift-2026-4-0-2026-03-March-17-2026 ; artlets.tawk.help/article/how-to-use-osl-in-redshift-3d-and-cinema4d ; microbion.co.uk/html/blog29_10_24_osl_2.php

### 2.4 VDB fallback path -- **CONFIRMED, with a caveat** (confirm held; refute flagged a fidelity gap -- see Section 6)

A fractal SDF can be voxelized into an OpenVDB grid and loaded as a Redshift Volume in C4D -- both halves are officially documented and a community fractal->VDB->C4D pipeline exists. The caveat: RS renders VDB as **fog/density**, not as an SDF surface, and it is cleanest as a **separate CPU-side bake**, not inside RS OSL (OSL does not work with RS volume shading). Detail in Section 6.

- Sources: help.maxon.net/c4d/s26/en-us/Content/_REDSHIFT_/html/Volume+Object.html ; .../Volume+Rendering.html ; openvdb.org/documentation/doxygen/codeExamples.html ; github.com/lindaterlouw/openvdbfractals

---

## 3. The Raymarch-in-OSL Architecture

Because an OSL surface shader can only *shade an existing surface point* (2.2), the fractal is rendered as an **illusion on a bounding-cube proxy**:

1. **Bounding proxy.** Assign the OSL material to a cube (C4D Cube, size 2 -> object space `[-1,1]`, or a unit cube `+/-0.5` for apollonian.osl). The fractal is marched *inside the cube's object space* so it stays rigid to the cube's transform -- scale/rotate/translate the cube to place the fractal.

2. **Camera-ray reconstruction from `P` & `I`.** The shading point `P` (the cube's front-face entry) is the ray origin; the incident vector `I` (camera -> P) is the direction. Both are transformed `common -> object` so the march runs in the cube's local frame:
   ```
   point  ro = transform("common", "object", P);
   vector rd = normalize(transform("common", "object", I));
   ```
   This is the **most fragile line in the whole approach** -- see Section 9 (`I` sign convention; world-vs-object space-string).

3. **Slab clip + sphere-trace.** A ray/AABB slab test bounds the march to the cube exit (never march past the proxy). Then a bounded sphere-trace: evaluate the DE, step by `de_obj`, hit when `de_obj < eps`.

4. **Adaptive epsilon.** The hit threshold grows with march distance `t` (`eps = minDist * (1.0 + t)` in mandelbulb.osl) to absorb DE precision loss far from the cube entry -- the OSL-scale analogue of GMT's `PRECISION_RATIO_HIGH` + cone-footprint epsilon.

5. **Normals -- 4-tap tetrahedron technique** (ported verbatim from GMT `material_eval.ts`): evaluate the DE at four tetrahedral offsets `(+,-,-)`, `(-,-,+)`, `(-,+,-)`, `(+,+,+)` and build the gradient. Robust for loose IFS DEs. (mandelbulb.osl inlines the four DE evaluations because OSL forbids recursion; sierpinski/apollonian call a shared `*DE()` helper four times.)

6. **Hand-marched AO.** `trace()` is unreliable, so AO is a **heuristic**: `ao = 1 - aoStrength * (stepsTaken / maxSteps)`. Surfaces reached in few steps are "open"; many steps => crevice. Cheap and stable, but not physically traced.

7. **Output: emission + opacity.** On hit -> `outColor` = shaded color, `outAlpha = 1`. On miss -> `outColor = 0`, `outAlpha = 0` (cube proxy vanishes). Wire `outColor -> Emission Color`, `outAlpha -> Opacity`.

**Why not pure-shader geometry?** Because OSL physically cannot create or relocate geometry (2.2). The renderer's integrator owns ray tracing; an OSL surface shader only answers "what color are you at this point?". The proxy-cube march is the established workaround (cf. interior/parallax box shaders), and the only one that fits the OSL contract on the one GPU OSL host that exists.

---

## 4. GLSL -> OSL Port Path from GMT

GMT already implements **all three target DEs in GLSL**, plus Julia3D, Kleinian, and MandelBolic available for a later pass. The POC DEs were ported verbatim from:

- **Mandelbulb** -- `engine-gmt/formulas/Mandelbulb.ts` (lines 13-68): analytic `dr = r^(p-1)*p*dr + 1`, spherical exponentiation, Hubbard-Douady DE `0.5*log(r)*r/dr`.
- **Sierpinski tetrahedron** -- `engine-gmt/formulas/SierpinskiTetrahedron.ts` (lines 13-59): 3-plane tetrahedral fold + per-fold scale; linear IFS estimator `length(p)*scale^-iters`.
- **Apollonian** -- `engine-gmt/formulas/Apollonian.ts` (lines 61-98): per-axis fold-scale, `[-1,1]` modular fold, sphere inversion `t/|z|^2`, reference DE `0.375*|z.y|/dr`.

The raymarch loop, adaptive epsilon, and tetrahedron normal were modeled on `shaders/chunks/{trace,de,material_eval}.ts`.

**What ports cleanly:**
- Core float/vector math, `sin`/`cos`/`acos`/`atan2`/`log`/`pow`/`length`/`dot`/`mix`/`clamp` -- all present in OSL.
- The DE loop bodies almost 1:1; GLSL `fract(x)` -> `x - floor(x)`; `step`/`mix` fold form -> equivalent branch form (sierpinski).
- Orbit-trap accumulation and color mixing.

**What needs rework:**
- **Type system.** GLSL `vec3` -> OSL `vector`/`point`/`color` (distinct types; choose deliberately). GLSL `vec2`/`vec4` have no direct OSL analogue -- decompose into scalars or `vector`.
- **Swizzles vs indexing.** GLSL `z.xy = ...` swizzle-assignment is **not** in OSL; use component indexing `z[0]`, `z[1]` (note: indexed *writes* are a GPU-compiler tolerance risk -- see Section 9).
- **No nested/recursive functions inside `shader{}`.** GMT's `map()`->`getDist()` call structure is flattened: helpers are file-scope functions (sierpinski/apollonian) or inlined (mandelbulb's normal taps).
- **Closure -> named-port output.** GLSL writes to a framebuffer; OSL must output `color`/`float` ports (2.2). No `Ci`/closure reliance.
- **C-style casts not allowed.** OSL needs constructor syntax (`float(n)`, `vector(...)`), not `(float)n` -- *this was a review fix in apollonian.osl*.
- **Precision.** GMT runs f32 with deep-zoom machinery (double-double view-center, `PRECISION_RATIO_HIGH ~ 1e-20`). OSL is f32 with no deep-zoom path; the adaptive-epsilon constants are re-calibrated for shallow object-space marching, and deep zoom is **out of scope** for the OSL port.

---

## 5. C4D 2026 Plugin Landscape

C4D 2026 supports **both** the classic C++ Cinema API (ObjectData/ShaderData/TagData/CommandData/NodeData, not deprecated) and a fully-supported Python SDK; the modern maxon API coexists rather than replacing them.

**The decisive finding:** Maxon's SDK specialist states there is *"no dedicated API for Redshift... instead you just use the general purpose Nodes API,"* and the RS node graph is reachable from **both** C++ and Python. **A compiled C++ plugin buys no privileged Redshift access that Python lacks.**

### Recommended minimum-viable v1 packaging -- **no compiled plugin**

A single drop-in folder:
1. The GMT fractal **`.osl`** (this folder's three shaders).
2. A **`.c4d` scene/material preset** (prefer embedding the OSL via Text mode to dodge external-path breakage).
3. One **Python script/tag** (CommandData menu command or Python Tag) that: builds the RS+OSL node material via the Nodes API; creates a low-res Volume Loader for the VDB preview; keyframes params; and merges the FBX camera rig.

This installs by drop-in and runs across C4D 2024/2025/2026 with far less version coupling than a compiled plugin.

**Windows toolchain (only if/when C++ enters scope):** CMake 3.30+ (the generator -- the legacy standalone Project Tool is retired), Visual Studio 2022 with the **v143** MSVC toolset (or VS2022 ClangCL), **C++20** (`CMAKE_CXX_STANDARD=20`, do not change), x64 output `.xdl64`. ARM64 Windows added in 2026.3.

**When a compiled plugin becomes worth it (v2+):** when you want a *native generator object* (ObjectData) in the Object Manager with a polished attribute UI and tighter UX. The cost is a CMake/VS2022/v143/C++20 build you must redo and re-test per C4D release, plus an ABI tied to each version. Not a blocker for shipping the fractal.

**The one durable risk in *both* paths:** RS node/port string IDs are *"currently not exposed"* in either API and must be harvested via the Node Editor's ID display (CTRL+E). They can drift between RS versions. A C++ plugin does **not** immunize you. Mitigation: pin tested RS versions, centralize all RS IDs in one constants table, add a runtime self-test that re-resolves IDs.

- Sources: developers.maxon.net/docs/cpp/ ; developers.maxon.net/docs/py/ ; .../manual_build_systems_generate.html ; developers.maxon.net/forum/topic/15356 (Ferdinand: no dedicated RS API; IDs not exposed) ; github.com/Maxon-Computer/Cinema-4D-Python-API-Examples/.../create_redshift_nodematerial_2024.py ; support.maxon.net/hc/en-us/articles/25635600919324-How-to-use-Python-with-Redshift-materials

---

## 6. Low-Res VDB Viewport Fallback

The OSL raymarch is real-only in the Redshift IPR (the C4D editor viewport shows just the proxy cube, or a VDB volume as a bounding box / points). For a coarse interactive preview, bake the fractal into an OpenVDB grid and render it as a separate **Redshift Volume**.

**Recommended pipeline (separate CPU-side bake -- `vdb-path` confirmed):**
1. Sample the *same DE + params + transform* into a `FloatGrid` over a coarse voxel grid (~128^3-256^3): per-voxel `accessor.setValue(ijk, de)` into a narrow band, then `openvdb::tools::signedFloodFill()` to propagate inside/outside sign.
2. Convert/threshold the SDF into a density (fog) grid (`sdfToFogVolume`) and write `.vdb`.
3. In C4D, load via a Volume Loader (`c4d.Ovolumeloader`, type ID 1039866) -> RS Volume shader, mapping the named grid to **Scatter** (`density`); add a light with volume contribution > 0 (else it renders black).

**Honest fidelity gap (the refute lens flagged this):** RS renders the VDB as **fog/density, not an SDF surface** -- it reads as a soft cloud of the volumetric *bulk*, not the crisp raymarched surface the OSL shader produces. It is a *preview of the bulk*, not a look-matched stand-in. The volume must fit entirely in VRAM (no out-of-core), and it is a static baked grid -- re-voxelize to change params. Cost scales O(N^3); discipline is coarse for preview, fine only for final.

**Why not inside RS OSL:** OSL does **not** work with RS volume shading. The OSL raymarch (surface material on a proxy) and the VDB proxy (separate Volume object) are two distinct render paths sharing only the DE math + params. C4D's native **Formula Field cannot iterate** (single closed-form, no loops) so it cannot express a DE; the **Python Field** *can* (per-sample-block `Sample()`), but it is CPU/interpreted and slow -- fine as a self-contained fallback, not for live tweaking. For interactivity, an out-of-process C++/Houdini baker writing `.vdb` that C4D hot-reloads beats the C4D Python Field.

- Sources: as Section 2.4, plus developers.maxon.net/forum/topic/13608 (Volume Loader) ; help.maxon.net/c4d/2026/.../Content/html/6194.html (Formula Field) ; developers.maxon.net/docs/py/2024_0_0/manuals/manual_py_field_object.html (Python Field) ; github.com/ObeidaZakzak/Houdini-VEX-Mandelbox

---

## 7. Animation + Camera

**Driving params over time.** OSL input params auto-expose as RS node ports, and node ports are keyframable from Python: `nimbusRef = nodeMaterial.GetNimbusRef(nodespaceId)` -> `descID = nimbusRef.GetDescID(port.GetPath())` -> `obj = nodeMaterial.GetBaseListForNode(...)` -> `obj.FindCTrack(descID)` (standard CTrack/CCurve/CKey). `SetPortValue`/`GetPortValue` require C4D 2024.0+. So `power`, `iterations`, `scale`, `lightDir`, color stops, etc. all animate.

**Reusing GMT's existing FBX/AFX camera-rig export.** GMT already has an FBX camera-rig exporter and an AFX (After Effects) comp exporter (camera/lights/params, deep-zoom re-basing to start frame). Reuse the FBX path to match framing in C4D: `c4d.documents.MergeDocument()` with SCENEFILTER flags merges the camera+animation; configure the importer via `c4d.plugins.FindPlugin(c4d.FORMAT_FBX_IMPORT, c4d.PLUGINTYPE_SCENELOADER)` + `FBXIMPORT_*`.

**Two gotchas:** (1) `MergeDocument()` does **not** preserve the loaded file's active camera -- the script must explicitly find the imported camera and set it active / link it to the render scene. (2) Validate units, axis, and frame rate round-trip; a C4D-tuned export profile may be needed. Note the OSL fractal is *fit to a proxy cube in object space*, so matching GMT framing means matching the cube's world transform to GMT's camera-relative fractal placement, not just importing the camera.

- Sources: developers.maxon.net/forum/topic/14481 (RS-port keyframing) ; developers.maxon.net/docs/py/2025_1_0/modules/c4d.documents/ (MergeDocument, active-camera gotcha) ; developers.maxon.net/forum/topic/14086 (FBX importer settings)

---

## 8. The 3 POC Shaders

All three are written (313-345 lines), DEs ported verbatim from GMT and verified correct against the source files. Review fixed a C-style cast in apollonian.osl and an illegal closure assignment in sierpinski-tetrahedron.osl. **`readyToTest = true`. Nothing has been compiled in an actual Redshift instance yet.**

### 8.1 `mandelbulb.osl` (345 lines)
- **What:** sphere-traces the classic power-8 Mandelbulb in triplex coords; analytic `dr`; Hubbard-Douady DE. Adaptive epsilon `minDist*(1+t)`. 4-tap tetrahedron normal (inlined x4 -- OSL forbids recursion).
- **Key params:** `power` (2-16), `iterations` (1-64), `bailout`, `maxSteps` (16-512), `minDist`, `scale` (object->fractal fit ~2.2), `offset`, `colorA/B`, `lightDir`, `aoStrength`, `ambient`.
- **Risks:** heaviest inner cost (spherical trig x iterations x march steps x 4 normal taps) -> highest GPU-compile/perf risk of the three. `Ci` closure included for spec-compliant renderers but ignored by RS.
- **Readiness:** ready to test.

### 8.2 `sierpinski-tetrahedron.osl` (313 lines)
- **What:** 3-plane tetrahedral fold IFS (Tetrix); branch-form fold (GLSL step/mix equivalent); linear estimator `length(p)*scale^-iters`. Shared `sierpinskiDE()` + `sierpinskiNormal()` helpers; `cubeSlab()` AABB clip.
- **Key params:** `scale` (1.1-4, ~2.0 classic), `iterations` (clamped to 64), `foldOffset` (1,1,1), `twist`, `fractalFit`, `maxSteps`, `minDist`, `maxDist`, `colorA/B`, `lightDir`, `ambient`, `aoStrength`, `emissionGain`.
- **Risks:** lightest DE (cheapest of the three). Linear estimator can over-step on a loose IFS -> tune `minDist`/`fractalFit`. No `Ci` written (the review-fixed illegal closure assignment was removed).
- **Readiness:** ready to test.

### 8.3 `apollonian.osl` (316 lines)
- **What:** per-axis fold-scale -> `[-1,1]` modular fold -> sphere inversion `t/|z|^2`; reference DE `0.375*|z.y|/dr`. Ray-constant modulation factor `t` (kosalos) precomputed once from the initial fractal-space position, matching GMT's `loopInit`. Declared as `surface` (vs `shader`); 4-tap tetrahedron normal via shared `apolloDE()`.
- **Key params:** `iterations` (1-40), `foldScale` (uVec3A; cc=this+1), `scale`/`foam2`/`modAmt` (paramA/B/C, sensitive ~1.0-1.6), `deCoef` (0.375), `maxSteps`, `minDist`, `maxDist`, `fitScale`/`fitOffset`/`cubeHalf`, `colorA/B`, `lightDir`, `ambient`, `aoStrength`, `emissionGain`, `trapGamma`.
- **Risks:** most parameter-sensitive (foam/inversion strength); inversion DE division needs numerical guards (present: `r2`/`dscale` floors). Writes `Ci = shaded * emission()` at the end -- documented as RS-ignored; harmless on RS but a crash-watch on the first compile.
- **Readiness:** ready to test.

---

## 9. Risks & Open Questions (honest)

**Top risk -- uncompiled in RS + GPU loop-compile tolerance.** The shaders are DE-verified and architecturally correct but have *never been compiled in Redshift*. The first-compile gate is whether the RS GPU backend tolerates **OSL array initializers** (`vector koff[4] = {...}`), **indexed component writes** (`p[0] = px`), and **64-512-iteration nested loops** without falling back to CPU or failing to compile. The language permits all three; the GPU compiler's tolerance is empirical per backend (CUDA/OptiX vs Metal vs HIP) and RS version.

**Most-likely ray-reconstruction fix:** the `I` sign convention (camera->P vs P->camera) and the `transform()` space-string. If the fractal renders mirrored, inverted, or empty, flip `I` and/or check world-vs-object space. (Note: mandelbulb.osl and apollonian.osl use `transform("common","object",...)`; sierpinski.osl uses the two-arg `transform("object", P)` form -- reconcile these on first compile.)

**AO is a heuristic** (step-ratio), not traced -- `trace()` is unreliable in RS. Acceptable for the look; not physically accurate.

**Per-scene tuning expected:** `scale`/`fit`/`minDist`/`maxDist` interact with cube placement and camera distance; defaults frame each fractal but will need adjustment per shot.

**Open questions (from `res_osl_rs.json`):**
- Max loop count before OSL GPU compile fails / falls back to CPU on CUDA vs Metal vs HIP in RS 2026.x?
- Can Opacity alone cut a proxy-mesh fractal silhouette + depth, or is displacement required, and does GI/shadow composite correctly?
- Does non-closure emission/color output receive GI bounces and cast/receive shadows, or read as an unlit emissive blob?
- Is per-pixel `P`/`I` robust across *secondary* rays, so the march survives reflections/refractions?
- Verbatim closure/output list from the gated Maxon KB Part 1/Part 2.

**Prior-art reality check:** no documented self-contained GPU DE-raymarcher of these fractals exists *inside* Arnold/Redshift/C4D. The canonical references are all GLSL (iq, Syntopia, Fragmentarium). In-DCC Mandelbulb today is point-cloud geometry (Arnold's AiPoints) or cloner distribution (C4D Nodes); OSL DE-raymarchers exist only in Blender Cycles (CPU-only, volume-in-a-cube, ~512 SPP, multi-day). This POC is **novel territory** -- which is exactly why the uncompiled-in-RS risk dominates.

- Sources: res_osl_rs.json openQuestions ; res_priorart.json (iq mandelbulb DE, Syntopia series, Arnold AiPoints, loicvdb/OscarSaharoy Cycles OSL, Maxon RS OSL repo has no fractal)

---

## 10. Recommended Build Order

1. **POC compile-validate in RS (first, gates everything).** Load each `.osl` into an RS OSL node on a proxy cube; SAVE before compiling (crash-prone). Confirm it compiles on the GPU (watch for CPU fallback / compile failure). Fix the ray reconstruction (`I` sign, transform space), then `scale`/`fit`/`minDist`. Validate the look against a GMT render of the same fractal. **Do this on one canonical scene before touching anything else.**
2. **Port the remaining GMT formulas.** Julia3D, Kleinian (Jos/Mobius), MandelBolic -- same port pattern (Section 4). Each adds conditional getDist branches; verify the OSL `if/else` resolves per-ray cleanly.
3. **VDB bake fallback.** Build the separate CPU-side DE->FloatGrid->`signedFloodFill`->`sdfToFogVolume`->`.vdb` baker (C++ or Houdini for the toolkit; coarse 128^3-256^3). Wire the C4D Volume Loader + RS Volume preview. Accept the fog-vs-surface fidelity gap.
4. **Animation + camera import.** Python: build the RS+OSL material via the Nodes API, keyframe ports, merge the FBX camera rig (re-activate the imported camera). Reuse GMT's existing FBX exporter.
5. **Optional plugin packaging (v2+).** Only if a native ObjectData generator + polished UI is wanted. Python CommandData/Tag covers v1 distribution without a compiled module; reach for C++ (CMake/VS2022/v143/C++20) only when the UX gain justifies the per-release build/maintenance tail.

---

*Verified facts in Sections 2 and 6 carry verdicts from `h:/tmp/c4d-osl/verify.json` (8 confirm/refute lenses across gpu-loops, surface-emission, osl-loading, vdb-path). The three POC shaders live alongside this report; see `README.md` for the test recipe.*
