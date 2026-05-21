---
iteration: d08-archive-docs
action: summarize-existing
working_dir: h:/GMT/workspace-gmt/dev/
generated: 2026-05-20
scope: archived docs (docs/archive/)
files:
  - path: docs/archive/09_Mapping_Modes_Report.md
    blob_sha: 1aad042e31665dda993129397912adecd0ac103e
    lines_read: 44
  - path: docs/archive/10_Shader_Architecture_Refactor.md
    blob_sha: 5c5b4cfb11e78e52937d2e8f31f7741cdfeed402
    lines_read: 109
  - path: docs/archive/11_Fragmentarium_Conversion.md
    blob_sha: a2ee6c4cdf5851a33d50e608d6e06a723c000368
    lines_read: 507
  - path: docs/archive/12_Vector_Uniform_Requirements.md
    blob_sha: f4182e4f08ef26b31f7d6447d9e8468f547b9746
    lines_read: 331
  - path: docs/archive/14_Fragmentarium_Examples_Analysis.md
    blob_sha: 48b352020655bca8a46bac18e0cec362a99a38db
    lines_read: 470
  - path: docs/archive/19_GLSL_Parser_Integration_Summary.md
    blob_sha: 73a423a219c70005658fa705068775c2a46f3cbb
    lines_read: 232
  - path: docs/archive/20_Fragmentarium_Importer_Formula_Analysis.md
    blob_sha: 953d0923b81e807385e9b3afe14a67a526e5bac6
    lines_read: 248
  - path: docs/archive/20_Fragmentarium_Importer_V2.md
    blob_sha: 0d84506312b24bf15c3a7051b3ed1e2e80d31b29
    lines_read: 341
  - path: docs/archive/README.md
    blob_sha: 6025c68ff8d27567a4ce605506006c0327e7d8ca
    lines_read: 26
  - path: docs/archive/context2.md
    blob_sha: fd30651057c7201142885d497f3fc0c1134067d1
    lines_read: 170
---

# Archive Docs Summaries

Lighter-touch survey of the 10 docs that live under `docs/archive/`. These are
retired design notes — most claims will be stale relative to current code. The
goal here is to preserve durable rationale (decisions, design tradeoffs, the
"why" behind current behaviour) without re-asserting any technical claim as
current truth.

The `archive/README.md` already classifies each doc as Implemented / Superseded
/ Historical Snapshot / Reference Material. I keep that bookkeeping below but
flag each entry as MAY BE STALE because nothing in the archive has been
verified against current source as part of this audit pass.

---

## 09_Mapping_Modes_Report.md

Two-page architecture report explaining how the colour-mapping mode system was
decoupled from core shader chunks via a Mapping Registry inside the Coloring
Feature. Before the change `coloring.ts` had a hardcoded `if/else` ladder
mapping integer IDs (0-8) to specific GLSL snippets, and adding a mode required
editing core files and manually syncing UI dropdown indices. The registry
stores `{id, value, label, glsl}` per mode in `MappingModes.ts`, and the
shader generator emits an `if/else` ladder (deliberately not `switch` —
WebGL1/2/ANGLE switch support was deemed unreliable). The doc also notes a
specific numeric fix: the "Potential" mode used `log(log(r))` which returns
NaN for `1 < r < e`, and was changed to `log2(log2(r))` to stabilise bands at
`r > 1.0`.

**Key decisions**

- If/else ladder over `switch` for cross-driver portability — a deliberate
  portability call, not an oversight.
- Mapping definitions live in their feature, not in core shader chunks.
- Coloring modes split into formula-specific (potential) vs geometric (normal
  vector) buckets to keep concerns separate.
- Relies on GLSL DCE: since `uColorMode` is a uniform, the GPU effectively
  executes one branch per draw.

**Preservable**

- Rationale for if/else over switch.
- The `log2(log2(r))` Potential fix (and why — `log(log(r))` is NaN for
  `1 < r < e`).
- The "modes register themselves; UI + shader follow" pattern as the template
  for future registry-driven features.

**MAY BE STALE**

- `MappingModes.ts` filename and the precise `{id, value, label, glsl}` shape
  are not re-verified here. The "8 modes" / specific integer IDs may have
  drifted.

