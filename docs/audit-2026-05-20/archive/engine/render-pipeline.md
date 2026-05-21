---
source: engine/RenderPipeline.ts
lines: 612
last_verified_sha: f66f42f7da36611cf4fc2a1c8479b48c2abb1bf9
additional_sources:
  - engine/BloomPass.ts
  - engine/AccumulationController.ts
audited: 2026-05-20T09:30:00Z
audited_by: claude-opus-4-7
public_api:
  - RenderPipeline
  - BloomPass
  - AccumulationController
depends_on:
  - e04-shader-builder
---

# Render Pipeline + Bloom + Accumulation Controller

This subsystem owns the three engine-core modules that drive the per-frame GPU work: ping-pong temporal accumulation (`engine/RenderPipeline.ts`), a multi-pass progressive bloom (`engine/BloomPass.ts`), and the generic contract that lets the store / UI / animation layers drive any accumulating renderer (`engine/AccumulationController.ts`). The pipeline owns FBOs, scissor/region state, and an async convergence-measurement loop; bloom is a pure post-process; the accumulation controller is a 4-member interface, not a class.

## Public API

### `RenderPipeline`

`class RenderPipeline` (engine/RenderPipeline.ts:38) — the temporal-accumulation orchestrator. One instance per renderer.

Public fields:
- `frameCount: number` (engine/RenderPipeline.ts:47) — monotonic frame counter.
- `accumulationCount: number` (engine/RenderPipeline.ts:48) — sample count since last reset; exposed for UI monitoring.
- `lastCompleteDuration: number` (engine/RenderPipeline.ts:51) — wall-clock duration of the last full-cap accumulation.
- `isHolding: boolean` (engine/RenderPipeline.ts:89) — when true, `render()` is a no-op.

Public methods (engine/RenderPipeline.ts):
- `setConvergenceNeeded(v: boolean)` (:87) — gates the viewport convergence pass; defaults off.
- `updateQuality(q: QualityState)` (:98) — stores `bufferPrecision` / `precisionMode` / `compilerHardCap`; reallocates targets on precision change.
- `setAccumulationEnabled(enabled: boolean)` (:109) — toggling off pins `accumulationCount = 1`.
- `getPreviousColorTexture(): THREE.Texture | null` (:119) — the just-written color texture (see "writeIndex semantics" below).
- `getPreviousRenderTarget(): THREE.WebGLRenderTarget | null` (:131) — same, returns the FBO for readback.
- `getCompileTarget(): THREE.WebGLRenderTarget | null` (:143) — lazy 1×1 FBO matching the live float type, for `compileAsync` program-hash matching.
- `readPixels(renderer, x, y, w, h, buffer): boolean` (:184) — synchronous readback from the previous frame; auto-handles half-float decode.
- `resize(width, height)` (:297) — reallocates ping-pong targets when WxH or float type changes.
- `setSampleCap(cap: number)` (:311) — hard cap on `accumulationCount`; 0 = uncapped.
- `getSampleCap(): number` (:318)
- `resetAccumulation()` (:322) — zeros count, `isHolding`, last duration, last convergence.
- `clearTargets(renderer)` (:333) — clears BOTH ping-pong targets; used by bucket renderer between buckets.
- `setHold(hold: boolean)` (:348)
- `getCurrentFrameDuration(): number` (:352)
- `getOutputTexture(): THREE.Texture | null` (:362) — same inversion as `getPreviousColorTexture`.
- `measureConvergence(renderer, boundsMin?, boundsMax?): number` (:390) — **synchronous, stalls GPU**; marked legacy in the source comment.
- `startAsyncConvergence(renderer, boundsMin, boundsMax): void` (:431) — WebGL2 fence-based; gracefully falls back to sync when `fenceSync` is unavailable.
- `pollConvergenceResult(renderer): number | null` (:474) — non-blocking poll; returns null when GPU isn't done.
- `getLastConvergenceResult(): number` (:510) — cached value for the null-return polling path.
- `setBucketRendering(active: boolean)` (:515) — disables the viewport convergence hook so the bucket renderer can drive its own.
- `setBucketScissor(rect | null)` (:519) — per-bucket scissor in target-local pixels.
- `render(renderer, uniforms?, scene?, camera?)` (:524) — the per-frame draw + ping-pong swap + uniform-write entry point.

