# FBX Export — Phase 0 Research Findings

Spike date: 2026-06-17. Verdict: **viable, but it must be BINARY FBX, hand-authored.**

## Finding 1 — ASCII FBX is dead for our targets ❌

**Blender removed ASCII FBX *import* at 2.8** and errors with "ASCII FBX files
are not supported." Devs have stated ASCII import is deprecated/unmaintained
and won't return. Since Blender is a primary target, **ASCII is off the table**.
- https://projects.blender.org/blender/blender-addons/issues/79960
- https://www.blender3darchitect.com/modeling-for-architecture/import-ascii-fbx-files-blender/

→ **Decision: emit BINARY FBX (version 7400).**

## Finding 2 — No JS FBX writer exists

three.js ships `FBXLoader` only; there is no FBX *exporter* (ASCII or binary)
and no established JS binary-FBX writer library.
- https://github.com/mrdoob/three.js/issues/9860
- https://deepwiki.com/mrdoob/three.js/4.2-fbx-and-other-model-formats

→ **Decision: hand-author the binary container ourselves.** Feasible — the
format is reverse-engineered and well-documented, and we already have a
little-endian growable `BinaryWriter` in `mesh-export/algorithms/mesh-writers.ts`
to reuse for the byte plumbing.

## Finding 3 — Fusion imports animated FBX cameras ✅

Resolve **Fusion ▸ Import ▸ FBX Scene** creates per-camera/light/mesh nodes and
preserves animation via *Takes* (Near/Far/Aperture/Angle-of-view/Plane-of-focus
imported for cameras). Confirms the user's "it can." Caveat: forum reports of
cameras occasionally importing as dummies — must verify with our own file in the
Phase 6 loop, and populate a Take so the Take Name field isn't blank (blank =
no animation imported).
- https://forum.blackmagicdesign.com/viewtopic.php?f=22&t=99800
- https://www.steakunderwater.com/VFXPedia/__man/Resolve18-6/DaVinciResolve18_Manual_files/part2197.htm

## Finding 4 — Binary FBX writer spec (enough to build)

