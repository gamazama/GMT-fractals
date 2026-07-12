# ADR-0083: Mandelbulb3D scene importer — deterministic-from-source transpile + x87 `[CODE]` decompiler with a numeric cross-check gate

> **Update 2026-07-11 (import UI folded into the FormulaPicker; decisions stand):** the
> `ImportMandelbulb3DModal` is **retired**. Its surfaces relocated:
> - The bundled `.m3p` **sample scenes** are now a "Mandelbulb3D" group in the unified
>   `<FormulaPicker>`'s **Catalog** section (leading it, above Fragmentarium/DEC):
>   `engine-gmt/components/FormulaPicker/mb3dCatalogGroup.ts` (`getMB3DCatalogGroup` +
>   `loadMB3DCatalogScene`), a `CatalogGroup` with `source: 'mb3d'` (widened `CatalogSource`).
>   Picking a card loads the weave scene live (`loadMB3DSceneBytes`), routed by
>   `{action:'catalog', source:'mb3d'}` in `FormulaSelect`. Thumbnails: `debug/mb3d-scene-thumbs.mts`
>   (harness render) + `debug/mb3d-thumbs-from-renders.mts` (from in-app renders) →
>   `public/thumbnails/mb3d-scenes/`, path helper `engine-gmt/utils/mb3d/mb3dSceneThumbs.ts`.
> - **`.m3p` file import** is a shared user-gesture picker (`engine-gmt/utils/mb3d/importM3pFile.ts`
>   → `pickAndLoadM3pFile`), wired to the picker footer (contextual — shows only while the
>   Mandelbulb3D catalog group is active, via the new `footerSlot` render-prop) and the **File-menu
>   Import section**. Removed from the formula hamburger.
> - The **standalone formula library** is dropped from this surface (those formulas are already
>   reachable in the Weave editor's "+ Add formula" picker, and most render empty as standalone
>   thumbnails). The **text-paste** path is removed (owner call).
> - Symmetrically, the Workshop's buried **frag-file load** was lifted to
>   `engine-gmt/features/fragmentarium_import/pickFragFile.ts` (`pickAndLoadFragFile`) via a new store
>   action `openWorkshopWithSource` + Workshop `initialSource` prop; contextual picker-footer button
>   (Fragmentarium/DEC categories) + File-menu Import section.
>
> The `openImportMb3d`/`closeImportMb3d`/`importMb3dOpen` store members and the modal component/host
> are deleted. The underlying load path (`loadMB3DSceneBytes` → `parseMB3DBinary` → `emitFusedHybrid`
> → `loadScene`) is unchanged. Same day, an importer fix: `emitFusedHybrid` floors the authored
> step (`quality.fudgeFactor`) at **0.2** — a very small authored ZstepDiv (Ellarien/Hal-Tenny 0.05,
> Theli-At 0.10) exhausts the ray budget before reaching the surface → black; 0.2 lifts only those
> (Chrystal 0.196 is the smallest that renders, so scenes ≥ 0.2 are unchanged).

> **Update 2026-06-27 (corrections from the plan-surface survey; decisions stand):** three
> original-Consequences claims are now known wrong, corrected by `plans/mb3d/research/coverage-unlocks.md`:
> - **`Cp<n>` PAligned16 consts are NOT "ambiguous / need a runtime MB3D dump".** They are a
>   fully-specified compile-time table (`DivUtils.pas:1616-1644`, copied per-formula at
>   `CustomFormulas.pas:334`): `Cp0/8/80/88` = abs/neg masks, `Cp16+` = plain doubles. The fix is
>   deterministic (seed literals in `constPacker` + assign known values in the cross-check) — this
>   is coverage unlock **U1** (~80 formulas, ≥8 scenes).
> - **Option-type-12 is one 4×4 matrix** (`6SingleAngles` → `BuildRotMatrix4d`, `Math3D.pas:2548`),
>   not "two 3×3". Coverage unlock **U3**.
> - **Camera + lighting/material/palette (L0–L3) ARE now imported** (`mapCamera.ts`/`mapLighting.ts`;
>   see the later Update blocks). The only remaining unimported piece is **fog** (`DepthCol`/`DynFog`
>   parsed but never written to `atmosphere.fog*` — scheduled in the fidelity pass).
> SSE2 decompilation is **done** (Phase 6); the original "367 control-flow / 445 SSE2 unhandled"
> figures are superseded by the 278/279-faithful corpus.

