# ADR-0049: Two independent registries (FractalRegistry, NodeRegistry); no cross-reference at type level

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/engine/FractalRegistry.ts`, `engine-gmt/engine/NodeRegistry.ts`, `engine-gmt/formulas/Modular.ts`

## Context

GMT has two categories of registry-backed entries:

- **Whole formulas** (`FractalDefinition`) — consumed by `ShaderFactory.setFormula`,
  the loading-screen tile, the GMF load/save, the Workshop importer. 42
  native formulas + 5 legacy aliases + N runtime imports.
- **Modular-graph operator nodes** (`NodeDefinition`) — consumed by
  `compileGraph` ONLY when the active formula is `'Modular'`. 25 node types
  (Mandelbulb, BoxFold, SphereFold, Abs, Mod, Rotate, Scale, Translate,
  Twist, Bend, SineWave, Union, Subtract, Intersect, SmoothUnion, Mix,
  Sphere, Box, PlaneFold, MengerFold, SierpinskiFold, Custom, Note,
  IFSScale, AddConstant, AmazingFold).

Modeling them as one polymorphic registry would force a shared base type
and cross-domain leak: a `NodeDefinition.glsl(ctx)` builder is invoked by
the graph compiler with a `GLSLContext`, whereas a `FractalDefinition.shader.function`
is a static GLSL string spliced into the top-level shader by the factory.

Alternatives considered:

- **Single `EntityRegistry<T>` parameterised by kind.** Avoids two singletons
  but adds a type parameter to every consumer for no semantic gain.
- **Nest nodes under formulas (`Modular.shader.nodes`).** Tight coupling;
  the Modular formula would own the node catalog and other formulas couldn't
  reuse the nodes for testing. Rejected.

## Decision

Two singletons:

- `registry` at `engine-gmt/engine/FractalRegistry.ts:34` — exports the
  `FractalRegistry` class (`register`, `registerAlias`, `get`, `getAll`,
  `getIds`).
- `nodeRegistry` at `engine-gmt/engine/NodeRegistry.ts:58` — exports the
  `NodeRegistry` class (`register`, `get`, `getAll`, `getGrouped`).

`FractalDefinition` does NOT know about `NodeDefinition`. The bridge is the
`'Modular'` formula whose shader strings are empty placeholders
(`engine-gmt/formulas/Modular.ts:13-18`); the shader factory and CoreMath
dispatch on `id === 'Modular'` to splice graph-compiled GLSL into the
`formula_Modular()` slot.

Node registration site lives OUTSIDE this subsystem in
`engine-gmt/data/nodes/definitions.ts` (owned by g09-modular-graph). The
load-order glue is the bare side-effect import at
`engine-gmt/utils/GraphCompiler.ts:5`:

```ts
import '../data/nodes/definitions'; // Ensure registry is populated
```

This guarantees any compile path triggers node registration.

## Consequences

- Owners of `g03-formula-registry` and `g09-modular-graph` can evolve
  independently. Adding a new node type requires touching
  `engine-gmt/data/nodes/definitions.ts` and `engine-gmt/types/graph.ts`
  (`NodeType` union), NOT `FractalRegistry`.
- Any future graph-driven formula id (other than `'Modular'`) must update
  the shader factory's intercept condition and CoreMath's special-casing.
  Today: one string compare at `engine-gmt/features/core_math.ts:157`. Adding
  a second graph-driven formula would need the intercept abstracted.
- Direct shader-string consumers (e.g. GMF emit) MUST guard against
  `id === 'Modular'` or they'll emit an empty `<Shader_Function>` block.
  `engine-gmt/utils/FormulaFormat.ts:178` does this check explicitly.
- `nodeRegistry.getGrouped()` is the Modular-tab palette's category
  source; node `category` is a typed string union (`'Fractals' | 'Transforms'
  | 'Folds' | 'Primitives' | 'Combiners (CSG)' | 'Utils' | 'Distortion'`)
  enforced at definition time.