Module-local: `QualityState` shape with optional `bufferPrecision` / `precisionMode` / `compilerHardCap` (engine/RenderPipeline.ts:8-12); `CONVERGENCE_FRAG` GLSL constant (engine/RenderPipeline.ts:15-36); `VIEWPORT_CONVERGENCE_INTERVAL = 8` and `CONVERGENCE_MAX_DIM = 256` (engine/RenderPipeline.ts:71, 258).

### `BloomPass`

`class BloomPass` (engine/BloomPass.ts:145) — multi-pass progressive bloom. Single instance per renderer; sized by `resize()`.

Public methods (engine/BloomPass.ts):
- `constructor()` (:170) — builds 4 ShaderMaterials and a shared fullscreen pass scene/camera/mesh.
- `resize(width, height)` (:225) — re-allocates the 7-mip ping-pong chain at progressive half-resolutions.
- `render(inputTexture, renderer, threshold, radius): THREE.Texture | null` (:251) — runs bright-pass → downsample → blur → progressive upsample; returns `mipB[0].texture` at half-res, or null if `resize()` has not run.
- `getOutput(): THREE.Texture | null` (:325)
- `dispose()` (:339) — disposes mip targets + materials; the shared fullscreen geometry is deliberately kept alive.

Module-local: `MIP_COUNT = 7` (engine/BloomPass.ts:16); `BLOOM_VERT`, `BRIGHT_PASS_FRAG`, `DOWNSAMPLE_FRAG`, `BLUR_FRAG`, `UPSAMPLE_FRAG` GLSL constants (engine/BloomPass.ts:19-130); `createRT(w, h)` helper (engine/BloomPass.ts:133).

### `AccumulationController`

`interface AccumulationController` (engine/AccumulationController.ts:19) — the generic contract any sample-accumulating renderer (path tracer, fluid sim, particle system) implements so the store / UI / animation layers can drive it.

Members:
- `readonly accumulationCount: number` (engine/AccumulationController.ts:21)
- `readonly convergenceValue: number` — lower = more converged (engine/AccumulationController.ts:24)
- `isPaused: boolean` — setting it pauses/resumes immediately (engine/AccumulationController.ts:29)
- `setPreviewSampleCap(n: number): void` — generic sample cap; name is historical (engine/AccumulationController.ts:38)
- `resetAccumulation(): void` (engine/AccumulationController.ts:41)

The interface deliberately has no class implementation in this subsystem — engine-core's `engine/worker/WorkerProxy` ships an inert stub, and `engine-gmt/engine/worker/WorkerProxy` is the real GMT bridge (engine/AccumulationController.ts:12-14). The store→controller half of the binding is owned by `installAccumulationBindings` (`store/slices/installAccumulationBindings.ts`); the controller→store reporting half is the renderer's tick driver's job; `RESET_ACCUM` flows over the event bus (followup q-038).

## Architecture

