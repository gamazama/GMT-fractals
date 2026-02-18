# General Fixes Specification

## Overview
This document captures a comprehensive list of bug fixes and improvements for the GMT fractal application, derived from user feedback and code analysis.

---

## 1. Lite Mode - Float Depth & Alpha Support

### Issue
Lite mode needs to accept low float depth for DST (distance) and probes. Need to check if alpha channel is supported on mobile.

### Location
- [`features/quality.ts`](../features/quality.ts:60) - `bufferPrecision` param
- [`hooks/usePhysicsProbe.ts`](../hooks/usePhysicsProbe.ts:146) - reads alpha channel for depth
- [`shaders/chunks/main.ts`](../shaders/chunks/main.ts:93) - stores depth in alpha

### Analysis
- Lite mode uses `bufferPrecision: 1.0` (HalfFloat16)
- Depth is stored in alpha channel for physics probe
- HalfFloat16 may not support alpha channel on all GPUs

### Fix Required
1. Check WebGL context for `OES_texture_float_linear` and half-float alpha support
2. Fallback to CPU distance calculation if alpha not available
3. Add validation in engine initialization

---

## 2. Engine Panel - Compile State During Switch

### Issue
Engine panel compile should not show "Apply" button while switching. Compile = freeze UI.

### Location
- [`components/panels/EnginePanel.tsx`](../components/panels/EnginePanel.tsx)
- [`components/CompilingIndicator.tsx`](../components/CompilingIndicator.tsx)

### Fix Required
1. Disable "Apply" button during compile state
2. Show spinner/overlay during shader compilation
3. Prevent parameter changes during compile

---

## 3. Local Rotation Not Working

### Issue
Local rotation (fractal rotation) feature is not functioning. This is a geometry feature embedded in the main render loop that rotates the fractal with advanced mode hybrid adjustment.

### Location
- [`features/geometry.ts`](../features/geometry.ts:125) - `preRotEnabled`, `preRotX/Y/Z` params
- [`engine/ShaderBuilder.ts`](../engine/ShaderBuilder.ts) - `setRotation()` method
- [`engine/managers/UniformManager.ts`](../engine/managers/UniformManager.ts) - syncFrame() method
- GLSL shader code for rotation matrix

### Root Cause
The `uPreRotMatrix` uniform (mat3) was only being calculated and updated in `VideoExporter.ts` during video export. The main render loop did not update this matrix when rotation values changed at runtime.

### Fix Applied ✅
Added rotation matrix calculation to `UniformManager.syncFrame()`:
1. Read geometry state from Zustand store
2. Apply modulation offsets if present
3. Calculate rotation matrix: Z * X * Y order (matches VideoExporter)
4. Update `uPreRotMatrix` uniform every frame

**Files Modified:**
- [`engine/managers/UniformManager.ts`](../engine/managers/UniformManager.ts) - Added local rotation matrix calculation in syncFrame()

---

## 4. Speed Should Read Lerped DST

### Issue
Speed should read a lerped (interpolated) version of DST when DST increases.

### Location
- [`hooks/usePhysicsProbe.ts`](../hooks/usePhysicsProbe.ts) - DST calculation
- [`hooks/useInputController.ts`](../hooks/useInputController.ts) - speed control
- [`components/HudOverlay.tsx`](../components/HudOverlay.tsx:162) - SPD display

### Analysis
- Current: Speed is set directly from DST readings
- Problem: Rapid DST changes cause jerky speed adjustments

### Fix Required
1. Implement smooth interpolation for speed based on DST
2. Add lerp factor for speed transitions
3. Handle DST increase scenarios specifically

---

## 5. Left Pane Auto-Open

### Issue
Left pane should auto-open when a panel is first docked. Engine and CameraManager panels should appear on the left pane when loaded.

### Location
- [`components/layout/Dock.tsx`](../components/layout/Dock.tsx:14) - `isLeftDockCollapsed`
- [`store/slices/panelSlice.ts`](../store/slices/panelSlice.ts) - panel management

### Fix Required
1. Auto-expand left dock when first panel is added
2. Ensure Engine and CameraManager panels default to left dock
3. Update panel initialization logic

---

## 6. Quality: Estimator Selection (Lin/Damp)

### Issue
Estimator selection (Linear/Dampened) - is it working or does it need a recompile?

### Location
- [`features/quality.ts`](../features/quality.ts:87) - estimator param definition
- Line 98: `onUpdate: 'compile'` - **REQUIRES RECOMPILE**

### Analysis
The estimator parameter has `onUpdate: 'compile'`, meaning shader recompilation is required when changed.

