---
paths:
  - "engine-gmt/formulas/**"
  - "engine-gmt/engine/FractalRegistry.ts"
  - "engine-gmt/utils/GraphCompiler.ts"
  - "engine-gmt/utils/graphAlg.ts"
  - "engine-gmt/engine/NodeRegistry.ts"
  - "engine-gmt/data/nodes/**"
  - "engine-gmt/store/modularSlice.ts"
---

# Formula registry + modular graph

Read first: JSDoc on `engine-gmt/engine/FractalRegistry.ts` and
`engine-gmt/formulas/index.ts` (FractalDefinition, alias drift, the `FormulaType`
union); JSDoc on `engine-gmt/utils/GraphCompiler.ts` (DCE + topo-sort,
`uModularParams` slots).

Decisions: ADRs 0048-0049 (registry), ADRs 0050-0051 (graph),
ADRs 0089-0091 (WeaveSpec core), ADR-0092 (faithful marcher), ADR-0059 (a formula
declares its capabilities from a closed vocabulary in `shader.capabilities`, reduced
against features' `requires` by `engine-gmt/engine/compat/` — the feature side is in
[`ddfs.md`](./ddfs.md)).

## Watch out

- **Alias drift.** A formula reachable under two names that diverge is the classic
  failure here. Check the registry and the `FormulaType` union together.
- **WebGL2 has no `frexp` / `ldexp`.** Use `log2` / `exp2` workarounds.
- Deep-zoom precision: the ~1e-30 wall is the double-double view-center, not the
  iteration math. ADR-0065 and ADR-0066 cover the known glitches.

## Guards

```
npm run test:modular-parity # node-only: every node def reads each input once, in
                           # order; compileGraph/updateModularUniforms slot parity per pipeline
npm run test:compat        # iterates the LIVE registry (barrel + registerFeatures):
                           # capabilities present, exactly one shape: token, params array
npm run smoke:engine-gmt   # boots app-gmt.html end-to-end; asserts a lit Mandelbulb pixel
npm run test:baseline      # native config sweep — real shader compiles per formula
npm run test:hybrid        # emits the same shaders as test:baseline (see gmt-renderer.md)
npm run test:weave-sweep
```

- **Not guards here:** `smoke:formula-switch` exercises fractal-toy's own registry and
  `smoke:fractal-kind` fluid-toy's `julia.kind`; neither loads
  `engine-gmt/engine/FractalRegistry`. The deep-zoom smokes live in
  [`deep-zoom.md`](./deep-zoom.md).
- **`test:compat:write` is the baseline WRITER, not a gate.** It regenerates the tracked
  `debug/compat-snapshot.jsonl` and exits 0 on a successful write. Read diff mode's output
  and decide the drift is correct before writing.
- **Only `test:modular-parity` guards the modular graph** (`compileGraph`,
  `updateModularUniforms`, `topologicalSort`, `pipelineToGraph`, `structureKey`), and it
  checks slot parity and the structural fingerprint, not the emitted GLSL. Every sweep
  filters out `Modular`, and `smoke:engine-gmt` boots Mandelbulb, so neither compiles a
  graph. Verify other changes here by hand.
