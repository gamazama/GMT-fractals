# ADR-0139: Cook-Torrance is the Direct specular model; Blinn-Phong stays for the Fastest preset and for scenes authored under it

> **Update 2026-10-13 (later the same day; the Fast tier's model changed, the rest of the decision
> unchanged):** The Fastest preset no longer runs the legacy Blinn-Phong. It runs a third model,
> `specularModel` 2, a Fresnel-weighted Blinn-Phong (grep `getLightingPBRFastFresnel` in
> `engine-gmt/shaders/chunks/lighting/pbr.ts`; the tier is still grep `label: 'Fast'` in
> `engine-gmt/types/viewport.ts`). The legacy Blinn-Phong (0) is now kept for one thing only: scenes
> authored under it. Wherever this record says the Fastest preset uses Blinn-Phong — the title, and
> item 1 of the Decision — read the Fresnel-weighted model. Owner's call, on these measurements
> (default Mandelbulb, 1280×720, RTX 5070 Ti, ANGLE d3d11, GPU timer queries):
>
> - **The legacy model's speed advantage exists only while moving.** Under Fastest: 0.631 ms against
>   Cook-Torrance's 0.692 (+9.7%). With the camera stopped and the frame accumulating the two are
>   level (0.676 / 0.679). The "+9% on the default Mandelbulb while moving" in the Context above is
>   that same gap at boot settings.
> - **The highlight is not where the time goes.** A Fresnel-weighted Blinn-Phong written the obvious
>   way cost the same 9% as Cook-Torrance. Bisected by editing the compiled shader's text one change at
>   a time (`debug/scratch/spec-bisect.mts`): tinting the highlight by F0 and giving the lobe GGX's
>   peak are free; weighting the diffuse by anything that depends on the albedo, before or inside the
>   light loop, is the whole 8–10%; a scalar weight there is free; and the same albedo-dependent
>   weight applied after the loop is free. One vec3 multiply per lit pixel cannot cost a tenth of the
>   frame as arithmetic — it is how the program compiles, and the mechanism was not found.
> - **So the model sums the lights with no surface colour in the loop and applies the albedo once, in
>   the return.** That shape is load-bearing; the note on the function says so. The same
>   rearrangement of Cook-Torrance itself did not recover the time, which is why this is a third
>   model and not a faster Cook-Torrance.
> - **What it measures:** moving, 0.626 ms under Fastest (legacy 0.631, Cook-Torrance 0.692) and
>   0.861 at boot settings (0.859 / 0.924). Accumulating it is 1.5% (Fastest) to 3.6% (boot settings)
>   slower than both. Cold compile +10 ms over the legacy model (not significant, paired n = 7)
>   against Cook-Torrance's +57.
> - **How close it sits to Cook-Torrance:** over the lit pixels of 14 scenes, exposure 0 to −8%
>   (within 2% on 12; −8% on Cuboctahedron and on the owner's test scene), brightest tenth −4% to
>   +3%. The legacy model on the same scenes: exposure −12% to +298%.
>
> What this does to the Consequences below. *"The Fastest preset changes the look of a converted
> scene"* no longer holds: the converted default Mandelbulb under Fastest is 2% under Cook-Torrance,
> not 37% over. *"Fastest's model does not outlive the scene"* still holds — picking another built-in
> formula returns to Cook-Torrance — but it now costs the ~9% while moving and no change of look.
> New: no quality preset selects the legacy model at all, and `npm run test:migrations` section [10]
> asserts that. Limits of the evidence: one scene on one GPU (Apollonian's default scene was too
> noisy to read in this harness), nothing measured on mobile, and `test:shader` was not run.


- **Status:** Accepted
- **Date:** 2026-10-13
- **Relates to:** ADR-0079 (the Shader Compiler profile seam — the quality presets and tiers this
  adds a tier to), ADR-0138 (found in the same run of work).
  Code: `engine-gmt/features/lighting/index.ts` (grep `specularModel`, `DEFAULT_LIGHTS`),
  `engine-gmt/shaders/chunks/lighting/pbr.ts` (grep `getLightingPBRSimple`, `getLightingPBRFull`),
  `engine-gmt/types/viewport.ts` (grep `label: 'Fast'`), `app-gmt/migrations.ts` (v10),
  `engine-gmt/formulas/*.ts` (each default preset's `specularModel` and light intensities),
  `engine-gmt/utils/mb3d/emitFusedHybrid.ts` (grep `specularModel: 0`),
  `engine-gmt/features/fragmentarium_import/workshop/param-builder.ts`.
  Guard: `npm run test:migrations` (section [10]).
- **Number:** 0133–0137 exist only on the unmerged deep-zoom worktrees; this takes the next free one.

## Context

Direct mode has two specular models, chosen at compile time by `lighting.specularModel`.

- **Blinn-Phong** (0, the default until now) reflects the highlight at full strength: its tint is
  white for a non-metal, with no Fresnel weighting.
- **Cook-Torrance** (1) weights the highlight by Fresnel — 4% at normal incidence for a non-metal —
  which is also what the path tracer does.

So at the same settings Blinn-Phong's specular is several times Cook-Torrance's (6.8× on the scene
that started this, Reflectivity 2, Roughness 0.6), and at a moderate roughness its lobe is wide
enough to veil the whole lit side in white. The owner's report was that Direct looked washed out
next to the path tracer; measured colourfulness on that scene was 0.45 on Blinn-Phong, 0.86 on
Cook-Torrance, 0.83 path traced. The Reflections feature, the first suspect, contributed nothing.

Two facts kept this from being a one-line default change:

1. **Which model a user was on was an accident.** The param defaulted to Blinn-Phong, the quality
   tiers named Cook-Torrance, and tier overrides are applied only when a preset is picked, never at
   boot. A fresh boot ran Blinn-Phong under a "Balanced" label defined as Cook-Torrance; picking any
   preset flipped it; 44 of the 50 built-in formula presets did not say, five said Blinn-Phong and
   one Cook-Torrance.
2. **Cook-Torrance is not free.** Cold compile +53 ms and +86 ms on about 2.7 s (paired, n = 7).
   GPU time per 1280×720 frame: +0.5% on a heavy scene (14.2 ms), nothing measurable on the owner's
   test scene, and +9% on the default Mandelbulb while moving (0.86 → 0.92 ms). The owner's call:
   that last number matters for audio-driven and live use, so Blinn-Phong is not removed.

## Decision

**Cook-Torrance is the model.** `lighting.specularModel` defaults to 1. Blinn-Phong remains
compiled-in-on-demand for exactly two things:

1. **The Fastest quality preset.** A new lighting tier, `Fast`, sits between `Preview` and
   `Path Traced` and is the only tier that selects Blinn-Phong; only `Fastest` uses it. (Mobile
   boots through `Fastest`, and so does GPU-crash recovery.)
2. **Scenes authored under it.** A file that names the model keeps it — and saves, PNGs, gallery
   items and share links have carried the whole lighting slice for as long as the param has existed.
   Migration v10 covers the rest: a preset that sets up lights, a lighting slice or a materials
   slice but names no model is pinned to Blinn-Phong. A preset with nothing of its own to preserve
   takes the default.

**The built-in default scenes are converted**: each names Cook-Torrance, and its lights are
multiplied by the factor that held its exposure. The factor was measured per scene
(`debug/scratch/spec-convert-probe.mts`): render under Blinn-Phong, switch to Cook-Torrance, and
solve for the light scale at which the log-average luminance of the pixels the lights reach matches.
Scenes within 3% unscaled keep their lights. Factors run 0.86–2.34, typically 1.1–1.5; the default
Mandelbulb's is 1.47 and it then measures +0.1% exposure, −0.4% mean, −1.7% in its brightest tenth.
The default light rig (`DEFAULT_LIGHTS`) is multiplied by 1.11, the factor for default materials,
so a scene that brings no lights keeps its exposure too. The Formula Workshop's generated preset
names Cook-Torrance with the same 1.11.

**Mandelbulb3D imports keep Blinn-Phong** when they carry the scene's own lights: MB3D's highlight
is a Phong one and the importer's light and material mapping was calibrated against Blinn-Phong.

## Consequences

- **What a light scale can and cannot carry across.** It restores exposure. It does not restore a
  look that *was* the unweighted highlight: on scenes with high Reflectivity and low Roughness the
  converted picture is matte where it was glossy and its colours are fuller (the brightest tenth of
  the lit pixels is 20–45% dimmer on TruncatedIcosahedron, AmazingBox, MengerAdvanced, Borromean).
  Reflectivity tops out at 2 and the gap is larger than that, so no slider setting closes it.
- **Two built-ins are held out**: BoxBulb and Tetrabrot name Blinn-Phong and keep their lights.
  Their pictures moved 0.8 stops per pixel on average once exposure was matched (the next worst is
  0.34), and BoxBulb needed lights ×3.45 and gained a hot spot. They want retuning by eye.
  `test:migrations` names both; converting one means removing it from that list.
- **The Fastest preset changes the look of a converted scene.** Blinn-Phong on the converted
  default Mandelbulb is 37% brighter (exposure; +31% mean) than Cook-Torrance on it, and whiter.
  Before this change a scene was lit for Blinn-Phong and every preset except the boot state showed
  it on Cook-Torrance, darker; the mismatch has changed sides, not appeared.
- **Fastest's model does not outlive the scene.** Tier overrides are one-shot store writes, and a
  built-in preset names Cook-Torrance, so picking another built-in formula while on Fastest switches
  back to Cook-Torrance with the label unchanged. Every tier-controlled setting already behaves this
  way when a scene names it. The alternative — built-ins that name no model, so the current one
  carries over — was rejected: after opening one old Blinn-Phong scene, every formula picked
  afterwards would then render on Blinn-Phong with Cook-Torrance lighting.
- **Sparse presets on the formula picker inherit the current model.** `setFormula` writes the
  current compile-time settings into a preset that names none before migrations run (grep
  `Preserve compile-time engine params` in `store/engineStore.ts`), so a Workshop formula saved
  before this change renders on whatever model is live — on Cook-Torrance, darker than it did
  (default materials lose 11–14% unscaled; that rig itself was not measured). Loaded as a file it is
  pinned by v10 and unchanged.
- **Benchmarks of the default scene move.** `debug/bench-shader-refs/GMT_Mandelbulb_v1.png` was
  captured on the old preset; a `bench:shader` run now differs from it, and frame-time baselines for
  the default scene carry the model's cost.
- Formula thumbnails (`public/thumbnails/`) were rendered under Blinn-Phong and are not regenerated;
  exposure matches, gloss on the scenes listed above does not.
