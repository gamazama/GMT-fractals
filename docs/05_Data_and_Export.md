
# Data I/O & Export

## 1. Video Export (`VideoExporter.ts`)

GMT features a client-side render farm.

### The Pipeline
1.  **Pause:** Game loop stops.
2.  **Seek:** Timeline moves to Frame X.
3.  **Accumulate:** The engine renders N samples (e.g., 64) into a floating-point buffer to eliminate noise.
4.  **Encode:** The frame is passed to `VideoEncoder` (WebCodecs).
5.  **Mux:** Frames are stitched into a `.webm` container.

### Storage Strategies (`RecorderStrategy.ts`)
*   **Disk Mode (Chrome/Edge):** Uses the File System Access API (OPFS). Streams chunks directly to disk. Supports unlimited file sizes.
*   **RAM Mode (Firefox/Safari):** Buffers the entire video in RAM. Limited by browser memory (crash risk on 4K renders).

## 2. File Formats

### 2.1 Presets (`.json`)
Stores the entire state of the application.
*   **Structure:** Uses a "Feature Dictionary".
    ```json
    {
      "features": {
        "lighting": { ... },
        "coloring": { ... }
      }
    }
    ```
*   **Versioning:** The loader logic is resilient to missing parameters (falls back to defaults defined in `FeatureRegistry`).

### 2.2 GMF (GPU Mandelbulb Format)
A portable text format for sharing formulas.
*   **Hybrid:** Contains XML-style tags for Metadata (JSON) and Shader Code (GLSL).
*   **Benefit:** Allows copy-pasting a formula as a single string, including its default parameters and shader logic, without zip files.
