# ADR-0098: The backdrop IS the sky — Solid sky source, Sky Visibility = brightness

**Status:** Accepted — 2026-07-10. Branch `feat/weave-core`. Owner-designed model ("we need sky to
be either solid, gradient or image; sky visibility is for controlling the brightness of the
visible sky"), replacing the fallback rule ADR-0097's UX updates had been documenting around.

## Context

The Direct-path background had a hidden two-state rule: with `uEnvBackgroundStrength > 0` the env
map rendered as the backdrop, else the backdrop fell back to the flat `uFogColor` — even with fog
disabled. That coupling produced a run of owner-reported UX bugs (Background/Fog Color hidden
while controlling the visible backdrop, BG Visibility described as "0 = black" when it wasn't,
gated-but-live sky source controls) that were patched with labels and visibility fixes, but the
underlying model stayed confusing. The path tracer, notably, never had the fallback — its primary
miss is `sampleMiss · uEnvBackgroundStrength` (0 → black).

## Decision

**One background: the sky.** Three sources, one brightness dial:

- `materials.envSource` gains **Solid (2.0)** alongside Gradient (1.0) and Sky Image (0.0).
  `GetEnvMap` returns `uFogColorLinear` for Solid **at its first exit** — so a solid sky
  automatically works as a uniform dome light, appears in reflections and env fills, and feeds
  `fogRadiance`, all through the one seam.
- **Sky Visibility (`uEnvBackgroundStrength`) is a plain brightness multiplier** on the visible
  sky. 0 → black backdrop. The Direct miss path is now one branch
  (`bgCol = mix(GetEnvMap(rd)·visibility, fogRadiance(rd), fogIntensity)`), matching the PT
  semantics that already existed. The atmosphere post-process distance fog becomes geometry-only
  (miss pixels are fogged once, at bgCol composition — the old else-branch double-covered the
  retired fallback).
- **One colour param, two contextual homes.** `atmosphere.fogColor` (key/uniform unchanged) is
  the Solid sky's colour AND the flat colour fog fades toward at Sky Tint < 1. The Scene panel
  surfaces it as **'Sky Color'** in Background & Sky when the source is Solid, and as
  **'Fog Color'** after the fog block otherwise — via manifest `whitelistParams` +
  `labelOverrides` (a new generic field on the feature panel item) + `showIf` on
  `materials.envSource`. One visible home at a time; for Solid skies "fog fades toward the sky
  colour" holds by construction.

**Migration (app-gmt v5, `solid-sky-backdrop`):** scenes that showed a coloured flat backdrop the
old way (`envBackgroundStrength ≈ 0` AND non-black `fogColor`) convert to `envSource: Solid`,
`envBackgroundStrength: 1` — but **only when `envStrength ≈ 0`**: the source is shared, and
swapping a lit Gradient/Image dome to Solid would change the scene's lighting.

## Consequences

- The accepted casualty: **"non-black flat backdrop + Gradient/Image dome lighting" is no longer
  expressible** (owner-approved trade). Such scenes keep their lighting and render a black
  backdrop after migration. Black-backdrop-plus-env-lighting — the dominant fractal look — is
  unchanged (visibility 0 → black).
- Solid skies gain capabilities for free: uniform-colour dome lighting, solid-colour reflections,
  coherent fog tinting.
- Default scenes are bit-identical (default fogColor is black; visibility default 0 rendered
  black-ish before via the black fallback).
- The procedural no-env backdrop gradient (`safeFog + 0.01 → safeFog by |rd.y|`) is retired with
  the fallback branch.
- PT and Direct now agree on Sky Visibility semantics.
- UI: Solid shows Sky Color + Visibility + Environment Light + Source; Gradient/Image swap the
  colour picker for their own sub-controls and surface Fog Color beside the fog block instead.
