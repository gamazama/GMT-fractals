# Pro Workflow Feature Requests

Collected from high-end user feedback (April 2026). Assessed against current GMT architecture.

---

## 1. Bucket Render — Multi-Pass Image Output

**Request:** Separate render passes — Alpha, Reflection, Z-depth, Glow, Color.

**Current state:**
- Depth buffer: async PBO readback exists (`engine/worker/WorkerDepthReadback.ts`), stored in accumulation RT alpha channel
- Bloom/glow: full 5-level mip chain (`engine/BloomPass.ts`, 350 lines)
- Bucket renderer accumulates raw linear HDR pre-tone-mapping (`engine/BucketRenderer.ts`)
- Reflections composited inline in main shader (`features/reflections/`)

**Implementation path:**
| Pass | Effort | Approach |
|------|--------|----------|
| Color (no post) | Easy | Already have raw HDR buffer pre-post-processing |
| Depth/Z | Easy | Read accumulation RT alpha, normalize to 0-1 range, export as grayscale |
| Bloom/Glow | Easy-Med | Run BloomPass separately, read its output RT before composite |
| Alpha/Matte | Medium | Shader variant: `#define RENDER_ALPHA_MATTE` → output hit=1.0, miss=0.0 |
| Reflection | Hard | Requires AOV (arbitrary output variable) or deferred pass — shader refactor |

**Recommendation:** Ship depth + color + bloom first. Alpha matte second. Reflection AOV is a bigger architectural change.

---

## 2. Image Export Formats

**Request:** JPG, TIFF, EXR support.

**Current state:** PNG only (with GMF metadata embedding via iTXt chunk).

| Format | Effort | Notes |
|--------|--------|-------|
| JPG | Trivial | `canvas.toBlob('image/jpeg', quality)` — native browser API. Add format selector to bucket render. |
| TIFF | Medium | No browser-native encoder. Use `utif.js` (~15KB). Low priority since EXR supersedes it for pro work. |
| EXR | Med-Hard | High value. HDR float data already exists in bucket pipeline (pre-tone-mapping). Need a half-float EXR writer — no good browser lib exists, would need custom writer or WASM. `three.js` has EXR *loader* but no writer. |

**Recommendation:** JPG first (trivial). EXR second (high value, HDR data is already there). Skip TIFF unless specifically requested.

---

## 3. 3D Export — Camera, Lights, Animation

**Request:** FBX export with camera position, light origins, and animation data.

**Current state:**
- Camera: fully serializable (position, quaternion, FOV, split-float coords)
- Lights: positions/directions as uniforms (`uLightDir[i]`, `uLightRadius[i]`)
- Animation: full keyframe data with Bezier interpolation (`engine/AnimationEngine.ts`)
- Mesh export: GLB/STL/VDB writers exist in `mesh-export/`

**Implementation path:**
- **glTF/GLB** (recommended): Already have a GLB writer. glTF natively supports cameras, lights (KHR_lights_punctual extension), and animation tracks. Extend existing writer with:
  - Camera node (position, rotation, FOV)
  - Light nodes (directional + point, color, intensity)
  - Animation samplers (keyframe data → glTF animation channels)
- **FBX**: Complex proprietary binary format, no good browser-native writer. High effort, low marginal value over glTF. Users can convert glTF→FBX in Blender.
- **Alembic (.abc)**: Another option for camera/animation. Complex format, not worth it when glTF covers the use case.

**Recommendation:** Extend the existing GLB exporter to include camera + lights + animation tracks. Skip FBX — let users convert in Blender if needed.

---

## 4. Render Video to Image Sequence

**Request:** Export animation as numbered image files instead of video.

**Current state:** Video export pipeline in `engine/worker/WorkerExporter.ts` already:
- Iterates frames with animation scrubbing (lines 318-352)
- Reads pixels per frame into `Uint8Array`
- Runs full accumulation per frame
- Supports File System Access API for disk-mode output

