# Critic: GMT regression - what app-gmt loses if GMT-SYSTEMS.md is built as written

Read-only review, 2026-10-07. Nothing was run (no typecheck, smokes or GPU). Every fact below is from a
file I opened or grepped in the `deep-zoom` worktree; anything else is marked unverified.

**Verdict.** The navigation plan is close to safe and its N0 guard is real. Four reworks are not safe as
written: the distance source (N1), the light packing function (L2), the `frame` / `lengthUnit` fields (L4),
and the bucket-status bridge. Most guards the document cites for the Light Studio do not touch a light.

## What I confirmed is right

- N0's falsification target exists where the document says: `private readonly DIST_INCREASE_LERP_RATE = 1.2`
  in `engine-gmt/engine/controllers/CameraController.ts`. The floors are there too:
  `const minDist = inputs.move.boost ? 1e-4 : 0` and `Math.max(clampedDist * settings.baseSpeed * boost, 1e-6)`.
- The integrator has one emit (`FractalEvents.emit('offset_shift', ...)`) and one construction site
  (`useRef(new CameraController())` in `engine-gmt/navigation/Navigation.tsx`). A sink argument does leave
  `FractalEngine` and `GmtRendererTickDriver` receiving the same event.
- All fourteen npm scripts the document names exist in `package.json`.
- No saved `sceneOffset` changes; `VirtualSpace` is left alone.

## Findings

### 1. WRONG - N1: the distance is not only read, it is written back, and it is saved

The document's contract is a read-only source, `() => ({ distance, hit, kind })`, and says
"`usePhysicsProbe.ts` reads the source instead of `engine.lastMeasuredDistance`".

`engine-gmt/navigation/usePhysicsProbe.ts` writes the global four times:
`engine.lastMeasuredDistance = 1.0;` (reset), `= distAverageRef.current;` (sky floor),
`= smoothed;`, `= manualDistance;`. `Navigation.tsx` writes it too:
`engine.lastMeasuredDistance = newState.targetDistance;`.

Readers that depend on the written-back (smoothed or restored) value, none of which go through the probe:
- `Navigation.tsx`: `getUnifiedCameraState(camera, engine.lastMeasuredDistance)` and
  `targetDistance: engine.lastMeasuredDistance` - this is the saved `targetDistance`.
- `engine-gmt/store/cameraSlice.ts`: `const dist = e.lastMeasuredDistance > 0 && e.lastMeasuredDistance < 1000 ? ...`
- `engine-gmt/hooks/useInteractionManager.ts`: `Math.max(0.0002, Math.min(20.0, engine.lastMeasuredDistance * 0.5))`
- also `scene_widgets.tsx` (5 uses), `drawing/` (5), `camera_manager/logic.ts` (1).

If the probe stops writing the global, saved `targetDistance`, Step Back, focus pick and light drag-in see
the raw worker value instead of the smoothed one, and the "restore distance on camera load" write has
nowhere to go. If it keeps writing the global, the seam is half a seam and the document should say so.

Guard: none. No file in `debug/*.mts` contains `usePhysicsProbe` (grep). The N0 replay test covers
`CameraController.update` only.

Fix: state N1 as "the probe reads raw distance from the source and still publishes its smoothed value where
it does today"; leave the other readers alone in this step. Add a node test on the probe's smoothing with a
fixed distance series before touching it.

### 2. WRONG - L2: the pure packing function drops live modulation, and its test would not notice

Document: "`resolveLights(lights, viewFrame) -> packed arrays`, a pure function. It replaces ... the packing
block in `UniformManager.syncFrame`." Guard: "packed arrays equal for a fixed list before and after".

The block in `engine-gmt/engine/managers/UniformManager.ts` takes a third input, per frame:
`const dIntensity = modulations[\`lighting.light${i}_intensity\`] || 0;` and the same for `falloff`,
`posX/Y/Z`, `rotX/Y` (and Z). They are added before packing: `x: (lp?.x ?? 0) + dX`,
`Math.max(0, l.falloff + dFalloff)`. The proposed signature has no modulation argument. A fixed-list
equality test passes with LFO and audio on lights silently dead - the exact failure
`debug/test-modulation-coverage.mts` was written for ("how live rotation / camera / lighting stayed broken").
That test checks routing (`classifyModulationTarget('lighting.light0_intensity')` -> `engine-mods`), not
that `syncFrame` applies the offset.

