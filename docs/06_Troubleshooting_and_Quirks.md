
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