**Implementation:** Skip the VideoEncoder step, write each frame as individual PNG/JPG via File System Access API (already used for disk-mode video). Essentially a "save each frame" mode alongside the existing video muxer.

**Effort:** Low — half day. The frame loop, accumulation, and file I/O infrastructure all exist.

**Considerations:**
- File naming: `frame_0001.png`, `frame_0002.png`, etc.
- Format selector: PNG (lossless) or JPG (smaller)
- Could combine with EXR format for HDR image sequences
- Directory picker via File System Access API (Chrome/Edge)
- Firefox/Safari fallback: zip archive download

---

## 5. Rim Light Color

**Status: DONE** (this session)

Added `rimColor` DDFS param (`type: 'color'`, uniform `uRimColor`) to `features/materials.ts`. Updated hardcoded `vec3(0.5, 0.7, 1.0)` in both `shaders/chunks/lighting/shading.ts` (direct mode) and `shaders/chunks/pathtracer.ts` (path tracing mode). Default preserves the original blue tint. Color picker appears when rim intensity > 0.

---

## 6. VJ Workflow — Spout

**Request:** Spout output for live VJ integration.

**Current state:** No Spout, NDI, or streaming output exists.

**Viability:**
- **Browser:** Not possible. Spout is Windows-only DirectX shared texture protocol. Browsers have zero access to these APIs.
- **Tauri desktop app** (on roadmap): Viable. Tauri can call native Windows APIs. Rust Spout crate exists. Medium effort.
- **WebSocket bridge:** Possible workaround — local bridge app captures canvas frames via WebSocket. Latency would be poor for live VJ work.
- **NDI alternative:** Network-based, cross-platform. Still needs a bridge app but more future-proof than Spout.

**Recommendation:** Block on Tauri desktop app. When Tauri lands, Spout becomes a natural addition via Rust native bindings. For now, OBS window capture is the workaround.

---

## 7. VJ Workflow — MIDI Input

**Request:** MIDI CC control of parameters for live performance.

**Current state:** Modulation system exists (`features/modulation/ModulationEngine.ts`) with LFO and audio FFT sources. No MIDI support.

**Viability: Good** — Web MIDI API is natively supported in Chrome/Edge.

**Implementation plan:**
1. **MIDI device picker** — `navigator.requestMIDIAccess()`, list available inputs
2. **CC learn mode** — click a parameter, move a MIDI knob, bind CC number to param
3. **Modulation source** — Add MIDI CC as a new modulation source type alongside LFO and audio FFT
4. **Mapping** — MIDI CC value (0-127) → normalized 0-1 → param min/max range
5. **Persistence** — Save MIDI mappings in scene/preset data

**Architecture fit:** The modulation target binding system already maps uniform names to parameter setters. MIDI CC values would flow through the same pipeline as LFO/audio. Clean fit.

**Effort:** 2-3 days for basic implementation. Additional time for MIDI learn UX polish.

**Considerations:**
- Chrome/Edge only (Firefox has partial support, Safari has none)
- Note on/off could trigger camera presets or animation playback
- MIDI clock sync could drive animation timeline
- Multiple MIDI devices should be supported

---

## Priority Matrix

| # | Feature | Effort | User Value | Dependencies |
|---|---------|--------|------------|--------------|
| 1 | ~~Rim light color~~ | ~~2-3 hrs~~ | Quick win | **DONE** |
| 2 | Image sequence export | Half day | High | None |
| 3 | JPG format | 2-3 hrs | Medium | None |
| 4 | Depth pass export | Half day | High | None |
| 5 | MIDI input | 2-3 days | High | None |
| 6 | EXR format | 1-2 days | High | None |
| 7 | Camera+lights in GLB | 2-3 days | Medium | None |
| 8 | Alpha matte pass | 1-2 days | Medium | None |
| 9 | Bloom separate pass | 1 day | Medium | None |
| 10 | Spout output | Medium | High | Tauri app |
| 11 | FBX export | 3-5 days | Low | GLB covers it |
| 12 | TIFF format | Half day | Low | EXR better |

