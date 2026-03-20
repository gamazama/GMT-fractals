
# Data I/O & Export

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
