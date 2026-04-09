
# Data I/O & Export
> Last updated: 2026-04-09 | GMT v0.9.1

## 1. Video Export (`WorkerExporter.ts`)

GMT features a client-side render farm.

### The Pipeline
1.  **Pause:** Game loop stops.
2.  **Seek:** Timeline moves to Frame X.
3.  **Accumulate:** The engine renders N samples (e.g., 64) into a floating-point buffer to eliminate noise.
4.  **Encode:** The frame is passed to `VideoEncoder` (WebCodecs).
5.  **Mux:** Frames are stitched into a `.webm` container.

### Storage Strategies
Video export uses the `mediabunny` library for encoding. Storage modes depend on browser capabilities:
*   **Disk Mode (Chrome/Edge):** Uses the File System Access API (OPFS). Streams chunks directly to disk. Supports unlimited file sizes.
*   **RAM Mode (Firefox/Safari):** Buffers the entire video in RAM. Limited by browser memory (crash risk on 4K renders).

## 2. File Formats

### 2.1 GMF — Primary Save Format (`.gmf`)

GMF (GPU Mandelbulb Format) is the **primary save format** for all scenes. It is a human-readable, AI-editable text format that embeds both the formula definition (GLSL shader code + parameter metadata) and the full scene state.

**Why GMF over JSON?**
- Self-contained: the shader code travels with the preset, so imported/custom formulas survive save/load roundtrips
- Human-readable: GLSL blocks are plain text, not escaped JSON strings
- AI-friendly: includes an API reference header so LLMs can understand and edit formulas directly
- Portable: a single file fully describes the scene — no external dependencies

**Structure:**
```
<!-- GMF Header + API Reference -->
<Metadata>   { id, name, parameters, defaultPreset, importSource? }  </Metadata>
<Shader_Init>     GLSL: pre-loop setup (optional)       </Shader_Init>
<Shader_Function> GLSL: main distance estimator          </Shader_Function>
<Shader_Loop>     GLSL: iteration loop body              </Shader_Loop>
<Shader_Dist>     GLSL: custom distance smoothing (opt)  </Shader_Dist>
<Scene>           { full Preset JSON: camera, features, lights, animations }  </Scene>
```

- `<Metadata>` contains the formula definition (id, name, parameter ranges/defaults, optional `importSource` for Workshop-imported formulas)
- Shader blocks contain raw GLSL — no escaping needed
- `<Scene>` contains the full scene preset (camera position/rotation, all DDFS feature state, lighting, quality, animations). Only present in scene GMF files; formula-only GMFs omit this block.

**Save flow** (`utils/FormulaFormat.ts → saveGMFScene()`):
1. `getPreset()` builds the full scene state
2. `registry.get(formula)` retrieves the formula definition (shader code + metadata)
3. `generateGMF()` writes the formula blocks, then appends a `<Scene>` block with the full preset

**Load flow** (`utils/FormulaFormat.ts → loadGMFScene()`):
1. Detect format: GMF (starts with `<!--` or `<Metadata>`) vs legacy JSON
2. Parse formula definition from `<Metadata>` + shader blocks
3. Extract `<Scene>` block if present (scene GMF), otherwise fall back to `defaultPreset` (formula-only GMF)
4. Conditionally register the formula if not already in the registry (imported formulas)
5. Emit `REGISTER_FORMULA` to notify the worker thread
6. Call `loadPreset(preset)` to apply the full scene state

**Formula registration on load:**
- If the formula is already registered (built-in or previously imported), the existing definition is used — the GMF's embedded shader is ignored
- If the formula is unknown (imported formula in a fresh session), it is registered from the GMF data
- This means loading a GMF for a built-in formula always uses the app's current version of that formula

**Where GMF is used:**
| Context | Save | Load |
|---------|------|------|
| System Menu (Save/Load Scene) | `.gmf` file | `.gmf`, `.json`, `.png` |
| PNG Snapshot (Camera Menu) | GMF embedded in PNG metadata | Extract + parse |
| Bucket Render Export | GMF embedded in PNG metadata | Extract + parse |
| Loading Screen file picker | — | `.gmf`, `.json`, `.png` |
| Formula Gallery / Import | — | `.gmf` (formula-only or scene) |
| URL Sharing | N/A (uses compressed Preset) | N/A |