> **Update 2026-06-28 (dense param-packing — multi-slot hybrids now expose sliders; decision unchanged):**
> the original "multi-slot scenes bake [literals]" consequence is superseded. `emitFusedHybrid`'s multi-slot
> allocator no longer caps at 6 scalar params (paramA..F) + 3 vec3 — surplus scalars now pack DENSELY into the
> otherwise-idle `uVec2*`/`uVec4*` component lanes via a shared `LaneAllocator` (24 scalar lanes total:
> paramA..F → uVec2A/B/C comps → uVec4A/B/C comps), and surplus vec3 params (rotations / X/Y/Z triples) overflow
> from the 3 `uVec3*` units into `uVec4*` `.xyz` holders (up to 6 vec3-shaped units). The 3 `uVec4*` units are a
> SHARED pool: scalar-packing claims components low→high, vec3-overflow claims whole units high→low. The
> occupancy algebra + `slotToUniform` were lifted from the Formula
> Workshop into shared `engine-gmt/utils/uniformSlots.ts` (it also hosts `LaneAllocator` + `ScalarParamPacker`);
> `bindOptions`/`internMultiParam` allocate through the packer, grouping vec-lane scalars into one combined vec
> slider per base uniform; a small `FormulaParamsWidget` add renders a `type:'vec3'` param with id `vec4A/B/C`
> as a 3-axis control over `coreMath.vec4*.xyz`. App-side only (no kernel / uniform-schema change). Single-slot +
> ≤6-scalar + ≤3-vec3 multi-slot stay byte-identical; corpus cross-check 293/0 untouched (no decompiled bodies
> change). Bundled scenes with sliders 11 → 21 (+10 that previously baked). 4D (Quaternion) hybrids still reserve
> paramA/B and bake.

**Date:** 2026-06-25
**Status:** Accepted
**Scope:** `engine-gmt/utils/mb3d/*` (new: `parseMB3D`, `weaveSequencer`, `slotTranspiler`, `constPacker`, `emitFusedHybrid`, `loadMB3DScene`, `decompiled-formulas.ts`), `engine-gmt/components/panels/formula/ImportMandelbulb3DModal.tsx` (new) + `FormulaSelect.tsx` (menu wiring), `debug/render-harness.ts` (+`runMB3DWeaveTest`/`runRawFormulaTest`), `debug/test-mb3d-*.mts`, `plans/mb3d/*` (design + ledger + `decompiler/` tooling)
**Related:** the AI formula kit (commit 67053fc) — this is the *deterministic* counterpart the user explicitly preferred over it. Builds on the existing `FractalDefinition`/`registerFormula`/`loadScene` seams (ADRs 0048-0053).
**Design:** [`plans/mb3d/converter-design.md`](../../plans/mb3d/converter-design.md) · discrepancy ledger [`plans/mb3d/formula-discrepancies.md`](../../plans/mb3d/formula-discrepancies.md)

> **Update 2026-06-26 (camera pose now imported; decision unchanged):** the "camera is not imported"
> consequence below is partially superseded. The MB3D scene *camera* (zoom/world-rotation/FOV/pivot) now maps
> onto a GMT Orbit pose via the new `engine-gmt/utils/mb3d/mapCamera.ts` (`mapMB3DCamera`), wired into
> `emitFusedHybrid`'s preset; `parseMB3D` gained `dZstart`@20/`dZend`@28 and its `wRot` JSDoc was corrected
> (RADIANS, not degrees). Handedness: MB3D is LEFT-handed, so world-Z is negated before THREE `lookAt`
> (verified non-mirrored on asymmetric scenes; degenerate headers fall back to the centered default). Spec:
> [`plans/mb3d/camera-import-spec.md`](../../plans/mb3d/camera-import-spec.md). **Lighting + colour remain
> unimported.**

> **Update 2026-06-27 (lighting + material + palette now imported; decision unchanged):** the "lighting/colour
> are not imported" consequence is now superseded. `parseMB3D` walks the `TLightingParas9` block (@432) and a
> new `engine-gmt/utils/mb3d/mapLighting.ts` (`mapMB3DLighting`, mirroring `mapCamera`) maps it into the preset:
> the scene's actual lights (L1 — positional→Point, viewer-relative global→Directional headlamp), material
> (L2 — roughness/diffuse/specular + a graded env ambient), and the surface palette (L3 — the `LCols` anchors →
> coloring gradient, behind a saturation gate so external-`.map` placeholders stay neutral). The importer's old
> aesthetic glow was ALSO removed — it was the Hyperben2 "washout" (a white haze on deep-zoom scenes). All gated
> on the scene having active lights, so standalone/degenerate loads keep DEFAULT_LIGHTS + default material/colour.
> Decoders (Double7B, ShortFloat, TRGB) and all field offsets verified against MB3D Pascal + real `.m3p` bytes.
> Spec: [`plans/mb3d/research/lighting-import-spec.md`](../../plans/mb3d/research/lighting-import-spec.md).
> **Remaining gap:** when the artist used an external `.map` palette, only the near-grey in-header anchors exist,
> so those scenes' exact surface *hue* isn't recoverable (kept neutral rather than guessed) — the documented
> permanent approximation. Fog (DepthCol/DynFog) is parsed but not yet applied (opaque trackbar math).

## Context

