
# Troubleshooting & Quirks
> Last updated: 2026-03-27 | GMT v0.9.1

## 1. WebGL & GPU Issues

### Black Screen / "Context Lost"
If the screen turns black or the browser crashes:
*   **Cause:** The shader execution took too long (TDR - Timeout Detection Recovery). The OS kills the GPU driver to prevent a system freeze.
*   **Fix:** 
    1.  Lower **Max Steps** in the Quality tab (e.g., to 100).
    2.  Lower **Ray Detail** (increase Epsilon).
    3.  If using **Mandelbox** or **Hybrids**, reduce **Fold Iterations**.

### "Shader Compilation Failed"
*   **Cause:** The shader complexity exceeded the GPU's instruction limit or register count.
*   **Fix:** 
    1.  Disable **Advanced Lighting** (Shadows, AO).
    2.  Disable **Reflections**.
    3.  Switch to **Lite Mode** in the Engine tab.

## 2. Video Export

### Browser Crashes during Export
*   **Cause:** **RAM Mode** accumulates all video frames in memory before saving. 4K/60FPS video can easily exceed 4GB.
*   **Fix:** 
    *   Use **Google Chrome** or **Edge**. They support **Disk Mode** (FileSystem API), which streams data directly to the hard drive, allowing unlimited file sizes.
    *   If using Firefox/Safari, render shorter segments.

### "Format Incompatible"
*   **Cause:** The browser does not support the selected codec (e.g., AV1 or HEVC) in hardware.
*   **Fix:** Switch to **MP4 (H.264)** or **WebM (VP9)**. These have the widest support.

### Viewport Freezes After Export Completes
*   **Cause:** After export, the WebGL render target was left pointing to the disposed `exportTarget` from the last `captureAndEncode()` call. This caused subsequent renders to target the disposed buffer instead of the screen.
*   **Fix:** Added explicit render target reset to `null` (screen) in `restoreState()` method before resetting viewport and scissor.
*   **Location:** `engine/worker/WorkerExporter.ts` — `restoreState()` method

### "Error finalizing video file" in Chrome Disk Mode
*   **Cause:** When using `StreamTarget` with `chunked: true`, Mediabunny's `output.finalize()` internally closes the underlying `FileSystemWritableFileStream`. The code was then attempting to close the stream again, which threw an error because the stream was already closed.
*   **Fix:** Removed the redundant stream close call — the stream is already closed by `finalize()`.
*   **Location:** `engine/worker/WorkerExporter.ts` — `finish()` method
*   **Note:** The video file was always written successfully; the error was only cosmetic.

## 3. Audio Reactivity

### "Microphone Access Denied"
*   **Cause:** Browser security policy.
*   **Fix:** 
    1.  Ensure the site is accessed via `https://` or `localhost`. Browsers block Mic access on insecure origins.
    2.  Check OS permission settings for the browser.

## 4. Precision Artifacts

### Z-Fighting / Ripples
*   **Cause:** **Ray Detail** is too high (Epsilon too small) for the current depth.
*   **Fix:** Increase **Pixel Threshold** or lower **Detail** in the Quality tab.

### "Banding" in Gradients
*   **Cause:** Low bit-depth in the render buffer.
*   **Fix:** In **Engine Settings**, set **Buffer Precision** to **Float32** (requires high-end GPU) or enable **Color Grading** (Dithering is applied during tone mapping).

## 5. Camera Blur (DOF) Issues

### Inaccurate Picking with Camera Blur Enabled
*   **Cause:** The depth buffer stores values from rays that have been offset by the lens blur, resulting in noisy depth measurements.
*   **Fix:** The picker now reads depth values from a 3x3 neighborhood of pixels and averages them to reduce noise, ensuring accurate world position calculation even when blur is enabled.

### Screen Shaking with Camera Blur
*   **Cause:** DOF was using animated blue noise (changing each frame via `uFrameCount`) during navigation, causing the lens offset to change every frame.
*   **Fix:** DOF now uses two noise modes:
    - **During navigation**: Stable per-pixel blue noise (no frame animation) for a static blur preview
    - **During accumulation**: Animated blue noise for Monte Carlo convergence, creating smooth blur over time

### How DOF Noise Works
The DOF system uses two blue noise functions defined in [`shaders/chunks/blue_noise.ts`](shaders/chunks/blue_noise.ts):
- `getStableBlueNoise4()`: Returns the same noise value for each pixel across frames (used during navigation)
- `getBlueNoise4()`: Animates noise using `uFrameCount` for temporal variation (used during accumulation)

The blue noise texture is loaded from a PNG file (`public/blueNoise.png`) for high-quality noise distribution. If loading fails, a procedural noise fallback is used.

