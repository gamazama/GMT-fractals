---
source: engine-gmt/utils/GraphCompiler.ts
lines: 194
last_verified_sha: bc26a7dfda59a03cfc74ab8d721a302b702f7458
additional_sources:
  - engine-gmt/utils/graphAlg.ts
audited: 2026-05-20T09:17:31Z
audited_by: claude-opus-4-7
public_api:
  - compileGraph
  - updateModularUniforms
  - hasCycle
  - topologicalSort
  - pipelineToGraph
  - isStructureEqual
  - isPipelineEqual
depends_on:
  - g03-formula-registry
  - g05-engine-gmt-features
---

# engine-gmt / modular-graph

GraphCompiler turns a Modular pipeline (topologically sorted `PipelineNode[]` + `GraphEdge[]`) into the GLSL body of `formula_Modular()`, and produces a matching flat `Float32Array` of per-frame parameter slots so that slider drags update uniforms without triggering a shader recompile. `graphAlg.ts` provides the cycle check, topological sort, pipeline↔graph conversion, and structural / param-level equality helpers used by the store and the FlowEditor.

This module doc captures the current code-level API and invariants. The user-facing reference (node catalog, FlowEditor UX quirks, preset bundles) lives in `docs/gmt/03_Modular_System.md` and remains the canonical product doc — see "Historical context" below for the cross-link.

## Public API

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `compileGraph` | `(sortedNodes: PipelineNode[], edges: GraphEdge[]) => string` | Emit the GLSL body of `formula_Modular(inout vec4 z, inout float dr, inout float trap, inout float distOverride, vec4 c, int i)`. (`engine-gmt/utils/GraphCompiler.ts:34`) |
| `updateModularUniforms` | `(pipeline: PipelineNode[], edges: GraphEdge[], uniformArray: Float32Array) => void` | Zero the supplied array and pack one float per allocated `uModularParams[N]` slot, in the exact order the compiler allocated them. (`engine-gmt/utils/GraphCompiler.ts:162`) |
| `hasCycle` | `(nodes: GraphNode[], edges: {source, target}[]) => boolean` | DFS with `visited` + `recStack` over an adjacency map; back-edge ⇒ true. (`engine-gmt/utils/graphAlg.ts:7`) |
| `topologicalSort` | `(nodes: GraphNode[], edges: {source, target}[]) => PipelineNode[]` | Kahn's algorithm with alphabetical tie-break on the ready queue; strips `position`. (`engine-gmt/utils/graphAlg.ts:42`) |
| `pipelineToGraph` | `(pipeline: PipelineNode[]) => FractalGraph` | Auto-wire a linear visual chain `root-start → n[0] → … → n[k-1] → root-end` at `x=250, y=150+i*200`. (`engine-gmt/utils/graphAlg.ts:95`) |
| `isStructureEqual` | `(a: PipelineNode[], b: PipelineNode[]) => boolean` | Recompile-trigger diff — compares id/type/enabled, `JSON.stringify(bindings ?? {})`, and `condition.active`. Param values and `condition.mod/rem` are deliberately excluded. (`engine-gmt/utils/graphAlg.ts:115`) |
| `isPipelineEqual` | `(a: PipelineNode[], b: PipelineNode[]) => boolean` | Length check then full `JSON.stringify` equality. (`engine-gmt/utils/graphAlg.ts:130`) |

Two non-exported helpers are shared by both `compileGraph` and `updateModularUniforms` and are central to the invariant story below:

- `buildInputsByTarget(edges)` — `Map<targetId, GraphEdge[]>` built once per call. (`engine-gmt/utils/GraphCompiler.ts:8`)
- `buildLiveNodeIds(inputsByTarget)` — Set of all node IDs reachable upstream from `root-end`, excluding the two roots. (`engine-gmt/utils/GraphCompiler.ts:18`)

## Architecture

### Compile path (`compileGraph`)

