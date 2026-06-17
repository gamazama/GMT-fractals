---
batch_id: d04-gmt-docs-2
audited_at: 2026-05-20T00:00:00Z
files:
  - path: docs/gmt/23_Formula_Audit.md
    blob_sha: a497601782cd04b24ae16d9929c97abd8682fb96
    lines_read: [1, 224]
  - path: docs/gmt/24_Formula_Interlace_System.md
    blob_sha: 0915f26c823a204b20b61bcf9f2d998577b4fd1d
    lines_read: [1, 356]
  - path: docs/gmt/25_Formula_Dev_Reference.md
    blob_sha: fdf59cbfb8788c44ef41616dc9e7025e322fecf7
    lines_read: [1, 898]
  - path: docs/gmt/26_Formula_Workshop_V4_Plan.md
    blob_sha: f323c998e7efedc4314f5a428370e931f70a4602
    lines_read: [1, 835]
  - path: docs/gmt/26b_Fragmentarium_Spec.md
    blob_sha: 536ded64601098230525674a764bc3c4c8a4aeb9
    lines_read: [1, 216]
  - path: docs/gmt/27_Shader_Testing_Suite.md
    blob_sha: 26f1378fc5d310923530932c1d3ba11cb3baa865
    lines_read: [1, 293]
  - path: docs/gmt/30_Mesh_Export_Prototype.md
    blob_sha: ded5735717b88207c0285e76fe2d4b82105e2be1
    lines_read: [1, 330]
  - path: docs/gmt/43_Bucket_Render_Overhaul.md
    blob_sha: 9b512e953eb859962bacede2dcabfd12ff207480
    lines_read: [1, 160]
  - path: docs/gmt/44_Preview_Region_Plan.md
    blob_sha: 75829505988ae6913a1d877bc790d4f774e65931
    lines_read: [1, 150]
---

