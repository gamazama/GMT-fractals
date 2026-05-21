---
subsystem_id: g09-modular-graph
audited_at: 2026-05-20T00:00:00Z
files:
  - path: engine-gmt/utils/GraphCompiler.ts
    blob_sha: bc26a7dfda59a03cfc74ab8d721a302b702f7458
    lines_read: [1, 194]
  - path: engine-gmt/utils/graphAlg.ts
    blob_sha: 6c3d22ef5728adf1bff9d14a1844eeac6deac88c
    lines_read: [1, 133]
---

## Public API surface

- `compileGraph(sortedNodes: PipelineNode[], edges: GraphEdge[]): string` — emits the `formula_Modular(...)` GLSL function (`GraphCompiler.ts:34`).
- `updateModularUniforms(pipeline: PipelineNode[], edges: GraphEdge[], uniformArray: Float32Array): void` — packs per-frame param values into the flat `uModularParams` array, applying the same DCE walk as the compiler (`GraphCompiler.ts:162`).
- `hasCycle(nodes: GraphNode[], edges: {source,target}[]): boolean` — DFS cycle check used before edge creation (`graphAlg.ts:7`).
- `topologicalSort(nodes: GraphNode[], edges: {source,target}[]): PipelineNode[]` — Kahn-with-alphabetical-tiebreak, strips `position` (`graphAlg.ts:42`).
- `pipelineToGraph(pipeline: PipelineNode[]): FractalGraph` — auto-wires a linear visual chain at `x=250, y=150+i*200` (`graphAlg.ts:95`).
- `isStructureEqual(a, b): boolean` — structural diff that ignores `params` and `condition.mod/rem` (`graphAlg.ts:115`).
- `isPipelineEqual(a, b): boolean` — full JSON equality including params (`graphAlg.ts:130`).
- Internal helpers (non-exported but referenced by both `compileGraph` and `updateModularUniforms`): `buildInputsByTarget` (`GraphCompiler.ts:8`), `buildLiveNodeIds` (`GraphCompiler.ts:18`).

## Architecture (file:line)

- Compiler imports the node registry and triggers the side-effect import `data/nodes/definitions` so the registry is populated before compilation runs (`GraphCompiler.ts:4`).
- `buildInputsByTarget` constructs a `Map<targetId, GraphEdge[]>` once per compile so each per-node input lookup is O(1) instead of O(edges) (`GraphCompiler.ts:8`).
- Dead-code elimination starts at the synthetic `root-end` and walks the inputs map upstream via a stack-based BFS, recording all reachable IDs except the two roots (`GraphCompiler.ts:18`).
- Active nodes are produced by filtering the topologically sorted input through `liveNodeIds`, preserving compile order (`GraphCompiler.ts:41`).
- Empty/disconnected graph short-circuits to a safe identity `formula_Modular` that just adds `c.xyz` and updates `trap` (`GraphCompiler.ts:43`).
- The function body opens with the "Graph Init" prelude declaring `v_start_p/_d/_dr` from `z.xyz`, the sentinel `1000.0`, and the incoming `dr` (`GraphCompiler.ts:53`).
- A `varMap` records the GLSL prefix for each node, pre-seeded with `'root-start' -> 'v_start'`; user nodes use `v_${safeId}` with non-alphanumerics stripped (`GraphCompiler.ts:64-72`).
- Two input slots are recognised per node: edges with no `targetHandle` or `targetHandle === 'a'` feed `in1`; `targetHandle === 'b'` feeds the CSG second operand (`GraphCompiler.ts:75-79`).
- Each active node emits three local copies `${varName}_p/_d/_dr` initialised from `in1`, so disabled or definition-less nodes still propagate the upstream triplet (`GraphCompiler.ts:81-84`).
- Disabled nodes (`node.enabled === false`) still emit the propagation copies but skip both `getParam` allocation and the `def.glsl` call (`GraphCompiler.ts:86`).
- Conditional execution wraps the node body in `{ int ..._cmod = max(1, int(...)); int ..._crem = int(...); if ((i - (i/cmod)*cmod) == crem) { ... }}`, allocating two `uModularParams` slots before the node's own params (`GraphCompiler.ts:90-101,125`).
- Parameter resolution lives in the per-node `getParam` closure: bindings map to named uniforms (`u${node.bindings[key]}`), otherwise the next slot in `uModularParams[paramCounter++]`, with `"0.0"` as the overflow sentinel once `paramCounter >= MAX_MODULAR_PARAMS` (`GraphCompiler.ts:104-114`).
- Node-specific GLSL is produced by calling `def.glsl({ varName, in1, in2, getParam, indent })` against the registry definition (`GraphCompiler.ts:117-123`).
- The final output edge is the one targeting `root-end`; the compiler resolves its source through `varMap`, falling back to `v_start` if the source is `root-start` or otherwise unresolved (`GraphCompiler.ts:132-138`).
- The epilogue writes back `z.xyz`, `dr`, and conditionally `distOverride` when `final_d` is in `(-1.0, 999.0)`, then updates `trap = min(trap, length(z.xyz))` (`GraphCompiler.ts:140-150`).
- `updateModularUniforms` zeroes the array first, then rewalks the live set via the same `buildLiveNodeIds(buildInputsByTarget(edges))` so DCE behaviour matches the compiler exactly (`GraphCompiler.ts:163-168`).
- Per node the uniform packer skips dead or disabled nodes (matching compiler suppression), writes `condition.mod` (`max(1, round)`) and `condition.rem` (`max(0, round)`) first when `condition.active`, then iterates the registry definition's `inputs` in order, writing `node.params[input.id] ?? input.default` only when not bound (`GraphCompiler.ts:170-191`).
- `hasCycle` builds an adjacency map and runs a per-node DFS with a `visited` set plus an active-path `recStack`; returns true on any back-edge (`graphAlg.ts:7-36`).
- `topologicalSort` is Kahn's algorithm with an in-degree map; at each pop it `queue.sort()`s the ready set alphabetically by ID to keep emission order deterministic across runs, then strips `position` when copying into `PipelineNode` (`graphAlg.ts:42-87`).
- `pipelineToGraph` synthesises a vertical visual chain and wires `root-start -> nodes[0] -> ... -> nodes[n-1] -> root-end`; empty pipelines return `nodes:[], edges:[]` (`graphAlg.ts:95-109`).
- `isStructureEqual` compares only id/type/enabled, `bindings` (via `JSON.stringify` with `?? {}` defaulting), and `condition.active`; param values and `condition.mod/rem` are deliberately excluded so they stay runtime (`graphAlg.ts:115-128`).
- `isPipelineEqual` falls back to a brute `JSON.stringify` comparison after a length check (`graphAlg.ts:130-133`).