- `RenderPipeline` owns two ping-pong color render targets (`mrtTargetA` / `mrtTargetB`) used for temporal accumulation and history readback; `writeIndex` tracks which side is next to write (engine/RenderPipeline.ts:41-45).
- Despite the "MRT" field names and the leading comment "texture[0] = Color, texture[1] = Depth" (engine/RenderPipeline.ts:39-40), the targets are single-attachment `WebGLRenderTarget`s — the comment inside `initTargets` says "Single render target (color only) - no MRT needed" (engine/RenderPipeline.ts:232). The naming is historical (see "Known issues / Phase 2 carry-in" below).
- Render targets are created as RGBA `FloatType` by default and switched to `HalfFloatType` when `bufferPrecision > 0.5` (engine/RenderPipeline.ts:229-241). `resize()` re-creates targets when width/height OR float type differs from current, disposing the old pair first (engine/RenderPipeline.ts:297-308). `updateQuality()` calls `resize()` whenever `bufferPrecision` changes (engine/RenderPipeline.ts:98-107).
- Temporal accumulation lives inside `render()`. Blend factor = `1 / accumulationCount` is written to `Uniforms.BlendFactor`; the previous frame's color is bound on `Uniforms.HistoryTexture` from the read target (engine/RenderPipeline.ts:545-555). The shader does the actual blend; the pipeline only manages the swap and the uniforms. The canonical shader-side consumer is the fractal `void main()` tail at `engine-gmt/shaders/chunks/main.ts` — the contract is documented for shader authors in `docs/gmt/02_Rendering_Internals.md` §3 (see followup q-034).
- `accumulationCount` is pinned to 1 when accumulation is disabled, otherwise initialised to 1 on the first call and incremented thereafter (engine/RenderPipeline.ts:538-543). `sampleCap > 0` stops rendering once `accumulationCount >= cap` (engine/RenderPipeline.ts:528-530, 587-589).
- The buffer swap happens AFTER the render call (`writeIndex = 1 - writeIndex` at engine/RenderPipeline.ts:583), so the "previous" target is the one currently pointed to by `writeIndex` (the next write slot). Both `getPreviousColorTexture` and `getPreviousRenderTarget` invert this convention with an explicit comment (engine/RenderPipeline.ts:114-134).
- `_compileTarget` is a lazily-created 1×1 FBO that mirrors the live MRT's float type/format so Three.js generates an identical program hash during `compileAsync`, without interfering with the live render loop (engine/RenderPipeline.ts:140-156).
- `readPixels()` reads from the previously-written target; for half-float targets it reads into a reusable `Uint16Array` (`_halfFloatBuffer`) and converts to Float32 via the bit-twiddling `halfToFloat()` (engine/RenderPipeline.ts:161-225). The reusable buffer avoids per-frame allocation (engine/RenderPipeline.ts:206-209). `halfToFloat`'s subnormal branch uses `Math.clz32` for the leading-bit count (engine/RenderPipeline.ts:169).
- Convergence measurement renders the `CONVERGENCE_FRAG` shader (max-component L-inf delta between targets A and B, remapped to a UV sub-region) into a dedicated `convergenceTarget` capped at `CONVERGENCE_MAX_DIM = 256` px so CPU readback stays cheap (engine/RenderPipeline.ts:258, 370-384). The target is created at 64×64 and `setSize`-d to the measured region per measurement; the readback buffer is reallocated to match (engine/RenderPipeline.ts:373-384).
- Two convergence APIs coexist: `measureConvergence()` is synchronous and stalls the GPU (engine/RenderPipeline.ts:386-424); `startAsyncConvergence()` + `pollConvergenceResult()` use a WebGL2 `fenceSync` + `gl.flush()` + non-blocking `clientWaitSync(timeout=0)` so readback only happens when the fence is signaled (engine/RenderPipeline.ts:431-507). Sync fallback when `fenceSync` is unavailable lives at engine/RenderPipeline.ts:464-467.
- A "viewport convergence" hook runs at the bottom of `render()`: every `VIEWPORT_CONVERGENCE_INTERVAL = 8` accumulation samples, when accumulating, not bucket-rendering, count > 2, AND `_convergenceNeeded` is true, it polls/starts an async convergence pass over `Uniforms.RegionMin` / `Uniforms.RegionMax` (defaults to full viewport) (engine/RenderPipeline.ts:71, 591-610).
- `_convergenceNeeded` defaults false and is the gate guarding against wasted work when no UI consumer is mounted. The header comment names `RegionOverlay` (engine-gmt) as the sole consumer toggled via `SET_CONVERGENCE_NEEDED` worker message (engine/RenderPipeline.ts:79-87).
- `setBucketRendering(true)` suppresses the viewport convergence hook so the bucket renderer can drive its own measurements (engine/RenderPipeline.ts:514-517, 596). `setBucketScissor(rect | null)` clips the main render to a target-local pixel rect; the rect must be applied AFTER `setRenderTarget()` because three.js's `setRenderTarget` overwrites scissor state with the target's stored values (engine/RenderPipeline.ts:76-78, 562-578).
- `clearTargets()` clears BOTH ping-pong targets, used by the bucket renderer between buckets to prevent bleed (engine/RenderPipeline.ts:329-346).
- `BloomPass` is a 7-mip progressive bloom: bright-pass → 6 downsamples → separable 9-tap gaussian blur per active level → progressive tent-filter upsample with weighted blend; final output is `mipB[0].texture` at half-res (engine/BloomPass.ts:251-323). The header comment still says "5 mip levels" but `MIP_COUNT = 7` — header is stale (engine/BloomPass.ts:6, 16).
- BloomPass mip chain is built at progressive half-resolutions starting from `floor(width/2) × floor(height/2)`; each level halves again (engine/BloomPass.ts:236-244). Targets use `HalfFloatType` / `LinearFilter` (engine/BloomPass.ts:133-143).
- `activeLevels = clamp(ceil(radius + 0.5), 2, MIP_COUNT)` controls bloom spread (engine/BloomPass.ts:276-278); the deepest active level's contribution fades with fractional `radius + 0.5 - levelDepth` (engine/BloomPass.ts:299-312).
- Bright-pass uses a soft-knee threshold (knee = threshold/2) and a step gate to avoid div-by-zero darkening of pure black (engine/BloomPass.ts:36-50).
- All `BloomPass` materials use `glslVersion: THREE.GLSL3` and share a single fullscreen pass scene/camera/mesh (engine/BloomPass.ts:170-223). `dispose()` keeps the shared fullscreen geometry alive on purpose; the comment "Geometry is shared across all fullscreen passes — don't dispose it" is the contract (engine/BloomPass.ts:348).
- `BloomPass.render()` returns a texture but does not composite it. The actual blend (`col += texture(uBloomTexture, sampleUV).rgb * uBloomIntensity`) is injected into the post-process display material by the `post_effects` feature, and the JS-side wiring (`displayMaterial.uniforms.uBloomTexture.value = bloomPass.getOutput()`) lives in `engine-gmt/engine/worker/handleRenderTick.ts`. Composition is plain additive in linear HDR before tone mapping; see followup q-037 for the full path.
- `AccumulationController` is an interface, not a class — a generic contract for any sample-accumulating renderer that engine-core's `renderControlSlice` binds to via `installAccumulationBindings` (engine/AccumulationController.ts:1-18, 38).

