# ADR-0086: MB3D depth-cue / dynamic fog → GMT distance fog

**Date:** 2026-06-27
**Status:** Accepted
**Scope:** `engine-gmt/utils/mb3d/mapLighting.ts` (`mapFog` + `MB3DLightingResult.atmosphere`),
`engine-gmt/utils/mb3d/emitFusedHybrid.ts` (merge `lit.atmosphere` into the preset's `atmosphere`).
**Related:** ADR-0083 (MB3D importer), S1 fidelity pass item 3
(`plans/mb3d/sessions/S1-fidelity.md`). Maps MB3D `sDepth`/`sShadGr` (HeaderTrafos.pas:1292/1304).

## Context

Imported MB3D scenes rendered on a flat **black** background and over-lit interiors
("Hyperben2 washout"). MB3D fades distant surfaces toward a depth colour: a depth-cue
gradient toward `DepthCol2` whose amplitude is `sDepth = TBpos[4]·0.8e-6`
(HeaderTrafos.pas:1292), plus an optional dynamic fog toward `DynFog` when the gradient
`TBpos[6] ≠ 53` (the neutral point, `sShadGr = (TBpos[6]−53)·…`, :1304). These fields were
already parsed but unused, so every import dropped the scene's atmosphere — both the missing
background colour (TimeMachine's blue sky, Genetic Menger's green) and the depth recession.

GMT's fog is `col = mix(col, uFogColor, smoothstep(uFogNear,uFogFar,d)·uFogIntensity)` with
`d` the world-space ray distance (`features/atmosphere/index.ts`). With the MB3D import's
`envBackgroundStrength = 0`, fog also applies to miss rays, so it fills the black background
with the fog colour — exactly the depth-colour fade MB3D shows.

The naive 1:1 mapping (near `0.4·td`, far `2·td` clamped to the slider max 10, colour
`hasDynFog ? DynFog : DepthCol2`, intensity `0.6 / |TBpos[6]−53|·0.01`) regressed many scenes:
the `[0,10]` clamp over-fogged far scenes (TimeMachine `td=22` → surface beyond `fogFar`) and
collapsed `near≈far` on deep-zoom scenes; the default-white `DynFog`/`DepthCol2` (`#ffffff`)
washed subjects toward white (BatJorge).

## Decision

`mapFog(header, cam)` returns GMT atmosphere overrides, gated to scenes that actually authored
fog (`TBpos[4]=0` AND `TBpos[6]=53` ⇒ `undefined` ⇒ no atmosphere change, byte-identical):

- **Colour** — `DepthCol2` primary (MB3D's depth-cue background); `DynFog` overrides it only
  when genuinely authored, i.e. not the unset `#ffffff` default (≈half the scenes). Matches the
  refs: Genetic Menger's green `DynFog`, TimeMachine's blue `DepthCol2`, Ellarien's orange
  `DepthCol2` (its token dyn amplitude carries a white `DynFog`, correctly ignored).
- **Spatial** — anchored to `targetDistance` (GMT world scale), **not** clamped to the slider
  max: `near = 1.3·td` (past the subject, so bounded objects stay crisp — only their deepest
  tail fogs), `far = 5·td` (lets the background fill fully). Landscape compositions whose
  surface sweeps to the horizon (BatJorge) still fade at distance — correct atmospheric
  perspective.
- **Intensity** — dynamic fog `max(0.3, |TBpos[6]−53|·0.012)`, plain depth-cue `0.55`, capped
  `0.75`, times a **white guard**: a near-white fog colour (luminance > 0.8) is haze, not a
  scene colour, and washes contrast everywhere, so its intensity ramps `1 → 0.35` across
  luminance `[0.8, 1]`. Mid-tone colours (the actual wins) keep full strength.

The single smoothstep band approximates MB3D's full depth curve; `bFarFog` and the 2nd
dynamic-fog colour are dropped. `near`/`far`/intensity constants are **ref-calibrated**, not
source-derived (MB3D's depth fog is world-absolute, GMT's `d` is a different space).

## Consequences

- Re-cert (real GPU, 20 bundled scenes): clear wins where a ref exists — Genetic Menger now
  renders on its green background, TimeMachine on its blue sky, both matching the MB3D refs;
  the named Hyperben2 washout becomes a legible grey-atmosphere scene. Non-ref scenes gain
  correct coloured atmospheres (TreePlanet blue, MengerTrees brown). No regressions: BatJorge
  (white `DepthCol2`) is protected by the white guard; the no-fog control (Hal-Tenny) and any
  standalone/degenerate header are byte-identical (`mapFog` returns `undefined`).
- The calibration constants assume the subject sits at ≈`targetDistance`. A scene whose
  subject is far in front of / behind the orbit pivot may fog slightly early/late; acceptable
  within the single-band approximation. Re-tune `NEAR_K`/`FAR_K`/intensity against future refs.
- Residual gap to the refs on some scenes (LightBulbMoon, Ellarien) is **lighting brightness**,
  not fog — out of scope here.