## Invariants and gotchas

- Slot indices must agree between `compileGraph` and `updateModularUniforms`. Both share `buildInputsByTarget` + `buildLiveNodeIds`, and both walk nodes in the same sorted-pipeline order — any divergence (e.g. iterating edges in a different order, or filtering disabled nodes differently) would mis-assign uniforms (`GraphCompiler.ts:36-41,167-174`).
- The DCE walk discards nodes not reachable from `root-end`, so an entire dangling subgraph silently disappears at compile time. Disconnected presets render the empty-graph fallback (`GraphCompiler.ts:18-32, 43-50`).
- The two roots (`root-start`, `root-end`) must exist in the edge target/source ID space; the compiler hard-codes the strings and `varMap.set('root-start', 'v_start')` (`GraphCompiler.ts:20,26,65,132`).
- Disabled nodes still consume the `_p/_d/_dr` re-declaration triple but produce no GLSL body and consume no slots — uniform packing matches because both compiler and packer skip the same nodes (`GraphCompiler.ts:81-87, 173-174`).
- Param overflow returns the literal `"0.0"` rather than throwing; silently clamps any graph with >64 unbound params (`GraphCompiler.ts:96-97,110-113`). `setP` in the packer also silently drops writes past 64 (`GraphCompiler.ts:165`).
- `getParam` is invoked once per `def.glsl()` request, but the iteration order of those calls is controlled by each node's `glsl` body. Slot ordering at compile time therefore depends on that internal call order — the packer instead iterates `def.inputs` in declaration order. If a node's GLSL requests params in a different order than `inputs`, slots would desync. (`GraphCompiler.ts:104-114` vs `GraphCompiler.ts:184-190`).
- `distOverride` is gated by `final_d < 999.0 && final_d > -1.0`. The sentinel `1000.0` for `v_start_d` deliberately falls outside the window so non-SDF graphs never override (`GraphCompiler.ts:56,144-147`).
- `topologicalSort` calls `nodes.find(n => n.id === u)` inside the loop → O(N) per node, O(N^2) overall. For the current node counts (< ~50) this is fine but worth noting (`graphAlg.ts:71`).
- `topologicalSort` doesn't detect cycles itself — it would simply emit a partial pipeline if `hasCycle` ever slipped past the gate (`graphAlg.ts:42-87`).
- The CSG handle convention is implicit: only `'a'`, `'b'`, or absent are recognised; any other `targetHandle` value is treated as not-`a` and not-`b` (so it neither contributes `in1` nor `in2`) (`GraphCompiler.ts:75-76`).
- `isStructureEqual` relies on `JSON.stringify` of `bindings`, which means key reordering between two equivalent binding objects could spuriously trigger a recompile (`graphAlg.ts:120`).

## Drift from existing doc (dev/docs/gmt/03_Modular_System.md)