1. **Side-effect registry priming.** The compiler imports `nodeRegistry` and then performs a bare side-effect import of `../data/nodes/definitions` so every `NodeDefinition` is registered before any compile can run. (`engine-gmt/utils/GraphCompiler.ts:4-5`)
2. **Dead-Code Elimination.** `buildLiveNodeIds` walks backward from the synthetic `root-end` ID via a stack (LIFO ⇒ depth-first), recording every reachable ID except the two roots. The supplied `sortedNodes` is then filtered through this set, preserving toposort order. (`engine-gmt/utils/GraphCompiler.ts:18-32, 36-41`)
3. **Empty-graph fallback.** With zero active nodes the compiler returns an identity body: `z.xyz += c.xyz; r = length(z.xyz); trap = min(trap, r);`. (`engine-gmt/utils/GraphCompiler.ts:43-51`)
4. **Graph Init prelude.** Declares `v_start_p = z.xyz`, `v_start_d = 1000.0` (sentinel above the `distOverride` window), `v_start_dr = dr`, plus mutable `v_curr_*` carriers. (`engine-gmt/utils/GraphCompiler.ts:53-62`)
5. **Per-node emission.** For each active node:
   - Build `varName = "v_" + node.id` with non-alphanumerics stripped, register `varMap[node.id] → varName`. (`engine-gmt/utils/GraphCompiler.ts:69-72`)
   - Resolve two input slots from `inputsByTarget[node.id]`: edges with no `targetHandle` or `targetHandle === 'a'` feed `in1`; `targetHandle === 'b'` feeds the CSG second operand `in2`. Missing edges fall back to `v_start`. (`engine-gmt/utils/GraphCompiler.ts:74-79`)
   - Always emit the propagation triple `${varName}_p/_d/_dr` initialised from `in1` — so disabled or unknown-type nodes still pass the upstream triplet through. (`engine-gmt/utils/GraphCompiler.ts:81-84`)
   - If `node.enabled` and the registry has a definition, optionally open a conditional execution wrapper (see below), then call `def.glsl({ varName, in1, in2, getParam, indent })`. (`engine-gmt/utils/GraphCompiler.ts:86-127`)
6. **Output wiring.** The edge whose `target === 'root-end'` selects the final variable prefix; `root-start` and unknown sources both collapse to `v_start`. (`engine-gmt/utils/GraphCompiler.ts:132-138`)
7. **Epilogue.** Writes `z.xyz`, `dr`, conditionally sets `distOverride` when `final_d ∈ (-1.0, 999.0)`, then updates `trap = min(trap, length(z.xyz))`. (`engine-gmt/utils/GraphCompiler.ts:140-150`)

### Conditional execution

When `node.condition.active === true`, the compiler allocates two `uModularParams` slots up front and wraps the node body in:

```
{ int <var>_cmod = max(1, int(uModularParams[i+0]));
  int <var>_crem =      int(uModularParams[i+1]);
  if ( (i - (i/<var>_cmod)*<var>_cmod) == <var>_crem ) { … } }
```

The modulo is open-coded as subtract to avoid any `%` integer-divide compiler quirks; `cmod` is clamped to `≥ 1` at runtime. (`engine-gmt/utils/GraphCompiler.ts:90-101, 125`)

Only `condition.active` is structural — `mod` and `rem` ride the uniform array so they retune without recompile. `isStructureEqual` enforces this split. (`engine-gmt/utils/graphAlg.ts:121-125`)

### Param resolution (`getParam` closure)

For each `def.glsl()` call the compiler exposes a closure that hands out a uniform reference per requested key:

- If `node.bindings[key]` is set, return `u<bindingName>` (e.g. `uParamA`) — bound params consume no slot. (`engine-gmt/utils/GraphCompiler.ts:106-108`)
- Otherwise return `uModularParams[paramCounter++]`. (`engine-gmt/utils/GraphCompiler.ts:110-112`)
- Once `paramCounter >= MAX_MODULAR_PARAMS` (the global cap declared in `data/constants`), further requests return the GLSL literal `"0.0"` rather than throwing. (`engine-gmt/utils/GraphCompiler.ts:113`)

### Runtime packer (`updateModularUniforms`)

To keep sliders cheap, the runtime helper fills the same flat `uModularParams` array on every frame. To guarantee slot alignment with the compiler:

