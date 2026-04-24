
# Data I/O & Export
> Last updated: 2026-04-20 | GMT v0.9.1

## 1. Video + Image-Sequence Export (`engine/worker/WorkerExporter.ts`)

GMT exports animated renders in two flavours: **video containers** (MP4 H.264/HEVC/AV1, WebM VP9) and **image sequences** (PNG RGBA, JPG per-pass). Both run inside the render worker and share the same per-frame pump — the divergence is the output sink (video encoder vs. directory handle) and the pass-loop layout.

### The Pipeline (per frame)
1.  **Scrub & state:** main thread seeks the timeline, applies modulations, and serializes camera/offset/render-state.
2.  **Render pass(es):** for each pass (`beauty` / `alpha` / `depth`), the worker clears the accumulation ping-pong, runs N Halton-jittered samples (default 16), post-processes with bloom + tone-map into an 8-bit export target, reads back 8-bit RGBA pixels, and (on beauty) records a center-pixel depth for focus-lock.
3.  **Encode or write:**
    - Video mode — feed the pixel buffer to `VideoEncoder` (WebCodecs) and pipe encoded chunks into mediabunny's `EncodedVideoPacketSource` → container file.
    - Image-sequence mode — combine per-pass pixel buffers per format rule (PNG: merge beauty.rgb + alpha.a into RGBA; JPG: one file per pass; depth is always separate), encode with `OffscreenCanvas.convertToBlob`, stream into a `FileSystemFileHandle` under the chosen directory.

### Multi-pass export
The render dialog has three pass checkboxes: **Beauty**, **Alpha**, **Depth**. The shader has a `uOutputPass` uniform that lives in the shared main-uniform block and branches both the main shader's alpha write and the post-process output:

| Pass | Main-shader alpha channel | Post-process output |
|---|---|---|
| **Beauty** (0) | projected camera distance (for focus-lock) | tone-mapped sRGB color |
| **Alpha** (1) | per-sample `step(depth, MISS_DIST − 100)` — binary coverage | accumulated coverage as luminance (the N-sample average of 0/1 *is* anti-aliased sub-pixel coverage — AA for free) |
| **Depth** (2) | projected camera distance | `(distance − uDepthMin) / (uDepthMax − uDepthMin)` as luminance |

Since `uOutputPass` is shared across the main shader, `displayMaterial` (viewport preview), and `exportMaterial`, setting it once atomically retargets all three — that's how the preview follows the active pass during a video export.

**Video mode** runs `startExport` once per selected pass (outer pass loop); each pass produces its own file named `{project}_{pass}_v{n}_{WxH}.{ext}`.

**Image-sequence mode** runs a single `startExport` session with `config.passes[]` populated; the worker loops passes *inside* the per-frame render so it can combine them into multi-channel outputs. For PNG RGBA the beauty RGB and alpha coverage end up in one file; depth stays separate (8-bit greyscale PNG per frame). For JPG every pass is a separate file (JPG can't carry alpha).

### Depth-pass normalization range
The post-process depth branch normalizes by `uDepthMin` / `uDepthMax` — two numeric inputs exposed in the render dialog when Depth is checked. Default `0..5` world units matches the atmosphere feature's default fog range. A **Use fog range** shortcut copies the current `fogNear` / `fogFar` into the depth range when fog is enabled in the scene.

### Storage Strategies
Video export uses mediabunny (≥ 1.40.1) for container muxing; the encoder itself is WebCodecs:

*   **Disk Mode** (Chrome / Edge): File System Access API. `showSaveFilePicker` returns a `FileSystemWritableFileStream` that we wrap in a proxy `WritableStream` (FSWFS isn't transferable across `postMessage`) and stream mediabunny's output through. Unlimited file size.
*   **RAM Mode** (Firefox / Safari for video): buffer the entire container into a `Mediabunny.BufferTarget`; transferred back to the main thread and handed to the user as a download `Blob`. Limited by browser memory (~2–4 GB before tab crash).
*   **Image sequences are Chrome-only.** They require `showDirectoryPicker` to pick an output folder; Firefox/Safari don't implement it. The render dialog disables the start button and shows an inline notice in those browsers.

### Firefox-specific quirks
These are discussed in detail in [06_Troubleshooting_and_Quirks.md](06_Troubleshooting_and_Quirks.md); a summary:
- `VideoEncoder.encode()` returns chunks with a one-frame leading-latency offset and the wrong `duration` default. We hardcode duration to `1/fps` and PTS to `chunk.timestamp - firstChunkOffsetMicros` to bypass both.
- H.264 encoding goes through Cisco's OpenH264 binary, which is capped at Level 4.0 (~31 Mbps). The render dialog surfaces an inline warning when the user's bitrate slider + multiplier would exceed this.
- `latencyMode: 'quality'` + `bitrateMode: 'constant'` give the most consistent output; variable bitrate under-runs on smooth fractal content.

### File naming
| Mode | Pattern |
|---|---|
| Video single-pass | `{project}_v{n}_{WxH}.{ext}` |
| Video multi-pass | `{project}_{pass}_v{n}_{WxH}.{ext}` |
| PNG sequence (beauty + alpha merged) | `{project}_v{n}_{WxH}_{00000}.png` |
| PNG sequence (alpha-only or depth) | `{project}_{alpha|depth}_v{n}_{WxH}_{00000}.png` |
| JPG sequence (always per-pass) | `{project}_v{n}_{WxH}_{pass}_{00000}.jpg` |

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
