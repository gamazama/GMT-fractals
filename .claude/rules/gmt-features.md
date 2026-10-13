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

Decisions: ADRs 0054-0055 (catalog), ADRs 0056-0057 (camera manager). In
`features/reflections/`: ADR-0068 (raymarched reflections use VNDF importance sampling
plus an env/AO fill), ADR-0071 (the soft-knee firefly clamp, grep `clampReflLum`),
ADR-0100 (moving renders the same integrand as the final image — no cheaper motion
path). In `features/quality.ts`: ADR-0077 (Edge Polish and Step Relaxation were removed;
do not bring them back). The shader-chunk halves of 0068, 0071, 0077 and 0100 are in
[`gmt-shader-chunks.md`](./gmt-shader-chunks.md).

## Watch out

- `camera` and `modular` are **patched slices**. Before concluding that a generic
  engine-core path runs, check whether the app has patched it.
- The camera manager is a consumer of the generic `createStateLibrarySlice`
  primitive — extend the primitive, don't fork it into the feature.

## Guards

```
npm run smoke:statelibrary-drop
npm run smoke:orbit              # ~25s; see the caveat in navigation.md
npm run test:partial-apply
npm run test:session-hold
```

`smoke:orbit` guards the camera gesture and the accumulation-hold release — **not**
whether the renderer produced pixels ([`navigation.md`](./navigation.md)).
`smoke:statelibrary-drop` is the camera-manager guard: it drives the Camera Manager's
`savedCameras` list in app-gmt. Not `smoke:camera`: it boots `fluid-toy.html`, which
imports nothing under this rule's paths.
