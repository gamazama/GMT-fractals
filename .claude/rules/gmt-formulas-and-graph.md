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
npm run smoke:formula-switch
npm run smoke:fractal-kind
npm run smoke:deep-zoom-orbit
npm run smoke:deep-zoom-la
npm run smoke:deep-zoom-nucleus
```