---
subsystem_id: e05-render-pipeline
audited_at: 2026-05-19T22:40:47+02:00
files:
  - path: engine/RenderPipeline.ts
    blob_sha: f66f42f7da36611cf4fc2a1c8479b48c2abb1bf9
    lines_read: [1, 612]
  - path: engine/BloomPass.ts
    blob_sha: 8701b1821b070dd7dc30dbc0f13894e3e5edf059
    lines_read: [1, 351]
  - path: engine/AccumulationController.ts
    blob_sha: 91521c4151d7df0db42c34eb93c5c96e456b1b41
    lines_read: [1, 42]
---

## Public API surface

### `engine/RenderPipeline.ts`
- `class RenderPipeline` (engine/RenderPipeline.ts:38)
  - public fields:
    - `frameCount: number = 0` (engine/RenderPipeline.ts:47)
    - `accumulationCount: number = 0` — exposed for UI monitoring (engine/RenderPipeline.ts:48)
    - `lastCompleteDuration: number = 0` (engine/RenderPipeline.ts:51)
    - `isHolding: boolean = false` (engine/RenderPipeline.ts:89)
  - public methods:
    - `setConvergenceNeeded(v: boolean)` (engine/RenderPipeline.ts:87)
    - `updateQuality(q: QualityState)` (engine/RenderPipeline.ts:98)
    - `setAccumulationEnabled(enabled: boolean)` (engine/RenderPipeline.ts:109)
    - `getPreviousColorTexture(): THREE.Texture | null` (engine/RenderPipeline.ts:119)
    - `getPreviousRenderTarget(): THREE.WebGLRenderTarget | null` (engine/RenderPipeline.ts:131)
    - `getCompileTarget(): THREE.WebGLRenderTarget | null` (engine/RenderPipeline.ts:143)
    - `readPixels(renderer, x, y, w, h, buffer): boolean` (engine/RenderPipeline.ts:184)
    - `resize(width, height)` (engine/RenderPipeline.ts:297)
    - `setSampleCap(cap: number)` (engine/RenderPipeline.ts:311)
    - `getSampleCap(): number` (engine/RenderPipeline.ts:318)
    - `resetAccumulation()` (engine/RenderPipeline.ts:322)
    - `clearTargets(renderer)` (engine/RenderPipeline.ts:333)
    - `setHold(hold: boolean)` (engine/RenderPipeline.ts:348)
    - `getCurrentFrameDuration(): number` (engine/RenderPipeline.ts:352)
    - `getOutputTexture(): THREE.Texture | null` (engine/RenderPipeline.ts:362)
    - `measureConvergence(renderer, boundsMin?, boundsMax?): number` — sync, stalls GPU (engine/RenderPipeline.ts:390)
    - `startAsyncConvergence(renderer, boundsMin, boundsMax): void` (engine/RenderPipeline.ts:431)
    - `pollConvergenceResult(renderer): number | null` (engine/RenderPipeline.ts:474)
    - `getLastConvergenceResult(): number` (engine/RenderPipeline.ts:510)
    - `setBucketRendering(active: boolean)` (engine/RenderPipeline.ts:515)
    - `setBucketScissor(rect | null)` (engine/RenderPipeline.ts:519)
    - `render(renderer, uniforms?, scene?, camera?)` (engine/RenderPipeline.ts:524)
- Module-local types: `QualityState` (loose-record shape with `bufferPrecision?`, `precisionMode?`, `compilerHardCap?`) (engine/RenderPipeline.ts:8-12)
- Module-local constant: `CONVERGENCE_FRAG` GLSL (engine/RenderPipeline.ts:15-36)

### `engine/BloomPass.ts`
- `class BloomPass` (engine/BloomPass.ts:145)
  - `constructor()` — builds 4 ShaderMaterials and a shared fullscreen pass (engine/BloomPass.ts:170)
  - `resize(width, height)` (engine/BloomPass.ts:225)
  - `render(inputTexture, renderer, threshold, radius): THREE.Texture | null` (engine/BloomPass.ts:251)
  - `getOutput(): THREE.Texture | null` (engine/BloomPass.ts:325)
  - `dispose()` (engine/BloomPass.ts:339)
- Module-local: `MIP_COUNT = 7` (engine/BloomPass.ts:16); `BLOOM_VERT`, `BRIGHT_PASS_FRAG`, `DOWNSAMPLE_FRAG`, `BLUR_FRAG`, `UPSAMPLE_FRAG` GLSL (engine/BloomPass.ts:19-130); `createRT(w, h)` helper (engine/BloomPass.ts:133)