## docs/gmt/23_Formula_Audit.md
Systematic audit of all 42 native formulas covering naming, mathematical correctness, descriptions, parameter usage, preambleVars / usesSharedRotation compliance, and cross-references against Fragmentarium originals. Audit history: 2026-03-08 initial 28 formulas, 2026-04-09 added 13 new (polyhedra, PseudoKleinian variants, KaliBox, Claude). Documents which formulas needed math fixes (Dodecahedron with proper 3 golden-ratio normals, Buffalo's per-axis abs toggles), which got parameter consolidations to vec3 (MarbleMarcher, MakinBrot, Mandelbar3D), and which still have open enhancement opportunities (Tetrabrot/Quaternion rotation consolidation, Icosahedron/Octahedron/TruncatedIcosahedron cutting-plane getDist additions). Includes parameter-slot best-practices table and a "no reference available" list for GMT-original formulas.

Key decisions:
- Cross-reference every GMT formula against its Fragmentarium .frag original to detect algorithm drift
- Reserved slots: vec3A=offset, vec3B=rotation, vec3C=scale, paramA=power, paramB-D=fold/inversion; rotation params use `mode: 'rotation'` for preamble pre-calc
- Established 5-tier status legend (OK / FIX-DESC / FIX-PARAMS / FIX-DE / FIX-MATH / RENAME)
- Phases 0-2 closed; Phase 3 enhancements are LOW priority

Preservable:
- The Fragmentarium reference-file cross-walk table (which GMT formulas map to which `.frag` in `Examples/`)
- The "no reference available" classification listing GMT originals — important provenance record
- The parameter-slot best-practices table (slot-to-purpose mapping)
- The polyhedra audit table (preambleVars / usesSharedRotation / estimator status per formula)
- Decision that Icosahedron/Octahedron/TruncatedIcosahedron should adopt cutting-plane getDist like their sibling polyhedra

MAY BE STALE:
- Phase 3 enhancement queue: cutting-plane was substantially expanded in 2026-05-05 (doc 24 records 7 more CP-aware formulas including Icosahedron/Octahedron/TruncatedIcosahedron with default estimator switched to 5). The "still pending" entries for those polyhedra are obsolete.
- Status of Tetrabrot/Quaternion rotation refactor may have advanced.
- The formula count (42) may have grown — verify against current `formulas/` directory.

## docs/gmt/24_Formula_Interlace_System.md
Architecture notes for the formula/interlace system as built in the 2026-04-03 session and extended through 2026-05-05. Covers shared geometry transforms extraction, mesh-export interlace pipeline (parallel implementation alongside main-renderer DDFS path), the `preambleVars` contract for the GLSL rewriter, the `usesSharedRotation` flag, dev-mode validation, the buildInterlaceLoopGLSL helper, `onSet`-driven secondary-formula default loading, and the 2026-05-05 cutting-plane refactor that promoted CP to a first-class engine estimator (option 5) with pair-aware declaration logic and a 1600/1600 native-interlace sweep harness.

Key decisions:
- `preambleVars` is an explicit string array on FractalDefinition.shader — replaces fragile regex-based discovery; dev-mode runtime warning catches missed declarations
- `usesSharedRotation` flag triggers rotation-state save/restore — replaces "any formula with loopInit" heuristic
- Cutting-plane is a first-class engine estimator (5) with shared `cp_dmin/cp_scale/cp_trap` globals — replaces per-formula private accumulators + custom getDist
- Mesh export has its own parallel interlace implementation in `engine/SDFShaderBuilder.ts`; the two MUST be kept in sync
- Pair-aware CP declaration: emit cp_* globals if EITHER side of the interlace pair supports CP
- `addHybridFold('', ...)` is acknowledged as semantically wrong for interlace — a dedicated `setInterlaceLoop` would be cleaner (future work)
- N-formula hybrid sequence (Mandelbulber2-style scheduler) is elevated to primary feature-investment target

Preservable:
- The full `preambleVars` contract and rewriter design intent (CRITICAL load-bearing GMT mechanic per memory)
- The `usesSharedRotation` flag rationale and list of 15+ formulas where it's set
- Cutting-plane architecture: engine-owned globals + supportsCuttingPlane flag + pair-aware declaration logic + the GSD+MengerSponge dust-bug history
- Composition-rules table for CP-aware × standard primary/secondary combinations
- Sierpinski tetrahedron face-normal fix (axis-vs-face geometry trap)
- The 1600/1600 native-interlace-sweep invariant and its harness location (`debug/native-interlace-sweep.mts`)
- Mesh-export GMF→Mesh interlace data-flow (with the corrected `preset.features.coreMath[id]` key path)
- Estimator dropdown disabledIf gating UX
- Three known-fragility callouts (preambleVars enforcement, skipMainFormula ownership, addHybridFold misuse)
- N-formula hybrid generalization as the long-term direction

MAY BE STALE:
- "All 5 mesh-export shader builders updated" — verify the count is still 5
- Specific files-changed table near the bottom may be incomplete for later sessions
- `usesSharedRotation` formula list (15 entries) may have grown
- Doc has dated structure ("Improvements Applied 2026-04-03") — later changes may be undocumented here

## docs/gmt/25_Formula_Dev_Reference.md
Unified formula-authoring reference: FractalDefinition shape, shader execution order, every shader field including the self-contained SDE pattern (§3.3a), preambleVars contract, parameter slot conventions (with paramA/paramB double-wiring quirks), distance-estimator types, all available GLSL built-ins / engine uniforms / shared transform functions / math helpers, a thorough quirks-and-gotchas section (GLSL ES 3.0 const restriction, preamble assembly order, scale=1.0 degeneracy, trap conventions, Phoenix state pattern, prefold optimization, Catalan-solid fold techniques, DE corrections for deformations), and quick-reference templates. Prior survey noted this is among the most accurate GMT docs.

Key decisions:
- `selfContainedSDE: true` is the engine contract for one-shot formulas — disables pre-bailout check, hybrid box fold, burning ship, and interlace
- Coloring contract for self-contained SDEs: encode angle in z.xy (decomposition), pass smoothIter via dr, keep trap positive
- paramA wired as c.w in Julia mode; paramB wired as z.w (4th dim init) — surfaced as known quirks
- GLSL ES 3.0 const-initializer restriction: never use built-in functions in const decls; initialize in precalc functions
- Preamble assembly order: shared transforms appear AFTER formula preamble — call gmt_* from loopInit, never from preamble functions
- preambleVars lists only top-level mutable globals; constants and block-local vars are excluded
- Recommended slot conventions: vec3C=scale (with linkable), vec3B=rotation, vec3A=offset, paramA=power

Preservable:
- The full execution-order diagram (preamble → map → loopInit → loop body w/ pre/post rotation → getDist)
- The self-contained SDE pattern with the full coloring-modes contract table (modes 0/1/6/7/9 encoding requirements)
- The trap-must-be-positive caveat for logTrap()
- The const-in-preamble quirk (Error 1282 / VALIDATE_STATUS false on stricter drivers)
- The preamble-assembly-order quirk (and the loopInit workaround)
- paramA/paramB double-wiring quirk
- The complete uniform/built-in/shared-transform reference (engine API surface)
- The parameter slot/type/mode tables
- The DE tracking patterns table (Power vs IFS vs Box+Sphere fold vs Phoenix)
- The new-formula checklist (registration + compile + visual test)
- Catalan-solid fold techniques (RD face-normal fold, RT cutting plane after Knighty fold)

MAY BE STALE:
- Built-in distance estimators table lists 5 (0-4); doc 24 establishes Cutting Plane as a first-class estimator (5). §6 of this doc does not yet mention it.
- §3.7 / §3.8 numbering overlap (selfContainedSDE listed as 3.7 then usesSharedRotation/getDist both as 3.8) — minor structural duplication
- "April 2026 (polyhedral formulas, interlace system, shared transforms)" footer — newer features may not be reflected
- The DE Master template path `vec4(p_fractal, uParamB)` should be reverified against current engine

## docs/gmt/26_Formula_Workshop_V4_Plan.md
V4 rewrite plan for the Fragmentarium importer. Paused 2026-04-17 after a two-session build. V4's premise: emit every imported formula as a self-contained SDE (~1500 LOC total vs V3's ~3100), eliminating per-iteration regex surgery. Measured outcomes: V4 has higher total pass count (394 baseline / 360 honest vs V3 218/216) and lower NaN failure rate (5 vs 113), but loses feature-compat for the 46 V3 per-iteration formulas (interlace / hybrid fold / burning ship / pre-post rotation require an outer loop that runs many times — `selfContainedSDE` runs it exactly once). Per-iter emitter built (~720 LOC) but measured net regression (330 passes); kept behind `V4_ENABLE_PER_ITER` flag. Forward plan elevates AI-assisted .frag→native conversion to primary path (matching Mandelbulber's canonical-source pattern) and treats N-formula hybrid sequences as the real feature target.

Key decisions:
- "Self-contained SDE is the ONLY emission path" was the V4 thesis — explicitly chosen for simplicity, later acknowledged as a feature-compat oversight
- V4 worker protocol widened to carry `selfContainedSDE` flag end-to-end (B.-1 prerequisite)
- Pipeline structured as 5 stages: Ingest / Preprocess / Analyze / Emit / Verify
- Honest verification: real ShaderFactory compile + sample-point eval (not AST-parse-only)
- Phase A harness uses Playwright + headless Chromium + WebGL2 for autonomous corpus runs
- DEC corpus, plain GLSL, and frag all share the same downstream pipeline
- V3 to remain in tree until V4+fallback coverage demonstrably ≥ V3
- Post-rethink direction: per-iter emitter is opt-in only; V3 runtime fallback dispatcher deferred indefinitely; AI .frag→native skill elevated to primary; N-formula hybrid is the long-term primary feature target

Preservable:
- Diagnosis: the V3 per-iteration extraction's 7 regex bailout triggers + why they're the wrong shape
- Why selfContainedSDE structurally matches Fragmentarium's `float DE(vec3 p) { ... }` shape
- The "AST-parse pass count is not honest" lesson (494 verified-formulas claim was AST-only)
- Honest measurement table comparing V3 vs V4 (216/360 passes, 114/5 NaN failures, runtime)
- Phase A verification gate spec (parse, webglCompile, sampleFinite ≥56/64, sampleNonConstant > 1e-3, gradientFinite ≥48/64, renderNonDegenerate σ≥4 and ≤30% NaN)
- The 64 deterministic sample positions and 4×4×4 axis-jittered grid rationale
- The render-NaN-color-key (orange for NaN, blue exterior, green interior, log-banded)
- §0.1 forward plan: AI-skill primary path, N-formula hybrid as feature target, Mandelbulber architecture-parity finding
- Per-iter emitter coverage gaps: int/float arithmetic in helpers, DE-colliding helper rename, renderNonDegenerate failure cluster
- Feature-compat trade-off rationale (interlace/hybrid/burning require outer-loop-runs-N-times)
- The Mandelbulber2 canonical-source-pattern parallel (`.cpp` formula → `.cl` autogenerated)

MAY BE STALE:
- All Phase B/C/D/E/F status entries are 2026-04-17; current state is presumably further along
- The "V4 pipeline (beta) checkbox" UI affordance — verify it still exists
- Specific pass-rate numbers will have drifted with corpus / pipeline changes
- The 46 V3 per-iter passes / 13 V4 per-iter passes counts are point-in-time
- Phase E "delete V3" is blocked; status of that block may have changed

## docs/gmt/26b_Fragmentarium_Spec.md
Spec doc covering Fragmentarium's `.frag` preprocessor as the canonical reference for V4 Stage 2. Sourced from `syntopia/Fragmentarium`'s `Preprocessor.cpp` (492 LOC) + `Preprocessor.h` (261 LOC), GPL-3 (license-compatible). Documents every directive (`#include`, `#buffershader`, `#preset/#endpreset`, `#replace`, `#camera`, `#TexParameter`, `#buffer`, `#donotrun`, `#group`, `#vertex/#endvertex`, `#info`, `#define` variants including `providesInit/providesColor/providesBackground`) with V4 handling decisions. Documents the full uniform annotation grammar (`slider`, `checkbox`, `color`, `floatColor`, sampler2D), semantic behaviors to replicate (include recursion, preset extraction, replace ordering, comment-as-tooltip, void main relocation), render-model classification via `#include`, and what V4 explicitly rejects.

Key decisions:
- Port behavior, not code — keep clean license boundaries; full reimplementation in TS
- Render-model classification via `#include` is the early-rejection signal (2D, multi-pass, providesColor, donotrun, textures all rejected upfront with structured errors)
- Curated builtin subset: MathUtils, Complex, EmulatedDouble, Classic-Noise, Ashima-Noise, QuilezLib, Shadertoy — inlined as GLSL strings
- `#preset Default` block resolution drives parameter defaults — first-class from Stage 2 onward
- `#replace` is ordering-sensitive line-substitution (sed-style), not AST-aware
- Comment-as-tooltip: previous single-line comment → parameter tooltip metadata
- V4 explicitly rejects with categorical errors (not silent failures) for unsupported render models

Preservable:
- Complete directive table with Fragmentarium semantics + V4 handling per row
- Complete uniform annotation table (slider variants, checkbox, color, floatColor, sampler2D)
- Render-model classification table via `#include` (which includes signal accept/reject)
- The 8 explicit rejection categories with error-message templates
- Curated include-file subset list
- The V3-gaps analysis table (which preprocessor features V3 currently misses)
- License rationale (GPL-3 compatibility) and "behavior not code" porting decision

MAY BE STALE:
- Doc is internal spec for V4 Stage 2; given V4 is paused, status of "ported" vs "planned" items in this table is unclear
- `#preset` parsing claims to be partial in V3 — verify whether V4 Stage 2's preset extraction is implemented per spec
- Some directive handling may have been promoted from "reject" to "support" or vice versa during the V4 build

## docs/gmt/27_Shader_Testing_Suite.md
Autonomous verification harness documentation. Real `ShaderFactory` path in headless Chromium with Playwright; runs the V3 or V4 pipeline → registers the FractalDefinition → builds shader via real engine path → ships to browser harness page → runs 7 gates (parse disabled, webglCompile, sampleShaderCompile, sampleFinite ≥56/64, sampleNonConstant > 1e-3, gradientFinite ≥48/64, renderNonDegenerate σ≥4 and ≤30% NaN). Covers commands (v4-verify, monitor, bakeoff, diff-baseline, build-v4-passing), the compile-only native-formula sweeps (baseline / hybrid / hybrid-adv / interlace at 1600 pairs), the full-engine render sweep through real Three.js + FractalEngine, and architectural notes including "harness honesty" lessons from earlier simplified-scaffold deception. Also documents per-iter vs self-contained thumbnail divergence and why thumbnail σ is not a correctness gate.

Key decisions:
- Real `ShaderFactory` is the only acceptable compile path — explicit ban on simplified scaffolds
- webglCompile is the SINGLE HARD GATE for interlace sweep — DE-sample probes are unreliable in headless without full engine state
- Resume-capable runs via `--fresh` toggle on append/overwrite
- Thumbnails are supplementary inspection (good for self-contained subset only)
- 1600/1600 native-interlace-sweep is the invariant goal — any regression is a real failure
- Full-engine render sweep requires `npm run dev` running; checks reachability and fails fast
- `--gallery` mode doubles as in-app gallery thumbnail generator (256×256 JPEG)

Preservable:
- The 7-gate spec and exact thresholds (≥56/64, ≥48/64, σ≥4, ≤30% NaN)
- The harness-honesty enforcement rule (no simplified scaffolds; ShaderFactory is the only compile path)
- Compile-only sweep matrix: 42 / 42 / 42 / 1600 cases across baseline / hybrid / hybrid-adv / interlace
- The "webglCompile is the single hard gate" rule for interlace sweeps with rationale
- Per-iter vs self-contained thumbnail divergence — important UX explainer
- The 3-root-cause clustering of the first honest interlace sweep run (vec4A undeclared / Phoenix prefix gap / identity-pair dupes)
- Suggestions log (failure-thumbnail diffing, error-cluster auto-grouping, per-gate-only reruns, worker-path parity check, per-feature-toggle sweeps, harness-self-test, native-formula regression mode, thumbnail-comparison key, skill-invocable single-formula verification)
- The 3 lessons from native-interlace sweep (render-σ not correctness, headless map() probing unreliable, webglCompile sufficient for sweep)

MAY BE STALE:
- "42 native formulas" count — verify
- `--gallery` thumbnail path may have changed if FormulaGallery moved
- The "1600/1600 currently compile cleanly" invariant — needs re-validation after recent CP/feature work
- Test script names (`test:render:matrix`, `test:render:perf`) — verify against current package.json
- Some commands reference `debug/v4-*.mts` paths; verify locations against current `debug/` layout

## docs/gmt/30_Mesh_Export_Prototype.md
Architecture reference for the standalone mesh-export tool (`public/mesh-export/`). Plain HTML + 8 ES2020 script modules (no bundler, no React). 6-phase pipeline: GPU SDF sampling (dense ≤256³, narrow-band block-sparse >256³) → dual contouring (dense via `dc-core.js`, sparse via `sparse-grid.js`) → Newton projection (CPU for builtins, GPU for all formulas including GMF) → post-processing (Taubin smoothing, degenerate removal, vertex merge, normal recomputation, winding consistency) → vertex coloring (GPU orbit-trap shader with Fibonacci-sphere supersampling) → GLB/STL/VDB export. Documents memory budget at 20M vertices (~1.5GB DC total), sign-compression optimization that saves ~3GB at 2048³, VDB binary-format internals (density grid as half-float, optional color grid as vec3s), and the formula system (GMF parser, DE-type auto-detection, dynamic UI). Prior survey indicated code has gone past this doc.

Key decisions:
- 6-phase pipeline with try/catch isolation per phase + cancel support via cancelRequested flag
- Single WebGL2 context per run, passed to all GPU phases; loseContext only at end
- Block-sparse storage (Map<blockKey, Float32Array(blockSize³)>) replaces global Map (V8 2²⁴ limit at high res)
- Sign compression between DC phase 1 and phase 2 — 1 bit per cell vs Float32; saves ~3GB at 2048³
- IFS DE iso-threshold subtraction trick (DE - 0.5*voxelSize) creates artificial sign changes for dual contouring
- Power-DE escape sentinel (-1.0 when not escaped) — fixed bug where outer sphere got cut off at low iterations
- GLB uses FLOAT VEC4 colors (UNSIGNED_BYTE has C4D issues)
- Color supersampling via Fibonacci-sphere jittered samples accumulated additively in RGBA32F FBO
- Shared sampling helpers (bindPipelineUniforms / coarsePrePass / sampleSliceWithSubZ) extracted to avoid dense/sparse/VDB duplication

Preservable:
- The 6-phase pipeline overview and ordering
- DE-type auto-detection rules (custom / ifs / power) including the IFS iso-threshold trick rationale
- Power-fractal escape sentinel rationale (orbit must escape for analytic log-DE to be valid)
- Sign-compression technique (the ~3GB-at-2048³ rescue) — key memory-budget breakthrough
- Block-sparse storage scheme + the V8 2²⁴ entry limit workaround
- GLB FLOAT VEC4 color decision (C4D compatibility)
- VDB binary format documentation (the half-float density grid + optional vec3s color grid, with explicit byte-layout differences between scalar and vec3s)
- Memory-budget table at 20M vertices (sparse grid / sign maps / vertex maps / Growable arrays / faces)
- Smoothing-skip threshold (5M vertices) and why (adjacency memory)
- Shared sampling helpers + Z sub-slice averaging for band-artifact suppression
- The known-limitations list — useful as a roadmap

MAY BE STALE:
- Prior surveys (g07) flagged that mesh-export code has moved past this doc; file structure may have changed (e.g. doc 24 references `mesh-export/gpu/gpu-pipeline.ts` and `mesh-export/store/meshExportStore.ts` — suggesting a TypeScript/React migration that contradicts this doc's "plain HTML + 8 ES2020 scripts" framing)
- "8 JS modules via <script> tags" vs doc 24's TS-flavored module paths is a direct contradiction worth resolving
- GMF parser claims in doc may not match current `utils/FormulaFormat.ts`
- File line-counts (e.g. `mesh-export.html ~400`) likely outdated
- Doc 24 mentions interlace UI in ExportPanel; not reflected here

## docs/gmt/43_Bucket_Render_Overhaul.md
Draft plan (2026-04-20) for two user-facing problems with high-res export: (1) opaque sizing via `bucketUpscale` multiplier instead of explicit dimensions, and (2) hard VRAM ceiling because the renderer allocates a single full-output Float32 composite. Proposes replacing the multiplier UX with explicit width/height + presets + viewport-aspect-lock checkbox, and adding an outer image-tile loop (tileCols × tileRows) that produces multiple PNG files. Documents tile-boundary seam handling: ray origin/direction seamless via UV remap with full-output-aspect basis, blue-noise seamless via pixel-origin offset, TAA jitter global, primary accumulation seamless given equal convergence; bloom/CA acknowledged as the real seam (v1 = document and warn, v2 = render bloom once from viewport and sample per-tile). Includes rollout steps, testing plan, and engine-side BucketRenderConfig changes.

Key decisions:
- Replace `bucketUpscale` with explicit `outputWidth × outputHeight` + presets (HD/FHD/QHD/4K/8K + print sizes A3/A2/A1 @ 300DPI)
- Add `tileCols × tileRows` (default 1×1) — when >1, produces `_rXcY` per-tile PNGs
- Per-tile Float32 composite (not full-output) for VRAM safety
- Two new vec2 uniforms (`uImageTileOrigin`, `uImageTileSize`) with no-op defaults — UV remap in `ray.ts`
- Blue-noise pixel-origin offset uniform to prevent seam-pattern repeat
- Camera basis stays configured for FULL OUTPUT aspect (not per-tile) — that's how UV remap stays geometrically consistent
- Region mask continues using vUv (screen-space mask of currently-rendered surface)
- v1 acknowledges bloom/CA seams via documented warning; v2 renders bloom once from viewport for spatial continuity
- Filename convention `_r0c0`, zero-padded for ≥10 rows/cols (`_r00c00`)

Preservable:
- Two-distinct-concepts terminology: "bucket" = internal GPU tile vs "image tile" = output sub-PNG
- The seam-handling matrix (which sources are intrinsically seamless vs which need fixes)
- The UV-remap shader change with no-op defaults (forward-compatible rollout)
- Blue-noise seam fix via pixel-origin offset + uFullOutputResolution
- The output-aspect-vs-canvas-aspect distinction (cam.aspect override during bucket render)
- Camera basis stays configured for FULL output aspect (vital for tiles to stitch)
- Print-size presets at 300DPI (A3/A2/A1)
- Per-tile VRAM warning thresholds (yellow at 500MB, red at 1.5GB)
- v2 bloom-from-viewport sampling design — preserves spatial continuity for free
- Rollout staging (uniforms first as no-ops, then UX, then tile loop) — safe migration pattern

MAY BE STALE:
- This is explicitly a DRAFT PLAN; per memory, prior surveys (g06) showed code went past these design docs
- Doc 44 (Preview Region Plan) references shipped `startImageTile()` and `uImageTileOrigin/uImageTileSize/uTilePixelOrigin/uFullOutputResolution` uniforms — confirms the uniforms in this plan WERE shipped, but doc here doesn't reflect "shipped" status
- The rollout steps and "v1 / v2" labeling may not match what actually shipped
- Open-questions section (filename convention, EXR future, multiplier-as-shortcut) — actual decisions may differ in shipped code
- BucketRenderControls.tsx referenced line numbers may have drifted

## docs/gmt/44_Preview_Region_Plan.md
Plan (2026-04-20) for "Preview Region" — click-to-preview feature letting users click anywhere on the viewport to see that section rendered at the final export resolution converging live. Shipped with design changes: instead of routing through `BucketRenderer.startPreview()` with a bucket-render lock, the shipped form is uniform-only via `PREVIEW_REGION_SET` / `PREVIEW_REGION_CLEAR` worker messages, no render lock (user can still change params/camera live), exit via "Exit Preview ✕" chip, Escape, or panel close. Documents the click-to-zoom rationale (1:1 export-pixel density pins rect size — only position to pick), edge-case handling (output ≤ viewport, aspect mismatch, edge clamp), and the leverage from the just-shipped image-tile machinery. Includes obsolete initial design with `BUCKET_PREVIEW_START` / `BucketRenderer.startPreview` references.

Key decisions:
- Click-to-zoom (not drag-rect) — fixed rect size of `(canvasW/outputW × canvasH/outputH)` UV
- Preview always uses current `outputWidth × outputHeight` from Bucket Render panel
- Output-dimension changes mid-preview auto-exit (no longer represents current settings)
- No region persistence — every entry starts fresh
- Shipped form is uniform-only (PREVIEW_REGION_SET/CLEAR), no render lock — diverges from initial plan's BUCKET_PREVIEW_START
- Reuses image-tile machinery (startImageTile + uImageTileOrigin/Size uniforms + blitToScreen)
- Mutual-exclusion with selecting_region via InteractionMode enum

Preservable:
- Header note: shipped form diverged from initial plan (uniform-only, no lock); preserve as historical record
- The click-to-zoom rationale (1:1 density pins size to one degree of freedom)
- Edge-case handling: output ≤ viewport collapses to refine-view equivalent; non-square viewport/export framing rules
- Mid-preview output-dimension change → auto-exit policy (rationale: rendered pixels no longer represent current settings)
- The image-tile reuse insight — preview is just a single custom-rect image tile pointing to screen
- HUD format: `[Preview] WxH · region WxH · S/N samples · C% conv · Exit ✕`
- Confirmed-decisions section (entry-point only in Bucket Render panel, auto-exit on dim change, no persistence)

MAY BE STALE:
- Doc explicitly flags itself as historical; references to `BUCKET_PREVIEW_START`, `BucketRenderer.startPreview`, `WorkerProxy.startPreviewRegion`, canvas-floating HUD are obsolete
- Specific `renderWorker.ts` and `hooks/usePreviewTarget.ts` references should be the source of truth, not this doc
- Store-additions list (`previewRegion`, `isPreviewingRegion`, `'selecting_preview'` mode) — verify whether these all shipped under those names
- The 6-step rollout-steps list may not match shipped sequence