## Invariants

- **`writeIndex` semantics are inverted vs intuition.** The field points to the NEXT target to write, so "previous frame" = target opposite to `writeIndex`. Both `getPrevious*` helpers and `getOutputTexture()` invert. The comments at engine/RenderPipeline.ts:114-134 and engine/RenderPipeline.ts:362-367 spell this out — any new consumer must read those comments before adding a helper.
- **"MRT" naming is historical.** Fields named `mrtTargetA/B` are single-attachment color-only targets (engine/RenderPipeline.ts:232). The header comment at engine/RenderPipeline.ts:39-40 ("texture[0] = Color, texture[1] = Depth") and the inline comment at engine/RenderPipeline.ts:559 ("SINGLE render to MRT - outputs both color (location 0) and depth (location 1)") describe an older MRT architecture that no longer exists.
- **`_compileTarget` must mirror MRT float type.** If the live target is `HalfFloat` and the compile target is `Float`, Three.js program param hashes diverge and async compile defeats its purpose (engine/RenderPipeline.ts:145-153). `getCompileTarget()` lazy-creates after `mrtTargetA` exists; do not call before `initTargets`.
- **`_halfFloatBuffer` is sized lazily** and shared across `readPixels` calls; if successive calls pass differently-sized rects, it reallocates (engine/RenderPipeline.ts:206-209). Frequent size changes defeat the reuse optimisation.
- **Convergence target re-sizing reallocates the readback buffer** whenever measured region pixel dims change (engine/RenderPipeline.ts:373-384). Region animations that change size every frame will reallocate every measurement.
- **WebGL2 fence is the fast path.** The sync fallback in `startAsyncConvergence` is the very stall the async API exists to avoid (engine/RenderPipeline.ts:464-467). Any deployment target without `fenceSync` (historically some WebKit configs) silently falls back.
- **Bucket scissor must be set after `setRenderTarget`.** The explicit comment at engine/RenderPipeline.ts:562-564 records that three.js `setRenderTarget` overwrites GL scissor with the target's stored values. Any future refactor that hoists `setScissor` above `setRenderTarget` will silently break bucket rendering.
- **`accumEnabled=false` pins `accumulationCount=1`,** so `blend = 1/1 = 1.0` and the history texture is bound but contributes nothing through the shader's `mix(history, current, blend)`. Disabling accumulation is essentially a single-sample direct render (engine/RenderPipeline.ts:538-543; see followup q-034 for the shader contract).
- **`render()` is a no-op when `isHolding=true` or `sampleCap` is reached** (engine/RenderPipeline.ts:526-530). `clearTargets`, `resetAccumulation`, `resize` still function — the gate is only on the draw.
- **First-frame accumulation count is set to 1, not incremented,** so the first frame's blend factor is 1.0 (full replace), matching the expected first-sample behaviour (engine/RenderPipeline.ts:541).
- **Convergence requires TWO valid targets containing successive frames.** `accumulationCount <= 1` short-circuits to return 1.0 since there is no "previous" frame to diff against (engine/RenderPipeline.ts:397, 439).
- **`_convergenceNeeded` is the only thing preventing wasted work** when no UI consumer reads `convergenceValue`. Forgetting to call `setConvergenceNeeded(true)` from a new consumer = stale 1.0 reading forever; forgetting to clear it = 1 render + 2 setRenderTarget swaps + sync readPixels every 8 samples for nothing (engine/RenderPipeline.ts:79-87, 596).
- **`Math.clz32` (ES2015) is the only language feature with browser-runtime constraints** — `halfToFloat` calls it inside the subnormal branch (engine/RenderPipeline.ts:169). Every WebGL2-capable browser supports it. `readPixels` is guarded against a missing target and returns `false` (engine/RenderPipeline.ts:191). See followup q-039 for the full caller inventory; no SSR/Node path touches this today.
- **`AccumulationController.setPreviewSampleCap()` name is historic.** The docblock explicitly notes that the name predates the generic role and was kept to avoid a wide rename — do not infer "preview-only" semantics from the name (engine/AccumulationController.ts:34-38).
- **`BloomPass.dispose()` does NOT dispose the shared fullscreen geometry,** intentionally — the comment at engine/BloomPass.ts:348 records the rule. Future code that reaches into `this.mesh.geometry` and disposes it will break every other consumer of the shared fullscreen pass.