| Doc claim | Code reality | Recommendation |
|-----------|--------------|----------------|
| "DCE: backward walk from `root-end` ... stack-based BFS" (`docs/gmt/03_Modular_System.md:224`) | Stack-based, depth-first in practice (`stack.pop()` LIFO) — visiting order is DFS, not BFS. Reachability result is the same. (`GraphCompiler.ts:20-30`) | Minor: change "BFS" to "DFS" or "graph walk" for accuracy. |
| "Empty-graph fallback: returns `z.xyz += c.xyz; trap = min(trap, length(z.xyz));`" (`docs/gmt/03_Modular_System.md:226-232`) | Exact match (`GraphCompiler.ts:44-50`). | None. |
| "`v_start_d = 1000.0`" (`docs/gmt/03_Modular_System.md:239`) | Exact match (`GraphCompiler.ts:56`). | None. |
| "Condition wraps node in `if ( (i - (i/cmod)*cmod) == crem )` and allocates 2 slots BEFORE node's own params" (`docs/gmt/03_Modular_System.md:247-253`) | Exact match including the `max(1, int(...))` clamp on `cmod` (`GraphCompiler.ts:96-101`). | None. |
| "`getParam`: bound -> `u${binding}`; unbound -> `uModularParams[n++]`; overflow -> `\"0.0\"`" (`docs/gmt/03_Modular_System.md:254-257`) | Exact match (`GraphCompiler.ts:104-114`). | None. |
| "Output wiring: uses source's variable prefix; `distOverride` set when `final_d < 999.0 && final_d > -1.0`" (`docs/gmt/03_Modular_System.md:259-267`) | Exact match (`GraphCompiler.ts:132-147`). | None. |
| "`updateModularUniforms(pipeline, edges, uniformArray)` ... applies the same DCE walk" (`docs/gmt/03_Modular_System.md:275-287`) | Exact match — both helpers share `buildInputsByTarget` + `buildLiveNodeIds` (`GraphCompiler.ts:162-194`). | None. |
| "`hasCycle`: DFS using visited set + recursion stack, called before every `addEdge`" (`docs/gmt/03_Modular_System.md:291-293`) | DFS structure matches (`graphAlg.ts:7-36`). The "called before every addEdge" claim is store-side and not visible from this file. | None for this file. |
| "Kahn's algorithm with in-degree tracking; queue alphabetically sorted at each step for deterministic compile order" (`docs/gmt/03_Modular_System.md:295-297`) | Exact match (`graphAlg.ts:42-87`). | None. |
| "`pipelineToGraph` -> `{ x: 250, y: 150 + i*200 }`, auto-wires linear chain" (`docs/gmt/03_Modular_System.md:299-303`) | Exact match (`graphAlg.ts:95-109`). | None. |
| Structural diff table: `isStructureEqual` compares id, type, enabled, bindings, `condition.active` only (`docs/gmt/03_Modular_System.md:307-310`) | Exact match — uses `JSON.stringify(bindings ?? {})` and `condition?.active ?? false` (`graphAlg.ts:115-128`). | None. |
| Implied "`Custom`/`Note`" handling, fallback for unknown node type → "compiler skips code generation" (`docs/gmt/03_Modular_System.md:570`) | Confirmed — when `nodeRegistry.get(node.type)` returns `undefined`, the per-node block emits only the propagation copies, no body (`GraphCompiler.ts:87-89`). | None. |
| "param overflow returns `\"0.0\"` literal instead of crashing" (`docs/gmt/03_Modular_System.md:572`) | Match (`GraphCompiler.ts:113`); packer also silently drops writes past 64 (`GraphCompiler.ts:165`). | Optional: mention packer-side silent drop alongside the compiler-side `"0.0"` fallback. |
| Doc lists 24 node types in `data/nodes/definitions.ts` (`docs/gmt/03_Modular_System.md:649`) | Not visible from these two files; out of scope for this audit. | Verify in a separate audit covering `data/nodes/definitions.ts`. |

Net: doc is highly accurate; only the "BFS" vs "DFS" wording is mildly inaccurate, and an optional note about the packer-side overflow drop would mirror the compiler-side `"0.0"`.

## Open questions

- Orphan-sweep candidate: engine-gmt/utils/GraphCompiler.ts — verify `compileGraph`/`updateModularUniforms` are imported by both `features/core_math.ts` (compile path) and `MaterialController.syncModularUniforms` (runtime path); confirm no parallel/legacy `engine/utils/GraphCompiler.ts` exists in `dev/engine/` that would compete.
- Orphan-sweep candidate: engine-gmt/utils/graphAlg.ts — verify `topologicalSort`, `pipelineToGraph`, `isStructureEqual`, `isPipelineEqual`, `hasCycle` are still referenced by the store (`setGraph`, `setPipeline`) and `FlowEditor`; nothing in this file otherwise gates lifecycle.
- Per-node `getParam` call order vs. `def.inputs` declaration order: is it asserted somewhere (test or code comment) that every node's GLSL requests params strictly in declaration order? If not, that contract is load-bearing for `updateModularUniforms` and probably worth a one-line invariant note in the doc or a runtime-only DEV assertion.