### `engine/AccumulationController.ts`
- `interface AccumulationController` (engine/AccumulationController.ts:19)
  - `readonly accumulationCount: number` (engine/AccumulationController.ts:21)
  - `readonly convergenceValue: number` — lower = more converged (engine/AccumulationController.ts:24)
  - `isPaused: boolean` — setting pauses/resumes immediately (engine/AccumulationController.ts:29)
  - `setPreviewSampleCap(n: number): void` — historic name; semantics is generic sample cap (engine/AccumulationController.ts:38)
  - `resetAccumulation(): void` (engine/AccumulationController.ts:41)

## Architecture (10-25 bullets)

- `RenderPipeline` owns two ping-pong color render targets (`mrtTargetA` / `mrtTargetB`) used for temporal accumulation and history readback; `writeIndex` tracks which side is next to write (engine/RenderPipeline.ts:41-45).
- Despite "MRT" in field names and the leading comment "texture[0] = Color, texture[1] = Depth" (engine/RenderPipeline.ts:39-40), the targets are single-attachment `WebGLRenderTarget`s — the comment at engine/RenderPipeline.ts:233 says "Single render target (color only) - no MRT needed". Naming is historical and out of date.
- Render targets are created as RGBA `FloatType` by default and switched to `HalfFloatType` when `bufferPrecision > 0.5` (engine/RenderPipeline.ts:229-241).
- `resize()` re-creates targets when width/height OR float type differs from current, disposing the old pair first (engine/RenderPipeline.ts:297-308).
- `updateQuality()` stores the latest `QualityState` and triggers a `resize()` (which re-allocates targets) when `bufferPrecision` changes (engine/RenderPipeline.ts:98-107).
- Temporal accumulation is implemented inside `render()`: blend factor = `1 / accumulationCount`, written to `Uniforms.BlendFactor`; previous frame's color is bound on `Uniforms.HistoryTexture` from the read target (engine/RenderPipeline.ts:545-555). The shader is expected to do the actual blend; the pipeline only manages the swap and uniforms.
- `accumulationCount` is locked to 1 when accumulation is disabled, otherwise increments per `render()` call (engine/RenderPipeline.ts:536-543). `sampleCap > 0` stops rendering once `accumulationCount >= cap` (engine/RenderPipeline.ts:528-530, 587-589).
- Buffer swap happens AFTER the render call (`writeIndex = 1 - writeIndex` at engine/RenderPipeline.ts:583), so the "previous" target is the one currently pointed to by `writeIndex` (the next write slot). Both `getPreviousColorTexture` and `getPreviousRenderTarget` invert this convention with an explicit note (engine/RenderPipeline.ts:114-134).
- `_compileTarget` is a lazily-created 1×1 FBO that mirrors the live MRT's float type/format so Three.js generates an identical program hash during `compileAsync`, without interfering with the live render loop (engine/RenderPipeline.ts:140-156).
- `readPixels()` reads from the previously-written target; for `HalfFloat` targets it reads into a reusable `Uint16Array` (`_halfFloatBuffer`) and converts to Float32 via the bit-twiddling `halfToFloat()` (engine/RenderPipeline.ts:161-225). The reusable buffer avoids per-frame allocation (engine/RenderPipeline.ts:207-209).
- Convergence measurement runs the `CONVERGENCE_FRAG` shader (max-component L-inf delta between targets A and B, remapped to a UV sub-region) into a dedicated `convergenceTarget` capped at `CONVERGENCE_MAX_DIM = 256`px so CPU readback stays cheap (engine/RenderPipeline.ts:258, 370-384).
- `convergenceTarget` is created at 64×64 and `setSize`d to the actual measured region pixel dimensions per measurement; the readback `convergenceBuffer` is reallocated to match (engine/RenderPipeline.ts:373-384).
- Two convergence APIs:
  - `measureConvergence()` — synchronous, calls `readRenderTargetPixels` immediately and stalls the GPU; comment marks it "legacy" (engine/RenderPipeline.ts:386-424).
  - `startAsyncConvergence()` + `pollConvergenceResult()` — render diff, insert WebGL2 `fenceSync`, `gl.flush()` to submit, poll with non-blocking `clientWaitSync(timeout=0)`; only does readback when fence is signaled (engine/RenderPipeline.ts:431-507). Falls back to sync when `fenceSync` is unavailable (engine/RenderPipeline.ts:464-467).