## Interactions with other subsystems

Outgoing dependencies:
- **e04-shader-builder** — uniform names are looked up via the `Uniforms` map from `engine/UniformNames.ts`. The pipeline writes `Uniforms.BlendFactor` and `Uniforms.HistoryTexture` every frame (engine/RenderPipeline.ts:553-554), and reads `Uniforms.RegionMin` / `Uniforms.RegionMax` for the viewport convergence pass (engine/RenderPipeline.ts:604-605). The shared `VERTEX_SHADER` from `shaders/chunks/vertex` is a 5-line fullscreen pass-through, also used by `engine-gmt/engine/MaterialController.ts` (followup q-035).

Incoming consumers (representative; not exhaustive):
- **g01-renderer** — `engine-gmt/engine/FractalEngine.ts` owns the only `RenderPipeline` instance per renderer. It drives the per-frame `render()` call, manages the `_qualityState` and `_accumulationEnabled` updates, and gives the pipeline its scene + camera + uniforms map.
- **g06-bucket-render** — `BucketRenderer` (now an 89-line shim at `engine-gmt/engine/BucketRenderer.ts`) and `GmtBucketHost` (`engine-gmt/engine/GmtBucketHost.ts`) consume the bucket API: `setBucketRendering(true)`, `setBucketScissor`, `clearTargets`, `startAsyncConvergence` / `pollConvergenceResult`. See followup q-036 for line-anchored integration points.
- **bloom composition** — `BloomPass.render()` is called from `engine-gmt/engine/worker/handleRenderTick.ts`, which assigns `bloomPass.getOutput()` into the post-process display material's `uBloomTexture` uniform. The actual blend is the one-line `col += texture(uBloomTexture, sampleUV).rgb * uBloomIntensity` injected by `engine/features/post_effects.ts`. See followup q-037.
- **accumulation control** — `store/slices/installAccumulationBindings.ts` subscribes `isPaused` and `sampleCap` from `renderControlSlice` onto any `AccumulationController` (the two implementors today are both `WorkerProxy` flavours). The renderer's tick driver pushes `accumulationCount` and `convergenceValue` back via `reportAccumulationToStore`. `RESET_ACCUM` flows over `FRACTAL_EVENTS`. See followup q-038.
- **picking / depth readback** — `engine-gmt/engine/controllers/PickingController.ts` and `engine-gmt/engine/worker/WorkerDepthReadback.ts` are the two real-world callers of `readPixels()`; both are browser-runtime only and guarded by the `mrtTargetA/B` initialised check at engine/RenderPipeline.ts:191. See followup q-039.

