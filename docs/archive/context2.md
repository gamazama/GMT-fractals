
# Context: Current State & Architecture

**Current Status:** DDFS Migration Complete. All core features migrated to Data-Driven Feature System.

---

## 1. DDFS Status: 🟢 Complete

The Data-Driven Feature System has successfully replaced the hardcoded `mathSlice` and `visualSlice` logic for all shader parameters.

### 1.1 Architecture Verification
*   **UI:** `FormulaPanel.tsx` uses `AutoFeaturePanel` to render Geometry controls, significantly reducing code duplication.
*   **Shader:** Uniforms are auto-generated. Manual uniform strings have been removed from feature definitions to prevent redefinition errors.
*   **Persistence:** `fractalStore.ts` -> `getPreset` now dynamically iterates the registry to save state, ensuring future-proof saves.

### 1.2 The Lighting Exception
Lights are now handled by the `LightingFeature` DDFS module (`features/lighting`).
*   **Reasoning:** Lights require spatial manipulation (Gizmos), drag-and-drop placement, and array management (add/remove lights). DDFS manages the parameter configs, but a custom component handles the complex interactions.

---

## 2. Active Features

All features are registered in `features/index.ts`:

### Core
*   `CoreMathFeature` - Iterations, Params A-F
*   `GeometryFeature` - Julia, Hybrid (Box), Pre-Rotation

### Rendering & Shading
*   `LightingFeature` - Light studio, Shadows, Falloff
*   `AOFeature` - Ambient Occlusion
*   `ReflectionsFeature` - Raymarched reflections
*   `AtmosphereFeature` - Fog, Volumetric Glow
*   `MaterialFeature` - PBR Surface, Emission, Environment
*   `WaterPlaneFeature` - Infinite ocean plane
*   `ColoringFeature` - Gradients, Mapping modes
*   `TexturingFeature` - Image mapping, UV logic
*   `QualityFeature` - Precision, Steps, Thresholds

### Post & Effects
*   `DrosteFeature` - Post-process spiral effects
*   `ColorGradingFeature` - Tone mapping levels

### Scene
*   `OpticsFeature` - FOV, Depth of Field, Projection
*   `NavigationFeature` - Fly speed settings
*   `CameraManagerFeature` - Camera position management

### Systems
*   `AudioFeature` - WebAudio analysis and linking
*   `DrawingFeature` - On-screen measurement tools
*   `ModulationFeature` - LFOs and signal routing
*   `WebcamFeature` - Overlay logic
*   `DebugToolsFeature` - Shader/State debuggers
*   `EngineSettingsFeature` - Master configuration profiles (Lite/Balanced/Ultra)

---

## 3. Code Health Notes

### Completed
*   **visualSlice Removal:** Deleted. Lighting managed by `lighting` feature.
*   **Lite Render Unification:** Logic moved into `QualityFeature` state.
*   **Subscription Cleanup:** Manual `subscribe` calls replaced by DDFS auto-detection.
*   **Shader Builder:** `ShaderBuilder.ts` implemented with feature `inject()` contract.
*   **`shaderGenerator` removed:** Dead property deleted from `FeatureDefinition`.
*   **`shader` → `postShader`:** Renamed in `FeatureDefinition` for clarity. `inject()` = raymarching shader; `postShader` = post-process pass. See `engine/FeatureSystem.ts`.
*   **`ShaderConfig` extracted:** Lives in `engine/ShaderConfig.ts`. `pipeline` and `graph` fields are now typed (`PipelineNode[]`, `FractalGraph`). Re-exported from `ShaderFactory.ts`.
*   **Category 2 `any` fixes:** `inject()` config param, `ParamCondition`, `ParamOption`, `EngineInputEvent` discriminated union — all given precise types.
*   **Shader permutation:** ✅ Already implemented in `ShaderFactory.ts` via `engineConfig.toggleParam`. Features with this set are conditionally injected.

### Minor Issues
*   **Mobile UI:** Some auto-generated panels are cramped on vertical screens.
*   **Typing (Category 3):** `(state as any)[feat.id]` pattern in engine plumbing. Deferred — requires `FeatureStateMap`; adding it would add per-feature friction. See `docs/07_Code_Health.md` Section 4.

---

## 4. Fragmentarium Importer (New Feature)

A built-in tool for importing Fragmentarium `.frag` files has been added:

### Files
- `features/fragmentarium_import/parsers/ast-parser.ts` — **Active parser** (AST-based via `@shaderfrog/glsl-parser`)
- `features/fragmentarium_import/parsers/dec-preprocessor.ts` — DEC format preprocessor
- `features/fragmentarium_import/transform/` — Code generation, variable renaming, init generation
- `features/fragmentarium_import/FormulaWorkshop.tsx` — UI workshop for import pipeline

### Usage
1. Open Formula dropdown in the UI
2. Click "Import from Fragmentarium (.FRAG)"
3. Paste .frag code — V2 parser generates AST, auto-maps uniforms to GMT slots
4. Adjust uniform → param mappings in the workshop UI
5. Import and compile

### Current Status: 🟢 40/40 tests passing

Run `npx tsx debug/test-frag-importer.mts` to verify. See `docs/21_Frag_Importer_Current_Status.md` for details and remaining open issues.

### Technical Notes (Architecture — Not Broken)
- V2 uses `@shaderfrog/glsl-parser` for AST-level renaming, loop extraction, and helper function transformation — eliminates regex bugs (e.g., `z.z → z_local.z_local`)
- Automatic pattern detection: `MENGER`, `MANDELBOX`, `AMAZING_SURFACE`, `GENERIC`
- Vec2/Vec3 slot mapping in UI is implemented (`vec2A/B/C`, `vec3A/B/C`)
- `providesInit` body inlining is implemented but untested on real files

See `docs/11_Fragmentarium_Conversion.md` for detailed conversion guide.

---

## 5.5 Path Tracer Quality Params (New)

Four new `LightingFeature` params (all `onUpdate: 'compile'`, shown in Engine panel when PT enabled):

| Param | GLSL Define / Uniform | Description |
|-------|----------------------|-------------|
| `ptNEEAllLights` | `PT_NEE_ALL_LIGHTS` | Evaluate every active light per bounce (vs. one random) — reduces shadow noise at N× ray cost |
| `ptEnvNEE` | `PT_ENV_NEE` | Sample env map directly each bounce (one extra trace) — reduces sky-light noise |
| `ptVolumetric` | `PT_VOLUMETRIC` | Henyey-Greenstein fog scatter (see Section 2.5 in Rendering Internals) |
| `ptMaxLuminance` | `uPTMaxLuminance` | Firefly clamp — clamps per-sample luminance before accumulation |

Also: **rim light is now bounce-0 only** (prevented incorrect indirect rim brightening).

## 5.6 Vector Formula Parameters (New)

`CoreMathFeature` now exposes six vector params (`features/core_math.ts`):

| Param | Uniform | Type | Notes |
|-------|---------|------|-------|
| `vec2A/B/C` | `uVec2A/B/C` | `{x,y}` | Vec2 formula params |
| `vec3A/B/C` | `uVec3A/B/C` | `{x,y,z}` | Vec3 formula params |

- Rendered in `FormulaPanel.tsx` via `Vector2Input` / `Vector3Input` components
- Each axis is independently animatable (`coreMath.vec3A_x`, `.y`, `.z`) — `AnimationSystem` reconstructs the full vec3 before uploading
- `ParameterSelector` expands vec params into per-axis entries for the animation track picker
- Formulas declare these as `uniform vec3 uVec3A;` etc. and can set `type: 'vec3'` in their `parameters[]` with a `mode` field (`'rotation'` or `'normal'`)

## 5. Vector Input System (Enhanced)

The unified input system for Vector3 and Vector2 parameters has been significantly enhanced:

### Components
- `BaseVectorInput.tsx` - Core vector input with translation/rotation modes
- `VectorAxisCell.tsx` - Individual axis cell with label, drag, and reset
- `RotationHeliotrope.tsx` - 3D direction visualizer for rotation parameters
- `DualAxisPad.tsx` - XY manipulation pad

### Features
- **Translation Mode**: Standard X/Y/Z axis controls with color-coded labels
- **Rotation Mode**: Auto-detected via word boundary regex (`/\brot(ation|ate)?\b/i`)
  - Heliotrope direction visualizer (drag to change azimuth/pitch)
  - Unit toggle (degrees/radians) via right-click context menu
  - Axes labeled A (Azimuth), P (Pitch), ∠ (Angle)
- **Interactions**:
  - Drag numbers to adjust values
  - Shift+Drag: 10x speed
  - Alt+Drag: 0.1x precision (no step quantization)
  - Double-click axis label: Reset to default
  - Click number: Text input with π notation support (e.g., "0.5π", "90°")

### Precision
- Display: 1 decimal place
- Text input: Up to 6 decimal places
- Step quantization: Applied to normal drag, skipped in Alt mode

See `data/help/topics/ui.ts` 'ui.vector' for user documentation.