Mandelbulb3D (thargor6/mb3d, Delphi) is the de-facto 3D-fractal authoring tool with thousands of
shared `.m3p`/text scenes. Importing them into GMT is high-value, but three facts shape the design:

1. **GMT's same-named formulas do NOT equal MB3D's.** The audit found GMT Mandelbulb is colatitude-based
   while MB3D "Integer Power" is latitude-based; Quaternion has extra cross-terms; Tricorn flips a sign;
   only Amazing Box matches (and only at `paramD=1`). Mapping by name silently produces a *different*
   fractal. Real scenes are also overwhelmingly **hybrids** — a per-iteration weave of 2-6 formula slots.
2. **MB3D's external formulas (~457) ship as compiled x86/x87 machine code** in `[CODE]` blocks, not
   source. The bundled `.m3f` source comments are frequently stale/wrong (confirmed with the user). So the
   *only* trustworthy source of a `[CODE]` formula's math is the machine code itself.
3. The user's standing rule: **deterministic translation always wins over AI.** The AI formula kit exists
   as a narrow fallback; the default path for a known format must be exact transpilation, and every place
   GMT's math diverges from MB3D's must be *recorded* (the discrepancy ledger) so GMT can be fixed later —
   not silently papered over.

The hard question was the `[CODE]` wall. Options:

- **Skip external formulas; import only the ~5 intern formulas.** Rejected — almost no real scene is pure-intern.
- **Hand-port the 457 `[CODE]` formulas from the `.m3f` source comments.** Rejected — the comments are stale,
  and 457 is infeasible by hand.
- **Feed `[CODE]` to the AI kit.** Rejected — violates the deterministic rule and can't be verified.
- **Decompile the x87 machine code to GLSL.** Chosen. x87 is a stack machine; a `[CODE]` formula is a
  short straight-line `procedure(var x,y,z,w; PIteration3D)` — tractable to translate symbolically.

## Decision

**A. Transpile from MB3D's actual math, never from name-equivalence.** Intern formulas #0-#4 are
hand-transpiled from `CustomFormulas.pas`; external formulas are decompiled from `[CODE]`. Divergence from
GMT's same-named formula is logged in the ledger, not reconciled by substitution.

**B. Fuse hybrids, don't pick one.** `buildWeaveSequence` ports MB3D's `doHybridPas` cursor to a compile-time
slot-order LUT; `emitFusedHybrid` emits ONE `FractalDefinition` whose loop body switches on the iteration
index `i`. Single-slot scenes get parametric uniforms+sliders (`bindOptions`); multi-slot scenes bake
option literals (`packConstBuffer`). DE settings map to `quality` via `mapDEMeta`.

**C. Decompile x87 → GLSL, and gate every shipped formula behind an independent numeric cross-check.**
The decompiler (`plans/mb3d/decompiler/decompile.mjs`) models the FPU stack as mutable `f0..f7`, one
statement per instruction, with data-dependent compare/swap branches becoming GLSL `if`s. The correctness
guarantee is `xcheck.mjs`: a **second, independent** numeric x87 interpreter runs the raw bytes and is
compared to the decompiled GLSL on random inputs. `generate-library.mjs` emits ONLY formulas that pass —
`decompiled-formulas.ts` is verified-faithful by construction. Unhandled opcodes (control flow, SSE2) are
flagged and the formula is *skipped*, never silently mistranslated.

The cross-check has teeth: it caught the real `fcomp`-pop/`fsub` "cut" bug (the compare pops `st0` before
the subtract addresses the post-pop stack — 6000/12000 mismatches until fixed), which had been rendering a
"scraggly mess" instead of a clean Menger sponge.

## Consequences

- **62 faithful formulas at ship** (5 intern + 57 cross-check-verified `[CODE]`): IFS/Menger/Sierpinski,
  affine transforms (`_Rotate`/`_Abs*`/`_Flip*` — these unlock many *hybrids*), inversions, dynamical systems.
- **Generated artifact is committed; the generator needs the external clone.** `decompiled-formulas.ts` is
  in-repo (the app uses it); regenerating it needs the MB3D clone + `capstone-wasm` (see design doc).
  Tooling lives in `plans/mb3d/decompiler/` as reference, not a CI step (yet).
- **Coverage ceiling = the decompiler.** ~367 `[CODE]` formulas use control flow (internal IFS loops) and
  ~445 are SSE2-compiled — both UNHANDLED. These are the named next unlocks; the cross-check ensures
  expanding the decompiler can't regress what already ships.
- **Camera/lighting/colour are not imported** — only the formula + params. The user reframes; this was
  explicitly deprioritized ("what matters is the fractals").
- **The discrepancy ledger is now a live worklist for fixing GMT's own formulas** to match the reference math.
- `mapFormula.ts`/`mapScene.ts` (the first, name-equivalence attempt) are superseded and slated for deletion.
