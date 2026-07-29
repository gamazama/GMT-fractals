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
npm run test:hybrid        # hybrid BOX-FOLD config, not the node graph (see below)
npm run test:weave-sweep
```

**Do NOT use `smoke:formula-switch` or `smoke:fractal-kind` here.** They are
green and useful, but they guard sibling apps, not this rule's scope:
`smoke:formula-switch` drives `fractal-toy.html` and exercises fractal-toy's own
`fractal-toy/renderer/formulaRegistry.ts` (two demo formulas — fractal-toy imports
nothing from `engine-gmt/`), and `smoke:fractal-kind` drives `fluid-toy.html` and
only round-trips fluid-toy's `julia.kind` DDFS param. Neither one loads
`engine-gmt/engine/FractalRegistry`, so neither can fail on a change here.

**The three deep-zoom smokes moved out of this block** (cycle 13). They are
CPU-only tests of `engine/fractal/deepZoom/*` (`computeReferenceOrbit` and
friends) and import nothing this rule scopes, so they could not fail on a change
here — `check:rule-guards` flagged all three. They now live in
[`deep-zoom.md`](./deep-zoom.md), which scopes that directory; nothing was
dropped. Run `deep-zoom-orbit` / `deep-zoom-la` / `deep-zoom-nucleus` from there
when touching precision code, not from here. The "Watch out" bullet above still
points at the right ADRs (0065/0066) for context.

**`test:hybrid` no longer differs from `test:baseline`** — measured 2026-07-29, so
treat the line above as one gate with two aliases. Its `--mode=` overrides write
`geometry.hybridCompiled` / `hybridComplex` / `hybridMode`, none of which any
shader-emitting code still reads (interleaved emission retired P4.5, compiled box
fold P4.7, both superseded by weave — grep `hybridComplex` in
`engine-gmt/utils/weaveMigration.ts`, which deletes the field). All 54 eligible
formulas emit byte-identical shaders in all three modes. See
[`gmt-renderer.md`](./gmt-renderer.md) for the full measurement; `test:weave-sweep`
is the successor coverage and is already in the block.

**`test:compat:write` is the baseline WRITER, not a gate — do not reach for it to
make a red `test:compat` go green.** It regenerates `debug/compat-snapshot.jsonl`,
which is tracked, and it always exits 0 on a successful write. Two recorded floors
were added on 2026-07-29 (`FORMULA_FLOOR`, `SNAPSHOT_ROW_FLOOR`) after the writer
was measured truncating that baseline to **zero bytes at exit 0** when the formula
registry shrank 55 → 7, leaving diff mode permanently green on an empty file. Both
floors now fail in both modes, so a vanished input can no longer be persisted —
but a genuine drift still can, which is the tool's job. Read the diff mode's output
first and decide the drift is correct.

**Nothing above guards the modular graph.** `test:hybrid` / `test:hybrid-adv` are
`debug/native-config-sweep.mts --mode=hybrid`, where "hybrid" means the hybrid
box-fold geometry config — and that sweep's `eligibleFormulas()` does
`.filter(def => def.id !== 'Modular')` for EVERY mode, so `test:baseline` skips
Modular too; `native-weave-sweep` likewise ("Modular — no GLSL to rewrite").
`test:compat` is node-only and explicitly exempts Modular from its shader checks.
`smoke:engine-gmt` boots app-gmt at the default Mandelbulb and asserts
`store.formula === 'Mandelbulb'`, and `core_math`'s `inject` only calls
`compileGraph` when `formula === 'Modular'` — so it proves the module parses,
never that it compiles a graph correctly.

So `compileGraph` / `updateModularUniforms` / `topologicalSort` /
`isStructureEqual` have ZERO executable coverage. Two live `@bug PRODUCTION:`
annotations in `utils/GraphCompiler.ts` and `utils/graphAlg.ts` are the direct
consequence. Verify changes here by hand, or add a node-only harness — the whole
path is pure functions with no WebGL dependency, so one is cheap.