### Fix Required
1. Verify UI shows compile indicator when estimator changes
2. Ensure shader rebuilds with correct estimator
3. Add visual feedback during recompile

---

## 7. Tooltips with Keyboard Shortcuts

### Issue
Tooltips should display keyboard shortcuts. Add shortcut for advanced mode toggle.

### Location
- [`components/Knob.tsx`](../components/Knob.tsx:15) - has `tooltip` prop
- Various components use `title` attribute
- [`hooks/useKeyboardShortcuts.ts`](../hooks/useKeyboardShortcuts.ts)

### Fix Required
1. Create tooltip component that shows shortcuts
2. Add shortcut hints to all interactive elements
3. Show shortcuts conditionally based on advanced mode
4. Add shortcut for toggling advanced mode

---

## 8. Histogram Improvements

### Issues
1. Must show when histogram data is updated vs stale
2. Refresh should work before fit (or on mouse over)
3. Add extra button to set 0-1 range

### Location
- [`components/Histogram.tsx`](../components/Histogram.tsx)

### Current State
- Has `autoUpdate`, `onRefresh`, `onToggleAuto` props
- Shows refresh button when not auto-update
- Has `fixedRange` prop for 0-1 range

### Fix Required
1. Add visual indicator for stale data (dimmed, icon, or border)
2. Enable refresh on hover even when auto is off
3. Add "Reset 0-1" button to quickly set range
4. Show last update timestamp or frame


-- ADDED NOTE: histogram should not update in intervals, not when navigating, at start of accumulation once
---

## 9. Gradient Editor Fixes

### Issues
1. Delete key should delete selected knot
2. Context menu doesn't close (cancel)
3. Step mode incorrectly spaced

### Location
- [`components/AdvancedGradientEditor.tsx`](../components/AdvancedGradientEditor.tsx)

### Analysis
- Delete key handler exists at line 393
- Context menu at [`components/gradient/GradientContextMenu.tsx`](../components/gradient/GradientContextMenu.tsx)
- Step interpolation mode in types

### Fix Required
1. Verify Delete/Backspace key handler works when knots selected
2. Close context menu after action or on cancel
3. Fix step mode interpolation spacing calculation

---

## 10. Q/E Rotation Affected by SPD

### Issue
Q/E rotation should be affected by SPD (current speed). Currently at fixed 50%.

### Location
- [`hooks/useInputController.ts`](../hooks/useInputController.ts:77) - KeyQ/KeyE handlers
- Line 46-55: roll velocity calculation

### Current Code
```typescript
const targetRoll = moveState.current.rollLeft ? 1 : (moveState.current.rollRight ? -1 : 0);
const accelRate = targetRoll !== 0 ? 1.0 : 3.0;
```

### Fix Required
1. Multiply roll rate by current speed value - since the default SPD is 50%, we must maintain the current speed at default.
2. Scale roll velocity with `speedRef.current`
3. Maintain smooth momentum while respecting speed

---

## 11. Mandelorus Showing as HyperTorus

### Issue
Mandelorus formula still displays as "HyperTorus" in some places.

### Location
- [`formulas/Mandelorus.ts`](../formulas/Mandelorus.ts:109) - preset has `"name": "HyperTorus"`
- [`formulas/index.ts`](../formulas/index.ts:75) - alias exists
- [`data/help/topics/formula_library.ts`](../data/help/topics/formula_library.ts:90)

### Fix Required
1. Update preset name from "HyperTorus" to "Mandelorus"
2. Verify all UI references use correct name
3. Keep alias for backward compatibility

---

## 12. Snapshot "Capturing..." Indicator

### Issue
Take snapshot should show "Capturing..." indicator before capturing, as it may hang briefly.

### Location
- [`components/topbar/CameraTools.tsx`](../components/topbar/CameraTools.tsx:17) - `handleSnapshot`
- [`engine/FractalEngine.ts`](../engine/FractalEngine.ts) - `captureSnapshot` method

### Fix Required
1. Show "Capturing..." overlay/modal immediately on click
2. Use async rendering to allow UI update
3. Hide indicator after capture completes or fails

---

## 13. Camera Manager Overlays (Grid/Spiral/Golden Ratio)

### Issue
Camera manager needs composition overlays like grid, spiral, golden ratio. Must use DDFS for settings. Overlays appear in viewport only during editing (not in exports).

### Location
- New feature - needs implementation
- Could extend [`components/HudOverlay.tsx`](../components/HudOverlay.tsx)
- DDFS integration via [`engine/FeatureSystem.ts`](../engine/FeatureSystem.ts)
- Settings should be collapsible/adjustable via DDFS UI

