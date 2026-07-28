---
paths:
  - "engine-gmt/features/**"
  - "engine-gmt/store/**"
---

# engine-gmt feature catalog + camera manager

Read first: JSDoc on `engine-gmt/features/index.ts` (feature mounting, engine-core
sharing) and `features/core_math.ts`; JSDoc on `engine-gmt/store/cameraSlice.ts`
and `features/camera_manager/*` (savedCameras, slot hotkeys, the
`installStateLibrary` consumer).

Decisions: ADRs 0054-0055 (catalog), ADRs 0056-0057 (camera manager).

## Watch out

- `camera` and `modular` are **patched slices**. Before concluding that a generic
  engine-core path runs, check whether the app has patched it.
- The camera manager is a consumer of the generic `createStateLibrarySlice`
  primitive — extend the primitive, don't fork it into the feature.

## Guards

```
npm run smoke:statelibrary-drop
npm run smoke:orbit
npm run test:partial-apply
npm run test:session-hold
```

`smoke:statelibrary-drop` is the camera-manager guard: it boots app-gmt at
`localhost:3400/` and drives the Camera Manager's `savedCameras` list directly.
Do NOT reach for `smoke:camera` here — that one boots `fluid-toy.html` and
asserts fluid-toy's own `julia` camera slice through `engine/plugins/Camera.ts`.
fluid-toy imports engine-gmt only for `support` and `feedback`, so nothing under
`engine-gmt/features/**` or `engine-gmt/store/**` is in its bundle and no change
to this rule's scope can make it fail.
