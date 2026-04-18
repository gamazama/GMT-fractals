# Fragmentarium `.frag` Format Spec — V4 Stage 2 Reference

**Source:** [syntopia/Fragmentarium `Preprocessor.cpp`](https://github.com/Syntopia/Fragmentarium/blob/master/Fragmentarium-Source/Fragmentarium/Parser/Preprocessor.cpp) (492 LOC) + `Preprocessor.h` (261 LOC)
**License:** GPL-3 (compatible with GMT)
**Purpose:** canonical spec for V4 Stage 2 preprocessor. Behavior is ported from the C++ reference; code is not.

---

## 1. Format at a glance

Fragmentarium's preprocessor is **line-based, regex-driven, ~500 LOC total**. Every directive is either:
- A line starting with `#KEYWORD …`
- A `uniform TYPE name; KIND[args] [LockType]` pattern on a single line

There is no AST, no macro expansion, no scope tracking. This matches the simplicity of the format and explains why the format survived 15+ years essentially unchanged.

---

## 2. Preprocessor directives (complete list)

| Directive | Fragmentarium behavior | V4 handling |
|---|---|---|
| `#include "file.frag"` | Recursive file inclusion via `FileManager` with search paths. Tracks dependencies, avoids duplicate includes implicitly. | **Support.** Inline curated subset of `Fragmentarium-Source/Examples/Include/*.frag` (MathUtils, Complex, EmulatedDouble, *-Noise). Use `#include` filename as render-model signal (see §5). |
| `#buffershader "file.frag"` | Secondary shader for multi-pass rendering (e.g. buffer A/B pattern). | **Reject.** Out of V4 scope — GMT is single-pass renderer. Fail ingest with clear error. |
| `#preset NAME` … `#endpreset` | Block of `key = value` lines. Extracted from source at preprocess time, stored in `FragmentSource::presets` map. Source lines are **removed**. | **Support.** Extract; resolve `Default` preset's parameter values as V4 defaults. Discard preset block from emitted code. |
| `#replace "from" "to"` | Runtime text replacement applied to **all subsequent lines** during preprocess. Ordering-sensitive. Line itself is commented out. | **Support.** Line-order substitution, skip lines containing `#replace`. |
| `#camera NAME` | Camera model selector: `"3D"`, `"2D"`, `"2D Progressive"`, `"Progressive 2D Julia"`, etc. | **Use as render-model signal.** `3D` / `DE-Raytracer` → accept. Any 2D variant → **reject with clear error**. |
| `#TexParameter name key value` | Texture parameter key/value pair. | **Reject** (for now). Log as "unsupported" — can add texture support later. |
| `#buffer NAME` | Buffer type identifier (usually "RGBA32F"). | **Ignore.** Single-pass renderer doesn't need it. |
| `#donotrun` | Marks a library file not intended as a standalone fractal. | **Reject ingest** — attempts to load as formula fail with "library file, not a formula". |
| `#group NAME` | Sets current parameter group for subsequent uniforms. | **Support.** Propagate as metadata (UI could show parameter groups). |
| `#vertex` … `#endvertex` | Vertex shader code block. Moved to `vertexSource`, removed from fragment source. | **Reject.** V4 doesn't emit vertex shaders — GMT engine provides its own. Fail ingest if non-trivial vertex code present. |
| `#info TEXT` | Human description. | **Support.** Use as formula description metadata. |
| `#define dontclearonchange` | Disable buffer clear on param change. | **Ignore.** Irrelevant to single-pass. |
| `#define iterationsbetweenredraws N` | Multi-pass iteration config. | **Ignore.** |
| `#define subframemax N` | Progressive-render frame cap. | **Ignore.** |
| `#define providesInit` | Tells Fragmentarium not to auto-generate init code — formula provides its own `init()`. | **Support.** V3 already handles `void init()` extraction. V4 carries forward. |
| `#define providesColor` | Formula provides its own color output via `color(vec3)` function. | **Reject for V4.** Could be added later as a color-provider hook. Flag as "coloring unsupported; surface shading only". |
| `#define providesBackground` | Formula provides background via `background(vec3)` function. | **Reject.** GMT provides its own backgrounds. |

---

## 3. Uniform annotations (complete list)

All annotations take form: `uniform TYPE name; KIND[args] [LockType]` on **one line**. LockType ∈ {`Locked`, `NotLocked`, `NotLockable`, `AlwaysLocked`} and is optional.

| Pattern | Example | V4 slot target |
|---|---|---|
| `uniform float X; slider[min, default, max]` | `uniform float Scale; slider[-3, 2, 4]` | `paramA..F` (auto-assigned) |
| `uniform int X; slider[min, default, max]` | `uniform int Iterations; slider[0, 16, 100]` | `uIterations` if name matches; else `paramA..F` with cast |
| `uniform bool X; checkbox[true\|false]` | `uniform bool Julia; checkbox[false]` | `paramA..F` as 0/1, or dedicated flag slot |
| `uniform vec2 X; slider[(a,b),(a,b),(a,b)]` | `uniform vec2 Warp; slider[(-1,-1),(0,0),(1,1)]` | `vec2A..C` |
| `uniform vec3 X; slider[(a,b,c),(a,b,c),(a,b,c)]` | `uniform vec3 Offset; slider[(-2,-2,-2),(0,0,0),(2,2,2)]` | `vec3A..C` |
| `uniform vec4 X; slider[(a,b,c,d),…]` | rare | `vec4A..C` |
| `uniform vec3 X; color[r,g,b]` | `uniform vec3 BaseColor; color[0.5,0.6,0.7]` | `vec3A..C` (color semantic flagged) |
| `uniform vec4 X; color[f,min,max,r,g,b]` | floatColor combo | `vec4A..C` (color + float blend) |
| `uniform sampler2D X; file[path]` | `uniform sampler2D tex; file[texture.jpg]` | **Reject** (textures out of V4 scope) |
| `uniform vec2 pixelSize` | magic uniform | **Substitute** with engine's pixel size equivalent |

**Post-parse behavior:** Fragmentarium rewrites the uniform line to `uniform TYPE name;` (annotation stripped). V4 does the same, then captures the annotation metadata for param slot assignment.

**Comment-as-tooltip:** single-line `// foo` immediately preceding a `uniform` becomes its tooltip. Empty line resets. V4 carries this through to parameter metadata.

---

## 4. Semantic behaviors to replicate

### 4.1 `#include` recursion

Fragmentarium recursively parses includes via `parseSource()`, appending resolved source inline. Dependencies are tracked in a list (no circular-include detection — relies on duplicate file paths to resolve identically).

**V4:** maintain a resolved-include set; skip re-inclusion of the same logical file. Use a fixed list of known builtin files (the curated `Examples/Include/` subset) mapped to inlined GLSL strings — we do not have a filesystem at Workshop time.

### 4.2 `#preset` extraction

Preset blocks are **removed** from source before the source is used for shader compilation. They're stored in `presets[name] = joinedBlock` for the UI. Fragmentarium's `Default` preset provides the initial parameter values.

**V4:** extract in Stage 2, parse `Default` preset (if present) into `{[paramName]: value}` map, use as formula defaults in the emitted `parameters` array.

### 4.3 `#replace` ordering sensitivity

```
#replace "OldName" "NewName"
// …subsequent lines have OldName → NewName applied…
uniform float NewName; slider[0,1,2]
```

Fragmentarium applies replaces in order, skipping lines that themselves contain `#replace`. This is effectively a sed-style pre-substitution.

**V4:** same behavior — iterate lines in order, maintain active-replace-map, apply before regex-matching directives on each line.

### 4.4 Comment-as-tooltip

```
// Controls how fast the fractal spins
uniform float Speed; slider[0,1,10]
```

Fragmentarium's rule: if the previous non-empty line is a single-line comment, it becomes the tooltip. Any non-comment line resets the pending comment.

**V4:** replicate exactly. Tooltip ends up on the parameter definition.

### 4.5 `void main` relocation (moveMain flag)

Fragmentarium's `parse(input, file, moveMain)` — when `moveMain=true`, a `void main(...)` in the source is renamed to `fragmentariumMain` and a new `void main() { fragmentariumMain(); }` is appended. This lets Fragmentarium wrap user's main code.

**V4:** irrelevant — GMT's shader builder never imports user's `main`. The DE function is the import boundary. If a formula source has a `void main`, V4 ignores it (it's part of a Fragmentarium render setup we don't use).

### 4.6 `#vertex` / `#endvertex`

Vertex code is collected separately, fragment source has those lines commented out.

**V4:** if non-trivial vertex code is present, reject — we don't support custom vertex shaders. Detect and fail in Stage 2 with clear message.

---

## 5. Render-model classification via `#include`

The `#include` line is the best early signal for whether a formula fits GMT's render model. V4 Stage 1 (Ingest) inspects include directives:

| Include | Render model | V4 action |
|---|---|---|
| `DE-Raytracer.frag` (any variant) | 3D SDF raymarch | **Accept.** Standard case. |
| `DE-Raytracer-Slicer.frag` | 3D SDF with slicing | **Accept** (sliced rendering not used by GMT, but formula DE is compatible). |
| `3D.frag`, `Brute3D.frag` | 3D brute force | **Accept** (brute force doesn't affect the DE). |
| `IBL-Pathtracer.frag`, `Sky-Pathtracer.frag`, `IBL-Raytracer.frag`, `Path-Raytracer.frag`, `Soft-Raytracer.frag`, `Subblue-Raytracer.frag`, `Fast-Raytracer.frag` | 3D with custom lighting | **Accept** — GMT provides lighting; we use only the DE. |
| `2D.frag`, `2DJulia.frag` | 2D raytrace | **Reject** — no DE, use custom 2D loop. |
| `Progressive2D.frag`, `Progressive2DJulia.frag` | 2D progressive | **Reject.** |
| `Brute-Raytracer.frag` | 2D brute | **Reject.** |
| `MathUtils.frag` | Math helpers | **Inline as builtin.** |
| `Complex.frag` | Complex number helpers | **Inline as builtin.** |
| `EmulatedDouble.frag` | Double-precision emulation | **Inline as builtin** (selective — not all formulas need it). |
| `Classic-Noise.frag`, `Ashima-Noise.frag` | Noise functions | **Inline as builtin.** |
| `QuilezLib.frag` | Inigo Quilez helpers | **Inline as builtin.** |
| `Shadertoy.frag` | Shadertoy compat shims | **Inline as builtin.** |
| `Sunsky.frag` | Sky model | **Ignore** — GMT provides atmosphere. |
| `BufferShader*.frag`, `ZBuffer*.frag`, `DepthBufferShader.frag` | Multi-pass buffers | **Reject** — multi-pass not supported. |

**Rejection format:** when V4 rejects a formula at Stage 1, it produces a structured error: `{kind: 'unsupported_render_model', include: '2D.frag', message: 'GMT requires 3D distance-estimator formulas. This file uses a 2D progressive raytracer.'}`. Workshop UI surfaces this verbatim.

---

## 6. Gaps in current V3 pipeline

Findings from comparing [features/fragmentarium_import/v3/analyze/preprocess.ts](../features/fragmentarium_import/v3/analyze/preprocess.ts) to the canonical spec:

| Feature | V3 status | Impact |
|---|---|---|
| `#include` recursion with curated builtins | ✅ Partial — handles MathUtils builtins | Low gap |
| `#preset` extraction | ✅ Partial via [v3/analyze/params.ts](../features/fragmentarium_import/v3/analyze/params.ts) | Verify preset values actually apply as defaults |
| `#replace` | ❌ Not handled | **Medium gap.** Some formulas rely on `#replace`. V4 must add. |
| `#camera` render-model detection | ❌ Not used for early rejection | **High gap.** Currently a `#camera "2D Progressive"` formula attempts import, fails late or produces broken shader. |
| `#donotrun` | ❌ Not checked | Low gap. User picks from library, not loose files. |
| `#vertex` / `#endvertex` | ❌ Not handled | Could inject vertex code as fragment → compile error. V4 must detect and reject. |
| `#define providesColor`, `providesBackground` | ❌ Not handled | Formulas with these silently drop their color logic. V4 should explicitly reject or route. |
| `vec4` slider, `color[…]`, `floatColor` | ⚠ Partial | Common enough that V4 should handle all annotation variants. |
| Lock types | ❌ Ignored | Cosmetic — not critical. |
| Comment-as-tooltip | ⚠ Partial | Verify. |

---

## 7. What V4 explicitly rejects (with specific error messages)

1. **2D render models** — `#camera "2D*"` or `#include "2D*.frag"` / `Progressive2D*.frag`.
2. **Brute-force raytracers** without DE — `#include "Brute-Raytracer.frag"`, `#include "Brute3D.frag"` *only* if no `float DE(vec3)` function is present.
3. **Multi-pass / buffer shaders** — `#buffershader`, `#include "BufferShader*.frag"`.
4. **Custom vertex shaders** — non-trivial `#vertex` block.
5. **`#define providesColor` / `providesBackground`** — deferred; log as "color provider unsupported in V4".
6. **Textures** — `sampler2D` uniforms with `file[…]` annotation.
7. **`#donotrun`** library files.
8. **No `float DE(vec3)` found** — no valid distance estimator function.

Each rejection is categorical, not a failure: the Workshop UI shows a clear "this formula uses X which isn't supported" message, and the user knows the reason.

---

## 8. What the V4 pipeline therefore *does* handle

After preprocess, Stage 3 (Analyze) receives clean, normalized source containing:
- Inlined builtins (resolved `#include`s)
- Namespace-stripped uniforms (annotations removed, metadata captured)
- Extracted `#preset Default` values
- User helper functions
- `void init()` if present
- The DE function(s)

Stage 4 (Emit) wraps the chosen DE in `selfContainedSDE: true` form per [docs/26 §3.3](26_Formula_Workshop_V4_Plan.md#33-emitted-formula-shape) without modifying the DE body beyond namespace-safe identifier renames.

---

## 9. Curated include-file subset

The following `Examples/Include/*.frag` files are mirrored into V4 as inline GLSL strings:

- `MathUtils.frag` — rotationMatrix3, boxFold, sphereFold, etc.
- `Complex.frag` — cMul, cDiv, cExp, cLog, cPow, cSqrt, etc.
- `Classic-Noise.frag` — Perlin noise
- `Ashima-Noise.frag` — Ashima simplex noise
- `EmulatedDouble.frag` — `df64` helpers (inlined only if source references them — they're large)
- `QuilezLib.frag` — Inigo Quilez primitives
- `Shadertoy.frag` — Shadertoy compatibility shims (iTime → uTime, etc.)

All other includes are either:
- Render-model includes (DE-Raytracer.frag, 2D.frag, etc.) — consumed as signals, not inlined
- Multi-pass / buffer includes — cause rejection
- Environment/lighting includes (Sunsky, IBL) — ignored; GMT provides its own

---

## 10. References

- [`Preprocessor.cpp`](https://github.com/Syntopia/Fragmentarium/blob/master/Fragmentarium-Source/Fragmentarium/Parser/Preprocessor.cpp) — canonical implementation
- [`Preprocessor.h`](https://github.com/Syntopia/Fragmentarium/blob/master/Fragmentarium-Source/Fragmentarium/Parser/Preprocessor.h) — parameter class hierarchy
- [`Examples/Include/`](https://github.com/Syntopia/Fragmentarium/tree/master/Fragmentarium-Source/Examples/Include) — stock builtin files
- [docs/26_Formula_Workshop_V4_Plan.md](26_Formula_Workshop_V4_Plan.md) — V4 plan referencing this spec
- [docs/21_Frag_Importer_Current_Status.md](21_Frag_Importer_Current_Status.md) — V3 status (for diff-comparison when extending V4)