1. Zero the array. (`engine-gmt/utils/GraphCompiler.ts:163`)
2. Replicate DCE via `buildLiveNodeIds(buildInputsByTarget(edges))` — identical helpers, identical predicates. (`engine-gmt/utils/GraphCompiler.ts:168`)
3. Iterate `pipeline` in toposort order, skipping dead and disabled nodes (mirroring the compiler's two skip conditions). (`engine-gmt/utils/GraphCompiler.ts:170-174`)
4. If `node.condition.active`, write `max(1, round(mod))` then `max(0, round(rem))` BEFORE any node params — same order the compiler allocates. (`engine-gmt/utils/GraphCompiler.ts:177-180`)
5. Iterate `def.inputs` in declaration order; for each input, write `node.params[input.id] ?? input.default`, skipping bound params (which consume no slot in either side). (`engine-gmt/utils/GraphCompiler.ts:184-191`)
6. The internal `setP(v)` writer silently drops writes past `MAX_MODULAR_PARAMS` so the runtime cap matches the compiler's `"0.0"` fallback. (`engine-gmt/utils/GraphCompiler.ts:165`)

### Graph algorithms (`graphAlg.ts`)

| Helper | Algorithm | Notes |
|--------|-----------|-------|
| `hasCycle` | Adjacency-map DFS with `visited` + `recStack` sets. Per-node recursive `isCyclic` returns `true` on any back-edge. (`engine-gmt/utils/graphAlg.ts:7-36`) | Called by the store before `addEdge` commits. |
| `topologicalSort` | Kahn with `inDegree` map; the ready `queue` is re-`sort()`ed alphabetically each pop, then `nodes.find(n => n.id === u)` resolves the node and copies all fields except `position`. (`engine-gmt/utils/graphAlg.ts:42-87`) | Alphabetical tie-break makes compile order deterministic across runs; `find` inside the loop is O(N) per node ⇒ O(N²) overall (acceptable at current node counts). Does NOT detect cycles itself — relies on `hasCycle` gating earlier. |
| `pipelineToGraph` | Linear visual chain with synthetic edges. (`engine-gmt/utils/graphAlg.ts:95-109`) | Empty pipeline returns `{ nodes: [], edges: [] }` — no synthetic root edges emitted. |
| `isStructureEqual` | Length + per-node id/type/enabled + `JSON.stringify(bindings ?? {})` + `condition.active`. (`engine-gmt/utils/graphAlg.ts:115-128`) | Returning `false` triggers recompile in the store; returning `true` keeps the existing shader and only re-runs `updateModularUniforms`. |
| `isPipelineEqual` | Length check + full `JSON.stringify` equality. (`engine-gmt/utils/graphAlg.ts:130-133`) | Broader equality — used for change detection outside the recompile gate. |

## Invariants

1. **Slot-order parity (load-bearing).** `compileGraph` and `updateModularUniforms` MUST allocate / pack `uModularParams` slots in lockstep. Both share `buildInputsByTarget` + `buildLiveNodeIds`, walk `pipeline` in the same input order, apply the same skip predicates (`!liveNodeIds.has(node.id)` and `!node.enabled`), and treat `condition.active` as two leading slots ahead of the node's own params. Any divergence silently misaligns sliders. (`engine-gmt/utils/GraphCompiler.ts:36-41` vs `162-191`)
2. **`getParam` call order MUST equal `def.inputs` declaration order.** The compiler's `getParam` closure ignores the `key` argument when allocating array slots — it just increments a counter on each unbound call. The packer instead iterates `def.inputs` in declaration order. The two only agree because every existing `NodeDefinition` author has, by convention, written their `def.glsl()` template to call `getParam('id')` in the same sequence as their `inputs:` array. There is no test, no `console.assert`, and no comment naming this rule anywhere in the source. See "Known issues" §1. (`engine-gmt/utils/GraphCompiler.ts:104-114` vs `184-191`)
3. **The two synthetic roots are hard-coded.** `root-start` and `root-end` are string literals in three places: the DCE seed, the `varMap` pre-seed `varMap.set('root-start', 'v_start')`, and the output-edge `target === 'root-end'` lookup. Renaming requires touching all three. (`engine-gmt/utils/GraphCompiler.ts:20, 26, 65, 132`)
4. **CSG handle convention is implicit.** Only `targetHandle === 'a'`, `'b'`, or absent are recognised. Any other value silently produces neither an `in1` nor an `in2` contribution. (`engine-gmt/utils/GraphCompiler.ts:75-79`)
5. **`distOverride` window is `(-1.0, 999.0)`.** The Graph Init seeds `v_start_d = 1000.0` so non-SDF graphs naturally fall outside the window and never override the iterative DE. SDF Primitive nodes deliberately write `< 999.0` to engage `distOverride`. (`engine-gmt/utils/GraphCompiler.ts:56, 144-147`)
6. **DCE prunes silently.** Nodes not reachable from `root-end` produce no GLSL, consume no slots, and the user gets no error — a fully disconnected graph yields the empty-graph identity body. (`engine-gmt/utils/GraphCompiler.ts:18-32, 43-51`)
7. **Disabled nodes preserve variable layout but consume no slots.** A disabled node still emits the `_p/_d/_dr` propagation triple from `in1` (so downstream IDs still resolve), and the runtime packer mirrors the skip predicate so slot indices stay aligned. (`engine-gmt/utils/GraphCompiler.ts:81-87` vs `170-174`)
8. **Param overflow degrades silently.** Compiler returns the literal `"0.0"`; packer's `setP` drops writes past `MAX_MODULAR_PARAMS`. No exception, no console warning. (`engine-gmt/utils/GraphCompiler.ts:113, 165`)
9. **`topologicalSort` requires `hasCycle` to gate.** It does not detect cycles itself; passing a cyclic graph yields a partial pipeline (nodes inside the cycle drop out because their in-degree never reaches 0). The store is expected to call `hasCycle` before `addEdge` commits. (`engine-gmt/utils/graphAlg.ts:42-87`)
10. **Structural diff is `JSON.stringify`-order-sensitive on bindings.** Two semantically equivalent `bindings` objects whose keys were inserted in different orders compare unequal and trigger a recompile. (`engine-gmt/utils/graphAlg.ts:120`)

## Interactions with other subsystems

- **`g03-formula-registry`** — owns `nodeRegistry` (`engine-gmt/engine/NodeRegistry.ts`) and the `NodeDefinition` shape (`id`, `category`, `inputs`, `glsl(ctx)`). The compiler is read-only against the registry but depends on `definitions.ts` having registered before first compile (enforced by the side-effect import at `engine-gmt/utils/GraphCompiler.ts:5`).
- **`g05-engine-gmt-features`** — the CoreMath feature is the compile-time consumer: when `formula === 'Modular'` it declares `uModularParams[MAX_MODULAR_PARAMS]`, injects a `PIPELINE_REV` define keyed to the structural revision (to defeat shader cache), and calls `compileGraph(pipeline, graph.edges)` to produce the `formula_Modular()` body. The runtime consumer (`MaterialController.syncModularUniforms` or the bridge equivalent) calls `updateModularUniforms` once per frame.
- **`MAX_MODULAR_PARAMS`** is imported from `../../data/constants` (`engine-gmt/utils/GraphCompiler.ts:3`); growing the cap requires regenerating the GLSL declaration on the feature side and reverifying that no preset relies on the silent overflow.

## Known issues / Phase 2 carry-in

1. **`getParam` order is an unenforced invariant (q-117).** Investigation under `plans/doc-audit-state/survey/_followups/q-117.md` confirmed there is no assertion, test, or comment requiring node authors to call `getParam(key)` in the same order their `inputs:` array declares those keys. The contract is load-bearing for `updateModularUniforms` slot alignment — a contributor who reorders a `vec3(getParam('x'), getParam('y'), getParam('z'))` template, or appends a new `getParam` call without inserting the corresponding `inputs:` entry in the same position, silently desyncs sliders with no error. **Recommended hardening:** wrap `getParam` in DEV builds so the first call snapshots `def.inputs.map(i => i.id)` and asserts each subsequent `key` matches `def.inputs[callIndex].id`, skipping bound entries on the same predicate the packer uses. Production cost is zero behind `import.meta.env.DEV`. (`engine-gmt/utils/GraphCompiler.ts:104-114, 184-191`)
2. **`03_Modular_System.md` is silent on the runtime/compile split** (review-#5 carry-in). The published doc covers `compileGraph` but does not document `updateModularUniforms`, the shared DCE walk, or the slot-alignment contract. This module doc now captures that surface; the user-facing doc should cross-reference it.
3. **"BFS" wording in published doc is inaccurate** (survey drift table). The DCE walk uses `stack.pop()` (LIFO ⇒ DFS); reachability result is identical so this is a wording-only fix. (`docs/gmt/03_Modular_System.md:224` vs `engine-gmt/utils/GraphCompiler.ts:20-30`)
4. **`topologicalSort` is O(N²).** `nodes.find(n => n.id === u)` runs inside the pop loop. Current preset counts (< ~50 nodes) make this irrelevant, but a pipeline approaching the hundreds would feel it. (`engine-gmt/utils/graphAlg.ts:71`)
5. **Bindings-equality is JSON-string-stable, not object-equal.** Key-reorder produces spurious recompiles. (`engine-gmt/utils/graphAlg.ts:120`)
6. **Orphan-sweep candidates (survey open questions):** confirm `compileGraph` / `updateModularUniforms` have exactly one compile-side consumer (`engine-gmt/features/core_math.ts`) and one runtime-side consumer (`MaterialController.syncModularUniforms` or equivalent), and that no legacy `engine/utils/GraphCompiler.ts` exists in the engine-fork to compete. The survey flags both for future cleanup.

## Historical context

The full user-facing Modular system reference lives in `docs/gmt/03_Modular_System.md` and remains the canonical product doc for the FlowEditor UI (React Flow v11 quirks, `clientToFlow` helper, `skipNextOnNodesDelete` ref pattern, ghost-insert `setTimeout(0)` defer, module-level `persistedViewport`), the full node catalog with GLSL semantics (Mandelbulb power+phase+twist, AmazingFold = boxFold + sphereFold, MengerFold sorted-xyz swaps, SierpinskiFold diagonal reflections, IFSScale `p*scale - vec3(offset*(scale-1))`), GMF persistence shape (`graph` + `pipeline` both serialised when `formula === 'Modular'`), and the seven named preset bundles (Mandelbulb, Amazing Box, MixPinski, Menger Sponge, Kleinian, Marble Marcher, plus the tutorial `JULIA_REPEATER_PIPELINE`). This module doc does NOT supersede that reference — disposition is `minor-edits`. The fixes recommended above (BFS→DFS wording at `docs/gmt/03_Modular_System.md:224`; optional note on packer-side overflow alongside compiler-side `"0.0"`; coverage of `updateModularUniforms` and the slot-alignment contract) are tracked under Phase 2 carry-in.