**Blue Noise Resolution Fix**:
- **Problem**: The blue noise resolution uniform (`uBlueNoiseResolution`) wasn't being properly updated when the texture loaded asynchronously, causing incorrect sampling and screen shaking on GitHub Pages.
- **Solution**: Added a texture load callback that immediately updates the uniform with the actual texture dimensions once loaded. The expected resolution (512x512) is also hardcoded in the uniform schema for initial configuration.
  
This ensures:
1. No screen shaking during camera movement
2. Stable blur preview while navigating
3. High-quality noise distribution for realistic DOF effects
4. Smooth blur convergence during accumulation
5. Consistent behavior across all environments (localhost and GitHub Pages)

## 6. Black Patches in Path Traced Reflections

### Black areas in concave fractal regions (PT mode and Direct reflections)
*   **Cause:** The bounce ray bias (surface offset to prevent self-intersection) was computed using the bounce ray's travel distance `d`. In concave geometry, bounce rays hit nearby surfaces (small `d`), collapsing the bias. The next bounce origin would be effectively *on* the surface, causing self-intersection or the ray crawling along the surface, exhausting step budget, and returning a miss (black).
*   **Root cause code:** `biasEps` in `pathtracer.ts` used `pixelSizeScale * d` where `d` was bounce travel distance.
*   **Fix:** Replaced with `pixelSizeScale * length(p_ray)` — camera-to-point distance in camera-local space. This matches the actual pixel footprint at that depth regardless of how far the bounce traveled. Same fix applied to direct reflections in `features/reflections/index.ts`.
*   **Locations:**
    - `shaders/chunks/pathtracer.ts` — `biasEps` calculation
    - `features/reflections/index.ts` — `reflBias` calculation + `getSurfaceMaterial` distance parameter
    - `features/reflections/shader.ts` — removed redundant hardcoded `t = 0.01` start offset
*   **Reference:** Mandelbulber uses `cameraDistance * pixelAngularSize / detailLevel` for the same purpose (recomputed per recursion level). Fragmentarium uses a fixed `minDist * 3-8x` multiplier.

## 7. Mobile-Specific Issues

### Black Screen on iOS/Mobile
*   **Cause:** Creating a separate WebGL context to check HalfFloat16 support fails on iOS Safari.
*   **Fix:** The engine now uses HalfFloat16 directly on mobile without the context check. Modern iOS devices support HalfFloat16 well.
*   **Location:** `engine/FractalEngine.ts` - initial config setup

### Light Gizmo Offset on Mobile
*   **Cause:** Using `renderer.domElement.width / window.devicePixelRatio` doesn't always match the actual CSS size on high-DPI mobile displays.
*   **Fix:** Use `getBoundingClientRect()` for accurate CSS dimensions when projecting 3D positions to screen coordinates.
*   **Location:** `features/lighting/components/SingleLightGizmo.tsx`
*   **Pattern:**
    ```typescript
    // Wrong: Can mismatch on mobile
    const width = renderer.domElement.width / window.devicePixelRatio;
    
    // Correct: Always matches CSS size
    const rect = renderer.domElement.getBoundingClientRect();
    const width = rect.width;
    ```

### Mobile Panel Layout
*   **Issue:** Engine and Camera Manager panels were appearing on the left side, causing layout issues on narrow mobile screens.
*   **Fix:** These panels now automatically redirect to the right dock on mobile devices.
*   **Detection:** Uses `window.matchMedia("(pointer: coarse)")` and `window.innerWidth < 768`

## 8. Canvas Resolution Wrong on Initial Load

### Low Resolution Until Manual Resize
*   **Cause:** Two issues combined:
    1.  `setupEngine()` in `renderWorker.ts` set `uResolution` and `pipeline.resize()` with CSS pixels instead of physical pixels (CSS × DPR). The bloom pass was already using the correct physical pixel values, but the pipeline/uniforms were not.
    2.  `WorkerTickScene`'s post-compile resize re-push captured `size` and `dpr` in a `useEffect([], [])` closure at mount time. During the long async shader compilation, the viewport could change (layout shifts, dock panels loading). When compilation finished, the stale mount-time dimensions overwrote the correct values.
*   **Fix:**
    1.  Use the already-computed `initPhysW`/`initPhysH` (CSS × DPR) for `uResolution` and `pipeline.resize()` in `setupEngine()`.
    2.  Track the latest viewport size in a `useRef` and read from it in the post-compile callback instead of using stale closure values.
*   **Locations:** `engine/worker/renderWorker.ts` (setupEngine), `components/WorkerTickScene.tsx` (checkReady)
*   **Pattern:**
    ```typescript
    // Wrong: useEffect closure captures stale values
    useEffect(() => {
        // ...long async wait...
        proxy.resizeWorker(size.width, size.height, dpr); // stale!
    }, []);

    // Correct: Track latest size in a ref
    const sizeRef = useRef({ width: size.width, height: size.height, dpr });
    sizeRef.current = { width: size.width, height: size.height, dpr };
    useEffect(() => {
        // ...long async wait...
        const s = sizeRef.current; // always current
        proxy.resizeWorker(s.width, s.height, s.dpr);
    }, []);
    ```

