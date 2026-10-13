# ADR-0138: A Sphere light's distance law is the light's own Falloff, in both render modes

- **Status:** Accepted
- **Date:** 2026-10-13
- **Relates to:** ADR-0074 (area-light shadows fold into one march), ADR-0093 (its 2026-10-13 update:
  the path tracer's shadow threshold, found in the same investigation).
  Code: `engine-gmt/shaders/chunks/pathtracer.ts` (grep `sphereLightApparentRadius`,
  `sphereLightConeExtent`, `sphereCenterDist`), `engine-gmt/shaders/chunks/lighting/pbr.ts` (Direct's
  light loop — a Sphere is a Point at its centre), `engine-gmt/types/graphics.ts` (grep
  `unifiedFalloff`), `engine-gmt/features/lighting/utils/lightMenuUtils.ts`, `app-gmt/migrations.ts`
  (v9).
  Guard: `npm run test:migrations` (section [9]).
- **Number:** 0133–0137 exist only on the unmerged deep-zoom worktrees; this takes the next free one.

## Context

A light's distance behaviour is a user setting: the Falloff Curve (Quadratic, 1/d²; or Linear) and
the Range (0 = no fade). Direct mode applies it to Point and Sphere lights alike — it shades a Sphere
as a Point at its centre.

The path tracer applied it too, and then a second fade on top for Sphere lights only. It sampled a
point on the sphere's surface and divided the power by the surface area; the comment said that area
cancelled against the sampling PDF, "making sphere-light contributions match a
point-light-with-falloff at the same intensity". Only the area cancels. The PDF's d²/|cos| does not,
so the contribution carried a built-in power·|cos|/d² — about power / (2·d²) — whatever the light's
Falloff said.

So the same Sphere light read differently in the two modes: about an eighth as bright in the path
tracer at d = 2, and 5.8× brighter in a close-up measured at d ≈ 0.3. The Sphere power slider had
been stretched to 0–10000 to cope with the first of those.

## Decision

**One distance law: the light's Falloff Curve and Range, for Point and Sphere, in Direct and Path
Tracing.** The sphere contributes shape only — a penumbra from its real extent, a highlight on glossy
surfaces.

- NEE samples a direction uniformly inside the cone the sphere subtends and aims the shadow ray at
  the point where it meets the sphere. The radiance that makes the unoccluded total equal the light's
  power under its falloff is `power · att / solidAngle`; it cancels against `1/pdf`, so the
  contribution is the Point-light term. `att` is taken from the centre distance, as Direct takes it.
- The bounce-ray light hit uses the same radiance and `pdf = 1 / solidAngle`, so the two MIS halves
  sum to one.
- **Apparent-radius cap.** Closer than two radii, the light is treated as a sphere of radius
  `distance / 2` (never wider than a 30° half-angle). Without it a surface inside the light's radius
  is lit only from the sphere's far inner wall, which its own surroundings occlude: measured 0.004
  against a Point light's 0.046 at radius 0.5 in a close-up, and 0.5 is the radius a new Sphere light
  is given. NEE, the bounce-ray hit test and the env-NEE blocker all read the radius from
  `sphereLightApparentRadius`. Owner accepted the cap, 2026-10-13.
- Switching a light to Sphere keeps its Falloff and Range.

**No second model.** A first version of this change kept the old path-traced behaviour alive as a
per-light `inverseSquare` flag with a "Sphere Brightness" menu. Rejected by the owner the same day:
lights already have none / linear / inverse-square as their falloff setting, and a parallel choice
beside it is a second answer to a question the light already answers.

**Old path-traced scenes are converted, not preserved exactly.** Migration v9 rewrites each Sphere
light of a scene that was saved path traced into the one model: Quadratic falloff, Range = 5 radii
(widened if the Power would otherwise pass the slider ceiling), and Power rescaled so the far field
equals the old power / (2·d²). A light that already had a falloff of its own had two fades multiplied,
which one curve cannot express; its own falloff is folded into the Power at the distance from the
light to the surface under the screen centre — the one scene distance a preset records. Lights whose
Power or falloff is animated are left alone. Scenes saved in Direct never showed the extra fade and
are not rewritten.

`LightParams.unifiedFalloff` marks a Sphere light as already handled. It exists only because saves
do not record which migrations ran; without it the rewrite would compound on every load. Anything
that makes a light a Sphere must set it (today: the light menu).

## Consequences

- Measured on the scene that started this (640×441, 256 samples, mean scene-linear luminance, same
  settings for both lights): Sphere 0.0466 against Point 0.0463 with shadows, 0.0520 against 0.0525
  without; radius 0.002 to 0.07 moves it by 2%. With the converted light's short Range and large
  Power the Sphere reads about 3% under the Point (0.2556 against 0.2625) — the firefly clamp
  trimming the bounce-ray half of the MIS pair close to the light.
- Conversion fidelity, same scene loaded through the migration: 0.1179 after against 0.1180 before
  as saved, 0.2556 against 0.2553 with Shadow Tolerance 1. The migration test holds the conversion
  to the law itself: within 2% from four radii out, within 3% at the subject for a light with its
  own falloff.
- A converted light's numbers look unlike what the user typed — a short Range and a large Power —
  because they now carry a fade that used to be invisible.
- A converted light with its own falloff is right at the subject and drifts either side of it:
  dimmer nearer the light, brighter beyond.
- A new way to create a Sphere light that forgets `unifiedFalloff` yields a light that is rewritten
  on its next load. The type says so at the field.