### Fix Required
1. Create new DDFS feature for composition overlays
2. Implement overlay types:
   - Rule of Thirds grid
   - Golden Spiral
   - Golden Ratio
3. Add toggle and opacity controls
4. Render as SVG overlay on viewport (not in render output)
5. Make settings collapsible in camera manager panel
6. Ensure overlays don't affect snapshot/render output

---

## 14. Light Temperature Control

### Issue
Light panel needs temperature control with switch between temp/color. Must be neat/minimal UI.

### Location
- [`features/lighting/LightPanel.tsx`](../features/lighting/LightPanel.tsx)
- [`features/lighting/components/LightControls.tsx`](../features/lighting/components/LightControls.tsx)

### Fix Required
1. Add temperature slider (Kelvin: 1000K - 10000K)
2. Implement Kelvin to RGB conversion
3. Add toggle between temperature and color picker
4. Keep UI minimal - possibly a small toggle button

---

## 15. Bucket Render for Large Images

### Issue
Bucket render doesn't work correctly for large images (above 3K resolution). Older tiles become corrupt and low quality as the render progresses.

### Location
- [`engine/BucketRenderer.ts`](../engine/BucketRenderer.ts)

### Analysis
- Bucket renderer processes tiles sequentially
- Each bucket accumulates frames independently
- Problem: Earlier buckets may lose quality or become corrupt as render continues
- Likely causes:
  1. Accumulation buffer not being properly preserved between buckets
  2. Memory pressure causing earlier render data to degrade
  3. Convergence threshold issues affecting earlier buckets differently

### Fix Required
1. Investigate accumulation buffer handling between bucket transitions
2. Ensure each bucket's rendered data is preserved correctly
3. Check memory management for large tile counts
4. Consider progressive save of completed tiles for very large renders
5. Add validation that earlier buckets maintain quality

---

## 16. Internal Scale Multiplies Pixel Values

### Issue
Internal scale should multiply pixel values like ray detail. Choosing 2x should appear the same fractal (supersampling).

### Location
- [`components/timeline/RenderPopup.tsx`](../components/timeline/RenderPopup.tsx:41) - `internalScale`
- [`engine/VideoExporter.ts`](../engine/VideoExporter.ts:100) - uses `internalScale`
- [`features/quality.ts`](../features/quality.ts:121) - `detail` param (ray detail)
- [`shaders/chunks/trace.ts`](../shaders/chunks/trace.ts:43) - pixelSizeScale and effectiveDetail

### Analysis
- Ray detail multiplies step count/detail
- Internal scale currently only affects resolution
- Should also affect precision/detail parameters

### Fix Applied ✅
The internal scale now correctly affects ray detail (inverse) but NOT pixel size:
- `pixelSizeScale` - world-space size of output pixel (NOT affected by internal scale)
- `effectiveDetail = uDetail / uInternalScale` - ray detail is inversely scaled

This means higher internal scale = more precision per output pixel (supersampling effect).

**Files Modified:**
- [`shaders/chunks/trace.ts`](../shaders/chunks/trace.ts:43) - Removed `/ uInternalScale` from pixelSizeScale

---

## Implementation Priority

### High Priority (User Experience)
1. Snapshot "Capturing..." indicator (#12)
2. Left pane auto-open (#5)
3. Histogram improvements (#8)
4. Gradient editor fixes (#9)

### Medium Priority (Functionality)
5. Q/E rotation with SPD (#10)
6. Mandelorus naming (#11)
7. Light temperature (#14)
8. Estimator recompile feedback (#6)

### Lower Priority (Enhancements)
9. Camera manager overlays (#13)
10. Internal scale fix (#16)
11. Bucket render large images (#15)
12. Tooltips with shortcuts (#7)
13. Speed lerped DST (#4)
14. Lite mode float depth (#1)
15. Engine panel compile state (#2)
16. Local rotation (#3) - needs investigation

---

## Questions for Clarification

~~1. **Local Rotation (#3)** - What is this feature? Object pivot rotation? Camera local axis rotation?~~
**ANSWERED**: Geometry feature for fractal rotation in GLSL render loop with hybrid mode adjustment.

~~2. **Bucket Render (#15)** - What specific resolution fails? What error occurs?~~
**ANSWERED**: Above 3K resolution, older tiles become corrupt and low quality as render progresses.

~~3. **Camera Manager Overlays (#13)** - Should these be viewport overlays or export overlays?~~
**ANSWERED**: Viewport only during editing, adjustable/collapsible via DDFS UI.