There is no incoming dependency on `e02-tick-registry` — the pipeline's `render()` is driven by whichever subsystem owns the per-frame loop, not by registered ticks. The tick registry is upstream of `FractalEngine`, not of `RenderPipeline` directly.

## Known issues / Phase 2 carry-in

- **drift / doc-rewrite-target** — "MRT" naming in `RenderPipeline` is dead weight. Field names (`mrtTargetA/B`), the leading comment "texture[0] = Color, texture[1] = Depth" (engine/RenderPipeline.ts:39-40), and the inline comment at engine/RenderPipeline.ts:559 describe an old multi-attachment architecture that no longer exists — the targets are color-only as the comment at engine/RenderPipeline.ts:232 acknowledges. Suggested rewrite: rename `mrtTargetA/B` → `colorTargetA/B` and reconcile the comments. Origin: survey.
- **drift / doc-rewrite-target** — `BloomPass` header comment says "5 mip levels" (engine/BloomPass.ts:6) but `MIP_COUNT = 7` (engine/BloomPass.ts:16). The comment in `render()` at engine/BloomPass.ts:277 also says "radius 5.0 → all 5" — stale. Update header and the radius comment to "7 mip levels" and "radius 5.0 → all 7". Origin: survey.
- **drift / doc-rewrite-target** — `docs/gmt/02_Rendering_Internals.md:643` uses `uHistory` in the example GLSL but the actual sampler name (engine + shader) is `uHistoryTexture`. Worth a one-line fix in §3.2 so shader authors can copy-paste the snippet. Origin: followup q-034.
- **doc-gap / doc-rewrite-target** — `uRegionMin` / `uRegionMax` form the "render only this sub-rect, pass history through outside it" half of the temporal-blend contract (the partial-region rerender used by progressive upsampling / preview). `docs/gmt/02_Rendering_Internals.md` §3.2 should add a sentence noting that the standard composite tail gates on the region rect before the `mix`. Origin: followup q-034.
- **drift / cleanup** — `CONVERGENCE_FRAG` uses GLSL1 `varying vec2 vUv` (engine/RenderPipeline.ts:17) while the imported `VERTEX_SHADER` from `shaders/chunks/vertex` declares `out vec2 vUv` in GLSL3. The convergence pass is wired via `createFullscreenPass` from `engine/utils/FullscreenQuad`, not via `VERTEX_SHADER` directly, so the two fullscreen-pass paths (direct `ShaderMaterial` vs `createFullscreenPass`) are not conflated in practice. Worth documenting which path the convergence shader actually uses. Origin: followup q-035.
- **cleanup** — `engine-gmt/engine/RenderPipeline.ts` is a 5-line `export *` re-export of engine-core's file; no content divergence today. The previous 19-line divergence (engine-gmt importing a narrower `QualityState` from `features/quality`) was collapsed by softening engine-core's `QualityState` to the loose-record shape at engine/RenderPipeline.ts:8-12 so GMT's stricter shape is structurally assignable. Future feature additions to either side need to keep the assignability invariant in mind. Origin: survey.
- **single-consumer assumption (bloom + history)** — Both `BloomPass.render()`'s output and `Uniforms.HistoryTexture` have exactly one authored consumer today. Any future second consumer (e.g. a separate post-process shader that also reads history) would need to replicate both the region gate and the blend. Extraction point: a `compositeHistory()` chunk under `engine-gmt/shaders/chunks/` if a second consumer ever lands. Origin: followup q-034.
- **`HalfFloat` readback path is browser-only** — `Math.clz32` in `halfToFloat` (engine/RenderPipeline.ts:169) is ES2015, available in every WebGL2 browser and Node ≥ 0.12. There is no SSR/Node path touching `readPixels` today; the test harnesses gate on `webglCompile`, and `test:render` runs in headless Chromium. If a Node-side bucket renderer ever lands, only a pre-ES2015 transpile target would be a concern. Origin: followup q-039.

