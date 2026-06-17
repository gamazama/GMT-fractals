# FBX Camera-Rig Export (After Effects export twin)

**Scope:** A camera-rig FBX export — the FBX analog of the existing "Export to
After Effects" (.jsx) adjunct. Exports the **camera animation, positional-light
nulls, a backdrop plate quad, and animated params** so an artist can recreate
the GMT move and composite a rendered plate in a 3D-capable DCC.

**Explicitly out of scope:** SDF→mesh geometry of the fractal itself. The
fractal travels only as the rendered footage on the plate quad. (mesh-export
remains a separate, heavier feature.)

**Targets:** Blender, DaVinci Resolve (Fusion page), with C4D/Maya/Unreal/Unity
as best-effort. Blender + Fusion are the two canonical validation targets (most
divergent FBX importers).

**Format:** **Binary FBX, version 7400** — hand-authored. ASCII is NOT an
option: Blender dropped ASCII FBX import at 2.8 (errors out). No JS FBX writer
library exists either, so we author the binary container ourselves. Arrays are
written **uncompressed** (encoding 0) → no zlib needed in the browser. See
[fbx-export-findings.md](./fbx-export-findings.md) for the full spike.

---

## Reuse anchor

The existing pieces (all in `dev/`):
- `engine-gmt/components/timeline/RenderPopup/afxExport.ts` — sampler
  (`sampleAfxFrames`) + .jsx writer + `runAfxExport` orchestrator.
- `engine-gmt/components/timeline/RenderPopup/AfxExportDialog.tsx` — options UI.
- `app-gmt/AfxRenderAdjunct.tsx` — `RenderAdjunct` descriptor.
- `app-gmt/main.tsx:408` — `registerRenderAdjunct(afxRenderAdjunct)`.

The sampler today bakes **AE coordinate conversion into the scrub loop**
(`gmtToAePosition` / `quatToAeOrientation` called inside `sampleAfxFrames`).
The refactor's whole point is to make the scrub loop emit **neutral GMT-space
samples** and let each format apply its own conversion + writer.

---

## Phase 0 — Research spikes — ✅ DONE (see fbx-export-findings.md)

Resolved 2026-06-17:
- **ASCII is dead** → emit **binary FBX 7400**, hand-authored (no library).
- **Fusion imports animated FBX cameras** via Takes (✅ "it can"); must populate
  a Take or animation is dropped; verify cameras don't import as dummies.
- **Arrays uncompressed** (encoding 0) → no zlib in browser.
- **Footer** is the under-documented risk → lift verbatim from Blender
  `io_scene_fbx` / assimp `FBXExporter.cpp`, byte-diff vs a Blender reference.

Remaining spikes folded into the build phases (need real import to settle):
- Plate texture **movie vs image-sequence** across Blender + Fusion (Phase 3).
- **PSR-null readout + UV/axis flips** per target (Phase 4 / Phase 6).

---

## Phase 1 — Extract a shared scene sampler

Goal: one format-neutral sampler feeding both AFX and FBX.

1. New module `engine-gmt/components/timeline/RenderPopup/sceneSampler.ts`.
   Lift the scrub loop from `sampleAfxFrames` but emit **neutral** per-frame data:
   - `relPos: [x,y,z]` — deep-zoom-rebased GMT-space camera offset from R
     (keep the existing `splitSub` start-frame rebasing + `scale` verbatim —
     this is the load-bearing deep-zoom logic).
   - `quat: [x,y,z,w]` — raw GMT camera quaternion (no AE flip).
   - `lightsRel: [x,y,z][]` — rebased GMT-space positional-light offsets.
   - `sliders: number[]` — raw track values.
   - Metadata: `fovDeg`, `zoom`, `scale`, `durationSec`, `lightMeta`,
     `sliderMeta`, `centre`.
2. Reduce `sampleAfxFrames` to a thin adapter: call `sceneSampler`, then apply
   `gmtToAePosition` / `quatToAeOrientation` / `unwrapDeg` to produce the
   existing `AfxSample`. **AFX output must be byte-identical** before/after.
3. Gate: re-export an AFX scene, diff the .jsx data block against a pre-refactor
   capture. Zero diff = refactor safe.

---

## Phase 2 — FBX writer core (camera + light nulls + animation)

New module `engine-gmt/components/timeline/RenderPopup/fbxExport.ts`.

0. **Binary container foundation** (do first, byte-diff gated). A node-tree
   serializer over the existing little-endian `BinaryWriter`
   (`mesh-export/algorithms/mesh-writers.ts`): 27-byte header (version 7400),
   recursive node records (`endOffset/numProps/propListLen/nameLen/name/props/
   children` + 13-byte NULL terminator per nested list), typed property writers
   (`Y C I F D L` scalars; `d i l` uncompressed arrays — encoding 0; `S` string;
   `R` raw), and the **footer lifted verbatim from Blender `io_scene_fbx`**.
   Gate: write a trivial camera-only file and confirm it imports into Blender;
   byte-diff the structure against a Blender-exported reference.