### 2.2 Legacy JSON Presets (`.json`) — Load Only

JSON presets are the previous save format. They store the scene state as a flat JSON object with a `features` dictionary. GMT still loads `.json` files for backward compatibility but no longer saves in this format.

```json
{
  "formula": "Mandelbulb",
  "features": {
    "lighting": { ... },
    "coloring": { ... }
  },
  "cameraRot": { "x": 0, "y": 0, "z": 0, "w": 1 },
  "sceneOffset": { "x": 0, "y": 0, "z": 0 }
}
```

**Limitation:** JSON presets do not contain shader code. If the preset references an imported/custom formula that isn't registered, the formula will be unknown and fall back to defaults.

*   **Versioning:** The loader is resilient to missing parameters (falls back to defaults defined in `FeatureRegistry`).
*   **Legacy `_formulaDef`:** Very old presets may embed a `_formulaDef` object. `loadPreset()` checks for this and registers the formula if needed.

### 2.3 PNG Metadata (Steganography)

Snapshots and bucket renders embed the full scene data as a GMF string in the PNG `iTXt` chunk (key: `"FractalData"`).
- On save: `saveGMFScene(preset)` → `injectMetadata(blob, "FractalData", gmfString)`
- On load: `extractMetadata(file, "FractalData")` → `loadGMFScene(content)` (handles both GMF and legacy JSON metadata)
- Social media platforms strip iTXt chunks — share files directly to preserve metadata.

### 2.4 URL Sharing

Scene state is diff-compressed into the URL hash via `UrlStateEncoder`. This uses the Preset object directly (not GMF).
- **Imported formulas cannot be shared via URL** — the shader code is too large for URL length limits. The share button shows "N/A (Imported)" for Workshop-imported formulas.
- If the scene is too complex (e.g., many keyframes), animation data is automatically stripped to fit the URL limit.

### 2.5 VDB Export (Mesh Export Tool)

The mesh export tool (`public/mesh-export/`) can export fractal geometry as OpenVDB `.vdb` files for use in Houdini, Blender, and other 3D tools.

**Density grid:** SDF values sampled on a GPU voxel grid, stored as `Tree_float_5_4_3` (standard OpenVDB float tree). Resolution options from 64 to 512 voxels per axis.

**Color grid (optional):** When "Include color grids" is enabled, GPU orbit-trap colors are sampled for all active density voxels and stored as a `Cd` grid (`Tree_vec3s_5_4_3`). This adds a second sampling pass but produces colored volumes natively in VDB-compatible tools.

**File naming:** `{formula}-{resolution}-{content}-{timestamp}.vdb` where content is `density` or `density-color`.

See [30_Mesh_Export_Prototype.md](30_Mesh_Export_Prototype.md) for the full pipeline architecture.

## 3. Bucket Rendering

For resolutions higher than the GPU limit (e.g., 8K), the bucket renderer tiles the viewport into small buckets and renders each to convergence.

### Key Features
- **Scissor-based compositing**: Integer pixel bounds for pixel-perfect tile boundaries (no float UV artifacts)
- **Half-pixel region expansion**: Render region padded by 0.5px so boundary pixels are always rendered
- **Adaptive convergence**: Each tile renders until converged or max samples reached (async GPU fence readback)
- **Center-first spiral order**: Renders from center outward for faster visual feedback
- **Offline post-processing**: Bloom, chromatic aberration, color grading, and tone mapping applied once after all tiles complete (not per-bucket)
- **SSAA pixelSizeBase override**: During supersampled renders, trace precision is kept at viewport resolution to prevent artifacts
- **Three-layer state lock**: Worker message filter + UI lock (`isExporting`) + resize guard prevent mid-render corruption
- **Export scales**: 1x (viewport), 2x (4K from 1080p), 4x (8K), 8x (10K+)

### Convergence Threshold
- `0.1%` = Production quality (more samples)
- `0.25%` = Default — good balance
- `0.5%` = Balanced quality
- `1.0%` = Fast preview

See [02_Rendering_Internals.md](02_Rendering_Internals.md) §5 for full bucket renderer architecture.
