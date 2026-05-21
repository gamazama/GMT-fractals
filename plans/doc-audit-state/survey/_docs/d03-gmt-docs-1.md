---
batch_id: d03-gmt-docs-1
audited_at: 2026-05-20T00:00:00Z
files:
  - docs/gmt/01_System_Architecture.md
  - docs/gmt/02_Rendering_Internals.md
  - docs/gmt/03_Modular_System.md
  - docs/gmt/04_Animation_Engine.md
  - docs/gmt/05_Data_and_Export.md
  - docs/gmt/06_Troubleshooting_and_Quirks.md
  - docs/gmt/07_Code_Health.md
  - docs/gmt/08_File_Structure.md
  - docs/gmt/21_Frag_Importer_Current_Status.md
  - docs/gmt/22_Frag_to_Native_Formula_Conversion.md
---

## docs/gmt/01_System_Architecture.md

GMT-era system architecture overview describing the Engine-Bridge pattern (React/Zustand isolated from render loop via FractalEvents bus to singleton FractalEngine), the Data-Driven Feature System (DDFS) where features define state/UI/shader chunks in a single registry definition, the ShaderBuilder injection hook catalog (18 hooks ordered across the 17-phase assembly pipeline), the Web Worker + OffscreenCanvas split-thread architecture, TickRegistry phase orchestration (SNAPSHOT → ANIMATE → OVERLAY → UI), and the Unified Camera Coordinate System using split-float "treadmill" precision.

Key decisions:
- Unidirectional Push Architecture: state changes flow Zustand → FractalEvents → engine, never direct React-bound uniforms in useFrame.
- DDFS: adding a feature requires editing ONE file; state/UI/uniforms auto-derive.
- Engine never imports stores directly; `animationEngine.connect(useAnimationStore, useFractalStore)` injection avoids worker-thread circular deps.
- Worker owns GPU; main thread does React UI + R3F gizmos only; OffscreenCanvas auto-presents (no `transferToImageBitmap` — caused 26ms GPU stalls).
- Canonical camera state: `cameraPos` is always (0,0,0), world position lives in `sceneOffset` as PreciseVector3 split-float, `targetDistance` is always surface distance never orbit radius.
- Mode-agnostic engine: zero `isOrbit` branching in VirtualSpace/animation/preset code; mode awareness limited to Navigation.tsx and HUD.
- Viewport Quality writes tier overrides DIRECTLY to store (not via overlay) because DDFS UI reads store to determine compiled state — overlay would diverge store and shader.

Preservable:
- Full ShaderBuilder hook table (18 hooks × assembly position × scope/available vars) — most concrete reference for shader composition.
- `requestShading()` + `addShadingLogic()` deferred-generation pattern: Lighting requests shading, Reflections (registered later) injects evaluation code; final `calculateShading()` generated at `buildFragment()` time.
- Satellite feature pattern (LightSpheres `dependsOn: ['lighting']`) — FeatureRegistry uses Kahn topo-sort with stable ordering.
- `panelConfig` / `CompilableFeatureSection` two-level control: `compileParam` (onUpdate:'compile') + `runtimeToggleParam` (uniform); Volumetric and Area Lights canonical examples.
- Three-layer scalability pipeline (Authored / Tier Overrides / Hardware Caps); hardware caps applied as ceiling in `getShaderConfigFromState()` Stage 3.
- Boot hydration via synchronous main.tsx URL parse + loadScene BEFORE ReactDOM.render — guarantees INIT reads populated config.
- `compileGate.queue('Compiling Shader...', work)` routing through unified spinner; `useAppStartup` is renderer-agnostic (bootRenderer/pushOffset/estimateBootCompileMs callbacks).
- Worker-mode gotchas: `engine.renderer` null on main thread (use `isBooted`), `engine.pipeline` inaccessible (use `accumulationCount` shadow), `FileSystemWritableFileStream` not transferable (wrap in proxy WritableStream), `Matrix3/4` arrive from worker as `{elements:[...]}` plain objects.
- Atomic orbit-absorb pattern: `WorkerProxy.queueOffsetSync()` embeds new offset in next RENDER_TICK with `syncOffset:true` flag (prevents 1-frame mismatch where camera=0 reaches worker before new offset).
- Silent absorb (`absorbOrbitPosition(silent=true)`) writes store directly via `setState({sceneOffset})` — does NOT emit OFFSET_SET (would reset worker accumulation and post extra message).
- OrbitControls target reset to tiny forward offset after absorb required because drei runs `update()` at useFrame priority -1; without reset, `lookAt(target)` from (0,0,0) produces wrong quaternion.

MAY BE STALE: All concrete file paths (`engine/FractalEngine.ts`, `engine-gmt/...` mix), uniform names, and feature registration code — engine has been extracted to `engine-gmt/` and `dev/app-gmt/`; this doc references both interchangeably. Specific tier names ("Preview/Fastest/Lite/Balanced/Full/Ultra") may differ. Boot sequence specifics (50ms setTimeout, `useAppStartup` paths) likely evolved.

## docs/gmt/02_Rendering_Internals.md

Deep technical reference on the raymarcher, covering split-float "treadmill" precision (CPU `VirtualSpace` + GLSL `applyPrecisionOffset()`), Direct (Cook-Torrance PBR + SDF soft shadows) vs Path Tracing (unidirectional + NEE) modes, visible Light Spheres as compile-time satellite feature with chord-based thickness and stochastic AA, the PT quality mode matrix (`PT_NEE_ALL_LIGHTS`/`PT_ENV_NEE`/`PT_VOLUMETRIC`/`PT_AREA_LIGHTS` + firefly clamp + bounce-0-only rim), the sphere-area-lights MIS implementation, Volumetric Scatter (Henyey-Greenstein + Beer-Lambert + stochastic gate), two-stage shader compilation with `CompileProgressStore` state machine + `compileGate.queue()`, TickRegistry phases, Distance Probe + adaptive resolution, and the Bucket Renderer architecture with image-tile loop.