## 9. Performance Issues

### FPS Drops During Interaction
*   **Cause:** Creating new typed arrays every frame causes garbage collection pressure.
*   **Fix:** Reuse buffers by storing them in refs or module-level variables.
*   **Locations:**
    - `engine/RenderPipeline.ts` - Reuse HalfFloat buffer for depth readback
    - `hooks/usePhysicsProbe.ts` - Reuse Float32Array for pixel reads
*   **Pattern:**
    ```typescript
    // Wrong: Creates new array every frame
    const pixels = new Float32Array(4);
    renderer.readPixels(..., pixels);
    
    // Correct: Reuse buffer
    const pixelBuffer = useRef(new Float32Array(4));
    renderer.readPixels(..., pixelBuffer.current);
    ```

### Bucket Render Artifacts (Black Stripes Between Tiles)
*   **Cause:** UV-space float comparisons in the composite shader had precision mismatches with the render shader's `vUv` computation, causing boundary pixels to be discarded by both adjacent tiles.
*   **Fix:** Compositing now uses GL scissor rect with integer pixel bounds instead of shader-based UV discard. The render region is expanded by half a pixel so boundary pixels are always rendered; the scissor clips precisely.
*   **Location:** `engine/BucketRenderer.ts` — `compositeCurrentBucket()`, `applyCurrentBucket()`

### Bucket Render Size Estimation Wrong in Fixed Mode
*   **Cause:** `canvasPixelSize` store value (set by WorkerDisplay ResizeObserver) may lag behind resolution mode changes.
*   **Fix:** UI components (BucketRenderControls, RenderPopup, PerformanceMonitor) use `fixedResolution * dpr` directly when `resolutionMode === 'Fixed'`, falling back to `canvasPixelSize` for Full mode.

### Bucket Render Corruption from UI Interaction
*   **Cause:** Resize, uniform, config, or offset messages reaching the worker mid-render corrupt the pipeline state.
*   **Fix:** Three-layer lock: (1) worker message filter drops all messages except `BUCKET_STOP`/`RENDER_TICK`, (2) main thread sets `isExporting=true` to lock UI via `selectMovementLock`, (3) WorkerDisplay ResizeObserver skips during `isBucketRendering`.

### Firefox ~50% Lower FPS Than Chrome (Platform Limitation)
*   **Cause:** Firefox's OffscreenCanvas presentation path adds ~16ms of invisible GPU overhead per frame, halving the effective frame rate. This is a **Firefox platform limitation**, not a bug in our code.
*   **Root cause — presentation architecture:**
    - **Chrome:** WebGL renders into a texture shared with the compositor via GPU-native D3D11 shared handles — effectively **zero-copy**. The rendered texture goes directly from worker GPU context to compositor.
    - **Firefox:** WebGL runs in a separate compositor process. Frame presentation goes through `SharedSurface` + `RemoteTextureMap` IPC, which involves an implicit GPU synchronization (fence/finish equivalent) per frame. This adds ~16ms of GPU sync overhead that is invisible in CPU-side timing but delays the compositor.
    - The overhead specifically occurs when rendering to the OffscreenCanvas default framebuffer (`setRenderTarget(null)` + `render()`). Rendering to FBOs (the fractal compute) runs at full speed on both browsers.