## Historical context

There is no pre-existing module doc for this subsystem; rationale lives inline:

- The `RenderPipeline` "MRT" naming and the "texture[0] = Color, texture[1] = Depth" comment (engine/RenderPipeline.ts:39-40) preserve the memory of an earlier multi-attachment FBO architecture, even though the live targets are now color-only (engine/RenderPipeline.ts:232).
- The `_compileTarget` rationale ("Tiny 1×1 render target for compile-time program hash matching… separate FBO so compileAsync doesn't interfere with the live render loop") is captured in the field comment at engine/RenderPipeline.ts:136-140.
- The `_convergenceNeeded` gate rationale ("When no consumer is mounted, the measurement … is pure waste — the result is computed and never read") is captured at engine/RenderPipeline.ts:79-86.
- The bucket-scissor "must be applied after `setRenderTarget`" rule is captured in the comment at engine/RenderPipeline.ts:562-564, recording the three.js gotcha that justifies the otherwise-surprising call order.
- The `AccumulationController.setPreviewSampleCap` name-vs-semantics divergence is explicitly self-documenting in the JSDoc at engine/AccumulationController.ts:34-38 ("Method name is historic ('preview' cap in GMT, where it gated the interactive viewport vs export rendering). The semantics today are generic …").
- The `BloomPass.dispose()` "don't dispose shared geometry" rule is captured at engine/BloomPass.ts:348.

Shader-side rationale for the temporal-blend contract (the `mix(history, current, blend)` skeleton, the `uBlendFactor >= 0.99` "navigation frame" predicate used to gate stochastic AA / blue-noise jitter / volumetric clamps) is preserved in `docs/gmt/02_Rendering_Internals.md` §3 and `docs/VOLUMETRIC_HANDOFF.md`. This module doc supersedes those for the API surface and pipeline-side invariants; shader-author contract claims stay there. See followup q-034 for the cross-reference.