Key decisions:
- Two intentionally different Schlick formulas: per-light `fresnelSchlick(cosTheta, F0)` (standard) vs reflection throughput `F0 + (max(1-roughness,F0)-F0)*pow(1-NdotV,5)` (Schlick-Roughness clamps grazing).
- Fog color pre-linearized CPU-side as `uFogColorLinear` — eliminates per-pixel `sqrt`+clamp in InverseACESFilm.
- Reflections do NOT apply own fog — `applyPostProcessing()` applies single primary-distance fog pass (avoids double-fogging).
- All post-process (fog/glow/volumetric) feature-injected via `addPostProcessLogic()`; `post.ts` is minimal shell.
- Lean bounce tracer (`traceSceneLean`) emitted alongside `traceScene` for PT bounces — skips per-step volume accumulation that would be discarded.
- Bounce bias `biasEps = pixelSizeScale * length(p_ray)` (camera-to-point), NOT bounce travel distance `d` — critical for concave fractal geometry.
- Volumetric stochastic gate `exp2(-7.0 + 4.0 * uVolQuality)` exponential mapping; both extremes are unbiased estimators of same integral — slider trades per-frame cost vs frames-to-converge.
- Warp coherence is load-bearing for volumetric perf — small mixing constants (7.43, 1.0) keep warps coherent; large constants (127.1/31.7) cause 2.4× slowdown via warp divergence.
- Two-stage compile: preview shader (<1s, colored N·L) renders while full shader compiles async via `compileAsync` + `KHR_parallel_shader_compile` on dummy 1×1 FBO matching MRT program hash.
- Bar fill uses `transform: scaleX` (compositor thread) not `width: %` — keeps animating when worker's sync WebGL compile starves main-thread paint (Firefox).
- `CompileProgressStore` is single source of truth; both LoadingScreen and CompilingIndicator are pure views; progress computed via exponential approach to 95% over `estimateMs`.
- Adaptive resolution `idealScale = currentScale * sqrt(targetFPS / measuredFPS)` with 70/30 smoothing; full-res accumulation guard locks off adaptive after ~1s.
- Convergence target dynamically resizes to measured region (capped 256×256) — was hardcoded 64×64 sampling 0.2% of 1080p.
- Bucket renderer uses GL scissor with integer pixel bounds + half-pixel region expansion — prevents UV-precision artifacts at tile boundaries.
- Multi-tile image render uses `uImageTileOrigin/Size` UV remap so camera basis stays full-output aspect; blue-noise uses `noiseCoord * uFullOutputResolution` for cross-tile continuity.

