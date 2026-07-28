---
paths:
  - "engine-gmt/formulas/**"
  - "engine-gmt/engine/FractalRegistry.ts"
  - "engine-gmt/utils/GraphCompiler.ts"
---

# Formula registry + modular graph

Read first: JSDoc on `engine-gmt/engine/FractalRegistry.ts` and
`engine-gmt/formulas/index.ts` (FractalDefinition, alias drift, the `FormulaType`
union); JSDoc on `engine-gmt/utils/GraphCompiler.ts` (DCE + topo-sort,
`uModularParams` slots).

Decisions: ADRs 0048-0049 (registry), ADRs 0050-0051 (graph),
ADRs 0089-0091 (WeaveSpec core), ADR-0092 (faithful marcher).

## Watch out

- **Alias drift.** A formula reachable under two names that diverge is the classic
  failure here. Check the registry and the `FormulaType` union together.
- **WebGL2 has no `frexp` / `ldexp`.** Use `log2` / `exp2` workarounds — this bites
  every time someone ports precision code from a CPU reference.
- Deep-zoom precision work: the ~1e-30 wall is the double-double view-center, not
  the iteration math. ADR-0065 (colour-square fixes) and ADR-0066 (minibrot-nucleus
  reference) cover the known glitches.

## Guards

```
npm run test:compat        # iterates the LIVE registry (barrel + registerFeatures):
                           # capabilities present, exactly one shape: token, params array
npm run smoke:engine-gmt   # boots app-gmt.html end-to-end; asserts a lit Mandelbulb pixel
npm run test:baseline      # native config sweep — real shader compiles per formula
npm run test:hybrid        # graph/hybrid half of this rule
npm run test:weave-sweep
npm run smoke:deep-zoom-orbit
npm run smoke:deep-zoom-la
npm run smoke:deep-zoom-nucleus
```

**Do NOT use `smoke:formula-switch` or `smoke:fractal-kind` here.** They are
green and useful, but they guard sibling apps, not this rule's scope:
`smoke:formula-switch` drives `fractal-toy.html` and exercises fractal-toy's own
`fractal-toy/renderer/formulaRegistry.ts` (two demo formulas — fractal-toy imports
nothing from `engine-gmt/`), and `smoke:fractal-kind` drives `fluid-toy.html` and
only round-trips fluid-toy's `julia.kind` DDFS param. Neither one loads
`engine-gmt/engine/FractalRegistry`, so neither can fail on a change here.

The deep-zoom smokes are CPU-only tests of `engine/fractal/deepZoom/*`
(`computeReferenceOrbit` and friends) — they cover the "Watch out" precision
notes above, not the registry.