Second point, performance: the block writes in place into pre-allocated uniform values
(`getLightShaderVector(effectivePos, l.fixed, cam, (posArr[i] as THREE.Vector3))`). "Arrays out" every frame
is a per-frame allocation in the worker's hot loop. The function must take its targets.

Third: the block runs in the worker against the worker's `VirtualSpace.offset` and camera. The document's GMT
view-frame provider is "backed by its proxy and viewport refs" - main-thread objects. Two providers are
needed (worker, main thread); the document describes one.

Fix: signature `packLights(lights, viewFrame, modulations, targets)`; the L2 test must include a non-zero
entry for each of the 8 `LIGHT_PROPS` and one `fixed: true` light.

### 3. WRONG - L4: two fields for one fact, no rule for which wins, no migration, and the cited guard has no lights in it

Document: "`frame?: 'world' | 'camera' | 'surface'`. Absent reads as `fixed ? 'camera' : 'world'` ...
`fixed` keeps being written for old readers." Guard: "`test:gmf` round trip with old scenes byte-identical".

- `fixed` is read directly in at least nine places I grepped: `UniformManager.syncFrame` (twice),
  `LightPanelControls.tsx`, `LightControls.tsx`, `SingleLightGizmo.tsx`, `LightGizmo.tsx` (4 sites),
  `GizmoMath.ts` (`storeToWorld(light.position, !!light.fixed, camera, sceneOffset)`), and the engine API
  `storeToWorld(..., fixed: boolean, ...)` in `engine/overlay/OverlayProjection.ts`.
- Lights arrive with `fixed` and no `frame` from formula presets (`engine-gmt/formulas/AmazingSurf.ts`:
  `fixed: true`; `Apollonian.ts`; `AmazingBox.ts`), from `fragmentarium_import/workshop/param-builder.ts`,
  and in a flat form (`light0_fixed: false` in `engine-gmt/formulas/AmazingSurface.ts`; I did not find the
  converter for that flat form - unverified).
- Any of those merged onto a light that already carries `frame: 'world'` leaves `fixed: true, frame: 'world'`.
  The document does not say which wins. `updateLight({ index, params: { fixed: !wasFixed, ... } })` is a
  partial merge (three call sites), so this state is reachable.
- `lengthUnit: 'view'` changes what the saved numbers `position`, `range`, `radius` mean. A build that does
  not know the field (an open tab on the previous chunk set, or a share link opened on an older build) reads
  them as world units. No version stamp or migration is proposed; neither `engine/migrations.ts` nor
  `app-gmt/migrations.ts` contains a light entry today (grep `light`).
- The guard: `debug/test-gmf-roundtrip.mts` contains no line matching `light` (case-insensitive grep; the
  only `fixed` hit is the phrase "bug fixed"). It cannot go red on a light field.
- `test:modulation-coverage` does not cover it either: `LIGHT_PROPS` is
  `['intensity','falloff','posX','posY','posZ','rotX','rotY','rotZ']` - no `fixed`.

Fix: one stored field. Either keep `fixed` as the stored truth and add `frame` only for the third value, or
normalise on load in one function (`frame` derived, `fixed` derived on write) and say `frame` wins. Write
the round-trip test first with real light scenes: one `fixed: true` preset, one flat-key preset, one partial
merge. Gate `lengthUnit` behind a scene version so an older build refuses or converts rather than misreads.

### 4. WRONG - bucket-status bridge: GMT's copy does three things, not one, and video export depends on it

Document: "Move the bridge inside `installBucketRender` ... Remove GMT's own copy in the same change."

`engine-gmt/renderer/bindings.ts`, the `FRACTAL_EVENTS.BUCKET_STATUS` handler:
`s.setIsBucketRendering?.(data.isRendering); s.setIsExporting?.(data.isRendering);` plus a false-edge release
of `setActiveRenderSampleCap`. `fluid-toy/main.tsx`'s copy calls only `setIsBucketRendering`.

GMT's video exporter emits the same event: `engine-gmt/components/timeline/RenderPopup/exportRunner.ts`,
`FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: true, progress: fraction * 100 })` and two
`isRendering: false` sites. So in GMT the bridge also serves video export, and it must run whether or not the
bucket button exists: GMT installs with `when: desktopOnly`
(`engine-gmt/topbar.tsx`, `installBucketRender({ ..., when: desktopOnly })`).

