
# Troubleshooting & Quirks

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
 
This ensures:
1. No screen shaking during camera movement
2. Stable blur preview while navigating
3. High-quality noise distribution for realistic DOF effects
3. Smooth blur convergence during accumulation

## 6. Mobile-Specific Issues

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

## 7. Performance Issues

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

### Bucket Render Artifacts (Bleeding Between Tiles)
*   **Cause:** WebGL state not properly cleared between bucket tiles.
*   **Fix:** Call `clearTargets()` before each bucket render pass.
*   **Location:** `engine/BucketRenderer.ts`

## 8. HalfFloat16 Buffer Handling

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