---

## 10_Shader_Architecture_Refactor.md

Status report on the ShaderBuilder decomposition. Describes the move from a
monolithic ShaderFactory to a Builder Pattern where each feature implements an
`inject(builder, config, variant)` contract and the Builder maintains ordered
lists of defines/uniforms/functions/code blocks with deduplication. The doc
enumerates the full hook surface — `addDefine`, `addUniform`, `addHeader`,
`addPreamble`, `addFunction` (pre-DE pos 8), `addPostDEFunction` (post-DE pos
10, can call `map()`), `addIntegrator` (post-trace pos 15), `setFormula`,
`setDistOverride`, `addHybridFold`, `addPostMapCode` (inside `map()`),
`addPostDistCode` (inside `mapDist()`), `addMaterialLogic`, `addMissLogic`,
`addVolumeTracing`, `requestShading` + `addShadingLogic`, `addPostProcessLogic`,
`addCompositeLogic`. Variant-aware injection is illustrated with ColoringFeature
providing a real `getMappingValue` in Main and a stub in Physics/Histogram.
The doc closes with a DDFS-overhaul addendum noting deferred shading, named
object params for `setDistOverride`/`addVolumeTracing`/`addHybridFold`,
`dependsOn` topological sort, and full extraction of WaterPlane / LightSpheres
/ Reflections into self-contained features.

**Key decisions**

- Builder Pattern with positional ordering (the "position 8/10/15" numbers
  encode where each hook fires in the generated shader).
- Variant flag (`'Main' | 'Physics' | 'Histogram'`) so each feature can decide
  what to emit per shader variant (real code vs safe stub).
- Deferred shading via `requestShading()` to dodge feature-ordering pain:
  `calculateShading()` GLSL is generated in `buildFragment()` after every
  feature has injected.
- `dependsOn` + topological sort in FeatureRegistry rather than imperative
  ordering rules.
- Lighting kept as a monolith because its shadow/path-tracer split shares too
  much state — explicitly deferred "until concrete pain point".

**Preservable**