- A "viewport convergence" hook runs at the bottom of `render()`: every `VIEWPORT_CONVERGENCE_INTERVAL = 8` accumulation samples, when accumulating, not bucket-rendering, count > 2, AND `_convergenceNeeded` is true, it polls/starts an async convergence pass over `Uniforms.RegionMin` / `Uniforms.RegionMax` (defaults to full viewport) (engine/RenderPipeline.ts:71, 591-610).
- `_convergenceNeeded` defaults false and is the gate guarding against wasted work when no UI consumer is mounted; the comment names `RegionOverlay` (engine-gmt) as the sole consumer toggled via `SET_CONVERGENCE_NEEDED` worker message (engine/RenderPipeline.ts:79-87).
- Bucket-rendering integration: `setBucketRendering(true)` suppresses the viewport convergence hook so `BucketRenderer` can drive its own measurements (engine/RenderPipeline.ts:514-517, 596).
- Bucket scissor: `setBucketScissor(rect | null)` clips the main render to a target-local pixel rect; rect must be applied AFTER `setRenderTarget()` because three.js's `setRenderTarget` overwrites scissor state with the target's stored values (engine/RenderPipeline.ts:76-78, 562-578).
- `clearTargets()` clears BOTH ping-pong targets, used by BucketRenderer between buckets to prevent bleed (engine/RenderPipeline.ts:329-346).
- `BloomPass` is a 7-mip progressive bloom: bright-pass → 6 downsamples → separable 9-tap gaussian blur per active level → progressive tent-filter upsample with weighted blend; final output is `mipB[0].texture` at half-res (engine/BloomPass.ts:251-323). Header comment says "5 mip levels" but `MIP_COUNT = 7` — header is stale (engine/BloomPass.ts:6, 16).
- BloomPass mip chain is built at progressive half-resolutions starting from `floor(width/2) × floor(height/2)`; each level halves again (engine/BloomPass.ts:236-244). Targets use `HalfFloatType` / `LinearFilter` (engine/BloomPass.ts:133-143).
- BloomPass `activeLevels = clamp(ceil(radius + 0.5), 2, MIP_COUNT)` controls bloom spread (engine/BloomPass.ts:276-278); the deepest active level's contribution fades with fractional `radius + 0.5 - levelDepth` (engine/BloomPass.ts:299-312).
- Bright-pass uses a soft-knee threshold (knee = threshold/2) and a step gate to avoid div-by-zero darkening of pure black (engine/BloomPass.ts:36-50).
- All BloomPass materials use `glslVersion: THREE.GLSL3` and share a single fullscreen pass scene/camera/mesh (constructor — engine/BloomPass.ts:170-223). `dispose()` keeps the shared fullscreen geometry alive: comment "Geometry is shared across all fullscreen passes — don't dispose it" (engine/BloomPass.ts:348).
- `AccumulationController` is an interface, not a class — a generic contract for any sample-accumulating renderer (path tracer, fluid sim, particle system) that engine-core's `renderControlSlice` binds to via `installAccumulationBindings` (engine/AccumulationController.ts:1-18).
- Current implementors per the file's docblock: engine-core `engine/worker/WorkerProxy` (inert stub) and `engine-gmt/engine/worker/WorkerProxy` (real GMT bridge) (engine/AccumulationController.ts:13-14).

## Invariants and gotchas