Sources: Blender devs' spec (https://code.blender.org/2013/08/fbx-binary-file-format-specification/),
Autodesk binary spec gist (https://gist.github.com/iscle/0dbcee58be8582978d15ea3629ce3e8b).

**Header (27 bytes):** `"Kaydara FBX Binary  \x00"` (20) + `0x1A 0x00` (2) +
uint32 version (4). Use **7400** → 32-bit offsets (simpler than 7500's 64-bit).

**Node record (7400):** `endOffset:u32, numProps:u32, propListLen:u32,
nameLen:u8, name, properties…, children…`. Each nested child list terminates
with a **13-byte NULL record** (all-zero endOffset/numProps/propListLen/nameLen).
⚠ The iscle gist's "4 zero bytes" is wrong for 7400 — it's 13 (the search hit
confirms "13 zero bytes"). 7500 would be 25.

**Property type codes:** scalars `Y`(i16) `C`(bool/1) `I`(i32) `F`(f32) `D`(f64)
`L`(i64); arrays `f d l i b` (`{arrayLen:u32, encoding:u32, compLen:u32, data}`);
`S` (string: `{len:u32, bytes}`) `R` (raw bytes). All little-endian.

**Arrays can be UNCOMPRESSED (encoding = 0)** — `compLen` = raw byte length,
data stored verbatim. **No zlib/DEFLATE needed in the browser.** (encoding 1 =
deflate; we don't use it.)

**Footer — the one fuzzy bit.** Every public spec calls the footer "unknown
contents." It's a fixed-ish trailer (file-id 16 bytes + padding to alignment +
version repeated + ~120 zero bytes + a 16-byte magic). Importers vary in
strictness. **Plan: lift the exact footer-writing routine verbatim from a known-
good open exporter** — Blender's `io_scene_fbx` (`fbx_utils.py` /
`encode_bin.py`) or assimp's `FBXExporter.cpp` — rather than re-derive it. This
is the single most likely source of "file won't import" bugs; nail it with a
byte-diff against a Blender-exported reference .fbx early in the writer phase.

## Finding 5 — FBX SDK content requirements (from live C4D import testing)

Blender's parser is lenient; the Autodesk FBX SDK (C4D/Maya/Max/Unity/Unreal)
is strict and rejects/mangles files that Blender reads fine. Two non-obvious
requirements surfaced only by importing into C4D against a real DCC reference:

1. **Standard preamble is mandatory.** Missing it → "Unable to read file /
   Error loading document." The SDK needs top-level `FileId` (16 raw bytes),
   `CreationTime`, `Creator`, and inside `FBXHeaderExtension`:
   `EncryptionType`, `CreationTimeStamp`, `SceneInfo`. Also a `GlobalSettings`
   entry in `Definitions`. Implemented as `fbxHeaderNodes()` in fbxBinary.ts
   (Blender's fixed FileId/CreationTime constants — proven cross-DCC).
2. **`DefaultAttributeIndex` (int, 0) on every Model** — this is how the SDK
   binds a Model to its attribute (Geometry for a mesh, NodeAttribute for a
   camera/light). Without it the object imports as an empty **Null**.

Both verified by diffing against a Maxon C4D 2026 export of a cube+camera.

## Finding 6 — Up-axis option (Y-up ↔ Z-up)

C4D verified the full static + animated pipeline (cube + orbiting camera, all
correct). Fusion uses the same FBX SDK so it's **assumed-working, unverified**
(user has no Fusion install). Camera-forward correction settled: FBX cameras
aim down local **+X**, so a **+90° Y yaw** turns them to look down −Z (verified
in C4D, up correct).

**Up-axis decision: Y-up only, no flip.** Export stays Y-up and declares it in
`GlobalSettings` (Up=+Y/Front=+Z). Z-up targets (Max/Unreal/Blender-native)
convert on import via those axis fields, so a clean Y-up file imports correctly
everywhere — host apps handle the flip.

A Z-up *bake* was prototyped (+90°X into all coords) but DROPPED: the rotation
rebake (quaternion compose → Euler) came out wrong in C4D (camera sideways/from
below — gimbal/Euler-order issue at the orbit's yaw=±90 singularity, exactly the
risk the plan flagged for the orientation conversion). Not worth carrying when
the importer converts for free. If a future target genuinely needs baked Z-up,
the robust route is a single static root-null carrying the 90° rotation (no
per-frame Euler rebake, no gimbal) — not the per-frame matrix round-trip.

## Finding 7 — Bake camera rotation from the timeline's Euler tracks (flip fix)

The real exporter first showed a camera rotation FLIP the render never has.
Cause: the sampler read the camera **quaternion** per frame and re-extracted XYZ
Euler — that round-trip gimbal-/sign-flips on frames the playback sweeps
smoothly.

Fix: bake `Lcl Rotation` straight from the **`camera.rotation.{x,y,z}` Euler
tracks** — the render's own source of truth (cameraBinders `postScrub` builds
the camera quaternion via `setFromEuler` of these smooth, wrap-continuous
values). No quaternion → Euler round-trip anywhere. The constant FBX
camera-forward correction (+X → −Z) moves OUT of the animated channel into the
camera Model's **`PostRotation (0,-90,0)` + `RotationActive`**
(effective = Lcl · PostRotation⁻¹ = Lcl · Ry(90), the C4D-verified aim).

LESSON for any future bake of an animated rotation: export from the SAME
representation the engine animates/plays back (here: Euler tracks), never via a
quaternion the engine merely *derived*. Keep constant axis/convention
corrections in a separate fixed transform (Pre/PostRotation), not folded into
the animated keys.

## Net pivot

The earlier plan's "hand-author ASCII" approach is dead. Everything else holds:
the OO graph (Objects + Connections), camera lens, KTime curves, plate quad,
PSR param nulls are all format-independent. Only the **container writer** changes
from a string builder to a binary node-tree serializer. Risk moves from "will
ASCII import" (answered: no) to "is our binary container byte-valid" — bounded,
verifiable by byte-diff against a Blender reference export.