*   **Confirmed by testing:** Skipping the canvas blit restores 60fps on Firefox with the worker still computing at full speed. No code-level workaround was found — the overhead is in Firefox's `SharedSurface` swap/present mechanism.
*   **Mitigation:** Adaptive Resolution (enabled by default) auto-adjusts the internal render resolution to maintain a target FPS. This significantly improves interactivity on Firefox by reducing the pixel count that passes through the slow presentation path. The top bar icon shows the current state (cyan = auto, amber = always-on).
*   **Status:** No code-level fix for the presentation overhead. Firefox Bugzilla references:
    - [Bug 1657125](https://bugzilla.mozilla.org/show_bug.cgi?id=1657125) — "insufficient concurrency between client and host" in out-of-process WebGL
    - [Bug 1788206](https://bugzilla.mozilla.org/show_bug.cgi?id=1788206) — `transferToImageBitmap` also broken (CPU readback, 25-30ms)
    - [Bug 1791693](https://bugzilla.mozilla.org/show_bug.cgi?id=1791693) — RemoteTexture sync present (22-68% improvement on some platforms, but not sufficient)
*   **Note:** Firefox also lacks `KHR_parallel_shader_compile`, so `compileAsync` degrades to synchronous. This affects compile latency but not per-frame FPS.

## 10. HalfFloat16 Buffer Handling

### Reading Depth from HalfFloat16 Buffers
*   **Issue:** Cannot read HalfFloat16 values directly as floats - must convert.
*   **Fix:** Use `Uint16Array` for readback, then convert to float using half-to-float conversion.
*   **Location:** `engine/RenderPipeline.ts`
*   **Pattern:**
    ```typescript
    // HalfFloat16 buffer readback
    const rawPixels = new Uint16Array(4);  // 16-bit values
    gl.readPixels(..., rawPixels);
    
    // Convert to float
    const depth = halfToFloat(rawPixels[0]);  // Use conversion function
    ```

## 11. Environment Light Sky Image Not Loading

### Issue
The environment light sky image loads correctly for some formulas (e.g., Mandelbulb) but not for others (e.g., MixPinski, PseudoKleinian, etc.).

### Root Cause
The shader checks `uUseEnvMap > 0.5` before sampling the environment map texture ([`shaders/chunks/lighting/env.ts`](shaders/chunks/lighting/env.ts:21)). However:
1. `useEnvMap` defaults to `false` in the feature definition ([`features/materials.ts`](features/materials.ts:188))
2. Some formula presets don't include `useEnvMap: true` in their materials configuration
3. The system wasn't automatically setting `useEnvMap` to `true` when a user uploads a sky image

### Trace Path (UI to Pixel)
1. **UI**: User uploads image via [`AutoFeaturePanel.tsx`](components/AutoFeaturePanel.tsx:355) → `handleFileChange()` → `handleUpdate()`
2. **State**: [`createFeatureSlice.ts`](store/createFeatureSlice.ts:95) detects image type, loads texture with `THREE.TextureLoader`
3. **Uniform**: Texture is emitted via `FractalEvents.emit('uniform', { key: 'uEnvMapTexture', value: tex })`
4. **Shader**: [`env.ts`](shaders/chunks/lighting/env.ts:21) checks `if (uUseEnvMap > 0.5)` before using `uEnvMapTexture`

### Fix
Modified [`store/createFeatureSlice.ts`](store/createFeatureSlice.ts:108-117) to automatically set `useEnvMap = true` when `envMapData` is loaded:

```typescript
// Auto-enable environment map when image is loaded
if (paramKey === 'envMapData' && next['useEnvMap'] === false) {
    next['useEnvMap'] = true;
    FractalEvents.emit('uniform', { key: 'uUseEnvMap', value: 1.0, noReset: false });
}
```

Also auto-disables when image is cleared (lines 121-125) and applies the same pattern to texturing (lines 114-117, 127-130).

## 12. Region Rendering & Convergence

### Sample Cap Not Applied on Startup
*   **Cause:** `RenderPipeline.sampleCap` defaults to 0 (infinite). The initial `SET_SAMPLE_CAP` message sent during store init arrives before the worker engine exists, so `engine?.setPreviewSampleCap()` is a no-op.
*   **Fix:** The `onBooted` callback in `fractalStore.ts` now re-sends the sample cap after the worker engine is ready.
*   **Location:** `store/fractalStore.ts` — `engine.onBooted` callback

### Convergence Not Improving (Stuck at 100%)
*   **Cause:** Convergence is only measured after 2+ accumulated samples and every 8 frames. If accumulation is disabled, paused, or the camera is moving, no measurement occurs.
*   **Fix:** Stop the camera and ensure accumulation is enabled. Wait for at least 16 frames.

### Convergence Measurement Inaccurate
*   **Cause (historical):** The convergence render target was hardcoded at 64×64, sampling only ~0.2% of a 1080p viewport. Hot spots of unconverged pixels could be missed.
*   **Fix:** The convergence target now dynamically resizes to match the measured region's pixel dimensions (capped at 256×256). For a 128px bucket, coverage is 100%. For a full 1080p viewport, coverage is ~6% — much better than 0.2%.
*   **Location:** `engine/RenderPipeline.ts` — `ensureConvergenceSize()`

### Region Resize Handles Not Working
*   **Cause (historical):** `useRegionSelection.ts` checked for `target.dataset.handle` on mousedown, but no DOM elements with `data-handle` attributes existed in the region overlay.
*   **Fix:** Added 8 handle elements (n/s/e/w/ne/nw/se/sw) with `data-handle` attributes to the `RegionOverlay` component. Visible on hover via `group-hover/box:opacity-100`.

### Related Parameters
- `envSource`: Controls gradient (1) vs image (0) - defaults to 1 (gradient)
- `useEnvMap`: Boolean flag that enables texture sampling - defaults to false
- `envMapData`: The actual image data (base64 string)

### Formula Preset Pattern
Formulas that work correctly include in their preset:
```typescript
materials: {
    useEnvMap: true,  // Required for sky images to work
    envSource: 1,     // 0=Image, 1=Gradient
    // ... other material props
}
```