Removing GMT's copy leaves `isExporting` and the sample-cap release unhandled; if the engine bridge lives in
the panel component rather than at install time, phones lose it entirely.

Fix: the engine bridge sets `isBucketRendering` only, registered at install time, not on mount. GMT keeps a
two-line handler for `setIsExporting` and the sample cap. No smoke runs a bucket or video render to the end
(unverified - I did not open every smoke); treat this as unguarded.

### 5. WEAK - N3's guards do not open the file being rewritten

Document, N3: "GMT identical (`test:interaction*`, `smoke:orbit`)".
No file in `debug/*.mts` contains `useInputController` (grep `-l` over the directory; the only debug script
matching any of `useInputController | usePhysicsProbe | CameraController | LightGizmo | getLightShaderVector |
syncFrame` is `test-modulation-coverage.mts`). `smoke:orbit` drives orbit drag, which reaches the hook only
through the canvas; keys, wheel speed, joystick refs, invert-Y and the orthographic wheel case are untested.
The interaction tests may glob source directories (unverified).

Fix: before N3, extend N0's replay to drive the hook's output shape (key down/up, wheel, drag delta) through
to displacements, and add a fly step to `smoke:orbit` or a sibling: hold W for N frames, assert `sceneOffset`
moved along the view direction.

### 6. WEAK - L1 and L3 guards: none of the cited scripts touches a light

L1 cites `smoke:engine-gmt`, `test:gmf`, `test:partial-apply`; L3 cites `smoke:chrome` plus a new smoke.
`test:gmf` has no light content (finding 3). `smoke:chrome` opens panels and fails on a page error; it does
not assert a light's position. L3 collapses five frame conversions into one - two of them are in
`handleToggleFixed` (`LightControls.tsx`, `LightPanelControls.tsx`) and one in `SingleLightGizmo.tsx`, and
they are not identical today (`SingleLightGizmo` writes `{ fixed, position }`; the other two write
`{ fixed, position, rotation }`). Collapsing them changes behaviour for one of the three. The document's own
new smoke ("toggle attachment, light's screen position does not jump") is the right guard, but it is listed
with L3; it must exist and pass against today's code before L3 starts, for each of the three toggles.

### 7. WEAK - seams GMT pays for and only the deep zoomer uses

- `frame: 'surface'`: "GMT's provider ... reports `surfaceNormal: null` ... (so Surface is disabled in GMT,
  not hidden)", with the GMT plane fit under "Later, 1 to 2". GMT's two-state anchor button
  (`LightControls.tsx`, `title={light.fixed ? 'Attached to Camera ...' : 'World Anchored ...'}`) becomes a
  three-way control with one option that never works in GMT. That is a visible change to a shipped control for
  no GMT gain.
- `lengthUnit: 'view'`: no GMT use is named.
- `kind: 'centre-ray' | 'nearest'` on the distance source: no consumer branches on it in the document.
- `supports: { frames, lengthUnits, maxLights, maxShadowLights, types }`: every field is a deep-zoom limit.

Fix: ship `frame` and the three-way control in GMT only together with the GMT plane fit, or hide (not
disable) options the provider does not declare. Drop `kind` until something reads it.

## Scripts: what catches what

| Rework | Would catch a break | Would not |
|---|---|---|
| N2 integrator move | new N0 replay (real once written), `typecheck` | `smoke:engine-gmt` (mount only), `smoke:orbit` (orbit, not fly) |
| N1 distance source | nothing today | all of the above |
| N3 input hook | `typecheck`; `smoke:orbit` for drag only | `test:interaction*` (no reference to the hook) |
| L1 list split | `typecheck`, `smoke:engine-gmt` (boot) | `test:gmf` (no lights) |
| L2 packing | new test, only if it includes modulation | `test:modulation-coverage` (routing only) |
| L4 fields | nothing today | `test:gmf`, `test:modulation-coverage` |
| Bucket bridge | nothing I found | `smoke:chrome` (clicks, does not finish a render) |

## Not checked

Route B (shading chunks, `ShaderBuilder`), the post-process stack, camera-undo provider, exporters, share
link, gallery scenes and the tutorial: not opened in the time available. Treat the document's guards for
those as unverified by this review.