1. **Coordinate adapter** (isolated, like AFX's): GMT (RH, Y-up, −Z fwd) →
   FBX (RH, Y-up). Far fewer flips than AE; keep them in one
   `gmtToFbxTransform(relPos, quat)` fn for easy visual-test tuning.
2. **Camera lens:** map GMT vertical FOV → FBX `FocalLength`/`FieldOfView` via
   `FilmAperture` + `ApertureMode`. (The AE "Zoom solve" disappears — FBX has a
   real lens model.)
3. **Document skeleton (as binary node records):** `FBXHeaderExtension`,
   `GlobalSettings` (UpAxis/FrontAxis/CoordAxis/UnitScaleFactor), `Definitions`,
   `Objects`, `Connections`. One camera `Model`, one scene-centre null, one
   `Model` null per positional light.
4. **Animation:** `AnimationStack → AnimationLayer → AnimationCurveNode →
   AnimationCurve` per channel (`Lcl Translation`, `Lcl Rotation`). Times in
   **KTime** (1s = 46186158000 units, stored as `L` i64 arrays). Bake every
   frame (as AFX does) and reuse `unwrapDeg` for Euler continuity. Populate a
   named **Take** (else Fusion imports no animation — Phase 0 finding).
5. **Deep-zoom:** consumes the already-rebased `relPos` from the sampler — no
   new precision work.

---

## Phase 3 — Backdrop plate quad

Adds minimal geometry plumbing to the FBX (the mesh-path machinery in
miniature — one quad, not the SDF pipeline).

1. **Geometry:** 4 verts, one polygon (`PolygonVertexIndex` with FBX's
   negative-last-index terminator), `LayerElementNormal`, `LayerElementUV`
   (orientation per Phase 0 findings).
2. **Material + texture:** `Material` (Lambert) + `Texture` + `Video` object
   referencing the footage. Per Phase 0, reference an **image-sequence**
   (`name.####.ext`) for portability unless movie textures proved reliable.
3. **Camera-locked sizing:** parent the quad to the camera at a fixed depth `d`;
   `height = 2·d·tan(fov/2)`, `width = height·aspect`. Default to camera-locked
   (composite-behind); world-fixed optional later.
4. Fallback when footage absent: still emit the quad + material, leave the
   texture path as a documented placeholder (mirrors AFX's placeholder solid).

---

## Phase 4 — Animated params as PSR-encoded nulls

The portable fallback for AE's Slider Controls.

1. One `Model` null per selected param, named `GMT_param_<safeLabel>`.
2. Bake the raw track value onto **Position Y** (translation — unbounded
   double, universally animatable; avoid Scale/Rotation). Raw values, no
   normalization → lossless. Reuses the slider sampling already in the sampler.
3. Emit a short "how to read these" doc / toast: artist pickwhips
   `GMT_param_fogDensity.position.y` into their parameter.
4. *Optional, Phase 0-dependent:* if user-defined `FbxProperty` custom
   attributes proved to import on a target, prefer the real attribute there and
   fall back to PSR-nulls elsewhere. PSR-nulls is the baseline either way.

---

## Phase 5 — UI + registration

1. New `FbxExportDialog.tsx` next to `AfxExportDialog.tsx` — clone its structure
   (comp size, frame range, param-select, footage filename). Add a **target
   DCC** hint dropdown (Blender / Resolve) if Phase 0 shows per-target output
   differences (e.g. UV flip, axis triple).
2. `app-gmt/FbxRenderAdjunct.tsx` — clone `AfxRenderAdjunct.tsx`, label
   "Export to FBX (3D camera)…".
3. Register in `app-gmt/main.tsx` alongside `afxRenderAdjunct`.
4. `runFbxExport(opts)` orchestrator: sample → serialize binary FBX → Blob
   (`application/octet-stream`) download `<project>_GMT.fbx`, with a guidance
   toast (mirrors `runAfxExport`).

---

## Phase 6 — Validation loop

1. Export a known scene; import the `.fbx` into **Blender** and **Resolve/
   Fusion**. Verify: camera move tracks the plate, FOV matches, lights land,
   param nulls animate, plate footage shows.
2. Fix axis/UV/lens via the isolated adapters only (never the sampler).
3. Capture verified reference scenes per target under `H:\GMT\stuff\fbx-export\`.
4. Update `docs/05_Data_and_Export.md` with the FBX path + the PSR-null readme.

---

## Risk summary

| Item | Risk | Resolved by |
|------|------|-------------|
| Binary container byte-validity (esp. footer) | **High** — wrong footer = won't import | Phase 2.0 footer-lift + byte-diff vs Blender export |
| Fusion animation import | Low — confirmed works via Takes (Phase 0) | Populate a Take; verify in Phase 6 |
| Plate movie vs image-sequence | Medium — affects how footage travels | Phase 3 + Phase 6 import |
| UV / axis / lens flips | Low — known, fixed by reference imports | Phase 6 |
| Camera FOV, KTime curves, deep-zoom rebasing, PSR baking | Low — known or reused | — |

The risk has moved from "will ASCII import" (answered: no) to "is our binary
container byte-valid." That's bounded and verifiable by byte-diff against a
Blender-exported reference, early in Phase 2. The shared-sampler refactor
(Phase 1) remains the keystone — it must keep AFX output byte-identical.