Preservable:
- Henyey-Greenstein phase function `(1−g²)/(4π·(1+g²−2g·cosθ)^1.5)`, `g=uVolAnisotropy`.
- Beer-Lambert `T = exp(-σ_eff · d)` with optional height-fog modulation; early-out at `T < 0.001`.
- Sphere-area-light MIS implementation: Veach 1995 power-heuristic (β=2) via `misPower2`; `pdfSphereLightDir` solid-angle measure with `activeCount` selection-prob divisor folded in; `pdfVNDF` from Heitz 2018 §3 eq.17.
- Sphere lights force `GetHardShadow` regardless of `ptStochasticShadows`/`areaLights` settings — accumulation produces correct soft shadow from sphere sampling alone; mixing with `GetSoftShadow` would either double-soften or overwrite `lDir`.
- Volumetric `_jScale = min(h.x * 0.2, 0.35)` — near-surface samples get hard god-ray edges, open-sky get softer scatter that temporally averages silhouette.
- `DIR_LIGHT_DIST = 100` sentinel from `math.ts` shared by directional-light vol shadow march and pbr.ts shadow rays — earlier value 10000 caused unnecessary full step-budget marches.
- "What didn't work" volumetric log: loop-invariant hoists (CSE'd by ANGLE), stronger mixing constants (2.4× slower), per-frame phase shift (flicker), Item B set (blue-noise jitter etc.) — perf cost without earning visual difference.
- `stochasticSeed` MUST have per-pixel variation via blue noise — `uVolEnabled > 0.5` clause in `ray.ts` `noiseLogic` is mandatory; without it gate collapses to function of `d` only, screen-wide banding.
- `stepJitter=1.0 during nav` (trace.ts:181) — primary march deterministic during nav, all pixels same `d` per iter; `d*1.0` term doesn't decorrelate; only `_volSeed*7.43` term does. Design rule, not bug.
- PT bounces don't accumulate vol (traceSceneLean) — documented design; alternative would multiply bounce cost.
- Bench harness `debug/bench-shader.mts` flags: `--volumetric=on|off`, `--vol-density=N`, `--vol-emissive=N`, `--vol-lights=N`, `--vol-anisotropy=N`; vol scenes auto-skip reference diff.
- Stale compile cancellation: `_compileGeneration` counter increments per `scheduleCompile`; stale compiles discarded at yield points but do NOT emit `IS_COMPILING false` (newer scheduleCompile owns spinner). `_lastCompiledFormula` set BEFORE first pipelineRender so concurrent `performCompilation` calls take `keepCurrent` path.
- Permanent compile timing logs (NOT DEV-gated — do not remove): `[Compile] Single-stage: Xms (Formula)` and `[Compile] Two-stage: Xms (Formula, gen=Xms, gpu=Xms)`.
- Initial compile message context-aware: 'Loading Preview...' only on genuine two-stage (parallel-compile-capable browser + new formula); 'Compiling Shader...' for Firefox single-stage and quality-preset switches.
- Three-layer bucket render lock: worker message filter drops all except BUCKET_STOP/RENDER_TICK + UI `isExporting=true` lock + WorkerDisplay ResizeObserver skip when `isBucketRendering`. Worker's own `engine.state.isExporting` stays false so update()/compute() continue.
- Async convergence via `gl.fenceSync()` + zero-timeout `clientWaitSync()` — zero GPU stall; viewport convergence runs every 8 accumulated frames; bucket renderer manages its own per-bucket measurements.
- PT path tracer historical fix: bounce loop `exp(-volumetric * 2.0)` arbitrary constant → use actual march distance `d` + same density signal as primary scatter.
- Aspect override for bucket render: `cam.aspect` set to `outputWidth/outputHeight` at start of bucket render so primary-ray basis vectors frame full output; restored on cleanup.
- Tile bloom/CA seams: spatial post-process runs per-tile sampling black outside; v2 plan renders bloom once from viewport and samples per-tile.

MAY BE STALE: All `engine-gmt/...` path links; volumetric uniforms now use `uVol*` namespace owned by `features/volumetric/` (doc itself flags 2026-05-03 revision noting earlier `uFogDensity`/`uPTFogG`/`uFogEmissiveStrength` were pre-extraction GMT). Specific bench numbers tied to RTX 2070 + ANGLE/D3D11. Many feature names/uniforms might have evolved.

## docs/gmt/03_Modular_System.md

Reference for the Modular Graph visual node-graph fractal builder: React Flow-based editor where users wire nodes (folds/transforms/fractals/SDF primitives/CSG) into a graph that JIT-compiles to a GLSL `formula_Modular()` function. Covers the state triplet (`_p, _d, _dr`), uniform flattening into `uModularParams[64]` for slider-without-recompile updates, parameter bindings to global formula sliders (Param A–F), the full node type registry (24 types across 7 categories), the graph compiler with DCE walk and topological sort, structural-vs-param diff detection driving recompile-vs-uniform-update decisions, the FlowEditor UI (React Flow v11 quirks), and the conditional execution system for per-iteration logic (hybrid fractals).

Key decisions:
- Recompile takes 100-500ms; slider drags must be instant → uniform flattening into `uModularParams[64]` Float32Array updated per frame without GLSL regeneration.
- `uModularParams` is conditionally declared via `backingOnly: true` flag on UniformDefinition — GLSL emitted only when `formula === 'Modular'`; Three.js backing exists for all formulas for code uniformity.
- Param bindings to global sliders (ParamA-F) replace `uModularParams[N]` reference with named uniform — also enables keyframe animation (unbound params can't be keyframed individually).
- Structural diff (`isStructureEqual`) compares id/type/enabled/bindings/condition.**active** — only `condition.active` is structural; `mod` and `rem` are runtime uniforms.
- DCE walk: starting from root-end, BFS upstream through edges → only reachable nodes compiled. Disconnected subgraphs pruned for free.
- Topological sort uses Kahn's algorithm; ready queue sorted alphabetically by node ID for deterministic compilation order.
- SDF Primitives (Sphere/Box) set `distOverride < 999.0` to bypass iterative fractal DE — enables hybrid fractal+SDF scenes.
- `updateModularUniforms` applies SAME DCE walk as `compileGraph` so slot indices match exactly; condition mod/rem written BEFORE node params.
- `#define PIPELINE_REV N` forced per structural change to prevent shader cache serving stale code.

Preservable:
- Full node registry with GLSL semantics (Mandelbulb power+phase+twist, AmazingFold = boxFold + sphereFold, MengerFold = sorted xyz conditional swaps, SierpinskiFold = diagonal reflections, IFSScale homothety formula `p*scale - vec3(offset*(scale-1))`).
- Conditional execution wraps node's GLSL in `if ( (i - (i/cmod)*cmod) == crem )` — modulo expressed as subtract to avoid `%` issues; enables hybrid fractals (BoxFold on even iters, SphereFold on odd).
- `clientToFlow(clientX, clientY)` helper subtracts wrapper bounds — React Flow v11 `project()` expects container-relative coords NOT viewport-relative; failure mode is nodes placed at sidebar-offset position.
- `skipNextOnNodesDelete` ref pattern: when `handleRemoveNode` calls setNodes, ReactFlow fires `onNodesDelete` BEFORE internal edge store reflects bridge edge from concurrent setEdges; without guard, onNodesDelete overwrites store with old edges removing bridge.
- Ghost-insert dropdown timeout: `setTimeout(() => setPendingNodeType(type), 0)` in onChange defers state update past current event propagation; otherwise propagated click hits `onPaneClick` immediately after.
- CSG nodes can't be edge-inserted (need two inputs); edges don't highlight; pane placement still works.
- Tab zoom/pan persistence via module-level `persistedViewport` variable — `useRef` would reset on unmount.
- Persistence shape: when `formula === 'Modular'`, both `graph` (visual with positions) and `pipeline` (sorted flat) serialized to preset/GMF.
- Seven named preset bundles in `data/modularPresets.ts` (Mandelbulb, Amazing Box, MixPinski, Menger Sponge, Kleinian, Marble Marcher) + tutorial default JULIA_REPEATER_PIPELINE.

MAY BE STALE: `MAX_MODULAR_PARAMS = 64` cap — could have grown. Node count (24) likely changed. ReactFlow v11 specifics; may have upgraded. File paths assume pre-extraction layout. CoreMathFeature bridging may have evolved.

## docs/gmt/04_Animation_Engine.md

Animation engine spec covering keyframe data model (Track/Keyframe with Step/Linear/Bezier interpolation + 5 tangent modes), the binder system (track ID → setter resolution priority), Newton-Raphson cubic Bezier solver, tangent calculation (Auto/Ease/Aligned/Unified/Free), camera animation via unified split-float coordinates (`unified.x = sceneOffset.x + sceneOffset.xL + camera.position.x`), playback modes (real-time tick / offline scrub / modulation recording), animation store sub-slices (playback/selection/sequence), and timeline UI component breakdown.

Key decisions:
- Engine doesn't import stores directly — `animationEngine.connect(useAnimationStore, useFractalStore)` injection at boot avoids circular deps in worker architecture.
- Binder resolution priority: camera.active_index → camera.* → lights.* (legacy remap) → lighting.lightN_* → feature.param (DDFS) → root-level fallback.
- Vector params (vec2/vec3) animated per-axis with track IDs like `coreMath.vec3A_x` — ParameterSelector auto-expands.
- 5 tangent modes via single `tangentMode` + `autoTangent` + `brokenTangents` fields: Auto (weighted Catmull-Rom + monotonicity clamp), Ease (flat handles), Aligned (default, direction-locked per-side length), Unified (direction+length locked), Free (broken).
- Sign-only handle constraints by default: left handle x>0 → clamped 0, right x<0 → clamped 0; MAGNITUDE preserved (handles may extend past next/prev key — weighted Bezier, matches Maya).
- 1/3-of-interval cap is opt-in via `constrainHandles({clampToOneThird: true})` — used for newly-computed Auto tangents (start at dt*0.333), NOT applied during user drag.
- Insert-on-curve uses proper de Casteljau split at `t = solveCubicBezierT(insertFrame, ...)` — new key adopts curve-derived tangents, prev/next handles rewritten so segment shape unchanged.
- Only Bezier neighbours with `autoTangent === true` get recomputed on insert/edit — user-shaped neighbours NEVER silently rescaled.
- Rotation tracks (rot/phase/twist/paramC-F regex match) use shortest-path wrapping (±2π adjust on diff > π).
- Camera animation merges split-float into unified value on RECORD; splits back via `VirtualSpace.split()` on PLAYBACK and emits `CAMERA_TELEPORT` with position=(0,0,0) + new sceneOffset, sets `shouldSnapCamera=true` to bypass smoothing.
- Rotation is Euler interpolation, not SLERP — acceptable for small angle changes per frame.
- pendingCam buffer: `syncBuffersFromEngine()` at scrub start reads current state; tracks overwrite individual components; `commitState()` at end pushes complete state — prevents partial updates.
- Deterministic playback (timeline advances at exactly project fps regardless of monitor refresh) ensures live preview matches export frame-for-frame; accumulator resets on pause, discards >250ms backlogs.
- `batchAddKeyframes` for modulation recording INTENTIONALLY DIVERGES from `addKeyframe`: defaults to Linear, skips tangent calc and neighbour updates — dense recorded keys don't want smart tangents. Don't merge.
- During modulation recording, `AnimationEngine.scrub()` evaluates `recordingSnapshot` instead of live sequence — prevents jitter because live track is being mutated each tick and modulation overlay only fires when offset > 0.000001.
- `setFps` modes: 'keep' (default — only fps changes, wall-clock shifts) vs 'match' (rescales all keyframe frames/Bezier x by ratio, preserves wall-clock); rapid drags coalesce within 400ms for one drag = one undo entry.
- Track-header click in DopeSheet selects track ONLY (does NOT auto-select all keys) — stops casual click + Delete from wiping track. GraphSidebar click DOES additively turn visible (selection never hides).
- `setTrackSelection`/`toggleTrackSelection`/`addTracksToSelection`/`removeTracksFromSelection` split by intent — no boolean polymorphism.

Preservable:
- Bezier solver: Newton-Raphson with 4 iterations of `t -= (bezier(t) - x) / bezier'(t)`, initial guess linear, early-exit at slope < 1e-9 (flat region).
- `setTangents('Unified'|'Aligned')` averages BOTH handles' direction (order-independent — side dragged last doesn't "win") then writes back; shared length for Unified, per-side for Aligned.
- `scaleHandles` proportionally scales handle x AND y to preserve angle when key moves in time.
- Post-keyframe behaviors: Hold/Loop/PingPong/Continue (extrapolate slope)/OffsetLoop (add cycle delta, for continuous rotation).
- Soft selection types: Linear/Dome/Pinpoint/S-Curve — affect nearby keys during drags.
- TickRegistry ANIMATE phase order: `animationEngine.tick(dt)` → `audioAnalysisEngine.tick()` → `modulationEngine.tick()` → oscillator updates (legacy LFO).
- `overriddenTracks` set: when modulation/audio drives a param, AnimationEngine skips that track to avoid fighting.
- Legacy `lights.N.prop.axis` format auto-remapped to `lighting.lightN_*` via getBinder.
- Track grouping centralized in `utils/groupTracks.ts` (Camera/Formula/Optics/Lighting/Shading buckets) — single source of truth used by DopeSheet AND GraphSidebar.
- "Show Selected Only" toolbar in GraphEditor hides canvas tracks with no selected key; sidebar unaffected (only canvas filters).
- Graph editor keyboard shortcuts: A (select all visible), Alt+A (deselect all), Delete/Backspace, F (fit selection), Ctrl+C/V.
- Aspirational refactor: `useGraphInteraction.ts` is 765-line god-hook flagged for split into useKeyDrag/useHandleDrag/useMarquee/usePanZoom/useScrub.

MAY BE STALE: Some store action names; specific UI component file paths post-extraction; the cross-ref to `engine/08_Animation.md` (engine-fork plugin contract). Track ID conventions might have shifted.

## docs/gmt/05_Data_and_Export.md

Data I/O and export reference: video export (MP4 H264/HEVC/AV1, WebM VP9) and image-sequence export (PNG RGBA, JPG per-pass), the multi-pass beauty/alpha/depth shader uniform `uOutputPass`, depth-pass normalization range, mediabunny ≥1.40.1 storage strategies (Disk via FSA + RAM via BufferTarget), Firefox-specific quirks, file naming patterns, the GMF (GPU Mandelbulb Format) primary save format (formula + scene state in human-readable AI-editable text), legacy JSON load-only support, PNG iTXt steganography, URL sharing via diff-compressed Preset, VDB mesh export, and the Bucket Renderer's adaptive convergence sampling.

Key decisions:
- GMF is the **primary save format**. Why over JSON: self-contained (shader code travels with preset, imported formulas survive roundtrip), human-readable (GLSL not escaped JSON), AI-friendly (API reference header), portable (single file fully describes scene).
- GMF structure: `<Metadata>` (id/name/parameters/defaultPreset/importSource) + Shader_Init/Function/Loop/Dist + `<Scene>` (full Preset JSON).
- On GMF load: if formula already registered (built-in or previously imported), existing definition is used — GMF's embedded shader IGNORED. If unknown (imported formula in fresh session), registered from GMF data. Means loading GMF for built-in always uses app's current version.
- JSON presets still loadable for backward compat but no longer saved; limitation: no shader code so imported/custom formulas fall back to defaults if unregistered.
- PNG iTXt key `"FractalData"` carries GMF string; `loadGMFScene()` handles both GMF and legacy JSON content. Social media strips iTXt — share files directly.
- URL sharing uses Preset directly (not GMF); imported formulas can't be shared (shader code too large); animation data auto-stripped if URL exceeds limit.
- Multi-pass export: `uOutputPass` lives in shared main uniform block — branches main shader's alpha write AND post-process output; one atomic set retargets displayMaterial/exportMaterial/main.
- Video mode runs `startExport` once PER pass (outer loop, one file per pass). Image-sequence runs SINGLE session with passes looped INSIDE per-frame render — beauty RGB + alpha coverage merged into one RGBA PNG; depth always separate 8-bit greyscale.
- Image sequences are Chrome-only (requires `showDirectoryPicker`); Firefox/Safari disabled with inline notice.
- Alpha pass output: per-sample `step(depth, MISS_DIST − 100)` binary coverage — N-sample average IS anti-aliased sub-pixel coverage → AA for free.
- Depth-pass normalization via user-input `uDepthMin/Max` (default 0..5 = atmosphere fog range); "Use fog range" shortcut.
- Focus-lock only adjusts DOF on beauty pass — prevents lens offset drift between multi-pass passes.

Preservable:
- Full Firefox VideoEncoder quirks: chunk.timestamp has one-frame leading-latency offset (PTS reconstruct: `chunk.timestamp - firstChunkOffset`); chunk.duration not echoed back (Firefox returns ~33333µs default — hardcode to `1/fps`); default `bitrateMode: 'variable'` under-runs on smooth fractal content (use 'constant'); `latencyMode: 'quality'` gives ~30% better Firefox bitrate than 'realtime'.
- Firefox H264 capped at ~31 Mbps (Cisco OpenH264 binary built with H.264 Level 4.0 ceiling, MaxBR 25,000 × 1.25 = 31,250 kbps); cap is upstream of WebCodecs — no JS config bypasses. Render dialog shows inline notice above 12 Mbps.
- WebCodecs encoders accept any 2-pixel-aligned dimension and emit display crop in SPS — DO NOT align dimensions to 16-pixel macroblock grid (over-strict alignment shaved 1080→1072, 1350→1344). `align=2` is correct.
- Custom H264 AnnexB→AVCC converter `H264Converter.ts` REMOVED — mediabunny's ISOBMFF muxer ≥1.34 does same work natively via `extractAvcDecoderConfigurationRecord`. If WMP regression after mediabunny bump, restore old converter from git before chasing elsewhere.
- `FileSystemWritableFileStream` not transferable via postMessage → wrap in proxy `WritableStream` for disk-mode video export.
- File naming patterns table covering video single/multi-pass, PNG beauty+alpha merged, PNG alpha/depth, JPG per-pass.
- VDB density grid `Tree_float_5_4_3`, optional color `Cd` grid `Tree_vec3s_5_4_3`; resolution 64-512 per axis; file pattern `{formula}-{resolution}-{content}-{timestamp}.vdb`.
- Bucket render convergence threshold meaning: 0.1% production / 0.25% default / 0.5% balanced / 1.0% fast preview.
- Bucket SSAA pixelSizeBase override: trace precision kept at viewport resolution during supersampled renders to prevent artifacts.

MAY BE STALE: Mediabunny version (1.40.1); specific codec defaults; the Firefox quirks may have been fixed upstream. GMF schema may have evolved.

## docs/gmt/06_Troubleshooting_and_Quirks.md

Comprehensive troubleshooting guide — WebGL/GPU issues, video export quirks (Firefox especially), audio reactivity, precision artifacts, DOF/blur issues, mobile-specific bugs, canvas resolution race conditions, HalfFloat16 buffer handling, environment light loading, region rendering, modular graph builder quirks, sphere area lights UX, and removed/deprecated features.

Key decisions: This doc is the institutional memory of hard-won WebGL gotchas. Every section is a Preservable bullet.

Preservable (WebGL/raymarching/browser gotchas — all hard-won):
- TDR (Timeout Detection Recovery) on shader complexity: OS kills GPU driver → black screen. Fix: lower Max Steps / Ray Detail / Fold Iterations.
- Shader compile failure on GPU instruction/register limit: disable Advanced Lighting (Shadows/AO), Reflections, switch to Lite Mode.
- After export, WebGL render target left pointing to disposed exportTarget → subsequent renders target disposed buffer instead of screen. Fix: explicit render target reset to null in `restoreState()` BEFORE resetting viewport/scissor.
- Firefox VideoEncoder fps mismatch (60→58.85): chunk.timestamp adds one-frame leading-latency offset even with `latencyMode:'realtime'`; mediabunny writes duration as `lastSample.timestamp + lastSample.duration` so N frames at F fps come out F×N/(N+1).
- Firefox VideoEncoder doesn't echo back per-frame `duration` — returns its own default (~33333µs = 30fps assumption).
- Firefox `bitrateMode:'variable'` default under-runs target on smooth fractal content. Use `'constant'`.
- Firefox H264 bitrate hard-capped at ~31 Mbps via Cisco OpenH264 Level 4.0 ceiling (Mozilla can't ship libavcodec due to MPEG-LA). No JS workaround. Symptom: 12→60 Mbps slider barely changes file size.
- WebCodecs `align=2` not 16: encoders pad internally and signal display crop in SPS; align=16 shaved 1080→1072.
- H264Converter custom AnnexB→AVCC removed: mediabunny ≥1.34 muxer does same natively when `meta.decoderConfig.description` missing + codec is `avc`.
- StreamTarget `chunked:true` finalize() internally closes FSWFS — calling close again throws. Cosmetic error only; file written successfully.
- Mic access denied: site must be `https://` or `localhost` — browsers block insecure origins. Check OS perms too.
- Z-fighting/ripples from Ray Detail too high (epsilon too small for depth): increase Pixel Threshold or lower Detail.
- Banding in gradients: low bit-depth buffer; set Buffer Precision Float32 or enable Color Grading (dithering).
- DOF picking with blur: depth buffer noisy. Fix: 3x3 neighborhood average around center pixel.
- DOF screen-shaking with blur: used animated blue noise (uFrameCount changing each frame). Fix: stable per-pixel blue noise during navigation, animated during accumulation for Monte Carlo convergence.
- Blue noise resolution uniform `uBlueNoiseResolution` not updated when texture loaded async → wrong sampling on GitHub Pages. Fix: texture load callback updates uniform with actual dimensions; hardcode 512×512 in schema for initial.
- Black patches in PT reflections (concave regions): `biasEps` used bounce travel distance `d` → small in concave geometry → bias collapses → cascading self-intersection → black miss. Fix: `pixelSizeScale * length(p_ray)` (camera-to-point). Same fix applied to direct reflections. Mandelbulber uses `cameraDistance * pixelAngularSize / detailLevel`; Fragmentarium uses `minDist * 3-8x`.
- iOS black screen: separate WebGL context check for HalfFloat16 support fails on iOS Safari. Fix: use HalfFloat16 directly on mobile (modern iOS supports it).
- Mobile light gizmo offset: `renderer.domElement.width / window.devicePixelRatio` doesn't always match CSS size on high-DPI mobile. Fix: `getBoundingClientRect()`.
- Mobile panel layout: auto-redirect Engine/Camera Manager to right dock; detection via `matchMedia("(pointer: coarse)")` + `innerWidth < 768`.
- Initial canvas low-res until manual resize: TWO causes — (1) renderWorker.setupEngine set `uResolution` + `pipeline.resize()` with CSS pixels instead of physical (×DPR); (2) WorkerTickScene post-compile resize captured `size`/`dpr` in mount-time useEffect closure → stale after async shader compile. Fix: use `initPhysW/H` for setup; track latest size in `useRef` not closure.
- FPS drops during interaction: new typed arrays per frame causes GC pressure. Fix: reuse buffers in refs/module-level (RenderPipeline depth readback, usePhysicsProbe pixel reads).
- Bucket render black stripes between tiles: UV-space float comparisons had precision mismatch with `vUv` computation; boundary pixels discarded by both adjacent tiles. Fix: GL scissor rect with integer pixel bounds; render region expanded half-pixel.
- `state.canvasPixelSize` reads pitfall: Fixed-mode lags 1+ frames behind setResolutionMode/setFixedResolution (ResizeObserver async). NEVER read directly — use `getCanvasPhysicalPixelSize(state)` which derives from `fixedResolution × dpr` in Fixed mode. Authoritative writer: `ViewportArea.tsx` observes `viewportRef` (flex-1 div between docks) — `WorkerDisplay`'s absolute-positioned inner div sometimes missed dock-toggle layout updates.
- Bucket render corruption from UI mid-render: three-layer lock (worker message filter + UI lock `isExporting` + resize guard on `isBucketRendering`).
- Firefox ~50% lower FPS than Chrome — Firefox platform limitation, not a code bug. Chrome uses GPU-native D3D11 shared handles (zero-copy from worker GPU to compositor). Firefox uses `SharedSurface` + `RemoteTextureMap` IPC with implicit GPU fence sync ~16ms per frame, ONLY at OffscreenCanvas default framebuffer. FBO computes (fractal raymarch) run full speed. Mitigation: Adaptive Resolution. Bugzilla refs: 1657125, 1788206, 1791693. Firefox also lacks `KHR_parallel_shader_compile` → compileAsync degrades to synchronous.
- HalfFloat16 readback: cannot read directly as floats. Use `Uint16Array` then convert via half-to-float function.
- Environment sky image not loading for some formulas: shader checks `uUseEnvMap > 0.5`; `useEnvMap` defaults `false`; some formula presets don't set it. Fix: `createFeatureSlice` auto-sets `useEnvMap=true` when `envMapData` loaded; auto-disables when cleared; same pattern for texturing.
- Sample cap not applied on startup: initial `SET_SAMPLE_CAP` arrives before worker engine exists. Fix: `engine.onBooted` callback re-sends sample cap.
- Convergence stuck at 100%: only measured after 2+ accumulated samples and every 8 frames; needs camera stopped + accumulation enabled + 16+ frames.
- Convergence inaccurate: historical 64×64 hardcoded target sampled 0.2% of 1080p; hot spots missed. Fix: dynamic target sizing capped 256×256 — 1080p coverage ~6%.
- Region resize handles non-functional: code checked for `target.dataset.handle` but no DOM elements with `data-handle` attributes. Fix: added 8 handle elements n/s/e/w/ne/nw/se/sw with `data-handle` attrs, `group-hover/box:opacity-100`.
- React Flow v11 `project()` coords gotcha (clientToFlow helper) — see Modular doc.
- `onNodesDelete` races `handleRemoveNode` bridge edge — see Modular doc.
- Ghost insert dropdown click propagates to pane click — `setTimeout(0)` defers.
- Sphere area lights UX gotchas — "shadow looks same after switching to Sphere" requires `ptAreaLights` compile gate; Direct mode falls through to Point at sphere center (latent bug fixed 2026-05-03 where Direct was treating Sphere as Directional); Hardness slider has no effect on Sphere (derived from physical sphere sampling); soft shadow jitter disabled for Sphere when ptAreaLights on (mixing would double-soften or overwrite lDir); per-bounce cost scales with MAX_LIGHTS — 8+ lights with ptAreaLights = bench-verify.
- PopupSliderSystem keys 1-6 removed: key events unreliable in capture-phase handler stack; keys 1-9 now reserved for Camera Slot recall (Ctrl+1-9 to set).

MAY BE STALE: Specific file paths post-extraction (many reference root-level `engine/` and `features/` from pre-fork layout). Some upstream browser bugs may have shipped fixes (Firefox 1791693 already showed 22-68% improvement). The "Mandelorus" naming fix is historical.

## docs/gmt/07_Code_Health.md

Technical debt tracker — completed refactors (DDFS migration, visual slice removal, lite render unification, ShaderConfig extraction, dead code cleanup, console statement audit, mobile fixes, performance fixes, vector formula params, animation system vector support), `any` type per-file triage (5 categories, 452→320), `@ts-ignore` audit (all 22 converted to @ts-expect-error), file complexity analysis (9 files >700 lines with split plans), error handling audit (silent catches + async coverage), camera state audit (unified coordinate system complete), store initialization race condition catalog, shader magic numbers audit (80+ literals classified).

Key decisions:
- DDFS migration complete: legacy manual event subscriptions in fractalStore replaced by automated `createFeatureSlice`.
- `engineConfig.mode='compile'` vs `'runtime'` distinction.
- `shader:` renamed to `postShader:` in FeatureDefinition — `inject()` targets raymarching shader, `postShader` targets screen-space post-process pass.
- `FeatureShaderLibrary`/`shaderLibrary` removed — migration stepping stone never used by any feature; `inject()` supersedes it completely.
- `shaderGenerator` removed from FeatureDefinition — never read by any engine code.
- Engine-React decoupling: zero engine files import Zustand. `CPUDistanceEstimator.ts` deleted (dead code). `VideoExporter.ts` deleted (superseded by WorkerExporter). `AnimationEngine.ts` refactored to injected `connect()` pattern.
- Sequence undo/redo standardized to LIFO (was FIFO in sequenceSlice while camera/param were LIFO); `paramUndoStack` capped at 50 entries.

Preservable (Debt items — Phase 2 should evaluate each for current relevance):

HIGH PRIORITY DEBT:
- `any` type usage: 452→~320. C1 (~30 browser API gaps — leave), C2 (~95 fixable — FIXED 2026-03-13), C3 (~175 structural DDFS dynamics — DEFERRED pending FeatureStateMap), C4 (~110 inherently generic — leave), C5 (~40 mediabunny/codec interop — leave). Fix for C3: `FeatureStateMap` interface mapping all feature IDs to state types, intersected with ShaderConfig + FractalStoreState — would eliminate ~175 instances. Deferred because adding feature requires new map entry (friction on primary developer activity).

MEDIUM PRIORITY DEBT:
- File complexity 9 files >700 lines: `FractalEngine.ts` (851 — left as-is, core orchestrator), `renderWorker.ts` (829 — moderate split candidate, extract `workerHistogram.ts` + `workerDepth.ts`), `FormulaWorkshop.tsx` (750 — left, domain-specific wizard), `WorkerProxy.ts` (735 — left, 1:1 method-to-protocol mapping), `dec-preprocessor.ts` (717 — left, clean code just long), `AdvancedGradientEditor.tsx` (715 — left, canvas+interaction low debt density). Already done: RenderPopup split → exportModulations.ts/exportHelpers.ts (903→748); FormulaSelect split → FormulaContextMenu/FormulaGallery (901→187).

LOW PRIORITY DEBT:
- Boot timing heuristic `useAppStartup.ts:31` — 50ms setTimeout, "Yield to allow other useEffects to hydrate store before we read it". Fragile but works in practice. Fix if ever needed: explicit ready signal via ref set by useAppStartup that bootEngine checks.
- Mobile UI cramped on vertical screens — CSS tuning needed for auto-generated panels.
- Duplicate JSX types in `types.ts` lines 14-75 — consider `@react-three/fiber` types.
- Shader magic numbers 80+ literals across 19 files. Partially fixed: 30+ comments added, `INV_TAU`/`INV_PI` extracted. Remaining named-constant candidates: `PRECISION_RATIO_HIGH` (5.0e-7), `PRECISION_RATIO_LOW` (1.0e-5), `GGX_EPSILON` (0.0001), `DIR_LIGHT_DIST` (100.0), consistent use of `MAX_DIST` (1000.0).
- `three-stdlib` direct dep technically redundant (transitive via drei) but kept: prevents version drift, zero cost (already installed). Single import: `Navigation.tsx:5`.
- Camera state — unified coordinate system complete; remaining edge case: rapid teleport collision during preset load (rare 1-frame jump, marked N/A — `applyPresetState` sets `activeCameraId` via direct `set()` not `selectCamera()`).
- Store init race conditions: RC-1 subscriptions created before worker exists (LOW — `WorkerProxy.post()` no-ops when `_worker` null; BOOT carries config); RC-2 loadPreset vs initWorkerMode (LOW — worker doesn't compile from INIT, waits for BOOT); RC-3 50ms setTimeout boot assumption (LOW — synchronous loadPreset); RC-4 renderMode subscription (FIXED — `if (val === undefined) return` guard); RC-5 dual OFFSET_SET (FIXED — removed duplicate from WorkerDisplay).

CONSOLIDATION OPPORTUNITIES (deferred):
- NeighborKeyData extraction from useDopeSheetInteraction + useGraphInteraction (identical 7-field interface + collection algorithm + tangent ratio-scaling loop); DopeSheet 1D vs Graph 2D distinction must be preserved; target: `utils/timelineUtils.ts`.
- `worldToStorePos(worldPos, offset)` helper — `x + so.x + (so.xL ?? 0)` pattern repeated for all axes across 4+ sites (useInteractionManager, LightPanel, LightGizmo). Touches hot paths — needs regression testing.

ASPIRATIONAL:
- Generate TypeScript types from FeatureRegistry for full type safety.
- Implement test suite — highest ROI: `utils/GraphCompiler.ts` (pure compileGraph→GLSL), `engine/math/AnimationMath.ts` (stateless Bezier/tangent math), `utils/FormulaFormat.ts` (GMF roundtrip), `utils/graphAlg.ts` (cycle detection + toposort), `store/createFeatureSlice.ts` (DDFS slice generation).
- Migrate to `@react-three/fiber` built-in JSX types.
- Establish explicit camera ownership model with sync-back events.

INSTITUTIONAL KNOWLEDGE WORTH KEEPING:
- Error handling grade summary: video export A, file I/O A, worker comm A, shader compilation A, audio A, frag importer A-, silent catches A- (11 of 13 justified patterns).
- Camera state truth ownership: R3F camera = truth during interactive input; Engine/worker = truth during animation playback and export; Store = truth for persistence.
- Bundle optimization 2026-04-09: formula chunk split (formulas/index.ts deferred to async, `PREDEFINED_CATEGORIES` extracted to string-literal IDs); reactflow + mediabunny removed from manualChunks (lazy-loaded by consumers); 630KB→484KB gzip initial load (-23%).
- Cleanup 2026-04-12: -319 lines across 65 files. Notable dead code patterns: dead methods (`MaterialController.updatePostProcessUniforms`, `VirtualSpace.updateCameraBasis`), dead store actions superseded by higher-level versions, dead interfaces exported but never imported, dead ternary `currentLight.fixed ? 10 : 10`. Shared helpers extracted: `useHelpContextMenu(extraIds?)` replaced 10 copy-pasted handlers; `isRotationTrack(trackId)` replaced 5 inline regex; `OnOffBadge` parameterized cyan/purple/green replaced 5 spans.

MAY BE STALE: Specific line counts and file paths post-extraction. `any` instance counts. The `FeatureStateMap` aspiration may have been implemented since. The 50ms setTimeout boot assumption is referenced in MEMORY.md as still present though — likely current. Many of the "REMAINING" items may have shipped fixes.

## docs/gmt/08_File_Structure.md

Project file map covering root configuration, engine core (FractalEngine/RenderPipeline/ShaderFactory/ShaderBuilder/ConfigManager/UniformManager/etc.), worker subsystem files, DDFS feature modules, state management (slices + animation sub-slices), components hierarchy (panels/timeline/flow/inputs/vector-input/topbar), shader chunks, utils, the standalone mesh export tool, prototypes (restir-gi WIP, deep-zoom), data files, and Vite build config + PWA settings.

Key decisions:
- WorkerProxy at `engine/worker/WorkerProxy.ts` is a no-op fallback + registry; real proxy at `engine-gmt/engine/worker/WorkerProxy.ts` is installed via `setProxy(realProxy)` from `engine-gmt/renderer/install.ts` so generic dev/ code and engine-gmt share the SAME singleton. Apps that don't install (test harnesses, fluid-toy) get no-op.
- LoadingRenderer + LoadingRendererCPU: standalone raw WebGL + CPU fallback for splash screen.
- PWA `registerType: 'prompt'` — new SW waits for user approval; prevents silent stale-cache breakage on shader/formula deploys. Update prompt surfaces as amber "Update available — reload" button in System Menu.
- PWA precache ~9MB / 269 entries: hashed assets + blueNoise.png + 178 formulas (frag/manifest/dec) + thumbnails + gmf gallery scenes.
- Bundle chunks: three / react / three-drei / three-fiber / reactflow (later removed) / mediabunny (later removed) / pako.
- `webm-muxer` dep removed — wasn't actually used.

Preservable:
- File-to-role table is canonical reference for the pre-extraction layout — useful for understanding what moved where in the engine extraction.
- `engine/codec/` subfolder: `halton.ts` (TAA jitter + Monte Carlo low-discrepancy sequence — extracted from FractalEngine/H264Converter duplication), `VideoExportTypes.ts` (shared VideoExportConfig).
- `engine/utils/FullscreenQuad.ts` — `createFullscreenPass()` consolidated 10 sites; shared PlaneGeometry instance; fixed geometry leaks in 9/10 sites + mesh churn in WorkerHistogram + throwaway objects in BucketRenderer.readCompositePixels().
- Browser PWA support: Chrome/Edge full install/standalone/update; Safari macOS Sonoma+ installable via Share→Add to Dock (no address-bar prompt); Firefox no install but SW caching active.
- `vite-plugin-pwa` `devOptions:{enabled:false}` — SW disabled in dev to avoid Express middleware conflicts; `base:'./'` for relative asset paths (root + subdirectory deploy safe including GitHub Pages).
- WIP prototypes in `prototype/restir-gi/` (ReSTIR GI global illumination) and `prototype/deep-zoom/` (deep zoom precision experiments).
- Standalone mesh export tool at `public/mesh-export/` — HTML + ES2020 (no React); 6-phase GPU pipeline: SDF sampling → dual contouring → Newton projection → post-processing → vertex coloring → export.

MAY BE STALE: Heavily — many file paths reference root-level layout. Engine has been extracted to `engine-gmt/` and `dev/app-gmt/`. Some files may have been renamed/moved. PWA precache count and exact contents likely shifted.

## docs/gmt/21_Frag_Importer_Current_Status.md

Status report on the Fragmentarium .frag importer pipeline — V3 (primary, AST-based, default) and V4 (verified beta) with V2 fallback chain. Documents the honest measured pass rates after switching the verification harness from a simplified WebGL scaffold to the real engine `ShaderFactory.generateFragmentShader()` path. V4 verified 360 passing formulas (112 Frag + 248 DEC) vs V3's 216 — +144 formulas with V4 eliminating ~96% of NaN failures (sampleFinite + sampleNonConstant: 114→5).

Key decisions:
- V4 core thesis (validated by measurement): preserve the DE body verbatim instead of extracting per-iteration. Per-iteration extraction misses out-of-scope locals; verbatim preservation handles them naturally.
- Both V3 and V4 now verified through the real engine ShaderFactory + full per-feature config — the exact runtime path.
- Workshop integration: V4 routed via `V4 pipeline (beta)` checkbox in Workshop footer.
- Formula library: 494 categorized formulas (178 Fragmentarium + 316 DEC), lazy-loaded via Vite `import.meta.glob('?raw')`.
- `passing-formulas.ts` auto-generated lists: `PASSING_FRAG_PATHS` (178) + `PASSING_DEC_IDS` (316).
- Skipped count = 370: 2D formulas, buffer shaders, `#donotrun` library files, `#define providesColor` formulas, non-3D raytracers. V4 correctly rejects more non-formulas than V3 (e.g. V3 accepted Classic-Noise, murmurHash, BuiltinFloat which are library helpers).
- Known baseline pessimism: meaningful fraction of "fails" compile cleanly but produce invisible output because harness uses generic uniform defaults; fractal DEs are parameter-sensitive — Phase B.8 makes preset defaults first-class.

Preservable:
- Harness honesty note: prior simplified scaffold diverged from real engine specifically by (1) pre-declaring `g_orbitTrap` at global scope (real engine declares mid-preamble via coloring feature), (2) auto-injecting `#version 300 es` + `vUv` (real engine relies on Three.js), (3) omitting `vec4 DE(vec3)` coloring wrapper (formulas named `DE` collide in real path), (4) not enforcing `coreMath`/feature structure of `defaultPreset` UI expects.
- V4 fixes that delivered final numbers: DE → `frag_DE` rename to avoid coloring-wrapper collision, V4-owned `_v4_orbitTrap` copied to engine global in wrapper, ambient define injection for `time`/`M_PI`/`iGlobalTime`, reuse of V3's `buildFractalParams` for preset shape.
- g_orbitTrap shadow fix: Fragmentarium formulas declare `vec4 orbitTrap = vec4(10000.0)` inside DE; after rename becomes `vec4 g_orbitTrap = vec4(10000.0)` — local variable SHADOWS engine global. Trap writes go to local, engine reads untouched global (1e10), coloring constant. Fix: regex `code.replace(/\bvec4\s+g_orbitTrap\b/g, 'g_orbitTrap')` strips the `vec4` prefix in both `v3/generate/index.ts` and `v3/generate/full-de.ts` — converts local declaration to assignment to engine global. For formulas not using orbitTrap: inject default fallback `trap = min(trap, dot(f_z, f_z))`.
- Degree/radian handling (`isDegrees`): name heuristics (angle/rot/theta/phi/yaw/pitch/roll) + range heuristics (±90/±180/±360). When detected: param-builder keeps internal value in DEGREES (what GLSL expects), sets `scale:'degrees'`, FormulaPanel renders with π notation (360°→"2.00π"). Distinct from `scale:'pi'` (DDFS features in radians).
- Full-DE fallback: when per-iteration extraction breaks (out-of-scope locals in getDist, unbounded vec4 inversions), entire DE runs inside single `frag_DE(vec3 f_z)` call; `formula_NAME()` calls it once, caches distance, forces engine bailout. Hardcoded loop limits replaced with `MAX_HARD_ITERATIONS` + `uIterations` break.
- getDist generation paths: (1) Accumulator d=max(d,d1) NewMenger pattern → `return vec2(dr, iter)`; (2) Expression — last `return` statement, AST rename + substitutions `f_z→z.xyz`, `length(z.xyz)→r`, `z.w→dr`, inline computed globals; (3) Full-DE → cached `vec2(frag_cachedDist, frag_iterCount)`; (4) No distanceExpression → undefined, engine uses standard.
- Known remaining issues: local vars in getDist scope (QuaternionJulia/LivingKIFS/BioCube/FoldcutToy/RecFold — fall back to full-DE); PseudoKleinian orbit trap (DE in helper function, writes don't propagate — full-DE partially mitigates); `p` variable conflict (DE param `p` rename collides with vec4 tracker `p` — usually handled by scope-aware renaming).

MAY BE STALE: V4 cutover status — doc says "V4 verified... cutover pending interactive validation". Status almost certainly evolved. Numbers may have shifted with more formulas added. Workshop UI footer checkbox may have changed.

## docs/gmt/22_Frag_to_Native_Formula_Conversion.md

Step-by-step conversion guide for porting Fragmentarium `.frag` formulas to native GMT formula `.ts` files. Native preferred over auto-import: instant load, hand-tuned labels/ranges, optimized GLSL (preamble pre-calc), curated default presets. Process developed during MixPinski conversion 2026-03-08 as repeatable template.

Key decisions:
- 9-step process: identify source → analyze structure → map params → write shader → handle rotation → custom DE → default preset → register → build & test.
- Frag→GMT concept mapping table (uniforms→slots, MI→uIterations, orbitTrap→trap parameter, float DE returning distance → in-place formula function modifying z/dr/trap).
- Param slot inventory: 6 scalar (`paramA-F`) + 3 vec2 + 3 vec3 with optional `mode:'rotation'` and `linkable:true`.
- `paramB` is wired as `z.w` (4D init) by DE_MASTER; `paramA` is wired as `c.w` (Julia 4th dim).
- Rotation optimization: pre-calc trig in preamble (runs once/frame), use Rodrigues' formula in loop body, guard with `if (abs(angle) > 0.001)` to skip when zero.
- Estimator selection: 0 Analytic log (power fractals/Mandelbulb), 1 Linear (r-1)/dr (box/Menger IFS), 2 Pseudo r/dr raw, 3 Dampened (fixes slicing), 4 Linear (r-2)/dr (classic Menger offset). When using custom `getDist`, estimator setting ignored.
- Since 2026-04-03: formulas in interlace system MUST declare `preambleVars` (lists mutable preamble vars for variable-scoping) + `usesSharedRotation:true` (if using shared `gmt_precalcRodrigues()` so interlace saves/restores rotation state between primary/secondary).

Preservable:
- Conversion checklist (15 items): source identified → math structure understood → params mapped with labels → shader function written → DR tracking (dr *= scale at each stage) → orbit trap coloring preserved → rotation optimized → custom getDist if non-standard → preambleVars declared if mutable preamble → usesSharedRotation if using shared Rodrigues → default preset tuned → registered in FormulaType+index+categories → tsc clean → vite build → visual test.
- formula function signature: `void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c)`.
- shader object fields: `function` (per-iter body), `loopBody` (usually just `formula_NAME(z, dr, trap, c)`), `loopInit` (once before loop, e.g. preamble functions), `preamble` (global scope, pre-calc consts/helpers), `getDist` (custom DE body, signature `vec2 getDist(float r, float dr, float iter, vec4 z)` returning `vec2(distance, smoothIteration)`).
- Without `preambleVars`, interlace produces shader compilation errors from variable redefinition. Dev-mode `console.warn` fires when mutable preamble vars detected without matching declaration.
- Rodrigues rotation snippet (pre-calc + in-loop application).
- MixPinski conversion case study: 4D formula uses `z.w`=paramB, `vec4 offsetS` split to vec3A+vec2A.x, `vec4 offsetM` split to vec3B+vec2A.y, two scales `scaleS`/`scaleM`→paramA/paramC, Chebyshev 4D DE → custom getDist with `max(abs(z.xyzw))`, 4D rotation (6 planes) simplified to 3D Rodrigues via vec3C `mode:'rotation'`. Old formula renamed to `SierpinskiTetrahedron` (what it actually was).
- Aspirational: prefer descriptive labels ("Sierpinski Scale" not "paramA"); group related params (scale + offset for same transform stage); 4D offsets split xyz→vec3*+w→vec2*; use `vec3` `linkable:true` for per-axis scale; use `vec3 mode:'rotation'` for rotation controls.

MAY BE STALE: Cross-refs to docs 24/25 — interlace and formula dev reference — those docs were the surviving sources of truth and this conversion guide is essentially superseded by 22_Frag_to_Native plus 25_Formula_Dev_Reference in current docs. Specific formula counts and example file paths.
