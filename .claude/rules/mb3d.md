---
paths:
  - "engine-gmt/utils/mb3d/**"
---

# Mandelbulb3D importer

Read first: [`plans/mb3d/converter-design.md`](../../plans/mb3d/converter-design.md),
then `engine-gmt/utils/mb3d/*`.

Decisions: ADR-0083, ADR-0101, ADR-0102; ADR-0086 (MB3D depth-cue / dynamic fog
becomes GMT distance fog, grep `mapFog`), ADR-0087 (a formula's `[CONSTANTS]` override
the Cp0/Cp8 abs/sign-mask decode — it changes `decompiled-formulas.ts`), ADR-0088 (the
importer turns the faithful marcher on for every real `.m3p`; superseded in part by
ADR-0092).

## What this covers

`.m3p` / text parse, hybrid weave, the x87 `[CODE]` decompiler plus its cross-check,
and the fused `FractalDefinition`. Hand-ported bit-hacking formulas live in the
`mb3dFormulaLibrary.ts` overlay. 4D-coord (`wIsCoord`) drives the DE radius and the
`c.w` julia seed.

The canonical decompiler lives OUTSIDE this repo at `H:/GMT/stuff/mb3d-decomp/`.

## Guards

```
npm run test:mb3d
npm run test:mb3d:weave
npm run check:mb3d-decompiler
```