- **`writeIndex` semantics inverted vs intuition**: the field points to the NEXT target to write, so "previous frame" = target opposite to `writeIndex`. Both `getPrevious*` helpers and `getOutputTexture()` invert. Comments at engine/RenderPipeline.ts:114-134, 362-367 spell this out — any new consumer must read those comments before adding helpers.
- **"MRT" naming is dead weight**: fields named `mrtTargetA/B` are single-attachment color-only targets (engine/RenderPipeline.ts:233). Comment at engine/RenderPipeline.ts:39-40 ("texture[0] = Color, texture[1] = Depth") and engine/RenderPipeline.ts:559 ("SINGLE render to MRT - outputs both color (location 0) and depth (location 1)") describe an old MRT architecture that no longer exists. Documentation drift.
- **BloomPass header says "5 mip levels"** but constant is `MIP_COUNT = 7` (engine/BloomPass.ts:6, 16). Comment in `render()` at engine/BloomPass.ts:277 also references "radius 5.0 → all 5" — stale.
- **`_compileTarget` must mirror MRT float type**: if the live target is `HalfFloat` and the compile target is `Float`, Three.js program param hashes diverge and async compile defeats its purpose (engine/RenderPipeline.ts:145-153). `getCompileTarget()` lazy-creates after `mrtTargetA` exists; do not call before `initTargets`.
- **`_halfFloatBuffer` is sized lazily**: shared across `readPixels` calls; if successive calls pass differently-sized rects, it reallocates (engine/RenderPipeline.ts:207-209). Frequent size changes defeat the reuse optimisation.
- **Convergence target re-sizing**: `ensureConvergenceSize()` reallocates `convergenceBuffer` whenever measured region pixel dims change (engine/RenderPipeline.ts:373-384). Region animations that change size every frame will reallocate every measurement.
- **WebGL2 fence path is the fast path**; sync fallback in `startAsyncConvergence` causes the very stall the async API exists to avoid (engine/RenderPipeline.ts:464-467). Any deployment target without `fenceSync` (some WebKit configs historically) silently falls back.
- **Bucket scissor must be set after `setRenderTarget`**: explicit comment at engine/RenderPipeline.ts:562-564 — three.js `setRenderTarget` overwrites GL scissor with the target's stored values. Any future refactor that hoists `setScissor` above `setRenderTarget` will silently break bucket rendering.
- **`accumEnabled=false` pins `accumulationCount=1`**, so `blend = 1/1 = 1.0` and the history texture is bound but contributes nothing through the shader's mix (engine/RenderPipeline.ts:538-543). Disabling accumulation is essentially a single-sample direct render.
- **`render()` is a no-op when `isHolding=true` or `sampleCap` reached** (engine/RenderPipeline.ts:526-530). `clearTargets`, `resetAccumulation`, `resize` still function — the gate is only on the draw.
- **`accumulationCount` is set to 1 on the very first call** rather than incremented, so the first frame's blend factor is 1.0 (full replace) which matches expected first-sample behaviour (engine/RenderPipeline.ts:541).
- **Convergence depends on TWO valid targets containing successive frames**: `accumulationCount <= 1` short-circuits to return 1.0 since there is no "previous" frame to diff against (engine/RenderPipeline.ts:397, 439).
- **`_convergenceNeeded` is the only thing that prevents wasted work** when no UI consumer reads `convergenceValue`. Forgetting to call `setConvergenceNeeded(true)` from a new consumer = stale "1.0" reading forever; forgetting to clear it = 1 render + 2 setRenderTarget swaps + sync readPixels every 8 samples for nothing (engine/RenderPipeline.ts:79-87, 596).
- **`AccumulationController.setPreviewSampleCap()` name is historic**: docblock explicitly notes the name predates the generic role and was kept to avoid a wide rename (engine/AccumulationController.ts:34-37). Don't infer "preview-only" semantics from the name.
- **`engine-gmt/engine/RenderPipeline.ts` is a 5-line `export *` re-export** (blob `b20d2190…`) of the engine-core file. The HANDOFF.md note at line 260 records that the previous 19-line divergence (engine-gmt importing `QualityState` from features/quality vs engine-core's inline loose record) was collapsed: engine-core dropped its index-signature mismatch in the local `QualityState` shape so GMT's narrower `QualityState` (from `engine-gmt/features/quality`) is structurally assignable. No content divergence today.

## Drift from existing doc

(no existing doc — skip)

## Open questions

- `Uniforms.BlendFactor`, `Uniforms.HistoryTexture`, `Uniforms.RegionMin`, `Uniforms.RegionMax` are referenced (engine/RenderPipeline.ts:553-554, 604-605) but the `Uniforms` map is defined in `engine/UniformNames.ts` — out of scope here. Worth confirming whether the shader-side blending contract (a `mix(history, current, blend)` consumer) is documented for shader authors.
- The shared vertex shader `VERTEX_SHADER` from `shaders/chunks/vertex` (engine/RenderPipeline.ts:3) — out of scope.
- `BucketRenderer` / `GmtBucketHost` integration: the file references both as consumers of `setBucketRendering`, `setBucketScissor`, `clearTargets`, and the bucket convergence path. Audit of those is out of scope here.
- `BloomPass` is consumed by `engine-gmt/engine/worker/WorkerExporter.ts:102`, `engine-gmt/engine/worker/renderWorker.ts:196`, `engine-gmt/engine/worker/handleRenderTick.ts`, and `engine-gmt/engine/GmtBucketHost.ts`. The composition / final-blend pass that combines bloom output with the main color is in the renderWorker pipeline, not here.
- `installAccumulationBindings` (referenced in the `AccumulationController` docblock at engine/AccumulationController.ts:18) lives at `store/slices/installAccumulationBindings.ts` and `engine-gmt/renderer/bindings.ts` — the actual binding mechanics are out of scope; only the contract is defined here.
- `Math.clz32` is used in `halfToFloat` subnormal handling (engine/RenderPipeline.ts:169) — sound on every browser engine GMT targets, but worth flagging if there's ever a SSR/Node path that touches `readPixels`.