- The entire hook reference table — position numbers + when each hook fires.
  This is the authoritative reference cited by CLAUDE.md ("Shader composition,
  injection" row points here).
- Variant-aware stub pattern (features must provide their own safe stubs for
  non-Main variants; the Factory does not invent signatures).
- Rationale for keeping Lighting monolithic.
- DDFS overhaul addendum: named object params, accumulative DE hooks,
  deferred shading, dependsOn.

**MAY BE STALE**

- The completion table ("✅ Migrated" for Formula Code, Defines, Shadow
  Quality, Render Mode, Trace Loop, Post Process, Uniforms, Stubs) is a
  point-in-time status.
- Exact builder method names and signatures should be verified against the
  current `engine/ShaderBuilder.ts` before being quoted as fact.
- **Note:** CLAUDE.md still references this doc as authoritative for
  "Shader composition, injection" — it is load-bearing for current onboarding.

---

## 11_Fragmentarium_Conversion.md

500-line early conversion guide for going from `.frag` files to GMF. Has a
top-of-file SUPERSEDED banner pointing to docs 21/22/25. Catalogues which
Fragmentarium parameters are duplicates of GMT built-ins (`Bailout` →
`uEscapeThresh`, iteration count → `uIterations`, Julia toggle → `uJuliaMode`,
Julia coords → `uJulia`, pre-rotation → `uPreRotEnabled` + preRotX/Y/Z). Walks
through extracting a DE function into a `formula_X(inout vec4 z, inout float
dr, inout float trap, vec4 c)` signature, mapping into `paramA..F` slots,
encoding multiple booleans as bit flags in one parameter, setting up preset
JSON, using Julia mode via `uJuliaMode`, and a standard DE formula
`d = 0.5 * log(m2) * r / max(abs(dr), 1e-20)` with smooth-iter coloring. Then
documents the importer tool UX (parse → map → import & compile), parser
phases (skeleton → preprocessing → uniform parsing → scope-aware parsing →
GLSL generation), and a February-2025 status snapshot covering Kalibox /
Amazing Surface conversion + known issues (Julia preset not enabling, vec3
UI splitting into 3 sliders, rotation matrix axis questions, PreTranslation
line generation). Closes with a four-phase roadmap and reference-file list.

**Key decisions**

- GMF formula function signature is fixed:
  `void formula_X(inout vec4 z, inout float dr, inout float trap, vec4 c)`.
- Six scalar param slots `uParamA..F` originally — Fragmentarium params get
  mapped into these.
- Bailout, iterations, Julia mode/coords, pre-rotation are GMT built-ins;
  formulas must NOT redefine them.
- Encode many booleans into one param as bit flags
  (`mod(floor(paramD / 2^k), 2.0) > 0.5`).
- Standard DE coloring uses `log2(log2(m2) / threshLog)` for smooth iter
  (same rationale as doc 09's log2/log2 fix).
- vec3 UI must use a composed `composeFrom: ['juliaX', 'juliaY', 'juliaZ']`
  pattern so AutoFeaturePanel renders a single Vector3Input rather than three
  sliders.

**Preservable**

- The "do not duplicate" table (Fragmentarium ↔ GMT built-in uniform mapping)
  — this is durable contract even if importer internals have moved.
- Formula function signature.
- Bit-flag encoding pattern for multi-boolean params.
- Standard DE + smooth-iter formula.
- `composeFrom` rationale for vec3 UI.

**MAY BE STALE**

- Everything about the importer pipeline, parser phases, generated-code
  structure, paramMap priority order, and rotation matrix generation has
  been superseded by V3 (per the header banner and docs 21/22/25).
- The Feb-2025 "Current Implementation Status" section is purely historical.
- The Phase 1-4 roadmap is obsolete.

---

## 12_Vector_Uniform_Requirements.md

Requirements doc (marked Implemented v0.8.5, 2026-02-27) for adding native
vec2/vec3 uniform support alongside the original 6 scalar params, expanding
total capacity from 6 to 21 values (6 scalar + 3 vec2 + 3 vec3). Lays out
twelve numbered requirements: add `Vec2A/B/C` and `Vec3A/B/C` to
UniformSchema, extend ParamConfig to accept vec types with THREE.Vector2/3
defaults, generate vec2/vec3 uniform declarations in ShaderBuilder, handle
vector uniform updates in the render loop, extend keyframes + interpolation
in AnimationEngine for vec2/vec3, ensure AutoFeaturePanel renders
Vector2Pad/Vector3Input, surface vector slots in the parameter-mapping
dropdown, and keep backward compatibility with existing scalar-only presets.
Two layout proposals are shown (a "vector-first" slot order vs a "mixed"
order) with the question left open. A five-phase implementation plan,
risks/mitigations table, and a list of open questions (allow free mixing? how
many vec2/vec3? include vec4? per-component vs overall ranges? mat3/mat4?)
close the doc.

**Key decisions**

- Vector uniforms are additive, never replace scalars — backward compat is
  REQ-11.
- THREE.js types (THREE.Vector2/3) are the canonical store representation.
- Vector animation reuses THREE.js interpolation primitives rather than
  rolling new ones.
- Per-axis animation (separate keyframe tracks per component) is the chosen
  model — confirmed live in context2.md §5.6, where `coreMath.vec3A_x/y/z`
  are independently animatable and AnimationSystem reconstructs the full
  vec3 before upload.

**Preservable**

- The capacity arithmetic (6 scalar + 3 vec2 + 3 vec3 = 21 values) — useful
  framing when reasoning about formula param budgets.
- Backward-compat principle: scalars stay, vectors are additive.
- Per-axis-animation-then-reconstruct pattern.
- Open questions (vec4? mat3/mat4? per-component ranges?) remain useful
  prompts if the budget ever needs expanding.

**MAY BE STALE**

- The specific slot layout that shipped (vs the two proposals shown).
- The five-phase plan dates from before delivery and shouldn't be cited as
  a task list.
- "REQ-9: AutoFeaturePanel already supports vec2/vec3" — verified at the
  time, may have drifted with subsequent UI refactors.

---

## 14_Fragmentarium_Examples_Analysis.md

Pattern catalogue from surveying 100+ `.frag` files in
`features/fragmentarium_import/reference/Examples/`. Marked "Reference
Material — V3 now handles all these patterns." Groups formulas into ten
buckets: (1) simple DE-based (Tutorials 11, Kalibox, Amazing Surface) which
are best-supported; (2) complex DE with helper functions (PseudoKleinian's
RoundBox/Thingy/Thing2 chain) requiring call-graph traversal from DE
outward; (3) formulas with `break` for early exit (Kaliset3D) which don't
map cleanly because GMT's engine handles iteration externally; (4)
conditional orbit-trap updates gated on `ColorIterations`; (5) complex
loop conditions like `for(int i=0; i<MI && ap!=p; i++)`; (6) custom
iteration variable names (`MI`, `KIterations`, `ColorIterations`); (7)
computed uniforms at global scope (`float bailout2 = pow(10.0, Bailout);`);
(8) `#define providesColor` formulas that bypass DE+orbitTrap entirely
and are NOT supported because GMT's renderer is built around DE +
orbitTrap; (9) `#include` external dependencies — known includes
auto-injected, unknown warned; (10) `#define providesInit` formulas with
init() bodies that must be inlined at start of formula. Closes with a
helper-function catalogue (`rotationMatrix3`, `rotationMatrixXYZ`, etc.),
uniform type mappings (incl. slider range syntax), three pattern
categories (MANDELBOX / AMAZING_SURFACE / GENERIC), and an unsupported-
patterns summary table.

**Key decisions**

- GMT renders only 3D DE+orbitTrap formulas. 2D systems and `providesColor`
  volumetric/baseColor formulas are out-of-scope by architecture, not by
  laziness.
- Iteration counter is owned by the engine, not the formula. Anything
  inside a formula loop that references the counter must be rewritten or
  rejected — and `break` for early exit can't be expressed in GMT's model.
- `init()` body is inlined at start of formula (variables become
  formula-local) rather than being a separate setup pass.
- Pattern detection uses a fixed taxonomy:
  MENGER / MANDELBOX / AMAZING_SURFACE / GENERIC fallback.
- Computed-uniform globals (`vec3 sc = Offset * Scale;`) are illegal at
  GMT's top level and must be inlined into the formula.

**Preservable**

- The 10-bucket taxonomy of `.frag` patterns and which buckets are
  supportable.
- The architectural reason `providesColor` and 2D formulas are
  unsupported (different renderer, not a feature gap).
- The init()-inlining rule.
- The "iteration counter is engine-owned" invariant — this is durable and
  explains why break/complex loop conditions never map cleanly.
- Helper function catalogue (`rotationMatrix3` etc.) — these are real
  Fragmentarium standard-library functions any importer must inject.

**MAY BE STALE**

- The Implementation Status checklist (✅/⚠️) is point-in-time for V2.
- The "Testing Recommendations" file paths are reference-material paths
  that may have moved.
- The four-item "Next Steps" list is obsolete — V3 has shipped.

---

## 19_GLSL_Parser_Integration_Summary.md

PoC writeup for swapping the V1 regex-based importer for AST parsing via
`@shaderfrog/glsl-parser`. Has a SUPERSEDED banner — the parser is now
fully integrated in V3. Documents the install command, the proof-of-concept
in `test-glsl-parser.ts`, the three-step pattern (parse → visit/transform →
generate), a regex-vs-AST comparison table calling out the canonical
`z.z → z_local.z_local` regex bug, a phased migration plan, an AST API
mini-reference (node types: Program / FunctionNode / IdentifierNode /
WhileStatementNode / ForStatementNode / CompoundStatementNode; helpers:
renameBinding, renameFunction, debugScopes), and ~50KB gzipped bundle-size
note. A late addendum dated Feb 2026 documents the "V2 Integration Fix"
where the parser was using `autoMapParams()` instead of the user's slot
selections from the UI, plus three bug fixes: `f_z`/`f_i` scoping in
generated `getDist` (must map to `z.xyz` / `iter` for getDist's signature
`vec2 getDist(float r, float dr, float iter, vec4 z)`), `min(trap, vec4)`
GLSL type error fixed by wrapping the vec4 in `length()`, and the
mapping fix itself. Closes with a lesson-learned about falling back to
regex defeating the point of switching to AST.

**Key decisions**

- AST-based transformation is the chosen approach. Regex is explicitly
  rejected; the doc names the fragility (`z.z`, `dr.x`, scoping).
- `@shaderfrog/glsl-parser` is the chosen library (~50KB gzipped accepted).
- Variable renaming uses the `f_` prefix convention for formula-local vars
  (`f_z`, `f_i`, etc.) to avoid colliding with GMT's outer-scope `z`/`iter`.
- The `getDist` function signature is fixed:
  `vec2 getDist(float r, float dr, float iter, vec4 z)`. Generators must
  rewrite formula-local names to match this scope.
- `trap` is `float` in GMT but `orbitTrap` is `vec4` in Fragmentarium;
  `min(trap, vec4(...))` is a type error and must be transformed to
  `min(trap, length(vec4(...)))`.
- Lesson learned: any regex fallback inside the AST transformer should be
  treated as a smell.

**Preservable**

- The `f_` prefix convention for formula-local variables.
- `getDist` signature and the `f_z → z.xyz`, `f_i → iter` rewrite.
- The `min(float, vec4)` type-mismatch transformation
  (`length(...)` wrapping).
- "AST not regex" as a design principle for the importer.

**MAY BE STALE**

- Specific filenames (`test-glsl-parser.ts`) and the "current state of V2"
  references. V3 supersedes the whole pipeline; per docs/21 the active
  parser lives at `features/fragmentarium_import/parsers/ast-parser.ts`.
- The phased migration plan (Phase 1/2/3) is obsolete — migration is done.

---

## 20_Fragmentarium_Importer_Formula_Analysis.md

V2-era test matrix (dated 2026-02-28, SUPERSEDED banner cites docs/21,
64/64 passing, 494 verified library formulas). Three tables: HIGH PRIORITY
formulas expected to work (simple DE, init()-bearing, custom-helper
formulas with reference file paths and status notes), MEDIUM PRIORITY
edge cases (break statements, complex loop conditions, computed uniforms),
NOT SUPPORTED (providesColor / 2D / external-dep-heavy formulas). A V2
parser implementation-status section enumerates 12 implemented features
(AST parsing, variable renaming, loop body extraction, helper extraction,
uniform detection, slot mapping, orbitTrap→trap, getLength for metrics,
distance-expression extraction, getDist generation, dr estimation, iter
parameter), 6 needs-testing items, and 4 known limitations. A
test-ordering recommendation (Phase 1 basic → Phase 2 advanced → Phase 3
edge cases) and a bug-fix log close the doc; the key fix logged is the
`z.z → z_pos.z_pos` regex bug protected by placeholder-swap before rename,
and a `length() → getLength()` transform for GMT's distance metrics.

**Key decisions**

- The list of "implemented in V2, durable in V3" capabilities is a useful
  signal of which patterns are/aren't safe to assume in importer code:
  variable renaming, loop body extraction, helper extraction, slot
  mapping, orbitTrap-to-trap conversion, distance expression extraction,
  getDist generation, dr estimation, iter parameter passing.
- `length()` calls in Fragmentarium formulas must be rewritten to
  `getLength()` to respect GMT's pluggable distance metric.

**Preservable**

- The capability list (V2-implemented items that V3 inherited) — useful
  baseline of what the importer is expected to do.
- The `length() → getLength()` rewrite rule and the rationale (GMT's
  metric system).
- The `z.z`-rename gotcha and its placeholder-swap fix (concrete trap to
  avoid if anyone revisits the rename logic).

**MAY BE STALE**

- Every per-formula status row (✅/⚠️/❌ against specific .frag paths).
  These dated to early V2 and may have flipped status under V3.
- The Phase 1/2/3 test plan is no longer the live test plan
  (`npm run test:frag` 64/64 is per docs/21).

---

## 20_Fragmentarium_Importer_V2.md

V2 architecture writeup. Top-of-file warning says V2 had a 0% success rate
on reference .frag files at time of writing (2026-03-05), with two named
blocking bugs: computed uniforms referenced from a loop body after being
stripped, and `#include`-sourced helpers (`rotationMatrix3` etc.) called
but undefined. Doc covers the V1→V2 improvements (AST over regex,
variable renaming precision, type safety, maintainability), the parse →
analyse → transform → emit pipeline, the `FragDocumentV2` schema
(uniforms, presets, deFunction with parameters/loop info/used uniforms/
distance expression/orbit trap usage, helperFunctions, includes), the
`f_` prefix renaming pattern with a worked example, a hardcoded
`UNIFORM_MAP` (`Scale→uParamA`, `Offset→uVec3A`, `OffsetV→uVec3A`,
`MinRad2→uParamB`, `ColorIterations→uParamC`, `Iterations→uIterations`,
`Julia→uJulia`, `JuliaV→uJulia`; unmapped get `u_{name}`), loop-body
extraction (counter increment auto-removed), template-based code
generation, usage examples, API compatibility table V1↔V2, file structure
under `features/fragmentarium_import/`, and the four known limitations
(providesColor, complex macros, multiple DE functions, unresolved
includes).

**Key decisions**

- The `f_` prefix for ALL formula-local variables (no exceptions for
  parameter names) — keeps the renaming rule mechanical.
- Counter increment (`n++`) is unconditionally stripped from extracted
  loop bodies because GMT's engine owns the iteration counter.
- Unmapped uniforms fall through to `u_{name}` — they get generated names
  rather than failing.
- Only the first DE function is extracted if a file has several.
- `Offset` and `OffsetV` both map to `uVec3A` (aliasing two common
  Fragmentarium names into one GMT slot).
- The four hardcoded pattern categories (MENGER / MANDELBOX /
  AMAZING_SURFACE / GENERIC) act as the dispatch table for
  formula-specific code paths.

**Preservable**

- The `UNIFORM_MAP` aliases — these are domain knowledge (Fragmentarium
  community naming conventions) that any successor importer would need.
- The "counter is engine-owned, strip n++" rule.
- The `f_` prefix convention (echoed in doc 19; documented here in more
  detail with worked example).
- Pattern-dispatch taxonomy.
- The two named blocking bugs (computed uniforms after stripping;
  unresolved `#include` helpers) — important historical context for the
  V3 design decisions in docs 21/22.

**MAY BE STALE**

- Every API/filename reference (`GenericFragmentariumParserV2`, files
  under `features/fragmentarium_import/`). docs/21 reroutes to
  `parsers/ast-parser.ts` etc.
- The "0% success rate" status is historical — V3 ships at 64/64.
- The "known limitations" list may be partially solved in V3.

---

## README.md

Index for the archive directory. Two tables: "Completed / Reference" (docs
09, 10, 12, context2) and "Frag Importer History" (docs 11, 14, 19, 20a,
20b). Each row carries a Status column distinguishing Implemented vs
Superseded vs Reference vs Historical Snapshot. Top of file routes
readers to DOCS_INDEX.md for current docs. Calls out explicitly that
doc 10 "still referenced by CLAUDE.md" and that the importer went
through three generations: V1 (regex) → V2 (AST) → V3 (current), with
current status owned by `docs/21_Frag_Importer_Current_Status.md`.

**Key decisions**

- Archive is curated, not a dumping ground: each entry carries an explicit
  status flag.
- Doc 10 is intentionally kept reachable from CLAUDE.md despite living
  under archive/, because its hook reference table is still authoritative.
- Importer history is tracked as a three-generation lineage
  (V1 / V2 / V3) so future onboarding can read it in order.

**Preservable**

- The lineage V1 (regex) → V2 (AST) → V3 (current) — important when
  reading the archived docs in context.
- The signal that doc 10 is load-bearing even though archived.

**MAY BE STALE**

- Should still be correct as a navigation aid (it's a meta-doc), but if
  more archive entries are added later this list would need a refresh.

---

## context2.md

Project state snapshot tagged "March 2026". Banner at the top routes to
01_System_Architecture.md and DOCS_INDEX.md for current state. Covers:
DDFS migration complete with `FormulaPanel.tsx` using `AutoFeaturePanel`
and uniforms auto-generated; the Lighting exception (custom component
for gizmos and light array management); a 20-entry active-features
catalogue (CoreMathFeature, GeometryFeature, LightingFeature, AOFeature,
ReflectionsFeature, AtmosphereFeature, MaterialFeature, WaterPlaneFeature,
ColoringFeature, TexturingFeature, QualityFeature, DrosteFeature,
ColorGradingFeature, OpticsFeature, NavigationFeature,
CameraManagerFeature, AudioFeature, DrawingFeature, ModulationFeature,
WebcamFeature, DebugToolsFeature, EngineSettingsFeature); a code-health
list of completed cleanups (visualSlice removal, Lite render unification,
subscription cleanup, ShaderBuilder with inject contract,
`shaderGenerator` removed, `shader → postShader` rename,
`ShaderConfig` extracted, category-2 any fixes, shader-permutation via
`engineConfig.toggleParam`); the Fragmentarium importer subsection
(active parser at `features/fragmentarium_import/parsers/ast-parser.ts`,
64/64 V3 tests, `npx tsx debug/test-frag-importer.mts`); a Path Tracer
Quality params table (`ptNEEAllLights`, `ptEnvNEE`, `ptVolumetric`,
`ptMaxLuminance`, plus the rim-light-bounce-0-only note); a Vector
Formula Parameters section (`vec2A/B/C` and `vec3A/B/C` in CoreMathFeature
with per-axis animation and `ParameterSelector` expansion); and a
Vector Input System section detailing `BaseVectorInput`,
`VectorAxisCell`, `RotationHeliotrope`, `DualAxisPad`, rotation-mode
auto-detection by regex (`/\brot(ation|ate)?\b/i`), drag interactions
(plain / Shift-10x / Alt-0.1x), double-click-to-reset, click-to-text
with π notation support (`0.5π`, `90°`), 1-decimal display vs 6-decimal
input precision.

**Key decisions**

- Lighting opted OUT of pure DDFS rendering because it needs Gizmos /
  drag-drop / array operations — DDFS owns the param configs, a custom
  component owns the interactions. This is the documented exception to
  the DDFS rule.
- Per-axis animation for vec2/vec3 (`coreMath.vec3A_x/y/z` as
  independently animatable tracks) with reconstruction at upload time.
- Rotation mode is auto-detected in vector inputs by word-boundary
  regex on the parameter name.
- Right-click context menu toggles degrees ↔ radians on rotation inputs.
- π and ° notation supported in text-entry mode.
- Path-tracer rim light is bounce-0 only (rationale: indirect bounces
  would incorrectly brighten rim contribution).
- Path tracer firefly clamp via `uPTMaxLuminance` (per-sample luminance
  clamp before accumulation).
- Full NEE / env-NEE / volumetric toggles are recompiles
  (`onUpdate: 'compile'`), not runtime uniforms.

**Preservable**

- The Lighting-as-DDFS-exception rationale.
- Per-axis-then-reconstruct animation model for vec params (echoed in
  doc 12).
- Rotation-mode auto-detect regex and the π/° text-input convention.
- Path-tracer design facts: rim = bounce-0 only, firefly clamp,
  NEE/env-NEE/volumetric are compile-time.
- The feature-registry catalogue is a useful onboarding cross-reference
  even if names drift.

**MAY BE STALE**

- The 22-entry feature list is point-in-time and may have grown/shrunk.
- "DDFS Migration Complete" is a snapshot — newer migrations may exist.
- Code-health "Completed" bullets are historical; "Minor Issues" mobile
  UI / Category 3 `any` may or may not still be open.
- The "providesInit body inlining is implemented but untested" note
  has likely flipped under V3.

---

## Cross-cutting observations

A few things show up in multiple archived docs and are worth flagging as
durable design principles rather than dated implementation notes:

1. **AST not regex** for any GLSL transformation (docs 19, 20a, 20b).
2. **`f_` prefix** for formula-local variables — mechanical, no exceptions
   (docs 19, 20b).
3. **Iteration counter is engine-owned, not formula-owned** — explains why
   `break` and complex loop conditions never map cleanly (docs 14, 20a, 20b).
4. **Vector params are additive, animated per-axis, reconstructed at upload**
   (docs 12, context2).
5. **Lighting opts out of pure DDFS** because it needs spatial interactions
   that DDFS doesn't model (context2, doc 10's "lighting monolith split
   deferred").
6. **Doc 10's hook reference table is still load-bearing for CLAUDE.md** and
   should not be moved/deleted without updating the CLAUDE.md route.
