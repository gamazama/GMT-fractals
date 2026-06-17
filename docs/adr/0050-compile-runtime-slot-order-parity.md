# ADR-0050: Compile/runtime slot-order parity via shared DCE walk

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/utils/GraphCompiler.ts` (`compileGraph` + `updateModularUniforms`)

## Context

Modular formulas (the `'Modular'` formula id with a runtime-defined node
pipeline) declare a flat `uniform float uModularParams[MAX_MODULAR_PARAMS]`
array. The GLSL compiler emits references like `uModularParams[7]` at
compile time, but slider drags must update those same indices every frame
WITHOUT recompiling — recompiles are expensive (~hundreds of ms) and would
defeat the interactive editing UX.

Two functions must agree on "which array index holds the param value for
which (node, input) pair":

- `compileGraph(sortedNodes, edges)` allocates indices when emitting GLSL.
- `updateModularUniforms(pipeline, edges, uniformArray)` packs values
  per-frame.

Any divergence between which-slot-is-which on the two sides corrupts sliders
silently. Symptoms in past bugs: dragging the "scale" slider on Node A
moved the "rotation" slider on Node B downstream.

Alternatives considered:

- **Use a Map of `(nodeId, inputId) -> sliderIndex`.** Solves alignment but
  requires the GLSL to reference uniforms by string-keyed accessor, which
  GLSL ES 3.0 doesn't support (no string indexing into arrays).
- **One uniform per node param** (`uModular_node0_scale`). Eliminates the
  alignment problem but explodes uniform count (50 nodes × 10 params each =
  500 uniforms, beyond minimum-spec uniform limits).
- **Recompile on every slider drag.** Defeats the interactivity goal.

## Decision

Both functions share two non-exported helpers in
`engine-gmt/utils/GraphCompiler.ts`:

- `buildInputsByTarget(edges)` — builds `Map<targetId, GraphEdge[]>` once
  per call.
- `buildLiveNodeIds(inputsByTarget)` — DFS-walks backward from synthetic
  `root-end` to collect reachable node IDs.

Both functions walk `pipeline` in the same input order, apply identical
skip predicates (`!liveNodeIds.has(node.id)` for dead-code elimination,
`!node.enabled` for disabled nodes), and treat `condition.active` as two
leading slots (`cmod` then `crem`) ahead of the node's own params.

For each node's own params:

- Compiler: the `getParam` closure handed to `def.glsl()` allocates by
  incrementing a counter on each unbound call (bound params consume no
  slot).
- Packer: iterates `def.inputs` in declaration order, writes
  `node.params[input.id] ?? input.default`, skipping bound inputs.

The two only agree because every existing `NodeDefinition` author has, by
convention, written `def.glsl()` to call `getParam('id')` in the SAME
sequence as their `inputs:` array.

## Consequences

- **Slot-order parity is LOAD-BEARING.** Any divergence silently misaligns
  sliders.
- **`getParam` order is an UNENFORCED invariant.** No assertion, no test
  enforces that `def.glsl()` calls `getParam(key)` in the same order as
  `def.inputs`. A contributor who reorders a
  `vec3(getParam('x'), getParam('y'), getParam('z'))` template, or appends
  a new `getParam` call without inserting the corresponding `inputs:` entry
  in the same position, silently desyncs.
- **Recommended hardening** (recorded in followup `q-117`): wrap `getParam`
  in DEV builds so the first call snapshots `def.inputs.map(i => i.id)` and
  asserts each subsequent `key` matches `def.inputs[callIndex].id`, skipping
  bound entries on the same predicate the packer uses. Production cost is
  zero behind `import.meta.env.DEV`.
- **Disabled nodes preserve variable layout but consume no slots.** A
  disabled node still emits the `_p/_d/_dr` propagation triple from `in1`
  (so downstream IDs still resolve), and the runtime packer mirrors the
  skip predicate so slot indices stay aligned.
- **Param overflow degrades silently.** Compiler returns the literal `"0.0"`;
  packer's `setP` drops writes past `MAX_MODULAR_PARAMS`. No exception, no
  console warning. Acceptable because the cap is currently generous
  (`MAX_MODULAR_PARAMS` = 64 at last check; preset complexity caps out
  around 30).
