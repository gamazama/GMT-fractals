# ADR-0012: Two registries frozen together in createFeatureSlice

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `store/createFeatureSlice.ts`, `utils/PresetFieldRegistry.ts`

## Context

Fragility audit F3 found hardcoded non-feature scene fields
(`cameraRot`, `targetDistance`, `sceneOffset`, `cameraMode`,
`savedCameras`) scattered across preset save/load sites. Adding a
new top-level field required edits in 4+ places.

## Decision

Introduce a sibling `presetFieldRegistry` for non-feature preset
fields. `createFeatureSlice` registers default fields via
`registerDefaultPresetFields()`, then freezes BOTH the feature
registry and the preset-field registry in the same boot step.
Plugins extend the preset-field registry via side-effect imports
before store construction (e.g. `engine/plugins/camera/presetField`
for `cameraSlots`, `engine-gmt/store/gmtPresetFields` for `lights`
+ `pipeline`).

## Consequences

- Plugin authors must remember to side-effect-import their
  preset-field registrar; missing it makes the field silently drop
  from save/load.
- Both registries share the same freeze semantics.
- Documented in the feature-system + boot-shell module docs.