Suggested implementation order: 2 → 3 → 4 → 5 → 6 → 7

---

## 8. Audio/Modulation Fixups

**Status: Partially DONE** (this session)

### Fixed
- **Vec2/3/4 purple modulation bars** — `AutoFeaturePanel.tsx` now passes `liveValue` and `showLiveIndicator` to all vector inputs. The infrastructure in `BaseVectorInput` / `VectorAxisCell` already supported it, just wasn't wired up.
- **Vec4 modulation targets** — `ParameterSelector` and `AnimationSystem` now handle vec4 params (previously only vec2/vec3).
- **Generic vector modulation** — `AnimationSystem` vector handler no longer hardcoded to coreMath/geometry. Any DDFS feature with vector params works automatically. Uses the uniform name from param config instead of deriving it from the param key.
- **Parameter label resolution** — `ParameterSelector` label display now correctly resolves vector axis targets (e.g., `coreMath.vec3A_x` → "V-3A: Param Label X" instead of "Core Math: vec3A_x").

### Remaining
- **Parameter list sorting** — modulation target list could be better organized (active formula params first, alphabetical within groups)
- **Active param detection** — grey out or hide params not used by the current formula
- **Auto-naming from formula** — coreMath params should show formula-specific labels (partially done for float params, needs verification across all types)

---

## 9. User Profiles & Gallery (Server Service)


**Request:** User profiles and a shared gallery for community content.

**Architecture decision:** GMT stays a client-only app. The gallery is a separate server service that GMT connects to as a client.

**Why client/server split:**
- GMT is GPL-3.0 open source — keeping it client-only avoids server ops complexity in the open source project
- Gallery service can have its own auth, storage, moderation, and scaling concerns
- GMT already has GMF as a portable scene format — gallery would store/serve GMF files
- Tauri desktop app (on roadmap) can use the same API

**Scope:**
- **Client side (GMT):** Upload GMF scenes, browse gallery, download/load scenes, user profile display
- **Server side (separate repo/service):** User accounts (OAuth?), GMF storage, thumbnails, search/browse, moderation, API

**Open questions:**
- Auth provider — GitHub OAuth, Google, email/password?
- Hosting — managed service? Self-hosted?
- Moderation — manual review, community flagging, or open?
- Monetization tie-in — free gallery? Premium features?

---

## 10. Tutorials — Light System

**Request:** Next tutorial covering the light system.

**Current tutorials:** (check `data/help/topics/` for existing content)

**Topics to cover:**
- Directional lights: positioning, color, intensity
- Light temperature (Kelvin mode vs color picker)
- Light spheres: size, softness, visibility, inside-tinting
- Rim light: intensity, sharpness, color (newly added)
- Environment lighting: gradient vs sky image, rotation, BG visibility
- Self-illumination: emission sources (surface, layers, solid color)
- Path tracing illumination power
- Shadows: algorithm selection (Soft/Hard/Robust), resolution, bias
- AO: intensity, radius, samples, tint color
- Practical workflows: studio lighting setup, dramatic single-light, ambient-only

**Format:** Follow existing tutorial structure in the help system.

---

## 11. Remaining from General Fixes

Only 2 items remain from the original general-fixes-spec:

| # | Item | Priority |
|---|------|----------|
| 1 | Lite mode float depth & alpha | Low — mobile edge case |
| 7 | Tooltips with shortcuts | Low — partially done (CameraTools only) |

## Plans Archive

All completed/deferred plans moved to `plans/archive/`:
- `ddfs-overhaul.md` — completed
- `double_compile_analysis.md` — completed (MRT refactor)
- `unified_input_system.md` — completed (`components/inputs/`)
- `workshop-preview-mode.md` — completed (auto-fastest on Workshop open)
- `workflow-modes.md` + briefing — deferred (compile-time settings UX redesign concept)
- `workshop-split-screen.md` — deferred (split-screen workshop concept)
